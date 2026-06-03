"use client";

import { useActionState } from "react";

import { signInAction } from "@/lib/auth/actions";
import { emptyFormState } from "@/lib/form";
import { useT } from "@/lib/i18n/client";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { FormMessage } from "@/components/ui/form-message";
import { SubmitButton } from "@/components/ui/submit-button";

export function LoginForm({ redirectTo }: { redirectTo: string }) {
  const [state, formAction] = useActionState(signInAction, emptyFormState);
  const t = useT();

  return (
    <form action={formAction} className="space-y-4">
      <input type="hidden" name="redirectTo" value={redirectTo} />

      <Field
        label={t("auth.login.email")}
        htmlFor="email"
        error={state.fieldErrors?.email}
      >
        <Input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          required
        />
      </Field>

      <Field
        label={t("auth.login.password")}
        htmlFor="password"
        error={state.fieldErrors?.password}
      >
        <Input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          required
        />
      </Field>

      {state.message && <FormMessage>{state.message}</FormMessage>}

      <SubmitButton className="w-full" pendingText={t("auth.login.submitting")}>
        {t("auth.login.submit")}
      </SubmitButton>
    </form>
  );
}
