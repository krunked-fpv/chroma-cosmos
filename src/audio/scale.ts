/**
 * F-Lydian pitch helpers. The scale is F G A B C D E (== C major with F as the tonic),
 * anchored on the contract table F_LYDIAN_HZ (F4..E5) and extended by whole octaves.
 */
import { F_LYDIAN_HZ } from '../contracts/constants';

/** Lowest / highest scale degree (0 = F4) the engine will ever produce: F1 .. E8. */
const MIN_DEGREE = -21;
const MAX_DEGREE = 27;

/** Clamped semitone pitch multiplier in [-12, 12]; exact 1 at shift 0. */
export function semitoneRatio(semitoneShift = 0): number {
  if (!Number.isFinite(semitoneShift) || semitoneShift === 0) return 1;
  const clamped = Math.max(-12, Math.min(12, semitoneShift));
  return clamped === 0 ? 1 : 2 ** (clamped / 12);
}

/** Frequency of scale degree `d` (0 = F4, 6 = E5, 7 = F5, -1 = E4 ...). Non-finite -> F4. */
export function lydianFreq(degree: number, semitoneShift = 0): number {
  const d = Number.isFinite(degree) ? Math.round(degree) : 0;
  const oct = Math.floor(d / 7);
  const idx = d - oct * 7;
  const base = (F_LYDIAN_HZ[idx] ?? F_LYDIAN_HZ[0]) * 2 ** oct;
  const ratio = semitoneRatio(semitoneShift);
  return ratio === 1 ? base : base * ratio;
}

/**
 * Map ANY number to the nearest member of the F-Lydian set (contract pitches x 2^k, F1..E8).
 * NaN, zero and negatives resolve to F4; huge values clamp to the top of the range.
 * Distance is measured in log-frequency (i.e. in musical cents).
 */
export function quantizeToLydian(hz: number): number {
  if (hz === Infinity) return lydianFreq(MAX_DEGREE);
  if (!(hz > 0)) return lydianFreq(0);
  const lh = Math.log2(hz);
  let best = 0;
  let bestDist = Infinity;
  for (let d = MIN_DEGREE; d <= MAX_DEGREE; d++) {
    const dist = Math.abs(Math.log2(lydianFreq(d)) - lh);
    if (dist < bestDist) {
      bestDist = dist;
      best = d;
    }
  }
  return lydianFreq(best);
}
