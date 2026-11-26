/**
 * Universe 15: Tiny Desk-Top Kingdom (9 bespoke procedural scenes: 1 Hub + 8 Chapters).
 * Pure, deterministic (uses ctx.rng only), adheres to >= 60px region hygiene and bottom-margin reserve.
 */
import { MaterialId } from '../../contracts/materials';
import { UNIVERSE_BY_ID } from '../../contracts/universes';
import type { SceneCtx } from '../context';
import { crescent, inkArc, jit, star, twinkle } from '../props';
import { INK, W, type Pt } from '../raster';
import {
  drawGhostSilhouette,
  drawGiantInkwell,
  drawGiantTeacup,
  drawGroundDeck,
  drawHorizonHills,
  drawHourglassTower,
  drawPaperBoat,
  drawPencilTower,
  drawSanctuaryRoom,
  drawSkySparkles,
  drawSpoolCastle,
  drawThemedCloud,
  drawThemedOrb,
} from '../kit';

const U = UNIVERSE_BY_ID.miniatureDeskWorld;

type U15SceneId =
  | 'hub_miniatureDeskWorld'
  | 'u15_c1'
  | 'u15_c2a'
  | 'u15_c2b'
  | 'u15_c3a'
  | 'u15_c3b'
  | 'u15_c4a'
  | 'u15_c4b'
  | 'u15_c5';

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

/** Custom Wooden Ruler Gatehouse arch spanning between colored-pencil turrets (2 regions). */
function drawRulerGate(ctx: SceneCtx, cx: number, cy: number, scale = 1): number[] {
  const { r } = ctx;
  const s = scale;
  const arch = ctx.dyn('prop', 'Wooden Ruler Arch');
  const eraser = ctx.dyn('milkshake', 'Pink Eraser Pedestal');

  // Giant notched wooden ruler lintel + side jambs
  r.rect(arch, cx - 52 * s, cy - 26 * s, cx + 52 * s, cy - 8 * s);
  r.rect(arch, cx - 48 * s, cy - 8 * s, cx - 32 * s, cy + 34 * s);
  r.rect(arch, cx + 32 * s, cy - 8 * s, cx + 48 * s, cy + 34 * s);
  for (let rx = -44; rx <= 44; rx += 11) {
    const th = rx % 22 === 0 ? 9 : 5;
    r.line(INK, cx + rx * s, cy - 24 * s, cx + rx * s, cy - (24 - th) * s, { only: [arch] });
  }

  // Stepped bevel pink eraser threshold in center
  r.poly(eraser, [
    [cx - 28 * s, cy + 16 * s],
    [cx + 28 * s, cy + 16 * s],
    [cx + 34 * s, cy + 34 * s],
    [cx - 34 * s, cy + 34 * s],
  ]);
  r.line(INK, cx - 24 * s, cy + 24 * s, cx + 24 * s, cy + 24 * s, { only: [eraser] });

  return [arch, eraser];
}

/** Custom Plush Pincushion Dome with giant star-headed pins (3 regions). */
function drawPincushionDome(ctx: SceneCtx, cx: number, cy: number, scale = 1): number[] {
  const { r } = ctx;
  const s = scale;
  const base = ctx.dyn('prop', 'Pincushion Cup Base');
  const cushion = ctx.dyn('milkshake', 'Plush Pincushion Dome');
  const pins = ctx.dyn('star', 'Star-Headed Pins');

  r.ellipse(base, cx, cy + 24 * s, 38 * s, 12 * s);
  r.line(INK, cx - 28 * s, cy + 24 * s, cx + 28 * s, cy + 24 * s, { only: [base] });

  r.ellipse(cushion, cx, cy + 4 * s, 36 * s, 24 * s);
  inkArc(r, cx, cy + 4 * s, 18 * s, 23 * s, Math.PI, Math.PI * 2, 0, { only: [cushion] });
  r.line(INK, cx, cy - 18 * s, cx, cy + 20 * s, { only: [cushion] });

  // Three giant pearl/star pinheads emerging from dome (shared region)
  for (const [dx, dy, px0, py0] of [
    [-22, -26, -12, -10],
    [0, -34, 0, -14],
    [22, -26, 12, -10],
  ] as const) {
    r.capsule(pins, cx + px0 * s, cy + py0 * s, cx + dx * s, cy + dy * s, 2.4 * s);
    r.disc(pins, cx + dx * s, cy + dy * s, 7.5 * s);
  }
  return [base, cushion, pins];
}

/** Custom Fluted Silver Thimble Gazebo & Stacked Pearl Button Fountain (4 regions). */
function drawThimbleGazebo(ctx: SceneCtx, cx: number, cy: number, scale = 1): number[] {
  const { r } = ctx;
  const s = scale;
  const dome = ctx.dyn('prop', 'Dimpled Thimble Dome');
  const rim = ctx.dyn('star', 'Thimble Crown Rim');
  const buttonA = ctx.dyn('star', 'Giant Pearl Button');
  const buttonB = ctx.dyn('prop', 'Button Plaza Steps');

  // Stepped giant 4-hole button base
  r.ellipse(buttonB, cx, cy + 28 * s, 48 * s, 12 * s);
  r.line(INK, cx - 36 * s, cy + 28 * s, cx + 36 * s, cy + 28 * s, { only: [buttonB] });

  // Dimpled dome thimble tower
  r.poly(dome, [
    [cx - 26 * s, cy - 22 * s],
    [cx + 26 * s, cy - 22 * s],
    [cx + 34 * s, cy + 24 * s],
    [cx - 34 * s, cy + 24 * s],
  ]);
  r.ellipse(dome, cx, cy - 22 * s, 26 * s, 14 * s);
  for (const gy of [-12, -2, 8]) {
    for (const gx of [-18, -6, 6, 18]) {
      inkArc(r, cx + gx * s, cy + gy * s, 2.2 * s, 2.2 * s, 0, Math.PI * 2, 0, { only: [dome] });
    }
  }

  // Ornate gilded rim collar around thimble base
  r.rect(rim, cx - 38 * s, cy + 14 * s, cx + 38 * s, cy + 24 * s);
  r.line(INK, cx - 34 * s, cy + 19 * s, cx + 34 * s, cy + 19 * s, { only: [rim] });

  // Vertical leaning pearl button medallion crest atop the thimble
  r.disc(buttonA, cx, cy - 36 * s, 13 * s);
  inkArc(r, cx, cy - 36 * s, 9 * s, 9 * s, 0, Math.PI * 2, 0, { only: [buttonA] });
  for (const [bx, by] of [[-3.5, -39.5], [3.5, -39.5], [-3.5, -32.5], [3.5, -32.5]] as const) {
    r.dot(INK, cx + bx * s, cy + by * s, { only: [buttonA] });
  }

  return [dome, rim, buttonA, buttonB];
}

/** Custom Swirled Cat-Eye Glass Marble on brass ring pedestal (3 regions). */
function drawSwirlMarble(ctx: SceneCtx, cx: number, cy: number, scale = 1, label = 'Galaxy'): number[] {
  const { r } = ctx;
  const s = scale;
  const stand = ctx.dyn('prop', `${label} Brass Stand`);
  const glass = ctx.dyn('star', `${label} Glass Marble`);
  const ribbon = ctx.dyn('star', `${label} Cat-Eye Swirl`);

  r.poly(stand, [
    [cx - 22 * s, cy + 22 * s],
    [cx + 22 * s, cy + 22 * s],
    [cx + 28 * s, cy + 36 * s],
    [cx - 28 * s, cy + 36 * s],
  ]);
  r.disc(glass, cx, cy - 2 * s, 28 * s);
  inkArc(r, cx, cy - 2 * s, 22 * s, 22 * s, Math.PI * 1.1, Math.PI * 1.5, 0, { only: [glass] });

  // S-curved iridescent cat-eye glass swirl inside marble
  r.ellipse(ribbon, cx, cy - 2 * s, 20 * s, 9 * s, -0.55);
  inkArc(r, cx, cy - 2 * s, 14 * s, 5 * s, 0, Math.PI * 2, -0.55, { only: [ribbon] });

  return [stand, glass, ribbon];
}

/** Custom Stamp-Box Post-Office Pavilion with scalloped postage roof & wax seal crest (3 regions). */
function drawStampOffice(ctx: SceneCtx, cx: number, cy: number, scale = 1): number[] {
  const { r } = ctx;
  const s = scale;
  const walls = ctx.dyn('prop', 'Stamp-Box Pavilion');
  const roof = ctx.dyn('star', 'Postage Stamp Roof');
  const seal = ctx.dyn('star', 'Royal Wax Seal');

  // Classic letter-box pavilion facade with mail slot
  r.rect(walls, cx - 40 * s, cy - 10 * s, cx + 40 * s, cy + 36 * s);
  r.line(INK, cx - 32 * s, cy + 4 * s, cx + 32 * s, cy + 4 * s, { only: [walls] });
  r.line(INK, cx - 32 * s, cy + 10 * s, cx + 32 * s, cy + 10 * s, { only: [walls] });
  inkArc(r, cx, cy + 36 * s, 14 * s, 20 * s, Math.PI, Math.PI * 2, 0, { only: [walls] });

  // Perforated scalloped postage-stamp awning roof
  r.rect(roof, cx - 46 * s, cy - 34 * s, cx + 46 * s, cy - 10 * s);
  for (const ox of [-38, -22, -6, 10, 26, 42]) {
    r.disc(roof, cx + ox * s, cy - 34 * s, 6.5 * s);
    r.disc(roof, cx + ox * s, cy - 10 * s, 6.5 * s);
  }
  r.line(INK, cx - 38 * s, cy - 22 * s, cx + 38 * s, cy - 22 * s, { only: [roof] });

  // Embossed circular wax-seal medallion crest above the mail slot
  r.disc(seal, cx, cy - 22 * s, 12 * s);
  star(ctx, seal, cx, cy - 22 * s, 9 * s);
  inkArc(r, cx, cy - 22 * s, 9 * s, 9 * s, 0, Math.PI * 2, 0, { only: [seal] });

  return [walls, roof, seal];
}

/** Hub Sanctuary: Violet's Giant Teacup Studio */
function buildHubMiniatureDeskWorld(ctx: SceneCtx): void {
  ctx.universeId = U.id;
  ctx.ambient = U.ambient;

  let customIds: number[] = [];
  const res = drawSanctuaryRoom(ctx, {
    title: U.hubTitle,
    sky: { ...U.sky },
    palette: {
      wallPanel: MaterialId.CrystalGlacierMint,
      floor: MaterialId.SolarFlare24K,
      windowFrame: MaterialId.OpalPearl,
      windowGlass: MaterialId.DeepSpaceBiolum,
      curtain: MaterialId.CosmicCottonSwirl,
      orbCore: MaterialId.CrystalGlacierMint,
      orbRing: MaterialId.CosmicCottonSwirl,
      rugOuter: MaterialId.CosmicCottonSwirl,
      rugInner: MaterialId.OpalPearl,
      furniture: MaterialId.SolarFlare24K,
      furnitureTrim: MaterialId.AuroraSherbet,
      accentA: MaterialId.CrystalGlacierMint,
      accentB: MaterialId.StrawberrySupernova,
      accentC: MaterialId.LiquidAurora,
    },
    windowShape: 'porthole',
    windowOrbStyle: 'bubbleOrb',
    wallStyle: 'tile',
    floorStyle: 'wood',
    rugShape: 'scallop',
    lampStyle: 'candle',
    garlandStyle: 'hearts',
    sparkleStyle: 'stars',
    seatingLabel: 'Matchbox Daybed',
    workbenchLabel: 'Thimble Craft Table',
    shelfLabel: 'Button & Spool Rack',
    trinketLabels: ['Pastel Bobbins', 'Pearl Buttons', 'Tiny Sketchpads'],
    drawWindowView: (c, wx, _wy, _wHalf, wBot) => {
      // Giant colored-pencil turrets peeking in bottom of porthole
      const tips = c.dyn('star', 'Window Pencil Turrets');
      c.r.poly(tips, [
        [wx - 28, wBot - 6],
        [wx - 20, wBot - 28],
        [wx - 12, wBot - 6],
        [wx + 8, wBot - 6],
        [wx + 16, wBot - 26],
        [wx + 24, wBot - 6],
      ]);
      c.preColor(tips, MaterialId.RainbowPrismWax);
    },
    drawExtraProps: (c) => {
      const ids: number[] = [];
      // 1) Oversized Pearl Button wall plaque on left wall
      const btnWall = c.dyn('star', 'Wall Pearl Button');
      c.r.disc(btnWall, 84, 90, 16);
      inkArc(c.r, 84, 90, 11, 11, 0, Math.PI * 2, 0, { only: [btnWall] });
      c.r.dot(INK, 80, 86, { only: [btnWall] });
      c.r.dot(INK, 88, 86, { only: [btnWall] });
      c.r.dot(INK, 80, 94, { only: [btnWall] });
      c.r.dot(INK, 88, 94, { only: [btnWall] });
      c.preColor(btnWall, MaterialId.OpalPearl);
      ids.push(btnWall);

      // 2) Postage-stamp wall art frame on upper-right wall
      const stampWall = c.dyn('prop', 'Wall Postage Stamp');
      c.r.rect(stampWall, 338, 72, 370, 108);
      c.r.line(INK, 344, 78, 364, 78, { only: [stampWall] });
      c.r.line(INK, 344, 102, 364, 102, { only: [stampWall] });
      c.preColor(stampWall, MaterialId.StrawberrySupernova);
      ids.push(stampWall);

      // 3) Mini Thread-Spool Stool right of Violet
      const spool = c.dyn('prop', 'Thread-Spool Stool');
      c.r.rect(spool, 264, 210, 290, 232);
      c.r.ellipse(spool, 277, 210, 17, 5);
      c.r.ellipse(spool, 277, 234, 17, 5);
      c.r.line(INK, 266, 217, 288, 219, { only: [spool] });
      c.r.line(INK, 266, 224, 288, 226, { only: [spool] });
      c.preColor(spool, MaterialId.CrystalGlacierMint);
      ids.push(spool);

      // 4) Miniature Porcelain Teacup on right side of craft desk
      const cup = c.dyn('star', 'Desk Porcelain Cup');
      c.r.ellipse(cup, 376, 177, 15, 4);
      c.r.ellipse(cup, 376, 168, 12, 9);
      c.r.disc(cup, 389, 168, 4.5);
      c.preColor(cup, MaterialId.OpalPearl);
      ids.push(cup);

      customIds = ids;
      return ids;
    },
  });

  ctx.heroQuest('violet', 'Violet', [1, 2, 3, 4]);
  ctx.heroQuest('planet', 'Bubble Orb', [12, 13]);
  ctx.heroQuest('teacup', 'Studio Crafts', customIds);
  ctx.heroQuest('book', 'Tiny Folios', res.roomIds.slice(22, 25));
}

/** Chapter 1: The Colored-Pencil Palisade */
function buildU15C1(ctx: SceneCtx): void {
  const { rng } = ctx;
  setupMeta(ctx, chapterTitle('u15_c1'), 240, 152);
  drawSkySparkles(ctx, 18, 122, 'stars');

  const ox = Math.round(jit(rng, 378, 4));
  const oy = Math.round(jit(rng, 52, 3));
  const orb = drawThemedOrb(ctx, ox, oy, 20, 'ringedPlanet', { tilt: -0.24 });
  drawThemedCloud(ctx, 14, Math.round(jit(rng, 100, 4)), Math.round(jit(rng, 46, 3)), 86, 26, 'origami');
  drawThemedCloud(ctx, 15, Math.round(jit(rng, 246, 4)), Math.round(jit(rng, 40, 3)), 76, 24, 'origami');

  star(ctx, ctx.dyn('star', 'Palette Star'), Math.round(jit(rng, 180, 3)), Math.round(jit(rng, 68, 2)), 10);
  twinkle(ctx, ctx.dyn('star', 'Desk Sparkle'), Math.round(jit(rng, 314, 3)), Math.round(jit(rng, 68, 2)), 11);

  drawGhostSilhouette(ctx, 'Desk Kitty Ghost', 'cat', Math.round(jit(rng, 150, 3)), Math.round(jit(rng, 102, 2)), 0.9);
  drawGhostSilhouette(ctx, 'Sketchbook Ghost', 'book', Math.round(jit(rng, 336, 3)), Math.round(jit(rng, 102, 2)), 0.9);

  drawHorizonHills(ctx, { style: 'castle', yBase: 170, yBottom: 218, layers: 2 });
  drawGroundDeck(ctx, { style: 'desk', yTop: 206, yBottom: 250 });

  // Giant Colored-Pencil Castle Palisade + Wooden Ruler Gatehouse!
  const penL = drawPencilTower(ctx, 76, 170, 0.98, { label: 'Ruby' });
  const penC = drawPencilTower(ctx, 148, 166, 0.84, { label: 'Cobalt' });
  const gate = drawRulerGate(ctx, 252, 172, 1.02);
  const penR = drawPencilTower(ctx, 396, 170, 0.98, { label: 'Emerald' });

  ctx.ellipsePath('ring', ox, oy, orb.rx * 1.15, orb.ry * 1.3, 24, orb.tilt);
  const gallopPath = ctx.wavePath('gallop', 72, 232, 408, 232, 8, 2, 18);
  const orbitPath = ctx.ellipsePath('orbit', 240, 96, 174, 46, 24);
  ctx.marginPath(256);

  ctx.actor('violet', 194, 242, { facing: 1, anim: 'idle' });
  ctx.actor('lumi', 326, 240, { facing: -1, anim: 'idle', pathIndex: gallopPath });
  ctx.actor('moonCat', 252, 234, { facing: 1, anim: 'sleep' });
  ctx.actor('comet', 62, 98, { facing: 1, anim: 'float', pathIndex: orbitPath });

  ctx.heroQuest('book', 'Pencil Fort', [...penL, ...penR, ...gate]);
  ctx.heroQuest('violet', 'Violet', [1, 2, 3, 4]);
  ctx.heroQuest('lumi', 'Lumi', [5, 6, 7, 8]);
  ctx.heroQuest('planet', 'Desk Orb', [12, 13, ...penC]);
}

/** Chapter 2A: The Porcelain Teacup Lagoon */
function buildU15C2a(ctx: SceneCtx): void {
  const { r, rng } = ctx;
  setupMeta(ctx, chapterTitle('u15_c2a'), 240, 152);
  drawSkySparkles(ctx, 18, 122, 'bubbles');

  const ox = Math.round(jit(rng, 88, 4));
  const oy = Math.round(jit(rng, 52, 3));
  const orb = drawThemedOrb(ctx, ox, oy, 20, 'bubbleOrb', { tilt: -0.24 });
  drawThemedCloud(ctx, 14, Math.round(jit(rng, 244, 4)), Math.round(jit(rng, 42, 3)), 88, 26, 'steamPuff');
  drawThemedCloud(ctx, 15, Math.round(jit(rng, 402, 4)), Math.round(jit(rng, 50, 3)), 84, 26, 'steamPuff');

  star(ctx, ctx.dyn('star', 'Tea-Steam Star'), Math.round(jit(rng, 170, 3)), Math.round(jit(rng, 36, 2)), 10);
  twinkle(ctx, ctx.dyn('star', 'Sugar Twinkle'), Math.round(jit(rng, 328, 3)), Math.round(jit(rng, 38, 2)), 11);

  drawGhostSilhouette(ctx, 'Teacup Pastry Ghost', 'cupcake', Math.round(jit(rng, 162, 3)), Math.round(jit(rng, 92, 2)), 0.9);
  drawGhostSilhouette(ctx, 'Teatime Cat Ghost', 'cat', Math.round(jit(rng, 328, 3)), Math.round(jit(rng, 92, 2)), 0.9);
  drawGhostSilhouette(ctx, 'Steam Butterfly Ghost', 'butterfly', Math.round(jit(rng, 444, 3)), Math.round(jit(rng, 114, 2)), 0.85);

  drawHorizonHills(ctx, { style: 'waves', yBase: 170, yBottom: 218, layers: 2, labelPrefix: 'Berry Tea' });
  drawGroundDeck(ctx, { style: 'desk', yTop: 206, yBottom: 250 });

  // Colossal Center Porcelain Teacup + Floating Sugar-Cube Islands + Paper Tea-Boat!
  const teacup = drawGiantTeacup(ctx, 240, 168, 1.15, { label: 'Lagoon' });
  const boatR = drawPaperBoat(ctx, 392, 180, 0.86, { label: 'Tea-Skiff' });

  // Stacked Sugar-Cube Island on left
  const sugarA = ctx.dyn('milkshake', 'Sugar-Cube Island');
  const sugarB = ctx.dyn('star', 'Top Sugar Cube');
  r.rect(sugarA, 54, 176, 114, 210);
  r.line(INK, 84, 178, 84, 208, { only: [sugarA] });
  r.line(INK, 56, 193, 112, 193, { only: [sugarA] });
  r.rect(sugarB, 68, 150, 100, 176);
  r.line(INK, 84, 152, 84, 174, { only: [sugarB] });

  ctx.ellipsePath('ring', ox, oy, orb.rx * 1.15, orb.ry * 1.3, 24, orb.tilt);
  const gallopPath = ctx.wavePath('gallop', 72, 232, 408, 232, 8, 2, 18);
  const orbitPath = ctx.ellipsePath('orbit', 240, 96, 174, 46, 24);
  ctx.marginPath(256);

  ctx.actor('violet', 148, 242, { facing: 1, anim: 'idle' });
  ctx.actor('lumi', 328, 240, { facing: -1, anim: 'idle', pathIndex: gallopPath });
  ctx.actor('moonCat', 84, 150, { facing: 1, anim: 'sleep' });
  ctx.actor('comet', 432, 92, { facing: -1, anim: 'float', pathIndex: orbitPath });

  ctx.heroQuest('teacup', 'Teacup Lagoon', [...teacup, sugarA, sugarB]);
  ctx.heroQuest('cloud', 'Tea Steam', [14, 15, ...boatR]);
  ctx.heroQuest('violet', 'Violet', [1, 2, 3, 4]);
  ctx.heroQuest('lumi', 'Lumi', [5, 6, 7, 8]);
}

/** Chapter 2B: The Thread-Spool Ribbon Citadel */
function buildU15C2b(ctx: SceneCtx): void {
  const { r, rng } = ctx;
  setupMeta(ctx, chapterTitle('u15_c2b'), 240, 150);
  drawSkySparkles(ctx, 18, 122, 'stars');

  const ox = Math.round(jit(rng, 378, 4));
  const oy = Math.round(jit(rng, 52, 3));
  const orb = drawThemedOrb(ctx, ox, oy, 20, 'macaronOrb', { tilt: -0.22 });
  drawThemedCloud(ctx, 14, Math.round(jit(rng, 100, 4)), Math.round(jit(rng, 46, 3)), 86, 28, 'fluffy');
  drawThemedCloud(ctx, 15, Math.round(jit(rng, 246, 4)), Math.round(jit(rng, 40, 3)), 76, 26, 'fluffy');

  star(ctx, ctx.dyn('star', 'Silk Thread Star'), Math.round(jit(rng, 180, 3)), Math.round(jit(rng, 68, 2)), 10);
  twinkle(ctx, ctx.dyn('star', 'Bobbin Twinkle'), Math.round(jit(rng, 314, 3)), Math.round(jit(rng, 68, 2)), 11);

  drawGhostSilhouette(ctx, 'Sewing Kitty Ghost', 'cat', Math.round(jit(rng, 150, 3)), Math.round(jit(rng, 100, 2)), 0.9);
  drawGhostSilhouette(ctx, 'Silk Butterfly Ghost', 'butterfly', Math.round(jit(rng, 336, 3)), Math.round(jit(rng, 100, 2)), 0.9);
  drawGhostSilhouette(ctx, 'Ribbon Moth Ghost', 'moth', Math.round(jit(rng, 444, 3)), Math.round(jit(rng, 114, 2)), 0.85);

  drawHorizonHills(ctx, { style: 'rolling', yBase: 170, yBottom: 218, layers: 2, labelPrefix: 'Velvet' });
  drawGroundDeck(ctx, { style: 'desk', yTop: 206, yBottom: 250 });

  // Twin Thread-Spool Citadel Towers linked by Draped Silk Ribbon Banner + Plush Pincushion Dome!
  const ribbon = ctx.dyn('star', 'Draped Silk Banner');
  const ribTop: Pt[] = [];
  const ribBot: Pt[] = [];
  for (let i = 0; i <= 16; i++) {
    const t = i / 16;
    const rx = 98 + t * 284;
    const sag = Math.sin(t * Math.PI) * 18;
    ribTop.push([rx, 134 + sag]);
    ribBot.push([rx, 146 + sag]);
  }
  ribBot.reverse();
  r.poly(ribbon, [...ribTop, ...ribBot]);

  const spoolL = drawSpoolCastle(ctx, 92, 174, 0.96, { label: 'West' });
  const spoolR = drawSpoolCastle(ctx, 388, 174, 0.96, { label: 'East', flip: -1 });
  const cushion = drawPincushionDome(ctx, 240, 178, 1.0);

  ctx.ellipsePath('ring', ox, oy, orb.rx * 1.15, orb.ry * 1.3, 24, orb.tilt);
  const sprintPath = ctx.wavePath('sprint', 68, 232, 412, 232, 8, 2, 18);
  const orbitPath = ctx.ellipsePath('orbit', 240, 96, 174, 46, 24);
  ctx.marginPath(256);

  ctx.actor('violet', 156, 242, { facing: 1, anim: 'idle' });
  ctx.actor('nova', 324, 240, { facing: -1, anim: 'idle', pathIndex: sprintPath });
  ctx.actor('moonCat', 240, 234, { facing: 1, anim: 'sleep' });
  ctx.actor('comet', 62, 98, { facing: 1, anim: 'float', pathIndex: orbitPath });

  ctx.heroQuest('teacup', 'Spool Citadel', [...spoolL, ...spoolR, ribbon]);
  ctx.heroQuest('lantern', 'Pincushion', cushion);
  ctx.heroQuest('violet', 'Violet', [1, 2, 3, 4]);
  ctx.heroQuest('nova', 'Nova', [9, 10, 11]);
}

/** Chapter 3A: The Button & Thimble Courtyard */
function buildU15C3a(ctx: SceneCtx): void {
  const { rng } = ctx;
  setupMeta(ctx, chapterTitle('u15_c3a'), 240, 152);
  drawSkySparkles(ctx, 18, 122, 'bubbles');

  const ox = Math.round(jit(rng, 88, 4));
  const oy = Math.round(jit(rng, 52, 3));
  const orb = drawThemedOrb(ctx, ox, oy, 20, 'pearlMoon', { tilt: -0.24 });
  drawThemedCloud(ctx, 14, Math.round(jit(rng, 244, 4)), Math.round(jit(rng, 42, 3)), 88, 26, 'bubbleCluster');
  drawThemedCloud(ctx, 15, Math.round(jit(rng, 404, 4)), Math.round(jit(rng, 50, 3)), 84, 26, 'bubbleCluster');

  star(ctx, ctx.dyn('star', 'Pearl Button Star'), Math.round(jit(rng, 170, 3)), Math.round(jit(rng, 36, 2)), 10);
  twinkle(ctx, ctx.dyn('star', 'Thimble Glint'), Math.round(jit(rng, 328, 3)), Math.round(jit(rng, 38, 2)), 11);

  drawGhostSilhouette(ctx, 'Button Kitty Ghost', 'cat', Math.round(jit(rng, 162, 3)), Math.round(jit(rng, 92, 2)), 0.9);
  drawGhostSilhouette(ctx, 'Thimble Owl Ghost', 'owl', Math.round(jit(rng, 328, 3)), Math.round(jit(rng, 92, 2)), 0.9);
  drawGhostSilhouette(ctx, 'Pearl Crystal Ghost', 'crystal', Math.round(jit(rng, 444, 3)), Math.round(jit(rng, 114, 2)), 0.85);

  drawHorizonHills(ctx, { style: 'castle', yBase: 170, yBottom: 218, layers: 2 });
  drawGroundDeck(ctx, { style: 'desk', yTop: 206, yBottom: 250 });

  // Towering Dimpled Silver Thimble Gazebo + Flanking Spool Castles
  const thimble = drawThimbleGazebo(ctx, 240, 172, 1.06);
  const spoolL = drawSpoolCastle(ctx, 82, 174, 0.88, { label: 'Plaza West' });
  const spoolR = drawSpoolCastle(ctx, 398, 174, 0.88, { label: 'Plaza East', flip: -1 });

  ctx.ellipsePath('ring', ox, oy, orb.rx * 1.15, orb.ry * 1.3, 24, orb.tilt);
  const gallopPath = ctx.wavePath('gallop', 72, 232, 408, 232, 8, 2, 18);
  const sprintPath = ctx.wavePath('sprint', 68, 238, 412, 238, 7, 2.5, 18);
  const orbitPath = ctx.ellipsePath('orbit', 240, 96, 174, 46, 24);
  ctx.marginPath(256);

  ctx.actor('violet', 146, 242, { facing: 1, anim: 'idle' });
  ctx.actor('lumi', 240, 242, { facing: 1, anim: 'idle', pathIndex: gallopPath });
  ctx.actor('nova', 338, 240, { facing: -1, anim: 'idle', pathIndex: sprintPath });
  ctx.actor('moonCat', 432, 234, { facing: -1, anim: 'sleep' });

  ctx.heroQuest('teacup', 'Thimble Plaza', [...thimble, ...spoolL, ...spoolR]);
  ctx.heroQuest('violet', 'Violet', [1, 2, 3, 4]);
  ctx.heroQuest('lumi', 'Lumi', [5, 6, 7, 8]);
  ctx.heroQuest('nova', 'Nova', [9, 10, 11]);
  void orbitPath;
}

/** Chapter 3B: The Paperclip Suspension Bridge */
function buildU15C3b(ctx: SceneCtx): void {
  const { r, rng } = ctx;
  setupMeta(ctx, chapterTitle('u15_c3b'), 240, 160);
  drawSkySparkles(ctx, 18, 122, 'gears');

  const ox = Math.round(jit(rng, 240, 4));
  const oy = Math.round(jit(rng, 52, 3));
  const orb = drawThemedOrb(ctx, ox, oy, 20, 'astrolabe', { tilt: -0.22 });
  drawThemedCloud(ctx, 14, Math.round(jit(rng, 96, 4)), Math.round(jit(rng, 46, 3)), 86, 26, 'origami');
  drawThemedCloud(ctx, 15, Math.round(jit(rng, 384, 4)), Math.round(jit(rng, 48, 3)), 86, 26, 'origami');

  star(ctx, ctx.dyn('star', 'Suspension Star'), Math.round(jit(rng, 168, 3)), Math.round(jit(rng, 34, 2)), 10);
  twinkle(ctx, ctx.dyn('star', 'Paperclip Glint'), Math.round(jit(rng, 314, 3)), Math.round(jit(rng, 34, 2)), 11);

  drawGhostSilhouette(ctx, 'Paper Crane Ghost', 'crane', Math.round(jit(rng, 154, 3)), Math.round(jit(rng, 92, 2)), 0.9);
  drawGhostSilhouette(ctx, 'Pad Book Ghost', 'book', Math.round(jit(rng, 326, 3)), Math.round(jit(rng, 92, 2)), 0.9);

  drawHorizonHills(ctx, { style: 'castle', yBase: 176, yBottom: 248, layers: 2, labelPrefix: 'Sketchpad' });

  // Twin Towering Watercolor Sketchpad Cliffs on left & right
  const padL = ctx.dyn('prop', 'West Watercolor Stack');
  const padR = ctx.dyn('prop', 'East Watercolor Stack');
  r.rect(padL, 0, 164, 96, 250);
  r.rect(padR, 384, 164, W, 250);
  for (const py of [184, 206, 228]) {
    r.line(INK, 4, py, 92, py, { only: [padL] });
    r.line(INK, 388, py, 476, py, { only: [padR] });
  }

  // Linked Silver Paperclip Suspension Bridge spanning the desktop canyon!
  const deck = ctx.dyn('prop', 'Paperclip Bridge Deck');
  const clips = ctx.dyn('star', 'Silver Paperclip Links');
  r.rect(deck, 88, 198, 392, 214);
  for (let bx = 114; bx <= 366; bx += 42) {
    r.ellipse(clips, bx, 190, 20, 9);
    inkArc(r, bx, 190, 13, 4.5, 0, Math.PI * 2, 0, { only: [clips] });
  }

  // Twin Pencil Tower Bridge Pylons anchoring the paperclip cables
  const penL = drawPencilTower(ctx, 102, 156, 0.85, { label: 'West Pylon' });
  const penR = drawPencilTower(ctx, 378, 156, 0.85, { label: 'East Pylon' });

  ctx.ellipsePath('ring', ox, oy, orb.rx * 1.15, orb.ry * 1.3, 24, orb.tilt);
  const gallopPath = ctx.wavePath('gallop', 88, 198, 392, 198, 6, 1.5, 18);
  const sprintPath = ctx.wavePath('sprint', 96, 204, 384, 204, 4, 1, 18);
  const orbitPath = ctx.ellipsePath('orbit', 240, 98, 174, 46, 24);
  ctx.marginPath(256);

  ctx.actor('violet', 164, 202, { facing: 1, anim: 'idle' });
  ctx.actor('lumi', 316, 202, { facing: -1, anim: 'idle', pathIndex: gallopPath });
  ctx.actor('cometCar', 240, 204, { facing: 1, anim: 'run', pathIndex: sprintPath });
  ctx.actor('comet', 432, 92, { facing: -1, anim: 'float', pathIndex: orbitPath });

  ctx.heroQuest('book', 'Paperclip Span', [deck, clips, padL, padR]);
  ctx.heroQuest('lantern', 'Pencil Pylons', [...penL, ...penR]);
  ctx.heroQuest('violet', 'Violet', [1, 2, 3, 4]);
  ctx.heroQuest('lumi', 'Lumi', [5, 6, 7, 8]);
}

/** Chapter 4A: The Glass Marble Planetarium */
function buildU15C4a(ctx: SceneCtx): void {
  const { rng } = ctx;
  setupMeta(ctx, chapterTitle('u15_c4a'), 240, 150);
  drawSkySparkles(ctx, 20, 122, 'bubbles');

  const ox = Math.round(jit(rng, 378, 4));
  const oy = Math.round(jit(rng, 52, 3));
  const orb = drawThemedOrb(ctx, ox, oy, 20, 'bubbleOrb', { tilt: -0.24 });
  drawThemedCloud(ctx, 14, Math.round(jit(rng, 100, 4)), Math.round(jit(rng, 46, 3)), 86, 26, 'bubbleCluster');
  drawThemedCloud(ctx, 15, Math.round(jit(rng, 246, 4)), Math.round(jit(rng, 40, 3)), 76, 26, 'bubbleCluster');

  star(ctx, ctx.dyn('star', 'Marble Comet Star'), Math.round(jit(rng, 180, 3)), Math.round(jit(rng, 68, 2)), 10);
  twinkle(ctx, ctx.dyn('star', 'Cat-Eye Gleam'), Math.round(jit(rng, 314, 3)), Math.round(jit(rng, 68, 2)), 11);

  drawGhostSilhouette(ctx, 'Marble Crystal Ghost', 'crystal', Math.round(jit(rng, 148, 3)), Math.round(jit(rng, 100, 2)), 0.9);
  drawGhostSilhouette(ctx, 'Planetarium Owl Ghost', 'owl', Math.round(jit(rng, 336, 3)), Math.round(jit(rng, 100, 2)), 0.9);
  drawGhostSilhouette(ctx, 'Marble Kitty Ghost', 'cat', Math.round(jit(rng, 444, 3)), Math.round(jit(rng, 114, 2)), 0.85);

  drawHorizonHills(ctx, { style: 'clouds', yBase: 170, yBottom: 218, layers: 2 });
  drawGroundDeck(ctx, { style: 'desk', yTop: 206, yBottom: 250 });

  // Trio of Oversized Swirled Cat-Eye Glass Marbles + Hourglass Timer!
  const marbleL = drawSwirlMarble(ctx, 96, 174, 0.92, 'Nebula');
  const marbleC = drawSwirlMarble(ctx, 240, 166, 1.12, 'Galaxy');
  const hourR = drawHourglassTower(ctx, 386, 172, 0.92, { label: 'Desk' });

  ctx.ellipsePath('ring', ox, oy, orb.rx * 1.15, orb.ry * 1.3, 24, orb.tilt);
  const gallopPath = ctx.wavePath('gallop', 72, 232, 408, 232, 8, 2, 18);
  const sprintPath = ctx.wavePath('sprint', 68, 238, 412, 238, 7, 2.5, 18);
  const orbitPath = ctx.ellipsePath('orbit', 240, 96, 174, 46, 24);
  ctx.marginPath(256);

  ctx.actor('lumi', 152, 242, { facing: 1, anim: 'idle', pathIndex: gallopPath });
  ctx.actor('nova', 328, 240, { facing: -1, anim: 'idle', pathIndex: sprintPath });
  ctx.actor('moonCat', 240, 234, { facing: 1, anim: 'sleep' });
  ctx.actor('comet', 62, 98, { facing: 1, anim: 'float', pathIndex: orbitPath });

  ctx.heroQuest('geode', 'Galaxy Marbles', [...marbleL, ...marbleC]);
  ctx.heroQuest('planet', 'Desk Orbs', [12, 13, ...hourR]);
  ctx.heroQuest('lumi', 'Lumi', [5, 6, 7, 8]);
  ctx.heroQuest('nova', 'Nova', [9, 10, 11]);
}

/** Chapter 4B: The Stamp-Box Post-Office Plaza */
function buildU15C4b(ctx: SceneCtx): void {
  const { r, rng } = ctx;
  setupMeta(ctx, chapterTitle('u15_c4b'), 240, 152);
  drawSkySparkles(ctx, 18, 122, 'stars');

  const ox = Math.round(jit(rng, 88, 4));
  const oy = Math.round(jit(rng, 52, 3));
  const orb = drawThemedOrb(ctx, ox, oy, 20, 'lanternMoon', { tilt: -0.22 });
  drawThemedCloud(ctx, 14, Math.round(jit(rng, 244, 4)), Math.round(jit(rng, 42, 3)), 86, 26, 'origami');
  drawThemedCloud(ctx, 15, Math.round(jit(rng, 404, 4)), Math.round(jit(rng, 50, 3)), 84, 26, 'origami');

  // Fluttering folded pastel envelopes soaring like birds across the post-office sky!
  const envL = ctx.dyn('star', 'Fluttering Letter West');
  const envR = ctx.dyn('star', 'Fluttering Letter East');
  r.poly(envL, [[132, 108], [174, 102], [178, 126], [136, 132]]);
  r.line(INK, 134, 109, 156, 121, { only: [envL] });
  r.line(INK, 173, 103, 156, 121, { only: [envL] });

  r.poly(envR, [[304, 102], [346, 108], [342, 132], [300, 126]]);
  r.line(INK, 305, 103, 324, 121, { only: [envR] });
  r.line(INK, 345, 109, 324, 121, { only: [envR] });

  drawGhostSilhouette(ctx, 'Air-Mail Crane Ghost', 'crane', Math.round(jit(rng, 166, 3)), Math.round(jit(rng, 68, 2)), 0.88);
  drawGhostSilhouette(ctx, 'Postbook Ghost', 'book', Math.round(jit(rng, 326, 3)), Math.round(jit(rng, 68, 2)), 0.88);
  drawGhostSilhouette(ctx, 'Post-Office Cat Ghost', 'cat', Math.round(jit(rng, 444, 3)), Math.round(jit(rng, 114, 2)), 0.85);

  drawHorizonHills(ctx, { style: 'castle', yBase: 170, yBottom: 218, layers: 2 });
  drawGroundDeck(ctx, { style: 'desk', yTop: 206, yBottom: 250 });

  // Central Stamp-Box Post-Office Pavilion + Flanking Giant Inkwell & Pencil Spire
  const postOffice = drawStampOffice(ctx, 240, 170, 1.06);
  const inkL = drawGiantInkwell(ctx, 84, 176, 0.9, { label: 'Post' });
  const penR = drawPencilTower(ctx, 396, 170, 0.92, { label: 'Post-Mark' });

  ctx.ellipsePath('ring', ox, oy, orb.rx * 1.15, orb.ry * 1.3, 24, orb.tilt);
  const sprintPath = ctx.wavePath('sprint', 68, 232, 412, 232, 8, 2, 18);
  const orbitPath = ctx.ellipsePath('orbit', 240, 96, 174, 46, 24);
  ctx.marginPath(256);

  ctx.actor('violet', 152, 242, { facing: 1, anim: 'idle' });
  ctx.actor('nova', 328, 240, { facing: -1, anim: 'idle', pathIndex: sprintPath });
  ctx.actor('moonCat', 240, 234, { facing: 1, anim: 'sleep' });
  ctx.actor('comet', 432, 92, { facing: -1, anim: 'float', pathIndex: orbitPath });

  ctx.heroQuest('book', 'Stamp Office', [...postOffice, envL, envR]);
  ctx.heroQuest('lantern', 'Desk Tools', [...inkL, ...penR]);
  ctx.heroQuest('violet', 'Violet', [1, 2, 3, 4]);
  ctx.heroQuest('nova', 'Nova', [9, 10, 11]);
}

/** Chapter 5 (Grand Finale): The Grand Sketchbook Desk Castle (50..70 regions!) */
function buildU15C5(ctx: SceneCtx): void {
  const { r, rng } = ctx;
  setupMeta(ctx, chapterTitle('u15_c5'), 240, 134);
  drawSkySparkles(ctx, 22, 118, 'stars');

  const ox = Math.round(jit(rng, 72, 3));
  const oy = Math.round(jit(rng, 52, 2));
  const orb = drawThemedOrb(ctx, ox, oy, 18, 'bubbleOrb', { tilt: -0.24 });
  drawThemedCloud(ctx, 14, 62, 118, 76, 24, 'origami');
  drawThemedCloud(ctx, 15, 418, 118, 76, 24, 'origami');

  star(ctx, ctx.dyn('star', 'West Atelier Star'), 36, 24, 9.5);
  star(ctx, ctx.dyn('star', 'East Atelier Star'), 444, 24, 9.5);
  const eastMoon = ctx.dyn('star', 'Craft Crown Crescent');
  crescent(ctx, eastMoon, 408, 52, 18, -0.42);
  twinkle(ctx, ctx.dyn('star', 'Sketchbook Star'), 240, 18, 10.5);

  drawGhostSilhouette(ctx, 'Royal Desk Cat Ghost', 'cat', 152, 34, 0.85);
  drawGhostSilhouette(ctx, 'Master Pad Ghost', 'book', 328, 34, 0.85);
  drawGhostSilhouette(ctx, 'Origami Crane Ghost', 'crane', 30, 85, 0.9);

  // 10 radiant Craft-Prism Color-Wheel Wedges arcing behind the Grand Teacup Keep!
  const mcx = 240;
  const mcy = 132;
  const wheelIds: number[] = [];
  for (let i = 0; i < 10; i++) {
    const a = -Math.PI + ((i + 0.5) * Math.PI) / 10;
    const wid = ctx.dyn('star', `Craft Prism Ray ${i + 1}`);
    wheelIds.push(wid);
    const r0 = 38;
    const rMid = 66;
    const r1 = 94;
    const hw = 0.125;
    r.poly(wid, [
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
      { only: [wid] },
    );
  }

  drawHorizonHills(ctx, { style: 'castle', yBase: 170, yBottom: 216, layers: 2 });
  drawGroundDeck(ctx, { style: 'desk', yTop: 208, yBottom: 250, labelPrefix: 'Royal' });

  // Grand Tabletop Castle: Center Giant Teacup Keep + Pencil Turrets + Spool Watchtowers + Pearl Buttons!
  const keep = drawGiantTeacup(ctx, 240, 166, 1.08, { label: 'Royal' });
  const penL = drawPencilTower(ctx, 142, 166, 0.88, { label: 'Royal West' });
  const penR = drawPencilTower(ctx, 338, 166, 0.88, { label: 'Royal East' });
  const spoolL = drawSpoolCastle(ctx, 68, 174, 0.82, { label: 'Royal West' });
  const spoolR = drawSpoolCastle(ctx, 412, 174, 0.82, { label: 'Royal East', flip: -1 });
  const marbleL = drawSwirlMarble(ctx, 148, 92, 0.65, 'Crown West');
  const marbleR = drawSwirlMarble(ctx, 332, 92, 0.65, 'Crown East');

  ctx.ellipsePath('ring', ox, oy, orb.rx * 1.15, orb.ry * 1.3, 24, orb.tilt);
  const gallopPath = ctx.wavePath('gallop', 66, 236, 414, 236, 7, 2, 20);
  const sprintPath = ctx.wavePath('sprint', 88, 232, 392, 232, 9, 2.5, 20);
  const orbitPath = ctx.ellipsePath('orbit', 240, 108, 182, 54, 28);
  ctx.marginPath(256);

  ctx.actor('lumi', 152, 244, { facing: 1, anim: 'rear', pathIndex: gallopPath });
  ctx.actor('violet', 240, 248, { facing: 1, anim: 'idle' });
  ctx.actor('nova', 328, 244, { facing: -1, anim: 'leap', pathIndex: sprintPath });
  ctx.actor('moonCat', 68, 234, { facing: 1, anim: 'sleep' });
  ctx.actor('comet', 416, 84, { facing: -1, anim: 'float', pathIndex: orbitPath });

  ctx.heroQuest('teacup', 'Desk Castle', [...keep, ...wheelIds.slice(0, 5)]);
  ctx.heroQuest('violet', 'Violet', [1, 2, 3, 4]);
  ctx.heroQuest('lumi', 'Lumi', [5, 6, 7, 8]);
  ctx.heroQuest('nova', 'Nova', [9, 10, 11]);
  void penL;
  void penR;
  void spoolL;
  void spoolR;
  void marbleL;
  void marbleR;
}

export const U15_SCENES: Record<U15SceneId, (ctx: SceneCtx) => void> = {
  hub_miniatureDeskWorld: buildHubMiniatureDeskWorld,
  u15_c1: buildU15C1,
  u15_c2a: buildU15C2a,
  u15_c2b: buildU15C2b,
  u15_c3a: buildU15C3a,
  u15_c3b: buildU15C3b,
  u15_c4a: buildU15C4a,
  u15_c4b: buildU15C4b,
  u15_c5: buildU15C5,
};
