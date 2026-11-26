/**
 * Universe 9: Moonlit Sakura Koi Garden (`sakuraKoiGarden`)
 * 9 bespoke scenes: Hub Sanctuary ("Violet's Blossom Moon-Veranda") + 8 Sakura Chapters,
 * culminating in the double-dense Eternal Sakura Moon-Shrine finale.
 * Pure & deterministic (uses ctx.rng only; zero timers or wall-clock APIs).
 */
import { MaterialId } from '../../contracts/materials';
import { UNIVERSE_BY_ID } from '../../contracts/universes';
import type { SceneCtx } from '../context';
import {
  drawGhostSilhouette,
  drawGroundDeck,
  drawHorizonHills,
  drawKoiPondFish,
  drawOrigamiCrane,
  drawPagodaTower,
  drawPaperBoat,
  drawPaperLantern,
  drawSakuraTree,
  drawSanctuaryRoom,
  drawSkySparkles,
  drawThemedCloud,
  drawThemedOrb,
  drawToriiGate,
} from '../kit';
import { inkArc, jit, star, twinkle } from '../props';
import { INK, type Pt } from '../raster';

const DEF = UNIVERSE_BY_ID.sakuraKoiGarden;

type U09SceneId =
  | 'hub_sakuraKoiGarden'
  | 'u09_c1'
  | 'u09_c2a'
  | 'u09_c2b'
  | 'u09_c3a'
  | 'u09_c3b'
  | 'u09_c4a'
  | 'u09_c4b'
  | 'u09_c5';

function initChapter(ctx: SceneCtx, chapterIdx: number, focalX = 240, focalY = 160): void {
  const ch = DEF.chapters[chapterIdx]!;
  ctx.title = ch.title;
  ctx.sky = { ...DEF.sky };
  ctx.universeId = DEF.id;
  ctx.ambient = DEF.ambient;
  ctx.focal = { x: focalX, y: focalY };
}

/** Graceful scarlet arched Japanese moon-bridge with railing (2 regions). */
function drawMoonBridge(ctx: SceneCtx, cx: number, yBase: number, w: number, h: number, label = 'Moon Bridge'): number[] {
  const { r } = ctx;
  const hw = w / 2;
  const deck = ctx.dyn('prop', `${label} Span`);
  const rail = ctx.dyn('star', `${label} Rail`);

  const dTop: Pt[] = [];
  const dBot: Pt[] = [];
  for (let i = 0; i <= 16; i++) {
    const t = i / 16;
    const x = cx - hw + t * w;
    const lift = Math.sin(t * Math.PI) * h;
    dTop.push([x, yBase - lift - 12]);
    dBot.push([x, yBase - lift * 0.52 + 6]);
  }
  dBot.reverse();
  r.poly(deck, [...dTop, ...dBot]);
  for (let i = 2; i <= 14; i += 2) {
    const t = i / 16;
    const x = cx - hw + t * w;
    const lift = Math.sin(t * Math.PI) * h;
    r.line(INK, x, yBase - lift - 8, x, yBase - lift * 0.52 + 2, { only: [deck] });
  }

  const rTop: Pt[] = [];
  const rBot: Pt[] = [];
  for (let i = 0; i <= 16; i++) {
    const t = i / 16;
    const x = cx - hw + t * w;
    const lift = Math.sin(t * Math.PI) * h;
    rTop.push([x, yBase - lift - 22]);
    rBot.push([x, yBase - lift - 11]);
  }
  rBot.reverse();
  r.poly(rail, [...rTop, ...rBot]);
  return [deck, rail];
}

/** Calm moonlit koi pond with floating lotus pads (2 regions: water basin + lotus pads). */
function drawKoiPondBasin(ctx: SceneCtx, cx: number, cy: number, rx: number, ry: number, label = 'Koi Pond'): number[] {
  const { r } = ctx;
  const water = ctx.dyn('prop', `${label} Water`);
  const pads = ctx.dyn('flora', `${label} Lotus Pads`);

  r.ellipse(water, cx, cy, rx, ry);
  inkArc(r, cx - rx * 0.34, cy + 2, rx * 0.24, ry * 0.36, 0, Math.PI * 2, 0, { only: [water] });
  inkArc(r, cx + rx * 0.32, cy - 1, rx * 0.22, ry * 0.34, 0, Math.PI * 2, 0, { only: [water] });

  r.ellipse(pads, cx - rx * 0.54, cy + 2, 16, 7);
  r.ellipse(pads, cx + rx * 0.54, cy + 2, 16, 7);
  r.ellipse(pads, cx, cy + ry * 0.32, 18, 7);
  r.line(INK, cx - rx * 0.54, cy + 2, cx - rx * 0.54 + 12, cy + 2, { only: [pads] });
  r.line(INK, cx + rx * 0.54, cy + 2, cx + rx * 0.54 - 12, cy + 2, { only: [pads] });
  return [water, pads];
}

/** Traditional Japanese garden stone lantern tōrō (2 regions: pedestal/cap + glow chamber). */
function drawStoneLantern(ctx: SceneCtx, x: number, baseY: number, scale = 1, label = 'Stone Lantern'): number[] {
  const { r } = ctx;
  const s = Math.max(0.75, scale);
  const stone = ctx.dyn('prop', `${label} Stone`);
  const glow = ctx.dyn('star', `${label} Glow`);

  r.rect(stone, x - 9 * s, baseY - 26 * s, x + 9 * s, baseY);
  r.ellipse(stone, x, baseY - 2 * s, 14 * s, 5 * s);
  r.poly(stone, [[x, baseY - 58 * s], [x + 19 * s, baseY - 42 * s], [x - 19 * s, baseY - 42 * s]]);
  r.rect(glow, x - 11 * s, baseY - 42 * s, x + 11 * s, baseY - 25 * s);
  r.line(INK, x, baseY - 40 * s, x, baseY - 27 * s, { only: [glow] });
  return [stone, glow];
}

/** Bamboo flute fountain courtyard centerpiece with emerald stalks & stone water basin (3 regions). */
function drawBambooFountain(ctx: SceneCtx, x: number, y: number, scale = 1, label = 'Bamboo Fountain'): number[] {
  const { r } = ctx;
  const s = Math.max(0.75, scale);
  const stalks = ctx.dyn('flora', `${label} Stalks`);
  const spout = ctx.dyn('star', `${label} Spout`);
  const basin = ctx.dyn('prop', `${label} Basin`);

  for (const bx of [-22, -8, 12, 24]) {
    r.rect(stalks, x + (bx - 4.5) * s, y - 38 * s, x + (bx + 4.5) * s, y + 26 * s);
    for (const ny of [-22, -4, 14]) {
      r.line(INK, x + (bx - 4) * s, y + ny * s, x + (bx + 4) * s, y + ny * s, { only: [stalks] });
    }
  }
  r.capsule(spout, x - 18 * s, y - 8 * s, x + 16 * s, y + 6 * s, 5.5 * s);
  r.ellipse(spout, x + 18 * s, y + 14 * s, 6 * s, 10 * s);

  r.ellipse(basin, x, y + 26 * s, 38 * s, 14 * s);
  inkArc(r, x, y + 24 * s, 26 * s, 7 * s, 0, Math.PI * 2, 0, { only: [basin] });
  return [stalks, spout, basin];
}

/** Wisteria garden arbor draped with cascading lavender blossom clusters (3 regions). */
function drawWisteriaArch(ctx: SceneCtx, x: number, y: number, scale = 1, label = 'Wisteria Arbor'): number[] {
  const { r } = ctx;
  const s = Math.max(0.75, scale);
  const frame = ctx.dyn('prop', `${label} Timber`);
  const cascade = ctx.dyn('flora', `${label} Blooms`);
  const stream = ctx.dyn('star', `${label} Waterfall`);

  r.rect(frame, x - 44 * s, y - 24 * s, x - 32 * s, y + 38 * s);
  r.rect(frame, x + 32 * s, y - 24 * s, x + 44 * s, y + 38 * s);
  r.rect(frame, x - 52 * s, y - 32 * s, x + 52 * s, y - 20 * s);

  r.rect(stream, x - 24 * s, y - 16 * s, x + 24 * s, y + 36 * s);
  for (const sx of [-14, -4, 6, 16]) {
    r.line(INK, x + sx * s, y - 12 * s, x + sx * s, y + 32 * s, { only: [stream] });
  }

  for (const [bx, h] of [[-32, 26], [-16, 30], [0, 24], [16, 30], [32, 26]] as const) {
    r.ellipse(cascade, x + bx * s, y - 16 * s + h * 0.45 * s, 10 * s, h * 0.55 * s);
  }
  return [frame, cascade, stream];
}

/** Glowing Japanese lantern teahouse pavilion with upturned eaves & warm shoji doors (3 regions). */
function drawTeahousePavilion(ctx: SceneCtx, x: number, y: number, scale = 1, label = 'Teahouse'): number[] {
  const { r } = ctx;
  const s = Math.max(0.7, scale);
  const walls = ctx.dyn('prop', `${label} Walls`);
  const shoji = ctx.dyn('star', `${label} Shoji`);
  const roof = ctx.dyn('prop', `${label} Eaves`);

  r.rect(walls, x - 36 * s, y - 4 * s, x + 36 * s, y + 36 * s);
  r.rect(walls, x - 42 * s, y + 28 * s, x + 42 * s, y + 38 * s);

  r.rect(shoji, x - 22 * s, y + 2 * s, x + 22 * s, y + 28 * s);
  r.line(INK, x, y + 3 * s, x, y + 27 * s, { only: [shoji] });
  r.line(INK, x - 20 * s, y + 15 * s, x + 20 * s, y + 15 * s, { only: [shoji] });

  r.poly(roof, [
    [x - 52 * s, y - 2 * s],
    [x - 32 * s, y - 18 * s],
    [x, y - 38 * s],
    [x + 32 * s, y - 18 * s],
    [x + 52 * s, y - 2 * s],
    [x + 42 * s, y + 4 * s],
    [x - 42 * s, y + 4 * s],
  ]);
  r.line(INK, x - 34 * s, y - 8 * s, x + 34 * s, y - 8 * s, { only: [roof] });
  return [walls, shoji, roof];
}

// ===========================================================================
// HUB SANCTUARY: Violet's Blossom Moon-Veranda (25..45 pre-colored regions, 0 ghosts)
// ===========================================================================
function buildHubSakuraKoiGarden(ctx: SceneCtx): void {
  ctx.universeId = DEF.id;
  ctx.ambient = DEF.ambient;

  let koiScroll: number[] = [];

  drawSanctuaryRoom(ctx, {
    title: DEF.hubTitle,
    sky: { ...DEF.sky },
    windowShape: 'shoji',
    windowOrbStyle: 'lanternMoon',
    wallStyle: 'bamboo',
    floorStyle: 'tatami',
    rugShape: 'scallop',
    lampStyle: 'lantern',
    garlandStyle: 'lanterns',
    sparkleStyle: 'petals',
    seatingLabel: 'Sakura Silk Cushion Bench',
    workbenchLabel: 'Calligraphy Desk',
    shelfLabel: 'Blossom Scroll Cabinet',
    trinketLabels: ['Sakura Scrolls', 'Koi Keepsakes', 'Garden Haiku'],
    palette: {
      wallPanel: MaterialId.VelvetNebula,
      floor: MaterialId.AuroraSherbet,
      windowFrame: MaterialId.RoyalAstralGold,
      windowGlass: MaterialId.DeepSpaceBiolum,
      curtain: MaterialId.StrawberrySupernova,
      orbCore: MaterialId.OpalPearl,
      orbRing: MaterialId.SolarFlare24K,
      rugOuter: MaterialId.StrawberrySupernova,
      rugInner: MaterialId.OpalPearl,
      furniture: MaterialId.RoyalAstralGold,
      furnitureTrim: MaterialId.AuroraSherbet,
      accentA: MaterialId.StrawberrySupernova,
      accentB: MaterialId.CrystalGlacierMint,
      accentC: MaterialId.CottonCandyChalk,
    },
    drawWindowView: (c, wx, _wy, wHalf, wBot) => {
      // Distant sakura garden ridge inside lower shoji panes
      const ridge = c.dyn('flora', 'Window Sakura Ridge');
      c.r.poly(ridge, [
        [wx - wHalf + 2, wBot - 1],
        [wx - 24, wBot - 22],
        [wx, wBot - 14],
        [wx + 22, wBot - 24],
        [wx + wHalf - 2, wBot - 1],
      ]);
      c.preColor(ridge, MaterialId.StrawberrySupernova);
    },
    drawExtraProps: (c) => {
      const extras: number[] = [];
      // 1) Framed Koi Moon Hanging Scroll on left upper wall
      const scroll = c.dyn('prop', 'Koi Moon Wall Scroll');
      const koiArt = c.dyn('star', 'Painted Koi Emblem');
      c.r.rect(scroll, 50, 68, 108, 120);
      c.r.rect(scroll, 46, 64, 112, 70);
      c.r.rect(scroll, 46, 118, 112, 124);
      c.preColor(scroll, MaterialId.OpalPearl);
      c.r.ellipse(koiArt, 79, 94, 17, 10, -0.2);
      c.r.poly(koiArt, [[60, 96], [53, 86], [54, 104]]);
      c.preColor(koiArt, MaterialId.StrawberrySupernova);
      koiScroll = [scroll, koiArt];
      extras.push(scroll, koiArt);

      // 2) Standing Sakura Bonsai Vase in right-center (x=282, y=204)
      const pot = c.dyn('prop', 'Porcelain Bonsai Vase');
      const blooms = c.dyn('flora', 'Bonsai Sakura Blooms');
      c.r.poly(pot, [[268, 186], [296, 186], [292, 206], [272, 206]]);
      c.preColor(pot, MaterialId.CrystalGlacierMint);
      c.r.disc(blooms, 274, 172, 11);
      c.r.disc(blooms, 290, 174, 10);
      c.r.disc(blooms, 282, 162, 12);
      c.preColor(blooms, MaterialId.StrawberrySupernova);
      extras.push(pot, blooms);

      // 3) Tabletop Matcha Tea Bowl on workbench right (x=374, y=166)
      const bowl = c.dyn('prop', 'Matcha Tea Bowl');
      c.r.ellipse(bowl, 374, 170, 14, 10);
      c.r.rect(bowl, 360, 162, 388, 172);
      inkArc(c.r, 374, 168, 10, 4, 0, Math.PI, 0, { only: [bowl] });
      c.preColor(bowl, MaterialId.CrystalGlacierMint);
      extras.push(bowl);

      return extras;
    },
  });

  ctx.heroQuest('violet', 'Violet', [1, 2, 3, 4]);
  ctx.heroQuest('planet', 'Lantern Moon', [12, 13]);
  ctx.heroQuest('koi', 'Koi Scroll', koiScroll);
}

// ===========================================================================
// CHAPTER 1: The Moon-Bridge Blossom Gate (`u09_c1`)
// ===========================================================================
function buildU09C1(ctx: SceneCtx): void {
  const { rng } = ctx;
  initChapter(ctx, 0, 240, 170);
  drawSkySparkles(ctx, 20, 148, 'petals');

  const orb = drawThemedOrb(ctx, Math.round(jit(rng, 374, 4)), Math.round(jit(rng, 54, 3)), 20, 'lanternMoon');
  drawThemedCloud(ctx, 14, Math.round(jit(rng, 106, 5)), Math.round(jit(rng, 46, 3)), 82, 26, 'sakura');
  drawThemedCloud(ctx, 15, Math.round(jit(rng, 240, 5)), Math.round(jit(rng, 40, 3)), 76, 26, 'sakura');
  star(ctx, ctx.dyn('star', 'Blossom Evening Star'), 442, 44, 11, { points: 5, inner: 0.48 });

  drawHorizonHills(ctx, { style: 'bamboo', yBase: 168, yBottom: 224, layers: 2 });
  drawGroundDeck(ctx, { style: 'gardenPath', yTop: 210, yBottom: 250 });

  const bridgeIds = drawMoonBridge(ctx, 240, 212, 204, 38, 'Blossom Moon');
  const treeL = drawSakuraTree(ctx, 82, 172, 0.92, { label: 'Gate' });
  const lanternR = drawPaperLantern(ctx, 402, 156, 0.88, { label: 'Gate' });
  drawStoneLantern(ctx, 352, 216, 0.82, 'Bridge Shore');

  drawGhostSilhouette(ctx, 'Bridge Koi Ghost', 'koi', Math.round(jit(rng, 286, 4)), Math.round(jit(rng, 108, 3)), 0.95);
  drawGhostSilhouette(ctx, 'Paper Crane Ghost', 'crane', Math.round(jit(rng, 154, 4)), Math.round(jit(rng, 108, 3)), 0.92);

  const gallopPath = ctx.wavePath('gallop', 66, 234, 412, 232, 9, 1.5, 18);
  const orbitPath = ctx.ellipsePath('orbit', 240, 94, 168, 46, 24);
  ctx.ellipsePath('ring', 374, 54, orb.rx, orb.ry, 20, orb.tilt);
  ctx.marginPath(256);

  ctx.actor('violet', 238, 194, { facing: 1, anim: 'idle' });
  ctx.actor('lumi', 124, 240, { facing: 1, anim: 'idle', pathIndex: gallopPath });
  ctx.actor('moonCat', 402, 238, { facing: -1, anim: 'sleep' });
  ctx.actor('comet', 178, 78, { facing: 1, anim: 'float', pathIndex: orbitPath });

  ctx.heroQuest('lantern', 'Moon Bridge', [...bridgeIds, ...lanternR]);
  ctx.heroQuest('lotus', 'Sakura Tree', treeL);
  ctx.heroQuest('violet', 'Violet', [1, 2, 3, 4]);
  ctx.heroQuest('lumi', 'Lumi', [5, 6, 7, 8]);
}

// ===========================================================================
// CHAPTER 2A: The Star-Koi Stepping Pond (`u09_c2a`)
// ===========================================================================
function buildU09C2a(ctx: SceneCtx): void {
  const { rng } = ctx;
  initChapter(ctx, 1, 240, 174);
  drawSkySparkles(ctx, 20, 146, 'petals');

  const orb = drawThemedOrb(ctx, Math.round(jit(rng, 108, 4)), Math.round(jit(rng, 52, 3)), 19, 'lanternMoon');
  drawThemedCloud(ctx, 14, Math.round(jit(rng, 250, 5)), Math.round(jit(rng, 42, 3)), 80, 26, 'sakura');
  drawThemedCloud(ctx, 15, Math.round(jit(rng, 386, 5)), Math.round(jit(rng, 48, 3)), 76, 26, 'sakura');

  drawHorizonHills(ctx, { style: 'bamboo', yBase: 162, yBottom: 218, layers: 2 });
  drawGroundDeck(ctx, { style: 'meadow', yTop: 196, yBottom: 250, includeTrim: false });
  const pondIds = drawKoiPondBasin(ctx, 240, 222, 162, 24, 'Star-Koi');

  const koiL = drawKoiPondFish(ctx, 146, 170, 0.9, { label: 'Golden' });
  const koiR = drawKoiPondFish(ctx, 334, 168, 0.88, { label: 'Calico', flip: -1 });
  drawSakuraTree(ctx, 420, 166, 0.82, { label: 'Pondside', flip: -1 });
  drawStoneLantern(ctx, 56, 204, 0.86, 'Pondside');

  drawGhostSilhouette(ctx, 'Sky Koi Ghost', 'koi', Math.round(jit(rng, 168, 4)), Math.round(jit(rng, 106, 3)), 0.94);
  drawGhostSilhouette(ctx, 'Garden Cat Ghost', 'cat', Math.round(jit(rng, 342, 4)), Math.round(jit(rng, 108, 3)), 0.92);

  const swimPath = ctx.wavePath('swim', 68, 104, 412, 98, 14, 1.5, 20);
  const orbitPath = ctx.ellipsePath('orbit', 240, 92, 166, 44, 24);
  ctx.ellipsePath('ring', 108, 52, orb.rx, orb.ry, 20, orb.tilt);
  ctx.marginPath(256);

  ctx.actor('violet', 240, 238, { facing: 1, anim: 'idle' });
  ctx.actor('whale', 244, 108, { facing: 1, anim: 'swim', pathIndex: swimPath });
  ctx.actor('moonCat', 66, 238, { facing: 1, anim: 'sleep' });
  ctx.actor('comet', 378, 82, { facing: -1, anim: 'float', pathIndex: orbitPath });

  ctx.heroQuest('koi', 'Star Koi', [...koiL, ...koiR, ...pondIds]);
  ctx.heroQuest('violet', 'Violet', [1, 2, 3, 4]);
  ctx.heroQuest('whale', 'Moon Whale', [19, 29]);
  ctx.heroQuest('planet', 'Lantern Moon', [12, 13]);
}

// ===========================================================================
// CHAPTER 2B: The Crimson Torii Petal Path (`u09_c2b`)
// ===========================================================================
function buildU09C2b(ctx: SceneCtx): void {
  const { rng } = ctx;
  initChapter(ctx, 2, 240, 168);
  drawSkySparkles(ctx, 22, 146, 'petals');

  const orb = drawThemedOrb(ctx, Math.round(jit(rng, 374, 4)), Math.round(jit(rng, 52, 3)), 19, 'lanternMoon');
  drawThemedCloud(ctx, 14, Math.round(jit(rng, 106, 5)), Math.round(jit(rng, 44, 3)), 80, 26, 'sakura');
  drawThemedCloud(ctx, 15, Math.round(jit(rng, 240, 5)), Math.round(jit(rng, 40, 3)), 74, 26, 'sakura');

  drawHorizonHills(ctx, { style: 'bamboo', yBase: 168, yBottom: 224, layers: 2 });
  drawGroundDeck(ctx, { style: 'gardenPath', yTop: 210, yBottom: 250 });

  const toriiIds = drawToriiGate(ctx, 240, 170, 1.0, { label: 'Crimson' });
  const treeL = drawSakuraTree(ctx, 74, 172, 0.88, { label: 'West Path' });
  const treeR = drawSakuraTree(ctx, 406, 172, 0.88, { label: 'East Path', flip: -1 });
  drawStoneLantern(ctx, 144, 214, 0.84, 'West Path');
  drawStoneLantern(ctx, 336, 214, 0.84, 'East Path');

  drawGhostSilhouette(ctx, 'Torii Crane Ghost', 'crane', Math.round(jit(rng, 156, 4)), Math.round(jit(rng, 102, 3)), 0.94);
  drawGhostSilhouette(ctx, 'Petal Koi Ghost', 'koi', Math.round(jit(rng, 322, 4)), Math.round(jit(rng, 104, 3)), 0.92);

  const sprintPath = ctx.wavePath('sprint', 68, 234, 412, 232, 9, 2, 18);
  const orbitPath = ctx.ellipsePath('orbit', 240, 92, 166, 44, 24);
  ctx.ellipsePath('ring', 374, 52, orb.rx, orb.ry, 20, orb.tilt);
  ctx.marginPath(256);

  ctx.actor('violet', 240, 240, { facing: 1, anim: 'idle' });
  ctx.actor('nova', 168, 238, { facing: 1, anim: 'sleep', pathIndex: sprintPath });
  ctx.actor('moonCat', 336, 166, { facing: -1, anim: 'sleep' });
  ctx.actor('comet', 176, 76, { facing: 1, anim: 'float', pathIndex: orbitPath });

  ctx.heroQuest('lantern', 'Torii Gate', toriiIds);
  ctx.heroQuest('lotus', 'Cherry Trees', [...treeL, ...treeR]);
  ctx.heroQuest('violet', 'Violet', [1, 2, 3, 4]);
  ctx.heroQuest('nova', 'Nova', [9, 10, 11]);
}

// ===========================================================================
// CHAPTER 3A: The Bamboo Flute Courtyard (`u09_c3a`)
// ===========================================================================
function buildU09C3a(ctx: SceneCtx): void {
  const { rng } = ctx;
  initChapter(ctx, 3, 240, 168);
  drawSkySparkles(ctx, 18, 146, 'petals');

  const orb = drawThemedOrb(ctx, Math.round(jit(rng, 374, 4)), Math.round(jit(rng, 52, 3)), 19, 'lanternMoon');
  drawThemedCloud(ctx, 14, Math.round(jit(rng, 104, 5)), Math.round(jit(rng, 44, 3)), 78, 26, 'sakura');
  drawThemedCloud(ctx, 15, Math.round(jit(rng, 236, 5)), Math.round(jit(rng, 40, 3)), 72, 26, 'sakura');

  drawHorizonHills(ctx, { style: 'bamboo', yBase: 168, yBottom: 224, layers: 2 });
  drawGroundDeck(ctx, { style: 'tatami', yTop: 210, yBottom: 250 });

  const fountainIds = drawBambooFountain(ctx, 240, 174, 1.0, 'Courtyard Bamboo');
  const pagodaL = drawPagodaTower(ctx, 90, 166, 0.88, { label: 'Bamboo' });
  const lanternR = drawPaperLantern(ctx, 392, 160, 0.88, { label: 'Courtyard' });

  drawGhostSilhouette(ctx, 'Flute Crane Ghost', 'crane', Math.round(jit(rng, 176, 4)), Math.round(jit(rng, 104, 3)), 0.94);
  drawGhostSilhouette(ctx, 'Courtyard Cat Ghost', 'cat', Math.round(jit(rng, 316, 4)), Math.round(jit(rng, 104, 3)), 0.92);

  const gallopPath = ctx.wavePath('gallop', 66, 234, 412, 232, 9, 1.5, 18);
  const sprintPath = ctx.wavePath('sprint', 80, 236, 400, 234, 8, 2, 18);
  const orbitPath = ctx.ellipsePath('orbit', 240, 92, 166, 44, 24);
  ctx.ellipsePath('ring', 374, 52, orb.rx, orb.ry, 20, orb.tilt);
  ctx.marginPath(256);

  ctx.actor('lumi', 162, 240, { facing: 1, anim: 'idle', pathIndex: gallopPath });
  ctx.actor('nova', 322, 238, { facing: -1, anim: 'sleep', pathIndex: sprintPath });
  ctx.actor('moonCat', 240, 238, { facing: 1, anim: 'idle' });
  ctx.actor('comet', 168, 78, { facing: 1, anim: 'float', pathIndex: orbitPath });

  ctx.heroQuest('lotus', 'Bamboo Court', fountainIds);
  ctx.heroQuest('lantern', 'Pagoda Lamp', [...pagodaL, ...lanternR]);
  ctx.heroQuest('lumi', 'Lumi', [5, 6, 7, 8]);
  ctx.heroQuest('nova', 'Nova', [9, 10, 11]);
}

// ===========================================================================
// CHAPTER 3B: The Wisteria Waterfall Arches (`u09_c3b`)
// ===========================================================================
function buildU09C3b(ctx: SceneCtx): void {
  const { rng } = ctx;
  initChapter(ctx, 4, 240, 168);
  drawSkySparkles(ctx, 20, 146, 'petals');

  const orb = drawThemedOrb(ctx, Math.round(jit(rng, 106, 4)), Math.round(jit(rng, 52, 3)), 19, 'pearlMoon');
  drawThemedCloud(ctx, 14, Math.round(jit(rng, 248, 5)), Math.round(jit(rng, 40, 3)), 78, 26, 'sakura');
  drawThemedCloud(ctx, 15, Math.round(jit(rng, 386, 5)), Math.round(jit(rng, 48, 3)), 74, 26, 'sakura');
  twinkle(ctx, ctx.dyn('star', 'Wisteria Twinkle'), 44, 94, 12);

  drawHorizonHills(ctx, { style: 'peaks', yBase: 168, yBottom: 224, layers: 2 });
  drawGroundDeck(ctx, { style: 'gardenPath', yTop: 210, yBottom: 250 });

  const archIds = drawWisteriaArch(ctx, 240, 170, 1.02, 'Wisteria Falls');
  const koiL = drawKoiPondFish(ctx, 98, 184, 0.86, { label: 'Stream' });
  const treeR = drawSakuraTree(ctx, 396, 170, 0.88, { label: 'Falls', flip: -1 });

  drawGhostSilhouette(ctx, 'Falls Koi Ghost', 'koi', Math.round(jit(rng, 166, 4)), Math.round(jit(rng, 102, 3)), 0.94);
  drawGhostSilhouette(ctx, 'Blossom Crane Ghost', 'crane', Math.round(jit(rng, 330, 4)), Math.round(jit(rng, 102, 3)), 0.92);

  const gallopPath = ctx.wavePath('gallop', 66, 234, 412, 232, 9, 1.5, 18);
  const orbitPath = ctx.ellipsePath('orbit', 240, 92, 166, 44, 24);
  ctx.ellipsePath('ring', 106, 52, orb.rx, orb.ry, 20, orb.tilt);
  ctx.marginPath(256);

  ctx.actor('violet', 174, 240, { facing: 1, anim: 'idle' });
  ctx.actor('lumi', 304, 238, { facing: -1, anim: 'idle', pathIndex: gallopPath });
  ctx.actor('gazelle', 426, 240, { facing: -1, anim: 'idle' });
  ctx.actor('comet', 352, 78, { facing: -1, anim: 'float', pathIndex: orbitPath });

  ctx.heroQuest('lotus', 'Wisteria Arch', [...archIds, ...treeR]);
  ctx.heroQuest('koi', 'Stream Koi', koiL);
  ctx.heroQuest('violet', 'Violet', [1, 2, 3, 4]);
  ctx.heroQuest('lumi', 'Lumi', [5, 6, 7, 8]);
}

// ===========================================================================
// CHAPTER 4A: The Lantern Teahouse Island (`u09_c4a`)
// ===========================================================================
function buildU09C4a(ctx: SceneCtx): void {
  const { rng } = ctx;
  initChapter(ctx, 5, 240, 166);
  drawSkySparkles(ctx, 20, 146, 'petals');

  const orb = drawThemedOrb(ctx, Math.round(jit(rng, 374, 4)), Math.round(jit(rng, 52, 3)), 19, 'lanternMoon');
  drawThemedCloud(ctx, 14, Math.round(jit(rng, 104, 5)), Math.round(jit(rng, 44, 3)), 78, 26, 'sakura');
  drawThemedCloud(ctx, 15, Math.round(jit(rng, 238, 5)), Math.round(jit(rng, 40, 3)), 74, 26, 'sakura');

  drawHorizonHills(ctx, { style: 'waves', yBase: 170, yBottom: 224, layers: 2 });
  drawGroundDeck(ctx, { style: 'tatami', yTop: 210, yBottom: 250 });

  const teaIds = drawTeahousePavilion(ctx, 240, 170, 1.0, 'Island Teahouse');
  const boatL = drawPaperBoat(ctx, 94, 194, 0.86, { label: 'Sakura' });
  const lanternR = drawPaperLantern(ctx, 392, 160, 0.88, { label: 'Teahouse' });

  drawGhostSilhouette(ctx, 'Teahouse Koi Ghost', 'koi', Math.round(jit(rng, 164, 4)), Math.round(jit(rng, 106, 3)), 0.94);
  drawGhostSilhouette(ctx, 'Teahouse Cat Ghost', 'cat', Math.round(jit(rng, 324, 4)), Math.round(jit(rng, 104, 3)), 0.92);

  const sprintPath = ctx.wavePath('sprint', 68, 234, 412, 232, 9, 2, 18);
  const orbitPath = ctx.ellipsePath('orbit', 240, 92, 166, 44, 24);
  ctx.ellipsePath('ring', 374, 52, orb.rx, orb.ry, 20, orb.tilt);
  ctx.marginPath(256);

  ctx.actor('violet', 162, 240, { facing: 1, anim: 'idle' });
  ctx.actor('nova', 324, 238, { facing: -1, anim: 'sleep', pathIndex: sprintPath });
  ctx.actor('moonCat', 94, 164, { facing: 1, anim: 'sleep' });
  ctx.actor('comet', 172, 78, { facing: 1, anim: 'float', pathIndex: orbitPath });

  ctx.heroQuest('teacup', 'Teahouse', teaIds);
  ctx.heroQuest('lantern', 'Sakura Boat', [...boatL, ...lanternR]);
  ctx.heroQuest('violet', 'Violet', [1, 2, 3, 4]);
  ctx.heroQuest('nova', 'Nova', [9, 10, 11]);
}

// ===========================================================================
// CHAPTER 4B: The Silver Crane Reflection Pool (`u09_c4b`)
// ===========================================================================
function buildU09C4b(ctx: SceneCtx): void {
  const { rng } = ctx;
  initChapter(ctx, 6, 240, 174);
  drawSkySparkles(ctx, 20, 146, 'petals');

  const orb = drawThemedOrb(ctx, Math.round(jit(rng, 240, 4)), Math.round(jit(rng, 52, 3)), 20, 'pearlMoon');
  drawThemedCloud(ctx, 14, Math.round(jit(rng, 90, 5)), Math.round(jit(rng, 48, 3)), 76, 26, 'sakura');
  drawThemedCloud(ctx, 15, Math.round(jit(rng, 390, 5)), Math.round(jit(rng, 48, 3)), 76, 26, 'sakura');

  drawHorizonHills(ctx, { style: 'bamboo', yBase: 164, yBottom: 218, layers: 2 });
  drawGroundDeck(ctx, { style: 'meadow', yTop: 198, yBottom: 250, includeTrim: false });
  const pondIds = drawKoiPondBasin(ctx, 240, 224, 164, 22, 'Reflection Pool');

  const craneL = drawOrigamiCrane(ctx, 110, 158, 0.88, { label: 'West Silver' });
  const craneR = drawOrigamiCrane(ctx, 370, 158, 0.88, { label: 'East Silver', flip: -1 });
  const bridgeMid = drawMoonBridge(ctx, 240, 198, 148, 30, 'Silver Pool');
  drawStoneLantern(ctx, 44, 206, 0.82, 'Pool Shore');

  drawGhostSilhouette(ctx, 'Silver Crane Ghost', 'crane', Math.round(jit(rng, 160, 4)), Math.round(jit(rng, 98, 3)), 0.92);
  drawGhostSilhouette(ctx, 'Moon Koi Ghost', 'koi', Math.round(jit(rng, 326, 4)), Math.round(jit(rng, 98, 3)), 0.92);

  const gallopPath = ctx.wavePath('gallop', 66, 234, 412, 232, 9, 1.5, 18);
  const orbitPath = ctx.ellipsePath('orbit', 240, 96, 170, 46, 24);
  ctx.ellipsePath('ring', 240, 52, orb.rx, orb.ry, 20, orb.tilt);
  ctx.marginPath(256);

  ctx.actor('violet', 178, 240, { facing: 1, anim: 'idle' });
  ctx.actor('lumi', 306, 238, { facing: -1, anim: 'idle', pathIndex: gallopPath });
  ctx.actor('moonCat', 426, 238, { facing: -1, anim: 'sleep' });
  ctx.actor('comet', 362, 86, { facing: -1, anim: 'float', pathIndex: orbitPath });

  ctx.heroQuest('crane', 'Silver Cranes', [...craneL, ...craneR]);
  ctx.heroQuest('lantern', 'Moon Pool', [...pondIds, ...bridgeMid]);
  ctx.heroQuest('violet', 'Violet', [1, 2, 3, 4]);
  ctx.heroQuest('lumi', 'Lumi', [5, 6, 7, 8]);
}

// ===========================================================================
// CHAPTER 5 (FINALE): The Eternal Sakura Moon-Shrine (`u09_c5`, 50..70 regions!)
// ===========================================================================
function buildU09C5(ctx: SceneCtx): void {
  const { r, rng } = ctx;
  initChapter(ctx, 7, 240, 136);
  drawSkySparkles(ctx, 22, 128, 'petals');

  // 1) 14 Moonlit Sakura Blossom Petals fanning across the upper sanctuary halo (14 regions!)
  const cx = 240;
  const cy = 150;
  const petals = 14;
  for (let i = 0; i < petals; i++) {
    const a0 = -Math.PI * 0.9 + (i * Math.PI * 0.8) / petals;
    const a1 = -Math.PI * 0.9 + ((i + 0.86) * Math.PI * 0.8) / petals;
    const aMid = (a0 + a1) * 0.5;
    const id = ctx.dyn('flora', `Eternal Sakura Petal ${i + 1}`);
    const r0 = 66;
    const r1 = i % 2 === 0 ? 122 : 112;
    const sx = 1.46;
    const sy = 0.92;
    r.poly(id, [
      [cx + Math.cos(a0) * r0 * sx, cy + Math.sin(a0) * r0 * sy],
      [cx + Math.cos(a0) * (r1 - 14) * sx, cy + Math.sin(a0) * (r1 - 14) * sy],
      [cx + Math.cos(aMid - 0.03) * r1 * sx, cy + Math.sin(aMid - 0.03) * r1 * sy],
      [cx + Math.cos(aMid) * (r1 - 6) * sx, cy + Math.sin(aMid) * (r1 - 6) * sy],
      [cx + Math.cos(aMid + 0.03) * r1 * sx, cy + Math.sin(aMid + 0.03) * r1 * sy],
      [cx + Math.cos(a1) * (r1 - 14) * sx, cy + Math.sin(a1) * (r1 - 14) * sy],
      [cx + Math.cos(a1) * r0 * sx, cy + Math.sin(a1) * r0 * sy],
    ]);
    r.line(
      INK,
      cx + Math.cos(aMid) * (r0 + 8) * sx,
      cy + Math.sin(aMid) * (r0 + 8) * sy,
      cx + Math.cos(aMid) * (r1 - 14) * sx,
      cy + Math.sin(aMid) * (r1 - 14) * sy,
      { only: [id] },
    );
  }

  // 2) Core Orb (12/13), Mirrored Paper Lantern, Zenith Star, Sakura Clouds (14/15) (8 regions)
  const orb = drawThemedOrb(ctx, 56, 48, 16, 'lanternMoon');
  drawPaperLantern(ctx, 424, 54, 0.72, { label: 'Sky Shrine' });
  star(ctx, ctx.dyn('star', 'Shrine Zenith Star'), 240, 20, 11, { points: 5, inner: 0.48 });

  drawThemedCloud(ctx, 14, 54, 126, 74, 26, 'sakura');
  drawThemedCloud(ctx, 15, 426, 126, 74, 26, 'sakura');

  // 3) Horizon + Tatami Shrine Courtyard Deck (4 regions)
  drawHorizonHills(ctx, { style: 'bamboo', yBase: 170, yBottom: 224, layers: 2 });
  drawGroundDeck(ctx, { style: 'tatami', yTop: 214, yBottom: 250 });

  // 4) Grand Shrine Panorama (22 regions): Torii + 2 Ancient Sakura Trees + Pagoda + Teahouse + 2 Leaping Koi
  const toriiIds = drawToriiGate(ctx, 240, 174, 1.02, { label: 'Eternal Shrine' });
  const treeL = drawSakuraTree(ctx, 124, 166, 0.88, { label: 'West Eternal' });
  const treeR = drawSakuraTree(ctx, 356, 166, 0.88, { label: 'East Eternal', flip: -1 });
  drawPagodaTower(ctx, 44, 180, 0.72, { label: 'West Shrine' });
  drawTeahousePavilion(ctx, 434, 184, 0.72, 'East Shrine');
  const koiL = drawKoiPondFish(ctx, 176, 198, 0.68, { label: 'West Shrine' });
  const koiR = drawKoiPondFish(ctx, 304, 198, 0.68, { label: 'East Shrine', flip: -1 });

  // 5) 3 Ghosts in clean open upper-sky pockets
  drawGhostSilhouette(ctx, 'Eternal Koi Ghost', 'koi', Math.round(jit(rng, 144, 3)), Math.round(jit(rng, 28, 2)), 0.88);
  drawGhostSilhouette(ctx, 'Eternal Crane Ghost', 'crane', Math.round(jit(rng, 336, 3)), Math.round(jit(rng, 28, 2)), 0.88);
  drawGhostSilhouette(ctx, 'Shrine Cat Ghost', 'cat', Math.round(jit(rng, 38, 3)), Math.round(jit(rng, 92, 2)), 0.84);

  // 6) Paths & Full Hero Cast (14 actor regions -> total ~62 regions!)
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

  ctx.heroQuest('koi', 'Eternal Shrine', [...toriiIds, ...koiL, ...koiR, ...treeL, ...treeR]);
  ctx.heroQuest('violet', 'Violet', [1, 2, 3, 4]);
  ctx.heroQuest('lumi', 'Lumi', [5, 6, 7, 8]);
  ctx.heroQuest('nova', 'Nova', [9, 10, 11]);
}

export const U09_SCENES: Record<U09SceneId, (ctx: SceneCtx) => void> = {
  hub_sakuraKoiGarden: buildHubSakuraKoiGarden,
  u09_c1: buildU09C1,
  u09_c2a: buildU09C2a,
  u09_c2b: buildU09C2b,
  u09_c3a: buildU09C3a,
  u09_c3b: buildU09C3b,
  u09_c4a: buildU09C4a,
  u09_c4b: buildU09C4b,
  u09_c5: buildU09C5,
};
