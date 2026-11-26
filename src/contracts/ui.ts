/** UI contracts: Midnight Cloisonne Storybook Frame, Right-Side Story Medallions, Firefly Hint Lantern & Auto-Turn Ribbon. */
import type { HeroQuestId, IllustrationKind, PixelImage, StoryMilestoneKind } from './art';
import type { AudioLevel, UiFoleyKind } from './audio';
import type { GestureEvent } from './input';
import type { MaterialDef, MaterialId } from './materials';
import type { BadgeId, WardrobeItemId, WardrobeState } from './progression';
import type { BrushId, ChapterId, DraftCardId, RelicId } from './roguelike';
import type { HeroStoryQuest, HintRequestState, PageFinaleState, StoryStarState, ToolMode } from './simulation';
import type { UniverseId } from './universes';
import type { StorybookSummary } from './vault';

export type AppMode = 'boot' | 'hub' | 'chapter' | 'draft' | 'doors' | 'turning' | 'finale' | 'book';

export interface MaterialEntry {
  def: MaterialDef;
  unlocked: boolean;
}

export interface UniverseProgressItem {
  id: UniverseId;
  index: number;
  number: number;
  name: string;
  shortName: string;
  tagline: string;
  unlockTeaser: string;
  accent: string;
  accentSoft: string;
  unlocked: boolean;
  completed: boolean;
  isNextUnlock: boolean;
  active: boolean;
  chapterTitles: readonly string[];
}

export interface FinaleMeta {
  universeId?: UniverseId;
  universeName?: string;
  newlyUnlocked?: { id: UniverseId; number: number; name: string; tagline: string } | null;
  completedCount?: number;
  totalUniverses?: number;
  bonusGems?: number;
}

export interface HudState {
  mode: AppMode;
  chapterTitle: string;
  /** 1..5 current chapter position on the Top Spine 5-Chapter Constellation Voyage Ribbon. */
  slot: number;
  activeUniverse?: UniverseId;
  universeNumber?: number;
  totalUniverses?: number;
  universeName?: string;
  nextUnlockName?: string | null;
  isFrontierUniverse?: boolean;
  gems: number;
  /** True whenever player's gem balance can afford an unowned Exotic Medium or Wardrobe item in Violet's Hub. */
  hasAffordableUnlock?: boolean;
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
  /** 3..4 Composite Hero Story Quests rendered as Circular Cloisonne Story Medallions on the Right Margin. */
  heroQuests?: HeroStoryQuest[];
  /** Synchronized alias for compatibility. */
  storyStars?: StoryStarState[];
  /** Active Firefly Hint Lantern / Medallion spotlight state. */
  hintState?: HintRequestState;
  /** Automatic 2.8s Page Awakened Finale & Auto-Page-Turn countdown state. */
  pageFinale?: PageFinaleState;
  /** True while the Chapter 1 Starlight Wisp is tapping/cueing the Enchanted Pencil. */
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
  discoveredCards?: DraftCardId[];
  storybooks: StorybookSummary[];
  hasRunInProgress: boolean;
  hasAffordableUnlock?: boolean;
  audioLevel?: AudioLevel;
  activeUniverse?: UniverseId;
  universes?: UniverseProgressItem[];
  unlockedUniverseCount?: number;
  completedUniverseCount?: number;
  totalUniverses?: number;
}

export interface UiCallbacks {
  onStartRun(): void;
  onContinueRun(): void;
  onSelectUniverse?(id: UniverseId): void;
  onSelectMaterial(id: MaterialId): void;
  onSelectBrush(id: BrushId): void;
  onToggleDoodle(): void;
  onSelectToolMode?(mode: ToolMode): void;
  /** Trigger zero-cooldown Firefly Hint Lantern (questId omitted -> next incomplete Hero Quest) or tap a specific Story Medallion. */
  onRequestHint?(questId?: HeroQuestId): void;
  onHighlightMilestone?(id: StoryMilestoneKind): void;
  /** Pause or resume automatic 2.8s page-turn finale so Violet can Stay & Doodle. */
  onStayAndDoodle?(stay: boolean): void;
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
  showFinale(name: string, meta?: FinaleMeta): Promise<UniverseId | null | void>;
  showBook(b: StorybookSummary, page: number, count: number): void;
  toast(msg: string): void;
  /** Fires a golden starlight arc from an awakened page coordinate to its Right-Side Story Medallion. */
  animateStarThread?(milestoneId: StoryMilestoneKind, fromClientX: number, fromClientY: number): void;
  /** Fires a sparkling Firefly Hint Wisp arc from the Right-Side Story Medallion / Lantern onto the target canvas coordinate. */
  animateHintBeam?(questId: HeroQuestId, toClientX: number, toClientY: number): void;
  /** Pulses a Left-Margin Relic Charm with gold sparkles and a <=2-word whisper tag when it triggers. */
  animateRelicPulse?(relic: RelicId, tag?: string): void;
  /** Drops glowing faceted Prism Stardust Crystal shards into the top-left Crystal Pill. */
  animateCrystalDrop?(amount: number): void;
}
