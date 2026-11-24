/** Simulation contracts. */
import type { ActorKind, AnimName, CompiledPage } from './art';
import type { CausalityKind } from './causality';
import type { GestureEvent } from './input';
import type { MaterialId } from './materials';
import type { RegionKind } from './regions';
import type { BrushId, ChapterId, RelicId } from './roguelike';

export interface ToolState {
  materialId: MaterialId;
  brush: BrushId;
  doodle: boolean;
}

export interface RunContext {
  seed: number;
  chapterIndex: number;
  brushes: readonly BrushId[];
  relics: readonly RelicId[];
  viewOnly?: boolean;
}

export interface GpuStamp {
  x: number;
  y: number;
  radius: number;
  materialId: number;
  dx: number;
  dy: number;
  strength: number;
}

export interface GpuStampBatch {
  /** length 256, 1 = region id allowed */
  allowed: Uint8Array;
  stamps: GpuStamp[];
}

export interface ActorRenderState {
  instanceId: string;
  kind: ActorKind;
  slot: number;
  x: number;
  y: number;
  facing: 1 | -1;
  anim: AnimName;
  frame: number;
  /** true once the actor is drawn from its sprite sheet instead of the static line art */
  live: boolean;
  remap?: Record<number, number>;
}

export type EffectKind =
  | CausalityKind
  | 'rainbowArc' | 'rainbowBridge' | 'harmonyArc' | 'gemPickup' | 'starBurst' | 'paperDust'
  | 'stardustTrail' | 'chromaticRipple' | 'goldDoodle' | 'hiddenStar' | 'paintSplatComet'
  | 'shootingStar' | 'constellationFireworks';

export interface EffectRenderState {
  id: number;
  kind: EffectKind;
  x: number;
  y: number;
  x2?: number;
  y2?: number;
  /** 0..1 normalized progress */
  t: number;
  ageMs: number;
  seed: number;
  materialId?: number;
}

export interface SimView {
  regionState: Uint8Array;
  regionStateDirty: boolean;
  actors: ActorRenderState[];
  effects: EffectRenderState[];
  pageAwakening: number;
  coreAwake: number;
  coreTotal: number;
  pageComplete: boolean;
  uvFlashlight: { x: number; y: number; r: number } | null;
  sparkleSources: { x: number; y: number }[];
}

export type SimEvent =
  | { type: 'stage'; regionId: number; kind: RegionKind; stage: 1 | 2 | 3 | 4; materialId: number }
  | { type: 'autoBloom'; regionId: number; kind: RegionKind; materialId: number; x: number; y: number }
  | { type: 'causality'; effect: CausalityKind; regionId: number; x: number; y: number }
  | { type: 'actorAwake'; actor: ActorKind }
  | { type: 'poke'; actor: ActorKind; instanceId: string }
  | { type: 'gems'; amount: number; reason: string }
  | { type: 'stroke'; active: boolean; speed: number; materialId: number }
  | { type: 'relic'; relic: RelicId }
  | { type: 'violetBounce' }
  | { type: 'pageComplete' };

export interface StoryPageSnapshot {
  sceneId: ChapterId;
  seed: number;
  paintedMaskRle: Uint8Array;
  /** length 256 */
  regionMaterialId: Uint8Array;
  completedRegionIds: number[];
}

export interface SimulationPort {
  loadPage(p: CompiledPage, ctx: RunContext): void;
  setTool(t: ToolState): void;
  gesture(e: GestureEvent): void;
  hover(p: { x: number; y: number } | null): void;
  update(dtMs: number, timeMs: number): void;
  /** clears regionStateDirty */
  view(): SimView;
  drainEvents(): SimEvent[];
  drainStampBatches(): GpuStampBatch[];
  /** O(1), 0..1 */
  regionPercent(id: number): number;
  snapshotPage(): StoryPageSnapshot;
  restorePage(s: StoryPageSnapshot): void;
  /** zig-zag scanline points inside the region at a 4 px step (QA helper) */
  qaStrokePath(regionId: number): { x: number; y: number }[];
}
