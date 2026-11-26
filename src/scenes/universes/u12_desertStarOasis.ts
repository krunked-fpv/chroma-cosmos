/**
 * Universe 12: Starlight Dune Oasis (9 bespoke procedural scenes: 1 Hub + 8 Chapters).
 * Pure, deterministic (uses ctx.rng only), adheres to >= 60px region hygiene and bottom-margin reserve.
 */
import { MaterialId } from '../../contracts/materials';
import { UNIVERSE_BY_ID } from '../../contracts/universes';
import type { SceneCtx } from '../context';
import { crescent, inkArc, jit, star, twinkle } from '../props';
import { INK, W, type Pt } from '../raster';
import {
  drawClockworkGear,
  drawGhostSilhouette,
  drawGoldenSphinx,
  drawGroundDeck,
  drawHorizonHills,
  drawMagicCarpet,
  drawOasisPalm,
  drawPaperLantern,
  drawPyramidTemple,
  drawSanctuaryRoom,
  drawSkySparkles,
  drawThemedCloud,
  drawThemedOrb,
} from '../kit';

const U = UNIVERSE_BY_ID.desertStarOasis;

type U12SceneId =
  | 'hub_desertStarOasis'
  | 'u12_c1'
  | 'u12_c2a'
  | 'u12_c2b'
  | 'u12_c3a'
  | 'u12_c3b'
  | 'u12_c4a'
  | 'u12_c4b'
  | 'u12_c5';

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

/** Custom scalloped Moorish desert archway pavilion (3 chunky regions). */
function drawMiragePavilion(ctx: SceneCtx, cx: number, cy: number, scale = 1): number[] {
  const { r } = ctx;
  const s = scale;
  const dome = ctx.dyn('star', 'Pavilion Onion Dome');
  const arch = ctx.dyn('prop', 'Tiled Mirage Arch');
  const columns = ctx.dyn('prop', 'Pavilion Columns');

  // Flanking columns & bases
  r.rect(columns, cx - 44 * s, cy - 10 * s, cx - 28 * s, cy + 36 * s);
  r.rect(columns, cx + 28 * s, cy - 10 * s, cx + 44 * s, cy + 36 * s);
  r.rect(columns, cx - 48 * s, cy + 28 * s, cx - 24 * s, cy + 36 * s);
  r.rect(columns, cx + 24 * s, cy + 28 * s, cx + 48 * s, cy + 36 * s);
  r.line(INK, cx - 36 * s, cy - 6 * s, cx - 36 * s, cy + 28 * s, { only: [columns] });
  r.line(INK, cx + 36 * s, cy - 6 * s, cx + 36 * s, cy + 28 * s, { only: [columns] });

  // Scalloped tiled arch spandrel
  r.shape(arch, cx - 46 * s, cy - 22 * s, cx + 46 * s, cy + 12 * s, (px, py) => {
    if (py < cy - 20 * s || py > cy + 10 * s) return false;
    if (Math.abs(px - cx) > 44 * s) return false;
    const dx = (px - cx) / (26 * s);
    const dy = (py - (cy + 10 * s)) / (22 * s);
    return dx * dx + dy * dy >= 1;
  });
  for (let gx = -34; gx <= 34; gx += 17) {
    r.line(INK, cx + gx * s, cy - 18 * s, cx + gx * s, cy - 8 * s, { only: [arch] });
  }

  // Jewel-crowned onion dome + crescent finial
  r.ellipse(dome, cx, cy - 28 * s, 26 * s, 16 * s);
  r.poly(dome, [
    [cx, cy - 52 * s],
    [cx + 15 * s, cy - 34 * s],
    [cx - 15 * s, cy - 34 * s],
  ]);
  inkArc(r, cx, cy - 28 * s, 14 * s, 14 * s, 0, Math.PI * 2, 0, { only: [dome] });

  return [dome, arch, columns];
}

/** Custom tiered oasis turquoise fountain with sparkling water jets (3 regions). */
function drawOasisFountain(ctx: SceneCtx, cx: number, cy: number, scale = 1): number[] {
  const { r } = ctx;
  const s = scale;
  const spray = ctx.dyn('cloud', 'Sparkling Water Jets');
  const upperBasin = ctx.dyn('prop', 'Carved Fountain Tier');
  const pool = ctx.dyn('star', 'Turquoise Spring Basin');

  // Plume of sparkling fountain jets
  r.disc(spray, cx, cy - 24 * s, 11 * s);
  r.capsule(spray, cx, cy - 24 * s, cx - 18 * s, cy - 6 * s, 5 * s);
  r.capsule(spray, cx, cy - 24 * s, cx + 18 * s, cy - 6 * s, 5 * s);
  inkArc(r, cx - 10 * s, cy - 16 * s, 8 * s, 6 * s, Math.PI * 1.1, Math.PI * 1.9, 0, { only: [spray] });
  inkArc(r, cx + 10 * s, cy - 16 * s, 8 * s, 6 * s, Math.PI * 1.1, Math.PI * 1.9, 0, { only: [spray] });

  // Upper carved stone chalice tier
  r.poly(upperBasin, [
    [cx - 24 * s, cy - 8 * s],
    [cx + 24 * s, cy - 8 * s],
    [cx + 14 * s, cy + 6 * s],
    [cx - 14 * s, cy + 6 * s],
  ]);
  r.rect(upperBasin, cx - 9 * s, cy + 4 * s, cx + 9 * s, cy + 20 * s);

  // Broad lower fountain basin + tiled rim
  r.ellipse(pool, cx, cy + 22 * s, 40 * s, 13 * s);
  inkArc(r, cx, cy + 22 * s, 30 * s, 8 * s, 0, Math.PI * 2, 0, { only: [pool] });
  r.line(INK, cx - 22 * s, cy + 22 * s, cx + 22 * s, cy + 22 * s, { only: [pool] });

  return [spray, upperBasin, pool];
}

/** Custom striped silk spice-bazaar stall with tasseled canopy & jewel bowls (3 regions). */
function drawBazaarStall(ctx: SceneCtx, cx: number, cy: number, scale = 1, labelPrefix = 'Spice'): number[] {
  const { r } = ctx;
  const s = scale;
  const canopy = ctx.dyn('prop', `${labelPrefix} Silk Canopy`);
  const counter = ctx.dyn('prop', `${labelPrefix} Market Counter`);
  const wares = ctx.dyn('star', `${labelPrefix} Jewel Bowls`);

  // Wooden booth posts + tiled base counter
  r.rect(counter, cx - 34 * s, cy - 12 * s, cx - 26 * s, cy + 32 * s);
  r.rect(counter, cx + 26 * s, cy - 12 * s, cx + 34 * s, cy + 32 * s);
  r.rect(counter, cx - 38 * s, cy + 8 * s, cx + 38 * s, cy + 34 * s);
  for (const bx of [-18, 0, 18]) {
    r.line(INK, cx + bx * s, cy + 10 * s, cx + bx * s, cy + 32 * s, { only: [counter] });
  }

  // Heaped spice & star-gem bowls on counter
  r.disc(wares, cx - 15 * s, cy + 2 * s, 9 * s);
  r.disc(wares, cx + 2 * s, cy, 10 * s);
  r.disc(wares, cx + 18 * s, cy + 2 * s, 8.5 * s);
  r.line(INK, cx - 22 * s, cy + 5 * s, cx + 24 * s, cy + 5 * s, { only: [wares] });

  // Peaked scalloped silk bazaar awning
  r.poly(canopy, [
    [cx, cy - 36 * s],
    [cx + 42 * s, cy - 12 * s],
    [cx - 42 * s, cy - 12 * s],
  ]);
  for (const ox of [-30, -15, 0, 15, 30]) {
    r.disc(canopy, cx + ox * s, cy - 11 * s, 7.5 * s);
  }
  r.line(INK, cx, cy - 33 * s, cx - 16 * s, cy - 13 * s, { only: [canopy] });
  r.line(INK, cx, cy - 33 * s, cx + 16 * s, cy - 13 * s, { only: [canopy] });

  return [canopy, counter, wares];
}

/** Custom celestial desert obelisk with engraved star glyphs (2 regions). */
function drawStarObelisk(ctx: SceneCtx, cx: number, cy: number, scale = 1, prefix = 'Desert'): number[] {
  const { r } = ctx;
  const s = scale;
  const shaft = ctx.dyn('prop', `${prefix} Star Obelisk`);
  const tip = ctx.dyn('star', `${prefix} Obelisk Apex`);

  r.poly(shaft, [
    [cx - 10 * s, cy - 22 * s],
    [cx + 10 * s, cy - 22 * s],
    [cx + 16 * s, cy + 34 * s],
    [cx - 16 * s, cy + 34 * s],
  ]);
  r.rect(shaft, cx - 22 * s, cy + 26 * s, cx + 22 * s, cy + 36 * s);
  r.line(INK, cx, cy - 16 * s, cx, cy + 24 * s, { only: [shaft] });
  for (const gy of [-6, 6, 16]) {
    r.line(INK, cx - 7 * s, cy + gy * s, cx + 7 * s, cy + gy * s, { only: [shaft] });
  }

  r.poly(tip, [
    [cx, cy - 42 * s],
    [cx + 11 * s, cy - 22 * s],
    [cx - 11 * s, cy - 22 * s],
  ]);
  return [shaft, tip];
}

/** Custom jeweled desert silk tent for the caravan (3 regions). */
function drawCaravanTent(ctx: SceneCtx, cx: number, cy: number, scale = 1, prefix = 'Caravan'): number[] {
  const { r } = ctx;
  const s = scale;
  const roof = ctx.dyn('prop', `${prefix} Silk Roof`);
  const body = ctx.dyn('prop', `${prefix} Tent Drapes`);
  const crest = ctx.dyn('star', `${prefix} Crescent Finial`);

  r.poly(body, [
    [cx - 34 * s, cy - 2 * s],
    [cx + 34 * s, cy - 2 * s],
    [cx + 38 * s, cy + 34 * s],
    [cx - 38 * s, cy + 34 * s],
  ]);
  r.line(INK, cx - 14 * s, cy + 2 * s, cx - 18 * s, cy + 32 * s, { only: [body] });
  r.line(INK, cx + 14 * s, cy + 2 * s, cx + 18 * s, cy + 32 * s, { only: [body] });
  inkArc(r, cx, cy + 34 * s, 12 * s, 20 * s, Math.PI, Math.PI * 2, 0, { only: [body] });

  r.poly(roof, [
    [cx, cy - 32 * s],
    [cx + 42 * s, cy],
    [cx - 42 * s, cy],
  ]);
  for (const ox of [-28, -14, 0, 14, 28]) {
    r.disc(roof, cx + ox * s, cy, 6.5 * s);
  }
  r.line(INK, cx, cy - 28 * s, cx - 14 * s, cy - 2 * s, { only: [roof] });
  r.line(INK, cx, cy - 28 * s, cx + 14 * s, cy - 2 * s, { only: [roof] });

  crescent(ctx, crest, cx, cy - 38 * s, 10 * s, -0.5);
  return [roof, body, crest];
}

/** Hub Sanctuary: Violet's Silk-Tent Star Observatory */
function buildHubDesertStarOasis(ctx: SceneCtx): void {
  ctx.universeId = U.id;
  ctx.ambient = U.ambient;

  let customIds: number[] = [];
  const res = drawSanctuaryRoom(ctx, {
    title: U.hubTitle,
    sky: { ...U.sky },
    palette: {
      wallPanel: MaterialId.VelvetNebula,
      floor: MaterialId.SolarCheetahAmber,
      windowFrame: MaterialId.RoyalAstralGold,
      windowGlass: MaterialId.DeepSpaceBiolum,
      curtain: MaterialId.StrawberrySupernova,
      orbCore: MaterialId.SolarFlare24K,
      orbRing: MaterialId.RoyalAstralGold,
      rugOuter: MaterialId.RoyalAstralGold,
      rugInner: MaterialId.DragonflyIridescence,
      furniture: MaterialId.RoyalAstralGold,
      furnitureTrim: MaterialId.SolarFlare24K,
      accentA: MaterialId.SolarFlare24K,
      accentB: MaterialId.CrystalGlacierMint,
      accentC: MaterialId.SupernovaGlitter,
    },
    windowShape: 'dome',
    windowOrbStyle: 'astrolabe',
    wallStyle: 'fabric',
    floorStyle: 'sandstone',
    rugShape: 'diamond',
    lampStyle: 'lantern',
    garlandStyle: 'lanterns',
    sparkleStyle: 'stars',
    seatingLabel: 'Silk Oasis Divan',
    workbenchLabel: 'Star-Chart Desk',
    shelfLabel: 'Desert Scroll Shelf',
    trinketLabels: ['Dune Star Charts', 'Spice Glass Jars', 'Oasis Folklore'],
    drawWindowView: (c, wx, _wy, _wHalf, wBot) => {
      // Distant dune ridge & tiny golden pyramid silhouette inside lower window glass
      const dune = c.dyn('prop', 'Window Desert Dune');
      c.r.poly(dune, [
        [wx - 34, wBot - 2],
        [wx - 10, wBot - 16],
        [wx + 16, wBot - 11],
        [wx + 34, wBot - 20],
        [wx + 34, wBot - 2],
      ]);
      c.preColor(dune, MaterialId.SolarCheetahAmber);

      const pyr = c.dyn('star', 'Window Mini Pyramid');
      c.r.poly(pyr, [
        [wx - 22, wBot - 8],
        [wx - 8, wBot - 28],
        [wx + 6, wBot - 8],
      ]);
      c.r.line(INK, wx - 8, wBot - 25, wx - 5, wBot - 9, { only: [pyr] });
      c.preColor(pyr, MaterialId.SolarFlare24K);
    },
    drawExtraProps: (c) => {
      const ids: number[] = [];
      // 1) Hanging oasis tapestry medallion on left upper wall
      const tap = c.dyn('prop', 'Desert Star Tapestry');
      c.r.poly(tap, [[66, 70], [102, 70], [102, 108], [84, 118], [66, 108]]);
      c.r.line(INK, 84, 75, 84, 111, { only: [tap] });
      c.r.line(INK, 72, 92, 96, 92, { only: [tap] });
      c.preColor(tap, MaterialId.RoyalAstralGold);
      ids.push(tap);

      // 2) Mounted brass star-compass medallion on right upper wall
      const comp = c.dyn('star', 'Wall Astrolabe Ring');
      c.r.disc(comp, 352, 88, 16);
      inkArc(c.r, 352, 88, 10, 10, 0, Math.PI * 2, 0, { only: [comp] });
      c.r.line(INK, 352, 74, 352, 102, { only: [comp] });
      c.r.line(INK, 338, 88, 366, 88, { only: [comp] });
      c.preColor(comp, MaterialId.CrystalGlacierMint);
      ids.push(comp);

      // 3) Floor brass star-lantern brazier right of Violet
      const brazier = c.dyn('star', 'Brass Star Brazier');
      c.r.ellipse(brazier, 276, 214, 14, 10);
      c.r.rect(brazier, 270, 222, 282, 234);
      c.r.ellipse(brazier, 276, 236, 13, 5);
      c.r.line(INK, 266, 214, 286, 214, { only: [brazier] });
      c.preColor(brazier, MaterialId.SolarFlare24K);
      ids.push(brazier);

      // 4) Golden genie-style star lamp resting on right side of craft desk
      const deskLamp = c.dyn('star', 'Desk Genie Lamp');
      c.r.ellipse(deskLamp, 376, 170, 14, 8);
      c.r.poly(deskLamp, [[384, 166], [394, 158], [392, 168]]);
      c.r.ellipse(deskLamp, 376, 178, 9, 4);
      c.preColor(deskLamp, MaterialId.HoloFoil);
      ids.push(deskLamp);

      customIds = ids;
      return ids;
    },
  });

  ctx.heroQuest('violet', 'Violet', [1, 2, 3, 4]);
  ctx.heroQuest('planet', 'Astrolabe', [12, 13]);
  ctx.heroQuest('lantern', 'Oasis Brass', customIds);
  ctx.heroQuest('pyramid', 'Window View', res.roomIds.slice(2, 4));
}

/** Chapter 1: The Crescent Oasis Palm Pool */
function buildU12C1(ctx: SceneCtx): void {
  const { r, rng } = ctx;
  setupMeta(ctx, chapterTitle('u12_c1'), 240, 160);
  drawSkySparkles(ctx, 18, 128, 'stars');

  // Celestial astrolabe orb (12/13) & fluffy desert night clouds (14/15)
  const ox = Math.round(jit(rng, 240, 4));
  const oy = Math.round(jit(rng, 52, 3));
  const orb = drawThemedOrb(ctx, ox, oy, 20, 'astrolabe', { tilt: -0.24 });
  drawThemedCloud(ctx, 14, Math.round(jit(rng, 102, 4)), Math.round(jit(rng, 50, 3)), 84, 28, 'fluffy');
  drawThemedCloud(ctx, 15, Math.round(jit(rng, 382, 4)), Math.round(jit(rng, 52, 3)), 82, 28, 'fluffy');

  // Sky stars & crescent
  const s1 = ctx.dyn('star', 'Oasis Zenith Star');
  star(ctx, s1, Math.round(jit(rng, 174, 3)), Math.round(jit(rng, 32, 2)), 10);
  const s2 = ctx.dyn('star', 'Dune Twinkle');
  twinkle(ctx, s2, Math.round(jit(rng, 314, 3)), Math.round(jit(rng, 36, 2)), 11);

  // 2 Ghosts in open sky
  drawGhostSilhouette(ctx, 'Dune-Star Camel Ghost', 'camel', Math.round(jit(rng, 166, 3)), Math.round(jit(rng, 98, 2)), 0.95);
  drawGhostSilhouette(ctx, 'Desert Fox Ghost', 'fox', Math.round(jit(rng, 322, 3)), Math.round(jit(rng, 96, 2)), 0.95);

  // Sweeping layered starlight dunes
  drawHorizonHills(ctx, { style: 'dunes', yBase: 162, yBottom: 248, layers: 2 });

  // Stepped sandstone oasis rim + shimmering turquoise crescent spring pool
  const poolRim = ctx.dyn('prop', 'Sandstone Oasis Rim');
  r.ellipse(poolRim, 240, 224, 146, 26);
  const poolWater = ctx.dyn('star', 'Turquoise Oasis Pool');
  r.ellipse(poolWater, 240, 224, 128, 19);
  for (const [rx0, ry0, rw] of [[186, 220, 26], [244, 228, 34], [298, 219, 24]] as const) {
    r.line(INK, rx0 - rw, ry0, rx0 + rw, ry0, { only: [poolWater] });
  }

  // Twin swaying oasis palms framing the pool
  const palmL = drawOasisPalm(ctx, 76, 178, 0.95, { label: 'West' });
  const palmR = drawOasisPalm(ctx, 404, 178, 0.95, { label: 'East', flip: -1 });

  // Hanging oasis lanterns beside the water
  const lampL = drawPaperLantern(ctx, 144, 168, 0.72, { label: 'West Oasis' });
  const lampR = drawPaperLantern(ctx, 336, 168, 0.72, { label: 'East Oasis' });

  // Paths
  ctx.ellipsePath('ring', ox, oy, orb.rx * 1.15, orb.ry * 1.3, 24, orb.tilt);
  const gallopPath = ctx.wavePath('gallop', 84, 194, 396, 194, 10, 2, 18);
  const orbitPath = ctx.ellipsePath('orbit', 240, 96, 176, 48, 24);
  ctx.marginPath(256);

  // Actors (well-spaced, clear of palms & lamps)
  ctx.actor('violet', 194, 232, { facing: 1, anim: 'idle' });
  ctx.actor('lumi', 292, 232, { facing: -1, anim: 'idle', pathIndex: gallopPath });
  ctx.actor('moonCat', 240, 212, { facing: 1, anim: 'sleep' });
  ctx.actor('comet', 432, 92, { facing: -1, anim: 'float', pathIndex: orbitPath });

  ctx.heroQuest('lantern', 'Oasis Pool', [poolWater, ...lampL, ...lampR]);
  ctx.heroQuest('violet', 'Violet', [1, 2, 3, 4]);
  ctx.heroQuest('lumi', 'Lumi', [5, 6, 7, 8]);
  ctx.heroQuest('planet', 'Star Palms', [12, 13, ...palmL, ...palmR]);
}

/** Chapter 2A: The Flying-Carpet Cloud Bazaar */
function buildU12C2a(ctx: SceneCtx): void {
  const { rng } = ctx;
  setupMeta(ctx, chapterTitle('u12_c2a'), 240, 134);
  drawSkySparkles(ctx, 18, 126, 'stars');

  const ox = Math.round(jit(rng, 372, 4));
  const oy = Math.round(jit(rng, 52, 3));
  const orb = drawThemedOrb(ctx, ox, oy, 20, 'lanternMoon', { tilt: -0.22 });
  drawThemedCloud(ctx, 14, Math.round(jit(rng, 102, 4)), Math.round(jit(rng, 46, 3)), 86, 28, 'fluffy');
  drawThemedCloud(ctx, 15, Math.round(jit(rng, 244, 4)), Math.round(jit(rng, 40, 3)), 76, 26, 'fluffy');

  star(ctx, ctx.dyn('star', 'Bazaar Guiding Star'), Math.round(jit(rng, 180, 3)), Math.round(jit(rng, 70, 2)), 10);
  twinkle(ctx, ctx.dyn('star', 'Lantern Sparkle'), Math.round(jit(rng, 444, 3)), Math.round(jit(rng, 88, 2)), 11);

  // 3 Ghosts in open sky
  drawGhostSilhouette(ctx, 'Bazaar Camel Ghost', 'camel', Math.round(jit(rng, 54, 3)), Math.round(jit(rng, 98, 2)), 0.9);
  drawGhostSilhouette(ctx, 'Night Owl Ghost', 'owl', Math.round(jit(rng, 294, 3)), Math.round(jit(rng, 86, 2)), 0.9);
  drawGhostSilhouette(ctx, 'Bazaar Cat Ghost', 'cat', Math.round(jit(rng, 446, 3)), Math.round(jit(rng, 132, 2)), 0.85);

  drawHorizonHills(ctx, { style: 'dunes', yBase: 168, yBottom: 218, layers: 2 });
  drawGroundDeck(ctx, { style: 'courtyard', yTop: 206, yBottom: 250 });

  // Twin Silk Spice-Bazaar Stalls on the courtyard deck
  const stallL = drawBazaarStall(ctx, 88, 184, 0.92, 'Saffron');
  const stallR = drawBazaarStall(ctx, 392, 184, 0.92, 'Cardamom');

  // Two soaring Magic Carpets gliding above the bazaar!
  const carpetA = drawMagicCarpet(ctx, 186, 122, 0.88, { label: 'Royal' });
  const carpetB = drawMagicCarpet(ctx, 326, 138, 0.8, { label: 'Twilight', flip: -1 });

  // Central bazaar hanging star-lantern
  const lampC = drawPaperLantern(ctx, 248, 184, 0.78, { label: 'Bazaar' });

  ctx.ellipsePath('ring', ox, oy, orb.rx * 1.15, orb.ry * 1.3, 24, orb.tilt);
  const sprintPath = ctx.wavePath('sprint', 64, 232, 416, 232, 8, 2, 18);
  const orbitPath = ctx.ellipsePath('orbit', 240, 108, 170, 48, 24);
  ctx.marginPath(256);

  ctx.actor('violet', 166, 242, { facing: 1, anim: 'idle' });
  ctx.actor('nova', 308, 240, { facing: -1, anim: 'idle', pathIndex: sprintPath });
  ctx.actor('moonCat', 186, 114, { facing: 1, anim: 'sleep' });
  ctx.actor('comet', 248, 84, { facing: 1, anim: 'float', pathIndex: orbitPath });

  ctx.heroQuest('tent', 'Spice Bazaar', [...stallL, ...stallR]);
  ctx.heroQuest('lantern', 'Magic Carpets', [...carpetA, ...carpetB, ...lampC]);
  ctx.heroQuest('nova', 'Nova', [9, 10, 11]);
  ctx.heroQuest('planet', 'Lantern Moon', [12, 13]);
}

/** Chapter 2B: The Singing Sand-Dune Ridge */
function buildU12C2b(ctx: SceneCtx): void {
  const { r, rng } = ctx;
  setupMeta(ctx, chapterTitle('u12_c2b'), 240, 154);
  drawSkySparkles(ctx, 20, 122, 'notes');

  const ox = Math.round(jit(rng, 88, 4));
  const oy = Math.round(jit(rng, 52, 3));
  const orb = drawThemedOrb(ctx, ox, oy, 20, 'ringedPlanet', { tilt: -0.28 });
  drawThemedCloud(ctx, 14, Math.round(jit(rng, 246, 4)), Math.round(jit(rng, 44, 3)), 94, 26, 'sakura');
  drawThemedCloud(ctx, 15, Math.round(jit(rng, 404, 4)), Math.round(jit(rng, 54, 3)), 82, 26, 'sakura');

  star(ctx, ctx.dyn('star', 'Singing Dune Star'), Math.round(jit(rng, 166, 3)), Math.round(jit(rng, 36, 2)), 10.5);
  twinkle(ctx, ctx.dyn('star', 'Wind Chime Star'), Math.round(jit(rng, 332, 3)), Math.round(jit(rng, 36, 2)), 11);

  drawGhostSilhouette(ctx, 'Melody Clef Ghost', 'treble', Math.round(jit(rng, 162, 3)), Math.round(jit(rng, 98, 2)), 0.92);
  drawGhostSilhouette(ctx, 'Sand-Fox Ghost', 'fox', Math.round(jit(rng, 326, 3)), Math.round(jit(rng, 98, 2)), 0.92);

  // Sweeping 3-layer singing sand dunes
  drawHorizonHills(ctx, { style: 'dunes', yBase: 146, yBottom: 248, layers: 3 });

  // Custom Desert Crescent Wind-Harp Monument on center ridge (3 regions)
  const harpBase = ctx.dyn('prop', 'Dune Harp Pedestal');
  const harpArc = ctx.dyn('star', 'Crescent Wind Harp');
  const chimeDisc = ctx.dyn('star', 'Singing Chime Gem');
  r.poly(harpBase, [[210, 198], [270, 198], [278, 214], [202, 214]]);
  crescent(ctx, harpArc, 240, 162, 34, -0.4);
  for (const sy of [146, 156, 166, 176]) {
    r.line(INK, 224, sy, 256, sy, { only: [harpArc] });
  }
  r.disc(chimeDisc, 256, 156, 11);
  inkArc(r, 256, 156, 6, 6, 0, Math.PI * 2, 0, { only: [chimeDisc] });

  // Swaying palms framing the dune ridge
  const palmL = drawOasisPalm(ctx, 64, 176, 0.9, { label: 'Ridge West' });
  const palmR = drawOasisPalm(ctx, 418, 178, 0.9, { label: 'Ridge East', flip: -1 });

  ctx.ellipsePath('ring', ox, oy, orb.rx * 1.15, orb.ry * 1.3, 24, orb.tilt);
  const gallopPath = ctx.wavePath('gallop', 66, 218, 414, 218, 12, 2, 20);
  const sprintPath = ctx.wavePath('sprint', 74, 236, 408, 232, 8, 2.5, 20);
  const orbitPath = ctx.ellipsePath('orbit', 240, 88, 178, 42, 24);
  ctx.marginPath(256);

  ctx.actor('lumi', 142, 236, { facing: 1, anim: 'rear', pathIndex: gallopPath });
  ctx.actor('nova', 332, 238, { facing: -1, anim: 'leap', pathIndex: sprintPath });
  ctx.actor('gazelle', 238, 242, { facing: 1, anim: 'run', pathIndex: sprintPath });
  ctx.actor('comet', 432, 96, { facing: -1, anim: 'float', pathIndex: orbitPath });

  ctx.heroQuest('suns', 'Wind Harp', [harpBase, harpArc, chimeDisc]);
  ctx.heroQuest('lumi', 'Lumi', [5, 6, 7, 8]);
  ctx.heroQuest('nova', 'Nova', [9, 10, 11]);
  ctx.heroQuest('planet', 'Star Palms', [12, 13, ...palmL, ...palmR]);
}

/** Chapter 3A: The Star-Glass Pyramid Courtyard */
function buildU12C3a(ctx: SceneCtx): void {
  const { rng } = ctx;
  setupMeta(ctx, chapterTitle('u12_c3a'), 240, 150);
  drawSkySparkles(ctx, 18, 124, 'stars');

  const ox = Math.round(jit(rng, 384, 4));
  const oy = Math.round(jit(rng, 52, 3));
  const orb = drawThemedOrb(ctx, ox, oy, 20, 'astrolabe', { tilt: -0.26 });
  drawThemedCloud(ctx, 14, Math.round(jit(rng, 96, 4)), Math.round(jit(rng, 46, 3)), 88, 28, 'fluffy');
  drawThemedCloud(ctx, 15, Math.round(jit(rng, 250, 4)), Math.round(jit(rng, 38, 3)), 76, 24, 'fluffy');

  star(ctx, ctx.dyn('star', 'Pyramid North Star'), Math.round(jit(rng, 182, 3)), Math.round(jit(rng, 68, 2)), 10);
  twinkle(ctx, ctx.dyn('star', 'Moonlight Prism'), Math.round(jit(rng, 314, 3)), Math.round(jit(rng, 68, 2)), 11);

  drawGhostSilhouette(ctx, 'Golden Scarab Ghost', 'scarab', Math.round(jit(rng, 148, 3)), Math.round(jit(rng, 102, 2)), 0.92);
  drawGhostSilhouette(ctx, 'Star Crystal Ghost', 'crystal', Math.round(jit(rng, 336, 3)), Math.round(jit(rng, 104, 2)), 0.9);
  drawGhostSilhouette(ctx, 'Dune Camel Ghost', 'camel', Math.round(jit(rng, 444, 3)), Math.round(jit(rng, 112, 2)), 0.85);

  drawHorizonHills(ctx, { style: 'dunes', yBase: 170, yBottom: 218, layers: 2 });
  drawGroundDeck(ctx, { style: 'courtyard', yTop: 208, yBottom: 250 });

  // Grand central Star-Glass Pyramid + twin flanking star obelisks + guardian sphinx
  const pyr = drawPyramidTemple(ctx, 240, 166, 1.15, { label: 'Star-Glass' });
  const obL = drawStarObelisk(ctx, 128, 174, 0.92, 'West');
  const obR = drawStarObelisk(ctx, 352, 174, 0.92, 'East');
  const sphinx = drawGoldenSphinx(ctx, 64, 198, 0.72, { label: 'Courtyard' });

  ctx.ellipsePath('ring', ox, oy, orb.rx * 1.15, orb.ry * 1.3, 24, orb.tilt);
  const gallopPath = ctx.wavePath('gallop', 72, 232, 410, 232, 8, 2, 18);
  const orbitPath = ctx.ellipsePath('orbit', 240, 96, 176, 46, 24);
  ctx.marginPath(256);

  ctx.actor('violet', 184, 242, { facing: 1, anim: 'idle' });
  ctx.actor('lumi', 312, 240, { facing: -1, anim: 'idle', pathIndex: gallopPath });
  ctx.actor('moonCat', 426, 232, { facing: -1, anim: 'sleep' });
  ctx.actor('comet', 62, 98, { facing: 1, anim: 'float', pathIndex: orbitPath });

  ctx.heroQuest('pyramid', 'Star Pyramid', [...pyr, ...sphinx]);
  ctx.heroQuest('lantern', 'Star Obelisks', [...obL, ...obR]);
  ctx.heroQuest('violet', 'Violet', [1, 2, 3, 4]);
  ctx.heroQuest('lumi', 'Lumi', [5, 6, 7, 8]);
}

/** Chapter 3B: The Celestial Astrolabe Tower */
function buildU12C3b(ctx: SceneCtx): void {
  const { r, rng } = ctx;
  setupMeta(ctx, chapterTitle('u12_c3b'), 240, 146);
  drawSkySparkles(ctx, 20, 124, 'gears');

  const ox = Math.round(jit(rng, 92, 4));
  const oy = Math.round(jit(rng, 52, 3));
  const orb = drawThemedOrb(ctx, ox, oy, 20, 'astrolabe', { tilt: -0.24 });
  drawThemedCloud(ctx, 14, Math.round(jit(rng, 250, 4)), Math.round(jit(rng, 42, 3)), 88, 26, 'fluffy');
  drawThemedCloud(ctx, 15, Math.round(jit(rng, 404, 4)), Math.round(jit(rng, 52, 3)), 84, 28, 'fluffy');

  star(ctx, ctx.dyn('star', 'Celestial Polar Star'), Math.round(jit(rng, 172, 3)), Math.round(jit(rng, 38, 2)), 10);
  twinkle(ctx, ctx.dyn('star', 'Meridian Twinkle'), Math.round(jit(rng, 336, 3)), Math.round(jit(rng, 40, 2)), 11);

  drawGhostSilhouette(ctx, 'Observatory Owl Ghost', 'owl', Math.round(jit(rng, 162, 3)), Math.round(jit(rng, 96, 2)), 0.92);
  drawGhostSilhouette(ctx, 'Constellation Crystal', 'crystal', Math.round(jit(rng, 326, 3)), Math.round(jit(rng, 96, 2)), 0.9);

  drawHorizonHills(ctx, { style: 'mesas', yBase: 168, yBottom: 218, layers: 2 });
  drawGroundDeck(ctx, { style: 'courtyard', yTop: 206, yBottom: 250 });

  // Custom Celestial Astrolabe Observatory Tower in center (4 regions)
  const towerBase = ctx.dyn('prop', 'Astrolabe Tower Walls');
  const towerDome = ctx.dyn('star', 'Observatory Brass Dome');
  const towerRings = ctx.dyn('star', 'Tower Armillary Rings');
  const towerDoor = ctx.dyn('prop', 'Star-Chart Portal');

  r.poly(towerBase, [[204, 134], [276, 134], [286, 210], [194, 210]]);
  for (const ty of [152, 170, 188]) {
    r.line(INK, 202, ty, 278, ty, { only: [towerBase] });
  }
  r.disc(towerDome, 240, 132, 36);
  r.line(INK, 240, 98, 240, 132, { only: [towerDome] });
  inkArc(r, 240, 132, 22, 34, Math.PI, Math.PI * 2, 0, { only: [towerDome] });

  // Spinning brass armillary halo crowning the dome
  r.shape(towerRings, 194, 72, 286, 128, (px, py) => {
    const d = Math.hypot((px - 240) / 42, (py - 102) / 14);
    return d <= 1 && d >= 0.68;
  });
  r.disc(towerRings, 240, 86, 8);

  r.disc(towerDoor, 240, 184, 13);
  r.rect(towerDoor, 227, 184, 253, 210);
  r.line(INK, 240, 173, 240, 208, { only: [towerDoor] });

  // Flanking brass clockwork celestial dial + floating magic carpet
  const dialL = drawClockworkGear(ctx, 84, 174, 0.85, { label: 'Astrolabe' });
  const carpetR = drawMagicCarpet(ctx, 396, 142, 0.85, { label: 'Chart', flip: -1 });

  ctx.ellipsePath('ring', ox, oy, orb.rx * 1.15, orb.ry * 1.3, 24, orb.tilt);
  const sprintPath = ctx.wavePath('sprint', 68, 232, 412, 232, 8, 2, 18);
  const orbitPath = ctx.ellipsePath('orbit', 240, 96, 174, 48, 24);
  ctx.marginPath(256);

  ctx.actor('violet', 156, 242, { facing: 1, anim: 'idle' });
  ctx.actor('nova', 332, 240, { facing: -1, anim: 'idle', pathIndex: sprintPath });
  ctx.actor('moonCat', 396, 134, { facing: -1, anim: 'sleep' });
  ctx.actor('comet', 442, 94, { facing: -1, anim: 'float', pathIndex: orbitPath });

  ctx.heroQuest('lantern', 'Star Tower', [towerBase, towerDome, towerRings, towerDoor]);
  ctx.heroQuest('planet', 'Brass Dials', [12, 13, ...dialL]);
  ctx.heroQuest('violet', 'Violet', [1, 2, 3, 4]);
  ctx.heroQuest('nova', 'Nova', [9, 10, 11]);
  void carpetR;
}

/** Chapter 4A: The Mirage Fountain Pavilion */
function buildU12C4a(ctx: SceneCtx): void {
  const { rng } = ctx;
  setupMeta(ctx, chapterTitle('u12_c4a'), 240, 152);
  drawSkySparkles(ctx, 18, 122, 'bubbles');

  const ox = Math.round(jit(rng, 378, 4));
  const oy = Math.round(jit(rng, 52, 3));
  const orb = drawThemedOrb(ctx, ox, oy, 20, 'pearlMoon', { tilt: -0.24 });
  drawThemedCloud(ctx, 14, Math.round(jit(rng, 102, 4)), Math.round(jit(rng, 48, 3)), 86, 28, 'fluffy');
  drawThemedCloud(ctx, 15, Math.round(jit(rng, 250, 4)), Math.round(jit(rng, 40, 3)), 76, 26, 'fluffy');

  star(ctx, ctx.dyn('star', 'Mirage Evening Star'), Math.round(jit(rng, 184, 3)), Math.round(jit(rng, 66, 2)), 10);
  twinkle(ctx, ctx.dyn('star', 'Fountain Gleam'), Math.round(jit(rng, 314, 3)), Math.round(jit(rng, 68, 2)), 11);

  drawGhostSilhouette(ctx, 'Mirage Fox Ghost', 'fox', Math.round(jit(rng, 154, 3)), Math.round(jit(rng, 102, 2)), 0.92);
  drawGhostSilhouette(ctx, 'Oasis Camel Ghost', 'camel', Math.round(jit(rng, 336, 3)), Math.round(jit(rng, 104, 2)), 0.9);
  drawGhostSilhouette(ctx, 'Sleepy Oasis Cat', 'cat', Math.round(jit(rng, 444, 3)), Math.round(jit(rng, 116, 2)), 0.85);

  drawHorizonHills(ctx, { style: 'dunes', yBase: 168, yBottom: 218, layers: 2 });
  drawGroundDeck(ctx, { style: 'courtyard', yTop: 206, yBottom: 250 });

  // Moorish Mirage Pavilion arch behind + Tiered Turquoise Oasis Fountain in front
  const pavilion = drawMiragePavilion(ctx, 128, 174, 0.95);
  const fountain = drawOasisFountain(ctx, 276, 186, 0.98);
  const palmR = drawOasisPalm(ctx, 412, 174, 0.92, { label: 'Mirage', flip: -1 });
  const lampL = drawPaperLantern(ctx, 44, 158, 0.72, { label: 'Pavilion' });

  ctx.ellipsePath('ring', ox, oy, orb.rx * 1.15, orb.ry * 1.3, 24, orb.tilt);
  const gallopPath = ctx.wavePath('gallop', 70, 232, 410, 232, 8, 2, 18);
  const orbitPath = ctx.ellipsePath('orbit', 240, 94, 174, 46, 24);
  ctx.marginPath(256);

  ctx.actor('violet', 184, 242, { facing: 1, anim: 'idle' });
  ctx.actor('lumi', 358, 240, { facing: -1, anim: 'idle', pathIndex: gallopPath });
  ctx.actor('gazelle', 92, 240, { facing: 1, anim: 'run', pathIndex: gallopPath });
  ctx.actor('moonCat', 276, 238, { facing: 1, anim: 'sleep' });

  ctx.heroQuest('lotus', 'Oasis Fountain', fountain);
  ctx.heroQuest('lantern', 'Mirage Arch', [...pavilion, ...lampL]);
  ctx.heroQuest('lumi', 'Lumi', [5, 6, 7, 8]);
  ctx.heroQuest('planet', 'Pearl Moon', [12, 13, ...palmR]);
  void orbitPath;
}

/** Chapter 4B: The Caravan of Lantern Camels */
function buildU12C4b(ctx: SceneCtx): void {
  const { r, rng } = ctx;
  setupMeta(ctx, chapterTitle('u12_c4b'), 240, 156);
  drawSkySparkles(ctx, 20, 124, 'stars');

  const ox = Math.round(jit(rng, 88, 4));
  const oy = Math.round(jit(rng, 52, 3));
  const orb = drawThemedOrb(ctx, ox, oy, 20, 'lanternMoon', { tilt: -0.24 });
  drawThemedCloud(ctx, 14, Math.round(jit(rng, 242, 4)), Math.round(jit(rng, 44, 3)), 90, 28, 'fluffy');
  drawThemedCloud(ctx, 15, Math.round(jit(rng, 404, 4)), Math.round(jit(rng, 52, 3)), 84, 28, 'fluffy');

  star(ctx, ctx.dyn('star', 'Caravan Guide Star'), Math.round(jit(rng, 168, 3)), Math.round(jit(rng, 36, 2)), 10);
  twinkle(ctx, ctx.dyn('star', 'Stardust Beacon'), Math.round(jit(rng, 330, 3)), Math.round(jit(rng, 38, 2)), 11);

  drawGhostSilhouette(ctx, 'Caravan Camel Ghost', 'camel', Math.round(jit(rng, 164, 3)), Math.round(jit(rng, 98, 2)), 0.95);
  drawGhostSilhouette(ctx, 'Dune Fox Ghost', 'fox', Math.round(jit(rng, 326, 3)), Math.round(jit(rng, 96, 2)), 0.92);
  drawGhostSilhouette(ctx, 'Star Scarab Ghost', 'scarab', Math.round(jit(rng, 444, 3)), Math.round(jit(rng, 112, 2)), 0.85);

  drawHorizonHills(ctx, { style: 'dunes', yBase: 158, yBottom: 248, layers: 2 });

  // Winding glowing stardust caravan trail across foreground dunes
  const road = ctx.dyn('star', 'Stardust Caravan Trail');
  const roadTop: Pt[] = [];
  const roadBot: Pt[] = [];
  for (let x = 0; x <= W; x += 20) {
    const cy = 224 + Math.sin((x / W) * Math.PI * 2.2) * 10;
    roadTop.push([x, cy - 11]);
    roadBot.push([x, cy + 12]);
  }
  roadBot.reverse();
  r.poly(road, [...roadTop, ...roadBot]);
  for (let x = 28; x < W - 24; x += 48) {
    const cy = 224 + Math.sin((x / W) * Math.PI * 2.2) * 10;
    r.line(INK, x - 8, cy, x + 8, cy, { only: [road] });
  }

  // Caravan silk tents + glowing lantern beacons + oasis palm
  const tentL = drawCaravanTent(ctx, 102, 174, 0.95, 'West');
  const tentR = drawCaravanTent(ctx, 374, 174, 0.95, 'East');
  const lampC = drawPaperLantern(ctx, 240, 152, 0.88, { label: 'Caravan' });
  const palm = drawOasisPalm(ctx, 442, 170, 0.78, { label: 'Caravan', flip: -1 });

  ctx.ellipsePath('ring', ox, oy, orb.rx * 1.15, orb.ry * 1.3, 24, orb.tilt);
  const sprintPath = ctx.wavePath('sprint', 62, 224, 418, 224, 10, 2, 20);
  const orbitPath = ctx.ellipsePath('orbit', 240, 96, 174, 46, 24);
  ctx.marginPath(256);

  ctx.actor('violet', 178, 236, { facing: 1, anim: 'idle' });
  ctx.actor('nova', 298, 234, { facing: -1, anim: 'run', pathIndex: sprintPath });
  ctx.actor('gazelle', 62, 238, { facing: 1, anim: 'run', pathIndex: sprintPath });
  ctx.actor('comet', 240, 88, { facing: 1, anim: 'float', pathIndex: orbitPath });

  ctx.heroQuest('lantern', 'Caravan Lamps', [...lampC, road]);
  ctx.heroQuest('tent', 'Silk Tents', [...tentL, ...tentR]);
  ctx.heroQuest('nova', 'Nova', [9, 10, 11]);
  ctx.heroQuest('cloud', 'Dune Clouds', [14, 15, ...palm]);
}

/** Chapter 5 (Grand Finale): The Grand Star-Crown Pyramid (50..70 regions!) */
function buildU12C5(ctx: SceneCtx): void {
  const { r, rng } = ctx;
  setupMeta(ctx, chapterTitle('u12_c5'), 240, 134);
  drawSkySparkles(ctx, 22, 118, 'stars');

  // Celestial astrolabe orb (12/13) on upper-left + clouds (14/15) on sides
  const ox = Math.round(jit(rng, 72, 3));
  const oy = Math.round(jit(rng, 52, 2));
  const orb = drawThemedOrb(ctx, ox, oy, 18, 'astrolabe', { tilt: -0.26 });
  drawThemedCloud(ctx, 14, 62, 118, 76, 24, 'fluffy');
  drawThemedCloud(ctx, 15, 418, 118, 76, 24, 'fluffy');

  // 4 Corner framing stars + mirrored upper-right crescent moon
  star(ctx, ctx.dyn('star', 'West Summit Star'), 36, 24, 9.5);
  star(ctx, ctx.dyn('star', 'East Summit Star'), 444, 24, 9.5);
  const eastMoon = ctx.dyn('star', 'Desert Royal Crescent');
  crescent(ctx, eastMoon, 408, 52, 18, -0.42);
  twinkle(ctx, ctx.dyn('star', 'Zenith Crown Star'), 240, 18, 10.5);

  // 3 Ghosts in open upper sky pockets
  drawGhostSilhouette(ctx, 'Royal Camel Ghost', 'camel', 152, 34, 0.85);
  drawGhostSilhouette(ctx, 'Solar Scarab Ghost', 'scarab', 328, 34, 0.85);
  drawGhostSilhouette(ctx, 'Starlight Fox Ghost', 'fox', 30, 85, 0.9);

  // Panoramic 10-ray Desert Sunburst Mandala radiating behind the Grand Pyramid!
  const mcx = 240;
  const mcy = 128;
  const rayIds: number[] = [];
  for (let i = 0; i < 10; i++) {
    const a = -Math.PI + ((i + 0.5) * Math.PI) / 10;
    const rid = ctx.dyn('star', `Solar Crown Ray ${i + 1}`);
    rayIds.push(rid);
    const r0 = 36;
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

  // Layered dunes + stone royal plaza deck
  drawHorizonHills(ctx, { style: 'dunes', yBase: 170, yBottom: 216, layers: 2 });
  drawGroundDeck(ctx, { style: 'courtyard', yTop: 208, yBottom: 250 });

  // Monumental central Star-Crown Pyramid + flanking Sphinxes + Palms + Obelisks + Magic Carpets
  const pyramid = drawPyramidTemple(ctx, 240, 164, 1.2, { label: 'Crown' });
  const obL = drawStarObelisk(ctx, 146, 174, 0.88, 'Royal West');
  const obR = drawStarObelisk(ctx, 334, 174, 0.88, 'Royal East');
  const palmL = drawOasisPalm(ctx, 56, 180, 0.85, { label: 'Royal West' });
  const palmR = drawOasisPalm(ctx, 424, 180, 0.85, { label: 'Royal East', flip: -1 });
  const sphinxL = drawGoldenSphinx(ctx, 102, 198, 0.7, { label: 'West' });
  const sphinxR = drawGoldenSphinx(ctx, 378, 198, 0.7, { label: 'East', flip: -1 });
  const carpetL = drawMagicCarpet(ctx, 124, 92, 0.75, { label: 'West Parade' });
  const carpetR = drawMagicCarpet(ctx, 356, 92, 0.75, { label: 'East Parade', flip: -1 });

  ctx.ellipsePath('ring', ox, oy, orb.rx * 1.15, orb.ry * 1.3, 24, orb.tilt);
  const gallopPath = ctx.wavePath('gallop', 66, 236, 414, 236, 7, 2, 20);
  const sprintPath = ctx.wavePath('sprint', 88, 232, 392, 232, 9, 2.5, 20);
  const orbitPath = ctx.ellipsePath('orbit', 240, 108, 182, 54, 28);
  ctx.marginPath(256);

  // Full Finale Hero Cast!
  ctx.actor('lumi', 152, 244, { facing: 1, anim: 'rear', pathIndex: gallopPath });
  ctx.actor('violet', 240, 248, { facing: 1, anim: 'idle' });
  ctx.actor('nova', 328, 244, { facing: -1, anim: 'leap', pathIndex: sprintPath });
  ctx.actor('moonCat', 124, 84, { facing: 1, anim: 'sleep' });
  ctx.actor('comet', 356, 84, { facing: -1, anim: 'float', pathIndex: orbitPath });

  ctx.heroQuest('pyramid', 'Crown Pyramid', [...pyramid, ...rayIds.slice(0, 5)]);
  ctx.heroQuest('violet', 'Violet', [1, 2, 3, 4]);
  ctx.heroQuest('lumi', 'Lumi', [5, 6, 7, 8]);
  ctx.heroQuest('nova', 'Nova', [9, 10, 11]);
  void obL;
  void obR;
  void palmL;
  void palmR;
  void sphinxL;
  void sphinxR;
  void carpetL;
  void carpetR;
}

export const U12_SCENES: Record<U12SceneId, (ctx: SceneCtx) => void> = {
  hub_desertStarOasis: buildHubDesertStarOasis,
  u12_c1: buildU12C1,
  u12_c2a: buildU12C2a,
  u12_c2b: buildU12C2b,
  u12_c3a: buildU12C3a,
  u12_c3b: buildU12C3b,
  u12_c4a: buildU12C4a,
  u12_c4b: buildU12C4b,
  u12_c5: buildU12C5,
};
