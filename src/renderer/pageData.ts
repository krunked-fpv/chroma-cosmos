/** Pure page / actor data helpers: region texture bytes, live-slot mask, sprite blitting. */
import type { ActorRenderState } from '../contracts/simulation';
import type { CompiledPage, SpriteFrame, SpriteLibrary, SpriteSheet } from '../contracts/art';
import { PAGE_H, PAGE_W } from '../contracts/constants';
import { PixelPlane } from './pixelPlane';

/** uRegionTex bytes: R region id, G base-map id, B actor slot, A 255. */
export function buildRegionTexData(page: CompiledPage, out: Uint8Array): void {
  const n = PAGE_W * PAGE_H;
  for (let i = 0; i < n; i++) {
    out[i * 4] = page.regionMap[i] ?? 255;
    out[i * 4 + 1] = page.baseRegionMap[i] ?? page.regionMap[i] ?? 255;
    out[i * 4 + 2] = page.actorSlotMap[i] ?? 0;
    out[i * 4 + 3] = 255;
  }
}

/** Bit s set when actor slot s (1..15) is drawn live. */
export function liveSlotMask(actors: readonly ActorRenderState[]): number {
  let mask = 0;
  for (const a of actors) if (a.live && a.slot >= 1 && a.slot <= 15) mask |= 1 << a.slot;
  return mask;
}

export function pickFrame(sheet: SpriteSheet, actor: ActorRenderState): SpriteFrame | null {
  const anim = sheet.anims[actor.anim] ?? sheet.anims.idle ?? Object.values(sheet.anims)[0];
  if (!anim || anim.frames.length === 0) return null;
  const n = anim.frames.length;
  const fi = Number.isFinite(actor.frame) ? ((Math.floor(actor.frame) % n) + n) % n : 0;
  return anim.frames[fi] ?? null;
}

/**
 * Blits one live actor sprite (255 = transparent) anchored at (x, y); mirrored when facing -1.
 * `remap` swaps region ids (wardrobe). Returns the number of pixels written.
 */
export function blitActor(plane: PixelPlane, lib: SpriteLibrary, actor: ActorRenderState): number {
  const sheet = lib[actor.kind];
  if (!sheet || !Number.isFinite(actor.x) || !Number.isFinite(actor.y)) return 0;
  const frame = pickFrame(sheet, actor);
  if (!frame) return 0;
  const flip = actor.facing === -1;
  const ax = flip ? frame.w - 1 - sheet.anchorX : sheet.anchorX;
  const x0 = Math.round(actor.x) - ax;
  const y0 = Math.round(actor.y) - sheet.anchorY;
  let written = 0;
  for (let sy = 0; sy < frame.h; sy++) {
    for (let sx = 0; sx < frame.w; sx++) {
      const v = frame.pixels[sy * frame.w + (flip ? frame.w - 1 - sx : sx)];
      if (v === undefined || v === 255) continue;
      const id = actor.remap?.[v] ?? v;
      plane.put(x0 + sx, y0 + sy, id);
      written++;
    }
  }
  return written;
}

/** Blits all live actors (non-live actors keep their static line art). */
export function blitActors(plane: PixelPlane, lib: SpriteLibrary, actors: readonly ActorRenderState[]): void {
  for (const a of actors) if (a.live) blitActor(plane, lib, a);
}
