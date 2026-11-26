/**
 * Universe 20: Golden Lotus Star-Nile (`nileStarTemples`)
 * 9 bespoke deterministic procedural scenes: 1 Hub Sanctuary + 8 Chapters (incl. Slot-5 Grand Finale).
 */
import { MaterialId } from '../../contracts/materials';
import { UNIVERSE_BY_ID } from '../../contracts/universes';
import type { SceneCtx } from '../context';
import {
  drawGhostSilhouette,
  drawGoldenSphinx,
  drawGroundDeck,
  drawHorizonHills,
  drawLotusBarge,
  drawOasisPalm,
  drawPyramidTemple,
  drawSanctuaryRoom,
  drawSkySparkles,
  drawThemedCloud,
  drawThemedOrb,
} from '../kit';
import { inkArc, jit, star } from '../props';
import { INK, W, type Pt } from '../raster';

const U = UNIVERSE_BY_ID.nileStarTemples;

export type U20SceneId =
  | 'hub_nileStarTemples'
  | 'u20_c1'
  | 'u20_c2a'
  | 'u20_c2b'
  | 'u20_c3a'
  | 'u20_c3b'
  | 'u20_c4a'
  | 'u20_c4b'
  | 'u20_c5';

function initChapter(ctx: SceneCtx, id: Exclude<U20SceneId, 'hub_nileStarTemples'>, fx: number, fy: number): void {
  const ch = U.chapters.find((c) => c.id === id)!;
  ctx.title = ch.title;
  ctx.sky = { ...U.sky };
  ctx.universeId = U.id;
  ctx.ambient = U.ambient;
  ctx.focal = { x: fx, y: fy };
}

/** Towering carved lapis obelisk with golden pyramidion tip (2 regions). */
function drawLapisObelisk(ctx: SceneCtx, x: number, y: number, s: number, label: string): number[] {
  const { r } = ctx;
  const shaft = ctx.dyn('prop', `${label} Obelisk Shaft`);
  const tip = ctx.dyn('star', `${label} Golden Apex`);

  r.poly(shaft, [
    [x - 10 * s, y - 22 * s],
    [x + 10 * s, y - 22 * s],
    [x + 16 * s, y + 34 * s],
    [x - 16 * s, y + 34 * s],
  ]);
  r.rect(shaft, x - 20 * s, y + 30 * s, x + 20 * s, y + 38 * s);
  for (const gy of [-8, 4, 16]) {
    r.line(INK, x - 6 * s, y + gy * s, x + 6 * s, y + gy * s, { only: [shaft] });
    inkArc(r, x, y + (gy + 5) * s, 3 * s, 3 * s, 0, Math.PI * 2, 0, { only: [shaft] });
  }

  r.poly(tip, [
    [x, y - 44 * s],
    [x + 12 * s, y - 20 * s],
    [x - 12 * s, y - 20 * s],
  ]);
  r.line(INK, x, y - 40 * s, x, y - 22 * s, { only: [tip] });

  return [shaft, tip];
}

/** Grand Egyptian lotus-capital temple column (2 regions). */
function drawLotusColumn(ctx: SceneCtx, x: number, yTop: number, yBot: number, w: number, label: string, pre?: readonly MaterialId[]): number[] {
  const { r } = ctx;
  const shaft = ctx.dyn('prop', `${label} Column`);
  const capital = ctx.dyn('flora', `${label} Lotus Capital`);

  const capY = yTop + 18;
  r.rect(shaft, x - w * 0.48, capY, x + w * 0.48, yBot);
  r.rect(shaft, x - w * 0.66, yBot - 8, x + w * 0.66, yBot);
  r.line(INK, x - w * 0.16, capY + 4, x - w * 0.16, yBot - 10, { only: [shaft] });
  r.line(INK, x + w * 0.16, capY + 4, x + w * 0.16, yBot - 10, { only: [shaft] });

  r.poly(capital, [
    [x - w * 0.92, yTop],
    [x + w * 0.92, yTop],
    [x + w * 0.56, capY + 2],
    [x - w * 0.56, capY + 2],
  ]);
  r.line(INK, x, yTop + 2, x, capY, { only: [capital] });
  r.line(INK, x - w * 0.42, yTop + 2, x - w * 0.25, capY, { only: [capital] });
  r.line(INK, x + w * 0.42, yTop + 2, x + w * 0.25, capY, { only: [capital] });

  if (pre && pre.length >= 2) {
    ctx.preColor(shaft, pre[0]!);
    ctx.preColor(capital, pre[1]!);
  }
  return [shaft, capital];
}

/** Floating luminous Nile lotus blossom on pad (2 regions). */
function drawNileLotus(ctx: SceneCtx, x: number, y: number, s: number, label: string): number[] {
  const { r } = ctx;
  const pad = ctx.dyn('flora', `${label} Lily Pad`);
  const bloom = ctx.dyn('star', `${label} Golden Lotus`);

  r.ellipse(pad, x, y + 7 * s, 26 * s, 9 * s);
  r.line(INK, x, y + 7 * s, x + 22 * s, y + 10 * s, { only: [pad] });

  r.ellipse(bloom, x, y - 5 * s, 9 * s, 13 * s);
  r.ellipse(bloom, x - 11 * s, y - 1 * s, 10 * s, 7 * s, -0.45);
  r.ellipse(bloom, x + 11 * s, y - 1 * s, 10 * s, 7 * s, 0.45);
  r.line(INK, x, y - 15 * s, x, y + 3 * s, { only: [bloom] });

  return [pad, bloom];
}

/** Tall feathery Nile papyrus reed cluster (2 regions). */
function drawPapyrusCluster(ctx: SceneCtx, x: number, yBase: number, h: number, label: string): number[] {
  const { r } = ctx;
  const stalks = ctx.dyn('flora', `${label} Papyrus Stalks`);
  const plumes = ctx.dyn('flora', `${label} Papyrus Fans`);

  for (const [ox, dh] of [[-14, -8], [0, 0], [14, -10]] as const) {
    const topY = yBase - h - dh;
    r.capsule(stalks, x + ox * 0.6, yBase, x + ox, topY + 12, 3.8);
    r.ellipse(plumes, x + ox, topY + 6, 13, 9);
    r.line(INK, x + ox, topY + 14, x + ox - 7, topY + 2, { only: [plumes] });
    r.line(INK, x + ox, topY + 14, x + ox + 7, topY + 2, { only: [plumes] });
  }

  return [stalks, plumes];
}

/** Sculpted Winged Golden Scarab emblem (2 regions). */
function drawWingedScarab(ctx: SceneCtx, x: number, y: number, s: number, label: string, pre?: readonly MaterialId[]): number[] {
  const { r } = ctx;
  const wings = ctx.dyn('star', `${label} Scarab Wings`);
  const body = ctx.dyn('prop', `${label} Scarab Jewel`);

  r.poly(wings, [
    [x - 10 * s, y - 8 * s],
    [x - 48 * s, y - 20 * s],
    [x - 42 * s, y + 8 * s],
    [x - 10 * s, y + 12 * s],
  ]);
  r.poly(wings, [
    [x + 10 * s, y - 8 * s],
    [x + 48 * s, y - 20 * s],
    [x + 42 * s, y + 8 * s],
    [x + 10 * s, y + 12 * s],
  ]);
  r.line(INK, x - 42 * s, y - 6 * s, x - 14 * s, y, { only: [wings] });
  r.line(INK, x + 42 * s, y - 6 * s, x + 14 * s, y, { only: [wings] });

  r.ellipse(body, x, y + 2 * s, 14 * s, 16 * s);
  r.disc(body, x, y - 16 * s, 8 * s);
  r.line(INK, x, y - 10 * s, x, y + 16 * s, { only: [body] });

  if (pre && pre.length >= 2) {
    ctx.preColor(wings, pre[0]!);
    ctx.preColor(body, pre[1]!);
  }
  return [wings, body];
}

function nileStar(ctx: SceneCtx, label: string, x: number, y: number, rad = 11.5): number {
  const id = ctx.dyn('star', label);
  star(ctx, id, x, y, rad, { points: 5, inner: 0.48, rot: -Math.PI / 2 });
  return id;
}

// ===========================================================================
// HUB SANCTUARY: Violet's Lapis Lotus Barge
// ===========================================================================
function buildHubNileStarTemples(ctx: SceneCtx): void {
  ctx.universeId = U.id;
  ctx.ambient = U.ambient;

  drawSanctuaryRoom(ctx, {
    title: U.hubTitle,
    sky: { ...U.sky },
    palette: {
      wallPanel: MaterialId.DeepSpaceBiolum,
      floor: MaterialId.SolarFlare24K,
      windowFrame: MaterialId.RoyalAstralGold,
      windowGlass: MaterialId.VelvetNebula,
      curtain: MaterialId.OpalPearl,
      orbCore: MaterialId.SolarFlare24K,
      orbRing: MaterialId.RainbowPrismWax,
      rugOuter: MaterialId.RoyalAstralGold,
      rugInner: MaterialId.CrystalGlacierMint,
      furniture: MaterialId.RoyalAstralGold,
      furnitureTrim: MaterialId.SolarFlare24K,
      accentA: MaterialId.SolarFlare24K,
      accentB: MaterialId.CrystalGlacierMint,
      accentC: MaterialId.LiquidAurora,
    },
    windowShape: 'gothic',
    windowOrbStyle: 'lotusSun',
    wallStyle: 'stone',
    floorStyle: 'sandstone',
    rugShape: 'diamond',
    lampStyle: 'candle',
    garlandStyle: 'stars',
    sparkleStyle: 'stars',
    seatingLabel: 'Lapis Barge Divan',
    workbenchLabel: 'Papyrus Star-Chart Desk',
    shelfLabel: 'Temple Cartouche Shelf',
    trinketLabels: ['Papyrus Scrolls', 'Lapis Scarabs', 'Lotus Vessels'],
    drawWindowView: (c, wx, _wy, _wh, wBot) => {
      const pyrs = c.dyn('prop', 'Star-Nile Pyramids');
      c.r.poly(pyrs, [
        [wx - 34, wBot - 2],
        [wx - 16, wBot - 26],
        [wx + 2, wBot - 2],
      ]);
      c.r.poly(pyrs, [
        [wx - 2, wBot - 2],
        [wx + 18, wBot - 22],
        [wx + 34, wBot - 2],
      ]);
      c.preColor(pyrs, MaterialId.SolarFlare24K);
    },
    drawExtraProps: (c) => {
      const ids: number[] = [];
      // Left wall: carved Winged Golden Scarab Cartouche mural (x = 76, y = 94)
      const plaque = c.dyn('prop', 'Lapis Cartouche Plaque');
      c.r.rect(plaque, 32, 70, 120, 118);
      c.r.line(INK, 36, 74, 116, 74, { only: [plaque] });
      c.r.line(INK, 36, 114, 116, 114, { only: [plaque] });
      c.preColor(plaque, MaterialId.DeepSpaceBiolum);
      ids.push(plaque);

      ids.push(...drawWingedScarab(c, 76, 94, 0.72, 'Wall', [MaterialId.SolarFlare24K, MaterialId.CrystalGlacierMint]));

      // Right-center floor: miniature lotus-capital temple pillar stand (x = 278, y = 160..224)
      ids.push(...drawLotusColumn(c, 278, 160, 224, 22, 'Sanctuary', [MaterialId.RoyalAstralGold, MaterialId.CrystalGlacierMint]));

      // Right desk topper: glowing golden lotus chalice (x = 376, y = 164)
      const chalice = c.dyn('star', 'Golden Lotus Chalice');
      c.r.poly(chalice, [[364, 156], [388, 156], [381, 172], [371, 172]]);
      c.r.rect(chalice, 366, 172, 386, 179);
      c.r.line(INK, 376, 157, 376, 170, { only: [chalice] });
      c.preColor(chalice, MaterialId.SolarFlare24K);
      ids.push(chalice);

      return ids;
    },
  });
}

// ===========================================================================
// U20 C1: The Golden Lotus River Pier
// ===========================================================================
function buildU20C1(ctx: SceneCtx): void {
  const { r, rng } = ctx;
  initChapter(ctx, 'u20_c1', 240, 154);

  drawSkySparkles(ctx, 18, 134, 'stars');

  const orbX = Math.round(jit(rng, 396, 4));
  const orbY = Math.round(jit(rng, 52, 3));
  const orb = drawThemedOrb(ctx, orbX, orbY, 21, 'lotusSun');

  drawThemedCloud(ctx, 14, Math.round(jit(rng, 88, 4)), Math.round(jit(rng, 44, 3)), 86, 26, 'fluffy');
  drawThemedCloud(ctx, 15, Math.round(jit(rng, 248, 4)), Math.round(jit(rng, 38, 3)), 80, 24, 'fluffy');

  drawHorizonHills(ctx, { style: 'dunes', yBase: 146, yBottom: 196, layers: 2, labelPrefix: 'Nile' });

  // Starry lapis Nile current band behind the river pier
  const river = ctx.dyn('prop', 'Starry Lapis Current');
  r.rect(river, 0, 186, W, 224);
  for (let wx = 28; wx < W - 20; wx += 48) {
    inkArc(r, wx, 202, 14, 4, 0.1, Math.PI - 0.1, 0, { only: [river] });
  }

  drawGroundDeck(ctx, { style: 'pier', yTop: 214, yBottom: 250, labelPrefix: 'Lotus' });

  // Oasis palm left, moored royal lotus barge right, glowing floating water lilies center
  const palmIds = drawOasisPalm(ctx, 84, 166, 0.94, { label: 'Pier' });
  const bargeIds = drawLotusBarge(ctx, 356, 174, 0.96, { label: 'Moored', flip: -1 });
  const lotusL = drawNileLotus(ctx, 198, 200, 0.9, 'West');
  const lotusR = drawNileLotus(ctx, 266, 204, 0.85, 'East');

  nileStar(ctx, 'Nile Pier Star', Math.round(jit(rng, 168, 3)), Math.round(jit(rng, 84, 3)), 11.5);

  drawGhostSilhouette(ctx, 'Pier Scarab Ghost', 'scarab', Math.round(jit(rng, 164, 3)), Math.round(jit(rng, 118, 3)), 0.95);
  drawGhostSilhouette(ctx, 'Nile Cat Ghost', 'cat', Math.round(jit(rng, 316, 3)), Math.round(jit(rng, 88, 3)), 0.95);
  drawGhostSilhouette(ctx, 'River Owl Ghost', 'owl', Math.round(jit(rng, 444, 3)), Math.round(jit(rng, 112, 3)), 0.9);

  ctx.ellipsePath('ring', orbX, orbY, orb.rx, orb.ry, 24, orb.tilt);
  const gallopPath = ctx.wavePath('gallop', 60, 234, 420, 232, 9, 1.5, 18);
  const orbitPath = ctx.ellipsePath('orbit', 240, 86, 170, 44, 24);
  ctx.marginPath(256);

  ctx.actor('violet', 148, 242, { facing: 1, anim: 'idle' });
  ctx.actor('lumi', 298, 242, { facing: -1, anim: 'idle', pathIndex: gallopPath });
  ctx.actor('moonCat', 428, 236, { facing: -1, anim: 'sleep' });
  ctx.actor('comet', 240, 82, { facing: 1, anim: 'float', pathIndex: orbitPath });

  ctx.heroQuest('lotus', 'Lotus Barge', [...bargeIds, ...lotusL, ...lotusR]);
  ctx.heroQuest('violet', 'Violet', [1, 2, 3, 4]);
  ctx.heroQuest('lumi', 'Lumi', [5, 6, 7, 8]);
  ctx.heroQuest('planet', 'Lotus Sun', [12, 13]);
  void palmIds;
}

// ===========================================================================
// U20 C2A: The Royal Star-Barge Promenade
// ===========================================================================
function buildU20C2A(ctx: SceneCtx): void {
  const { r, rng } = ctx;
  initChapter(ctx, 'u20_c2a', 240, 152);

  drawSkySparkles(ctx, 18, 132, 'stars');

  const orbX = Math.round(jit(rng, 82, 4));
  const orbY = Math.round(jit(rng, 52, 3));
  const orb = drawThemedOrb(ctx, orbX, orbY, 21, 'lotusSun');

  drawThemedCloud(ctx, 14, Math.round(jit(rng, 224, 4)), Math.round(jit(rng, 42, 3)), 86, 26, 'fluffy');
  drawThemedCloud(ctx, 15, Math.round(jit(rng, 396, 4)), Math.round(jit(rng, 46, 3)), 82, 26, 'fluffy');

  drawHorizonHills(ctx, { style: 'dunes', yBase: 146, yBottom: 194, layers: 2, labelPrefix: 'Riverbank' });

  // Layered midnight star-river ribbons
  const waveBack = ctx.dyn('prop', 'Midnight Nile Wave');
  r.rect(waveBack, 0, 186, W, 218);
  for (let wx = 32; wx < W - 20; wx += 52) inkArc(r, wx, 200, 14, 4, 0.1, Math.PI - 0.1, 0, { only: [waveBack] });

  const waveFront = ctx.dyn('prop', 'Starlight Nile Current');
  r.rect(waveFront, 0, 218, W, 250);
  for (let wx = 48; wx < W - 20; wx += 58) inkArc(r, wx, 232, 16, 4.5, 0.1, Math.PI - 0.1, 0, { only: [waveFront] });

  // Bank pyramid left + Hero Royal Star-Barge center + Oasis palm right!
  const pyrIds = drawPyramidTemple(ctx, 92, 164, 0.88, { label: 'River' });
  const bargeIds = drawLotusBarge(ctx, 252, 184, 1.12, { label: 'Royal' });
  const palmIds = drawOasisPalm(ctx, 404, 166, 0.9, { label: 'River', flip: -1 });

  drawGhostSilhouette(ctx, 'Barge Scarab Ghost', 'scarab', Math.round(jit(rng, 164, 3)), Math.round(jit(rng, 88, 3)), 0.95);
  drawGhostSilhouette(ctx, 'Dune Camel Ghost', 'camel', Math.round(jit(rng, 326, 3)), Math.round(jit(rng, 84, 3)), 0.95);
  drawGhostSilhouette(ctx, 'Nile Owl Ghost', 'owl', Math.round(jit(rng, 444, 3)), Math.round(jit(rng, 112, 3)), 0.9);

  ctx.ellipsePath('ring', orbX, orbY, orb.rx, orb.ry, 24, orb.tilt);
  const swimPath = ctx.wavePath('swim', 54, 128, 426, 128, 18, 1.5, 20);
  const orbitPath = ctx.ellipsePath('orbit', 240, 88, 170, 44, 24);
  ctx.marginPath(256);

  ctx.actor('whale', 244, 120, { facing: 1, anim: 'swim', pathIndex: swimPath });
  ctx.actor('violet', 142, 242, { facing: 1, anim: 'idle' });
  ctx.actor('moonCat', 428, 236, { facing: -1, anim: 'peek' });
  ctx.actor('comet', 316, 52, { facing: -1, anim: 'float', pathIndex: orbitPath });

  ctx.heroQuest('lotus', 'Royal Barge', bargeIds);
  ctx.heroQuest('pyramid', 'Bank Pyramid', [...pyrIds, ...palmIds]);
  ctx.heroQuest('whale', 'River Whale', [19, 29]);
  ctx.heroQuest('planet', 'Solar Disc', [12, 13]);
}

// ===========================================================================
// U20 C2B: The Smiling Golden Sphinx Plaza
// ===========================================================================
function buildU20C2B(ctx: SceneCtx): void {
  const { rng } = ctx;
  initChapter(ctx, 'u20_c2b', 250, 156);

  drawSkySparkles(ctx, 18, 134, 'stars');

  const orbX = Math.round(jit(rng, 396, 4));
  const orbY = Math.round(jit(rng, 52, 3));
  const orb = drawThemedOrb(ctx, orbX, orbY, 21, 'lotusSun');

  drawThemedCloud(ctx, 14, Math.round(jit(rng, 88, 4)), Math.round(jit(rng, 44, 3)), 86, 26, 'fluffy');
  drawThemedCloud(ctx, 15, Math.round(jit(rng, 248, 4)), Math.round(jit(rng, 38, 3)), 80, 24, 'fluffy');

  drawHorizonHills(ctx, { style: 'dunes', yBase: 148, yBottom: 214, layers: 2, labelPrefix: 'Plaza' });
  drawGroundDeck(ctx, { style: 'courtyard', yTop: 206, yBottom: 250, labelPrefix: 'Sphinx' });

  // Hero Smiling Golden Sphinx + background Pyramid Temple + flanking lotus jewel pool!
  const pyrIds = drawPyramidTemple(ctx, 102, 170, 0.94, { label: 'Plaza' });
  const sphinxIds = drawGoldenSphinx(ctx, 286, 174, 1.12, { label: 'Smiling', flip: -1 });
  const lotusIds = drawNileLotus(ctx, 412, 200, 0.95, 'Plaza');

  nileStar(ctx, 'Sphinx Crown Star', Math.round(jit(rng, 186, 3)), Math.round(jit(rng, 92, 3)), 11.5);
  nileStar(ctx, 'Plaza Star', Math.round(jit(rng, 330, 3)), Math.round(jit(rng, 102, 3)), 11);

  drawGhostSilhouette(ctx, 'Sphinx Scarab Ghost', 'scarab', Math.round(jit(rng, 174, 3)), Math.round(jit(rng, 56, 3)), 0.92);
  drawGhostSilhouette(ctx, 'Plaza Cat Ghost', 'cat', Math.round(jit(rng, 318, 3)), Math.round(jit(rng, 68, 3)), 0.92);
  drawGhostSilhouette(ctx, 'Desert Camel Ghost', 'camel', Math.round(jit(rng, 442, 3)), Math.round(jit(rng, 112, 3)), 0.9);

  ctx.ellipsePath('ring', orbX, orbY, orb.rx, orb.ry, 24, orb.tilt);
  const sprintPath = ctx.wavePath('sprint', 56, 234, 424, 232, 9, 2, 18);
  const orbitPath = ctx.ellipsePath('orbit', 240, 88, 170, 44, 24);
  ctx.marginPath(256);

  ctx.actor('violet', 164, 242, { facing: 1, anim: 'idle' });
  ctx.actor('nova', 324, 240, { facing: -1, anim: 'leap', pathIndex: sprintPath });
  ctx.actor('moonCat', 56, 236, { facing: 1, anim: 'sleep' });
  ctx.actor('comet', 246, 86, { facing: 1, anim: 'float', pathIndex: orbitPath });

  ctx.heroQuest('pyramid', 'Golden Sphinx', sphinxIds);
  ctx.heroQuest('lotus', 'Temple Plaza', [...pyrIds, ...lotusIds]);
  ctx.heroQuest('nova', 'Nova', [9, 10, 11]);
  ctx.heroQuest('violet', 'Violet', [1, 2, 3, 4]);
}

// ===========================================================================
// U20 C3A: The Lapis Obelisk Star-Court
// ===========================================================================
function buildU20C3A(ctx: SceneCtx): void {
  const { r, rng } = ctx;
  initChapter(ctx, 'u20_c3a', 240, 152);

  drawSkySparkles(ctx, 20, 134, 'stars');

  const orbX = Math.round(jit(rng, 82, 4));
  const orbY = Math.round(jit(rng, 52, 3));
  const orb = drawThemedOrb(ctx, orbX, orbY, 21, 'astrolabe');

  drawThemedCloud(ctx, 14, Math.round(jit(rng, 240, 4)), Math.round(jit(rng, 38, 3)), 86, 26, 'fluffy');
  drawThemedCloud(ctx, 15, Math.round(jit(rng, 400, 4)), Math.round(jit(rng, 46, 3)), 82, 26, 'fluffy');

  drawHorizonHills(ctx, { style: 'dunes', yBase: 148, yBottom: 214, layers: 2, labelPrefix: 'Court' });
  drawGroundDeck(ctx, { style: 'courtyard', yTop: 206, yBottom: 250, labelPrefix: 'Star-Court' });

  // Central Star-Temple + Towering Twin Lapis Obelisks flanking a mirror pool!
  const pyrIds = drawPyramidTemple(ctx, 240, 168, 0.96, { label: 'Star-Court' });
  const obL = drawLapisObelisk(ctx, 104, 168, 1.05, 'West');
  const obR = drawLapisObelisk(ctx, 376, 168, 1.05, 'East');

  const pool = ctx.dyn('star', 'Star-Mirror Basin');
  r.ellipse(pool, 240, 224, 52, 12);
  inkArc(r, 240, 224, 34, 7, 0, Math.PI * 2, 0, { only: [pool] });

  nileStar(ctx, 'Obelisk Star West', Math.round(jit(rng, 164, 3)), Math.round(jit(rng, 98, 3)), 11);
  nileStar(ctx, 'Obelisk Star East', Math.round(jit(rng, 316, 3)), Math.round(jit(rng, 98, 3)), 11);

  drawGhostSilhouette(ctx, 'Court Scarab Ghost', 'scarab', Math.round(jit(rng, 164, 3)), Math.round(jit(rng, 64, 3)), 0.92);
  drawGhostSilhouette(ctx, 'Court Owl Ghost', 'owl', Math.round(jit(rng, 318, 3)), Math.round(jit(rng, 64, 3)), 0.92);

  ctx.ellipsePath('ring', orbX, orbY, orb.rx, orb.ry, 24, orb.tilt);
  const gallopPath = ctx.wavePath('gallop', 60, 234, 420, 232, 9, 1.5, 18);
  const sprintPath = ctx.wavePath('sprint', 70, 228, 410, 228, 8, 2, 18);
  const orbitPath = ctx.ellipsePath('orbit', 240, 86, 170, 44, 24);
  ctx.marginPath(256);

  ctx.actor('lumi', 132, 242, { facing: 1, anim: 'rear', pathIndex: gallopPath });
  ctx.actor('violet', 240, 244, { facing: 1, anim: 'idle' });
  ctx.actor('nova', 352, 242, { facing: -1, anim: 'leap', pathIndex: sprintPath });
  ctx.actor('comet', 316, 42, { facing: -1, anim: 'float', pathIndex: orbitPath });

  ctx.heroQuest('pyramid', 'Lapis Obelisks', [...obL, ...obR]);
  ctx.heroQuest('lotus', 'Star Court', [...pyrIds, pool]);
  ctx.heroQuest('lumi', 'Lumi', [5, 6, 7, 8]);
  ctx.heroQuest('nova', 'Nova', [9, 10, 11]);
}

// ===========================================================================
// U20 C3B: The Papyrus Reed Firefly Marsh
// ===========================================================================
function buildU20C3B(ctx: SceneCtx): void {
  const { rng } = ctx;
  initChapter(ctx, 'u20_c3b', 240, 152);

  drawSkySparkles(ctx, 20, 134, 'stars');

  const orbX = Math.round(jit(rng, 396, 4));
  const orbY = Math.round(jit(rng, 52, 3));
  const orb = drawThemedOrb(ctx, orbX, orbY, 21, 'pearlMoon');

  drawThemedCloud(ctx, 14, Math.round(jit(rng, 88, 4)), Math.round(jit(rng, 44, 3)), 86, 26, 'fluffy');
  drawThemedCloud(ctx, 15, Math.round(jit(rng, 248, 4)), Math.round(jit(rng, 38, 3)), 80, 24, 'fluffy');

  drawHorizonHills(ctx, { style: 'dunes', yBase: 148, yBottom: 214, layers: 2, labelPrefix: 'Marsh' });
  drawGroundDeck(ctx, { style: 'gardenPath', yTop: 204, yBottom: 250, labelPrefix: 'Marsh' });

  // Tall feathery papyrus reed groves framing a gliding lotus skiff & oasis palm!
  const reedL = drawPapyrusCluster(ctx, 74, 212, 82, 'West');
  const bargeIds = drawLotusBarge(ctx, 224, 182, 0.92, { label: 'Marsh' });
  const palmIds = drawOasisPalm(ctx, 366, 166, 0.92, { label: 'Marsh', flip: -1 });
  const reedR = drawPapyrusCluster(ctx, 434, 214, 72, 'East');

  const lotusC = drawNileLotus(ctx, 240, 224, 0.9, 'Firefly');

  drawGhostSilhouette(ctx, 'Marsh Crane Ghost', 'crane', Math.round(jit(rng, 164, 3)), Math.round(jit(rng, 88, 3)), 0.95);
  drawGhostSilhouette(ctx, 'Marsh Koi Ghost', 'koi', Math.round(jit(rng, 316, 3)), Math.round(jit(rng, 88, 3)), 0.95);
  drawGhostSilhouette(ctx, 'Marsh Scarab Ghost', 'scarab', Math.round(jit(rng, 444, 3)), Math.round(jit(rng, 110, 3)), 0.9);

  ctx.ellipsePath('ring', orbX, orbY, orb.rx, orb.ry, 24, orb.tilt);
  const sprintPath = ctx.wavePath('sprint', 60, 234, 420, 232, 9, 2, 18);
  const orbitPath = ctx.ellipsePath('orbit', 240, 86, 170, 44, 24);
  ctx.marginPath(256);

  ctx.actor('violet', 148, 242, { facing: 1, anim: 'idle' });
  ctx.actor('gazelle', 324, 240, { facing: -1, anim: 'idle', pathIndex: sprintPath });
  ctx.actor('moonCat', 428, 236, { facing: -1, anim: 'peek' });
  ctx.actor('comet', 240, 84, { facing: 1, anim: 'float', pathIndex: orbitPath });

  ctx.heroQuest('lotus', 'Papyrus Marsh', [...reedL, ...reedR, ...lotusC]);
  ctx.heroQuest('lantern', 'Marsh Barge', [...bargeIds, ...palmIds]);
  ctx.heroQuest('violet', 'Violet', [1, 2, 3, 4]);
  ctx.heroQuest('planet', 'Nile Moon', [12, 13]);
}

// ===========================================================================
// U20 C4A: The Jeweled Scarab Sun-Gate
// ===========================================================================
function buildU20C4A(ctx: SceneCtx): void {
  const { r, rng } = ctx;
  initChapter(ctx, 'u20_c4a', 240, 152);

  drawSkySparkles(ctx, 18, 134, 'stars');

  const orbX = Math.round(jit(rng, 82, 4));
  const orbY = Math.round(jit(rng, 52, 3));
  const orb = drawThemedOrb(ctx, orbX, orbY, 21, 'lotusSun');

  drawThemedCloud(ctx, 14, Math.round(jit(rng, 240, 4)), Math.round(jit(rng, 38, 3)), 86, 26, 'fluffy');
  drawThemedCloud(ctx, 15, Math.round(jit(rng, 400, 4)), Math.round(jit(rng, 46, 3)), 82, 26, 'fluffy');

  drawHorizonHills(ctx, { style: 'dunes', yBase: 150, yBottom: 214, layers: 2, labelPrefix: 'Sun-Gate' });
  drawGroundDeck(ctx, { style: 'courtyard', yTop: 206, yBottom: 250, labelPrefix: 'Sun-Gate' });

  // Monumental Egyptian Pylon Sun-Gate crowned with a Winged Golden Scarab!
  const pylonL = ctx.dyn('prop', 'West Temple Pylon');
  r.poly(pylonL, [[146, 128], [202, 128], [212, 210], [136, 210]]);
  r.line(INK, 156, 148, 194, 148, { only: [pylonL] });
  r.line(INK, 152, 174, 198, 174, { only: [pylonL] });

  const pylonR = ctx.dyn('prop', 'East Temple Pylon');
  r.poly(pylonR, [[278, 128], [334, 128], [344, 210], [268, 210]]);
  r.line(INK, 286, 148, 324, 148, { only: [pylonR] });
  r.line(INK, 282, 174, 328, 174, { only: [pylonR] });

  const lintel = ctx.dyn('prop', 'Sun-Gate Architrave');
  r.rect(lintel, 188, 134, 292, 156);
  r.line(INK, 194, 145, 286, 145, { only: [lintel] });

  const scarabIds = drawWingedScarab(ctx, 240, 122, 1.05, 'Sun-Gate');

  // Flanking oasis palms & twin mirrored lotus pools
  const palmL = drawOasisPalm(ctx, 68, 168, 0.88, { label: 'Gate West' });
  const palmR = drawOasisPalm(ctx, 412, 168, 0.88, { label: 'Gate East', flip: -1 });

  drawGhostSilhouette(ctx, 'Sun-Gate Scarab Ghost', 'scarab', Math.round(jit(rng, 162, 3)), Math.round(jit(rng, 72, 3)), 0.92);
  drawGhostSilhouette(ctx, 'Sun-Gate Cat Ghost', 'cat', Math.round(jit(rng, 320, 3)), Math.round(jit(rng, 72, 3)), 0.92);

  ctx.ellipsePath('ring', orbX, orbY, orb.rx, orb.ry, 24, orb.tilt);
  const gallopPath = ctx.wavePath('gallop', 60, 234, 420, 232, 9, 1.5, 18);
  const sprintPath = ctx.wavePath('sprint', 70, 228, 410, 228, 8, 2, 18);
  const orbitPath = ctx.ellipsePath('orbit', 240, 86, 170, 44, 24);
  ctx.marginPath(256);

  ctx.actor('lumi', 132, 242, { facing: 1, anim: 'rear', pathIndex: gallopPath });
  ctx.actor('violet', 240, 244, { facing: 1, anim: 'idle' });
  ctx.actor('nova', 352, 242, { facing: -1, anim: 'leap', pathIndex: sprintPath });
  ctx.actor('comet', 316, 42, { facing: -1, anim: 'float', pathIndex: orbitPath });

  ctx.heroQuest('pyramid', 'Scarab Gate', [pylonL, pylonR, lintel, ...scarabIds]);
  ctx.heroQuest('lotus', 'Gate Palms', [...palmL, ...palmR]);
  ctx.heroQuest('lumi', 'Lumi', [5, 6, 7, 8]);
  ctx.heroQuest('nova', 'Nova', [9, 10, 11]);
}

// ===========================================================================
// U20 C4B: The Hypostyle Starlight Colonnade
// ===========================================================================
function buildU20C4B(ctx: SceneCtx): void {
  const { r, rng } = ctx;
  initChapter(ctx, 'u20_c4b', 240, 152);

  drawSkySparkles(ctx, 20, 134, 'stars');

  const orbX = Math.round(jit(rng, 396, 4));
  const orbY = Math.round(jit(rng, 52, 3));
  const orb = drawThemedOrb(ctx, orbX, orbY, 21, 'lotusSun');

  drawThemedCloud(ctx, 14, Math.round(jit(rng, 88, 4)), Math.round(jit(rng, 44, 3)), 86, 26, 'fluffy');
  drawThemedCloud(ctx, 15, Math.round(jit(rng, 248, 4)), Math.round(jit(rng, 38, 3)), 80, 24, 'fluffy');

  drawHorizonHills(ctx, { style: 'dunes', yBase: 150, yBottom: 214, layers: 2, labelPrefix: 'Hall' });
  drawGroundDeck(ctx, { style: 'courtyard', yTop: 206, yBottom: 250, labelPrefix: 'Colonnade' });

  // Four majestic lotus-topped hypostyle columns holding up a starlight frieze!
  const col1 = drawLotusColumn(ctx, 64, 96, 212, 26, 'Far West');
  const col2 = drawLotusColumn(ctx, 152, 104, 210, 24, 'Mid West');
  const col3 = drawLotusColumn(ctx, 328, 104, 210, 24, 'Mid East');
  const col4 = drawLotusColumn(ctx, 416, 96, 212, 26, 'Far East');

  const beamL = ctx.dyn('prop', 'West Star Architrave');
  r.rect(beamL, 38, 84, 176, 98);
  r.line(INK, 44, 91, 170, 91, { only: [beamL] });

  const beamR = ctx.dyn('prop', 'East Star Architrave');
  r.rect(beamR, 304, 84, 442, 98);
  r.line(INK, 310, 91, 436, 91, { only: [beamR] });

  // Golden Sphinx sentinel seated grandly between the central colonnade aisle!
  const sphinxIds = drawGoldenSphinx(ctx, 240, 176, 0.92, { label: 'Hall' });

  drawGhostSilhouette(ctx, 'Hall Scarab Ghost', 'scarab', Math.round(jit(rng, 240, 3)), Math.round(jit(rng, 102, 3)), 0.95);
  drawGhostSilhouette(ctx, 'Hall Owl Ghost', 'owl', Math.round(jit(rng, 166, 3)), Math.round(jit(rng, 62, 3)), 0.9);
  drawGhostSilhouette(ctx, 'Hall Cat Ghost', 'cat', Math.round(jit(rng, 320, 3)), Math.round(jit(rng, 64, 3)), 0.9);

  ctx.ellipsePath('ring', orbX, orbY, orb.rx, orb.ry, 24, orb.tilt);
  const gallopPath = ctx.wavePath('gallop', 60, 234, 420, 232, 9, 1.5, 18);
  const orbitPath = ctx.ellipsePath('orbit', 240, 88, 170, 44, 24);
  ctx.marginPath(256);

  ctx.actor('violet', 166, 242, { facing: 1, anim: 'idle' });
  ctx.actor('lumi', 316, 242, { facing: -1, anim: 'idle', pathIndex: gallopPath });
  ctx.actor('moonCat', 428, 236, { facing: -1, anim: 'peek' });
  ctx.actor('comet', 240, 62, { facing: 1, anim: 'float', pathIndex: orbitPath });

  ctx.heroQuest('lotus', 'Star Columns', [...col1, ...col2, ...col3, ...col4, beamL, beamR]);
  ctx.heroQuest('pyramid', 'Hall Sphinx', sphinxIds);
  ctx.heroQuest('violet', 'Violet', [1, 2, 3, 4]);
  ctx.heroQuest('planet', 'Lotus Sun', [12, 13]);
}

// ===========================================================================
// U20 C5 (GRAND FINALE, 50..70 regions): The Grand Temple of the Star-Nile
// ===========================================================================
function buildU20C5(ctx: SceneCtx): void {
  const { r, rng } = ctx;
  initChapter(ctx, 'u20_c5', 240, 112);

  const cx = 240;
  const cy = 110;
  const twist = rng.range(-0.025, 0.025);

  drawSkySparkles(ctx, 20, 130, 'stars');

  // 1) Star-Nile River Promenade + Flanking Twin Lapis Obelisk Shrines + Solar Wings (5 regions)
  const riverTerrace = ctx.dyn('prop', 'Star-Nile Temple Terrace');
  r.poly(riverTerrace, [[44, 224], [436, 224], [454, 248], [26, 248]]);
  r.line(INK, 54, 236, 426, 236, { only: [riverTerrace] });

  for (const side of [-1, 1] as const) {
    const lbl = side < 0 ? 'West' : 'East';
    const px = side < 0 ? 48 : 432;
    const pylon = ctx.dyn('prop', `${lbl} Grand Pylon`);
    r.poly(pylon, [[px - 20, 148], [px + 20, 148], [px + 26, 212], [px - 26, 212]]);
    r.line(INK, px - 18, 178, px + 18, 178, { only: [pylon] });

    const wing = ctx.dyn('star', `${lbl} Scarab Sun-Wing`);
    r.poly(wing, [
      [cx + side * 84, cy - 56],
      [cx + side * 146, cy - 66],
      [cx + side * 188, cy - 34],
      [cx + side * 172, cy - 16],
      [cx + side * 136, cy - 46],
      [cx + side * 80, cy - 40],
    ]);
  }

  // 2) Panoramic Golden Lotus Sunrise Mandala (12 + 8 + 8 + 1 = 29 regions)
  const sx = 1.12;
  const sy = 0.94;
  const pol = (rad: number, a: number): Pt => [cx + Math.cos(a) * rad * sx, cy + Math.sin(a) * rad * sy];

  // Outer ring: 12 tall Nile lotus sunrise petals
  for (let i = 0; i < 12; i++) {
    const a = -Math.PI / 2 + (i * Math.PI * 2) / 12 + twist;
    const pid = ctx.dyn('flora', `Sunrise Lotus Petal ${i + 1}`);
    r.poly(pid, [
      pol(52, a - 0.16),
      pol(72, a - 0.2),
      pol(86, a),
      pol(72, a + 0.2),
      pol(52, a + 0.16),
    ]);
    const pA = pol(58, a);
    const pB = pol(78, a);
    r.line(INK, pA[0], pA[1], pB[0], pB[1], { only: [pid] });
  }

  // Middle ring: 8 lapis & gold pyramid wedges
  const midIds: number[] = [];
  for (let i = 0; i < 8; i++) {
    const a = -Math.PI / 2 + ((i + 0.5) * Math.PI * 2) / 8 + twist;
    const wid = ctx.dyn('star', `Lapis Sun Wedge ${i + 1}`);
    midIds.push(wid);
    r.poly(wid, [
      pol(32, a),
      pol(48, a - 0.34),
      pol(64, a),
      pol(48, a + 0.34),
    ]);
    const pA = pol(36, a);
    const pB = pol(60, a);
    r.line(INK, pA[0], pA[1], pB[0], pB[1], { only: [wid] });
  }

  // Inner ring: 8 golden solar lotus rays
  const innerIds: number[] = [];
  for (let i = 0; i < 8; i++) {
    const a = -Math.PI / 2 + (i * Math.PI * 2) / 8 + twist;
    const rid = ctx.dyn('star', `Solar Lotus Ray ${i + 1}`);
    innerIds.push(rid);
    r.poly(rid, [
      pol(15, a - 0.24),
      pol(40, a - 0.16),
      pol(44, a),
      pol(40, a + 0.16),
      pol(15, a + 0.24),
    ]);
    const pA = pol(22, a);
    const pB = pol(37, a);
    r.line(INK, pA[0], pA[1], pB[0], pB[1], { only: [rid] });
  }

  // Center Core: The Great Golden Pyramid Solar Disc!
  const sunCore = ctx.dyn('star', 'Star-Nile Solar Core');
  r.disc(sunCore, cx, cy + 1, 17);
  r.poly(sunCore, [[cx, cy - 16], [cx + 14, cy + 12], [cx - 14, cy + 12]]);
  inkArc(r, cx, cy + 1, 11, 11, 0, Math.PI * 2, 0, { only: [sunCore] });

  // 3) Side orbits: Canonical Lotus Sun (12/13) left + Mirrored Winged Scarab right
  const orbX = 72;
  const orbY = 82 + Math.round(jit(rng, 0, 2));
  const orb = drawThemedOrb(ctx, orbX, orbY, 15.5, 'lotusSun');

  drawWingedScarab(ctx, 408, 86, 0.72, 'Temple');

  // Four corner framing Nile stars
  nileStar(ctx, 'NW Nile Star', 34, 30, 11.5);
  nileStar(ctx, 'NE Nile Star', 446, 30, 11.5);
  nileStar(ctx, 'West Temple Star', 124, 150, 11);
  nileStar(ctx, 'East Temple Star', 356, 150, 11);

  // Canonical clouds (14/15) cradling the river temple flanks
  drawThemedCloud(ctx, 14, 62, 226, 94, 30, 'fluffy');
  drawThemedCloud(ctx, 15, 418, 226, 94, 30, 'fluffy');

  // 3 Ghosts in clean open upper sky pockets
  drawGhostSilhouette(ctx, 'Temple Scarab Ghost', 'scarab', 152, 22, 0.92);
  drawGhostSilhouette(ctx, 'Temple Cat Ghost', 'cat', 328, 22, 0.92);
  drawGhostSilhouette(ctx, 'Temple Owl Ghost', 'owl', 240, 18, 0.85);

  // Paths & Actors (Violet 4 + Lumi 4 + Nova 3 + MoonCat 1 + Comet 2 = 14 actor regions -> total ~60!)
  const gallopPath = ctx.wavePath('gallop', 66, 240, 414, 240, 8, 2, 20);
  const sprintPath = ctx.wavePath('sprint', 90, 236, 390, 236, 9, 2, 20);
  const orbitPath = ctx.ellipsePath('orbit', cx, cy, 182, 82, 28);
  ctx.ellipsePath('ring', orbX, orbY, orb.rx, orb.ry, 24, orb.tilt);
  ctx.marginPath(256);

  ctx.actor('lumi', 148, 246, { facing: 1, anim: 'rear', pathIndex: gallopPath });
  ctx.actor('violet', 240, 248, { facing: 1, anim: 'idle' });
  ctx.actor('nova', 332, 246, { facing: -1, anim: 'leap', pathIndex: sprintPath });
  ctx.actor('moonCat', 110, 202, { facing: 1, anim: 'peek' });
  ctx.actor('comet', 372, 134, { facing: -1, anim: 'float', pathIndex: orbitPath });

  ctx.heroQuest('lotus', 'Lotus Sunrise', [sunCore, ...innerIds]);
  ctx.heroQuest('pyramid', 'Nile Crown', midIds);
  ctx.heroQuest('violet', 'Violet', [1, 2, 3, 4]);
  ctx.heroQuest('lumi', 'Lumi', [5, 6, 7, 8]);
}

export const U20_SCENES: Record<U20SceneId, (ctx: SceneCtx) => void> = {
  hub_nileStarTemples: buildHubNileStarTemples,
  u20_c1: buildU20C1,
  u20_c2a: buildU20C2A,
  u20_c2b: buildU20C2B,
  u20_c3a: buildU20C3A,
  u20_c3b: buildU20C3B,
  u20_c4a: buildU20C4A,
  u20_c4b: buildU20C4B,
  u20_c5: buildU20C5,
};
