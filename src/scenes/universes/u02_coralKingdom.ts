/**
 * Universe 2: Bubblegum Coral Kingdom (9 bespoke procedural scenes: 1 Hub Sanctuary + 8 Chapters).
 * Pure & deterministic (ctx.rng only), strict >= 60px region hygiene, clean bottom margin (y <= 252).
 */
import { MaterialId } from '../../contracts/materials';
import type { SceneId } from '../../contracts/roguelike';
import { UNIVERSE_BY_ID } from '../../contracts/universes';
import type { SceneCtx } from '../context';
import {
  drawCarousel,
  drawCoralArch,
  drawGiantClam,
  drawGroundDeck,
  drawHorizonHills,
  drawJellyfish,
  drawKelpCluster,
  drawSanctuaryRoom,
  drawSkySparkles,
  drawSubmarine,
  drawSunkenShip,
  drawThemedCloud,
  drawThemedOrb,
  ghostCreature,
} from '../kit';
import { crescent, inkArc, jit, pearl, rot, star, twinkle } from '../props';
import { INK, W, type Pt } from '../raster';

const UNI = UNIVERSE_BY_ID.coralKingdom;
const CH = Object.fromEntries(UNI.chapters.map((c) => [c.id, c]));

function initChapter(ctx: SceneCtx, id: string, fx = 240, fy = 136): void {
  const ch = CH[id];
  ctx.title = ch ? ch.title : id;
  ctx.sky = UNI.sky;
  ctx.universeId = UNI.id;
  ctx.ambient = UNI.ambient;
  ctx.focal = { x: fx, y: fy };
}

/** Draw a curved translucent tide wave ribbon spanning x0..x1 cleanly above y <= 248. */
function drawTideRibbon(
  ctx: SceneCtx,
  label: string,
  yTopBase: number,
  yBotBase: number,
  amp: number,
  phase: number,
  kind: 'prop' | 'flora' = 'prop',
): number {
  const id = ctx.dyn(kind, label);
  const pts: Pt[] = [];
  for (let x = 0; x <= W; x += 12) {
    pts.push([x, yTopBase + Math.sin(x * 0.025 + phase) * amp]);
  }
  for (let x = W; x >= 0; x -= 12) {
    pts.push([x, yBotBase + Math.sin(x * 0.025 + phase + 0.7) * (amp * 0.7)]);
  }
  ctx.r.poly(id, pts);
  const midPts: Pt[] = [];
  for (let x = 10; x <= W - 10; x += 16) {
    midPts.push([x, (yTopBase + yBotBase) * 0.5 + Math.sin(x * 0.025 + phase + 0.35) * (amp * 0.8)]);
  }
  ctx.r.strokePath(INK, midPts, { only: [id] });
  return id;
}

/** Chunky fluted sea-shell chime pillar (>= 220px). */
function drawPearlPillar(ctx: SceneCtx, x: number, yBase: number, h: number, label: string): [number, number] {
  const { r } = ctx;
  const col = ctx.dyn('prop', `${label} Column`);
  const orb = ctx.dyn('star', `${label} Pearl`);
  r.rect(col, x - 9, yBase - h, x + 9, yBase);
  r.ellipse(col, x, yBase - 2, 13, 5);
  r.ellipse(col, x, yBase - h, 12, 4.5);
  r.line(INK, x - 3, yBase - h + 4, x - 3, yBase - 5, { only: [col] });
  r.line(INK, x + 3, yBase - h + 4, x + 3, yBase - 5, { only: [col] });
  pearl(ctx, orb, x, yBase - h - 10, 9.5);
  return [col, orb];
}

/** Whirling sea-anemone blossom mound with thick wavy frond petals (2 chunky regions). */
function drawSeaAnemone(ctx: SceneCtx, x: number, y: number, scale: number, label: string): [number, number] {
  const { r } = ctx;
  const s = Math.max(0.75, scale);
  const base = ctx.dyn('flora', `${label} Base`);
  const fronds = ctx.dyn('flora', `${label} Fronds`);
  // Thick radiating waving fronds
  for (let i = -3; i <= 3; i++) {
    const a = -Math.PI / 2 + i * 0.32;
    const tipX = x + Math.cos(a) * 28 * s;
    const tipY = y - 6 * s + Math.sin(a) * 26 * s;
    r.capsule(fronds, x + i * 3 * s, y, tipX, tipY, 4.6 * s);
    r.disc(fronds, tipX, tipY, 5.2 * s);
  }
  // Cushioning dome base
  r.ellipse(base, x, y + 6 * s, 24 * s, 12 * s);
  inkArc(r, x, y + 6 * s, 16 * s, 6 * s, Math.PI * 1.1, Math.PI * 1.9, 0, { only: [base] });
  return [base, fronds];
}

/** Open sea-glass treasure chest brimming with gleaming pearls (3 chunky regions). */
function drawTreasureChest(ctx: SceneCtx, x: number, y: number, label: string): number[] {
  const { r } = ctx;
  const lid = ctx.dyn('prop', `${label} Lid`);
  const gems = ctx.dyn('star', `${label} Pearls`);
  const box = ctx.dyn('prop', `${label} Chest`);
  // Open domed lid tilted behind
  r.poly(lid, [
    [x - 24, y - 24],
    [x + 24, y - 24],
    [x + 28, y - 6],
    [x - 28, y - 6],
  ]);
  r.ellipse(lid, x, y - 24, 24, 8);
  r.line(INK, x - 12, y - 28, x - 12, y - 8, { only: [lid] });
  r.line(INK, x + 12, y - 28, x + 12, y - 8, { only: [lid] });
  // Mound of gleaming sea-glass gems & pearls
  r.disc(gems, x - 11, y - 4, 8);
  r.disc(gems, x + 11, y - 4, 8);
  r.disc(gems, x, y - 8, 9.5);
  // Lower riveted chest body
  r.rect(box, x - 26, y - 2, x + 26, y + 22);
  r.line(INK, x - 24, y + 6, x + 24, y + 6, { only: [box] });
  r.line(INK, x - 12, y, x - 12, y + 20, { only: [box] });
  r.line(INK, x + 12, y, x + 12, y + 20, { only: [box] });
  return [lid, gems, box];
}

/** Starry gliding manta ray silhouette in open upper water (2 regions). */
function drawStarManta(ctx: SceneCtx, x: number, y: number, scale: number, label: string): [number, number] {
  const { r } = ctx;
  const s = Math.max(0.75, scale);
  const wings = ctx.dyn('prop', `${label} Wings`);
  const spots = ctx.dyn('star', `${label} Spots`);
  r.poly(wings, [
    [x, y - 16 * s],
    [x + 40 * s, y - 2 * s],
    [x + 14 * s, y + 14 * s],
    [x, y + 24 * s],
    [x - 14 * s, y + 14 * s],
    [x - 40 * s, y - 2 * s],
  ]);
  r.capsule(wings, x, y + 14 * s, x - 14 * s, y + 32 * s, 3.2 * s);
  r.line(INK, x, y - 12 * s, x, y + 18 * s, { only: [wings] });
  r.disc(spots, x - 14 * s, y - 2 * s, 5.5 * s);
  r.disc(spots, x + 14 * s, y - 2 * s, 5.5 * s);
  r.disc(spots, x, y + 4 * s, 6 * s);
  return [wings, spots];
}

// ============================================================================
// HUB SANCTUARY: Violet's Pearl-Glass Tide Observatory
// ============================================================================
function hub_coralKingdom(ctx: SceneCtx): void {
  ctx.universeId = UNI.id;
  ctx.ambient = UNI.ambient;
  const showcaseIds: number[] = [];

  drawSanctuaryRoom(ctx, {
    title: UNI.hubTitle,
    sky: UNI.sky,
    windowShape: 'porthole',
    windowOrbStyle: 'pearlMoon',
    wallStyle: 'tile',
    floorStyle: 'tile',
    rugShape: 'scallop',
    lampStyle: 'coral',
    garlandStyle: 'bubbles',
    sparkleStyle: 'bubbles',
    violetPos: { x: 204, y: 238, facing: 1 },
    workbenchLabel: 'Pearl Craft Table',
    shelfLabel: 'Tidepool Curio Shelf',
    seatingLabel: 'Seashell Daybed',
    trinketLabels: ['Reef Atlases', 'Shell Jars', 'Tide Diaries'],
    palette: {
      wallPanel: MaterialId.CrystalGlacierMint,
      floor: MaterialId.DeepSpaceBiolum,
      windowFrame: MaterialId.SolarFlare24K,
      windowGlass: MaterialId.VelvetNebula,
      curtain: MaterialId.StrawberrySupernova,
      orbCore: MaterialId.OpalPearl,
      orbRing: MaterialId.LiquidAurora,
      rugOuter: MaterialId.CosmicCottonSwirl,
      rugInner: MaterialId.HoloFoil,
      furniture: MaterialId.RoyalAstralGold,
      furnitureTrim: MaterialId.AuroraSherbet,
      accentA: MaterialId.StrawberrySupernova,
      accentB: MaterialId.CrystalGlacierMint,
      accentC: MaterialId.DragonflyIridescence,
    },
    drawWindowView: (c, wx, _wy, _wh, _wb) => {
      const reef = c.dyn('flora', 'Window Coral Silhouette');
      c.r.poly(reef, [
        [wx - 28, 128],
        [wx - 20, 114],
        [wx - 8, 120],
        [wx + 4, 112],
        [wx + 18, 118],
        [wx + 28, 128],
      ]);
      c.r.disc(reef, wx - 16, 116, 6);
      c.r.disc(reef, wx + 6, 114, 7);
      c.preColor(reef, MaterialId.StrawberrySupernova);
    },
    drawExtraProps: (c) => {
      const { r } = c;
      // 1) Left wall giant scalloped shell crest plaque (2 regions)
      const plaque = c.dyn('prop', 'Scallop Wall Crest');
      r.disc(plaque, 84, 92, 22);
      for (let i = -2; i <= 2; i++) {
        r.line(INK, 84, 108, 84 + i * 8, 76, { only: [plaque] });
      }
      c.preColor(plaque, MaterialId.StrawberrySupernova);

      const wallPearl = c.dyn('star', 'Crest Center Pearl');
      pearl(c, wallPearl, 84, 96, 8.5);
      c.preColor(wallPearl, MaterialId.OpalPearl);

      // 2) Floor standing Pearl-Glass Diving Bell Terrarium beside Violet (3 regions)
      const bellStand = c.dyn('prop', 'Tide Bell Pedestal');
      r.poly(bellStand, [[252, 210], [286, 210], [290, 226], [248, 226]]);
      r.line(INK, 254, 218, 284, 218, { only: [bellStand] });
      c.preColor(bellStand, MaterialId.SolarFlare24K);

      const bellDome = c.dyn('prop', 'Pearl-Glass Dome');
      r.disc(bellDome, 269, 180, 20);
      r.rect(bellDome, 249, 180, 289, 210);
      inkArc(r, 269, 180, 14, 14, Math.PI * 1.1, Math.PI * 1.5, 0, { only: [bellDome] });
      c.preColor(bellDome, MaterialId.CrystalGlacierMint);

      const miniCoral = c.dyn('flora', 'Terrarium Coral Bloom');
      r.capsule(miniCoral, 269, 204, 261, 182, 5);
      r.capsule(miniCoral, 269, 204, 278, 184, 5);
      r.disc(miniCoral, 269, 198, 7);
      c.preColor(miniCoral, MaterialId.StrawberrySupernova);
      showcaseIds.push(bellStand, bellDome, miniCoral);

      // 3) Desk-right Giant Pearl Jar & Starfish Keepsake (2 regions)
      const deskStar = c.dyn('star', 'Desk Starfish Charm');
      star(c, deskStar, 376, 166, 12.5, { points: 5, inner: 0.48, rot: -0.2 });
      c.preColor(deskStar, MaterialId.HoloFoil);

      const wallBanner = c.dyn('prop', 'Coral Tide Tapestry');
      r.poly(wallBanner, [[334, 72], [372, 72], [372, 114], [353, 124], [334, 114]]);
      inkArc(r, 353, 94, 10, 10, 0, Math.PI * 2, 0, { only: [wallBanner] });
      c.preColor(wallBanner, MaterialId.DragonflyIridescence);

      return [plaque, wallPearl, bellStand, bellDome, miniCoral, deskStar, wallBanner];
    },
  });

  ctx.heroQuest('violet', 'Violet', [1, 2, 3, 4]);
  ctx.heroQuest('planet', 'Pearl Moon', [12, 13]);
  ctx.heroQuest('shell', 'Tide Dome', showcaseIds);
}

// ============================================================================
// SLOT 1: The Bubblegum Tidepool Pier
// ============================================================================
function u02_c1(ctx: SceneCtx): void {
  initChapter(ctx, 'u02_c1', 238, 148);
  const { rng } = ctx;

  drawSkySparkles(ctx, 18, 146, 'bubbles');

  const orbX = Math.round(jit(rng, 374, 5));
  const orbY = Math.round(jit(rng, 58, 3));
  const orb = drawThemedOrb(ctx, orbX, orbY, 21, 'pearlMoon', { tilt: -0.24 });

  ctx.canon(14, 'Bubblegum Cloud', 'cloud');
  ctx.canon(15, 'Seafoam Drift Cloud', 'cloud');
  drawThemedCloud(ctx, 14, Math.round(jit(rng, 102, 5)), Math.round(jit(rng, 54, 3)), 82, 30, 'bubbleCluster');
  drawThemedCloud(ctx, 15, Math.round(jit(rng, 246, 5)), Math.round(jit(rng, 44, 3)), 72, 26, 'bubbleCluster');

  // Distant coral reefs + gentle tidepool ribbon
  drawHorizonHills(ctx, { style: 'coral', yBase: 162, yBottom: 214, layers: 2 });
  drawTideRibbon(ctx, 'Singing Tidepool Wave', 184, 208, 4.5, 0.4, 'flora');

  // Foreground wooden pearl jetty pier
  drawGroundDeck(ctx, { style: 'pier', yTop: 206, yBottom: 250, labelPrefix: 'Pearl Jetty' });

  // Right focal Coral Archway gate on the pier + left pearl beacon pillar
  const archIds = drawCoralArch(ctx, 366, 174, 0.98, { label: 'Jetty' });
  const pillarL = drawPearlPillar(ctx, 74, 214, 48, 'Pier Beacon');
  const anemL = drawSeaAnemone(ctx, 216, 198, 0.85, 'Tidepool Anemone');

  // Rising singing bubble pearls floating skyward
  const b1 = ctx.dyn('star', 'Singing Bubble Alpha');
  const b2 = ctx.dyn('star', 'Singing Bubble Beta');
  const b3 = ctx.dyn('star', 'Tidepool Star');
  pearl(ctx, b1, Math.round(jit(rng, 166, 3)), Math.round(jit(rng, 92, 3)), 9.5);
  pearl(ctx, b2, Math.round(jit(rng, 294, 3)), Math.round(jit(rng, 96, 3)), 10);
  star(ctx, b3, Math.round(jit(rng, 42, 3)), Math.round(jit(rng, 118, 3)), 11, { points: 5, inner: 0.48 });

  // 3 ghosts in guaranteed open sky pockets
  ghostCreature(ctx, 'seahorse', 194, 62, 'Constellation Seahorse');
  ghostCreature(ctx, 'koi', 306, 58, 'Starlight Reef Koi');
  ghostCreature(ctx, 'owl', 442, 114, 'Tidewatch Owl Ghost');

  // Paths
  ctx.ellipsePath('ring', orbX, orbY, orb.rx, orb.ry, 24, orb.tilt);
  const swimPath = ctx.wavePath('swim', 54, 134, 420, 128, 16, 1.5, 22);
  const gallopPath = ctx.wavePath('gallop', 60, 232, 410, 230, 8, 2, 20);
  ctx.ellipsePath('orbit', 240, 84, 176, 48, 24);
  ctx.marginPath(256);

  // Actors (well separated!)
  ctx.actor('violet', 142, 242, { facing: 1, anim: 'idle' });
  ctx.actor('lumi', 274, 244, { facing: -1, anim: 'idle', pathIndex: gallopPath });
  ctx.actor('whale', 240, 138, { facing: 1, anim: 'swim', pathIndex: swimPath });
  ctx.actor('moonCat', 428, 236, { facing: -1, anim: 'sleep' });

  void pillarL;
  void anemL;
  ctx.heroQuest('violet', 'Violet', [1, 2, 3, 4]);
  ctx.heroQuest('shell', 'Coral Arch', archIds);
  ctx.heroQuest('whale', 'Star Whale', [19, 29]);
  ctx.heroQuest('planet', 'Pearl Moon', [12, 13]);
}

// ============================================================================
// SLOT 2A: The Jellyfish Lantern Lagoon
// ============================================================================
function u02_c2a(ctx: SceneCtx): void {
  initChapter(ctx, 'u02_c2a', 240, 136);
  const { rng } = ctx;

  drawSkySparkles(ctx, 20, 152, 'bubbles');

  const orbX = Math.round(jit(rng, 242, 5));
  const orbY = Math.round(jit(rng, 48, 3));
  const orb = drawThemedOrb(ctx, orbX, orbY, 20, 'bubbleOrb', { tilt: -0.22 });

  ctx.canon(14, 'Lagoon Bubble Cloud', 'cloud');
  ctx.canon(15, 'Parasol Mist Cloud', 'cloud');
  drawThemedCloud(ctx, 14, Math.round(jit(rng, 88, 5)), Math.round(jit(rng, 52, 3)), 80, 28, 'bubbleCluster');
  drawThemedCloud(ctx, 15, Math.round(jit(rng, 392, 5)), Math.round(jit(rng, 54, 3)), 80, 28, 'bubbleCluster');

  // Lagoon ocean waves & seabed terrace
  drawHorizonHills(ctx, { style: 'waves', yBase: 174, yBottom: 222, layers: 2 });
  drawGroundDeck(ctx, { style: 'meadow', yTop: 214, yBottom: 250, labelPrefix: 'Lagoon Seabed' });

  // Kelp forest flanking edges
  drawKelpCluster(ctx, 52, 198, 0.92, { label: 'West Lagoon' });
  drawKelpCluster(ctx, 430, 198, 0.92, { label: 'East Lagoon', flip: -1 });

  // Two glowing Jellyfish Lantern Parasols hovering in mid-lagoon!
  const jellyL = drawJellyfish(ctx, 142, 132, 1.02, { label: 'West Lantern' });
  const jellyR = drawJellyfish(ctx, 340, 126, 0.95, { label: 'East Lantern', flip: -1 });

  // Glowing sea-lantern pearls & crescent
  pearl(ctx, ctx.dyn('star', 'Lantern Pearl West'), 200, 166, 9);
  pearl(ctx, ctx.dyn('star', 'Lantern Pearl East'), 284, 164, 9);
  crescent(ctx, ctx.dyn('star', 'Lagoon Crescent'), 322, 54, 15, -0.45);

  // 3 ghosts in open upper sky
  ghostCreature(ctx, 'seahorse', 166, 56, 'Lantern Seahorse Ghost');
  ghostCreature(ctx, 'moth', 442, 108, 'Sea-Moth Ghost');
  ghostCreature(ctx, 'koi', 40, 110, 'Lagoon Koi Ghost');

  ctx.ellipsePath('ring', orbX, orbY, orb.rx, orb.ry, 24, orb.tilt);
  const swimPath = ctx.wavePath('swim', 70, 142, 410, 138, 22, 1.5, 24);
  const orbitPath = ctx.ellipsePath('orbit', 240, 88, 178, 50, 24);
  ctx.marginPath(256);

  ctx.actor('violet', 146, 244, { facing: 1, anim: 'idle' });
  ctx.actor('whale', 240, 144, { facing: 1, anim: 'swim', pathIndex: swimPath });
  ctx.actor('moonCat', 326, 240, { facing: -1, anim: 'peek' });
  ctx.actor('comet', 244, 96, { facing: 1, anim: 'float', pathIndex: orbitPath });

  ctx.heroQuest('jelly', 'Lantern Jellies', [...jellyL, ...jellyR]);
  ctx.heroQuest('whale', 'Lagoon Whale', [19, 29]);
  ctx.heroQuest('violet', 'Violet', [1, 2, 3, 4]);
  ctx.heroQuest('cloud', 'Bubble Clouds', [14, 15]);
}

// ============================================================================
// SLOT 2B: The Giant Clam Pearl Amphitheater
// ============================================================================
function u02_c2b(ctx: SceneCtx): void {
  initChapter(ctx, 'u02_c2b', 240, 144);
  const { rng } = ctx;

  drawSkySparkles(ctx, 18, 144, 'notes');

  const orbX = Math.round(jit(rng, 386, 5));
  const orbY = Math.round(jit(rng, 56, 3));
  const orb = drawThemedOrb(ctx, orbX, orbY, 21, 'pearlMoon', { tilt: -0.26 });

  ctx.canon(14, 'Chorus Shell Cloud', 'cloud');
  ctx.canon(15, 'Harmony Mist Cloud', 'cloud');
  drawThemedCloud(ctx, 14, Math.round(jit(rng, 96, 5)), Math.round(jit(rng, 50, 3)), 82, 28, 'bubbleCluster');
  drawThemedCloud(ctx, 15, Math.round(jit(rng, 240, 5)), Math.round(jit(rng, 44, 3)), 76, 26, 'bubbleCluster');

  // Curved coral amphitheater backdrop & grand concert stage
  drawHorizonHills(ctx, { style: 'coral', yBase: 158, yBottom: 212, layers: 2 });
  drawGroundDeck(ctx, { style: 'stage', yTop: 204, yBottom: 250, labelPrefix: 'Pearl Stage' });

  // Flanking pearl chime pillars
  drawPearlPillar(ctx, 64, 210, 62, 'West Chime');
  drawPearlPillar(ctx, 416, 210, 62, 'East Chime');

  // Centerpiece Giant Velvet Clam & Glowing Pearl!
  const clamIds = drawGiantClam(ctx, 240, 168, 1.18, { label: 'Amphitheater' });

  // Musical pearl chimes floating above the clam
  const chime1 = ctx.dyn('star', 'Harmony Pearl Do');
  const chime2 = ctx.dyn('star', 'Harmony Pearl Mi');
  const chime3 = ctx.dyn('star', 'Harmony Pearl Sol');
  pearl(ctx, chime1, 166, 108, 9.5);
  pearl(ctx, chime2, 240, 92, 10.5);
  pearl(ctx, chime3, 314, 108, 9.5);
  star(ctx, ctx.dyn('star', 'Amphitheater Star'), 166, 62, 10.5, { points: 5, inner: 0.48 });

  // 3 ghosts in open upper sky
  ghostCreature(ctx, 'treble', 308, 62, 'Ocean Melody Ghost');
  ghostCreature(ctx, 'seahorse', 44, 108, 'Chorus Seahorse Ghost');
  ghostCreature(ctx, 'koi', 442, 114, 'Harmony Koi Ghost');

  ctx.ellipsePath('ring', orbX, orbY, orb.rx, orb.ry, 24, orb.tilt);
  const gallopPath = ctx.wavePath('gallop', 72, 236, 408, 236, 10, 2, 20);
  const sprintPath = ctx.wavePath('sprint', 82, 234, 402, 234, 10, 2, 20);
  const orbitPath = ctx.ellipsePath('orbit', 240, 82, 174, 44, 24);
  ctx.marginPath(256);

  ctx.actor('lumi', 132, 244, { facing: 1, anim: 'rear', pathIndex: gallopPath });
  ctx.actor('nova', 350, 244, { facing: -1, anim: 'leap', pathIndex: sprintPath });
  ctx.actor('moonCat', 240, 242, { facing: 1, anim: 'peek' });
  ctx.actor('comet', 134, 90, { facing: 1, anim: 'float', pathIndex: orbitPath });

  ctx.heroQuest('shell', 'Pearl Clam', clamIds);
  ctx.heroQuest('lumi', 'Lumi', [5, 6, 7, 8]);
  ctx.heroQuest('nova', 'Nova', [9, 10, 11]);
  ctx.heroQuest('planet', 'Pearl Moon', [12, 13]);
}

// ============================================================================
// SLOT 3A: The Kelp-Ribbon Seahorse Meadow
// ============================================================================
function u02_c3a(ctx: SceneCtx): void {
  initChapter(ctx, 'u02_c3a', 240, 144);
  const { rng } = ctx;

  drawSkySparkles(ctx, 18, 146, 'bubbles');

  const orbX = Math.round(jit(rng, 102, 5));
  const orbY = Math.round(jit(rng, 58, 3));
  const orb = drawThemedOrb(ctx, orbX, orbY, 21, 'bubbleOrb', { tilt: -0.24 });

  ctx.canon(14, 'Kelp Breeze Cloud', 'cloud');
  ctx.canon(15, 'Seahorse Foam Cloud', 'cloud');
  drawThemedCloud(ctx, 14, Math.round(jit(rng, 248, 5)), Math.round(jit(rng, 46, 3)), 80, 28, 'bubbleCluster');
  drawThemedCloud(ctx, 15, Math.round(jit(rng, 392, 5)), Math.round(jit(rng, 54, 3)), 76, 28, 'bubbleCluster');

  drawHorizonHills(ctx, { style: 'coral', yBase: 168, yBottom: 218, layers: 2 });
  drawGroundDeck(ctx, { style: 'meadow', yTop: 210, yBottom: 250, labelPrefix: 'Seahorse' });

  // Lush twin kelp forests framing the meadow + jelly drifting over right grove
  const kelpL = drawKelpCluster(ctx, 74, 186, 1.08, { label: 'West Ribbon' });
  const kelpR = drawKelpCluster(ctx, 404, 186, 1.08, { label: 'East Ribbon', flip: -1 });
  const jellyMid = drawJellyfish(ctx, 298, 124, 0.86, { label: 'Meadow' });

  // Bespoke Seahorse Coral Cradle arch in center-left meadow
  drawSeaAnemone(ctx, 204, 200, 0.9, 'Meadow Anemone');
  pearl(ctx, ctx.dyn('star', 'Seahorse Pearl A'), 172, 108, 9.5);
  twinkle(ctx, ctx.dyn('star', 'Meadow Star'), 386, 108, 11.5);

  // 3 ghosts in open sky
  ghostCreature(ctx, 'seahorse', 184, 58, 'Meadow Seahorse Ghost');
  ghostCreature(ctx, 'koi', 322, 56, 'Emerald Koi Ghost');
  ghostCreature(ctx, 'butterfly', 44, 118, 'Sea-Wing Ghost');

  ctx.ellipsePath('ring', orbX, orbY, orb.rx, orb.ry, 24, orb.tilt);
  const swimPath = ctx.wavePath('swim', 62, 128, 418, 122, 18, 1.5, 22);
  const gallopPath = ctx.wavePath('gallop', 66, 236, 414, 236, 10, 2, 20);
  ctx.ellipsePath('orbit', 240, 86, 178, 46, 24);
  ctx.marginPath(256);

  ctx.actor('lumi', 148, 244, { facing: 1, anim: 'idle', pathIndex: gallopPath });
  ctx.actor('gazelle', 328, 244, { facing: -1, anim: 'idle', pathIndex: gallopPath });
  ctx.actor('whale', 178, 134, { facing: 1, anim: 'swim', pathIndex: swimPath });
  ctx.actor('moonCat', 252, 240, { facing: 1, anim: 'sleep' });

  ctx.heroQuest('shell', 'Kelp Meadow', [...kelpL, ...kelpR]);
  ctx.heroQuest('lumi', 'Lumi', [5, 6, 7, 8]);
  ctx.heroQuest('jelly', 'Drift Jelly', jellyMid);
  ctx.heroQuest('whale', 'Star Whale', [19, 29]);
}

// ============================================================================
// SLOT 3B: The Rainbow Submarine Promenade
// ============================================================================
function u02_c3b(ctx: SceneCtx): void {
  initChapter(ctx, 'u02_c3b', 236, 138);
  const { rng } = ctx;

  drawSkySparkles(ctx, 18, 146, 'bubbles');

  const orbX = Math.round(jit(rng, 384, 5));
  const orbY = Math.round(jit(rng, 56, 3));
  const orb = drawThemedOrb(ctx, orbX, orbY, 21, 'bubbleOrb', { tilt: -0.25 });

  ctx.canon(14, 'Porthole Bubble Cloud', 'cloud');
  ctx.canon(15, 'Promenade Foam Cloud', 'cloud');
  drawThemedCloud(ctx, 14, Math.round(jit(rng, 98, 5)), Math.round(jit(rng, 52, 3)), 82, 28, 'bubbleCluster');
  drawThemedCloud(ctx, 15, Math.round(jit(rng, 244, 5)), Math.round(jit(rng, 44, 3)), 76, 26, 'bubbleCluster');

  drawHorizonHills(ctx, { style: 'coral', yBase: 164, yBottom: 214, layers: 2 });
  drawGroundDeck(ctx, { style: 'courtyard', yTop: 208, yBottom: 250, labelPrefix: 'Sea-Glass' });

  // Grand Rainbow Submarine cruising center-left + Coral Garden Arch on right
  const subIds = drawSubmarine(ctx, 166, 138, 1.08, { label: 'Rainbow' });
  const archIds = drawCoralArch(ctx, 368, 174, 0.96, { label: 'Promenade' });

  // Bubble trail behind submarine + streetlamp pillar
  pearl(ctx, ctx.dyn('star', 'Sub Bubble Trail A'), 94, 136, 9);
  pearl(ctx, ctx.dyn('star', 'Sub Bubble Trail B'), 64, 122, 10.5);
  drawPearlPillar(ctx, 48, 214, 42, 'Promenade Lamp');

  // 3 ghosts in open sky
  ghostCreature(ctx, 'seahorse', 178, 58, 'Navigator Seahorse');
  ghostCreature(ctx, 'robot', 306, 56, 'Diving Robot Ghost');
  ghostCreature(ctx, 'koi', 442, 114, 'Promenade Koi Ghost');

  ctx.ellipsePath('ring', orbX, orbY, orb.rx, orb.ry, 24, orb.tilt);
  const sprintPath = ctx.wavePath('sprint', 62, 234, 418, 234, 8, 2, 20);
  const orbitPath = ctx.ellipsePath('orbit', 240, 88, 180, 48, 24);
  ctx.marginPath(256);

  ctx.actor('violet', 120, 242, { facing: 1, anim: 'idle' });
  ctx.actor('nova', 248, 244, { facing: 1, anim: 'leap', pathIndex: sprintPath });
  ctx.actor('cometCar', 344, 242, { facing: -1, anim: 'run', pathIndex: sprintPath });
  ctx.actor('comet', 274, 96, { facing: 1, anim: 'float', pathIndex: orbitPath });

  void archIds;
  ctx.heroQuest('shell', 'Rainbow Sub', subIds);
  ctx.heroQuest('violet', 'Violet', [1, 2, 3, 4]);
  ctx.heroQuest('nova', 'Nova', [9, 10, 11]);
  ctx.heroQuest('cloud', 'Bubble Clouds', [14, 15]);
}

// ============================================================================
// SLOT 4A: The Sunken Star-Galleon Cove
// ============================================================================
function u02_c4a(ctx: SceneCtx): void {
  initChapter(ctx, 'u02_c4a', 232, 146);
  const { rng } = ctx;

  drawSkySparkles(ctx, 18, 146, 'stars');

  const orbX = Math.round(jit(rng, 92, 5));
  const orbY = Math.round(jit(rng, 58, 3));
  const orb = drawThemedOrb(ctx, orbX, orbY, 21, 'pearlMoon', { tilt: -0.22 });

  ctx.canon(14, 'Galleon Cove Cloud', 'cloud');
  ctx.canon(15, 'Sea-Glass Drift Cloud', 'cloud');
  drawThemedCloud(ctx, 14, Math.round(jit(rng, 236, 5)), Math.round(jit(rng, 46, 3)), 82, 28, 'bubbleCluster');
  drawThemedCloud(ctx, 15, Math.round(jit(rng, 386, 5)), Math.round(jit(rng, 52, 3)), 78, 28, 'bubbleCluster');

  drawHorizonHills(ctx, { style: 'coral', yBase: 166, yBottom: 218, layers: 2 });
  drawGroundDeck(ctx, { style: 'meadow', yTop: 210, yBottom: 250, labelPrefix: 'Treasure Cove' });

  // Sunken Star-Galleon resting on cove floor + Open Treasure Chest + Kelp Guardian
  const shipIds = drawSunkenShip(ctx, 168, 174, 1.12, { label: 'Star-Galleon' });
  const chestIds = drawTreasureChest(ctx, 316, 198, 'Sea-Glass');
  drawKelpCluster(ctx, 430, 194, 0.92, { label: 'Cove', flip: -1 });
  star(ctx, ctx.dyn('star', 'Compass Rose Star'), 316, 102, 12, { points: 4, inner: 0.44 });
  pearl(ctx, ctx.dyn('star', 'Cove Pearl Orb'), 56, 152, 10);

  // 3 ghosts in open sky
  ghostCreature(ctx, 'crystal', 166, 58, 'Sea-Glass Gem Ghost');
  ghostCreature(ctx, 'seahorse', 312, 56, 'Cove Seahorse Ghost');
  ghostCreature(ctx, 'koi', 442, 108, 'Treasure Koi Ghost');

  ctx.ellipsePath('ring', orbX, orbY, orb.rx, orb.ry, 24, orb.tilt);
  const swimPath = ctx.wavePath('swim', 70, 118, 412, 114, 16, 1.5, 22);
  const sprintPath = ctx.wavePath('sprint', 68, 238, 408, 238, 8, 2, 20);
  ctx.ellipsePath('orbit', 240, 84, 176, 46, 24);
  ctx.marginPath(256);

  ctx.actor('violet', 102, 244, { facing: 1, anim: 'idle' });
  ctx.actor('nova', 240, 244, { facing: 1, anim: 'idle', pathIndex: sprintPath });
  ctx.actor('whale', 246, 114, { facing: 1, anim: 'swim', pathIndex: swimPath });
  ctx.actor('moonCat', 378, 242, { facing: -1, anim: 'sleep' });

  void chestIds;
  ctx.heroQuest('shell', 'Star Galleon', shipIds);
  ctx.heroQuest('violet', 'Violet', [1, 2, 3, 4]);
  ctx.heroQuest('whale', 'Cove Whale', [19, 29]);
  ctx.heroQuest('planet', 'Pearl Moon', [12, 13]);
}

// ============================================================================
// SLOT 4B: The Sea-Anemone Carousel Reef
// ============================================================================
function u02_c4b(ctx: SceneCtx): void {
  initChapter(ctx, 'u02_c4b', 240, 144);
  const { rng } = ctx;

  drawSkySparkles(ctx, 18, 144, 'bubbles');

  const orbX = Math.round(jit(rng, 384, 5));
  const orbY = Math.round(jit(rng, 56, 3));
  const orb = drawThemedOrb(ctx, orbX, orbY, 21, 'bubbleOrb', { tilt: -0.25 });

  ctx.canon(14, 'Carousel Foam Cloud', 'cloud');
  ctx.canon(15, 'Manta Breeze Cloud', 'cloud');
  drawThemedCloud(ctx, 14, Math.round(jit(rng, 92, 5)), Math.round(jit(rng, 52, 3)), 82, 28, 'bubbleCluster');
  drawThemedCloud(ctx, 15, Math.round(jit(rng, 242, 5)), Math.round(jit(rng, 44, 3)), 76, 26, 'bubbleCluster');

  drawHorizonHills(ctx, { style: 'coral', yBase: 164, yBottom: 214, layers: 2 });
  drawGroundDeck(ctx, { style: 'stage', yTop: 208, yBottom: 250, labelPrefix: 'Carousel Reef' });

  // Centerpiece Reef Carousel + flanking Whirling Sea-Anemone Blooms + Gliding Star Manta
  const carouselIds = drawCarousel(ctx, 240, 172, 1.04, { label: 'Reef' });
  drawSeaAnemone(ctx, 80, 198, 1.05, 'West Anemone');
  drawSeaAnemone(ctx, 400, 198, 1.05, 'East Anemone');
  const mantaIds = drawStarManta(ctx, 138, 114, 0.92, 'Starry Manta');

  // 3 ghosts in open sky
  ghostCreature(ctx, 'seahorse', 176, 56, 'Carousel Seahorse');
  ghostCreature(ctx, 'moth', 310, 62, 'Reef Moth Ghost');
  ghostCreature(ctx, 'koi', 442, 118, 'Spinning Koi Ghost');

  ctx.ellipsePath('ring', orbX, orbY, orb.rx, orb.ry, 24, orb.tilt);
  const swimPath = ctx.wavePath('swim', 62, 122, 418, 116, 18, 1.5, 22);
  const gallopPath = ctx.wavePath('gallop', 66, 236, 414, 236, 10, 2, 20);
  const orbitPath = ctx.ellipsePath('orbit', 240, 86, 178, 46, 24);
  ctx.marginPath(256);

  ctx.actor('lumi', 142, 244, { facing: 1, anim: 'rear', pathIndex: gallopPath });
  ctx.actor('gazelle', 342, 244, { facing: -1, anim: 'leap', pathIndex: gallopPath });
  ctx.actor('whale', 346, 124, { facing: -1, anim: 'swim', pathIndex: swimPath });
  ctx.actor('comet', 240, 88, { facing: 1, anim: 'float', pathIndex: orbitPath });

  void mantaIds;
  ctx.heroQuest('jelly', 'Reef Carousel', carouselIds);
  ctx.heroQuest('lumi', 'Lumi', [5, 6, 7, 8]);
  ctx.heroQuest('whale', 'Star Whale', [19, 29]);
  ctx.heroQuest('cloud', 'Bubble Clouds', [14, 15]);
}

// ============================================================================
// SLOT 5 FINALE: The Grand Coral Crown Palace (50..70 regions!)
// ============================================================================
function u02_c5(ctx: SceneCtx): void {
  initChapter(ctx, 'u02_c5', 240, 122);
  const { r, rng } = ctx;

  drawSkySparkles(ctx, 22, 136, 'bubbles');

  // 1) Celestial Orb (12/13) framing the palace sky (2 regions)
  const orbX = 78 + Math.round(jit(rng, 0, 3));
  const orbY = 56 + Math.round(jit(rng, 0, 2));
  const orb = drawThemedOrb(ctx, orbX, orbY, 19, 'pearlMoon', { tilt: -0.24 });

  // 2) Horizon reef terraces & grand stage deck (4 regions)
  drawHorizonHills(ctx, { style: 'coral', yBase: 162, yBottom: 214, layers: 2 });
  drawGroundDeck(ctx, { style: 'stage', yTop: 208, yBottom: 250, labelPrefix: 'Crown Palace' });

  // 3) Grand Symmetrical Coral Crown Palace Centerpiece (~15 chunky regions!)
  const palaceQuestIds: number[] = [];
  const cx = 240;

  // Radiant halo shell petals fanning behind the palace dome (7 individual chunky scallop petals!)
  for (let i = -3; i <= 3; i++) {
    const a = -Math.PI / 2 + i * 0.34;
    const pid = ctx.dyn('flora', `Palace Crown Ray ${i + 4}`);
    const bx = cx + Math.cos(a) * 56;
    const by = 132 + Math.sin(a) * 52;
    const tx = cx + Math.cos(a) * 86;
    const ty = 132 + Math.sin(a) * 78;
    r.capsule(pid, bx, by, tx, ty, 8.5);
    r.disc(pid, tx, ty, 9.5);
    r.line(INK, bx, by, tx, ty, { only: [pid] });
    if (Math.abs(i) <= 1) palaceQuestIds.push(pid);
  }

  // Twin side reef spire turrets
  for (const side of [-1, 1] as const) {
    const tag = side < 0 ? 'West' : 'East';
    const spire = ctx.dyn('prop', `${tag} Palace Spire`);
    const sx = cx + side * 66;
    r.poly(spire, [[sx, 74], [sx + 16, 126], [sx + 14, 192], [sx - 14, 192], [sx - 16, 126]]);
    r.line(INK, sx, 80, sx, 188, { only: [spire] });
    const tipOrb = ctx.dyn('star', `${tag} Spire Pearl`);
    pearl(ctx, tipOrb, sx, 68, 9);
  }

  // Grand central pearl palace dome + scalloped facade + glowing choir portal
  const dome = ctx.dyn('prop', 'Grand Coral Dome');
  r.disc(dome, cx, 134, 46);
  r.rect(dome, cx - 46, 134, cx + 46, 198);
  inkArc(r, cx, 134, 24, 44, Math.PI, Math.PI * 2, 0, { only: [dome] });
  r.line(INK, cx, 90, cx, 194, { only: [dome] });
  palaceQuestIds.push(dome);

  const crownBand = ctx.dyn('star', 'Palace Diadem Arch');
  r.poly(crownBand, [
    [cx - 48, 134],
    [cx - 32, 118],
    [cx - 16, 130],
    [cx, 112],
    [cx + 16, 130],
    [cx + 32, 118],
    [cx + 48, 134],
    [cx + 46, 146],
    [cx - 46, 146],
  ]);
  palaceQuestIds.push(crownBand);

  const portal = ctx.dyn('star', 'Ocean Choir Portal');
  r.disc(portal, cx, 170, 18);
  r.rect(portal, cx - 18, 170, cx + 18, 206);
  inkArc(r, cx, 170, 11, 11, Math.PI, Math.PI * 2, 0, { only: [portal] });
  palaceQuestIds.push(portal);

  const altarPearl = ctx.dyn('star', 'Heart of the Reef Pearl');
  pearl(ctx, altarPearl, cx, 174, 10.5);
  palaceQuestIds.push(altarPearl);

  // 4) Flanking Wing Landmarks + Foreground Framing Clouds 14/15 (12 regions!)
  drawJellyfish(ctx, 112, 134, 0.86, { label: 'Choir West' });
  drawJellyfish(ctx, 368, 134, 0.86, { label: 'Choir East', flip: -1 });
  drawSeaAnemone(ctx, 38, 174, 0.82, 'Palace West Anemone');
  drawSeaAnemone(ctx, 442, 174, 0.82, 'Palace East Anemone');
  ctx.canon(14, 'Palace Crown Cloud', 'cloud');
  ctx.canon(15, 'Ocean Choir Cloud', 'cloud');
  drawThemedCloud(ctx, 14, 52, 224, 82, 26, 'bubbleCluster');
  drawThemedCloud(ctx, 15, 428, 224, 82, 26, 'bubbleCluster');

  // 5) Celebration Sky Crown Ornaments (8 regions!)
  const eastMoon = ctx.dyn('star', 'East Palace Crescent');
  crescent(ctx, eastMoon, 404, 56, 18, -0.4);
  star(ctx, ctx.dyn('star', 'Palace Zenith Star'), cx, 22, 10.5, { points: 5, inner: 0.48 });
  twinkle(ctx, ctx.dyn('star', 'West Choir Twinkle'), 148, 42, 11);
  twinkle(ctx, ctx.dyn('star', 'East Choir Twinkle'), 332, 42, 11);
  pearl(ctx, ctx.dyn('star', 'Choir Bubble West-1'), 122, 78, 8.5);
  pearl(ctx, ctx.dyn('star', 'Choir Bubble East-1'), 358, 78, 8.5);
  star(ctx, ctx.dyn('star', 'West Rim Star'), 28, 104, 10, { points: 5, inner: 0.48 });
  star(ctx, ctx.dyn('star', 'East Rim Star'), 452, 104, 10, { points: 5, inner: 0.48 });

  // 6) 3 Ghosts in clean open upper sky pockets
  ghostCreature(ctx, 'seahorse', 190, 30, 'Royal Seahorse Ghost');
  ghostCreature(ctx, 'treble', 290, 30, 'Ocean Choir Ghost');
  ghostCreature(ctx, 'koi', 446, 56, 'Crown Koi Ghost');

  // 7) Paths
  ctx.ellipsePath('ring', orbX, orbY, orb.rx, orb.ry, 24, orb.tilt);
  const gallopPath = ctx.wavePath('gallop', 62, 238, 418, 238, 8, 2, 20);
  const sprintPath = ctx.wavePath('sprint', 78, 236, 402, 236, 8, 2, 20);
  const swimPath = ctx.wavePath('swim', 54, 102, 426, 102, 16, 1.5, 24);
  const orbitPath = ctx.ellipsePath('orbit', 240, 88, 186, 54, 28);
  ctx.marginPath(256);

  // 8) Full Hero Cast + Ocean Companions (15 regions!)
  ctx.actor('lumi', 140, 246, { facing: 1, anim: 'rear', pathIndex: gallopPath });
  ctx.actor('violet', 240, 248, { facing: 1, anim: 'idle' });
  ctx.actor('nova', 340, 246, { facing: -1, anim: 'leap', pathIndex: sprintPath });
  ctx.actor('whale', 64, 108, { facing: 1, anim: 'swim', pathIndex: swimPath });
  ctx.actor('comet', 404, 96, { facing: -1, anim: 'float', pathIndex: orbitPath });

  ctx.heroQuest('shell', 'Coral Palace', palaceQuestIds);
  ctx.heroQuest('violet', 'Violet', [1, 2, 3, 4]);
  ctx.heroQuest('lumi', 'Lumi', [5, 6, 7, 8]);
  ctx.heroQuest('nova', 'Nova', [9, 10, 11]);
}

export const U02_SCENES = {
  hub_coralKingdom,
  u02_c1,
  u02_c2a,
  u02_c2b,
  u02_c3a,
  u02_c3b,
  u02_c4a,
  u02_c4b,
  u02_c5,
} satisfies Partial<Record<SceneId, (ctx: SceneCtx) => void>>;

void rot;
