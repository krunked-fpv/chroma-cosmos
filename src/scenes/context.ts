/** Scene-building context: raster + region-id allocation + actors + paths. Deterministic. */
import { CANONICAL_REGIONS, type RegionKind } from '../contracts/regions';
import type { ActorKind, AnimName, HeroQuestId, PagePath } from '../contracts/art';
import type { MaterialId } from '../contracts/materials';
import type { SceneId } from '../contracts/roguelike';
import type { UniverseAmbientKind, UniverseId } from '../contracts/universes';
import { H, Raster, W, type Pt } from './raster';

export interface Rng {
  next(): number;
  /** [a, b) */
  range(a: number, b: number): number;
  /** integer in [a, b] */
  int(a: number, b: number): number;
  pick<T>(arr: readonly T[]): T;
  chance(p: number): boolean;
}

export function hashString(s: string): number {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619) >>> 0;
  }
  return h >>> 0;
}

export function mulberry32(seed: number): Rng {
  let a = seed >>> 0;
  const next = (): number => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  return {
    next,
    range: (a0, b0) => a0 + next() * (b0 - a0),
    int: (a0, b0) => a0 + Math.floor(next() * (b0 - a0 + 1)),
    pick: (arr) => arr[Math.floor(next() * arr.length)] as never,
    chance: (p) => next() < p,
  };
}

export interface RegionDef {
  id: number;
  key: string;
  kind: RegionKind;
  label: string;
}

export interface PlacedActor {
  kind: ActorKind;
  x: number;
  y: number;
  facing: 1 | -1;
  anim: AnimName;
  frame: number;
  pathIndex?: number;
}

export interface HeroQuestInput {
  questId: HeroQuestId;
  label: string;
  regionIds: number[];
}

export interface SceneBuild {
  sceneId: SceneId;
  title: string;
  raster: Raster;
  defs: Map<number, RegionDef>;
  actors: PlacedActor[];
  paths: PagePath[];
  focal: { x: number; y: number };
  sky: { top: string; bottom: string; mist: string };
  preColored: Array<{ id: number; materialId: MaterialId }>;
  heroQuests: HeroQuestInput[];
  universeId?: UniverseId;
  ambient?: UniverseAmbientKind;
  /** allocate one more dynamic region id (used by the compiler when duplicate actors need remapped ids) */
  alloc: (kind: RegionKind, label: string) => number;
}

export const CANON_LABEL: Record<number, string> = {
  1: "Violet's Face",
  2: "Violet's Sandy Hair",
  3: "Violet's Pajama Suit",
  4: "Starlight Helmet",
  5: 'Lumi',
  6: "Lumi's Aurora Mane",
  7: "Lumi's Spiral Horn",
  8: "Lumi's Tail",
  9: 'Nova',
  10: "Nova's Spots",
  11: "Nova's Tail",
  12: 'Ringed Planet',
  13: 'Planet Rings',
  14: 'Fluffy Cloud',
  15: 'Dreamy Cloud',
  16: 'Rainbow Comet',
  17: 'Sleepy Moon-Cat',
  18: 'Cosmic Milkshake',
  19: 'Star Whale',
  20: 'Crystal Asteroid',
  21: 'Paper Rocket',
};

export class SceneCtx {
  readonly r = new Raster();
  readonly rng: Rng;
  readonly sceneId: SceneId;
  readonly seed: number;
  readonly defs = new Map<number, RegionDef>();
  readonly actors: PlacedActor[] = [];
  readonly paths: PagePath[] = [];
  readonly preColored: Array<{ id: number; materialId: MaterialId }> = [];
  readonly heroQuests: HeroQuestInput[] = [];
  universeId?: UniverseId;
  ambient?: UniverseAmbientKind;
  title = '';
  focal = { x: W / 2, y: H / 2 };
  sky = { top: '#1b1445', bottom: '#4a2f7a', mist: '#6b5b8a' };
  private nextDyn = 32;
  private nextGhost = 234;

  constructor(sceneId: SceneId, seed: number) {
    this.sceneId = sceneId;
    this.seed = seed;
    this.rng = mulberry32((seed * 2654435761) ^ hashString(sceneId));
  }

  /** register / fetch a canonical region (1..31). Returns the id. */
  canon(id: number, label?: string, kind?: RegionKind): number {
    const c = CANONICAL_REGIONS.find((q) => q.id === id);
    this.defs.set(id, {
      id,
      key: c ? c.key : `canon_${id}`,
      kind: kind ?? (c ? c.kind : 'prop'),
      label: label ?? CANON_LABEL[id] ?? `Region ${id}`,
    });
    return id;
  }

  /** allocate a dynamic colourable id 32..199 */
  dyn(kind: RegionKind, label: string): number {
    if (this.nextDyn > 199) throw new Error('dynamic region ids exhausted');
    const id = this.nextDyn++;
    this.defs.set(id, { id, key: `dyn_${id}`, kind, label });
    return id;
  }

  /** allocate a ghost id 234..254 (hidden constellation creature) */
  ghost(label: string): number {
    if (this.nextGhost > 254) throw new Error('ghost ids exhausted');
    const id = this.nextGhost++;
    this.defs.set(id, { id, key: `ghost_${id}`, kind: 'ghost', label });
    return id;
  }

  dynCount(): number {
    return this.nextDyn - 32;
  }

  actor(kind: ActorKind, x: number, y: number, o: { facing?: 1 | -1; anim?: AnimName; frame?: number; pathIndex?: number } = {}): PlacedActor {
    const a: PlacedActor = { kind, x: Math.round(x), y: Math.round(y), facing: o.facing ?? 1, anim: o.anim ?? 'idle', frame: o.frame ?? 0 };
    if (o.pathIndex !== undefined) a.pathIndex = o.pathIndex;
    this.actors.push(a);
    return a;
  }

  addPath(role: PagePath['role'], pts: readonly Pt[], closed: boolean): number {
    this.paths.push({ role, closed, points: pts.map(([x, y]) => ({ x: Math.round(x), y: Math.round(y) })) });
    return this.paths.length - 1;
  }

  ellipsePath(role: PagePath['role'], cx: number, cy: number, rx: number, ry: number, n = 24, rot = 0): number {
    const pts: Pt[] = [];
    const c = Math.cos(rot);
    const s = Math.sin(rot);
    for (let i = 0; i < n; i++) {
      const t = (i / n) * Math.PI * 2;
      const ux = Math.cos(t) * rx;
      const uy = Math.sin(t) * ry;
      pts.push([cx + ux * c - uy * s, cy + ux * s + uy * c]);
    }
    return this.addPath(role, pts, true);
  }

  /** smooth wavy open path between two points */
  wavePath(role: PagePath['role'], x0: number, y0: number, x1: number, y1: number, amp: number, waves: number, n = 16): number {
    const pts: Pt[] = [];
    for (let i = 0; i < n; i++) {
      const t = i / (n - 1);
      pts.push([x0 + (x1 - x0) * t, y0 + (y1 - y0) * t + Math.sin(t * Math.PI * 2 * waves) * amp]);
    }
    return this.addPath(role, pts, false);
  }

  /** the bottom-margin flower-rain path every page carries */
  marginPath(y = 254): number {
    const pts: Pt[] = [];
    for (let i = 0; i < 12; i++) pts.push([24 + i * 40, y + (i % 2 ? 2 : -2)]);
    return this.addPath('margin', pts, false);
  }

  preColor(id: number, materialId: MaterialId): void {
    this.preColored.push({ id, materialId });
  }

  /** Register a composite Hero Story Quest (3..4 disjoint quests per chapter, label strictly <= 2 words). */
  heroQuest(questId: HeroQuestId, label: string, regionIds: number[]): void {
    this.heroQuests.push({ questId, label, regionIds: regionIds.slice() });
  }

  build(): SceneBuild {
    const out: SceneBuild = {
      sceneId: this.sceneId,
      title: this.title,
      raster: this.r,
      defs: this.defs,
      actors: this.actors,
      paths: this.paths,
      focal: this.focal,
      sky: this.sky,
      preColored: this.preColored,
      heroQuests: this.heroQuests,
      alloc: (kind, label) => this.dyn(kind, label),
    };
    if (this.universeId !== undefined) out.universeId = this.universeId;
    if (this.ambient !== undefined) out.ambient = this.ambient;
    return out;
  }
}
