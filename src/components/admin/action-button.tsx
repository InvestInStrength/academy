"use client";

import type { FormEvent } from "react";

import { SubmitButton } from "@/components/ui/submit-button";

type Variant = "primary" | "secondary" | "outline" | "ghost" | "danger";

type Props = {
  /** A Server Action with signature (formData) => Promise<void>. */
  action: (formData: FormData) => Promise<void>;
  /** Hidden fields submitted with the action (e.g. the row id). */
  hidden?: Record<string, string>;
  /** When set, the user must confirm before the action runs. */
  confirm?: string;
  variant?: Variant;
  size?: "sm" | "md";
  pendingText?: string;
  children: React.ReactNode;
};

/** A single-button form for simple mutations (toggle active, delete, …) with
 * an optional confirmation prompt. */
export function ActionButton({
  action,
  hidden = {},
  confirm,
  variant = "outline",
  size = "sm",
  pendingText,
  children,
}: Props) {
  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    if (confirm && !window.confirm(confirm)) {
      event.preventDefault();
    }
  }

  return (
    <form action={action} onSubmit={handleSubmit} className="inline">
      {Object.entries(hidden).map(([name, value]) => (
        <input key={name} type="hidden" name={name} value={value} />
      ))}
      <SubmitButton variant={variant} size={size} pendingText={pendingText}>
        {children}
      </SubmitButton>
    </form>
  );
}
