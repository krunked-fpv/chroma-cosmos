import { readdirSync, readFileSync, statSync } from 'node:fs';
import { extname, join, relative, resolve } from 'node:path';
import { IDBFactory } from 'fake-indexeddb';
import { describe, expect, it } from 'vitest';
import { createArt } from '../../src/art';
import {
  ACTIVE_BRUSH_IDS,
  CACHE_VERSION,
  CHAPTERS,
  CROWN_QUEST_BLOOM_THRESHOLD,
  DRAFT_CARDS,
  EXPANDED_ITEM_CATALOG,
  GEM_REWARDS,
  HERO_QUEST_BLOOM_THRESHOLD,
  HINT_SPOTLIGHT_MS,
  IDLE_WISP_DELAY_MS,
  MATERIALS,
  MAX_MATERIAL_ID,
  PAGE_FINALE_MS,
  PROLOGUE_DURATION_MS,
  REGION_FLAG,
  RELIC_IDS,
  STALLED_QUEST_DELAY_MS,
  STALLED_QUEST_THRESHOLD,
  UNLOCKABLE_MATERIAL_IDS,
  VAULT_COOKIE_ATTRS,
  VAULT_COOKIE_NAME,
  WARDROBE_ITEMS,
} from '../../src/contracts';
import type {
  ChapterId,
  CompiledPage,
  GestureEvent,
  HeroQuestId,
  MaterialId,
  VaultBackends,
  WardrobeState,
} from '../../src/contracts';
import { createPageFinaleController, createSimulation } from '../../src/simulation';
import { createVault } from '../../src/vault';
import { decodeCookieValue, extractCookieValue } from '../../src/vault/cookie';

const ROOT = resolve(process.cwd());
const SRC_DIR = resolve(ROOT, 'src');
const STYLES_DIR = resolve(SRC_DIR, 'styles');
const MAIN_CSS = resolve(STYLES_DIR, 'main.css');
const UI_DIR = resolve(SRC_DIR, 'ui');
const PUBLIC_DIR = resolve(ROOT, 'public');
const INDEX_HTML = resolve(ROOT, 'index.html');

const SOURCE_EXTS = new Set(['.ts', '.tsx', '.js', '.css', '.html']);

const DEFAULT_WARDROBE: WardrobeState = {
  violetPins: false,
  violetCape: false,
  lumiWings: false,
  lumiCrown: false,
  novaBoosters: false,
  novaScarf: false,
  violetHeadphones: false,
  violetMoonHoodie: false,
  violetSaturnHalo: false,
  violetPrismRibbons: false,
  lumiNebulaGarland: false,
  lumiCelestialSaddle: false,
  novaStarGoggles: false,
  novaGalaxyBowtie: false,
};

/** Frozen verbatim Sprint 1 krunked-cookie-vault-v1 payload (12-material / 6-wardrobe / no `d` field). */
const FROZEN_SPRINT1_COOKIE =
  'eyJ2IjoxLCJnIjoxODUsImIiOjUxLCJtIjoyNTU5LCJvIjo0MywidyI6NDEsImEiOjMsInIiOls5ODc2NTQzMjEsMywiUk1VVyIsMjcsMTMsMl0sInMiOlszLDE0Ml0sInAiOjEsInQiOjE3NjAwMDAwMDAwMDB9.6b61f2fd';

function walkFiles(dir: string, exts: ReadonlySet<string>): string[] {
  const out: string[] = [];
  const entries = readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) {
      out.push(...walkFiles(full, exts));
    } else if (entry.isFile() && exts.has(extname(entry.name).toLowerCase())) {
      out.push(full);
    }
  }
  return out.sort();
}

/**
 * Strip JS/TS/CSS comments while preserving string & template literals so static checks
 * inspect actual shipped code/copy without false-positiving on doc comments.
 */
function stripComments(code: string): string {
  let out = '';
  let i = 0;
  const n = code.length;
  let quote: "'" | '"' | '`' | null = null;

  while (i < n) {
    const ch = code[i]!;
    const next = code[i + 1];

    if (quote) {
      out += ch;
      if (ch === '\\' && i + 1 < n) {
        out += code[i + 1]!;
        i += 2;
        continue;
      }
      if (ch === quote) quote = null;
      i += 1;
      continue;
    }

    if (ch === "'" || ch === '"' || ch === '`') {
      quote = ch;
      out += ch;
      i += 1;
      continue;
    }

    if (ch === '/' && next === '/') {
      i += 2;
      while (i < n && code[i] !== '\n') i += 1;
      continue;
    }

    if (ch === '/' && next === '*') {
      i += 2;
      while (i < n && !(code[i] === '*' && code[i + 1] === '/')) {
        if (code[i] === '\n') out += '\n';
        i += 1;
      }
      i += 2;
      continue;
    }

    out += ch;
    i += 1;
  }

  return out;
}

function makeGesture(phase: GestureEvent['phase'], x: number, y: number, timeMs = 0, pointerId = 1): GestureEvent {
  return {
    phase,
    pointerId,
    x,
    y,
    pressure: phase === 'end' ? 0 : 0.65,
    tiltX: 0,
    tiltY: 0,
    pointerType: 'touch',
    timeMs,
  };
}

function paintCompiledRegion(
  sim: ReturnType<typeof createSimulation>,
  regionId: number,
  materialId: MaterialId,
): void {
  sim.setTool({ materialId, brush: 'standard', doodle: false, toolMode: 'pencil' });
  const pts = sim.qaStrokePath(regionId);
  expect(pts.length).toBeGreaterThan(0);
  sim.gesture(makeGesture('start', pts[0]!.x, pts[0]!.y));
  for (let i = 1; i < pts.length; i++) {
    if (sim.regionPercent(regionId) >= 1) break;
    sim.gesture(makeGesture('move', pts[i]!.x, pts[i]!.y));
  }
  const last = pts[pts.length - 1]!;
  sim.gesture(makeGesture('end', last.x, last.y));
}

/**
 * Incrementally paints constituent regions of a Hero Quest until weighted progress reaches `targetProgress`
 * (or the quest blooms). Keeps single regions under 0.85 while partial so a single-region 93% auto-bloom
 * does not overshoot narrow test windows such as 65..81% or 74..81%.
 */
function paintQuestGradually(
  sim: ReturnType<typeof createSimulation>,
  page: CompiledPage,
  questId: HeroQuestId,
  targetProgress: number,
  materialId: MaterialId,
  allowSingleRegionBloom = false,
): { completed: boolean; progress: number; progressBeforeComplete: number } {
  const quest = sim.view().heroQuests!.find((q) => q.questId === questId);
  expect(quest).toBeDefined();
  sim.setTool({ materialId, brush: 'standard', doodle: false, toolMode: 'pencil' });

  const sortedRegions = [...quest!.regionIds].sort(
    (a, b) => (page.regionTotalPixels[b] ?? 0) - (page.regionTotalPixels[a] ?? 0),
  );

  let progressBeforeComplete = quest!.progress;

  for (let pass = 0; pass < 2; pass++) {
    const cap = pass === 0 && !allowSingleRegionBloom ? 0.86 : 1.0;
    for (const rid of sortedRegions) {
      const qNow = sim.view().heroQuests!.find((q) => q.questId === questId)!;
      if (qNow.completed || qNow.progress >= targetProgress) {
        return { completed: qNow.completed, progress: qNow.progress, progressBeforeComplete };
      }
      if (sim.regionPercent(rid) >= cap) continue;
      const pts = sim.qaStrokePath(rid);
      if (pts.length === 0) continue;

      let prev = sim.view().heroQuests!.find((q) => q.questId === questId)!;
      sim.gesture(makeGesture('start', pts[0]!.x, pts[0]!.y));
      let after = sim.view().heroQuests!.find((q) => q.questId === questId)!;
      if (!after.completed) progressBeforeComplete = after.progress;

      let lastPt = pts[0]!;
      for (let i = 1; i < pts.length; i++) {
        if (after.completed || after.progress >= targetProgress || sim.regionPercent(rid) >= cap) break;
        prev = after;
        lastPt = pts[i]!;
        sim.gesture(makeGesture('move', lastPt.x, lastPt.y));
        after = sim.view().heroQuests!.find((q) => q.questId === questId)!;
        if (!after.completed) progressBeforeComplete = after.progress;
        else if (!prev.completed) progressBeforeComplete = prev.progress;
      }
      sim.gesture(makeGesture('end', lastPt.x, lastPt.y));
    }
  }

  const finalQ = sim.view().heroQuests!.find((q) => q.questId === questId)!;
  return { completed: finalQ.completed, progress: finalQ.progress, progressBeforeComplete };
}

function advanceSim(sim: ReturnType<typeof createSimulation>, totalMs: number, stepMs = 50, startClock = 0): number {
  let t = startClock;
  let remaining = totalMs;
  while (remaining > 0) {
    const dt = Math.min(stepMs, remaining);
    t += dt;
    sim.update(dt, t);
    remaining -= dt;
  }
  return t;
}

describe('Red-Team Sprint 2 Anti-Lunch-Tray, Zero-Voices, Offline Zero-CDN & SW Gates', () => {
  it('enforces ZERO occurrences of speechSynthesis or SpeechSynthesisUtterance across all shipped src/ files and index.html', () => {
    const files = [...walkFiles(SRC_DIR, SOURCE_EXTS), INDEX_HTML];
    expect(files.length).toBeGreaterThan(40);

    const hits: string[] = [];
    for (const file of files) {
      expect(statSync(file).isFile()).toBe(true);
      const stripped = stripComments(readFileSync(file, 'utf8'));
      if (/\b(?:speechSynthesis|SpeechSynthesisUtterance)\b/i.test(stripped)) {
        hits.push(relative(ROOT, file));
      }
    }

    expect(hits).toEqual([]);
  });

  it('enforces ZERO external CDN or http(s) URLs in src/styles/ and index.html', () => {
    const files = [...walkFiles(STYLES_DIR, SOURCE_EXTS), INDEX_HTML];
    expect(files.length).toBeGreaterThanOrEqual(2);

    const violations: Array<{ file: string; match: string }> = [];
    const forbiddenUrl = /(?:https?:\/\/|\/\/fonts\.|@import\s+url\()/gi;

    for (const file of files) {
      const raw = readFileSync(file, 'utf8');
      for (const m of raw.matchAll(forbiddenUrl)) {
        violations.push({ file: relative(ROOT, file), match: m[0] });
      }
    }

    expect(violations).toEqual([]);
  });

  it('enforces Anti-Lunch-Tray aesthetic: ZERO brown tray hexes, ZERO CSS dashed borders, and ZERO inline <svg> in src/ui/**', () => {
    const forbiddenBrown = /#(?:8b5a2b|6b4423|a0522d|d2b48c)\b/gi;
    const cssAndUiFiles = [...walkFiles(STYLES_DIR, SOURCE_EXTS), ...walkFiles(UI_DIR, SOURCE_EXTS)];
    expect(cssAndUiFiles.length).toBeGreaterThan(8);

    const brownHits: Array<{ file: string; match: string }> = [];
    for (const file of cssAndUiFiles) {
      const stripped = stripComments(readFileSync(file, 'utf8'));
      for (const m of stripped.matchAll(forbiddenBrown)) {
        brownHits.push({ file: relative(ROOT, file), match: m[0] });
      }
    }
    expect(brownHits).toEqual([]);

    // ZERO CSS dashed borders in src/styles/main.css
    const strippedCss = stripComments(readFileSync(MAIN_CSS, 'utf8'));
    const dashedMatches = [...strippedCss.matchAll(/\bdashed\b/gi)].map((m) => m[0]);
    expect(dashedMatches).toEqual([]);

    // ZERO inline <svg> or SVG DOM creation in src/ui/**
    const svgHits: Array<{ file: string; match: string }> = [];
    for (const file of walkFiles(UI_DIR, SOURCE_EXTS)) {
      const stripped = stripComments(readFileSync(file, 'utf8'));
      for (const m of stripped.matchAll(/<svg\b|createElementNS\([^)]*svg/gi)) {
        svgHits.push({ file: relative(ROOT, file), match: m[0] });
      }
    }
    expect(svgHits).toEqual([]);
  });

  it('enforces ZERO legacy tab-strip chrome and ZERO Next Page / Turn early button text on main HUD', () => {
    const uiFiles = walkFiles(UI_DIR, SOURCE_EXTS);
    expect(uiFiles.length).toBeGreaterThan(5);

    const violations: Array<{ file: string; rule: string; match: string }> = [];

    const rules: ReadonlyArray<{ rule: string; re: RegExp }> = [
      { rule: 'role-tab', re: /role\s*[:=]\s*['"]tablist?['"]|setAttribute\(\s*['"]role['"]\s*,\s*['"]tablist?['"]\s*\)/gi },
      { rule: 'legacy-tab-class', re: /\bcc-tabs?\b|data-tab\s*[:=]/gi },
      { rule: 'legacy-next-page-text', re: /['"`][^'"`]*Next Page[^'"`]*['"`]/g },
      { rule: 'legacy-turn-early-text', re: /['"`][^'"`]*Turn early[^'"`]*['"`]/gi },
      { rule: 'legacy-next-early-btn-class', re: /['"`][^'"`]*\bcc-(?:next|early)\b[^'"`]*['"`]/g },
    ];

    for (const file of uiFiles) {
      const stripped = stripComments(readFileSync(file, 'utf8'));
      for (const { rule, re } of rules) {
        re.lastIndex = 0;
        for (const m of stripped.matchAll(re)) {
          violations.push({ file: relative(ROOT, file), rule, match: m[0] });
        }
      }
    }

    // Strict case-insensitive check on main HUD (src/ui/hud.ts)
    const hudCode = stripComments(readFileSync(resolve(UI_DIR, 'hud.ts'), 'utf8'));
    expect(hudCode).not.toMatch(/Next Page|Turn early/i);
    expect(violations).toEqual([]);

    // Hub uses 4 craft stations (Paintbox, Wardrobe, Bookshelf, Trinkets), never legacy Mediums/Badges/Books tab strip
    const hubCode = stripComments(readFileSync(resolve(UI_DIR, 'hub.ts'), 'utf8'));
    for (const legacyLabel of ['Mediums', 'Badges', 'Books']) {
      expect(hubCode).not.toMatch(new RegExp(`['"]${legacyLabel}['"]`));
    }
  });

  it('verifies CACHE_VERSION === "chroma-cosmos-v3" and matches public/sw.js verbatim', () => {
    expect(CACHE_VERSION).toBe('chroma-cosmos-v3');
    const swSource = readFileSync(resolve(PUBLIC_DIR, 'sw.js'), 'utf8');
    expect(swSource).toMatch(/const\s+CACHE_VERSION\s*=\s*['"]chroma-cosmos-v3['"]\s*;/);
  });
});

describe('Red-Team Sprint 2 Expanded Item Catalog & Smooth 10..50 Gem Economy', () => {
  it('enforces exact Sprint 2 catalog counts (10 Brushes + 10 Relics = 20, 10 Exotic / 17 Total Mediums, 14 Wardrobe) and 10..50 gem pricing', () => {
    expect(ACTIVE_BRUSH_IDS).toHaveLength(10);
    expect(RELIC_IDS).toHaveLength(10);
    expect(DRAFT_CARDS).toHaveLength(20);
    expect(new Set(DRAFT_CARDS.map((c) => c.id)).size).toBe(20);

    expect(UNLOCKABLE_MATERIAL_IDS).toHaveLength(10);
    expect(MATERIALS).toHaveLength(17);
    expect(MAX_MATERIAL_ID).toBe(17);
    expect(WARDROBE_ITEMS).toHaveLength(14);

    expect(EXPANDED_ITEM_CATALOG.brushes).toHaveLength(10);
    expect(EXPANDED_ITEM_CATALOG.relics).toHaveLength(10);
    expect(EXPANDED_ITEM_CATALOG.exoticMediums).toHaveLength(10);
    expect(EXPANDED_ITEM_CATALOG.wardrobe).toHaveLength(14);
    expect(EXPANDED_ITEM_CATALOG.counts).toEqual({
      brushes: 10,
      relics: 10,
      totalRunUpgrades: 20,
      unlockableMediums: 10,
      totalMediums: 17,
      wardrobe: 14,
    });

    // Smooth 10..50 gem pricing across all unlockable exotic mediums & wardrobe accessories
    const exoticCosts = EXPANDED_ITEM_CATALOG.exoticMediums.map((m) => m.unlockCost);
    expect(Math.min(...exoticCosts)).toBe(10);
    expect(Math.max(...exoticCosts)).toBe(50);
    for (const c of exoticCosts) {
      expect(c).toBeGreaterThanOrEqual(10);
      expect(c).toBeLessThanOrEqual(50);
    }

    const wardrobeCosts = EXPANDED_ITEM_CATALOG.wardrobe.map((w) => w.cost);
    expect(Math.min(...wardrobeCosts)).toBe(10);
    for (const c of wardrobeCosts) {
      expect(c).toBeGreaterThanOrEqual(10);
      expect(c).toBeLessThanOrEqual(50);
    }

    // Chapter 1 (4 quests + page complete) guarantees an immediate affordable unlock (>= 10 gems)
    const ch1MinimumGems = 4 * GEM_REWARDS.questBloom + GEM_REWARDS.pageComplete;
    expect(ch1MinimumGems).toBeGreaterThanOrEqual(10);
  });
});

describe('Red-Team Sprint 2 Hero Quests (82% / 74% Auto-Bloom) & 2.8s Auto-Page-Turn Finale', () => {
  it('compiles 3..4 disjoint Composite Hero Quests across all 8 chapters (including 3-quest whaleSea)', () => {
    const art = createArt();
    const chapterIds: ChapterId[] = CHAPTERS.map((c) => c.id);
    expect(chapterIds).toHaveLength(8);
    expect(chapterIds).toContain('whaleSea');

    for (const chapterId of chapterIds) {
      const page = art.compilePage(chapterId, 4242, DEFAULT_WARDROBE);
      const quests = page.heroQuests!;
      expect(quests).toBeDefined();
      if (chapterId === 'whaleSea') {
        expect(quests).toHaveLength(3);
      } else {
        expect(quests).toHaveLength(4);
      }
      expect(page.storyMilestones).toHaveLength(quests.length);

      const seenRegions = new Set<number>();
      for (const q of quests) {
        const words = q.label.trim().split(/\s+/).filter(Boolean);
        expect(words.length).toBeGreaterThanOrEqual(1);
        expect(words.length).toBeLessThanOrEqual(2);
        expect(q.regionIds.length).toBeGreaterThan(0);
        for (const rid of q.regionIds) {
          expect(seenRegions.has(rid)).toBe(false);
          seenRegions.add(rid);
          expect(page.regions[rid]?.coverageExcluded).toBe(false);
        }
      }
    }
  });

  it('auto-blooms Composite Hero Quest at 82% (and 74% with constellationCrown) on real compiled chapter', () => {
    expect(HERO_QUEST_BLOOM_THRESHOLD).toBe(0.82);
    expect(CROWN_QUEST_BLOOM_THRESHOLD).toBe(0.74);

    const art = createArt();
    // milkshakeNebula's `milkshake` quest spans 5 sub-regions (~9220px), allowing <1% per-stamp granularity
    // to verify the exact gap between 74% (Crown Seal) and 82% (standard Auto-Bloom).
    const page = art.compilePage('milkshakeNebula', 4242, DEFAULT_WARDROBE);
    const milkshakeSpec = page.heroQuests!.find((q) => q.questId === 'milkshake')!;
    expect(milkshakeSpec.regionIds.length).toBeGreaterThanOrEqual(3);

    // 1. Standard 82% Composite Hero Quest Auto-Bloom
    const simStd = createSimulation();
    simStd.loadPage(page, { seed: 4242, chapterIndex: 1, brushes: ['standard'], relics: [], playPrologue: false });
    simStd.drainEvents();

    const midStd = paintQuestGradually(simStd, page, 'milkshake', 0.76, 13, false);
    expect(midStd.completed).toBe(false);
    expect(midStd.progress).toBeGreaterThanOrEqual(CROWN_QUEST_BLOOM_THRESHOLD);
    expect(midStd.progress).toBeLessThan(HERO_QUEST_BLOOM_THRESHOLD);

    simStd.drainEvents();
    const doneStd = paintQuestGradually(simStd, page, 'milkshake', 0.99, 17, true);
    expect(doneStd.completed).toBe(true);
    expect(doneStd.progress).toBe(1);
    expect(doneStd.progressBeforeComplete).toBeLessThan(HERO_QUEST_BLOOM_THRESHOLD);

    for (const rid of milkshakeSpec.regionIds) {
      expect(simStd.regionPercent(rid)).toBe(1);
    }

    const bloomEvs = simStd.drainEvents();
    expect(bloomEvs.filter((e) => e.type === 'heroQuestComplete' && e.questId === 'milkshake')).toHaveLength(1);
    expect(bloomEvs.filter((e) => e.type === 'storyStarLit' && e.milestoneId === 'milkshake')).toHaveLength(1);
    expect(bloomEvs.some((e) => e.type === 'gems' && e.reason === 'questBloom' && e.amount === GEM_REWARDS.questBloom)).toBe(true);

    // 2. Lowered 74% Composite Auto-Bloom with Constellation Crown Seal relic
    const simCrown = createSimulation();
    simCrown.loadPage(page, {
      seed: 4242,
      chapterIndex: 1,
      brushes: ['standard'],
      relics: ['constellationCrown'],
      playPrologue: false,
    });
    simCrown.drainEvents();

    const doneCrown = paintQuestGradually(simCrown, page, 'milkshake', 0.78, 17, false);
    expect(doneCrown.completed).toBe(true);
    expect(doneCrown.progress).toBe(1);
    expect(doneCrown.progressBeforeComplete).toBeLessThan(HERO_QUEST_BLOOM_THRESHOLD);
    for (const rid of milkshakeSpec.regionIds) {
      expect(simCrown.regionPercent(rid)).toBe(1);
    }
    expect(simCrown.view().effects.some((e) => e.kind === 'crownFireworks')).toBe(true);
  });

  it('runs 2.8s PageFinaleController on real compiled whaleSea, pauses on Stay & Doodle, and emits autoPageTurnReady once', () => {
    expect(PAGE_FINALE_MS).toBe(2800);

    // Unit-level controller invariant
    const ctrl = createPageFinaleController();
    ctrl.start();
    expect(ctrl.update(1400)).toBe(false);
    ctrl.setStayAndDoodle(true);
    expect(ctrl.update(5000)).toBe(false);
    ctrl.setStayAndDoodle(false);
    expect(ctrl.update(1400)).toBe(true);
    expect(ctrl.update(500)).toBe(false);

    // Integration on real compiled whaleSea (3 Hero Quests)
    const art = createArt();
    const page = art.compilePage('whaleSea', 4242, DEFAULT_WARDROBE);
    const sim = createSimulation();
    sim.loadPage(page, { seed: 4242, chapterIndex: 3, brushes: ['standard'], relics: [], playPrologue: false });
    sim.drainEvents();

    for (const q of page.heroQuests!) {
      for (const rid of q.regionIds) {
        if (sim.regionPercent(rid) < 1) {
          paintCompiledRegion(sim, rid, 14);
        }
      }
    }

    const completeEvs = sim.drainEvents();
    expect(completeEvs.some((e) => e.type === 'pageComplete')).toBe(true);
    expect(sim.view().pageComplete).toBe(true);
    expect(sim.view().pageFinale).toMatchObject({
      active: true,
      durationMs: PAGE_FINALE_MS,
      stayAndDoodle: false,
      autoTurnTriggered: false,
    });

    // Advance 1000ms -> still counting down
    let clock = advanceSim(sim, 1000, 50, 0);
    expect(sim.drainEvents().filter((e) => e.type === 'autoPageTurnReady')).toHaveLength(0);
    expect(sim.view().pageFinale!.remainingMs).toBe(PAGE_FINALE_MS - 1000);

    // Pause with Stay & Doodle -> never fires across 6000ms
    sim.setStayAndDoodle!(true);
    clock = advanceSim(sim, 6000, 50, clock);
    expect(sim.view().pageFinale!.stayAndDoodle).toBe(true);
    expect(sim.view().pageFinale!.remainingMs).toBe(PAGE_FINALE_MS - 1000);
    expect(sim.drainEvents().filter((e) => e.type === 'autoPageTurnReady')).toHaveLength(0);

    // Resume -> emits autoPageTurnReady exactly once after remaining 1800ms
    sim.setStayAndDoodle!(false);
    clock = advanceSim(sim, PAGE_FINALE_MS - 1000, 50, clock);
    expect(sim.drainEvents().filter((e) => e.type === 'autoPageTurnReady')).toHaveLength(1);
    expect(sim.view().pageFinale!.autoTurnTriggered).toBe(true);

    advanceSim(sim, 2000, 50, clock);
    expect(sim.drainEvents().filter((e) => e.type === 'autoPageTurnReady')).toHaveLength(0);
  });
});

describe('Red-Team Sprint 2 Active Firefly Hint Lantern, 4.5s Idle Sync-Pulse & 65% Sliver-Rescue', () => {
  it('routes Firefly Hint Lantern & tap-medallion spotlight, dissolves Sleepy Hush prologue, runs 4.5s idle sync-pulse & 3s sliver-rescue', () => {
    expect(IDLE_WISP_DELAY_MS).toBe(4500);
    expect(STALLED_QUEST_DELAY_MS).toBe(3000);
    expect(STALLED_QUEST_THRESHOLD).toBe(0.65);
    expect(HINT_SPOTLIGHT_MS).toBe(2500);

    const art = createArt();
    const page = art.compilePage('rooftop', 4242, DEFAULT_WARDROBE);
    const sim = createSimulation();

    sim.loadPage(page, {
      seed: 4242,
      chapterIndex: 0,
      brushes: ['standard'],
      relics: [],
      playPrologue: true,
    });
    sim.setTool({ materialId: 1, brush: 'standard', doodle: false, toolMode: 'pencil' });

    // Sleepy Hush prologue -> Wisp tap -> ghost-stroke
    let clock = 0;
    expect(sim.view().wisp!.mode).toBe('prologueMist');
    clock = advanceSim(sim, 2400, 50, clock);
    expect(sim.view().wisp!.mode).toBe('prologueTapPencil');
    clock = advanceSim(sim, 1100, 50, clock);
    expect(sim.view().wisp!.mode).toBe('prologueStroke');
    clock = advanceSim(sim, PROLOGUE_DURATION_MS - 3500 + 200, 50, clock);
    expect(sim.view().wisp!.active).toBe(true);
    sim.drainEvents();

    // 1. Active Firefly Hint Lantern (requestHint) dissolves prologue & spotlights first incomplete quest
    const hint1 = sim.requestHint!(undefined, 'lantern');
    expect(hint1.active).toBe(true);
    expect(hint1.source).toBe('lantern');
    expect(hint1.questId).toBe('violet');
    expect(hint1.dimAmount).toBeGreaterThan(0);
    expect(hint1.remainingMs).toBe(HINT_SPOTLIGHT_MS);
    expect(hint1.targetRegionIds.length).toBeGreaterThan(0);

    const hintEvs = sim.drainEvents();
    expect(hintEvs.some((e) => e.type === 'prologueEnd')).toBe(true);
    expect(hintEvs.some((e) => e.type === 'hintStarted' && e.questId === 'violet' && e.source === 'lantern')).toBe(true);

    const vHint1 = sim.view();
    expect(vHint1.wisp!.active).toBe(true);
    expect(vHint1.wisp!.mode).toBe('hintBeam');
    expect(vHint1.wisp!.ghostPath.length).toBeGreaterThanOrEqual(2);
    for (const rid of hint1.targetRegionIds) {
      expect(vHint1.regionState[rid * 4 + 3]! & REGION_FLAG.spotlight).toBe(REGION_FLAG.spotlight);
    }

    // 2. Zero-cooldown tap-medallion routing to Lumi transfers spotlight cleanly
    const hint2 = sim.requestHint!('lumi', 'medallion');
    expect(hint2.active).toBe(true);
    expect(hint2.source).toBe('medallion');
    expect(hint2.questId).toBe('lumi');
    expect(hint2.dimAmount).toBeGreaterThan(0);
    const vHint2 = sim.view();
    for (const rid of hint2.targetRegionIds) {
      expect(vHint2.regionState[rid * 4 + 3]! & REGION_FLAG.spotlight).toBe(REGION_FLAG.spotlight);
    }
    for (const rid of hint1.targetRegionIds) {
      expect(vHint2.regionState[rid * 4 + 3]! & REGION_FLAG.spotlight).toBe(0);
    }

    // Painting Lumi's target region clears spotlight cleanly
    const lumiFirst = hint2.targetRegionIds[0]!;
    const lumiPts = sim.qaStrokePath(lumiFirst);
    sim.gesture(makeGesture('start', lumiPts[0]!.x, lumiPts[0]!.y, clock));
    sim.gesture(makeGesture('end', lumiPts[0]!.x, lumiPts[0]!.y, clock + 16));
    expect(sim.view().hintState!.active).toBe(false);
    expect(sim.view().hintState!.dimAmount).toBe(0);

    // 3. 4.5s idle sync-pulse highlights next unlit Hero Quest + regions
    sim.drainEvents();
    sim.hover({ x: 240, y: 135 });
    clock = advanceSim(sim, IDLE_WISP_DELAY_MS - 300, 50, clock);
    expect(sim.view().wisp!.active).toBe(false);
    expect(sim.view().heroQuests!.some((q) => q.highlighted)).toBe(false);

    clock = advanceSim(sim, 400, 50, clock);
    const vIdle = sim.view();
    expect(vIdle.wisp!.active).toBe(true);
    expect(vIdle.wisp!.mode).toBe('idleGuide');
    expect(vIdle.heroQuests![0]!.highlighted).toBe(true);
    expect(vIdle.regionState[vIdle.wisp!.targetRegionId * 4 + 3]! & REGION_FLAG.guideGlow).toBe(REGION_FLAG.guideGlow);

    // Meaningful hover clears idle Wisp immediately
    sim.hover({ x: 280, y: 135 });
    expect(sim.view().wisp!.active).toBe(false);

    // 4. >=65% 3s sliver-rescue on Violet (below 4.5s idle Wisp!)
    const partial = paintQuestGradually(sim, page, 'violet', 0.7, 6, false);
    expect(partial.completed).toBe(false);
    expect(partial.progress).toBeGreaterThanOrEqual(STALLED_QUEST_THRESHOLD);
    expect(partial.progress).toBeLessThan(HERO_QUEST_BLOOM_THRESHOLD);

    clock = advanceSim(sim, STALLED_QUEST_DELAY_MS - 200, 50, clock);
    expect(sim.view().heroQuests!.find((q) => q.questId === 'violet')!.stalled).toBe(false);

    clock = advanceSim(sim, 300, 50, clock);
    const vStalled = sim.view();
    const violetQ = vStalled.heroQuests!.find((q) => q.questId === 'violet')!;
    expect(violetQ.stalled).toBe(true);
    const hasGuidedSliver = violetQ.regionIds.some(
      (rid) => sim.regionPercent(rid) < 1 && (vStalled.regionState[rid * 4 + 3]! & REGION_FLAG.guideGlow) === REGION_FLAG.guideGlow,
    );
    expect(hasGuidedSliver).toBe(true);
  });
});

describe('Red-Team Sprint 1 -> Sprint 2 krunked-cookie-vault-v1 Migration & Bidirectional Self-Healing', () => {
  it('migrates frozen Sprint 1 cookie losslessly into 14-item WardrobeState and self-heals bidirectionally across LS, IDB & Cookie', async () => {
    const lsMap = new Map<string, string>();
    const ls: VaultBackends['localStorage'] = {
      getItem: (k) => lsMap.get(k) ?? null,
      setItem: (k, v) => void lsMap.set(k, v),
      removeItem: (k) => void lsMap.delete(k),
    };
    let cookieRaw: string | undefined = FROZEN_SPRINT1_COOKIE;
    const cookie: VaultBackends['cookie'] = {
      read: () => (cookieRaw ? `${VAULT_COOKIE_NAME}=${cookieRaw}` : ''),
      write: (str) => {
        const first = str.split(';')[0]!;
        const eq = first.indexOf('=');
        if (first.slice(0, eq) !== VAULT_COOKIE_NAME) return;
        expect(str.endsWith(`; ${VAULT_COOKIE_ATTRS}`)).toBe(true);
        cookieRaw = first.slice(eq + 1);
      },
    };
    let idb = new IDBFactory();
    let nowMs = 1_800_000_000_000;

    // Step 1: Hydrate from frozen Sprint 1 cookie with empty LS & IDB -> migrates & heals both
    const v1 = createVault({ localStorage: ls, indexedDB: idb, cookie, now: () => nowMs });
    const rep1 = await v1.hydrate();
    expect(rep1.source).toBe('cookie');
    expect(rep1.healed).toEqual(expect.arrayContaining(['localStorage', 'indexedDB']));

    const migrated = v1.get();
    expect(migrated.gems).toBe(185);
    expect(migrated.unlockedMaterials).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 12]);
    expect(Object.keys(migrated.wardrobe)).toHaveLength(14);
    expect(migrated.wardrobe.violetPins).toBe(true);
    expect(migrated.wardrobe.lumiCrown).toBe(true);
    expect(migrated.wardrobe.novaScarf).toBe(true);
    expect(migrated.wardrobe.violetHeadphones).toBe(false);
    expect(migrated.wardrobe.novaGalaxyBowtie).toBe(false);
    expect(migrated.discoveredCards).toEqual([]);
    expect(migrated.prologueSeen).toBe(true);

    // Step 2: Mutate with brand-new Sprint 2 progression items (exotic 17, wardrobe item 14, Sprint 2 brush/relic)
    nowMs += 5000;
    v1.update((d) => {
      d.gems += 40;
      d.unlockedMaterials.push(13, 17);
      d.wardrobeOwned.push('violetSaturnHalo', 'novaGalaxyBowtie');
      d.wardrobe.violetSaturnHalo = true;
      d.discoveredCards = ['moonbeamQuill', 'constellationCrown'];
      if (d.run) {
        d.run.brushes.push('moonbeamQuill');
        d.run.relics.push('constellationCrown');
      }
    });
    v1.healCheck();
    await v1.flush();

    expect(cookieRaw).toBeDefined();
    expect(cookieRaw!.length).toBeLessThan(1500);

    // Step 3: Bidirectional Direction A — Wipe LS + IDB -> hydrate recovers 100% of Sprint 2 state from cookie
    lsMap.clear();
    idb = new IDBFactory();
    const v2 = createVault({ localStorage: ls, indexedDB: idb, cookie, now: () => nowMs });
    const rep2 = await v2.hydrate();
    expect(rep2.source).toBe('cookie');
    expect(rep2.healed).toEqual(expect.arrayContaining(['localStorage', 'indexedDB']));
    expect(v2.get().gems).toBe(225);
    expect(v2.get().unlockedMaterials).toContain(17);
    expect(v2.get().wardrobe.violetSaturnHalo).toBe(true);
    expect(v2.get().discoveredCards).toEqual(['moonbeamQuill', 'constellationCrown']);
    expect(v2.get().run?.brushes).toContain('moonbeamQuill');
    expect(v2.get().run?.relics).toContain('constellationCrown');

    // Step 4: Bidirectional Direction B — Wipe cookie -> healCheck() regenerates intact Sprint 2 cookie
    cookieRaw = undefined;
    expect(extractCookieValue(cookie.read())).toBeNull();
    v2.healCheck();
    const regenerated = extractCookieValue(cookie.read());
    expect(regenerated).not.toBeNull();
    expect(regenerated!.length).toBeLessThan(1500);
    const decoded = decodeCookieValue(regenerated);
    expect(decoded?.gems).toBe(225);
    expect(decoded?.unlockedMaterials).toContain(17);
    expect(decoded?.wardrobe.violetSaturnHalo).toBe(true);
    expect(decoded?.discoveredCards).toEqual(['moonbeamQuill', 'constellationCrown']);
  });
});
