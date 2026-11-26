/**
 * Universe 11: Amethyst Geode Caverns (`crystalGeodeCaverns`)
 * 9 bespoke scenes: Hub Sanctuary ("Violet's Faceted Prism Grotto") + 8 Geode Chapters,
 * culminating in the double-dense Heart-of-the-Geode Crown Dome finale.
 * Pure & deterministic (uses ctx.rng only; zero timers or wall-clock APIs).
 */
import { MaterialId } from '../../contracts/materials';
import { UNIVERSE_BY_ID } from '../../contracts/universes';
import type { SceneCtx } from '../context';
import {
  drawCrystalCluster,
  drawGeodeCathedral,
  drawGhostSilhouette,
  drawGroundDeck,
  drawHorizonHills,
  drawMinecart,
  drawPortalArch,
  drawPrismCrown,
  drawSanctuaryRoom,
  drawSkySparkles,
  drawThemedCloud,
  drawThemedOrb,
} from '../kit';
import { inkArc, jit, star, twinkle } from '../props';
import { INK, type Pt } from '../raster';

const DEF = UNIVERSE_BY_ID.crystalGeodeCaverns;

type U11SceneId =
  | 'hub_crystalGeodeCaverns'
  | 'u11_c1'
  | 'u11_c2a'
  | 'u11_c2b'
  | 'u11_c3a'
  | 'u11_c3b'
  | 'u11_c4a'
  | 'u11_c4b'
  | 'u11_c5';

function initChapter(ctx: SceneCtx, chapterIdx: number, focalX = 240, focalY = 160): void {
  const ch = DEF.chapters[chapterIdx]!;
  ctx.title = ch.title;
  ctx.sky = { ...DEF.sky };
  ctx.universeId = DEF.id;
  ctx.ambient = DEF.ambient;
  ctx.focal = { x: focalX, y: focalY };
}

/** Faceted hanging amethyst stalactite cluster on cavern ceiling (1 chunky region). */
function drawCeilingStalactites(ctx: SceneCtx, x0: number, x1: number, yTop: number, depth: number, label: string): number {
  const { r } = ctx;
  const id = ctx.dyn('asteroid', label);
  const pts: Pt[] = [[x0, yTop], [x1, yTop]];
  const teeth = 5;
  for (let i = teeth; i >= 0; i--) {
    const t = i / teeth;
    const x = x0 + (x1 - x0) * t;
    const tipY = yTop + depth * (i % 2 === 1 ? 1.0 : 0.44);
    pts.push([x, tipY]);
  }
  r.poly(id, pts);
  for (let i = 1; i < teeth; i += 2) {
    const x = x0 + ((x1 - x0) * i) / teeth;
    r.line(INK, x, yTop + 4, x, yTop + depth * 0.84, { only: [id] });
  }
  return id;
}

/** Looping crystalline minecart rail trestle bridge (2 regions: track deck + crystal piers). */
function drawMinecartTrestle(ctx: SceneCtx, x0: number, x1: number, yTop: number, yBot: number, label = 'Crystal Trestle'): number[] {
  const { r } = ctx;
  const deck = ctx.dyn('star', `${label} Rail`);
  const piers = ctx.dyn('prop', `${label} Piers`);

  r.shape(piers, x0, yTop + 8, x1, yBot, (px, py) => {
    if (py < yTop + 10 || py > yBot) return false;
    const span = (x1 - x0) / 4;
    const u = ((px - x0) % span) / span;
    const dx = (u - 0.5) * 2;
    if (py > yTop + 20) {
      const d = Math.hypot(dx / 0.62, (py - yBot) / (yBot - (yTop + 16)));
      if (d < 0.72) return false;
    }
    return true;
  });
  r.rect(deck, x0, yTop, x1, yTop + 12);
  for (let x = x0 + 16; x < x1 - 12; x += 20) {
    r.line(INK, x, yTop + 2, x, yTop + 10, { only: [deck] });
  }
  return [deck, piers];
}

/** Iridescent underground opal mirror lake reflecting cavern ceiling gems (2 regions). */
function drawOpalMirrorLake(ctx: SceneCtx, cx: number, cy: number, rx: number, ry: number, label = 'Opal Mirror Lake'): number[] {
  const { r } = ctx;
  const bank = ctx.dyn('prop', `${label} Rim`);
  const mirror = ctx.dyn('star', `${label} Water`);
  r.ellipse(bank, cx, cy, rx + 10, ry + 6);
  r.ellipse(mirror, cx, cy, rx, ry);
  inkArc(r, cx - rx * 0.3, cy, rx * 0.25, ry * 0.36, 0, Math.PI * 2, 0, { only: [mirror] });
  inkArc(r, cx + rx * 0.3, cy + 2, rx * 0.22, ry * 0.34, 0, Math.PI * 2, 0, { only: [mirror] });
  r.line(INK, cx - rx * 0.52, cy, cx + rx * 0.52, cy, { only: [mirror] });
  return [bank, mirror];
}

/** Suspended Mint-Quartz Crystal Chandelier hanging from vault crown (3 regions). */
function drawQuartzChandelier(ctx: SceneCtx, x: number, y: number, scale = 1, label = 'Quartz Chandelier'): number[] {
  const { r } = ctx;
  const s = Math.max(0.68, scale);
  const frame = ctx.dyn('prop', `${label} Crown`);
  const crystals = ctx.dyn('star', `${label} Prisms`);
  const centerGem = ctx.dyn('star', `${label} Drop`);

  r.rect(frame, x - 5 * s, y - 34 * s, x + 5 * s, y - 8 * s);
  r.ellipse(frame, x, y - 6 * s, 38 * s, 9 * s);
  r.line(INK, x - 28 * s, y - 6 * s, x + 28 * s, y - 6 * s, { only: [frame] });

  // Flanking suspended crystal prism pendants
  for (const cx0 of [-28, -14, 14, 28]) {
    r.poly(crystals, [
      [x + cx0 * s, y + 2 * s],
      [x + (cx0 + 7) * s, y + 14 * s],
      [x + cx0 * s, y + 30 * s],
      [x + (cx0 - 7) * s, y + 14 * s],
    ]);
  }
  r.poly(centerGem, [
    [x, y + 2 * s],
    [x + 12 * s, y + 18 * s],
    [x, y + 38 * s],
    [x - 12 * s, y + 18 * s],
  ]);
  r.line(INK, x, y + 6 * s, x, y + 34 * s, { only: [centerGem] });
  return [frame, crystals, centerGem];
}

/** Stepped ruby & rose-quartz terraced mineral waterfall pools (3 regions). */
function drawQuartzTerraceCascade(ctx: SceneCtx, x: number, y: number, scale = 1, label = 'Quartz Terraces'): number[] {
  const { r } = ctx;
  const s = Math.max(0.75, scale);
  const upper = ctx.dyn('asteroid', `${label} Upper Tier`);
  const lower = ctx.dyn('prop', `${label} Lower Tier`);
  const cascade = ctx.dyn('star', `${label} Cascade`);

  r.ellipse(upper, x, y - 16 * s, 32 * s, 12 * s);
  r.rect(upper, x - 32 * s, y - 16 * s, x + 32 * s, y + 2 * s);
  r.ellipse(lower, x, y + 14 * s, 46 * s, 16 * s);
  r.rect(lower, x - 46 * s, y + 14 * s, x + 46 * s, y + 36 * s);
  r.line(INK, x - 36 * s, y + 26 * s, x + 36 * s, y + 26 * s, { only: [lower] });

  r.poly(cascade, [
    [x - 18 * s, y - 16 * s],
    [x + 18 * s, y - 16 * s],
    [x + 26 * s, y + 36 * s],
    [x - 26 * s, y + 36 * s],
  ]);
  for (const fx of [-10, 0, 10]) {
    r.line(INK, x + fx * s, y - 12 * s, x + fx * 1.2 * s, y + 32 * s, { only: [cascade] });
  }
  return [upper, lower, cascade];
}

/** Refracted beam-of-prism-light crystal arch spanning a subterranean abyss (2 regions). */
function drawPrismLightBridge(ctx: SceneCtx, cx: number, yBase: number, w: number, h: number, label = 'Prism Bridge'): number[] {
  const { r } = ctx;
  const hw = w / 2;
  const beam = ctx.dyn('star', `${label} Beam`);
  const facets = ctx.dyn('prop', `${label} Facets`);

  const bTop: Pt[] = [];
  const bBot: Pt[] = [];
  for (let i = 0; i <= 16; i++) {
    const t = i / 16;
    const x = cx - hw + t * w;
    const lift = Math.sin(t * Math.PI) * h;
    bTop.push([x, yBase - lift - 14]);
    bBot.push([x, yBase - lift * 0.54 + 6]);
  }
  bBot.reverse();
  r.poly(facets, [...bTop, ...bBot]);
  for (let i = 2; i <= 14; i += 2) {
    const t = i / 16;
    const x = cx - hw + t * w;
    const lift = Math.sin(t * Math.PI) * h;
    r.line(INK, x, yBase - lift - 10, x, yBase - lift * 0.54 + 2, { only: [facets] });
  }

  const rTop: Pt[] = [];
  const rBot: Pt[] = [];
  for (let i = 0; i <= 16; i++) {
    const t = i / 16;
    const x = cx - hw + t * w;
    const lift = Math.sin(t * Math.PI) * h;
    rTop.push([x, yBase - lift - 24]);
    rBot.push([x, yBase - lift - 13]);
  }
  rBot.reverse();
  r.poly(beam, [...rTop, ...rBot]);
  return [beam, facets];
}

// ===========================================================================
// HUB SANCTUARY: Violet's Faceted Prism Grotto (25..45 pre-colored regions, 0 ghosts)
// ===========================================================================
function buildHubCrystalGeodeCaverns(ctx: SceneCtx): void {
  ctx.universeId = DEF.id;
  ctx.ambient = DEF.ambient;

  let prismCluster: number[] = [];

  drawSanctuaryRoom(ctx, {
    title: DEF.hubTitle,
    sky: { ...DEF.sky },
    windowShape: 'gothic',
    windowOrbStyle: 'geode',
    wallStyle: 'crystal',
    floorStyle: 'tile',
    rugShape: 'diamond',
    lampStyle: 'crystal',
    garlandStyle: 'stars',
    sparkleStyle: 'stars',
    seatingLabel: 'Amethyst Grotto Couch',
    workbenchLabel: 'Gemcutter Workbench',
    shelfLabel: 'Mineral Specimen Shelf',
    trinketLabels: ['Amethyst Geodes', 'Opal Prisms', 'Cavern Maps'],
    palette: {
      wallPanel: MaterialId.VelvetNebula,
      floor: MaterialId.DeepSpaceBiolum,
      windowFrame: MaterialId.RoyalAstralGold,
      windowGlass: MaterialId.SupernovaGlitter,
      curtain: MaterialId.DragonflyIridescence,
      orbCore: MaterialId.SupernovaGlitter,
      orbRing: MaterialId.CrystalGlacierMint,
      rugOuter: MaterialId.VelvetNebula,
      rugInner: MaterialId.CrystalGlacierMint,
      furniture: MaterialId.RoyalAstralGold,
      furnitureTrim: MaterialId.SupernovaGlitter,
      accentA: MaterialId.CrystalGlacierMint,
      accentB: MaterialId.HoloFoil,
      accentC: MaterialId.StrawberrySupernova,
    },
    drawWindowView: (c, wx, _wy, wHalf, wBot) => {
      // Faceted glowing amethyst stalagmite skyline inside lower gothic window
      const spikes = c.dyn('asteroid', 'Window Geode Spires');
      c.r.poly(spikes, [
        [wx - wHalf + 2, wBot - 1],
        [wx - 32, wBot - 22],
        [wx - 16, wBot - 12],
        [wx, wBot - 30],
        [wx + 18, wBot - 14],
        [wx + 32, wBot - 24],
        [wx + wHalf - 2, wBot - 1],
      ]);
      c.preColor(spikes, MaterialId.CrystalGlacierMint);
    },
    drawExtraProps: (c) => {
      const extras: number[] = [];
      // 1) Framed Prism Crystal Crest on left upper wall
      const crestFrame = c.dyn('prop', 'Geode Crest Plaque');
      const crestGem = c.dyn('star', 'Wall Amethyst Prism');
      c.r.rect(crestFrame, 48, 68, 108, 118);
      c.preColor(crestFrame, MaterialId.RoyalAstralGold);
      c.r.poly(crestGem, [[78, 72], [94, 93], [78, 114], [62, 93]]);
      c.r.line(INK, 78, 76, 78, 110, { only: [crestGem] });
      c.preColor(crestGem, MaterialId.HoloFoil);
      extras.push(crestFrame, crestGem);

      // 2) Standing Mint-Quartz Spire Cluster in right-center (x=282, y=194)
      const qBase = c.dyn('prop', 'Grotto Quartz Base');
      const qSpire = c.dyn('star', 'Grotto Mint-Quartz');
      c.r.ellipse(qBase, 282, 202, 18, 7);
      c.preColor(qBase, MaterialId.RoyalAstralGold);
      c.r.poly(qSpire, [[282, 154], [292, 174], [290, 200], [274, 200], [272, 174]]);
      c.r.poly(qSpire, [[268, 168], [276, 176], [276, 200], [266, 200]]);
      c.r.line(INK, 282, 158, 282, 198, { only: [qSpire] });
      c.preColor(qSpire, MaterialId.CrystalGlacierMint);
      prismCluster = [qBase, qSpire];
      extras.push(qBase, qSpire);

      // 3) Tabletop Split Amethyst Geode Specimen on workbench right (x=374, y=166)
      const gShell = c.dyn('prop', 'Desk Geode Shell');
      const gCore = c.dyn('star', 'Desk Amethyst Core');
      c.r.ellipse(gShell, 374, 166, 15, 13);
      c.preColor(gShell, MaterialId.VelvetNebula);
      c.r.ellipse(gCore, 374, 166, 9, 8);
      c.preColor(gCore, MaterialId.StrawberrySupernova);
      extras.push(gShell, gCore);

      return extras;
    },
  });

  ctx.heroQuest('violet', 'Violet', [1, 2, 3, 4]);
  ctx.heroQuest('planet', 'Geode Orb', [12, 13]);
  ctx.heroQuest('geode', 'Quartz Spire', prismCluster);
}

// ===========================================================================
// CHAPTER 1: The Gem-Arch Tunnel Entry (`u11_c1`)
// ===========================================================================
function buildU11C1(ctx: SceneCtx): void {
  const { rng } = ctx;
  initChapter(ctx, 0, 240, 168);
  drawSkySparkles(ctx, 20, 148, 'stars');

  const orb = drawThemedOrb(ctx, Math.round(jit(rng, 374, 4)), Math.round(jit(rng, 54, 3)), 20, 'geode');
  drawThemedCloud(ctx, 14, Math.round(jit(rng, 106, 5)), Math.round(jit(rng, 48, 3)), 78, 26, 'origami');
  drawThemedCloud(ctx, 15, Math.round(jit(rng, 240, 5)), Math.round(jit(rng, 44, 3)), 72, 26, 'origami');
  const stalL = drawCeilingStalactites(ctx, 14, 160, 0, 32, 'West Tunnel Stalactites');
  star(ctx, ctx.dyn('star', 'Cavern Entry Star'), 442, 46, 11, { points: 4, inner: 0.44 });

  drawHorizonHills(ctx, { style: 'peaks', yBase: 168, yBottom: 224, layers: 2 });
  drawGroundDeck(ctx, { style: 'courtyard', yTop: 210, yBottom: 250 });

  const archIds = drawPortalArch(ctx, 240, 170, 0.98, { label: 'Gem-Arch' });
  const spireL = drawCrystalCluster(ctx, 84, 176, 0.88, { label: 'West Entry' });
  const spireR = drawCrystalCluster(ctx, 396, 176, 0.88, { label: 'East Entry', flip: -1 });

  drawGhostSilhouette(ctx, 'Tunnel Crystal Ghost', 'crystal', Math.round(jit(rng, 290, 4)), Math.round(jit(rng, 108, 3)), 0.94);
  drawGhostSilhouette(ctx, 'Cavern Moth Ghost', 'moth', Math.round(jit(rng, 154, 4)), Math.round(jit(rng, 108, 3)), 0.92);

  const gallopPath = ctx.wavePath('gallop', 66, 234, 412, 232, 9, 1.5, 18);
  const orbitPath = ctx.ellipsePath('orbit', 240, 94, 168, 46, 24);
  ctx.ellipsePath('ring', 374, 54, orb.rx, orb.ry, 20, orb.tilt);
  ctx.marginPath(256);

  ctx.actor('violet', 166, 240, { facing: 1, anim: 'idle' });
  ctx.actor('lumi', 316, 238, { facing: -1, anim: 'idle', pathIndex: gallopPath });
  ctx.actor('moonCat', 396, 134, { facing: -1, anim: 'sleep' });
  ctx.actor('comet', 178, 82, { facing: 1, anim: 'float', pathIndex: orbitPath });

  ctx.heroQuest('portal', 'Gem Arch', archIds);
  ctx.heroQuest('geode', 'Entry Spires', [...spireL, ...spireR, stalL]);
  ctx.heroQuest('violet', 'Violet', [1, 2, 3, 4]);
  ctx.heroQuest('lumi', 'Lumi', [5, 6, 7, 8]);
}

// ===========================================================================
// CHAPTER 2A: The Amethyst Cathedral Vault (`u11_c2a`)
// ===========================================================================
function buildU11C2a(ctx: SceneCtx): void {
  const { rng } = ctx;
  initChapter(ctx, 1, 240, 166);
  drawSkySparkles(ctx, 20, 146, 'stars');

  const orb = drawThemedOrb(ctx, Math.round(jit(rng, 108, 4)), Math.round(jit(rng, 52, 3)), 19, 'geode');
  drawThemedCloud(ctx, 14, Math.round(jit(rng, 248, 5)), Math.round(jit(rng, 44, 3)), 76, 26, 'origami');
  drawThemedCloud(ctx, 15, Math.round(jit(rng, 386, 5)), Math.round(jit(rng, 48, 3)), 74, 26, 'origami');
  const stalR = drawCeilingStalactites(ctx, 316, 466, 0, 32, 'East Vault Stalactites');

  drawHorizonHills(ctx, { style: 'peaks', yBase: 168, yBottom: 224, layers: 2 });
  drawGroundDeck(ctx, { style: 'courtyard', yTop: 210, yBottom: 250 });

  const geodeIds = drawGeodeCathedral(ctx, 240, 166, 1.04, { label: 'Amethyst' });
  const pillarL = drawCrystalCluster(ctx, 86, 174, 0.92, { label: 'West Organ' });
  const pillarR = drawCrystalCluster(ctx, 394, 174, 0.92, { label: 'East Organ', flip: -1 });

  drawGhostSilhouette(ctx, 'Vault Crystal Ghost', 'crystal', Math.round(jit(rng, 164, 4)), Math.round(jit(rng, 104, 3)), 0.94);
  drawGhostSilhouette(ctx, 'Cathedral Owl Ghost', 'owl', Math.round(jit(rng, 326, 4)), Math.round(jit(rng, 104, 3)), 0.92);

  const sprintPath = ctx.wavePath('sprint', 68, 234, 412, 232, 9, 2, 18);
  const orbitPath = ctx.ellipsePath('orbit', 240, 92, 166, 44, 24);
  ctx.ellipsePath('ring', 108, 52, orb.rx, orb.ry, 20, orb.tilt);
  ctx.marginPath(256);

  ctx.actor('violet', 162, 240, { facing: 1, anim: 'idle' });
  ctx.actor('nova', 322, 238, { facing: -1, anim: 'sleep', pathIndex: sprintPath });
  ctx.actor('moonCat', 240, 238, { facing: 1, anim: 'sleep' });
  ctx.actor('comet', 360, 78, { facing: -1, anim: 'float', pathIndex: orbitPath });

  ctx.heroQuest('geode', 'Amethyst Vault', geodeIds);
  ctx.heroQuest('asteroid', 'Quartz Pillars', [...pillarL, ...pillarR, stalR]);
  ctx.heroQuest('violet', 'Violet', [1, 2, 3, 4]);
  ctx.heroQuest('nova', 'Nova', [9, 10, 11]);
}

// ===========================================================================
// CHAPTER 2B: The Rainbow Minecart Rollerway (`u11_c2b`)
// ===========================================================================
function buildU11C2b(ctx: SceneCtx): void {
  const { rng } = ctx;
  initChapter(ctx, 2, 240, 168);
  drawSkySparkles(ctx, 18, 144, 'stars');

  const orb = drawThemedOrb(ctx, Math.round(jit(rng, 374, 4)), Math.round(jit(rng, 52, 3)), 19, 'geode');
  drawThemedCloud(ctx, 14, Math.round(jit(rng, 104, 5)), Math.round(jit(rng, 44, 3)), 76, 26, 'origami');
  drawThemedCloud(ctx, 15, Math.round(jit(rng, 238, 5)), Math.round(jit(rng, 40, 3)), 72, 26, 'origami');
  twinkle(ctx, ctx.dyn('star', 'Rollerway Gem Star'), 44, 94, 12);

  drawHorizonHills(ctx, { style: 'peaks', yBase: 162, yBottom: 224, layers: 2 });
  const trestleIds = drawMinecartTrestle(ctx, 14, 466, 196, 250, 'Crystal Rollerway');

  const cartMid = drawMinecart(ctx, 240, 166, 1.0, { label: 'Rainbow' });
  const cartL = drawMinecart(ctx, 92, 170, 0.84, { label: 'Trailing' });
  const veinR = drawCrystalCluster(ctx, 396, 166, 0.88, { label: 'Gem Vein', flip: -1 });

  drawGhostSilhouette(ctx, 'Minecart Crystal Ghost', 'crystal', Math.round(jit(rng, 164, 4)), Math.round(jit(rng, 104, 3)), 0.94);
  drawGhostSilhouette(ctx, 'Tunnel Moth Ghost', 'moth', Math.round(jit(rng, 320, 4)), Math.round(jit(rng, 102, 3)), 0.92);

  const gallopPath = ctx.wavePath('gallop', 66, 234, 412, 232, 8, 1.5, 18);
  const orbitPath = ctx.ellipsePath('orbit', 240, 92, 166, 44, 24);
  ctx.ellipsePath('ring', 374, 52, orb.rx, orb.ry, 20, orb.tilt);
  ctx.marginPath(256);

  ctx.actor('violet', 166, 242, { facing: 1, anim: 'idle' });
  ctx.actor('lumi', 324, 242, { facing: -1, anim: 'idle', pathIndex: gallopPath });
  ctx.actor('moonCat', 240, 126, { facing: 1, anim: 'sleep' });
  ctx.actor('comet', 172, 78, { facing: 1, anim: 'float', pathIndex: orbitPath });

  ctx.heroQuest('geode', 'Gem Minecarts', [...cartMid, ...cartL, ...trestleIds]);
  ctx.heroQuest('asteroid', 'Crystal Vein', veinR);
  ctx.heroQuest('violet', 'Violet', [1, 2, 3, 4]);
  ctx.heroQuest('lumi', 'Lumi', [5, 6, 7, 8]);
}

// ===========================================================================
// CHAPTER 3A: The Opal Mirror Underground Lake (`u11_c3a`)
// ===========================================================================
function buildU11C3a(ctx: SceneCtx): void {
  const { rng } = ctx;
  initChapter(ctx, 3, 240, 172);
  drawSkySparkles(ctx, 20, 146, 'stars');

  const orb = drawThemedOrb(ctx, Math.round(jit(rng, 240, 4)), Math.round(jit(rng, 52, 3)), 19, 'geode');
  drawThemedCloud(ctx, 14, Math.round(jit(rng, 88, 5)), Math.round(jit(rng, 48, 3)), 76, 26, 'origami');
  drawThemedCloud(ctx, 15, Math.round(jit(rng, 392, 5)), Math.round(jit(rng, 48, 3)), 76, 26, 'origami');

  drawHorizonHills(ctx, { style: 'peaks', yBase: 164, yBottom: 218, layers: 2 });
  drawGroundDeck(ctx, { style: 'courtyard', yTop: 198, yBottom: 250, includeTrim: false });
  const lakeIds = drawOpalMirrorLake(ctx, 240, 224, 162, 22, 'Opal Mirror');

  const grottoL = drawGeodeCathedral(ctx, 88, 170, 0.88, { label: 'Lake Grotto' });
  const reefR = drawCrystalCluster(ctx, 392, 172, 0.88, { label: 'Opal Reef', flip: -1 });
  const dropMid = drawQuartzChandelier(ctx, 240, 114, 0.72, 'Mirror Vault');

  drawGhostSilhouette(ctx, 'Opal Crystal Ghost', 'crystal', Math.round(jit(rng, 152, 4)), Math.round(jit(rng, 102, 3)), 0.92);
  drawGhostSilhouette(ctx, 'Lake Moth Ghost', 'moth', Math.round(jit(rng, 330, 4)), Math.round(jit(rng, 102, 3)), 0.92);

  const swimPath = ctx.wavePath('swim', 76, 174, 404, 170, 12, 1.5, 20);
  const orbitPath = ctx.ellipsePath('orbit', 240, 96, 170, 46, 24);
  ctx.ellipsePath('ring', 240, 52, orb.rx, orb.ry, 20, orb.tilt);
  ctx.marginPath(256);

  ctx.actor('violet', 166, 240, { facing: 1, anim: 'idle' });
  ctx.actor('whale', 240, 184, { facing: 1, anim: 'swim', pathIndex: swimPath });
  ctx.actor('moonCat', 392, 238, { facing: -1, anim: 'sleep' });
  ctx.actor('comet', 362, 86, { facing: -1, anim: 'float', pathIndex: orbitPath });

  ctx.heroQuest('geode', 'Opal Lake', [...lakeIds, ...grottoL, ...reefR]);
  ctx.heroQuest('lantern', 'Vault Drop', dropMid);
  ctx.heroQuest('whale', 'Crystal Whale', [19, 29]);
  ctx.heroQuest('violet', 'Violet', [1, 2, 3, 4]);
}

// ===========================================================================
// CHAPTER 3B: The Mint-Quartz Chandelier Hall (`u11_c3b`)
// ===========================================================================
function buildU11C3b(ctx: SceneCtx): void {
  const { rng } = ctx;
  initChapter(ctx, 4, 240, 156);
  drawSkySparkles(ctx, 20, 146, 'stars');

  const orb = drawThemedOrb(ctx, Math.round(jit(rng, 106, 4)), Math.round(jit(rng, 52, 3)), 19, 'geode');
  drawThemedCloud(ctx, 14, Math.round(jit(rng, 250, 5)), Math.round(jit(rng, 40, 3)), 76, 26, 'origami');
  drawThemedCloud(ctx, 15, Math.round(jit(rng, 388, 5)), Math.round(jit(rng, 48, 3)), 74, 26, 'origami');

  drawHorizonHills(ctx, { style: 'peaks', yBase: 168, yBottom: 224, layers: 2 });
  drawGroundDeck(ctx, { style: 'courtyard', yTop: 210, yBottom: 250 });

  const chandelierIds = drawQuartzChandelier(ctx, 240, 114, 1.04, 'Mint-Quartz');
  const clusterL = drawCrystalCluster(ctx, 94, 178, 0.9, { label: 'West Mint' });
  const clusterR = drawCrystalCluster(ctx, 386, 178, 0.9, { label: 'East Mint', flip: -1 });
  const basin = drawOpalMirrorLake(ctx, 240, 206, 56, 14, 'Prism Fountain');

  drawGhostSilhouette(ctx, 'Mint Crystal Ghost', 'crystal', Math.round(jit(rng, 156, 4)), Math.round(jit(rng, 106, 3)), 0.92);
  drawGhostSilhouette(ctx, 'Hall Owl Ghost', 'owl', Math.round(jit(rng, 336, 4)), Math.round(jit(rng, 106, 3)), 0.92);

  const gallopPath = ctx.wavePath('gallop', 66, 234, 412, 232, 9, 1.5, 18);
  const orbitPath = ctx.ellipsePath('orbit', 240, 92, 166, 44, 24);
  ctx.ellipsePath('ring', 106, 52, orb.rx, orb.ry, 20, orb.tilt);
  ctx.marginPath(256);

  ctx.actor('violet', 166, 240, { facing: 1, anim: 'idle' });
  ctx.actor('lumi', 318, 238, { facing: -1, anim: 'idle', pathIndex: gallopPath });
  ctx.actor('gazelle', 426, 240, { facing: -1, anim: 'idle' });
  ctx.actor('comet', 352, 76, { facing: -1, anim: 'float', pathIndex: orbitPath });

  ctx.heroQuest('lantern', 'Chandelier', chandelierIds);
  ctx.heroQuest('geode', 'Mint Quartz', [...clusterL, ...clusterR, ...basin]);
  ctx.heroQuest('violet', 'Violet', [1, 2, 3, 4]);
  ctx.heroQuest('lumi', 'Lumi', [5, 6, 7, 8]);
}

// ===========================================================================
// CHAPTER 4A: The Ruby & Rose-Quartz Terraces (`u11_c4a`)
// ===========================================================================
function buildU11C4a(ctx: SceneCtx): void {
  const { rng } = ctx;
  initChapter(ctx, 5, 240, 168);
  drawSkySparkles(ctx, 20, 146, 'stars');

  const orb = drawThemedOrb(ctx, Math.round(jit(rng, 374, 4)), Math.round(jit(rng, 52, 3)), 19, 'geode');
  drawThemedCloud(ctx, 14, Math.round(jit(rng, 104, 5)), Math.round(jit(rng, 44, 3)), 76, 26, 'origami');
  drawThemedCloud(ctx, 15, Math.round(jit(rng, 238, 5)), Math.round(jit(rng, 40, 3)), 72, 26, 'origami');

  drawHorizonHills(ctx, { style: 'mesas', yBase: 168, yBottom: 224, layers: 2 });
  drawGroundDeck(ctx, { style: 'courtyard', yTop: 210, yBottom: 250 });

  const terraceIds = drawQuartzTerraceCascade(ctx, 240, 174, 1.04, 'Rose-Quartz');
  const geodeL = drawGeodeCathedral(ctx, 88, 172, 0.88, { label: 'Ruby' });
  const spireR = drawCrystalCluster(ctx, 394, 174, 0.9, { label: 'Rose', flip: -1 });

  drawGhostSilhouette(ctx, 'Ruby Moth Ghost', 'moth', Math.round(jit(rng, 164, 4)), Math.round(jit(rng, 104, 3)), 0.94);
  drawGhostSilhouette(ctx, 'Quartz Crystal Ghost', 'crystal', Math.round(jit(rng, 322, 4)), Math.round(jit(rng, 102, 3)), 0.92);

  const sprintPath = ctx.wavePath('sprint', 68, 234, 412, 232, 9, 2, 18);
  const orbitPath = ctx.ellipsePath('orbit', 240, 92, 166, 44, 24);
  ctx.ellipsePath('ring', 374, 52, orb.rx, orb.ry, 20, orb.tilt);
  ctx.marginPath(256);

  ctx.actor('violet', 164, 240, { facing: 1, anim: 'idle' });
  ctx.actor('nova', 324, 238, { facing: -1, anim: 'sleep', pathIndex: sprintPath });
  ctx.actor('moonCat', 88, 128, { facing: 1, anim: 'sleep' });
  ctx.actor('comet', 174, 78, { facing: 1, anim: 'float', pathIndex: orbitPath });

  ctx.heroQuest('geode', 'Quartz Falls', terraceIds);
  ctx.heroQuest('asteroid', 'Ruby Geode', [...geodeL, ...spireR]);
  ctx.heroQuest('violet', 'Violet', [1, 2, 3, 4]);
  ctx.heroQuest('nova', 'Nova', [9, 10, 11]);
}

// ===========================================================================
// CHAPTER 4B: The Prism-Bridge Abyss Crossing (`u11_c4b`)
// ===========================================================================
function buildU11C4b(ctx: SceneCtx): void {
  const { rng } = ctx;
  initChapter(ctx, 6, 240, 172);
  drawSkySparkles(ctx, 20, 146, 'stars');

  const orb = drawThemedOrb(ctx, Math.round(jit(rng, 108, 4)), Math.round(jit(rng, 52, 3)), 19, 'geode');
  drawThemedCloud(ctx, 14, Math.round(jit(rng, 248, 5)), Math.round(jit(rng, 40, 3)), 76, 26, 'origami');
  drawThemedCloud(ctx, 15, Math.round(jit(rng, 386, 5)), Math.round(jit(rng, 48, 3)), 74, 26, 'origami');

  drawHorizonHills(ctx, { style: 'peaks', yBase: 170, yBottom: 226, layers: 2 });
  drawGroundDeck(ctx, { style: 'courtyard', yTop: 214, yBottom: 250 });

  const bridgeIds = drawPrismLightBridge(ctx, 240, 212, 224, 38, 'Prism Abyss');
  const beaconL = drawPrismCrown(ctx, 82, 174, 0.84, { label: 'West Beacon' });
  const beaconR = drawCrystalCluster(ctx, 402, 174, 0.88, { label: 'East Beacon', flip: -1 });

  drawGhostSilhouette(ctx, 'Abyss Crystal Ghost', 'crystal', Math.round(jit(rng, 240, 4)), Math.round(jit(rng, 114, 3)), 0.92);
  drawGhostSilhouette(ctx, 'Prism Moth Ghost', 'moth', Math.round(jit(rng, 344, 4)), Math.round(jit(rng, 106, 3)), 0.9);

  const gallopPath = ctx.wavePath('gallop', 88, 198, 392, 196, 12, 1, 18);
  const sprintPath = ctx.wavePath('sprint', 76, 236, 404, 234, 8, 2, 18);
  const orbitPath = ctx.ellipsePath('orbit', 240, 94, 166, 46, 24);
  ctx.ellipsePath('ring', 108, 52, orb.rx, orb.ry, 20, orb.tilt);
  ctx.marginPath(256);

  ctx.actor('violet', 200, 196, { facing: 1, anim: 'idle' });
  ctx.actor('lumi', 284, 196, { facing: -1, anim: 'idle', pathIndex: gallopPath });
  ctx.actor('nova', 348, 240, { facing: -1, anim: 'sleep', pathIndex: sprintPath });
  ctx.actor('comet', 352, 76, { facing: -1, anim: 'float', pathIndex: orbitPath });

  ctx.heroQuest('portal', 'Prism Bridge', [...bridgeIds, ...beaconL, ...beaconR]);
  ctx.heroQuest('violet', 'Violet', [1, 2, 3, 4]);
  ctx.heroQuest('lumi', 'Lumi', [5, 6, 7, 8]);
  ctx.heroQuest('nova', 'Nova', [9, 10, 11]);
}

// ===========================================================================
// CHAPTER 5 (FINALE): The Heart-of-the-Geode Crown Dome (`u11_c5`, 50..70 regions!)
// ===========================================================================
function buildU11C5(ctx: SceneCtx): void {
  const { r, rng } = ctx;
  initChapter(ctx, 7, 240, 136);
  drawSkySparkles(ctx, 22, 128, 'stars');

  // 1) 14 Faceted Hollow Geode Crystal Teeth forming a giant radial Crown Dome (14 regions!)
  const cx = 240;
  const cy = 150;
  const teeth = 14;
  for (let i = 0; i < teeth; i++) {
    const a0 = -Math.PI * 0.9 + (i * Math.PI * 0.8) / teeth;
    const a1 = -Math.PI * 0.9 + ((i + 0.86) * Math.PI * 0.8) / teeth;
    const aMid = (a0 + a1) * 0.5;
    const id = ctx.dyn('asteroid', `Geode Crown Facet ${i + 1}`);
    const r0 = 66;
    const r1 = i % 2 === 0 ? 124 : 112;
    const sx = 1.46;
    const sy = 0.92;
    r.poly(id, [
      [cx + Math.cos(a0) * r0 * sx, cy + Math.sin(a0) * r0 * sy],
      [cx + Math.cos(a0) * (r1 - 14) * sx, cy + Math.sin(a0) * (r1 - 14) * sy],
      [cx + Math.cos(aMid) * r1 * sx, cy + Math.sin(aMid) * r1 * sy],
      [cx + Math.cos(a1) * (r1 - 14) * sx, cy + Math.sin(a1) * (r1 - 14) * sy],
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

  // 2) Core Orb (12/13), Mirrored Star Crystal, Zenith Star, Origami Mist Clouds (14/15) (6 regions)
  const orb = drawThemedOrb(ctx, 56, 48, 16, 'geode');
  const eastGem = ctx.dyn('star', 'Heart-of-Geode Star');
  star(ctx, eastGem, 424, 48, 18, { points: 6, inner: 0.48 });
  star(ctx, ctx.dyn('star', 'Geode Zenith Prism'), 240, 20, 11, { points: 4, inner: 0.44 });

  drawThemedCloud(ctx, 14, 54, 126, 74, 26, 'origami');
  drawThemedCloud(ctx, 15, 426, 126, 74, 26, 'origami');

  // 3) Horizon + Grand Jeweled Courtyard Floor (4 regions)
  drawHorizonHills(ctx, { style: 'peaks', yBase: 170, yBottom: 224, layers: 2 });
  drawGroundDeck(ctx, { style: 'courtyard', yTop: 214, yBottom: 250 });

  // 4) Grand Geode Heart Panorama (21 regions): Geode Cathedral + 2 Crystal Spires + 2 Minecarts + 2 Chandeliers
  const heartIds = drawGeodeCathedral(ctx, 240, 166, 1.04, { label: 'Geode Heart' });
  const spireL = drawCrystalCluster(ctx, 116, 174, 0.84, { label: 'West Crown' });
  const spireR = drawCrystalCluster(ctx, 364, 174, 0.84, { label: 'East Crown', flip: -1 });
  drawMinecart(ctx, 46, 194, 0.72, { label: 'West Treasure' });
  drawMinecart(ctx, 434, 194, 0.72, { label: 'East Treasure', flip: -1 });
  drawQuartzChandelier(ctx, 166, 108, 0.68, 'West Prism');
  drawQuartzChandelier(ctx, 314, 108, 0.68, 'East Prism');

  // 5) 3 Ghosts in clean open upper-sky pockets
  drawGhostSilhouette(ctx, 'Crown Crystal Ghost', 'crystal', Math.round(jit(rng, 144, 3)), Math.round(jit(rng, 28, 2)), 0.88);
  drawGhostSilhouette(ctx, 'Prism Moth Ghost', 'moth', Math.round(jit(rng, 336, 3)), Math.round(jit(rng, 28, 2)), 0.88);
  drawGhostSilhouette(ctx, 'Cavern Owl Ghost', 'owl', Math.round(jit(rng, 444, 3)), Math.round(jit(rng, 90, 2)), 0.84);

  // 6) Paths & Full Hero Cast (14 actor regions -> total ~59 regions!)
  const gallopPath = ctx.wavePath('gallop', 66, 238, 414, 238, 8, 2, 20);
  const sprintPath = ctx.wavePath('sprint', 88, 236, 392, 236, 9, 2, 20);
  const orbitPath = ctx.ellipsePath('orbit', 240, 96, 174, 52, 28);
  ctx.ellipsePath('ring', 56, 48, orb.rx, orb.ry, 20, orb.tilt);
  ctx.marginPath(256);

  ctx.actor('lumi', 148, 244, { facing: 1, anim: 'rear', pathIndex: gallopPath });
  ctx.actor('violet', 240, 246, { facing: 1, anim: 'idle' });
  ctx.actor('nova', 332, 244, { facing: -1, anim: 'leap', pathIndex: sprintPath });
  ctx.actor('moonCat', 82, 242, { facing: 1, anim: 'idle' });
  ctx.actor('comet', 402, 166, { facing: -1, anim: 'float', pathIndex: orbitPath });

  ctx.heroQuest('geode', 'Geode Heart', [...heartIds, ...spireL, ...spireR]);
  ctx.heroQuest('violet', 'Violet', [1, 2, 3, 4]);
  ctx.heroQuest('lumi', 'Lumi', [5, 6, 7, 8]);
  ctx.heroQuest('nova', 'Nova', [9, 10, 11]);
}

export const U11_SCENES: Record<U11SceneId, (ctx: SceneCtx) => void> = {
  hub_crystalGeodeCaverns: buildHubCrystalGeodeCaverns,
  u11_c1: buildU11C1,
  u11_c2a: buildU11C2a,
  u11_c2b: buildU11C2b,
  u11_c3a: buildU11C3a,
  u11_c3b: buildU11C3b,
  u11_c4a: buildU11C4a,
  u11_c4b: buildU11C4b,
  u11_c5: buildU11C5,
};
