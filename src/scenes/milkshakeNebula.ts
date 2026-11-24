/**
 * Chapter 2A: The Rainbow Milkshake Nebula — "A swirly, sip-able sky"
 * Sweeping spiral nebula ribbons, giant cosmic milkshake + companion sundae scoop,
 * whipped-cream clouds, candy ringed planet, stars/sprinkles/twinkles, Violet floating + comet, 3 ghosts.
 */
import type { SceneCtx } from './context';
import { inkArc, jit, milkshake, pearl, puffyCloud, ringedPlanet, rot, star, twinkle } from './props';
import { W, type Pt } from './raster';
import {
  candySprinkle,
  fillBand,
  ghostBird,
  ghostJellyfish,
  ghostKitten,
  inkPolyline,
  inkSparkle,
  quadPts,
} from './a-helpers';

export function buildMilkshakeNebula(ctx: SceneCtx): void {
  const r = ctx.r;
  const rng = ctx.rng;

  ctx.title = 'The Rainbow Milkshake Nebula';
  ctx.sky = { top: '#23134a', bottom: '#6a3185', mist: '#b56dc4' };

  const msX = Math.round(jit(rng, 248, 4));
  const msBaseY = Math.round(jit(rng, 218, 3));
  ctx.focal = { x: msX, y: msBaseY - 70 };

  // 1) Sweeping spiral nebula ribbons (5 distinct colourable swirl bands, back-to-front)
  const wavePhase = rng.range(-0.14, 0.14);
  const centerY = (x: number): number => {
    const t = x / W;
    const smooth = t * t * (3 - 2 * t);
    // Flows smoothly from lower-left (~188) up past milkshake (~134) and curls gracefully across right (~98)
    const sweep = 188 - 90 * smooth;
    const curl = Math.sin(t * Math.PI * 2.05 + wavePhase) * 18;
    return sweep + curl;
  };
  const bandWidths = [15, 16, 17, 16, 15] as const;
  const totalW = bandWidths.reduce((a, b) => a + b, 0);
  const ribbonLabels = [
    'Strawberry Swirl Ribbon',
    'Peach Cream Ribbon',
    'Lemon Starlight Ribbon',
    'Mint Galaxy Ribbon',
    'Berry Velvet Ribbon',
  ] as const;

  let acc = -totalW / 2;
  for (let b = 0; b < bandWidths.length; b++) {
    const wBand = bandWidths[b] as number;
    const offTop = acc;
    const offBot = acc + wBand;
    acc += wBand;
    const kind = b % 2 === 0 ? 'prop' : 'milkshake';
    const bandId = ctx.dyn(kind, ribbonLabels[b] as string);
    const scaleAt = (x: number): number => {
      const t = x / W;
      return 0.8 + 0.25 * Math.sin(Math.PI * t);
    };
    fillBand(
      r,
      bandId,
      0,
      W,
      30,
      244,
      (x) => Math.min(242, centerY(x) + offTop * scaleAt(x)),
      (x) => Math.min(244, centerY(x) + offBot * scaleAt(x)),
    );
    // Whimsical broken storybook swirl strokes (not dense full-width stripes)
    const midOff = (offTop + offBot) * 0.5;
    const segments: Array<[number, number]> = b % 2 === 0
      ? [[16, 76], [174, 214], [326, 392], [434, 470]]
      : [[96, 152], [292, 344], [398, 456]];
    for (const [xa, xb] of segments) {
      const segPts: Pt[] = [];
      for (let x = xa; x <= xb; x += 8) {
        segPts.push([x, centerY(x) + midOff * scaleAt(x) + Math.sin(x * 0.055 + b) * 1.4]);
      }
      inkPolyline(r, segPts, bandId);
    }
  }

  // 2) Candy Ringed Planet (canonical 12 + 13) in upper-left sky
  const px = Math.round(jit(rng, 82, 4));
  const py = Math.round(jit(rng, 60, 3));
  const pCore = ctx.canon(12, 'Candy Ringed Planet');
  const pRing = ctx.canon(13, 'Candy Planet Rings');
  const planet = ringedPlanet(ctx, px, py, 24, {
    tilt: -0.26 + rng.range(-0.04, 0.04),
    coreId: pCore,
    ringId: pRing,
    ringW: 2.08,
    ringH: 0.58,
  });
  inkSparkle(r, px - 8, py - 9, 2.5, pCore);
  inkSparkle(r, px + 9, py + 7, 2.0, pCore);

  // 3) Whipped-cream fluffy clouds (canonical 14 + 15) framing lower-left & lower-right
  const cloudA = ctx.canon(14, 'Whipped-Cream Cloud');
  const cloudB = ctx.canon(15, 'Strawberry Dream Cloud');
  puffyCloud(ctx, cloudA, Math.round(jit(rng, 82, 4)), Math.round(jit(rng, 212, 3)), 114, 42, true);
  puffyCloud(ctx, cloudB, Math.round(jit(rng, 400, 4)), Math.round(jit(rng, 208, 3)), 108, 38, true);

  // 4) Companion Mini Cosmic Swirl Sundae floating right-of-center
  const sx = Math.round(jit(rng, 366, 4));
  const sy = Math.round(jit(rng, 152, 3));
  const sTilt = 0.16 + rng.range(-0.04, 0.04);
  const miniCup = ctx.dyn('milkshake', 'Mini Sundae Cup');
  const miniScoop = ctx.dyn('milkshake', 'Nebula Swirl Scoop');
  const miniWafer = ctx.dyn('star', 'Star Wafer Cookie');

  // Fluted sundae cup
  const cupPts: Pt[] = [
    [sx - 18, sy - 6],
    [sx + 18, sy - 6],
    [sx + 11, sy + 20],
    [sx - 11, sy + 20],
  ];
  r.poly(miniCup, rot(cupPts, sx, sy, sTilt));
  const cupBase = rot([[sx, sy + 20]], sx, sy, sTilt)[0] as Pt;
  r.ellipse(miniCup, cupBase[0], cupBase[1], 11.5, 4.0, sTilt);
  for (const fx of [-8, 0, 8]) {
    const seg = rot([[sx + fx, sy - 2], [sx + fx * 0.65, sy + 16]], sx, sy, sTilt);
    r.line(0, (seg[0] as Pt)[0], (seg[0] as Pt)[1], (seg[1] as Pt)[0], (seg[1] as Pt)[1], { only: [miniCup] });
  }
  // Plump swirled soft-serve scoop with cute pointed curl peak
  const sc1 = rot([[sx, sy - 11]], sx, sy, sTilt)[0] as Pt;
  const sc2 = rot([[sx, sy - 21]], sx, sy, sTilt)[0] as Pt;
  const sc3 = rot([[sx - 2, sy - 29]], sx, sy, sTilt)[0] as Pt;
  r.ellipse(miniScoop, sc1[0], sc1[1], 20, 9.5, sTilt);
  r.ellipse(miniScoop, sc2[0], sc2[1], 13.5, 8.0, sTilt);
  r.ellipse(miniScoop, sc3[0], sc3[1], 6.5, 5.2, sTilt - 0.3);
  inkArc(r, sc1[0], sc1[1] - 1, 13, 4.8, Math.PI * 1.1, Math.PI * 1.9, sTilt, { only: [miniScoop] });
  inkArc(r, sc2[0], sc2[1] - 1, 7.5, 4.0, Math.PI * 1.05, Math.PI * 1.95, sTilt, { only: [miniScoop] });

  // Star wafer cookie perched boldly on the upper-right of the scoop (guaranteed >= 150px!)
  const waferC = rot([[sx + 18, sy - 25]], sx, sy, sTilt)[0] as Pt;
  star(ctx, miniWafer, waferC[0], waferC[1], 13.5, { points: 5, inner: 0.48, rot: -0.25 + sTilt });
  r.dot(0, waferC[0], waferC[1], { only: [miniWafer] });

  // 5) Hero Giant Cosmic Milkshake (canonical 18 via props.milkshake)
  const msW = 78;
  const msH = 104;
  const topY = msBaseY - msH;
  const msId = ctx.canon(18, 'Cosmic Milkshake');
  const ms = milkshake(ctx, msId, msX, msBaseY, msW, msH);

  // Reinforce bendy striped straw emerging cleanly out of the whipped cream
  const strawStart: Pt = [msX + msW * 0.16, topY - msH * 0.24];
  const strawBend: Pt = [msX + msW * 0.35, topY - msH * 0.56];
  const strawTip: Pt = [msX + msW * 0.6, topY - msH * 0.48];
  r.capsule(ms.straw, strawStart[0], strawStart[1], strawBend[0], strawBend[1], 4.3, { skip: [ms.cream, ms.cherry, msId] });
  r.capsule(ms.straw, strawBend[0], strawBend[1], strawTip[0], strawTip[1], 4.1);
  for (let i = 1; i <= 3; i++) {
    const t = i / 4;
    const bx = strawStart[0] + (strawBend[0] - strawStart[0]) * t;
    const by = strawStart[1] + (strawBend[1] - strawStart[1]) * t;
    r.line(0, bx - 4, by - 2, bx + 4, by + 2, { only: [ms.straw] });
  }
  r.line(0, strawBend[0] + 7, strawBend[1] - 3, strawBend[0] + 5, strawBend[1] + 6, { only: [ms.straw] });
  r.line(0, strawBend[0] + 13, strawBend[1] - 1, strawBend[0] + 11, strawBend[1] + 8, { only: [ms.straw] });

  // Reinforce soda-fountain pedestal foot + stem
  r.capsule(ms.foot, msX, msBaseY - 12, msX, msBaseY - 2, 7.5, { skip: [msId] });
  r.ellipse(ms.foot, msX, msBaseY - 1, msW * 0.34, 4.8);
  inkArc(r, msX, msBaseY - 1, msW * 0.22, 2.2, 0.2, Math.PI - 0.2, 0, { only: [ms.foot] });

  // Juicier cherry + glossy highlight
  const cherryX = msX - msW * 0.06;
  const cherryY = topY - msH * 0.47;
  r.disc(ms.cherry, cherryX, cherryY, 8.4);
  inkArc(r, cherryX - 2, cherryY - 2, 3.2, 2.8, Math.PI * 1.0, Math.PI * 1.75, 0, { only: [ms.cherry] });

  // Clean curved glossy glass reflection + fizzy bubbles inside glass 18 (no grid cross-lines!)
  const gloss = quadPts([msX - msW * 0.34, topY + 12], [msX - msW * 0.31, topY + msH * 0.45], [msX - msW * 0.23, msBaseY - 18], 14);
  inkPolyline(r, gloss, msId);
  inkSparkle(r, msX - 8, topY + 20, 3, msId);
  inkSparkle(r, msX + 14, topY + 52, 2.5, msId);
  inkArc(r, msX - 4, topY + 76, 4.5, 4.5, 0, Math.PI * 2, 0, { only: [msId] });
  inkArc(r, msX + 9, topY + 84, 3.0, 3.0, 0, Math.PI * 2, 0, { only: [msId] });

  // Whipped-cream swirl curls
  inkArc(r, msX - 15, topY - 4, 11, 5, Math.PI * 1.1, Math.PI * 1.9, 0, { only: [ms.cream] });
  inkArc(r, msX + 13, topY - 18, 9, 4.5, Math.PI * 1.1, Math.PI * 1.9, 0, { only: [ms.cream] });

  // 6) Floating candy stars, twinkles, sprinkles & fizzy pearls (clean open sky spacing)
  star(ctx, ctx.dyn('star', 'Sugar Star'), Math.round(jit(rng, 38, 3)), Math.round(jit(rng, 122, 3)), 13, { points: 5, inner: 0.48, rot: -0.4 });
  star(ctx, ctx.dyn('star', 'Vanilla Star'), Math.round(jit(rng, 434, 3)), Math.round(jit(rng, 34, 2)), 12.5, { points: 5, inner: 0.48, rot: 0.2 });
  star(ctx, ctx.dyn('star', 'Berry Star'), Math.round(jit(rng, 184, 3)), Math.round(jit(rng, 88, 3)), 11, { points: 5, inner: 0.5, rot: 0.1 });

  twinkle(ctx, ctx.dyn('star', 'Sparkle Twinkle'), Math.round(jit(rng, 304, 3)), Math.round(jit(rng, 194, 3)), 13.5);
  twinkle(ctx, ctx.dyn('star', 'Sky Twinkle'), Math.round(jit(rng, 378, 3)), Math.round(jit(rng, 32, 2)), 12.5);

  candySprinkle(ctx, ctx.dyn('milkshake', 'Rainbow Sprinkle'), Math.round(jit(rng, 186, 3)), Math.round(jit(rng, 194, 3)), 18, 4.8, -0.48);
  candySprinkle(ctx, ctx.dyn('milkshake', 'Mint Sprinkle'), Math.round(jit(rng, 444, 3)), Math.round(jit(rng, 98, 3)), 17, 4.8, 0.52);

  pearl(ctx, ctx.dyn('milkshake', 'Fizzy Milkshake Bubble'), Math.round(jit(rng, 194, 3)), Math.round(jit(rng, 144, 3)), 9);
  pearl(ctx, ctx.dyn('milkshake', 'Creamy Star Bubble'), Math.round(jit(rng, 314, 3)), Math.round(jit(rng, 126, 3)), 8.5);

  // 7) Hidden constellation ghosts (3 ghosts in guaranteed pure SKY pockets)
  ghostJellyfish(ctx, 'Constellation Milkshake-Jelly', Math.round(jit(rng, 174, 3)), Math.round(jit(rng, 40, 2)), 1.0);
  ghostKitten(ctx, 'Constellation Cream-Kitten', Math.round(jit(rng, 250, 3)), Math.round(jit(rng, 238, 2)), 0.95);
  ghostBird(ctx, 'Constellation Sugar-Bird', Math.round(jit(rng, 444, 3)), Math.round(jit(rng, 156, 3)), 0.95, true);

  // 8) Paths: planet ring, sweeping milkshake orbit, comet arc, clean bottom margin
  ctx.ellipsePath('ring', px, py, planet.rx * 1.18, planet.ry * 1.4, 24, planet.tilt);
  const orbitIdx = ctx.ellipsePath('orbit', msX, msBaseY - 72, 126, 70, 28, -0.14);
  const cometPathIdx = ctx.wavePath('orbit', 292, 54, 456, 48, 12, 1.2, 16);
  ctx.marginPath(256);

  // 9) Actors: Violet floating joyfully on the left, Rainbow Comet streaking upper-right
  ctx.actor('violet', 142, 168, { facing: 1, anim: 'float', pathIndex: orbitIdx });
  ctx.actor('comet', 328, 60, { facing: 1, anim: 'float', pathIndex: cometPathIdx });
}
