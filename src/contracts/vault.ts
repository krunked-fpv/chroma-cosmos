/** Vault and export contracts. */
import type { AudioLevel } from './audio';
import type { MaterialId } from './materials';
import type { BadgeId, WardrobeItemId, WardrobeState } from './progression';
import type { RunCore } from './roguelike';
import type { StoryPageSnapshot } from './simulation';

export interface VaultState {
  v: 1;
  gems: number;
  badges: BadgeId[];
  unlockedMaterials: MaterialId[];
  wardrobeOwned: WardrobeItemId[];
  wardrobe: WardrobeState;
  audioLevel: AudioLevel;
  run: RunCore | null;
  stats: { runsCompleted: number; regionsAwakened: number; pokes: number };
  updatedAt: number;
}

/**
 * Shadow-cookie payload. Cookie value = base64url(JSON(CompactCookieV1)) + '.' + fnv1a32 hex of the base64url body.
 * Must stay < 1500 chars. b/m/o/w are bitfields (badge index in BADGE_ORDER, material id-1, wardrobe index in WARDROBE_ITEMS).
 * r = [seed, chapterIndex, pathCodes (CHAPTERS code chars), brushBits, relicBits, phaseCode] or 0 when no run.
 */
export interface CompactCookieV1 {
  v: 1;
  g: number;
  b: number;
  m: number;
  o: number;
  w: number;
  a: AudioLevel;
  r: [number, number, string, number, number, number] | 0;
  s: [number, number];
  t: number;
}

export interface Storybook {
  id: string;
  title: string;
  galaxyName: string;
  createdAt: number;
  seed: number;
  pages: StoryPageSnapshot[];
}

export interface StorybookSummary {
  id: string;
  title: string;
  galaxyName: string;
  createdAt: number;
  pageCount: number;
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
