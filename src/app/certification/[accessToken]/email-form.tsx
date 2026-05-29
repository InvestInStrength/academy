"use client";

import { useActionState } from "react";

import { emptyFormState } from "@/lib/form";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { FormMessage } from "@/components/ui/form-message";
import { SubmitButton } from "@/components/ui/submit-button";
import { submitEmail } from "./actions";

type Props = { accessToken: string; defaultEmail?: string | null };

export function EmailForm({ accessToken, defaultEmail }: Props) {
  const [state, formAction] = useActionState(submitEmail, emptyFormState);

  return (
    <form action={formAction} className="space-y-4">
      <input type="hidden" name="access_token" value={accessToken} />

      <Field label="Your email" htmlFor="email" required error={state.fieldErrors?.email}>
        <Input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          defaultValue={defaultEmail ?? ""}
          required
        />
      </Field>

      {state.message && <FormMessage>{state.message}</FormMessage>}

      <SubmitButton pendingText="Continuing…">Continue</SubmitButton>
    </form>
  );
}
