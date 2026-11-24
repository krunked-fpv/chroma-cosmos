/**
 * CPU coverage model: region-id mirror, CSR pixel index, painted mask and incremental per-region
 * material votes. Everything after `constructor` is O(brush area) or O(1); the only full-map
 * passes happen at load (CSR / adjacency / centroids) and in snapshot/restore.
 */
import { MAX_MATERIAL_ID, PAGE_H, PAGE_PIXELS, PAGE_W, TWIN_TAIL_NEIGHBOR_CHANCE } from '../contracts';
import { hash32 } from './util';

const MATS = MAX_MATERIAL_ID + 1; // index 0 unused, 1..MAX_MATERIAL_ID materials
const TWIN_THRESHOLD = Math.floor(TWIN_TAIL_NEIGHBOR_CHANCE * 4294967296);

export class Coverage {
  readonly map: Uint8Array;
  readonly total = new Uint32Array(256);
  readonly offsets = new Uint32Array(257);
  readonly pixels: Uint32Array;
  readonly painted = new Uint32Array(256);
  readonly mask = new Uint8Array(PAGE_PIXELS);
  readonly pixMat = new Uint8Array(PAGE_PIXELS);
  readonly votes = new Uint32Array(256 * MATS);
  /** argmax of votes, 0 = none */
  readonly regionMat = new Uint8Array(256);
  /** adjacency through direct contact or thin ink borders (<= 3px) */
  readonly adjacent: number[][] = Array.from({ length: 256 }, () => []);
  readonly cx = new Float32Array(256);
  readonly cy = new Float32Array(256);
  readonly bx0 = new Int16Array(256);
  readonly by0 = new Int16Array(256);
  readonly bx1 = new Int16Array(256);
  readonly by1 = new Int16Array(256);
  /** ids that were touched (new pixel or re-voted) since the last `takeTouched` */
  private touched = new Uint8Array(256);
  private touchedList: number[] = [];
  seedMix = 0;

  constructor(map: Uint8Array) {
    this.map = new Uint8Array(PAGE_PIXELS);
    this.map.set(map.subarray(0, PAGE_PIXELS));
    this.pixels = new Uint32Array(PAGE_PIXELS);
    this.buildIndex();
    this.buildAdjacency();
  }

  private buildIndex(): void {
    const { map, total, offsets, pixels } = this;
    for (let i = 0; i < PAGE_PIXELS; i++) total[map[i]!]!++;
    let acc = 0;
    for (let id = 0; id < 256; id++) {
      offsets[id] = acc;
      acc += total[id]!;
    }
    offsets[256] = acc;
    const cursor = new Uint32Array(256);
    const sx = new Float64Array(256);
    const sy = new Float64Array(256);
    this.bx0.fill(PAGE_W);
    this.by0.fill(PAGE_H);
    this.bx1.fill(-1);
    this.by1.fill(-1);
    for (let y = 0; y < PAGE_H; y++) {
      for (let x = 0; x < PAGE_W; x++) {
        const i = y * PAGE_W + x;
        const id = map[i]!;
        pixels[offsets[id]! + cursor[id]!] = i;
        cursor[id]!++;
        sx[id]! += x + 0.5;
        sy[id]! += y + 0.5;
        if (x < this.bx0[id]!) this.bx0[id] = x;
        if (y < this.by0[id]!) this.by0[id] = y;
        if (x > this.bx1[id]!) this.bx1[id] = x;
        if (y > this.by1[id]!) this.by1[id] = y;
      }
    }
    for (let id = 0; id < 256; id++) {
      const t = total[id]!;
      if (t > 0) {
        this.cx[id] = sx[id]! / t;
        this.cy[id] = sy[id]! / t;
      }
    }
  }

  private buildAdjacency(): void {
    const { map } = this;
    const bits = new Uint8Array(256 * 256);
    const link = (a: number, b: number): void => {
      if (a === b || a === 0 || b === 0) return;
      bits[a * 256 + b] = 1;
      bits[b * 256 + a] = 1;
    };
    for (let y = 0; y < PAGE_H; y++) {
      for (let x = 0; x < PAGE_W; x++) {
        const i = y * PAGE_W + x;
        const id = map[i]!;
        if (id === 0) {
          // distinct ids within 2px of an ink pixel are mutual neighbours (handles ink borders up to 3px thick)
          const seen: number[] = [];
          for (let dy = -2; dy <= 2; dy++) {
            const yy = y + dy;
            if (yy < 0 || yy >= PAGE_H) continue;
            for (let dx = -2; dx <= 2; dx++) {
              const xx = x + dx;
              if (xx < 0 || xx >= PAGE_W) continue;
              const o = map[yy * PAGE_W + xx]!;
              if (o !== 0 && !seen.includes(o)) seen.push(o);
            }
          }
          for (let a = 0; a < seen.length; a++) for (let b = a + 1; b < seen.length; b++) link(seen[a]!, seen[b]!);
        } else {
          if (x + 1 < PAGE_W) link(id, map[i + 1]!);
          if (y + 1 < PAGE_H) link(id, map[i + PAGE_W]!);
        }
      }
    }
    for (let a = 1; a < 256; a++) {
      const list = this.adjacent[a]!;
      for (let b = 1; b < 256; b++) if (bits[a * 256 + b]) list.push(b);
    }
  }

  /** Clears painting (map/CSR are kept). */
  reset(): void {
    this.mask.fill(0);
    this.pixMat.fill(0);
    this.painted.fill(0);
    this.votes.fill(0);
    this.regionMat.fill(0);
    this.touched.fill(0);
    this.touchedList.length = 0;
  }

  takeTouched(): number[] {
    const out = this.touchedList;
    for (let i = 0; i < out.length; i++) this.touched[out[i]!] = 0;
    this.touchedList = [];
    return out;
  }

  private touch(id: number): void {
    if (this.touched[id] === 0) {
      this.touched[id] = 1;
      this.touchedList.push(id);
    }
  }

  private vote(id: number, m: number, delta: number): void {
    const base = id * MATS;
    const votes = this.votes;
    votes[base + m]! += delta;
    const best = this.regionMat[id]!;
    if (delta > 0) {
      if (m !== best && votes[base + m]! > (best === 0 ? 0 : votes[base + best]!)) this.regionMat[id] = m;
    } else if (m === best) {
      let b = 0;
      let bv = 0;
      for (let k = 1; k < MATS; k++) {
        const v = votes[base + k]!;
        if (v > bv) {
          bv = v;
          b = k;
        }
      }
      this.regionMat[id] = b;
    }
  }

  /** Paints one pixel of region `id`. Returns true when the pixel was newly painted. */
  paint(idx: number, id: number, mat: number): boolean {
    if (this.mask[idx] === 0) {
      this.mask[idx] = 1;
      this.pixMat[idx] = mat;
      this.painted[id]!++;
      this.vote(id, mat, 1);
      this.touch(id);
      return true;
    }
    const old = this.pixMat[idx]!;
    if (old !== mat) {
      this.pixMat[idx] = mat;
      this.vote(id, old, -1);
      this.vote(id, mat, 1);
      this.touch(id);
    }
    return false;
  }

  /**
   * Stamps a disc. Pixel (x,y) is inside when its centre (x+.5,y+.5) is within `r` of (cx,cy).
   * `allow[id]` gates writes; ids flagged in `nbr` (twin-tail neighbours) only accept a
   * deterministic ~40% hash subset of their pixels.
   */
  stampDisc(cx: number, cy: number, r: number, mat: number, allow: Uint8Array, nbr: Uint8Array | null): void {
    const x0 = Math.max(0, Math.floor(cx - r));
    const x1 = Math.min(PAGE_W - 1, Math.ceil(cx + r));
    const y0 = Math.max(0, Math.floor(cy - r));
    const y1 = Math.min(PAGE_H - 1, Math.ceil(cy + r));
    const r2 = r * r;
    const map = this.map;
    for (let y = y0; y <= y1; y++) {
      const dy = y + 0.5 - cy;
      const dy2 = dy * dy;
      if (dy2 > r2) continue;
      const row = y * PAGE_W;
      for (let x = x0; x <= x1; x++) {
        const dx = x + 0.5 - cx;
        if (dx * dx + dy2 > r2) continue;
        const idx = row + x;
        const id = map[idx]!;
        if (allow[id] === 0) continue;
        if (nbr !== null && nbr[id] === 1 && hash32(idx ^ this.seedMix) >= TWIN_THRESHOLD) continue;
        this.paint(idx, id, mat);
      }
    }
  }

  /** Collects ids of every pixel inside a disc into `out` flags (used by the sponge reach). */
  idsInDisc(cx: number, cy: number, r: number, out: Uint8Array): void {
    const x0 = Math.max(0, Math.floor(cx - r));
    const x1 = Math.min(PAGE_W - 1, Math.ceil(cx + r));
    const y0 = Math.max(0, Math.floor(cy - r));
    const y1 = Math.min(PAGE_H - 1, Math.ceil(cy + r));
    const r2 = r * r;
    for (let y = y0; y <= y1; y++) {
      const dy = y + 0.5 - cy;
      const dy2 = dy * dy;
      if (dy2 > r2) continue;
      for (let x = x0; x <= x1; x++) {
        const dx = x + 0.5 - cx;
        if (dx * dx + dy2 <= r2) out[this.map[y * PAGE_W + x]!] = 1;
      }
    }
  }

  /** Fills every unpainted pixel of a region through the CSR index. Returns pixels newly painted. */
  fillRemaining(id: number, mat: number): number {
    const end = this.offsets[id + 1]!;
    let n = 0;
    for (let k = this.offsets[id]!; k < end; k++) {
      const idx = this.pixels[k]!;
      if (this.mask[idx] === 0) {
        this.paint(idx, id, mat);
        n++;
      }
    }
    return n;
  }

  /** Paints the smallest disc around (cx,cy) holding >= fraction of the region. Returns radius used. */
  fillFraction(id: number, cx: number, cy: number, mat: number, fraction: number): number {
    const total = this.total[id]!;
    if (total === 0) return 0;
    const start = this.offsets[id]!;
    const end = this.offsets[id + 1]!;
    const hist = new Uint32Array(700);
    for (let k = start; k < end; k++) {
      const idx = this.pixels[k]!;
      const dx = (idx % PAGE_W) + 0.5 - cx;
      const dy = Math.floor(idx / PAGE_W) + 0.5 - cy;
      const b = Math.min(699, Math.ceil(Math.sqrt(dx * dx + dy * dy)));
      hist[b]!++;
    }
    const target = Math.max(1, Math.ceil(fraction * total));
    let cum = 0;
    let radius = 699;
    for (let b = 0; b < 700; b++) {
      cum += hist[b]!;
      if (cum >= target) {
        radius = b;
        break;
      }
    }
    const r2 = radius * radius;
    for (let k = start; k < end; k++) {
      const idx = this.pixels[k]!;
      const dx = (idx % PAGE_W) + 0.5 - cx;
      const dy = Math.floor(idx / PAGE_W) + 0.5 - cy;
      if (dx * dx + dy * dy <= r2) this.paint(idx, id, mat);
    }
    return radius;
  }

  /**
   * Paints the smallest disc around the unpainted pixel nearest to (anchorX, anchorY) holding
   * >= fraction of the region's remaining unpainted pixels. Returns disc geometry + newly painted count.
   */
  fillUnpaintedFraction(
    id: number,
    anchorX: number,
    anchorY: number,
    mat: number,
    fraction: number,
  ): { x: number; y: number; radius: number; newlyPainted: number } {
    const total = this.total[id]!;
    const remaining = total - this.painted[id]!;
    if (total === 0 || remaining <= 0 || fraction <= 0) {
      return { x: anchorX, y: anchorY, radius: 0, newlyPainted: 0 };
    }
    const start = this.offsets[id]!;
    const end = this.offsets[id + 1]!;
    // Pick the unpainted pixel closest to (anchorX, anchorY) as the disc center
    let ax = this.cx[id]!;
    let ay = this.cy[id]!;
    let bestD2 = Infinity;
    for (let k = start; k < end; k++) {
      const idx = this.pixels[k]!;
      if (this.mask[idx] !== 0) continue;
      const px = (idx % PAGE_W) + 0.5;
      const py = Math.floor(idx / PAGE_W) + 0.5;
      const dx = px - anchorX;
      const dy = py - anchorY;
      const d2 = dx * dx + dy * dy;
      if (d2 < bestD2) {
        bestD2 = d2;
        ax = px;
        ay = py;
      }
    }
    const hist = new Uint32Array(700);
    for (let k = start; k < end; k++) {
      const idx = this.pixels[k]!;
      if (this.mask[idx] !== 0) continue;
      const dx = (idx % PAGE_W) + 0.5 - ax;
      const dy = Math.floor(idx / PAGE_W) + 0.5 - ay;
      const b = Math.min(699, Math.ceil(Math.sqrt(dx * dx + dy * dy)));
      hist[b]!++;
    }
    const target = Math.max(1, Math.ceil(fraction * remaining));
    let cum = 0;
    let radius = 699;
    for (let b = 0; b < 700; b++) {
      cum += hist[b]!;
      if (cum >= target) {
        radius = b;
        break;
      }
    }
    const r2 = radius * radius;
    let newlyPainted = 0;
    for (let k = start; k < end; k++) {
      const idx = this.pixels[k]!;
      const dx = (idx % PAGE_W) + 0.5 - ax;
      const dy = Math.floor(idx / PAGE_W) + 0.5 - ay;
      if (dx * dx + dy * dy <= r2) {
        if (this.paint(idx, id, mat)) newlyPainted++;
      }
    }
    return { x: ax, y: ay, radius: Math.max(1, radius), newlyPainted };
  }

  /** True when any pixel of the region lies within `r` of (px,py). */
  regionWithin(id: number, px: number, py: number, r: number): boolean {
    if (this.total[id]! === 0) return false;
    if (px < this.bx0[id]! - r || px > this.bx1[id]! + 1 + r || py < this.by0[id]! - r || py > this.by1[id]! + 1 + r) return false;
    const r2 = r * r;
    const end = this.offsets[id + 1]!;
    for (let k = this.offsets[id]!; k < end; k++) {
      const idx = this.pixels[k]!;
      const dx = (idx % PAGE_W) + 0.5 - px;
      const dy = Math.floor(idx / PAGE_W) + 0.5 - py;
      if (dx * dx + dy * dy <= r2) return true;
    }
    return false;
  }

  /** Brute force recount (tests / restore only). */
  recount(): void {
    this.painted.fill(0);
    this.votes.fill(0);
    this.regionMat.fill(0);
    for (let i = 0; i < PAGE_PIXELS; i++) {
      if (this.mask[i] === 1) {
        const id = this.map[i]!;
        this.painted[id]!++;
        this.vote(id, this.pixMat[i]!, 1);
      }
    }
  }

  encodeRle(): Uint8Array {
    const out: number[] = [];
    const put = (n: number): void => {
      let v = n;
      while (v >= 0x80) {
        out.push((v & 0x7f) | 0x80);
        v >>>= 7;
      }
      out.push(v);
    };
    let cur = 0;
    let run = 0;
    for (let i = 0; i < PAGE_PIXELS; i++) {
      const m = this.mask[i]!;
      if (m === cur) run++;
      else {
        put(run);
        cur = m;
        run = 1;
      }
    }
    put(run);
    return Uint8Array.from(out);
  }

  /** Decodes into the painted mask (no counts); throws on malformed data. */
  decodeRleInto(rle: Uint8Array): void {
    this.mask.fill(0);
    let pos = 0;
    let cur = 0;
    let i = 0;
    while (pos < rle.length) {
      let v = 0;
      let shift = 0;
      for (;;) {
        const b = rle[pos++];
        if (b === undefined) throw new Error('truncated RLE');
        v |= (b & 0x7f) << shift;
        if ((b & 0x80) === 0) break;
        shift += 7;
        if (shift > 28) throw new Error('bad RLE varint');
      }
      if (i + v > PAGE_PIXELS) throw new Error('RLE overruns page');
      if (cur === 1) this.mask.fill(1, i, i + v);
      i += v;
      cur ^= 1;
    }
  }
}
