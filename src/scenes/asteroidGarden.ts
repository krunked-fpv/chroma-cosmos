/**
 * Chapter 2B: The Whispering Asteroid Garden — "Crystal rocks that hum secrets"
 * Layered floating garden islands, crystal asteroid clusters (id 20 first), crystal blooms,
 * glowing mushrooms, trailing vines, Moon-Cat peeking on a rock, Lumi rearing near the bridge,
 * ringed planet 12/13 + clouds 14/15, gallop + orbit + ring + margin paths, 3 ghosts.
 */
import type { SceneCtx } from './context';
import { crystalAsteroid, jit, puffyCloud, ringedPlanet, star, twinkle } from './props';
import {
  crystalBloom,
  floatingIsland,
  ghostKitten,
  ghostMoth,
  ghostOwl,
  glowMushroom,
  inkPolyline,
  quadPts,
  smoothBoulder,
  trailingVine,
} from './a-helpers';

export function buildAsteroidGarden(ctx: SceneCtx): void {
  const r = ctx.r;
  const rng = ctx.rng;

  ctx.title = 'The Whispering Asteroid Garden';
  ctx.sky = { top: '#13193e', bottom: '#2d3f72', mist: '#6ba6c4' };
  ctx.focal = { x: 234, y: 154 };

  // 1) Ringed Planet (canonical 12 + 13) in upper-right sky
  const px = Math.round(jit(rng, 390, 4));
  const py = Math.round(jit(rng, 56, 3));
  const pCore = ctx.canon(12, 'Whispering Ringed Planet');
  const pRing = ctx.canon(13, 'Stardust Planet Rings');
  const planet = ringedPlanet(ctx, px, py, 24, {
    tilt: 0.24 + rng.range(-0.04, 0.04),
    coreId: pCore,
    ringId: pRing,
    ringW: 2.05,
    ringH: 0.58,
  });

  // 2) Fluffy Nebula Clouds (canonical 14 + 15)
  const cloudA = ctx.canon(14, 'Starlight Mist Cloud');
  const cloudB = ctx.canon(15, 'Garden Drift Cloud');
  puffyCloud(ctx, cloudA, Math.round(jit(rng, 80, 4)), Math.round(jit(rng, 50, 3)), 98, 32, true);
  puffyCloud(ctx, cloudB, Math.round(jit(rng, 412, 4)), Math.round(jit(rng, 228, 2)), 98, 32, true);

  // 3) Distant upper floating crystal spire for airy vertical depth
  const highSpire = ctx.dyn('asteroid', 'Floating Crystal Spire');
  crystalAsteroid(ctx, highSpire, Math.round(jit(rng, 164, 4)), Math.round(jit(rng, 74, 3)), 17, -0.22);

  // 4) Asymmetric Layered Floating Garden Islands (tiered West Terrace, Central Bridge, Lush East Garden)
  const wx = Math.round(jit(rng, 96, 3));
  const wy = Math.round(jit(rng, 152, 2));
  const westRock = ctx.dyn('asteroid', 'West Asteroid Base');
  const westMoss = ctx.dyn('flora', 'West Moss Terrace');
  floatingIsland(ctx, westRock, westMoss, wx, wy, 140, 46, -0.5);

  const ex = Math.round(jit(rng, 378, 3));
  const ey = Math.round(jit(rng, 162, 2));
  const eastRock = ctx.dyn('asteroid', 'East Asteroid Base');
  const eastMoss = ctx.dyn('flora', 'East Garden Moss');
  floatingIsland(ctx, eastRock, eastMoss, ex, ey, 158, 48, 0.5);

  // Central Asteroid Bridge (arched landing asteroid + two organic flanking stepping stones)
  const bx = Math.round(jit(rng, 232, 3));
  const by = Math.round(jit(rng, 182, 2));
  const bridgeId = ctx.dyn('asteroid', 'Whispering Bridge Arch');
  r.shape(bridgeId, bx - 52, by - 14, bx + 52, by + 24, (x, y) => {
    const u = (x - bx) / 50;
    if (Math.abs(u) > 1) return false;
    const archTop = by - 9 + u * u * 5;
    const archBot = by + 16 - u * u * 10 + Math.sin(u * Math.PI * 3.2) * 2.0;
    return y >= archTop && y <= archBot;
  });
  inkPolyline(r, quadPts([bx - 36, by - 1], [bx, by - 5], [bx + 36, by - 1], 14), bridgeId);
  inkPolyline(r, quadPts([bx - 22, by + 7], [bx, by + 4], [bx + 22, by + 7], 12), bridgeId);

  const stepL = ctx.dyn('asteroid', 'West Stepping Asteroid');
  smoothBoulder(ctx, stepL, bx - 58, by - 12, 16, 9.5, -0.16);

  const stepR = ctx.dyn('asteroid', 'East Stepping Asteroid');
  smoothBoulder(ctx, stepR, bx + 58, by - 8, 16, 9.5, 0.14);

  // 5) Trailing Star-Vines draped cleanly from island undersides (clear of Cloud B & y<246)
  trailingVine(ctx, ctx.dyn('flora', 'West Star-Vine'), wx - 16, wy + 26, 48, -10);
  trailingVine(ctx, ctx.dyn('flora', 'Bridge Star-Vine'), bx, by + 12, 42, 9);
  trailingVine(ctx, ctx.dyn('flora', 'East Star-Vine'), ex - 44, ey + 26, 44, -9);

  // 6) Hero Crystal Asteroid Cluster (canonical id 20) + East Crystal Cluster
  const mainCrystal = ctx.canon(20, 'Crystal Asteroid');
  crystalAsteroid(ctx, mainCrystal, wx - 42, wy - 24, 25, -0.15);

  const eastCrystal = ctx.dyn('asteroid', 'Amethyst Crystal Cluster');
  crystalAsteroid(ctx, eastCrystal, ex + 52, ey - 26, 22, 0.18);

  // Cozy mossy organic boulder on West Island for Moon-Cat to peek over
  const catRock = ctx.dyn('asteroid', 'Moon-Cat Perch Rock');
  const rockX = wx + 26;
  const rockY = wy - 4;
  smoothBoulder(ctx, catRock, rockX, rockY, 18, 10, -0.06);

  // 7) Graceful Crystal Blooms & Storybook Glowing Mushrooms
  crystalBloom(ctx, ctx.dyn('flora', 'Whisper Crystal Bloom'), wx + 50, wy - 2, 28, 0.22);
  crystalBloom(ctx, ctx.dyn('flora', 'Starlight Lotus Bloom'), ex - 46, ey - 2, 32, -0.2);
  crystalBloom(ctx, ctx.dyn('flora', 'Prism Petal Bloom'), ex + 10, ey - 5, 35, 0.15);

  glowMushroom(ctx, ctx.dyn('flora', 'West Glowcap Mushroom'), wx - 6, wy - 3, 25, 21, -0.22);
  glowMushroom(ctx, ctx.dyn('flora', 'Lantern Glowcap Mushroom'), ex - 18, ey - 4, 27, 23, 0.2);
  glowMushroom(ctx, ctx.dyn('flora', 'Crystal Dew Mushroom'), ex + 30, ey - 3, 22, 18, 0.26);

  // 8) Sky Stars & Twinkles in clean open space
  star(ctx, ctx.dyn('star', 'Garden North Star'), Math.round(jit(rng, 212, 3)), Math.round(jit(rng, 42, 3)), 12, { points: 5, inner: 0.48 });
  star(ctx, ctx.dyn('star', 'Whisper Star'), Math.round(jit(rng, 38, 3)), Math.round(jit(rng, 226, 3)), 11.5, { points: 5, inner: 0.48, rot: 0.25 });
  star(ctx, ctx.dyn('star', 'Orion Dew Star'), Math.round(jit(rng, 448, 3)), Math.round(jit(rng, 100, 3)), 11, { points: 5, inner: 0.5, rot: -0.2 });
  twinkle(ctx, ctx.dyn('star', 'Crystal Twinkle'), Math.round(jit(rng, 102, 3)), Math.round(jit(rng, 98, 3)), 13);
  twinkle(ctx, ctx.dyn('star', 'Moonlight Twinkle'), Math.round(jit(rng, 282, 3)), Math.round(jit(rng, 230, 3)), 12.5);

  // 9) Hidden Constellation Ghosts (3 ghosts in guaranteed pure SKY pockets)
  ghostOwl(ctx, 'Constellation Garden-Owl', Math.round(jit(rng, 264, 3)), Math.round(jit(rng, 46, 3)), 1.0);
  ghostMoth(ctx, 'Constellation Crystal-Moth', Math.round(jit(rng, 312, 3)), Math.round(jit(rng, 98, 3)), 1.0, -0.18);
  ghostKitten(ctx, 'Constellation Pebble-Cat', Math.round(jit(rng, 156, 3)), Math.round(jit(rng, 228, 3)), 0.95);

  // 10) Paths: gallop across tiered islands + bridge, orbit around garden, ring around planet, margin
  const gallopIdx = ctx.addPath(
    'gallop',
    [
      [wx - 22, wy - 6],
      [wx + 30, wy - 8],
      [bx - 58, by - 18],
      [bx, by - 10],
      [bx + 58, by - 14],
      [ex - 20, ey - 8],
      [ex + 28, ey - 10],
    ],
    false,
  );
  ctx.ellipsePath('orbit', 240, 146, 174, 86, 28, -0.05);
  ctx.ellipsePath('ring', px, py, planet.rx * 1.18, planet.ry * 1.4, 24, planet.tilt);
  ctx.marginPath(256);

  // 11) Actors: Lumi rearing near the asteroid bridge, Moon-Cat peeking atop the cozy rock
  ctx.actor('lumi', bx, by - 8, { facing: 1, anim: 'rear', pathIndex: gallopIdx });
  ctx.actor('moonCat', rockX + 2, rockY - 8, { facing: 1, anim: 'peek' });
}
