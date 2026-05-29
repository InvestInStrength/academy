"use client";

import { useActionState } from "react";

import type { Participant } from "@/types/database";
import { emptyFormState } from "@/lib/form";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { FormMessage } from "@/components/ui/form-message";
import { SubmitButton } from "@/components/ui/submit-button";
import { createParticipant, updateParticipant } from "./actions";

export function ParticipantForm({ participant }: { participant?: Participant }) {
  const isEdit = Boolean(participant);
  const [state, formAction] = useActionState(
    isEdit ? updateParticipant : createParticipant,
    emptyFormState,
  );

  return (
    <form action={formAction} className="space-y-4">
      {isEdit && <input type="hidden" name="id" value={participant!.id} />}

      <Field label="Full name" htmlFor="full_name" required error={state.fieldErrors?.full_name}>
        <Input
          id="full_name"
          name="full_name"
          defaultValue={participant?.full_name ?? ""}
          required
          maxLength={200}
        />
      </Field>

      <Field
        label="Certificate display name"
        htmlFor="certificate_display_name"
        hint="Optional — used on the certificate if the full name is too long."
        error={state.fieldErrors?.certificate_display_name}
      >
        <Input
          id="certificate_display_name"
          name="certificate_display_name"
          defaultValue={participant?.certificate_display_name ?? ""}
          maxLength={200}
        />
      </Field>

      <Field
        label="Email"
        htmlFor="email"
        hint="Optional. Candidates confirm their email before their first attempt."
        error={state.fieldErrors?.email}
      >
        <Input
          id="email"
          name="email"
          type="email"
          defaultValue={participant?.email ?? ""}
        />
      </Field>

      {state.message && (
        <FormMessage tone={state.ok ? "success" : "error"}>
          {state.message}
        </FormMessage>
      )}

      <SubmitButton pendingText="Saving…">
        {isEdit ? "Save participant" : "Create participant"}
      </SubmitButton>
    </form>
  );
}
