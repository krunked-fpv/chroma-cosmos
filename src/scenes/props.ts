/** Shared procedural props. All draw into ctx.r with region ids (ink pass runs later). */
import type { Paint, Pt, Raster } from './raster';
import type { Rng, SceneCtx } from './context';

export function rot(pts: readonly Pt[], cx: number, cy: number, ang: number): Pt[] {
  const c = Math.cos(ang);
  const s = Math.sin(ang);
  return pts.map(([x, y]) => [cx + (x - cx) * c - (y - cy) * s, cy + (x - cx) * s + (y - cy) * c] as Pt);
}

/** elliptical arc as a 1px ink doodle stroke (a0..a1 radians) */
export function inkArc(r: Raster, cx: number, cy: number, rx: number, ry: number, a0: number, a1: number, rotA = 0, p?: Paint): void {
  const n = Math.max(8, Math.ceil(Math.abs(a1 - a0) * Math.max(rx, ry) * 0.8));
  const pts: Pt[] = [];
  const c = Math.cos(rotA);
  const s = Math.sin(rotA);
  for (let i = 0; i <= n; i++) {
    const t = a0 + ((a1 - a0) * i) / n;
    const ux = Math.cos(t) * rx;
    const uy = Math.sin(t) * ry;
    pts.push([cx + ux * c - uy * s, cy + ux * s + uy * c]);
  }
  r.strokePath(0, pts, p);
}

/** Puffy circle-cluster cumulus with a flat-ish bottom and little ink curls. */
export function puffyCloud(ctx: SceneCtx, id: number, cx: number, cy: number, w: number, h: number, curls = true): void {
  const r = ctx.r;
  const rng = ctx.rng;
  const bottom = cy + h / 2;
  const n = Math.max(3, Math.round(w / 15));
  // base slab
  r.ellipse(id, cx, bottom - h * 0.2, w / 2, h * 0.22);
  const circles: Array<[number, number, number]> = [];
  for (let i = 0; i < n; i++) {
    const t = n === 1 ? 0.5 : i / (n - 1);
    const bell = Math.sin(Math.PI * (0.12 + 0.76 * t));
    const rad = h * (0.26 + 0.3 * bell) * (0.92 + rng.next() * 0.16);
    const x = cx - w / 2 + rad * 0.7 + t * (w - rad * 1.4);
    const y = bottom - rad - h * 0.04 - (i % 2 ? 0 : h * 0.06);
    circles.push([x, y, rad]);
    r.disc(id, x, y, rad);
  }
  if (curls) {
    // little storybook swirl lines inside the biggest puffs
    const sorted = [...circles].sort((a, b) => b[2] - a[2]);
    for (let k = 0; k < Math.min(2, sorted.length); k++) {
      const c = sorted[k] as [number, number, number];
      inkArc(r, c[0] - c[2] * 0.1, c[1] + c[2] * 0.1, c[2] * 0.55, c[2] * 0.5, Math.PI * 1.05, Math.PI * 1.95, 0, { only: [id] });
    }
  }
}

export interface PlanetOpts {
  tilt?: number;
  coreId?: number;
  ringId?: number;
  ringW?: number; // outer rx multiplier of planet radius
  ringH?: number; // outer ry multiplier
  bands?: boolean;
}

/** Ringed planet: back ring half, core, front ring half; ring split by an ink Cassini line. */
export function ringedPlanet(ctx: SceneCtx, cx: number, cy: number, rad: number, o: PlanetOpts = {}): { rx: number; ry: number; tilt: number } {
  const r = ctx.r;
  const tilt = o.tilt ?? -0.28;
  const coreId = o.coreId ?? 12;
  const ringId = o.ringId ?? 13;
  const rx = rad * (o.ringW ?? 2.05);
  const ry = rad * (o.ringH ?? 0.62);
  const kin = 0.66;
  const c = Math.cos(tilt);
  const s = Math.sin(tilt);
  const m = Math.max(rx, ry) + 1;
  const ringTest = (back: boolean) => (x: number, y: number): boolean => {
    const dx = x - cx;
    const dy = y - cy;
    const u = (dx * c + dy * s) / rx;
    const v = (-dx * s + dy * c) / ry;
    const k = u * u + v * v;
    if (k > 1 || k < kin * kin) return false;
    return back ? v < 0 : v >= 0;
  };
  r.shape(ringId, cx - m, cy - m, cx + m, cy + m, ringTest(true));
  r.disc(coreId, cx, cy, rad);
  r.shape(ringId, cx - m, cy - m, cx + m, cy + m, ringTest(false));
  // Cassini division: ink ellipse between the two ring bands (ring pixels only)
  const kmid = (1 + kin) / 2;
  inkArc(r, cx, cy, rx * kmid, ry * kmid, 0, Math.PI * 2, tilt, { only: [ringId] });
  if (o.bands !== false) {
    // curved latitude bands on the planet face, clipped to the planet
    for (const off of [-0.42, -0.12, 0.22]) {
      const pts: Pt[] = [];
      for (let i = 0; i <= 28; i++) {
        const t = -1 + (2 * i) / 28;
        const bx = cx + t * rad * 1.05;
        const by = cy + off * rad + Math.cos(t * 1.4) * rad * 0.1;
        pts.push([bx, by]);
      }
      r.strokePath(0, rot(pts, cx, cy, tilt), { only: [coreId] });
    }
  }
  return { rx, ry, tilt };
}

/** n-point star polygon region. */
export function star(ctx: SceneCtx, id: number, cx: number, cy: number, R: number, o: { points?: number; inner?: number; rot?: number } = {}): void {
  const n = o.points ?? 5;
  const inner = (o.inner ?? 0.5) * R;
  const a0 = o.rot ?? -Math.PI / 2;
  const pts: Pt[] = [];
  for (let i = 0; i < n * 2; i++) {
    const rr = i % 2 === 0 ? R : inner;
    const a = a0 + (i * Math.PI) / n;
    pts.push([cx + Math.cos(a) * rr, cy + Math.sin(a) * rr]);
  }
  ctx.r.poly(id, pts);
}

/** four-point twinkle */
export function twinkle(ctx: SceneCtx, id: number, cx: number, cy: number, R: number): void {
  star(ctx, id, cx, cy, R, { points: 4, inner: 0.32, rot: -Math.PI / 2 });
}

/** crescent moon region */
export function crescent(ctx: SceneCtx, id: number, cx: number, cy: number, R: number, ang = -0.5, p?: Paint): void {
  const ox = cx + Math.cos(ang) * R * 0.5;
  const oy = cy + Math.sin(ang) * R * 0.5;
  const r2 = R * 0.84;
  ctx.r.shape(id, cx - R, cy - R, cx + R, cy + R, (x, y) => {
    const a = (x - cx) * (x - cx) + (y - cy) * (y - cy) <= R * R;
    const b = (x - ox) * (x - ox) + (y - oy) * (y - oy) <= r2 * r2;
    return a && !b;
  }, p);
}

/** hex crystal shard polygon (pointed both ends) */
function shard(cx: number, cy: number, w: number, h: number, ang: number): Pt[] {
  const pts: Pt[] = [
    [cx, cy - h * 0.55],
    [cx + w * 0.5, cy - h * 0.3],
    [cx + w * 0.5, cy + h * 0.3],
    [cx, cy + h * 0.5],
    [cx - w * 0.5, cy + h * 0.3],
    [cx - w * 0.5, cy - h * 0.3],
  ];
  return rot(pts, cx, cy, ang);
}

/** Crystal asteroid cluster (single region id) with faceted ink lines. */
export function crystalAsteroid(ctx: SceneCtx, id: number, cx: number, cy: number, s: number, tilt = 0): void {
  const r = ctx.r;
  const rng = ctx.rng;
  // rocky base
  const base: Pt[] = [];
  const nb = 9;
  for (let i = 0; i < nb; i++) {
    const a = (i / nb) * Math.PI * 2 + 0.3;
    const rr = s * (0.62 + rng.next() * 0.2);
    base.push([cx + Math.cos(a) * rr * 1.15, cy + s * 0.28 + Math.sin(a) * rr * 0.5]);
  }
  r.poly(id, base);
  const mainA = tilt;
  r.poly(id, shard(cx, cy - s * 0.1, s * 0.62, s * 1.6, mainA));
  r.poly(id, shard(cx - s * 0.62, cy + s * 0.12, s * 0.42, s * 1.0, mainA - 0.5));
  r.poly(id, shard(cx + s * 0.62, cy + s * 0.1, s * 0.4, s * 1.05, mainA + 0.55));
  // facet lines on the main shard
  const top: Pt = rot([[cx, cy - s * 0.1 - s * 0.88]], cx, cy - s * 0.1, mainA)[0] as Pt;
  const b1: Pt = rot([[cx, cy - s * 0.1 + s * 0.8]], cx, cy - s * 0.1, mainA)[0] as Pt;
  r.line(0, top[0], top[1] + 2, b1[0], b1[1] - 4, { only: [id] });
  const l1 = rot([[cx - s * 0.31, cy - s * 0.1 - s * 0.48]], cx, cy - s * 0.1, mainA)[0] as Pt;
  const l2 = rot([[cx + s * 0.31, cy - s * 0.1 - s * 0.48]], cx, cy - s * 0.1, mainA)[0] as Pt;
  r.line(0, l1[0], l1[1], l2[0], l2[1], { only: [id] });
  const m = rot([[cx, cy - s * 0.1 - s * 0.48]], cx, cy - s * 0.1, mainA)[0] as Pt;
  r.line(0, m[0], m[1], top[0], top[1] + 2, { only: [id] });
}

/** Bubble-tea pearl with an ink glint. */
export function pearl(ctx: SceneCtx, id: number, cx: number, cy: number, rad: number): void {
  ctx.r.disc(id, cx, cy, rad);
  ctx.r.dot(0, cx - rad * 0.35, cy - rad * 0.35, { only: [id] });
  ctx.r.dot(0, cx - rad * 0.35 + 1, cy - rad * 0.35, { only: [id] });
}

/** heart polygon-ish region */
export function heart(ctx: SceneCtx, id: number, cx: number, cy: number, s: number): void {
  ctx.r.shape(id, cx - s * 1.2, cy - s * 1.2, cx + s * 1.2, cy + s * 1.3, (x, y) => {
    const u = (x - cx) / s;
    const v = -(y - cy) / s;
    const a = u * u + v * v - 1;
    return a * a * a - u * u * v * v * v <= 0;
  });
}

/** Folded-paper rocket (body = id, fins & window separate regions). */
export function paperRocket(ctx: SceneCtx, id: number, finId: number, windowId: number, cx: number, cy: number, s: number, tilt = 0): void {
  const r = ctx.r;
  const body: Pt[] = [
    [cx, cy - s * 1.0],
    [cx + s * 0.28, cy - s * 0.55],
    [cx + s * 0.34, cy + s * 0.35],
    [cx + s * 0.22, cy + s * 0.62],
    [cx - s * 0.22, cy + s * 0.62],
    [cx - s * 0.34, cy + s * 0.35],
    [cx - s * 0.28, cy - s * 0.55],
  ];
  const finL: Pt[] = [[cx - s * 0.3, cy + s * 0.1], [cx - s * 0.66, cy + s * 0.78], [cx - s * 0.2, cy + s * 0.56]];
  const finR: Pt[] = [[cx + s * 0.3, cy + s * 0.1], [cx + s * 0.66, cy + s * 0.78], [cx + s * 0.2, cy + s * 0.56]];
  r.poly(finId, rot(finL, cx, cy, tilt));
  r.poly(finId, rot(finR, cx, cy, tilt));
  r.poly(id, rot(body, cx, cy, tilt));
  const wc = rot([[cx, cy - s * 0.18]], cx, cy, tilt)[0] as Pt;
  r.disc(windowId, wc[0], wc[1], s * 0.17);
  // paper fold creases
  const c1 = rot([[cx, cy - s * 0.95], [cx, cy - s * 0.4]], cx, cy, tilt);
  r.line(0, (c1[0] as Pt)[0], (c1[0] as Pt)[1] + 2, (c1[1] as Pt)[0], (c1[1] as Pt)[1], { only: [id] });
  const c2 = rot([[cx - s * 0.3, cy + s * 0.42], [cx + s * 0.3, cy + s * 0.42]], cx, cy, tilt);
  r.line(0, (c2[0] as Pt)[0], (c2[0] as Pt)[1], (c2[1] as Pt)[0], (c2[1] as Pt)[1], { only: [id] });
}

/** Milkshake: glass body (id), cream dome, straw, cherry, foot. Returns ids used. */
export function milkshake(ctx: SceneCtx, id: number, cx: number, baseY: number, w: number, h: number): { cream: number; straw: number; cherry: number; foot: number } {
  const r = ctx.r;
  const cream = ctx.dyn('milkshake', 'Whipped Cream');
  const straw = ctx.dyn('milkshake', 'Striped Straw');
  const cherry = ctx.dyn('milkshake', 'Cherry');
  const foot = ctx.dyn('milkshake', 'Glass Foot');
  const topY = baseY - h;
  // straw (behind cream)
  r.poly(straw, [[cx + w * 0.1, topY - h * 0.35], [cx + w * 0.1 + 4, topY - h * 0.35], [cx + w * 0.1 - 6, topY + h * 0.5], [cx + w * 0.1 - 10, topY + h * 0.5]]);
  // foot + stem
  r.ellipse(foot, cx, baseY - 2, w * 0.28, 3.5);
  // glass body (tapered)
  r.poly(id, [[cx - w / 2, topY], [cx + w / 2, topY], [cx + w * 0.32, baseY - 6], [cx - w * 0.32, baseY - 6]]);
  // swirl bands drawn as ink
  r.line(0, cx - w * 0.44, topY + h * 0.28, cx + w * 0.44, topY + h * 0.4, { only: [id] });
  r.line(0, cx - w * 0.38, topY + h * 0.6, cx + w * 0.38, topY + h * 0.7, { only: [id] });
  // cream dome
  r.ellipse(cream, cx, topY - 2, w * 0.54, h * 0.17);
  r.ellipse(cream, cx, topY - h * 0.2, w * 0.38, h * 0.13);
  r.ellipse(cream, cx, topY - h * 0.34, w * 0.2, h * 0.1);
  r.disc(cherry, cx - w * 0.06, topY - h * 0.47, Math.max(5, w * 0.1));
  return { cream, straw, cherry, foot };
}

/** swaying cosmic grass tuft: several leaning blades (one region id per tuft) */
export function grassTuft(ctx: SceneCtx, id: number, x: number, baseY: number, h: number, lean: number): void {
  const r = ctx.r;
  const blades = 5;
  for (let i = 0; i < blades; i++) {
    const t = i / (blades - 1) - 0.5;
    const bh = h * (0.7 + 0.3 * (1 - Math.abs(t) * 1.6));
    const bx = x + t * h * 0.7;
    const tipx = bx + lean * bh * 0.45 + t * h * 0.35;
    r.poly(id, [[bx - 2.4, baseY], [bx + 2.4, baseY], [tipx + 0.5, baseY - bh]]);
  }
}

/** jittered integer helper for seeded variation */
export function jit(rng: Rng, v: number, amt: number): number {
  return v + (rng.next() * 2 - 1) * amt;
}
