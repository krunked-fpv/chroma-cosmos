/** PNG keepsake postcard + browser download helpers. DOM-only parts are guarded. */
import { BG_HEX, INK_HEX, PAGE_H, PAGE_W, PAPER_HEX } from '../contracts/constants';
import type { KeepsakeMeta } from '../contracts/vault';

export const POSTCARD_W = 1920;
export const POSTCARD_H = 1080;

/** System rounded stack only: no external fonts. */
export const POSTCARD_FONT = 'ui-rounded, "SF Pro Rounded", "Hiragino Maru Gothic ProN", "Arial Rounded MT Bold", "Varela Round", Nunito, "Segoe UI", system-ui, sans-serif';

const FRAME = 28; // twilight border thickness
const PAGE_SCALE = 3; // 480x270 -> 1440x810, integer so the pixels stay square
const PAGE_X = (POSTCARD_W - PAGE_W * PAGE_SCALE) / 2;
const PAGE_Y = 150;

function hasDom(): boolean {
  return typeof document !== 'undefined' && typeof document.createElement === 'function';
}

function star(ctx: CanvasRenderingContext2D, cx: number, cy: number, r: number, color: string): void {
  ctx.fillStyle = color;
  ctx.beginPath();
  for (let i = 0; i < 10; i++) {
    const rad = i % 2 === 0 ? r : r * 0.45;
    const a = -Math.PI / 2 + (i * Math.PI) / 5;
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

/** Deterministic pseudo-random for decorative stars (no Math.random: same postcard every time). */
function lcg(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s = (Math.imul(s, 1664525) + 1013904223) >>> 0;
    return s / 0x100000000;
  };
}

/** Hand-lettered line: slight tilt, ink outline under a warm fill, shrunk to fit maxW. */
function letter(ctx: CanvasRenderingContext2D, text: string, cx: number, y: number, size: number, maxW: number, fill: string, tilt: number): void {
  if (!text) return;
  let px = size;
  ctx.font = `700 ${px}px ${POSTCARD_FONT}`;
  const w = ctx.measureText ? ctx.measureText(text).width : 0;
  if (w > maxW && w > 0) {
    px = Math.max(12, Math.floor((size * maxW) / w));
    ctx.font = `700 ${px}px ${POSTCARD_FONT}`;
  }
  ctx.save();
  ctx.translate(cx, y);
  ctx.rotate(tilt);
  ctx.textAlign = 'center';
  ctx.textBaseline = 'alphabetic';
  ctx.lineJoin = 'round';
  ctx.lineWidth = Math.max(3, px / 9);
  ctx.strokeStyle = INK_HEX;
  ctx.strokeText(text, 0, 0);
  ctx.fillStyle = fill;
  ctx.fillText(text, 0, 0);
  ctx.restore();
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

  // twilight frame
  const sky = ctx.createLinearGradient(0, 0, 0, POSTCARD_H);
  sky.addColorStop(0, '#2a1f5e');
  sky.addColorStop(0.55, '#5b2a86');
  sky.addColorStop(1, '#c2528a');
  ctx.fillStyle = BG_HEX;
  ctx.fillRect(0, 0, POSTCARD_W, POSTCARD_H);
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, POSTCARD_W, POSTCARD_H);
  const rnd = lcg(0xc0ffee);
  for (let i = 0; i < 90; i++) {
    const x = rnd() * POSTCARD_W;
    const y = rnd() * POSTCARD_H;
    const onFrame = x < FRAME + 6 || x > POSTCARD_W - FRAME - 6 || y < FRAME + 6 || y > POSTCARD_H - FRAME - 6;
    if (onFrame) star(ctx, x, y, 3 + rnd() * 5, i % 3 === 0 ? '#ffd966' : '#fff6d8');
  }

  // paper margin
  const px = FRAME;
  const py = FRAME;
  const pw = POSTCARD_W - FRAME * 2;
  const ph = POSTCARD_H - FRAME * 2;
  ctx.save();
  ctx.shadowColor = 'rgba(18,13,43,0.55)';
  ctx.shadowBlur = 14;
  ctx.fillStyle = PAPER_HEX;
  roundRect(ctx, px, py, pw, ph, 18);
  ctx.fill();
  ctx.restore();
  ctx.strokeStyle = '#e4c6a0';
  ctx.lineWidth = 3;
  ctx.setLineDash([14, 10]);
  roundRect(ctx, px + 12, py + 12, pw - 24, ph - 24, 12);
  ctx.stroke();
  ctx.setLineDash([]);

  // the page itself, crisp pixels
  ctx.fillStyle = INK_HEX;
  ctx.fillRect(PAGE_X - 8, PAGE_Y - 8, PAGE_W * PAGE_SCALE + 16, PAGE_H * PAGE_SCALE + 16);
  ctx.imageSmoothingEnabled = false;
  const sw = page.width || PAGE_W;
  const sh = page.height || PAGE_H;
  const fit = Math.min((PAGE_W * PAGE_SCALE) / sw, (PAGE_H * PAGE_SCALE) / sh);
  const dw = Math.round(sw * fit);
  const dh = Math.round(sh * fit);
  ctx.drawImage(page, PAGE_X + Math.round((PAGE_W * PAGE_SCALE - dw) / 2), PAGE_Y + Math.round((PAGE_H * PAGE_SCALE - dh) / 2), dw, dh);
  ctx.imageSmoothingEnabled = true;

  // corner sparkles beside the page
  star(ctx, PAGE_X - 70, PAGE_Y + 40, 26, '#ffb703');
  star(ctx, PAGE_X + PAGE_W * PAGE_SCALE + 70, PAGE_Y + 40, 26, '#ffb703');
  star(ctx, PAGE_X - 56, PAGE_Y + PAGE_H * PAGE_SCALE - 30, 16, '#b69cff');
  star(ctx, PAGE_X + PAGE_W * PAGE_SCALE + 56, PAGE_Y + PAGE_H * PAGE_SCALE - 30, 16, '#7fe7f0');

  // hand-lettered text
  const cx = POSTCARD_W / 2;
  letter(ctx, meta.title, cx, 96, 58, 1500, '#ffd166', -0.012);
  letter(ctx, meta.galaxyName, cx, 134, 32, 1300, '#ffffff', 0.008);
  letter(ctx, meta.chapterTitle, cx, 1000, 34, 1500, '#ffb3d9', 0.01);
  letter(ctx, formatDate(meta.dateIso), cx, 1030, 24, 900, '#a5d8ff', -0.006);
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
