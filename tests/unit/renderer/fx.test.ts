import { describe, expect, it } from 'vitest';
import type { CausalityKind } from '../../../src/contracts/causality';
import { PAGE_H, PAGE_W } from '../../../src/contracts/constants';
import { REGION_INK } from '../../../src/contracts/regions';
import type { EffectKind, EffectRenderState, PokeInvite, WispRenderState, WonderWhisperHint } from '../../../src/contracts/simulation';
import {
  FX_ID,
  rasterizeEffect,
  rasterizeEffects,
  rasterizePokeInvites,
  rasterizeWispGhostStroke,
  rasterizeWonderWhisper,
} from '../../../src/renderer/fx';
import { PixelPlane } from '../../../src/renderer/pixelPlane';
import {
  MAX_PARTICLES,
  particlesForEffects,
  particlesForPokeInvites,
  particlesForWisp,
} from '../../../src/renderer/particles';
import type { PixelParticle } from '../../../src/renderer/particles';

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
function audit(p: PixelPlane, allowInk = false): { pixels: number; minX: number; maxX: number; minY: number; maxY: number } {
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
        const id = d[o] as number;
        if (!FX_IDS.has(id) && !(allowInk && id === REGION_INK)) throw new Error(`unexpected FX id ${id} at (${x},${y})`);
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
      ['cheetahRacetrack', 227], ['constellationFireworks', 229],
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

  it('cheetahRacetrack stays bounded around (e.x, e.y) for endpoint x2/y2 without cometCar boxes', () => {
    const cx = 260;
    const cy = 150;
    const rx = 42;
    const ry = 20;
    const p = new PixelPlane();
    rasterizeEffect(p, fx('cheetahRacetrack', cx, cy, { x2: cx + rx, y2: cy + ry, ageMs: 1200 }));
    const a = audit(p);
    expect(a.pixels).toBeGreaterThan(20);
    expect(a.minX).toBeGreaterThanOrEqual(cx - rx - 2);
    expect(a.maxX).toBeLessThanOrEqual(cx + rx + 2);
    expect(a.minY).toBeGreaterThanOrEqual(cy - ry - 2);
    expect(a.maxY).toBeLessThanOrEqual(cy + ry + 2);
    for (let i = 0; i < PAGE_W * PAGE_H; i++) {
      if (p.data[i * 4 + 3] === 255) {
        expect(p.data[i * 4]).toBe(FX_ID.goldDoodle);
      }
    }

    // Degenerate endpoint clamps to minimum radii (16, 10)
    const pMin = new PixelPlane();
    rasterizeEffect(pMin, fx('cheetahRacetrack', cx, cy, { x2: cx, y2: cy, ageMs: 1200 }));
    const aMin = audit(pMin);
    expect(aMin.minX).toBeGreaterThanOrEqual(cx - 18);
    expect(aMin.maxX).toBeLessThanOrEqual(cx + 18);
    expect(aMin.minY).toBeGreaterThanOrEqual(cy - 12);
    expect(aMin.maxY).toBeLessThanOrEqual(cy + 12);
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

  it('derives warm trailing stardust motes for active wisp and golden sparkles for poke invites', () => {
    const wisp: WispRenderState = {
      active: true,
      mode: 'prologueStroke',
      x: 180,
      y: 120,
      targetRegionId: 5,
      ghostStrokeT: 0.7,
      ghostPath: [
        { x: 140, y: 110 },
        { x: 165, y: 125 },
        { x: 195, y: 115 },
      ],
      prologueMist: 0.4,
      alpha: 1,
    };
    const out: PixelParticle[] = [];
    particlesForWisp(wisp, 1200, out);
    expect(out.length).toBeGreaterThanOrEqual(6);
    for (const q of out) {
      expect(Number.isFinite(q.x) && Number.isFinite(q.y)).toBe(true);
      expect(q.alpha).toBeGreaterThan(0);
      expect(q.alpha).toBeLessThanOrEqual(1);
    }

    const inactiveOut: PixelParticle[] = [];
    particlesForWisp({ ...wisp, active: false }, 1200, inactiveOut);
    particlesForWisp({ ...wisp, mode: 'hidden' }, 1200, inactiveOut);
    particlesForWisp({ ...wisp, alpha: 0 }, 1200, inactiveOut);
    particlesForWisp({ ...wisp, x: NaN }, 1200, inactiveOut);
    expect(inactiveOut).toHaveLength(0);

    const softInv: PokeInvite = { instanceId: 'lumi-1', kind: 'lumi', x: 220, y: 140, firstAwake: false };
    const warmInv: PokeInvite = { instanceId: 'lumi-1', kind: 'lumi', x: 220, y: 140, firstAwake: true };
    const softList: PixelParticle[] = [];
    const warmList: PixelParticle[] = [];
    particlesForPokeInvites([softInv], 900, softList);
    particlesForPokeInvites([warmInv], 900, warmList);
    expect(softList.length).toBeGreaterThan(0);
    expect(warmList.length).toBeGreaterThan(softList.length);
  });
});

describe('Wisp ghost-stroke, Wonder Whispers, and Poke Invites rasterization', () => {
  it('exposes system FX ids 231..233', () => {
    expect(FX_ID.wispCore).toBe(231);
    expect(FX_ID.wispAura).toBe(232);
    expect(FX_ID.wonderChalk).toBe(233);
  });

  it('draws a softly spaced looping rainbow ghost-stroke along ghostPath up to ghostStrokeT', () => {
    const baseWisp: WispRenderState = {
      active: true,
      mode: 'prologueStroke',
      x: 200,
      y: 120,
      targetRegionId: 5,
      ghostStrokeT: 1,
      ghostPath: [
        { x: 120, y: 100 },
        { x: 180, y: 120 },
        { x: 140, y: 150 },
        { x: 210, y: 165 },
      ],
      prologueMist: 0.3,
      alpha: 1,
    };

    const pQuarter = new PixelPlane();
    const pFull = new PixelPlane();
    rasterizeWispGhostStroke(pQuarter, { ...baseWisp, ghostStrokeT: 0.25 }, 600);
    rasterizeWispGhostStroke(pFull, baseWisp, 600);
    const aFull = audit(pFull);
    expect(pQuarter.count).toBeGreaterThan(0);
    expect(pFull.count).toBeGreaterThan(pQuarter.count);
    expect(pFull.count).toBeGreaterThanOrEqual(220); // lush continuous 2-3px rainbow ribbon
    expect(aFull.pixels).toBe(pFull.count);

    const ids = new Set<number>();
    const rainbowVariants = new Set<number>();
    for (let i = 0; i < PAGE_W * PAGE_H; i++) {
      if (pFull.data[i * 4 + 3] === 255) {
        const id = pFull.data[i * 4] as number;
        ids.add(id);
        if (id === FX_ID.rainbow) rainbowVariants.add(pFull.data[i * 4 + 1] as number);
      }
    }
    expect(ids.has(FX_ID.rainbow)).toBe(true);
    expect(ids.has(FX_ID.wispCore)).toBe(true);
    expect(ids.has(FX_ID.wispAura)).toBe(true);
    expect(rainbowVariants.size).toBeGreaterThanOrEqual(4);

    // Non-prologueStroke or inactive wisp draws nothing
    const pIdle = new PixelPlane();
    rasterizeWispGhostStroke(pIdle, { ...baseWisp, mode: 'idleGuide' }, 600);
    rasterizeWispGhostStroke(pIdle, { ...baseWisp, active: false }, 600);
    rasterizeWispGhostStroke(pIdle, { ...baseWisp, ghostStrokeT: 0 }, 600);
    rasterizeWispGhostStroke(pIdle, { ...baseWisp, ghostPath: [{ x: 100, y: 100 }] }, 600);
    expect(pIdle.count).toBe(0);

    // Extreme / NaN coordinates stay safely clamped
    const pWild = new PixelPlane();
    rasterizeWispGhostStroke(
      pWild,
      { ...baseWisp, ghostPath: [{ x: -1e6, y: 50 }, { x: NaN, y: 100 }, { x: 1e6, y: 200 }] },
      600,
    );
    audit(pWild);
  });

  it('rasterizes Wonder Whispers with custom wonderSketch callback and with built-in fallback for all 5 causality kinds', () => {
    const hint: WonderWhisperHint = {
      regionId: 14,
      effect: 'rainbowSlide',
      x: 220,
      y: 95,
      x0: 190,
      y0: 75,
      x1: 250,
      y1: 115,
    };

    // Custom callback delegation
    const pCustom = new PixelPlane();
    rasterizeWonderWhisper(pCustom, hint, 500, () => [
      { x: 201, y: 81, shade: 1 },
      { x: 205, y: 84, shade: 2 },
      { x: -10, y: 999, shade: 1 }, // clamped out
    ]);
    expect(pCustom.count).toBe(2);
    expect(pCustom.idAt(201, 81)).toBe(FX_ID.wonderChalk);
    expect(pCustom.data[(81 * PAGE_W + 201) * 4 + 1]).toBe(1);
    expect(pCustom.idAt(205, 84)).toBe(FX_ID.wonderChalk);
    expect(pCustom.data[(84 * PAGE_W + 205) * 4 + 1]).toBe(2);

    // Built-in procedural fallback for all 5 causality kinds
    const kinds: CausalityKind[] = [
      'rainbowSlide',
      'starlightFlowerRain',
      'zeroGTrampoline',
      'cheetahRacetrack',
      'discoMirage',
    ];
    for (const effect of kinds) {
      const p1 = new PixelPlane();
      const p2 = new PixelPlane();
      rasterizeWonderWhisper(p1, { ...hint, effect }, 1250);
      rasterizeWonderWhisper(p2, { ...hint, effect }, 1250);
      const a = audit(p1);
      expect(a.pixels, effect).toBeGreaterThan(10);
      expect(Buffer.from(p1.data).equals(Buffer.from(p2.data)), `${effect} deterministic`).toBe(true);
      const shades = new Set<number>();
      for (let i = 0; i < PAGE_W * PAGE_H; i++) {
        if (p1.data[i * 4 + 3] === 255) {
          expect(p1.data[i * 4]).toBe(FX_ID.wonderChalk);
          shades.add(p1.data[i * 4 + 1] as number);
        }
      }
      expect(shades.has(1) && shades.has(2), `${effect} uses both shades 1 & 2`).toBe(true);
    }

    // gentleSparkle / null / NaN draws nothing
    const pEmpty = new PixelPlane();
    rasterizeWonderWhisper(pEmpty, { ...hint, effect: 'gentleSparkle' }, 1250);
    rasterizeWonderWhisper(pEmpty, null, 1250);
    rasterizeWonderWhisper(
      pEmpty,
      { regionId: 14, effect: 'discoMirage', x: NaN, y: NaN, x0: NaN, y0: NaN, x1: NaN, y1: NaN },
      1250,
    );
    expect(pEmpty.count).toBe(0);
  });

  it('draws high-contrast pulsing concentric dashed poke rings using 227/231 gold, 232 violet, and 0 ink for both Wand and firstAwake', () => {
    const soft = new PixelPlane();
    const warm = new PixelPlane();
    rasterizePokeInvites(soft, [{ instanceId: 'l1', kind: 'lumi', x: 240, y: 135, firstAwake: false }], 700);
    rasterizePokeInvites(warm, [{ instanceId: 'l1', kind: 'lumi', x: 240, y: 135, firstAwake: true }], 700);
    const aSoft = audit(soft, true);
    const aWarm = audit(warm, true);
    expect(aSoft.pixels).toBeGreaterThanOrEqual(70);
    expect(aWarm.pixels).toBeGreaterThan(aSoft.pixels);

    for (const [label, plane] of [
      ['wand', soft],
      ['firstAwake', warm],
    ] as const) {
      let gold = 0;
      let core = 0;
      let aura = 0;
      let ink = 0;
      for (let i = 0; i < PAGE_W * PAGE_H; i++) {
        if (plane.data[i * 4 + 3] === 255) {
          const id = plane.data[i * 4] as number;
          expect(
            id === FX_ID.goldDoodle || id === FX_ID.wispCore || id === FX_ID.wispAura || id === REGION_INK,
            `${label} unexpected id ${id}`,
          ).toBe(true);
          if (id === FX_ID.goldDoodle) gold++;
          if (id === FX_ID.wispCore) core++;
          if (id === FX_ID.wispAura) aura++;
          if (id === REGION_INK) ink++;
        }
      }
      expect(gold, `${label} goldDoodle`).toBeGreaterThan(0);
      expect(core, `${label} wispCore`).toBeGreaterThan(0);
      expect(aura, `${label} wispAura`).toBeGreaterThan(0);
      expect(ink, `${label} REGION_INK contrast`).toBeGreaterThan(0);
    }

    // Off-page and non-finite invites draw nothing
    const pNone = new PixelPlane();
    rasterizePokeInvites(
      pNone,
      [
        { instanceId: 'off', kind: 'nova', x: -200, y: -200, firstAwake: true },
        { instanceId: 'nan', kind: 'nova', x: NaN, y: 100, firstAwake: true },
      ],
      700,
    );
    expect(pNone.count).toBe(0);
  });
});
