/**
 * Renders an immutable certificate SVG responsively, with a REVOKED overlay
 * when applicable.
 *
 * The SVG is rendered as an `<img src="data:image/svg+xml;base64,…">` rather
 * than inlined with `dangerouslySetInnerHTML`. That is a security boundary, not
 * a style choice: since certificate templates became admin-uploadable
 * (`/admin/settings/templates`), the markup around our escaped data is no
 * longer entirely ours. An SVG loaded through `<img>` is an isolated document —
 * browsers never run its scripts, event handlers or external fetches — so this
 * page cannot execute template-borne markup even if a malicious template
 * reaches the immutable snapshot. Uploads are also sanitised on write
 * (`sanitizeTemplateSvg`); this is the second, independent layer, and the one
 * that still holds for snapshots frozen before that sanitiser existed.
 *
 * The certificate is a static document, so nothing is lost by isolating it: it
 * carries no interactivity, and its fonts/artwork are already embedded.
 */
export function CertificateView({
  svg,
  revoked = false,
  revokedLabel = "Revoked",
  alt = "",
}: {
  svg: string;
  revoked?: boolean;
  revokedLabel?: string;
  alt?: string;
}) {
  const dataUri = `data:image/svg+xml;base64,${Buffer.from(svg, "utf8").toString("base64")}`;

  return (
    <div className="relative">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={dataUri}
        alt={alt}
        className="block h-auto w-full overflow-hidden rounded-lg border border-slate-200 shadow-sm"
      />
      {revoked && (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <span className="-rotate-12 rounded bg-red-600/90 px-6 py-2 text-2xl font-bold uppercase tracking-widest text-white shadow">
            {revokedLabel}
          </span>
        </div>
      )}
    </div>
  );
}
