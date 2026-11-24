import { describe, expect, it } from 'vitest';
import { MAX_STAMPS_PER_BATCH } from '../../../src/contracts/constants';
import type { GpuStamp, GpuStampBatch } from '../../../src/contracts/simulation';
import { packStampBatches, packStamps, splitStampBatches, writeAllowedTexture } from '../../../src/renderer/stampPacking';

const stamp = (i: number): GpuStamp => ({ x: i, y: i * 2, radius: 6, materialId: (i % 12) + 1, dx: 0.5, dy: -0.5, strength: 1 });
const batch = (n: number, allowedIds: number[] = [3]): GpuStampBatch => {
  const allowed = new Uint8Array(256);
  for (const id of allowedIds) allowed[id] = 1;
  return { allowed, stamps: Array.from({ length: n }, (_, i) => stamp(i)) };
};

describe('stamp batch splitting', () => {
  it('splits oversize batches into <= 64 stamps, preserving order and the allowed mask', () => {
    const b = batch(200, [1, 2]);
    const out = splitStampBatches([b]);
    expect(out.map((o) => o.stamps.length)).toEqual([64, 64, 64, 8]);
    expect(out.flatMap((o) => o.stamps.map((s) => s.x))).toEqual(b.stamps.map((s) => s.x));
    for (const o of out) expect(o.allowed).toBe(b.allowed);
  });

  it('keeps small batches intact and drops empty ones', () => {
    const out = splitStampBatches([batch(0), batch(1), batch(64), batch(65)]);
    expect(out.map((o) => o.stamps.length)).toEqual([1, 64, 64, 1]);
  });

  it('never exceeds MAX_STAMPS_PER_BATCH for any size', () => {
    expect(MAX_STAMPS_PER_BATCH).toBe(64);
    for (const n of [1, 63, 64, 65, 127, 128, 129, 500, 1000]) {
      const out = splitStampBatches([batch(n)]);
      expect(out.every((o) => o.stamps.length >= 1 && o.stamps.length <= 64)).toBe(true);
      expect(out.reduce((s, o) => s + o.stamps.length, 0)).toBe(n);
    }
  });
});

describe('stamp packing', () => {
  it('packs two vec4 per stamp: (x,y,radius,strength) and (mat/255,dx,dy,0)', () => {
    const packed = packStampBatches([batch(3)]);
    expect(packed).toHaveLength(1);
    const p = packed[0]!;
    expect(p.count).toBe(3);
    expect(p.a.length).toBe(MAX_STAMPS_PER_BATCH * 4);
    expect(p.b.length).toBe(MAX_STAMPS_PER_BATCH * 4);
    expect(Array.from(p.a.slice(4, 8))).toEqual([1, 2, 6, 1]);
    expect(p.b[4]).toBeCloseTo(2 / 255, 6);
    expect(p.b[5]).toBeCloseTo(0.5, 6);
    expect(p.b[6]).toBeCloseTo(-0.5, 6);
  });

  it('splits then packs: 150 stamps -> 3 GPU batches (64, 64, 22)', () => {
    const packed = packStampBatches([batch(150)]);
    expect(packed.map((p) => p.count)).toEqual([64, 64, 22]);
  });

  it('sanitises non-finite and out-of-range values', () => {
    const a = new Float32Array(MAX_STAMPS_PER_BATCH * 4);
    const b = new Float32Array(MAX_STAMPS_PER_BATCH * 4);
    const n = packStamps([{ x: NaN, y: Infinity, radius: 0, materialId: 999, dx: 5, dy: -5, strength: 9 }], a, b);
    expect(n).toBe(1);
    expect(a[0]).toBe(0);
    expect(a[1]).toBe(0);
    expect(a[2]).toBeGreaterThan(0);
    expect(a[3]).toBe(1);
    expect(b[0]).toBe(1);
    expect(b[1]).toBe(1);
    expect(b[2]).toBe(-1);
  });

  it('expands the allowed mask into 256x1 RGBA bytes', () => {
    const out = new Uint8Array(256 * 4);
    const allowed = new Uint8Array(256);
    allowed[0] = 0;
    allowed[7] = 1;
    allowed[255] = 1;
    writeAllowedTexture(allowed, out);
    expect(out[7 * 4]).toBe(255);
    expect(out[7 * 4 + 3]).toBe(255);
    expect(out[8 * 4]).toBe(0);
    expect(out[255 * 4]).toBe(255);
    expect(out[0]).toBe(0);
  });
});
