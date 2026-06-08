import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "@/types/database";
import { codeExpiry, evaluateCode, hashCode } from "./email-verification-core";

/**
 * Service-role DB orchestration for candidate email verification, with the
 * Supabase client injected so the security-critical paths are unit-testable
 * (mirrors the attempt-lifecycle `*With` pattern). The thin wrappers that build
 * the real service-role client live in `data.ts`; the pure code/expiry/decision
 * logic lives in `email-verification-core.ts`.
 *
 * This module never imports `server-only` or the service-role factory, so a test
 * can import it and pass a fake client without touching env or RLS.
 */

type Service = SupabaseClient<Database>;

/** The bits of the candidate context these helpers need. */
export type VerificationTarget = { participantId: string; assignmentId: string };

export type VerifyEmailResult =
  | { ok: true }
  | { ok: false; reason: "no_code" | "expired" | "too_many" }
  | { ok: false; reason: "invalid"; attemptsRemaining: number };

async function logEvent(
  service: Service,
  participantId: string,
  assignmentId: string,
  eventType: string,
  eventLabel: string,
): Promise<void> {
  await service.from("account_history").insert({
    participant_id: participantId,
    certification_assignment_id: assignmentId,
    event_type: eventType,
    event_label: eventLabel,
    event_data: null,
    created_by_admin_id: null,
  });
}

/**
 * Stores the (pending) email, invalidates any prior outstanding codes, and
 * inserts a fresh hashed code. The plaintext `code` and `nowMs` are injected by
 * the caller (the wrapper generates them) so this is deterministic under test.
 * `email_confirmed` stays false until the candidate enters the code.
 */
export async function startEmailVerificationWith(
  service: Service,
  target: VerificationTarget,
  email: string,
  opts: { code: string; nowMs: number },
): Promise<void> {
  const nowIso = new Date(opts.nowMs).toISOString();

  // Capture the (pending) email; confirmation waits for the code.
  await service
    .from("participants")
    .update({ email, email_confirmed: false })
    .eq("id", target.participantId);

  // Invalidate any earlier outstanding codes so only the newest one is valid.
  await service
    .from("email_verification_codes")
    .update({ consumed_at: nowIso })
    .eq("participant_id", target.participantId)
    .is("consumed_at", null);

  await service.from("email_verification_codes").insert({
    participant_id: target.participantId,
    email,
    code_hash: hashCode(opts.code),
    expires_at: codeExpiry(opts.nowMs),
  });

  await logEvent(
    service,
    target.participantId,
    target.assignmentId,
    "email_submitted",
    "Email submitted",
  );
}

/**
 * Verifies a submitted code against the newest outstanding row. On success sets
 * `email_confirmed = true`, consumes the code, and logs `email_confirmed`; on a
 * wrong code, increments that code's attempt counter. The decision itself is the
 * pure {@link evaluateCode}; `nowMs` is injected for deterministic expiry.
 */
export async function verifyEmailCodeWith(
  service: Service,
  target: VerificationTarget,
  submitted: string,
  opts: { nowMs: number },
): Promise<VerifyEmailResult> {
  const { data: row } = await service
    .from("email_verification_codes")
    .select("id, code_hash, attempts, expires_at, consumed_at")
    .eq("participant_id", target.participantId)
    .is("consumed_at", null)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!row) return { ok: false, reason: "no_code" };

  const decision = evaluateCode({
    submitted,
    storedHash: row.code_hash,
    attempts: row.attempts,
    expiresAtMs: new Date(row.expires_at).getTime(),
    consumed: row.consumed_at !== null,
    nowMs: opts.nowMs,
  });

  if (decision.kind === "ok") {
    await service
      .from("email_verification_codes")
      .update({ consumed_at: new Date(opts.nowMs).toISOString() })
      .eq("id", row.id);
    await service
      .from("participants")
      .update({ email_confirmed: true })
      .eq("id", target.participantId);
    await logEvent(
      service,
      target.participantId,
      target.assignmentId,
      "email_confirmed",
      "Email confirmed",
    );
    return { ok: true };
  }

  if (decision.kind === "invalid") {
    await service
      .from("email_verification_codes")
      .update({ attempts: row.attempts + 1 })
      .eq("id", row.id);
    return { ok: false, reason: "invalid", attemptsRemaining: decision.attemptsRemaining };
  }

  return { ok: false, reason: decision.kind };
}
