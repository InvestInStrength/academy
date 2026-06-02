"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";

function triggerDownload(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

/**
 * Client-side certificate downloads.
 *
 * SVG is downloaded as-is — that's the lossless vector source, ideal for
 * any print pipeline that can take SVG/PDF.
 *
 * PNG is rasterized via canvas at print resolution. The default cert SVG is
 * A4 landscape at pt scale (viewBox 0 0 841.89 595.28). We rasterize at
 * 5040 px wide which gives:
 *   - A4 landscape @ 300 DPI (3508 × 2480) → ~430 DPI, comfortably above print floor.
 *   - A3 landscape @ 300 DPI (4960 × 3508) → ~305 DPI, hits print floor exactly.
 * Anything larger inflates download size + canvas memory without a benefit
 * for A4/A3 paper.
 *
 * Before rasterizing we await `document.fonts.ready` so Barlow (loaded via
 * next/font on the candidate certificate page) is available to the canvas
 * SVG rasterizer; otherwise text falls back to default fonts and looks wrong.
 *
 * Server-side rendering (resvg + pdf-lib + Supabase Storage) is the
 * forward-looking Slice 6 work; until then this is the highest-quality
 * client-side path.
 */
export function CertificateDownloads({
  svg,
  certificateNumber,
}: {
  svg: string;
  certificateNumber: string;
}) {
  const [pngBusy, setPngBusy] = useState(false);

  function downloadSvg() {
    triggerDownload(
      new Blob([svg], { type: "image/svg+xml;charset=utf-8" }),
      `${certificateNumber}.svg`,
    );
  }

  async function downloadPng() {
    if (pngBusy) return;
    setPngBusy(true);
    try {
      // Wait for any custom fonts the page loaded (Barlow) so the canvas
      // rasterization uses them instead of falling back to defaults.
      if (document.fonts && document.fonts.ready) {
        await document.fonts.ready;
      }

      const blob = new Blob([svg], { type: "image/svg+xml;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const image = new Image();

      await new Promise<void>((resolve, reject) => {
        image.onload = () => resolve();
        image.onerror = () => reject(new Error("Failed to load certificate SVG."));
        image.src = url;
      });

      // The cert template has no width/height attributes, so naturalWidth may
      // be 0 in some browsers. Fall back to the known viewBox dimensions.
      const baseWidth = image.naturalWidth || 841.89;
      const baseHeight = image.naturalHeight || 595.28;
      // ~5040 px wide → comfortably A3 @ 300 DPI. Bigger doesn't help A4/A3.
      const targetWidth = 5040;
      const scale = targetWidth / baseWidth;

      const canvas = document.createElement("canvas");
      canvas.width = Math.round(baseWidth * scale);
      canvas.height = Math.round(baseHeight * scale);
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        URL.revokeObjectURL(url);
        return;
      }
      // High-quality smoothing for any raster bits inside the SVG (the QR).
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = "high";
      // The SVG has its own background fill, but a defensive white base
      // helps if any browser doesn't preserve the background rect.
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(image, 0, 0, canvas.width, canvas.height);

      const png: Blob | null = await new Promise((resolve) =>
        canvas.toBlob((b) => resolve(b), "image/png"),
      );
      URL.revokeObjectURL(url);
      if (png) {
        triggerDownload(png, `${certificateNumber}.png`);
      }
    } finally {
      setPngBusy(false);
    }
  }

  return (
    <div className="flex flex-wrap gap-2">
      <Button type="button" onClick={downloadSvg}>
        Download SVG
      </Button>
      <Button
        type="button"
        variant="outline"
        onClick={downloadPng}
        disabled={pngBusy}
      >
        {pngBusy ? "Preparing PNG…" : "Download PNG (print-quality)"}
      </Button>
    </div>
  );
}
