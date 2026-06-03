import { describe, it, expect } from "vitest";

import { renderCertificateSvg } from "./render";
import { normalizeTemplateFonts, renderSvgToPng, pngToPdf } from "./assets";

const sample = {
  certificate_number: "IIS-2026-TEST1234",
  candidate_name: "Maximilian Mustermann",
  course_title: "Invest in Strength — Methodik",
  topics: ["Grundlagen", "Programmierung", "Regeneration"],
  completion_date: "2026-06-03T00:00:00.000Z",
  verification_url: "https://investinstrength.academy/verify/abc123",
};

describe("normalizeTemplateFonts", () => {
  it("maps per-weight Barlow tokens to family Barlow + an explicit weight", () => {
    const out = normalizeTemplateFonts("x { font-family: Barlow-Bold, Barlow; }");
    expect(out).toContain("font-family:Barlow");
    expect(out).toContain("font-weight:700");
    expect(out).not.toContain("Barlow-Bold");
  });

  it("maps the italic token to font-style", () => {
    const out = normalizeTemplateFonts("font-family: Barlow-Italic, Barlow");
    expect(out).toContain("font-style:italic");
  });

  it("maps SemiBold/ExtraBold to 600/800", () => {
    expect(normalizeTemplateFonts("font-family: Barlow-SemiBold")).toContain(
      "font-weight:600",
    );
    expect(normalizeTemplateFonts("font-family: Barlow-ExtraBold")).toContain(
      "font-weight:800",
    );
  });
});

describe("certificate raster pipeline", () => {
  it("renders the default template to a valid high-DPI PNG", async () => {
    const svg = await renderCertificateSvg(sample);
    const { png, width, height } = await renderSvgToPng(svg);
    // PNG magic bytes.
    expect(png.subarray(0, 8).toString("hex")).toBe("89504e470d0a1a0a");
    // ~300 DPI A4 landscape.
    expect(width).toBeGreaterThan(3000);
    expect(height).toBeGreaterThan(2000);
  });

  it("embeds the PNG into a valid A4-landscape PDF", async () => {
    const svg = await renderCertificateSvg(sample);
    const { png } = await renderSvgToPng(svg);
    const pdf = await pngToPdf(png);
    expect(pdf.subarray(0, 5).toString("ascii")).toBe("%PDF-");
    expect(pdf.byteLength).toBeGreaterThan(1000);
  });
});
