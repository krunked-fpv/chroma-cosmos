/**
 * ASCII pixel-grid toolkit for hand-authored sprites.
 * A grid is rows of characters; a legend maps each character to a region id
 * ('.' = transparent 255, '#' = ink 0). Parts are composed into frames; finishSprite()
 * then wraps silhouettes in a 1px ink outline and inks the seams between regions.
 */
import type { AnimName, SpriteAnim, SpriteFrame, SpriteSheet } from '../contracts/art';

export type Legend = Record<string, number>;

export interface Grid {
  w: number;
  h: number;
  px: Uint8Array;
}

export const T = 255;

export function parseGrid(rows: readonly string[], legend: Legend): Grid {
  const h = rows.length;
  const w = Math.max(...rows.map((r) => r.length));
  const px = new Uint8Array(w * h).fill(T);
  rows.forEach((row, y) => {
    for (let x = 0; x < row.length; x++) {
      const ch = row[x] as string;
      if (ch === '.' || ch === ' ') continue;
      if (ch === '#') {
        px[y * w + x] = 0;
        continue;
      }
      const v = legend[ch];
      if (v === undefined) throw new Error(`sprite legend missing '${ch}' (row ${y} col ${x})`);
      px[y * w + x] = v;
    }
  });
  return { w, h, px };
}

export interface Layer {
  g: Grid;
  x: number;
  y: number;
  flip?: boolean;
}

export function blank(w: number, h: number): Grid {
  return { w, h, px: new Uint8Array(w * h).fill(T) };
}

/** Compose layers into a w*h canvas; later layers overwrite earlier ones. */
export function compose(w: number, h: number, layers: readonly Layer[]): Grid {
  const out = blank(w, h);
  for (const l of layers) {
    for (let y = 0; y < l.g.h; y++) {
      for (let x = 0; x < l.g.w; x++) {
        const v = l.g.px[y * l.g.w + (l.flip ? l.g.w - 1 - x : x)] as number;
        if (v === T) continue;
        const ox = l.x + x;
        const oy = l.y + y;
        if (ox < 0 || oy < 0 || ox >= w || oy >= h) continue;
        out.px[oy * w + ox] = v;
      }
    }
  }
  return out;
}

export function mirror(g: Grid): Grid {
  const o = blank(g.w, g.h);
  for (let y = 0; y < g.h; y++) for (let x = 0; x < g.w; x++) o.px[y * g.w + x] = g.px[y * g.w + (g.w - 1 - x)] as number;
  return o;
}

/** Displace selected pixels (e.g. mane / tail ribbons) by a per-pixel offset: used for wave frames. */
export function displace(g: Grid, pick: (v: number) => boolean, dx: (x: number, y: number) => number, dy: (x: number, y: number) => number): Grid {
  const stay = blank(g.w, g.h);
  const move = blank(g.w, g.h);
  for (let y = 0; y < g.h; y++) {
    for (let x = 0; x < g.w; x++) {
      const v = g.px[y * g.w + x] as number;
      if (v === T) continue;
      if (pick(v)) {
        const nx = x + Math.round(dx(x, y));
        const ny = y + Math.round(dy(x, y));
        if (nx >= 0 && ny >= 0 && nx < g.w && ny < g.h) move.px[ny * g.w + nx] = v;
      } else stay.px[y * g.w + x] = v;
    }
  }
  return compose(g.w, g.h, [{ g: stay, x: 0, y: 0 }, { g: move, x: 0, y: 0 }]);
}

export function shifted(g: Grid, dx: number, dy: number): Grid {
  return compose(g.w, g.h, [{ g, x: dx, y: dy }]);
}

function isSys(v: number): boolean {
  return v >= 212 && v <= 233;
}

/**
 * Finish a composed grid into a SpriteFrame:
 *  1) every transparent pixel 4-adjacent to a region pixel becomes ink (outer outline, including gaps);
 *  2) where two different colourable ids touch, the lower-priority one becomes ink.
 * priority: ids ordered FRONT-most first. System ids are exempt from seams.
 */
export function finishSprite(g: Grid, priority: readonly number[], w = g.w, h = g.h): SpriteFrame {
  const src = g.px;
  const out = new Uint8Array(src);
  const rank = (v: number): number => {
    const i = priority.indexOf(v);
    return i < 0 ? 999 : i;
  };
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = y * w + x;
      const a = src[i] as number;
      const nb: number[] = [];
      if (x > 0) nb.push(i - 1);
      if (x < w - 1) nb.push(i + 1);
      if (y > 0) nb.push(i - w);
      if (y < h - 1) nb.push(i + w);
      if (a === T) {
        for (const j of nb) {
          const b = src[j] as number;
          if (b !== T && b !== 0) {
            out[i] = 0;
            break;
          }
        }
        continue;
      }
      if (a === 0 || isSys(a)) continue;
      for (const j of nb) {
        const b = src[j] as number;
        if (b === T || b === 0 || b === a || isSys(b)) continue;
        const ra = rank(a);
        const rb = rank(b);
        if (ra > rb || (ra === rb && a > b)) {
          out[i] = 0;
          break;
        }
      }
    }
  }
  return { w, h, pixels: out };
}

/** Assemble a SpriteSheet; anchor = bottom-centre ("feet") of the shared frame size. */
export function makeSheet(w: number, h: number, anims: Partial<Record<AnimName, SpriteAnim>>): SpriteSheet {
  return { anchorX: Math.floor(w / 2), anchorY: h - 1, anims };
}

export function anim(frames: SpriteFrame[], frameMs: number, loop = true): SpriteAnim {
  return { frames, frameMs, loop };
}

