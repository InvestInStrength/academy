"use client";

import { useActionState } from "react";

import { emptyFormState } from "@/lib/form";
import { useT } from "@/lib/i18n/client";
import { FormMessage } from "@/components/ui/form-message";
import { SubmitButton } from "@/components/ui/submit-button";
import { sendCertificateEmailAction } from "./actions";

export function SendCertificateEmailButton({
  certificateId,
}: {
  certificateId: string;
}) {
  const [state, formAction] = useActionState(
    sendCertificateEmailAction,
    emptyFormState,
  );
  const t = useT();

  return (
    <form action={formAction} className="space-y-1 text-right">
      <input type="hidden" name="id" value={certificateId} />
      <SubmitButton
        variant="outline"
        size="sm"
        pendingText={t("admin.certificates.sending")}
      >
        {t("admin.certificates.email_candidate")}
      </SubmitButton>
      {state.message && (
        <FormMessage tone={state.ok ? "success" : "error"}>
          {state.message}
        </FormMessage>
      )}
    </form>
  );
}
