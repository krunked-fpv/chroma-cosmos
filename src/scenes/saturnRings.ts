/** Chapter 3B: The Crystal Unicorn Rings of Saturn — grand sweeping Saturn, glittering quartz spires, Lumi galloping on the front ring. */
import type { SceneCtx } from './context';
import type { Pt } from './raster';
import * as props from './props';
import {
  crystalCluster,
  ghostMoonMoth,
  ghostStarFox,
  ghostStarOwl,
  miniMoon,
  skySparkle,
  taperedRibbon,
} from './b-helpers';

function ringPoint(cx: number, cy: number, rx: number, ry: number, tilt: number, angle: number, k = 0.84): Pt {
  const c = Math.cos(tilt);
  const s = Math.sin(tilt);
  const ux = Math.cos(angle) * rx * k;
  const uy = Math.sin(angle) * ry * k;
  return [cx + ux * c - uy * s, cy + ux * s + uy * c];
}

function crystalDiamond(ctx: SceneCtx, id: number, cx: number, cy: number, rx: number, ry: number, tilt = 0): void {
  const raw: Pt[] = [
    [cx, cy - ry],
    [cx + rx, cy],
    [cx, cy + ry],
    [cx - rx, cy],
  ];
  const pts = props.rot(raw, cx, cy, tilt);
  ctx.r.poly(id, pts);
  const v = props.rot(
    [
      [cx, cy - ry * 0.72],
      [cx, cy + ry * 0.72],
    ],
    cx,
    cy,
    tilt,
  );
  const h = props.rot(
    [
      [cx - rx * 0.65, cy],
      [cx + rx * 0.65, cy],
    ],
    cx,
    cy,
    tilt,
  );
  ctx.r.line(0, (v[0] as Pt)[0], (v[0] as Pt)[1], (v[1] as Pt)[0], (v[1] as Pt)[1], { only: [id] });
  ctx.r.line(0, (h[0] as Pt)[0], (h[0] as Pt)[1], (h[1] as Pt)[0], (h[1] as Pt)[1], { only: [id] });
}

export function buildSaturnRings(ctx: SceneCtx): void {
  ctx.title = 'The Crystal Unicorn Rings of Saturn';
  ctx.sky = { top: '#13113a', bottom: '#4d2b75', mist: '#8f72c2' };
  const rng = ctx.rng;

  const satX = 248 + props.jit(rng, 0, 4);
  const satY = 132 + props.jit(rng, 0, 3);
  const satR = 54;
  const tilt = -0.17 + props.jit(rng, 0, 0.015);
  ctx.focal = { x: Math.round(satX), y: Math.round(satY) };

  // 1) Silky tapered aurora stardust ribbons arching gently in the upper & lower sky
  const ribbonTop = ctx.dyn('prop', 'Upper Stardust Ribbon');
  taperedRibbon(
    ctx,
    ribbonTop,
    102,
    370,
    (x) => 21 + Math.sin((x - 102) * 0.023) * 5.5,
    6,
    { line: true },
  );

  const ribbonLow = ctx.dyn('prop', 'Lower Stardust Ribbon');
  taperedRibbon(
    ctx,
    ribbonLow,
    144,
    346,
    (x) => 200 + Math.sin((x - 144) * 0.028) * 5.5,
    5.5,
    { line: true },
  );

  // 2) Grand Saturn (canonical 12 core + 13 rings, front/back split)
  const coreId = ctx.canon(12, 'Saturn Core', 'planet');
  const ringId = ctx.canon(13, 'Crystal Rings of Saturn', 'rings');
  const { rx, ry } = props.ringedPlanet(ctx, satX, satY, satR, {
    tilt,
    coreId,
    ringId,
    ringW: 3.55,
    ringH: 0.86,
    bands: true,
  });
  // Extra ring grooves & Saturn's storybook storm swirl
  props.inkArc(ctx.r, satX, satY, rx * 0.74, ry * 0.74, 0, Math.PI * 2, tilt, { only: [ringId] });
  props.inkArc(ctx.r, satX, satY, rx * 0.92, ry * 0.92, 0, Math.PI * 2, tilt, { only: [ringId] });
  props.inkArc(ctx.r, satX + 14, satY + 12, 12, 6, 0, Math.PI * 2, tilt, { only: [coreId] });
  props.inkArc(ctx.r, satX + 14, satY + 12, 6, 3, 0.3, Math.PI * 1.9, tilt, { only: [coreId] });

  // 3) Glittering faceted quartz crystal spires studding the ring arc (cleanly spaced & clear of actors)
  const ringCrystals: Array<{ a: number; k: number; s: number; rot: number; label: string }> = [
    { a: 3.24, k: 0.87, s: 15, rot: -0.34, label: 'West Ring Spire' },
    { a: 3.84, k: 0.86, s: 12, rot: -0.44, label: 'Northwest Ring Crystal' },
    { a: 5.34, k: 0.86, s: 14, rot: 0.26, label: 'Northeast Ring Spire' },
    { a: 5.86, k: 0.89, s: 13, rot: 0.42, label: 'East Ring Crystal' },
    { a: 1.18, k: 0.85, s: 14, rot: 0.16, label: 'Front Ring Crystal' },
    { a: 2.52, k: 0.91, s: 12, rot: -0.22, label: 'Southwest Ring Cluster' },
  ];
  for (const rc of ringCrystals) {
    const [cx, cy] = ringPoint(satX, satY, rx, ry, tilt, rc.a + props.jit(rng, 0, 0.02), rc.k);
    const id = ctx.dyn('asteroid', rc.label);
    crystalCluster(ctx, id, cx, cy, rc.s, rc.rot);
  }

  // Faceted crystal diamonds floating along the ring halo
  const diamonds: Array<[number, number, number, number, number, string]> = [
    [94, 108, 7.5, 11.5, -0.22, 'Floating Ring Prism A'],
    [354, 178, 8, 12, 0.24, 'Floating Ring Prism B'],
    [136, 188, 7.5, 11, -0.18, 'Floating Ring Prism C'],
    [438, 146, 7.5, 11, 0.32, 'Floating Ring Prism D'],
  ];
  for (const [dx, dy, drx, dry, drot, label] of diamonds) {
    const id = ctx.dyn('asteroid', label);
    crystalDiamond(ctx, id, dx + props.jit(rng, 0, 2.5), dy + props.jit(rng, 0, 2), drx, dry, drot);
  }

  // 4) Crescent moon & orbiting cratered mini-moons
  const crescentId = ctx.dyn('planet', 'Crystal Crescent Moon');
  props.crescent(ctx, crescentId, 52 + props.jit(rng, 0, 3), 42 + props.jit(rng, 0, 2), 16, -0.45);

  const moons: Array<[number, number, number, string]> = [
    [206, 58, 11, 'Titan Mini-Moon'],
    [328, 52, 14, 'Enceladus Ice Moon'],
    [264, 226, 12, 'Mimas Crater Moon'],
  ];
  for (const [mx, my, mr, label] of moons) {
    miniMoon(ctx, ctx.dyn('planet', label), mx + props.jit(rng, 0, 2.5), my + props.jit(rng, 0, 2), mr);
  }

  // 5) Bright stars & four-point twinkles framing the negative sky
  const starSpecs: Array<{ x: number; y: number; r: number; kind: 'star' | 'twinkle'; label: string }> = [
    { x: 100, y: 74, r: 10, kind: 'twinkle', label: 'Sapphire Twinkle' },
    { x: 266, y: 44, r: 9.5, kind: 'star', label: 'Crown Star' },
    { x: 376, y: 46, r: 10.5, kind: 'twinkle', label: 'Aurora Sparkle Star' },
    { x: 30, y: 168, r: 9.5, kind: 'star', label: 'West Horizon Star' },
    { x: 326, y: 224, r: 10, kind: 'star', label: 'South Ring Star' },
    { x: 452, y: 186, r: 9.5, kind: 'twinkle', label: 'East Horizon Twinkle' },
    { x: 162, y: 230, r: 9, kind: 'star', label: 'Lower Gem Star' },
  ];
  for (const st of starSpecs) {
    const sx = st.x + props.jit(rng, 0, 2);
    const sy = st.y + props.jit(rng, 0, 2);
    const id = ctx.dyn('star', st.label);
    if (st.kind === 'twinkle') props.twinkle(ctx, id, sx, sy, st.r);
    else props.star(ctx, id, sx, sy, st.r, { points: 5, inner: 0.48, rot: -Math.PI / 2 + props.jit(rng, 0, 0.2) });
  }

  // 6) Dreamy clouds (canonical 14 + 15 + 1 gentle high-west companion, clean above bottom 16px margin)
  const cloudA = ctx.canon(14, 'Fluffy Cloud', 'cloud');
  props.puffyCloud(ctx, cloudA, 74 + props.jit(rng, 0, 3), 224 + props.jit(rng, 0, 2), 104, 32, true);

  const cloudB = ctx.canon(15, 'Dreamy Cloud', 'cloud');
  props.puffyCloud(ctx, cloudB, 404 + props.jit(rng, 0, 3), 222 + props.jit(rng, 0, 2), 106, 32, true);

  const cloudC = ctx.dyn('cloud', 'High Ring Cloud');
  props.puffyCloud(ctx, cloudC, 38 + props.jit(rng, 0, 2.5), 88 + props.jit(rng, 0, 2), 54, 20, true);

  // 7) Hidden constellation-creature ghosts on open sky (234..236, each >= 220px)
  ghostStarFox(ctx, ctx.ghost('Constellation Star-Fox'), 430, 52, 14.5, -1);
  ghostMoonMoth(ctx, ctx.ghost('Constellation Moon-Moth'), 44, 128, 13.5);
  ghostStarOwl(ctx, ctx.ghost('Constellation Star-Owl'), 214, 226, 13);

  // 8) Tiny ink sky sparkles for storybook shimmer
  const sparkles: readonly Pt[] = [
    [18, 24], [86, 22], [170, 26], [298, 20], [398, 18], [464, 28],
    [20, 198], [134, 242], [294, 242], [462, 234], [308, 90], [160, 88],
  ];
  for (let i = 0; i < sparkles.length; i++) {
    const p = sparkles[i] as Pt;
    skySparkle(ctx, p[0] + props.jit(rng, 0, 2), p[1] + props.jit(rng, 0, 2), i % 3 === 0 ? 2 : 1);
  }

  // 9) Paths: ring ellipse, front-ring gallop path, outer orbit, bottom margin
  const ringPathIdx = ctx.ellipsePath('ring', satX, satY, rx * 0.83, ry * 0.83, 32, tilt);

  const gallopPts: Pt[] = [];
  for (let i = 0; i < 16; i++) {
    const a = 2.82 - (i / 15) * 2.48;
    gallopPts.push(ringPoint(satX, satY, rx, ry, tilt, a, 0.83));
  }
  const gallopPathIdx = ctx.addPath('gallop', gallopPts, false);

  const orbitPts: Pt[] = [];
  for (let i = 0; i < 24; i++) {
    const t = (i / 24) * Math.PI * 2;
    const ox = Math.max(18, Math.min(462, satX + Math.cos(t) * 204));
    const oy = Math.max(20, Math.min(238, satY + Math.sin(t) * 96));
    orbitPts.push([ox, oy]);
  }
  const orbitPathIdx = ctx.addPath('orbit', orbitPts, true);
  ctx.marginPath(254);

  // 10) Actors (no overlap, clear margins, feet anchored on paths)
  // Lumi galloping/rearing heroically on Saturn's glowing front ring
  const [lumiX, lumiY] = ringPoint(satX, satY, rx, ry, tilt, 2.02, 0.84);
  ctx.actor('lumi', lumiX, lumiY, { facing: 1, anim: 'rear', frame: 0, pathIndex: gallopPathIdx });

  // CometCar zooming around the right bend of the ring
  const [carX, carY] = ringPoint(satX, satY, rx, ry, tilt, 0.44, 0.85);
  ctx.actor('cometCar', carX, carY, { facing: -1, anim: 'run', frame: 0, pathIndex: ringPathIdx });

  // Rainbow Comet soaring high on the upper-left orbit
  ctx.actor('comet', 142, 54, { facing: 1, anim: 'float', frame: 0, pathIndex: orbitPathIdx });
}
