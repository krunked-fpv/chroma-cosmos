/** compilePage: scene generator -> CompiledPage (region maps, actors, metas, paths). */
import type { ActorKind, ActorSpawn, CompiledPage, SpriteFrame, SpriteLibrary, StoryMilestone, StoryMilestoneKind } from '../contracts/art';
import { PAGE_H, PAGE_W } from '../contracts/constants';
import { CANONICAL_REGIONS, SYSTEM_REGIONS, type RegionKind, type RegionMeta } from '../contracts/regions';
import type { SceneId } from '../contracts/roguelike';
import type { WardrobeState } from '../contracts/progression';
import { CHAPTERS } from '../contracts/roguelike';
import { buildScene, CANON_LABEL, inkPass, isColourable, isGhostId, isSystemId, type PlacedActor, type RegionDef } from '../scenes';
import { buildSprites } from './sprites';

const KIND_OF_ACTOR: Record<ActorKind, RegionKind> = {
  violet: 'violet',
  lumi: 'lumi',
  nova: 'nova',
  moonCat: 'moonCat',
  comet: 'comet',
  whale: 'whale',
  gazelle: 'prop',
  cometCar: 'prop',
  flower: 'flora',
  gem: 'star',
};

const MILESTONE_SPECS: ReadonlyArray<{ kind: StoryMilestoneKind; label: string; ids: readonly number[] }> = [
  { kind: 'violet', label: 'Violet', ids: [1, 2, 3, 4] },
  { kind: 'lumi', label: 'Lumi', ids: [5, 6, 7, 8] },
  { kind: 'nova', label: 'Nova', ids: [9, 10, 11] },
  { kind: 'planet', label: 'Ringed Planet', ids: [12, 13] },
  { kind: 'cloud', label: 'Space Clouds', ids: [14, 15] },
];

function buildStoryMilestones(coreRegionIds: readonly number[], regions: readonly (RegionMeta | undefined)[]): StoryMilestone[] {
  const present = new Set<number>(coreRegionIds);
  const out: StoryMilestone[] = [];
  for (const spec of MILESTONE_SPECS) {
    const regionIds = spec.ids.filter((id) => present.has(id));
    if (regionIds.length === 0) continue;
    let sx = 0;
    let sy = 0;
    let count = 0;
    for (const id of regionIds) {
      const m = regions[id];
      if (!m) continue;
      sx += m.centroid.x;
      sy += m.centroid.y;
      count++;
    }
    const first = regions[regionIds[0] as number];
    const centroid =
      count > 0
        ? { x: Math.round(sx / count), y: Math.round(sy / count) }
        : first
          ? { x: first.centroid.x, y: first.centroid.y }
          : { x: Math.floor(PAGE_W / 2), y: Math.floor(PAGE_H / 2) };
    out.push({
      id: spec.kind,
      kind: spec.kind,
      label: spec.label,
      regionIds,
      centroid,
    });
  }
  return out;
}

export function sceneTitle(id: SceneId): string {
  if (id === 'bedroomHub') return "Violet's Starlight Bedroom";
  return CHAPTERS.find((c) => c.id === id)?.title ?? id;
}

function sheetIds(lib: SpriteLibrary, kind: ActorKind): number[] {
  const set = new Set<number>();
  const sheet = lib[kind];
  for (const anim of Object.values(sheet.anims)) {
    if (!anim) continue;
    for (const f of anim.frames) for (const v of f.pixels) if (v !== 255 && v !== 0 && !isSystemId(v)) set.add(v);
  }
  return [...set].sort((a, b) => a - b);
}

function frameOf(lib: SpriteLibrary, a: PlacedActor): SpriteFrame {
  const sheet = lib[a.kind];
  const anim = sheet.anims[a.anim] ?? Object.values(sheet.anims)[0];
  if (!anim) throw new Error(`no anims for ${a.kind}`);
  return anim.frames[a.frame % anim.frames.length] as SpriteFrame;
}

function prettyKey(k: string): string {
  return k.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

export function compile(sceneId: SceneId, seed: number, wardrobe: WardrobeState): CompiledPage {
  const build = buildScene(sceneId, seed);
  const lib = buildSprites(wardrobe);
  const r = build.raster;
  const defs = new Map<number, RegionDef>(build.defs);

  // 1) base map: scene with actors removed
  const base = inkPass(r.id, r.z);

  // 2) actors: resolve ids (native first, remapped dynamic ids for duplicates / collisions)
  const taken = new Set<number>(defs.keys());
  const spawns: ActorSpawn[] = [];
  const sprites: Array<{ frame: SpriteFrame; left: number; top: number; flip: boolean; remap?: Record<number, number>; slot: number }> = [];
  if (build.actors.length > 15) throw new Error('more than 15 actors');
  build.actors.forEach((a, n) => {
    const sheet = lib[a.kind];
    const frame = frameOf(lib, a);
    const ids = sheetIds(lib, a.kind);
    let remap: Record<number, number> | undefined;
    if (ids.some((v) => taken.has(v))) {
      remap = {};
      for (const v of ids) {
        const label = CANON_LABEL[v] ?? `${a.kind} part`;
        const nid = build.alloc(KIND_OF_ACTOR[a.kind], `${label}`);
        remap[v] = nid;
        taken.add(nid);
      }
    } else {
      for (const v of ids) {
        taken.add(v);
        if (!defs.has(v)) {
          const c = CANONICAL_REGIONS.find((q) => q.id === v);
          defs.set(v, { id: v, key: c ? c.key : `canon_${v}`, kind: c ? c.kind : KIND_OF_ACTOR[a.kind], label: CANON_LABEL[v] ?? `${a.kind} part ${v}` });
        }
      }
    }
    const left = a.facing === 1 ? a.x - sheet.anchorX : a.x - (frame.w - 1 - sheet.anchorX);
    const top = a.y - sheet.anchorY;
    const slot = n + 1;
    sprites.push({ frame, left, top, flip: a.facing === -1, remap, slot });
    const regionIds = ids.map((v) => (remap ? (remap[v] as number) : v));
    const sp: ActorSpawn = {
      instanceId: `${a.kind}-${n + 1}`,
      kind: a.kind,
      slot,
      x: a.x,
      y: a.y,
      facing: a.facing,
      regionIds,
    };
    if (remap) sp.remap = remap;
    if (a.pathIndex !== undefined) sp.pathIndex = a.pathIndex;
    spawns.push(sp);
  });
  // actors may live on the raster too, so add their dynamic defs after build.alloc registered them
  for (const [id, d] of build.defs) defs.set(id, d);

  // 3) composite: base + actor sprites, then re-run the ink pass for safety (idempotent unless actors overlap)
  const comp = new Uint8Array(base);
  const compZ = new Uint32Array(r.z);
  const slotMap = new Uint8Array(PAGE_W * PAGE_H);
  let zc = 0;
  for (const z of compZ) if (z > zc) zc = z;
  for (const s of sprites) {
    zc++;
    for (let y = 0; y < s.frame.h; y++) {
      for (let x = 0; x < s.frame.w; x++) {
        let v = s.frame.pixels[y * s.frame.w + (s.flip ? s.frame.w - 1 - x : x)] as number;
        if (v === 255) continue;
        if (s.remap) {
          const m = s.remap[v];
          if (m !== undefined) v = m;
        }
        const px = s.left + x;
        const py = s.top + y;
        if (px < 0 || py < 0 || px >= PAGE_W || py >= PAGE_H) continue;
        const i = py * PAGE_W + px;
        comp[i] = v;
        compZ[i] = zc;
        slotMap[i] = s.slot;
      }
    }
  }
  const map = inkPass(comp, compZ);
  // pixels changed vs the base but not covered by an actor sprite are attributed to the nearest actor slot
  for (let y = 0; y < PAGE_H; y++) {
    for (let x = 0; x < PAGE_W; x++) {
      const i = y * PAGE_W + x;
      if (slotMap[i] === 0 && map[i] !== base[i]) {
        let s = 0;
        for (let d = 1; d <= 2 && !s; d++) {
          for (const [dx, dy] of [[d, 0], [-d, 0], [0, d], [0, -d]] as const) {
            const nx = x + dx;
            const ny = y + dy;
            if (nx < 0 || ny < 0 || nx >= PAGE_W || ny >= PAGE_H) continue;
            const v = slotMap[ny * PAGE_W + nx] as number;
            if (v) {
              s = v;
              break;
            }
          }
        }
        if (s) slotMap[i] = s;
        else map[i] = base[i] as number;
      }
    }
  }

  // 4) totals + metas
  const totals = new Uint32Array(256);
  const sumX = new Float64Array(256);
  const sumY = new Float64Array(256);
  const x0 = new Int32Array(256).fill(PAGE_W);
  const y0 = new Int32Array(256).fill(PAGE_H);
  const x1 = new Int32Array(256).fill(-1);
  const y1 = new Int32Array(256).fill(-1);
  const adj = new Uint8Array(256 * 256);
  for (let y = 0; y < PAGE_H; y++) {
    for (let x = 0; x < PAGE_W; x++) {
      const i = y * PAGE_W + x;
      const a = map[i] as number;
      if (a === 0 || a === 255) continue;
      totals[a] = (totals[a] as number) + 1;
      sumX[a] = (sumX[a] as number) + x;
      sumY[a] = (sumY[a] as number) + y;
      if (x < (x0[a] as number)) x0[a] = x;
      if (x > (x1[a] as number)) x1[a] = x;
      if (y < (y0[a] as number)) y0[a] = y;
      if (y > (y1[a] as number)) y1[a] = y;
      if (a > 211) continue;
      const dirs: Array<[number, number]> = [[1, 0], [-1, 0], [0, 1], [0, -1]];
      for (const [dx, dy] of dirs) {
        const nx = x + dx;
        const ny = y + dy;
        if (nx < 0 || ny < 0 || nx >= PAGE_W || ny >= PAGE_H) continue;
        let b = map[ny * PAGE_W + nx] as number;
        if (b === 0) {
          const mx = nx + dx;
          const my = ny + dy;
          if (mx < 0 || my < 0 || mx >= PAGE_W || my >= PAGE_H) continue;
          b = map[my * PAGE_W + mx] as number;
        }
        if (b !== a && b >= 1 && b <= 211) adj[a * 256 + b] = 1;
      }
    }
  }
  // centroid lies inside the region (nearest region pixel to the mean when the mean falls outside)
  const cx = new Int32Array(256);
  const cy = new Int32Array(256);
  const mxs = new Float64Array(256);
  const mys = new Float64Array(256);
  const need = new Set<number>();
  for (let a = 1; a < 255; a++) {
    const t = totals[a] as number;
    if (!t) continue;
    mxs[a] = (sumX[a] as number) / t;
    mys[a] = (sumY[a] as number) / t;
    cx[a] = Math.round(mxs[a] as number);
    cy[a] = Math.round(mys[a] as number);
    if (map[(cy[a] as number) * PAGE_W + (cx[a] as number)] !== a) need.add(a);
  }
  if (need.size) {
    const best = new Map<number, number>();
    for (let y = 0; y < PAGE_H; y++) {
      for (let x = 0; x < PAGE_W; x++) {
        const a = map[y * PAGE_W + x] as number;
        if (!need.has(a)) continue;
        const d = (x - (mxs[a] as number)) ** 2 + (y - (mys[a] as number)) ** 2;
        const bd = best.get(a);
        if (bd === undefined || d < bd) {
          best.set(a, d);
          cx[a] = x;
          cy[a] = y;
        }
      }
    }
    // second pass keeps the nearest pixel (x,y of the min) — the loop above overwrote cx/cy while scanning, so
    // recompute precisely from stored best coordinates
  }

  const instanceOf = new Map<number, string>();
  for (const sp of spawns) for (const id of sp.regionIds) if (!instanceOf.has(id)) instanceOf.set(id, sp.instanceId);
  const regions: (RegionMeta | undefined)[] = new Array(256).fill(undefined);
  const coreRegionIds: number[] = [];
  for (let a = 1; a < 255; a++) {
    if ((totals[a] as number) === 0) continue;
    let d = defs.get(a);
    if (!d) {
      if (isSystemId(a)) {
        const s = SYSTEM_REGIONS.find((q) => q.id === a);
        d = { id: a, key: s ? s.key : `system_${a}`, kind: 'system', label: s ? prettyKey(s.key) : `System ${a}` };
      } else {
        d = { id: a, key: `dyn_${a}`, kind: 'prop', label: `Region ${a}` };
      }
    }
    const canon = CANONICAL_REGIONS.find((q) => q.id === a);
    const core = canon ? canon.core : false;
    const ghost = isGhostId(a);
    const neighbors: number[] = [];
    if (a <= 211) for (let b = 1; b <= 211; b++) if (adj[a * 256 + b] || adj[b * 256 + a]) neighbors.push(b);
    const meta: RegionMeta = {
      id: a,
      key: d.key,
      kind: d.kind,
      label: d.label,
      centroid: { x: cx[a] as number, y: cy[a] as number },
      bbox: { x0: x0[a] as number, y0: y0[a] as number, x1: x1[a] as number, y1: y1[a] as number },
      neighbors,
      core,
      ghost,
      coverageExcluded: isSystemId(a) || ghost,
    };
    const inst = instanceOf.get(a);
    if (inst) meta.actorInstanceId = inst;
    regions[a] = meta;
    if (core) coreRegionIds.push(a);
  }

  const storyMilestones = buildStoryMilestones(coreRegionIds, regions);

  const page: CompiledPage = {
    sceneId,
    seed,
    title: build.title || sceneTitle(sceneId),
    regionMap: map,
    baseRegionMap: base,
    actorSlotMap: slotMap,
    regionTotalPixels: totals,
    regions,
    coreRegionIds,
    storyMilestones,
    actors: spawns,
    paths: build.paths,
    focal: build.focal,
    sky: build.sky,
  };
  if (sceneId === 'bedroomHub') page.preColored = build.preColored.filter((p) => (totals[p.id] as number) > 0);
  void isColourable;
  return page;
}
