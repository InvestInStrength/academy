import "server-only";

import { join } from "node:path";

/**
 * Barlow TTF buffers for the server-side certificate renderer (resvg). resvg
 * does not use `next/font`, so the brand font is bundled in this directory and
 * read from disk. The files are listed in `next.config.ts`
 * `outputFileTracingIncludes` so they ship in the serverless bundle.
 *
 * Licensed under the SIL Open Font License v1.1 — see `./fonts/OFL.txt`.
 */

const FONT_DIR = join(process.cwd(), "src", "lib", "certificate", "fonts");

const FONT_FILES = [
  "Barlow-Regular.ttf",
  "Barlow-Medium.ttf",
  "Barlow-SemiBold.ttf",
  "Barlow-Bold.ttf",
  "Barlow-ExtraBold.ttf",
  "Barlow-Italic.ttf",
];

/** Absolute paths to the bundled Barlow font files, for resvg's `fontFiles`. */
export function barlowFontFiles(): string[] {
  return FONT_FILES.map((name) => join(FONT_DIR, name));
}
