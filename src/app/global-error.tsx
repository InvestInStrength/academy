"use client";

import { useEffect } from "react";

import { DEFAULT_LOCALE, getDictionary, t as rawT } from "@/lib/i18n/dict";

/**
 * Last-resort boundary: it catches errors thrown by the root layout itself, so
 * it replaces that layout entirely and must ship its own `<html>`/`<body>`.
 *
 * Everything here is inline-styled on purpose. When the root layout is the
 * thing that failed, neither `globals.css` nor the Barlow font variable it
 * loads can be relied on — a Tailwind-classed fallback would render as unstyled
 * text. Inline styles and a system font stack always paint.
 *
 * Locale is the DE default, hardcoded rather than read from `useLocale()`.
 * This component REPLACES the root layout, so no `LocaleProvider` can exist
 * above it — the hook would silently return the same default while implying a
 * responsiveness to the platform language that is structurally impossible here.
 */
export default function GlobalError({
  error,
  unstable_retry,
}: {
  error: Error & { digest?: string };
  unstable_retry: () => void;
}) {
  const locale = DEFAULT_LOCALE;
  const dictionary = getDictionary(locale);
  const t = (key: string) => rawT(dictionary, key);

  useEffect(() => {
    console.error("[global-error-boundary]", error.digest ?? "no-digest", error);
  }, [error]);

  return (
    <html lang={locale}>
      <body
        style={{
          margin: 0,
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "2rem 1.5rem",
          background: "#f5f5f2",
          color: "#272b24",
          fontFamily: "ui-sans-serif, system-ui, sans-serif",
        }}
      >
        <title>{t("error.boundary_title")}</title>
        <div style={{ maxWidth: "26rem", textAlign: "center" }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/brand/IIS_emblem.svg"
            alt="INVEST IN STRENGTH"
            width={40}
            height={40}
            style={{ display: "block", margin: "0 auto 1.5rem" }}
          />
          <h1 style={{ margin: "0 0 0.75rem", fontSize: "1.125rem", fontWeight: 700 }}>
            {t("error.boundary_title")}
          </h1>
          <p style={{ margin: "0 0 1.25rem", fontSize: "0.875rem", lineHeight: 1.6 }}>
            {t("error.boundary_body")}
          </p>

          {error.digest ? (
            <p style={{ margin: "0 0 1.25rem", fontSize: "0.75rem", color: "#5b5f57" }}>
              {t("error.boundary_reference_label")}:{" "}
              <code style={{ fontFamily: "ui-monospace, monospace" }}>
                {error.digest}
              </code>
            </p>
          ) : null}

          <button
            type="button"
            onClick={() => unstable_retry()}
            style={{
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              height: "2.5rem",
              padding: "0 1.25rem",
              border: "none",
              borderRadius: "9999px",
              background: "#3a4039",
              color: "#ffffff",
              fontSize: "0.875rem",
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            {t("error.boundary_retry")}
          </button>

          <p style={{ margin: "1.25rem 0 0", fontSize: "0.75rem", color: "#5b5f57" }}>
            {t("error.boundary_contact")}
          </p>
        </div>
      </body>
    </html>
  );
}
