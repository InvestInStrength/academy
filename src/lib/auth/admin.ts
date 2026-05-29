import { redirect } from "next/navigation";
import type { User } from "@supabase/supabase-js";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { AdminProfile } from "@/types/database";

type AdminContext = {
  supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>;
  user: User;
  profile: AdminProfile;
};

/**
 * The real authorization gate. Validates the session against Supabase Auth
 * (getUser, not getSession) AND confirms an ACTIVE admin_profiles row exists.
 *
 * Call this at the top of the admin layout AND inside every admin Server Action
 * / Route Handler — do not rely on the proxy alone (see src/lib/supabase/proxy.ts).
 *
 * Redirects:
 *   - not signed in            -> /admin/login
 *   - signed in but not admin  -> /admin/no-access (no redirect loop: that page
 *                                 lives outside the protected layout)
 */
export async function requireAdmin(): Promise<AdminContext> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/admin/login");
  }

  const { data: profile } = await supabase
    .from("admin_profiles")
    .select("*")
    .eq("id", user.id)
    .maybeSingle<AdminProfile>();

  if (!profile) {
    redirect("/admin/no-access");
  }

  return { supabase, user, profile };
}

/** Like requireAdmin, but additionally requires the `superadmin` role. */
export async function requireSuperadmin(): Promise<AdminContext> {
  const context = await requireAdmin();
  if (context.profile.role !== "superadmin") {
    redirect("/admin/no-access");
  }
  return context;
}
