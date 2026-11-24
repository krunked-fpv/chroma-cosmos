/**
 * Simulation: O(1) coverage, Smart Touch-Lock painting, 4-stage awakening, Auto-Bloom,
 * Pigment-Driven Causality, actors, relics, snapshots. Deterministic; driven only by
 * gesture()/hover()/update(dt). No timers of any kind.
 */
import {
  BRUSH_RADIUS_PX,
  CANONICAL_REGIONS,
  GEM_REWARDS,
  KALEIDOSCOPE_PREFILL,
  KALEIDOSCOPE_TARGETS,
  MAX_STAMPS_PER_BATCH,
  PAGE_H,
  PAGE_PIXELS,
  PAGE_W,
  REGION_FLAG,
  REGION_STATE_BYTES,
  REGION_STATE_ROW1_OFFSET,
  RIPPLE_MS,
  STAGE_MIN,
  STAMP_SPACING,
  UV_FLASHLIGHT_RADIUS,
} from '../contracts';
import type {
  BrushId,
  CausalityKind,
  ChapterId,
  CompiledPage,
  GestureEvent,
  GpuStamp,
  GpuStampBatch,
  PagePath,
  RegionKind,
  RunContext,
  SimEvent,
  SimView,
  SimulationPort,
  StoryPageSnapshot,
  ToolState,
} from '../contracts';
import { ActorSystem } from './actors';
import type { ActorHost } from './actors';
import { matchCausality } from './causality';
import { Coverage } from './coverage';
import { EffectPool } from './effects';
import type { EffectRT } from './effects';
import { clamp, mulberry32 } from './util';

const SPONGE_KINDS: readonly RegionKind[] = ['star', 'asteroid', 'cloud', 'comet'];
const ZOOMIE_FILL = 0.5;
const GOLD = 11;
const HOLO_FOIL = 2;
const MIRAGE_RANGE = 260;

function normMat(m: number): number {
  return Number.isInteger(m) && m >= 1 && m <= 12 ? m : 1;
}

interface Gesture {
  pointerId: number;
  mode: 'paint' | 'doodle' | 'poke' | 'none';
  lock: number;
  radius: number;
  mat: number;
  allow: Uint8Array;
  allowIds: number[];
  allowKey: string;
  nbr: Uint8Array | null;
  sponge: boolean;
  lastX: number;
  lastY: number;
  carry: number;
  lastT: number;
  speed: number;
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

export class Simulation implements SimulationPort, ActorHost {
  readonly effects = new EffectPool();
  paths: PagePath[] = [];

  private page: CompiledPage | null = null;
  private ctx: RunContext = { seed: 0, chapterIndex: 0, brushes: ['standard'], relics: [] };
  private cov: Coverage | null = null;
  private actors: ActorSystem | null = null;
  private tool: ToolState = { materialId: 1, brush: 'standard', doodle: false };

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
  private sparkles: { x: number; y: number }[] = [];
  private sparkDirty = true;

  private hoverPt: { x: number; y: number } | null = null;
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
  collect(e: EffectRT): void {
    if (!e.pickup) return;
    this.emit({ type: 'gems', amount: e.pickup.gems, reason: e.pickup.reason });
    this.effects.remove(e);
    this.effects.spawn('starBurst', e.x, e.y, { durMs: 500 });
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
    if (id >= 1 && id <= 211) return this.colourableBase[id] === 1;
    if (id >= 234 && id <= 254) return this.ghostRevealed[id] === 1 && this.cov!.total[id]! > 0;
    return false;
  }

  private hasRelic(r: RunContext['relics'][number]): boolean {
    return this.ctx.relics.includes(r);
  }

  // ------------------------------------------------------------------ loading
  loadPage(p: CompiledPage, ctx: RunContext): void {
    this.page = p;
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
    this.lastPtr = null;
    this.resetFlags();

    this.coreSet = new Set(p.coreRegionIds.filter((id) => cov.total[id]! > 0));
    this.coreTotal = this.coreSet.size;
    this.ghostIds = [];
    for (let id = 0; id < 256; id++) {
      const meta = p.regions[id];
      const canon = CANONICAL_REGIONS.find((c) => c.id === id);
      this.kinds[id] = meta?.kind ?? canon?.kind ?? (id >= 212 && id <= 233 ? 'system' : id >= 234 && id <= 254 ? 'ghost' : 'prop');
      const total = cov.total[id]!;
      if (id >= 1 && id <= 211 && total > 0 && !meta?.coverageExcluded) this.colourableBase[id] = 1;
      if (id >= 234 && id <= 254 && total > 0) this.ghostIds.push(id);
      if (total > 0 && id !== 0 && id !== 255) {
        const c = this.centroid(id);
        this.originX[id] = c.x;
        this.originY[id] = c.y;
      }
    }
    this.actors = new ActorSystem(this, p.actors, p.seed);

    for (const pc of p.preColored ?? []) {
      if (cov.total[pc.id]! === 0) continue;
      this.silentComplete(pc.id, normMat(pc.materialId));
    }
    cov.takeTouched();
    this.actors.refreshStatus(this.stageOf, this.bloomed, cov.total);
    this.recomputeCore();
    this.syncAll();
  }

  private resetFlags(): void {
    this.regionState.fill(0);
    this.stageOf.fill(0);
    this.bloomed.fill(0);
    this.bloomT.fill(0);
    this.ghostRevealed.fill(0);
    this.forcedWiggle.fill(0);
    this.colourableBase.fill(0);
    this.originX.fill(0);
    this.originY.fill(0);
    this.bloomQueue = [];
    this.rippling = [];
    this.pageComplete = false;
    this.prismFired = false;
    this.coreAwake = 0;
    this.sparkDirty = true;
  }

  private recomputeCore(): void {
    let n = 0;
    for (const id of this.coreSet) if (this.bloomed[id]) n++;
    this.coreAwake = n;
    this.pageComplete = this.coreTotal > 0 && n === this.coreTotal;
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

  setTool(t: ToolState): void {
    this.tool = { materialId: t.materialId, brush: t.brush, doodle: t.doodle };
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

  private snapToNearby(x: number, y: number): number {
    const cov = this.cov!;
    const px = clamp(Math.floor(x), 0, PAGE_W - 1);
    const py = clamp(Math.floor(y), 0, PAGE_H - 1);
    // 3x3 nearest neighbour first, then nearest colourable within radius 3
    for (const stage of [1, 3]) {
      for (const o of SNAP_OFFSETS) {
        if (Math.abs(o.dx) > stage || Math.abs(o.dy) > stage) continue;
        const xx = px + o.dx;
        const yy = py + o.dy;
        if (xx < 0 || yy < 0 || xx >= PAGE_W || yy >= PAGE_H) continue;
        const id = cov.map[yy * PAGE_W + xx]!;
        if (id !== 0 && this.colourable(id)) return id;
      }
    }
    return 0;
  }

  private newGesture(e: GestureEvent, mode: Gesture['mode'], lock: number): Gesture {
    const brush = this.tool.brush;
    return {
      pointerId: e.pointerId,
      mode,
      lock,
      radius: BRUSH_RADIUS_PX[brush] ?? 6,
      mat: normMat(this.tool.materialId),
      allow: new Uint8Array(256),
      allowIds: [],
      allowKey: '',
      nbr: null,
      sponge: brush === 'supernovaSponge',
      lastX: e.x,
      lastY: e.y,
      carry: 0,
      lastT: e.timeMs,
      speed: 0,
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
    const rid = this.regionAt(x, y);
    const actor = this.actors!.hit(x, y, rid);
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
    if (rid === 0) {
      lock = this.snapToNearby(x, y);
      if (lock > 0) mode = 'paint';
    } else if (rid === 255) {
      if (this.tool.doodle) mode = 'doodle';
    } else if (this.colourable(rid)) {
      lock = rid;
      mode = 'paint';
    }
    const g = this.newGesture(e, mode, lock);
    this.g = g;
    if (mode === 'none') return;

    if (mode === 'doodle') {
      g.allow[255] = 1;
      g.allowIds = [255];
      g.allowKey = 'doodle';
    } else {
      g.allow[lock] = 1;
      g.allowIds = [lock];
      if (this.tool.brush === 'twinTail') {
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
      }
      g.allowKey = `p${g.allowIds.join(',')}`;
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
    const s: GpuStamp = { x, y, radius: g.radius, materialId: g.mat, dx, dy, strength: 1 };
    if (g.mode === 'doodle') {
      this.pushStamp(g.allowKey, g.allowIds, s);
      return;
    }
    let allow = g.allow;
    let ids = g.allowIds;
    let key = g.allowKey;
    if (g.sponge) {
      const reach = new Uint8Array(256);
      cov.idsInDisc(x, y, g.radius, reach);
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
    cov.stampDisc(x, y, g.radius, g.mat, allow, g.nbr);
    this.pushStamp(key, ids, s);
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
      return;
    }
    this.hoverPt = { x: p.x, y: p.y };
    this.lastPtr = this.hoverPt;
    if (this.hasRelic('uvFlashlight')) {
      for (const id of this.ghostIds) {
        if (this.ghostRevealed[id]) continue;
        if (this.cov.regionWithin(id, p.x, p.y, UV_FLASHLIGHT_RADIUS)) {
          this.ghostRevealed[id] = 1;
          this.emit({ type: 'relic', relic: 'uvFlashlight' });
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

  private afterPaint(id: number): void {
    if (id === 0 || id === 255 || this.bloomed[id]) {
      this.syncRegion(id);
      return;
    }
    const cov = this.cov!;
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

  /** Flushes touched regions and the bloom queue until stable. */
  private settle(): void {
    const cov = this.cov!;
    for (let guard = 0; guard < 4096; guard++) {
      const touched = cov.takeTouched();
      for (const id of touched) this.afterPaint(id);
      if (this.bloomQueue.length === 0 && touched.length === 0) break;
      while (this.bloomQueue.length > 0) {
        const b = this.bloomQueue.shift()!;
        this.bloomRegion(b.id, b.x, b.y);
      }
    }
  }

  // ------------------------------------------------------------------ Auto-Bloom
  private bloomRegion(id: number, ox: number, oy: number): void {
    if (this.bloomed[id]) return;
    const cov = this.cov!;
    const fallbackMat = normMat(this.tool.materialId);
    cov.fillRemaining(id, cov.regionMat[id] || fallbackMat);
    const mat = cov.regionMat[id] || fallbackMat;
    const kind = this.kindOf(id);
    const c = this.centroid(id);
    this.bloomed[id] = 1;
    this.bloomT[id] = 0;
    this.stageOf[id] = 4;
    this.originX[id] = ox;
    this.originY[id] = oy;
    this.rippling.push(id);
    this.sparkDirty = true;

    this.emit({ type: 'stage', regionId: id, kind, stage: 4, materialId: mat });
    this.emit({ type: 'autoBloom', regionId: id, kind, materialId: mat, x: ox, y: oy });
    this.effects.spawn('chromaticRipple', ox, oy, { durMs: RIPPLE_MS, materialId: mat });
    this.effects.spawn('starBurst', c.x, c.y, { durMs: 900, materialId: mat });

    // gems, exactly once per region
    const actorRegion = this.page!.regions[id]?.actorInstanceId !== undefined || this.actors!.list.some((a) => a.regionIds.includes(id));
    this.emit(
      actorRegion
        ? { type: 'gems', amount: GEM_REWARDS.actorBloom, reason: 'actorBloom' }
        : { type: 'gems', amount: GEM_REWARDS.regionBloom, reason: 'regionBloom' },
    );

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
    if (!this.pageComplete && this.coreTotal > 0 && this.coreAwake === this.coreTotal) {
      this.pageComplete = true;
      this.emit({ type: 'gems', amount: GEM_REWARDS.pageComplete, reason: 'pageComplete' });
      this.emit({ type: 'pageComplete' });
      this.effects.spawn('constellationFireworks', PAGE_W / 2, PAGE_H / 3, { durMs: 4000 });
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

  private bonusFill(id: number, mat: number, fraction: number): void {
    const cov = this.cov!;
    if (this.bloomed[id] || cov.total[id]! === 0) return;
    const c = this.centroid(id);
    const radius = cov.fillFraction(id, c.x, c.y, mat, fraction);
    this.pushStamp(`b${id}`, [id], { x: c.x, y: c.y, radius, materialId: mat, dx: 0, dy: 0, strength: 1 });
  }

  private zoomie(id: number): void {
    const list = this.candidates(id, true);
    const target = list[0] ?? this.candidates(id, false)[0];
    this.emit({ type: 'relic', relic: 'zoomiePaw' });
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
    this.emit({ type: 'relic', relic: 'kaleidoSharpener' });
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

  private distinctBloomMaterials(): number {
    const seen = new Set<number>();
    for (let id = 1; id < 255; id++) if (this.bloomed[id]) seen.add(this.cov!.regionMat[id]!);
    seen.delete(0);
    return seen.size;
  }

  private prism(): void {
    if (this.distinctBloomMaterials() < 3) return;
    this.prismFired = true;
    this.emit({ type: 'relic', relic: 'prismRibbon' });
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

  // ------------------------------------------------------------------ update
  update(dtMs: number, _timeMs: number): void {
    if (!this.page || !this.cov) return;
    const dt = clamp(Number.isFinite(dtMs) ? dtMs : 0, 0, 250);
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
    this.actors!.update(dt);
    this.actors!.refreshStatus(this.stageOf, this.bloomed, this.cov.total);
    this.settle();
    if (this.sparkDirty) this.rebuildSparkles();
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
    if (this.ghostRevealed[id]) flags |= REGION_FLAG.ghostRevealed;
    const st = this.stageOf[id]!;
    if ((!bl && st >= 1 && st <= 3) || this.forcedWiggle[id]) flags |= REGION_FLAG.wiggle;
    if (bl && this.bloomT[id]! < 300) flags |= REGION_FLAG.flash;
    if (id >= 234 && id <= 254 && !this.ghostRevealed[id]) flags |= REGION_FLAG.hidden;
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
    ];
    for (const [i, v] of vals) {
      if (rs[i] !== v) {
        rs[i] = v;
        this.dirty = true;
      }
    }
  }

  view(): SimView {
    const dirty = this.dirty;
    this.dirty = false;
    const uv = this.hasRelic('uvFlashlight') && this.hoverPt ? { x: this.hoverPt.x, y: this.hoverPt.y, r: UV_FLASHLIGHT_RADIUS } : null;
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
    this.bloomQueue = [];
    this.rippling = [];
    this.stageOf.fill(0);
    this.bloomed.fill(0);
    this.bloomT.fill(0);
    this.ghostRevealed.fill(0);
    this.forcedWiggle.fill(0);
    this.pageComplete = false;
    this.prismFired = false;
    this.actors = new ActorSystem(this, p.actors, p.seed);

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
      if (id >= 234 && cov.painted[id]! > 0) this.ghostRevealed[id] = 1;
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
    this.actors.refreshStatus(this.stageOf, this.bloomed, cov.total);
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
