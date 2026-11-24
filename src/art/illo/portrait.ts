/**
 * Framed storybook bust portraits of Violet, Lumi & Nova.
 * Consumes the public SpriteLibrary via buildSprites() and maps region ids with regionRgb(),
 * cropping robustly by head-and-shoulders proportions (works seamlessly with both current stub
 * sheets and the final pixel-art sprites landing in parallel). Pure + deterministic.
 */
import type { WardrobeState } from '../../contracts/progression';
import { hashString, mulberry32 } from '../../scenes/context';
import { regionRgb } from '../palette';
import { buildSprites } from '../sprites';
import { Canvas, CREAM, INK, light, mix, rgrad, rgb, type RGB, shade, vgrad, WHITE } from './canvas';
import { drawText, textWidth } from './font';

type Who = 'violet' | 'lumi' | 'nova';

const EMPTY_WARDROBE: WardrobeState = {
  violetPins: false,
  violetCape: false,
  lumiWings: false,
  lumiCrown: false,
  novaBoosters: false,
  novaScarf: false,
};

const THEME: Record<Who, { name: string; outerTop: RGB; outerBot: RGB; bgTop: RGB; bgBot: RGB; halo: RGB; ribbon: RGB; accent: RGB }> = {
  violet: {
    name: 'VIOLET',
    outerTop: rgb('#3b2278'),
    outerBot: rgb('#1b1042'),
    bgTop: rgb('#25185c'),
    bgBot: rgb('#6e3b9c'),
    halo: rgb('#ffd4a3'),
    ribbon: rgb('#7e4be0'),
    accent: rgb('#ffd43b'),
  },
  lumi: {
    name: 'LUMI',
    outerTop: rgb('#3a2575'),
    outerBot: rgb('#1d134a'),
    bgTop: rgb('#1b2e6e'),
    bgBot: rgb('#8a4b9e'),
    halo: rgb('#9bf6ff'),
    ribbon: rgb('#d9579c'),
    accent: rgb('#7fe7f0'),
  },
  nova: {
    name: 'NOVA',
    outerTop: rgb('#522059'),
    outerBot: rgb('#210e3b'),
    bgTop: rgb('#331757'),
    bgBot: rgb('#a64253'),
    halo: rgb('#ffe066'),
    ribbon: rgb('#d9682b'),
    accent: rgb('#ffe066'),
  },
};

export function drawPortrait(who: Who, lw: number, lh: number): Canvas {
  const c = new Canvas(lw, lh);
  const th = THEME[who];
  const rng = mulberry32(hashString(`portrait:${who}`));
  const goldHi = rgb('#fff3b0');
  const goldMid = rgb('#f2be3d');
  const goldLo = rgb('#a86217');

  // 1. Rich velvet storybook portrait card backdrop with subtle corner scrollwork
  c.fill(vgrad(0, lh, [th.outerTop, th.outerBot], true));
  for (let i = 0; i < 14; i++) {
    c.set(Math.floor(rng.range(3, lw - 3)), Math.floor(rng.range(3, lh - 3)), mix(WHITE, th.accent, 0.55));
  }
  // Gilded hairline frame around the portrait card
  for (let x = 2; x < lw - 2; x++) {
    c.set(x, 2, goldMid);
    c.set(x, lh - 3, goldMid);
  }
  for (let y = 2; y < lh - 2; y++) {
    c.set(2, y, goldMid);
    c.set(lw - 3, y, goldMid);
  }
  // Outer 1px INK border
  for (let x = 0; x < lw; x++) {
    c.set(x, 0, INK);
    c.set(x, lh - 1, INK);
  }
  for (let y = 0; y < lh; y++) {
    c.set(0, y, INK);
    c.set(lw - 1, y, INK);
  }

  // 2. Oval cartouche window geometry (leaves room for crown jewel on top & name ribbon below)
  const cx = lw * 0.5;
  const ribbonH = Math.max(10, Math.round(lh * 0.165));
  const ribbonY1 = lh - 4;
  const ribbonY0 = ribbonY1 - ribbonH;
  const topMargin = Math.max(6, Math.round(lh * 0.085));
  const availH = ribbonY0 - topMargin + 3;
  const availW = lw - Math.max(12, Math.round(lw * 0.18));
  const rx = Math.max(12, availW * 0.48);
  const ry = Math.max(12, availH * 0.48);
  const cy = topMargin + ry + 1;
  const frameT = Math.max(2.6, Math.min(lw, lh) * 0.045);

  const inOval = (x: number, y: number, erx: number, ery: number): boolean => {
    const u = (x - cx) / erx;
    const v = (y - cy) / ery;
    return u * u + v * v <= 1;
  };

  // Ornate golden oval cartouche frame
  c.obj((l) => {
    l.ellipse(cx, cy, rx + frameT, ry + frameT, (x, y) => mix(goldHi, goldLo, ((x - cx) / (rx * 2) + (y - cy) / (ry * 2) + 1) * 0.5));
    // Inner cream fillet
    l.ellipse(cx, cy, rx + 1.2, ry + 1.2, CREAM);
  }, { rim: 0.22, deep: true });

  // Starry twilight vignette inside the oval
  c.shape(cx - rx - 1, cy - ry - 1, cx + rx + 1, cy + ry + 1, (x, y) => inOval(x, y, rx, ry), (x, y) => {
    const t = Math.max(0, Math.min(1, (y - (cy - ry)) / (ry * 2)));
    return mix(th.bgTop, th.bgBot, t);
  });
  c.glow(cx, cy, Math.min(rx, ry) * 1.1, th.halo, 0.4);
  for (let i = 0; i < 18; i++) {
    const sx = rng.range(cx - rx + 2, cx + rx - 2);
    const sy = rng.range(cy - ry + 2, cy + ry - 2);
    if (inOval(sx, sy, rx - 1.5, ry - 1.5)) {
      if (rng.chance(0.22)) c.sparkle(sx, sy, 1, WHITE, th.accent);
      else c.dot(sx, sy, rng.chance(0.5) ? WHITE : th.halo);
    }
  }

  // 3. Extract & crop the character's idle sprite from buildSprites() using head-and-shoulders proportions
  const lib = buildSprites(EMPTY_WARDROBE);
  const sheet = lib[who];
  const frame = sheet.anims.idle?.frames[0] ?? Object.values(sheet.anims).find(Boolean)?.frames[0];
  if (frame) {
    // Detect actual non-transparent bounding box so both stubs and final sprites frame cleanly
    let minX = frame.w;
    let maxX = -1;
    let minY = frame.h;
    let maxY = -1;
    for (let sy = 0; sy < frame.h; sy++) {
      for (let sx = 0; sx < frame.w; sx++) {
        if ((frame.pixels[sy * frame.w + sx] as number) !== 255) {
          if (sx < minX) minX = sx;
          if (sx > maxX) maxX = sx;
          if (sy < minY) minY = sy;
          if (sy > maxY) maxY = sy;
        }
      }
    }
    if (maxX >= minX && maxY >= minY) {
      const bw = maxX - minX + 1;
      const bh = maxY - minY + 1;
      // Head-and-shoulders crop box tailored to each character's canonical proportions:
      // violet (36x52): upright child -> top 62% bust, full width
      // lumi (66x54): unicorn -> upper 78% bust, 92% width (safe regardless of left/right facing)
      // nova (68x36): sleek cheetah -> full height, 92% width (safe regardless of left/right facing)
      let cropW = bw;
      let cropH = bh;
      let cropX0 = minX;
      let cropY0 = minY;
      if (who === 'violet') {
        cropH = Math.max(12, Math.round(bh * 0.62));
      } else if (who === 'lumi') {
        cropH = Math.max(14, Math.round(bh * 0.78));
        cropW = Math.max(14, Math.round(bw * 0.92));
        cropX0 = minX + Math.round((bw - cropW) * 0.5);
      } else {
        cropH = bh;
        cropW = Math.max(14, Math.round(bw * 0.92));
        cropX0 = minX + Math.round((bw - cropW) * 0.5);
      }

      // Fit cropped bust inside the oval window with crisp NEAREST scaling
      const targetW = rx * 1.62;
      const targetH = ry * 1.62;
      const scale = Math.min(targetW / cropW, targetH / cropH);
      const drawW = Math.max(1, Math.round(cropW * scale));
      const drawH = Math.max(1, Math.round(cropH * scale));
      const dstX0 = Math.round(cx - drawW * 0.5);
      // Anchor upright Violet as a classic seated bust, balance Lumi, and center sleek Nova
      const dstY0 =
        who === 'violet'
          ? Math.round(cy + ry * 0.88 - drawH)
          : who === 'lumi'
            ? Math.round(cy + ry * 0.72 - drawH)
            : Math.round(cy + ry * 0.08 - drawH * 0.5);

      for (let dy = 0; dy < drawH; dy++) {
        const py = dstY0 + dy;
        const sy = cropY0 + Math.min(cropH - 1, Math.floor(dy / scale));
        for (let dx = 0; dx < drawW; dx++) {
          const px = dstX0 + dx;
          if (!c.inb(px, py) || !inOval(px + 0.5, py + 0.5, rx - 0.6, ry - 0.6)) continue;
          const sx = cropX0 + Math.min(cropW - 1, Math.floor(dx / scale));
          if (sx < 0 || sy < 0 || sx >= frame.w || sy >= frame.h) continue;
          const id = frame.pixels[sy * frame.w + sx] as number;
          if (id === 255) continue;
          const col: RGB = id === 0 ? INK : regionRgb(id, undefined);
          c.set(px, py, col);
        }
      }
    }
  }

  // Crisp 1px inner ink rim around the oval opening so the cartouche frames the character cleanly
  for (let y = Math.floor(cy - ry - 1); y <= Math.ceil(cy + ry + 1); y++) {
    for (let x = Math.floor(cx - rx - 1); x <= Math.ceil(cx + rx + 1); x++) {
      if (!c.inb(x, y) || !inOval(x + 0.5, y + 0.5, rx, ry)) continue;
      const edge =
        !inOval(x - 0.5, y + 0.5, rx, ry) ||
        !inOval(x + 1.5, y + 0.5, rx, ry) ||
        !inOval(x + 0.5, y - 0.5, rx, ry) ||
        !inOval(x + 0.5, y + 1.5, rx, ry);
      if (edge) c.set(x, y, INK);
    }
  }

  // 4. Crown star jewel at top of the oval cartouche
  const crownY = Math.max(4, Math.round(cy - ry - frameT * 0.55));
  c.obj((l) => {
    l.star(cx, crownY, 4.0, 1.8, goldHi);
    l.dot(cx, crownY, th.accent);
  }, { rim: 0.12 });

  // 5. Curled storybook name ribbon across the bottom of the frame
  const ribW = Math.min(lw - 8, Math.max(textWidth(th.name, 1) + 14, Math.round(lw * 0.76)));
  const ribX0 = Math.round(cx - ribW * 0.5);
  const ribX1 = ribX0 + ribW;
  const rcy = Math.round((ribbonY0 + ribbonY1) * 0.5);
  // Forked ribbon tails peeking behind left & right
  c.obj((l) => {
    const tailW = Math.max(3, Math.round(lw * 0.08));
    l.poly([
      [ribX0 + 2, ribbonY0 + 2],
      [ribX0 - tailW, ribbonY0 + 2],
      [ribX0 - tailW + 2, rcy + 1],
      [ribX0 - tailW, ribbonY1 + 1],
      [ribX0 + 2, ribbonY1 + 1],
    ], shade(th.ribbon, 0.35));
    l.poly([
      [ribX1 - 2, ribbonY0 + 2],
      [ribX1 + tailW, ribbonY0 + 2],
      [ribX1 + tailW - 2, rcy + 1],
      [ribX1 + tailW, ribbonY1 + 1],
      [ribX1 - 2, ribbonY1 + 1],
    ], shade(th.ribbon, 0.35));
  }, { rim: 0.1 });
  // Main front ribbon banner with gold trim
  c.obj((l) => {
    l.rrect(ribX0, ribbonY0, ribX1, ribbonY1, 2, vgrad(ribbonY0, ribbonY1, [light(th.ribbon, 0.15), th.ribbon, shade(th.ribbon, 0.25)]));
    l.rect(ribX0 + 1, ribbonY0, ribX1 - 1, ribbonY0 + 1, goldHi);
    l.rect(ribX0 + 1, ribbonY1 - 1, ribX1 - 1, ribbonY1, goldMid);
  }, { rim: 0.15 });

  // Character name centered cleanly on the ribbon via our pixel font
  const scale = textWidth(th.name, 2) <= ribW - 8 && ribbonH >= 13 ? 2 : 1;
  const tw = textWidth(th.name, scale);
  const tx = Math.round(cx - tw * 0.5);
  const ty = Math.round(rcy - (5 * scale) * 0.5);
  drawText(c, th.name, tx + 1, ty + 1, INK, scale);
  drawText(c, th.name, tx, ty, CREAM, scale);

  // Corner twinkle sparkles
  c.sparkle(6, 6, 1, goldHi);
  c.sparkle(lw - 7, 6, 1, th.accent);

  return c;
}
