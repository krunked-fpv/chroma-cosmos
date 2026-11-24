/**
 * One-shot event sounds. Every pitch is a scale degree of F Lydian (0 = F4, 7 = F5 ...),
 * converted with lydianFreq(), so nothing can ever be out of key.
 */
import type { ActorKind } from '../contracts/art';
import type { CausalityKind } from '../contracts/causality';
import type { RegionKind } from '../contracts/regions';
import type { Rig } from './graph';
import { lydianFreq } from './scale';
import { bell, bend, marimba, pluck, purrChime, swell, whoosh } from './voices';

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
