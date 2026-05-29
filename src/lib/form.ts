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

/** Flattens a ZodError to a `{ field: firstMessage }` map for form display. */
export function fieldErrorsFromZod(error: ZodError): Record<string, string> {
  const fieldErrors: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = issue.path.join(".") || "form";
    if (!fieldErrors[key]) {
      fieldErrors[key] = issue.message;
    }
  }
  return fieldErrors;
}
