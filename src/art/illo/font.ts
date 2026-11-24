/**
 * Tiny built-in pixel font (3x5 standard, 4x5 N, 5x5 M & W) for storybook titles, banners & ribbons.
 * Supports A-Z, 0-9, space, - ' , . ! & : ? with word-wrap and auto-fit helpers. Pure + deterministic.
 */
import type { Canvas, Paint } from './canvas';

const G: Record<string, string> = {
  A: '.#.|#.#|###|#.#|#.#',
  B: '##.|#.#|##.|#.#|##.',
  C: '.##|#..|#..|#..|.##',
  D: '##.|#.#|#.#|#.#|##.',
  E: '###|#..|##.|#..|###',
  F: '###|#..|##.|#..|#..',
  G: '.##|#..|#.#|#.#|.##',
  H: '#.#|#.#|###|#.#|#.#',
  I: '###|.#.|.#.|.#.|###',
  J: '..#|..#|..#|#.#|.#.',
  K: '#.#|#.#|##.|#.#|#.#',
  L: '#..|#..|#..|#..|###',
  M: '#...#|##.##|#.#.#|#...#|#...#',
  N: '#..#|##.#|#.##|#..#|#..#',
  O: '.#.|#.#|#.#|#.#|.#.',
  P: '##.|#.#|##.|#..|#..',
  Q: '.#.|#.#|#.#|##.|.##',
  R: '##.|#.#|##.|#.#|#.#',
  S: '.##|#..|.#.|..#|##.',
  T: '###|.#.|.#.|.#.|.#.',
  U: '#.#|#.#|#.#|#.#|###',
  V: '#.#|#.#|#.#|#.#|.#.',
  W: '#...#|#...#|#.#.#|##.##|#...#',
  X: '#.#|#.#|.#.|#.#|#.#',
  Y: '#.#|#.#|.#.|.#.|.#.',
  Z: '###|..#|.#.|#..|###',
  '0': '###|#.#|#.#|#.#|###',
  '1': '.#.|##.|.#.|.#.|###',
  '2': '##.|..#|.#.|#..|###',
  '3': '##.|..#|.#.|..#|##.',
  '4': '#.#|#.#|###|..#|..#',
  '5': '###|#..|##.|..#|##.',
  '6': '.##|#..|###|#.#|###',
  '7': '###|..#|.#.|.#.|.#.',
  '8': '###|#.#|###|#.#|###',
  '9': '###|#.#|###|..#|##.',
  '-': '...|...|###|...|...',
  "'": '.#.|.#.|...|...|...',
  ',': '...|...|...|.#.|#..',
  '.': '...|...|...|...|.#.',
  '!': '.#.|.#.|.#.|...|.#.',
  '&': '.#.|#.#|.#.|#.#|.##',
  ':': '...|.#.|...|.#.|...',
  '?': '##.|..#|.#.|...|.#.',
};

export const GLYPH_H = 5;

function glyph(ch: string): readonly string[] {
  const g = G[ch] ?? G['?'];
  return (g as string).split('|');
}

function glyphW(ch: string): number {
  if (ch === ' ') return 2;
  const rows = glyph(ch);
  return (rows[0] as string).length;
}

/** advance of one char at scale s (glyph + 1px gap; space is narrower) */
function adv(ch: string, s: number): number {
  return ch === ' ' ? 2 * s : (glyphW(ch) + 1) * s;
}

export function textWidth(t: string, s = 1): number {
  if (!t) return 0;
  let w = 0;
  for (const ch of t.toUpperCase()) w += adv(ch, s);
  return Math.max(0, w - s);
}

/** draw text with its top-left at (x,y); returns the width drawn */
export function drawText(c: Canvas, t: string, x: number, y: number, p: Paint, s = 1): number {
  let cx = x;
  for (const ch of t.toUpperCase()) {
    if (ch !== ' ') {
      const g = glyph(ch);
      const gw = (g[0] as string).length;
      for (let gy = 0; gy < GLYPH_H; gy++) {
        const row = g[gy] as string;
        for (let gx = 0; gx < gw; gx++) {
          if (row[gx] === '#') c.rect(cx + gx * s, y + gy * s, cx + gx * s + s, y + gy * s + s, p);
        }
      }
    }
    cx += adv(ch, s);
  }
  return Math.max(0, cx - x - s);
}

/** text with a 1px (scaled) drop shadow behind it */
export function drawTextShadow(c: Canvas, t: string, x: number, y: number, fg: Paint, shadow: Paint, s = 1): void {
  drawText(c, t, x + s, y + s, shadow, s);
  drawText(c, t, x, y, fg, s);
}

/** greedy word wrap to maxW px at scale s; very long words are hard-broken */
export function wrapText(t: string, maxW: number, s = 1): string[] {
  const words = t.trim().split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let cur = '';
  for (let w of words) {
    while (textWidth(w, s) > maxW && w.length > 1) {
      let n = w.length - 1;
      while (n > 1 && textWidth(w.slice(0, n) + '-', s) > maxW) n--;
      if (cur) {
        lines.push(cur);
        cur = '';
      }
      lines.push(w.slice(0, n) + '-');
      w = w.slice(n);
    }
    const trial = cur ? `${cur} ${w}` : w;
    if (textWidth(trial, s) <= maxW) cur = trial;
    else {
      if (cur) lines.push(cur);
      cur = w;
    }
  }
  if (cur) lines.push(cur);
  return lines;
}

export interface FittedText {
  lines: string[];
  scale: number;
  /** total block height */
  height: number;
}

/** pick the largest integer scale (<= maxScale) whose wrapped block fits maxW x maxH; falls back to scale 1 */
export function fitText(t: string, maxW: number, maxH: number, maxScale = 3): FittedText {
  for (let s = maxScale; s >= 1; s--) {
    const lines = wrapText(t, maxW, s);
    const gap = s + 1;
    const total = lines.length * GLYPH_H * s + (lines.length - 1) * gap;
    if (total <= maxH) return { lines, scale: s, height: total };
  }
  const lines = wrapText(t, maxW, 1);
  const maxLines = Math.max(1, Math.floor((maxH + 2) / (GLYPH_H + 2)));
  const cut = lines.slice(0, maxLines);
  return { lines: cut, scale: 1, height: cut.length * GLYPH_H + (cut.length - 1) * 2 };
}

/** draw a centred multi-line block inside the box */
export function drawTextBlock(c: Canvas, ft: FittedText, cx: number, top: number, fg: Paint, shadow?: Paint): void {
  const gap = ft.scale + 1;
  let y = top;
  for (const ln of ft.lines) {
    const w = textWidth(ln, ft.scale);
    const x = Math.round(cx - w / 2);
    if (shadow) drawTextShadow(c, ln, x, y, fg, shadow, ft.scale);
    else drawText(c, ln, x, y, fg, ft.scale);
    y += GLYPH_H * ft.scale + gap;
  }
}
