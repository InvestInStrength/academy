"use server";

import { revalidatePath } from "next/cache";

import { requireAdmin } from "@/lib/auth/admin";
import { getServerT } from "@/lib/i18n";
import { logger, reportError } from "@/lib/logger";
import type { FormState } from "@/lib/form";
import { sendCertificateEmail } from "@/lib/email/certificate-email";
import type { CertificateSnapshot } from "@/lib/certification/data";

async function participantPathFor(
  supabase: Awaited<ReturnType<typeof requireAdmin>>["supabase"],
  certificateId: string,
): Promise<{ participantId: string; assignmentId: string } | null> {
  const { data: certificate, error: certificateError } = await supabase
    .from("certificates")
    .select("certification_assignment_id")
    .eq("id", certificateId)
    .maybeSingle();
  if (!certificate) {
    // Callers turn this into "the certificate is gone", which is wrong (and
    // alarming) when the real cause is a failed read.
    logger.error(
      "admin.certificate.lookup_failed",
      { certificateId, stage: "certificate" },
      certificateError,
    );
    return null;
  }

  const { data: assignment, error: assignmentError } = await supabase
    .from("certification_assignments")
    .select("participant_id")
    .eq("id", certificate.certification_assignment_id)
    .maybeSingle();
  if (!assignment) {
    logger.error(
      "admin.certificate.lookup_failed",
      {
        certificateId,
        assignmentId: certificate.certification_assignment_id,
        stage: "assignment",
      },
      assignmentError,
    );
    return null;
  }

  return {
    participantId: assignment.participant_id,
    assignmentId: certificate.certification_assignment_id,
  };
}

export async function revokeCertificate(
  _prevState: FormState,
  formData: FormData,
): Promise<FormState> {
  const { supabase, user } = await requireAdmin();
  const { t } = await getServerT();

  const id = String(formData.get("id") ?? "");
  const reason = String(formData.get("reason") ?? "").trim();
  if (!id) return { message: t("validation.generic_error") };

  const refs = await participantPathFor(supabase, id);
  if (!refs) return { message: t("admin.certificates.cert_gone") };

  const { error } = await supabase
    .from("certificates")
    .update({
      status: "revoked",
      revoked_at: new Date().toISOString(),
      revoked_by: user.id,
      revoke_reason: reason || null,
    })
    .eq("id", id);

  if (error) {
    logger.error("admin.certificate.revoke_failed", { certificateId: id }, error);
    return { message: t("admin.certificates.could_not_revoke") };
  }

  // Revocation reason is backend-only.
  const { error: historyError } = await supabase.from("account_history").insert({
    participant_id: refs.participantId,
    certification_assignment_id: refs.assignmentId,
    event_type: "certificate_revoked",
    event_label: "Certificate revoked",
    event_data: reason ? { reason } : null,
    created_by_admin_id: user.id,
  });
  // The revocation already happened; a missing history row means the timeline
  // no longer explains why the certificate is invalid.
  if (historyError) {
    logger.error(
      "admin.certificate.history_write_failed",
      { certificateId: id, eventType: "certificate_revoked" },
      historyError,
    );
  }

  revalidatePath("/admin/certificates");
  revalidatePath(`/admin/participants/${refs.participantId}`);
  return { ok: true, message: t("admin.certificates.revoked_done") };
}

export async function sendCertificateEmailAction(
  _prevState: FormState,
  formData: FormData,
): Promise<FormState> {
  const { supabase, user } = await requireAdmin();
  const { t, locale } = await getServerT();

  const id = String(formData.get("id") ?? "");
  if (!id) return { message: t("validation.generic_error") };

  const { data: certificate, error: certificateError } = await supabase
    .from("certificates")
    .select("status, certificate_public_snapshot, certification_assignment_id")
    .eq("id", id)
    .maybeSingle();

  if (!certificate) {
    logger.error(
      "admin.certificate.lookup_failed",
      { certificateId: id, stage: "certificate" },
      certificateError,
    );
    return { message: t("admin.certificates.cert_gone") };
  }
  if (certificate.status !== "valid") {
    return { message: t("admin.certificates.cannot_email_revoked") };
  }

  const { data: assignment, error: assignmentError } = await supabase
    .from("certification_assignments")
    .select("participant_id")
    .eq("id", certificate.certification_assignment_id)
    .maybeSingle();
  if (!assignment) {
    logger.error(
      "admin.certificate.lookup_failed",
      {
        certificateId: id,
        assignmentId: certificate.certification_assignment_id,
        stage: "assignment",
      },
      assignmentError,
    );
    return { message: t("admin.certificates.assignment_gone") };
  }

  const { data: participant, error: participantError } = await supabase
    .from("participants")
    .select("email")
    .eq("id", assignment.participant_id)
    .maybeSingle();
  if (!participant?.email) {
    // "No address on file" and "the participant read failed" are the same
    // message to the admin; only the error object tells them apart.
    if (participantError || !participant) {
      logger.error(
        "admin.certificate.lookup_failed",
        {
          certificateId: id,
          participantId: assignment.participant_id,
          stage: "participant",
        },
        participantError,
      );
    }
    return { message: t("admin.certificates.no_email_on_file") };
  }

  const snapshot = certificate.certificate_public_snapshot as unknown as CertificateSnapshot;
  const sent = await sendCertificateEmail({
    toEmail: participant.email,
    snapshot,
    locale,
  });
  if (!sent.ok) {
    // The Resend failure itself is logged inside the email module; this records
    // which certificate the admin was trying to send.
    logger.error("admin.certificate.email_send_failed", {
      certificateId: id,
      certificateNumber: snapshot?.certificate_number,
    });
    return { message: t("admin.certificates.could_not_send") };
  }

  const { error: emailedAtError } = await supabase
    .from("certificates")
    .update({ emailed_at: new Date().toISOString() })
    .eq("id", id);
  if (emailedAtError) {
    logger.error(
      "admin.certificate.emailed_at_write_failed",
      { certificateId: id },
      emailedAtError,
    );
  }
  const { error: historyError } = await supabase.from("account_history").insert({
    participant_id: assignment.participant_id,
    certification_assignment_id: certificate.certification_assignment_id,
    event_type: "certificate_emailed",
    event_label: "Certificate emailed",
    event_data: { email: participant.email },
    created_by_admin_id: user.id,
  });
  if (historyError) {
    logger.error(
      "admin.certificate.history_write_failed",
      { certificateId: id, eventType: "certificate_emailed" },
      historyError,
    );
  }

  revalidatePath("/admin/certificates");
  revalidatePath(`/admin/participants/${assignment.participant_id}`);
  return {
    ok: true,
    message: t("admin.certificates.emailed", { email: participant.email }),
  };
}

export async function reinstateCertificate(
  _prevState: FormState,
  formData: FormData,
): Promise<FormState> {
  const { supabase, user } = await requireAdmin();
  const { t } = await getServerT();

  const id = String(formData.get("id") ?? "");
  if (!id) return { message: t("validation.generic_error") };

  const refs = await participantPathFor(supabase, id);
  if (!refs) return { message: t("admin.certificates.cert_gone") };

  const { error } = await supabase
    .from("certificates")
    .update({
      status: "valid",
      revoked_at: null,
      revoked_by: null,
      revoke_reason: null,
    })
    .eq("id", id);
  // A failed reinstatement leaves a certificate that still verifies as revoked;
  // the admin has to know, and the reference ties the screen to the log line.
  // Revalidate first so the row re-renders as REVOKED next to the error rather
  // than optimistically as valid — but return before the history insert, since
  // writing "Certificate reinstated" into an append-only timeline for something
  // that did not happen would be a permanent lie.
  if (error) {
    revalidatePath("/admin/certificates");
    revalidatePath(`/admin/participants/${refs.participantId}`);
    const reference = reportError("admin.certificate.reinstate_failed", error, {
      certificateId: id,
    });
    return { message: t("admin.certificates.could_not_reinstate", { reference }) };
  }

  const { error: historyError } = await supabase.from("account_history").insert({
    participant_id: refs.participantId,
    certification_assignment_id: refs.assignmentId,
    event_type: "certificate_reinstated",
    event_label: "Certificate reinstated",
    created_by_admin_id: user.id,
  });
  // The certificate is valid again either way; a missing timeline row is a log
  // matter, not a reason to tell the admin the button failed.
  if (historyError) {
    logger.error(
      "admin.certificate.history_write_failed",
      { certificateId: id, eventType: "certificate_reinstated" },
      historyError,
    );
  }

  revalidatePath("/admin/certificates");
  revalidatePath(`/admin/participants/${refs.participantId}`);
  return { ok: true };
}
