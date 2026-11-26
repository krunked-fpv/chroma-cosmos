/**
 * Universe 5: Origami Lantern Harbor (9 bespoke procedural scenes: 1 Hub Sanctuary + 8 Chapters).
 * Pure & deterministic (ctx.rng only), strict >= 60px region hygiene, clean bottom margin (y <= 252).
 */
import { MaterialId } from '../../contracts/materials';
import type { SceneId } from '../../contracts/roguelike';
import { UNIVERSE_BY_ID } from '../../contracts/universes';
import type { SceneCtx } from '../context';
import {
  drawGroundDeck,
  drawHorizonHills,
  drawKiteDragon,
  drawMapleWindmill,
  drawOrigamiCrane,
  drawPagodaTower,
  drawPaperBoat,
  drawPaperLantern,
  drawSanctuaryRoom,
  drawSkySparkles,
  drawThemedCloud,
  drawThemedOrb,
  ghostCreature,
} from '../kit';
import { crescent, inkArc, jit, pearl, rot, star, twinkle } from '../props';
import { INK, W, type Pt } from '../raster';

const UNI = UNIVERSE_BY_ID.origamiSkyHarbor;
const CH = Object.fromEntries(UNI.chapters.map((c) => [c.id, c]));

function initChapter(ctx: SceneCtx, id: string, fx = 240, fy = 138): void {
  const ch = CH[id];
  ctx.title = ch ? ch.title : id;
  ctx.sky = UNI.sky;
  ctx.universeId = UNI.id;
  ctx.ambient = UNI.ambient;
  ctx.focal = { x: fx, y: fy };
}

/** Crisp geometric origami wind-spire obelisk with folded ribbon sails (3 chunky regions). */
function drawOrigamiSpire(ctx: SceneCtx, x: number, y: number, label: string): number[] {
  const { r } = ctx;
  const base = ctx.dyn('prop', `${label} Folded Pedestal`);
  const spire = ctx.dyn('prop', `${label} Origami Spire`);
  const crest = ctx.dyn('star', `${label} Wind Crest`);
  r.poly(base, [[x - 28, y + 18], [x + 28, y + 18], [x + 36, y + 36], [x - 36, y + 36]]);
  r.line(INK, x, y + 19, x, y + 35, { only: [base] });
  r.poly(spire, [[x, y - 44], [x + 22, y + 18], [x - 22, y + 18]]);
  r.line(INK, x, y - 40, x, y + 16, { only: [spire] });
  r.line(INK, x - 14, y - 4, x + 14, y - 4, { only: [spire] });
  // Folded diamond star finial
  r.poly(crest, [[x, y - 58], [x + 12, y - 44], [x, y - 32], [x - 12, y - 44]]);
  r.line(INK, x - 8, y - 44, x + 8, y - 44, { only: [crest] });
  return [base, spire, crest];
}

/** Giant 4-blade foil origami pinwheel tower (3 chunky regions). */
function drawPinwheelTower(ctx: SceneCtx, x: number, y: number, label: string): number[] {
  const { r } = ctx;
  const post = ctx.dyn('prop', `${label} Breakwater Post`);
  const blades = ctx.dyn('star', `${label} Foil Blades`);
  const hub = ctx.dyn('prop', `${label} Pinwheel Hub`);
  r.poly(post, [[x - 10, y - 4], [x + 10, y - 4], [x + 18, y + 40], [x - 18, y + 40]]);
  r.line(INK, x, y, x, y + 38, { only: [post] });
  const cy = y - 10;
  for (let i = 0; i < 4; i++) {
    const a = (i * Math.PI) / 2 + 0.28;
    const sail = rot(
      [
        [x, cy],
        [x + 34, cy - 16],
        [x + 38, cy + 4],
        [x + 12, cy + 10],
      ],
      x,
      cy,
      a,
    );
    r.poly(blades, sail);
    const tip = rot([[x + 30, cy - 12]], x, cy, a)[0] as Pt;
    r.line(INK, x, cy, tip[0], tip[1], { only: [blades] });
  }
  r.disc(hub, x, cy, 10.5);
  inkArc(r, x, cy, 5.5, 5.5, 0, Math.PI * 2, 0, { only: [hub] });
  return [post, blades, hub];
}

/** Crisp folded origami paper swan floating gracefully on a starlight canal (3 chunky regions). */
function drawOrigamiSwan(ctx: SceneCtx, x: number, y: number, label: string): number[] {
  const { r } = ctx;
  const backWing = ctx.dyn('prop', `${label} Back Fold`);
  const body = ctx.dyn('prop', `${label} Folded Body`);
  const neck = ctx.dyn('star', `${label} Swan Crown`);
  r.poly(backWing, [[x - 8, y + 4], [x - 34, y - 26], [x + 8, y - 4]]);
  r.poly(body, [[x - 36, y + 2], [x + 30, y + 2], [x + 18, y + 24], [x - 24, y + 24]]);
  r.line(INK, x - 22, y + 6, x + 16, y + 20, { only: [body] });
  r.poly(neck, [[x + 14, y + 6], [x + 32, y - 30], [x + 44, y - 22], [x + 32, y - 16], [x + 28, y + 10]]);
  r.line(INK, x + 22, y + 2, x + 32, y - 24, { only: [neck] });
  return [backWing, body, neck];
}

/** Grand pleated golden washi-fan sky pavilion arch (4 chunky regions). */
function drawWashiFanPavilion(ctx: SceneCtx, x: number, y: number, label: string): number[] {
  const { r } = ctx;
  const fanL = ctx.dyn('star', `${label} West Fan Pleats`);
  const fanMid = ctx.dyn('star', `${label} Center Fan Crown`);
  const fanR = ctx.dyn('star', `${label} East Fan Pleats`);
  const plinth = ctx.dyn('prop', `${label} Pavilion Arch Base`);

  // Left fan wing
  r.poly(fanL, [[x - 10, y + 6], [x - 66, y - 16], [x - 54, y - 42], [x - 16, y - 22]]);
  r.line(INK, x - 14, y, x - 58, y - 28, { only: [fanL] });
  // Center crown fan sector
  r.poly(fanMid, [[x - 16, y + 2], [x - 24, y - 46], [x, y - 54], [x + 24, y - 46], [x + 16, y + 2]]);
  r.line(INK, x, y - 50, x, y, { only: [fanMid] });
  // Right fan wing
  r.poly(fanR, [[x + 10, y + 6], [x + 16, y - 22], [x + 54, y - 42], [x + 66, y - 16]]);
  r.line(INK, x + 14, y, x + 58, y - 28, { only: [fanR] });
  // Pavilion arch terrace base
  r.rect(plinth, x - 52, y + 4, x + 52, y + 32);
  r.line(INK, x - 48, y + 14, x + 48, y + 14, { only: [plinth] });
  r.line(INK, x - 20, y + 14, x - 20, y + 30, { only: [plinth] });
  r.line(INK, x + 20, y + 14, x + 20, y + 30, { only: [plinth] });
  return [fanL, fanMid, fanR, plinth];
}

// ============================================================================
// HUB SANCTUARY: Violet's Paper-Craft Sky Loft
// ============================================================================
function hub_origamiSkyHarbor(ctx: SceneCtx): void {
  ctx.universeId = UNI.id;
  ctx.ambient = UNI.ambient;
  const showcaseIds: number[] = [];

  drawSanctuaryRoom(ctx, {
    title: UNI.hubTitle,
    sky: UNI.sky,
    windowShape: 'shoji',
    windowOrbStyle: 'lanternMoon',
    wallStyle: 'bamboo',
    floorStyle: 'tatami',
    rugShape: 'diamond',
    lampStyle: 'lantern',
    garlandStyle: 'lanterns',
    sparkleStyle: 'petals',
    violetPos: { x: 204, y: 238, facing: 1 },
    workbenchLabel: 'Origami Folding Desk',
    shelfLabel: 'Washi Paper Shelf',
    seatingLabel: 'Tatami Cloud Futon',
    trinketLabels: ['Washi Folios', 'Crane Boxes', 'Harbor Maps'],
    palette: {
      wallPanel: MaterialId.AuroraSherbet,
      floor: MaterialId.SolarFlare24K,
      windowFrame: MaterialId.RoyalAstralGold,
      windowGlass: MaterialId.VelvetNebula,
      curtain: MaterialId.StrawberrySupernova,
      orbCore: MaterialId.SolarFlare24K,
      orbRing: MaterialId.OpalPearl,
      rugOuter: MaterialId.StrawberrySupernova,
      rugInner: MaterialId.SolarFlare24K,
      furniture: MaterialId.RoyalAstralGold,
      furnitureTrim: MaterialId.AuroraSherbet,
      accentA: MaterialId.StrawberrySupernova,
      accentB: MaterialId.SolarFlare24K,
      accentC: MaterialId.HoloFoil,
    },
    drawWindowView: (c, wx) => {
      const boat = c.dyn('prop', 'Window Harbor Boat');
      c.r.poly(boat, [[wx - 24, 126], [wx + 24, 126], [wx + 16, 136], [wx - 16, 136]]);
      c.r.poly(boat, [[wx, 112], [wx + 12, 126], [wx - 12, 126]]);
      c.preColor(boat, MaterialId.OpalPearl);
    },
    drawExtraProps: (c) => {
      const { r } = c;
      // 1) Left wall pleated golden washi fan ornament (2 regions)
      const fanBody = c.dyn('star', 'Wall Washi Fan');
      r.poly(fanBody, [[84, 114], [58, 86], [70, 74], [84, 70], [98, 74], [110, 86]]);
      r.line(INK, 84, 110, 70, 76, { only: [fanBody] });
      r.line(INK, 84, 110, 84, 72, { only: [fanBody] });
      r.line(INK, 84, 110, 98, 76, { only: [fanBody] });
      c.preColor(fanBody, MaterialId.SolarFlare24K);

      const fanPivot = c.dyn('prop', 'Washi Fan Handle');
      r.disc(fanPivot, 84, 114, 9);
      c.preColor(fanPivot, MaterialId.StrawberrySupernova);

      // 2) Floor standing Origami Crane Mobile Pedestal beside Violet (3 regions)
      const stand = c.dyn('prop', 'Crane Mobile Stand');
      r.rect(stand, 265, 178, 273, 222);
      r.ellipse(stand, 269, 222, 16, 5);
      c.preColor(stand, MaterialId.RoyalAstralGold);

      const craneWing = c.dyn('star', 'Display Origami Crane');
      r.poly(craneWing, [[248, 174], [269, 152], [290, 174], [269, 186]]);
      r.line(INK, 269, 154, 269, 184, { only: [craneWing] });
      c.preColor(craneWing, MaterialId.HoloFoil);

      const craneTail = c.dyn('prop', 'Crane Display Tassel');
      r.poly(craneTail, [[262, 188], [276, 188], [280, 206], [258, 206]]);
      c.preColor(craneTail, MaterialId.StrawberrySupernova);
      showcaseIds.push(stand, craneWing, craneTail);

      // 3) Desk-right Folded Paper Skiff & Upper-Right Harbor Scroll (2 regions)
      const deskBoat = c.dyn('prop', 'Desk Paper Skiff');
      r.poly(deskBoat, [[358, 172], [392, 172], [386, 180], [364, 180]]);
      r.poly(deskBoat, [[375, 154], [385, 172], [365, 172]]);
      c.preColor(deskBoat, MaterialId.OpalPearl);

      const wallScroll = c.dyn('prop', 'Harbor Kite Scroll');
      r.rect(wallScroll, 336, 72, 370, 118);
      r.line(INK, 342, 86, 364, 86, { only: [wallScroll] });
      r.line(INK, 342, 102, 364, 102, { only: [wallScroll] });
      c.preColor(wallScroll, MaterialId.CosmicCottonSwirl);

      return [fanBody, fanPivot, stand, craneWing, craneTail, deskBoat, wallScroll];
    },
  });

  ctx.heroQuest('violet', 'Violet', [1, 2, 3, 4]);
  ctx.heroQuest('planet', 'Lantern Moon', [12, 13]);
  ctx.heroQuest('crane', 'Paper Crane', showcaseIds);
}

// ============================================================================
// SLOT 1: The Folded-Paper Cloud Dock
// ============================================================================
function u05_c1(ctx: SceneCtx): void {
  initChapter(ctx, 'u05_c1', 240, 146);
  const { rng } = ctx;

  drawSkySparkles(ctx, 18, 144, 'petals');

  const orbX = Math.round(jit(rng, 382, 5));
  const orbY = Math.round(jit(rng, 56, 3));
  const orb = drawThemedOrb(ctx, orbX, orbY, 21, 'lanternMoon', { tilt: -0.24 });

  ctx.canon(14, 'Folded Cloud Alpha', 'cloud');
  ctx.canon(15, 'Origami Breeze Cloud', 'cloud');
  drawThemedCloud(ctx, 14, Math.round(jit(rng, 98, 5)), Math.round(jit(rng, 52, 3)), 84, 28, 'origami');
  drawThemedCloud(ctx, 15, Math.round(jit(rng, 242, 5)), Math.round(jit(rng, 44, 3)), 76, 26, 'origami');

  drawHorizonHills(ctx, { style: 'clouds', yBase: 168, yBottom: 214, layers: 2 });
  drawGroundDeck(ctx, { style: 'pier', yTop: 208, yBottom: 250, labelPrefix: 'Cloud Dock' });

  // Moored Folded Paper Skiff + Harbor Paper Lantern + Origami Wind Spire
  const boatIds = drawPaperBoat(ctx, 276, 178, 1.12, { label: 'Harbor' });
  const lanternIds = drawPaperLantern(ctx, 84, 166, 0.92, { label: 'Dock' });
  drawOrigamiSpire(ctx, 412, 174, 'Beacon');
  star(ctx, ctx.dyn('star', 'Harbor Folded Star'), 176, 108, 11, { points: 4, inner: 0.46 });

  // 3 ghosts in open sky
  ghostCreature(ctx, 'crane', 176, 56, 'Harbor Crane Ghost');
  ghostCreature(ctx, 'dragon', 308, 58, 'Cloud Dragon Ghost');
  ghostCreature(ctx, 'koi', 442, 114, 'Origami Koi Ghost');

  ctx.ellipsePath('ring', orbX, orbY, orb.rx, orb.ry, 24, orb.tilt);
  const gallopPath = ctx.wavePath('gallop', 66, 236, 414, 236, 8, 2, 20);
  const orbitPath = ctx.ellipsePath('orbit', 240, 86, 176, 46, 24);
  ctx.marginPath(256);

  ctx.actor('violet', 140, 244, { facing: 1, anim: 'idle' });
  ctx.actor('lumi', 310, 244, { facing: -1, anim: 'idle', pathIndex: gallopPath });
  ctx.actor('moonCat', 426, 240, { facing: -1, anim: 'sleep' });
  ctx.actor('comet', 228, 92, { facing: 1, anim: 'float', pathIndex: orbitPath });

  ctx.heroQuest('crane', 'Paper Skiff', boatIds);
  ctx.heroQuest('lantern', 'Dock Lantern', lanternIds);
  ctx.heroQuest('violet', 'Violet', [1, 2, 3, 4]);
  ctx.heroQuest('lumi', 'Lumi', [5, 6, 7, 8]);
}

// ============================================================================
// SLOT 2A: The Thousand-Crane Wind Spire
// ============================================================================
function u05_c2a(ctx: SceneCtx): void {
  initChapter(ctx, 'u05_c2a', 240, 140);
  const { rng } = ctx;

  drawSkySparkles(ctx, 18, 144, 'petals');

  const orbX = Math.round(jit(rng, 98, 5));
  const orbY = Math.round(jit(rng, 58, 3));
  const orb = drawThemedOrb(ctx, orbX, orbY, 21, 'lanternMoon', { tilt: -0.24 });

  ctx.canon(14, 'Crane-Wing Cloud', 'cloud');
  ctx.canon(15, 'Ribbon Drift Cloud', 'cloud');
  drawThemedCloud(ctx, 14, Math.round(jit(rng, 244, 5)), Math.round(jit(rng, 44, 3)), 82, 28, 'origami');
  drawThemedCloud(ctx, 15, Math.round(jit(rng, 392, 5)), Math.round(jit(rng, 54, 3)), 78, 28, 'origami');

  drawHorizonHills(ctx, { style: 'clouds', yBase: 168, yBottom: 214, layers: 2 });
  drawGroundDeck(ctx, { style: 'courtyard', yTop: 208, yBottom: 250, labelPrefix: 'Wind Spire' });

  // Soaring Origami Cranes spiraling around the central Origami Wind Spire!
  const craneL = drawOrigamiCrane(ctx, 134, 138, 1.05, { label: 'Soaring West' });
  const craneR = drawOrigamiCrane(ctx, 366, 134, 0.88, { label: 'Soaring East', flip: -1 });
  drawOrigamiSpire(ctx, 250, 174, 'Thousand-Crane');
  twinkle(ctx, ctx.dyn('star', 'Spire Wind Star'), 194, 96, 11);
  twinkle(ctx, ctx.dyn('star', 'Ribbon Wind Star'), 312, 96, 11);

  // 3 ghosts in open sky
  ghostCreature(ctx, 'crane', 176, 56, 'Spiral Crane Ghost');
  ghostCreature(ctx, 'butterfly', 318, 56, 'Washi Butterfly Ghost');
  ghostCreature(ctx, 'dragon', 442, 114, 'Wind Dragon Ghost');

  ctx.ellipsePath('ring', orbX, orbY, orb.rx, orb.ry, 24, orb.tilt);
  const sprintPath = ctx.wavePath('sprint', 66, 236, 414, 236, 8, 2, 20);
  const orbitPath = ctx.ellipsePath('orbit', 240, 86, 178, 46, 24);
  ctx.marginPath(256);

  ctx.actor('violet', 142, 244, { facing: 1, anim: 'idle' });
  ctx.actor('nova', 326, 244, { facing: -1, anim: 'leap', pathIndex: sprintPath });
  ctx.actor('moonCat', 240, 242, { facing: 1, anim: 'peek' });
  ctx.actor('comet', 250, 84, { facing: 1, anim: 'float', pathIndex: orbitPath });

  ctx.heroQuest('crane', 'Sky Cranes', [...craneL, ...craneR]);
  ctx.heroQuest('violet', 'Violet', [1, 2, 3, 4]);
  ctx.heroQuest('nova', 'Nova', [9, 10, 11]);
  ctx.heroQuest('cloud', 'Fold Clouds', [14, 15]);
}

// ============================================================================
// SLOT 2B: The Pinwheel Windmill Breakwater
// ============================================================================
function u05_c2b(ctx: SceneCtx): void {
  initChapter(ctx, 'u05_c2b', 240, 144);
  const { rng } = ctx;

  drawSkySparkles(ctx, 18, 144, 'petals');

  const orbX = Math.round(jit(rng, 98, 5));
  const orbY = Math.round(jit(rng, 58, 3));
  const orb = drawThemedOrb(ctx, orbX, orbY, 21, 'lanternMoon', { tilt: -0.24 });

  ctx.canon(14, 'Breakwater Cloud', 'cloud');
  ctx.canon(15, 'Foil Breeze Cloud', 'cloud');
  drawThemedCloud(ctx, 14, Math.round(jit(rng, 240, 5)), Math.round(jit(rng, 44, 3)), 82, 28, 'origami');
  drawThemedCloud(ctx, 15, Math.round(jit(rng, 392, 5)), Math.round(jit(rng, 54, 3)), 78, 28, 'origami');

  drawHorizonHills(ctx, { style: 'waves', yBase: 168, yBottom: 214, layers: 2 });
  drawGroundDeck(ctx, { style: 'pier', yTop: 208, yBottom: 250, labelPrefix: 'Breakwater' });

  // Giant 4-Blade Foil Pinwheel Tower + Paper Windmill + Paper Boat along breakwater
  const pinwheelIds = drawPinwheelTower(ctx, 166, 170, 'Foil');
  drawMapleWindmill(ctx, 358, 170, 0.96, { label: 'Origami' });
  drawPaperBoat(ctx, 64, 186, 0.72, { label: 'Breakwater' });
  star(ctx, ctx.dyn('star', 'Pinwheel Wind Star'), 264, 114, 11, { points: 4, inner: 0.46 });

  // 3 ghosts in open sky
  ghostCreature(ctx, 'crane', 176, 56, 'Breeze Crane Ghost');
  ghostCreature(ctx, 'balloon', 318, 56, 'Foil Balloon Ghost');
  ghostCreature(ctx, 'koi', 442, 114, 'Breakwater Koi Ghost');

  ctx.ellipsePath('ring', orbX, orbY, orb.rx, orb.ry, 24, orb.tilt);
  const gallopPath = ctx.wavePath('gallop', 66, 236, 414, 236, 8, 2, 20);
  const sprintPath = ctx.wavePath('sprint', 74, 236, 408, 236, 8, 2, 20);
  const orbitPath = ctx.ellipsePath('orbit', 240, 86, 178, 46, 24);
  ctx.marginPath(256);

  ctx.actor('lumi', 138, 244, { facing: 1, anim: 'rear', pathIndex: gallopPath });
  ctx.actor('nova', 350, 244, { facing: -1, anim: 'leap', pathIndex: sprintPath });
  ctx.actor('cometCar', 248, 242, { facing: 1, anim: 'run', pathIndex: sprintPath });
  ctx.actor('comet', 268, 86, { facing: 1, anim: 'float', pathIndex: orbitPath });

  ctx.heroQuest('crane', 'Pinwheel Mill', pinwheelIds);
  ctx.heroQuest('lumi', 'Lumi', [5, 6, 7, 8]);
  ctx.heroQuest('nova', 'Nova', [9, 10, 11]);
  ctx.heroQuest('planet', 'Lantern Moon', [12, 13]);
}

// ============================================================================
// SLOT 3A: The Floating Pagoda Pier
// ============================================================================
function u05_c3a(ctx: SceneCtx): void {
  initChapter(ctx, 'u05_c3a', 240, 144);
  const { rng } = ctx;

  drawSkySparkles(ctx, 18, 144, 'petals');

  const orbX = Math.round(jit(rng, 382, 5));
  const orbY = Math.round(jit(rng, 56, 3));
  const orb = drawThemedOrb(ctx, orbX, orbY, 21, 'lanternMoon', { tilt: -0.25 });

  ctx.canon(14, 'Pagoda Cloud', 'cloud');
  ctx.canon(15, 'Mirror-Pool Cloud', 'cloud');
  drawThemedCloud(ctx, 14, Math.round(jit(rng, 96, 5)), Math.round(jit(rng, 52, 3)), 82, 28, 'origami');
  drawThemedCloud(ctx, 15, Math.round(jit(rng, 240, 5)), Math.round(jit(rng, 44, 3)), 76, 26, 'origami');

  drawHorizonHills(ctx, { style: 'clouds', yBase: 164, yBottom: 214, layers: 2 });
  drawGroundDeck(ctx, { style: 'pier', yTop: 208, yBottom: 250, labelPrefix: 'Pagoda' });

  // Centerpiece Floating Pagoda Tower + Paper Lantern left + Paper Boat right
  const pagodaIds = drawPagodaTower(ctx, 240, 170, 1.15, { label: 'Floating' });
  drawPaperLantern(ctx, 84, 166, 0.9, { label: 'Pier West' });
  const boatIds = drawPaperBoat(ctx, 392, 182, 0.88, { label: 'Pagoda' });
  pearl(ctx, ctx.dyn('star', 'Pagoda Chime Orb'), 166, 112, 9.5);

  // 3 ghosts in open sky
  ghostCreature(ctx, 'crane', 174, 56, 'Pagoda Crane Ghost');
  ghostCreature(ctx, 'dragon', 310, 58, 'Eave Dragon Ghost');
  ghostCreature(ctx, 'owl', 442, 114, 'Pier Owl Ghost');

  ctx.ellipsePath('ring', orbX, orbY, orb.rx, orb.ry, 24, orb.tilt);
  const gallopPath = ctx.wavePath('gallop', 66, 236, 414, 236, 8, 2, 20);
  const swimPath = ctx.wavePath('swim', 62, 114, 418, 110, 16, 1.5, 22);
  ctx.ellipsePath('orbit', 240, 86, 176, 46, 24);
  ctx.marginPath(256);

  ctx.actor('violet', 142, 244, { facing: 1, anim: 'idle' });
  ctx.actor('lumi', 318, 244, { facing: -1, anim: 'idle', pathIndex: gallopPath });
  ctx.actor('whale', 328, 118, { facing: -1, anim: 'swim', pathIndex: swimPath });
  ctx.actor('moonCat', 238, 242, { facing: 1, anim: 'sleep' });

  ctx.heroQuest('lantern', 'Sky Pagoda', pagodaIds);
  ctx.heroQuest('crane', 'Paper Boat', boatIds);
  ctx.heroQuest('violet', 'Violet', [1, 2, 3, 4]);
  ctx.heroQuest('lumi', 'Lumi', [5, 6, 7, 8]);
}

// ============================================================================
// SLOT 3B: The Silk-Dragon Kite Promenade
// ============================================================================
function u05_c3b(ctx: SceneCtx): void {
  initChapter(ctx, 'u05_c3b', 240, 134);
  const { rng } = ctx;

  drawSkySparkles(ctx, 18, 144, 'petals');

  const orbX = Math.round(jit(rng, 94, 5));
  const orbY = Math.round(jit(rng, 56, 3));
  const orb = drawThemedOrb(ctx, orbX, orbY, 20, 'lanternMoon', { tilt: -0.24 });

  ctx.canon(14, 'Sunset Kite Cloud', 'cloud');
  ctx.canon(15, 'Silk Mist Cloud', 'cloud');
  drawThemedCloud(ctx, 14, Math.round(jit(rng, 238, 5)), Math.round(jit(rng, 42, 3)), 80, 26, 'origami');
  drawThemedCloud(ctx, 15, Math.round(jit(rng, 392, 5)), Math.round(jit(rng, 52, 3)), 76, 26, 'origami');

  drawHorizonHills(ctx, { style: 'clouds', yBase: 168, yBottom: 214, layers: 2 });
  drawGroundDeck(ctx, { style: 'courtyard', yTop: 208, yBottom: 250, labelPrefix: 'Kite Promenade' });

  // Grand soaring Silk-Dragon Kite sweeping across the center sky + Crane Kite left + Lantern Booth right
  const dragonIds = drawKiteDragon(ctx, 256, 132, 1.12, { label: 'Silk-Dragon' });
  const craneIds = drawOrigamiCrane(ctx, 98, 142, 0.88, { label: 'Promenade' });
  drawPaperLantern(ctx, 410, 168, 0.92, { label: 'Promenade' });
  star(ctx, ctx.dyn('star', 'Kite Ribbon Star'), 180, 168, 10.5, { points: 4, inner: 0.46 });

  // 3 ghosts in open sky
  ghostCreature(ctx, 'dragon', 172, 56, 'Silk Dragon Ghost');
  ghostCreature(ctx, 'crane', 316, 56, 'Sunset Crane Ghost');
  ghostCreature(ctx, 'moth', 442, 108, 'Mist Moth Ghost');

  ctx.ellipsePath('ring', orbX, orbY, orb.rx, orb.ry, 24, orb.tilt);
  const sprintPath = ctx.wavePath('sprint', 66, 236, 414, 236, 8, 2, 20);
  const orbitPath = ctx.ellipsePath('orbit', 240, 86, 178, 46, 24);
  ctx.marginPath(256);

  ctx.actor('violet', 124, 244, { facing: 1, anim: 'idle' });
  ctx.actor('nova', 246, 244, { facing: 1, anim: 'leap', pathIndex: sprintPath });
  ctx.actor('gazelle', 362, 244, { facing: -1, anim: 'idle', pathIndex: sprintPath });
  ctx.actor('comet', 332, 96, { facing: -1, anim: 'float', pathIndex: orbitPath });

  ctx.heroQuest('dragon', 'Dragon Kite', dragonIds);
  ctx.heroQuest('crane', 'Crane Kite', craneIds);
  ctx.heroQuest('violet', 'Violet', [1, 2, 3, 4]);
  ctx.heroQuest('nova', 'Nova', [9, 10, 11]);
}

// ============================================================================
// SLOT 4A: The Paper-Boat Starlight Canal
// ============================================================================
function u05_c4a(ctx: SceneCtx): void {
  initChapter(ctx, 'u05_c4a', 240, 148);
  const { r, rng } = ctx;

  drawSkySparkles(ctx, 18, 144, 'stars');

  const orbX = Math.round(jit(rng, 384, 5));
  const orbY = Math.round(jit(rng, 56, 3));
  const orb = drawThemedOrb(ctx, orbX, orbY, 21, 'lanternMoon', { tilt: -0.25 });

  ctx.canon(14, 'Canal Mist Cloud', 'cloud');
  ctx.canon(15, 'Swan-Song Cloud', 'cloud');
  drawThemedCloud(ctx, 14, Math.round(jit(rng, 96, 5)), Math.round(jit(rng, 52, 3)), 82, 28, 'origami');
  drawThemedCloud(ctx, 15, Math.round(jit(rng, 242, 5)), Math.round(jit(rng, 44, 3)), 76, 26, 'origami');

  drawHorizonHills(ctx, { style: 'castle', yBase: 158, yBottom: 210, layers: 2 });

  // Starlight canal water terrace + stone embankment
  const canal = ctx.dyn('prop', 'Starlight Harbor Canal');
  r.rect(canal, 0, 202, W, 249);
  for (const wy of [214, 228, 240]) {
    r.line(INK, 10, wy, W - 10, wy, { only: [canal] });
  }

  // Folded Paper Boat left + Folded Origami Swan right + Hanging Canal Lantern center
  drawPaperBoat(ctx, 116, 182, 0.96, { label: 'Canal' });
  const swanIds = drawOrigamiSwan(ctx, 356, 182, 'Origami Swan');
  const lanternIds = drawPaperLantern(ctx, 240, 154, 0.96, { label: 'Canal Arch' });

  // Floating folded paper water lilies
  for (const [lx, lbl] of [[68, 'West Paper Lily'], [240, 'Center Paper Lily'], [412, 'East Paper Lily']] as const) {
    const lid = ctx.dyn('flora', lbl);
    r.poly(lid, [[lx - 20, 232], [lx - 10, 220], [lx, 228], [lx + 10, 220], [lx + 20, 232], [lx, 240]]);
  }

  // 3 ghosts in open sky
  ghostCreature(ctx, 'crane', 174, 56, 'Canal Crane Ghost');
  ghostCreature(ctx, 'koi', 310, 58, 'Starlight Koi Ghost');
  ghostCreature(ctx, 'dragon', 442, 114, 'Canal Dragon Ghost');

  ctx.ellipsePath('ring', orbX, orbY, orb.rx, orb.ry, 24, orb.tilt);
  const gallopPath = ctx.wavePath('gallop', 66, 234, 414, 234, 8, 2, 20);
  const orbitPath = ctx.ellipsePath('orbit', 240, 86, 176, 46, 24);
  ctx.marginPath(256);

  ctx.actor('violet', 142, 238, { facing: 1, anim: 'idle' });
  ctx.actor('lumi', 306, 238, { facing: -1, anim: 'idle', pathIndex: gallopPath });
  ctx.actor('moonCat', 238, 238, { facing: 1, anim: 'sleep' });
  ctx.actor('comet', 180, 94, { facing: 1, anim: 'float', pathIndex: orbitPath });

  ctx.heroQuest('crane', 'Paper Swan', swanIds);
  ctx.heroQuest('lantern', 'Canal Lantern', lanternIds);
  ctx.heroQuest('violet', 'Violet', [1, 2, 3, 4]);
  ctx.heroQuest('lumi', 'Lumi', [5, 6, 7, 8]);
}

// ============================================================================
// SLOT 4B: The Washi-Fan Sky Pavilion
// ============================================================================
function u05_c4b(ctx: SceneCtx): void {
  initChapter(ctx, 'u05_c4b', 240, 144);
  const { rng } = ctx;

  drawSkySparkles(ctx, 18, 144, 'petals');

  const orbX = Math.round(jit(rng, 98, 5));
  const orbY = Math.round(jit(rng, 56, 3));
  const orb = drawThemedOrb(ctx, orbX, orbY, 21, 'lanternMoon', { tilt: -0.24 });

  ctx.canon(14, 'Blossom Fan Cloud', 'cloud');
  ctx.canon(15, 'Washi Scroll Cloud', 'cloud');
  drawThemedCloud(ctx, 14, Math.round(jit(rng, 244, 5)), Math.round(jit(rng, 44, 3)), 82, 28, 'sakura');
  drawThemedCloud(ctx, 15, Math.round(jit(rng, 392, 5)), Math.round(jit(rng, 54, 3)), 78, 28, 'sakura');

  drawHorizonHills(ctx, { style: 'clouds', yBase: 164, yBottom: 214, layers: 2 });
  drawGroundDeck(ctx, { style: 'tatami', yTop: 208, yBottom: 250, labelPrefix: 'Sky Pavilion' });

  // Grand Pleated Washi-Fan Archway Pavilion centerpiece + Crane left + Paper Lantern right
  const fanIds = drawWashiFanPavilion(ctx, 240, 174, 'Washi');
  drawOrigamiCrane(ctx, 84, 152, 0.88, { label: 'Pavilion' });
  const lanternIds = drawPaperLantern(ctx, 396, 166, 0.94, { label: 'Pavilion' });
  twinkle(ctx, ctx.dyn('star', 'Washi Gold Twinkle'), 156, 102, 11);

  // 3 ghosts in open sky
  ghostCreature(ctx, 'crane', 176, 56, 'Pavilion Crane Ghost');
  ghostCreature(ctx, 'butterfly', 318, 56, 'Blossom Wing Ghost');
  ghostCreature(ctx, 'dragon', 442, 114, 'Washi Dragon Ghost');

  ctx.ellipsePath('ring', orbX, orbY, orb.rx, orb.ry, 24, orb.tilt);
  const gallopPath = ctx.wavePath('gallop', 66, 236, 414, 236, 8, 2, 20);
  const sprintPath = ctx.wavePath('sprint', 74, 236, 408, 236, 8, 2, 20);
  const orbitPath = ctx.ellipsePath('orbit', 240, 86, 176, 46, 24);
  ctx.marginPath(256);

  ctx.actor('lumi', 132, 244, { facing: 1, anim: 'rear', pathIndex: gallopPath });
  ctx.actor('nova', 346, 244, { facing: -1, anim: 'leap', pathIndex: sprintPath });
  ctx.actor('gazelle', 240, 244, { facing: 1, anim: 'idle', pathIndex: gallopPath });
  ctx.actor('comet', 324, 92, { facing: -1, anim: 'float', pathIndex: orbitPath });

  ctx.heroQuest('crane', 'Washi Fan', fanIds);
  ctx.heroQuest('lantern', 'Sky Lantern', lanternIds);
  ctx.heroQuest('lumi', 'Lumi', [5, 6, 7, 8]);
  ctx.heroQuest('nova', 'Nova', [9, 10, 11]);
}

// ============================================================================
// SLOT 5 FINALE: The Grand Festival of Sky Lanterns (50..70 regions!)
// ============================================================================
function u05_c5(ctx: SceneCtx): void {
  initChapter(ctx, 'u05_c5', 240, 122);
  const { r, rng } = ctx;

  drawSkySparkles(ctx, 22, 136, 'petals');

  // 1) Celestial Orb (12/13) (2 regions)
  const orbX = 76 + Math.round(jit(rng, 0, 3));
  const orbY = 56 + Math.round(jit(rng, 0, 2));
  const orb = drawThemedOrb(ctx, orbX, orbY, 19, 'lanternMoon', { tilt: -0.24 });

  // 2) Horizon clouds & grand festival harbor deck (4 regions)
  drawHorizonHills(ctx, { style: 'clouds', yBase: 164, yBottom: 214, layers: 2 });
  drawGroundDeck(ctx, { style: 'pier', yTop: 208, yBottom: 250, labelPrefix: 'Festival Harbor' });

  // 3) Grand Centerpiece: Festival Pagoda & Ascending Arc of Glowing Sky Lanterns (~15 regions!)
  const festivalQuestIds: number[] = [];
  const cx = 240;

  const pagodaIds = drawPagodaTower(ctx, cx, 166, 1.15, { label: 'Grand Festival' });
  festivalQuestIds.push(...pagodaIds);

  // Seven glowing floating festival sky-lanterns rising in a grand halo arch above the pagoda!
  const lanternArc: Array<[number, number, string]> = [
    [136, 94, 'Sky Lantern West-1'],
    [164, 62, 'Sky Lantern West-2'],
    [200, 38, 'Sky Lantern Crown-L'],
    [240, 28, 'Grand Zenith Lantern'],
    [280, 38, 'Sky Lantern Crown-R'],
    [316, 62, 'Sky Lantern East-2'],
    [344, 94, 'Sky Lantern East-1'],
  ];
  for (const [lx, ly, lbl] of lanternArc) {
    const lid = ctx.dyn('star', lbl);
    r.ellipse(lid, lx, ly, 10, 12);
    r.line(INK, lx, ly - 10, lx, ly + 10, { only: [lid] });
    r.line(INK, lx - 8, ly, lx + 8, ly, { only: [lid] });
    if (lx === 240) festivalQuestIds.push(lid);
  }

  // Twin pleated festival washi fan arches flanking the pagoda base
  for (const side of [-1, 1] as const) {
    const fid = ctx.dyn('prop', side < 0 ? 'West Festival Fan' : 'East Festival Fan');
    const fx = cx + side * 66;
    r.poly(fid, [[fx, 200], [fx - 26, 174], [fx, 162], [fx + 26, 174]]);
    r.line(INK, fx, 198, fx, 164, { only: [fid] });
  }

  // 4) Flanking Wing Landmarks + Foreground Framing Clouds 14/15 (11 regions!)
  drawOrigamiCrane(ctx, 104, 144, 0.86, { label: 'Festival West' });
  drawKiteDragon(ctx, 376, 144, 0.86, { label: 'Festival East', flip: -1 });
  drawPaperBoat(ctx, 42, 184, 0.72, { label: 'Harbor West' });
  ctx.canon(14, 'Festival Lantern Cloud', 'cloud');
  ctx.canon(15, 'Twilight Paper Cloud', 'cloud');
  drawThemedCloud(ctx, 14, 52, 224, 82, 26, 'origami');
  drawThemedCloud(ctx, 15, 428, 224, 82, 26, 'origami');

  // 5) Sky Crown Ornaments (8 regions!)
  crescent(ctx, ctx.dyn('star', 'East Festival Crescent'), 404, 56, 18, -0.4);
  star(ctx, ctx.dyn('star', 'West Harbor Star'), 28, 104, 10.5, { points: 5, inner: 0.48 });
  star(ctx, ctx.dyn('star', 'East Harbor Star'), 452, 104, 10.5, { points: 5, inner: 0.48 });
  twinkle(ctx, ctx.dyn('star', 'Festival Spark West'), 118, 42, 10.5);
  twinkle(ctx, ctx.dyn('star', 'Festival Spark East'), 362, 42, 10.5);
  pearl(ctx, ctx.dyn('star', 'Lantern Ember West'), 184, 96, 8.5);
  pearl(ctx, ctx.dyn('star', 'Lantern Ember East'), 296, 96, 8.5);
  star(ctx, ctx.dyn('star', 'Harbor Dock Star'), 440, 170, 10.5, { points: 4, inner: 0.46 });

  // 6) 3 Ghosts in open upper sky
  ghostCreature(ctx, 'crane', 36, 34, 'Festival Crane Ghost');
  ghostCreature(ctx, 'dragon', 446, 54, 'Twilight Dragon Ghost');
  ghostCreature(ctx, 'koi', 36, 142, 'Lantern Koi Ghost');

  // 7) Paths
  ctx.ellipsePath('ring', orbX, orbY, orb.rx, orb.ry, 24, orb.tilt);
  const gallopPath = ctx.wavePath('gallop', 62, 238, 418, 238, 8, 2, 20);
  const sprintPath = ctx.wavePath('sprint', 78, 236, 402, 236, 8, 2, 20);
  const orbitPath = ctx.ellipsePath('orbit', 240, 88, 184, 52, 28);
  ctx.marginPath(256);

  // 8) Full Hero Cast + Festival Companions (14 regions!)
  ctx.actor('lumi', 140, 246, { facing: 1, anim: 'rear', pathIndex: gallopPath });
  ctx.actor('violet', 240, 248, { facing: 1, anim: 'idle' });
  ctx.actor('nova', 340, 246, { facing: -1, anim: 'leap', pathIndex: sprintPath });
  ctx.actor('moonCat', 428, 242, { facing: -1, anim: 'peek' });
  ctx.actor('comet', 402, 102, { facing: -1, anim: 'float', pathIndex: orbitPath });

  ctx.heroQuest('lantern', 'Grand Lanterns', festivalQuestIds);
  ctx.heroQuest('violet', 'Violet', [1, 2, 3, 4]);
  ctx.heroQuest('lumi', 'Lumi', [5, 6, 7, 8]);
  ctx.heroQuest('nova', 'Nova', [9, 10, 11]);
}

export const U05_SCENES = {
  hub_origamiSkyHarbor,
  u05_c1,
  u05_c2a,
  u05_c2b,
  u05_c3a,
  u05_c3b,
  u05_c4a,
  u05_c4b,
  u05_c5,
} satisfies Partial<Record<SceneId, (ctx: SceneCtx) => void>>;
