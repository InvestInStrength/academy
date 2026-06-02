"use client";

import { useState } from "react";

import { useT } from "@/lib/i18n/client";
import { Button } from "@/components/ui/button";
import { SubmitButton } from "@/components/ui/submit-button";
import { submitAttempt } from "../actions";

type DisplayedOption = { id: string; option_text: string };

type DisplayedQuestion = {
  question_id: string;
  question_text: string;
  question_type: "single_choice" | "multiple_choice";
  options: DisplayedOption[];
};

type Props = {
  accessToken: string;
  questions: DisplayedQuestion[];
  questionOrder: string[];
  optionOrder: Record<string, string[]>;
};

/**
 * Paginated attempt form. Shows one question per page with a progress bar at
 * the top (no text — just the bar). State is held client-side; on final
 * submit, all selected option IDs are emitted as hidden inputs so the
 * existing `submitAttempt` server action sees exactly the same FormData
 * shape it has always seen.
 */
export function AttemptForm({
  accessToken,
  questions,
  questionOrder,
  optionOrder,
}: Props) {
  const t = useT();
  const [index, setIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string[]>>({});

  const total = questions.length;
  const q = questions[index];
  const isMulti = q.question_type === "multiple_choice";
  const isFirst = index === 0;
  const isLast = index === total - 1;
  const selectedForQ = answers[q.question_id] ?? [];
  const progressPct = ((index + 1) / total) * 100;

  function toggle(optionId: string) {
    setAnswers((prev) => {
      const current = prev[q.question_id] ?? [];
      if (isMulti) {
        const next = current.includes(optionId)
          ? current.filter((id) => id !== optionId)
          : [...current, optionId];
        return { ...prev, [q.question_id]: next };
      }
      return { ...prev, [q.question_id]: [optionId] };
    });
  }

  return (
    <form action={submitAttempt} className="space-y-6">
      <input type="hidden" name="access_token" value={accessToken} />
      <input
        type="hidden"
        name="question_order"
        value={JSON.stringify(questionOrder)}
      />
      <input
        type="hidden"
        name="option_order"
        value={JSON.stringify(optionOrder)}
      />

      {/* Hidden answers across ALL questions, emitted from state. The form
        * submits this exact set on the final click; intermediate Next clicks
        * never trigger a submission. */}
      {Object.entries(answers).flatMap(([qid, opts]) =>
        opts.map((optId) => (
          <input
            key={`${qid}-${optId}`}
            type="hidden"
            name={`q_${qid}`}
            value={optId}
          />
        )),
      )}

      {/* Progress bar — no text, just the bar. */}
      <div
        className="h-1.5 w-full overflow-hidden rounded-full bg-slate-200"
        role="progressbar"
        aria-valuenow={index + 1}
        aria-valuemin={1}
        aria-valuemax={total}
      >
        <div
          className="h-full bg-brand-600 transition-all duration-300 ease-out"
          style={{ width: `${progressPct}%` }}
          aria-hidden
        />
      </div>

      <fieldset className="space-y-4">
        <legend className="text-base font-medium text-slate-900">
          {index + 1}. {q.question_text}
          {isMulti && (
            <span className="ml-2 text-xs font-normal text-slate-400">
              {t("attempt.multiple_choice_hint")}
            </span>
          )}
        </legend>
        <div className="space-y-2">
          {q.options.map((option) => {
            const checked = selectedForQ.includes(option.id);
            return (
              <label
                key={option.id}
                className="flex cursor-pointer items-start gap-3 rounded-md border border-slate-200 px-4 py-3 text-sm text-slate-700 hover:bg-slate-50"
              >
                <input
                  type={isMulti ? "checkbox" : "radio"}
                  name={isMulti ? undefined : `display-${q.question_id}`}
                  checked={checked}
                  onChange={() => toggle(option.id)}
                  className="mt-0.5 h-5 w-5 shrink-0 accent-brand-600"
                />
                <span>{option.option_text}</span>
              </label>
            );
          })}
        </div>
      </fieldset>

      <div className="flex items-center justify-between gap-3">
        <Button
          type="button"
          variant="ghost"
          disabled={isFirst}
          onClick={() => setIndex((i) => Math.max(0, i - 1))}
        >
          {t("attempt.previous_question")}
        </Button>
        {isLast ? (
          <SubmitButton pendingText={t("attempt.submitting")}>
            {t("attempt.submit")}
          </SubmitButton>
        ) : (
          <Button
            type="button"
            onClick={() => setIndex((i) => Math.min(total - 1, i + 1))}
          >
            {t("attempt.next_question")}
          </Button>
        )}
      </div>
    </form>
  );
}
