/**
 * Universe 13: Infinite Storybook Library (9 bespoke procedural scenes: 1 Hub + 8 Chapters).
 * Pure, deterministic (uses ctx.rng only), adheres to >= 60px region hygiene and bottom-margin reserve.
 */
import { MaterialId } from '../../contracts/materials';
import { UNIVERSE_BY_ID } from '../../contracts/universes';
import type { SceneCtx } from '../context';
import { crescent, inkArc, jit, star, twinkle } from '../props';
import { INK, W, type Pt } from '../raster';
import {
  drawBookCastle,
  drawFairyLantern,
  drawGhostSilhouette,
  drawGiantInkwell,
  drawGroundDeck,
  drawHorizonHills,
  drawHourglassTower,
  drawOrigamiCrane,
  drawPaperLantern,
  drawSanctuaryRoom,
  drawSkySparkles,
  drawThemedCloud,
  drawThemedOrb,
} from '../kit';

const U = UNIVERSE_BY_ID.storybookLibrary;

type U13SceneId =
  | 'hub_storybookLibrary'
  | 'u13_c1'
  | 'u13_c2a'
  | 'u13_c2b'
  | 'u13_c3a'
  | 'u13_c3b'
  | 'u13_c4a'
  | 'u13_c4b'
  | 'u13_c5';

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

/** Custom fluttering open flying hardcover book in the library sky (2 regions). */
function drawFlyingBook(ctx: SceneCtx, cx: number, cy: number, scale = 1, label = 'Flying'): number[] {
  const { r } = ctx;
  const s = scale;
  const cover = ctx.dyn('prop', `${label} Book Cover`);
  const pages = ctx.dyn('star', `${label} Book Pages`);

  // Outspread cover wings underneath
  r.poly(cover, [
    [cx, cy + 4 * s],
    [cx - 26 * s, cy - 12 * s],
    [cx - 32 * s, cy + 4 * s],
    [cx, cy + 16 * s],
    [cx + 32 * s, cy + 4 * s],
    [cx + 26 * s, cy - 12 * s],
  ]);

  // Fluttering arched cream pages above
  r.poly(pages, [
    [cx, cy - 2 * s],
    [cx - 24 * s, cy - 16 * s],
    [cx - 26 * s, cy + 2 * s],
    [cx, cy + 10 * s],
    [cx + 26 * s, cy + 2 * s],
    [cx + 24 * s, cy - 16 * s],
  ]);
  r.line(INK, cx, cy - 1 * s, cx, cy + 9 * s, { only: [pages] });
  r.line(INK, cx - 18 * s, cy - 8 * s, cx - 6 * s, cy - 2 * s, { only: [pages] });
  r.line(INK, cx + 18 * s, cy - 8 * s, cx + 6 * s, cy - 2 * s, { only: [pages] });

  return [cover, pages];
}

/** Custom Giant Pop-Up Entry Archway made of unfolded gilded covers & paper stairs (3 regions). */
function drawPopUpArchway(ctx: SceneCtx, cx: number, cy: number, scale = 1): number[] {
  const { r } = ctx;
  const s = scale;
  const covers = ctx.dyn('prop', 'Gilded Pop-Up Covers');
  const pages = ctx.dyn('star', 'Unfolded Paper Arch');
  const stairs = ctx.dyn('prop', 'Pop-Up Book Stairs');

  // Standing open gilded hardcover wings framing the archway
  r.poly(covers, [
    [cx - 56 * s, cy - 28 * s],
    [cx - 22 * s, cy - 38 * s],
    [cx - 22 * s, cy + 36 * s],
    [cx - 56 * s, cy + 28 * s],
  ]);
  r.poly(covers, [
    [cx + 22 * s, cy - 38 * s],
    [cx + 56 * s, cy - 28 * s],
    [cx + 56 * s, cy + 28 * s],
    [cx + 22 * s, cy + 36 * s],
  ]);
  r.line(INK, cx - 44 * s, cy - 24 * s, cx - 44 * s, cy + 22 * s, { only: [covers] });
  r.line(INK, cx + 44 * s, cy - 24 * s, cx + 44 * s, cy + 22 * s, { only: [covers] });

  // Pop-up fairytale paper arch cresting between the covers
  r.shape(pages, cx - 34 * s, cy - 44 * s, cx + 34 * s, cy + 8 * s, (px, py) => {
    if (py < cy - 42 * s || py > cy + 6 * s) return false;
    if (Math.abs(px - cx) > 32 * s) return false;
    const dx = (px - cx) / (19 * s);
    const dy = (py - (cy + 6 * s)) / (24 * s);
    return dx * dx + dy * dy >= 1;
  });
  r.line(INK, cx, cy - 40 * s, cx, cy - 18 * s, { only: [pages] });

  // Stepped folded paper staircase leading through the archway
  r.poly(stairs, [
    [cx - 18 * s, cy + 8 * s],
    [cx + 18 * s, cy + 8 * s],
    [cx + 28 * s, cy + 36 * s],
    [cx - 28 * s, cy + 36 * s],
  ]);
  for (const sy of [14, 21, 28]) {
    r.line(INK, cx - 22 * s, cy + sy * s, cx + 22 * s, cy + sy * s, { only: [stairs] });
  }

  return [covers, pages, stairs];
}

/** Custom Whispering Brass Star-Globe on carved meridian cradle with pop-up island spire (4 regions). */
function drawWhisperingGlobe(ctx: SceneCtx, cx: number, cy: number, scale = 1): number[] {
  const { r } = ctx;
  const s = scale;
  const stand = ctx.dyn('prop', 'Carved Globe Stand');
  const meridian = ctx.dyn('star', 'Brass Meridian Ring');
  const sphere = ctx.dyn('star', 'Whispering Star Globe');
  const island = ctx.dyn('flora', 'Pop-Up Globe Isle');

  // Turned pedestal base
  r.poly(stand, [
    [cx - 26 * s, cy + 24 * s],
    [cx + 26 * s, cy + 24 * s],
    [cx + 34 * s, cy + 38 * s],
    [cx - 34 * s, cy + 38 * s],
  ]);
  r.rect(stand, cx - 8 * s, cy + 12 * s, cx + 8 * s, cy + 26 * s);

  // Brass outer meridian arc
  r.shape(meridian, cx - 42 * s, cy - 44 * s, cx + 42 * s, cy + 26 * s, (px, py) => {
    const d = Math.hypot((px - cx) / (38 * s), (py - (cy - 8 * s)) / (36 * s));
    return d <= 1.0 && d >= 0.78;
  });

  // Glowing celestial globe body
  r.disc(sphere, cx, cy - 8 * s, 27 * s);
  inkArc(r, cx, cy - 8 * s, 14 * s, 25 * s, 0, Math.PI * 2, 0, { only: [sphere] });
  r.line(INK, cx - 25 * s, cy - 8 * s, cx + 25 * s, cy - 8 * s, { only: [sphere] });
  r.line(INK, cx, cy - 33 * s, cx, cy + 17 * s, { only: [sphere] });

  // Tiny pop-up castle island emerging from the north pole of the globe!
  r.poly(island, [
    [cx - 16 * s, cy - 28 * s],
    [cx - 10 * s, cy - 42 * s],
    [cx - 4 * s, cy - 34 * s],
    [cx, cy - 48 * s],
    [cx + 6 * s, cy - 34 * s],
    [cx + 12 * s, cy - 40 * s],
    [cx + 16 * s, cy - 28 * s],
  ]);

  return [stand, meridian, sphere, island];
}

/** Custom cozy velvet library reading armchair (2 regions). */
function drawVelvetArmchair(ctx: SceneCtx, cx: number, cy: number, scale = 1): number[] {
  const { r } = ctx;
  const s = scale;
  const back = ctx.dyn('prop', 'Velvet Chair Back');
  const seat = ctx.dyn('star', 'Plush Reading Cushion');

  r.ellipse(back, cx, cy - 10 * s, 26 * s, 24 * s);
  r.rect(back, cx - 28 * s, cy - 6 * s, cx + 28 * s, cy + 28 * s);
  r.disc(back, cx - 26 * s, cy + 4 * s, 9 * s);
  r.disc(back, cx + 26 * s, cy + 4 * s, 9 * s);
  r.line(INK, cx - 10 * s, cy - 22 * s, cx - 10 * s, cy + 2 * s, { only: [back] });
  r.line(INK, cx + 10 * s, cy - 22 * s, cx + 10 * s, cy + 2 * s, { only: [back] });

  r.ellipse(seat, cx, cy + 12 * s, 20 * s, 10 * s);
  r.line(INK, cx - 14 * s, cy + 12 * s, cx + 14 * s, cy + 12 * s, { only: [seat] });
  return [back, seat];
}

/** Hub Sanctuary: Violet's Floating Reading Nook */
function buildHubStorybookLibrary(ctx: SceneCtx): void {
  ctx.universeId = U.id;
  ctx.ambient = U.ambient;

  let customIds: number[] = [];
  const res = drawSanctuaryRoom(ctx, {
    title: U.hubTitle,
    sky: { ...U.sky },
    palette: {
      wallPanel: MaterialId.VelvetNebula,
      floor: MaterialId.RoyalAstralGold,
      windowFrame: MaterialId.SolarFlare24K,
      windowGlass: MaterialId.DeepSpaceBiolum,
      curtain: MaterialId.StrawberrySupernova,
      orbCore: MaterialId.SolarFlare24K,
      orbRing: MaterialId.HoloFoil,
      rugOuter: MaterialId.RoyalAstralGold,
      rugInner: MaterialId.SupernovaGlitter,
      furniture: MaterialId.RoyalAstralGold,
      furnitureTrim: MaterialId.SolarFlare24K,
      accentA: MaterialId.SolarFlare24K,
      accentB: MaterialId.CosmicCottonSwirl,
      accentC: MaterialId.LiquidAurora,
    },
    windowShape: 'gothic',
    windowOrbStyle: 'lanternMoon',
    wallStyle: 'wainscot',
    floorStyle: 'wood',
    rugShape: 'oval',
    lampStyle: 'candle',
    garlandStyle: 'stars',
    sparkleStyle: 'stars',
    seatingLabel: 'Velvet Reading Chaise',
    workbenchLabel: 'Illuminator Desk',
    shelfLabel: 'Infinite Folio Stack',
    trinketLabels: ['Fable Anthologies', 'Starlight Atlases', 'Pop-Up Chronicles'],
    drawWindowView: (c, wx, _wy, _wHalf, wBot) => {
      // Miniature book-tower spires visible through lower gothic window
      const spires = c.dyn('prop', 'Window Library Spires');
      c.r.poly(spires, [
        [wx - 32, wBot - 2],
        [wx - 32, wBot - 22],
        [wx - 22, wBot - 32],
        [wx - 12, wBot - 22],
        [wx - 12, wBot - 16],
        [wx + 4, wBot - 16],
        [wx + 14, wBot - 30],
        [wx + 24, wBot - 18],
        [wx + 32, wBot - 18],
        [wx + 32, wBot - 2],
      ]);
      c.preColor(spires, MaterialId.SupernovaGlitter);

      const flyBook = c.dyn('star', 'Window Winged Book');
      c.r.poly(flyBook, [
        [wx - 2, wBot - 24],
        [wx - 16, wBot - 32],
        [wx - 14, wBot - 20],
        [wx - 2, wBot - 16],
        [wx + 12, wBot - 20],
        [wx + 14, wBot - 32],
      ]);
      c.preColor(flyBook, MaterialId.OpalPearl);
    },
    drawExtraProps: (c) => {
      const ids: number[] = [];
      // 1) Framed story crest plaque on left wall
      const plaque = c.dyn('star', 'Library Crest Plaque');
      c.r.ellipse(plaque, 84, 90, 18, 14);
      inkArc(c.r, 84, 90, 12, 9, 0, Math.PI * 2, 0, { only: [plaque] });
      c.preColor(plaque, MaterialId.SolarFlare24K);
      ids.push(plaque);

      // 2) Floating winged storybook hovering on upper-right wall
      const wingBook = drawFlyingBook(c, 354, 88, 0.72, 'Nook');
      c.preColor(wingBook[0] as number, MaterialId.StrawberrySupernova);
      c.preColor(wingBook[1] as number, MaterialId.OpalPearl);
      ids.push(...wingBook);

      // 3) Stacked bedside story-tome stool right of Violet
      const stack = c.dyn('prop', 'Stacked Folio Stool');
      c.r.rect(stack, 260, 212, 294, 224);
      c.r.rect(stack, 263, 224, 292, 236);
      c.r.line(INK, 262, 218, 292, 218, { only: [stack] });
      c.r.line(INK, 265, 230, 290, 230, { only: [stack] });
      c.preColor(stack, MaterialId.RainbowPrismWax);
      ids.push(stack);

      // 4) Crystal inkwell & quill perched on right corner of craft desk
      const deskInk = c.dyn('star', 'Desk Quill & Ink');
      c.r.poly(deskInk, [[368, 166], [384, 166], [388, 179], [364, 179]]);
      c.r.ellipse(deskInk, 382, 156, 10, 5, -0.8);
      c.preColor(deskInk, MaterialId.DragonflyIridescence);
      ids.push(deskInk);

      customIds = ids;
      return ids;
    },
  });

  ctx.heroQuest('violet', 'Violet', [1, 2, 3, 4]);
  ctx.heroQuest('planet', 'Story Moon', [12, 13]);
  ctx.heroQuest('book', 'Story Nook', customIds);
  ctx.heroQuest('lantern', 'Nook Lamps', [res.roomIds[18] as number, res.roomIds[19] as number]);
}

/** Chapter 1: The Pop-Up Entry Archway */
function buildU13C1(ctx: SceneCtx): void {
  const { rng } = ctx;
  setupMeta(ctx, chapterTitle('u13_c1'), 240, 152);
  drawSkySparkles(ctx, 18, 124, 'stars');

  const ox = Math.round(jit(rng, 378, 4));
  const oy = Math.round(jit(rng, 52, 3));
  const orb = drawThemedOrb(ctx, ox, oy, 20, 'lanternMoon', { tilt: -0.24 });
  drawThemedCloud(ctx, 14, Math.round(jit(rng, 102, 4)), Math.round(jit(rng, 46, 3)), 86, 26, 'origami');
  drawThemedCloud(ctx, 15, Math.round(jit(rng, 246, 4)), Math.round(jit(rng, 40, 3)), 76, 24, 'origami');

  star(ctx, ctx.dyn('star', 'Prologue Star'), Math.round(jit(rng, 178, 3)), Math.round(jit(rng, 68, 2)), 10);
  twinkle(ctx, ctx.dyn('star', 'Chapter Twinkle'), Math.round(jit(rng, 314, 3)), Math.round(jit(rng, 68, 2)), 11);

  drawGhostSilhouette(ctx, 'Floating Grimoire Ghost', 'book', Math.round(jit(rng, 146, 3)), Math.round(jit(rng, 102, 2)), 0.92);
  drawGhostSilhouette(ctx, 'Library Owl Ghost', 'owl', Math.round(jit(rng, 332, 3)), Math.round(jit(rng, 102, 2)), 0.92);

  drawHorizonHills(ctx, { style: 'castle', yBase: 168, yBottom: 218, layers: 2 });
  drawGroundDeck(ctx, { style: 'courtyard', yTop: 206, yBottom: 250 });

  // Central Giant Pop-Up Archway + flanking Book-Castle spire & Giant Inkwell
  const arch = drawPopUpArchway(ctx, 240, 170, 1.05);
  const inkL = drawGiantInkwell(ctx, 84, 178, 0.88, { label: 'Entry' });
  const castleR = drawBookCastle(ctx, 402, 170, 0.85, { label: 'Entry' });

  ctx.ellipsePath('ring', ox, oy, orb.rx * 1.15, orb.ry * 1.3, 24, orb.tilt);
  const gallopPath = ctx.wavePath('gallop', 76, 232, 406, 232, 8, 2, 18);
  const orbitPath = ctx.ellipsePath('orbit', 240, 96, 174, 46, 24);
  ctx.marginPath(256);

  ctx.actor('violet', 176, 242, { facing: 1, anim: 'idle' });
  ctx.actor('lumi', 316, 240, { facing: -1, anim: 'idle', pathIndex: gallopPath });
  ctx.actor('moonCat', 240, 234, { facing: 1, anim: 'sleep' });
  ctx.actor('comet', 62, 96, { facing: 1, anim: 'float', pathIndex: orbitPath });

  ctx.heroQuest('book', 'Pop-Up Arch', [...arch, ...inkL]);
  ctx.heroQuest('violet', 'Violet', [1, 2, 3, 4]);
  ctx.heroQuest('lumi', 'Lumi', [5, 6, 7, 8]);
  ctx.heroQuest('planet', 'Book Spire', [12, 13, ...castleR]);
}

/** Chapter 2A: The Floating Book-Castle Stacks */
function buildU13C2a(ctx: SceneCtx): void {
  const { rng } = ctx;
  setupMeta(ctx, chapterTitle('u13_c2a'), 240, 144);
  drawSkySparkles(ctx, 18, 122, 'stars');

  const ox = Math.round(jit(rng, 88, 4));
  const oy = Math.round(jit(rng, 52, 3));
  const orb = drawThemedOrb(ctx, ox, oy, 20, 'ringedPlanet', { tilt: -0.26 });
  drawThemedCloud(ctx, 14, Math.round(jit(rng, 242, 4)), Math.round(jit(rng, 40, 3)), 86, 26, 'fluffy');
  drawThemedCloud(ctx, 15, Math.round(jit(rng, 402, 4)), Math.round(jit(rng, 48, 3)), 84, 26, 'fluffy');

  star(ctx, ctx.dyn('star', 'Stacks Star'), Math.round(jit(rng, 168, 3)), Math.round(jit(rng, 36, 2)), 10);
  twinkle(ctx, ctx.dyn('star', 'Gallery Twinkle'), Math.round(jit(rng, 330, 3)), Math.round(jit(rng, 38, 2)), 11);

  drawGhostSilhouette(ctx, 'Soaring Tome Ghost', 'book', Math.round(jit(rng, 158, 3)), Math.round(jit(rng, 90, 2)), 0.9);
  drawGhostSilhouette(ctx, 'Keeper Owl Ghost', 'owl', Math.round(jit(rng, 330, 3)), Math.round(jit(rng, 92, 2)), 0.9);
  drawGhostSilhouette(ctx, 'Library Cat Ghost', 'cat', Math.round(jit(rng, 444, 3)), Math.round(jit(rng, 114, 2)), 0.85);

  drawHorizonHills(ctx, { style: 'castle', yBase: 168, yBottom: 218, layers: 2 });
  drawGroundDeck(ctx, { style: 'pier', yTop: 206, yBottom: 250, labelPrefix: 'Balcony' });

  // Grand central Book-Castle + soaring winged hardcovers + glowing reading lanterns
  const castle = drawBookCastle(ctx, 240, 164, 1.12, { label: 'Grand' });
  const flyL = drawFlyingBook(ctx, 98, 126, 0.95, 'West');
  const flyR = drawFlyingBook(ctx, 384, 124, 0.95, 'East');
  const lampL = drawPaperLantern(ctx, 64, 180, 0.78, { label: 'West Stack' });
  const lampR = drawPaperLantern(ctx, 416, 180, 0.78, { label: 'East Stack' });

  ctx.ellipsePath('ring', ox, oy, orb.rx * 1.15, orb.ry * 1.3, 24, orb.tilt);
  const sprintPath = ctx.wavePath('sprint', 68, 232, 412, 232, 8, 2, 18);
  const orbitPath = ctx.ellipsePath('orbit', 240, 96, 174, 48, 24);
  ctx.marginPath(256);

  ctx.actor('violet', 148, 242, { facing: 1, anim: 'idle' });
  ctx.actor('nova', 332, 240, { facing: -1, anim: 'idle', pathIndex: sprintPath });
  ctx.actor('moonCat', 240, 234, { facing: 1, anim: 'sleep' });
  ctx.actor('comet', 240, 82, { facing: 1, anim: 'float', pathIndex: orbitPath });

  ctx.heroQuest('book', 'Book Castle', [...castle, ...flyL, ...flyR]);
  ctx.heroQuest('lantern', 'Reading Lamps', [...lampL, ...lampR]);
  ctx.heroQuest('violet', 'Violet', [1, 2, 3, 4]);
  ctx.heroQuest('nova', 'Nova', [9, 10, 11]);
}

/** Chapter 2B: The Star-Inkwell Fountain Court */
function buildU13C2b(ctx: SceneCtx): void {
  const { r, rng } = ctx;
  setupMeta(ctx, chapterTitle('u13_c2b'), 240, 152);
  drawSkySparkles(ctx, 20, 124, 'stars');

  const ox = Math.round(jit(rng, 380, 4));
  const oy = Math.round(jit(rng, 52, 3));
  const orb = drawThemedOrb(ctx, ox, oy, 20, 'pearlMoon', { tilt: -0.24 });
  drawThemedCloud(ctx, 14, Math.round(jit(rng, 100, 4)), Math.round(jit(rng, 48, 3)), 86, 28, 'fluffy');
  drawThemedCloud(ctx, 15, Math.round(jit(rng, 246, 4)), Math.round(jit(rng, 40, 3)), 76, 24, 'fluffy');

  star(ctx, ctx.dyn('star', 'Ink-Spark Star'), Math.round(jit(rng, 180, 3)), Math.round(jit(rng, 70, 2)), 10);
  twinkle(ctx, ctx.dyn('star', 'Quill Gleam'), Math.round(jit(rng, 316, 3)), Math.round(jit(rng, 70, 2)), 11);

  drawGhostSilhouette(ctx, 'Ink Grimoire Ghost', 'book', Math.round(jit(rng, 148, 3)), Math.round(jit(rng, 102, 2)), 0.9);
  drawGhostSilhouette(ctx, 'Origami Crane Ghost', 'crane', Math.round(jit(rng, 336, 3)), Math.round(jit(rng, 102, 2)), 0.9);
  drawGhostSilhouette(ctx, 'Scribe Owl Ghost', 'owl', Math.round(jit(rng, 444, 3)), Math.round(jit(rng, 114, 2)), 0.85);

  drawHorizonHills(ctx, { style: 'castle', yBase: 168, yBottom: 218, layers: 2 });
  drawGroundDeck(ctx, { style: 'courtyard', yTop: 206, yBottom: 250 });

  // Shimmering Star-Ink Fountain Basin beneath giant central Inkwell
  const basin = ctx.dyn('star', 'Starlight Ink Basin');
  r.ellipse(basin, 240, 224, 96, 18);
  inkArc(r, 240, 224, 72, 11, 0, Math.PI * 2, 0, { only: [basin] });

  const inkwell = drawGiantInkwell(ctx, 240, 166, 1.15, { label: 'Fountain' });
  const lampL = drawFairyLantern(ctx, 84, 174, 0.9, { label: 'Scribe West' });
  const lampR = drawFairyLantern(ctx, 396, 174, 0.9, { label: 'Scribe East', flip: -1 });
  const flyL = drawFlyingBook(ctx, 134, 152, 0.72, 'Quill');

  ctx.ellipsePath('ring', ox, oy, orb.rx * 1.15, orb.ry * 1.3, 24, orb.tilt);
  const gallopPath = ctx.wavePath('gallop', 72, 232, 408, 232, 8, 2, 18);
  const orbitPath = ctx.ellipsePath('orbit', 240, 96, 174, 46, 24);
  ctx.marginPath(256);

  ctx.actor('violet', 142, 242, { facing: 1, anim: 'idle' });
  ctx.actor('lumi', 344, 240, { facing: -1, anim: 'idle', pathIndex: gallopPath });
  ctx.actor('moonCat', 428, 232, { facing: -1, anim: 'sleep' });
  ctx.actor('comet', 62, 98, { facing: 1, anim: 'float', pathIndex: orbitPath });

  ctx.heroQuest('book', 'Star Inkwell', [...inkwell, basin, ...flyL]);
  ctx.heroQuest('lantern', 'Scribe Lamps', [...lampL, ...lampR]);
  ctx.heroQuest('lumi', 'Lumi', [5, 6, 7, 8]);
  ctx.heroQuest('planet', 'Pearl Moon', [12, 13]);
}

/** Chapter 3A: The Hourglass Sand-of-Tales Tower */
function buildU13C3a(ctx: SceneCtx): void {
  const { r, rng } = ctx;
  setupMeta(ctx, chapterTitle('u13_c3a'), 240, 150);
  drawSkySparkles(ctx, 20, 124, 'stars');

  const ox = Math.round(jit(rng, 88, 4));
  const oy = Math.round(jit(rng, 52, 3));
  const orb = drawThemedOrb(ctx, ox, oy, 20, 'astrolabe', { tilt: -0.24 });
  drawThemedCloud(ctx, 14, Math.round(jit(rng, 244, 4)), Math.round(jit(rng, 42, 3)), 88, 26, 'steamPuff');
  drawThemedCloud(ctx, 15, Math.round(jit(rng, 402, 4)), Math.round(jit(rng, 52, 3)), 84, 26, 'steamPuff');

  // Rising golden story-grain bubbles drifting upward around the hourglass
  const sandOrbL = ctx.dyn('star', 'Rising Tale-Orb West');
  const sandOrbR = ctx.dyn('star', 'Rising Tale-Orb East');
  r.disc(sandOrbL, 174, 118, 11);
  inkArc(r, 174, 118, 7, 7, Math.PI * 1.1, Math.PI * 1.5, 0, { only: [sandOrbL] });
  r.disc(sandOrbR, 306, 116, 11);
  inkArc(r, 306, 116, 7, 7, Math.PI * 1.1, Math.PI * 1.5, 0, { only: [sandOrbR] });

  drawGhostSilhouette(ctx, 'Time Tome Ghost', 'book', Math.round(jit(rng, 166, 3)), Math.round(jit(rng, 72, 2)), 0.88);
  drawGhostSilhouette(ctx, 'Chronicle Owl Ghost', 'owl', Math.round(jit(rng, 326, 3)), Math.round(jit(rng, 74, 2)), 0.88);
  drawGhostSilhouette(ctx, 'Sand Crystal Ghost', 'crystal', Math.round(jit(rng, 444, 3)), Math.round(jit(rng, 114, 2)), 0.85);

  drawHorizonHills(ctx, { style: 'castle', yBase: 168, yBottom: 218, layers: 2 });
  drawGroundDeck(ctx, { style: 'courtyard', yTop: 206, yBottom: 250 });

  // Monumental central Hourglass Tower + flanking Book-Castle & Inkwell
  const hourglass = drawHourglassTower(ctx, 240, 166, 1.14, { label: 'Sand-of-Tales' });
  const castleL = drawBookCastle(ctx, 84, 172, 0.88, { label: 'Archive' });
  const inkR = drawGiantInkwell(ctx, 396, 176, 0.88, { label: 'Chronicle', flip: -1 });

  ctx.ellipsePath('ring', ox, oy, orb.rx * 1.15, orb.ry * 1.3, 24, orb.tilt);
  const gallopPath = ctx.wavePath('gallop', 72, 232, 408, 232, 8, 2, 18);
  const sprintPath = ctx.wavePath('sprint', 68, 238, 412, 238, 7, 2.5, 18);
  const orbitPath = ctx.ellipsePath('orbit', 240, 96, 174, 46, 24);
  ctx.marginPath(256);

  ctx.actor('lumi', 152, 242, { facing: 1, anim: 'idle', pathIndex: gallopPath });
  ctx.actor('nova', 328, 240, { facing: -1, anim: 'idle', pathIndex: sprintPath });
  ctx.actor('moonCat', 240, 234, { facing: 1, anim: 'sleep' });
  ctx.actor('comet', 442, 92, { facing: -1, anim: 'float', pathIndex: orbitPath });

  ctx.heroQuest('book', 'Hourglass Tower', [...hourglass, sandOrbL, sandOrbR]);
  ctx.heroQuest('lumi', 'Lumi', [5, 6, 7, 8]);
  ctx.heroQuest('nova', 'Nova', [9, 10, 11]);
  ctx.heroQuest('planet', 'Archive Tomes', [12, 13, ...castleL, ...inkR]);
}

/** Chapter 3B: The Origami Bookmark Bridge */
function buildU13C3b(ctx: SceneCtx): void {
  const { r, rng } = ctx;
  setupMeta(ctx, chapterTitle('u13_c3b'), 240, 162);
  drawSkySparkles(ctx, 18, 122, 'petals');

  const ox = Math.round(jit(rng, 240, 4));
  const oy = Math.round(jit(rng, 52, 3));
  const orb = drawThemedOrb(ctx, ox, oy, 20, 'lanternMoon', { tilt: -0.22 });
  drawThemedCloud(ctx, 14, Math.round(jit(rng, 96, 4)), Math.round(jit(rng, 46, 3)), 86, 26, 'origami');
  drawThemedCloud(ctx, 15, Math.round(jit(rng, 384, 4)), Math.round(jit(rng, 48, 3)), 86, 26, 'origami');

  star(ctx, ctx.dyn('star', 'Ribbon Star'), Math.round(jit(rng, 168, 3)), Math.round(jit(rng, 34, 2)), 10);
  twinkle(ctx, ctx.dyn('star', 'Bookmark Twinkle'), Math.round(jit(rng, 314, 3)), Math.round(jit(rng, 34, 2)), 11);

  drawGhostSilhouette(ctx, 'Paper Crane Ghost', 'crane', Math.round(jit(rng, 154, 3)), Math.round(jit(rng, 92, 2)), 0.9);
  drawGhostSilhouette(ctx, 'Winged Book Ghost', 'book', Math.round(jit(rng, 326, 3)), Math.round(jit(rng, 92, 2)), 0.9);

  // Deep canyon distant castle-book stacks
  drawHorizonHills(ctx, { style: 'castle', yBase: 176, yBottom: 248, layers: 2 });

  // Twin towering encyclopedia book-pillar cliffs on left & right
  const cliffL = ctx.dyn('prop', 'West Encyclopedia Cliff');
  const cliffR = ctx.dyn('prop', 'East Encyclopedia Cliff');
  r.rect(cliffL, 0, 152, 92, 250);
  r.rect(cliffR, 388, 152, W, 250);
  for (const by of [174, 198, 222]) {
    r.line(INK, 4, by, 88, by, { only: [cliffL] });
    r.line(INK, 392, by, 476, by, { only: [cliffR] });
  }

  // Sweeping arched Silk Origami Bookmark Bridge spanning the canyon!
  const bridge = ctx.dyn('star', 'Silk Bookmark Bridge');
  const tassel = ctx.dyn('star', 'Bookmark Ribbon Tail');
  const topPts: Pt[] = [];
  const botPts: Pt[] = [];
  for (let i = 0; i <= 20; i++) {
    const t = i / 20;
    const bx = 84 + t * 312;
    const arch = Math.sin(t * Math.PI) * 26;
    topPts.push([bx, 206 - arch]);
    botPts.push([bx, 226 - arch]);
  }
  botPts.reverse();
  r.poly(bridge, [...topPts, ...botPts]);
  for (let x = 112; x <= 368; x += 28) {
    const t = (x - 84) / 312;
    const arch = Math.sin(t * Math.PI) * 26;
    r.line(INK, x, 208 - arch, x, 224 - arch, { only: [bridge] });
  }
  // Trailing notched silk bookmark pennant hanging below bridge center
  r.poly(tassel, [[222, 196], [258, 196], [258, 246], [240, 232], [222, 246]]);

  // Origami cranes soaring cleanly beside the canyon towers
  const craneL = drawOrigamiCrane(ctx, 102, 126, 0.78, { label: 'West' });
  const craneR = drawOrigamiCrane(ctx, 378, 126, 0.78, { label: 'East', flip: -1 });

  ctx.ellipsePath('ring', ox, oy, orb.rx * 1.15, orb.ry * 1.3, 24, orb.tilt);
  const gallopPath = ctx.wavePath('gallop', 88, 196, 392, 196, 16, 1, 18);
  const orbitPath = ctx.ellipsePath('orbit', 240, 98, 174, 46, 24);
  ctx.marginPath(256);

  ctx.actor('violet', 166, 202, { facing: 1, anim: 'idle' });
  ctx.actor('lumi', 310, 202, { facing: -1, anim: 'idle', pathIndex: gallopPath });
  ctx.actor('nova', 52, 156, { facing: 1, anim: 'idle' });
  ctx.actor('comet', 432, 92, { facing: -1, anim: 'float', pathIndex: orbitPath });

  ctx.heroQuest('book', 'Ribbon Bridge', [bridge, tassel, cliffL, cliffR]);
  ctx.heroQuest('crane', 'Paper Cranes', [...craneL, ...craneR]);
  ctx.heroQuest('violet', 'Violet', [1, 2, 3, 4]);
  ctx.heroQuest('lumi', 'Lumi', [5, 6, 7, 8]);
}

/** Chapter 4A: The Whispering Globe Reading Room */
function buildU13C4a(ctx: SceneCtx): void {
  const { rng } = ctx;
  setupMeta(ctx, chapterTitle('u13_c4a'), 240, 148);
  drawSkySparkles(ctx, 18, 122, 'stars');

  const ox = Math.round(jit(rng, 380, 4));
  const oy = Math.round(jit(rng, 52, 3));
  const orb = drawThemedOrb(ctx, ox, oy, 20, 'astrolabe', { tilt: -0.26 });
  drawThemedCloud(ctx, 14, Math.round(jit(rng, 100, 4)), Math.round(jit(rng, 46, 3)), 86, 26, 'fluffy');
  drawThemedCloud(ctx, 15, Math.round(jit(rng, 246, 4)), Math.round(jit(rng, 38, 3)), 76, 24, 'fluffy');

  star(ctx, ctx.dyn('star', 'Atlas Star'), Math.round(jit(rng, 182, 3)), Math.round(jit(rng, 68, 2)), 10);
  twinkle(ctx, ctx.dyn('star', 'Globe Gleam'), Math.round(jit(rng, 316, 3)), Math.round(jit(rng, 68, 2)), 11);

  drawGhostSilhouette(ctx, 'Whisper Book Ghost', 'book', Math.round(jit(rng, 148, 3)), Math.round(jit(rng, 100, 2)), 0.9);
  drawGhostSilhouette(ctx, 'Atlas Owl Ghost', 'owl', Math.round(jit(rng, 336, 3)), Math.round(jit(rng, 100, 2)), 0.9);
  drawGhostSilhouette(ctx, 'Reading Cat Ghost', 'cat', Math.round(jit(rng, 444, 3)), Math.round(jit(rng, 114, 2)), 0.85);

  drawHorizonHills(ctx, { style: 'clouds', yBase: 170, yBottom: 218, layers: 2 });
  drawGroundDeck(ctx, { style: 'stage', yTop: 206, yBottom: 250, labelPrefix: 'Reading' });

  // Grand Central Whispering Star-Globe + Hourglass & Giant Inkwell flanking
  const globe = drawWhisperingGlobe(ctx, 240, 168, 1.12);
  const hourL = drawHourglassTower(ctx, 84, 172, 0.88, { label: 'Reading' });
  const inkR = drawGiantInkwell(ctx, 396, 174, 0.88, { label: 'Atlas', flip: -1 });

  ctx.ellipsePath('ring', ox, oy, orb.rx * 1.15, orb.ry * 1.3, 24, orb.tilt);
  const sprintPath = ctx.wavePath('sprint', 68, 232, 412, 232, 8, 2, 18);
  const orbitPath = ctx.ellipsePath('orbit', 240, 96, 174, 46, 24);
  ctx.marginPath(256);

  ctx.actor('violet', 154, 242, { facing: 1, anim: 'idle' });
  ctx.actor('nova', 326, 240, { facing: -1, anim: 'idle', pathIndex: sprintPath });
  ctx.actor('moonCat', 240, 236, { facing: 1, anim: 'sleep' });
  ctx.actor('comet', 62, 98, { facing: 1, anim: 'float', pathIndex: orbitPath });

  ctx.heroQuest('planet', 'Star Globe', [12, 13, ...globe]);
  ctx.heroQuest('book', 'Atlas Tools', [...hourL, ...inkR]);
  ctx.heroQuest('violet', 'Violet', [1, 2, 3, 4]);
  ctx.heroQuest('nova', 'Nova', [9, 10, 11]);
}

/** Chapter 4B: The Owl-Keeper's Spiral Mezzanine */
function buildU13C4b(ctx: SceneCtx): void {
  const { r, rng } = ctx;
  setupMeta(ctx, chapterTitle('u13_c4b'), 240, 152);
  drawSkySparkles(ctx, 18, 122, 'stars');

  const ox = Math.round(jit(rng, 90, 4));
  const oy = Math.round(jit(rng, 52, 3));
  const orb = drawThemedOrb(ctx, ox, oy, 20, 'pearlMoon', { tilt: -0.24 });
  drawThemedCloud(ctx, 14, Math.round(jit(rng, 244, 4)), Math.round(jit(rng, 42, 3)), 86, 26, 'fluffy');
  drawThemedCloud(ctx, 15, Math.round(jit(rng, 400, 4)), Math.round(jit(rng, 50, 3)), 84, 26, 'fluffy');

  star(ctx, ctx.dyn('star', 'Mezzanine Star'), Math.round(jit(rng, 172, 3)), Math.round(jit(rng, 36, 2)), 10);
  twinkle(ctx, ctx.dyn('star', 'Owl Perch Gleam'), Math.round(jit(rng, 328, 3)), Math.round(jit(rng, 38, 2)), 11);

  drawGhostSilhouette(ctx, 'Keeper Owl Ghost', 'owl', Math.round(jit(rng, 162, 3)), Math.round(jit(rng, 92, 2)), 0.94);
  drawGhostSilhouette(ctx, 'Grimoire Ghost', 'book', Math.round(jit(rng, 328, 3)), Math.round(jit(rng, 92, 2)), 0.9);
  drawGhostSilhouette(ctx, 'Armchair Cat Ghost', 'cat', Math.round(jit(rng, 444, 3)), Math.round(jit(rng, 114, 2)), 0.85);

  drawHorizonHills(ctx, { style: 'castle', yBase: 168, yBottom: 218, layers: 2 });
  drawGroundDeck(ctx, { style: 'pier', yTop: 206, yBottom: 250, labelPrefix: 'Mezzanine' });

  // Spiral Mezzanine curved staircase railing on left + plush Velvet Armchair center + Book Castle right
  const spiralStairs = ctx.dyn('prop', 'Spiral Mezzanine Stairs');
  r.poly(spiralStairs, [
    [62, 134], [116, 134], [128, 210], [50, 210],
  ]);
  for (const sy of [148, 162, 176, 190, 202]) {
    r.line(INK, 60, sy, 120, sy, { only: [spiralStairs] });
  }
  const chair = drawVelvetArmchair(ctx, 240, 186, 1.0);
  const lampL = drawFairyLantern(ctx, 154, 170, 0.84, { label: 'Mezzanine' });
  const lampR = drawPaperLantern(ctx, 314, 166, 0.78, { label: 'Owl Nook' });
  const castleR = drawBookCastle(ctx, 404, 172, 0.88, { label: 'Keeper' });

  ctx.ellipsePath('ring', ox, oy, orb.rx * 1.15, orb.ry * 1.3, 24, orb.tilt);
  const gallopPath = ctx.wavePath('gallop', 72, 232, 408, 232, 8, 2, 18);
  const orbitPath = ctx.ellipsePath('orbit', 240, 96, 174, 46, 24);
  ctx.marginPath(256);

  ctx.actor('violet', 178, 242, { facing: 1, anim: 'idle' });
  ctx.actor('lumi', 340, 240, { facing: -1, anim: 'idle', pathIndex: gallopPath });
  ctx.actor('moonCat', 240, 200, { facing: 1, anim: 'sleep' });
  ctx.actor('comet', 432, 92, { facing: -1, anim: 'float', pathIndex: orbitPath });

  ctx.heroQuest('lantern', 'Reading Lamps', [...lampL, ...lampR]);
  ctx.heroQuest('book', 'Velvet Nook', [...chair, spiralStairs, ...castleR]);
  ctx.heroQuest('violet', 'Violet', [1, 2, 3, 4]);
  ctx.heroQuest('moonCat', 'Moon-Cat', [17]);
}

/** Chapter 5 (Grand Finale): The Great Golden Tome Rotunda (50..70 regions!) */
function buildU13C5(ctx: SceneCtx): void {
  const { r, rng } = ctx;
  setupMeta(ctx, chapterTitle('u13_c5'), 240, 134);
  drawSkySparkles(ctx, 22, 118, 'stars');

  const ox = Math.round(jit(rng, 72, 3));
  const oy = Math.round(jit(rng, 52, 2));
  const orb = drawThemedOrb(ctx, ox, oy, 18, 'astrolabe', { tilt: -0.26 });
  drawThemedCloud(ctx, 14, 62, 118, 76, 24, 'origami');
  drawThemedCloud(ctx, 15, 418, 118, 76, 24, 'origami');

  star(ctx, ctx.dyn('star', 'West Rotunda Star'), 36, 24, 9.5);
  star(ctx, ctx.dyn('star', 'East Rotunda Star'), 444, 24, 9.5);
  const eastMoon = ctx.dyn('star', 'Rotunda Crescent Moon');
  crescent(ctx, eastMoon, 408, 52, 18, -0.42);
  twinkle(ctx, ctx.dyn('star', 'Rotunda Crown Star'), 240, 18, 10.5);

  drawGhostSilhouette(ctx, 'Master Tome Ghost', 'book', 152, 34, 0.85);
  drawGhostSilhouette(ctx, 'Grand Owl Ghost', 'owl', 328, 34, 0.85);
  drawGhostSilhouette(ctx, 'Story Crane Ghost', 'crane', 30, 85, 0.9);

  // 10 radiant Fan-Out Storybook Page Rays arching behind the Golden Master Tome!
  const mcx = 240;
  const mcy = 132;
  const pageRays: number[] = [];
  for (let i = 0; i < 10; i++) {
    const a = -Math.PI + ((i + 0.5) * Math.PI) / 10;
    const pid = ctx.dyn('star', `Golden Story Ray ${i + 1}`);
    pageRays.push(pid);
    const r0 = 38;
    const rMid = 66;
    const r1 = 94;
    const hw = 0.125;
    r.poly(pid, [
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
      { only: [pid] },
    );
  }

  drawHorizonHills(ctx, { style: 'castle', yBase: 170, yBottom: 216, layers: 2 });
  drawGroundDeck(ctx, { style: 'courtyard', yTop: 208, yBottom: 250, labelPrefix: 'Rotunda' });

  // Central Grand Open Golden Master Tome + Pop-Up Book Castle Spire + Flanking Hourglass & Inkwell
  const centerCastle = drawBookCastle(ctx, 240, 158, 1.08, { label: 'Master' });
  const tomeL = drawFlyingBook(ctx, 134, 92, 0.82, 'Rotunda West');
  const tomeR = drawFlyingBook(ctx, 346, 92, 0.82, 'Rotunda East');
  const hourL = drawHourglassTower(ctx, 84, 174, 0.9, { label: 'Rotunda' });
  const inkR = drawGiantInkwell(ctx, 396, 174, 0.9, { label: 'Rotunda', flip: -1 });
  const lampL = drawPaperLantern(ctx, 154, 174, 0.72, { label: 'Rotunda West' });
  const lampR = drawPaperLantern(ctx, 326, 174, 0.72, { label: 'Rotunda East' });

  ctx.ellipsePath('ring', ox, oy, orb.rx * 1.15, orb.ry * 1.3, 24, orb.tilt);
  const gallopPath = ctx.wavePath('gallop', 66, 236, 414, 236, 7, 2, 20);
  const sprintPath = ctx.wavePath('sprint', 88, 232, 392, 232, 9, 2.5, 20);
  const orbitPath = ctx.ellipsePath('orbit', 240, 108, 182, 54, 28);
  ctx.marginPath(256);

  ctx.actor('lumi', 152, 244, { facing: 1, anim: 'rear', pathIndex: gallopPath });
  ctx.actor('violet', 240, 248, { facing: 1, anim: 'idle' });
  ctx.actor('nova', 328, 244, { facing: -1, anim: 'leap', pathIndex: sprintPath });
  ctx.actor('moonCat', 134, 84, { facing: 1, anim: 'sleep' });
  ctx.actor('comet', 346, 84, { facing: -1, anim: 'float', pathIndex: orbitPath });

  ctx.heroQuest('book', 'Master Tome', [...centerCastle, ...pageRays.slice(0, 5)]);
  ctx.heroQuest('violet', 'Violet', [1, 2, 3, 4]);
  ctx.heroQuest('lumi', 'Lumi', [5, 6, 7, 8]);
  ctx.heroQuest('nova', 'Nova', [9, 10, 11]);
  void tomeL;
  void tomeR;
  void hourL;
  void inkR;
  void lampL;
  void lampR;
}

export const U13_SCENES: Record<U13SceneId, (ctx: SceneCtx) => void> = {
  hub_storybookLibrary: buildHubStorybookLibrary,
  u13_c1: buildU13C1,
  u13_c2a: buildU13C2a,
  u13_c2b: buildU13C2b,
  u13_c3a: buildU13C3a,
  u13_c3b: buildU13C3b,
  u13_c4a: buildU13C4a,
  u13_c4b: buildU13C4b,
  u13_c5: buildU13C5,
};
