import "server-only";

import { barlowFontFiles } from "./fonts";

// The renderer deps are heavy (resvg is a native addon); import them lazily so
// read-only routes that transitively reach this module don't load them at init.

/**
 * Server-side raster rendering for certificate assets. Kept separate from the
 * SVG-fill layer (`render.ts`) and from scoring. SVG is the source of truth:
 * the official PDF and PNG preview are produced from the SAME filled SVG so
 * they match pixel-for-pixel.
 */

// The designer's official template is A4 landscape at the pt scale
// (viewBox 0 0 841.89 595.28). The PDF page uses those points exactly.
export const A4_LANDSCAPE_PT = { width: 841.89, height: 595.28 };

// The template is point-based (1pt = 1/72"). 300 DPI => scale 300/72.
const PNG_DPI = 300;

/**
 * resvg-js 2.6.x ignores `fitTo` when a `font` option is also supplied, so we
 * size the raster the reliable way: inject explicit width/height on the <svg>
 * root (computed from the viewBox at the target DPI), which resvg always
 * honors. Any existing root width/height is replaced.
 */
function sizeSvgForDpi(
  svg: string,
  dpi: number,
): { svg: string; width: number; height: number } {
  let vbW = A4_LANDSCAPE_PT.width;
  let vbH = A4_LANDSCAPE_PT.height;
  const vb = svg.match(/viewBox\s*=\s*"([\d.\s,-]+)"/);
  if (vb) {
    const p = vb[1].trim().split(/[\s,]+/).map(Number);
    if (p.length === 4 && p[2] > 0 && p[3] > 0) {
      vbW = p[2];
      vbH = p[3];
    }
  }
  const scale = dpi / 72;
  const width = Math.round(vbW * scale);
  const height = Math.round(vbH * scale);
  const sized = svg.replace(/<svg\b([^>]*)>/, (_m, attrs: string) => {
    const cleaned = attrs
      .replace(/\swidth\s*=\s*"[^"]*"/i, "")
      .replace(/\sheight\s*=\s*"[^"]*"/i, "");
    return `<svg${cleaned} width="${width}" height="${height}">`;
  });
  return { svg: sized, width, height };
}

const VARIANT_STYLE: Record<string, { weight: number; style: "normal" | "italic" }> = {
  Regular: { weight: 400, style: "normal" },
  Medium: { weight: 500, style: "normal" },
  SemiBold: { weight: 600, style: "normal" },
  Bold: { weight: 700, style: "normal" },
  ExtraBold: { weight: 800, style: "normal" },
  Italic: { weight: 400, style: "italic" },
};

/**
 * Designer SVGs (Illustrator) name fonts per weight, e.g.
 * `font-family: Barlow-Bold, Barlow`. resvg matches the family in the bundled
 * TTFs, whose internal family is just "Barlow", so the per-weight token would
 * fall back to Barlow Regular and lose all weight. Rewrite each per-weight
 * token to family Barlow + an explicit font-weight/style.
 */
export function normalizeTemplateFonts(svg: string): string {
  return svg.replace(
    /font-family:\s*Barlow-([A-Za-z]+)(\s*,\s*Barlow)?/g,
    (_match, variant: string) => {
      const v = VARIANT_STYLE[variant];
      if (!v) return "font-family:Barlow";
      return `font-family:Barlow;font-weight:${v.weight};font-style:${v.style}`;
    },
  );
}

export type RenderedPng = { png: Buffer; width: number; height: number };

/** Rasterizes a filled certificate SVG to a high-DPI PNG using bundled Barlow. */
export async function renderSvgToPng(svg: string): Promise<RenderedPng> {
  const { Resvg } = await import("@resvg/resvg-js");
  const sized = sizeSvgForDpi(normalizeTemplateFonts(svg), PNG_DPI);
  const resvg = new Resvg(sized.svg, {
    font: {
      fontFiles: barlowFontFiles(),
      loadSystemFonts: false,
      defaultFontFamily: "Barlow",
    },
  });
  const rendered = resvg.render();
  return {
    png: Buffer.from(rendered.asPng()),
    width: rendered.width,
    height: rendered.height,
  };
}

/** Embeds a PNG into a single A4-landscape PDF page (raster MVP — guarantees
 * the PDF matches the preview exactly). */
export async function pngToPdf(png: Buffer): Promise<Buffer> {
  const { PDFDocument } = await import("pdf-lib");
  const pdf = await PDFDocument.create();
  const page = pdf.addPage([A4_LANDSCAPE_PT.width, A4_LANDSCAPE_PT.height]);
  const image = await pdf.embedPng(png);
  page.drawImage(image, {
    x: 0,
    y: 0,
    width: A4_LANDSCAPE_PT.width,
    height: A4_LANDSCAPE_PT.height,
  });
  return Buffer.from(await pdf.save());
}
