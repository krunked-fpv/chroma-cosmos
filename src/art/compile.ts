/** compilePage: scene generator -> CompiledPage (region maps, actors, metas, paths, Hero Quests). */
import type {
  ActorKind,
  ActorSpawn,
  CompiledPage,
  HeroQuestId,
  HeroStoryQuestSpec,
  SpriteFrame,
  SpriteLibrary,
  StoryMilestone,
  UiSpriteId,
} from '../contracts/art';
import { PAGE_H, PAGE_W } from '../contracts/constants';
import { CANONICAL_REGIONS, SYSTEM_REGIONS, type RegionKind, type RegionMeta } from '../contracts/regions';
import type { SceneId } from '../contracts/roguelike';
import type { WardrobeState } from '../contracts/progression';
import { CHAPTERS } from '../contracts/roguelike';
import {
  ALL_CHAPTERS,
  HUB_TO_UNIVERSE,
  SCENE_TO_UNIVERSE,
  UNIVERSE_BY_ID,
  type UniverseId,
} from '../contracts/universes';
import { buildScene, CANON_LABEL, inkPass, isColourable, isGhostId, isSystemId, type PlacedActor, type RegionDef, type SceneBuild } from '../scenes';
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
  butterfly: 'system',
  bubble: 'system',
};

const QUEST_THUMB: Record<HeroQuestId, UiSpriteId> = {
  violet: 'quest_violet',
  lumi: 'quest_lumi',
  nova: 'quest_nova',
  planet: 'quest_planet',
  cloud: 'quest_cloud',
  rocket: 'quest_rocket',
  milkshake: 'quest_milkshake',
  asteroid: 'quest_asteroid',
  moonCat: 'quest_moonCat',
  suns: 'quest_suns',
  boba: 'quest_boba',
  whale: 'quest_whale',
  heart: 'quest_heart',
  comet: 'quest_comet',
  shell: 'quest_shell',
  jelly: 'quest_jelly',
  cake: 'quest_cake',
  mushroom: 'quest_mushroom',
  crane: 'quest_crane',
  dino: 'quest_dino',
  igloo: 'quest_igloo',
  airship: 'quest_airship',
  koi: 'quest_koi',
  piano: 'quest_piano',
  geode: 'quest_geode',
  pyramid: 'quest_pyramid',
  book: 'quest_book',
  tent: 'quest_tent',
  teacup: 'quest_teacup',
  pumpkin: 'quest_pumpkin',
  sunflower: 'quest_sunflower',
  arcade: 'quest_arcade',
  dragon: 'quest_dragon',
  lotus: 'quest_lotus',
  portal: 'quest_portal',
  lantern: 'quest_lantern',
};

const FALLBACK_QUEST_POOL: ReadonlyArray<readonly [HeroQuestId, string]> = [
  ['portal', 'Star Portal'],
  ['lantern', 'Sky Lantern'],
  ['cloud', 'Dream Clouds'],
  ['planet', 'Star Planet'],
  ['suns', 'Bright Stars'],
  ['comet', 'Star Comet'],
  ['heart', 'Star Heart'],
  ['geode', 'Prism Gem'],
  ['lotus', 'Gold Lotus'],
  ['book', 'Story Tome'],
  ['shell', 'Pearl Shell'],
  ['violet', 'Violet'],
  ['lumi', 'Lumi'],
  ['nova', 'Nova'],
];

function clampQuestLabel(raw: string, fallback: string): string {
  const words = raw.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return fallback;
  return words.slice(0, 2).join(' ');
}

function clampCoord(v: number, max: number): number {
  return Math.max(0, Math.min(max - 1, Math.round(v)));
}

function buildHeroQuests(
  sceneId: SceneId,
  regions: readonly (RegionMeta | undefined)[],
  spawns: readonly ActorSpawn[],
  customQuests: SceneBuild['heroQuests'],
  totals: Uint32Array,
): HeroStoryQuestSpec[] {
  const used = new Set<number>();
  const usedQuestIds = new Set<HeroQuestId>();
  const out: HeroStoryQuestSpec[] = [];

  const isValid = (id: number): boolean => {
    const m = regions[id];
    return Boolean(m && !m.coverageExcluded && id >= 1 && id <= 199);
  };

  const findRegions = (pred: (m: RegionMeta) => boolean): number[] => {
    const found: number[] = [];
    for (let id = 1; id <= 199; id++) {
      const m = regions[id];
      if (!m || m.coverageExcluded) continue;
      if (pred(m)) found.push(id);
    }
    return found;
  };

  const actorRegionIds = (kind: ActorKind): number[] => {
    const sp = spawns.find((a) => a.kind === kind);
    return sp ? sp.regionIds : [];
  };

  const addQuest = (questId: HeroQuestId, label: string, candidateIds: Iterable<number>): boolean => {
    if (usedQuestIds.has(questId)) return false;
    const picked: number[] = [];
    const seenLocal = new Set<number>();
    for (const id of candidateIds) {
      if (seenLocal.has(id) || used.has(id) || !isValid(id)) continue;
      seenLocal.add(id);
      picked.push(id);
    }
    if (picked.length === 0) return false;
    picked.sort((a, b) => a - b);
    for (const id of picked) used.add(id);
    usedQuestIds.add(questId);

    let sx = 0;
    let sy = 0;
    let count = 0;
    for (const id of picked) {
      const m = regions[id];
      if (!m) continue;
      sx += m.centroid.x;
      sy += m.centroid.y;
      count++;
    }
    const first = regions[picked[0] as number];
    const centroid =
      count > 0
        ? { x: clampCoord(sx / count, PAGE_W), y: clampCoord(sy / count, PAGE_H) }
        : first
          ? { x: clampCoord(first.centroid.x, PAGE_W), y: clampCoord(first.centroid.y, PAGE_H) }
          : { x: Math.floor(PAGE_W / 2), y: Math.floor(PAGE_H / 2) };

    out.push({
      questId,
      label,
      thumbnailSpriteId: QUEST_THUMB[questId],
      regionIds: picked,
      centroid,
    });
    return true;
  };

  const ensureMinimumQuests = (minCount: number): void => {
    if (out.length >= minCount) return;
    const remaining = findRegions((m) => !used.has(m.id)).sort((a, b) => (totals[b] ?? 0) - (totals[a] ?? 0));
    let cursor = 0;
    for (const [fallbackId, fallbackLabel] of FALLBACK_QUEST_POOL) {
      if (out.length >= minCount || cursor >= remaining.length) break;
      if (usedQuestIds.has(fallbackId)) continue;
      const slotsLeft = minCount - out.length;
      const available = remaining.length - cursor;
      const take = available > slotsLeft ? Math.min(2, available - (slotsLeft - 1)) : 1;
      const chunk = remaining.slice(cursor, cursor + take);
      cursor += take;
      addQuest(fallbackId, fallbackLabel, chunk);
    }
  };

  // New multiverse scenes supply explicit composite Hero Quests directly on SceneCtx
  if (customQuests.length > 0) {
    for (const q of customQuests) {
      if (out.length >= 4) break;
      addQuest(q.questId, clampQuestLabel(q.label, q.questId), q.regionIds);
    }
    ensureMinimumQuests(3);
    return out;
  }

  switch (sceneId) {
    case 'rooftop':
      addQuest('violet', 'Violet', [1, 2, 3, 4]);
      addQuest('lumi', 'Lumi', [5, 6, 7, 8]);
      addQuest('nova', 'Nova', [9, 10, 11]);
      addQuest('rocket', 'Paper Rocket', [21, ...findRegions((m) => m.kind === 'rocket')]);
      break;

    case 'milkshakeNebula': {
      const c18 = regions[18]?.centroid;
      const msExtras = findRegions(
        (m) =>
          m.kind === 'milkshake' &&
          /^(whipped cream|striped straw|cherry|glass foot)$/i.test(m.label) &&
          (!c18 || Math.abs(m.centroid.x - c18.x) <= 100),
      );
      addQuest('violet', 'Violet', [1, 2, 3, 4]);
      addQuest('milkshake', 'Milkshake', [18, ...msExtras]);
      addQuest('planet', 'Ringed Planet', [12, 13]);
      addQuest('cloud', 'Cream Clouds', [14, 15]);
      break;
    }

    case 'asteroidGarden': {
      addQuest('lumi', 'Lumi', [5, 6, 7, 8]);
      addQuest('asteroid', 'Crystals', [
        20,
        ...findRegions((m) => m.kind === 'asteroid' && /crystal/i.test(m.label) && !/moon-cat|perch/i.test(m.label)),
      ]);
      addQuest('planet', 'Ringed Planet', [12, 13]);
      const addedCat = addQuest('moonCat', 'Moon-Cat', [
        17,
        ...actorRegionIds('moonCat'),
        ...findRegions((m) => /moon-cat|perch/i.test(m.label)),
      ]);
      if (!addedCat) addQuest('cloud', 'Space Clouds', [14, 15]);
      break;
    }

    case 'cheetahSavannah':
      addQuest('nova', 'Nova', [9, 10, 11]);
      addQuest('suns', 'Twin Suns', findRegions((m) => m.kind === 'star' && /sun/i.test(m.label)));
      addQuest('planet', 'Ringed Planet', [12, 13]);
      addQuest('cloud', 'Orion Clouds', [14, 15]);
      break;

    case 'saturnRings':
      addQuest('lumi', 'Lumi', [5, 6, 7, 8]);
      addQuest('planet', 'Saturn', [12, 13]);
      addQuest('cloud', 'Dream Clouds', [14, 15]);
      addQuest('comet', 'Star Comet', [16, ...actorRegionIds('comet')]);
      break;

    case 'bubbleTea':
      addQuest('violet', 'Violet', [1, 2, 3, 4]);
      addQuest(
        'boba',
        'Boba Cup',
        findRegions(
          (m) =>
            m.kind === 'milkshake' &&
            /^(giant boba straw|caramel swirl base|cosmic milk tea|domed bubble lid|cup rim collar)$/i.test(m.label),
        ),
      );
      addQuest('planet', 'Ringed Planet', [12, 13]);
      addQuest('moonCat', 'Moon-Cat', [17, ...actorRegionIds('moonCat')]);
      break;

    case 'whaleSea':
      addQuest('whale', 'Star Whale', [19, ...actorRegionIds('whale')]);
      addQuest('planet', 'Ringed Planet', [12, 13]);
      addQuest('cloud', 'Sea Clouds', [14, 15]);
      break;

    case 'heartOfUniverse':
      addQuest('heart', 'Star Heart', findRegions((m) => /cosmic heart core|inner heart petal/i.test(m.label)));
      addQuest('violet', 'Violet', [1, 2, 3, 4]);
      addQuest('lumi', 'Lumi', [5, 6, 7, 8]);
      addQuest('nova', 'Nova', [9, 10, 11]);
      break;

    case 'bedroomHub':
      addQuest('violet', 'Violet', [1, 2, 3, 4]);
      addQuest('lumi', 'Lumi', [5, 6, 7, 8]);
      addQuest('nova', 'Nova', [9, 10, 11]);
      addQuest('planet', 'Ringed Planet', [12, 13]);
      addQuest('suns', 'Star Garlands', findRegions((m) => m.kind === 'star'));
      break;

    default:
      addQuest('violet', 'Violet', [1, 2, 3, 4]);
      addQuest('lumi', 'Lumi', [5, 6, 7, 8]);
      addQuest('nova', 'Nova', [9, 10, 11]);
      ensureMinimumQuests(3);
      break;
  }

  return out;
}

function toStoryMilestones(quests: readonly HeroStoryQuestSpec[]): StoryMilestone[] {
  return quests.map((q) => ({
    id: q.questId,
    kind: q.questId,
    label: q.label,
    thumbnailSpriteId: q.thumbnailSpriteId,
    regionIds: [...q.regionIds],
    centroid: { x: q.centroid.x, y: q.centroid.y },
  }));
}

export function sceneTitle(id: SceneId): string {
  if (id === 'bedroomHub') return "Violet's Starlight Bedroom";
  const hubUniId = (HUB_TO_UNIVERSE as Partial<Record<SceneId, UniverseId>>)[id];
  if (hubUniId) return UNIVERSE_BY_ID[hubUniId].hubTitle;
  return ALL_CHAPTERS.find((c) => c.id === id)?.title ?? CHAPTERS.find((c) => c.id === id)?.title ?? id;
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
      if (a > 199) continue;
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
        if (b !== a && b >= 1 && b <= 199) adj[a * 256 + b] = 1;
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
    if (a <= 199) for (let b = 1; b <= 199; b++) if (adj[a * 256 + b] || adj[b * 256 + a]) neighbors.push(b);
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

  const heroQuests = buildHeroQuests(sceneId, regions, spawns, build.heroQuests, totals);
  const storyMilestones = toStoryMilestones(heroQuests);
  const resolvedUniverseId = build.universeId ?? SCENE_TO_UNIVERSE[sceneId];
  const resolvedUniverse = UNIVERSE_BY_ID[resolvedUniverseId];
  const resolvedAmbient = build.ambient ?? resolvedUniverse.ambient;

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
    heroQuests,
    storyMilestones,
    actors: spawns,
    paths: build.paths,
    focal: build.focal,
    sky: build.sky,
    universeId: resolvedUniverseId,
    ambient: resolvedAmbient,
  };
  if (sceneId in HUB_TO_UNIVERSE) page.preColored = build.preColored.filter((p) => (totals[p.id] as number) > 0);
  void isColourable;
  return page;
}
