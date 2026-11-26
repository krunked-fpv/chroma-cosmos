/** Simulation contracts: HeroStoryQuest, PageFinaleController, HintRequestState, 20-Item Toybox. */
import type { ActorKind, AnimName, CompiledPage, HeroQuestId, SpriteLibrary, StoryMilestoneKind, UiSpriteId } from './art';
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
  | 'shootingStar' | 'constellationFireworks'
  | 'bubblePop' | 'meteorStreak' | 'lightningZap' | 'crownFireworks' | 'magnetArc' | 'echoTrail';

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

/** Live composite Hero Story Quest tracked for each right-side Cloisonne Story Medallion (3..4 per page). */
export interface HeroStoryQuest {
  questId: HeroQuestId;
  /** Strictly <= 2 words (e.g., "Violet", "Paper Rocket"). */
  label: string;
  thumbnailSpriteId: UiSpriteId;
  regionIds: number[];
  /** Weighted pixel coverage 0..1 across regionIds (blooms cleanly at 0.82, or 0.74 with Crown Seal). */
  progress: number;
  completed: boolean;
  /** True when >= 65% covered and paused >= 3s (triggers sliver-rescue twinkle). */
  stalled: boolean;
  /** True when currently pulsed/highlighted by Firefly Hint Lantern, tap-medallion, or 4.5s idle sync-pulse. */
  highlighted: boolean;
  /** Mean internal 480x270 canvas anchor point for Wisp & starlight arcs. */
  x: number;
  y: number;
}

/** Compatibility view mirroring HeroStoryQuest. */
export interface StoryStarState {
  id: StoryMilestoneKind;
  kind: StoryMilestoneKind;
  label: string;
  thumbnailSpriteId?: UiSpriteId;
  lit: boolean;
  /** 0..1 weighted progress */
  progress: number;
  regionIds: number[];
  x: number;
  y: number;
}

export type HintSource = 'none' | 'lantern' | 'medallion' | 'idle' | 'stalled';

/** Active Firefly Hint & Spotlight state driven by zero-cooldown requestHint() or idle/stalled escalation. */
export interface HintRequestState {
  active: boolean;
  source: HintSource;
  questId: HeroQuestId | null;
  targetRegionIds: number[];
  remainingMs: number;
  durationMs: number;
  /** 0..1 dimming intensity applied to non-target uncolored paper (0.12 max dim in shader when dimAmount=1). */
  dimAmount: number;
}

/** Automatic 2.8-second Page Awakened Finale & Auto-Page-Turn state machine. */
export interface PageFinaleState {
  active: boolean;
  remainingMs: number;
  durationMs: number;
  /** 0..1 countdown completion fraction (0 = just started, 1 = auto-turn fires). */
  progress: number;
  stayAndDoodle: boolean;
  autoTurnTriggered: boolean;
}

export interface PageFinaleController {
  readonly state: PageFinaleState;
  start(): void;
  reset(): void;
  setStayAndDoodle(stay: boolean): void;
  triggerNow(): void;
  /** Advances countdown; returns true on the exact tick when auto-turn should fire. */
  update(dtMs: number): boolean;
}

export type WispMode = 'hidden' | 'prologueMist' | 'prologueTapPencil' | 'prologueStroke' | 'idleGuide' | 'nudge' | 'hintBeam';

export interface WispRenderState {
  active: boolean;
  mode: WispMode;
  x: number;
  y: number;
  targetRegionId: number;
  /** 0..1 progress along the looping ghost stroke */
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
  /** 3..4 Composite Hero Story Quests for the Right-Side Cloisonne Story Medallions. */
  heroQuests?: HeroStoryQuest[];
  /** Synchronized alias of heroQuests. */
  storyStars?: StoryStarState[];
  /** Active Firefly Hint Lantern / tap-medallion / idle spotlight state. */
  hintState?: HintRequestState;
  /** Automatic 2.8s Page Awakened Finale & Auto-Turn state. */
  pageFinale?: PageFinaleState;
  /** Luminous Starlight Wisp & wordless Sleepy Hush prologue state. */
  wisp?: WispRenderState;
  /** Causality "Wonder Whispers" dotted charcoal sketch preview for hovered/active cloud or planet. */
  wonderWhisper?: WonderWhisperHint | null;
  /** Concentric starlight poke invitations around awakened interactive companions/objects. */
  pokeInvites?: PokeInvite[];
  /** Starlight Wand hover halo in internal coords (non-null only while Wand mode is active and hovering). */
  wandGlow?: { x: number; y: number; r: number } | null;
}

export type ItemFoleyKind = 'bubblePop' | 'catPurr' | 'crystalChime' | 'magnetHarp';

export type SimEvent =
  | { type: 'stage'; regionId: number; kind: RegionKind; stage: 1 | 2 | 3 | 4; materialId: number }
  | { type: 'autoBloom'; regionId: number; kind: RegionKind; materialId: number; x: number; y: number }
  | { type: 'causality'; effect: CausalityKind; regionId: number; x: number; y: number }
  | { type: 'actorAwake'; actor: ActorKind }
  | { type: 'poke'; actor: ActorKind; instanceId: string }
  | { type: 'gems'; amount: number; reason: string }
  | { type: 'stroke'; active: boolean; speed: number; materialId: number }
  | { type: 'relic'; relic: RelicId; tag?: string }
  | { type: 'itemFoley'; kind: ItemFoleyKind }
  | { type: 'violetBounce' }
  | { type: 'pageComplete' }
  | { type: 'heroQuestComplete'; questId: HeroQuestId; index: number; total: number; x: number; y: number }
  | { type: 'storyStarLit'; milestoneId: StoryMilestoneKind; index: number; x: number; y: number }
  | { type: 'hintStarted'; questId: HeroQuestId; regionIds: number[]; source: HintSource }
  | { type: 'autoPageTurnReady' }
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
  loadPage(p: CompiledPage, ctx: RunContext, sprites?: SpriteLibrary): void;
  setSprites?(sprites: SpriteLibrary): void;
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
  /** Zero-cooldown active Firefly Hint Lantern / Medallion spotlight request. */
  requestHint?(questId?: HeroQuestId, source?: 'lantern' | 'medallion'): HintRequestState;
  /** Toggle Stay & Doodle to pause/resume the automatic 2.8s page-turn countdown. */
  setStayAndDoodle?(stay: boolean): void;
  /** Wiggles uncolored regions of a Story Medallion & launches Wisp + spotlight there. */
  nudgeMilestone?(milestoneId: StoryMilestoneKind): void;
  /** Dissolves the Sleepy Hush prologue & Wisp ghost-stroke smoothly. */
  dismissPrologue?(): void;
  /** zig-zag scanline points inside the region at a 4 px step (QA helper) */
  qaStrokePath(regionId: number): { x: number; y: number }[];
}
