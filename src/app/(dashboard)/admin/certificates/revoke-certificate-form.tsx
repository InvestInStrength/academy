"use client";

import { useActionState } from "react";

import { emptyFormState } from "@/lib/form";
import { Textarea } from "@/components/ui/textarea";
import { FormMessage } from "@/components/ui/form-message";
import { SubmitButton } from "@/components/ui/submit-button";
import { revokeCertificate } from "./actions";

export function RevokeCertificateForm({ certificateId }: { certificateId: string }) {
  const [state, formAction] = useActionState(revokeCertificate, emptyFormState);

  return (
    <form action={formAction} className="space-y-2">
      <input type="hidden" name="id" value={certificateId} />
      <Textarea
        name="reason"
        rows={2}
        placeholder="Reason (optional, internal only)"
      />
      {state.message && (
        <FormMessage tone={state.ok ? "success" : "error"}>
          {state.message}
        </FormMessage>
      )}
      <SubmitButton variant="danger" size="sm" pendingText="Revoking…">
        Revoke certificate
      </SubmitButton>
    </form>
  );
}
