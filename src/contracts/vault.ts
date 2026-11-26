/** Vault and export contracts (lossless Sprint 1 -> Sprint 2 migration across LS, IDB, and krunked-cookie-vault-v1). */
import type { AudioLevel } from './audio';
import type { MaterialId } from './materials';
import type { BadgeId, WardrobeItemId, WardrobeState } from './progression';
import type { DraftCardId, RunCore } from './roguelike';
import type { StoryPageSnapshot } from './simulation';
import type { UniverseId } from './universes';

export interface VaultState {
  v: 1;
  gems: number;
  badges: BadgeId[];
  unlockedMaterials: MaterialId[];
  wardrobeOwned: WardrobeItemId[];
  wardrobe: WardrobeState;
  /** Astral Pencil Tin upgrades discovered across voyages (optional for Sprint 1 compat). */
  discoveredCards?: DraftCardId[];
  /** Universes completed at least once (unlocks the next universe in UNIVERSE_ORDER). */
  completedUniverses?: UniverseId[];
  /** Currently selected home sanctuary / voyage universe (defaults to 'chromaCosmos'). */
  activeUniverse?: UniverseId;
  audioLevel: AudioLevel;
  run: RunCore | null;
  stats: { runsCompleted: number; regionsAwakened: number; pokes: number };
  /** True once the player has experienced the Chapter 1 visual prologue at least once (optional for v1 compat). */
  prologueSeen?: boolean;
  updatedAt: number;
}

/**
 * Shadow-cookie payload. Cookie value = base64url(JSON(CompactCookieV1)) + '.' + fnv1a32 hex of the base64url body.
 * Must stay < 1500 chars.
 * b/m/o/w/d/u are 31-bit bitfields (badge index in BADGE_ORDER, material id-1, wardrobe index in WARDROBE_ITEMS, discovered card index in DRAFT_CARDS, completed universe index in UNIVERSE_ORDER).
 * r = [seed, chapterIndex, pathCodes (positional R/M/A/S/U/B/W/H chars), brushBits, relicBits, phaseCode] or 0 when no run.
 */
export interface CompactCookieV1 {
  v: 1;
  g: number;
  b: number;
  m: number;
  o: number;
  w: number;
  /** Optional bitfield of discovered Astral Pencil Tin cards (indices in DRAFT_CARDS, 20 bits). */
  d?: number;
  /** Optional 21-bit completed universe bitfield (indices in UNIVERSE_ORDER). */
  u?: number;
  /** Optional active universe index (0..20 in UNIVERSE_ORDER). */
  cu?: number;
  /** Optional active run universe index (0..20 in UNIVERSE_ORDER). */
  ru?: number;
  a: AudioLevel;
  r: [number, number, string, number, number, number] | 0;
  s: [number, number];
  /** Optional prologueSeen flag (0|1). */
  p?: 0 | 1;
  t: number;
}

export interface Storybook {
  id: string;
  title: string;
  galaxyName: string;
  createdAt: number;
  seed: number;
  pages: StoryPageSnapshot[];
  universeId?: UniverseId;
}

export interface StorybookSummary {
  id: string;
  title: string;
  galaxyName: string;
  createdAt: number;
  pageCount: number;
  /** Deterministic cover/spine palette seed from Storybook.seed */
  seed?: number;
  universeId?: UniverseId;
}

export interface HydrationReport {
  source: 'localStorage' | 'indexedDB' | 'cookie' | 'fresh';
  healed: Array<'localStorage' | 'indexedDB' | 'cookie'>;
}

export interface VaultPort {
  hydrate(): Promise<HydrationReport>;
  get(): Readonly<VaultState>;
  update(m: (d: VaultState) => void): void;
  healCheck(): void;
  saveRunPages(active: StoryPageSnapshot | null, done: StoryPageSnapshot[]): Promise<void>;
  loadRunPages(): Promise<{ active: StoryPageSnapshot | null; done: StoryPageSnapshot[] }>;
  saveStorybook(b: Storybook): Promise<void>;
  listStorybooks(): Promise<StorybookSummary[]>;
  getStorybook(id: string): Promise<Storybook | undefined>;
  exportJson(): Promise<string>;
  importJson(t: string): Promise<HydrationReport>;
  flush(): Promise<void>;
  lastReport(): HydrationReport | null;
}

export interface VaultBackends {
  localStorage: Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>;
  indexedDB: IDBFactory;
  cookie: { read(): string; write(v: string): void };
  now(): number;
}

export interface KeepsakeMeta {
  title: string;
  galaxyName: string;
  chapterTitle: string;
  dateIso: string;
}

export interface KeepsakePort {
  renderPostcard(page: HTMLCanvasElement, meta: KeepsakeMeta): HTMLCanvasElement;
  savePng(c: HTMLCanvasElement, filename: string): Promise<Blob>;
  saveText(text: string, filename: string, mime: string): void;
}
