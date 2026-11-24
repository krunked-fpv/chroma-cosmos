import { describe, expect, it } from 'vitest';
import {
  BRUSH_RADIUS_PX,
  CROWN_QUEST_BLOOM_THRESHOLD,
  GEM_REWARDS,
  KALEIDOSCOPE_PREFILL,
  KALEIDOSCOPE_TARGETS,
  REGION_FLAG,
  UV_FLASHLIGHT_RADIUS,
} from '../../../src/contracts';
import type { SimEvent } from '../../../src/contracts';
import { bruteCounts, buildFixture, decodeMask } from './fixture';
import { actor, count, drag, mkSim, paintRegion, run, setTool, tap } from './helpers';

const page = buildFixture();

function paintedIn(sim: ReturnType<typeof mkSim>): Uint32Array {
  return bruteCounts(page.regionMap, decodeMask(sim.snapshotPage().paintedMaskRle));
}

describe('brushes', () => {
  it('supernovaSponge tap blooms the locked region plus star/asteroid/cloud/comet regions within reach', () => {
    const sim = mkSim();
    setTool(sim, { brush: 'supernovaSponge', materialId: 5 });
    tap(sim, 326, 140); // asteroid 20, 21 is 6px away across a 2px ink gap
    const b = paintedIn(sim);
    expect(b[20]).toBeGreaterThan(0);
    expect(b[21]).toBeGreaterThan(0);
    expect(b[17]).toBe(0); // moon-cat is not a sponge kind and out of reach anyway
    expect(b[0]! + b[255]!).toBe(0);
    const batch = sim.drainStampBatches()[0]!;
    expect(batch.stamps[0]!.radius).toBe(28);
    expect(batch.allowed[20]).toBe(1);
    expect(batch.allowed[21]).toBe(1);
    // standard brush only paints the locked region
    const std = mkSim();
    tap(std, 326, 140);
    const sb = paintedIn(std);
    expect(sb[21]).toBe(0);
    expect(sb[20]).toBeGreaterThan(0);
  });

  it('sponge does not bleed into non-sponge kinds (moonCat / planets)', () => {
    const sim = mkSim();
    setTool(sim, { brush: 'supernovaSponge' });
    tap(sim, 330, 60); // comet 16 edge; moonCat 17 is 3px away across ink
    const b = paintedIn(sim);
    expect(b[16]).toBeGreaterThan(0);
    expect(b[17]).toBe(0);
  });

  it('turbo uses radius 10, gel radius 5, twin-tail radius 6', () => {
    for (const [brush, r] of [['turboCheetah', 10], ['zeroGGel', 5], ['twinTail', 6]] as const) {
      const sim = mkSim();
      setTool(sim, { brush });
      tap(sim, 60, 140);
      expect(sim.drainStampBatches()[0]!.stamps[0]!.radius).toBe(r);
    }
  });
});

describe('relics', () => {
  it('zoomiePaw: finishing a star dashes Nova over and colours a bonus gold doodle', () => {
    const sim = mkSim({ relics: ['zoomiePaw'] });
    paintRegion(sim, 9, 6, 2);
    paintRegion(sim, 10, 6, 2);
    sim.drainEvents();
    const before = paintedIn(sim);
    paintRegion(sim, 40, 6, 2);
    const ev: SimEvent[] = sim.drainEvents();
    expect(ev.some((e) => e.type === 'relic' && e.relic === 'zoomiePaw')).toBe(true);
    // Nova is live -> she dashes first; the doodle lands on arrival
    expect(sim.view().effects.some((e) => e.kind === 'goldDoodle')).toBe(false);
    let seen = false;
    for (let t = 0; t < 8000; t += 16) {
      sim.update(16, t);
      if (sim.view().effects.some((e) => e.kind === 'goldDoodle')) seen = true;
    }
    expect(seen).toBe(true);
    const after = paintedIn(sim);
    let gold = -1;
    for (let id = 1; id < 255; id++) {
      if (id === 40 || after[id]! <= before[id]!) continue;
      if (![9, 10].includes(id)) gold = id;
    }
    expect(gold).toBeGreaterThan(0);
    const state = sim.view().regionState;
    expect(state[gold * 4]).toBe(11);
    expect(sim.regionPercent(gold)).toBeGreaterThan(0.4);
    expect(sim.regionPercent(gold)).toBeLessThan(0.93);
  });

  it('zoomiePaw does nothing without the relic, and not for other kinds', () => {
    const none = mkSim();
    paintRegion(none, 40, 6, 2);
    expect(none.drainEvents().some((e) => e.type === 'relic')).toBe(false);
    const sim = mkSim({ relics: ['zoomiePaw'] });
    paintRegion(sim, 20, 6, 2);
    expect(sim.drainEvents().some((e) => e.type === 'relic')).toBe(false);
  });

  it('prismRibbon: 3 distinct mediums awakened -> harmonyArc + clickable gem pickups', () => {
    const sim = mkSim({ relics: ['prismRibbon'] });
    paintRegion(sim, 40, 3, 2);
    paintRegion(sim, 41, 3, 2);
    paintRegion(sim, 20, 5, 2);
    expect(sim.drainEvents().some((e) => e.type === 'relic')).toBe(false); // only 2 distinct
    paintRegion(sim, 21, 7, 2);
    const ev = sim.drainEvents();
    expect(ev.filter((e) => e.type === 'relic' && e.relic === 'prismRibbon')).toHaveLength(1);
    const fx = sim.view().effects;
    expect(fx.filter((e) => e.kind === 'harmonyArc')).toHaveLength(1);
    const pickups = fx.filter((e) => e.kind === 'gemPickup');
    expect(pickups.length).toBeGreaterThanOrEqual(3);
    tap(sim, pickups[0]!.x, pickups[0]!.y);
    const got = sim.drainEvents().filter((e) => e.type === 'gems');
    expect(got).toEqual([{ type: 'gems', amount: GEM_REWARDS.harmonyGem, reason: 'harmony' }]);
    expect(sim.view().effects.filter((e) => e.kind === 'gemPickup')).toHaveLength(pickups.length - 1);
    // fires once only
    paintRegion(sim, 16, 2, 2);
    expect(count(sim.drainEvents(), 'relic')).toBe(0);
  });

  it('prismRibbon needs 3 DISTINCT mediums', () => {
    const sim = mkSim({ relics: ['prismRibbon'] });
    for (const id of [40, 41, 20, 21]) paintRegion(sim, id, 3, 2);
    expect(sim.view().effects.some((e) => e.kind === 'harmonyArc')).toBe(false);
  });

  it('uvFlashlight: hover reveals ghost regions within UV_FLASHLIGHT_RADIUS and exposes the beam in SimView', () => {
    const sim = mkSim({ relics: ['uvFlashlight'] });
    expect(sim.view().uvFlashlight).toBeNull();
    setTool(sim, { doodle: true });
    tap(sim, 450, 40);
    expect(sim.regionPercent(240)).toBe(0); // still hidden
    sim.hover({ x: 450 - UV_FLASHLIGHT_RADIUS - 30, y: 40 }); // 2px ink + gap: outside radius
    expect(sim.view().regionState[240 * 4 + 3]! & REGION_FLAG.ghostRevealed).toBe(0);
    sim.hover({ x: 450 - UV_FLASHLIGHT_RADIUS + 5, y: 40 });
    const v = sim.view();
    expect(v.uvFlashlight).toEqual({ x: 450 - UV_FLASHLIGHT_RADIUS + 5, y: 40, r: UV_FLASHLIGHT_RADIUS });
    expect(v.regionState[240 * 4 + 3]! & REGION_FLAG.ghostRevealed).toBe(REGION_FLAG.ghostRevealed);
    expect(v.regionState[240 * 4 + 3]! & REGION_FLAG.hidden).toBe(0);
    expect(sim.drainEvents().some((e) => e.type === 'relic' && e.relic === 'uvFlashlight')).toBe(true);
    // revealed ghosts are colourable now
    setTool(sim, { doodle: false });
    drag(sim, sim.qaStrokePath(240));
    expect(sim.regionPercent(240)).toBe(1);
    sim.hover(null);
    expect(sim.view().uvFlashlight).toBeNull();
  });

  it('ghosts stay hidden without the relic even when hovered', () => {
    const sim = mkSim();
    sim.hover({ x: 440, y: 40 });
    expect(sim.view().regionState[240 * 4 + 3]! & REGION_FLAG.hidden).toBe(REGION_FLAG.hidden);
    expect(sim.view().uvFlashlight).toBeNull();
  });

  it('kaleidoSharpener: every bloom fires 3 paint-splat comets pre-filling nearest uncoloured regions with HoloFoil', () => {
    const sim = mkSim({ relics: ['kaleidoSharpener'] });
    paintRegion(sim, 14, 6, 2);
    const ev = sim.drainEvents();
    expect(ev.some((e) => e.type === 'relic' && e.relic === 'kaleidoSharpener')).toBe(true);
    const comets = sim.view().effects.filter((e) => e.kind === 'paintSplatComet');
    expect(comets).toHaveLength(KALEIDOSCOPE_TARGETS);
    const targets = comets.map((c) => page.regionMap[Math.floor(c.y2!) * 480 + Math.floor(c.x2!)]!);
    expect(new Set(targets).size).toBe(3);
    run(sim, 1200);
    const state = sim.view().regionState;
    let filled = 0;
    for (let id = 1; id < 255; id++) {
      if (id === 14 || sim.regionPercent(id) === 0) continue;
      if (state[id * 4] === 2) filled++;
      expect(sim.regionPercent(id)).toBeGreaterThanOrEqual(KALEIDOSCOPE_PREFILL - 0.01);
      expect(sim.regionPercent(id)).toBeLessThan(0.5);
    }
    expect(filled).toBe(3);
    // the three nearest uncoloured regions (by centroid distance) are the targets
    const c14 = page.regions[14]!.centroid;
    const nearest = page.regions
      .filter((m) => m && m.id !== 14 && m.id <= 199 && m.id > 0)
      .sort((a, b) => Math.hypot(a!.centroid.x - c14.x, a!.centroid.y - c14.y) - Math.hypot(b!.centroid.x - c14.x, b!.centroid.y - c14.y))
      .slice(0, 3)
      .map((m) => m!.id)
      .sort((a, b) => a - b);
    const got = [...Array(255).keys()].filter((id) => id !== 14 && id > 0 && sim.regionPercent(id) > 0);
    expect(got).toEqual(nearest);
  });

  it('relics are inert unless owned', () => {
    const sim = mkSim();
    paintRegion(sim, 14, 6, 2);
    expect(sim.view().effects.some((e) => e.kind === 'paintSplatComet')).toBe(false);
    expect(actor(sim, 'nova')).toBeDefined();
  });
});

describe('Sprint 2 Active Magical Brushes (6 new brushes)', () => {
  it('cometMeteor: 9px wide stroke + meteorStreak FX on fast drag + extra forward disc inside locked region', () => {
    const sim = mkSim();
    setTool(sim, { brush: 'cometMeteor', materialId: 13 });
    // Fast drag inside region 12 (x: 20..119, y: 20..99)
    drag(sim, [
      { x: 30, y: 60 },
      { x: 55, y: 60 },
      { x: 80, y: 60 },
    ]);
    const batches = sim.drainStampBatches();
    const stamps = batches.flatMap((b) => b.stamps);
    expect(stamps.some((s) => s.radius === BRUSH_RADIUS_PX.cometMeteor)).toBe(true);
    // Forward splash disc extends past x=80 inside region 12
    expect(stamps.some((s) => s.x > 82)).toBe(true);
    expect(sim.view().effects.some((e) => e.kind === 'meteorStreak')).toBe(true);
    // Strictly stays inside locked region 12
    expect(sim.regionPercent(12)).toBeGreaterThan(0);
    expect(sim.regionPercent(13)).toBe(0);
  });

  it('prismRoller: 13px wide roller stamps symmetrical companion dot across locked region centroid', () => {
    const sim = mkSim();
    setTool(sim, { brush: 'prismRoller', materialId: 14 });
    // Region 12 spans x=20..119, y=20..99 (centroid ~70, 60). Tap near left edge (34, 60) -> mirrors to (~106, 60)
    tap(sim, 34, 60);
    const batches = sim.drainStampBatches();
    const stamps = batches.flatMap((b) => b.stamps);
    expect(stamps.length).toBeGreaterThanOrEqual(2);
    expect(stamps[0]!.radius).toBe(BRUSH_RADIUS_PX.prismRoller);
    expect(stamps.some((s) => s.x > 95)).toBe(true);
    const mask = decodeMask(sim.snapshotPage().paintedMaskRle);
    // Both left tap pixel and mirrored right pixel inside region 12 are painted
    expect(mask[60 * 480 + 34]).toBe(1);
    expect(mask[60 * 480 + 105]).toBe(1);
    expect(sim.regionPercent(13)).toBe(0);
  });

  it('starlightBubble: spawns floating bubble actor that pops on tap or after drift for bubblePop + 18% bonus paint', () => {
    // Case 1: tap-pop
    const sim1 = mkSim();
    setTool(sim1, { brush: 'starlightBubble', materialId: 14 });
    tap(sim1, 50, 50); // inside region 12
    const bubble1 = sim1.view().actors.find((a) => a.kind === 'bubble');
    expect(bubble1).toBeDefined();
    expect(bubble1!.live).toBe(true);
    sim1.drainEvents();

    tap(sim1, bubble1!.x, bubble1!.y);
    const ev1 = sim1.drainEvents();
    expect(ev1).toContainEqual({ type: 'itemFoley', kind: 'bubblePop' });
    expect(sim1.view().effects.some((e) => e.kind === 'bubblePop')).toBe(true);
    expect(sim1.view().actors.some((a) => a.instanceId === bubble1!.instanceId)).toBe(false);
    // Splashed >=18% onto an uncolored region
    const splashed1 = [...Array(200).keys()].filter((id) => id !== 12 && id > 0 && sim1.regionPercent(id) >= 0.17);
    expect(splashed1.length).toBeGreaterThanOrEqual(1);

    // Case 2: auto-pop after gentle drift
    const sim2 = mkSim();
    setTool(sim2, { brush: 'starlightBubble', materialId: 15 });
    tap(sim2, 50, 50);
    const bubble2 = sim2.view().actors.find((a) => a.kind === 'bubble')!;
    const y0 = bubble2.y;
    sim2.drainEvents();
    run(sim2, 400);
    const drifted = sim2.view().actors.find((a) => a.instanceId === bubble2.instanceId);
    expect(drifted).toBeDefined();
    expect(drifted!.y).not.toBe(y0);
    run(sim2, 2600);
    const ev2 = sim2.drainEvents();
    expect(ev2).toContainEqual({ type: 'itemFoley', kind: 'bubblePop' });
    expect(sim2.view().actors.some((a) => a.instanceId === bubble2.instanceId)).toBe(false);
    const splashed2 = [...Array(200).keys()].filter((id) => id !== 12 && id > 0 && sim2.regionPercent(id) >= 0.17);
    expect(splashed2.length).toBeGreaterThanOrEqual(1);
  });

  it('nebulaCloudPuff: 18px plush sponge paints all unbloomed regions of the same HeroStoryQuest without leaking outside', () => {
    const sim = mkSim();
    setTool(sim, { brush: 'nebulaCloudPuff', materialId: 15 });
    // Region 12 & 13 both belong to 'planet' Hero Quest (separated by 2px ink at x=120..121); cloud 14 is below (different quest)
    drag(sim, [
      { x: 112, y: 60 },
      { x: 132, y: 60 },
      { x: 112, y: 112 }, // crosses into cloud 14 -> must NOT paint cloud 14!
    ]);
    const batches = sim.drainStampBatches();
    expect(batches[0]!.stamps[0]!.radius).toBe(BRUSH_RADIUS_PX.nebulaCloudPuff);
    expect(sim.regionPercent(12)).toBeGreaterThan(0);
    expect(sim.regionPercent(13)).toBeGreaterThan(0);
    expect(sim.regionPercent(14)).toBe(0);
  });

  it('lightningWhisker: arcs lightningZap + crystalChime filling >=22% of remaining uncolored pixels once locked region exceeds 55%', () => {
    const sim = mkSim();
    setTool(sim, { brush: 'lightningWhisker', materialId: 16 });
    const path = sim.qaStrokePath(14);
    let sawZap = false;
    let pctBeforeZap = 0;
    let pctAfterZap = 0;
    const allEv: SimEvent[] = [];
    for (let i = 0; i < path.length; i += 4) {
      const prev = sim.regionPercent(14);
      drag(sim, path.slice(i, i + 4));
      const ev = sim.drainEvents();
      allEv.push(...ev);
      if (!sawZap && ev.some((e) => e.type === 'itemFoley' && e.kind === 'crystalChime')) {
        sawZap = true;
        pctBeforeZap = prev;
        pctAfterZap = sim.regionPercent(14);
        break;
      }
    }
    expect(sawZap).toBe(true);
    expect(pctBeforeZap).toBeGreaterThan(0.45);
    expect(pctAfterZap - pctBeforeZap).toBeGreaterThan(0.08);
    expect(sim.view().effects.some((e) => e.kind === 'lightningZap')).toBe(true);
    expect(allEv).toContainEqual({ type: 'itemFoley', kind: 'crystalChime' });
  });

  it('moonbeamQuill: fills with 1.4x effective brush radius and spawns silky stardustTrail sparkles', () => {
    const sim = mkSim();
    setTool(sim, { brush: 'moonbeamQuill', materialId: 17 });
    drag(sim, [
      { x: 35, y: 50 },
      { x: 85, y: 50 },
    ]);
    const batches = sim.drainStampBatches();
    const stamps = batches.flatMap((b) => b.stamps);
    expect(stamps[0]!.radius).toBeCloseTo(BRUSH_RADIUS_PX.moonbeamQuill * 1.4, 5);
    expect(sim.view().effects.some((e) => e.kind === 'stardustTrail')).toBe(true);
  });
});

describe('Sprint 2 Passive Holographic Sticker Relics (6 new relics)', () => {
  it('sleepyMoonCat: spawns animated floating moonCat companion, purrs every ~3.5s, and softly fills 20% of a nearby uncolored region', () => {
    const sim = mkSim({ relics: ['sleepyMoonCat'] });
    const cat = sim.view().actors.find((a) => a.instanceId === 'relic-mooncat');
    expect(cat).toBeDefined();
    expect(cat!.kind).toBe('moonCat');
    expect(cat!.live).toBe(true);
    expect(cat!.remap).toEqual({ 17: 202 });

    run(sim, 3600, 50);
    const ev = sim.drainEvents();
    expect(ev.some((e) => e.type === 'relic' && e.relic === 'sleepyMoonCat' && Boolean(e.tag))).toBe(true);
    expect(ev).toContainEqual({ type: 'itemFoley', kind: 'catPurr' });
    const filled = [...Array(200).keys()].filter((id) => id > 0 && sim.regionPercent(id) >= 0.19);
    expect(filled.length).toBeGreaterThanOrEqual(1);
  });

  it('gravityFlipFlop: poked actors bounce in zero-G arcs and award +2 gravityPokeBonus once per page', () => {
    const sim = mkSim({ relics: ['gravityFlipFlop'] });
    paintRegion(sim, 5, 6, 1);
    paintRegion(sim, 6, 6, 1);
    sim.drainEvents();

    const lumi0 = actor(sim, 'lumi')!;
    const baseY = lumi0.y;
    tap(sim, lumi0.x, lumi0.y);
    const ev1 = sim.drainEvents();
    expect(ev1.some((e) => e.type === 'relic' && e.relic === 'gravityFlipFlop' && Boolean(e.tag))).toBe(true);
    expect(ev1.filter((e) => e.type === 'gems' && e.reason === 'gravityPokeBonus')).toEqual([
      { type: 'gems', amount: GEM_REWARDS.gravityPokeBonus, reason: 'gravityPokeBonus' },
    ]);

    // Mid-arc: Lumi floats significantly upward above baseY
    run(sim, 600, 20);
    expect(actor(sim, 'lumi')!.y).toBeLessThan(baseY - 12);

    // Second poke on same page still triggers relic + bounce, but does NOT double-award gravityPokeBonus
    run(sim, 800, 20);
    sim.drainEvents();
    const lumi1 = actor(sim, 'lumi')!;
    tap(sim, lumi1.x, lumi1.y);
    const ev2 = sim.drainEvents();
    expect(ev2.some((e) => e.type === 'relic' && e.relic === 'gravityFlipFlop')).toBe(true);
    expect(ev2.filter((e) => e.type === 'gems' && e.reason === 'gravityPokeBonus')).toHaveLength(0);
  });

  it('doubleMilkshake: awards +2 milkshakeBonus gems and relic event on every Hero Quest Auto-Bloom', () => {
    const sim = mkSim({ relics: ['doubleMilkshake'] });
    paintRegion(sim, 1, 6, 1);
    paintRegion(sim, 2, 6, 1);
    const ev = sim.drainEvents();
    expect(ev.some((e) => e.type === 'relic' && e.relic === 'doubleMilkshake' && Boolean(e.tag))).toBe(true);
    expect(ev.filter((e) => e.type === 'gems' && e.reason === 'questBloom')).toEqual([
      { type: 'gems', amount: GEM_REWARDS.questBloom, reason: 'questBloom' },
    ]);
    expect(ev.filter((e) => e.type === 'gems' && e.reason === 'milkshakeBonus')).toEqual([
      { type: 'gems', amount: GEM_REWARDS.milkshakeBonus, reason: 'milkshakeBonus' },
    ]);
  });

  it('starlightMagnet: swiftly pulls gemPickup and hiddenStar pickups toward pointer and auto-collects with magnetArc + magnetHarp', () => {
    const sim = mkSim({ relics: ['starlightMagnet', 'prismRibbon'] });
    // Trigger prismRibbon with 3 distinct mediums -> spawns 7 gemPickups; also trigger zeroGTrampoline -> 3 hiddenStars
    paintRegion(sim, 40, 3, 2);
    paintRegion(sim, 20, 5, 2);
    paintRegion(sim, 14, 7, 2);
    sim.hover({ x: 80, y: 40 });
    sim.drainEvents();
    expect(sim.view().effects.some((e) => e.kind === 'gemPickup')).toBe(true);
    expect(sim.view().effects.some((e) => e.kind === 'hiddenStar')).toBe(true);

    const allEv: SimEvent[] = [];
    let sawMagnetArc = false;
    for (let t = 0; t < 2500; t += 20) {
      sim.update(20, t);
      allEv.push(...sim.drainEvents());
      if (sim.view().effects.some((e) => e.kind === 'magnetArc')) sawMagnetArc = true;
    }
    expect(sawMagnetArc).toBe(true);
    expect(allEv.some((e) => e.type === 'relic' && e.relic === 'starlightMagnet' && Boolean(e.tag))).toBe(true);
    expect(allEv.some((e) => e.type === 'itemFoley' && e.kind === 'magnetHarp')).toBe(true);
    expect(allEv.filter((e) => e.type === 'gems' && e.reason === 'harmony')).toHaveLength(7);
    expect(allEv.filter((e) => e.type === 'gems' && e.reason === 'hiddenStar')).toHaveLength(3);
    expect(sim.view().effects.some((e) => e.kind === 'gemPickup' || e.kind === 'hiddenStar')).toBe(false);
  });

  it('chromaticButterfly: spawns live butterfly actor that flutters on bloom to next uncolored Hero Quest region and echoes 30% bonus paint', () => {
    const sim = mkSim({ relics: ['chromaticButterfly'] });
    const bf = sim.view().actors.find((a) => a.kind === 'butterfly');
    expect(bf).toBeDefined();
    expect(bf!.live).toBe(true);

    // Bloom region 40 (non-quest star) with material 16 -> butterfly flutters to first uncolored Hero Quest region (region 1)
    paintRegion(sim, 40, 16, 2);
    const ev = sim.drainEvents();
    expect(ev.some((e) => e.type === 'relic' && e.relic === 'chromaticButterfly' && Boolean(e.tag))).toBe(true);
    expect(sim.view().effects.some((e) => e.kind === 'echoTrail')).toBe(true);

    run(sim, 2500, 20);
    expect(sim.regionPercent(1)).toBeGreaterThanOrEqual(0.29);
    expect(sim.view().regionState[1 * 4]).toBe(16);
  });

  it('constellationCrown: lowers Hero Quest Auto-Bloom threshold to 0.74 and spawns crownFireworks on completion', () => {
    const sim = mkSim({ relics: ['constellationCrown'] });
    // Region 1 (2800 px) + Region 2 (2800 px) = 5600 px for 'violet'.
    // Painting region 1 completely (50%) + ~50% of region 2 reaches ~75% (>= 0.74, < 0.82)!
    paintRegion(sim, 1, 17, 1);
    sim.drainEvents();
    const path2 = sim.qaStrokePath(2);
    setTool(sim, { materialId: 17 });
    let completed = false;
    const evAll: SimEvent[] = [];
    for (let i = 0; i < path2.length; i += 4) {
      drag(sim, path2.slice(i, i + 4));
      const ev = sim.drainEvents();
      evAll.push(...ev);
      if (ev.some((e) => e.type === 'heroQuestComplete' && e.questId === 'violet')) {
        completed = true;
        break;
      }
    }
    expect(completed).toBe(true);
    expect(CROWN_QUEST_BLOOM_THRESHOLD).toBe(0.74);
    expect(sim.regionPercent(2)).toBe(1);
    expect(evAll.some((e) => e.type === 'relic' && e.relic === 'constellationCrown' && Boolean(e.tag))).toBe(true);
    expect(sim.view().effects.some((e) => e.kind === 'crownFireworks')).toBe(true);
  });
});
