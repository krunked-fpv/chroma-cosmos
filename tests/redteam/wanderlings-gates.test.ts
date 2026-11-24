import { readdirSync, readFileSync, statSync } from 'node:fs';
import { extname, join, relative, resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { createArt } from '../../src/art';
import {
  CACHE_VERSION,
  IDLE_WISP_DELAY_MS,
  PROLOGUE_DURATION_MS,
  REGION_FLAG,
} from '../../src/contracts';
import type { GestureEvent, MaterialId, WardrobeState } from '../../src/contracts';
import { createSimulation } from '../../src/simulation';

const ROOT = resolve(process.cwd());
const SRC_DIR = resolve(ROOT, 'src');
const STYLES_DIR = resolve(SRC_DIR, 'styles');
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
};

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

describe('Red-Team Wanderlings Zero-Voices, Offline Zero-CDN & Anti-Chrome Gates', () => {
  it('enforces ZERO occurrences of speechSynthesis or SpeechSynthesisUtterance across all shipped src/ files and index.html', () => {
    const files = [...walkFiles(SRC_DIR, SOURCE_EXTS), INDEX_HTML];
    expect(files.length).toBeGreaterThan(40);

    const hits: string[] = [];
    for (const file of files) {
      expect(statSync(file).isFile()).toBe(true);
      const raw = readFileSync(file, 'utf8');
      if (/\b(?:speechSynthesis|SpeechSynthesisUtterance)\b/i.test(raw)) {
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

  it('enforces ZERO legacy tab-strip chrome and ZERO Next Page / Turn early button text in src/ui/', () => {
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

    expect(violations).toEqual([]);

    // Also verify none of the legacy tab labels ("Mediums", "Wardrobe", "Badges", "Books") appear as tab buttons in src/ui/hub.ts
    const hubCode = stripComments(readFileSync(resolve(UI_DIR, 'hub.ts'), 'utf8'));
    for (const legacyLabel of ['Mediums', 'Wardrobe', 'Badges', 'Books']) {
      expect(hubCode).not.toMatch(new RegExp(`['"]${legacyLabel}['"]`));
    }
  });

  it('verifies CACHE_VERSION === "chroma-cosmos-v2" and matches public/sw.js verbatim', () => {
    expect(CACHE_VERSION).toBe('chroma-cosmos-v2');
    const swSource = readFileSync(resolve(PUBLIC_DIR, 'sw.js'), 'utf8');
    expect(swSource).toMatch(/const\s+CACHE_VERSION\s*=\s*['"]chroma-cosmos-v2['"]\s*;/);
  });
});

describe('Red-Team Dual-Star Disambiguation, Sleepy Hush Prologue & 7s Idle Wisp Integration', () => {
  it('disambiguates Bookmark Story Stars (3..5 narrative sockets) from Prism Stardust Crystals (gems currency) on real compiled Chapter 1', () => {
    const art = createArt();
    const page = art.compilePage('rooftop', 4242, DEFAULT_WARDROBE);

    expect(page.storyMilestones).toBeDefined();
    const milestones = page.storyMilestones!;
    expect(milestones.length).toBeGreaterThanOrEqual(3);
    expect(milestones.length).toBeLessThanOrEqual(5);

    // Milestones must cleanly partition every core region without overlap.
    const milestoneRegionIds = milestones.flatMap((m) => m.regionIds).sort((a, b) => a - b);
    const coreSorted = [...page.coreRegionIds].sort((a, b) => a - b);
    expect(milestoneRegionIds).toEqual(coreSorted);

    const sim = createSimulation();
    sim.loadPage(page, {
      seed: 4242,
      chapterIndex: 0,
      brushes: ['standard'],
      relics: [],
      playPrologue: false,
    });

    const initialStars = sim.view().storyStars!;
    expect(initialStars.length).toBe(milestones.length);
    expect(initialStars.every((s) => !s.lit && s.progress === 0)).toBe(true);

    // Paint ONLY the first region of the Violet milestone: gems (Stardust Crystals) are awarded immediately
    // on region bloom, while Violet's Bookmark Story Star remains UNLIT until all of Violet's regions bloom!
    const violetMilestone = initialStars.find((s) => s.id === 'violet')!;
    expect(violetMilestone.regionIds.length).toBeGreaterThan(1);

    paintCompiledRegion(sim, violetMilestone.regionIds[0]!, 7);
    const firstEvs = sim.drainEvents();
    const firstGems = firstEvs
      .filter((e) => e.type === 'gems')
      .reduce((sum, e) => sum + e.amount, 0);
    const firstStarsLit = firstEvs.filter((e) => e.type === 'storyStarLit');

    expect(firstGems).toBeGreaterThan(0);
    expect(firstStarsLit).toHaveLength(0);
    const violetPartial = sim.view().storyStars!.find((s) => s.id === 'violet')!;
    expect(violetPartial.lit).toBe(false);
    expect(violetPartial.progress).toBeGreaterThan(0);
    expect(violetPartial.progress).toBeLessThan(1);

    // Finish Violet's remaining regions -> exactly 1 Story Star lights up, while total Stardust Crystals >> 1!
    for (const rid of violetMilestone.regionIds.slice(1)) {
      paintCompiledRegion(sim, rid, 1);
    }
    const restVioletEvs = sim.drainEvents();
    const restGems = restVioletEvs
      .filter((e) => e.type === 'gems')
      .reduce((sum, e) => sum + e.amount, 0);
    const violetStarEvents = restVioletEvs.filter((e) => e.type === 'storyStarLit');

    expect(violetStarEvents).toHaveLength(1);
    expect(violetStarEvents[0]!.milestoneId).toBe('violet');
    expect(firstGems + restGems).toBeGreaterThan(violetStarEvents.length * 5);

    const starsAfterViolet = sim.view().storyStars!;
    expect(starsAfterViolet.filter((s) => s.lit).map((s) => s.id)).toEqual(['violet']);

    // Nudging an unlit milestone triggers Wisp guidance without granting any Stardust Crystals.
    sim.nudgeMilestone!('lumi');
    const nudgeEvs = sim.drainEvents();
    expect(nudgeEvs.some((e) => e.type === 'wispGuide' && e.mode === 'nudge')).toBe(true);
    expect(nudgeEvs.some((e) => e.type === 'gems')).toBe(false);
    expect(sim.view().wisp?.active).toBe(true);
    expect(sim.view().wisp?.mode).toBe('nudge');
  });

  it('runs Sleepy Hush prologue -> Wisp tap/ghost-stroke -> immediate dissolve on first stroke -> 7s idle Wisp guide on real compiled Chapter 1', () => {
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

    // Phase 1: Sleepy Hush mist veil active right on Chapter 1 entry
    let clock = 0;
    const w0 = sim.view().wisp!;
    expect(w0.active).toBe(true);
    expect(w0.mode).toBe('prologueMist');
    expect(w0.prologueMist).toBeGreaterThan(0);
    expect(w0.ghostPath.length).toBeGreaterThanOrEqual(8);

    // Phase 2: ~2.4s -> Wisp flutters down toward Enchanted Pencil
    clock = advanceSim(sim, 2400, 50, clock);
    const wTap = sim.view().wisp!;
    expect(wTap.active).toBe(true);
    expect(wTap.mode).toBe('prologueTapPencil');

    // Phase 3: ~3.5s -> Wisp performs luminous ghost-stroke across target region
    clock = advanceSim(sim, 1100, 50, clock);
    const wStroke = sim.view().wisp!;
    expect(wStroke.active).toBe(true);
    expect(wStroke.mode).toBe('prologueStroke');
    expect(wStroke.ghostStrokeT).toBeGreaterThan(0);

    // Still active after PROLOGUE_DURATION_MS until child paints first stroke
    clock = advanceSim(sim, PROLOGUE_DURATION_MS - 3500 + 200, 50, clock);
    expect(sim.view().wisp!.active).toBe(true);
    expect(sim.view().wisp!.mode).toBe('prologueStroke');
    expect(sim.view().wisp!.prologueMist).toBe(0);

    // First stroke is never blocked and dissolves prologue cleanly
    const targetId = wStroke.targetRegionId;
    const pts = sim.qaStrokePath(targetId);
    expect(pts.length).toBeGreaterThan(0);
    sim.gesture(makeGesture('start', pts[0]!.x, pts[0]!.y));
    sim.gesture(makeGesture('move', pts[Math.min(2, pts.length - 1)]!.x, pts[Math.min(2, pts.length - 1)]!.y));
    sim.gesture(makeGesture('end', pts[Math.min(2, pts.length - 1)]!.x, pts[Math.min(2, pts.length - 1)]!.y));

    expect(sim.regionPercent(targetId)).toBeGreaterThan(0);
    const dissolveEvs = sim.drainEvents();
    expect(dissolveEvs.filter((e) => e.type === 'prologueEnd')).toHaveLength(1);
    expect(sim.view().wisp!.active).toBe(false);
    expect(sim.view().wisp!.mode).toBe('hidden');

    // 7-second idle Starlight Wisp trigger
    sim.hover({ x: 240, y: 135 });
    clock = advanceSim(sim, IDLE_WISP_DELAY_MS - 300, 50, clock);
    expect(sim.view().wisp!.active).toBe(false);
    expect(sim.drainEvents().some((e) => e.type === 'wispGuide')).toBe(false);

    clock = advanceSim(sim, 400, 50, clock);
    const vIdle = sim.view();
    expect(vIdle.wisp!.active).toBe(true);
    expect(vIdle.wisp!.mode).toBe('idleGuide');
    expect(vIdle.wisp!.targetRegionId).toBeGreaterThan(0);
    expect(vIdle.regionState[vIdle.wisp!.targetRegionId * 4 + 3]! & REGION_FLAG.guideGlow).toBe(
      REGION_FLAG.guideGlow,
    );
    expect(sim.drainEvents()).toContainEqual({
      type: 'wispGuide',
      regionId: vIdle.wisp!.targetRegionId,
      mode: 'idleGuide',
    });

    // Meaningful hover clears idle Wisp & guideGlow immediately
    sim.hover({ x: 280, y: 135 });
    const vCleared = sim.view();
    expect(vCleared.wisp!.active).toBe(false);
    expect(vCleared.wisp!.mode).toBe('hidden');
    expect(vCleared.regionState[vIdle.wisp!.targetRegionId * 4 + 3]! & REGION_FLAG.guideGlow).toBe(0);
  });
});
