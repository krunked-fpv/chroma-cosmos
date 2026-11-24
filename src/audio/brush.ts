/**
 * Tactile brush voices, one per ASMR family declared by MATERIALS[].asmr:
 *  - grain: looped pink noise -> ~1.8 kHz lowpass with a slow-noise crackle on its gain (crayon / chalk)
 *  - sweep: pink noise -> bandpass whose centre/Q follow speed, plus a slow LFO (liquid watercolour)
 *  - bell : short F-Lydian sine grains (x2 / x4 octaves) whose density follows speed (foil / glitter)
 * grain/sweep are persistent-while-stroking voices that fade to silence and self-release.
 */
import { MATERIALS, type AsmrFamily, type MaterialId } from '../contracts/materials';
import { cancelFrom, glide, makeRng, type Group, type Rig } from './graph';
import { lydianFreq } from './scale';
import { bell } from './voices';

const FAMILY_BY_ID = new Map<number, AsmrFamily>(MATERIALS.map((m) => [m.id, m.asmr]));

interface Voice {
  family: 'grain' | 'sweep';
  group: Group;
  env: GainNode;
  /** grain: lowpass; sweep: bandpass */
  filter: BiquadFilterNode;
}

/** Per-material tonal tweaks inside a family (multiplier on filter centre). */
const TONE: Partial<Record<number, number>> = { 4: 1.15, 6: 1.0, 7: 0.82, 1: 1.0, 3: 0.9, 10: 0.72, 12: 1.12 };
/** Bell degree ranges: deg 7..13 = x2 octave, 14..20 = x4 octave. */
const BELL_RANGE: Partial<Record<number, readonly [number, number]>> = { 2: [7, 13], 5: [11, 20], 8: [9, 15], 9: [10, 17], 11: [8, 14] };

export class Brush {
  private voice: Voice | null = null;
  private lastCall = 0;
  private nextGrain = 0;
  private bellDeg = 10;
  private watchdog: ReturnType<typeof setInterval> | null = null;
  private readonly rng = makeRng(0xb4a5);

  constructor(
    private readonly rig: Rig,
    private readonly audible: () => boolean,
  ) {}

  update(active: boolean, speed: number, materialId: MaterialId): void {
    const now = this.rig.now();
    const sp = Number.isFinite(speed) ? Math.min(Math.max(speed, 0), 2) : 0;
    if (!active || !this.audible()) {
      this.fadeOut(now);
      return;
    }
    this.lastCall = now;
    const family = FAMILY_BY_ID.get(materialId) ?? 'grain';
    if (family === 'bell') {
      this.fadeOut(now);
      this.grains(now, sp, materialId);
      return;
    }
    if (!this.voice || this.voice.family !== family) {
      this.fadeOut(now);
      if (!this.rig.canSpawn()) return;
      this.voice = family === 'grain' ? this.makeGrain(now) : this.makeSweep(now);
      this.armWatchdog();
    }
    this.shape(this.voice, sp, materialId, now);
  }

  /** Fade the sustained voice to silence and let its group release itself. */
  fadeOut(now: number): void {
    const v = this.voice;
    if (this.watchdog !== null) {
      clearInterval(this.watchdog);
      this.watchdog = null;
    }
    if (!v) return;
    this.voice = null;
    cancelFrom(v.env.gain, now);
    glide(v.env.gain, 0, now, 0.045);
    v.group.stopAll(now + 0.4);
  }

  dispose(): void {
    this.fadeOut(this.rig.now());
  }

  private shape(v: Voice, speed: number, id: MaterialId, now: number): void {
    const tone = TONE[id] ?? 1;
    const lvl = Math.pow(Math.min(1, speed / 1.1), 0.7);
    if (v.family === 'grain') {
      glide(v.filter.frequency, (1200 + speed * 700) * tone, now, 0.05);
      glide(v.env.gain, 0.45 * lvl, now, 0.04);
    } else {
      glide(v.filter.frequency, (450 + speed * 1500) * tone, now, 0.08);
      glide(v.filter.Q, Math.max(1.4, 3.2 - speed * 1.4), now, 0.1);
      glide(v.env.gain, 1.25 * lvl, now, 0.06);
    }
  }

  private makeGrain(t: number): Voice {
    const rig = this.rig;
    let v!: Voice;
    rig.build((g) => {
      const src = g.noise(1);
      const lp = g.filter('lowpass', 1800, 0.6);
      const crackle = g.gain(0.55);
      const env = g.gain(0);
      const mod = g.noise(0.07);
      const modLp = g.filter('lowpass', 70, 0.5);
      const depth = g.gain(3.2);
      src.connect(lp);
      lp.connect(crackle);
      crackle.connect(env);
      env.connect(rig.out);
      mod.connect(modLp);
      modLp.connect(depth);
      depth.connect(crackle.gain);
      g.play(src, t, undefined, this.rng() * 2);
      g.play(mod, t, undefined, this.rng() * 2);
      v = { family: 'grain', group: g, env, filter: lp };
    });
    return v;
  }

  private makeSweep(t: number): Voice {
    const rig = this.rig;
    let v!: Voice;
    rig.build((g) => {
      const src = g.noise(1);
      const bp = g.filter('bandpass', 900, 3);
      const env = g.gain(0);
      const lfo = g.osc('sine', 0.37);
      const depth = g.gain(220);
      src.connect(bp);
      bp.connect(env);
      env.connect(rig.out);
      lfo.connect(depth);
      depth.connect(bp.frequency);
      g.play(src, t, undefined, this.rng() * 2);
      g.play(lfo, t);
      v = { family: 'sweep', group: g, env, filter: bp };
    });
    return v;
  }

  /** Sparse crystalline grains; density rises with speed, pitch random-walks up the F-Lydian scale. */
  private grains(now: number, speed: number, id: MaterialId): void {
    if (speed < 0.06 || now < this.nextGrain || !this.rig.canSpawn()) return;
    const interval = (0.2 - Math.min(speed, 1.5) * 0.09) * (0.75 + this.rng() * 0.5);
    this.nextGrain = now + interval;
    const [lo, hi] = BELL_RANGE[id] ?? [9, 16];
    const steps = [-2, -1, 1, 2, 3];
    let d = this.bellDeg + (steps[Math.floor(this.rng() * steps.length)] ?? 1);
    if (d > hi) d = hi - 2;
    if (d < lo) d = lo + 2;
    this.bellDeg = d;
    bell(this.rig, now + 0.004, lydianFreq(d), {
      gain: 0.07 + 0.07 * Math.min(1, speed),
      decay: 0.3,
      partials: [[2, 0.22]],
    });
  }

  /** If the app stops calling stroke() mid-gesture (finger resting), fade rather than hang. */
  private armWatchdog(): void {
    if (this.watchdog !== null) return;
    this.watchdog = setInterval(() => {
      if (this.rig.now() - this.lastCall > 0.6) this.fadeOut(this.rig.now());
    }, 200);
  }
}
