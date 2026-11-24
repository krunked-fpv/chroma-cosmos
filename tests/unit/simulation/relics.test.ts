import { describe, expect, it } from 'vitest';
import { GEM_REWARDS, KALEIDOSCOPE_PREFILL, KALEIDOSCOPE_TARGETS, REGION_FLAG, UV_FLASHLIGHT_RADIUS } from '../../../src/contracts';
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
      .filter((m) => m && m.id !== 14 && m.id < 211 && m.id > 0)
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
