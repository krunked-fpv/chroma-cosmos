/** Pure page / actor data helpers: region texture bytes, live-slot mask, sprite & wisp blitting. */
import type { ActorRenderState, WispRenderState } from '../contracts/simulation';
import type { CompiledPage, SpriteFrame, SpriteLibrary, SpriteSheet } from '../contracts/art';
import { PAGE_H, PAGE_W } from '../contracts/constants';
import { PixelPlane } from './pixelPlane';

const WISP_CORE_ID = 231;
const WISP_AURA_ID = 232;

function compilePatternFrame(rows: readonly string[]): SpriteFrame {
  const h = rows.length;
  const w = rows[0]?.length ?? 0;
  const pixels = new Uint8Array(w * h);
  for (let y = 0; y < h; y++) {
    const row = rows[y] ?? '';
    for (let x = 0; x < w; x++) {
      const ch = row[x];
      pixels[y * w + x] = ch === 'c' ? WISP_CORE_ID : ch === 'a' ? WISP_AURA_ID : 255;
    }
  }
  return { w, h, pixels };
}

const FALLBACK_WISP_FRAMES: SpriteFrame[] = [
  compilePatternFrame([
    '.....a.....',
    '...a.a.a...',
    '..a.ccc.a..',
    '..accccca..',
    '.aacccccaa.',
    'a.accccca.a',
    '..accccca..',
    '...accca...',
    '....aca....',
    '.....a.....',
    '....a......',
  ]),
  compilePatternFrame([
    '....a.a....',
    '.....a.....',
    '..a.ccc.a..',
    '.aacccccaa.',
    '..accccca..',
    '.aacccccaa.',
    '..accccca..',
    '...accca...',
    '....aca....',
    '....a......',
    '.....a.....',
  ]),
  compilePatternFrame([
    '.....a.....',
    '..a..a..a..',
    '..a.ccc.a..',
    '..accccca..',
    '.aacccccaa.',
    '..accccca..',
    '.aacccccaa.',
    '...accca...',
    '....aca....',
    '.....a.....',
    '......a....',
  ]),
  compilePatternFrame([
    '....a.a....',
    '...a.a.a...',
    '..a.ccc.a..',
    '.aacccccaa.',
    '..accccca..',
    'a.accccca.a',
    '..accccca..',
    '...accca...',
    '....aca....',
    '......a....',
    '.....a.....',
  ]),
];

/** Crisp built-in 11x11 procedural Luminous Starlight Wisp fallback using system IDs 231/232. */
export const FALLBACK_WISP_SHEET: SpriteSheet = {
  anchorX: 5,
  anchorY: 5,
  anims: {
    idle: { frames: FALLBACK_WISP_FRAMES, frameMs: 150, loop: true },
    float: { frames: FALLBACK_WISP_FRAMES, frameMs: 115, loop: true },
  },
};

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

/**
 * Blits the Luminous Starlight Wisp into the actor plane using the supplied `SpriteSheet`
 * (or the built-in 11x11 procedural `231`/`232` fallback if omitted). Returns pixels written.
 */
export function blitWisp(
  plane: PixelPlane,
  wisp: WispRenderState | undefined,
  sheet: SpriteSheet | null | undefined,
  timeMs: number,
): number {
  if (!wisp || !wisp.active || wisp.mode === 'hidden') return 0;
  if (!Number.isFinite(wisp.x) || !Number.isFinite(wisp.y) || !Number.isFinite(wisp.alpha) || wisp.alpha <= 0.02) {
    return 0;
  }
  const src = sheet ?? FALLBACK_WISP_SHEET;
  const moving = wisp.mode === 'prologueStroke' || wisp.mode === 'idleGuide' || wisp.mode === 'nudge';
  const anim = (moving ? src.anims.float ?? src.anims.idle : src.anims.idle ?? src.anims.float) ?? Object.values(src.anims)[0];
  if (!anim || anim.frames.length === 0) return 0;
  const safeTime = Number.isFinite(timeMs) && timeMs > 0 ? timeMs : 0;
  const frameMs = anim.frameMs > 0 ? anim.frameMs : 140;
  const fi = Math.floor(safeTime / frameMs) % anim.frames.length;
  const frame = anim.frames[fi];
  if (!frame) return 0;
  const bob = Math.round(Math.sin(safeTime * 0.0045) * 1.2);
  const x0 = Math.round(wisp.x) - src.anchorX;
  const y0 = Math.round(wisp.y) + bob - src.anchorY;
  const dither = wisp.alpha < 0.95;
  let written = 0;
  for (let sy = 0; sy < frame.h; sy++) {
    const rowOff = sy * frame.w;
    for (let sx = 0; sx < frame.w; sx++) {
      const v = frame.pixels[rowOff + sx];
      if (v === undefined || v === 255) continue;
      if (dither) {
        const thresh = (((sx * 3 + sy * 5) & 7) + 0.5) / 8;
        if (wisp.alpha < thresh) continue;
      }
      const px = x0 + sx;
      const py = y0 + sy;
      if (px < 0 || py < 0 || px >= PAGE_W || py >= PAGE_H) continue;
      plane.put(px, py, v);
      written++;
    }
  }
  return written;
}
