/**
 * Universe 16: Golden Maple Harvest (9 bespoke procedural scenes: 1 Hub + 8 Chapters).
 * Pure, deterministic (uses ctx.rng only), adheres to >= 60px region hygiene and bottom-margin reserve.
 */
import { MaterialId } from '../../contracts/materials';
import { UNIVERSE_BY_ID } from '../../contracts/universes';
import type { SceneCtx } from '../context';
import { crescent, inkArc, jit, star, twinkle } from '../props';
import { INK, W, type Pt } from '../raster';
import {
  drawAcornCottage,
  drawFairyLantern,
  drawGhostSilhouette,
  drawGroundDeck,
  drawHollowOak,
  drawHorizonHills,
  drawMapleWindmill,
  drawPaperLantern,
  drawPumpkinCarriage,
  drawSanctuaryRoom,
  drawSkySparkles,
  drawThemedCloud,
  drawThemedOrb,
} from '../kit';

const U = UNIVERSE_BY_ID.autumnHarvestHollow;

type U16SceneId =
  | 'hub_autumnHarvestHollow'
  | 'u16_c1'
  | 'u16_c2a'
  | 'u16_c2b'
  | 'u16_c3a'
  | 'u16_c3b'
  | 'u16_c4a'
  | 'u16_c4b'
  | 'u16_c5';

function setupMeta(ctx: SceneCtx, title: string, focalX = 240, focalY = 148): void {
  ctx.universeId = U.id;
  ctx.ambient = U.ambient;
  ctx.title = title;
  ctx.sky = { ...U.sky };
  ctx.focal = { x: focalX, y: focalY };
}

function chapterTitle(id: string): string {
  return U.chapters.find((c) => c.id === id)?.title ?? U.name;
}

/** Custom Crimson Maple Tree Archway framing an autumn garden lane (3 regions). */
function drawMapleArchway(ctx: SceneCtx, cx: number, cy: number, scale = 1): number[] {
  const { r } = ctx;
  const s = scale;
  const trunks = ctx.dyn('flora', 'Maple Arch Trunks');
  const canopy = ctx.dyn('flora', 'Crimson Maple Canopy');
  const pumpkins = ctx.dyn('star', 'Archway Pumpkins');

  // Curved twin maple trunks reaching overhead
  r.capsule(trunks, cx - 54 * s, cy + 36 * s, cx - 48 * s, cy - 8 * s, 9 * s);
  r.capsule(trunks, cx - 48 * s, cy - 8 * s, cx - 18 * s, cy - 28 * s, 7.5 * s);
  r.capsule(trunks, cx + 54 * s, cy + 36 * s, cx + 48 * s, cy - 8 * s, 9 * s);
  r.capsule(trunks, cx + 48 * s, cy - 8 * s, cx + 18 * s, cy - 28 * s, 7.5 * s);
  r.line(INK, cx - 50 * s, cy + 26 * s, cx - 46 * s, cy - 2 * s, { only: [trunks] });
  r.line(INK, cx + 50 * s, cy + 26 * s, cx + 46 * s, cy - 2 * s, { only: [trunks] });

  // Lush sweeping autumn maple leaf canopy crowning the arch
  for (const [ox, oy, rad] of [
    [-46, -18, 19], [-24, -30, 21], [0, -34, 22], [24, -30, 21], [46, -18, 19],
  ] as const) {
    r.disc(canopy, cx + ox * s, cy + oy * s, rad * s);
  }
  inkArc(r, cx - 20 * s, cy - 30 * s, 10 * s, 8 * s, Math.PI * 1.1, Math.PI * 1.9, 0, { only: [canopy] });
  inkArc(r, cx + 20 * s, cy - 30 * s, 10 * s, 8 * s, Math.PI * 1.1, Math.PI * 1.9, 0, { only: [canopy] });

  // Plump harvest pumpkins nestled at the trunk roots (shared region)
  for (const px of [-36, 36]) {
    r.ellipse(pumpkins, cx + px * s, cy + 28 * s, 15 * s, 12 * s);
    inkArc(r, cx + px * s, cy + 28 * s, 8 * s, 11 * s, 0, Math.PI * 2, 0, { only: [pumpkins] });
  }

  return [trunks, canopy, pumpkins];
}

/** Custom Honeycrisp Apple-Orchard Fair Stand with striped awning & overflowing fruit baskets (3 regions). */
function drawOrchardStand(ctx: SceneCtx, cx: number, cy: number, scale = 1): number[] {
  const { r } = ctx;
  const s = scale;
  const booth = ctx.dyn('prop', 'Orchard Cider Booth');
  const awning = ctx.dyn('prop', 'Harvest Fair Awning');
  const apples = ctx.dyn('star', 'Honeycrisp Apple Baskets');

  r.rect(booth, cx - 42 * s, cy - 10 * s, cx - 34 * s, cy + 36 * s);
  r.rect(booth, cx + 34 * s, cy - 10 * s, cx + 42 * s, cy + 36 * s);
  r.rect(booth, cx - 46 * s, cy + 10 * s, cx + 46 * s, cy + 36 * s);
  for (const bx of [-22, 0, 22]) {
    r.line(INK, cx + bx * s, cy + 12 * s, cx + bx * s, cy + 34 * s, { only: [booth] });
  }

  // Glossy heaped apples across counter
  for (const [ax, ay, rad] of [[-20, 4, 9], [-4, 2, 9.5], [12, 4, 9], [24, 5, 8.5]] as const) {
    r.disc(apples, cx + ax * s, cy + ay * s, rad * s);
  }
  r.line(INK, cx - 26 * s, cy + 8 * s, cx + 28 * s, cy + 8 * s, { only: [apples] });

  // Striped autumn fair canopy
  r.poly(awning, [
    [cx - 50 * s, cy - 12 * s],
    [cx + 50 * s, cy - 12 * s],
    [cx + 38 * s, cy - 32 * s],
    [cx - 38 * s, cy - 32 * s],
  ]);
  for (const ox of [-36, -18, 0, 18, 36]) {
    r.disc(awning, cx + ox * s, cy - 12 * s, 8 * s);
  }
  r.line(INK, cx - 18 * s, cy - 30 * s, cx - 22 * s, cy - 12 * s, { only: [awning] });
  r.line(INK, cx + 18 * s, cy - 30 * s, cx + 22 * s, cy - 12 * s, { only: [awning] });

  return [booth, awning, apples];
}

/** Custom Stone & Timber Arched Fox-Tail Lantern Bridge spanning a leafy brook (3 regions). */
function drawLanternBridge(ctx: SceneCtx, cx: number, cy: number, scale = 1): number[] {
  const { r } = ctx;
  const s = scale;
  const arch = ctx.dyn('prop', 'Stone Brook Bridge');
  const rails = ctx.dyn('prop', 'Timber Bridge Rails');
  const jars = ctx.dyn('star', 'Bridge Star-Jars');

  // Arched stone bridge body
  r.shape(arch, cx - 96 * s, cy - 10 * s, cx + 96 * s, cy + 34 * s, (px, py) => {
    const t = (px - cx) / (96 * s);
    if (Math.abs(t) > 1) return false;
    const topY = cy + 6 * s - Math.cos(t * Math.PI * 0.5) * 16 * s;
    const botY = cy + 34 * s - Math.cos(t * Math.PI * 0.5) * 20 * s;
    return py >= topY && py <= botY;
  });
  for (let bx = -72; bx <= 72; bx += 24) {
    r.line(INK, cx + bx * s, cy - 4 * s, cx + bx * s, cy + 16 * s, { only: [arch] });
  }

  // Timber bridge balustrades + corner posts
  r.rect(rails, cx - 86 * s, cy - 18 * s, cx - 72 * s, cy + 8 * s);
  r.rect(rails, cx + 72 * s, cy - 18 * s, cx + 86 * s, cy + 8 * s);
  r.rect(rails, cx - 10 * s, cy - 26 * s, cx + 10 * s, cy - 4 * s);

  // Glowing star-jars perched on the three bridge posts (shared region)
  for (const [jx, jy] of [[-79, -26], [0, -34], [79, -26]] as const) {
    r.disc(jars, cx + jx * s, cy + jy * s, 9 * s);
    r.line(INK, cx + jx * s, cy + (jy - 5) * s, cx + jx * s, cy + (jy + 5) * s, { only: [jars] });
    r.line(INK, cx + (jx - 5) * s, cy + jy * s, cx + (jx + 5) * s, cy + jy * s, { only: [jars] });
  }

  return [arch, rails, jars];
}

/** Custom Harvest-Moon Hayride Wagon overflowing with golden hay & glowing pumpkins (3 regions). */
function drawHayrideWagon(ctx: SceneCtx, cx: number, cy: number, scale = 1): number[] {
  const { r } = ctx;
  const s = scale;
  const hay = ctx.dyn('star', 'Golden Hay & Pumpkins');
  const bed = ctx.dyn('prop', 'Timber Hayride Wagon');
  const wheels = ctx.dyn('prop', 'Spoked Wagon Wheels');

  // Mound of golden hay & plump harvest pumpkins
  r.ellipse(hay, cx, cy - 8 * s, 44 * s, 20 * s);
  r.disc(hay, cx - 18 * s, cy - 16 * s, 12 * s);
  r.disc(hay, cx + 12 * s, cy - 18 * s, 13 * s);
  inkArc(r, cx - 18 * s, cy - 16 * s, 6 * s, 10 * s, 0, Math.PI * 2, 0, { only: [hay] });
  inkArc(r, cx + 12 * s, cy - 18 * s, 7 * s, 11 * s, 0, Math.PI * 2, 0, { only: [hay] });

  // Planked wooden hayride cart bed
  r.poly(bed, [
    [cx - 52 * s, cy - 4 * s],
    [cx + 52 * s, cy - 4 * s],
    [cx + 44 * s, cy + 24 * s],
    [cx - 44 * s, cy + 24 * s],
  ]);
  for (const bx of [-26, 0, 26]) {
    r.line(INK, cx + bx * s, cy - 2 * s, cx + bx * s, cy + 22 * s, { only: [bed] });
  }
  r.line(INK, cx - 46 * s, cy + 10 * s, cx + 46 * s, cy + 10 * s, { only: [bed] });

  // Twin chunky spoked wagon wheels (shared region)
  for (const wx of [-28, 28]) {
    r.disc(wheels, cx + wx * s, cy + 26 * s, 14 * s);
    inkArc(r, cx + wx * s, cy + 26 * s, 9 * s, 9 * s, 0, Math.PI * 2, 0, { only: [wheels] });
    r.line(INK, cx + (wx - 9) * s, cy + 26 * s, cx + (wx + 9) * s, cy + 26 * s, { only: [wheels] });
    r.line(INK, cx + wx * s, cy + 17 * s, cx + wx * s, cy + 35 * s, { only: [wheels] });
  }

  return [hay, bed, wheels];
}

/** Hub Sanctuary: Violet's Cozy Lantern Cottage */
function buildHubAutumnHarvestHollow(ctx: SceneCtx): void {
  ctx.universeId = U.id;
  ctx.ambient = U.ambient;

  let customIds: number[] = [];
  const res = drawSanctuaryRoom(ctx, {
    title: U.hubTitle,
    sky: { ...U.sky },
    palette: {
      wallPanel: MaterialId.AuroraSherbet,
      floor: MaterialId.SolarCheetahAmber,
      windowFrame: MaterialId.SolarFlare24K,
      windowGlass: MaterialId.VelvetNebula,
      curtain: MaterialId.StrawberrySupernova,
      orbCore: MaterialId.SolarFlare24K,
      orbRing: MaterialId.SolarCheetahAmber,
      rugOuter: MaterialId.SolarCheetahAmber,
      rugInner: MaterialId.SolarFlare24K,
      furniture: MaterialId.SolarFlare24K,
      furnitureTrim: MaterialId.AuroraSherbet,
      accentA: MaterialId.SolarCheetahAmber,
      accentB: MaterialId.SolarFlare24K,
      accentC: MaterialId.StrawberrySupernova,
    },
    windowShape: 'arched',
    windowOrbStyle: 'lanternMoon',
    wallStyle: 'wainscot',
    floorStyle: 'wood',
    rugShape: 'scallop',
    lampStyle: 'lantern',
    garlandStyle: 'leaves',
    sparkleStyle: 'petals',
    seatingLabel: 'Quilted Harvest Settee',
    workbenchLabel: 'Cider & Leaf Desk',
    shelfLabel: 'Autumn Pantry Shelf',
    trinketLabels: ['Maple Pressings', 'Cider Recipes', 'Lantern Jars'],
    drawWindowView: (c, wx, _wy, _wHalf, wBot) => {
      // Autumn rolling hill & glowing pumpkin silhouette through lower arched window
      const hill = c.dyn('flora', 'Window Autumn Hill');
      c.r.poly(hill, [
        [wx - 34, wBot - 2],
        [wx - 14, wBot - 18],
        [wx + 12, wBot - 14],
        [wx + 34, wBot - 22],
        [wx + 34, wBot - 2],
      ]);
      c.preColor(hill, MaterialId.SolarCheetahAmber);

      const pump = c.dyn('star', 'Window Harvest Pumpkin');
      c.r.ellipse(pump, wx - 10, wBot - 12, 12, 9);
      c.preColor(pump, MaterialId.SolarFlare24K);
    },
    drawExtraProps: (c) => {
      const ids: number[] = [];
      // 1) Autumn Leaf Wreath hanging on left upper wall
      const wreath = c.dyn('flora', 'Autumn Leaf Wreath');
      c.r.shape(wreath, 66, 72, 102, 108, (px, py) => {
        const d = Math.hypot(px - 84, py - 90);
        return d <= 17 && d >= 8;
      });
      c.preColor(wreath, MaterialId.StrawberrySupernova);
      ids.push(wreath);

      // 2) Pressed Golden Maple Plaque on upper-right wall
      const leafPlaque = c.dyn('star', 'Maple Leaf Plaque');
      c.r.ellipse(leafPlaque, 354, 90, 16, 15);
      c.r.line(INK, 354, 78, 354, 102, { only: [leafPlaque] });
      c.r.line(INK, 344, 88, 364, 88, { only: [leafPlaque] });
      c.preColor(leafPlaque, MaterialId.SolarFlare24K);
      ids.push(leafPlaque);

      // 3) Glowing Carved Harvest Pumpkin resting right of Violet
      const pumpkin = c.dyn('star', 'Cottage Glow Pumpkin');
      c.r.ellipse(pumpkin, 276, 222, 18, 14);
      c.r.rect(pumpkin, 273, 204, 279, 212);
      inkArc(c.r, 276, 222, 9, 13, 0, Math.PI * 2, 0, { only: [pumpkin] });
      c.preColor(pumpkin, MaterialId.SolarCheetahAmber);
      ids.push(pumpkin);

      // 4) Steaming Cider Mug resting on right side of craft desk
      const mug = c.dyn('prop', 'Warm Cider Mug');
      c.r.rect(mug, 366, 160, 386, 179);
      c.r.disc(mug, 388, 169, 5);
      c.r.line(INK, 368, 167, 384, 167, { only: [mug] });
      c.preColor(mug, MaterialId.OpalPearl);
      ids.push(mug);

      customIds = ids;
      return ids;
    },
  });

  ctx.heroQuest('violet', 'Violet', [1, 2, 3, 4]);
  ctx.heroQuest('planet', 'Harvest Moon', [12, 13]);
  ctx.heroQuest('pumpkin', 'Autumn Cozy', customIds);
  ctx.heroQuest('lantern', 'Leaf Garland', res.roomIds.slice(8, 12));
}

/** Chapter 1: The Crimson Maple Archway */
function buildU16C1(ctx: SceneCtx): void {
  const { rng } = ctx;
  setupMeta(ctx, chapterTitle('u16_c1'), 240, 152);
  drawSkySparkles(ctx, 20, 124, 'petals');

  const ox = Math.round(jit(rng, 378, 4));
  const oy = Math.round(jit(rng, 52, 3));
  const orb = drawThemedOrb(ctx, ox, oy, 20, 'lanternMoon', { tilt: -0.22 });
  drawThemedCloud(ctx, 14, Math.round(jit(rng, 100, 4)), Math.round(jit(rng, 46, 3)), 86, 28, 'fluffy');
  drawThemedCloud(ctx, 15, Math.round(jit(rng, 246, 4)), Math.round(jit(rng, 40, 3)), 76, 26, 'fluffy');

  star(ctx, ctx.dyn('star', 'Autumn Dusk Star'), Math.round(jit(rng, 180, 3)), Math.round(jit(rng, 68, 2)), 10);
  twinkle(ctx, ctx.dyn('star', 'Maple Gleam'), Math.round(jit(rng, 314, 3)), Math.round(jit(rng, 68, 2)), 11);

  drawGhostSilhouette(ctx, 'Autumn Fox Ghost', 'fox', Math.round(jit(rng, 150, 3)), Math.round(jit(rng, 100, 2)), 0.92);
  drawGhostSilhouette(ctx, 'Harvest Owl Ghost', 'owl', Math.round(jit(rng, 336, 3)), Math.round(jit(rng, 100, 2)), 0.92);

  drawHorizonHills(ctx, { style: 'rolling', yBase: 170, yBottom: 218, layers: 2, labelPrefix: 'Maple' });
  drawGroundDeck(ctx, { style: 'gardenPath', yTop: 206, yBottom: 250, labelPrefix: 'Autumn' });

  // Grand Crimson Maple Tree Archway + Twin Fairy Lantern Posts + Acorn Gatehouse
  const arch = drawMapleArchway(ctx, 240, 170, 1.08);
  const lampL = drawFairyLantern(ctx, 84, 174, 0.9, { label: 'Lane West' });
  const lampR = drawFairyLantern(ctx, 396, 174, 0.9, { label: 'Lane East', flip: -1 });

  ctx.ellipsePath('ring', ox, oy, orb.rx * 1.15, orb.ry * 1.3, 24, orb.tilt);
  const gallopPath = ctx.wavePath('gallop', 72, 232, 408, 232, 8, 2, 18);
  const orbitPath = ctx.ellipsePath('orbit', 240, 96, 174, 46, 24);
  ctx.marginPath(256);

  ctx.actor('violet', 152, 242, { facing: 1, anim: 'idle' });
  ctx.actor('lumi', 324, 240, { facing: -1, anim: 'idle', pathIndex: gallopPath });
  ctx.actor('moonCat', 240, 234, { facing: 1, anim: 'sleep' });
  ctx.actor('comet', 62, 98, { facing: 1, anim: 'float', pathIndex: orbitPath });

  ctx.heroQuest('lantern', 'Lane Lamps', [...lampL, ...lampR]);
  ctx.heroQuest('pumpkin', 'Maple Arch', arch);
  ctx.heroQuest('violet', 'Violet', [1, 2, 3, 4]);
  ctx.heroQuest('lumi', 'Lumi', [5, 6, 7, 8]);
}

/** Chapter 2A: The Starlight Pumpkin Carriage */
function buildU16C2a(ctx: SceneCtx): void {
  const { rng } = ctx;
  setupMeta(ctx, chapterTitle('u16_c2a'), 240, 152);
  drawSkySparkles(ctx, 20, 122, 'petals');

  const ox = Math.round(jit(rng, 88, 4));
  const oy = Math.round(jit(rng, 52, 3));
  const orb = drawThemedOrb(ctx, ox, oy, 20, 'pearlMoon', { tilt: -0.24 });
  drawThemedCloud(ctx, 14, Math.round(jit(rng, 244, 4)), Math.round(jit(rng, 42, 3)), 88, 28, 'fluffy');
  drawThemedCloud(ctx, 15, Math.round(jit(rng, 402, 4)), Math.round(jit(rng, 50, 3)), 84, 28, 'fluffy');

  star(ctx, ctx.dyn('star', 'Midnight Coach Star'), Math.round(jit(rng, 170, 3)), Math.round(jit(rng, 36, 2)), 10);
  twinkle(ctx, ctx.dyn('star', 'Vine Sparkle'), Math.round(jit(rng, 328, 3)), Math.round(jit(rng, 38, 2)), 11);

  drawGhostSilhouette(ctx, 'Carriage Fox Ghost', 'fox', Math.round(jit(rng, 162, 3)), Math.round(jit(rng, 92, 2)), 0.9);
  drawGhostSilhouette(ctx, 'Moon Moth Ghost', 'moth', Math.round(jit(rng, 328, 3)), Math.round(jit(rng, 92, 2)), 0.9);
  drawGhostSilhouette(ctx, 'Grove Owl Ghost', 'owl', Math.round(jit(rng, 444, 3)), Math.round(jit(rng, 114, 2)), 0.85);

  drawHorizonHills(ctx, { style: 'rolling', yBase: 170, yBottom: 218, layers: 2, labelPrefix: 'Pumpkin' });
  drawGroundDeck(ctx, { style: 'gardenPath', yTop: 206, yBottom: 250, labelPrefix: 'Carriage' });

  // Hero Center Starlight Pumpkin Carriage + Twin Vine Fairy Lanterns
  const coach = drawPumpkinCarriage(ctx, 240, 170, 1.15, { label: 'Starlight' });
  const lampL = drawFairyLantern(ctx, 84, 174, 0.92, { label: 'Vine West' });
  const lampR = drawFairyLantern(ctx, 396, 174, 0.92, { label: 'Vine East', flip: -1 });

  ctx.ellipsePath('ring', ox, oy, orb.rx * 1.15, orb.ry * 1.3, 24, orb.tilt);
  const gallopPath = ctx.wavePath('gallop', 72, 232, 408, 232, 8, 2, 18);
  const orbitPath = ctx.ellipsePath('orbit', 240, 96, 174, 46, 24);
  ctx.marginPath(256);

  ctx.actor('violet', 148, 242, { facing: 1, anim: 'idle' });
  ctx.actor('lumi', 332, 240, { facing: -1, anim: 'rear', pathIndex: gallopPath });
  ctx.actor('moonCat', 240, 234, { facing: 1, anim: 'sleep' });
  ctx.actor('comet', 432, 92, { facing: -1, anim: 'float', pathIndex: orbitPath });

  ctx.heroQuest('pumpkin', 'Gourd Coach', coach);
  ctx.heroQuest('lantern', 'Vine Lamps', [...lampL, ...lampR]);
  ctx.heroQuest('violet', 'Violet', [1, 2, 3, 4]);
  ctx.heroQuest('lumi', 'Lumi', [5, 6, 7, 8]);
}

/** Chapter 2B: The Golden Maple Windmill Hill */
function buildU16C2b(ctx: SceneCtx): void {
  const { rng } = ctx;
  setupMeta(ctx, chapterTitle('u16_c2b'), 240, 150);
  drawSkySparkles(ctx, 20, 122, 'petals');

  const ox = Math.round(jit(rng, 378, 4));
  const oy = Math.round(jit(rng, 52, 3));
  const orb = drawThemedOrb(ctx, ox, oy, 20, 'lotusSun', { tilt: -0.22 });
  drawThemedCloud(ctx, 14, Math.round(jit(rng, 100, 4)), Math.round(jit(rng, 46, 3)), 86, 28, 'fluffy');
  drawThemedCloud(ctx, 15, Math.round(jit(rng, 246, 4)), Math.round(jit(rng, 40, 3)), 76, 26, 'fluffy');

  star(ctx, ctx.dyn('star', 'Windmill Breeze Star'), Math.round(jit(rng, 180, 3)), Math.round(jit(rng, 68, 2)), 10);
  twinkle(ctx, ctx.dyn('star', 'Hilltop Twinkle'), Math.round(jit(rng, 314, 3)), Math.round(jit(rng, 68, 2)), 11);

  drawGhostSilhouette(ctx, 'Hilltop Fox Ghost', 'fox', Math.round(jit(rng, 148, 3)), Math.round(jit(rng, 100, 2)), 0.9);
  drawGhostSilhouette(ctx, 'Windmill Owl Ghost', 'owl', Math.round(jit(rng, 336, 3)), Math.round(jit(rng, 100, 2)), 0.9);
  drawGhostSilhouette(ctx, 'Autumn Butterfly', 'butterfly', Math.round(jit(rng, 444, 3)), Math.round(jit(rng, 114, 2)), 0.85);

  drawHorizonHills(ctx, { style: 'rolling', yBase: 162, yBottom: 218, layers: 2, labelPrefix: 'Windmill' });
  drawGroundDeck(ctx, { style: 'meadow', yTop: 206, yBottom: 250, labelPrefix: 'Golden' });

  // Hero Hilltop Golden Maple Windmill + Acorn Miller Cottage + Hollow Oak
  const mill = drawMapleWindmill(ctx, 240, 166, 1.15, { label: 'Golden' });
  const hutL = drawAcornCottage(ctx, 84, 176, 0.9, { label: 'Miller' });
  const oakR = drawHollowOak(ctx, 396, 174, 0.9, { label: 'Maple Hill' });

  ctx.ellipsePath('ring', ox, oy, orb.rx * 1.15, orb.ry * 1.3, 24, orb.tilt);
  const sprintPath = ctx.wavePath('sprint', 68, 232, 412, 232, 8, 2, 18);
  const orbitPath = ctx.ellipsePath('orbit', 240, 96, 174, 46, 24);
  ctx.marginPath(256);

  ctx.actor('violet', 152, 242, { facing: 1, anim: 'idle' });
  ctx.actor('nova', 324, 240, { facing: -1, anim: 'run', pathIndex: sprintPath });
  ctx.actor('gazelle', 416, 240, { facing: -1, anim: 'leap', pathIndex: sprintPath });
  ctx.actor('comet', 62, 98, { facing: 1, anim: 'float', pathIndex: orbitPath });

  ctx.heroQuest('pumpkin', 'Maple Mill', mill);
  ctx.heroQuest('lantern', 'Acorn Hut', [...hutL, ...oakR]);
  ctx.heroQuest('violet', 'Violet', [1, 2, 3, 4]);
  ctx.heroQuest('nova', 'Nova', [9, 10, 11]);
}

/** Chapter 3A: The Cozy Acorn-Cap Cottages */
function buildU16C3a(ctx: SceneCtx): void {
  const { rng } = ctx;
  setupMeta(ctx, chapterTitle('u16_c3a'), 240, 152);
  drawSkySparkles(ctx, 18, 122, 'petals');

  const ox = Math.round(jit(rng, 88, 4));
  const oy = Math.round(jit(rng, 52, 3));
  const orb = drawThemedOrb(ctx, ox, oy, 20, 'lanternMoon', { tilt: -0.22 });
  drawThemedCloud(ctx, 14, Math.round(jit(rng, 244, 4)), Math.round(jit(rng, 42, 3)), 88, 26, 'steamPuff');
  drawThemedCloud(ctx, 15, Math.round(jit(rng, 404, 4)), Math.round(jit(rng, 50, 3)), 84, 26, 'steamPuff');

  star(ctx, ctx.dyn('star', 'Chimney Smoke Star'), Math.round(jit(rng, 170, 3)), Math.round(jit(rng, 36, 2)), 10);
  twinkle(ctx, ctx.dyn('star', 'Cinnamon Twinkle'), Math.round(jit(rng, 328, 3)), Math.round(jit(rng, 38, 2)), 11);

  drawGhostSilhouette(ctx, 'Acorn Fox Ghost', 'fox', Math.round(jit(rng, 162, 3)), Math.round(jit(rng, 92, 2)), 0.9);
  drawGhostSilhouette(ctx, 'Cottage Owl Ghost', 'owl', Math.round(jit(rng, 328, 3)), Math.round(jit(rng, 92, 2)), 0.9);
  drawGhostSilhouette(ctx, 'Cinnamon Moth Ghost', 'moth', Math.round(jit(rng, 444, 3)), Math.round(jit(rng, 114, 2)), 0.85);

  drawHorizonHills(ctx, { style: 'mushroom', yBase: 170, yBottom: 218, layers: 2, labelPrefix: 'Mossy' });
  drawGroundDeck(ctx, { style: 'meadow', yTop: 206, yBottom: 250, labelPrefix: 'Acorn' });

  // Twin Cozy Acorn-Cap Cottages flanking a Central Hollow Village Oak + Fairy Lantern!
  const cotL = drawAcornCottage(ctx, 90, 174, 0.96, { label: 'West' });
  const oakC = drawHollowOak(ctx, 240, 170, 1.04, { label: 'Village' });
  const cotR = drawAcornCottage(ctx, 390, 174, 0.96, { label: 'East', flip: -1 });
  const lamp = drawFairyLantern(ctx, 166, 176, 0.78, { label: 'Village' });

  ctx.ellipsePath('ring', ox, oy, orb.rx * 1.15, orb.ry * 1.3, 24, orb.tilt);
  const gallopPath = ctx.wavePath('gallop', 72, 232, 408, 232, 8, 2, 18);
  const orbitPath = ctx.ellipsePath('orbit', 240, 96, 174, 46, 24);
  ctx.marginPath(256);

  ctx.actor('violet', 146, 242, { facing: 1, anim: 'idle' });
  ctx.actor('lumi', 326, 240, { facing: -1, anim: 'idle', pathIndex: gallopPath });
  ctx.actor('moonCat', 240, 234, { facing: 1, anim: 'sleep' });
  ctx.actor('comet', 432, 92, { facing: -1, anim: 'float', pathIndex: orbitPath });

  ctx.heroQuest('mushroom', 'Acorn Village', [...cotL, ...cotR]);
  ctx.heroQuest('lantern', 'Village Oak', [...oakC, ...lamp]);
  ctx.heroQuest('violet', 'Violet', [1, 2, 3, 4]);
  ctx.heroQuest('lumi', 'Lumi', [5, 6, 7, 8]);
}

/** Chapter 3B: The Honeycrisp Apple-Orchard Fair */
function buildU16C3b(ctx: SceneCtx): void {
  const { rng } = ctx;
  setupMeta(ctx, chapterTitle('u16_c3b'), 240, 152);
  drawSkySparkles(ctx, 20, 122, 'petals');

  const ox = Math.round(jit(rng, 378, 4));
  const oy = Math.round(jit(rng, 52, 3));
  const orb = drawThemedOrb(ctx, ox, oy, 20, 'lotusSun', { tilt: -0.22 });
  drawThemedCloud(ctx, 14, Math.round(jit(rng, 100, 4)), Math.round(jit(rng, 46, 3)), 86, 28, 'fluffy');
  drawThemedCloud(ctx, 15, Math.round(jit(rng, 246, 4)), Math.round(jit(rng, 40, 3)), 76, 26, 'fluffy');

  star(ctx, ctx.dyn('star', 'Orchard Fair Star'), Math.round(jit(rng, 180, 3)), Math.round(jit(rng, 68, 2)), 10);
  twinkle(ctx, ctx.dyn('star', 'Cider Sparkle'), Math.round(jit(rng, 314, 3)), Math.round(jit(rng, 68, 2)), 11);

  drawGhostSilhouette(ctx, 'Orchard Fox Ghost', 'fox', Math.round(jit(rng, 150, 3)), Math.round(jit(rng, 100, 2)), 0.9);
  drawGhostSilhouette(ctx, 'Orchard Butterfly', 'butterfly', Math.round(jit(rng, 336, 3)), Math.round(jit(rng, 100, 2)), 0.9);
  drawGhostSilhouette(ctx, 'Apple Owl Ghost', 'owl', Math.round(jit(rng, 444, 3)), Math.round(jit(rng, 114, 2)), 0.85);

  drawHorizonHills(ctx, { style: 'rolling', yBase: 170, yBottom: 218, layers: 2, labelPrefix: 'Orchard' });
  drawGroundDeck(ctx, { style: 'meadow', yTop: 206, yBottom: 250, labelPrefix: 'Orchard' });

  // Center Honeycrisp Apple Fair Stand + Flanking Orchard Trees + Glowing Paper String Lanterns
  const stand = drawOrchardStand(ctx, 240, 174, 1.05);
  const treeL = drawHollowOak(ctx, 82, 172, 0.92, { label: 'Apple West' });
  const treeR = drawHollowOak(ctx, 398, 172, 0.92, { label: 'Apple East', flip: -1 });
  const lampL = drawPaperLantern(ctx, 156, 158, 0.74, { label: 'Fair West' });
  const lampR = drawPaperLantern(ctx, 324, 158, 0.74, { label: 'Fair East' });

  ctx.ellipsePath('ring', ox, oy, orb.rx * 1.15, orb.ry * 1.3, 24, orb.tilt);
  const gallopPath = ctx.wavePath('gallop', 72, 232, 408, 232, 8, 2, 18);
  const sprintPath = ctx.wavePath('sprint', 68, 238, 412, 238, 7, 2.5, 18);
  const orbitPath = ctx.ellipsePath('orbit', 240, 96, 174, 46, 24);
  ctx.marginPath(256);

  ctx.actor('violet', 148, 242, { facing: 1, anim: 'idle' });
  ctx.actor('lumi', 240, 242, { facing: 1, anim: 'idle', pathIndex: gallopPath });
  ctx.actor('nova', 338, 240, { facing: -1, anim: 'idle', pathIndex: sprintPath });
  ctx.actor('moonCat', 432, 234, { facing: -1, anim: 'sleep' });

  ctx.heroQuest('pumpkin', 'Apple Fair', [...stand, ...treeL, ...treeR]);
  ctx.heroQuest('lantern', 'Orchard Lamps', [...lampL, ...lampR]);
  ctx.heroQuest('violet', 'Violet', [1, 2, 3, 4]);
  ctx.heroQuest('nova', 'Nova', [9, 10, 11]);
  void orbitPath;
}

/** Chapter 4A: The Fox-Tail Lantern Bridge */
function buildU16C4a(ctx: SceneCtx): void {
  const { r, rng } = ctx;
  setupMeta(ctx, chapterTitle('u16_c4a'), 240, 156);
  drawSkySparkles(ctx, 20, 122, 'petals');

  const ox = Math.round(jit(rng, 88, 4));
  const oy = Math.round(jit(rng, 52, 3));
  const orb = drawThemedOrb(ctx, ox, oy, 20, 'pearlMoon', { tilt: -0.24 });
  drawThemedCloud(ctx, 14, Math.round(jit(rng, 244, 4)), Math.round(jit(rng, 42, 3)), 88, 28, 'fluffy');
  drawThemedCloud(ctx, 15, Math.round(jit(rng, 404, 4)), Math.round(jit(rng, 50, 3)), 84, 28, 'fluffy');

  star(ctx, ctx.dyn('star', 'Brook Star'), Math.round(jit(rng, 170, 3)), Math.round(jit(rng, 36, 2)), 10);
  twinkle(ctx, ctx.dyn('star', 'Fox-Tail Twinkle'), Math.round(jit(rng, 328, 3)), Math.round(jit(rng, 38, 2)), 11);

  drawGhostSilhouette(ctx, 'Red Fox Ghost', 'fox', Math.round(jit(rng, 162, 3)), Math.round(jit(rng, 92, 2)), 0.94);
  drawGhostSilhouette(ctx, 'Bridge Owl Ghost', 'owl', Math.round(jit(rng, 328, 3)), Math.round(jit(rng, 92, 2)), 0.9);
  drawGhostSilhouette(ctx, 'Brook Cat Ghost', 'cat', Math.round(jit(rng, 444, 3)), Math.round(jit(rng, 114, 2)), 0.85);

  drawHorizonHills(ctx, { style: 'rolling', yBase: 162, yBottom: 214, layers: 2, labelPrefix: 'Brook' });

  // Shimmering twilight autumn brook flowing beneath the bridge + mossy riverbanks
  const brook = ctx.dyn('star', 'Leafy Autumn Brook');
  r.rect(brook, 0, 206, W, 250);
  for (let by = 216; by <= 242; by += 12) {
    const pts: Pt[] = [];
    for (let x = 16; x <= W - 16; x += 24) {
      pts.push([x, by + Math.sin(x * 0.05 + by) * 2.5]);
    }
    r.strokePath(INK, pts, { only: [brook] });
  }
  const bankL = ctx.dyn('flora', 'West Mossy Bank');
  const bankR = ctx.dyn('flora', 'East Mossy Bank');
  r.poly(bankL, [[0, 194], [134, 204], [118, 250], [0, 250]]);
  r.poly(bankR, [[346, 204], [W, 194], [W, 250], [362, 250]]);

  // Arched Stone & Timber Fox-Tail Lantern Bridge + Flanking Trees & Fairy Lanterns
  const bridge = drawLanternBridge(ctx, 240, 202, 1.06);
  const oakL = drawHollowOak(ctx, 64, 172, 0.9, { label: 'Brook' });
  const lampR = drawFairyLantern(ctx, 412, 174, 0.92, { label: 'Brook', flip: -1 });

  ctx.ellipsePath('ring', ox, oy, orb.rx * 1.15, orb.ry * 1.3, 24, orb.tilt);
  const gallopPath = ctx.wavePath('gallop', 66, 204, 414, 204, 14, 1, 18);
  const sprintPath = ctx.wavePath('sprint', 68, 212, 412, 212, 10, 1.5, 18);
  const orbitPath = ctx.ellipsePath('orbit', 240, 96, 174, 46, 24);
  ctx.marginPath(256);

  ctx.actor('violet', 148, 212, { facing: 1, anim: 'idle' });
  ctx.actor('lumi', 244, 198, { facing: 1, anim: 'idle', pathIndex: gallopPath });
  ctx.actor('nova', 352, 214, { facing: -1, anim: 'idle', pathIndex: sprintPath });
  ctx.actor('moonCat', 428, 232, { facing: -1, anim: 'sleep' });

  ctx.heroQuest('lantern', 'Fox Bridge', [...bridge, ...lampR]);
  ctx.heroQuest('pumpkin', 'Autumn Brook', [brook, bankL, bankR, ...oakL]);
  ctx.heroQuest('lumi', 'Lumi', [5, 6, 7, 8]);
  ctx.heroQuest('nova', 'Nova', [9, 10, 11]);
  void orbitPath;
}

/** Chapter 4B: The Harvest-Moon Hayride Meadow */
function buildU16C4b(ctx: SceneCtx): void {
  const { rng } = ctx;
  setupMeta(ctx, chapterTitle('u16_c4b'), 240, 146);
  drawSkySparkles(ctx, 20, 122, 'stars');

  // Colossal rising Golden Harvest Moon centerpiece! (canonical 12/13)
  const ox = Math.round(jit(rng, 240, 3));
  const oy = Math.round(jit(rng, 72, 2));
  const orb = drawThemedOrb(ctx, ox, oy, 28, 'lotusSun', { tilt: -0.18 });
  drawThemedCloud(ctx, 14, Math.round(jit(rng, 88, 4)), Math.round(jit(rng, 50, 3)), 88, 28, 'fluffy');
  drawThemedCloud(ctx, 15, Math.round(jit(rng, 392, 4)), Math.round(jit(rng, 52, 3)), 88, 28, 'fluffy');

  star(ctx, ctx.dyn('star', 'Harvest Zenith Star'), Math.round(jit(rng, 166, 3)), Math.round(jit(rng, 34, 2)), 10);
  twinkle(ctx, ctx.dyn('star', 'Meadow Twinkle'), Math.round(jit(rng, 314, 3)), Math.round(jit(rng, 34, 2)), 11);

  drawGhostSilhouette(ctx, 'Meadow Fox Ghost', 'fox', Math.round(jit(rng, 154, 3)), Math.round(jit(rng, 108, 2)), 0.9);
  drawGhostSilhouette(ctx, 'Harvest Owl Ghost', 'owl', Math.round(jit(rng, 326, 3)), Math.round(jit(rng, 108, 2)), 0.9);
  drawGhostSilhouette(ctx, 'Harvest Moth Ghost', 'moth', Math.round(jit(rng, 444, 3)), Math.round(jit(rng, 112, 2)), 0.85);

  drawHorizonHills(ctx, { style: 'rolling', yBase: 162, yBottom: 218, layers: 2, labelPrefix: 'Quilted' });
  drawGroundDeck(ctx, { style: 'meadow', yTop: 206, yBottom: 250, labelPrefix: 'Hayride' });

  // Hero Hayride Harvest Wagon + Distant Windmill + Glowing Fairy Lantern
  const wagon = drawHayrideWagon(ctx, 240, 180, 1.06);
  const millL = drawMapleWindmill(ctx, 82, 168, 0.88, { label: 'Meadow' });
  const lampR = drawFairyLantern(ctx, 398, 174, 0.9, { label: 'Meadow', flip: -1 });

  ctx.ellipsePath('ring', ox, oy, orb.rx * 1.15, orb.ry * 1.3, 24, orb.tilt);
  const gallopPath = ctx.wavePath('gallop', 72, 232, 408, 232, 8, 2, 18);
  const sprintPath = ctx.wavePath('sprint', 68, 238, 412, 238, 7, 2.5, 18);
  const orbitPath = ctx.ellipsePath('orbit', 240, 96, 174, 46, 24);
  ctx.marginPath(256);

  ctx.actor('violet', 146, 242, { facing: 1, anim: 'idle' });
  ctx.actor('lumi', 240, 242, { facing: 1, anim: 'idle', pathIndex: gallopPath });
  ctx.actor('nova', 338, 240, { facing: -1, anim: 'run', pathIndex: sprintPath });
  ctx.actor('gazelle', 426, 240, { facing: -1, anim: 'leap', pathIndex: sprintPath });

  ctx.heroQuest('suns', 'Harvest Moon', [12, 13, ...lampR]);
  ctx.heroQuest('pumpkin', 'Hayride Wagon', [...wagon, ...millL]);
  ctx.heroQuest('lumi', 'Lumi', [5, 6, 7, 8]);
  ctx.heroQuest('nova', 'Nova', [9, 10, 11]);
  void orbitPath;
}

/** Chapter 5 (Grand Finale): The Grand Harvest Lantern Festival (50..70 regions!) */
function buildU16C5(ctx: SceneCtx): void {
  const { r, rng } = ctx;
  setupMeta(ctx, chapterTitle('u16_c5'), 240, 134);
  drawSkySparkles(ctx, 22, 118, 'petals');

  const ox = Math.round(jit(rng, 72, 3));
  const oy = Math.round(jit(rng, 52, 2));
  const orb = drawThemedOrb(ctx, ox, oy, 18, 'lanternMoon', { tilt: -0.24 });
  drawThemedCloud(ctx, 14, 62, 118, 76, 24, 'fluffy');
  drawThemedCloud(ctx, 15, 418, 118, 76, 24, 'fluffy');

  star(ctx, ctx.dyn('star', 'West Harvest Star'), 36, 24, 9.5);
  star(ctx, ctx.dyn('star', 'East Harvest Star'), 444, 24, 9.5);
  const eastMoon = ctx.dyn('star', 'Autumn Royal Crescent');
  crescent(ctx, eastMoon, 408, 52, 18, -0.42);
  twinkle(ctx, ctx.dyn('star', 'Festival Crown Star'), 240, 18, 10.5);

  drawGhostSilhouette(ctx, 'Festival Fox Ghost', 'fox', 152, 34, 0.85);
  drawGhostSilhouette(ctx, 'Harvest Owl Ghost', 'owl', 328, 34, 0.85);
  drawGhostSilhouette(ctx, 'Autumn Moth Ghost', 'moth', 30, 85, 0.9);

  // 10 radiant Golden Maple-Leaf Lantern Rays arcing behind the Grand Harvest Festival!
  const mcx = 240;
  const mcy = 132;
  const festivalRays: number[] = [];
  for (let i = 0; i < 10; i++) {
    const a = -Math.PI + ((i + 0.5) * Math.PI) / 10;
    const rid = ctx.dyn('star', `Harvest Lantern Ray ${i + 1}`);
    festivalRays.push(rid);
    const r0 = 38;
    const rMid = 66;
    const r1 = 94;
    const hw = 0.125;
    r.poly(rid, [
      [mcx + Math.cos(a) * r0, mcy + Math.sin(a) * r0 * 0.88],
      [mcx + Math.cos(a - hw) * rMid, mcy + Math.sin(a - hw) * rMid * 0.88],
      [mcx + Math.cos(a) * r1, mcy + Math.sin(a) * r1 * 0.88],
      [mcx + Math.cos(a + hw) * rMid, mcy + Math.sin(a + hw) * rMid * 0.88],
    ]);
    r.line(
      INK,
      mcx + Math.cos(a) * (r0 + 8),
      mcy + Math.sin(a) * (r0 + 8) * 0.88,
      mcx + Math.cos(a) * (r1 - 10),
      mcy + Math.sin(a) * (r1 - 10) * 0.88,
      { only: [rid] },
    );
  }

  drawHorizonHills(ctx, { style: 'rolling', yBase: 170, yBottom: 216, layers: 2, labelPrefix: 'Festival' });
  drawGroundDeck(ctx, { style: 'gardenPath', yTop: 208, yBottom: 250, labelPrefix: 'Festival' });

  // Grand Center Pumpkin Carriage + Flanking Maple Windmill & Acorn Cottage + Festival Lantern Pillars!
  const carriage = drawPumpkinCarriage(ctx, 240, 168, 1.06, { label: 'Festival' });
  const millL = drawMapleWindmill(ctx, 84, 168, 0.92, { label: 'Festival' });
  const cotR = drawAcornCottage(ctx, 396, 174, 0.92, { label: 'Festival', flip: -1 });
  const lampL = drawPaperLantern(ctx, 152, 164, 0.76, { label: 'Festival West' });
  const lampR = drawPaperLantern(ctx, 328, 164, 0.76, { label: 'Festival East' });
  const fairyL = drawFairyLantern(ctx, 146, 96, 0.65, { label: 'Sky West' });
  const fairyR = drawFairyLantern(ctx, 334, 96, 0.65, { label: 'Sky East', flip: -1 });

  ctx.ellipsePath('ring', ox, oy, orb.rx * 1.15, orb.ry * 1.3, 24, orb.tilt);
  const gallopPath = ctx.wavePath('gallop', 66, 236, 414, 236, 7, 2, 20);
  const sprintPath = ctx.wavePath('sprint', 88, 232, 392, 232, 9, 2.5, 20);
  const orbitPath = ctx.ellipsePath('orbit', 240, 108, 182, 54, 28);
  ctx.marginPath(256);

  ctx.actor('lumi', 152, 244, { facing: 1, anim: 'rear', pathIndex: gallopPath });
  ctx.actor('violet', 240, 248, { facing: 1, anim: 'idle' });
  ctx.actor('nova', 328, 244, { facing: -1, anim: 'leap', pathIndex: sprintPath });
  ctx.actor('moonCat', 64, 234, { facing: 1, anim: 'sleep' });
  ctx.actor('comet', 416, 84, { facing: -1, anim: 'float', pathIndex: orbitPath });

  ctx.heroQuest('pumpkin', 'Harvest Crown', [...carriage, ...festivalRays.slice(0, 5)]);
  ctx.heroQuest('violet', 'Violet', [1, 2, 3, 4]);
  ctx.heroQuest('lumi', 'Lumi', [5, 6, 7, 8]);
  ctx.heroQuest('nova', 'Nova', [9, 10, 11]);
  void millL;
  void cotR;
  void lampL;
  void lampR;
  void fairyL;
  void fairyR;
}

export const U16_SCENES: Record<U16SceneId, (ctx: SceneCtx) => void> = {
  hub_autumnHarvestHollow: buildHubAutumnHarvestHollow,
  u16_c1: buildU16C1,
  u16_c2a: buildU16C2a,
  u16_c2b: buildU16C2b,
  u16_c3a: buildU16C3a,
  u16_c3b: buildU16C3b,
  u16_c4a: buildU16C4a,
  u16_c4b: buildU16C4b,
  u16_c5: buildU16C5,
};
