import { getCertificateByVerificationToken } from "@/lib/certification/data";
import { getServerT } from "@/lib/i18n";
import { formatLongDate } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CertificateView } from "@/components/certificate/certificate-view";

export const dynamic = "force-dynamic";

export default async function VerifyPage({
  params,
}: {
  params: Promise<{ verificationToken: string }>;
}) {
  const { verificationToken } = await params;
  const certificate = await getCertificateByVerificationToken(verificationToken);
  const { locale, t } = await getServerT();

  if (!certificate) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{t("verify.not_found_title")}</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-slate-600">{t("verify.not_found_body")}</p>
        </CardContent>
      </Card>
    );
  }

  const { snapshot, status } = certificate;
  const revoked = status === "revoked";
  const preview = certificate.assets.official_png_preview;
  // Snapshots frozen before seminars existed carry no `kind` — those are courses.
  const isSeminar = snapshot.kind === "seminar";

  return (
    <div className="space-y-6">
      {preview ? (
        <div className="relative">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={preview}
            alt={snapshot.course_title}
            className="block w-full rounded-lg border border-slate-200 shadow-sm"
          />
          {revoked && (
            <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
              <span className="-rotate-12 rounded bg-red-600/90 px-6 py-2 text-2xl font-bold uppercase tracking-widest text-white shadow">
                {t("common.revoked")}
              </span>
            </div>
          )}
        </div>
      ) : (
        <CertificateView
          svg={snapshot.svg}
          revoked={revoked}
          revokedLabel={t("common.revoked")}
          alt={snapshot.course_title}
        />
      )}

      <Card>
        <CardHeader className="flex flex-wrap items-center justify-between gap-2">
          <CardTitle>
            {t("verify.certificate_label")} {snapshot.certificate_number}
          </CardTitle>
          <Badge tone={revoked ? "danger" : "success"}>
            {revoked ? t("common.revoked") : t("common.valid")}
          </Badge>
        </CardHeader>
        <CardContent className="space-y-4">
          {revoked && (
            <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
              {t("verify.revoked_notice")}
            </p>
          )}

          <dl className="grid gap-x-6 gap-y-2 text-sm sm:grid-cols-2">
            <div>
              <dt className="text-slate-400">{t("verify.awarded_to")}</dt>
              <dd className="font-medium text-slate-900">{snapshot.candidate_name}</dd>
            </div>
            <div>
              <dt className="text-slate-400">
                {isSeminar ? t("verify.seminar_label") : t("verify.course_label")}
              </dt>
              <dd className="font-medium text-slate-900">{snapshot.course_title}</dd>
            </div>
            {isSeminar && snapshot.event_date && (
              <div>
                <dt className="text-slate-400">{t("verify.event_date_label")}</dt>
                <dd className="font-medium text-slate-900">
                  {formatLongDate(snapshot.event_date, locale)}
                </dd>
              </div>
            )}
            <div>
              <dt className="text-slate-400">{t("verify.completed_label")}</dt>
              <dd className="font-medium text-slate-900">
                {formatLongDate(snapshot.completion_date, locale)}
              </dd>
            </div>
            <div>
              <dt className="text-slate-400">{t("verify.certificate_id_label")}</dt>
              <dd className="font-medium text-slate-900">{snapshot.certificate_number}</dd>
            </div>
            {snapshot.topics.length > 0 && (
              <div className="sm:col-span-2">
                <dt className="text-slate-400">{t("verify.topics_label")}</dt>
                <dd className="font-medium text-slate-900">
                  {snapshot.topics.join(", ")}
                </dd>
              </div>
            )}
          </dl>
        </CardContent>
      </Card>
    </div>
  );
}
