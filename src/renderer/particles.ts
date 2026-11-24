/** Derives pixel-star particles (snapped to internal pixels) from effect states. Pure. */
import type { EffectRenderState } from '../contracts/simulation';
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
    if (out.length < MAX_PARTICLES && alpha > 0.02) out.push({ x, y, color, alpha: clamp01(alpha) });
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
