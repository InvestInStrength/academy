"use client";

import { useActionState } from "react";

import { emptyFormState } from "@/lib/form";
import { useT } from "@/lib/i18n/client";
import { Textarea } from "@/components/ui/textarea";
import { FormMessage } from "@/components/ui/form-message";
import { SubmitButton } from "@/components/ui/submit-button";
import { revokeCertificate } from "./actions";

export function RevokeCertificateForm({ certificateId }: { certificateId: string }) {
  const [state, formAction] = useActionState(revokeCertificate, emptyFormState);
  const t = useT();

  return (
    <form action={formAction} className="space-y-2">
      <input type="hidden" name="id" value={certificateId} />
      <Textarea
        name="reason"
        rows={2}
        placeholder={t("admin.certificates.revoke_reason_placeholder")}
      />
      {state.message && (
        <FormMessage tone={state.ok ? "success" : "error"}>
          {state.message}
        </FormMessage>
      )}
      <SubmitButton
        variant="danger"
        size="sm"
        pendingText={t("admin.certificates.revoking")}
      >
        {t("admin.certificates.revoke_submit")}
      </SubmitButton>
    </form>
  );
}
