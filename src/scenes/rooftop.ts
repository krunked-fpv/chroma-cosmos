/**
 * Chapter 1: Violet's Rooftop Launchpad
 * Violet in pajamas + helmet sketching a paper rocket on a cozy twilight rooftop,
 * Lumi curled asleep on a starlight blanket, Nova napping atop the brick chimney,
 * ringed planet, two dreamy clouds, sleepy moon-cat nestled in a crescent, and a comet.
 */
import type { SceneCtx } from './context';
import { crescent, inkArc, jit, paperRocket, puffyCloud, ringedPlanet, star, twinkle } from './props';
import { W, type Pt } from './raster';

export function buildRooftop(ctx: SceneCtx): void {
  const { r, rng } = ctx;
  ctx.title = "Violet's Rooftop Launchpad";
  ctx.sky = { top: '#17113b', bottom: '#4c2c7a', mist: '#6b5b8a' };
  ctx.focal = { x: 205, y: 175 };

  // 1) Twilight sky accents: subtle 1px ink sparkle crosses in open sky
  for (let i = 0; i < 16; i++) {
    const sx = rng.int(16, 464);
    const sy = rng.int(12, 148);
    r.dot(0, sx, sy);
    if (i % 3 === 0) {
      r.dot(0, sx - 1, sy);
      r.dot(0, sx + 1, sy);
      r.dot(0, sx, sy - 1);
      r.dot(0, sx, sy + 1);
    }
  }

  // 2) Ghost constellation creatures in open twilight sky (revealed by UV Flashlight)
  const ghostOwl = ctx.ghost('Starlight Owl Ghost');
  const gox = Math.round(jit(rng, 294, 4));
  const goy = Math.round(jit(rng, 114, 3));
  r.ellipse(ghostOwl, gox, goy + 4, 10, 12);
  r.poly(ghostOwl, [[gox - 9, goy - 4], [gox - 5, goy - 13], [gox - 1, goy - 6]]);
  r.poly(ghostOwl, [[gox + 9, goy - 4], [gox + 5, goy - 13], [gox + 1, goy - 6]]);
  r.dot(0, gox - 3, goy - 1, { only: [ghostOwl] });
  r.dot(0, gox + 3, goy - 1, { only: [ghostOwl] });
  r.line(0, gox, goy + 1, gox, goy + 3, { only: [ghostOwl] });

  const ghostBunny = ctx.ghost('Constellation Bunny Ghost');
  const gbx = Math.round(jit(rng, 142, 4));
  const gby = Math.round(jit(rng, 126, 3));
  r.ellipse(ghostBunny, gbx, gby + 5, 11, 8);
  r.ellipse(ghostBunny, gbx + 7, gby - 1, 6, 5);
  r.ellipse(ghostBunny, gbx + 4, gby - 10, 2.6, 7, -0.2);
  r.ellipse(ghostBunny, gbx + 9, gby - 10, 2.6, 7, 0.2);
  r.disc(ghostBunny, gbx - 10, gby + 5, 3.5);
  r.dot(0, gbx + 9, gby - 2, { only: [ghostBunny] });

  // 3) Ringed planet (core 12 + rings 13) in upper-right twilight sky
  const px = Math.round(jit(rng, 366, 6));
  const py = Math.round(jit(rng, 58, 4));
  const planet = ringedPlanet(ctx, px, py, 24, {
    coreId: ctx.canon(12),
    ringId: ctx.canon(13),
    tilt: -0.26,
    ringW: 2.1,
    ringH: 0.62,
  });

  // 4) Two dreamy clouds (14 & 15)
  puffyCloud(ctx, ctx.canon(14), Math.round(jit(rng, 108, 6)), Math.round(jit(rng, 56, 3)), 84, 32);
  puffyCloud(ctx, ctx.canon(15), Math.round(jit(rng, 244, 6)), Math.round(jit(rng, 44, 3)), 74, 28);

  // 5) Crescent moon cradle on upper-left (for the sleepy moon-cat actor!)
  const moonId = ctx.dyn('star', 'Crescent Moon');
  const mx = Math.round(jit(rng, 60, 3));
  const my = Math.round(jit(rng, 106, 3));
  crescent(ctx, moonId, mx, my, 27, -0.52);

  // 6) Chunky storybook stars in the sky (>=60px each)
  star(ctx, ctx.dyn('star', 'Twilight Star'), Math.round(jit(rng, 274, 4)), Math.round(jit(rng, 82, 3)), 11, { rot: -0.4 });
  twinkle(ctx, ctx.dyn('star', 'North Twinkle'), Math.round(jit(rng, 442, 4)), Math.round(jit(rng, 98, 3)), 12);
  star(ctx, ctx.dyn('star', 'Wishing Star'), Math.round(jit(rng, 180, 4)), Math.round(jit(rng, 30, 3)), 10, { rot: 0.2 });

  // 7) Distant twilight neighborhood hills + cozy gables along skyline (back layer)
  const hillL = ctx.dyn('prop', 'Distant Twilight Hill');
  const hlPts: Pt[] = [[0, 218]];
  for (let x = 0; x <= 250; x += 10) {
    hlPts.push([x, 184 - Math.sin((x / 250) * Math.PI) * 20 - Math.sin(x * 0.04) * 5]);
  }
  hlPts.push([250, 224], [0, 224]);
  r.poly(hillL, hlPts);
  // Little distant cozy cottage roof silhouette on left hill
  const cottageId = ctx.dyn('prop', 'Neighbor Gables');
  r.poly(cottageId, [[22, 184], [42, 164], [62, 184], [62, 206], [22, 206]]);
  // Delicate hand-inked window cross on cottage
  r.line(0, 36, 185, 48, 185, { only: [cottageId] });
  r.line(0, 36, 195, 48, 195, { only: [cottageId] });
  r.line(0, 36, 185, 36, 195, { only: [cottageId] });
  r.line(0, 48, 185, 48, 195, { only: [cottageId] });
  r.line(0, 42, 185, 42, 195, { only: [cottageId] });
  r.line(0, 36, 190, 48, 190, { only: [cottageId] });

  const hillR = ctx.dyn('prop', 'Observatory Hill');
  const hrPts: Pt[] = [[186, 224]];
  for (let x = 186; x <= W; x += 10) {
    hrPts.push([x, 206 - Math.sin(((x - 186) / (W - 186)) * Math.PI) * 32]);
  }
  hrPts.push([W, 224]);
  r.poly(hillR, hrPts);

  // Distant observatory dome peeking over right hill
  const obsId = ctx.dyn('prop', 'Star Observatory Dome');
  r.ellipse(obsId, 326, 184, 18, 16);
  r.rect(obsId, 308, 184, 344, 204);
  inkArc(r, 326, 184, 13, 13, Math.PI * 1.1, Math.PI * 1.9, 0, { only: [obsId] });

  // 8) Brick Chimney Stack on the right (where Nova naps!)
  const chimneyStack = ctx.dyn('prop', 'Warm Brick Chimney');
  const chimneyCap = ctx.dyn('prop', 'Chimney Ledge');
  const cxm = 398;
  r.poly(chimneyStack, [[cxm - 30, 174], [cxm + 30, 174], [cxm + 34, 232], [cxm - 34, 232]]);
  // Cozy hand-inked brick courses
  for (let by = 182; by <= 222; by += 8) {
    r.line(0, cxm - 32, by, cxm + 32, by, { only: [chimneyStack] });
    const off = ((by / 8) | 0) % 2 ? 8 : 0;
    for (let bx = cxm - 22 + off; bx <= cxm + 24; bx += 16) {
      r.line(0, bx, by, bx, by + 8, { only: [chimneyStack] });
    }
  }
  // Flared chimney cap ledge
  r.poly(chimneyCap, [[cxm - 38, 164], [cxm + 38, 164], [cxm + 34, 175], [cxm - 34, 175]]);

  // 9) Main slanted storybook rooftop terrace (leaves bottom ~16px margin clean for flower rain!)
  const roofDeck = ctx.dyn('prop', 'Shingled Rooftop');
  const roofTrim = ctx.dyn('prop', 'Rooftop Eaves');
  r.poly(roofDeck, [
    [0, 206],
    [136, 198],
    [354, 198],
    [W, 208],
    [W, 246],
    [0, 246],
  ]);
  // Hand-inked scalloped roof shingles
  for (let sy = 212; sy <= 238; sy += 9) {
    const off = ((sy / 9) | 0) % 2 ? 10 : 0;
    for (let sx = 8 + off; sx < W - 8; sx += 20) {
      inkArc(r, sx, sy, 9, 4, 0.15, Math.PI - 0.15, 0, { only: [roofDeck] });
    }
  }
  // Clean wooden eave fascia trim right above the flower-rain margin (y=246..255)
  r.rect(roofTrim, 0, 246, W, 255);
  for (let sx = 18; sx < W; sx += 28) {
    r.line(0, sx, 246, sx, 254, { only: [roofTrim] });
  }

  // 10) Cozy rooftop skylight window on the left
  const skyFrame = ctx.dyn('prop', 'Skylight Frame');
  const skyGlass = ctx.dyn('prop', 'Skylight Window');
  r.poly(skyFrame, [[34, 210], [98, 210], [106, 240], [26, 240]]);
  r.poly(skyGlass, [[40, 215], [92, 215], [98, 235], [34, 235]]);
  r.line(0, 66, 215, 66, 235, { only: [skyGlass] });
  r.line(0, 36, 225, 96, 225, { only: [skyGlass] });

  // 11) Starlight picnic blanket under Lumi (drawn on roof deck so removing Lumi reveals blanket)
  const blanketId = ctx.dyn('prop', 'Starlight Blanket');
  r.poly(blanketId, [[232, 210], [326, 210], [336, 236], [224, 236]]);
  // Cozy stitch lines along blanket edge
  r.line(0, 234, 214, 324, 214, { only: [blanketId] });
  r.line(0, 228, 232, 332, 232, { only: [blanketId] });

  // 12) Open Sketchbook on the rooftop beside Violet
  const bookId = ctx.dyn('prop', 'Sketchbook Pages');
  r.poly(bookId, [[154, 224], [184, 220], [190, 236], [158, 240]]);
  r.line(0, 170, 222, 174, 238, { only: [bookId] });
  r.line(0, 160, 228, 168, 227, { only: [bookId] });
  r.line(0, 176, 226, 184, 225, { only: [bookId] });

  // 13) Folded Paper Rocket (canonical 21 + fins + porthole window) leaning on launchpad crate!
  const rocketId = ctx.canon(21, 'Paper Rocket');
  const rocketFins = ctx.dyn('rocket', 'Rocket Fins');
  const rocketWin = ctx.dyn('rocket', 'Rocket Porthole');
  paperRocket(ctx, rocketId, rocketFins, rocketWin, 198, 194, 32, 0.16);

  // 14) Paths for living actors & causality
  const ringPath = ctx.ellipsePath('ring', px, py, planet.rx, planet.ry, 24, planet.tilt);
  const gallopPath = ctx.wavePath('gallop', 88, 130, 366, 86, 20, 1.5, 20);
  const sprintPath = ctx.wavePath('sprint', 60, 222, 420, 218, 12, 1.5, 18);
  const orbitPath = ctx.ellipsePath('orbit', 240, 96, 178, 56, 28, -0.06);
  ctx.marginPath(260);
  void ringPath;

  // 15) Actors (feet anchor = bottom-centre of sprite canvas; well separated, zero overlap!)
  // Violet standing on rooftop sketching her paper rocket (facing right)
  ctx.actor('violet', 132, 232, { facing: 1, anim: 'idle', frame: 0 });
  // Lumi curled asleep on the starlight blanket
  ctx.actor('lumi', 280, 230, { facing: 1, anim: 'sleep', frame: 0, pathIndex: gallopPath });
  // Nova napping peacefully atop the brick chimney cap (facing left toward Violet & Lumi)
  ctx.actor('nova', cxm, 167, { facing: -1, anim: 'sleep', frame: 0, pathIndex: sprintPath });
  // Sleepy moon-cat curled snugly in the crescent moon
  ctx.actor('moonCat', mx + 8, my + 16, { facing: 1, anim: 'sleep', frame: 0 });
  // Rainbow comet streaking through the upper sky
  ctx.actor('comet', Math.round(jit(rng, 212, 6)), Math.round(jit(rng, 92, 4)), { facing: 1, anim: 'float', frame: 0, pathIndex: orbitPath });
}
