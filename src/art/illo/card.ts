/**
 * Ornate storybook trading-card illustrations for the 4 Brushes + 4 Relics in DRAFT_CARDS.
 * Pure + deterministic.
 */
import { DRAFT_CARDS, type DraftCardId } from '../../contracts/roguelike';
import { hashString, mulberry32 } from '../../scenes/context';
import { Canvas, CREAM, INK, light, mix, rgrad, rgb, type RGB, shade, vgrad, WHITE } from './canvas';
import { drawText, textWidth } from './font';
import { drawDraftIcon } from './icons';

const CARD_THEME: Record<DraftCardId, { bgTop: RGB; bgBot: RGB; halo: RGB; gem: RGB; tag: string }> = {
  turboCheetah: { bgTop: rgb('#2a154d'), bgBot: rgb('#7a2b52'), halo: rgb('#ffb84d'), gem: rgb('#ff9a3c'), tag: 'TURBO' },
  twinTail: { bgTop: rgb('#1d1b59'), bgBot: rgb('#5e348a'), halo: rgb('#9bf6ff'), gem: rgb('#7fe7f0'), tag: 'TWIN' },
  supernovaSponge: { bgTop: rgb('#2b134a'), bgBot: rgb('#782468'), halo: rgb('#ff8fd0'), gem: rgb('#ff6b9d'), tag: 'NOVA' },
  zeroGGel: { bgTop: rgb('#111f52'), bgBot: rgb('#3b2c82'), halo: rgb('#a8ffcf'), gem: rgb('#7fe7f0'), tag: 'ZERO-G' },
  zoomiePaw: { bgTop: rgb('#30164a'), bgBot: rgb('#753257'), halo: rgb('#ffe066'), gem: rgb('#ffd43b'), tag: 'ZOOMIE' },
  prismRibbon: { bgTop: rgb('#1b1a59'), bgBot: rgb('#4f2e85'), halo: rgb('#9bf6ff'), gem: rgb('#ff85c0'), tag: 'PRISM' },
  uvFlashlight: { bgTop: rgb('#160d3d'), bgBot: rgb('#49207d'), halo: rgb('#d08cff'), gem: rgb('#b678ff'), tag: 'UV' },
  kaleidoSharpener: { bgTop: rgb('#221652'), bgBot: rgb('#692878'), halo: rgb('#ffd6a5'), gem: rgb('#9bf6ff'), tag: 'FOIL' },
};

export function drawCard(card: DraftCardId, lw: number, lh: number): Canvas {
  const c = new Canvas(lw, lh);
  const def = DRAFT_CARDS.find((d) => d.id === card);
  const isRelic = def?.type === 'relic';
  const th = CARD_THEME[card];
  const rng = mulberry32(hashString(`card:${card}`));

  // Outer card surface (fills canvas, rounded ornate frame inside)
  const frameTop = isRelic ? rgb('#78286b') : rgb('#3b2880');
  const frameBot = isRelic ? rgb('#3d1345') : rgb('#1d134a');
  const goldHi = rgb('#fff3b0');
  const goldMid = rgb('#f5c03e');
  const goldLo = rgb('#ad6818');

  // Deep card backdrop
  c.fill(vgrad(0, lh, [rgb('#1a1038'), rgb('#110a29')]));

  // Ornate gilded card body
  const pad = 2;
  c.obj((l) => {
    // Card silhouette
    l.rrect(pad, pad, lw - pad, lh - pad, 5, vgrad(pad, lh - pad, [frameTop, frameBot], true));
    // Outer gilded rim
    l.shape(
      pad,
      pad,
      lw - pad,
      lh - pad,
      (x, y) => {
        const inO = x >= pad && x < lw - pad && y >= pad && y < lh - pad;
        const inI = x >= pad + 2 && x < lw - pad - 2 && y >= pad + 2 && y < lh - pad - 2;
        return inO && !inI;
      },
      (x, y) => mix(goldHi, goldLo, (x + y) / (lw + lh)),
    );
  }, { rim: 0.2, deep: false });

  // Layout art window & bottom banner strip
  const m = Math.max(5, Math.round(Math.min(lw, lh) * 0.085));
  const bannerH = Math.max(11, Math.round(lh * 0.18));
  const winX0 = m;
  const winY0 = m;
  const winX1 = lw - m;
  const winY1 = lh - m - bannerH - 2;
  const winW = winX1 - winX0;
  const winH = winY1 - winY0;
  const cx = lw * 0.5;
  const wcy = winY0 + winH * 0.5;

  // Recessed starry art window with crisp ink + gold bevel
  c.rect(winX0 - 1, winY0 - 1, winX1 + 1, winY1 + 1, goldMid);
  c.rect(winX0, winY0, winX1, winY1, INK);
  c.shape(winX0 + 1, winY0 + 1, winX1 - 1, winY1 - 1, () => true, vgrad(winY0, winY1, [th.bgTop, th.bgBot], true));

  // Soft magical sunburst halo behind hero icon
  const iconR = Math.max(10, Math.min(winW, winH) * 0.42);
  c.glow(cx, wcy, iconR * 1.45, th.halo, 0.42);

  // Subtle decorative starry ring + twinkling stars inside art window
  c.ring(cx, wcy, iconR * 0.9, iconR * 0.98, mix(th.halo, th.bgTop, 0.55));
  for (let i = 0; i < 16; i++) {
    const sx = Math.floor(rng.range(winX0 + 2, winX1 - 2));
    const sy = Math.floor(rng.range(winY0 + 2, winY1 - 2));
    c.set(sx, sy, rng.chance(0.4) ? WHITE : light(th.halo, 0.3));
  }

  // Bold hero icon centered in the art window
  drawDraftIcon(c, card, cx, wcy, iconR);

  // Corner flourishes / star rivets on the gilded card corners
  const corners: Array<[number, number]> = [
    [pad + 3, pad + 3],
    [lw - pad - 4, pad + 3],
    [pad + 3, lh - pad - 4],
    [lw - pad - 4, lh - pad - 4],
  ];
  for (const [kx, ky] of corners) {
    c.disc(kx, ky, 2.2, INK);
    c.disc(kx, ky, 1.4, goldHi);
    c.dot(kx, ky, th.gem);
  }

  // Top crest gem (distinguishes brush = cyan/violet diamond vs relic = golden star)
  const crestY = Math.max(4, Math.round(winY0 * 0.55));
  c.obj((l) => {
    if (isRelic) l.star(cx, crestY, 3.6, 1.7, goldHi);
    else l.poly([[cx, crestY - 3], [cx + 3.5, crestY], [cx, crestY + 3], [cx - 3.5, crestY]], th.gem);
  }, { rim: 0.15 });

  // Bottom nameplate banner with pixel-font label & flanking gems
  const by0 = winY1 + 2;
  const by1 = lh - m + 1;
  const bcy = Math.round((by0 + by1) * 0.5);
  c.obj((l) => {
    l.rrect(winX0, by0, winX1, by1, 2, vgrad(by0, by1, [CREAM, rgb('#edd8ab')]));
    l.rect(winX0 + 1, by1 - 2, winX1 - 1, by1 - 1, shade(rgb('#edd8ab'), 0.25));
  }, { rim: 0.1 });

  // Draw crisp label centered on the cream banner
  const label = th.tag;
  const scale = lw >= 96 && textWidth(label, 2) <= winW - 14 && by1 - by0 >= 13 ? 2 : 1;
  const tw = textWidth(label, scale);
  const tx = Math.round(cx - tw * 0.5);
  const ty = Math.round(bcy - (5 * scale) * 0.5);
  drawText(c, label, tx, ty, INK, scale);

  // Flanking gems on the banner if there's room
  if (tw + 14 <= winW) {
    const gxL = Math.round(winX0 + 4);
    const gxR = Math.round(winX1 - 5);
    c.disc(gxL, bcy, 1.8, INK);
    c.dot(gxL, bcy, th.gem);
    c.disc(gxR, bcy, 1.8, INK);
    c.dot(gxR, bcy, th.gem);
  }

  // Subtle top-left card sparkle
  c.sparkle(winX0 + 4, winY0 + 4, 1, WHITE);
  c.sparkle(winX1 - 5, winY1 - 5, 1, goldHi);

  return c;
}
