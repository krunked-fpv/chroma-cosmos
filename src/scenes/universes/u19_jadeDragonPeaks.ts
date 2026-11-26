/**
 * Universe 19: Cloud-Peak Dragon Sanctuary (`jadeDragonPeaks`)
 * 9 bespoke deterministic procedural scenes: 1 Hub Sanctuary + 8 Chapters (incl. Slot-5 Grand Finale).
 */
import { MaterialId } from '../../contracts/materials';
import { UNIVERSE_BY_ID } from '../../contracts/universes';
import type { SceneCtx } from '../context';
import {
  drawGhostSilhouette,
  drawGroundDeck,
  drawHorizonHills,
  drawKiteDragon,
  drawOrigamiCrane,
  drawPagodaTower,
  drawPaperLantern,
  drawSanctuaryRoom,
  drawSkySparkles,
  drawSleepingDragon,
  drawThemedCloud,
  drawThemedOrb,
  drawToriiGate,
} from '../kit';
import { inkArc, jit, star } from '../props';
import { INK, type Pt } from '../raster';

const U = UNIVERSE_BY_ID.jadeDragonPeaks;

export type U19SceneId =
  | 'hub_jadeDragonPeaks'
  | 'u19_c1'
  | 'u19_c2a'
  | 'u19_c2b'
  | 'u19_c3a'
  | 'u19_c3b'
  | 'u19_c4a'
  | 'u19_c4b'
  | 'u19_c5';

function initChapter(ctx: SceneCtx, id: Exclude<U19SceneId, 'hub_jadeDragonPeaks'>, fx: number, fy: number): void {
  const ch = U.chapters.find((c) => c.id === id)!;
  ctx.title = ch.title;
  ctx.sky = { ...U.sky };
  ctx.universeId = U.id;
  ctx.ambient = U.ambient;
  ctx.focal = { x: fx, y: fy };
}

/** Floating jade karst cliff pillar with shimmering waterfall cascade (2 regions). */
function drawWaterfallSpire(ctx: SceneCtx, x: number, y: number, w: number, h: number, label: string): number[] {
  const { r } = ctx;
  const cliff = ctx.dyn('prop', `${label} Cliff Spire`);
  const fall = ctx.dyn('cloud', `${label} Waterfall`);

  r.poly(cliff, [
    [x - w * 0.52, y - h * 0.45],
    [x + w * 0.52, y - h * 0.45],
    [x + w * 0.36, y + h * 0.35],
    [x, y + h * 0.52],
    [x - w * 0.36, y + h * 0.35],
  ]);
  r.line(INK, x - w * 0.36, y - h * 0.2, x - w * 0.24, y + h * 0.24, { only: [cliff] });
  r.line(INK, x + w * 0.34, y - h * 0.16, x + w * 0.22, y + h * 0.24, { only: [cliff] });

  r.rect(fall, x - w * 0.22, y - h * 0.42, x + w * 0.22, y + h * 0.48);
  r.ellipse(fall, x, y + h * 0.48, w * 0.38, 8);
  r.line(INK, x - w * 0.08, y - h * 0.36, x - w * 0.08, y + h * 0.42, { only: [fall] });
  r.line(INK, x + w * 0.08, y - h * 0.36, x + w * 0.08, y + h * 0.42, { only: [fall] });

  return [cliff, fall];
}

/** Curved bronze dragon-horn cradle holding a luminous floating Sky Pearl (2 regions). */
function drawSkyPearlCradle(ctx: SceneCtx, x: number, y: number, s: number, label: string, pre?: readonly MaterialId[]): number[] {
  const { r } = ctx;
  const horns = ctx.dyn('prop', `${label} Bronze Horns`);
  const pearlId = ctx.dyn('star', `${label} Sky Pearl`);

  r.poly(horns, [[x - 28 * s, y + 26 * s], [x + 28 * s, y + 26 * s], [x + 34 * s, y + 38 * s], [x - 34 * s, y + 38 * s]]);
  r.capsule(horns, x - 20 * s, y + 26 * s, x - 36 * s, y - 4 * s, 6.5 * s);
  r.capsule(horns, x - 36 * s, y - 4 * s, x - 24 * s, y - 28 * s, 5.5 * s);
  r.capsule(horns, x + 20 * s, y + 26 * s, x + 36 * s, y - 4 * s, 6.5 * s);
  r.capsule(horns, x + 36 * s, y - 4 * s, x + 24 * s, y - 28 * s, 5.5 * s);

  r.disc(pearlId, x, y - 6 * s, 21 * s);
  inkArc(r, x, y - 6 * s, 14 * s, 14 * s, Math.PI * 1.1, Math.PI * 1.6, 0, { only: [pearlId] });
  inkArc(r, x, y - 6 * s, 9 * s, 9 * s, 0, Math.PI * 2, 0, { only: [pearlId] });

  if (pre && pre.length >= 2) {
    ctx.preColor(horns, pre[0]!);
    ctx.preColor(pearlId, pre[1]!);
  }
  return [horns, pearlId];
}

function emberStar(ctx: SceneCtx, label: string, x: number, y: number, rad = 11.5): number {
  const id = ctx.dyn('star', label);
  star(ctx, id, x, y, rad, { points: 5, inner: 0.48, rot: -Math.PI / 2 });
  return id;
}

// ===========================================================================
// HUB SANCTUARY: Violet's Cloud-Mist Pavilion
// ===========================================================================
function buildHubJadeDragonPeaks(ctx: SceneCtx): void {
  ctx.universeId = U.id;
  ctx.ambient = U.ambient;

  drawSanctuaryRoom(ctx, {
    title: U.hubTitle,
    sky: { ...U.sky },
    palette: {
      wallPanel: MaterialId.CrystalGlacierMint,
      floor: MaterialId.AuroraSherbet,
      windowFrame: MaterialId.RoyalAstralGold,
      windowGlass: MaterialId.DeepSpaceBiolum,
      curtain: MaterialId.DragonflyIridescence,
      orbCore: MaterialId.SolarFlare24K,
      orbRing: MaterialId.OpalPearl,
      rugOuter: MaterialId.DragonflyIridescence,
      rugInner: MaterialId.SolarFlare24K,
      furniture: MaterialId.RoyalAstralGold,
      furnitureTrim: MaterialId.SolarFlare24K,
      accentA: MaterialId.SolarFlare24K,
      accentB: MaterialId.CrystalGlacierMint,
      accentC: MaterialId.StrawberrySupernova,
    },
    windowShape: 'shoji',
    windowOrbStyle: 'lanternMoon',
    wallStyle: 'bamboo',
    floorStyle: 'tatami',
    rugShape: 'cloud',
    lampStyle: 'lantern',
    garlandStyle: 'lanterns',
    sparkleStyle: 'stars',
    seatingLabel: 'Jade Cloud Daybed',
    workbenchLabel: 'Calligraphy Pavilion Desk',
    shelfLabel: 'Scroll & Lantern Shelf',
    trinketLabels: ['Dragon Scrolls', 'Jade Keepsakes', 'Cloud Lanterns'],
    drawWindowView: (c, wx, _wy, _wh, wBot) => {
      const peak = c.dyn('prop', 'Misty Jade Peak');
      c.r.poly(peak, [
        [wx - 34, wBot - 2],
        [wx - 22, wBot - 26],
        [wx - 4, wBot - 14],
        [wx + 16, wBot - 30],
        [wx + 34, wBot - 16],
        [wx + 34, wBot - 2],
      ]);
      c.r.line(INK, wx - 22, wBot - 22, wx - 16, wBot - 8, { only: [peak] });
      c.preColor(peak, MaterialId.DragonflyIridescence);
    },
    drawExtraProps: (c) => {
      const ids: number[] = [];
      // Left wall hanging dragon-peak scroll painting (x = 76, y = 96)
      const scroll = c.dyn('prop', 'Hanging Jade Scroll');
      c.r.rect(scroll, 48, 66, 104, 122);
      c.r.rect(scroll, 42, 62, 110, 68);
      c.r.rect(scroll, 42, 120, 110, 126);
      c.preColor(scroll, MaterialId.OpalPearl);
      ids.push(scroll);

      const scrollPeak = c.dyn('flora', 'Painted Cloud Dragon');
      c.r.capsule(scrollPeak, 56, 108, 76, 86, 6.5);
      c.r.capsule(scrollPeak, 76, 86, 94, 100, 6.5);
      c.r.disc(scrollPeak, 94, 86, 7);
      c.preColor(scrollPeak, MaterialId.DragonflyIridescence);
      ids.push(scrollPeak);

      // Right-center floor: carved jade brazier & floating cloud-bonsai stand (x = 278, y = 188)
      const stand = c.dyn('prop', 'Jade Bonsai Stand');
      c.r.rect(stand, 264, 194, 292, 224);
      c.r.line(INK, 266, 206, 290, 206, { only: [stand] });
      c.preColor(stand, MaterialId.RoyalAstralGold);
      ids.push(stand);

      const bonsai = c.dyn('flora', 'Cloud-Pine Bonsai');
      c.r.capsule(bonsai, 278, 194, 274, 174, 4);
      c.r.ellipse(bonsai, 278, 166, 18, 10);
      c.r.ellipse(bonsai, 268, 174, 11, 7);
      c.preColor(bonsai, MaterialId.CrystalGlacierMint);
      ids.push(bonsai);

      // Right desk topper: miniature Sky Pearl on bronze cradle (x = 376, y = 162)
      ids.push(...drawSkyPearlCradle(c, 376, 162, 0.44, 'Desk', [MaterialId.RoyalAstralGold, MaterialId.SolarFlare24K]));

      return ids;
    },
  });
}

// ===========================================================================
// U19 C1: The Cloud-Step Mountain Gate
// ===========================================================================
function buildU19C1(ctx: SceneCtx): void {
  const { r, rng } = ctx;
  initChapter(ctx, 'u19_c1', 240, 152);

  drawSkySparkles(ctx, 18, 134, 'stars');

  const orbX = Math.round(jit(rng, 396, 4));
  const orbY = Math.round(jit(rng, 52, 3));
  const orb = drawThemedOrb(ctx, orbX, orbY, 21, 'lanternMoon');

  drawThemedCloud(ctx, 14, Math.round(jit(rng, 88, 4)), Math.round(jit(rng, 44, 3)), 86, 26, 'sakura');
  drawThemedCloud(ctx, 15, Math.round(jit(rng, 250, 4)), Math.round(jit(rng, 38, 3)), 82, 24, 'sakura');

  drawHorizonHills(ctx, { style: 'peaks', yBase: 148, yBottom: 214, layers: 2, labelPrefix: 'Dragon' });
  drawGroundDeck(ctx, { style: 'courtyard', yTop: 206, yBottom: 250, labelPrefix: 'Mountain' });

  // Ceremonial mountain gate + curved stone cloud steps + flanking festival lanterns
  const gateIds = drawToriiGate(ctx, 240, 168, 1.05, { label: 'Mountain' });
  const lampL = drawPaperLantern(ctx, 102, 162, 0.88, { label: 'West' });
  const lampR = drawPaperLantern(ctx, 378, 162, 0.88, { label: 'East' });

  // Bespoke stepped stone stairway leading through the gate
  const steps = ctx.dyn('prop', 'Cloud-Step Stairway');
  r.poly(steps, [[204, 206], [276, 206], [294, 244], [186, 244]]);
  for (const sy of [216, 226, 236]) r.line(INK, 194, sy, 286, sy, { only: [steps] });

  emberStar(ctx, 'Mountain Peak Star', Math.round(jit(rng, 168, 3)), Math.round(jit(rng, 88, 3)), 11.5);

  drawGhostSilhouette(ctx, 'Mountain Dragon Ghost', 'dragon', Math.round(jit(rng, 156, 3)), Math.round(jit(rng, 108, 3)), 0.95);
  drawGhostSilhouette(ctx, 'Peak Crane Ghost', 'crane', Math.round(jit(rng, 326, 3)), Math.round(jit(rng, 92, 3)), 0.95);
  drawGhostSilhouette(ctx, 'Mist Owl Ghost', 'owl', Math.round(jit(rng, 444, 3)), Math.round(jit(rng, 110, 3)), 0.9);

  ctx.ellipsePath('ring', orbX, orbY, orb.rx, orb.ry, 24, orb.tilt);
  const gallopPath = ctx.wavePath('gallop', 60, 232, 420, 230, 10, 1.5, 18);
  const orbitPath = ctx.ellipsePath('orbit', 240, 88, 172, 44, 24);
  ctx.marginPath(256);

  ctx.actor('violet', 152, 242, { facing: 1, anim: 'idle' });
  ctx.actor('lumi', 324, 242, { facing: -1, anim: 'rear', pathIndex: gallopPath });
  ctx.actor('moonCat', 428, 236, { facing: -1, anim: 'sleep' });
  ctx.actor('comet', 240, 82, { facing: 1, anim: 'float', pathIndex: orbitPath });

  ctx.heroQuest('dragon', 'Mountain Gate', [...gateIds, steps]);
  ctx.heroQuest('lantern', 'Peak Lanterns', [...lampL, ...lampR]);
  ctx.heroQuest('violet', 'Violet', [1, 2, 3, 4]);
  ctx.heroQuest('planet', 'Lantern Moon', [12, 13]);
}

// ===========================================================================
// U19 C2A: The Sleeping Jade-Dragon Terrace
// ===========================================================================
function buildU19C2A(ctx: SceneCtx): void {
  const { r, rng } = ctx;
  initChapter(ctx, 'u19_c2a', 260, 158);

  drawSkySparkles(ctx, 18, 134, 'stars');

  const orbX = Math.round(jit(rng, 82, 4));
  const orbY = Math.round(jit(rng, 52, 3));
  const orb = drawThemedOrb(ctx, orbX, orbY, 21, 'lanternMoon');

  drawThemedCloud(ctx, 14, Math.round(jit(rng, 224, 4)), Math.round(jit(rng, 42, 3)), 86, 26, 'sakura');
  drawThemedCloud(ctx, 15, Math.round(jit(rng, 396, 4)), Math.round(jit(rng, 48, 3)), 84, 26, 'sakura');

  drawHorizonHills(ctx, { style: 'peaks', yBase: 148, yBottom: 214, layers: 2, labelPrefix: 'Jade' });
  drawGroundDeck(ctx, { style: 'courtyard', yTop: 206, yBottom: 250, labelPrefix: 'Dragon' });

  // Hero curled sleeping jade dragon on carved terrace + hillside pagoda left + ember censer
  const pagodaIds = drawPagodaTower(ctx, 94, 168, 0.94, { label: 'Terrace' });
  const dragonIds = drawSleepingDragon(ctx, 294, 178, 1.14, { label: 'Jade', flip: -1 });

  const censer = ctx.dyn('star', 'Golden Sparkle Ring');
  r.disc(censer, 192, 142, 14);
  inkArc(r, 192, 142, 8, 8, 0, Math.PI * 2, 0, { only: [censer] });

  emberStar(ctx, 'Ember Ring Star A', Math.round(jit(rng, 224, 3)), Math.round(jit(rng, 108, 3)), 11);
  emberStar(ctx, 'Ember Ring Star B', Math.round(jit(rng, 434, 3)), Math.round(jit(rng, 128, 3)), 11);

  drawGhostSilhouette(ctx, 'Terrace Dragon Ghost', 'dragon', Math.round(jit(rng, 304, 3)), Math.round(jit(rng, 88, 3)), 0.98);
  drawGhostSilhouette(ctx, 'Cloud Fox Ghost', 'fox', Math.round(jit(rng, 166, 3)), Math.round(jit(rng, 82, 3)), 0.92);

  ctx.ellipsePath('ring', orbX, orbY, orb.rx, orb.ry, 24, orb.tilt);
  const sprintPath = ctx.wavePath('sprint', 56, 234, 424, 232, 9, 2, 18);
  const orbitPath = ctx.ellipsePath('orbit', 240, 88, 170, 44, 24);
  ctx.marginPath(256);

  ctx.actor('violet', 168, 242, { facing: 1, anim: 'idle' });
  ctx.actor('nova', 386, 240, { facing: -1, anim: 'sleep', pathIndex: sprintPath });
  ctx.actor('moonCat', 56, 236, { facing: 1, anim: 'sleep' });
  ctx.actor('comet', 316, 48, { facing: -1, anim: 'float', pathIndex: orbitPath });

  ctx.heroQuest('dragon', 'Jade Dragon', [...dragonIds, censer]);
  ctx.heroQuest('lantern', 'Hill Pagoda', pagodaIds);
  ctx.heroQuest('nova', 'Nova', [9, 10, 11]);
  ctx.heroQuest('cloud', 'Mist Clouds', [14, 15]);
}

// ===========================================================================
// U19 C2B: The Sky-Pagoda Lantern Ridge
// ===========================================================================
function buildU19C2B(ctx: SceneCtx): void {
  const { rng } = ctx;
  initChapter(ctx, 'u19_c2b', 240, 152);

  drawSkySparkles(ctx, 18, 134, 'stars');

  const orbX = Math.round(jit(rng, 396, 4));
  const orbY = Math.round(jit(rng, 52, 3));
  const orb = drawThemedOrb(ctx, orbX, orbY, 21, 'lanternMoon');

  drawThemedCloud(ctx, 14, Math.round(jit(rng, 88, 4)), Math.round(jit(rng, 44, 3)), 86, 26, 'sakura');
  drawThemedCloud(ctx, 15, Math.round(jit(rng, 248, 4)), Math.round(jit(rng, 38, 3)), 80, 24, 'sakura');

  drawHorizonHills(ctx, { style: 'peaks', yBase: 148, yBottom: 214, layers: 2, labelPrefix: 'Ridge' });
  drawGroundDeck(ctx, { style: 'tatami', yTop: 206, yBottom: 250, labelPrefix: 'Pagoda' });

  // Twin sky pagodas linked across a central glowing festival paper lantern
  const pagL = drawPagodaTower(ctx, 98, 168, 0.96, { label: 'West' });
  const lanternC = drawPaperLantern(ctx, 240, 152, 1.05, { label: 'Ridge' });
  const pagR = drawPagodaTower(ctx, 382, 168, 0.96, { label: 'East', flip: -1 });

  emberStar(ctx, 'Lantern Spark A', Math.round(jit(rng, 168, 3)), Math.round(jit(rng, 108, 3)), 11);
  emberStar(ctx, 'Lantern Spark B', Math.round(jit(rng, 312, 3)), Math.round(jit(rng, 108, 3)), 11);

  drawGhostSilhouette(ctx, 'Ridge Dragon Ghost', 'dragon', Math.round(jit(rng, 164, 3)), Math.round(jit(rng, 68, 3)), 0.95);
  drawGhostSilhouette(ctx, 'Ridge Crane Ghost', 'crane', Math.round(jit(rng, 318, 3)), Math.round(jit(rng, 68, 3)), 0.95);
  drawGhostSilhouette(ctx, 'Ridge Owl Ghost', 'owl', Math.round(jit(rng, 444, 3)), Math.round(jit(rng, 114, 3)), 0.9);

  ctx.ellipsePath('ring', orbX, orbY, orb.rx, orb.ry, 24, orb.tilt);
  const gallopPath = ctx.wavePath('gallop', 60, 234, 420, 232, 9, 1.5, 18);
  const orbitPath = ctx.ellipsePath('orbit', 240, 86, 172, 44, 24);
  ctx.marginPath(256);

  ctx.actor('violet', 166, 242, { facing: 1, anim: 'idle' });
  ctx.actor('lumi', 316, 242, { facing: -1, anim: 'rear', pathIndex: gallopPath });
  ctx.actor('moonCat', 428, 236, { facing: -1, anim: 'peek' });
  ctx.actor('comet', 240, 84, { facing: 1, anim: 'float', pathIndex: orbitPath });

  ctx.heroQuest('lantern', 'Ridge Lantern', lanternC);
  ctx.heroQuest('dragon', 'Twin Pagodas', [...pagL, ...pagR]);
  ctx.heroQuest('lumi', 'Lumi', [5, 6, 7, 8]);
  ctx.heroQuest('planet', 'Lantern Moon', [12, 13]);
}

// ===========================================================================
// U19 C3A: The Floating Waterfall Spires
// ===========================================================================
function buildU19C3A(ctx: SceneCtx): void {
  const { rng } = ctx;
  initChapter(ctx, 'u19_c3a', 240, 146);

  drawSkySparkles(ctx, 18, 132, 'bubbles');

  const orbX = Math.round(jit(rng, 82, 4));
  const orbY = Math.round(jit(rng, 52, 3));
  const orb = drawThemedOrb(ctx, orbX, orbY, 21, 'pearlMoon');

  drawThemedCloud(ctx, 14, Math.round(jit(rng, 242, 4)), Math.round(jit(rng, 38, 3)), 86, 26, 'sakura');
  drawThemedCloud(ctx, 15, Math.round(jit(rng, 400, 4)), Math.round(jit(rng, 46, 3)), 82, 26, 'sakura');

  drawHorizonHills(ctx, { style: 'peaks', yBase: 158, yBottom: 216, layers: 2, labelPrefix: 'Mist' });
  drawGroundDeck(ctx, { style: 'courtyard', yTop: 208, yBottom: 250, labelPrefix: 'Pool' });

  // Floating waterfall spires cascading across the misty valley
  const spireL = drawWaterfallSpire(ctx, 94, 154, 68, 92, 'West');
  const spireC = drawWaterfallSpire(ctx, 240, 146, 78, 102, 'Central');
  const spireR = drawWaterfallSpire(ctx, 386, 154, 68, 92, 'East');

  // Pagoda crowned atop the left cliff spire & curled dragon resting right!
  const pagIds = drawPagodaTower(ctx, 94, 92, 0.76, { label: 'Spire' });
  const dragonIds = drawSleepingDragon(ctx, 384, 104, 0.78, { label: 'Spire', flip: -1 });

  drawGhostSilhouette(ctx, 'Cascade Dragon Ghost', 'dragon', Math.round(jit(rng, 166, 3)), Math.round(jit(rng, 78, 3)), 0.92);
  drawGhostSilhouette(ctx, 'Cascade Koi Ghost', 'koi', Math.round(jit(rng, 316, 3)), Math.round(jit(rng, 76, 3)), 0.92);

  ctx.ellipsePath('ring', orbX, orbY, orb.rx, orb.ry, 24, orb.tilt);
  const swimPath = ctx.wavePath('swim', 56, 134, 424, 134, 18, 1.5, 20);
  const gallopPath = ctx.wavePath('gallop', 62, 234, 418, 232, 9, 1.5, 18);
  const orbitPath = ctx.ellipsePath('orbit', 240, 84, 170, 44, 24);
  ctx.marginPath(256);

  ctx.actor('whale', 240, 128, { facing: 1, anim: 'swim', pathIndex: swimPath });
  ctx.actor('violet', 166, 242, { facing: 1, anim: 'idle' });
  ctx.actor('lumi', 316, 242, { facing: -1, anim: 'idle', pathIndex: gallopPath });
  ctx.actor('comet', 318, 42, { facing: -1, anim: 'float', pathIndex: orbitPath });

  ctx.heroQuest('dragon', 'Waterfall Spires', [...spireL, ...spireC, ...spireR]);
  ctx.heroQuest('lantern', 'Cliff Shrines', [...pagIds, ...dragonIds]);
  ctx.heroQuest('whale', 'Cloud Whale', [19, 29]);
  ctx.heroQuest('lumi', 'Lumi', [5, 6, 7, 8]);
}

// ===========================================================================
// U19 C3B: The Pearl-of-the-Sky Observatory
// ===========================================================================
function buildU19C3B(ctx: SceneCtx): void {
  const { rng } = ctx;
  initChapter(ctx, 'u19_c3b', 240, 148);

  drawSkySparkles(ctx, 18, 134, 'stars');

  const orbX = Math.round(jit(rng, 396, 4));
  const orbY = Math.round(jit(rng, 52, 3));
  const orb = drawThemedOrb(ctx, orbX, orbY, 21, 'astrolabe');

  drawThemedCloud(ctx, 14, Math.round(jit(rng, 88, 4)), Math.round(jit(rng, 44, 3)), 86, 26, 'sakura');
  drawThemedCloud(ctx, 15, Math.round(jit(rng, 246, 4)), Math.round(jit(rng, 38, 3)), 80, 24, 'sakura');

  drawHorizonHills(ctx, { style: 'peaks', yBase: 150, yBottom: 214, layers: 2, labelPrefix: 'Observatory' });
  drawGroundDeck(ctx, { style: 'courtyard', yTop: 206, yBottom: 250, labelPrefix: 'Observatory' });

  // Hero luminous Sky Pearl hovering between curved bronze dragon horns!
  const cradleIds = drawSkyPearlCradle(ctx, 240, 166, 1.15, 'Observatory');
  const lampIds = drawPaperLantern(ctx, 94, 166, 0.9, { label: 'Observatory' });
  const pagIds = drawPagodaTower(ctx, 386, 168, 0.92, { label: 'Observatory' });

  emberStar(ctx, 'Pearl Star West', Math.round(jit(rng, 162, 3)), Math.round(jit(rng, 108, 3)), 11.5);
  emberStar(ctx, 'Pearl Star East', Math.round(jit(rng, 318, 3)), Math.round(jit(rng, 108, 3)), 11.5);

  drawGhostSilhouette(ctx, 'Pearl Dragon Ghost', 'dragon', Math.round(jit(rng, 162, 3)), Math.round(jit(rng, 68, 3)), 0.95);
  drawGhostSilhouette(ctx, 'Observatory Owl Ghost', 'owl', Math.round(jit(rng, 322, 3)), Math.round(jit(rng, 70, 3)), 0.92);
  drawGhostSilhouette(ctx, 'Star Crane Ghost', 'crane', Math.round(jit(rng, 444, 3)), Math.round(jit(rng, 112, 3)), 0.9);

  ctx.ellipsePath('ring', orbX, orbY, orb.rx, orb.ry, 24, orb.tilt);
  const sprintPath = ctx.wavePath('sprint', 60, 234, 420, 232, 9, 2, 18);
  const orbitPath = ctx.ellipsePath('orbit', 240, 88, 170, 44, 24);
  ctx.marginPath(256);

  ctx.actor('violet', 156, 242, { facing: 1, anim: 'idle' });
  ctx.actor('nova', 284, 240, { facing: 1, anim: 'leap', pathIndex: sprintPath });
  ctx.actor('gazelle', 404, 238, { facing: -1, anim: 'idle', pathIndex: sprintPath });
  ctx.actor('comet', 240, 86, { facing: 1, anim: 'float', pathIndex: orbitPath });

  ctx.heroQuest('dragon', 'Sky Pearl', cradleIds);
  ctx.heroQuest('lantern', 'Star Shrine', [...lampIds, ...pagIds]);
  ctx.heroQuest('violet', 'Violet', [1, 2, 3, 4]);
  ctx.heroQuest('planet', 'Astrolabe', [12, 13]);
}

// ===========================================================================
// U19 C4A: The Bamboo Cloud-Bridge Crossing
// ===========================================================================
function buildU19C4A(ctx: SceneCtx): void {
  const { r, rng } = ctx;
  initChapter(ctx, 'u19_c4a', 240, 152);

  drawSkySparkles(ctx, 18, 132, 'stars');

  const orbX = Math.round(jit(rng, 82, 4));
  const orbY = Math.round(jit(rng, 52, 3));
  const orb = drawThemedOrb(ctx, orbX, orbY, 21, 'lanternMoon');

  drawThemedCloud(ctx, 14, Math.round(jit(rng, 242, 4)), Math.round(jit(rng, 38, 3)), 86, 26, 'sakura');
  drawThemedCloud(ctx, 15, Math.round(jit(rng, 400, 4)), Math.round(jit(rng, 46, 3)), 82, 26, 'sakura');

  drawHorizonHills(ctx, { style: 'bamboo', yBase: 148, yBottom: 214, layers: 2, labelPrefix: 'Cloud' });

  // Bespoke sweeping arched bamboo cloud-bridge spanning the center chasm!
  const bridge = ctx.dyn('prop', 'Bamboo Cloud-Bridge');
  r.shape(bridge, 66, 134, 414, 212, (px, py) => {
    const u = (px - 240) / 172;
    if (Math.abs(u) > 1) return false;
    const archY = 166 + u * u * 34;
    return py >= archY - 9 && py <= archY + 11;
  });
  for (let bx = 92; bx <= 388; bx += 22) {
    const u = (bx - 240) / 172;
    const ay = 166 + u * u * 34;
    r.line(INK, bx, ay - 7, bx, ay + 9, { only: [bridge] });
  }

  drawGroundDeck(ctx, { style: 'pier', yTop: 206, yBottom: 250, labelPrefix: 'Bamboo' });

  // Shrine gate on right + twin golden hanging lanterns flanking the bridge!
  const toriiIds = drawToriiGate(ctx, 384, 168, 0.9, { label: 'Bridge' });
  const lampL = drawPaperLantern(ctx, 94, 158, 0.9, { label: 'Bridge West' });
  const lampC = drawPaperLantern(ctx, 240, 124, 0.86, { label: 'Bridge Crown' });

  drawGhostSilhouette(ctx, 'Bridge Dragon Ghost', 'dragon', Math.round(jit(rng, 162, 3)), Math.round(jit(rng, 88, 3)), 0.95);
  drawGhostSilhouette(ctx, 'Bridge Crane Ghost', 'crane', Math.round(jit(rng, 318, 3)), Math.round(jit(rng, 84, 3)), 0.95);

  ctx.ellipsePath('ring', orbX, orbY, orb.rx, orb.ry, 24, orb.tilt);
  const gallopPath = ctx.wavePath('gallop', 60, 234, 420, 232, 9, 1.5, 18);
  const sprintPath = ctx.wavePath('sprint', 70, 228, 410, 228, 8, 2, 18);
  const orbitPath = ctx.ellipsePath('orbit', 240, 84, 170, 44, 24);
  ctx.marginPath(256);

  ctx.actor('lumi', 132, 242, { facing: 1, anim: 'rear', pathIndex: gallopPath });
  ctx.actor('violet', 240, 244, { facing: 1, anim: 'idle' });
  ctx.actor('nova', 352, 242, { facing: -1, anim: 'leap', pathIndex: sprintPath });
  ctx.actor('comet', 318, 44, { facing: -1, anim: 'float', pathIndex: orbitPath });

  ctx.heroQuest('lantern', 'Cloud Bridge', [bridge, ...lampL, ...lampC]);
  ctx.heroQuest('dragon', 'Bridge Gate', toriiIds);
  ctx.heroQuest('lumi', 'Lumi', [5, 6, 7, 8]);
  ctx.heroQuest('nova', 'Nova', [9, 10, 11]);
}

// ===========================================================================
// U19 C4B: The Dragon-Kite Wind Amphitheater
// ===========================================================================
function buildU19C4B(ctx: SceneCtx): void {
  const { rng } = ctx;
  initChapter(ctx, 'u19_c4b', 240, 146);

  drawSkySparkles(ctx, 18, 134, 'petals');

  const orbX = Math.round(jit(rng, 396, 4));
  const orbY = Math.round(jit(rng, 52, 3));
  const orb = drawThemedOrb(ctx, orbX, orbY, 21, 'lanternMoon');

  drawThemedCloud(ctx, 14, Math.round(jit(rng, 88, 4)), Math.round(jit(rng, 44, 3)), 86, 26, 'sakura');
  drawThemedCloud(ctx, 15, Math.round(jit(rng, 246, 4)), Math.round(jit(rng, 38, 3)), 80, 24, 'sakura');

  drawHorizonHills(ctx, { style: 'peaks', yBase: 152, yBottom: 214, layers: 2, labelPrefix: 'Wind' });
  drawGroundDeck(ctx, { style: 'stage', yTop: 206, yBottom: 250, labelPrefix: 'Kite' });

  // Soaring dragon kite + origami crane dancing above a curled baby jade dragon!
  const kiteIds = drawKiteDragon(ctx, 198, 118, 1.06, { label: 'Sky' });
  const craneIds = drawOrigamiCrane(ctx, 366, 128, 0.92, { label: 'Wind', flip: -1 });
  const sleepIds = drawSleepingDragon(ctx, 114, 182, 0.88, { label: 'Baby' });

  emberStar(ctx, 'Wind Banner Star', Math.round(jit(rng, 296, 3)), Math.round(jit(rng, 102, 3)), 11.5);

  drawGhostSilhouette(ctx, 'Kite Dragon Ghost', 'dragon', Math.round(jit(rng, 314, 3)), Math.round(jit(rng, 68, 3)), 0.92);
  drawGhostSilhouette(ctx, 'Kite Moth Ghost', 'moth', Math.round(jit(rng, 72, 3)), Math.round(jit(rng, 102, 3)), 0.92);
  drawGhostSilhouette(ctx, 'Kite Crane Ghost', 'crane', Math.round(jit(rng, 442, 3)), Math.round(jit(rng, 112, 3)), 0.9);

  ctx.ellipsePath('ring', orbX, orbY, orb.rx, orb.ry, 24, orb.tilt);
  const sprintPath = ctx.wavePath('sprint', 60, 234, 420, 232, 9, 2, 18);
  const orbitPath = ctx.ellipsePath('orbit', 240, 88, 174, 46, 24);
  ctx.marginPath(256);

  ctx.actor('violet', 236, 242, { facing: 1, anim: 'idle' });
  ctx.actor('gazelle', 352, 238, { facing: -1, anim: 'leap', pathIndex: sprintPath });
  ctx.actor('moonCat', 428, 236, { facing: -1, anim: 'peek' });
  ctx.actor('comet', 142, 76, { facing: 1, anim: 'float', pathIndex: orbitPath });

  ctx.heroQuest('dragon', 'Dragon Kite', [...kiteIds, ...sleepIds]);
  ctx.heroQuest('crane', 'Wind Crane', craneIds);
  ctx.heroQuest('violet', 'Violet', [1, 2, 3, 4]);
  ctx.heroQuest('cloud', 'Wind Clouds', [14, 15]);
}

// ===========================================================================
// U19 C5 (GRAND FINALE, 50..70 regions): The Summit of the Celestial Dragon
// ===========================================================================
function buildU19C5(ctx: SceneCtx): void {
  const { r, rng } = ctx;
  initChapter(ctx, 'u19_c5', 240, 112);

  const cx = 240;
  const cy = 110;
  const twist = rng.range(-0.025, 0.025);

  drawSkySparkles(ctx, 20, 130, 'stars');

  // 1) Summit Cloud-Step Terrace + Flanking Twin Cloud Pagoda Roofs + Dragon Whisker Arcs (5 regions)
  const terrace = ctx.dyn('prop', 'Celestial Summit Terrace');
  r.poly(terrace, [[44, 224], [436, 224], [454, 248], [26, 248]]);
  r.line(INK, 54, 236, 426, 236, { only: [terrace] });

  for (const side of [-1, 1] as const) {
    const lbl = side < 0 ? 'West' : 'East';
    const px = side < 0 ? 48 : 432;
    const shrine = ctx.dyn('prop', `${lbl} Summit Shrine`);
    r.poly(shrine, [[px - 26, 162], [px, 142], [px + 26, 162], [px + 18, 212], [px - 18, 212]]);
    r.line(INK, px - 18, 178, px + 18, 178, { only: [shrine] });

    const crest = ctx.dyn('flora', `${lbl} Cloud Dragon Wing`);
    r.poly(crest, [
      [cx + side * 84, cy - 56],
      [cx + side * 146, cy - 66],
      [cx + side * 188, cy - 34],
      [cx + side * 172, cy - 16],
      [cx + side * 136, cy - 46],
      [cx + side * 80, cy - 40],
    ]);
  }

  // 2) Panoramic Celestial Dragon Pearl Mandala (12 + 8 + 8 + 1 = 29 regions)
  const sx = 1.12;
  const sy = 0.94;
  const pol = (rad: number, a: number): Pt => [cx + Math.cos(a) * rad * sx, cy + Math.sin(a) * rad * sy];

  // Outer ring: 12 jade dragon-scale petals
  for (let i = 0; i < 12; i++) {
    const a = -Math.PI / 2 + (i * Math.PI * 2) / 12 + twist;
    const sid = ctx.dyn('flora', `Jade Scale Crest ${i + 1}`);
    r.poly(sid, [
      pol(52, a - 0.16),
      pol(72, a - 0.2),
      pol(86, a),
      pol(72, a + 0.2),
      pol(52, a + 0.16),
    ]);
    const pA = pol(58, a);
    const pB = pol(78, a);
    r.line(INK, pA[0], pA[1], pB[0], pB[1], { only: [sid] });
  }

  // Middle ring: 8 golden ember diamond wedges
  for (let i = 0; i < 8; i++) {
    const a = -Math.PI / 2 + ((i + 0.5) * Math.PI * 2) / 8 + twist;
    const wid = ctx.dyn('star', `Ember Wedge ${i + 1}`);
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

  // Inner ring: 8 celestial cloud-scroll rays
  const innerIds: number[] = [];
  for (let i = 0; i < 8; i++) {
    const a = -Math.PI / 2 + (i * Math.PI * 2) / 8 + twist;
    const iid = ctx.dyn('star', `Dragon Halo Ray ${i + 1}`);
    innerIds.push(iid);
    r.poly(iid, [
      pol(15, a - 0.24),
      pol(40, a - 0.16),
      pol(44, a),
      pol(40, a + 0.16),
      pol(15, a + 0.24),
    ]);
    const pA = pol(22, a);
    const pB = pol(37, a);
    r.line(INK, pA[0], pA[1], pB[0], pB[1], { only: [iid] });
  }

  // Center Core: The Great Celestial Dragon Pearl!
  const pearlCore = ctx.dyn('star', 'Celestial Dragon Pearl');
  r.disc(pearlCore, cx, cy + 1, 17);
  inkArc(r, cx, cy + 1, 11, 11, Math.PI * 0.9, Math.PI * 1.85, 0, { only: [pearlCore] });
  inkArc(r, cx, cy + 1, 5.5, 5.5, 0, Math.PI * 2, 0, { only: [pearlCore] });

  // 3) Side orbits: Canonical Lantern Moon (12/13) left + Mirrored Sky Pearl Cradle right
  const orbX = 72;
  const orbY = 82 + Math.round(jit(rng, 0, 2));
  const orb = drawThemedOrb(ctx, orbX, orbY, 15.5, 'lanternMoon');

  drawSkyPearlCradle(ctx, 408, 88, 0.64, 'Summit');

  // Four corner framing dragon stars
  emberStar(ctx, 'NW Summit Star', 34, 30, 11.5);
  emberStar(ctx, 'NE Summit Star', 446, 30, 11.5);
  emberStar(ctx, 'West Peak Star', 124, 150, 11);
  emberStar(ctx, 'East Peak Star', 356, 150, 11);

  // Canonical sakura/kumo clouds (14/15) cradling summit flanks
  drawThemedCloud(ctx, 14, 62, 226, 94, 30, 'sakura');
  drawThemedCloud(ctx, 15, 418, 226, 94, 30, 'sakura');

  // 3 Ghosts in clean open upper sky pockets
  drawGhostSilhouette(ctx, 'Summit Dragon Ghost', 'dragon', 152, 22, 0.92);
  drawGhostSilhouette(ctx, 'Summit Crane Ghost', 'crane', 328, 22, 0.92);
  drawGhostSilhouette(ctx, 'Summit Owl Ghost', 'owl', 240, 18, 0.85);

  // Paths & Actors (Violet 4 + Lumi 4 + Nova 3 + Gazelle 2 + Comet 2 = 15 actor regions -> total ~61!)
  const gallopPath = ctx.wavePath('gallop', 66, 240, 414, 240, 8, 2, 20);
  const sprintPath = ctx.wavePath('sprint', 90, 236, 390, 236, 9, 2, 20);
  const orbitPath = ctx.ellipsePath('orbit', cx, cy, 182, 82, 28);
  ctx.ellipsePath('ring', orbX, orbY, orb.rx, orb.ry, 24, orb.tilt);
  ctx.marginPath(256);

  ctx.actor('lumi', 148, 246, { facing: 1, anim: 'rear', pathIndex: gallopPath });
  ctx.actor('violet', 240, 248, { facing: 1, anim: 'idle' });
  ctx.actor('nova', 332, 246, { facing: -1, anim: 'leap', pathIndex: sprintPath });
  ctx.actor('gazelle', 110, 202, { facing: 1, anim: 'idle', pathIndex: sprintPath });
  ctx.actor('comet', 372, 134, { facing: -1, anim: 'float', pathIndex: orbitPath });

  ctx.heroQuest('dragon', 'Dragon Summit', [pearlCore, ...innerIds]);
  ctx.heroQuest('violet', 'Violet', [1, 2, 3, 4]);
  ctx.heroQuest('lumi', 'Lumi', [5, 6, 7, 8]);
  ctx.heroQuest('nova', 'Nova', [9, 10, 11]);
}

export const U19_SCENES: Record<U19SceneId, (ctx: SceneCtx) => void> = {
  hub_jadeDragonPeaks: buildHubJadeDragonPeaks,
  u19_c1: buildU19C1,
  u19_c2a: buildU19C2A,
  u19_c2b: buildU19C2B,
  u19_c3a: buildU19C3A,
  u19_c3b: buildU19C3B,
  u19_c4a: buildU19C4A,
  u19_c4b: buildU19C4B,
  u19_c5: buildU19C5,
};
