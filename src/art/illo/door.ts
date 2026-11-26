/**
 * Ornate Star-Door illustrations: gilded arched storybook portal framing a hand-drawn mini vignette
 * of the next chapter's world. Pure + deterministic.
 */
import type { ChapterId } from '../../contracts/roguelike';
import { CHAPTER_TO_UNIVERSE, UNIVERSE_BY_ID, type UniverseDef } from '../../contracts/universes';
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

    default: {
      paintMultiverseVignette(v, chapter, w, h);
      break;
    }
  }
  return v;
}

type DoorMotif =
  | 'jellyfish'
  | 'clamShell'
  | 'submarine'
  | 'galleon'
  | 'palace'
  | 'macaronTower'
  | 'ferrisWheel'
  | 'cupcake'
  | 'trainBridge'
  | 'volcano'
  | 'teapot'
  | 'cakeCastle'
  | 'toadstool'
  | 'glassDome'
  | 'storyTree'
  | 'lilyPond'
  | 'lanterns'
  | 'butterfly'
  | 'paperBoat'
  | 'origamiCrane'
  | 'windmill'
  | 'pagoda'
  | 'dragon'
  | 'pavilion'
  | 'dino'
  | 'fountain'
  | 'igloo'
  | 'bridge'
  | 'harp'
  | 'carousel'
  | 'airship'
  | 'clockwork'
  | 'clockTower'
  | 'robot'
  | 'orrery'
  | 'koi'
  | 'torii'
  | 'waterfall'
  | 'piano'
  | 'vinylMoon'
  | 'crystals'
  | 'geode'
  | 'oasis'
  | 'carpet'
  | 'pyramid'
  | 'book'
  | 'hourglass'
  | 'tent'
  | 'balloon'
  | 'pencils'
  | 'teacup'
  | 'spool'
  | 'pumpkin'
  | 'harvestMoon'
  | 'sunflower'
  | 'honeycomb'
  | 'arcade'
  | 'clawMachine'
  | 'lotus'
  | 'sphinx'
  | 'obelisk'
  | 'portalRing'
  | 'prismCrown'
  | 'lanternGate';

function pickChapterMotif(title: string, def: UniverseDef, slot: number, isB: boolean): DoorMotif {
  const t = title.toLowerCase();
  if (t.includes('prism crown')) return 'prismCrown';
  if (t.includes('twenty-one portals')) return 'portalRing';
  if (t.includes('jellyfish') || t.includes('coral & clouds')) return 'jellyfish';
  if (t.includes('clam') || t.includes('ammonite') || t.includes('symphony shell')) return 'clamShell';
  if (t.includes('submarine')) return 'submarine';
  if (t.includes('galleon') || t.includes('star-barge')) return 'galleon';
  if (t.includes('carousel')) return 'carousel';
  if (t.includes('ferris wheel') || t.includes('neon carnival')) return 'ferrisWheel';
  if (t.includes('macaron')) return 'macaronTower';
  if (t.includes('cupcake') || t.includes('cotton-candy')) return 'cupcake';
  if (t.includes('express') || t.includes('viaduct') || t.includes('minecart')) return 'trainBridge';
  if (t.includes('volcano') || t.includes('caldera')) return 'volcano';
  if (t.includes('teapot')) return 'teapot';
  if (t.includes('star-cake') || t.includes('mixing deck')) return 'cakeCastle';
  if (t.includes('toadstool') || t.includes('mother-cap') || t.includes('acorn')) return 'toadstool';
  if (t.includes('story tree') || t.includes('willow') || t.includes('orchard') || t.includes('terrarium')) return 'storyTree';
  if (t.includes('butterfly') || t.includes('luna-moth')) return 'butterfly';
  if (t.includes('crane') || t.includes('pterosaur') || t.includes('origami') || t.includes('dragon-kite')) return 'origamiCrane';
  if (t.includes('windmill') || t.includes('pinwheel')) return 'windmill';
  if (t.includes('pagoda') || t.includes('teahouse')) return 'pagoda';
  if (t.includes('paper-boat') || t.includes('cloud dock')) return 'paperBoat';
  if (t.includes('dragon')) return 'dragon';
  if (t.includes('brontosaurus') || t.includes('triceratops')) return 'dino';
  if (t.includes('igloo')) return 'igloo';
  if (t.includes('airship') || t.includes('skyship')) return 'airship';
  if (t.includes('clock-tower') || t.includes('bell-tower')) return 'clockTower';
  if (t.includes('robot')) return 'robot';
  if (t.includes('orrery') || t.includes('astrolabe') || t.includes('globe') || t.includes('marble') || t.includes('pinball') || t.includes('pearl-of-the-sky')) return 'orrery';
  if (t.includes('clockwork') || t.includes('wind-up') || t.includes('music-box')) return 'clockwork';
  if (t.includes('koi')) return 'koi';
  if (t.includes('torii') || t.includes('shrine') || t.includes('mountain gate')) return 'torii';
  if (t.includes('waterfall') || t.includes('quartz terraces')) return 'waterfall';
  if (t.includes('harp')) return 'harp';
  if (t.includes('piano') || t.includes('dance-pad')) return 'piano';
  if (t.includes('vinyl') || t.includes('roller-rink')) return 'vinylMoon';
  if (t.includes('geode')) return 'geode';
  if (t.includes('amethyst') || t.includes('crystal')) return 'crystals';
  if (t.includes('pyramid')) return 'pyramid';
  if (t.includes('carpet')) return 'carpet';
  if (t.includes('oasis') || t.includes('sand-dune')) return 'oasis';
  if (t.includes('hourglass')) return 'hourglass';
  if (t.includes('book') || t.includes('tome') || t.includes('pop-up') || t.includes('stamp-box')) return 'book';
  if (t.includes('big-top') || t.includes('fireworks ring')) return 'tent';
  if (t.includes('balloon')) return 'balloon';
  if (t.includes('pencil')) return 'pencils';
  if (t.includes('teacup')) return 'teacup';
  if (t.includes('spool') || t.includes('button')) return 'spool';
  if (t.includes('pumpkin')) return 'pumpkin';
  if (t.includes('harvest-moon')) return 'harvestMoon';
  if (t.includes('sunflower') || t.includes('sunbeam dome')) return 'sunflower';
  if (t.includes('honeycomb')) return 'honeycomb';
  if (t.includes('claw machine')) return 'clawMachine';
  if (t.includes('arcade') || t.includes('boss stage')) return 'arcade';
  if (t.includes('sphinx')) return 'sphinx';
  if (t.includes('obelisk')) return 'obelisk';
  if (t.includes('lotus')) return 'lotus';
  if (t.includes('fountain') || t.includes('geyser')) return 'fountain';
  if (t.includes('bridge') || t.includes('footbridge')) return 'bridge';
  if (t.includes('pond') || t.includes('brook') || t.includes('lake') || t.includes('marsh') || t.includes('rink')) return 'lilyPond';
  if (t.includes('palace') || t.includes('castle')) return 'palace';
  if (t.includes('dome') || t.includes('conservatory') || t.includes('fern')) return 'glassDome';
  if (t.includes('pavilion') || t.includes('gazebo') || t.includes('colonnade')) return 'pavilion';
  if (t.includes('lantern') || t.includes('chandelier') || t.includes('orchid')) return 'lanterns';
  if (t.includes('prism') || t.includes('mirror') || t.includes('prize')) return 'prismCrown';
  if (slot === 5) return 'palace';
  return isB ? 'pavilion' : def.ambient === 'bubbles' ? 'jellyfish' : 'lanternGate';
}

function paintAmbientParticles(v: Canvas, def: UniverseDef, seed: number, w: number, h: number): void {
  const rng = mulberry32(seed);
  const acc = rgb(def.accent);
  const soft = rgb(def.accentSoft);
  switch (def.ambient) {
    case 'bubbles':
      for (let i = 0; i < 10; i++) {
        const bx = rng.range(4, w - 4);
        const by = rng.range(4, h * 0.8);
        const br = rng.range(1.4, 2.8);
        v.ring(bx, by, br * 0.55, br, soft);
        v.dot(bx - 0.6, by - 0.6, WHITE);
      }
      break;
    case 'sprinkles':
    case 'confetti': {
      const cols = [acc, soft, WHITE, rgb('#70f5ff'), rgb('#ffd447')];
      for (let i = 0; i < 18; i++) {
        const x = Math.floor(rng.range(3, w - 3));
        const y = Math.floor(rng.range(3, h * 0.72));
        const c = rng.pick(cols);
        v.set(x, y, c);
        if (rng.chance(0.5)) v.set(x + 1, y, c);
      }
      break;
    }
    case 'fireflies':
    case 'embers':
      for (let i = 0; i < 12; i++) {
        const fx = rng.range(4, w - 4);
        const fy = rng.range(4, h * 0.82);
        v.glow(fx, fy, 3.2, def.ambient === 'fireflies' ? acc : GOLD_HI, 0.45);
        v.dot(fx, fy, WHITE);
      }
      break;
    case 'snow':
      for (let i = 0; i < 24; i++) {
        const sx = rng.range(2, w - 2);
        const sy = rng.range(2, h * 0.85);
        if (rng.chance(0.2)) v.sparkle(sx, sy, 1, WHITE, soft);
        else v.set(sx, sy, WHITE);
      }
      break;
    case 'petals':
    case 'leaves':
      for (let i = 0; i < 14; i++) {
        const px = rng.range(3, w - 3);
        const py = rng.range(3, h * 0.78);
        v.ellipse(px, py, 1.5, 0.9, rng.chance(0.55) ? acc : soft, rng.range(-1, 1));
      }
      break;
    case 'notes':
      starField(v, seed, 2, 2, w - 2, h * 0.52, 14, [WHITE, soft, acc]);
      for (let i = 0; i < 3; i++) {
        const nx = rng.range(w * 0.14, w * 0.86);
        const ny = rng.range(h * 0.14, h * 0.42);
        v.disc(nx, ny, 1.4, i % 2 === 0 ? GOLD_HI : soft);
        v.line(nx + 1, ny, nx + 1, ny - 5, i % 2 === 0 ? GOLD_HI : soft);
      }
      break;
    default:
      starField(v, seed, 2, 2, w - 2, h * 0.65, 22, [WHITE, GOLD_HI, acc, soft]);
      break;
  }
}

function paintMultiverseVignette(v: Canvas, chapter: ChapterId, w: number, h: number): void {
  const uId = CHAPTER_TO_UNIVERSE[chapter];
  const def = UNIVERSE_BY_ID[uId];
  const chDef = def.chapters.find((c) => c.id === chapter);
  const slot = chDef?.slot ?? 1;
  const isB = chapter.endsWith('b');
  const title = chDef?.title ?? chapter;
  const rng = mulberry32(hashString(`door-mv:${chapter}`));

  const skyTop = rgb(def.sky.top);
  const skyBot = rgb(def.sky.bottom);
  const skyMist = rgb(def.sky.mist);
  const acc = rgb(def.accent);
  const soft = rgb(def.accentSoft);
  const cx = w * 0.5;
  const s = Math.min(w, h);

  // 1. Bespoke sky gradient (varied gently between slot 1..5 and A/B branches)
  if (slot === 5) {
    // Grand Finale sunburst sky
    const fy = h * 0.46;
    v.fill((x, y) => {
      const dx = x - cx;
      const dy = y - fy;
      const a = Math.atan2(dy, dx);
      const dist = Math.hypot(dx, dy) / (Math.max(w, h) * 0.72);
      const ray = Math.sin(a * 12 + 0.4) * 0.5 + 0.5;
      const base = ramp([mix(skyMist, acc, 0.35), skyBot, skyTop], Math.min(1, dist));
      return mix(base, GOLD_HI, ray * (1 - Math.min(1, dist * 0.8)) * 0.34);
    });
  } else {
    const midSky = isB ? mix(skyBot, acc, 0.18) : mix(skyBot, soft, 0.14);
    const botSky = slot >= 4 ? mix(skyMist, acc, 0.24) : skyMist;
    v.fill(vgrad(0, h, [skyTop, midSky, skyBot, botSky], true));
  }

  // Celestial feature in upper sky (aurora, crescent moon, or glowing orb)
  const celX = isB ? w * rng.range(0.66, 0.78) : w * rng.range(0.22, 0.34);
  const celY = h * rng.range(0.18, 0.28);
  if (def.id === 'auroraIcePalace' || def.id === 'prismNexusMultiverse') {
    for (let i = 0; i < 2; i++) {
      v.stroke([
        [0, h * (0.2 + i * 0.1)],
        [w * 0.35, h * (0.1 + i * 0.08)],
        [w * 0.7, h * (0.24 + i * 0.06)],
        [w, h * (0.12 + i * 0.08)],
      ], 2.2, i === 0 ? acc : soft, 1.4);
    }
  } else if (slot !== 5) {
    const mr = Math.max(3.5, s * 0.1);
    v.glow(celX, celY, mr * 2.1, GOLD_HI, 0.34);
    if (isB) {
      v.disc(celX, celY, mr, rgrad(celX - 1, celY - 1, mr * 1.1, [WHITE, GOLD_HI, soft]));
    } else {
      v.shape(celX - mr, celY - mr, celX + mr, celY + mr, (px, py) =>
        Math.hypot(px - celX, py - celY) <= mr && Math.hypot(px - (celX + mr * 0.42), py - (celY - mr * 0.16)) >= mr * 0.82,
        GOLD_HI);
    }
  }

  // 2. Ambient particles tuned to universe
  paintAmbientParticles(v, def, hashString(`door-amb:${chapter}`), w, h);

  // 3. Horizon / ground silhouette tailored to universe & seeded per chapter
  const hy = Math.round(h * rng.range(0.68, 0.75));
  if (def.id === 'neonPixelArcade') {
    v.rect(0, hy, w, h, rgb('#140836'));
    for (let gy = hy; gy < h; gy += 5) v.line(0, gy, w, gy, acc);
    for (let i = -3; i <= 3; i++) v.line(cx + i * w * 0.12, hy, cx + i * w * 0.36, h, rgb('#7b2cff'));
  } else if (def.id === 'coralKingdom' || def.id === 'sakuraKoiGarden' || def.id === 'nileStarTemples') {
    v.rect(0, hy, w, h, vgrad(hy, h, [mix(skyBot, soft, 0.25), shade(skyTop, 0.2)], true));
    for (let x = 2; x < w - 2; x += 6) {
      v.line(x, hy + 4 + ((x + slot) % 5), x + 3, hy + 4 + ((x + slot) % 5), mix(WHITE, soft, 0.45));
    }
  } else if (def.id === 'sugarCloudBakery' || def.id === 'cloudCircusCarnival' || def.id === 'origamiSkyHarbor') {
    const cloudCol = def.id === 'origamiSkyHarbor' ? mix(skyBot, skyMist, 0.5) : CREAM;
    for (let i = 0; i < 5; i++) {
      v.disc((i / 4) * w, hy + 6 + (i % 2) * 3, w * 0.22, vgrad(hy - 6, h, [WHITE, cloudCol, mix(skyBot, cloudCol, 0.4)]));
    }
  } else {
    v.ellipse(w * (isB ? 0.72 : 0.28), hy + 10, w * 0.62, h * 0.2, mix(skyBot, acc, 0.16));
    v.ellipse(w * (isB ? 0.26 : 0.76), hy + 12, w * 0.58, h * 0.2, shade(skyBot, 0.24));
    v.rect(0, hy + 6, w, h, vgrad(hy + 6, h, [shade(skyBot, 0.12), shade(skyTop, 0.25)], true));
  }

  // 4. Title-faithful hand-inked hero focal illustration
  const motif = pickChapterMotif(title, def, slot, isB);
  const fx = cx + rng.range(-w * 0.05, w * 0.05);
  const fy = h * 0.56;
  const r = Math.max(10, s * 0.31);
  v.glow(fx, fy - r * 0.1, r * 1.45, acc, 0.28);

  switch (motif) {
    case 'jellyfish':
      v.obj((l) => {
        for (const ox of [-0.45, -0.15, 0.15, 0.45]) {
          l.stroke([[fx + ox * r, fy + r * 0.05], [fx + (ox - 0.12) * r, fy + r * 0.52], [fx + (ox + 0.1) * r, fy + r * 0.92]], 1.2, soft);
        }
        l.arc(fx, fy + r * 0.06, 0, r * 0.76, Math.PI, Math.PI * 2, rgrad(fx - r * 0.2, fy - r * 0.2, r * 0.85, [WHITE, light(acc, 0.4), acc]));
        l.ellipse(fx, fy + r * 0.06, r * 0.74, r * 0.18, soft);
      }, { rim: 0.22 });
      break;

    case 'clamShell':
      v.obj((l) => {
        l.arc(fx, fy + r * 0.22, 0, r * 0.86, Math.PI * 1.05, Math.PI * 1.95, rgrad(fx, fy - r * 0.2, r * 0.9, [light(acc, 0.4), acc, shade(acc, 0.35)]));
        l.line(fx, fy + r * 0.18, fx - r * 0.5, fy - r * 0.38, GOLD_HI);
        l.line(fx, fy + r * 0.18, fx, fy - r * 0.56, GOLD_HI);
        l.line(fx, fy + r * 0.18, fx + r * 0.5, fy - r * 0.38, GOLD_HI);
        l.ellipse(fx, fy + r * 0.42, r * 0.8, r * 0.24, acc);
        l.disc(fx, fy + r * 0.18, r * 0.34, rgrad(fx - 2, fy + r * 0.08, r * 0.4, [WHITE, CREAM, soft]));
      }, { rim: 0.22 });
      break;

    case 'submarine':
      v.obj((l) => {
        l.rect(fx - r * 0.18, fy - r * 0.52, fx + r * 0.18, fy - r * 0.14, GOLD_MID);
        l.line(fx, fy - r * 0.52, fx, fy - r * 0.76, GOLD_HI);
        l.line(fx, fy - r * 0.76, fx + r * 0.22, fy - r * 0.76, GOLD_HI);
        l.ellipse(fx, fy + r * 0.08, r * 0.88, r * 0.48, vgrad(fy - r * 0.4, fy + r * 0.56, [GOLD_HI, acc, shade(acc, 0.3)]));
        for (const px of [-0.36, 0, 0.36]) {
          l.disc(fx + px * r, fy + r * 0.06, r * 0.18, soft);
          l.dot(fx + px * r - 1, fy + r * 0.02, WHITE);
        }
      }, { rim: 0.22 });
      break;

    case 'galleon':
      v.obj((l) => {
        l.line(fx, fy - r * 0.86, fx, fy + r * 0.3, GOLD_MID);
        l.poly([[fx, fy - r * 0.8], [fx + r * 0.62, fy - r * 0.22], [fx, fy + r * 0.06]], vgrad(fy - r * 0.8, fy, [WHITE, CREAM, soft]));
        l.poly([[fx - r * 0.06, fy - r * 0.66], [fx - r * 0.56, fy - r * 0.16], [fx - r * 0.06, fy + r * 0.04]], light(acc, 0.45));
        l.poly([[fx - r * 0.84, fy + r * 0.14], [fx + r * 0.84, fy + r * 0.14], [fx + r * 0.56, fy + r * 0.62], [fx - r * 0.56, fy + r * 0.62]], vgrad(fy + r * 0.14, fy + r * 0.62, [GOLD_MID, acc, shade(acc, 0.4)]));
      }, { rim: 0.22 });
      break;

    case 'palace':
      v.obj((l) => {
        for (const sx of [-0.58, 0.58]) {
          l.rect(fx + sx * r - r * 0.18, fy - r * 0.12, fx + sx * r + r * 0.18, fy + r * 0.68, vgrad(fy - r * 0.12, fy + r * 0.68, [light(soft, 0.35), soft, skyBot]));
          l.poly([[fx + sx * r - r * 0.24, fy - r * 0.1], [fx + sx * r, fy - r * 0.66], [fx + sx * r + r * 0.24, fy - r * 0.1]], acc);
        }
        l.rect(fx - r * 0.4, fy - r * 0.26, fx + r * 0.4, fy + r * 0.68, vgrad(fy - r * 0.26, fy + r * 0.68, [WHITE, light(acc, 0.45), soft]));
        l.poly([[fx - r * 0.36, fy - r * 0.24], [fx, fy - r * 0.96], [fx + r * 0.36, fy - r * 0.24]], (x) => (x < fx ? GOLD_HI : acc));
        l.rrect(fx - r * 0.16, fy + r * 0.22, fx + r * 0.16, fy + r * 0.68, r * 0.12, GOLD_HI);
      }, { rim: 0.22 });
      break;

    case 'macaronTower':
      v.obj((l) => {
        const layers: Array<[number, number, RGB]> = [
          [0.44, 0.72, acc],
          [0.14, 0.58, soft],
          [-0.14, 0.44, rgb('#7ff5d4')],
          [-0.4, 0.3, GOLD_HI],
        ];
        for (const [oy, rw, col] of layers) {
          l.ellipse(fx, fy + oy * r + 2, r * rw, r * 0.16, col);
          l.ellipse(fx, fy + oy * r - 2, r * rw, r * 0.16, light(col, 0.2));
          l.rect(fx - r * rw * 0.9, fy + oy * r - 1, fx + r * rw * 0.9, fy + oy * r + 1.5, WHITE);
        }
        l.star(fx, fy - r * 0.68, r * 0.22, r * 0.1, GOLD_HI);
      }, { rim: 0.2 });
      break;

    case 'ferrisWheel':
      v.obj((l) => {
        const wr = r * 0.76;
        const wy = fy - r * 0.1;
        l.line(fx - wr * 0.6, wy + wr * 1.08, fx, wy, GOLD_MID);
        l.line(fx + wr * 0.6, wy + wr * 1.08, fx, wy, GOLD_MID);
        l.ring(fx, wy, wr * 0.78, wr, lgrad(fx - wr, wy - wr, fx + wr, wy + wr, [GOLD_HI, acc, soft]));
        for (let i = 0; i < 8; i++) {
          const a = (i * Math.PI) / 4;
          l.line(fx, wy, fx + Math.cos(a) * wr, wy + Math.sin(a) * wr, GOLD_HI);
          l.disc(fx + Math.cos(a) * wr, wy + Math.sin(a) * wr, Math.max(2, r * 0.14), i % 2 === 0 ? acc : soft);
        }
        l.disc(fx, wy, r * 0.18, WHITE);
      }, { rim: 0.2 });
      break;

    case 'cupcake':
      v.obj((l) => {
        l.poly([[fx - r * 0.64, fy + r * 0.08], [fx + r * 0.64, fy + r * 0.08], [fx + r * 0.44, fy + r * 0.68], [fx - r * 0.44, fy + r * 0.68]], vgrad(fy, fy + r * 0.7, [GOLD_MID, acc]));
        l.disc(fx - r * 0.3, fy - r * 0.04, r * 0.36, light(acc, 0.45));
        l.disc(fx + r * 0.3, fy - r * 0.04, r * 0.36, light(acc, 0.45));
        l.disc(fx, fy - r * 0.32, r * 0.42, WHITE);
        l.disc(fx, fy - r * 0.7, r * 0.18, rgb('#ff3b6b'));
      }, { rim: 0.22 });
      break;

    case 'trainBridge':
      v.obj((l) => {
        // Arched viaduct bridge
        l.rect(fx - r * 1.15, fy + r * 0.32, fx + r * 1.15, fy + r * 0.56, soft);
        // Cute puffing candy/crystal locomotive
        l.rrect(fx - r * 0.66, fy - r * 0.12, fx + r * 0.18, fy + r * 0.3, r * 0.08, acc);
        l.rrect(fx + r * 0.14, fy - r * 0.34, fx + r * 0.66, fy + r * 0.3, r * 0.08, GOLD_MID);
        l.rect(fx - r * 0.54, fy - r * 0.46, fx - r * 0.32, fy - r * 0.1, GOLD_HI);
        l.disc(fx - r * 0.44, fy - r * 0.66, r * 0.18, WHITE);
        l.disc(fx - r * 0.24, fy - r * 0.78, r * 0.14, CREAM);
        for (const wx of [-0.42, -0.02, 0.42]) l.disc(fx + wx * r, fy + r * 0.3, r * 0.16, GOLD_HI);
      }, { rim: 0.22 });
      break;

    case 'volcano':
      v.obj((l) => {
        l.poly([[fx - r * 0.92, fy + r * 0.68], [fx - r * 0.28, fy - r * 0.36], [fx + r * 0.28, fy - r * 0.36], [fx + r * 0.92, fy + r * 0.68]], vgrad(fy - r * 0.36, fy + r * 0.68, [acc, skyBot, shade(skyTop, 0.2)]));
        l.ellipse(fx, fy - r * 0.36, r * 0.28, r * 0.1, GOLD_HI);
        l.disc(fx, fy - r * 0.66, r * 0.26, light(acc, 0.45));
        l.disc(fx - r * 0.22, fy - r * 0.78, r * 0.18, WHITE);
        l.star(fx + r * 0.26, fy - r * 0.82, r * 0.18, r * 0.08, GOLD_HI);
      }, { rim: 0.22 });
      break;

    case 'teapot':
      v.obj((l) => {
        l.ring(fx + r * 0.56, fy + r * 0.12, r * 0.16, r * 0.3, GOLD_HI);
        l.stroke([[fx - r * 0.48, fy + r * 0.18], [fx - r * 0.86, fy - r * 0.18]], r * 0.14, light(acc, 0.3), r * 0.09);
        l.ellipse(fx, fy + r * 0.16, r * 0.66, r * 0.52, rgrad(fx - r * 0.2, fy - r * 0.05, r * 0.75, [WHITE, light(acc, 0.35), acc]));
        l.ellipse(fx, fy - r * 0.34, r * 0.38, r * 0.14, GOLD_HI);
        l.disc(fx, fy - r * 0.5, r * 0.12, GOLD_MID);
        l.rrect(fx - r * 0.16, fy + r * 0.12, fx + r * 0.16, fy + r * 0.56, r * 0.1, GOLD_HI);
      }, { rim: 0.22 });
      break;

    case 'cakeCastle':
      v.obj((l) => {
        l.rrect(fx - r * 0.74, fy + r * 0.06, fx + r * 0.74, fy + r * 0.66, r * 0.1, vgrad(fy, fy + r * 0.66, [light(acc, 0.3), acc]));
        l.rrect(fx - r * 0.76, fy + r * 0.02, fx + r * 0.76, fy + r * 0.2, r * 0.08, WHITE);
        l.rrect(fx - r * 0.46, fy - r * 0.42, fx + r * 0.46, fy + r * 0.06, r * 0.08, soft);
        l.poly([[fx - r * 0.48, fy - r * 0.4], [fx, fy - r * 0.88], [fx + r * 0.48, fy - r * 0.4]], acc);
        l.star(fx, fy - r * 0.92, r * 0.2, r * 0.09, GOLD_HI);
      }, { rim: 0.22 });
      break;

    case 'toadstool':
      v.obj((l) => {
        l.poly([[fx - r * 0.32, fy + r * 0.04], [fx + r * 0.32, fy + r * 0.04], [fx + r * 0.4, fy + r * 0.68], [fx - r * 0.4, fy + r * 0.68]], CREAM);
        l.disc(fx, fy + r * 0.36, r * 0.16, GOLD_HI);
        l.ellipse(fx, fy + r * 0.06, r * 0.84, r * 0.2, acc);
        l.arc(fx, fy + r * 0.06, 0, r * 0.88, Math.PI, Math.PI * 2, rgrad(fx - r * 0.2, fy - r * 0.3, r * 0.95, [rgb('#ff708c'), rgb('#e83862'), rgb('#9e1b4d')]));
        l.disc(fx - r * 0.42, fy - r * 0.22, r * 0.14, WHITE);
        l.disc(fx + r * 0.38, fy - r * 0.24, r * 0.13, CREAM);
        l.disc(fx, fy - r * 0.48, r * 0.16, WHITE);
      }, { rim: 0.22 });
      break;

    case 'glassDome':
      v.obj((l) => {
        l.arc(fx, fy + r * 0.56, 0, r * 0.88, Math.PI, Math.PI * 2, rgrad(fx - r * 0.25, fy - r * 0.1, r * 0.95, [WHITE, light(soft, 0.35), skyBot]));
        l.arc(fx, fy + r * 0.56, r * 0.78, r * 0.9, Math.PI, Math.PI * 2, GOLD_HI);
        l.line(fx, fy - r * 0.32, fx, fy + r * 0.56, GOLD_HI);
        l.rect(fx - r * 0.92, fy + r * 0.48, fx + r * 0.92, fy + r * 0.66, GOLD_MID);
        l.star(fx, fy + r * 0.12, r * 0.28, r * 0.14, acc);
      }, { rim: 0.22 });
      break;

    case 'storyTree':
      v.obj((l) => {
        l.poly([[fx - r * 0.26, fy + r * 0.7], [fx - r * 0.18, fy - r * 0.04], [fx + r * 0.18, fy - r * 0.04], [fx + r * 0.28, fy + r * 0.7]], rgb('#6b3b82'));
        l.disc(fx, fy + r * 0.36, r * 0.14, GOLD_HI);
        l.disc(fx - r * 0.42, fy - r * 0.12, r * 0.44, acc);
        l.disc(fx + r * 0.42, fy - r * 0.1, r * 0.42, soft);
        l.disc(fx, fy - r * 0.42, r * 0.52, light(acc, 0.25));
      }, { rim: 0.22 });
      break;

    case 'lilyPond':
      v.obj((l) => {
        l.ellipse(fx, fy + r * 0.36, r * 0.95, r * 0.32, rgrad(fx, fy + r * 0.36, r * 0.95, [light(soft, 0.4), soft, skyBot]));
        l.ellipse(fx - r * 0.36, fy + r * 0.34, r * 0.28, r * 0.12, rgb('#3be099'));
        l.ellipse(fx + r * 0.38, fy + r * 0.4, r * 0.24, r * 0.1, rgb('#3be099'));
        l.ellipse(fx - r * 0.14, fy + r * 0.16, r * 0.22, r * 0.12, acc, -0.5);
        l.ellipse(fx + r * 0.14, fy + r * 0.16, r * 0.22, r * 0.12, acc, 0.5);
        l.ellipse(fx, fy + r * 0.1, r * 0.14, r * 0.26, WHITE);
      }, { rim: 0.2 });
      break;

    case 'lanterns':
      for (const [ox, oy, sc] of [[-0.48, -0.26, 0.46], [0.46, -0.18, 0.44], [0, 0.14, 0.62]] as const) {
        const lx = fx + ox * r;
        const ly = fy + oy * r;
        const lr = r * sc;
        v.glow(lx, ly, lr * 1.6, GOLD_HI, 0.35);
        v.obj((l) => {
          l.ellipse(lx, ly, lr * 0.72, lr * 0.84, rgrad(lx, ly, lr * 0.85, [WHITE, GOLD_HI, acc]));
          l.rect(lx - lr * 0.42, ly - lr * 0.9, lx + lr * 0.42, ly - lr * 0.68, GOLD_MID);
          l.rect(lx - lr * 0.36, ly + lr * 0.68, lx + lr * 0.36, ly + lr * 0.86, GOLD_MID);
        }, { rim: 0.18 });
      }
      break;

    case 'butterfly':
      v.obj((l) => {
        l.ellipse(fx - r * 0.42, fy - r * 0.18, r * 0.46, r * 0.34, rgrad(fx - r * 0.42, fy - r * 0.2, r * 0.5, [WHITE, acc, soft]), -0.4);
        l.ellipse(fx + r * 0.42, fy - r * 0.18, r * 0.46, r * 0.34, rgrad(fx + r * 0.42, fy - r * 0.2, r * 0.5, [WHITE, acc, soft]), 0.4);
        l.ellipse(fx - r * 0.32, fy + r * 0.28, r * 0.32, r * 0.26, soft, 0.4);
        l.ellipse(fx + r * 0.32, fy + r * 0.28, r * 0.32, r * 0.26, soft, -0.4);
        l.capsule(fx, fy - r * 0.34, fx, fy + r * 0.46, r * 0.1, GOLD_HI);
      }, { rim: 0.22 });
      break;

    case 'paperBoat':
      v.obj((l) => {
        l.poly([[fx - r * 0.5, fy + r * 0.18], [fx, fy - r * 0.64], [fx + r * 0.5, fy + r * 0.18]], WHITE);
        l.poly([[fx - r * 0.86, fy + r * 0.08], [fx + r * 0.86, fy + r * 0.08], [fx + r * 0.56, fy + r * 0.56], [fx - r * 0.56, fy + r * 0.56]], lgrad(fx - r * 0.8, fy, fx + r * 0.8, fy, [CREAM, acc]));
      }, { rim: 0.22 });
      break;

    case 'origamiCrane':
      v.obj((l) => {
        l.poly([[fx - r * 0.1, fy + r * 0.04], [fx - r * 0.78, fy - r * 0.48], [fx + r * 0.22, fy - r * 0.18]], acc);
        l.poly([[fx - r * 0.44, fy + r * 0.3], [fx + r * 0.06, fy - r * 0.08], [fx + r * 0.48, fy + r * 0.26], [fx + r * 0.02, fy + r * 0.48]], CREAM);
        l.poly([[fx - r * 0.2, fy + r * 0.18], [fx + r * 0.18, fy - r * 0.74], [fx + r * 0.36, fy + r * 0.08]], WHITE);
        l.poly([[fx - r * 0.38, fy + r * 0.3], [fx - r * 0.76, fy - r * 0.18], [fx - r * 0.58, fy - r * 0.26], [fx - r * 0.22, fy + r * 0.16]], PAPER_LIGHT);
      }, { rim: 0.22 });
      break;

    case 'windmill':
      v.obj((l) => {
        l.poly([[fx - r * 0.44, fy + r * 0.7], [fx - r * 0.26, fy - r * 0.24], [fx + r * 0.26, fy - r * 0.24], [fx + r * 0.44, fy + r * 0.7]], vgrad(fy - r * 0.24, fy + r * 0.7, [CREAM, soft]));
        l.arc(fx, fy - r * 0.22, 0, r * 0.28, Math.PI, Math.PI * 2, acc);
        for (let i = 0; i < 4; i++) {
          const a = (i * Math.PI) / 2 + 0.45;
          l.ellipse(fx + Math.cos(a) * r * 0.48, fy - r * 0.22 + Math.sin(a) * r * 0.48, r * 0.42, r * 0.12, i % 2 === 0 ? GOLD_HI : acc, a);
        }
        l.disc(fx, fy - r * 0.22, r * 0.14, GOLD_MID);
      }, { rim: 0.22 });
      break;

    case 'pagoda':
      v.obj((l) => {
        for (let tier = 0; tier < 3; tier++) {
          const ty = fy + (0.36 - tier * 0.38) * r;
          const tw = (0.76 - tier * 0.16) * r;
          l.rect(fx - tw * 0.62, ty, fx + tw * 0.62, ty + r * 0.28, CREAM);
          l.poly([[fx - tw, ty + r * 0.04], [fx, ty - r * 0.22], [fx + tw, ty + r * 0.04]], tier % 2 === 0 ? acc : GOLD_MID);
        }
        l.line(fx, fy - r * 0.62, fx, fy - r * 0.9, GOLD_HI);
      }, { rim: 0.22 });
      break;

    case 'dragon':
      v.obj((l) => {
        l.stroke([
          [fx - r * 0.76, fy + r * 0.56],
          [fx - r * 0.3, fy + r * 0.26],
          [fx + r * 0.14, fy + r * 0.52],
          [fx + r * 0.44, fy + r * 0.08],
          [fx + r * 0.08, fy - r * 0.26],
        ], r * 0.18, vgrad(fy - r * 0.3, fy + r * 0.6, [light(acc, 0.35), acc, shade(acc, 0.3)]), r * 0.24);
        l.ellipse(fx + r * 0.02, fy - r * 0.28, r * 0.32, r * 0.22, acc);
        l.line(fx + r * 0.14, fy - r * 0.44, fx + r * 0.34, fy - r * 0.74, GOLD_HI);
        l.disc(fx - r * 0.54, fy - r * 0.36, r * 0.2, rgrad(fx - r * 0.58, fy - r * 0.4, r * 0.22, [WHITE, GOLD_HI, soft]));
      }, { rim: 0.22 });
      break;

    case 'pavilion':
      v.obj((l) => {
        l.rect(fx - r * 0.68, fy + r * 0.5, fx + r * 0.68, fy + r * 0.68, GOLD_MID);
        for (const px of [-0.52, -0.18, 0.18, 0.52]) {
          l.rect(fx + px * r - 1.5, fy - r * 0.16, fx + px * r + 1.5, fy + r * 0.52, CREAM);
        }
        l.poly([[fx - r * 0.84, fy - r * 0.12], [fx, fy - r * 0.72], [fx + r * 0.84, fy - r * 0.12]], vgrad(fy - r * 0.72, fy - r * 0.12, [GOLD_HI, acc]));
      }, { rim: 0.22 });
      break;

    case 'dino':
      v.obj((l) => {
        l.stroke([[fx - r * 0.82, fy + r * 0.54], [fx - r * 0.42, fy + r * 0.38], [fx - r * 0.1, fy + r * 0.34]], r * 0.14, acc, r * 0.24);
        l.ellipse(fx - r * 0.14, fy + r * 0.34, r * 0.42, r * 0.28, acc);
        l.rect(fx - r * 0.4, fy + r * 0.46, fx - r * 0.2, fy + r * 0.72, shade(acc, 0.2));
        l.rect(fx - r * 0.02, fy + r * 0.46, fx + r * 0.18, fy + r * 0.72, shade(acc, 0.2));
        l.stroke([[fx + r * 0.14, fy + r * 0.22], [fx + r * 0.24, fy - r * 0.18], [fx + r * 0.16, fy - r * 0.56]], r * 0.18, light(acc, 0.18), r * 0.14);
        l.ellipse(fx + r * 0.34, fy - r * 0.56, r * 0.28, r * 0.2, light(acc, 0.28));
        l.dot(fx + r * 0.38, fy - r * 0.6, INK);
      }, { rim: 0.22 });
      break;

    case 'fountain':
      v.obj((l) => {
        l.ellipse(fx, fy + r * 0.56, r * 0.78, r * 0.22, soft);
        l.rect(fx - r * 0.16, fy - r * 0.04, fx + r * 0.16, fy + r * 0.52, CREAM);
        l.ellipse(fx, fy - r * 0.02, r * 0.46, r * 0.14, GOLD_HI);
        l.stroke([[fx, fy - r * 0.1], [fx - r * 0.36, fy - r * 0.56], [fx - r * 0.56, fy + r * 0.42]], 1.4, WHITE);
        l.stroke([[fx, fy - r * 0.1], [fx + r * 0.36, fy - r * 0.56], [fx + r * 0.56, fy + r * 0.42]], 1.4, soft);
      }, { rim: 0.2 });
      break;

    case 'igloo':
      v.obj((l) => {
        l.arc(fx, fy + r * 0.56, 0, r * 0.84, Math.PI, Math.PI * 2, rgrad(fx - r * 0.2, fy - r * 0.1, r * 0.9, [WHITE, acc, skyBot]));
        l.arc(fx + r * 0.1, fy + r * 0.56, 0, r * 0.34, Math.PI, Math.PI * 2, GOLD_HI);
      }, { rim: 0.22 });
      break;

    case 'bridge':
      v.obj((l) => {
        l.arc(fx, fy + r * 0.96, r * 0.62, r * 0.96, Math.PI * 1.12, Math.PI * 1.88, vgrad(fy - r * 0.1, fy + r * 0.6, [acc, GOLD_MID]));
        l.arc(fx, fy + r * 0.96, r * 0.94, r * 1.06, Math.PI * 1.12, Math.PI * 1.88, GOLD_HI);
      }, { rim: 0.22 });
      break;

    case 'harp':
      v.obj((l) => {
        l.stroke([[fx - r * 0.46, fy + r * 0.62], [fx - r * 0.52, fy - r * 0.68], [fx + r * 0.54, fy - r * 0.34], [fx - r * 0.46, fy + r * 0.62]], r * 0.13, GOLD_HI);
        for (let i = 0; i < 4; i++) {
          const sx = fx + (-0.26 + i * 0.2) * r;
          l.line(sx, fy - r * (0.48 - i * 0.08), sx, fy + r * (0.36 - i * 0.14), i % 2 === 0 ? WHITE : soft);
        }
      }, { rim: 0.2 });
      break;

    case 'carousel':
      v.obj((l) => {
        l.rect(fx - r * 0.72, fy + r * 0.52, fx + r * 0.72, fy + r * 0.68, GOLD_MID);
        for (const px of [-0.46, 0, 0.46]) {
          l.line(fx + px * r, fy - r * 0.16, fx + px * r, fy + r * 0.52, GOLD_HI);
          l.ellipse(fx + px * r, fy + r * 0.24, r * 0.18, r * 0.12, px === 0 ? WHITE : soft);
        }
        l.poly([[fx - r * 0.84, fy - r * 0.14], [fx, fy - r * 0.76], [fx + r * 0.84, fy - r * 0.14]], (x) => (Math.floor((x - fx) / 4) % 2 === 0 ? acc : WHITE));
      }, { rim: 0.22 });
      break;

    case 'airship':
      v.obj((l) => {
        l.rrect(fx - r * 0.32, fy + r * 0.42, fx + r * 0.28, fy + r * 0.66, r * 0.08, GOLD_LO);
        l.poly([[fx + r * 0.48, fy - r * 0.12], [fx + r * 0.92, fy - r * 0.42], [fx + r * 0.78, fy + r * 0.02]], acc);
        l.ellipse(fx - r * 0.04, fy - r * 0.12, r * 0.76, r * 0.46, (_x, y) => (Math.abs(Math.sin(((y - (fy - r * 0.12)) / (r * 0.46)) * 4.5)) > 0.5 ? GOLD_HI : acc));
      }, { rim: 0.22 });
      break;

    case 'clockwork':
      v.obj((l) => {
        for (let i = 0; i < 8; i++) {
          const a = (i * Math.PI) / 4;
          l.capsule(fx - r * 0.16, fy + r * 0.08, fx - r * 0.16 + Math.cos(a) * r * 0.66, fy + r * 0.08 + Math.sin(a) * r * 0.66, r * 0.14, GOLD_MID);
        }
        l.ring(fx - r * 0.16, fy + r * 0.08, r * 0.24, r * 0.52, GOLD_HI);
        l.ring(fx + r * 0.42, fy - r * 0.36, r * 0.14, r * 0.36, soft);
      }, { rim: 0.22 });
      break;

    case 'clockTower':
      v.obj((l) => {
        l.rect(fx - r * 0.38, fy - r * 0.42, fx + r * 0.38, fy + r * 0.72, vgrad(fy - r * 0.42, fy + r * 0.72, [soft, skyBot]));
        l.poly([[fx - r * 0.44, fy - r * 0.4], [fx, fy - r * 0.94], [fx + r * 0.44, fy - r * 0.4]], acc);
        l.disc(fx, fy - r * 0.06, r * 0.28, CREAM);
        l.line(fx, fy - r * 0.06, fx, fy - r * 0.24, INK);
        l.line(fx, fy - r * 0.06, fx + r * 0.16, fy - r * 0.02, INK);
      }, { rim: 0.22 });
      break;

    case 'robot':
      v.obj((l) => {
        l.line(fx, fy - r * 0.66, fx, fy - r * 0.88, GOLD_HI);
        l.disc(fx, fy - r * 0.88, r * 0.12, acc);
        l.rrect(fx - r * 0.36, fy - r * 0.64, fx + r * 0.36, fy - r * 0.18, r * 0.1, soft);
        l.disc(fx - r * 0.14, fy - r * 0.42, r * 0.1, GOLD_HI);
        l.disc(fx + r * 0.14, fy - r * 0.42, r * 0.1, GOLD_HI);
        l.rrect(fx - r * 0.48, fy - r * 0.14, fx + r * 0.48, fy + r * 0.54, r * 0.12, acc);
        l.star(fx, fy + r * 0.2, r * 0.2, r * 0.09, GOLD_HI);
      }, { rim: 0.22 });
      break;

    case 'orrery':
      v.obj((l) => {
        l.ring(fx, fy, r * 0.68, r * 0.78, GOLD_MID);
        l.ering(fx, fy, r * 0.86, r * 0.36, 0.76, GOLD_HI, -0.35);
        l.disc(fx, fy, r * 0.32, rgrad(fx - 2, fy - 2, r * 0.36, [WHITE, GOLD_HI, acc]));
        l.disc(fx - r * 0.64, fy + r * 0.24, r * 0.15, soft);
        l.disc(fx + r * 0.62, fy - r * 0.26, r * 0.14, acc);
      }, { rim: 0.22 });
      break;

    case 'koi':
      v.obj((l) => {
        l.poly([[fx - r * 0.34, fy + r * 0.32], [fx - r * 0.86, fy + r * 0.12], [fx - r * 0.62, fy + r * 0.54]], acc);
        l.stroke([[fx - r * 0.38, fy + r * 0.34], [fx - r * 0.1, fy - r * 0.08], [fx + r * 0.3, fy - r * 0.28], [fx + r * 0.6, fy - r * 0.08]], r * 0.16, (x) => (x < fx ? rgb('#ff7340') : x < fx + r * 0.28 ? WHITE : acc), r * 0.3);
        l.dot(fx + r * 0.6, fy - r * 0.12, INK);
      }, { rim: 0.22 });
      break;

    case 'torii':
      v.obj((l) => {
        const red = rgb('#ff4d6d');
        l.rect(fx - r * 0.54, fy - r * 0.36, fx - r * 0.38, fy + r * 0.68, red);
        l.rect(fx + r * 0.38, fy - r * 0.36, fx + r * 0.54, fy + r * 0.68, red);
        l.rect(fx - r * 0.7, fy - r * 0.18, fx + r * 0.7, fy - r * 0.02, red);
        l.poly([[fx - r * 0.88, fy - r * 0.54], [fx - r * 0.56, fy - r * 0.38], [fx + r * 0.56, fy - r * 0.38], [fx + r * 0.88, fy - r * 0.54], [fx + r * 0.8, fy - r * 0.32], [fx - r * 0.8, fy - r * 0.32]], red);
        l.rect(fx - r * 0.1, fy - r * 0.36, fx + r * 0.1, fy - r * 0.12, GOLD_HI);
      }, { rim: 0.22 });
      break;

    case 'waterfall':
      v.obj((l) => {
        l.poly([[fx - r * 0.9, fy + r * 0.68], [fx - r * 0.48, fy - r * 0.62], [fx - r * 0.18, fy + r * 0.68]], skyBot);
        l.poly([[fx + r * 0.18, fy + r * 0.68], [fx + r * 0.52, fy - r * 0.66], [fx + r * 0.9, fy + r * 0.68]], skyBot);
        l.rect(fx - r * 0.26, fy - r * 0.46, fx + r * 0.26, fy + r * 0.68, vgrad(fy - r * 0.46, fy + r * 0.68, [WHITE, soft, acc], true));
      }, { rim: 0.2 });
      break;

    case 'piano':
      v.obj((l) => {
        l.rrect(fx - r * 0.84, fy - r * 0.18, fx + r * 0.84, fy + r * 0.64, r * 0.12, acc);
        l.rrect(fx - r * 0.76, fy + r * 0.04, fx + r * 0.76, fy + r * 0.56, r * 0.06, WHITE);
        for (const kx of [-0.5, -0.22, 0.16, 0.46]) l.rect(fx + (kx - 0.08) * r, fy + r * 0.04, fx + (kx + 0.08) * r, fy + r * 0.36, INK);
        l.disc(fx, fy - r * 0.48, r * 0.18, GOLD_HI);
      }, { rim: 0.22 });
      break;

    case 'vinylMoon':
      v.obj((l) => {
        l.disc(fx, fy, r * 0.78, rgb('#251652'));
        l.ring(fx, fy, r * 0.58, r * 0.68, soft);
        l.ring(fx, fy, r * 0.38, r * 0.46, acc);
        l.disc(fx, fy, r * 0.28, GOLD_HI);
        l.disc(fx, fy, r * 0.08, WHITE);
      }, { rim: 0.22 });
      break;

    case 'crystals':
      v.obj((l) => {
        l.poly([[fx - r * 0.74, fy + r * 0.62], [fx - r * 0.56, fy - r * 0.34], [fx - r * 0.28, fy - r * 0.52], [fx - r * 0.12, fy + r * 0.62]], light(acc, 0.3));
        l.poly([[fx - r * 0.22, fy + r * 0.64], [fx - r * 0.14, fy - r * 0.26], [fx + r * 0.04, fy - r * 0.78], [fx + r * 0.24, fy - r * 0.24], [fx + r * 0.26, fy + r * 0.64]], (x) => (x < fx + r * 0.04 ? WHITE : acc));
        l.poly([[fx + r * 0.18, fy + r * 0.62], [fx + r * 0.48, fy - r * 0.38], [fx + r * 0.74, fy - r * 0.1], [fx + r * 0.58, fy + r * 0.62]], soft);
      }, { rim: 0.22 });
      break;

    case 'geode':
      v.obj((l) => {
        l.ellipse(fx, fy + r * 0.04, r * 0.84, r * 0.74, skyBot);
        l.ellipse(fx, fy + r * 0.04, r * 0.64, r * 0.54, soft);
        l.ellipse(fx, fy + r * 0.04, r * 0.48, r * 0.4, acc);
        l.star(fx, fy + r * 0.04, r * 0.36, r * 0.16, WHITE, 6);
      }, { rim: 0.22 });
      break;

    case 'oasis':
      v.obj((l) => {
        l.ellipse(fx, fy + r * 0.48, r * 0.88, r * 0.26, soft);
        l.stroke([[fx + r * 0.2, fy + r * 0.44], [fx + r * 0.28, fy - r * 0.16], [fx + r * 0.12, fy - r * 0.52]], r * 0.1, GOLD_LO);
        l.ellipse(fx - r * 0.16, fy - r * 0.48, r * 0.36, r * 0.12, rgb('#3be099'), -0.35);
        l.ellipse(fx + r * 0.4, fy - r * 0.48, r * 0.36, r * 0.12, rgb('#3be099'), 0.35);
      }, { rim: 0.22 });
      break;

    case 'carpet':
      v.obj((l) => {
        l.poly([[fx - r * 0.86, fy + r * 0.24], [fx - r * 0.12, fy - r * 0.24], [fx + r * 0.86, fy + r * 0.06], [fx + r * 0.12, fy + r * 0.54]], vgrad(fy - r * 0.24, fy + r * 0.54, [acc, rgb('#9c3078')]));
        l.poly([[fx - r * 0.48, fy + r * 0.18], [fx, fy - r * 0.08], [fx + r * 0.48, fy + r * 0.12], [fx, fy + r * 0.36]], GOLD_HI);
      }, { rim: 0.22 });
      break;

    case 'pyramid':
      v.obj((l) => {
        l.poly([[fx - r * 0.84, fy + r * 0.62], [fx, fy - r * 0.72], [fx + r * 0.04, fy + r * 0.62]], vgrad(fy - r * 0.72, fy + r * 0.62, [WHITE, GOLD_HI, acc]));
        l.poly([[fx, fy - r * 0.72], [fx + r * 0.84, fy + r * 0.62], [fx + r * 0.04, fy + r * 0.62]], vgrad(fy - r * 0.72, fy + r * 0.62, [GOLD_MID, shade(acc, 0.4)]));
      }, { rim: 0.22 });
      break;

    case 'book':
      v.obj((l) => {
        l.poly([[fx - r * 0.84, fy + r * 0.36], [fx, fy + r * 0.58], [fx + r * 0.84, fy + r * 0.36], [fx + r * 0.72, fy - r * 0.3], [fx, fy - r * 0.12], [fx - r * 0.72, fy - r * 0.3]], acc);
        l.poly([[fx - r * 0.74, fy + r * 0.26], [fx - r * 0.04, fy + r * 0.44], [fx - r * 0.04, fy - r * 0.3], [fx - r * 0.64, fy - r * 0.44]], WHITE);
        l.poly([[fx + r * 0.74, fy + r * 0.26], [fx + r * 0.04, fy + r * 0.44], [fx + r * 0.04, fy - r * 0.3], [fx + r * 0.64, fy - r * 0.44]], CREAM);
        l.star(fx, fy - r * 0.64, r * 0.26, r * 0.12, GOLD_HI);
      }, { rim: 0.22 });
      break;

    case 'hourglass':
      v.obj((l) => {
        l.rrect(fx - r * 0.56, fy - r * 0.72, fx + r * 0.56, fy - r * 0.54, 1, GOLD_HI);
        l.rrect(fx - r * 0.56, fy + r * 0.52, fx + r * 0.56, fy + r * 0.7, 1, GOLD_HI);
        l.poly([[fx - r * 0.46, fy - r * 0.54], [fx + r * 0.46, fy - r * 0.54], [fx, fy]], soft);
        l.poly([[fx, fy], [fx + r * 0.46, fy + r * 0.52], [fx - r * 0.46, fy + r * 0.52]], GOLD_HI);
      }, { rim: 0.22 });
      break;

    case 'tent':
      v.obj((l) => {
        l.rrect(fx - r * 0.72, fy + r * 0.08, fx + r * 0.72, fy + r * 0.68, 1, (x) => (Math.floor((x - fx) / 4) % 2 === 0 ? acc : CREAM));
        l.poly([[fx - r * 0.86, fy + r * 0.12], [fx, fy - r * 0.68], [fx + r * 0.86, fy + r * 0.12]], (x) => (Math.floor((x - fx) / 4) % 2 === 0 ? acc : WHITE));
        l.rect(fx - r * 0.82, fy + r * 0.06, fx + r * 0.82, fy + r * 0.18, GOLD_HI);
        l.poly([[fx - r * 0.22, fy + r * 0.68], [fx, fy + r * 0.26], [fx + r * 0.22, fy + r * 0.68]], GOLD_MID);
      }, { rim: 0.22 });
      break;

    case 'balloon':
      v.obj((l) => {
        l.rrect(fx - r * 0.2, fy + r * 0.44, fx + r * 0.2, fy + r * 0.72, 1, GOLD_MID);
        l.line(fx - r * 0.16, fy + r * 0.24, fx - r * 0.14, fy + r * 0.46, GOLD_HI);
        l.line(fx + r * 0.16, fy + r * 0.24, fx + r * 0.14, fy + r * 0.46, GOLD_HI);
        l.disc(fx, fy - r * 0.22, r * 0.62, (x) => (Math.floor((x - fx) / 5) % 2 === 0 ? acc : soft));
      }, { rim: 0.22 });
      break;

    case 'pencils':
      v.obj((l) => {
        const cols: Array<[number, number, RGB]> = [[-0.5, -0.44, acc], [0, -0.74, GOLD_HI], [0.5, -0.4, soft]];
        for (const [ox, oy, col] of cols) {
          l.rect(fx + (ox - 0.2) * r, fy + (oy + 0.34) * r, fx + (ox + 0.2) * r, fy + r * 0.72, col);
          l.poly([[fx + (ox - 0.2) * r, fy + (oy + 0.34) * r], [fx + ox * r, fy + oy * r], [fx + (ox + 0.2) * r, fy + (oy + 0.34) * r]], CREAM);
          l.poly([[fx + (ox - 0.08) * r, fy + (oy + 0.14) * r], [fx + ox * r, fy + oy * r], [fx + (ox + 0.08) * r, fy + (oy + 0.14) * r]], col);
        }
      }, { rim: 0.22 });
      break;

    case 'teacup':
      v.obj((l) => {
        l.ellipse(fx, fy + r * 0.62, r * 0.82, r * 0.18, CREAM);
        l.ring(fx + r * 0.56, fy + r * 0.18, r * 0.14, r * 0.28, GOLD_HI);
        l.arc(fx, fy - r * 0.02, 0, r * 0.64, 0, Math.PI, rgrad(fx - r * 0.2, fy + r * 0.1, r * 0.72, [WHITE, acc, skyBot]));
        l.ellipse(fx, fy - r * 0.02, r * 0.64, r * 0.16, soft);
        l.star(fx, fy + r * 0.28, r * 0.2, r * 0.09, GOLD_HI);
      }, { rim: 0.22 });
      break;

    case 'spool':
      v.obj((l) => {
        l.rrect(fx - r * 0.48, fy - r * 0.44, fx + r * 0.48, fy + r * 0.48, r * 0.08, acc);
        l.rrect(fx - r * 0.66, fy - r * 0.62, fx + r * 0.66, fy - r * 0.42, 1, GOLD_HI);
        l.rrect(fx - r * 0.66, fy + r * 0.44, fx + r * 0.66, fy + r * 0.64, 1, GOLD_HI);
        l.disc(fx + r * 0.48, fy + r * 0.46, r * 0.24, soft);
      }, { rim: 0.22 });
      break;

    case 'pumpkin':
      v.obj((l) => {
        l.stroke([[fx, fy - r * 0.34], [fx + r * 0.14, fy - r * 0.72]], r * 0.1, rgb('#3be099'));
        l.ellipse(fx - r * 0.32, fy + r * 0.14, r * 0.42, r * 0.48, shade(acc, 0.18));
        l.ellipse(fx + r * 0.32, fy + r * 0.14, r * 0.42, r * 0.48, shade(acc, 0.18));
        l.ellipse(fx, fy + r * 0.14, r * 0.38, r * 0.52, rgrad(fx - 2, fy, r * 0.55, [GOLD_HI, acc]));
        l.rrect(fx - r * 0.18, fy - r * 0.02, fx + r * 0.18, fy + r * 0.3, r * 0.08, WHITE);
      }, { rim: 0.22 });
      break;

    case 'harvestMoon':
      v.glow(fx, fy - r * 0.12, r * 1.15, GOLD_HI, 0.48);
      v.obj((l) => {
        l.disc(fx, fy - r * 0.12, r * 0.68, rgrad(fx - r * 0.2, fy - r * 0.28, r * 0.78, [WHITE, GOLD_HI, acc]));
      }, { rim: 0.2 });
      break;

    case 'sunflower':
      v.obj((l) => {
        l.capsule(fx, fy + r * 0.16, fx, fy + r * 0.76, r * 0.1, rgb('#2ec47a'));
        for (let i = 0; i < 10; i++) {
          const a = (i * Math.PI) / 5;
          l.ellipse(fx + Math.cos(a) * r * 0.48, fy - r * 0.14 + Math.sin(a) * r * 0.48, r * 0.26, r * 0.12, i % 2 === 0 ? acc : GOLD_HI, a);
        }
        l.disc(fx, fy - r * 0.14, r * 0.34, rgb('#4c2069'));
      }, { rim: 0.22 });
      break;

    case 'honeycomb':
      v.obj((l) => {
        const hex = (hx: number, hy2: number, hr: number, col: RGB) => {
          const pts: Pt[] = [];
          for (let i = 0; i < 6; i++) {
            const a = (i * Math.PI) / 3;
            pts.push([hx + Math.cos(a) * hr, hy2 + Math.sin(a) * hr]);
          }
          l.poly(pts, col);
        };
        hex(fx, fy - r * 0.36, r * 0.32, GOLD_HI);
        hex(fx - r * 0.44, fy + r * 0.14, r * 0.32, acc);
        hex(fx + r * 0.44, fy + r * 0.14, r * 0.32, soft);
        hex(fx, fy + r * 0.42, r * 0.3, GOLD_MID);
      }, { rim: 0.22 });
      break;

    case 'arcade':
      v.obj((l) => {
        l.rrect(fx - r * 0.54, fy - r * 0.74, fx + r * 0.54, fy + r * 0.72, r * 0.1, rgb('#361475'));
        l.rrect(fx - r * 0.46, fy - r * 0.64, fx + r * 0.46, fy - r * 0.44, r * 0.04, acc);
        l.rrect(fx - r * 0.42, fy - r * 0.34, fx + r * 0.42, fy + r * 0.18, r * 0.06, rgb('#132459'));
        l.heart(fx, fy - r * 0.06, r * 0.22, soft);
        l.rrect(fx - r * 0.6, fy + r * 0.24, fx + r * 0.6, fy + r * 0.4, r * 0.04, acc);
      }, { rim: 0.22 });
      break;

    case 'clawMachine':
      v.obj((l) => {
        l.rrect(fx - r * 0.62, fy - r * 0.68, fx + r * 0.62, fy + r * 0.68, r * 0.1, acc);
        l.rrect(fx - r * 0.5, fy - r * 0.48, fx + r * 0.5, fy + r * 0.28, r * 0.06, rgb('#1c2a63'));
        l.line(fx, fy - r * 0.48, fx, fy - r * 0.16, GOLD_HI);
        l.polyline([[fx - r * 0.18, fy - r * 0.02], [fx, fy - r * 0.18], [fx + r * 0.18, fy - r * 0.02]], GOLD_HI);
        l.disc(fx - r * 0.22, fy + r * 0.16, r * 0.16, soft);
        l.disc(fx + r * 0.2, fy + r * 0.16, r * 0.16, GOLD_HI);
      }, { rim: 0.22 });
      break;

    case 'lotus':
      v.obj((l) => {
        l.ellipse(fx - r * 0.5, fy + r * 0.22, r * 0.42, r * 0.18, rgb('#ff7ec0'), -0.3);
        l.ellipse(fx + r * 0.5, fy + r * 0.22, r * 0.42, r * 0.18, rgb('#ff7ec0'), 0.3);
        l.ellipse(fx - r * 0.26, fy, r * 0.38, r * 0.18, GOLD_HI, -0.75);
        l.ellipse(fx + r * 0.26, fy, r * 0.38, r * 0.18, GOLD_HI, 0.75);
        l.ellipse(fx, fy - r * 0.16, r * 0.22, r * 0.48, WHITE);
      }, { rim: 0.22 });
      break;

    case 'sphinx':
      v.obj((l) => {
        l.poly([[fx - r * 0.54, fy + r * 0.46], [fx - r * 0.42, fy - r * 0.52], [fx + r * 0.42, fy - r * 0.52], [fx + r * 0.54, fy + r * 0.46]], (_x, y) => (Math.floor((y - fy) / 4) % 2 === 0 ? GOLD_MID : rgb('#2447a6')));
        l.ellipse(fx, fy - r * 0.14, r * 0.28, r * 0.3, GOLD_HI);
        l.rrect(fx - r * 0.62, fy + r * 0.34, fx + r * 0.62, fy + r * 0.62, r * 0.08, acc);
      }, { rim: 0.22 });
      break;

    case 'obelisk':
      v.obj((l) => {
        l.poly([[fx - r * 0.3, fy + r * 0.72], [fx - r * 0.2, fy - r * 0.58], [fx, fy - r * 0.92], [fx + r * 0.2, fy - r * 0.58], [fx + r * 0.3, fy + r * 0.72]], (x) => (x < fx ? soft : rgb('#20489e')));
        l.poly([[fx - r * 0.2, fy - r * 0.58], [fx, fy - r * 0.92], [fx + r * 0.2, fy - r * 0.58]], GOLD_HI);
        l.star(fx, fy - r * 0.18, r * 0.16, r * 0.07, GOLD_HI);
      }, { rim: 0.22 });
      break;

    case 'portalRing':
      v.obj((l) => {
        l.ring(fx, fy, r * 0.56, r * 0.84, GOLD_HI);
        l.disc(fx, fy, r * 0.56, rgrad(fx, fy, r * 0.56, [WHITE, soft, acc, skyTop]));
        for (let i = 0; i < 8; i++) {
          const a = (i * Math.PI) / 4;
          l.disc(fx + Math.cos(a) * r * 0.7, fy + Math.sin(a) * r * 0.7, r * 0.1, i % 2 === 0 ? acc : soft);
        }
      }, { rim: 0.22 });
      break;

    case 'prismCrown':
      v.obj((l) => {
        l.poly([
          [fx - r * 0.68, fy + r * 0.44],
          [fx - r * 0.82, fy - r * 0.28],
          [fx - r * 0.3, fy + r * 0.04],
          [fx, fy - r * 0.68],
          [fx + r * 0.3, fy + r * 0.04],
          [fx + r * 0.82, fy - r * 0.28],
          [fx + r * 0.68, fy + r * 0.44],
        ], lgrad(fx - r * 0.8, fy - r * 0.6, fx + r * 0.8, fy + r * 0.4, [WHITE, GOLD_HI, GOLD_MID, acc]));
        l.poly([[fx, fy - r * 0.06], [fx + r * 0.22, fy + r * 0.2], [fx, fy + r * 0.46], [fx - r * 0.22, fy + r * 0.2]], soft);
      }, { rim: 0.22 });
      break;

    case 'lanternGate':
      v.obj((l) => {
        l.arc(fx, fy + r * 0.54, r * 0.54, r * 0.8, Math.PI, Math.PI * 2, GOLD_MID);
        l.rect(fx - r * 0.8, fy + r * 0.1, fx - r * 0.54, fy + r * 0.68, soft);
        l.rect(fx + r * 0.54, fy + r * 0.1, fx + r * 0.8, fy + r * 0.68, soft);
        l.star(fx, fy - r * 0.18, r * 0.26, r * 0.12, GOLD_HI);
        l.disc(fx - r * 0.66, fy + r * 0.04, r * 0.14, acc);
        l.disc(fx + r * 0.66, fy + r * 0.04, r * 0.14, acc);
      }, { rim: 0.22 });
      break;
  }

  v.sparkle(fx - r * 0.72, fy - r * 0.66, 2, WHITE, GOLD_HI);
  v.sparkle(fx + r * 0.72, fy - r * 0.58, 1, soft, WHITE);
}

const PAPER_LIGHT: RGB = rgb('#faf6ec');

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
