/**
 * Bespoke Hi-Bit Pixel Portal Medallions for all 21 Chroma Cosmos Universes.
 * Each universe renders its own unmistakable miniature scene inside a gilded Midnight-Cloisonne
 * circular portal frame, with dedicated `locked` (twilight indigo veil + gleaming gold padlock)
 * and `completed` (radiant burnished-gold outer halo + crowning star-crest) treatments.
 * Pure + deterministic (seeded PRNG only; zero randomness or timers).
 */
import { GOLD_HEX, PAPER_HEX } from '../../contracts/constants';
import { UNIVERSE_BY_ID, type UniverseDef, type UniverseId } from '../../contracts/universes';
import { hashString, mulberry32 } from '../../scenes/context';
import {
  Canvas,
  CREAM,
  INK,
  light,
  lgrad,
  mix,
  type Pt,
  ramp,
  rgrad,
  rgb,
  type RGB,
  shade,
  vgrad,
  WHITE,
} from './canvas';

const GOLD: RGB = rgb(GOLD_HEX); // #eac46f
const GOLD_HI: RGB = rgb('#fff3c4');
const GOLD_LO: RGB = rgb('#a87224');
const PAPER: RGB = rgb(PAPER_HEX); // #faf6ec
const MIDNIGHT: RGB = rgb('#140d33');
const INDIGO: RGB = rgb('#2b1854');
const VEIL: RGB = rgb('#16113b');
const SLATE_HI: RGB = rgb('#8a8eb8');
const SLATE_LO: RGB = rgb('#403d6e');

function portalStars(
  v: Canvas,
  seed: number,
  cx: number,
  cy: number,
  r: number,
  count: number,
  palette: readonly RGB[],
  yMaxFrac = 0.2,
): void {
  const rng = mulberry32(seed);
  for (let i = 0; i < count; i++) {
    const px = Math.floor(rng.range(cx - r, cx + r));
    const py = Math.floor(rng.range(cy - r, cy + r * yMaxFrac));
    if (Math.hypot(px - cx, py - cy) > r * 0.96) continue;
    const col = rng.pick(palette);
    if (rng.chance(0.24)) v.sparkle(px, py, 1, col, WHITE);
    else v.set(px, py, col);
  }
}

/** Paint the iconic miniature scene for each of the 21 universes, centered at (cx, cy) with radius r. */
function paintUniverseScene(v: Canvas, id: UniverseId, cx: number, cy: number, r: number, def: UniverseDef): void {
  const skyTop = rgb(def.sky.top);
  const skyBot = rgb(def.sky.bottom);
  const skyMist = rgb(def.sky.mist);
  const accent = rgb(def.accent);
  const accentSoft = rgb(def.accentSoft);
  const seed = hashString(`uportal:${id}`);

  // Base bespoke universe sky inside portal bounds
  v.shape(
    cx - r - 1,
    cy - r - 1,
    cx + r + 1,
    cy + r + 1,
    (px, py) => (px - cx) * (px - cx) + (py - cy) * (py - cy) <= (r + 1) * (r + 1),
    vgrad(cy - r, cy + r, [skyTop, skyBot, skyMist], true),
  );

  switch (id) {
    case 'chromaCosmos': {
      // U1: Starry cosmos + ringed peach-gold planet + launching paper rocket with sparkling trail
      portalStars(v, seed, cx, cy, r, 24, [WHITE, GOLD_HI, accentSoft], 0.85);
      // Ringed planet upper-left
      const px = cx - r * 0.26;
      const py = cy - r * 0.16;
      const pr = r * 0.34;
      v.glow(px, py, pr * 1.9, accentSoft, 0.35);
      v.obj((l) => {
        l.ering(px, py, pr * 1.75, pr * 0.52, 0.58, GOLD_HI, -0.34);
        l.disc(px, py, pr, rgrad(px - pr * 0.25, py - pr * 0.25, pr * 1.1, [GOLD_HI, rgb('#ffb27a'), rgb('#e85d99')]));
        l.shape(px - pr * 1.8, py - pr, px + pr * 1.8, py + pr, (x, y) => {
          const dx = x - px;
          const dy = y - py;
          const u = (dx * Math.cos(-0.34) + dy * Math.sin(-0.34)) / (pr * 1.75);
          const w = (-dx * Math.sin(-0.34) + dy * Math.cos(-0.34)) / (pr * 0.52);
          return w > 0 && u * u + w * w <= 1 && u * u + w * w >= 0.58 * 0.58;
        }, GOLD);
      }, { rim: 0.2 });
      // Rocket exhaust trail & launching paper rocket lower-right
      v.stroke([
        [cx - r * 0.32, cy + r * 0.72],
        [cx + r * 0.04, cy + r * 0.44],
        [cx + r * 0.3, cy + r * 0.14],
      ], Math.max(1.2, r * 0.08), GOLD_HI, Math.max(0.7, r * 0.04));
      const rx = cx + r * 0.34;
      const ry = cy + r * 0.06;
      v.obj((l) => {
        l.poly([[rx + r * 0.28, ry - r * 0.28], [rx + r * 0.08, ry + r * 0.18], [rx - r * 0.22, ry + r * 0.06]], PAPER);
        l.poly([[rx + r * 0.28, ry - r * 0.28], [rx - r * 0.02, ry + r * 0.04], [rx - r * 0.22, ry + r * 0.06]], rgb('#ff668c'));
        l.disc(rx + r * 0.04, ry - r * 0.04, Math.max(1.2, r * 0.09), rgb('#4ae0cb'));
      }, { rim: 0.18 });
      break;
    }

    case 'coralKingdom': {
      // U2: Glowing bubblegum coral arch + radiant jellyfish + pearl bubbles
      // Soft sea-sunbeam rays
      v.glow(cx, cy - r * 0.6, r * 0.9, accentSoft, 0.28);
      // Branching coral arch framing bottom & sides
      v.obj((l) => {
        l.ellipse(cx, cy + r * 0.82, r * 0.96, r * 0.34, rgb('#184c78'));
        l.arc(cx, cy + r * 0.62, r * 0.58, r * 0.88, Math.PI * 1.05, Math.PI * 1.95, vgrad(cy - r * 0.2, cy + r * 0.7, [rgb('#ff8cc0'), accent, rgb('#c7387a')]));
        // Coral branch tips
        l.capsule(cx - r * 0.62, cy + r * 0.34, cx - r * 0.74, cy - r * 0.08, r * 0.1, rgb('#ff9ec8'), r * 0.06);
        l.capsule(cx + r * 0.62, cy + r * 0.34, cx + r * 0.74, cy - r * 0.06, r * 0.1, rgb('#ff7da8'), r * 0.06);
      }, { rim: 0.2 });
      // Glowing floating jellyfish center
      const jx = cx;
      const jy = cy - r * 0.12;
      v.glow(jx, jy, r * 0.55, accent, 0.4);
      v.obj((l) => {
        for (const ox of [-0.2, -0.06, 0.08, 0.22]) {
          l.stroke([
            [jx + ox * r, jy + r * 0.08],
            [jx + (ox - 0.06) * r, jy + r * 0.36],
            [jx + (ox + 0.05) * r, jy + r * 0.6],
          ], Math.max(0.9, r * 0.045), accentSoft);
        }
        l.arc(jx, jy + r * 0.1, 0, r * 0.38, Math.PI, Math.PI * 2, rgrad(jx - r * 0.1, jy - r * 0.1, r * 0.45, [WHITE, rgb('#ffb8db'), accent]));
        l.ellipse(jx, jy + r * 0.1, r * 0.36, r * 0.09, accentSoft);
      }, { rim: 0.18 });
      // Iridescent bubbles
      for (const [bx, by, br] of [[-0.5, -0.42, 0.1], [0.54, -0.34, 0.09], [0.42, 0.18, 0.07]] as const) {
        v.ring(cx + bx * r, cy + by * r, Math.max(0.8, br * r * 0.55), Math.max(1.5, br * r), accentSoft);
        v.dot(cx + bx * r - 1, cy + by * r - 1, WHITE);
      }
      break;
    }

    case 'sugarCloudBakery': {
      // U3: Frosted cake castle + fluffy whipped clouds + pastel macarons & sprinkles
      portalStars(v, seed, cx, cy, r, 16, [WHITE, accentSoft, rgb('#ffd4eb')], 0.15);
      // Whipped-cream cloud base
      v.obj((l) => {
        const cl = vgrad(cy + r * 0.25, cy + r, [WHITE, PAPER, rgb('#f2d6ff')]);
        l.disc(cx - r * 0.5, cy + r * 0.68, r * 0.34, cl);
        l.disc(cx + r * 0.5, cy + r * 0.68, r * 0.34, cl);
        l.disc(cx, cy + r * 0.74, r * 0.42, cl);
      }, { rim: 0.14 });
      // Tiered frosted cake castle
      v.obj((l) => {
        // Bottom strawberry tier
        l.rrect(cx - r * 0.46, cy + r * 0.06, cx + r * 0.46, cy + r * 0.56, r * 0.08, vgrad(cy, cy + r * 0.6, [rgb('#ff9ec8'), accent, rgb('#c94386')]));
        // Cream scalloped icing top
        l.rrect(cx - r * 0.48, cy + r * 0.02, cx + r * 0.48, cy + r * 0.18, r * 0.08, WHITE);
        // Upper vanilla-gold turret tier
        l.rrect(cx - r * 0.28, cy - r * 0.38, cx + r * 0.28, cy + r * 0.06, r * 0.07, vgrad(cy - r * 0.38, cy + r * 0.06, [accentSoft, rgb('#ffb87a')]));
        // Frosting roof spire + cherry-star candle
        l.poly([[cx - r * 0.32, cy - r * 0.36], [cx, cy - r * 0.76], [cx + r * 0.32, cy - r * 0.36]], rgb('#ff7ab8'));
        l.star(cx, cy - r * 0.78, r * 0.14, r * 0.06, GOLD_HI);
        // Cute arched frosting door
        l.rrect(cx - r * 0.1, cy + r * 0.26, cx + r * 0.1, cy + r * 0.56, r * 0.08, rgb('#4d226e'));
      }, { rim: 0.18 });
      // Floating pastel macarons left & right
      for (const [mx, my, mc] of [[-0.6, -0.18, rgb('#7ff5d4')], [0.6, -0.22, rgb('#ffd46b')]] as const) {
        v.obj((l) => {
          l.ellipse(cx + mx * r, cy + my * r - r * 0.05, r * 0.16, r * 0.08, mc);
          l.ellipse(cx + mx * r, cy + my * r + r * 0.05, r * 0.16, r * 0.08, mc);
          l.rect(cx + mx * r - r * 0.15, cy + my * r - r * 0.02, cx + mx * r + r * 0.15, cy + my * r + r * 0.03, WHITE);
        }, { rim: 0.12 });
      }
      break;
    }

    case 'mushroomGlade': {
      // U4: Giant luminous ruby-spotted toadstool + mossy floor + glowing fireflies
      // Bioluminescent forest mist glow
      v.glow(cx, cy + r * 0.05, r * 0.7, accent, 0.34);
      // Mossy rolling forest hill
      v.obj((l) => {
        l.ellipse(cx, cy + r * 0.78, r * 0.96, r * 0.38, vgrad(cy + r * 0.4, cy + r, [rgb('#2fa88c'), rgb('#134f59')]));
      }, { rim: 0.12 });
      // Giant polka-dot toadstool mushroom
      v.obj((l) => {
        // Plump cream stem
        l.poly([
          [cx - r * 0.22, cy + r * 0.04],
          [cx + r * 0.22, cy + r * 0.04],
          [cx + r * 0.28, cy + r * 0.64],
          [cx - r * 0.28, cy + r * 0.64],
        ], lgrad(cx - r * 0.26, cy, cx + r * 0.26, cy, [WHITE, PAPER, rgb('#c7c4de')]));
        // Cozy glowing circular cottage window in stem
        l.disc(cx, cy + r * 0.34, r * 0.13, rgrad(cx, cy + r * 0.34, r * 0.14, [WHITE, GOLD_HI, rgb('#ff9e3d')]));
        // Luminous mint gills underside
        l.ellipse(cx, cy + r * 0.05, r * 0.62, r * 0.18, accent);
        // Giant red-coral toadstool dome cap
        l.arc(cx, cy + r * 0.06, 0, r * 0.66, Math.PI, Math.PI * 2, rgrad(cx - r * 0.2, cy - r * 0.35, r * 0.75, [rgb('#ff708c'), rgb('#e83862'), rgb('#9e1b4d')]));
        // Cream polka dots
        l.disc(cx - r * 0.34, cy - r * 0.2, r * 0.11, CREAM);
        l.disc(cx + r * 0.3, cy - r * 0.22, r * 0.1, CREAM);
        l.disc(cx, cy - r * 0.42, r * 0.13, WHITE);
      }, { rim: 0.2 });
      // Glowing fireflies
      for (const [fx, fy] of [[-0.58, -0.34], [0.56, -0.44], [-0.48, 0.24], [0.54, 0.16], [0.16, -0.68]] as const) {
        v.glow(cx + fx * r, cy + fy * r, r * 0.16, GOLD_HI, 0.55);
        v.dot(cx + fx * r, cy + fy * r, WHITE);
      }
      break;
    }

    case 'origamiSkyHarbor': {
      // U5: Origami folded crane soaring over pleated clouds + glowing floating sky lanterns
      portalStars(v, seed, cx, cy, r, 16, [WHITE, accentSoft], 0.2);
      // Folded cloud harbor waves at bottom
      v.obj((l) => {
        l.poly([
          [cx - r, cy + r * 0.56],
          [cx - r * 0.42, cy + r * 0.4],
          [cx, cy + r * 0.58],
          [cx + r * 0.46, cy + r * 0.38],
          [cx + r, cy + r * 0.56],
          [cx + r, cy + r],
          [cx - r, cy + r],
        ], vgrad(cy + r * 0.38, cy + r, [rgb('#8e6cb8'), rgb('#422e73')]));
      }, { rim: 0.14 });
      // Floating glowing paper sky lanterns in background
      for (const [lx, ly, ls] of [[-0.54, -0.38, 0.15], [0.56, -0.44, 0.13], [0.44, 0.16, 0.11]] as const) {
        v.glow(cx + lx * r, cy + ly * r, ls * r * 2.2, accentSoft, 0.42);
        v.obj((l) => {
          l.rrect(cx + (lx - ls * 0.7) * r, cy + (ly - ls) * r, cx + (lx + ls * 0.7) * r, cy + (ly + ls) * r, ls * r * 0.4, vgrad(cy + (ly - ls) * r, cy + (ly + ls) * r, [accent, accentSoft, WHITE]));
        }, { rim: 0.12 });
      }
      // Crisp geometric origami paper crane soaring center
      v.obj((l) => {
        // Rear wing (vermilion-coral facet)
        l.poly([[cx - r * 0.1, cy + r * 0.04], [cx - r * 0.66, cy - r * 0.36], [cx + r * 0.18, cy - r * 0.18]], accent);
        // Main body diamond (ivory)
        l.poly([[cx - r * 0.38, cy + r * 0.22], [cx + r * 0.06, cy - r * 0.06], [cx + r * 0.4, cy + r * 0.2], [cx + r * 0.02, cy + r * 0.36]], PAPER);
        // Sweeping front origami wing (bright white & soft shadow crease)
        l.poly([[cx - r * 0.18, cy + r * 0.14], [cx + r * 0.14, cy - r * 0.58], [cx + r * 0.3, cy + r * 0.06]], WHITE);
        l.poly([[cx - r * 0.18, cy + r * 0.14], [cx + r * 0.14, cy - r * 0.58], [cx + r * 0.02, cy + r * 0.06]], rgb('#e4def5'));
        // Graceful crane neck & head
        l.poly([[cx - r * 0.34, cy + r * 0.22], [cx - r * 0.62, cy - r * 0.14], [cx - r * 0.48, cy - r * 0.2], [cx - r * 0.2, cy + r * 0.12]], CREAM);
        l.poly([[cx - r * 0.62, cy - r * 0.14], [cx - r * 0.76, cy - r * 0.08], [cx - r * 0.54, cy - r * 0.2]], GOLD_HI);
        // Pointed tail fold
        l.poly([[cx + r * 0.32, cy + r * 0.18], [cx + r * 0.68, cy - r * 0.1], [cx + r * 0.42, cy + r * 0.26]], accentSoft);
      }, { rim: 0.18 });
      break;
    }

    case 'dinoFernValley': {
      // U6: Friendly pastel brontosaurus + lush ferns + berry sparkle volcano
      // Botanical glass arch ribs behind
      v.arc(cx, cy + r * 0.25, r * 0.74, r * 0.8, Math.PI, Math.PI * 2, mix(skyMist, WHITE, 0.4));
      // Friendly berry-purple volcano puffing star-hearts upper-right
      const vx = cx + r * 0.42;
      const vy = cy + r * 0.36;
      v.obj((l) => {
        l.poly([[vx - r * 0.38, vy + r * 0.2], [vx - r * 0.12, vy - r * 0.44], [vx + r * 0.12, vy - r * 0.44], [vx + r * 0.38, vy + r * 0.2]], vgrad(vy - r * 0.44, vy + r * 0.2, [rgb('#8a4b9e'), rgb('#4c286e')]));
        l.ellipse(vx, vy - r * 0.44, r * 0.12, r * 0.04, rgb('#ff7aa8'));
      }, { rim: 0.14 });
      v.sparkle(vx, vy - r * 0.66, 2, GOLD_HI, WHITE);
      v.dot(vx - r * 0.1, vy - r * 0.56, rgb('#ff8cc0'));
      // Lush valley hill
      v.obj((l) => {
        l.ellipse(cx, cy + r * 0.78, r * 0.96, r * 0.36, vgrad(cy + r * 0.42, cy + r, [rgb('#38c97a'), rgb('#1a6e59')]));
      }, { rim: 0.12 });
      // Friendly emerald-mint brontosaurus left-center
      v.obj((l) => {
        // Tail & plump body
        l.stroke([[cx - r * 0.74, cy + r * 0.56], [cx - r * 0.46, cy + r * 0.42], [cx - r * 0.18, cy + r * 0.34]], r * 0.11, accent, r * 0.2);
        l.ellipse(cx - r * 0.22, cy + r * 0.36, r * 0.3, r * 0.22, rgrad(cx - r * 0.3, cy + r * 0.25, r * 0.4, [rgb('#99ffd0'), accent, rgb('#1e9c68')]));
        // Legs
        l.rrect(cx - r * 0.42, cy + r * 0.48, cx - r * 0.28, cy + r * 0.72, 1, rgb('#27b875'));
        l.rrect(cx - r * 0.12, cy + r * 0.48, cx + r * 0.02, cy + r * 0.72, 1, rgb('#27b875'));
        // Graceful long curved neck + smiling round head
        l.stroke([[cx - r * 0.02, cy + r * 0.26], [cx + r * 0.04, cy - r * 0.08], [cx - r * 0.08, cy - r * 0.36]], r * 0.13, accent, r * 0.11);
        l.ellipse(cx + r * 0.04, cy - r * 0.38, r * 0.2, r * 0.15, rgb('#80f7b8'));
        // Cute eye & amber back spots
        l.dot(cx + r * 0.08, cy - r * 0.41, INK);
        l.dot(cx - r * 0.26, cy + r * 0.28, accentSoft);
        l.dot(cx - r * 0.14, cy + r * 0.32, GOLD_HI);
      }, { rim: 0.18 });
      break;
    }

    case 'auroraIcePalace': {
      // U7: Sweeping mint-violet aurora ribbon + crystalline ice palace spires + snowflake
      // Wavy aurora ribbons in upper sky
      for (let i = 0; i < 3; i++) {
        const col = i === 0 ? accent : i === 1 ? rgb('#6ef5b8') : accentSoft;
        v.stroke([
          [cx - r * 0.85, cy - r * (0.18 + i * 0.14)],
          [cx - r * 0.2, cy - r * (0.48 + i * 0.1)],
          [cx + r * 0.3, cy - r * (0.28 + i * 0.12)],
          [cx + r * 0.85, cy - r * (0.52 + i * 0.08)],
        ], r * 0.08, col, r * 0.05);
      }
      // Snowglobe snowy terrace
      v.obj((l) => {
        l.ellipse(cx, cy + r * 0.76, r * 0.94, r * 0.36, vgrad(cy + r * 0.4, cy + r, [WHITE, rgb('#c2f4ff'), rgb('#68b8e8')]));
      }, { rim: 0.12 });
      // Crystal Ice Palace spires
      v.obj((l) => {
        // Side crystal towers
        for (const sx of [-0.42, 0.42]) {
          l.rect(cx + sx * r - r * 0.12, cy + r * 0.02, cx + sx * r + r * 0.12, cy + r * 0.56, vgrad(cy, cy + r * 0.56, [rgb('#b8f7ff'), rgb('#4aa8e0')]));
          l.poly([[cx + sx * r - r * 0.15, cy + r * 0.04], [cx + sx * r, cy - r * 0.38], [cx + sx * r + r * 0.15, cy + r * 0.04]], WHITE);
        }
        // Central grand crystal keep & spire
        l.rect(cx - r * 0.24, cy - r * 0.12, cx + r * 0.24, cy + r * 0.58, lgrad(cx - r * 0.24, cy, cx + r * 0.24, cy, [WHITE, accent, rgb('#4088d4')]));
        l.poly([[cx - r * 0.22, cy - r * 0.12], [cx, cy - r * 0.68], [cx + r * 0.22, cy - r * 0.12]], (x) => (x < cx ? WHITE : accent));
        // Warm glowing palace doorway
        l.rrect(cx - r * 0.09, cy + r * 0.26, cx + r * 0.09, cy + r * 0.58, r * 0.08, GOLD_HI);
      }, { rim: 0.18 });
      // Crisp snow sparkles
      v.sparkle(cx - r * 0.56, cy - r * 0.44, 2, WHITE, accent);
      v.sparkle(cx + r * 0.52, cy - r * 0.34, 1, WHITE);
      break;
    }

    case 'clockworkToyshop': {
      // U8: Interlocking golden gears + striped brass cloud-airship with propeller
      portalStars(v, seed, cx, cy, r, 14, [GOLD_HI, accentSoft, WHITE], 0.3);
      // Giant background burnished-gold clockwork gears
      const drawGear = (gx: number, gy: number, gr: number, col: RGB) => {
        v.obj((l) => {
          for (let i = 0; i < 8; i++) {
            const a = (i * Math.PI) / 4;
            l.capsule(gx, gy, gx + Math.cos(a) * gr * 1.15, gy + Math.sin(a) * gr * 1.15, Math.max(1.2, gr * 0.22), col);
          }
          l.ring(gx, gy, gr * 0.42, gr * 0.88, col);
        }, { rim: 0.16 });
      };
      drawGear(cx - r * 0.44, cy + r * 0.36, r * 0.32, GOLD);
      drawGear(cx + r * 0.46, cy - r * 0.36, r * 0.26, accentSoft);
      // Striped Brass Cloud-Airship centered
      v.obj((l) => {
        // Suspended gondola & rig lines
        l.line(cx - r * 0.2, cy + r * 0.14, cx - r * 0.16, cy + r * 0.42, GOLD);
        l.line(cx + r * 0.16, cy + r * 0.14, cx + r * 0.12, cy + r * 0.42, GOLD);
        l.rrect(cx - r * 0.24, cy + r * 0.38, cx + r * 0.2, cy + r * 0.56, r * 0.06, GOLD_LO);
        l.dot(cx - r * 0.08, cy + r * 0.46, GOLD_HI);
        l.dot(cx + r * 0.06, cy + r * 0.46, GOLD_HI);
        // Tail fins right
        l.poly([[cx + r * 0.4, cy - r * 0.08], [cx + r * 0.72, cy - r * 0.32], [cx + r * 0.62, cy - r * 0.02]], rgb('#ff6b8b'));
        l.poly([[cx + r * 0.4, cy + r * 0.06], [cx + r * 0.72, cy + r * 0.26], [cx + r * 0.62, cy + r * 0.02]], rgb('#ff6b8b'));
        // Plump striped dirigible balloon hull
        l.ellipse(cx - r * 0.02, cy - r * 0.06, r * 0.58, r * 0.36, (x, y) => {
          const dy = (y - (cy - r * 0.06)) / (r * 0.36);
          const stripe = Math.abs(Math.sin(dy * 5)) > 0.55;
          return stripe ? ramp([GOLD_HI, accent, GOLD_LO], (dy + 1) * 0.5) : ramp([rgb('#ff94b2'), rgb('#d64575'), rgb('#6e2560')], (dy + 1) * 0.5);
        });
        // Brass nose cone
        l.disc(cx - r * 0.56, cy - r * 0.06, r * 0.1, GOLD_HI);
      }, { rim: 0.2 });
      v.sparkle(cx - r * 0.66, cy - r * 0.42, 2, GOLD_HI, WHITE);
      break;
    }

    case 'sakuraKoiGarden': {
      // U9: Full silvery moon + crimson Torii gate + leaping sakura koi + drifting cherry petals
      // Full moon upper-right
      const mx = cx + r * 0.38;
      const my = cy - r * 0.4;
      v.glow(mx, my, r * 0.48, CREAM, 0.4);
      v.disc(mx, my, r * 0.24, rgrad(mx - 1, my - 1, r * 0.26, [WHITE, CREAM, rgb('#ffd9eb')]));
      // Calm mirrored pond bottom half
      v.rect(cx - r, cy + r * 0.24, cx + r, cy + r, vgrad(cy + r * 0.24, cy + r, [rgb('#2b3b78'), rgb('#181d52')]));
      // Iconic crimson Japanese Torii Gate
      v.obj((l) => {
        const red = rgb('#ff4d6d');
        const redLo = rgb('#b8244a');
        l.rect(cx - r * 0.44, cy - r * 0.32, cx - r * 0.32, cy + r * 0.32, lgrad(cx - r * 0.44, cy, cx - r * 0.32, cy, [red, redLo]));
        l.rect(cx + r * 0.32, cy - r * 0.32, cx + r * 0.44, cy + r * 0.32, lgrad(cx + r * 0.32, cy, cx + r * 0.44, cy, [red, redLo]));
        // Lower tie beam (nuki)
        l.rect(cx - r * 0.58, cy - r * 0.18, cx + r * 0.58, cy - r * 0.06, red);
        // Sweeping curved top lintel (kasagi)
        l.poly([
          [cx - r * 0.72, cy - r * 0.44],
          [cx - r * 0.5, cy - r * 0.34],
          [cx + r * 0.5, cy - r * 0.34],
          [cx + r * 0.72, cy - r * 0.44],
          [cx + r * 0.66, cy - r * 0.28],
          [cx - r * 0.66, cy - r * 0.28],
        ], red);
        l.rect(cx - r * 0.08, cy - r * 0.32, cx + r * 0.08, cy - r * 0.14, GOLD);
      }, { rim: 0.16 });
      // Calico sakura koi swimming in curved arc in the pond
      v.obj((l) => {
        l.stroke([
          [cx - r * 0.42, cy + r * 0.54],
          [cx - r * 0.06, cy + r * 0.44],
          [cx + r * 0.32, cy + r * 0.6],
        ], r * 0.15, (x) => (x < cx - r * 0.15 ? rgb('#ff7340') : x < cx + r * 0.12 ? WHITE : rgb('#ff5c78')), r * 0.08);
        l.poly([[cx + r * 0.28, cy + r * 0.58], [cx + r * 0.54, cy + r * 0.44], [cx + r * 0.5, cy + r * 0.74]], rgb('#ffb8d4'));
      }, { rim: 0.14 });
      // Floating pink sakura petals
      for (const [px, py] of [[-0.6, -0.14], [0.58, 0.04], [-0.14, -0.58], [0.14, 0.12]] as const) {
        v.ellipse(cx + px * r, cy + py * r, Math.max(1.5, r * 0.07), Math.max(1, r * 0.045), accent, 0.5);
      }
      break;
    }

    case 'melodyMeadow': {
      // U10: Rainbow-and-ivory piano bridge + giant golden treble clef + musical notes
      portalStars(v, seed, cx, cy, r, 16, [WHITE, accentSoft, rgb('#d6c2ff')], 0.2);
      // Curved piano-key bridge arching across bottom
      v.obj((l) => {
        l.arc(cx, cy + r * 1.15, r * 0.76, r * 1.12, Math.PI * 1.12, Math.PI * 1.88, (x, y) => {
          const a = Math.atan2(y - (cy + r * 1.15), x - cx);
          const idx = Math.floor((a - Math.PI * 1.12) * 14);
          return idx % 2 === 0 ? WHITE : rgb('#e6d9ff');
        });
        // Black accent keys along top half of arc
        l.arc(cx, cy + r * 1.15, r * 0.94, r * 1.11, Math.PI * 1.16, Math.PI * 1.84, (x, y) => {
          const a = Math.atan2(y - (cy + r * 1.15), x - cx);
          const frac = ((a - Math.PI * 1.16) * 14) % 2;
          return frac > 0.6 && frac < 1.3 ? INDIGO : WHITE;
        });
      }, { rim: 0.15 });
      // Radiant golden Treble Clef centerpiece
      v.glow(cx, cy - r * 0.14, r * 0.58, accentSoft, 0.36);
      v.obj((l) => {
        l.stroke([
          [cx - r * 0.08, cy + r * 0.32],
          [cx + r * 0.06, cy + r * 0.26],
          [cx, cy - r * 0.64],
          [cx + r * 0.24, cy - r * 0.46],
          [cx - r * 0.24, cy - r * 0.06],
          [cx + r * 0.06, cy + r * 0.14],
          [cx + r * 0.24, cy - r * 0.04],
          [cx - r * 0.04, cy - r * 0.16],
        ], Math.max(1.5, r * 0.09), lgrad(cx - r * 0.2, cy - r * 0.6, cx + r * 0.2, cy + r * 0.3, [WHITE, GOLD_HI, accentSoft, GOLD_LO]));
      }, { rim: 0.2 });
      // Floating glowing rainbow notes
      for (const [nx, ny, nc] of [[-0.54, -0.26, rgb('#ff7ec8')], [0.54, -0.32, rgb('#6ef5ff')]] as const) {
        v.obj((l) => {
          l.disc(cx + nx * r, cy + ny * r, r * 0.11, nc);
          l.line(cx + (nx + 0.09) * r, cy + ny * r, cx + (nx + 0.09) * r, cy + (ny - 0.3) * r, nc);
          l.line(cx + (nx + 0.09) * r, cy + (ny - 0.3) * r, cx + (nx + 0.22) * r, cy + (ny - 0.22) * r, nc);
        }, { rim: 0.12 });
      }
      break;
    }

    case 'crystalGeodeCaverns': {
      // U11: Glowing amethyst & mint-quartz geode cavern + opal mirror lake
      v.glow(cx, cy - r * 0.04, r * 0.72, accent, 0.42);
      // Opal mirror subterranean water
      v.rect(cx - r, cy + r * 0.44, cx + r, cy + r, vgrad(cy + r * 0.44, cy + r, [rgb('#422e8c'), rgb('#1d144a')]));
      // Faceted amethyst & cyan crystal spires rising from bottom & hanging from ceiling
      v.obj((l) => {
        // Hanging ceiling stalactites
        l.poly([[cx - r * 0.46, cy - r], [cx - r * 0.3, cy - r * 0.34], [cx - r * 0.16, cy - r]], rgb('#b870ff'));
        l.poly([[cx + r * 0.14, cy - r], [cx + r * 0.34, cy - r * 0.38], [cx + r * 0.52, cy - r]], accentSoft);
        // Giant rising crystal cluster center-left & right
        l.poly([[cx - r * 0.64, cy + r * 0.56], [cx - r * 0.52, cy - r * 0.24], [cx - r * 0.3, cy - r * 0.46], [cx - r * 0.14, cy + r * 0.56]], (x) => (x < cx - r * 0.38 ? rgb('#f0ccff') : accent));
        l.poly([[cx - r * 0.2, cy + r * 0.56], [cx - r * 0.14, cy - r * 0.18], [cx + r * 0.04, cy - r * 0.58], [cx + r * 0.22, cy - r * 0.16], [cx + r * 0.24, cy + r * 0.56]], (x) => (x < cx + r * 0.04 ? WHITE : rgb('#b052ff')));
        l.poly([[cx + r * 0.18, cy + r * 0.56], [cx + r * 0.44, cy - r * 0.3], [cx + r * 0.66, cy - r * 0.06], [cx + r * 0.54, cy + r * 0.56]], (x) => (x < cx + r * 0.45 ? rgb('#c2fff2') : accentSoft));
      }, { rim: 0.2 });
      v.sparkle(cx + r * 0.04, cy - r * 0.54, 2, WHITE, accentSoft);
      v.sparkle(cx - r * 0.3, cy - r * 0.42, 1, WHITE);
      break;
    }

    case 'desertStarOasis': {
      // U12: Starlit desert night + crescent moon + golden pyramid + turquoise oasis & palm
      portalStars(v, seed, cx, cy, r, 18, [WHITE, GOLD_HI, accentSoft], 0.1);
      // Glowing crescent moon upper-left
      const mx = cx - r * 0.44;
      const my = cy - r * 0.42;
      const mr = r * 0.22;
      v.glow(mx, my, mr * 2, GOLD_HI, 0.35);
      v.shape(mx - mr, my - mr, mx + mr, my + mr, (px, py) =>
        Math.hypot(px - mx, py - my) <= mr && Math.hypot(px - (mx + mr * 0.42), py - (my - mr * 0.18)) >= mr * 0.82,
        GOLD_HI);
      // Sweeping golden-violet desert dunes
      v.ellipse(cx - r * 0.34, cy + r * 0.62, r * 0.86, r * 0.42, rgb('#804c8a'));
      v.ellipse(cx + r * 0.4, cy + r * 0.72, r * 0.86, r * 0.38, rgb('#5a2f70'));
      // Iconic sunlit Golden Pyramid
      v.obj((l) => {
        l.poly([[cx - r * 0.52, cy + r * 0.38], [cx + r * 0.08, cy - r * 0.48], [cx + r * 0.08, cy + r * 0.38]], vgrad(cy - r * 0.48, cy + r * 0.38, [GOLD_HI, accent, rgb('#d97b29')]));
        l.poly([[cx + r * 0.08, cy - r * 0.48], [cx + r * 0.62, cy + r * 0.38], [cx + r * 0.08, cy + r * 0.38]], vgrad(cy - r * 0.48, cy + r * 0.38, [rgb('#c97a38'), rgb('#6e366b')]));
      }, { rim: 0.18 });
      // Crescent turquoise oasis pool & emerald palm
      v.obj((l) => {
        l.ellipse(cx - r * 0.08, cy + r * 0.64, r * 0.46, r * 0.16, rgrad(cx - r * 0.1, cy + r * 0.6, r * 0.45, [rgb('#a8fff7'), accentSoft, rgb('#2078b8')]));
        // Mini oasis palm on right shore
        l.stroke([[cx + r * 0.46, cy + r * 0.58], [cx + r * 0.52, cy + r * 0.24], [cx + r * 0.44, cy + r * 0.04]], Math.max(1.2, r * 0.06), rgb('#b06e42'));
        l.ellipse(cx + r * 0.28, cy + r * 0.04, r * 0.18, r * 0.06, rgb('#3be099'), -0.3);
        l.ellipse(cx + r * 0.58, cy + r * 0.04, r * 0.18, r * 0.06, rgb('#3be099'), 0.3);
      }, { rim: 0.14 });
      v.sparkle(cx + r * 0.08, cy - r * 0.52, 2, WHITE, GOLD_HI);
      break;
    }

    case 'storybookLibrary': {
      // U13: Stacked floating gilded books + open glowing storybook & golden feather quill
      portalStars(v, seed, cx, cy, r, 18, [WHITE, GOLD_HI, accentSoft], 0.5);
      // Floating mini books in upper sky
      for (const [bx, by, bc] of [[-0.5, -0.42, rgb('#5c7cff')], [0.52, -0.38, accentSoft]] as const) {
        v.obj((l) => {
          l.poly([[cx + (bx - 0.18) * r, cy + by * r], [cx + bx * r, cy + (by + 0.08) * r], [cx + (bx + 0.18) * r, cy + by * r], [cx + bx * r, cy + (by - 0.08) * r]], bc);
        }, { rim: 0.12 });
      }
      // Stacked hardcovers base
      v.obj((l) => {
        l.rrect(cx - r * 0.58, cy + r * 0.36, cx + r * 0.58, cy + r * 0.64, r * 0.06, rgb('#6e36a8'));
        l.rect(cx - r * 0.52, cy + r * 0.42, cx + r * 0.52, cy + r * 0.56, PAPER);
        l.rrect(cx - r * 0.48, cy + r * 0.12, cx + r * 0.48, cy + r * 0.36, r * 0.06, rgb('#d63e78'));
        l.rect(cx - r * 0.42, cy + r * 0.18, cx + r * 0.42, cy + r * 0.3, GOLD_HI);
        // Open glowing storybook atop stack
        l.poly([[cx - r * 0.52, cy + r * 0.04], [cx, cy + r * 0.14], [cx, cy - r * 0.24], [cx - r * 0.46, cy - r * 0.3]], PAPER);
        l.poly([[cx + r * 0.52, cy + r * 0.04], [cx, cy + r * 0.14], [cx, cy - r * 0.24], [cx + r * 0.46, cy - r * 0.3]], CREAM);
      }, { rim: 0.18 });
      // Golden feather quill writing stars above open book
      v.glow(cx + r * 0.1, cy - r * 0.26, r * 0.42, GOLD_HI, 0.38);
      v.obj((l) => {
        l.capsule(cx - r * 0.02, cy - r * 0.06, cx + r * 0.42, cy - r * 0.66, Math.max(1.2, r * 0.05), GOLD_HI);
        l.ellipse(cx + r * 0.28, cy - r * 0.48, r * 0.22, r * 0.1, lgrad(cx, cy - r * 0.6, cx + r * 0.5, cy - r * 0.3, [WHITE, GOLD_HI, accentSoft]), -0.8);
      }, { rim: 0.16 });
      v.sparkle(cx - r * 0.12, cy - r * 0.42, 2, WHITE, GOLD_HI);
      break;
    }

    case 'cloudCircusCarnival': {
      // U14: Glowing mini Ferris wheel behind + striped red-and-cream circus big-top + confetti
      portalStars(v, seed, cx, cy, r, 16, [GOLD_HI, rgb('#70f5ff'), accent, WHITE], 0.4);
      // Glowing Ferris wheel silhouette upper-right
      const fx = cx + r * 0.38;
      const fy = cy - r * 0.22;
      const fr = r * 0.38;
      v.ring(fx, fy, fr * 0.84, fr, accentSoft);
      for (let i = 0; i < 6; i++) {
        const a = (i * Math.PI) / 3;
        v.line(fx, fy, fx + Math.cos(a) * fr, fy + Math.sin(a) * fr, GOLD_LO);
        v.disc(fx + Math.cos(a) * fr, fy + Math.sin(a) * fr, Math.max(1.2, r * 0.06), i % 2 === 0 ? accent : rgb('#6ef5ff'));
      }
      // Cotton-candy cloud floor
      v.ellipse(cx, cy + r * 0.78, r * 0.94, r * 0.34, rgb('#ffcae0'));
      // Iconic vertical-striped Big-Top Circus Pavilion Tent
      v.obj((l) => {
        // Tent walls
        l.rect(cx - r * 0.56, cy + r * 0.12, cx + r * 0.44, cy + r * 0.62, (x) => (Math.floor((x - (cx - r * 0.56)) / Math.max(2, r * 0.18)) % 2 === 0 ? accent : PAPER));
        // Peaked striped big-top canopy
        l.poly([
          [cx - r * 0.64, cy + r * 0.14],
          [cx - r * 0.06, cy - r * 0.56],
          [cx + r * 0.52, cy + r * 0.14],
        ], (x) => (Math.floor((x - (cx - r * 0.64)) / Math.max(2, r * 0.19)) % 2 === 0 ? accent : WHITE));
        // Golden eave valance + glowing entryway
        l.rect(cx - r * 0.62, cy + r * 0.1, cx + r * 0.5, cy + r * 0.19, GOLD_HI);
        l.poly([[cx - r * 0.22, cy + r * 0.62], [cx - r * 0.06, cy + r * 0.26], [cx + r * 0.1, cy + r * 0.62]], rgb('#ffe480'));
        // Fluttering pennant flag at peak
        l.line(cx - r * 0.06, cy - r * 0.56, cx - r * 0.06, cy - r * 0.78, GOLD);
        l.poly([[cx - r * 0.06, cy - r * 0.78], [cx + r * 0.2, cy - r * 0.7], [cx - r * 0.06, cy - r * 0.62]], rgb('#56e0ff'));
      }, { rim: 0.18 });
      break;
    }

    case 'miniatureDeskWorld': {
      // U15: Giant rainbow colored-pencil castle towers behind + ornate porcelain teacup foreground
      portalStars(v, seed, cx, cy, r, 14, [WHITE, accent, accentSoft], 0.1);
      // Giant sharpened colored-pencil castle turrets in background
      v.obj((l) => {
        const pencils: Array<[number, number, RGB]> = [
          [-0.48, -0.52, rgb('#ff6b9d')],
          [-0.18, -0.66, GOLD],
          [0.46, -0.48, rgb('#5ee8c5')],
        ];
        for (const [px, py, pc] of pencils) {
          const x0 = cx + (px - 0.12) * r;
          const x1 = cx + (px + 0.12) * r;
          const topY = cy + py * r;
          l.rect(x0, topY + r * 0.22, x1, cy + r * 0.65, pc);
          l.poly([[x0, topY + r * 0.22], [cx + px * r, topY], [x1, topY + r * 0.22]], CREAM);
          l.poly([[cx + (px - 0.04) * r, topY + r * 0.08], [cx + px * r, topY], [cx + (px + 0.04) * r, topY + r * 0.08]], pc);
        }
      }, { rim: 0.15 });
      // Giant ornate porcelain sky-blue teacup in foreground
      v.obj((l) => {
        // Saucer
        l.ellipse(cx, cy + r * 0.62, r * 0.56, r * 0.14, PAPER);
        // Handle right
        l.ring(cx + r * 0.42, cy + r * 0.28, r * 0.1, r * 0.2, GOLD_HI);
        // Rounded porcelain teacup bowl
        l.arc(cx, cy + r * 0.1, 0, r * 0.46, 0, Math.PI, rgrad(cx - r * 0.15, cy + r * 0.15, r * 0.52, [WHITE, accent, rgb('#2c66b8')]));
        l.ellipse(cx, cy + r * 0.1, r * 0.46, r * 0.13, rgb('#ffd6e8'));
        l.star(cx, cy + r * 0.34, r * 0.14, r * 0.06, GOLD_HI);
      }, { rim: 0.2 });
      // Curling lavender-white steam wisps
      v.stroke([[cx - r * 0.08, cy - r * 0.04], [cx - r * 0.16, cy - r * 0.24], [cx - r * 0.04, cy - r * 0.4]], Math.max(0.9, r * 0.04), WHITE);
      break;
    }

    case 'autumnHarvestHollow': {
      // U16: Glowing golden harvest full moon + glowing pumpkin carriage + crimson maple leaves
      // Giant harvest moon upper-center
      v.glow(cx, cy - r * 0.24, r * 0.62, accentSoft, 0.45);
      v.disc(cx, cy - r * 0.24, r * 0.38, rgrad(cx - r * 0.1, cy - r * 0.32, r * 0.44, [WHITE, GOLD_HI, accentSoft]));
      // Cozy twilight valley hill
      v.ellipse(cx, cy + r * 0.76, r * 0.96, r * 0.38, rgb('#4d2159'));
      // Glowing Pumpkin Carriage centerpiece
      v.obj((l) => {
        // Curly emerald vine stem
        l.stroke([[cx, cy - r * 0.16], [cx + r * 0.06, cy - r * 0.34], [cx + r * 0.2, cy - r * 0.32]], Math.max(1.2, r * 0.055), rgb('#3be099'));
        // Plump ribbed tangerine pumpkin body
        l.ellipse(cx - r * 0.2, cy + r * 0.2, r * 0.3, r * 0.34, rgb('#e06424'));
        l.ellipse(cx + r * 0.2, cy + r * 0.2, r * 0.3, r * 0.34, rgb('#e06424'));
        l.ellipse(cx, cy + r * 0.2, r * 0.28, r * 0.36, rgrad(cx - r * 0.08, cy + r * 0.06, r * 0.4, [GOLD_HI, accent, rgb('#d9521e')]));
        // Glowing golden coach window
        l.rrect(cx - r * 0.12, cy + r * 0.08, cx + r * 0.12, cy + r * 0.32, r * 0.07, WHITE);
        // Golden carriage wheels
        l.ring(cx - r * 0.34, cy + r * 0.56, r * 0.09, r * 0.18, GOLD_HI);
        l.ring(cx + r * 0.34, cy + r * 0.56, r * 0.09, r * 0.18, GOLD_HI);
      }, { rim: 0.18 });
      // Swirling maple leaves
      for (const [lx, ly, lc] of [[-0.58, -0.34, rgb('#ff4769')], [0.56, -0.26, GOLD_HI], [-0.52, 0.16, accent]] as const) {
        v.star(cx + lx * r, cy + ly * r, r * 0.12, r * 0.05, lc, 5);
      }
      break;
    }

    case 'sunflowerGlasshouse': {
      // U17: Stained-glass botanical dome ribs + giant smiling golden sunflower + butterflies
      // Stained-glass dome ribs arching over sunny sky
      v.arc(cx, cy + r * 0.5, r * 0.84, r * 0.9, Math.PI, Math.PI * 2, GOLD_HI);
      v.line(cx, cy - r * 0.4, cx, cy + r * 0.6, mix(GOLD_HI, WHITE, 0.4));
      v.arc(cx, cy + r * 0.5, r * 0.48, r * 0.53, Math.PI, Math.PI * 2, mix(accentSoft, WHITE, 0.4));
      // Emerald stem & leaves + Giant Radiant Sunflower
      v.obj((l) => {
        l.capsule(cx, cy + r * 0.12, cx, cy + r * 0.84, r * 0.08, rgb('#2ec47a'));
        l.ellipse(cx - r * 0.26, cy + r * 0.56, r * 0.22, r * 0.11, accentSoft, -0.4);
        l.ellipse(cx + r * 0.26, cy + r * 0.56, r * 0.22, r * 0.11, accentSoft, 0.4);
        // Golden sunflower petals ring
        const sy = cy - r * 0.06;
        for (let i = 0; i < 12; i++) {
          const a = (i * Math.PI) / 6;
          l.ellipse(cx + Math.cos(a) * r * 0.36, sy + Math.sin(a) * r * 0.36, r * 0.2, r * 0.09, i % 2 === 0 ? accent : rgb('#ffa826'), a);
        }
        // Rich plum-violet seed disc with gold sparkle dots
        l.disc(cx, sy, r * 0.26, rgrad(cx - r * 0.08, sy - r * 0.08, r * 0.3, [rgb('#7d3e99'), rgb('#421c5e')]));
        l.dot(cx - r * 0.08, sy - r * 0.06, GOLD_HI);
        l.dot(cx + r * 0.08, sy - r * 0.04, GOLD_HI);
        l.dot(cx, sy + r * 0.08, GOLD_HI);
      }, { rim: 0.18 });
      // Prism butterflies upper-left & upper-right
      for (const [bx, by, bc] of [[-0.52, -0.44, rgb('#ff7ec8')], [0.54, -0.38, rgb('#6ef5ff')]] as const) {
        v.ellipse(cx + (bx - 0.07) * r, cy + by * r, r * 0.09, r * 0.07, bc, -0.4);
        v.ellipse(cx + (bx + 0.07) * r, cy + by * r, r * 0.09, r * 0.07, bc, 0.4);
      }
      break;
    }

    case 'neonPixelArcade': {
      // U18: Synthwave neon laser grid + retro glowing arcade cabinet with rainbow pixel heart
      // Perspective synthwave neon grid floor
      const hy = cy + r * 0.32;
      v.rect(cx - r, hy, cx + r, cy + r, rgb('#150838'));
      for (let i = 0; i < 4; i++) {
        const gy = hy + i * r * 0.18;
        v.line(cx - r, gy, cx + r, gy, accent);
      }
      for (let i = -3; i <= 3; i++) {
        v.line(cx + i * r * 0.16, hy, cx + i * r * 0.42, cy + r, rgb('#7b2cff'));
      }
      // Glowing retro arcade cabinet centered
      v.glow(cx, cy - r * 0.06, r * 0.65, accent, 0.35);
      v.obj((l) => {
        // Cabinet silhouette
        l.rrect(cx - r * 0.42, cy - r * 0.62, cx + r * 0.42, cy + r * 0.64, r * 0.08, vgrad(cy - r * 0.6, cy + r * 0.64, [rgb('#4c1d8f'), rgb('#240d54')]));
        // Glowing magenta-gold marquee header
        l.rrect(cx - r * 0.36, cy - r * 0.56, cx + r * 0.36, cy - r * 0.38, r * 0.04, lgrad(cx - r * 0.36, cy, cx + r * 0.36, cy, [accent, GOLD_HI, accentSoft]));
        // Bright cyan CRT screen
        l.rrect(cx - r * 0.32, cy - r * 0.3, cx + r * 0.32, cy + r * 0.16, r * 0.05, rgb('#11224d'));
        l.heart(cx, cy - r * 0.05, r * 0.18, lgrad(cx - r * 0.18, cy - r * 0.2, cx + r * 0.18, cy + r * 0.1, [accent, GOLD_HI, accentSoft]));
        // Control deck + joystick & buttons
        l.rrect(cx - r * 0.46, cy + r * 0.2, cx + r * 0.46, cy + r * 0.34, r * 0.04, accent);
        l.disc(cx - r * 0.22, cy + r * 0.22, Math.max(1.4, r * 0.08), GOLD_HI);
        l.dot(cx + r * 0.12, cy + r * 0.27, accentSoft);
        l.dot(cx + r * 0.26, cy + r * 0.27, WHITE);
      }, { rim: 0.18 });
      v.sparkle(cx - r * 0.58, cy - r * 0.46, 2, accentSoft, WHITE);
      v.sparkle(cx + r * 0.56, cy - r * 0.4, 2, accent, WHITE);
      break;
    }

    case 'jadeDragonPeaks': {
      // U19: Misty floating mountain peaks + jade cloud-pagoda + friendly sleeping jade dragon
      // Floating misty cliffs
      v.obj((l) => {
        l.poly([[cx - r * 0.8, cy + r * 0.45], [cx - r * 0.48, cy - r * 0.18], [cx - r * 0.16, cy + r * 0.45]], vgrad(cy - r * 0.18, cy + r * 0.45, [rgb('#2c8a80'), rgb('#133d54')]));
        l.poly([[cx + r * 0.14, cy + r * 0.52], [cx + r * 0.5, cy - r * 0.28], [cx + r * 0.84, cy + r * 0.52]], vgrad(cy - r * 0.28, cy + r * 0.52, [rgb('#36a694'), rgb('#16475e')]));
      }, { rim: 0.14 });
      // Tiered Jade Sky-Pagoda perched upper-right
      v.obj((l) => {
        const px = cx + r * 0.46;
        const py = cy - r * 0.26;
        l.rect(px - r * 0.14, py - r * 0.14, px + r * 0.14, py + r * 0.08, CREAM);
        l.poly([[px - r * 0.26, py - r * 0.1], [px, py - r * 0.28], [px + r * 0.26, py - r * 0.1]], accent);
        l.poly([[px - r * 0.2, py - r * 0.24], [px, py - r * 0.42], [px + r * 0.2, py - r * 0.24]], GOLD_HI);
      }, { rim: 0.14 });
      // Friendly curled Jade Cloud-Dragon foreground + glowing sky-pearl
      v.glow(cx - r * 0.18, cy - r * 0.34, r * 0.32, accentSoft, 0.5);
      v.obj((l) => {
        // Sinuous jade body curving across clouds
        l.stroke([
          [cx + r * 0.58, cy + r * 0.52],
          [cx + r * 0.18, cy + r * 0.34],
          [cx - r * 0.2, cy + r * 0.52],
          [cx - r * 0.44, cy + r * 0.18],
          [cx - r * 0.16, cy - r * 0.06],
        ], r * 0.14, vgrad(cy - r * 0.1, cy + r * 0.56, [rgb('#7bffcc'), accent, rgb('#18826b')]), r * 0.16);
        // Cute dragon head + golden horns
        l.ellipse(cx - r * 0.1, cy - r * 0.08, r * 0.22, r * 0.16, rgb('#5ef5be'));
        l.line(cx - r * 0.24, cy - r * 0.18, cx - r * 0.36, cy - r * 0.34, GOLD_HI);
        l.line(cx - r * 0.1, cy - r * 0.2, cx - r * 0.18, cy - r * 0.36, GOLD_HI);
        l.dot(cx - r * 0.02, cy - r * 0.1, INK);
        // Floating golden dragon pearl
        l.disc(cx - r * 0.18, cy - r * 0.44, r * 0.12, rgrad(cx - r * 0.2, cy - r * 0.46, r * 0.14, [WHITE, GOLD_HI, accentSoft]));
      }, { rim: 0.18 });
      break;
    }

    case 'nileStarTemples': {
      // U20: Star-Nile river reflection + smiling golden Sphinx + blooming golden lotus
      portalStars(v, seed, cx, cy, r, 18, [WHITE, GOLD_HI, accentSoft], 0.15);
      // Starry lapis Nile river bottom third
      v.rect(cx - r, cy + r * 0.34, cx + r, cy + r, vgrad(cy + r * 0.34, cy + r, [rgb('#1f57a8'), rgb('#112769')]));
      // Smiling Golden Sphinx silhouette upper-center
      v.obj((l) => {
        // Nemes royal striped headdress
        l.poly([
          [cx - r * 0.44, cy + r * 0.26],
          [cx - r * 0.34, cy - r * 0.44],
          [cx + r * 0.34, cy - r * 0.44],
          [cx + r * 0.44, cy + r * 0.26],
        ], (_x, y) => (Math.floor((y - (cy - r * 0.44)) / Math.max(2, r * 0.12)) % 2 === 0 ? accent : rgb('#2447a6')));
        // Golden face
        l.ellipse(cx, cy - r * 0.14, r * 0.22, r * 0.24, rgrad(cx - r * 0.06, cy - r * 0.2, r * 0.28, [GOLD_HI, accent, GOLD_LO]));
        // Forepaws resting along river bank
        l.rrect(cx - r * 0.48, cy + r * 0.14, cx - r * 0.12, cy + r * 0.34, r * 0.06, accent);
        l.rrect(cx + r * 0.12, cy + r * 0.14, cx + r * 0.48, cy + r * 0.34, r * 0.06, accent);
        l.dot(cx - r * 0.08, cy - r * 0.18, INK);
        l.dot(cx + r * 0.08, cy - r * 0.18, INK);
        l.disc(cx, cy - r * 0.48, r * 0.1, GOLD_HI);
      }, { rim: 0.18 });
      // Blooming rose-and-gold Star-Nile Lotus floating on foreground river
      v.obj((l) => {
        const ly = cy + r * 0.56;
        l.ellipse(cx - r * 0.28, ly + r * 0.04, r * 0.24, r * 0.1, rgb('#ff7ec0'), -0.25);
        l.ellipse(cx + r * 0.28, ly + r * 0.04, r * 0.24, r * 0.1, rgb('#ff7ec0'), 0.25);
        l.ellipse(cx - r * 0.14, ly - r * 0.04, r * 0.22, r * 0.1, GOLD_HI, -0.6);
        l.ellipse(cx + r * 0.14, ly - r * 0.04, r * 0.22, r * 0.1, GOLD_HI, 0.6);
        l.ellipse(cx, ly - r * 0.08, r * 0.12, r * 0.2, WHITE);
      }, { rim: 0.16 });
      break;
    }

    case 'prismNexusMultiverse': {
      // U21: Prismatic kaleidoscope starburst + majestic Prism Crown + 20 orbiting mini-portals!
      // Rainbow sunburst kaleidoscope background
      v.shape(
        cx - r,
        cy - r,
        cx + r,
        cy + r,
        (px, py) => (px - cx) * (px - cx) + (py - cy) * (py - cy) <= r * r,
        (x, y) => {
          const dx = x - cx;
          const dy = y - cy;
          const a = Math.atan2(dy, dx);
          const dist = Math.hypot(dx, dy) / r;
          const ray = Math.sin(a * 10) * 0.5 + 0.5;
          const base = ramp([rgb('#ff6ec7'), rgb('#8f5cff'), rgb('#322078'), rgb('#140c3d')], Math.min(1, dist));
          return mix(base, rgb('#7ff7ff'), ray * (1 - dist * 0.65) * 0.42);
        },
      );
      // 20 tiny jewel-colored orbiting mini-portals in a grand multiverse ring!
      const orbitCols: RGB[] = [
        GOLD_HI, rgb('#ff6fa9'), rgb('#ff85c0'), rgb('#4ef2b8'), rgb('#ff7866'),
        rgb('#4ce08a'), rgb('#6ef0ff'), rgb('#f6c344'), rgb('#ff9ec2'), rgb('#9f7bff'),
        rgb('#c76bff'), rgb('#ffb947'), rgb('#eac46f'), rgb('#ff5e8e'), rgb('#56d8ff'),
        rgb('#ff8c42'), rgb('#ffd43b'), rgb('#ff2bd6'), rgb('#3be0a4'), rgb('#f5c542'),
      ];
      for (let i = 0; i < 20; i++) {
        const a = (i / 20) * Math.PI * 2 - Math.PI / 2;
        const ox = cx + Math.cos(a) * r * 0.72;
        const oy = cy + Math.sin(a) * r * 0.72;
        v.disc(ox, oy, Math.max(1.2, r * 0.075), orbitCols[i] as RGB);
        v.dot(ox, oy, WHITE);
      }
      // Radiant Prismatic Kaleidoscope Crown centerpiece
      v.glow(cx, cy, r * 0.52, WHITE, 0.35);
      v.obj((l) => {
        l.poly([
          [cx - r * 0.42, cy + r * 0.3],
          [cx - r * 0.5, cy - r * 0.16],
          [cx - r * 0.2, cy + r * 0.04],
          [cx, cy - r * 0.42],
          [cx + r * 0.2, cy + r * 0.04],
          [cx + r * 0.5, cy - r * 0.16],
          [cx + r * 0.42, cy + r * 0.3],
        ], lgrad(cx - r * 0.45, cy - r * 0.4, cx + r * 0.45, cy + r * 0.3, [WHITE, GOLD_HI, GOLD, GOLD_LO]));
        l.rrect(cx - r * 0.44, cy + r * 0.14, cx + r * 0.44, cy + r * 0.34, 1, GOLD);
        // Prismatic diamond heart-gem in crown
        l.poly([[cx, cy - r * 0.04], [cx + r * 0.14, cy + r * 0.14], [cx, cy + r * 0.32], [cx - r * 0.14, cy + r * 0.14]], accentSoft);
        l.dot(cx - r * 0.26, cy + r * 0.24, accent);
        l.dot(cx + r * 0.26, cy + r * 0.24, rgb('#7bffb8'));
      }, { rim: 0.2 });
      break;
    }
  }
}

export function drawUniversePortal(
  universeId: UniverseId,
  w: number,
  h: number,
  opts?: { locked?: boolean; completed?: boolean },
): Canvas {
  const lw = Math.max(12, Math.floor(w));
  const lh = Math.max(12, Math.floor(h));
  const c = new Canvas(lw, lh);
  const def = UNIVERSE_BY_ID[universeId];
  const locked = Boolean(opts?.locked);
  const completed = Boolean(opts?.completed) && !locked;

  const accent = rgb(def.accent);
  const accentSoft = rgb(def.accentSoft);
  const cx = lw * 0.5;
  const cy = lh * (completed ? 0.54 : 0.5);
  const S = Math.min(lw, lh);
  const outerR = S * (completed ? 0.42 : 0.44);
  const frameT = Math.max(2.6, S * 0.088);
  const innerR = Math.max(5, outerR - frameT);

  // 1. Ambient outer aura halo (radiant burnished-gold sunburst when completed!)
  if (completed) {
    c.glow(cx, cy, outerR * 1.24, GOLD_HI, 0.52);
    for (let i = 0; i < 8; i++) {
      const a = (i * Math.PI) / 4;
      c.line(
        cx + Math.cos(a) * (outerR + 0.5),
        cy + Math.sin(a) * (outerR + 0.5),
        cx + Math.cos(a) * (outerR + Math.max(2, S * 0.075)),
        cy + Math.sin(a) * (outerR + Math.max(2, S * 0.075)),
        i % 2 === 0 ? GOLD_HI : GOLD,
      );
    }
  } else if (locked) {
    c.glow(cx, cy, outerR * 1.12, rgb('#40347a'), 0.26);
  } else {
    c.glow(cx, cy, outerR * 1.16, accent, 0.34);
  }

  // 2. Ornate Midnight-Cloisonne & Burnished-Gold Circular Portal Frame
  c.obj((l) => {
    // Outer gilded bezel ring
    const outerFill = locked
      ? lgrad(cx - outerR, cy - outerR, cx + outerR, cy + outerR, [SLATE_HI, rgb('#5d588f'), SLATE_LO])
      : completed
        ? lgrad(cx - outerR, cy - outerR, cx + outerR, cy + outerR, [WHITE, GOLD_HI, GOLD, GOLD_LO])
        : lgrad(cx - outerR, cy - outerR, cx + outerR, cy + outerR, [GOLD_HI, GOLD, GOLD_LO]);
    l.disc(cx, cy, outerR, outerFill);
    // Recessed midnight enamel cloisonne channel
    l.disc(cx, cy, outerR - Math.max(1.2, frameT * 0.28), vgrad(cy - outerR, cy + outerR, [INDIGO, MIDNIGHT]));
    // Inner gold fillet hugging portal window
    l.disc(cx, cy, innerR + Math.max(1, frameT * 0.24), locked ? GOLD_LO : GOLD_HI);
    // 8 ornate cloisonne jewel studs embedded around the ring
    const studR = innerR + frameT * 0.54;
    for (let i = 0; i < 8; i++) {
      const a = (i * Math.PI) / 4;
      const sx = cx + Math.cos(a) * studR;
      const sy = cy + Math.sin(a) * studR;
      const studCol = locked ? SLATE_HI : completed ? GOLD_HI : i % 2 === 0 ? accent : accentSoft;
      l.disc(sx, sy, Math.max(0.9, frameT * 0.22), studCol);
    }
  }, { rim: 0.2, deep: true });

  // 3. Paint the bespoke universe miniature scene onto scratch canvas & clip into innerR
  const scene = new Canvas(lw, lh);
  paintUniverseScene(scene, universeId, cx, cy, innerR, def);

  for (let y = 0; y < lh; y++) {
    for (let x = 0; x < lw; x++) {
      const d = Math.hypot(x + 0.5 - cx, y + 0.5 - cy);
      if (d > innerR) continue;
      const col = scene.get(x, y);
      if (locked) {
        // Veil the portal silhouette in deep twilight indigo stardust mist
        const veiled = mix(col, VEIL, 0.68);
        c.set(x, y, veiled);
      } else {
        c.set(x, y, col);
      }
    }
  }

  // Crisp 1px INK inner contour separating gilded bezel from scene
  for (let y = 0; y < lh; y++) {
    for (let x = 0; x < lw; x++) {
      const d = Math.hypot(x + 0.5 - cx, y + 0.5 - cy);
      if (d <= innerR && d > innerR - 1.15) {
        c.set(x, y, INK);
      }
    }
  }

  // 4. Locked treatment: swirling indigo stardust veil + gleaming burnished-gold padlock centered!
  if (locked) {
    const rng = mulberry32(hashString(`uportal-lock:${universeId}`));
    for (let i = 0; i < 16; i++) {
      const a = rng.range(0, Math.PI * 2);
      const rad = rng.range(innerR * 0.25, innerR * 0.88);
      const px = cx + Math.cos(a) * rad;
      const py = cy + Math.sin(a) * rad;
      c.set(px, py, rng.chance(0.4) ? rgb('#c4b8ff') : rgb('#7b70b8'));
    }
    const ps = Math.max(5.5, innerR * 0.44);
    c.glow(cx, cy + ps * 0.08, ps * 1.5, GOLD, 0.34);
    c.obj((l) => {
      // Arched golden padlock shackle
      l.arc(cx, cy - ps * 0.26, ps * 0.34, ps * 0.58, Math.PI, Math.PI * 2, lgrad(cx - ps * 0.5, cy - ps * 0.8, cx + ps * 0.5, cy, [GOLD_HI, GOLD, GOLD_LO]));
      l.rect(cx - ps * 0.58, cy - ps * 0.28, cx - ps * 0.34, cy - ps * 0.04, GOLD);
      l.rect(cx + ps * 0.34, cy - ps * 0.28, cx + ps * 0.58, cy - ps * 0.04, GOLD_LO);
      // Ornate beveled gold padlock body
      l.rrect(cx - ps * 0.78, cy - ps * 0.1, cx + ps * 0.78, cy + ps * 0.9, ps * 0.24, lgrad(cx - ps * 0.7, cy - ps * 0.1, cx + ps * 0.7, cy + ps * 0.9, [WHITE, GOLD_HI, GOLD, GOLD_LO]));
      // Midnight enameled keyhole plaque
      l.rrect(cx - ps * 0.52, cy + ps * 0.06, cx + ps * 0.52, cy + ps * 0.74, ps * 0.16, MIDNIGHT);
      // Gleaming keyhole silhouette
      l.disc(cx, cy + ps * 0.32, Math.max(1.2, ps * 0.18), GOLD_HI);
      l.poly([[cx - ps * 0.1, cy + ps * 0.38], [cx + ps * 0.1, cy + ps * 0.38], [cx + ps * 0.16, cy + ps * 0.64], [cx - ps * 0.16, cy + ps * 0.64]], GOLD);
    }, { rim: 0.2 });
    c.sparkle(cx - ps * 0.56, cy - ps * 0.56, 1, WHITE, GOLD_HI);
  }

  // 5. Completed treatment: crowning golden star-crest atop the portal frame!
  if (completed) {
    const crY = Math.max(3, cy - outerR + frameT * 0.15);
    const crR = Math.max(4, S * 0.115);
    c.glow(cx, crY, crR * 1.9, GOLD_HI, 0.55);
    c.obj((l) => {
      l.star(cx, crY, crR, crR * 0.46, rgrad(cx - 1, crY - 1, crR * 1.1, [WHITE, GOLD_HI, GOLD, GOLD_LO]));
    }, { rim: 0.18 });
    c.sparkle(cx - outerR * 0.74, cy - outerR * 0.68, 2, WHITE, GOLD_HI);
    c.sparkle(cx + outerR * 0.74, cy - outerR * 0.68, 2, GOLD_HI, WHITE);
  } else if (!locked) {
    c.sparkle(cx - outerR * 0.72, cy - outerR * 0.72, 1, WHITE, GOLD_HI);
    c.sparkle(cx + outerR * 0.72, cy + outerR * 0.68, 1, light(accentSoft, 0.4));
  }

  return c;
}
