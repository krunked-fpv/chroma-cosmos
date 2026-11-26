/**
 * Universe 7: Crystal Aurora Snowglobe (`auroraIcePalace`)
 * 9 bespoke scenes: Hub Sanctuary ("Violet's Frosted Aurora Chalet") + 8 Winter Chapters,
 * culminating in the double-dense Grand Crystal Aurora Palace finale.
 * Pure & deterministic (uses ctx.rng only; zero timers or wall-clock APIs).
 */
import { MaterialId } from '../../contracts/materials';
import { UNIVERSE_BY_ID } from '../../contracts/universes';
import type { SceneCtx } from '../context';
import {
  drawCarousel,
  drawCrystalCluster,
  drawGhostSilhouette,
  drawGroundDeck,
  drawHarpWaterfall,
  drawHorizonHills,
  drawIcePalace,
  drawIglooDome,
  drawPortalArch,
  drawSanctuaryRoom,
  drawSkySparkles,
  drawSnowglobe,
  drawThemedCloud,
  drawThemedOrb,
} from '../kit';
import { crescent, inkArc, jit, star, twinkle } from '../props';
import { INK, type Pt } from '../raster';

const DEF = UNIVERSE_BY_ID.auroraIcePalace;

type U07SceneId =
  | 'hub_auroraIcePalace'
  | 'u07_c1'
  | 'u07_c2a'
  | 'u07_c2b'
  | 'u07_c3a'
  | 'u07_c3b'
  | 'u07_c4a'
  | 'u07_c4b'
  | 'u07_c5';

function initChapter(ctx: SceneCtx, chapterIdx: number, focalX = 240, focalY = 160): void {
  const ch = DEF.chapters[chapterIdx]!;
  ctx.title = ch.title;
  ctx.sky = { ...DEF.sky };
  ctx.universeId = DEF.id;
  ctx.ambient = DEF.ambient;
  ctx.focal = { x: focalX, y: focalY };
}

/** Sweeping northern-lights ribbon curving gracefully through the arctic sky (1 region). */
function drawAuroraRibbon(
  ctx: SceneCtx,
  x0: number,
  x1: number,
  yMid: number,
  amp: number,
  thick: number,
  phase: number,
  label: string,
  preColor?: MaterialId,
): number {
  const { r } = ctx;
  const id = ctx.dyn('star', label);
  const top: Pt[] = [];
  const bot: Pt[] = [];
  const steps = 18;
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const x = x0 + (x1 - x0) * t;
    const env = Math.sin(t * Math.PI);
    const wave = Math.sin(t * Math.PI * 2 + phase) * amp;
    const y = yMid + wave;
    const h = thick * (0.45 + 0.55 * env);
    top.push([x, y - h * 0.5]);
    bot.push([x, y + h * 0.5]);
  }
  bot.reverse();
  r.poly(id, [...top, ...bot]);
  for (let i = 2; i < steps - 1; i += 2) {
    const t = i / steps;
    const x = x0 + (x1 - x0) * t;
    const y = yMid + Math.sin(t * Math.PI * 2 + phase) * amp;
    r.line(INK, x, y - thick * 0.28, x + 2, y + thick * 0.28, { only: [id] });
  }
  if (preColor !== undefined) ctx.preColor(id, preColor);
  return id;
}

/** Tiered snow-laden winter spruce tree (2 chunky regions: frosty boughs + trunk). */
function drawFrostedPine(
  ctx: SceneCtx,
  x: number,
  baseY: number,
  scale = 1,
  label = 'Frosted Pine',
  preColor?: readonly MaterialId[],
): number[] {
  const { r } = ctx;
  const s = Math.max(0.7, scale);
  const trunk = ctx.dyn('prop', `${label} Trunk`);
  const crown = ctx.dyn('flora', `${label} Boughs`);
  r.rect(trunk, x - 8.5 * s, baseY - 22 * s, x + 8.5 * s, baseY);
  r.ellipse(trunk, x, baseY - 2 * s, 12.5 * s, 4.5 * s);
  r.line(INK, x, baseY - 18 * s, x, baseY - 3 * s, { only: [trunk] });

  r.poly(crown, [
    [x, baseY - 66 * s],
    [x + 16 * s, baseY - 44 * s],
    [x + 10 * s, baseY - 44 * s],
    [x + 22 * s, baseY - 28 * s],
    [x + 14 * s, baseY - 28 * s],
    [x + 26 * s, baseY - 16 * s],
    [x - 26 * s, baseY - 16 * s],
    [x - 14 * s, baseY - 28 * s],
    [x - 22 * s, baseY - 28 * s],
    [x - 10 * s, baseY - 44 * s],
    [x - 16 * s, baseY - 44 * s],
  ]);
  r.line(INK, x - 12 * s, baseY - 42 * s, x + 12 * s, baseY - 42 * s, { only: [crown] });
  r.line(INK, x - 18 * s, baseY - 26 * s, x + 18 * s, baseY - 26 * s, { only: [crown] });

  if (preColor && preColor.length >= 2) {
    ctx.preColor(trunk, preColor[0]!);
    ctx.preColor(crown, preColor[1]!);
  }
  return [trunk, crown];
}

/** Glowing frosted street-lantern post (2 regions: wrought post + crystal lantern). */
function drawSnowLanternPost(ctx: SceneCtx, x: number, baseY: number, scale = 1, label = 'Frost Lantern'): number[] {
  const { r } = ctx;
  const s = Math.max(0.75, scale);
  const post = ctx.dyn('prop', `${label} Post`);
  const lamp = ctx.dyn('star', `${label} Globe`);
  r.rect(post, x - 4.5 * s, baseY - 48 * s, x + 4.5 * s, baseY);
  r.ellipse(post, x, baseY - 2 * s, 11 * s, 4.5 * s);
  r.rect(post, x - 11 * s, baseY - 49 * s, x + 11 * s, baseY - 44 * s);
  r.poly(lamp, [
    [x, baseY - 68 * s],
    [x + 11 * s, baseY - 58 * s],
    [x + 8 * s, baseY - 46 * s],
    [x - 8 * s, baseY - 46 * s],
    [x - 11 * s, baseY - 58 * s],
  ]);
  r.line(INK, x, baseY - 64 * s, x, baseY - 49 * s, { only: [lamp] });
  r.line(INK, x - 7 * s, baseY - 57 * s, x + 7 * s, baseY - 57 * s, { only: [lamp] });
  return [post, lamp];
}

/** Mirror-blue skating ice rink with etched ribbon skate loops (2 regions: rim + mirror ice). */
function drawFrozenPond(ctx: SceneCtx, cx: number, cy: number, rx: number, ry: number, label = 'Starlight Rink'): number[] {
  const { r } = ctx;
  const rim = ctx.dyn('prop', `${label} Snowbank`);
  const ice = ctx.dyn('star', `${label} Ice`);
  r.ellipse(rim, cx, cy, rx + 10, ry + 6);
  r.ellipse(ice, cx, cy, rx, ry);
  inkArc(r, cx - rx * 0.32, cy, rx * 0.28, ry * 0.45, 0.2, Math.PI * 1.65, 0, { only: [ice] });
  inkArc(r, cx + rx * 0.28, cy + 2, rx * 0.26, ry * 0.42, Math.PI * 0.4, Math.PI * 1.9, 0, { only: [ice] });
  r.line(INK, cx - rx * 0.55, cy - ry * 0.3, cx - rx * 0.35, cy - ry * 0.1, { only: [ice] });
  r.line(INK, cx + rx * 0.35, cy - ry * 0.35, cx + rx * 0.55, cy - ry * 0.15, { only: [ice] });
  return [rim, ice];
}

/** Graceful carved crystal bridge arch spanning an icy gulf (2 regions: arch span + snow rail). */
function drawIceBridgeArch(ctx: SceneCtx, cx: number, yBase: number, w: number, h: number, label = 'Aurora Bridge'): number[] {
  const { r } = ctx;
  const hw = w / 2;
  const arch = ctx.dyn('prop', `${label} Arch`);
  const rail = ctx.dyn('star', `${label} Rail`);

  const topPts: Pt[] = [];
  const botPts: Pt[] = [];
  for (let i = 0; i <= 16; i++) {
    const t = i / 16;
    const x = cx - hw + t * w;
    const lift = Math.sin(t * Math.PI) * h;
    topPts.push([x, yBase - lift - 14]);
    botPts.push([x, yBase - lift * 0.55 + 6]);
  }
  botPts.reverse();
  r.poly(arch, [...topPts, ...botPts]);
  for (let i = 2; i <= 14; i += 2) {
    const t = i / 16;
    const x = cx - hw + t * w;
    const lift = Math.sin(t * Math.PI) * h;
    r.line(INK, x, yBase - lift - 10, x, yBase - lift * 0.55 + 2, { only: [arch] });
  }

  const rTop: Pt[] = [];
  const rBot: Pt[] = [];
  for (let i = 0; i <= 16; i++) {
    const t = i / 16;
    const x = cx - hw + t * w;
    const lift = Math.sin(t * Math.PI) * h;
    rTop.push([x, yBase - lift - 23]);
    rBot.push([x, yBase - lift - 12]);
  }
  rBot.reverse();
  r.poly(rail, [...rTop, ...rBot]);
  return [arch, rail];
}

/** Friendly snow-carved Polar Bear ice sculpture (3 regions: body, head, aurora scarf). */
function drawPolarBearSculpture(ctx: SceneCtx, x: number, y: number, scale = 1, label = 'Polar Bear'): number[] {
  const { r } = ctx;
  const s = Math.max(0.75, scale);
  const body = ctx.dyn('prop', `${label} Body`);
  const scarf = ctx.dyn('star', `${label} Scarf`);
  const head = ctx.dyn('prop', `${label} Head`);

  r.ellipse(body, x, y + 12 * s, 26 * s, 20 * s);
  r.capsule(body, x - 16 * s, y + 22 * s, x - 16 * s, y + 34 * s, 7 * s);
  r.capsule(body, x + 14 * s, y + 22 * s, x + 14 * s, y + 34 * s, 7 * s);

  r.ellipse(scarf, x + 6 * s, y - 4 * s, 18 * s, 6.5 * s);
  r.poly(scarf, [[x + 12 * s, y - 2 * s], [x + 24 * s, y + 10 * s], [x + 16 * s, y + 14 * s], [x + 6 * s, y + 2 * s]]);

  r.disc(head, x + 8 * s, y - 16 * s, 14 * s);
  r.disc(head, x - 2 * s, y - 27 * s, 5.5 * s);
  r.disc(head, x + 17 * s, y - 27 * s, 5.5 * s);
  r.dot(INK, x + 5 * s, y - 18 * s, { only: [head] });
  r.dot(INK, x + 13 * s, y - 18 * s, { only: [head] });
  inkArc(r, x + 9 * s, y - 13 * s, 4 * s, 2.5 * s, 0.1, Math.PI - 0.1, 0, { only: [head] });
  return [body, scarf, head];
}

/** Hanging crystal icicle cluster along a cavern ceiling (1 chunky region). */
function drawIcicleCluster(ctx: SceneCtx, x0: number, x1: number, yTop: number, depth: number, label: string): number {
  const { r } = ctx;
  const id = ctx.dyn('star', label);
  const pts: Pt[] = [[x0, yTop], [x1, yTop]];
  const spikes = 5;
  for (let i = spikes; i >= 0; i--) {
    const t = i / spikes;
    const x = x0 + (x1 - x0) * t;
    const tipY = yTop + depth * (i % 2 === 1 ? 1.0 : 0.42);
    pts.push([x, tipY]);
  }
  r.poly(id, pts);
  for (let i = 1; i < spikes; i += 2) {
    const x = x0 + ((x1 - x0) * i) / spikes;
    r.line(INK, x, yTop + 4, x, yTop + depth * 0.82, { only: [id] });
  }
  return id;
}

// ===========================================================================
// HUB SANCTUARY: Violet's Frosted Aurora Chalet (25..45 pre-colored regions, 0 ghosts)
// ===========================================================================
function buildHubAuroraIcePalace(ctx: SceneCtx): void {
  ctx.universeId = DEF.id;
  ctx.ambient = DEF.ambient;

  let snowglobeKeepsake: number[] = [];

  drawSanctuaryRoom(ctx, {
    title: DEF.hubTitle,
    sky: { ...DEF.sky },
    windowShape: 'dome',
    windowOrbStyle: 'snowglobe',
    wallStyle: 'crystal',
    floorStyle: 'ice',
    rugShape: 'star',
    lampStyle: 'crystal',
    garlandStyle: 'stars',
    sparkleStyle: 'snow',
    seatingLabel: 'Fur-Trimmed Frost Daybed',
    workbenchLabel: 'Crystal Craft Bench',
    shelfLabel: 'Aurora Keepsake Shelf',
    trinketLabels: ['Snowglobe Lore', 'Frost Crystals', 'Polar Folios'],
    palette: {
      wallPanel: MaterialId.DeepSpaceBiolum,
      floor: MaterialId.CrystalGlacierMint,
      windowFrame: MaterialId.OpalPearl,
      windowGlass: MaterialId.VelvetNebula,
      curtain: MaterialId.LiquidAurora,
      orbCore: MaterialId.HoloFoil,
      orbRing: MaterialId.CrystalGlacierMint,
      rugOuter: MaterialId.SupernovaGlitter,
      rugInner: MaterialId.CrystalGlacierMint,
      furniture: MaterialId.RoyalAstralGold,
      furnitureTrim: MaterialId.OpalPearl,
      accentA: MaterialId.CrystalGlacierMint,
      accentB: MaterialId.LiquidAurora,
      accentC: MaterialId.CottonCandyChalk,
    },
    drawWindowView: (c, wx, _wy, wHalf, wBot) => {
      // Distant alpine peaks visible inside the lower window arch
      const peaks = c.dyn('prop', 'Window Glacier Peaks');
      c.r.poly(peaks, [
        [wx - wHalf + 2, wBot - 1],
        [wx - 28, wBot - 22],
        [wx - 10, wBot - 12],
        [wx + 12, wBot - 28],
        [wx + 32, wBot - 14],
        [wx + wHalf - 2, wBot - 1],
      ]);
      c.r.line(INK, wx + 12, wBot - 24, wx + 12, wBot - 6, { only: [peaks] });
      c.preColor(peaks, MaterialId.CrystalGlacierMint);
    },
    drawExtraProps: (c) => {
      const extras: number[] = [];
      // 1) Framed Snowflake Aurora Banner on left upper wall (x=42..114, y=68..118)
      const frame = c.dyn('prop', 'Aurora Wall Tapestry');
      c.r.rect(frame, 46, 68, 110, 118);
      c.preColor(frame, MaterialId.RoyalAstralGold);
      extras.push(frame);

      const flake = c.dyn('star', 'Crystal Snowflake Emblem');
      star(c, flake, 78, 93, 16, { points: 6, inner: 0.45 });
      c.preColor(flake, MaterialId.CrystalGlacierMint);
      extras.push(flake);

      // 2) Standing Frosted Crystal Pine beside window & desk (x=284, y=206)
      const pine = drawFrostedPine(c, 282, 206, 0.72, 'Chalet Crystal Tree', [
        MaterialId.RoyalAstralGold,
        MaterialId.CrystalGlacierMint,
      ]);
      extras.push(...pine);

      // 3) Tabletop Miniature Snowglobe on right side of workbench (x=374, y=158)
      const globeGlass = c.dyn('star', 'Desk Snowglobe Dome');
      const globeBase = c.dyn('prop', 'Desk Snowglobe Base');
      c.r.disc(globeGlass, 375, 158, 14);
      inkArc(c.r, 375, 158, 10, 10, Math.PI * 1.1, Math.PI * 1.5, 0, { only: [globeGlass] });
      c.preColor(globeGlass, MaterialId.HoloFoil);
      c.r.poly(globeBase, [[362, 169], [388, 169], [391, 179], [359, 179]]);
      c.preColor(globeBase, MaterialId.SolarFlare24K);
      snowglobeKeepsake = [globeGlass, globeBase];
      extras.push(globeGlass, globeBase);

      return extras;
    },
  });

  ctx.heroQuest('violet', 'Violet', [1, 2, 3, 4]);
  ctx.heroQuest('planet', 'Snowglobe Orb', [12, 13]);
  ctx.heroQuest('igloo', 'Desk Globe', snowglobeKeepsake);
}

// ===========================================================================
// CHAPTER 1: The Cozy Snowglobe Welcome Gate (`u07_c1`)
// ===========================================================================
function buildU07C1(ctx: SceneCtx): void {
  const { rng } = ctx;
  initChapter(ctx, 0, 240, 166);
  drawSkySparkles(ctx, 20, 152, 'snow');

  const orb = drawThemedOrb(ctx, Math.round(jit(rng, 376, 4)), Math.round(jit(rng, 54, 3)), 20, 'snowglobe');
  drawThemedCloud(ctx, 14, Math.round(jit(rng, 106, 5)), Math.round(jit(rng, 46, 3)), 78, 28, 'fluffy');
  drawThemedCloud(ctx, 15, Math.round(jit(rng, 242, 5)), Math.round(jit(rng, 40, 3)), 72, 26, 'fluffy');
  drawAuroraRibbon(ctx, 36, 314, 88, 10, 14, 0.4, 'Northern Aurora Stream');
  star(ctx, ctx.dyn('star', 'Polar Star'), 440, 44, 11, { points: 5, inner: 0.46 });

  drawHorizonHills(ctx, { style: 'peaks', yBase: 168, yBottom: 224, layers: 2 });
  drawGroundDeck(ctx, { style: 'glacier', yTop: 210, yBottom: 250 });

  const gateIds = drawPortalArch(ctx, 240, 170, 0.96, { label: 'Snowglobe' });
  const globeIds = drawSnowglobe(ctx, 92, 178, 0.84, { label: 'Welcome' });
  const lanternL = drawSnowLanternPost(ctx, 152, 214, 0.88, 'West Frost');
  const lanternR = drawSnowLanternPost(ctx, 330, 214, 0.88, 'East Frost');
  drawFrostedPine(ctx, 412, 214, 0.96, 'Gate Spruce');

  drawGhostSilhouette(ctx, 'Aurora Penguin Ghost', 'penguin', Math.round(jit(rng, 294, 4)), Math.round(jit(rng, 114, 3)), 0.95);
  drawGhostSilhouette(ctx, 'Snowy Owl Ghost', 'owl', Math.round(jit(rng, 148, 4)), Math.round(jit(rng, 118, 3)), 0.92);

  const gallopPath = ctx.wavePath('gallop', 66, 232, 412, 228, 10, 1.5, 18);
  const orbitPath = ctx.ellipsePath('orbit', 240, 96, 170, 48, 24);
  ctx.ellipsePath('ring', 376, 54, orb.rx, orb.ry, 20, orb.tilt);
  ctx.marginPath(256);

  ctx.actor('violet', 194, 240, { facing: 1, anim: 'idle' });
  ctx.actor('lumi', 292, 238, { facing: -1, anim: 'idle', pathIndex: gallopPath });
  ctx.actor('moonCat', 92, 134, { facing: 1, anim: 'sleep' });
  ctx.actor('comet', 186, 76, { facing: 1, anim: 'float', pathIndex: orbitPath });

  ctx.heroQuest('igloo', 'Welcome Gate', [...gateIds, ...globeIds]);
  ctx.heroQuest('lantern', 'Frost Lanterns', [...lanternL, ...lanternR]);
  ctx.heroQuest('violet', 'Violet', [1, 2, 3, 4]);
  ctx.heroQuest('lumi', 'Lumi', [5, 6, 7, 8]);
}

// ===========================================================================
// CHAPTER 2A: The Sugar-Frost Igloo Village (`u07_c2a`)
// ===========================================================================
function buildU07C2a(ctx: SceneCtx): void {
  const { rng } = ctx;
  initChapter(ctx, 1, 240, 168);
  drawSkySparkles(ctx, 18, 148, 'snow');

  const orb = drawThemedOrb(ctx, Math.round(jit(rng, 108, 4)), Math.round(jit(rng, 54, 3)), 20, 'snowglobe');
  drawThemedCloud(ctx, 14, Math.round(jit(rng, 250, 5)), Math.round(jit(rng, 44, 3)), 80, 28, 'fluffy');
  drawThemedCloud(ctx, 15, Math.round(jit(rng, 386, 5)), Math.round(jit(rng, 52, 3)), 74, 26, 'fluffy');
  drawAuroraRibbon(ctx, 150, 448, 92, 9, 13, 1.2, 'Village Aurora Veil');
  twinkle(ctx, ctx.dyn('star', 'Cocoa Star'), 44, 92, 12);

  drawHorizonHills(ctx, { style: 'peaks', yBase: 168, yBottom: 224, layers: 2 });
  drawGroundDeck(ctx, { style: 'glacier', yTop: 210, yBottom: 250 });

  const iglooL = drawIglooDome(ctx, 114, 182, 0.94, { label: 'West' });
  const iglooR = drawIglooDome(ctx, 356, 182, 0.9, { label: 'East', flip: -1 });
  const lanternMid = drawSnowLanternPost(ctx, 238, 214, 0.92, 'Village Center');
  drawFrostedPine(ctx, 434, 214, 0.92, 'Village Pine');
  drawFrostedPine(ctx, 42, 212, 0.82, 'Snowbank Pine');

  drawGhostSilhouette(ctx, 'Frost Penguin Ghost', 'penguin', Math.round(jit(rng, 206, 4)), Math.round(jit(rng, 106, 3)), 0.92);
  drawGhostSilhouette(ctx, 'Ice Crystal Ghost', 'crystal', Math.round(jit(rng, 432, 4)), Math.round(jit(rng, 104, 3)), 0.9);

  const sprintPath = ctx.wavePath('sprint', 68, 234, 412, 232, 9, 2, 18);
  const orbitPath = ctx.ellipsePath('orbit', 240, 94, 168, 46, 24);
  ctx.ellipsePath('ring', 108, 54, orb.rx, orb.ry, 20, orb.tilt);
  ctx.marginPath(256);

  ctx.actor('violet', 194, 240, { facing: 1, anim: 'idle' });
  ctx.actor('nova', 292, 238, { facing: -1, anim: 'sleep', pathIndex: sprintPath });
  ctx.actor('moonCat', 104, 146, { facing: 1, anim: 'sleep' });
  ctx.actor('comet', 302, 74, { facing: 1, anim: 'float', pathIndex: orbitPath });

  ctx.heroQuest('igloo', 'Frost Igloos', [...iglooL, ...iglooR]);
  ctx.heroQuest('lantern', 'Village Lamp', lanternMid);
  ctx.heroQuest('violet', 'Violet', [1, 2, 3, 4]);
  ctx.heroQuest('nova', 'Nova', [9, 10, 11]);
}

// ===========================================================================
// CHAPTER 2B: The Starlight Skating Rink (`u07_c2b`)
// ===========================================================================
function buildU07C2b(ctx: SceneCtx): void {
  const { rng } = ctx;
  initChapter(ctx, 2, 240, 182);
  drawSkySparkles(ctx, 20, 146, 'snow');

  const orb = drawThemedOrb(ctx, Math.round(jit(rng, 372, 4)), Math.round(jit(rng, 54, 3)), 20, 'pearlMoon');
  drawThemedCloud(ctx, 14, Math.round(jit(rng, 104, 5)), Math.round(jit(rng, 46, 3)), 80, 28, 'fluffy');
  drawThemedCloud(ctx, 15, Math.round(jit(rng, 236, 5)), Math.round(jit(rng, 42, 3)), 72, 26, 'fluffy');
  drawAuroraRibbon(ctx, 32, 324, 86, 10, 13, 2.0, 'Rink Aurora Ribbon');
  crescent(ctx, ctx.dyn('star', 'Ice Crescent'), 442, 92, 14, -0.45);

  drawHorizonHills(ctx, { style: 'peaks', yBase: 162, yBottom: 218, layers: 2 });
  drawGroundDeck(ctx, { style: 'glacier', yTop: 196, yBottom: 250, includeTrim: false });
  const rinkIds = drawFrozenPond(ctx, 240, 222, 156, 22, 'Starlight Rink');

  const globeIds = drawSnowglobe(ctx, 84, 166, 0.86, { label: 'Rinkside' });
  const lanternR = drawSnowLanternPost(ctx, 360, 204, 0.88, 'Rinkside');
  drawFrostedPine(ctx, 422, 206, 0.94, 'Rink Spruce');

  drawGhostSilhouette(ctx, 'Skating Penguin Ghost', 'penguin', Math.round(jit(rng, 164, 4)), Math.round(jit(rng, 112, 3)), 0.95);
  drawGhostSilhouette(ctx, 'Starlight Owl Ghost', 'owl', Math.round(jit(rng, 294, 4)), Math.round(jit(rng, 106, 3)), 0.92);

  const gallopPath = ctx.ellipsePath('gallop', 240, 222, 124, 16, 24);
  const orbitPath = ctx.ellipsePath('orbit', 240, 92, 166, 46, 24);
  ctx.ellipsePath('ring', 372, 54, orb.rx, orb.ry, 20, orb.tilt);
  ctx.marginPath(256);

  ctx.actor('violet', 184, 236, { facing: 1, anim: 'idle' });
  ctx.actor('lumi', 284, 232, { facing: -1, anim: 'idle', pathIndex: gallopPath });
  ctx.actor('gazelle', 392, 238, { facing: -1, anim: 'idle' });
  ctx.actor('comet', 214, 78, { facing: 1, anim: 'float', pathIndex: orbitPath });

  ctx.heroQuest('igloo', 'Skating Rink', [...rinkIds, ...globeIds]);
  ctx.heroQuest('violet', 'Violet', [1, 2, 3, 4]);
  ctx.heroQuest('lumi', 'Lumi', [5, 6, 7, 8]);
  ctx.heroQuest('lantern', 'Rink Lamp', lanternR);
}

// ===========================================================================
// CHAPTER 3A: The Penguin Toboggan Glacier (`u07_c3a`)
// ===========================================================================
function buildU07C3a(ctx: SceneCtx): void {
  const { rng } = ctx;
  initChapter(ctx, 3, 240, 168);
  drawSkySparkles(ctx, 18, 146, 'snow');

  const orb = drawThemedOrb(ctx, Math.round(jit(rng, 376, 4)), Math.round(jit(rng, 52, 3)), 19, 'snowglobe');
  drawThemedCloud(ctx, 14, Math.round(jit(rng, 102, 5)), Math.round(jit(rng, 44, 3)), 76, 28, 'fluffy');
  drawThemedCloud(ctx, 15, Math.round(jit(rng, 234, 5)), Math.round(jit(rng, 40, 3)), 70, 26, 'fluffy');

  drawHorizonHills(ctx, { style: 'peaks', yBase: 162, yBottom: 222, layers: 2 });
  drawGroundDeck(ctx, { style: 'glacier', yTop: 210, yBottom: 250 });

  // Sweeping turquoise toboggan ice slide winding down from left peak to right snowbank!
  const chuteTop = ctx.dyn('star', 'Glacier Slide Track');
  const chuteWall = ctx.dyn('prop', 'Ice Chute Bank');
  ctx.r.poly(chuteWall, [
    [18, 148], [94, 152], [184, 174], [282, 198], [326, 212],
    [326, 224], [18, 224],
  ]);
  ctx.r.poly(chuteTop, [
    [22, 134], [98, 140], [190, 164], [286, 188], [324, 206],
    [280, 204], [180, 180], [90, 158], [22, 152],
  ]);
  ctx.r.line(INK, 40, 144, 296, 196, { only: [chuteTop] });

  const crystalL = drawCrystalCluster(ctx, 74, 132, 0.78, { label: 'Glacier Top' });
  const iglooR = drawIglooDome(ctx, 392, 182, 0.88, { label: 'Lodge', flip: -1 });

  drawGhostSilhouette(ctx, 'Sliding Penguin Ghost', 'penguin', Math.round(jit(rng, 152, 4)), Math.round(jit(rng, 102, 3)), 0.94);
  drawGhostSilhouette(ctx, 'Glacier Penguin Ghost', 'penguin', Math.round(jit(rng, 320, 4)), Math.round(jit(rng, 108, 3)), 0.9);
  drawGhostSilhouette(ctx, 'Frost Crystal Ghost', 'crystal', Math.round(jit(rng, 444, 4)), Math.round(jit(rng, 104, 3)), 0.86);

  const swimPath = ctx.wavePath('swim', 68, 96, 412, 92, 14, 1.5, 20);
  const gallopPath = ctx.wavePath('gallop', 64, 232, 416, 230, 10, 1.5, 18);
  const sprintPath = ctx.wavePath('sprint', 80, 236, 400, 234, 8, 2, 18);
  ctx.ellipsePath('ring', 376, 52, orb.rx, orb.ry, 20, orb.tilt);
  ctx.marginPath(256);

  ctx.actor('whale', 240, 114, { facing: 1, anim: 'swim', pathIndex: swimPath });
  ctx.actor('lumi', 148, 238, { facing: 1, anim: 'idle', pathIndex: gallopPath });
  ctx.actor('nova', 268, 236, { facing: -1, anim: 'idle', pathIndex: sprintPath });
  ctx.actor('moonCat', 392, 146, { facing: -1, anim: 'sleep' });

  ctx.heroQuest('igloo', 'Toboggan Chute', [chuteTop, chuteWall, ...iglooR]);
  ctx.heroQuest('whale', 'Frost Whale', [19, 29]);
  ctx.heroQuest('lumi', 'Lumi', [5, 6, 7, 8]);
  ctx.heroQuest('nova', 'Nova', [9, 10, 11]);
  void crystalL;
}

// ===========================================================================
// CHAPTER 3B: The Icicle Harp Cavern (`u07_c3b`)
// ===========================================================================
function buildU07C3b(ctx: SceneCtx): void {
  const { rng } = ctx;
  initChapter(ctx, 4, 240, 166);
  drawSkySparkles(ctx, 18, 152, 'snow');

  const orb = drawThemedOrb(ctx, Math.round(jit(rng, 240, 4)), Math.round(jit(rng, 56, 3)), 19, 'geode');
  drawThemedCloud(ctx, 14, Math.round(jit(rng, 98, 5)), Math.round(jit(rng, 68, 3)), 72, 26, 'bubbleCluster');
  drawThemedCloud(ctx, 15, Math.round(jit(rng, 382, 5)), Math.round(jit(rng, 68, 3)), 72, 26, 'bubbleCluster');

  // Ceiling icicle curtains framing the cavern dome
  const iciL = drawIcicleCluster(ctx, 14, 164, 0, 38, 'West Icicle Curtain');
  const iciR = drawIcicleCluster(ctx, 316, 466, 0, 38, 'East Icicle Curtain');

  drawHorizonHills(ctx, { style: 'peaks', yBase: 170, yBottom: 224, layers: 2 });
  drawGroundDeck(ctx, { style: 'glacier', yTop: 210, yBottom: 250 });

  const harpIds = drawHarpWaterfall(ctx, 240, 170, 0.96, { label: 'Icicle' });
  const spireL = drawCrystalCluster(ctx, 84, 176, 0.9, { label: 'West Frost' });
  const spireR = drawCrystalCluster(ctx, 396, 176, 0.9, { label: 'East Frost', flip: -1 });

  drawGhostSilhouette(ctx, 'Cavern Crystal Ghost', 'crystal', Math.round(jit(rng, 164, 4)), Math.round(jit(rng, 114, 3)), 0.92);
  drawGhostSilhouette(ctx, 'Cavern Owl Ghost', 'owl', Math.round(jit(rng, 326, 4)), Math.round(jit(rng, 114, 3)), 0.92);

  const orbitPath = ctx.ellipsePath('orbit', 240, 96, 164, 44, 24);
  ctx.ellipsePath('ring', 240, 56, orb.rx, orb.ry, 20, orb.tilt);
  ctx.marginPath(256);

  ctx.actor('violet', 162, 240, { facing: 1, anim: 'idle' });
  ctx.actor('gazelle', 332, 240, { facing: -1, anim: 'idle' });
  ctx.actor('moonCat', 240, 238, { facing: 1, anim: 'sleep' });
  ctx.actor('comet', 142, 92, { facing: 1, anim: 'float', pathIndex: orbitPath });

  ctx.heroQuest('piano', 'Icicle Harp', harpIds);
  ctx.heroQuest('geode', 'Frost Spires', [...spireL, ...spireR, iciL, iciR]);
  ctx.heroQuest('violet', 'Violet', [1, 2, 3, 4]);
  ctx.heroQuest('planet', 'Cavern Orb', [12, 13]);
}

// ===========================================================================
// CHAPTER 4A: The Polar-Bear Aurora Bridge (`u07_c4a`)
// ===========================================================================
function buildU07C4a(ctx: SceneCtx): void {
  const { rng } = ctx;
  initChapter(ctx, 5, 240, 174);
  drawSkySparkles(ctx, 20, 144, 'snow');

  const orb = drawThemedOrb(ctx, Math.round(jit(rng, 102, 4)), Math.round(jit(rng, 52, 3)), 19, 'snowglobe');
  drawThemedCloud(ctx, 14, Math.round(jit(rng, 246, 5)), Math.round(jit(rng, 42, 3)), 80, 26, 'fluffy');
  drawThemedCloud(ctx, 15, Math.round(jit(rng, 384, 5)), Math.round(jit(rng, 48, 3)), 74, 26, 'fluffy');
  drawAuroraRibbon(ctx, 42, 438, 86, 12, 15, 0.5, 'Mint Aurora Arch');
  drawAuroraRibbon(ctx, 124, 456, 114, 9, 12, 2.3, 'Violet Aurora Veil');

  drawHorizonHills(ctx, { style: 'peaks', yBase: 174, yBottom: 226, layers: 2 });
  drawGroundDeck(ctx, { style: 'glacier', yTop: 214, yBottom: 250 });

  const bridgeIds = drawIceBridgeArch(ctx, 240, 214, 228, 36, 'Polar Aurora');
  const bearIds = drawPolarBearSculpture(ctx, 64, 182, 0.88, 'Polar Bear');
  drawSnowLanternPost(ctx, 392, 216, 0.9, 'Bridge East');
  drawFrostedPine(ctx, 440, 216, 0.86, 'Bridge Pine');

  drawGhostSilhouette(ctx, 'Bridge Penguin Ghost', 'penguin', Math.round(jit(rng, 240, 4)), Math.round(jit(rng, 134, 3)), 0.9);
  drawGhostSilhouette(ctx, 'Aurora Owl Ghost', 'owl', Math.round(jit(rng, 434, 4)), Math.round(jit(rng, 98, 3)), 0.88);

  const gallopPath = ctx.wavePath('gallop', 88, 198, 392, 196, 12, 1, 18);
  const sprintPath = ctx.wavePath('sprint', 78, 236, 404, 234, 8, 2, 18);
  const orbitPath = ctx.ellipsePath('orbit', 240, 94, 166, 46, 24);
  ctx.ellipsePath('ring', 102, 52, orb.rx, orb.ry, 20, orb.tilt);
  ctx.marginPath(256);

  ctx.actor('violet', 200, 198, { facing: 1, anim: 'idle' });
  ctx.actor('lumi', 284, 198, { facing: -1, anim: 'idle', pathIndex: gallopPath });
  ctx.actor('nova', 344, 240, { facing: -1, anim: 'sleep', pathIndex: sprintPath });
  ctx.actor('comet', 330, 74, { facing: 1, anim: 'float', pathIndex: orbitPath });

  ctx.heroQuest('igloo', 'Aurora Bridge', [...bridgeIds, ...bearIds]);
  ctx.heroQuest('violet', 'Violet', [1, 2, 3, 4]);
  ctx.heroQuest('lumi', 'Lumi', [5, 6, 7, 8]);
  ctx.heroQuest('nova', 'Nova', [9, 10, 11]);
}

// ===========================================================================
// CHAPTER 4B: The Frosted Carousel Clock-Dome (`u07_c4b`)
// ===========================================================================
function buildU07C4b(ctx: SceneCtx): void {
  const { rng } = ctx;
  initChapter(ctx, 6, 240, 166);
  drawSkySparkles(ctx, 20, 148, 'snow');

  const orb = drawThemedOrb(ctx, Math.round(jit(rng, 378, 4)), Math.round(jit(rng, 52, 3)), 19, 'snowglobe');
  drawThemedCloud(ctx, 14, Math.round(jit(rng, 104, 5)), Math.round(jit(rng, 44, 3)), 78, 26, 'fluffy');
  drawThemedCloud(ctx, 15, Math.round(jit(rng, 238, 5)), Math.round(jit(rng, 40, 3)), 72, 26, 'fluffy');
  drawAuroraRibbon(ctx, 42, 326, 86, 10, 13, 0.9, 'Clock-Dome Aurora');
  star(ctx, ctx.dyn('star', 'Finial North Star'), 240, 102, 11, { points: 5, inner: 0.45 });

  drawHorizonHills(ctx, { style: 'peaks', yBase: 168, yBottom: 224, layers: 2 });
  drawGroundDeck(ctx, { style: 'glacier', yTop: 210, yBottom: 250 });

  const carouselIds = drawCarousel(ctx, 240, 174, 0.98, { label: 'Frosted' });
  const globeIds = drawSnowglobe(ctx, 84, 178, 0.84, { label: 'Clock' });
  const turretIds = drawIcePalace(ctx, 396, 174, 0.82, { label: 'Clock' });

  drawGhostSilhouette(ctx, 'Clock Owl Ghost', 'owl', Math.round(jit(rng, 154, 4)), Math.round(jit(rng, 112, 3)), 0.92);
  drawGhostSilhouette(ctx, 'Frost Crystal Ghost', 'crystal', Math.round(jit(rng, 326, 4)), Math.round(jit(rng, 108, 3)), 0.9);

  const orbitPath = ctx.ellipsePath('orbit', 240, 94, 166, 46, 24);
  ctx.ellipsePath('ring', 378, 52, orb.rx, orb.ry, 20, orb.tilt);
  ctx.marginPath(256);

  ctx.actor('violet', 156, 240, { facing: 1, anim: 'idle' });
  ctx.actor('gazelle', 326, 240, { facing: -1, anim: 'idle' });
  ctx.actor('moonCat', 84, 136, { facing: 1, anim: 'sleep' });
  ctx.actor('comet', 166, 78, { facing: 1, anim: 'float', pathIndex: orbitPath });

  ctx.heroQuest('tent', 'Frost Carousel', carouselIds);
  ctx.heroQuest('igloo', 'Ice Turret', [...globeIds, ...turretIds]);
  ctx.heroQuest('violet', 'Violet', [1, 2, 3, 4]);
  ctx.heroQuest('planet', 'Frost Moon', [12, 13]);
}

// ===========================================================================
// CHAPTER 5 (FINALE): The Grand Crystal Aurora Palace (`u07_c5`, 50..70 regions!)
// ===========================================================================
function buildU07C5(ctx: SceneCtx): void {
  const { r, rng } = ctx;
  initChapter(ctx, 7, 240, 136);
  drawSkySparkles(ctx, 22, 128, 'snow');

  // 1) 14 radiating Aurora Prism Rays fanning behind the Grand Palace (14 regions!)
  const cx = 240;
  const cy = 148;
  const rays = 14;
  for (let i = 0; i < rays; i++) {
    const a0 = -Math.PI * 0.9 + (i * Math.PI * 0.8) / rays;
    const a1 = -Math.PI * 0.9 + ((i + 0.86) * Math.PI * 0.8) / rays;
    const aMid = (a0 + a1) * 0.5;
    const id = ctx.dyn('star', `Aurora Prism Ray ${i + 1}`);
    const r0 = 66;
    const r1 = i % 2 === 0 ? 124 : 112;
    const sx = 1.46;
    const sy = 0.92;
    r.poly(id, [
      [cx + Math.cos(a0) * r0 * sx, cy + Math.sin(a0) * r0 * sy],
      [cx + Math.cos(a0) * (r1 - 12) * sx, cy + Math.sin(a0) * (r1 - 12) * sy],
      [cx + Math.cos(aMid) * r1 * sx, cy + Math.sin(aMid) * r1 * sy],
      [cx + Math.cos(a1) * (r1 - 12) * sx, cy + Math.sin(a1) * (r1 - 12) * sy],
      [cx + Math.cos(a1) * r0 * sx, cy + Math.sin(a1) * r0 * sy],
    ]);
    r.line(
      INK,
      cx + Math.cos(aMid) * (r0 + 8) * sx,
      cy + Math.sin(aMid) * (r0 + 8) * sy,
      cx + Math.cos(aMid) * (r1 - 10) * sx,
      cy + Math.sin(aMid) * (r1 - 10) * sy,
      { only: [id] },
    );
  }

  // 2) Core Orb (12/13), Mirrored Snowflake Star Medallion, Clouds (14/15) (6 regions)
  const orb = drawThemedOrb(ctx, 56, 48, 16, 'snowglobe');
  const eastFlake = ctx.dyn('star', 'Polar Star Snowflake');
  star(ctx, eastFlake, 424, 48, 18, { points: 6, inner: 0.48 });
  const zenithCrown = ctx.dyn('star', 'Aurora Zenith Star');
  star(ctx, zenithCrown, 240, 20, 11, { points: 5, inner: 0.48 });

  drawThemedCloud(ctx, 14, 54, 128, 74, 26, 'fluffy');
  drawThemedCloud(ctx, 15, 426, 128, 74, 26, 'fluffy');

  // 3) Horizon + Grand Glacier Palace Terrace (4 regions)
  drawHorizonHills(ctx, { style: 'peaks', yBase: 170, yBottom: 224, layers: 2 });
  drawGroundDeck(ctx, { style: 'glacier', yTop: 214, yBottom: 250 });

  // 4) Grand Palace Panorama: Center Ice Palace + 2 Snowglobe Turrets + 2 Crystal Gardens + 2 Pines (20 regions)
  const palaceIds = drawIcePalace(ctx, 240, 160, 1.06, { label: 'Grand Aurora' });
  const globeL = drawSnowglobe(ctx, 116, 178, 0.8, { label: 'West Frost' });
  const globeR = drawSnowglobe(ctx, 364, 178, 0.8, { label: 'East Frost' });
  drawCrystalCluster(ctx, 44, 192, 0.72, { label: 'West Glacier' });
  drawCrystalCluster(ctx, 436, 192, 0.72, { label: 'East Glacier', flip: -1 });
  drawFrostedPine(ctx, 178, 208, 0.78, 'West Palace Pine');
  drawFrostedPine(ctx, 302, 208, 0.78, 'East Palace Pine');

  // 5) 3 Ghosts in clean open upper-sky pockets
  drawGhostSilhouette(ctx, 'Northern Penguin Ghost', 'penguin', Math.round(jit(rng, 144, 3)), Math.round(jit(rng, 28, 2)), 0.88);
  drawGhostSilhouette(ctx, 'Northern Owl Ghost', 'owl', Math.round(jit(rng, 336, 3)), Math.round(jit(rng, 28, 2)), 0.88);
  drawGhostSilhouette(ctx, 'Aurora Crystal Ghost', 'crystal', Math.round(jit(rng, 442, 3)), Math.round(jit(rng, 92, 2)), 0.85);

  // 6) Paths & Full Hero Cast (14 actor regions -> total ~60 regions!)
  const gallopPath = ctx.wavePath('gallop', 66, 238, 414, 238, 8, 2, 20);
  const sprintPath = ctx.wavePath('sprint', 88, 236, 392, 236, 9, 2, 20);
  const orbitPath = ctx.ellipsePath('orbit', 240, 96, 174, 52, 28);
  ctx.ellipsePath('ring', 56, 48, orb.rx, orb.ry, 20, orb.tilt);
  ctx.marginPath(256);

  ctx.actor('lumi', 148, 244, { facing: 1, anim: 'rear', pathIndex: gallopPath });
  ctx.actor('violet', 240, 246, { facing: 1, anim: 'idle' });
  ctx.actor('nova', 332, 244, { facing: -1, anim: 'leap', pathIndex: sprintPath });
  ctx.actor('moonCat', 82, 242, { facing: 1, anim: 'idle' });
  ctx.actor('comet', 402, 168, { facing: -1, anim: 'float', pathIndex: orbitPath });

  ctx.heroQuest('igloo', 'Aurora Palace', [...palaceIds, ...globeL, ...globeR]);
  ctx.heroQuest('violet', 'Violet', [1, 2, 3, 4]);
  ctx.heroQuest('lumi', 'Lumi', [5, 6, 7, 8]);
  ctx.heroQuest('nova', 'Nova', [9, 10, 11]);
}

export const U07_SCENES: Record<U07SceneId, (ctx: SceneCtx) => void> = {
  hub_auroraIcePalace: buildHubAuroraIcePalace,
  u07_c1: buildU07C1,
  u07_c2a: buildU07C2a,
  u07_c2b: buildU07C2b,
  u07_c3a: buildU07C3a,
  u07_c3b: buildU07C3b,
  u07_c4a: buildU07C4a,
  u07_c4b: buildU07C4b,
  u07_c5: buildU07C5,
};
