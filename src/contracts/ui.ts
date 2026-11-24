/** UI contracts. */
import type { IllustrationKind, PixelImage, StoryMilestoneKind } from './art';
import type { AudioLevel, UiFoleyKind } from './audio';
import type { GestureEvent } from './input';
import type { MaterialDef, MaterialId } from './materials';
import type { BadgeId, WardrobeItemId, WardrobeState } from './progression';
import type { BrushId, ChapterId, DraftCardId, RelicId } from './roguelike';
import type { StoryStarState, ToolMode } from './simulation';
import type { StorybookSummary } from './vault';

export type AppMode = 'boot' | 'hub' | 'chapter' | 'draft' | 'doors' | 'turning' | 'finale' | 'book';

export interface MaterialEntry {
  def: MaterialDef;
  unlocked: boolean;
}

export interface HudState {
  mode: AppMode;
  chapterTitle: string;
  slot: number;
  gems: number;
  materials: MaterialEntry[];
  selectedMaterial: MaterialId;
  brushes: BrushId[];
  selectedBrush: BrushId;
  doodle: boolean;
  /** Explicit physical tool selection ('pencil' | 'wand'); mirrors `doodle`. */
  toolMode?: ToolMode;
  relics: RelicId[];
  coreAwake: number;
  coreTotal: number;
  /** 3..5 Storyboard Bookmark Star Sockets on the stitched top linen ribbon. */
  storyStars?: StoryStarState[];
  /** True while the Chapter 1 Starlight Wisp is tapping/cueing the Enchanted Pencil in the wooden groove. */
  wispPencilCue?: boolean;
  /** True while the Sleepy Hush visual prologue is active. */
  prologueActive?: boolean;
  pageComplete: boolean;
  audioLevel: AudioLevel;
}

export interface HubState {
  gems: number;
  badges: BadgeId[];
  materials: MaterialEntry[];
  wardrobeOwned: WardrobeItemId[];
  wardrobe: WardrobeState;
  storybooks: StorybookSummary[];
  hasRunInProgress: boolean;
  /** Audio level surfaced in the Brass Desk-Corner Trinket Tray. */
  audioLevel?: AudioLevel;
}

export interface UiCallbacks {
  onStartRun(): void;
  onContinueRun(): void;
  onSelectMaterial(id: MaterialId): void;
  onSelectBrush(id: BrushId): void;
  onToggleDoodle(): void;
  onSelectToolMode?(mode: ToolMode): void;
  onHighlightMilestone?(id: StoryMilestoneKind): void;
  onUiFoley?(kind: UiFoleyKind): void;
  onTurnPage(early: boolean): void;
  onAudioCycle(): void;
  onUnlockMaterial(id: MaterialId): void;
  onBuyWardrobe(id: WardrobeItemId): void;
  onToggleWardrobe(id: WardrobeItemId): void;
  onOpenBook(id: string): void;
  onBookPage(delta: number): void;
  onCloseBook(): void;
  onSaveKeepsake(): void;
  onSaveBookKeepsake?(bookId: string): void;
  onExportVault(): void;
  onImportVault(text: string): void;
  onBackToHub(): void;
  onGesture(e: GestureEvent): void;
  onHover(p: { x: number; y: number } | null): void;
  onDismissPrologue?(): void;
  onFinaleDone(): void;
}

export interface UiDeps {
  illustration(k: IllustrationKind, w: number, h: number): PixelImage;
  clientToInternal(cx: number, cy: number): { x: number; y: number } | null;
}

export interface UiPort {
  readonly canvasHost: HTMLElement;
  mount(cb: UiCallbacks, deps: UiDeps): void;
  setMode(m: AppMode): void;
  updateHud(h: HudState): void;
  updateHub(h: HubState): void;
  showDraft(cards: DraftCardId[]): Promise<DraftCardId>;
  showDoors(o: ChapterId[]): Promise<ChapterId>;
  showFinale(name: string): Promise<void>;
  showBook(b: StorybookSummary, page: number, count: number): void;
  toast(msg: string): void;
  /** Fires a golden starlight thread arc from an awakened page coordinate up into its Bookmark socket. */
  animateStarThread?(milestoneId: StoryMilestoneKind, fromClientX: number, fromClientY: number): void;
  /** Drops glowing faceted Prism Stardust Crystal shards into the corked apothecary jar. */
  animateCrystalDrop?(amount: number): void;
}
