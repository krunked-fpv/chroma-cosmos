/** Audio contracts. */
import type { ActorKind } from './art';
import type { CausalityKind } from './causality';
import type { MaterialId } from './materials';
import type { RegionKind } from './regions';

/** 0 = muted; cycle 3 -> 2 -> 1 -> 0 -> 3 */
export type AudioLevel = 0 | 1 | 2 | 3;
export type StemId = 'pad' | 'marimba' | 'harp' | 'celesta';

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
  setStems(s: StemId[]): void;
  /** 0..1 position within the current beat, from the audio clock (or wall clock before unlock) */
  beatPhase(): number;
  stats(): { liveNodes: number; totalCreated: number };
  dispose(): void;
}
