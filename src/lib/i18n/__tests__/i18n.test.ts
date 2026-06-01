import { describe, expect, it } from "vitest";

import { getDictionary, t } from "../dict";

describe("t() — dictionary lookup", () => {
  const dict = {
    hello: "Hallo",
    greeting: "Hallo {name}!",
    multi: "{a}, {b}, {a}",
  };

  it("returns the value for a known key", () => {
    expect(t(dict, "hello")).toBe("Hallo");
  });

  it("returns the key itself when missing — no cross-locale fallback", () => {
    expect(t(dict, "missing.key")).toBe("missing.key");
  });

  it("substitutes named params", () => {
    expect(t(dict, "greeting", { name: "Ada" })).toBe("Hallo Ada!");
  });

  it("substitutes repeated params and accepts numeric values", () => {
    expect(t(dict, "multi", { a: 1, b: "two" })).toBe("1, two, 1");
  });

  it("leaves unknown placeholders untouched", () => {
    expect(t(dict, "greeting", {})).toBe("Hallo {name}!");
  });
});

describe("getDictionary", () => {
  it("returns the DE dict for 'de' with at least the attempt.* keys", () => {
    const dict = getDictionary("de");
    expect(dict["attempt.submit"]).toBeTruthy();
    expect(dict["attempt.no_questions"]).toBeTruthy();
  });

  it("returns the EN dict for 'en'", () => {
    const dict = getDictionary("en");
    expect(dict["attempt.submit"]).toBe("Submit assessment");
  });

  it("DE and EN dicts share the same key set (no silent missing translations)", () => {
    const de = Object.keys(getDictionary("de")).sort();
    const en = Object.keys(getDictionary("en")).sort();
    expect(en).toEqual(de);
  });
});
