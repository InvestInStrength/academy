"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";

import { requireAdmin } from "@/lib/auth/admin";
import { fieldErrorsFromZod, type FormState } from "@/lib/form";
import { courseSchema } from "./schema";

function parseCourseForm(formData: FormData) {
  return courseSchema.safeParse({
    title: formData.get("title"),
    description: formData.get("description") || undefined,
    active: formData.get("active") === "on",
  });
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

  const { data, error } = await supabase
    .from("courses")
    .insert({
      title: parsed.data.title,
      description: parsed.data.description ?? null,
      active: parsed.data.active,
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

  const { error } = await supabase
    .from("courses")
    .update({
      title: parsed.data.title,
      description: parsed.data.description ?? null,
      active: parsed.data.active,
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
