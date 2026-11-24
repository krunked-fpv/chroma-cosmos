/**
 * Wardrobe accessory icons on a soft starry storybook badge for all 6 WARDROBE_ITEMS.
 * Pure + deterministic.
 */
import type { WardrobeItemId } from '../../contracts/progression';
import { hashString, mulberry32 } from '../../scenes/context';
import { Canvas, CREAM, INK, light, lgrad, mix, type Pt, rgrad, rgb, type RGB, shade, vgrad, WHITE } from './canvas';

const BADGE_PAL: Record<WardrobeItemId, { top: RGB; bot: RGB; ring: RGB; halo: RGB }> = {
  violetPins: { top: rgb('#3b237a'), bot: rgb('#1f124d'), ring: rgb('#c9a3ff'), halo: rgb('#b69cff') },
  violetCape: { top: rgb('#2b2069'), bot: rgb('#181145'), ring: rgb('#ff9ecf'), halo: rgb('#9bf6ff') },
  lumiWings: { top: rgb('#243875'), bot: rgb('#1a1b54'), ring: rgb('#9bf6ff'), halo: rgb('#ffd6e8') },
  lumiCrown: { top: rgb('#4d216e'), bot: rgb('#231147'), ring: rgb('#ffe066'), halo: rgb('#ffd43b') },
  novaBoosters: { top: rgb('#361459'), bot: rgb('#190c3b'), ring: rgb('#ff4ad9'), halo: rgb('#b6ff3b') },
  novaScarf: { top: rgb('#3b2266'), bot: rgb('#1e1247'), ring: rgb('#ffd43b'), halo: rgb('#ff9a3c') },
};

export function drawWardrobe(item: WardrobeItemId, lw: number, lh: number): Canvas {
  const c = new Canvas(lw, lh);
  const cx = lw * 0.5;
  const cy = lh * 0.5;
  const s = Math.min(lw, lh);
  const pal = BADGE_PAL[item];
  const rng = mulberry32(hashString(`ward:${item}`));

  // Soft storybook rounded-cushion badge filling the frame
  c.fill(vgrad(0, lh, [rgb('#1a113b'), rgb('#110a29')]));
  const pad = Math.max(2, Math.round(s * 0.05));
  const r = Math.max(5, Math.round(s * 0.2));

  c.obj((l) => {
    l.rrect(pad, pad, lw - pad, lh - pad, r, vgrad(pad, lh - pad, [pal.top, pal.bot], true));
    // Soft gilded / pastel inner trim ring
    l.shape(
      pad,
      pad,
      lw - pad,
      lh - pad,
      (x, y) => {
        const inside = (x0: number, y0: number, x1: number, y1: number, rad: number) => {
          if (x < x0 || x >= x1 || y < y0 || y >= y1) return false;
          const qx = x < x0 + rad ? x0 + rad : x > x1 - rad ? x1 - rad : x;
          const qy = y < y0 + rad ? y0 + rad : y > y1 - rad ? y1 - rad : y;
          return (x - qx) * (x - qx) + (y - qy) * (y - qy) <= rad * rad;
        };
        return inside(pad + 1, pad + 1, lw - pad - 1, lh - pad - 1, Math.max(2, r - 1)) &&
          !inside(pad + 2.5, pad + 2.5, lw - pad - 2.5, lh - pad - 2.5, Math.max(1, r - 2.5));
      },
      pal.ring,
    );
  }, { rim: 0.2 });

  // Soft radial spotlight & tiny background stars inside the badge
  const iconR = s * 0.34;
  c.glow(cx, cy, iconR * 1.45, pal.halo, 0.36);
  for (let i = 0; i < 10; i++) {
    const sx = Math.floor(rng.range(pad + 4, lw - pad - 4));
    const sy = Math.floor(rng.range(pad + 4, lh - pad - 4));
    c.set(sx, sy, rng.chance(0.45) ? WHITE : light(pal.ring, 0.25));
  }

  // Hero wardrobe accessory icon
  switch (item) {
    case 'violetPins': {
      // Paired Galaxy Hairpins: crescent moon pin + glowing star bobby pin crossed playfully
      // Back pin (tilted)
      c.obj((l) => {
        l.capsule(cx - iconR * 0.85, cy + iconR * 0.55, cx + iconR * 0.48, cy - iconR * 0.35, Math.max(1.2, iconR * 0.1), rgb('#d4c4ff'));
        l.capsule(cx - iconR * 0.78, cy + iconR * 0.72, cx + iconR * 0.45, cy - iconR * 0.18, Math.max(1.0, iconR * 0.08), rgb('#a78bfa'));
        // Crescent moon charm at right end
        const mx = cx + iconR * 0.42;
        const my = cy - iconR * 0.35;
        const mr = iconR * 0.42;
        l.shape(
          mx - mr - 1,
          my - mr - 1,
          mx + mr + 1,
          my + mr + 1,
          (px, py) =>
            Math.hypot(px - mx, py - my) <= mr &&
            Math.hypot(px - (mx + mr * 0.45), py - (my - mr * 0.2)) >= mr * 0.78,
          rgrad(mx - 2, my - 2, mr * 1.2, [WHITE, rgb('#d6b8ff'), rgb('#7c4dff')]),
        );
      }, { rim: 0.22 });
      // Front star hairpin
      c.obj((l) => {
        l.capsule(cx - iconR * 0.48, cy - iconR * 0.42, cx + iconR * 0.85, cy + iconR * 0.48, Math.max(1.2, iconR * 0.11), rgb('#ffe680'));
        l.capsule(cx - iconR * 0.45, cy - iconR * 0.22, cx + iconR * 0.78, cy + iconR * 0.65, Math.max(1.0, iconR * 0.08), rgb('#f0a830'));
        // Galaxy star medallion
        const sx = cx - iconR * 0.35;
        const sy = cy - iconR * 0.32;
        l.star(sx, sy, iconR * 0.48, iconR * 0.22, rgrad(sx - 1, sy - 1, iconR * 0.55, [WHITE, rgb('#c4a3ff'), rgb('#6c5ce7')]));
        l.dot(sx, sy, rgb('#fff3b0'));
      }, { rim: 0.24, deep: true });
      c.sparkle(cx - iconR * 0.38, cy - iconR * 0.72, 2, WHITE, rgb('#b69cff'));
      c.sparkle(cx + iconR * 0.68, cy - iconR * 0.15, 1, rgb('#ffe66d'));
      break;
    }

    case 'violetCape': {
      // Rainbow Astronaut Cape: billowing trapezoidal cape with striped holographic foil bands & golden star collar clasp
      c.obj((l) => {
        // Dark starry inner lining peeking at bottom hem
        l.poly([
          [cx - iconR * 0.55, cy - iconR * 0.52],
          [cx + iconR * 0.55, cy - iconR * 0.52],
          [cx + iconR * 0.88, cy + iconR * 0.78],
          [cx, cy + iconR * 0.92],
          [cx - iconR * 0.88, cy + iconR * 0.78],
        ], rgb('#241559'));
        // Flowing rainbow cape shell
        const stripes: RGB[] = [rgb('#ff7eb6'), rgb('#ffd43b'), rgb('#7fe7f0'), rgb('#b69cff'), rgb('#ff9a62')];
        l.poly([
          [cx - iconR * 0.52, cy - iconR * 0.62],
          [cx + iconR * 0.52, cy - iconR * 0.62],
          [cx + iconR * 0.96, cy + iconR * 0.66],
          [cx + iconR * 0.42, cy + iconR * 0.82],
          [cx, cy + iconR * 0.64],
          [cx - iconR * 0.42, cy + iconR * 0.82],
          [cx - iconR * 0.96, cy + iconR * 0.66],
        ], (x, y) => {
          const u = (x - (cx - iconR)) / (iconR * 2);
          const wave = Math.sin(y * 0.22) * 0.06;
          const idx = Math.max(0, Math.min(stripes.length - 1, Math.floor((u + wave) * stripes.length)));
          return mix(stripes[idx] as RGB, WHITE, Math.max(0, 0.22 - (y - (cy - iconR * 0.6)) / (iconR * 2.5) * 0.22));
        });
        // Fold shadow lines
        l.line(cx - iconR * 0.2, cy - iconR * 0.4, cx - iconR * 0.35, cy + iconR * 0.65, shade(rgb('#b69cff'), 0.45));
        l.line(cx + iconR * 0.2, cy - iconR * 0.4, cx + iconR * 0.35, cy + iconR * 0.65, shade(rgb('#7fe7f0'), 0.45));
        // Astronaut padded white collar with curved neckline U-dip + golden star clasp
        l.ellipse(cx, cy - iconR * 0.62, iconR * 0.56, iconR * 0.22, CREAM);
        l.ellipse(cx, cy - iconR * 0.68, iconR * 0.32, iconR * 0.14, pal.top);
        l.star(cx, cy - iconR * 0.48, iconR * 0.26, iconR * 0.12, rgb('#ffd43b'));
      }, { rim: 0.22, deep: true });
      c.sparkle(cx + iconR * 0.65, cy - iconR * 0.48, 2, WHITE, rgb('#9bf6ff'));
      break;
    }

    case 'lumiWings': {
      // Crystal Pegasus Wings: symmetrical spread feathered wings in shimmering opal-pearl, cyan, pink & mint
      c.obj((l) => {
        for (const dir of [-1, 1] as const) {
          // Layered primary crystal wing feathers
          const tiers: Array<[number, number, number, number, RGB]> = [
            [0.98, -0.58, 0.26, -0.22, rgb('#ffffff')],
            [0.92, -0.22, 0.24, 0.02, rgb('#d6f5ff')],
            [0.78, 0.14, 0.2, 0.24, rgb('#ffd6e8')],
            [0.58, 0.45, 0.16, 0.42, rgb('#e0c8ff')],
          ];
          for (const [tx, ty, bx, by, col] of tiers) {
            l.poly([
              [cx + dir * iconR * 0.12, cy + iconR * by],
              [cx + dir * iconR * tx, cy + iconR * ty],
              [cx + dir * iconR * (tx - 0.16), cy + iconR * (ty + 0.32)],
              [cx + dir * iconR * bx, cy + iconR * (by + 0.24)],
            ], lgrad(cx, cy - iconR * 0.5, cx + dir * iconR, cy + iconR * 0.5, [WHITE, col, shade(col, 0.18)]));
          }
          // Wing shoulder crest
          l.ellipse(cx + dir * iconR * 0.34, cy - iconR * 0.18, iconR * 0.32, iconR * 0.2, rgb('#f5f0ff'), dir * -0.4);
        }
        // Center opal gem connector
        l.poly([[cx, cy - iconR * 0.18], [cx + iconR * 0.16, cy + iconR * 0.05], [cx, cy + iconR * 0.28], [cx - iconR * 0.16, cy + iconR * 0.05]], rgb('#7fe7f0'));
        l.dot(cx, cy, WHITE);
      }, { rim: 0.22, deep: true });
      c.sparkle(cx - iconR * 0.72, cy - iconR * 0.65, 2, WHITE, rgb('#9bf6ff'));
      c.sparkle(cx + iconR * 0.72, cy - iconR * 0.65, 2, WHITE, rgb('#ffd6e8'));
      break;
    }

    case 'lumiCrown': {
      // Starlight Crown: golden 3-peak royal crown with star spire and pastel jewels
      c.obj((l) => {
        const yBot = cy + iconR * 0.56;
        const yBand = cy + iconR * 0.22;
        // Velvet inner cap peeking slightly
        l.ellipse(cx, yBand, iconR * 0.64, iconR * 0.32, rgb('#9e3cb8'));
        // 3-peak golden crown silhouette
        const goldGrad = lgrad(cx - iconR, cy - iconR * 0.5, cx + iconR, yBot, [rgb('#fff6b8'), rgb('#ffd43b'), rgb('#e8941c')]);
        l.poly([
          [cx - iconR * 0.78, yBot],
          [cx - iconR * 0.92, cy - iconR * 0.32],
          [cx - iconR * 0.38, cy + iconR * 0.06],
          [cx, cy - iconR * 0.68],
          [cx + iconR * 0.38, cy + iconR * 0.06],
          [cx + iconR * 0.92, cy - iconR * 0.32],
          [cx + iconR * 0.78, yBot],
        ], goldGrad);
        // Bottom gilded rim bar
        l.rrect(cx - iconR * 0.82, yBand + iconR * 0.08, cx + iconR * 0.82, yBot + iconR * 0.12, 2, vgrad(yBand, yBot + 2, [rgb('#fff3b0'), rgb('#d98416')]));
        // Tip pearls on outer spires
        l.disc(cx - iconR * 0.92, cy - iconR * 0.36, Math.max(1.6, iconR * 0.12), WHITE);
        l.disc(cx + iconR * 0.92, cy - iconR * 0.36, Math.max(1.6, iconR * 0.12), WHITE);
        // Center star crowning the apex
        l.star(cx, cy - iconR * 0.68, iconR * 0.26, iconR * 0.12, WHITE);
        // Glowing band jewels (pink center, cyan sides)
        const jy = yBand + iconR * 0.24;
        l.disc(cx, jy, Math.max(2, iconR * 0.15), rgb('#ff5fa2'));
        l.dot(cx - 1, jy - 1, WHITE);
        l.disc(cx - iconR * 0.44, jy, Math.max(1.5, iconR * 0.11), rgb('#7fe7f0'));
        l.disc(cx + iconR * 0.44, jy, Math.max(1.5, iconR * 0.11), rgb('#7fe7f0'));
      }, { rim: 0.22, deep: true });
      c.sparkle(cx, cy - iconR * 0.88, 2, WHITE, rgb('#fff3b0'));
      break;
    }

    case 'novaBoosters': {
      // Twin Cyber-Cheetah Rocket Boosters with blazing twin neon plasma flames!
      // Glowing plasma exhaust plumes first (behind canisters)
      for (const dir of [-1, 1] as const) {
        const bx = cx + dir * iconR * 0.44;
        c.glow(bx, cy + iconR * 0.65, iconR * 0.48, rgb('#b6ff3b'), 0.4);
        c.obj((l) => {
          l.poly([
            [bx - iconR * 0.24, cy + iconR * 0.32],
            [bx + iconR * 0.24, cy + iconR * 0.32],
            [bx + dir * iconR * 0.08, cy + iconR * 0.96],
          ], vgrad(cy + iconR * 0.3, cy + iconR * 0.96, [WHITE, rgb('#b6ff3b'), rgb('#ff2bd6')]));
        }, { rim: 0.1 });
      }
      // Twin sleek rocket pods + center harness
      c.obj((l) => {
        // Center cyber connector strap
        l.rect(cx - iconR * 0.44, cy - iconR * 0.2, cx + iconR * 0.44, cy + iconR * 0.16, rgb('#543191'));
        l.rect(cx - iconR * 0.25, cy - iconR * 0.12, cx + iconR * 0.25, cy + iconR * 0.08, rgb('#b6ff3b'));
        for (const dir of [-1, 1] as const) {
          const bx = cx + dir * iconR * 0.44;
          // Nose cone
          l.poly([
            [bx, cy - iconR * 0.9],
            [bx + iconR * 0.28, cy - iconR * 0.42],
            [bx - iconR * 0.28, cy - iconR * 0.42],
          ], rgb('#ff2bd6'));
          // Main rocket pod body
          l.rrect(bx - iconR * 0.29, cy - iconR * 0.46, bx + iconR * 0.29, cy + iconR * 0.3, 2, lgrad(bx - iconR * 0.28, cy, bx + iconR * 0.28, cy, [WHITE, rgb('#cfd8f5'), rgb('#6e78a8')]));
          // Neon cheetah stripe
          l.rect(bx - iconR * 0.28, cy - iconR * 0.12, bx + iconR * 0.28, cy + iconR * 0.04, rgb('#ff2bd6'));
          // Outer fin
          l.poly([
            [bx + dir * iconR * 0.26, cy - iconR * 0.05],
            [bx + dir * iconR * 0.52, cy + iconR * 0.36],
            [bx + dir * iconR * 0.24, cy + iconR * 0.28],
          ], rgb('#b6ff3b'));
          // Exhaust nozzle bell
          l.poly([
            [bx - iconR * 0.2, cy + iconR * 0.28],
            [bx + iconR * 0.2, cy + iconR * 0.28],
            [bx + iconR * 0.26, cy + iconR * 0.44],
            [bx - iconR * 0.26, cy + iconR * 0.44],
          ], rgb('#3e266e'));
        }
      }, { rim: 0.22, deep: true });
      c.sparkle(cx - iconR * 0.65, cy - iconR * 0.6, 1, rgb('#b6ff3b'));
      c.sparkle(cx + iconR * 0.72, cy - iconR * 0.5, 2, WHITE, rgb('#ff85e2'));
      break;
    }

    case 'novaScarf': {
      // Trailing Rainbow Scarf: cozy looped neck wrap + fluttering rainbow tails with golden fringe tassels!
      const rb: RGB[] = [rgb('#ff5c77'), rgb('#ffa94d'), rgb('#ffd43b'), rgb('#69db7c'), rgb('#4dabf7'), rgb('#b197fc')];
      const rainbowFill = (x: number, y: number): RGB => {
        const idx = Math.abs(Math.floor((x + y * 0.7) / Math.max(2, iconR * 0.19))) % rb.length;
        return rb[idx] as RGB;
      };
      // Fluttering trailing tails streaming right & down
      c.obj((l) => {
        l.stroke([
          [cx - iconR * 0.1, cy - iconR * 0.05],
          [cx + iconR * 0.38, cy - iconR * 0.22],
          [cx + iconR * 0.82, cy - iconR * 0.04],
        ], iconR * 0.22, rainbowFill, iconR * 0.18);
        l.stroke([
          [cx - iconR * 0.22, cy + iconR * 0.14],
          [cx + iconR * 0.22, cy + iconR * 0.42],
          [cx + iconR * 0.76, cy + iconR * 0.52],
        ], iconR * 0.24, rainbowFill, iconR * 0.2);
        // Golden fringe tassels at tail tips
        for (let i = -1; i <= 1; i++) {
          l.line(cx + iconR * 0.84, cy - iconR * 0.04 + i * 2, cx + iconR * 0.98, cy - iconR * 0.06 + i * 2.5, rgb('#ffe066'));
          l.line(cx + iconR * 0.78, cy + iconR * 0.52 + i * 2, cx + iconR * 0.95, cy + iconR * 0.56 + i * 2.5, rgb('#ffe066'));
        }
      }, { rim: 0.2 });
      // Cozy looped scarf collar in foreground-left
      c.obj((l) => {
        l.ellipse(cx - iconR * 0.34, cy - iconR * 0.14, iconR * 0.48, iconR * 0.36, rainbowFill, -0.15);
        // Inner dark scarf hole
        l.ellipse(cx - iconR * 0.34, cy - iconR * 0.2, iconR * 0.24, iconR * 0.13, rgb('#2a1554'), -0.15);
        // Draped front knot fold
        l.rrect(cx - iconR * 0.45, cy - iconR * 0.02, cx + iconR * 0.04, cy + iconR * 0.34, iconR * 0.12, rainbowFill);
      }, { rim: 0.24, deep: true });
      c.sparkle(cx + iconR * 0.65, cy - iconR * 0.52, 2, WHITE, rgb('#ffd43b'));
      break;
    }
  }

  return c;
}
