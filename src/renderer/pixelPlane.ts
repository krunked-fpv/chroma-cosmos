/**
 * Pixel plane for the CPU-blitted `uActorTex` (480x270 RGBA): R region id, G variant, A 255 where a pixel exists.
 * Every write is bounds-clamped to the page; nothing can wrap into a neighbouring row.
 */
import { PAGE_H, PAGE_W } from '../contracts/constants';

export class PixelPlane {
  readonly width = PAGE_W;
  readonly height = PAGE_H;
  readonly data = new Uint8Array(PAGE_W * PAGE_H * 4);
  /** number of pixels currently written (cheap emptiness check for upload skipping) */
  count = 0;

  clear(): void {
    if (this.count > 0) this.data.fill(0);
    this.count = 0;
  }

  /** Writes one pixel. Coordinates are rounded down; non-finite or off-page writes are ignored. */
  put(x: number, y: number, id: number, variant = 0): void {
    const ix = Math.floor(x);
    const iy = Math.floor(y);
    if (!(ix >= 0 && iy >= 0 && ix < PAGE_W && iy < PAGE_H)) return;
    const o = (iy * PAGE_W + ix) * 4;
    if (this.data[o + 3] === 0) this.count++;
    this.data[o] = id & 255;
    this.data[o + 1] = variant & 255;
    this.data[o + 3] = 255;
  }

  has(x: number, y: number): boolean {
    const ix = Math.floor(x);
    const iy = Math.floor(y);
    if (!(ix >= 0 && iy >= 0 && ix < PAGE_W && iy < PAGE_H)) return false;
    return this.data[(iy * PAGE_W + ix) * 4 + 3] !== 0;
  }

  idAt(x: number, y: number): number {
    const ix = Math.floor(x);
    const iy = Math.floor(y);
    if (!(ix >= 0 && iy >= 0 && ix < PAGE_W && iy < PAGE_H)) return -1;
    const o = (iy * PAGE_W + ix) * 4;
    return this.data[o + 3] === 0 ? -1 : (this.data[o] as number);
  }

  /** Straight line, sampled densely (capped so absurd coordinates stay cheap). */
  line(x0: number, y0: number, x1: number, y1: number, id: number, variant = 0): void {
    if (![x0, y0, x1, y1].every(Number.isFinite)) return;
    const dx = x1 - x0;
    const dy = y1 - y0;
    const n = Math.min(2048, Math.max(1, Math.ceil(Math.max(Math.abs(dx), Math.abs(dy)) * 1.5)));
    for (let i = 0; i <= n; i++) this.put(x0 + (dx * i) / n, y0 + (dy * i) / n, id, variant);
  }

  disc(cx: number, cy: number, r: number, id: number, variant = 0): void {
    if (![cx, cy, r].every(Number.isFinite)) return;
    const rr = Math.min(Math.max(r, 0), 256);
    const r2 = rr * rr + 0.25;
    const y0 = Math.max(Math.floor(cy - rr), 0);
    const y1 = Math.min(Math.ceil(cy + rr), PAGE_H - 1);
    const x0 = Math.max(Math.floor(cx - rr), 0);
    const x1 = Math.min(Math.ceil(cx + rr), PAGE_W - 1);
    for (let y = y0; y <= y1; y++) {
      for (let x = x0; x <= x1; x++) {
        const ddx = x - Math.floor(cx);
        const ddy = y - Math.floor(cy);
        if (ddx * ddx + ddy * ddy <= r2) this.put(x, y, id, variant);
      }
    }
  }

  rect(x: number, y: number, w: number, h: number, id: number, variant = 0): void {
    if (![x, y, w, h].every(Number.isFinite)) return;
    const x0 = Math.max(Math.floor(x), 0);
    const y0 = Math.max(Math.floor(y), 0);
    const x1 = Math.min(Math.floor(x + w) - 1, PAGE_W - 1);
    const y1 = Math.min(Math.floor(y + h) - 1, PAGE_H - 1);
    for (let yy = y0; yy <= y1; yy++) for (let xx = x0; xx <= x1; xx++) this.put(xx, yy, id, variant);
  }

  /** Quadratic bezier from p0 to p2 through control point c, drawn up to fraction `upTo` (0..1). */
  curve(
    x0: number,
    y0: number,
    cx: number,
    cy: number,
    x1: number,
    y1: number,
    upTo: number,
    id: number,
    variant = 0,
    yOffset = 0,
  ): void {
    if (![x0, y0, cx, cy, x1, y1, upTo].every(Number.isFinite)) return;
    const len = Math.abs(x1 - x0) + Math.abs(y1 - y0) + Math.abs(cx - x0) + Math.abs(cy - y0);
    const n = Math.min(4096, Math.max(2, Math.ceil(len * 1.2)));
    const last = Math.max(0, Math.min(1, upTo));
    for (let i = 0; i <= n; i++) {
      const t = (i / n) * last;
      const u = 1 - t;
      const x = u * u * x0 + 2 * u * t * cx + t * t * x1;
      const y = u * u * y0 + 2 * u * t * cy + t * t * y1;
      this.put(x, y + yOffset, id, variant);
    }
  }

  /** writes the pixel only if the target pixel is currently empty */
  putIfEmpty(x: number, y: number, id: number, variant = 0): void {
    if (!this.has(x, y)) this.put(x, y, id, variant);
  }
}
