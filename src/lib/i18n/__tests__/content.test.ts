import { describe, expect, it } from "vitest";

import { pickLocalized } from "../content";

describe("pickLocalized", () => {
  it("returns the locale-specific column when it's populated", () => {
    const row = { title: "Legacy", title_de: "Deutsch", title_en: "English" };
    expect(pickLocalized(row, "title", "en")).toBe("English");
    expect(pickLocalized(row, "title", "de")).toBe("Legacy");
  });

  it("for 'en', falls back to '_de' when '_en' is null", () => {
    const row = { title: "Legacy", title_de: "Deutsch", title_en: null };
    expect(pickLocalized(row, "title", "en")).toBe("Deutsch");
  });

  it("for 'en', falls back to legacy when both '_en' and '_de' are null", () => {
    const row = { title: "Legacy", title_de: null, title_en: null };
    expect(pickLocalized(row, "title", "en")).toBe("Legacy");
  });

  it("for 'de', falls back to legacy when '_de' is null — never crosses to '_en'", () => {
    const row = { title: "Legacy", title_de: null, title_en: "English" };
    expect(pickLocalized(row, "title", "de")).toBe("Legacy");
  });

  it("treats empty strings as missing in every position", () => {
    expect(
      pickLocalized({ title: "Legacy", title_de: "", title_en: "" }, "title", "en"),
    ).toBe("Legacy");
    expect(
      pickLocalized({ title: "Legacy", title_de: "", title_en: "EN" }, "title", "en"),
    ).toBe("EN");
    expect(
      pickLocalized({ title: "Legacy", title_de: "", title_en: "" }, "title", "de"),
    ).toBe("Legacy");
  });

  it("returns null only when every column is missing or empty", () => {
    expect(
      pickLocalized({ title: null, title_de: null, title_en: null }, "title", "en"),
    ).toBeNull();
    expect(
      pickLocalized({ title: "", title_de: "", title_en: "" }, "title", "de"),
    ).toBeNull();
  });

  it("handles rows that have only the legacy column (e.g. pre-migration shape)", () => {
    const row = { title: "Legacy only" };
    expect(pickLocalized(row, "title", "de")).toBe("Legacy only");
    expect(pickLocalized(row, "title", "en")).toBe("Legacy only");
  });

  it("works across different field bases", () => {
    const row = {
      question_text: "Q",
      question_text_de: "Frage",
      question_text_en: "Question",
      recommendation_text: null,
      recommendation_text_de: "Empfehlung",
      recommendation_text_en: null,
    };
    expect(pickLocalized(row, "question_text", "en")).toBe("Question");
    expect(pickLocalized(row, "recommendation_text", "en")).toBe("Empfehlung");
    expect(pickLocalized(row, "recommendation_text", "de")).toBeNull();
  });
});
