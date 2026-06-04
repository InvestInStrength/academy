import "server-only";

import { getActiveLanguage } from "@/lib/i18n";
import { createSupabaseServiceRoleClient } from "@/lib/supabase/service";

import {
  startOrResumeAttemptWith,
  type InProgressAttempt,
} from "./attempt-lifecycle-core";
import { sanitizeAnswerMap } from "./attempt-progress-core";

/**
 * Attempt lifecycle — Slice 7a.
 *
 * The legacy candidate flow only inserted an `attempts` row at submit time,
 * which left no place to freeze a language. This module materializes an
 * "in-progress" `attempts` row the moment the candidate lands on the attempt
 * page. The row's `language` is captured from `platform_settings.active_language`
 * at that instant and pinned for the life of the attempt — mid-flight platform
 * toggles do not change it (locked decision L4).
 *
 * Resume rule: while a row exists with `submitted_at IS NULL` for the
 * assignment, every `startOrResumeAttempt` call returns that same row. Once
 * the row is submitted, the next call creates a new row with the
 * then-current active language.
 *
 * The pure orchestration lives in `./attempt-lifecycle-core.ts` so tests can
 * exercise it without env vars / `server-only`.
 */

export { startOrResumeAttemptWith, type InProgressAttempt };

/** Production caller: spins up its own service-role client and resolves the
 * live active language. */
export async function startOrResumeAttempt(
  assignmentId: string,
): Promise<InProgressAttempt> {
  const service = createSupabaseServiceRoleClient();
  const currentActiveLanguage = await getActiveLanguage();
  return startOrResumeAttemptWith(service, assignmentId, currentActiveLanguage);
}

/** Lookup-only: returns the current in-progress attempt for an assignment, or
 * null if none exists. Never creates. */
export async function getInProgressAttempt(
  assignmentId: string,
): Promise<InProgressAttempt | null> {
  const service = createSupabaseServiceRoleClient();
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
}
