import type { SupabaseClient } from "@supabase/supabase-js";

import type { CourseKind, Database } from "@/types/database";
import type { TemplateOption } from "./course-form";

/** The admin section a record of this kind lives in. Courses and seminars are
 * the same table split by `kind`, surfaced as two sections. */
export function basePathFor(kind: CourseKind): string {
  return kind === "seminar" ? "/admin/seminars" : "/admin/courses";
}

/** Message-key namespace for a certification kind. Courses and seminars share
 * every screen but not their copy, so each kind has its own key block. */
export function messagePrefixFor(kind: CourseKind): string {
  return kind === "seminar" ? "admin.seminars" : "admin.courses";
}

/**
 * Certificate templates offerable to a course/seminar: the active ones, plus
 * the one this record already uses even if it has since been deactivated.
 *
 * That second part is load-bearing, not a nicety. The picker is an uncontrolled
 * `<select defaultValue={certificate_template_id}>`; with no matching `<option>`
 * the browser silently selects the first one ("built-in template") and posts
 * `""`, so saving ANY unrelated field would null the record's artwork — and
 * re-activating the template would not bring it back. Deactivating a template is
 * explicitly allowed (it is what `deleteTemplate` steers admins to when a
 * template is in use), so that path is reachable by design.
 */
export async function loadTemplateOptions(
  supabase: SupabaseClient<Database>,
  assignedId?: string | null,
): Promise<TemplateOption[]> {
  const { data } = await supabase
    .from("certificate_templates")
    .select("id, name, active, template_type")
    .eq("active", true)
    .eq("template_type", "official_certificate")
    .order("name");

  const options: TemplateOption[] = (data ?? []).map((row) => ({
    id: row.id,
    name: row.name,
  }));

  if (assignedId && !options.some((option) => option.id === assignedId)) {
    const { data: assigned } = await supabase
      .from("certificate_templates")
      .select("id, name")
      .eq("id", assignedId)
      .maybeSingle();
    if (assigned) {
      options.push({ id: assigned.id, name: assigned.name, inactive: true });
    }
  }

  return options;
}
