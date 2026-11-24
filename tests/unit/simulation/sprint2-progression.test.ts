import { describe, expect, it } from 'vitest';
import {
  CROWN_QUEST_BLOOM_THRESHOLD,
  GEM_REWARDS,
  HERO_QUEST_BLOOM_THRESHOLD,
  HINT_SPOTLIGHT_MS,
  IDLE_WISP_DELAY_MS,
  MAX_MATERIAL_ID,
  PAGE_FINALE_MS,
  PAGE_W,
  REGION_FLAG,
  STALLED_QUEST_DELAY_MS,
  STALLED_QUEST_THRESHOLD,
} from '../../../src/contracts';
import type { HeroStoryQuestSpec, MaterialId, SimEvent } from '../../../src/contracts';
import { createPageFinaleController, createSimulation } from '../../../src/simulation';
import { buildFixture, ctxOf, RECTS } from './fixture';
import { count, drag, mkSim, paintRegion, run, setTool, tap } from './helpers';

function buildHeroQuestPage(heroQuests?: HeroStoryQuestSpec[]) {
  const p = buildFixture();
  if (heroQuests) p.heroQuests = heroQuests;
  return p;
}

describe('Composite Hero Story Quest 82% Auto-Bloom (74% with Crown)', () => {
  it('auto-blooms remaining quest micro-slivers at exactly 82% weighted coverage using last-used material without double-awarding gems', () => {
    // Quest 'violet': region 1 (40x70 = 2800px), region 2 (40x70 = 2800px), plus micro-sliver region 3 (20x30 = 600px) -> total 6200px
    // Painting region 1 (2800) + ~85% of region 2 (~2380) reaches 5180/6200 = 83.5% >= 82% while micro-sliver region 3 is 0%!
    const rects = RECTS.concat([{ id: 3, x0: 428, y0: 190, x1: 447, y1: 219, kind: 'violet' }]);
    const page = buildFixture({ rects });
    page.coreRegionIds = [1, 2, 3, 5, 6];
    page.heroQuests = [
      { questId: 'violet', label: 'Violet', thumbnailSpriteId: 'quest_violet', regionIds: [1, 2, 3], centroid: { x: 380, y: 225 } },
      { questId: 'lumi', label: 'Lumi', thumbnailSpriteId: 'quest_lumi', regionIds: [5, 6], centroid: { x: 100, y: 225 } },
    ];

    const sim = createSimulation();
    sim.loadPage(page, ctxOf());
    sim.drainEvents();

    // Paint region 1 with material 13 (StrawberrySupernova) -> 2800/6200 = 45.2% < 82%
    paintRegion(sim, 1, 13, 1);
    let ev = sim.drainEvents();
    expect(count(ev, 'heroQuestComplete')).toBe(0);
    expect(sim.view().heroQuests![0]!.progress).toBeCloseTo(2800 / 6200, 4);
    expect(sim.view().storyStars![0]!.progress).toBeCloseTo(2800 / 6200, 4);

    // Paint region 2 gradually with material 17 (RoyalAstralGold) until Composite Auto-Bloom fires at >=82%
    setTool(sim, { materialId: 17 });
    const path2 = sim.qaStrokePath(2);
    let questEv: SimEvent[] = [];
    let progressBeforeBloom = 0;
    for (let i = 0; i < path2.length; i += 3) {
      const prevProg = sim.view().heroQuests![0]!.progress;
      drag(sim, path2.slice(i, i + 3));
      const stepEv = sim.drainEvents();
      questEv.push(...stepEv);
      if (stepEv.some((e) => e.type === 'heroQuestComplete')) {
        progressBeforeBloom = prevProg;
        break;
      }
    }

    expect(progressBeforeBloom).toBeLessThan(HERO_QUEST_BLOOM_THRESHOLD);
    // Micro-sliver region 3 was NEVER touched directly, yet Composite Auto-Bloom filled it to 100% with last-used material 17!
    expect(sim.regionPercent(2)).toBe(1);
    expect(sim.regionPercent(3)).toBe(1);
    expect(sim.view().regionState[3 * 4]).toBe(17);

    // Emitted heroQuestComplete AND storyStarLit, +4 questBloom, ZERO actorBloom/regionBloom on auto-filled regions 2 & 3!
    expect(questEv.filter((e) => e.type === 'heroQuestComplete')).toEqual([
      { type: 'heroQuestComplete', questId: 'violet', index: 0, total: 2, x: 380, y: 225 },
    ]);
    expect(questEv.filter((e) => e.type === 'storyStarLit')).toEqual([
      { type: 'storyStarLit', milestoneId: 'violet', index: 0, x: 380, y: 225 },
    ]);
    expect(questEv.filter((e) => e.type === 'gems')).toEqual([
      { type: 'gems', amount: GEM_REWARDS.questBloom, reason: 'questBloom' },
    ]);

    // storyStars stays synchronized with heroQuests
    const v = sim.view();
    expect(v.heroQuests![0]!.completed).toBe(true);
    expect(v.heroQuests![0]!.progress).toBe(1);
    expect(v.storyStars![0]!.lit).toBe(true);
    expect(v.storyStars![0]!.progress).toBe(1);
    expect(v.pageComplete).toBe(false);

    // Completing the 2nd & final Hero Quest immediately completes the page (even though other fixture regions are uncolored!)
    paintRegion(sim, 5, 14, 1);
    paintRegion(sim, 6, 14, 1);
    const finEv = sim.drainEvents();
    expect(finEv.some((e) => e.type === 'heroQuestComplete' && e.questId === 'lumi')).toBe(true);
    expect(finEv.some((e) => e.type === 'pageComplete')).toBe(true);
    expect(sim.view().pageComplete).toBe(true);
    expect(sim.view().pageFinale!.active).toBe(true);
  });

  it('constellationCrown triggers Composite Auto-Bloom at 74% instead of 82%', () => {
    const quests: HeroStoryQuestSpec[] = [
      { questId: 'planet', label: 'Ringed Planet', thumbnailSpriteId: 'quest_planet', regionIds: [12, 13], centroid: { x: 130, y: 60 } },
    ];
    // Region 12 (8000 px) + Region 13 (9600 px) = 17600 px.
    // Standard threshold (0.82): needs 14432 px -> 6432 px of region 13 (~67% of 13).
    // Crown threshold (0.74): needs 13024 px -> 5024 px of region 13 (~52.3% of 13).
    const paintPartial13 = (withCrown: boolean) => {
      const sim = createSimulation();
      sim.loadPage(buildHeroQuestPage(quests), ctxOf({ relics: withCrown ? ['constellationCrown'] : [] }));
      paintRegion(sim, 12, 6, 1);
      sim.drainEvents();
      const path13 = sim.qaStrokePath(13);
      setTool(sim, { materialId: 6 });
      // Paint roughly 58% of region 13 -> ~77% total quest coverage (between 0.74 and 0.82!)
      for (let i = 0; i < path13.length; i += 4) {
        drag(sim, path13.slice(i, i + 4));
        if (sim.view().heroQuests![0]!.progress >= 0.77) break;
      }
      return sim;
    };

    const normal = paintPartial13(false);
    const crowned = paintPartial13(true);
    expect(normal.view().heroQuests![0]!.completed).toBe(false);
    expect(normal.view().heroQuests![0]!.progress).toBeGreaterThanOrEqual(CROWN_QUEST_BLOOM_THRESHOLD);
    expect(normal.view().heroQuests![0]!.progress).toBeLessThan(HERO_QUEST_BLOOM_THRESHOLD);
    expect(crowned.view().heroQuests![0]!.completed).toBe(true);
    expect(crowned.regionPercent(13)).toBe(1);
    expect(crowned.view().effects.some((e) => e.kind === 'crownFireworks')).toBe(true);
  });

  it('falls back to coreAwake === coreTotal when heroQuests is empty', () => {
    const page = buildFixture({
      withActors: false,
      rects: [
        { id: 40, x0: 40, y0: 40, x1: 99, y1: 99, kind: 'star' },
        { id: 41, x0: 140, y0: 40, x1: 199, y1: 99, kind: 'star' },
      ],
    });
    page.coreRegionIds = [40, 41];
    const sim = createSimulation();
    sim.loadPage(page, ctxOf());
    expect(sim.view().heroQuests).toEqual([]);
    paintRegion(sim, 40, 6, 1);
    expect(sim.view().pageComplete).toBe(false);
    paintRegion(sim, 41, 6, 1);
    expect(sim.view().pageComplete).toBe(true);
  });
});

describe('Automatic 2.8s PageFinaleController & Stay & Doodle', () => {
  it('PageFinaleController counts down PAGE_FINALE_MS, supports Stay & Doodle pause/resume, and fires once', () => {
    const fc = createPageFinaleController();
    expect(fc.state).toEqual({
      active: false,
      remainingMs: PAGE_FINALE_MS,
      durationMs: PAGE_FINALE_MS,
      progress: 0,
      stayAndDoodle: false,
      autoTurnTriggered: false,
    });
    expect(fc.update(500)).toBe(false);

    fc.start();
    expect(fc.state.active).toBe(true);
    expect(fc.update(1400)).toBe(false);
    expect(fc.state.remainingMs).toBe(1400);
    expect(fc.state.progress).toBeCloseTo(0.5, 6);

    // Pause via Stay & Doodle
    fc.setStayAndDoodle(true);
    expect(fc.update(5000)).toBe(false);
    expect(fc.state.remainingMs).toBe(1400);
    expect(fc.state.autoTurnTriggered).toBe(false);

    // Resume and complete
    fc.setStayAndDoodle(false);
    expect(fc.update(1000)).toBe(false);
    expect(fc.state.remainingMs).toBe(400);
    expect(fc.update(400)).toBe(true);
    expect(fc.state.autoTurnTriggered).toBe(true);
    expect(fc.state.remainingMs).toBe(0);
    expect(fc.state.progress).toBe(1);

    // Never fires twice
    expect(fc.update(500)).toBe(false);

    // Reset clears back to inactive
    fc.reset();
    expect(fc.state.active).toBe(false);
    expect(fc.state.autoTurnTriggered).toBe(false);
  });

  it('Simulation emits autoPageTurnReady once after 2.8s unless Stay & Doodle pauses it, and never starts on restore', () => {
    const quests: HeroStoryQuestSpec[] = [
      { questId: 'violet', label: 'Violet', thumbnailSpriteId: 'quest_violet', regionIds: [1, 2], centroid: { x: 380, y: 225 } },
    ];
    const page = buildHeroQuestPage(quests);
    const sim = createSimulation();
    sim.loadPage(page, ctxOf());
    paintRegion(sim, 1, 6, 1);
    paintRegion(sim, 2, 6, 1);
    const compEv = sim.drainEvents();
    expect(compEv).toContainEqual({ type: 'pageComplete' });
    expect(compEv).toContainEqual({ type: 'gems', amount: GEM_REWARDS.pageComplete, reason: 'pageComplete' });
    expect(sim.view().effects.some((e) => e.kind === 'constellationFireworks')).toBe(true);
    expect(sim.view().pageFinale).toMatchObject({ active: true, remainingMs: PAGE_FINALE_MS, autoTurnTriggered: false });

    // Advance 1s, then toggle Stay & Doodle ON
    run(sim, 1000, 20);
    expect(sim.view().pageFinale!.remainingMs).toBe(1800);
    expect(count(sim.drainEvents(), 'autoPageTurnReady')).toBe(0);

    sim.setStayAndDoodle!(true);
    run(sim, 5000, 50);
    expect(sim.view().pageFinale!.stayAndDoodle).toBe(true);
    expect(sim.view().pageFinale!.remainingMs).toBe(1800);
    expect(count(sim.drainEvents(), 'autoPageTurnReady')).toBe(0);

    // Resume -> fires autoPageTurnReady once after remaining 1800ms
    sim.setStayAndDoodle!(false);
    run(sim, 1800, 20);
    expect(count(sim.drainEvents(), 'autoPageTurnReady')).toBe(1);
    expect(sim.view().pageFinale!.autoTurnTriggered).toBe(true);
    run(sim, 2000, 50);
    expect(count(sim.drainEvents(), 'autoPageTurnReady')).toBe(0);

    // Restore of completed page does NOT start PageFinaleController
    const restored = createSimulation();
    restored.loadPage(page, ctxOf());
    restored.restorePage(sim.snapshotPage());
    expect(restored.view().pageComplete).toBe(true);
    expect(restored.view().pageFinale!.active).toBe(false);
    run(restored, 4000, 50);
    expect(count(restored.drainEvents(), 'autoPageTurnReady')).toBe(0);
  });
});

describe('Active Firefly Hint System, 4.5s Idle Lockstep & 65% Sliver-Rescue', () => {
  it('requestHint() has zero cooldown, dismisses prologue, spotlights all unbloomed quest regions, traces Wisp in largest region, and clears on painting target', () => {
    const sim = mkSim({ playPrologue: true });
    expect(sim.view().wisp!.mode).toBe('prologueMist');
    sim.drainEvents();

    // Request hint for 'planet' (region 12: 8000px, region 13: 9600px -> largest is 13!)
    const h = sim.requestHint!('planet', 'lantern');
    expect(h).toMatchObject({
      active: true,
      source: 'lantern',
      questId: 'planet',
      targetRegionIds: [12, 13],
      remainingMs: HINT_SPOTLIGHT_MS,
      durationMs: HINT_SPOTLIGHT_MS,
      dimAmount: 1,
    });
    const ev = sim.drainEvents();
    expect(ev).toContainEqual({ type: 'prologueEnd' });
    expect(ev).toContainEqual({ type: 'hintStarted', questId: 'planet', regionIds: [12, 13], source: 'lantern' });
    expect(ev).toContainEqual({ type: 'wispGuide', regionId: 13, mode: 'hintBeam' });

    const v = sim.view();
    expect(v.regionState[12 * 4 + 3]! & REGION_FLAG.spotlight).toBe(REGION_FLAG.spotlight);
    expect(v.regionState[13 * 4 + 3]! & REGION_FLAG.spotlight).toBe(REGION_FLAG.spotlight);
    expect(v.regionState[12 * 4 + 3]! & REGION_FLAG.guideGlow).toBe(REGION_FLAG.guideGlow);
    expect(v.regionState[14 * 4 + 3]! & REGION_FLAG.spotlight).toBe(0);
    expect(v.wisp!.mode).toBe('hintBeam');
    expect(v.wisp!.targetRegionId).toBe(13);
    expect(v.wisp!.ghostPath.length).toBeGreaterThanOrEqual(8);
    // Ghost path points all lie strictly inside region 13
    const page = buildFixture();
    for (const pt of v.wisp!.ghostPath) {
      expect(page.regionMap[Math.floor(pt.y) * PAGE_W + Math.floor(pt.x)]).toBe(13);
    }

    // Zero cooldown: calling requestHint() again mid-countdown immediately retargets first incomplete quest ('violet')
    run(sim, 1000, 50);
    const h2 = sim.requestHint!();
    expect(h2.active).toBe(true);
    expect(h2.questId).toBe('violet');
    expect(h2.remainingMs).toBe(HINT_SPOTLIGHT_MS);
    expect(sim.view().regionState[1 * 4 + 3]! & REGION_FLAG.spotlight).toBe(REGION_FLAG.spotlight);
    expect(sim.view().regionState[12 * 4 + 3]! & REGION_FLAG.spotlight).toBe(0);

    // Painting unrelated region 14 does NOT clear spotlight on violet
    tap(sim, 60, 140);
    expect(sim.view().hintState!.active).toBe(true);

    // Painting inside target region 1 clears spotlight cleanly
    const c1 = page.regions[1]!.centroid;
    tap(sim, c1.x, c1.y);
    const vClear = sim.view();
    expect(vClear.hintState!.active).toBe(false);
    expect(vClear.regionState[1 * 4 + 3]! & REGION_FLAG.spotlight).toBe(0);
    expect(vClear.regionState[2 * 4 + 3]! & REGION_FLAG.spotlight).toBe(0);
    expect(vClear.wisp!.active).toBe(false);
  });

  it('4.5s idle lockstep pulse highlights next unlit Hero Quest and all its unbloomed regions', () => {
    const sim = mkSim();
    expect(IDLE_WISP_DELAY_MS).toBe(4500);
    run(sim, IDLE_WISP_DELAY_MS - 100, 50);
    expect(sim.view().heroQuests![0]!.highlighted).toBe(false);

    run(sim, 200, 50);
    const v = sim.view();
    expect(v.heroQuests![0]!.highlighted).toBe(true);
    expect(v.heroQuests![1]!.highlighted).toBe(false);
    expect(v.regionState[1 * 4 + 3]! & REGION_FLAG.guideGlow).toBe(REGION_FLAG.guideGlow);
    expect(v.regionState[2 * 4 + 3]! & REGION_FLAG.guideGlow).toBe(REGION_FLAG.guideGlow);
    expect(v.wisp!.mode).toBe('idleGuide');
  });

  it('65%-81% Sliver-Rescue sets quest.stalled and guideGlow on remaining uncolored sub-region after 3s paused', () => {
    const sim = mkSim();
    // Complete region 12 (8000 px = 45.5% of planet [12,13]) then partially paint region 13 to bring planet to ~70%
    paintRegion(sim, 12, 6, 1);
    const path13 = sim.qaStrokePath(13);
    setTool(sim, { materialId: 6 });
    for (let i = 0; i < path13.length; i += 4) {
      drag(sim, path13.slice(i, i + 4));
      if (sim.view().heroQuests!.find((q) => q.questId === 'planet')!.progress >= 0.7) break;
    }
    const q0 = sim.view().heroQuests!.find((q) => q.questId === 'planet')!;
    expect(q0.progress).toBeGreaterThanOrEqual(STALLED_QUEST_THRESHOLD);
    expect(q0.progress).toBeLessThan(HERO_QUEST_BLOOM_THRESHOLD);
    expect(q0.completed).toBe(false);
    expect(q0.stalled).toBe(false);

    // Pause for STALLED_QUEST_DELAY_MS (3000ms) -> below 4.5s idle Wisp, but triggers Sliver-Rescue!
    run(sim, STALLED_QUEST_DELAY_MS - 200, 50);
    expect(sim.view().heroQuests!.find((q) => q.questId === 'planet')!.stalled).toBe(false);

    run(sim, 300, 50);
    const vStalled = sim.view();
    const qStalled = vStalled.heroQuests!.find((q) => q.questId === 'planet')!;
    expect(qStalled.stalled).toBe(true);
    expect(vStalled.regionState[13 * 4 + 3]! & REGION_FLAG.guideGlow).toBe(REGION_FLAG.guideGlow);
    expect(vStalled.regionState[12 * 4 + 3]! & REGION_FLAG.guideGlow).toBe(0);

    // Resuming paint on region 13 clears stalled immediately
    const c13 = buildFixture().regions[13]!.centroid;
    tap(sim, c13.x, c13.y);
    const vResumed = sim.view();
    expect(vResumed.heroQuests!.find((q) => q.questId === 'planet')!.stalled).toBe(false);
    expect(vResumed.regionState[13 * 4 + 3]! & REGION_FLAG.guideGlow).toBe(0);
  });
});

describe('17 Materials (1..17) and System Bounds (200..233)', () => {
  it('accepts all 17 materials including Sprint 2 exotics 13..17 and round-trips through snapshot/restore', () => {
    expect(MAX_MATERIAL_ID).toBe(17);
    const sim = mkSim();
    const targets: [number, MaterialId][] = [
      [12, 13],
      [13, 14],
      [14, 15],
      [15, 16],
      [16, 17],
    ];
    for (const [rid, mat] of targets) {
      paintRegion(sim, rid, mat, 1);
      expect(sim.view().regionState[rid * 4]).toBe(mat);
    }
    const snap = sim.snapshotPage();
    const restored = mkSim();
    restored.restorePage(snap);
    for (const [rid, mat] of targets) {
      expect(restored.view().regionState[rid * 4]).toBe(mat);
    }
    // Out-of-range materials normalize cleanly to 1
    setTool(sim, { materialId: 18 as unknown as MaterialId });
    tap(sim, 290, 140); // region 20
    expect(sim.view().regionState[20 * 4]).toBe(1);
  });

  it('treats system region IDs 200..211 as non-colourable system overlays', () => {
    const rects = RECTS.concat([
      { id: 200, x0: 430, y0: 190, x1: 450, y1: 210, kind: 'system' },
      { id: 204, x0: 455, y0: 190, x1: 475, y1: 210, kind: 'system' },
    ]);
    const page = buildFixture({ rects });
    const sim = createSimulation();
    sim.loadPage(page, ctxOf());
    tap(sim, 440, 200);
    tap(sim, 465, 200);
    expect(sim.regionPercent(200)).toBe(0);
    expect(sim.regionPercent(204)).toBe(0);
    expect(sim.drainStampBatches()).toHaveLength(0);
  });
});
