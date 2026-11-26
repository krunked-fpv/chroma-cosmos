/**
 * Deterministic Hi-Bit UI Pixel-Art Sprite Atlas (Midnight Cloisonne & Burnished Gold aesthetic).
 * Exports crisp integer-scaled pixel sprites for all 42 UiSpriteIds, all 11 BrushIds,
 * and all 14 HeroQuestId Story Medallions (lit & unlit).
 * Uses deep-plum (#231942) sel-out outlines, burnished gold (#eac46f) rims, and white specular glints.
 * Pure + deterministic (no randomness, no timers).
 */
import type { HeroQuestId, PixelImage, UiPixelSpriteAtlas, UiSpriteId } from '../../contracts/art';
import { GOLD_HEX, PAPER_HEX } from '../../contracts/constants';
import type { BrushId } from '../../contracts/roguelike';
import { Canvas, INK, light, lgrad, mix, type Pt, rgrad, rgb, type RGB, shade, upscale, vgrad, WHITE } from './canvas';
import { drawBrushIcon } from './icons';

const GOLD: RGB = rgb(GOLD_HEX); // #eac46f
const GOLD_HI: RGB = rgb('#fff3c4');
const GOLD_LO: RGB = rgb('#a87224');
const PAPER: RGB = rgb(PAPER_HEX); // #faf6ec
const MIDNIGHT: RGB = rgb('#1c1142');
const INDIGO: RGB = rgb('#3f2278');
const VIOLET: RGB = rgb('#7c4dff');
const LAVENDER: RGB = rgb('#c4a8ff');
const ROSE: RGB = rgb('#ff5e8e');
const PINK: RGB = rgb('#ff9ec2');
const CYAN: RGB = rgb('#4ae0cb');
const SKY: RGB = rgb('#7cc8ff');
const AMBER: RGB = rgb('#ffb84d');
const MINT: RGB = rgb('#a8fff0');
const EMERALD: RGB = rgb('#3be099');
const JADE: RGB = rgb('#1ea87a');
const CORAL: RGB = rgb('#ff7366');
const TANGERINE: RGB = rgb('#ff8c38');
const RUBY: RGB = rgb('#e83b6b');
const SAPPHIRE: RGB = rgb('#3c78e8');
const PLUM: RGB = rgb('#5d2b8a');
const SILVER: RGB = rgb('#9ea8d4');

function drawCloisonneDisc(c: Canvas, cx: number, cy: number, r: number, innerTop: RGB, innerBot: RGB, rim: RGB = GOLD): void {
  c.obj((l) => {
    l.disc(cx, cy, r, rgrad(cx - r * 0.25, cy - r * 0.25, r * 1.2, [GOLD_HI, rim, GOLD_LO]));
    l.disc(cx, cy, Math.max(2, r - Math.max(1.5, r * 0.14)), vgrad(cy - r, cy + r, [innerTop, innerBot]));
  }, { rim: 0.14 });
}

/** Draw crisp pixel-art Hero Quest silhouette centered at (cx, cy) scaled by radius `s`. */
export function drawQuestSilhouette(c: Canvas, quest: HeroQuestId, cx: number, cy: number, s: number, completed = false): void {
  // Subtle midnight-cloisonne medallion backdrop (gold-lit when completed!)
  const bgTop = completed ? rgb('#4f2685') : rgb('#261857');
  const bgBot = completed ? rgb('#23114f') : MIDNIGHT;
  const rimCol = completed ? GOLD_HI : GOLD;
  drawCloisonneDisc(c, cx, cy, s * 0.94, bgTop, bgBot, rimCol);
  if (completed) {
    c.glow(cx, cy, s * 0.82, GOLD, 0.42);
  }

  const r = s * 0.68;

  switch (quest) {
    case 'violet': {
      // Helmeted Violet bust: sandy bangs, round helmet, star antenna, bright eyes & rosy cheeks
      c.obj((l) => {
        // Star antenna atop helmet
        l.line(cx, cy - r * 0.65, cx, cy - r * 1.05, GOLD);
        l.disc(cx, cy - r * 1.05, Math.max(1.2, r * 0.18), GOLD_HI);
        // Helmet dome & collar
        l.disc(cx, cy - r * 0.04, r * 0.78, rgrad(cx - r * 0.25, cy - r * 0.35, r * 0.95, [WHITE, rgb('#d6def0'), rgb('#8f9ec4')]));
        // Flowing sandy hair & bangs
        l.ellipse(cx - r * 0.52, cy + r * 0.44, r * 0.24, r * 0.42, rgb('#e9c27c'), 0.2);
        l.ellipse(cx + r * 0.52, cy + r * 0.44, r * 0.24, r * 0.42, rgb('#e9c27c'), -0.2);
        l.disc(cx, cy + r * 0.04, r * 0.56, rgb('#ffd3b8'));
        l.arc(cx, cy - r * 0.04, 0, r * 0.58, Math.PI, Math.PI * 2, rgb('#e9c27c'));
        // Star hair clips + eyes + blush
        l.dot(cx - r * 0.26, cy - r * 0.24, GOLD_HI);
        l.dot(cx + r * 0.26, cy - r * 0.24, GOLD_HI);
        l.disc(cx - r * 0.22, cy + r * 0.06, Math.max(1, r * 0.11), INK);
        l.disc(cx + r * 0.22, cy + r * 0.06, Math.max(1, r * 0.11), INK);
        l.dot(cx - r * 0.24, cy + r * 0.02, WHITE);
        l.dot(cx + r * 0.2, cy + r * 0.02, WHITE);
        l.dot(cx - r * 0.34, cy + r * 0.2, PINK);
        l.dot(cx + r * 0.34, cy + r * 0.2, PINK);
        // Starry pajama shoulders
        l.ellipse(cx, cy + r * 0.72, r * 0.52, r * 0.28, VIOLET);
      }, { rim: 0.18 });
      break;
    }

    case 'lumi': {
      // Graceful Lumi unicorn profile facing right: golden spiral horn, perked ear, aurora mane
      c.obj((l) => {
        // Golden spiral unicorn horn
        l.poly([
          [cx + r * 0.18, cy - r * 0.38],
          [cx + r * 0.88, cy - r * 0.96],
          [cx + r * 0.38, cy - r * 0.18],
        ], lgrad(cx + r * 0.2, cy - r * 0.2, cx + r * 0.88, cy - r * 0.96, [GOLD, GOLD_HI, WHITE]));
        // Flowing aurora pink-lavender mane behind neck
        l.stroke([
          [cx - r * 0.08, cy - r * 0.58],
          [cx - r * 0.52, cy - r * 0.18],
          [cx - r * 0.68, cy + r * 0.48],
        ], r * 0.26, vgrad(cy - r * 0.6, cy + r * 0.6, [PINK, LAVENDER, SKY]), r * 0.16);
        // Neck & pearl-white unicorn head + muzzle
        l.capsule(cx - r * 0.26, cy + r * 0.72, cx - r * 0.04, cy - r * 0.08, r * 0.3, rgb('#fdf3ff'));
        l.ellipse(cx + r * 0.16, cy - r * 0.06, r * 0.46, r * 0.34, rgrad(cx, cy - r * 0.18, r * 0.6, [WHITE, rgb('#fdf3ff'), rgb('#d6c8ff')]), 0.12);
        // Perked ear
        l.poly([[cx - r * 0.18, cy - r * 0.34], [cx - r * 0.34, cy - r * 0.84], [cx + r * 0.04, cy - r * 0.46]], rgb('#fdf3ff'));
        // Expressive eye & blush
        l.disc(cx + r * 0.2, cy - r * 0.1, Math.max(1, r * 0.11), INK);
        l.dot(cx + r * 0.22, cy - r * 0.14, WHITE);
        l.dot(cx + r * 0.28, cy + r * 0.08, PINK);
      }, { rim: 0.18 });
      break;
    }

    case 'nova': {
      // Sleek golden cosmic cheetah head & shoulders with rounded ears, spots & tear marks
      c.obj((l) => {
        // Rounded cheetah ears
        l.disc(cx - r * 0.48, cy - r * 0.56, r * 0.24, rgb('#ffc94d'));
        l.disc(cx + r * 0.48, cy - r * 0.56, r * 0.24, rgb('#ffc94d'));
        l.disc(cx - r * 0.48, cy - r * 0.56, r * 0.11, rgb('#9a4a1c'));
        l.disc(cx + r * 0.48, cy - r * 0.56, r * 0.11, rgb('#9a4a1c'));
        // Feline head & warm amber chest
        l.ellipse(cx, cy + r * 0.58, r * 0.54, r * 0.34, rgb('#ff9a3c'));
        l.ellipse(cx, cy - r * 0.02, r * 0.64, r * 0.56, rgrad(cx - r * 0.2, cy - r * 0.25, r * 0.85, [rgb('#ffe680'), rgb('#ffc94d'), rgb('#e88a24')]));
        // Cheetah spots & tear stripes
        l.dot(cx - r * 0.28, cy - r * 0.34, rgb('#8a3b12'));
        l.dot(cx + r * 0.28, cy - r * 0.34, rgb('#8a3b12'));
        l.dot(cx, cy - r * 0.4, rgb('#8a3b12'));
        l.disc(cx - r * 0.24, cy - r * 0.04, Math.max(1, r * 0.11), INK);
        l.disc(cx + r * 0.24, cy - r * 0.04, Math.max(1, r * 0.11), INK);
        l.dot(cx - r * 0.26, cy - r * 0.08, WHITE);
        l.dot(cx + r * 0.22, cy - r * 0.08, WHITE);
        l.poly([[cx - r * 0.1, cy + r * 0.16], [cx + r * 0.1, cy + r * 0.16], [cx, cy + r * 0.28]], rgb('#8a3b12'));
      }, { rim: 0.18 });
      break;
    }

    case 'rocket': {
      // Folded Paper Rocket tilted up-right with coral fins, cyan porthole & golden thruster spark
      c.obj((l) => {
        // Golden exhaust flame bottom-left
        l.poly([
          [cx - r * 0.36, cy + r * 0.36],
          [cx - r * 0.84, cy + r * 0.84],
          [cx - r * 0.18, cy + r * 0.54],
        ], vgrad(cy + r * 0.3, cy + r * 0.85, [WHITE, GOLD_HI, AMBER]));
        // Coral fins
        l.poly([[cx - r * 0.14, cy + r * 0.18], [cx - r * 0.62, cy + r * 0.14], [cx - r * 0.42, cy + r * 0.44]], ROSE);
        l.poly([[cx + r * 0.18, cy + r * 0.14], [cx + r * 0.14, cy + r * 0.62], [cx - r * 0.14, cy + r * 0.42]], ROSE);
        // Cream folded fuselage pointing top-right
        l.poly([
          [cx + r * 0.78, cy - r * 0.78],
          [cx + r * 0.46, cy - r * 0.04],
          [cx - r * 0.26, cy + r * 0.46],
          [cx - r * 0.46, cy + r * 0.26],
          [cx + r * 0.04, cy - r * 0.46],
        ], lgrad(cx - r * 0.4, cy - r * 0.4, cx + r * 0.6, cy + r * 0.4, [WHITE, PAPER, rgb('#d6def0')]));
        // Cyan circular porthole
        l.disc(cx + r * 0.14, cy - r * 0.14, r * 0.22, CYAN);
        l.dot(cx + r * 0.08, cy - r * 0.2, WHITE);
      }, { rim: 0.2 });
      break;
    }

    case 'planet': {
      // Ringed Planet with tilted golden-pastel rings sweeping across warm peach-rose globe
      c.obj((l) => {
        l.ering(cx, cy, r * 1.12, r * 0.36, 0.62, GOLD_HI, -0.34);
        l.disc(cx, cy, r * 0.58, rgrad(cx - r * 0.2, cy - r * 0.2, r * 0.7, [GOLD_HI, rgb('#ffb27a'), ROSE]));
        // Front half of ring over planet
        l.shape(cx - r * 1.15, cy - r * 0.6, cx + r * 1.15, cy + r * 0.6, (x, y) => {
          const dx = x - cx;
          const dy = y - cy;
          const co = Math.cos(-0.34);
          const si = Math.sin(-0.34);
          const u = (dx * co + dy * si) / (r * 1.12);
          const v = (-dx * si + dy * co) / (r * 0.36);
          return v > 0 && u * u + v * v <= 1 && u * u + v * v >= 0.62 * 0.62;
        }, GOLD);
      }, { rim: 0.18 });
      break;
    }

    case 'cloud': {
      // Plump scalloped cumulus cloud in luminous cream-lavender with starry sparkle
      c.obj((l) => {
        const clFill = vgrad(cy - r * 0.6, cy + r * 0.5, [WHITE, PAPER, rgb('#e2d9ff')]);
        l.ellipse(cx, cy + r * 0.24, r * 0.76, r * 0.3, clFill);
        l.disc(cx - r * 0.42, cy + r * 0.08, r * 0.34, clFill);
        l.disc(cx + r * 0.42, cy + r * 0.1, r * 0.32, clFill);
        l.disc(cx - r * 0.06, cy - r * 0.14, r * 0.44, clFill);
        l.disc(cx + r * 0.28, cy - r * 0.04, r * 0.32, clFill);
      }, { rim: 0.16 });
      c.sparkle(cx - r * 0.55, cy - r * 0.48, 1, GOLD_HI, WHITE);
      break;
    }

    case 'milkshake': {
      // Giant Cosmic Milkshake glass with whipped cream dome, striped straw & cherry
      c.obj((l) => {
        // Striped straw
        l.capsule(cx + r * 0.16, cy - r * 0.32, cx + r * 0.58, cy - r * 0.92, Math.max(1.1, r * 0.12), CYAN);
        // Pedestal foot & pink milkshake tulip glass
        l.ellipse(cx, cy + r * 0.84, r * 0.4, r * 0.14, LAVENDER);
        l.poly([
          [cx - r * 0.56, cy - r * 0.06],
          [cx + r * 0.56, cy - r * 0.06],
          [cx + r * 0.32, cy + r * 0.74],
          [cx - r * 0.32, cy + r * 0.74],
        ], vgrad(cy - r * 0.1, cy + r * 0.75, [PINK, ROSE, rgb('#b82d76')]));
        // Whipped cream dome
        l.disc(cx - r * 0.22, cy - r * 0.18, r * 0.32, PAPER);
        l.disc(cx + r * 0.22, cy - r * 0.18, r * 0.32, PAPER);
        l.disc(cx, cy - r * 0.42, r * 0.32, WHITE);
        // Cherry on top
        l.disc(cx - r * 0.04, cy - r * 0.74, r * 0.18, rgb('#ff3366'));
        l.dot(cx - r * 0.1, cy - r * 0.78, WHITE);
      }, { rim: 0.18 });
      break;
    }

    case 'asteroid': {
      // Faceted Crystal Asteroid Spire Cluster glowing in glacier-mint & amethyst
      c.obj((l) => {
        // Rocky asteroid base
        l.ellipse(cx, cy + r * 0.46, r * 0.68, r * 0.32, rgb('#6f5e99'));
        // Left amethyst shard
        l.poly([
          [cx - r * 0.58, cy + r * 0.32],
          [cx - r * 0.74, cy - r * 0.32],
          [cx - r * 0.36, cy - r * 0.52],
          [cx - r * 0.16, cy + r * 0.3],
        ], lgrad(cx - r * 0.7, cy - r * 0.5, cx, cy + r * 0.3, [WHITE, LAVENDER, VIOLET]));
        // Tall center crystal-mint spire
        l.poly([
          [cx - r * 0.26, cy + r * 0.38],
          [cx - r * 0.22, cy - r * 0.48],
          [cx, cy - r * 0.9],
          [cx + r * 0.24, cy - r * 0.46],
          [cx + r * 0.26, cy + r * 0.38],
        ], (x) => (x < cx ? MINT : CYAN));
        // Right sky shard
        l.poly([
          [cx + r * 0.18, cy + r * 0.32],
          [cx + r * 0.56, cy - r * 0.52],
          [cx + r * 0.74, cy - r * 0.2],
          [cx + r * 0.52, cy + r * 0.34],
        ], SKY);
        l.dot(cx - 1, cy - r * 0.62, WHITE);
      }, { rim: 0.18 });
      break;
    }

    case 'moonCat': {
      // Sleepy Moon-Cat nestled in a golden crescent moon
      c.obj((l) => {
        const mr = r * 0.88;
        l.shape(cx - mr, cy - mr, cx + mr, cy + mr, (px, py) =>
          Math.hypot(px - cx, py - cy) <= mr &&
          Math.hypot(px - (cx - mr * 0.26), py - (cy - mr * 0.26)) >= mr * 0.76,
          lgrad(cx - r, cy - r, cx + r, cy + r, [GOLD_HI, GOLD, AMBER]));
        // Sleepy pearl-lavender kitten head
        const kx = cx - r * 0.12;
        const ky = cy - r * 0.06;
        l.disc(kx, ky, r * 0.42, rgb('#e8dcff'));
        l.poly([[kx - r * 0.36, ky - r * 0.18], [kx - r * 0.28, ky - r * 0.66], [kx - r * 0.04, ky - r * 0.34]], rgb('#e8dcff'));
        l.poly([[kx + r * 0.36, ky - r * 0.18], [kx + r * 0.28, ky - r * 0.66], [kx + r * 0.04, ky - r * 0.34]], rgb('#e8dcff'));
        l.line(kx - r * 0.22, ky, kx - r * 0.06, ky, INK);
        l.line(kx + r * 0.06, ky, kx + r * 0.22, ky, INK);
        l.dot(kx - r * 0.24, ky + r * 0.14, PINK);
        l.dot(kx + r * 0.24, ky + r * 0.14, PINK);
      }, { rim: 0.18 });
      break;
    }

    case 'suns': {
      // Glowing Binary Twin Suns (large golden sun + rose-coral companion sun)
      c.obj((l) => {
        // Companion rose sun upper-right
        const s2x = cx + r * 0.42;
        const s2y = cy - r * 0.34;
        l.disc(s2x, s2y, r * 0.38, rgrad(s2x - r * 0.1, s2y - r * 0.1, r * 0.45, [WHITE, PINK, ROSE]));
        // Primary blazing golden sun lower-left
        const s1x = cx - r * 0.22;
        const s1y = cy + r * 0.18;
        l.star(s1x, s1y, r * 0.78, r * 0.56, GOLD, 8);
        l.disc(s1x, s1y, r * 0.54, rgrad(s1x - r * 0.15, s1y - r * 0.15, r * 0.65, [WHITE, GOLD_HI, AMBER]));
      }, { rim: 0.16 });
      break;
    }

    case 'boba': {
      // Domed Zero-G Bubble-Tea Cup with fat mint straw, creamy tea & dark glossy boba pearls
      c.obj((l) => {
        // Fat boba straw
        l.capsule(cx + r * 0.14, cy - r * 0.28, cx + r * 0.34, cy - r * 0.94, Math.max(1.3, r * 0.15), CYAN);
        // Clear domed lid
        l.ellipse(cx, cy - r * 0.34, r * 0.6, r * 0.34, rgb('#eefcff'));
        // Milk-tea cup body
        l.poly([
          [cx - r * 0.6, cy - r * 0.3],
          [cx + r * 0.6, cy - r * 0.3],
          [cx + r * 0.44, cy + r * 0.78],
          [cx - r * 0.44, cy + r * 0.78],
        ], vgrad(cy - r * 0.3, cy + r * 0.8, [rgb('#f7d5b0'), rgb('#e0a97b'), rgb('#b87852')]));
        // Pink lid rim band
        l.rrect(cx - r * 0.66, cy - r * 0.38, cx + r * 0.66, cy - r * 0.2, 1, ROSE);
        // Glossy boba pearls at cup base
        for (const [bx, by] of [[-0.24, 0.54], [0, 0.58], [0.24, 0.52]] as const) {
          l.disc(cx + bx * r, cy + by * r, Math.max(1.2, r * 0.14), MIDNIGHT);
          l.dot(cx + bx * r - 0.5, cy + by * r - 0.5, WHITE);
        }
      }, { rim: 0.18 });
      break;
    }

    case 'whale': {
      // Plump Starry Sapphire Whale facing right with pale belly, arched tail flukes & starlight spout
      c.obj((l) => {
        // Tail flukes left
        l.poly([[cx - r * 0.45, cy + r * 0.08], [cx - r * 0.92, cy - r * 0.32], [cx - r * 0.76, cy + r * 0.08]], SKY);
        l.poly([[cx - r * 0.45, cy + r * 0.1], [cx - r * 0.9, cy + r * 0.38], [cx - r * 0.68, cy + r * 0.14]], rgb('#4d78e8'));
        // Plump whale torso
        l.ellipse(cx + r * 0.14, cy + r * 0.1, r * 0.66, r * 0.44, vgrad(cy - r * 0.35, cy + r * 0.55, [rgb('#5c85ff'), rgb('#4264d4'), rgb('#2d3e99')]));
        // Pale belly underside
        l.ellipse(cx + r * 0.22, cy + r * 0.32, r * 0.46, r * 0.18, rgb('#d6f5ff'));
        // Cute eye & golden star freckles
        l.dot(cx + r * 0.5, cy + r * 0.06, INK);
        l.dot(cx + r * 0.1, cy - r * 0.08, GOLD_HI);
        l.dot(cx - r * 0.14, cy + r * 0.02, WHITE);
      }, { rim: 0.18 });
      // Tiny starlight spout above blowhole
      c.sparkle(cx + r * 0.32, cy - r * 0.56, 1, MINT, WHITE);
      break;
    }

    case 'heart': {
      // Radiant Cosmic Lotus-Heart Medallion with golden core & rose-gold petals
      c.obj((l) => {
        for (let i = 0; i < 6; i++) {
          const a = (i * Math.PI) / 3;
          l.ellipse(cx + Math.cos(a) * r * 0.58, cy + Math.sin(a) * r * 0.58, r * 0.26, r * 0.14, i % 2 === 0 ? GOLD : PINK, a);
        }
        l.heart(cx, cy + r * 0.06, r * 0.58, rgrad(cx - r * 0.15, cy - r * 0.15, r * 0.7, [WHITE, PINK, ROSE, rgb('#b82473')]));
        l.heart(cx, cy + r * 0.08, r * 0.26, GOLD_HI);
      }, { rim: 0.18 });
      break;
    }

    case 'comet': {
      // Cheerful glowing Star Comet streaking top-right with rainbow tail
      c.obj((l) => {
        l.stroke([
          [cx + r * 0.24, cy - r * 0.2],
          [cx - r * 0.24, cy + r * 0.18],
          [cx - r * 0.84, cy + r * 0.58],
        ], r * 0.24, lgrad(cx + r * 0.25, cy - r * 0.2, cx - r * 0.85, cy + r * 0.6, [CYAN, LAVENDER, PINK]), r * 0.08);
        l.star(cx + r * 0.34, cy - r * 0.28, r * 0.46, r * 0.24, rgrad(cx + r * 0.28, cy - r * 0.34, r * 0.5, [WHITE, GOLD_HI, CYAN]));
      }, { rim: 0.18 });
      break;
    }

    case 'shell': {
      const t = (col: RGB): RGB => (completed ? col : mix(col, SILVER, 0.36));
      // Scalloped giant coral-pink clam shell cradling a radiant pearl
      c.obj((l) => {
        // Upper fanned shell valve
        l.arc(cx, cy + r * 0.22, 0, r * 0.78, Math.PI * 1.06, Math.PI * 1.94, rgrad(cx, cy - r * 0.2, r * 0.85, [t(PINK), t(ROSE), t(PLUM)]));
        // Scallop ridge lines
        l.line(cx, cy + r * 0.18, cx - r * 0.46, cy - r * 0.34, t(GOLD_HI));
        l.line(cx, cy + r * 0.18, cx, cy - r * 0.5, t(GOLD_HI));
        l.line(cx, cy + r * 0.18, cx + r * 0.46, cy - r * 0.34, t(GOLD_HI));
        // Lower shell cradle
        l.ellipse(cx, cy + r * 0.4, r * 0.72, r * 0.24, t(CORAL));
        // Luminous iridescent pearl inside
        l.disc(cx, cy + r * 0.18, r * 0.32, rgrad(cx - r * 0.1, cy + r * 0.08, r * 0.38, [WHITE, t(PAPER), t(MINT)]));
        l.dot(cx - r * 0.1, cy + r * 0.08, WHITE);
      }, { rim: 0.18 });
      break;
    }

    case 'jelly': {
      const t = (col: RGB): RGB => (completed ? col : mix(col, SILVER, 0.36));
      // Glowing bubblegum-pink & cyan-frilled jellyfish with trailing tentacles
      c.obj((l) => {
        for (const ox of [-0.4, -0.14, 0.14, 0.4]) {
          l.stroke([
            [cx + ox * r, cy + r * 0.04],
            [cx + (ox - 0.1) * r, cy + r * 0.42],
            [cx + (ox + 0.08) * r, cy + r * 0.78],
          ], Math.max(1, r * 0.09), t(CYAN));
        }
        l.arc(cx, cy + r * 0.06, 0, r * 0.68, Math.PI, Math.PI * 2, rgrad(cx - r * 0.18, cy - r * 0.24, r * 0.78, [WHITE, t(PINK), t(ROSE)]));
        l.ellipse(cx, cy + r * 0.06, r * 0.66, r * 0.16, t(MINT));
        l.dot(cx - r * 0.26, cy - r * 0.26, WHITE);
        l.dot(cx + r * 0.18, cy - r * 0.3, t(GOLD_HI));
      }, { rim: 0.18 });
      break;
    }

    case 'cake': {
      const t = (col: RGB): RGB => (completed ? col : mix(col, SILVER, 0.36));
      // Two-tier frosted sky-bakery celebration cake with star candle
      c.obj((l) => {
        // Cake plate
        l.ellipse(cx, cy + r * 0.72, r * 0.76, r * 0.16, t(GOLD));
        // Lower strawberry tier + white frosting scallops
        l.rrect(cx - r * 0.64, cy + r * 0.14, cx + r * 0.64, cy + r * 0.68, r * 0.1, vgrad(cy + r * 0.14, cy + r * 0.68, [t(PINK), t(ROSE)]));
        l.rrect(cx - r * 0.66, cy + r * 0.08, cx + r * 0.66, cy + r * 0.26, r * 0.08, t(PAPER));
        // Upper buttercream tier
        l.rrect(cx - r * 0.4, cy - r * 0.36, cx + r * 0.4, cy + r * 0.12, r * 0.08, vgrad(cy - r * 0.36, cy + r * 0.12, [t(GOLD_HI), t(AMBER)]));
        l.rrect(cx - r * 0.42, cy - r * 0.4, cx + r * 0.42, cy - r * 0.24, r * 0.08, WHITE);
        // Star candle atop cake
        l.rect(cx - r * 0.08, cy - r * 0.64, cx + r * 0.08, cy - r * 0.38, t(CYAN));
        l.star(cx, cy - r * 0.76, r * 0.24, r * 0.1, t(GOLD_HI));
        // Sprinkles
        l.dot(cx - r * 0.32, cy + r * 0.42, t(CYAN));
        l.dot(cx + r * 0.28, cy + r * 0.4, t(GOLD_HI));
      }, { rim: 0.18 });
      break;
    }

    case 'mushroom': {
      const t = (col: RGB): RGB => (completed ? col : mix(col, SILVER, 0.36));
      // Bioluminescent ruby polka-dot toadstool with glowing mint gills
      c.obj((l) => {
        // Plump ivory stalk
        l.poly([
          [cx - r * 0.28, cy + r * 0.08],
          [cx + r * 0.28, cy + r * 0.08],
          [cx + r * 0.36, cy + r * 0.76],
          [cx - r * 0.36, cy + r * 0.76],
        ], lgrad(cx - r * 0.34, cy, cx + r * 0.34, cy, [WHITE, t(PAPER), t(LAVENDER)]));
        // Luminous emerald-mint gills
        l.ellipse(cx, cy + r * 0.12, r * 0.76, r * 0.2, t(EMERALD));
        // Ruby dome cap
        l.arc(cx, cy + r * 0.12, 0, r * 0.8, Math.PI, Math.PI * 2, rgrad(cx - r * 0.2, cy - r * 0.34, r * 0.88, [t(CORAL), t(RUBY), t(PLUM)]));
        // Polka dots
        l.disc(cx - r * 0.38, cy - r * 0.18, r * 0.15, WHITE);
        l.disc(cx + r * 0.36, cy - r * 0.2, r * 0.14, t(PAPER));
        l.disc(cx, cy - r * 0.44, r * 0.17, WHITE);
      }, { rim: 0.18 });
      c.sparkle(cx + r * 0.64, cy - r * 0.48, 1, t(EMERALD), WHITE);
      break;
    }

    case 'crane': {
      const t = (col: RGB): RGB => (completed ? col : mix(col, SILVER, 0.36));
      // Crisp folded origami paper crane in ivory & vermilion coral
      c.obj((l) => {
        // Rear wing
        l.poly([[cx - r * 0.08, cy + r * 0.06], [cx - r * 0.74, cy - r * 0.46], [cx + r * 0.22, cy - r * 0.2]], t(CORAL));
        // Folded body diamond
        l.poly([[cx - r * 0.42, cy + r * 0.32], [cx + r * 0.06, cy - r * 0.08], [cx + r * 0.46, cy + r * 0.28], [cx + r * 0.02, cy + r * 0.5]], t(PAPER));
        // Front soaring wing
        l.poly([[cx - r * 0.2, cy + r * 0.2], [cx + r * 0.18, cy - r * 0.72], [cx + r * 0.36, cy + r * 0.1]], WHITE);
        l.poly([[cx - r * 0.2, cy + r * 0.2], [cx + r * 0.18, cy - r * 0.72], [cx + r * 0.02, cy + r * 0.08]], t(LAVENDER));
        // Slender crane neck & beak
        l.poly([[cx - r * 0.38, cy + r * 0.32], [cx - r * 0.72, cy - r * 0.18], [cx - r * 0.56, cy - r * 0.26], [cx - r * 0.22, cy + r * 0.16]], t(PAPER));
        l.poly([[cx - r * 0.72, cy - r * 0.18], [cx - r * 0.9, cy - r * 0.1], [cx - r * 0.62, cy - r * 0.28]], t(GOLD_HI));
        // Tail spire
        l.poly([[cx + r * 0.38, cy + r * 0.24], [cx + r * 0.82, cy - r * 0.16], [cx + r * 0.48, cy + r * 0.36]], t(GOLD_HI));
      }, { rim: 0.18 });
      break;
    }

    case 'dino': {
      const t = (col: RGB): RGB => (completed ? col : mix(col, SILVER, 0.36));
      // Friendly pastel-emerald baby brontosaurus profile
      c.obj((l) => {
        // Tail & plump body
        l.stroke([[cx - r * 0.78, cy + r * 0.52], [cx - r * 0.44, cy + r * 0.4], [cx - r * 0.12, cy + r * 0.34]], r * 0.14, t(JADE), r * 0.26);
        l.ellipse(cx - r * 0.16, cy + r * 0.34, r * 0.42, r * 0.3, rgrad(cx - r * 0.26, cy + r * 0.2, r * 0.52, [t(MINT), t(EMERALD), t(JADE)]));
        // Sturdy dino legs
        l.rrect(cx - r * 0.42, cy + r * 0.48, cx - r * 0.22, cy + r * 0.78, 1, t(JADE));
        l.rrect(cx - r * 0.04, cy + r * 0.48, cx + r * 0.16, cy + r * 0.78, 1, t(JADE));
        // Curved long neck & happy round snout
        l.stroke([[cx + r * 0.12, cy + r * 0.22], [cx + r * 0.24, cy - r * 0.16], [cx + r * 0.14, cy - r * 0.52]], r * 0.18, t(EMERALD), r * 0.15);
        l.ellipse(cx + r * 0.32, cy - r * 0.52, r * 0.32, r * 0.22, t(EMERALD));
        // Eye, rosy cheek & sunny amber spots
        l.disc(cx + r * 0.36, cy - r * 0.56, Math.max(1, r * 0.1), INK);
        l.dot(cx + r * 0.34, cy - r * 0.59, WHITE);
        l.dot(cx + r * 0.44, cy - r * 0.42, t(PINK));
        l.dot(cx - r * 0.26, cy + r * 0.22, t(AMBER));
        l.dot(cx - r * 0.06, cy + r * 0.28, t(GOLD_HI));
      }, { rim: 0.18 });
      break;
    }

    case 'igloo': {
      const t = (col: RGB): RGB => (completed ? col : mix(col, SILVER, 0.36));
      // Frosted glacier-crystal snowglobe igloo with cozy glowing golden doorway
      c.obj((l) => {
        // Snowy base drift
        l.ellipse(cx, cy + r * 0.62, r * 0.84, r * 0.22, t(MINT));
        // Crystal ice dome
        l.arc(cx, cy + r * 0.56, 0, r * 0.76, Math.PI, Math.PI * 2, rgrad(cx - r * 0.22, cy - r * 0.1, r * 0.86, [WHITE, t(SKY), t(SAPPHIRE)]));
        // Horizontal ice-block courses
        l.line(cx - r * 0.66, cy + r * 0.18, cx + r * 0.66, cy + r * 0.18, t(CYAN));
        l.line(cx - r * 0.46, cy - r * 0.08, cx + r * 0.46, cy - r * 0.08, t(CYAN));
        // Arched entrance tunnel with warm golden glow
        l.arc(cx + r * 0.1, cy + r * 0.58, 0, r * 0.38, Math.PI, Math.PI * 2, WHITE);
        l.arc(cx + r * 0.1, cy + r * 0.58, 0, r * 0.25, Math.PI, Math.PI * 2, rgrad(cx + r * 0.1, cy + r * 0.46, r * 0.3, [WHITE, t(GOLD_HI), t(AMBER)]));
      }, { rim: 0.18 });
      c.sparkle(cx - r * 0.54, cy - r * 0.52, 1, WHITE, t(CYAN));
      break;
    }

    case 'airship': {
      const t = (col: RGB): RGB => (completed ? col : mix(col, SILVER, 0.36));
      // Striped burnished-brass cloud airship with gondola & golden fin
      c.obj((l) => {
        // Rigging & gondola basket
        l.line(cx - r * 0.24, cy + r * 0.18, cx - r * 0.2, cy + r * 0.52, t(GOLD));
        l.line(cx + r * 0.2, cy + r * 0.18, cx + r * 0.16, cy + r * 0.52, t(GOLD));
        l.rrect(cx - r * 0.32, cy + r * 0.46, cx + r * 0.28, cy + r * 0.72, r * 0.08, t(GOLD_LO));
        l.dot(cx - r * 0.1, cy + r * 0.58, t(GOLD_HI));
        l.dot(cx + r * 0.08, cy + r * 0.58, t(GOLD_HI));
        // Tail fins right
        l.poly([[cx + r * 0.46, cy - r * 0.1], [cx + r * 0.86, cy - r * 0.42], [cx + r * 0.74, cy - r * 0.02]], t(ROSE));
        l.poly([[cx + r * 0.46, cy + r * 0.08], [cx + r * 0.86, cy + r * 0.34], [cx + r * 0.74, cy + r * 0.02]], t(ROSE));
        // Striped balloon dirigible hull
        l.ellipse(cx - r * 0.04, cy - r * 0.12, r * 0.72, r * 0.46, (_x, y) => {
          const dy = (y - (cy - r * 0.12)) / (r * 0.46);
          return Math.abs(Math.sin(dy * 4.5)) > 0.52 ? t(GOLD_HI) : t(ROSE);
        });
        // Gleaming brass nose cone
        l.disc(cx - r * 0.72, cy - r * 0.12, r * 0.14, t(GOLD));
      }, { rim: 0.18 });
      break;
    }

    case 'koi': {
      const t = (col: RGB): RGB => (completed ? col : mix(col, SILVER, 0.36));
      // Graceful S-curved calico sakura koi fish with lacy tail & blossom dot
      c.obj((l) => {
        // Flowing ribbon tail lower-left
        l.poly([[cx - r * 0.3, cy + r * 0.3], [cx - r * 0.82, cy + r * 0.14], [cx - r * 0.6, cy + r * 0.52]], t(PINK));
        l.poly([[cx - r * 0.28, cy + r * 0.34], [cx - r * 0.52, cy + r * 0.82], [cx - r * 0.14, cy + r * 0.6]], t(ROSE));
        // Curved pectoral fins
        l.ellipse(cx - r * 0.04, cy - r * 0.34, r * 0.24, r * 0.12, t(PINK), -0.5);
        l.ellipse(cx + r * 0.32, cy + r * 0.22, r * 0.24, r * 0.12, t(PINK), 0.6);
        // Sinuous pearl-white & vermilion koi body
        l.stroke([
          [cx - r * 0.36, cy + r * 0.34],
          [cx - r * 0.12, cy - r * 0.06],
          [cx + r * 0.26, cy - r * 0.28],
          [cx + r * 0.56, cy - r * 0.12],
        ], r * 0.14, (x) => (x < cx - r * 0.05 ? t(TANGERINE) : x < cx + r * 0.28 ? WHITE : t(CORAL)), r * 0.28);
        // Cute koi eye & gold spot
        l.dot(cx + r * 0.58, cy - r * 0.16, INK);
        l.dot(cx + r * 0.34, cy - r * 0.3, t(GOLD_HI));
      }, { rim: 0.18 });
      c.dot(cx - r * 0.54, cy - r * 0.52, t(PINK));
      break;
    }

    case 'piano': {
      const t = (col: RGB): RGB => (completed ? col : mix(col, SILVER, 0.36));
      // Miniature cosmic piano keyboard crowned with a golden eighth note
      c.obj((l) => {
        // Curved violet piano body behind keys
        l.rrect(cx - r * 0.76, cy - r * 0.18, cx + r * 0.76, cy + r * 0.66, r * 0.14, vgrad(cy - r * 0.18, cy + r * 0.66, [t(VIOLET), t(INDIGO)]));
        // Ivory piano keybed
        l.rrect(cx - r * 0.68, cy + r * 0.06, cx + r * 0.68, cy + r * 0.58, r * 0.06, WHITE);
        // Crisp black sharp keys
        for (const kx of [-0.46, -0.2, 0.16, 0.42]) {
          l.rect(cx + (kx - 0.07) * r, cy + r * 0.06, cx + (kx + 0.07) * r, cy + r * 0.36, MIDNIGHT);
        }
        // Floating golden musical note above keyboard
        l.disc(cx - r * 0.16, cy - r * 0.34, r * 0.16, t(GOLD_HI));
        l.line(cx - r * 0.02, cy - r * 0.34, cx - r * 0.02, cy - r * 0.78, t(GOLD_HI));
        l.line(cx - r * 0.02, cy - r * 0.78, cx + r * 0.34, cy - r * 0.66, t(GOLD_HI));
        l.disc(cx + r * 0.22, cy - r * 0.28, r * 0.14, t(CYAN));
        l.line(cx + r * 0.34, cy - r * 0.28, cx + r * 0.34, cy - r * 0.66, t(GOLD_HI));
      }, { rim: 0.18 });
      break;
    }

    case 'geode': {
      const t = (col: RGB): RGB => (completed ? col : mix(col, SILVER, 0.36));
      // Cracked amethyst & mint-quartz geode cavity gleaming with crystal facets
      c.obj((l) => {
        // Indigo outer geode stone shell
        l.ellipse(cx, cy, r * 0.8, r * 0.72, rgrad(cx - r * 0.2, cy - r * 0.2, r * 0.86, [t(PLUM), t(INDIGO), MIDNIGHT]));
        // Glowing mint-white chalcedony band
        l.ellipse(cx, cy, r * 0.62, r * 0.54, t(MINT));
        // Deep violet crystal cavity
        l.ellipse(cx, cy, r * 0.5, r * 0.42, t(VIOLET));
        // Sparkling faceted amethyst crystal points inside
        l.poly([[cx - r * 0.36, cy + r * 0.28], [cx - r * 0.18, cy - r * 0.26], [cx, cy + r * 0.28]], t(LAVENDER));
        l.poly([[cx - r * 0.08, cy + r * 0.3], [cx + r * 0.08, cy - r * 0.36], [cx + r * 0.26, cy + r * 0.3]], WHITE);
        l.poly([[cx + r * 0.14, cy + r * 0.28], [cx + r * 0.36, cy - r * 0.18], [cx + r * 0.42, cy + r * 0.28]], t(CYAN));
      }, { rim: 0.18 });
      c.sparkle(cx + r * 0.08, cy - r * 0.34, 1, WHITE, t(GOLD_HI));
      break;
    }

    case 'pyramid': {
      const t = (col: RGB): RGB => (completed ? col : mix(col, SILVER, 0.36));
      // Sunlit golden Star-Oasis Pyramid with glowing capstone & turquoise dune wave
      c.obj((l) => {
        // Turquoise oasis wave at base
        l.ellipse(cx, cy + r * 0.62, r * 0.82, r * 0.2, t(CYAN));
        // Lit left pyramid facet
        l.poly([[cx - r * 0.74, cy + r * 0.52], [cx, cy - r * 0.72], [cx + r * 0.04, cy + r * 0.52]], vgrad(cy - r * 0.72, cy + r * 0.52, [WHITE, t(GOLD_HI), t(AMBER)]));
        // Shaded twilight-gold right facet
        l.poly([[cx, cy - r * 0.72], [cx + r * 0.74, cy + r * 0.52], [cx + r * 0.04, cy + r * 0.52]], vgrad(cy - r * 0.72, cy + r * 0.52, [t(GOLD), t(GOLD_LO), t(PLUM)]));
        // Glowing white-gold capstone star
        l.poly([[cx - r * 0.22, cy - r * 0.34], [cx, cy - r * 0.72], [cx + r * 0.22, cy - r * 0.34]], WHITE);
      }, { rim: 0.18 });
      c.sparkle(cx, cy - r * 0.76, 1, WHITE, t(GOLD_HI));
      break;
    }

    case 'book': {
      const t = (col: RGB): RGB => (completed ? col : mix(col, SILVER, 0.36));
      // Open gilded storybook with outstretched cream pages & dangling gold ribbon
      c.obj((l) => {
        // Velvet-rose hardcover binding
        l.poly([[cx - r * 0.82, cy + r * 0.36], [cx, cy + r * 0.58], [cx + r * 0.82, cy + r * 0.36], [cx + r * 0.72, cy - r * 0.32], [cx, cy - r * 0.14], [cx - r * 0.72, cy - r * 0.32]], t(RUBY));
        // Left & right open cream pages
        l.poly([[cx - r * 0.72, cy + r * 0.26], [cx - r * 0.04, cy + r * 0.44], [cx - r * 0.04, cy - r * 0.28], [cx - r * 0.64, cy - r * 0.42]], WHITE);
        l.poly([[cx + r * 0.72, cy + r * 0.26], [cx + r * 0.04, cy + r * 0.44], [cx + r * 0.04, cy - r * 0.28], [cx + r * 0.64, cy - r * 0.42]], t(PAPER));
        // Gold bookmark ribbon
        l.poly([[cx - r * 0.08, cy + r * 0.44], [cx + r * 0.1, cy + r * 0.44], [cx + r * 0.1, cy + r * 0.8], [cx, cy + r * 0.66], [cx - r * 0.08, cy + r * 0.8]], t(GOLD_HI));
        // Rising golden story star above spine
        l.star(cx, cy - r * 0.58, r * 0.26, r * 0.12, t(GOLD_HI));
      }, { rim: 0.18 });
      break;
    }

    case 'tent': {
      const t = (col: RGB): RGB => (completed ? col : mix(col, SILVER, 0.36));
      // Striped rose-and-cream circus big-top pavilion tent with fluttering flag
      c.obj((l) => {
        // Vertical striped tent walls
        l.rrect(cx - r * 0.66, cy + r * 0.08, cx + r * 0.66, cy + r * 0.7, r * 0.06, (x) => (Math.floor((x - (cx - r * 0.66)) / Math.max(2, r * 0.24)) % 2 === 0 ? t(ROSE) : t(PAPER)));
        // Peaked striped big-top canopy
        l.poly([[cx - r * 0.78, cy + r * 0.12], [cx, cy - r * 0.64], [cx + r * 0.78, cy + r * 0.12]], (x) => (Math.floor((x - (cx - r * 0.78)) / Math.max(2, r * 0.25)) % 2 === 0 ? t(ROSE) : WHITE));
        // Gold scalloped valance & glowing arched entrance
        l.rect(cx - r * 0.76, cy + r * 0.06, cx + r * 0.76, cy + r * 0.2, t(GOLD_HI));
        l.poly([[cx - r * 0.22, cy + r * 0.7], [cx, cy + r * 0.26], [cx + r * 0.22, cy + r * 0.7]], t(AMBER));
        // Sky-cyan pennant flag atop peak
        l.line(cx, cy - r * 0.64, cx, cy - r * 0.9, t(GOLD));
        l.poly([[cx, cy - r * 0.9], [cx + r * 0.34, cy - r * 0.78], [cx, cy - r * 0.66]], t(CYAN));
      }, { rim: 0.18 });
      break;
    }

    case 'teacup': {
      const t = (col: RGB): RGB => (completed ? col : mix(col, SILVER, 0.36));
      // Ornate porcelain sky-blue teacup on saucer with golden star & curling steam
      c.obj((l) => {
        // Saucer
        l.ellipse(cx, cy + r * 0.62, r * 0.76, r * 0.18, t(PAPER));
        // Loop handle right
        l.ring(cx + r * 0.56, cy + r * 0.16, r * 0.14, r * 0.28, t(GOLD_HI));
        // Porcelain teacup bowl
        l.arc(cx - r * 0.04, cy - r * 0.04, 0, r * 0.62, 0, Math.PI, rgrad(cx - r * 0.24, cy + r * 0.06, r * 0.7, [WHITE, t(SKY), t(SAPPHIRE)]));
        // Rose-tea rim ellipse
        l.ellipse(cx - r * 0.04, cy - r * 0.04, r * 0.62, r * 0.16, t(PINK));
        // Golden star emblem on cup
        l.star(cx - r * 0.04, cy + r * 0.28, r * 0.2, r * 0.09, t(GOLD_HI));
        // Curling lavender-white steam wisps
        l.stroke([[cx - r * 0.2, cy - r * 0.24], [cx - r * 0.3, cy - r * 0.5], [cx - r * 0.12, cy - r * 0.72]], Math.max(1, r * 0.07), WHITE);
        l.stroke([[cx + r * 0.16, cy - r * 0.24], [cx + r * 0.26, cy - r * 0.48], [cx + r * 0.12, cy - r * 0.68]], Math.max(1, r * 0.06), t(LAVENDER));
      }, { rim: 0.18 });
      break;
    }

    case 'pumpkin': {
      const t = (col: RGB): RGB => (completed ? col : mix(col, SILVER, 0.36));
      // Glowing ribbed harvest pumpkin with emerald curly vine & gold window glint
      c.obj((l) => {
        // Curly emerald vine stem
        l.stroke([[cx, cy - r * 0.38], [cx + r * 0.12, cy - r * 0.74], [cx + r * 0.36, cy - r * 0.68]], Math.max(1.2, r * 0.1), t(EMERALD));
        // Ribbed glowing tangerine lobes
        l.ellipse(cx - r * 0.34, cy + r * 0.14, r * 0.42, r * 0.52, t(CORAL));
        l.ellipse(cx + r * 0.34, cy + r * 0.14, r * 0.42, r * 0.52, t(CORAL));
        l.ellipse(cx, cy + r * 0.14, r * 0.38, r * 0.56, rgrad(cx - r * 0.12, cy - r * 0.08, r * 0.62, [t(GOLD_HI), t(TANGERINE), t(CORAL)]));
        // Glowing golden star-coach window
        l.rrect(cx - r * 0.18, cy - r * 0.04, cx + r * 0.18, cy + r * 0.32, r * 0.1, WHITE);
      }, { rim: 0.18 });
      break;
    }

    case 'sunflower': {
      const t = (col: RGB): RGB => (completed ? col : mix(col, SILVER, 0.36));
      // Radiant golden sunflower with plum-violet seed disc & twin emerald leaves
      c.obj((l) => {
        // Stem & leaves
        l.capsule(cx, cy + r * 0.2, cx, cy + r * 0.84, r * 0.1, t(JADE));
        l.ellipse(cx - r * 0.32, cy + r * 0.64, r * 0.26, r * 0.12, t(EMERALD), -0.4);
        l.ellipse(cx + r * 0.32, cy + r * 0.64, r * 0.26, r * 0.12, t(EMERALD), 0.4);
        // Alternating golden petals
        const sy = cy - r * 0.12;
        for (let i = 0; i < 10; i++) {
          const a = (i * Math.PI) / 5;
          l.ellipse(cx + Math.cos(a) * r * 0.44, sy + Math.sin(a) * r * 0.44, r * 0.24, r * 0.11, i % 2 === 0 ? t(GOLD_HI) : t(AMBER), a);
        }
        // Rich plum seed center with gold sparkle dots
        l.disc(cx, sy, r * 0.32, rgrad(cx - r * 0.1, sy - r * 0.1, r * 0.38, [t(PLUM), INDIGO]));
        l.dot(cx - r * 0.1, sy - r * 0.08, t(GOLD_HI));
        l.dot(cx + r * 0.1, sy - r * 0.04, t(GOLD_HI));
        l.dot(cx, sy + r * 0.1, WHITE);
      }, { rim: 0.18 });
      break;
    }

    case 'arcade': {
      const t = (col: RGB): RGB => (completed ? col : mix(col, SILVER, 0.36));
      // Retro-cute neon pixel arcade cabinet with glowing heart screen & joystick
      c.obj((l) => {
        // Cabinet hull
        l.rrect(cx - r * 0.54, cy - r * 0.78, cx + r * 0.54, cy + r * 0.78, r * 0.12, vgrad(cy - r * 0.78, cy + r * 0.78, [t(VIOLET), MIDNIGHT]));
        // Glowing neon marquee top
        l.rrect(cx - r * 0.46, cy - r * 0.68, cx + r * 0.46, cy - r * 0.46, r * 0.06, lgrad(cx - r * 0.46, cy, cx + r * 0.46, cy, [t(ROSE), t(GOLD_HI), t(CYAN)]));
        // Dark screen bezel & pixel heart
        l.rrect(cx - r * 0.42, cy - r * 0.38, cx + r * 0.42, cy + r * 0.18, r * 0.08, INDIGO);
        l.heart(cx, cy - r * 0.08, r * 0.24, t(ROSE));
        // Control deck + joystick ball & buttons
        l.rrect(cx - r * 0.6, cy + r * 0.24, cx + r * 0.6, cy + r * 0.44, r * 0.06, t(ROSE));
        l.disc(cx - r * 0.28, cy + r * 0.24, Math.max(1.2, r * 0.12), t(GOLD_HI));
        l.dot(cx + r * 0.16, cy + r * 0.34, t(CYAN));
        l.dot(cx + r * 0.34, cy + r * 0.34, WHITE);
      }, { rim: 0.18 });
      break;
    }

    case 'dragon': {
      const t = (col: RGB): RGB => (completed ? col : mix(col, SILVER, 0.36));
      // Friendly coiled jade cloud-dragon head & whiskered neck with golden pearl
      c.obj((l) => {
        // Coiling jade-emerald body
        l.stroke([
          [cx - r * 0.68, cy + r * 0.54],
          [cx - r * 0.26, cy + r * 0.28],
          [cx + r * 0.14, cy + r * 0.52],
          [cx + r * 0.42, cy + r * 0.1],
          [cx + r * 0.1, cy - r * 0.22],
        ], r * 0.16, vgrad(cy - r * 0.3, cy + r * 0.6, [t(MINT), t(EMERALD), t(JADE)]), r * 0.22);
        // Friendly dragon head & snout
        l.ellipse(cx + r * 0.04, cy - r * 0.24, r * 0.34, r * 0.24, t(EMERALD));
        // Golden antlers & flowing whisker
        l.line(cx + r * 0.16, cy - r * 0.4, cx + r * 0.38, cy - r * 0.72, t(GOLD_HI));
        l.line(cx - r * 0.04, cy - r * 0.42, cx + r * 0.08, cy - r * 0.74, t(GOLD_HI));
        // Cute eye & floating golden sky-pearl
        l.disc(cx - r * 0.08, cy - r * 0.28, Math.max(1, r * 0.1), INK);
        l.dot(cx - r * 0.1, cy - r * 0.31, WHITE);
        l.disc(cx - r * 0.54, cy - r * 0.34, r * 0.2, rgrad(cx - r * 0.58, cy - r * 0.38, r * 0.22, [WHITE, t(GOLD_HI), t(AMBER)]));
      }, { rim: 0.18 });
      break;
    }

    case 'lotus': {
      const t = (col: RGB): RGB => (completed ? col : mix(col, SILVER, 0.36));
      // Sacred blooming golden & rose Star-Nile lotus floating on lapis ripple
      c.obj((l) => {
        // Lapis water ripple base
        l.ellipse(cx, cy + r * 0.56, r * 0.82, r * 0.18, t(SAPPHIRE));
        // Outer rose-pink upturned petals
        l.ellipse(cx - r * 0.48, cy + r * 0.18, r * 0.38, r * 0.18, t(ROSE), -0.32);
        l.ellipse(cx + r * 0.48, cy + r * 0.18, r * 0.38, r * 0.18, t(ROSE), 0.32);
        // Mid golden petals
        l.ellipse(cx - r * 0.26, cy - r * 0.02, r * 0.36, r * 0.18, t(GOLD_HI), -0.78);
        l.ellipse(cx + r * 0.26, cy - r * 0.02, r * 0.36, r * 0.18, t(GOLD_HI), 0.78);
        // Center radiant white-gold petal spire
        l.ellipse(cx, cy - r * 0.16, r * 0.22, r * 0.46, vgrad(cy - r * 0.62, cy + r * 0.3, [WHITE, t(GOLD_HI), t(PINK)]));
      }, { rim: 0.18 });
      break;
    }

    case 'portal': {
      const t = (col: RGB): RGB => (completed ? col : mix(col, SILVER, 0.36));
      // Swirling prismatic multiverse star-portal framed in burnished gold
      c.obj((l) => {
        l.disc(cx, cy, r * 0.8, lgrad(cx - r * 0.8, cy - r * 0.8, cx + r * 0.8, cy + r * 0.8, [t(GOLD_HI), t(GOLD), t(GOLD_LO)]));
        l.disc(cx, cy, r * 0.62, t(VIOLET));
        l.ring(cx, cy, r * 0.34, r * 0.54, t(ROSE));
        l.ring(cx, cy, r * 0.16, r * 0.36, t(CYAN));
        l.star(cx, cy, r * 0.34, r * 0.14, WHITE, 4);
      }, { rim: 0.18 });
      c.sparkle(cx - r * 0.62, cy - r * 0.56, 1, t(GOLD_HI), WHITE);
      c.sparkle(cx + r * 0.62, cy + r * 0.54, 1, t(CYAN), WHITE);
      break;
    }

    case 'lantern': {
      const t = (col: RGB): RGB => (completed ? col : mix(col, SILVER, 0.36));
      // Floating vermilion & burnished-gold sky paper lantern with silk tassel
      c.obj((l) => {
        // Silk tassel dangling below
        l.line(cx, cy + r * 0.56, cx, cy + r * 0.88, t(GOLD_HI));
        l.disc(cx, cy + r * 0.72, Math.max(1.1, r * 0.12), t(ROSE));
        // Glowing ribbed paper lantern body
        l.ellipse(cx, cy - r * 0.04, r * 0.58, r * 0.62, rgrad(cx, cy - r * 0.04, r * 0.66, [WHITE, t(GOLD_HI), t(CORAL), t(RUBY)]));
        // Gilded top & bottom caps
        l.rrect(cx - r * 0.34, cy - r * 0.76, cx + r * 0.34, cy - r * 0.56, 1, t(GOLD));
        l.rrect(cx - r * 0.28, cy + r * 0.48, cx + r * 0.28, cy + r * 0.62, 1, t(GOLD));
        // Inner curved rib arcs
        l.arc(cx - r * 0.14, cy - r * 0.04, r * 0.26, r * 0.34, -1.1, 1.1, t(GOLD_LO));
        l.arc(cx + r * 0.14, cy - r * 0.04, r * 0.26, r * 0.34, Math.PI - 1.1, Math.PI + 1.1, t(GOLD_LO));
      }, { rim: 0.18 });
      break;
    }
  }

  // Celebratory completed gold star seal in upper-right corner!
  if (completed) {
    c.obj((l) => {
      l.star(cx + s * 0.54, cy - s * 0.54, Math.max(2.6, s * 0.32), Math.max(1.2, s * 0.15), GOLD_HI);
    }, { rim: 0.1 });
    c.sparkle(cx - s * 0.58, cy - s * 0.52, 1, WHITE, GOLD_HI);
  }
}

/** Draw any of the 42 UiSpriteIds onto a Canvas of size lw x lh. */
export function drawUiSprite(c: Canvas, id: UiSpriteId, lw: number, lh: number): void {
  const cx = lw * 0.5;
  const cy = lh * 0.5;
  const s = Math.min(lw, lh) * 0.46;

  // Delegate all 14 quest_* sprites cleanly to drawQuestSilhouette
  if (id.startsWith('quest_')) {
    const quest = id.slice(6) as HeroQuestId;
    drawQuestSilhouette(c, quest, cx, cy, s, false);
    return;
  }

  switch (id) {
    case 'tool_pencil':
      drawBrushIcon(c, 'standard', cx, cy, s * 1.02);
      break;

    case 'tool_wand': {
      // Starlight Magic Wand: midnight-gold staff crowned with radiant 5-point burnished-gold star
      c.glow(cx + s * 0.26, cy - s * 0.26, s * 0.72, GOLD_HI, 0.42);
      c.obj((l) => {
        l.capsule(cx - s * 0.76, cy + s * 0.76, cx + s * 0.14, cy - s * 0.14, Math.max(1.2, s * 0.13), lgrad(cx - s * 0.7, cy + s * 0.7, cx + s * 0.2, cy - s * 0.2, [INDIGO, VIOLET, GOLD]));
        l.star(cx + s * 0.28, cy - s * 0.28, s * 0.54, s * 0.24, rgrad(cx + s * 0.2, cy - s * 0.36, s * 0.6, [WHITE, GOLD_HI, GOLD, GOLD_LO]));
      }, { rim: 0.2 });
      c.sparkle(cx - s * 0.46, cy - s * 0.34, 1, WHITE, CYAN);
      c.sparkle(cx + s * 0.58, cy + s * 0.34, 1, GOLD_HI, WHITE);
      break;
    }

    case 'tool_lantern': {
      // Firefly Hint Lantern: ornate gold-framed glass lantern glowing with warm firefly flame
      c.glow(cx, cy + s * 0.08, s * 0.88, AMBER, 0.48);
      c.obj((l) => {
        // Top hanging ring & peaked cap
        l.ring(cx, cy - s * 0.72, Math.max(1, s * 0.12), Math.max(2, s * 0.24), GOLD);
        l.poly([[cx - s * 0.46, cy - s * 0.34], [cx, cy - s * 0.64], [cx + s * 0.46, cy - s * 0.34]], GOLD);
        // Glowing warm glass chamber
        l.rrect(cx - s * 0.44, cy - s * 0.34, cx + s * 0.44, cy + s * 0.54, s * 0.14, rgrad(cx, cy + s * 0.08, s * 0.56, [WHITE, GOLD_HI, AMBER, rgb('#d9682b')]));
        // Vertical gold mullions
        l.line(cx - s * 0.42, cy - s * 0.34, cx - s * 0.42, cy + s * 0.54, GOLD_LO);
        l.line(cx + s * 0.42, cy - s * 0.34, cx + s * 0.42, cy + s * 0.54, GOLD_LO);
        // Base plinth
        l.rrect(cx - s * 0.52, cy + s * 0.52, cx + s * 0.52, cy + s * 0.76, 1, lgrad(cx - s * 0.5, cy, cx + s * 0.5, cy, [GOLD_HI, GOLD, GOLD_LO]));
        // Glowing firefly orb inside
        l.disc(cx, cy + s * 0.12, Math.max(1.5, s * 0.18), WHITE);
      }, { rim: 0.18 });
      c.sparkle(cx - s * 0.66, cy - s * 0.44, 1, GOLD_HI, WHITE);
      c.sparkle(cx + s * 0.68, cy - s * 0.12, 1, WHITE, GOLD_HI);
      break;
    }

    case 'tool_crystal_jar': {
      // Prism Crystal Gem Jar: starry glass apothecary jar filled with glowing faceted gems
      c.glow(cx, cy + s * 0.1, s * 0.82, CYAN, 0.36);
      c.obj((l) => {
        // Gold-rimmed cork stopper
        l.rrect(cx - s * 0.28, cy - s * 0.84, cx + s * 0.28, cy - s * 0.54, 1, vgrad(cy - s * 0.84, cy - s * 0.54, [GOLD_HI, GOLD, GOLD_LO]));
        // Jar neck ring
        l.rrect(cx - s * 0.4, cy - s * 0.58, cx + s * 0.4, cy - s * 0.4, 1, GOLD);
        // Rounded glass jar body
        l.rrect(cx - s * 0.58, cy - s * 0.42, cx + s * 0.58, cy + s * 0.78, s * 0.26, vgrad(cy - s * 0.4, cy + s * 0.8, [rgb('#2c2266'), MIDNIGHT]));
        // Glowing heaped prism gems inside jar
        l.poly([[cx - s * 0.28, cy + s * 0.12], [cx - s * 0.04, cy + s * 0.36], [cx - s * 0.28, cy + s * 0.62], [cx - s * 0.48, cy + s * 0.36]], CYAN);
        l.poly([[cx + s * 0.22, cy + s * 0.16], [cx + s * 0.46, cy + s * 0.4], [cx + s * 0.22, cy + s * 0.64], [cx, cy + s * 0.4]], ROSE);
        l.poly([[cx, cy - s * 0.14], [cx + s * 0.24, cy + s * 0.14], [cx, cy + s * 0.42], [cx - s * 0.24, cy + s * 0.14]], GOLD_HI);
        // Glossy glass highlight arc
        l.line(cx - s * 0.44, cy - s * 0.22, cx - s * 0.44, cy + s * 0.38, WHITE);
      }, { rim: 0.18 });
      c.sparkle(cx + s * 0.46, cy - s * 0.64, 1, WHITE, GOLD_HI);
      break;
    }

    case 'tool_audio_0':
    case 'tool_audio_1':
    case 'tool_audio_2':
    case 'tool_audio_3': {
      const level = Number(id.slice(-1));
      // Speaker body (burnished gold & midnight indigo)
      c.obj((l) => {
        l.rrect(cx - s * 0.78, cy - s * 0.28, cx - s * 0.42, cy + s * 0.28, 1, GOLD);
        l.poly([
          [cx - s * 0.44, cy - s * 0.28],
          [cx - s * 0.02, cy - s * 0.66],
          [cx - s * 0.02, cy + s * 0.66],
          [cx - s * 0.44, cy + s * 0.28],
        ], lgrad(cx - s * 0.5, cy - s * 0.6, cx, cy + s * 0.6, [GOLD_HI, GOLD, GOLD_LO]));
      }, { rim: 0.18 });

      if (level === 0) {
        // Crisp coral-rose X slash for muted
        c.obj((l) => {
          l.capsule(cx + s * 0.2, cy - s * 0.36, cx + s * 0.74, cy + s * 0.36, Math.max(1.1, s * 0.12), ROSE);
          l.capsule(cx + s * 0.74, cy - s * 0.36, cx + s * 0.2, cy + s * 0.36, Math.max(1.1, s * 0.12), ROSE);
        }, { rim: 0.14 });
      } else {
        const waveCols: RGB[] = [GOLD_HI, CYAN, PINK];
        for (let w = 0; w < level; w++) {
          const r0 = s * (0.28 + w * 0.26);
          const r1 = r0 + Math.max(1.3, s * 0.14);
          c.obj((l) => {
            l.arc(cx - s * 0.08, cy, r0, r1, -0.82, 0.82, waveCols[w] as RGB);
          }, { rim: 0.1 });
        }
        if (level === 3) c.sparkle(cx + s * 0.62, cy - s * 0.62, 1, WHITE, GOLD_HI);
      }
      break;
    }

    case 'tool_close': {
      drawCloisonneDisc(c, cx, cy, s * 0.9, INDIGO, MIDNIGHT, GOLD);
      c.obj((l) => {
        l.capsule(cx - s * 0.44, cy - s * 0.44, cx + s * 0.44, cy + s * 0.44, Math.max(1.3, s * 0.15), GOLD_HI);
        l.capsule(cx + s * 0.44, cy - s * 0.44, cx - s * 0.44, cy + s * 0.44, Math.max(1.3, s * 0.15), GOLD_HI);
      }, { rim: 0.15 });
      break;
    }

    case 'tool_back': {
      drawCloisonneDisc(c, cx, cy, s * 0.9, INDIGO, MIDNIGHT, GOLD);
      c.obj((l) => {
        l.poly([
          [cx - s * 0.56, cy],
          [cx - s * 0.04, cy - s * 0.46],
          [cx - s * 0.04, cy - s * 0.16],
          [cx + s * 0.52, cy - s * 0.16],
          [cx + s * 0.52, cy + s * 0.16],
          [cx - s * 0.04, cy + s * 0.16],
          [cx - s * 0.04, cy + s * 0.46],
        ], lgrad(cx - s * 0.5, cy - s * 0.4, cx + s * 0.5, cy + s * 0.4, [GOLD_HI, GOLD, GOLD_LO]));
      }, { rim: 0.16 });
      break;
    }

    case 'tool_prev': {
      drawCloisonneDisc(c, cx, cy, s * 0.9, INDIGO, MIDNIGHT, GOLD);
      c.obj((l) => {
        l.poly([
          [cx - s * 0.46, cy],
          [cx + s * 0.28, cy - s * 0.52],
          [cx + s * 0.44, cy - s * 0.34],
          [cx - s * 0.08, cy],
          [cx + s * 0.44, cy + s * 0.34],
          [cx + s * 0.28, cy + s * 0.52],
        ], GOLD_HI);
      }, { rim: 0.15 });
      break;
    }

    case 'tool_next': {
      drawCloisonneDisc(c, cx, cy, s * 0.9, INDIGO, MIDNIGHT, GOLD);
      c.obj((l) => {
        l.poly([
          [cx + s * 0.46, cy],
          [cx - s * 0.28, cy - s * 0.52],
          [cx - s * 0.44, cy - s * 0.34],
          [cx + s * 0.08, cy],
          [cx - s * 0.44, cy + s * 0.34],
          [cx - s * 0.28, cy + s * 0.52],
        ], GOLD_HI);
      }, { rim: 0.15 });
      break;
    }

    case 'tool_postcard': {
      // Illustrated starry postcard envelope with rose-gold wax star seal
      c.obj((l) => {
        l.rrect(cx - s * 0.84, cy - s * 0.58, cx + s * 0.84, cy + s * 0.58, s * 0.12, vgrad(cy - s * 0.58, cy + s * 0.58, [PAPER, rgb('#ebdcb8')]));
        // Envelope V-flap
        l.polyline([
          [cx - s * 0.78, cy - s * 0.52],
          [cx, cy + s * 0.08],
          [cx + s * 0.78, cy - s * 0.52],
        ], GOLD_LO);
        // Mini stamp upper-right
        l.rect(cx + s * 0.32, cy - s * 0.44, cx + s * 0.68, cy - s * 0.12, VIOLET);
        // Rose-gold star wax seal at center
        l.disc(cx, cy + s * 0.08, s * 0.26, ROSE);
        l.star(cx, cy + s * 0.08, s * 0.18, s * 0.08, GOLD_HI);
      }, { rim: 0.18 });
      break;
    }

    case 'tool_export': {
      // Upward gold arrow rising from gilded vault tray
      c.obj((l) => {
        l.rrect(cx - s * 0.74, cy + s * 0.28, cx + s * 0.74, cy + s * 0.72, s * 0.12, vgrad(cy + s * 0.28, cy + s * 0.72, [INDIGO, MIDNIGHT]));
        l.rect(cx - s * 0.72, cy + s * 0.28, cx + s * 0.72, cy + s * 0.42, GOLD);
        l.poly([
          [cx, cy - s * 0.82],
          [cx + s * 0.48, cy - s * 0.26],
          [cx + s * 0.2, cy - s * 0.26],
          [cx + s * 0.2, cy + s * 0.28],
          [cx - s * 0.2, cy + s * 0.28],
          [cx - s * 0.2, cy - s * 0.26],
          [cx - s * 0.48, cy - s * 0.26],
        ], lgrad(cx, cy - s * 0.8, cx, cy + s * 0.3, [WHITE, GOLD_HI, GOLD]));
      }, { rim: 0.18 });
      break;
    }

    case 'tool_import': {
      // Downward cyan-gold arrow landing into gilded vault tray
      c.obj((l) => {
        l.rrect(cx - s * 0.74, cy + s * 0.28, cx + s * 0.74, cy + s * 0.72, s * 0.12, vgrad(cy + s * 0.28, cy + s * 0.72, [INDIGO, MIDNIGHT]));
        l.rect(cx - s * 0.72, cy + s * 0.28, cx + s * 0.72, cy + s * 0.42, GOLD);
        l.poly([
          [cx, cy + s * 0.28],
          [cx + s * 0.48, cy - s * 0.28],
          [cx + s * 0.2, cy - s * 0.28],
          [cx + s * 0.2, cy - s * 0.8],
          [cx - s * 0.2, cy - s * 0.8],
          [cx - s * 0.2, cy - s * 0.28],
          [cx - s * 0.48, cy - s * 0.28],
        ], lgrad(cx, cy - s * 0.8, cx, cy + s * 0.3, [MINT, CYAN, SKY]));
      }, { rim: 0.18 });
      break;
    }

    case 'tool_star': {
      c.glow(cx, cy, s * 0.9, GOLD, 0.38);
      c.obj((l) => {
        l.star(cx, cy, s * 0.88, s * 0.42, rgrad(cx - s * 0.2, cy - s * 0.2, s * 0.95, [WHITE, GOLD_HI, GOLD, GOLD_LO]));
      }, { rim: 0.18 });
      break;
    }

    case 'tool_gem': {
      // Faceted Stardust Prism Diamond Gem
      c.glow(cx, cy, s * 0.88, CYAN, 0.4);
      c.obj((l) => {
        const top: Pt = [cx, cy - s * 0.86];
        const lft: Pt = [cx - s * 0.7, cy - s * 0.12];
        const rgt: Pt = [cx + s * 0.7, cy - s * 0.12];
        const bot: Pt = [cx, cy + s * 0.86];
        const mid: Pt = [cx, cy - s * 0.08];
        l.poly([top, lft, mid], WHITE);
        l.poly([top, mid, rgt], MINT);
        l.poly([lft, bot, mid], CYAN);
        l.poly([mid, bot, rgt], VIOLET);
        l.line(lft[0], lft[1], rgt[0], rgt[1], GOLD_HI);
      }, { rim: 0.18 });
      c.sparkle(cx - s * 0.46, cy - s * 0.56, 1, WHITE, GOLD_HI);
      break;
    }

    case 'tool_crown': {
      c.glow(cx, cy, s * 0.85, GOLD, 0.38);
      c.obj((l) => {
        l.poly([
          [cx - s * 0.72, cy + s * 0.52],
          [cx - s * 0.84, cy - s * 0.28],
          [cx - s * 0.34, cy + s * 0.06],
          [cx, cy - s * 0.64],
          [cx + s * 0.34, cy + s * 0.06],
          [cx + s * 0.84, cy - s * 0.28],
          [cx + s * 0.72, cy + s * 0.52],
        ], lgrad(cx - s * 0.8, cy - s * 0.6, cx + s * 0.8, cy + s * 0.5, [GOLD_HI, GOLD, GOLD_LO]));
        l.rrect(cx - s * 0.76, cy + s * 0.24, cx + s * 0.76, cy + s * 0.58, 1, GOLD);
        l.disc(cx, cy + s * 0.38, Math.max(1.2, s * 0.14), ROSE);
        l.dot(cx - s * 0.42, cy + s * 0.38, CYAN);
        l.dot(cx + s * 0.42, cy + s * 0.38, CYAN);
      }, { rim: 0.18 });
      break;
    }

    case 'tool_stay': {
      // Cozy artist painter palette ("Stay & Doodle") with luminous paint dabs
      c.obj((l) => {
        l.ellipse(cx, cy, s * 0.84, s * 0.72, lgrad(cx - s * 0.7, cy - s * 0.6, cx + s * 0.7, cy + s * 0.6, [GOLD_HI, GOLD, GOLD_LO]), -0.2);
        // Thumb hole cutout
        l.disc(cx + s * 0.38, cy + s * 0.24, s * 0.18, MIDNIGHT);
        // Vibrant jewel paint dabs
        l.disc(cx - s * 0.38, cy - s * 0.24, s * 0.17, ROSE);
        l.disc(cx - s * 0.02, cy - s * 0.4, s * 0.17, CYAN);
        l.disc(cx + s * 0.34, cy - s * 0.24, s * 0.16, VIOLET);
        l.disc(cx - s * 0.34, cy + s * 0.24, s * 0.17, MINT);
      }, { rim: 0.18 });
      break;
    }

    case 'tool_turn': {
      // Curled cream storybook page corner with gleaming gold forward arrow ("Turn Page")
      c.obj((l) => {
        l.rrect(cx - s * 0.76, cy - s * 0.74, cx + s * 0.58, cy + s * 0.74, s * 0.14, vgrad(cy - s * 0.7, cy + s * 0.7, [PAPER, rgb('#ebdcb8')]));
        // Curled bottom-right golden page fold
        l.poly([
          [cx + s * 0.12, cy + s * 0.74],
          [cx + s * 0.58, cy + s * 0.28],
          [cx + s * 0.12, cy + s * 0.28],
        ], GOLD);
        // Forward gold arrow across page
        l.poly([
          [cx + s * 0.84, cy - s * 0.06],
          [cx + s * 0.26, cy - s * 0.52],
          [cx + s * 0.26, cy - s * 0.22],
          [cx - s * 0.44, cy - s * 0.22],
          [cx - s * 0.44, cy + s * 0.1],
          [cx + s * 0.26, cy + s * 0.1],
          [cx + s * 0.26, cy + s * 0.4],
        ], lgrad(cx - s * 0.4, cy - s * 0.4, cx + s * 0.8, cy + s * 0.3, [GOLD_HI, GOLD, AMBER]));
      }, { rim: 0.18 });
      break;
    }

    case 'tool_settings': {
      // Ornate 8-tooth burnished-gold astrolabe gear with midnight jewel hub
      c.obj((l) => {
        for (let i = 0; i < 8; i++) {
          const a = (i * Math.PI) / 4;
          l.capsule(cx, cy, cx + Math.cos(a) * s * 0.76, cy + Math.sin(a) * s * 0.76, Math.max(1.4, s * 0.16), GOLD);
        }
        l.disc(cx, cy, s * 0.58, rgrad(cx - s * 0.15, cy - s * 0.15, s * 0.65, [GOLD_HI, GOLD, GOLD_LO]));
        l.disc(cx, cy, s * 0.28, INDIGO);
        l.dot(cx - s * 0.06, cy - s * 0.06, CYAN);
      }, { rim: 0.18 });
      break;
    }

    case 'tool_skip': {
      // Double fast-forward burnished gold chevrons
      drawCloisonneDisc(c, cx, cy, s * 0.9, INDIGO, MIDNIGHT, GOLD);
      c.obj((l) => {
        l.poly([[cx - s * 0.48, cy - s * 0.42], [cx + s * 0.02, cy], [cx - s * 0.48, cy + s * 0.42]], GOLD);
        l.poly([[cx + s * 0.04, cy - s * 0.42], [cx + s * 0.54, cy], [cx + s * 0.04, cy + s * 0.42]], GOLD_HI);
      }, { rim: 0.14 });
      break;
    }

    case 'tool_gift': {
      // Star-ribboned violet & gold gift box ("New Gift!")
      c.glow(cx, cy, s * 0.88, GOLD_HI, 0.4);
      c.obj((l) => {
        // Gift box base
        l.rrect(cx - s * 0.66, cy - s * 0.16, cx + s * 0.66, cy + s * 0.76, s * 0.12, vgrad(cy - s * 0.16, cy + s * 0.76, [VIOLET, INDIGO]));
        // Lid overhang
        l.rrect(cx - s * 0.76, cy - s * 0.44, cx + s * 0.76, cy - s * 0.08, s * 0.1, lgrad(cx - s * 0.7, cy, cx + s * 0.7, cy, [ROSE, PINK, ROSE]));
        // Crossed gold ribbons
        l.rect(cx - s * 0.16, cy - s * 0.44, cx + s * 0.16, cy + s * 0.76, GOLD);
        l.rect(cx - s * 0.66, cy + s * 0.16, cx + s * 0.66, cy + s * 0.38, GOLD);
        // Twin bow loops atop lid
        l.ellipse(cx - s * 0.28, cy - s * 0.62, s * 0.26, s * 0.18, GOLD_HI, -0.3);
        l.ellipse(cx + s * 0.28, cy - s * 0.62, s * 0.26, s * 0.18, GOLD_HI, 0.3);
        l.disc(cx, cy - s * 0.54, s * 0.15, WHITE);
      }, { rim: 0.18 });
      break;
    }

    case 'tool_hub_paintbox': {
      // Open midnight-gold watercolor paintbox tray with 4 glowing pigment pans + mini brush
      c.obj((l) => {
        l.rrect(cx - s * 0.84, cy - s * 0.56, cx + s * 0.84, cy + s * 0.66, s * 0.16, vgrad(cy - s * 0.56, cy + s * 0.66, [INDIGO, MIDNIGHT]));
        l.rrect(cx - s * 0.74, cy - s * 0.46, cx + s * 0.74, cy + s * 0.56, s * 0.1, GOLD_LO);
        l.rrect(cx - s * 0.66, cy - s * 0.38, cx + s * 0.66, cy + s * 0.48, s * 0.08, MIDNIGHT);
        // 4 jewel pigment pans
        l.rrect(cx - s * 0.56, cy - s * 0.28, cx - s * 0.06, cy + s * 0.06, 1, ROSE);
        l.rrect(cx + s * 0.06, cy - s * 0.28, cx + s * 0.56, cy + s * 0.06, 1, CYAN);
        l.rrect(cx - s * 0.56, cy + s * 0.12, cx - s * 0.06, cy + s * 0.42, 1, GOLD_HI);
        l.rrect(cx + s * 0.06, cy + s * 0.12, cx + s * 0.56, cy + s * 0.42, 1, VIOLET);
        // Mini brush resting across top edge
        l.capsule(cx - s * 0.66, cy - s * 0.66, cx + s * 0.54, cy - s * 0.66, Math.max(1.1, s * 0.1), GOLD);
        l.disc(cx + s * 0.62, cy - s * 0.66, Math.max(1.4, s * 0.14), MINT);
      }, { rim: 0.18 });
      break;
    }

    case 'tool_hub_wardrobe': {
      // Starry golden hanger holding a billowing cosmic cape with star clasp
      c.obj((l) => {
        // Golden hanger hook & shoulders
        l.arc(cx, cy - s * 0.64, Math.max(1, s * 0.1), Math.max(2, s * 0.22), Math.PI, Math.PI * 2.2, GOLD_HI);
        l.polyline([[cx - s * 0.62, cy - s * 0.26], [cx, cy - s * 0.52], [cx + s * 0.62, cy - s * 0.26]], GOLD);
        // Flowing starry cosmic cloak
        l.poly([
          [cx - s * 0.52, cy - s * 0.28],
          [cx + s * 0.52, cy - s * 0.28],
          [cx + s * 0.82, cy + s * 0.72],
          [cx, cy + s * 0.56],
          [cx - s * 0.82, cy + s * 0.72],
        ], vgrad(cy - s * 0.3, cy + s * 0.72, [ROSE, VIOLET, INDIGO]));
        // Gold star clasp
        l.star(cx, cy - s * 0.16, s * 0.26, s * 0.12, GOLD_HI);
      }, { rim: 0.18 });
      break;
    }

    case 'tool_hub_bookshelf': {
      // Trio of gilded hardcover storybooks standing neatly on a gold shelf
      c.obj((l) => {
        l.rrect(cx - s * 0.84, cy + s * 0.54, cx + s * 0.84, cy + s * 0.78, 1, GOLD);
        // Left ruby-rose storybook
        l.rrect(cx - s * 0.74, cy - s * 0.62, cx - s * 0.26, cy + s * 0.56, 1, vgrad(cy - s * 0.6, cy + s * 0.56, [PINK, ROSE]));
        l.rect(cx - s * 0.72, cy - s * 0.4, cx - s * 0.28, cy - s * 0.26, GOLD_HI);
        // Center tall indigo-violet storybook
        l.rrect(cx - s * 0.24, cy - s * 0.78, cx + s * 0.24, cy + s * 0.56, 1, vgrad(cy - s * 0.78, cy + s * 0.56, [VIOLET, INDIGO]));
        l.star(cx, cy - s * 0.16, s * 0.16, s * 0.08, GOLD_HI);
        // Right teal-cyan storybook leaning slightly
        l.poly([
          [cx + s * 0.26, cy - s * 0.52],
          [cx + s * 0.68, cy - s * 0.6],
          [cx + s * 0.8, cy + s * 0.56],
          [cx + s * 0.26, cy + s * 0.56],
        ], vgrad(cy - s * 0.6, cy + s * 0.56, [MINT, CYAN]));
      }, { rim: 0.18 });
      break;
    }

    case 'tool_hub_trinkets': {
      // Ornate midnight-velvet & gold treasure trinket box gleaming with a golden star clasp
      c.glow(cx, cy - s * 0.2, s * 0.75, GOLD, 0.35);
      c.obj((l) => {
        // Domed gilded treasure chest lid
        l.ellipse(cx, cy - s * 0.14, s * 0.76, s * 0.44, vgrad(cy - s * 0.58, cy + s * 0.1, [VIOLET, INDIGO]));
        // Chest body
        l.rrect(cx - s * 0.76, cy - s * 0.14, cx + s * 0.76, cy + s * 0.72, s * 0.12, vgrad(cy - s * 0.14, cy + s * 0.72, [INDIGO, MIDNIGHT]));
        // Gold bands & star lock
        l.rect(cx - s * 0.76, cy - s * 0.2, cx + s * 0.76, cy - s * 0.04, GOLD);
        l.rect(cx - s * 0.48, cy - s * 0.5, cx - s * 0.32, cy + s * 0.72, GOLD);
        l.rect(cx + s * 0.32, cy - s * 0.5, cx + s * 0.48, cy + s * 0.72, GOLD);
        l.star(cx, cy - s * 0.06, s * 0.28, s * 0.13, GOLD_HI);
      }, { rim: 0.18 });
      break;
    }

    case 'tool_voyage_seal': {
      // Circular burnished-gold astrolabe chapter voyage compass seal
      drawCloisonneDisc(c, cx, cy, s * 0.92, rgb('#362070'), MIDNIGHT, GOLD);
      c.obj((l) => {
        l.ring(cx, cy, s * 0.52, s * 0.64, GOLD);
        l.star(cx, cy, s * 0.62, s * 0.22, rgrad(cx - s * 0.1, cy - s * 0.1, s * 0.65, [WHITE, GOLD_HI, GOLD]), 4);
        l.disc(cx, cy, s * 0.18, CYAN);
        l.dot(cx - 1, cy - 1, WHITE);
      }, { rim: 0.14 });
      break;
    }

    case 'tool_atlas': {
      // Golden astrolabe-compass / ringed multiverse globe with orbiting jewel realms
      c.glow(cx, cy, s * 0.92, CYAN, 0.36);
      c.obj((l) => {
        // Outer tilted burnished-gold armillary ring
        l.ering(cx, cy, s * 0.94, s * 0.38, 0.68, lgrad(cx - s * 0.9, cy - s * 0.4, cx + s * 0.9, cy + s * 0.4, [GOLD_HI, GOLD, GOLD_LO]), -0.42);
        // Deep sapphire multiverse globe core
        l.disc(cx, cy, s * 0.62, rgrad(cx - s * 0.18, cy - s * 0.18, s * 0.72, [SKY, SAPPHIRE, INDIGO, MIDNIGHT]));
        // Golden meridian & equator lines across globe
        l.ring(cx, cy, s * 0.5, s * 0.62, GOLD);
        l.line(cx - s * 0.54, cy, cx + s * 0.54, cy, GOLD_HI);
        l.line(cx, cy - s * 0.54, cx, cy + s * 0.54, GOLD_HI);
        // Center radiant compass star
        l.star(cx, cy, s * 0.38, s * 0.15, WHITE, 4);
        // Front tilted armillary arc sweeping over globe
        l.shape(cx - s, cy - s * 0.7, cx + s, cy + s * 0.7, (x, y) => {
          const dx = x - cx;
          const dy = y - cy;
          const co = Math.cos(-0.42);
          const si = Math.sin(-0.42);
          const u = (dx * co + dy * si) / (s * 0.94);
          const v = (-dx * si + dy * co) / (s * 0.38);
          return v > 0 && u * u + v * v <= 1 && u * u + v * v >= 0.68 * 0.68;
        }, GOLD_HI);
        // Tiny orbiting universe gems
        l.disc(cx - s * 0.76, cy + s * 0.34, Math.max(1.2, s * 0.14), ROSE);
        l.disc(cx + s * 0.76, cy - s * 0.34, Math.max(1.2, s * 0.14), MINT);
      }, { rim: 0.18 });
      c.sparkle(cx - s * 0.56, cy - s * 0.62, 1, WHITE, GOLD_HI);
      break;
    }

    case 'tool_lock': {
      // Ornate burnished-gold padlock with midnight enameled keyhole plaque
      c.glow(cx, cy + s * 0.1, s * 0.84, GOLD, 0.34);
      c.obj((l) => {
        // Arched golden shackle
        l.arc(cx, cy - s * 0.24, s * 0.3, s * 0.52, Math.PI, Math.PI * 2, lgrad(cx - s * 0.5, cy - s * 0.76, cx + s * 0.5, cy, [GOLD_HI, GOLD, GOLD_LO]));
        l.rect(cx - s * 0.52, cy - s * 0.26, cx - s * 0.3, cy - s * 0.04, GOLD);
        l.rect(cx + s * 0.3, cy - s * 0.26, cx + s * 0.52, cy - s * 0.04, GOLD_LO);
        // Beveled burnished-gold padlock shield body
        l.rrect(cx - s * 0.68, cy - s * 0.08, cx + s * 0.68, cy + s * 0.82, s * 0.2, lgrad(cx - s * 0.6, cy - s * 0.1, cx + s * 0.6, cy + s * 0.8, [WHITE, GOLD_HI, GOLD, GOLD_LO]));
        // Midnight enameled keyhole cartouche
        l.rrect(cx - s * 0.44, cy + s * 0.08, cx + s * 0.44, cy + s * 0.66, s * 0.14, MIDNIGHT);
        // Keyhole silhouette
        l.disc(cx, cy + s * 0.3, Math.max(1.2, s * 0.15), GOLD_HI);
        l.poly([[cx - s * 0.09, cy + s * 0.36], [cx + s * 0.09, cy + s * 0.36], [cx + s * 0.14, cy + s * 0.58], [cx - s * 0.14, cy + s * 0.58]], GOLD);
      }, { rim: 0.18 });
      c.sparkle(cx - s * 0.5, cy - s * 0.56, 1, WHITE, GOLD_HI);
      break;
    }

    case 'tool_check': {
      // Radiant celestial star-checkmark medallion in emerald-mint & burnished gold
      c.glow(cx, cy, s * 0.88, EMERALD, 0.38);
      drawCloisonneDisc(c, cx, cy, s * 0.9, rgb('#1c6b63'), rgb('#112c47'), GOLD_HI);
      c.obj((l) => {
        l.stroke([
          [cx - s * 0.48, cy + s * 0.04],
          [cx - s * 0.12, cy + s * 0.42],
          [cx + s * 0.52, cy - s * 0.38],
        ], Math.max(1.5, s * 0.17), lgrad(cx - s * 0.5, cy, cx + s * 0.5, cy - s * 0.4, [MINT, WHITE, GOLD_HI]), Math.max(1.5, s * 0.17), false);
      }, { rim: 0.16 });
      c.sparkle(cx + s * 0.54, cy - s * 0.54, 1, WHITE, GOLD_HI);
      break;
    }
  }
}

/** Integer-scale helper ensuring razor-sharp pixel blocks at 24, 32, 48, 64 or any size. */
function renderSquare(draw: (c: Canvas, lw: number, lh: number) => void, size: number): PixelImage {
  const S = Math.max(8, Math.floor(size));
  let base = S;
  let k = 1;
  if (S > 32) {
    if (S % 24 === 0) {
      base = 24;
      k = S / 24;
    } else if (S % 32 === 0) {
      base = 32;
      k = S / 32;
    } else {
      k = Math.max(1, Math.round(S / 24));
      base = Math.max(16, Math.ceil(S / k));
    }
  }
  const c = new Canvas(base, base);
  draw(c, base, base);
  return k === 1 ? { width: S, height: S, data: c.data } : upscale(c, k, S, S);
}

export function drawBrushCanvas(brush: BrushId, lw: number, lh: number): Canvas {
  const c = new Canvas(lw, lh);
  const s = Math.min(lw, lh) * 0.44;
  drawBrushIcon(c, brush, lw * 0.5, lh * 0.5, s);
  return c;
}

export function drawQuestMedallionCanvas(quest: HeroQuestId, completed: boolean, lw: number, lh: number): Canvas {
  const c = new Canvas(lw, lh);
  const s = Math.min(lw, lh) * 0.46;
  drawQuestSilhouette(c, quest, lw * 0.5, lh * 0.5, s, completed);
  return c;
}

export function drawUiSpriteCanvas(id: UiSpriteId, lw: number, lh: number): Canvas {
  const c = new Canvas(lw, lh);
  drawUiSprite(c, id, lw, lh);
  return c;
}

export function createUiAtlas(): UiPixelSpriteAtlas {
  const cache = new Map<string, PixelImage>();
  const get = (k: string, build: () => PixelImage): PixelImage => {
    let hit = cache.get(k);
    if (!hit) {
      hit = build();
      cache.set(k, hit);
    }
    return { width: hit.width, height: hit.height, data: new Uint8ClampedArray(hit.data) };
  };

  return {
    sprite(id: UiSpriteId, size: 24 | 32 | 48 | number): PixelImage {
      const S = Math.max(8, Math.floor(size));
      return get(`s:${id}:${S}`, () => renderSquare((c, w, h) => drawUiSprite(c, id, w, h), S));
    },
    brushIcon(brush: BrushId, size: 24 | 32 | 48 | number): PixelImage {
      const S = Math.max(8, Math.floor(size));
      return get(`b:${brush}:${S}`, () =>
        renderSquare((c, w, h) => drawBrushIcon(c, brush, w * 0.5, h * 0.5, Math.min(w, h) * 0.44), S),
      );
    },
    questThumbnail(quest: HeroQuestId, size: 24 | 32 | 48 | number, completed = false): PixelImage {
      const S = Math.max(8, Math.floor(size));
      return get(`q:${quest}:${completed ? 1 : 0}:${S}`, () =>
        renderSquare((c, w, h) => drawQuestSilhouette(c, quest, w * 0.5, h * 0.5, Math.min(w, h) * 0.46, completed), S),
      );
    },
  };
}
