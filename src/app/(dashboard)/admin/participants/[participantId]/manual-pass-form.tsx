"use client";

import { useActionState } from "react";

import { emptyFormState } from "@/lib/form";
import { useT } from "@/lib/i18n/client";
import { Textarea } from "@/components/ui/textarea";
import { FormMessage } from "@/components/ui/form-message";
import { SubmitButton } from "@/components/ui/submit-button";
import { manualPass } from "../actions";

export function ManualPassForm({ assignmentId }: { assignmentId: string }) {
  const [state, formAction] = useActionState(manualPass, emptyFormState);
  const t = useT();

  return (
    <form action={formAction} className="space-y-2">
      <input type="hidden" name="assignment_id" value={assignmentId} />
      <Textarea
        name="reason"
        rows={2}
        placeholder={t("admin.assignments.manual_pass_reason_placeholder")}
      />
      {state.fieldErrors?.reason && (
        <p className="text-xs text-red-600">{state.fieldErrors.reason}</p>
      )}
      {state.message && (
        <FormMessage tone={state.ok ? "success" : "error"}>
          {state.message}
        </FormMessage>
      )}
      <SubmitButton
        size="sm"
        variant="secondary"
        pendingText={t("common.saving")}
      >
        {t("admin.assignments.manual_pass_submit")}
      </SubmitButton>
    </form>
  );
}
