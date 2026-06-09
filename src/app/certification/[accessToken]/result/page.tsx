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
      {passed ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-6 px-6 py-12 text-center">
            <span
              className="animate-celebrate flex h-20 w-20 items-center justify-center rounded-full bg-green-100 text-green-600 ring-8 ring-green-50"
              aria-hidden
            >
              <svg width="40" height="40" viewBox="0 0 24 24" fill="none">
                <path
                  d="M5 13l4 4L19 7"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </span>

            <div className="space-y-2">
              <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
                {t("candidate.result.congratulations", {
                  name: context.participant.full_name,
                })}
              </h1>
              <p
                className="mx-auto max-w-md text-base leading-relaxed text-slate-600"
                dangerouslySetInnerHTML={{
                  __html: t("candidate.result.passed_body", { title }),
                }}
              />
            </div>

            <div className="inline-flex items-center gap-2 rounded-full bg-green-50 px-4 py-1.5 text-sm font-semibold text-green-800">
              {t("candidate.result.score_stat", {
                percent: latest.score_percentage,
              })}
            </div>

            <ButtonLink
              href={`/certification/${accessToken}/certificate`}
              className="mt-1"
            >
              {t("candidate.result.view_certificate")}
            </ButtonLink>
          </CardContent>
        </Card>
      ) : (
        <>
          <Card>
            <CardHeader>
              <CardTitle>{t("candidate.result.title")}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center gap-3">
                <span className="text-3xl font-bold text-slate-900">
                  {latest.score_percentage}%
                </span>
                <Badge tone="danger">{t("common.not_passed")}</Badge>
              </div>
              <p className="text-sm text-slate-600">
                {t("candidate.result.passing_line", {
                  percent: context.questionnaire.passing_percentage,
                })}
              </p>
            </CardContent>
          </Card>

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
        </>
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
