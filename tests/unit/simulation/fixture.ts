/** Synthetic CompiledPage fixture (no dependency on src/art). */
import { CANONICAL_REGIONS, PAGE_H, PAGE_PIXELS, PAGE_W } from '../../../src/contracts';
import type { ActorSpawn, CompiledPage, PagePath, RegionKind, RegionMeta, RunContext } from '../../../src/contracts';

export interface Rect {
  id: number;
  x0: number;
  y0: number;
  x1: number;
  y1: number;
  kind?: RegionKind;
}

/**
 * Layout (2px ink gaps between neighbours, 8px sky gaps otherwise):
 *   12 planet | 13 rings          16 comet | 17 moonCat    40 star   / 240 ghost
 *   14 cloud  | 15 cloud          20 asteroid | 21 asteroid
 *   5 lumi_body | 6 lumi_mane   9 nova_body | 10 nova_spots   1 violet_skin | 2 violet_hair
 */
export const RECTS: Rect[] = [
  { id: 12, x0: 20, y0: 20, x1: 119, y1: 99 },
  { id: 13, x0: 122, y0: 20, x1: 241, y1: 99 },
  { id: 14, x0: 20, y0: 102, x1: 119, y1: 181 },
  { id: 15, x0: 122, y0: 102, x1: 241, y1: 181 },
  { id: 16, x0: 250, y0: 20, x1: 329, y1: 99 },
  { id: 17, x0: 332, y0: 20, x1: 411, y1: 99 },
  { id: 20, x0: 250, y0: 102, x1: 329, y1: 181 },
  { id: 21, x0: 332, y0: 102, x1: 411, y1: 181, kind: 'asteroid' },
  { id: 5, x0: 20, y0: 190, x1: 99, y1: 259 },
  { id: 6, x0: 102, y0: 190, x1: 181, y1: 259 },
  { id: 9, x0: 190, y0: 190, x1: 269, y1: 259 },
  { id: 10, x0: 272, y0: 190, x1: 331, y1: 259 },
  { id: 1, x0: 340, y0: 190, x1: 379, y1: 259 },
  { id: 2, x0: 382, y0: 190, x1: 421, y1: 259 },
  { id: 40, x0: 430, y0: 70, x1: 470, y1: 120, kind: 'star' },
  { id: 240, x0: 430, y0: 20, x1: 470, y1: 60, kind: 'ghost' },
  { id: 41, x0: 430, y0: 130, x1: 470, y1: 180, kind: 'star' },
];

export const CORE_IDS = [1, 2, 5, 6, 9, 10, 12, 13, 14, 15];

export function ctxOf(over: Partial<RunContext> = {}): RunContext {
  return { seed: 7, chapterIndex: 0, brushes: ['standard'], relics: [], ...over };
}

export function buildFixture(opts: { withActors?: boolean; rects?: Rect[] } = {}): CompiledPage {
  const rects = opts.rects ?? RECTS;
  const map = new Uint8Array(PAGE_PIXELS).fill(255);
  for (const r of rects) {
    // 2px ink border around each rect
    for (let y = r.y0 - 2; y <= r.y1 + 2; y++) {
      for (let x = r.x0 - 2; x <= r.x1 + 2; x++) {
        if (x < 0 || y < 0 || x >= PAGE_W || y >= PAGE_H) continue;
        map[y * PAGE_W + x] = 0;
      }
    }
  }
  for (const r of rects) {
    for (let y = r.y0; y <= r.y1; y++) for (let x = r.x0; x <= r.x1; x++) map[y * PAGE_W + x] = r.id;
  }
  const total = new Uint32Array(256);
  const sx = new Float64Array(256);
  const sy = new Float64Array(256);
  const bb = Array.from({ length: 256 }, () => ({ x0: PAGE_W, y0: PAGE_H, x1: -1, y1: -1 }));
  const adj = Array.from({ length: 256 }, () => new Set<number>());
  for (let y = 0; y < PAGE_H; y++) {
    for (let x = 0; x < PAGE_W; x++) {
      const id = map[y * PAGE_W + x]!;
      total[id]!++;
      sx[id]! += x + 0.5;
      sy[id]! += y + 0.5;
      const b = bb[id]!;
      b.x0 = Math.min(b.x0, x);
      b.y0 = Math.min(b.y0, y);
      b.x1 = Math.max(b.x1, x);
      b.y1 = Math.max(b.y1, y);
      if (id === 0) {
        const seen = new Set<number>();
        for (let dy = -2; dy <= 2; dy++) for (let dx = -2; dx <= 2; dx++) {
          const xx = x + dx;
          const yy = y + dy;
          if (xx < 0 || yy < 0 || xx >= PAGE_W || yy >= PAGE_H) continue;
          const o = map[yy * PAGE_W + xx]!;
          if (o !== 0) seen.add(o);
        }
        for (const a of seen) for (const c of seen) if (a !== c) adj[a]!.add(c);
      }
    }
  }
  const regions: (RegionMeta | undefined)[] = new Array<RegionMeta | undefined>(256).fill(undefined);
  for (const r of rects) {
    const canon = CANONICAL_REGIONS.find((c) => c.id === r.id);
    const kind: RegionKind = r.kind ?? canon?.kind ?? 'prop';
    const n = total[r.id]!;
    regions[r.id] = {
      id: r.id,
      key: canon?.key ?? `r${r.id}`,
      kind,
      label: `r${r.id}`,
      centroid: { x: sx[r.id]! / n, y: sy[r.id]! / n },
      bbox: bb[r.id]!,
      neighbors: [...adj[r.id]!].filter((o) => o !== 255).sort((a, b) => a - b),
      core: CORE_IDS.includes(r.id),
      ghost: r.id >= 234 && r.id <= 254,
      coverageExcluded: r.id >= 212,
    };
  }
  const actors: ActorSpawn[] = opts.withActors === false ? [] : [
    { instanceId: 'lumi-1', kind: 'lumi', slot: 1, x: 60, y: 225, facing: 1, regionIds: [5, 6] },
    { instanceId: 'nova-1', kind: 'nova', slot: 2, x: 230, y: 225, facing: 1, regionIds: [9, 10] },
    { instanceId: 'violet-1', kind: 'violet', slot: 3, x: 360, y: 225, facing: -1, regionIds: [1, 2] },
    { instanceId: 'cat-1', kind: 'moonCat', slot: 4, x: 370, y: 60, facing: 1, regionIds: [17] },
    { instanceId: 'comet-1', kind: 'comet', slot: 5, x: 290, y: 60, facing: 1, regionIds: [16] },
  ];
  const paths: PagePath[] = [
    { role: 'gallop', closed: false, points: [{ x: 40, y: 225 }, { x: 90, y: 215 }, { x: 150, y: 225 }, { x: 180, y: 220 }] },
    { role: 'sprint', closed: false, points: [{ x: 200, y: 225 }, { x: 260, y: 215 }, { x: 330, y: 225 }] },
    { role: 'margin', closed: false, points: [{ x: 20, y: 262 }, { x: 140, y: 264 }, { x: 260, y: 262 }, { x: 380, y: 264 }, { x: 460, y: 262 }] },
  ];
  return {
    sceneId: 'rooftop',
    seed: 12345,
    title: 'fixture',
    regionMap: map,
    baseRegionMap: map.slice(),
    actorSlotMap: new Uint8Array(PAGE_PIXELS),
    regionTotalPixels: total,
    regions,
    coreRegionIds: CORE_IDS.slice(),
    actors,
    paths,
    focal: { x: 240, y: 135 },
    sky: { top: '#120d2b', bottom: '#2a1b5e', mist: '#6a4cff' },
  };
}

/** Independent RLE decoder (varint alternating runs starting with zeros). */
export function decodeMask(rle: Uint8Array): Uint8Array {
  const mask = new Uint8Array(PAGE_PIXELS);
  let pos = 0;
  let cur = 0;
  let i = 0;
  while (pos < rle.length) {
    let v = 0;
    let shift = 0;
    for (;;) {
      const b = rle[pos++]!;
      v |= (b & 0x7f) << shift;
      if ((b & 0x80) === 0) break;
      shift += 7;
    }
    if (cur === 1) mask.fill(1, i, i + v);
    i += v;
    cur ^= 1;
  }
  return mask;
}

export function bruteCounts(map: Uint8Array, mask: Uint8Array): Uint32Array {
  const out = new Uint32Array(256);
  for (let i = 0; i < PAGE_PIXELS; i++) if (mask[i]) out[map[i]!]!++;
  return out;
}

let seedState = 1;
export function rand(seed?: number): number {
  if (seed !== undefined) seedState = seed >>> 0;
  seedState = (Math.imul(seedState, 1664525) + 1013904223) >>> 0;
  return seedState / 4294967296;
}
