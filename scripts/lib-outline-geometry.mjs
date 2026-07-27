// Accurate geometry pass over the outlined seminar SVG: a real path parser
// (absolute + relative commands) plus transform resolution, so glyph outlines
// can be clustered into the text rows they visually form.
import { readFileSync } from "node:fs";

const SRC =
  "A:/WORK/KUNDEN/Invest in Strength/Academy/Seminare/certificate-template-Shoulder-Biomechanics-01.svg";

const NUM = /-?\d*\.?\d+(?:[eE][-+]?\d+)?/g;

/** Walks a path `d` string, tracking the current point so relative commands
 * accumulate correctly. Control points are included in the bounds (they bound
 * the curve), which is ample for laying text out over the result. */
export function pathBBox(d) {
  const tokens = d.match(/[a-zA-Z]|-?\d*\.?\d+(?:[eE][-+]?\d+)?/g) ?? [];
  let i = 0;
  let cmd = "";
  let cx = 0;
  let cy = 0;
  let sx = 0;
  let sy = 0;
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;

  const hit = (x, y) => {
    if (x < minX) minX = x;
    if (y < minY) minY = y;
    if (x > maxX) maxX = x;
    if (y > maxY) maxY = y;
  };
  const num = () => Number.parseFloat(tokens[i++]);

  while (i < tokens.length) {
    if (/[a-zA-Z]/.test(tokens[i])) cmd = tokens[i++];
    const rel = cmd === cmd.toLowerCase();
    const C = cmd.toUpperCase();
    if (C === "Z") {
      cx = sx;
      cy = sy;
      continue;
    }
    const px = rel ? cx : 0;
    const py = rel ? cy : 0;

    if (C === "M" || C === "L" || C === "T") {
      cx = px + num();
      cy = py + num();
      if (C === "M") {
        sx = cx;
        sy = cy;
        // A repeated M coordinate pair is an implicit L.
        cmd = rel ? "l" : "L";
      }
      hit(cx, cy);
    } else if (C === "H") {
      cx = px + num();
      hit(cx, cy);
    } else if (C === "V") {
      cy = py + num();
      hit(cx, cy);
    } else if (C === "C") {
      const x1 = px + num(), y1 = py + num();
      const x2 = px + num(), y2 = py + num();
      cx = px + num();
      cy = py + num();
      hit(x1, y1);
      hit(x2, y2);
      hit(cx, cy);
    } else if (C === "S" || C === "Q") {
      const x1 = px + num(), y1 = py + num();
      cx = px + num();
      cy = py + num();
      hit(x1, y1);
      hit(cx, cy);
    } else if (C === "A") {
      num(); num(); num(); num(); num(); // rx ry rot large sweep
      cx = px + num();
      cy = py + num();
      hit(cx, cy);
    } else {
      i++; // unknown token — skip defensively
    }
  }

  if (!Number.isFinite(minX)) return null;
  return [minX, minY, maxX, maxY];
}

// --- transform-aware walk over the raw markup ------------------------------

function parseTransform(value) {
  let m = [1, 0, 0, 1, 0, 0];
  for (const [, name, args] of (value ?? "").matchAll(/(\w+)\s*\(([^)]*)\)/g)) {
    const n = (args.match(NUM) ?? []).map(Number);
    let t;
    if (name === "translate") t = [1, 0, 0, 1, n[0] ?? 0, n[1] ?? 0];
    else if (name === "scale") t = [n[0], 0, 0, n[1] ?? n[0], 0, 0];
    else if (name === "matrix") t = n.slice(0, 6);
    else continue;
    m = mul(m, t);
  }
  return m;
}

function mul(a, b) {
  return [
    a[0] * b[0] + a[2] * b[1],
    a[1] * b[0] + a[3] * b[1],
    a[0] * b[2] + a[2] * b[3],
    a[1] * b[2] + a[3] * b[3],
    a[0] * b[4] + a[2] * b[5] + a[4],
    a[1] * b[4] + a[3] * b[5] + a[5],
  ];
}

const apply = (m, x, y) => [m[0] * x + m[2] * y + m[4], m[1] * x + m[3] * y + m[5]];

/** Streams the markup, maintaining a transform stack, and returns every drawable
 * with its absolute bbox and its exact source offsets (so it can be removed). */
export function collectShapes(svg) {
  const shapes = [];
  const stack = [[1, 0, 0, 1, 0, 0]];
  let inDefs = 0;

  const TAG = /<(\/?)([a-zA-Z:]+)([^>]*?)(\/?)>/g;
  for (const m of svg.matchAll(TAG)) {
    const [full, closing, tag, attrs, selfClosing] = m;

    if (tag === "defs" || tag === "clipPath") {
      inDefs += closing ? -1 : selfClosing ? 0 : 1;
      continue;
    }
    if (inDefs > 0) continue;

    if (tag === "g" || tag === "svg") {
      if (closing) stack.pop();
      else if (!selfClosing)
        stack.push(mul(stack.at(-1), parseTransform(/transform="([^"]*)"/.exec(attrs)?.[1])));
      continue;
    }
    if (closing) continue;

    const num = (name) => {
      const found = new RegExp(`\\b${name}="([^"]*)"`).exec(attrs);
      const value = found ? Number.parseFloat(found[1]) : 0;
      return Number.isFinite(value) ? value : 0;
    };

    let box = null;
    if (tag === "path") {
      const d = /\bd="([^"]*)"/.exec(attrs)?.[1];
      if (d) box = pathBBox(d);
    } else if (tag === "rect") {
      box = [num("x"), num("y"), num("x") + num("width"), num("y") + num("height")];
    } else if (tag === "line") {
      box = [
        Math.min(num("x1"), num("x2")),
        Math.min(num("y1"), num("y2")),
        Math.max(num("x1"), num("x2")),
        Math.max(num("y1"), num("y2")),
      ];
    }
    if (!box) continue;

    const t = mul(stack.at(-1), parseTransform(/transform="([^"]*)"/.exec(attrs)?.[1]));
    const corners = [
      apply(t, box[0], box[1]),
      apply(t, box[2], box[1]),
      apply(t, box[0], box[3]),
      apply(t, box[2], box[3]),
    ];
    const xs = corners.map((c) => c[0]);
    const ys = corners.map((c) => c[1]);
    shapes.push({
      tag,
      cls: /class="([^"]*)"/.exec(attrs)?.[1] ?? "",
      box: [Math.min(...xs), Math.min(...ys), Math.max(...xs), Math.max(...ys)],
      start: m.index,
      end: m.index + full.length,
    });
  }
  return shapes;
}

/** Groups glyph-sized shapes into the visual text rows they form. */
export function clusterRows(shapes) {
  const glyphs = shapes.filter((s) => {
    const [, y0, , y1] = s.box;
    const h = y1 - y0;
    return s.tag === "path" && h > 1 && h < 40;
  });
  glyphs.sort((a, b) => a.box[1] - b.box[1]);

  const rows = [];
  for (const g of glyphs) {
    const mid = (g.box[1] + g.box[3]) / 2;
    const row = rows.find((r) => Math.abs(r.mid - mid) < 7);
    if (row) {
      row.items.push(g);
      row.mid = row.items.reduce((s, i) => s + (i.box[1] + i.box[3]) / 2, 0) / row.items.length;
    } else {
      rows.push({ mid, items: [g] });
    }
  }
  for (const r of rows) {
    r.x0 = Math.min(...r.items.map((i) => i.box[0]));
    r.x1 = Math.max(...r.items.map((i) => i.box[2]));
    r.y0 = Math.min(...r.items.map((i) => i.box[1]));
    r.y1 = Math.max(...r.items.map((i) => i.box[3]));
  }
  return rows.sort((a, b) => a.mid - b.mid);
}

if (process.argv[1].endsWith("rows.mjs")) {
  const svg = readFileSync(SRC, "utf8");
  const shapes = collectShapes(svg);
  console.log(`drawables: ${shapes.length}`);
  for (const r of clusterRows(shapes)) {
    console.log(
      `y ${r.y0.toFixed(1).padStart(6)}-${r.y1.toFixed(1).padStart(6)}  ` +
        `x ${r.x0.toFixed(1).padStart(6)}-${r.x1.toFixed(1).padStart(6)}  ` +
        `h ${(r.y1 - r.y0).toFixed(1).padStart(5)}  glyphs ${String(r.items.length).padStart(3)}`,
    );
  }
}
