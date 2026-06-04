import { describe, expect, it } from "vitest";

import {
  MAX_ID_LENGTH,
  MAX_OPTIONS_PER_QUESTION,
  MAX_QUESTIONS,
  sanitizeAnswerMap,
} from "../attempt-progress-core";

describe("sanitizeAnswerMap", () => {
  it("passes a well-formed answer map through unchanged", () => {
    const input = { "q-1": ["opt-a", "opt-b"], "q-2": ["opt-c"] };
    expect(sanitizeAnswerMap(input)).toEqual(input);
  });

  it("returns an empty map for non-object input", () => {
    expect(sanitizeAnswerMap(null)).toEqual({});
    expect(sanitizeAnswerMap(undefined)).toEqual({});
    expect(sanitizeAnswerMap("nope")).toEqual({});
    expect(sanitizeAnswerMap(42)).toEqual({});
    expect(sanitizeAnswerMap(["q-1", "q-2"])).toEqual({});
  });

  it("drops entries whose value is not an array", () => {
    const input = { "q-1": ["opt-a"], "q-2": "opt-b", "q-3": { x: 1 } };
    expect(sanitizeAnswerMap(input)).toEqual({ "q-1": ["opt-a"] });
  });

  it("de-dupes option ids within a question", () => {
    expect(sanitizeAnswerMap({ "q-1": ["a", "a", "b", "a"] })).toEqual({
      "q-1": ["a", "b"],
    });
  });

  it("filters out non-string and empty option ids", () => {
    const input = { "q-1": ["a", "", 5, null, "b"] } as unknown;
    expect(sanitizeAnswerMap(input)).toEqual({ "q-1": ["a", "b"] });
  });

  it("preserves a question with all answers cleared as an empty array", () => {
    expect(sanitizeAnswerMap({ "q-1": [] })).toEqual({ "q-1": [] });
  });

  it("drops ids longer than the max length", () => {
    const tooLong = "x".repeat(MAX_ID_LENGTH + 1);
    const ok = "y".repeat(MAX_ID_LENGTH);
    expect(sanitizeAnswerMap({ "q-1": [tooLong, ok] })).toEqual({
      "q-1": [ok],
    });
    expect(sanitizeAnswerMap({ [tooLong]: ["a"] })).toEqual({});
  });

  it("caps the number of questions", () => {
    const input: Record<string, string[]> = {};
    for (let i = 0; i < MAX_QUESTIONS + 10; i++) input[`q-${i}`] = ["a"];
    expect(Object.keys(sanitizeAnswerMap(input))).toHaveLength(MAX_QUESTIONS);
  });

  it("caps the number of options per question", () => {
    const opts = Array.from(
      { length: MAX_OPTIONS_PER_QUESTION + 10 },
      (_, i) => `opt-${i}`,
    );
    expect(sanitizeAnswerMap({ "q-1": opts })["q-1"]).toHaveLength(
      MAX_OPTIONS_PER_QUESTION,
    );
  });
});
