import { describe, expect, it } from 'vitest';
import { createArt } from '../../src/art';
import { createSimulation } from '../../src/simulation';
import { PAGE_H, PAGE_PIXELS, PAGE_W } from '../../src/contracts/constants';
import type { GestureEvent, WardrobeState } from '../../src/contracts';

const DEFAULT_WARDROBE: WardrobeState = {
  violetPins: false,
  violetCape: false,
  lumiWings: false,
  lumiCrown: false,
  novaBoosters: false,
  novaScarf: false,
};

function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function makeGesture(
  phase: GestureEvent['phase'],
  x: number,
  y: number,
  timeMs: number,
  pointerId = 1,
): GestureEvent {
  return {
    phase,
    x,
    y,
    pointerId,
    pointerType: 'touch',
    pressure: phase === 'end' || phase === 'cancel' ? 0 : 0.7,
    tiltX: 0,
    tiltY: 0,
    timeMs,
  };
}

function decodeRleMask(rle: Uint8Array): Uint8Array {
  const mask = new Uint8Array(PAGE_PIXELS);
  let pos = 0;
  let cur = 0;
  let i = 0;
  while (pos < rle.length) {
    let v = 0;
    let shift = 0;
    for (;;) {
      const b = rle[pos++];
      if (b === undefined) throw new Error('truncated RLE');
      v |= (b & 0x7f) << shift;
      if ((b & 0x80) === 0) break;
      shift += 7;
    }
    if (cur === 1) mask.fill(1, i, i + v);
    i += v;
    cur ^= 1;
  }
  expect(i).toBe(PAGE_PIXELS);
  return mask;
}

interface BorderCrossing {
  inkX: number;
  inkY: number;
  startX: number;
  startY: number;
  endX: number;
  endY: number;
  regionA: number;
  regionB: number;
}

function isColourable(
  id: number,
  regions: ReturnType<ReturnType<typeof createArt>['compilePage']>['regions'],
  totals: Uint32Array,
): boolean {
  if (id < 1 || id > 211) return false;
  if ((totals[id] ?? 0) === 0) return false;
  const meta = regions[id];
  if (meta?.coverageExcluded) return false;
  return true;
}

function findThinInkBorderCrossings(
  page: ReturnType<ReturnType<typeof createArt>['compilePage']>,
): BorderCrossing[] {
  const map = page.regionMap;
  const out: BorderCrossing[] = [];
  const dirs: ReadonlyArray<readonly [number, number]> = [
    [1, 0],
    [0, 1],
    [1, 1],
    [1, -1],
  ];

  for (let y = 2; y < PAGE_H - 2; y++) {
    for (let x = 2; x < PAGE_W - 2; x++) {
      if (map[y * PAGE_W + x] !== 0) continue;
      for (const [dx, dy] of dirs) {
        const a = map[(y - dy) * PAGE_W + (x - dx)]!;
        const b = map[(y + dy) * PAGE_W + (x + dx)]!;
        if (a !== b && isColourable(a, page.regions, page.regionTotalPixels) && isColourable(b, page.regions, page.regionTotalPixels)) {
          out.push({
            inkX: x,
            inkY: y,
            startX: x - dx + 0.5,
            startY: y - dy + 0.5,
            endX: x + dx + 0.5,
            endY: y + dy + 0.5,
            regionA: a,
            regionB: b,
          });
          out.push({
            inkX: x,
            inkY: y,
            startX: x + dx + 0.5,
            startY: y + dy + 0.5,
            endX: x - dx + 0.5,
            endY: y - dy + 0.5,
            regionA: b,
            regionB: a,
          });
        }
      }
    }
  }
  return out;
}

describe('Red-Team Smart Touch-Lock Fuzz & Auto-Bloom Invariants', () => {
  it('survives 10,000 randomized diagonal scrubs across thin 1px ink borders with zero cross-region bleed and exact O(1) vs brute-force coverage', () => {
    const art = createArt();
    const page = art.compilePage('rooftop', 42, DEFAULT_WARDROBE);
    const sim = createSimulation();
    sim.loadPage(page, { seed: 42, chapterIndex: 0, brushes: ['standard'], relics: [] });
    sim.setTool({ materialId: 1, brush: 'standard', doodle: false });

    const crossings = findThinInkBorderCrossings(page);
    expect(crossings.length).toBeGreaterThan(20);

    // Collect every colourable region ID for exhaustive verification.
    const colourableIds: number[] = [];
    for (let id = 1; id <= 211; id++) {
      if (isColourable(id, page.regions, page.regionTotalPixels)) colourableIds.push(id);
    }
    expect(colourableIds.length).toBeGreaterThan(5);

    const rng = mulberry32(0xdeadbeef);
    const beforePct = new Float64Array(256);
    let timeMs = 100;
    let totalBatches = 0;
    let batchBleedViolations = 0;
    let pixelBleedViolations = 0;

    for (let iter = 0; iter < 10_000; iter++) {
      // Reload a few times across the 10k run so fresh uncolored border transitions are exercised repeatedly.
      if (iter > 0 && iter % 2500 === 0) {
        sim.loadPage(page, { seed: 42, chapterIndex: 0, brushes: ['standard'], relics: [] });
        sim.setTool({ materialId: (((iter / 2500) % 7) + 1) as 1 | 2 | 3 | 4 | 5 | 6 | 7, brush: 'standard', doodle: false });
      }

      const c = crossings[Math.floor(rng() * crossings.length)]!;
      const lockedRegion = c.regionA;

      for (let i = 0; i < colourableIds.length; i++) {
        const id = colourableIds[i]!;
        beforePct[id] = sim.regionPercent(id);
      }
      sim.drainStampBatches();

      // Diagonal vector crossing directly through the 1px ink border into region B and beyond.
      const dirX = c.endX - c.startX;
      const dirY = c.endY - c.startY;
      const jitterX = (rng() - 0.5) * 14;
      const jitterY = (rng() - 0.5) * 14;
      const targetX = Math.max(0.5, Math.min(PAGE_W - 0.5, c.endX + dirX * (4 + rng() * 16) + jitterX));
      const targetY = Math.max(0.5, Math.min(PAGE_H - 0.5, c.endY + dirY * (4 + rng() * 16) + jitterY));

      timeMs += 16;
      sim.gesture(makeGesture('start', c.startX, c.startY, timeMs, 1));
      const steps = 4;
      for (let s = 1; s <= steps; s++) {
        timeMs += 8;
        const t = s / steps;
        const mx = c.startX + (targetX - c.startX) * t;
        const my = c.startY + (targetY - c.startY) * t;
        sim.gesture(makeGesture('move', mx, my, timeMs, 1));
      }
      timeMs += 8;
      sim.gesture(makeGesture('end', targetX, targetY, timeMs, 1));

      // Verify GPU stamp batches strictly lock ONLY the initial region.
      const batches = sim.drainStampBatches();
      totalBatches += batches.length;
      for (let b = 0; b < batches.length; b++) {
        const allowed = batches[b]!.allowed;
        for (let id = 0; id < 256; id++) {
          const expected = id === lockedRegion ? 1 : 0;
          if (allowed[id] !== expected) {
            batchBleedViolations++;
            throw new Error(`GPU batch bleed on iter ${iter}: locked=${lockedRegion}, id=${id}, allowed=${allowed[id]}`);
          }
        }
      }

      // Verify ZERO pixel bleed into ANY other region.
      for (let i = 0; i < colourableIds.length; i++) {
        const id = colourableIds[i]!;
        if (id === lockedRegion) continue;
        const after = sim.regionPercent(id);
        if (after !== beforePct[id]) {
          pixelBleedViolations++;
          throw new Error(`Cross-region pixel bleed on iter ${iter}: locked=${lockedRegion}, bledId=${id}, before=${beforePct[id]}, after=${after}`);
        }
      }

      // Periodically verify brute-force painted mask scan matches O(1) regionPercent(id).
      if (iter % 2500 === 2499) {
        const snap = sim.snapshotPage();
        const mask = decodeRleMask(snap.paintedMaskRle);
        const brutePainted = new Uint32Array(256);
        for (let px = 0; px < PAGE_PIXELS; px++) {
          if (mask[px] === 1) {
            brutePainted[page.regionMap[px]!]!++;
          }
        }
        // Ink (0) and sky (255) must NEVER have painted pixels.
        expect(brutePainted[0]).toBe(0);
        expect(brutePainted[255]).toBe(0);

        for (const id of colourableIds) {
          const expectedPct = brutePainted[id]! / page.regionTotalPixels[id]!;
          expect(sim.regionPercent(id)).toBe(expectedPct);
        }
      }
    }

    expect(batchBleedViolations).toBe(0);
    expect(pixelBleedViolations).toBe(0);
    expect(totalBatches).toBeGreaterThan(3000);
  }, 30_000);

  it('snaps taps directly on ink ID 0 to an adjacent colourable neighbor without bleeding', () => {
    const art = createArt();
    const page = art.compilePage('rooftop', 42, DEFAULT_WARDROBE);
    const sim = createSimulation();
    sim.loadPage(page, { seed: 42, chapterIndex: 0, brushes: ['standard'], relics: [] });
    sim.setTool({ materialId: 2, brush: 'standard', doodle: false });

    const crossings = findThinInkBorderCrossings(page);
    expect(crossings.length).toBeGreaterThan(0);
    const target = crossings[0]!;
    expect(page.regionMap[target.inkY * PAGE_W + target.inkX]).toBe(0);

    sim.drainStampBatches();
    sim.gesture(makeGesture('start', target.inkX + 0.5, target.inkY + 0.5, 100, 1));
    sim.gesture(makeGesture('move', target.endX + 4, target.endY + 4, 116, 1));
    sim.gesture(makeGesture('end', target.endX + 4, target.endY + 4, 132, 1));

    const batches = sim.drainStampBatches();
    expect(batches.length).toBeGreaterThan(0);

    const allowedIds: number[] = [];
    for (let id = 0; id < 256; id++) {
      if (batches[0]!.allowed[id] === 1) allowedIds.push(id);
    }
    expect(allowedIds.length).toBe(1);
    const snappedId = allowedIds[0]!;
    expect(snappedId).toBeGreaterThanOrEqual(1);
    expect(snappedId).toBeLessThanOrEqual(211);
    expect(sim.regionPercent(snappedId)).toBeGreaterThan(0);

    // Every other colourable region must remain strictly 0%.
    for (let id = 1; id <= 211; id++) {
      if (id === snappedId) continue;
      if (isColourable(id, page.regions, page.regionTotalPixels)) {
        expect(sim.regionPercent(id)).toBe(0);
      }
    }
  });

  it('ignores multi-touch second pointer and immediately halts painting on cancel', () => {
    const art = createArt();
    const page = art.compilePage('rooftop', 42, DEFAULT_WARDROBE);
    const sim = createSimulation();
    sim.loadPage(page, { seed: 42, chapterIndex: 0, brushes: ['standard'], relics: [] });
    sim.setTool({ materialId: 3, brush: 'standard', doodle: false });

    // Pick two distinct colourable regions with known interior stroke points.
    const candidates = page.coreRegionIds.filter((id) => sim.qaStrokePath(id).length >= 3);
    expect(candidates.length).toBeGreaterThanOrEqual(2);
    const regA = candidates[0]!;
    const regB = candidates[1]!;
    const ptsA = sim.qaStrokePath(regA);
    const ptsB = sim.qaStrokePath(regB);

    // Pointer 1 starts painting region A.
    sim.gesture(makeGesture('start', ptsA[0]!.x, ptsA[0]!.y, 100, 1));
    const pctAAfterStart = sim.regionPercent(regA);
    expect(pctAAfterStart).toBeGreaterThan(0);

    // Pointer 2 tries to paint region B concurrently and then ends — must be totally ignored.
    sim.gesture(makeGesture('start', ptsB[0]!.x, ptsB[0]!.y, 110, 2));
    sim.gesture(makeGesture('move', ptsB[1]!.x, ptsB[1]!.y, 120, 2));
    sim.gesture(makeGesture('end', ptsB[1]!.x, ptsB[1]!.y, 130, 2));
    expect(sim.regionPercent(regB)).toBe(0);

    // Pointer 1 is still active and continues painting region A.
    sim.gesture(makeGesture('move', ptsA[1]!.x, ptsA[1]!.y, 140, 1));
    expect(sim.regionPercent(regA)).toBeGreaterThanOrEqual(pctAAfterStart);

    // Now cancel pointer 1 -> painting must stop immediately.
    sim.drainEvents();
    sim.drainStampBatches();
    sim.gesture(makeGesture('cancel', ptsA[1]!.x, ptsA[1]!.y, 150, 1));
    const cancelEvents = sim.drainEvents();
    expect(cancelEvents.some((ev) => ev.type === 'stroke' && !ev.active)).toBe(true);

    const pctAfterCancel = sim.regionPercent(regA);
    sim.drainStampBatches();
    for (let i = 2; i < ptsA.length; i++) {
      sim.gesture(makeGesture('move', ptsA[i]!.x, ptsA[i]!.y, 160 + i * 10, 1));
    }
    expect(sim.drainStampBatches().length).toBe(0);
    expect(sim.regionPercent(regA)).toBe(pctAfterCancel);
    expect(sim.regionPercent(regB)).toBe(0);
  });

  it('triggers Auto-Bloom to 100% at >=93.0% and awards gems exactly once despite repeated follow-up strokes', () => {
    const art = createArt();
    const page = art.compilePage('rooftop', 42, DEFAULT_WARDROBE);
    const sim = createSimulation();
    sim.loadPage(page, { seed: 42, chapterIndex: 0, brushes: ['standard'], relics: [] });
    sim.setTool({ materialId: 6, brush: 'standard', doodle: false });

    // Choose a non-actor core region (e.g. a cloud or planet) so we know exact reward & no poke intercept.
    const targetId = page.coreRegionIds.find((id) => {
      const m = page.regions[id];
      return m && (m.kind === 'cloud' || m.kind === 'planet') && sim.qaStrokePath(id).length > 4;
    });
    expect(targetId).toBeDefined();
    const pts = sim.qaStrokePath(targetId!);

    let autoBloomCount = 0;
    let gemEventCount = 0;
    let gemTotal = 0;
    let sawPreBloomPct = 0;

    const harvest = (): void => {
      for (const ev of sim.drainEvents()) {
        if (ev.type === 'autoBloom' && ev.regionId === targetId) autoBloomCount++;
        if (ev.type === 'gems' && (ev.reason === 'regionBloom' || ev.reason === 'actorBloom')) {
          gemEventCount++;
          gemTotal += ev.amount;
        }
      }
    };

    // Paint along QA scanline until auto-bloom fires.
    let t = 100;
    sim.gesture(makeGesture('start', pts[0]!.x, pts[0]!.y, t, 1));
    harvest();
    for (let i = 1; i < pts.length; i++) {
      const pctBefore = sim.regionPercent(targetId!);
      if (pctBefore < 0.93) sawPreBloomPct = Math.max(sawPreBloomPct, pctBefore);
      t += 10;
      sim.gesture(makeGesture('move', pts[i]!.x, pts[i]!.y, t, 1));
      harvest();
    }
    sim.gesture(makeGesture('end', pts[pts.length - 1]!.x, pts[pts.length - 1]!.y, t + 10, 1));
    harvest();

    expect(sawPreBloomPct).toBeGreaterThan(0);
    expect(sim.regionPercent(targetId!)).toBe(1);
    expect(autoBloomCount).toBe(1);
    expect(gemEventCount).toBe(1);
    expect(gemTotal).toBe(3);

    // Hammer the already-completed region with 10 full follow-up strokes across different materials.
    for (let pass = 0; pass < 10; pass++) {
      sim.setTool({ materialId: ((pass % 7) + 1) as 1 | 2 | 3 | 4 | 5 | 6 | 7, brush: 'standard', doodle: false });
      t += 20;
      sim.gesture(makeGesture('start', pts[0]!.x, pts[0]!.y, t, 1));
      for (let i = 1; i < pts.length; i += 2) {
        t += 8;
        sim.gesture(makeGesture('move', pts[i]!.x, pts[i]!.y, t, 1));
      }
      t += 8;
      sim.gesture(makeGesture('end', pts[pts.length - 1]!.x, pts[pts.length - 1]!.y, t, 1));
      sim.update(50, t);
      harvest();
    }

    expect(sim.regionPercent(targetId!)).toBe(1);
    expect(autoBloomCount).toBe(1);
    expect(gemEventCount).toBe(1);
    expect(gemTotal).toBe(3);
  });
});
