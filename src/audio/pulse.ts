/**
 * 96-BPM Cosmic Pulse: a look-ahead scheduler (25 ms tick, 100 ms horizon) that plays additive stems.
 * Time grid = 32nd notes (STEP_SEC) anchored at audio time 0, so beatPhase() = (t / BEAT_SEC) mod 1
 * is always in sync with the scheduled notes. Harmony is F Lydian, a chord every two bars.
 */
import { BPM } from '../contracts/constants';
import type { StemId } from '../contracts/audio';
import { glide, makeRng, setVal, type Rig } from './graph';
import { lydianFreq } from './scale';
import { bell, marimba, padChord, pluck } from './voices';

export const BEAT_SEC = 60 / BPM;
export const STEP_SEC = BEAT_SEC / 8;
export const TICK_MS = 25;
export const HORIZON_SEC = 0.1;
const STEPS_PER_BAR = 32;

interface Chord {
  root: number;
  /** scale degrees (0 = F4); low voices first */
  tones: readonly number[];
}

/** Fmaj7(9) | G(add9) | Am7 | Cmaj7 - all diatonic to F Lydian. */
const CHORDS: readonly Chord[] = [
  { root: 0, tones: [-7, -5, -3, -1, 1] },
  { root: 1, tones: [-6, -4, -2, 2] },
  { root: 2, tones: [-5, -3, -1, 1] },
  { root: 4, tones: [-10, -3, -1, 1, 3] },
];
const ARP = [0, 1, 2, 1, 2, 3, 2, 1];
const STEM_LEVEL: Record<StemId, number> = { pad: 0.9, marimba: 0.8, harp: 0.8, celesta: 0.7 };
const STEM_IDS: readonly StemId[] = ['pad', 'marimba', 'harp', 'celesta'];

export class Pulse {
  private readonly buses = new Map<StemId, GainNode>();
  private enabled = new Set<StemId>();
  private timer: ReturnType<typeof setInterval> | null = null;
  private nextStep = 0;
  private deferred: Array<{ step: number; fn: (t: number) => void }> = [];
  private readonly rng = makeRng(0x96b9);
  private stopped = false;
  /** a freshly enabled pad joins mid-chord instead of waiting for the next chord change */
  private padPending = false;

  constructor(
    private readonly rig: Rig,
    private readonly audible: () => boolean,
  ) {
    for (const id of STEM_IDS) {
      const b = rig.track(rig.ctx.createGain());
      setVal(b.gain, 0);
      b.connect(rig.out);
      this.buses.set(id, b);
    }
  }

  get running(): boolean {
    return this.timer !== null;
  }

  setStems(list: readonly StemId[]): void {
    const next = new Set(list.filter((s) => STEM_IDS.includes(s)));
    if (next.has('pad') && !this.enabled.has('pad')) this.padPending = true;
    this.enabled = next;
    this.sync();
  }

  /** Apply bus fades and start/stop the scheduler to match the enabled set. */
  sync(): void {
    if (this.stopped) return;
    const now = this.rig.now();
    for (const id of STEM_IDS) {
      const bus = this.buses.get(id);
      if (bus) glide(bus.gain, this.enabled.has(id) ? STEM_LEVEL[id] : 0, now, 0.7);
    }
    if (this.enabled.size === 0) this.clearTimer();
    else this.startTimer();
  }

  stop(): void {
    this.stopped = true;
    this.clearTimer();
    this.deferred = [];
  }

  private startTimer(): void {
    if (this.timer !== null) return;
    this.nextStep = Math.ceil(this.rig.now() / STEP_SEC - 1e-9);
    this.deferred = [];
    this.timer = setInterval(() => this.tick(), TICK_MS);
    this.tick();
  }

  private clearTimer(): void {
    if (this.timer !== null) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }

  /** One scheduler tick: schedule every grid step that falls inside [now, now + horizon). */
  tick(): void {
    if (this.stopped) return;
    const st = (this.rig.ctx as { state?: string }).state;
    if (typeof st === 'string' && st !== 'running') return;
    const now = this.rig.now();
    // fell far behind (throttled background tab): resync to the grid instead of burst-playing
    if (this.nextStep * STEP_SEC < now - 0.25) this.nextStep = Math.ceil(now / STEP_SEC) + 1;
    while (this.nextStep * STEP_SEC < now + HORIZON_SEC) {
      this.scheduleStep(this.nextStep, this.nextStep * STEP_SEC);
      this.nextStep++;
    }
  }

  private scheduleStep(step: number, t: number): void {
    if (this.deferred.length) {
      const due = this.deferred.filter((d) => d.step <= step);
      this.deferred = this.deferred.filter((d) => d.step > step);
      if (this.audible()) for (const d of due) d.fn(t);
    }
    if (!this.audible() || !this.rig.canSpawn()) return;
    const bar = Math.floor(step / STEPS_PER_BAR);
    const pos = step - bar * STEPS_PER_BAR;
    const chord = CHORDS[Math.floor(bar / 2) % CHORDS.length] ?? CHORDS[0]!;
    const bus = (id: StemId): AudioNode | undefined => (this.enabled.has(id) ? this.buses.get(id) : undefined);

    const pad = bus('pad');
    if (pad) {
      const chordStep = (bar % 2) * STEPS_PER_BAR + pos;
      if (chordStep === 0) {
        padChord(this.rig, t, chord.tones, 2 * STEPS_PER_BAR * STEP_SEC, pad);
        this.padPending = false;
      } else if (this.padPending) {
        const left = (2 * STEPS_PER_BAR - chordStep) * STEP_SEC;
        if (left >= 1.2) padChord(this.rig, t, chord.tones, left, pad);
        this.padPending = false;
      }
    }

    const mar = bus('marimba');
    if (mar && pos % 4 === 0) {
      const slot = ARP[pos / 4] ?? 0;
      const upper = chord.tones.slice(1);
      const deg = upper[slot % upper.length];
      if (deg !== undefined && this.rng() > 0.12) marimba(this.rig, t, lydianFreq(deg + 7), { dest: mar, gain: 0.12 });
    }

    const harp = bus('harp');
    if (harp && bar % 4 === 3 && pos < 8) {
      const up = Math.floor(bar / 4) % 2 === 0;
      const deg = chord.root + (up ? pos : 7 - pos);
      pluck(this.rig, t, lydianFreq(deg + 7), { dest: harp, gain: 0.09, decay: 1.1, rich: false });
    }

    const cel = bus('celesta');
    if (cel && pos % 4 === 2 && this.rng() < 0.22) {
      const upper = chord.tones.slice(1);
      const deg = (upper[Math.floor(this.rng() * upper.length)] ?? 0) + 14;
      const second = deg + (this.rng() < 0.5 ? 2 : 4);
      bell(this.rig, t, lydianFreq(deg), { dest: cel, gain: 0.05, decay: 0.7, partials: [[2, 0.3]] });
      this.deferred.push({
        step: step + 1,
        fn: (t2) => bell(this.rig, t2, lydianFreq(second), { dest: cel, gain: 0.04, decay: 0.8, partials: [[2, 0.3]] }),
      });
    }
  }
}
