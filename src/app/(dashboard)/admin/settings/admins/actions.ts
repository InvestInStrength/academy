"use server";

import { revalidatePath } from "next/cache";

import { requireSuperadmin } from "@/lib/auth/admin";
import { createSupabaseServiceRoleClient } from "@/lib/supabase/service";
import { getServerT } from "@/lib/i18n";
import { logger, reportError } from "@/lib/logger";
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
      fieldErrors: fieldErrorsFromZod(parsed.error, t),
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
    // The address is the payload here, so only the role is safe to record.
    logger.error(
      "admin.account.create_user_failed",
      { role: parsed.data.role },
      createError,
    );
    return { message: t("admin.admins.could_not_create_user") };
  }

  const { error: profileError } = await service.from("admin_profiles").insert({
    id: created.user.id,
    email: parsed.data.email,
    role: parsed.data.role,
  });

  if (profileError) {
    logger.error(
      "admin.account.create_profile_failed",
      { adminId: created.user.id, role: parsed.data.role },
      profileError,
    );
    // Roll back the orphaned auth user so a retry is clean.
    const { error: rollbackError } = await service.auth.admin.deleteUser(
      created.user.id,
    );
    // A failed rollback leaves an auth user with no profile: it cannot sign in
    // anywhere useful, but the address is now taken and a retry will collide.
    if (rollbackError) {
      logger.error(
        "admin.account.rollback_delete_user_failed",
        { adminId: created.user.id },
        rollbackError,
      );
    }
    return { message: t("admin.admins.could_not_create_profile") };
  }

  revalidatePath(ADMINS_PATH);
  return {
    ok: true,
    message: t("admin.admins.created", { email: parsed.data.email }),
  };
}

export async function setAdminActive(
  _prevState: FormState,
  formData: FormData,
): Promise<FormState> {
  const { user, supabase } = await requireSuperadmin();
  const { t } = await getServerT();

  const id = String(formData.get("id") ?? "");
  const active = formData.get("active") === "true";
  if (!id) return { message: t("validation.generic_error") };
  // A superadmin cannot lock themselves out. The list hides the buttons on your
  // own row, so reaching this means a stale page or a hand-made request.
  if (id === user.id) return { message: t("admin.admins.cannot_change_self") };

  const { error } = await supabase
    .from("admin_profiles")
    .update({ active })
    .eq("id", id);
  // Revalidate on the failure path too, so the list re-renders from the real
  // row rather than the one the click implied.
  revalidatePath(ADMINS_PATH);

  // Silent failure here means an admin the superadmin believes is disabled can
  // still sign in.
  if (error) {
    const reference = reportError("admin.account.set_active_failed", error, {
      adminId: id,
      active,
    });
    return { message: t("admin.admins.could_not_update_status", { reference }) };
  }

  return { ok: true };
}

export async function setAdminRole(
  _prevState: FormState,
  formData: FormData,
): Promise<FormState> {
  const { user, supabase } = await requireSuperadmin();
  const { t } = await getServerT();

  const id = String(formData.get("id") ?? "");
  const raw = formData.get("role");
  const role =
    raw === "superadmin" ? "superadmin" : raw === "admin" ? "admin" : null;
  if (!id || !role) return { message: t("validation.generic_error") };
  // Don't allow changing your own role (avoids removing the last superadmin).
  if (id === user.id) return { message: t("admin.admins.cannot_change_self") };

  const { error } = await supabase
    .from("admin_profiles")
    .update({ role })
    .eq("id", id);
  revalidatePath(ADMINS_PATH);

  if (error) {
    const reference = reportError("admin.account.set_role_failed", error, {
      adminId: id,
      role,
    });
    return { message: t("admin.admins.could_not_update_role", { reference }) };
  }

  return { ok: true };
}
