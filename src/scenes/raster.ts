/**
 * Integer Region-ID raster with painter's-order tracking and the automatic 1px ink pass.
 * Pure + deterministic seeded rasterizer.
 */
import { PAGE_H, PAGE_W } from '../contracts/constants';

export const W = PAGE_W;
export const H = PAGE_H;
export const INK = 0;
export const SKY = 255;

export type Pt = readonly [number, number];

export function isSystemId(id: number): boolean {
  return id >= 212 && id <= 233;
}
export function isGhostId(id: number): boolean {
  return id >= 234 && id <= 254;
}
/** Colourable = canonical/dynamic 1..211 or a ghost (becomes colourable when revealed). */
export function isColourable(id: number): boolean {
  return (id >= 1 && id <= 211) || isGhostId(id);
}

export interface Paint {
  /** only overwrite pixels currently holding one of these ids */
  only?: readonly number[];
  /** never overwrite pixels currently holding one of these ids */
  skip?: readonly number[];
  /** treat the new pixels as lowest paint order (so ink outlines never eat the objects already placed) */
  behind?: boolean;
}

function lut(ids: readonly number[] | undefined): Uint8Array | null {
  if (!ids) return null;
  const t = new Uint8Array(256);
  for (const i of ids) t[i & 255] = 1;
  return t;
}

export class Raster {
  readonly w: number;
  readonly h: number;
  readonly id: Uint8Array;
  readonly z: Uint32Array;
  private op = 1;

  constructor(w = W, h = H) {
    this.w = w;
    this.h = h;
    this.id = new Uint8Array(w * h).fill(SKY);
    this.z = new Uint32Array(w * h);
  }

  /** next paint order stamp */
  nextOp(): number {
    return ++this.op;
  }

  get(x: number, y: number): number {
    if (x < 0 || y < 0 || x >= this.w || y >= this.h) return SKY;
    return this.id[y * this.w + x] as number;
  }

  /** raw single pixel write (used for ink doodles and sprite blits) */
  put(x: number, y: number, id: number, z: number, only?: Uint8Array | null, skip?: Uint8Array | null): void {
    if (x < 0 || y < 0 || x >= this.w || y >= this.h) return;
    const i = y * this.w + x;
    const cur = this.id[i] as number;
    if (only && !only[cur]) return;
    if (skip && skip[cur]) return;
    this.id[i] = id;
    this.z[i] = z;
  }

  /** Generic shape fill: test() receives the pixel CENTRE coordinates (x+0.5, y+0.5). */
  shape(id: number, x0: number, y0: number, x1: number, y1: number, test: (px: number, py: number) => boolean, p?: Paint): void {
    const z = p?.behind ? 1 : ++this.op;
    const only = lut(p?.only);
    const skip = lut(p?.skip);
    const ax = Math.max(0, Math.floor(x0));
    const ay = Math.max(0, Math.floor(y0));
    const bx = Math.min(this.w - 1, Math.ceil(x1));
    const by = Math.min(this.h - 1, Math.ceil(y1));
    for (let y = ay; y <= by; y++) {
      for (let x = ax; x <= bx; x++) {
        if (test(x + 0.5, y + 0.5)) this.put(x, y, id, z, only, skip);
      }
    }
  }

  disc(id: number, cx: number, cy: number, r: number, p?: Paint): void {
    const r2 = r * r;
    this.shape(id, cx - r, cy - r, cx + r, cy + r, (x, y) => (x - cx) * (x - cx) + (y - cy) * (y - cy) <= r2, p);
  }

  ellipse(id: number, cx: number, cy: number, rx: number, ry: number, rot = 0, p?: Paint): void {
    const c = Math.cos(rot);
    const s = Math.sin(rot);
    const m = Math.max(rx, ry);
    this.shape(
      id,
      cx - m,
      cy - m,
      cx + m,
      cy + m,
      (x, y) => {
        const dx = x - cx;
        const dy = y - cy;
        const u = (dx * c + dy * s) / rx;
        const v = (-dx * s + dy * c) / ry;
        return u * u + v * v <= 1;
      },
      p,
    );
  }

  /** half-open box [x0,x1) x [y0,y1) */
  rect(id: number, x0: number, y0: number, x1: number, y1: number, p?: Paint): void {
    this.shape(id, x0, y0, x1, y1, (x, y) => x >= x0 && x < x1 && y >= y0 && y < y1, p);
  }

  /** even-odd polygon fill */
  poly(id: number, pts: readonly Pt[], p?: Paint): void {
    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;
    for (const [x, y] of pts) {
      if (x < minX) minX = x;
      if (x > maxX) maxX = x;
      if (y < minY) minY = y;
      if (y > maxY) maxY = y;
    }
    const n = pts.length;
    this.shape(
      id,
      minX,
      minY,
      maxX,
      maxY,
      (px, py) => {
        let inside = false;
        for (let i = 0, j = n - 1; i < n; j = i++) {
          const a = pts[i] as Pt;
          const b = pts[j] as Pt;
          if (a[1] > py !== b[1] > py) {
            const xi = a[0] + ((py - a[1]) * (b[0] - a[0])) / (b[1] - a[1]);
            if (px < xi) inside = !inside;
          }
        }
        return inside;
      },
      p,
    );
  }

  /** thick segment with round caps */
  capsule(id: number, x0: number, y0: number, x1: number, y1: number, r: number, p?: Paint): void {
    const dx = x1 - x0;
    const dy = y1 - y0;
    const l2 = dx * dx + dy * dy || 1;
    const r2 = r * r;
    this.shape(
      id,
      Math.min(x0, x1) - r,
      Math.min(y0, y1) - r,
      Math.max(x0, x1) + r,
      Math.max(y0, y1) + r,
      (x, y) => {
        let t = ((x - x0) * dx + (y - y0) * dy) / l2;
        t = t < 0 ? 0 : t > 1 ? 1 : t;
        const qx = x0 + dx * t - x;
        const qy = y0 + dy * t - y;
        return qx * qx + qy * qy <= r2;
      },
      p,
    );
  }

  /** 1px Bresenham line (typically with id = 0 for hand-inked doodle strokes) */
  line(id: number, x0: number, y0: number, x1: number, y1: number, p?: Paint): void {
    const z = p?.behind ? 1 : ++this.op;
    const only = lut(p?.only);
    const skip = lut(p?.skip);
    let x = Math.round(x0);
    let y = Math.round(y0);
    const ex = Math.round(x1);
    const ey = Math.round(y1);
    const dx = Math.abs(ex - x);
    const dy = -Math.abs(ey - y);
    const sx = x < ex ? 1 : -1;
    const sy = y < ey ? 1 : -1;
    let err = dx + dy;
    for (let guard = 0; guard < 4000; guard++) {
      this.put(x, y, id, z, only, skip);
      if (x === ex && y === ey) break;
      const e2 = 2 * err;
      if (e2 >= dy) {
        err += dy;
        x += sx;
      }
      if (e2 <= dx) {
        err += dx;
        y += sy;
      }
    }
  }

  /** polyline of 1px segments */
  strokePath(id: number, pts: readonly Pt[], p?: Paint): void {
    for (let i = 0; i + 1 < pts.length; i++) {
      const a = pts[i] as Pt;
      const b = pts[i + 1] as Pt;
      this.line(id, a[0], a[1], b[0], b[1], p);
    }
  }

  /** single ink / id pixel */
  dot(id: number, x: number, y: number, p?: Paint): void {
    const z = p?.behind ? 1 : ++this.op;
    this.put(Math.round(x), Math.round(y), id, z, lut(p?.only), lut(p?.skip));
  }

  /** Blit a sprite-like pixel grid (255 transparent). Single paint order for all pixels. */
  blit(pixels: Uint8Array, sw: number, sh: number, left: number, top: number, flip: boolean, remap?: Record<number, number>): void {
    const z = ++this.op;
    for (let y = 0; y < sh; y++) {
      for (let x = 0; x < sw; x++) {
        let v = pixels[y * sw + (flip ? sw - 1 - x : x)] as number;
        if (v === SKY) continue;
        if (remap) {
          const m = remap[v];
          if (m !== undefined) v = m;
        }
        this.put(left + x, top + y, v, z);
      }
    }
  }

  clone(): Raster {
    const r = new Raster(this.w, this.h);
    r.id.set(this.id);
    r.z.set(this.z);
    r.op = this.op;
    return r;
  }
}

/**
 * Automatic 1px ink pass.
 *  - a sky pixel 4-adjacent to any region pixel becomes ink (outline sits outside objects);
 *  - where two different colourable regions touch, the pixel of the region painted earlier
 *    (lower paint order) becomes ink, so front objects keep their silhouette.
 * System ids (212..233) are fixed-shader accents and never get separated from their neighbours.
 * Guarantees: no two 4-adjacent pixels belong to different colourable regions afterwards.
 */
export function inkPass(ids: Uint8Array, z: Uint32Array, w = W, h = H): Uint8Array {
  const out = ids.slice();
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = y * w + x;
      const a = ids[i] as number;
      if (a === INK) continue;
      const nb: number[] = [];
      if (x > 0) nb.push(i - 1);
      if (x < w - 1) nb.push(i + 1);
      if (y > 0) nb.push(i - w);
      if (y < h - 1) nb.push(i + w);
      if (a === SKY) {
        for (const j of nb) {
          const b = ids[j] as number;
          if (b !== SKY && b !== INK) {
            out[i] = INK;
            break;
          }
        }
        continue;
      }
      if (!isColourable(a)) continue;
      for (const j of nb) {
        const b = ids[j] as number;
        if (b === a || !isColourable(b)) continue;
        const za = z[i] as number;
        const zb = z[j] as number;
        if (za < zb || (za === zb && a > b)) {
          out[i] = INK;
          break;
        }
      }
    }
  }
  return out;
}
