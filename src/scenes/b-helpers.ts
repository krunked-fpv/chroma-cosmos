/** Shared procedural storybook drawing helpers for saturnRings, bubbleTea, and whaleSea. Pure + deterministic. */
import type { Paint, Pt } from './raster';
import { SKY } from './raster';
import type { SceneCtx } from './context';
import { inkArc, rot } from './props';

/** Rounded rectangle region (optionally rotated around its centre). */
export function roundedRect(
  ctx: SceneCtx,
  id: number,
  cx: number,
  cy: number,
  w: number,
  h: number,
  rad: number,
  angle = 0,
  p?: Paint,
): void {
  const hw = w / 2;
  const hh = h / 2;
  const r = Math.min(rad, hw, hh);
  const c = Math.cos(angle);
  const s = Math.sin(angle);
  const bound = Math.hypot(hw, hh) + 1;
  ctx.r.shape(
    id,
    cx - bound,
    cy - bound,
    cx + bound,
    cy + bound,
    (x, y) => {
      const dx = x - cx;
      const dy = y - cy;
      const u = Math.abs(dx * c + dy * s);
      const v = Math.abs(-dx * s + dy * c);
      if (u > hw || v > hh) return false;
      const ix = hw - r;
      const iy = hh - r;
      if (u <= ix || v <= iy) return true;
      const qx = u - ix;
      const qy = v - iy;
      return qx * qx + qy * qy <= r * r;
    },
    p,
  );
}

/** Full-span undulating wave band between topFn(x) and botFn(x) over [x0, x1]. */
export function waveRibbon(
  ctx: SceneCtx,
  id: number,
  x0: number,
  x1: number,
  topFn: (x: number) => number,
  botFn: (x: number) => number,
  opts: { lines?: number; paint?: Paint } = {},
): void {
  let minY = Infinity;
  let maxY = -Infinity;
  const ax = Math.max(0, Math.floor(x0));
  const bx = Math.min(ctx.r.w - 1, Math.ceil(x1));
  for (let x = ax; x <= bx; x += 2) {
    const t = topFn(x + 0.5);
    const b = botFn(x + 0.5);
    if (t < minY) minY = t;
    if (b > maxY) maxY = b;
  }
  ctx.r.shape(
    id,
    x0,
    minY - 1,
    x1,
    maxY + 1,
    (x, y) => {
      if (x < x0 || x > x1) return false;
      const t = topFn(x);
      const b = botFn(x);
      return y >= t && y <= b;
    },
    opts.paint,
  );
  const lines = opts.lines ?? 0;
  for (let k = 1; k <= lines; k++) {
    const f = k / (lines + 1);
    const pts: Pt[] = [];
    const steps = Math.max(14, Math.round((x1 - x0) / 8));
    for (let i = 0; i <= steps; i++) {
      const x = x0 + ((x1 - x0) * i) / steps;
      const t = topFn(x);
      const b = botFn(x);
      if (b - t > 5) pts.push([x, t + (b - t) * f]);
    }
    if (pts.length >= 2) ctx.r.strokePath(0, pts, { only: [id] });
  }
}

/** Graceful flowing ribbon along centerY(x) that tapers smoothly to silky tips at x0 and x1. */
export function taperedRibbon(
  ctx: SceneCtx,
  id: number,
  x0: number,
  x1: number,
  centerY: (x: number) => number,
  maxHalfThick: number,
  opts: { line?: boolean; paint?: Paint } = {},
): void {
  const span = Math.max(1, x1 - x0);
  const halfAt = (x: number): number => {
    const t = (x - x0) / span;
    if (t <= 0 || t >= 1) return 0;
    return maxHalfThick * Math.pow(Math.sin(Math.PI * t), 0.72);
  };
  let minY = Infinity;
  let maxY = -Infinity;
  for (let x = Math.floor(x0); x <= Math.ceil(x1); x += 2) {
    const cy = centerY(x + 0.5);
    if (cy - maxHalfThick < minY) minY = cy - maxHalfThick;
    if (cy + maxHalfThick > maxY) maxY = cy + maxHalfThick;
  }
  ctx.r.shape(
    id,
    x0,
    minY - 1,
    x1,
    maxY + 1,
    (x, y) => {
      if (x < x0 || x > x1) return false;
      const h = halfAt(x);
      if (h < 1.2) return false;
      return Math.abs(y - centerY(x)) <= h;
    },
    opts.paint,
  );
  if (opts.line !== false) {
    const pts: Pt[] = [];
    const steps = Math.max(12, Math.round(span / 6));
    for (let i = 1; i < steps; i++) {
      const t = i / steps;
      if (t < 0.12 || t > 0.88) continue;
      const x = x0 + span * t;
      pts.push([x, centerY(x)]);
    }
    if (pts.length >= 2) ctx.r.strokePath(0, pts, { only: [id] });
  }
}

/** Dramatic multi-spire faceted quartz crystal cluster with sharp peaks and crisp light-facet ink lines. */
export function crystalCluster(ctx: SceneCtx, id: number, cx: number, cy: number, s: number, tilt = 0): void {
  const prism = (ox: number, oy: number, w: number, h: number, ang: number): Pt[] => {
    const raw: Pt[] = [
      [ox, oy - h * 0.68],
      [ox + w * 0.5, oy - h * 0.2],
      [ox + w * 0.42, oy + h * 0.42],
      [ox, oy + h * 0.5],
      [ox - w * 0.42, oy + h * 0.42],
      [ox - w * 0.5, oy - h * 0.2],
    ];
    return rot(rot(raw, ox, oy, ang), cx, cy, tilt);
  };
  // Tall slender main needle + asymmetric flanking crystal spikes
  ctx.r.poly(id, prism(cx - s * 0.42, cy + s * 0.2, s * 0.44, s * 1.12, -0.48));
  ctx.r.poly(id, prism(cx + s * 0.44, cy + s * 0.24, s * 0.4, s * 0.96, 0.52));
  ctx.r.poly(id, prism(cx + s * 0.04, cy - s * 0.12, s * 0.54, s * 1.72, -0.04));

  // Crisp quartz facet ridge down the main spire & angled crown bevel
  const peak = rot([[cx + s * 0.02, cy - s * 1.18]], cx, cy, tilt)[0] as Pt;
  const bevel = rot([[cx + s * 0.02, cy - s * 0.48]], cx, cy, tilt)[0] as Pt;
  const foot = rot([[cx + s * 0.06, cy + s * 0.58]], cx, cy, tilt)[0] as Pt;
  const leftShoulder = rot([[cx - s * 0.22, cy - s * 0.42]], cx, cy, tilt)[0] as Pt;
  const rightShoulder = rot([[cx + s * 0.28, cy - s * 0.44]], cx, cy, tilt)[0] as Pt;
  ctx.r.line(0, peak[0], peak[1] + 2, bevel[0], bevel[1], { only: [id] });
  ctx.r.line(0, bevel[0], bevel[1], foot[0], foot[1], { only: [id] });
  ctx.r.line(0, leftShoulder[0], leftShoulder[1], bevel[0], bevel[1], { only: [id] });
  ctx.r.line(0, bevel[0], bevel[1], rightShoulder[0], rightShoulder[1], { only: [id] });
}

/** Cute cratered mini-moon (single region with ink craters). */
export function miniMoon(ctx: SceneCtx, id: number, cx: number, cy: number, rad: number): void {
  ctx.r.disc(id, cx, cy, rad);
  if (rad >= 8) {
    inkArc(ctx.r, cx - rad * 0.32, cy - rad * 0.18, rad * 0.24, rad * 0.22, 0, Math.PI * 2, 0, { only: [id] });
    inkArc(ctx.r, cx + rad * 0.28, cy + rad * 0.24, rad * 0.18, rad * 0.16, 0, Math.PI * 2, 0, { only: [id] });
  }
  if (rad >= 12) {
    inkArc(ctx.r, cx + rad * 0.16, cy - rad * 0.42, rad * 0.13, rad * 0.12, 0, Math.PI * 2, 0, { only: [id] });
  }
}

/** Small 1px ink sparkle cross on sky only (never cuts colourable regions). */
export function skySparkle(ctx: SceneCtx, x: number, y: number, arm = 2): void {
  const only = [SKY];
  ctx.r.dot(0, x, y, { only });
  for (let d = 1; d <= arm; d++) {
    ctx.r.dot(0, x - d, y, { only });
    ctx.r.dot(0, x + d, y, { only });
    ctx.r.dot(0, x, y - d, { only });
    ctx.r.dot(0, x, y + d, { only });
  }
}

/** Dotted/solid 1px ink constellation connector drawn ONLY on sky pixels between points. */
export function skyConstellationLine(ctx: SceneCtx, pts: readonly Pt[], dashed = false): void {
  const only = [SKY];
  for (let i = 0; i + 1 < pts.length; i++) {
    const a = pts[i] as Pt;
    const b = pts[i + 1] as Pt;
    if (!dashed) {
      ctx.r.line(0, a[0], a[1], b[0], b[1], { only });
    } else {
      const dist = Math.hypot(b[0] - a[0], b[1] - a[1]);
      const steps = Math.max(4, Math.round(dist));
      for (let k = 0; k <= steps; k++) {
        if (k % 3 === 2) continue;
        const t = k / steps;
        ctx.r.dot(0, a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, { only });
      }
    }
  }
}

/** Draw tiny constellation ink nodes & linking segments inside a ghost creature region. */
function ghostWeb(ctx: SceneCtx, id: number, nodes: readonly Pt[], edges: readonly [number, number][]): void {
  for (const [a, b] of edges) {
    const pa = nodes[a];
    const pb = nodes[b];
    if (pa && pb) ctx.r.line(0, pa[0], pa[1], pb[0], pb[1], { only: [id] });
  }
  for (const [x, y] of nodes) {
    ctx.r.dot(0, x, y, { only: [id] });
    ctx.r.dot(0, x + 1, y, { only: [id] });
  }
}

/** Ghost constellation creature: Swallowtail Moon-Moth with delicate wings & eyespots (~280-380 px). */
export function ghostMoonMoth(ctx: SceneCtx, id: number, cx: number, cy: number, s = 14): void {
  const only = [SKY];
  // Sweeping upper forewings (pointed outer tips)
  ctx.r.poly(
    id,
    [
      [cx - s * 0.12, cy - s * 0.14],
      [cx - s * 0.85, cy - s * 0.72],
      [cx - s * 1.12, cy - s * 0.34],
      [cx - s * 0.94, cy + s * 0.08],
      [cx - s * 0.14, cy + s * 0.08],
    ],
    { only },
  );
  ctx.r.poly(
    id,
    [
      [cx + s * 0.12, cy - s * 0.14],
      [cx + s * 0.85, cy - s * 0.72],
      [cx + s * 1.12, cy - s * 0.34],
      [cx + s * 0.94, cy + s * 0.08],
      [cx + s * 0.14, cy + s * 0.08],
    ],
    { only },
  );
  // Lower hindwings with luna-moth swallowtail tips
  ctx.r.ellipse(id, cx - s * 0.44, cy + s * 0.34, s * 0.38, s * 0.34, 0.25, { only });
  ctx.r.ellipse(id, cx + s * 0.44, cy + s * 0.34, s * 0.38, s * 0.34, -0.25, { only });
  ctx.r.capsule(id, cx - s * 0.56, cy + s * 0.52, cx - s * 0.72, cy + s * 0.86, s * 0.11, { only });
  ctx.r.capsule(id, cx + s * 0.56, cy + s * 0.52, cx + s * 0.72, cy + s * 0.86, s * 0.11, { only });
  // Moth thorax & head
  ctx.r.ellipse(id, cx, cy + s * 0.04, s * 0.18, s * 0.48, 0, { only });
  // Tiny curled sky antennae in ink
  ctx.r.line(0, cx - 2, cy - s * 0.42, cx - s * 0.34, cy - s * 0.74, { only: [SKY] });
  ctx.r.line(0, cx + 2, cy - s * 0.42, cx + s * 0.34, cy - s * 0.74, { only: [SKY] });

  const nodes: Pt[] = [
    [cx, cy - s * 0.12],
    [cx - s * 0.68, cy - s * 0.26],
    [cx + s * 0.68, cy - s * 0.26],
    [cx - s * 0.4, cy + s * 0.34],
    [cx + s * 0.4, cy + s * 0.34],
  ];
  ghostWeb(ctx, id, nodes, [
    [0, 1],
    [0, 2],
    [0, 3],
    [0, 4],
  ]);
}

/** Ghost constellation creature: Leaping Celestial Star-Fox with clear muzzle, tall ears, legs & bushy tail (~300-420 px). */
export function ghostStarFox(ctx: SceneCtx, id: number, cx: number, cy: number, s = 15, flip = 1): void {
  const only = [SKY];
  const f = flip;
  // Sleek arched torso
  ctx.r.ellipse(id, cx, cy + s * 0.04, s * 0.72, s * 0.36, -0.14 * f, { only });
  // Front & back leaping legs
  ctx.r.capsule(id, cx + f * s * 0.44, cy + s * 0.18, cx + f * s * 0.86, cy + s * 0.68, s * 0.14, { only });
  ctx.r.capsule(id, cx - f * s * 0.42, cy + s * 0.22, cx - f * s * 0.78, cy + s * 0.74, s * 0.14, { only });
  // Head + pointed fox snout
  ctx.r.disc(id, cx + f * s * 0.68, cy - s * 0.24, s * 0.36, { only });
  ctx.r.poly(
    id,
    [
      [cx + f * s * 0.8, cy - s * 0.36],
      [cx + f * s * 1.28, cy - s * 0.14],
      [cx + f * s * 0.78, cy - s * 0.04],
    ],
    { only },
  );
  // Tall pointed fox ears
  ctx.r.poly(
    id,
    [
      [cx + f * s * 0.44, cy - s * 0.44],
      [cx + f * s * 0.5, cy - s * 0.98],
      [cx + f * s * 0.78, cy - s * 0.52],
    ],
    { only },
  );
  ctx.r.poly(
    id,
    [
      [cx + f * s * 0.68, cy - s * 0.48],
      [cx + f * s * 0.86, cy - s * 0.94],
      [cx + f * s * 0.96, cy - s * 0.42],
    ],
    { only },
  );
  // Plume bushy tail sweeping high behind
  ctx.r.ellipse(id, cx - f * s * 0.92, cy - s * 0.16, s * 0.64, s * 0.3, 0.52 * f, { only });
  ctx.r.disc(id, cx - f * s * 1.32, cy - s * 0.42, s * 0.22, { only });

  const nodes: Pt[] = [
    [cx + f * s * 0.72, cy - s * 0.22],
    [cx + f * s * 0.16, cy + s * 0.02],
    [cx - f * s * 0.42, cy + s * 0.08],
    [cx - f * s * 0.96, cy - s * 0.18],
  ];
  ghostWeb(ctx, id, nodes, [
    [0, 1],
    [1, 2],
    [2, 3],
  ]);
}

/** Ghost constellation creature: Adorable Star-Owl with clear round eyes, beak, ear tufts & perched wings (~260-360 px). */
export function ghostStarOwl(ctx: SceneCtx, id: number, cx: number, cy: number, s = 14): void {
  const only = [SKY];
  // Plump oval body
  ctx.r.ellipse(id, cx, cy + s * 0.22, s * 0.58, s * 0.66, 0, { only });
  // Spread owl wings with clear silhouette shoulder
  ctx.r.poly(
    id,
    [
      [cx - s * 0.42, cy - s * 0.08],
      [cx - s * 1.04, cy + s * 0.24],
      [cx - s * 0.84, cy + s * 0.62],
      [cx - s * 0.36, cy + s * 0.54],
    ],
    { only },
  );
  ctx.r.poly(
    id,
    [
      [cx + s * 0.42, cy - s * 0.08],
      [cx + s * 1.04, cy + s * 0.24],
      [cx + s * 0.84, cy + s * 0.62],
      [cx + s * 0.36, cy + s * 0.54],
    ],
    { only },
  );
  // Round head + tall ear tufts
  ctx.r.disc(id, cx, cy - s * 0.38, s * 0.44, { only });
  ctx.r.poly(
    id,
    [
      [cx - s * 0.42, cy - s * 0.54],
      [cx - s * 0.54, cy - s * 0.96],
      [cx - s * 0.14, cy - s * 0.7],
    ],
    { only },
  );
  ctx.r.poly(
    id,
    [
      [cx + s * 0.42, cy - s * 0.54],
      [cx + s * 0.54, cy - s * 0.96],
      [cx + s * 0.14, cy - s * 0.7],
    ],
    { only },
  );
  // Cute owl eyes + tiny beak + belly star constellation
  inkArc(ctx.r, cx - s * 0.18, cy - s * 0.42, 2.2, 2.2, 0, Math.PI * 2, 0, { only: [id] });
  inkArc(ctx.r, cx + s * 0.18, cy - s * 0.42, 2.2, 2.2, 0, Math.PI * 2, 0, { only: [id] });
  ctx.r.dot(0, cx, cy - s * 0.28, { only: [id] });
  ctx.r.dot(0, cx, cy - s * 0.22, { only: [id] });
  const nodes: Pt[] = [
    [cx - s * 0.66, cy + s * 0.26],
    [cx, cy + s * 0.14],
    [cx + s * 0.66, cy + s * 0.26],
    [cx, cy + s * 0.56],
  ];
  ghostWeb(ctx, id, nodes, [
    [0, 1],
    [1, 2],
    [1, 3],
  ]);
}

/** Ghost constellation creature: Graceful Moon-Jellyfish with wavy curving tentacles (~300-420 px). */
export function ghostJellyfish(ctx: SceneCtx, id: number, cx: number, cy: number, s = 15): void {
  const only = [SKY];
  // Domed translucent umbrella bell
  ctx.r.shape(
    id,
    cx - s,
    cy - s,
    cx + s,
    cy + s * 0.25,
    (x, y) => {
      const dx = (x - cx) / (s * 0.92);
      const dy = (y - (cy - s * 0.02)) / (s * 0.72);
      if (dy > 0.2) return false;
      return dx * dx + dy * dy <= 1;
    },
    { only },
  );
  // Scalloped bell rim
  ctx.r.disc(id, cx - s * 0.56, cy + s * 0.12, s * 0.24, { only });
  ctx.r.disc(id, cx, cy + s * 0.16, s * 0.26, { only });
  ctx.r.disc(id, cx + s * 0.56, cy + s * 0.12, s * 0.24, { only });
  // Three clearly separated, gently flared trailing tentacles
  ctx.r.capsule(id, cx - s * 0.56, cy + s * 0.22, cx - s * 0.72, cy + s * 0.94, s * 0.13, { only });
  ctx.r.capsule(id, cx, cy + s * 0.26, cx + s * 0.06, cy + s * 1.12, s * 0.14, { only });
  ctx.r.capsule(id, cx + s * 0.56, cy + s * 0.22, cx + s * 0.7, cy + s * 0.92, s * 0.13, { only });

  const nodes: Pt[] = [
    [cx, cy - s * 0.44],
    [cx - s * 0.46, cy - s * 0.1],
    [cx + s * 0.46, cy - s * 0.1],
    [cx, cy + s * 0.12],
  ];
  ghostWeb(ctx, id, nodes, [
    [0, 1],
    [0, 2],
    [1, 3],
    [2, 3],
  ]);
}

/** Ghost constellation creature: Unmistakable Gliding Star-Turtle with long front flippers & domed shell (~340-460 px). */
export function ghostSeaTurtle(ctx: SceneCtx, id: number, cx: number, cy: number, s = 15, flip = 1): void {
  const only = [SKY];
  const f = flip;
  // Clean oval shell
  ctx.r.ellipse(id, cx, cy, s * 0.84, s * 0.56, -0.06 * f, { only });
  // Distinct neck + rounded head
  ctx.r.capsule(id, cx + f * s * 0.68, cy - s * 0.04, cx + f * s * 1.12, cy - s * 0.12, s * 0.2, { only });
  ctx.r.disc(id, cx + f * s * 1.2, cy - s * 0.14, s * 0.28, { only });
  // Long graceful sweeping sea-turtle front flippers
  ctx.r.capsule(id, cx + f * s * 0.34, cy - s * 0.42, cx + f * s * 0.08, cy - s * 1.06, s * 0.18, { only });
  ctx.r.capsule(id, cx + f * s * 0.3, cy + s * 0.42, cx + f * s * 0.02, cy + s * 1.06, s * 0.18, { only });
  // Rear flippers + tiny tail
  ctx.r.capsule(id, cx - f * s * 0.58, cy - s * 0.34, cx - f * s * 0.96, cy - s * 0.62, s * 0.14, { only });
  ctx.r.capsule(id, cx - f * s * 0.58, cy + s * 0.34, cx - f * s * 0.96, cy + s * 0.62, s * 0.14, { only });
  ctx.r.capsule(id, cx - f * s * 0.78, cy, cx - f * s * 1.06, cy + s * 0.04, s * 0.1, { only });

  const nodes: Pt[] = [
    [cx - f * s * 0.34, cy],
    [cx, cy - s * 0.26],
    [cx + f * s * 0.36, cy],
    [cx, cy + s * 0.26],
    [cx + f * s * 1.18, cy - s * 0.14],
  ];
  ghostWeb(ctx, id, nodes, [
    [0, 1],
    [1, 2],
    [2, 3],
    [3, 0],
    [2, 4],
  ]);
}

/** Ghost constellation creature: Plump 5-arm Starfish (~280-380 px). */
export function ghostStarfish(ctx: SceneCtx, id: number, cx: number, cy: number, s = 16): void {
  const only = [SKY];
  ctx.r.disc(id, cx, cy, s * 0.42, { only });
  const nodes: Pt[] = [[cx, cy]];
  for (let i = 0; i < 5; i++) {
    const a = -Math.PI / 2 + (i * Math.PI * 2) / 5;
    const tx = cx + Math.cos(a) * s * 0.88;
    const ty = cy + Math.sin(a) * s * 0.88;
    ctx.r.capsule(id, cx, cy, tx, ty, s * 0.22, { only });
    nodes.push([cx + Math.cos(a) * s * 0.56, cy + Math.sin(a) * s * 0.56]);
  }
  ghostWeb(ctx, id, nodes, [
    [0, 1],
    [0, 2],
    [0, 3],
    [0, 4],
    [0, 5],
  ]);
}

/** Ghost constellation creature: Leaping Star-Dolphin with dorsal fin & forked fluke (~300-420 px). */
export function ghostStarDolphin(ctx: SceneCtx, id: number, cx: number, cy: number, s = 15, flip = 1): void {
  const only = [SKY];
  const f = flip;
  // Arched dolphin body
  ctx.r.ellipse(id, cx, cy, s * 0.96, s * 0.42, -0.22 * f, { only });
  // Beaked snout
  ctx.r.ellipse(id, cx + f * s * 0.96, cy - s * 0.1, s * 0.36, s * 0.16, 0.14 * f, { only });
  // Swept dorsal fin
  ctx.r.poly(
    id,
    [
      [cx - f * s * 0.16, cy - s * 0.3],
      [cx - f * s * 0.38, cy - s * 0.88],
      [cx + f * s * 0.22, cy - s * 0.34],
    ],
    { only },
  );
  // Forked fluke tail
  ctx.r.ellipse(id, cx - f * s * 0.96, cy + s * 0.26, s * 0.4, s * 0.18, -0.55 * f, { only });
  ctx.r.ellipse(id, cx - f * s * 0.84, cy + s * 0.54, s * 0.36, s * 0.16, 0.48 * f, { only });
  const nodes: Pt[] = [
    [cx + f * s * 0.58, cy - s * 0.1],
    [cx + f * s * 0.04, cy - s * 0.06],
    [cx - f * s * 0.52, cy + s * 0.14],
  ];
  ghostWeb(ctx, id, nodes, [
    [0, 1],
    [1, 2],
  ]);
}
