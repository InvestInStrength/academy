"use server";

import { revalidatePath } from "next/cache";

import { requireSuperadmin } from "@/lib/auth/admin";
import { createSupabaseServiceRoleClient } from "@/lib/supabase/service";
import { getServerT } from "@/lib/i18n";
import { fieldErrorsFromZod, type FormState } from "@/lib/form";
import { createAdminSchema } from "./schema";

const ADMINS_PATH = "/admin/settings/admins";

/** Creates a Supabase Auth user and its admin profile. Superadmin only. */
export async function createAdmin(
  _prevState: FormState,
  formData: FormData,
): Promise<FormState> {
  await requireSuperadmin();
  const { t } = await getServerT();

  const parsed = createAdminSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
    role: formData.get("role"),
  });

  if (!parsed.success) {
    return {
      message: t("validation.field_errors"),
      fieldErrors: fieldErrorsFromZod(parsed.error),
    };
  }

  // Service-role is required to create auth users and to write the profile
  // without a self-referential RLS check during bootstrap of a new admin.
  const service = createSupabaseServiceRoleClient();

  const { data: created, error: createError } = await service.auth.admin.createUser({
    email: parsed.data.email,
    password: parsed.data.password,
    email_confirm: true,
  });

  if (createError || !created.user) {
    return { message: t("admin.admins.could_not_create_user") };
  }

  const { error: profileError } = await service.from("admin_profiles").insert({
    id: created.user.id,
    email: parsed.data.email,
    role: parsed.data.role,
  });

  if (profileError) {
    // Roll back the orphaned auth user so a retry is clean.
    await service.auth.admin.deleteUser(created.user.id);
    return { message: t("admin.admins.could_not_create_profile") };
  }

  revalidatePath(ADMINS_PATH);
  return {
    ok: true,
    message: t("admin.admins.created", { email: parsed.data.email }),
  };
}

export async function setAdminActive(formData: FormData): Promise<void> {
  const { user, supabase } = await requireSuperadmin();

  const id = String(formData.get("id") ?? "");
  const active = formData.get("active") === "true";
  // A superadmin cannot lock themselves out.
  if (!id || id === user.id) return;

  await supabase.from("admin_profiles").update({ active }).eq("id", id);
  revalidatePath(ADMINS_PATH);
}

export async function setAdminRole(formData: FormData): Promise<void> {
  const { user, supabase } = await requireSuperadmin();

  const id = String(formData.get("id") ?? "");
  const raw = formData.get("role");
  const role =
    raw === "superadmin" ? "superadmin" : raw === "admin" ? "admin" : null;
  // Don't allow changing your own role (avoids removing the last superadmin).
  if (!id || id === user.id || !role) return;

  await supabase.from("admin_profiles").update({ role }).eq("id", id);
  revalidatePath(ADMINS_PATH);
}
