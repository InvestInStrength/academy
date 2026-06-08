"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

import { useT } from "@/lib/i18n/client";
import { Sidebar } from "@/components/admin/sidebar";
import { SignOutButton } from "@/components/admin/sign-out-button";
import { Emblem } from "@/components/brand/logo";

type Props = {
  isSuperadmin: boolean;
  userEmail: string;
  brand: string;
};

/**
 * Mobile-only navigation: a hamburger button that opens a slide-in drawer
 * reusing the same {@link Sidebar} as the desktop aside. The desktop sidebar
 * is hidden below `md`, so without this admins have no way to move between
 * sections on a phone. Closes on route change, backdrop tap, or Escape.
 */
export function MobileNav({ isSuperadmin, userEmail, brand }: Props) {
  const t = useT();
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [lastPathname, setLastPathname] = useState(pathname);

  // Close whenever the route changes (i.e. a nav link was tapped). Done during
  // render rather than in an effect (React's "adjust state on prop change"
  // pattern) so it commits in the same pass with no extra paint — and avoids the
  // react-hooks/set-state-in-effect rule.
  if (pathname !== lastPathname) {
    setLastPathname(pathname);
    setOpen(false);
  }

  // While open: lock body scroll and close on Escape.
  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", onKey);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = previousOverflow;
    };
  }, [open]);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label={t("admin.open_menu")}
        aria-expanded={open}
        className="inline-flex h-9 w-9 items-center justify-center rounded-md text-slate-700 hover:bg-slate-100"
      >
        <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden>
          <path
            d="M3 5h14M3 10h14M3 15h14"
            stroke="currentColor"
            strokeWidth="1.75"
            strokeLinecap="round"
          />
        </svg>
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 md:hidden"
          role="dialog"
          aria-modal="true"
          aria-label={t("admin.sections_label")}
        >
          <div
            className="absolute inset-0 bg-slate-900/40"
            onClick={() => setOpen(false)}
            aria-hidden
          />
          <div className="absolute inset-y-0 left-0 flex w-72 max-w-[82%] flex-col bg-white px-4 py-5 shadow-xl">
            <div className="flex items-center justify-between px-3">
              <Link
                href="/admin"
                className="flex items-center gap-2.5"
                onClick={() => setOpen(false)}
              >
                <Emblem className="h-8 w-8" />
                <span className="text-sm font-bold text-slate-900">{brand}</span>
              </Link>
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label={t("common.close")}
                className="inline-flex h-8 w-8 items-center justify-center rounded-md text-slate-500 hover:bg-slate-100"
              >
                <svg width="18" height="18" viewBox="0 0 20 20" fill="none" aria-hidden>
                  <path
                    d="M5 5l10 10M15 5L5 15"
                    stroke="currentColor"
                    strokeWidth="1.75"
                    strokeLinecap="round"
                  />
                </svg>
              </button>
            </div>

            <div className="mt-6 flex-1 overflow-y-auto">
              <Sidebar isSuperadmin={isSuperadmin} />
            </div>

            <div className="border-t border-slate-100 px-3 pt-4">
              <p className="truncate text-xs text-slate-500" title={userEmail}>
                {userEmail}
              </p>
              <div className="mt-1">
                <SignOutButton />
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
