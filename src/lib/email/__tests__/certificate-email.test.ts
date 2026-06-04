import { describe, expect, it } from "vitest";

import {
  buildCertificateEmail,
  escapeHtml,
  formatLongDate,
} from "../certificate-email-core";
import type { CertificateSnapshot } from "@/lib/certification/data";

const snapshot: CertificateSnapshot = {
  certificate_number: "IIS-2026-AB12CD34",
  candidate_name: "Maximilian Mustermann",
  course_title: "Invest in Strength — Methodik",
  topics: ["Grundlagen", "Programmierung"],
  completion_date: "2026-06-03T00:00:00.000Z",
  verification_url: "https://investinstrength.academy/verify/abc123",
  svg: "<svg></svg>",
};

describe("escapeHtml", () => {
  it("escapes the dangerous HTML characters", () => {
    expect(escapeHtml('<a href="x">A & B</a>')).toBe(
      "&lt;a href=&quot;x&quot;&gt;A &amp; B&lt;/a&gt;",
    );
  });
});

describe("formatLongDate", () => {
  it("formats in German for de", () => {
    expect(formatLongDate("2026-06-03T00:00:00.000Z", "de")).toBe("3. Juni 2026");
  });

  it("formats in English for en", () => {
    expect(formatLongDate("2026-06-03T00:00:00.000Z", "en")).toBe("3 June 2026");
  });
});

describe("buildCertificateEmail", () => {
  it("renders a German subject and body for de", () => {
    const { subject, html } = buildCertificateEmail(snapshot, "de");
    expect(subject).toBe("Ihr Zertifikat – Invest in Strength — Methodik");
    expect(html).toContain("Ihr Zertifikat");
    expect(html).toContain("herzlichen Glückwunsch");
    expect(html).toContain("Zertifikat-ID");
    expect(html).toContain("Abgeschlossen");
    expect(html).toContain("3. Juni 2026");
    expect(html).not.toContain("Certificate ID");
  });

  it("renders an English subject and body for en", () => {
    const { subject, html } = buildCertificateEmail(snapshot, "en");
    expect(subject).toBe("Your certificate – Invest in Strength — Methodik");
    expect(html).toContain("Certificate ID");
    expect(html).toContain("congratulations on completing");
    expect(html).toContain("3 June 2026");
  });

  it("keeps the bold course tag while escaping the candidate name", () => {
    const html = buildCertificateEmail(
      { ...snapshot, candidate_name: "Ann <script>" },
      "en",
    ).html;
    // Intentional template markup survives...
    expect(html).toContain("<strong>Invest in Strength — Methodik</strong>");
    // ...but injected candidate data is escaped.
    expect(html).toContain("Ann &lt;script&gt;");
    expect(html).not.toContain("Ann <script>");
  });

  it("embeds the verification url in the CTA and footer", () => {
    const html = buildCertificateEmail(snapshot, "de").html;
    expect(html).toContain(`href="${snapshot.verification_url}"`);
    expect(html).toContain(snapshot.verification_url);
  });
});
