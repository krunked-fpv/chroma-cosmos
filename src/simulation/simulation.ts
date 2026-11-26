/**
 * Simulation: O(1) coverage, Smart Touch-Lock painting, 4-stage awakening, Auto-Bloom,
 * Pigment-Driven Causality, actors, relics, snapshots. Deterministic; driven only by
 * gesture()/hover()/update(dt). No timers of any kind.
 */
import {
  BRUSH_RADIUS_PX,
  CANONICAL_REGIONS,
  CROWN_QUEST_BLOOM_THRESHOLD,
  DRAFT_CARDS,
  GEM_REWARDS,
  HERO_QUEST_BLOOM_THRESHOLD,
  HINT_SPOTLIGHT_MS,
  IDLE_WISP_DELAY_MS,
  KALEIDOSCOPE_PREFILL,
  KALEIDOSCOPE_TARGETS,
  MAX_MATERIAL_ID,
  MAX_STAMPS_PER_BATCH,
  PAGE_H,
  PAGE_PIXELS,
  PAGE_W,
  PROLOGUE_DURATION_MS,
  REGION_FLAG,
  REGION_RANGES,
  REGION_STATE_BYTES,
  REGION_STATE_ROW1_OFFSET,
  RIPPLE_MS,
  SOCKET_WIGGLE_MS,
  STAGE_MIN,
  STALLED_QUEST_DELAY_MS,
  STALLED_QUEST_THRESHOLD,
  STAMP_SPACING,
  UV_FLASHLIGHT_RADIUS,
  WAND_UV_PEEK_RADIUS,
} from '../contracts';
import type {
  ActorRenderState,
  BrushId,
  CausalityKind,
  ChapterId,
  CompiledPage,
  GestureEvent,
  GpuStamp,
  GpuStampBatch,
  HeroQuestId,
  HeroStoryQuest,
  HintRequestState,
  HintSource,
  PageFinaleController,
  PagePath,
  PokeInvite,
  RegionKind,
  RelicId,
  RunContext,
  SimEvent,
  SimView,
  SimulationPort,
  SpriteFrame,
  SpriteLibrary,
  SpriteSheet,
  StoryMilestoneKind,
  StoryPageSnapshot,
  StoryStarState,
  ToolMode,
  ToolState,
  UiSpriteId,
  WispMode,
  WispRenderState,
  WonderWhisperHint,
} from '../contracts';
import { ActorSystem } from './actors';
import type { ActorHost, ActorRT } from './actors';
import { matchCausality } from './causality';
import { Coverage } from './coverage';
import { EffectPool } from './effects';
import type { EffectRT } from './effects';
import { createPageFinaleController } from './finale';
import { clamp, mulberry32 } from './util';

const DYNAMIC_MAX = REGION_RANGES.dynamic[1];
const SYSTEM_MIN = REGION_RANGES.system[0];
const SYSTEM_MAX = REGION_RANGES.system[1];
const GHOST_MIN = REGION_RANGES.ghost[0];
const GHOST_MAX = REGION_RANGES.ghost[1];

const SPONGE_KINDS: readonly RegionKind[] = ['star', 'asteroid', 'cloud', 'comet'];
const ZOOMIE_FILL = 0.5;
const GOLD = 11;
const HOLO_FOIL = 2;
const MIRAGE_RANGE = 260;
const PROLOGUE_MIST_END_MS = 1800;
const PROLOGUE_TAP_END_MS = 3100;
const PROLOGUE_STROKE_LOOP_MS = 2200;
const PROLOGUE_DISSOLVE_MS = 250;
const PENCIL_TRAY_X = 165;
const PENCIL_TRAY_Y = 256;
const HINT_FADE_MS = 300;
const MOON_CAT_INTERVAL_MS = 3500;
const MOON_CAT_FILL_FRACTION = 0.2;
const BUBBLE_SPLASH_FRACTION = 0.18;
const BUTTERFLY_ECHO_FRACTION = 0.3;
const LIGHTNING_TRIGGER_PCT = 0.55;
const LIGHTNING_FILL_FRACTION = 0.22;
const MAGNET_SPEED_PX_S = 280;

const RELIC_TAGS: Partial<Record<RelicId, string>> = (() => {
  const out: Partial<Record<RelicId, string>> = {};
  for (const card of DRAFT_CARDS) {
    if (card.type === 'relic') out[card.id as RelicId] = card.shortTag;
  }
  return out;
})();

const DEFAULT_MILESTONES: ReadonlyArray<{ id: StoryMilestoneKind; label: string; ids: readonly number[] }> = [
  { id: 'violet', label: 'Violet', ids: [1, 2, 3, 4] },
  { id: 'lumi', label: 'Lumi', ids: [5, 6, 7, 8] },
  { id: 'nova', label: 'Nova', ids: [9, 10, 11] },
  { id: 'planet', label: 'Ringed Planet', ids: [12, 13] },
  { id: 'cloud', label: 'Space Clouds', ids: [14, 15] },
];

function normMat(m: number): number {
  return Number.isInteger(m) && m >= 1 && m <= MAX_MATERIAL_ID ? m : 1;
}

function smoothstep(t: number): number {
  const c = clamp(t, 0, 1);
  return c * c * (3 - 2 * c);
}

function samplePath(pts: readonly { x: number; y: number }[], t: number): { x: number; y: number } {
  if (pts.length === 0) return { x: PAGE_W / 2, y: PAGE_H / 2 };
  if (pts.length === 1) return { x: pts[0]!.x, y: pts[0]!.y };
  const u = clamp(t, 0, 1) * (pts.length - 1);
  const i = Math.min(pts.length - 2, Math.floor(u));
  const f = u - i;
  const a = pts[i]!;
  const b = pts[i + 1]!;
  return { x: a.x + (b.x - a.x) * f, y: a.y + (b.y - a.y) * f };
}

interface Gesture {
  pointerId: number;
  mode: 'paint' | 'doodle' | 'poke' | 'none';
  lock: number;
  brush: BrushId;
  radius: number;
  mat: number;
  allow: Uint8Array;
  allowIds: number[];
  allowKey: string;
  nbr: Uint8Array | null;
  sponge: boolean;
  liveActor: ActorRT | null;
  liveBbox: { x0: number; y0: number; x1: number; y1: number } | null;
  lastX: number;
  lastY: number;
  carry: number;
  lastT: number;
  speed: number;
  fxAccum: number;
  bubbleSpawned: boolean;
}

// offsets within radius 3 sorted by distance (ties: dy, dx) for the ink-tap snap
const SNAP_OFFSETS: { dx: number; dy: number; d2: number }[] = (() => {
  const out: { dx: number; dy: number; d2: number }[] = [];
  for (let dy = -3; dy <= 3; dy++) for (let dx = -3; dx <= 3; dx++) {
    const d2 = dx * dx + dy * dy;
    if (d2 > 0 && d2 <= 9) out.push({ dx, dy, d2 });
  }
  out.sort((a, b) => a.d2 - b.d2 || a.dy - b.dy || a.dx - b.dx);
  return out;
})();

// wider offsets within radius 5 sorted by distance for live unawake actor part-assist (tails/spots/horns)
const SNAP_OFFSETS_R5: { dx: number; dy: number; d2: number }[] = (() => {
  const out: { dx: number; dy: number; d2: number }[] = [];
  for (let dy = -5; dy <= 5; dy++) for (let dx = -5; dx <= 5; dx++) {
    const d2 = dx * dx + dy * dy;
    if (d2 > 0 && d2 <= 25) out.push({ dx, dy, d2 });
  }
  out.sort((a, b) => a.d2 - b.d2 || a.dy - b.dy || a.dx - b.dx);
  return out;
})();

const SMALL_REGION_PX = 180;
const SMALL_REGION_RADIUS = 9;
const LIVE_ACTOR_MIN_RADIUS = 9;

export class Simulation implements SimulationPort, ActorHost {
  readonly effects = new EffectPool();
  paths: PagePath[] = [];

  private page: CompiledPage | null = null;
  private sprites: SpriteLibrary | null = null;
  private ctx: RunContext = { seed: 0, chapterIndex: 0, brushes: ['standard'], relics: [] };
  private cov: Coverage | null = null;
  private actors: ActorSystem | null = null;
  private tool: ToolState = { materialId: 1, brush: 'standard', doodle: false, toolMode: 'pencil' };

  private events: SimEvent[] = [];
  private batches: GpuStampBatch[] = [];
  private openBatch: { key: string; batch: GpuStampBatch } | null = null;

  private readonly regionState = new Uint8Array(REGION_STATE_BYTES);
  private dirty = true;
  private readonly stageOf = new Uint8Array(256);
  private readonly bloomed = new Uint8Array(256);
  private readonly bloomT = new Float32Array(256);
  private readonly ghostRevealed = new Uint8Array(256);
  private readonly forcedWiggle = new Uint8Array(256);
  private readonly spotlight = new Uint8Array(256);
  private readonly idleGlow = new Uint8Array(256);
  private readonly stalledGlow = new Uint8Array(256);
  private readonly questTarget = new Uint8Array(256);
  private readonly questUrgent = new Uint8Array(256);
  private readonly lightningZapped = new Uint8Array(256);
  private readonly nudgeWiggleMs = new Float32Array(256);
  private readonly originX = new Float32Array(256);
  private readonly originY = new Float32Array(256);
  private readonly colourableBase = new Uint8Array(256);
  private readonly kinds: RegionKind[] = new Array<RegionKind>(256).fill('prop');
  private ghostIds: number[] = [];
  private coreSet = new Set<number>();
  private coreTotal = 0;
  private coreAwake = 0;
  private pageComplete = false;
  private prismFired = false;
  private bloomQueue: { id: number; x: number; y: number }[] = [];
  private rippling: number[] = [];
  private nudgedIds: number[] = [];
  private sparkles: { x: number; y: number }[] = [];
  private sparkDirty = true;

  private heroQuests: HeroStoryQuest[] = [];
  private questLastMat: number[] = [];
  private questPauseMs: number[] = [];
  private storyStars: StoryStarState[] = [];
  private readonly finale: PageFinaleController = createPageFinaleController();

  private hintActive = false;
  private hintSource: HintSource = 'none';
  private hintQuestId: HeroQuestId | null = null;
  private hintTargetRegionIds: number[] = [];
  private hintRemainingMs = 0;
  private hintDurationMs = HINT_SPOTLIGHT_MS;
  private hintDimAmount = 0;
  private hintElapsedMs = 0;

  private moonCatTimerMs = 0;
  private gravityPokeAwarded = false;
  private magnetTracked = new Set<number>();

  private prologueActive = false;
  private prologueMs = 0;
  private prologueDissolveMs = 0;
  private prologueDissolveFrom = 0;
  private prologueMistVal = 0;
  private prologueRegionId = 0;
  private ghostPath: { x: number; y: number }[] = [];
  private ghostStrokeT = 0;
  private idleMs = 0;
  private idleGuideActive = false;
  private idleTargetId = 0;
  private idleQuestId: HeroQuestId | null = null;
  private wispActive = false;
  private wispMode: WispMode = 'hidden';
  private wispX = PAGE_W * 0.22;
  private wispY = PAGE_H * 0.32;
  private wispTargetRegionId = 0;
  private wispAlpha = 0;

  private hoverPt: { x: number; y: number } | null = null;
  private lastHoverTrackPt: { x: number; y: number } | null = null;
  private brushPt: { x: number; y: number } | null = null;
  private lastPtr: { x: number; y: number } | null = null;
  private g: Gesture | null = null;
  private stampX = NaN;
  private stampY = NaN;
  private rng: () => number = mulberry32(1);

  // ------------------------------------------------------------------ ActorHost
  emit(e: SimEvent): void {
    this.events.push(e);
  }
  pointer(): { x: number; y: number } | null {
    return this.brushPt ?? this.hoverPt ?? this.lastPtr;
  }
  hoverPoint(): { x: number; y: number } | null {
    return this.hoverPt;
  }
  brush(): BrushId {
    return this.tool.brush;
  }
  hasRelic(r: RelicId): boolean {
    return this.ctx.relics.includes(r);
  }
  collect(e: EffectRT): void {
    if (!e.pickup) return;
    this.emit({ type: 'gems', amount: e.pickup.gems, reason: e.pickup.reason });
    this.effects.remove(e);
    this.effects.spawn('starBurst', e.x, e.y, { durMs: 500 });
  }
  onBubblePop(a: ActorRT): void {
    if (!this.page || !this.cov || !this.actors) return;
    this.actors.removeActor(a);
    const mat = normMat(a.bubbleMat || this.tool.materialId);
    this.effects.spawn('bubblePop', a.view.x, a.view.y, { durMs: 650, materialId: mat });
    this.emit({ type: 'itemFoley', kind: 'bubblePop' });
    if (this.ctx.viewOnly) return;
    const target =
      this.nearestUnbloomed(a.view.x, a.view.y, true) || this.nearestUnbloomed(a.view.x, a.view.y, false);
    if (target > 0) {
      this.bonusFillUnpainted(target, mat, BUBBLE_SPLASH_FRACTION, a.view.x, a.view.y);
      this.settle();
    }
  }
  onActorPoked(_a: ActorRT): void {
    if (!this.hasRelic('gravityFlipFlop')) return;
    this.emit({ type: 'relic', relic: 'gravityFlipFlop', tag: RELIC_TAGS.gravityFlipFlop });
    if (!this.gravityPokeAwarded && !this.ctx.viewOnly) {
      this.gravityPokeAwarded = true;
      this.emit({ type: 'gems', amount: GEM_REWARDS.gravityPokeBonus, reason: 'gravityPokeBonus' });
    }
  }

  // ------------------------------------------------------------------ region helpers
  private kindOf(id: number): RegionKind {
    return this.kinds[id] ?? 'prop';
  }

  private centroid(id: number): { x: number; y: number } {
    const m = this.page?.regions[id];
    if (m) return m.centroid;
    const c = this.cov!;
    return { x: c.cx[id]!, y: c.cy[id]! };
  }

  private bbox(id: number): { x0: number; y0: number; x1: number; y1: number } {
    const m = this.page?.regions[id];
    if (m) return m.bbox;
    const c = this.cov!;
    return { x0: c.bx0[id]!, y0: c.by0[id]!, x1: c.bx1[id]!, y1: c.by1[id]! };
  }

  private colourable(id: number): boolean {
    if (id >= 1 && id <= DYNAMIC_MAX) return this.colourableBase[id] === 1;
    if (id >= GHOST_MIN && id <= GHOST_MAX) return this.ghostRevealed[id] === 1 && this.cov!.total[id]! > 0;
    return false;
  }

  private questThreshold(): number {
    return this.hasRelic('constellationCrown') ? CROWN_QUEST_BLOOM_THRESHOLD : HERO_QUEST_BLOOM_THRESHOLD;
  }

  private spawnRelicCompanions(): void {
    if (!this.page || !this.actors) return;
    const f = this.page.focal;
    if (this.hasRelic('sleepyMoonCat') && !this.ctx.viewOnly) {
      this.actors.addRelicMoonCat(f.x - 110, f.y - 45);
    }
    if (this.hasRelic('chromaticButterfly')) {
      this.actors.addRelicButterfly(f.x + 90, f.y - 45);
    }
  }

  // ------------------------------------------------------------------ loading
  loadPage(p: CompiledPage, ctx: RunContext, sprites?: SpriteLibrary): void {
    this.page = p;
    this.sprites = sprites ?? null;
    this.ctx = ctx;
    const cov = new Coverage(p.regionMap);
    cov.seedMix = p.seed | 0;
    this.cov = cov;
    this.rng = mulberry32(p.seed ^ 0x51ed270b);
    this.events = [];
    this.batches = [];
    this.openBatch = null;
    this.effects.clear();
    this.paths = p.paths;
    this.g = null;
    this.brushPt = null;
    this.hoverPt = null;
    this.lastHoverTrackPt = null;
    this.lastPtr = null;
    this.resetFlags();

    this.coreSet = new Set(p.coreRegionIds.filter((id) => cov.total[id]! > 0));
    this.coreTotal = this.coreSet.size;
    this.ghostIds = [];
    for (let id = 0; id < 256; id++) {
      const meta = p.regions[id];
      const canon = CANONICAL_REGIONS.find((c) => c.id === id);
      this.kinds[id] =
        meta?.kind ??
        canon?.kind ??
        (id >= SYSTEM_MIN && id <= SYSTEM_MAX ? 'system' : id >= GHOST_MIN && id <= GHOST_MAX ? 'ghost' : 'prop');
      const total = cov.total[id]!;
      if (id >= 1 && id <= DYNAMIC_MAX && total > 0 && !meta?.coverageExcluded) this.colourableBase[id] = 1;
      if (id >= GHOST_MIN && id <= GHOST_MAX && total > 0) this.ghostIds.push(id);
      if (total > 0 && id !== 0 && id !== 255) {
        const c = this.centroid(id);
        this.originX[id] = c.x;
        this.originY[id] = c.y;
      }
    }
    this.actors = new ActorSystem(this, p.actors, p.seed);
    this.spawnRelicCompanions();

    for (const pc of p.preColored ?? []) {
      if (cov.total[pc.id]! === 0) continue;
      this.silentComplete(pc.id, normMat(pc.materialId));
    }
    cov.takeTouched();
    this.actors.refreshStatus(this.stageOf, this.bloomed, cov.total, true);
    this.buildHeroQuests(p);
    this.refreshHeroQuests(false);
    this.recomputeCore();
    if (ctx.playPrologue === true && !ctx.viewOnly && !this.pageComplete) {
      this.startPrologue();
    }
    this.syncAll();
  }

  private resetFlags(): void {
    this.regionState.fill(0);
    this.stageOf.fill(0);
    this.bloomed.fill(0);
    this.bloomT.fill(0);
    this.ghostRevealed.fill(0);
    this.forcedWiggle.fill(0);
    this.spotlight.fill(0);
    this.idleGlow.fill(0);
    this.stalledGlow.fill(0);
    this.questTarget.fill(0);
    this.questUrgent.fill(0);
    this.lightningZapped.fill(0);
    this.nudgeWiggleMs.fill(0);
    this.colourableBase.fill(0);
    this.originX.fill(0);
    this.originY.fill(0);
    this.bloomQueue = [];
    this.rippling = [];
    this.nudgedIds = [];
    this.heroQuests = [];
    this.questLastMat = [];
    this.questPauseMs = [];
    this.storyStars = [];
    this.finale.reset();
    this.moonCatTimerMs = 0;
    this.gravityPokeAwarded = false;
    this.magnetTracked.clear();
    this.pageComplete = false;
    this.prismFired = false;
    this.coreAwake = 0;
    this.sparkDirty = true;
    this.resetWispState();
  }

  private resetHintFields(): void {
    this.hintActive = false;
    this.hintSource = 'none';
    this.hintQuestId = null;
    this.hintTargetRegionIds = [];
    this.hintRemainingMs = 0;
    this.hintDurationMs = HINT_SPOTLIGHT_MS;
    this.hintDimAmount = 0;
    this.hintElapsedMs = 0;
  }

  private resetWispState(): void {
    this.prologueActive = false;
    this.prologueMs = 0;
    this.prologueDissolveMs = 0;
    this.prologueDissolveFrom = 0;
    this.prologueMistVal = 0;
    this.prologueRegionId = 0;
    this.ghostPath = [];
    this.ghostStrokeT = 0;
    this.idleMs = 0;
    this.idleGuideActive = false;
    this.idleTargetId = 0;
    this.idleQuestId = null;
    this.resetHintFields();
    this.hideWisp();
  }

  private hideWisp(): void {
    this.wispActive = false;
    this.wispMode = 'hidden';
    this.wispTargetRegionId = 0;
    this.wispAlpha = 0;
    this.ghostStrokeT = 0;
  }

  private meanCentroid(ids: readonly number[]): { x: number; y: number } {
    if (ids.length === 0) return { x: PAGE_W / 2, y: PAGE_H / 2 };
    let sx = 0;
    let sy = 0;
    for (const id of ids) {
      const c = this.centroid(id);
      sx += c.x;
      sy += c.y;
    }
    return { x: sx / ids.length, y: sy / ids.length };
  }

  private buildHeroQuests(p: CompiledPage): void {
    const cov = this.cov!;
    const out: HeroStoryQuest[] = [];
    if (p.heroQuests && p.heroQuests.length > 0) {
      for (const spec of p.heroQuests) {
        const present = spec.regionIds.filter((id) => cov.total[id]! > 0);
        if (present.length === 0) continue;
        const fallback = this.meanCentroid(present);
        const x = Number.isFinite(spec.centroid?.x) ? spec.centroid.x : fallback.x;
        const y = Number.isFinite(spec.centroid?.y) ? spec.centroid.y : fallback.y;
        out.push({
          questId: spec.questId,
          label: spec.label,
          thumbnailSpriteId: spec.thumbnailSpriteId ?? (`quest_${spec.questId}` as UiSpriteId),
          regionIds: present,
          progress: 0,
          completed: false,
          stalled: false,
          highlighted: false,
          x,
          y,
        });
      }
    }
    if (out.length === 0 && p.storyMilestones && p.storyMilestones.length > 0) {
      for (const m of p.storyMilestones) {
        const present = m.regionIds.filter((id) => cov.total[id]! > 0);
        if (present.length === 0) continue;
        const fallback = this.meanCentroid(present);
        const x = Number.isFinite(m.centroid?.x) ? m.centroid.x : fallback.x;
        const y = Number.isFinite(m.centroid?.y) ? m.centroid.y : fallback.y;
        out.push({
          questId: m.id,
          label: m.label,
          thumbnailSpriteId: m.thumbnailSpriteId ?? (`quest_${m.id}` as UiSpriteId),
          regionIds: present,
          progress: 0,
          completed: false,
          stalled: false,
          highlighted: false,
          x,
          y,
        });
      }
    }
    if (out.length === 0) {
      for (const def of DEFAULT_MILESTONES) {
        const present = def.ids.filter((id) => this.coreSet.has(id) && cov.total[id]! > 0);
        if (present.length === 0) continue;
        const c = this.meanCentroid(present);
        out.push({
          questId: def.id,
          label: def.label,
          thumbnailSpriteId: `quest_${def.id}` as UiSpriteId,
          regionIds: present,
          progress: 0,
          completed: false,
          stalled: false,
          highlighted: false,
          x: c.x,
          y: c.y,
        });
      }
    }
    this.heroQuests = out;
    this.questLastMat = new Array<number>(out.length).fill(0);
    this.questPauseMs = new Array<number>(out.length).fill(0);
    this.syncStoryStars();
  }

  private syncStoryStars(): void {
    this.storyStars = this.heroQuests.map((q) => ({
      id: q.questId,
      kind: q.questId,
      label: q.label,
      thumbnailSpriteId: q.thumbnailSpriteId,
      lit: q.completed,
      progress: q.progress,
      regionIds: q.regionIds.slice(),
      x: q.x,
      y: q.y,
    }));
  }

  private questWeightedProgress(q: HeroStoryQuest): number {
    const cov = this.cov!;
    let painted = 0;
    let total = 0;
    for (const id of q.regionIds) {
      const t = cov.total[id]!;
      total += t;
      painted += this.bloomed[id] ? t : cov.painted[id]!;
    }
    return total > 0 ? painted / total : 0;
  }

  private syncQuestTargetFlags(): void {
    const cov = this.cov;
    if (!cov) return;
    const nextTarget = new Uint8Array(256);
    const nextUrgent = new Uint8Array(256);
    if (!this.ctx.viewOnly && !this.pageComplete) {
      for (const q of this.heroQuests) {
        if (q.completed) continue;
        const urgent = q.progress > 0 ? 1 : 0;
        for (const id of q.regionIds) {
          if (id <= 0 || id >= 255 || this.bloomed[id] || cov.total[id]! === 0) continue;
          nextTarget[id] = 1;
          if (urgent) nextUrgent[id] = 1;
        }
      }
    }
    for (let id = 1; id < 255; id++) {
      if (this.questTarget[id] !== nextTarget[id] || this.questUrgent[id] !== nextUrgent[id]) {
        this.questTarget[id] = nextTarget[id]!;
        this.questUrgent[id] = nextUrgent[id]!;
        this.syncRegion(id);
      }
    }
  }

  private refreshHeroQuests(live: boolean): void {
    if (this.heroQuests.length === 0) return;
    const threshold = this.questThreshold();
    for (let i = 0; i < this.heroQuests.length; i++) {
      const q = this.heroQuests[i]!;
      if (q.completed) {
        q.progress = 1;
        continue;
      }
      const w = this.questWeightedProgress(q);
      const allBloomed = q.regionIds.length > 0 && q.regionIds.every((id) => this.bloomed[id] === 1);
      q.progress = allBloomed ? 1 : w;
      if (!live) {
        q.completed = allBloomed;
        q.stalled = false;
        q.highlighted = false;
      } else if (allBloomed || w >= threshold) {
        this.completeHeroQuest(i);
      }
    }
    this.syncStoryStars();
    this.syncQuestTargetFlags();
  }

  private completeHeroQuest(index: number): void {
    const q = this.heroQuests[index]!;
    if (q.completed) return;
    q.completed = true;
    q.progress = 1;
    q.stalled = false;
    q.highlighted = false;
    this.questPauseMs[index] = 0;

    const cov = this.cov!;
    const preferredMat = this.questLastMat[index] || normMat(this.tool.materialId);
    const unbloomed = q.regionIds.filter((id) => !this.bloomed[id] && cov.total[id]! > 0);

    for (const id of q.regionIds) {
      this.stalledGlow[id] = 0;
      this.idleGlow[id] = 0;
      this.spotlight[id] = 0;
      this.nudgeWiggleMs[id] = 0;
    }
    if (this.hintActive && this.hintQuestId === q.questId) {
      this.clearHintState();
    }
    if (this.idleGuideActive && this.idleQuestId === q.questId) {
      this.clearIdleGuide();
    }

    // Composite Auto-Bloom: fill all remaining unbloomed sub-regions WITHOUT double-awarding regionBloom/actorBloom
    for (const id of unbloomed) {
      const c = this.centroid(id);
      const matchStamp =
        Number.isFinite(this.stampX) && Number.isFinite(this.stampY) && this.regionAt(this.stampX, this.stampY) === id;
      const ox = matchStamp ? this.stampX : c.x;
      const oy = matchStamp ? this.stampY : c.y;
      this.bloomRegion(id, ox, oy, true, preferredMat, true);
    }

    this.syncStoryStars();

    this.emit({ type: 'gems', amount: GEM_REWARDS.questBloom, reason: 'questBloom' });
    if (this.hasRelic('doubleMilkshake')) {
      this.emit({ type: 'relic', relic: 'doubleMilkshake', tag: RELIC_TAGS.doubleMilkshake });
      this.emit({ type: 'gems', amount: GEM_REWARDS.milkshakeBonus, reason: 'milkshakeBonus' });
    }

    this.emit({
      type: 'heroQuestComplete',
      questId: q.questId,
      index,
      total: this.heroQuests.length,
      x: q.x,
      y: q.y,
    });
    this.emit({
      type: 'storyStarLit',
      milestoneId: q.questId,
      index,
      x: q.x,
      y: q.y,
    });

    if (this.hasRelic('constellationCrown')) {
      this.emit({ type: 'relic', relic: 'constellationCrown', tag: RELIC_TAGS.constellationCrown });
      this.effects.spawn('crownFireworks', q.x, q.y, { durMs: 2200, materialId: GOLD });
    }

    this.checkPageComplete();
  }

  private pickPrologueRegion(): number {
    for (const id of [5, 3]) {
      if (this.coreSet.has(id) && !this.bloomed[id] && this.cov!.total[id]! > 0) return id;
    }
    for (const id of this.page!.coreRegionIds) {
      if (!this.bloomed[id] && this.cov!.total[id]! > 0) return id;
    }
    return 0;
  }

  private buildGhostPath(regionId: number): { x: number; y: number }[] {
    const raw = this.qaStrokePath(regionId);
    if (raw.length === 0) return [this.centroid(regionId)];
    // group scanline points by row y so we can trace a smooth curved S-stroke strictly inside the region
    const byRow = new Map<number, { x: number; y: number }[]>();
    for (const pt of raw) {
      let row = byRow.get(pt.y);
      if (!row) {
        row = [];
        byRow.set(pt.y, row);
      }
      row.push(pt);
    }
    const rows = [...byRow.entries()]
      .sort((a, b) => a[0] - b[0])
      .map(([, pts]) => pts.sort((a, b) => a.x - b.x));

    if (rows.length >= 4) {
      const targetCount = 12;
      const curve: { x: number; y: number }[] = [];
      for (let i = 0; i < targetCount; i++) {
        const t = i / (targetCount - 1);
        const rIdx = Math.round((0.15 + 0.7 * t) * (rows.length - 1));
        const row = rows[rIdx]!;
        const u = 0.5 + 0.35 * Math.sin(t * Math.PI * 2 - Math.PI * 0.5);
        const cIdx = Math.round(clamp(u, 0, 1) * (row.length - 1));
        const pt = row[cIdx]!;
        const prev = curve[curve.length - 1];
        if (!prev || prev.x !== pt.x || prev.y !== pt.y) curve.push({ x: pt.x, y: pt.y });
      }
      if (curve.length >= 8 && curve.length <= 14) return curve;
    }
    if (raw.length <= 14) return raw.map((pt) => ({ x: pt.x, y: pt.y }));
    const count = 12;
    const out: { x: number; y: number }[] = [];
    for (let i = 0; i < count; i++) {
      const idx = Math.round((i / (count - 1)) * (raw.length - 1));
      const pt = raw[idx]!;
      out.push({ x: pt.x, y: pt.y });
    }
    return out;
  }

  private startPrologue(): void {
    const targetId = this.pickPrologueRegion();
    if (targetId === 0) return;
    this.prologueActive = true;
    this.prologueMs = 0;
    this.prologueDissolveMs = 0;
    this.prologueDissolveFrom = 0;
    this.prologueRegionId = targetId;
    this.ghostPath = this.buildGhostPath(targetId);
    this.ghostStrokeT = 0;
    this.applyPrologueState();
  }

  private applyPrologueState(): void {
    const ms = this.prologueMs;
    if (ms < 600) {
      this.prologueMistVal = 0.25 + 0.6 * smoothstep(ms / 600);
    } else if (ms < PROLOGUE_MIST_END_MS) {
      this.prologueMistVal = 0.85 - 0.5 * smoothstep((ms - 600) / (PROLOGUE_MIST_END_MS - 600));
    } else if (ms < PROLOGUE_TAP_END_MS) {
      this.prologueMistVal = 0.35 - 0.2 * smoothstep((ms - PROLOGUE_MIST_END_MS) / (PROLOGUE_TAP_END_MS - PROLOGUE_MIST_END_MS));
    } else if (ms < PROLOGUE_DURATION_MS) {
      this.prologueMistVal = 0.15 * (1 - smoothstep((ms - PROLOGUE_TAP_END_MS) / (PROLOGUE_DURATION_MS - PROLOGUE_TAP_END_MS)));
    } else {
      this.prologueMistVal = 0;
    }

    this.wispActive = true;
    this.wispTargetRegionId = this.prologueRegionId;
    if (ms < PROLOGUE_MIST_END_MS) {
      const t = ms / PROLOGUE_MIST_END_MS;
      const s = smoothstep(t);
      this.wispMode = 'prologueMist';
      this.wispX = PAGE_W * (0.22 + 0.3 * s);
      this.wispY = PAGE_H * (0.32 + 0.13 * s) + Math.sin(t * Math.PI * 2) * 14;
      this.ghostStrokeT = 0;
      this.wispAlpha = 0.4 + 0.6 * smoothstep(ms / 400);
    } else if (ms < PROLOGUE_TAP_END_MS) {
      const t = (ms - PROLOGUE_MIST_END_MS) / (PROLOGUE_TAP_END_MS - PROLOGUE_MIST_END_MS);
      const s = smoothstep(t);
      const sx = PAGE_W * 0.52;
      const sy = PAGE_H * 0.45;
      const tapBob = t > 0.65 ? Math.abs(Math.sin(((t - 0.65) / 0.35) * Math.PI * 2)) * 5 : 0;
      this.wispMode = 'prologueTapPencil';
      this.wispX = sx + (PENCIL_TRAY_X - sx) * s + Math.sin(t * Math.PI) * 10;
      this.wispY = sy + (PENCIL_TRAY_Y - sy) * s - tapBob;
      this.ghostStrokeT = 0;
      this.wispAlpha = 1;
    } else {
      const elapsed = ms - PROLOGUE_TAP_END_MS;
      this.wispMode = 'prologueStroke';
      this.ghostStrokeT = (elapsed % PROLOGUE_STROKE_LOOP_MS) / PROLOGUE_STROKE_LOOP_MS;
      const pt = samplePath(this.ghostPath, this.ghostStrokeT);
      this.wispX = pt.x;
      this.wispY = pt.y;
      this.wispAlpha = 1;
    }
  }

  dismissPrologue(): void {
    if (!this.prologueActive) return;
    this.prologueActive = false;
    this.prologueDissolveFrom = this.prologueMistVal;
    this.prologueDissolveMs = this.prologueMistVal > 0 ? PROLOGUE_DISSOLVE_MS : 0;
    this.hideWisp();
    this.emit({ type: 'prologueEnd' });
  }

  private clearSpotlightFlags(): void {
    for (let id = 1; id < 255; id++) {
      if (this.spotlight[id]) {
        this.spotlight[id] = 0;
        this.syncRegion(id);
      }
    }
  }

  private clearIdleGlowFlags(): void {
    for (let id = 1; id < 255; id++) {
      if (this.idleGlow[id]) {
        this.idleGlow[id] = 0;
        this.syncRegion(id);
      }
    }
  }

  private clearStalledGlowFlags(): void {
    for (let id = 1; id < 255; id++) {
      if (this.stalledGlow[id]) {
        this.stalledGlow[id] = 0;
        this.syncRegion(id);
      }
    }
  }

  private clearNudgeWiggle(): void {
    if (this.nudgedIds.length === 0) return;
    for (const id of this.nudgedIds) {
      this.nudgeWiggleMs[id] = 0;
      this.syncRegion(id);
    }
    this.nudgedIds = [];
  }

  private clearQuestHighlights(): void {
    for (const q of this.heroQuests) q.highlighted = false;
  }

  private clearHintState(): void {
    if (!this.hintActive && this.hintTargetRegionIds.length === 0) return;
    this.clearSpotlightFlags();
    this.clearNudgeWiggle();
    this.clearQuestHighlights();
    this.resetHintFields();
    if (this.wispMode === 'hintBeam' || this.wispMode === 'nudge') this.hideWisp();
  }

  private clearIdleGuide(): void {
    if (!this.idleGuideActive && this.idleTargetId === 0) return;
    this.idleGuideActive = false;
    this.idleTargetId = 0;
    this.idleQuestId = null;
    this.clearIdleGlowFlags();
    if (!this.hintActive) this.clearQuestHighlights();
    if (this.wispMode === 'idleGuide') this.hideWisp();
  }

  private inactiveHint(): HintRequestState {
    return {
      active: false,
      source: 'none',
      questId: null,
      targetRegionIds: [],
      remainingMs: 0,
      durationMs: HINT_SPOTLIGHT_MS,
      dimAmount: 0,
    };
  }

  private currentHintState(): HintRequestState {
    return {
      active: this.hintActive,
      source: this.hintSource,
      questId: this.hintQuestId,
      targetRegionIds: this.hintTargetRegionIds.slice(),
      remainingMs: this.hintRemainingMs,
      durationMs: this.hintDurationMs,
      dimAmount: this.hintDimAmount,
    };
  }

  private pickIdleQuest(): { quest: HeroStoryQuest | null; targetId: number; unbloomed: number[] } {
    const cov = this.cov!;
    for (const q of this.heroQuests) {
      if (q.completed) continue;
      const unbloomed = q.regionIds.filter((id) => !this.bloomed[id] && cov.total[id]! > 0);
      if (unbloomed.length > 0) return { quest: q, targetId: unbloomed[0]!, unbloomed };
    }
    for (const id of this.page!.coreRegionIds) {
      if (!this.bloomed[id] && cov.total[id]! > 0) return { quest: null, targetId: id, unbloomed: [id] };
    }
    return { quest: null, targetId: 0, unbloomed: [] };
  }

  requestHint(questId?: HeroQuestId, source: 'lantern' | 'medallion' = 'lantern'): HintRequestState {
    if (!this.page || !this.cov || this.ctx.viewOnly || this.pageComplete) return this.inactiveHint();
    const cov = this.cov;
    let quest: HeroStoryQuest | undefined;
    if (questId !== undefined) {
      quest = this.heroQuests.find((q) => q.questId === questId && !q.completed);
    } else {
      quest = this.heroQuests.find((q) => !q.completed && q.regionIds.some((id) => !this.bloomed[id] && cov.total[id]! > 0));
    }
    if (!quest) return this.inactiveHint();
    const unbloomed = quest.regionIds.filter((id) => !this.bloomed[id] && cov.total[id]! > 0);
    if (unbloomed.length === 0) return this.inactiveHint();

    if (this.prologueActive) this.dismissPrologue();
    this.idleMs = 0;
    this.clearIdleGuide();
    this.clearHintState();

    // Spotlight + guideGlow on ALL unbloomed regions of that Hero Quest
    for (const id of unbloomed) {
      this.spotlight[id] = 1;
      this.syncRegion(id);
    }
    quest.highlighted = true;

    // Pick largest unbloomed region of that quest for the looping rainbow Wisp ghost-stroke
    let largestId = unbloomed[0]!;
    let largestTotal = cov.total[largestId]!;
    for (let i = 1; i < unbloomed.length; i++) {
      const id = unbloomed[i]!;
      const t = cov.total[id]!;
      if (t > largestTotal) {
        largestTotal = t;
        largestId = id;
      }
    }

    this.hintActive = true;
    this.hintSource = source;
    this.hintQuestId = quest.questId;
    this.hintTargetRegionIds = unbloomed.slice();
    this.hintRemainingMs = HINT_SPOTLIGHT_MS;
    this.hintDurationMs = HINT_SPOTLIGHT_MS;
    this.hintDimAmount = 1;
    this.hintElapsedMs = 0;

    this.ghostPath = this.buildGhostPath(largestId);
    this.ghostStrokeT = 0;
    const startPt = samplePath(this.ghostPath, 0);
    this.wispX = startPt.x;
    this.wispY = startPt.y;
    this.wispActive = true;
    this.wispMode = 'hintBeam';
    this.wispTargetRegionId = largestId;
    this.wispAlpha = 1;

    this.emit({ type: 'hintStarted', questId: quest.questId, regionIds: unbloomed.slice(), source });
    this.emit({ type: 'wispGuide', regionId: largestId, mode: 'hintBeam' });
    return this.currentHintState();
  }

  setStayAndDoodle(stay: boolean): void {
    this.finale.setStayAndDoodle(stay);
  }

  nudgeMilestone(milestoneId: StoryMilestoneKind): void {
    const res = this.requestHint(milestoneId, 'medallion');
    if (!res.active) return;
    this.nudgedIds = res.targetRegionIds.slice();
    for (const id of res.targetRegionIds) {
      this.nudgeWiggleMs[id] = SOCKET_WIGGLE_MS;
      this.syncRegion(id);
    }
  }

  private recomputeCore(): void {
    let n = 0;
    for (const id of this.coreSet) if (this.bloomed[id]) n++;
    this.coreAwake = n;
    this.pageComplete =
      this.heroQuests.length > 0
        ? this.heroQuests.every((q) => q.completed)
        : this.coreTotal > 0 && n === this.coreTotal;
  }

  private checkPageComplete(): void {
    if (this.pageComplete) return;
    const done =
      this.heroQuests.length > 0
        ? this.heroQuests.every((q) => q.completed)
        : this.coreTotal > 0 && this.coreAwake === this.coreTotal;
    if (!done) return;
    this.pageComplete = true;
    if (this.prologueActive) this.dismissPrologue();
    this.clearHintState();
    this.clearIdleGuide();
    this.clearNudgeWiggle();
    this.clearStalledGlowFlags();
    this.syncQuestTargetFlags();
    for (const q of this.heroQuests) {
      q.stalled = false;
      q.highlighted = false;
    }
    this.hideWisp();
    this.emit({ type: 'gems', amount: GEM_REWARDS.pageComplete, reason: 'pageComplete' });
    this.emit({ type: 'pageComplete' });
    this.effects.spawn('constellationFireworks', PAGE_W / 2, PAGE_H / 3, { durMs: 4000 });
    if (!this.ctx.viewOnly) {
      this.finale.start();
    }
  }

  /** Completes a region without events/gems (pre-coloured hub regions, restore). */
  private silentComplete(id: number, mat: number): void {
    const cov = this.cov!;
    cov.fillRemaining(id, mat);
    this.bloomed[id] = 1;
    this.bloomT[id] = RIPPLE_MS;
    this.stageOf[id] = 4;
    this.sparkDirty = true;
    const c = this.centroid(id);
    const b = this.bbox(id);
    const radius = Math.ceil(Math.hypot(Math.max(c.x - b.x0, b.x1 + 1 - c.x), Math.max(c.y - b.y0, b.y1 + 1 - c.y))) + 1;
    this.pushStamp(`r${id}`, [id], { x: c.x, y: c.y, radius, materialId: cov.regionMat[id] || mat, dx: 0, dy: 0, strength: 1 });
  }

  setSprites(sprites: SpriteLibrary): void {
    this.sprites = sprites;
  }

  setTool(t: ToolState): void {
    const isWand = t.toolMode !== undefined ? t.toolMode === 'wand' : Boolean(t.doodle);
    const toolMode: ToolMode = isWand ? 'wand' : 'pencil';
    this.tool = { materialId: t.materialId, brush: t.brush, doodle: isWand, toolMode };
  }

  // ------------------------------------------------------------------ GPU batches
  private pushStamp(key: string, ids: number[], s: GpuStamp): void {
    const ob = this.openBatch;
    if (ob === null || ob.key !== key || ob.batch.stamps.length >= MAX_STAMPS_PER_BATCH) {
      const allowed = new Uint8Array(256);
      for (const id of ids) allowed[id] = 1;
      const batch: GpuStampBatch = { allowed, stamps: [] };
      this.batches.push(batch);
      this.openBatch = { key, batch };
    }
    this.openBatch!.batch.stamps.push(s);
  }

  drainStampBatches(): GpuStampBatch[] {
    const out = this.batches;
    this.batches = [];
    this.openBatch = null;
    return out;
  }

  drainEvents(): SimEvent[] {
    const out = this.events;
    this.events = [];
    return out;
  }

  // ------------------------------------------------------------------ gestures
  gesture(e: GestureEvent): void {
    if (!this.page || !this.cov) return;
    if (!Number.isFinite(e.x) || !Number.isFinite(e.y)) return;
    this.idleMs = 0;
    this.clearIdleGuide();
    switch (e.phase) {
      case 'start':
        this.gStart(e);
        break;
      case 'move':
        this.gMove(e);
        break;
      case 'end':
        if (this.g && this.g.pointerId === e.pointerId) this.gEnd();
        break;
      case 'cancel':
        if (this.g && this.g.pointerId === e.pointerId) this.gEnd();
        break;
    }
  }

  private regionAt(x: number, y: number): number {
    const px = clamp(Math.floor(x), 0, PAGE_W - 1);
    const py = clamp(Math.floor(y), 0, PAGE_H - 1);
    return this.cov!.map[py * PAGE_W + px]!;
  }

  private pickSpriteFrame(sheet: SpriteSheet, actor: ActorRenderState): SpriteFrame | null {
    const anim = sheet.anims[actor.anim] ?? sheet.anims.idle ?? Object.values(sheet.anims)[0];
    if (!anim || anim.frames.length === 0) return null;
    const n = anim.frames.length;
    const fi = Number.isFinite(actor.frame) ? ((Math.floor(actor.frame) % n) + n) % n : 0;
    return anim.frames[fi] ?? null;
  }

  private sampleLiveActor(a: ActorRT, px: number, py: number): number {
    if (!this.sprites || !a.shown || !a.view.live) return 255;
    const sheet = this.sprites[a.kind];
    if (!sheet || !Number.isFinite(a.view.x) || !Number.isFinite(a.view.y)) return 255;
    const frame = this.pickSpriteFrame(sheet, a.view);
    if (!frame) return 255;
    const flip = a.view.facing === -1;
    const ax = flip ? frame.w - 1 - sheet.anchorX : sheet.anchorX;
    const x0 = Math.round(a.view.x) - ax;
    const y0 = Math.round(a.view.y) - sheet.anchorY;
    const sx = px - x0;
    const sy = py - y0;
    if (sx < 0 || sy < 0 || sx >= frame.w || sy >= frame.h) return 255;
    const raw = frame.pixels[sy * frame.w + (flip ? frame.w - 1 - sx : sx)];
    if (raw === undefined || raw === 255) return 255;
    return a.view.remap?.[raw] ?? raw;
  }

  private computeLiveRegionBbox(a: ActorRT, regionId: number): { x0: number; y0: number; x1: number; y1: number } | null {
    if (!this.sprites || !a.shown || !a.view.live) return null;
    const sheet = this.sprites[a.kind];
    if (!sheet || !Number.isFinite(a.view.x) || !Number.isFinite(a.view.y)) return null;
    const frame = this.pickSpriteFrame(sheet, a.view);
    if (!frame) return null;
    const flip = a.view.facing === -1;
    const ax = flip ? frame.w - 1 - sheet.anchorX : sheet.anchorX;
    const ox = Math.round(a.view.x) - ax;
    const oy = Math.round(a.view.y) - sheet.anchorY;
    let x0 = PAGE_W;
    let y0 = PAGE_H;
    let x1 = -1;
    let y1 = -1;
    for (let sy = 0; sy < frame.h; sy++) {
      const rowOff = sy * frame.w;
      for (let sx = 0; sx < frame.w; sx++) {
        const raw = frame.pixels[rowOff + (flip ? frame.w - 1 - sx : sx)];
        if (raw === undefined || raw === 255) continue;
        const id = a.view.remap?.[raw] ?? raw;
        if (id !== regionId) continue;
        const px = ox + sx;
        const py = oy + sy;
        if (px < x0) x0 = px;
        if (py < y0) y0 = py;
        if (px > x1) x1 = px;
        if (py > y1) y1 = py;
      }
    }
    return x1 >= x0 ? { x0, y0, x1, y1 } : null;
  }

  private findLiveActorForRegion(regionId: number): ActorRT | null {
    if (!this.sprites || !this.actors) return null;
    for (const a of this.actors.list) {
      if (a.shown && a.view.live && a.regionIds.includes(regionId)) return a;
    }
    return null;
  }

  private liveActorRegionAt(px: number, py: number): { id: number; actor: ActorRT | null } {
    if (!this.sprites || !this.actors) return { id: 255, actor: null };
    const list = this.actors.list;
    for (let i = list.length - 1; i >= 0; i--) {
      const a = list[i]!;
      if (!a.shown || !a.view.live) continue;
      const id = this.sampleLiveActor(a, px, py);
      if (id !== 255) return { id, actor: a };
    }
    return { id: 255, actor: null };
  }

  private visibleStaticRegionAt(px: number, py: number): number {
    const idx = py * PAGE_W + px;
    if (this.sprites && this.page && this.actors) {
      const slot = this.page.actorSlotMap[idx] ?? 0;
      if (slot > 0) {
        for (const a of this.actors.list) {
          if (a.view.live && a.view.slot === slot) {
            return this.page.baseRegionMap[idx] ?? 255;
          }
        }
      }
    }
    return this.cov!.map[idx]!;
  }

  private snapLiveUnbloomed(px: number, py: number, maxR2: number): { id: number; actor: ActorRT } | null {
    if (!this.sprites || !this.actors) return null;
    const candidates: ActorRT[] = [];
    for (const a of this.actors.list) {
      if (a.shown && a.view.live && !a.awake && a.regionIds.length > 0) candidates.push(a);
    }
    if (candidates.length === 0) return null;
    for (const o of SNAP_OFFSETS_R5) {
      if (o.d2 > maxR2) break;
      const xx = px + o.dx;
      const yy = py + o.dy;
      if (xx < 0 || yy < 0 || xx >= PAGE_W || yy >= PAGE_H) continue;
      for (let i = candidates.length - 1; i >= 0; i--) {
        const a = candidates[i]!;
        const id = this.sampleLiveActor(a, xx, yy);
        if (id >= 1 && id <= 254 && this.colourable(id) && !this.bloomed[id]) {
          return { id, actor: a };
        }
      }
    }
    return null;
  }

  private snapToNearby(x: number, y: number, unbloomedOnly = false): number {
    const px = clamp(Math.floor(x), 0, PAGE_W - 1);
    const py = clamp(Math.floor(y), 0, PAGE_H - 1);
    // 3x3 nearest neighbour first, then nearest colourable within radius 3
    for (const stage of [1, 3]) {
      for (const o of SNAP_OFFSETS) {
        if (Math.abs(o.dx) > stage || Math.abs(o.dy) > stage) continue;
        const xx = px + o.dx;
        const yy = py + o.dy;
        if (xx < 0 || yy < 0 || xx >= PAGE_W || yy >= PAGE_H) continue;
        const id = this.visibleStaticRegionAt(xx, yy);
        if (id !== 0 && this.colourable(id) && (!unbloomedOnly || !this.bloomed[id])) return id;
      }
    }
    return 0;
  }

  private snapSiblingUnbloomed(px: number, py: number, currentId: number): { id: number; actor: ActorRT | null } | null {
    const quest = this.heroQuests.find((q) => !q.completed && q.regionIds.includes(currentId));
    if (!quest) return null;
    const siblingSet = new Set(quest.regionIds);
    for (const o of SNAP_OFFSETS) {
      const xx = px + o.dx;
      const yy = py + o.dy;
      if (xx < 0 || yy < 0 || xx >= PAGE_W || yy >= PAGE_H) continue;
      const live = this.liveActorRegionAt(xx, yy);
      if (live.actor && siblingSet.has(live.id) && this.colourable(live.id) && !this.bloomed[live.id]) {
        return live;
      }
      const sid = this.visibleStaticRegionAt(xx, yy);
      if (siblingSet.has(sid) && this.colourable(sid) && !this.bloomed[sid]) {
        return { id: sid, actor: this.findLiveActorForRegion(sid) };
      }
    }
    return null;
  }

  private resolvePaintTarget(x: number, y: number, allowBloomed: boolean): { id: number; actor: ActorRT | null } {
    const px = clamp(Math.floor(x), 0, PAGE_W - 1);
    const py = clamp(Math.floor(y), 0, PAGE_H - 1);

    // 1. Live actor pixel hit (front-most rendered sprite wins, matching composite shader)
    const live = this.liveActorRegionAt(px, py);
    if (live.actor !== null) {
      if (live.id >= 1 && live.id <= 254 && this.colourable(live.id) && !this.bloomed[live.id]) {
        return live;
      }
      if (!live.actor.awake) {
        const nearLive = this.snapLiveUnbloomed(px, py, 25);
        if (nearLive) return nearLive;
      }
      if (allowBloomed && live.id >= 1 && live.id <= 254 && this.colourable(live.id)) {
        return live;
      }
    }

    // 2. Static visible page pixel hit
    const rid = this.visibleStaticRegionAt(px, py);
    if (rid >= 1 && rid <= 254 && this.colourable(rid)) {
      if (!this.bloomed[rid]) {
        return { id: rid, actor: this.findLiveActorForRegion(rid) };
      }
      // Clicking an already-bloomed quest part right beside an uncolored sibling (e.g. Nova's spots/tail) gently assists!
      if (this.sprites !== null) {
        const sib = this.snapSiblingUnbloomed(px, py, rid);
        if (sib) return sib;
      }
      if (allowBloomed) {
        return { id: rid, actor: this.findLiveActorForRegion(rid) };
      }
      return { id: 0, actor: null };
    }

    // 3. Ink (0): snap to nearest live unbloomed part, then nearest static unbloomed, then any static colourable
    if (rid === 0) {
      const nearLive = this.snapLiveUnbloomed(px, py, 25);
      if (nearLive) return nearLive;
      const unb = this.snapToNearby(x, y, true);
      if (unb > 0) return { id: unb, actor: this.findLiveActorForRegion(unb) };
      if (allowBloomed) {
        const any = this.snapToNearby(x, y, false);
        if (any > 0) return { id: any, actor: this.findLiveActorForRegion(any) };
      }
      return { id: 0, actor: null };
    }

    // 4. Close Sky (255) in Enchanted Pencil mode: forgiving snap onto thin tails, horns, stars & comets
    if (rid === 255) {
      const nearLive = this.snapLiveUnbloomed(px, py, 25);
      if (nearLive) return nearLive;
      const unb = this.snapToNearby(x, y, true);
      if (unb > 0) return { id: unb, actor: this.findLiveActorForRegion(unb) };
    }

    return { id: 0, actor: null };
  }

  private newGesture(e: GestureEvent, mode: Gesture['mode'], lock: number): Gesture {
    const brush = this.tool.brush;
    const baseRadius = BRUSH_RADIUS_PX[brush] ?? 6;
    const radius = brush === 'moonbeamQuill' ? baseRadius * 1.4 : baseRadius;
    return {
      pointerId: e.pointerId,
      mode,
      lock,
      brush,
      radius,
      mat: normMat(this.tool.materialId),
      allow: new Uint8Array(256),
      allowIds: [],
      allowKey: '',
      nbr: null,
      sponge: brush === 'supernovaSponge',
      liveActor: null,
      liveBbox: null,
      lastX: e.x,
      lastY: e.y,
      carry: 0,
      lastT: e.timeMs,
      speed: 0,
      fxAccum: 0,
      bubbleSpawned: false,
    };
  }

  private gStart(e: GestureEvent): void {
    if (this.g) {
      if (e.pointerId !== this.g.pointerId) return; // only the first pointer paints
      this.gEnd();
    }
    const x = e.x;
    const y = e.y;
    this.brushPt = { x, y };
    this.lastPtr = { x, y };

    if (!this.ctx.viewOnly) {
      // gem pickups win over painting
      let pick: EffectRT | null = null;
      let pd = 12;
      for (const fx of this.effects.list) {
        if (!fx.pickup) continue;
        const d = Math.hypot(fx.x - x, fx.y - y);
        if (d <= pd) {
          pd = d;
          pick = fx;
        }
      }
      if (pick) {
        this.collect(pick);
        this.g = this.newGesture(e, 'poke', 0);
        return;
      }
    }
    const px = clamp(Math.floor(x), 0, PAGE_W - 1);
    const py = clamp(Math.floor(y), 0, PAGE_H - 1);
    const rid = this.regionAt(x, y);
    const liveHit = this.liveActorRegionAt(px, py);
    const actor = this.actors!.hit(x, y, liveHit.id !== 255 ? liveHit.id : rid, this.tool.doodle);
    if (actor) {
      this.actors!.poke(actor);
      this.g = this.newGesture(e, 'poke', 0);
      return;
    }
    if (this.ctx.viewOnly) {
      this.g = this.newGesture(e, 'none', 0);
      return;
    }

    let mode: Gesture['mode'] = 'none';
    let lock = 0;
    let liveActor: ActorRT | null = null;
    if (this.tool.doodle) {
      if (rid === 0) {
        lock = this.snapToNearby(x, y);
        if (lock > 0) mode = 'paint';
      } else if (rid === 255) {
        mode = 'doodle';
      } else if (this.colourable(rid)) {
        lock = rid;
        mode = 'paint';
      }
    } else {
      const target = this.resolvePaintTarget(x, y, true);
      if (target.id > 0) {
        lock = target.id;
        mode = 'paint';
        liveActor = target.actor?.view.live ? target.actor : null;
      }
    }
    const g = this.newGesture(e, mode, lock);
    if (mode === 'paint' && liveActor) {
      g.liveActor = liveActor;
      g.liveBbox = this.computeLiveRegionBbox(liveActor, lock);
    }
    this.g = g;
    if (mode === 'none') return;

    if (this.prologueActive) this.dismissPrologue();

    if (mode === 'doodle') {
      g.allow[255] = 1;
      g.allowIds = [255];
      g.allowKey = 'doodle';
    } else {
      g.allow[lock] = 1;
      g.allowIds = [lock];
      if (g.brush === 'twinTail') {
        const nbr = new Uint8Array(256);
        const set = new Set<number>(this.cov!.adjacent[lock]!);
        for (const n of this.page!.regions[lock]?.neighbors ?? []) set.add(n);
        for (const n of set) {
          if (n === lock || n < 1 || n > 254 || !this.colourable(n)) continue;
          nbr[n] = 1;
          g.allow[n] = 1;
          g.allowIds.push(n);
        }
        g.nbr = nbr;
      } else if (g.brush === 'nebulaCloudPuff') {
        const quest = this.heroQuests.find((q) => q.regionIds.includes(lock));
        if (quest) {
          for (const rid of quest.regionIds) {
            if (rid === lock || this.bloomed[rid] || !this.colourable(rid)) continue;
            if (g.allow[rid] === 0) {
              g.allow[rid] = 1;
              g.allowIds.push(rid);
            }
          }
        }
      }
      g.allowKey = `p${g.allowIds.join(',')}`;
      if (this.hintActive && g.allowIds.some((id) => this.hintTargetRegionIds.includes(id))) {
        this.clearHintState();
      }
    }
    this.emit({ type: 'stroke', active: true, speed: 0, materialId: g.mat });
    this.stamp(g, x, y, 0, 0);
  }

  private gMove(e: GestureEvent): void {
    const g = this.g;
    if (!g || g.pointerId !== e.pointerId) return;
    const x = e.x;
    const y = e.y;
    this.brushPt = { x, y };
    this.lastPtr = { x, y };
    if (g.mode !== 'paint' && g.mode !== 'doodle') return;
    const dx = x - g.lastX;
    const dy = y - g.lastY;
    const d = Math.hypot(dx, dy);
    const dt = e.timeMs - g.lastT;
    g.lastT = e.timeMs;
    const inst = d / (dt > 0 ? dt : 16);
    g.speed = g.speed * 0.6 + inst * 0.4;
    if (d > 0) {
      const ux = dx / d;
      const uy = dy / d;
      const spacing = Math.max(0.5, STAMP_SPACING * g.radius);
      let t = spacing - g.carry;
      while (t <= d) {
        g.fxAccum += spacing;
        this.stamp(g, g.lastX + ux * t, g.lastY + uy * t, ux, uy);
        t += spacing;
      }
      g.carry = d - (t - spacing);
      g.lastX = x;
      g.lastY = y;
    }
    this.emit({ type: 'stroke', active: true, speed: g.speed, materialId: g.mat });
  }

  private gEnd(): void {
    const g = this.g;
    this.g = null;
    this.brushPt = null;
    if (g && (g.mode === 'paint' || g.mode === 'doodle')) {
      this.emit({ type: 'stroke', active: false, speed: 0, materialId: g.mat });
    }
    this.openBatch = null;
  }

  private stamp(g: Gesture, x: number, y: number, dx: number, dy: number): void {
    const cov = this.cov!;
    if (g.mode === 'doodle') {
      this.pushStamp(g.allowKey, g.allowIds, { x, y, radius: g.radius, materialId: g.mat, dx, dy, strength: 1 });
      return;
    }
    let sx = x;
    let sy = y;
    let effR = g.radius;
    let nearLiveTarget = false;
    if (g.liveActor && g.liveActor.view.live && g.liveBbox) {
      const lb = g.liveBbox;
      const margin = g.radius + 12;
      if (x >= lb.x0 - margin && x <= lb.x1 + margin && y >= lb.y0 - margin && y <= lb.y1 + margin) {
        nearLiveTarget = true;
        const sb = this.bbox(g.lock);
        const lw = Math.max(1, lb.x1 - lb.x0);
        const lh = Math.max(1, lb.y1 - lb.y0);
        const sw = Math.max(1, sb.x1 - sb.x0);
        const sh = Math.max(1, sb.y1 - sb.y0);
        sx = sb.x0 + clamp((x - lb.x0) / lw, 0, 1) * sw;
        sy = sb.y0 + clamp((y - lb.y0) / lh, 0, 1) * sh;
        effR = Math.max(effR, LIVE_ACTOR_MIN_RADIUS);
      }
    } else if (this.sprites !== null && cov.total[g.lock]! > 0 && cov.total[g.lock]! <= SMALL_REGION_PX) {
      effR = Math.max(effR, SMALL_REGION_RADIUS);
    }

    const s: GpuStamp = { x: sx, y: sy, radius: effR, materialId: g.mat, dx, dy, strength: 1 };
    let allow = g.allow;
    let ids = g.allowIds;
    let key = g.allowKey;
    if (g.sponge) {
      const reach = new Uint8Array(256);
      cov.idsInDisc(sx, sy, effR, reach);
      allow = new Uint8Array(256);
      allow[g.lock] = 1;
      ids = [g.lock];
      for (let id = 1; id < 255; id++) {
        if (reach[id] === 1 && id !== g.lock && SPONGE_KINDS.includes(this.kindOf(id)) && this.colourable(id)) {
          allow[id] = 1;
          ids.push(id);
        }
      }
      key = `s${ids.join(',')}`;
    }
    const paintedBefore = cov.painted[g.lock]!;
    cov.stampDisc(sx, sy, effR, g.mat, allow, g.nbr);
    this.pushStamp(key, ids, s);

    // Guarantee responsive coverage when brushing across scattered live actor parts (e.g. Nova's spots or raised tail)
    if (nearLiveTarget && !this.bloomed[g.lock] && cov.painted[g.lock]! === paintedBefore) {
      const res = cov.fillUnpaintedFraction(g.lock, sx, sy, g.mat, 0.25);
      if (res.newlyPainted > 0) {
        this.pushStamp(key, [g.lock], {
          x: res.x,
          y: res.y,
          radius: res.radius,
          materialId: g.mat,
          dx,
          dy,
          strength: 1,
        });
      }
    }

    // Sprint 2 Active Magical Brush behaviors (all respect Smart Touch-Lock!)
    if (g.brush === 'cometMeteor') {
      if (dx !== 0 || dy !== 0) {
        const fx = clamp(sx + dx * effR * 1.15, 0, PAGE_W - 1);
        const fy = clamp(sy + dy * effR * 1.15, 0, PAGE_H - 1);
        const fr = effR * 0.7;
        cov.stampDisc(fx, fy, fr, g.mat, allow, null);
        this.pushStamp(key, ids, { x: fx, y: fy, radius: fr, materialId: g.mat, dx, dy, strength: 1 });
        if (g.speed >= 0.25 && g.fxAccum >= 14) {
          g.fxAccum = 0;
          this.effects.spawn('meteorStreak', x, y, {
            x2: clamp(x + dx * 22, 0, PAGE_W),
            y2: clamp(y + dy * 22, 0, PAGE_H),
            durMs: 550,
            materialId: g.mat,
          });
        }
      }
    } else if (g.brush === 'prismRoller') {
      const c = this.centroid(g.lock);
      const mx = clamp(2 * c.x - sx, 0, PAGE_W - 1);
      const my = clamp(2 * c.y - sy, 0, PAGE_H - 1);
      const mr = effR * 0.65;
      cov.stampDisc(mx, my, mr, g.mat, allow, null);
      this.pushStamp(key, ids, { x: mx, y: my, radius: mr, materialId: g.mat, dx: -dx, dy: -dy, strength: 1 });
    } else if (g.brush === 'starlightBubble') {
      if (!g.bubbleSpawned || g.fxAccum >= 36) {
        g.bubbleSpawned = true;
        g.fxAccum = 0;
        this.actors!.addBubble(x, Math.max(16, y - 6), g.mat);
      }
    } else if (g.brush === 'moonbeamQuill') {
      if ((dx === 0 && dy === 0) || g.fxAccum >= 14) {
        if (g.fxAccum >= 14) g.fxAccum = 0;
        this.effects.spawn('stardustTrail', x, y, {
          x2: clamp(x - dx * 10, 0, PAGE_W),
          y2: clamp(y - dy * 10, 0, PAGE_H),
          durMs: 650,
          materialId: g.mat,
        });
      }
    } else if (
      g.brush === 'lightningWhisker' &&
      !this.bloomed[g.lock] &&
      !this.lightningZapped[g.lock] &&
      this.regionPercent(g.lock) > LIGHTNING_TRIGGER_PCT
    ) {
      this.lightningZapped[g.lock] = 1;
      const res = cov.fillUnpaintedFraction(g.lock, sx, sy, g.mat, LIGHTNING_FILL_FRACTION);
      if (res.newlyPainted > 0) {
        this.pushStamp(`z${g.lock}`, [g.lock], {
          x: res.x,
          y: res.y,
          radius: res.radius,
          materialId: g.mat,
          dx: 0,
          dy: 0,
          strength: 1,
        });
        this.effects.spawn('lightningZap', x, y, { x2: res.x, y2: res.y, durMs: 550, materialId: g.mat });
        this.emit({ type: 'itemFoley', kind: 'crystalChime' });
      }
    }

    this.stampX = x;
    this.stampY = y;
    this.settle();
    this.stampX = NaN;
    this.stampY = NaN;
  }

  // ------------------------------------------------------------------ hover / UV
  hover(p: { x: number; y: number } | null): void {
    if (!this.page || !this.cov) return;
    if (p === null || !Number.isFinite(p.x) || !Number.isFinite(p.y)) {
      this.hoverPt = null;
      this.lastHoverTrackPt = null;
      return;
    }
    if (this.lastHoverTrackPt === null || Math.hypot(p.x - this.lastHoverTrackPt.x, p.y - this.lastHoverTrackPt.y) > 2) {
      this.lastHoverTrackPt = { x: p.x, y: p.y };
      this.idleMs = 0;
      this.clearIdleGuide();
    }
    this.hoverPt = { x: p.x, y: p.y };
    this.lastPtr = this.hoverPt;
    if (this.hasRelic('uvFlashlight')) {
      for (const id of this.ghostIds) {
        if (this.ghostRevealed[id]) continue;
        if (this.cov.regionWithin(id, p.x, p.y, UV_FLASHLIGHT_RADIUS)) {
          this.ghostRevealed[id] = 1;
          this.emit({ type: 'relic', relic: 'uvFlashlight', tag: RELIC_TAGS.uvFlashlight });
          const c = this.centroid(id);
          this.effects.spawn('paperDust', c.x, c.y, { durMs: 900 });
          this.syncRegion(id);
        }
      }
    }
  }

  // ------------------------------------------------------------------ stage machine
  private stageFor(id: number): number {
    const cov = this.cov!;
    const tot = cov.total[id]!;
    const p = cov.painted[id]!;
    if (tot === 0 || p === 0) return 0;
    const pct = p / tot;
    for (let s = 4; s >= 1; s--) if (pct >= STAGE_MIN[s]!) return s;
    return 0;
  }

  private noteQuestPainted(id: number, mat: number): void {
    for (let i = 0; i < this.heroQuests.length; i++) {
      const q = this.heroQuests[i]!;
      if (!q.regionIds.includes(id)) continue;
      if (mat > 0) this.questLastMat[i] = mat;
      this.questPauseMs[i] = 0;
      if (q.stalled) {
        q.stalled = false;
        for (const rid of q.regionIds) {
          if (this.stalledGlow[rid]) {
            this.stalledGlow[rid] = 0;
            this.syncRegion(rid);
          }
        }
      }
    }
  }

  private afterPaint(id: number): void {
    if (id === 0 || id === 255 || this.bloomed[id]) {
      this.syncRegion(id);
      return;
    }
    const cov = this.cov!;
    this.noteQuestPainted(id, cov.regionMat[id] || normMat(this.tool.materialId));
    if (this.hintActive && this.hintTargetRegionIds.includes(id)) {
      this.clearHintState();
    }
    const st = this.stageFor(id);
    const cur = this.stageOf[id]!;
    if (st > cur) {
      const kind = this.kindOf(id);
      for (let s = cur + 1; s <= Math.min(st, 3); s++) {
        this.stageOf[id] = s;
        this.emit({ type: 'stage', regionId: id, kind, stage: s as 1 | 2 | 3, materialId: cov.regionMat[id]! });
        if (s === 1) {
          const c = this.centroid(id);
          this.effects.spawn('paperDust', c.x, c.y, { durMs: 900 });
        }
      }
      this.sparkDirty = true;
    }
    if (st >= 4) {
      const c = this.centroid(id);
      this.bloomQueue.push({ id, x: Number.isFinite(this.stampX) ? this.stampX : c.x, y: Number.isFinite(this.stampY) ? this.stampY : c.y });
    }
    this.syncRegion(id);
  }

  /** Flushes touched regions, Composite Hero Quests, and the bloom queue until stable. */
  private settle(): void {
    const cov = this.cov!;
    for (let guard = 0; guard < 4096; guard++) {
      const touched = cov.takeTouched();
      for (const id of touched) this.afterPaint(id);
      if (touched.length > 0) this.refreshHeroQuests(true);
      if (this.bloomQueue.length === 0 && touched.length === 0) break;
      while (this.bloomQueue.length > 0) {
        const b = this.bloomQueue.shift()!;
        if (!this.bloomed[b.id]) this.bloomRegion(b.id, b.x, b.y);
      }
      this.refreshHeroQuests(true);
    }
    if (this.actors) {
      for (const a of this.actors.refreshStatus(this.stageOf, this.bloomed, cov.total)) {
        this.emit({ type: 'actorAwake', actor: a.kind });
      }
    }
  }

  // ------------------------------------------------------------------ Auto-Bloom
  private bloomRegion(
    id: number,
    ox: number,
    oy: number,
    suppressGem = false,
    preferredMat = 0,
    fromCompositeQuest = false,
  ): void {
    if (this.bloomed[id]) return;
    const cov = this.cov!;
    const fallbackMat = preferredMat > 0 ? normMat(preferredMat) : normMat(this.tool.materialId);
    cov.fillRemaining(id, cov.regionMat[id] || fallbackMat);
    const mat = cov.regionMat[id] || fallbackMat;
    const kind = this.kindOf(id);
    const c = this.centroid(id);
    this.bloomed[id] = 1;
    this.bloomT[id] = 0;
    this.stageOf[id] = 4;
    this.nudgeWiggleMs[id] = 0;
    this.spotlight[id] = 0;
    this.idleGlow[id] = 0;
    this.stalledGlow[id] = 0;
    this.originX[id] = ox;
    this.originY[id] = oy;
    this.rippling.push(id);
    this.sparkDirty = true;

    this.emit({ type: 'stage', regionId: id, kind, stage: 4, materialId: mat });
    this.emit({ type: 'autoBloom', regionId: id, kind, materialId: mat, x: ox, y: oy });
    this.effects.spawn('chromaticRipple', ox, oy, { durMs: RIPPLE_MS, materialId: mat });
    this.effects.spawn('starBurst', c.x, c.y, { durMs: 900, materialId: mat });

    // gems, exactly once per individually bloomed region (skipped for auto-filled quest micro-slivers)
    if (!suppressGem) {
      const actorRegion =
        this.page!.regions[id]?.actorInstanceId !== undefined || this.actors!.list.some((a) => a.regionIds.includes(id));
      this.emit(
        actorRegion
          ? { type: 'gems', amount: GEM_REWARDS.actorBloom, reason: 'actorBloom' }
          : { type: 'gems', amount: GEM_REWARDS.regionBloom, reason: 'regionBloom' },
      );
    }

    // causality
    const effect = matchCausality(kind, mat);
    if (effect !== null) {
      this.emit({ type: 'causality', effect, regionId: id, x: c.x, y: c.y });
      this.spawnCausality(effect, id);
    }
    if (kind === 'asteroid') this.bridgeAsteroids(id, true);

    // actors waking
    for (const a of this.actors!.refreshStatus(this.stageOf, this.bloomed, cov.total)) {
      this.emit({ type: 'actorAwake', actor: a.kind });
    }

    // page progress
    if (this.coreSet.has(id)) this.coreAwake++;
    if (!fromCompositeQuest) {
      this.refreshHeroQuests(true);
      this.checkPageComplete();
    }

    this.relicsOnBloom(id, kind);
    this.syncRegion(id);
  }

  private bridgeAsteroids(id: number, live: boolean): void {
    const c = this.centroid(id);
    let best = -1;
    let bd = Infinity;
    for (let o = 1; o < 255; o++) {
      if (o === id || !this.bloomed[o] || this.kindOf(o) !== 'asteroid') continue;
      const oc = this.centroid(o);
      const d = Math.hypot(oc.x - c.x, oc.y - c.y);
      if (d < bd) {
        bd = d;
        best = o;
      }
    }
    if (best < 0) return;
    const oc = this.centroid(best);
    this.effects.spawn('rainbowBridge', c.x, c.y, { x2: oc.x, y2: oc.y, growMs: live ? 1400 : 1 });
  }

  // ------------------------------------------------------------------ causality effects
  private spawnCausality(effect: CausalityKind, id: number, restoring = false): void {
    const fx = this.effects;
    const actors = this.actors!;
    const c = this.centroid(id);
    const b = this.bbox(id);
    const w = b.x1 - b.x0;
    const h = b.y1 - b.y0;
    switch (effect) {
      case 'rainbowSlide': {
        const e = fx.spawn('rainbowSlide', clamp(c.x - w * 0.35, 8, PAGE_W - 8), clamp(c.y - h * 0.2, 8, PAGE_H - 8), {
          x2: clamp(c.x + w * 0.45, 8, PAGE_W - 8),
          y2: clamp(c.y + h * 0.8 + 10, 8, PAGE_H - 8),
          materialId: 6,
          growMs: 900,
        });
        if (!restoring) actors.queueSlide(e);
        break;
      }
      case 'starlightFlowerRain': {
        fx.spawn('starlightFlowerRain', c.x, b.y0, { x2: c.x, y2: PAGE_H - 12, durMs: 2400, materialId: 3 });
        const margin = this.paths.find((p) => p.role === 'margin' && p.points.length >= 2);
        const spots: { x: number; y: number }[] = [];
        for (let i = 0; i < 6; i++) {
          if (margin) {
            const pi = Math.min(margin.points.length - 1, Math.round((i * (margin.points.length - 1)) / 5));
            const pt = margin.points[pi]!;
            spots.push({ x: pt.x, y: pt.y });
          } else spots.push({ x: clamp(c.x + (i - 2.5) * 36, 14, PAGE_W - 14), y: PAGE_H - 14 });
        }
        actors.addFlowers(id, spots, restoring ? 0 : 1800);
        break;
      }
      case 'zeroGTrampoline': {
        const ty = clamp(b.y0 + h * 0.35, 40, PAGE_H - 24);
        const amp = clamp(ty - 14, 30, 78);
        const t = fx.spawn('zeroGTrampoline', c.x, ty, { materialId: 7, growMs: 700 });
        for (let i = 0; i < 3 && !restoring; i++) {
          fx.spawn('hiddenStar', clamp(c.x + (i - 1) * 42, 12, PAGE_W - 12), ty - amp * (0.5 + 0.18 * i), {
            pickup: { gems: GEM_REWARDS.hiddenStar, reason: 'hiddenStar' },
            growMs: 800,
          });
        }
        if (!restoring) actors.queueBounce(t, amp);
        break;
      }
      case 'cheetahRacetrack': {
        const rx = w / 2 + 26;
        const ry = h / 2 + 18;
        let ring = this.paths.find((p) => p.role === 'ring' && p.closed && p.points.length >= 3);
        if (!ring) {
          const pts: { x: number; y: number }[] = [];
          for (let i = 0; i < 24; i++) {
            const a = (i / 24) * Math.PI * 2;
            pts.push({ x: clamp(c.x + Math.cos(a) * rx, 8, PAGE_W - 8), y: clamp(c.y + Math.sin(a) * ry, 8, PAGE_H - 8) });
          }
          ring = { points: pts, closed: true, role: 'ring' };
        }
        fx.spawn('cheetahRacetrack', c.x, c.y, { x2: c.x + rx, y2: c.y + ry, materialId: 4, growMs: 900 });
        actors.addCars(id, ring);
        break;
      }
      case 'discoMirage': {
        let beams = 0;
        for (let o = 1; o < 255; o++) {
          if (o === id || this.kindOf(o) !== 'comet' || this.cov!.total[o]! === 0) continue;
          const oc = this.centroid(o);
          if (Math.hypot(oc.x - c.x, oc.y - c.y) > MIRAGE_RANGE) continue;
          fx.spawn('discoMirage', c.x, c.y, { x2: oc.x, y2: oc.y, materialId: 2, growMs: 800 });
          if (!this.bloomed[o]) this.forcedWiggle[o] = 1;
          this.syncRegion(o);
          beams++;
        }
        actors.wakeComets(c.x, c.y, MIRAGE_RANGE);
        if (beams === 0) fx.spawn('discoMirage', c.x, c.y, { x2: c.x, y2: Math.max(8, c.y - 70), materialId: 2, growMs: 800 });
        break;
      }
      default:
        if (!restoring) fx.spawn('gentleSparkle', c.x, c.y, { durMs: 2400, materialId: this.cov!.regionMat[id]! });
    }
  }

  // ------------------------------------------------------------------ relics
  private relicsOnBloom(id: number, kind: RegionKind): void {
    if (this.hasRelic('zoomiePaw') && (kind === 'star' || kind === 'comet')) this.zoomie(id);
    if (this.hasRelic('kaleidoSharpener')) this.kaleido(id);
    if (this.hasRelic('prismRibbon') && !this.prismFired) this.prism();
    if (this.hasRelic('chromaticButterfly')) this.echoButterfly(id);
  }

  private candidates(from: number, onlyUntouched: boolean): number[] {
    const cov = this.cov!;
    const fc = this.centroid(from);
    const out: { id: number; d: number }[] = [];
    for (let o = 1; o < 255; o++) {
      if (o === from || this.bloomed[o] || !this.colourable(o)) continue;
      if (onlyUntouched && cov.painted[o]! > 0) continue;
      const oc = this.centroid(o);
      out.push({ id: o, d: Math.hypot(oc.x - fc.x, oc.y - fc.y) });
    }
    out.sort((a, b) => a.d - b.d || a.id - b.id);
    return out.map((q) => q.id);
  }

  private nearestUnbloomed(x: number, y: number, onlyUntouched: boolean, preferQuest = false): number {
    const cov = this.cov!;
    if (preferQuest) {
      let bestId = 0;
      let bestD = Infinity;
      for (const q of this.heroQuests) {
        if (q.completed) continue;
        for (const id of q.regionIds) {
          if (this.bloomed[id] || !this.colourable(id)) continue;
          if (onlyUntouched && cov.painted[id]! > 0) continue;
          const c = this.centroid(id);
          const d = Math.hypot(c.x - x, c.y - y);
          if (d < bestD || (d === bestD && id < bestId)) {
            bestD = d;
            bestId = id;
          }
        }
      }
      if (bestId > 0) return bestId;
    }
    let bestId = 0;
    let bestD = Infinity;
    for (let o = 1; o < 255; o++) {
      if (this.bloomed[o] || !this.colourable(o)) continue;
      if (onlyUntouched && cov.painted[o]! > 0) continue;
      const oc = this.centroid(o);
      const d = Math.hypot(oc.x - x, oc.y - y);
      if (d < bestD || (d === bestD && o < bestId)) {
        bestD = d;
        bestId = o;
      }
    }
    return bestId;
  }

  private bonusFill(id: number, mat: number, fraction: number): void {
    const cov = this.cov!;
    if (this.bloomed[id] || cov.total[id]! === 0) return;
    const c = this.centroid(id);
    const radius = cov.fillFraction(id, c.x, c.y, mat, fraction);
    this.pushStamp(`b${id}`, [id], { x: c.x, y: c.y, radius, materialId: mat, dx: 0, dy: 0, strength: 1 });
  }

  private bonusFillUnpainted(id: number, mat: number, fraction: number, ax: number, ay: number): void {
    const cov = this.cov!;
    if (this.bloomed[id] || cov.total[id]! === 0) return;
    const res = cov.fillUnpaintedFraction(id, ax, ay, mat, fraction);
    if (res.newlyPainted > 0) {
      this.pushStamp(`b${id}`, [id], { x: res.x, y: res.y, radius: res.radius, materialId: mat, dx: 0, dy: 0, strength: 1 });
    }
  }

  private zoomie(id: number): void {
    const list = this.candidates(id, true);
    const target = list[0] ?? this.candidates(id, false)[0];
    this.emit({ type: 'relic', relic: 'zoomiePaw', tag: RELIC_TAGS.zoomiePaw });
    if (target === undefined) return;
    const tc = this.centroid(target);
    const arrive = (): void => {
      this.effects.spawn('goldDoodle', tc.x, tc.y, { durMs: 1500, materialId: GOLD });
      this.bonusFill(target, GOLD, ZOOMIE_FILL);
    };
    if (!this.actors!.dashNova(tc.x, tc.y, arrive)) arrive();
  }

  private kaleido(id: number): void {
    const targets = this.candidates(id, true).slice(0, KALEIDOSCOPE_TARGETS);
    if (targets.length === 0) return;
    this.emit({ type: 'relic', relic: 'kaleidoSharpener', tag: RELIC_TAGS.kaleidoSharpener });
    const c = this.centroid(id);
    for (const t of targets) {
      const tc = this.centroid(t);
      this.effects.spawn('paintSplatComet', c.x, c.y, {
        x2: tc.x,
        y2: tc.y,
        durMs: 800,
        materialId: HOLO_FOIL,
        onDone: () => this.bonusFill(t, HOLO_FOIL, KALEIDOSCOPE_PREFILL),
      });
    }
  }

  private echoButterfly(fromId: number): void {
    if (!this.actors || this.actors.butterflyBusy()) return;
    const cov = this.cov!;
    let target = 0;
    for (const onlyUntouched of [true, false]) {
      for (const q of this.heroQuests) {
        if (q.completed) continue;
        for (const rid of q.regionIds) {
          if (rid === fromId || this.bloomed[rid] || !this.colourable(rid)) continue;
          if (onlyUntouched && cov.painted[rid]! > 0) continue;
          target = rid;
          break;
        }
        if (target > 0) break;
      }
      if (target > 0) break;
    }
    if (target === 0) target = this.candidates(fromId, false)[0] ?? 0;
    if (target === 0) return;

    const fc = this.centroid(fromId);
    const tc = this.centroid(target);
    const mat = cov.regionMat[fromId] || normMat(this.tool.materialId);
    this.emit({ type: 'relic', relic: 'chromaticButterfly', tag: RELIC_TAGS.chromaticButterfly });
    this.effects.spawn('echoTrail', fc.x, fc.y, { x2: tc.x, y2: tc.y, durMs: 900, materialId: mat });
    const arrive = (): void => {
      if (!this.bloomed[target]) {
        this.bonusFillUnpainted(target, mat, BUTTERFLY_ECHO_FRACTION, tc.x, tc.y);
        this.effects.spawn('starBurst', tc.x, tc.y, { durMs: 650, materialId: mat });
      }
    };
    if (!this.actors.flutterButterfly(fc.x, fc.y, tc.x, tc.y, arrive)) arrive();
  }

  private distinctBloomMaterials(): number {
    const seen = new Set<number>();
    for (let id = 1; id < 255; id++) if (this.bloomed[id]) seen.add(this.cov!.regionMat[id]!);
    seen.delete(0);
    return seen.size;
  }

  private prism(): void {
    if (this.distinctBloomMaterials() < 3) return;
    this.prismFired = true;
    this.emit({ type: 'relic', relic: 'prismRibbon', tag: RELIC_TAGS.prismRibbon });
    const x0 = PAGE_W * 0.15;
    const x1 = PAGE_W * 0.85;
    const y = PAGE_H * 0.4;
    this.effects.spawn('harmonyArc', x0, y, { x2: x1, y2: y, durMs: 5000 });
    for (let i = 0; i < 7; i++) {
      const t = i / 6;
      this.effects.spawn('gemPickup', x0 + (x1 - x0) * t, y - Math.sin(Math.PI * t) * 60, {
        pickup: { gems: GEM_REWARDS.harmonyGem, reason: 'harmony' },
        growMs: 600 + i * 120,
      });
    }
  }

  private updateRelics(dt: number): void {
    if (!this.page || !this.cov || this.ctx.viewOnly) return;
    if (this.hasRelic('starlightMagnet')) {
      const target = this.pointer() ?? { x: 24, y: 20 };
      const step = (MAGNET_SPEED_PX_S * dt) / 1000;
      for (const e of this.effects.list.slice()) {
        if ((e.kind !== 'gemPickup' && e.kind !== 'hiddenStar') || !e.pickup) continue;
        const dx = target.x - e.x;
        const dy = target.y - e.y;
        const d = Math.hypot(dx, dy);
        if (d <= Math.max(14, step)) {
          this.magnetTracked.delete(e.id);
          this.emit({ type: 'relic', relic: 'starlightMagnet', tag: RELIC_TAGS.starlightMagnet });
          this.emit({ type: 'itemFoley', kind: 'magnetHarp' });
          this.effects.spawn('magnetArc', e.x, e.y, { x2: target.x, y2: target.y, durMs: 550, materialId: 5 });
          this.collect(e);
        } else {
          if (!this.magnetTracked.has(e.id)) {
            this.magnetTracked.add(e.id);
            this.effects.spawn('magnetArc', e.x, e.y, { x2: target.x, y2: target.y, durMs: 550, materialId: 5 });
          }
          e.x += (dx / d) * step;
          e.y += (dy / d) * step;
        }
      }
    }
    if (this.hasRelic('sleepyMoonCat') && !this.pageComplete && !this.prologueActive) {
      this.moonCatTimerMs += dt;
      if (this.moonCatTimerMs >= MOON_CAT_INTERVAL_MS) {
        this.moonCatTimerMs -= MOON_CAT_INTERVAL_MS;
        const cat = this.actors?.list.find((a) => a.relicHelper === 'moonCat');
        const cx = cat ? cat.view.x : this.page.focal.x;
        const cy = cat ? cat.view.y : this.page.focal.y;
        const target =
          this.nearestUnbloomed(cx, cy, true, true) ||
          this.nearestUnbloomed(cx, cy, false, true) ||
          this.nearestUnbloomed(cx, cy, false, false);
        if (target > 0) {
          const tc = this.centroid(target);
          const mat = this.cov.regionMat[target] || normMat(this.tool.materialId);
          this.actors?.setMoonCatTarget(tc.x, tc.y);
          this.bonusFillUnpainted(target, mat, MOON_CAT_FILL_FRACTION, tc.x, tc.y);
          this.effects.spawn('starBurst', tc.x, tc.y, { durMs: 650, materialId: mat });
          this.emit({ type: 'relic', relic: 'sleepyMoonCat', tag: RELIC_TAGS.sleepyMoonCat });
          this.emit({ type: 'itemFoley', kind: 'catPurr' });
        }
      }
    }
  }

  // ------------------------------------------------------------------ update
  update(dtMs: number, _timeMs: number): void {
    if (!this.page || !this.cov) return;
    const dt = clamp(Number.isFinite(dtMs) ? dtMs : 0, 0, 250);
    const finaleWasActive = this.finale.state.active;
    this.effects.update(dt);
    if (this.rippling.length > 0) {
      const keep: number[] = [];
      for (const id of this.rippling) {
        this.bloomT[id] = this.bloomT[id]! + dt;
        if (this.bloomT[id]! < RIPPLE_MS) keep.push(id);
        else this.bloomT[id] = RIPPLE_MS;
        this.syncRegion(id);
      }
      this.rippling = keep;
    }
    this.updateRelics(dt);
    this.actors!.update(dt);
    this.actors!.refreshStatus(this.stageOf, this.bloomed, this.cov.total);
    this.settle();
    this.updateStalledQuests(dt);
    this.updateWisp(dt);
    if (finaleWasActive && this.finale.update(dt)) {
      this.emit({ type: 'autoPageTurnReady' });
    }
    if (this.sparkDirty) this.rebuildSparkles();
  }

  private updateStalledQuests(dt: number): void {
    if (this.ctx.viewOnly || this.pageComplete || this.prologueActive) return;
    const cov = this.cov!;
    for (let i = 0; i < this.heroQuests.length; i++) {
      const q = this.heroQuests[i]!;
      if (q.completed || q.progress < STALLED_QUEST_THRESHOLD) {
        this.questPauseMs[i] = 0;
        if (q.stalled) {
          q.stalled = false;
          for (const id of q.regionIds) {
            if (this.stalledGlow[id]) {
              this.stalledGlow[id] = 0;
              this.syncRegion(id);
            }
          }
        }
        continue;
      }
      const paintingThisQuest = this.g?.mode === 'paint' && q.regionIds.includes(this.g.lock);
      if (paintingThisQuest) {
        this.questPauseMs[i] = 0;
        continue;
      }
      this.questPauseMs[i] = this.questPauseMs[i]! + dt;
      if (this.questPauseMs[i]! >= STALLED_QUEST_DELAY_MS && !q.stalled) {
        q.stalled = true;
        for (const id of q.regionIds) {
          if (!this.bloomed[id] && cov.total[id]! > 0) {
            this.stalledGlow[id] = 1;
            this.syncRegion(id);
          }
        }
      }
    }
  }

  private updateWisp(dt: number): void {
    if (this.nudgedIds.length > 0) {
      const keep: number[] = [];
      for (const id of this.nudgedIds) {
        const next = Math.max(0, this.nudgeWiggleMs[id]! - dt);
        this.nudgeWiggleMs[id] = next;
        if (next > 0 && !this.bloomed[id] && !this.pageComplete) {
          keep.push(id);
        } else {
          this.nudgeWiggleMs[id] = 0;
          this.syncRegion(id);
        }
      }
      this.nudgedIds = keep;
    }

    if (this.prologueActive) {
      if (this.pageComplete) {
        this.dismissPrologue();
      } else {
        this.prologueMs += dt;
        this.applyPrologueState();
      }
      return;
    }

    if (this.prologueDissolveMs > 0) {
      this.prologueDissolveMs = Math.max(0, this.prologueDissolveMs - dt);
      this.prologueMistVal =
        this.prologueDissolveMs > 0 ? this.prologueDissolveFrom * (this.prologueDissolveMs / PROLOGUE_DISSOLVE_MS) : 0;
    }

    if (this.hintActive) {
      this.hintRemainingMs = Math.max(0, this.hintRemainingMs - dt);
      this.hintElapsedMs += dt;
      const anyUnbloomed = this.hintTargetRegionIds.some((id) => !this.bloomed[id]);
      if (this.hintRemainingMs <= 0 || this.pageComplete || !anyUnbloomed) {
        this.clearHintState();
      } else {
        this.hintDimAmount = this.hintRemainingMs < HINT_FADE_MS ? clamp(this.hintRemainingMs / HINT_FADE_MS, 0, 1) : 1;
        this.ghostStrokeT = (this.hintElapsedMs % PROLOGUE_STROKE_LOOP_MS) / PROLOGUE_STROKE_LOOP_MS;
        const pt = samplePath(this.ghostPath, this.ghostStrokeT);
        this.wispX = pt.x;
        this.wispY = pt.y;
        this.wispActive = true;
        this.wispMode = 'hintBeam';
        this.wispAlpha = this.hintDimAmount;
      }
      return;
    }

    if (this.ctx.viewOnly || this.pageComplete) {
      this.clearIdleGuide();
      return;
    }

    if (this.g === null) this.idleMs += dt;
    if (this.idleMs >= IDLE_WISP_DELAY_MS) {
      const picked = this.pickIdleQuest();
      const targetId = picked.targetId;
      if (targetId <= 0) {
        this.clearIdleGuide();
        return;
      }
      const tc = this.centroid(targetId);
      if (!this.idleGuideActive || this.idleTargetId !== targetId) {
        this.clearIdleGlowFlags();
        this.clearQuestHighlights();
        this.idleGuideActive = true;
        this.idleTargetId = targetId;
        this.idleQuestId = picked.quest?.questId ?? null;
        if (picked.quest) picked.quest.highlighted = true;
        for (const id of picked.unbloomed) {
          this.idleGlow[id] = 1;
          this.syncRegion(id);
        }
        if (!this.wispActive || this.wispAlpha < 0.05) {
          this.wispX = clamp(tc.x - 32, 12, PAGE_W - 12);
          this.wispY = clamp(tc.y - 24, 12, PAGE_H - 12);
        }
        this.wispActive = true;
        this.wispMode = 'idleGuide';
        this.wispTargetRegionId = targetId;
        this.emit({ type: 'wispGuide', regionId: targetId, mode: 'idleGuide' });
      }
      const bobT = (this.idleMs - IDLE_WISP_DELAY_MS) / 1000;
      const tx = tc.x + Math.sin(bobT * 1.6) * 10;
      const ty = tc.y + Math.sin(bobT * 3.2) * 5;
      const k = Math.min(1, dt / 260);
      this.wispX += (tx - this.wispX) * k;
      this.wispY += (ty - this.wispY) * k;
      this.wispActive = true;
      this.wispMode = 'idleGuide';
      this.wispTargetRegionId = targetId;
      this.wispAlpha = Math.min(1, this.wispAlpha + Math.max(dt, 16) / 320);
    }
  }

  private rebuildSparkles(): void {
    this.sparkDirty = false;
    const out: { x: number; y: number }[] = [];
    for (let id = 1; id < 255; id++) {
      const s = this.stageOf[id]!;
      if (s >= 1 && s <= 3 && !this.bloomed[id]) out.push({ ...this.centroid(id) });
    }
    this.sparkles = out;
  }

  // ------------------------------------------------------------------ view / state bytes
  private syncAll(): void {
    for (let id = 1; id < 255; id++) if (this.cov!.total[id]! > 0) this.syncRegion(id);
    this.dirty = true;
    this.rebuildSparkles();
  }

  private syncRegion(id: number): void {
    if (id <= 0 || id >= 255 || !this.cov) return;
    const cov = this.cov;
    const rs = this.regionState;
    const tot = cov.total[id]!;
    if (tot === 0) return;
    const bl = this.bloomed[id] === 1;
    const covB = bl ? 255 : Math.min(254, Math.floor((cov.painted[id]! / tot) * 255));
    const bloomB = bl ? (this.bloomT[id]! >= RIPPLE_MS ? 255 : Math.floor((255 * this.bloomT[id]!) / RIPPLE_MS)) : 0;
    let flags = 0;
    if (bl) flags |= REGION_FLAG.complete;
    if (!bl && this.questTarget[id]) flags |= REGION_FLAG.questTarget;
    if (this.ghostRevealed[id]) flags |= REGION_FLAG.ghostRevealed;
    const st = this.stageOf[id]!;
    if ((!bl && st >= 1 && st <= 3) || this.forcedWiggle[id] || (!bl && this.nudgeWiggleMs[id]! > 0)) flags |= REGION_FLAG.wiggle;
    if (bl && this.bloomT[id]! < 300) flags |= REGION_FLAG.flash;
    if (id >= GHOST_MIN && id <= GHOST_MAX && !this.ghostRevealed[id]) flags |= REGION_FLAG.hidden;
    if (!bl && (this.spotlight[id] || this.idleGlow[id] || this.stalledGlow[id])) flags |= REGION_FLAG.guideGlow;
    if (!bl && this.spotlight[id]) flags |= REGION_FLAG.spotlight;
    const questPrio = !bl && this.questUrgent[id] ? 2 : !bl && this.questTarget[id] ? 1 : 0;
    const o = id * 4;
    const o1 = REGION_STATE_ROW1_OFFSET + id * 4;
    const ox = clamp(Math.round((this.originX[id]! * 255) / PAGE_W), 0, 255);
    const oy = clamp(Math.round((this.originY[id]! * 255) / PAGE_H), 0, 255);
    const vals: [number, number][] = [
      [o, cov.regionMat[id]!],
      [o + 1, covB],
      [o + 2, bloomB],
      [o + 3, flags],
      [o1, ox],
      [o1 + 1, oy],
      [o1 + 2, bl ? 4 : st],
      [o1 + 3, questPrio],
    ];
    for (const [i, v] of vals) {
      if (rs[i] !== v) {
        rs[i] = v;
        this.dirty = true;
      }
    }
  }

  private computeHoveredRegionId(): number {
    if (!this.page || !this.cov || this.ctx.viewOnly || this.tool.doodle) return 0;
    const pt = this.brushPt ?? this.hoverPt;
    if (!pt) return 0;
    return this.resolvePaintTarget(pt.x, pt.y, false).id;
  }

  private computeWandGlow(): { x: number; y: number; r: number } | null {
    if (!this.page || !this.cov || this.ctx.viewOnly || !this.tool.doodle) return null;
    const pt = this.brushPt ?? this.hoverPt;
    if (!pt) return null;
    return { x: pt.x, y: pt.y, r: WAND_UV_PEEK_RADIUS };
  }

  private computeWonderWhisper(hoveredRegionId: number): WonderWhisperHint | null {
    if (!this.page || !this.cov || this.ctx.viewOnly || this.tool.doodle) return null;
    const id = this.g?.mode === 'paint' ? this.g.lock : hoveredRegionId;
    if (id < 1 || id > 254 || this.bloomed[id] || !this.colourable(id)) return null;
    const effect = matchCausality(this.kindOf(id), normMat(this.tool.materialId));
    if (effect === null || effect === 'gentleSparkle') return null;
    const c = this.centroid(id);
    const b = this.bbox(id);
    return { regionId: id, effect, x: c.x, y: c.y, x0: b.x0, y0: b.y0, x1: b.x1, y1: b.y1 };
  }

  private computePokeInvites(): PokeInvite[] {
    if (!this.page || !this.cov) return [];
    const out: PokeInvite[] = [];
    const seen = new Set<string>();
    if (this.actors) {
      for (const a of this.actors.list) {
        if (!a.shown || !a.firstAwakeInvite) continue;
        out.push({ instanceId: a.view.instanceId, kind: a.kind, x: a.view.x, y: a.view.y, firstAwake: true });
        seen.add(a.view.instanceId);
      }
      if (this.tool.doodle && !this.ctx.viewOnly) {
        for (const a of this.actors.list) {
          if (!a.shown || !a.view.live) continue;
          if (a.kind !== 'lumi' && a.kind !== 'nova' && a.kind !== 'violet') continue;
          if (seen.has(a.view.instanceId)) continue;
          out.push({ instanceId: a.view.instanceId, kind: a.kind, x: a.view.x, y: a.view.y, firstAwake: false });
          seen.add(a.view.instanceId);
        }
      }
    }
    if (this.tool.doodle && !this.ctx.viewOnly) {
      for (let id = 1; id < 255; id++) {
        if (!this.bloomed[id] || this.cov.total[id]! === 0) continue;
        const k = this.kindOf(id);
        if (k !== 'cloud' && k !== 'planet' && k !== 'rings') continue;
        const c = this.centroid(id);
        const kind: 'cloud' | 'planet' = k === 'cloud' ? 'cloud' : 'planet';
        out.push({ instanceId: `${kind}-${id}`, kind, x: c.x, y: c.y, firstAwake: false });
      }
    }
    return out;
  }

  view(): SimView {
    const dirty = this.dirty;
    this.dirty = false;
    const uv = this.hasRelic('uvFlashlight') && this.hoverPt ? { x: this.hoverPt.x, y: this.hoverPt.y, r: UV_FLASHLIGHT_RADIUS } : null;
    const hoveredRegionId = this.computeHoveredRegionId();
    const wisp: WispRenderState = {
      active: this.wispActive,
      mode: this.wispMode,
      x: this.wispX,
      y: this.wispY,
      targetRegionId: this.wispTargetRegionId,
      ghostStrokeT: this.ghostStrokeT,
      ghostPath:
        this.prologueActive || (this.wispActive && this.wispMode === 'hintBeam') ? this.ghostPath.slice() : [],
      prologueMist: this.prologueMistVal,
      alpha: this.wispAlpha,
    };
    return {
      regionState: this.regionState,
      regionStateDirty: dirty,
      actors: this.actors ? this.actors.views() : [],
      effects: this.effects.list,
      pageAwakening: this.coreTotal > 0 ? this.coreAwake / this.coreTotal : 0,
      coreAwake: this.coreAwake,
      coreTotal: this.coreTotal,
      pageComplete: this.pageComplete,
      uvFlashlight: uv,
      sparkleSources: this.sparkles,
      hoveredRegionId,
      heroQuests: this.heroQuests.map((q) => ({ ...q, regionIds: q.regionIds.slice() })),
      storyStars: this.storyStars.map((s) => ({ ...s, regionIds: s.regionIds.slice() })),
      hintState: this.currentHintState(),
      pageFinale: this.finale.state,
      wisp,
      wonderWhisper: this.computeWonderWhisper(hoveredRegionId),
      pokeInvites: this.computePokeInvites(),
      wandGlow: this.computeWandGlow(),
    };
  }

  regionPercent(id: number): number {
    const cov = this.cov;
    if (!cov || id < 0 || id > 255) return 0;
    const t = cov.total[id]!;
    return t === 0 ? 0 : cov.painted[id]! / t;
  }

  // ------------------------------------------------------------------ snapshot / restore
  snapshotPage(): StoryPageSnapshot {
    if (!this.page || !this.cov) throw new Error('snapshotPage: no page loaded');
    const done: number[] = [];
    for (let id = 1; id < 255; id++) if (this.bloomed[id]) done.push(id);
    return {
      sceneId: this.page.sceneId as ChapterId,
      seed: this.page.seed,
      paintedMaskRle: this.cov.encodeRle(),
      regionMaterialId: this.cov.regionMat.slice(),
      completedRegionIds: done,
    };
  }

  restorePage(s: StoryPageSnapshot): void {
    if (!this.page || !this.cov) throw new Error('restorePage: no page loaded');
    const cov = this.cov;
    const p = this.page;
    cov.reset();
    cov.decodeRleInto(s.paintedMaskRle);
    for (let i = 0; i < PAGE_PIXELS; i++) {
      if (cov.mask[i] === 0) continue;
      const id = cov.map[i]!;
      if (id === 0 || id === 255) {
        cov.mask[i] = 0;
        continue;
      }
      cov.pixMat[i] = normMat(s.regionMaterialId[id] || 1);
    }
    cov.recount();
    cov.takeTouched();

    this.events = [];
    this.batches = [];
    this.openBatch = null;
    this.effects.clear();
    this.g = null;
    this.brushPt = null;
    this.lastHoverTrackPt = null;
    this.bloomQueue = [];
    this.rippling = [];
    this.nudgedIds = [];
    this.stageOf.fill(0);
    this.bloomed.fill(0);
    this.bloomT.fill(0);
    this.ghostRevealed.fill(0);
    this.forcedWiggle.fill(0);
    this.spotlight.fill(0);
    this.idleGlow.fill(0);
    this.stalledGlow.fill(0);
    this.questTarget.fill(0);
    this.questUrgent.fill(0);
    this.lightningZapped.fill(0);
    this.nudgeWiggleMs.fill(0);
    this.finale.reset();
    this.moonCatTimerMs = 0;
    this.gravityPokeAwarded = false;
    this.magnetTracked.clear();
    this.resetWispState();
    this.pageComplete = false;
    this.prismFired = false;
    this.actors = new ActorSystem(this, p.actors, p.seed);
    this.spawnRelicCompanions();

    for (const id of s.completedRegionIds) {
      if (id < 1 || id > 254 || cov.total[id]! === 0) continue;
      cov.fillRemaining(id, normMat(s.regionMaterialId[id] || cov.regionMat[id] || 1));
      this.bloomed[id] = 1;
      this.bloomT[id] = RIPPLE_MS;
      this.stageOf[id] = 4;
    }
    cov.takeTouched();
    for (let id = 1; id < 255; id++) {
      if (cov.total[id]! === 0) continue;
      if (!this.bloomed[id]) this.stageOf[id] = Math.min(3, this.stageFor(id));
      if (id >= GHOST_MIN && cov.painted[id]! > 0) this.ghostRevealed[id] = 1;
    }
    // persistent causality / bridge effects return silently (no events, no gems)
    for (let id = 1; id < 255; id++) {
      if (!this.bloomed[id]) continue;
      const kind = this.kindOf(id);
      const eff = matchCausality(kind, cov.regionMat[id]!);
      if (eff !== null) this.spawnCausality(eff, id, true);
      if (kind === 'asteroid') this.bridgeAsteroids(id, false);
    }
    this.effects.update(0);
    this.actors.refreshStatus(this.stageOf, this.bloomed, cov.total, true);
    this.buildHeroQuests(p);
    this.refreshHeroQuests(false);
    this.recomputeCore();
    this.prismFired = this.hasRelic('prismRibbon') && this.distinctBloomMaterials() >= 3;
    this.emitRestoreBatches();
    this.syncAll();
  }

  /** Re-creates the stroke layer on the GPU after restore (grid approximation for partial regions). */
  private emitRestoreBatches(): void {
    const cov = this.cov!;
    for (let id = 1; id < 255; id++) {
      if (cov.painted[id]! === 0) continue;
      const mat = cov.regionMat[id]!;
      if (this.bloomed[id] || cov.painted[id]! === cov.total[id]!) {
        const c = this.centroid(id);
        const b = this.bbox(id);
        const radius = Math.ceil(Math.hypot(Math.max(c.x - b.x0, b.x1 + 1 - c.x), Math.max(c.y - b.y0, b.y1 + 1 - c.y))) + 1;
        this.pushStamp(`r${id}`, [id], { x: c.x, y: c.y, radius, materialId: mat, dx: 0, dy: 0, strength: 1 });
        continue;
      }
      const cells = new Map<number, number>();
      const end = cov.offsets[id + 1]!;
      for (let k = cov.offsets[id]!; k < end; k++) {
        const idx = cov.pixels[k]!;
        if (cov.mask[idx] === 0) continue;
        const cell = Math.floor(Math.floor(idx / PAGE_W) / 3) * 200 + Math.floor((idx % PAGE_W) / 3);
        if (!cells.has(cell)) cells.set(cell, cov.pixMat[idx]!);
      }
      for (const [cell, m] of cells) {
        const gx = cell % 200;
        const gy = Math.floor(cell / 200);
        this.pushStamp(`r${id}`, [id], { x: gx * 3 + 1.5, y: gy * 3 + 1.5, radius: 2.2, materialId: m, dx: 0, dy: 0, strength: 1 });
      }
    }
    this.openBatch = null;
  }

  // ------------------------------------------------------------------ QA
  qaStrokePath(regionId: number): { x: number; y: number }[] {
    const cov = this.cov;
    if (!cov || regionId <= 0 || regionId > 255 || cov.total[regionId]! === 0) return [];
    const liveActor = this.findLiveActorForRegion(regionId);
    if (liveActor && this.sprites) {
      const lb = this.computeLiveRegionBbox(liveActor, regionId);
      if (lb) {
        const lpts: { x: number; y: number }[] = [];
        let right = true;
        for (let y = lb.y0 + Math.min(2, (lb.y1 - lb.y0) >> 1); y <= lb.y1; y += 4) {
          let row: number[] = [];
          for (let x = lb.x0; x <= lb.x1; x += 4) if (this.sampleLiveActor(liveActor, x, y) === regionId) row.push(x);
          if (row.length === 0) {
            for (let x = lb.x0; x <= lb.x1; x++) if (this.sampleLiveActor(liveActor, x, y) === regionId) row.push(x);
            if (row.length > 2) row = [row[0]!, row[row.length - 1]!];
          }
          if (!right) row.reverse();
          for (const x of row) lpts.push({ x: x + 0.5, y: y + 0.5 });
          right = !right;
        }
        if (lpts.length > 0) return lpts;
      }
    }
    const x0 = cov.bx0[regionId]!;
    const x1 = cov.bx1[regionId]!;
    const y0 = cov.by0[regionId]!;
    const y1 = cov.by1[regionId]!;
    const pts: { x: number; y: number }[] = [];
    let right = true;
    for (let y = y0 + Math.min(2, (y1 - y0) >> 1); y <= y1; y += 4) {
      let row: number[] = [];
      for (let x = x0; x <= x1; x += 4) if (cov.map[y * PAGE_W + x] === regionId) row.push(x);
      if (row.length === 0) {
        for (let x = x0; x <= x1; x++) if (cov.map[y * PAGE_W + x] === regionId) row.push(x);
        if (row.length > 2) row = [row[0]!, row[row.length - 1]!];
      }
      if (!right) row.reverse();
      for (const x of row) pts.push({ x: x + 0.5, y: y + 0.5 });
      right = !right;
    }
    if (pts.length === 0) {
      const idx = cov.pixels[cov.offsets[regionId]!]!;
      pts.push({ x: (idx % PAGE_W) + 0.5, y: Math.floor(idx / PAGE_W) + 0.5 });
    }
    return pts;
  }
}

export function createSimulation(): SimulationPort {
  return new Simulation();
}
