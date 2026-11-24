import { describe, expect, it } from 'vitest';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { MAX_STAMPS_PER_BATCH, PAGE_PIXELS, REGION_FLAG, STAMP_SPACING, BRUSH_RADIUS_PX } from '../../../src/contracts';
import { bruteCounts, buildFixture, decodeMask, rand, RECTS } from './fixture';
import { count, drag, ge, mkSim, paintRegion, run, setTool, tap } from './helpers';

const page = buildFixture();
const COLOUR_IDS = RECTS.filter((r) => r.id !== 240).map((r) => r.id);

function paintedIds(sim: ReturnType<typeof mkSim>): Uint32Array {
  return bruteCounts(page.regionMap, decodeMask(sim.snapshotPage().paintedMaskRle));
}

describe('O(1) coverage', () => {
  it('regionPercent equals a brute-force count after randomised strokes', () => {
    const sim = mkSim();
    rand(99);
    const brushes = ['standard', 'turboCheetah', 'twinTail', 'zeroGGel'] as const;
    for (let s = 0; s < 60; s++) {
      const r = RECTS[Math.floor(rand() * (RECTS.length - 1))]!;
      setTool(sim, { materialId: (1 + Math.floor(rand() * 7)) as 1, brush: brushes[s % 4]! });
      const pts = [] as { x: number; y: number }[];
      let x = r.x0 + rand() * (r.x1 - r.x0);
      let y = r.y0 + rand() * (r.y1 - r.y0);
      for (let i = 0; i < 25; i++) {
        pts.push({ x, y });
        x += (rand() - 0.5) * 40;
        y += (rand() - 0.5) * 40;
      }
      drag(sim, pts);
    }
    const brute = paintedIds(sim);
    let anyPainted = false;
    for (const id of COLOUR_IDS) {
      const total = page.regionTotalPixels[id]!;
      expect(sim.regionPercent(id)).toBeCloseTo(brute[id]! / total, 12);
      if (brute[id]! > 0) anyPainted = true;
    }
    expect(anyPainted).toBe(true);
    // never any coverage on ink / sky
    expect(brute[0]).toBe(0);
    expect(brute[255]).toBe(0);
  });

  it('regionState bytes follow the REGION_STATE layout and view() clears the dirty flag', () => {
    const sim = mkSim();
    expect(sim.view().regionStateDirty).toBe(true); // first view after load
    expect(sim.view().regionStateDirty).toBe(false);
    setTool(sim, { materialId: 3 });
    const pts = sim.qaStrokePath(14).slice(0, 80);
    drag(sim, pts);
    const v = sim.view();
    expect(v.regionStateDirty).toBe(true);
    expect(v.regionState.length).toBe(2048);
    const pct = sim.regionPercent(14);
    expect(pct).toBeGreaterThan(0.01);
    expect(v.regionState[14 * 4]).toBe(3);
    expect(v.regionState[14 * 4 + 1]).toBe(Math.floor(pct * 255));
    expect(v.regionState[14 * 4 + 3]! & REGION_FLAG.wiggle).toBe(REGION_FLAG.wiggle);
    const st = v.regionState[1024 + 14 * 4 + 2]!;
    expect(st).toBeGreaterThanOrEqual(1);
    expect(st).toBeLessThanOrEqual(3);
    expect(sim.view().regionStateDirty).toBe(false);
  });

  it('qaStrokePath points lie inside the region and stay on a 4px step', () => {
    const sim = mkSim();
    const pts = sim.qaStrokePath(13);
    expect(pts.length).toBeGreaterThan(20);
    for (const p of pts) expect(page.regionMap[Math.floor(p.y) * 480 + Math.floor(p.x)]).toBe(13);
    const ys = [...new Set(pts.map((p) => p.y))];
    for (let i = 1; i < ys.length; i++) expect(ys[i]! - ys[i - 1]!).toBe(4);
    expect(sim.qaStrokePath(0)).toEqual([]);
  });
});

describe('Smart Touch-Lock', () => {
  it('fuzz diagonal scrubs across thin ink borders paint ZERO pixels outside the locked region', () => {
    rand(2024);
    for (let trial = 0; trial < 40; trial++) {
      const sim = mkSim();
      const r = RECTS.filter((q) => q.id !== 240)[Math.floor(rand() * 16)]!;
      const sx = r.x0 + rand() * (r.x1 - r.x0);
      const sy = r.y0 + rand() * (r.y1 - r.y0);
      const lock = page.regionMap[Math.floor(sy) * 480 + Math.floor(sx)]!;
      // long zig-zag diagonals that cross every border around the start region
      const pts = [{ x: sx, y: sy }];
      let dir = rand() < 0.5 ? 1 : -1;
      let cx = sx;
      let cy = sy;
      for (let i = 0; i < 30; i++) {
        cx = Math.min(479, Math.max(0, cx + dir * (20 + rand() * 60)));
        cy = Math.min(269, Math.max(0, cy + (rand() - 0.3) * 50));
        pts.push({ x: cx, y: cy });
        dir = -dir;
      }
      setTool(sim, { materialId: 5, brush: trial % 2 ? 'turboCheetah' : 'standard' });
      drag(sim, pts);
      const brute = paintedIds(sim);
      for (let id = 0; id < 256; id++) if (id !== lock) expect(brute[id], `trial ${trial} region ${id}`).toBe(0);
      expect(brute[lock]).toBeGreaterThan(0);
    }
  });

  it('twin-tail paints only the locked region plus its immediate neighbours (~40% per neighbour pixel)', () => {
    let neighbourPainted = 0;
    let neighbourSeen = 0;
    rand(77);
    for (let trial = 0; trial < 12; trial++) {
      const sim = mkSim();
      const lock = [12, 14, 20, 16, 5][trial % 5]!;
      const meta = page.regions[lock]!;
      const allowed = new Set<number>([lock, ...meta.neighbors]);
      setTool(sim, { brush: 'twinTail' });
      const pts = sim.qaStrokePath(lock);
      drag(sim, pts.slice(0, Math.floor(pts.length * 0.6)));
      // also scrub straight across the neighbour border
      drag(sim, [pts[0]!, { x: meta.bbox.x1 + 3, y: pts[0]!.y }, { x: meta.bbox.x0 - 3, y: pts[0]!.y + 4 }]);
      const brute = paintedIds(sim);
      for (let id = 0; id < 256; id++) {
        if (!allowed.has(id)) expect(brute[id], `lock ${lock} leaked into ${id}`).toBe(0);
      }
      for (const n of meta.neighbors) {
        if (n > 240) continue;
        neighbourPainted += brute[n]!;
        neighbourSeen += 1;
      }
    }
    expect(neighbourSeen).toBeGreaterThan(0);
    expect(neighbourPainted).toBeGreaterThan(0);
    // standard brush never leaks into neighbours (covered by the fuzz test above)
  });

  it('twin-tail neighbour splash covers ~40% of fully-stamped neighbour pixels, deterministically', () => {
    const run1 = (): { frac: number; mask: Uint8Array } => {
      const sim = mkSim();
      setTool(sim, { brush: 'twinTail' });
      drag(sim, [{ x: 110, y: 25 }, { x: 124, y: 25 }, { x: 124, y: 96 }]);
      const mask = decodeMask(sim.snapshotPage().paintedMaskRle);
      let inZone = 0;
      let painted = 0;
      for (let y = 30; y <= 90; y++) {
        for (let x = 122; x <= 129; x++) {
          inZone++;
          if (mask[y * 480 + x]) painted++;
        }
      }
      return { frac: painted / inZone, mask };
    };
    const a = run1();
    const b = run1();
    expect(a.frac).toBeGreaterThan(0.3);
    expect(a.frac).toBeLessThan(0.5);
    expect([...a.mask]).toEqual([...b.mask]);
  });

  it('ink-tap snaps to the nearest neighbouring region (3x3, then radius 3)', () => {
    // ink columns 120,121 sit between planet 12 (x<=119) and rings 13 (x>=122)
    let sim = mkSim();
    tap(sim, 120.4, 60);
    expect(sim.regionPercent(12)).toBeGreaterThan(0);
    expect(sim.regionPercent(13)).toBe(0);
    sim = mkSim();
    tap(sim, 121.4, 60);
    expect(sim.regionPercent(13)).toBeGreaterThan(0);
    expect(sim.regionPercent(12)).toBe(0);
    // ink corner: 2px outside the rect still snaps within radius 3
    sim = mkSim();
    tap(sim, 18.5, 18.5); // diagonal ink pixel outside region 12's corner
    expect(sim.regionPercent(12)).toBeGreaterThan(0);
    // sky beyond reach does nothing
    sim = mkSim();
    tap(sim, 245, 60);
    for (const id of COLOUR_IDS) expect(sim.regionPercent(id)).toBe(0);
  });

  it('sky doodle only emits a GPU batch (allowed = [255]) and never touches coverage', () => {
    const sim = mkSim();
    setTool(sim, { doodle: true });
    drag(sim, [{ x: 245, y: 10 }, { x: 260, y: 14 }, { x: 290, y: 8 }]);
    const batches = sim.drainStampBatches();
    expect(batches.length).toBeGreaterThan(0);
    for (const b of batches) {
      expect(b.allowed.length).toBe(256);
      expect([...b.allowed].reduce((a, v) => a + v, 0)).toBe(1);
      expect(b.allowed[255]).toBe(1);
    }
    expect(paintedIds(sim).reduce((a, v) => a + v, 0)).toBe(0);
    // doodle off: sky tap is ignored
    setTool(sim, { doodle: false });
    tap(sim, 245, 10);
    expect(sim.drainStampBatches().length).toBe(0);
  });

  it('system and unrevealed ghost regions are never painted', () => {
    const sim = mkSim();
    setTool(sim, { doodle: true });
    tap(sim, 450, 40); // ghost 240, no UV flashlight
    expect(sim.drainStampBatches().length).toBe(0);
    expect(sim.regionPercent(240)).toBe(0);
  });

  it('cancel ends the gesture and stops painting', () => {
    const sim = mkSim();
    sim.gesture(ge('start', 30, 110));
    sim.gesture(ge('move', 100, 110));
    const before = sim.regionPercent(14);
    expect(before).toBeGreaterThan(0);
    sim.gesture(ge('cancel', 100, 110));
    const ev = sim.drainEvents();
    expect(ev.some((e) => e.type === 'stroke' && !e.active)).toBe(true);
    sim.drainStampBatches();
    sim.gesture(ge('move', 100, 150));
    sim.gesture(ge('move', 30, 170));
    expect(sim.regionPercent(14)).toBe(before);
    expect(sim.drainStampBatches().length).toBe(0);
  });

  it('only the first pointer paints; other pointers are ignored', () => {
    const sim = mkSim();
    sim.gesture(ge('start', 30, 110, 1));
    sim.gesture(ge('start', 200, 140, 2)); // second finger on region 15
    sim.gesture(ge('move', 230, 160, 2));
    sim.gesture(ge('move', 100, 110, 1));
    sim.gesture(ge('end', 230, 160, 2)); // must not end pointer 1
    sim.gesture(ge('move', 100, 170, 1));
    expect(sim.regionPercent(15)).toBe(0);
    expect(sim.regionPercent(14)).toBeGreaterThan(0.02);
    const mid = sim.regionPercent(14);
    sim.gesture(ge('move', 40, 175, 1));
    expect(sim.regionPercent(14)).toBeGreaterThan(mid);
    sim.gesture(ge('end', 40, 175, 1));
    // pointer 2 can paint once pointer 1 is done
    tap(sim, 200, 140, 2);
    expect(sim.regionPercent(15)).toBeGreaterThan(0);
  });

  it('interpolates stamps every STAMP_SPACING*radius and batches carry flow + allowed ids', () => {
    const sim = mkSim();
    sim.gesture(ge('start', 25, 140));
    sim.gesture(ge('move', 115, 140));
    sim.gesture(ge('end', 115, 140));
    const batches = sim.drainStampBatches();
    const stamps = batches.flatMap((b) => b.stamps);
    const spacing = STAMP_SPACING * BRUSH_RADIUS_PX.standard;
    expect(stamps.length).toBeGreaterThanOrEqual(Math.floor(90 / spacing));
    for (const b of batches) {
      expect(b.stamps.length).toBeLessThanOrEqual(MAX_STAMPS_PER_BATCH);
      expect(b.allowed[14]).toBe(1);
      expect([...b.allowed].reduce((a, v) => a + v, 0)).toBe(1);
    }
    expect(stamps[stamps.length - 1]!.dx).toBeGreaterThan(0.9);
    expect(stamps[1]!.x - stamps[0]!.x).toBeCloseTo(spacing, 3);
    expect(stamps.every((s) => s.radius === 6)).toBe(true);
  });

  it('emits stroke events (active, speed, materialId)', () => {
    const sim = mkSim();
    setTool(sim, { materialId: 4 });
    sim.gesture(ge('start', 30, 110));
    sim.gesture(ge('move', 80, 110));
    sim.gesture(ge('end', 80, 110));
    const strokes = sim.drainEvents().filter((e) => e.type === 'stroke');
    expect(strokes[0]).toMatchObject({ active: true, materialId: 4 });
    expect(strokes.some((e) => e.type === 'stroke' && e.speed > 0)).toBe(true);
    expect(strokes[strokes.length - 1]).toMatchObject({ active: false });
  });

  it('500-stamp stroke on the 480x270 fixture is well under 50 ms', () => {
    const warm = mkSim();
    drag(warm, warm.qaStrokePath(13).slice(0, 200));
    const sim = mkSim();
    const spacing = STAMP_SPACING * BRUSH_RADIUS_PX.standard;
    const pts = [{ x: 25, y: 106 }];
    let x = 25;
    let y = 106;
    let dir = 1;
    for (let i = 0; i < 500; i++) {
      x += dir * spacing;
      if (x > 114 || x < 25) {
        dir = -dir;
        x += dir * spacing;
        y += 6;
        if (y > 176) y = 106;
      }
      pts.push({ x, y });
    }
    const t0 = performance.now();
    drag(sim, pts);
    const ms = performance.now() - t0;
    const stamps = sim.drainStampBatches().reduce((a, b) => a + b.stamps.length, 0);
    expect(stamps).toBeGreaterThanOrEqual(500);
    expect(ms).toBeLessThan(50);
  });
});

describe('invariants', () => {
  it('src/simulation contains no timers', () => {
    const dir = join(__dirname, '../../../src/simulation');
    const files = readdirSync(dir).filter((f) => statSync(join(dir, f)).isFile());
    expect(files.length).toBeGreaterThan(3);
    for (const f of files) {
      const text = readFileSync(join(dir, f), 'utf8');
      expect(text, f).not.toMatch(/setTimeout|setInterval|requestAnimationFrame/);
    }
  });

  it('percent is O(1): full-canvas painting does not slow the percent query', () => {
    const sim = mkSim();
    for (const id of COLOUR_IDS) paintRegion(sim, id);
    let sum = 0;
    const t0 = performance.now();
    for (let i = 0; i < 100000; i++) sum += sim.regionPercent(14 + (i % 3));
    expect(performance.now() - t0).toBeLessThan(50);
    expect(sum).toBeGreaterThan(0);
    run(sim, 100);
    expect(count(sim.drainEvents(), 'pageComplete')).toBe(1);
    expect(PAGE_PIXELS).toBe(129600);
  });
});
