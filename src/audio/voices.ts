/**
 * Synth voices. Each function builds a tiny transient graph (well under 40 nodes), schedules it at
 * absolute audio time `t`, and lets the Group release it once its oscillators have ended.
 * Timbre rule of thumb: sines, triangles and gently filtered noise only - no square/saw bleeps
 * except a low-passed saw tucked under the pad.
 */
import { expTo, linTo, setAt, type Rig } from './graph';

export interface VoiceOpts {
  dest?: AudioNode;
  gain?: number;
  decay?: number;
}

/** Attack/decay envelope on a gain param; returns the time the sound has fully died. */
export function envAD(p: AudioParam, t: number, peak: number, attack: number, decay: number): number {
  setAt(p, 0, t);
  linTo(p, peak, t + attack);
  expTo(p, 1e-4, t + attack + decay);
  return t + attack + decay;
}

export interface PluckOpts extends VoiceOpts {
  /** Initial filter brightness as a multiple of the fundamental. */
  bright?: number;
  /** Add a soft octave partial (5 nodes instead of 3). */
  rich?: boolean;
}

/** Soft harp-like pluck: triangle through a closing lowpass. */
export function pluck(rig: Rig, t: number, freq: number, o: PluckOpts = {}): void {
  const gain = o.gain ?? 0.16;
  const decay = o.decay ?? 0.9;
  const dest = o.dest ?? rig.out;
  const bright = o.bright ?? 5;
  const startCut = rig.lpFreq(Math.min(freq * bright, 9000));
  const endCut = rig.lpFreq(Math.min(freq * 1.6, 9000));
  rig.build((g) => {
    const osc = g.osc('triangle', freq);
    const lp = g.filter('lowpass', startCut, 0.5);
    const env = g.gain(0);
    const end = envAD(env.gain, t, gain, 0.004, decay) + 0.05;
    setAt(lp.frequency, startCut, t);
    expTo(lp.frequency, endCut, t + decay * 0.6);
    osc.connect(lp);
    lp.connect(env);
    env.connect(dest);
    g.play(osc, t, end);
    if (o.rich) {
      const o2 = g.osc('sine', freq * 2);
      const g2 = g.gain(0.3);
      o2.connect(g2);
      g2.connect(lp);
      g.play(o2, t, end);
    }
  });
}

export interface BellOpts extends VoiceOpts {
  /** [frequency ratio, relative amplitude] extra partials (kept to 0-2). */
  partials?: ReadonlyArray<readonly [number, number]>;
  attack?: number;
}

/** Crystalline bell / glass grain: sine + quiet octave-family partials, fast exponential decay. */
export function bell(rig: Rig, t: number, freq: number, o: BellOpts = {}): void {
  const gain = o.gain ?? 0.1;
  const decay = o.decay ?? 0.5;
  const dest = o.dest ?? rig.out;
  const partials = o.partials ?? [[2, 0.25]];
  rig.build((g) => {
    const env = g.gain(0);
    const end = envAD(env.gain, t, gain, o.attack ?? 0.003, decay) + 0.05;
    env.connect(dest);
    const main = g.osc('sine', freq);
    main.connect(env);
    g.play(main, t, end);
    for (const [ratio, amp] of partials) {
      const p = g.osc('sine', freq * ratio);
      const pg = g.gain(amp);
      p.connect(pg);
      pg.connect(env);
      g.play(p, t, end);
    }
  });
}

/** Marimba: sine body plus a quick-dying 4th partial. */
export function marimba(rig: Rig, t: number, freq: number, o: VoiceOpts = {}): void {
  const gain = o.gain ?? 0.12;
  const decay = o.decay ?? 0.45;
  const dest = o.dest ?? rig.out;
  rig.build((g) => {
    const env = g.gain(0);
    const end = envAD(env.gain, t, gain, 0.002, decay) + 0.05;
    env.connect(dest);
    const body = g.osc('sine', freq);
    body.connect(env);
    const over = g.osc('sine', freq * 4);
    const og = g.gain(0);
    envAD(og.gain, t, 0.22, 0.002, 0.1);
    over.connect(og);
    og.connect(env);
    g.play(body, t, end);
    g.play(over, t, t + 0.2);
  });
}

/** Chime with a fast tremolo ("purr"): used for Nova. */
export function purrChime(rig: Rig, t: number, freq: number, o: VoiceOpts = {}): void {
  const gain = o.gain ?? 0.11;
  const decay = o.decay ?? 0.55;
  const dest = o.dest ?? rig.out;
  rig.build((g) => {
    const env = g.gain(0);
    const end = envAD(env.gain, t, gain, 0.01, decay) + 0.05;
    const trem = g.gain(0.65);
    const car = g.osc('sine', freq);
    const car2 = g.osc('sine', freq * 2);
    const c2g = g.gain(0.25);
    const lfo = g.osc('sine', 22);
    const depth = g.gain(0.35);
    car.connect(trem);
    car2.connect(c2g);
    c2g.connect(trem);
    lfo.connect(depth);
    depth.connect(trem.gain);
    trem.connect(env);
    env.connect(dest);
    g.play(car, t, end);
    g.play(car2, t, end);
    g.play(lfo, t, end);
  });
}

/** Gentle pitch-gliding "boing" (sine). */
export function bend(rig: Rig, t: number, f0: number, f1: number, dur: number, o: VoiceOpts = {}): void {
  const gain = o.gain ?? 0.1;
  const dest = o.dest ?? rig.out;
  rig.build((g) => {
    const osc = g.osc('sine', f0);
    const env = g.gain(0);
    setAt(osc.frequency, f0, t);
    expTo(osc.frequency, f1, t + dur * 0.55);
    expTo(osc.frequency, f0 * 1.0, t + dur);
    const end = envAD(env.gain, t, gain, 0.012, dur) + 0.04;
    osc.connect(env);
    env.connect(dest);
    g.play(osc, t, end);
  });
}

/** Slow pad chord: triangles (+ a few saws) through a warm lowpass, long attack and release. */
export function padChord(rig: Rig, t: number, degrees: readonly number[], dur: number, dest: AudioNode, gain = 0.045): void {
  const attack = 1.4;
  const release = 1.6;
  rig.build((g) => {
    const lp = g.filter('lowpass', rig.lpFreq(850), 0.5);
    const env = g.gain(0);
    const end = t + dur + release;
    setAt(env.gain, 0, t);
    linTo(env.gain, gain, t + attack);
    setAt(env.gain, gain, t + dur);
    linTo(env.gain, 0, end);
    lp.connect(env);
    env.connect(dest);
    degrees.slice(0, 5).forEach((d, i) => {
      const f = rig.freq(d);
      const tri = g.osc('triangle', f);
      tri.connect(lp);
      g.play(tri, t, end + 0.05);
      if (i % 2 === 1) {
        const saw = g.osc('sawtooth', f * 1.003);
        const sg = g.gain(0.3);
        saw.connect(sg);
        sg.connect(lp);
        g.play(saw, t, end + 0.05);
      }
    });
  });
}

/** Soft paper whoosh: filtered noise sweep plus a faint high rustle. */
export function whoosh(rig: Rig, t: number, dest?: AudioNode): void {
  const out = dest ?? rig.out;
  rig.build((g) => {
    const src = g.noise(0.9);
    const bp = g.filter('bandpass', 350, 0.9);
    const env = g.gain(0);
    setAt(bp.frequency, 350, t);
    expTo(bp.frequency, 2800, t + 0.35);
    expTo(bp.frequency, 700, t + 1.0);
    setAt(env.gain, 0, t);
    linTo(env.gain, 0.9, t + 0.3);
    linTo(env.gain, 0, t + 1.0);
    src.connect(bp);
    bp.connect(env);
    env.connect(out);
    g.play(src, t, t + 1.05, 0.31);

    const rs = g.noise(1.1);
    const hp = g.filter('highpass', 4500, 0.5);
    const re = g.gain(0);
    setAt(re.gain, 0, t);
    linTo(re.gain, 0.16, t + 0.22);
    linTo(re.gain, 0, t + 0.8);
    rs.connect(hp);
    hp.connect(re);
    re.connect(out);
    g.play(rs, t, t + 0.85, 1.07);
  });
}

/** Rising swell of several held tones (auto-bloom). Per-note staggered entrance. */
export function swell(rig: Rig, t: number, degrees: readonly number[], hold: number, gains: readonly number[]): void {
  rig.build((g) => {
    const lp = g.filter('lowpass', rig.lpFreq(2600), 0.5);
    lp.connect(rig.out);
    degrees.forEach((d, i) => {
      const start = t + i * 0.07;
      const peak = gains[i] ?? 0.07;
      const ng = g.gain(0);
      const end = start + 0.4 + hold + 2.0;
      setAt(ng.gain, 0, start);
      linTo(ng.gain, peak, start + 0.4);
      setAt(ng.gain, peak, start + 0.4 + hold);
      linTo(ng.gain, 0, end);
      const o = g.osc(i % 2 === 0 ? 'sine' : 'triangle', rig.freq(d));
      o.connect(ng);
      ng.connect(lp);
      g.play(o, start, end + 0.05);
    });
  });
}
