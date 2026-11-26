// @vitest-environment jsdom
import 'fake-indexeddb/auto';
import { IDBFactory } from 'fake-indexeddb';
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createArt } from '../../../src/art';
import { createAudio, lydianFreq, semitoneRatio } from '../../../src/audio';
import {
  ALL_CHAPTERS,
  BADGE_ORDER,
  CHAPTER_TO_UNIVERSE,
  DRAFT_CARDS,
  HUB_SCENE_IDS,
  HUB_TO_UNIVERSE,
  MATERIALS,
  PAGE_H,
  PAGE_PIXELS,
  PAGE_W,
  TOTAL_UNIVERSES,
  UNIVERSES,
  UNIVERSE_BY_ID,
  UNIVERSE_ORDER,
  VAULT_LS_KEY,
  WARDROBE_ITEMS,
} from '../../../src/contracts';
import type {
  CompiledPage,
  FinaleMeta,
  HeroQuestId,
  HubState,
  IllustrationKind,
  PixelImage,
  SceneId,
  UiCallbacks,
  UiDeps,
  UiSpriteId,
  UniverseId,
  UniverseProgressItem,
  VaultBackends,
  VaultState,
  WardrobeState,
} from '../../../src/contracts';
import { createRunManager } from '../../../src/roguelike';
import { createUi } from '../../../src/ui';
import { createVault } from '../../../src/vault';
import { COOKIE_MAX_CHARS, buildCookieString, decodeCookieValue, encodeCookieValue, extractCookieValue } from '../../../src/vault/cookie';
import { BRUSH_ORDER, RELIC_ORDER } from '../../../src/vault/schema';
import { MockAudioContext, MockFilter } from '../audio/mockAudio';
import {
  FROZEN_SPRINT1_COOKIE_WITH_P,
  fakeCookie,
  fakeLocalStorage,
  makeBook,
  maxState,
  rawDelete,
  rawGetRecord,
  sprint1RawVault,
} from '../vault/helpers';

const NONE = Object.fromEntries(WARDROBE_ITEMS.map((w) => [w.id, false])) as WardrobeState;
const ALL = Object.fromEntries(WARDROBE_ITEMS.map((w) => [w.id, true])) as WardrobeState;
const TINY = new Set([7]);
const isColourable = (v: number): boolean => (v >= 1 && v <= 199) || (v >= 234 && v <= 254);

const NEW_QUEST_IDS: readonly HeroQuestId[] = [
  'shell', 'jelly', 'cake', 'mushroom', 'crane', 'dino', 'igloo', 'airship',
  'koi', 'piano', 'geode', 'pyramid', 'book', 'tent', 'teacup', 'pumpkin',
  'sunflower', 'arcade', 'dragon', 'lotus', 'portal', 'lantern',
];
const ALL_VALID_QUEST_IDS = new Set<HeroQuestId>([
  'violet', 'lumi', 'nova', 'planet', 'cloud',
  'rocket', 'milkshake', 'asteroid', 'moonCat', 'suns', 'boba', 'whale', 'heart', 'comet',
  ...NEW_QUEST_IDS,
]);
const NEW_TOOL_SPRITE_IDS: readonly UiSpriteId[] = ['tool_atlas', 'tool_lock', 'tool_check'];
const NEW_UI_SPRITE_IDS: readonly UiSpriteId[] = [
  ...NEW_TOOL_SPRITE_IDS,
  ...NEW_QUEST_IDS.map((q) => `quest_${q}` as UiSpriteId),
];

function bytesEqual(a: ArrayLike<number>, b: ArrayLike<number>): boolean {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) {
    if (a[i] !== b[i]) return false;
  }
  return true;
}

function inspectImage(img: PixelImage): { opaqueRatio: number; colorCount: number } {
  const total = img.width * img.height;
  let opaque = 0;
  const colors = new Set<number>();
  for (let i = 0; i < img.data.length; i += 4) {
    if (img.data[i + 3]! > 0) {
      opaque++;
      colors.add((img.data[i]! << 16) | (img.data[i + 1]! << 8) | img.data[i + 2]!);
    }
  }
  return { opaqueRatio: total > 0 ? opaque / total : 0, colorCount: colors.size };
}

function checkInkSeparation(map: Uint8Array, label: string): void {
  for (let y = 0; y < PAGE_H; y++) {
    const row = y * PAGE_W;
    for (let x = 0; x < PAGE_W; x++) {
      const a = map[row + x]!;
      if (!isColourable(a)) continue;
      if (x + 1 < PAGE_W) {
        const b = map[row + x + 1]!;
        if (isColourable(b) && b !== a) {
          throw new Error(`${label}: adjacent colourable regions ${a} and ${b} at (${x},${y})`);
        }
      }
      if (y + 1 < PAGE_H) {
        const b = map[row + PAGE_W + x]!;
        if (isColourable(b) && b !== a) {
          throw new Error(`${label}: vertical adjacent colourable regions ${a} and ${b} at (${x},${y})`);
        }
      }
    }
  }
}

function verifyCompiledScene(
  page: CompiledPage,
  opts: { isHub: boolean; isFinale: boolean; expectedUniverse: UniverseId },
): void {
  const tag = `${page.sceneId}@${page.seed}`;
  expect(page.regionMap.length, `${tag} regionMap length`).toBe(PAGE_PIXELS);
  expect(page.baseRegionMap.length, `${tag} baseRegionMap length`).toBe(PAGE_PIXELS);
  expect(page.actorSlotMap.length, `${tag} actorSlotMap length`).toBe(PAGE_PIXELS);
  expect(page.regionTotalPixels.length, `${tag} regionTotalPixels`).toBe(256);
  expect(page.regions.length, `${tag} regions`).toBe(256);
  expect(page.title.length, `${tag} title`).toBeGreaterThan(3);

  // Colourable count (1..199), ghost count (234..254), and minimum pixel thresholds
  let colourableCount = 0;
  let ghostCount = 0;
  for (let v = 1; v < 255; v++) {
    const m = page.regions[v];
    if (!m) continue;
    if (v <= 199) {
      colourableCount++;
      expect(m.coverageExcluded, `${tag} reg ${v} coverageExcluded`).toBe(false);
    } else if (v >= 234) {
      ghostCount++;
      expect(m.ghost, `${tag} ghost ${v}`).toBe(true);
      expect(m.coverageExcluded, `${tag} ghost ${v} excluded`).toBe(true);
    }
    if (m.kind !== 'system') {
      const minPx = TINY.has(v) ? 24 : 60;
      expect(page.regionTotalPixels[v]!, `${tag} reg ${v} (${m.label}) px`).toBeGreaterThanOrEqual(minPx);
    }
  }

  if (opts.isFinale) {
    expect(colourableCount, `${tag} finale region count`).toBeGreaterThanOrEqual(50);
    expect(colourableCount, `${tag} finale region count`).toBeLessThanOrEqual(70);
  } else {
    expect(colourableCount, `${tag} region count`).toBeGreaterThanOrEqual(25);
    expect(colourableCount, `${tag} region count`).toBeLessThanOrEqual(45);
  }

  // Ink separation on both final map and base map
  checkInkSeparation(page.regionMap, `${tag} regionMap`);
  checkInkSeparation(page.baseRegionMap, `${tag} baseRegionMap`);

  // Zero actor-owned region leakage into baseRegionMap + actorSlotMap consistency
  const actorOwnedIds = new Set<number>();
  for (const a of page.actors) {
    for (const rid of a.regionIds) {
      actorOwnedIds.add(rid);
      expect(page.regions[rid], `${tag} actor ${a.instanceId} region ${rid}`).toBeDefined();
    }
  }
  for (let i = 0; i < PAGE_PIXELS; i++) {
    const baseId = page.baseRegionMap[i]!;
    if (actorOwnedIds.has(baseId)) {
      throw new Error(`${tag}: actor-owned region ${baseId} leaked into baseRegionMap at px ${i}`);
    }
    if (page.actorSlotMap[i] === 0 && baseId !== page.regionMap[i]) {
      throw new Error(`${tag}: baseRegionMap !== regionMap at non-actor px ${i}`);
    }
  }

  // Margin path & strictly in-bounds path points
  expect(page.paths.some((q) => q.role === 'margin'), `${tag} margin path`).toBe(true);
  for (const q of page.paths) {
    expect(q.points.length, `${tag} path ${q.role} points`).toBeGreaterThanOrEqual(2);
    for (const pt of q.points) {
      expect(pt.x, `${tag} path x >= 0`).toBeGreaterThanOrEqual(0);
      expect(pt.x, `${tag} path x < PAGE_W`).toBeLessThan(PAGE_W);
      expect(pt.y, `${tag} path y >= 0`).toBeGreaterThanOrEqual(0);
      expect(pt.y, `${tag} path y < PAGE_H`).toBeLessThan(PAGE_H);
    }
  }

  // Universe metadata
  const expectedU = UNIVERSE_BY_ID[opts.expectedUniverse];
  if (page.universeId !== undefined) {
    expect(page.universeId, `${tag} universeId`).toBe(opts.expectedUniverse);
  }
  if (page.ambient !== undefined) {
    expect(page.ambient, `${tag} ambient`).toBe(expectedU.ambient);
  }

  if (opts.isHub) {
    expect(ghostCount, `${tag} hub ghosts`).toBe(0);
    expect(page.preColored?.length ?? 0, `${tag} hub preColored`).toBeGreaterThanOrEqual(8);
    for (const pc of page.preColored ?? []) {
      expect(page.regions[pc.id], `${tag} preColored reg ${pc.id}`).toBeDefined();
      expect(MATERIALS.some((m) => m.id === pc.materialId), `${tag} preColored mat ${pc.materialId}`).toBe(true);
    }
    expect(page.actors.some((a) => a.kind === 'violet'), `${tag} hub Violet actor`).toBe(true);
    for (const vid of [1, 2, 3, 4]) {
      expect(page.regions[vid], `${tag} hub Violet reg ${vid}`).toBeDefined();
    }
  } else {
    expect(page.preColored, `${tag} chapter must not be preColored`).toBeUndefined();
    expect(ghostCount, `${tag} chapter ghosts`).toBeGreaterThanOrEqual(2);
    expect(ghostCount, `${tag} chapter ghosts`).toBeLessThanOrEqual(4);
    for (const cid of [12, 13, 14]) {
      expect(page.coreRegionIds, `${tag} canon ${cid}`).toContain(cid);
      expect(page.regions[cid], `${tag} canon reg ${cid}`).toBeDefined();
    }
    const quests = page.heroQuests ?? [];
    const milestones = page.storyMilestones ?? [];
    expect(quests.length, `${tag} heroQuests count`).toBeGreaterThanOrEqual(3);
    expect(quests.length, `${tag} heroQuests count`).toBeLessThanOrEqual(4);
    expect(milestones.length, `${tag} storyMilestones mirror`).toBe(quests.length);
    const seenQuestIds = new Set<HeroQuestId>();
    const usedRegions = new Set<number>();
    for (const q of quests) {
      expect(ALL_VALID_QUEST_IDS.has(q.questId), `${tag} valid questId ${q.questId}`).toBe(true);
      expect(seenQuestIds.has(q.questId), `${tag} duplicate questId ${q.questId}`).toBe(false);
      seenQuestIds.add(q.questId);
      const words = q.label.trim().split(/\s+/).filter(Boolean);
      expect(words.length, `${tag} label "${q.label}"`).toBeGreaterThanOrEqual(1);
      expect(words.length, `${tag} label "${q.label}"`).toBeLessThanOrEqual(2);
      expect(q.thumbnailSpriteId, `${tag} thumb`).toBe(`quest_${q.questId}`);
      expect(q.regionIds.length, `${tag} quest ${q.questId} regions`).toBeGreaterThan(0);
      for (const rid of q.regionIds) {
        const meta = page.regions[rid];
        expect(meta, `${tag} quest ${q.questId} missing reg ${rid}`).toBeDefined();
        expect(meta?.coverageExcluded, `${tag} quest ${q.questId} reg ${rid} colourable`).toBe(false);
        expect(usedRegions.has(rid), `${tag} disjoint quest reg ${rid}`).toBe(false);
        usedRegions.add(rid);
      }
    }
  }
}

describe('Multiverse 189-Scene Compilation & Purity (21 Universes: 21 Hubs + 168 Chapters)', () => {
  const art = createArt();

  it('registers exact contract totals: 21 universes, 21 unique hubs, 168 unique chapters (189 total scenes)', () => {
    expect(TOTAL_UNIVERSES).toBe(21);
    expect(UNIVERSES).toHaveLength(21);
    expect(UNIVERSE_ORDER).toHaveLength(21);
    expect(HUB_SCENE_IDS).toHaveLength(21);
    expect(ALL_CHAPTERS).toHaveLength(168);
    expect(new Set(HUB_SCENE_IDS).size).toBe(21);
    expect(new Set(ALL_CHAPTERS.map((c) => c.id)).size).toBe(168);
    expect(new Set(ALL_CHAPTERS.map((c) => c.title)).size).toBe(168);
    expect(HUB_SCENE_IDS.length + ALL_CHAPTERS.length).toBe(189);
  });

  it.each(UNIVERSES.map((u) => [u.number, u.id, u.shortName] as const))(
    'Universe #%i (%s — %s): Hub Sanctuary + all 8 chapters compile cleanly across seeds [7, 4242] with byte-for-byte determinism',
    (_num, uId) => {
      const u = UNIVERSE_BY_ID[uId];
      const freshArt = createArt();
      const allSceneIds: Array<{ id: SceneId; isHub: boolean; isFinale: boolean }> = [
        { id: u.hub, isHub: true, isFinale: false },
        ...u.chapters.map((ch) => ({ id: ch.id, isHub: false, isFinale: ch.slot === 5 })),
      ];

      for (const entry of allSceneIds) {
        const p7 = art.compilePage(entry.id, 7, NONE);
        verifyCompiledScene(p7, { isHub: entry.isHub, isFinale: entry.isFinale, expectedUniverse: uId });

        // Byte-for-byte determinism from a fresh ArtPort instance
        const p7Dup = freshArt.compilePage(entry.id, 7, NONE);
        expect(bytesEqual(p7.regionMap, p7Dup.regionMap), `${entry.id} regionMap deterministic`).toBe(true);
        expect(bytesEqual(p7.baseRegionMap, p7Dup.baseRegionMap), `${entry.id} baseRegionMap deterministic`).toBe(true);
        expect(bytesEqual(p7.actorSlotMap, p7Dup.actorSlotMap), `${entry.id} actorSlotMap deterministic`).toBe(true);
        expect(JSON.stringify(p7.heroQuests)).toBe(JSON.stringify(p7Dup.heroQuests));

        // Second seed verification (4242)
        const p4242 = art.compilePage(entry.id, 4242, NONE);
        verifyCompiledScene(p4242, { isHub: entry.isHub, isFinale: entry.isFinale, expectedUniverse: uId });
      }
    },
    30_000,
  );

  it('compiles new multiverse scenes cleanly with ALL 14 wardrobe accessories equipped', () => {
    const sample: Array<{ id: SceneId; isHub: boolean; isFinale: boolean; uId: UniverseId }> = [
      { id: 'hub_coralKingdom', isHub: true, isFinale: false, uId: 'coralKingdom' },
      { id: 'u02_c1', isHub: false, isFinale: false, uId: 'coralKingdom' },
      { id: 'u11_c5', isHub: false, isFinale: true, uId: 'crystalGeodeCaverns' },
      { id: 'hub_prismNexusMultiverse', isHub: true, isFinale: false, uId: 'prismNexusMultiverse' },
      { id: 'u21_c5', isHub: false, isFinale: true, uId: 'prismNexusMultiverse' },
    ];
    for (const s of sample) {
      const p = art.compilePage(s.id, 7, ALL);
      verifyCompiledScene(p, { isHub: s.isHub, isFinale: s.isFinale, expectedUniverse: s.uId });
      // Violet wardrobe overlays appear on every hub & chapter containing Violet
      for (const id of [204, 205, 206, 207, 215, 216]) {
        expect(p.regionTotalPixels[id]!, `${s.id} Violet wardrobe ${id}`).toBeGreaterThan(0);
      }
    }
  });
});

describe('Multiverse Illustrations: 21 Portals, 168 Star-Doors & 25 New UI/Quest Sprites', () => {
  const art = createArt();
  const freshArt = createArt();

  it('renders all 21 universePortal illustrations (unlocked, locked, completed) deterministically, distinctly, with rich opacity & colors', () => {
    const unlockedBuffers: Uint8ClampedArray[] = [];
    for (const u of UNIVERSES) {
      const unlocked = art.illustration({ type: 'universePortal', universe: u.id, locked: false, completed: false }, 88, 64);
      const unlockedDup = freshArt.illustration({ type: 'universePortal', universe: u.id, locked: false, completed: false }, 88, 64);
      const locked = art.illustration({ type: 'universePortal', universe: u.id, locked: true, completed: false }, 88, 64);
      const completed = art.illustration({ type: 'universePortal', universe: u.id, locked: false, completed: true }, 88, 64);

      expect(unlocked.width).toBe(88);
      expect(unlocked.height).toBe(64);
      expect(bytesEqual(unlocked.data, unlockedDup.data), `${u.id} portal deterministic`).toBe(true);
      expect(bytesEqual(unlocked.data, locked.data), `${u.id} locked !== unlocked`).toBe(false);
      expect(bytesEqual(unlocked.data, completed.data), `${u.id} completed !== unlocked`).toBe(false);
      expect(bytesEqual(locked.data, completed.data), `${u.id} locked !== completed`).toBe(false);

      for (const [label, img] of [
        ['unlocked', unlocked],
        ['locked', locked],
        ['completed', completed],
      ] as const) {
        const stats = inspectImage(img);
        expect(stats.opaqueRatio, `${u.id} ${label} opacity`).toBeGreaterThan(0.35);
        expect(stats.colorCount, `${u.id} ${label} colors`).toBeGreaterThanOrEqual(8);
      }
      unlockedBuffers.push(unlocked.data);
    }

    // All 21 unlocked universe portals are pairwise distinct
    for (let i = 0; i < unlockedBuffers.length; i++) {
      for (let j = i + 1; j < unlockedBuffers.length; j++) {
        expect(
          bytesEqual(unlockedBuffers[i]!, unlockedBuffers[j]!),
          `portals ${UNIVERSES[i]!.id} and ${UNIVERSES[j]!.id} must differ`,
        ).toBe(false);
      }
    }
  });

  it('renders all 168 Star-Door vignettes deterministically with distinct A/B branch pairs', () => {
    const cache = new Map<string, PixelImage>();
    for (const ch of ALL_CHAPTERS) {
      const a = art.illustration({ type: 'door', chapter: ch.id }, 80, 120);
      const b = freshArt.illustration({ type: 'door', chapter: ch.id }, 80, 120);
      expect(a.width).toBe(80);
      expect(a.height).toBe(120);
      expect(bytesEqual(a.data, b.data), `door ${ch.id} deterministic`).toBe(true);
      const stats = inspectImage(a);
      expect(stats.opaqueRatio, `door ${ch.id} opacity`).toBeGreaterThan(0.75);
      expect(stats.colorCount, `door ${ch.id} colors`).toBeGreaterThanOrEqual(12);
      cache.set(ch.id, a);
    }

    // Every A/B branch pair across all 21 universes renders distinctly
    for (const u of UNIVERSES) {
      for (const slot of [1, 2, 3] as const) {
        const pair = u.branches[slot];
        expect(pair).toHaveLength(2);
        const imgA = cache.get(pair[0]!)!;
        const imgB = cache.get(pair[1]!)!;
        expect(bytesEqual(imgA.data, imgB.data), `${u.id} slot ${slot + 1} doors ${pair[0]} vs ${pair[1]}`).toBe(false);
      }
    }
  });

  it('renders all 25 new UI & quest sprites (3 tools + 22 quests) deterministically with distinct lit/unlit medallions', () => {
    expect(NEW_UI_SPRITE_IDS).toHaveLength(25);
    const atlas = art.uiAtlas!();
    const freshAtlas = freshArt.uiAtlas!();

    for (const id of NEW_UI_SPRITE_IDS) {
      const a = art.illustration({ type: 'uiSprite', id }, 32, 32);
      const b = freshArt.illustration({ type: 'uiSprite', id }, 32, 32);
      expect(a.width).toBe(32);
      expect(a.height).toBe(32);
      expect(bytesEqual(a.data, b.data), `uiSprite ${id} deterministic`).toBe(true);
      const stats = inspectImage(a);
      expect(stats.opaqueRatio, `uiSprite ${id} opacity`).toBeGreaterThan(0.12);
      expect(stats.colorCount, `uiSprite ${id} colors`).toBeGreaterThanOrEqual(4);

      const viaAtlas = atlas.sprite(id, 32);
      const viaFreshAtlas = freshAtlas.sprite(id, 32);
      expect(bytesEqual(viaAtlas.data, viaFreshAtlas.data), `atlas.sprite ${id}`).toBe(true);
    }

    for (const q of NEW_QUEST_IDS) {
      const unlit = art.illustration({ type: 'questMedallion', quest: q, completed: false }, 36, 36);
      const lit = art.illustration({ type: 'questMedallion', quest: q, completed: true }, 36, 36);
      const litDup = freshArt.illustration({ type: 'questMedallion', quest: q, completed: true }, 36, 36);
      expect(bytesEqual(lit.data, litDup.data), `questMedallion ${q} deterministic`).toBe(true);
      expect(bytesEqual(unlit.data, lit.data), `questMedallion ${q} unlit !== lit`).toBe(false);
      expect(inspectImage(unlit).opaqueRatio).toBeGreaterThan(0.15);
      expect(inspectImage(lit).opaqueRatio).toBeGreaterThan(0.2);
      expect(inspectImage(lit).colorCount).toBeGreaterThanOrEqual(5);
    }
  });
});

describe('Multiverse Roguelike RunManager (Universes 1, 2, 11, 21)', () => {
  const TARGET_UNIVERSES: readonly UniverseId[] = [
    'chromaCosmos',
    'coralKingdom',
    'crystalGeodeCaverns',
    'prismNexusMultiverse',
  ];

  it.each(TARGET_UNIVERSES)('runs a full 5-chapter branching voyage in %s with bespoke doors & galaxyName', (uId) => {
    const u = UNIVERSE_BY_ID[uId];
    const rm = createRunManager();
    const startCore = rm.start(4242, uId);

    expect(rm.universeId?.()).toBe(uId);
    expect(rm.currentChapter()).toBe(u.chapters[0]!.id);
    if (uId === 'chromaCosmos') {
      expect(startCore.universeId).toBeUndefined();
    } else {
      expect(startCore.universeId).toBe(uId);
    }

    // Play slots 1 -> 4 with alternating branch selections
    for (let slotIdx = 0; slotIdx < 4; slotIdx++) {
      expect(rm.completeChapter()).toBe('draft');
      const cards = rm.draftOptions();
      expect(cards).toHaveLength(3);
      expect(new Set(cards).size).toBe(3);
      rm.pickDraft(cards[slotIdx % 3]!);

      const doors = rm.doorOptions();
      const expectedDoors = u.branches[(slotIdx + 1) as 1 | 2 | 3 | 4];
      expect(doors).toEqual([...expectedDoors]);
      const chosen = doors[slotIdx % doors.length]!;
      rm.chooseDoor(chosen);
      expect(rm.currentChapter()).toBe(chosen);
      expect(CHAPTER_TO_UNIVERSE[chosen]).toBe(uId);
    }

    // Slot 5 finale
    expect(rm.currentChapter()).toBe(u.chapters[7]!.id);
    expect(rm.core()?.phase).toBe('finale');
    expect(rm.completeChapter()).toBe('complete');

    // Bespoke galaxyName() is deterministic and draws from universe nameWords for U2..U21
    const g1 = rm.galaxyName();
    expect(g1.startsWith('The ')).toBe(true);
    expect(g1.length).toBeGreaterThan(10);
    if (uId !== 'chromaCosmos') {
      expect(u.nameWords.b.some((w) => g1.includes(w)), `${uId} galaxyName "${g1}" uses nameWords.b`).toBe(true);
      expect(u.nameWords.c.some((w) => g1.includes(w)), `${uId} galaxyName "${g1}" uses nameWords.c`).toBe(true);
    }

    // Resume preserves universeId and galaxyName
    const snapshot = rm.core()!;
    const rm2 = createRunManager();
    rm2.resume(snapshot);
    expect(rm2.universeId?.()).toBe(uId);
    expect(rm2.galaxyName()).toBe(g1);
  });
});

describe('Multiverse Vault, 21-Universe Shadow Cookie (< 1500 chars) & Sprint 1 Migration', () => {
  function makeEnv(start = 1000) {
    const ls = fakeLocalStorage();
    const cookie = fakeCookie();
    const idb = new IDBFactory();
    const clock = { t: start };
    const backends: VaultBackends = { localStorage: ls, cookie, indexedDB: idb, now: () => clock.t };
    return { ls, cookie, idb, clock, backends };
  }

  it('round-trips all 21 completedUniverses (u), activeUniverse (cu), active run universe (ru) & Storybook.universeId across LS, IDB, JSON & <1500-char shadow cookie', async () => {
    const env = makeEnv(10_000);
    const v = createVault(env.backends);
    await v.hydrate();

    const fullMax: VaultState = {
      ...maxState(20_000),
      completedUniverses: [...UNIVERSE_ORDER],
      activeUniverse: 'prismNexusMultiverse',
      run: {
        seed: 4_294_967_295,
        chapterIndex: 4,
        path: ['u21_c1', 'u21_c2a', 'u21_c3b', 'u21_c4a', 'u21_c5'],
        brushes: [...BRUSH_ORDER],
        relics: [...RELIC_ORDER],
        phase: 'finale',
        universeId: 'prismNexusMultiverse',
      },
    };

    const encodedVal = encodeCookieValue(fullMax);
    const fullCookieStr = buildCookieString(fullMax);
    expect(encodedVal.length).toBeLessThan(COOKIE_MAX_CHARS);
    expect(fullCookieStr.length).toBeLessThan(COOKIE_MAX_CHARS);
    expect(fullCookieStr.length).toBeLessThan(600);

    const decodedDirect = decodeCookieValue(encodedVal);
    expect(decodedDirect).not.toBeNull();
    expect(decodedDirect!.completedUniverses).toEqual([...UNIVERSE_ORDER]);
    expect(decodedDirect!.activeUniverse).toBe('prismNexusMultiverse');
    expect(decodedDirect!.run?.universeId).toBe('prismNexusMultiverse');
    expect(decodedDirect!.run?.path).toEqual(['u21_c1', 'u21_c2a', 'u21_c3b', 'u21_c4a', 'u21_c5']);

    // Persist through Vault API
    env.clock.t = 20_000;
    v.update((d) => {
      Object.assign(d, fullMax);
    });
    await v.flush();

    const u21Book = {
      ...makeBook('u21-book', 25_000, 2),
      universeId: 'prismNexusMultiverse' as UniverseId,
      pages: [
        { ...makeBook('u21-book', 25_000, 1).pages[0]!, sceneId: 'u21_c1' as const },
        { ...makeBook('u21-book', 25_000, 1).pages[0]!, sceneId: 'u21_c5' as const },
      ],
    };
    await v.saveStorybook(u21Book);

    // Verify localStorage + IndexedDB + shadow cookie all carry multiverse state
    const lsParsed = JSON.parse(env.ls.map.get(VAULT_LS_KEY)!) as VaultState;
    expect(lsParsed.completedUniverses).toEqual([...UNIVERSE_ORDER]);
    expect(lsParsed.activeUniverse).toBe('prismNexusMultiverse');
    expect(lsParsed.run?.universeId).toBe('prismNexusMultiverse');
    expect((await rawGetRecord(env.idb)).vault.activeUniverse).toBe('prismNexusMultiverse');
    expect((env.cookie.raw() ?? '').length).toBeLessThan(COOKIE_MAX_CHARS);

    // Wipe LS + IDB -> shadow cookie self-heals all 21 universes + U21 active run
    env.ls.map.clear();
    expect(await rawDelete(env.idb)).toBe('deleted');
    const healed = createVault(env.backends);
    const healReport = await healed.hydrate();
    expect(healReport).toEqual({ source: 'cookie', healed: ['localStorage', 'indexedDB'] });
    expect(healed.get().completedUniverses).toEqual([...UNIVERSE_ORDER]);
    expect(healed.get().activeUniverse).toBe('prismNexusMultiverse');
    expect(healed.get().run?.universeId).toBe('prismNexusMultiverse');
    expect(healed.get().run?.path).toEqual(['u21_c1', 'u21_c2a', 'u21_c3b', 'u21_c4a', 'u21_c5']);

    // JSON export/import round-trip (including U21 storybook & universeId summary)
    await healed.saveStorybook(u21Book);
    const json = await healed.exportJson();
    const dst = makeEnv(30_000);
    const vDst = createVault(dst.backends);
    await vDst.hydrate();
    await vDst.importJson(json);
    expect(vDst.get().completedUniverses).toEqual([...UNIVERSE_ORDER]);
    expect(vDst.get().activeUniverse).toBe('prismNexusMultiverse');
    expect(vDst.get().run?.universeId).toBe('prismNexusMultiverse');
    const summaries = await vDst.listStorybooks();
    expect(summaries[0]?.universeId).toBe('prismNexusMultiverse');
    const restoredBook = await vDst.getStorybook('u21-book');
    expect(restoredBook?.universeId).toBe('prismNexusMultiverse');
    expect(restoredBook?.pages.map((p) => p.sceneId)).toEqual(['u21_c1', 'u21_c5']);
  });

  it('migrates legacy Sprint 1 saves (runsCompleted >= 1) cleanly so Universe 2 unlocks automatically', async () => {
    // 1. Frozen Sprint 1 cookie (runsCompleted = 3, no u/cu/ru fields)
    const eCookie = makeEnv(50_000);
    eCookie.cookie.set(FROZEN_SPRINT1_COOKIE_WITH_P);
    const vCookie = createVault(eCookie.backends);
    expect((await vCookie.hydrate()).source).toBe('cookie');
    const sCookie = vCookie.get();
    expect(sCookie.stats.runsCompleted).toBeGreaterThanOrEqual(1);
    expect(sCookie.completedUniverses).toBeUndefined();
    expect(sCookie.activeUniverse).toBeUndefined();
    expect(extractCookieValue(eCookie.cookie.read())!.length).toBeLessThan(COOKIE_MAX_CHARS);

    // Verify canonical Sprint 1 -> Multiverse progression unlock rule: runsCompleted >= 1 unlocks Universe #2 (coralKingdom)
    const isUniverseUnlocked = (v: VaultState, idx: number): boolean => {
      const completed = new Set<UniverseId>(v.completedUniverses ?? []);
      if (v.stats.runsCompleted >= 1) completed.add('chromaCosmos');
      if (idx === 0) return true;
      return completed.has(UNIVERSE_ORDER[idx - 1]!) || (idx === 1 && v.stats.runsCompleted >= 1);
    };
    expect(isUniverseUnlocked(sCookie, 0)).toBe(true);
    expect(isUniverseUnlocked(sCookie, 1)).toBe(true); // coralKingdom unlocked!
    expect(isUniverseUnlocked(sCookie, 2)).toBe(false); // sugarCloudBakery still locked

    // 2. Legacy Sprint 1 localStorage save (runsCompleted = 3)
    const eLs = makeEnv(60_000);
    eLs.ls.setItem(VAULT_LS_KEY, JSON.stringify(sprint1RawVault(55_000)));
    const vLs = createVault(eLs.backends);
    expect((await vLs.hydrate()).source).toBe('localStorage');
    expect(isUniverseUnlocked(vLs.get(), 1)).toBe(true);
  });
});

describe('Multiverse Web Audio (setUniverseTone & universeUnlock)', () => {
  beforeEach(() => {
    MockAudioContext.instances = [];
  });
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('transposes F-Lydian pitches via setUniverseTone and fires bounded leak-free universeUnlock() fanfare (< 36 nodes, 0 speechSynthesis)', async () => {
    const speak = vi.fn(() => {
      throw new Error('speechSynthesis is forbidden');
    });
    vi.stubGlobal('speechSynthesis', { speak, cancel: speak, getVoices: speak });
    vi.stubGlobal('SpeechSynthesisUtterance', class {
      constructor() {
        throw new Error('SpeechSynthesisUtterance is forbidden');
      }
    });
    vi.stubGlobal('AudioContext', MockAudioContext);

    expect(semitoneRatio(0)).toBe(1);
    expect(semitoneRatio(2)).toBeCloseTo(2 ** (2 / 12), 9);
    expect(semitoneRatio(-5)).toBeCloseTo(2 ** (-5 / 12), 9);
    expect(semitoneRatio(99)).toBeCloseTo(2, 9);
    expect(semitoneRatio(-99)).toBeCloseTo(0.5, 9);
    expect(lydianFreq(0, 0)).toBeCloseTo(349.23, 6);
    expect(lydianFreq(0, 7)).toBeCloseTo(349.23 * 2 ** (7 / 12), 6);

    const audio = createAudio();
    await audio.unlock();
    const ctx = MockAudioContext.last();
    const baseline = audio.stats().liveNodes;

    // Transposition check: compare autoBloom oscillator frequencies at shift 0 vs +2 (coralKingdom) vs -5 (mushroomGlade)
    const sampleBloomRoot = (shift: number, ambient: (typeof UNIVERSES)[number]['ambient']): number => {
      audio.setUniverseTone?.(shift, ambient);
      const before = ctx.sources.length;
      audio.autoBloom();
      const osc = ctx.sources.slice(before).find((s) => s.kind === 'oscillator');
      expect(osc).toBeDefined();
      const freq = osc!.frequency.value;
      ctx.advance(4);
      expect(audio.stats().liveNodes).toBe(baseline);
      return freq;
    };

    const f0 = sampleBloomRoot(0, 'stardust');
    const fPlus2 = sampleBloomRoot(2, 'bubbles');
    const fMinus5 = sampleBloomRoot(-5, 'fireflies');
    expect(fPlus2 / f0).toBeCloseTo(2 ** (2 / 12), 4);
    expect(fMinus5 / f0).toBeCloseTo(2 ** (-5 / 12), 4);

    // universeUnlock() celebratory fanfare: bounded < 36 nodes, warm lowpass sine/triangle, zero leaks
    audio.setUniverseTone?.(2, 'bubbles');
    const createdBefore = audio.stats().totalCreated;
    const nodesBefore = ctx.nodes.length;
    const sourcesBefore = ctx.sources.length;
    audio.universeUnlock?.();
    const spawned = audio.stats().totalCreated - createdBefore;
    expect(spawned).toBeGreaterThan(10);
    expect(spawned).toBeLessThan(36);

    const freshNodes = ctx.nodes.slice(nodesBefore);
    const freshSources = ctx.sources.slice(sourcesBefore);
    expect(freshNodes.some((n) => n instanceof MockFilter && n.type === 'lowpass')).toBe(true);
    const oscs = freshSources.filter((s) => s.kind === 'oscillator');
    expect(oscs.length).toBeGreaterThanOrEqual(6);
    expect(oscs.every((o) => o.type === 'sine' || o.type === 'triangle')).toBe(true);

    ctx.advance(6);
    expect(audio.stats().liveNodes).toBe(baseline);
    expect(freshNodes.every((n) => n.disconnected)).toBe(true);

    // Muted (level 0) spawns zero nodes
    audio.setLevel(0);
    const mutedBefore = audio.stats();
    audio.universeUnlock?.();
    expect(audio.stats()).toEqual(mutedBefore);

    audio.dispose();
    expect(speak).not.toHaveBeenCalled();

    // Static check: zero speechSynthesis references in src/audio/**
    const audioDir = join(process.cwd(), 'src', 'audio');
    for (const file of readdirSync(audioDir).filter((f) => f.endsWith('.ts'))) {
      const src = readFileSync(join(audioDir, file), 'utf8');
      expect(src, `${file} must not reference speechSynthesis`).not.toMatch(/speechsynthesis/i);
    }
  });
});

describe('Multiverse UI (21-Node Constellation Strip, Atlas Drawer, Switching & Unlock Finale)', () => {
  let root: HTMLElement;

  function makeUniverseItems(unlockedCount: number, activeId: UniverseId = 'chromaCosmos'): UniverseProgressItem[] {
    return UNIVERSES.map((u, idx) => ({
      id: u.id,
      index: u.index,
      number: u.number,
      name: u.name,
      shortName: u.shortName,
      tagline: u.tagline,
      unlockTeaser: u.unlockTeaser,
      accent: u.accent,
      accentSoft: u.accentSoft,
      unlocked: idx < unlockedCount,
      completed: idx < unlockedCount - 1,
      isNextUnlock: idx === unlockedCount,
      active: u.id === activeId,
      chapterTitles: u.chapters.map((c) => c.title),
    }));
  }

  function makeHubState(unlockedCount: number, activeId: UniverseId = 'chromaCosmos'): HubState {
    return {
      gems: 40,
      badges: ['firstBloom'],
      materials: MATERIALS.map((def, i) => ({ def, unlocked: i < 7 })),
      wardrobeOwned: [],
      wardrobe: { ...NONE },
      storybooks: [],
      hasRunInProgress: false,
      hasAffordableUnlock: true,
      audioLevel: 3,
      activeUniverse: activeId,
      universes: makeUniverseItems(unlockedCount, activeId),
      unlockedUniverseCount: unlockedCount,
      completedUniverseCount: Math.max(0, unlockedCount - 1),
      totalUniverses: TOTAL_UNIVERSES,
    };
  }

  function mockUiSetup() {
    const cb: UiCallbacks = {
      onStartRun: vi.fn(),
      onContinueRun: vi.fn(),
      onSelectUniverse: vi.fn(),
      onSelectMaterial: vi.fn(),
      onSelectBrush: vi.fn(),
      onToggleDoodle: vi.fn(),
      onSelectToolMode: vi.fn(),
      onRequestHint: vi.fn(),
      onHighlightMilestone: vi.fn(),
      onStayAndDoodle: vi.fn(),
      onUiFoley: vi.fn(),
      onTurnPage: vi.fn(),
      onAudioCycle: vi.fn(),
      onUnlockMaterial: vi.fn(),
      onBuyWardrobe: vi.fn(),
      onToggleWardrobe: vi.fn(),
      onOpenBook: vi.fn(),
      onBookPage: vi.fn(),
      onCloseBook: vi.fn(),
      onSaveKeepsake: vi.fn(),
      onSaveBookKeepsake: vi.fn(),
      onExportVault: vi.fn(),
      onImportVault: vi.fn(),
      onBackToHub: vi.fn(),
      onGesture: vi.fn(),
      onHover: vi.fn(),
      onDismissPrologue: vi.fn(),
      onFinaleDone: vi.fn(),
    };
    const illustration = vi.fn((_k: IllustrationKind, w: number, h: number): PixelImage => ({
      width: w,
      height: h,
      data: new Uint8ClampedArray(w * h * 4).fill(210),
    }));
    const deps: UiDeps = {
      illustration,
      clientToInternal: vi.fn(() => ({ x: 240, y: 135 })),
    };
    return { cb, deps, illustration };
  }

  beforeEach(() => {
    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      configurable: true,
      value: vi.fn((q: string) => ({
        matches: q.includes('prefers-reduced-motion'),
        media: q,
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
      })),
    });
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockImplementation(
      (() => ({
        imageSmoothingEnabled: true,
        createImageData: (w: number, h: number) => ({ width: w, height: h, data: new Uint8ClampedArray(w * h * 4) }),
        putImageData: vi.fn(),
      })) as unknown as typeof HTMLCanvasElement.prototype.getContext,
    );
    document.body.innerHTML = '<div id="app"></div>';
    root = document.getElementById('app')!;
  });

  afterEach(() => {
    vi.restoreAllMocks();
    document.body.innerHTML = '';
  });

  it('renders 21-node Constellation Strip, opens Atlas Drawer with 21 portal cards, switches unlocked worlds, rejects locked worlds with hint, and renders Finale Unlock Reveal', async () => {
    const ui = createUi(root);
    const { cb, deps, illustration } = mockUiSetup();
    ui.mount(cb, deps);
    ui.updateHub(makeHubState(2, 'chromaCosmos'));
    ui.setMode('hub');

    // 1. Main-screen 21-node Constellation Strip
    const strip = root.querySelector<HTMLElement>('.cc-universe-strip')!;
    expect(strip).not.toBeNull();
    const nodes = strip.querySelectorAll<HTMLButtonElement>('.cc-uni-node');
    expect(nodes).toHaveLength(21);
    expect(nodes[0]!.dataset.universe).toBe('chromaCosmos');
    expect(nodes[0]!.dataset.state).toBe('active');
    expect(nodes[1]!.dataset.universe).toBe('coralKingdom');
    expect(nodes[1]!.dataset.state).toBe('unlocked');
    expect(nodes[2]!.dataset.universe).toBe('sugarCloudBakery');
    expect(nodes[2]!.dataset.state).toBe('next');
    expect(root.querySelector('.cc-crest-uni-pill')?.textContent).toBe('Universe 1 / 21');

    // Clicking unlocked node #2 switches universe cleanly
    nodes[1]!.click();
    expect(cb.onSelectUniverse).toHaveBeenCalledWith('coralKingdom');

    // 2. Atlas Drawer opens with all 21 universe cards & Hi-Bit universePortal canvases
    const atlasBtn = root.querySelector<HTMLButtonElement>('.cc-crest-atlas-btn[data-action="open-atlas"]')!;
    atlasBtn.click();
    const atlasDrawer = root.querySelector<HTMLElement>('.cc-drawer-universes')!;
    expect(atlasDrawer.hidden).toBe(false);
    const cards = atlasDrawer.querySelectorAll<HTMLButtonElement>('.cc-uni-card');
    expect(cards).toHaveLength(21);
    for (const card of cards) {
      expect(card.querySelector('canvas.cc-pix')).not.toBeNull();
    }
    const portalCalls = illustration.mock.calls.filter(([k]) => k.type === 'universePortal');
    expect(portalCalls.length).toBeGreaterThanOrEqual(21);

    // Clicking locked Universe #3 rejects selection, shakes card, and shows unlock hint toast
    vi.mocked(cb.onSelectUniverse!).mockClear();
    const lockedCard = atlasDrawer.querySelector<HTMLButtonElement>('.cc-uni-card[data-universe="sugarCloudBakery"]')!;
    lockedCard.click();
    expect(cb.onSelectUniverse).not.toHaveBeenCalled();
    expect(lockedCard.classList.contains('cc-shake')).toBe(true);
    expect(root.querySelector('.cc-toast-msg')?.textContent).toContain('Beat #2');
    expect(atlasDrawer.hidden).toBe(false);

    // Clicking unlocked Universe #2 selects it and closes Atlas drawer
    const coralCard = atlasDrawer.querySelector<HTMLButtonElement>('.cc-uni-card[data-universe="coralKingdom"]')!;
    coralCard.click();
    expect(cb.onSelectUniverse).toHaveBeenCalledWith('coralKingdom');
    expect(atlasDrawer.hidden).toBe(true);

    // 3. Finale Modal with "NEW UNIVERSE UNLOCKED!" reveal + "Journey to #2" action
    const coralDef = UNIVERSE_BY_ID.coralKingdom;
    const meta: FinaleMeta = {
      universeId: 'chromaCosmos',
      universeName: UNIVERSE_BY_ID.chromaCosmos.name,
      newlyUnlocked: {
        id: coralDef.id,
        number: coralDef.number,
        name: coralDef.name,
        tagline: coralDef.tagline,
      },
      completedCount: 1,
      totalUniverses: TOTAL_UNIVERSES,
      bonusGems: 25,
    };
    const pJourney = ui.showFinale('The Sparkle-Paws Aurora Spiral', meta);
    const finaleEl = root.querySelector<HTMLElement>('.cc-finale')!;
    expect(finaleEl.textContent).toContain('NEW UNIVERSE UNLOCKED!');
    expect(finaleEl.textContent).toContain(coralDef.name);
    expect(finaleEl.textContent).toContain('+25 First-Clear Prism Crystals!');
    expect(finaleEl.querySelector('.cc-finale-portal-frame canvas.cc-pix')).not.toBeNull();
    const journeyBtn = finaleEl.querySelector<HTMLButtonElement>('.cc-finale-btn-journey[data-action="journey-next"]')!;
    expect(journeyBtn.textContent).toContain('Journey to #2');
    expect(root.querySelectorAll('svg').length).toBe(0);

    journeyBtn.click();
    await expect(pJourney).resolves.toBe('coralKingdom');

    // Return to Atlas action resolves to null
    const pAtlas = ui.showFinale('The Sparkle-Paws Aurora Spiral', meta);
    const returnBtn = root.querySelector<HTMLButtonElement>('.cc-finale-btn-atlas[data-action="return-atlas"]')!;
    returnBtn.click();
    await expect(pAtlas).resolves.toBeNull();

    // Zero inline SVG anywhere
    expect(root.querySelectorAll('svg').length).toBe(0);
  });
});

describe('Multiverse Hub-to-Universe & Chapter-to-Universe Contract Maps', () => {
  it('maps every hub and chapter cleanly back to its owning universe', () => {
    for (const u of UNIVERSES) {
      expect(HUB_TO_UNIVERSE[u.hub]).toBe(u.id);
      for (const ch of u.chapters) {
        expect(CHAPTER_TO_UNIVERSE[ch.id]).toBe(u.id);
      }
    }
    expect(BADGE_ORDER).toHaveLength(8);
    expect(DRAFT_CARDS).toHaveLength(20);
  });
});
