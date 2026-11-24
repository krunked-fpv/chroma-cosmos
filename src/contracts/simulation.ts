/** Simulation contracts. */
import type { ActorKind, AnimName, CompiledPage, StoryMilestoneKind } from './art';
import type { CausalityKind } from './causality';
import type { GestureEvent } from './input';
import type { MaterialId } from './materials';
import type { RegionKind } from './regions';
import type { BrushId, ChapterId, RelicId } from './roguelike';

export type ToolMode = 'pencil' | 'wand';

export interface ToolState {
  materialId: MaterialId;
  brush: BrushId;
  doodle: boolean;
  /** Mirrors `doodle` ('pencil' = stay-in-the-lines awaken, 'wand' = sky constellation & wonder-poke). */
  toolMode?: ToolMode;
}

export interface RunContext {
  seed: number;
  chapterIndex: number;
  brushes: readonly BrushId[];
  relics: readonly RelicId[];
  viewOnly?: boolean;
  /** Play the wordless Sleepy Hush prologue + Starlight Wisp ghost-stroke on Chapter 1 cold-open. */
  playPrologue?: boolean;
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

export interface StoryStarState {
  id: StoryMilestoneKind;
  kind: StoryMilestoneKind;
  label: string;
  lit: boolean;
  /** 0..1 fraction of milestone regions bloomed */
  progress: number;
  regionIds: number[];
  x: number;
  y: number;
}

export type WispMode = 'hidden' | 'prologueMist' | 'prologueTapPencil' | 'prologueStroke' | 'idleGuide' | 'nudge';

export interface WispRenderState {
  active: boolean;
  mode: WispMode;
  x: number;
  y: number;
  targetRegionId: number;
  /** 0..1 progress along the looping prologue ghost stroke */
  ghostStrokeT: number;
  /** Internal 480x270 points tracing the looping rainbow ghost-stroke */
  ghostPath: { x: number; y: number }[];
  /** 0..1 Sleepy Hush lavender mist veil intensity */
  prologueMist: number;
  /** 0..1 visibility alpha of the Wisp sprite */
  alpha: number;
}

export interface WonderWhisperHint {
  regionId: number;
  effect: CausalityKind;
  x: number;
  y: number;
  x0: number;
  y0: number;
  x1: number;
  y1: number;
}

export interface PokeInvite {
  instanceId: string;
  kind: ActorKind | 'cloud' | 'planet';
  x: number;
  y: number;
  /** true on first awakening of Lumi or Nova to pulse an inviting sparkle-ring until poked */
  firstAwake: boolean;
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
  /** Uncolored colourable region id currently hovered/touched in Pencil mode (0 = none). */
  hoveredRegionId?: number;
  /** 3..5 Storyboard Bookmark Star Sockets (distinct from Prism Stardust Crystals). */
  storyStars?: StoryStarState[];
  /** Luminous Starlight Wisp & wordless Sleepy Hush prologue state. */
  wisp?: WispRenderState;
  /** Causality "Wonder Whispers" dotted charcoal sketch preview for hovered/active cloud or planet. */
  wonderWhisper?: WonderWhisperHint | null;
  /** Concentric starlight poke invitations around awakened interactive companions/objects. */
  pokeInvites?: PokeInvite[];
  /** Starlight Wand hover halo in internal coords (non-null only while Wand mode is active and hovering). */
  wandGlow?: { x: number; y: number; r: number } | null;
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
  | { type: 'pageComplete' }
  | { type: 'storyStarLit'; milestoneId: StoryMilestoneKind; index: number; x: number; y: number }
  | { type: 'wispGuide'; regionId: number; mode: WispMode }
  | { type: 'prologueEnd' };

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
  /** Wiggles uncolored regions of a Bookmark Story Star Socket & briefly guides Wisp there. */
  nudgeMilestone?(milestoneId: StoryMilestoneKind): void;
  /** Dissolves the Sleepy Hush prologue & Wisp ghost-stroke smoothly. */
  dismissPrologue?(): void;
  /** zig-zag scanline points inside the region at a 4 px step (QA helper) */
  qaStrokePath(regionId: number): { x: number; y: number }[];
}
