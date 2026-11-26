/**
 * Universe 4: Luminous Toadstool Glade (9 bespoke procedural scenes: 1 Hub Sanctuary + 8 Chapters).
 * Pure & deterministic (ctx.rng only), strict >= 60px region hygiene, clean bottom margin (y <= 252).
 */
import { MaterialId } from '../../contracts/materials';
import type { SceneId } from '../../contracts/roguelike';
import { UNIVERSE_BY_ID } from '../../contracts/universes';
import type { SceneCtx } from '../context';
import {
  drawFairyLantern,
  drawGlassConservatory,
  drawGroundDeck,
  drawHollowOak,
  drawHorizonHills,
  drawSanctuaryRoom,
  drawSkySparkles,
  drawThemedCloud,
  drawThemedOrb,
  drawToadstoolHouse,
  ghostCreature,
} from '../kit';
import { crescent, inkArc, jit, pearl, star, twinkle } from '../props';
import { INK, W, type Pt } from '../raster';

const UNI = UNIVERSE_BY_ID.mushroomGlade;
const CH = Object.fromEntries(UNI.chapters.map((c) => [c.id, c]));

function initChapter(ctx: SceneCtx, id: string, fx = 240, fy = 138): void {
  const ch = CH[id];
  ctx.title = ch ? ch.title : id;
  ctx.sky = UNI.sky;
  ctx.universeId = UNI.id;
  ctx.ambient = UNI.ambient;
  ctx.focal = { x: fx, y: fy };
}

/** Giant mossy mushroom stepping-stone archway gate (3 chunky regions). */
function drawToadstoolGate(ctx: SceneCtx, x: number, y: number, label: string): number[] {
  const { r } = ctx;
  const stalks = ctx.dyn('flora', `${label} Gate Stalks`);
  const cap = ctx.dyn('flora', `${label} Arch Cap`);
  const spots = ctx.dyn('star', `${label} Glow Spots`);
  // Twin curved mushroom pillars
  r.capsule(stalks, x - 34, y + 36, x - 30, y - 6, 9);
  r.capsule(stalks, x + 34, y + 36, x + 30, y - 6, 9);
  r.ellipse(stalks, x - 34, y + 34, 14, 6);
  r.ellipse(stalks, x + 34, y + 34, 14, 6);
  // Broad canopy arch cap bridging the stalks
  r.shape(cap, x - 54, y - 42, x + 54, y + 4, (px, py) => {
    const dx = (px - x) / 52;
    const dy = (py - (y - 2)) / 36;
    if (dy > 0.1) return false;
    return dx * dx + dy * dy <= 1;
  });
  inkArc(r, x, y + 2, 42, 8, Math.PI * 1.05, Math.PI * 1.95, 0, { only: [cap] });
  // Three glowing spots on the arch cap
  r.disc(spots, x - 24, y - 14, 8);
  r.disc(spots, x, y - 24, 9);
  r.disc(spots, x + 24, y - 14, 8);
  return [stalks, cap, spots];
}

/** Curled giant dewdrop fiddlehead fern cradling a crystal bead (2 chunky regions). */
function drawFiddleheadFern(ctx: SceneCtx, x: number, y: number, flip: 1 | -1, label: string): [number, number] {
  const { r } = ctx;
  const frond = ctx.dyn('flora', `${label} Fern Frond`);
  const dew = ctx.dyn('star', `${label} Dewdrop Orb`);
  r.capsule(frond, x, y + 34, x - 8 * flip, y + 2, 7.5);
  r.capsule(frond, x - 8 * flip, y + 2, x + 6 * flip, y - 22, 6.8);
  r.disc(frond, x + 10 * flip, y - 18, 12);
  r.ellipse(frond, x - 18 * flip, y + 12, 13, 6, -0.4 * flip);
  r.ellipse(frond, x + 14 * flip, y + 18, 12, 5.5, 0.35 * flip);
  inkArc(r, x + 10 * flip, y - 18, 7, 7, 0, Math.PI * 1.6, 0, { only: [frond] });
  pearl(ctx, dew, x + 12 * flip, y - 2, 9);
  return [frond, dew];
}

/** Arched mossy footbridge spanning a glowing bioluminescent brook (2 chunky regions). */
function drawMossBridge(ctx: SceneCtx, x: number, y: number, label: string): [number, number] {
  const { r } = ctx;
  const rail = ctx.dyn('prop', `${label} Bridge Rail`);
  const arch = ctx.dyn('flora', `${label} Moss Arch`);
  const railTop: Pt[] = [];
  const railBot: Pt[] = [];
  for (let i = -8; i <= 8; i++) {
    const t = i / 8;
    const bx = x + t * 84;
    const by = y - 20 + t * t * 22;
    railTop.push([bx, by - 7]);
    railBot.push([bx, by + 4]);
  }
  railBot.reverse();
  r.poly(rail, [...railTop, ...railBot]);
  for (let i = -6; i <= 6; i += 3) {
    const t = i / 8;
    const bx = x + t * 84;
    const by = y - 20 + t * t * 22;
    r.rect(rail, bx - 4, by, bx + 4, by + 16);
  }
  r.shape(arch, x - 90, y - 14, x + 90, y + 28, (px, py) => {
    const t = (px - x) / 86;
    if (Math.abs(t) > 1) return false;
    const topY = y - 12 + t * t * 22;
    const botY = y + 6 + t * t * 22;
    return py >= topY && py <= botY;
  });
  for (let i = -6; i <= 6; i += 2) {
    const t = i / 8;
    const bx = x + t * 84;
    const by = y - 4 + t * t * 22;
    r.line(INK, bx, by - 6, bx, by + 8, { only: [arch] });
  }
  return [rail, arch];
}

/** Giant luminous luna-moth wing amphitheater backdrop (3 chunky regions). */
function drawLunaMothAltar(ctx: SceneCtx, x: number, y: number, label: string): number[] {
  const { r } = ctx;
  const upperWings = ctx.dyn('flora', `${label} Upper Wings`);
  const lowerWings = ctx.dyn('flora', `${label} Lower Wings`);
  const body = ctx.dyn('star', `${label} Moth Crest`);

  // Broad sweeping upper velvet wings
  r.poly(upperWings, [
    [x - 8, y - 8],
    [x - 56, y - 42],
    [x - 74, y - 14],
    [x - 54, y + 10],
    [x - 8, y + 6],
  ]);
  r.poly(upperWings, [
    [x + 8, y - 8],
    [x + 56, y - 42],
    [x + 74, y - 14],
    [x + 54, y + 10],
    [x + 8, y + 6],
  ]);
  inkArc(r, x - 44, y - 14, 9, 9, 0, Math.PI * 2, 0, { only: [upperWings] });
  inkArc(r, x + 44, y - 14, 9, 9, 0, Math.PI * 2, 0, { only: [upperWings] });

  // Trailing tailed lower moth wings
  r.poly(lowerWings, [
    [x - 8, y + 6],
    [x - 46, y + 10],
    [x - 38, y + 36],
    [x - 16, y + 26],
  ]);
  r.poly(lowerWings, [
    [x + 8, y + 6],
    [x + 46, y + 10],
    [x + 38, y + 36],
    [x + 16, y + 26],
  ]);

  // Glowing crescent crest body
  r.ellipse(body, x, y + 2, 13, 28);
  r.disc(body, x, y - 24, 10);
  r.line(INK, x, y - 16, x, y + 24, { only: [body] });
  return [upperWings, lowerWings, body];
}

/** Glowing miniature toadstool cluster for undergrowth (2 chunky regions). */
function drawGlowCapCluster(ctx: SceneCtx, x: number, y: number, label: string): [number, number] {
  const { r } = ctx;
  const stems = ctx.dyn('flora', `${label} Stems`);
  const caps = ctx.dyn('flora', `${label} Glow Caps`);
  r.rect(stems, x - 18, y - 4, x - 8, y + 18);
  r.rect(stems, x + 6, y - 10, x + 18, y + 18);
  r.ellipse(caps, x - 13, y - 8, 14, 8.5);
  r.ellipse(caps, x + 12, y - 14, 16, 10);
  inkArc(r, x - 13, y - 8, 3, 3, 0, Math.PI * 2, 0, { only: [caps] });
  inkArc(r, x + 12, y - 15, 3.5, 3.5, 0, Math.PI * 2, 0, { only: [caps] });
  return [stems, caps];
}

// ============================================================================
// HUB SANCTUARY: Violet's Mossy Firefly Hollow
// ============================================================================
function hub_mushroomGlade(ctx: SceneCtx): void {
  ctx.universeId = UNI.id;
  ctx.ambient = UNI.ambient;
  const showcaseIds: number[] = [];

  drawSanctuaryRoom(ctx, {
    title: UNI.hubTitle,
    sky: UNI.sky,
    windowShape: 'arched',
    windowOrbStyle: 'lanternMoon',
    wallStyle: 'stone',
    floorStyle: 'moss',
    rugShape: 'round',
    lampStyle: 'mushroom',
    garlandStyle: 'leaves',
    sparkleStyle: 'stars',
    violetPos: { x: 204, y: 238, facing: 1 },
    workbenchLabel: 'Spore Craft Bench',
    shelfLabel: 'Hollow Oak Shelf',
    seatingLabel: 'Mossy Nook Bed',
    trinketLabels: ['Firefly Logs', 'Moss Potions', 'Glade Tales'],
    palette: {
      wallPanel: MaterialId.DeepSpaceBiolum,
      floor: MaterialId.DragonflyIridescence,
      windowFrame: MaterialId.SolarFlare24K,
      windowGlass: MaterialId.VelvetNebula,
      curtain: MaterialId.LiquidAurora,
      orbCore: MaterialId.SolarFlare24K,
      orbRing: MaterialId.CrystalGlacierMint,
      rugOuter: MaterialId.VelvetNebula,
      rugInner: MaterialId.CrystalGlacierMint,
      furniture: MaterialId.RoyalAstralGold,
      furnitureTrim: MaterialId.AuroraSherbet,
      accentA: MaterialId.CrystalGlacierMint,
      accentB: MaterialId.SolarFlare24K,
      accentC: MaterialId.DragonflyIridescence,
    },
    drawWindowView: (c, wx) => {
      const caps = c.dyn('flora', 'Window Toadstool Grove');
      c.r.ellipse(caps, wx - 16, 124, 14, 9);
      c.r.ellipse(caps, wx + 12, 120, 17, 10);
      c.r.rect(caps, wx - 20, 124, wx - 12, 136);
      c.r.rect(caps, wx + 6, 120, wx + 18, 136);
      c.preColor(caps, MaterialId.CrystalGlacierMint);
    },
    drawExtraProps: (c) => {
      const { r } = c;
      // 1) Left wall botanical fern & firefly wreath plaque (2 regions)
      const wreath = c.dyn('flora', 'Moss Fern Wreath');
      r.disc(wreath, 84, 92, 22);
      inkArc(r, 84, 92, 16, 16, 0, Math.PI * 2, 0, { only: [wreath] });
      c.preColor(wreath, MaterialId.DragonflyIridescence);

      const fireflyGem = c.dyn('star', 'Wreath Firefly Glow');
      star(c, fireflyGem, 84, 92, 10, { points: 4, inner: 0.48 });
      c.preColor(fireflyGem, MaterialId.SolarFlare24K);

      // 2) Floor standing Giant Luminous Toadstool Terrarium beside Violet (3 regions)
      const pot = c.dyn('prop', 'Moss Terrarium Pot');
      r.poly(pot, [[252, 206], [286, 206], [282, 226], [256, 226]]);
      r.rect(pot, 249, 202, 289, 208);
      c.preColor(pot, MaterialId.RoyalAstralGold);

      const stalk = c.dyn('flora', 'Sanctuary Toadstool Stalk');
      r.rect(stalk, 261, 174, 277, 202);
      c.preColor(stalk, MaterialId.OpalPearl);

      const cap = c.dyn('flora', 'Sanctuary Glowing Cap');
      r.ellipse(cap, 269, 170, 22, 13);
      inkArc(r, 260, 168, 3, 3, 0, Math.PI * 2, 0, { only: [cap] });
      inkArc(r, 277, 169, 3, 3, 0, Math.PI * 2, 0, { only: [cap] });
      c.preColor(cap, MaterialId.CrystalGlacierMint);
      showcaseIds.push(pot, stalk, cap);

      // 3) Desk-right Glowing Firefly Jar & Upper-Right Leaf Tapestry (2 regions)
      const deskJar = c.dyn('star', 'Desk Firefly Lantern');
      r.ellipse(deskJar, 375, 165, 11, 14);
      r.rect(deskJar, 367, 148, 383, 154);
      c.preColor(deskJar, MaterialId.SolarFlare24K);

      const wallBanner = c.dyn('prop', 'Glade Leaf Banner');
      r.poly(wallBanner, [[334, 72], [372, 72], [372, 112], [353, 124], [334, 112]]);
      c.preColor(wallBanner, MaterialId.LiquidAurora);

      return [wreath, fireflyGem, pot, stalk, cap, deskJar, wallBanner];
    },
  });

  ctx.heroQuest('violet', 'Violet', [1, 2, 3, 4]);
  ctx.heroQuest('planet', 'Lantern Moon', [12, 13]);
  ctx.heroQuest('mushroom', 'Glow Cap', showcaseIds);
}

// ============================================================================
// SLOT 1: The Firefly Stepping-Stone Gate
// ============================================================================
function u04_c1(ctx: SceneCtx): void {
  initChapter(ctx, 'u04_c1', 240, 148);
  const { rng } = ctx;

  drawSkySparkles(ctx, 20, 144, 'stars');

  const orbX = Math.round(jit(rng, 382, 5));
  const orbY = Math.round(jit(rng, 56, 3));
  const orb = drawThemedOrb(ctx, orbX, orbY, 21, 'lanternMoon', { tilt: -0.24 });

  ctx.canon(14, 'Firefly Mist Cloud', 'cloud');
  ctx.canon(15, 'Twilight Spore Cloud', 'cloud');
  drawThemedCloud(ctx, 14, Math.round(jit(rng, 98, 5)), Math.round(jit(rng, 52, 3)), 82, 28, 'fluffy');
  drawThemedCloud(ctx, 15, Math.round(jit(rng, 242, 5)), Math.round(jit(rng, 44, 3)), 76, 26, 'fluffy');

  drawHorizonHills(ctx, { style: 'mushroom', yBase: 164, yBottom: 214, layers: 2 });
  drawGroundDeck(ctx, { style: 'gardenPath', yTop: 208, yBottom: 250, labelPrefix: 'Velvet Moss' });

  // Centerpiece Mossy Toadstool Gate + flanking Fairy Lanterns + Glow Cap Cluster
  const gateIds = drawToadstoolGate(ctx, 240, 174, 'Stepping-Stone');
  const lampL = drawFairyLantern(ctx, 84, 174, 0.92, { label: 'West Gate' });
  drawFairyLantern(ctx, 396, 174, 0.92, { label: 'East Gate', flip: -1 });
  twinkle(ctx, ctx.dyn('star', 'Firefly Beacon A'), 160, 108, 11);
  twinkle(ctx, ctx.dyn('star', 'Firefly Beacon B'), 320, 108, 11);

  // 3 ghosts in open sky
  ghostCreature(ctx, 'moth', 176, 56, 'Firefly Moth Ghost');
  ghostCreature(ctx, 'owl', 308, 58, 'Gatekeeper Owl Ghost');
  ghostCreature(ctx, 'fox', 442, 114, 'Moss Fox Ghost');

  ctx.ellipsePath('ring', orbX, orbY, orb.rx, orb.ry, 24, orb.tilt);
  const gallopPath = ctx.wavePath('gallop', 66, 236, 414, 236, 8, 2, 20);
  const orbitPath = ctx.ellipsePath('orbit', 240, 86, 176, 46, 24);
  ctx.marginPath(256);

  ctx.actor('violet', 142, 244, { facing: 1, anim: 'idle' });
  ctx.actor('lumi', 322, 244, { facing: -1, anim: 'idle', pathIndex: gallopPath });
  ctx.actor('moonCat', 240, 242, { facing: 1, anim: 'peek' });
  ctx.actor('comet', 240, 92, { facing: 1, anim: 'float', pathIndex: orbitPath });

  ctx.heroQuest('lantern', 'Firefly Gate', [...gateIds, ...lampL]);
  ctx.heroQuest('violet', 'Violet', [1, 2, 3, 4]);
  ctx.heroQuest('lumi', 'Lumi', [5, 6, 7, 8]);
  ctx.heroQuest('planet', 'Lantern Moon', [12, 13]);
}

// ============================================================================
// SLOT 2A: The Polka-Dot Toadstool Village
// ============================================================================
function u04_c2a(ctx: SceneCtx): void {
  initChapter(ctx, 'u04_c2a', 238, 146);
  const { rng } = ctx;

  drawSkySparkles(ctx, 18, 144, 'stars');

  const orbX = Math.round(jit(rng, 98, 5));
  const orbY = Math.round(jit(rng, 56, 3));
  const orb = drawThemedOrb(ctx, orbX, orbY, 21, 'lanternMoon', { tilt: -0.24 });

  ctx.canon(14, 'Village Mist Cloud', 'cloud');
  ctx.canon(15, 'Spore Drift Cloud', 'cloud');
  drawThemedCloud(ctx, 14, Math.round(jit(rng, 244, 5)), Math.round(jit(rng, 44, 3)), 82, 28, 'fluffy');
  drawThemedCloud(ctx, 15, Math.round(jit(rng, 392, 5)), Math.round(jit(rng, 54, 3)), 78, 28, 'fluffy');

  drawHorizonHills(ctx, { style: 'mushroom', yBase: 166, yBottom: 214, layers: 2 });
  drawGroundDeck(ctx, { style: 'meadow', yTop: 208, yBottom: 250, labelPrefix: 'Toadstool' });

  // Twin Polka-Dot Toadstool Cottages + Village Fairy Lantern
  const houseMain = drawToadstoolHouse(ctx, 152, 174, 1.1, { label: 'Polka-Dot' });
  drawToadstoolHouse(ctx, 376, 180, 0.84, { label: 'Cozy East', flip: -1 });
  const lampMid = drawFairyLantern(ctx, 272, 178, 0.9, { label: 'Village' });
  pearl(ctx, ctx.dyn('star', 'Village Spore Orb'), 56, 142, 10);

  // 3 ghosts in open sky
  ghostCreature(ctx, 'moth', 176, 56, 'Village Moth Ghost');
  ghostCreature(ctx, 'owl', 318, 58, 'Toadstool Owl Ghost');
  ghostCreature(ctx, 'fox', 442, 114, 'Glade Fox Ghost');

  ctx.ellipsePath('ring', orbX, orbY, orb.rx, orb.ry, 24, orb.tilt);
  const sprintPath = ctx.wavePath('sprint', 66, 236, 414, 236, 8, 2, 20);
  const orbitPath = ctx.ellipsePath('orbit', 240, 86, 178, 46, 24);
  ctx.marginPath(256);

  ctx.actor('violet', 120, 244, { facing: 1, anim: 'idle' });
  ctx.actor('nova', 302, 244, { facing: -1, anim: 'leap', pathIndex: sprintPath });
  ctx.actor('moonCat', 216, 242, { facing: 1, anim: 'sleep' });
  ctx.actor('comet', 298, 92, { facing: -1, anim: 'float', pathIndex: orbitPath });

  ctx.heroQuest('mushroom', 'Toadstool Home', houseMain);
  ctx.heroQuest('lantern', 'Fairy Lamp', lampMid);
  ctx.heroQuest('violet', 'Violet', [1, 2, 3, 4]);
  ctx.heroQuest('nova', 'Nova', [9, 10, 11]);
}

// ============================================================================
// SLOT 2B: The Dewdrop Fern Conservatory
// ============================================================================
function u04_c2b(ctx: SceneCtx): void {
  initChapter(ctx, 'u04_c2b', 242, 144);
  const { rng } = ctx;

  drawSkySparkles(ctx, 18, 144, 'bubbles');

  const orbX = Math.round(jit(rng, 96, 5));
  const orbY = Math.round(jit(rng, 58, 3));
  const orb = drawThemedOrb(ctx, orbX, orbY, 21, 'bubbleOrb', { tilt: -0.24 });

  ctx.canon(14, 'Dewdrop Cloud', 'cloud');
  ctx.canon(15, 'Fern Mist Cloud', 'cloud');
  drawThemedCloud(ctx, 14, Math.round(jit(rng, 240, 5)), Math.round(jit(rng, 44, 3)), 82, 28, 'fluffy');
  drawThemedCloud(ctx, 15, Math.round(jit(rng, 390, 5)), Math.round(jit(rng, 54, 3)), 78, 28, 'fluffy');

  drawHorizonHills(ctx, { style: 'mushroom', yBase: 166, yBottom: 214, layers: 2 });
  drawGroundDeck(ctx, { style: 'gardenPath', yTop: 208, yBottom: 250, labelPrefix: 'Dewdrop' });

  // Glass Fern Conservatory + Giant Curled Fiddlehead Ferns cradling starlight dewdrops!
  const glassIds = drawGlassConservatory(ctx, 272, 174, 1.04, { label: 'Dewdrop' });
  const fernL = drawFiddleheadFern(ctx, 96, 178, 1, 'West Fiddlehead');
  const fernR = drawFiddleheadFern(ctx, 404, 178, -1, 'East Fiddlehead');
  drawGlowCapCluster(ctx, 44, 198, 'Conservatory');
  star(ctx, ctx.dyn('star', 'Dew Starlight'), 172, 104, 11, { points: 4, inner: 0.44 });

  // 3 ghosts in open sky
  ghostCreature(ctx, 'moth', 174, 56, 'Dew Moth Ghost');
  ghostCreature(ctx, 'butterfly', 318, 58, 'Fern Butterfly Ghost');
  ghostCreature(ctx, 'owl', 442, 114, 'Glasshouse Owl Ghost');

  ctx.ellipsePath('ring', orbX, orbY, orb.rx, orb.ry, 24, orb.tilt);
  const gallopPath = ctx.wavePath('gallop', 66, 236, 414, 236, 8, 2, 20);
  const orbitPath = ctx.ellipsePath('orbit', 240, 86, 178, 46, 24);
  ctx.marginPath(256);

  ctx.actor('lumi', 142, 244, { facing: 1, anim: 'rear', pathIndex: gallopPath });
  ctx.actor('gazelle', 338, 244, { facing: -1, anim: 'idle', pathIndex: gallopPath });
  ctx.actor('moonCat', 240, 242, { facing: 1, anim: 'sleep' });
  ctx.actor('comet', 336, 94, { facing: -1, anim: 'float', pathIndex: orbitPath });

  void fernL;
  void fernR;
  ctx.heroQuest('mushroom', 'Fern Dome', glassIds);
  ctx.heroQuest('lumi', 'Lumi', [5, 6, 7, 8]);
  ctx.heroQuest('planet', 'Dewdrop Orb', [12, 13]);
  ctx.heroQuest('cloud', 'Mist Clouds', [14, 15]);
}

// ============================================================================
// SLOT 3A: The Hollow-Oak Story Tree
// ============================================================================
function u04_c3a(ctx: SceneCtx): void {
  initChapter(ctx, 'u04_c3a', 240, 144);
  const { rng } = ctx;

  drawSkySparkles(ctx, 18, 144, 'stars');

  const orbX = Math.round(jit(rng, 384, 5));
  const orbY = Math.round(jit(rng, 56, 3));
  const orb = drawThemedOrb(ctx, orbX, orbY, 21, 'lanternMoon', { tilt: -0.25 });

  ctx.canon(14, 'Story-Tree Cloud', 'cloud');
  ctx.canon(15, 'Owl-Chime Cloud', 'cloud');
  drawThemedCloud(ctx, 14, Math.round(jit(rng, 96, 5)), Math.round(jit(rng, 52, 3)), 82, 28, 'fluffy');
  drawThemedCloud(ctx, 15, Math.round(jit(rng, 240, 5)), Math.round(jit(rng, 44, 3)), 76, 26, 'fluffy');

  drawHorizonHills(ctx, { style: 'mushroom', yBase: 166, yBottom: 214, layers: 2 });
  drawGroundDeck(ctx, { style: 'meadow', yTop: 208, yBottom: 250, labelPrefix: 'Story Oak' });

  // Grand Hollow-Oak Story Tree centerpiece + flanking Fairy Lantern & Glow Caps
  const oakIds = drawHollowOak(ctx, 240, 168, 1.2, { label: 'Story' });
  drawFairyLantern(ctx, 90, 176, 0.92, { label: 'Oak Story' });
  drawGlowCapCluster(ctx, 386, 198, 'Oak Root');
  // Hanging wind-chime stars on oak boughs
  star(ctx, ctx.dyn('star', 'Oak Chime West'), 166, 146, 10.5, { points: 5, inner: 0.48 });
  star(ctx, ctx.dyn('star', 'Oak Chime East'), 314, 146, 10.5, { points: 5, inner: 0.48 });
  crescent(ctx, ctx.dyn('star', 'Story Tree Moon'), 48, 110, 15, -0.45);

  // 3 ghosts in open sky
  ghostCreature(ctx, 'owl', 174, 56, 'Story Owl Ghost');
  ghostCreature(ctx, 'moth', 310, 58, 'Chime Moth Ghost');
  ghostCreature(ctx, 'fox', 442, 114, 'Hollow Fox Ghost');

  ctx.ellipsePath('ring', orbX, orbY, orb.rx, orb.ry, 24, orb.tilt);
  const gallopPath = ctx.wavePath('gallop', 66, 236, 414, 236, 8, 2, 20);
  const sprintPath = ctx.wavePath('sprint', 74, 236, 408, 236, 8, 2, 20);
  ctx.ellipsePath('orbit', 240, 86, 176, 46, 24);
  ctx.marginPath(256);

  ctx.actor('lumi', 132, 244, { facing: 1, anim: 'idle', pathIndex: gallopPath });
  ctx.actor('violet', 240, 246, { facing: 1, anim: 'idle' });
  ctx.actor('nova', 348, 244, { facing: -1, anim: 'leap', pathIndex: sprintPath });
  ctx.actor('moonCat', 428, 240, { facing: -1, anim: 'sleep' });

  ctx.heroQuest('mushroom', 'Hollow Oak', oakIds);
  ctx.heroQuest('violet', 'Violet', [1, 2, 3, 4]);
  ctx.heroQuest('lumi', 'Lumi', [5, 6, 7, 8]);
  ctx.heroQuest('nova', 'Nova', [9, 10, 11]);
}

// ============================================================================
// SLOT 3B: The Bioluminescent Brook Crossing
// ============================================================================
function u04_c3b(ctx: SceneCtx): void {
  initChapter(ctx, 'u04_c3b', 240, 148);
  const { r, rng } = ctx;

  drawSkySparkles(ctx, 18, 144, 'bubbles');

  const orbX = Math.round(jit(rng, 98, 5));
  const orbY = Math.round(jit(rng, 58, 3));
  const orb = drawThemedOrb(ctx, orbX, orbY, 21, 'bubbleOrb', { tilt: -0.24 });

  ctx.canon(14, 'Brook Mist Cloud', 'cloud');
  ctx.canon(15, 'Lily-Glow Cloud', 'cloud');
  drawThemedCloud(ctx, 14, Math.round(jit(rng, 244, 5)), Math.round(jit(rng, 44, 3)), 82, 28, 'fluffy');
  drawThemedCloud(ctx, 15, Math.round(jit(rng, 392, 5)), Math.round(jit(rng, 54, 3)), 78, 28, 'fluffy');

  drawHorizonHills(ctx, { style: 'mushroom', yBase: 160, yBottom: 210, layers: 2 });

  // Glowing bioluminescent brook wave band (y = 202..248)
  const brook = ctx.dyn('prop', 'Bioluminescent Brook');
  r.rect(brook, 0, 204, W, 249);
  for (const wy of [216, 228, 240]) {
    const wPts: Pt[] = [];
    for (let x = 8; x <= W - 8; x += 16) wPts.push([x, wy + Math.sin(x * 0.04 + wy) * 2.5]);
    r.strokePath(INK, wPts, { only: [brook] });
  }

  // Arched Mossy Footbridge + Toadstool cottage on far bank + Lantern + Giant Lily Pads
  const bridgeIds = drawMossBridge(ctx, 240, 198, 'Brook');
  drawToadstoolHouse(ctx, 84, 170, 0.84, { label: 'Brookside' });
  const lampR = drawFairyLantern(ctx, 396, 174, 0.92, { label: 'Crossing', flip: -1 });

  // Floating glowing lily pads on the brook
  for (const [lx, ly, lbl] of [[78, 232, 'West Lily Pad'], [242, 234, 'Center Lily Pad'], [398, 232, 'East Lily Pad']] as const) {
    const pad = ctx.dyn('flora', lbl);
    r.ellipse(pad, lx, ly, 26, 9);
    r.line(INK, lx, ly, lx + 20, ly - 3, { only: [pad] });
  }

  // 3 ghosts in open sky
  ghostCreature(ctx, 'moth', 176, 56, 'Brook Moth Ghost');
  ghostCreature(ctx, 'koi', 318, 56, 'Glowing Brook Koi');
  ghostCreature(ctx, 'owl', 442, 114, 'Crossing Owl Ghost');

  ctx.ellipsePath('ring', orbX, orbY, orb.rx, orb.ry, 24, orb.tilt);
  const sprintPath = ctx.wavePath('sprint', 64, 212, 416, 212, 14, 1.5, 20);
  const orbitPath = ctx.ellipsePath('orbit', 240, 86, 176, 46, 24);
  ctx.marginPath(256);

  ctx.actor('violet', 152, 232, { facing: 1, anim: 'idle' });
  ctx.actor('nova', 322, 230, { facing: -1, anim: 'leap', pathIndex: sprintPath });
  ctx.actor('gazelle', 238, 194, { facing: 1, anim: 'idle', pathIndex: sprintPath });
  ctx.actor('comet', 298, 92, { facing: -1, anim: 'float', pathIndex: orbitPath });

  ctx.heroQuest('mushroom', 'Brook Bridge', bridgeIds);
  ctx.heroQuest('lantern', 'Glow Lantern', lampR);
  ctx.heroQuest('violet', 'Violet', [1, 2, 3, 4]);
  ctx.heroQuest('nova', 'Nova', [9, 10, 11]);
}

// ============================================================================
// SLOT 4A: The Fairy-Lantern Canopy Walk
// ============================================================================
function u04_c4a(ctx: SceneCtx): void {
  initChapter(ctx, 'u04_c4a', 240, 144);
  const { r, rng } = ctx;

  drawSkySparkles(ctx, 20, 140, 'stars');

  const orbX = Math.round(jit(rng, 384, 5));
  const orbY = Math.round(jit(rng, 56, 3));
  const orb = drawThemedOrb(ctx, orbX, orbY, 21, 'lanternMoon', { tilt: -0.25 });

  ctx.canon(14, 'Canopy Cloud', 'cloud');
  ctx.canon(15, 'Vine-Mist Cloud', 'cloud');
  drawThemedCloud(ctx, 14, Math.round(jit(rng, 96, 5)), Math.round(jit(rng, 52, 3)), 82, 28, 'fluffy');
  drawThemedCloud(ctx, 15, Math.round(jit(rng, 240, 5)), Math.round(jit(rng, 44, 3)), 76, 26, 'fluffy');

  drawHorizonHills(ctx, { style: 'mushroom', yBase: 162, yBottom: 214, layers: 2 });
  drawGroundDeck(ctx, { style: 'pier', yTop: 208, yBottom: 250, labelPrefix: 'Canopy Walk' });

  // Giant elevated mushroom caps + suspended vine bridge & glowing twin fairy lanterns
  const capL = ctx.dyn('flora', 'West Giant Cap');
  const capR = ctx.dyn('flora', 'East Giant Cap');
  r.ellipse(capL, 84, 192, 54, 22);
  r.ellipse(capR, 396, 192, 54, 22);
  inkArc(r, 64, 188, 5, 5, 0, Math.PI * 2, 0, { only: [capL] });
  inkArc(r, 100, 190, 6, 6, 0, Math.PI * 2, 0, { only: [capL] });
  inkArc(r, 380, 190, 6, 6, 0, Math.PI * 2, 0, { only: [capR] });
  inkArc(r, 416, 188, 5, 5, 0, Math.PI * 2, 0, { only: [capR] });

  const lampL = drawFairyLantern(ctx, 152, 168, 0.96, { label: 'West Canopy' });
  const lampR = drawFairyLantern(ctx, 328, 168, 0.96, { label: 'East Canopy', flip: -1 });
  const centerOrb = ctx.dyn('star', 'Canopy Chime Lantern');
  pearl(ctx, centerOrb, 240, 142, 13);
  star(ctx, ctx.dyn('star', 'Canopy Star West'), 64, 114, 11, { points: 5, inner: 0.48 });

  // 3 ghosts in open sky
  ghostCreature(ctx, 'moth', 174, 56, 'Canopy Moth Ghost');
  ghostCreature(ctx, 'butterfly', 310, 58, 'Vine Butterfly Ghost');
  ghostCreature(ctx, 'owl', 442, 114, 'Treetop Owl Ghost');

  ctx.ellipsePath('ring', orbX, orbY, orb.rx, orb.ry, 24, orb.tilt);
  const gallopPath = ctx.wavePath('gallop', 66, 236, 414, 236, 8, 2, 20);
  const orbitPath = ctx.ellipsePath('orbit', 240, 86, 176, 46, 24);
  ctx.marginPath(256);

  ctx.actor('violet', 142, 244, { facing: 1, anim: 'idle' });
  ctx.actor('lumi', 268, 244, { facing: 1, anim: 'idle', pathIndex: gallopPath });
  ctx.actor('gazelle', 382, 244, { facing: -1, anim: 'leap', pathIndex: gallopPath });
  ctx.actor('comet', 240, 96, { facing: 1, anim: 'float', pathIndex: orbitPath });

  ctx.heroQuest('lantern', 'Canopy Lamps', [...lampL, ...lampR, centerOrb]);
  ctx.heroQuest('mushroom', 'Giant Caps', [capL, capR]);
  ctx.heroQuest('violet', 'Violet', [1, 2, 3, 4]);
  ctx.heroQuest('lumi', 'Lumi', [5, 6, 7, 8]);
}

// ============================================================================
// SLOT 4B: The Luna-Moth Spore Amphitheater
// ============================================================================
function u04_c4b(ctx: SceneCtx): void {
  initChapter(ctx, 'u04_c4b', 240, 140);
  const { rng } = ctx;

  drawSkySparkles(ctx, 20, 140, 'stars');

  const orbX = Math.round(jit(rng, 98, 5));
  const orbY = Math.round(jit(rng, 56, 3));
  const orb = drawThemedOrb(ctx, orbX, orbY, 21, 'lanternMoon', { tilt: -0.24 });

  ctx.canon(14, 'Mint Spore Cloud', 'cloud');
  ctx.canon(15, 'Luna Velvet Cloud', 'cloud');
  drawThemedCloud(ctx, 14, Math.round(jit(rng, 244, 5)), Math.round(jit(rng, 44, 3)), 82, 28, 'fluffy');
  drawThemedCloud(ctx, 15, Math.round(jit(rng, 392, 5)), Math.round(jit(rng, 54, 3)), 78, 28, 'fluffy');

  drawHorizonHills(ctx, { style: 'mushroom', yBase: 162, yBottom: 214, layers: 2 });
  drawGroundDeck(ctx, { style: 'stage', yTop: 208, yBottom: 250, labelPrefix: 'Luna Stage' });

  // Centerpiece Sculpted Luna-Moth Wing Altar + flanking Fairy Lanterns + glowing spore pearls
  const mothIds = drawLunaMothAltar(ctx, 240, 154, 'Luna-Moth');
  const lampL = drawFairyLantern(ctx, 74, 174, 0.92, { label: 'Spore West' });
  const lampR = drawFairyLantern(ctx, 406, 174, 0.92, { label: 'Spore East', flip: -1 });
  pearl(ctx, ctx.dyn('star', 'Spore Pearl West'), 156, 108, 9.5);
  pearl(ctx, ctx.dyn('star', 'Spore Pearl East'), 324, 108, 9.5);

  // 3 ghosts in open sky
  ghostCreature(ctx, 'moth', 176, 56, 'Velvet Moth Ghost');
  ghostCreature(ctx, 'butterfly', 318, 56, 'Spore Butterfly Ghost');
  ghostCreature(ctx, 'owl', 442, 114, 'Stage Owl Ghost');

  ctx.ellipsePath('ring', orbX, orbY, orb.rx, orb.ry, 24, orb.tilt);
  const gallopPath = ctx.wavePath('gallop', 66, 236, 414, 236, 8, 2, 20);
  const sprintPath = ctx.wavePath('sprint', 74, 236, 408, 236, 8, 2, 20);
  const orbitPath = ctx.ellipsePath('orbit', 240, 86, 176, 46, 24);
  ctx.marginPath(256);

  ctx.actor('lumi', 138, 244, { facing: 1, anim: 'rear', pathIndex: gallopPath });
  ctx.actor('nova', 342, 244, { facing: -1, anim: 'leap', pathIndex: sprintPath });
  ctx.actor('moonCat', 240, 242, { facing: 1, anim: 'peek' });
  ctx.actor('comet', 240, 88, { facing: 1, anim: 'float', pathIndex: orbitPath });

  ctx.heroQuest('mushroom', 'Moth Stage', mothIds);
  ctx.heroQuest('lantern', 'Spore Lamps', [...lampL, ...lampR]);
  ctx.heroQuest('lumi', 'Lumi', [5, 6, 7, 8]);
  ctx.heroQuest('nova', 'Nova', [9, 10, 11]);
}

// ============================================================================
// SLOT 5 FINALE: The Great Mother-Cap Heart-Grove (50..70 regions!)
// ============================================================================
function u04_c5(ctx: SceneCtx): void {
  initChapter(ctx, 'u04_c5', 240, 124);
  const { r, rng } = ctx;

  drawSkySparkles(ctx, 22, 136, 'stars');

  // 1) Celestial Orb (12/13) (2 regions)
  const orbX = 76 + Math.round(jit(rng, 0, 3));
  const orbY = 56 + Math.round(jit(rng, 0, 2));
  const orb = drawThemedOrb(ctx, orbX, orbY, 19, 'lanternMoon', { tilt: -0.24 });

  // 2) Horizon mushroom hills & grand mossy glade floor (4 regions)
  drawHorizonHills(ctx, { style: 'mushroom', yBase: 162, yBottom: 214, layers: 2 });
  drawGroundDeck(ctx, { style: 'meadow', yTop: 208, yBottom: 250, labelPrefix: 'Heart-Grove' });

  // 3) Grand Centerpiece: The Great Mother-Cap Luminous Mushroom Dome (~15 chunky regions!)
  const domeQuestIds: number[] = [];
  const cx = 240;

  // 6 glowing spore-light rays fanning above the Mother-Cap dome (6 regions)
  for (let i = 0; i < 6; i++) {
    const a = -Math.PI + ((i + 0.5) / 6) * Math.PI;
    const rid = ctx.dyn('star', `Mother-Cap Ray ${i + 1}`);
    const x0 = cx + Math.cos(a) * 58;
    const y0 = 128 + Math.sin(a) * 48;
    const x1 = cx + Math.cos(a) * 90;
    const y1 = 128 + Math.sin(a) * 78;
    r.capsule(rid, x0, y0, x1, y1, 7.5);
    r.disc(rid, x1, y1, 8.5);
  }

  // Grand carved trunk sanctuary base + glowing hearth portal
  const trunk = ctx.dyn('flora', 'Mother-Cap Sanctuary Trunk');
  r.poly(trunk, [[cx - 34, 142], [cx + 34, 142], [cx + 46, 208], [cx - 46, 208]]);
  r.line(INK, cx - 26, 152, cx - 32, 204, { only: [trunk] });
  r.line(INK, cx + 26, 152, cx + 32, 204, { only: [trunk] });
  domeQuestIds.push(trunk);

  const portal = ctx.dyn('star', 'Heart-Grove Doorway');
  r.disc(portal, cx, 178, 16);
  r.rect(portal, cx - 16, 178, cx + 16, 208);
  inkArc(r, cx, 178, 9, 9, Math.PI, Math.PI * 2, 0, { only: [portal] });
  domeQuestIds.push(portal);

  // Colossal luminous umbrella cap dome
  const greatCap = ctx.dyn('flora', 'Great Mother-Cap Dome');
  r.shape(greatCap, cx - 76, 74, cx + 76, 152, (px, py) => {
    const dx = (px - cx) / 74;
    const dy = (py - 144) / 68;
    if (dy > 0.08) return false;
    return dx * dx + dy * dy <= 1;
  });
  inkArc(r, cx, 144, 62, 12, Math.PI * 1.05, Math.PI * 1.95, 0, { only: [greatCap] });
  domeQuestIds.push(greatCap);

  // Five distinct luminous stained-glass cap spots (5 individual regions!)
  const spotSpecs: Array<[number, number, number, string]> = [
    [cx - 44, 124, 10, 'Mother-Cap Spot West'],
    [cx - 22, 100, 10.5, 'Mother-Cap Spot NW'],
    [cx, 90, 11.5, 'Mother-Cap Crown Spot'],
    [cx + 22, 100, 10.5, 'Mother-Cap Spot NE'],
    [cx + 44, 124, 10, 'Mother-Cap Spot East'],
  ];
  for (const [sx, sy, sr, slabel] of spotSpecs) {
    const sid = ctx.dyn('star', slabel);
    r.disc(sid, sx, sy, sr);
    inkArc(r, sx, sy, sr * 0.55, sr * 0.55, Math.PI * 1.1, Math.PI * 1.55, 0, { only: [sid] });
    if (sx === cx) domeQuestIds.push(sid);
  }

  // 4) Flanking Glade Wing Landmarks + Foreground Framing Clouds 14/15 (12 regions!)
  drawToadstoolHouse(ctx, 102, 172, 0.84, { label: 'Grove West' });
  drawHollowOak(ctx, 378, 170, 0.86, { label: 'Grove East' });
  drawGlowCapCluster(ctx, 36, 184, 'Far West');
  drawGlowCapCluster(ctx, 444, 184, 'Far East');
  ctx.canon(14, 'Heart-Grove Cloud', 'cloud');
  ctx.canon(15, 'Midnight Spore Cloud', 'cloud');
  drawThemedCloud(ctx, 14, 52, 224, 82, 26, 'fluffy');
  drawThemedCloud(ctx, 15, 428, 224, 82, 26, 'fluffy');

  // 5) Celebration Firefly Sky Crown (7 regions!)
  crescent(ctx, ctx.dyn('star', 'East Grove Moon'), 404, 56, 18, -0.4);
  star(ctx, ctx.dyn('star', 'Midnight Zenith Star'), cx, 22, 11, { points: 5, inner: 0.48 });
  twinkle(ctx, ctx.dyn('star', 'Firefly Twinkle West'), 146, 48, 11);
  twinkle(ctx, ctx.dyn('star', 'Firefly Twinkle East'), 334, 48, 11);
  pearl(ctx, ctx.dyn('star', 'Floating Spore West'), 112, 96, 9);
  pearl(ctx, ctx.dyn('star', 'Floating Spore East'), 368, 96, 9);
  star(ctx, ctx.dyn('star', 'West Glade Star'), 32, 104, 10, { points: 5, inner: 0.48 });

  // 6) 3 Ghosts in open upper sky
  ghostCreature(ctx, 'moth', 190, 30, 'Midnight Moth Ghost');
  ghostCreature(ctx, 'owl', 290, 30, 'Heart-Grove Owl Ghost');
  ghostCreature(ctx, 'fox', 446, 56, 'Star-Moss Fox Ghost');

  // 7) Paths
  ctx.ellipsePath('ring', orbX, orbY, orb.rx, orb.ry, 24, orb.tilt);
  const gallopPath = ctx.wavePath('gallop', 62, 238, 418, 238, 8, 2, 20);
  const sprintPath = ctx.wavePath('sprint', 78, 236, 402, 236, 8, 2, 20);
  const orbitPath = ctx.ellipsePath('orbit', 240, 88, 184, 52, 28);
  ctx.marginPath(256);

  // 8) Full Hero Cast + Glade Companions (14 regions!)
  ctx.actor('lumi', 140, 246, { facing: 1, anim: 'rear', pathIndex: gallopPath });
  ctx.actor('violet', 240, 248, { facing: 1, anim: 'idle' });
  ctx.actor('nova', 340, 246, { facing: -1, anim: 'leap', pathIndex: sprintPath });
  ctx.actor('moonCat', 428, 242, { facing: -1, anim: 'peek' });
  ctx.actor('comet', 402, 102, { facing: -1, anim: 'float', pathIndex: orbitPath });

  ctx.heroQuest('mushroom', 'Mother Cap', domeQuestIds);
  ctx.heroQuest('violet', 'Violet', [1, 2, 3, 4]);
  ctx.heroQuest('lumi', 'Lumi', [5, 6, 7, 8]);
  ctx.heroQuest('nova', 'Nova', [9, 10, 11]);
}

export const U04_SCENES = {
  hub_mushroomGlade,
  u04_c1,
  u04_c2a,
  u04_c2b,
  u04_c3a,
  u04_c3b,
  u04_c4a,
  u04_c4b,
  u04_c5,
} satisfies Partial<Record<SceneId, (ctx: SceneCtx) => void>>;
