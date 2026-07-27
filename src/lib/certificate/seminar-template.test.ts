import { describe, expect, it } from "vitest";

import { DEFAULT_CERTIFICATE_TEMPLATE } from "./templates";
import {
  deriveSeminarTemplate,
  SEMINAR_CERTIFICATE_TEMPLATE,
} from "./seminar-template";
import { renderCertificateSvg, defaultTemplateFor } from "./render";

/**
 * The seminar template is derived from the course template by rewriting its
 * course-specific lines. `deriveSeminarTemplate` degrades gracefully when a
 * marker is missing (it leaves that line alone rather than throwing), so these
 * tests are the thing that catches drift after the designer hands back a new
 * course SVG — without them, a course-worded seminar certificate would reach a
 * candidate silently.
 */
describe("seminar certificate template", () => {
  it("drops the course's hardcoded module count", () => {
    expect(DEFAULT_CERTIFICATE_TEMPLATE).toContain("12 modules");
    expect(SEMINAR_CERTIFICATE_TEMPLATE).not.toContain("12 modules");
  });

  it("replaces the course sentence with the seminar wording", () => {
    expect(SEMINAR_CERTIFICATE_TEMPLATE).toContain(
      "has successfully attended the seminar and passed the certification test",
    );
    expect(SEMINAR_CERTIFICATE_TEMPLATE).not.toContain(
      "has successfully attended all",
    );
  });

  it("drops the course's fixed programme subtitle", () => {
    expect(DEFAULT_CERTIFICATE_TEMPLATE).toContain("Advanced Pre-/ Rehabilitation");
    expect(SEMINAR_CERTIFICATE_TEMPLATE).not.toContain(
      "Advanced Pre-/ Rehabilitation",
    );
  });

  it("uses the topics slot for the event date", () => {
    expect(SEMINAR_CERTIFICATE_TEMPLATE).toContain("{{event_date}}");
    expect(SEMINAR_CERTIFICATE_TEMPLATE).not.toContain("{{included_topics}}");
  });

  it("drops the topics row's static label along with the slot", () => {
    // The label is inline with the slot in one tspan, so leaving it behind
    // would print "Topics covered: 12 March 2026" on a seminar certificate.
    expect(DEFAULT_CERTIFICATE_TEMPLATE).toContain("Topics covered:");
    expect(SEMINAR_CERTIFICATE_TEMPLATE).not.toContain("Topics covered");
  });

  it("keeps the shared slots the renderer substitutes", () => {
    for (const token of [
      "{{participant_name}}",
      "{{course_title}}",
      "{{completion_date}}",
      "{{certificate_id}}",
      "{{verification_qr}}",
    ]) {
      expect(SEMINAR_CERTIFICATE_TEMPLATE).toContain(token);
    }
  });

  it("leaves an unrecognised template untouched instead of throwing", () => {
    const foreign = '<svg><text><tspan>{{course_title}}</tspan></text></svg>';
    expect(deriveSeminarTemplate(foreign)).toBe(foreign);
  });
});

describe("defaultTemplateFor", () => {
  it("picks the seminar template only for seminars", () => {
    expect(defaultTemplateFor("seminar")).toBe(SEMINAR_CERTIFICATE_TEMPLATE);
    expect(defaultTemplateFor("course")).toBe(DEFAULT_CERTIFICATE_TEMPLATE);
    // Snapshots frozen before seminars existed carry no kind.
    expect(defaultTemplateFor(undefined)).toBe(DEFAULT_CERTIFICATE_TEMPLATE);
  });
});

describe("rendering a seminar certificate", () => {
  const base = {
    certificate_number: "IIS-2026-SEM1",
    candidate_name: "Max Mustermann",
    course_title: "Applied Shoulder Biomechanics",
    topics: [],
    completion_date: "2026-07-27T10:00:00.000Z",
    verification_url: "https://investinstrength.academy/verify/tok",
  };

  it("prints the event date", async () => {
    const svg = await renderCertificateSvg({
      ...base,
      kind: "seminar",
      event_date: "2026-03-12",
    });
    expect(svg).toContain("12 March 2026");
    expect(svg).not.toContain("{{event_date}}");
  });

  it("renders a date-only event date on its own calendar day", async () => {
    // A `date` column arrives as "YYYY-MM-DD"; `new Date()` would read that as
    // UTC midnight and print the previous day west of Greenwich.
    const svg = await renderCertificateSvg({
      ...base,
      kind: "seminar",
      event_date: "2026-01-01",
    });
    expect(svg).toContain("1 January 2026");
  });

  it("leaves the slot empty when a seminar has no event date", async () => {
    const svg = await renderCertificateSvg({
      ...base,
      kind: "seminar",
      event_date: null,
    });
    expect(svg).not.toContain("{{event_date}}");
    expect(svg).toContain("Applied Shoulder Biomechanics");
  });

  it("still renders the course certificate unchanged by default", async () => {
    const svg = await renderCertificateSvg({ ...base, topics: ["Topic A"] });
    expect(svg).toContain("12 modules");
    expect(svg).toContain("Topic A");
  });
});
