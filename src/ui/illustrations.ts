/** Illustration cache: PixelImage -> crisp (NEAREST) canvases, rendered once per key and cloned cheaply. */
import type { IllustrationKind, PixelImage, UiSpriteId } from '../contracts/art';

export function illustrationKey(k: IllustrationKind, w: number, h: number): string {
  switch (k.type) {
    case 'door': return `door:${k.chapter}:${w}x${h}`;
    case 'card': return `card:${k.card}:${w}x${h}`;
    case 'brushIcon': return `brushIcon:${k.brush}:${w}x${h}`;
    case 'relicSticker': return `relic:${k.relic}:${w}x${h}`;
    case 'wardrobe': return `wardrobe:${k.item}:${w}x${h}`;
    case 'material': return `material:${k.material}:${w}x${h}`;
    case 'bookCover': return `cover:${k.seed}:${k.title}:${w}x${h}`;
    case 'portrait': return `portrait:${k.who}:${w}x${h}`;
    case 'uiSprite': return `uiSprite:${k.id}:${w}x${h}`;
    case 'questMedallion': return `questMedallion:${k.quest}:${k.completed ? 1 : 0}:${w}x${h}`;
  }
}

export function paintPixelImage(canvas: HTMLCanvasElement, img: PixelImage): void {
  canvas.width = img.width;
  canvas.height = img.height;
  let ctx: CanvasRenderingContext2D | null = null;
  try {
    ctx = canvas.getContext('2d');
  } catch {
    ctx = null;
  }
  if (!ctx) return;
  ctx.imageSmoothingEnabled = false;
  const id = ctx.createImageData(img.width, img.height);
  const n = Math.min(id.data.length, img.data.length);
  id.data.set(n === img.data.length ? img.data : img.data.subarray(0, n));
  ctx.putImageData(id, 0, 0);
}

/** Create a pre-mount placeholder `<canvas class="cc-pix">` before IllustrationCache is bound. */
export function placeholderCanvas(w: number, h: number, cls = '', key = ''): HTMLCanvasElement {
  const c = document.createElement('canvas');
  c.className = `cc-pix ${cls}`.trim();
  c.width = w;
  c.height = h;
  c.setAttribute('aria-hidden', 'true');
  if (key) c.dataset.key = key;
  return c;
}

export class IllustrationCache {
  private readonly images = new Map<string, PixelImage>();
  private readonly source: (k: IllustrationKind, w: number, h: number) => PixelImage;

  constructor(source: (k: IllustrationKind, w: number, h: number) => PixelImage) {
    this.source = source;
  }

  image(k: IllustrationKind, w: number, h: number): PixelImage | null {
    const key = illustrationKey(k, w, h);
    let img = this.images.get(key);
    if (!img) {
      try {
        img = this.source(k, w, h);
      } catch {
        return null;
      }
      this.images.set(key, img);
    }
    return img;
  }

  /** A new canvas element (class `cc-pix`, image-rendering: pixelated) holding the illustration. */
  canvas(k: IllustrationKind, w: number, h: number, cls = ''): HTMLCanvasElement {
    const key = illustrationKey(k, w, h);
    const c = placeholderCanvas(w, h, cls, key);
    const img = this.image(k, w, h);
    if (img) paintPixelImage(c, img);
    return c;
  }

  /** Convenience helper for integer-scaled Hi-Bit UI pixel sprites (`UiSpriteId`). */
  sprite(id: UiSpriteId, size: number, cls = ''): HTMLCanvasElement {
    return this.canvas({ type: 'uiSprite', id }, size, size, cls);
  }

  /** Paint into an existing canvas only if its illustration key changed (prevents per-frame DOM churn). */
  paintInto(canvas: HTMLCanvasElement, k: IllustrationKind, w: number, h: number): HTMLCanvasElement {
    const key = illustrationKey(k, w, h);
    if (canvas.dataset.key === key) return canvas;
    canvas.dataset.key = key;
    const img = this.image(k, w, h);
    if (img) paintPixelImage(canvas, img);
    else {
      canvas.width = w;
      canvas.height = h;
    }
    return canvas;
  }

  /** Replace contents of a sprite container if its key changed, returning the active pixel canvas. */
  mountInto(slot: HTMLElement, k: IllustrationKind, w: number, h: number, cls = ''): HTMLCanvasElement {
    const existing = slot.firstElementChild;
    if (existing instanceof HTMLCanvasElement) {
      if (cls) existing.className = `cc-pix ${cls}`.trim();
      return this.paintInto(existing, k, w, h);
    }
    while (slot.firstChild) slot.removeChild(slot.firstChild);
    const next = this.canvas(k, w, h, cls);
    slot.append(next);
    return next;
  }

  get size(): number {
    return this.images.size;
  }
}
