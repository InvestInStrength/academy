import "server-only";

/**
 * Minimal structured logger.
 *
 * The platform previously emitted NOTHING — a grep for `console.` across src/
 * returned zero hits — so a Supabase outage, a Resend failure or a render crash
 * all surfaced as a generic localized message with the underlying error thrown
 * away. Production incidents were undiagnosable from Vercel logs.
 *
 * This is deliberately dependency-free and writes JSON to stderr/stdout, which
 * Vercel captures per-invocation. It is also the single seam an error-tracking
 * SDK plugs into later: `reportError()` is the one place that would forward to
 * Sentry, so wiring it up is a change to this file only.
 *
 * NEVER log: access tokens, verification tokens, service-role keys, participant
 * email addresses, answers, or scores. Log IDs and error messages — enough to
 * find the row, not enough to leak the person.
 */

export type LogContext = Record<string, string | number | boolean | null | undefined>;

type Level = "info" | "warn" | "error";

function emit(level: Level, event: string, context?: LogContext, error?: unknown) {
  const line: Record<string, unknown> = {
    level,
    event,
    at: new Date().toISOString(),
    ...context,
  };

  if (error !== undefined) {
    if (error instanceof Error) {
      line.error = error.message;
      line.errorName = error.name;
      // Stacks are noisy in aggregate views but are what actually locates a
      // bug, so keep them on the error channel only.
      if (level === "error" && error.stack) line.stack = error.stack;
    } else if (typeof error === "object" && error !== null && "message" in error) {
      // Supabase returns plain objects: { message, code, details, hint }.
      //
      // `details` is deliberately NOT logged. Postgres fills DETAIL with
      // "Failing row contains (…)" — every column value of the rejected row —
      // for not-null and check violations, and PostgREST forwards it verbatim.
      // That is the one channel where a participant's email address could reach
      // the logs despite every context object here being scrubbed. `code` plus
      // `message` identify the failure class, which is what a responder needs.
      const e = error as { message?: unknown; code?: unknown };
      line.error = String(e.message ?? error);
      if (e.code !== undefined) line.code = String(e.code);
    } else {
      line.error = String(error);
    }
  }

  const serialized = JSON.stringify(line);
  if (level === "error") console.error(serialized);
  else if (level === "warn") console.warn(serialized);
  else console.log(serialized);
}

export const logger = {
  info: (event: string, context?: LogContext) => emit("info", event, context),
  warn: (event: string, context?: LogContext, error?: unknown) =>
    emit("warn", event, context, error),
  error: (event: string, context?: LogContext, error?: unknown) =>
    emit("error", event, context, error),
};

/**
 * Logs a failure and returns a short support reference the UI can show the
 * user. The same reference appears in the log line, so a participant quoting
 * "IIS-K3F9QP" lets an admin find the exact invocation.
 *
 * Reference generation is intentionally not crypto-random: it identifies a log
 * entry, it does not authorize anything.
 */
export function reportError(event: string, error: unknown, context?: LogContext): string {
  const reference = `IIS-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
  emit("error", event, { ...context, reference }, error);
  return reference;
}
