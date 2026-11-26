/**
 * Universe 8: Clockwork Cloud Toyshop (`clockworkToyshop`)
 * 9 bespoke scenes: Hub Sanctuary ("Violet's Brass-Gear Tinker Loft") + 8 Clockwork Chapters,
 * culminating in the double-dense Grand Master-Clock Skyship finale.
 * Pure & deterministic (uses ctx.rng only; zero timers or wall-clock APIs).
 */
import { MaterialId } from '../../contracts/materials';
import { UNIVERSE_BY_ID } from '../../contracts/universes';
import type { SceneCtx } from '../context';
import {
  drawBrassAirship,
  drawClockworkGear,
  drawGhostSilhouette,
  drawGingerbreadTrain,
  drawGroundDeck,
  drawHorizonHills,
  drawSanctuaryRoom,
  drawSkySparkles,
  drawThemedCloud,
  drawThemedOrb,
} from '../kit';
import { inkArc, jit, star, twinkle } from '../props';
import { INK, type Pt } from '../raster';

const DEF = UNIVERSE_BY_ID.clockworkToyshop;

type U08SceneId =
  | 'hub_clockworkToyshop'
  | 'u08_c1'
  | 'u08_c2a'
  | 'u08_c2b'
  | 'u08_c3a'
  | 'u08_c3b'
  | 'u08_c4a'
  | 'u08_c4b'
  | 'u08_c5';

function initChapter(ctx: SceneCtx, chapterIdx: number, focalX = 240, focalY = 160): void {
  const ch = DEF.chapters[chapterIdx]!;
  ctx.title = ch.title;
  ctx.sky = { ...DEF.sky };
  ctx.universeId = DEF.id;
  ctx.ambient = DEF.ambient;
  ctx.focal = { x: focalX, y: focalY };
}

/** Iconic golden brass wind-up key sculpture (2 chunky regions: double bow + shaft). */
function drawWindUpKey(
  ctx: SceneCtx,
  x: number,
  y: number,
  scale = 1,
  label = 'Wind-Up Key',
  preColor?: readonly MaterialId[],
): number[] {
  const { r } = ctx;
  const s = Math.max(0.7, scale);
  const shaft = ctx.dyn('prop', `${label} Shaft`);
  const bow = ctx.dyn('star', `${label} Bow`);

  r.rect(shaft, x - 7 * s, y - 4 * s, x + 7 * s, y + 36 * s);
  r.ellipse(shaft, x, y + 34 * s, 16 * s, 6 * s);
  r.line(INK, x, y, x, y + 30 * s, { only: [shaft] });

  r.disc(bow, x - 16 * s, y - 16 * s, 15 * s);
  r.disc(bow, x + 16 * s, y - 16 * s, 15 * s);
  r.rect(bow, x - 16 * s, y - 24 * s, x + 16 * s, y - 4 * s);
  inkArc(r, x - 16 * s, y - 16 * s, 7.5 * s, 7.5 * s, 0, Math.PI * 2, 0, { only: [bow] });
  inkArc(r, x + 16 * s, y - 16 * s, 7.5 * s, 7.5 * s, 0, Math.PI * 2, 0, { only: [bow] });

  if (preColor && preColor.length >= 2) {
    ctx.preColor(shaft, preColor[0]!);
    ctx.preColor(bow, preColor[1]!);
  }
  return [shaft, bow];
}

/** Ornate open-lid Starlight Music Box with pinned brass cylinder (3 regions). */
function drawMusicBoxCabinet(ctx: SceneCtx, x: number, y: number, scale = 1, label = 'Music Box'): number[] {
  const { r } = ctx;
  const s = Math.max(0.72, scale);
  const lid = ctx.dyn('star', `${label} Lid`);
  const caseId = ctx.dyn('prop', `${label} Case`);
  const cylinder = ctx.dyn('star', `${label} Cylinder`);

  // Raised open starry lid
  r.poly(lid, [
    [x - 36 * s, y - 2 * s],
    [x - 28 * s, y - 36 * s],
    [x + 28 * s, y - 36 * s],
    [x + 36 * s, y - 2 * s],
  ]);
  inkArc(r, x, y - 18 * s, 16 * s, 10 * s, 0, Math.PI * 2, 0, { only: [lid] });
  r.line(INK, x - 20 * s, y - 18 * s, x + 20 * s, y - 18 * s, { only: [lid] });

  // Lower carved parlor cabinet
  r.rect(caseId, x - 38 * s, y, x + 38 * s, y + 36 * s);
  r.rect(caseId, x - 42 * s, y + 30 * s, x + 42 * s, y + 38 * s);
  r.line(INK, x - 32 * s, y + 20 * s, x + 32 * s, y + 20 * s, { only: [caseId] });

  // Revolving brass pin-cylinder
  r.ellipse(cylinder, x, y + 6 * s, 26 * s, 10 * s);
  for (const px of [-16, -6, 4, 14]) {
    r.dot(INK, x + px * s, y + 4 * s, { only: [cylinder] });
    r.dot(INK, x + (px + 3) * s, y + 8 * s, { only: [cylinder] });
  }
  return [lid, caseId, cylinder];
}

/** Clockwork Moon-Dial Bell Tower with curved roof cupola & hands (3 regions). */
function drawClockTowerDial(ctx: SceneCtx, x: number, y: number, scale = 1, label = 'Bell Tower'): number[] {
  const { r } = ctx;
  const s = Math.max(0.7, scale);
  const spire = ctx.dyn('star', `${label} Spire`);
  const tower = ctx.dyn('prop', `${label} Shaft`);
  const dial = ctx.dyn('star', `${label} Moon Dial`);

  r.poly(spire, [[x, y - 48 * s], [x + 26 * s, y - 18 * s], [x - 26 * s, y - 18 * s]]);
  r.line(INK, x, y - 44 * s, x, y - 20 * s, { only: [spire] });

  r.rect(tower, x - 26 * s, y - 18 * s, x + 26 * s, y + 38 * s);
  r.rect(tower, x - 30 * s, y + 28 * s, x + 30 * s, y + 38 * s);
  r.line(INK, x - 20 * s, y + 18 * s, x + 20 * s, y + 18 * s, { only: [tower] });

  r.disc(dial, x, y - 2 * s, 17 * s);
  inkArc(r, x, y - 2 * s, 13 * s, 13 * s, 0, Math.PI * 2, 0, { only: [dial] });
  r.line(INK, x, y - 2 * s, x, y - 12 * s, { only: [dial] });
  r.line(INK, x, y - 2 * s, x + 9 * s, y - 4 * s, { only: [dial] });
  return [spire, tower, dial];
}

/** Friendly marching tin-toy robot with antenna, chest dial & boxy limbs (3 regions). */
function drawTinRobotToy(ctx: SceneCtx, x: number, y: number, scale = 1, flip: 1 | -1 = 1, label = 'Tin Robot'): number[] {
  const { r } = ctx;
  const s = Math.max(0.72, scale);
  const limbs = ctx.dyn('prop', `${label} Limbs`);
  const torso = ctx.dyn('prop', `${label} Chest`);
  const head = ctx.dyn('star', `${label} Head`);

  // Arms & legs
  r.capsule(limbs, x - 22 * s, y - 4 * s, x - 34 * s, y + 12 * s, 5.5 * s);
  r.capsule(limbs, x + 22 * s, y - 4 * s, x + 34 * s * flip, y - 16 * s, 5.5 * s);
  r.rect(limbs, x - 18 * s, y + 16 * s, x - 6 * s, y + 38 * s);
  r.rect(limbs, x + 6 * s, y + 16 * s, x + 18 * s, y + 38 * s);

  // Boxy riveted tin torso
  r.rect(torso, x - 22 * s, y - 10 * s, x + 22 * s, y + 20 * s);
  inkArc(r, x, y + 5 * s, 9 * s, 7 * s, 0, Math.PI * 2, 0, { only: [torso] });
  r.line(INK, x, y + 5 * s, x + 6 * s * flip, y + 1 * s, { only: [torso] });

  // Cheerful tin head + antenna ball
  r.rect(head, x - 16 * s, y - 34 * s, x + 16 * s, y - 10 * s);
  r.disc(head, x, y - 42 * s, 6 * s);
  r.rect(head, x - 3 * s, y - 38 * s, x + 3 * s, y - 32 * s);
  inkArc(r, x - 6 * s, y - 24 * s, 3 * s, 3 * s, 0, Math.PI * 2, 0, { only: [head] });
  inkArc(r, x + 6 * s, y - 24 * s, 3 * s, 3 * s, 0, Math.PI * 2, 0, { only: [head] });
  r.line(INK, x - 7 * s, y - 16 * s, x + 7 * s, y - 16 * s, { only: [head] });
  return [limbs, torso, head];
}

/** Celestial brass orrery with geared pedestal, orbital rings & sun sphere (3 regions). */
function drawBrassOrrery(
  ctx: SceneCtx,
  x: number,
  y: number,
  scale = 1,
  label = 'Brass Orrery',
  preColor?: readonly MaterialId[],
): number[] {
  const { r } = ctx;
  const s = Math.max(0.68, scale);
  const stand = ctx.dyn('prop', `${label} Base`);
  const rings = ctx.dyn('prop', `${label} Rings`);
  const sun = ctx.dyn('star', `${label} Sun`);

  r.poly(stand, [[x - 24 * s, y + 36 * s], [x - 12 * s, y + 14 * s], [x + 12 * s, y + 14 * s], [x + 24 * s, y + 36 * s]]);
  r.rect(stand, x - 5 * s, y - 8 * s, x + 5 * s, y + 18 * s);

  r.shape(rings, x - 40 * s, y - 40 * s, x + 40 * s, y + 20 * s, (px, py) => {
    const d1 = Math.hypot((px - x) / (36 * s), (py - (y - 10 * s)) / (26 * s));
    const d2 = Math.hypot((px - x) / (26 * s), (py - (y - 10 * s)) / (13 * s));
    return (d1 <= 1 && d1 >= 0.78) || (d2 <= 1 && d2 >= 0.66);
  });
  r.disc(rings, x - 32 * s, y - 16 * s, 6.5 * s);
  r.disc(rings, x + 32 * s, y - 4 * s, 6.5 * s);

  r.disc(sun, x, y - 10 * s, 12.5 * s);
  inkArc(r, x, y - 10 * s, 8 * s, 8 * s, 0, Math.PI * 2, 0, { only: [sun] });

  if (preColor && preColor.length >= 3) {
    ctx.preColor(stand, preColor[0]!);
    ctx.preColor(rings, preColor[1]!);
    ctx.preColor(sun, preColor[2]!);
  }
  return [stand, rings, sun];
}

/** Multi-arch stone & brass sky viaduct spanning across clouds (2 regions: deck + piers). */
function drawCloudViaductArch(ctx: SceneCtx, x0: number, x1: number, yTop: number, yBot: number, label = 'Sky Viaduct'): number[] {
  const { r } = ctx;
  const deck = ctx.dyn('star', `${label} Rail Deck`);
  const arches = ctx.dyn('prop', `${label} Arches`);

  r.shape(arches, x0, yTop + 8, x1, yBot, (px, py) => {
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
  for (let x = x0 + 18; x < x1 - 12; x += 24) {
    r.line(INK, x, yTop + 2, x, yTop + 10, { only: [deck] });
  }
  return [deck, arches];
}

/** Colorful striped spinning top toy (2 regions: cone + spin crown). */
function drawSpinningTop(ctx: SceneCtx, x: number, y: number, scale = 1, label = 'Spinning Top'): number[] {
  const { r } = ctx;
  const s = Math.max(0.75, scale);
  const body = ctx.dyn('prop', `${label} Cone`);
  const crown = ctx.dyn('star', `${label} Handle`);
  r.poly(body, [[x - 28 * s, y - 4 * s], [x + 28 * s, y - 4 * s], [x, y + 36 * s]]);
  r.ellipse(body, x, y - 4 * s, 28 * s, 9 * s);
  r.line(INK, x - 20 * s, y + 8 * s, x + 20 * s, y + 8 * s, { only: [body] });
  r.line(INK, x - 12 * s, y + 20 * s, x + 12 * s, y + 20 * s, { only: [body] });
  r.rect(crown, x - 5.5 * s, y - 26 * s, x + 5.5 * s, y - 6 * s);
  r.disc(crown, x, y - 28 * s, 8 * s);
  return [body, crown];
}

// ===========================================================================
// HUB SANCTUARY: Violet's Brass-Gear Tinker Loft (25..45 pre-colored regions, 0 ghosts)
// ===========================================================================
function buildHubClockworkToyshop(ctx: SceneCtx): void {
  ctx.universeId = DEF.id;
  ctx.ambient = DEF.ambient;

  let tinkerGear: number[] = [];

  drawSanctuaryRoom(ctx, {
    title: DEF.hubTitle,
    sky: { ...DEF.sky },
    windowShape: 'porthole',
    windowOrbStyle: 'astrolabe',
    wallStyle: 'wainscot',
    floorStyle: 'brass',
    rugShape: 'diamond',
    lampStyle: 'lantern',
    garlandStyle: 'bunting',
    sparkleStyle: 'gears',
    seatingLabel: 'Velvet Tinker Settee',
    workbenchLabel: 'Brass Tinker Bench',
    shelfLabel: 'Clockwork Parts Shelf',
    trinketLabels: ['Gear Blueprints', 'Wind-Up Toys', 'Skyship Logs'],
    palette: {
      wallPanel: MaterialId.RoyalAstralGold,
      floor: MaterialId.SolarFlare24K,
      windowFrame: MaterialId.SolarFlare24K,
      windowGlass: MaterialId.DeepSpaceBiolum,
      curtain: MaterialId.VelvetNebula,
      orbCore: MaterialId.SolarFlare24K,
      orbRing: MaterialId.HoloFoil,
      rugOuter: MaterialId.VelvetNebula,
      rugInner: MaterialId.SolarFlare24K,
      furniture: MaterialId.SolarCheetahAmber,
      furnitureTrim: MaterialId.RoyalAstralGold,
      accentA: MaterialId.SolarFlare24K,
      accentB: MaterialId.LiquidAurora,
      accentC: MaterialId.StrawberrySupernova,
    },
    drawWindowView: (c, wx, _wy, wHalf) => {
      // Distant clockwork spire silhouette tucked cleanly inside lower porthole arc (y<=126)
      const spire = c.dyn('prop', 'Window Clock Spire');
      c.r.poly(spire, [
        [wx - wHalf + 16, 124],
        [wx - 16, 114],
        [wx, 102],
        [wx + 16, 114],
        [wx + wHalf - 16, 124],
      ]);
      c.preColor(spire, MaterialId.RoyalAstralGold);
    },
    drawExtraProps: (c) => {
      const extras: number[] = [];
      // 1) Wall-mounted Brass Wind-Up Key Crest on left upper wall
      const keyIds = drawWindUpKey(c, 78, 92, 0.72, 'Wall Wind-Up Key', [
        MaterialId.SolarCheetahAmber,
        MaterialId.SolarFlare24K,
      ]);
      extras.push(...keyIds);

      // 2) Standing Brass Orrery Pedestal right-center (x=282, y=184)
      const orrery = drawBrassOrrery(c, 282, 184, 0.68, 'Loft Orrery', [
        MaterialId.RoyalAstralGold,
        MaterialId.HoloFoil,
        MaterialId.SolarFlare24K,
      ]);
      extras.push(...orrery);

      // 3) Tabletop Brass Gear Toy on right side of workbench (x=374, y=158)
      const gRim = c.dyn('prop', 'Bench Brass Gear');
      const gHub = c.dyn('star', 'Bench Gear Jewel');
      c.r.disc(gRim, 374, 160, 15);
      for (let i = 0; i < 6; i++) {
        const a = (i / 6) * Math.PI * 2;
        c.r.disc(gRim, 374 + Math.cos(a) * 16, 160 + Math.sin(a) * 16, 4.5);
      }
      c.preColor(gRim, MaterialId.SolarFlare24K);
      c.r.disc(gHub, 374, 160, 7.5);
      c.preColor(gHub, MaterialId.LiquidAurora);
      tinkerGear = [gRim, gHub];
      extras.push(gRim, gHub);

      return extras;
    },
  });

  ctx.heroQuest('violet', 'Violet', [1, 2, 3, 4]);
  ctx.heroQuest('planet', 'Astrolabe Orb', [12, 13]);
  ctx.heroQuest('airship', 'Brass Gear', tinkerGear);
}

// ===========================================================================
// CHAPTER 1: The Wind-Up Showcase Balcony (`u08_c1`)
// ===========================================================================
function buildU08C1(ctx: SceneCtx): void {
  const { rng } = ctx;
  initChapter(ctx, 0, 240, 166);
  drawSkySparkles(ctx, 18, 150, 'gears');

  const orb = drawThemedOrb(ctx, Math.round(jit(rng, 372, 4)), Math.round(jit(rng, 54, 3)), 20, 'astrolabe');
  drawThemedCloud(ctx, 14, Math.round(jit(rng, 104, 5)), Math.round(jit(rng, 46, 3)), 80, 28, 'steamPuff');
  drawThemedCloud(ctx, 15, Math.round(jit(rng, 240, 5)), Math.round(jit(rng, 42, 3)), 72, 26, 'steamPuff');
  star(ctx, ctx.dyn('star', 'Tinker North Star'), 442, 46, 11, { points: 5, inner: 0.48 });

  drawHorizonHills(ctx, { style: 'clouds', yBase: 168, yBottom: 224, layers: 2 });
  drawGroundDeck(ctx, { style: 'brass', yTop: 210, yBottom: 250 });

  const keyIds = drawWindUpKey(ctx, 240, 174, 1.0, 'Master Key');
  const gearL = drawClockworkGear(ctx, 90, 172, 0.9, { label: 'Balcony' });
  const topR = drawSpinningTop(ctx, 392, 174, 0.92, 'Sky Toy Top');

  drawGhostSilhouette(ctx, 'Wind-Up Robot Ghost', 'robot', Math.round(jit(rng, 294, 4)), Math.round(jit(rng, 108, 3)), 0.94);
  drawGhostSilhouette(ctx, 'Brass Owl Ghost', 'owl', Math.round(jit(rng, 146, 4)), Math.round(jit(rng, 114, 3)), 0.92);

  const sprintPath = ctx.wavePath('sprint', 66, 234, 412, 232, 8, 2, 18);
  const orbitPath = ctx.ellipsePath('orbit', 240, 94, 168, 46, 24);
  ctx.ellipsePath('ring', 372, 54, orb.rx, orb.ry, 20, orb.tilt);
  ctx.marginPath(256);

  ctx.actor('violet', 164, 240, { facing: 1, anim: 'idle' });
  ctx.actor('nova', 316, 238, { facing: -1, anim: 'sleep', pathIndex: sprintPath });
  ctx.actor('moonCat', 90, 134, { facing: 1, anim: 'sleep' });
  ctx.actor('comet', 186, 82, { facing: 1, anim: 'float', pathIndex: orbitPath });

  ctx.heroQuest('airship', 'Wind-Up Key', [...keyIds, ...gearL]);
  ctx.heroQuest('lantern', 'Spinning Top', topR);
  ctx.heroQuest('violet', 'Violet', [1, 2, 3, 4]);
  ctx.heroQuest('nova', 'Nova', [9, 10, 11]);
}

// ===========================================================================
// CHAPTER 2A: The Brass Cloud-Airship Dock (`u08_c2a`)
// ===========================================================================
function buildU08C2a(ctx: SceneCtx): void {
  const { rng } = ctx;
  initChapter(ctx, 1, 248, 142);
  drawSkySparkles(ctx, 18, 148, 'gears');

  const orb = drawThemedOrb(ctx, Math.round(jit(rng, 100, 4)), Math.round(jit(rng, 52, 3)), 19, 'astrolabe');
  drawThemedCloud(ctx, 14, Math.round(jit(rng, 250, 5)), Math.round(jit(rng, 40, 3)), 76, 26, 'steamPuff');
  drawThemedCloud(ctx, 15, Math.round(jit(rng, 390, 5)), Math.round(jit(rng, 48, 3)), 76, 26, 'steamPuff');

  drawHorizonHills(ctx, { style: 'clouds', yBase: 170, yBottom: 224, layers: 2 });
  drawGroundDeck(ctx, { style: 'pier', yTop: 210, yBottom: 250 });

  const shipIds = drawBrassAirship(ctx, 244, 134, 1.06, { label: 'Sky Dock' });
  const gearL = drawClockworkGear(ctx, 84, 178, 0.86, { label: 'Dock Winch' });
  const mast = drawClockTowerDial(ctx, 402, 172, 0.84, 'Mooring Mast');

  drawGhostSilhouette(ctx, 'Sky Balloon Ghost', 'balloon', Math.round(jit(rng, 146, 4)), Math.round(jit(rng, 108, 3)), 0.92);
  drawGhostSilhouette(ctx, 'Dock Robot Ghost', 'robot', Math.round(jit(rng, 344, 4)), Math.round(jit(rng, 104, 3)), 0.92);

  const gallopPath = ctx.wavePath('gallop', 66, 232, 412, 230, 9, 1.5, 18);
  const orbitPath = ctx.ellipsePath('orbit', 240, 96, 172, 46, 24);
  ctx.ellipsePath('ring', 100, 52, orb.rx, orb.ry, 20, orb.tilt);
  ctx.marginPath(256);

  ctx.actor('violet', 164, 240, { facing: 1, anim: 'idle' });
  ctx.actor('lumi', 282, 238, { facing: -1, anim: 'idle', pathIndex: gallopPath });
  ctx.actor('moonCat', 402, 128, { facing: -1, anim: 'sleep' });
  ctx.actor('comet', 356, 76, { facing: 1, anim: 'float', pathIndex: orbitPath });

  ctx.heroQuest('airship', 'Cloud Airship', shipIds);
  ctx.heroQuest('lantern', 'Mooring Mast', [...mast, ...gearL]);
  ctx.heroQuest('violet', 'Violet', [1, 2, 3, 4]);
  ctx.heroQuest('lumi', 'Lumi', [5, 6, 7, 8]);
}

// ===========================================================================
// CHAPTER 2B: The Starlight Music-Box Parlor (`u08_c2b`)
// ===========================================================================
function buildU08C2b(ctx: SceneCtx): void {
  const { rng } = ctx;
  initChapter(ctx, 2, 240, 168);
  drawSkySparkles(ctx, 18, 146, 'notes');

  const orb = drawThemedOrb(ctx, Math.round(jit(rng, 374, 4)), Math.round(jit(rng, 52, 3)), 19, 'astrolabe');
  drawThemedCloud(ctx, 14, Math.round(jit(rng, 104, 5)), Math.round(jit(rng, 44, 3)), 78, 28, 'steamPuff');
  drawThemedCloud(ctx, 15, Math.round(jit(rng, 238, 5)), Math.round(jit(rng, 40, 3)), 72, 26, 'music');
  twinkle(ctx, ctx.dyn('star', 'Chime Twinkle'), 440, 94, 12);

  drawHorizonHills(ctx, { style: 'castle', yBase: 168, yBottom: 224, layers: 2 });
  drawGroundDeck(ctx, { style: 'brass', yTop: 210, yBottom: 250 });

  const boxIds = drawMusicBoxCabinet(ctx, 240, 174, 1.02, 'Starlight Music Box');
  const keyL = drawWindUpKey(ctx, 90, 176, 0.9, 'Parlor Key');
  const gearR = drawClockworkGear(ctx, 392, 174, 0.88, { label: 'Parlor' });

  drawGhostSilhouette(ctx, 'Parlor Owl Ghost', 'owl', Math.round(jit(rng, 296, 4)), Math.round(jit(rng, 104, 3)), 0.92);
  drawGhostSilhouette(ctx, 'Melody Clef Ghost', 'treble', Math.round(jit(rng, 152, 4)), Math.round(jit(rng, 108, 3)), 0.92);

  const gallopPath = ctx.wavePath('gallop', 66, 232, 412, 230, 9, 1.5, 18);
  const orbitPath = ctx.ellipsePath('orbit', 240, 94, 168, 46, 24);
  ctx.ellipsePath('ring', 374, 52, orb.rx, orb.ry, 20, orb.tilt);
  ctx.marginPath(256);

  ctx.actor('violet', 158, 240, { facing: 1, anim: 'idle' });
  ctx.actor('lumi', 324, 238, { facing: -1, anim: 'idle', pathIndex: gallopPath });
  ctx.actor('moonCat', 240, 134, { facing: 1, anim: 'sleep' });
  ctx.actor('comet', 176, 78, { facing: 1, anim: 'float', pathIndex: orbitPath });

  ctx.heroQuest('piano', 'Music Box', boxIds);
  ctx.heroQuest('airship', 'Brass Gears', [...keyL, ...gearR]);
  ctx.heroQuest('violet', 'Violet', [1, 2, 3, 4]);
  ctx.heroQuest('lumi', 'Lumi', [5, 6, 7, 8]);
}

// ===========================================================================
// CHAPTER 3A: The Clockwork Owl Bell-Tower (`u08_c3a`)
// ===========================================================================
function buildU08C3a(ctx: SceneCtx): void {
  const { rng } = ctx;
  initChapter(ctx, 3, 240, 160);
  drawSkySparkles(ctx, 18, 146, 'gears');

  const orb = drawThemedOrb(ctx, Math.round(jit(rng, 108, 4)), Math.round(jit(rng, 52, 3)), 19, 'astrolabe');
  drawThemedCloud(ctx, 14, Math.round(jit(rng, 248, 5)), Math.round(jit(rng, 40, 3)), 76, 26, 'steamPuff');
  drawThemedCloud(ctx, 15, Math.round(jit(rng, 386, 5)), Math.round(jit(rng, 48, 3)), 74, 26, 'steamPuff');

  drawHorizonHills(ctx, { style: 'castle', yBase: 168, yBottom: 224, layers: 2 });
  drawGroundDeck(ctx, { style: 'courtyard', yTop: 210, yBottom: 250 });

  const towerIds = drawClockTowerDial(ctx, 240, 166, 1.02, 'Owl Bell-Tower');
  const gearL = drawClockworkGear(ctx, 108, 174, 0.9, { label: 'West Dial' });
  const gearR = drawClockworkGear(ctx, 372, 174, 0.9, { label: 'East Dial', flip: -1 });

  drawGhostSilhouette(ctx, 'West Clock Owl', 'owl', Math.round(jit(rng, 166, 4)), Math.round(jit(rng, 104, 3)), 0.95);
  drawGhostSilhouette(ctx, 'East Clock Owl', 'owl', Math.round(jit(rng, 322, 4)), Math.round(jit(rng, 104, 3)), 0.95);

  const sprintPath = ctx.wavePath('sprint', 68, 234, 412, 232, 9, 2, 18);
  const orbitPath = ctx.ellipsePath('orbit', 240, 94, 168, 46, 24);
  ctx.ellipsePath('ring', 108, 52, orb.rx, orb.ry, 20, orb.tilt);
  ctx.marginPath(256);

  ctx.actor('violet', 170, 240, { facing: 1, anim: 'idle' });
  ctx.actor('nova', 318, 238, { facing: -1, anim: 'sleep', pathIndex: sprintPath });
  ctx.actor('moonCat', 240, 114, { facing: 1, anim: 'sleep' });
  ctx.actor('comet', 370, 82, { facing: -1, anim: 'float', pathIndex: orbitPath });

  ctx.heroQuest('lantern', 'Bell Tower', towerIds);
  ctx.heroQuest('airship', 'Clock Gears', [...gearL, ...gearR]);
  ctx.heroQuest('violet', 'Violet', [1, 2, 3, 4]);
  ctx.heroQuest('nova', 'Nova', [9, 10, 11]);
}

// ===========================================================================
// CHAPTER 3B: The Tin-Robot Parade Boulevard (`u08_c3b`)
// ===========================================================================
function buildU08C3b(ctx: SceneCtx): void {
  const { rng } = ctx;
  initChapter(ctx, 4, 240, 168);
  drawSkySparkles(ctx, 18, 146, 'gears');

  const orb = drawThemedOrb(ctx, Math.round(jit(rng, 374, 4)), Math.round(jit(rng, 52, 3)), 19, 'astrolabe');
  drawThemedCloud(ctx, 14, Math.round(jit(rng, 104, 5)), Math.round(jit(rng, 44, 3)), 78, 26, 'steamPuff');
  drawThemedCloud(ctx, 15, Math.round(jit(rng, 236, 5)), Math.round(jit(rng, 40, 3)), 72, 26, 'steamPuff');
  star(ctx, ctx.dyn('star', 'Parade Crest Star'), 44, 92, 11, { points: 5, inner: 0.48 });

  drawHorizonHills(ctx, { style: 'castle', yBase: 168, yBottom: 224, layers: 2 });
  drawGroundDeck(ctx, { style: 'brass', yTop: 210, yBottom: 250 });

  const botL = drawTinRobotToy(ctx, 104, 174, 0.95, 1, 'West Tin Robot');
  const keyMid = drawWindUpKey(ctx, 240, 172, 0.92, 'Parade Key');
  const botR = drawTinRobotToy(ctx, 376, 174, 0.95, -1, 'East Tin Robot');

  drawGhostSilhouette(ctx, 'Marching Robot Ghost', 'robot', Math.round(jit(rng, 176, 4)), Math.round(jit(rng, 104, 3)), 0.94);
  drawGhostSilhouette(ctx, 'Parade Balloon Ghost', 'balloon', Math.round(jit(rng, 306, 4)), Math.round(jit(rng, 104, 3)), 0.92);

  const gallopPath = ctx.wavePath('gallop', 66, 232, 412, 230, 9, 1.5, 18);
  const orbitPath = ctx.ellipsePath('orbit', 240, 92, 166, 46, 24);
  ctx.ellipsePath('ring', 374, 52, orb.rx, orb.ry, 20, orb.tilt);
  ctx.marginPath(256);

  ctx.actor('violet', 178, 240, { facing: 1, anim: 'idle' });
  ctx.actor('lumi', 302, 238, { facing: -1, anim: 'idle', pathIndex: gallopPath });
  ctx.actor('gazelle', 428, 240, { facing: -1, anim: 'idle' });
  ctx.actor('comet', 176, 76, { facing: 1, anim: 'float', pathIndex: orbitPath });

  ctx.heroQuest('airship', 'Tin Robots', [...botL, ...botR]);
  ctx.heroQuest('lantern', 'Parade Key', keyMid);
  ctx.heroQuest('violet', 'Violet', [1, 2, 3, 4]);
  ctx.heroQuest('lumi', 'Lumi', [5, 6, 7, 8]);
}

// ===========================================================================
// CHAPTER 4A: The Celestial Brass Orrery Hall (`u08_c4a`)
// ===========================================================================
function buildU08C4a(ctx: SceneCtx): void {
  const { rng } = ctx;
  initChapter(ctx, 5, 240, 164);
  drawSkySparkles(ctx, 20, 148, 'gears');

  const orb = drawThemedOrb(ctx, Math.round(jit(rng, 240, 4)), Math.round(jit(rng, 52, 3)), 20, 'astrolabe');
  drawThemedCloud(ctx, 14, Math.round(jit(rng, 90, 5)), Math.round(jit(rng, 48, 3)), 76, 26, 'steamPuff');
  drawThemedCloud(ctx, 15, Math.round(jit(rng, 390, 5)), Math.round(jit(rng, 48, 3)), 76, 26, 'steamPuff');

  drawHorizonHills(ctx, { style: 'clouds', yBase: 170, yBottom: 224, layers: 2 });
  drawGroundDeck(ctx, { style: 'brass', yTop: 210, yBottom: 250 });

  const orreryIds = drawBrassOrrery(ctx, 240, 174, 1.06, 'Celestial Orrery');
  const shipL = drawBrassAirship(ctx, 94, 134, 0.78, { label: 'Model' });
  const gearR = drawClockworkGear(ctx, 392, 174, 0.9, { label: 'Orrery' });

  drawGhostSilhouette(ctx, 'Observatory Owl Ghost', 'owl', Math.round(jit(rng, 166, 4)), Math.round(jit(rng, 102, 3)), 0.92);
  drawGhostSilhouette(ctx, 'Orrery Robot Ghost', 'robot', Math.round(jit(rng, 332, 4)), Math.round(jit(rng, 104, 3)), 0.92);

  const sprintPath = ctx.wavePath('sprint', 68, 234, 412, 232, 9, 2, 18);
  const orbitPath = ctx.ellipsePath('orbit', 240, 96, 170, 46, 24);
  ctx.ellipsePath('ring', 240, 52, orb.rx, orb.ry, 20, orb.tilt);
  ctx.marginPath(256);

  ctx.actor('violet', 156, 240, { facing: 1, anim: 'idle' });
  ctx.actor('nova', 324, 238, { facing: -1, anim: 'sleep', pathIndex: sprintPath });
  ctx.actor('gazelle', 76, 240, { facing: 1, anim: 'idle' });
  ctx.actor('comet', 360, 88, { facing: -1, anim: 'float', pathIndex: orbitPath });

  ctx.heroQuest('airship', 'Brass Orrery', [...orreryIds, ...shipL, ...gearR]);
  ctx.heroQuest('planet', 'Astrolabe Orb', [12, 13]);
  ctx.heroQuest('violet', 'Violet', [1, 2, 3, 4]);
  ctx.heroQuest('nova', 'Nova', [9, 10, 11]);
}

// ===========================================================================
// CHAPTER 4B: The Porcelain Train Viaduct (`u08_c4b`)
// ===========================================================================
function buildU08C4b(ctx: SceneCtx): void {
  const { rng } = ctx;
  initChapter(ctx, 6, 240, 168);
  drawSkySparkles(ctx, 18, 144, 'gears');

  const orb = drawThemedOrb(ctx, Math.round(jit(rng, 376, 4)), Math.round(jit(rng, 52, 3)), 19, 'astrolabe');
  drawThemedCloud(ctx, 14, Math.round(jit(rng, 102, 5)), Math.round(jit(rng, 44, 3)), 78, 26, 'steamPuff');
  drawThemedCloud(ctx, 15, Math.round(jit(rng, 238, 5)), Math.round(jit(rng, 40, 3)), 74, 26, 'steamPuff');

  drawHorizonHills(ctx, { style: 'clouds', yBase: 162, yBottom: 224, layers: 2 });
  const viaductIds = drawCloudViaductArch(ctx, 14, 466, 194, 250, 'Cloud Viaduct');

  const trainIds = drawGingerbreadTrain(ctx, 240, 166, 1.0, { label: 'Porcelain' });
  const clockL = drawClockTowerDial(ctx, 78, 158, 0.82, 'Station Clock');
  const keyR = drawWindUpKey(ctx, 404, 164, 0.84, 'Signal Key');

  drawGhostSilhouette(ctx, 'Viaduct Balloon Ghost', 'balloon', Math.round(jit(rng, 148, 4)), Math.round(jit(rng, 102, 3)), 0.92);
  drawGhostSilhouette(ctx, 'Conductor Robot Ghost', 'robot', Math.round(jit(rng, 326, 4)), Math.round(jit(rng, 102, 3)), 0.92);

  const gallopPath = ctx.wavePath('gallop', 66, 232, 412, 230, 8, 1.5, 18);
  const orbitPath = ctx.ellipsePath('orbit', 240, 92, 168, 46, 24);
  ctx.ellipsePath('ring', 376, 52, orb.rx, orb.ry, 20, orb.tilt);
  ctx.marginPath(256);

  ctx.actor('violet', 150, 242, { facing: 1, anim: 'idle' });
  ctx.actor('lumi', 328, 242, { facing: -1, anim: 'idle', pathIndex: gallopPath });
  ctx.actor('moonCat', 216, 128, { facing: 1, anim: 'sleep' });
  ctx.actor('comet', 166, 78, { facing: 1, anim: 'float', pathIndex: orbitPath });

  ctx.heroQuest('rocket', 'Sky Express', [...trainIds, ...viaductIds]);
  ctx.heroQuest('airship', 'Station Clock', [...clockL, ...keyR]);
  ctx.heroQuest('violet', 'Violet', [1, 2, 3, 4]);
  ctx.heroQuest('lumi', 'Lumi', [5, 6, 7, 8]);
}

// ===========================================================================
// CHAPTER 5 (FINALE): The Grand Master-Clock Skyship (`u08_c5`, 50..70 regions!)
// ===========================================================================
function buildU08C5(ctx: SceneCtx): void {
  const { r, rng } = ctx;
  initChapter(ctx, 7, 240, 134);
  drawSkySparkles(ctx, 20, 128, 'gears');

  // 1) 12 Master-Clock Dial Rays radiating behind the Skyship (12 regions!)
  const cx = 240;
  const cy = 150;
  const rays = 12;
  for (let i = 0; i < rays; i++) {
    const a0 = -Math.PI * 0.9 + (i * Math.PI * 0.8) / rays;
    const a1 = -Math.PI * 0.9 + ((i + 0.84) * Math.PI * 0.8) / rays;
    const aMid = (a0 + a1) * 0.5;
    const id = ctx.dyn('star', `Clockwork Dial Ray ${i + 1}`);
    const r0 = 66;
    const r1 = i % 2 === 0 ? 124 : 112;
    const sx = 1.46;
    const sy = 0.92;
    r.poly(id, [
      [cx + Math.cos(a0) * r0 * sx, cy + Math.sin(a0) * r0 * sy],
      [cx + Math.cos(a0) * (r1 - 10) * sx, cy + Math.sin(a0) * (r1 - 10) * sy],
      [cx + Math.cos(aMid) * r1 * sx, cy + Math.sin(aMid) * r1 * sy],
      [cx + Math.cos(a1) * (r1 - 10) * sx, cy + Math.sin(a1) * (r1 - 10) * sy],
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

  // 2) Core Orb (12/13), Mirrored Compass Rose, Zenith Star, Clouds (14/15) (6 regions)
  const orb = drawThemedOrb(ctx, 56, 48, 16, 'astrolabe');
  const compass = ctx.dyn('star', 'Brass Compass Rose');
  star(ctx, compass, 424, 48, 18, { points: 8, inner: 0.45 });
  const zenith = ctx.dyn('star', 'Master-Clock Zenith');
  star(ctx, zenith, 240, 20, 11, { points: 5, inner: 0.48 });

  drawThemedCloud(ctx, 14, 54, 126, 74, 26, 'steamPuff');
  drawThemedCloud(ctx, 15, 426, 126, 74, 26, 'steamPuff');

  // 3) Horizon + Brass Grand Sky-Deck (4 regions)
  drawHorizonHills(ctx, { style: 'clouds', yBase: 170, yBottom: 224, layers: 2 });
  drawGroundDeck(ctx, { style: 'brass', yTop: 214, yBottom: 250 });

  // 4) Grand Flagship Panorama (20 regions): Flagship Airship + 2 Gears + 2 Towers + 2 Keys + 2 Spinning Tops
  const shipIds = drawBrassAirship(ctx, 240, 136, 1.12, { label: 'Master-Clock' });
  const gearL = drawClockworkGear(ctx, 114, 174, 0.84, { label: 'Port Turbine' });
  const gearR = drawClockworkGear(ctx, 366, 174, 0.84, { label: 'Starboard Turbine', flip: -1 });
  drawClockTowerDial(ctx, 44, 186, 0.72, 'West Sky-Pylon');
  drawClockTowerDial(ctx, 436, 186, 0.72, 'East Sky-Pylon');
  drawWindUpKey(ctx, 174, 188, 0.74, 'Port Key');
  drawWindUpKey(ctx, 306, 188, 0.74, 'Starboard Key');

  // 5) 3 Ghosts in open upper-sky pockets
  drawGhostSilhouette(ctx, 'Master Robot Ghost', 'robot', Math.round(jit(rng, 144, 3)), Math.round(jit(rng, 28, 2)), 0.88);
  drawGhostSilhouette(ctx, 'Master Owl Ghost', 'owl', Math.round(jit(rng, 336, 3)), Math.round(jit(rng, 28, 2)), 0.88);
  drawGhostSilhouette(ctx, 'Skyship Balloon Ghost', 'balloon', Math.round(jit(rng, 444, 3)), Math.round(jit(rng, 88, 2)), 0.84);

  // 6) Paths & Full Hero Cast (14 actor regions -> total ~58 regions!)
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

  ctx.heroQuest('airship', 'Master Skyship', [...shipIds, ...gearL, ...gearR]);
  ctx.heroQuest('violet', 'Violet', [1, 2, 3, 4]);
  ctx.heroQuest('lumi', 'Lumi', [5, 6, 7, 8]);
  ctx.heroQuest('nova', 'Nova', [9, 10, 11]);
}

export const U08_SCENES: Record<U08SceneId, (ctx: SceneCtx) => void> = {
  hub_clockworkToyshop: buildHubClockworkToyshop,
  u08_c1: buildU08C1,
  u08_c2a: buildU08C2a,
  u08_c2b: buildU08C2b,
  u08_c3a: buildU08C3a,
  u08_c3b: buildU08C3b,
  u08_c4a: buildU08C4a,
  u08_c4b: buildU08C4b,
  u08_c5: buildU08C5,
};
