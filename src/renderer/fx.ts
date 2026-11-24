/**
 * FX pixel rasterizers: EffectKind, Wisp ghost-stroke, Wonder Whispers, and Poke Invites ->
 * system FX region ids drawn into the actor plane.
 * 200 starlight bubble, 201 echo butterfly, 202 relic mooncat, 203 constellation crown,
 * 221 rainbow, 222 prism beam, 223 droplet, 224 flower, 225 comet-car, 226 gem, 227 gold doodle,
 * 228 trampoline, 229 constellation, 230 slide-cloud, 231 wisp core, 232 wisp aura, 233 wonder chalk.
 * All writes go through PixelPlane (bounds-clamped).
 */
import type { WonderSketchDot } from '../contracts/art';
import type { CausalityKind } from '../contracts/causality';
import { PAGE_H, PAGE_W } from '../contracts/constants';
import { REGION_INK } from '../contracts/regions';
import type { EffectRenderState, PokeInvite, WispRenderState, WonderWhisperHint } from '../contracts/simulation';
import { PixelPlane } from './pixelPlane';
import { clamp01, easeInOut, easeOut, mulberry32 } from './rng';

export type WonderSketchFn = (
  effect: CausalityKind,
  box: { x0: number; y0: number; x1: number; y1: number },
  timeMs: number,
) => WonderSketchDot[];

export const FX_ID = {
  starlightBubble: 200,
  echoButterfly: 201,
  relicMooncat: 202,
  constellationCrown: 203,
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
  wispCore: 231,
  wispAura: 232,
  wonderChalk: 233,
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
      const rx = e.x2 !== undefined && Number.isFinite(e.x2) ? Math.max(16, Math.abs(e.x2 - e.x)) : 70;
      const ry = e.y2 !== undefined && Number.isFinite(e.y2) ? Math.max(10, Math.abs(e.y2 - e.y)) : 24;
      for (let i = 0; i < 48; i++) {
        const a = (i / 48) * Math.PI * 2;
        if (i % 2 === 0) p.put(e.x + Math.cos(a) * rx, e.y + Math.sin(a) * ry, FX_ID.goldDoodle);
      }
      for (let s = 0; s < 6; s++) {
        const a = age * 0.0026 + (s * Math.PI * 2) / 6;
        const sx = e.x + Math.cos(a) * rx;
        const sy = e.y + Math.sin(a) * ry;
        const twinkle = Math.sin(age * 0.012 + s * 1.7) > 0;
        p.put(sx, sy, FX_ID.goldDoodle);
        if (twinkle) {
          p.put(sx - 1, sy, FX_ID.goldDoodle);
          p.put(sx + 1, sy, FX_ID.goldDoodle);
          p.put(sx, sy - 1, FX_ID.goldDoodle);
          p.put(sx, sy + 1, FX_ID.goldDoodle);
        }
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
    case 'bubblePop': {
      if (t < 0.45) {
        const r = 3 + 7 * easeOut(t / 0.45);
        for (let i = 0; i < 24; i++) {
          const a = (i / 24) * Math.PI * 2;
          p.put(e.x + Math.cos(a) * r, e.y + Math.sin(a) * r, FX_ID.starlightBubble, 1);
        }
        // Specular prism crescent highlight on top-left of bubble
        p.put(e.x - r * 0.45, e.y - r * 0.45, FX_ID.prism, 2);
        p.put(e.x - r * 0.25, e.y - r * 0.55, FX_ID.prism, 2);
      }
      if (t >= 0.3) {
        const popT = easeOut((t - 0.3) / 0.7);
        const rPop = 5 + 18 * popT;
        for (let i = 0; i < 10; i++) {
          const a = (i / 10) * Math.PI * 2 + rnd() * 0.35;
          const dr = rPop * (0.75 + rnd() * 0.35);
          const bx = e.x + Math.cos(a) * dr;
          const by = e.y + Math.sin(a) * dr;
          p.put(bx, by, FX_ID.starlightBubble, (i % 2) + 1);
          if (i % 2 === 0) p.put(bx + Math.cos(a), by + Math.sin(a), FX_ID.prism, (i % 6) + 1);
        }
      }
      break;
    }
    case 'meteorStreak': {
      const x1 = num(e.x2, e.x + 70);
      const y1 = num(e.y2, e.y + 18);
      const dx = x1 - e.x;
      const dy = y1 - e.y;
      const dist = Math.hypot(dx, dy);
      const f = easeOut(t);
      const hx = e.x + dx * f;
      const hy = e.y + dy * f - Math.sin(f * Math.PI) * 8;
      if (!Number.isFinite(hx) || !Number.isFinite(hy)) break;
      const ux = Number.isFinite(dist) && dist > 0.001 ? dx / dist : 1;
      const uy = Number.isFinite(dist) && dist > 0.001 ? dy / dist : 0;
      const nx = -uy;
      const ny = ux;
      const tailLen = Math.min(20, Number.isFinite(dist) ? Math.max(10, dist * 0.32) : 18);
      p.line(hx, hy, hx - ux * tailLen, hy - uy * tailLen, FX_ID.cometCar, 1);
      p.line(hx + nx, hy + ny, hx - ux * (tailLen * 0.7) + nx, hy - uy * (tailLen * 0.7) + ny, FX_ID.goldDoodle, 2);
      p.line(hx - nx, hy - ny, hx - ux * (tailLen * 0.7) - nx, hy - uy * (tailLen * 0.7) - ny, FX_ID.goldDoodle, 1);
      p.disc(hx, hy, 1.8, FX_ID.goldDoodle, 2);
      p.put(hx, hy, FX_ID.prism, 2);
      for (let i = 1; i <= 4; i++) {
        const back = i * 4.2 + rnd() * 2;
        const spread = (rnd() - 0.5) * 4;
        p.put(hx - ux * back + nx * spread, hy - uy * back + ny * spread, i % 2 === 0 ? FX_ID.goldDoodle : FX_ID.cometCar, 1);
      }
      break;
    }
    case 'lightningZap': {
      const x1 = num(e.x2, e.x + 48);
      const y1 = num(e.y2, e.y + 14);
      const dx = x1 - e.x;
      const dy = y1 - e.y;
      const dist = Math.hypot(dx, dy);
      if (!Number.isFinite(dist) || dist < 0.5) {
        star(p, e.x, e.y, 3, FX_ID.goldDoodle);
        break;
      }
      const nx = -dy / dist;
      const ny = dx / dist;
      const segs = 6;
      const upTo = Math.max(1, Math.ceil(easeOut(t) * segs));
      const crackle = Math.floor(age / 70);
      let px = e.x;
      let py = e.y;
      for (let i = 1; i <= upTo; i++) {
        const u = i / segs;
        const jitter = i === segs ? 0 : (((i + crackle) & 1) === 0 ? 1 : -1) * (2.5 + rnd() * 4.5);
        const qx = e.x + dx * u + nx * jitter;
        const qy = e.y + dy * u + ny * jitter;
        p.line(px, py, qx, qy, FX_ID.goldDoodle, 2);
        p.line(px + nx, py + ny, qx + nx, qy + ny, FX_ID.constellation, 1);
        px = qx;
        py = qy;
      }
      if (t > 0.2) star(p, px, py, 2, FX_ID.prism);
      break;
    }
    case 'crownFireworks': {
      const sc = 0.55 + 0.65 * easeOut(clamp01(t * 1.4));
      const bx0 = e.x - 10 * sc;
      const bx1 = e.x + 10 * sc;
      const by = e.y + 4 * sc;
      // Royal 3-peak crown silhouette
      p.line(bx0, by, bx1, by, FX_ID.constellationCrown, 2);
      p.line(bx0, by + 1, bx1, by + 1, FX_ID.constellationCrown, 1);
      const lx = e.x - 11 * sc;
      const ly = e.y - 5 * sc;
      const mx = e.x;
      const my = e.y - 9 * sc;
      const rx = e.x + 11 * sc;
      const ry = e.y - 5 * sc;
      const vlx = e.x - 5 * sc;
      const vrx = e.x + 5 * sc;
      const vy = e.y - 1 * sc;
      p.line(bx0, by, lx, ly, FX_ID.constellationCrown, 2);
      p.line(lx, ly, vlx, vy, FX_ID.constellationCrown, 2);
      p.line(vlx, vy, mx, my, FX_ID.constellationCrown, 2);
      p.line(mx, my, vrx, vy, FX_ID.constellationCrown, 2);
      p.line(vrx, vy, rx, ry, FX_ID.constellationCrown, 2);
      p.line(rx, ry, bx1, by, FX_ID.constellationCrown, 2);
      diamond(p, lx, ly - 1, 1, FX_ID.gem);
      diamond(p, mx, my - 1, 2, FX_ID.gem);
      diamond(p, rx, ry - 1, 1, FX_ID.gem);
      // Radiant golden & aurora firework burst rays
      const rIn = 8 + 10 * easeOut(t);
      const rOut = 14 + 34 * easeOut(t);
      for (let i = 0; i < 8; i++) {
        const a = (i / 8) * Math.PI * 2 + rnd() * 0.2;
        const ca = Math.cos(a);
        const sa = Math.sin(a);
        const id = i % 2 === 0 ? FX_ID.constellationCrown : FX_ID.constellation;
        p.line(e.x + ca * rIn, e.y + sa * rIn, e.x + ca * rOut, e.y + sa * rOut, id, 1);
        p.put(e.x + ca * (rOut + 2), e.y + sa * (rOut + 2), FX_ID.gem, 2);
      }
      break;
    }
    case 'magnetArc': {
      const x1 = num(e.x2, e.x + 56);
      const y1 = num(e.y2, e.y - 34);
      const dx = x1 - e.x;
      const dy = y1 - e.y;
      const dist = Math.hypot(dx, dy);
      const bow = Number.isFinite(dist) && dist > 0.001 ? Math.min(dist * 0.32, 42) : 16;
      const nx = Number.isFinite(dist) && dist > 0.001 ? -dy / dist : 0;
      const ny = Number.isFinite(dist) && dist > 0.001 ? dx / dist : -1;
      const cx = (e.x + x1) * 0.5 + nx * bow;
      const cy = (e.y + y1) * 0.5 + ny * bow;
      p.curve(e.x, e.y, cx, cy, x1, y1, easeOut(t), FX_ID.constellation, 1);
      const u = easeInOut(t);
      const inv = 1 - u;
      const ox = inv * inv * e.x + 2 * inv * u * cx + u * u * x1;
      const oy = inv * inv * e.y + 2 * inv * u * cy + u * u * y1;
      diamond(p, ox, oy, 2, FX_ID.gem);
      p.put(ox, oy, FX_ID.goldDoodle, 2);
      for (let k = 1; k <= 3; k++) {
        const uk = clamp01(u - k * 0.08);
        const ik = 1 - uk;
        const tx = ik * ik * e.x + 2 * ik * uk * cx + uk * uk * x1;
        const ty = ik * ik * e.y + 2 * ik * uk * cy + uk * uk * y1;
        p.put(tx, ty, k === 1 ? FX_ID.goldDoodle : FX_ID.constellation, 1);
      }
      break;
    }
    case 'echoTrail': {
      const x1 = num(e.x2, e.x + 64);
      const y1 = num(e.y2, e.y - 20);
      const dx = x1 - e.x;
      const dy = y1 - e.y;
      const f = easeInOut(t);
      const phaseOff = rnd() * Math.PI * 2;
      for (let i = 1; i <= 9; i++) {
        const ff = Math.max(0, f - i * 0.045);
        const fx = e.x + dx * ff;
        const fy = e.y + dy * ff + Math.sin(ff * Math.PI * 3 + phaseOff) * 7;
        const id = i % 2 === 0 ? FX_ID.prism : FX_ID.echoButterfly;
        p.put(fx, fy, id, (i % 4) + 1);
        if (i <= 4) {
          p.put(fx - 1, fy - 1, FX_ID.echoButterfly, 1);
          p.put(fx + 1, fy - 1, FX_ID.echoButterfly, 1);
        }
      }
      const bx = e.x + dx * f;
      const by = e.y + dy * f + Math.sin(f * Math.PI * 3 + phaseOff) * 7;
      if (Number.isFinite(bx) && Number.isFinite(by)) {
        const flap = Math.sin(age * 0.024) > 0 ? 2 : 1;
        // Miniature flapping butterfly silhouette
        p.put(bx, by, FX_ID.prism, 2);
        p.put(bx, by + 1, FX_ID.prism, 1);
        for (let wy = -flap; wy <= 1; wy++) {
          p.put(bx - 1, by + wy, FX_ID.echoButterfly, 2);
          p.put(bx + 1, by + wy, FX_ID.echoButterfly, 2);
          p.put(bx - 2, by + wy - (flap > 1 ? 1 : 0), FX_ID.echoButterfly, 1);
          p.put(bx + 2, by + wy - (flap > 1 ? 1 : 0), FX_ID.echoButterfly, 1);
        }
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

/**
 * Draws a lush, clearly readable 2-3px curved pastel rainbow ghost-stroke ribbon along `wisp.ghostPath`
 * up to `wisp.ghostStrokeT` whenever `wisp.active && wisp.mode !== 'hidden' && wisp.ghostPath.length >= 2`
 * (covering both prologue AND Firefly Hint `hintBeam` modes using FX_ID.rainbow 221 + glowing 231/232 tip sparkles).
 */
export function rasterizeWispGhostStroke(p: PixelPlane, wisp: WispRenderState | undefined, timeMs: number): void {
  if (!wisp || !wisp.active || wisp.mode === 'hidden' || wisp.ghostPath.length < 2) return;
  const progress = clamp01(wisp.ghostStrokeT);
  if (progress <= 0.005) return;
  const pts = wisp.ghostPath;
  let totalLen = 0;
  for (let i = 1; i < pts.length; i++) {
    const a = pts[i - 1]!;
    const b = pts[i]!;
    if (!Number.isFinite(a.x) || !Number.isFinite(a.y) || !Number.isFinite(b.x) || !Number.isFinite(b.y)) continue;
    totalLen += Math.hypot(b.x - a.x, b.y - a.y);
  }
  if (totalLen < 0.5) return;

  const drawLen = totalLen * progress;
  const safeTime = Number.isFinite(timeMs) ? timeMs : 0;
  const hueShift = Math.floor(safeTime / 140);
  const pulseTick = Math.floor(safeTime / 180) & 1;
  const spacing = Math.max(0.55, drawLen / 480); // dense continuous ribbon with zero diagonal holes, capped
  let walked = 0;
  let nextSample = 0;
  let sampleIdx = 0;
  let tipX = NaN;
  let tipY = NaN;

  for (let i = 1; i < pts.length && walked < drawLen; i++) {
    const a = pts[i - 1]!;
    const b = pts[i]!;
    if (!Number.isFinite(a.x) || !Number.isFinite(a.y) || !Number.isFinite(b.x) || !Number.isFinite(b.y)) continue;
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    const segLen = Math.hypot(dx, dy);
    if (segLen < 0.001) continue;
    const nx = -dy / segLen;
    const ny = dx / segLen;
    const segEnd = Math.min(walked + segLen, drawLen);

    while (nextSample <= segEnd && sampleIdx < 600) {
      const local = (nextSample - walked) / segLen;
      const sx = a.x + dx * local;
      const sy = a.y + dy * local;
      const u = nextSample / Math.max(drawLen, 1);
      tipX = sx;
      tipY = sy;

      // Full lush 3px curved pastel rainbow ribbon (tapers gently to 2px at entry tip u < 0.08)
      const offsets = u < 0.08 ? [-0.5, 0.5] : [-1.2, -0.4, 0.4, 1.2];
      const baseHue = Math.floor(u * 6 + sampleIdx * 0.06) + hueShift;
      for (let oi = 0; oi < offsets.length; oi++) {
        const off = offsets[oi]!;
        const px = Math.floor(sx + nx * off);
        const py = Math.floor(sy + ny * off);
        const band = (((baseHue + oi * 2) % 6) + 6) % 6 + 1;
        p.put(px, py, FX_ID.rainbow, band);
      }

      // Shimmering fairy-aura stardust flanking the ribbon
      if (sampleIdx % 8 === 0 && u >= 0.08) {
        const side = (sampleIdx & 1) === 0 ? 2.6 : -2.6;
        p.put(sx + nx * side, sy + ny * side, FX_ID.wispAura, 1);
      }

      nextSample += spacing;
      sampleIdx++;
    }
    walked += segLen;
  }

  if (Number.isFinite(tipX) && Number.isFinite(tipY)) {
    const tx = Math.floor(tipX);
    const ty = Math.floor(tipY);
    // Glowing 231 core cross + 232 fairy aura halo sparkles at the leading stroke tip
    p.put(tx, ty, FX_ID.wispCore, 2);
    p.put(tx - 1, ty, FX_ID.wispCore, 1);
    p.put(tx + 1, ty, FX_ID.wispCore, 1);
    p.put(tx, ty - 1, FX_ID.wispCore, 1);
    p.put(tx, ty + 1, FX_ID.wispCore, 1);
    p.put(tx - 1, ty - 1, FX_ID.wispAura, 2);
    p.put(tx + 1, ty - 1, FX_ID.wispAura, 2);
    p.put(tx - 1, ty + 1, FX_ID.wispAura, 2);
    p.put(tx + 1, ty + 1, FX_ID.wispAura, 2);
    p.put(tx - 2, ty, FX_ID.wispAura, 1);
    p.put(tx + 2, ty, FX_ID.wispAura, 1);
    p.put(tx, ty - 2, FX_ID.wispAura, 1);
    p.put(tx, ty + 2, FX_ID.wispAura, 1);
    if (pulseTick === 0) {
      p.put(tx - 3, ty, FX_ID.wispCore, 1);
      p.put(tx + 3, ty, FX_ID.wispCore, 1);
      p.put(tx, ty - 3, FX_ID.wispCore, 1);
      p.put(tx, ty + 3, FX_ID.wispCore, 1);
    }
  }
}

const scratchWonderBox = { x0: 0, y0: 0, x1: 0, y1: 0 };

function putDottedLine(
  p: PixelPlane,
  x0: number,
  y0: number,
  x1: number,
  y1: number,
  stepPx: number,
  phase: number,
  shadeA: 1 | 2,
  shadeB: 1 | 2,
): void {
  const dx = x1 - x0;
  const dy = y1 - y0;
  const len = Math.hypot(dx, dy);
  if (len < 0.5 || !Number.isFinite(len)) return;
  const count = Math.min(80, Math.max(1, Math.floor(len / stepPx)));
  for (let i = 0; i <= count; i++) {
    const t = clamp01((i + phase) / (count + 1));
    p.put(x0 + dx * t, y0 + dy * t, FX_ID.wonderChalk, (i & 1) === 0 ? shadeA : shadeB);
  }
}

function putDottedQuad(
  p: PixelPlane,
  x0: number,
  y0: number,
  cx: number,
  cy: number,
  x1: number,
  y1: number,
  dots: number,
  phase: number,
  shadeA: 1 | 2,
  shadeB: 1 | 2,
): void {
  const n = Math.min(96, Math.max(2, dots));
  for (let i = 0; i < n; i++) {
    const t = clamp01((i + phase) / n);
    const u = 1 - t;
    const x = u * u * x0 + 2 * u * t * cx + t * t * x1;
    const y = u * u * y0 + 2 * u * t * cy + t * t * y1;
    p.put(x, y, FX_ID.wonderChalk, (i & 1) === 0 ? shadeA : shadeB);
  }
}

/** Procedural fallback for Causality Wonder Whispers covering all 5 causality kinds (233, shade 1 | 2). */
function fallbackWonderWhisper(
  p: PixelPlane,
  effect: CausalityKind,
  x0: number,
  y0: number,
  x1: number,
  y1: number,
  timeMs: number,
): void {
  const cx = (x0 + x1) * 0.5;
  const cy = (y0 + y1) * 0.5;
  const w = Math.max(16, x1 - x0);
  const h = Math.max(12, y1 - y0);
  const march = ((timeMs * 0.0025) % 1 + 1) % 1;
  const bob = Math.sin(timeMs * 0.0045) * 1.5;

  switch (effect) {
    case 'rainbowSlide': {
      // Dotted curved slide arc sweeping off the cloud + arrow tip
      const sx = x1 - Math.min(8, w * 0.15);
      const sy = cy + bob * 0.4;
      const ex = Math.min(PAGE_W - 8, x1 + 42);
      const ey = Math.min(PAGE_H - 10, y1 + 34);
      const ctrlX = (sx + ex) * 0.5 + 14;
      const ctrlY = (sy + ey) * 0.5 - 8;
      putDottedQuad(p, sx, sy - 2, ctrlX, ctrlY - 2, ex, ey - 2, 16, march, 1, 2);
      putDottedQuad(p, sx, sy + 2, ctrlX, ctrlY + 2, ex, ey + 2, 16, march, 2, 1);
      // Tiny dotted arrow tip at slide end
      p.put(ex, ey, FX_ID.wonderChalk, 2);
      p.put(ex - 3, ey - 2, FX_ID.wonderChalk, 1);
      p.put(ex - 2, ey - 5, FX_ID.wonderChalk, 2);
      p.put(ex - 5, ey - 1, FX_ID.wonderChalk, 1);
      break;
    }
    case 'starlightFlowerRain': {
      // Dotted falling droplets beneath the cloud + tiny dotted flower sprout buds at the bottom
      const dropBottom = Math.min(PAGE_H - 10, y1 + 46);
      const cols = 4;
      for (let c = 0; c < cols; c++) {
        const dx = x0 + ((c + 0.5) / cols) * w;
        const colMarch = (march + c * 0.27) % 1;
        putDottedLine(p, dx, y1 + 3, dx, dropBottom - 8, 6, colMarch, 1, 2);
      }
      // Three tiny dotted flower sprout buds at the bottom
      const budY = Math.min(PAGE_H - 5, dropBottom);
      for (let f = 0; f < 3; f++) {
        const fx = cx + (f - 1) * Math.max(12, w * 0.32);
        const by = budY + Math.round(Math.sin(timeMs * 0.005 + f * 1.4));
        p.put(fx, by, FX_ID.wonderChalk, 1);
        p.put(fx, by - 3, FX_ID.wonderChalk, 1);
        p.put(fx, by - 6, FX_ID.wonderChalk, 2);
        p.put(fx - 2, by - 6, FX_ID.wonderChalk, 2);
        p.put(fx + 2, by - 6, FX_ID.wonderChalk, 2);
        p.put(fx, by - 8, FX_ID.wonderChalk, 2);
      }
      break;
    }
    case 'zeroGTrampoline': {
      // Dotted upward bouncy arcs + tiny sparkle chevrons above the cloud
      const span = Math.max(18, w * 0.48);
      const topY = Math.max(12, y0 - 4);
      const hop = Math.abs(Math.sin(timeMs * 0.0055)) * 3;
      putDottedQuad(p, cx - span, topY, cx, topY - 20 - hop, cx + span, topY, 15, march * 0.5, 1, 2);
      putDottedQuad(p, cx - span * 0.65, topY - 6, cx, topY - 26 - hop, cx + span * 0.65, topY - 6, 11, (march + 0.5) % 1, 2, 1);
      // Upward bounce chevrons above apex
      for (let k = -1; k <= 1; k++) {
        const ax = cx + k * 11;
        const ay = Math.max(4, topY - 19 - hop - (k === 0 ? 4 : 0));
        p.put(ax, ay, FX_ID.wonderChalk, 2);
        p.put(ax - 2, ay + 2, FX_ID.wonderChalk, 1);
        p.put(ax + 2, ay + 2, FX_ID.wonderChalk, 1);
      }
      break;
    }
    case 'cheetahRacetrack': {
      // Dotted banked race-loop ellipse encircling the planet + speed chevrons
      const rx = Math.max(24, w * 0.72);
      const ry = Math.max(12, h * 0.44);
      const dots = 28;
      const rot = timeMs * 0.0012;
      for (let i = 0; i < dots; i++) {
        const a = (i / dots) * Math.PI * 2 + rot;
        p.put(cx + Math.cos(a) * rx, cy + Math.sin(a) * ry, FX_ID.wonderChalk, (i & 1) === 0 ? 1 : 2);
      }
      // Two tiny speed chevrons orbiting the loop
      for (let s = 0; s < 2; s++) {
        const a = rot * 2.2 + s * Math.PI;
        const sx = cx + Math.cos(a) * rx;
        const sy = cy + Math.sin(a) * ry;
        const dir = Math.sin(a) >= 0 ? -1 : 1;
        p.put(sx, sy, FX_ID.wonderChalk, 2);
        p.put(sx - dir * 3, sy - 2, FX_ID.wonderChalk, 2);
        p.put(sx - dir * 3, sy + 2, FX_ID.wonderChalk, 2);
      }
      break;
    }
    case 'discoMirage': {
      // Dotted radiating prism star-beams fanning out from the planet
      const innerR = Math.max(10, Math.min(w, h) * 0.45);
      const outerR = innerR + 24;
      const spin = timeMs * 0.00055;
      for (let i = 0; i < 6; i++) {
        const a = (i * Math.PI) / 3 + spin;
        const ca = Math.cos(a);
        const sa = Math.sin(a);
        putDottedLine(
          p,
          cx + ca * innerR,
          cy + sa * innerR,
          cx + ca * outerR,
          cy + sa * outerR,
          4.5,
          (march + i * 0.17) % 1,
          1,
          2,
        );
        // Tiny star tip
        const tx = cx + ca * (outerR + 3);
        const ty = cy + sa * (outerR + 3);
        p.put(tx, ty, FX_ID.wonderChalk, 2);
        p.put(tx - 1, ty, FX_ID.wonderChalk, 1);
        p.put(tx + 1, ty, FX_ID.wonderChalk, 1);
        p.put(tx, ty - 1, FX_ID.wonderChalk, 1);
        p.put(tx, ty + 1, FX_ID.wonderChalk, 1);
      }
      break;
    }
    case 'gentleSparkle':
      break;
  }
}

/**
 * Rasterizes dotted Wonder Whisper charcoal sketch points into `PixelPlane` using `FX_ID.wonderChalk` (233)
 * and variant `shade` (1 or 2). Delegates to `wonderSketch` if provided, otherwise uses a built-in procedural fallback.
 */
export function rasterizeWonderWhisper(
  p: PixelPlane,
  hint: WonderWhisperHint | null | undefined,
  timeMs: number,
  wonderSketch?: WonderSketchFn,
): void {
  if (!hint || hint.effect === 'gentleSparkle') return;
  const hasBox =
    Number.isFinite(hint.x0) &&
    Number.isFinite(hint.y0) &&
    Number.isFinite(hint.x1) &&
    Number.isFinite(hint.y1);
  if (!hasBox && (!Number.isFinite(hint.x) || !Number.isFinite(hint.y))) return;
  const x0 = hasBox ? hint.x0 : hint.x - 22;
  const y0 = hasBox ? hint.y0 : hint.y - 14;
  const x1 = hasBox ? hint.x1 : hint.x + 22;
  const y1 = hasBox ? hint.y1 : hint.y + 14;
  const safeTime = Number.isFinite(timeMs) ? timeMs : 0;

  if (wonderSketch) {
    scratchWonderBox.x0 = x0;
    scratchWonderBox.y0 = y0;
    scratchWonderBox.x1 = x1;
    scratchWonderBox.y1 = y1;
    const dots = wonderSketch(hint.effect, scratchWonderBox, safeTime);
    for (let i = 0; i < dots.length; i++) {
      const d = dots[i]!;
      p.put(d.x, d.y, FX_ID.wonderChalk, d.shade === 2 ? 2 : 1);
    }
    return;
  }

  fallbackWonderWhisper(p, hint.effect, x0, y0, x1, y1, safeTime);
}

/**
 * Draws crisp, high-contrast pulsing concentric dashed poke-invitation rings around each invite `(x, y)`
 * alternating 2px luminous gold (`227`/`231`) dashes with deep-indigo (`0`) / violet (`232`) contrast dots
 * and 4 crisp cardinal cross-sparkles so invitations pop on BOTH cream paper and dark night sky.
 */
export function rasterizePokeInvites(
  p: PixelPlane,
  invites: readonly PokeInvite[] | undefined,
  timeMs: number,
): void {
  if (!invites || invites.length === 0) return;
  const safeTime = Number.isFinite(timeMs) && timeMs >= 0 ? timeMs : 0;

  for (let idx = 0; idx < invites.length; idx++) {
    const inv = invites[idx]!;
    if (!Number.isFinite(inv.x) || !Number.isFinite(inv.y)) continue;
    if (inv.x < -40 || inv.x > PAGE_W + 40 || inv.y < -40 || inv.y > PAGE_H + 40) continue;
    const warm = inv.firstAwake;
    const ringCount = warm ? 3 : 2;
    const period = warm ? 1400 : 1800;
    const minR = warm ? 11 : 10;
    const maxR = warm ? 29 : 24;
    const steps = warm ? 32 : 24;
    const cardinalStep = steps / 4;

    for (let rIdx = 0; rIdx < ringCount; rIdx++) {
      const ph = ((safeTime / period) + rIdx / ringCount) % 1;
      const r = minR + (maxR - minR) * easeOut(ph);
      const rot = safeTime * 0.00075 * (rIdx % 2 === 0 ? 1 : -1) + idx * 0.5;
      const fading = ph > 0.85;

      for (let s = 0; s < steps; s++) {
        const cardinal = s % cardinalStep === 0;
        if (fading && !cardinal && (s & 1) === 1) continue;
        const a = (s / steps) * Math.PI * 2 + rot;
        const ca = Math.cos(a);
        const sa = Math.sin(a);
        const ix = Math.floor(inv.x + ca * r);
        const iy = Math.floor(inv.y + sa * r);

        if (cardinal) {
          // 4 crisp cardinal cross-sparkles with gold arms, luminous core, and ink anchor for cream paper contrast
          p.put(ix, iy, FX_ID.wispCore, 2);
          p.put(ix - 1, iy, FX_ID.goldDoodle, 2);
          p.put(ix + 1, iy, FX_ID.goldDoodle, 2);
          p.put(ix, iy - 1, FX_ID.goldDoodle, 2);
          p.put(ix, iy + 1, FX_ID.goldDoodle, 2);
          if (!fading) {
            p.put(ix + 1, iy + 1, REGION_INK, 0);
            p.put(ix - 1, iy + 1, REGION_INK, 0);
            if (warm || rIdx === 0) {
              p.put(ix - 2, iy, FX_ID.wispAura, 2);
              p.put(ix + 2, iy, FX_ID.wispAura, 2);
              p.put(ix, iy - 2, FX_ID.wispAura, 2);
              p.put(ix, iy + 2, FX_ID.wispAura, 2);
            }
          }
          continue;
        }

        // Guaranteed distinct 8-adjacent tangent step for crisp 2px dash segments
        const tx = -sa;
        const ty = ca;
        const stepX = Math.abs(tx) >= Math.abs(ty) ? (tx >= 0 ? 1 : -1) : Math.round(tx);
        const stepY = Math.abs(ty) > Math.abs(tx) ? (ty >= 0 ? 1 : -1) : Math.round(ty);

        if ((s & 1) === 0) {
          // 2px luminous gold dash (227 / 231)
          const headId = warm || rIdx === 0 ? FX_ID.goldDoodle : FX_ID.wispCore;
          const tailId = (s & 2) === 0 ? FX_ID.wispCore : FX_ID.goldDoodle;
          p.put(ix, iy, headId, 2);
          if (!fading) {
            p.put(ix + stepX, iy + stepY, tailId, 1);
          }
        } else {
          // Alternating deep-indigo (0) + vivid violet (232) contrast pair for cream paper & dark sky legibility
          if ((s & 3) === 1) {
            p.put(ix, iy, REGION_INK, 0);
            p.put(ix + stepX, iy + stepY, FX_ID.wispAura, 1);
          } else {
            p.put(ix, iy, FX_ID.wispAura, 2);
            p.put(ix + stepX, iy + stepY, REGION_INK, 0);
          }
        }
      }
    }
  }
}

export const FX_PAGE_W = PAGE_W;
