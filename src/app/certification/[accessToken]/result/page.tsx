import Link from "next/link";
import { redirect } from "next/navigation";

import {
  getCandidateContext,
  getLatestResult,
  localizedQuestionnaireTitle,
} from "@/lib/certification/data";
import { getServerT } from "@/lib/i18n";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ButtonLink } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export const dynamic = "force-dynamic";

export default async function ResultPage({
  params,
}: {
  params: Promise<{ accessToken: string }>;
}) {
  const { accessToken } = await params;
  const context = await getCandidateContext(accessToken);
  const { locale, t } = await getServerT();

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

  const latest = await getLatestResult(context.assignment.id);
  const title = localizedQuestionnaireTitle(context.questionnaire, locale);

  if (!latest || latest.score_percentage === null) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{title}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-slate-600">{t("candidate.result.no_attempt")}</p>
          <ButtonLink href={`/certification/${accessToken}/attempt`}>
            {t("candidate.start_assessment")}
          </ButtonLink>
        </CardContent>
      </Card>
    );
  }

  const passed = Boolean(latest.passed);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>{t("candidate.result.title")}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center gap-3">
            <span className="text-3xl font-bold text-slate-900">
              {latest.score_percentage}%
            </span>
            <Badge tone={passed ? "success" : "danger"}>
              {passed ? t("common.passed") : t("common.not_passed")}
            </Badge>
          </div>
          <p className="text-sm text-slate-600">
            {t("candidate.result.passing_line", {
              percent: context.questionnaire.passing_percentage,
            })}
          </p>
        </CardContent>
      </Card>

      {passed ? (
        <Card>
          <CardHeader>
            <CardTitle>
              {t("candidate.result.congratulations", {
                name: context.participant.full_name,
              })}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p
              className="text-sm text-slate-600"
              dangerouslySetInnerHTML={{
                __html: t("candidate.result.passed_body", { title }),
              }}
            />
            <ButtonLink href={`/certification/${accessToken}/certificate`}>
              {t("candidate.result.view_certificate")}
            </ButtonLink>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>{t("candidate.result.focus_next")}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {latest.recommendations.length === 0 ? (
              <p className="text-sm text-slate-600">
                {t("candidate.result.review_default")}
              </p>
            ) : (
              <ul className="space-y-3">
                {latest.recommendations.map((rec) => (
                  <li key={rec.topic_id ?? rec.topic_title}>
                    <p className="text-sm font-medium text-slate-900">
                      {rec.topic_title}
                    </p>
                    {rec.recommendations.length > 0 && (
                      <ul className="mt-1 list-disc space-y-1 pl-5 text-sm text-slate-600">
                        {rec.recommendations.map((text, index) => (
                          <li key={index}>{text}</li>
                        ))}
                      </ul>
                    )}
                  </li>
                ))}
              </ul>
            )}
            <ButtonLink href={`/certification/${accessToken}/attempt`}>
              {t("candidate.retake_assessment")}
            </ButtonLink>
          </CardContent>
        </Card>
      )}

      <Link
        href={`/certification/${accessToken}`}
        className="block text-sm text-slate-500 hover:text-slate-900"
      >
        {t("common.back")}
      </Link>
    </div>
  );
}
