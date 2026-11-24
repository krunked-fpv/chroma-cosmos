/** Chapter 4B: The Whale-Song Constellation Sea — seamless layered aurora waves, 3 singing star-whales, constellation star clusters, rising ringed planet, 4 UV-ghost sea creatures. */
import type { SceneCtx } from './context';
import type { Pt } from './raster';
import * as props from './props';
import {
  crystalCluster,
  ghostJellyfish,
  ghostSeaTurtle,
  ghostStarDolphin,
  ghostStarfish,
  skyConstellationLine,
  skySparkle,
  taperedRibbon,
  waveRibbon,
} from './b-helpers';

export function buildWhaleSea(ctx: SceneCtx): void {
  ctx.title = 'The Whale-Song Constellation Sea';
  ctx.sky = { top: '#0c1238', bottom: '#234672', mist: '#63acc9' };
  const rng = ctx.rng;

  ctx.focal = { x: 234, y: 140 };

  // 1) Silky tapered sky aurora curtains (back layer)
  const auroraA = ctx.dyn('prop', 'Northern Aurora Curtain');
  taperedRibbon(
    ctx,
    auroraA,
    92,
    384,
    (x) => 20 + Math.sin((x - 92) * 0.024) * 5.5,
    6,
    { line: true },
  );

  const auroraB = ctx.dyn('prop', 'Twilight Aurora Stream');
  taperedRibbon(
    ctx,
    auroraB,
    180,
    316,
    (x) => 100 + Math.sin((x - 180) * 0.044) * 4.5,
    5.5,
    { line: true },
  );

  // 2) Crescent moon in the upper-left sky
  const moonId = ctx.dyn('planet', 'Whale-Song Crescent Moon');
  props.crescent(ctx, moonId, 52 + props.jit(rng, 0, 2), 44 + props.jit(rng, 0, 2), 19, -0.42);

  // 3) Ringed planet (12/13) rising majestically on the eastern horizon (behind foreground waves)
  const px = 388 + props.jit(rng, 0, 3);
  const py = 152 + props.jit(rng, 0, 2);
  const coreId = ctx.canon(12, 'Horizon Ringed Planet', 'planet');
  const ringId = ctx.canon(13, 'Horizon Planet Rings', 'rings');
  const pInfo = props.ringedPlanet(ctx, px, py, 34, {
    tilt: -0.22,
    coreId,
    ringId,
    ringW: 2.22,
    ringH: 0.62,
    bands: true,
  });

  // 4) Dreamy clouds (canonical 14 + 15) drifting above the aurora sea
  const cloudA = ctx.canon(14, 'Moonlit Sea Cloud', 'cloud');
  props.puffyCloud(ctx, cloudA, 148 + props.jit(rng, 0, 3), 66 + props.jit(rng, 0, 2), 78, 26, true);

  const cloudB = ctx.canon(15, 'Aurora Horizon Cloud', 'cloud');
  props.puffyCloud(ctx, cloudB, 344 + props.jit(rng, 0, 3), 60 + props.jit(rng, 0, 2), 82, 26, true);

  // 5) Luminous night ocean of 5 seamless full-width aurora wave-ribbons (bottom <= 245 for clean 16px margin!)
  const wave1 = ctx.dyn('prop', 'Distant Horizon Swell');
  waveRibbon(
    ctx,
    wave1,
    0,
    480,
    (x) => 168 + Math.sin(x * 0.022 + 0.2) * 5.5,
    (x) => 190 + Math.sin(x * 0.022 + 1.0) * 4,
    { lines: 1 },
  );

  const wave2 = ctx.dyn('flora', 'Starlight Sea Wave');
  waveRibbon(
    ctx,
    wave2,
    0,
    480,
    (x) => 182 + Math.sin(x * 0.028 + 1.6) * 6.5,
    (x) => 206 + Math.sin(x * 0.028 + 2.2) * 5,
    { lines: 1 },
  );
  props.inkArc(ctx.r, 148, 196, 8, 4.5, Math.PI * 1.15, Math.PI * 2.45, -0.25, { only: [wave2] });
  props.inkArc(ctx.r, 378, 194, 8, 4.5, Math.PI * 1.15, Math.PI * 2.45, -0.25, { only: [wave2] });

  const wave3 = ctx.dyn('prop', 'Aurora Swell Crest');
  waveRibbon(
    ctx,
    wave3,
    0,
    480,
    (x) => 196 + Math.sin(x * 0.025 + 3.4) * 6.5,
    (x) => 220 + Math.sin(x * 0.025 + 4.1) * 5,
    { lines: 1 },
  );
  props.inkArc(ctx.r, 254, 210, 9, 5, Math.PI * 1.15, Math.PI * 2.45, -0.2, { only: [wave3] });

  const wave4 = ctx.dyn('flora', 'Moon-Tide Wave');
  waveRibbon(
    ctx,
    wave4,
    0,
    480,
    (x) => 210 + Math.sin(x * 0.031 + 0.5) * 6,
    (x) => 234 + Math.sin(x * 0.031 + 1.1) * 4,
    { lines: 1 },
  );
  props.inkArc(ctx.r, 88, 224, 8.5, 4.5, Math.PI * 1.15, Math.PI * 2.45, -0.2, { only: [wave4] });
  props.inkArc(ctx.r, 422, 225, 8, 4, Math.PI * 1.15, Math.PI * 2.45, -0.2, { only: [wave4] });

  const wave5 = ctx.dyn('prop', 'Shimmering Tide Ribbon');
  waveRibbon(
    ctx,
    wave5,
    0,
    480,
    (x) => 225 + Math.sin(x * 0.027 + 2.6) * 5,
    (x) => 244 + Math.sin(x * 0.027 + 3.1) * 3,
    { lines: 1 },
  );

  // Two crystalline singing sea-reefs rising from the far-left and far-right wave crests
  crystalCluster(ctx, ctx.dyn('flora', 'West Singing Reef'), 28 + props.jit(rng, 0, 2), 186, 14, -0.14);
  crystalCluster(ctx, ctx.dyn('flora', 'East Singing Reef'), 454 + props.jit(rng, 0, 2), 212, 13, 0.16);

  // 6) Bright constellation star clusters linked by 1px ink lines on sky
  const drawCluster = (
    specs: Array<{ x: number; y: number; r: number; kind: 'star' | 'twinkle'; label: string }>,
  ): void => {
    const pts: Pt[] = [];
    for (const s of specs) {
      const sx = s.x + props.jit(rng, 0, 2);
      const sy = s.y + props.jit(rng, 0, 1.5);
      const id = ctx.dyn('star', s.label);
      if (s.kind === 'twinkle') props.twinkle(ctx, id, sx, sy, s.r);
      else props.star(ctx, id, sx, sy, s.r, { points: 5, inner: 0.48, rot: -Math.PI / 2 + props.jit(rng, 0, 0.15) });
      pts.push([sx, sy]);
    }
    skyConstellationLine(ctx, pts, false);
  };

  // West Dipper cluster
  drawCluster([
    { x: 20, y: 84, r: 9.5, kind: 'twinkle', label: 'West Dipper Alpha' },
    { x: 56, y: 98, r: 9, kind: 'star', label: 'West Dipper Beta' },
    { x: 96, y: 82, r: 9.5, kind: 'twinkle', label: 'West Dipper Gamma' },
  ]);

  // Zenith Song-Lyre cluster
  drawCluster([
    { x: 204, y: 44, r: 9, kind: 'star', label: 'Song-Lyre Alpha' },
    { x: 246, y: 36, r: 10.5, kind: 'twinkle', label: 'Song-Lyre Zenith' },
    { x: 286, y: 48, r: 9, kind: 'star', label: 'Song-Lyre Gamma' },
  ]);

  // East Star-Crown cluster
  drawCluster([
    { x: 404, y: 40, r: 9.5, kind: 'twinkle', label: 'East Crown Alpha' },
    { x: 446, y: 34, r: 10, kind: 'star', label: 'East Crown Beta' },
    { x: 462, y: 70, r: 9, kind: 'twinkle', label: 'East Crown Gamma' },
  ]);

  // Rising luminous whale-song bubbles / notes floating upward from the pod
  const songBubbles: Array<[number, number, number, string]> = [
    [172, 114, 7.6, 'Whale-Song Note A'],
    [276, 118, 8.2, 'Whale-Song Note B'],
    [296, 148, 7.5, 'Whale-Song Note C'],
  ];
  for (const [bx, by, br, label] of songBubbles) {
    props.pearl(ctx, ctx.dyn('star', label), bx + props.jit(rng, 0, 2), by + props.jit(rng, 0, 2), br);
  }

  // 7) 4 Hidden Constellation-Creature Ghosts (UV Flashlight Showcase! IDs 234..237, pure sky)
  ghostJellyfish(ctx, ctx.ghost('Constellation Moon-Jelly'), 44, 134, 14.5);
  ghostSeaTurtle(ctx, ctx.ghost('Constellation Star-Turtle'), 242, 74, 14.5, 1);
  ghostStarfish(ctx, ctx.ghost('Constellation Starfish'), 426, 92, 14.5);
  ghostStarDolphin(ctx, ctx.ghost('Constellation Star-Dolphin'), 170, 148, 13.5, 1);

  // 8) Delicate ink sky sparkles for starry depth
  const sparkles: readonly Pt[] = [
    [16, 22], [90, 24], [148, 22], [322, 22], [380, 18], [468, 20],
    [72, 144], [294, 80], [374, 94], [126, 158], [268, 160], [456, 120],
  ];
  for (let i = 0; i < sparkles.length; i++) {
    const p = sparkles[i] as Pt;
    skySparkle(ctx, p[0] + props.jit(rng, 0, 1.5), p[1] + props.jit(rng, 0, 1.5), i % 2 === 0 ? 2 : 1);
  }

  // 9) Paths: whale pod swim path, horizon planet ring, upper aurora orbit, bottom margin
  const swimPathIdx = ctx.wavePath('swim', 48, 146, 432, 142, 22, 1.5, 24);
  ctx.ellipsePath('ring', px, py, pInfo.rx * 0.85, pInfo.ry * 0.85, 24, pInfo.tilt);
  ctx.wavePath('orbit', 34, 54, 446, 52, 14, 1.5, 20);
  ctx.marginPath(254);

  // 10) 3 Star-Whale Actors (first gets canonical 19+29, duplicates remap automatically)
  ctx.actor('whale', 232, 154, { facing: 1, anim: 'swim', frame: 0, pathIndex: swimPathIdx });
  ctx.actor('whale', 112, 134, { facing: 1, anim: 'swim', frame: 1, pathIndex: swimPathIdx });
  ctx.actor('whale', 348, 214, { facing: -1, anim: 'swim', frame: 2, pathIndex: swimPathIdx });
}
