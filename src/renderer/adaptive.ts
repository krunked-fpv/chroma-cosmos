/** Adaptive backing-store resolution: downshift 2 -> 1.5 -> 1 when the median frame exceeds 18 ms for 2 s. */

export const ADAPTIVE_THRESHOLD_MS = 18;
export const ADAPTIVE_WINDOW_MS = 2000;
const STEPS = [2, 1.5, 1] as const;

export function median(values: readonly number[]): number {
  if (values.length === 0) return 0;
  const s = [...values].sort((a, b) => a - b);
  const mid = s.length >> 1;
  return s.length % 2 ? (s[mid] as number) : ((s[mid - 1] as number) + (s[mid] as number)) / 2;
}

/** Snaps a requested resolution to min(dpr, 2) steps. */
export function initialResolution(dpr: number): number {
  return Math.max(1, Math.min(dpr || 1, 2));
}

export class AdaptiveResolution {
  private samples: number[] = [];
  private windowStart = -1;
  private ceiling: number;

  constructor(private current: number) {
    this.ceiling = current;
  }

  get resolution(): number {
    return this.current;
  }

  /** Lowers the ceiling (e.g. device pixel ratio changed). */
  setCeiling(res: number): void {
    this.ceiling = res;
    if (this.current > res) this.current = res;
  }

  /**
   * Feed one frame. Returns the new resolution when a downshift happens, else null.
   * A 2 s window is evaluated at a time; the window then restarts.
   */
  push(dtMs: number, timeMs: number): number | null {
    if (this.windowStart < 0) this.windowStart = timeMs;
    this.samples.push(dtMs);
    if (timeMs - this.windowStart < ADAPTIVE_WINDOW_MS) return null;
    const med = median(this.samples);
    this.samples = [];
    this.windowStart = timeMs;
    if (med <= ADAPTIVE_THRESHOLD_MS) return null;
    const next = STEPS.find((s) => s < this.current - 1e-6 && s <= this.ceiling);
    if (next === undefined) return null;
    this.current = next;
    return next;
  }
}
