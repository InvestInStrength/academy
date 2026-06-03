"use client";

import { useActionState } from "react";

import { emptyFormState } from "@/lib/form";
import { useT } from "@/lib/i18n/client";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { FormMessage } from "@/components/ui/form-message";
import { SubmitButton } from "@/components/ui/submit-button";
import { submitEmail } from "./actions";

type Props = { accessToken: string; defaultEmail?: string | null };

export function EmailForm({ accessToken, defaultEmail }: Props) {
  const [state, formAction] = useActionState(submitEmail, emptyFormState);
  const t = useT();

  return (
    <form action={formAction} className="space-y-4">
      <input type="hidden" name="access_token" value={accessToken} />

      <Field
        label={t("candidate.email.label")}
        htmlFor="email"
        required
        error={state.fieldErrors?.email ? t(state.fieldErrors.email) : undefined}
      >
        <Input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          placeholder={t("candidate.email.placeholder")}
          defaultValue={defaultEmail ?? ""}
          required
        />
      </Field>

      {state.message && <FormMessage>{state.message}</FormMessage>}

      <SubmitButton pendingText={t("candidate.email.submitting")}>
        {t("candidate.email.submit")}
      </SubmitButton>
    </form>
  );
}
