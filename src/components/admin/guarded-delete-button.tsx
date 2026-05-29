"use client";

import { type FormEvent, useActionState } from "react";

import { emptyFormState, type FormState } from "@/lib/form";
import { SubmitButton } from "@/components/ui/submit-button";
import { FormMessage } from "@/components/ui/form-message";

type Props = {
  /** Delete action that returns a FormState (a message when the delete is
   * blocked because the record is still in use) or redirects on success. */
  action: (prevState: FormState, formData: FormData) => Promise<FormState>;
  hidden?: Record<string, string>;
  confirm?: string;
  children: React.ReactNode;
};

/** Delete button for detail pages. Shows the action's blocking message inline
 * instead of failing silently — the normal way to remove content is to
 * deactivate it; hard delete only succeeds for unused records. */
export function GuardedDeleteButton({
  action,
  hidden = {},
  confirm,
  children,
}: Props) {
  const [state, formAction] = useActionState(action, emptyFormState);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    if (confirm && !window.confirm(confirm)) {
      event.preventDefault();
    }
  }

  return (
    <div className="space-y-2">
      <form action={formAction} onSubmit={handleSubmit}>
        {Object.entries(hidden).map(([name, value]) => (
          <input key={name} type="hidden" name={name} value={value} />
        ))}
        <SubmitButton variant="danger" pendingText="Deleting…">
          {children}
        </SubmitButton>
      </form>
      {state.message && <FormMessage>{state.message}</FormMessage>}
    </div>
  );
}
