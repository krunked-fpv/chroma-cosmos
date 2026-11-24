/** ArtPort implementation: procedural pixel-art scenes, sprites, region rasterizer. */
import type { ArtPort, CompiledPage, IllustrationKind, PixelImage, SpriteLibrary } from '../contracts/art';
import type { SceneId } from '../contracts/roguelike';
import type { WardrobeState } from '../contracts/progression';
import { compile } from './compile';
import { illustration } from './illustrations';
import { renderPreview } from './preview';
import { buildSprites } from './sprites';

export function createArt(): ArtPort {
  return {
    compilePage(id: SceneId, seed: number, wardrobe: WardrobeState): CompiledPage {
      return compile(id, seed, wardrobe);
    },
    sprites(wardrobe: WardrobeState): SpriteLibrary {
      return buildSprites(wardrobe);
    },
    renderPreview(page: CompiledPage, opts: { colored: boolean; scale: number }): PixelImage {
      return renderPreview(page, opts);
    },
    illustration(kind: IllustrationKind, w: number, h: number): PixelImage {
      return illustration(kind, w, h);
    },
  };
}
