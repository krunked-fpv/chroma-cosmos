/** Chapter 4A: Zero-G Bubble Tea Station — circular porthole framing a ringed planet, giant tilted boba cup, 10 floating pearls, Violet floating & Moon-Cat napping on a teacup. */
import type { SceneCtx } from './context';
import type { Pt } from './raster';
import * as props from './props';
import { ghostJellyfish, ghostMoonMoth, roundedRect, skySparkle, taperedRibbon } from './b-helpers';

/** Transform local cup coordinates (u, v) to canvas coordinates with tilt around (cx, cy). */
function cupPt(cx: number, cy: number, tilt: number, u: number, v: number): Pt {
  const c = Math.cos(tilt);
  const s = Math.sin(tilt);
  return [cx + u * c - v * s, cy + u * s + v * c];
}

function iceCube(ctx: SceneCtx, id: number, cx: number, cy: number, size: number, angle: number): void {
  roundedRect(ctx, id, cx, cy, size, size, 3.2, angle);
  const h = size * 0.28;
  const shine = props.rot(
    [
      [cx - h, cy + h * 0.3],
      [cx - h, cy - h],
      [cx + h * 0.5, cy - h],
    ],
    cx,
    cy,
    angle,
  );
  ctx.r.strokePath(0, shine, { only: [id] });
}

export function buildBubbleTea(ctx: SceneCtx): void {
  ctx.title = 'Zero-G Bubble Tea Station';
  ctx.sky = { top: '#1c123c', bottom: '#572d6e', mist: '#a377bd' };
  const rng = ctx.rng;

  const cx = 256 + props.jit(rng, 0, 3);
  const cy = 148 + props.jit(rng, 0, 2);
  const tilt = -0.075 + props.jit(rng, 0, 0.015);
  ctx.focal = { x: Math.round(cx), y: Math.round(cy - 6) };

  // 1) Cosy circular space-station porthole window on the left framing ringed planet (12/13)
  const px = 100 + props.jit(rng, 0, 3);
  const py = 110 + props.jit(rng, 0, 2);
  const outerR = 72;
  const innerR = 58;

  // Ringed planet visible through the porthole sky
  const coreId = ctx.canon(12, 'Porthole Ringed Planet', 'planet');
  const ringId = ctx.canon(13, 'Porthole Planet Rings', 'rings');
  const pInfo = props.ringedPlanet(ctx, px + 2, py + 4, 20, {
    tilt: -0.32,
    coreId,
    ringId,
    ringW: 2.15,
    ringH: 0.62,
    bands: true,
  });

  // Bright star tucked inside the porthole sky
  const winStarId = ctx.dyn('star', 'Porthole Star');
  props.twinkle(ctx, winStarId, px - 30, py - 26, 8.5);

  // Porthole riveted metallic bezel ring
  const portholeId = ctx.dyn('prop', 'Station Porthole Frame');
  ctx.r.shape(portholeId, px - outerR, py - outerR, px + outerR, py + outerR, (x, y) => {
    const d2 = (x - px) * (x - px) + (y - py) * (y - py);
    return d2 <= outerR * outerR && d2 >= innerR * innerR;
  });
  props.inkArc(ctx.r, px, py, outerR - 3, outerR - 3, 0, Math.PI * 2, 0, { only: [portholeId] });
  props.inkArc(ctx.r, px, py, innerR + 3, innerR + 3, 0, Math.PI * 2, 0, { only: [portholeId] });
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2 + Math.PI / 8;
    const rx = px + Math.cos(a) * ((outerR + innerR) / 2);
    const ry = py + Math.sin(a) * ((outerR + innerR) / 2);
    props.inkArc(ctx.r, rx, ry, 2.4, 2.4, 0, Math.PI * 2, 0, { only: [portholeId] });
  }

  // 2) Silky tapered zero-G milk-tea swirl ribbons floating around the giant cup
  const swirlA = ctx.dyn('milkshake', 'Zero-G Tea Swirl A');
  taperedRibbon(
    ctx,
    swirlA,
    162,
    212,
    (x) => 160 + Math.sin((x - 162) * 0.12) * 11 + (x - 162) * 0.34,
    6.2,
    { line: true },
  );

  const swirlB = ctx.dyn('milkshake', 'Zero-G Tea Swirl B');
  taperedRibbon(
    ctx,
    swirlB,
    300,
    370,
    (x) => 196 - Math.sin((x - 300) * 0.095) * 9 - (x - 300) * 0.08,
    6.5,
    { line: true },
  );

  // 3) Giant Whimsical Bubble-Tea Cup (tilted in zero-G)
  const c = Math.cos(tilt);
  const s = Math.sin(tilt);
  const toLocal = (x: number, y: number): [number, number] => {
    const dx = x - cx;
    const dy = y - cy;
    return [dx * c + dy * s, -dx * s + dy * c];
  };

  // Thick angled boba straw (drawn first so dome rim sits cleanly in front)
  const strawId = ctx.dyn('milkshake', 'Giant Boba Straw');
  const strawPts: Pt[] = [
    cupPt(cx, cy, tilt, 10, -114),
    cupPt(cx, cy, tilt, 24, -112),
    cupPt(cx, cy, tilt, 6, -42),
    cupPt(cx, cy, tilt, -8, -44),
  ];
  ctx.r.poly(strawId, strawPts);
  // Candy stripes along the thick straw
  for (let k = 0; k < 5; k++) {
    const t = 0.14 + k * 0.17;
    const a = cupPt(cx, cy, tilt, 10 - t * 18, -114 + t * 70);
    const b = cupPt(cx, cy, tilt, 24 - t * 18, -112 + t * 70);
    ctx.r.line(0, a[0], a[1], b[0], b[1], { only: [strawId] });
  }

  // Cup lower caramel swirl layer
  const lowerTeaId = ctx.dyn('milkshake', 'Caramel Swirl Base');
  ctx.r.shape(lowerTeaId, cx - 64, cy - 10, cx + 64, cy + 76, (x, y) => {
    const [u, v] = toLocal(x, y);
    const wave = 18 + Math.sin(u * 0.14) * 4.5;
    if (v < wave || v > 62) return false;
    const hw = 48 - ((v + 34) / 96) * 16;
    if (v > 54) {
      const dr = (v - 54) / 8;
      return Math.abs(u) <= hw - dr * dr * 5;
    }
    return Math.abs(u) <= hw;
  });
  // Swirl ink line & tiny boba pearls resting inside caramel base
  const swirlLine: Pt[] = [];
  for (let i = -28; i <= 28; i += 4) swirlLine.push(cupPt(cx, cy, tilt, i, 37 + Math.sin(i * 0.18) * 4));
  ctx.r.strokePath(0, swirlLine, { only: [lowerTeaId] });
  for (const [bu, bv] of [[-18, 51], [-4, 53], [11, 51], [22, 48]] as const) {
    const [bx0, by0] = cupPt(cx, cy, tilt, bu, bv);
    props.inkArc(ctx.r, bx0, by0, 4, 4, 0, Math.PI * 2, 0, { only: [lowerTeaId] });
  }

  // Cup upper cosmic milk tea body
  const upperTeaId = ctx.dyn('milkshake', 'Cosmic Milk Tea');
  ctx.r.shape(upperTeaId, cx - 64, cy - 42, cx + 64, cy + 36, (x, y) => {
    const [u, v] = toLocal(x, y);
    const wave = 18 + Math.sin(u * 0.14) * 4.5;
    if (v < -34 || v >= wave) return false;
    const hw = 48 - ((v + 34) / 96) * 16;
    return Math.abs(u) <= hw;
  });
  // Gentle glossy cup highlight line on left side
  const cupShineA = cupPt(cx, cy, tilt, -36, -24);
  const cupShineB = cupPt(cx, cy, tilt, -31, 10);
  ctx.r.line(0, cupShineA[0], cupShineA[1], cupShineB[0], cupShineB[1], { only: [upperTeaId] });

  // Cute kawaii star café emblem on front of cup
  const badgeId = ctx.dyn('prop', 'Star Café Emblem');
  const [bx, by] = cupPt(cx, cy, tilt, 0, -8);
  props.star(ctx, badgeId, bx, by, 14, { points: 5, inner: 0.52, rot: -Math.PI / 2 + tilt });

  // Domed clear-style bubble-tea lid
  const lidId = ctx.dyn('milkshake', 'Domed Bubble Lid');
  ctx.r.shape(lidId, cx - 60, cy - 92, cx + 60, cy - 26, (x, y) => {
    const [u, v] = toLocal(x, y);
    if (v > -36) return false;
    const nu = u / 46;
    const nv = (v + 36) / 42;
    return nu * nu + nv * nv <= 1;
  });
  // Glossy specular highlight arcs aligned cleanly to tilted dome center
  const [dcx, dcy] = cupPt(cx, cy, tilt, 0, -36);
  props.inkArc(ctx.r, dcx, dcy, 35, 31, Math.PI * 1.12, Math.PI * 1.46, tilt, { only: [lidId] });
  props.inkArc(ctx.r, dcx, dcy, 29, 25, Math.PI * 1.16, Math.PI * 1.38, tilt, { only: [lidId] });
  // Little straw entry slot ellipse at top of dome
  const [shx, shy] = cupPt(cx, cy, tilt, 4, -76);
  props.inkArc(ctx.r, shx, shy, 9, 2.5, 0, Math.PI, tilt, { only: [lidId] });

  // Thick cup rim collar separating dome and cup body
  const rimId = ctx.dyn('milkshake', 'Cup Rim Collar');
  const [rcx, rcy] = cupPt(cx, cy, tilt, 0, -35);
  roundedRect(ctx, rimId, rcx, rcy, 104, 11, 5, tilt);

  // 4) Floating tumbling crystal ice cubes in zero-G
  iceCube(ctx, ctx.dyn('prop', 'Floating Ice Cube A'), 194 + props.jit(rng, 0, 3), 82 + props.jit(rng, 0, 2), 18, 0.34);
  iceCube(ctx, ctx.dyn('prop', 'Floating Ice Cube B'), 322 + props.jit(rng, 0, 3), 96 + props.jit(rng, 0, 2), 16, -0.4);

  // 5) 10 Floating Tapioca Pearls (each its own dyn region, radius >= 7.5 so >= 130 px)
  const pearlSpecs: Array<[number, number, number, string]> = [
    [296, 42, 7.8, 'Straw-Tip Tapioca Pearl'],
    [238, 44, 8.2, 'Crown Tapioca Pearl'],
    [186, 52, 7.6, 'High-Drift Tapioca Pearl'],
    [328, 62, 7.8, 'Orbit Tapioca Pearl'],
    [184, 124, 8.4, 'Porthole-Side Tapioca Pearl'],
    [324, 144, 8.6, 'Cup-Side Tapioca Pearl'],
    [200, 204, 8.0, 'Swirl-Trail Tapioca Pearl'],
    [288, 226, 8.4, 'Base-Drift Tapioca Pearl'],
    [348, 166, 7.6, 'Teacup-Drift Tapioca Pearl'],
    [238, 232, 7.5, 'Lower-Orbit Tapioca Pearl'],
  ];
  for (const [px0, py0, pr, label] of pearlSpecs) {
    props.pearl(ctx, ctx.dyn('milkshake', label), px0 + props.jit(rng, 0, 2), py0 + props.jit(rng, 0, 2), pr);
  }

  // 6) Cozy floating mini teacup & saucer on the right for Moon-Cat to nap on!
  const tx = 418 + props.jit(rng, 0, 2);
  const ty = 176 + props.jit(rng, 0, 2);
  const saucerId = ctx.dyn('prop', 'Star Saucer');
  ctx.r.ellipse(saucerId, tx, ty + 15, 27, 6.5);
  props.inkArc(ctx.r, tx, ty + 15, 16, 3, 0, Math.PI, 0, { only: [saucerId] });

  const miniCupId = ctx.dyn('milkshake', 'Moon-Cat Teacup');
  // Cup handle loop on the right
  ctx.r.shape(miniCupId, tx + 13, ty - 8, tx + 28, ty + 8, (x, y) => {
    const d = Math.hypot((x - (tx + 18)) / 7.5, (y - ty) / 7);
    return d <= 1 && d >= 0.46;
  });
  // Rounded teacup bowl
  ctx.r.shape(miniCupId, tx - 20, ty - 11, tx + 20, ty + 14, (x, y) => {
    if (y < ty - 10 || y > ty + 13) return false;
    const t = (y - (ty - 10)) / 23;
    const hw = 18 * Math.sqrt(Math.max(0, 1 - t * t * 0.52));
    return Math.abs(x - tx) <= hw;
  });
  props.inkArc(ctx.r, tx, ty + 1, 13, 3.5, 0.15, Math.PI - 0.15, 0, { only: [miniCupId] });

  // Floating cosmic macaron with fluffy double cream filling lines on the upper-right café side
  const macId = ctx.dyn('milkshake', 'Cosmic Macaron');
  const mx = 446 + props.jit(rng, 0, 2);
  const my = 116 + props.jit(rng, 0, 2);
  ctx.r.ellipse(macId, mx, my, 13.5, 9, 0.22);
  const macTop = props.rot(
    [
      [mx - 12, my - 2],
      [mx + 12, my - 2],
    ],
    mx,
    my,
    0.22,
  );
  const macBot = props.rot(
    [
      [mx - 12, my + 2],
      [mx + 12, my + 2],
    ],
    mx,
    my,
    0.22,
  );
  ctx.r.line(0, (macTop[0] as Pt)[0], (macTop[0] as Pt)[1], (macTop[1] as Pt)[0], (macTop[1] as Pt)[1], { only: [macId] });
  ctx.r.line(0, (macBot[0] as Pt)[0], (macBot[0] as Pt)[1], (macBot[1] as Pt)[0], (macBot[1] as Pt)[1], { only: [macId] });

  // 7) Bright sky stars framing negative space
  props.star(ctx, ctx.dyn('star', 'Café Zenith Star'), 356 + props.jit(rng, 0, 2), 40 + props.jit(rng, 0, 2), 10, {
    points: 5,
    inner: 0.48,
  });
  props.twinkle(ctx, ctx.dyn('star', 'Station Lower Twinkle'), 26 + props.jit(rng, 0, 2), 170 + props.jit(rng, 0, 2), 9.5);

  // 8) Fluffy whipped-cream clouds (canonical 14 + 15, clean above bottom 16px margin)
  const cloudA = ctx.canon(14, 'Whipped-Cream Cloud', 'cloud');
  props.puffyCloud(ctx, cloudA, 128 + props.jit(rng, 0, 3), 224 + props.jit(rng, 0, 2), 104, 32, true);

  const cloudB = ctx.canon(15, 'Sweet Cream Cloud', 'cloud');
  props.puffyCloud(ctx, cloudB, 396 + props.jit(rng, 0, 3), 224 + props.jit(rng, 0, 2), 108, 32, true);

  // 9) 2 Hidden constellation-creature ghosts on clean sky (234..235)
  ghostJellyfish(ctx, ctx.ghost('Constellation Boba-Jelly'), 436, 56, 14.5);
  ghostMoonMoth(ctx, ctx.ghost('Constellation Sugar-Moth'), 44, 214, 13.5);

  // 10) Delicate sky sparkles (inside porthole & station sky)
  const sparkles: readonly Pt[] = [
    [px - 28, py + 24], [px + 30, py - 24], [px + 8, py - 36],
    [164, 28], [268, 22], [392, 24], [466, 86], [20, 34], [18, 120],
    [194, 242], [326, 240], [462, 186],
  ];
  for (let i = 0; i < sparkles.length; i++) {
    const p = sparkles[i] as Pt;
    skySparkle(ctx, p[0] + props.jit(rng, 0, 1.5), p[1] + props.jit(rng, 0, 1.5), i % 3 === 0 ? 2 : 1);
  }

  // 11) Paths: orbit around giant cup, ring around porthole planet, bottom margin
  const orbitPathIdx = ctx.ellipsePath('orbit', cx + 10, cy - 8, 96, 76, 28, -0.06);
  ctx.ellipsePath('ring', px + 2, py + 4, pInfo.rx * 0.85, pInfo.ry * 0.85, 24, pInfo.tilt);
  ctx.marginPath(254);

  // 12) Actors: Violet floating, Moon-Cat napping on mini teacup, Comet gliding overhead
  ctx.actor('violet', 378, 124, { facing: -1, anim: 'float', frame: 0, pathIndex: orbitPathIdx });
  ctx.actor('moonCat', tx, ty - 10, { facing: -1, anim: 'sleep', frame: 0 });
  ctx.actor('comet', 208, 32, { facing: 1, anim: 'float', frame: 0, pathIndex: orbitPathIdx });
}
