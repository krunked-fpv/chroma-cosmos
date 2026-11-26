/**
 * Universe 6: Rainbow Dino Greenhouse (9 bespoke procedural scenes: 1 Hub Sanctuary + 8 Chapters).
 * Pure & deterministic (ctx.rng only), strict >= 60px region hygiene, clean bottom margin (y <= 252).
 */
import { MaterialId } from '../../contracts/materials';
import type { SceneId } from '../../contracts/roguelike';
import { UNIVERSE_BY_ID } from '../../contracts/universes';
import type { SceneCtx } from '../context';
import {
  drawAmmoniteFossil,
  drawBrontosaurus,
  drawCrystalCluster,
  drawGlassConservatory,
  drawGroundDeck,
  drawHorizonHills,
  drawOasisPalm,
  drawSanctuaryRoom,
  drawSkySparkles,
  drawThemedCloud,
  drawThemedOrb,
  drawVolcanoCaldera,
  ghostCreature,
} from '../kit';
import { heart, inkArc, jit, pearl, star, twinkle } from '../props';
import { INK, W, type Pt } from '../raster';

const UNI = UNIVERSE_BY_ID.dinoFernValley;
const CH = Object.fromEntries(UNI.chapters.map((c) => [c.id, c]));

function initChapter(ctx: SceneCtx, id: string, fx = 240, fy = 138): void {
  const ch = CH[id];
  ctx.title = ch ? ch.title : id;
  ctx.sky = UNI.sky;
  ctx.universeId = UNI.id;
  ctx.ambient = UNI.ambient;
  ctx.focal = { x: fx, y: fy };
}

/** Friendly polka-dot Rainbow Triceratops (4 chunky regions: back legs, plump body, scalloped frill, spots). */
function drawTriceratops(ctx: SceneCtx, x: number, y: number, scale: number, label: string): number[] {
  const { r } = ctx;
  const s = Math.max(0.75, scale);
  const legs = ctx.dyn('prop', `${label} Dino Legs`);
  const body = ctx.dyn('flora', `${label} Triceratops Body`);
  const frill = ctx.dyn('star', `${label} Crown Frill`);
  const spots = ctx.dyn('star', `${label} Polka Spots`);

  // Back legs behind body
  r.capsule(legs, x - 20 * s, y + 14 * s, x - 22 * s, y + 34 * s, 7.5 * s);
  r.capsule(legs, x + 8 * s, y + 14 * s, x + 10 * s, y + 34 * s, 7.5 * s);

  // Plump torso + sturdy tail + front legs
  r.ellipse(body, x - 6 * s, y + 4 * s, 32 * s, 21 * s);
  r.capsule(body, x - 30 * s, y + 8 * s, x - 50 * s, y + 18 * s, 8.5 * s);
  r.capsule(body, x - 12 * s, y + 16 * s, x - 14 * s, y + 34 * s, 7.5 * s);
  r.capsule(body, x + 16 * s, y + 16 * s, x + 18 * s, y + 34 * s, 7.5 * s);

  // Scalloped royal head frill + cheerful horned snout
  r.disc(frill, x + 22 * s, y - 6 * s, 18 * s);
  r.ellipse(frill, x + 34 * s, y + 2 * s, 14 * s, 10 * s);
  r.poly(frill, [[x + 30 * s, y - 8 * s], [x + 48 * s, y - 22 * s], [x + 38 * s, y - 2 * s]]);
  r.poly(frill, [[x + 40 * s, y - 2 * s], [x + 54 * s, y - 10 * s], [x + 44 * s, y + 4 * s]]);
  inkArc(r, x + 34 * s, y, 2.4 * s, 2.4 * s, 0, Math.PI * 2, 0, { only: [frill] });
  inkArc(r, x + 36 * s, y + 5 * s, 5 * s, 3 * s, 0.2, Math.PI * 0.85, 0, { only: [frill] });

  // Cheerful chunky polka-dots across the back
  r.disc(spots, x - 18 * s, y - 2 * s, 7 * s);
  r.disc(spots, x - 2 * s, y - 4 * s, 8 * s);
  r.disc(spots, x - 8 * s, y + 10 * s, 6.5 * s);
  return [legs, body, frill, spots];
}

/** Giant glowing star-melon orchard mound with leafy crown (2 chunky regions). */
function drawStarMelonMound(ctx: SceneCtx, x: number, y: number, label: string): [number, number] {
  const { r } = ctx;
  const leaves = ctx.dyn('flora', `${label} Melon Leaves`);
  const melon = ctx.dyn('star', `${label} Giant Star-Melon`);
  r.ellipse(leaves, x - 22, y + 10, 16, 8, -0.3);
  r.ellipse(leaves, x + 22, y + 10, 16, 8, 0.3);
  r.ellipse(leaves, x, y - 18, 12, 7);
  r.ellipse(melon, x, y + 4, 24, 20);
  inkArc(r, x, y + 4, 12, 19, 0, Math.PI * 2, 0, { only: [melon] });
  r.line(INK, x, y - 14, x, y + 22, { only: [melon] });
  return [leaves, melon];
}

/** Bubbling hot-spring mineral geyser cone & sparkling plume (2 chunky regions). */
function drawBubbleGeyser(ctx: SceneCtx, x: number, y: number, label: string): [number, number] {
  const { r } = ctx;
  const plume = ctx.dyn('cloud', `${label} Geyser Plume`);
  const cone = ctx.dyn('prop', `${label} Mineral Cone`);
  r.capsule(plume, x, y - 2, x, y - 44, 10);
  r.disc(plume, x - 14, y - 44, 12);
  r.disc(plume, x + 14, y - 44, 12);
  r.disc(plume, x, y - 54, 14);
  inkArc(r, x, y - 48, 8, 8, Math.PI * 1.1, Math.PI * 1.9, 0, { only: [plume] });
  r.poly(cone, [[x - 16, y - 6], [x + 16, y - 6], [x + 34, y + 26], [x - 34, y + 26]]);
  r.line(INK, x - 18, y + 8, x + 18, y + 8, { only: [cone] });
  return [plume, cone];
}

/** Soaring pastel rainbow pterosaur glider in open upper glasshouse sky (3 chunky regions). */
function drawPterosaurGlider(ctx: SceneCtx, x: number, y: number, scale: number, label: string): number[] {
  const { r } = ctx;
  const s = Math.max(0.75, scale);
  const wingL = ctx.dyn('star', `${label} West Wing`);
  const wingR = ctx.dyn('star', `${label} East Wing`);
  const body = ctx.dyn('flora', `${label} Crest & Body`);

  // Left & Right sweeping glider wings
  r.poly(wingL, [
    [x - 8 * s, y - 4 * s],
    [x - 58 * s, y - 28 * s],
    [x - 42 * s, y + 10 * s],
    [x - 10 * s, y + 10 * s],
  ]);
  r.line(INK, x - 12 * s, y + 2 * s, x - 50 * s, y - 20 * s, { only: [wingL] });

  r.poly(wingR, [
    [x + 8 * s, y - 4 * s],
    [x + 58 * s, y - 28 * s],
    [x + 42 * s, y + 10 * s],
    [x + 10 * s, y + 10 * s],
  ]);
  r.line(INK, x + 12 * s, y + 2 * s, x + 50 * s, y - 20 * s, { only: [wingR] });

  // Streamlined body + swept head crest + smiling beak
  r.ellipse(body, x, y + 4 * s, 14 * s, 18 * s);
  r.poly(body, [[x - 8 * s, y - 8 * s], [x - 18 * s, y - 28 * s], [x + 4 * s, y - 14 * s], [x + 22 * s, y - 16 * s], [x + 8 * s, y - 4 * s]]);
  inkArc(r, x + 4 * s, y - 10 * s, 2.2 * s, 2.2 * s, 0, Math.PI * 2, 0, { only: [body] });
  return [wingL, wingR, body];
}

/** Lush tropical fern tuft & speckled dino-egg nest (2 chunky regions). */
function drawDinoEggNest(ctx: SceneCtx, x: number, y: number, label: string): [number, number] {
  const { r } = ctx;
  const nest = ctx.dyn('flora', `${label} Fern Nest`);
  const egg = ctx.dyn('star', `${label} Dino Egg`);
  r.ellipse(nest, x, y + 14, 28, 10);
  r.ellipse(nest, x - 24, y + 6, 13, 6, -0.4);
  r.ellipse(nest, x + 24, y + 6, 13, 6, 0.4);
  r.ellipse(egg, x, y - 2, 13, 17);
  inkArc(r, x - 4, y - 5, 3, 3, 0, Math.PI * 2, 0, { only: [egg] });
  inkArc(r, x + 5, y + 2, 3.5, 3.5, 0, Math.PI * 2, 0, { only: [egg] });
  return [nest, egg];
}

// ============================================================================
// HUB SANCTUARY: Violet's Botanical Dino Terrarium
// ============================================================================
function hub_dinoFernValley(ctx: SceneCtx): void {
  ctx.universeId = UNI.id;
  ctx.ambient = UNI.ambient;
  const showcaseIds: number[] = [];

  drawSanctuaryRoom(ctx, {
    title: UNI.hubTitle,
    sky: UNI.sky,
    windowShape: 'dome',
    windowOrbStyle: 'lotusSun',
    wallStyle: 'wainscot',
    floorStyle: 'moss',
    rugShape: 'oval',
    lampStyle: 'crystal',
    garlandStyle: 'leaves',
    sparkleStyle: 'petals',
    violetPos: { x: 204, y: 238, facing: 1 },
    workbenchLabel: 'Fossil Sketch Desk',
    shelfLabel: 'Botanical Spec Shelf',
    seatingLabel: 'Fern-Canopy Daybed',
    trinketLabels: ['Dino Field Logs', 'Fossil Samples', 'Fern Presses'],
    palette: {
      wallPanel: MaterialId.CrystalGlacierMint,
      floor: MaterialId.DragonflyIridescence,
      windowFrame: MaterialId.SolarFlare24K,
      windowGlass: MaterialId.DeepSpaceBiolum,
      curtain: MaterialId.AuroraSherbet,
      orbCore: MaterialId.SolarFlare24K,
      orbRing: MaterialId.RainbowPrismWax,
      rugOuter: MaterialId.AuroraSherbet,
      rugInner: MaterialId.CrystalGlacierMint,
      furniture: MaterialId.RoyalAstralGold,
      furnitureTrim: MaterialId.SolarFlare24K,
      accentA: MaterialId.CrystalGlacierMint,
      accentB: MaterialId.SolarFlare24K,
      accentC: MaterialId.RainbowPrismWax,
    },
    drawWindowView: (c, wx) => {
      const fronds = c.dyn('flora', 'Window Tropical Ferns');
      c.r.ellipse(fronds, wx - 16, 126, 18, 8, -0.35);
      c.r.ellipse(fronds, wx + 16, 126, 18, 8, 0.35);
      c.r.ellipse(fronds, wx, 122, 16, 10);
      c.preColor(fronds, MaterialId.DragonflyIridescence);
    },
    drawExtraProps: (c) => {
      const { r } = c;
      // 1) Left wall framed spiral ammonite fossil plaque (2 regions)
      const plaque = c.dyn('prop', 'Fossil Wall Plaque');
      r.disc(plaque, 84, 92, 22);
      c.preColor(plaque, MaterialId.RoyalAstralGold);

      const spiral = c.dyn('star', 'Mounted Ammonite Spiral');
      r.disc(spiral, 84, 92, 14);
      inkArc(r, 84, 92, 9, 9, 0, Math.PI * 1.7, 0, { only: [spiral] });
      inkArc(r, 84, 92, 4.5, 4.5, 0, Math.PI * 1.8, 0, { only: [spiral] });
      c.preColor(spiral, MaterialId.HoloFoil);

      // 2) Floor standing Botanical Dino-Egg Terrarium Planter beside Violet (3 regions)
      const pot = c.dyn('prop', 'Terrarium Stone Planter');
      r.poly(pot, [[250, 202], [288, 202], [284, 226], [254, 226]]);
      r.line(INK, 254, 214, 284, 214, { only: [pot] });
      c.preColor(pot, MaterialId.SolarFlare24K);

      const fern = c.dyn('flora', 'Terrarium Palm Fronds');
      r.ellipse(fern, 256, 186, 14, 7, -0.5);
      r.ellipse(fern, 282, 186, 14, 7, 0.5);
      r.ellipse(fern, 269, 174, 12, 14);
      c.preColor(fern, MaterialId.DragonflyIridescence);

      const egg = c.dyn('star', 'Speckled Dino Egg');
      r.ellipse(egg, 269, 192, 11, 14);
      inkArc(r, 266, 190, 2.5, 2.5, 0, Math.PI * 2, 0, { only: [egg] });
      inkArc(r, 273, 194, 2.5, 2.5, 0, Math.PI * 2, 0, { only: [egg] });
      c.preColor(egg, MaterialId.RainbowPrismWax);
      showcaseIds.push(pot, fern, egg);

      // 3) Desk-right Amber Fossil Crystal & Upper-Right Botanical Leaf Banner (2 regions)
      const deskAmber = c.dyn('star', 'Desk Amber Crystal');
      r.poly(deskAmber, [[375, 148], [386, 162], [382, 180], [368, 180], [364, 162]]);
      c.preColor(deskAmber, MaterialId.SolarCheetahAmber);

      const wallBanner = c.dyn('prop', 'Greenhouse Sun Banner');
      r.poly(wallBanner, [[334, 72], [372, 72], [372, 112], [353, 124], [334, 112]]);
      c.preColor(wallBanner, MaterialId.CrystalGlacierMint);

      return [plaque, spiral, pot, fern, egg, deskAmber, wallBanner];
    },
  });

  ctx.heroQuest('violet', 'Violet', [1, 2, 3, 4]);
  ctx.heroQuest('planet', 'Lotus Sun', [12, 13]);
  ctx.heroQuest('dino', 'Dino Egg', showcaseIds);
}

// ============================================================================
// SLOT 1: The Glass-Arch Fern Entry
// ============================================================================
function u06_c1(ctx: SceneCtx): void {
  initChapter(ctx, 'u06_c1', 242, 144);
  const { rng } = ctx;

  drawSkySparkles(ctx, 18, 144, 'petals');

  const orbX = Math.round(jit(rng, 98, 5));
  const orbY = Math.round(jit(rng, 58, 3));
  const orb = drawThemedOrb(ctx, orbX, orbY, 20, 'lotusSun', { tilt: -0.2 });

  ctx.canon(14, 'Sunbeam Glass Cloud', 'cloud');
  ctx.canon(15, 'Palm Breeze Cloud', 'cloud');
  drawThemedCloud(ctx, 14, Math.round(jit(rng, 242, 5)), Math.round(jit(rng, 44, 3)), 82, 28, 'fluffy');
  drawThemedCloud(ctx, 15, Math.round(jit(rng, 392, 5)), Math.round(jit(rng, 54, 3)), 78, 28, 'fluffy');

  drawHorizonHills(ctx, { style: 'rolling', yBase: 164, yBottom: 214, layers: 2 });
  drawGroundDeck(ctx, { style: 'gardenPath', yTop: 208, yBottom: 250, labelPrefix: 'Fern Entry' });

  // Hero Victorian Glass Conservatory Arch + Giant Tropical Palm + Dino Egg Nest
  const glassIds = drawGlassConservatory(ctx, 276, 174, 1.08, { label: 'Fern Entry' });
  drawOasisPalm(ctx, 90, 172, 0.96, { label: 'Entry' });
  drawDinoEggNest(ctx, 412, 198, 'Entry');
  star(ctx, ctx.dyn('star', 'Sunbeam Star'), 172, 108, 11, { points: 5, inner: 0.48 });

  // 3 ghosts in open sky
  ghostCreature(ctx, 'dino', 176, 58, 'Entry Dino Ghost');
  ghostCreature(ctx, 'butterfly', 318, 56, 'Sunbeam Wing Ghost');
  ghostCreature(ctx, 'owl', 442, 114, 'Conservatory Owl Ghost');

  ctx.ellipsePath('ring', orbX, orbY, orb.rx, orb.ry, 24, orb.tilt);
  const gallopPath = ctx.wavePath('gallop', 66, 236, 414, 236, 8, 2, 20);
  const orbitPath = ctx.ellipsePath('orbit', 240, 86, 176, 46, 24);
  ctx.marginPath(256);

  ctx.actor('violet', 142, 244, { facing: 1, anim: 'idle' });
  ctx.actor('lumi', 284, 244, { facing: -1, anim: 'idle', pathIndex: gallopPath });
  ctx.actor('gazelle', 392, 244, { facing: -1, anim: 'idle', pathIndex: gallopPath });
  ctx.actor('comet', 332, 92, { facing: -1, anim: 'float', pathIndex: orbitPath });

  ctx.heroQuest('dino', 'Glass Arch', glassIds);
  ctx.heroQuest('violet', 'Violet', [1, 2, 3, 4]);
  ctx.heroQuest('lumi', 'Lumi', [5, 6, 7, 8]);
  ctx.heroQuest('planet', 'Lotus Sun', [12, 13]);
}

// ============================================================================
// SLOT 2A: The Brontosaurus Canopy Meadow
// ============================================================================
function u06_c2a(ctx: SceneCtx): void {
  initChapter(ctx, 'u06_c2a', 238, 144);
  const { rng } = ctx;

  drawSkySparkles(ctx, 18, 144, 'petals');

  const orbX = Math.round(jit(rng, 384, 5));
  const orbY = Math.round(jit(rng, 56, 3));
  const orb = drawThemedOrb(ctx, orbX, orbY, 20, 'lotusSun', { tilt: -0.2 });

  ctx.canon(14, 'Canopy Blossom Cloud', 'cloud');
  ctx.canon(15, 'Treetop Cloud', 'cloud');
  drawThemedCloud(ctx, 14, Math.round(jit(rng, 96, 5)), Math.round(jit(rng, 52, 3)), 82, 28, 'fluffy');
  drawThemedCloud(ctx, 15, Math.round(jit(rng, 240, 5)), Math.round(jit(rng, 44, 3)), 76, 26, 'fluffy');

  drawHorizonHills(ctx, { style: 'rolling', yBase: 164, yBottom: 214, layers: 2 });
  drawGroundDeck(ctx, { style: 'meadow', yTop: 208, yBottom: 250, labelPrefix: 'Canopy' });

  // Gentle Rainbow Brontosaurus reaching toward a lush Oasis Palm + Star-Melon Bush
  const brontoIds = drawBrontosaurus(ctx, 178, 176, 1.16, { label: 'Meadow' });
  drawOasisPalm(ctx, 326, 170, 1.02, { label: 'Blossom', flip: -1 });
  drawDinoEggNest(ctx, 418, 198, 'Canopy');
  star(ctx, ctx.dyn('star', 'Treetop Star Blossom'), 278, 128, 11.5, { points: 5, inner: 0.48 });
  star(ctx, ctx.dyn('star', 'West Canopy Star'), 56, 118, 10.5, { points: 5, inner: 0.48 });

  // 3 ghosts in open sky
  ghostCreature(ctx, 'dino', 174, 56, 'Baby Bronto Ghost');
  ghostCreature(ctx, 'butterfly', 310, 58, 'Canopy Butterfly Ghost');
  ghostCreature(ctx, 'moth', 442, 114, 'Blossom Moth Ghost');

  ctx.ellipsePath('ring', orbX, orbY, orb.rx, orb.ry, 24, orb.tilt);
  const sprintPath = ctx.wavePath('sprint', 66, 236, 414, 236, 8, 2, 20);
  const orbitPath = ctx.ellipsePath('orbit', 240, 86, 176, 46, 24);
  ctx.marginPath(256);

  ctx.actor('violet', 120, 244, { facing: 1, anim: 'idle' });
  ctx.actor('nova', 252, 244, { facing: 1, anim: 'leap', pathIndex: sprintPath });
  ctx.actor('gazelle', 368, 244, { facing: -1, anim: 'idle', pathIndex: sprintPath });
  ctx.actor('comet', 228, 92, { facing: 1, anim: 'float', pathIndex: orbitPath });

  ctx.heroQuest('dino', 'Brontosaurus', brontoIds);
  ctx.heroQuest('violet', 'Violet', [1, 2, 3, 4]);
  ctx.heroQuest('nova', 'Nova', [9, 10, 11]);
  ctx.heroQuest('cloud', 'Canopy Clouds', [14, 15]);
}

// ============================================================================
// SLOT 2B: The Spiral Ammonite Fossil Creek
// ============================================================================
function u06_c2b(ctx: SceneCtx): void {
  initChapter(ctx, 'u06_c2b', 240, 146);
  const { r, rng } = ctx;

  drawSkySparkles(ctx, 18, 144, 'stars');

  const orbX = Math.round(jit(rng, 384, 5));
  const orbY = Math.round(jit(rng, 56, 3));
  const orb = drawThemedOrb(ctx, orbX, orbY, 21, 'geode', { tilt: -0.24 });

  ctx.canon(14, 'Fossil Mist Cloud', 'cloud');
  ctx.canon(15, 'Creek Crystal Cloud', 'cloud');
  drawThemedCloud(ctx, 14, Math.round(jit(rng, 96, 5)), Math.round(jit(rng, 52, 3)), 82, 28, 'fluffy');
  drawThemedCloud(ctx, 15, Math.round(jit(rng, 240, 5)), Math.round(jit(rng, 44, 3)), 76, 26, 'fluffy');

  drawHorizonHills(ctx, { style: 'mesas', yBase: 162, yBottom: 210, layers: 2 });

  // Stepped crystal creek water pools (y = 204..249)
  const poolUpper = ctx.dyn('prop', 'Crystal Creek Pool');
  r.rect(poolUpper, 0, 204, W, 226);
  r.line(INK, 12, 216, W - 12, 216, { only: [poolUpper] });
  const poolLower = ctx.dyn('prop', 'Stepped Fossil Terrace');
  r.rect(poolLower, 0, 226, W, 249);
  r.line(INK, 12, 238, W - 12, 238, { only: [poolLower] });

  // Hero Giant Spiral Ammonite Fossil + Crystal Cluster left + Oasis Palm right
  const ammoniteIds = drawAmmoniteFossil(ctx, 240, 174, 1.15, { label: 'Creek' });
  const crystalIds = drawCrystalCluster(ctx, 88, 178, 0.96, { label: 'Creek' });
  drawOasisPalm(ctx, 396, 170, 0.92, { label: 'Fossil', flip: -1 });
  pearl(ctx, ctx.dyn('star', 'Creek Opal Pearl'), 164, 114, 10);

  // 3 ghosts in open sky
  ghostCreature(ctx, 'dino', 174, 56, 'Fossil Dino Ghost');
  ghostCreature(ctx, 'crystal', 310, 58, 'Creek Quartz Ghost');
  ghostCreature(ctx, 'koi', 442, 114, 'Ammonite Koi Ghost');

  ctx.ellipsePath('ring', orbX, orbY, orb.rx, orb.ry, 24, orb.tilt);
  const gallopPath = ctx.wavePath('gallop', 66, 236, 414, 236, 8, 2, 20);
  const sprintPath = ctx.wavePath('sprint', 74, 236, 408, 236, 8, 2, 20);
  const orbitPath = ctx.ellipsePath('orbit', 240, 86, 176, 46, 24);
  ctx.marginPath(256);

  ctx.actor('lumi', 138, 244, { facing: 1, anim: 'rear', pathIndex: gallopPath });
  ctx.actor('nova', 342, 244, { facing: -1, anim: 'leap', pathIndex: sprintPath });
  ctx.actor('moonCat', 240, 242, { facing: 1, anim: 'sleep' });
  ctx.actor('comet', 298, 92, { facing: -1, anim: 'float', pathIndex: orbitPath });

  ctx.heroQuest('dino', 'Ammonite', ammoniteIds);
  ctx.heroQuest('geode', 'Creek Crystal', crystalIds);
  ctx.heroQuest('lumi', 'Lumi', [5, 6, 7, 8]);
  ctx.heroQuest('nova', 'Nova', [9, 10, 11]);
}

// ============================================================================
// SLOT 3A: The Rainbow Triceratops Orchard
// ============================================================================
function u06_c3a(ctx: SceneCtx): void {
  initChapter(ctx, 'u06_c3a', 238, 146);
  const { rng } = ctx;

  drawSkySparkles(ctx, 18, 144, 'petals');

  const orbX = Math.round(jit(rng, 98, 5));
  const orbY = Math.round(jit(rng, 56, 3));
  const orb = drawThemedOrb(ctx, orbX, orbY, 20, 'lotusSun', { tilt: -0.2 });

  ctx.canon(14, 'Orchard Sun Cloud', 'cloud');
  ctx.canon(15, 'Melon Breeze Cloud', 'cloud');
  drawThemedCloud(ctx, 14, Math.round(jit(rng, 244, 5)), Math.round(jit(rng, 44, 3)), 82, 28, 'fluffy');
  drawThemedCloud(ctx, 15, Math.round(jit(rng, 392, 5)), Math.round(jit(rng, 54, 3)), 78, 28, 'fluffy');

  drawHorizonHills(ctx, { style: 'rolling', yBase: 164, yBottom: 214, layers: 2 });
  drawGroundDeck(ctx, { style: 'meadow', yTop: 208, yBottom: 250, labelPrefix: 'Star-Melon' });

  // Friendly Rainbow Triceratops + Giant Star-Melon Mounds + Orchard Palm
  const trikeIds = drawTriceratops(ctx, 186, 178, 1.12, 'Rainbow');
  const melonA = drawStarMelonMound(ctx, 326, 194, 'Sunburst');
  const melonB = drawStarMelonMound(ctx, 412, 194, 'Starlight');
  drawOasisPalm(ctx, 64, 172, 0.92, { label: 'Orchard' });
  star(ctx, ctx.dyn('star', 'Orchard Star-Fruit'), 326, 128, 11, { points: 5, inner: 0.48 });

  // 3 ghosts in open sky
  ghostCreature(ctx, 'dino', 176, 56, 'Orchard Dino Ghost');
  ghostCreature(ctx, 'butterfly', 318, 56, 'Melon Butterfly Ghost');
  ghostCreature(ctx, 'cat', 442, 114, 'Orchard Cat Ghost');

  ctx.ellipsePath('ring', orbX, orbY, orb.rx, orb.ry, 24, orb.tilt);
  const gallopPath = ctx.wavePath('gallop', 66, 236, 414, 236, 8, 2, 20);
  const orbitPath = ctx.ellipsePath('orbit', 240, 86, 176, 46, 24);
  ctx.marginPath(256);

  ctx.actor('violet', 120, 244, { facing: 1, anim: 'idle' });
  ctx.actor('lumi', 284, 244, { facing: -1, anim: 'idle', pathIndex: gallopPath });
  ctx.actor('moonCat', 420, 240, { facing: -1, anim: 'sleep' });
  ctx.actor('comet', 248, 92, { facing: 1, anim: 'float', pathIndex: orbitPath });

  ctx.heroQuest('dino', 'Triceratops', trikeIds);
  ctx.heroQuest('sunflower', 'Star Melons', [...melonA, ...melonB]);
  ctx.heroQuest('violet', 'Violet', [1, 2, 3, 4]);
  ctx.heroQuest('lumi', 'Lumi', [5, 6, 7, 8]);
}

// ============================================================================
// SLOT 3B: The Bubble-Geyser Hot Springs
// ============================================================================
function u06_c3b(ctx: SceneCtx): void {
  initChapter(ctx, 'u06_c3b', 240, 144);
  const { rng } = ctx;

  drawSkySparkles(ctx, 18, 144, 'bubbles');

  const orbX = Math.round(jit(rng, 384, 5));
  const orbY = Math.round(jit(rng, 56, 3));
  const orb = drawThemedOrb(ctx, orbX, orbY, 21, 'bubbleOrb', { tilt: -0.24 });

  ctx.canon(14, 'Mineral Steam Cloud', 'cloud');
  ctx.canon(15, 'Warm Spring Cloud', 'cloud');
  drawThemedCloud(ctx, 14, Math.round(jit(rng, 98, 5)), Math.round(jit(rng, 52, 3)), 84, 28, 'steamPuff');
  drawThemedCloud(ctx, 15, Math.round(jit(rng, 244, 5)), Math.round(jit(rng, 44, 3)), 78, 26, 'steamPuff');

  drawHorizonHills(ctx, { style: 'mesas', yBase: 164, yBottom: 214, layers: 2 });
  drawGroundDeck(ctx, { style: 'courtyard', yTop: 208, yBottom: 250, labelPrefix: 'Hot Spring' });

  // Twin Erupting Mineral Bubble-Geysers + Ammonite Spring Basin + Oasis Palm
  const geyserL = drawBubbleGeyser(ctx, 168, 184, 'West Spring');
  const geyserR = drawBubbleGeyser(ctx, 312, 184, 'East Spring');
  drawAmmoniteFossil(ctx, 68, 186, 0.78, { label: 'Spring' });
  drawOasisPalm(ctx, 412, 172, 0.92, { label: 'Hot Spring', flip: -1 });
  pearl(ctx, ctx.dyn('star', 'Mineral Bubble A'), 240, 128, 10.5);
  pearl(ctx, ctx.dyn('star', 'Mineral Bubble B'), 240, 98, 9.5);

  // 3 ghosts in open sky
  ghostCreature(ctx, 'dino', 176, 56, 'Spring Dino Ghost');
  ghostCreature(ctx, 'butterfly', 310, 58, 'Pastel Wing Ghost');
  ghostCreature(ctx, 'moth', 442, 114, 'Steam Moth Ghost');

  ctx.ellipsePath('ring', orbX, orbY, orb.rx, orb.ry, 24, orb.tilt);
  const sprintPath = ctx.wavePath('sprint', 66, 236, 414, 236, 8, 2, 20);
  const orbitPath = ctx.ellipsePath('orbit', 240, 86, 176, 46, 24);
  ctx.marginPath(256);

  ctx.actor('violet', 120, 244, { facing: 1, anim: 'idle' });
  ctx.actor('nova', 246, 244, { facing: 1, anim: 'leap', pathIndex: sprintPath });
  ctx.actor('gazelle', 368, 244, { facing: -1, anim: 'idle', pathIndex: sprintPath });
  ctx.actor('comet', 142, 96, { facing: 1, anim: 'float', pathIndex: orbitPath });

  ctx.heroQuest('dino', 'Hot Geysers', [...geyserL, ...geyserR]);
  ctx.heroQuest('violet', 'Violet', [1, 2, 3, 4]);
  ctx.heroQuest('nova', 'Nova', [9, 10, 11]);
  ctx.heroQuest('cloud', 'Steam Clouds', [14, 15]);
}

// ============================================================================
// SLOT 4A: The Pterosaur Cloud-Glass Loft
// ============================================================================
function u06_c4a(ctx: SceneCtx): void {
  initChapter(ctx, 'u06_c4a', 240, 134);
  const { rng } = ctx;

  drawSkySparkles(ctx, 18, 144, 'petals');

  const orbX = Math.round(jit(rng, 96, 5));
  const orbY = Math.round(jit(rng, 56, 3));
  const orb = drawThemedOrb(ctx, orbX, orbY, 20, 'lotusSun', { tilt: -0.2 });

  ctx.canon(14, 'Glass-Loft Cloud', 'cloud');
  ctx.canon(15, 'Glider Drift Cloud', 'cloud');
  drawThemedCloud(ctx, 14, Math.round(jit(rng, 240, 5)), Math.round(jit(rng, 42, 3)), 82, 26, 'fluffy');
  drawThemedCloud(ctx, 15, Math.round(jit(rng, 392, 5)), Math.round(jit(rng, 52, 3)), 78, 26, 'fluffy');

  drawHorizonHills(ctx, { style: 'peaks', yBase: 162, yBottom: 214, layers: 2 });
  drawGroundDeck(ctx, { style: 'pier', yTop: 208, yBottom: 250, labelPrefix: 'Cloud-Glass' });

  // Soaring Pastel Pterosaur Glider center-sky + Glass Conservatory Loft right + Brontosaurus left
  const pteroIds = drawPterosaurGlider(ctx, 224, 126, 1.12, 'Pastel');
  drawGlassConservatory(ctx, 372, 174, 0.92, { label: 'Loft' });
  drawBrontosaurus(ctx, 96, 184, 0.84, { label: 'Loft' });
  twinkle(ctx, ctx.dyn('star', 'Loft Sunbeam Star'), 312, 104, 11);

  // 3 ghosts in open sky
  ghostCreature(ctx, 'dino', 174, 56, 'Glider Dino Ghost');
  ghostCreature(ctx, 'crane', 318, 56, 'Sky-Wing Ghost');
  ghostCreature(ctx, 'butterfly', 442, 114, 'Loft Butterfly Ghost');

  ctx.ellipsePath('ring', orbX, orbY, orb.rx, orb.ry, 24, orb.tilt);
  const gallopPath = ctx.wavePath('gallop', 66, 236, 414, 236, 8, 2, 20);
  const orbitPath = ctx.ellipsePath('orbit', 240, 86, 178, 46, 24);
  ctx.marginPath(256);

  ctx.actor('violet', 120, 244, { facing: 1, anim: 'idle' });
  ctx.actor('lumi', 256, 244, { facing: 1, anim: 'rear', pathIndex: gallopPath });
  ctx.actor('cometCar', 376, 242, { facing: -1, anim: 'run', pathIndex: gallopPath });
  ctx.actor('comet', 352, 94, { facing: -1, anim: 'float', pathIndex: orbitPath });

  ctx.heroQuest('dino', 'Pterosaur', pteroIds);
  ctx.heroQuest('violet', 'Violet', [1, 2, 3, 4]);
  ctx.heroQuest('lumi', 'Lumi', [5, 6, 7, 8]);
  ctx.heroQuest('planet', 'Lotus Sun', [12, 13]);
}

// ============================================================================
// SLOT 4B: The Sparkle-Lava Caldera Rim
// ============================================================================
function u06_c4b(ctx: SceneCtx): void {
  initChapter(ctx, 'u06_c4b', 240, 144);
  const { rng } = ctx;

  drawSkySparkles(ctx, 18, 144, 'hearts');

  const orbX = Math.round(jit(rng, 98, 5));
  const orbY = Math.round(jit(rng, 56, 3));
  const orb = drawThemedOrb(ctx, orbX, orbY, 20, 'lotusSun', { tilt: -0.2 });

  ctx.canon(14, 'Caldera Puff Cloud', 'cloud');
  ctx.canon(15, 'Berry Steam Cloud', 'cloud');
  drawThemedCloud(ctx, 14, Math.round(jit(rng, 242, 5)), Math.round(jit(rng, 44, 3)), 82, 28, 'steamPuff');
  drawThemedCloud(ctx, 15, Math.round(jit(rng, 392, 5)), Math.round(jit(rng, 54, 3)), 78, 28, 'steamPuff');

  drawHorizonHills(ctx, { style: 'mesas', yBase: 164, yBottom: 214, layers: 2 });
  drawGroundDeck(ctx, { style: 'courtyard', yTop: 208, yBottom: 250, labelPrefix: 'Caldera Rim' });

  // Friendly Berry Volcano puffing Glittering Star-Hearts + Crystal Cluster left + Brontosaurus right
  const volcanoIds = drawVolcanoCaldera(ctx, 240, 170, 1.18, { label: 'Sparkle-Berry' });
  drawCrystalCluster(ctx, 76, 178, 0.92, { label: 'Caldera' });
  drawBrontosaurus(ctx, 392, 182, 0.84, { label: 'Caldera', flip: -1 });

  // Puffing glittering star-hearts floating out of the volcano!
  const h1 = ctx.dyn('star', 'Caldera Star-Heart A');
  const h2 = ctx.dyn('star', 'Caldera Star-Heart B');
  const h3 = ctx.dyn('star', 'Caldera Star-Heart C');
  heart(ctx, h1, 172, 110, 10.5);
  heart(ctx, h2, 240, 92, 11.5);
  heart(ctx, h3, 308, 110, 10.5);

  // 3 ghosts in open sky
  ghostCreature(ctx, 'dino', 176, 56, 'Caldera Dino Ghost');
  ghostCreature(ctx, 'dragon', 318, 56, 'Ember Dragon Ghost');
  ghostCreature(ctx, 'crystal', 442, 114, 'Lava Crystal Ghost');

  ctx.ellipsePath('ring', orbX, orbY, orb.rx, orb.ry, 24, orb.tilt);
  const gallopPath = ctx.wavePath('gallop', 66, 236, 414, 236, 8, 2, 20);
  const sprintPath = ctx.wavePath('sprint', 74, 236, 408, 236, 8, 2, 20);
  const orbitPath = ctx.ellipsePath('orbit', 240, 86, 176, 46, 24);
  ctx.marginPath(256);

  ctx.actor('lumi', 132, 244, { facing: 1, anim: 'rear', pathIndex: gallopPath });
  ctx.actor('nova', 348, 244, { facing: -1, anim: 'leap', pathIndex: sprintPath });
  ctx.actor('cometCar', 240, 242, { facing: 1, anim: 'run', pathIndex: sprintPath });
  ctx.actor('comet', 326, 94, { facing: -1, anim: 'float', pathIndex: orbitPath });

  ctx.heroQuest('dino', 'Berry Volcano', volcanoIds);
  ctx.heroQuest('heart', 'Star Hearts', [h1, h2, h3]);
  ctx.heroQuest('lumi', 'Lumi', [5, 6, 7, 8]);
  ctx.heroQuest('nova', 'Nova', [9, 10, 11]);
}

// ============================================================================
// SLOT 5 FINALE: The Great Sunburst Dino Dome (50..70 regions!)
// ============================================================================
function u06_c5(ctx: SceneCtx): void {
  initChapter(ctx, 'u06_c5', 240, 124);
  const { r, rng } = ctx;

  drawSkySparkles(ctx, 22, 136, 'petals');

  // 1) Celestial Orb (12/13) (2 regions)
  const orbX = 76 + Math.round(jit(rng, 0, 3));
  const orbY = 56 + Math.round(jit(rng, 0, 2));
  const orb = drawThemedOrb(ctx, orbX, orbY, 18, 'lotusSun', { tilt: -0.2 });

  // 2) Horizon rolling botanical hills & grand sunlit garden floor (4 regions)
  drawHorizonHills(ctx, { style: 'rolling', yBase: 162, yBottom: 214, layers: 2 });
  drawGroundDeck(ctx, { style: 'gardenPath', yTop: 208, yBottom: 250, labelPrefix: 'Sunburst Dome' });

  // 3) Grand Centerpiece: The Great Sunburst Botanical Dino Dome (~15 chunky regions!)
  const domeQuestIds: number[] = [];
  const cx = 240;

  // Seven stained-glass sunburst crown petals fanning over the grand conservatory cupola!
  for (let i = -3; i <= 3; i++) {
    const a = -Math.PI / 2 + i * 0.34;
    const pid = ctx.dyn('star', `Sunburst Ray Petal ${i + 4}`);
    const bx = cx + Math.cos(a) * 56;
    const by = 132 + Math.sin(a) * 50;
    const tx = cx + Math.cos(a) * 88;
    const ty = 132 + Math.sin(a) * 76;
    r.capsule(pid, bx, by, tx, ty, 8);
    r.disc(pid, tx, ty, 9);
    if (Math.abs(i) <= 1) domeQuestIds.push(pid);
  }

  // Grand iron-and-glass botanical dome hall
  const mainDome = ctx.dyn('prop', 'Great Botanical Cupola');
  r.disc(mainDome, cx, 134, 48);
  r.rect(mainDome, cx - 48, 134, cx + 48, 196);
  inkArc(r, cx, 134, 24, 46, Math.PI, Math.PI * 2, 0, { only: [mainDome] });
  r.line(INK, cx, 88, cx, 194, { only: [mainDome] });
  r.line(INK, cx - 46, 134, cx + 46, 134, { only: [mainDome] });
  domeQuestIds.push(mainDome);

  // Twin botanical side glass apses
  for (const side of [-1, 1] as const) {
    const apse = ctx.dyn('prop', side < 0 ? 'West Glass Apse' : 'East Glass Apse');
    const ax = cx + side * 62;
    r.disc(apse, ax, 152, 20);
    r.rect(apse, ax - 20, 152, ax + 20, 204);
    r.line(INK, ax, 134, ax, 202, { only: [apse] });
  }

  // Stone greenhouse plinth + radiant sunburst entry portal + rose glass window
  const plinth = ctx.dyn('prop', 'Sunburst Dome Plinth');
  r.rect(plinth, cx - 76, 194, cx + 76, 208);

  const roseWin = ctx.dyn('star', 'Cupola Rose Sunburst');
  r.disc(roseWin, cx, 124, 17);
  inkArc(r, cx, 124, 10, 10, 0, Math.PI * 2, 0, { only: [roseWin] });
  domeQuestIds.push(roseWin);

  const portal = ctx.dyn('star', 'Botanical Entry Arch');
  r.disc(portal, cx, 174, 16);
  r.rect(portal, cx - 16, 174, cx + 16, 208);
  domeQuestIds.push(portal);

  // 4) Flanking Prehistoric Valley Wing Landmarks + Foreground Framing Clouds 14/15 (12 regions!)
  drawBrontosaurus(ctx, 102, 174, 0.86, { label: 'Valley West' });
  drawVolcanoCaldera(ctx, 378, 170, 0.86, { label: 'Valley East' });
  drawDinoEggNest(ctx, 36, 188, 'Dome West');
  drawStarMelonMound(ctx, 444, 188, 'Dome East');
  ctx.canon(14, 'Sunburst Valley Cloud', 'cloud');
  ctx.canon(15, 'Rainbow Greenhouse Cloud', 'cloud');
  drawThemedCloud(ctx, 14, 52, 224, 82, 26, 'fluffy');
  drawThemedCloud(ctx, 15, 428, 224, 82, 26, 'fluffy');

  // 5) Celebration Sunburst Sky Ornaments (8 regions!)
  star(ctx, ctx.dyn('star', 'East Sunburst Star'), 404, 56, 13.5, { points: 6, inner: 0.5 });
  star(ctx, ctx.dyn('star', 'Zenith Sun Star'), cx, 22, 10.5, { points: 5, inner: 0.48 });
  twinkle(ctx, ctx.dyn('star', 'West Sunbeam Twinkle'), 146, 46, 11);
  twinkle(ctx, ctx.dyn('star', 'East Sunbeam Twinkle'), 334, 46, 11);
  pearl(ctx, ctx.dyn('star', 'Pollen Glow West'), 112, 96, 9);
  pearl(ctx, ctx.dyn('star', 'Pollen Glow East'), 368, 96, 9);
  star(ctx, ctx.dyn('star', 'West Valley Star'), 32, 104, 10, { points: 5, inner: 0.48 });
  star(ctx, ctx.dyn('star', 'East Valley Star'), 448, 104, 10, { points: 5, inner: 0.48 });

  // 6) 3 Ghosts in open upper sky
  ghostCreature(ctx, 'dino', 190, 30, 'Sunburst Dino Ghost');
  ghostCreature(ctx, 'butterfly', 290, 30, 'Valley Butterfly Ghost');
  ghostCreature(ctx, 'dragon', 446, 54, 'Prehistoric Wing Ghost');

  // 7) Paths
  ctx.ellipsePath('ring', orbX, orbY, orb.rx, orb.ry, 24, orb.tilt);
  const gallopPath = ctx.wavePath('gallop', 62, 238, 418, 238, 8, 2, 20);
  const sprintPath = ctx.wavePath('sprint', 78, 236, 402, 236, 8, 2, 20);
  const orbitPath = ctx.ellipsePath('orbit', 240, 88, 184, 52, 28);
  ctx.marginPath(256);

  // 8) Full Hero Cast + Valley Companions (15 regions!)
  ctx.actor('lumi', 138, 246, { facing: 1, anim: 'rear', pathIndex: gallopPath });
  ctx.actor('violet', 240, 248, { facing: 1, anim: 'idle' });
  ctx.actor('nova', 342, 246, { facing: -1, anim: 'leap', pathIndex: sprintPath });
  ctx.actor('gazelle', 428, 244, { facing: -1, anim: 'idle', pathIndex: gallopPath });
  ctx.actor('comet', 402, 102, { facing: -1, anim: 'float', pathIndex: orbitPath });

  void plinth;
  ctx.heroQuest('dino', 'Sunburst Dome', domeQuestIds);
  ctx.heroQuest('violet', 'Violet', [1, 2, 3, 4]);
  ctx.heroQuest('lumi', 'Lumi', [5, 6, 7, 8]);
  ctx.heroQuest('nova', 'Nova', [9, 10, 11]);
}

export const U06_SCENES = {
  hub_dinoFernValley,
  u06_c1,
  u06_c2a,
  u06_c2b,
  u06_c3a,
  u06_c3b,
  u06_c4a,
  u06_c4b,
  u06_c5,
} satisfies Partial<Record<SceneId, (ctx: SceneCtx) => void>>;
