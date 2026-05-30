import { describe, expect, it } from "vitest";

import { renderCertificateSvg } from "./render";

const baseData = {
  certificate_number: "IIS-2026-A1B2C3D4",
  candidate_name: "Jane Doe",
  course_title: "Strength Fundamentals",
  topics: ["Programming Basics", "Recovery"],
  completion_date: "2026-06-15T00:00:00.000Z",
  verification_url: "https://investinstrength.academy/verify/abc",
};

describe("renderCertificateSvg — default template", () => {
  it("renders a top-level <svg> with width/height/viewBox", async () => {
    const svg = await renderCertificateSvg(baseData);
    expect(svg).toMatch(/^<svg/);
    expect(svg).toMatch(/viewBox="0 0 \d+(\.\d+)? \d+(\.\d+)?"/);
    expect(svg).toMatch(/width="[^"]+"/);
    expect(svg).toMatch(/height="[^"]+"/);
  });

  it("substitutes {{issuer_name}} with the brand name", async () => {
    const svg = await renderCertificateSvg(baseData);
    expect(svg).toContain("Invest in Strength");
    expect(svg).not.toContain("{{issuer_name}}");
  });

  it("leaves no unresolved placeholder tokens", async () => {
    const svg = await renderCertificateSvg(baseData);
    expect(svg).not.toMatch(/\{\{[a-z_]+\}\}/);
  });

  it("contains the supplied candidate name, course, topics, date, and certificate id", async () => {
    const svg = await renderCertificateSvg(baseData);
    expect(svg).toContain("Jane Doe");
    expect(svg).toContain("Strength Fundamentals");
    expect(svg).toContain("Programming Basics");
    expect(svg).toContain("Recovery");
    expect(svg).toContain("IIS-2026-A1B2C3D4");
    expect(svg).toContain("15 June 2026");
  });

  it("embeds a QR (a nested <svg> from the qrcode library)", async () => {
    const svg = await renderCertificateSvg(baseData);
    const svgOpens = svg.match(/<svg/g)?.length ?? 0;
    // outer cert SVG + inner QR SVG
    expect(svgOpens).toBeGreaterThanOrEqual(2);
  });

  it("XML-escapes special characters in user-supplied text", async () => {
    const svg = await renderCertificateSvg({
      ...baseData,
      candidate_name: 'Tom & Jerry <"quote">',
    });
    // raw form must NOT appear as-is (would break the SVG)
    expect(svg).not.toContain('Tom & Jerry <"quote">');
    expect(svg).toContain("Tom &amp; Jerry &lt;&quot;quote&quot;&gt;");
  });

  it("never leaks score / percentage / attempt language", async () => {
    const svg = await renderCertificateSvg(baseData);
    expect(svg.toLowerCase()).not.toContain("score");
    expect(svg.toLowerCase()).not.toContain("attempt");
    expect(svg).not.toContain("%");
  });

  it("handles an empty topics list without breaking", async () => {
    const svg = await renderCertificateSvg({ ...baseData, topics: [] });
    expect(svg).toContain("<svg");
    expect(svg).toContain("Strength Fundamentals");
  });
});

describe("renderCertificateSvg — admin-supplied template", () => {
  const template = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
    <text>{{candidate_name}}</text>
    <text>{{course_title}}</text>
    <text>{{topics}}</text>
    <text>{{completion_date}}</text>
    <text>{{certificate_number}}</text>
    <text>{{verification_url}}</text>
    <g class="qr">{{qr}}</g>
  </svg>`;

  it("substitutes every placeholder token with the data", async () => {
    const svg = await renderCertificateSvg(baseData, template);
    expect(svg).toContain("Jane Doe");
    expect(svg).toContain("Strength Fundamentals");
    expect(svg).toContain("Programming Basics");
    expect(svg).toContain("Recovery");
    expect(svg).toContain("15 June 2026");
    expect(svg).toContain("IIS-2026-A1B2C3D4");
    expect(svg).toContain("https://investinstrength.academy/verify/abc");

    // no token should survive
    expect(svg).not.toContain("{{candidate_name}}");
    expect(svg).not.toContain("{{course_title}}");
    expect(svg).not.toContain("{{topics}}");
    expect(svg).not.toContain("{{completion_date}}");
    expect(svg).not.toContain("{{certificate_number}}");
    expect(svg).not.toContain("{{verification_url}}");
    expect(svg).not.toContain("{{qr}}");
  });

  it("escapes data when substituting", async () => {
    const svg = await renderCertificateSvg(
      { ...baseData, candidate_name: "Bob & Alice" },
      template,
    );
    expect(svg).toContain("Bob &amp; Alice");
    expect(svg).not.toContain("Bob & Alice<"); // raw would break XML
  });

  it("inlines QR markup (a nested <svg>) at {{qr}}", async () => {
    const svg = await renderCertificateSvg(baseData, template);
    // template defined two svg opens (outer + inner via qr); render adds more from QR svg structure
    const svgOpens = svg.match(/<svg/g)?.length ?? 0;
    expect(svgOpens).toBeGreaterThanOrEqual(2);
  });
});
