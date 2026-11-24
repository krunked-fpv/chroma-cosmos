/**
 * Causality "Wonder Whispers" — crisp 2px hand-drawn chalk-dash sketch overlays (480x270).
 * Pure, deterministic, bounds-clamped (0..479, 0..269), zero randomness/timers.
 * Alternates `shade: 1` (bright chalk-gold) & `shade: 2` (moonlight-lavender) cleanly framed
 * outside/around the target bbox so every causality hint reads instantly at 2x scale.
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

/** Cardinal unit offset perpendicular to (ux, uy) for gap-free 2px stroke thickness at any angle. */
function cardinalNormal(ux: number, uy: number): [number, number] {
  const nx = -uy;
  const ny = ux;
  if (Math.abs(nx) >= Math.abs(ny)) return [nx >= 0 ? 1 : -1, 0];
  return [0, ny >= 0 ? 1 : -1];
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

  /** Crisp 2x2 chalk block. */
  put2(x: number, y: number, shade: 1 | 2 = 1): void {
    const rx = Math.round(x);
    const ry = Math.round(y);
    this.put(rx, ry, shade);
    this.put(rx + 1, ry, shade);
    this.put(rx, ry + 1, shade);
    this.put(rx + 1, ry + 1, shade);
  }

  /** Crisp 2px-thick directional chalk dash centered at (x, y) along unit vector (ux, uy). */
  dash(x: number, y: number, ux: number, uy: number, halfLen = 1.0, shade: 1 | 2 = 1): void {
    const [ox, oy] = cardinalNormal(ux, uy);
    const steps = Math.max(1, Math.round(halfLen * 2));
    for (let i = 0; i <= steps; i++) {
      const s = steps === 0 ? 0 : -halfLen + (i / steps) * (halfLen * 2);
      const px = Math.round(x + ux * s);
      const py = Math.round(y + uy * s);
      this.put(px, py, shade);
      this.put(px + ox, py + oy, shade);
    }
  }

  /** Crisp 2px-thick solid chalk segment (for bold arrowheads, chevrons, flower stems, and tips). */
  thickLine(x0: number, y0: number, x1: number, y1: number, shade: 1 | 2 = 1): void {
    const dx = x1 - x0;
    const dy = y1 - y0;
    const len = Math.hypot(dx, dy);
    if (len < 0.25) {
      this.put2(x0, y0, shade);
      return;
    }
    const ux = dx / len;
    const uy = dy / len;
    const [ox, oy] = cardinalNormal(ux, uy);
    const steps = Math.max(1, Math.ceil(len * 1.35));
    for (let i = 0; i <= steps; i++) {
      const f = i / steps;
      const px = Math.round(x0 + dx * f);
      const py = Math.round(y0 + dy * f);
      this.put(px, py, shade);
      this.put(px + ox, py + oy, shade);
    }
  }

  /** Crisp 4-point storybook starlight flare (clearly distinct from 1px sky stars). */
  sparkle(x: number, y: number, big: boolean, shade: 1 | 2 = 1): void {
    const rx = Math.round(x);
    const ry = Math.round(y);
    const accent: 1 | 2 = shade === 1 ? 2 : 1;
    this.put(rx, ry, shade);
    this.put(rx - 1, ry, shade);
    this.put(rx + 1, ry, shade);
    this.put(rx, ry - 1, shade);
    this.put(rx, ry + 1, shade);
    if (!big) return;
    this.put(rx - 2, ry, accent);
    this.put(rx + 2, ry, accent);
    this.put(rx, ry - 2, accent);
    this.put(rx, ry + 2, accent);
    this.put(rx - 3, ry, 2);
    this.put(rx + 3, ry, 2);
    this.put(rx, ry - 3, 2);
    this.put(rx, ry + 3, 2);
  }

  /** Bold 2px-thick directional chevron pointing along unit vector (ux, uy). */
  chevron(x: number, y: number, ux: number, uy: number, arm = 5.0, shade: 1 | 2 = 1): void {
    const nx = -uy;
    const ny = ux;
    const backX = x - ux * arm;
    const backY = y - uy * arm;
    const spread = arm * 0.76;
    this.thickLine(x, y, backX + nx * spread, backY + ny * spread, shade);
    this.thickLine(x, y, backX - nx * spread, backY - ny * spread, shade);
    this.put2(x - 0.5, y - 0.5, shade);
  }

  /** Uniform arc-length marching 2px chalk dashes along a quadratic Bezier curve. */
  dashedQuad(
    x0: number,
    y0: number,
    cpx: number,
    cpy: number,
    x1: number,
    y1: number,
    period: number,
    halfDash: number,
    phasePx: number,
    startShade: 1 | 2 = 1,
  ): void {
    const N = 48;
    const xs = new Float64Array(N + 1);
    const ys = new Float64Array(N + 1);
    const ds = new Float64Array(N + 1);
    let total = 0;
    for (let i = 0; i <= N; i++) {
      const u = i / N;
      const inv = 1 - u;
      const px = inv * inv * x0 + 2 * inv * u * cpx + u * u * x1;
      const py = inv * inv * y0 + 2 * inv * u * cpy + u * u * y1;
      xs[i] = px;
      ys[i] = py;
      if (i > 0) total += Math.hypot(px - xs[i - 1]!, py - ys[i - 1]!);
      ds[i] = total;
    }
    if (total < 1) return;

    const shift = ((phasePx % period) + period) % period;
    const dashStep = Math.floor(phasePx / period);
    let seg = 1;
    let dashIdx = 0;
    for (let dist = shift; dist <= total - 0.5; dist += period, dashIdx++) {
      while (seg < N && ds[seg]! < dist) seg++;
      const d0 = ds[seg - 1]!;
      const d1 = ds[seg]!;
      const f = d1 > d0 ? (dist - d0) / (d1 - d0) : 0;
      const px = xs[seg - 1]! + (xs[seg]! - xs[seg - 1]!) * f;
      const py = ys[seg - 1]! + (ys[seg]! - ys[seg - 1]!) * f;
      const tx = xs[seg]! - xs[seg - 1]!;
      const ty = ys[seg]! - ys[seg - 1]!;
      const tLen = Math.hypot(tx, ty) || 1;
      const parity = (((dashIdx - dashStep) % 2) + 2) % 2;
      const shade: 1 | 2 = parity === 0 ? startShade : startShade === 1 ? 2 : 1;
      this.dash(px, py, tx / tLen, ty / tLen, halfDash, shade);
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
  const lowCloud = y1 > PAGE_H - 52;

  // Anchor cleanly OUTSIDE the cloud side edge so chalk dashes never wash out on cream paper
  const sx = clamp(dir > 0 ? x1 + 5 : x0 - 5, 14, PAGE_W - 14);
  const sy = lowCloud ? clamp(y0 + 3, 16, PAGE_H - 54) : clamp(cy + bh * 0.08, 16, PAGE_H - 56);
  const reachX = clamp(bw * 0.85, 58, 86);
  const dropY = lowCloud ? clamp(bh * 0.95, 34, 46) : clamp(bh * 1.45, 42, 62);
  const ex = clamp(sx + dir * reachX, 16, PAGE_W - 16);
  const ey = clamp(sy + dropY, 26, PAGE_H - 14);
  const cpx = sx + (ex - sx) * 0.58;
  const cpy = sy + (ey - sy) * 0.14 + 4;

  const marchPx = t * 18;
  // Upper & lower parallel 2px-chalk slide ribbons alternating bright chalk-gold (1) & moonlight-lavender (2)
  c.dashedQuad(sx, sy, cpx, cpy, ex, ey, 7.2, 1.3, marchPx, 1);
  c.dashedQuad(sx, sy + 6, cpx - dir * 1.5, cpy + 6.5, ex - dir * 2, ey + 5.5, 7.2, 1.1, marchPx + 3.6, 2);

  // Bold bouncing directional double-chevron arrow tip at the slide exit
  const txRaw = 2 * (ex - cpx);
  const tyRaw = 2 * (ey - cpy);
  const tLen = Math.hypot(txRaw, tyRaw) || 1;
  const ux = txRaw / tLen;
  const uy = tyRaw / tLen;
  const bob = Math.sin(t * 4.2) * 2.0;
  const tipX = clamp(ex + ux * (4 + bob), 8, PAGE_W - 8);
  const tipY = clamp(ey + 2.5 + uy * (4 + bob), 8, PAGE_H - 8);
  c.chevron(tipX, tipY, ux, uy, 5.6, 1);
  c.chevron(tipX - ux * 5.2, tipY - uy * 5.2, ux, uy, 4.2, 2);

  // Two crisp starlight sparkles floating cleanly above the slide arc
  const midX = 0.25 * sx + 0.5 * cpx + 0.25 * ex;
  const midY = 0.25 * sy + 0.5 * cpy + 0.25 * ey;
  c.sparkle(midX + dir * 4, midY - 10 + Math.sin(t * 3.5) * 1.6, true, 1);
  c.sparkle(sx + dir * 11, sy - 8 + Math.cos(t * 3.1) * 1.4, false, 2);
}

function sketchStarlightFlowerRain(c: DotCanvas, x0: number, y0: number, x1: number, y1: number, t: number): void {
  const cx = (x0 + x1) * 0.5;
  const span = clamp(Math.max(40, x1 - x0 - 8), 40, 96);
  const left = clamp(cx - span * 0.5, 14, PAGE_W - 54);
  const right = clamp(cx + span * 0.5, left + 36, PAGE_W - 14);

  // Frame rain + blooming buds strictly OUTSIDE the cloud (below normally; above if hugging bottom margin)
  const flipAbove = PAGE_H - y1 < 34 && y0 >= 44;
  const topY = flipAbove ? clamp(y0 - 50, 8, y0 - 28) : clamp(y1 + 5, 14, PAGE_H - 36);
  const floorY = flipAbove ? clamp(y0 - 5, topY + 26, PAGE_H - 8) : clamp(y1 + 50, topY + 34, PAGE_H - 10);
  const dropSpan = Math.max(14, floorY - topY - 14);

  // 5 falling raindrop columns with crisp 2px teardrop chalk dashes
  const cols = 5;
  for (let i = 0; i < cols; i++) {
    const frac = i / (cols - 1);
    const rx = left + (right - left) * frac;
    const phase = (i * 0.37) % 1;
    for (let d = 0; d < 2; d++) {
      const prog = (((t * 0.58 + phase + d * 0.5) % 1) + 1) % 1;
      const dy = topY + prog * dropSpan;
      const headShade: 1 | 2 = (i + d) % 2 === 0 ? 1 : 2;
      const tailShade: 1 | 2 = headShade === 1 ? 2 : 1;
      // Plump 2x2 teardrop head + crisp 2px falling streak above
      c.put2(rx - 0.5, dy, headShade);
      if (dy - 2 >= topY) c.dash(rx, dy - 2.5, 0, 1, 0.8, tailShade);
      if (dy - 5 >= topY) c.put(rx, dy - 5, tailShade);
    }
  }

  // 4 joyful tulip/daisy chalk flower buds sprouting cleanly along floorY
  const sprouts = 4;
  for (let i = 0; i < sprouts; i++) {
    const frac = (i + 0.5) / sprouts;
    const bx = left + (right - left) * frac;
    const sway = Math.sin(t * 2.7 + i * 1.4) * 1.1;
    const stemH = 7 + (i % 2);
    const fx = bx + sway;
    const fy = floorY - stemH - 2;

    // Crisp 2px stem + upward-sprouting angled leaf pair
    c.thickLine(bx, floorY, fx, fy + 2, 2);
    c.dash(bx - 3, floorY - 3, -0.75, -0.66, 1.0, 2);
    c.dash(bx + 3, floorY - 3, 0.75, -0.66, 1.0, 2);

    // Joyful open daisy/tulip blossom crown (bright 2x2 center + 4 distinct radiating petals)
    const petalShade: 1 | 2 = i % 2 === 0 ? 2 : 1;
    const coreShade: 1 | 2 = petalShade === 2 ? 1 : 2;
    c.put2(fx - 0.5, fy - 0.5, coreShade); // bright blossom center
    c.put2(fx - 0.5, fy - 3.5, petalShade); // top crown petal
    c.put2(fx - 3.5, fy - 2.5, petalShade); // upper-left cupped petal
    c.put2(fx + 2.5, fy - 2.5, petalShade); // upper-right cupped petal
    c.put(fx - 3, fy + 1, petalShade); // lower-left cheek
    c.put(fx + 3, fy + 1, petalShade); // lower-right cheek
  }
}

function sketchZeroGTrampoline(c: DotCanvas, x0: number, y0: number, x1: number, y1: number, t: number): void {
  const cx = (x0 + x1) * 0.5;
  const span = clamp(Math.max(36, x1 - x0 - 2), 36, 94);
  const left = clamp(cx - span * 0.5, 14, PAGE_W - 50);
  const right = clamp(cx + span * 0.5, left + 34, PAGE_W - 14);

  // Frame cleanly ABOVE the cloud (or cleanly below if the cloud hugs the very top border)
  const flipBelow = y0 < 18 && PAGE_H - y1 >= 34;
  const rimY = flipBelow ? clamp(y1 + 26, 32, PAGE_H - 12) : clamp(y0 - 3, 15, PAGE_H - 12);
  const headroom = Math.max(10, rimY - 5);
  const flex = Math.sin(t * 4.4) * 1.8;

  // Bouncy curved trampoline cushion rim with crisp 2px alternating chalk dashes
  c.dashedQuad(left, rimY + 1, cx, rimY - 4 - flex, right, rimY + 1, 6.8, 1.2, t * 8, 1);
  // Crisp little trampoline spring end-caps
  c.put2(left - 1, rimY + 1, 2);
  c.put2(right, rimY + 1, 2);

  // 3 soaring upward bounce arcs + bold UPWARD chevron tips!
  const arcs: readonly [number, number, number][] = [
    [-0.24, -0.48, Math.min(24, headroom * 0.9)],
    [0.0, 0.0, Math.min(31, headroom)],
    [0.24, 0.48, Math.min(24, headroom * 0.9)],
  ];
  const marchPx = t * 16;
  for (let a = 0; a < arcs.length; a++) {
    const [u0, u1, h] = arcs[a] as [number, number, number];
    const ax0 = clamp(cx + span * u0, 12, PAGE_W - 12);
    const ax1 = clamp(cx + span * u1, 12, PAGE_W - 12);
    const startY = rimY - 2;
    const apexY = clamp(startY - Math.max(10, h), 5, startY - 6);
    const ctrlX = (ax0 + ax1) * 0.5 + (u1 - u0) * span * 0.28;
    const ctrlY = (startY + apexY) * 0.5 - 3;
    c.dashedQuad(ax0, startY, ctrlX, ctrlY, ax1, apexY + 2, 5.4, 1.0, marchPx + a * 2.2, a === 1 ? 1 : 2);

    // Bold upward directional chevron at each bounce apex
    const chevBob = Math.sin(t * 4.2 + a * 1.6) * 1.6;
    const chevY = clamp(apexY - 1 + chevBob, 5, PAGE_H - 8);
    const dx = ax1 - ctrlX;
    const dy = apexY - ctrlY;
    const dLen = Math.hypot(dx, dy) || 1;
    // Bias direction crisply upward so kids unmistakably read "BOUNCE UP!"
    const ux = (dx / dLen) * 0.36;
    const uy = -Math.hypot(1 - ux * ux, 0);
    c.chevron(ax1, chevY, ux, uy, a === 1 ? 5.2 : 4.3, 1);
    if (a === 1) {
      c.chevron(ax1, clamp(chevY + 5.5, 8, PAGE_H - 6), 0, -1, 3.8, 2);
      c.sparkle(ax1 + 12, chevY + 4, true, 2);
      c.sparkle(ax1 - 12, chevY + 5, false, 1);
    }
  }
}

function sketchCheetahRacetrack(c: DotCanvas, x0: number, y0: number, x1: number, y1: number, t: number): void {
  const cx = clamp((x0 + x1) * 0.5, 22, PAGE_W - 22);
  const cy = clamp((y0 + y1) * 0.5, 18, PAGE_H - 18);
  const bw = Math.max(22, x1 - x0);
  const bh = Math.max(18, y1 - y0);
  // Generous banked oval clearing cleanly OUTSIDE both planet and rings (including large hero Saturn)
  const rx = clamp(bw * 0.68 + 20, 34, 118);
  const ry = clamp(bh * 0.58 + 12, 22, 82);
  const tilt = -0.18;
  const ct = Math.cos(tilt);
  const st = Math.sin(tilt);

  const pt = (ang: number, sx = 1, sy = 1): [number, number] => {
    const lx = Math.cos(ang) * rx * sx;
    const ly = Math.sin(ang) * ry * sy;
    return [cx + lx * ct - ly * st, cy + lx * st + ly * ct];
  };

  const tan = (ang: number): [number, number] => {
    const dlx = -Math.sin(ang) * rx;
    const dly = Math.cos(ang) * ry;
    const tx = dlx * ct - dly * st;
    const ty = dlx * st + dly * ct;
    const len = Math.hypot(tx, ty) || 1;
    return [tx / len, ty / len];
  };

  // Banked racetrack oval — uniform crisp 2px chalk dashes alternating shade 1 & 2
  const approxPerim = Math.PI * (3 * (rx + ry) - Math.sqrt((3 * rx + ry) * (rx + 3 * ry)));
  const dashCount = Math.max(16, Math.min(38, Math.round(approxPerim / 9.2)));
  const spin = t * 0.72;
  for (let i = 0; i < dashCount; i++) {
    const ang = spin + (i / dashCount) * Math.PI * 2;
    const [px, py] = pt(ang);
    const [ux, uy] = tan(ang);
    c.dash(px, py, ux, uy, 1.4, i % 2 === 0 ? 1 : 2);

    // Outer banking lane highlight dashes (opposite phase, subtle lavender)
    if (i % 2 === 1) {
      const [ox, oy] = pt(ang + Math.PI / dashCount, 1.12, 1.14);
      c.dash(ox, oy, ux, uy, 1.0, 2);
    }
  }

  // 3 snappy racing double-chevrons (>>) orbiting the banked track
  const raceAng = t * 1.25;
  for (let k = 0; k < 3; k++) {
    const ang = raceAng + (k * Math.PI * 2) / 3;
    const [px, py] = pt(ang, 1.03, 1.04);
    const [ux, uy] = tan(ang);
    c.chevron(px, py, ux, uy, 5.2, 1);
    c.chevron(px - ux * 5.8, py - uy * 5.8, ux, uy, 4.0, 2);
  }
}

function sketchDiscoMirage(c: DotCanvas, x0: number, y0: number, x1: number, y1: number, t: number): void {
  const cx = clamp((x0 + x1) * 0.5, 20, PAGE_W - 20);
  const cy = clamp((y0 + y1) * 0.5, 18, PAGE_H - 18);
  const bw = Math.max(20, x1 - x0);
  const bh = Math.max(18, y1 - y0);
  // Elliptical perimeter clearance so rays radiate cleanly OUTSIDE both round planets & wide rings
  const rStartX = clamp(bw * 0.52 + 6, 16, 78);
  const rStartY = clamp(bh * 0.52 + 6, 14, 72);
  const rot = t * 0.36;

  // Crisp 2px dotted prism collar framing the planet perimeter
  const collarCount = 12;
  for (let i = 0; i < collarCount; i++) {
    const ang = rot * 0.5 + (i / collarCount) * Math.PI * 2;
    const px = cx + Math.cos(ang) * (rStartX - 1);
    const py = cy + Math.sin(ang) * (rStartY - 1);
    c.dash(px, py, -Math.sin(ang), Math.cos(ang), 0.7, i % 2 === 0 ? 2 : 1);
  }

  // 8 bold radiating prism star-rays with crisp 2px outward-marching chalk dashes & directional tips
  const beams = 8;
  const marchPx = t * 16;
  for (let b = 0; b < beams; b++) {
    const ang = rot + (b / beams) * Math.PI * 2;
    const ux = Math.cos(ang);
    const uy = Math.sin(ang);
    const sx = cx + ux * rStartX;
    const sy = cy + uy * rStartY;
    const longBeam = b % 2 === 0;
    const len = longBeam ? 32 : 22;
    const period = 7.4;
    const shift = ((marchPx + b * 2.1) % period + period) % period;
    const stepShift = Math.floor((marchPx + b * 2.1) / period);

    let idx = 0;
    for (let d = shift; d <= len - 4; d += period, idx++) {
      const px = sx + ux * d;
      const py = sy + uy * d;
      const parity = (((idx - stepShift + b) % 2) + 2) % 2;
      const shade: 1 | 2 = parity === 0 ? 1 : 2;
      c.dash(px, py, ux, uy, longBeam ? 1.3 : 1.1, shade);
      // Fanning prism flare ticks on outer half of primary beams
      if (longBeam && d > len * 0.52 && shade === 1) {
        c.put2(px - uy * 3.2 - 0.5, py + ux * 3.2 - 0.5, 2);
        c.put2(px + uy * 3.2 - 0.5, py - ux * 3.2 - 0.5, 2);
      }
    }

    // Clear outward prism tip: separated directional chevron + twinkling star flare on primary beams
    const tipDist = len + 6.5 + Math.sin(t * 4.4 + b) * 1.4;
    const tipX = sx + ux * tipDist;
    const tipY = sy + uy * tipDist;
    if (longBeam) {
      const pulseBig = Math.sin(t * 4.8 + b * 1.3) > -0.35;
      c.chevron(sx + ux * len, sy + uy * len, ux, uy, 4.0, 2);
      c.sparkle(tipX, tipY, pulseBig, 1);
    } else {
      c.chevron(sx + ux * (len + 1), sy + uy * (len + 1), ux, uy, 4.0, 1);
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
