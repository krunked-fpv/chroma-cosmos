/**
 * Direct-colour RGBA canvas used by the illustration generators.
 * Every painter takes a flat colour or a per-pixel shader; `obj()` composites a layer with an
 * automatic 1px ink outline and top-left rim light so every object reads as hand-inked pixel art.
 * Pure + deterministic.
 */
import { INK_HEX } from '../../contracts/constants';
import { hexToRgb } from '../palette';

export type RGB = readonly [number, number, number];
export type Shader = (x: number, y: number) => RGB;
export type Paint = RGB | Shader;

export const rgb = (hex: string): RGB => hexToRgb(hex);
export const INK: RGB = rgb(INK_HEX);
export const WHITE: RGB = [255, 255, 255];
export const CREAM: RGB = rgb('#fff6dc');
export const SHADOW_TINT: RGB = rgb('#3a2470');

export function mix(a: RGB, b: RGB, t: number): RGB {
  const k = t < 0 ? 0 : t > 1 ? 1 : t;
  return [Math.round(a[0] + (b[0] - a[0]) * k), Math.round(a[1] + (b[1] - a[1]) * k), Math.round(a[2] + (b[2] - a[2]) * k)];
}
export const light = (c: RGB, t: number): RGB => mix(c, [255, 250, 235], t);
export const shade = (c: RGB, t: number): RGB => mix(c, SHADOW_TINT, t);
export const key = (c: RGB): number => (c[0] << 16) | (c[1] << 8) | c[2];

const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5];
/** ordered-dither threshold in (0,1) */
export function bayer(x: number, y: number): number {
  return ((BAYER[((y & 3) << 2) | (x & 3)] as number) + 0.5) / 16;
}
/** dither between two colours with coverage t (0..1) */
export function dith(a: RGB, b: RGB, t: number, x: number, y: number): RGB {
  return t > bayer(x, y) ? b : a;
}

/** cheap deterministic value noise 0..1 */
export function hash2(x: number, y: number, s = 0): number {
  let h = Math.imul(x | 0, 374761393) ^ Math.imul(y | 0, 668265263) ^ Math.imul(s | 0, 2147483647);
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  h ^= h >>> 16;
  return (h >>> 0) / 4294967296;
}
export function vnoise(x: number, y: number, s = 0): number {
  const xi = Math.floor(x);
  const yi = Math.floor(y);
  const fx = x - xi;
  const fy = y - yi;
  const u = fx * fx * (3 - 2 * fx);
  const v = fy * fy * (3 - 2 * fy);
  const a = hash2(xi, yi, s);
  const b = hash2(xi + 1, yi, s);
  const c = hash2(xi, yi + 1, s);
  const d = hash2(xi + 1, yi + 1, s);
  return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
}

/** colour ramp across stops (t in 0..1) */
export function ramp(stops: readonly RGB[], t: number): RGB {
  if (stops.length === 1) return stops[0] as RGB;
  const k = Math.max(0, Math.min(0.99999, t)) * (stops.length - 1);
  const i = Math.floor(k);
  return mix(stops[i] as RGB, stops[i + 1] as RGB, k - i);
}
/** hard-banded ramp (no blending) */
export function bands(stops: readonly RGB[], t: number): RGB {
  const i = Math.max(0, Math.min(stops.length - 1, Math.floor(t * stops.length)));
  return stops[i] as RGB;
}
/** vertical gradient shader between y0..y1 */
export function vgrad(y0: number, y1: number, stops: readonly RGB[], dither = false): Shader {
  return (x, y) => {
    const t = (y - y0) / (y1 - y0 || 1);
    if (!dither) return ramp(stops, t);
    const tt = Math.max(0, Math.min(0.99999, t)) * (stops.length - 1);
    const i = Math.floor(tt);
    return dith(stops[i] as RGB, stops[i + 1] as RGB, tt - i, x, y);
  };
}
/** gradient along an arbitrary axis */
export function lgrad(x0: number, y0: number, x1: number, y1: number, stops: readonly RGB[], dither = false): Shader {
  const dx = x1 - x0;
  const dy = y1 - y0;
  const l2 = dx * dx + dy * dy || 1;
  return (x, y) => {
    const t = ((x - x0) * dx + (y - y0) * dy) / l2;
    if (!dither) return ramp(stops, t);
    const tt = Math.max(0, Math.min(0.99999, t)) * (stops.length - 1);
    const i = Math.floor(tt);
    return dith(stops[i] as RGB, stops[i + 1] as RGB, tt - i, x, y);
  };
}
export function rgrad(cx: number, cy: number, r: number, stops: readonly RGB[], dither = false): Shader {
  return (x, y) => {
    const t = Math.hypot(x - cx, y - cy) / (r || 1);
    if (!dither) return ramp(stops, t);
    const tt = Math.max(0, Math.min(0.99999, t)) * (stops.length - 1);
    const i = Math.floor(tt);
    return dith(stops[i] as RGB, stops[i + 1] as RGB, tt - i, x, y);
  };
}

export type Pt = readonly [number, number];

function col(p: Paint, x: number, y: number): RGB {
  return typeof p === 'function' ? p(x, y) : p;
}

export interface ObjOpts {
  /** outline colour; false disables the outline */
  ink?: RGB | false;
  /** rim-light strength 0..1 (default 0.28); 0 disables */
  rim?: number;
  /** extra-deep shadow band (2px) */
  deep?: boolean;
  /** ink outline width (default 1) */
  thick?: number;
}

export class Canvas {
  readonly w: number;
  readonly h: number;
  readonly data: Uint8ClampedArray;

  constructor(w: number, h: number) {
    this.w = w;
    this.h = h;
    this.data = new Uint8ClampedArray(w * h * 4);
  }

  inb(x: number, y: number): boolean {
    return x >= 0 && y >= 0 && x < this.w && y < this.h;
  }
  set(x: number, y: number, c: RGB, a = 255): void {
    x = Math.round(x);
    y = Math.round(y);
    if (!this.inb(x, y)) return;
    const o = (y * this.w + x) * 4;
    this.data[o] = c[0];
    this.data[o + 1] = c[1];
    this.data[o + 2] = c[2];
    this.data[o + 3] = a;
  }
  /** source-over blend, a = 0..255 */
  over(x: number, y: number, c: RGB, a: number): void {
    if (!this.inb(x, y) || a <= 0) return;
    const o = (y * this.w + x) * 4;
    const da = this.data[o + 3] as number;
    if (a >= 255 || da === 0) {
      this.data[o] = c[0];
      this.data[o + 1] = c[1];
      this.data[o + 2] = c[2];
      this.data[o + 3] = Math.max(a, da === 0 ? a : da);
      return;
    }
    const sa = a / 255;
    const dd = (da / 255) * (1 - sa);
    const oa = sa + dd;
    this.data[o] = (c[0] * sa + (this.data[o] as number) * dd) / oa;
    this.data[o + 1] = (c[1] * sa + (this.data[o + 1] as number) * dd) / oa;
    this.data[o + 2] = (c[2] * sa + (this.data[o + 2] as number) * dd) / oa;
    this.data[o + 3] = oa * 255;
  }
  alpha(x: number, y: number): number {
    if (!this.inb(x, y)) return 0;
    return this.data[(y * this.w + x) * 4 + 3] as number;
  }
  get(x: number, y: number): RGB {
    if (!this.inb(x, y)) return [0, 0, 0];
    const o = (y * this.w + x) * 4;
    return [this.data[o] as number, this.data[o + 1] as number, this.data[o + 2] as number];
  }

  fill(p: Paint): void {
    for (let y = 0; y < this.h; y++) for (let x = 0; x < this.w; x++) this.set(x, y, col(p, x, y));
  }

  /** Generic shape: test() gets pixel-centre coordinates. */
  shape(x0: number, y0: number, x1: number, y1: number, test: (px: number, py: number) => boolean, p: Paint): void {
    const ax = Math.max(0, Math.floor(x0));
    const ay = Math.max(0, Math.floor(y0));
    const bx = Math.min(this.w - 1, Math.ceil(x1));
    const by = Math.min(this.h - 1, Math.ceil(y1));
    for (let y = ay; y <= by; y++) {
      for (let x = ax; x <= bx; x++) {
        if (test(x + 0.5, y + 0.5)) this.set(x, y, col(p, x, y));
      }
    }
  }
  /** half-open box */
  rect(x0: number, y0: number, x1: number, y1: number, p: Paint): void {
    this.shape(x0, y0, x1, y1, (x, y) => x >= x0 && x < x1 && y >= y0 && y < y1, p);
  }
  rrect(x0: number, y0: number, x1: number, y1: number, r: number, p: Paint): void {
    this.shape(
      x0,
      y0,
      x1,
      y1,
      (x, y) => {
        if (x < x0 || x >= x1 || y < y0 || y >= y1) return false;
        const cx = x < x0 + r ? x0 + r : x > x1 - r ? x1 - r : x;
        const cy = y < y0 + r ? y0 + r : y > y1 - r ? y1 - r : y;
        return (x - cx) * (x - cx) + (y - cy) * (y - cy) <= r * r;
      },
      p,
    );
  }
  disc(cx: number, cy: number, r: number, p: Paint): void {
    const r2 = r * r;
    this.shape(cx - r, cy - r, cx + r, cy + r, (x, y) => (x - cx) * (x - cx) + (y - cy) * (y - cy) <= r2, p);
  }
  ring(cx: number, cy: number, r0: number, r1: number, p: Paint): void {
    this.shape(
      cx - r1,
      cy - r1,
      cx + r1,
      cy + r1,
      (x, y) => {
        const d = (x - cx) * (x - cx) + (y - cy) * (y - cy);
        return d <= r1 * r1 && d >= r0 * r0;
      },
      p,
    );
  }
  ellipse(cx: number, cy: number, rx: number, ry: number, p: Paint, rot = 0): void {
    const co = Math.cos(rot);
    const si = Math.sin(rot);
    const m = Math.max(rx, ry);
    this.shape(
      cx - m,
      cy - m,
      cx + m,
      cy + m,
      (x, y) => {
        const dx = x - cx;
        const dy = y - cy;
        const u = (dx * co + dy * si) / rx;
        const v = (-dx * si + dy * co) / ry;
        return u * u + v * v <= 1;
      },
      p,
    );
  }
  /** elliptical annulus (outer rx,ry; inner scaled by `k`) */
  ering(cx: number, cy: number, rx: number, ry: number, k: number, p: Paint, rot = 0): void {
    const co = Math.cos(rot);
    const si = Math.sin(rot);
    const m = Math.max(rx, ry);
    this.shape(
      cx - m,
      cy - m,
      cx + m,
      cy + m,
      (x, y) => {
        const dx = x - cx;
        const dy = y - cy;
        const u = (dx * co + dy * si) / rx;
        const v = (-dx * si + dy * co) / ry;
        const d = u * u + v * v;
        return d <= 1 && d >= k * k;
      },
      p,
    );
  }
  poly(pts: readonly Pt[], p: Paint): void {
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
  /** tapered capsule from (x0,y0) radius r0 to (x1,y1) radius r1 */
  capsule(x0: number, y0: number, x1: number, y1: number, r0: number, p: Paint, r1 = r0): void {
    const dx = x1 - x0;
    const dy = y1 - y0;
    const l2 = dx * dx + dy * dy || 1;
    const m = Math.max(r0, r1);
    this.shape(
      Math.min(x0, x1) - m,
      Math.min(y0, y1) - m,
      Math.max(x0, x1) + m,
      Math.max(y0, y1) + m,
      (x, y) => {
        let t = ((x - x0) * dx + (y - y0) * dy) / l2;
        t = t < 0 ? 0 : t > 1 ? 1 : t;
        const r = r0 + (r1 - r0) * t;
        const qx = x0 + dx * t - x;
        const qy = y0 + dy * t - y;
        return qx * qx + qy * qy <= r * r;
      },
      p,
    );
  }
  /** smooth (Catmull-Rom) tapered stroke through points */
  stroke(pts: readonly Pt[], r0: number, p: Paint, r1 = r0, smooth = true): void {
    const path = smooth ? catmull(pts, 6) : pts;
    const n = path.length;
    for (let i = 0; i + 1 < n; i++) {
      const a = path[i] as Pt;
      const b = path[i + 1] as Pt;
      const ta = i / (n - 1);
      const tb = (i + 1) / (n - 1);
      this.capsule(a[0], a[1], b[0], b[1], r0 + (r1 - r0) * ta, p, r0 + (r1 - r0) * tb);
    }
  }
  /** annular sector between angles a0..a1 (radians, y down) */
  arc(cx: number, cy: number, r0: number, r1: number, a0: number, a1: number, p: Paint): void {
    this.shape(
      cx - r1,
      cy - r1,
      cx + r1,
      cy + r1,
      (x, y) => {
        const dx = x - cx;
        const dy = y - cy;
        const d = dx * dx + dy * dy;
        if (d > r1 * r1 || d < r0 * r0) return false;
        let a = Math.atan2(dy, dx);
        while (a < a0) a += Math.PI * 2;
        return a <= a1;
      },
      p,
    );
  }
  line(x0: number, y0: number, x1: number, y1: number, p: Paint): void {
    let x = Math.round(x0);
    let y = Math.round(y0);
    const ex = Math.round(x1);
    const ey = Math.round(y1);
    const dx = Math.abs(ex - x);
    const dy = -Math.abs(ey - y);
    const sx = x < ex ? 1 : -1;
    const sy = y < ey ? 1 : -1;
    let err = dx + dy;
    for (let g = 0; g < 4000; g++) {
      this.set(x, y, col(p, x, y));
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
  polyline(pts: readonly Pt[], p: Paint): void {
    for (let i = 0; i + 1 < pts.length; i++) {
      const a = pts[i] as Pt;
      const b = pts[i + 1] as Pt;
      this.line(a[0], a[1], b[0], b[1], p);
    }
  }
  dot(x: number, y: number, p: Paint): void {
    const rx = Math.round(x);
    const ry = Math.round(y);
    this.set(rx, ry, col(p, rx, ry));
  }
  star(cx: number, cy: number, R: number, r: number, p: Paint, n = 5, rot = -Math.PI / 2): void {
    const pts: Pt[] = [];
    for (let i = 0; i < n * 2; i++) {
      const rr = i % 2 === 0 ? R : r;
      const a = rot + (i * Math.PI) / n;
      pts.push([cx + Math.cos(a) * rr, cy + Math.sin(a) * rr]);
    }
    this.poly(pts, p);
  }
  heart(cx: number, cy: number, s: number, p: Paint): void {
    // classic implicit heart, s = half-width
    this.shape(
      cx - s * 1.1,
      cy - s * 1.1,
      cx + s * 1.1,
      cy + s * 1.1,
      (x, y) => {
        const u = (x - cx) / s;
        const v = -(y - cy) / s + 0.1;
        const q = u * u + v * v - 1;
        return q * q * q - u * u * v * v * v <= 0;
      },
      p,
    );
  }
  /** 4-point twinkle: arms of length r, bright centre */
  sparkle(cx: number, cy: number, r: number, c: RGB = WHITE, core: RGB = WHITE): void {
    const x = Math.round(cx);
    const y = Math.round(cy);
    for (let i = 1; i <= r; i++) {
      const a = i <= r / 2 ? 255 : 170;
      this.over(x - i, y, c, a);
      this.over(x + i, y, c, a);
      this.over(x, y - i, c, a);
      this.over(x, y + i, c, a);
    }
    if (r >= 3) {
      this.over(x - 1, y - 1, c, 200);
      this.over(x + 1, y - 1, c, 200);
      this.over(x - 1, y + 1, c, 200);
      this.over(x + 1, y + 1, c, 200);
    }
    this.set(x, y, core);
  }
  /** soft additive-looking radial glow (alpha-blended) */
  glow(cx: number, cy: number, r: number, c: RGB, strength = 0.5, dither = true): void {
    const x0 = Math.max(0, Math.floor(cx - r));
    const x1 = Math.min(this.w - 1, Math.ceil(cx + r));
    const y0 = Math.max(0, Math.floor(cy - r));
    const y1 = Math.min(this.h - 1, Math.ceil(cy + r));
    for (let y = y0; y <= y1; y++) {
      for (let x = x0; x <= x1; x++) {
        const d = Math.hypot(x + 0.5 - cx, y + 0.5 - cy) / r;
        if (d >= 1) continue;
        const t = (1 - d) * (1 - d) * strength;
        if (dither) {
          if (t > bayer(x, y) * 0.9) this.over(x, y, c, 255 * Math.min(1, 0.55 + t));
        } else this.over(x, y, c, 255 * t);
      }
    }
  }

  /** source-over composite of another canvas at an offset */
  blit(src: Canvas, ox = 0, oy = 0): void {
    for (let y = 0; y < src.h; y++) {
      for (let x = 0; x < src.w; x++) {
        const o = (y * src.w + x) * 4;
        const a = src.data[o + 3] as number;
        if (a === 0) continue;
        this.over(x + ox, y + oy, [src.data[o] as number, src.data[o + 1] as number, src.data[o + 2] as number], a);
      }
    }
  }

  /**
   * Paint an object on a scratch layer, then composite it with an automatic ink outline
   * (outside the silhouette, over what is already painted) and top-left rim light / bottom-right shade.
   */
  obj(draw: (layer: Canvas) => void, o: ObjOpts = {}): void {
    const l = new Canvas(this.w, this.h);
    draw(l);
    const rim = o.rim ?? 0.28;
    if (rim > 0) rimLight(l, rim, o.deep ?? false);
    const ink = o.ink === undefined ? INK : o.ink;
    if (ink) {
      const t = o.thick ?? 1;
      for (let y = 0; y < this.h; y++) {
        for (let x = 0; x < this.w; x++) {
          if (l.alpha(x, y) > 0) continue;
          let hit = false;
          for (let dy = -t; dy <= t && !hit; dy++) {
            for (let dx = -t; dx <= t; dx++) {
              if (Math.abs(dx) + Math.abs(dy) > t) continue;
              if (l.alpha(x + dx, y + dy) >= 128) {
                hit = true;
                break;
              }
            }
          }
          if (hit) this.set(x, y, ink);
        }
      }
    }
    this.blit(l);
  }
}

/** in-place rim light on a layer using its alpha silhouette */
export function rimLight(l: Canvas, strength: number, deep: boolean): void {
  const src = l.data.slice();
  const a = (x: number, y: number): number => (x < 0 || y < 0 || x >= l.w || y >= l.h ? 0 : (src[(y * l.w + x) * 4 + 3] as number));
  for (let y = 0; y < l.h; y++) {
    for (let x = 0; x < l.w; x++) {
      if (a(x, y) < 128) continue;
      const o = (y * l.w + x) * 4;
      const c: RGB = [src[o] as number, src[o + 1] as number, src[o + 2] as number];
      const hi = a(x - 1, y) < 128 || a(x, y - 1) < 128;
      const lo = a(x + 1, y) < 128 || a(x, y + 1) < 128;
      let out: RGB | null = null;
      if (lo && !hi) out = shade(c, strength + 0.12);
      else if (hi && !lo) out = light(c, strength);
      else if (!hi && !lo && deep && (a(x + 2, y) < 128 || a(x, y + 2) < 128 || a(x + 1, y + 1) < 128)) out = shade(c, strength * 0.55);
      if (out) {
        l.data[o] = out[0];
        l.data[o + 1] = out[1];
        l.data[o + 2] = out[2];
      }
    }
  }
}

export function catmull(pts: readonly Pt[], seg: number): Pt[] {
  if (pts.length < 3) return pts.slice();
  const out: Pt[] = [];
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[Math.max(0, i - 1)] as Pt;
    const p1 = pts[i] as Pt;
    const p2 = pts[i + 1] as Pt;
    const p3 = pts[Math.min(pts.length - 1, i + 2)] as Pt;
    for (let s = 0; s < seg; s++) {
      const t = s / seg;
      const t2 = t * t;
      const t3 = t2 * t;
      const f = (a: number, b: number, c: number, d: number): number =>
        0.5 * (2 * b + (-a + c) * t + (2 * a - 5 * b + 4 * c - d) * t2 + (-a + 3 * b - 3 * c + d) * t3);
      out.push([f(p0[0], p1[0], p2[0], p3[0]), f(p0[1], p1[1], p2[1], p3[1])]);
    }
  }
  out.push(pts[pts.length - 1] as Pt);
  return out;
}

/** Nearest-neighbour upscale of an internal canvas to exactly w x h (k = integer pixel size). */
export function upscale(src: Canvas, k: number, w: number, h: number): { width: number; height: number; data: Uint8ClampedArray } {
  const data = new Uint8ClampedArray(w * h * 4);
  for (let y = 0; y < h; y++) {
    const sy = Math.min(src.h - 1, Math.floor(y / k));
    for (let x = 0; x < w; x++) {
      const sx = Math.min(src.w - 1, Math.floor(x / k));
      const so = (sy * src.w + sx) * 4;
      const o = (y * w + x) * 4;
      data[o] = src.data[so] as number;
      data[o + 1] = src.data[so + 1] as number;
      data[o + 2] = src.data[so + 2] as number;
      data[o + 3] = src.data[so + 3] as number;
    }
  }
  return { width: w, height: h, data };
}
