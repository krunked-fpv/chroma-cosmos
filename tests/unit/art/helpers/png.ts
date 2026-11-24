import { deflateSync } from 'node:zlib';
import type { PixelImage, SpriteFrame, SpriteLibrary, ActorKind } from '../../../../src/contracts/art';
import { regionRgb, hexToRgb } from '../../../../src/art/palette';
import { INK_HEX, PAPER_HEX } from '../../../../src/contracts/constants';

const CRC_TABLE = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c >>> 0;
  }
  return t;
})();

function crc32(buf: Uint8Array): number {
  let c = 0xffffffff;
  for (const b of buf) c = (CRC_TABLE[(c ^ b) & 255] as number) ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function chunk(type: string, data: Uint8Array): Uint8Array {
  const out = new Uint8Array(12 + data.length);
  const dv = new DataView(out.buffer);
  dv.setUint32(0, data.length);
  for (let i = 0; i < 4; i++) out[4 + i] = type.charCodeAt(i);
  out.set(data, 8);
  dv.setUint32(8 + data.length, crc32(out.subarray(4, 8 + data.length)));
  return out;
}

/** minimal RGBA8 PNG encoder (node:zlib) */
export function encodePng(img: PixelImage): Uint8Array {
  const { width, height, data } = img;
  const raw = new Uint8Array((width * 4 + 1) * height);
  for (let y = 0; y < height; y++) {
    raw[y * (width * 4 + 1)] = 0;
    raw.set(data.subarray(y * width * 4, (y + 1) * width * 4), y * (width * 4 + 1) + 1);
  }
  const ihdr = new Uint8Array(13);
  const dv = new DataView(ihdr.buffer);
  dv.setUint32(0, width);
  dv.setUint32(4, height);
  ihdr[8] = 8;
  ihdr[9] = 6;
  const parts = [
    new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw)),
    chunk('IEND', new Uint8Array(0)),
  ];
  const out = new Uint8Array(parts.reduce((n, p) => n + p.length, 0));
  let o = 0;
  for (const p of parts) {
    out.set(p, o);
    o += p.length;
  }
  return out;
}

/** Contact sheet of every animation frame of the given sprite kinds on paper, flat-coloured. */
export function spriteSheetImage(lib: SpriteLibrary, kinds: readonly ActorKind[], scale: number): PixelImage {
  const paper = hexToRgb(PAPER_HEX);
  const ink = hexToRgb(INK_HEX);
  const rows: Array<{ frames: SpriteFrame[] }> = [];
  for (const k of kinds) for (const a of Object.values(lib[k].anims)) if (a) rows.push({ frames: a.frames });
  const gap = 3;
  let maxW = 0;
  let totalH = gap;
  for (const r of rows) {
    const w = r.frames.reduce((n, f) => n + f.w + gap, gap);
    maxW = Math.max(maxW, w);
    totalH += Math.max(...r.frames.map((f) => f.h)) + gap;
  }
  const W = maxW * scale;
  const H = totalH * scale;
  const data = new Uint8ClampedArray(W * H * 4);
  for (let i = 0; i < W * H; i++) {
    data[i * 4] = paper[0];
    data[i * 4 + 1] = paper[1];
    data[i * 4 + 2] = paper[2];
    data[i * 4 + 3] = 255;
  }
  let y0 = gap;
  for (const r of rows) {
    let x0 = gap;
    const rh = Math.max(...r.frames.map((f) => f.h));
    for (const f of r.frames) {
      for (let y = 0; y < f.h; y++) {
        for (let x = 0; x < f.w; x++) {
          const v = f.pixels[y * f.w + x] as number;
          if (v === 255) continue;
          const c = v === 0 ? ink : regionRgb(v, undefined);
          for (let dy = 0; dy < scale; dy++) {
            for (let dx = 0; dx < scale; dx++) {
              const o = (((y0 + y) * scale + dy) * W + (x0 + x) * scale + dx) * 4;
              data[o] = c[0];
              data[o + 1] = c[1];
              data[o + 2] = c[2];
            }
          }
        }
      }
      x0 += f.w + gap;
    }
    y0 += rh + gap;
  }
  return { width: W, height: H, data };
}
