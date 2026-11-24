/**
 * FX pixel rasterizers: EffectKind -> system FX region ids drawn into the actor plane.
 * 221 rainbow, 222 prism beam, 223 droplet, 224 flower, 225 comet-car, 226 gem, 227 gold doodle,
 * 228 trampoline, 229 constellation, 230 slide-cloud. All writes go through PixelPlane (bounds-clamped).
 */
import { PAGE_H, PAGE_W } from '../contracts/constants';
import type { EffectRenderState } from '../contracts/simulation';
import { PixelPlane } from './pixelPlane';
import { clamp01, easeInOut, easeOut, mulberry32 } from './rng';

export const FX_ID = {
  rainbow: 221,
  prism: 222,
  droplet: 223,
  flower: 224,
  cometCar: 225,
  gem: 226,
  goldDoodle: 227,
  trampoline: 228,
  constellation: 229,
  slideCloud: 230,
} as const;

const num = (v: number | undefined, d: number): number => (v !== undefined && Number.isFinite(v) ? v : d);

/** Rainbow bands (variant 1..6, outer to inner) along a quadratic arc. */
function rainbowArcBands(p: PixelPlane, e: EffectRenderState, heightFrac: number, upTo: number, bandCount = 6): void {
  const x1 = num(e.x2, e.x + 60);
  const y1 = num(e.y2, e.y);
  const dist = Math.hypot(x1 - e.x, y1 - e.y);
  const cx = (e.x + x1) / 2;
  const cy = (e.y + y1) / 2 - dist * heightFrac * 2;
  for (let b = 0; b < bandCount; b++) p.curve(e.x, e.y, cx, cy, x1, y1, upTo, FX_ID.rainbow, b + 1, b - bandCount / 2);
}

function slideCloud(p: PixelPlane, x: number, y: number, scale = 1): void {
  p.disc(x, y, 5 * scale, FX_ID.slideCloud);
  p.disc(x - 7 * scale, y + 2 * scale, 4 * scale, FX_ID.slideCloud);
  p.disc(x + 7 * scale, y + 2 * scale, 4 * scale, FX_ID.slideCloud);
}

function diamond(p: PixelPlane, cx: number, cy: number, r: number, id: number): void {
  const x = Math.floor(cx);
  const y = Math.floor(cy);
  for (let dy = -r; dy <= r; dy++) {
    const w = r - Math.abs(dy);
    for (let dx = -w; dx <= w; dx++) p.put(x + dx, y + dy, id);
  }
}

function star(p: PixelPlane, cx: number, cy: number, r: number, id: number): void {
  const x = Math.floor(cx);
  const y = Math.floor(cy);
  for (let i = -r; i <= r; i++) {
    p.put(x + i, y, id);
    p.put(x, y + i, id);
  }
  p.put(x - 1, y - 1, id);
  p.put(x + 1, y - 1, id);
  p.put(x - 1, y + 1, id);
  p.put(x + 1, y + 1, id);
}

function drawFlower(p: PixelPlane, x: number, baseY: number, h: number): void {
  const hh = Math.floor(h);
  for (let i = 0; i < hh; i++) p.put(x, baseY - i, FX_ID.flower, 1);
  if (hh >= 3) {
    const ty = baseY - hh;
    p.put(x, ty, FX_ID.flower, 2);
    p.put(x - 1, ty, FX_ID.flower, 2);
    p.put(x + 1, ty, FX_ID.flower, 2);
    p.put(x, ty - 1, FX_ID.flower, 2);
    p.put(x, ty + 1, FX_ID.flower, 2);
  }
}

export function rasterizeEffect(p: PixelPlane, e: EffectRenderState): void {
  if (!Number.isFinite(e.x) || !Number.isFinite(e.y)) return;
  const t = clamp01(e.t);
  const age = num(e.ageMs, 0);
  const rnd = mulberry32(e.seed | 0);
  switch (e.kind) {
    case 'rainbowArc':
      rainbowArcBands(p, e, 0.32, easeOut(t));
      break;
    case 'rainbowBridge':
      rainbowArcBands(p, e, 0.16, easeOut(t * 1.4));
      break;
    case 'harmonyArc':
      rainbowArcBands(p, e, 0.3, easeOut(t), 4);
      break;
    case 'rainbowSlide': {
      const x1 = num(e.x2, e.x + 70);
      const y1 = num(e.y2, e.y + 70);
      const px = (x: number, k: number): number => x + k;
      const len = Math.hypot(x1 - e.x, y1 - e.y) || 1;
      const nx = -(y1 - e.y) / len;
      const ny = (x1 - e.x) / len;
      const up = easeOut(t);
      for (let b = 0; b < 6; b++) {
        const off = b - 3;
        p.curve(
          px(e.x, nx * off),
          e.y + ny * off,
          (e.x + x1) / 2 + nx * off + len * 0.18,
          (e.y + y1) / 2 + ny * off - len * 0.05,
          px(x1, nx * off),
          y1 + ny * off,
          up,
          FX_ID.rainbow,
          b + 1,
        );
      }
      slideCloud(p, e.x, e.y - 3);
      break;
    }
    case 'starlightFlowerRain': {
      const floorY = Math.min(num(e.y2, e.y + 90), PAGE_H - 4);
      for (let i = 0; i < 16; i++) {
        const dx = (rnd() - 0.5) * 44;
        const phase = rnd() * 70;
        const fall = ((age * 0.05 + phase) % 70) / 70;
        const dy = 6 + fall * (floorY - e.y);
        if (t < 0.85) {
          p.put(e.x + dx, e.y + dy, FX_ID.droplet);
          p.put(e.x + dx, e.y + dy + 1, FX_ID.droplet);
        }
      }
      const baseY = Math.min(floorY, PAGE_H - 2);
      const grow = easeOut(clamp01((t - 0.25) / 0.6));
      for (let i = 0; i < 10; i++) {
        const fx = e.x + (rnd() - 0.5) * 130;
        const hgt = (3 + rnd() * 6) * grow;
        drawFlower(p, Math.floor(fx), Math.floor(baseY), hgt);
      }
      slideCloud(p, e.x, e.y - 2, 0.8);
      break;
    }
    case 'zeroGTrampoline': {
      const w = 24 * easeOut(clamp01(t * 4));
      const sag = 5 + Math.sin(age * 0.012) * 2;
      p.curve(e.x - w, e.y, e.x, e.y + sag * 2, e.x + w, e.y, 1, FX_ID.trampoline, 1);
      p.curve(e.x - w, e.y + 1, e.x, e.y + sag * 2 + 1, e.x + w, e.y + 1, 1, FX_ID.trampoline, 1);
      p.line(e.x - w, e.y, e.x - w - 2, e.y + 9, FX_ID.trampoline, 2);
      p.line(e.x + w, e.y, e.x + w + 2, e.y + 9, FX_ID.trampoline, 2);
      break;
    }
    case 'cheetahRacetrack': {
      const rx = Math.abs(num(e.x2, 70));
      const ry = Math.abs(num(e.y2, 24));
      for (let i = 0; i < 48; i++) {
        const a = (i / 48) * Math.PI * 2;
        if (i % 2 === 0) p.put(e.x + Math.cos(a) * rx, e.y + Math.sin(a) * ry, FX_ID.goldDoodle);
      }
      for (let c = 0; c < 3; c++) {
        const a = age * 0.0022 + (c * Math.PI * 2) / 3;
        const cx = e.x + Math.cos(a) * rx;
        const cy = e.y + Math.sin(a) * ry;
        const dir = -Math.sin(a) >= 0 ? 1 : -1;
        p.rect(cx - 3, cy - 2, 7, 3, FX_ID.cometCar, 1);
        p.rect(cx - dir * 5, cy - 1, 2, 1, FX_ID.cometCar, 2);
        p.put(cx - 2, cy + 1, FX_ID.cometCar, 3);
        p.put(cx + 2, cy + 1, FX_ID.cometCar, 3);
      }
      break;
    }
    case 'discoMirage': {
      const grow = easeOut(t * 2);
      for (let i = 0; i < 6; i++) {
        const a = (i * Math.PI) / 3 + age * 0.0006;
        const len = (24 + 80 * grow) * (0.7 + 0.3 * Math.sin(age * 0.004 + i));
        p.line(e.x, e.y, e.x + Math.cos(a) * len, e.y + Math.sin(a) * len * 0.8, FX_ID.prism, (i % 7) + 1);
      }
      p.disc(e.x, e.y, 2, FX_ID.prism);
      break;
    }
    case 'gemPickup': {
      const bob = Math.sin(age * 0.006) * 1.5;
      diamond(p, e.x, e.y + bob, 3, FX_ID.gem);
      break;
    }
    case 'hiddenStar': {
      const r = 2 + (Math.sin(age * 0.008) > 0.2 ? 1 : 0);
      star(p, e.x, e.y, r, FX_ID.goldDoodle);
      break;
    }
    case 'goldDoodle': {
      const x1 = num(e.x2, e.x + 40);
      const y1 = num(e.y2, e.y);
      const steps = 14;
      const upTo = Math.floor(easeOut(t) * steps);
      let px = e.x;
      let py = e.y;
      for (let i = 1; i <= upTo; i++) {
        const f = i / steps;
        const nx = e.x + (x1 - e.x) * f;
        const ny = e.y + (y1 - e.y) * f + (i % 2 === 0 ? -1 : 1) * (3 + rnd() * 3);
        p.line(px, py, nx, ny, FX_ID.goldDoodle);
        px = nx;
        py = ny;
      }
      break;
    }
    case 'constellationFireworks': {
      const r = 8 + 56 * easeOut(t);
      let prevX = e.x;
      let prevY = e.y;
      for (let i = 0; i < 7; i++) {
        const a = rnd() * Math.PI * 2;
        const rr = r * (0.55 + rnd() * 0.45);
        const nx = e.x + Math.cos(a) * rr;
        const ny = e.y + Math.sin(a) * rr;
        p.line(prevX, prevY, nx, ny, FX_ID.constellation);
        p.rect(nx - 1, ny - 1, 2, 2, FX_ID.constellation);
        prevX = nx;
        prevY = ny;
      }
      break;
    }
    case 'paintSplatComet': {
      const x1 = num(e.x2, e.x + 60);
      const y1 = num(e.y2, e.y + 30);
      const f = easeInOut(t);
      const hx = e.x + (x1 - e.x) * f;
      const hy = e.y + (y1 - e.y) * f - Math.sin(f * Math.PI) * 14;
      p.disc(hx, hy, 1.5, FX_ID.prism, 3);
      for (let i = 1; i <= 5; i++) {
        const ff = Math.max(0, f - i * 0.03);
        p.put(e.x + (x1 - e.x) * ff, e.y + (y1 - e.y) * ff - Math.sin(ff * Math.PI) * 14, FX_ID.prism, 5);
      }
      break;
    }
    case 'shootingStar': {
      const x1 = num(e.x2, e.x + 80);
      const y1 = num(e.y2, e.y + 20);
      const f = easeOut(t);
      const hx = e.x + (x1 - e.x) * f;
      const hy = e.y + (y1 - e.y) * f;
      p.rect(hx - 1, hy - 1, 2, 2, FX_ID.goldDoodle);
      const len = Math.hypot(x1 - e.x, y1 - e.y) || 1;
      p.line(hx, hy, hx - ((x1 - e.x) / len) * 14, hy - ((y1 - e.y) / len) * 14, FX_ID.goldDoodle);
      break;
    }
    case 'chromaticRipple': {
      const r = 4 + 44 * easeOut(t);
      for (let i = 0; i < 40; i++) {
        const a = (i / 40) * Math.PI * 2;
        if (i % 2 === 0) p.put(e.x + Math.cos(a) * r, e.y + Math.sin(a) * r, FX_ID.prism, (i % 7) + 1);
      }
      break;
    }
    // particle-only effects
    case 'starBurst':
    case 'paperDust':
    case 'stardustTrail':
    case 'gentleSparkle':
      break;
  }
}

/** Draws all effects (oldest first). */
export function rasterizeEffects(p: PixelPlane, effects: readonly EffectRenderState[]): void {
  for (const e of effects) rasterizeEffect(p, e);
}

export const FX_PAGE_W = PAGE_W;
