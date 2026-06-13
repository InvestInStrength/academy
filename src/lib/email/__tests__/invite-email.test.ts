import { describe, expect, it } from "vitest";

import { buildInviteEmail } from "../invite-email-core";

const base = {
  candidateName: "Alex Doe",
  assessmentTitle: "Strength Fundamentals",
  link: "https://example.com/certification/abc123",
  locale: "en" as const,
};

describe("buildInviteEmail", () => {
  it("builds the English subject and embeds the name, assessment and link", () => {
    const { subject, html } = buildInviteEmail(base);
    expect(subject).toBe("You're invited to start your certification");
    expect(html).toContain("Start your certification");
    expect(html).toContain("Alex Doe");
    expect(html).toContain("Strength Fundamentals");
    expect(html).toContain('href="https://example.com/certification/abc123"');
  });

  it("builds the German subject and body", () => {
    const { subject, html } = buildInviteEmail({ ...base, locale: "de" });
    expect(subject).toBe("Einladung zu Ihrer Zertifizierung");
    expect(html).toContain("Starten Sie Ihre Zertifizierung");
    expect(html).toContain("Alex Doe");
  });

  it("HTML-escapes the candidate name defensively", () => {
    const { html } = buildInviteEmail({ ...base, candidateName: "<script>" });
    expect(html).not.toContain("<script>");
    expect(html).toContain("&lt;script&gt;");
  });
});
