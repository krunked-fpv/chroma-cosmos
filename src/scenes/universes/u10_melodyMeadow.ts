/**
 * Universe 10: Symphony Cloud Valley (`melodyMeadow`)
 * 9 bespoke scenes: Hub Sanctuary ("Violet's Cloud-Harp Music Room") + 8 Musical Chapters,
 * culminating in the double-dense Grand Starlight Symphony Shell finale.
 * Pure & deterministic (uses ctx.rng only; zero timers or wall-clock APIs).
 */
import { MaterialId } from '../../contracts/materials';
import { UNIVERSE_BY_ID } from '../../contracts/universes';
import type { SceneCtx } from '../context';
import {
  drawGhostSilhouette,
  drawGrandPiano,
  drawGroundDeck,
  drawHarpWaterfall,
  drawHorizonHills,
  drawSanctuaryRoom,
  drawSkySparkles,
  drawThemedCloud,
  drawThemedOrb,
  drawVinylMoon,
} from '../kit';
import { inkArc, jit, star, twinkle } from '../props';
import { INK, type Pt } from '../raster';

const DEF = UNIVERSE_BY_ID.melodyMeadow;

type U10SceneId =
  | 'hub_melodyMeadow'
  | 'u10_c1'
  | 'u10_c2a'
  | 'u10_c2b'
  | 'u10_c3a'
  | 'u10_c3b'
  | 'u10_c4a'
  | 'u10_c4b'
  | 'u10_c5';

function initChapter(ctx: SceneCtx, chapterIdx: number, focalX = 240, focalY = 160): void {
  const ch = DEF.chapters[chapterIdx]!;
  ctx.title = ch.title;
  ctx.sky = { ...DEF.sky };
  ctx.universeId = DEF.id;
  ctx.ambient = DEF.ambient;
  ctx.focal = { x: focalX, y: focalY };
}

/** Arched Ivory Piano-Key Footbridge spanning cloud banks (2 chunky regions: keyboard arch + brass rail). */
function drawPianoBridge(ctx: SceneCtx, cx: number, yBase: number, w: number, h: number, label = 'Piano Bridge'): number[] {
  const { r } = ctx;
  const hw = w / 2;
  const keys = ctx.dyn('prop', `${label} Keys`);
  const rail = ctx.dyn('star', `${label} Rail`);

  const kTop: Pt[] = [];
  const kBot: Pt[] = [];
  for (let i = 0; i <= 16; i++) {
    const t = i / 16;
    const x = cx - hw + t * w;
    const lift = Math.sin(t * Math.PI) * h;
    kTop.push([x, yBase - lift - 14]);
    kBot.push([x, yBase - lift * 0.52 + 8]);
  }
  kBot.reverse();
  r.poly(keys, [...kTop, ...kBot]);
  for (let i = 1; i < 16; i++) {
    const t = i / 16;
    const x = cx - hw + t * w;
    const lift = Math.sin(t * Math.PI) * h;
    r.line(INK, x, yBase - lift - 12, x, yBase - lift * 0.52 + 5, { only: [keys] });
    if (i % 3 !== 0) {
      r.line(INK, x + 2, yBase - lift - 12, x + 2, yBase - lift - 3, { only: [keys] });
      r.line(INK, x + 3, yBase - lift - 12, x + 3, yBase - lift - 3, { only: [keys] });
    }
  }

  const rTop: Pt[] = [];
  const rBot: Pt[] = [];
  for (let i = 0; i <= 16; i++) {
    const t = i / 16;
    const x = cx - hw + t * w;
    const lift = Math.sin(t * Math.PI) * h;
    rTop.push([x, yBase - lift - 23]);
    rBot.push([x, yBase - lift - 13]);
  }
  rBot.reverse();
  r.poly(rail, [...rTop, ...rBot]);
  return [keys, rail];
}

/** Curled giant golden French-horn / brass lily bloom rising from the hills (2 regions). */
function drawBrassHornBloom(
  ctx: SceneCtx,
  x: number,
  y: number,
  scale = 1,
  flip: 1 | -1 = 1,
  label = 'Brass Horn',
): number[] {
  const { r } = ctx;
  const s = Math.max(0.7, scale);
  const coil = ctx.dyn('prop', `${label} Coil`);
  const bell = ctx.dyn('star', `${label} Bell`);

  r.shape(coil, x - 34 * s, y - 10 * s, x + 34 * s, y + 38 * s, (px, py) => {
    const d = Math.hypot((px - x) / (26 * s), (py - (y + 14 * s)) / (22 * s));
    return d <= 1 && d >= 0.44;
  });
  r.capsule(coil, x - 10 * s * flip, y + 2 * s, x + 12 * s * flip, y - 16 * s, 7.5 * s);
  r.rect(coil, x - 14 * s, y + 28 * s, x + 14 * s, y + 38 * s);

  r.poly(bell, [
    [x + 2 * s * flip, y - 18 * s],
    [x + 34 * s * flip, y - 38 * s],
    [x + 38 * s * flip, y - 6 * s],
    [x + 6 * s * flip, y - 4 * s],
  ]);
  r.ellipse(bell, x + 34 * s * flip, y - 22 * s, 9 * s, 17 * s, 0.12 * flip);
  inkArc(r, x + 34 * s * flip, y - 22 * s, 5 * s, 10 * s, 0, Math.PI * 2, 0, { only: [bell] });
  return [coil, bell];
}

/** Silvery weeping Wind-Chime Willow tree hung with crystal chime bells (3 regions). */
function drawWindChimeWillow(ctx: SceneCtx, x: number, y: number, scale = 1, label = 'Willow Chime'): number[] {
  const { r } = ctx;
  const s = Math.max(0.75, scale);
  const trunk = ctx.dyn('prop', `${label} Trunk`);
  const boughs = ctx.dyn('flora', `${label} Canopy`);
  const bells = ctx.dyn('star', `${label} Bells`);

  r.poly(trunk, [
    [x - 10 * s, y - 6 * s],
    [x + 10 * s, y - 6 * s],
    [x + 18 * s, y + 38 * s],
    [x - 18 * s, y + 38 * s],
  ]);
  r.line(INK, x, y, x, y + 34 * s, { only: [trunk] });

  r.ellipse(boughs, x, y - 18 * s, 40 * s, 20 * s);
  r.capsule(boughs, x - 34 * s, y - 14 * s, x - 36 * s, y + 18 * s, 7 * s);
  r.capsule(boughs, x + 34 * s, y - 14 * s, x + 36 * s, y + 18 * s, 7 * s);
  r.line(INK, x - 22 * s, y - 24 * s, x - 24 * s, y - 2 * s, { only: [boughs] });
  r.line(INK, x + 22 * s, y - 24 * s, x + 24 * s, y - 2 * s, { only: [boughs] });

  // Hanging glowing crystal bells (shared region)
  for (const [bx, by] of [[-24, 10], [0, 8], [24, 10]] as const) {
    r.poly(bells, [
      [x + bx * s, y + (by - 10) * s],
      [x + (bx + 9) * s, y + (by + 8) * s],
      [x + (bx - 9) * s, y + (by + 8) * s],
    ]);
    r.disc(bells, x + bx * s, y + (by + 8) * s, 4.5 * s);
  }
  return [trunk, boughs, bells];
}

/** Musical Metronome Gazebo with domed canopy & swinging star pendulum (3 regions). */
function drawMetronomeGazebo(ctx: SceneCtx, x: number, y: number, scale = 1, label = 'Metronome Gazebo'): number[] {
  const { r } = ctx;
  const s = Math.max(0.75, scale);
  const frame = ctx.dyn('prop', `${label} Frame`);
  const dome = ctx.dyn('prop', `${label} Dome`);
  const pendulum = ctx.dyn('star', `${label} Pendulum`);

  r.rect(frame, x - 38 * s, y - 12 * s, x - 28 * s, y + 38 * s);
  r.rect(frame, x + 28 * s, y - 12 * s, x + 38 * s, y + 38 * s);
  r.rect(frame, x - 44 * s, y + 28 * s, x + 44 * s, y + 38 * s);

  r.poly(dome, [[x, y - 44 * s], [x + 46 * s, y - 10 * s], [x - 46 * s, y - 10 * s]]);
  r.disc(dome, x, y - 44 * s, 6 * s);
  r.line(INK, x, y - 40 * s, x, y - 12 * s, { only: [dome] });

  // Metronome pyramid body + star weight inside gazebo
  r.poly(pendulum, [[x - 16 * s, y + 28 * s], [x - 8 * s, y - 8 * s], [x + 8 * s, y - 8 * s], [x + 16 * s, y + 28 * s]]);
  r.capsule(pendulum, x, y + 24 * s, x + 16 * s, y - 2 * s, 4 * s);
  r.disc(pendulum, x + 14 * s, y + 2 * s, 7.5 * s);
  return [frame, dome, pendulum];
}

/** Starry Celesta Keyboard Bell-Tower with arched belfry & keyboard plinth (3 regions). */
function drawCelestaTower(ctx: SceneCtx, x: number, y: number, scale = 1, label = 'Celesta Tower'): number[] {
  const { r } = ctx;
  const s = Math.max(0.7, scale);
  const spire = ctx.dyn('star', `${label} Spire`);
  const body = ctx.dyn('prop', `${label} Belfry`);
  const chimes = ctx.dyn('star', `${label} Chimes`);

  r.poly(spire, [[x, y - 48 * s], [x + 28 * s, y - 18 * s], [x - 28 * s, y - 18 * s]]);
  r.line(INK, x, y - 44 * s, x, y - 20 * s, { only: [spire] });

  r.rect(body, x - 26 * s, y - 18 * s, x + 26 * s, y + 38 * s);
  r.rect(body, x - 32 * s, y + 26 * s, x + 32 * s, y + 38 * s);
  for (const kx of [-20, -10, 0, 10, 20]) {
    r.line(INK, x + kx * s, y + 28 * s, x + kx * s, y + 36 * s, { only: [body] });
  }

  // Hanging celesta bells inside arched tower belfry
  r.disc(chimes, x, y - 2 * s, 15 * s);
  r.rect(chimes, x - 15 * s, y - 2 * s, x + 15 * s, y + 18 * s);
  for (const cx0 of [-8, 0, 8]) {
    r.line(INK, x + cx0 * s, y - 10 * s, x + cx0 * s, y + 14 * s, { only: [chimes] });
  }
  return [spire, body, chimes];
}

/** Chunky floating musical eighth-note sculpture in the sky (1 region, >= 140px). */
function drawFloatingMusicNote(ctx: SceneCtx, x: number, y: number, scale = 1, label = 'Sky Melody Note'): number {
  const { r } = ctx;
  const s = Math.max(0.85, scale);
  const id = ctx.dyn('star', label);
  r.ellipse(id, x - 8 * s, y + 8 * s, 9 * s, 6.5 * s, -0.35);
  r.ellipse(id, x + 10 * s, y + 4 * s, 9 * s, 6.5 * s, -0.35);
  r.rect(id, x - 3 * s, y - 14 * s, x + 2 * s, y + 8 * s);
  r.rect(id, x + 14 * s, y - 18 * s, x + 19 * s, y + 4 * s);
  r.poly(id, [[x - 3 * s, y - 14 * s], [x + 19 * s, y - 18 * s], [x + 19 * s, y - 10 * s], [x - 3 * s, y - 6 * s]]);
  return id;
}

// ===========================================================================
// HUB SANCTUARY: Violet's Cloud-Harp Music Room (25..45 pre-colored regions, 0 ghosts)
// ===========================================================================
function buildHubMelodyMeadow(ctx: SceneCtx): void {
  ctx.universeId = DEF.id;
  ctx.ambient = DEF.ambient;

  let cloudHarp: number[] = [];

  drawSanctuaryRoom(ctx, {
    title: DEF.hubTitle,
    sky: { ...DEF.sky },
    windowShape: 'arched',
    windowOrbStyle: 'vinyl',
    wallStyle: 'fabric',
    floorStyle: 'wood',
    rugShape: 'cloud',
    lampStyle: 'moon',
    garlandStyle: 'notes',
    sparkleStyle: 'notes',
    seatingLabel: 'Velvet Symphony Daybed',
    workbenchLabel: 'Composer Desk',
    shelfLabel: 'Sheet Music Cabinet',
    trinketLabels: ['Lydian Scores', 'Vinyl Records', 'Star Sonatas'],
    palette: {
      wallPanel: MaterialId.VelvetNebula,
      floor: MaterialId.SolarFlare24K,
      windowFrame: MaterialId.RoyalAstralGold,
      windowGlass: MaterialId.DeepSpaceBiolum,
      curtain: MaterialId.SupernovaGlitter,
      orbCore: MaterialId.RoyalAstralGold,
      orbRing: MaterialId.SolarFlare24K,
      rugOuter: MaterialId.LiquidAurora,
      rugInner: MaterialId.OpalPearl,
      furniture: MaterialId.RoyalAstralGold,
      furnitureTrim: MaterialId.AuroraSherbet,
      accentA: MaterialId.SolarFlare24K,
      accentB: MaterialId.HoloFoil,
      accentC: MaterialId.SupernovaGlitter,
    },
    drawWindowView: (c, wx, _wy, wHalf, wBot) => {
      // Rolling musical cloud hills inside lower arched window
      const hills = c.dyn('cloud', 'Window Symphony Clouds');
      c.r.ellipse(hills, wx - 22, wBot - 8, 22, 14);
      c.r.ellipse(hills, wx + 22, wBot - 6, 22, 13);
      c.r.ellipse(hills, wx, wBot - 12, 24, 15);
      c.preColor(hills, MaterialId.OpalPearl);
    },
    drawExtraProps: (c) => {
      const extras: number[] = [];
      // 1) Framed Musical Score Banner on left upper wall
      const banner = c.dyn('prop', 'Symphony Wall Score');
      const note = c.dyn('star', 'Framed Melody Note');
      c.r.rect(banner, 48, 68, 110, 118);
      c.r.line(INK, 54, 82, 104, 82, { only: [banner] });
      c.r.line(INK, 54, 92, 104, 92, { only: [banner] });
      c.r.line(INK, 54, 102, 104, 102, { only: [banner] });
      c.preColor(banner, MaterialId.OpalPearl);
      c.r.ellipse(note, 74, 98, 9, 6.5, -0.3);
      c.r.rect(note, 79, 76, 84, 98);
      c.r.poly(note, [[79, 76], [94, 82], [94, 89], [79, 83]]);
      c.preColor(note, MaterialId.SolarFlare24K);
      extras.push(banner, note);

      // 2) Standing Golden Cloud-Harp in right-center (x=282, y=184)
      const harpFrame = c.dyn('prop', 'Room Golden Harp');
      const harpStrings = c.dyn('star', 'Harp Star Strings');
      c.r.poly(harpStrings, [[270, 162], [296, 170], [292, 200], [270, 200]]);
      for (const sx of [276, 282, 288]) c.r.line(INK, sx, 166, sx, 198, { only: [harpStrings] });
      c.preColor(harpStrings, MaterialId.HoloFoil);
      c.r.capsule(harpFrame, 267, 156, 267, 204, 4.5);
      c.r.capsule(harpFrame, 267, 158, 297, 168, 4.5);
      c.r.capsule(harpFrame, 296, 169, 290, 204, 5);
      c.r.rect(harpFrame, 262, 200, 298, 208);
      c.preColor(harpFrame, MaterialId.SolarFlare24K);
      cloudHarp = [harpFrame, harpStrings];
      extras.push(harpFrame, harpStrings);

      // 3) Tabletop Mini Metronome on workbench right (x=374, y=164)
      const metro = c.dyn('prop', 'Desk Metronome');
      c.r.poly(metro, [[362, 179], [369, 152], [381, 152], [388, 179]]);
      c.r.line(INK, 375, 176, 381, 157, { only: [metro] });
      c.preColor(metro, MaterialId.RoyalAstralGold);
      extras.push(metro);

      return extras;
    },
  });

  ctx.heroQuest('violet', 'Violet', [1, 2, 3, 4]);
  ctx.heroQuest('planet', 'Vinyl Moon', [12, 13]);
  ctx.heroQuest('piano', 'Cloud Harp', cloudHarp);
}

// ===========================================================================
// CHAPTER 1: The Ivory Piano-Key Footbridge (`u10_c1`)
// ===========================================================================
function buildU10C1(ctx: SceneCtx): void {
  const { rng } = ctx;
  initChapter(ctx, 0, 240, 170);
  drawSkySparkles(ctx, 20, 148, 'notes');

  const orb = drawThemedOrb(ctx, Math.round(jit(rng, 374, 4)), Math.round(jit(rng, 54, 3)), 20, 'vinyl');
  drawThemedCloud(ctx, 14, Math.round(jit(rng, 106, 5)), Math.round(jit(rng, 46, 3)), 80, 28, 'music');
  drawThemedCloud(ctx, 15, Math.round(jit(rng, 240, 5)), Math.round(jit(rng, 40, 3)), 74, 26, 'music');
  drawFloatingMusicNote(ctx, 434, 96, 0.9, 'Sky Note East');

  drawHorizonHills(ctx, { style: 'clouds', yBase: 168, yBottom: 224, layers: 2 });
  drawGroundDeck(ctx, { style: 'stage', yTop: 210, yBottom: 250 });

  const bridgeIds = drawPianoBridge(ctx, 240, 212, 212, 38, 'Ivory Piano');
  const pianoL = drawGrandPiano(ctx, 84, 176, 0.84, { label: 'Bridge' });
  const hornR = drawBrassHornBloom(ctx, 404, 176, 0.9, -1, 'Bridge Horn');

  drawGhostSilhouette(ctx, 'Bridge Treble Ghost', 'treble', Math.round(jit(rng, 286, 4)), Math.round(jit(rng, 106, 3)), 0.94);
  drawGhostSilhouette(ctx, 'Song Butterfly Ghost', 'butterfly', Math.round(jit(rng, 152, 4)), Math.round(jit(rng, 108, 3)), 0.92);

  const gallopPath = ctx.wavePath('gallop', 66, 234, 412, 232, 9, 1.5, 18);
  const orbitPath = ctx.ellipsePath('orbit', 240, 94, 168, 46, 24);
  ctx.ellipsePath('ring', 374, 54, orb.rx, orb.ry, 20, orb.tilt);
  ctx.marginPath(256);

  ctx.actor('violet', 236, 194, { facing: 1, anim: 'idle' });
  ctx.actor('lumi', 124, 240, { facing: 1, anim: 'idle', pathIndex: gallopPath });
  ctx.actor('moonCat', 392, 238, { facing: -1, anim: 'sleep' });
  ctx.actor('comet', 178, 78, { facing: 1, anim: 'float', pathIndex: orbitPath });

  ctx.heroQuest('piano', 'Piano Bridge', [...bridgeIds, ...pianoL]);
  ctx.heroQuest('suns', 'Brass Horn', hornR);
  ctx.heroQuest('violet', 'Violet', [1, 2, 3, 4]);
  ctx.heroQuest('lumi', 'Lumi', [5, 6, 7, 8]);
}

// ===========================================================================
// CHAPTER 2A: The Waterfall Harp Ravine (`u10_c2a`)
// ===========================================================================
function buildU10C2a(ctx: SceneCtx): void {
  const { rng } = ctx;
  initChapter(ctx, 1, 240, 166);
  drawSkySparkles(ctx, 20, 146, 'notes');

  const orb = drawThemedOrb(ctx, Math.round(jit(rng, 106, 4)), Math.round(jit(rng, 52, 3)), 19, 'vinyl');
  drawThemedCloud(ctx, 14, Math.round(jit(rng, 248, 5)), Math.round(jit(rng, 40, 3)), 78, 26, 'music');
  drawThemedCloud(ctx, 15, Math.round(jit(rng, 388, 5)), Math.round(jit(rng, 48, 3)), 76, 26, 'music');

  drawHorizonHills(ctx, { style: 'peaks', yBase: 168, yBottom: 224, layers: 2 });
  drawGroundDeck(ctx, { style: 'meadow', yTop: 210, yBottom: 250 });

  const harpCenter = drawHarpWaterfall(ctx, 240, 168, 1.04, { label: 'Grand Ravine' });
  const harpL = drawHarpWaterfall(ctx, 90, 178, 0.78, { label: 'West Cascade' });
  const harpR = drawHarpWaterfall(ctx, 390, 178, 0.78, { label: 'East Cascade', flip: -1 });

  drawGhostSilhouette(ctx, 'Ravine Treble Ghost', 'treble', Math.round(jit(rng, 166, 4)), Math.round(jit(rng, 102, 3)), 0.94);
  drawGhostSilhouette(ctx, 'Harp Owl Ghost', 'owl', Math.round(jit(rng, 336, 4)), Math.round(jit(rng, 104, 3)), 0.92);

  const swimPath = ctx.wavePath('swim', 68, 96, 412, 92, 12, 1.5, 20);
  const sprintPath = ctx.wavePath('sprint', 68, 234, 412, 232, 9, 2, 18);
  ctx.ellipsePath('ring', 106, 52, orb.rx, orb.ry, 20, orb.tilt);
  ctx.marginPath(256);

  ctx.actor('violet', 166, 240, { facing: 1, anim: 'idle' });
  ctx.actor('nova', 318, 238, { facing: -1, anim: 'sleep', pathIndex: sprintPath });
  ctx.actor('whale', 256, 98, { facing: 1, anim: 'swim', pathIndex: swimPath });
  ctx.actor('comet', 410, 88, { facing: -1, anim: 'float' });

  ctx.heroQuest('piano', 'Waterfall Harp', [...harpCenter, ...harpL, ...harpR]);
  ctx.heroQuest('whale', 'Song Whale', [19, 29]);
  ctx.heroQuest('violet', 'Violet', [1, 2, 3, 4]);
  ctx.heroQuest('nova', 'Nova', [9, 10, 11]);
}

// ===========================================================================
// CHAPTER 2B: The Spinning Vinyl Moon Terrace (`u10_c2b`)
// ===========================================================================
function buildU10C2b(ctx: SceneCtx): void {
  const { rng } = ctx;
  initChapter(ctx, 2, 240, 166);
  drawSkySparkles(ctx, 20, 146, 'notes');

  const orb = drawThemedOrb(ctx, Math.round(jit(rng, 374, 4)), Math.round(jit(rng, 52, 3)), 19, 'vinyl');
  drawThemedCloud(ctx, 14, Math.round(jit(rng, 104, 5)), Math.round(jit(rng, 44, 3)), 78, 26, 'music');
  drawThemedCloud(ctx, 15, Math.round(jit(rng, 238, 5)), Math.round(jit(rng, 40, 3)), 74, 26, 'music');
  const skyNote = drawFloatingMusicNote(ctx, 434, 96, 0.9, 'Terrace Note');

  drawHorizonHills(ctx, { style: 'clouds', yBase: 168, yBottom: 224, layers: 2 });
  drawGroundDeck(ctx, { style: 'stage', yTop: 210, yBottom: 250 });

  const vinylIds = drawVinylMoon(ctx, 240, 166, 1.04, { label: 'Terrace' });
  const pianoL = drawGrandPiano(ctx, 90, 178, 0.84, { label: 'Terrace' });
  const hornR = drawBrassHornBloom(ctx, 396, 176, 0.88, -1, 'Terrace');

  drawGhostSilhouette(ctx, 'Vinyl Clef Ghost', 'treble', Math.round(jit(rng, 158, 4)), Math.round(jit(rng, 104, 3)), 0.94);
  drawGhostSilhouette(ctx, 'Lullaby Moth Ghost', 'butterfly', Math.round(jit(rng, 326, 4)), Math.round(jit(rng, 104, 3)), 0.92);

  const gallopPath = ctx.wavePath('gallop', 66, 234, 412, 232, 9, 1.5, 18);
  const orbitPath = ctx.ellipsePath('orbit', 240, 92, 166, 44, 24);
  ctx.ellipsePath('ring', 374, 52, orb.rx, orb.ry, 20, orb.tilt);
  ctx.marginPath(256);

  ctx.actor('violet', 164, 240, { facing: 1, anim: 'idle' });
  ctx.actor('lumi', 322, 238, { facing: -1, anim: 'idle', pathIndex: gallopPath });
  ctx.actor('moonCat', 90, 146, { facing: 1, anim: 'sleep' });
  ctx.actor('comet', 174, 78, { facing: 1, anim: 'float', pathIndex: orbitPath });

  ctx.heroQuest('piano', 'Vinyl Disc', [...vinylIds, ...pianoL]);
  ctx.heroQuest('suns', 'Echo Horn', [...hornR, skyNote]);
  ctx.heroQuest('violet', 'Violet', [1, 2, 3, 4]);
  ctx.heroQuest('lumi', 'Lumi', [5, 6, 7, 8]);
}

// ===========================================================================
// CHAPTER 3A: The Brass Horn Echo Hills (`u10_c3a`)
// ===========================================================================
function buildU10C3a(ctx: SceneCtx): void {
  const { rng } = ctx;
  initChapter(ctx, 3, 240, 168);
  drawSkySparkles(ctx, 18, 144, 'notes');

  const orb = drawThemedOrb(ctx, Math.round(jit(rng, 106, 4)), Math.round(jit(rng, 52, 3)), 19, 'vinyl');
  drawThemedCloud(ctx, 14, Math.round(jit(rng, 248, 5)), Math.round(jit(rng, 40, 3)), 78, 26, 'music');
  drawThemedCloud(ctx, 15, Math.round(jit(rng, 386, 5)), Math.round(jit(rng, 48, 3)), 74, 26, 'music');
  const noteL = drawFloatingMusicNote(ctx, 46, 94, 0.88, 'Echo Note West');
  const noteR = drawFloatingMusicNote(ctx, 434, 96, 0.88, 'Echo Note East');

  drawHorizonHills(ctx, { style: 'rolling', yBase: 162, yBottom: 224, layers: 3 });
  drawGroundDeck(ctx, { style: 'meadow', yTop: 210, yBottom: 250 });

  const hornL = drawBrassHornBloom(ctx, 102, 176, 0.94, 1, 'West Echo');
  const hornC = drawBrassHornBloom(ctx, 240, 168, 1.04, 1, 'Summit Echo');
  const hornR = drawBrassHornBloom(ctx, 378, 176, 0.94, -1, 'East Echo');

  drawGhostSilhouette(ctx, 'Echo Clef Ghost', 'treble', Math.round(jit(rng, 174, 4)), Math.round(jit(rng, 98, 3)), 0.94);
  drawGhostSilhouette(ctx, 'Echo Owl Ghost', 'owl', Math.round(jit(rng, 324, 4)), Math.round(jit(rng, 104, 3)), 0.92);

  const gallopPath = ctx.wavePath('gallop', 66, 234, 412, 232, 9, 1.5, 18);
  const sprintPath = ctx.wavePath('sprint', 80, 236, 400, 234, 8, 2, 18);
  const orbitPath = ctx.ellipsePath('orbit', 240, 92, 166, 44, 24);
  ctx.ellipsePath('ring', 106, 52, orb.rx, orb.ry, 20, orb.tilt);
  ctx.marginPath(256);

  ctx.actor('lumi', 166, 240, { facing: 1, anim: 'idle', pathIndex: gallopPath });
  ctx.actor('nova', 316, 238, { facing: -1, anim: 'idle', pathIndex: sprintPath });
  ctx.actor('gazelle', 426, 240, { facing: -1, anim: 'idle' });
  ctx.actor('comet', 356, 76, { facing: -1, anim: 'float', pathIndex: orbitPath });

  ctx.heroQuest('suns', 'Brass Horns', [...hornL, ...hornC, ...hornR]);
  ctx.heroQuest('cloud', 'Music Clouds', [14, 15, noteL, noteR]);
  ctx.heroQuest('lumi', 'Lumi', [5, 6, 7, 8]);
  ctx.heroQuest('nova', 'Nova', [9, 10, 11]);
}

// ===========================================================================
// CHAPTER 3B: The Wind-Chime Willow Grove (`u10_c3b`)
// ===========================================================================
function buildU10C3b(ctx: SceneCtx): void {
  const { rng } = ctx;
  initChapter(ctx, 4, 240, 168);
  drawSkySparkles(ctx, 20, 146, 'notes');

  const orb = drawThemedOrb(ctx, Math.round(jit(rng, 374, 4)), Math.round(jit(rng, 52, 3)), 19, 'vinyl');
  drawThemedCloud(ctx, 14, Math.round(jit(rng, 104, 5)), Math.round(jit(rng, 44, 3)), 78, 26, 'music');
  drawThemedCloud(ctx, 15, Math.round(jit(rng, 238, 5)), Math.round(jit(rng, 40, 3)), 74, 26, 'music');
  twinkle(ctx, ctx.dyn('star', 'Willow Twinkle'), 440, 94, 12);

  drawHorizonHills(ctx, { style: 'rolling', yBase: 168, yBottom: 224, layers: 2 });
  drawGroundDeck(ctx, { style: 'gardenPath', yTop: 210, yBottom: 250 });

  const willowL = drawWindChimeWillow(ctx, 106, 174, 0.94, 'West Willow');
  const harpMid = drawHarpWaterfall(ctx, 240, 174, 0.88, { label: 'Grove Chime' });
  const willowR = drawWindChimeWillow(ctx, 374, 174, 0.94, 'East Willow');

  drawGhostSilhouette(ctx, 'Chime Butterfly Ghost', 'butterfly', Math.round(jit(rng, 176, 4)), Math.round(jit(rng, 102, 3)), 0.94);
  drawGhostSilhouette(ctx, 'Willow Clef Ghost', 'treble', Math.round(jit(rng, 306, 4)), Math.round(jit(rng, 104, 3)), 0.92);

  const gallopPath = ctx.wavePath('gallop', 66, 234, 412, 232, 9, 1.5, 18);
  const orbitPath = ctx.ellipsePath('orbit', 240, 92, 166, 44, 24);
  ctx.ellipsePath('ring', 374, 52, orb.rx, orb.ry, 20, orb.tilt);
  ctx.marginPath(256);

  ctx.actor('violet', 174, 240, { facing: 1, anim: 'idle' });
  ctx.actor('lumi', 306, 238, { facing: -1, anim: 'idle', pathIndex: gallopPath });
  ctx.actor('moonCat', 240, 238, { facing: 1, anim: 'sleep' });
  ctx.actor('comet', 174, 76, { facing: 1, anim: 'float', pathIndex: orbitPath });

  ctx.heroQuest('lantern', 'Willow Chimes', [...willowL, ...willowR]);
  ctx.heroQuest('piano', 'Grove Harp', harpMid);
  ctx.heroQuest('violet', 'Violet', [1, 2, 3, 4]);
  ctx.heroQuest('lumi', 'Lumi', [5, 6, 7, 8]);
}

// ===========================================================================
// CHAPTER 4A: The Metronome Gazebo Meadow (`u10_c4a`)
// ===========================================================================
function buildU10C4a(ctx: SceneCtx): void {
  const { rng } = ctx;
  initChapter(ctx, 5, 240, 168);
  drawSkySparkles(ctx, 20, 146, 'notes');

  const orb = drawThemedOrb(ctx, Math.round(jit(rng, 108, 4)), Math.round(jit(rng, 52, 3)), 19, 'vinyl');
  drawThemedCloud(ctx, 14, Math.round(jit(rng, 248, 5)), Math.round(jit(rng, 40, 3)), 78, 26, 'music');
  drawThemedCloud(ctx, 15, Math.round(jit(rng, 386, 5)), Math.round(jit(rng, 48, 3)), 74, 26, 'music');

  drawHorizonHills(ctx, { style: 'rolling', yBase: 168, yBottom: 224, layers: 2 });
  drawGroundDeck(ctx, { style: 'meadow', yTop: 210, yBottom: 250 });

  const gazeboIds = drawMetronomeGazebo(ctx, 240, 170, 1.02, 'Star Metronome');
  const pianoL = drawGrandPiano(ctx, 90, 178, 0.84, { label: 'Meadow' });
  const willowR = drawWindChimeWillow(ctx, 390, 174, 0.88, 'Meadow Willow');

  drawGhostSilhouette(ctx, 'Rhythm Clef Ghost', 'treble', Math.round(jit(rng, 168, 4)), Math.round(jit(rng, 102, 3)), 0.94);
  drawGhostSilhouette(ctx, 'Songbird Moth Ghost', 'butterfly', Math.round(jit(rng, 326, 4)), Math.round(jit(rng, 104, 3)), 0.92);

  const sprintPath = ctx.wavePath('sprint', 68, 234, 412, 232, 9, 2, 18);
  const orbitPath = ctx.ellipsePath('orbit', 240, 92, 166, 44, 24);
  ctx.ellipsePath('ring', 108, 52, orb.rx, orb.ry, 20, orb.tilt);
  ctx.marginPath(256);

  ctx.actor('violet', 166, 240, { facing: 1, anim: 'idle' });
  ctx.actor('nova', 318, 238, { facing: -1, anim: 'sleep', pathIndex: sprintPath });
  ctx.actor('gazelle', 426, 240, { facing: -1, anim: 'idle' });
  ctx.actor('comet', 352, 76, { facing: -1, anim: 'float', pathIndex: orbitPath });

  ctx.heroQuest('tent', 'Music Gazebo', gazeboIds);
  ctx.heroQuest('piano', 'Meadow Piano', [...pianoL, ...willowR]);
  ctx.heroQuest('violet', 'Violet', [1, 2, 3, 4]);
  ctx.heroQuest('nova', 'Nova', [9, 10, 11]);
}

// ===========================================================================
// CHAPTER 4B: The Celesta Bell-Tower Overlook (`u10_c4b`)
// ===========================================================================
function buildU10C4b(ctx: SceneCtx): void {
  const { rng } = ctx;
  initChapter(ctx, 6, 240, 164);
  drawSkySparkles(ctx, 20, 146, 'notes');

  const orb = drawThemedOrb(ctx, Math.round(jit(rng, 374, 4)), Math.round(jit(rng, 52, 3)), 19, 'vinyl');
  drawThemedCloud(ctx, 14, Math.round(jit(rng, 104, 5)), Math.round(jit(rng, 44, 3)), 78, 26, 'music');
  drawThemedCloud(ctx, 15, Math.round(jit(rng, 238, 5)), Math.round(jit(rng, 40, 3)), 74, 26, 'music');
  const noteL = drawFloatingMusicNote(ctx, 44, 96, 0.88, 'Overlook Note');

  drawHorizonHills(ctx, { style: 'clouds', yBase: 168, yBottom: 224, layers: 2 });
  drawGroundDeck(ctx, { style: 'stage', yTop: 210, yBottom: 250 });

  const towerIds = drawCelestaTower(ctx, 240, 164, 1.04, 'Celesta Bell-Tower');
  const vinylL = drawVinylMoon(ctx, 94, 174, 0.86, { label: 'Overlook' });
  const hornR = drawBrassHornBloom(ctx, 392, 174, 0.92, -1, 'Overlook Horn');

  drawGhostSilhouette(ctx, 'Belfry Owl Ghost', 'owl', Math.round(jit(rng, 164, 4)), Math.round(jit(rng, 104, 3)), 0.94);
  drawGhostSilhouette(ctx, 'Celesta Clef Ghost', 'treble', Math.round(jit(rng, 316, 4)), Math.round(jit(rng, 104, 3)), 0.92);

  const gallopPath = ctx.wavePath('gallop', 66, 234, 412, 232, 9, 1.5, 18);
  const orbitPath = ctx.ellipsePath('orbit', 240, 92, 166, 44, 24);
  ctx.ellipsePath('ring', 374, 52, orb.rx, orb.ry, 20, orb.tilt);
  ctx.marginPath(256);

  ctx.actor('violet', 164, 240, { facing: 1, anim: 'idle' });
  ctx.actor('lumi', 322, 238, { facing: -1, anim: 'idle', pathIndex: gallopPath });
  ctx.actor('moonCat', 240, 112, { facing: 1, anim: 'sleep' });
  ctx.actor('comet', 174, 78, { facing: 1, anim: 'float', pathIndex: orbitPath });

  ctx.heroQuest('lantern', 'Celesta Tower', [...towerIds, noteL]);
  ctx.heroQuest('piano', 'Overlook Disc', [...vinylL, ...hornR]);
  ctx.heroQuest('violet', 'Violet', [1, 2, 3, 4]);
  ctx.heroQuest('lumi', 'Lumi', [5, 6, 7, 8]);
}

// ===========================================================================
// CHAPTER 5 (FINALE): The Grand Starlight Symphony Shell (`u10_c5`, 50..70 regions!)
// ===========================================================================
function buildU10C5(ctx: SceneCtx): void {
  const { r, rng } = ctx;
  initChapter(ctx, 7, 240, 136);
  drawSkySparkles(ctx, 22, 128, 'notes');

  // 1) 14 radiating Acoustic Symphony Shell Ribs fanning behind the Grand Stage (14 regions!)
  const cx = 240;
  const cy = 152;
  const ribs = 14;
  for (let i = 0; i < ribs; i++) {
    const a0 = -Math.PI * 0.9 + (i * Math.PI * 0.8) / ribs;
    const a1 = -Math.PI * 0.9 + ((i + 0.86) * Math.PI * 0.8) / ribs;
    const aMid = (a0 + a1) * 0.5;
    const id = ctx.dyn('star', `Symphony Shell Rib ${i + 1}`);
    const r0 = 66;
    const r1 = i % 2 === 0 ? 124 : 114;
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
      cx + Math.cos(aMid) * (r1 - 12) * sx,
      cy + Math.sin(aMid) * (r1 - 12) * sy,
      { only: [id] },
    );
  }

  // 2) Core Orb (12/13), Mirrored Treble Note Medallion, Zenith Star, Music Clouds (14/15) (6 regions)
  const orb = drawThemedOrb(ctx, 56, 48, 16, 'vinyl');
  drawFloatingMusicNote(ctx, 422, 52, 1.12, 'Symphony Treble Crest');
  star(ctx, ctx.dyn('star', 'Conductor Zenith Star'), 240, 20, 11, { points: 5, inner: 0.48 });

  drawThemedCloud(ctx, 14, 54, 126, 74, 26, 'music');
  drawThemedCloud(ctx, 15, 426, 126, 74, 26, 'music');

  // 3) Horizon + Grand Concert Stage Deck (4 regions)
  drawHorizonHills(ctx, { style: 'clouds', yBase: 170, yBottom: 224, layers: 2 });
  drawGroundDeck(ctx, { style: 'stage', yTop: 214, yBottom: 250 });

  // 4) Full Orchestra Ensemble Panorama (19 regions): Grand Piano + 2 Harps + Vinyl + Celesta + 2 Brass Horns
  const pianoIds = drawGrandPiano(ctx, 240, 178, 1.0, { label: 'Symphony' });
  const harpL = drawHarpWaterfall(ctx, 118, 170, 0.84, { label: 'West Orchestra' });
  const harpR = drawHarpWaterfall(ctx, 362, 170, 0.84, { label: 'East Orchestra', flip: -1 });
  drawVinylMoon(ctx, 46, 184, 0.72, { label: 'West Stage' });
  drawCelestaTower(ctx, 434, 178, 0.72, 'East Stage');
  drawBrassHornBloom(ctx, 172, 176, 0.72, 1, 'West Ensemble');
  drawBrassHornBloom(ctx, 308, 176, 0.72, -1, 'East Ensemble');

  // 5) 3 Ghosts in clean open upper-sky pockets
  drawGhostSilhouette(ctx, 'Symphony Clef Ghost', 'treble', Math.round(jit(rng, 144, 3)), Math.round(jit(rng, 28, 2)), 0.88);
  drawGhostSilhouette(ctx, 'Harmony Moth Ghost', 'butterfly', Math.round(jit(rng, 336, 3)), Math.round(jit(rng, 28, 2)), 0.88);
  drawGhostSilhouette(ctx, 'Conductor Owl Ghost', 'owl', Math.round(jit(rng, 444, 3)), Math.round(jit(rng, 90, 2)), 0.84);

  // 6) Paths & Full Hero Cast (14 actor regions -> total ~57 regions!)
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

  ctx.heroQuest('piano', 'Concert Stage', [...pianoIds, ...harpL, ...harpR]);
  ctx.heroQuest('violet', 'Violet', [1, 2, 3, 4]);
  ctx.heroQuest('lumi', 'Lumi', [5, 6, 7, 8]);
  ctx.heroQuest('nova', 'Nova', [9, 10, 11]);
}

export const U10_SCENES: Record<U10SceneId, (ctx: SceneCtx) => void> = {
  hub_melodyMeadow: buildHubMelodyMeadow,
  u10_c1: buildU10C1,
  u10_c2a: buildU10C2a,
  u10_c2b: buildU10C2b,
  u10_c3a: buildU10C3a,
  u10_c3b: buildU10C3b,
  u10_c4a: buildU10C4a,
  u10_c4b: buildU10C4b,
  u10_c5: buildU10C5,
};
