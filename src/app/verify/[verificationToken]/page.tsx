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

  return (
    <div className="space-y-6">
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
              <dt className="text-slate-400">{t("verify.course_label")}</dt>
              <dd className="font-medium text-slate-900">{snapshot.course_title}</dd>
            </div>
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

      <CertificateView
        svg={snapshot.svg}
        revoked={revoked}
        revokedLabel={t("common.revoked")}
      />
    </div>
  );
}
