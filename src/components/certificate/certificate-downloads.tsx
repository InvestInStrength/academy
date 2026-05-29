"use client";

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

/** Client-side certificate downloads. SVG is downloaded directly; PNG is
 * rasterized from the SVG in a canvas (no server dependency). */
export function CertificateDownloads({
  svg,
  certificateNumber,
}: {
  svg: string;
  certificateNumber: string;
}) {
  function downloadSvg() {
    triggerDownload(
      new Blob([svg], { type: "image/svg+xml;charset=utf-8" }),
      `${certificateNumber}.svg`,
    );
  }

  function downloadPng() {
    const blob = new Blob([svg], { type: "image/svg+xml;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const image = new Image();
    image.onload = () => {
      const scale = 2;
      const width = image.naturalWidth || 1000;
      const height = image.naturalHeight || 700;
      const canvas = document.createElement("canvas");
      canvas.width = width * scale;
      canvas.height = height * scale;
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        URL.revokeObjectURL(url);
        return;
      }
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(image, 0, 0, canvas.width, canvas.height);
      canvas.toBlob((png) => {
        if (png) triggerDownload(png, `${certificateNumber}.png`);
        URL.revokeObjectURL(url);
      }, "image/png");
    };
    image.onerror = () => URL.revokeObjectURL(url);
    image.src = url;
  }

  return (
    <div className="flex gap-2">
      <Button type="button" onClick={downloadSvg}>
        Download SVG
      </Button>
      <Button type="button" variant="outline" onClick={downloadPng}>
        Download PNG
      </Button>
    </div>
  );
}
