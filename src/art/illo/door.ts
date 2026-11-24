/**
 * Ornate Star-Door illustrations: gilded arched storybook portal framing a hand-drawn mini vignette
 * of the next chapter's world. Pure + deterministic.
 */
import type { ChapterId } from '../../contracts/roguelike';
import { hashString, mulberry32 } from '../../scenes/context';
import { Canvas, CREAM, dith, INK, light, lgrad, mix, type Pt, ramp, rgrad, rgb, type RGB, shade, vgrad, vnoise, WHITE } from './canvas';

const BG_TOP = rgb('#140d33');
const BG_BOT = rgb('#2b1854');
const GOLD_HI = rgb('#fff3b0');
const GOLD_MID = rgb('#f6c344');
const GOLD_LO = rgb('#b86f1c');
const TRIM_HI = rgb('#9c7cf6');
const TRIM_MID = rgb('#5d3ea8');
const TRIM_LO = rgb('#351e6e');
const STONE_HI = rgb('#7b67b3');
const STONE_LO = rgb('#3b286b');

/** Helper: draw a little 5-point or 4-point star field in a region */
function starField(c: Canvas, seed: number, x0: number, y0: number, x1: number, y1: number, count: number, palette: readonly RGB[]): void {
  const rng = mulberry32(seed);
  for (let i = 0; i < count; i++) {
    const x = Math.floor(rng.range(x0, x1));
    const y = Math.floor(rng.range(y0, y1));
    const col = rng.pick(palette);
    if (rng.chance(0.22)) c.sparkle(x, y, rng.int(1, 2), col, WHITE);
    else c.set(x, y, col);
  }
}

/** Draw the chapter mini vignette filling the canvas (will later be masked into the door opening). */
function paintVignette(chapter: ChapterId, w: number, h: number): Canvas {
  const v = new Canvas(w, h);
  const cx = w * 0.5;
  const rng = mulberry32(hashString(`door-vig:${chapter}`));

  switch (chapter) {
    case 'rooftop': {
      // Twilight indigo -> rose -> peach sunset over cozy rooftop silhouette, chimney, antenna & launching paper rocket
      v.fill(vgrad(0, h, [rgb('#181347'), rgb('#3e2678'), rgb('#9e4c8f'), rgb('#f29e8e')], true));
      starField(v, hashString('rooftop-s'), 2, 2, w - 2, h * 0.52, 22, [WHITE, rgb('#ffe999'), rgb('#b8e6ff')]);
      // Crescent moon upper-left
      const mx = w * 0.27;
      const my = h * 0.24;
      const mr = Math.max(4, Math.min(w, h) * 0.11);
      v.glow(mx, my, mr * 2.1, rgb('#ffe999'), 0.35);
      v.obj((l) => {
        l.shape(
          mx - mr - 1,
          my - mr - 1,
          mx + mr + 1,
          my + mr + 1,
          (px, py) =>
            Math.hypot(px - mx, py - my) <= mr &&
            Math.hypot(px - (mx + mr * 0.45), py - (my - mr * 0.2)) >= mr * 0.84,
          rgb('#fff4b8'),
        );
      }, { rim: 0.12 });
      // Distant skyline silhouettes
      const horizon = Math.round(h * 0.67);
      for (let i = 0; i < 6; i++) {
        const bx = Math.round((i / 6) * w);
        const bw = Math.ceil(w / 6) + 2;
        const bh = Math.round(h * rng.range(0.08, 0.2));
        v.rect(bx, horizon - bh, bx + bw, h, rgb('#2a1d54'));
        // tiny lit distant windows
        for (let wy = horizon - bh + 3; wy < horizon - 2; wy += 4) {
          for (let wx = bx + 2; wx < bx + bw - 2; wx += 4) {
            if (rng.chance(0.45)) v.set(wx, wy, rgb('#ffd97d'));
          }
        }
      }
      // Foreground pitched rooftop with chimney, attic window, and telescope/antenna
      const ry = Math.round(h * 0.72);
      v.obj((l) => {
        // Chimney on left
        const chx = Math.round(w * 0.22);
        l.rect(chx, ry - 11, chx + 7, ry + 4, rgb('#6e4066'));
        l.rect(chx - 1, ry - 12, chx + 8, ry - 9, rgb('#8b5582'));
        // Roof slope
        l.poly([
          [0, h],
          [0, ry + 4],
          [w * 0.36, ry - 5],
          [w, ry + 6],
          [w, h],
        ], vgrad(ry - 5, h, [rgb('#553780'), rgb('#311d59')]));
        // Warm attic dormer window
        const wx = Math.round(w * 0.35);
        const wy = ry + 3;
        l.rect(wx - 4, wy, wx + 4, wy + 7, rgb('#ffe082'));
        l.line(wx, wy, wx, wy + 7, INK);
        l.line(wx - 4, wy + 3, wx + 4, wy + 3, INK);
      }, { rim: 0.2 });
      // Rooftop antenna on right
      const ax = Math.round(w * 0.75);
      v.line(ax, ry + 4, ax, ry - 9, INK);
      v.line(ax - 3, ry - 6, ax + 3, ry - 6, INK);
      v.dot(ax, ry - 10, rgb('#ff7096'));
      // Launching paper rocket arcing up-right with golden sparkle trail
      const rx = w * 0.64;
      const ry2 = h * 0.36;
      const trail: Pt[] = [
        [w * 0.42, ry - 6],
        [w * 0.52, h * 0.52],
        [rx - 3, ry2 + 4],
      ];
      v.stroke(trail, 1.3, rgb('#ffd97d'), 0.6);
      v.sparkle(w * 0.5, h * 0.53, 2, rgb('#ffe999'));
      v.obj((l) => {
        // Paper rocket fuselage tilted up-right
        l.poly([
          [rx + 5, ry2 - 6],
          [rx + 2, ry2 + 4],
          [rx - 5, ry2 + 2],
        ], CREAM);
        l.poly([
          [rx + 5, ry2 - 6],
          [rx - 1, ry2 + 1],
          [rx - 5, ry2 + 2],
        ], rgb('#ff7a90'));
      }, { rim: 0.25 });
      break;
    }

    case 'milkshakeNebula': {
      // Pink/cream/berry cosmic swirl nebula
      v.fill((x, y) => {
        const dx = (x - cx) / (w * 0.55);
        const dy = (y - h * 0.44) / (h * 0.55);
        const a = Math.atan2(dy, dx);
        const r = Math.hypot(dx, dy);
        const sw = Math.sin(a * 2 + r * 5.2) * 0.5 + 0.5;
        const n = vnoise(x * 0.08, y * 0.08, 17);
        const t = Math.max(0, Math.min(1, sw * 0.6 + n * 0.4));
        const stops = [rgb('#2b1557'), rgb('#7d2b8a'), rgb('#f269ad'), rgb('#ffb8d9'), rgb('#fff2cf')];
        const idx = Math.min(stops.length - 2, Math.floor(t * (stops.length - 1)));
        return dith(stops[idx] as RGB, stops[idx + 1] as RGB, t * (stops.length - 1) - idx, x, y);
      });
      starField(v, hashString('milk-s'), 2, 2, w - 2, h - 2, 20, [WHITE, rgb('#fff2c2'), rgb('#ffd1eb')]);
      // Giant frosted cosmic milkshake glass with whipped cream, cherry, striped straw & sprinkles
      const gx = cx;
      const gy = h * 0.58;
      const gw = Math.max(10, w * 0.22);
      const gh = Math.max(14, h * 0.24);
      // Striped straw poking up-right
      v.obj((l) => {
        l.capsule(gx + gw * 0.2, gy - gh * 0.5, gx + gw * 0.72, gy - gh * 1.35, 1.8, (x, y) => ((x + y) % 4 < 2 ? WHITE : rgb('#ff5c8a')));
      }, { rim: 0.15 });
      // Glass body & pedestal
      v.obj((l) => {
        // Foot & stem
        l.ellipse(gx, gy + gh * 0.92, gw * 0.65, 2.5, rgb('#e0c8ff'));
        l.rect(gx - 2, gy + gh * 0.45, gx + 2, gy + gh * 0.9, rgb('#d6b8ff'));
        // Tulip milkshake cup
        l.poly([
          [gx - gw, gy - gh * 0.55],
          [gx + gw, gy - gh * 0.55],
          [gx + gw * 0.62, gy + gh * 0.55],
          [gx - gw * 0.62, gy + gh * 0.55],
        ], vgrad(gy - gh * 0.55, gy + gh * 0.55, [rgb('#ff99cc'), rgb('#ff5fa2'), rgb('#d63d84')], true));
        // Glossy glass highlight stripe
        l.line(gx - gw * 0.65, gy - gh * 0.4, gx - gw * 0.42, gy + gh * 0.35, WHITE);
      }, { rim: 0.25 });
      // Whipped cream cloud swirl & cherry
      v.obj((l) => {
        l.disc(gx - gw * 0.42, gy - gh * 0.62, gw * 0.48, CREAM);
        l.disc(gx + gw * 0.42, gy - gh * 0.62, gw * 0.48, CREAM);
        l.disc(gx, gy - gh * 0.82, gw * 0.55, WHITE);
        l.disc(gx, gy - gh * 1.15, gw * 0.28, CREAM);
        // Sprinkles!
        const spCols = [rgb('#7fe7f0'), rgb('#ffd43b'), rgb('#ff6b9d'), rgb('#9bf6ff')];
        for (let i = 0; i < 7; i++) {
          const sx = gx + (i - 3) * (gw * 0.23);
          const sy = gy - gh * 0.65 - (i % 2) * 3;
          l.dot(sx, sy, spCols[i % spCols.length] as RGB);
        }
      }, { rim: 0.2 });
      v.obj((l) => {
        l.disc(gx - 1, gy - gh * 1.25, Math.max(2.3, gw * 0.24), rgb('#ff3b6b'));
        l.dot(gx - 2, gy - gh * 1.32, WHITE);
      }, { rim: 0.2 });
      break;
    }

    case 'asteroidGarden': {
      // Deep emerald-indigo cosmic sky with glowing floating crystal asteroids and tiny flowers
      v.fill(vgrad(0, h, [rgb('#15133d'), rgb('#262063'), rgb('#3d2c7a'), rgb('#1d4466')], true));
      starField(v, hashString('ast-s'), 2, 2, w - 2, h - 2, 24, [WHITE, rgb('#9bf6ff'), rgb('#caffbf'), rgb('#e0c3ff')]);
      const drawRock = (rx: number, ry: number, rrx: number, rry: number, crystalCol: RGB, seed: number) => {
        const ch = Math.max(7, rry * 2.55);
        v.glow(rx, ry - ch * 0.55, rrx * 1.7, crystalCol, 0.44);
        // Chunky asteroid rock behind/below the sprouting crystals
        v.obj((l) => {
          l.ellipse(rx, ry, rrx, rry, (x, y) => {
            const n = vnoise(x * 0.22, y * 0.22, seed);
            return n > 0.55 ? rgb('#7c6e9e') : rgb('#574978');
          });
          // Craters + mossy top rim
          l.ellipse(rx, ry - rry * 0.48, rrx * 0.76, rry * 0.34, rgb('#5ed4a8'));
          l.disc(rx - rrx * 0.3, ry + rry * 0.22, Math.max(1.5, rrx * 0.16), rgb('#3d315c'));
          l.disc(rx + rrx * 0.34, ry + rry * 0.12, Math.max(1.2, rrx * 0.13), rgb('#3d315c'));
        }, { rim: 0.26, deep: true });
        // Tall, bold faceted crystal spires erupting from the asteroid!
        v.obj((l) => {
          // Center tall hexagonal spire (bright left facet + tinted right facet)
          l.poly([
            [rx - rrx * 0.28, ry - rry * 0.35],
            [rx - rrx * 0.24, ry - ch * 0.85],
            [rx, ry - ch * 1.25],
            [rx + rrx * 0.24, ry - ch * 0.82],
            [rx + rrx * 0.28, ry - rry * 0.35],
          ], (x, y) => (x < rx ? light(crystalCol, 0.55) : y < ry - ch * 0.65 ? crystalCol : shade(crystalCol, 0.22)));
          // Right angled crystal
          l.poly([
            [rx + rrx * 0.16, ry - rry * 0.3],
            [rx + rrx * 0.64, ry - ch * 0.92],
            [rx + rrx * 0.72, ry - ch * 0.58],
            [rx + rrx * 0.52, ry - rry * 0.25],
          ], light(crystalCol, 0.25));
          // Left angled crystal
          l.poly([
            [rx - rrx * 0.58, ry - rry * 0.25],
            [rx - rrx * 0.74, ry - ch * 0.75],
            [rx - rrx * 0.46, ry - ch * 0.88],
            [rx - rrx * 0.18, ry - rry * 0.3],
          ], lgrad(rx - rrx * 0.7, ry - ch * 0.85, rx, ry, [WHITE, crystalCol]));
          l.dot(rx - 1, ry - ch * 0.95, WHITE);
        }, { rim: 0.2 });
        // Tiny luminous cosmic blossoms on the mossy rim
        v.dot(rx - rrx * 0.56, ry - rry * 0.68, rgb('#ff9ecf'));
        v.dot(rx + rrx * 0.54, ry - rry * 0.66, rgb('#ffe66d'));
      };
      drawRock(w * 0.28, h * 0.4, w * 0.18, h * 0.075, rgb('#d4a6ff'), 11);
      drawRock(w * 0.73, h * 0.36, w * 0.16, h * 0.07, rgb('#8effc9'), 22);
      drawRock(cx, h * 0.74, w * 0.31, h * 0.115, rgb('#7fe7f0'), 33);
      v.sparkle(cx - 1, h * 0.44, 2, WHITE, rgb('#9bf6ff'));
      v.sparkle(w * 0.28, h * 0.2, 1, WHITE, rgb('#e0c3ff'));
      break;
    }

    case 'cheetahSavannah': {
      // Binary suns over violet -> coral -> blazing gold sky, acacia tree, swaying cosmic grass
      v.fill(vgrad(0, h * 0.74, [rgb('#2c185e'), rgb('#7d2f7a'), rgb('#eb6864'), rgb('#ffb84d'), rgb('#ffe88a')], true));
      starField(v, hashString('sav-s'), 2, 2, w - 2, h * 0.32, 14, [WHITE, rgb('#ffe999')]);
      // Subtle cheetah-spot nebula clouds high in the sky
      for (let i = 0; i < 6; i++) {
        const sx = w * (0.18 + i * 0.13);
        const sy = h * (0.19 + (i % 2) * 0.07);
        v.disc(sx, sy, 2.2, rgb('#5c236e'));
        v.dot(sx, sy, rgb('#ffb84d'));
      }
      // Binary Suns: large golden sun + companion rose-coral sun
      const s1x = w * 0.42;
      const s1y = h * 0.44;
      const s1r = Math.max(6, Math.min(w, h) * 0.16);
      const s2x = w * 0.67;
      const s2y = h * 0.36;
      const s2r = Math.max(4, Math.min(w, h) * 0.095);
      v.glow(s1x, s1y, s1r * 2.2, rgb('#ffdd73'), 0.45);
      v.glow(s2x, s2y, s2r * 2.2, rgb('#ff7eb6'), 0.4);
      v.obj((l) => {
        l.disc(s1x, s1y, s1r, rgrad(s1x - 2, s1y - 2, s1r * 1.1, [rgb('#fffbe0'), rgb('#ffd43b'), rgb('#ff8c38')]));
      }, { rim: 0.15 });
      v.obj((l) => {
        l.disc(s2x, s2y, s2r, rgrad(s2x - 1, s2y - 1, s2r * 1.1, [rgb('#fff0f6'), rgb('#ff85b3'), rgb('#d63b7a')]));
      }, { rim: 0.15 });
      // Rolling twilight hills
      const hy = Math.round(h * 0.68);
      v.ellipse(w * 0.28, hy + 10, w * 0.5, h * 0.16, rgb('#5e2a6e'));
      v.ellipse(w * 0.78, hy + 12, w * 0.48, h * 0.16, rgb('#451c59'));
      // Iconic flat-top acacia tree silhouette on right ridge
      const tx = w * 0.72;
      const ty = hy + 2;
      v.obj((l) => {
        l.capsule(tx, ty + 4, tx - 1, ty - 10, 1.3, rgb('#2a1447'), 0.9);
        l.line(tx - 1, ty - 6, tx - 7, ty - 10, rgb('#2a1447'));
        l.line(tx - 1, ty - 7, tx + 6, ty - 11, rgb('#2a1447'));
        l.ellipse(tx - 1, ty - 12, w * 0.16, 3.2, rgb('#2a1447'));
        l.ellipse(tx - 6, ty - 10, w * 0.09, 2.2, rgb('#361a59'));
      }, { ink: false, rim: 0.1 });
      // Foreground warm savannah ground & swaying cosmic golden-teal grass blades
      v.rect(0, hy + 5, w, h, vgrad(hy + 5, h, [rgb('#c96832'), rgb('#7d2e4c'), rgb('#3d194d')], true));
      for (let gx = 3; gx < w - 2; gx += 4) {
        const sway = Math.sin(gx * 0.25) * 3;
        const gh = 6 + (gx % 5);
        const col = gx % 8 === 3 ? rgb('#7fe7f0') : rgb('#ffd452');
        v.line(gx, h, gx + sway, h - gh, col);
        if (gx % 12 === 3) v.dot(gx + sway, h - gh - 1, WHITE);
      }
      break;
    }

    case 'saturnRings': {
      // Deep royal-indigo starfield with big tilted ringed planet + glittering concentric rings
      v.fill(vgrad(0, h, [rgb('#110b30'), rgb('#26185e'), rgb('#4c2882'), rgb('#261a57')], true));
      starField(v, hashString('sat-s'), 2, 2, w - 2, h - 2, 32, [WHITE, rgb('#ffe999'), rgb('#b8e6ff'), rgb('#ffb8eb')]);
      const py = h * 0.5;
      const pr = Math.max(8, Math.min(w, h) * 0.24);
      const tilt = -0.34;
      v.glow(cx, py, pr * 2.2, rgb('#b69cff'), 0.3);
      // Back half of rings (upper arc)
      v.obj((l) => {
        l.ering(cx, py, pr * 2.05, pr * 0.62, 0.56, (x, y) => {
          const d = Math.hypot((x - cx) * Math.cos(tilt) + (y - py) * Math.sin(tilt), (-(x - cx) * Math.sin(tilt) + (y - py) * Math.cos(tilt)) * 3.3) / (pr * 2.05);
          return bandsRing(d);
        }, tilt);
        // mask out the front half (below tilted midline)
        for (let y = 0; y < h; y++) {
          for (let x = 0; x < w; x++) {
            const vrot = -(x - cx) * Math.sin(tilt) + (y - py) * Math.cos(tilt);
            if (vrot > 0) l.data[(y * w + x) * 4 + 3] = 0;
          }
        }
      }, { rim: 0.1 });
      // Planet sphere with warm striped bands
      v.obj((l) => {
        l.disc(cx, py, pr, (x, y) => {
          const dy = (y - py) / pr;
          const dx = (x - cx) / pr;
          const band = Math.sin(dy * 9 + dx * 1.2) * 0.5 + 0.5;
          const base = ramp([rgb('#fff0b8'), rgb('#ffb578'), rgb('#f082a8'), rgb('#a868d4')], (dy + 1) * 0.5);
          const lit = mix(base, WHITE, Math.max(0, 0.35 - Math.hypot(dx + 0.35, dy + 0.35) * 0.4));
          return mix(lit, shade(base, 0.32), band * 0.35);
        });
      }, { rim: 0.25, deep: true });
      // Front half of rings sweeping over the planet
      v.obj((l) => {
        l.ering(cx, py, pr * 2.05, pr * 0.62, 0.56, (x, y) => {
          const d = Math.hypot((x - cx) * Math.cos(tilt) + (y - py) * Math.sin(tilt), (-(x - cx) * Math.sin(tilt) + (y - py) * Math.cos(tilt)) * 3.3) / (pr * 2.05);
          return bandsRing(d);
        }, tilt);
        for (let y = 0; y < h; y++) {
          for (let x = 0; x < w; x++) {
            const vrot = -(x - cx) * Math.sin(tilt) + (y - py) * Math.cos(tilt);
            if (vrot <= 0) l.data[(y * w + x) * 4 + 3] = 0;
          }
        }
      }, { rim: 0.15 });
      // Glitter sparkles along the ring
      v.sparkle(cx - pr * 1.45, py + pr * 0.38, 2, WHITE, rgb('#9bf6ff'));
      v.sparkle(cx + pr * 1.38, py - pr * 0.32, 2, rgb('#ffe999'), WHITE);
      v.sparkle(cx + pr * 0.4, py + pr * 0.55, 1, rgb('#ffb8eb'));
      break;
    }

    case 'bubbleTea': {
      // Pastel taro-lavender & warm milk-tea pink sky, giant bubble-tea cup with fat straw & floating zero-g boba pearls
      v.fill(vgrad(0, h, [rgb('#513478'), rgb('#9e6bb5'), rgb('#f2b6c9'), rgb('#ffe8d6')], true));
      starField(v, hashString('boba-s'), 2, 2, w - 2, h * 0.6, 16, [WHITE, rgb('#fff2c2')]);
      const cupX = cx;
      const cupY = h * 0.6;
      const cw = Math.max(9, w * 0.23);
      const ch = Math.max(12, h * 0.23);
      // Chunky fat boba straw
      v.obj((l) => {
        l.capsule(cupX + cw * 0.1, cupY - ch * 0.4, cupX + cw * 0.42, cupY - ch * 1.45, Math.max(2.3, cw * 0.18), rgb('#6be3d4'));
        l.line(cupX + cw * 0.05, cupY - ch * 0.5, cupX + cw * 0.32, cupY - ch * 1.4, WHITE);
      }, { rim: 0.2 });
      // Dome lid & translucent milk-tea cup
      v.obj((l) => {
        // Dome lid
        l.ellipse(cupX, cupY - ch * 0.72, cw * 0.98, ch * 0.42, rgb('#fff5fa'));
        // Cup body
        l.poly([
          [cupX - cw, cupY - ch * 0.65],
          [cupX + cw, cupY - ch * 0.65],
          [cupX + cw * 0.72, cupY + ch * 0.85],
          [cupX - cw * 0.72, cupY + ch * 0.85],
        ], vgrad(cupY - ch * 0.65, cupY + ch * 0.85, [rgb('#f7d5b0'), rgb('#e0a97b'), rgb('#b87852')], true));
        // Lid rim band
        l.rect(cupX - cw - 1, cupY - ch * 0.72, cupX + cw + 1, cupY - ch * 0.52, rgb('#ff8fb8'));
        // Gloss highlight
        l.line(cupX - cw * 0.7, cupY - ch * 0.4, cupX - cw * 0.52, cupY + ch * 0.6, WHITE);
        // Chewy glossy boba pearls packed at bottom of cup
        const pr = Math.max(2, cw * 0.19);
        const pearls: Pt[] = [
          [cupX - cw * 0.38, cupY + ch * 0.55],
          [cupX, cupY + ch * 0.6],
          [cupX + cw * 0.38, cupY + ch * 0.52],
          [cupX - cw * 0.2, cupY + ch * 0.26],
          [cupX + cw * 0.24, cupY + ch * 0.24],
        ];
        for (const [px, py] of pearls) {
          l.disc(px, py, pr, rgb('#3b2140'));
          l.dot(px - 1, py - 1, WHITE);
        }
      }, { rim: 0.22 });
      // Zero-G boba pearls floating around in the air!
      const floaters: Array<[number, number, number]> = [
        [w * 0.2, h * 0.3, 3.0],
        [w * 0.78, h * 0.34, 2.7],
        [w * 0.22, h * 0.56, 2.3],
        [w * 0.8, h * 0.58, 3.2],
        [w * 0.34, h * 0.2, 2.1],
      ];
      for (const [fx, fy, fr] of floaters) {
        v.obj((l) => {
          l.disc(fx, fy, fr, rgb('#42244a'));
          l.dot(fx - 1, fy - 1, rgb('#ffd9f0'));
        }, { rim: 0.15 });
      }
      v.sparkle(w * 0.26, h * 0.24, 2, WHITE);
      break;
    }

    case 'whaleSea': {
      // Deep celestial sea of stars, constellation lines, glowing star-whale swimming above wavy cosmic tide
      v.fill(vgrad(0, h, [rgb('#0b1138'), rgb('#162766'), rgb('#1d4685'), rgb('#25699e')], true));
      starField(v, hashString('whale-s'), 2, 2, w - 2, h * 0.72, 28, [WHITE, rgb('#9bf6ff'), rgb('#ffd97d')]);
      // Constellation lines in upper sky
      const cPts: Pt[] = [
        [w * 0.2, h * 0.24],
        [w * 0.35, h * 0.17],
        [w * 0.53, h * 0.22],
        [w * 0.72, h * 0.16],
        [w * 0.82, h * 0.27],
      ];
      v.polyline(cPts, rgb('#6cb8e8'));
      for (const [px, py] of cPts) v.sparkle(px, py, 1, rgb('#b8f2ff'), WHITE);
      // Graceful star-whale arcing across mid-frame
      const wx = cx;
      const wy = h * 0.5;
      const ws = Math.max(11, Math.min(w, h) * 0.28);
      v.glow(wx, wy, ws * 1.4, rgb('#5ce1ff'), 0.28);
      v.obj((l) => {
        // Whale torso & rounded head (facing left)
        l.ellipse(wx - ws * 0.12, wy, ws * 0.78, ws * 0.44, vgrad(wy - ws * 0.45, wy + ws * 0.45, [rgb('#4a6fe8'), rgb('#689cff'), rgb('#9ceeff')], true), -0.1);
        // Tail stalk + twin flukes sweeping up-right
        l.stroke([
          [wx + ws * 0.35, wy + ws * 0.05],
          [wx + ws * 0.75, wy + ws * 0.02],
          [wx + ws * 1.0, wy - ws * 0.28],
        ], ws * 0.2, rgb('#547ff0'), ws * 0.08);
        l.poly([
          [wx + ws * 0.85, wy - ws * 0.24],
          [wx + ws * 1.22, wy - ws * 0.52],
          [wx + ws * 1.08, wy - ws * 0.14],
        ], rgb('#7cc4ff'));
        l.poly([
          [wx + ws * 0.85, wy - ws * 0.2],
          [wx + ws * 1.24, wy - ws * 0.02],
          [wx + ws * 0.96, wy + ws * 0.02],
        ], rgb('#689cff'));
        // Belly & pectoral fin
        l.ellipse(wx - ws * 0.22, wy + ws * 0.24, ws * 0.5, ws * 0.16, rgb('#cbf7ff'), -0.1);
        l.poly([
          [wx - ws * 0.12, wy + ws * 0.18],
          [wx - ws * 0.35, wy + ws * 0.56],
          [wx + ws * 0.12, wy + ws * 0.25],
        ], rgb('#547ff0'));
        // Tiny twinkling star freckles on back & gentle eye
        l.dot(wx - ws * 0.55, wy + 1, INK);
        l.dot(wx - ws * 0.56, wy, WHITE);
        l.dot(wx - ws * 0.1, wy - ws * 0.14, rgb('#fff4b8'));
        l.dot(wx + ws * 0.18, wy - ws * 0.1, WHITE);
        l.dot(wx + ws * 0.38, wy - ws * 0.04, rgb('#9bf6ff'));
      }, { rim: 0.25 });
      // Wavy starlight sea at bottom
      for (let row = 0; row < 3; row++) {
        const yBase = h * (0.76 + row * 0.08);
        const col = row === 0 ? rgb('#2b6cb0') : row === 1 ? rgb('#1f4e8c') : rgb('#153366');
        v.shape(0, yBase - 4, w, h, (x, y) => y >= yBase + Math.sin(x * 0.18 + row * 1.8) * 2.5, col);
        for (let x = 2; x < w - 2; x += 5) {
          const wy2 = Math.round(yBase + Math.sin(x * 0.18 + row * 1.8) * 2.5);
          v.dot(x, wy2, rgb('#9bf6ff'));
        }
      }
      break;
    }

    case 'heartOfUniverse': {
      // Radiant mandala heart in gold/pink/violet with rotating sunburst rays & ornate lotus mandala rings
      const hy = h * 0.5;
      v.fill((x, y) => {
        const dx = x - cx;
        const dy = y - hy;
        const a = Math.atan2(dy, dx);
        const r = Math.hypot(dx, dy) / (Math.max(w, h) * 0.62);
        const ray = Math.sin(a * 12) * 0.5 + 0.5;
        const base = ramp([rgb('#d9579c'), rgb('#7b2c99'), rgb('#37196e'), rgb('#180d3d')], Math.min(1, r));
        return mix(base, rgb('#ffd973'), ray * (1 - Math.min(1, r * 0.85)) * 0.48);
      });
      // Concentric ornate mandala halo + 8 crisp inked golden/rose lotus petals
      const mr = Math.max(11, Math.min(w, h) * 0.37);
      v.glow(cx, hy, mr * 1.45, rgb('#ff9ecf'), 0.38);
      v.obj((l) => {
        for (let i = 0; i < 8; i++) {
          const a = (i * Math.PI) / 4;
          const px = cx + Math.cos(a) * mr * 0.82;
          const py = hy + Math.sin(a) * mr * 0.82;
          l.ellipse(px, py, mr * 0.3, mr * 0.14, i % 2 === 0 ? rgb('#ffe066') : rgb('#ff8ec6'), a);
        }
        l.ring(cx, hy, mr * 0.66, mr * 0.78, rgb('#ffd43b'));
      }, { rim: 0.15 });
      // Hero cosmic mandala heart in gold/rose
      const hs = Math.max(7, Math.min(w, h) * 0.22);
      v.obj((l) => {
        l.heart(cx, hy + hs * 0.08, hs, rgrad(cx - hs * 0.2, hy - hs * 0.2, hs * 1.25, [rgb('#fff8cf'), rgb('#ff9ec9'), rgb('#ff478a'), rgb('#b82473')]));
        // Inner golden heart gem
        l.heart(cx, hy + hs * 0.1, hs * 0.46, rgrad(cx - 1, hy - 1, hs * 0.6, [WHITE, rgb('#ffe66d'), rgb('#ffa938')]));
      }, { rim: 0.25, deep: true });
      v.sparkle(cx, hy - mr * 1.1, 2, WHITE, rgb('#ffe66d'));
      v.sparkle(cx - mr * 1.0, hy, 2, WHITE, rgb('#ffb3e0'));
      v.sparkle(cx + mr * 1.0, hy, 2, WHITE, rgb('#9bf6ff'));
      break;
    }
  }
  return v;
}

function bandsRing(d: number): RGB {
  if (d < 0.67) return rgb('#fff2c4');
  if (d < 0.74) return rgb('#e6c28c');
  if (d < 0.82) return rgb('#c79eff');
  if (d < 0.91) return rgb('#ffe6a3');
  return rgb('#9bf6ff');
}

export function drawDoor(chapter: ChapterId, lw: number, lh: number): Canvas {
  const c = new Canvas(lw, lh);
  const cx = lw * 0.5;

  // 1. Cozy starry cosmic background behind the standing Star-Door
  c.fill(vgrad(0, lh, [BG_TOP, BG_BOT, rgb('#1c103b')], true));
  starField(c, hashString(`door-bg:${chapter}`), 1, 1, lw - 1, lh - 1, 20, [rgb('#c9b8ff'), WHITE, rgb('#ffe699')]);

  // 2. Compute arched door geometry adapting cleanly to portrait & landscape ratios
  const marginX = Math.max(4, Math.round(lw * 0.1));
  const marginTop = Math.max(5, Math.round(lh * 0.08));
  const stepH = Math.max(5, Math.round(lh * 0.095));
  const frameT = Math.max(4, Math.round(Math.min(lw, lh) * 0.095));

  const outerL = marginX;
  const outerR = lw - marginX;
  const outerW = outerR - outerL;
  const outerRx = outerW * 0.5;
  const outerRy = Math.min(outerRx * 0.95, (lh - marginTop - stepH) * 0.48);
  const archCy = marginTop + outerRy;
  const baseBottom = lh - stepH;

  const innerRx = Math.max(6, outerRx - frameT);
  const innerRy = Math.max(6, outerRy - frameT);

  const inArch = (x: number, y: number, rx: number, ry: number): boolean => {
    if (y >= baseBottom) return false;
    if (y >= archCy) return Math.abs(x - cx) <= rx;
    const dx = (x - cx) / rx;
    const dy = (y - archCy) / ry;
    return dx * dx + dy * dy <= 1;
  };

  // Subtle magical aura glow radiating from the Star-Door
  c.glow(cx, archCy + (baseBottom - archCy) * 0.35, Math.max(outerRx, lh * 0.45) * 1.25, rgb('#9d7aff'), 0.32);

  // 3. Draw ornate arched door frame (violet stone jambs + gilded trim + ink outline)
  c.obj((l) => {
    // Outer violet-stone arch body
    l.shape(outerL - 1, marginTop - 1, outerR + 1, baseBottom + 1, (px, py) => inArch(px, py, outerRx, outerRy), (x, y) => {
      const distEdge = Math.abs(x - cx) / outerRx;
      const base = mix(STONE_HI, STONE_LO, Math.min(1, y / lh) * 0.65 + distEdge * 0.25);
      // subtle carved stone masonry bands along jambs
      return y > archCy && Math.floor(y) % 6 === 0 ? shade(base, 0.22) : base;
    });
    // Outer gilded rim accent
    l.shape(outerL, marginTop, outerR, baseBottom, (px, py) => inArch(px, py, outerRx - 0.8, outerRy - 0.8) && !inArch(px, py, outerRx - 2.3, outerRy - 2.3), (x, y) =>
      mix(GOLD_HI, GOLD_LO, (x + y) / (lw + lh)),
    );
    // Inner gilded bezel hugging the portal opening
    l.shape(outerL, marginTop, outerR, baseBottom, (px, py) => inArch(px, py, innerRx + 2.2, innerRy + 2.2) && !inArch(px, py, innerRx, innerRy), (x, y) =>
      mix(GOLD_HI, GOLD_MID, Math.abs(x - cx) / outerRx * 0.7 + (y / lh) * 0.3),
    );
    // Decorative little gold studs along the arch curve
    for (let i = 1; i <= 7; i++) {
      const a = Math.PI + (i / 8) * Math.PI;
      const sx = cx + Math.cos(a) * (innerRx + frameT * 0.5);
      const sy = archCy + Math.sin(a) * (innerRy + frameT * 0.5);
      l.disc(sx, sy, 1.0, GOLD_HI);
    }
    // Carved side pilasters / column plinths
    const pilW = Math.max(3, Math.round(frameT * 0.85));
    l.rect(outerL - 1, baseBottom - 4, outerL + pilW + 1, baseBottom + 1, TRIM_HI);
    l.rect(outerR - pilW - 1, baseBottom - 4, outerR + 1, baseBottom + 1, TRIM_HI);
  }, { rim: 0.26, deep: true });

  // 4. Paint the chapter mini vignette inside the arched portal opening!
  const vigX0 = Math.max(0, Math.floor(cx - innerRx));
  const vigY0 = Math.max(0, Math.floor(archCy - innerRy));
  const vigW = Math.max(8, Math.ceil(innerRx * 2));
  const vigH = Math.max(8, Math.ceil(baseBottom - vigY0));
  const vig = paintVignette(chapter, vigW, vigH);

  // Blit vignette pixels clipped to inner arch + crisp 1px inner ink rim
  for (let y = vigY0; y < baseBottom; y++) {
    for (let x = vigX0; x < vigX0 + vigW; x++) {
      if (!c.inb(x, y)) continue;
      if (!inArch(x + 0.5, y + 0.5, innerRx, innerRy)) continue;
      const vx = Math.min(vigW - 1, Math.max(0, x - vigX0));
      const vy = Math.min(vigH - 1, Math.max(0, y - vigY0));
      c.set(x, y, vig.get(vx, vy));
    }
  }
  // 1px ink outline hugging inside of the door opening so the frame pops over the vignette
  for (let y = vigY0 - 1; y <= baseBottom; y++) {
    for (let x = vigX0 - 1; x <= vigX0 + vigW; x++) {
      if (!c.inb(x, y)) continue;
      if (!inArch(x + 0.5, y + 0.5, innerRx, innerRy)) continue;
      const edge =
        !inArch(x - 0.5, y + 0.5, innerRx, innerRy) ||
        !inArch(x + 1.5, y + 0.5, innerRx, innerRy) ||
        !inArch(x + 0.5, y - 0.5, innerRx, innerRy) ||
        !inArch(x + 0.5, y + 1.5, innerRx, innerRy);
      if (edge) c.set(x, y, INK);
    }
  }

  // 5. Glowing golden threshold & twin storybook steps at the bottom
  c.obj((l) => {
    const s1y = baseBottom;
    const s2y = Math.min(lh - 2, baseBottom + Math.max(2, Math.round(stepH * 0.5)));
    l.rect(outerL - 1, s1y, outerR + 1, s2y, vgrad(s1y, s2y, [GOLD_HI, GOLD_MID]));
    l.rect(outerL - 3, s2y, outerR + 3, lh - 1, vgrad(s2y, lh - 1, [TRIM_HI, TRIM_MID, TRIM_LO]));
    // Magical threshold gleam spilling onto top step
    l.rect(cx - innerRx * 0.72, s1y, cx + innerRx * 0.72, s1y + 2, CREAM);
  }, { rim: 0.2 });

  // 6. Ornate Star Keystone crowning the arch apex
  const keyY = Math.max(4, Math.round(marginTop + frameT * 0.42));
  const starR = Math.max(4.5, Math.min(lw, lh) * 0.088);
  c.glow(cx, keyY, starR * 2.1, GOLD_HI, 0.45);
  c.obj((l) => {
    // Shield/diamond backing plate
    l.poly([
      [cx, keyY - starR * 1.08],
      [cx + starR * 0.95, keyY],
      [cx, keyY + starR * 1.05],
      [cx - starR * 0.95, keyY],
    ], TRIM_MID);
    // Golden 5-point star keystone
    l.star(cx, keyY, starR, starR * 0.46, rgrad(cx - 1, keyY - 1, starR * 1.1, [WHITE, GOLD_HI, GOLD_MID, GOLD_LO]));
  }, { rim: 0.22 });

  // 7. Magical sparkles twinkling around the Star-Door
  c.sparkle(outerL - 1, marginTop + 5, 2, GOLD_HI, WHITE);
  c.sparkle(outerR + 1, marginTop + 7, 2, rgb('#b8f2ff'), WHITE);
  c.sparkle(outerL - 2, baseBottom - 8, 1, rgb('#ffb3e0'));
  c.sparkle(outerR + 2, baseBottom - 12, 1, GOLD_HI);

  return c;
}
