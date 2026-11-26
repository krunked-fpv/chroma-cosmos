/**
 * Universe 3: Sugar-Cloud Sky Bakery (9 bespoke procedural scenes: 1 Hub Sanctuary + 8 Chapters).
 * Pure & deterministic (ctx.rng only), strict >= 60px region hygiene, clean bottom margin (y <= 252).
 */
import { MaterialId } from '../../contracts/materials';
import type { SceneId } from '../../contracts/roguelike';
import { UNIVERSE_BY_ID } from '../../contracts/universes';
import type { SceneCtx } from '../context';
import {
  drawCupcakeHouse,
  drawDonutWheel,
  drawGiantTeacup,
  drawGingerbreadTrain,
  drawGroundDeck,
  drawHorizonHills,
  drawMacaronTower,
  drawSanctuaryRoom,
  drawSkySparkles,
  drawSundaeVolcano,
  drawTeapotHouse,
  drawThemedCloud,
  drawThemedOrb,
  ghostCreature,
} from '../kit';
import { heart, inkArc, jit, milkshake, pearl, rot, star, twinkle } from '../props';
import { INK, W, type Pt } from '../raster';

const UNI = UNIVERSE_BY_ID.sugarCloudBakery;
const CH = Object.fromEntries(UNI.chapters.map((c) => [c.id, c]));

function initChapter(ctx: SceneCtx, id: string, fx = 240, fy = 138): void {
  const ch = CH[id];
  ctx.title = ch ? ch.title : id;
  ctx.sky = UNI.sky;
  ctx.universeId = UNI.id;
  ctx.ambient = UNI.ambient;
  ctx.focal = { x: fx, y: fy };
}

/** Giant swirled whipped-cream mixing bowl with standing brass whisk (3 chunky regions). */
function drawMixingBowl(ctx: SceneCtx, x: number, y: number, label: string): number[] {
  const { r } = ctx;
  const whisk = ctx.dyn('prop', `${label} Whisk`);
  const batter = ctx.dyn('milkshake', `${label} Whipped Swirl`);
  const bowl = ctx.dyn('prop', `${label} Mixing Bowl`);

  // Standing whisk tilted right out of bowl
  r.capsule(whisk, x + 16, y - 44, x + 4, y - 10, 5);
  r.ellipse(whisk, x + 22, y - 48, 8, 12, 0.35);
  r.line(INK, x + 16, y - 42, x + 6, y - 14, { only: [whisk] });

  // Fluffy swirled whipped-cream batter mound
  r.ellipse(batter, x, y - 12, 42, 16);
  r.ellipse(batter, x - 4, y - 24, 28, 13);
  r.disc(batter, x - 8, y - 34, 11);
  inkArc(r, x - 2, y - 16, 26, 8, Math.PI * 0.1, Math.PI * 0.9, 0, { only: [batter] });

  // Chunky glazed ceramic mixing bowl
  r.shape(bowl, x - 48, y - 12, x + 48, y + 32, (px, py) => {
    if (py < y - 10 || py > y + 30) return false;
    const t = (py - (y - 10)) / 40;
    const hw = 45 * Math.sqrt(Math.max(0, 1 - t * t * 0.65));
    return Math.abs(px - x) <= hw;
  });
  r.rect(bowl, x - 48, y - 12, x + 48, y - 4);
  r.line(INK, x - 34, y + 8, x + 34, y + 8, { only: [bowl] });
  r.line(INK, x - 28, y + 18, x + 28, y + 18, { only: [bowl] });
  return [whisk, batter, bowl];
}

/** Candy-cane striped lollipop lamp post (2 chunky regions). */
function drawLollipopLamp(ctx: SceneCtx, x: number, yBase: number, h: number, label: string): [number, number] {
  const { r } = ctx;
  const stick = ctx.dyn('prop', `${label} Candy Post`);
  const swirl = ctx.dyn('milkshake', `${label} Lollipop Head`);
  r.rect(stick, x - 5, yBase - h, x + 5, yBase);
  r.ellipse(stick, x, yBase - 2, 11, 4.5);
  for (let sy = yBase - h + 8; sy < yBase - 4; sy += 8) {
    r.line(INK, x - 4, sy, x + 4, sy - 3, { only: [stick] });
  }
  r.disc(swirl, x, yBase - h - 12, 15);
  inkArc(r, x, yBase - h - 12, 10, 10, 0, Math.PI * 1.65, 0, { only: [swirl] });
  inkArc(r, x, yBase - h - 12, 5, 5, Math.PI * 0.4, Math.PI * 1.9, 0, { only: [swirl] });
  return [stick, swirl];
}

/** Arched candy-cane bridge viaduct spanning the screen (2 chunky regions). */
function drawCandyViaduct(ctx: SceneCtx, yDeck: number, yBot: number): [number, number] {
  const { r } = ctx;
  const arches = ctx.dyn('prop', 'Gingerbread Bridge Arches');
  const deck = ctx.dyn('prop', 'Candy-Cane Rail Deck');
  r.shape(arches, 0, yDeck, W, yBot, (px, py) => {
    if (py < yDeck || py > yBot) return false;
    for (const ax of [80, 240, 400]) {
      const dx = (px - ax) / 52;
      const dy = (py - yBot) / (yBot - yDeck - 10);
      if (dy <= 0 && dx * dx + dy * dy < 1) return false;
    }
    return true;
  });
  for (let x = 24; x < W; x += 28) {
    r.line(INK, x, yDeck + 4, x, yBot - 2, { only: [arches] });
  }
  r.rect(deck, 0, yDeck - 12, W, yDeck + 2);
  for (let x = 14; x < W; x += 18) {
    r.line(INK, x, yDeck - 11, x + 8, yDeck + 1, { only: [deck] });
  }
  return [arches, deck];
}

/** Stacked wafer-cookie pastry archway / station gazebo (3 chunky regions). */
function drawPastryGazebo(ctx: SceneCtx, x: number, y: number, label: string): number[] {
  const { r } = ctx;
  const pillars = ctx.dyn('prop', `${label} Wafer Columns`);
  const roof = ctx.dyn('milkshake', `${label} Icing Dome`);
  const berry = ctx.dyn('star', `${label} Berry Finial`);
  r.rect(pillars, x - 30, y - 6, x - 18, y + 32);
  r.rect(pillars, x + 18, y - 6, x + 30, y + 32);
  r.rect(pillars, x - 34, y + 24, x + 34, y + 34);
  r.ellipse(roof, x, y - 10, 38, 14);
  r.ellipse(roof, x, y - 20, 26, 11);
  inkArc(r, x, y - 10, 28, 7, Math.PI * 0.1, Math.PI * 0.9, 0, { only: [roof] });
  r.disc(berry, x, y - 32, 9.5);
  return [pillars, roof, berry];
}

// ============================================================================
// HUB SANCTUARY: Violet's Whipped-Cream Sky Kitchen
// ============================================================================
function hub_sugarCloudBakery(ctx: SceneCtx): void {
  ctx.universeId = UNI.id;
  ctx.ambient = UNI.ambient;
  const showcaseIds: number[] = [];

  drawSanctuaryRoom(ctx, {
    title: UNI.hubTitle,
    sky: UNI.sky,
    windowShape: 'arched',
    windowOrbStyle: 'macaronOrb',
    wallStyle: 'tile',
    floorStyle: 'tile',
    rugShape: 'cloud',
    lampStyle: 'candle',
    garlandStyle: 'bunting',
    sparkleStyle: 'hearts',
    violetPos: { x: 204, y: 238, facing: 1 },
    workbenchLabel: 'Frosting Counter',
    shelfLabel: 'Pastry Pantry Shelf',
    seatingLabel: 'Marshmallow Settee',
    trinketLabels: ['Recipe Tomes', 'Sprinkle Jars', 'Sugar Scrolls'],
    palette: {
      wallPanel: MaterialId.CottonCandyChalk,
      floor: MaterialId.AuroraSherbet,
      windowFrame: MaterialId.SolarFlare24K,
      windowGlass: MaterialId.VelvetNebula,
      curtain: MaterialId.StrawberrySupernova,
      orbCore: MaterialId.CosmicCottonSwirl,
      orbRing: MaterialId.OpalPearl,
      rugOuter: MaterialId.StrawberrySupernova,
      rugInner: MaterialId.OpalPearl,
      furniture: MaterialId.RoyalAstralGold,
      furnitureTrim: MaterialId.AuroraSherbet,
      accentA: MaterialId.StrawberrySupernova,
      accentB: MaterialId.SolarFlare24K,
      accentC: MaterialId.CosmicCottonSwirl,
    },
    drawWindowView: (c, wx) => {
      const bank = c.dyn('cloud', 'Window Sugar Clouds');
      c.r.ellipse(bank, wx, 130, 34, 10);
      c.r.disc(bank, wx - 16, 124, 10);
      c.r.disc(bank, wx + 4, 120, 11);
      c.r.disc(bank, wx + 20, 124, 9);
      c.preColor(bank, MaterialId.OpalPearl);
    },
    drawExtraProps: (c) => {
      const { r } = c;
      // 1) Left wall cookie-heart wreath plaque (2 regions)
      const plaque = c.dyn('prop', 'Cookie Wall Wreath');
      r.disc(plaque, 84, 92, 22);
      inkArc(r, 84, 92, 16, 16, 0, Math.PI * 2, 0, { only: [plaque] });
      c.preColor(plaque, MaterialId.SolarFlare24K);

      const heartCookie = c.dyn('star', 'Frosted Heart Cookie');
      heart(c, heartCookie, 84, 92, 10);
      c.preColor(heartCookie, MaterialId.StrawberrySupernova);

      // 2) Floor standing Tiered Cake Stand beside Violet (3 regions)
      const stand = c.dyn('prop', 'Porcelain Cake Pedestal');
      r.rect(stand, 263, 198, 275, 220);
      r.ellipse(stand, 269, 222, 16, 5);
      r.ellipse(stand, 269, 198, 22, 5.5);
      c.preColor(stand, MaterialId.OpalPearl);

      const cakeBody = c.dyn('milkshake', 'Sanctuary Layer Cake');
      r.rect(cakeBody, 250, 178, 288, 198);
      r.rect(cakeBody, 256, 162, 282, 178);
      r.line(INK, 252, 188, 286, 188, { only: [cakeBody] });
      c.preColor(cakeBody, MaterialId.CosmicCottonSwirl);

      const cakeFrost = c.dyn('star', 'Cake Berry Topper');
      r.ellipse(cakeFrost, 269, 162, 16, 6);
      r.disc(cakeFrost, 269, 152, 8);
      c.preColor(cakeFrost, MaterialId.StrawberrySupernova);
      showcaseIds.push(stand, cakeBody, cakeFrost);

      // 3) Desk-right Mini Frosted Cupcake & Upper-Right Bakery Pennant (2 regions)
      const deskCake = c.dyn('milkshake', 'Desk Berry Cupcake');
      r.poly(deskCake, [[362, 166], [386, 166], [382, 180], [366, 180]]);
      r.ellipse(deskCake, 374, 162, 14, 9);
      r.disc(deskCake, 374, 152, 6);
      c.preColor(deskCake, MaterialId.StrawberrySupernova);

      const wallBanner = c.dyn('prop', 'Bakery Star Emblem');
      r.poly(wallBanner, [[334, 72], [372, 72], [372, 112], [353, 124], [334, 112]]);
      c.preColor(wallBanner, MaterialId.HoloFoil);

      return [plaque, heartCookie, stand, cakeBody, cakeFrost, deskCake, wallBanner];
    },
  });

  ctx.heroQuest('violet', 'Violet', [1, 2, 3, 4]);
  ctx.heroQuest('planet', 'Macaron Moon', [12, 13]);
  ctx.heroQuest('cake', 'Sky Cake', showcaseIds);
}

// ============================================================================
// SLOT 1: The Whipped-Cream Mixing Deck
// ============================================================================
function u03_c1(ctx: SceneCtx): void {
  initChapter(ctx, 'u03_c1', 236, 148);
  const { rng } = ctx;

  drawSkySparkles(ctx, 18, 144, 'hearts');

  const orbX = Math.round(jit(rng, 382, 5));
  const orbY = Math.round(jit(rng, 58, 3));
  const orb = drawThemedOrb(ctx, orbX, orbY, 21, 'macaronOrb', { tilt: -0.24 });

  ctx.canon(14, 'Whipped-Cream Cloud', 'cloud');
  ctx.canon(15, 'Sugar-Puff Cloud', 'cloud');
  drawThemedCloud(ctx, 14, Math.round(jit(rng, 98, 5)), Math.round(jit(rng, 54, 3)), 84, 30, 'cottonCandy');
  drawThemedCloud(ctx, 15, Math.round(jit(rng, 242, 5)), Math.round(jit(rng, 44, 3)), 76, 26, 'cottonCandy');

  drawHorizonHills(ctx, { style: 'clouds', yBase: 168, yBottom: 214, layers: 2 });
  drawGroundDeck(ctx, { style: 'counter', yTop: 206, yBottom: 250, labelPrefix: 'Sky Bakery' });

  // Centerpiece Whipped-Cream Mixing Bowl + Macaron Tower right + Milkshake glass left
  const bowlIds = drawMixingBowl(ctx, 224, 184, 'Cumulus');
  drawMacaronTower(ctx, 372, 174, 0.88, { label: 'Deck' });
  const shakeId = ctx.canon(18, 'Sprinkle Milkshake', 'milkshake');
  milkshake(ctx, shakeId, 76, 208, 34, 48);

  // Sugar sprinkle stars in sky
  star(ctx, ctx.dyn('star', 'Sugar Star West'), 156, 108, 10.5, { points: 5, inner: 0.48 });
  heart(ctx, ctx.dyn('star', 'Frosting Heart'), 306, 104, 10);

  // 3 ghosts in open sky
  ghostCreature(ctx, 'cupcake', 176, 56, 'Sugar-Star Cupcake');
  ghostCreature(ctx, 'balloon', 306, 58, 'Sprinkle Balloon Ghost');
  ghostCreature(ctx, 'cat', 442, 114, 'Cream Kitty Ghost');

  ctx.ellipsePath('ring', orbX, orbY, orb.rx, orb.ry, 24, orb.tilt);
  const gallopPath = ctx.wavePath('gallop', 66, 236, 414, 236, 8, 2, 20);
  const orbitPath = ctx.ellipsePath('orbit', 240, 86, 176, 46, 24);
  ctx.marginPath(256);

  ctx.actor('violet', 142, 244, { facing: 1, anim: 'idle' });
  ctx.actor('lumi', 298, 244, { facing: -1, anim: 'idle', pathIndex: gallopPath });
  ctx.actor('moonCat', 426, 238, { facing: -1, anim: 'sleep' });
  ctx.actor('comet', 228, 92, { facing: 1, anim: 'float', pathIndex: orbitPath });

  ctx.heroQuest('cake', 'Mixing Bowl', bowlIds);
  ctx.heroQuest('violet', 'Violet', [1, 2, 3, 4]);
  ctx.heroQuest('lumi', 'Lumi', [5, 6, 7, 8]);
  ctx.heroQuest('cloud', 'Sugar Clouds', [14, 15]);
}

// ============================================================================
// SLOT 2A: The Pastel Macaron Spire
// ============================================================================
function u03_c2a(ctx: SceneCtx): void {
  initChapter(ctx, 'u03_c2a', 240, 144);
  const { rng } = ctx;

  drawSkySparkles(ctx, 18, 144, 'hearts');

  const orbX = Math.round(jit(rng, 98, 5));
  const orbY = Math.round(jit(rng, 58, 3));
  const orb = drawThemedOrb(ctx, orbX, orbY, 21, 'macaronOrb', { tilt: -0.26 });

  ctx.canon(14, 'Raspberry Cloud', 'cloud');
  ctx.canon(15, 'Pistachio Mist Cloud', 'cloud');
  drawThemedCloud(ctx, 14, Math.round(jit(rng, 244, 5)), Math.round(jit(rng, 44, 3)), 82, 28, 'cottonCandy');
  drawThemedCloud(ctx, 15, Math.round(jit(rng, 390, 5)), Math.round(jit(rng, 54, 3)), 78, 28, 'cottonCandy');

  drawHorizonHills(ctx, { style: 'clouds', yBase: 166, yBottom: 214, layers: 2 });
  drawGroundDeck(ctx, { style: 'counter', yTop: 208, yBottom: 250, labelPrefix: 'Patisserie' });

  // Towering centerpiece Macaron Spire + companion tower + pastry gazebo
  const mainSpire = drawMacaronTower(ctx, 240, 168, 1.18, { label: 'Grand' });
  drawMacaronTower(ctx, 94, 180, 0.82, { label: 'Pistachio' });
  drawPastryGazebo(ctx, 388, 178, 'Wafer');

  // Floating sugar hearts & candy stars
  heart(ctx, ctx.dyn('star', 'Berry Glaze Heart'), 166, 114, 10.5);
  star(ctx, ctx.dyn('star', 'Spire Sugar Star'), 320, 108, 11, { points: 5, inner: 0.48 });

  // 3 ghosts in open sky
  ghostCreature(ctx, 'cupcake', 176, 56, 'Macaron Cupcake Ghost');
  ghostCreature(ctx, 'butterfly', 316, 58, 'Sugar-Wing Ghost');
  ghostCreature(ctx, 'cat', 442, 114, 'Patisserie Cat Ghost');

  ctx.ellipsePath('ring', orbX, orbY, orb.rx, orb.ry, 24, orb.tilt);
  const sprintPath = ctx.wavePath('sprint', 66, 236, 414, 236, 8, 2, 20);
  const orbitPath = ctx.ellipsePath('orbit', 240, 86, 178, 46, 24);
  ctx.marginPath(256);

  ctx.actor('violet', 148, 244, { facing: 1, anim: 'idle' });
  ctx.actor('nova', 324, 244, { facing: -1, anim: 'leap', pathIndex: sprintPath });
  ctx.actor('moonCat', 240, 242, { facing: 1, anim: 'peek' });
  ctx.actor('comet', 312, 90, { facing: -1, anim: 'float', pathIndex: orbitPath });

  ctx.heroQuest('cake', 'Macaron Spire', mainSpire);
  ctx.heroQuest('violet', 'Violet', [1, 2, 3, 4]);
  ctx.heroQuest('nova', 'Nova', [9, 10, 11]);
  ctx.heroQuest('planet', 'Macaron Moon', [12, 13]);
}

// ============================================================================
// SLOT 2B: The Glazed Donut Ferris Wheel
// ============================================================================
function u03_c2b(ctx: SceneCtx): void {
  initChapter(ctx, 'u03_c2b', 248, 144);
  const { rng } = ctx;

  drawSkySparkles(ctx, 18, 144, 'stars');

  const orbX = Math.round(jit(rng, 96, 5));
  const orbY = Math.round(jit(rng, 58, 3));
  const orb = drawThemedOrb(ctx, orbX, orbY, 21, 'donutPlanet', { tilt: -0.24 });

  ctx.canon(14, 'Syrup Mist Cloud', 'cloud');
  ctx.canon(15, 'Sprinkle Glaze Cloud', 'cloud');
  drawThemedCloud(ctx, 14, Math.round(jit(rng, 236, 5)), Math.round(jit(rng, 46, 3)), 80, 28, 'cottonCandy');
  drawThemedCloud(ctx, 15, Math.round(jit(rng, 392, 5)), Math.round(jit(rng, 54, 3)), 78, 28, 'cottonCandy');

  drawHorizonHills(ctx, { style: 'clouds', yBase: 168, yBottom: 214, layers: 2 });
  drawGroundDeck(ctx, { style: 'pier', yTop: 208, yBottom: 250, labelPrefix: 'Syrup Boardwalk' });

  // Giant Glazed Donut Ferris Wheel center-right + Pastry Booth left + Lollipop Lamps
  const donutIds = drawDonutWheel(ctx, 276, 170, 1.16, { label: 'Glazed' });
  drawPastryGazebo(ctx, 106, 178, 'Donut');
  drawLollipopLamp(ctx, 412, 212, 50, 'East Wheel');
  drawLollipopLamp(ctx, 44, 212, 46, 'West Wheel');
  twinkle(ctx, ctx.dyn('star', 'Sprinkle Twinkle'), 188, 108, 11);

  // 3 ghosts in open sky
  ghostCreature(ctx, 'cupcake', 174, 58, 'Donut Cupcake Ghost');
  ghostCreature(ctx, 'balloon', 318, 56, 'Glaze Balloon Ghost');
  ghostCreature(ctx, 'cat', 442, 114, 'Boardwalk Cat Ghost');

  ctx.ellipsePath('ring', orbX, orbY, orb.rx, orb.ry, 24, orb.tilt);
  const gallopPath = ctx.wavePath('gallop', 66, 236, 414, 236, 8, 2, 20);
  const sprintPath = ctx.wavePath('sprint', 74, 236, 408, 236, 8, 2, 20);
  const orbitPath = ctx.ellipsePath('orbit', 240, 86, 178, 46, 24);
  ctx.marginPath(256);

  ctx.actor('lumi', 142, 244, { facing: 1, anim: 'rear', pathIndex: gallopPath });
  ctx.actor('nova', 352, 244, { facing: -1, anim: 'leap', pathIndex: sprintPath });
  ctx.actor('cometCar', 248, 242, { facing: 1, anim: 'run', pathIndex: sprintPath });
  ctx.actor('comet', 354, 96, { facing: -1, anim: 'float', pathIndex: orbitPath });

  ctx.heroQuest('cake', 'Donut Wheel', donutIds);
  ctx.heroQuest('lumi', 'Lumi', [5, 6, 7, 8]);
  ctx.heroQuest('nova', 'Nova', [9, 10, 11]);
  ctx.heroQuest('planet', 'Donut Planet', [12, 13]);
}

// ============================================================================
// SLOT 3A: The Cupcake Cottage Terrace
// ============================================================================
function u03_c3a(ctx: SceneCtx): void {
  initChapter(ctx, 'u03_c3a', 240, 146);
  const { rng } = ctx;

  drawSkySparkles(ctx, 18, 144, 'hearts');

  const orbX = Math.round(jit(rng, 382, 5));
  const orbY = Math.round(jit(rng, 56, 3));
  const orb = drawThemedOrb(ctx, orbX, orbY, 21, 'macaronOrb', { tilt: -0.25 });

  ctx.canon(14, 'Buttercream Cloud', 'cloud');
  ctx.canon(15, 'Cherry Puff Cloud', 'cloud');
  drawThemedCloud(ctx, 14, Math.round(jit(rng, 96, 5)), Math.round(jit(rng, 52, 3)), 82, 28, 'cottonCandy');
  drawThemedCloud(ctx, 15, Math.round(jit(rng, 244, 5)), Math.round(jit(rng, 44, 3)), 76, 26, 'cottonCandy');

  drawHorizonHills(ctx, { style: 'clouds', yBase: 168, yBottom: 214, layers: 2 });
  drawGroundDeck(ctx, { style: 'gardenPath', yTop: 208, yBottom: 250, labelPrefix: 'Frosting' });

  // Twin Cupcake Cottages + Lollipop Garden Lamp
  const houseL = drawCupcakeHouse(ctx, 142, 174, 1.08, { label: 'Cherry' });
  drawCupcakeHouse(ctx, 356, 180, 0.84, { label: 'Vanilla', flip: -1 });
  drawLollipopLamp(ctx, 252, 212, 46, 'Terrace');
  heart(ctx, ctx.dyn('star', 'Chimney Heart Puff'), 142, 104, 10);
  star(ctx, ctx.dyn('star', 'Terrace Star'), 434, 128, 11, { points: 5, inner: 0.48 });

  // 3 ghosts in open sky
  ghostCreature(ctx, 'cupcake', 176, 56, 'Cottage Cupcake Ghost');
  ghostCreature(ctx, 'owl', 308, 60, 'Bakery Owl Ghost');
  ghostCreature(ctx, 'cat', 44, 114, 'Terrace Cat Ghost');

  ctx.ellipsePath('ring', orbX, orbY, orb.rx, orb.ry, 24, orb.tilt);
  const gallopPath = ctx.wavePath('gallop', 66, 236, 414, 236, 8, 2, 20);
  ctx.ellipsePath('orbit', 240, 86, 178, 46, 24);
  ctx.marginPath(256);

  ctx.actor('violet', 122, 244, { facing: 1, anim: 'idle' });
  ctx.actor('lumi', 286, 244, { facing: -1, anim: 'idle', pathIndex: gallopPath });
  ctx.actor('gazelle', 410, 244, { facing: -1, anim: 'idle', pathIndex: gallopPath });
  ctx.actor('moonCat', 200, 240, { facing: 1, anim: 'sleep' });

  ctx.heroQuest('cake', 'Cupcake House', houseL);
  ctx.heroQuest('violet', 'Violet', [1, 2, 3, 4]);
  ctx.heroQuest('lumi', 'Lumi', [5, 6, 7, 8]);
  ctx.heroQuest('cloud', 'Frosting Cloud', [14, 15]);
}

// ============================================================================
// SLOT 3B: The Gingerbread Express Bridge
// ============================================================================
function u03_c3b(ctx: SceneCtx): void {
  initChapter(ctx, 'u03_c3b', 236, 146);
  const { rng } = ctx;

  drawSkySparkles(ctx, 18, 138, 'stars');

  const orbX = Math.round(jit(rng, 384, 5));
  const orbY = Math.round(jit(rng, 54, 3));
  const orb = drawThemedOrb(ctx, orbX, orbY, 20, 'donutPlanet', { tilt: -0.24 });

  ctx.canon(14, 'Vanilla Steam Cloud', 'cloud');
  ctx.canon(15, 'Cinnamon Puff Cloud', 'cloud');
  drawThemedCloud(ctx, 14, Math.round(jit(rng, 106, 5)), Math.round(jit(rng, 52, 3)), 84, 28, 'steamPuff');
  drawThemedCloud(ctx, 15, Math.round(jit(rng, 246, 5)), Math.round(jit(rng, 44, 3)), 80, 26, 'steamPuff');

  drawHorizonHills(ctx, { style: 'clouds', yBase: 168, yBottom: 248, layers: 2 });

  // Grand Arched Candy-Cane Viaduct Bridge spanning the cloud canyon!
  drawCandyViaduct(ctx, 212, 248);

  // Puffing Gingerbread Express Train rolling along the viaduct + Berry Tart Station right
  const trainIds = drawGingerbreadTrain(ctx, 186, 168, 1.12, { label: 'Gingerbread' });
  drawPastryGazebo(ctx, 378, 174, 'Berry Tart');
  drawLollipopLamp(ctx, 56, 204, 48, 'Bridge Signal');
  pearl(ctx, ctx.dyn('star', 'Train Steam Puff A'), 228, 108, 10);
  pearl(ctx, ctx.dyn('star', 'Train Steam Puff B'), 264, 92, 11);

  // 3 ghosts in open sky
  ghostCreature(ctx, 'cupcake', 178, 56, 'Express Cupcake Ghost');
  ghostCreature(ctx, 'balloon', 314, 58, 'Station Balloon Ghost');
  ghostCreature(ctx, 'robot', 442, 110, 'Conductor Bot Ghost');

  ctx.ellipsePath('ring', orbX, orbY, orb.rx, orb.ry, 24, orb.tilt);
  const sprintPath = ctx.wavePath('sprint', 62, 234, 418, 234, 6, 2, 20);
  const orbitPath = ctx.ellipsePath('orbit', 240, 84, 176, 46, 24);
  ctx.marginPath(256);

  ctx.actor('violet', 102, 240, { facing: 1, anim: 'idle' });
  ctx.actor('nova', 298, 240, { facing: 1, anim: 'leap', pathIndex: sprintPath });
  ctx.actor('cometCar', 392, 238, { facing: -1, anim: 'run', pathIndex: sprintPath });
  ctx.actor('comet', 142, 98, { facing: 1, anim: 'float', pathIndex: orbitPath });

  ctx.heroQuest('cake', 'Candy Train', trainIds);
  ctx.heroQuest('violet', 'Violet', [1, 2, 3, 4]);
  ctx.heroQuest('nova', 'Nova', [9, 10, 11]);
  ctx.heroQuest('cloud', 'Steam Clouds', [14, 15]);
}

// ============================================================================
// SLOT 4A: The Berry Sundae Cloud Volcano
// ============================================================================
function u03_c4a(ctx: SceneCtx): void {
  initChapter(ctx, 'u03_c4a', 240, 144);
  const { rng } = ctx;

  drawSkySparkles(ctx, 18, 144, 'hearts');

  const orbX = Math.round(jit(rng, 96, 5));
  const orbY = Math.round(jit(rng, 56, 3));
  const orb = drawThemedOrb(ctx, orbX, orbY, 21, 'donutPlanet', { tilt: -0.24 });

  ctx.canon(14, 'Sherbet Swirl Cloud', 'cloud');
  ctx.canon(15, 'Gelato Mist Cloud', 'cloud');
  drawThemedCloud(ctx, 14, Math.round(jit(rng, 240, 5)), Math.round(jit(rng, 44, 3)), 82, 28, 'cottonCandy');
  drawThemedCloud(ctx, 15, Math.round(jit(rng, 392, 5)), Math.round(jit(rng, 54, 3)), 78, 28, 'cottonCandy');

  drawHorizonHills(ctx, { style: 'clouds', yBase: 168, yBottom: 214, layers: 2 });
  drawGroundDeck(ctx, { style: 'counter', yTop: 208, yBottom: 250, labelPrefix: 'Wafer Terrace' });

  // Erupting Berry Sundae Cloud Volcano centerpiece + Milkshake left + Macaron Tower right
  const volcanoIds = drawSundaeVolcano(ctx, 240, 170, 1.15, { label: 'Sherbet' });
  const shakeId = ctx.canon(18, 'Berry Gelato Shake', 'milkshake');
  const shakeParts = milkshake(ctx, shakeId, 88, 210, 36, 50);
  drawMacaronTower(ctx, 392, 176, 0.84, { label: 'Parfait' });

  // Bubbling sherbet scoops floating skyward
  pearl(ctx, ctx.dyn('star', 'Sherbet Scoop A'), 170, 108, 10);
  pearl(ctx, ctx.dyn('star', 'Sherbet Scoop B'), 310, 106, 10);

  // 3 ghosts in open sky
  ghostCreature(ctx, 'cupcake', 172, 56, 'Sundae Cupcake Ghost');
  ghostCreature(ctx, 'balloon', 318, 56, 'Sherbet Balloon Ghost');
  ghostCreature(ctx, 'cat', 442, 114, 'Gelato Kitty Ghost');

  ctx.ellipsePath('ring', orbX, orbY, orb.rx, orb.ry, 24, orb.tilt);
  const gallopPath = ctx.wavePath('gallop', 66, 236, 414, 236, 8, 2, 20);
  const sprintPath = ctx.wavePath('sprint', 74, 236, 408, 236, 8, 2, 20);
  const orbitPath = ctx.ellipsePath('orbit', 240, 86, 176, 46, 24);
  ctx.marginPath(256);

  ctx.actor('lumi', 138, 244, { facing: 1, anim: 'rear', pathIndex: gallopPath });
  ctx.actor('nova', 338, 244, { facing: -1, anim: 'leap', pathIndex: sprintPath });
  ctx.actor('moonCat', 240, 242, { facing: 1, anim: 'sleep' });
  ctx.actor('comet', 324, 92, { facing: -1, anim: 'float', pathIndex: orbitPath });

  ctx.heroQuest('cake', 'Sundae Peak', volcanoIds);
  ctx.heroQuest('milkshake', 'Berry Shake', [shakeId, shakeParts.cream, shakeParts.cherry]);
  ctx.heroQuest('lumi', 'Lumi', [5, 6, 7, 8]);
  ctx.heroQuest('nova', 'Nova', [9, 10, 11]);
}

// ============================================================================
// SLOT 4B: The Porcelain Teapot Cloud-House
// ============================================================================
function u03_c4b(ctx: SceneCtx): void {
  initChapter(ctx, 'u03_c4b', 238, 146);
  const { rng } = ctx;

  drawSkySparkles(ctx, 18, 144, 'stars');

  const orbX = Math.round(jit(rng, 384, 5));
  const orbY = Math.round(jit(rng, 56, 3));
  const orb = drawThemedOrb(ctx, orbX, orbY, 21, 'macaronOrb', { tilt: -0.25 });

  ctx.canon(14, 'Cinnamon Steam Cloud', 'cloud');
  ctx.canon(15, 'Tea-Blossom Cloud', 'cloud');
  drawThemedCloud(ctx, 14, Math.round(jit(rng, 98, 5)), Math.round(jit(rng, 52, 3)), 84, 28, 'steamPuff');
  drawThemedCloud(ctx, 15, Math.round(jit(rng, 242, 5)), Math.round(jit(rng, 44, 3)), 78, 26, 'steamPuff');

  drawHorizonHills(ctx, { style: 'clouds', yBase: 168, yBottom: 214, layers: 2 });
  drawGroundDeck(ctx, { style: 'courtyard', yTop: 208, yBottom: 250, labelPrefix: 'Porcelain' });

  // Porcelain Teapot Cloud-House + Giant Teacup neighbor + Lollipop Lantern
  const teapotIds = drawTeapotHouse(ctx, 168, 174, 1.14, { label: 'Porcelain' });
  drawGiantTeacup(ctx, 356, 178, 0.86, { label: 'Cloud' });
  drawLollipopLamp(ctx, 52, 212, 48, 'Tea Garden');
  star(ctx, ctx.dyn('star', 'Cinnamon Star A'), 256, 114, 11, { points: 5, inner: 0.48 });
  twinkle(ctx, ctx.dyn('star', 'Tea-Steam Twinkle'), 286, 90, 10.5);

  // 3 ghosts in open sky
  ghostCreature(ctx, 'cupcake', 176, 56, 'Teatime Cupcake Ghost');
  ghostCreature(ctx, 'moth', 310, 60, 'Cinnamon Moth Ghost');
  ghostCreature(ctx, 'cat', 442, 114, 'Teacup Kitty Ghost');

  ctx.ellipsePath('ring', orbX, orbY, orb.rx, orb.ry, 24, orb.tilt);
  const gallopPath = ctx.wavePath('gallop', 66, 236, 414, 236, 8, 2, 20);
  const orbitPath = ctx.ellipsePath('orbit', 240, 86, 176, 46, 24);
  ctx.marginPath(256);

  ctx.actor('violet', 120, 244, { facing: 1, anim: 'idle' });
  ctx.actor('lumi', 274, 244, { facing: -1, anim: 'idle', pathIndex: gallopPath });
  ctx.actor('moonCat', 420, 240, { facing: -1, anim: 'sleep' });
  ctx.actor('comet', 210, 92, { facing: 1, anim: 'float', pathIndex: orbitPath });

  ctx.heroQuest('teacup', 'Teapot House', teapotIds);
  ctx.heroQuest('violet', 'Violet', [1, 2, 3, 4]);
  ctx.heroQuest('lumi', 'Lumi', [5, 6, 7, 8]);
  ctx.heroQuest('planet', 'Macaron Moon', [12, 13]);
}

// ============================================================================
// SLOT 5 FINALE: The Royal Star-Cake Grand Oven (50..70 regions!)
// ============================================================================
function u03_c5(ctx: SceneCtx): void {
  initChapter(ctx, 'u03_c5', 240, 124);
  const { r, rng } = ctx;

  drawSkySparkles(ctx, 22, 136, 'hearts');

  // 1) Celestial Orb (12/13) (2 regions)
  const orbX = 76 + Math.round(jit(rng, 0, 3));
  const orbY = 56 + Math.round(jit(rng, 0, 2));
  const orb = drawThemedOrb(ctx, orbX, orbY, 19, 'donutPlanet', { tilt: -0.24 });

  // 2) Horizon clouds & grand bakery counter deck (4 regions)
  drawHorizonHills(ctx, { style: 'clouds', yBase: 164, yBottom: 214, layers: 2 });
  drawGroundDeck(ctx, { style: 'counter', yTop: 208, yBottom: 250, labelPrefix: 'Royal Oven' });

  // 3) Grand Centerpiece: 4-Tier Royal Star-Cake Celebration Cathedral (~15 chunky regions!)
  const cakeQuestIds: number[] = [];
  const cx = 240;

  // Radiant sugar-halo rays fanning behind the cake crown (6 chunky rays!)
  for (let i = 0; i < 6; i++) {
    const a = -Math.PI + ((i + 0.5) / 6) * Math.PI;
    const rid = ctx.dyn('star', `Royal Cake Sunbeam ${i + 1}`);
    const x0 = cx + Math.cos(a) * 52;
    const y0 = 122 + Math.sin(a) * 44;
    const x1 = cx + Math.cos(a) * 86;
    const y1 = 122 + Math.sin(a) * 74;
    r.capsule(rid, x0, y0, x1, y1, 7.5);
    r.disc(rid, x1, y1, 8.5);
  }

  // Grand Oven Hearth Pedestal Base
  const hearth = ctx.dyn('prop', 'Grand Oven Pedestal');
  r.rect(hearth, cx - 64, 174, cx + 64, 208);
  r.line(INK, cx - 60, 184, cx + 60, 184, { only: [hearth] });
  const ovenArch = ctx.dyn('star', 'Glowing Hearth Arch');
  r.disc(ovenArch, cx, 192, 16);
  r.rect(ovenArch, cx - 16, 192, cx + 16, 208);

  // Three lush tiered celebration cake layers + frosting drips
  const tier1 = ctx.dyn('milkshake', 'Lower Star-Cake Tier');
  r.rect(tier1, cx - 54, 146, cx + 54, 176);
  for (let ox = -44; ox <= 44; ox += 16) {
    r.disc(tier1, cx + ox, 148, 7);
  }
  r.line(INK, cx - 50, 162, cx + 50, 162, { only: [tier1] });
  cakeQuestIds.push(tier1);

  const tier2 = ctx.dyn('milkshake', 'Middle Star-Cake Tier');
  r.rect(tier2, cx - 40, 118, cx + 40, 148);
  for (let ox = -30; ox <= 30; ox += 15) {
    r.disc(tier2, cx + ox, 120, 6.5);
  }
  r.line(INK, cx - 36, 134, cx + 36, 134, { only: [tier2] });
  cakeQuestIds.push(tier2);

  const tier3 = ctx.dyn('milkshake', 'Crown Star-Cake Tier');
  r.rect(tier3, cx - 26, 92, cx + 26, 120);
  r.ellipse(tier3, cx, 92, 28, 7);
  cakeQuestIds.push(tier3);

  // Three towering birthday star-candles & flames atop the cake (3 chunky regions!)
  for (const [idx, ox, ch] of [[1, -16, 22], [2, 0, 28], [3, 16, 22]] as const) {
    const cid = ctx.dyn('star', `Star-Cake Candle ${idx}`);
    r.rect(cid, cx + ox - 4, 90 - ch, cx + ox + 4, 92);
    r.ellipse(cid, cx + ox, 84 - ch, 6, 8.5);
    if (idx === 2) cakeQuestIds.push(cid);
  }

  // Grand Top Star Finial
  const crownStar = ctx.dyn('star', 'Royal Cake Crown Star');
  star(ctx, crownStar, cx, 32, 13, { points: 5, inner: 0.48 });
  cakeQuestIds.push(crownStar);

  // 4) Flanking Bakery Landmarks + Foreground Framing Clouds 14/15 (12 regions!)
  drawMacaronTower(ctx, 112, 168, 0.84, { label: 'Royal West' });
  drawCupcakeHouse(ctx, 368, 168, 0.84, { label: 'Royal East', flip: -1 });
  drawLollipopLamp(ctx, 38, 184, 40, 'West Jubilee');
  drawLollipopLamp(ctx, 442, 184, 40, 'East Jubilee');
  ctx.canon(14, 'Royal Frosting Cloud', 'cloud');
  ctx.canon(15, 'Sprinkle Jubilee Cloud', 'cloud');
  drawThemedCloud(ctx, 14, 52, 224, 82, 26, 'cottonCandy');
  drawThemedCloud(ctx, 15, 428, 224, 82, 26, 'cottonCandy');

  // 5) Celebration Sky Ornaments (8 regions!)
  heart(ctx, ctx.dyn('star', 'West Jubilee Heart'), 146, 56, 10.5);
  heart(ctx, ctx.dyn('star', 'East Jubilee Heart'), 334, 56, 10.5);
  star(ctx, ctx.dyn('star', 'East Bakery Star'), 404, 56, 13, { points: 5, inner: 0.48 });
  pearl(ctx, ctx.dyn('star', 'Sprinkle Pearl West'), 112, 92, 9);
  pearl(ctx, ctx.dyn('star', 'Sprinkle Pearl East'), 368, 92, 9);
  twinkle(ctx, ctx.dyn('star', 'West Rim Twinkle'), 34, 102, 11);
  twinkle(ctx, ctx.dyn('star', 'East Rim Twinkle'), 446, 102, 11);
  star(ctx, ctx.dyn('star', 'West Crown Star'), 176, 36, 9.5, { points: 5, inner: 0.48 });

  // 6) 3 Ghosts in clean open upper sky pockets
  ghostCreature(ctx, 'cupcake', 298, 32, 'Royal Cupcake Ghost');
  ghostCreature(ctx, 'balloon', 446, 54, 'Jubilee Balloon Ghost');
  ghostCreature(ctx, 'cat', 32, 34, 'Bakery Star-Cat Ghost');

  // 7) Paths
  ctx.ellipsePath('ring', orbX, orbY, orb.rx, orb.ry, 24, orb.tilt);
  const gallopPath = ctx.wavePath('gallop', 62, 238, 418, 238, 8, 2, 20);
  const sprintPath = ctx.wavePath('sprint', 78, 236, 402, 236, 8, 2, 20);
  const orbitPath = ctx.ellipsePath('orbit', 240, 88, 184, 52, 28);
  ctx.marginPath(256);

  // 8) Full Hero Cast + Bakery Companions (14 regions!)
  ctx.actor('lumi', 140, 246, { facing: 1, anim: 'rear', pathIndex: gallopPath });
  ctx.actor('violet', 240, 248, { facing: 1, anim: 'idle' });
  ctx.actor('nova', 340, 246, { facing: -1, anim: 'leap', pathIndex: sprintPath });
  ctx.actor('moonCat', 428, 242, { facing: -1, anim: 'peek' });
  ctx.actor('comet', 402, 102, { facing: -1, anim: 'float', pathIndex: orbitPath });

  void hearth;
  void ovenArch;
  ctx.heroQuest('cake', 'Royal Cake', cakeQuestIds);
  ctx.heroQuest('violet', 'Violet', [1, 2, 3, 4]);
  ctx.heroQuest('lumi', 'Lumi', [5, 6, 7, 8]);
  ctx.heroQuest('nova', 'Nova', [9, 10, 11]);
}

export const U03_SCENES = {
  hub_sugarCloudBakery,
  u03_c1,
  u03_c2a,
  u03_c2b,
  u03_c3a,
  u03_c3b,
  u03_c4a,
  u03_c4b,
  u03_c5,
} satisfies Partial<Record<SceneId, (ctx: SceneCtx) => void>>;

void rot;
