/**
 * Universe 18: Neon Rainbow Arcade (`neonPixelArcade`)
 * 9 bespoke deterministic procedural scenes: 1 Hub Sanctuary + 8 Chapters (incl. Slot-5 Grand Finale).
 */
import { MaterialId } from '../../contracts/materials';
import { UNIVERSE_BY_ID } from '../../contracts/universes';
import type { SceneCtx } from '../context';
import {
  drawArcadeCabinet,
  drawClawMachine,
  drawClockworkGear,
  drawGhostSilhouette,
  drawGroundDeck,
  drawHorizonHills,
  drawSanctuaryRoom,
  drawSkySparkles,
  drawThemedCloud,
  drawThemedOrb,
  drawVinylMoon,
} from '../kit';
import { inkArc, jit, star } from '../props';
import { INK, W, type Pt } from '../raster';

const U = UNIVERSE_BY_ID.neonPixelArcade;

export type U18SceneId =
  | 'hub_neonPixelArcade'
  | 'u18_c1'
  | 'u18_c2a'
  | 'u18_c2b'
  | 'u18_c3a'
  | 'u18_c3b'
  | 'u18_c4a'
  | 'u18_c4b'
  | 'u18_c5';

function initChapter(ctx: SceneCtx, id: Exclude<U18SceneId, 'hub_neonPixelArcade'>, fx: number, fy: number): void {
  const ch = U.chapters.find((c) => c.id === id)!;
  ctx.title = ch.title;
  ctx.sky = { ...U.sky };
  ctx.universeId = U.id;
  ctx.ambient = U.ambient;
  ctx.focal = { x: fx, y: fy };
}

/** Chunky 8-bit stepped pixel heart region (>= 140px). */
function drawPixelHeart(ctx: SceneCtx, id: number, cx: number, cy: number, u: number): void {
  const { r } = ctx;
  const rows = [
    '01100110',
    '11111111',
    '11111111',
    '11111111',
    '01111110',
    '00111100',
    '00011000',
  ];
  const ox = Math.round(cx - 4 * u);
  const oy = Math.round(cy - 3.5 * u);
  for (let ry = 0; ry < rows.length; ry++) {
    const row = rows[ry]!;
    for (let rx = 0; rx < row.length; rx++) {
      if (row[rx] === '1') {
        r.rect(id, ox + rx * u, oy + ry * u, ox + (rx + 1) * u, oy + (ry + 1) * u);
      }
    }
  }
  r.line(INK, ox + u * 2, oy + u * 1.5, ox + u * 3, oy + u * 1.5, { only: [id] });
}

/** Illuminated retro marquee entrance archway (2 regions). */
function drawNeonMarqueeArch(ctx: SceneCtx, x: number, y: number, s: number, label: string): number[] {
  const { r } = ctx;
  const pillars = ctx.dyn('prop', `${label} Neon Pillars`);
  const sign = ctx.dyn('star', `${label} Marquee Sign`);

  r.rect(pillars, x - 52 * s, y - 24 * s, x - 34 * s, y + 38 * s);
  r.rect(pillars, x + 34 * s, y - 24 * s, x + 52 * s, y + 38 * s);
  r.line(INK, x - 43 * s, y - 18 * s, x - 43 * s, y + 34 * s, { only: [pillars] });
  r.line(INK, x + 43 * s, y - 18 * s, x + 43 * s, y + 34 * s, { only: [pillars] });

  r.rect(sign, x - 60 * s, y - 44 * s, x + 60 * s, y - 18 * s);
  r.poly(sign, [[x - 36 * s, y - 44 * s], [x, y - 56 * s], [x + 36 * s, y - 44 * s]]);
  for (let lx = -48; lx <= 48; lx += 16) {
    inkArc(r, x + lx * s, y - 31 * s, 3 * s, 3 * s, 0, Math.PI * 2, 0, { only: [sign] });
  }
  return [pillars, sign];
}

/** Glowing 8-bit star trophy chalice (2 regions). */
function drawHoloTrophy(ctx: SceneCtx, x: number, y: number, s: number, label: string, pre?: readonly MaterialId[]): number[] {
  const { r } = ctx;
  const base = ctx.dyn('prop', `${label} Pedestal`);
  const cup = ctx.dyn('star', `${label} Trophy`);

  r.poly(base, [[x - 20 * s, y + 18 * s], [x + 20 * s, y + 18 * s], [x + 26 * s, y + 34 * s], [x - 26 * s, y + 34 * s]]);
  r.rect(base, x - 7 * s, y + 6 * s, x + 7 * s, y + 20 * s);
  r.line(INK, x - 18 * s, y + 26 * s, x + 18 * s, y + 26 * s, { only: [base] });

  r.poly(cup, [
    [x - 24 * s, y - 20 * s],
    [x + 24 * s, y - 20 * s],
    [x + 16 * s, y + 8 * s],
    [x - 16 * s, y + 8 * s],
  ]);
  r.capsule(cup, x - 22 * s, y - 14 * s, x - 30 * s, y - 2 * s, 4 * s);
  r.capsule(cup, x + 22 * s, y - 14 * s, x + 30 * s, y - 2 * s, 4 * s);
  r.line(INK, x - 14 * s, y - 10 * s, x + 14 * s, y - 10 * s, { only: [cup] });

  if (pre && pre.length >= 2) {
    ctx.preColor(base, pre[0]!);
    ctx.preColor(cup, pre[1]!);
  }
  return [base, cup];
}

/** Chunky retro pixel star (>= 110px). */
function pixelStar(ctx: SceneCtx, label: string, x: number, y: number, rad = 12): number {
  const id = ctx.dyn('star', label);
  star(ctx, id, x, y, rad, { points: 4, inner: 0.48, rot: -Math.PI / 2 });
  return id;
}

// ===========================================================================
// HUB SANCTUARY: Violet's Synthwave Pixel Lounge
// ===========================================================================
function buildHubNeonPixelArcade(ctx: SceneCtx): void {
  ctx.universeId = U.id;
  ctx.ambient = U.ambient;

  drawSanctuaryRoom(ctx, {
    title: U.hubTitle,
    sky: { ...U.sky },
    palette: {
      wallPanel: MaterialId.VelvetNebula,
      floor: MaterialId.DeepSpaceBiolum,
      windowFrame: MaterialId.NeonCyberCheetah,
      windowGlass: MaterialId.RoyalAstralGold,
      curtain: MaterialId.CosmicCottonSwirl,
      orbCore: MaterialId.NeonCyberCheetah,
      orbRing: MaterialId.CrystalGlacierMint,
      rugOuter: MaterialId.NeonCyberCheetah,
      rugInner: MaterialId.HoloFoil,
      furniture: MaterialId.SupernovaGlitter,
      furnitureTrim: MaterialId.CrystalGlacierMint,
      accentA: MaterialId.NeonCyberCheetah,
      accentB: MaterialId.CrystalGlacierMint,
      accentC: MaterialId.SolarFlare24K,
    },
    windowShape: 'pixel',
    windowOrbStyle: 'pixelPlanet',
    wallStyle: 'arcade',
    floorStyle: 'neon',
    rugShape: 'diamond',
    lampStyle: 'neon',
    garlandStyle: 'hearts',
    sparkleStyle: 'stars',
    seatingLabel: 'Synthwave Beanbag Couch',
    workbenchLabel: 'Pixel Cartridge Desk',
    shelfLabel: 'High-Score Cartridge Shelf',
    trinketLabels: ['8-Bit Cartridges', 'Holo Trophies', 'Star Tokens'],
    drawWindowView: (c, wx, _wy, _wh, wBot) => {
      const skyline = c.dyn('prop', 'Synthwave Horizon');
      c.r.poly(skyline, [
        [wx - 34, wBot - 2],
        [wx - 34, wBot - 20],
        [wx - 16, wBot - 28],
        [wx, wBot - 16],
        [wx + 18, wBot - 28],
        [wx + 34, wBot - 18],
        [wx + 34, wBot - 2],
      ]);
      c.r.line(INK, wx - 32, wBot - 10, wx + 32, wBot - 10, { only: [skyline] });
      c.preColor(skyline, MaterialId.NeonCyberCheetah);
    },
    drawExtraProps: (c) => {
      const ids: number[] = [];
      // Left wall: glowing neon pixel-heart arcade sign (x = 76, y = 94)
      const signFrame = c.dyn('prop', 'Neon Sign Frame');
      c.r.rect(signFrame, 38, 68, 114, 118);
      c.r.line(INK, 42, 72, 110, 72, { only: [signFrame] });
      c.r.line(INK, 42, 114, 110, 114, { only: [signFrame] });
      c.preColor(signFrame, MaterialId.DeepSpaceBiolum);
      ids.push(signFrame);

      const heartSign = c.dyn('star', 'Pixel Heart Neon');
      drawPixelHeart(c, heartSign, 76, 94, 4);
      c.preColor(heartSign, MaterialId.NeonCyberCheetah);
      ids.push(heartSign);

      // Right-center floor: mini tabletop arcade pedestal (x = 278, y = 186)
      const miniCab = c.dyn('prop', 'Mini Arcade Cabinet');
      c.r.rect(miniCab, 264, 160, 294, 224);
      c.r.line(INK, 266, 194, 292, 194, { only: [miniCab] });
      c.preColor(miniCab, MaterialId.SupernovaGlitter);
      ids.push(miniCab);

      const miniScreen = c.dyn('star', 'Mini Pixel Screen');
      c.r.rect(miniScreen, 269, 168, 289, 188);
      c.r.line(INK, 274, 178, 284, 178, { only: [miniScreen] });
      c.preColor(miniScreen, MaterialId.CrystalGlacierMint);
      ids.push(miniScreen);

      // Right desk topper: glowing high-score pixel trophy (x = 376, y = 160)
      ids.push(...drawHoloTrophy(c, 376, 164, 0.48, 'Desk', [MaterialId.RoyalAstralGold, MaterialId.SolarFlare24K]));

      return ids;
    },
  });
}

// ===========================================================================
// U18 C1: The Glowing Token Lobby
// ===========================================================================
function buildU18C1(ctx: SceneCtx): void {
  const { r, rng } = ctx;
  initChapter(ctx, 'u18_c1', 240, 152);

  drawSkySparkles(ctx, 18, 134, 'hearts');

  const orbX = Math.round(jit(rng, 396, 4));
  const orbY = Math.round(jit(rng, 52, 3));
  const orb = drawThemedOrb(ctx, orbX, orbY, 21, 'pixelPlanet');

  drawThemedCloud(ctx, 14, Math.round(jit(rng, 88, 4)), Math.round(jit(rng, 44, 3)), 84, 26, 'pixel');
  drawThemedCloud(ctx, 15, Math.round(jit(rng, 250, 4)), Math.round(jit(rng, 38, 3)), 78, 24, 'pixel');

  drawHorizonHills(ctx, { style: 'castle', yBase: 152, yBottom: 214, layers: 2, labelPrefix: 'Neon' });
  drawGroundDeck(ctx, { style: 'stage', yTop: 206, yBottom: 250, labelPrefix: 'Lobby' });

  // Marquee token lobby gate + flanking claw machine & arcade cabinet
  const archIds = drawNeonMarqueeArch(ctx, 240, 172, 0.96, 'Token');
  const clawIds = drawClawMachine(ctx, 90, 174, 0.88, { label: 'Lobby' });
  const cabIds = drawArcadeCabinet(ctx, 392, 174, 0.9, { label: 'Lobby' });

  // Giant spinning gold star token floating inside the lobby arch
  const token = ctx.dyn('star', 'Giant Star Token');
  r.disc(token, 240, 176, 16);
  inkArc(r, 240, 176, 11, 11, 0, Math.PI * 2, 0, { only: [token] });

  pixelStar(ctx, 'Lobby Pixel Star', Math.round(jit(rng, 166, 3)), Math.round(jit(rng, 72, 3)), 11.5);

  drawGhostSilhouette(ctx, 'Lobby 8-Bit Heart Ghost', 'pixelHeart', Math.round(jit(rng, 154, 3)), Math.round(jit(rng, 108, 3)), 0.95);
  drawGhostSilhouette(ctx, 'Arcade Robot Ghost', 'robot', Math.round(jit(rng, 326, 3)), Math.round(jit(rng, 98, 3)), 0.95);
  drawGhostSilhouette(ctx, 'Pixel Cat Ghost', 'cat', Math.round(jit(rng, 446, 3)), Math.round(jit(rng, 112, 3)), 0.9);

  ctx.ellipsePath('ring', orbX, orbY, orb.rx, orb.ry, 24, orb.tilt);
  const sprintPath = ctx.wavePath('sprint', 56, 234, 424, 232, 9, 2, 18);
  const orbitPath = ctx.ellipsePath('orbit', 240, 88, 172, 44, 24);
  ctx.marginPath(256);

  ctx.actor('violet', 176, 242, { facing: 1, anim: 'idle' });
  ctx.actor('nova', 304, 240, { facing: -1, anim: 'leap', pathIndex: sprintPath });
  ctx.actor('cometCar', 428, 240, { facing: -1, anim: 'run', pathIndex: sprintPath });
  ctx.actor('comet', 312, 62, { facing: -1, anim: 'float', pathIndex: orbitPath });

  ctx.heroQuest('arcade', 'Token Gate', [...archIds, token]);
  ctx.heroQuest('lantern', 'Arcade Row', [...clawIds, ...cabIds]);
  ctx.heroQuest('violet', 'Violet', [1, 2, 3, 4]);
  ctx.heroQuest('planet', 'Pixel Planet', [12, 13]);
}

// ===========================================================================
// U18 C2A: The Rainbow Arcade-Cabinet Row
// ===========================================================================
function buildU18C2A(ctx: SceneCtx): void {
  const { r, rng } = ctx;
  initChapter(ctx, 'u18_c2a', 240, 156);

  drawSkySparkles(ctx, 18, 132, 'stars');

  const orbX = Math.round(jit(rng, 82, 4));
  const orbY = Math.round(jit(rng, 52, 3));
  const orb = drawThemedOrb(ctx, orbX, orbY, 21, 'pixelPlanet');

  drawThemedCloud(ctx, 14, Math.round(jit(rng, 224, 4)), Math.round(jit(rng, 42, 3)), 84, 26, 'pixel');
  drawThemedCloud(ctx, 15, Math.round(jit(rng, 396, 4)), Math.round(jit(rng, 46, 3)), 82, 26, 'pixel');

  drawHorizonHills(ctx, { style: 'peaks', yBase: 150, yBottom: 214, layers: 2, labelPrefix: 'Synth' });
  drawGroundDeck(ctx, { style: 'stage', yTop: 206, yBottom: 250, labelPrefix: 'Arcade' });

  // Three iconic retro arcade cabinets side-by-side with crisp spacing
  const cabL = drawArcadeCabinet(ctx, 98, 174, 0.92, { label: 'Left' });
  const cabC = drawArcadeCabinet(ctx, 240, 166, 1.02, { label: 'Center' });
  const cabR = drawArcadeCabinet(ctx, 382, 174, 0.92, { label: 'Right' });

  // Overhead neon pixel-heart sign floating above center cabinet
  const heartBanner = ctx.dyn('star', 'High-Score Heart');
  drawPixelHeart(ctx, heartBanner, 240, 96, 4.5);
  r.line(INK, 194, 114, 286, 114, { only: [heartBanner] });

  pixelStar(ctx, '8-Bit Star West', Math.round(jit(rng, 166, 3)), Math.round(jit(rng, 108, 3)), 11);
  pixelStar(ctx, '8-Bit Star East', Math.round(jit(rng, 314, 3)), Math.round(jit(rng, 108, 3)), 11);

  drawGhostSilhouette(ctx, 'Cabinet Heart Ghost', 'pixelHeart', Math.round(jit(rng, 158, 3)), Math.round(jit(rng, 68, 3)), 0.95);
  drawGhostSilhouette(ctx, 'Cabinet Robot Ghost', 'robot', Math.round(jit(rng, 324, 3)), Math.round(jit(rng, 70, 3)), 0.95);

  ctx.ellipsePath('ring', orbX, orbY, orb.rx, orb.ry, 24, orb.tilt);
  const gallopPath = ctx.wavePath('gallop', 58, 234, 422, 232, 9, 1.5, 18);
  const orbitPath = ctx.ellipsePath('orbit', 240, 86, 172, 44, 24);
  ctx.marginPath(256);

  ctx.actor('violet', 168, 242, { facing: 1, anim: 'idle' });
  ctx.actor('lumi', 312, 242, { facing: -1, anim: 'idle', pathIndex: gallopPath });
  ctx.actor('moonCat', 42, 236, { facing: 1, anim: 'sleep' });
  ctx.actor('comet', 356, 100, { facing: -1, anim: 'float', pathIndex: orbitPath });

  ctx.heroQuest('arcade', 'Hero Cabinet', [...cabC, heartBanner]);
  ctx.heroQuest('lantern', 'Side Cabinets', [...cabL, ...cabR]);
  ctx.heroQuest('lumi', 'Lumi', [5, 6, 7, 8]);
  ctx.heroQuest('planet', '8-Bit Planet', [12, 13]);
}

// ===========================================================================
// U18 C2B: The Plushie Star-Claw Machine
// ===========================================================================
function buildU18C2B(ctx: SceneCtx): void {
  const { r, rng } = ctx;
  initChapter(ctx, 'u18_c2b', 240, 152);

  drawSkySparkles(ctx, 18, 134, 'hearts');

  const orbX = Math.round(jit(rng, 396, 4));
  const orbY = Math.round(jit(rng, 52, 3));
  const orb = drawThemedOrb(ctx, orbX, orbY, 21, 'pixelPlanet');

  drawThemedCloud(ctx, 14, Math.round(jit(rng, 92, 4)), Math.round(jit(rng, 44, 3)), 84, 26, 'pixel');
  drawThemedCloud(ctx, 15, Math.round(jit(rng, 250, 4)), Math.round(jit(rng, 38, 3)), 80, 24, 'pixel');

  drawHorizonHills(ctx, { style: 'castle', yBase: 152, yBottom: 214, layers: 2, labelPrefix: 'Plush' });
  drawGroundDeck(ctx, { style: 'counter', yTop: 206, yBottom: 250, labelPrefix: 'Prize' });

  // Oversized hero star-claw machine centerpiece + companion claw booth & giant plushie display
  const mainClaw = drawClawMachine(ctx, 240, 166, 1.06, { label: 'Grand' });
  const sideClaw = drawClawMachine(ctx, 94, 176, 0.84, { label: 'Mini' });

  // Right plushie prize showcase pedestal with giant star-bear silhouette
  const ped = ctx.dyn('prop', 'Plushie Showcase Stand');
  r.rect(ped, 350, 186, 424, 212);
  r.line(INK, 354, 198, 420, 198, { only: [ped] });

  const bear = ctx.dyn('star', 'Giant Star Plushie');
  r.disc(bear, 387, 168, 16);
  r.disc(bear, 387, 144, 13);
  r.disc(bear, 375, 133, 6);
  r.disc(bear, 399, 133, 6);
  inkArc(r, 387, 146, 5, 3, 0.1, Math.PI - 0.1, 0, { only: [bear] });

  pixelStar(ctx, 'Plushie Star', Math.round(jit(rng, 166, 3)), Math.round(jit(rng, 88, 3)), 11.5);

  drawGhostSilhouette(ctx, 'Plush Heart Ghost', 'pixelHeart', Math.round(jit(rng, 164, 3)), Math.round(jit(rng, 52, 3)), 0.92);
  drawGhostSilhouette(ctx, 'Plush Balloon Ghost', 'balloon', Math.round(jit(rng, 326, 3)), Math.round(jit(rng, 88, 3)), 0.95);
  drawGhostSilhouette(ctx, 'Plush Cat Ghost', 'cat', Math.round(jit(rng, 444, 3)), Math.round(jit(rng, 112, 3)), 0.9);

  ctx.ellipsePath('ring', orbX, orbY, orb.rx, orb.ry, 24, orb.tilt);
  const sprintPath = ctx.wavePath('sprint', 58, 234, 422, 232, 9, 2, 18);
  const orbitPath = ctx.ellipsePath('orbit', 240, 88, 170, 44, 24);
  ctx.marginPath(256);

  ctx.actor('violet', 164, 242, { facing: 1, anim: 'idle' });
  ctx.actor('nova', 318, 240, { facing: -1, anim: 'leap', pathIndex: sprintPath });
  ctx.actor('moonCat', 428, 236, { facing: -1, anim: 'peek' });
  ctx.actor('comet', 318, 52, { facing: -1, anim: 'float', pathIndex: orbitPath });

  ctx.heroQuest('arcade', 'Star Claw', mainClaw);
  ctx.heroQuest('heart', 'Plush Prizes', [...sideClaw, ped, bear]);
  ctx.heroQuest('nova', 'Nova', [9, 10, 11]);
  ctx.heroQuest('violet', 'Violet', [1, 2, 3, 4]);
}

// ===========================================================================
// U18 C3A: The Synthwave Roller-Rink Grid
// ===========================================================================
function buildU18C3A(ctx: SceneCtx): void {
  const { r, rng } = ctx;
  initChapter(ctx, 'u18_c3a', 240, 152);

  drawSkySparkles(ctx, 20, 134, 'stars');

  const orbX = Math.round(jit(rng, 82, 4));
  const orbY = Math.round(jit(rng, 52, 3));
  const orb = drawThemedOrb(ctx, orbX, orbY, 21, 'pixelPlanet');

  drawThemedCloud(ctx, 14, Math.round(jit(rng, 242, 4)), Math.round(jit(rng, 38, 3)), 84, 26, 'pixel');
  drawThemedCloud(ctx, 15, Math.round(jit(rng, 400, 4)), Math.round(jit(rng, 46, 3)), 80, 26, 'pixel');

  drawHorizonHills(ctx, { style: 'peaks', yBase: 146, yBottom: 204, layers: 2, labelPrefix: 'Rink' });
  drawGroundDeck(ctx, { style: 'stage', yTop: 196, yBottom: 250, labelPrefix: 'Roller' });

  // Glowing oval roller-rink speed track inlaid on the deck
  const rinkTrack = ctx.dyn('star', 'Neon Skate Track');
  r.shape(rinkTrack, 64, 200, 416, 242, (px, py) => {
    const outer = ((px - 240) / 168) ** 2 + ((py - 221) / 18) ** 2;
    const inner = ((px - 240) / 118) ** 2 + ((py - 221) / 9) ** 2;
    return outer <= 1 && inner >= 1;
  });

  // Suspended pulsing Synthwave Disco Cube overhead!
  const disco = ctx.dyn('star', 'Pulsing Disco Cube');
  r.poly(disco, [[240, 74], [268, 92], [268, 124], [240, 142], [212, 124], [212, 92]]);
  r.line(INK, 240, 76, 240, 140, { only: [disco] });
  r.line(INK, 214, 94, 240, 108, { only: [disco] });
  r.line(INK, 266, 94, 240, 108, { only: [disco] });
  r.line(INK, 214, 110, 240, 124, { only: [disco] });
  r.line(INK, 266, 110, 240, 124, { only: [disco] });

  // DJ arcade booth left + giant neon vinyl speaker right
  const djIds = drawArcadeCabinet(ctx, 88, 166, 0.88, { label: 'DJ' });
  const vinylIds = drawVinylMoon(ctx, 392, 162, 0.9, { label: 'Synth' });

  pixelStar(ctx, 'Disco Laser West', 162, 108, 11.5);
  pixelStar(ctx, 'Disco Laser East', 318, 108, 11.5);

  drawGhostSilhouette(ctx, 'Rink Robot Ghost', 'robot', Math.round(jit(rng, 164, 3)), Math.round(jit(rng, 68, 3)), 0.92);
  drawGhostSilhouette(ctx, 'Rink Music Ghost', 'treble', Math.round(jit(rng, 326, 3)), Math.round(jit(rng, 70, 3)), 0.92);

  ctx.ellipsePath('ring', orbX, orbY, orb.rx, orb.ry, 24, orb.tilt);
  const sprintPath = ctx.ellipsePath('sprint', 240, 222, 146, 15, 24);
  const orbitPath = ctx.ellipsePath('orbit', 240, 88, 174, 46, 24);
  ctx.marginPath(256);

  ctx.actor('nova', 168, 232, { facing: 1, anim: 'leap', pathIndex: sprintPath });
  ctx.actor('cometCar', 258, 236, { facing: 1, anim: 'run', pathIndex: sprintPath });
  ctx.actor('gazelle', 356, 232, { facing: -1, anim: 'run', pathIndex: sprintPath });
  ctx.actor('comet', 314, 142, { facing: -1, anim: 'float', pathIndex: orbitPath });

  ctx.heroQuest('arcade', 'Disco Rink', [disco, rinkTrack]);
  ctx.heroQuest('lantern', 'Synth Booth', [...djIds, ...vinylIds]);
  ctx.heroQuest('nova', 'Nova', [9, 10, 11]);
  ctx.heroQuest('planet', 'Synth Planet', [12, 13]);
}

// ===========================================================================
// U18 C3B: The Cosmic Pinball Bumper Deck
// ===========================================================================
function buildU18C3B(ctx: SceneCtx): void {
  const { r, rng } = ctx;
  initChapter(ctx, 'u18_c3b', 240, 152);

  drawSkySparkles(ctx, 18, 134, 'stars');

  const orbX = Math.round(jit(rng, 396, 4));
  const orbY = Math.round(jit(rng, 52, 3));
  const orb = drawThemedOrb(ctx, orbX, orbY, 21, 'pixelPlanet');

  drawThemedCloud(ctx, 14, Math.round(jit(rng, 88, 4)), Math.round(jit(rng, 44, 3)), 84, 26, 'pixel');
  drawThemedCloud(ctx, 15, Math.round(jit(rng, 246, 4)), Math.round(jit(rng, 38, 3)), 80, 24, 'pixel');

  drawHorizonHills(ctx, { style: 'castle', yBase: 154, yBottom: 214, layers: 2, labelPrefix: 'Pinball' });
  drawGroundDeck(ctx, { style: 'stage', yTop: 206, yBottom: 250, labelPrefix: 'Pinball' });

  // Bespoke giant cosmic pinball mushroom bumpers + twin neon flippers!
  const bumpL = ctx.dyn('star', 'Left Star Bumper');
  r.disc(bumpL, 194, 138, 18);
  inkArc(r, 194, 138, 11, 11, 0, Math.PI * 2, 0, { only: [bumpL] });

  const bumpC = ctx.dyn('star', 'Crown Star Bumper');
  r.disc(bumpC, 244, 108, 20);
  inkArc(r, 244, 108, 12, 12, 0, Math.PI * 2, 0, { only: [bumpC] });

  const bumpR = ctx.dyn('star', 'Right Star Bumper');
  r.disc(bumpR, 294, 140, 18);
  inkArc(r, 294, 140, 11, 11, 0, Math.PI * 2, 0, { only: [bumpR] });

  const flippers = ctx.dyn('prop', 'Neon Pinball Flippers');
  r.capsule(flippers, 168, 182, 224, 198, 7.5);
  r.capsule(flippers, 316, 182, 260, 198, 7.5);
  inkArc(r, 172, 182, 4, 4, 0, Math.PI * 2, 0, { only: [flippers] });
  inkArc(r, 312, 182, 4, 4, 0, Math.PI * 2, 0, { only: [flippers] });

  // Flanking arcade backbox left + turbo spinner gear right
  const cabIds = drawArcadeCabinet(ctx, 84, 174, 0.88, { label: 'Pinball' });
  const gearIds = drawClockworkGear(ctx, 396, 170, 0.9, { label: 'Turbo' });

  drawGhostSilhouette(ctx, 'Pinball Heart Ghost', 'pixelHeart', Math.round(jit(rng, 152, 3)), Math.round(jit(rng, 82, 3)), 0.92);
  drawGhostSilhouette(ctx, 'Pinball Robot Ghost', 'robot', Math.round(jit(rng, 326, 3)), Math.round(jit(rng, 82, 3)), 0.92);
  drawGhostSilhouette(ctx, 'Pinball Cat Ghost', 'cat', Math.round(jit(rng, 444, 3)), Math.round(jit(rng, 112, 3)), 0.9);

  ctx.ellipsePath('ring', orbX, orbY, orb.rx, orb.ry, 24, orb.tilt);
  const gallopPath = ctx.wavePath('gallop', 62, 234, 418, 232, 9, 1.5, 18);
  const orbitPath = ctx.ellipsePath('orbit', 240, 96, 168, 48, 24);
  ctx.marginPath(256);

  ctx.actor('violet', 148, 242, { facing: 1, anim: 'idle' });
  ctx.actor('lumi', 262, 242, { facing: 1, anim: 'rear', pathIndex: gallopPath });
  ctx.actor('cometCar', 370, 240, { facing: -1, anim: 'run', pathIndex: gallopPath });
  ctx.actor('comet', 244, 162, { facing: 1, anim: 'float', pathIndex: orbitPath });

  ctx.heroQuest('heart', 'Star Bumpers', [bumpL, bumpC, bumpR, flippers]);
  ctx.heroQuest('arcade', 'Pinball Deck', [...cabIds, ...gearIds]);
  ctx.heroQuest('lumi', 'Lumi', [5, 6, 7, 8]);
  ctx.heroQuest('planet', 'Pinball Orb', [12, 13]);
}

// ===========================================================================
// U18 C4A: The Pixel-Heart Dance-Pad Plaza
// ===========================================================================
function buildU18C4A(ctx: SceneCtx): void {
  const { r, rng } = ctx;
  initChapter(ctx, 'u18_c4a', 240, 152);

  drawSkySparkles(ctx, 18, 132, 'hearts');

  const orbX = Math.round(jit(rng, 82, 4));
  const orbY = Math.round(jit(rng, 52, 3));
  const orb = drawThemedOrb(ctx, orbX, orbY, 21, 'pixelPlanet');

  drawThemedCloud(ctx, 14, Math.round(jit(rng, 242, 4)), Math.round(jit(rng, 38, 3)), 84, 26, 'pixel');
  drawThemedCloud(ctx, 15, Math.round(jit(rng, 400, 4)), Math.round(jit(rng, 46, 3)), 82, 26, 'pixel');

  drawHorizonHills(ctx, { style: 'peaks', yBase: 148, yBottom: 206, layers: 2, labelPrefix: 'Beat' });
  drawGroundDeck(ctx, { style: 'stage', yTop: 198, yBottom: 250, labelPrefix: 'Dance' });

  // Illuminated four-arrow dance pad deck + central giant Pixel-Heart Beat Arch!
  const beatArch = ctx.dyn('prop', 'Chiptune Light Arch');
  r.shape(beatArch, 152, 84, 328, 198, (px, py) => {
    if (py > 196) return false;
    if (py >= 142) {
      const ax = Math.abs(px - 240);
      return ax <= 84 && ax >= 68;
    }
    const d = Math.hypot((px - 240) / 84, (py - 142) / 56);
    return d <= 1 && d >= 0.8;
  });

  const centerHeart = ctx.dyn('star', 'Pixel Beat Heart');
  drawPixelHeart(ctx, centerHeart, 240, 142, 5.5);

  // Two chunky glowing arrow tiles inlaid cleanly on the dance floor (clear of actors!)
  const arrowL = ctx.dyn('star', 'Left Dance Arrow');
  r.poly(arrowL, [[146, 224], [174, 210], [174, 218], [194, 218], [194, 230], [174, 230], [174, 238]]);
  const arrowR = ctx.dyn('star', 'Right Dance Arrow');
  r.poly(arrowR, [[334, 224], [306, 210], [306, 218], [286, 218], [286, 230], [306, 230], [306, 238]]);

  // Flanking arcade cab left & claw machine right
  const cabIds = drawArcadeCabinet(ctx, 84, 168, 0.88, { label: 'Beat' });
  const clawIds = drawClawMachine(ctx, 396, 168, 0.86, { label: 'Beat' });

  drawGhostSilhouette(ctx, 'Beat Heart Ghost', 'pixelHeart', Math.round(jit(rng, 154, 3)), Math.round(jit(rng, 72, 3)), 0.92);
  drawGhostSilhouette(ctx, 'Chiptune Clef Ghost', 'treble', Math.round(jit(rng, 328, 3)), Math.round(jit(rng, 72, 3)), 0.92);

  ctx.ellipsePath('ring', orbX, orbY, orb.rx, orb.ry, 24, orb.tilt);
  const gallopPath = ctx.wavePath('gallop', 60, 234, 420, 234, 9, 1.5, 18);
  const sprintPath = ctx.wavePath('sprint', 70, 230, 410, 230, 8, 2, 18);
  const orbitPath = ctx.ellipsePath('orbit', 240, 88, 170, 44, 24);
  ctx.marginPath(256);

  ctx.actor('lumi', 92, 242, { facing: 1, anim: 'rear', pathIndex: gallopPath });
  ctx.actor('violet', 240, 244, { facing: 1, anim: 'bounce' });
  ctx.actor('nova', 386, 242, { facing: -1, anim: 'leap', pathIndex: sprintPath });
  ctx.actor('comet', 316, 108, { facing: -1, anim: 'float', pathIndex: orbitPath });

  ctx.heroQuest('heart', 'Dance Stage', [beatArch, centerHeart, arrowL, arrowR]);
  ctx.heroQuest('arcade', 'Plaza Booths', [...cabIds, ...clawIds]);
  ctx.heroQuest('violet', 'Violet', [1, 2, 3, 4]);
  ctx.heroQuest('nova', 'Nova', [9, 10, 11]);
}

// ===========================================================================
// U18 C4B: The Laser-Prism Prize Counter
// ===========================================================================
function buildU18C4B(ctx: SceneCtx): void {
  const { r, rng } = ctx;
  initChapter(ctx, 'u18_c4b', 240, 152);

  drawSkySparkles(ctx, 18, 134, 'stars');

  const orbX = Math.round(jit(rng, 396, 4));
  const orbY = Math.round(jit(rng, 52, 3));
  const orb = drawThemedOrb(ctx, orbX, orbY, 21, 'pixelPlanet');

  drawThemedCloud(ctx, 14, Math.round(jit(rng, 92, 4)), Math.round(jit(rng, 44, 3)), 84, 26, 'pixel');
  drawThemedCloud(ctx, 15, Math.round(jit(rng, 248, 4)), Math.round(jit(rng, 38, 3)), 80, 24, 'pixel');

  drawHorizonHills(ctx, { style: 'castle', yBase: 152, yBottom: 214, layers: 2, labelPrefix: 'Prize' });
  drawGroundDeck(ctx, { style: 'counter', yTop: 206, yBottom: 250, labelPrefix: 'Prize' });

  // Central illuminated Laser-Prism Prize Display Counter with Giant Holo Trophy & Pixel Crown!
  const counterBox = ctx.dyn('prop', 'Laser Prize Counter');
  r.rect(counterBox, 166, 174, 314, 212);
  r.line(INK, 170, 184, 310, 184, { only: [counterBox] });
  r.line(INK, 216, 184, 216, 210, { only: [counterBox] });
  r.line(INK, 264, 184, 264, 210, { only: [counterBox] });

  const trophyIds = drawHoloTrophy(ctx, 210, 144, 0.85, 'Holo');

  const pixCrown = ctx.dyn('star', 'Pixel Prize Crown');
  r.poly(pixCrown, [
    [252, 168], [252, 136], [264, 148], [276, 130], [288, 148], [300, 136], [300, 168],
  ]);
  r.line(INK, 256, 160, 296, 160, { only: [pixCrown] });

  // Flanking claw machine & arcade cabinet
  const clawIds = drawClawMachine(ctx, 88, 174, 0.88, { label: 'Prize' });
  const cabIds = drawArcadeCabinet(ctx, 392, 174, 0.9, { label: 'Prize' });

  pixelStar(ctx, 'Laser Prize Star A', Math.round(jit(rng, 166, 3)), Math.round(jit(rng, 100, 3)), 11.5);
  pixelStar(ctx, 'Laser Prize Star B', Math.round(jit(rng, 318, 3)), Math.round(jit(rng, 100, 3)), 11.5);

  drawGhostSilhouette(ctx, 'Prize Crystal Ghost', 'crystal', Math.round(jit(rng, 160, 3)), Math.round(jit(rng, 64, 3)), 0.92);
  drawGhostSilhouette(ctx, 'Prize Heart Ghost', 'pixelHeart', Math.round(jit(rng, 326, 3)), Math.round(jit(rng, 64, 3)), 0.92);
  drawGhostSilhouette(ctx, 'Prize Robot Ghost', 'robot', Math.round(jit(rng, 444, 3)), Math.round(jit(rng, 112, 3)), 0.9);

  ctx.ellipsePath('ring', orbX, orbY, orb.rx, orb.ry, 24, orb.tilt);
  const sprintPath = ctx.wavePath('sprint', 56, 234, 424, 232, 9, 2, 18);
  const orbitPath = ctx.ellipsePath('orbit', 240, 86, 170, 44, 24);
  ctx.marginPath(256);

  ctx.actor('violet', 166, 242, { facing: 1, anim: 'idle' });
  ctx.actor('cometCar', 274, 240, { facing: 1, anim: 'run', pathIndex: sprintPath });
  ctx.actor('moonCat', 382, 236, { facing: -1, anim: 'peek' });
  ctx.actor('comet', 240, 86, { facing: 1, anim: 'float', pathIndex: orbitPath });

  ctx.heroQuest('heart', 'Prize Counter', [counterBox, ...trophyIds, pixCrown]);
  ctx.heroQuest('arcade', 'Prize Booths', [...clawIds, ...cabIds]);
  ctx.heroQuest('violet', 'Violet', [1, 2, 3, 4]);
  ctx.heroQuest('moonCat', 'Moon-Cat', [17]);
}

// ===========================================================================
// U18 C5 (GRAND FINALE, 50..70 regions): The Grand High-Score Boss Stage
// ===========================================================================
function buildU18C5(ctx: SceneCtx): void {
  const { r, rng } = ctx;
  initChapter(ctx, 'u18_c5', 240, 112);

  const cx = 240;
  const cy = 110;
  const twist = rng.range(-0.025, 0.025);

  drawSkySparkles(ctx, 20, 130, 'hearts');

  // 1) Neon Boss Stage Deck + Twin Synthwave Equalizer Towers (5 regions)
  const stage = ctx.dyn('prop', 'Boss Stage Grid');
  r.poly(stage, [[44, 224], [436, 224], [454, 248], [26, 248]]);
  r.line(INK, 54, 236, 426, 236, { only: [stage] });

  for (const side of [-1, 1] as const) {
    const lbl = side < 0 ? 'West' : 'East';
    const eqTower = ctx.dyn('prop', `${lbl} Equalizer Tower`);
    const tx = side < 0 ? 44 : 436;
    r.rect(eqTower, tx - 20, 138, tx + 20, 212);
    for (let ey = 148; ey <= 202; ey += 12) {
      r.line(INK, tx - 16, ey, tx + 16, ey, { only: [eqTower] });
    }

    const laserWing = ctx.dyn('star', `${lbl} Laser Beam`);
    r.poly(laserWing, [
      [cx + side * 86, cy - 56],
      [cx + side * 148, cy - 66],
      [cx + side * 190, cy - 34],
      [cx + side * 172, cy - 16],
      [cx + side * 136, cy - 46],
      [cx + side * 82, cy - 40],
    ]);
  }

  // 2) Panoramic 8-Bit High-Score Boss Mandala (12 + 8 + 8 + 1 = 29 regions)
  const sx = 1.12;
  const sy = 0.94;
  const pol = (rad: number, a: number): Pt => [cx + Math.cos(a) * rad * sx, cy + Math.sin(a) * rad * sy];

  // Outer ring: 12 stepped laser shield blocks
  for (let i = 0; i < 12; i++) {
    const a = -Math.PI / 2 + (i * Math.PI * 2) / 12 + twist;
    const bid = ctx.dyn('prop', `Laser Shield ${i + 1}`);
    r.poly(bid, [
      pol(54, a - 0.16),
      pol(84, a - 0.14),
      pol(86, a),
      pol(84, a + 0.14),
      pol(54, a + 0.16),
    ]);
    const pA = pol(60, a);
    const pB = pol(78, a);
    r.line(INK, pA[0], pA[1], pB[0], pB[1], { only: [bid] });
  }

  // Middle ring: 8 diamond pixel-power crystals
  for (let i = 0; i < 8; i++) {
    const a = -Math.PI / 2 + ((i + 0.5) * Math.PI * 2) / 8 + twist;
    const pid = ctx.dyn('star', `Power Prism ${i + 1}`);
    r.poly(pid, [
      pol(32, a),
      pol(48, a - 0.34),
      pol(64, a),
      pol(48, a + 0.34),
    ]);
    const pA = pol(36, a);
    const pB = pol(60, a);
    r.line(INK, pA[0], pA[1], pB[0], pB[1], { only: [pid] });
  }

  // Inner ring: 8 neon arcade chevron rays
  const innerIds: number[] = [];
  for (let i = 0; i < 8; i++) {
    const a = -Math.PI / 2 + (i * Math.PI * 2) / 8 + twist;
    const rid = ctx.dyn('star', `High-Score Ray ${i + 1}`);
    innerIds.push(rid);
    r.poly(rid, [
      pol(16, a - 0.24),
      pol(41, a - 0.14),
      pol(44, a),
      pol(41, a + 0.14),
      pol(16, a + 0.24),
    ]);
    const pA = pol(22, a);
    const pB = pol(37, a);
    r.line(INK, pA[0], pA[1], pB[0], pB[1], { only: [rid] });
  }

  // Center Core: Giant 8-Bit Boss Heart Core!
  const bossCore = ctx.dyn('star', 'High-Score Boss Heart');
  drawPixelHeart(ctx, bossCore, cx, cy + 2, 4.4);

  // 3) Side orbits: Canonical Pixel Planet (12/13) left + Mirrored Holo Trophy right
  const orbX = 72;
  const orbY = 82 + Math.round(jit(rng, 0, 2));
  const orb = drawThemedOrb(ctx, orbX, orbY, 15.5, 'pixelPlanet');

  drawHoloTrophy(ctx, 408, 86, 0.72, 'Boss');

  // Four corner framing neon pixel stars
  pixelStar(ctx, 'NW Boss Star', 34, 30, 11.5);
  pixelStar(ctx, 'NE Boss Star', 446, 30, 11.5);
  pixelStar(ctx, 'West Arcade Star', 124, 150, 11);
  pixelStar(ctx, 'East Arcade Star', 356, 150, 11);

  // Canonical pixel clouds (14/15) cradling the boss stage flanks
  drawThemedCloud(ctx, 14, 62, 226, 94, 30, 'pixel');
  drawThemedCloud(ctx, 15, 418, 226, 94, 30, 'pixel');

  // 3 Ghosts in clean open upper sky pockets
  drawGhostSilhouette(ctx, 'Boss Heart Ghost', 'pixelHeart', 152, 22, 0.92);
  drawGhostSilhouette(ctx, 'Boss Robot Ghost', 'robot', 328, 22, 0.92);
  drawGhostSilhouette(ctx, 'Boss Dragon Ghost', 'dragon', 240, 18, 0.85);

  // Paths & Actors (Violet 4 + Lumi 4 + Nova 3 + CometCar 2 + Comet 2 = 15 actor regions -> total ~61!)
  const gallopPath = ctx.wavePath('gallop', 66, 240, 414, 240, 8, 2, 20);
  const sprintPath = ctx.wavePath('sprint', 90, 236, 390, 236, 9, 2, 20);
  const orbitPath = ctx.ellipsePath('orbit', cx, cy, 182, 82, 28);
  ctx.ellipsePath('ring', orbX, orbY, orb.rx, orb.ry, 24, orb.tilt);
  ctx.marginPath(256);

  ctx.actor('lumi', 148, 246, { facing: 1, anim: 'rear', pathIndex: gallopPath });
  ctx.actor('violet', 240, 248, { facing: 1, anim: 'bounce' });
  ctx.actor('nova', 332, 246, { facing: -1, anim: 'leap', pathIndex: sprintPath });
  ctx.actor('cometCar', 110, 198, { facing: 1, anim: 'run', pathIndex: sprintPath });
  ctx.actor('comet', 372, 134, { facing: -1, anim: 'float', pathIndex: orbitPath });

  ctx.heroQuest('arcade', 'Boss Crown', [bossCore, ...innerIds]);
  ctx.heroQuest('violet', 'Violet', [1, 2, 3, 4]);
  ctx.heroQuest('lumi', 'Lumi', [5, 6, 7, 8]);
  ctx.heroQuest('nova', 'Nova', [9, 10, 11]);
}

export const U18_SCENES: Record<U18SceneId, (ctx: SceneCtx) => void> = {
  hub_neonPixelArcade: buildHubNeonPixelArcade,
  u18_c1: buildU18C1,
  u18_c2a: buildU18C2A,
  u18_c2b: buildU18C2B,
  u18_c3a: buildU18C3A,
  u18_c3b: buildU18C3B,
  u18_c4a: buildU18C4A,
  u18_c4b: buildU18C4B,
  u18_c5: buildU18C5,
};
