import { describe, expect, it } from 'vitest';
import {
  CAUSALITY_MATRIX,
  GEM_REWARDS,
  POKE_CHASE_MS,
  REGION_FLAG,
  STAGE_MIN,
} from '../../../src/contracts';
import type { CausalityKind, SimEvent } from '../../../src/contracts';
import { matchCausality } from '../../../src/simulation/causality';
import { bruteCounts, buildFixture, decodeMask, CORE_IDS } from './fixture';
import { actor, count, drag, mkSim, paintRegion, run, setTool, tap } from './helpers';
import { createSimulation } from '../../../src/simulation';
import { ctxOf } from './fixture';

const page = buildFixture();

function gemsOf(ev: SimEvent[]): number {
  return ev.reduce((a, e) => (e.type === 'gems' ? a + e.amount : a), 0);
}

describe('4-stage awakening and Auto-Bloom', () => {
  it('emits stage events 1..4 in order and crosses 93% into exactly one Auto-Bloom', () => {
    const sim = mkSim();
    setTool(sim, { materialId: 6 });
    const path = sim.qaStrokePath(14);
    const all: SimEvent[] = [];
    let bloomedAtPct = -1;
    // feed the path in slices so we observe the percent around the bloom
    for (let i = 0; i < path.length; i += 6) {
      drag(sim, path.slice(i, i + 6));
      const ev = sim.drainEvents();
      all.push(...ev);
      if (bloomedAtPct < 0 && ev.some((e) => e.type === 'autoBloom')) bloomedAtPct = sim.regionPercent(14);
      if (bloomedAtPct < 0) expect(sim.regionPercent(14)).toBeLessThan(STAGE_MIN[4]!);
    }
    const stages = all.filter((e) => e.type === 'stage' && e.regionId === 14).map((e) => (e.type === 'stage' ? e.stage : 0));
    expect(stages).toEqual([1, 2, 3, 4]);
    expect(all.filter((e) => e.type === 'autoBloom')).toHaveLength(1);
    expect(bloomedAtPct).toBe(1); // remaining pixels filled by the bloom
    const v = sim.view();
    expect(v.regionState[14 * 4 + 3]! & REGION_FLAG.complete).toBe(REGION_FLAG.complete);
    expect(v.regionState[1024 + 14 * 4 + 2]).toBe(4);
  });

  it('pays gems exactly once even with repeated strokes', () => {
    const sim = mkSim();
    paintRegion(sim, 14, 6, 4);
    const ev = sim.drainEvents();
    expect(count(ev, 'autoBloom')).toBe(1);
    const gems = ev.filter((e) => e.type === 'gems');
    expect(gems).toHaveLength(1);
    expect(gems[0]).toMatchObject({ amount: GEM_REWARDS.regionBloom, reason: 'regionBloom' });
    paintRegion(sim, 14, 3, 2); // recolour attempts after the bloom
    expect(count(sim.drainEvents(), 'autoBloom')).toBe(0);
    expect(sim.regionPercent(14)).toBe(1);
  });

  it('chromatic ripple animates the bloom progress byte over RIPPLE_MS without timers', () => {
    const sim = mkSim();
    paintRegion(sim, 14, 6);
    expect(sim.view().regionState[14 * 4 + 2]).toBeLessThan(255);
    expect(sim.view().regionState[14 * 4 + 3]! & REGION_FLAG.flash).toBe(REGION_FLAG.flash);
    run(sim, 450);
    const mid = sim.view().regionState[14 * 4 + 2]!;
    expect(mid).toBeGreaterThan(60);
    expect(mid).toBeLessThan(255);
    run(sim, 600);
    expect(sim.view().regionState[14 * 4 + 2]).toBe(255);
    expect(sim.view().regionState[14 * 4 + 3]! & REGION_FLAG.flash).toBe(0);
  });

  it('actor regions pay actorBloom; actorAwake fires once when every region is complete', () => {
    const sim = mkSim();
    paintRegion(sim, 5, 6);
    let ev = sim.drainEvents();
    expect(ev.filter((e) => e.type === 'gems')).toEqual([{ type: 'gems', amount: GEM_REWARDS.actorBloom, reason: 'actorBloom' }]);
    expect(count(ev, 'actorAwake')).toBe(0);
    paintRegion(sim, 6, 6, 2);
    ev = sim.drainEvents();
    expect(ev.filter((e) => e.type === 'actorAwake')).toEqual([{ type: 'actorAwake', actor: 'lumi' }]);
  });

  it('pageAwakening = completed core / coreTotal; pageComplete fires once with 10 gems', () => {
    const sim = mkSim();
    expect(sim.view().coreTotal).toBe(CORE_IDS.length);
    const events: SimEvent[] = [];
    let done = 0;
    for (const id of CORE_IDS) {
      paintRegion(sim, id, 6);
      done++;
      const v = sim.view();
      expect(v.coreAwake).toBe(done);
      expect(v.pageAwakening).toBeCloseTo(done / CORE_IDS.length, 10);
      events.push(...sim.drainEvents());
      expect(v.pageComplete).toBe(done === CORE_IDS.length);
    }
    expect(count(events, 'pageComplete')).toBe(1);
    expect(events.filter((e) => e.type === 'gems' && e.reason === 'pageComplete')).toHaveLength(1);
    paintRegion(sim, 14, 2, 2);
    expect(count(sim.drainEvents(), 'pageComplete')).toBe(0);
  });

  it('actors go live from stage 2 and have no timers/fail states', () => {
    const sim = mkSim();
    expect(actor(sim, 'nova')!.live).toBe(false);
    const path = sim.qaStrokePath(9);
    drag(sim, path.slice(0, Math.floor(path.length * 0.4)));
    run(sim, 100);
    expect(sim.regionPercent(9)).toBeGreaterThan(STAGE_MIN[2]!);
    expect(actor(sim, 'nova')!.live).toBe(true);
    expect(actor(sim, 'nova')!.anim).not.toBe('sleep');
  });
});

describe('Pigment-Driven Causality', () => {
  it('matchCausality implements every matrix rule, the kind targets and the gentleSparkle fallback', () => {
    for (const rule of CAUSALITY_MATRIX) {
      for (let m = 1; m <= 12; m++) {
        const kinds = rule.target === 'cloud' ? (['cloud'] as const) : (['planet', 'rings'] as const);
        for (const k of kinds) {
          const got = matchCausality(k, m);
          if (rule.materials.includes(m as never)) expect(got).toBe(rule.effect);
          else expect(CAUSALITY_MATRIX.filter((r) => r.target === rule.target).some((r) => r.materials.includes(m as never))).toBe(
            got !== 'gentleSparkle',
          );
        }
      }
    }
    expect(matchCausality('cloud', 5)).toBe('gentleSparkle');
    expect(matchCausality('planet', 3)).toBe('gentleSparkle');
    expect(matchCausality('star', 6)).toBeNull();
    expect(matchCausality('lumi', 6)).toBeNull();
  });

  const cases: { id: number; mat: number; effect: CausalityKind }[] = [];
  for (const rule of CAUSALITY_MATRIX) {
    for (const m of rule.materials) {
      if (rule.target === 'cloud') cases.push({ id: 14, mat: m, effect: rule.effect });
      else {
        cases.push({ id: 12, mat: m, effect: rule.effect });
        cases.push({ id: 13, mat: m, effect: rule.effect });
      }
    }
  }
  cases.push({ id: 15, mat: 5, effect: 'gentleSparkle' }, { id: 14, mat: 4, effect: 'gentleSparkle' }, { id: 12, mat: 6, effect: 'gentleSparkle' }, { id: 13, mat: 7, effect: 'gentleSparkle' });

  it.each(cases)('region $id painted with material $mat -> $effect', ({ id, mat, effect }) => {
    const sim = mkSim();
    paintRegion(sim, id, mat as never, 2);
    const ev = sim.drainEvents().filter((e) => e.type === 'causality');
    expect(ev).toHaveLength(1);
    expect(ev[0]).toMatchObject({ effect, regionId: id });
    const v = sim.view();
    expect(v.effects.some((e) => e.kind === effect)).toBe(true);
  });

  it('non cloud/planet kinds trigger no causality', () => {
    const sim = mkSim();
    paintRegion(sim, 40, 6, 2);
    paintRegion(sim, 20, 6, 2);
    expect(count(sim.drainEvents(), 'causality')).toBe(0);
  });

  it('rainbowSlide: Nova sprints down the slide', () => {
    const sim = mkSim();
    paintRegion(sim, 9, 6, 2);
    paintRegion(sim, 10, 6, 2);
    paintRegion(sim, 14, 6, 2);
    const slide = sim.view().effects.find((e) => e.kind === 'rainbowSlide')!;
    expect(slide).toBeDefined();
    let minEnd = Infinity;
    let sawStart = false;
    for (let t = 0; t < 30000; t += 16) {
      sim.update(16, t);
      const n = actor(sim, 'nova')!;
      minEnd = Math.min(minEnd, Math.hypot(n.x - slide.x2!, n.y - slide.y2!));
      if (Math.hypot(n.x - slide.x, n.y - slide.y) < 8) sawStart = true;
    }
    expect(sawStart).toBe(true);
    expect(minEnd).toBeLessThan(10);
  });

  it('starlightFlowerRain: droplets then flowers sprout along the bottom margin path', () => {
    const sim = mkSim();
    paintRegion(sim, 14, 3, 2);
    expect(actor(sim, 'flower')).toBeUndefined();
    run(sim, 1000);
    expect(actor(sim, 'flower')).toBeUndefined();
    run(sim, 4000);
    const flowers = sim.view().actors.filter((a) => a.kind === 'flower');
    expect(flowers).toHaveLength(6);
    for (const f of flowers) expect(f.y).toBeGreaterThan(255);
  });

  it('zeroGTrampoline: Violet bounces to hidden stars -> hiddenStar gems + violetBounce', () => {
    const sim = mkSim();
    paintRegion(sim, 14, 7, 2);
    sim.drainEvents();
    expect(sim.view().effects.filter((e) => e.kind === 'hiddenStar')).toHaveLength(3);
    const ev: SimEvent[] = [];
    for (let t = 0; t < 40000; t += 16) {
      sim.update(16, t);
      ev.push(...sim.drainEvents());
    }
    expect(count(ev, 'violetBounce')).toBeGreaterThanOrEqual(3);
    const stars = ev.filter((e) => e.type === 'gems' && e.reason === 'hiddenStar');
    expect(stars).toHaveLength(3);
    expect(stars[0]).toMatchObject({ amount: GEM_REWARDS.hiddenStar });
    expect(sim.view().effects.some((e) => e.kind === 'hiddenStar')).toBe(false);
  });

  it('cheetahRacetrack: comet-cars loop a ring path', () => {
    const sim = mkSim();
    paintRegion(sim, 12, 4, 2);
    run(sim, 1000);
    const cars = sim.view().actors.filter((a) => a.kind === 'cometCar');
    expect(cars).toHaveLength(3);
    const p0 = cars.map((c) => ({ x: c.x, y: c.y }));
    run(sim, 3000);
    const moved = sim.view().actors.filter((a) => a.kind === 'cometCar').map((c, i) => Math.hypot(c.x - p0[i]!.x, c.y - p0[i]!.y));
    expect(Math.max(...moved)).toBeGreaterThan(20);
  });

  it('discoMirage: prism beams wake nearby comets', () => {
    const sim = mkSim();
    paintRegion(sim, 12, 2, 2);
    const beams = sim.view().effects.filter((e) => e.kind === 'discoMirage');
    expect(beams.length).toBeGreaterThanOrEqual(1);
    run(sim, 200);
    const comet = actor(sim, 'comet')!;
    expect(comet.live).toBe(true);
    expect(comet.anim).toBe('float');
    expect(sim.view().regionState[16 * 4 + 3]! & REGION_FLAG.wiggle).toBe(REGION_FLAG.wiggle);
  });
});

describe('actors', () => {
  function awakeLumi(brush: 'standard' | 'turboCheetah' = 'standard') {
    const sim = mkSim();
    paintRegion(sim, 5, 6, 2);
    paintRegion(sim, 6, 6, 2);
    setTool(sim, { brush });
    sim.drainEvents();
    return sim;
  }

  it('Lumi gallops along the gallop path when awake; turbo moves 2x faster', () => {
    const travel = (brush: 'standard' | 'turboCheetah'): number => {
      const sim = awakeLumi(brush);
      const l0 = actor(sim, 'lumi')!;
      let len = 0;
      let px = l0.x;
      let py = l0.y;
      for (let t = 0; t < 2000; t += 16) {
        sim.update(16, t);
        const l = actor(sim, 'lumi')!;
        len += Math.hypot(l.x - px, l.y - py);
        px = l.x;
        py = l.y;
      }
      return len;
    };
    const a = travel('standard');
    const b = travel('turboCheetah');
    expect(a).toBeGreaterThan(20);
    expect(b / a).toBeGreaterThan(1.6);
  });

  it('poking awake Lumi: poke event + rear + rainbowArc; taps never paint', () => {
    const sim = awakeLumi();
    const l = actor(sim, 'lumi')!;
    const before = sim.regionPercent(5);
    tap(sim, l.x, l.y);
    const ev = sim.drainEvents();
    expect(ev.filter((e) => e.type === 'poke')).toEqual([{ type: 'poke', actor: 'lumi', instanceId: 'lumi-1' }]);
    sim.update(16, 0);
    expect(actor(sim, 'lumi')!.anim).toBe('rear');
    expect(sim.view().effects.some((e) => e.kind === 'rainbowArc')).toBe(true);
    expect(sim.regionPercent(5)).toBe(before);
  });

  it('turbo poke adds a bonus starBurst', () => {
    const sim = awakeLumi('turboCheetah');
    const l = actor(sim, 'lumi')!;
    sim.view().effects.length = 0;
    tap(sim, l.x, l.y);
    expect(sim.view().effects.some((e) => e.kind === 'starBurst' && e.ageMs === 0)).toBe(true);
  });

  it('poking Nova makes her chase the pointer for POKE_CHASE_MS (anim run)', () => {
    const sim = mkSim();
    paintRegion(sim, 9, 6, 2);
    paintRegion(sim, 10, 6, 2);
    sim.drainEvents();
    const n0 = { ...actor(sim, 'nova')! };
    tap(sim, n0.x, n0.y);
    expect(sim.drainEvents().some((e) => e.type === 'poke' && e.actor === 'nova')).toBe(true);
    sim.hover({ x: 300, y: 150 });
    let sawRun = false;
    for (let t = 0; t < 1500; t += 16) {
      sim.update(16, t);
      if (actor(sim, 'nova')!.anim === 'run') sawRun = true;
    }
    const n1 = actor(sim, 'nova')!;
    expect(sawRun).toBe(true);
    expect(Math.hypot(n1.x - 300, n1.y - 150)).toBeLessThan(Math.hypot(n0.x - 300, n0.y - 150) - 20);
    // after the chase window she stops tracking the pointer and returns to her sprint path
    run(sim, POKE_CHASE_MS + 2000);
    sim.hover({ x: 20, y: 20 });
    run(sim, 800);
    expect(actor(sim, 'nova')!.y).toBeGreaterThan(190);
  });

  it('moon-cat peeks while tracking hover', () => {
    const sim = mkSim();
    const path = sim.qaStrokePath(17);
    drag(sim, path.slice(0, Math.floor(path.length * 0.4)));
    sim.hover({ x: 350, y: 80 });
    run(sim, 100);
    expect(actor(sim, 'moonCat')!.anim).toBe('peek');
    sim.hover({ x: 10, y: 260 });
    run(sim, 100);
    expect(actor(sim, 'moonCat')!.anim).not.toBe('peek');
  });

  it('stage 3 companions lean toward the brush', () => {
    const sim = mkSim();
    const path = sim.qaStrokePath(5);
    drag(sim, path.slice(0, Math.floor(path.length * 0.7)));
    expect(sim.regionPercent(5)).toBeGreaterThan(STAGE_MIN[3]!);
    expect(sim.regionPercent(5)).toBeLessThan(STAGE_MIN[4]!);
    sim.hover({ x: 160, y: 225 });
    run(sim, 600);
    expect(actor(sim, 'lumi')!.x).toBeGreaterThan(60.5);
  });

  it('zeroGGel: awake objects drift and bounce; they return when the gel is put down', () => {
    const sim = mkSim();
    paintRegion(sim, 17, 6, 2);
    const home = { x: actor(sim, 'moonCat')!.x, y: actor(sim, 'moonCat')!.y };
    setTool(sim, { brush: 'zeroGGel' });
    let maxD = 0;
    for (let t = 0; t < 8000; t += 16) {
      sim.update(16, t);
      const c = actor(sim, 'moonCat')!;
      maxD = Math.max(maxD, Math.hypot(c.x - home.x, c.y - home.y));
      expect(c.x).toBeGreaterThanOrEqual(10);
      expect(c.x).toBeLessThanOrEqual(470);
      expect(c.y).toBeGreaterThanOrEqual(10);
    }
    expect(maxD).toBeGreaterThan(40);
    setTool(sim, { brush: 'standard' });
    run(sim, 10000);
    const c = actor(sim, 'moonCat')!;
    expect(Math.hypot(c.x - home.x, c.y - home.y)).toBeLessThan(maxD);
  });

  it('viewOnly contexts allow pokes but never paint', () => {
    const sim = mkSim({ viewOnly: true });
    tap(sim, 60, 110);
    expect(sim.regionPercent(14)).toBe(0);
    // an awake actor can still be poked: restore a snapshot with Lumi complete
    const src = mkSim();
    paintRegion(src, 5, 6, 2);
    paintRegion(src, 6, 6, 2);
    sim.restorePage(src.snapshotPage());
    sim.drainEvents();
    const l = actor(sim, 'lumi')!;
    expect(l.live).toBe(true);
    tap(sim, l.x, l.y);
    expect(sim.drainEvents().some((e) => e.type === 'poke')).toBe(true);
    tap(sim, 60, 110);
    expect(sim.regionPercent(14)).toBe(0);
  });
});

describe('snapshot / restore', () => {
  it('round-trips painting, completion, material, awake actors and page progress', () => {
    const a = mkSim();
    paintRegion(a, 5, 6, 2);
    paintRegion(a, 6, 3, 2);
    paintRegion(a, 14, 7, 2);
    setTool(a, { materialId: 4 });
    drag(a, a.qaStrokePath(13).slice(0, 30));
    run(a, 300);
    a.drainEvents();
    const snap = a.snapshotPage();
    expect(snap.sceneId).toBe('rooftop');
    expect(snap.regionMaterialId).toHaveLength(256);
    expect(snap.completedRegionIds).toEqual([5, 6, 14]);

    const b = createSimulation();
    b.loadPage(buildFixture(), ctxOf());
    b.restorePage(snap);
    expect(b.drainEvents()).toEqual([]);
    for (let id = 0; id < 256; id++) expect(b.regionPercent(id)).toBe(a.regionPercent(id));
    const s2 = b.snapshotPage();
    expect([...s2.paintedMaskRle]).toEqual([...snap.paintedMaskRle]);
    expect([...s2.regionMaterialId]).toEqual([...snap.regionMaterialId]);
    expect(s2.completedRegionIds).toEqual(snap.completedRegionIds);
    const va = a.view();
    const vb = b.view();
    expect(vb.coreAwake).toBe(va.coreAwake);
    expect(vb.pageAwakening).toBeCloseTo(va.pageAwakening, 10);
    expect(vb.regionStateDirty).toBe(true);
    for (const id of [5, 6, 13, 14]) {
      for (const off of [0, 1, 3]) expect(vb.regionState[id * 4 + off]).toBe(va.regionState[id * 4 + off]);
    }
    expect(actor(b, 'lumi')!.live).toBe(true);
    // no re-awarded gems; completing regions again do not re-bloom
    paintRegion(b, 14, 6, 2);
    expect(count(b.drainEvents(), 'autoBloom')).toBe(0);
    // brute-force agrees after restore
    const brute = bruteCounts(page.regionMap, decodeMask(s2.paintedMaskRle));
    for (const id of [5, 6, 13, 14]) expect(b.regionPercent(id)).toBeCloseTo(brute[id]! / page.regionTotalPixels[id]!, 12);
    // restore re-creates the GPU stroke layer
    const b2 = createSimulation();
    b2.loadPage(buildFixture(), ctxOf());
    b2.restorePage(snap);
    expect(b2.drainStampBatches().length).toBeGreaterThan(0);
  });

  it('restoring does not re-award hidden-star gems from persisted trampolines', () => {
    const a = mkSim();
    paintRegion(a, 14, 7, 2);
    const b = mkSim();
    b.restorePage(a.snapshotPage());
    expect(b.view().effects.some((e) => e.kind === 'hiddenStar')).toBe(false);
    expect(b.view().effects.some((e) => e.kind === 'zeroGTrampoline')).toBe(true);
  });

  it('rejects malformed RLE instead of corrupting state', () => {
    const a = mkSim();
    const snap = a.snapshotPage();
    snap.paintedMaskRle = Uint8Array.from([0xff, 0xff, 0xff, 0xff, 0xff, 0xff]);
    expect(() => a.restorePage(snap)).toThrow();
  });
});

describe('gem totals', () => {
  it('a fully painted page pays regionBloom/actorBloom once per region plus pageComplete once', () => {
    const sim = mkSim();
    const ev: SimEvent[] = [];
    for (const id of CORE_IDS) {
      paintRegion(sim, id, 6, 3);
      ev.push(...sim.drainEvents());
    }
    const actorRegions = [5, 6, 9, 10, 1, 2];
    const expected = actorRegions.length * GEM_REWARDS.actorBloom + 4 * GEM_REWARDS.regionBloom + GEM_REWARDS.pageComplete;
    expect(gemsOf(ev)).toBe(expected);
    tap(sim, 60, 110);
    expect(gemsOf(sim.drainEvents())).toBe(0);
  });
});
