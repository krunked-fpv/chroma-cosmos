/**
 * Universe 14: Starlight Sky Carnival (9 bespoke procedural scenes: 1 Hub + 8 Chapters).
 * Pure, deterministic (uses ctx.rng only), adheres to >= 60px region hygiene and bottom-margin reserve.
 */
import { MaterialId } from '../../contracts/materials';
import { UNIVERSE_BY_ID } from '../../contracts/universes';
import type { SceneCtx } from '../context';
import { crescent, inkArc, jit, star, twinkle } from '../props';
import { INK } from '../raster';
import {
  drawBrassAirship,
  drawCarousel,
  drawCircusBigTop,
  drawFerrisWheel,
  drawGhostSilhouette,
  drawGrandPiano,
  drawGroundDeck,
  drawHorizonHills,
  drawPaperLantern,
  drawSanctuaryRoom,
  drawSkySparkles,
  drawThemedCloud,
  drawThemedOrb,
} from '../kit';

const U = UNIVERSE_BY_ID.cloudCircusCarnival;

type U14SceneId =
  | 'hub_cloudCircusCarnival'
  | 'u14_c1'
  | 'u14_c2a'
  | 'u14_c2b'
  | 'u14_c3a'
  | 'u14_c3b'
  | 'u14_c4a'
  | 'u14_c4b'
  | 'u14_c5';

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

/** Custom Star-Bunting Carnival Entry Arch & Ticket Booth (3 regions). */
function drawTicketGate(ctx: SceneCtx, cx: number, cy: number, scale = 1): number[] {
  const { r } = ctx;
  const s = scale;
  const pillars = ctx.dyn('prop', 'Carnival Gate Pillars');
  const marquee = ctx.dyn('star', 'Starlight Ticket Arch');
  const booth = ctx.dyn('prop', 'Striped Ticket Booth');

  // Striped carnival entrance columns
  r.rect(pillars, cx - 54 * s, cy - 16 * s, cx - 36 * s, cy + 38 * s);
  r.rect(pillars, cx + 36 * s, cy - 16 * s, cx + 54 * s, cy + 38 * s);
  r.disc(pillars, cx - 45 * s, cy - 20 * s, 11 * s);
  r.disc(pillars, cx + 45 * s, cy - 20 * s, 11 * s);
  for (const py of [-4, 10, 24]) {
    r.line(INK, cx - 52 * s, cy + py * s, cx - 38 * s, cy + py * s, { only: [pillars] });
    r.line(INK, cx + 38 * s, cy + py * s, cx + 52 * s, cy + py * s, { only: [pillars] });
  }

  // Glowing overhead curved marquee sign
  r.shape(marquee, cx - 52 * s, cy - 44 * s, cx + 52 * s, cy - 8 * s, (px, py) => {
    const dx = (px - cx) / (48 * s);
    const dy = (py - (cy - 6 * s)) / (36 * s);
    const d = Math.hypot(dx, dy);
    return py <= cy - 10 * s && d <= 1.0 && d >= 0.56;
  });
  for (const bx of [-28, -14, 0, 14, 28]) {
    r.dot(INK, cx + bx * s, cy - 28 * s, { only: [marquee] });
  }

  // Cheerful striped ticket booth nestled beneath arch
  r.rect(booth, cx - 18 * s, cy + 2 * s, cx + 18 * s, cy + 38 * s);
  r.poly(booth, [[cx, cy - 12 * s], [cx + 22 * s, cy + 4 * s], [cx - 22 * s, cy + 4 * s]]);
  inkArc(r, cx, cy + 16 * s, 9 * s, 9 * s, Math.PI, Math.PI * 2, 0, { only: [booth] });
  r.line(INK, cx - 14 * s, cy + 24 * s, cx + 14 * s, cy + 24 * s, { only: [booth] });

  return [pillars, marquee, booth];
}

/** Custom patchwork Hot-Air Sky Balloon with woven basket (3 regions). */
function drawHotAirBalloon(ctx: SceneCtx, cx: number, cy: number, scale = 1, label = 'Sky'): number[] {
  const { r } = ctx;
  const s = scale;
  const balloon = ctx.dyn('prop', `${label} Balloon Dome`);
  const band = ctx.dyn('star', `${label} Balloon Stripe`);
  const basket = ctx.dyn('prop', `${label} Balloon Basket`);

  // Plump teardrop balloon envelope
  r.disc(balloon, cx, cy - 10 * s, 26 * s);
  r.poly(balloon, [
    [cx - 22 * s, cy + 2 * s],
    [cx + 22 * s, cy + 2 * s],
    [cx + 10 * s, cy + 20 * s],
    [cx - 10 * s, cy + 20 * s],
  ]);
  inkArc(r, cx, cy - 10 * s, 13 * s, 25 * s, 0, Math.PI * 2, 0, { only: [balloon] });

  // Equatorial star-patch stripe across balloon middle
  r.rect(band, cx - 25 * s, cy - 14 * s, cx + 25 * s, cy - 2 * s);
  for (const dx of [-14, 0, 14]) {
    r.line(INK, cx + dx * s, cy - 12 * s, cx + dx * s, cy - 4 * s, { only: [band] });
  }

  // Woven basket + suspension struts
  r.rect(basket, cx - 12 * s, cy + 24 * s, cx + 12 * s, cy + 38 * s);
  r.capsule(basket, cx - 8 * s, cy + 18 * s, cx - 8 * s, cy + 25 * s, 2.2 * s);
  r.capsule(basket, cx + 8 * s, cy + 18 * s, cx + 8 * s, cy + 25 * s, 2.2 * s);
  r.line(INK, cx - 10 * s, cy + 31 * s, cx + 10 * s, cy + 31 * s, { only: [basket] });

  return [balloon, band, basket];
}

/** Custom Hall of Star-Prism Mirrors funhouse facade with 3 ornate mirrors (4 regions). */
function drawMirrorHall(ctx: SceneCtx, cx: number, cy: number, scale = 1): number[] {
  const { r } = ctx;
  const s = scale;
  const facade = ctx.dyn('prop', 'Mirror Hall Facade');
  const crown = ctx.dyn('star', 'Funhouse Star Crown');
  const mirrorL = ctx.dyn('star', 'Prism Side Mirrors');
  const mirrorC = ctx.dyn('star', 'Center Magic Mirror');

  // Grand scalloped carnival hall facade
  r.rect(facade, cx - 64 * s, cy - 22 * s, cx + 64 * s, cy + 36 * s);
  for (const ox of [-48, -24, 0, 24, 48]) {
    r.disc(facade, cx + ox * s, cy - 22 * s, 14 * s);
  }
  r.line(INK, cx - 60 * s, cy - 14 * s, cx + 60 * s, cy - 14 * s, { only: [facade] });

  // Top marquee crown
  r.poly(crown, [[cx, cy - 48 * s], [cx + 28 * s, cy - 24 * s], [cx - 28 * s, cy - 24 * s]]);
  star(ctx, crown, cx, cy - 34 * s, 11 * s);

  // Flanking arched prism mirrors (shared region)
  r.ellipse(mirrorL, cx - 40 * s, cy + 10 * s, 13 * s, 20 * s);
  r.ellipse(mirrorL, cx + 40 * s, cy + 10 * s, 13 * s, 20 * s);
  r.line(INK, cx - 45 * s, cy, cx - 35 * s, cy + 14 * s, { only: [mirrorL] });
  r.line(INK, cx + 35 * s, cy, cx + 45 * s, cy + 14 * s, { only: [mirrorL] });

  // Central giant funhouse wave mirror
  r.ellipse(mirrorC, cx, cy + 8 * s, 18 * s, 24 * s);
  inkArc(r, cx, cy + 8 * s, 12 * s, 16 * s, Math.PI * 1.1, Math.PI * 1.6, 0, { only: [mirrorC] });

  return [facade, crown, mirrorL, mirrorC];
}

/** Custom Striped Popcorn & Cotton-Candy Midway Booth (3 regions). */
function drawPopcornBooth(ctx: SceneCtx, cx: number, cy: number, scale = 1, label = 'Popcorn'): number[] {
  const { r } = ctx;
  const s = scale;
  const cart = ctx.dyn('prop', `${label} Striped Cart`);
  const awning = ctx.dyn('prop', `${label} Booth Awning`);
  const treat = ctx.dyn('milkshake', `${label} Cloud Mound`);

  // Striped carnival stand body
  r.rect(cart, cx - 32 * s, cy - 4 * s, cx + 32 * s, cy + 36 * s);
  for (const bx of [-18, -6, 6, 18]) {
    r.line(INK, cx + bx * s, cy - 2 * s, cx + bx * s, cy + 34 * s, { only: [cart] });
  }

  // Fluffy overflowing popcorn or cotton-candy cloud top!
  r.disc(treat, cx - 14 * s, cy - 10 * s, 11 * s);
  r.disc(treat, cx + 14 * s, cy - 10 * s, 11 * s);
  r.disc(treat, cx, cy - 16 * s, 13 * s);
  inkArc(r, cx, cy - 16 * s, 7 * s, 6 * s, Math.PI * 1.1, Math.PI * 1.9, 0, { only: [treat] });

  // Scalloped striped canopy awning above
  r.poly(awning, [[cx - 38 * s, cy - 26 * s], [cx + 38 * s, cy - 26 * s], [cx + 30 * s, cy - 40 * s], [cx - 30 * s, cy - 40 * s]]);
  for (const ox of [-27, -9, 9, 27]) {
    r.disc(awning, cx + ox * s, cy - 26 * s, 8 * s);
  }
  r.line(INK, cx - 14 * s, cy - 38 * s, cx - 16 * s, cy - 26 * s, { only: [awning] });
  r.line(INK, cx + 14 * s, cy - 38 * s, cx + 16 * s, cy - 26 * s, { only: [awning] });

  return [cart, awning, treat];
}

/** Hub Sanctuary: Violet's Star-Tent Dressing Wagon */
function buildHubCloudCircusCarnival(ctx: SceneCtx): void {
  ctx.universeId = U.id;
  ctx.ambient = U.ambient;

  let customIds: number[] = [];
  const res = drawSanctuaryRoom(ctx, {
    title: U.hubTitle,
    sky: { ...U.sky },
    palette: {
      wallPanel: MaterialId.StrawberrySupernova,
      floor: MaterialId.RoyalAstralGold,
      windowFrame: MaterialId.SolarFlare24K,
      windowGlass: MaterialId.DeepSpaceBiolum,
      curtain: MaterialId.CosmicCottonSwirl,
      orbCore: MaterialId.StrawberrySupernova,
      orbRing: MaterialId.SolarFlare24K,
      rugOuter: MaterialId.SupernovaGlitter,
      rugInner: MaterialId.SolarFlare24K,
      furniture: MaterialId.RoyalAstralGold,
      furnitureTrim: MaterialId.SolarFlare24K,
      accentA: MaterialId.SolarFlare24K,
      accentB: MaterialId.StrawberrySupernova,
      accentC: MaterialId.LiquidAurora,
    },
    windowShape: 'arched',
    windowOrbStyle: 'macaronOrb',
    wallStyle: 'fabric',
    floorStyle: 'wood',
    rugShape: 'star',
    lampStyle: 'neon',
    garlandStyle: 'bunting',
    sparkleStyle: 'hearts',
    seatingLabel: 'Star-Tent Velvet Sofa',
    workbenchLabel: 'Vanity Costume Desk',
    shelfLabel: 'Carnival Prop Trunk',
    trinketLabels: ['Juggling Stars', 'Circus Playbills', 'Sparkle Ribbons'],
    drawWindowView: (c, wx, _wy, _wHalf, wBot) => {
      // Distant striped big-top silhouette visible through lower arched window
      const tent = c.dyn('prop', 'Window Big-Top Silhouette');
      c.r.poly(tent, [
        [wx - 32, wBot - 2],
        [wx - 28, wBot - 16],
        [wx, wBot - 32],
        [wx + 28, wBot - 16],
        [wx + 32, wBot - 2],
      ]);
      c.r.line(INK, wx, wBot - 30, wx, wBot - 4, { only: [tent] });
      c.preColor(tent, MaterialId.StrawberrySupernova);
    },
    drawExtraProps: (c) => {
      const ids: number[] = [];
      // 1) Framed Carnival Star Poster on left wall
      const poster = c.dyn('star', 'Circus Star Poster');
      c.r.rect(poster, 68, 72, 102, 112);
      c.r.line(INK, 72, 82, 98, 82, { only: [poster] });
      c.r.line(INK, 85, 88, 85, 106, { only: [poster] });
      c.r.line(INK, 76, 97, 94, 97, { only: [poster] });
      c.preColor(poster, MaterialId.SolarFlare24K);
      ids.push(poster);

      // 2) Miniature Hot-Air Balloon Mobile hanging on upper-right wall
      const mobile = c.dyn('star', 'Wall Balloon Mobile');
      c.r.disc(mobile, 354, 84, 15);
      c.r.rect(mobile, 348, 99, 360, 109);
      c.r.line(INK, 354, 70, 354, 98, { only: [mobile] });
      c.preColor(mobile, MaterialId.CosmicCottonSwirl);
      ids.push(mobile);

      // 3) Striped Circus Drum Stool beside Violet
      const drum = c.dyn('prop', 'Circus Drum Stool');
      c.r.rect(drum, 260, 208, 294, 234);
      c.r.ellipse(drum, 277, 208, 17, 6);
      c.r.line(INK, 262, 212, 276, 232, { only: [drum] });
      c.r.line(INK, 276, 232, 292, 212, { only: [drum] });
      c.preColor(drum, MaterialId.RainbowPrismWax);
      ids.push(drum);

      // 4) Ringmaster Top Hat resting on right corner of craft desk
      const hat = c.dyn('prop', 'Ringmaster Top Hat');
      c.r.ellipse(hat, 376, 176, 16, 4.5);
      c.r.rect(hat, 366, 156, 386, 176);
      c.r.line(INK, 367, 170, 385, 170, { only: [hat] });
      c.preColor(hat, MaterialId.VelvetNebula);
      ids.push(hat);

      customIds = ids;
      return ids;
    },
  });

  ctx.heroQuest('violet', 'Violet', [1, 2, 3, 4]);
  ctx.heroQuest('planet', 'Macaron Orb', [12, 13]);
  ctx.heroQuest('tent', 'Wagon Props', customIds);
  ctx.heroQuest('lantern', 'Bunting', res.roomIds.slice(8, 12));
}

/** Chapter 1: The Star-Bunting Ticket Gate */
function buildU14C1(ctx: SceneCtx): void {
  const { rng } = ctx;
  setupMeta(ctx, chapterTitle('u14_c1'), 240, 154);
  drawSkySparkles(ctx, 20, 124, 'hearts');

  const ox = Math.round(jit(rng, 378, 4));
  const oy = Math.round(jit(rng, 52, 3));
  const orb = drawThemedOrb(ctx, ox, oy, 20, 'macaronOrb', { tilt: -0.22 });
  drawThemedCloud(ctx, 14, Math.round(jit(rng, 100, 4)), Math.round(jit(rng, 48, 3)), 88, 28, 'cottonCandy');
  drawThemedCloud(ctx, 15, Math.round(jit(rng, 246, 4)), Math.round(jit(rng, 40, 3)), 78, 26, 'cottonCandy');

  star(ctx, ctx.dyn('star', 'Opening Night Star'), Math.round(jit(rng, 180, 3)), Math.round(jit(rng, 68, 2)), 10);
  twinkle(ctx, ctx.dyn('star', 'Bunting Sparkle'), Math.round(jit(rng, 314, 3)), Math.round(jit(rng, 68, 2)), 11);

  drawGhostSilhouette(ctx, 'Sky-Balloon Ghost', 'balloon', Math.round(jit(rng, 152, 3)), Math.round(jit(rng, 100, 2)), 0.92);
  drawGhostSilhouette(ctx, 'Carnival Cat Ghost', 'cat', Math.round(jit(rng, 336, 3)), Math.round(jit(rng, 102, 2)), 0.9);

  drawHorizonHills(ctx, { style: 'clouds', yBase: 170, yBottom: 218, layers: 2 });
  drawGroundDeck(ctx, { style: 'stage', yTop: 206, yBottom: 250, labelPrefix: 'Midway' });

  // Hero Star-Bunting Ticket Gate + flanking Mini Big-Top & Balloon Stand
  const gate = drawTicketGate(ctx, 240, 168, 1.06);
  const tentL = drawCircusBigTop(ctx, 84, 174, 0.85, { label: 'Welcome' });
  const balR = drawHotAirBalloon(ctx, 404, 146, 0.85, 'Welcome');

  ctx.ellipsePath('ring', ox, oy, orb.rx * 1.15, orb.ry * 1.3, 24, orb.tilt);
  const gallopPath = ctx.wavePath('gallop', 72, 232, 408, 232, 8, 2, 18);
  const sprintPath = ctx.wavePath('sprint', 68, 238, 412, 238, 7, 2.5, 18);
  const orbitPath = ctx.ellipsePath('orbit', 240, 96, 174, 46, 24);
  ctx.marginPath(256);

  ctx.actor('violet', 148, 242, { facing: 1, anim: 'idle' });
  ctx.actor('lumi', 240, 242, { facing: 1, anim: 'idle', pathIndex: gallopPath });
  ctx.actor('nova', 336, 240, { facing: -1, anim: 'idle', pathIndex: sprintPath });
  ctx.actor('comet', 62, 98, { facing: 1, anim: 'float', pathIndex: orbitPath });

  ctx.heroQuest('tent', 'Ticket Gate', [...gate, ...tentL]);
  ctx.heroQuest('violet', 'Violet', [1, 2, 3, 4]);
  ctx.heroQuest('lumi', 'Lumi', [5, 6, 7, 8]);
  ctx.heroQuest('nova', 'Nova', [9, 10, 11]);
  void balR;
}

/** Chapter 2A: The Striped Big-Top Pavilion */
function buildU14C2a(ctx: SceneCtx): void {
  const { rng } = ctx;
  setupMeta(ctx, chapterTitle('u14_c2a'), 240, 150);
  drawSkySparkles(ctx, 20, 122, 'stars');

  const ox = Math.round(jit(rng, 88, 4));
  const oy = Math.round(jit(rng, 52, 3));
  const orb = drawThemedOrb(ctx, ox, oy, 20, 'ringedPlanet', { tilt: -0.24 });
  drawThemedCloud(ctx, 14, Math.round(jit(rng, 244, 4)), Math.round(jit(rng, 42, 3)), 88, 28, 'cottonCandy');
  drawThemedCloud(ctx, 15, Math.round(jit(rng, 402, 4)), Math.round(jit(rng, 50, 3)), 84, 28, 'cottonCandy');

  star(ctx, ctx.dyn('star', 'Trapeze Star'), Math.round(jit(rng, 170, 3)), Math.round(jit(rng, 36, 2)), 10);
  twinkle(ctx, ctx.dyn('star', 'Spotlight Twinkle'), Math.round(jit(rng, 328, 3)), Math.round(jit(rng, 38, 2)), 11);

  drawGhostSilhouette(ctx, 'Acrobat Balloon Ghost', 'balloon', Math.round(jit(rng, 162, 3)), Math.round(jit(rng, 92, 2)), 0.9);
  drawGhostSilhouette(ctx, 'Ringmaster Owl Ghost', 'owl', Math.round(jit(rng, 328, 3)), Math.round(jit(rng, 92, 2)), 0.9);
  drawGhostSilhouette(ctx, 'Tumbling Cat Ghost', 'cat', Math.round(jit(rng, 444, 3)), Math.round(jit(rng, 114, 2)), 0.85);

  drawHorizonHills(ctx, { style: 'clouds', yBase: 170, yBottom: 218, layers: 2 });
  drawGroundDeck(ctx, { style: 'stage', yTop: 206, yBottom: 250, labelPrefix: 'Circus Ring' });

  // Grand Center Striped Big-Top Pavilion + flanking Carnival Lanterns + Balloon
  const bigTop = drawCircusBigTop(ctx, 240, 166, 1.18, { label: 'Grand' });
  const lampL = drawPaperLantern(ctx, 134, 162, 0.82, { label: 'West Ring' });
  const lampR = drawPaperLantern(ctx, 346, 162, 0.82, { label: 'East Ring' });
  const balL = drawHotAirBalloon(ctx, 64, 144, 0.8, 'Acrobat');
  const balR = drawHotAirBalloon(ctx, 416, 144, 0.8, 'Star');

  ctx.ellipsePath('ring', ox, oy, orb.rx * 1.15, orb.ry * 1.3, 24, orb.tilt);
  const sprintPath = ctx.wavePath('sprint', 68, 232, 412, 232, 8, 2, 18);
  const orbitPath = ctx.ellipsePath('orbit', 240, 96, 174, 46, 24);
  ctx.marginPath(256);

  ctx.actor('violet', 158, 242, { facing: 1, anim: 'idle' });
  ctx.actor('nova', 324, 240, { facing: -1, anim: 'leap', pathIndex: sprintPath });
  ctx.actor('moonCat', 240, 234, { facing: 1, anim: 'sleep' });
  ctx.actor('comet', 240, 84, { facing: 1, anim: 'float', pathIndex: orbitPath });

  ctx.heroQuest('tent', 'Big-Top Tent', bigTop);
  ctx.heroQuest('lantern', 'Ring Lamps', [...lampL, ...lampR, ...balL, ...balR]);
  ctx.heroQuest('violet', 'Violet', [1, 2, 3, 4]);
  ctx.heroQuest('nova', 'Nova', [9, 10, 11]);
}

/** Chapter 2B: The Unicorn Cloud Carousel */
function buildU14C2b(ctx: SceneCtx): void {
  const { rng } = ctx;
  setupMeta(ctx, chapterTitle('u14_c2b'), 240, 152);
  drawSkySparkles(ctx, 20, 122, 'notes');

  const ox = Math.round(jit(rng, 378, 4));
  const oy = Math.round(jit(rng, 52, 3));
  const orb = drawThemedOrb(ctx, ox, oy, 20, 'vinyl', { tilt: -0.22 });
  drawThemedCloud(ctx, 14, Math.round(jit(rng, 100, 4)), Math.round(jit(rng, 46, 3)), 88, 28, 'music');
  drawThemedCloud(ctx, 15, Math.round(jit(rng, 246, 4)), Math.round(jit(rng, 40, 3)), 78, 26, 'music');

  star(ctx, ctx.dyn('star', 'Calliope Star'), Math.round(jit(rng, 180, 3)), Math.round(jit(rng, 68, 2)), 10);
  twinkle(ctx, ctx.dyn('star', 'Carousel Note'), Math.round(jit(rng, 314, 3)), Math.round(jit(rng, 68, 2)), 11);

  drawGhostSilhouette(ctx, 'Carousel Balloon Ghost', 'balloon', Math.round(jit(rng, 152, 3)), Math.round(jit(rng, 102, 2)), 0.9);
  drawGhostSilhouette(ctx, 'Calliope Clef Ghost', 'treble', Math.round(jit(rng, 336, 3)), Math.round(jit(rng, 102, 2)), 0.9);
  drawGhostSilhouette(ctx, 'Prism Butterfly Ghost', 'butterfly', Math.round(jit(rng, 444, 3)), Math.round(jit(rng, 114, 2)), 0.85);

  drawHorizonHills(ctx, { style: 'clouds', yBase: 170, yBottom: 218, layers: 2 });
  drawGroundDeck(ctx, { style: 'stage', yTop: 206, yBottom: 250, labelPrefix: 'Carousel' });

  // Center Unicorn Cloud Carousel + Calliope Piano Organ + Festive Lantern
  const carousel = drawCarousel(ctx, 240, 168, 1.15, { label: 'Unicorn' });
  const calliope = drawGrandPiano(ctx, 84, 178, 0.88, { label: 'Calliope' });
  const lampR = drawPaperLantern(ctx, 396, 166, 0.84, { label: 'Calliope' });

  ctx.ellipsePath('ring', ox, oy, orb.rx * 1.15, orb.ry * 1.3, 24, orb.tilt);
  const gallopPath = ctx.wavePath('gallop', 70, 232, 410, 232, 8, 2, 18);
  const orbitPath = ctx.ellipsePath('orbit', 240, 96, 174, 46, 24);
  ctx.marginPath(256);

  ctx.actor('violet', 146, 242, { facing: 1, anim: 'idle' });
  ctx.actor('lumi', 326, 240, { facing: -1, anim: 'rear', pathIndex: gallopPath });
  ctx.actor('gazelle', 418, 240, { facing: -1, anim: 'run', pathIndex: gallopPath });
  ctx.actor('comet', 62, 98, { facing: 1, anim: 'float', pathIndex: orbitPath });

  ctx.heroQuest('tent', 'Cloud Carousel', carousel);
  ctx.heroQuest('piano', 'Calliope Organ', [...calliope, ...lampR]);
  ctx.heroQuest('lumi', 'Lumi', [5, 6, 7, 8]);
  ctx.heroQuest('planet', 'Music Moon', [12, 13]);
}

/** Chapter 3A: The Starlight Ferris Wheel */
function buildU14C3a(ctx: SceneCtx): void {
  const { rng } = ctx;
  setupMeta(ctx, chapterTitle('u14_c3a'), 240, 148);
  drawSkySparkles(ctx, 18, 122, 'stars');

  const ox = Math.round(jit(rng, 88, 4));
  const oy = Math.round(jit(rng, 52, 3));
  const orb = drawThemedOrb(ctx, ox, oy, 20, 'pearlMoon', { tilt: -0.24 });
  drawThemedCloud(ctx, 14, Math.round(jit(rng, 244, 4)), Math.round(jit(rng, 40, 3)), 88, 28, 'cottonCandy');
  drawThemedCloud(ctx, 15, Math.round(jit(rng, 404, 4)), Math.round(jit(rng, 50, 3)), 84, 28, 'cottonCandy');

  star(ctx, ctx.dyn('star', 'Gondola Star'), Math.round(jit(rng, 172, 3)), Math.round(jit(rng, 36, 2)), 10);
  twinkle(ctx, ctx.dyn('star', 'Ferris Gleam'), Math.round(jit(rng, 328, 3)), Math.round(jit(rng, 38, 2)), 11);

  drawGhostSilhouette(ctx, 'Sky Balloon Ghost', 'balloon', Math.round(jit(rng, 162, 3)), Math.round(jit(rng, 92, 2)), 0.9);
  drawGhostSilhouette(ctx, 'Carnival Owl Ghost', 'owl', Math.round(jit(rng, 328, 3)), Math.round(jit(rng, 92, 2)), 0.9);
  drawGhostSilhouette(ctx, 'Mist Butterfly Ghost', 'butterfly', Math.round(jit(rng, 444, 3)), Math.round(jit(rng, 114, 2)), 0.85);

  drawHorizonHills(ctx, { style: 'clouds', yBase: 170, yBottom: 218, layers: 2 });
  drawGroundDeck(ctx, { style: 'pier', yTop: 206, yBottom: 250, labelPrefix: 'Boardwalk' });

  // Towering Center Starlight Ferris Wheel + Flanking Big-Top & Cotton-Candy Booth
  const ferris = drawFerrisWheel(ctx, 240, 164, 1.18, { label: 'Starlight' });
  const tentL = drawCircusBigTop(ctx, 84, 174, 0.86, { label: 'Boardwalk' });
  const boothR = drawPopcornBooth(ctx, 398, 178, 0.88, 'Cotton-Candy');

  ctx.ellipsePath('ring', ox, oy, orb.rx * 1.15, orb.ry * 1.3, 24, orb.tilt);
  const gallopPath = ctx.wavePath('gallop', 72, 232, 408, 232, 8, 2, 18);
  const orbitPath = ctx.ellipsePath('orbit', 240, 96, 174, 46, 24);
  ctx.marginPath(256);

  ctx.actor('violet', 152, 242, { facing: 1, anim: 'idle' });
  ctx.actor('lumi', 324, 240, { facing: -1, anim: 'idle', pathIndex: gallopPath });
  ctx.actor('moonCat', 240, 234, { facing: 1, anim: 'sleep' });
  ctx.actor('comet', 432, 92, { facing: -1, anim: 'float', pathIndex: orbitPath });

  ctx.heroQuest('tent', 'Ferris Wheel', ferris);
  ctx.heroQuest('cloud', 'Candy Clouds', [14, 15, ...boothR]);
  ctx.heroQuest('violet', 'Violet', [1, 2, 3, 4]);
  ctx.heroQuest('lumi', 'Lumi', [5, 6, 7, 8]);
  void tentL;
}

/** Chapter 3B: The Hot-Air Balloon Parade */
function buildU14C3b(ctx: SceneCtx): void {
  const { rng } = ctx;
  setupMeta(ctx, chapterTitle('u14_c3b'), 240, 134);
  drawSkySparkles(ctx, 20, 126, 'stars');

  const ox = Math.round(jit(rng, 384, 4));
  const oy = Math.round(jit(rng, 52, 3));
  const orb = drawThemedOrb(ctx, ox, oy, 20, 'macaronOrb', { tilt: -0.22 });
  drawThemedCloud(ctx, 14, Math.round(jit(rng, 96, 4)), Math.round(jit(rng, 48, 3)), 86, 28, 'cottonCandy');
  drawThemedCloud(ctx, 15, Math.round(jit(rng, 246, 4)), Math.round(jit(rng, 40, 3)), 76, 26, 'cottonCandy');

  star(ctx, ctx.dyn('star', 'Parade Lead Star'), Math.round(jit(rng, 178, 3)), Math.round(jit(rng, 68, 2)), 10);
  twinkle(ctx, ctx.dyn('star', 'Skyline Spark'), Math.round(jit(rng, 314, 3)), Math.round(jit(rng, 68, 2)), 11);

  drawGhostSilhouette(ctx, 'Parade Balloon Ghost', 'balloon', Math.round(jit(rng, 444, 3)), Math.round(jit(rng, 108, 2)), 0.85);
  drawGhostSilhouette(ctx, 'Paper Crane Ghost', 'crane', Math.round(jit(rng, 54, 3)), Math.round(jit(rng, 98, 2)), 0.88);

  drawHorizonHills(ctx, { style: 'clouds', yBase: 170, yBottom: 218, layers: 2 });
  drawGroundDeck(ctx, { style: 'stage', yTop: 206, yBottom: 250, labelPrefix: 'Sky Parade' });

  // Three soaring patchwork Hot-Air Balloons + Parade Brass Airship Float!
  const balL = drawHotAirBalloon(ctx, 106, 132, 0.94, 'Rainbow');
  const balC = drawHotAirBalloon(ctx, 242, 124, 1.04, 'Starlight');
  const balR = drawHotAirBalloon(ctx, 378, 136, 0.9, 'Sunburst');
  const floatShip = drawBrassAirship(ctx, 240, 184, 0.85, { label: 'Parade' });

  ctx.ellipsePath('ring', ox, oy, orb.rx * 1.15, orb.ry * 1.3, 24, orb.tilt);
  const gallopPath = ctx.wavePath('gallop', 68, 232, 412, 232, 8, 2, 18);
  const sprintPath = ctx.wavePath('sprint', 68, 238, 412, 238, 7, 2.5, 18);
  const orbitPath = ctx.ellipsePath('orbit', 240, 92, 178, 44, 24);
  ctx.marginPath(256);

  ctx.actor('lumi', 132, 242, { facing: 1, anim: 'idle', pathIndex: gallopPath });
  ctx.actor('nova', 352, 240, { facing: -1, anim: 'run', pathIndex: sprintPath });
  ctx.actor('cometCar', 240, 238, { facing: 1, anim: 'run', pathIndex: sprintPath });
  ctx.actor('comet', 174, 86, { facing: 1, anim: 'float', pathIndex: orbitPath });

  ctx.heroQuest('airship', 'Sky Balloons', [...balL, ...balC, ...balR, ...floatShip]);
  ctx.heroQuest('comet', 'Comet Parade', [16, 30, 24, 25]);
  ctx.heroQuest('lumi', 'Lumi', [5, 6, 7, 8]);
  ctx.heroQuest('nova', 'Nova', [9, 10, 11]);
}

/** Chapter 4A: The Hall of Star-Prism Mirrors */
function buildU14C4a(ctx: SceneCtx): void {
  const { rng } = ctx;
  setupMeta(ctx, chapterTitle('u14_c4a'), 240, 152);
  drawSkySparkles(ctx, 20, 122, 'stars');

  const ox = Math.round(jit(rng, 378, 4));
  const oy = Math.round(jit(rng, 52, 3));
  const orb = drawThemedOrb(ctx, ox, oy, 20, 'geode', { tilt: -0.26 });
  drawThemedCloud(ctx, 14, Math.round(jit(rng, 100, 4)), Math.round(jit(rng, 46, 3)), 86, 28, 'cottonCandy');
  drawThemedCloud(ctx, 15, Math.round(jit(rng, 246, 4)), Math.round(jit(rng, 40, 3)), 76, 26, 'cottonCandy');

  star(ctx, ctx.dyn('star', 'Prism Reflection'), Math.round(jit(rng, 180, 3)), Math.round(jit(rng, 68, 2)), 10);
  twinkle(ctx, ctx.dyn('star', 'Confetti Twinkle'), Math.round(jit(rng, 314, 3)), Math.round(jit(rng, 68, 2)), 11);

  drawGhostSilhouette(ctx, 'Mirror Crystal Ghost', 'crystal', Math.round(jit(rng, 148, 3)), Math.round(jit(rng, 102, 2)), 0.9);
  drawGhostSilhouette(ctx, 'Funhouse Cat Ghost', 'cat', Math.round(jit(rng, 336, 3)), Math.round(jit(rng, 102, 2)), 0.9);
  drawGhostSilhouette(ctx, 'Confetti Balloon Ghost', 'balloon', Math.round(jit(rng, 444, 3)), Math.round(jit(rng, 114, 2)), 0.85);

  drawHorizonHills(ctx, { style: 'clouds', yBase: 170, yBottom: 218, layers: 2 });
  drawGroundDeck(ctx, { style: 'stage', yTop: 206, yBottom: 250, labelPrefix: 'Prism' });

  // Grand Funhouse Mirror Hall center + Flanking Circus Lanterns & Big-Top Tent
  const hall = drawMirrorHall(ctx, 240, 170, 1.08);
  const lampL = drawPaperLantern(ctx, 76, 164, 0.82, { label: 'Mirror West' });
  const lampR = drawPaperLantern(ctx, 404, 164, 0.82, { label: 'Mirror East' });

  ctx.ellipsePath('ring', ox, oy, orb.rx * 1.15, orb.ry * 1.3, 24, orb.tilt);
  const sprintPath = ctx.wavePath('sprint', 68, 232, 412, 232, 8, 2, 18);
  const orbitPath = ctx.ellipsePath('orbit', 240, 96, 174, 46, 24);
  ctx.marginPath(256);

  ctx.actor('violet', 152, 242, { facing: 1, anim: 'idle' });
  ctx.actor('nova', 328, 240, { facing: -1, anim: 'idle', pathIndex: sprintPath });
  ctx.actor('moonCat', 240, 234, { facing: 1, anim: 'sleep' });
  ctx.actor('comet', 62, 98, { facing: 1, anim: 'float', pathIndex: orbitPath });

  ctx.heroQuest('tent', 'Mirror Hall', [hall[0] as number, hall[1] as number, ...lampL, ...lampR]);
  ctx.heroQuest('geode', 'Prism Mirrors', [hall[2] as number, hall[3] as number, 12, 13]);
  ctx.heroQuest('violet', 'Violet', [1, 2, 3, 4]);
  ctx.heroQuest('nova', 'Nova', [9, 10, 11]);
}

/** Chapter 4B: The Popcorn & Cotton-Candy Midway */
function buildU14C4b(ctx: SceneCtx): void {
  const { rng } = ctx;
  setupMeta(ctx, chapterTitle('u14_c4b'), 240, 154);
  drawSkySparkles(ctx, 20, 122, 'hearts');

  const ox = Math.round(jit(rng, 88, 4));
  const oy = Math.round(jit(rng, 52, 3));
  const orb = drawThemedOrb(ctx, ox, oy, 20, 'donutPlanet', { tilt: -0.22 });
  drawThemedCloud(ctx, 14, Math.round(jit(rng, 244, 4)), Math.round(jit(rng, 42, 3)), 88, 28, 'cottonCandy');
  drawThemedCloud(ctx, 15, Math.round(jit(rng, 404, 4)), Math.round(jit(rng, 50, 3)), 84, 28, 'cottonCandy');

  star(ctx, ctx.dyn('star', 'Midway Sweet Star'), Math.round(jit(rng, 170, 3)), Math.round(jit(rng, 36, 2)), 10);
  twinkle(ctx, ctx.dyn('star', 'Sugar Sparkle'), Math.round(jit(rng, 328, 3)), Math.round(jit(rng, 38, 2)), 11);

  drawGhostSilhouette(ctx, 'Cupcake Midway Ghost', 'cupcake', Math.round(jit(rng, 162, 3)), Math.round(jit(rng, 92, 2)), 0.9);
  drawGhostSilhouette(ctx, 'Midway Balloon Ghost', 'balloon', Math.round(jit(rng, 328, 3)), Math.round(jit(rng, 92, 2)), 0.9);
  drawGhostSilhouette(ctx, 'Sweet Cat Ghost', 'cat', Math.round(jit(rng, 444, 3)), Math.round(jit(rng, 114, 2)), 0.85);

  drawHorizonHills(ctx, { style: 'clouds', yBase: 170, yBottom: 218, layers: 2 });
  drawGroundDeck(ctx, { style: 'pier', yTop: 206, yBottom: 250, labelPrefix: 'Midway' });

  // Twin Festive Midway Treat Booths (Popcorn & Cotton Candy) + Center Carousel
  const popL = drawPopcornBooth(ctx, 90, 174, 0.94, 'Popcorn');
  const candyR = drawPopcornBooth(ctx, 390, 174, 0.94, 'Cotton-Candy');
  const carC = drawCarousel(ctx, 240, 172, 0.98, { label: 'Midway' });

  ctx.ellipsePath('ring', ox, oy, orb.rx * 1.15, orb.ry * 1.3, 24, orb.tilt);
  const gallopPath = ctx.wavePath('gallop', 72, 232, 408, 232, 8, 2, 18);
  const sprintPath = ctx.wavePath('sprint', 68, 238, 412, 238, 7, 2.5, 18);
  const orbitPath = ctx.ellipsePath('orbit', 240, 96, 174, 46, 24);
  ctx.marginPath(256);

  ctx.actor('violet', 148, 242, { facing: 1, anim: 'idle' });
  ctx.actor('lumi', 240, 242, { facing: 1, anim: 'idle', pathIndex: gallopPath });
  ctx.actor('nova', 338, 240, { facing: -1, anim: 'idle', pathIndex: sprintPath });
  ctx.actor('moonCat', 432, 234, { facing: -1, anim: 'sleep' });

  ctx.heroQuest('milkshake', 'Sweet Booths', [...popL, ...candyR]);
  ctx.heroQuest('tent', 'Midway Ride', carC);
  ctx.heroQuest('violet', 'Violet', [1, 2, 3, 4]);
  ctx.heroQuest('lumi', 'Lumi', [5, 6, 7, 8]);
  void orbitPath;
}

/** Chapter 5 (Grand Finale): The Grand Finale Sky-Fireworks Ring (50..70 regions!) */
function buildU14C5(ctx: SceneCtx): void {
  const { r, rng } = ctx;
  setupMeta(ctx, chapterTitle('u14_c5'), 240, 132);
  drawSkySparkles(ctx, 22, 118, 'hearts');

  const ox = Math.round(jit(rng, 72, 3));
  const oy = Math.round(jit(rng, 52, 2));
  const orb = drawThemedOrb(ctx, ox, oy, 18, 'macaronOrb', { tilt: -0.24 });
  drawThemedCloud(ctx, 14, 62, 118, 76, 24, 'cottonCandy');
  drawThemedCloud(ctx, 15, 418, 118, 76, 24, 'cottonCandy');

  star(ctx, ctx.dyn('star', 'West Jubilee Star'), 36, 24, 9.5);
  star(ctx, ctx.dyn('star', 'East Jubilee Star'), 444, 24, 9.5);
  const eastMoon = ctx.dyn('star', 'Carnival Crescent');
  crescent(ctx, eastMoon, 408, 52, 18, -0.42);
  twinkle(ctx, ctx.dyn('star', 'Fireworks Crown Star'), 240, 18, 10.5);

  drawGhostSilhouette(ctx, 'Jubilee Balloon Ghost', 'balloon', 152, 34, 0.85);
  drawGhostSilhouette(ctx, 'Star Butterfly Ghost', 'butterfly', 328, 34, 0.85);
  drawGhostSilhouette(ctx, 'Carnival Cat Ghost', 'cat', 30, 85, 0.9);

  // 10 radiant Sky-Fireworks Burst Petals exploding in panoramic arc behind the Big-Top!
  const mcx = 240;
  const mcy = 128;
  const burstIds: number[] = [];
  for (let i = 0; i < 10; i++) {
    const a = -Math.PI + ((i + 0.5) * Math.PI) / 10;
    const fid = ctx.dyn('star', `Sky Firework Burst ${i + 1}`);
    burstIds.push(fid);
    const r0 = 38;
    const rMid = 66;
    const r1 = 94;
    const hw = 0.125;
    r.poly(fid, [
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
      { only: [fid] },
    );
  }

  drawHorizonHills(ctx, { style: 'clouds', yBase: 170, yBottom: 216, layers: 2 });
  drawGroundDeck(ctx, { style: 'stage', yTop: 208, yBottom: 250, labelPrefix: 'Grand Ring' });

  // Grand Center Big-Top + Flanking Ferris Wheel (left) & Carousel (right) + Twin Balloons + Lanterns
  const bigTop = drawCircusBigTop(ctx, 240, 164, 1.06, { label: 'Jubilee' });
  const ferrisL = drawFerrisWheel(ctx, 94, 168, 0.92, { label: 'Jubilee' });
  const carouselR = drawCarousel(ctx, 386, 172, 0.92, { label: 'Jubilee' });
  const balL = drawHotAirBalloon(ctx, 148, 90, 0.72, 'Jubilee West');
  const balR = drawHotAirBalloon(ctx, 332, 90, 0.72, 'Jubilee East');

  ctx.ellipsePath('ring', ox, oy, orb.rx * 1.15, orb.ry * 1.3, 24, orb.tilt);
  const gallopPath = ctx.wavePath('gallop', 66, 236, 414, 236, 7, 2, 20);
  const sprintPath = ctx.wavePath('sprint', 88, 232, 392, 232, 9, 2.5, 20);
  const orbitPath = ctx.ellipsePath('orbit', 240, 108, 182, 54, 28);
  ctx.marginPath(256);

  ctx.actor('lumi', 152, 244, { facing: 1, anim: 'rear', pathIndex: gallopPath });
  ctx.actor('violet', 240, 248, { facing: 1, anim: 'idle' });
  ctx.actor('nova', 328, 244, { facing: -1, anim: 'leap', pathIndex: sprintPath });
  ctx.actor('moonCat', 56, 234, { facing: 1, anim: 'sleep' });
  ctx.actor('comet', 424, 84, { facing: -1, anim: 'float', pathIndex: orbitPath });

  ctx.heroQuest('tent', 'Grand Carnival', [...bigTop, ...burstIds.slice(0, 5)]);
  ctx.heroQuest('violet', 'Violet', [1, 2, 3, 4]);
  ctx.heroQuest('lumi', 'Lumi', [5, 6, 7, 8]);
  ctx.heroQuest('nova', 'Nova', [9, 10, 11]);
  void ferrisL;
  void carouselR;
  void balL;
  void balR;
}

export const U14_SCENES: Record<U14SceneId, (ctx: SceneCtx) => void> = {
  hub_cloudCircusCarnival: buildHubCloudCircusCarnival,
  u14_c1: buildU14C1,
  u14_c2a: buildU14C2a,
  u14_c2b: buildU14C2b,
  u14_c3a: buildU14C3a,
  u14_c3b: buildU14C3b,
  u14_c4a: buildU14C4a,
  u14_c4b: buildU14C4b,
  u14_c5: buildU14C5,
};
