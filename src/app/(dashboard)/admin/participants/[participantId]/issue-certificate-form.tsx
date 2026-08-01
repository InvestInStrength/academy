"use client";

import { useActionState } from "react";

import { emptyFormState } from "@/lib/form";
import { useT } from "@/lib/i18n/client";
import { FormMessage } from "@/components/ui/form-message";
import { SubmitButton } from "@/components/ui/submit-button";
import { reissueCertificate } from "../actions";

/** Retry control for a passed assignment whose certificate was never created.
 * Deliberately not an `ActionButton`: a second failure must be visible, with
 * the support reference the admin can quote. */
export function IssueCertificateForm({ assignmentId }: { assignmentId: string }) {
  const [state, formAction] = useActionState(reissueCertificate, emptyFormState);
  const t = useT();

  return (
    <form action={formAction} className="space-y-2">
      <input type="hidden" name="assignment_id" value={assignmentId} />
      <SubmitButton
        size="sm"
        variant="secondary"
        pendingText={t("admin.assignments.issuing_certificate")}
      >
        {t("admin.assignments.issue_certificate")}
      </SubmitButton>
      {state.message && (
        <FormMessage tone={state.ok ? "success" : "error"}>{state.message}</FormMessage>
      )}
    </form>
  );
}
