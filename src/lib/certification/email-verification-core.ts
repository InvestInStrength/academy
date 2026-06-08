import { createHash, randomInt } from "node:crypto";

/**
 * Pure helpers for candidate email verification (one-time 6-digit codes). No
 * `server-only`, no DB, no env, so the logic is unit-testable directly. The DB
 * read/write lives in `data.ts`; the email send in `verification-email.ts`.
 *
 * Security shape: codes are short-lived and single-use, capped at MAX_ATTEMPTS
 * guesses per code, and only a SHA-256 hash is ever stored. A 6-digit space is
 * small, so the expiry + attempt cap (not hash strength) are what make guessing
 * impractical; the hash just avoids keeping a live secret at rest.
 */

export const CODE_LENGTH = 6;
export const CODE_TTL_MS = 10 * 60 * 1000; // 10 minutes
export const MAX_ATTEMPTS = 5;

/** Minutes a freshly issued code stays valid (for user-facing copy). */
export const CODE_TTL_MINUTES = Math.round(CODE_TTL_MS / 60_000);

/** Cryptographically-random zero-padded 6-digit code, e.g. "008431". */
export function generateCode(): string {
  return String(randomInt(0, 10 ** CODE_LENGTH)).padStart(CODE_LENGTH, "0");
}

/** SHA-256 hex of a code. Deterministic, so it can be compared on verify. */
export function hashCode(code: string): string {
  return createHash("sha256").update(code, "utf8").digest("hex");
}

/** True when `input` is exactly CODE_LENGTH ASCII digits. */
export function isValidCodeFormat(input: string): boolean {
  return new RegExp(`^\\d{${CODE_LENGTH}}$`).test(input);
}

/** Expiry timestamp (ISO) for a code generated at `nowMs`. */
export function codeExpiry(nowMs: number): string {
  return new Date(nowMs + CODE_TTL_MS).toISOString();
}

export type VerifyDecision =
  | { kind: "ok" }
  | { kind: "expired" }
  | { kind: "too_many" }
  | { kind: "invalid"; attemptsRemaining: number };

/**
 * Pure decision for a verification attempt, given the stored row state and the
 * submitted code. `nowMs` is injected so tests are deterministic. A consumed or
 * past-expiry row counts as expired; a row already at the attempt cap counts as
 * too_many; otherwise the code is hashed and compared.
 */
export function evaluateCode(params: {
  submitted: string;
  storedHash: string;
  attempts: number;
  expiresAtMs: number;
  consumed: boolean;
  nowMs: number;
}): VerifyDecision {
  const { submitted, storedHash, attempts, expiresAtMs, consumed, nowMs } = params;
  if (consumed || nowMs >= expiresAtMs) return { kind: "expired" };
  if (attempts >= MAX_ATTEMPTS) return { kind: "too_many" };
  if (hashCode(submitted) === storedHash) return { kind: "ok" };
  return { kind: "invalid", attemptsRemaining: Math.max(0, MAX_ATTEMPTS - (attempts + 1)) };
}
