"use client";

import { useActionState } from "react";

import { emptyFormState } from "@/lib/form";
import { useT } from "@/lib/i18n/client";
import { FormMessage } from "@/components/ui/form-message";
import { SubmitButton } from "@/components/ui/submit-button";
import { emailMyCertificate } from "./actions";

export function EmailCertificateButton({ accessToken }: { accessToken: string }) {
  const [state, formAction] = useActionState(emailMyCertificate, emptyFormState);
  const t = useT();

  return (
    <form action={formAction} className="space-y-2">
      <input type="hidden" name="access_token" value={accessToken} />
      <SubmitButton
        variant="outline"
        pendingText={t("candidate.certificate.emailing")}
      >
        {t("candidate.certificate.email_button")}
      </SubmitButton>
      {state.message && (
        <FormMessage tone={state.ok ? "success" : "error"}>
          {state.message}
        </FormMessage>
      )}
    </form>
  );
}
