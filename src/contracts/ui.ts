/** UI contracts. */
import type { IllustrationKind, PixelImage } from './art';
import type { AudioLevel } from './audio';
import type { GestureEvent } from './input';
import type { MaterialDef, MaterialId } from './materials';
import type { BadgeId, WardrobeItemId, WardrobeState } from './progression';
import type { BrushId, ChapterId, DraftCardId, RelicId } from './roguelike';
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
  relics: RelicId[];
  coreAwake: number;
  coreTotal: number;
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
}

export interface UiCallbacks {
  onStartRun(): void;
  onContinueRun(): void;
  onSelectMaterial(id: MaterialId): void;
  onSelectBrush(id: BrushId): void;
  onToggleDoodle(): void;
  onTurnPage(early: boolean): void;
  onAudioCycle(): void;
  onUnlockMaterial(id: MaterialId): void;
  onBuyWardrobe(id: WardrobeItemId): void;
  onToggleWardrobe(id: WardrobeItemId): void;
  onOpenBook(id: string): void;
  onBookPage(delta: number): void;
  onCloseBook(): void;
  onSaveKeepsake(): void;
  onExportVault(): void;
  onImportVault(text: string): void;
  onBackToHub(): void;
  onGesture(e: GestureEvent): void;
  onHover(p: { x: number; y: number } | null): void;
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
}
