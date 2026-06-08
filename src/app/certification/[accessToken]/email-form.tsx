"use client";

import { useActionState, useState } from "react";

import { emptyFormState } from "@/lib/form";
import { useT } from "@/lib/i18n/client";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { FormMessage } from "@/components/ui/form-message";
import { SubmitButton } from "@/components/ui/submit-button";
import { submitEmail, verifyEmail } from "./actions";

type Props = { accessToken: string; defaultEmail?: string | null };

/**
 * Two-step candidate email verification. Step 1 collects the email and triggers
 * a one-time code by email; step 2 collects the 6-digit code. The step is
 * derived from the email action's result (no effect, no extra render pass). A
 * successful code redirects server-side into the attempt, so success needs no
 * client handling here.
 */
export function EmailVerificationFlow({ accessToken, defaultEmail }: Props) {
  const t = useT();
  const [emailState, emailAction] = useActionState(submitEmail, emptyFormState);
  const [codeState, codeAction] = useActionState(verifyEmail, emptyFormState);
  const [email, setEmail] = useState(defaultEmail ?? "");

  const codeSent = emailState.ok === true;

  if (!codeSent) {
    return (
      <form action={emailAction} className="space-y-4">
        <input type="hidden" name="access_token" value={accessToken} />

        <Field
          label={t("candidate.email.label")}
          htmlFor="email"
          required
          error={emailState.fieldErrors?.email}
        >
          <Input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            placeholder={t("candidate.email.placeholder")}
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            required
          />
        </Field>

        {emailState.message && <FormMessage>{emailState.message}</FormMessage>}

        <SubmitButton pendingText={t("candidate.email.submitting")}>
          {t("candidate.email.submit")}
        </SubmitButton>
      </form>
    );
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-slate-600">
        {t("candidate.verify.sent_to", { email })}
      </p>

      <form action={codeAction} className="space-y-4">
        <input type="hidden" name="access_token" value={accessToken} />

        <Field
          label={t("candidate.verify.code_label")}
          htmlFor="code"
          required
          error={codeState.fieldErrors?.code}
        >
          <Input
            id="code"
            name="code"
            inputMode="numeric"
            autoComplete="one-time-code"
            pattern="[0-9]*"
            maxLength={6}
            placeholder={t("candidate.verify.code_placeholder")}
            required
          />
        </Field>

        {codeState.message && <FormMessage>{codeState.message}</FormMessage>}

        <SubmitButton pendingText={t("candidate.verify.verifying")}>
          {t("candidate.verify.submit")}
        </SubmitButton>
      </form>

      <div className="flex items-center justify-between text-sm">
        {/* Resend re-runs the email step with the same address (a new code). */}
        <form action={emailAction}>
          <input type="hidden" name="access_token" value={accessToken} />
          <input type="hidden" name="email" value={email} />
          <button type="submit" className="text-brand-700 hover:underline">
            {t("candidate.verify.resend")}
          </button>
        </form>
        <a
          href={`/certification/${accessToken}`}
          className="text-slate-500 hover:underline"
        >
          {t("candidate.verify.change_email")}
        </a>
      </div>
    </div>
  );
}
