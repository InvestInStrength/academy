"use client";

import { useActionState, useMemo, useState } from "react";

import type {
  Course,
  CourseTopic,
  Question,
  QuestionOption,
  QuestionType,
} from "@/types/database";
import { emptyFormState } from "@/lib/form";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { FormMessage } from "@/components/ui/form-message";
import { SubmitButton } from "@/components/ui/submit-button";
import { createQuestion, updateQuestion } from "./actions";

type OptionRow = {
  key: string;
  option_text: string;
  option_text_en: string;
  is_correct: boolean;
};

type Props = {
  courses: Pick<Course, "id" | "title">[];
  topics: Pick<CourseTopic, "id" | "title" | "course_id">[];
  question?: Question;
  initialOptions?: QuestionOption[];
  showEnglish?: boolean;
};

let optionKeySeed = 0;
function newOption(): OptionRow {
  optionKeySeed += 1;
  return {
    key: `opt-${optionKeySeed}`,
    option_text: "",
    option_text_en: "",
    is_correct: false,
  };
}

export function QuestionForm({
  courses,
  topics,
  question,
  initialOptions,
  showEnglish = false,
}: Props) {
  const isEdit = Boolean(question);
  const [state, formAction] = useActionState(
    isEdit ? updateQuestion : createQuestion,
    emptyFormState,
  );

  const [courseId, setCourseId] = useState(question?.course_id ?? "");
  const [topicId, setTopicId] = useState(question?.topic_id ?? "");
  const [questionType, setQuestionType] = useState<QuestionType>(
    question?.question_type ?? "single_choice",
  );
  const [options, setOptions] = useState<OptionRow[]>(() => {
    if (initialOptions && initialOptions.length > 0) {
      return [...initialOptions]
        .sort((a, b) => a.sort_order - b.sort_order)
        .map((option) => ({
          key: option.id,
          option_text: option.option_text,
          option_text_en: option.option_text_en ?? "",
          is_correct: option.is_correct,
        }));
    }
    return [newOption(), newOption()];
  });

  const availableTopics = useMemo(
    () => topics.filter((topic) => topic.course_id === courseId),
    [topics, courseId],
  );

  function setOptionText(key: string, value: string) {
    setOptions((prev) =>
      prev.map((option) =>
        option.key === key ? { ...option, option_text: value } : option,
      ),
    );
  }

  function setOptionTextEn(key: string, value: string) {
    setOptions((prev) =>
      prev.map((option) =>
        option.key === key ? { ...option, option_text_en: value } : option,
      ),
    );
  }

  function setCorrect(key: string) {
    setOptions((prev) =>
      prev.map((option) => {
        if (questionType === "single_choice") {
          return { ...option, is_correct: option.key === key };
        }
        return option.key === key
          ? { ...option, is_correct: !option.is_correct }
          : option;
      }),
    );
  }

  function addOption() {
    setOptions((prev) => [...prev, newOption()]);
  }

  function removeOption(key: string) {
    setOptions((prev) =>
      prev.length <= 2 ? prev : prev.filter((option) => option.key !== key),
    );
  }

  function onTypeChange(value: QuestionType) {
    setQuestionType(value);
    if (value === "single_choice") {
      let seenCorrect = false;
      setOptions((prev) =>
        prev.map((option) => {
          if (option.is_correct && !seenCorrect) {
            seenCorrect = true;
            return option;
          }
          return { ...option, is_correct: false };
        }),
      );
    }
  }

  const serializedOptions = JSON.stringify(
    options.map(({ option_text, option_text_en, is_correct }) => ({
      option_text,
      option_text_en: option_text_en || undefined,
      is_correct,
    })),
  );

  return (
    <form action={formAction} className="space-y-5">
      {isEdit && <input type="hidden" name="id" value={question!.id} />}
      <input type="hidden" name="options" value={serializedOptions} />

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Course" htmlFor="course_id" required error={state.fieldErrors?.course_id}>
          <Select
            id="course_id"
            name="course_id"
            value={courseId}
            onChange={(event) => {
              setCourseId(event.target.value);
              setTopicId("");
            }}
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

        <Field label="Topic" htmlFor="topic_id" hint="Optional — drives learning recommendations." error={state.fieldErrors?.topic_id}>
          <Select
            id="topic_id"
            name="topic_id"
            value={topicId}
            onChange={(event) => setTopicId(event.target.value)}
            disabled={!courseId}
          >
            <option value="">No topic</option>
            {availableTopics.map((topic) => (
              <option key={topic.id} value={topic.id}>
                {topic.title}
              </option>
            ))}
          </Select>
        </Field>
      </div>

      <Field
        label={showEnglish ? "Question (Deutsch)" : "Question"}
        htmlFor="question_text"
        required
        error={state.fieldErrors?.question_text}
      >
        <Textarea
          id="question_text"
          name="question_text"
          defaultValue={question?.question_text ?? ""}
          rows={3}
          required
        />
      </Field>

      {showEnglish && (
        <Field
          label="Question (English)"
          htmlFor="question_text_en"
          error={state.fieldErrors?.question_text_en}
        >
          <Textarea
            id="question_text_en"
            name="question_text_en"
            defaultValue={question?.question_text_en ?? ""}
            rows={3}
          />
        </Field>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Answer type" htmlFor="question_type" error={state.fieldErrors?.question_type}>
          <Select
            id="question_type"
            name="question_type"
            value={questionType}
            onChange={(event) => onTypeChange(event.target.value as QuestionType)}
          >
            <option value="single_choice">Single choice (one correct)</option>
            <option value="multiple_choice">Multiple choice (one or more correct)</option>
          </Select>
        </Field>

        <label className="flex items-end gap-2 pb-2 text-sm text-slate-700">
          <input
            type="checkbox"
            name="active"
            defaultChecked={question?.active ?? true}
            className="h-4 w-4 accent-brand-600"
          />
          Active (available for questionnaires)
        </label>
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label>{showEnglish ? "Answer options (Deutsch + English)" : "Answer options"}</Label>
          <Button type="button" variant="outline" size="sm" onClick={addOption}>
            + Add option
          </Button>
        </div>
        <p className="text-xs text-slate-500">
          {questionType === "single_choice"
            ? "Select the one correct option."
            : "Tick every correct option."}
        </p>

        <div className="space-y-2">
          {options.map((option, index) => {
            const optionError = state.fieldErrors?.[`options.${index}.option_text`];
            return (
              <div key={option.key} className="flex items-start gap-2">
                <label className="mt-2 flex h-9 items-center" title="Mark correct">
                  <input
                    type={questionType === "single_choice" ? "radio" : "checkbox"}
                    name="correct-toggle"
                    checked={option.is_correct}
                    onChange={() => setCorrect(option.key)}
                    className="h-4 w-4 accent-brand-600"
                  />
                </label>
                <div className="flex-1 space-y-1">
                  <Input
                    value={option.option_text}
                    onChange={(event) => setOptionText(option.key, event.target.value)}
                    placeholder={
                      showEnglish ? `Option ${index + 1} (DE)` : `Option ${index + 1}`
                    }
                    aria-label={`Option ${index + 1} text`}
                  />
                  {showEnglish && (
                    <Input
                      value={option.option_text_en}
                      onChange={(event) =>
                        setOptionTextEn(option.key, event.target.value)
                      }
                      placeholder={`Option ${index + 1} (EN)`}
                      aria-label={`Option ${index + 1} text (English)`}
                    />
                  )}
                  {optionError && (
                    <p className="mt-1 text-xs text-red-600">{optionError}</p>
                  )}
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => removeOption(option.key)}
                  disabled={options.length <= 2}
                  aria-label={`Remove option ${index + 1}`}
                >
                  Remove
                </Button>
              </div>
            );
          })}
        </div>
        {state.fieldErrors?.options && (
          <p className="text-xs text-red-600">{state.fieldErrors.options}</p>
        )}
      </div>

      <Field
        label="Explanation"
        htmlFor="explanation"
        hint="Internal note shown in admin attempt insights."
        error={state.fieldErrors?.explanation}
      >
        <Textarea
          id="explanation"
          name="explanation"
          defaultValue={question?.explanation ?? ""}
          rows={2}
        />
      </Field>

      {showEnglish && (
        <Field
          label="Explanation (English)"
          htmlFor="explanation_en"
          error={state.fieldErrors?.explanation_en}
        >
          <Textarea
            id="explanation_en"
            name="explanation_en"
            defaultValue={question?.explanation_en ?? ""}
            rows={2}
          />
        </Field>
      )}

      <Field
        label={showEnglish ? "Recommendation text (Deutsch)" : "Recommendation text"}
        htmlFor="recommendation_text"
        hint="Shown to candidates who get this topic wrong."
        error={state.fieldErrors?.recommendation_text}
      >
        <Textarea
          id="recommendation_text"
          name="recommendation_text"
          defaultValue={question?.recommendation_text ?? ""}
          rows={2}
        />
      </Field>

      {showEnglish && (
        <Field
          label="Recommendation text (English)"
          htmlFor="recommendation_text_en"
          error={state.fieldErrors?.recommendation_text_en}
        >
          <Textarea
            id="recommendation_text_en"
            name="recommendation_text_en"
            defaultValue={question?.recommendation_text_en ?? ""}
            rows={2}
          />
        </Field>
      )}

      {state.message && (
        <FormMessage tone={state.ok ? "success" : "error"}>
          {state.message}
        </FormMessage>
      )}

      <SubmitButton pendingText="Saving…">
        {isEdit ? "Save question" : "Create question"}
      </SubmitButton>
    </form>
  );
}
