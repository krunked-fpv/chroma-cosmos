/**
 * Universe 21: Grand Multiverse Nexus (`prismNexusMultiverse`)
 * THE GRAND CULMINATION OF CHROMA COSMOS!
 * 9 bespoke deterministic procedural scenes: 1 Prism Crown Sanctuary + 8 Multiverse Chapters,
 * weaving together iconic realms across all 21 universes and culminating in the Infinite Prism Crown Finale!
 */
import { MaterialId } from '../../contracts/materials';
import { UNIVERSE_BY_ID } from '../../contracts/universes';
import type { SceneCtx } from '../context';
import {
  drawArcadeCabinet,
  drawBookCastle,
  drawBrassAirship,
  drawCircusBigTop,
  drawClockworkGear,
  drawCoralArch,
  drawFerrisWheel,
  drawGeodeCathedral,
  drawGhostSilhouette,
  drawGrandPiano,
  drawGroundDeck,
  drawHarpWaterfall,
  drawHorizonHills,
  drawIcePalace,
  drawLotusBarge,
  drawMacaronTower,
  drawOrigamiCrane,
  drawPortalArch,
  drawPrismCrown,
  drawPyramidTemple,
  drawSakuraTree,
  drawSanctuaryRoom,
  drawSkySparkles,
  drawSleepingDragon,
  drawSnowglobe,
  drawThemedCloud,
  drawThemedOrb,
} from '../kit';
import { heart, inkArc, jit, star } from '../props';
import { INK, type Pt, type Raster } from '../raster';

const U = UNIVERSE_BY_ID.prismNexusMultiverse;

export type U21SceneId =
  | 'hub_prismNexusMultiverse'
  | 'u21_c1'
  | 'u21_c2a'
  | 'u21_c2b'
  | 'u21_c3a'
  | 'u21_c3b'
  | 'u21_c4a'
  | 'u21_c4b'
  | 'u21_c5';

function initChapter(ctx: SceneCtx, id: Exclude<U21SceneId, 'hub_prismNexusMultiverse'>, fx: number, fy: number): void {
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

function cubicBezier(p0: Pt, p1: Pt, p2: Pt, p3: Pt, n: number): Pt[] {
  const pts: Pt[] = [];
  for (let i = 0; i <= n; i++) {
    const t = i / n;
    const u = 1 - t;
    const uu = u * u;
    const tt = t * t;
    pts.push([
      uu * u * p0[0] + 3 * uu * t * p1[0] + 3 * u * tt * p2[0] + tt * t * p3[0],
      uu * u * p0[1] + 3 * uu * t * p1[1] + 3 * u * tt * p2[1] + tt * t * p3[1],
    ]);
  }
  return pts;
}

/** Smooth sweeping kaleidoscopic aurora ribbon with ink center vein. */
function drawKaleidoRibbon(r: Raster, id: number, spine: readonly Pt[], widthFn: (t: number) => number): void {
  const top: Pt[] = [];
  const bot: Pt[] = [];
  const n = spine.length;
  for (let i = 0; i < n; i++) {
    const p = spine[i]!;
    const prev = spine[Math.max(0, i - 1)]!;
    const next = spine[Math.min(n - 1, i + 1)]!;
    const tx = next[0] - prev[0];
    const ty = next[1] - prev[1];
    const len = Math.hypot(tx, ty) || 1;
    const nx = -ty / len;
    const ny = tx / len;
    const w = widthFn(i / (n - 1));
    top.push([p[0] + nx * w, p[1] + ny * w]);
    bot.push([p[0] - nx * w, p[1] - ny * w]);
  }
  bot.reverse();
  r.poly(id, [...top, ...bot]);
  r.strokePath(INK, spine.slice(1, Math.max(2, n - 1)), { only: [id] });
}

/** Faceted cathedral prism petal polygon in polar coordinates. */
function prismPetal(cx: number, cy: number, aMid: number, r0: number, r1: number, halfA: number, sx = 1, sy = 1): Pt[] {
  return [
    pol(cx, cy, r0, aMid, sx, sy),
    pol(cx, cy, r0 + (r1 - r0) * 0.42, aMid - halfA, sx, sy),
    pol(cx, cy, r0 + (r1 - r0) * 0.78, aMid - halfA * 0.62, sx, sy),
    pol(cx, cy, r1, aMid, sx, sy),
    pol(cx, cy, r0 + (r1 - r0) * 0.78, aMid + halfA * 0.62, sx, sy),
    pol(cx, cy, r0 + (r1 - r0) * 0.42, aMid + halfA, sx, sy),
  ];
}

function nexusStar(ctx: SceneCtx, label: string, x: number, y: number, rad = 11.5, points = 4): number {
  const id = ctx.dyn('star', label);
  star(ctx, id, x, y, rad, { points, inner: 0.46, rot: -Math.PI / 2 });
  return id;
}

// ===========================================================================
// HUB SANCTUARY: Violet's Prism Crown Observatory
// ===========================================================================
function buildHubPrismNexusMultiverse(ctx: SceneCtx): void {
  ctx.universeId = U.id;
  ctx.ambient = U.ambient;

  drawSanctuaryRoom(ctx, {
    title: U.hubTitle,
    sky: { ...U.sky },
    palette: {
      wallPanel: MaterialId.VelvetNebula,
      floor: MaterialId.RoyalAstralGold,
      windowFrame: MaterialId.HoloFoil,
      windowGlass: MaterialId.DeepSpaceBiolum,
      curtain: MaterialId.CosmicCottonSwirl,
      orbCore: MaterialId.HoloFoil,
      orbRing: MaterialId.RainbowPrismWax,
      rugOuter: MaterialId.SupernovaGlitter,
      rugInner: MaterialId.HoloFoil,
      furniture: MaterialId.RoyalAstralGold,
      furnitureTrim: MaterialId.HoloFoil,
      accentA: MaterialId.RainbowPrismWax,
      accentB: MaterialId.DragonflyIridescence,
      accentC: MaterialId.StrawberrySupernova,
    },
    windowShape: 'octagonal',
    windowOrbStyle: 'geode',
    wallStyle: 'crystal',
    floorStyle: 'tile',
    rugShape: 'star',
    lampStyle: 'crystal',
    garlandStyle: 'stars',
    sparkleStyle: 'stars',
    seatingLabel: 'Prism Observatory Sofa',
    workbenchLabel: 'Multiverse Atlas Desk',
    shelfLabel: 'Twenty-One Realms Shelf',
    trinketLabels: ['Realm Compendiums', 'Prism Relics', 'Starlight Keys'],
    drawWindowView: (c, wx, _wy, _wh, wBot) => {
      // Shimmering miniature twin prism portals along the distant Nexus horizon
      const horizon = c.dyn('star', 'Multiverse Horizon');
      c.r.poly(horizon, [
        [wx - 34, wBot - 2],
        [wx - 22, wBot - 22],
        [wx, wBot - 14],
        [wx + 22, wBot - 24],
        [wx + 34, wBot - 2],
      ]);
      inkArc(c.r, wx, wBot - 10, 16, 6, Math.PI, Math.PI * 2, 0, { only: [horizon] });
      c.preColor(horizon, MaterialId.RainbowPrismWax);
    },
    drawExtraProps: (c) => {
      const ids: number[] = [];
      // Left wall: illuminated 21-Star Multiverse Atlas Mirror (x = 76, y = 94)
      const frame = c.dyn('prop', 'Multiverse Atlas Frame');
      c.r.ellipse(frame, 76, 94, 36, 26);
      c.preColor(frame, MaterialId.RoyalAstralGold);
      ids.push(frame);

      const mapGlass = c.dyn('star', '21-Realm Star Map');
      c.r.ellipse(mapGlass, 76, 94, 28, 19);
      inkArc(c.r, 76, 94, 18, 12, 0, Math.PI * 2, 0, { only: [mapGlass] });
      c.r.line(INK, 54, 94, 98, 94, { only: [mapGlass] });
      c.r.line(INK, 76, 78, 76, 110, { only: [mapGlass] });
      c.preColor(mapGlass, MaterialId.HoloFoil);
      ids.push(mapGlass);

      // Right-center floor: spinning Prism Crown Orrery on crystal pedestal (x = 278, y = 186)
      const ped = c.dyn('prop', 'Prism Orrery Stand');
      c.r.poly(ped, [[268, 194], [288, 194], [292, 224], [264, 224]]);
      c.r.line(INK, 270, 208, 286, 208, { only: [ped] });
      c.preColor(ped, MaterialId.RoyalAstralGold);
      ids.push(ped);

      const orrery = c.dyn('star', 'Mini Prism Crown');
      c.r.poly(orrery, [
        [264, 192], [262, 174], [271, 182], [278, 164], [285, 182], [294, 174], [292, 192],
      ]);
      c.r.line(INK, 278, 168, 278, 190, { only: [orrery] });
      c.preColor(orrery, MaterialId.RainbowPrismWax);
      ids.push(orrery);

      // Right desk topper: glowing faceted Multiverse Prism Crystal (x = 376, y = 166)
      const prism = c.dyn('star', 'Desk Multiverse Prism');
      c.r.poly(prism, [[376, 152], [390, 178], [362, 178]]);
      c.r.line(INK, 376, 155, 376, 176, { only: [prism] });
      c.preColor(prism, MaterialId.DragonflyIridescence);
      ids.push(prism);

      return ids;
    },
  });
}

// ===========================================================================
// U21 C1: The Hall of Twenty-One Portals
// ===========================================================================
function buildU21C1(ctx: SceneCtx): void {
  const { rng } = ctx;
  initChapter(ctx, 'u21_c1', 240, 150);

  drawSkySparkles(ctx, 22, 134, 'stars');

  const orbX = Math.round(jit(rng, 396, 4));
  const orbY = Math.round(jit(rng, 52, 3));
  const orb = drawThemedOrb(ctx, orbX, orbY, 21, 'geode');

  drawThemedCloud(ctx, 14, Math.round(jit(rng, 88, 4)), Math.round(jit(rng, 44, 3)), 86, 26, 'fluffy');
  drawThemedCloud(ctx, 15, Math.round(jit(rng, 244, 4)), Math.round(jit(rng, 38, 3)), 80, 24, 'fluffy');

  drawHorizonHills(ctx, { style: 'clouds', yBase: 152, yBottom: 214, layers: 2, labelPrefix: 'Nexus' });
  drawGroundDeck(ctx, { style: 'stage', yTop: 206, yBottom: 250, labelPrefix: 'Portal' });

  // Three soaring gilded Multiverse Portal Arches lining the grand arrival hall!
  const portL = drawPortalArch(ctx, 94, 174, 0.88, { label: 'West' });
  const portC = drawPortalArch(ctx, 240, 166, 1.04, { label: 'Sovereign' });
  const portR = drawPortalArch(ctx, 386, 174, 0.88, { label: 'East', flip: -1 });

  nexusStar(ctx, 'Realm Sigil West', 168, 108, 11.5);
  nexusStar(ctx, 'Realm Sigil East', 312, 108, 11.5);

  drawGhostSilhouette(ctx, 'Nexus Dragon Ghost', 'dragon', Math.round(jit(rng, 162, 3)), Math.round(jit(rng, 68, 3)), 0.95);
  drawGhostSilhouette(ctx, 'Nexus Butterfly Ghost', 'butterfly', Math.round(jit(rng, 318, 3)), Math.round(jit(rng, 68, 3)), 0.95);
  drawGhostSilhouette(ctx, 'Nexus Owl Ghost', 'owl', Math.round(jit(rng, 444, 3)), Math.round(jit(rng, 114, 3)), 0.9);

  ctx.ellipsePath('ring', orbX, orbY, orb.rx, orb.ry, 24, orb.tilt);
  const gallopPath = ctx.wavePath('gallop', 60, 234, 420, 232, 9, 1.5, 18);
  const sprintPath = ctx.wavePath('sprint', 70, 228, 410, 228, 8, 2, 18);
  const orbitPath = ctx.ellipsePath('orbit', 240, 86, 174, 44, 24);
  ctx.marginPath(256);

  ctx.actor('lumi', 132, 242, { facing: 1, anim: 'rear', pathIndex: gallopPath });
  ctx.actor('violet', 240, 244, { facing: 1, anim: 'idle' });
  ctx.actor('nova', 352, 242, { facing: -1, anim: 'leap', pathIndex: sprintPath });
  ctx.actor('moonCat', 428, 236, { facing: -1, anim: 'peek' });
  ctx.actor('comet', 240, 82, { facing: 1, anim: 'float', pathIndex: orbitPath });

  ctx.heroQuest('portal', 'Nexus Portals', [...portL, ...portC, ...portR]);
  ctx.heroQuest('violet', 'Violet', [1, 2, 3, 4]);
  ctx.heroQuest('lumi', 'Lumi', [5, 6, 7, 8]);
  ctx.heroQuest('nova', 'Nova', [9, 10, 11]);
}

// ===========================================================================
// U21 C2A: The Prism-Bridge of Coral & Clouds
// ===========================================================================
function buildU21C2A(ctx: SceneCtx): void {
  const { r, rng } = ctx;
  initChapter(ctx, 'u21_c2a', 240, 150);

  drawSkySparkles(ctx, 20, 134, 'bubbles');

  const orbX = Math.round(jit(rng, 82, 4));
  const orbY = Math.round(jit(rng, 52, 3));
  const orb = drawThemedOrb(ctx, orbX, orbY, 21, 'bubbleOrb');

  drawThemedCloud(ctx, 14, Math.round(jit(rng, 240, 4)), Math.round(jit(rng, 38, 3)), 86, 26, 'cottonCandy');
  drawThemedCloud(ctx, 15, Math.round(jit(rng, 400, 4)), Math.round(jit(rng, 46, 3)), 82, 26, 'cottonCandy');

  drawHorizonHills(ctx, { style: 'clouds', yBase: 148, yBottom: 214, layers: 2, labelPrefix: 'Skyway' });

  // Sweeping luminous Prism Sky-Bridge arching smoothly across the convergence!
  const prismBridge = ctx.dyn('star', 'Prism Sky-Bridge');
  r.shape(prismBridge, 46, 156, 434, 216, (px, py) => {
    const u = (px - 240) / 192;
    if (Math.abs(u) > 1) return false;
    const ay = 178 + u * u * 28;
    return py >= ay - 8 && py <= ay + 10;
  });
  for (let bx = 76; bx <= 404; bx += 28) {
    const u = (bx - 240) / 192;
    const ay = 178 + u * u * 28;
    r.line(INK, bx, ay - 6, bx, ay + 8, { only: [prismBridge] });
  }

  drawGroundDeck(ctx, { style: 'stage', yTop: 206, yBottom: 250, labelPrefix: 'Prism' });

  // Crossover convergence: Coral Arch (U2) + Macaron Tower (U3) + Sakura Tree (U9)!
  const coralIds = drawCoralArch(ctx, 94, 174, 0.9, { label: 'Nexus' });
  const macIds = drawMacaronTower(ctx, 240, 168, 0.92, { label: 'Nexus' });
  const sakIds = drawSakuraTree(ctx, 388, 168, 0.92, { label: 'Nexus' });

  drawGhostSilhouette(ctx, 'Nexus Seahorse Ghost', 'seahorse', Math.round(jit(rng, 164, 3)), Math.round(jit(rng, 82, 3)), 0.92);
  drawGhostSilhouette(ctx, 'Nexus Cupcake Ghost', 'cupcake', Math.round(jit(rng, 318, 3)), Math.round(jit(rng, 82, 3)), 0.92);

  ctx.ellipsePath('ring', orbX, orbY, orb.rx, orb.ry, 24, orb.tilt);
  const swimPath = ctx.wavePath('swim', 54, 118, 426, 118, 16, 1.5, 20);
  const orbitPath = ctx.ellipsePath('orbit', 240, 88, 172, 44, 24);
  ctx.marginPath(256);

  ctx.actor('whale', 240, 108, { facing: 1, anim: 'swim', pathIndex: swimPath });
  ctx.actor('violet', 166, 242, { facing: 1, anim: 'idle' });
  ctx.actor('moonCat', 324, 236, { facing: -1, anim: 'peek' });
  ctx.actor('comet', 318, 46, { facing: -1, anim: 'float', pathIndex: orbitPath });

  ctx.heroQuest('shell', 'Coral Arch', coralIds);
  ctx.heroQuest('cake', 'Macaron Spire', macIds);
  ctx.heroQuest('portal', 'Prism Skyway', [prismBridge, ...sakIds]);
  ctx.heroQuest('whale', 'Star Whale', [19, 29]);
}

// ===========================================================================
// U21 C2B: The Clockwork & Melody Crossroads
// ===========================================================================
function buildU21C2B(ctx: SceneCtx): void {
  const { rng } = ctx;
  initChapter(ctx, 'u21_c2b', 240, 150);

  drawSkySparkles(ctx, 20, 134, 'notes');

  const orbX = Math.round(jit(rng, 396, 4));
  const orbY = Math.round(jit(rng, 52, 3));
  const orb = drawThemedOrb(ctx, orbX, orbY, 21, 'vinyl');

  drawThemedCloud(ctx, 14, Math.round(jit(rng, 88, 4)), Math.round(jit(rng, 44, 3)), 86, 26, 'music');
  drawThemedCloud(ctx, 15, Math.round(jit(rng, 248, 4)), Math.round(jit(rng, 38, 3)), 80, 24, 'music');

  drawHorizonHills(ctx, { style: 'clouds', yBase: 152, yBottom: 214, layers: 2, labelPrefix: 'Harmonic' });
  drawGroundDeck(ctx, { style: 'brass', yTop: 206, yBottom: 250, labelPrefix: 'Crossroads' });

  // Crossover convergence: Brass Airship (U8) + Harp Waterfall (U10) + Clockwork Gear & Grand Piano!
  const shipIds = drawBrassAirship(ctx, 118, 124, 0.88, { label: 'Nexus' });
  const harpIds = drawHarpWaterfall(ctx, 248, 168, 0.96, { label: 'Nexus' });
  const pianoIds = drawGrandPiano(ctx, 384, 178, 0.86, { label: 'Nexus' });
  const gearIds = drawClockworkGear(ctx, 84, 186, 0.72, { label: 'Crossroads' });

  drawGhostSilhouette(ctx, 'Nexus Robot Ghost', 'robot', Math.round(jit(rng, 178, 3)), Math.round(jit(rng, 72, 3)), 0.92);
  drawGhostSilhouette(ctx, 'Nexus Melody Ghost', 'treble', Math.round(jit(rng, 326, 3)), Math.round(jit(rng, 84, 3)), 0.92);
  drawGhostSilhouette(ctx, 'Nexus Owl Ghost', 'owl', Math.round(jit(rng, 444, 3)), Math.round(jit(rng, 112, 3)), 0.9);

  ctx.ellipsePath('ring', orbX, orbY, orb.rx, orb.ry, 24, orb.tilt);
  const gallopPath = ctx.wavePath('gallop', 60, 234, 420, 232, 9, 1.5, 18);
  const orbitPath = ctx.ellipsePath('orbit', 240, 88, 172, 44, 24);
  ctx.marginPath(256);

  ctx.actor('violet', 162, 242, { facing: 1, anim: 'idle' });
  ctx.actor('lumi', 302, 242, { facing: -1, anim: 'rear', pathIndex: gallopPath });
  ctx.actor('cometCar', 418, 240, { facing: -1, anim: 'run', pathIndex: gallopPath });
  ctx.actor('comet', 248, 86, { facing: 1, anim: 'float', pathIndex: orbitPath });

  ctx.heroQuest('airship', 'Brass Airship', [...shipIds, ...gearIds]);
  ctx.heroQuest('piano', 'Melody Stage', [...harpIds, ...pianoIds]);
  ctx.heroQuest('lumi', 'Lumi', [5, 6, 7, 8]);
  ctx.heroQuest('planet', 'Vinyl Moon', [12, 13]);
}

// ===========================================================================
// U21 C3A: The Crystal Geode & Aurora Terrace
// ===========================================================================
function buildU21C3A(ctx: SceneCtx): void {
  const { r, rng } = ctx;
  initChapter(ctx, 'u21_c3a', 240, 150);

  drawSkySparkles(ctx, 20, 134, 'snow');

  const orbX = Math.round(jit(rng, 82, 4));
  const orbY = Math.round(jit(rng, 52, 3));
  const orb = drawThemedOrb(ctx, orbX, orbY, 21, 'snowglobe');

  drawThemedCloud(ctx, 14, Math.round(jit(rng, 240, 4)), Math.round(jit(rng, 38, 3)), 86, 26, 'fluffy');
  drawThemedCloud(ctx, 15, Math.round(jit(rng, 400, 4)), Math.round(jit(rng, 46, 3)), 82, 26, 'fluffy');

  // Sweeping northern aurora ribbon arching behind the crystal terrace
  const aurora = ctx.dyn('star', 'Aurora Prism Ribbon');
  drawKaleidoRibbon(r, aurora, cubicBezier([40, 112], [156, 74], [324, 74], [440, 112], 18), (t) => 5.5 + Math.sin(t * Math.PI) * 3.5);

  drawHorizonHills(ctx, { style: 'peaks', yBase: 150, yBottom: 214, layers: 2, labelPrefix: 'Aurora' });
  drawGroundDeck(ctx, { style: 'glacier', yTop: 206, yBottom: 250, labelPrefix: 'Crystal' });

  // Crossover convergence: Amethyst Geode Cathedral (U11) + Snowglobe (U7) + Crystal Ice Palace (U7)!
  const geodeIds = drawGeodeCathedral(ctx, 94, 174, 0.9, { label: 'Nexus' });
  const globeIds = drawSnowglobe(ctx, 240, 172, 0.94, { label: 'Aurora' });
  const palaceIds = drawIcePalace(ctx, 386, 170, 0.92, { label: 'Nexus' });

  drawGhostSilhouette(ctx, 'Aurora Crystal Ghost', 'crystal', Math.round(jit(rng, 164, 3)), Math.round(jit(rng, 68, 3)), 0.92);
  drawGhostSilhouette(ctx, 'Aurora Penguin Ghost', 'penguin', Math.round(jit(rng, 322, 3)), Math.round(jit(rng, 68, 3)), 0.92);

  ctx.ellipsePath('ring', orbX, orbY, orb.rx, orb.ry, 24, orb.tilt);
  const gallopPath = ctx.wavePath('gallop', 60, 234, 420, 232, 9, 1.5, 18);
  const sprintPath = ctx.wavePath('sprint', 70, 228, 410, 228, 8, 2, 18);
  const orbitPath = ctx.ellipsePath('orbit', 240, 88, 172, 44, 24);
  ctx.marginPath(256);

  ctx.actor('lumi', 132, 242, { facing: 1, anim: 'rear', pathIndex: gallopPath });
  ctx.actor('violet', 240, 244, { facing: 1, anim: 'idle' });
  ctx.actor('nova', 352, 242, { facing: -1, anim: 'leap', pathIndex: sprintPath });
  ctx.actor('comet', 316, 42, { facing: -1, anim: 'float', pathIndex: orbitPath });

  ctx.heroQuest('geode', 'Geode Vault', [...geodeIds, aurora]);
  ctx.heroQuest('igloo', 'Aurora Palace', [...globeIds, ...palaceIds]);
  ctx.heroQuest('violet', 'Violet', [1, 2, 3, 4]);
  ctx.heroQuest('lumi', 'Lumi', [5, 6, 7, 8]);
}

// ===========================================================================
// U21 C3B: The Storybook & Origami Rotunda
// ===========================================================================
function buildU21C3B(ctx: SceneCtx): void {
  const { rng } = ctx;
  initChapter(ctx, 'u21_c3b', 240, 150);

  drawSkySparkles(ctx, 20, 134, 'petals');

  const orbX = Math.round(jit(rng, 396, 4));
  const orbY = Math.round(jit(rng, 52, 3));
  const orb = drawThemedOrb(ctx, orbX, orbY, 21, 'lanternMoon');

  drawThemedCloud(ctx, 14, Math.round(jit(rng, 88, 4)), Math.round(jit(rng, 44, 3)), 86, 26, 'origami');
  drawThemedCloud(ctx, 15, Math.round(jit(rng, 248, 4)), Math.round(jit(rng, 38, 3)), 80, 24, 'origami');

  drawHorizonHills(ctx, { style: 'clouds', yBase: 152, yBottom: 214, layers: 2, labelPrefix: 'Rotunda' });
  drawGroundDeck(ctx, { style: 'courtyard', yTop: 206, yBottom: 250, labelPrefix: 'Rotunda' });

  // Crossover convergence: Book Castle (U13) + Soaring Origami Crane (U5) + Multiverse Portal Arch!
  const bookIds = drawBookCastle(ctx, 98, 170, 0.94, { label: 'Nexus' });
  const craneIds = drawOrigamiCrane(ctx, 240, 128, 1.0, { label: 'Rotunda' });
  const portIds = drawPortalArch(ctx, 384, 170, 0.94, { label: 'Story' });

  nexusStar(ctx, 'Storybook Star A', 174, 114, 11);
  nexusStar(ctx, 'Storybook Star B', 310, 114, 11);

  drawGhostSilhouette(ctx, 'Rotunda Book Ghost', 'book', Math.round(jit(rng, 162, 3)), Math.round(jit(rng, 70, 3)), 0.92);
  drawGhostSilhouette(ctx, 'Rotunda Crane Ghost', 'crane', Math.round(jit(rng, 318, 3)), Math.round(jit(rng, 70, 3)), 0.92);
  drawGhostSilhouette(ctx, 'Rotunda Owl Ghost', 'owl', Math.round(jit(rng, 444, 3)), Math.round(jit(rng, 112, 3)), 0.9);

  ctx.ellipsePath('ring', orbX, orbY, orb.rx, orb.ry, 24, orb.tilt);
  const gallopPath = ctx.wavePath('gallop', 60, 234, 420, 232, 9, 1.5, 18);
  const orbitPath = ctx.ellipsePath('orbit', 240, 88, 170, 44, 24);
  ctx.marginPath(256);

  ctx.actor('violet', 166, 242, { facing: 1, anim: 'idle' });
  ctx.actor('lumi', 312, 242, { facing: -1, anim: 'idle', pathIndex: gallopPath });
  ctx.actor('moonCat', 428, 236, { facing: -1, anim: 'sleep' });
  ctx.actor('comet', 240, 74, { facing: 1, anim: 'float', pathIndex: orbitPath });

  ctx.heroQuest('book', 'Book Castle', bookIds);
  ctx.heroQuest('crane', 'Sky Crane', craneIds);
  ctx.heroQuest('portal', 'Story Portal', portIds);
  ctx.heroQuest('violet', 'Violet', [1, 2, 3, 4]);
}

// ===========================================================================
// U21 C4A: The Dragon-Peak & Star-Nile Arch
// ===========================================================================
function buildU21C4A(ctx: SceneCtx): void {
  const { rng } = ctx;
  initChapter(ctx, 'u21_c4a', 240, 152);

  drawSkySparkles(ctx, 20, 134, 'stars');

  const orbX = Math.round(jit(rng, 82, 4));
  const orbY = Math.round(jit(rng, 52, 3));
  const orb = drawThemedOrb(ctx, orbX, orbY, 21, 'lotusSun');

  drawThemedCloud(ctx, 14, Math.round(jit(rng, 240, 4)), Math.round(jit(rng, 38, 3)), 86, 26, 'sakura');
  drawThemedCloud(ctx, 15, Math.round(jit(rng, 400, 4)), Math.round(jit(rng, 46, 3)), 82, 26, 'sakura');

  drawHorizonHills(ctx, { style: 'peaks', yBase: 148, yBottom: 214, layers: 2, labelPrefix: 'Dragon-Nile' });
  drawGroundDeck(ctx, { style: 'courtyard', yTop: 206, yBottom: 250, labelPrefix: 'Convergence' });

  // Crossover convergence: Jade Sleeping Dragon (U19) + Royal Lotus Barge (U20) + Star-Nile Pyramid (U20)!
  const dragonIds = drawSleepingDragon(ctx, 94, 176, 0.9, { label: 'Nexus' });
  const bargeIds = drawLotusBarge(ctx, 242, 174, 0.96, { label: 'Nexus' });
  const pyrIds = drawPyramidTemple(ctx, 390, 170, 0.92, { label: 'Nexus' });

  drawGhostSilhouette(ctx, 'Convergence Dragon Ghost', 'dragon', Math.round(jit(rng, 162, 3)), Math.round(jit(rng, 84, 3)), 0.95);
  drawGhostSilhouette(ctx, 'Convergence Scarab Ghost', 'scarab', Math.round(jit(rng, 318, 3)), Math.round(jit(rng, 84, 3)), 0.95);

  ctx.ellipsePath('ring', orbX, orbY, orb.rx, orb.ry, 24, orb.tilt);
  const sprintPath = ctx.wavePath('sprint', 60, 234, 420, 232, 9, 2, 18);
  const orbitPath = ctx.ellipsePath('orbit', 240, 86, 170, 44, 24);
  ctx.marginPath(256);

  ctx.actor('violet', 156, 242, { facing: 1, anim: 'idle' });
  ctx.actor('nova', 286, 240, { facing: 1, anim: 'leap', pathIndex: sprintPath });
  ctx.actor('gazelle', 406, 238, { facing: -1, anim: 'run', pathIndex: sprintPath });
  ctx.actor('comet', 316, 44, { facing: -1, anim: 'float', pathIndex: orbitPath });

  ctx.heroQuest('dragon', 'Jade Dragon', dragonIds);
  ctx.heroQuest('lotus', 'Star Barge', bargeIds);
  ctx.heroQuest('pyramid', 'Nile Temple', pyrIds);
  ctx.heroQuest('nova', 'Nova', [9, 10, 11]);
}

// ===========================================================================
// U21 C4B: The Neon Carnival Convergence
// ===========================================================================
function buildU21C4B(ctx: SceneCtx): void {
  const { rng } = ctx;
  initChapter(ctx, 'u21_c4b', 240, 150);

  drawSkySparkles(ctx, 22, 134, 'hearts');

  const orbX = Math.round(jit(rng, 396, 4));
  const orbY = Math.round(jit(rng, 52, 3));
  const orb = drawThemedOrb(ctx, orbX, orbY, 21, 'pixelPlanet');

  drawThemedCloud(ctx, 14, Math.round(jit(rng, 88, 4)), Math.round(jit(rng, 44, 3)), 86, 26, 'pixel');
  drawThemedCloud(ctx, 15, Math.round(jit(rng, 248, 4)), Math.round(jit(rng, 38, 3)), 80, 24, 'pixel');

  drawHorizonHills(ctx, { style: 'castle', yBase: 152, yBottom: 214, layers: 2, labelPrefix: 'Midway' });
  drawGroundDeck(ctx, { style: 'stage', yTop: 206, yBottom: 250, labelPrefix: 'Festival' });

  // Crossover convergence: Neon Arcade Cabinet (U18) + Starlight Ferris Wheel (U14) + Circus Big-Top (U14)!
  const cabIds = drawArcadeCabinet(ctx, 88, 174, 0.9, { label: 'Festival' });
  const ferrisIds = drawFerrisWheel(ctx, 236, 164, 0.98, { label: 'Convergence' });
  const tentIds = drawCircusBigTop(ctx, 388, 172, 0.92, { label: 'Convergence' });

  drawGhostSilhouette(ctx, 'Festival Balloon Ghost', 'balloon', Math.round(jit(rng, 162, 3)), Math.round(jit(rng, 78, 3)), 0.95);
  drawGhostSilhouette(ctx, 'Festival Heart Ghost', 'pixelHeart', Math.round(jit(rng, 318, 3)), Math.round(jit(rng, 78, 3)), 0.95);
  drawGhostSilhouette(ctx, 'Festival Robot Ghost', 'robot', Math.round(jit(rng, 444, 3)), Math.round(jit(rng, 114, 3)), 0.9);

  ctx.ellipsePath('ring', orbX, orbY, orb.rx, orb.ry, 24, orb.tilt);
  const sprintPath = ctx.wavePath('sprint', 60, 234, 420, 232, 9, 2, 18);
  const orbitPath = ctx.ellipsePath('orbit', 240, 86, 172, 44, 24);
  ctx.marginPath(256);

  ctx.actor('violet', 158, 242, { facing: 1, anim: 'bounce' });
  ctx.actor('nova', 292, 240, { facing: 1, anim: 'leap', pathIndex: sprintPath });
  ctx.actor('cometCar', 412, 240, { facing: -1, anim: 'run', pathIndex: sprintPath });
  ctx.actor('comet', 240, 80, { facing: 1, anim: 'float', pathIndex: orbitPath });

  ctx.heroQuest('tent', 'Star Carnival', [...ferrisIds, ...tentIds]);
  ctx.heroQuest('arcade', 'Neon Booth', cabIds);
  ctx.heroQuest('violet', 'Violet', [1, 2, 3, 4]);
  ctx.heroQuest('nova', 'Nova', [9, 10, 11]);
}

// ===========================================================================
// U21 C5 (THE ULTIMATE MULTIVERSE GRAND FINALE, 50..70 regions!):
// "The Infinite Prism Crown Finale"
// Featuring Sovereign Heart of All Universes, 12-Facet Kaleidoscope Prism Mandala,
// Kaleidoscope Aurora Staircase Ribbons, Twin Multiverse Portal Arches, Grand Prism Crown,
// Cosmic Geode Orb (12/13), Twin Prism Clouds (14/15), and Full Hero Cast Celebration!
// ===========================================================================
function buildU21C5(ctx: SceneCtx): void {
  const { r, rng } = ctx;
  initChapter(ctx, 'u21_c5', 240, 114);

  const cx = 240;
  const cy = 112;
  const twist = rng.range(-0.025, 0.025);

  drawSkySparkles(ctx, 24, 134, 'stars');

  // 1) Mirrored Kaleidoscope Staircase & Prismatic Aurora Ribbons (4 regions)
  for (const side of [-1, 1] as const) {
    const lbl = side < 0 ? 'West' : 'East';
    const upperRib = ctx.dyn('prop', `${lbl} Kaleidoscope Arm`);
    drawKaleidoRibbon(
      r,
      upperRib,
      cubicBezier(
        [cx + side * 66, cy - 52],
        [cx + side * 108, cy - 78],
        [cx + side * 158, cy - 76],
        [cx + side * 196, cy - 52],
        16,
      ),
      (t) => 7.2 + Math.sin(t * Math.PI) * 3.0,
    );

    const stairRib = ctx.dyn('prop', `${lbl} Prism Staircase`);
    drawKaleidoRibbon(
      r,
      stairRib,
      cubicBezier(
        [cx + side * 74, cy + 44],
        [cx + side * 116, cy + 62],
        [cx + side * 156, cy + 64],
        [cx + side * 196, cy + 44],
        16,
      ),
      (t) => 8.4 * Math.pow(1 - t, 0.55) + 2.5,
    );
  }

  // 2) Celestial Prism Promenade Terrace along the bottom arc (1 region)
  const promenade = ctx.dyn('prop', 'Infinite Prism Promenade');
  const topEdge: Pt[] = [];
  const botEdge: Pt[] = [];
  for (let i = 0; i <= 20; i++) {
    const t = i / 20;
    const x = 68 + t * 344;
    const arch = Math.sin(t * Math.PI);
    const midY = 238 - arch * 5;
    topEdge.push([x, midY - 7 - arch * 4]);
    botEdge.push([x, midY + 8 + arch * 3]);
  }
  botEdge.reverse();
  r.poly(promenade, [...topEdge, ...botEdge]);
  r.strokePath(INK, cubicBezier([98, 238], [180, 231], [300, 231], [382, 238], 14), { only: [promenade] });

  // 3) Sovereign 12-Facet Kaleidoscope Prism Mandala (12 + 8 + 8 + 1 = 29 regions)
  const sx = 1.12;
  const sy = 0.94;

  // Outer Ring: 12 Prism Cathedral Arches
  for (let i = 0; i < 12; i++) {
    const a = -Math.PI / 2 + (i * Math.PI * 2) / 12 + twist;
    const aid = ctx.dyn('flora', `Prism Cathedral Arch ${i + 1}`);
    r.poly(aid, prismPetal(cx, cy, a, 52, 86, 0.24, sx, sy));
    const pA = pol(cx, cy, 58, a, sx, sy);
    const pB = pol(cx, cy, 78, a, sx, sy);
    r.line(INK, pA[0], pA[1], pB[0], pB[1], { only: [aid] });
  }

  // Middle Ring: 8 Multiverse Diamond Facets
  for (let i = 0; i < 8; i++) {
    const a = -Math.PI / 2 + ((i + 0.5) * Math.PI * 2) / 8 + twist;
    const fid = ctx.dyn('star', `Kaleidoscope Facet ${i + 1}`);
    r.poly(fid, [
      pol(cx, cy, 32, a, sx, sy),
      pol(cx, cy, 48, a - 0.34, sx, sy),
      pol(cx, cy, 64, a, sx, sy),
      pol(cx, cy, 48, a + 0.34, sx, sy),
    ]);
    const pA = pol(cx, cy, 36, a, sx, sy);
    const pB = pol(cx, cy, 60, a, sx, sy);
    r.line(INK, pA[0], pA[1], pB[0], pB[1], { only: [fid] });
  }

  // Inner Ring: 8 Sovereign Prism Rays
  const innerIds: number[] = [];
  for (let i = 0; i < 8; i++) {
    const a = -Math.PI / 2 + (i * Math.PI * 2) / 8 + twist;
    const rid = ctx.dyn('star', `Sovereign Prism Ray ${i + 1}`);
    innerIds.push(rid);
    r.poly(rid, prismPetal(cx, cy, a, 15, 42, 0.34, sx, sy));
    const pA = pol(cx, cy, 22, a, sx, sy);
    const pB = pol(cx, cy, 36, a, sx, sy);
    r.line(INK, pA[0], pA[1], pB[0], pB[1], { only: [rid] });
  }

  // Centerpiece Core: The Sovereign Heart of All 21 Universes!
  const heartCore = ctx.dyn('star', 'Sovereign Multiverse Heart');
  heart(ctx, heartCore, cx, cy + 2, 16);
  inkArc(r, cx - 5.5, cy - 3.5, 4.5, 3.8, Math.PI * 1.05, Math.PI * 1.72, -0.2, { only: [heartCore] });

  // 4) Twin Flanking Multiverse Portal Arch & Sovereign Prism Crown! (6 regions)
  const portL = drawPortalArch(ctx, 64, 154, 0.76, { label: 'Omniverse' });
  const crownR = drawPrismCrown(ctx, 416, 152, 0.76, { label: 'Omniverse' });

  // 5) Canonical Cosmic Geode Planet (12/13) & Twin Luminous Clouds (14/15)
  const orbX = 72;
  const orbY = 72 + Math.round(jit(rng, 0, 2));
  const orb = drawThemedOrb(ctx, orbX, orbY, 15, 'geode');

  // Four corner multiverse nexus stars
  nexusStar(ctx, 'Alpha Realm Star', 34, 28, 11.5);
  nexusStar(ctx, 'Omega Realm Star', 446, 28, 11.5);
  nexusStar(ctx, 'West Nexus Star', 124, 108, 11);
  nexusStar(ctx, 'East Nexus Star', 356, 108, 11);

  drawThemedCloud(ctx, 14, 58, 228, 92, 30, 'fluffy');
  drawThemedCloud(ctx, 15, 422, 228, 92, 30, 'fluffy');

  // 6) 3 Constellation Ghosts in clean open upper sky pockets
  drawGhostSilhouette(ctx, 'Omniverse Dragon Ghost', 'dragon', 152, 22, 0.9);
  drawGhostSilhouette(ctx, 'Omniverse Butterfly Ghost', 'butterfly', 328, 22, 0.9);
  drawGhostSilhouette(ctx, 'Omniverse Owl Ghost', 'owl', 240, 18, 0.85);

  // 7) Paths & Grand Multiverse Celebration Cast (Violet 4 + Lumi 4 + Nova 3 + MoonCat 1 + Whale 2 + Comet 2 = 16 actor regions -> total ~64!)
  const gallopPath = ctx.wavePath('gallop', 66, 240, 414, 240, 8, 2, 20);
  const sprintPath = ctx.wavePath('sprint', 90, 236, 390, 236, 9, 2, 20);
  const swimPath = ctx.wavePath('swim', 360, 74, 444, 74, 10, 1, 16);
  const orbitPath = ctx.ellipsePath('orbit', cx, cy, 184, 84, 28);
  ctx.ellipsePath('ring', orbX, orbY, orb.rx, orb.ry, 24, orb.tilt);
  ctx.marginPath(256);

  ctx.actor('lumi', 148, 246, { facing: 1, anim: 'rear', pathIndex: gallopPath });
  ctx.actor('violet', 240, 248, { facing: 1, anim: 'bounce' });
  ctx.actor('nova', 332, 246, { facing: -1, anim: 'leap', pathIndex: sprintPath });
  ctx.actor('moonCat', 110, 202, { facing: 1, anim: 'peek' });
  ctx.actor('whale', 404, 86, { facing: -1, anim: 'swim', pathIndex: swimPath });
  ctx.actor('comet', 366, 198, { facing: -1, anim: 'float', pathIndex: orbitPath });

  // 4 Disjoint Hero Quests
  ctx.heroQuest('heart', 'Prism Heart', [heartCore, ...innerIds]);
  ctx.heroQuest('portal', 'Nexus Crown', [...portL, ...crownR]);
  ctx.heroQuest('violet', 'Violet', [1, 2, 3, 4]);
  ctx.heroQuest('lumi', 'Lumi', [5, 6, 7, 8]);
}

export const U21_SCENES: Record<U21SceneId, (ctx: SceneCtx) => void> = {
  hub_prismNexusMultiverse: buildHubPrismNexusMultiverse,
  u21_c1: buildU21C1,
  u21_c2a: buildU21C2A,
  u21_c2b: buildU21C2B,
  u21_c3a: buildU21C3A,
  u21_c3b: buildU21C3B,
  u21_c4a: buildU21C4A,
  u21_c4b: buildU21C4B,
  u21_c5: buildU21C5,
};
