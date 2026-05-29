"use client";

import { useActionState, useEffect, useRef } from "react";

import { emptyFormState } from "@/lib/form";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { FormMessage } from "@/components/ui/form-message";
import { SubmitButton } from "@/components/ui/submit-button";
import { createAdmin } from "./actions";

export function AdminCreateForm() {
  const [state, formAction] = useActionState(createAdmin, emptyFormState);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state.ok) formRef.current?.reset();
  }, [state]);

  return (
    <form ref={formRef} action={formAction} className="space-y-4">
      <Field label="Email" htmlFor="admin-email" required error={state.fieldErrors?.email}>
        <Input id="admin-email" name="email" type="email" autoComplete="off" required />
      </Field>

      <Field
        label="Temporary password"
        htmlFor="admin-password"
        required
        hint="At least 8 characters. The admin can change it later."
        error={state.fieldErrors?.password}
      >
        <Input
          id="admin-password"
          name="password"
          type="text"
          autoComplete="off"
          minLength={8}
          required
        />
      </Field>

      <Field label="Role" htmlFor="admin-role" error={state.fieldErrors?.role}>
        <Select id="admin-role" name="role" defaultValue="admin">
          <option value="admin">Admin</option>
          <option value="superadmin">Superadmin</option>
        </Select>
      </Field>

      {state.message && (
        <FormMessage tone={state.ok ? "success" : "error"}>
          {state.message}
        </FormMessage>
      )}

      <SubmitButton pendingText="Creating…">Create admin</SubmitButton>
    </form>
  );
}
