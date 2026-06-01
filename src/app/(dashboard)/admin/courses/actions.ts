"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";

import { requireAdmin } from "@/lib/auth/admin";
import { fieldErrorsFromZod, type FormState } from "@/lib/form";
import { courseSchema } from "./schema";

function parseCourseForm(formData: FormData) {
  return courseSchema.safeParse({
    title: formData.get("title"),
    title_en: formData.get("title_en") || undefined,
    description: formData.get("description") || undefined,
    description_en: formData.get("description_en") || undefined,
    active: formData.get("active") === "on",
  });
}

function nullOrText(value: string | undefined): string | null {
  return value && value.length > 0 ? value : null;
}

export async function createCourse(
  _prevState: FormState,
  formData: FormData,
): Promise<FormState> {
  const { supabase } = await requireAdmin();

  const parsed = parseCourseForm(formData);
  if (!parsed.success) {
    return {
      message: "Please correct the highlighted fields.",
      fieldErrors: fieldErrorsFromZod(parsed.error),
    };
  }

  const d = parsed.data;
  const description = nullOrText(d.description);
  const { data, error } = await supabase
    .from("courses")
    .insert({
      title: d.title,
      title_de: d.title,
      title_en: nullOrText(d.title_en),
      description,
      description_de: description,
      description_en: nullOrText(d.description_en),
      active: d.active,
    })
    .select("id")
    .single();

  if (error || !data) {
    return { message: "Could not create the course. Please try again." };
  }

  revalidatePath("/admin/courses");
  redirect(`/admin/courses/${data.id}`);
}

export async function updateCourse(
  _prevState: FormState,
  formData: FormData,
): Promise<FormState> {
  const { supabase } = await requireAdmin();

  const id = String(formData.get("id") ?? "");
  if (!id) {
    return { message: "Missing course id." };
  }

  const parsed = parseCourseForm(formData);
  if (!parsed.success) {
    return {
      message: "Please correct the highlighted fields.",
      fieldErrors: fieldErrorsFromZod(parsed.error),
    };
  }

  const d = parsed.data;
  const description = nullOrText(d.description);
  const { error } = await supabase
    .from("courses")
    .update({
      title: d.title,
      title_de: d.title,
      title_en: nullOrText(d.title_en),
      description,
      description_de: description,
      description_en: nullOrText(d.description_en),
      active: d.active,
    })
    .eq("id", id);

  if (error) {
    return { message: "Could not save changes. Please try again." };
  }

  revalidatePath("/admin/courses");
  revalidatePath(`/admin/courses/${id}`);
  return { ok: true, message: "Course saved." };
}

export async function toggleCourseActive(formData: FormData): Promise<void> {
  const { supabase } = await requireAdmin();

  const id = String(formData.get("id") ?? "");
  const active = formData.get("active") === "true";
  if (!id) return;

  await supabase.from("courses").update({ active }).eq("id", id);
  revalidatePath("/admin/courses");
  revalidatePath(`/admin/courses/${id}`);
}

export async function deleteCourse(
  _prevState: FormState,
  formData: FormData,
): Promise<FormState> {
  const { supabase } = await requireAdmin();

  const id = String(formData.get("id") ?? "");
  if (!id) return { message: "Missing course id." };

  // Only unused courses may be hard-deleted; otherwise deactivate.
  const [{ count: questionCount }, { count: questionnaireCount }] =
    await Promise.all([
      supabase
        .from("questions")
        .select("*", { count: "exact", head: true })
        .eq("course_id", id),
      supabase
        .from("questionnaires")
        .select("*", { count: "exact", head: true })
        .eq("course_id", id),
    ]);

  if ((questionCount ?? 0) > 0 || (questionnaireCount ?? 0) > 0) {
    return {
      message:
        "Cannot delete: this course has questions or questionnaires. Deactivate it instead.",
    };
  }

  const { error } = await supabase.from("courses").delete().eq("id", id);
  if (error) {
    return { message: "Could not delete the course. Please try again." };
  }

  revalidatePath("/admin/courses");
  redirect("/admin/courses");
}
