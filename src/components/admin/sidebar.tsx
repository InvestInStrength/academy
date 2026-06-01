"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { useT } from "@/lib/i18n/client";
import { cn } from "@/lib/utils";

type NavLink = {
  href: string;
  labelKey: string;
  children?: NavLink[];
};

const baseLinks: NavLink[] = [
  { href: "/admin", labelKey: "nav.dashboard" },
  {
    href: "/admin/courses",
    labelKey: "nav.courses",
    children: [
      { href: "/admin/questions", labelKey: "nav.questions" },
      { href: "/admin/questionnaires", labelKey: "nav.questionnaires" },
    ],
  },
  { href: "/admin/participants", labelKey: "nav.participants" },
  { href: "/admin/certificates", labelKey: "nav.certificates" },
  { href: "/admin/settings", labelKey: "nav.settings" },
];

const superadminLinks: NavLink[] = [
  { href: "/admin/settings/admins", labelKey: "nav.administrators" },
  { href: "/admin/settings/language", labelKey: "nav.language" },
];

function isActive(pathname: string, href: string): boolean {
  if (href === "/admin") return pathname === "/admin";
  if (href === "/admin/settings") return pathname === "/admin/settings";
  return pathname === href || pathname.startsWith(`${href}/`);
}

/** A parent is "in this section" when the current pathname matches any of
 * its children's routes — used for a softer highlight on the parent row. */
function isInSection(pathname: string, link: NavLink): boolean {
  if (!link.children) return false;
  return link.children.some((child) => isActive(pathname, child.href));
}

export function Sidebar({ isSuperadmin = false }: { isSuperadmin?: boolean }) {
  const pathname = usePathname();
  const t = useT();
  const links = isSuperadmin ? [...baseLinks, ...superadminLinks] : baseLinks;

  return (
    <nav className="space-y-1" aria-label={t("admin.sections_label")}>
      {links.map((link) => {
        const active = isActive(pathname, link.href);
        const inSection = !active && isInSection(pathname, link);
        return (
          <div key={link.href}>
            <Link
              href={link.href}
              aria-current={active ? "page" : undefined}
              className={cn(
                "block rounded-md px-3 py-2 text-sm font-medium transition-colors",
                active
                  ? "bg-brand-50 text-brand-700"
                  : inSection
                    ? "text-brand-700 hover:bg-slate-100"
                    : "text-slate-600 hover:bg-slate-100 hover:text-slate-900",
              )}
            >
              {t(link.labelKey)}
            </Link>
            {link.children && (
              <div className="mt-0.5 ml-3 space-y-0.5 border-l border-slate-200 pl-3">
                {link.children.map((child) => {
                  const childActive = isActive(pathname, child.href);
                  return (
                    <Link
                      key={child.href}
                      href={child.href}
                      aria-current={childActive ? "page" : undefined}
                      className={cn(
                        "block rounded-md px-3 py-1.5 text-xs font-medium transition-colors",
                        childActive
                          ? "bg-brand-50 text-brand-700"
                          : "text-slate-500 hover:bg-slate-100 hover:text-slate-900",
                      )}
                    >
                      {t(child.labelKey)}
                    </Link>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}
    </nav>
  );
}
