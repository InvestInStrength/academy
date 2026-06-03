import Link from "next/link";

import { requireAdmin } from "@/lib/auth/admin";
import { getServerT } from "@/lib/i18n";
import { LocaleProvider } from "@/lib/i18n/client";
import { Sidebar } from "@/components/admin/sidebar";
import { SignOutButton } from "@/components/admin/sign-out-button";
import { MobileNav } from "@/components/admin/mobile-nav";
import { Emblem } from "@/components/brand/logo";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Real authorization gate (the proxy redirect is only an optimisation).
  const { user, profile } = await requireAdmin();
  const isSuperadmin = profile.role === "superadmin";
  const { locale, t } = await getServerT();

  return (
    <LocaleProvider locale={locale}>
      <div className="flex min-h-screen">
        <aside className="hidden w-60 shrink-0 flex-col border-r border-slate-200 bg-white px-4 py-5 md:flex">
          <Link href="/admin" className="flex items-center gap-2.5 px-3">
            <Emblem className="h-8 w-8" />
            <span className="text-sm font-bold text-slate-900">
              {t("meta.brand")}
              <span className="block text-xs font-medium text-slate-400">
                {t("meta.brand_subtitle")}
              </span>
            </span>
          </Link>
          <div className="mt-6 flex-1">
            <Sidebar isSuperadmin={isSuperadmin} />
          </div>
          <div className="border-t border-slate-100 px-3 pt-4">
            <p className="truncate text-xs text-slate-500" title={user.email ?? ""}>
              {user.email}
            </p>
            <div className="mt-1">
              <SignOutButton />
            </div>
          </div>
        </aside>

        <div className="flex min-w-0 flex-1 flex-col">
          <header className="flex items-center gap-2 border-b border-slate-200 bg-white px-3 py-3 md:hidden">
            <MobileNav
              isSuperadmin={isSuperadmin}
              userEmail={user.email ?? ""}
              brand={t("meta.brand")}
            />
            <Link href="/admin" className="flex items-center gap-2">
              <Emblem className="h-7 w-7" />
              <span className="text-sm font-bold text-slate-900">
                {t("meta.brand")}
              </span>
            </Link>
          </header>
          <main className="flex-1 px-5 py-6 md:px-8">{children}</main>
        </div>
      </div>
    </LocaleProvider>
  );
}
