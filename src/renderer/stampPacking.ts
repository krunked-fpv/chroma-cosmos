/** Pure stamp-batch packing: split to <= 64 stamps per GPU batch and pack into uniform arrays. */
import type { GpuStamp, GpuStampBatch } from '../contracts/simulation';
import { MAX_STAMPS_PER_BATCH } from '../contracts/constants';

export interface PackedStampBatch {
  allowed: Uint8Array;
  count: number;
  /** MAX_STAMPS_PER_BATCH vec4: x, y, radius, strength */
  a: Float32Array;
  /** MAX_STAMPS_PER_BATCH vec4: materialId/255, dx, dy, 0 */
  b: Float32Array;
}

/** Splits batches so none exceeds `max` stamps; empty batches are dropped; order is preserved. */
export function splitStampBatches(batches: readonly GpuStampBatch[], max = MAX_STAMPS_PER_BATCH): GpuStampBatch[] {
  const out: GpuStampBatch[] = [];
  for (const batch of batches) {
    for (let i = 0; i < batch.stamps.length; i += max) {
      out.push({ allowed: batch.allowed, stamps: batch.stamps.slice(i, i + max) });
    }
  }
  return out;
}

const finite = (v: number, d = 0): number => (Number.isFinite(v) ? v : d);

export function packStamps(stamps: readonly GpuStamp[], a: Float32Array, b: Float32Array): number {
  const n = Math.min(stamps.length, MAX_STAMPS_PER_BATCH);
  for (let i = 0; i < n; i++) {
    const s = stamps[i] as GpuStamp;
    a[i * 4] = finite(s.x);
    a[i * 4 + 1] = finite(s.y);
    a[i * 4 + 2] = Math.max(0.0001, finite(s.radius, 1));
    a[i * 4 + 3] = Math.min(1, Math.max(0, finite(s.strength, 1)));
    b[i * 4] = Math.min(255, Math.max(0, finite(s.materialId))) / 255;
    b[i * 4 + 1] = Math.min(1, Math.max(-1, finite(s.dx)));
    b[i * 4 + 2] = Math.min(1, Math.max(-1, finite(s.dy)));
    b[i * 4 + 3] = 0;
  }
  return n;
}

/** Splits then packs. */
export function packStampBatches(batches: readonly GpuStampBatch[]): PackedStampBatch[] {
  return splitStampBatches(batches).map((batch) => {
    const a = new Float32Array(MAX_STAMPS_PER_BATCH * 4);
    const b = new Float32Array(MAX_STAMPS_PER_BATCH * 4);
    const count = packStamps(batch.stamps, a, b);
    return { allowed: batch.allowed, count, a, b };
  });
}

/** Expands a 256-entry 0/1 mask into the RGBA bytes of the 256x1 `uAllowedTex`. */
export function writeAllowedTexture(allowed: Uint8Array, out: Uint8Array): void {
  for (let i = 0; i < 256; i++) {
    const v = (allowed[i] ?? 0) > 0 ? 255 : 0;
    out[i * 4] = v;
    out[i * 4 + 1] = v;
    out[i * 4 + 2] = v;
    out[i * 4 + 3] = 255;
  }
}
