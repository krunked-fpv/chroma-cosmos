import { describe, expect, it } from 'vitest';
import { createArt } from '../../../src/art';
import { PAGE_W, REGION_FLAG, REGION_STATE_ROW1_OFFSET } from '../../../src/contracts';
import type { GestureEvent, WardrobeState } from '../../../src/contracts';
import { createSimulation } from '../../../src/simulation';

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

function ge(phase: GestureEvent['phase'], x: number, y: number, timeMs = 100): GestureEvent {
  return {
    phase,
    x,
    y,
    pointerId: 1,
    pointerType: 'mouse',
    pressure: phase === 'end' ? 0 : 0.65,
    tiltX: 0,
    tiltY: 0,
    timeMs,
  };
}

function paintPath(sim: ReturnType<typeof createSimulation>, pts: { x: number; y: number }[], t0 = 100): number {
  if (pts.length === 0) return t0;
  let t = t0;
  sim.gesture(ge('start', pts[0]!.x, pts[0]!.y, t));
  for (let i = 1; i < pts.length; i++) {
    t += 16;
    sim.gesture(ge('move', pts[i]!.x, pts[i]!.y, t));
  }
  t += 16;
  sim.gesture(ge('end', pts[pts.length - 1]!.x, pts[pts.length - 1]!.y, t));
  return t;
}

describe('Live-actor hitboxes, steady unawake poses & uncolored quest visibility', () => {
  it('never flips unawake Nova, Lumi, or MoonCat facing when hovering behind them toward their tails', () => {
    const art = createArt();
    const sprites = art.sprites(DEFAULT_WARDROBE);
    const page = art.compilePage('rooftop', 4242, DEFAULT_WARDROBE);
    const sim = createSimulation();
    sim.loadPage(page, { seed: 4242, chapterIndex: 0, brushes: ['standard'], relics: [] }, sprites);
    sim.setTool({ materialId: 4, brush: 'standard', doodle: false, toolMode: 'pencil' });

    const novaSpawn = page.actors.find((a) => a.kind === 'nova')!;
    const lumiSpawn = page.actors.find((a) => a.kind === 'lumi')!;

    // Paint Nova's body (#9) and Lumi's body (#5) completely -> both go live = true while tails remain uncolored
    let t = paintPath(sim, sim.qaStrokePath(9), 100);
    t = paintPath(sim, sim.qaStrokePath(5), t + 20);
    expect(sim.regionPercent(9)).toBe(1);
    expect(sim.regionPercent(5)).toBe(1);
    expect(sim.regionPercent(11)).toBe(0);
    expect(sim.regionPercent(8)).toBe(0);

    // Hover on BOTH sides of Nova (including right over her tail!) and advance time
    for (const pt of [
      { x: novaSpawn.x - 24, y: novaSpawn.y - 4 },
      { x: novaSpawn.x + 24, y: novaSpawn.y - 4 },
      { x: novaSpawn.x - 18, y: novaSpawn.y - 6 },
    ]) {
      sim.hover(pt);
      for (let i = 0; i < 12; i++) {
        t += 40;
        sim.update(40, t);
      }
      const nova = sim.view().actors.find((a) => a.kind === 'nova')!;
      expect(nova.live).toBe(true);
      expect(nova.facing).toBe(novaSpawn.facing);
      expect(nova.anim).toBe('idle');
      expect(nova.frame).toBe(0);
    }

    // Hover on BOTH sides of Lumi (including over Lumi's tail!) and advance time
    for (const pt of [
      { x: lumiSpawn.x - 24, y: lumiSpawn.y - 4 },
      { x: lumiSpawn.x + 24, y: lumiSpawn.y - 4 },
    ]) {
      sim.hover(pt);
      for (let i = 0; i < 12; i++) {
        t += 40;
        sim.update(40, t);
      }
      const lumi = sim.view().actors.find((a) => a.kind === 'lumi')!;
      expect(lumi.live).toBe(true);
      expect(lumi.facing).toBe(lumiSpawn.facing);
      expect(lumi.frame).toBe(0);
    }
  });

  it('hits, hovers, and paints live animated Nova tail (#11) & Lumi tail (#8) even where static sleep map is sky', () => {
    const art = createArt();
    const sprites = art.sprites(DEFAULT_WARDROBE);
    const page = art.compilePage('rooftop', 4242, DEFAULT_WARDROBE);
    const sim = createSimulation();
    sim.loadPage(page, { seed: 4242, chapterIndex: 0, brushes: ['standard'], relics: [] }, sprites);
    sim.setTool({ materialId: 6, brush: 'standard', doodle: false, toolMode: 'pencil' });

    // Paint Nova's body (#9) -> Nova switches from curled NOVA_SLEEP to standing NOVA_STAND
    let t = paintPath(sim, sim.qaStrokePath(9), 100);
    const novaSpawn = page.actors.find((a) => a.kind === 'nova')!;
    sim.hover({ x: novaSpawn.x - 20, y: novaSpawn.y - 4 });
    for (let i = 0; i < 10; i++) {
      t += 40;
      sim.update(40, t);
    }

    // Live stroke path for Nova's tail (#11) includes raised pixels that are SKY (255) in static sleep map!
    const liveTailPts = sim.qaStrokePath(11);
    expect(liveTailPts.length).toBeGreaterThan(2);
    const raisedSkyPt = liveTailPts.find((p) => page.regionMap[Math.floor(p.y) * PAGE_W + Math.floor(p.x)] === 255);
    expect(raisedSkyPt).toBeDefined();

    // Hovering that raised live tail pixel highlights region 11 immediately
    sim.hover(raisedSkyPt!);
    expect(sim.view().hoveredRegionId).toBe(11);

    // Clicking 2px off that raised live tail pixel into open sky still snaps kindly onto tail #11
    sim.hover({ x: raisedSkyPt!.x - 2, y: raisedSkyPt!.y - 2 });
    expect(sim.view().hoveredRegionId).toBe(11);

    // Dragging across the live tail points paints Nova's tail (#11) cleanly to 100% and completes Nova's quest!
    t = paintPath(sim, liveTailPts, t + 20);
    expect(sim.regionPercent(11)).toBe(1);
    const novaQ = sim.view().heroQuests!.find((q) => q.questId === 'nova')!;
    expect(novaQ.completed).toBe(true);

    // Same for Lumi: paint body (#5), then paint live standing tail (#8) cleanly to 100%
    t = paintPath(sim, sim.qaStrokePath(5), t + 20);
    const lumiSpawn = page.actors.find((a) => a.kind === 'lumi')!;
    sim.hover({ x: lumiSpawn.x - 20, y: lumiSpawn.y - 4 });
    for (let i = 0; i < 10; i++) {
      t += 40;
      sim.update(40, t);
    }
    const lumiLiveTail = sim.qaStrokePath(8);
    expect(lumiLiveTail.length).toBeGreaterThan(2);
    sim.hover(lumiLiveTail[0]!);
    expect(sim.view().hoveredRegionId).toBe(8);
    paintPath(sim, lumiLiveTail, t + 20);
    expect(sim.regionPercent(8)).toBe(1);
    expect(sim.view().heroQuests!.find((q) => q.questId === 'lumi')!.completed).toBe(true);
  });

  it('flags uncolored Hero Quest regions with FLAG_QUEST_TARGET and elevates remaining parts to priority 2 immediately on partial quest progress', () => {
    const art = createArt();
    const sprites = art.sprites(DEFAULT_WARDROBE);
    const page = art.compilePage('rooftop', 4242, DEFAULT_WARDROBE);
    const sim = createSimulation();
    sim.loadPage(page, { seed: 4242, chapterIndex: 0, brushes: ['standard'], relics: [] }, sprites);
    sim.setTool({ materialId: 1, brush: 'standard', doodle: false, toolMode: 'pencil' });

    const v0 = sim.view();
    // Lumi's tail (#8) is an unstarted quest target -> FLAG_QUEST_TARGET set, Row 1 A = 1
    expect(v0.regionState[8 * 4 + 3]! & REGION_FLAG.questTarget).toBe(REGION_FLAG.questTarget);
    expect(v0.regionState[REGION_STATE_ROW1_OFFSET + 8 * 4 + 3]).toBe(1);

    // A non-quest background region (not in any Hero Quest) has NO FLAG_QUEST_TARGET
    const questIds = new Set(v0.heroQuests!.flatMap((q) => q.regionIds));
    const nonQuestId = page.regions.find((r) => r && !r.coverageExcluded && !r.ghost && !questIds.has(r.id))!.id;
    expect(v0.regionState[nonQuestId * 4 + 3]! & REGION_FLAG.questTarget).toBe(0);
    expect(v0.regionState[REGION_STATE_ROW1_OFFSET + nonQuestId * 4 + 3]).toBe(0);

    // Start coloring Lumi's body (#5) -> remaining uncolored parts (#6 mane, #7 horn, #8 tail) IMMEDIATELY jump to priority 2!
    paintPath(sim, sim.qaStrokePath(5).slice(0, 6), 100);
    const vMid = sim.view();
    expect(vMid.regionState[8 * 4 + 3]! & REGION_FLAG.questTarget).toBe(REGION_FLAG.questTarget);
    expect(vMid.regionState[REGION_STATE_ROW1_OFFSET + 8 * 4 + 3]).toBe(2);
    expect(vMid.regionState[7 * 4 + 3]! & REGION_FLAG.questTarget).toBe(REGION_FLAG.questTarget);
    expect(vMid.regionState[REGION_STATE_ROW1_OFFSET + 7 * 4 + 3]).toBe(2);
    // Does not prematurely set stalled / FLAG_GUIDE_GLOW before 3s
    expect(vMid.regionState[8 * 4 + 3]! & REGION_FLAG.guideGlow).toBe(0);

    // Complete Lumi's quest -> flags clear cleanly to 0
    paintPath(sim, sim.qaStrokePath(5), 250);
    paintPath(sim, sim.qaStrokePath(8), 450);
    const vDone = sim.view();
    expect(vDone.heroQuests!.find((q) => q.questId === 'lumi')!.completed).toBe(true);
    for (const id of [5, 6, 7, 8]) {
      expect(vDone.regionState[id * 4 + 3]! & REGION_FLAG.questTarget).toBe(0);
      expect(vDone.regionState[REGION_STATE_ROW1_OFFSET + id * 4 + 3]).toBe(0);
    }
  });
});
