import { describe, expect, it } from "vitest";

import {
  buildRecommendations,
  gradeAttempt,
  type GradableQuestion,
  type GradedQuestion,
} from "./scoring";

let counter = 0;
function makeQuestion(input: {
  type?: "single_choice" | "multiple_choice";
  options: Array<{ id: string; correct: boolean }>;
  selected: string[];
  topicId?: string | null;
  topicTitle?: string | null;
  rec?: string | null;
}): GradableQuestion {
  counter += 1;
  return {
    question_id: `q${counter}`,
    question_text: `Question ${counter}`,
    question_type: input.type ?? "single_choice",
    topic_id: input.topicId ?? null,
    topic_title: input.topicTitle ?? null,
    recommendation_text: input.rec ?? null,
    options: input.options.map((o) => ({
      id: o.id,
      option_text: o.id,
      is_correct: o.correct,
    })),
    selected_option_ids: input.selected,
  };
}

describe("gradeAttempt — single choice", () => {
  it("marks the correct selection as correct (100%, passes)", () => {
    const q = makeQuestion({
      options: [{ id: "a", correct: true }, { id: "b", correct: false }],
      selected: ["a"],
    });
    const result = gradeAttempt([q], 80);
    expect(result.score_percentage).toBe(100);
    expect(result.correct_count).toBe(1);
    expect(result.wrong_count).toBe(0);
    expect(result.passed).toBe(true);
  });

  it("marks a wrong selection as wrong (0%, fails)", () => {
    const q = makeQuestion({
      options: [{ id: "a", correct: true }, { id: "b", correct: false }],
      selected: ["b"],
    });
    const result = gradeAttempt([q], 80);
    expect(result.score_percentage).toBe(0);
    expect(result.passed).toBe(false);
  });

  it("treats an unanswered question as wrong", () => {
    const q = makeQuestion({
      options: [{ id: "a", correct: true }, { id: "b", correct: false }],
      selected: [],
    });
    expect(gradeAttempt([q], 80).graded[0].is_correct).toBe(false);
  });
});

describe("gradeAttempt — multiple choice", () => {
  const opts = [
    { id: "a", correct: true },
    { id: "b", correct: true },
    { id: "c", correct: false },
  ];

  it("is correct only when the selected set exactly equals the correct set", () => {
    const q = makeQuestion({ type: "multiple_choice", options: opts, selected: ["a", "b"] });
    expect(gradeAttempt([q], 80).graded[0].is_correct).toBe(true);
  });

  it("is wrong when a correct option is missing", () => {
    const q = makeQuestion({ type: "multiple_choice", options: opts, selected: ["a"] });
    expect(gradeAttempt([q], 80).graded[0].is_correct).toBe(false);
  });

  it("is wrong when an incorrect option is also selected", () => {
    const q = makeQuestion({ type: "multiple_choice", options: opts, selected: ["a", "b", "c"] });
    expect(gradeAttempt([q], 80).graded[0].is_correct).toBe(false);
  });
});

describe("gradeAttempt — scoring + threshold", () => {
  it("computes the percentage across questions", () => {
    const right = makeQuestion({
      options: [{ id: "a", correct: true }, { id: "b", correct: false }],
      selected: ["a"],
    });
    const wrong = makeQuestion({
      options: [{ id: "a", correct: true }, { id: "b", correct: false }],
      selected: ["b"],
    });
    const result = gradeAttempt([right, wrong], 50);
    expect(result.score_percentage).toBe(50);
    expect(result.passed).toBe(true); // 50 >= 50
  });

  it("fails the same 50% when the threshold is 80", () => {
    const right = makeQuestion({
      options: [{ id: "a", correct: true }, { id: "b", correct: false }],
      selected: ["a"],
    });
    const wrong = makeQuestion({
      options: [{ id: "a", correct: true }, { id: "b", correct: false }],
      selected: ["b"],
    });
    expect(gradeAttempt([right, wrong], 80).passed).toBe(false);
  });

  it("passes when the score exactly equals the threshold", () => {
    const questions = Array.from({ length: 5 }, (_, i) =>
      makeQuestion({
        options: [{ id: "a", correct: true }, { id: "b", correct: false }],
        selected: i < 4 ? ["a"] : ["b"], // 4/5 = 80%
      }),
    );
    const result = gradeAttempt(questions, 80);
    expect(result.score_percentage).toBe(80);
    expect(result.passed).toBe(true);
  });

  it("handles an empty questionnaire without dividing by zero", () => {
    const result = gradeAttempt([], 80);
    expect(result.total).toBe(0);
    expect(result.score_percentage).toBe(0);
    expect(result.passed).toBe(false);
  });
});

describe("buildRecommendations", () => {
  it("groups wrong questions by topic, dedups text, and excludes correct ones", () => {
    const graded: GradedQuestion[] = gradeAttempt(
      [
        makeQuestion({
          options: [{ id: "a", correct: true }, { id: "b", correct: false }],
          selected: ["b"],
          topicId: "t1",
          topicTitle: "Recovery",
          rec: "Review recovery basics.",
        }),
        makeQuestion({
          options: [{ id: "a", correct: true }, { id: "b", correct: false }],
          selected: ["b"],
          topicId: "t1",
          topicTitle: "Recovery",
          rec: "Review recovery basics.", // duplicate text -> deduped
        }),
        makeQuestion({
          options: [{ id: "a", correct: true }, { id: "b", correct: false }],
          selected: ["a"], // correct -> excluded
          topicId: "t2",
          topicTitle: "Programming",
          rec: "Should not appear.",
        }),
      ],
      80,
    ).graded;

    const recs = buildRecommendations(graded);
    expect(recs).toHaveLength(1);
    expect(recs[0].topic_title).toBe("Recovery");
    expect(recs[0].recommendations).toEqual(["Review recovery basics."]);
  });

  it("labels questions without a topic as 'General'", () => {
    const graded = gradeAttempt(
      [
        makeQuestion({
          options: [{ id: "a", correct: true }, { id: "b", correct: false }],
          selected: ["b"],
          topicId: null,
          rec: "Study the fundamentals.",
        }),
      ],
      80,
    ).graded;
    const recs = buildRecommendations(graded);
    expect(recs[0].topic_title).toBe("General");
    expect(recs[0].recommendations).toEqual(["Study the fundamentals."]);
  });
});
