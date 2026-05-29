import type { QuestionType } from "@/types/database";

/**
 * Snapshot + scoring types for candidate attempts. Every attempt stores exactly
 * what the candidate saw (text, options, correct answers, order) so admin
 * insight survives later question-bank changes. These shapes are persisted into
 * `attempts.attempt_snapshot`, `attempts.recommendation_snapshot`, and
 * `attempt_answers` JSONB columns.
 */

export type OptionSnapshot = {
  id: string;
  option_text: string;
  is_correct: boolean;
};

/** One question as presented to the candidate, plus their selection. */
export type GradableQuestion = {
  question_id: string;
  question_text: string;
  question_type: QuestionType;
  topic_id: string | null;
  topic_title: string | null;
  recommendation_text: string | null;
  /** Options in the order they were displayed. */
  options: OptionSnapshot[];
  /** Option ids the candidate selected. */
  selected_option_ids: string[];
};

export type GradedQuestion = GradableQuestion & {
  correct_option_ids: string[];
  is_correct: boolean;
};

export type TopicRecommendation = {
  topic_id: string | null;
  topic_title: string;
  recommendations: string[];
};

export type AttemptScore = {
  graded: GradedQuestion[];
  total: number;
  correct_count: number;
  wrong_count: number;
  score_percentage: number;
  passed: boolean;
};

function sameSet(a: string[], b: string[]): boolean {
  if (a.length !== b.length) return false;
  const setB = new Set(b);
  return a.every((value) => setB.has(value));
}

function roundTwo(value: number): number {
  return Math.round(value * 100) / 100;
}

/**
 * Grades an attempt. A question is correct when the candidate's selected option
 * set exactly equals the correct option set. Only the total score determines
 * pass/fail (>= passing threshold).
 */
export function gradeAttempt(
  questions: GradableQuestion[],
  passingPercentage: number,
): AttemptScore {
  const graded: GradedQuestion[] = questions.map((question) => {
    const correctOptionIds = question.options
      .filter((option) => option.is_correct)
      .map((option) => option.id);
    return {
      ...question,
      correct_option_ids: correctOptionIds,
      is_correct: sameSet(question.selected_option_ids, correctOptionIds),
    };
  });

  const total = graded.length;
  const correct_count = graded.filter((q) => q.is_correct).length;
  const wrong_count = total - correct_count;
  const score_percentage = total > 0 ? roundTwo((correct_count / total) * 100) : 0;

  return {
    graded,
    total,
    correct_count,
    wrong_count,
    score_percentage,
    passed: score_percentage >= passingPercentage,
  };
}

/**
 * Builds topic-level learning recommendations from the questions answered
 * incorrectly. This is the ONLY guidance a failed candidate sees — never the
 * specific wrong questions or correct answers.
 */
export function buildRecommendations(
  graded: GradedQuestion[],
): TopicRecommendation[] {
  const byTopic = new Map<string, TopicRecommendation>();

  for (const question of graded) {
    if (question.is_correct) continue;
    const key = question.topic_id ?? "__no_topic__";
    const title = question.topic_title ?? "General";
    const existing = byTopic.get(key) ?? {
      topic_id: question.topic_id,
      topic_title: title,
      recommendations: [],
    };
    const text = question.recommendation_text?.trim();
    if (text && !existing.recommendations.includes(text)) {
      existing.recommendations.push(text);
    }
    byTopic.set(key, existing);
  }

  return [...byTopic.values()];
}
