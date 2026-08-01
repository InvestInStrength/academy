import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database, Locale } from "@/types/database";
import { sanitizeAnswerMap, type AnswerMap } from "./attempt-progress-core";

/**
 * Pure core for attempt-lifecycle. Carries no `server-only`, no env-coupled
 * imports — tests can import this file with a hand-rolled fake client.
 *
 * Production callers should use `./attempt-lifecycle.ts` which adds the
 * service-role-client and active-language plumbing.
 */

export type InProgressAttempt = {
  id: string;
  attempt_number: number;
  language: Locale;
  /** Persisted working answer map to hydrate the form on resume. */
  answers: AnswerMap;
};

/** Given a Supabase client + assignment + the active language, finds or
 * creates an in-progress attempt row.
 *
 * Returns the existing row when one is found (its frozen language is
 * preserved). Inserts a new row only when no in-progress row exists for the
 * assignment.
 */
export async function startOrResumeAttemptWith(
  service: SupabaseClient<Database>,
  assignmentId: string,
  currentActiveLanguage: Locale,
): Promise<InProgressAttempt> {
  const findOpenAttempt = async () => {
    const { data } = await service
      .from("attempts")
      .select("id, attempt_number, language, answers")
      .eq("certification_assignment_id", assignmentId)
      .is("submitted_at", null)
      .order("attempt_number", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (!data) return null;
    return {
      id: data.id,
      attempt_number: data.attempt_number,
      language: data.language,
      answers: sanitizeAnswerMap(data.answers),
    };
  };

  const existing = await findOpenAttempt();
  if (existing) return existing;

  const { data: last } = await service
    .from("attempts")
    .select("attempt_number")
    .eq("certification_assignment_id", assignmentId)
    .order("attempt_number", { ascending: false })
    .limit(1)
    .maybeSingle();
  const attemptNumber = (last?.attempt_number ?? 0) + 1;

  const { data: inserted, error } = await service
    .from("attempts")
    .insert({
      certification_assignment_id: assignmentId,
      attempt_number: attemptNumber,
      language: currentActiveLanguage,
    })
    .select("id, attempt_number, language, answers")
    .single();

  if (error || !inserted) {
    // Lost a concurrent attempt-start race (two tabs, double navigation): the
    // winner's row now violates either unique(assignment, attempt_number) or
    // the one-open-attempt index from migration 0008. Resolve by resuming the
    // winner's row instead of 500-ing mid-assessment.
    const winner = await findOpenAttempt();
    if (winner) return winner;
    throw new Error(`Failed to start attempt: ${error?.message ?? "unknown"}`);
  }

  return {
    id: inserted.id,
    attempt_number: inserted.attempt_number,
    language: inserted.language,
    answers: sanitizeAnswerMap(inserted.answers),
  };
}
