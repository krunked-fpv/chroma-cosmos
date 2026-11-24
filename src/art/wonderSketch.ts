/**
 * Causality "Wonder Whispers" — faint hand-drawn dotted charcoal sketch overlays (480x270).
 * Pure, deterministic, bounds-clamped (0..479, 0..269), zero randomness/timers.
 */
import type { WonderSketchDot } from '../contracts/art';
import type { CausalityKind } from '../contracts/causality';
import { PAGE_H, PAGE_W } from '../contracts/constants';

export interface SketchBox {
  x0: number;
  y0: number;
  x1: number;
  y1: number;
}

class DotCanvas {
  private readonly map = new Map<number, 1 | 2>();

  put(x: number, y: number, shade: 1 | 2 = 1): void {
    const rx = Math.round(x);
    const ry = Math.round(y);
    if (rx < 0 || rx >= PAGE_W || ry < 0 || ry >= PAGE_H) return;
    const k = ry * PAGE_W + rx;
    const prev = this.map.get(k);
    if (prev === undefined || shade < prev) this.map.set(k, shade);
  }

  /** Tiny 4-point hand-drawn sparkle cross. */
  sparkle(x: number, y: number, big: boolean, shade: 1 | 2 = 1): void {
    const rx = Math.round(x);
    const ry = Math.round(y);
    this.put(rx, ry, shade);
    if (!big) return;
    this.put(rx - 2, ry, 2);
    this.put(rx + 2, ry, 2);
    this.put(rx, ry - 2, 2);
    this.put(rx, ry + 2, 2);
  }

  /** Small chevron pointing along unit vector (ux, uy). */
  chevron(x: number, y: number, ux: number, uy: number, arm = 3.2, shade: 1 | 2 = 1): void {
    const nx = -uy;
    const ny = ux;
    this.put(x, y, shade);
    for (let s = 1; s <= Math.ceil(arm); s++) {
      const f = s * 0.95;
      const sh: 1 | 2 = s <= 2 ? shade : 2;
      this.put(x - ux * f + nx * f * 0.78, y - uy * f + ny * f * 0.78, sh);
      this.put(x - ux * f - nx * f * 0.78, y - uy * f - ny * f * 0.78, sh);
    }
  }

  toArray(): WonderSketchDot[] {
    const out: WonderSketchDot[] = [];
    for (const [k, shade] of this.map) {
      out.push({ x: k % PAGE_W, y: (k / PAGE_W) | 0, shade });
    }
    return out;
  }
}

const clamp = (v: number, lo: number, hi: number): number => (v < lo ? lo : v > hi ? hi : v);

function sketchRainbowSlide(c: DotCanvas, x0: number, y0: number, x1: number, y1: number, t: number): void {
  const cx = (x0 + x1) * 0.5;
  const cy = (y0 + y1) * 0.5;
  const bw = Math.max(18, x1 - x0);
  const bh = Math.max(12, y1 - y0);
  const dir = cx > PAGE_W * 0.54 ? -1 : 1;

  const sx = clamp(cx + dir * bw * 0.24, 14, PAGE_W - 14);
  const sy = clamp(cy + bh * 0.14, 16, PAGE_H - 40);
  const reachX = clamp(bw * 0.85, 44, 78);
  const dropY = clamp(bh * 1.45, 34, 58);
  const ex = clamp(sx + dir * reachX, 12, PAGE_W - 12);
  const ey = clamp(sy + dropY, 26, PAGE_H - 14);
  const cpx = sx + (ex - sx) * 0.62;
  const cpy = sy + (ey - sy) * 0.14 + 5;

  const steps = 46;
  const march = Math.floor(t * 11);
  for (let i = 0; i <= steps; i++) {
    const u = i / steps;
    const inv = 1 - u;
    const x = inv * inv * sx + 2 * inv * u * cpx + u * u * ex;
    const y = inv * inv * sy + 2 * inv * u * cpy + u * u * ey;
    const slot = ((i - march) % 4 + 4) % 4;
    if (slot === 0) c.put(x, y, 1);
    else if (slot === 1) c.put(x, y, 2);
    // Faint parallel second slide ribbon
    if (slot === 2) c.put(x - dir * 1.5, y + 5, 2);
  }

  // Tiny marching arrow tip at the end of the slide
  const txRaw = 2 * (ex - cpx);
  const tyRaw = 2 * (ey - cpy);
  const tLen = Math.hypot(txRaw, tyRaw) || 1;
  const ux = txRaw / tLen;
  const uy = tyRaw / tLen;
  const bob = Math.sin(t * 4.2) * 1.8;
  c.chevron(ex + ux * (2.5 + bob), ey + uy * (2.5 + bob), ux, uy, 4, 1);

  // Delicate floating sparkle dots above the slide arc
  const midX = 0.25 * sx + 0.5 * cpx + 0.25 * ex;
  const midY = 0.25 * sy + 0.5 * cpy + 0.25 * ey;
  c.sparkle(midX + dir * 4, midY - 9 + Math.sin(t * 3.5) * 1.5, true, 1);
  c.sparkle(sx + dir * 10, sy - 6 + Math.cos(t * 3.1) * 1.2, false, 2);
  void y0;
}

function sketchStarlightFlowerRain(c: DotCanvas, x0: number, y0: number, x1: number, y1: number, t: number): void {
  const cx = (x0 + x1) * 0.5;
  const span = Math.max(28, Math.min(92, x1 - x0 - 6));
  const left = clamp(cx - span * 0.5, 12, PAGE_W - 40);
  const right = clamp(cx + span * 0.5, left + 24, PAGE_W - 12);

  const topY = clamp(y1 + 3, 14, PAGE_H - 38);
  const floorY = clamp(Math.max(y1 + 42, Math.min(PAGE_H - 14, y1 + 66)), topY + 24, PAGE_H - 8);
  const dropSpan = Math.max(18, floorY - topY - 8);

  // 5 falling dotted starlight raindrop columns
  const cols = 5;
  for (let i = 0; i < cols; i++) {
    const frac = i / (cols - 1);
    const rx = left + (right - left) * frac;
    const phase = (i * 0.37) % 1;
    // 2 staggered raindrops per column
    for (let d = 0; d < 2; d++) {
      const prog = ((t * 0.55 + phase + d * 0.5) % 1 + 1) % 1;
      const dy = topY + prog * dropSpan;
      c.put(rx, dy, 1);
      if (dy - 2 >= topY) c.put(rx, dy - 2, 2);
      if (dy - 4 >= topY) c.put(rx, dy - 4, 2);
    }
  }

  // 4 tiny dotted flower sprout buds along the bottom margin beneath the cloud
  const sprouts = 4;
  for (let i = 0; i < sprouts; i++) {
    const frac = (i + 0.5) / sprouts;
    const bx = left + (right - left) * frac;
    const sway = Math.sin(t * 2.8 + i * 1.4) * 1.1;
    const stemH = 5 + (i % 2);
    // Tiny dotted stem
    c.put(bx, floorY, 2);
    c.put(bx + sway * 0.4, floorY - 2, 2);
    c.put(bx + sway * 0.8, floorY - 4, 2);
    // Tiny leaf ticks
    c.put(bx - 2, floorY - 2, 2);
    c.put(bx + 2, floorY - 2, 2);
    // Dotted flower sprout bud crown
    const fy = floorY - stemH - 1;
    const fx = bx + sway;
    c.put(fx, fy, 1);
    c.put(fx - 2, fy, 2);
    c.put(fx + 2, fy, 2);
    c.put(fx, fy - 2, 1);
    c.put(fx - 1, fy - 1, 2);
    c.put(fx + 1, fy - 1, 2);
  }
  void y0;
}

function sketchZeroGTrampoline(c: DotCanvas, x0: number, y0: number, x1: number, y1: number, t: number): void {
  const cx = (x0 + x1) * 0.5;
  const span = Math.max(26, Math.min(86, x1 - x0 - 4));
  const left = clamp(cx - span * 0.5, 12, PAGE_W - 38);
  const right = clamp(cx + span * 0.5, left + 24, PAGE_W - 12);
  const rimY = clamp(y0 - 3, 30, PAGE_H - 12);
  const flex = Math.sin(t * 4.4) * 1.8;

  // Bouncy dotted cushion rim arching gently above the cloud
  const rimSteps = 18;
  for (let i = 0; i <= rimSteps; i++) {
    if (i % 2 === 1) continue;
    const u = i / rimSteps;
    const arch = Math.sin(u * Math.PI);
    const x = left + (right - left) * u;
    const y = rimY - arch * (3.5 + flex);
    c.put(x, y, i % 4 === 0 ? 1 : 2);
  }

  // 3 dotted upward bouncy jump arcs + apex sparkle chevrons
  const arcs: readonly [number, number, number][] = [
    [-0.28, -0.44, 24],
    [0.0, 0.04, 30],
    [0.28, 0.44, 23],
  ];
  const march = Math.floor(t * 9);
  for (let a = 0; a < arcs.length; a++) {
    const [u0, u1, h] = arcs[a] as [number, number, number];
    const ax0 = cx + span * u0;
    const ax1 = cx + span * u1;
    const apexY = clamp(rimY - h, 6, rimY - 12);
    const steps = 16;
    for (let i = 1; i <= steps; i++) {
      const p = i / steps;
      const x = ax0 + (ax1 - ax0) * p;
      const lift = Math.sin(p * Math.PI * 0.85);
      const y = rimY - 2 - (rimY - 2 - apexY) * lift;
      const slot = ((i - march - a * 2) % 4 + 4) % 4;
      if (slot === 0) c.put(x, y, 1);
      else if (slot === 1) c.put(x, y, 2);
    }
    // Upward bouncing chevron at apex
    const chevBob = Math.sin(t * 4.0 + a * 1.7) * 2.0;
    const chevX = ax0 + (ax1 - ax0) * 0.72;
    const chevY = clamp(apexY - 2 + chevBob, 4, PAGE_H - 6);
    c.chevron(chevX, chevY, 0, -1, 3.2, 1);
    if (a === 1) c.sparkle(chevX + 8, chevY + 4, true, 2);
    if (a === 0) c.sparkle(chevX - 7, chevY + 5, false, 2);
  }
  void y1;
}

function sketchCheetahRacetrack(c: DotCanvas, x0: number, y0: number, x1: number, y1: number, t: number): void {
  const cx = clamp((x0 + x1) * 0.5, 22, PAGE_W - 22);
  const cy = clamp((y0 + y1) * 0.5, 18, PAGE_H - 18);
  const bw = Math.max(22, x1 - x0);
  const bh = Math.max(18, y1 - y0);
  const rx = clamp(bw * 0.62 + 12, 22, 84);
  const ry = clamp(bh * 0.36 + 8, 13, 44);
  const tilt = -0.22;
  const ct = Math.cos(tilt);
  const st = Math.sin(tilt);

  const pt = (ang: number, sx = 1, sy = 1): [number, number] => {
    const lx = Math.cos(ang) * rx * sx;
    const ly = Math.sin(ang) * ry * sy;
    return [cx + lx * ct - ly * st, cy + lx * st + ly * ct];
  };

  // Banked dotted race-loop ellipse (inner + subtle outer banking dots)
  const samples = 72;
  const march = Math.floor(t * 14);
  for (let i = 0; i < samples; i++) {
    const ang = (i / samples) * Math.PI * 2;
    const slot = ((i - march) % 3 + 3) % 3;
    if (slot === 0 || slot === 1) {
      const [px, py] = pt(ang);
      c.put(px, py, slot === 0 ? 1 : 2);
    }
    if (slot === 2) {
      const [ox, oy] = pt(ang, 1.12, 1.14);
      c.put(ox, oy, 2);
    }
  }

  // 3 orbiting speed chevrons racing around the banked ellipse
  const baseAng = t * 1.15;
  for (let k = 0; k < 3; k++) {
    const ang = baseAng + (k * Math.PI * 2) / 3;
    const [px, py] = pt(ang, 1.05, 1.06);
    const dlx = -Math.sin(ang) * rx;
    const dly = Math.cos(ang) * ry;
    const tx = dlx * ct - dly * st;
    const ty = dlx * st + dly * ct;
    const tLen = Math.hypot(tx, ty) || 1;
    const ux = tx / tLen;
    const uy = ty / tLen;
    c.chevron(px, py, ux, uy, 3.2, 1);
    c.chevron(px - ux * 4.5, py - uy * 4.5, ux, uy, 2.5, 2);
  }
}

function sketchDiscoMirage(c: DotCanvas, x0: number, y0: number, x1: number, y1: number, t: number): void {
  const cx = clamp((x0 + x1) * 0.5, 20, PAGE_W - 20);
  const cy = clamp((y0 + y1) * 0.5, 18, PAGE_H - 18);
  const bw = Math.max(20, x1 - x0);
  const bh = Math.max(18, y1 - y0);
  const rStart = clamp(Math.max(bw, bh) * 0.44 + 4, 12, 46);
  const rot = t * 0.38;
  const march = Math.floor(t * 10);

  // Subtle dotted inner prism collar around planet perimeter
  for (let i = 0; i < 16; i++) {
    const ang = rot * 0.5 + (i / 16) * Math.PI * 2;
    c.put(cx + Math.cos(ang) * (rStart - 1), cy + Math.sin(ang) * (rStart - 1) * 0.85, 2);
  }

  // 8 radiating dotted prism star-beams fanning out from the planet
  const beams = 8;
  for (let b = 0; b < beams; b++) {
    const ang = rot + (b / beams) * Math.PI * 2;
    const ux = Math.cos(ang);
    const uy = Math.sin(ang);
    const longBeam = b % 2 === 0;
    const len = longBeam ? 30 : 20;
    const steps = longBeam ? 13 : 9;

    for (let s = 0; s <= steps; s++) {
      const slot = ((s - march - b) % 3 + 3) % 3;
      if (slot === 2) continue;
      const dist = rStart + (s / steps) * len;
      const px = cx + ux * dist;
      const py = cy + uy * dist;
      c.put(px, py, slot === 0 ? 1 : 2);
      // Slight prism fan width on outer half of long beams
      if (longBeam && s >= steps - 4 && slot === 0) {
        c.put(px - uy * 2.2, py + ux * 2.2, 2);
        c.put(px + uy * 2.2, py - ux * 2.2, 2);
      }
    }

    // Twinkling prism star-flare at the tip of long beams
    if (longBeam) {
      const tipDist = rStart + len + 3 + Math.sin(t * 4.5 + b) * 1.4;
      const pulseBig = Math.sin(t * 5.0 + b * 1.3) > -0.25;
      c.sparkle(cx + ux * tipDist, cy + uy * tipDist, pulseBig, 1);
    }
  }
}

export function wonderSketch(effect: CausalityKind, box: SketchBox, timeMs: number): WonderSketchDot[] {
  if (effect === 'gentleSparkle') return [];
  if (
    !Number.isFinite(box.x0) ||
    !Number.isFinite(box.y0) ||
    !Number.isFinite(box.x1) ||
    !Number.isFinite(box.y1)
  ) {
    return [];
  }
  const x0 = Math.min(box.x0, box.x1);
  const x1 = Math.max(box.x0, box.x1);
  const y0 = Math.min(box.y0, box.y1);
  const y1 = Math.max(box.y0, box.y1);
  const t = (Number.isFinite(timeMs) ? timeMs : 0) * 0.001;

  const c = new DotCanvas();
  switch (effect) {
    case 'rainbowSlide':
      sketchRainbowSlide(c, x0, y0, x1, y1, t);
      break;
    case 'starlightFlowerRain':
      sketchStarlightFlowerRain(c, x0, y0, x1, y1, t);
      break;
    case 'zeroGTrampoline':
      sketchZeroGTrampoline(c, x0, y0, x1, y1, t);
      break;
    case 'cheetahRacetrack':
      sketchCheetahRacetrack(c, x0, y0, x1, y1, t);
      break;
    case 'discoMirage':
      sketchDiscoMirage(c, x0, y0, x1, y1, t);
      break;
  }
  return c.toArray();
}
