/** Pure layout math: canvas fit, client <-> internal page coordinates. No WebGL. */
import { PAGE_H, PAGE_W } from '../contracts/constants';

export interface Fit {
  /** canvas backing-store size in device pixels */
  bufW: number;
  bufH: number;
  /** device pixels per internal pixel (an integer when `integer`) */
  scale: number;
  integer: boolean;
  /** page rect top-left in device pixels */
  offX: number;
  offY: number;
  pageW: number;
  pageH: number;
}

export interface ClientRect {
  left: number;
  top: number;
  width: number;
  height: number;
}

/**
 * s = floor(min(bufW/480, bufH/270)); s >= 2 -> exact integer scale, centred; else a fractional aspect-locked
 * scale. bufW/bufH are the host size times the device pixel ratio actually used by the canvas.
 */
export function computeFit(bufW: number, bufH: number): Fit {
  const w = Math.max(1, bufW);
  const h = Math.max(1, bufH);
  const raw = Math.min(w / PAGE_W, h / PAGE_H);
  const s = Math.floor(raw);
  const integer = s >= 2;
  const scale = integer ? s : raw;
  const pageW = PAGE_W * scale;
  const pageH = PAGE_H * scale;
  return {
    bufW: w,
    bufH: h,
    scale,
    integer,
    offX: Math.max(0, integer ? Math.floor((w - pageW) / 2) : (w - pageW) / 2),
    offY: Math.max(0, integer ? Math.floor((h - pageH) / 2) : (h - pageH) / 2),
    pageW,
    pageH,
  };
}

/** client (CSS) coordinates -> internal page coordinates; null outside the page rect. */
export function clientToInternalPure(
  fit: Fit,
  rect: ClientRect,
  cx: number,
  cy: number,
): { x: number; y: number } | null {
  if (rect.width <= 0 || rect.height <= 0) return null;
  const bx = ((cx - rect.left) / rect.width) * fit.bufW;
  const by = ((cy - rect.top) / rect.height) * fit.bufH;
  const x = (bx - fit.offX) / fit.scale;
  const y = (by - fit.offY) / fit.scale;
  if (!(x >= -1e-9 && y >= -1e-9 && x < PAGE_W && y < PAGE_H)) return null;
  return { x: Math.max(0, x), y: Math.max(0, y) };
}

/** inverse of {@link clientToInternalPure} (no bounds check). */
export function internalToClientPure(fit: Fit, rect: ClientRect, x: number, y: number): { x: number; y: number } {
  const bx = fit.offX + x * fit.scale;
  const by = fit.offY + y * fit.scale;
  return {
    x: rect.left + (bx / fit.bufW) * rect.width,
    y: rect.top + (by / fit.bufH) * rect.height,
  };
}
