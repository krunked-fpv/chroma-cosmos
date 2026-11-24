/** Illustration cache: PixelImage -> crisp (NEAREST) canvases, rendered once per key and cloned cheaply. */
import type { IllustrationKind, PixelImage } from '../contracts/art';

export function illustrationKey(k: IllustrationKind, w: number, h: number): string {
  switch (k.type) {
    case 'door': return `door:${k.chapter}:${w}x${h}`;
    case 'card': return `card:${k.card}:${w}x${h}`;
    case 'relicSticker': return `relic:${k.relic}:${w}x${h}`;
    case 'wardrobe': return `wardrobe:${k.item}:${w}x${h}`;
    case 'material': return `material:${k.material}:${w}x${h}`;
    case 'bookCover': return `cover:${k.seed}:${k.title}:${w}x${h}`;
    case 'portrait': return `portrait:${k.who}:${w}x${h}`;
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
    const c = document.createElement('canvas');
    c.className = `cc-pix ${cls}`.trim();
    c.setAttribute('aria-hidden', 'true');
    c.dataset.key = illustrationKey(k, w, h);
    const img = this.image(k, w, h);
    if (img) paintPixelImage(c, img);
    else {
      c.width = w;
      c.height = h;
    }
    return c;
  }

  get size(): number {
    return this.images.size;
  }
}
