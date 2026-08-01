import { NextResponse, type NextRequest } from "next/server";

import { updateSession } from "@/lib/supabase/proxy";

/**
 * Next.js 16 Proxy (formerly "middleware").
 *
 * Responsibilities:
 *   1. Keep the Supabase auth session fresh on every request.
 *   2. Optimistically redirect unauthenticated users away from /admin/* to the
 *      login page, and signed-in users away from the login page.
 *
 * This is NOT the real auth gate — see requireAdmin(). It only improves UX.
 */
export async function proxy(request: NextRequest) {
  const { response, user } = await updateSession(request);
  const { pathname } = request.nextUrl;

  const isLoginRoute = pathname === "/admin/login";
  const isAdminRoute = pathname === "/admin" || pathname.startsWith("/admin/");

  if (isAdminRoute && !isLoginRoute && !user) {
    const url = request.nextUrl.clone();
    url.pathname = "/admin/login";
    url.searchParams.set("redirectTo", pathname);
    return NextResponse.redirect(url);
  }

  if (isLoginRoute && user) {
    const url = request.nextUrl.clone();
    url.pathname = "/admin";
    url.search = "";
    return NextResponse.redirect(url);
  }

  return response;
}

export const config = {
  // Run on all routes except static assets, image optimization, and `/api/*`.
  // Keeping the session fresh on public PAGE routes is harmless and avoids
  // surprises later.
  //
  // `/api/*` is excluded deliberately. `updateSession()` performs a Supabase
  // Auth round-trip on every matched request, which is wrong for machine
  // endpoints in three ways: it makes `/api/health` — whose entire promise is a
  // dependency-free liveness answer a monitor can poll every 30s — cost a
  // network call and fail when Supabase Auth is degraded, destroying its ability
  // to distinguish "the app is serving" from "a dependency is down"; and it
  // would add latency plus an extra failure mode to future webhook receivers
  // (Stripe, Resend), which authenticate by signature and have no cookies.
  //
  // Safe with respect to the warning in CLAUDE.md: Server Actions POST to the
  // PAGE route that declares them, never to `/api/*`. API routes must do their
  // own authorization — the proxy was never the gate (`requireAdmin()` is).
  matcher: [
    "/((?!api/|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};
