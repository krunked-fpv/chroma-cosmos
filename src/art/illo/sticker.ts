/**
 * Die-cut vinyl relic stickers: scalloped badge with thick cream border, crisp ink outline,
 * glossy diagonal gleam, and transparent (alpha = 0) outer corners. Pure + deterministic.
 */
import type { RelicId } from '../../contracts/roguelike';
import { Canvas, CREAM, INK, light, mix, rgrad, rgb, type RGB, shade, WHITE } from './canvas';
import { drawRelicIcon } from './icons';

const STICKER_BG: Record<RelicId, { inner: RGB; edge: RGB; rim: RGB }> = {
  zoomiePaw: { inner: rgb('#7a2b69'), edge: rgb('#3b144a'), rim: rgb('#ffd43b') },
  prismRibbon: { inner: rgb('#2b4a8c'), edge: rgb('#1d1a59'), rim: rgb('#7fe7f0') },
  uvFlashlight: { inner: rgb('#4d218a'), edge: rgb('#1c0d42'), rim: rgb('#d08cff') },
  kaleidoSharpener: { inner: rgb('#6e2570'), edge: rgb('#27124d'), rim: rgb('#ff8fd0') },
  sleepyMoonCat: { inner: rgb('#3c2678'), edge: rgb('#1a1042'), rim: rgb('#eac46f') },
  gravityFlipFlop: { inner: rgb('#22457a'), edge: rgb('#141c4a'), rim: rgb('#7fe7f0') },
  doubleMilkshake: { inner: rgb('#782766'), edge: rgb('#361142'), rim: rgb('#ff9ec2') },
  starlightMagnet: { inner: rgb('#5c236e'), edge: rgb('#221045'), rim: rgb('#eac46f') },
  chromaticButterfly: { inner: rgb('#1b4a70'), edge: rgb('#101d42'), rim: rgb('#7bffb8') },
  constellationCrown: { inner: rgb('#442178'), edge: rgb('#1b0e42'), rim: rgb('#eac46f') },
};

export function drawRelicSticker(relic: RelicId, lw: number, lh: number): Canvas {
  const c = new Canvas(lw, lh);
  const cx = lw * 0.5;
  const cy = lh * 0.5;
  const s = Math.min(lw, lh);
  const th = STICKER_BG[relic];

  // Scalloped die-cut radius function (10 gentle petals around a chunky badge)
  const outerR = s * 0.45;
  const borderW = Math.max(3.2, s * 0.088);
  const innerR = outerR - borderW;

  const scallop = (x: number, y: number, baseR: number, amp: number): boolean => {
    const dx = x - cx;
    const dy = y - cy;
    const a = Math.atan2(dy, dx);
    const r = baseR + Math.cos(a * 10) * amp;
    return dx * dx + dy * dy <= r * r;
  };
  const amp = Math.max(1.2, s * 0.028);

  // Subtle offset bottom-right sticker lift shadow (still tight to the die-cut, transparent outside!)
  c.shape(cx - outerR - 2, cy - outerR - 2, cx + outerR + 3, cy + outerR + 3, (x, y) => scallop(x - 1.2, y - 1.5, outerR, amp), rgb('#2a1c4d'));

  // Thick cream die-cut vinyl silhouette with 1px INK outline
  c.obj((l) => {
    l.shape(cx - outerR - 2, cy - outerR - 2, cx + outerR + 2, cy + outerR + 2, (x, y) => scallop(x, y, outerR, amp), (x, y) => {
      const t = (x - cx + y - cy) / (outerR * 2.4);
      return t > 0.25 ? shade(CREAM, 0.08) : CREAM;
    });
  }, { rim: 0.12 });

  // Inner coloured sticker medallion with gold/accent ring
  c.obj((l) => {
    l.disc(cx, cy, innerR, rgrad(cx - innerR * 0.25, cy - innerR * 0.25, innerR * 1.15, [light(th.inner, 0.18), th.inner, th.edge], true));
    l.ring(cx, cy, innerR - Math.max(1.4, s * 0.03), innerR, th.rim);
  }, { rim: 0.15 });

  // Bold relic hero icon centered inside the sticker
  drawRelicIcon(c, relic, cx, cy, innerR * 0.78);

  // Glossy diagonal vinyl gleam streak (clipped to inside the cream die-cut)
  for (let y = 0; y < lh; y++) {
    for (let x = 0; x < lw; x++) {
      if (!scallop(x + 0.5, y + 0.5, innerR - 0.5, 0)) continue;
      const u = (x - cx) * 0.72 + (y - cy) * 0.69;
      if (Math.abs(u + innerR * 0.32) < Math.max(1.2, s * 0.032) || Math.abs(u + innerR * 0.12) < Math.max(0.6, s * 0.013)) {
        c.over(x, y, WHITE, 68);
      }
    }
  }

  // Crisp twinkle sparkle on upper-left rim
  c.sparkle(cx - innerR * 0.62, cy - innerR * 0.62, Math.max(1, Math.round(s * 0.035)), WHITE, rgb('#fff3b0'));
  c.sparkle(cx + innerR * 0.64, cy + innerR * 0.58, 1, mix(WHITE, th.rim, 0.4));

  return c;
}
