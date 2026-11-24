/** ArtPort implementation: procedural pixel-art scenes, sprites, region rasterizer. */
import type { ArtPort, CompiledPage, IllustrationKind, PixelImage, SpriteLibrary, SpriteSheet, WonderSketchDot } from '../contracts/art';
import type { CausalityKind } from '../contracts/causality';
import type { SceneId } from '../contracts/roguelike';
import type { WardrobeState } from '../contracts/progression';
import { compile } from './compile';
import { illustration } from './illustrations';
import { renderPreview } from './preview';
import { buildSprites } from './sprites';
import { buildWisp } from './sprites/wisp';
import { wonderSketch } from './wonderSketch';

export function createArt(): ArtPort {
  return {
    compilePage(id: SceneId, seed: number, wardrobe: WardrobeState): CompiledPage {
      return compile(id, seed, wardrobe);
    },
    sprites(wardrobe: WardrobeState): SpriteLibrary {
      return buildSprites(wardrobe);
    },
    wispSprite(): SpriteSheet {
      return buildWisp();
    },
    wonderSketch(effect: CausalityKind, box: { x0: number; y0: number; x1: number; y1: number }, timeMs: number): WonderSketchDot[] {
      return wonderSketch(effect, box, timeMs);
    },
    renderPreview(page: CompiledPage, opts: { colored: boolean; scale: number }): PixelImage {
      return renderPreview(page, opts);
    },
    illustration(kind: IllustrationKind, w: number, h: number): PixelImage {
      return illustration(kind, w, h);
    },
  };
}
