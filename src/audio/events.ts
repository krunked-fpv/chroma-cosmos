/**
 * One-shot event sounds. Every pitch is a scale degree of F Lydian (0 = F4, 7 = F5 ...),
 * converted with lydianFreq(), so nothing can ever be out of key.
 */
import type { ActorKind } from '../contracts/art';
import type { CausalityKind } from '../contracts/causality';
import type { RegionKind } from '../contracts/regions';
import { expTo, linTo, setAt, type Rig } from './graph';
import { lydianFreq } from './scale';
import { bell, bend, envAD, marimba, pluck, purrChime, swell, whoosh } from './voices';

const REGION_KINDS: readonly RegionKind[] = [
  'violet', 'lumi', 'nova', 'planet', 'rings', 'cloud', 'comet', 'moonCat',
  'milkshake', 'whale', 'asteroid', 'star', 'rocket', 'flora', 'prop', 'ghost', 'system',
];

/** Soft pluck pitched by stage (rising) and region kind (each kind sits on its own scale degree). */
export function playStage(rig: Rig, kind: RegionKind, stage: number): void {
  if (!Number.isFinite(stage) || stage < 1) return;
  const s = Math.min(4, Math.round(stage));
  const offset = Math.max(0, REGION_KINDS.indexOf(kind)) % 7;
  const deg = ((offset + (s - 1) * 2) % 7) + (s >= 3 ? 7 : 0);
  const t = rig.now() + 0.01;
  pluck(rig, t, lydianFreq(deg), { gain: 0.1 + s * 0.015, decay: 0.6 + s * 0.15, rich: s >= 3 });
  if (s === 4) bell(rig, t + 0.09, lydianFreq(deg + 4), { gain: 0.06, decay: 0.7 });
}

/** Triumphant Fmaj7(#11)/9 swell: F3 sub, then F A C E G B rising, with two glass sparkles on top. */
export function playAutoBloom(rig: Rig): void {
  const t = rig.now() + 0.01;
  swell(rig, t, [-7, 0, 2, 4, 6, 8, 10], 0.9, [0.1, 0.085, 0.075, 0.07, 0.065, 0.06, 0.05]);
  bell(rig, t + 0.55, lydianFreq(14), { gain: 0.05, decay: 1.6, partials: [[2, 0.25]] });
  bell(rig, t + 0.75, lydianFreq(18), { gain: 0.04, decay: 1.8, partials: [[2, 0.25]] });
}

const ACTOR_BELL: Record<ActorKind, { deg: number[]; gain: number; decay: number }> = {
  violet: { deg: [2, 4], gain: 0.1, decay: 0.7 },
  lumi: { deg: [0], gain: 0.1, decay: 0.7 },
  nova: { deg: [2, 6], gain: 0.1, decay: 0.55 },
  moonCat: { deg: [1, 5], gain: 0.1, decay: 0.9 },
  comet: { deg: [6, 8], gain: 0.09, decay: 0.8 },
  whale: { deg: [-5, -1], gain: 0.13, decay: 1.5 },
  gazelle: { deg: [3, 5], gain: 0.09, decay: 0.6 },
  cometCar: { deg: [4, 6], gain: 0.09, decay: 0.5 },
  flower: { deg: [5, 7], gain: 0.09, decay: 0.8 },
  gem: { deg: [9, 11], gain: 0.07, decay: 0.9 },
  butterfly: { deg: [8, 10, 12], gain: 0.075, decay: 0.65 },
  bubble: { deg: [7, 11], gain: 0.08, decay: 0.45 },
};

export function playPoke(rig: Rig, actor: ActorKind): void {
  const t = rig.now() + 0.01;
  if (actor === 'nova') {
    purrChime(rig, t, lydianFreq(2));
    purrChime(rig, t + 0.16, lydianFreq(6), { gain: 0.09 });
    return;
  }
  if (actor === 'lumi') {
    for (let i = 0; i < 8; i++) pluck(rig, t + i * 0.055, lydianFreq(i), { gain: 0.1, decay: 0.8, bright: 4 });
    return;
  }
  const b = ACTOR_BELL[actor] ?? { deg: [2], gain: 0.1, decay: 0.7 };
  b.deg.forEach((d, i) => bell(rig, t + i * 0.11, lydianFreq(d), { gain: b.gain, decay: b.decay, partials: [[2, 0.25], [4, 0.08]] }));
}

/** A creature waking up: a rising triad on its own degree with a sparkle on top. */
export function playActorAwake(rig: Rig, actor: ActorKind): void {
  const t = rig.now() + 0.01;
  const base = (ACTOR_BELL[actor] ?? ACTOR_BELL.violet).deg[0] ?? 2;
  [0, 2, 4].forEach((o, i) => bell(rig, t + i * 0.1, lydianFreq(base + o), { gain: 0.09, decay: 0.9, partials: [[2, 0.2]] }));
  bell(rig, t + 0.34, lydianFreq(base + 7), { gain: 0.05, decay: 1.2 });
}

type Voice = 'pluck' | 'bell' | 'marimba';
interface Note {
  at: number;
  deg: number;
  v: Voice;
  g?: number;
}

const run = (v: Voice, degs: number[], gap: number, g: number): Note[] => degs.map((deg, i) => ({ at: i * gap, deg, v, g }));

const MOTIFS: Record<Exclude<CausalityKind, 'zeroGTrampoline'>, Note[]> = {
  /** whole scale slides down like a rainbow */
  rainbowSlide: run('pluck', [13, 12, 11, 10, 9, 8, 7, 6], 0.06, 0.08),
  /** irregular petals of light falling */
  starlightFlowerRain: [14, 12, 13, 10, 11, 9].map((deg, i) => ({ at: [0, 0.11, 0.19, 0.33, 0.41, 0.58][i] ?? 0, deg, v: 'bell' as const, g: 0.07 })),
  /** quick rising run, a little wheel-spin */
  cheetahRacetrack: run('marimba', [0, 2, 4, 6, 7, 9], 0.07, 0.1),
  /** shimmering mirrorball arpeggio, two rotations */
  discoMirage: run('bell', [11, 13, 15, 13, 11, 13, 15, 17], 0.07, 0.06),
  gentleSparkle: run('bell', [9, 11], 0.12, 0.08),
};

export function playCausality(rig: Rig, kind: CausalityKind): void {
  const t = rig.now() + 0.01;
  if (kind === 'zeroGTrampoline') {
    [[0, 4], [2, 6], [4, 8]].forEach(([a, b], i) => bend(rig, t + i * 0.22, lydianFreq(a ?? 0), lydianFreq(b ?? 4), 0.3, { gain: 0.09 }));
    return;
  }
  const motif = MOTIFS[kind] ?? MOTIFS.gentleSparkle;
  for (const n of motif) {
    const f = lydianFreq(n.deg);
    const at = t + n.at;
    if (n.v === 'pluck') pluck(rig, at, f, { gain: n.g, decay: 0.7 });
    else if (n.v === 'marimba') marimba(rig, at, f, { gain: n.g, decay: 0.35 });
    else bell(rig, at, f, { gain: n.g, decay: 0.6 });
  }
}

export function playPageTurn(rig: Rig): void {
  whoosh(rig, rig.now() + 0.01);
}

const eventStep = new WeakMap<Rig, number>();

function nextEventOffset(rig: Rig, salt: number): number {
  const n = eventStep.get(rig) ?? 0;
  eventStep.set(rig, n + 1);
  return ((n * 0.47 + salt) % 1.9 + 1.9) % 1.9;
}

/**
 * Ascending F-Lydian Story Medallion chord voicings (all strictly diatonic via lydianFreq):
 * - Step 0: Fmaj9       (F4 A4 C5 E5 G5)
 * - Step 1: G6 / Gadd9  (G4 B4 D5 E5 A5)
 * - Step 2: Am11        (A4 C5 E5 G5 B5 D6)
 * - Step 3: Cmaj9 apex  (C5 E5 G5 B5 D6 F6)
 */
const MEDALLION_VOICINGS: ReadonlyArray<{
  readonly bass: number;
  readonly notes: readonly number[];
  readonly shimmer: number;
}> = [
  { bass: -7, notes: [0, 2, 4, 6, 8], shimmer: 15 },
  { bass: -6, notes: [1, 3, 5, 6, 9], shimmer: 16 },
  { bass: -5, notes: [2, 4, 6, 8, 10, 12], shimmer: 16 },
  { bass: -3, notes: [4, 6, 8, 10, 12, 14], shimmer: 18 },
];

/** Ascending F-Lydian harmonic bloom played as each Hero Story Medallion completes. */
export function playStoryMedallion(rig: Rig, stepIndex: number, total: number): void {
  const rawStep = Number.isFinite(stepIndex) ? Math.max(0, Math.round(stepIndex)) : 0;
  const safeTotal = Number.isFinite(total) && total > 0 ? Math.round(total) : 4;
  const idx = safeTotal >= 4 && rawStep >= 3 ? 3 : Math.min(2, rawStep);
  const voicing = MEDALLION_VOICINGS[idx] ?? MEDALLION_VOICINGS[0]!;
  const t = rig.now() + 0.008;

  rig.build((g) => {
    const lp = g.filter('lowpass', 3400 + idx * 450, 0.65);
    lp.connect(rig.out);

    const bassOsc = g.osc('sine', lydianFreq(voicing.bass));
    const bassEnv = g.gain(0);
    const bassEnd = envAD(bassEnv.gain, t, 0.068, 0.02, 1.05 + idx * 0.1) + 0.04;
    bassOsc.connect(bassEnv);
    bassEnv.connect(lp);
    g.play(bassOsc, t, bassEnd);

    const decay = 0.92 + idx * 0.12;
    voicing.notes.forEach((deg, i) => {
      const tNote = t + i * 0.052;
      const osc = g.osc(i < 2 ? 'triangle' : 'sine', lydianFreq(deg));
      const env = g.gain(0);
      const peak = Math.max(0.042, 0.072 - i * 0.005);
      const end = envAD(env.gain, tNote, peak, 0.01, decay) + 0.04;
      osc.connect(env);
      env.connect(lp);
      g.play(osc, tNote, end);
    });

    const tShim = t + voicing.notes.length * 0.052 + 0.03;
    const shimOsc = g.osc('sine', lydianFreq(voicing.shimmer));
    const shimEnv = g.gain(0);
    const shimEnd = envAD(shimEnv.gain, tShim, 0.036 + idx * 0.004, 0.004, 0.95 + idx * 0.12) + 0.04;
    shimOsc.connect(shimEnv);
    shimEnv.connect(lp);
    g.play(shimOsc, tShim, shimEnd);
  });
}

/**
 * Page Awakened Ensemble Fanfare: warm harp/marimba harmonic bloom + sparkling celesta top bells
 * + silky cotton page-rustle undertone, all strictly F-Lydian and self-releasing on onended.
 */
export function playPageFinale(rig: Rig): void {
  const t = rig.now() + 0.01;
  const rustleOffset = nextEventOffset(rig, 0.37);

  rig.build((g) => {
    // Silky cotton page-rustle undertone
    const rustle = g.noise(0.96);
    const bp = g.filter('bandpass', 680, 1.0);
    const rustleLp = g.filter('lowpass', 2000, 0.6);
    const rustleEnv = g.gain(0);
    setAt(bp.frequency, 680, t);
    expTo(bp.frequency, 1520, t + 0.32);
    expTo(bp.frequency, 820, t + 0.95);
    setAt(rustleEnv.gain, 0, t);
    linTo(rustleEnv.gain, 0.11, t + 0.14);
    expTo(rustleEnv.gain, 0.012, t + 0.72);
    linTo(rustleEnv.gain, 0, t + 0.98);
    rustle.connect(bp);
    bp.connect(rustleLp);
    rustleLp.connect(rustleEnv);
    rustleEnv.connect(rig.out);
    g.play(rustle, t, t + 1.04, rustleOffset);

    // Warm harp & marimba harmonic bloom (F3 anchor + Fmaj9 rising chord + A5/C6 lift)
    const warmLp = g.filter('lowpass', 4200, 0.6);
    setAt(warmLp.frequency, 4200, t);
    expTo(warmLp.frequency, 1850, t + 1.65);
    warmLp.connect(rig.out);

    const bloomNotes: ReadonlyArray<readonly [number, number, OscillatorType, number, number]> = [
      [-7, 0.0, 'sine', 0.082, 1.45],
      [0, 0.045, 'triangle', 0.072, 1.38],
      [2, 0.09, 'sine', 0.068, 1.35],
      [4, 0.14, 'triangle', 0.066, 1.35],
      [6, 0.195, 'sine', 0.06, 1.35],
      [8, 0.255, 'triangle', 0.056, 1.38],
      [9, 0.34, 'sine', 0.058, 1.15],
      [11, 0.43, 'triangle', 0.054, 1.15],
    ];
    for (const [deg, offset, type, peak, decay] of bloomNotes) {
      const start = t + offset;
      const osc = g.osc(type, lydianFreq(deg));
      const env = g.gain(0);
      const end = envAD(env.gain, start, peak, 0.006, decay) + 0.04;
      osc.connect(env);
      env.connect(warmLp);
      g.play(osc, start, end);
    }

    // Celesta & sparkling top bells crowning halo (B5 -> D6 -> E6 -> F6 -> A6)
    const bellLp = g.filter('lowpass', 5400, 0.55);
    bellLp.connect(rig.out);

    const crownBells: ReadonlyArray<readonly [number, number, number, number]> = [
      [10, 0.34, 0.046, 1.15],
      [12, 0.45, 0.044, 1.2],
      [13, 0.56, 0.042, 1.28],
      [14, 0.68, 0.045, 1.36],
      [16, 0.82, 0.04, 1.45],
    ];
    for (const [deg, offset, peak, decay] of crownBells) {
      const start = t + offset;
      const osc = g.osc('sine', lydianFreq(deg));
      const env = g.gain(0);
      const end = envAD(env.gain, start, peak, 0.003, decay) + 0.05;
      osc.connect(env);
      env.connect(bellLp);
      g.play(osc, start, end);
    }
  });
}

/**
 * Firefly Hint Lantern Chime: warm crystalline F-Lydian music-box bell motif
 * + soft fairy-dust flutter noise puff.
 */
export function playHintLantern(rig: Rig): void {
  const t = rig.now() + 0.008;
  const puffOffset = nextEventOffset(rig, 0.83);

  rig.build((g) => {
    // Soft fairy-dust flutter noise puff
    const puff = g.noise(1.16);
    const bp = g.filter('bandpass', 1450, 1.6);
    const puffLp = g.filter('lowpass', 3600, 0.6);
    const puffEnv = g.gain(0);
    setAt(bp.frequency, 1450, t);
    expTo(bp.frequency, 2650, t + 0.09);
    expTo(bp.frequency, 1750, t + 0.25);
    setAt(puffEnv.gain, 0, t);
    linTo(puffEnv.gain, 0.068, t + 0.045);
    expTo(puffEnv.gain, 1e-4, t + 0.245);
    linTo(puffEnv.gain, 0, t + 0.26);
    puff.connect(bp);
    bp.connect(puffLp);
    puffLp.connect(puffEnv);
    puffEnv.connect(rig.out);
    g.play(puff, t, t + 0.28, puffOffset);

    // Warm crystalline music-box bell motif (F5 -> A5 -> C6 -> E6 + F6 glint)
    const bellLp = g.filter('lowpass', 4200, 0.55);
    bellLp.connect(rig.out);

    const motif: ReadonlyArray<readonly [number, number, OscillatorType, number, number]> = [
      [7, 0.01, 'triangle', 0.072, 0.55],
      [9, 0.08, 'sine', 0.064, 0.58],
      [11, 0.15, 'sine', 0.058, 0.64],
      [13, 0.22, 'sine', 0.054, 0.78],
      [14, 0.28, 'sine', 0.032, 0.68],
    ];
    for (const [deg, offset, type, peak, decay] of motif) {
      const start = t + offset;
      const osc = g.osc(type, lydianFreq(deg));
      const env = g.gain(0);
      const end = envAD(env.gain, start, peak, 0.004, decay) + 0.04;
      osc.connect(env);
      env.connect(bellLp);
      g.play(osc, start, end);
    }
  });
}
