import { describe, expect, it } from "vitest";

import { courseSchema } from "@/app/(dashboard)/admin/courses/schema";
import { questionSchema } from "@/app/(dashboard)/admin/questions/schema";
import { questionnaireSchema } from "@/app/(dashboard)/admin/questionnaires/schema";

const UUID = "11111111-1111-1111-1111-111111111111";

describe("courseSchema", () => {
  const course = { kind: "course" as const, title: "Course", active: true };

  it("accepts a valid course", () => {
    expect(courseSchema.safeParse(course).success).toBe(true);
  });

  it("rejects an empty title", () => {
    expect(courseSchema.safeParse({ ...course, title: "  " }).success).toBe(false);
  });

  it("rejects an unknown kind", () => {
    expect(courseSchema.safeParse({ ...course, kind: "workshop" }).success).toBe(
      false,
    );
  });

  it("accepts a seminar with an event date", () => {
    const parsed = courseSchema.safeParse({
      ...course,
      kind: "seminar",
      event_date: "2026-03-12",
    });
    expect(parsed.success).toBe(true);
  });

  it("treats an empty event date as absent rather than invalid", () => {
    // An untouched `<input type="date">` posts "", which must not fail
    // validation — the action stores null.
    const parsed = courseSchema.safeParse({
      ...course,
      kind: "seminar",
      event_date: "",
    });
    expect(parsed.success).toBe(true);
    expect(parsed.success && parsed.data.event_date).toBeUndefined();
  });

  it("rejects a malformed event date", () => {
    expect(
      courseSchema.safeParse({ ...course, kind: "seminar", event_date: "12.03.2026" })
        .success,
    ).toBe(false);
  });

  it("rejects a certificate template id that is not a uuid", () => {
    expect(
      courseSchema.safeParse({ ...course, certificate_template_id: "nope" }).success,
    ).toBe(false);
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
