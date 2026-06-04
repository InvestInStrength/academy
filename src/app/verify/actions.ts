"use server";

import { redirect } from "next/navigation";
import { headers } from "next/headers";

import { createSupabaseServiceRoleClient } from "@/lib/supabase/service";
import { rateLimit } from "@/lib/rate-limit";
import { getServerT } from "@/lib/i18n";
import type { FormState } from "@/lib/form";

/** Looks up a certificate by its human-facing ID and forwards to the canonical
 * token-based verification page. Public + rate-limited. */
export async function lookupCertificate(
  _prevState: FormState,
  formData: FormData,
): Promise<FormState> {
  const { t } = await getServerT();
  const certificateNumber = String(formData.get("certificate_number") ?? "")
    .trim()
    .toUpperCase();
  if (!certificateNumber) {
    return { message: t("verify.lookup_enter_id") };
  }

  const headerStore = await headers();
  const ip =
    headerStore.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  if (!(await rateLimit(`verifylookup:${ip}`, 20, 60_000))) {
    return { message: t("validation.too_many_attempts") };
  }

  const service = createSupabaseServiceRoleClient();
  const { data } = await service
    .from("certificates")
    .select("verification_token")
    .eq("certificate_number", certificateNumber)
    .maybeSingle();

  if (!data) {
    return { message: t("verify.lookup_not_found") };
  }

  redirect(`/verify/${data.verification_token}`);
}
