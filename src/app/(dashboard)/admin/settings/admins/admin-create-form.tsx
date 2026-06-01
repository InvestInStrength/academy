"use client";

import { useActionState, useEffect, useRef } from "react";

import { emptyFormState } from "@/lib/form";
import { useT } from "@/lib/i18n/client";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { FormMessage } from "@/components/ui/form-message";
import { SubmitButton } from "@/components/ui/submit-button";
import { createAdmin } from "./actions";

export function AdminCreateForm() {
  const t = useT();
  const [state, formAction] = useActionState(createAdmin, emptyFormState);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state.ok) formRef.current?.reset();
  }, [state]);

  return (
    <form ref={formRef} action={formAction} className="space-y-4">
      <Field
        label={t("admin.admins.email_label")}
        htmlFor="admin-email"
        required
        error={state.fieldErrors?.email}
      >
        <Input id="admin-email" name="email" type="email" autoComplete="off" required />
      </Field>

      <Field
        label={t("admin.admins.password_label")}
        htmlFor="admin-password"
        required
        hint={t("admin.admins.password_hint")}
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

      <Field
        label={t("admin.admins.role_label")}
        htmlFor="admin-role"
        error={state.fieldErrors?.role}
      >
        <Select id="admin-role" name="role" defaultValue="admin">
          <option value="admin">{t("admin.admins.role_admin")}</option>
          <option value="superadmin">{t("admin.admins.role_superadmin")}</option>
        </Select>
      </Field>

      {state.message && (
        <FormMessage tone={state.ok ? "success" : "error"}>
          {state.message}
        </FormMessage>
      )}

      <SubmitButton pendingText={t("admin.admins.creating")}>
        {t("admin.admins.create_button")}
      </SubmitButton>
    </form>
  );
}
