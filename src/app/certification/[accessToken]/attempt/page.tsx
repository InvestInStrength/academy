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
import { SubmitButton } from "@/components/ui/submit-button";
import { submitAttempt } from "../actions";

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
    ...question,
    options: context.questionnaire.randomize_answer_order
      ? shuffle(question.options)
      : question.options,
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
        <form action={submitAttempt} className="space-y-6">
          <input type="hidden" name="access_token" value={accessToken} />
          <input type="hidden" name="question_order" value={JSON.stringify(questionOrder)} />
          <input type="hidden" name="option_order" value={JSON.stringify(optionOrder)} />

          {displayedQuestions.map((question, index) => {
            const inputType =
              question.question_type === "single_choice" ? "radio" : "checkbox";
            return (
              <fieldset key={question.question_id} className="space-y-2">
                <legend className="text-sm font-medium text-slate-900">
                  {index + 1}. {question.question_text}
                  {question.question_type === "multiple_choice" && (
                    <span className="ml-1 text-xs font-normal text-slate-400">
                      {tr("attempt.multiple_choice_hint")}
                    </span>
                  )}
                </legend>
                <div className="space-y-1.5">
                  {question.options.map((option) => (
                    <label
                      key={option.id}
                      className="flex cursor-pointer items-start gap-2 rounded-md border border-slate-200 px-3 py-2 text-sm text-slate-700 hover:bg-slate-50"
                    >
                      <input
                        type={inputType}
                        name={`q_${question.question_id}`}
                        value={option.id}
                        className="mt-0.5 h-4 w-4 accent-brand-600"
                      />
                      <span>{option.option_text}</span>
                    </label>
                  ))}
                </div>
              </fieldset>
            );
          })}

          <SubmitButton pendingText={tr("attempt.submitting")}>
            {tr("attempt.submit")}
          </SubmitButton>
        </form>
      </CardContent>
    </Card>
  );
}
