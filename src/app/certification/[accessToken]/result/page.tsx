import Link from "next/link";
import { redirect } from "next/navigation";

import { getCandidateContext, getLatestResult } from "@/lib/certification/data";
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

  if (!context) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Link unavailable</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-slate-600">
            This certification link isn&apos;t available.
          </p>
        </CardContent>
      </Card>
    );
  }
  if (!context.participant.email_confirmed) {
    redirect(`/certification/${accessToken}`);
  }

  const latest = await getLatestResult(context.assignment.id);

  if (!latest || latest.score_percentage === null) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{context.questionnaire.title}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-slate-600">
            You haven&apos;t completed an attempt yet.
          </p>
          <ButtonLink href={`/certification/${accessToken}/attempt`}>
            Start assessment
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
          <CardTitle>Your result</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center gap-3">
            <span className="text-3xl font-bold text-slate-900">
              {latest.score_percentage}%
            </span>
            <Badge tone={passed ? "success" : "danger"}>
              {passed ? "Passed" : "Not passed"}
            </Badge>
          </div>
          <p className="text-sm text-slate-600">
            Passing score: {context.questionnaire.passing_percentage}%.
          </p>
        </CardContent>
      </Card>

      {passed ? (
        <Card>
          <CardHeader>
            <CardTitle>Congratulations, {context.participant.full_name}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-slate-600">
              You passed the <strong>{context.questionnaire.title}</strong>{" "}
              assessment.
            </p>
            <ButtonLink href={`/certification/${accessToken}/certificate`}>
              View your certificate
            </ButtonLink>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>Where to focus next</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {latest.recommendations.length === 0 ? (
              <p className="text-sm text-slate-600">
                Review the course material and try again.
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
              Retake assessment
            </ButtonLink>
          </CardContent>
        </Card>
      )}

      <Link
        href={`/certification/${accessToken}`}
        className="block text-sm text-slate-500 hover:text-slate-900"
      >
        ← Back
      </Link>
    </div>
  );
}
