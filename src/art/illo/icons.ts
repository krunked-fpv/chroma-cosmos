/**
 * Shared bold hero pixel-art icons for the 4 Brushes + 4 Relics (used by both draft cards and relic stickers).
 * Every icon draws centered at (cx, cy) scaled by radius `s` with crisp 1px INK outlines & rim light.
 */
import type { BrushId, DraftCardId, RelicId } from '../../contracts/roguelike';
import { Canvas, CREAM, INK, light, lgrad, mix, type Pt, rgrad, rgb, type RGB, shade, vgrad, WHITE } from './canvas';

export function drawBrushIcon(c: Canvas, id: Exclude<BrushId, 'standard'>, cx: number, cy: number, s: number): void {
  switch (id) {
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
  }
}

export function drawDraftIcon(c: Canvas, card: DraftCardId, cx: number, cy: number, s: number): void {
  if (card === 'turboCheetah' || card === 'twinTail' || card === 'supernovaSponge' || card === 'zeroGGel') {
    drawBrushIcon(c, card, cx, cy, s);
  } else {
    drawRelicIcon(c, card, cx, cy, s);
  }
}
