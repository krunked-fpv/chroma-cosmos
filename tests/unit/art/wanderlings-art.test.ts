import { describe, expect, it } from 'vitest';
import { createArt } from '../../../src/art';
import type { StoryMilestoneKind } from '../../../src/contracts/art';
import type { CausalityKind } from '../../../src/contracts/causality';
import { PAGE_H, PAGE_W } from '../../../src/contracts/constants';
import type { WardrobeState } from '../../../src/contracts/progression';
import { CHAPTERS, type ChapterId, type SceneId } from '../../../src/contracts/roguelike';

const NONE: WardrobeState = {
  violetPins: false,
  violetCape: false,
  lumiWings: false,
  lumiCrown: false,
  novaBoosters: false,
  novaScarf: false,
};

const ALL: WardrobeState = {
  violetPins: true,
  violetCape: true,
  lumiWings: true,
  lumiCrown: true,
  novaBoosters: true,
  novaScarf: true,
};

const CHAPTER_IDS: ChapterId[] = CHAPTERS.map((c) => c.id);
const ALL_SCENES: SceneId[] = [...CHAPTER_IDS, 'bedroomHub'];
const ACTIVE_CAUSALITY: CausalityKind[] = [
  'rainbowSlide',
  'starlightFlowerRain',
  'zeroGTrampoline',
  'cheetahRacetrack',
  'discoMirage',
];
const VALID_MILESTONES = new Set<StoryMilestoneKind>(['violet', 'lumi', 'nova', 'planet', 'cloud']);

const art = createArt();

function frameDiffCount(a: Uint8Array, b: Uint8Array): number {
  let diff = 0;
  for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) diff++;
  return diff;
}

describe('storyMilestones', () => {
  it.each(ALL_SCENES)('%s partitions coreRegionIds cleanly with unique milestone IDs and valid centroids', (sceneId) => {
    for (const seed of [1, 7, 424242]) {
      const page = art.compilePage(sceneId, seed, NONE);
      const milestones = page.storyMilestones;
      expect(milestones).toBeDefined();
      if (!milestones) continue;

      if (sceneId === 'whaleSea') {
        expect(milestones.length).toBe(2);
        expect(milestones.map((m) => m.id)).toEqual(['planet', 'cloud']);
      } else if (sceneId === 'bedroomHub') {
        expect(milestones.length).toBeGreaterThanOrEqual(2);
      } else {
        expect(milestones.length).toBeGreaterThanOrEqual(3);
        expect(milestones.length).toBeLessThanOrEqual(5);
      }

      const seenIds = new Set<StoryMilestoneKind>();
      const collectedRegions: number[] = [];
      for (const m of milestones) {
        expect(VALID_MILESTONES.has(m.id)).toBe(true);
        expect(m.kind).toBe(m.id);
        expect(seenIds.has(m.id)).toBe(false);
        seenIds.add(m.id);
        expect(m.label.length).toBeGreaterThan(0);
        expect(m.regionIds.length).toBeGreaterThan(0);
        expect(m.centroid.x).toBeGreaterThanOrEqual(0);
        expect(m.centroid.x).toBeLessThan(PAGE_W);
        expect(m.centroid.y).toBeGreaterThanOrEqual(0);
        expect(m.centroid.y).toBeLessThan(PAGE_H);

        // Verify centroid equals rounded mean of constituent region centroids
        let sx = 0;
        let sy = 0;
        for (const rid of m.regionIds) {
          const meta = page.regions[rid];
          expect(meta, `${sceneId} milestone ${m.id} missing region ${rid}`).toBeDefined();
          if (meta) {
            sx += meta.centroid.x;
            sy += meta.centroid.y;
          }
          collectedRegions.push(rid);
        }
        expect(m.centroid.x).toBe(Math.round(sx / m.regionIds.length));
        expect(m.centroid.y).toBe(Math.round(sy / m.regionIds.length));
      }

      // Clean disjoint partition of coreRegionIds
      const uniqueCollected = new Set(collectedRegions);
      expect(uniqueCollected.size).toBe(collectedRegions.length);
      expect([...collectedRegions].sort((a, b) => a - b)).toEqual([...page.coreRegionIds].sort((a, b) => a - b));
    }
  });

  it('rooftop and heartOfUniverse emit all 5 ordered narrative milestones', () => {
    for (const id of ['rooftop', 'heartOfUniverse'] as const) {
      const p = art.compilePage(id, 7, NONE);
      expect(p.storyMilestones?.map((m) => m.id)).toEqual(['violet', 'lumi', 'nova', 'planet', 'cloud']);
      expect(p.storyMilestones?.map((m) => m.label)).toEqual(['Violet', 'Lumi', 'Nova', 'Ringed Planet', 'Space Clouds']);
    }
  });
});

describe('wispSprite', () => {
  const ALLOWED = new Set([0, 212, 231, 232, 255]);

  it('exposes a 16..20px sprite sheet with 4..6 animated frames for idle and float', () => {
    expect(art.wispSprite).toBeTypeOf('function');
    const sheet = art.wispSprite!();
    expect(sheet.anchorX).toBeGreaterThan(0);
    expect(sheet.anchorY).toBeGreaterThan(0);

    const idle = sheet.anims.idle;
    const flt = sheet.anims.float;
    expect(idle).toBeDefined();
    expect(flt).toBeDefined();

    for (const [name, anim] of [
      ['idle', idle],
      ['float', flt],
    ] as const) {
      if (!anim) continue;
      expect(anim.frames.length, `wisp.${name}`).toBeGreaterThanOrEqual(4);
      expect(anim.frames.length, `wisp.${name}`).toBeLessThanOrEqual(6);
      expect(anim.frameMs).toBeGreaterThan(0);
      expect(anim.loop).toBe(true);

      const f0 = anim.frames[0]!;
      expect(f0.w).toBeGreaterThanOrEqual(16);
      expect(f0.w).toBeLessThanOrEqual(20);
      expect(f0.h).toBeGreaterThanOrEqual(16);
      expect(f0.h).toBeLessThanOrEqual(20);

      let sawEyeShine = false;
      for (const f of anim.frames) {
        expect(f.w).toBe(f0.w);
        expect(f.h).toBe(f0.h);
        expect(f.pixels.length).toBe(f.w * f.h);
        let core = 0;
        let aura = 0;
        let ink = 0;
        let transparent = 0;
        for (const v of f.pixels) {
          expect(ALLOWED.has(v), `wisp.${name} unexpected pixel ${v}`).toBe(true);
          if (v === 231) core++;
          else if (v === 232) aura++;
          else if (v === 212) sawEyeShine = true;
          else if (v === 0) ink++;
          else if (v === 255) transparent++;
        }
        expect(core, `wisp.${name} core px`).toBeGreaterThan(30);
        expect(aura, `wisp.${name} aura px`).toBeGreaterThan(30);
        expect(ink, `wisp.${name} indigo contour rim + eye px`).toBeGreaterThanOrEqual(35);
        expect(transparent, `wisp.${name} transparent px`).toBeGreaterThan(20);

        // Main body+wings silhouette must be 100% framed by 1px deep-indigo (0) contour
        // so bright 231/232 pixels never bleed raw against bright cream cotton paper (#fbf3e0).
        const vis = new Uint8Array(f.w * f.h);
        const startIdx = Math.floor(f.h / 2) * f.w + Math.floor(f.w / 2);
        expect(f.pixels[startIdx], `wisp.${name} center pixel opaque`).not.toBe(255);
        const queue: number[] = [startIdx];
        vis[startIdx] = 1;
        while (queue.length > 0) {
          const i = queue.pop()!;
          const x = i % f.w;
          const y = (i / f.w) | 0;
          for (const [dx, dy] of [
            [1, 0],
            [-1, 0],
            [0, 1],
            [0, -1],
          ] as const) {
            const nx = x + dx;
            const ny = y + dy;
            if (nx < 0 || nx >= f.w || ny < 0 || ny >= f.h) continue;
            const j = ny * f.w + nx;
            if (!vis[j] && f.pixels[j] !== 255) {
              vis[j] = 1;
              queue.push(j);
            }
          }
        }
        let bodyExposedBright = 0;
        let detachedMotes = 0;
        for (let y = 0; y < f.h; y++) {
          for (let x = 0; x < f.w; x++) {
            const i = y * f.w + x;
            const v = f.pixels[i]!;
            if (v === 255) continue;
            if (!vis[i]) {
              detachedMotes++;
              continue;
            }
            if (v === 0) continue;
            for (const [dx, dy] of [
              [1, 0],
              [-1, 0],
              [0, 1],
              [0, -1],
            ] as const) {
              const nx = x + dx;
              const ny = y + dy;
              const nb = nx < 0 || nx >= f.w || ny < 0 || ny >= f.h ? 255 : f.pixels[ny * f.w + nx];
              if (nb === 255) {
                bodyExposedBright++;
                break;
              }
            }
          }
        }
        expect(bodyExposedBright, `wisp.${name} body/wing bright px exposed without indigo rim`).toBe(0);
        expect(detachedMotes, `wisp.${name} floating lantern motes`).toBeGreaterThanOrEqual(3);
      }
      expect(sawEyeShine, `wisp.${name} eye_shine`).toBe(true);

      // Consecutive frames should visibly animate
      let animatedPairs = 0;
      for (let i = 0; i < anim.frames.length; i++) {
        const a = anim.frames[i]!;
        const b = anim.frames[(i + 1) % anim.frames.length]!;
        if (frameDiffCount(a.pixels, b.pixels) > 0) animatedPairs++;
      }
      expect(animatedPairs).toBe(anim.frames.length);
    }
  });
});

describe('wonderSketch', () => {
  const cloudBox = { x0: 84, y0: 42, x1: 168, y1: 74 };
  const planetBox = { x0: 318, y0: 56, x1: 406, y1: 126 };

  it('returns [] for gentleSparkle and non-finite boxes', () => {
    expect(art.wonderSketch).toBeTypeOf('function');
    expect(art.wonderSketch!('gentleSparkle', cloudBox, 0)).toEqual([]);
    expect(art.wonderSketch!('gentleSparkle', planetBox, 1250)).toEqual([]);
    expect(art.wonderSketch!('rainbowSlide', { x0: Number.NaN, y0: 10, x1: 50, y1: 40 }, 0)).toEqual([]);
  });

  it.each(ACTIVE_CAUSALITY)('%s produces deterministic, animated, deduplicated, in-bounds dots', (effect) => {
    const box = effect === 'cheetahRacetrack' || effect === 'discoMirage' ? planetBox : cloudBox;
    const d0 = art.wonderSketch!(effect, box, 0);
    const d0Again = createArt().wonderSketch!(effect, box, 0);
    const dLater = art.wonderSketch!(effect, box, 360);

    expect(d0).toEqual(d0Again);
    expect(d0.length).toBeGreaterThanOrEqual(120);
    expect(dLater.length).toBeGreaterThanOrEqual(120);
    expect(JSON.stringify(d0)).not.toBe(JSON.stringify(dLater));

    for (const dots of [d0, dLater]) {
      const seen = new Set<number>();
      let s1 = 0;
      let s2 = 0;
      let outsideBox = 0;
      for (const p of dots) {
        expect(Number.isInteger(p.x)).toBe(true);
        expect(Number.isInteger(p.y)).toBe(true);
        expect(p.x).toBeGreaterThanOrEqual(0);
        expect(p.x).toBeLessThan(PAGE_W);
        expect(p.y).toBeGreaterThanOrEqual(0);
        expect(p.y).toBeLessThan(PAGE_H);
        expect(p.shade === 1 || p.shade === 2).toBe(true);
        const key = p.y * PAGE_W + p.x;
        expect(seen.has(key)).toBe(false);
        seen.add(key);
        if (p.shade === 1) s1++;
        else s2++;
        if (p.x < box.x0 || p.x > box.x1 || p.y < box.y0 || p.y > box.y1) outsideBox++;
      }
      expect(s1).toBeGreaterThanOrEqual(35);
      expect(s2).toBeGreaterThanOrEqual(35);
      // Cleanly framed outside the target cream bbox so chalk dashes pop over dark indigo sky
      expect(outsideBox / dots.length, `${effect} outside-bbox ratio`).toBeGreaterThanOrEqual(0.85);
      // Crisp 2px chalk dashes & directional tips (not isolated 1x1 specks)
      let connected = 0;
      for (const p of dots) {
        if (
          seen.has(p.y * PAGE_W + (p.x + 1)) ||
          seen.has(p.y * PAGE_W + (p.x - 1)) ||
          seen.has((p.y + 1) * PAGE_W + p.x) ||
          seen.has((p.y - 1) * PAGE_W + p.x)
        ) {
          connected++;
        }
      }
      expect(connected / dots.length, `${effect} 2px chalk dash solidity`).toBeGreaterThanOrEqual(0.85);
    }

    // Extreme corner boxes stay strictly in-bounds and non-empty
    for (const edgeBox of [
      { x0: 0, y0: 0, x1: 24, y1: 18 },
      { x0: PAGE_W - 26, y0: PAGE_H - 22, x1: PAGE_W - 1, y1: PAGE_H - 1 },
    ]) {
      const edgeDots = art.wonderSketch!(effect, edgeBox, 180);
      expect(edgeDots.length).toBeGreaterThan(20);
      for (const p of edgeDots) {
        expect(p.x).toBeGreaterThanOrEqual(0);
        expect(p.x).toBeLessThan(PAGE_W);
        expect(p.y).toBeGreaterThanOrEqual(0);
        expect(p.y).toBeLessThan(PAGE_H);
      }
    }
  });

  it('frames cleanly around real cloud and planet bboxes across all 8 chapters', () => {
    for (const chapterId of CHAPTER_IDS) {
      const page = art.compilePage(chapterId, 7, NONE);
      const cloud = page.regions[14];
      const planet = page.regions[12];
      expect(cloud).toBeDefined();
      expect(planet).toBeDefined();
      if (cloud) {
        for (const eff of ['rainbowSlide', 'starlightFlowerRain', 'zeroGTrampoline'] as const) {
          const dots = art.wonderSketch!(eff, cloud.bbox, 420);
          expect(dots.length, `${chapterId}.${eff}`).toBeGreaterThanOrEqual(100);
          const outside = dots.filter(
            (p) => p.x < cloud.bbox.x0 || p.x > cloud.bbox.x1 || p.y < cloud.bbox.y0 || p.y > cloud.bbox.y1,
          ).length;
          expect(outside / dots.length, `${chapterId}.${eff} outside cloud`).toBeGreaterThanOrEqual(0.85);
        }
      }
      if (planet) {
        for (const eff of ['cheetahRacetrack', 'discoMirage'] as const) {
          const dots = art.wonderSketch!(eff, planet.bbox, 420);
          expect(dots.length, `${chapterId}.${eff}`).toBeGreaterThanOrEqual(120);
          const outside = dots.filter(
            (p) => p.x < planet.bbox.x0 || p.x > planet.bbox.x1 || p.y < planet.bbox.y0 || p.y > planet.bbox.y1,
          ).length;
          expect(outside / dots.length, `${chapterId}.${eff} outside planet`).toBeGreaterThanOrEqual(0.85);
        }
      }
    }
  });
});

describe('Lumi & Nova joyful poke-invitation animations', () => {
  it('both declare lively wiggle, peek, and idle animations with expressive contrast and wardrobe support', () => {
    const libNone = art.sprites(NONE);
    const libAll = art.sprites(ALL);

    for (const kind of ['lumi', 'nova'] as const) {
      for (const animName of ['idle', 'wiggle', 'peek'] as const) {
        const aNone = libNone[kind].anims[animName];
        const aAll = libAll[kind].anims[animName];
        expect(aNone, `${kind}.${animName}`).toBeDefined();
        expect(aAll, `${kind}.${animName} all wardrobe`).toBeDefined();
        if (!aNone || !aAll) continue;

        expect(aNone.frames.length).toBeGreaterThanOrEqual(3);
        expect(aNone.frames.length).toBeLessThanOrEqual(6);
        expect(aAll.frames.length).toBe(aNone.frames.length);

        // Ensure genuine expressive ear/horn/mane/tail contrast across frames
        let maxDiff = 0;
        for (let i = 1; i < aNone.frames.length; i++) {
          const d = frameDiffCount(aNone.frames[0]!.pixels, aNone.frames[i]!.pixels);
          if (d > maxDiff) maxDiff = d;
        }
        expect(maxDiff, `${kind}.${animName} visual contrast`).toBeGreaterThan(40);
      }
    }

    // Verify wardrobe overlays appear in Lumi & Nova peek and wiggle
    for (const animName of ['wiggle', 'peek'] as const) {
      for (const f of libAll.lumi.anims[animName]!.frames) {
        expect(f.pixels.includes(217)).toBe(true);
        expect(f.pixels.includes(218)).toBe(true);
      }
      for (const f of libAll.nova.anims[animName]!.frames) {
        expect(f.pixels.includes(219)).toBe(true);
        expect(f.pixels.includes(220)).toBe(true);
      }
    }
  });
});
