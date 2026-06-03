import type { ZodError } from "zod";

/**
 * Shared return type for Server Actions used with `useActionState`.
 *   - `ok`          : true after a successful mutation (when not redirecting).
 *   - `message`     : top-level error/success message.
 *   - `fieldErrors` : per-field validation messages keyed by input name.
 */
export type FormState = {
  ok?: boolean;
  message?: string;
  fieldErrors?: Record<string, string>;
};

export const emptyFormState: FormState = {};

/**
 * Flattens a ZodError to a `{ field: firstMessage }` map for form display.
 *
 * Schema messages are authored as dict keys (e.g. `validation.title_required`).
 * Pass a `translate` (a bound `t` from `getServerT()`) to resolve them to the
 * active language; the dict `t` falls back to the key itself, so any message
 * that isn't a key passes through unchanged.
 */
export function fieldErrorsFromZod(
  error: ZodError,
  translate?: (key: string) => string,
): Record<string, string> {
  const fieldErrors: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = issue.path.join(".") || "form";
    if (!fieldErrors[key]) {
      fieldErrors[key] = translate ? translate(issue.message) : issue.message;
    }
  }
  return fieldErrors;
}
