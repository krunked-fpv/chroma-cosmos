import { describe, expect, it } from 'vitest';
import { PAGE_H, PAGE_W } from '../../../src/contracts/constants';
import type { EffectKind, EffectRenderState } from '../../../src/contracts/simulation';
import { FX_ID, rasterizeEffect, rasterizeEffects } from '../../../src/renderer/fx';
import { PixelPlane } from '../../../src/renderer/pixelPlane';
import { MAX_PARTICLES, particlesForEffects } from '../../../src/renderer/particles';

const ALL_KINDS: EffectKind[] = [
  'rainbowSlide', 'starlightFlowerRain', 'zeroGTrampoline', 'cheetahRacetrack', 'discoMirage', 'gentleSparkle',
  'rainbowArc', 'rainbowBridge', 'harmonyArc', 'gemPickup', 'starBurst', 'paperDust', 'stardustTrail',
  'chromaticRipple', 'goldDoodle', 'hiddenStar', 'paintSplatComet', 'shootingStar', 'constellationFireworks',
];
const FX_IDS = new Set<number>(Object.values(FX_ID));

const fx = (kind: EffectKind, x: number, y: number, extra: Partial<EffectRenderState> = {}): EffectRenderState => ({
  id: 1, kind, x, y, t: 0.6, ageMs: 700, seed: 12345, ...extra,
});

/** scans every pixel; returns the count of written pixels and verifies the buffer layout invariants */
function audit(p: PixelPlane): { pixels: number; minX: number; maxX: number; minY: number; maxY: number } {
  let pixels = 0;
  let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
  expect(p.data.length).toBe(PAGE_W * PAGE_H * 4);
  const d = p.data;
  for (let y = 0; y < PAGE_H; y++) {
    const row = y * PAGE_W;
    for (let x = 0; x < PAGE_W; x++) {
      const o = (row + x) * 4;
      const a = d[o + 3] as number;
      if (a === 255) {
        pixels++;
        if (!FX_IDS.has(d[o] as number)) throw new Error(`unexpected FX id ${d[o]} at (${x},${y})`);
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
      } else if (a !== 0 || d[o] !== 0) {
        throw new Error(`invalid empty pixel (${d[o]},${a}) at (${x},${y})`);
      }
    }
  }
  return { pixels, minX, maxX, minY, maxY };
}

describe('PixelPlane clamping', () => {
  it('ignores off-page and non-finite writes (no row wrap-around)', () => {
    const p = new PixelPlane();
    p.put(-1, 5, 221);
    p.put(PAGE_W, 5, 221);
    p.put(5, -1, 221);
    p.put(5, PAGE_H, 221);
    p.put(NaN, 3, 221);
    p.put(3, Infinity, 221);
    expect(p.count).toBe(0);
    expect(p.data.every((v) => v === 0)).toBe(true);
    p.put(PAGE_W - 1, PAGE_H - 1, 222, 3);
    expect(p.count).toBe(1);
    const o = ((PAGE_H - 1) * PAGE_W + PAGE_W - 1) * 4;
    expect(Array.from(p.data.slice(o, o + 4))).toEqual([222, 3, 0, 255]);
  });

  it('lines/discs/rects/curves entirely off-page write nothing, even with absurd coordinates', () => {
    const p = new PixelPlane();
    p.line(-500, -500, -10, -3, 221);
    p.line(-1e9, -1e9, 1e9, 1e9, 221); // would loop forever without the cap
    p.line(NaN, 0, 5, 5, 221);
    p.disc(-100, -100, 20, 223);
    p.disc(2000, 40, 1e9, 223);
    p.rect(-50, -50, 30, 30, 224);
    p.rect(PAGE_W + 5, 0, 20, 20, 224);
    p.curve(-100, -100, -50, -200, -10, -10, 1, 221);
    // the huge diagonal passes through the page; everything written must still be on-page and valid
    const a = audit(p);
    expect(a.minX).toBeGreaterThanOrEqual(0);
    expect(a.maxX).toBeLessThan(PAGE_W);
    expect(a.minY).toBeGreaterThanOrEqual(0);
    expect(a.maxY).toBeLessThan(PAGE_H);
  });

  it('clear() resets the plane', () => {
    const p = new PixelPlane();
    p.disc(100, 100, 5, 223);
    expect(p.count).toBeGreaterThan(0);
    p.clear();
    expect(p.count).toBe(0);
    expect(p.data.every((v) => v === 0)).toBe(true);
  });
});

describe('FX rasterizers', () => {
  it('every EffectKind is bounds-clamped for extreme positions and fields', () => {
    const coords = [-1e6, -300, -1, 0, 1, 240, 479, 480, 600, 1e6, NaN, Infinity];
    const p = new PixelPlane();
    for (const kind of ALL_KINDS) {
      p.clear();
      for (const x of coords) {
        for (const y of [-1e6, -50, 0, 135, 269, 270, 400, NaN]) {
          rasterizeEffect(p, fx(kind, x, y, { x2: x + 80, y2: y - 40, t: 1, ageMs: 5000 }));
        }
      }
      rasterizeEffect(p, fx(kind, 10, 10, { t: -5, ageMs: -1, x2: 1e12, y2: -1e12 }));
      rasterizeEffect(p, fx(kind, 10, 10, { t: 99, ageMs: NaN, seed: -1 }));
      audit(p);
    }
  });

  it('effects fully outside the page draw nothing', () => {
    for (const kind of ['rainbowArc', 'rainbowBridge', 'gemPickup', 'hiddenStar', 'goldDoodle', 'zeroGTrampoline', 'discoMirage'] as const) {
      const p = new PixelPlane();
      rasterizeEffect(p, fx(kind, -2000, -2000, { x2: -1900, y2: -1950 }));
      expect(p.count, kind).toBe(0);
    }
  });

  it('typical effects draw pixels with the documented system FX ids', () => {
    const expectIds: Array<[EffectKind, number]> = [
      ['rainbowArc', 221], ['rainbowBridge', 221], ['rainbowSlide', 221], ['discoMirage', 222],
      ['starlightFlowerRain', 223], ['gemPickup', 226], ['goldDoodle', 227], ['zeroGTrampoline', 228],
      ['cheetahRacetrack', 225], ['constellationFireworks', 229],
    ];
    for (const [kind, id] of expectIds) {
      const p = new PixelPlane();
      rasterizeEffect(p, fx(kind, 200, 120, { x2: 280, y2: 150, y: 120 }));
      expect(p.count, kind).toBeGreaterThan(0);
      let found = false;
      for (let i = 0; i < PAGE_W * PAGE_H; i++) if (p.data[i * 4 + 3] === 255 && p.data[i * 4] === id) { found = true; break; }
      expect(found, `${kind} should draw id ${id}`).toBe(true);
    }
    const slide = new PixelPlane();
    rasterizeEffect(slide, fx('rainbowSlide', 200, 120, { x2: 260, y2: 190 }));
    expect(slide.idAt(200, 117)).toBe(230); // slide-cloud puff
    const flowers = new PixelPlane();
    rasterizeEffect(flowers, fx('starlightFlowerRain', 200, 20, { y2: 255, t: 1 }));
    let f224 = 0;
    for (let i = 0; i < PAGE_W * PAGE_H; i++) if (flowers.data[i * 4 + 3] === 255 && flowers.data[i * 4] === 224) f224++;
    expect(f224).toBeGreaterThan(0);
  });

  it('rainbow bands carry a variant 1..6 in the G channel', () => {
    const p = new PixelPlane();
    rasterizeEffect(p, fx('rainbowArc', 100, 100, { x2: 200, y2: 100, t: 1 }));
    const variants = new Set<number>();
    for (let i = 0; i < PAGE_W * PAGE_H; i++) if (p.data[i * 4 + 3] === 255) variants.add(p.data[i * 4 + 1] as number);
    expect([...variants].sort()).toEqual([1, 2, 3, 4, 5, 6]);
  });

  it('is deterministic for the same effect state', () => {
    const e = [fx('starlightFlowerRain', 150, 40, { y2: 250 }), fx('constellationFireworks', 300, 100)];
    const a = new PixelPlane();
    const b = new PixelPlane();
    rasterizeEffects(a, e);
    rasterizeEffects(b, e);
    expect(Buffer.from(a.data).equals(Buffer.from(b.data))).toBe(true);
  });
});

describe('particles', () => {
  it('derives bounded, finite particles for every kind and caps at MAX_PARTICLES', () => {
    const effects = ALL_KINDS.map((k, i) => fx(k, 100 + i * 10, 100, { x2: 300, y2: 50 }));
    const list = particlesForEffects(effects);
    expect(list.length).toBeGreaterThan(20);
    for (const q of list) {
      expect(Number.isFinite(q.x) && Number.isFinite(q.y)).toBe(true);
      expect(q.alpha).toBeGreaterThan(0);
      expect(q.alpha).toBeLessThanOrEqual(1);
    }
    const many = Array.from({ length: 400 }, (_, i) => fx('starBurst', i, 50, { seed: i }));
    expect(particlesForEffects(many).length).toBeLessThanOrEqual(MAX_PARTICLES);
    expect(particlesForEffects([fx('starBurst', NaN, 3)])).toHaveLength(0);
  });
});
