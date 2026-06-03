"use client";

import { useActionState } from "react";

import { emptyFormState } from "@/lib/form";
import { useT } from "@/lib/i18n/client";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { FormMessage } from "@/components/ui/form-message";
import { SubmitButton } from "@/components/ui/submit-button";
import { lookupCertificate } from "./actions";

export function VerifyLookupForm() {
  const [state, formAction] = useActionState(lookupCertificate, emptyFormState);
  const t = useT();

  return (
    <form action={formAction} className="space-y-4">
      <Field label={t("verify.lookup_field")} htmlFor="certificate_number" required>
        <Input
          id="certificate_number"
          name="certificate_number"
          placeholder={t("verify.lookup_placeholder")}
          autoComplete="off"
          required
        />
      </Field>
      {state.message && <FormMessage>{state.message}</FormMessage>}
      <SubmitButton pendingText={t("verify.lookup_checking")}>
        {t("verify.lookup_submit")}
      </SubmitButton>
    </form>
  );
}
