import { describe, expect, it } from "vitest";

import { courseSchema } from "@/app/(dashboard)/admin/courses/schema";
import { questionSchema } from "@/app/(dashboard)/admin/questions/schema";
import { questionnaireSchema } from "@/app/(dashboard)/admin/questionnaires/schema";

const UUID = "11111111-1111-1111-1111-111111111111";

describe("courseSchema", () => {
  it("accepts a valid course", () => {
    expect(courseSchema.safeParse({ title: "Course", active: true }).success).toBe(true);
  });

  it("rejects an empty title", () => {
    expect(courseSchema.safeParse({ title: "  ", active: true }).success).toBe(false);
  });
});

describe("questionnaireSchema", () => {
  const base = {
    course_id: UUID,
    title: "Assessment",
    passing_percentage: 80,
    randomize_question_order: false,
    randomize_answer_order: false,
    active: true,
    question_ids: [] as string[],
  };

  it("requires at least one question when active", () => {
    expect(questionnaireSchema.safeParse(base).success).toBe(false);
  });

  it("allows zero questions when inactive (draft)", () => {
    expect(questionnaireSchema.safeParse({ ...base, active: false }).success).toBe(true);
  });

  it("accepts an active questionnaire with questions", () => {
    expect(
      questionnaireSchema.safeParse({ ...base, question_ids: [UUID] }).success,
    ).toBe(true);
  });
});

describe("questionSchema", () => {
  const base = {
    course_id: UUID,
    topic_id: null,
    question_text: "Question?",
    question_type: "single_choice" as const,
    active: true,
    options: [
      { option_text: "a", is_correct: true },
      { option_text: "b", is_correct: false },
    ],
  };

  it("accepts a valid single-choice question", () => {
    expect(questionSchema.safeParse(base).success).toBe(true);
  });

  it("rejects fewer than two options", () => {
    expect(
      questionSchema.safeParse({ ...base, options: [{ option_text: "a", is_correct: true }] }).success,
    ).toBe(false);
  });

  it("rejects when no option is marked correct", () => {
    expect(
      questionSchema.safeParse({
        ...base,
        options: [
          { option_text: "a", is_correct: false },
          { option_text: "b", is_correct: false },
        ],
      }).success,
    ).toBe(false);
  });

  it("rejects a single-choice question with two correct options", () => {
    expect(
      questionSchema.safeParse({
        ...base,
        options: [
          { option_text: "a", is_correct: true },
          { option_text: "b", is_correct: true },
        ],
      }).success,
    ).toBe(false);
  });

  it("accepts a multiple-choice question with two correct options", () => {
    expect(
      questionSchema.safeParse({
        ...base,
        question_type: "multiple_choice",
        options: [
          { option_text: "a", is_correct: true },
          { option_text: "b", is_correct: true },
        ],
      }).success,
    ).toBe(true);
  });
});
