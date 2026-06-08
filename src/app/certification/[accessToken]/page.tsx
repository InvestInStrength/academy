import Link from "next/link";

import {
  getCandidateContext,
  getLatestResult,
  localizedQuestionnaireDescription,
  localizedQuestionnaireTitle,
} from "@/lib/certification/data";
import { getServerT } from "@/lib/i18n";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ButtonLink } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { FormMessage } from "@/components/ui/form-message";
import { EmailVerificationFlow } from "./email-form";

export const dynamic = "force-dynamic";

export default async function CertificationHubPage({
  params,
  searchParams,
}: {
  params: Promise<{ accessToken: string }>;
  searchParams: Promise<{ busy?: string }>;
}) {
  const { accessToken } = await params;
  const { busy } = await searchParams;
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

  const { participant, questionnaire, assignment } = context;
  const title = localizedQuestionnaireTitle(questionnaire, locale);
  const description = localizedQuestionnaireDescription(questionnaire, locale);

  if (!participant.email_confirmed) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{t("candidate.welcome", { name: participant.full_name })}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p
            className="text-sm text-slate-600"
            dangerouslySetInnerHTML={{
              __html: t("candidate.assigned_intro", { title }),
            }}
          />
          <EmailVerificationFlow
            accessToken={accessToken}
            defaultEmail={participant.email}
          />
        </CardContent>
      </Card>
    );
  }

  const latest = await getLatestResult(assignment.id);
  const hasPassed = assignment.status === "passed";

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>{title}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-slate-600">
            {t("candidate.candidate_label")}: <strong>{participant.full_name}</strong>
          </p>
          {description && (
            <p className="text-sm text-slate-600">{description}</p>
          )}
          <p className="text-sm text-slate-500">
            {t("candidate.passing_score", { percent: questionnaire.passing_percentage })}
          </p>

          {busy && (
            <FormMessage>{t("candidate.busy_notice")}</FormMessage>
          )}

          {latest && latest.score_percentage !== null && (
            <div className="flex items-center gap-2 rounded-md bg-slate-50 px-3 py-2 text-sm">
              <span className="text-slate-600">{t("candidate.latest_result_label")}</span>
              <strong className="text-slate-900">{latest.score_percentage}%</strong>
              <Badge tone={latest.passed ? "success" : "danger"}>
                {latest.passed ? t("common.passed") : t("common.not_passed")}
              </Badge>
              <Link
                href={`/certification/${accessToken}/result`}
                className="ml-auto text-brand-700 hover:underline"
              >
                {t("candidate.view_result")}
              </Link>
            </div>
          )}

          <div className="pt-2">
            {hasPassed ? (
              <ButtonLink href={`/certification/${accessToken}/result`}>
                {t("candidate.view_your_result")}
              </ButtonLink>
            ) : (
              <ButtonLink href={`/certification/${accessToken}/attempt`}>
                {latest
                  ? t("candidate.retake_assessment")
                  : t("candidate.start_assessment")}
              </ButtonLink>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
