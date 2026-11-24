/**
 * Env-gated visual preview of the illustration generator.
 *   PREVIEW=1 PREVIEW_DIR=<dir> [PREVIEW_KINDS=door,card,...] [PREVIEW_SCALE=3] npx vitest run tests/unit/art/illo-preview.test.ts
 * Writes one contact-sheet PNG per kind group (flat-grey checker behind transparent pixels).
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, it } from 'vitest';
import type { IllustrationKind, PixelImage } from '../../../src/contracts/art';
import { illustration } from '../../../src/art/illustrations';
import { MATERIALS } from '../../../src/contracts/materials';
import { CHAPTERS, DRAFT_CARDS } from '../../../src/contracts/roguelike';
import { WARDROBE_ITEMS } from '../../../src/contracts/progression';
import { encodePng } from './helpers/png';

type Item = { kind: IllustrationKind; w: number; h: number };

const doorIds = CHAPTERS.map((c) => c.id);
const groups: Record<string, Item[]> = {
  door: [
    ...doorIds.map((chapter) => ({ kind: { type: 'door', chapter } as IllustrationKind, w: 72, h: 96 })),
    { kind: { type: 'door', chapter: 'whaleSea' }, w: 96, h: 72 },
    { kind: { type: 'door', chapter: 'saturnRings' }, w: 61, h: 97 },
    { kind: { type: 'door', chapter: 'rooftop' }, w: 240, h: 320 },
  ],
  card: [
    ...DRAFT_CARDS.map((c) => ({ kind: { type: 'card', card: c.id } as IllustrationKind, w: 80, h: 112 })),
    { kind: { type: 'card', card: 'turboCheetah' }, w: 96, h: 72 },
    { kind: { type: 'card', card: 'prismRibbon' }, w: 200, h: 280 },
  ],
  sticker: [
    ...DRAFT_CARDS.filter((c) => c.type === 'relic').map((c) => ({ kind: { type: 'relicSticker', relic: c.id } as IllustrationKind, w: 80, h: 80 })),
    { kind: { type: 'relicSticker', relic: 'zoomiePaw' }, w: 96, h: 72 },
    { kind: { type: 'relicSticker', relic: 'uvFlashlight' }, w: 40, h: 40 },
  ],
  wardrobe: [
    ...WARDROBE_ITEMS.map((w) => ({ kind: { type: 'wardrobe', item: w.id } as IllustrationKind, w: 64, h: 64 })),
    { kind: { type: 'wardrobe', item: 'lumiCrown' }, w: 96, h: 72 },
    { kind: { type: 'wardrobe', item: 'violetCape' }, w: 32, h: 32 },
  ],
  material: [
    ...MATERIALS.map((m) => ({ kind: { type: 'material', material: m.id } as IllustrationKind, w: 64, h: 64 })),
    { kind: { type: 'material', material: 2 }, w: 96, h: 72 },
    { kind: { type: 'material', material: 10 }, w: 32, h: 32 },
  ],
  cover: [
    { kind: { type: 'bookCover', seed: 5, title: 'The Sparkle-Paws Aurora Spiral' }, w: 96, h: 128 },
    { kind: { type: 'bookCover', seed: 11, title: 'Violet & the Milkshake Moon' }, w: 96, h: 128 },
    { kind: { type: 'bookCover', seed: 5, title: 'The Sparkle-Paws Aurora Spiral' }, w: 96, h: 72 },
    { kind: { type: 'bookCover', seed: 42, title: "Nova's Zoomie Comet Day!" }, w: 180, h: 240 },
    { kind: { type: 'bookCover', seed: 7, title: '' }, w: 64, h: 90 },
  ],
  portrait: [
    ...(['violet', 'lumi', 'nova'] as const).map((who) => ({ kind: { type: 'portrait', who } as IllustrationKind, w: 72, h: 96 })),
    { kind: { type: 'portrait', who: 'violet' }, w: 96, h: 72 },
    { kind: { type: 'portrait', who: 'lumi' }, w: 96, h: 72 },
    { kind: { type: 'portrait', who: 'nova' }, w: 96, h: 72 },
    { kind: { type: 'portrait', who: 'lumi' }, w: 160, h: 200 },
  ],
};

function sheet(items: Item[], scale: number, maxW: number): PixelImage {
  const gap = 4;
  const imgs = items.map((it) => illustration(it.kind, it.w, it.h));
  // flow layout
  const pos: Array<{ x: number; y: number }> = [];
  let x = gap;
  let y = gap;
  let rowH = 0;
  let totalW = 0;
  for (const im of imgs) {
    if (x + im.width + gap > maxW && x > gap) {
      x = gap;
      y += rowH + gap;
      rowH = 0;
    }
    pos.push({ x, y });
    x += im.width + gap;
    rowH = Math.max(rowH, im.height);
    totalW = Math.max(totalW, x);
  }
  const W = totalW;
  const H = y + rowH + gap;
  const out = new Uint8ClampedArray(W * scale * H * scale * 4);
  const SW = W * scale;
  for (let py = 0; py < H * scale; py++) {
    for (let px = 0; px < SW; px++) {
      const cx = Math.floor(px / scale);
      const cy = Math.floor(py / scale);
      const v = ((cx >> 2) + (cy >> 2)) & 1 ? 0x3a : 0x44;
      const o = (py * SW + px) * 4;
      out[o] = v;
      out[o + 1] = v;
      out[o + 2] = v + 12;
      out[o + 3] = 255;
    }
  }
  imgs.forEach((im, i) => {
    const p = pos[i] as { x: number; y: number };
    for (let iy = 0; iy < im.height; iy++) {
      for (let ix = 0; ix < im.width; ix++) {
        const so = (iy * im.width + ix) * 4;
        const a = (im.data[so + 3] as number) / 255;
        if (a === 0) continue;
        for (let dy = 0; dy < scale; dy++) {
          for (let dx = 0; dx < scale; dx++) {
            const o = (((p.y + iy) * scale + dy) * SW + (p.x + ix) * scale + dx) * 4;
            for (let ch = 0; ch < 3; ch++) out[o + ch] = (im.data[so + ch] as number) * a + (out[o + ch] as number) * (1 - a);
          }
        }
      }
    }
  });
  return { width: SW, height: H * scale, data: out };
}

describe.skipIf(!process.env.PREVIEW)('illustration preview sheets', () => {
  const dir = process.env.PREVIEW_DIR ?? join(process.cwd(), 'preview-out');
  const scale = Number(process.env.PREVIEW_SCALE ?? 3);
  const only = process.env.PREVIEW_KINDS?.split(',').map((s) => s.trim());
  for (const [name, items] of Object.entries(groups)) {
    if (only && !only.includes(name)) continue;
    it(`sheet ${name}`, () => {
      mkdirSync(dir, { recursive: true });
      const img = sheet(items, scale, Math.floor(1500 / scale));
      writeFileSync(join(dir, `illo-${name}.png`), encodePng(img));
    });
  }
});
