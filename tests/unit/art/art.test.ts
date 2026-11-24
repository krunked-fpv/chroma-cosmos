import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { beforeAll, describe, expect, it } from 'vitest';
import { createArt } from '../../../src/art';
import type { ActorKind, CompiledPage, IllustrationKind } from '../../../src/contracts/art';
import { PAGE_H, PAGE_PIXELS, PAGE_W } from '../../../src/contracts/constants';
import { MATERIALS } from '../../../src/contracts/materials';
import type { WardrobeState } from '../../../src/contracts/progression';
import { WARDROBE_ITEMS } from '../../../src/contracts/progression';
import { CHAPTERS, DRAFT_CARDS, type ChapterId, type SceneId } from '../../../src/contracts/roguelike';

const NONE: WardrobeState = { violetPins: false, violetCape: false, lumiWings: false, lumiCrown: false, novaBoosters: false, novaScarf: false };
const ALL: WardrobeState = { violetPins: true, violetCape: true, lumiWings: true, lumiCrown: true, novaBoosters: true, novaScarf: true };
const CHAPTER_IDS: ChapterId[] = CHAPTERS.map((c) => c.id);
const SCENES: SceneId[] = [...CHAPTER_IDS, 'bedroomHub'];
const KINDS: ActorKind[] = ['violet', 'lumi', 'nova', 'moonCat', 'comet', 'whale', 'gazelle', 'cometCar', 'flower', 'gem'];
const TINY = new Set([7]);

const art = createArt();
const pages = new Map<string, CompiledPage>();
function page(id: SceneId, seed = 7, w: WardrobeState = NONE): CompiledPage {
  const k = `${id}:${seed}:${JSON.stringify(w)}`;
  let p = pages.get(k);
  if (!p) {
    p = art.compilePage(id, seed, w);
    pages.set(k, p);
  }
  return p;
}

const isColourable = (v: number) => (v >= 1 && v <= 211) || (v >= 234 && v <= 254);

describe('scenes', () => {
  beforeAll(() => {
    for (const id of SCENES) page(id);
  });

  describe.each(SCENES)('%s', (id) => {
    it('is deterministic (same seed -> identical bytes, fresh port instance)', () => {
      const a = page(id);
      const b = createArt().compilePage(id, 7, NONE);
      expect(Buffer.compare(Buffer.from(a.regionMap), Buffer.from(b.regionMap))).toBe(0);
      expect(Buffer.compare(Buffer.from(a.baseRegionMap), Buffer.from(b.baseRegionMap))).toBe(0);
      expect(Buffer.compare(Buffer.from(a.actorSlotMap), Buffer.from(b.actorSlotMap))).toBe(0);
      expect(JSON.stringify(a.regions)).toBe(JSON.stringify(b.regions));
      expect(JSON.stringify(a.paths)).toBe(JSON.stringify(b.paths));
    });

    it('is 480x270 with 256-entry tables and only valid ids', () => {
      const p = page(id);
      expect(p.regionMap.length).toBe(PAGE_W * PAGE_H);
      expect(PAGE_W * PAGE_H).toBe(PAGE_PIXELS);
      expect(p.baseRegionMap.length).toBe(PAGE_PIXELS);
      expect(p.actorSlotMap.length).toBe(PAGE_PIXELS);
      expect(p.regionTotalPixels.length).toBe(256);
      expect(p.regions.length).toBe(256);
      expect(p.sceneId).toBe(id);
      expect(p.title.length).toBeGreaterThan(3);
      for (let i = 0; i < PAGE_PIXELS; i++) {
        const v = p.regionMap[i] as number;
        const b = p.baseRegionMap[i] as number;
        expect(v >= 0 && v <= 255).toBe(true);
        expect(b >= 0 && b <= 255).toBe(true);
      }
    });

    it('region table matches the map; totals sum to non-ink non-sky pixels', () => {
      const p = page(id);
      const counts = new Uint32Array(256);
      let colour = 0;
      for (const v of p.regionMap) {
        counts[v] = (counts[v] as number) + 1;
        if (v !== 0 && v !== 255) colour++;
      }
      let sum = 0;
      for (let v = 1; v < 255; v++) {
        sum += p.regionTotalPixels[v] as number;
        expect(p.regionTotalPixels[v]).toBe(counts[v]);
        if (p.regions[v]) expect(p.regionTotalPixels[v] as number).toBeGreaterThan(0);
        else expect(counts[v]).toBe(0);
      }
      expect(sum).toBe(colour);
      expect(p.regionTotalPixels[0]).toBe(0);
      expect(p.regionTotalPixels[255]).toBe(0);
    });

    it('ink separates every pair of colourable regions (map and base map)', () => {
      const p = page(id);
      for (const m of [p.regionMap, p.baseRegionMap]) {
        for (let y = 0; y < PAGE_H; y++) {
          for (let x = 0; x < PAGE_W; x++) {
            const a = m[y * PAGE_W + x] as number;
            if (!isColourable(a)) continue;
            if (x + 1 < PAGE_W) {
              const b = m[y * PAGE_W + x + 1] as number;
              if (isColourable(b)) expect(b).toBe(a);
            }
            if (y + 1 < PAGE_H) {
              const b = m[(y + 1) * PAGE_W + x] as number;
              if (isColourable(b)) expect(b).toBe(a);
            }
          }
        }
      }
    });

    it('region sizes meet the thresholds (>=60, tiny parts >=24); system ids exempt', () => {
      const p = page(id);
      for (let v = 1; v < 255; v++) {
        const m = p.regions[v];
        if (!m || m.kind === 'system') continue;
        const min = TINY.has(v) ? 24 : 60;
        expect(p.regionTotalPixels[v] as number, `${id} region ${v} ${m.label}`).toBeGreaterThanOrEqual(min);
      }
    });

    it('has the right number of colourable regions', () => {
      const p = page(id);
      let n = 0;
      for (let v = 1; v <= 211; v++) if (p.regions[v]) n++;
      if (id === 'heartOfUniverse') expect(n).toBeGreaterThanOrEqual(50);
      else expect(n).toBeGreaterThanOrEqual(25);
      if (id === 'heartOfUniverse') expect(n).toBeLessThanOrEqual(70);
      else expect(n).toBeLessThanOrEqual(45);
    });

    it('ghosts live only in 234..254, are flagged and excluded from coverage', () => {
      const p = page(id);
      let ghosts = 0;
      for (let v = 1; v < 255; v++) {
        const m = p.regions[v];
        if (!m) continue;
        const inGhost = v >= 234 && v <= 254;
        expect(m.ghost).toBe(inGhost);
        if (inGhost) {
          ghosts++;
          expect(m.kind).toBe('ghost');
          expect(m.coverageExcluded).toBe(true);
        }
        if (v >= 212 && v <= 233) {
          expect(m.coverageExcluded).toBe(true);
          expect(m.kind).toBe('system');
          expect(m.core).toBe(false);
        }
        if (v <= 211) expect(m.coverageExcluded).toBe(false);
      }
      expect(ghosts).toBeLessThanOrEqual(4);
      if (id !== 'bedroomHub') expect(ghosts === 0 || ghosts >= 2).toBe(true);
    });

    it('region metas: bbox/centroid inside region, symmetric neighbours, core flags', () => {
      const p = page(id);
      for (let v = 1; v < 255; v++) {
        const m = p.regions[v];
        if (!m) continue;
        expect(m.id).toBe(v);
        expect(m.bbox.x0).toBeLessThanOrEqual(m.centroid.x);
        expect(m.bbox.x1).toBeGreaterThanOrEqual(m.centroid.x);
        expect(m.bbox.y0).toBeLessThanOrEqual(m.centroid.y);
        expect(m.bbox.y1).toBeGreaterThanOrEqual(m.centroid.y);
        expect(p.regionMap[m.centroid.y * PAGE_W + m.centroid.x]).toBe(v);
        expect(m.core).toBe(v >= 1 && v <= 15);
        for (const n of m.neighbors) {
          expect(p.regions[n]?.neighbors).toContain(v);
          expect(n).not.toBe(v);
        }
      }
      const present = [];
      for (let v = 1; v <= 15; v++) if (p.regions[v]) present.push(v);
      expect([...p.coreRegionIds].sort((a, b) => a - b)).toEqual(present);
    });

    it('actors: slots, spawn ids, base map reveals what is behind', () => {
      const p = page(id);
      expect(p.actors.length).toBeLessThanOrEqual(15);
      const slots = new Set<number>();
      for (const a of p.actors) {
        expect(a.slot).toBeGreaterThanOrEqual(1);
        expect(a.slot).toBeLessThanOrEqual(15);
        expect(slots.has(a.slot)).toBe(false);
        slots.add(a.slot);
        expect(a.regionIds.length).toBeGreaterThan(0);
        for (const rid of a.regionIds) expect(p.regions[rid], `${id} actor ${a.instanceId} region ${rid}`).toBeDefined();
        expect(a.x).toBeGreaterThanOrEqual(0);
        expect(a.x).toBeLessThan(PAGE_W);
      }
      let actorPixels = 0;
      for (let i = 0; i < PAGE_PIXELS; i++) {
        const s = p.actorSlotMap[i] as number;
        if (s === 0) expect(p.baseRegionMap[i]).toBe(p.regionMap[i]);
        else {
          actorPixels++;
          expect(slots.has(s)).toBe(true);
        }
      }
      if (p.actors.length) expect(actorPixels).toBeGreaterThan(100);
      // actor-owned ids never appear in the base map
      for (const a of p.actors) {
        for (const rid of a.regionIds) {
          let inBase = false;
          for (let i = 0; i < PAGE_PIXELS; i++) if (p.baseRegionMap[i] === rid) { inBase = true; break; }
          expect(inBase, `${id}: ${a.instanceId} id ${rid} leaks into base map`).toBe(false);
        }
      }
    });

    it('paths: margin path present, points on the page', () => {
      const p = page(id);
      expect(p.paths.some((q) => q.role === 'margin')).toBe(true);
      for (const q of p.paths) {
        expect(q.points.length).toBeGreaterThanOrEqual(2);
        for (const pt of q.points) {
          expect(pt.x).toBeGreaterThanOrEqual(0);
          expect(pt.x).toBeLessThan(PAGE_W);
          expect(pt.y).toBeGreaterThanOrEqual(0);
          expect(pt.y).toBeLessThan(PAGE_H);
        }
      }
      expect(p.focal.x).toBeGreaterThan(0);
      expect(p.focal.x).toBeLessThan(PAGE_W);
      expect(p.sky.top).toMatch(/^#[0-9a-f]{6}$/i);
      expect(p.sky.bottom).toMatch(/^#[0-9a-f]{6}$/i);
      expect(p.sky.mist).toMatch(/^#[0-9a-f]{6}$/i);
    });

    it('stays valid across seeds (sizes, separation, determinism)', () => {
      for (const seed of [1, 424242]) {
        const p = page(id, seed);
        const q = art.compilePage(id, seed, NONE);
        expect(Buffer.compare(Buffer.from(p.regionMap), Buffer.from(q.regionMap))).toBe(0);
        for (let v = 1; v < 255; v++) {
          const m = p.regions[v];
          if (!m || m.kind === 'system') continue;
          expect(p.regionTotalPixels[v] as number, `${id}@${seed} region ${v}`).toBeGreaterThanOrEqual(TINY.has(v) ? 24 : 60);
        }
        for (let i = 0; i < PAGE_PIXELS - PAGE_W - 1; i++) {
          const a = p.regionMap[i] as number;
          if (!isColourable(a)) continue;
          for (const j of [i + 1, i + PAGE_W]) {
            const b = p.regionMap[j] as number;
            if (isColourable(b) && (i + 1) % PAGE_W !== 0) expect(b).toBe(a);
          }
        }
      }
    });
  });

  describe('chapter rules', () => {
    it.each(CHAPTER_IDS)('%s has a cloud and a ringed planet (core 12/13 + 14)', (id) => {
      const p = page(id);
      const kinds = p.regions.filter(Boolean).map((m) => m?.kind);
      expect(kinds).toContain('cloud');
      expect(kinds).toContain('planet');
      expect(kinds).toContain('rings');
      for (const v of [12, 13, 14]) expect(p.coreRegionIds).toContain(v);
    });

    it('rooftop holds Violet, Lumi, Nova, planet, two clouds, moon-cat and a comet', () => {
      const p = page('rooftop');
      for (let v = 1; v <= 15; v++) expect(p.regions[v], `core ${v}`).toBeDefined();
      expect(p.regions[16]).toBeDefined();
      expect(p.regions[17]).toBeDefined();
      expect(p.regions[21]).toBeDefined();
      expect(p.actors.map((a) => a.kind)).toEqual(expect.arrayContaining(['violet', 'lumi', 'nova', 'moonCat', 'comet']));
    });

    it('heart of the universe is a double-dense mandala', () => {
      const p = page('heartOfUniverse');
      let n = 0;
      for (let v = 1; v <= 211; v++) if (p.regions[v]) n++;
      expect(n).toBeGreaterThanOrEqual(50);
    });

    it('bedroom hub is pre-coloured and features Violet', () => {
      const p = page('bedroomHub');
      expect(p.preColored?.length ?? 0).toBeGreaterThanOrEqual(8);
      for (const pc of p.preColored ?? []) {
        expect(p.regions[pc.id]).toBeDefined();
        expect(MATERIALS.some((m) => m.id === pc.materialId)).toBe(true);
      }
      for (const v of [1, 2, 3, 4]) expect(p.regions[v]).toBeDefined();
      for (const id of CHAPTER_IDS) expect(page(id).preColored).toBeUndefined();
    });
  });

  describe('wardrobe overlays', () => {
    it('system overlay ids appear in the map only when equipped', () => {
      const none = page('rooftop');
      const all = page('rooftop', 7, ALL);
      for (const w of WARDROBE_ITEMS) {
        expect(none.regionTotalPixels[w.regionId], `unequipped ${w.id}`).toBe(0);
        expect(all.regionTotalPixels[w.regionId] as number, `equipped ${w.id}`).toBeGreaterThan(0);
      }
      // face accents are always present on Violet
      for (const v of [212, 213, 214]) expect(none.regionTotalPixels[v] as number).toBeGreaterThan(0);
      // overlays are excluded from coverage and never alter the colourable set
      for (const w of WARDROBE_ITEMS) expect(all.regions[w.regionId]?.coverageExcluded).toBe(true);
    });

    it('each item adds pixels only to its owner', () => {
      for (const w of WARDROBE_ITEMS) {
        const one = { ...NONE, [w.id]: true } as WardrobeState;
        const lib = art.sprites(one);
        let found = false;
        for (const k of KINDS) {
          for (const an of Object.values(lib[k].anims)) {
            for (const f of an?.frames ?? []) if (f.pixels.includes(w.regionId)) found = true;
          }
        }
        expect(found, w.id).toBe(true);
        for (const k of KINDS.filter((q) => q !== w.owner)) {
          for (const an of Object.values(lib[k].anims)) for (const f of an?.frames ?? []) expect(f.pixels.includes(w.regionId)).toBe(false);
        }
      }
    });
  });
});

describe('sprites', () => {
  const libs = [art.sprites(NONE), art.sprites(ALL)];
  it('has every actor kind', () => {
    for (const lib of libs) expect(Object.keys(lib).sort()).toEqual([...KINDS].sort());
  });

  describe.each(KINDS)('%s', (kind) => {
    it('anims have 3..6 same-sized frames of valid ids', () => {
      for (const lib of libs) {
        const sheet = lib[kind];
        const anims = Object.entries(sheet.anims);
        expect(anims.length).toBeGreaterThanOrEqual(3);
        expect(sheet.anchorX).toBeGreaterThanOrEqual(0);
        expect(sheet.anchorY).toBeGreaterThan(0);
        for (const [name, an] of anims) {
          expect(an, name).toBeDefined();
          if (!an) continue;
          expect(an.frames.length, `${kind}.${name}`).toBeGreaterThanOrEqual(3);
          expect(an.frames.length, `${kind}.${name}`).toBeLessThanOrEqual(6);
          expect(an.frameMs).toBeGreaterThan(0);
          const f0 = an.frames[0];
          for (const f of an.frames) {
            expect(f.w).toBe(f0?.w);
            expect(f.h).toBe(f0?.h);
            expect(f.pixels.length).toBe(f.w * f.h);
            let opaque = 0;
            for (const v of f.pixels) {
              expect(v === 255 || (v >= 0 && v <= 233), `${kind}.${name} value ${v}`).toBe(true);
              if (v !== 255) opaque++;
            }
            expect(opaque).toBeGreaterThan(20);
          }
        }
      }
    });

    it('frames are fully outlined: no region touches transparency or another colourable region', () => {
      const sheet = libs[1]?.[kind];
      for (const [name, an] of Object.entries(sheet?.anims ?? {})) {
        for (const f of an?.frames ?? []) {
          for (let y = 0; y < f.h; y++) {
            for (let x = 0; x < f.w; x++) {
              const a = f.pixels[y * f.w + x] as number;
              if (a === 255 || a === 0) continue;
              for (const [dx, dy] of [[1, 0], [0, 1]] as const) {
                const nx = x + dx;
                const ny = y + dy;
                if (nx >= f.w || ny >= f.h) continue;
                const b = f.pixels[ny * f.w + nx] as number;
                const sys = (v: number) => v >= 212 && v <= 233;
                if (b === 255) expect(sys(a), `${kind}.${name} px(${x},${y}) touches transparency`).toBe(true);
                else if (b !== 0 && !sys(a) && !sys(b)) expect(b, `${kind}.${name} (${x},${y})`).toBe(a);
              }
            }
          }
        }
      }
    });
  });

  it('characters have the signature parts', () => {
    const has = (kind: ActorKind, id: number) => Object.values(libs[1]?.[kind].anims ?? {}).some((a) => a?.frames.some((f) => f.pixels.includes(id)));
    for (const id of [1, 2, 3, 4, 212, 213, 214]) expect(has('violet', id), `violet ${id}`).toBe(true);
    for (const id of [5, 6, 7, 8]) expect(has('lumi', id), `lumi ${id}`).toBe(true);
    for (const id of [9, 10, 11]) expect(has('nova', id), `nova ${id}`).toBe(true);
    expect(has('moonCat', 17)).toBe(true);
    expect(has('comet', 16)).toBe(true);
    expect(has('whale', 19)).toBe(true);
  });

  it('character sizes follow the brief', () => {
    const size = (k: ActorKind) => {
      const f = Object.values(libs[0]?.[k].anims ?? {})[0]?.frames[0];
      return [f?.w ?? 0, f?.h ?? 0];
    };
    expect(size('violet')[1]).toBeGreaterThanOrEqual(48);
    expect(size('lumi')[0]).toBeGreaterThanOrEqual(60);
    expect(size('nova')[0]).toBeGreaterThanOrEqual(62);
  });

  it('declares the expected animations per kind', () => {
    const names = (k: ActorKind) => Object.keys(libs[0]?.[k].anims ?? {});
    expect(names('violet')).toEqual(expect.arrayContaining(['idle', 'wiggle', 'bounce']));
    expect(names('lumi')).toEqual(expect.arrayContaining(['sleep', 'idle', 'run', 'rear']));
    expect(names('nova')).toEqual(expect.arrayContaining(['sleep', 'idle', 'run', 'leap']));
    expect(names('moonCat')).toEqual(expect.arrayContaining(['sleep', 'peek']));
    expect(names('whale')).toEqual(expect.arrayContaining(['swim']));
  });
});

describe('preview + illustrations', () => {
  it('renderPreview scales and distinguishes line art from colour', () => {
    const p = page('rooftop');
    const line = art.renderPreview(p, { colored: false, scale: 2 });
    const col = art.renderPreview(p, { colored: true, scale: 2 });
    expect(line.width).toBe(PAGE_W * 2);
    expect(line.height).toBe(PAGE_H * 2);
    expect(line.data.length).toBe(line.width * line.height * 4);
    expect(Buffer.compare(Buffer.from(line.data), Buffer.from(col.data))).not.toBe(0);
    const paperish = new Set<number>();
    for (let i = 0; i < line.data.length; i += 4) paperish.add((line.data[i] as number) * 65536 + (line.data[i + 1] as number) * 256 + (line.data[i + 2] as number));
    expect(paperish.size).toBeLessThanOrEqual(3);
    const colours = new Set<number>();
    for (let i = 0; i < col.data.length; i += 4) colours.add((col.data[i] as number) * 65536 + (col.data[i + 1] as number) * 256 + (col.data[i + 2] as number));
    expect(colours.size).toBeGreaterThan(20);
  });

  const kinds: IllustrationKind[] = [
    ...CHAPTER_IDS.map((c) => ({ type: 'door', chapter: c }) as IllustrationKind),
    ...DRAFT_CARDS.map((c) => ({ type: 'card', card: c.id }) as IllustrationKind),
    ...DRAFT_CARDS.filter((c) => c.type === 'relic').map((c) => ({ type: 'relicSticker', relic: c.id }) as IllustrationKind),
    ...WARDROBE_ITEMS.map((w) => ({ type: 'wardrobe', item: w.id }) as IllustrationKind),
    ...MATERIALS.map((m) => ({ type: 'material', material: m.id }) as IllustrationKind),
    { type: 'bookCover', seed: 5, title: 'The Sparkle-Paws Aurora Spiral' },
    { type: 'portrait', who: 'violet' },
    { type: 'portrait', who: 'lumi' },
    { type: 'portrait', who: 'nova' },
  ];

  it.each(kinds.map((k) => [JSON.stringify(k), k] as const))('illustration %s is sized, opaque-ish and deterministic', (_n, k) => {
    const a = art.illustration(k, 96, 72);
    const b = createArt().illustration(k, 96, 72);
    expect(a.width).toBe(96);
    expect(a.height).toBe(72);
    expect(a.data.length).toBe(96 * 72 * 4);
    expect(Buffer.compare(Buffer.from(a.data), Buffer.from(b.data))).toBe(0);
    let opaque = 0;
    const cols = new Set<number>();
    for (let i = 0; i < a.data.length; i += 4) {
      if ((a.data[i + 3] as number) > 0) {
        opaque++;
        cols.add((a.data[i] as number) * 65536 + (a.data[i + 1] as number) * 256 + (a.data[i + 2] as number));
      }
    }
    expect(opaque).toBeGreaterThan(96 * 72 * 0.2);
    expect(cols.size).toBeGreaterThanOrEqual(4);
  });

  it('illustration honours odd sizes', () => {
    const a = art.illustration({ type: 'door', chapter: 'whaleSea' }, 61, 97);
    expect(a.width).toBe(61);
    expect(a.height).toBe(97);
    const m = art.illustration({ type: 'material', material: 5 }, 32, 32);
    expect(m.data.length).toBe(32 * 32 * 4);
  });
});

describe('hygiene', () => {
  function walk(dir: string): string[] {
    return readdirSync(dir).flatMap((f) => {
      const p = join(dir, f);
      return statSync(p).isDirectory() ? walk(p) : p.endsWith('.ts') ? [p] : [];
    });
  }
  it('no Math.random / Date / timers in src/art or src/scenes', () => {
    for (const f of [...walk('src/art'), ...walk('src/scenes')]) {
      const s = readFileSync(f, 'utf8');
      expect(s, f).not.toMatch(/Math\.random|Date\.now|new Date|performance\.now|setTimeout|setInterval/);
    }
  });
  it('src/art and src/scenes import only contracts and their own directories', () => {
    for (const f of [...walk('src/art'), ...walk('src/scenes')]) {
      const s = readFileSync(f, 'utf8');
      for (const m of s.matchAll(/from '(\.[^']*)'/g)) {
        const spec = m[1] as string;
        const norm = join(f, '..', spec).replace(/\\/g, '/');
        const ok = /^src\/(contracts|art|scenes)(\/|$)/.test(norm);
        expect(ok, `${f} imports ${spec}`).toBe(true);
      }
    }
  });
});
