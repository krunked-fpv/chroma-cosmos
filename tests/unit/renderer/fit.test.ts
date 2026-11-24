import { describe, expect, it } from 'vitest';
import { PAGE_H, PAGE_W } from '../../../src/contracts/constants';
import { clientToInternalPure, computeFit, internalToClientPure } from '../../../src/renderer/fit';

describe('computeFit', () => {
  it('uses an exact integer scale, centred, when s >= 2', () => {
    const f = computeFit(1366, 768); // 1366/480=2.84, 768/270=2.84 -> s=2
    expect(f.integer).toBe(true);
    expect(f.scale).toBe(2);
    expect(f.pageW).toBe(960);
    expect(f.pageH).toBe(540);
    expect(f.offX).toBe(Math.floor((1366 - 960) / 2));
    expect(f.offY).toBe(Math.floor((768 - 540) / 2));
  });

  it('picks s = floor(min(w/480, h/270)) (height-limited and width-limited)', () => {
    expect(computeFit(2732, 1536).scale).toBe(5); // min(5.69, 5.68) = 5
    expect(computeFit(1920, 1080).scale).toBe(4);
    expect(computeFit(1920, 700).scale).toBe(2); // height limited: 700/270 = 2.59
    expect(computeFit(2400, 1080).scale).toBe(4); // 5 vs 4 -> 4
    for (const [w, h] of [[960, 540], [1280, 720], [3000, 3000]] as const) {
      const f = computeFit(w, h);
      expect(f.scale).toBe(Math.floor(Math.min(w / PAGE_W, h / PAGE_H)));
      expect(Number.isInteger(f.scale)).toBe(true);
    }
  });

  it('falls back to a fractional aspect-locked scale below 2x', () => {
    const f = computeFit(600, 400); // 1.25 vs 1.48 -> 1.25
    expect(f.integer).toBe(false);
    expect(f.scale).toBeCloseTo(1.25, 6);
    expect(f.pageW / f.pageH).toBeCloseTo(PAGE_W / PAGE_H, 9);
    const tiny = computeFit(300, 100);
    expect(tiny.scale).toBeCloseTo(100 / 270, 9);
    expect(tiny.integer).toBe(false);
  });

  it('keeps the page rect inside the canvas', () => {
    for (const [w, h] of [[1366, 768], [600, 400], [1920, 1080], [500, 900], [2732, 1536]] as const) {
      const f = computeFit(w, h);
      expect(f.offX).toBeGreaterThanOrEqual(0);
      expect(f.offY).toBeGreaterThanOrEqual(0);
      expect(f.offX + f.pageW).toBeLessThanOrEqual(w + 1e-6);
      expect(f.offY + f.pageH).toBeLessThanOrEqual(h + 1e-6);
    }
  });
});

describe('client <-> internal mapping', () => {
  const rect = { left: 10, top: 20, width: 1366, height: 768 };

  it('returns null outside the page rect and a point inside it', () => {
    const f = computeFit(1366, 768);
    expect(clientToInternalPure(f, rect, rect.left + 1, rect.top + 1)).toBeNull(); // letterbox corner
    expect(clientToInternalPure(f, rect, rect.left - 5, rect.top + 300)).toBeNull();
    const centre = clientToInternalPure(f, rect, rect.left + 683, rect.top + 384);
    expect(centre).not.toBeNull();
    expect(centre!.x).toBeCloseTo(PAGE_W / 2, 0);
    expect(centre!.y).toBeCloseTo(PAGE_H / 2, 0);
  });

  it('page corners: top-left inside, one pixel past bottom-right outside', () => {
    const f = computeFit(1366, 768);
    const tl = internalToClientPure(f, rect, 0, 0);
    expect(clientToInternalPure(f, rect, tl.x + 0.01, tl.y + 0.01)).not.toBeNull();
    const br = internalToClientPure(f, rect, PAGE_W, PAGE_H);
    expect(clientToInternalPure(f, rect, br.x + 0.5, br.y + 0.5)).toBeNull();
    expect(clientToInternalPure(f, rect, br.x - 0.01, br.y - 0.01)).not.toBeNull();
  });

  it('round-trips internal -> client -> internal for integer and fractional fits', () => {
    const cases: Array<[number, number, number, number, number]> = [
      [1366, 768, 1366, 768, 1],
      [2732, 1536, 1366, 768, 2],
      [600, 400, 600, 400, 1],
      [900, 1400, 450, 700, 2],
    ];
    for (const [bw, bh, cw, ch] of cases) {
      const f = computeFit(bw, bh);
      const r = { left: 13, top: 7, width: cw, height: ch };
      for (let i = 0; i < 200; i++) {
        const x = ((i * 37) % (PAGE_W * 100)) / 100;
        const y = ((i * 91) % (PAGE_H * 100)) / 100;
        const c = internalToClientPure(f, r, x, y);
        const back = clientToInternalPure(f, r, c.x, c.y);
        expect(back).not.toBeNull();
        expect(back!.x).toBeCloseTo(x, 6);
        expect(back!.y).toBeCloseTo(y, 6);
      }
    }
  });

  it('round-trips client -> internal -> client for points inside the page', () => {
    const f = computeFit(2732, 1536);
    const r = { left: 0, top: 0, width: 1366, height: 768 };
    for (const [cx, cy] of [[200, 130], [683, 384], [1100, 600], [483, 140]] as const) {
      const p = clientToInternalPure(f, r, cx, cy);
      expect(p).not.toBeNull();
      const c = internalToClientPure(f, r, p!.x, p!.y);
      expect(c.x).toBeCloseTo(cx, 6);
      expect(c.y).toBeCloseTo(cy, 6);
    }
  });

  it('degenerate rects map to null', () => {
    const f = computeFit(100, 100);
    expect(clientToInternalPure(f, { left: 0, top: 0, width: 0, height: 0 }, 1, 1)).toBeNull();
  });
});
