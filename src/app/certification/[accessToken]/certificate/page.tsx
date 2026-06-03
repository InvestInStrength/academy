import Link from "next/link";
import { redirect } from "next/navigation";

import {
  getCandidateContext,
  getCertificateForAssignment,
} from "@/lib/certification/data";
import { getServerT } from "@/lib/i18n";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { buttonClasses } from "@/components/ui/button";
import { CertificateView } from "@/components/certificate/certificate-view";
import { CertificateDownloads } from "@/components/certificate/certificate-downloads";
import { EmailCertificateButton } from "../email-certificate-button";

export const dynamic = "force-dynamic";

export default async function CandidateCertificatePage({
  params,
}: {
  params: Promise<{ accessToken: string }>;
}) {
  const { accessToken } = await params;
  const context = await getCandidateContext(accessToken);
  const { t } = await getServerT();

  if (!context) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{t("candidate.link_unavailable_title")}</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-slate-600">
            {t("candidate.link_unavailable_body")}
          </p>
        </CardContent>
      </Card>
    );
  }
  if (!context.participant.email_confirmed) {
    redirect(`/certification/${accessToken}`);
  }
  if (context.assignment.status !== "passed") {
    redirect(`/certification/${accessToken}/result`);
  }

  const certificate = await getCertificateForAssignment(context.assignment.id);

  if (!certificate) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{t("candidate.certificate.preparing_title")}</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-slate-600">
            {t("candidate.certificate.preparing_body")}
          </p>
        </CardContent>
      </Card>
    );
  }

  const revoked = certificate.status === "revoked";
  const { official_pdf, official_png_preview } = certificate.assets;
  const hasServerAssets = Boolean(official_pdf || official_png_preview);

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>{t("candidate.certificate.title")}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {revoked && (
            <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
              {t("candidate.certificate.revoked_notice")}
            </p>
          )}

          {/* Prefer the server-rendered PNG preview; fall back to the inline SVG
            * if assets are still pending/failed (graceful degradation). */}
          {official_png_preview ? (
            <div className="relative">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={official_png_preview}
                alt={certificate.snapshot.course_title}
                className="block w-full rounded-lg border border-slate-200 shadow-sm"
              />
              {revoked && (
                <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                  <span className="-rotate-12 rounded bg-red-600/90 px-6 py-2 text-2xl font-bold uppercase tracking-widest text-white shadow">
                    {t("candidate.certificate.revoked_overlay")}
                  </span>
                </div>
              )}
            </div>
          ) : (
            <CertificateView
              svg={certificate.snapshot.svg}
              revoked={revoked}
              revokedLabel={t("candidate.certificate.revoked_overlay")}
            />
          )}

          {!revoked && (
            <>
              <div className="flex flex-wrap gap-2">
                {official_pdf && (
                  <a
                    href={official_pdf}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={buttonClasses("primary", "md")}
                  >
                    {t("candidate.certificate.download_pdf")}
                  </a>
                )}
                {official_png_preview && (
                  <a
                    href={official_png_preview}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={buttonClasses("outline", "md")}
                  >
                    {t("candidate.certificate.download_png")}
                  </a>
                )}
              </div>

              {/* Fallback: client-side SVG/PNG download while server assets are
                * being prepared (or if rendering failed). */}
              {!hasServerAssets && (
                <>
                  <p className="text-sm text-slate-500">
                    {t("candidate.certificate.assets_pending")}
                  </p>
                  <CertificateDownloads
                    svg={certificate.snapshot.svg}
                    certificateNumber={certificate.certificate_number}
                  />
                </>
              )}

              <EmailCertificateButton accessToken={accessToken} />
            </>
          )}

          <p className="text-sm text-slate-500">
            {t("candidate.certificate.verify_at")}{" "}
            <a
              href={certificate.snapshot.verification_url}
              className="text-brand-700 hover:underline"
            >
              {certificate.snapshot.verification_url}
            </a>
          </p>
        </CardContent>
      </Card>

      <Link
        href={`/certification/${accessToken}`}
        className="block text-sm text-slate-500 hover:text-slate-900"
      >
        {t("common.back")}
      </Link>
    </div>
  );
}
