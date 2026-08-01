"use server";

import { revalidatePath } from "next/cache";

import { requireAdmin } from "@/lib/auth/admin";
import { getServerT } from "@/lib/i18n";
import { logger } from "@/lib/logger";
import { fieldErrorsFromZod, type FormState } from "@/lib/form";
import { templateSchema } from "./schema";

/**
 * Certificate template CRUD. Templates are picked per course/seminar (each
 * seminar ships its own artwork), so this is admin-level rather than
 * superadmin-only.
 *
 * Templates in use are never edited destructively in practice: a certificate
 * freezes its rendered SVG into `certificate_public_snapshot` at issue time, so
 * changing or deactivating a template only affects certificates issued from
 * here on.
 */

function parseTemplateForm(formData: FormData) {
  return templateSchema.safeParse({
    name: formData.get("name"),
    svg_template: formData.get("svg_template"),
    active: formData.get("active") === "on",
  });
}

export async function createTemplate(
  _prevState: FormState,
  formData: FormData,
): Promise<FormState> {
  const { supabase } = await requireAdmin();
  const { t } = await getServerT();

  const parsed = parseTemplateForm(formData);
  if (!parsed.success) {
    return {
      message: t("validation.field_errors"),
      fieldErrors: fieldErrorsFromZod(parsed.error, t),
    };
  }

  const { error } = await supabase.from("certificate_templates").insert({
    name: parsed.data.name,
    svg_template: parsed.data.svg_template,
    template_type: "official_certificate",
    active: parsed.data.active,
  });

  if (error) {
    logger.error(
      "admin.template.create_failed",
      { svgLength: parsed.data.svg_template.length },
      error,
    );
    return { message: t("admin.templates.could_not_create") };
  }

  revalidatePath("/admin/settings/templates");
  revalidatePath("/admin/courses");
  revalidatePath("/admin/seminars");
  return { ok: true, message: t("admin.templates.created") };
}

export async function updateTemplate(
  _prevState: FormState,
  formData: FormData,
): Promise<FormState> {
  const { supabase } = await requireAdmin();
  const { t } = await getServerT();

  const id = String(formData.get("id") ?? "");
  if (!id) return { message: t("validation.generic_error") };

  const parsed = parseTemplateForm(formData);
  if (!parsed.success) {
    return {
      message: t("validation.field_errors"),
      fieldErrors: fieldErrorsFromZod(parsed.error, t),
    };
  }

  const { error } = await supabase
    .from("certificate_templates")
    .update({
      name: parsed.data.name,
      svg_template: parsed.data.svg_template,
      active: parsed.data.active,
    })
    .eq("id", id);

  if (error) {
    logger.error(
      "admin.template.update_failed",
      { templateId: id, svgLength: parsed.data.svg_template.length },
      error,
    );
    return { message: t("admin.templates.could_not_save") };
  }

  revalidatePath("/admin/settings/templates");
  return { ok: true, message: t("admin.templates.saved") };
}

export async function toggleTemplateActive(formData: FormData): Promise<void> {
  const { supabase } = await requireAdmin();

  const id = String(formData.get("id") ?? "");
  const active = formData.get("active") === "true";
  if (!id) return;

  const { error } = await supabase
    .from("certificate_templates")
    .update({ active })
    .eq("id", id);
  if (error) {
    logger.error(
      "admin.template.toggle_active_failed",
      { templateId: id, active },
      error,
    );
  }

  revalidatePath("/admin/settings/templates");
  revalidatePath("/admin/courses");
  revalidatePath("/admin/seminars");
}

export async function deleteTemplate(
  _prevState: FormState,
  formData: FormData,
): Promise<FormState> {
  const { supabase } = await requireAdmin();
  const { t } = await getServerT();

  const id = String(formData.get("id") ?? "");
  if (!id) return { message: t("validation.generic_error") };

  // Archive-first, like every other guarded delete: a template still attached to
  // a course/seminar or questionnaire may only be deactivated.
  const [
    { count: courseCount, error: courseCountError },
    { count: questionnaireCount, error: questionnaireCountError },
  ] = await Promise.all([
    supabase
      .from("courses")
      .select("*", { count: "exact", head: true })
      .eq("certificate_template_id", id),
    supabase
      .from("questionnaires")
      .select("*", { count: "exact", head: true })
      .eq("certificate_template_id", id),
  ]);

  // A failed count reads as zero and would delete artwork still attached to a
  // course or seminar.
  if (courseCountError || questionnaireCountError) {
    logger.error(
      "admin.template.usage_count_failed",
      { templateId: id },
      courseCountError ?? questionnaireCountError,
    );
  }

  if ((courseCount ?? 0) > 0 || (questionnaireCount ?? 0) > 0) {
    return { message: t("admin.templates.cannot_delete_in_use") };
  }

  const { error } = await supabase
    .from("certificate_templates")
    .delete()
    .eq("id", id);
  if (error) {
    logger.error("admin.template.delete_failed", { templateId: id }, error);
    return { message: t("admin.templates.could_not_delete") };
  }

  revalidatePath("/admin/settings/templates");
  return { ok: true, message: t("admin.templates.deleted") };
}
