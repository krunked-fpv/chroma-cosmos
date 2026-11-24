/**
 * Shared organic storybook drawing helpers for scenes-a (milkshakeNebula, asteroidGarden, cheetahSavannah).
 * Pure + deterministic: driven exclusively by ctx.rng.
 */
import type { SceneCtx } from './context';
import { inkArc, rot } from './props';
import { H, SKY, W, type Paint, type Pt, type Raster } from './raster';

/** Sample a cubic Bezier curve into n+1 points. */
export function cubicPts(p0: Pt, p1: Pt, p2: Pt, p3: Pt, n = 24): Pt[] {
  const out: Pt[] = [];
  for (let i = 0; i <= n; i++) {
    const t = i / n;
    const u = 1 - t;
    const x = u * u * u * p0[0] + 3 * u * u * t * p1[0] + 3 * u * t * t * p2[0] + t * t * t * p3[0];
    const y = u * u * u * p0[1] + 3 * u * u * t * p1[1] + 3 * u * t * t * p2[1] + t * t * t * p3[1];
    out.push([x, y]);
  }
  return out;
}

/** Sample a quadratic Bezier curve into n+1 points. */
export function quadPts(p0: Pt, p1: Pt, p2: Pt, n = 20): Pt[] {
  const out: Pt[] = [];
  for (let i = 0; i <= n; i++) {
    const t = i / n;
    const u = 1 - t;
    const x = u * u * p0[0] + 2 * u * t * p1[0] + t * t * p2[0];
    const y = u * u * p0[1] + 2 * u * t * p1[1] + t * t * p2[1];
    out.push([x, y]);
  }
  return out;
}

/** Paint a smooth variable-width ribbon along a polyline of points using overlapping capsules. */
export function paintRibbon(r: Raster, id: number, pts: readonly Pt[], radiusAt: (t: number) => number, p?: Paint): void {
  const n = pts.length;
  if (n < 2) return;
  for (let i = 0; i < n - 1; i++) {
    const a = pts[i] as Pt;
    const b = pts[i + 1] as Pt;
    const t = (i + 0.5) / (n - 1);
    r.capsule(id, a[0], a[1], b[0], b[1], radiusAt(t), p);
  }
}

/** Fill a pixel-exact smooth vertical band between topFn(x) and botFn(x) over [x0, x1]. */
export function fillBand(
  r: Raster,
  id: number,
  x0: number,
  x1: number,
  minY: number,
  maxY: number,
  topFn: (x: number) => number,
  botFn: (x: number) => number,
  p?: Paint,
): void {
  r.shape(id, x0, minY, x1, maxY, (x, y) => y >= topFn(x) && y <= botFn(x), p);
}

/** Draw a tiny 4-point hand-inked sparkle inside a region. */
export function inkSparkle(r: Raster, cx: number, cy: number, rad: number, onlyId: number): void {
  const o: Paint = { only: [onlyId] };
  r.line(0, cx - rad, cy, cx + rad, cy, o);
  r.line(0, cx, cy - rad, cx, cy + rad, o);
}

/** Draw a curved ink highlight/swirl line along a sampled path, clipped to onlyId. */
export function inkPolyline(r: Raster, pts: readonly Pt[], onlyId: number): void {
  r.strokePath(0, pts, { only: [onlyId] });
}

/** Organic rounded storybook boulder (multi-lobed silhouette, never a bare ellipse). */
export function smoothBoulder(ctx: SceneCtx, id: number, cx: number, cy: number, rx: number, ry: number, tilt = 0): void {
  const r = ctx.r;
  const rng = ctx.rng;
  const pts: Pt[] = [];
  const n = 12;
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2;
    const flatBot = Math.sin(a) > 0.35 ? 0.84 : 1.0;
    const bump = 0.9 + rng.next() * 0.16 + Math.cos(a * 3) * 0.05;
    pts.push([cx + Math.cos(a) * rx * bump, cy + Math.sin(a) * ry * bump * flatBot]);
  }
  r.poly(id, rot(pts, cx, cy, tilt));
  inkArc(r, cx - rx * 0.12, cy - ry * 0.12, rx * 0.56, ry * 0.44, Math.PI * 1.08, Math.PI * 1.82, tilt, { only: [id] });
}

/** Rounded tilted candy sprinkle with a subtle sugar-glaze stripe. */
export function candySprinkle(ctx: SceneCtx, id: number, cx: number, cy: number, len: number, rad: number, ang: number): void {
  const dx = Math.cos(ang) * (len * 0.5);
  const dy = Math.sin(ang) * (len * 0.5);
  ctx.r.capsule(id, cx - dx, cy - dy, cx + dx, cy + dy, rad);
  const nx = -Math.sin(ang) * (rad * 0.42);
  const ny = Math.cos(ang) * (rad * 0.42);
  ctx.r.line(0, cx - dx * 0.42 + nx, cy - dy * 0.42 + ny, cx + dx * 0.42 + nx, cy + dy * 0.42 + ny, { only: [id] });
}

/** Constellation star-dots & subtle dashed thread inside a ghost silhouette. */
function constellationWeb(r: Raster, id: number, nodes: readonly Pt[]): void {
  const o: Paint = { only: [id] };
  for (let i = 0; i + 1 < nodes.length; i++) {
    const a = nodes[i] as Pt;
    const b = nodes[i + 1] as Pt;
    const mx0 = a[0] + (b[0] - a[0]) * 0.28;
    const my0 = a[1] + (b[1] - a[1]) * 0.28;
    const mx1 = a[0] + (b[0] - a[0]) * 0.72;
    const my1 = a[1] + (b[1] - a[1]) * 0.72;
    r.line(0, mx0, my0, mx1, my1, o);
  }
  for (const [x, y] of nodes) {
    r.dot(0, x, y, o);
  }
}

/** Hidden constellation creature: cosmic jellyfish ghost (drawn on SKY only). */
export function ghostJellyfish(ctx: SceneCtx, label: string, cx: number, cy: number, s = 1): number {
  const id = ctx.ghost(label);
  const r = ctx.r;
  const p: Paint = { only: [SKY] };
  // soft scalloped bell dome
  r.shape(
    id,
    cx - 13 * s,
    cy - 11 * s,
    cx + 13 * s,
    cy + 3 * s,
    (x, y) => {
      const u = (x - cx) / (11.5 * s);
      const v = (y - (cy + 1 * s)) / (10.5 * s);
      const wave = Math.sin(u * Math.PI * 2.5) * 1.2 * s;
      return u * u + v * v <= 1 && y <= cy + 2.2 * s + wave;
    },
    p,
  );
  // curved trailing tentacles
  const t1 = quadPts([cx - 6 * s, cy + 1 * s], [cx - 9 * s, cy + 7 * s], [cx - 6 * s, cy + 12 * s], 8);
  const t2 = quadPts([cx, cy + 1 * s], [cx + 2.5 * s, cy + 7 * s], [cx - 0.5 * s, cy + 13.5 * s], 8);
  const t3 = quadPts([cx + 6 * s, cy + 1 * s], [cx + 9 * s, cy + 6.5 * s], [cx + 6.5 * s, cy + 11.5 * s], 8);
  paintRibbon(r, id, t1, () => 2.2 * s, p);
  paintRibbon(r, id, t2, () => 2.3 * s, p);
  paintRibbon(r, id, t3, () => 2.2 * s, p);
  constellationWeb(r, id, [
    [cx - 5 * s, cy - 3 * s],
    [cx, cy - 6.5 * s],
    [cx + 5 * s, cy - 3 * s],
    [cx, cy + 4 * s],
  ]);
  return id;
}

/** Hidden constellation creature: curled sleeping star-kitten ghost (drawn on SKY only). */
export function ghostKitten(ctx: SceneCtx, label: string, cx: number, cy: number, s = 1): number {
  const id = ctx.ghost(label);
  const r = ctx.r;
  const p: Paint = { only: [SKY] };
  r.ellipse(id, cx + 1.5 * s, cy + 2.5 * s, 10.5 * s, 6.8 * s, -0.08, p);
  r.disc(id, cx - 6.5 * s, cy - 1 * s, 6.2 * s, p);
  r.poly(
    id,
    [
      [cx - 11.5 * s, cy - 3 * s],
      [cx - 10.5 * s, cy - 10.8 * s],
      [cx - 6.8 * s, cy - 6 * s],
    ],
    p,
  );
  r.poly(
    id,
    [
      [cx - 6.2 * s, cy - 6 * s],
      [cx - 2.6 * s, cy - 10.2 * s],
      [cx - 1.8 * s, cy - 3.2 * s],
    ],
    p,
  );
  // graceful curled tail arc
  const tail = quadPts([cx + 8.5 * s, cy + 4 * s], [cx + 15 * s, cy + 1 * s], [cx + 11.5 * s, cy - 4.5 * s], 8);
  paintRibbon(r, id, tail, () => 2.3 * s, p);
  constellationWeb(r, id, [
    [cx - 6 * s, cy - 1 * s],
    [cx + 1.5 * s, cy + 2.5 * s],
    [cx + 8 * s, cy + 2.5 * s],
  ]);
  return id;
}

/** Hidden constellation creature: swooping star-bird ghost (drawn on SKY only). */
export function ghostBird(ctx: SceneCtx, label: string, cx: number, cy: number, s = 1, flip = false): number {
  const id = ctx.ghost(label);
  const r = ctx.r;
  const dir = flip ? -1 : 1;
  const p: Paint = { only: [SKY] };
  r.ellipse(id, cx, cy + 1 * s, 10 * s, 5.2 * s, -0.18 * dir, p);
  r.disc(id, cx + 8 * dir * s, cy - 2 * s, 4.6 * s, p);
  r.poly(
    id,
    [
      [cx + 11 * dir * s, cy - 3 * s],
      [cx + 15.8 * dir * s, cy - 1 * s],
      [cx + 10.5 * dir * s, cy + 0.5 * s],
    ],
    p,
  );
  r.poly(
    id,
    [
      [cx - 2 * dir * s, cy - 1 * s],
      [cx - 7 * dir * s, cy - 11.8 * s],
      [cx + 3 * dir * s, cy - 6.5 * s],
      [cx + 4 * dir * s, cy + 0.5 * s],
    ],
    p,
  );
  r.poly(
    id,
    [
      [cx - 7 * dir * s, cy + 1 * s],
      [cx - 15 * dir * s, cy + 5.5 * s],
      [cx - 12 * dir * s, cy - 1.5 * s],
    ],
    p,
  );
  constellationWeb(r, id, [
    [cx - 8 * dir * s, cy + 1 * s],
    [cx - 2 * dir * s, cy - 5 * s],
    [cx + 1 * dir * s, cy + 1 * s],
    [cx + 7 * dir * s, cy - 2 * s],
  ]);
  return id;
}

/** Hidden constellation creature: perched star-owl ghost (drawn on SKY only). */
export function ghostOwl(ctx: SceneCtx, label: string, cx: number, cy: number, s = 1): number {
  const id = ctx.ghost(label);
  const r = ctx.r;
  const p: Paint = { only: [SKY] };
  r.ellipse(id, cx, cy + 2 * s, 9 * s, 10.5 * s, 0, p);
  r.poly(
    id,
    [
      [cx - 7.5 * s, cy - 5 * s],
      [cx - 8.5 * s, cy - 11.5 * s],
      [cx - 3 * s, cy - 7.5 * s],
    ],
    p,
  );
  r.poly(
    id,
    [
      [cx + 7.5 * s, cy - 5 * s],
      [cx + 8.5 * s, cy - 11.5 * s],
      [cx + 3 * s, cy - 7.5 * s],
    ],
    p,
  );
  r.ellipse(id, cx - 9 * s, cy + 2 * s, 3.2 * s, 6.5 * s, 0.25, p);
  r.ellipse(id, cx + 9 * s, cy + 2 * s, 3.2 * s, 6.5 * s, -0.25, p);
  r.dot(0, cx - 3 * s, cy - 3 * s, { only: [id] });
  r.dot(0, cx + 3 * s, cy - 3 * s, { only: [id] });
  constellationWeb(r, id, [
    [cx - 4 * s, cy + 1 * s],
    [cx, cy + 5 * s],
    [cx + 4 * s, cy + 1 * s],
  ]);
  return id;
}

/** Hidden constellation creature: cosmic luna-moth ghost with notched butterfly wings (drawn on SKY only). */
export function ghostMoth(ctx: SceneCtx, label: string, cx: number, cy: number, s = 1, tilt = 0): number {
  const id = ctx.ghost(label);
  const r = ctx.r;
  const p: Paint = { only: [SKY] };
  const wingL: Pt[] = [
    [cx - 1.5 * s, cy - 3 * s],
    [cx - 12.5 * s, cy - 10.5 * s],
    [cx - 14.5 * s, cy - 2 * s],
    [cx - 6.5 * s, cy + 1.2 * s],
    [cx - 11.5 * s, cy + 8.5 * s],
    [cx - 4.5 * s, cy + 9.5 * s],
    [cx - 1.5 * s, cy + 3.5 * s],
  ];
  const wingR: Pt[] = wingL.map(([x, y]) => [2 * cx - x, y] as Pt);
  r.poly(id, rot(wingL, cx, cy, tilt), p);
  r.poly(id, rot(wingR, cx, cy, tilt), p);
  const topB = rot([[cx, cy - 6.5 * s]], cx, cy, tilt)[0] as Pt;
  const botB = rot([[cx, cy + 7.5 * s]], cx, cy, tilt)[0] as Pt;
  r.capsule(id, topB[0], topB[1], botB[0], botB[1], 2.4 * s, p);
  const nodes = rot(
    [
      [cx - 8.5 * s, cy - 4 * s],
      [cx, cy],
      [cx + 8.5 * s, cy - 4 * s],
    ],
    cx,
    cy,
    tilt,
  );
  constellationWeb(r, id, nodes);
  return id;
}

/** Hidden constellation creature: leaping star-cub ghost (drawn on SKY only). */
export function ghostStarCub(ctx: SceneCtx, label: string, cx: number, cy: number, s = 1): number {
  const id = ctx.ghost(label);
  const r = ctx.r;
  const p: Paint = { only: [SKY] };
  r.ellipse(id, cx, cy, 11 * s, 5.2 * s, -0.22, p);
  r.disc(id, cx + 10 * s, cy - 4 * s, 5 * s, p);
  r.disc(id, cx + 8 * s, cy - 8.5 * s, 2.3 * s, p);
  r.disc(id, cx + 12.2 * s, cy - 7.8 * s, 2.2 * s, p);
  r.capsule(id, cx + 7 * s, cy + 1 * s, cx + 14.5 * s, cy + 5.5 * s, 2.2 * s, p);
  r.capsule(id, cx - 8 * s, cy + 2 * s, cx - 15 * s, cy + 7.5 * s, 2.3 * s, p);
  r.capsule(id, cx - 10 * s, cy - 1 * s, cx - 16 * s, cy - 6.5 * s, 2.1 * s, p);
  constellationWeb(r, id, [
    [cx - 8 * s, cy + 1 * s],
    [cx, cy - 1 * s],
    [cx + 9 * s, cy - 4 * s],
  ]);
  return id;
}

/** Charming floating asteroid-garden island: asymmetric craggy rock spire underside + lush scalloped mossy top cap. */
export function floatingIsland(
  ctx: SceneCtx,
  rockId: number,
  mossId: number,
  cx: number,
  topY: number,
  w: number,
  h: number,
  peakBias = 0,
): void {
  const r = ctx.r;
  const rng = ctx.rng;
  const half = w / 2;
  const pts: Pt[] = [
    [cx - half * 0.94, topY + 2],
    [cx + half * 0.94, topY + 2],
  ];
  const steps = 10;
  for (let i = 0; i <= steps; i++) {
    const t = i / steps; // 0 right -> 1 left
    const x = cx + half * 0.92 * (1 - 2 * t);
    const shifted = Math.max(0, Math.min(1, t + peakBias * 0.16 * Math.sin(Math.PI * t)));
    const bell = Math.sin(Math.PI * shifted);
    const crag = (i % 2 === 0 ? 1.04 : 0.82) + (rng.next() - 0.5) * 0.1;
    const y = topY + 7 + h * (0.14 + 0.88 * Math.pow(bell, 0.92)) * crag;
    pts.push([x, y]);
  }
  r.poly(rockId, pts);
  // organic faceted rock strata strokes
  const s1 = quadPts([cx - half * 0.56, topY + h * 0.34], [cx - peakBias * 8, topY + h * 0.5], [cx + half * 0.52, topY + h * 0.32], 14);
  const s2 = quadPts([cx - half * 0.28, topY + h * 0.64], [cx - peakBias * 10, topY + h * 0.76], [cx + half * 0.24, topY + h * 0.6], 10);
  inkPolyline(r, s1, rockId);
  inkPolyline(r, s2, rockId);

  // Lush gently domed mossy garden cap draped softly over the top
  r.shape(mossId, cx - half - 2, topY - 12, cx + half + 2, topY + 18, (x, y) => {
    const u = (x - cx) / half;
    if (Math.abs(u) > 1) return false;
    const dome = Math.sqrt(Math.max(0, 1 - u * u));
    const top = topY - dome * 8;
    const scallop = Math.sin((u + 1) * Math.PI * 3.5) * 2.5;
    const bot = topY + 4.5 + dome * 6.5 + scallop * dome;
    return y >= top && y <= bot;
  });
  // tiny curved grass tufts etched into the moss
  for (let i = -2; i <= 2; i++) {
    const gx = cx + i * (w * 0.16);
    const gy = topY + 1;
    r.line(0, gx, gy + 2, gx + (i % 2 ? 2.5 : -2), gy - 2, { only: [mossId] });
  }
}

/** Glowing storybook mushroom with graceful curved bell cap, gill rim, and asymmetric polka-dots. */
export function glowMushroom(ctx: SceneCtx, id: number, cx: number, baseY: number, capW: number, h: number, lean = 0): void {
  const r = ctx.r;
  const topY = baseY - h;
  const capX = cx + lean * h * 0.38;
  // gently curving tapered stalk with cozy flared base
  const stalkPts = quadPts([cx, baseY], [cx + lean * h * 0.08, baseY - h * 0.48], [capX, topY + h * 0.26], 12);
  paintRibbon(r, id, stalkPts, (t) => Math.max(3.4, capW * (0.22 - 0.07 * t)));
  r.ellipse(id, cx, baseY - 1.5, capW * 0.24, 3.2);
  // softly domed storybook parasol cap (curved underside, no flat cutoff)
  const rx = capW * 0.54;
  const ry = h * 0.46;
  r.shape(id, capX - rx - 2, topY - ry - 2, capX + rx + 2, topY + ry * 0.55 + 2, (x, y) => {
    const u = (x - capX) / rx;
    if (Math.abs(u) > 1) return false;
    const dome = Math.sqrt(Math.max(0, 1 - u * u));
    const upper = topY + ry * 0.18 - ry * dome;
    const lower = topY + ry * 0.24 + ry * 0.18 * (1 - u * u) - Math.sin(u * Math.PI * 2) * 0.8;
    return y >= upper && y <= lower;
  });
  // graceful gill rim separating cap and stalk
  inkArc(r, capX, topY + ry * 0.24, rx * 0.84, ry * 0.18, 0.18, Math.PI - 0.18, 0, { only: [id] });
  // asymmetric storybook spots (varied sizes and heights so they read as toadstool spots, not eyes)
  inkArc(r, capX - rx * 0.34, topY - ry * 0.28, 2.7, 2.1, 0, Math.PI * 2, -0.2, { only: [id] });
  inkArc(r, capX + rx * 0.28, topY - ry * 0.06, 2.0, 1.6, 0, Math.PI * 2, 0.2, { only: [id] });
  r.dot(0, capX + rx * 0.04, topY - ry * 0.54, { only: [id] });
}

/** Graceful curving crystal lotus bloom with drooping leaves and cupped star-flower petals. */
export function crystalBloom(ctx: SceneCtx, id: number, baseX: number, baseY: number, h: number, tilt = 0): void {
  const r = ctx.r;
  const dir = tilt >= 0 ? 1 : -1;
  const headX = baseX + Math.sin(tilt) * h * 0.72;
  const headY = baseY - h;
  // graceful S-curving stem
  const stem = cubicPts(
    [baseX, baseY],
    [baseX - dir * 4, baseY - h * 0.38],
    [headX - dir * 5, headY + h * 0.32],
    [headX, headY + 4],
    14,
  );
  paintRibbon(r, id, stem, (t) => 2.8 - t * 0.5);
  // two gracefully arched, staggered leaves (not symmetrical flat ovals)
  const leafA = stem[4] as Pt;
  const leafB = stem[7] as Pt;
  r.ellipse(id, leafA[0] - 6.5, leafA[1] + 1.5, 7.2, 3.0, -0.52);
  r.ellipse(id, leafB[0] + 6.2, leafB[1] + 1.0, 6.6, 2.8, 0.46);
  // cupped 5-petal crystal lotus blossom
  const ang = tilt * 0.65;
  const petals: Array<[number, number, number, number, number]> = [
    [-8.5, -3.5, 6.2, 3.2, -0.82],
    [8.5, -3.5, 6.2, 3.2, 0.82],
    [-4.8, -7.2, 5.8, 3.4, -0.35],
    [4.8, -7.2, 5.8, 3.4, 0.35],
    [0, -9.2, 4.2, 6.8, 0],
  ];
  for (const [ox, oy, rx, ry, pa] of petals) {
    const pt = rot([[headX + ox, headY + oy]], headX, headY, ang)[0] as Pt;
    r.ellipse(id, pt[0], pt[1], rx, ry, ang + pa);
  }
  r.disc(id, headX, headY - 1, 5.2);
  // delicate ink petal veins & glowing center dot
  const v0 = rot([[headX, headY - 11], [headX, headY - 3]], headX, headY, ang);
  const vL = rot([[headX - 8, headY - 5], [headX - 2, headY - 1]], headX, headY, ang);
  const vR = rot([[headX + 8, headY - 5], [headX + 2, headY - 1]], headX, headY, ang);
  r.line(0, (v0[0] as Pt)[0], (v0[0] as Pt)[1], (v0[1] as Pt)[0], (v0[1] as Pt)[1], { only: [id] });
  r.line(0, (vL[0] as Pt)[0], (vL[0] as Pt)[1], (vL[1] as Pt)[0], (vL[1] as Pt)[1], { only: [id] });
  r.line(0, (vR[0] as Pt)[0], (vR[0] as Pt)[1], (vR[1] as Pt)[0], (vR[1] as Pt)[1], { only: [id] });
  inkArc(r, headX, headY - 1.5, 2.2, 2.2, 0, Math.PI * 2, 0, { only: [id] });
}

/** Graceful swaying hanging garden vine with drooping teardrop leaves and bud tip. */
export function trailingVine(ctx: SceneCtx, id: number, x0: number, y0: number, len: number, sway: number): void {
  const r = ctx.r;
  const pts = cubicPts(
    [x0, y0],
    [x0 + sway * 1.25, y0 + len * 0.32],
    [x0 - sway * 1.05, y0 + len * 0.68],
    [x0 + sway * 0.55, y0 + len],
    20,
  );
  paintRibbon(r, id, pts, (t) => 2.7 - t * 0.55);
  const leafIdx = [4, 9, 14, 18];
  leafIdx.forEach((idx, k) => {
    const pt = pts[idx] as Pt;
    const side = k % 2 === 0 ? -1 : 1;
    const lx = pt[0] + side * 5.6;
    const ly = pt[1] + 2.2;
    r.ellipse(id, lx, ly, 5.6, 3.1, side * 0.68);
    r.line(0, pt[0] + side * 2, pt[1] + 0.5, lx + side * 2.5, ly + 1.8, { only: [id] });
  });
  const tip = pts[pts.length - 1] as Pt;
  r.disc(id, tip[0], tip[1] + 2.5, 3.6);
  r.dot(0, tip[0] - 0.5, tip[1] + 1.5, { only: [id] });
}

/** Keep a value clamped safely within page bounds. */
export function clampX(x: number, margin = 8): number {
  return Math.max(margin, Math.min(W - margin, x));
}
export function clampY(y: number, margin = 8): number {
  return Math.max(margin, Math.min(H - margin, y));
}
