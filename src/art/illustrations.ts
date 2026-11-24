/**
 * Procedural storybook illustrations (doors, draft cards, relic stickers, wardrobe icons, material swatches,
 * book covers, portraits). Every kind is drawn at a low internal resolution with 1px ink outlines and then
 * NEAREST-upscaled to exactly w x h. Pure + deterministic (seeded PRNG only).
 */
import type { IllustrationKind, PixelImage } from '../contracts/art';
import { Canvas, upscale } from './illo/canvas';
import { drawDoor } from './illo/door';
import { drawCard } from './illo/card';
import { drawRelicSticker } from './illo/sticker';
import { drawWardrobe } from './illo/wardrobe';
import { drawMaterial } from './illo/material';
import { drawBookCover } from './illo/cover';
import { drawPortrait } from './illo/portrait';

/** longest internal side per kind (art-directed chunkiness) */
const CAP: Record<IllustrationKind['type'], number> = {
  door: 120,
  card: 120,
  relicSticker: 96,
  wardrobe: 72,
  material: 72,
  bookCover: 128,
  portrait: 112,
};

export function internalSize(w: number, h: number, cap: number): { lw: number; lh: number; k: number } {
  const k = Math.max(1, Math.round(Math.max(w, h) / cap));
  return { lw: Math.max(1, Math.ceil(w / k)), lh: Math.max(1, Math.ceil(h / k)), k };
}

export function illustration(kind: IllustrationKind, w: number, h: number): PixelImage {
  const W = Math.max(1, Math.floor(w));
  const H = Math.max(1, Math.floor(h));
  const { lw, lh, k } = internalSize(W, H, CAP[kind.type]);
  let c: Canvas;
  switch (kind.type) {
    case 'door':
      c = drawDoor(kind.chapter, lw, lh);
      break;
    case 'card':
      c = drawCard(kind.card, lw, lh);
      break;
    case 'relicSticker':
      c = drawRelicSticker(kind.relic, lw, lh);
      break;
    case 'wardrobe':
      c = drawWardrobe(kind.item, lw, lh);
      break;
    case 'material':
      c = drawMaterial(kind.material, lw, lh);
      break;
    case 'bookCover':
      c = drawBookCover(kind.seed, kind.title, lw, lh);
      break;
    case 'portrait':
      c = drawPortrait(kind.who, lw, lh);
      break;
  }
  return upscale(c, k, W, H);
}
