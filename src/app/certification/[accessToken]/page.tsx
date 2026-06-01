import Link from "next/link";

import {
  getCandidateContext,
  getLatestResult,
  localizedQuestionnaireDescription,
  localizedQuestionnaireTitle,
} from "@/lib/certification/data";
import { getActiveLanguage } from "@/lib/i18n";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ButtonLink } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { FormMessage } from "@/components/ui/form-message";
import { EmailForm } from "./email-form";

export const dynamic = "force-dynamic";

function NeutralNotice() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Link unavailable</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-slate-600">
          This certification link isn&apos;t available. It may be incorrect or no
          longer active. Please check with whoever issued it.
        </p>
      </CardContent>
    </Card>
  );
}

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

  if (!context) return <NeutralNotice />;

  const { participant, questionnaire, assignment } = context;
  const locale = await getActiveLanguage();
  const title = localizedQuestionnaireTitle(questionnaire, locale);
  const description = localizedQuestionnaireDescription(questionnaire, locale);

  if (!participant.email_confirmed) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Welcome, {participant.full_name}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-slate-600">
            You&apos;ve been assigned the <strong>{title}</strong>{" "}
            assessment. Enter your email to begin.
          </p>
          <EmailForm accessToken={accessToken} defaultEmail={participant.email} />
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
            Candidate: <strong>{participant.full_name}</strong>
          </p>
          {description && (
            <p className="text-sm text-slate-600">{description}</p>
          )}
          <p className="text-sm text-slate-500">
            Passing score: {questionnaire.passing_percentage}%. You can retake the
            assessment as many times as needed until you pass.
          </p>

          {busy && (
            <FormMessage>
              You&apos;re going a little fast — please wait a moment and try again.
            </FormMessage>
          )}

          {latest && latest.score_percentage !== null && (
            <div className="flex items-center gap-2 rounded-md bg-slate-50 px-3 py-2 text-sm">
              <span className="text-slate-600">Latest result:</span>
              <strong className="text-slate-900">{latest.score_percentage}%</strong>
              <Badge tone={latest.passed ? "success" : "danger"}>
                {latest.passed ? "Passed" : "Not passed"}
              </Badge>
              <Link
                href={`/certification/${accessToken}/result`}
                className="ml-auto text-brand-700 hover:underline"
              >
                View result
              </Link>
            </div>
          )}

          <div className="pt-2">
            {hasPassed ? (
              <ButtonLink href={`/certification/${accessToken}/result`}>
                View your result
              </ButtonLink>
            ) : (
              <ButtonLink href={`/certification/${accessToken}/attempt`}>
                {latest ? "Retake assessment" : "Start assessment"}
              </ButtonLink>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
