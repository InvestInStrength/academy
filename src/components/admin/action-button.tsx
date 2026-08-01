"use client";

import { type FormEvent, useActionState } from "react";

import { emptyFormState, type FormState } from "@/lib/form";
import { SubmitButton } from "@/components/ui/submit-button";
import { FormMessage } from "@/components/ui/form-message";

type Variant = "primary" | "secondary" | "outline" | "ghost" | "danger";

type Props = {
  /**
   * A Server Action returning a `FormState`.
   *
   * Return `{ ok: true }` with NO message for the ordinary success path — these
   * buttons fire constantly (toggle active, resend, regenerate) and a
   * confirmation banner after every click is noise. Return a `message` only
   * when the admin needs to know something: a failure, or a refusal such as
   * "another active assignment already exists for this pair".
   */
  action: (prevState: FormState, formData: FormData) => Promise<FormState>;
  /** Hidden fields submitted with the action (e.g. the row id). */
  hidden?: Record<string, string>;
  /** When set, the user must confirm before the action runs. */
  confirm?: string;
  variant?: Variant;
  size?: "sm" | "md";
  pendingText?: string;
  children: React.ReactNode;
};

/**
 * A single-button form for simple mutations (toggle active, resend, …) with an
 * optional confirmation prompt.
 *
 * These actions used to return `void`, which meant a rejected write looked
 * exactly like a successful one: the page revalidated, the row was unchanged,
 * and the admin was told nothing. A failed invite re-send in particular was
 * indistinguishable from a sent one. The action now reports a `FormState` and
 * any message renders inline beneath the button.
 */
export function ActionButton({
  action,
  hidden = {},
  confirm,
  variant = "outline",
  size = "sm",
  pendingText,
  children,
}: Props) {
  const [state, formAction] = useActionState(action, emptyFormState);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    if (confirm && !window.confirm(confirm)) {
      event.preventDefault();
    }
  }

  return (
    // A div, not a span: this wraps a <form> and FormMessage's <p>, which are
    // flow content and invalid inside phrasing-only <span>. inline-block keeps
    // it usable inside table cells and flex rows exactly as before, and the
    // message only takes space once there is one to show. Mirrors
    // GuardedDeleteButton, which solves the same problem.
    <div className="inline-block align-middle">
      <form action={formAction} onSubmit={handleSubmit} className="inline">
        {Object.entries(hidden).map(([name, value]) => (
          <input key={name} type="hidden" name={name} value={value} />
        ))}
        <SubmitButton variant={variant} size={size} pendingText={pendingText}>
          {children}
        </SubmitButton>
      </form>
      {state.message && (
        <FormMessage tone={state.ok ? "success" : "error"} className="mt-2 block">
          {state.message}
        </FormMessage>
      )}
    </div>
  );
}
