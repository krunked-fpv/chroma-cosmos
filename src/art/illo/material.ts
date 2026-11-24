/**
 * Material paint swatches for all 12 MATERIALS in src/contracts/materials.ts.
 * Each material has a distinct procedural surface matching its shader family (gradient/foil/watercolor/
 * amber/glitter/crayon/chalk/pearl/neon/biolum/gold/sherbet) plus a crisp swatch rim, diagonal gleam & sparkles.
 * Fills the entire frame (100% opaque). Pure + deterministic.
 */
import { MATERIALS, MaterialId } from '../../contracts/materials';
import { hashString, mulberry32 } from '../../scenes/context';
import { bayer, Canvas, dith, INK, light, mix, ramp, rgb, type RGB, shade, vnoise, WHITE } from './canvas';

function fbm(x: number, y: number, s: number): number {
  return vnoise(x, y, s) * 0.62 + vnoise(x * 2.1 + 7.3, y * 2.1 - 4.1, s + 31) * 0.38;
}

export function drawMaterial(material: MaterialId, lw: number, lh: number): Canvas {
  const c = new Canvas(lw, lh);
  const def = MATERIALS.find((m) => m.id === material) ?? MATERIALS[0]!;
  const pal: RGB[] = def.palette.map(rgb);
  const p = (i: number): RGB => pal[i % pal.length] as RGB;
  const rng = mulberry32(hashString(`mat:${material}`));
  const s = Math.min(lw, lh);

  // 1. Distinct procedural fill per material id (1..12)
  for (let y = 0; y < lh; y++) {
    const ny = y / Math.max(1, lh - 1);
    for (let x = 0; x < lw; x++) {
      const nx = x / Math.max(1, lw - 1);
      let col: RGB = p(0);

      switch (material) {
        case MaterialId.LiquidAurora: {
          // Flowing wavy northern-lights aurora curtains with Bayer-dithered transitions
          const wave = Math.sin(nx * 5.8 + Math.sin(ny * 4.2) * 1.4) * 0.18 + Math.cos((nx - ny) * 4.5) * 0.1;
          const t = Math.max(0, Math.min(0.999, ny * 0.85 + nx * 0.25 + wave));
          const k = t * (pal.length - 1);
          const i = Math.floor(k);
          col = dith(p(i), p(i + 1), k - i, x, y);
          // Luminous aurora veil ridge
          const ridge = Math.abs(ny - (0.48 + Math.sin(nx * 6.2) * 0.16));
          if (ridge < 0.06) col = mix(col, WHITE, (1 - ridge / 0.06) * 0.45);
          break;
        }

        case MaterialId.HoloFoil: {
          // Prismatic faceted holographic rainbow foil with diagonal metallic diamond sheen
          const facetX = Math.floor(nx * 6);
          const facetY = Math.floor(ny * 6);
          const diag = (nx * 1.15 + ny * 0.85 + ((facetX + facetY) & 1) * 0.08 + Math.sin(nx * 9 - ny * 7) * 0.06) % 1;
          const u = (diag + 1) % 1;
          col = ramp(pal.slice(0, 7), u);
          // Sharp metallic specular shimmer along facet diagonals
          const glint = Math.abs(((nx * 3 - ny * 3 + 10) % 1) - 0.5);
          if (glint < 0.08) col = mix(col, WHITE, (1 - glint / 0.08) * 0.65);
          break;
        }

        case MaterialId.VelvetNebula: {
          // Lush cloudy multi-octave nebula watercolor blooms
          const n = fbm(nx * 4.2, ny * 4.2, 103);
          const swirl = fbm(nx * 3.0 + n * 1.4, ny * 3.0 - n * 1.1, 211);
          const t = Math.max(0, Math.min(0.999, swirl * 1.15 - 0.08));
          const k = t * (pal.length - 1);
          const i = Math.floor(k);
          col = dith(p(i), p(i + 1), k - i, x, y);
          break;
        }

        case MaterialId.SolarCheetahAmber: {
          // Glowing honey-amber base (pal[0], pal[1]) patterned with dark umber/plum cheetah rosettes (pal[2], pal[3])
          const base = dith(p(0), p(1), Math.max(0, Math.min(1, nx * 0.4 + ny * 0.7)), x, y);
          col = base;
          // Tile organic cheetah rosettes cleanly across the swatch
          const gx = nx * 4.2;
          const gy = ny * 4.2;
          const cx0 = Math.floor(gx);
          const cy0 = Math.floor(gy);
          let best = 9;
          for (let dy = -1; dy <= 1; dy++) {
            for (let dx = -1; dx <= 1; dx++) {
              const rx = cx0 + dx + 0.25 + vnoise(cx0 + dx, cy0 + dy, 41) * 0.5;
              const ry = cy0 + dy + 0.25 + vnoise(cx0 + dx, cy0 + dy, 83) * 0.5;
              const d = Math.hypot((gx - rx) * 1.15, gy - ry);
              if (d < best) best = d;
            }
          }
          if (best < 0.29 && best > 0.13) col = p(2); // umber rosette ring
          else if (best <= 0.13) col = mix(p(1), p(0), 0.5); // warm amber center
          else if (best < 0.34 && (x + y) % 3 === 0) col = p(3); // cosmic plum accent
          break;
        }

        case MaterialId.SupernovaGlitter: {
          // Rich royal-violet to periwinkle gel base; dense star glitter added on top
          const g = Math.max(0, Math.min(1, (nx * 0.5 + ny * 0.7) * 1.1 - 0.1 + (vnoise(nx * 5, ny * 5, 55) - 0.5) * 0.3));
          col = dith(p(0), p(1), g, x, y);
          // Micro glitter flecks
          const h = vnoise(x * 0.9, y * 0.9, 509);
          if (h > 0.87) col = WHITE;
          else if (h > 0.8) col = light(p(1), 0.55);
          break;
        }

        case MaterialId.RainbowPrismWax: {
          // Bold diagonal waxy crayon stripes with grainy paper-tooth texture along edges
          const grain = (vnoise(x * 0.65, y * 0.65, 601) - 0.5) * 0.42;
          const band = (nx * 0.7 + ny * 0.85) * pal.length + grain;
          const idx = ((Math.floor(band) % pal.length) + pal.length) % pal.length;
          col = p(idx);
          // Subtle wax tooth speckle
          if (vnoise(x * 1.1, y * 1.1, 619) > 0.78) col = light(col, 0.22);
          else if (vnoise(x * 1.1, y * 1.1, 631) < 0.16) col = shade(col, 0.18);
          break;
        }

        case MaterialId.CottonCandyChalk: {
          // Fluffy swirled pastel pink & baby-blue clouds with dusty chalk grain
          const n = fbm(nx * 3.8, ny * 3.8, 701);
          const swirl = Math.sin((nx + ny) * 4.5 + n * 3.5) * 0.5 + 0.5;
          const dust = (vnoise(x * 0.85, y * 0.85, 733) - 0.5) * 0.28;
          const t = Math.max(0, Math.min(1, swirl + dust));
          col = dith(p(0), p(1), t, x, y);
          // Airy white chalk puffs
          if (n > 0.66 && vnoise(x * 0.9, y * 0.9, 751) > 0.45) col = mix(col, WHITE, 0.65);
          break;
        }

        case MaterialId.OpalPearl: {
          // Luminous iridescent mother-of-pearl curved swirls with richer pastel contrast & pearly sheen
          const a = Math.sin(nx * 5.6 + Math.cos(ny * 4.8) * 1.9) * 0.5 + 0.5;
          const b = Math.cos(ny * 5.8 - nx * 3.4) * 0.5 + 0.5;
          const t = Math.max(0, Math.min(0.999, a * 0.58 + b * 0.42));
          const richPal: RGB[] = [rgb('#cfc2f2'), p(1), p(2), p(3), p(0)];
          col = ramp(richPal, t);
          // Concentric glossy pearl luster highlights
          const r = Math.hypot(nx - 0.32, ny - 0.32);
          if (r < 0.28) col = mix(col, WHITE, (1 - r / 0.28) * 0.65);
          break;
        }

        case MaterialId.NeonCyberCheetah: {
          // Deep cyber void (#1a0b2e) with glowing hollow neon-magenta & acid-lime cyber-cheetah rosettes + grid
          col = p(2);
          if (x % 8 === 0 || y % 8 === 0) col = mix(p(2), p(0), 0.24);
          const gx = nx * 3.6;
          const gy = ny * 3.6;
          const cx0 = Math.floor(gx);
          const cy0 = Math.floor(gy);
          let best = 9;
          let spotKind = 0;
          for (let dy = -1; dy <= 1; dy++) {
            for (let dx = -1; dx <= 1; dx++) {
              const rx = cx0 + dx + 0.25 + vnoise(cx0 + dx, cy0 + dy, 91) * 0.5;
              const ry = cy0 + dy + 0.25 + vnoise(cx0 + dx, cy0 + dy, 97) * 0.5;
              const d = Math.hypot((gx - rx) * 1.1, gy - ry);
              if (d < best) {
                best = d;
                spotKind = (cx0 + dx + cy0 + dy) & 1;
              }
            }
          }
          const neonCol = spotKind === 0 ? p(0) : p(1);
          // Hollow cyber-cheetah rosette rings with dark void center and outer neon bloom
          if (best < 0.3 && best > 0.14) col = neonCol;
          else if (best <= 0.14) col = mix(p(2), neonCol, 0.25);
          else if (best < 0.39) col = mix(col, neonCol, (1 - (best - 0.3) / 0.09) * 0.4);
          break;
        }

        case MaterialId.DeepSpaceBiolum: {
          // Deep abyssal teal with luminous cyan & electric-violet bioluminescent veins & plankton glow
          const n1 = fbm(nx * 4.5, ny * 4.5, 1009);
          const n2 = fbm(nx * 5.5 + 3.2, ny * 5.5 - 2.1, 1031);
          const vein = 1 - Math.min(1, Math.abs(n1 - 0.5) * 6.5);
          const aura = Math.max(0, n2 - 0.42) * 1.7;
          col = p(0);
          if (aura > bayer(x, y) * 0.8) col = mix(col, p(2), Math.min(1, aura));
          if (vein > 0.45) col = mix(col, p(1), (vein - 0.45) / 0.55);
          if (vein > 0.84) col = mix(col, WHITE, 0.5);
          break;
        }

        case MaterialId.SolarFlare24K: {
          // Molten 24K gold with hammered metallic sheen bands & blazing solar flare arcs
          const r = Math.hypot(nx - 0.28, ny - 0.28);
          const flare = Math.sin(r * 13 - Math.atan2(ny - 0.28, nx - 0.28) * 3) * 0.5 + 0.5;
          const sheen = Math.sin((nx * 1.2 + ny * 0.9) * 7) * 0.5 + 0.5;
          const t = Math.max(0, Math.min(0.999, 1 - (flare * 0.45 + sheen * 0.55)));
          const k = t * (pal.length - 1);
          const i = Math.floor(k);
          col = dith(p(i), p(i + 1), k - i, x, y);
          if (r < 0.24) col = mix(col, WHITE, (1 - r / 0.24) * 0.55);
          break;
        }

        case MaterialId.AuroraSherbet: {
          // Sweet frothy layered sherbet waves in peach, strawberry & mint with cream ribbons
          const wave = Math.sin(nx * 6.4) * 0.14 + Math.cos(nx * 3.1 + ny * 4.0) * 0.08;
          const t = Math.max(0, Math.min(0.999, ny + wave));
          const k = t * (pal.length - 1);
          const i = Math.floor(k);
          col = dith(p(i), p(i + 1), k - i, x, y);
          // Frothy cream wave crest lines
          const crest = Math.abs(((t * 3) % 1) - 0.5);
          if (crest < 0.07) col = mix(col, WHITE, (1 - crest / 0.07) * 0.65);
          break;
        }
      }

      c.set(x, y, col);
    }
  }

  // Extra material-specific surface details
  if (material === MaterialId.SupernovaGlitter) {
    for (let i = 0; i < 10; i++) {
      const gx = rng.range(5, lw - 5);
      const gy = rng.range(5, lh - 5);
      c.sparkle(gx, gy, rng.chance(0.35) ? 2 : 1, WHITE, p(1));
    }
  } else if (material === MaterialId.DeepSpaceBiolum) {
    for (let i = 0; i < 6; i++) {
      const bx = rng.range(6, lw - 6);
      const by = rng.range(6, lh - 6);
      const bc = i % 2 === 0 ? p(1) : p(2);
      c.glow(bx, by, Math.max(3, s * 0.1), bc, 0.55);
      c.dot(bx, by, WHITE);
    }
  }

  // 2. Signature diagonal glossy gleam across the swatch (brightens the tile into a tactile jewel-like paint sample)
  for (let y = 0; y < lh; y++) {
    for (let x = 0; x < lw; x++) {
      const u = (x / Math.max(1, lw)) * 0.72 + (y / Math.max(1, lh)) * 0.68;
      if (Math.abs(u - 0.34) < 0.065) c.over(x, y, WHITE, 64);
      else if (Math.abs(u - 0.46) < 0.024) c.over(x, y, WHITE, 52);
    }
  }

  // 3. Crisp 1px outer INK border + subtle luminous top-left bevel & bottom-right shadow rim
  for (let x = 0; x < lw; x++) {
    c.set(x, 0, INK);
    c.set(x, lh - 1, INK);
    if (lh > 4) {
      c.over(x, 1, WHITE, 95);
      c.over(x, lh - 2, INK, 85);
    }
  }
  for (let y = 0; y < lh; y++) {
    c.set(0, y, INK);
    c.set(lw - 1, y, INK);
    if (lw > 4) {
      c.over(1, y, WHITE, 95);
      c.over(lw - 2, y, INK, 85);
    }
  }

  // 4. Twinkling sparkles on upper-left & lower-right swatch highlights
  c.sparkle(Math.round(lw * 0.22), Math.round(lh * 0.22), Math.max(2, Math.round(s * 0.055)), WHITE, WHITE);
  c.sparkle(Math.round(lw * 0.78), Math.round(lh * 0.72), Math.max(1, Math.round(s * 0.035)), WHITE, light(p(0), 0.4));

  return c;
}
