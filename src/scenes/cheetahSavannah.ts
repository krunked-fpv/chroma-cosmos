/**
 * Chapter 3A: The Starlight Cheetah Savannah of Orion — "Swaying cosmic grass under binary suns"
 * Glowing binary suns on the horizon, sweeping layered savannah hills, swaying cosmic grass tufts,
 * silhouetted star-acacia trees with starry canopies, Nova mid-leap, 2 bounding comet-gazelles,
 * ringed planet 12/13 + clouds 14/15 in twilight sky, sprint + ring + margin paths, 2 ghosts.
 */
import type { SceneCtx } from './context';
import { grassTuft, inkArc, jit, puffyCloud, ringedPlanet, star, twinkle } from './props';
import { W, type Pt } from './raster';
import {
  cubicPts,
  fillBand,
  ghostBird,
  ghostStarCub,
  inkPolyline,
  inkSparkle,
  paintRibbon,
  quadPts,
  smoothBoulder,
} from './a-helpers';

/** Silhouetted flat-topped savannah star-acacia tree: sinuous gnarled trunk + soft scalloped starry umbrella canopy. */
function starAcacia(
  ctx: SceneCtx,
  trunkId: number,
  canopyId: number,
  baseX: number,
  baseY: number,
  h: number,
  canopyW: number,
  lean: number,
): { forkX: number; forkY: number } {
  const r = ctx.r;
  const topY = baseY - h;
  const crownX = baseX + lean * h * 0.28;

  // Sinuous gently twisting acacia trunk with cozy flared root base
  const trunk = cubicPts(
    [baseX, baseY],
    [baseX - lean * 12, baseY - h * 0.34],
    [crownX + lean * 5, baseY - h * 0.66],
    [crownX, topY + h * 0.2],
    16,
  );
  paintRibbon(r, trunkId, trunk, (t) => Math.max(3.6, (1 - t * 0.45) * 6.8 + (t < 0.14 ? (0.14 - t) * 20 : 0)));

  // Asymmetric curving acacia boughs spreading under the umbrella canopy
  const forkPt = trunk[9] as Pt;
  const forkX = forkPt[0];
  const forkY = forkPt[1];
  const boughL = quadPts([forkX, forkY], [crownX - canopyW * 0.22, topY + h * 0.2], [crownX - canopyW * 0.36, topY + 2], 12);
  const boughR = quadPts([forkX, forkY], [crownX + canopyW * 0.2, topY + h * 0.16], [crownX + canopyW * 0.35, topY + 3], 12);
  const boughMid = quadPts([forkX, forkY - 4], [crownX + lean * 6, topY + h * 0.12], [crownX - lean * 4, topY], 8);
  paintRibbon(r, trunkId, boughL, (t) => Math.max(2.9, 4.3 - t * 1.4));
  paintRibbon(r, trunkId, boughR, (t) => Math.max(2.9, 4.1 - t * 1.3));
  paintRibbon(r, trunkId, boughMid, (t) => Math.max(2.6, 3.6 - t * 1.0));

  // Bark grain ink curve
  inkPolyline(r, quadPts([baseX - 1, baseY - 5], [baseX - lean * 10, baseY - h * 0.38], [forkX, forkY], 10), trunkId);

  // Softly rounded flat-topped acacia umbrella canopy built from overlapping organic foliage puffs (zero boxy edges!)
  const halfW = canopyW * 0.5;
  const puffs: Array<[number, number, number, number]> = [
    [-halfW * 0.66, 0, halfW * 0.34, 9.5],
    [-halfW * 0.3, -6, halfW * 0.4, 12.5],
    [0.04 * halfW, -9, halfW * 0.44, 14.0],
    [halfW * 0.34, -5, halfW * 0.38, 12.0],
    [halfW * 0.66, 0.5, halfW * 0.33, 9.2],
  ];
  for (const [ox, oy, rx, ry] of puffs) {
    r.ellipse(canopyId, crownX + ox, topY + oy, rx, ry);
  }
  // Gentle flat-ish savannah umbrella underside bar uniting the puffs smoothly
  r.ellipse(canopyId, crownX, topY + 3, halfW * 0.86, 6.2);

  // Asymmetric storybook foliage curls & tiny twinkling canopy stars
  inkArc(r, crownX - halfW * 0.32, topY - 4, halfW * 0.2, 6.2, Math.PI * 1.12, Math.PI * 1.88, 0, { only: [canopyId] });
  inkArc(r, crownX + halfW * 0.24, topY - 6, halfW * 0.22, 6.8, Math.PI * 1.12, Math.PI * 1.86, 0, { only: [canopyId] });
  inkSparkle(r, crownX - halfW * 0.52, topY - 1, 2.2, canopyId);
  inkSparkle(r, crownX + halfW * 0.02, topY - 11, 2.6, canopyId);
  inkSparkle(r, crownX + halfW * 0.48, topY - 2, 2.0, canopyId);
  r.dot(0, crownX - halfW * 0.14, topY - 3, { only: [canopyId] });
  r.dot(0, crownX + halfW * 0.28, topY - 1, { only: [canopyId] });

  return { forkX, forkY };
}

export function buildCheetahSavannah(ctx: SceneCtx): void {
  const r = ctx.r;
  const rng = ctx.rng;

  ctx.title = 'The Starlight Cheetah Savannah of Orion';
  ctx.sky = { top: '#1c1547', bottom: '#8c3d69', mist: '#da8c6d' };
  ctx.focal = { x: 204, y: 156 };

  // 1) Ringed Planet (canonical 12 + 13) in upper-left Orion twilight sky
  const px = Math.round(jit(rng, 72, 4));
  const py = Math.round(jit(rng, 52, 3));
  const pCore = ctx.canon(12, 'Orion Ringed Planet');
  const pRing = ctx.canon(13, 'Twilight Planet Rings');
  const planet = ringedPlanet(ctx, px, py, 22, {
    tilt: -0.24 + rng.range(-0.04, 0.04),
    coreId: pCore,
    ringId: pRing,
    ringW: 2.06,
    ringH: 0.58,
  });

  // 2) Fluffy Twilight Clouds (canonical 14 + 15) high in the sky, well clear of acacia crowns
  const cloudA = ctx.canon(14, 'Orion Twilight Cloud');
  const cloudB = ctx.canon(15, 'Amber Horizon Cloud');
  puffyCloud(ctx, cloudA, Math.round(jit(rng, 250, 4)), Math.round(jit(rng, 44, 3)), 98, 28, true);
  puffyCloud(ctx, cloudB, Math.round(jit(rng, 412, 4)), Math.round(jit(rng, 52, 3)), 88, 26, true);

  // 3) Glowing Binary Suns on the Horizon (golden primary + rose companion + clean solar halo)
  const sun1X = Math.round(jit(rng, 240, 4));
  const sun1Y = Math.round(jit(rng, 148, 2));
  const sun1R = 35;
  const sun2X = sun1X + 49;
  const sun2Y = sun1Y - 16;
  const sun2R = 20;

  // Clean wide solar halo arching smoothly behind both suns (no trapped sliver between them!)
  const haloId = ctx.dyn('prop', 'Binary Sun Halo');
  r.shape(haloId, sun1X - 50, sun1Y - 50, sun2X + 30, sun1Y + 18, (x, y) => {
    const d1 = Math.hypot(x - sun1X, y - sun1Y);
    const d2 = Math.hypot(x - sun2X, y - sun2Y);
    return (d1 <= 48 || d2 <= 29) && y <= sun1Y + 12;
  });
  inkArc(r, sun1X, sun1Y, 42, 42, Math.PI * 1.08, Math.PI * 1.72, 0, { only: [haloId] });

  const sun1Id = ctx.dyn('star', 'Orion Golden Sun');
  r.disc(sun1Id, sun1X, sun1Y, sun1R);
  inkArc(r, sun1X, sun1Y, sun1R * 0.72, sun1R * 0.72, Math.PI * 1.18, Math.PI * 1.82, 0, { only: [sun1Id] });
  inkArc(r, sun1X, sun1Y, sun1R * 0.44, sun1R * 0.44, Math.PI * 1.28, Math.PI * 1.72, 0, { only: [sun1Id] });

  const sun2Id = ctx.dyn('star', 'Orion Companion Sun');
  r.disc(sun2Id, sun2X, sun2Y, sun2R);
  inkArc(r, sun2X, sun2Y, sun2R * 0.62, sun2R * 0.62, Math.PI * 1.12, Math.PI * 1.88, 0, { only: [sun2Id] });

  // 4) Sweeping Layered Savannah Hills (back-to-front; cleanly ending at y~247 so y>=254 stays open for flower rain)
  const ph = rng.range(-0.14, 0.14);
  const farTop = (x: number): number => 156 - Math.sin((x / W) * Math.PI * 1.6 + 0.3 + ph) * 10 - Math.cos((x / W) * Math.PI * 3.0) * 4;
  const midTop = (x: number): number => 176 + Math.sin((x / W) * Math.PI * 1.35 - 0.5 + ph) * 12;
  const nearTop = (x: number): number => 204 - Math.sin((x / W) * Math.PI * 1.15 + 0.4 + ph) * 8 + Math.cos((x / W) * Math.PI * 2.4) * 3;
  const bottomEdge = (x: number): number => 247 + Math.sin((x / W) * Math.PI * 3.0) * 2.2;

  const farHill = ctx.dyn('prop', 'Distant Orion Ridge');
  fillBand(r, farHill, 0, W, 138, 198, farTop, (x) => midTop(x) + 6);
  // Broken windswept contour strokes (airy & hand-drawn)
  for (const [xa, xb] of [[24, 118], [268, 362]] as const) {
    const pts: Pt[] = [];
    for (let x = xa; x <= xb; x += 12) pts.push([x, farTop(x) + 8]);
    inkPolyline(r, pts, farHill);
  }

  const midHill = ctx.dyn('prop', 'Mid Savannah Plain');
  fillBand(r, midHill, 0, W, 158, 224, midTop, (x) => nearTop(x) + 6);
  for (const [xa, xb] of [[96, 174], [336, 412]] as const) {
    const pts: Pt[] = [];
    for (let x = xa; x <= xb; x += 12) pts.push([x, midTop(x) + 12]);
    inkPolyline(r, pts, midHill);
  }

  const nearHill = ctx.dyn('prop', 'Starlight Meadow');
  fillBand(r, nearHill, 0, W, 188, 251, nearTop, bottomEdge);
  for (const [xa, xb] of [[112, 204], [282, 354]] as const) {
    const pts: Pt[] = [];
    for (let x = xa; x <= xb; x += 14) pts.push([x, nearTop(x) + 14]);
    inkPolyline(r, pts, nearHill);
  }

  // 5) Silhouetted Star-Acacia Trees framing left and right edges of the savannah valley
  const leftTrunk = ctx.dyn('flora', 'West Acacia Trunk');
  const leftCanopy = ctx.dyn('flora', 'West Acacia Canopy');
  const leftBaseX = Math.round(jit(rng, 62, 3));
  const leftFork = starAcacia(ctx, leftTrunk, leftCanopy, leftBaseX, 206, 86, 112, 0.22);

  // Charming organic lower side-bough puff connected cleanly by a little bough stem
  const sbX = leftBaseX + 44;
  const sbY = 142;
  const sideStem = quadPts([leftFork.forkX + 2, leftFork.forkY + 6], [leftBaseX + 28, 154], [sbX, sbY + 2], 8);
  paintRibbon(r, leftTrunk, sideStem, (t) => Math.max(2.6, 3.6 - t * 0.8));
  const sideBough = ctx.dyn('flora', 'Acacia Star-Bough');
  r.ellipse(sideBough, sbX - 8, sbY + 1, 14, 7.2, -0.08);
  r.ellipse(sideBough, sbX + 5, sbY - 1, 15, 7.6, 0.06);
  inkSparkle(r, sbX + 3, sbY - 2, 2.2, sideBough);
  inkArc(r, sbX - 6, sbY, 8, 4, Math.PI * 1.1, Math.PI * 1.9, 0, { only: [sideBough] });

  const rightTrunk = ctx.dyn('flora', 'East Acacia Trunk');
  const rightCanopy = ctx.dyn('flora', 'East Acacia Canopy');
  const rightBaseX = Math.round(jit(rng, 424, 3));
  starAcacia(ctx, rightTrunk, rightCanopy, rightBaseX, 192, 68, 96, -0.2);

  // Two organic sun-warmed savannah boulders grounding the acacia bases
  const rockL = ctx.dyn('prop', 'West Savannah Sun-Rock');
  smoothBoulder(ctx, rockL, leftBaseX + 2, 212, 20, 10, -0.05);

  const rockR = ctx.dyn('prop', 'East Savannah Sun-Rock');
  smoothBoulder(ctx, rockR, rightBaseX + 6, 198, 18, 9, 0.06);

  // 6) Swaying Cosmic Grass Tufts (props.grassTuft) staggered organically in depth & scale
  grassTuft(ctx, ctx.dyn('flora', 'Cosmic Grass West'), Math.round(jit(rng, 28, 3)), 238, 27, 0.5);
  grassTuft(ctx, ctx.dyn('flora', 'Mid-Plain Star-Grass'), Math.round(jit(rng, 108, 3)), 214, 20, 0.56);
  grassTuft(ctx, ctx.dyn('flora', 'Starlight Grass Meadow'), Math.round(jit(rng, 158, 3)), 242, 24, 0.54);
  grassTuft(ctx, ctx.dyn('flora', 'Golden Grass Tuft'), Math.round(jit(rng, 244, 4)), 232, 25, 0.52);
  grassTuft(ctx, ctx.dyn('flora', 'Savannah Reed Tuft'), Math.round(jit(rng, 324, 3)), 244, 23, 0.58);
  grassTuft(ctx, ctx.dyn('flora', 'Cosmic Grass East'), Math.round(jit(rng, 448, 3)), 238, 26, -0.46);

  // 7) Orion Constellation Belt Stars & Twilight Twinkles
  star(ctx, ctx.dyn('star', 'Orion Belt Star Alnitak'), Math.round(jit(rng, 144, 2)), Math.round(jit(rng, 82, 2)), 10.5, { points: 5, inner: 0.48 });
  star(ctx, ctx.dyn('star', 'Orion Belt Star Alnilam'), Math.round(jit(rng, 174, 2)), Math.round(jit(rng, 88, 2)), 11.2, { points: 5, inner: 0.48, rot: 0.1 });
  star(ctx, ctx.dyn('star', 'Orion Belt Star Mintaka'), Math.round(jit(rng, 204, 2)), Math.round(jit(rng, 94, 2)), 10.5, { points: 5, inner: 0.48, rot: -0.1 });
  twinkle(ctx, ctx.dyn('star', 'Savannah Twilight Twinkle'), Math.round(jit(rng, 336, 3)), Math.round(jit(rng, 88, 3)), 12.5);
  twinkle(ctx, ctx.dyn('star', 'Orion Zenith Twinkle'), Math.round(jit(rng, 456, 3)), Math.round(jit(rng, 92, 3)), 11.5);

  // 8) Hidden Constellation Ghosts (2 ghosts in pure SKY pockets)
  ghostStarCub(ctx, 'Constellation Orion-Cub', Math.round(jit(rng, 162, 3)), Math.round(jit(rng, 40, 2)), 1.0);
  ghostBird(ctx, 'Constellation Star-Hawk', Math.round(jit(rng, 336, 3)), Math.round(jit(rng, 40, 2)), 1.0, false);

  // 9) Paths: bounding savannah sprint, planet ring, clean bottom margin
  const sprintIdx = ctx.addPath(
    'sprint',
    [
      [42, 206],
      [118, 192],
      [186, 178],
      [246, 186],
      [304, 198],
      [382, 218],
      [452, 212],
    ],
    false,
  );
  ctx.ellipsePath('ring', px, py, planet.rx * 1.18, planet.ry * 1.4, 24, planet.tilt);
  ctx.marginPath(256);

  // 10) Actors: Nova mid-leap + 2 bounding comet-gazelles!
  ctx.actor('nova', 186, 178, { facing: 1, anim: 'leap', pathIndex: sprintIdx });
  ctx.actor('gazelle', 304, 198, { facing: 1, anim: 'leap', pathIndex: sprintIdx });
  ctx.actor('gazelle', 384, 220, { facing: 1, anim: 'run', pathIndex: sprintIdx });
}
