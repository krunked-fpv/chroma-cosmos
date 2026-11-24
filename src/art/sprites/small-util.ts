/** Tiny helpers shared by the hand-authored small sprites. */
import type { SpriteFrame } from '../../contracts/art';
import type { Grid, Legend } from '../ascii';
import { T, compose, finishSprite, parseGrid } from '../ascii';

/** Parse rows, padding every row to `w` (so authoring can ignore trailing dots). */
export function art(rows: readonly string[], legend: Legend, w?: number): Grid {
  const ww = w ?? Math.max(...rows.map((r) => r.length));
  return parseGrid(
    rows.map((r) => r.padEnd(ww, '.')),
    legend,
  );
}

/** Overwrite a rectangle of `base` from rows: '.' = keep, '_' = erase, '#' = ink, else legend. */
export function stamp(base: Grid, x0: number, y0: number, rows: readonly string[], legend: Legend = {}): Grid {
  const px = new Uint8Array(base.px);
  rows.forEach((row, dy) => {
    for (let dx = 0; dx < row.length; dx++) {
      const ch = row[dx] as string;
      if (ch === '.') continue;
      const x = x0 + dx;
      const y = y0 + dy;
      if (x < 0 || y < 0 || x >= base.w || y >= base.h) continue;
      let v: number;
      if (ch === '_') v = T;
      else if (ch === '#') v = 0;
      else {
        const l = legend[ch];
        if (l === undefined) throw new Error(`stamp legend missing '${ch}'`);
        v = l;
      }
      px[y * base.w + x] = v;
    }
  });
  return { w: base.w, h: base.h, px };
}

/** Layer grids at offsets over a w*h canvas. */
export function stack(w: number, h: number, ...layers: Array<[Grid, number, number]>): Grid {
  return compose(
    w,
    h,
    layers.map(([g, x, y]) => ({ g, x, y })),
  );
}

export function fin(g: Grid, priority: readonly number[]): SpriteFrame {
  return finishSprite(g, priority);
}

/** Count pixels per id of a finished frame (debug helper). */
export function countIds(f: SpriteFrame): Record<number, number> {
  const out: Record<number, number> = {};
  for (const v of f.pixels) if (v !== T) out[v] = (out[v] ?? 0) + 1;
  return out;
}
