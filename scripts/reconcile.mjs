// Read-only reconciliation against the configured Supabase project.
//
// Implements the detection half of docs/academy/05-production-safety-plan.md:
// it SURFACES inconsistencies and never rewrites them, because silently
// "repairing" credentialing records is how a data problem becomes an
// unauditable one. Every finding names the admin action that fixes it.
//
// Run:  node scripts/reconcile.mjs        (reads .env.local)
// Exits non-zero when anything is found, so it can gate a scheduled job.
//
// Prints counts and severities only — never participant names, emails or scores.
import { readFileSync } from "node:fs";

const env = {};
for (const line of readFileSync(new URL("../.env.local", import.meta.url), "utf8").split(/\r?\n/)) {
  const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
  if (m) env[m[1]] = m[2].trim();
}
if (!env.NEXT_PUBLIC_SUPABASE_URL || !env.SUPABASE_SERVICE_ROLE_KEY) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local");
  process.exit(2);
}

const H = {
  apikey: env.SUPABASE_SERVICE_ROLE_KEY,
  Authorization: `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`,
};
const get = async (path) => {
  const res = await fetch(`${env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/${path}`, { headers: H });
  if (!res.ok) throw new Error(`${path} -> HTTP ${res.status}`);
  return res.json();
};

const problems = [];
const note = (severity, what) => problems.push(`[${severity}] ${what}`);

// 1. Passed assignment with no certificate — the stranded-issuance case the
//    admin "Issue certificate now" action exists to repair.
const assignments = await get(
  "certification_assignments?select=id,status,passed_at,certificate_id,active",
);
const passed = assignments.filter((a) => a.status === "passed");
const strandedPass = passed.filter((a) => !a.certificate_id);
console.log(`passed assignments: ${passed.length}, without certificate: ${strandedPass.length}`);
if (strandedPass.length) {
  note("HIGH", `${strandedPass.length} passed assignment(s) have no certificate — use "Issue certificate now" on the participant page`);
}

// 2. Certificate attached to an assignment that is not passed.
const certs = await get(
  "certificates?select=id,certification_assignment_id,status,certificate_public_snapshot,generated_at",
);
const assignmentById = Object.fromEntries(assignments.map((a) => [a.id, a]));
const orphanCerts = certs.filter(
  (c) => assignmentById[c.certification_assignment_id]?.status !== "passed",
);
console.log(`certificates: ${certs.length}, on non-passed assignments: ${orphanCerts.length}`);
if (orphanCerts.length) {
  note("HIGH", `${orphanCerts.length} certificate(s) belong to an assignment not marked passed`);
}

// 3. Certificate missing one of its two required rendered assets.
const assets = await get("certificate_assets?select=certificate_id,asset_type");
const typesByCert = {};
for (const a of assets) (typesByCert[a.certificate_id] ||= new Set()).add(a.asset_type);
const missingAssets = certs.filter((c) => {
  const types = typesByCert[c.id];
  return !types || !types.has("official_pdf") || !types.has("official_png_preview");
});
console.log(`certificates missing PDF or PNG: ${missingAssets.length}`);
if (missingAssets.length) {
  note("MEDIUM", `${missingAssets.length} certificate(s) missing assets — use "Regenerate files"`);
}

// 4. A relative verification URL is frozen into the snapshot AND the QR code,
//    so it can never be repaired in place — only a reissue fixes it.
const relative = certs.filter((c) => {
  const url = c.certificate_public_snapshot?.verification_url;
  return url && !String(url).startsWith("http");
});
console.log(`certificates with a relative verification_url: ${relative.length}`);
if (relative.length) {
  note("CRITICAL", `${relative.length} certificate(s) carry an unusable verification URL (issued by a deploy without NEXT_PUBLIC_SITE_URL) — reissue required`);
}

// 5. Multiple open attempts per assignment. Migration 0008 prevents new ones;
//    this catches any row predating it.
const openAttempts = await get("attempts?select=certification_assignment_id&submitted_at=is.null");
const openPerAssignment = {};
for (const a of openAttempts) {
  openPerAssignment[a.certification_assignment_id] =
    (openPerAssignment[a.certification_assignment_id] || 0) + 1;
}
const duplicateOpen = Object.values(openPerAssignment).filter((n) => n > 1).length;
console.log(`open attempts: ${openAttempts.length}, assignments with >1: ${duplicateOpen}`);
if (duplicateOpen) note("HIGH", `${duplicateOpen} assignment(s) have multiple open attempts`);

// 6. Passed without a passing attempt row. A manual pass synthesises one, so a
//    gap here means that synthetic-attempt write failed.
const attempts = await get("attempts?select=certification_assignment_id,passed");
const withPassingAttempt = new Set(
  attempts.filter((a) => a.passed).map((a) => a.certification_assignment_id),
);
const passedNoAttempt = passed.filter((a) => !withPassingAttempt.has(a.id));
console.log(`passed assignments with no passing attempt: ${passedNoAttempt.length}`);
if (passedNoAttempt.length) {
  note("MEDIUM", `${passedNoAttempt.length} passed assignment(s) have no passing attempt row`);
}

// 7. Participant email hygiene. Duplicates block the M1 account-claim flow,
//    which matches an auth user to a participant by verified email.
const participants = await get("participants?select=id,email,email_confirmed");
const confirmedNoEmail = participants.filter((p) => p.email_confirmed && !p.email);
const emailCounts = new Map();
for (const p of participants) {
  if (p.email) {
    const key = p.email.toLowerCase();
    emailCounts.set(key, (emailCounts.get(key) || 0) + 1);
  }
}
const duplicateEmails = [...emailCounts.values()].filter((n) => n > 1).length;
console.log(
  `participants: ${participants.length}, confirmed-without-email: ${confirmedNoEmail.length}, duplicate emails: ${duplicateEmails}`,
);
if (confirmedNoEmail.length) {
  note("MEDIUM", `${confirmedNoEmail.length} participant(s) marked email-confirmed with no address`);
}
if (duplicateEmails) {
  note("MEDIUM", `${duplicateEmails} duplicate participant email(s) — blocks the M1 account-claim flow`);
}

// 8. Revoked certificates still have publicly reachable Storage assets until
//    the bucket is privatised (decision D-04).
const revoked = certs.filter((c) => c.status === "revoked");
console.log(`revoked certificates: ${revoked.length}`);
if (revoked.length) {
  note("HIGH", `${revoked.length} revoked certificate(s) still have publicly reachable PDF/PNG assets (pending decision D-04)`);
}

console.log("\n=== RECONCILIATION RESULT ===");
if (!problems.length) {
  console.log("  no inconsistencies found");
} else {
  for (const p of problems) console.log("  " + p);
  process.exitCode = 1;
}
