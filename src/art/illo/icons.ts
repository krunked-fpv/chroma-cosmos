/**
 * Shared bold hero pixel-art icons for all 11 Brushes (standard + 10 Active) and all 10 Passive Relics
 * (used by draft cards, relic stickers, and the Hi-Bit UI sprite atlas).
 * Every icon draws centered at (cx, cy) scaled by radius `s` with crisp 1px INK outlines & rim light.
 */
import { ACTIVE_BRUSH_IDS, type BrushId, type DraftCardId, type RelicId } from '../../contracts/roguelike';
import { Canvas, CREAM, INK, light, lgrad, mix, type Pt, rgrad, rgb, type RGB, shade, vgrad, WHITE } from './canvas';

const ACTIVE_BRUSH_SET = new Set<string>(ACTIVE_BRUSH_IDS);

export function drawBrushIcon(c: Canvas, id: BrushId, cx: number, cy: number, s: number): void {
  switch (id) {
    case 'standard': {
      // Classic Enchanted Sketchbook Pencil (burnished gold ferrule, chunky indigo-violet shaft, rosy eraser, magic ribbon trail)
      const dx = 0.71;
      const dy = -0.71;
      const nx = -dy;
      const ny = dx;
      const pt = (u: number, v: number): Pt => [cx + dx * u * s + nx * v * s, cy + dy * u * s + ny * v * s];
      c.glow(cx - s * 0.25, cy + s * 0.25, s * 0.75, rgb('#eac46f'), 0.42);
      // Shimmering aurora-gold doodle stroke curling from pencil nib
      c.obj((l) => {
        l.stroke([
          [cx - s * 0.84, cy + s * 0.76],
          [cx - s * 0.36, cy + s * 0.84],
          [cx + s * 0.14, cy + s * 0.6],
        ], Math.max(1.2, s * 0.14), lgrad(cx - s * 0.85, cy + s * 0.8, cx + s * 0.15, cy + s * 0.6, [rgb('#fff3c4'), rgb('#eac46f'), rgb('#ff8fb8')]), Math.max(0.8, s * 0.08));
      }, { rim: 0.14 });
      c.obj((l) => {
        // Sharpened cream wood cone & starry indigo graphite tip (bottom-left)
        l.poly([pt(-0.86, 0), pt(-0.38, -0.3), pt(-0.38, 0.3)], CREAM);
        l.poly([pt(-0.86, 0), pt(-0.62, -0.15), pt(-0.62, 0.15)], rgb('#4d32a8'));
        // Chunky hexagonal midnight-indigo & gold-striped pencil barrel
        l.poly([pt(-0.4, -0.3), pt(0.46, -0.3), pt(0.46, 0.3), pt(-0.4, 0.3)], (x, y) => {
          const v = ((x - cx) * nx + (y - cy) * ny) / (s * 0.3);
          return v < -0.28 ? rgb('#a688ff') : v < 0.32 ? rgb('#6c5ce7') : rgb('#3d2587');
        });
        // Burnished gold ferrule band
        l.poly([pt(0.45, -0.31), pt(0.64, -0.31), pt(0.64, 0.31), pt(0.45, 0.31)], rgb('#eac46f'));
        // Rosy pink eraser end
        l.poly([pt(0.63, -0.28), pt(0.84, -0.22), pt(0.84, 0.22), pt(0.63, 0.28)], rgb('#ff8fb8'));
      }, { rim: 0.22, deep: true });
      c.sparkle(cx - s * 0.56, cy + s * 0.26, Math.max(1, Math.round(s * 0.16)), WHITE, rgb('#eac46f'));
      c.sparkle(cx + s * 0.34, cy - s * 0.66, Math.max(1, Math.round(s * 0.14)), rgb('#fff3c4'), WHITE);
      break;
    }

    case 'turboCheetah': {
      // Blazing speed lines behind the diagonal marker
      const streakCols = [rgb('#ffe66d'), rgb('#ff9f38'), rgb('#ff5c77')];
      for (let i = 0; i < 4; i++) {
        const oy = (i - 1.5) * s * 0.28;
        c.capsule(cx - s * 0.88, cy + s * 0.35 + oy, cx - s * 0.12, cy + oy * 0.4, Math.max(0.8, s * 0.05), streakCols[i % streakCols.length] as RGB, 0.6);
      }
      // Chunky cheetah-spotted marker tilted diagonally (bottom-left nib -> top-right body)
      const dx = 0.72;
      const dy = -0.69;
      const nx = -dy;
      const ny = dx;
      const pt = (u: number, v: number): Pt => [cx + dx * u * s + nx * v * s, cy + dy * u * s + ny * v * s];
      c.glow(cx - s * 0.42, cy + s * 0.42, s * 0.55, rgb('#ffbe42'), 0.45);
      // Paint swoosh coming from nib
      c.obj((l) => {
        l.stroke([
          [cx - s * 0.85, cy + s * 0.62],
          [cx - s * 0.58, cy + s * 0.68],
          [cx - s * 0.34, cy + s * 0.42],
        ], s * 0.14, lgrad(cx - s * 0.85, cy + s * 0.65, cx - s * 0.3, cy + s * 0.4, [rgb('#fff3b0'), rgb('#ff9a3c'), rgb('#ff4d6d')]), s * 0.08);
      }, { rim: 0.15 });
      // Marker barrel + collar + chisel felt nib
      c.obj((l) => {
        // Felt chisel nib (blazing gold-orange)
        l.poly([pt(-0.62, -0.1), pt(-0.36, -0.18), pt(-0.36, 0.18), pt(-0.68, 0.12)], rgb('#ffbe2e'));
        // Dark violet tapered nose cone
        l.poly([pt(-0.38, -0.2), pt(-0.18, -0.32), pt(-0.18, 0.32), pt(-0.38, 0.2)], rgb('#563499'));
        // Fat amber-orange marker barrel
        l.poly([pt(-0.19, -0.33), pt(0.58, -0.33), pt(0.58, 0.33), pt(-0.19, 0.33)], (x, y) => {
          const v = ((x - cx) * nx + (y - cy) * ny) / (s * 0.33);
          return v < -0.25 ? rgb('#ffe073') : v < 0.35 ? rgb('#ff9e36') : rgb('#d9661c');
        });
        // End cap plug (dark plum + gold band)
        l.poly([pt(0.56, -0.32), pt(0.76, -0.28), pt(0.76, 0.28), pt(0.56, 0.32)], rgb('#49277d'));
        l.poly([pt(0.46, -0.33), pt(0.56, -0.33), pt(0.56, 0.33), pt(0.46, 0.33)], rgb('#ffe46b'));
        // Bold cheetah spots along the barrel!
        const spots: Array<[number, number, number]> = [
          [0.02, -0.1, 0.11],
          [0.24, 0.09, 0.12],
          [0.34, -0.14, 0.09],
          [0.04, 0.16, 0.09],
        ];
        for (const [su, sv, sr] of spots) {
          const [sx, sy] = pt(su, sv);
          l.disc(sx, sy, Math.max(1.3, sr * s), rgb('#6e2c11'));
          l.dot(sx, sy, rgb('#ffb84d'));
        }
      }, { rim: 0.24, deep: true });
      c.sparkle(cx - s * 0.65, cy + s * 0.18, 2, WHITE, rgb('#ffe66d'));
      c.sparkle(cx + s * 0.35, cy - s * 0.68, 2, rgb('#ffe66d'), WHITE);
      break;
    }

    case 'twinTail': {
      // Two lush swirling pastel aurora ribbons flowing directly out of the twin-tipped unicorn brush!
      c.glow(cx, cy, s * 0.85, rgb('#b69cff'), 0.3);
      // Two distinct aurora S-ribbons unfurling from the brush bristles (top-right) across the frame
      c.obj((l) => {
        l.stroke([
          [cx + s * 0.34, cy - s * 0.42],
          [cx - s * 0.04, cy - s * 0.72],
          [cx - s * 0.56, cy - s * 0.52],
          [cx - s * 0.8, cy - s * 0.14],
        ], s * 0.15, lgrad(cx + s * 0.35, cy - s * 0.4, cx - s * 0.8, cy - s * 0.1, [rgb('#7fe7f0'), rgb('#a8ffcf'), rgb('#b69cff')]), s * 0.08);
      }, { rim: 0.15 });
      c.obj((l) => {
        l.stroke([
          [cx + s * 0.45, cy - s * 0.25],
          [cx + s * 0.72, cy + s * 0.2],
          [cx + s * 0.3, cy + s * 0.68],
          [cx - s * 0.28, cy + s * 0.72],
        ], s * 0.15, lgrad(cx + s * 0.45, cy - s * 0.2, cx - s * 0.3, cy + s * 0.7, [rgb('#ff85c0'), rgb('#ffd1e8'), rgb('#b69cff')]), s * 0.08);
      }, { rim: 0.15 });
      // Unicorn brush body (golden spiral unicorn horn handle bottom-left -> ferrule -> twin bristles top-right)
      c.obj((l) => {
        // Prominent golden spiral unicorn horn handle tip
        l.poly([
          [cx - s * 0.76, cy + s * 0.68],
          [cx - s * 0.28, cy + s * 0.04],
          [cx - s * 0.04, cy + s * 0.28],
        ], (x, y) => ((x + y) % 4 < 2 ? rgb('#fff3b0') : rgb('#f5b02c')));
        // Pearlescent lilac-white handle
        l.capsule(cx - s * 0.22, cy + s * 0.22, cx + s * 0.16, cy - s * 0.16, s * 0.13, vgrad(cy - s * 0.25, cy + s * 0.25, [WHITE, rgb('#e0c8ff'), rgb('#b69cff')]));
        // Gold ferrule band
        l.capsule(cx + s * 0.1, cy - s * 0.1, cx + s * 0.22, cy - s * 0.22, s * 0.15, rgb('#ffd43b'));
        // Forked twin bristles (cyan upper tip + pink lower tip)
        l.ellipse(cx + s * 0.36, cy - s * 0.44, s * 0.22, s * 0.12, rgb('#7fe7f0'), -1.1);
        l.ellipse(cx + s * 0.46, cy - s * 0.3, s * 0.22, s * 0.12, rgb('#ff8fd0'), -0.4);
        l.dot(cx + s * 0.42, cy - s * 0.54, WHITE);
        l.dot(cx + s * 0.56, cy - s * 0.34, WHITE);
      }, { rim: 0.24, deep: true });
      c.sparkle(cx - s * 0.52, cy - s * 0.58, 2, WHITE, rgb('#7fe7f0'));
      c.sparkle(cx + s * 0.58, cy + s * 0.35, 2, rgb('#ffb8eb'), WHITE);
      break;
    }

    case 'supernovaSponge': {
      // Supernova starburst rays & concentric watercolor bloom rings behind a chunky cosmic sponge stamp!
      c.glow(cx, cy, s * 1.0, rgb('#ff9ecf'), 0.42);
      // Watercolor bloom petals/splashes radiating out
      const splashCols = [rgb('#7fe7f0'), rgb('#ffd43b'), rgb('#ff7eb6'), rgb('#b69cff')];
      for (let i = 0; i < 8; i++) {
        const a = (i * Math.PI) / 4 + 0.2;
        const r = s * (i % 2 === 0 ? 0.78 : 0.65);
        const sx = cx + Math.cos(a) * r;
        const sy = cy + Math.sin(a) * r;
        c.capsule(cx, cy, sx, sy, s * 0.08, splashCols[i % splashCols.length] as RGB, s * 0.03);
        c.disc(sx, sy, Math.max(1.5, s * 0.11), splashCols[i % splashCols.length] as RGB);
      }
      // Outer shockwave ring
      c.ring(cx, cy, s * 0.52, s * 0.62, rgb('#fff0a8'));
      // Chunky star-shaped cosmic sponge stamp in the center
      c.obj((l) => {
        // Golden wooden stamp handle knob peeking out top-left
        l.capsule(cx - s * 0.12, cy - s * 0.18, cx - s * 0.36, cy - s * 0.48, s * 0.13, rgb('#8b5cf6'), s * 0.17);
        // Plush speckled golden-coral star sponge pad
        l.star(cx + s * 0.05, cy + s * 0.08, s * 0.56, s * 0.34, rgrad(cx, cy, s * 0.58, [rgb('#fff3b0'), rgb('#ffb84d'), rgb('#ff6b9d')]));
        // Sponge pores / texture dots
        const pores: Pt[] = [
          [cx - s * 0.1, cy + s * 0.08],
          [cx + s * 0.16, cy - s * 0.02],
          [cx + s * 0.06, cy + s * 0.24],
          [cx + s * 0.22, cy + s * 0.18],
        ];
        for (const [px, py] of pores) l.disc(px, py, Math.max(1.0, s * 0.055), rgb('#cc4978'));
      }, { rim: 0.24, deep: true });
      c.sparkle(cx - s * 0.58, cy - s * 0.44, 2, WHITE, rgb('#ffd43b'));
      c.sparkle(cx + s * 0.62, cy + s * 0.46, 2, WHITE, rgb('#7fe7f0'));
      break;
    }

    case 'zeroGGel': {
      // Sleek cosmic gel pen floating diagonally with glowing zero-g iridescent gel blobs & bubbles drifting up
      c.glow(cx - s * 0.1, cy - s * 0.15, s * 0.8, rgb('#7fe7f0'), 0.3);
      // Floating zero-G gel blobs & bubbles
      const blobs: Array<[number, number, number, RGB]> = [
        [cx - s * 0.56, cy - s * 0.42, s * 0.22, rgb('#ff85d0')],
        [cx - s * 0.15, cy - s * 0.64, s * 0.17, rgb('#7fe7f0')],
        [cx + s * 0.48, cy - s * 0.52, s * 0.14, rgb('#c9a3ff')],
        [cx - s * 0.66, cy + s * 0.1, s * 0.15, rgb('#a8ffcf')],
        [cx + s * 0.58, cy + s * 0.05, s * 0.18, rgb('#ffd43b')],
      ];
      for (const [bx, by, br, bc] of blobs) {
        c.obj((l) => {
          l.disc(bx, by, br, rgrad(bx - br * 0.3, by - br * 0.3, br * 1.15, [WHITE, light(bc, 0.3), bc, shade(bc, 0.25)]));
          l.dot(bx - br * 0.32, by - br * 0.32, WHITE);
        }, { rim: 0.15 });
      }
      // Gel pen floating horizontally-tilted (bottom-left -> top-right)
      c.obj((l) => {
        // Metallic fine gel tip (pointing top-left)
        l.poly([
          [cx - s * 0.35, cy - s * 0.2],
          [cx - s * 0.16, cy - s * 0.08],
          [cx - s * 0.24, cy + s * 0.06],
        ], rgb('#e0e8ff'));
        // Translucent cyan-violet barrel filled with glittery gel
        l.capsule(cx - s * 0.18, cy + s * 0.02, cx + s * 0.56, cy + s * 0.44, s * 0.16, lgrad(cx - s * 0.2, cy, cx + s * 0.55, cy + s * 0.44, [rgb('#7fe7f0'), rgb('#9d7aff'), rgb('#ff85d0')]));
        // Glossy glass highlight + silver clip
        l.line(cx - s * 0.1, cy - s * 0.03, cx + s * 0.44, cy + s * 0.28, WHITE);
        l.capsule(cx + s * 0.28, cy + s * 0.16, cx + s * 0.56, cy + s * 0.32, s * 0.05, rgb('#ffd43b'));
      }, { rim: 0.22, deep: true });
      c.sparkle(cx - s * 0.38, cy - s * 0.22, 2, WHITE, rgb('#9bf6ff'));
      c.sparkle(cx + s * 0.2, cy - s * 0.45, 1, WHITE);
      break;
    }

    case 'cometMeteor': {
      // Comet-Tail Meteor Brush: blazing meteor brush streaking diagonally with glowing comet tail
      c.glow(cx - s * 0.28, cy + s * 0.24, s * 0.68, rgb('#ffbe42'), 0.45);
      // Sweeping comet-tail flames trailing top-right
      c.obj((l) => {
        l.stroke([
          [cx - s * 0.2, cy + s * 0.18],
          [cx + s * 0.34, cy - s * 0.22],
          [cx + s * 0.84, cy - s * 0.62],
        ], s * 0.26, lgrad(cx - s * 0.2, cy + s * 0.2, cx + s * 0.85, cy - s * 0.6, [rgb('#fff3b0'), rgb('#ff9a3c'), rgb('#ff4d88')]), s * 0.06);
        l.stroke([
          [cx - s * 0.1, cy + s * 0.3],
          [cx + s * 0.42, cy - s * 0.05],
          [cx + s * 0.78, cy - s * 0.3],
        ], s * 0.14, rgb('#7fe7f0'), s * 0.04);
      }, { rim: 0.15 });
      // Meteor brush handle & star-blazing core head
      c.obj((l) => {
        l.capsule(cx - s * 0.18, cy + s * 0.16, cx + s * 0.56, cy - s * 0.48, s * 0.1, rgb('#5332a0'));
        l.disc(cx - s * 0.38, cy + s * 0.36, s * 0.32, rgrad(cx - s * 0.45, cy + s * 0.28, s * 0.4, [WHITE, rgb('#ffe66d'), rgb('#ff7b3b')]));
        l.star(cx - s * 0.38, cy + s * 0.36, s * 0.24, s * 0.11, WHITE);
      }, { rim: 0.22, deep: true });
      c.sparkle(cx + s * 0.56, cy - s * 0.62, 2, WHITE, rgb('#ffe66d'));
      break;
    }

    case 'prismRoller': {
      // Prism Kaleidoscope Roller: wide rainbow stained-glass roller on gilded handle
      c.glow(cx, cy - s * 0.2, s * 0.75, rgb('#9bf6ff'), 0.32);
      const rb: RGB[] = [rgb('#ff6b8b'), rgb('#ffd43b'), rgb('#69db7c'), rgb('#4dabf7'), rgb('#b197fc')];
      // Shimmering mosaic stripe painted behind roller
      c.obj((l) => {
        l.rrect(cx - s * 0.64, cy - s * 0.84, cx + s * 0.64, cy - s * 0.42, s * 0.08, (x) => {
          const idx = Math.max(0, Math.min(rb.length - 1, Math.floor(((x - (cx - s * 0.64)) / (s * 1.28)) * rb.length)));
          return mix(rb[idx] as RGB, WHITE, 0.25);
        });
      }, { rim: 0.1 });
      // Wire frame + handle + wide cylindrical prism roller
      c.obj((l) => {
        // Curved wire shank & indigo-gold handle
        l.capsule(cx + s * 0.62, cy - s * 0.24, cx + s * 0.62, cy + s * 0.05, s * 0.07, rgb('#eac46f'));
        l.capsule(cx + s * 0.62, cy + s * 0.05, cx, cy + s * 0.22, s * 0.07, rgb('#eac46f'));
        l.capsule(cx, cy + s * 0.22, cx, cy + s * 0.76, s * 0.15, vgrad(cy + s * 0.2, cy + s * 0.78, [rgb('#8a5cff'), rgb('#472694')]));
        // Wide faceted rainbow roller drum
        l.rrect(cx - s * 0.64, cy - s * 0.5, cx + s * 0.64, cy - s * 0.02, s * 0.14, (x, y) => {
          const idx = Math.max(0, Math.min(rb.length - 1, Math.floor(((x - (cx - s * 0.64)) / (s * 1.28)) * rb.length)));
          const c0 = rb[idx] as RGB;
          return y < cy - s * 0.34 ? light(c0, 0.35) : y > cy - s * 0.14 ? shade(c0, 0.22) : c0;
        });
      }, { rim: 0.22, deep: true });
      c.sparkle(cx - s * 0.52, cy - s * 0.58, 2, WHITE, rgb('#ffd43b'));
      break;
    }

    case 'starlightBubble': {
      // Starlight Bubble Wand: gilded loop wand blowing pearlescent crystal-mint bubbles
      c.glow(cx + s * 0.12, cy - s * 0.22, s * 0.8, rgb('#a8fff0'), 0.38);
      // Floating iridescent bubbles rising top-left & top-right
      const bubbles: Array<[number, number, number, RGB]> = [
        [cx - s * 0.56, cy - s * 0.44, s * 0.24, rgb('#4ae0cb')],
        [cx + s * 0.46, cy - s * 0.56, s * 0.28, rgb('#7cc8ff')],
        [cx + s * 0.62, cy - s * 0.08, s * 0.17, rgb('#ff9ec2')],
      ];
      for (const [bx, by, br, bc] of bubbles) {
        c.obj((l) => {
          l.disc(bx, by, br, rgrad(bx - br * 0.3, by - br * 0.3, br * 1.15, [WHITE, light(bc, 0.45), bc]));
          l.dot(bx - br * 0.32, by - br * 0.32, WHITE);
        }, { rim: 0.14 });
      }
      // Gilded bubble wand with heart/circle loop & crystal soap film
      c.obj((l) => {
        l.capsule(cx - s * 0.58, cy + s * 0.72, cx - s * 0.08, cy + s * 0.14, s * 0.1, lgrad(cx - s * 0.6, cy + s * 0.7, cx, cy, [rgb('#b87c24'), rgb('#eac46f'), rgb('#fff3c4')]));
        l.disc(cx + s * 0.06, cy - s * 0.06, s * 0.3, rgrad(cx - s * 0.05, cy - s * 0.16, s * 0.36, [WHITE, rgb('#a8fff0'), rgb('#7cc8ff')]));
        l.ring(cx + s * 0.06, cy - s * 0.06, s * 0.24, s * 0.36, rgb('#eac46f'));
      }, { rim: 0.22, deep: true });
      c.sparkle(cx + s * 0.02, cy - s * 0.16, 1, WHITE);
      break;
    }

    case 'nebulaCloudPuff': {
      // Nebula Cloud-Puff Sponge: fluffy pastel lavender-pink puffball cloud dauber on a starry gold handle
      c.glow(cx, cy - s * 0.16, s * 0.85, rgb('#ff8fd8'), 0.4);
      c.obj((l) => {
        // Golden starry wand handle pointing bottom-left
        l.capsule(cx - s * 0.64, cy + s * 0.72, cx - s * 0.08, cy + s * 0.12, s * 0.11, lgrad(cx - s * 0.65, cy + s * 0.7, cx, cy, [rgb('#532896'), rgb('#eac46f'), rgb('#fff3c4')]));
        // Fluffy 5-lobe nebula cotton-candy cloud puff!
        const puffFill = rgrad(cx - s * 0.08, cy - s * 0.28, s * 0.72, [rgb('#fff0fa'), rgb('#ff8fd8'), rgb('#d6a8ff'), rgb('#9be2ff')]);
        l.disc(cx + s * 0.08, cy - s * 0.22, s * 0.38, puffFill);
        l.disc(cx - s * 0.26, cy - s * 0.08, s * 0.28, puffFill);
        l.disc(cx + s * 0.42, cy - s * 0.08, s * 0.28, puffFill);
        l.disc(cx - s * 0.12, cy + s * 0.14, s * 0.24, puffFill);
        l.disc(cx + s * 0.28, cy + s * 0.14, s * 0.24, puffFill);
      }, { rim: 0.22, deep: true });
      c.sparkle(cx + s * 0.56, cy - s * 0.48, 2, WHITE, rgb('#9be2ff'));
      c.sparkle(cx - s * 0.46, cy - s * 0.42, 1, WHITE, rgb('#ff8fd8'));
      break;
    }

    case 'lightningWhisker': {
      // Lightning Whisker Liner: sleek electric gold/cyan liner pen crackling with zigzag lightning arcs
      c.glow(cx - s * 0.32, cy + s * 0.28, s * 0.68, rgb('#7fe7f0'), 0.42);
      // Electric zigzag bolts radiating from nib
      c.obj((l) => {
        l.polyline([
          [cx - s * 0.82, cy + s * 0.58],
          [cx - s * 0.54, cy + s * 0.18],
          [cx - s * 0.68, cy + s * 0.16],
          [cx - s * 0.34, cy - s * 0.22],
        ], rgb('#fff3b0'));
        l.stroke([
          [cx - s * 0.78, cy + s * 0.62],
          [cx - s * 0.48, cy + s * 0.24],
          [cx - s * 0.62, cy + s * 0.22],
          [cx - s * 0.28, cy - s * 0.14],
        ], Math.max(1.0, s * 0.08), rgb('#ffe066'), Math.max(0.8, s * 0.06), false);
      }, { rim: 0.1 });
      // Sleek cyber-indigo liner stylus
      c.obj((l) => {
        l.poly([
          [cx - s * 0.42, cy + s * 0.42],
          [cx - s * 0.16, cy + s * 0.04],
          [cx - s * 0.02, cy + s * 0.18],
        ], rgb('#7fe7f0'));
        l.capsule(cx - s * 0.1, cy + s * 0.1, cx + s * 0.66, cy - s * 0.62, s * 0.14, lgrad(cx - s * 0.1, cy + s * 0.1, cx + s * 0.66, cy - s * 0.62, [rgb('#ffe066'), rgb('#5d36b8'), rgb('#261554')]));
        l.capsule(cx + s * 0.2, cy - s * 0.18, cx + s * 0.44, cy - s * 0.42, s * 0.15, rgb('#ff4ad9'));
      }, { rim: 0.22, deep: true });
      c.sparkle(cx - s * 0.54, cy + s * 0.52, 2, WHITE, rgb('#7fe7f0'));
      break;
    }

    case 'moonbeamQuill': {
      // Moonbeam Feather Quill: curved pearlescent crescent plume tapering into a burnished-gold nib
      c.glow(cx + s * 0.1, cy - s * 0.16, s * 0.8, rgb('#d6f5ff'), 0.36);
      c.obj((l) => {
        // Curved plume body sweeping bottom-left -> top-right
        l.stroke([
          [cx - s * 0.26, cy + s * 0.26],
          [cx + s * 0.06, cy - s * 0.12],
          [cx + s * 0.52, cy - s * 0.48],
          [cx + s * 0.78, cy - s * 0.68],
        ], s * 0.18, lgrad(cx - s * 0.3, cy + s * 0.3, cx + s * 0.8, cy - s * 0.7, [rgb('#d6f5ff'), WHITE, rgb('#ffd6e8'), rgb('#b69cff')]), s * 0.28);
        // Feather notch cutouts & luminous central quill shaft
        l.stroke([
          [cx - s * 0.52, cy + s * 0.54],
          [cx + s * 0.08, cy - s * 0.06],
          [cx + s * 0.68, cy - s * 0.58],
        ], Math.max(0.9, s * 0.06), rgb('#eac46f'), Math.max(0.7, s * 0.04));
        // Gilded calligraphy nib tip (bottom-left)
        l.poly([
          [cx - s * 0.78, cy + s * 0.76],
          [cx - s * 0.42, cy + s * 0.28],
          [cx - s * 0.26, cy + s * 0.44],
        ], lgrad(cx - s * 0.78, cy + s * 0.76, cx - s * 0.26, cy + s * 0.44, [WHITE, rgb('#fff3c4'), rgb('#eac46f')]));
      }, { rim: 0.22, deep: true });
      c.sparkle(cx - s * 0.64, cy + s * 0.42, 2, WHITE, rgb('#fff3c4'));
      c.sparkle(cx + s * 0.56, cy - s * 0.68, 1, WHITE);
      break;
    }
  }
}

export function drawRelicIcon(c: Canvas, id: RelicId, cx: number, cy: number, s: number): void {
  switch (id) {
    case 'zoomiePaw': {
      // Golden glowing cheetah paw print with zoomie motion streaks & sparkles
      c.glow(cx, cy, s * 0.92, rgb('#ffd43b'), 0.45);
      // Motion comet streaks trailing bottom-left
      c.capsule(cx - s * 0.82, cy + s * 0.55, cx - s * 0.25, cy + s * 0.2, s * 0.07, rgb('#ffe66d'), s * 0.03);
      c.capsule(cx - s * 0.72, cy + s * 0.22, cx - s * 0.3, cy + s * 0.02, s * 0.055, rgb('#ff9a3c'), s * 0.02);
      c.capsule(cx - s * 0.55, cy + s * 0.74, cx - s * 0.1, cy + s * 0.42, s * 0.055, rgb('#fff3b0'), s * 0.02);
      // 24K gold paw pads!
      const goldPad = rgrad(cx - s * 0.1, cy - s * 0.1, s * 0.7, [rgb('#fff9cf'), rgb('#ffd700'), rgb('#ff9924')]);
      c.obj((l) => {
        // Main plump heart-like metacarpal pad
        l.ellipse(cx + s * 0.05, cy + s * 0.22, s * 0.36, s * 0.28, goldPad);
        l.disc(cx - s * 0.12, cy + s * 0.3, s * 0.19, goldPad);
        l.disc(cx + s * 0.22, cy + s * 0.3, s * 0.19, goldPad);
        // 4 toe beans arranged in an arch above
        const toes: Array<[number, number, number, number]> = [
          [-0.4, -0.02, 0.14, -0.35],
          [-0.14, -0.32, 0.15, -0.12],
          [0.18, -0.34, 0.15, 0.12],
          [0.44, -0.08, 0.14, 0.35],
        ];
        for (const [tx, ty, tr, rot] of toes) {
          l.ellipse(cx + tx * s, cy + ty * s, tr * s, tr * 1.28 * s, goldPad, rot);
        }
        // Bright inner specular glints
        l.dot(cx - s * 0.14, cy - s * 0.37, WHITE);
        l.dot(cx + s * 0.16, cy - s * 0.39, WHITE);
        l.dot(cx - s * 0.05, cy + s * 0.14, WHITE);
      }, { rim: 0.24, deep: true });
      c.sparkle(cx + s * 0.52, cy - s * 0.45, 2, WHITE, rgb('#fff3b0'));
      c.sparkle(cx - s * 0.56, cy - s * 0.35, 2, rgb('#ffe66d'), WHITE);
      break;
    }

    case 'prismRibbon': {
      // Crystal glass prism triangle splitting white starlight into a flowing rainbow ribbon!
      c.glow(cx - s * 0.1, cy, s * 0.88, rgb('#9bf6ff'), 0.36);
      // Incoming beam from left
      c.capsule(cx - s * 0.88, cy + s * 0.06, cx - s * 0.22, cy - s * 0.04, Math.max(1.2, s * 0.06), WHITE);
      // Outgoing swirling rainbow ribbon fanning right & curving gracefully
      const rb: RGB[] = [rgb('#ff5c77'), rgb('#ffa94d'), rgb('#ffe066'), rgb('#69db7c'), rgb('#4dabf7'), rgb('#b197fc')];
      c.obj((l) => {
        for (let i = 0; i < rb.length; i++) {
          const t = (i - 2.5) * 0.11;
          l.stroke([
            [cx + s * 0.05, cy - s * 0.05 + t * s * 0.35],
            [cx + s * 0.42, cy - s * 0.25 + t * s * 0.95],
            [cx + s * 0.78, cy + s * 0.15 + t * s * 1.15],
            [cx + s * 0.52, cy + s * 0.55 + t * s * 0.7],
          ], Math.max(1.1, s * 0.065), rb[i] as RGB, Math.max(1.1, s * 0.055));
        }
      }, { rim: 0.1 });
      // Faceted crystal prism triangle on left-center
      const px = cx - s * 0.16;
      const py = cy + s * 0.04;
      const pr = s * 0.48;
      c.obj((l) => {
        const top: Pt = [px, py - pr * 0.92];
        const bl: Pt = [px - pr * 0.85, py + pr * 0.65];
        const br: Pt = [px + pr * 0.85, py + pr * 0.65];
        const mid: Pt = [px + pr * 0.08, py + pr * 0.1];
        l.poly([top, bl, br], rgb('#c8f4ff'));
        l.poly([top, bl, mid], rgb('#ffffff'));
        l.poly([top, mid, br], rgb('#9be8ff'));
        l.poly([bl, mid, br], rgb('#b9b4ff'));
        l.line(top[0], top[1], mid[0], mid[1], WHITE);
      }, { rim: 0.22, deep: true });
      c.sparkle(px, py - pr * 0.96, 2, WHITE, rgb('#9bf6ff'));
      c.sparkle(cx + s * 0.65, cy - s * 0.38, 2, rgb('#ffe66d'), WHITE);
      break;
    }

    case 'uvFlashlight': {
      // Flashlight angled bottom-left -> top-right casting glowing violet UV beam cone that reveals a cute ghost creature!
      const beamTop: Pt = [cx + s * 0.12, cy - s * 0.82];
      const beamBot: Pt = [cx + s * 0.85, cy + s * 0.12];
      const nozzle: Pt = [cx - s * 0.12, cy + s * 0.08];
      // Translucent luminous UV beam cone with bright violet-magenta rim rays
      c.shape(
        cx - s * 0.2,
        cy - s * 0.85,
        cx + s * 0.9,
        cy + s * 0.25,
        (x, y) => {
          const cross = (a: Pt, b: Pt) => (x - a[0]) * (b[1] - a[1]) - (y - a[1]) * (b[0] - a[0]);
          const d1 = cross(nozzle, beamTop);
          const d2 = cross(beamTop, beamBot);
          const d3 = cross(beamBot, nozzle);
          return (d1 >= 0 && d2 >= 0 && d3 >= 0) || (d1 <= 0 && d2 <= 0 && d3 <= 0);
        },
        (x, y) => {
          const dist = Math.hypot(x - nozzle[0], y - nozzle[1]) / (s * 1.12);
          return mix(rgb('#f0b8ff'), rgb('#8e48e6'), Math.min(1, dist));
        },
      );
      c.line(nozzle[0], nozzle[1], beamTop[0], beamTop[1], rgb('#f5d6ff'));
      c.line(nozzle[0], nozzle[1], beamBot[0], beamBot[1], rgb('#f5d6ff'));
      // Cute revealed ghost constellation spirit floating inside the UV cone!
      const gx = cx + s * 0.36;
      const gy = cy - s * 0.28;
      const gr = s * 0.26;
      c.glow(gx, gy, gr * 2.0, rgb('#9bf6ff'), 0.45);
      c.obj((l) => {
        // Rounded ghost body + scalloped hem + tiny cat ears
        l.disc(gx, gy - gr * 0.1, gr * 0.88, rgrad(gx - 1, gy - 2, gr * 1.2, [WHITE, rgb('#c8f4ff'), rgb('#b8a8ff')]));
        l.rect(gx - gr * 0.86, gy - gr * 0.1, gx + gr * 0.86, gy + gr * 0.72, rgb('#c8f4ff'));
        l.disc(gx - gr * 0.52, gy + gr * 0.72, gr * 0.32, rgb('#b8a8ff'));
        l.disc(gx, gy + gr * 0.76, gr * 0.32, rgb('#c8f4ff'));
        l.disc(gx + gr * 0.52, gy + gr * 0.72, gr * 0.32, rgb('#b8a8ff'));
        // Tiny pointed ears
        l.poly([[gx - gr * 0.82, gy - gr * 0.35], [gx - gr * 0.65, gy - gr * 1.1], [gx - gr * 0.22, gy - gr * 0.75]], WHITE);
        l.poly([[gx + gr * 0.82, gy - gr * 0.35], [gx + gr * 0.65, gy - gr * 1.1], [gx + gr * 0.22, gy - gr * 0.75]], WHITE);
        // Happy little eyes & pink blush
        l.dot(gx - gr * 0.32, gy - gr * 0.05, INK);
        l.dot(gx + gr * 0.32, gy - gr * 0.05, INK);
        l.dot(gx - gr * 0.48, gy + gr * 0.15, rgb('#ff9ecf'));
        l.dot(gx + gr * 0.48, gy + gr * 0.15, rgb('#ff9ecf'));
      }, { ink: rgb('#4e2a8c'), rim: 0.15 });
      // Sturdy violet/silver UV flashlight in bottom-left
      c.obj((l) => {
        // Handle
        l.capsule(cx - s * 0.66, cy + s * 0.56, cx - s * 0.24, cy + s * 0.2, s * 0.16, lgrad(cx - s * 0.6, cy + s * 0.4, cx - s * 0.2, cy + s * 0.5, [rgb('#9d7aff'), rgb('#5933a3'), rgb('#361b6e')]));
        // Flared lamp head
        l.capsule(cx - s * 0.24, cy + s * 0.2, cx - s * 0.1, cy + s * 0.08, s * 0.23, rgb('#d8dcf0'));
        // Glowing UV lens
        l.ellipse(cx - s * 0.08, cy + s * 0.06, s * 0.1, s * 0.2, rgb('#e09cff'), -0.72);
        // Power button
        l.disc(cx - s * 0.44, cy + s * 0.32, Math.max(1.2, s * 0.065), rgb('#ff6b9d'));
      }, { rim: 0.22, deep: true });
      c.sparkle(gx + gr * 0.9, gy - gr * 0.8, 2, WHITE, rgb('#e09cff'));
      break;
    }

    case 'kaleidoSharpener': {
      // Shimmering holographic kaleidoscope prism shavings bursting from a starry sharpener + rainbow pencil!
      c.glow(cx, cy, s * 0.9, rgb('#ff9ecf'), 0.35);
      // Fan of faceted holographic prism foil ribbons/shards bursting top-right
      const shards: Array<[number, number, number, RGB]> = [
        [cx + s * 0.05, cy - s * 0.55, s * 0.26, rgb('#ff9ecf')],
        [cx + s * 0.42, cy - s * 0.48, s * 0.28, rgb('#ffe66d')],
        [cx + s * 0.64, cy - s * 0.16, s * 0.26, rgb('#7fe7f0')],
        [cx + s * 0.56, cy + s * 0.26, s * 0.24, rgb('#caffbf')],
        [cx + s * 0.24, cy + s * 0.54, s * 0.22, rgb('#c4a3ff')],
      ];
      for (const [sx, sy, sr, sc] of shards) {
        c.obj((l) => {
          l.poly([
            [cx + s * 0.05, cy],
            [sx - sr * 0.4, sy - sr * 0.7],
            [sx + sr * 0.7, sy + sr * 0.2],
          ], lgrad(cx, cy, sx, sy, [WHITE, sc, shade(sc, 0.2)]));
        }, { rim: 0.15 });
      }
      // Rainbow pencil entering sharpener from bottom-left
      c.obj((l) => {
        l.capsule(cx - s * 0.78, cy + s * 0.56, cx - s * 0.22, cy + s * 0.15, s * 0.13, (x, y) => {
          const band = Math.floor((x + y) * 0.22) % 3;
          return band === 0 ? rgb('#ff6b8b') : band === 1 ? rgb('#ffd43b') : rgb('#4dabf7');
        });
        // Pink eraser & gold ferrule at tail
        l.capsule(cx - s * 0.78, cy + s * 0.56, cx - s * 0.66, cy + s * 0.48, s * 0.13, rgb('#ff8fb8'));
        l.capsule(cx - s * 0.65, cy + s * 0.47, cx - s * 0.58, cy + s * 0.42, s * 0.135, rgb('#ffd43b'));
      }, { rim: 0.2 });
      // Starry faceted kaleidoscope sharpener body
      c.obj((l) => {
        const bx = cx - s * 0.08;
        const by = cy + s * 0.05;
        l.rrect(bx - s * 0.34, by - s * 0.34, bx + s * 0.34, by + s * 0.34, s * 0.12, vgrad(by - s * 0.34, by + s * 0.34, [rgb('#9d7aff'), rgb('#6c42c4'), rgb('#432287')]));
        // Metallic angled blade + screw
        l.poly([
          [bx - s * 0.16, by - s * 0.22],
          [bx + s * 0.22, by - s * 0.22],
          [bx + s * 0.14, by + s * 0.22],
          [bx - s * 0.22, by + s * 0.22],
        ], lgrad(bx - s * 0.2, by - s * 0.2, bx + s * 0.2, by + s * 0.2, [WHITE, rgb('#c8d4f0'), rgb('#8f9ec4')]));
        l.disc(bx, by, Math.max(1.3, s * 0.08), rgb('#ffd43b'));
        l.star(bx - s * 0.2, by - s * 0.2, s * 0.11, s * 0.05, rgb('#ffe66d'));
      }, { rim: 0.24, deep: true });
      c.sparkle(cx + s * 0.45, cy - s * 0.52, 2, WHITE, rgb('#ffe66d'));
      c.sparkle(cx + s * 0.68, cy + s * 0.08, 2, rgb('#7fe7f0'), WHITE);
      break;
    }

    case 'sleepyMoonCat': {
      // Cozy crescent moon cradling a sleeping lavender-pearl kitten!
      c.glow(cx, cy, s * 0.88, rgb('#fff3c4'), 0.38);
      c.obj((l) => {
        const mr = s * 0.76;
        l.shape(cx - mr, cy - mr, cx + mr, cy + mr, (px, py) =>
          Math.hypot(px - cx, py - cy) <= mr &&
          Math.hypot(px - (cx - mr * 0.28), py - (cy - mr * 0.28)) >= mr * 0.76,
          rgrad(cx + s * 0.2, cy + s * 0.2, mr * 1.1, [rgb('#fff3c4'), rgb('#eac46f'), rgb('#d99026')]));
      }, { rim: 0.22 });
      // Cute sleepy pearl-lavender moon-cat nestled in the crescent curve
      c.obj((l) => {
        const kx = cx - s * 0.08;
        const ky = cy - s * 0.04;
        l.disc(kx, ky, s * 0.34, rgrad(kx - s * 0.1, ky - s * 0.1, s * 0.45, [WHITE, rgb('#e8dcff'), rgb('#b8a3ff')]));
        // Pointed cat ears
        l.poly([[kx - s * 0.3, ky - s * 0.16], [kx - s * 0.24, ky - s * 0.54], [kx - s * 0.04, ky - s * 0.28]], rgb('#e8dcff'));
        l.poly([[kx + s * 0.3, ky - s * 0.16], [kx + s * 0.24, ky - s * 0.54], [kx + s * 0.04, ky - s * 0.28]], rgb('#e8dcff'));
        // Happy closed sleepy eyes & pink blush
        l.line(kx - s * 0.18, ky, kx - s * 0.06, ky, INK);
        l.line(kx + s * 0.06, ky, kx + s * 0.18, ky, INK);
        l.dot(kx - s * 0.2, ky + s * 0.1, rgb('#ff8fb8'));
        l.dot(kx + s * 0.2, ky + s * 0.1, rgb('#ff8fb8'));
      }, { rim: 0.18 });
      c.sparkle(cx - s * 0.62, cy - s * 0.56, 2, WHITE, rgb('#fff3c4'));
      break;
    }

    case 'gravityFlipFlop': {
      // Pair of playful zero-G starry flip-flop sandals floating tilted with bounce arcs
      c.glow(cx, cy, s * 0.85, rgb('#9be2ff'), 0.35);
      // Zero-G bounce arcs
      c.arc(cx, cy, s * 0.68, s * 0.78, -2.5, -0.7, rgb('#7fe7f0'));
      c.arc(cx, cy, s * 0.68, s * 0.78, 0.7, 2.5, rgb('#ff9ec2'));
      // Left & right flip-flops tilted playfully
      for (const [ox, oy, rot, col] of [
        [-0.32, 0.04, -0.35, rgb('#ff7eb6')],
        [0.32, -0.06, 0.32, rgb('#4ae0cb')],
      ] as const) {
        const fx = cx + ox * s;
        const fy = cy + oy * s;
        c.obj((l) => {
          l.ellipse(fx, fy, s * 0.26, s * 0.54, lgrad(fx, fy - s * 0.5, fx, fy + s * 0.5, [light(col, 0.35), col, shade(col, 0.22)]), rot);
          // Y-strap thong in burnished gold
          l.line(fx, fy - s * 0.22, fx - s * 0.16, fy + s * 0.06, rgb('#eac46f'));
          l.line(fx, fy - s * 0.22, fx + s * 0.16, fy + s * 0.06, rgb('#eac46f'));
          l.dot(fx, fy - s * 0.22, WHITE);
        }, { rim: 0.2, deep: true });
      }
      c.sparkle(cx, cy - s * 0.68, 2, WHITE, rgb('#ffd43b'));
      break;
    }

    case 'doubleMilkshake': {
      // Double-Scoop Milkshake Charm: twin scoops piled high with cherry & twin striped straws
      c.glow(cx, cy, s * 0.88, rgb('#ff9ec2'), 0.4);
      // Twin striped straws
      c.obj((l) => {
        l.capsule(cx - s * 0.12, cy - s * 0.3, cx - s * 0.46, cy - s * 0.86, s * 0.07, rgb('#7fe7f0'));
        l.capsule(cx + s * 0.14, cy - s * 0.3, cx + s * 0.5, cy - s * 0.84, s * 0.07, rgb('#ff5e8e'));
      }, { rim: 0.12 });
      // Glass + double ice-cream scoops + cherry
      c.obj((l) => {
        // Pedestal foot & tulip glass
        l.ellipse(cx, cy + s * 0.72, s * 0.34, s * 0.12, rgb('#d6c8ff'));
        l.poly([
          [cx - s * 0.48, cy - s * 0.05],
          [cx + s * 0.48, cy - s * 0.05],
          [cx + s * 0.28, cy + s * 0.66],
          [cx - s * 0.28, cy + s * 0.66],
        ], vgrad(cy - s * 0.05, cy + s * 0.66, [rgb('#ffd6e8'), rgb('#ff8fd8'), rgb('#c7529c')]));
        // Lower mint scoop & upper strawberry scoop
        l.disc(cx - s * 0.18, cy - s * 0.14, s * 0.32, rgrad(cx - s * 0.24, cy - s * 0.22, s * 0.38, [WHITE, rgb('#a8fff0'), rgb('#4ae0cb')]));
        l.disc(cx + s * 0.18, cy - s * 0.18, s * 0.32, rgrad(cx + s * 0.12, cy - s * 0.26, s * 0.38, [WHITE, rgb('#ffd6e8'), rgb('#ff5e8e')]));
        l.disc(cx, cy - s * 0.44, s * 0.26, CREAM);
        // Glossy cherry on top
        l.disc(cx, cy - s * 0.68, s * 0.14, rgb('#ff3b6b'));
        l.dot(cx - s * 0.04, cy - s * 0.72, WHITE);
      }, { rim: 0.22, deep: true });
      c.sparkle(cx - s * 0.56, cy - s * 0.24, 2, WHITE, rgb('#fff3c4'));
      break;
    }

    case 'starlightMagnet': {
      // Starlight Magnet Compass: bold horseshoe magnet pulling gleaming golden gems & star-arcs
      c.glow(cx, cy, s * 0.85, rgb('#7fe7f0'), 0.36);
      // Magnetic field sparkle arcs between poles
      c.arc(cx, cy - s * 0.48, s * 0.22, s * 0.32, Math.PI, Math.PI * 2, rgb('#7fe7f0'));
      c.obj((l) => {
        // U-shaped ruby-berry magnet arch
        l.arc(cx, cy + s * 0.14, s * 0.32, s * 0.62, 0, Math.PI, rgrad(cx, cy + s * 0.2, s * 0.7, [rgb('#ff8fb8'), rgb('#ff4d7d'), rgb('#a82058')]));
        l.rect(cx - s * 0.62, cy - s * 0.36, cx - s * 0.32, cy + s * 0.18, rgb('#ff4d7d'));
        l.rect(cx + s * 0.32, cy - s * 0.36, cx + s * 0.62, cy + s * 0.18, rgb('#ff4d7d'));
        // Metallic silver-gold magnetic pole tips
        l.rect(cx - s * 0.62, cy - s * 0.54, cx - s * 0.32, cy - s * 0.28, lgrad(cx - s * 0.62, cy - s * 0.54, cx - s * 0.32, cy - s * 0.28, [WHITE, rgb('#d8e4ff'), rgb('#8f9ec4')]));
        l.rect(cx + s * 0.32, cy - s * 0.54, cx + s * 0.62, cy - s * 0.28, lgrad(cx + s * 0.32, cy - s * 0.54, cx + s * 0.62, cy - s * 0.28, [WHITE, rgb('#d8e4ff'), rgb('#8f9ec4')]));
      }, { rim: 0.22, deep: true });
      // Pulled golden star gem hovering between tips
      c.obj((l) => {
        l.star(cx, cy - s * 0.54, s * 0.24, s * 0.11, rgb('#eac46f'));
      }, { rim: 0.12 });
      c.sparkle(cx, cy - s * 0.54, 1, WHITE);
      break;
    }

    case 'chromaticButterfly': {
      // Chromatic Echo Butterfly: symmetrical dragonfly-iridescent wings with luminous wing glints
      c.glow(cx, cy, s * 0.88, rgb('#18c9b8'), 0.4);
      c.obj((l) => {
        for (const dir of [-1, 1] as const) {
          // Upper sweeping forewing
          l.ellipse(cx + dir * s * 0.44, cy - s * 0.22, s * 0.44, s * 0.32, lgrad(cx, cy - s * 0.5, cx + dir * s * 0.8, cy + s * 0.1, [rgb('#7bffb8'), rgb('#18c9b8'), rgb('#4287f5'), rgb('#9d5cff')]), dir * -0.35);
          // Lower scalloped hindwing
          l.ellipse(cx + dir * s * 0.34, cy + s * 0.32, s * 0.32, s * 0.28, lgrad(cx, cy + s * 0.1, cx + dir * s * 0.6, cy + s * 0.6, [rgb('#9d5cff'), rgb('#ff8fd8'), rgb('#4287f5')]), dir * 0.35);
          // Specular wing spots
          l.disc(cx + dir * s * 0.46, cy - s * 0.24, Math.max(1.2, s * 0.1), WHITE);
          l.dot(cx + dir * s * 0.36, cy + s * 0.34, rgb('#fff3c4'));
          // Antennae
          l.line(cx + dir * s * 0.06, cy - s * 0.34, cx + dir * s * 0.26, cy - s * 0.68, rgb('#eac46f'));
          l.dot(cx + dir * s * 0.26, cy - s * 0.68, WHITE);
        }
        // Slender indigo-gold thorax
        l.capsule(cx, cy - s * 0.38, cx, cy + s * 0.44, s * 0.1, rgb('#3f2278'));
      }, { rim: 0.2, deep: true });
      c.sparkle(cx - s * 0.62, cy - s * 0.56, 2, WHITE, rgb('#7bffb8'));
      break;
    }

    case 'constellationCrown': {
      // Constellation Crown Seal: regal burnished-gold astrolabe crown with radiant starlight seal
      c.glow(cx, cy, s * 0.92, rgb('#eac46f'), 0.48);
      // Constellation ring halo behind crown
      c.ring(cx, cy, s * 0.64, s * 0.74, rgb('#fff3c4'));
      c.obj((l) => {
        const yBot = cy + s * 0.48;
        const yBand = cy + s * 0.18;
        l.poly([
          [cx - s * 0.62, yBot],
          [cx - s * 0.74, cy - s * 0.24],
          [cx - s * 0.32, cy + s * 0.04],
          [cx, cy - s * 0.58],
          [cx + s * 0.32, cy + s * 0.04],
          [cx + s * 0.74, cy - s * 0.24],
          [cx + s * 0.62, yBot],
        ], lgrad(cx - s * 0.7, cy - s * 0.5, cx + s * 0.7, yBot, [rgb('#fff3c4'), rgb('#eac46f'), rgb('#b87c24')]));
        l.rrect(cx - s * 0.66, yBand + s * 0.08, cx + s * 0.66, yBot + s * 0.08, 2, rgb('#eac46f'));
        // Midnight sapphire & rose crown jewels
        l.disc(cx, yBand + s * 0.2, Math.max(1.5, s * 0.12), rgb('#3f2278'));
        l.dot(cx, yBand + s * 0.2, WHITE);
        l.star(cx, cy - s * 0.58, s * 0.22, s * 0.1, WHITE);
      }, { rim: 0.22, deep: true });
      c.sparkle(cx - s * 0.62, cy - s * 0.52, 2, WHITE, rgb('#fff3c4'));
      c.sparkle(cx + s * 0.62, cy - s * 0.52, 2, WHITE, rgb('#eac46f'));
      break;
    }
  }
}

export function drawDraftIcon(c: Canvas, card: DraftCardId, cx: number, cy: number, s: number): void {
  if (ACTIVE_BRUSH_SET.has(card)) {
    drawBrushIcon(c, card as BrushId, cx, cy, s);
  } else {
    drawRelicIcon(c, card as RelicId, cx, cy, s);
  }
}
