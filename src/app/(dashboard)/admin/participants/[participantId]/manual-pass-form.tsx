"use client";

import { useActionState } from "react";

import { emptyFormState } from "@/lib/form";
import { Textarea } from "@/components/ui/textarea";
import { FormMessage } from "@/components/ui/form-message";
import { SubmitButton } from "@/components/ui/submit-button";
import { manualPass } from "../actions";

export function ManualPassForm({ assignmentId }: { assignmentId: string }) {
  const [state, formAction] = useActionState(manualPass, emptyFormState);

  return (
    <form action={formAction} className="space-y-2">
      <input type="hidden" name="assignment_id" value={assignmentId} />
      <Textarea
        name="reason"
        rows={2}
        placeholder="Reason for manual pass (internal only)"
      />
      {state.fieldErrors?.reason && (
        <p className="text-xs text-red-600">{state.fieldErrors.reason}</p>
      )}
      {state.message && (
        <FormMessage tone={state.ok ? "success" : "error"}>
          {state.message}
        </FormMessage>
      )}
      <SubmitButton size="sm" variant="secondary" pendingText="Saving…">
        Mark as passed &amp; issue certificate
      </SubmitButton>
    </form>
  );
}
