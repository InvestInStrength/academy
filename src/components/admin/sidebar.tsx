"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { cn } from "@/lib/utils";

const baseLinks = [
  { href: "/admin", label: "Dashboard" },
  { href: "/admin/courses", label: "Courses" },
  { href: "/admin/questions", label: "Question Bank" },
  { href: "/admin/questionnaires", label: "Questionnaires" },
  { href: "/admin/participants", label: "Participants" },
  { href: "/admin/certificates", label: "Certificates" },
  { href: "/admin/settings", label: "Settings" },
] as const;

const superadminLinks = [
  { href: "/admin/settings/admins", label: "Administrators" },
] as const;

function isActive(pathname: string, href: string): boolean {
  if (href === "/admin") return pathname === "/admin";
  // /admin/settings should not light up while on /admin/settings/admins.
  if (href === "/admin/settings") return pathname === "/admin/settings";
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function Sidebar({ isSuperadmin = false }: { isSuperadmin?: boolean }) {
  const pathname = usePathname();
  const links = isSuperadmin ? [...baseLinks, ...superadminLinks] : baseLinks;

  return (
    <nav className="space-y-1" aria-label="Admin sections">
      {links.map((link) => {
        const active = isActive(pathname, link.href);
        return (
          <Link
            key={link.href}
            href={link.href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "block rounded-md px-3 py-2 text-sm font-medium transition-colors",
              active
                ? "bg-brand-50 text-brand-700"
                : "text-slate-600 hover:bg-slate-100 hover:text-slate-900",
            )}
          >
            {link.label}
          </Link>
        );
      })}
    </nav>
  );
}
