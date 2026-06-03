"use server";

import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { z } from "zod";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { rateLimit } from "@/lib/rate-limit";
import { getServerT } from "@/lib/i18n";
import { fieldErrorsFromZod, type FormState } from "@/lib/form";

const signInSchema = z.object({
  email: z.string().email({ message: "validation.email_invalid" }),
  password: z.string().min(1, { message: "validation.password_required" }),
});

/** Only allow relative redirects within the admin area (prevents open redirect). */
function safeRedirectTarget(raw: FormDataEntryValue | null): string {
  const value = typeof raw === "string" ? raw : "";
  return value.startsWith("/admin") ? value : "/admin";
}

export async function signInAction(
  _prevState: FormState,
  formData: FormData,
): Promise<FormState> {
  const { t } = await getServerT();
  const headerStore = await headers();
  const ip =
    headerStore.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  if (!rateLimit(`login:${ip}`, 10, 60_000)) {
    return { message: t("validation.too_many_attempts") };
  }

  const parsed = signInSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });

  if (!parsed.success) {
    return {
      message: t("validation.field_errors"),
      fieldErrors: fieldErrorsFromZod(parsed.error, t),
    };
  }

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.signInWithPassword(parsed.data);

  if (error) {
    return { message: t("auth.login.invalid") };
  }

  // Outside any try/catch: redirect() works by throwing a control-flow signal.
  redirect(safeRedirectTarget(formData.get("redirectTo")));
}

export async function signOutAction(): Promise<void> {
  const supabase = await createSupabaseServerClient();
  await supabase.auth.signOut();
  redirect("/admin/login");
}
