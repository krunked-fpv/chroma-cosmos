/** PNG keepsake postcard + browser download helpers. DOM-only parts are guarded. */
import { INK_HEX, PAGE_H, PAGE_W, PAPER_HEX } from '../contracts/constants';
import type { KeepsakeMeta } from '../contracts/vault';

export const POSTCARD_W = 1920;
export const POSTCARD_H = 1080;

/** System rounded stack only: no external fonts. */
export const POSTCARD_FONT = 'ui-rounded, "SF Pro Rounded", "Hiragino Maru Gothic ProN", "Arial Rounded MT Bold", "Varela Round", Nunito, "Segoe UI", system-ui, sans-serif';

const FRAME = 20; // outer heirloom gilded border inset
const INNER_FRAME = 28; // inner gilded hairline border inset
const PAGE_SCALE = 3; // 480x270 -> 1440x810, integer so the pixels stay square
const PAGE_W_SCALED = PAGE_W * PAGE_SCALE;
const PAGE_H_SCALED = PAGE_H * PAGE_SCALE;
const PAGE_X = (POSTCARD_W - PAGE_W_SCALED) / 2; // 240
const PAGE_Y = 148;

const GILT_DARK = '#b8883b';
const GILT_MID = '#cca052';
const GILT_LIGHT = '#e6c989';
const COTTON_TOP = '#fcf6e8';
const COTTON_MID = PAPER_HEX; // #fbf3e0
const COTTON_BOT = '#f2e3c5';
const MAT_BEVEL_SHADOW = 'rgba(116, 86, 48, 0.24)';
const MAT_BEVEL_LIGHT = 'rgba(255, 253, 246, 0.85)';

function hasDom(): boolean {
  return typeof document !== 'undefined' && typeof document.createElement === 'function';
}

/** Graceful 4-point celestial compass star for gilded corner flourishes and dividers. */
function fourPointStar(ctx: CanvasRenderingContext2D, cx: number, cy: number, r: number, color: string): void {
  const inner = r * 0.28;
  ctx.fillStyle = color;
  ctx.beginPath();
  for (let i = 0; i < 8; i++) {
    const rad = i % 2 === 0 ? r : inner;
    const a = -Math.PI / 2 + (i * Math.PI) / 4;
    const x = cx + Math.cos(a) * rad;
    const y = cy + Math.sin(a) * rad;
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.closePath();
  ctx.fill();
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number): void {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

/** Deterministic pseudo-random for linen cotton weave and paper fibers (same postcard every time). */
function lcg(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s = (Math.imul(s, 1664525) + 1013904223) >>> 0;
    return s / 0x100000000;
  };
}

/** Tactile cold-press cotton-linen grain over the cream matte border. */
function drawCottonLinenTexture(ctx: CanvasRenderingContext2D): void {
  const rnd = lcg(0xc0ffee);
  ctx.save();
  // Soft woven linen horizontal threads
  ctx.lineWidth = 1;
  for (let y = 6; y < POSTCARD_H; y += 7) {
    ctx.strokeStyle = y % 14 === 6 ? 'rgba(156, 126, 86, 0.045)' : 'rgba(255, 253, 246, 0.09)';
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(POSTCARD_W, y);
    ctx.stroke();
  }
  // Soft woven linen vertical threads
  for (let x = 8; x < POSTCARD_W; x += 9) {
    ctx.strokeStyle = x % 18 === 8 ? 'rgba(156, 126, 86, 0.038)' : 'rgba(255, 253, 246, 0.075)';
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, POSTCARD_H);
    ctx.stroke();
  }
  // Subtle natural cotton deckle flecks on the matte margin
  for (let i = 0; i < 160; i++) {
    const x = rnd() * POSTCARD_W;
    const y = rnd() * POSTCARD_H;
    const inPage = x > PAGE_X - 14 && x < PAGE_X + PAGE_W_SCALED + 14 && y > PAGE_Y - 14 && y < PAGE_Y + PAGE_H_SCALED + 14;
    if (inPage) continue;
    ctx.fillStyle = i % 3 === 0 ? 'rgba(164, 132, 90, 0.11)' : 'rgba(255, 252, 244, 0.25)';
    ctx.fillRect(x, y, 1.5 + rnd() * 2.5, 1.2 + rnd() * 1.4);
  }
  ctx.restore();
}

/** Delicate gilded botanical-celestial corner flourish mirrored cleanly across all 4 corners. */
function drawCornerFlourish(ctx: CanvasRenderingContext2D, ox: number, oy: number, sx: 1 | -1, sy: 1 | -1): void {
  ctx.save();
  ctx.translate(ox, oy);
  ctx.scale(sx, sy);
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  // Inner stepped L-bracket in antique gilt
  ctx.strokeStyle = GILT_DARK;
  ctx.lineWidth = 2.2;
  ctx.beginPath();
  ctx.moveTo(0, 74);
  ctx.lineTo(0, 14);
  ctx.quadraticCurveTo(0, 0, 14, 0);
  ctx.lineTo(86, 0);
  ctx.stroke();

  // Delicate scroll curl sweeping along horizontal and vertical edges
  ctx.strokeStyle = GILT_MID;
  ctx.lineWidth = 1.75;
  ctx.beginPath();
  ctx.moveTo(14, 14);
  ctx.bezierCurveTo(38, 12, 54, 4, 84, 10);
  ctx.quadraticCurveTo(96, 13, 94, 21);
  ctx.quadraticCurveTo(91, 27, 83, 24);
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(14, 14);
  ctx.bezierCurveTo(12, 34, 4, 48, 10, 74);
  ctx.quadraticCurveTo(13, 84, 21, 82);
  ctx.quadraticCurveTo(27, 79, 24, 72);
  ctx.stroke();

  // Fine inner filigree arc connecting the scroll arms
  ctx.strokeStyle = GILT_LIGHT;
  ctx.lineWidth = 1.3;
  ctx.beginPath();
  ctx.moveTo(10, 42);
  ctx.quadraticCurveTo(28, 28, 46, 10);
  ctx.stroke();

  // Gilded compass star & stardust beads nestled inside the corner curl
  fourPointStar(ctx, 26, 26, 9.5, GILT_DARK);
  fourPointStar(ctx, 26, 26, 5.5, GILT_LIGHT);

  ctx.fillStyle = GILT_MID;
  for (const [dx, dy, r] of [
    [52, 22, 2.2],
    [66, 17, 1.6],
    [22, 48, 2.2],
    [17, 61, 1.6],
    [40, 40, 1.7],
  ] as const) {
    ctx.beginPath();
    ctx.arc(dx, dy, r, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

/** Restrained vertical celestial ornament centered in each side cotton matte column. */
function drawSideMedallion(ctx: CanvasRenderingContext2D, cx: number, cy: number): void {
  ctx.save();
  ctx.strokeStyle = GILT_LIGHT;
  ctx.lineWidth = 1.25;
  ctx.beginPath();
  ctx.moveTo(cx, cy - 170);
  ctx.lineTo(cx, cy - 28);
  ctx.moveTo(cx, cy + 28);
  ctx.lineTo(cx, cy + 170);
  ctx.stroke();

  // Fine diamond halo around central compass star
  ctx.strokeStyle = GILT_MID;
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(cx, cy - 22);
  ctx.lineTo(cx + 15, cy);
  ctx.lineTo(cx, cy + 22);
  ctx.lineTo(cx - 15, cy);
  ctx.closePath();
  ctx.stroke();

  fourPointStar(ctx, cx, cy, 12, GILT_DARK);
  fourPointStar(ctx, cx, cy, 6.5, GILT_LIGHT);
  fourPointStar(ctx, cx, cy - 184, 6.5, GILT_MID);
  fourPointStar(ctx, cx, cy + 184, 6.5, GILT_MID);

  ctx.fillStyle = GILT_MID;
  for (const dy of [-112, -62, 62, 112]) {
    ctx.beginPath();
    ctx.arc(cx, cy + dy, 2.2, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

/**
 * Clean heirloom typography shrunk deterministically to fit maxW with zero horizontal or vertical clipping.
 * Returns the clamped rendered width so optional ornamental dividers can flank short subtitles cleanly.
 */
function drawLabel(
  ctx: CanvasRenderingContext2D,
  text: string,
  cx: number,
  y: number,
  size: number,
  maxW: number,
  fill: string,
  weight: 500 | 600 | 700,
  emboss = false,
): number {
  if (!text) return 0;
  let px = size;
  ctx.font = `${weight} ${px}px ${POSTCARD_FONT}`;
  const measured = ctx.measureText ? ctx.measureText(text).width : 0;
  if (measured > maxW && measured > 0) {
    px = Math.max(12, Math.floor((size * maxW) / measured));
    ctx.font = `${weight} ${px}px ${POSTCARD_FONT}`;
  }
  const finalW = Math.min(maxW, ctx.measureText ? ctx.measureText(text).width : measured);
  ctx.save();
  ctx.textAlign = 'center';
  ctx.textBaseline = 'alphabetic';
  if (emboss) {
    ctx.fillStyle = 'rgba(255, 252, 245, 0.9)';
    ctx.fillText(text, cx, y + 1.5, maxW);
  }
  ctx.fillStyle = fill;
  ctx.fillText(text, cx, y, maxW);
  ctx.restore();
  return finalW;
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  try {
    return d.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
  } catch {
    return iso.slice(0, 10);
  }
}

export function renderPostcard(page: HTMLCanvasElement, meta: KeepsakeMeta): HTMLCanvasElement {
  if (!hasDom()) throw new Error('Keepsake rendering needs a DOM (document.createElement is unavailable).');
  const canvas = document.createElement('canvas');
  canvas.width = POSTCARD_W;
  canvas.height = POSTCARD_H;
  const ctx = canvas.getContext('2d');
  if (!ctx) return canvas; // e.g. jsdom without canvas support: still a correctly-sized canvas

  // Warm heirloom Wanderlings cream-linen cotton matte background
  const matte = ctx.createLinearGradient(0, 0, 0, POSTCARD_H);
  matte.addColorStop(0, COTTON_TOP);
  matte.addColorStop(0.5, COTTON_MID);
  matte.addColorStop(1, COTTON_BOT);
  ctx.fillStyle = PAPER_HEX;
  ctx.fillRect(0, 0, POSTCARD_W, POSTCARD_H);
  ctx.fillStyle = matte;
  ctx.fillRect(0, 0, POSTCARD_W, POSTCARD_H);
  drawCottonLinenTexture(ctx);

  // Subtle warm deckle outer edge trim
  ctx.strokeStyle = '#e5d1ac';
  ctx.lineWidth = 8;
  ctx.strokeRect(4, 4, POSTCARD_W - 8, POSTCARD_H - 8);

  // Outer & inner gilded heirloom hairline rules
  ctx.strokeStyle = GILT_MID;
  ctx.lineWidth = 2.2;
  roundRect(ctx, FRAME, FRAME, POSTCARD_W - FRAME * 2, POSTCARD_H - FRAME * 2, 14);
  ctx.stroke();

  ctx.strokeStyle = GILT_LIGHT;
  ctx.lineWidth = 1.25;
  roundRect(ctx, INNER_FRAME, INNER_FRAME, POSTCARD_W - INNER_FRAME * 2, POSTCARD_H - INNER_FRAME * 2, 10);
  ctx.stroke();

  // Delicate gilded corner flourishes (all 4 corners, symmetric)
  const cornerInset = INNER_FRAME + 8;
  drawCornerFlourish(ctx, cornerInset, cornerInset, 1, 1);
  drawCornerFlourish(ctx, POSTCARD_W - cornerInset, cornerInset, -1, 1);
  drawCornerFlourish(ctx, cornerInset, POSTCARD_H - cornerInset, 1, -1);
  drawCornerFlourish(ctx, POSTCARD_W - cornerInset, POSTCARD_H - cornerInset, -1, -1);

  // Quiet gilded celestial medallions optically centered in left & right cotton matte margins
  const midY = PAGE_Y + PAGE_H_SCALED / 2;
  const sideMarginCenter = (INNER_FRAME + (PAGE_X - 12)) / 2;
  drawSideMedallion(ctx, sideMarginCenter, midY);
  drawSideMedallion(ctx, POSTCARD_W - sideMarginCenter, midY);

  // Recessed beveled cotton mat window + gilded fillet + crisp ink frame around the artwork
  const bevelPad = 12;
  ctx.save();
  ctx.fillStyle = '#efe0c2';
  roundRect(ctx, PAGE_X - bevelPad, PAGE_Y - bevelPad, PAGE_W_SCALED + bevelPad * 2, PAGE_H_SCALED + bevelPad * 2, 8);
  ctx.fill();
  // Inner mat top/left shadow and bottom/right highlight for cut-mat depth
  ctx.strokeStyle = MAT_BEVEL_SHADOW;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(PAGE_X - bevelPad, PAGE_Y + PAGE_H_SCALED + bevelPad);
  ctx.lineTo(PAGE_X - bevelPad, PAGE_Y - bevelPad);
  ctx.lineTo(PAGE_X + PAGE_W_SCALED + bevelPad, PAGE_Y - bevelPad);
  ctx.stroke();
  ctx.strokeStyle = MAT_BEVEL_LIGHT;
  ctx.beginPath();
  ctx.moveTo(PAGE_X - bevelPad, PAGE_Y + PAGE_H_SCALED + bevelPad);
  ctx.lineTo(PAGE_X + PAGE_W_SCALED + bevelPad, PAGE_Y + PAGE_H_SCALED + bevelPad);
  ctx.lineTo(PAGE_X + PAGE_W_SCALED + bevelPad, PAGE_Y - bevelPad);
  ctx.stroke();
  ctx.restore();

  // Fine gilded fillet around the artwork opening
  ctx.strokeStyle = GILT_MID;
  ctx.lineWidth = 1.6;
  ctx.strokeRect(PAGE_X - 7, PAGE_Y - 7, PAGE_W_SCALED + 14, PAGE_H_SCALED + 14);

  // Crisp ink border + integer 3x pixel-art page
  ctx.fillStyle = INK_HEX;
  ctx.fillRect(PAGE_X - 4, PAGE_Y - 4, PAGE_W_SCALED + 8, PAGE_H_SCALED + 8);
  ctx.imageSmoothingEnabled = false;
  const sw = page.width || PAGE_W;
  const sh = page.height || PAGE_H;
  const fit = Math.min(PAGE_W_SCALED / sw, PAGE_H_SCALED / sh);
  const dw = Math.round(sw * fit);
  const dh = Math.round(sh * fit);
  ctx.drawImage(page, PAGE_X + Math.round((PAGE_W_SCALED - dw) / 2), PAGE_Y + Math.round((PAGE_H_SCALED - dh) / 2), dw, dh);
  ctx.imageSmoothingEnabled = true;

  // Clean heirloom typography (strictly within horizontal & vertical matte margins, zero clipping)
  const cx = POSTCARD_W / 2;
  drawLabel(ctx, meta.title, cx, 82, 40, PAGE_W_SCALED, INK_HEX, 700, true);
  const galaxyW = drawLabel(ctx, meta.galaxyName, cx, 120, 24, 1280, '#6b4b32', 600);
  if (meta.galaxyName && galaxyW > 0 && galaxyW < 1200) {
    const ornamentOffset = galaxyW / 2 + 22;
    fourPointStar(ctx, cx - ornamentOffset, 112, 6, GILT_MID);
    fourPointStar(ctx, cx + ornamentOffset, 112, 6, GILT_MID);
  }
  drawLabel(ctx, meta.chapterTitle, cx, 1005, 26, PAGE_W_SCALED, '#4a3568', 600);
  drawLabel(ctx, formatDate(meta.dateIso), cx, 1037, 19, 960, '#876b47', 500);
  return canvas;
}

function triggerDownload(blob: Blob, filename: string): void {
  if (!hasDom() || typeof URL === 'undefined' || typeof URL.createObjectURL !== 'function') {
    throw new Error('Downloads need a browser (URL.createObjectURL is unavailable).');
  }
  const url = URL.createObjectURL(blob);
  try {
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.rel = 'noopener';
    a.style.display = 'none';
    document.body.appendChild(a);
    try {
      a.click();
    } finally {
      a.remove();
    }
  } finally {
    URL.revokeObjectURL(url);
  }
}

export function savePng(c: HTMLCanvasElement, filename: string): Promise<Blob> {
  return new Promise<Blob>((resolve, reject) => {
    if (!hasDom() || !c || typeof c.toBlob !== 'function') {
      reject(new Error('Saving a PNG needs a browser canvas (toBlob is unavailable).'));
      return;
    }
    c.toBlob((blob) => {
      if (!blob) {
        reject(new Error('The canvas could not be turned into a PNG.'));
        return;
      }
      try {
        triggerDownload(blob, filename);
        resolve(blob);
      } catch (e) {
        reject(e instanceof Error ? e : new Error('Download failed.'));
      }
    }, 'image/png');
  });
}

export function saveText(text: string, filename: string, mime: string): void {
  if (!hasDom() || typeof Blob === 'undefined') return; // nothing to download to (SSR / node)
  triggerDownload(new Blob([text], { type: mime }), filename);
}
