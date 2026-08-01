"use client";

import { useEffect } from "react";

import { Emblem } from "@/components/brand/logo";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useT } from "@/lib/i18n/client";

/**
 * Root error boundary. Until now an unhandled Server Action or render error —
 * including one thrown mid-assessment — dropped the candidate onto Next's raw
 * error screen with nothing logged and no way to describe what happened.
 *
 * The digest is the whole point: Next redacts server error messages before they
 * reach the browser but logs the real error under that same digest, so showing
 * it turns "it broke" into a line an admin can find. Client-side errors have no
 * digest, hence the conditional.
 *
 * Strings resolve through `useT()` without a `LocaleProvider`: this boundary
 * replaces the subtree that would have supplied one, so it always renders in
 * the DE default. Reading the active language needs a server round-trip, which
 * is exactly what is broken here.
 */
export default function AppError({
  error,
  unstable_retry,
}: {
  error: Error & { digest?: string };
  unstable_retry: () => void;
}) {
  const t = useT();

  useEffect(() => {
    console.error("[error-boundary]", error.digest ?? "no-digest", error);
  }, [error]);

  return (
    <main className="topo-surface flex flex-1 items-center justify-center px-6 py-16">
      <Card className="w-full max-w-md">
        <CardContent className="space-y-5 px-6 py-8 text-center">
          <Emblem className="mx-auto h-10 w-10" />
          <div className="space-y-2">
            <h1 className="text-lg font-bold text-slate-900">
              {t("error.boundary_title")}
            </h1>
            <p className="text-sm text-slate-600">{t("error.boundary_body")}</p>
          </div>

          {error.digest ? (
            <p className="text-xs text-slate-500">
              {t("error.boundary_reference_label")}:{" "}
              <code className="rounded bg-slate-100 px-1.5 py-0.5 font-mono text-slate-700">
                {error.digest}
              </code>
            </p>
          ) : null}

          <Button onClick={() => unstable_retry()}>
            {t("error.boundary_retry")}
          </Button>

          <p className="text-xs text-slate-500">{t("error.boundary_contact")}</p>
        </CardContent>
      </Card>
    </main>
  );
}
