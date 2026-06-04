/**
 * Pure helpers for the persisted attempt-progress answer map.
 *
 * The answer map is a working draft of what the candidate has clicked in the
 * paginated attempt form: `{ [questionId]: optionId[] }`. It is persisted on
 * the in-progress `attempts` row so a reload or connection blip no longer wipes
 * answers, and hydrated back into the form on the next render.
 *
 * This file carries no `server-only` / env-coupled imports so it can be unit
 * tested directly. It is the single sanitizer used on BOTH the write path (an
 * untrusted client posts the map) and the read path (defense in depth before
 * hydrating). The authoritative grading still recomputes correctness from the
 * DB at submit time, so this map only ever round-trips through the same form.
 */

export type AnswerMap = Record<string, string[]>;

/** Bounds — generous enough for any real questionnaire, tight enough to keep a
 * malicious client from stuffing the row. */
export const MAX_QUESTIONS = 500;
export const MAX_OPTIONS_PER_QUESTION = 50;
export const MAX_ID_LENGTH = 100;

function isValidId(value: unknown): value is string {
  return (
    typeof value === "string" &&
    value.length > 0 &&
    value.length <= MAX_ID_LENGTH
  );
}

/**
 * Coerce arbitrary JSON into a well-formed, bounded answer map. Anything that
 * does not fit the `{ [string]: string[] }` shape is dropped rather than
 * rejected — a partial save should never fail because one entry was malformed.
 * Duplicate option ids within a question are de-duped.
 */
export function sanitizeAnswerMap(value: unknown): AnswerMap {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};

  const out: AnswerMap = {};
  let questionCount = 0;

  for (const [questionId, rawOptions] of Object.entries(
    value as Record<string, unknown>,
  )) {
    if (questionCount >= MAX_QUESTIONS) break;
    if (!isValidId(questionId)) continue;
    if (!Array.isArray(rawOptions)) continue;

    const seen = new Set<string>();
    for (const optionId of rawOptions) {
      if (seen.size >= MAX_OPTIONS_PER_QUESTION) break;
      if (!isValidId(optionId)) continue;
      seen.add(optionId);
    }

    // Keep the key even when empty answers were cleared, so hydration mirrors
    // the candidate's current selection exactly (an emptied question stays
    // emptied rather than silently reverting to a prior value).
    out[questionId] = [...seen];
    questionCount += 1;
  }

  return out;
}
