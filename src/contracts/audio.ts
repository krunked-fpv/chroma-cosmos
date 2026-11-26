/** Audio contracts (F-Lydian generative synth + cozy ASMR foley; strictly ZERO speechSynthesis). */
import type { ActorKind } from './art';
import type { CausalityKind } from './causality';
import type { MaterialId } from './materials';
import type { RegionKind } from './regions';
import type { UniverseAmbientKind } from './universes';

/** 0 = muted; cycle 3 -> 2 -> 1 -> 0 -> 3 */
export type AudioLevel = 0 | 1 | 2 | 3;
export type StemId = 'pad' | 'marimba' | 'harp' | 'celesta';
export type UiFoleyKind =
  | 'paperRustle'
  | 'woodTap'
  | 'jarClink'
  | 'stickerPeel'
  | 'wispChime'
  | 'tinSnap'
  | 'lanternChime'
  | 'bubblePop'
  | 'catPurr'
  | 'crystalChime'
  | 'magnetHarp'
  | 'medallionStep'
  | 'pageFinale';

export interface AudioPort {
  unlock(): Promise<void>;
  setLevel(l: AudioLevel): void;
  level(): AudioLevel;
  stroke(active: boolean, speed: number, materialId: MaterialId): void;
  stage(kind: RegionKind, stage: number): void;
  autoBloom(): void;
  poke(actor: ActorKind): void;
  actorAwake(actor: ActorKind): void;
  causality(k: CausalityKind): void;
  pageTurn(): void;
  /** Ascending F-Lydian harmonic step (Fmaj9 -> G6 -> Am11) as each Story Medallion completes. */
  storyMedallion?(stepIndex: number, total: number): void;
  /** Lush Page Awakened Ensemble Fanfare when all Story Medallions complete. */
  pageFinale?(): void;
  /** Warm crystalline music-box bell + fairy-dust flutter for the Firefly Hint Lantern. */
  hintLantern?(): void;
  /** Warm low-pass procedural tabletop ASMR foley (strictly zero voices). */
  uiFoley?(kind: UiFoleyKind): void;
  /** Transpose generative F-Lydian harmonic palette & ambient shimmer for the active universe. */
  setUniverseTone?(semitoneShift: number, ambient?: UniverseAmbientKind): void;
  /** Sparkling multiversal fanfare played when completing a frontier universe unlocks the next realm. */
  universeUnlock?(): void;
  setStems(s: StemId[]): void;
  /** 0..1 position within the current beat, from the audio clock (or wall clock before unlock) */
  beatPhase(): number;
  stats(): { liveNodes: number; totalCreated: number };
  dispose(): void;
}
