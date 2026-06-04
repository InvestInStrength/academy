import { redirect } from "next/navigation";

import {
  getCandidateContext,
  loadQuestionnaireQuestions,
  localizedQuestionnaireTitle,
  type LoadedQuestion,
} from "@/lib/certification/data";
import { startOrResumeAttempt } from "@/lib/certification/attempt-lifecycle";
import { getDictionary, t } from "@/lib/i18n/dict";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

import { AttemptForm } from "./attempt-form";

export const dynamic = "force-dynamic";

function shuffle<T>(items: T[]): T[] {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

export default async function AttemptPage({
  params,
}: {
  params: Promise<{ accessToken: string }>;
}) {
  const { accessToken } = await params;
  const context = await getCandidateContext(accessToken);

  if (!context || !context.participant.email_confirmed) {
    redirect(`/certification/${accessToken}`);
  }
  if (context.assignment.status === "passed") {
    redirect(`/certification/${accessToken}/result`);
  }

  // Materialize (or resume) the in-progress attempt row. Its language is
  // frozen at this moment and persisted on the row, so the rest of the flow
  // (this render, the submit, the snapshots) speaks one consistent language
  // even if the superadmin flips the global active language mid-flight.
  const attempt = await startOrResumeAttempt(context.assignment.id);
  const dict = getDictionary(attempt.language);
  const tr = (key: string) => t(dict, key);
  const title = localizedQuestionnaireTitle(context.questionnaire, attempt.language);

  const loaded = await loadQuestionnaireQuestions(
    context.questionnaire.id,
    attempt.language,
  );

  if (loaded.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{title}</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-slate-600">{tr("attempt.no_questions")}</p>
        </CardContent>
      </Card>
    );
  }

  // Build the display order for this render (snapshotted on submit).
  const questions: LoadedQuestion[] = context.questionnaire.randomize_question_order
    ? shuffle(loaded)
    : loaded;
  const displayedQuestions = questions.map((question) => ({
    question_id: question.question_id,
    question_text: question.question_text,
    question_type: question.question_type,
    options: (context.questionnaire.randomize_answer_order
      ? shuffle(question.options)
      : question.options
    ).map((option) => ({
      id: option.id,
      option_text: option.option_text,
    })),
  }));

  const questionOrder = displayedQuestions.map((q) => q.question_id);
  const optionOrder: Record<string, string[]> = Object.fromEntries(
    displayedQuestions.map((q) => [q.question_id, q.options.map((o) => o.id)]),
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <AttemptForm
          accessToken={accessToken}
          questions={displayedQuestions}
          questionOrder={questionOrder}
          optionOrder={optionOrder}
          initialAnswers={attempt.answers}
        />
      </CardContent>
    </Card>
  );
}
