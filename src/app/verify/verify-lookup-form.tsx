"use client";

import { useActionState } from "react";

import { emptyFormState } from "@/lib/form";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { FormMessage } from "@/components/ui/form-message";
import { SubmitButton } from "@/components/ui/submit-button";
import { lookupCertificate } from "./actions";

export function VerifyLookupForm() {
  const [state, formAction] = useActionState(lookupCertificate, emptyFormState);

  return (
    <form action={formAction} className="space-y-4">
      <Field label="Certificate ID" htmlFor="certificate_number" required>
        <Input
          id="certificate_number"
          name="certificate_number"
          placeholder="e.g. IIS-2026-AB12CD34"
          autoComplete="off"
          required
        />
      </Field>
      {state.message && <FormMessage>{state.message}</FormMessage>}
      <SubmitButton pendingText="Checking…">Verify certificate</SubmitButton>
    </form>
  );
}
