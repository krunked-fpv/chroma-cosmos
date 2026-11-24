/** Procedural art & Hi-Bit UI pixel-sprite atlas contracts. */
import type { CausalityKind } from './causality';
import type { RegionMeta } from './regions';
import type { MaterialId } from './materials';
import type { BrushId, ChapterId, DraftCardId, RelicId, SceneId } from './roguelike';
import type { WardrobeItemId, WardrobeState } from './progression';

/** Legacy milestone kind preserved alongside expanded HeroQuestId. */
export type StoryMilestoneKind =
  | 'violet' | 'lumi' | 'nova' | 'planet' | 'cloud'
  | 'rocket' | 'milkshake' | 'asteroid' | 'moonCat' | 'suns' | 'boba' | 'whale' | 'heart' | 'comet';

export type HeroQuestId = StoryMilestoneKind;

/** Deterministic integer-scaled Hi-Bit UI pixel sprite IDs exported from src/art/. */
export type UiSpriteId =
  | 'tool_pencil'
  | 'tool_wand'
  | 'tool_lantern'
  | 'tool_crystal_jar'
  | 'tool_audio_0'
  | 'tool_audio_1'
  | 'tool_audio_2'
  | 'tool_audio_3'
  | 'tool_close'
  | 'tool_back'
  | 'tool_prev'
  | 'tool_next'
  | 'tool_postcard'
  | 'tool_export'
  | 'tool_import'
  | 'tool_star'
  | 'tool_gem'
  | 'tool_crown'
  | 'tool_stay'
  | 'tool_turn'
  | 'tool_settings'
  | 'tool_skip'
  | 'tool_gift'
  | 'tool_hub_paintbox'
  | 'tool_hub_wardrobe'
  | 'tool_hub_bookshelf'
  | 'tool_hub_trinkets'
  | 'tool_voyage_seal'
  | 'quest_violet'
  | 'quest_lumi'
  | 'quest_nova'
  | 'quest_rocket'
  | 'quest_planet'
  | 'quest_cloud'
  | 'quest_milkshake'
  | 'quest_asteroid'
  | 'quest_moonCat'
  | 'quest_suns'
  | 'quest_boba'
  | 'quest_whale'
  | 'quest_heart'
  | 'quest_comet';

/** Static composite Hero Story Quest specification compiled onto each chapter page (3..4 per chapter). */
export interface HeroStoryQuestSpec {
  questId: HeroQuestId;
  /** Strictly <= 2 words (e.g., "Violet", "Paper Rocket", "Star Whale"). */
  label: string;
  thumbnailSpriteId: UiSpriteId;
  regionIds: number[];
  centroid: { x: number; y: number };
}

export interface StoryMilestone {
  id: StoryMilestoneKind;
  kind: StoryMilestoneKind;
  label: string;
  thumbnailSpriteId?: UiSpriteId;
  regionIds: number[];
  centroid: { x: number; y: number };
}

export interface WonderSketchDot {
  x: number;
  y: number;
  shade: 1 | 2;
}

export interface PixelImage {
  width: number;
  height: number;
  /** RGBA */
  data: Uint8ClampedArray;
}

export type ActorKind =
  | 'violet' | 'lumi' | 'nova' | 'moonCat' | 'comet' | 'whale' | 'gazelle' | 'cometCar' | 'flower' | 'gem'
  | 'butterfly' | 'bubble';
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
  /** 3 to 4 composite focal Hero Story Quests mapped to right-side Cloisonne Story Medallions. */
  heroQuests?: HeroStoryQuestSpec[];
  /** Synchronized alias of heroQuests for compatibility. */
  storyMilestones?: StoryMilestone[];
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
  | { type: 'brushIcon'; brush: BrushId }
  | { type: 'relicSticker'; relic: RelicId }
  | { type: 'wardrobe'; item: WardrobeItemId }
  | { type: 'material'; material: MaterialId }
  | { type: 'bookCover'; seed: number; title: string }
  | { type: 'portrait'; who: 'violet' | 'lumi' | 'nova' }
  | { type: 'uiSprite'; id: UiSpriteId }
  | { type: 'questMedallion'; quest: HeroQuestId; completed?: boolean };

/** Deterministic integer-scaled Hi-Bit UI pixel-art sprite atlas bridged from src/art/ to src/ui/. */
export interface UiPixelSpriteAtlas {
  sprite(id: UiSpriteId, size: 24 | 32 | 48 | number): PixelImage;
  brushIcon(brush: BrushId, size: 24 | 32 | 48 | number): PixelImage;
  questThumbnail(quest: HeroQuestId, size: 24 | 32 | 48 | number, completed?: boolean): PixelImage;
}

export interface ArtPort {
  compilePage(id: SceneId, seed: number, wardrobe: WardrobeState): CompiledPage;
  sprites(wardrobe: WardrobeState): SpriteLibrary;
  wispSprite?(): SpriteSheet;
  wonderSketch?(effect: CausalityKind, box: { x0: number; y0: number; x1: number; y1: number }, timeMs: number): WonderSketchDot[];
  renderPreview(page: CompiledPage, opts: { colored: boolean; scale: number }): PixelImage;
  illustration(kind: IllustrationKind, w: number, h: number): PixelImage;
  uiAtlas?(): UiPixelSpriteAtlas;
}
