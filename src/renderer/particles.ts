/** Derives pixel-star particles (snapped to internal pixels) from effect, wisp, poke & ambient states. Pure. */
import { PAGE_H, PAGE_W } from '../contracts/constants';
import type { EffectRenderState, PokeInvite, WispRenderState } from '../contracts/simulation';
import type { UniverseAmbientKind } from '../contracts/universes';
import { clamp01, easeOut, mulberry32 } from './rng';

export interface PixelParticle {
  /** internal-pixel position (float; snapped by the consumer) */
  x: number;
  y: number;
  /** 0xRRGGBB tint */
  color: number;
  alpha: number;
}

export const MAX_PARTICLES = 512;
const GOLD = 0xffe27a;
const PINK = 0xff9ecf;
const CYAN = 0x9bf6ff;
const CREAM = 0xfff6e0;
const LAV = 0xcdb8ff;
const PALETTE = [GOLD, PINK, CYAN, CREAM, LAV];

const num = (v: number | undefined, d: number): number => (v !== undefined && Number.isFinite(v) ? v : d);

export function particlesForEffect(e: EffectRenderState, out: PixelParticle[]): void {
  if (out.length >= MAX_PARTICLES || !Number.isFinite(e.x) || !Number.isFinite(e.y)) return;
  const t = clamp01(e.t);
  const age = num(e.ageMs, 0);
  const rnd = mulberry32(e.seed | 0);
  const push = (x: number, y: number, color: number, alpha: number): void => {
    if (out.length < MAX_PARTICLES && Number.isFinite(x) && Number.isFinite(y) && alpha > 0.02) {
      out.push({ x, y, color, alpha: clamp01(alpha) });
    }
  };
  switch (e.kind) {
    case 'starBurst': {
      const n = 14;
      for (let i = 0; i < n; i++) {
        const a = (i / n) * Math.PI * 2 + rnd() * 0.4;
        const sp = 18 + rnd() * 34;
        const r = sp * easeOut(t);
        push(e.x + Math.cos(a) * r, e.y + Math.sin(a) * r + t * t * 10, PALETTE[i % PALETTE.length] as number, 1 - t * t);
      }
      break;
    }
    case 'paperDust': {
      for (let i = 0; i < 9; i++) {
        const a = rnd() * Math.PI * 2;
        const r = 4 + rnd() * 16 + t * 8;
        push(e.x + Math.cos(a) * r, e.y + Math.sin(a) * r - t * 6, CREAM, (1 - t) * 0.9);
      }
      break;
    }
    case 'stardustTrail': {
      const x1 = num(e.x2, e.x);
      const y1 = num(e.y2, e.y);
      for (let i = 0; i < 8; i++) {
        const f = clamp01(t - i * 0.05);
        push(e.x + (x1 - e.x) * f + (rnd() - 0.5) * 3, e.y + (y1 - e.y) * f + (rnd() - 0.5) * 3, i % 2 ? GOLD : CYAN, 1 - i / 9);
      }
      break;
    }
    case 'gentleSparkle': {
      for (let i = 0; i < 7; i++) {
        const a = rnd() * Math.PI * 2;
        const r = 6 + rnd() * 22;
        const tw = 0.5 + 0.5 * Math.sin(age * 0.01 + i * 1.7);
        push(e.x + Math.cos(a) * r, e.y + Math.sin(a) * r, PALETTE[i % PALETTE.length] as number, tw * (1 - t * 0.6));
      }
      break;
    }
    case 'gemPickup':
      for (let i = 0; i < 2; i++) push(e.x + (i ? 6 : -6), e.y - 5 + Math.sin(age * 0.01 + i * 3) * 2, CREAM, 0.6 + 0.4 * Math.sin(age * 0.012 + i));
      break;
    case 'hiddenStar':
      for (let i = 0; i < 3; i++) push(e.x + Math.cos(age * 0.004 + i * 2.1) * 9, e.y + Math.sin(age * 0.004 + i * 2.1) * 9, GOLD, 0.8);
      break;
    case 'goldDoodle':
      for (let i = 0; i < 4; i++) push(num(e.x2, e.x + 40) * easeOut(t) + e.x * (1 - easeOut(t)) + (rnd() - 0.5) * 12, e.y + (rnd() - 0.5) * 12, GOLD, (1 - t) * 0.9);
      break;
    case 'shootingStar': {
      const x1 = num(e.x2, e.x + 80);
      const y1 = num(e.y2, e.y + 20);
      const f = easeOut(t);
      for (let i = 1; i <= 6; i++) {
        const ff = Math.max(0, f - i * 0.025);
        push(e.x + (x1 - e.x) * ff + (rnd() - 0.5) * 2, e.y + (y1 - e.y) * ff + (rnd() - 0.5) * 2, i % 2 ? GOLD : CREAM, 1 - i / 7);
      }
      break;
    }
    case 'paintSplatComet': {
      const x1 = num(e.x2, e.x + 60);
      const y1 = num(e.y2, e.y + 30);
      for (let i = 0; i < 6; i++) {
        const ff = clamp01(t - i * 0.045);
        push(e.x + (x1 - e.x) * ff + (rnd() - 0.5) * 4, e.y + (y1 - e.y) * ff - Math.sin(ff * Math.PI) * 14 + (rnd() - 0.5) * 4, PALETTE[i % PALETTE.length] as number, 1 - i / 7);
      }
      break;
    }
    case 'rainbowArc':
    case 'rainbowBridge':
    case 'harmonyArc':
      push(num(e.x2, e.x + 60) * easeOut(t) + e.x * (1 - easeOut(t)), e.y - 12 + Math.sin(age * 0.01) * 3, CREAM, 0.9 * (1 - t * 0.5));
      break;
    case 'constellationFireworks':
      for (let i = 0; i < 10; i++) {
        const a = rnd() * Math.PI * 2;
        const r = (6 + rnd() * 58) * easeOut(t);
        push(e.x + Math.cos(a) * r, e.y + Math.sin(a) * r, i % 2 ? CREAM : CYAN, 1 - t * 0.8);
      }
      break;
    case 'bubblePop': {
      const r = 4 + 20 * easeOut(t);
      for (let i = 0; i < 8; i++) {
        const a = (i / 8) * Math.PI * 2 + rnd() * 0.4;
        const rr = r * (0.65 + rnd() * 0.45);
        push(e.x + Math.cos(a) * rr, e.y + Math.sin(a) * rr - t * 6, i % 3 === 0 ? CYAN : i % 3 === 1 ? CREAM : PINK, 1 - t * 0.85);
      }
      break;
    }
    case 'meteorStreak': {
      const x1 = num(e.x2, e.x + 70);
      const y1 = num(e.y2, e.y + 18);
      const f = easeOut(t);
      for (let i = 0; i < 7; i++) {
        const ff = Math.max(0, f - i * 0.04);
        const mx = e.x + (x1 - e.x) * ff + (rnd() - 0.5) * 4;
        const my = e.y + (y1 - e.y) * ff - Math.sin(ff * Math.PI) * 8 + (rnd() - 0.5) * 4;
        push(mx, my, i % 3 === 0 ? GOLD : i % 3 === 1 ? CREAM : PINK, 1 - i / 8);
      }
      break;
    }
    case 'lightningZap': {
      const x1 = num(e.x2, e.x + 48);
      const y1 = num(e.y2, e.y + 14);
      const f = easeOut(t);
      for (let i = 0; i < 6; i++) {
        const u = i < 3 ? (0.3 + i * 0.25) * f : f;
        push(
          e.x + (x1 - e.x) * u + (rnd() - 0.5) * 8,
          e.y + (y1 - e.y) * u + (rnd() - 0.5) * 8,
          i % 2 === 0 ? GOLD : CYAN,
          (1 - t * 0.75) * 0.95,
        );
      }
      break;
    }
    case 'crownFireworks': {
      for (let i = 0; i < 12; i++) {
        const a = (i / 12) * Math.PI * 2 + rnd() * 0.35;
        const r = (8 + rnd() * 44) * easeOut(t);
        push(
          e.x + Math.cos(a) * r,
          e.y + Math.sin(a) * r + t * t * 9,
          i % 3 === 0 ? GOLD : i % 3 === 1 ? CREAM : CYAN,
          1 - t * 0.85,
        );
      }
      break;
    }
    case 'magnetArc': {
      const x1 = num(e.x2, e.x + 56);
      const y1 = num(e.y2, e.y - 34);
      const f = easeOut(t);
      for (let i = 0; i < 6; i++) {
        const ff = clamp01(f - i * 0.06);
        const swirl = age * 0.01 + i * 1.5;
        push(
          e.x + (x1 - e.x) * ff + Math.cos(swirl) * 4,
          e.y + (y1 - e.y) * ff - Math.sin(ff * Math.PI) * 10 + Math.sin(swirl) * 4,
          i % 2 === 0 ? GOLD : LAV,
          1 - i / 7,
        );
      }
      break;
    }
    case 'echoTrail': {
      const x1 = num(e.x2, e.x + 64);
      const y1 = num(e.y2, e.y - 20);
      const f = easeOut(t);
      for (let i = 0; i < 7; i++) {
        const ff = Math.max(0, f - i * 0.055);
        push(
          e.x + (x1 - e.x) * ff + (rnd() - 0.5) * 5,
          e.y + (y1 - e.y) * ff + Math.sin(ff * Math.PI * 3 + i) * 7 + (rnd() - 0.5) * 4,
          PALETTE[i % PALETTE.length] as number,
          (1 - i / 8) * 0.9,
        );
      }
      break;
    }
    case 'starlightFlowerRain':
    case 'discoMirage':
    case 'cheetahRacetrack':
    case 'zeroGTrampoline':
      for (let i = 0; i < 4; i++) {
        const a = age * 0.003 + i * 1.6;
        push(e.x + Math.cos(a) * (14 + i * 6), e.y + Math.sin(a * 1.3) * (10 + i * 3), PALETTE[i % PALETTE.length] as number, 0.7);
      }
      break;
    default:
      break;
  }
}

export function particlesForEffects(effects: readonly EffectRenderState[]): PixelParticle[] {
  const out: PixelParticle[] = [];
  for (const e of effects) particlesForEffect(e, out);
  return out;
}

/** Trailing warm stardust motes orbiting and drifting softly behind the Luminous Starlight Wisp. */
export function particlesForWisp(
  wisp: WispRenderState | undefined,
  timeMs: number,
  out: PixelParticle[],
): void {
  if (out.length >= MAX_PARTICLES || !wisp || !wisp.active || wisp.mode === 'hidden') return;
  if (!Number.isFinite(wisp.x) || !Number.isFinite(wisp.y) || !Number.isFinite(wisp.alpha) || wisp.alpha <= 0.02) {
    return;
  }
  const safeTime = Number.isFinite(timeMs) && timeMs >= 0 ? timeMs : 0;
  const baseAlpha = clamp01(wisp.alpha);
  const moteCount = 6;
  for (let i = 0; i < moteCount && out.length < MAX_PARTICLES; i++) {
    const phase = ((safeTime * 0.0011 + i / moteCount) % 1 + 1) % 1;
    const angle = safeTime * 0.0024 + i * 1.15;
    const drift = 4 + phase * 11;
    const px = wisp.x + Math.cos(angle) * drift - phase * 4;
    const py = wisp.y + Math.sin(angle * 1.3) * (drift * 0.65) + phase * 5;
    const tw = 0.55 + 0.45 * Math.sin(safeTime * 0.012 + i * 2.1);
    const alpha = clamp01((1 - phase * 0.85) * tw * baseAlpha);
    if (alpha > 0.02) {
      const color = i % 3 === 0 ? GOLD : i % 3 === 1 ? CREAM : LAV;
      out.push({ x: px, y: py, color, alpha });
    }
  }
  if (wisp.ghostPath.length >= 2 && wisp.ghostStrokeT > 0.02) {
    const t = clamp01(wisp.ghostStrokeT);
    const maxIdx = wisp.ghostPath.length - 1;
    for (let k = 0; k < 3 && out.length < MAX_PARTICLES; k++) {
      const u = clamp01(t - k * 0.08);
      const pos = u * maxIdx;
      const i0 = Math.min(maxIdx, Math.floor(pos));
      const i1 = Math.min(maxIdx, i0 + 1);
      const frac = pos - i0;
      const p0 = wisp.ghostPath[i0]!;
      const p1 = wisp.ghostPath[i1]!;
      if (!Number.isFinite(p0.x) || !Number.isFinite(p0.y) || !Number.isFinite(p1.x) || !Number.isFinite(p1.y)) {
        continue;
      }
      const sx = p0.x + (p1.x - p0.x) * frac + Math.sin(safeTime * 0.009 + k * 2.3) * 2.5;
      const sy = p0.y + (p1.y - p0.y) * frac + Math.cos(safeTime * 0.008 + k * 1.7) * 2.5;
      const alpha = clamp01((0.9 - k * 0.22) * baseAlpha);
      if (alpha > 0.02) out.push({ x: sx, y: sy, color: k === 0 ? CREAM : GOLD, alpha });
    }
  }
}

/** Golden starlight sparkles pulsing around interactive Poke Invites (extra warm when `firstAwake`). */
export function particlesForPokeInvites(
  invites: readonly PokeInvite[] | undefined,
  timeMs: number,
  out: PixelParticle[],
): void {
  if (!invites || invites.length === 0 || out.length >= MAX_PARTICLES) return;
  const safeTime = Number.isFinite(timeMs) && timeMs >= 0 ? timeMs : 0;
  for (let idx = 0; idx < invites.length && out.length < MAX_PARTICLES; idx++) {
    const inv = invites[idx]!;
    if (!Number.isFinite(inv.x) || !Number.isFinite(inv.y)) continue;
    const warm = inv.firstAwake;
    const count = warm ? 6 : 3;
    const period = warm ? 1400 : 1800;
    for (let i = 0; i < count && out.length < MAX_PARTICLES; i++) {
      const ph = ((safeTime / period) + i / count) % 1;
      const r = (warm ? 11 : 10) + (warm ? 16 : 11) * easeOut(ph);
      const a = (i / count) * Math.PI * 2 + safeTime * (warm ? 0.0022 : 0.0014) + idx * 0.9;
      const tw = 0.6 + 0.4 * Math.sin(safeTime * 0.011 + i * 1.9 + idx);
      const alpha = clamp01((1 - ph * 0.72) * tw * (warm ? 0.95 : 0.72));
      if (alpha > 0.02) {
        const color = warm ? (i % 2 === 0 ? GOLD : CREAM) : i % 2 === 0 ? GOLD : LAV;
        out.push({ x: inv.x + Math.cos(a) * r, y: inv.y + Math.sin(a) * r, color, alpha });
      }
    }
  }
}

const AMBIENT_PALETTES: Record<Exclude<UniverseAmbientKind, 'stardust'>, readonly number[]> = {
  bubbles: [0x9bf6ff, 0x5ef2e6, 0xff9ecf, 0xeefcff],
  sprinkles: [0xff85c0, 0x9be2ff, 0xffe49e, 0xa8f5c8, 0xd6a8ff],
  fireflies: [0xffe27a, 0x6ef5c8, 0xffcf5c, 0xb8ffe0],
  petals: [0xff9ec2, 0xffd6e8, 0xffb8a6, 0xfff6e0],
  leaves: [0xff9e4a, 0xffd452, 0x62e89d, 0xff6e6e],
  snow: [0xf0fcff, 0x9eefff, 0xc4e8ff, 0xd8c8ff],
  sparks: [0xf6c344, 0x56d8ff, 0xff52e2, 0xfff3c4],
  notes: [0xb69cff, 0xffd46b, 0x9bf6ff, 0xffb3e6],
  shards: [0xc76bff, 0x6ef5d8, 0xffe8ff, 0x8cc8ff],
  confetti: [0xff5e8e, 0xffd447, 0x56d8ff, 0xb8ff66, 0xd28cff],
  embers: [0xffbe55, 0xff825c, 0xffe27a, 0x5ef2c0],
  prism: [0xff6fa9, 0xffd447, 0x5ef2c0, 0x6ef0ff, 0xc76bff, 0xfff6e0],
};

const wrap = (v: number, span: number): number => ((v % span) + span) % span;

/**
 * Universe-themed living-page ambient particles (pure, deterministic, tiny pool budget <= 18 particles).
 * `stardust` preserves exact legacy Universe 1 particle behavior (no extra ambient motes).
 */
export function particlesForAmbient(
  ambient: UniverseAmbientKind | undefined,
  timeMs: number,
  awakening: number,
  out: PixelParticle[],
): void {
  if (!ambient || ambient === 'stardust' || out.length >= MAX_PARTICLES) return;
  const pal = AMBIENT_PALETTES[ambient];
  if (!pal) return;
  const safeT = Number.isFinite(timeMs) && timeMs >= 0 ? timeMs * 0.001 : 0;
  const boost = 0.72 + 0.28 * clamp01(Number.isFinite(awakening) ? awakening : 0);
  const count = ambient === 'prism' ? 18 : 14;
  const padX = 8;
  const padY = 8;
  const spanW = PAGE_W - padX * 2;
  const spanH = PAGE_H - padY * 2;

  for (let i = 0; i < count && out.length < MAX_PARTICLES; i++) {
    const h1 = ((i * 73 + 19) % 97) / 97;
    const h2 = ((i * 41 + 31) % 89) / 89;
    const h3 = ((i * 29 + 13) % 67) / 67;
    const color = pal[i % pal.length] as number;
    let x = padX + h1 * spanW;
    let y = padY + h2 * spanH;
    let alpha = 0.55;

    switch (ambient) {
      case 'bubbles': {
        const speed = 10 + h3 * 12;
        y = padY + wrap(h2 * spanH - safeT * speed, spanH);
        x = padX + wrap(h1 * spanW + Math.sin(safeT * (1.2 + h3) + i * 1.7) * 9, spanW);
        alpha = (0.45 + 0.35 * (0.5 + 0.5 * Math.sin(safeT * 2.4 + i))) * boost;
        break;
      }
      case 'petals':
      case 'leaves': {
        const dy = (ambient === 'petals' ? 11 : 13) + h3 * 9;
        const dx = (ambient === 'petals' ? 10 : 12) + h3 * 7;
        x = padX + wrap(h1 * spanW + safeT * dx + Math.sin(safeT * 1.6 + i * 2.1) * 11, spanW);
        y = padY + wrap(h2 * spanH + safeT * dy + Math.cos(safeT * 1.1 + i * 1.4) * 4, spanH);
        alpha = (0.52 + 0.28 * Math.sin(safeT * 2.0 + i * 1.9)) * boost;
        break;
      }
      case 'snow': {
        const dy = 8 + h3 * 9;
        x = padX + wrap(h1 * spanW + Math.sin(safeT * (0.9 + h3 * 0.6) + i * 2.3) * 10, spanW);
        y = padY + wrap(h2 * spanH + safeT * dy, spanH);
        alpha = (0.5 + 0.32 * (0.5 + 0.5 * Math.sin(safeT * 2.2 + i * 1.3))) * boost;
        break;
      }
      case 'fireflies': {
        x = padX + wrap(h1 * spanW + Math.sin(safeT * (0.7 + h3 * 0.5) + i * 2.4) * 18, spanW);
        y = padY + wrap(h2 * spanH + Math.cos(safeT * (0.6 + h3 * 0.4) + i * 1.7) * 14, spanH);
        const pulse = 0.5 + 0.5 * Math.sin(safeT * (2.6 + h3 * 1.5) + i * 2.1);
        alpha = (0.2 + 0.72 * pulse * pulse) * boost;
        break;
      }
      case 'embers': {
        const speed = 12 + h3 * 14;
        y = padY + wrap(h2 * spanH - safeT * speed, spanH);
        x = padX + wrap(h1 * spanW + Math.sin(safeT * 1.9 + i * 1.8) * 12, spanW);
        const flicker = 0.5 + 0.5 * Math.sin(safeT * (4.0 + h3 * 2.0) + i * 2.7);
        alpha = (0.3 + 0.62 * flicker) * boost;
        break;
      }
      case 'sprinkles': {
        x = padX + wrap(h1 * spanW + Math.sin(safeT * 0.9 + i * 1.9) * 6, spanW);
        y = padY + wrap(h2 * spanH + Math.cos(safeT * 1.2 + i * 1.5) * 6, spanH);
        alpha = (0.42 + 0.42 * (0.5 + 0.5 * Math.sin(safeT * 3.1 + i * 2.2))) * boost;
        break;
      }
      case 'confetti': {
        const dy = 14 + h3 * 11;
        x = padX + wrap(h1 * spanW + Math.sin(safeT * 2.8 + i * 1.6) * 14, spanW);
        y = padY + wrap(h2 * spanH + safeT * dy, spanH);
        alpha = (0.48 + 0.42 * (0.5 + 0.5 * Math.sin(safeT * 4.2 + i * 1.3))) * boost;
        break;
      }
      case 'notes': {
        x = padX + wrap(h1 * spanW + safeT * (9 + h3 * 6), spanW);
        y = padY + wrap(h2 * spanH + Math.sin(safeT * 2.0 + i * 1.4) * 12, spanH);
        alpha = (0.45 + 0.42 * (0.5 + 0.5 * Math.sin(safeT * 2.8 + i * 1.8))) * boost;
        break;
      }
      case 'shards': {
        x = padX + wrap(h1 * spanW + Math.cos(safeT * 0.5 + i * 1.7) * 5, spanW);
        y = padY + wrap(h2 * spanH + Math.sin(safeT * 0.6 + i * 2.1) * 5, spanH);
        const glint = Math.pow(0.5 + 0.5 * Math.sin(safeT * (2.8 + h3 * 1.6) + i * 2.9), 2);
        alpha = (0.25 + 0.68 * glint) * boost;
        break;
      }
      case 'sparks': {
        const speed = 16 + h3 * 16;
        y = padY + wrap(h2 * spanH - safeT * speed, spanH);
        x = padX + wrap(h1 * spanW + Math.sin(safeT * 3.2 + i * 2.5) * 8, spanW);
        alpha = (0.38 + 0.54 * (0.5 + 0.5 * Math.sin(safeT * 5.0 + i * 1.7))) * boost;
        break;
      }
      case 'prism': {
        const ang = safeT * (0.35 + h3 * 0.25) + (i / count) * Math.PI * 2;
        const rx = 95 + h1 * 120;
        const ry = 55 + h2 * 62;
        x = PAGE_W * 0.5 + Math.cos(ang) * rx;
        y = PAGE_H * 0.5 + Math.sin(ang) * ry;
        alpha = (0.4 + 0.48 * (0.5 + 0.5 * Math.sin(safeT * 3.4 + i * 1.5))) * boost;
        break;
      }
    }

    if (alpha > 0.02 && x >= 2 && x <= PAGE_W - 2 && y >= 2 && y <= PAGE_H - 2) {
      out.push({ x, y, color, alpha: clamp01(alpha) });
    }
  }
}
