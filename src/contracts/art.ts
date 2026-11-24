/** Procedural art contracts. */
import type { RegionMeta } from './regions';
import type { MaterialId } from './materials';
import type { ChapterId, DraftCardId, RelicId, SceneId } from './roguelike';
import type { WardrobeItemId, WardrobeState } from './progression';

export interface PixelImage {
  width: number;
  height: number;
  /** RGBA */
  data: Uint8ClampedArray;
}

export type ActorKind = 'violet' | 'lumi' | 'nova' | 'moonCat' | 'comet' | 'whale' | 'gazelle' | 'cometCar' | 'flower' | 'gem';
export type AnimName = 'sleep' | 'wiggle' | 'peek' | 'idle' | 'walk' | 'run' | 'leap' | 'rear' | 'bounce' | 'float' | 'swim';

/** Values are region ids (canonical / system / 0 ink). 255 = transparent in sprites. */
export interface SpriteFrame {
  w: number;
  h: number;
  pixels: Uint8Array;
}

export interface SpriteAnim {
  frames: SpriteFrame[];
  frameMs: number;
  loop: boolean;
}

export interface SpriteSheet {
  anchorX: number;
  anchorY: number;
  /** 3..6 frames per animation */
  anims: Partial<Record<AnimName, SpriteAnim>>;
}

export type SpriteLibrary = Record<ActorKind, SpriteSheet>;

export interface ActorSpawn {
  instanceId: string;
  kind: ActorKind;
  /** 1..15, matches actorSlotMap values */
  slot: number;
  x: number;
  y: number;
  facing: 1 | -1;
  regionIds: number[];
  remap?: Record<number, number>;
  pathIndex?: number;
}

export interface PagePath {
  points: { x: number; y: number }[];
  closed: boolean;
  role: 'gallop' | 'sprint' | 'ring' | 'orbit' | 'swim' | 'margin';
}

export interface CompiledPage {
  sceneId: SceneId;
  seed: number;
  title: string;
  /** 480*270 region ids (0 ink, 255 sky) */
  regionMap: Uint8Array;
  /** scene with actors removed */
  baseRegionMap: Uint8Array;
  /** 0 = none, 1..15 = actor slot occupying the pixel at rest */
  actorSlotMap: Uint8Array;
  /** length 256 */
  regionTotalPixels: Uint32Array;
  /** length 256 */
  regions: (RegionMeta | undefined)[];
  coreRegionIds: number[];
  actors: ActorSpawn[];
  paths: PagePath[];
  focal: { x: number; y: number };
  sky: { top: string; bottom: string; mist: string };
  /** hub only */
  preColored?: Array<{ id: number; materialId: MaterialId }>;
}

export type IllustrationKind =
  | { type: 'door'; chapter: ChapterId }
  | { type: 'card'; card: DraftCardId }
  | { type: 'relicSticker'; relic: RelicId }
  | { type: 'wardrobe'; item: WardrobeItemId }
  | { type: 'material'; material: MaterialId }
  | { type: 'bookCover'; seed: number; title: string }
  | { type: 'portrait'; who: 'violet' | 'lumi' | 'nova' };

export interface ArtPort {
  compilePage(id: SceneId, seed: number, wardrobe: WardrobeState): CompiledPage;
  sprites(wardrobe: WardrobeState): SpriteLibrary;
  renderPreview(page: CompiledPage, opts: { colored: boolean; scale: number }): PixelImage;
  illustration(kind: IllustrationKind, w: number, h: number): PixelImage;
}
