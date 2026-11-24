/** renderPreview: flat preview palette, or line art on cream paper. */
import type { CompiledPage, PixelImage } from '../contracts/art';
import { INK_HEX, PAGE_H, PAGE_W, PAPER_HEX } from '../contracts/constants';
import { MATERIALS } from '../contracts/materials';
import { hexToRgb, lerpRgb, regionRgb } from './palette';

export function renderPreview(page: CompiledPage, opts: { colored: boolean; scale: number }): PixelImage {
  const s = Math.max(1, Math.floor(opts.scale));
  const w = PAGE_W * s;
  const h = PAGE_H * s;
  const data = new Uint8ClampedArray(w * h * 4);
  const ink = hexToRgb(INK_HEX);
  const paper = hexToRgb(PAPER_HEX);
  const top = hexToRgb(page.sky.top);
  const bottom = hexToRgb(page.sky.bottom);
  const pre = new Map<number, [number, number, number]>();
  if (opts.colored && page.preColored) {
    for (const p of page.preColored) {
      const m = MATERIALS.find((q) => q.id === p.materialId);
      if (m) pre.set(p.id, hexToRgb(m.palette[0] as string));
    }
  }
  const lut: Array<[number, number, number]> = new Array(256);
  for (let id = 0; id < 256; id++) {
    if (id === 0) lut[id] = ink;
    else if (!opts.colored) lut[id] = paper;
    else if (id === 255) lut[id] = top;
    else lut[id] = pre.get(id) ?? regionRgb(id, page.regions[id]?.kind);
  }
  for (let y = 0; y < PAGE_H; y++) {
    const sky = lerpRgb(top, bottom, y / (PAGE_H - 1));
    for (let x = 0; x < PAGE_W; x++) {
      const id = page.regionMap[y * PAGE_W + x] as number;
      let c = lut[id] as [number, number, number];
      if (opts.colored && id === 255) c = sky;
      if (!opts.colored && id !== 0) {
        // faint paper tooth so line art reads as paper
        const t = ((x * 7 + y * 13) & 7) === 0 ? -4 : 0;
        c = [paper[0] + t, paper[1] + t, paper[2] + t];
      }
      for (let dy = 0; dy < s; dy++) {
        for (let dx = 0; dx < s; dx++) {
          const o = ((y * s + dy) * w + x * s + dx) * 4;
          data[o] = c[0];
          data[o + 1] = c[1];
          data[o + 2] = c[2];
          data[o + 3] = 255;
        }
      }
    }
  }
  return { width: w, height: h, data };
}
