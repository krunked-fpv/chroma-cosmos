/**
 * Tiny damped-spring animator. Pre-computes keyframes of a critically-under-damped spring and plays them with the
 * Web Animations API (falls back to a CSS keyframe class). Respects prefers-reduced-motion.
 */

export function prefersReducedMotion(): boolean {
  try {
    return typeof window.matchMedia === 'function' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  } catch {
    return false;
  }
}

/** Sample x(t) of a spring released from `from` toward 1 with the given stiffness/damping (unit mass). */
export function springSamples(from: number, stiffness = 260, damping = 12, frames = 24, durationMs = 520): number[] {
  const out: number[] = [];
  let x = from;
  let v = 0;
  const dt = durationMs / 1000 / frames;
  const sub = 8;
  for (let f = 0; f <= frames; f++) {
    out.push(x);
    for (let s = 0; s < sub; s++) {
      const a = -stiffness * (x - 1) - damping * v;
      v += a * (dt / sub);
      x += v * (dt / sub);
    }
  }
  out[out.length - 1] = 1;
  return out;
}

type SpringKind = 'select' | 'appear' | 'press';

const PRESETS: Record<SpringKind, { from: number; k: number; c: number; ms: number; lift: number }> = {
  select: { from: 0.78, k: 300, c: 11, ms: 560, lift: -6 },
  appear: { from: 0.78, k: 280, c: 24, ms: 300, lift: 8 },
  press: { from: 0.88, k: 420, c: 16, ms: 360, lift: 0 },
};

/** Spring-bounce an element. Returns true if an animation was started. */
export function boing(el: HTMLElement, kind: SpringKind = 'select', delayMs = 0): boolean {
  if (prefersReducedMotion()) return false;
  const p = PRESETS[kind];
  if (typeof el.animate === 'function') {
    const xs = springSamples(p.from, p.k, p.c, 24, p.ms);
    const frames: Keyframe[] = xs.map((s) => {
      const y = kind === 'appear' ? (1 - s) * p.lift : 0;
      return { transform: `translateY(${y.toFixed(2)}px) scale(${s.toFixed(4)})` };
    });
    if (kind === 'appear') {
      const f0 = frames[0];
      if (f0) f0.opacity = 0;
      const f1 = frames[3];
      if (f1) f1.opacity = 1;
    }
    try {
      el.animate(frames, { duration: p.ms, delay: delayMs, easing: 'linear', fill: 'backwards', composite: 'add' });
    } catch {
      el.animate(frames, { duration: p.ms, delay: delayMs, easing: 'linear', fill: 'backwards' });
    }
    return true;
  }
  // CSS fallback
  el.classList.remove('cc-boing');
  void el.offsetWidth;
  el.classList.add('cc-boing');
  return true;
}
