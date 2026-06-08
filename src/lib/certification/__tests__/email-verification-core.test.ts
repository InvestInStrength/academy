import { describe, expect, it } from "vitest";

import {
  CODE_LENGTH,
  CODE_TTL_MS,
  MAX_ATTEMPTS,
  codeExpiry,
  evaluateCode,
  generateCode,
  hashCode,
  isValidCodeFormat,
} from "../email-verification-core";

describe("generateCode", () => {
  it("returns a zero-padded 6-digit numeric string", () => {
    for (let i = 0; i < 50; i++) {
      const code = generateCode();
      expect(code).toHaveLength(CODE_LENGTH);
      expect(code).toMatch(/^\d{6}$/);
    }
  });
});

describe("hashCode", () => {
  it("is deterministic and 64 hex chars (sha-256)", () => {
    expect(hashCode("123456")).toBe(hashCode("123456"));
    expect(hashCode("123456")).toMatch(/^[0-9a-f]{64}$/);
  });

  it("differs for different inputs and never embeds the plaintext", () => {
    expect(hashCode("123456")).not.toBe(hashCode("123457"));
    expect(hashCode("123456")).not.toContain("123456");
  });
});

describe("isValidCodeFormat", () => {
  it.each([
    ["123456", true],
    ["000000", true],
    ["12345", false],
    ["1234567", false],
    ["12a456", false],
    ["", false],
    [" 123456", false],
  ])("(%s) -> %s", (input, expected) => {
    expect(isValidCodeFormat(input)).toBe(expected);
  });
});

describe("codeExpiry", () => {
  it("is CODE_TTL_MS after the given instant", () => {
    const now = 1_700_000_000_000;
    expect(new Date(codeExpiry(now)).getTime()).toBe(now + CODE_TTL_MS);
  });
});

describe("evaluateCode", () => {
  const base = {
    submitted: "123456",
    storedHash: hashCode("123456"),
    attempts: 0,
    expiresAtMs: 2_000,
    consumed: false,
    nowMs: 1_000,
  };

  it("accepts a matching code that is fresh and unconsumed", () => {
    expect(evaluateCode(base)).toEqual({ kind: "ok" });
  });

  it("treats a consumed row as expired", () => {
    expect(evaluateCode({ ...base, consumed: true })).toEqual({ kind: "expired" });
  });

  it("treats a past-expiry row as expired", () => {
    expect(evaluateCode({ ...base, nowMs: 3_000 })).toEqual({ kind: "expired" });
  });

  it("rejects once the attempt cap is reached", () => {
    expect(evaluateCode({ ...base, attempts: MAX_ATTEMPTS })).toEqual({
      kind: "too_many",
    });
  });

  it("returns invalid with remaining attempts for a wrong code", () => {
    expect(evaluateCode({ ...base, submitted: "000000" })).toEqual({
      kind: "invalid",
      attemptsRemaining: MAX_ATTEMPTS - 1,
    });
  });

  it("floors attemptsRemaining at zero on the last wrong guess", () => {
    expect(
      evaluateCode({ ...base, submitted: "000000", attempts: MAX_ATTEMPTS - 1 }),
    ).toEqual({ kind: "invalid", attemptsRemaining: 0 });
  });

  it("checks expiry before the attempt cap", () => {
    // Expired AND over cap -> expired wins.
    expect(
      evaluateCode({ ...base, nowMs: 3_000, attempts: MAX_ATTEMPTS }),
    ).toEqual({ kind: "expired" });
  });
});
