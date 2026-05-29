"use client";

import { useActionState, useMemo, useState } from "react";

import type { Course, Question, Questionnaire } from "@/types/database";
import { emptyFormState } from "@/lib/form";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { FormMessage } from "@/components/ui/form-message";
import { SubmitButton } from "@/components/ui/submit-button";
import { createQuestionnaire, updateQuestionnaire } from "./actions";

type SelectableQuestion = Pick<
  Question,
  "id" | "question_text" | "course_id" | "active"
>;

type Props = {
  courses: Pick<Course, "id" | "title">[];
  questions: SelectableQuestion[];
  questionnaire?: Questionnaire;
  initialQuestionIds?: string[];
};

function truncate(text: string, max = 110) {
  return text.length > max ? `${text.slice(0, max)}…` : text;
}

export function QuestionnaireForm({
  courses,
  questions,
  questionnaire,
  initialQuestionIds,
}: Props) {
  const isEdit = Boolean(questionnaire);
  const [state, formAction] = useActionState(
    isEdit ? updateQuestionnaire : createQuestionnaire,
    emptyFormState,
  );

  const [courseId, setCourseId] = useState(questionnaire?.course_id ?? "");
  const [selectedOrder, setSelectedOrder] = useState<string[]>(
    () => initialQuestionIds ?? [],
  );

  // Questions already linked when the form loaded — these inactive ones may stay
  // selected; newly adding an inactive question is not allowed.
  const initiallySelected = useMemo(
    () => new Set(initialQuestionIds ?? []),
    [initialQuestionIds],
  );

  const courseQuestions = useMemo(
    () => questions.filter((question) => question.course_id === courseId),
    [questions, courseId],
  );
  const questionById = useMemo(
    () => new Map(courseQuestions.map((q) => [q.id, q])),
    [courseQuestions],
  );

  const selectedSet = new Set(selectedOrder);

  function toggle(id: string) {
    setSelectedOrder((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  }

  function move(index: number, direction: -1 | 1) {
    setSelectedOrder((prev) => {
      const next = [...prev];
      const target = index + direction;
      if (target < 0 || target >= next.length) return prev;
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
  }

  return (
    <form action={formAction} className="space-y-5">
      {isEdit && <input type="hidden" name="id" value={questionnaire!.id} />}
      <input type="hidden" name="course_id" value={courseId} />
      <input type="hidden" name="question_ids" value={JSON.stringify(selectedOrder)} />

      <Field label="Title" htmlFor="title" required error={state.fieldErrors?.title}>
        <Input id="title" name="title" defaultValue={questionnaire?.title ?? ""} required maxLength={200} />
      </Field>

      <Field label="Description" htmlFor="description" error={state.fieldErrors?.description}>
        <Textarea id="description" name="description" defaultValue={questionnaire?.description ?? ""} rows={2} />
      </Field>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field
          label="Course"
          htmlFor="course_select"
          required
          error={state.fieldErrors?.course_id}
          hint={isEdit ? "Course can't be changed after creation." : undefined}
        >
          <Select
            id="course_select"
            value={courseId}
            onChange={(event) => {
              setCourseId(event.target.value);
              setSelectedOrder([]);
            }}
            disabled={isEdit}
            required
          >
            <option value="">Select a course…</option>
            {courses.map((course) => (
              <option key={course.id} value={course.id}>
                {course.title}
              </option>
            ))}
          </Select>
        </Field>

        <Field
          label="Passing percentage"
          htmlFor="passing_percentage"
          required
          error={state.fieldErrors?.passing_percentage}
          hint="Default 80%."
        >
          <Input
            id="passing_percentage"
            name="passing_percentage"
            type="number"
            min={0}
            max={100}
            defaultValue={questionnaire?.passing_percentage ?? 80}
            required
          />
        </Field>
      </div>

      <div className="space-y-2">
        <label className="flex items-center gap-2 text-sm text-slate-700">
          <input type="checkbox" name="randomize_question_order" defaultChecked={questionnaire?.randomize_question_order ?? false} className="h-4 w-4 accent-brand-600" />
          Shuffle question order for each attempt
        </label>
        <label className="flex items-center gap-2 text-sm text-slate-700">
          <input type="checkbox" name="randomize_answer_order" defaultChecked={questionnaire?.randomize_answer_order ?? false} className="h-4 w-4 accent-brand-600" />
          Shuffle answer order for each attempt
        </label>
        <label className="flex items-center gap-2 text-sm text-slate-700">
          <input type="checkbox" name="active" defaultChecked={questionnaire?.active ?? true} className="h-4 w-4 accent-brand-600" />
          Active (an active questionnaire needs at least one question)
        </label>
      </div>

      {/* Selected questions, in order */}
      <div className="space-y-2">
        <Label>Selected questions ({selectedOrder.length})</Label>
        {selectedOrder.length === 0 ? (
          <p className="rounded-md border border-dashed border-slate-300 px-3 py-4 text-center text-sm text-slate-500">
            No questions selected yet. Add them from the list below.
          </p>
        ) : (
          <ol className="space-y-1 rounded-md border border-slate-200 p-2">
            {selectedOrder.map((id, index) => {
              const question = questionById.get(id);
              return (
                <li key={id} className="flex items-center gap-2 rounded-md px-2 py-1.5">
                  <span className="w-5 text-right text-xs text-slate-400">{index + 1}.</span>
                  <span className="flex-1 text-sm text-slate-700">
                    {question ? truncate(question.question_text) : "(unknown question)"}
                    {question && !question.active && (
                      <Badge tone="neutral" className="ml-2">Inactive</Badge>
                    )}
                  </span>
                  <Button type="button" variant="ghost" size="sm" onClick={() => move(index, -1)} disabled={index === 0} aria-label="Move up">↑</Button>
                  <Button type="button" variant="ghost" size="sm" onClick={() => move(index, 1)} disabled={index === selectedOrder.length - 1} aria-label="Move down">↓</Button>
                  <Button type="button" variant="ghost" size="sm" onClick={() => toggle(id)} aria-label="Remove">Remove</Button>
                </li>
              );
            })}
          </ol>
        )}
        {state.fieldErrors?.question_ids && (
          <p className="text-xs text-red-600">{state.fieldErrors.question_ids}</p>
        )}
      </div>

      {/* Available questions for the course */}
      <div className="space-y-2">
        <Label>Available questions</Label>
        {!courseId ? (
          <p className="rounded-md border border-dashed border-slate-300 px-3 py-4 text-center text-sm text-slate-500">
            Select a course to choose its questions.
          </p>
        ) : courseQuestions.length === 0 ? (
          <p className="rounded-md border border-dashed border-slate-300 px-3 py-4 text-center text-sm text-slate-500">
            This course has no questions yet.
          </p>
        ) : (
          <ul className="max-h-72 space-y-1 overflow-y-auto rounded-md border border-slate-200 p-2">
            {courseQuestions.map((question) => {
              const checked = selectedSet.has(question.id);
              // Inactive questions can only be selected if they were already
              // linked when the form loaded.
              const locked = !question.active && !initiallySelected.has(question.id);
              return (
                <li key={question.id}>
                  <label
                    className={
                      "flex items-start gap-2 rounded-md px-2 py-1.5 " +
                      (locked ? "cursor-not-allowed opacity-50" : "cursor-pointer hover:bg-slate-50")
                    }
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      disabled={locked}
                      onChange={() => toggle(question.id)}
                      className="mt-1 h-4 w-4 accent-brand-600"
                    />
                    <span className="text-sm text-slate-700">
                      {truncate(question.question_text)}
                      {!question.active && (
                        <Badge tone="neutral" className="ml-2">Inactive</Badge>
                      )}
                    </span>
                  </label>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {state.message && (
        <FormMessage tone={state.ok ? "success" : "error"}>{state.message}</FormMessage>
      )}

      <SubmitButton pendingText="Saving…">
        {isEdit ? "Save questionnaire" : "Create questionnaire"}
      </SubmitButton>
    </form>
  );
}
