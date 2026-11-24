import { describe, expect, it } from 'vitest';
import type { ActorKind, CompiledPage, SpriteLibrary, SpriteSheet } from '../../../src/contracts/art';
import { PAGE_H, PAGE_W } from '../../../src/contracts/constants';
import type { ActorRenderState, WispRenderState } from '../../../src/contracts/simulation';
import { AdaptiveResolution, initialResolution, median } from '../../../src/renderer/adaptive';
import {
  FALLBACK_WISP_SHEET,
  blitActor,
  blitActors,
  blitWisp,
  buildRegionTexData,
  liveSlotMask,
} from '../../../src/renderer/pageData';
import { PixelPlane } from '../../../src/renderer/pixelPlane';

describe('buildRegionTexData', () => {
  it('packs R region, G base, B actor slot, A 255', () => {
    const n = PAGE_W * PAGE_H;
    const page = {
      regionMap: new Uint8Array(n).fill(7),
      baseRegionMap: new Uint8Array(n).fill(255),
      actorSlotMap: new Uint8Array(n).fill(0),
    } as unknown as CompiledPage;
    page.regionMap[5] = 0;
    page.actorSlotMap[5] = 3;
    const out = new Uint8Array(n * 4);
    buildRegionTexData(page, out);
    expect(Array.from(out.slice(0, 4))).toEqual([7, 255, 0, 255]);
    expect(Array.from(out.slice(20, 24))).toEqual([0, 255, 3, 255]);
    expect(out[n * 4 - 1]).toBe(255);
  });
});

describe('live slots + sprite blit', () => {
  const sheet: SpriteSheet = {
    anchorX: 1,
    anchorY: 1,
    anims: {
      idle: { frames: [{ w: 3, h: 2, pixels: Uint8Array.from([5, 255, 0, 5, 212, 255]) }, { w: 1, h: 1, pixels: Uint8Array.from([9]) }], frameMs: 100, loop: true },
    },
  };
  const lib = { lumi: sheet } as unknown as SpriteLibrary;
  const actor = (over: Partial<ActorRenderState> = {}): ActorRenderState => ({
    instanceId: 'x', kind: 'lumi' as ActorKind, slot: 2, x: 10, y: 10, facing: 1, anim: 'idle', frame: 0, live: true, ...over,
  });

  it('builds the uLiveSlots bitmask only from live actors', () => {
    expect(liveSlotMask([actor({ slot: 1 }), actor({ slot: 4 }), actor({ slot: 7, live: false })])).toBe((1 << 1) | (1 << 4));
    expect(liveSlotMask([])).toBe(0);
    expect(liveSlotMask([actor({ slot: 0 }), actor({ slot: 16 })])).toBe(0);
  });

  it('blits around the anchor, skipping 255 (transparent)', () => {
    const p = new PixelPlane();
    expect(blitActor(p, lib, actor())).toBe(4);
    expect(p.idAt(9, 9)).toBe(5);
    expect(p.idAt(10, 9)).toBe(-1);
    expect(p.idAt(11, 9)).toBe(0);
    expect(p.idAt(9, 10)).toBe(5);
    expect(p.idAt(10, 10)).toBe(212);
  });

  it('mirrors when facing -1, applies remap, and wraps the frame index', () => {
    const p = new PixelPlane();
    blitActor(p, lib, actor({ facing: -1, remap: { 5: 40 } }));
    // frame w=3, anchorX mirrored to 1: the 255 gap stays in the middle, ids remapped
    expect(p.idAt(11, 9)).toBe(40);
    expect(p.idAt(9, 9)).toBe(0);
    const q = new PixelPlane();
    blitActor(q, lib, actor({ frame: 3 })); // 3 % 2 = frame 1 (1x1 id 9)
    expect(q.count).toBe(1);
    expect(q.idAt(9, 9)).toBe(9);
  });

  it('clamps sprites hanging off the page and skips non-live actors', () => {
    const p = new PixelPlane();
    blitActors(p, lib, [actor({ x: -50, y: -50 }), actor({ x: PAGE_W + 40, y: PAGE_H + 40 }), actor({ live: false })]);
    expect(p.count).toBe(0);
    blitActors(p, lib, [actor({ x: 0, y: 0 })]);
    expect(p.count).toBeGreaterThan(0);
  });
});

describe('Starlight Wisp sprite blitting', () => {
  const mkWisp = (over: Partial<WispRenderState> = {}): WispRenderState => ({
    active: true,
    mode: 'idleGuide',
    x: 120,
    y: 90,
    targetRegionId: 5,
    ghostStrokeT: 0,
    ghostPath: [],
    prologueMist: 0,
    alpha: 1,
    ...over,
  });

  it('provides a crisp 11x11 procedural fallback wisp using 231/232 when custom sheet is omitted', () => {
    const frames = FALLBACK_WISP_SHEET.anims.idle?.frames ?? [];
    expect(frames.length).toBeGreaterThanOrEqual(4);
    for (const fr of frames) {
      expect(fr.w).toBe(11);
      expect(fr.h).toBe(11);
      for (const px of fr.pixels) expect([231, 232, 255]).toContain(px);
    }
    const p = new PixelPlane();
    const written = blitWisp(p, mkWisp(), null, 0);
    expect(written).toBeGreaterThan(20);
    expect(p.idAt(120, 90)).toBe(231); // bright starlight core at anchor
    const ids = new Set<number>();
    for (let i = 0; i < PAGE_W * PAGE_H; i++) {
      if (p.data[i * 4 + 3] === 255) ids.add(p.data[i * 4] as number);
    }
    expect(ids.has(231) && ids.has(232)).toBe(true);
  });

  it('blits a custom SpriteSheet, picks idle vs float by mode, dithers low alpha, and ignores hidden/inactive wisps', () => {
    const customSheet: SpriteSheet = {
      anchorX: 1,
      anchorY: 1,
      anims: {
        idle: { frames: [{ w: 3, h: 3, pixels: Uint8Array.from([255, 232, 255, 232, 231, 232, 255, 232, 255]) }], frameMs: 120, loop: true },
        float: { frames: [{ w: 3, h: 3, pixels: Uint8Array.from([232, 231, 232, 231, 212, 231, 232, 231, 232]) }], frameMs: 100, loop: true },
      },
    };
    const pIdle = new PixelPlane();
    expect(blitWisp(pIdle, mkWisp({ mode: 'prologueTapPencil' }), customSheet, 0)).toBe(5);
    expect(pIdle.idAt(120, 90)).toBe(231);

    const pFloat = new PixelPlane();
    expect(blitWisp(pFloat, mkWisp({ mode: 'prologueStroke' }), customSheet, 0)).toBe(9);
    expect(pFloat.idAt(120, 90)).toBe(212);

    const pHint = new PixelPlane();
    expect(blitWisp(pHint, mkWisp({ mode: 'hintBeam' }), customSheet, 0)).toBe(9);
    expect(pHint.idAt(120, 90)).toBe(212);

    const pFull = new PixelPlane();
    const pFade = new PixelPlane();
    blitWisp(pFull, mkWisp({ alpha: 1 }), null, 0);
    blitWisp(pFade, mkWisp({ alpha: 0.35 }), null, 0);
    expect(pFade.count).toBeGreaterThan(0);
    expect(pFade.count).toBeLessThan(pFull.count);

    const pSkip = new PixelPlane();
    expect(blitWisp(pSkip, mkWisp({ active: false }), customSheet, 0)).toBe(0);
    expect(blitWisp(pSkip, mkWisp({ mode: 'hidden' }), customSheet, 0)).toBe(0);
    expect(blitWisp(pSkip, mkWisp({ alpha: 0.01 }), customSheet, 0)).toBe(0);
    expect(blitWisp(pSkip, mkWisp({ x: -100, y: -100 }), customSheet, 0)).toBe(0);
    expect(blitWisp(pSkip, mkWisp({ x: NaN }), customSheet, 0)).toBe(0);
    expect(pSkip.count).toBe(0);
  });
});

describe('adaptive resolution', () => {
  it('median helper', () => {
    expect(median([3, 1, 2])).toBe(2);
    expect(median([1, 2, 3, 4])).toBe(2.5);
    expect(median([])).toBe(0);
  });

  it('starts at min(dpr, 2)', () => {
    expect(initialResolution(3)).toBe(2);
    expect(initialResolution(1.25)).toBe(1.25);
    expect(initialResolution(0)).toBe(1);
  });

  it('downshifts 2 -> 1.5 -> 1 only after a 2 s window with median > 18 ms', () => {
    const a = new AdaptiveResolution(2);
    let t = 0;
    const shifts: number[] = [];
    // t=0 initializes the windowStart, then 100 more frames of 20 ms reach t=2000 ms -> first downshift
    for (let i = 0; i <= 100; i++) {
      const r = a.push(20, t);
      if (r !== null) shifts.push(r);
      t += 20;
    }
    expect(shifts).toEqual([1.5]);
    // 100 more frames of 20 ms reach t=4000 ms -> second downshift
    for (let i = 0; i < 100; i++) {
      const r = a.push(20, t);
      if (r !== null) shifts.push(r);
      t += 20;
    }
    expect(shifts).toEqual([1.5, 1]);
    for (let i = 0; i < 300; i++) {
      expect(a.push(20, t)).toBeNull();
      t += 20;
    }
    expect(a.resolution).toBe(1);
  });

  it('never downshifts on healthy frames or on a few slow outliers', () => {
    const a = new AdaptiveResolution(2);
    let t = 0;
    shiftsNone: for (let i = 0; i < 400; i++) {
      t += 16;
      const dt = i % 10 === 0 ? 60 : 16; // outliers, median stays 16
      if (a.push(dt, t) !== null) {
        expect.fail('unexpected downshift');
        break shiftsNone;
      }
    }
    expect(a.resolution).toBe(2);
  });
});
