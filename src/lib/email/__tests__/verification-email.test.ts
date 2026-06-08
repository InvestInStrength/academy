import { describe, expect, it } from "vitest";

import { CODE_TTL_MINUTES } from "@/lib/certification/email-verification-core";

import { buildVerificationEmail } from "../verification-email-core";

describe("buildVerificationEmail", () => {
  it("builds the English subject and embeds the code + expiry", () => {
    const { subject, html } = buildVerificationEmail("482913", "en");
    expect(subject).toBe("Your verification code");
    expect(html).toContain("482913");
    expect(html).toContain("Confirm your email");
    expect(html).toContain(`${CODE_TTL_MINUTES} minutes`);
  });

  it("builds the German subject and body", () => {
    const { subject, html } = buildVerificationEmail("482913", "de");
    expect(subject).toBe("Ihr Bestätigungscode");
    expect(html).toContain("Bestätigen Sie Ihre E-Mail");
    expect(html).toContain("482913");
  });

  it("HTML-escapes the code defensively", () => {
    const { html } = buildVerificationEmail("<script>", "en");
    expect(html).not.toContain("<script>");
    expect(html).toContain("&lt;script&gt;");
  });
});
