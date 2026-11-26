/**
 * Universe 17: Sunbeam Butterfly Dome (`sunflowerGlasshouse`)
 * 9 bespoke deterministic procedural scenes: 1 Hub Sanctuary + 8 Chapters (incl. Slot-5 Grand Finale).
 */
import { MaterialId } from '../../contracts/materials';
import { UNIVERSE_BY_ID } from '../../contracts/universes';
import type { SceneCtx } from '../context';
import {
  drawFairyLantern,
  drawGhostSilhouette,
  drawGiantSunflower,
  drawGlassConservatory,
  drawGroundDeck,
  drawHoneycombArch,
  drawHorizonHills,
  drawSanctuaryRoom,
  drawSkySparkles,
  drawSnowglobe,
  drawThemedCloud,
  drawThemedOrb,
} from '../kit';
import { heart, inkArc, jit, pearl, rot, star } from '../props';
import { INK, W, type Pt, type Raster } from '../raster';

const U = UNIVERSE_BY_ID.sunflowerGlasshouse;

export type U17SceneId =
  | 'hub_sunflowerGlasshouse'
  | 'u17_c1'
  | 'u17_c2a'
  | 'u17_c2b'
  | 'u17_c3a'
  | 'u17_c3b'
  | 'u17_c4a'
  | 'u17_c4b'
  | 'u17_c5';

function initChapter(ctx: SceneCtx, id: Exclude<U17SceneId, 'hub_sunflowerGlasshouse'>, fx: number, fy: number): void {
  const ch = U.chapters.find((c) => c.id === id)!;
  ctx.title = ch.title;
  ctx.sky = { ...U.sky };
  ctx.universeId = U.id;
  ctx.ambient = U.ambient;
  ctx.focal = { x: fx, y: fy };
}

function pol(cx: number, cy: number, rad: number, a: number, sx = 1, sy = 1): Pt {
  return [cx + Math.cos(a) * rad * sx, cy + Math.sin(a) * rad * sy];
}

function petalPoly(cx: number, cy: number, aMid: number, r0: number, r1: number, halfA: number, sx = 1, sy = 1): Pt[] {
  const pts: Pt[] = [pol(cx, cy, r0, aMid, sx, sy)];
  for (let i = 1; i <= 6; i++) {
    const t = i / 7;
    const rad = r0 + (r1 - r0) * t;
    const w = Math.sin(Math.pow(t, 0.56) * Math.PI) * halfA;
    pts.push(pol(cx, cy, rad, aMid - w, sx, sy));
  }
  pts.push(pol(cx, cy, r1, aMid, sx, sy));
  for (let i = 6; i >= 1; i--) {
    const t = i / 7;
    const rad = r0 + (r1 - r0) * t;
    const w = Math.sin(Math.pow(t, 0.56) * Math.PI) * halfA;
    pts.push(pol(cx, cy, rad, aMid + w, sx, sy));
  }
  return pts;
}

/** Stained-glass butterfly sculpture / emblem (2 chunky colourable regions). */
function drawButterflySculpture(ctx: SceneCtx, x: number, y: number, s: number, label: string, pre?: readonly MaterialId[]): number[] {
  const { r } = ctx;
  const upper = ctx.dyn('star', `${label} Upper Wings`);
  const lower = ctx.dyn('flora', `${label} Lower Wings`);

  r.ellipse(upper, x - 20 * s, y - 10 * s, 21 * s, 15 * s, -0.35);
  r.ellipse(upper, x + 20 * s, y - 10 * s, 21 * s, 15 * s, 0.35);
  inkArc(r, x - 20 * s, y - 10 * s, 11 * s, 8 * s, 0, Math.PI * 2, -0.35, { only: [upper] });
  inkArc(r, x + 20 * s, y - 10 * s, 11 * s, 8 * s, 0, Math.PI * 2, 0.35, { only: [upper] });

  r.ellipse(lower, x - 15 * s, y + 12 * s, 15 * s, 12 * s, 0.3);
  r.ellipse(lower, x + 15 * s, y + 12 * s, 15 * s, 12 * s, -0.3);
  r.ellipse(lower, x, y + 2 * s, 5.5 * s, 18 * s);
  r.line(INK, x, y - 14 * s, x, y + 18 * s, { only: [lower] });

  if (pre && pre.length >= 2) {
    ctx.preColor(upper, pre[0]!);
    ctx.preColor(lower, pre[1]!);
  }
  return [upper, lower];
}

/** Hanging botanical orchid planter basket with trailing blooms (2 regions). */
function drawHangingOrchid(ctx: SceneCtx, x: number, y: number, s: number, label: string): number[] {
  const { r } = ctx;
  const basket = ctx.dyn('prop', `${label} Basket`);
  const blooms = ctx.dyn('flora', `${label} Orchids`);

  r.capsule(basket, x, y - 24 * s, x - 12 * s, y - 4 * s, 2.4 * s);
  r.capsule(basket, x, y - 24 * s, x + 12 * s, y - 4 * s, 2.4 * s);
  r.poly(basket, [
    [x - 18 * s, y - 4 * s],
    [x + 18 * s, y - 4 * s],
    [x + 12 * s, y + 12 * s],
    [x - 12 * s, y + 12 * s],
  ]);
  r.line(INK, x - 13 * s, y + 3 * s, x + 13 * s, y + 3 * s, { only: [basket] });

  r.disc(blooms, x - 14 * s, y - 8 * s, 9 * s);
  r.disc(blooms, x, y - 11 * s, 10 * s);
  r.disc(blooms, x + 14 * s, y - 8 * s, 9 * s);
  r.capsule(blooms, x - 10 * s, y + 8 * s, x - 14 * s, y + 26 * s, 4.5 * s);
  r.capsule(blooms, x + 10 * s, y + 8 * s, x + 14 * s, y + 24 * s, 4.5 * s);
  inkArc(r, x, y - 11 * s, 5 * s, 5 * s, 0, Math.PI * 2, 0, { only: [blooms] });

  return [basket, blooms];
}

/** Chunky floating pond lily pad with upright lotus-dew flower (2 regions). */
function drawLilyPadBloom(ctx: SceneCtx, x: number, y: number, s: number, label: string): number[] {
  const { r } = ctx;
  const pad = ctx.dyn('flora', `${label} Pad`);
  const flower = ctx.dyn('star', `${label} Blossom`);

  r.ellipse(pad, x, y + 5 * s, 28 * s, 10 * s);
  r.line(INK, x, y + 5 * s, x + 22 * s, y + 8 * s, { only: [pad] });
  inkArc(r, x, y + 5 * s, 18 * s, 6 * s, Math.PI * 0.2, Math.PI * 1.7, 0, { only: [pad] });

  r.ellipse(flower, x, y - 5 * s, 9 * s, 12 * s);
  r.ellipse(flower, x - 10 * s, y - 1 * s, 9 * s, 7 * s, -0.45);
  r.ellipse(flower, x + 10 * s, y - 1 * s, 9 * s, 7 * s, 0.45);
  r.line(INK, x, y - 14 * s, x, y + 2 * s, { only: [flower] });

  return [pad, flower];
}

/** Helper to draw a crisp 4-point chunky star with guaranteed >= 100px area. */
function chunkyStar(ctx: SceneCtx, label: string, x: number, y: number, rad = 12, points = 5): number {
  const id = ctx.dyn('star', label);
  star(ctx, id, x, y, rad, { points, inner: 0.48, rot: -Math.PI / 2 });
  return id;
}

function drawInkRay(r: Raster, x0: number, y0: number, x1: number, y1: number, id: number): void {
  r.line(INK, x0, y0, x1, y1, { only: [id] });
}

// ===========================================================================
// HUB SANCTUARY: Violet's Sunlit Botanical Veranda
// ===========================================================================
function buildHubSunflowerGlasshouse(ctx: SceneCtx): void {
  ctx.universeId = U.id;
  ctx.ambient = U.ambient;

  drawSanctuaryRoom(ctx, {
    title: U.hubTitle,
    sky: { ...U.sky },
    palette: {
      wallPanel: MaterialId.CrystalGlacierMint,
      floor: MaterialId.AuroraSherbet,
      windowFrame: MaterialId.SolarFlare24K,
      windowGlass: MaterialId.LiquidAurora,
      curtain: MaterialId.OpalPearl,
      orbCore: MaterialId.SolarFlare24K,
      orbRing: MaterialId.RainbowPrismWax,
      rugOuter: MaterialId.DragonflyIridescence,
      rugInner: MaterialId.SolarFlare24K,
      furniture: MaterialId.RoyalAstralGold,
      furnitureTrim: MaterialId.AuroraSherbet,
      accentA: MaterialId.SolarFlare24K,
      accentB: MaterialId.DragonflyIridescence,
      accentC: MaterialId.StrawberrySupernova,
    },
    windowShape: 'dome',
    windowOrbStyle: 'lotusSun',
    wallStyle: 'tile',
    floorStyle: 'tile',
    rugShape: 'scallop',
    lampStyle: 'lantern',
    garlandStyle: 'leaves',
    sparkleStyle: 'petals',
    seatingLabel: 'Sunroom Wicker Daybed',
    workbenchLabel: 'Botanical Pressing Desk',
    shelfLabel: 'Conservatory Specimen Shelf',
    trinketLabels: ['Pressed Petals', 'Nectar Jars', 'Butterfly Folios'],
    drawWindowView: (c, wx, _wy, _wh, wBot) => {
      // Sunlit glasshouse meadow ridge inside lower window pane
      const vista = c.dyn('flora', 'Conservatory Vista');
      c.r.poly(vista, [
        [wx - 34, wBot - 2],
        [wx - 34, wBot - 18],
        [wx - 12, wBot - 26],
        [wx + 12, wBot - 22],
        [wx + 34, wBot - 28],
        [wx + 34, wBot - 2],
      ]);
      inkArc(c.r, wx, wBot - 14, 18, 6, Math.PI, Math.PI * 2, 0, { only: [vista] });
      c.preColor(vista, MaterialId.CrystalGlacierMint);
    },
    drawExtraProps: (c) => {
      const ids: number[] = [];
      // Left wall stained-glass butterfly medallion mural (x = 76, y = 96)
      const frame = c.dyn('prop', 'Stained-Glass Wall Frame');
      c.r.ellipse(frame, 76, 94, 34, 24);
      inkArc(c.r, 76, 94, 30, 20, 0, Math.PI * 2, 0, { only: [frame] });
      c.preColor(frame, MaterialId.RoyalAstralGold);
      ids.push(frame);
      ids.push(...drawButterflySculpture(c, 76, 94, 0.78, 'Wall Butterfly', [MaterialId.SolarFlare24K, MaterialId.DragonflyIridescence]));

      // Right-center floor potted mini sunflower pedestal (x = 278, y = 188)
      const pot = c.dyn('prop', 'Botanical Planter Stand');
      c.r.poly(pot, [[264, 198], [292, 198], [287, 224], [269, 224]]);
      c.r.line(INK, 267, 207, 289, 207, { only: [pot] });
      c.preColor(pot, MaterialId.AuroraSherbet);
      ids.push(pot);

      const bloom = c.dyn('flora', 'Indoor Sunflower');
      for (let i = 0; i < 8; i++) {
        const a = (i / 8) * Math.PI * 2;
        c.r.ellipse(bloom, 278 + Math.cos(a) * 11, 174 + Math.sin(a) * 11, 6.5, 4, a);
      }
      c.r.capsule(bloom, 278, 182, 278, 198, 3.2);
      c.preColor(bloom, MaterialId.SolarFlare24K);
      ids.push(bloom);

      const core = c.dyn('star', 'Indoor Flower Heart');
      c.r.disc(core, 278, 174, 7.5);
      c.preColor(core, MaterialId.RoyalAstralGold);
      ids.push(core);

      // Desk topper on right half of workbench: crystal butterfly cloche (x = 376, y = 166)
      const cloche = c.dyn('star', 'Nectar Glass Cloche');
      c.r.disc(cloche, 376, 166, 12);
      c.r.rect(cloche, 364, 166, 388, 179);
      inkArc(c.r, 376, 166, 8, 8, Math.PI * 1.1, Math.PI * 1.5, 0, { only: [cloche] });
      c.preColor(cloche, MaterialId.HoloFoil);
      ids.push(cloche);

      return ids;
    },
  });
}

// ===========================================================================
// U17 C1: The Stained-Glass Conservatory Gate
// ===========================================================================
function buildU17C1(ctx: SceneCtx): void {
  const { rng } = ctx;
  initChapter(ctx, 'u17_c1', 216, 152);

  drawSkySparkles(ctx, 18, 134, 'petals');

  const orbX = Math.round(jit(rng, 396, 4));
  const orbY = Math.round(jit(rng, 52, 3));
  const orb = drawThemedOrb(ctx, orbX, orbY, 21, 'lotusSun');

  drawThemedCloud(ctx, 14, Math.round(jit(rng, 92, 4)), Math.round(jit(rng, 44, 3)), 84, 28, 'fluffy');
  drawThemedCloud(ctx, 15, Math.round(jit(rng, 266, 4)), Math.round(jit(rng, 38, 3)), 76, 26, 'fluffy');

  drawHorizonHills(ctx, { style: 'rolling', yBase: 152, yBottom: 214, layers: 2, labelPrefix: 'Sunbeam' });
  drawGroundDeck(ctx, { style: 'gardenPath', yTop: 204, yBottom: 250, labelPrefix: 'Conservatory' });

  // Stained-glass conservatory gate centerpiece + giant sunflower + fairy lantern
  const gateIds = drawGlassConservatory(ctx, 198, 168, 1.04, { label: 'Gate' });
  const flowerIds = drawGiantSunflower(ctx, 376, 170, 0.94, { label: 'Garden', flip: -1 });
  const lampIds = drawFairyLantern(ctx, 78, 174, 0.85, { label: 'Entry' });

  // Sunbeam sky stars
  chunkyStar(ctx, 'Morning Sun-Star', Math.round(jit(rng, 182, 3)), Math.round(jit(rng, 42, 3)), 11.5);
  chunkyStar(ctx, 'Atrium Gleam', Math.round(jit(rng, 324, 3)), Math.round(jit(rng, 78, 3)), 11);

  // Ghosts in clean open sky pockets
  drawGhostSilhouette(ctx, 'Sunbeam Butterfly Ghost', 'butterfly', Math.round(jit(rng, 144, 3)), Math.round(jit(rng, 92, 3)), 1.0);
  drawGhostSilhouette(ctx, 'Conservatory Moth Ghost', 'moth', Math.round(jit(rng, 302, 3)), Math.round(jit(rng, 114, 3)), 0.95);
  drawGhostSilhouette(ctx, 'Glasshouse Owl Ghost', 'owl', Math.round(jit(rng, 446, 3)), Math.round(jit(rng, 108, 3)), 0.9);

  // Paths
  ctx.ellipsePath('ring', orbX, orbY, orb.rx, orb.ry, 24, orb.tilt);
  const gallopPath = ctx.wavePath('gallop', 62, 232, 418, 228, 10, 1.5, 18);
  const orbitPath = ctx.ellipsePath('orbit', 240, 88, 174, 48, 24);
  ctx.marginPath(256);

  // Actors (well separated on foreground path / sky)
  ctx.actor('violet', 142, 240, { facing: 1, anim: 'idle' });
  ctx.actor('lumi', 298, 238, { facing: -1, anim: 'idle', pathIndex: gallopPath });
  ctx.actor('moonCat', 428, 236, { facing: -1, anim: 'sleep' });
  ctx.actor('comet', 228, 80, { facing: 1, anim: 'float', pathIndex: orbitPath });

  // 4 Disjoint Hero Quests
  ctx.heroQuest('lantern', 'Glass Gate', [...gateIds, ...lampIds]);
  ctx.heroQuest('sunflower', 'Sun Bloom', flowerIds);
  ctx.heroQuest('violet', 'Violet', [1, 2, 3, 4]);
  ctx.heroQuest('planet', 'Lotus Sun', [12, 13]);
}

// ===========================================================================
// U17 C2A: The Giant Sunflower Terrace
// ===========================================================================
function buildU17C2A(ctx: SceneCtx): void {
  const { r, rng } = ctx;
  initChapter(ctx, 'u17_c2a', 240, 152);

  drawSkySparkles(ctx, 18, 132, 'petals');

  const orbX = Math.round(jit(rng, 82, 4));
  const orbY = Math.round(jit(rng, 52, 3));
  const orb = drawThemedOrb(ctx, orbX, orbY, 21, 'lotusSun');

  drawThemedCloud(ctx, 14, Math.round(jit(rng, 224, 4)), Math.round(jit(rng, 42, 3)), 88, 28, 'fluffy');
  drawThemedCloud(ctx, 15, Math.round(jit(rng, 392, 4)), Math.round(jit(rng, 48, 3)), 84, 28, 'fluffy');

  drawHorizonHills(ctx, { style: 'rolling', yBase: 148, yBottom: 212, layers: 2, labelPrefix: 'Terrace' });

  // Bespoke stepped sunlit garden terrace balustrade wall
  const terraceWall = ctx.dyn('prop', 'Sunlit Stone Terrace');
  r.rect(terraceWall, 14, 186, 466, 212);
  for (let bx = 34; bx < 458; bx += 28) {
    r.line(INK, bx, 188, bx, 210, { only: [terraceWall] });
  }
  r.line(INK, 18, 193, 462, 193, { only: [terraceWall] });

  drawGroundDeck(ctx, { style: 'meadow', yTop: 208, yBottom: 250, labelPrefix: 'Sunflower' });

  // Three staggered towering giant sunflowers across the terrace
  const sunL = drawGiantSunflower(ctx, 102, 164, 0.92, { label: 'West' });
  const sunC = drawGiantSunflower(ctx, 240, 150, 1.08, { label: 'Crown' });
  const sunR = drawGiantSunflower(ctx, 384, 166, 0.92, { label: 'East', flip: -1 });

  // Cozy straw bee skep hive nestled on terrace
  const hive = ctx.dyn('prop', 'Golden Bee Skep');
  r.ellipse(hive, 322, 196, 16, 15);
  r.rect(hive, 306, 196, 338, 210);
  for (const hy of [190, 197, 204]) r.line(INK, 309, hy, 335, hy, { only: [hive] });

  chunkyStar(ctx, 'Sunbeam Star', Math.round(jit(rng, 154, 3)), Math.round(jit(rng, 72, 3)), 11);
  chunkyStar(ctx, 'Zenith Gleam', Math.round(jit(rng, 316, 3)), Math.round(jit(rng, 68, 3)), 11.5);

  drawGhostSilhouette(ctx, 'Terrace Butterfly Ghost', 'butterfly', Math.round(jit(rng, 166, 3)), Math.round(jit(rng, 114, 3)), 0.95);
  drawGhostSilhouette(ctx, 'Nectar Moth Ghost', 'moth', Math.round(jit(rng, 444, 3)), Math.round(jit(rng, 106, 3)), 0.95);

  ctx.ellipsePath('ring', orbX, orbY, orb.rx, orb.ry, 24, orb.tilt);
  const sprintPath = ctx.wavePath('sprint', 52, 232, 428, 228, 10, 2, 18);
  const orbitPath = ctx.ellipsePath('orbit', 240, 84, 170, 44, 24);
  ctx.marginPath(256);

  ctx.actor('violet', 168, 242, { facing: 1, anim: 'idle' });
  ctx.actor('nova', 284, 240, { facing: 1, anim: 'leap', pathIndex: sprintPath });
  ctx.actor('gazelle', 416, 238, { facing: -1, anim: 'idle', pathIndex: sprintPath });
  ctx.actor('comet', 318, 106, { facing: -1, anim: 'float', pathIndex: orbitPath });

  ctx.heroQuest('sunflower', 'Crown Bloom', sunC);
  ctx.heroQuest('suns', 'Twin Blooms', [...sunL, ...sunR]);
  ctx.heroQuest('nova', 'Nova', [9, 10, 11]);
  ctx.heroQuest('cloud', 'Sun Clouds', [14, 15]);
}

// ===========================================================================
// U17 C2B: The Honeycomb Nectar Arches
// ===========================================================================
function buildU17C2B(ctx: SceneCtx): void {
  const { r, rng } = ctx;
  initChapter(ctx, 'u17_c2b', 240, 154);

  drawSkySparkles(ctx, 18, 134, 'petals');

  const orbX = Math.round(jit(rng, 396, 4));
  const orbY = Math.round(jit(rng, 52, 3));
  const orb = drawThemedOrb(ctx, orbX, orbY, 21, 'lotusSun');

  drawThemedCloud(ctx, 14, Math.round(jit(rng, 92, 4)), Math.round(jit(rng, 44, 3)), 86, 28, 'cottonCandy');
  drawThemedCloud(ctx, 15, Math.round(jit(rng, 254, 4)), Math.round(jit(rng, 40, 3)), 80, 26, 'cottonCandy');

  drawHorizonHills(ctx, { style: 'rolling', yBase: 152, yBottom: 214, layers: 2, labelPrefix: 'Nectar' });
  drawGroundDeck(ctx, { style: 'gardenPath', yTop: 204, yBottom: 250, labelPrefix: 'Honey' });

  // Twin golden honeycomb arches framing a central hexagonal nectar fountain basin
  const archL = drawHoneycombArch(ctx, 118, 174, 0.96, { label: 'West' });
  const archR = drawHoneycombArch(ctx, 362, 174, 0.96, { label: 'East', flip: -1 });

  const basin = ctx.dyn('prop', 'Hexagon Nectar Basin');
  r.poly(basin, [[204, 194], [276, 194], [268, 218], [212, 218]]);
  r.line(INK, 210, 206, 270, 206, { only: [basin] });

  const nectarPool = ctx.dyn('milkshake', 'Golden Nectar Fountain');
  r.ellipse(nectarPool, 240, 192, 32, 9);
  r.capsule(nectarPool, 240, 188, 240, 160, 5.5);
  r.disc(nectarPool, 240, 156, 11);
  inkArc(r, 240, 156, 6, 6, Math.PI * 1.1, Math.PI * 1.8, 0, { only: [nectarPool] });

  // Two chunky golden honeycombs floating as garden lamps
  const hexLampL = ctx.dyn('star', 'West Nectar Hex');
  star(ctx, hexLampL, 188, 120, 12, { points: 6, inner: 0.85 });
  const hexLampR = ctx.dyn('star', 'East Nectar Hex');
  star(ctx, hexLampR, 292, 120, 12, { points: 6, inner: 0.85 });

  drawGhostSilhouette(ctx, 'Honey Butterfly Ghost', 'butterfly', Math.round(jit(rng, 240, 3)), Math.round(jit(rng, 92, 3)), 1.0);
  drawGhostSilhouette(ctx, 'Nectar Fox Ghost', 'fox', Math.round(jit(rng, 44, 3)), Math.round(jit(rng, 96, 3)), 0.95);
  drawGhostSilhouette(ctx, 'Sunbeam Owl Ghost', 'owl', Math.round(jit(rng, 444, 3)), Math.round(jit(rng, 108, 3)), 0.9);

  ctx.ellipsePath('ring', orbX, orbY, orb.rx, orb.ry, 24, orb.tilt);
  const gallopPath = ctx.wavePath('gallop', 60, 232, 420, 230, 10, 1.5, 18);
  const orbitPath = ctx.ellipsePath('orbit', 240, 88, 170, 44, 24);
  ctx.marginPath(256);

  ctx.actor('violet', 164, 242, { facing: 1, anim: 'idle' });
  ctx.actor('lumi', 316, 242, { facing: -1, anim: 'rear', pathIndex: gallopPath });
  ctx.actor('moonCat', 56, 236, { facing: 1, anim: 'peek' });
  ctx.actor('comet', 330, 88, { facing: -1, anim: 'float', pathIndex: orbitPath });

  ctx.heroQuest('sunflower', 'Honey Arches', [...archL, ...archR]);
  ctx.heroQuest('lantern', 'Nectar Pool', [basin, nectarPool, hexLampL, hexLampR]);
  ctx.heroQuest('lumi', 'Lumi', [5, 6, 7, 8]);
  ctx.heroQuest('planet', 'Lotus Sun', [12, 13]);
}

// ===========================================================================
// U17 C3A: The Prism-Wing Butterfly Atrium
// ===========================================================================
function buildU17C3A(ctx: SceneCtx): void {
  const { r, rng } = ctx;
  initChapter(ctx, 'u17_c3a', 240, 146);

  drawSkySparkles(ctx, 20, 134, 'petals');

  const orbX = Math.round(jit(rng, 78, 4));
  const orbY = Math.round(jit(rng, 52, 3));
  const orb = drawThemedOrb(ctx, orbX, orbY, 21, 'bubbleOrb');

  drawThemedCloud(ctx, 14, Math.round(jit(rng, 240, 4)), Math.round(jit(rng, 38, 3)), 88, 28, 'fluffy');
  drawThemedCloud(ctx, 15, Math.round(jit(rng, 404, 4)), Math.round(jit(rng, 48, 3)), 82, 26, 'fluffy');

  drawHorizonHills(ctx, { style: 'clouds', yBase: 152, yBottom: 214, layers: 2, labelPrefix: 'Atrium' });
  drawGroundDeck(ctx, { style: 'courtyard', yTop: 206, yBottom: 250, labelPrefix: 'Atrium' });

  // Flanking conservatory dome & honeycomb arch
  const domeIds = drawGlassConservatory(ctx, 102, 174, 0.88, { label: 'Atrium' });
  const archIds = drawHoneycombArch(ctx, 384, 176, 0.88, { label: 'Atrium' });

  // Central grand sculpted Prism-Wing Butterfly Fountain!
  const fBase = ctx.dyn('prop', 'Atrium Fountain Basin');
  r.ellipse(fBase, 240, 202, 44, 13);
  r.rect(fBase, 224, 174, 256, 202);
  inkArc(r, 240, 202, 34, 8, 0, Math.PI * 2, 0, { only: [fBase] });

  const bflyIds = drawButterflySculpture(ctx, 240, 144, 1.35, 'Prism Butterfly');

  // Floating glass prism droplets around atrium
  pearl(ctx, ctx.dyn('star', 'Atrium Prism Drop A'), 176, 108, 9);
  pearl(ctx, ctx.dyn('star', 'Atrium Prism Drop B'), 304, 108, 9);

  drawGhostSilhouette(ctx, 'Prism Butterfly Ghost', 'butterfly', Math.round(jit(rng, 166, 3)), Math.round(jit(rng, 68, 3)), 0.95);
  drawGhostSilhouette(ctx, 'Atrium Moth Ghost', 'moth', Math.round(jit(rng, 326, 3)), Math.round(jit(rng, 72, 3)), 0.95);
  drawGhostSilhouette(ctx, 'Glass Owl Ghost', 'owl', Math.round(jit(rng, 446, 3)), Math.round(jit(rng, 114, 3)), 0.9);

  ctx.ellipsePath('ring', orbX, orbY, orb.rx, orb.ry, 24, orb.tilt);
  const gallopPath = ctx.wavePath('gallop', 60, 232, 420, 232, 10, 1.5, 18);
  const sprintPath = ctx.wavePath('sprint', 70, 226, 410, 226, 8, 2, 18);
  const orbitPath = ctx.ellipsePath('orbit', 240, 92, 172, 48, 24);
  ctx.marginPath(256);

  ctx.actor('lumi', 132, 242, { facing: 1, anim: 'idle', pathIndex: gallopPath });
  ctx.actor('violet', 240, 244, { facing: 1, anim: 'idle' });
  ctx.actor('nova', 352, 242, { facing: -1, anim: 'leap', pathIndex: sprintPath });
  ctx.actor('comet', 316, 46, { facing: -1, anim: 'float', pathIndex: orbitPath });

  ctx.heroQuest('heart', 'Prism Butterfly', [fBase, ...bflyIds]);
  ctx.heroQuest('lantern', 'Glass Atrium', [...domeIds, ...archIds]);
  ctx.heroQuest('violet', 'Violet', [1, 2, 3, 4]);
  ctx.heroQuest('lumi', 'Lumi', [5, 6, 7, 8]);
}

// ===========================================================================
// U17 C3B: The Hanging Orchid Sky-Walk
// ===========================================================================
function buildU17C3B(ctx: SceneCtx): void {
  const { r, rng } = ctx;
  initChapter(ctx, 'u17_c3b', 240, 146);

  drawSkySparkles(ctx, 18, 132, 'petals');

  const orbX = Math.round(jit(rng, 400, 4));
  const orbY = Math.round(jit(rng, 52, 3));
  const orb = drawThemedOrb(ctx, orbX, orbY, 21, 'lotusSun');

  drawThemedCloud(ctx, 14, Math.round(jit(rng, 88, 4)), Math.round(jit(rng, 44, 3)), 84, 28, 'sakura');
  drawThemedCloud(ctx, 15, Math.round(jit(rng, 242, 4)), Math.round(jit(rng, 38, 3)), 82, 26, 'sakura');

  drawHorizonHills(ctx, { style: 'rolling', yBase: 158, yBottom: 214, layers: 2, labelPrefix: 'Canopy' });

  // Bespoke wrought-iron conservatory sky-walk arch spanning across the center!
  const skyArch = ctx.dyn('prop', 'Orchid Sky-Walk Arch');
  r.shape(skyArch, 48, 86, 432, 184, (px, py) => {
    const u = (px - 240) / 186;
    if (Math.abs(u) > 1) return false;
    const archY = 104 + u * u * 54;
    return py >= archY - 8 && py <= archY + 8;
  });
  for (let bx = 80; bx <= 400; bx += 32) {
    const u = (bx - 240) / 186;
    const ay = 104 + u * u * 54;
    r.line(INK, bx, ay - 6, bx, ay + 6, { only: [skyArch] });
  }

  // Three lush suspended orchid planters hanging along the sky-walk
  const orchL = drawHangingOrchid(ctx, 146, 144, 0.92, 'West');
  const orchC = drawHangingOrchid(ctx, 240, 132, 1.0, 'Center');
  const orchR = drawHangingOrchid(ctx, 334, 144, 0.92, 'East');

  drawGroundDeck(ctx, { style: 'pier', yTop: 204, yBottom: 250, labelPrefix: 'Sky-Walk' });

  // Fairy lantern posts anchoring both ends of the sky-walk
  const lampL = drawFairyLantern(ctx, 64, 174, 0.88, { label: 'West' });
  const lampR = drawFairyLantern(ctx, 416, 174, 0.88, { label: 'East', flip: -1 });

  drawGhostSilhouette(ctx, 'Orchid Butterfly Ghost', 'butterfly', Math.round(jit(rng, 166, 3)), Math.round(jit(rng, 68, 3)), 0.95);
  drawGhostSilhouette(ctx, 'Sky-Walk Crane Ghost', 'crane', Math.round(jit(rng, 326, 3)), Math.round(jit(rng, 70, 3)), 0.95);

  ctx.ellipsePath('ring', orbX, orbY, orb.rx, orb.ry, 24, orb.tilt);
  const sprintPath = ctx.wavePath('sprint', 60, 232, 420, 230, 10, 1.5, 18);
  const orbitPath = ctx.ellipsePath('orbit', 240, 86, 168, 42, 24);
  ctx.marginPath(256);

  ctx.actor('violet', 176, 240, { facing: 1, anim: 'idle' });
  ctx.actor('nova', 304, 238, { facing: -1, anim: 'leap', pathIndex: sprintPath });
  ctx.actor('moonCat', 428, 236, { facing: -1, anim: 'sleep' });
  ctx.actor('comet', 240, 82, { facing: 1, anim: 'float', pathIndex: orbitPath });

  ctx.heroQuest('sunflower', 'Orchid Bridge', [skyArch, ...orchL, ...orchC, ...orchR]);
  ctx.heroQuest('lantern', 'Fairy Lamps', [...lampL, ...lampR]);
  ctx.heroQuest('nova', 'Nova', [9, 10, 11]);
  ctx.heroQuest('cloud', 'Petal Clouds', [14, 15]);
}

// ===========================================================================
// U17 C4A: The Crystal Terrarium Spiral
// ===========================================================================
function buildU17C4A(ctx: SceneCtx): void {
  const { r, rng } = ctx;
  initChapter(ctx, 'u17_c4a', 240, 150);

  drawSkySparkles(ctx, 18, 134, 'petals');

  const orbX = Math.round(jit(rng, 82, 4));
  const orbY = Math.round(jit(rng, 52, 3));
  const orb = drawThemedOrb(ctx, orbX, orbY, 21, 'bubbleOrb');

  drawThemedCloud(ctx, 14, Math.round(jit(rng, 224, 4)), Math.round(jit(rng, 42, 3)), 86, 28, 'fluffy');
  drawThemedCloud(ctx, 15, Math.round(jit(rng, 396, 4)), Math.round(jit(rng, 46, 3)), 82, 26, 'fluffy');

  drawHorizonHills(ctx, { style: 'rolling', yBase: 150, yBottom: 214, layers: 2, labelPrefix: 'Moss' });

  // Bespoke curved wrought-iron conservatory spiral balcony ribbon behind centerpiece
  const spiralRail = ctx.dyn('prop', 'Spiral Balcony Rail');
  r.shape(spiralRail, 40, 132, 440, 210, (px, py) => {
    const t = (px - 40) / 400;
    const cy = 184 - Math.sin(t * Math.PI) * 32;
    return py >= cy - 7 && py <= cy + 7;
  });
  for (let rx = 64; rx <= 416; rx += 24) {
    const t = (rx - 40) / 400;
    const cy = 184 - Math.sin(t * Math.PI) * 32;
    r.line(INK, rx, cy - 5, rx, cy + 5, { only: [spiralRail] });
  }

  drawGroundDeck(ctx, { style: 'courtyard', yTop: 206, yBottom: 250, labelPrefix: 'Terrarium' });

  // Hero giant botanical crystal terrarium centerpiece + sunflower left + glasshouse wing right
  const terrariumIds = drawSnowglobe(ctx, 240, 168, 1.05, { label: 'Terrarium' });
  const sunIds = drawGiantSunflower(ctx, 94, 170, 0.9, { label: 'Balcony' });
  const glassIds = drawGlassConservatory(ctx, 386, 174, 0.88, { label: 'Spiral' });

  chunkyStar(ctx, 'Glasshouse Star A', Math.round(jit(rng, 162, 3)), Math.round(jit(rng, 92, 3)), 11);
  chunkyStar(ctx, 'Glasshouse Star B', Math.round(jit(rng, 326, 3)), Math.round(jit(rng, 92, 3)), 11);

  drawGhostSilhouette(ctx, 'Terrarium Moth Ghost', 'moth', Math.round(jit(rng, 162, 3)), Math.round(jit(rng, 52, 3)), 0.92);
  drawGhostSilhouette(ctx, 'Spiral Butterfly Ghost', 'butterfly', Math.round(jit(rng, 322, 3)), Math.round(jit(rng, 56, 3)), 0.95);

  ctx.ellipsePath('ring', orbX, orbY, orb.rx, orb.ry, 24, orb.tilt);
  const gallopPath = ctx.wavePath('gallop', 60, 232, 420, 232, 10, 1.5, 18);
  const orbitPath = ctx.ellipsePath('orbit', 240, 92, 170, 48, 24);
  ctx.marginPath(256);

  ctx.actor('violet', 166, 242, { facing: 1, anim: 'idle' });
  ctx.actor('lumi', 316, 242, { facing: -1, anim: 'rear', pathIndex: gallopPath });
  ctx.actor('moonCat', 56, 236, { facing: 1, anim: 'sleep' });
  ctx.actor('comet', 298, 118, { facing: 1, anim: 'float', pathIndex: orbitPath });

  ctx.heroQuest('sunflower', 'Terrarium Dome', [...terrariumIds, spiralRail]);
  ctx.heroQuest('lantern', 'Spiral Wing', [...glassIds, ...sunIds]);
  ctx.heroQuest('lumi', 'Lumi', [5, 6, 7, 8]);
  ctx.heroQuest('planet', 'Dew Orb', [12, 13]);
}

// ===========================================================================
// U17 C4B: The Rainbow Prism-Dew Pond
// ===========================================================================
function buildU17C4B(ctx: SceneCtx): void {
  const { r, rng } = ctx;
  initChapter(ctx, 'u17_c4b', 240, 152);

  drawSkySparkles(ctx, 18, 134, 'bubbles');

  const orbX = Math.round(jit(rng, 394, 4));
  const orbY = Math.round(jit(rng, 52, 3));
  const orb = drawThemedOrb(ctx, orbX, orbY, 21, 'lotusSun');

  drawThemedCloud(ctx, 14, Math.round(jit(rng, 92, 4)), Math.round(jit(rng, 44, 3)), 86, 28, 'fluffy');
  drawThemedCloud(ctx, 15, Math.round(jit(rng, 246, 4)), Math.round(jit(rng, 38, 3)), 80, 26, 'fluffy');

  drawHorizonHills(ctx, { style: 'rolling', yBase: 146, yBottom: 196, layers: 2, labelPrefix: 'Pond' });

  // Shimmering layered Prism-Dew Pond water ribbons (cleanly stopping at y=250)
  const waterBack = ctx.dyn('prop', 'Sunlit Dew Pond');
  r.rect(waterBack, 0, 188, W, 220);
  for (let wx = 26; wx < W - 20; wx += 48) {
    inkArc(r, wx, 202, 14, 4, 0.1, Math.PI - 0.1, 0, { only: [waterBack] });
  }
  const waterFront = ctx.dyn('prop', 'Prism Ripple Water');
  r.rect(waterFront, 0, 220, W, 250);
  for (let wx = 44; wx < W - 20; wx += 54) {
    inkArc(r, wx, 234, 16, 4.5, 0.1, Math.PI - 0.1, 0, { only: [waterFront] });
  }

  // Bank landmarks: giant sunflower left, honeycomb arch right
  const sunIds = drawGiantSunflower(ctx, 84, 164, 0.92, { label: 'Pond' });
  const archIds = drawHoneycombArch(ctx, 392, 166, 0.9, { label: 'Pond' });

  // Giant floating lotus-dew lily pads across the pond
  const lilyL = drawLilyPadBloom(ctx, 174, 214, 0.92, 'West Dew');
  const lilyC = drawLilyPadBloom(ctx, 252, 228, 1.0, 'Prism Dew');
  const lilyR = drawLilyPadBloom(ctx, 330, 212, 0.9, 'East Dew');

  // Floating glass prism bubbles
  pearl(ctx, ctx.dyn('star', 'Prism Dewdrop A'), 182, 102, 9);
  pearl(ctx, ctx.dyn('star', 'Prism Dewdrop B'), 312, 106, 9);

  drawGhostSilhouette(ctx, 'Dew Butterfly Ghost', 'butterfly', Math.round(jit(rng, 166, 3)), Math.round(jit(rng, 68, 3)), 0.95);
  drawGhostSilhouette(ctx, 'Pond Koi Ghost', 'koi', Math.round(jit(rng, 322, 3)), Math.round(jit(rng, 68, 3)), 0.95);
  drawGhostSilhouette(ctx, 'Sunbeam Moth Ghost', 'moth', Math.round(jit(rng, 444, 3)), Math.round(jit(rng, 112, 3)), 0.9);

  ctx.ellipsePath('ring', orbX, orbY, orb.rx, orb.ry, 24, orb.tilt);
  const swimPath = ctx.wavePath('swim', 54, 134, 426, 134, 18, 1.5, 20);
  const orbitPath = ctx.ellipsePath('orbit', 240, 88, 172, 44, 24);
  ctx.marginPath(256);

  ctx.actor('whale', 240, 146, { facing: 1, anim: 'swim', pathIndex: swimPath });
  ctx.actor('violet', 120, 240, { facing: 1, anim: 'idle' });
  ctx.actor('moonCat', 428, 236, { facing: -1, anim: 'peek' });
  ctx.actor('comet', 310, 140, { facing: -1, anim: 'float', pathIndex: orbitPath });

  ctx.heroQuest('lotus', 'Dew Lilies', [...lilyL, ...lilyC, ...lilyR]);
  ctx.heroQuest('sunflower', 'Pond Blooms', [...sunIds, ...archIds]);
  ctx.heroQuest('whale', 'Sky Whale', [19, 29]);
  ctx.heroQuest('planet', 'Lotus Sun', [12, 13]);
}

// ===========================================================================
// U17 C5 (GRAND FINALE, 50..70 regions): The Crown of the Sunbeam Dome
// ===========================================================================
function buildU17C5(ctx: SceneCtx): void {
  const { r, rng } = ctx;
  initChapter(ctx, 'u17_c5', 240, 114);

  const cx = 240;
  const cy = 112;
  const twist = rng.range(-0.03, 0.03);

  drawSkySparkles(ctx, 20, 128, 'petals');

  // 1) Twin flanking Glasshouse Pavilion Wings + Sunlit Terrace (6 regions)
  const terrace = ctx.dyn('prop', 'Sunbeam Cupola Terrace');
  r.poly(terrace, [[46, 224], [434, 224], [452, 248], [28, 248]]);
  r.line(INK, 54, 236, 426, 236, { only: [terrace] });

  const wingL = ctx.dyn('prop', 'West Glass Wing');
  r.disc(wingL, 54, 166, 28);
  r.rect(wingL, 26, 166, 82, 212);
  drawInkRay(r, 54, 140, 54, 208, wingL);
  drawInkRay(r, 28, 168, 80, 168, wingL);

  const wingR = ctx.dyn('prop', 'East Glass Wing');
  r.disc(wingR, 426, 166, 28);
  r.rect(wingR, 398, 166, 454, 212);
  drawInkRay(r, 426, 140, 426, 208, wingR);
  drawInkRay(r, 400, 168, 452, 168, wingR);

  // Sweeping upper stained-glass dome ribs framing the cupola (2 regions)
  for (const side of [-1, 1] as const) {
    const label = side < 0 ? 'West' : 'East';
    const rib = ctx.dyn('prop', `${label} Cupola Rib`);
    r.poly(rib, [
      [cx + side * 84, cy - 58],
      [cx + side * 144, cy - 68],
      [cx + side * 188, cy - 34],
      [cx + side * 172, cy - 16],
      [cx + side * 136, cy - 48],
      [cx + side * 80, cy - 42],
    ]);
    r.line(INK, cx + side * 88, cy - 50, cx + side * 176, cy - 28, { only: [rib] });
  }

  // 2) Panoramic Botanical Rose-Window Cupola Mandala (12 + 8 + 8 + 1 = 29 regions)
  const sx = 1.1;
  const sy = 0.94;
  // Outer ring: 12 stained-glass sunbeam petals
  const outerIds: number[] = [];
  for (let i = 0; i < 12; i++) {
    const a = -Math.PI / 2 + (i * Math.PI * 2) / 12 + twist;
    const pid = ctx.dyn('flora', `Sunbeam Petal ${i + 1}`);
    outerIds.push(pid);
    r.poly(pid, petalPoly(cx, cy, a, 52, 86, 0.25, sx, sy));
    const pA = pol(cx, cy, 58, a, sx, sy);
    const pB = pol(cx, cy, 78, a, sx, sy);
    drawInkRay(r, pA[0], pA[1], pB[0], pB[1], pid);
  }

  // Middle ring: 8 golden honeycomb diamond panes
  for (let i = 0; i < 8; i++) {
    const a = -Math.PI / 2 + ((i + 0.5) * Math.PI * 2) / 8 + twist;
    const wid = ctx.dyn('star', `Honeycomb Pane ${i + 1}`);
    r.poly(wid, [
      pol(cx, cy, 32, a, sx, sy),
      pol(cx, cy, 48, a - 0.34, sx, sy),
      pol(cx, cy, 65, a, sx, sy),
      pol(cx, cy, 48, a + 0.34, sx, sy),
    ]);
    const pA = pol(cx, cy, 36, a, sx, sy);
    const pB = pol(cx, cy, 60, a, sx, sy);
    drawInkRay(r, pA[0], pA[1], pB[0], pB[1], wid);
  }

  // Inner ring: 8 glowing sunflower crown petals
  const innerIds: number[] = [];
  for (let i = 0; i < 8; i++) {
    const a = -Math.PI / 2 + (i * Math.PI * 2) / 8 + twist;
    const iid = ctx.dyn('flora', `Sun Crown Petal ${i + 1}`);
    innerIds.push(iid);
    r.poly(iid, petalPoly(cx, cy, a, 15, 42, 0.35, sx, sy));
    const pA = pol(cx, cy, 22, a, sx, sy);
    const pB = pol(cx, cy, 36, a, sx, sy);
    drawInkRay(r, pA[0], pA[1], pB[0], pB[1], iid);
  }

  // Radiant Sunbeam Heart Core
  const coreId = ctx.dyn('star', 'Sunbeam Dome Heart');
  heart(ctx, coreId, cx, cy + 2, 15.5);
  inkArc(r, cx - 5, cy - 3, 4.5, 3.8, Math.PI * 1.05, Math.PI * 1.72, -0.2, { only: [coreId] });

  // 3) Side celestial accents + Required canonical Orb 12/13 & Clouds 14/15
  const orbX = 72;
  const orbY = 82 + Math.round(jit(rng, 0, 2));
  const orb = drawThemedOrb(ctx, orbX, orbY, 16, 'lotusSun');

  // Mirrored eastern stained-glass butterfly medallion (2 regions)
  drawButterflySculpture(ctx, 408, 86, 0.85, 'East Sun');

  // Four corner framing botanical stars (4 regions)
  chunkyStar(ctx, 'North-West Sun Star', 34, 30, 11);
  chunkyStar(ctx, 'North-East Sun Star', 446, 30, 11);
  chunkyStar(ctx, 'West Nectar Star', 124, 152, 11);
  chunkyStar(ctx, 'East Nectar Star', 356, 152, 11);

  // Twin canonical clouds (14/15) cradling the lower flanks
  drawThemedCloud(ctx, 14, 62, 226, 94, 32, 'fluffy');
  drawThemedCloud(ctx, 15, 418, 226, 94, 32, 'fluffy');

  // 3 Ghosts in clean open upper sky pockets
  drawGhostSilhouette(ctx, 'Crown Butterfly Ghost', 'butterfly', 152, 22, 0.92);
  drawGhostSilhouette(ctx, 'Crown Moth Ghost', 'moth', 328, 22, 0.92);
  drawGhostSilhouette(ctx, 'Cupola Owl Ghost', 'owl', 240, 18, 0.85);

  // Paths & Actors (Violet 4 + Lumi 4 + Nova 3 + MoonCat 1 + Comet 2 = 14 actor regions -> total ~60!)
  const gallopPath = ctx.wavePath('gallop', 66, 240, 414, 240, 8, 2, 20);
  const sprintPath = ctx.wavePath('sprint', 90, 236, 390, 236, 9, 2, 20);
  const orbitPath = ctx.ellipsePath('orbit', cx, cy, 182, 82, 28);
  ctx.ellipsePath('ring', orbX, orbY, orb.rx, orb.ry, 24, orb.tilt);
  ctx.marginPath(256);

  ctx.actor('lumi', 148, 246, { facing: 1, anim: 'rear', pathIndex: gallopPath });
  ctx.actor('violet', 240, 248, { facing: 1, anim: 'idle' });
  ctx.actor('nova', 332, 246, { facing: -1, anim: 'leap', pathIndex: sprintPath });
  ctx.actor('moonCat', 24, 200, { facing: 1, anim: 'peek' });
  ctx.actor('comet', 444, 132, { facing: -1, anim: 'float', pathIndex: orbitPath });

  // 4 Disjoint Hero Quests
  ctx.heroQuest('sunflower', 'Sunbeam Crown', [coreId, ...innerIds]);
  ctx.heroQuest('violet', 'Violet', [1, 2, 3, 4]);
  ctx.heroQuest('lumi', 'Lumi', [5, 6, 7, 8]);
  ctx.heroQuest('nova', 'Nova', [9, 10, 11]);
  void outerIds;
}

// Keep unused import check clean
void rot;

export const U17_SCENES: Record<U17SceneId, (ctx: SceneCtx) => void> = {
  hub_sunflowerGlasshouse: buildHubSunflowerGlasshouse,
  u17_c1: buildU17C1,
  u17_c2a: buildU17C2A,
  u17_c2b: buildU17C2B,
  u17_c3a: buildU17C3A,
  u17_c3b: buildU17C3B,
  u17_c4a: buildU17C4A,
  u17_c4b: buildU17C4B,
  u17_c5: buildU17C5,
};
