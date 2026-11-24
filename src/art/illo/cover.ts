/**
 * Seeded hardcover storybook cover: stitched book spine, swirled cosmic nebula, planets,
 * tiny hero silhouettes / shooting comet, and an ornate gilded title plate with pixel-font wrapped text.
 * Pure + deterministic.
 */
import { hashString, mulberry32 } from '../../scenes/context';
import { Canvas, CREAM, dith, INK, light, mix, type Pt, ramp, rgrad, rgb, type RGB, shade, vgrad, vnoise, WHITE } from './canvas';
import { drawTextBlock, fitText } from './font';

const NEBULA_SCHEMES: ReadonlyArray<readonly [RGB, RGB, RGB, RGB]> = [
  [rgb('#140d38'), rgb('#43247d'), rgb('#c94da6'), rgb('#ffd1e8')],
  [rgb('#0d1642'), rgb('#253f8a'), rgb('#4fc3e8'), rgb('#d6f9ff')],
  [rgb('#1f0e40'), rgb('#662678'), rgb('#f06c8e'), rgb('#ffe29e')],
  [rgb('#121345'), rgb('#3d2b8c'), rgb('#7fe7f0'), rgb('#ffe9b8')],
];

const PLANET_COLS: ReadonlyArray<readonly [RGB, RGB, RGB]> = [
  [rgb('#fff0b8'), rgb('#ffb378'), rgb('#d9687a')],
  [rgb('#d6f9ff'), rgb('#7fe7f0'), rgb('#4c78d4')],
  [rgb('#ffe0f0'), rgb('#ff8ec6'), rgb('#9440a8')],
  [rgb('#e8ffd6'), rgb('#8ce8b8'), rgb('#3b7a8c')],
];

export function drawBookCover(seed: number, title: string, lw: number, lh: number): Canvas {
  const c = new Canvas(lw, lh);
  const rng = mulberry32((seed * 2654435761) ^ hashString(`cover:${title}`));
  const scheme = NEBULA_SCHEMES[Math.abs(seed) % NEBULA_SCHEMES.length]!;
  const goldHi = rgb('#fff3b0');
  const goldMid = rgb('#f2be3d');
  const goldLo = rgb('#a86217');

  // Spine geometry on the left edge
  const spineW = Math.max(6, Math.round(lw * 0.11));
  const coverX0 = spineW;
  const coverW = lw - coverX0;
  const coverCx = coverX0 + coverW * 0.5;
  const swirlCx = coverX0 + coverW * rng.range(0.38, 0.65);
  const swirlCy = lh * rng.range(0.42, 0.72);
  const swirlDir = rng.chance(0.5) ? 1 : -1;
  const swirlTwist = rng.range(3.6, 5.4);
  const noiseSeed = (seed & 1023) + 17;

  // 1. Seeded swirling galaxy cover art across the front cover
  for (let y = 0; y < lh; y++) {
    for (let x = coverX0; x < lw; x++) {
      const dx = (x - swirlCx) / (coverW * 0.62);
      const dy = (y - swirlCy) / (lh * 0.55);
      const r = Math.hypot(dx, dy);
      const a = Math.atan2(dy, dx);
      const arm = Math.sin(a * 2 + swirlDir * r * swirlTwist) * 0.5 + 0.5;
      const n = vnoise(x * 0.08, y * 0.08, noiseSeed);
      const radial = Math.max(0, 1 - r * 0.72);
      const t = Math.max(0, Math.min(0.999, radial * (arm * 0.62 + 0.38) * 0.85 + n * 0.28));
      const k = t * (scheme.length - 1);
      const i = Math.floor(k);
      c.set(x, y, dith(scheme[i] as RGB, scheme[i + 1] as RGB, k - i, x, y));
    }
  }

  // Scattered twinkling stars across the cover sky
  for (let i = 0; i < 36; i++) {
    const sx = Math.floor(rng.range(coverX0 + 3, lw - 3));
    const sy = Math.floor(rng.range(3, lh - 3));
    const col = rng.pick([WHITE, rgb('#ffe999'), rgb('#b8f2ff'), rgb('#ffd1eb')]);
    if (rng.chance(0.16)) c.sparkle(sx, sy, rng.int(1, 2), col, WHITE);
    else c.set(sx, sy, col);
  }

  // 2. Seeded ringed planet & companion moon in the lower art region (clamped inside gold border)
  const pCols = rng.pick(PLANET_COLS);
  const pr = Math.max(5, Math.min(coverW, lh) * rng.range(0.105, 0.14));
  const pxMin = coverX0 + pr * 2.0 + 4;
  const pxMax = lw - pr * 2.0 - 4;
  const px = pxMax > pxMin ? rng.range(pxMin, pxMax) : coverCx;
  const py = lh * rng.range(0.67, 0.78);
  const tilt = rng.range(-0.36, 0.36);
  c.glow(px, py, pr * 2.0, pCols[1], 0.32);
  // Ring back
  c.ering(px, py, pr * 1.85, pr * 0.5, 0.62, rgb('#ffe6a3'), tilt);
  // Planet body
  c.obj((l) => {
    l.disc(px, py, pr, rgrad(px - pr * 0.35, py - pr * 0.35, pr * 1.25, [pCols[0], pCols[1], pCols[2]]));
  }, { rim: 0.22 });
  // Front arc of ring
  c.shape(
    px - pr * 2,
    py - pr,
    px + pr * 2,
    py + pr,
    (x, y) => {
      const dx = x - px;
      const dy = y - py;
      const co = Math.cos(tilt);
      const si = Math.sin(tilt);
      const u = (dx * co + dy * si) / (pr * 1.85);
      const v = (-dx * si + dy * co) / (pr * 0.5);
      return v > 0 && u * u + v * v <= 1 && u * u + v * v >= 0.62 * 0.62;
    },
    goldHi,
  );

  // Small companion moon + graceful shooting comet streaking across the galaxy
  const mx = px < coverCx ? Math.min(lw - 11, coverX0 + coverW * 0.8) : Math.max(coverX0 + 11, coverX0 + coverW * 0.2);
  const my = lh * rng.range(0.64, 0.76);
  const mr = Math.max(3, pr * 0.48);
  c.obj((l) => {
    l.disc(mx, my, mr, rgrad(mx - 1, my - 1, mr * 1.2, [WHITE, rgb('#ffd97d'), rgb('#ff9a52')]));
  }, { rim: 0.15 });

  // Charming shooting comet arcing across mid-cover
  const cometY = lh * rng.range(0.55, 0.62);
  const cometX0 = coverX0 + coverW * 0.16;
  const cometX1 = coverX0 + coverW * 0.48;
  c.stroke([
    [cometX0, cometY + 6],
    [(cometX0 + cometX1) * 0.5, cometY + 1],
    [cometX1, cometY - 3],
  ], 0.6, rgb('#ffe999'), 1.6);
  c.sparkle(cometX1, cometY - 3, 2, WHITE, rgb('#fff3b0'));

  // Cozy twilight storybook crescent hill at the bottom edge with tiny glowing star-gazing silhouettes
  if (lh >= 84) {
    const hillY = lh - 5;
    c.ellipse(coverCx, hillY + 9, coverW * 0.62, 12, rgb('#1d1042'));
    const hx = Math.round(coverCx);
    const hy = hillY - 2;
    // Tiny Lumi silhouette (left, arched neck + horn)
    c.ellipse(hx - 10, hy, 3.2, 1.8, INK);
    c.line(hx - 12, hy - 1, hx - 13, hy - 5, INK);
    c.line(hx - 13, hy - 5, hx - 14, hy - 8, goldHi);
    // Tiny Violet silhouette (center, round helmet + starlight gleam)
    c.disc(hx, hy - 5, 2.3, INK);
    c.ellipse(hx, hy - 1, 2.0, 2.6, INK);
    c.dot(hx - 1, hy - 6, rgb('#ff9ecf'));
    // Tiny Nova silhouette (right, sleek cheetah + curving tail)
    c.ellipse(hx + 10, hy, 3.0, 1.5, INK);
    c.disc(hx + 12, hy - 2, 1.3, INK);
    c.line(hx + 7, hy, hx + 5, hy - 3, INK);
    c.dot(hx + 13, hy - 3, rgb('#ffd43b'));
  }

  // 3. Ornate gilded corner frame on the front cover
  const fm = 3;
  const fx0 = coverX0 + fm;
  const fy0 = fm;
  const fx1 = lw - fm - 1;
  const fy1 = lh - fm - 1;
  // Thin gold hairline border inset around front cover
  for (let x = fx0; x <= fx1; x++) {
    c.set(x, fy0, goldMid);
    c.set(x, fy1, goldMid);
  }
  for (let y = fy0; y <= fy1; y++) {
    c.set(fx0, y, goldMid);
    c.set(fx1, y, goldMid);
  }
  // Ornate gilded corner brackets
  for (const [bx, by, sx, sy] of [
    [fx0, fy0, 1, 1],
    [fx1, fy0, -1, 1],
    [fx0, fy1, 1, -1],
    [fx1, fy1, -1, -1],
  ] as const) {
    c.rect(Math.min(bx, bx + sx * 4), Math.min(by, by + sy * 1), Math.max(bx, bx + sx * 4) + 1, Math.max(by, by + sy * 1) + 1, goldHi);
    c.rect(Math.min(bx, bx + sx * 1), Math.min(by, by + sy * 4), Math.max(bx, bx + sx * 1) + 1, Math.max(by, by + sy * 4) + 1, goldHi);
    c.dot(bx + sx * 2, by + sy * 2, WHITE);
  }

  // 4. Ornate gilded Title Plate in the upper portion of the front cover
  const platePadX = Math.max(5, Math.round(coverW * 0.08));
  const plateX0 = coverX0 + platePadX;
  const plateX1 = lw - platePadX;
  const plateW = plateX1 - plateX0;
  const plateY0 = Math.max(7, Math.round(lh * 0.1));
  const plateMaxH = Math.max(24, Math.round(lh * 0.44));

  const displayTitle = title.trim();
  const innerPadX = 4;
  const innerPadY = 4;
  const maxTextW = Math.max(12, plateW - innerPadX * 2);
  const maxTextH = Math.max(12, plateMaxH - innerPadY * 2);
  const maxScale = lw >= 110 && lh >= 100 ? 2 : 1;
  const fitted = displayTitle ? fitText(displayTitle, maxTextW, maxTextH, maxScale) : null;
  const plateH = fitted ? Math.max(18, Math.min(plateMaxH, fitted.height + innerPadY * 2 + 4)) : Math.min(26, plateMaxH);
  const plateY1 = plateY0 + plateH;

  c.obj((l) => {
    // Gold outer plate frame
    l.rrect(plateX0, plateY0, plateX1, plateY1, 3, vgrad(plateY0, plateY1, [goldHi, goldMid, goldLo]));
    // Warm cream storybook parchment interior
    l.rrect(plateX0 + 2, plateY0 + 2, plateX1 - 2, plateY1 - 2, 2, vgrad(plateY0 + 2, plateY1 - 2, [CREAM, rgb('#f2dfb8')]));
    // Corner star rivets
    l.dot(plateX0 + 3, plateY0 + 3, goldLo);
    l.dot(plateX1 - 4, plateY0 + 3, goldLo);
    l.dot(plateX0 + 3, plateY1 - 4, goldLo);
    l.dot(plateX1 - 4, plateY1 - 4, goldLo);
  }, { rim: 0.14 });

  // Crown star atop the title plate
  c.obj((l) => {
    l.star(coverCx, plateY0, 3.6, 1.6, goldHi);
  }, { rim: 0.1 });

  if (fitted) {
    const top = Math.round(plateY0 + (plateH - fitted.height) * 0.5);
    drawTextBlock(c, fitted, coverCx, top, INK, rgb('#e8cc96'));
  } else {
    // Decorative golden emblem when title is empty
    const ecy = Math.round((plateY0 + plateY1) * 0.5);
    c.obj((l) => {
      l.star(coverCx, ecy, 6, 2.8, goldMid);
    }, { rim: 0.15 });
    c.sparkle(coverCx - 12, ecy, 2, goldLo, goldHi);
    c.sparkle(coverCx + 12, ecy, 2, goldLo, goldHi);
  }

  // 5. Hardcover stitched book spine on the left edge with 3D cylindrical shading & gold bands
  for (let y = 0; y < lh; y++) {
    for (let x = 0; x < spineW; x++) {
      const t = x / Math.max(1, spineW - 1);
      // Curved hardcover leather/cloth highlight peaking near t = 0.32
      const curve = Math.sin(t * Math.PI);
      const base = mix(rgb('#261554'), rgb('#5d3ca6'), curve * 0.85);
      const vShade = mix(base, rgb('#180d3b'), Math.abs(y / lh - 0.5) * 0.4);
      c.set(x, y, vShade);
    }
    // Crisp groove / gutter crease separating spine from front board
    c.set(spineW - 1, y, INK);
    if (spineW < lw) c.over(spineW, y, WHITE, 55);
    if (spineW + 1 < lw) c.over(spineW + 1, y, INK, 65);
  }
  // Raised gilded spine ribs
  for (const frac of [0.16, 0.3, 0.72, 0.86]) {
    const ry = Math.round(lh * frac);
    c.rect(1, ry, spineW - 1, ry + 2, (x) => (x < spineW * 0.5 ? goldHi : goldLo));
  }

  // Outer 1px INK hardcover book edge
  for (let x = 0; x < lw; x++) {
    c.set(x, 0, INK);
    c.set(x, lh - 1, INK);
  }
  for (let y = 0; y < lh; y++) {
    c.set(0, y, INK);
    c.set(lw - 1, y, INK);
  }

  return c;
}
