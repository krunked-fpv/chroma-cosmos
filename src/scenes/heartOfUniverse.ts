/**
 * Chapter 5 (Finale): "The Heart of the Universe"
 * Panoramic double-dense polar mandala (50..70 colourable regions) radiating from a
 * glowing cosmic heart core, framed by smooth sweeping mirrored galaxy arms, ringed
 * planet (12/13), fluffy base clouds (14/15), 3 hidden UV constellation ghosts (234..236),
 * and Violet, Lumi & Nova gazing up along the lower stardust arc.
 */
import type { SceneCtx } from './context';
import { crescent, heart, inkArc, jit, puffyCloud, ringedPlanet, rot, star, twinkle } from './props';
import type { Pt, Raster } from './raster';

/** Polar point helper around (cx, cy). */
function pol(cx: number, cy: number, r: number, a: number, sx = 1, sy = 1): Pt {
  return [cx + Math.cos(a) * r * sx, cy + Math.sin(a) * r * sy];
}

/** Sample a cubic Bezier curve into n+1 smooth points. */
function cubicBezier(p0: Pt, p1: Pt, p2: Pt, p3: Pt, n: number): Pt[] {
  const pts: Pt[] = [];
  for (let i = 0; i <= n; i++) {
    const t = i / n;
    const u = 1 - t;
    const uu = u * u;
    const tt = t * t;
    const x = uu * u * p0[0] + 3 * uu * t * p1[0] + 3 * u * tt * p2[0] + tt * t * p3[0];
    const y = uu * u * p0[1] + 3 * uu * t * p1[1] + 3 * u * tt * p2[1] + tt * t * p3[1];
    pts.push([x, y]);
  }
  return pts;
}

/** Build a smooth teardrop / lotus petal polygon in polar coordinates. */
function lotusPetalPts(
  cx: number,
  cy: number,
  aMid: number,
  r0: number,
  r1: number,
  halfAng: number,
  bulge = 0.56,
  sx = 1,
  sy = 1,
): Pt[] {
  const pts: Pt[] = [];
  const steps = 8;
  pts.push(pol(cx, cy, r0, aMid, sx, sy));
  for (let i = 1; i <= steps; i++) {
    const t = i / (steps + 1);
    const r = r0 + (r1 - r0) * t;
    const w = Math.sin(Math.pow(t, bulge) * Math.PI) * halfAng;
    pts.push(pol(cx, cy, r, aMid - w, sx, sy));
  }
  pts.push(pol(cx, cy, r1, aMid, sx, sy));
  for (let i = steps; i >= 1; i--) {
    const t = i / (steps + 1);
    const r = r0 + (r1 - r0) * t;
    const w = Math.sin(Math.pow(t, bulge) * Math.PI) * halfAng;
    pts.push(pol(cx, cy, r, aMid + w, sx, sy));
  }
  return pts;
}

/** Build a faceted kaleidoscope diamond wedge in polar coordinates. */
function diamondWedgePts(cx: number, cy: number, aMid: number, r0: number, rMid: number, r1: number, halfAng: number, sx = 1, sy = 1): Pt[] {
  return [
    pol(cx, cy, r0, aMid, sx, sy),
    pol(cx, cy, rMid, aMid - halfAng, sx, sy),
    pol(cx, cy, r1, aMid, sx, sy),
    pol(cx, cy, rMid, aMid + halfAng, sx, sy),
  ];
}

/** Draw a smooth sweeping tapered galaxy ribbon along a sampled spline with an inner ink vein. */
function drawSmoothRibbon(r: Raster, id: number, spine: readonly Pt[], widthFn: (t: number) => number, vein = true): void {
  const top: Pt[] = [];
  const bot: Pt[] = [];
  const n = spine.length;
  for (let i = 0; i < n; i++) {
    const p = spine[i] as Pt;
    const prev = spine[Math.max(0, i - 1)] as Pt;
    const next = spine[Math.min(n - 1, i + 1)] as Pt;
    const tx = next[0] - prev[0];
    const ty = next[1] - prev[1];
    const len = Math.hypot(tx, ty) || 1;
    const nx = -ty / len;
    const ny = tx / len;
    const w = widthFn(i / (n - 1));
    top.push([p[0] + nx * w, p[1] + ny * w]);
    bot.push([p[0] - nx * w, p[1] - ny * w]);
  }
  bot.reverse();
  r.poly(id, [...top, ...bot]);
  if (vein) {
    // Keep vein slightly inset from tips so it looks delicate and storybook-inked
    r.strokePath(0, spine.slice(1, Math.max(2, n - 1)), { only: [id] });
  }
}

/** Draw a graceful sweeping crescent-wing flourish cradling the side orbit medallion. */
function drawGalaxyWing(r: Raster, id: number, cx: number, cy: number, side: 1 | -1): void {
  const upper = cubicBezier(
    [cx + side * 80, cy - 22],
    [cx + side * 110, cy - 34],
    [cx + side * 138, cy - 22],
    [cx + side * 150, cy - 4],
    10,
  );
  const innerCurve = cubicBezier(
    [cx + side * 150, cy - 4],
    [cx + side * 126, cy + 8],
    [cx + side * 124, cy + 24],
    [cx + side * 144, cy + 36],
    10,
  );
  const lower = cubicBezier(
    [cx + side * 144, cy + 36],
    [cx + side * 118, cy + 44],
    [cx + side * 96, cy + 36],
    [cx + side * 80, cy + 22],
    10,
  );
  r.poly(id, [...upper, ...innerCurve.slice(1), ...lower.slice(1)]);
  // Delicate sweeping plume lines inside the wing
  const plume1 = cubicBezier(
    [cx + side * 88, cy - 6],
    [cx + side * 108, cy - 12],
    [cx + side * 122, cy - 8],
    [cx + side * 136, cy - 2],
    8,
  );
  const plume2 = cubicBezier(
    [cx + side * 88, cy + 12],
    [cx + side * 106, cy + 20],
    [cx + side * 118, cy + 24],
    [cx + side * 132, cy + 30],
    8,
  );
  r.strokePath(0, plume1, { only: [id] });
  r.strokePath(0, plume2, { only: [id] });
}

/** Draw a delicate 1px ink sparkle cross in empty sky. */
function skySparkle(r: Raster, x: number, y: number, arm: number): void {
  const rx = Math.round(x);
  const ry = Math.round(y);
  r.line(0, rx - arm, ry, rx + arm, ry, { only: [255] });
  r.line(0, rx, ry - arm, rx, ry + arm, { only: [255] });
}

/** Ghost constellation creature: dreamy star-fox/kitten silhouette. */
function drawGhostFox(r: Raster, id: number, cx: number, cy: number): void {
  r.ellipse(id, cx - 5, cy - 2, 6.5, 5.5);
  r.poly(id, [[cx - 10, cy - 4], [cx - 9, cy - 11], [cx - 5, cy - 7]]);
  r.poly(id, [[cx - 4, cy - 7], [cx, cy - 11], [cx, cy - 4]]);
  r.ellipse(id, cx + 4, cy + 2.5, 8.5, 5.5, -0.18);
  r.ellipse(id, cx + 11, cy - 2, 5.5, 3.8, -0.55);
  r.dot(0, cx - 7, cy - 2, { only: [id] });
  r.dot(0, cx - 3, cy - 2, { only: [id] });
  r.line(0, cx - 2, cy + 2, cx + 8, cy + 1, { only: [id] });
}

/** Ghost constellation creature: cosmic butterfly. */
function drawGhostButterfly(r: Raster, id: number, cx: number, cy: number): void {
  r.ellipse(id, cx - 7.5, cy - 3.5, 7.5, 5.5, -0.35);
  r.ellipse(id, cx + 7.5, cy - 3.5, 7.5, 5.5, 0.35);
  r.ellipse(id, cx - 5.5, cy + 4.5, 5.5, 4.5, 0.35);
  r.ellipse(id, cx + 5.5, cy + 4.5, 5.5, 4.5, -0.35);
  r.ellipse(id, cx, cy, 2.8, 7.5);
  r.line(0, cx - 9, cy - 3.5, cx - 4, cy - 1, { only: [id] });
  r.line(0, cx + 9, cy - 3.5, cx + 4, cy - 1, { only: [id] });
}

/** Ghost constellation creature: floating star-jelly. */
function drawGhostJelly(r: Raster, id: number, cx: number, cy: number): void {
  r.ellipse(id, cx, cy - 3, 9.5, 6.5);
  r.poly(id, [[cx - 7.5, cy + 1], [cx - 4.5, cy + 11], [cx - 2, cy + 2]]);
  r.poly(id, [[cx - 2, cy + 2], [cx, cy + 13], [cx + 2, cy + 2]]);
  r.poly(id, [[cx + 2, cy + 2], [cx + 4.5, cy + 11], [cx + 7.5, cy + 1]]);
  inkArc(r, cx, cy - 3, 5.5, 3, Math.PI * 1.1, Math.PI * 1.9, 0, { only: [id] });
}

export function buildHeartOfUniverse(ctx: SceneCtx): void {
  const r = ctx.r;
  const rng = ctx.rng;
  ctx.title = 'The Heart of the Universe';
  ctx.sky = { top: '#130b33', bottom: '#3a1d6b', mist: '#7c53ad' };

  const cx = 240;
  const cy = 112;
  ctx.focal = { x: cx, y: cy };

  // Subtle seeded shimmer while preserving clean panoramic balance
  const twist = rng.range(-0.035, 0.035);
  const armLift = rng.range(-2.5, 2.5);

  // =========================================================================
  // 1) PANORAMIC MIRRORED GALAXY ARMS (smooth Bezier ribbons + wings -> 8 regions)
  // =========================================================================
  for (const side of [-1, 1] as const) {
    const labelSide = side < 0 ? 'West' : 'East';

    // Upper sweeping spiral arm: smooth inner ribbon flowing from upper mandala
    const upInner = ctx.dyn('prop', `${labelSide} Aurora Arm`);
    const upInnerSpine = cubicBezier(
      [cx + side * 62, cy - 50],
      [cx + side * 96, cy - 78 + armLift],
      [cx + side * 144, cy - 82 + armLift],
      [cx + side * 182, cy - 64],
      16,
    );
    drawSmoothRibbon(r, upInner, upInnerSpine, (t) => 7.5 + Math.sin(t * Math.PI) * 3.0);

    // Outer curling galaxy plume curving gracefully around the side orbit medallion to a pointed tip
    const upOuter = ctx.dyn('prop', `${labelSide} Spiral Plume`);
    const upOuterSpine = cubicBezier(
      [cx + side * 176, cy - 66],
      [cx + side * 214, cy - 52],
      [cx + side * 230, cy - 16],
      [cx + side * 214, cy + 20],
      18,
    );
    drawSmoothRibbon(r, upOuter, upOuterSpine, (t) => 8.4 * Math.pow(1 - t, 0.72) + Math.sin(t * Math.PI) * 2.0);

    // Mid curved lotus-wing cradling the side medallion (1 region per side)
    const midWing = ctx.dyn('flora', `${labelSide} Galaxy Wing`);
    drawGalaxyWing(r, midWing, cx, cy, side);

    // Lower sweeping stardust tail flowing in a graceful tapered S-curve toward the side clouds
    const lowTail = ctx.dyn('prop', `${labelSide} Stardust Tail`);
    const lowTailSpine = cubicBezier(
      [cx + side * 72, cy + 44],
      [cx + side * 114, cy + 64],
      [cx + side * 154, cy + 68 - armLift],
      [cx + side * 196, cy + 48],
      18,
    );
    drawSmoothRibbon(r, lowTail, lowTailSpine, (t) => 8.8 * Math.pow(1 - t, 0.72) + Math.sin(t * Math.PI) * 2.0);
  }

  // =========================================================================
  // 2) CENTRAL LOWER STARDUST GAZING ARC (gracefully tapered crescent terrace -> 1 region)
  // =========================================================================
  const gazingArc = ctx.dyn('prop', 'Stardust Gazing Terrace');
  const arcTop: Pt[] = [];
  const arcBot: Pt[] = [];
  for (let i = 0; i <= 24; i++) {
    const t = i / 24;
    const x = 80 + t * 320;
    const arch = Math.sin(t * Math.PI);
    const thick = 3 + 13 * Math.pow(arch, 0.55);
    const midY = 240 - arch * 5;
    arcTop.push([x, midY - thick * 0.52]);
    arcBot.push([x, midY + thick * 0.62]);
  }
  arcBot.reverse();
  r.poly(gazingArc, [...arcTop, ...arcBot]);
  // Delicate quilted starlight curve along terrace
  const terraceLine = cubicBezier([112, 238], [186, 232], [294, 232], [368, 238], 14);
  r.strokePath(0, terraceLine, { only: [gazingArc] });

  // =========================================================================
  // 3) CONCENTRIC POLAR MANDALA RINGS (back-to-front -> 12 + 8 + 8 + 1 = 29 regions)
  // =========================================================================
  const sx = 1.12;
  const sy = 0.96;

  // Ring 3 (Outer): 12 grand scalloped lotus petals
  const outerN = 12;
  for (let i = 0; i < outerN; i++) {
    const a = -Math.PI / 2 + (i * Math.PI * 2) / outerN + twist;
    const pid = ctx.dyn('flora', `Outer Lotus Petal ${i + 1}`);
    const pts = lotusPetalPts(cx, cy, a, 52, 87, 0.255, 0.54, sx, sy);
    r.poly(pid, pts);
    const pA = pol(cx, cy, 58, a, sx, sy);
    const pB = pol(cx, cy, 78, a, sx, sy);
    r.line(0, pA[0], pA[1], pB[0], pB[1], { only: [pid] });
    // Tiny chevron ornament near petal tip
    const pC = pol(cx, cy, 71, a - 0.08, sx, sy);
    const pD = pol(cx, cy, 75, a, sx, sy);
    const pE = pol(cx, cy, 71, a + 0.08, sx, sy);
    r.strokePath(0, [pC, pD, pE], { only: [pid] });
  }

  // Ring 2 (Middle): 8 kaleidoscope sunburst diamond wedges
  const midN = 8;
  for (let i = 0; i < midN; i++) {
    const a = -Math.PI / 2 + ((i + 0.5) * Math.PI * 2) / midN + twist;
    const did = ctx.dyn('star', `Sunburst Wedge ${i + 1}`);
    const pts = diamondWedgePts(cx, cy, a, 32, 48, 65, 0.34, sx, sy);
    r.poly(did, pts);
    const inner = pol(cx, cy, 36, a, sx, sy);
    const tip = pol(cx, cy, 60, a, sx, sy);
    const fl = pol(cx, cy, 48, a - 0.24, sx, sy);
    const fr = pol(cx, cy, 48, a + 0.24, sx, sy);
    r.line(0, inner[0], inner[1], tip[0], tip[1], { only: [did] });
    r.line(0, fl[0], fl[1], fr[0], fr[1], { only: [did] });
  }

  // Ring 1 (Inner): 8 glowing inner lotus petals
  const innerN = 8;
  for (let i = 0; i < innerN; i++) {
    const a = -Math.PI / 2 + (i * Math.PI * 2) / innerN + twist;
    const iid = ctx.dyn('flora', `Inner Heart Petal ${i + 1}`);
    const pts = lotusPetalPts(cx, cy, a, 15, 42, 0.35, 0.58, sx, sy);
    r.poly(iid, pts);
    const pA = pol(cx, cy, 22, a, sx, sy);
    const pB = pol(cx, cy, 36, a, sx, sy);
    r.line(0, pA[0], pA[1], pB[0], pB[1], { only: [iid] });
  }

  // Center Core: The Cosmic Heart!
  const coreId = ctx.dyn('star', 'Cosmic Heart Core');
  heart(ctx, coreId, cx, cy + 2, 15.5);
  // Smooth inner highlight arc on left lobe of the heart
  inkArc(r, cx - 5.5, cy - 3.5, 4.5, 3.8, Math.PI * 1.05, Math.PI * 1.72, -0.2, { only: [coreId] });

  // =========================================================================
  // 4) TOP CELESTIAL CROWN & INNER WING LANTERNS (4 regions)
  // =========================================================================
  const crownCrescent = ctx.dyn('star', 'Celestial Crown Arc');
  crescent(ctx, crownCrescent, cx, 19, 13, -Math.PI / 2);

  const crownStar = ctx.dyn('star', 'Zenith Star');
  star(ctx, crownStar, cx, 14, 9.5, { points: 5, inner: 0.48 });

  // Two mirrored inner-wing star lanterns nestled cleanly beneath the upper aurora arms
  for (const side of [-1, 1] as const) {
    const labelSide = side < 0 ? 'West' : 'East';
    const lantern = ctx.dyn('star', `${labelSide} Star Lantern`);
    const lx = cx + side * 112;
    const ly = cy - 48 + jit(rng, 0, 1.5);
    twinkle(ctx, lantern, lx, ly, 12);
    r.dot(0, lx, ly, { only: [lantern] });
  }

  // =========================================================================
  // 5) SIDE ORBITS: RINGED PLANET (12/13), MIRRORED MOON MEDALLION, ORBITING GEMS (8 regions)
  // =========================================================================
  // Left side orbit: REQUIRED canonical Ringed Planet (12 core + 13 rings)
  const planetCore = ctx.canon(12);
  const planetRings = ctx.canon(13);
  const px = 72;
  const py = 114 + jit(rng, 0, 2);
  ringedPlanet(ctx, px, py, 15.5, {
    tilt: -0.28 + rng.range(-0.04, 0.04),
    coreId: planetCore,
    ringId: planetRings,
    ringW: 2.05,
    ringH: 0.64,
  });

  // Two orbiting crystal/star accents nestled in clear space around the left planet
  const pOrb1 = ctx.dyn('asteroid', 'West Orbit Crystal');
  const cx1 = 56;
  const cy1 = 80;
  r.poly(pOrb1, rot([[cx1, cy1 - 8.5], [cx1 + 7.5, cy1], [cx1, cy1 + 8.5], [cx1 - 7.5, cy1]], cx1, cy1, 0.18));
  r.line(0, cx1, cy1 - 6, cx1, cy1 + 6, { only: [pOrb1] });

  const pOrb2 = ctx.dyn('star', 'West Orbit Star');
  star(ctx, pOrb2, 96, 68, 9.5, { points: 5, inner: 0.5, rot: -0.25 });

  // Right side orbit: mirrored Celestial Crescent Moon + Nested Sun-Star + 2 orbiting gems
  const rx = 408;
  const ry = 114 + jit(rng, 0, 2);
  const eastMoon = ctx.dyn('prop', 'East Cosmic Moon');
  crescent(ctx, eastMoon, rx, ry, 20.5, -0.35);
  inkArc(r, rx - 5, ry, 13.5, 13.5, Math.PI * 0.65, Math.PI * 1.35, 0, { only: [eastMoon] });

  const eastStar = ctx.dyn('star', 'East Medallion Star');
  star(ctx, eastStar, rx + 11, ry - 4, 11, { points: 6, inner: 0.52 });

  const rOrb1 = ctx.dyn('asteroid', 'East Orbit Crystal');
  const cx2 = 424;
  const cy2 = 80;
  r.poly(rOrb1, rot([[cx2, cy2 - 8.5], [cx2 + 7.5, cy2], [cx2, cy2 + 8.5], [cx2 - 7.5, cy2]], cx2, cy2, -0.18));
  r.line(0, cx2, cy2 - 6, cx2, cy2 + 6, { only: [rOrb1] });

  const rOrb2 = ctx.dyn('star', 'East Orbit Star');
  star(ctx, rOrb2, 384, 68, 9.5, { points: 5, inner: 0.5, rot: 0.25 });

  // =========================================================================
  // 6) UPPER CORNER FRAMING STARS & BASE CLOUDS (14/15) (4 regions)
  // =========================================================================
  const nwStar = ctx.dyn('star', 'North-West Guiding Star');
  star(ctx, nwStar, 40 + jit(rng, 0, 2), 32 + jit(rng, 0, 2), 11, { points: 4, inner: 0.42 });

  const neStar = ctx.dyn('star', 'North-East Guiding Star');
  star(ctx, neStar, 440 + jit(rng, 0, 2), 32 + jit(rng, 0, 2), 11, { points: 4, inner: 0.42 });

  // REQUIRED canonical fluffy clouds (14 + 15) cradling the mandala's side bases
  const cloudL = ctx.canon(14);
  const cloudR = ctx.canon(15);
  puffyCloud(ctx, cloudL, 62, 214, 98, 38, true);
  puffyCloud(ctx, cloudR, 418, 214, 98, 38, true);

  // =========================================================================
  // 7) GHOST CONSTELLATION CREATURES (3 hidden regions, 234..236, clear of arms!)
  // =========================================================================
  const ghostFox = ctx.ghost('Constellation Star-Fox');
  drawGhostFox(r, ghostFox, 154 + jit(rng, 0, 3), 20 + jit(rng, 0, 1.5));

  const ghostButterfly = ctx.ghost('Constellation Butterfly');
  drawGhostButterfly(r, ghostButterfly, 326 + jit(rng, 0, 3), 20 + jit(rng, 0, 1.5));

  const ghostJelly = ctx.ghost('Constellation Star-Jelly');
  drawGhostJelly(r, ghostJelly, 22 + jit(rng, 0, 1.5), 156 + jit(rng, 0, 2));

  // =========================================================================
  // 8) STARRY NEGATIVE-SPACE INK TWINKLES (pure ink in sky corners)
  // =========================================================================
  const cornerStars: Array<[number, number, number]> = [
    [16, 16, 2], [88, 16, 3], [114, 34, 2], [18, 66, 2],
    [464, 16, 2], [392, 16, 3], [366, 34, 2], [462, 66, 2],
    [16, 122, 2], [462, 148, 3], [450, 172, 2], [24, 242, 2],
    [456, 242, 2], [198, 16, 2], [282, 16, 2],
  ];
  for (const [sx0, sy0, arm] of cornerStars) {
    skySparkle(r, sx0 + jit(rng, 0, 1.5), sy0 + jit(rng, 0, 1.5), arm);
  }

  // =========================================================================
  // 9) ACTORS GAZING AT THE MANDALA ALONG THE LOWER ARC (no overlap, y <= 250)
  // =========================================================================
  const gallopPath = ctx.wavePath('gallop', 66, 240, 414, 240, 7, 2, 20);
  const sprintPath = ctx.wavePath('sprint', 90, 234, 390, 234, 10, 3, 20);
  ctx.ellipsePath('orbit', cx, cy, 186, 88, 32);
  ctx.ellipsePath('ring', cx, cy, 98, 78, 28);
  ctx.marginPath(256);

  // Lumi on left lower arc (66x54 -> x=113..179, y=193..246)
  ctx.actor('lumi', 146, 246, { facing: 1, anim: 'rear', pathIndex: gallopPath });
  // Violet at center lower arc (36x52 -> x=222..258, y=199..250)
  ctx.actor('violet', 240, 250, { facing: 1, anim: 'idle' });
  // Nova on right lower arc (68x36 -> x=300..368, y=211..246)
  ctx.actor('nova', 334, 246, { facing: -1, anim: 'leap', pathIndex: sprintPath });
}
