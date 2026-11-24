/** Vault defaults + validation/normalisation. */
import type { AudioLevel } from '../contracts/audio';
import { CORE_MATERIAL_IDS, MATERIALS, type MaterialId } from '../contracts/materials';
import { BADGE_ORDER, WARDROBE_ITEMS, type BadgeId, type WardrobeItemId, type WardrobeState } from '../contracts/progression';
import { CHAPTERS, DRAFT_CARDS, type BrushId, type ChapterId, type RelicId, type RunCore, type RunPhase } from '../contracts/roguelike';
import type { VaultState } from '../contracts/vault';

export const BRUSH_ORDER: readonly BrushId[] = ['standard', 'turboCheetah', 'twinTail', 'supernovaSponge', 'zeroGGel'];
export const RELIC_ORDER: readonly RelicId[] = DRAFT_CARDS.filter((c) => c.type === 'relic').map((c) => c.id as RelicId);
export const PHASE_ORDER: readonly RunPhase[] = ['chapter', 'draft', 'doors', 'finale'];

const MATERIAL_IDS: ReadonlySet<number> = new Set(MATERIALS.map((m) => m.id));
const CHAPTER_IDS: ReadonlySet<string> = new Set(CHAPTERS.map((c) => c.id));

export function isRecord(x: unknown): x is Record<string, unknown> {
  return typeof x === 'object' && x !== null && !Array.isArray(x);
}
export function isFiniteNum(x: unknown): x is number {
  return typeof x === 'number' && Number.isFinite(x);
}
export function isUint(x: unknown, max = Number.MAX_SAFE_INTEGER): x is number {
  return typeof x === 'number' && Number.isInteger(x) && x >= 0 && x <= max;
}

export function emptyWardrobe(): WardrobeState {
  const w = {} as Record<WardrobeItemId, boolean>;
  for (const it of WARDROBE_ITEMS) w[it.id] = false;
  return w;
}

export function defaultVaultState(updatedAt = 0): VaultState {
  return {
    v: 1,
    gems: 0,
    badges: [],
    unlockedMaterials: [...CORE_MATERIAL_IDS],
    wardrobeOwned: [],
    wardrobe: emptyWardrobe(),
    audioLevel: 2,
    run: null,
    stats: { runsCompleted: 0, regionsAwakened: 0, pokes: 0 },
    updatedAt,
  };
}

export function cloneVault(v: Readonly<VaultState>): VaultState {
  return JSON.parse(JSON.stringify(v)) as VaultState;
}

export function deepFreeze<T>(o: T): T {
  if (typeof o === 'object' && o !== null && !Object.isFrozen(o)) {
    Object.freeze(o);
    for (const k of Object.keys(o)) deepFreeze((o as Record<string, unknown>)[k]);
  }
  return o;
}

/** Validates an id list against a known set; returns null when anything is invalid. Dedupes, keeps first-seen order. */
function idList<T extends string | number>(raw: unknown, known: ReadonlySet<T>): T[] | null {
  if (!Array.isArray(raw)) return null;
  const out: T[] = [];
  for (const x of raw) {
    if (!known.has(x as T)) return null;
    if (!out.includes(x as T)) out.push(x as T);
  }
  return out;
}

const BADGE_SET: ReadonlySet<BadgeId> = new Set(BADGE_ORDER);
const WARDROBE_SET: ReadonlySet<WardrobeItemId> = new Set(WARDROBE_ITEMS.map((w) => w.id));
const BRUSH_SET: ReadonlySet<BrushId> = new Set(BRUSH_ORDER);
const RELIC_SET: ReadonlySet<RelicId> = new Set(RELIC_ORDER);
const PHASE_SET: ReadonlySet<RunPhase> = new Set(PHASE_ORDER);

export function parseRunCore(raw: unknown): RunCore | null {
  if (!isRecord(raw)) return null;
  const { seed, chapterIndex, path, brushes, relics, phase } = raw;
  if (!isUint(seed, 0xffffffff)) return null;
  if (!isUint(chapterIndex, 4)) return null;
  if (!Array.isArray(path) || path.length > 5) return null;
  for (const p of path) if (typeof p !== 'string' || !CHAPTER_IDS.has(p)) return null;
  const b = idList(brushes, BRUSH_SET);
  const r = idList(relics, RELIC_SET);
  if (!b || !r) return null;
  if (typeof phase !== 'string' || !PHASE_SET.has(phase as RunPhase)) return null;
  return {
    seed,
    chapterIndex: chapterIndex as RunCore['chapterIndex'],
    path: [...(path as ChapterId[])],
    brushes: b,
    relics: r,
    phase: phase as RunPhase,
  };
}

/**
 * Validates + normalises an untrusted object into a VaultState (null when invalid).
 * strict=false (storage tiers): missing optional fields fall back to defaults, wrong-typed fields are invalid.
 * strict=true (import): every field must be present and valid.
 */
export function parseVaultState(raw: unknown, strict = false): VaultState | null {
  if (!isRecord(raw) || raw.v !== 1) return null;
  const def = defaultVaultState(0);
  const has = (k: string): boolean => raw[k] !== undefined;
  if (strict) {
    for (const k of ['gems', 'badges', 'unlockedMaterials', 'wardrobeOwned', 'wardrobe', 'audioLevel', 'run', 'stats', 'updatedAt']) {
      if (!has(k)) return null;
    }
  }

  let gems = def.gems;
  if (has('gems')) {
    if (!isFiniteNum(raw.gems) || raw.gems < 0) return null;
    gems = raw.gems;
  }

  let badges = def.badges;
  if (has('badges')) {
    const l = idList(raw.badges, BADGE_SET);
    if (!l) return null;
    badges = l;
  }

  let unlockedMaterials = def.unlockedMaterials;
  if (has('unlockedMaterials')) {
    const l = idList(raw.unlockedMaterials, MATERIAL_IDS as ReadonlySet<number>);
    if (!l) return null;
    unlockedMaterials = l as MaterialId[];
  }

  let wardrobeOwned = def.wardrobeOwned;
  if (has('wardrobeOwned')) {
    const l = idList(raw.wardrobeOwned, WARDROBE_SET);
    if (!l) return null;
    wardrobeOwned = l;
  }

  const wardrobe = emptyWardrobe();
  if (has('wardrobe')) {
    if (!isRecord(raw.wardrobe)) return null;
    for (const it of WARDROBE_ITEMS) {
      const val = raw.wardrobe[it.id];
      if (val === undefined) {
        if (strict) return null;
        continue;
      }
      if (typeof val !== 'boolean') return null;
      wardrobe[it.id] = val;
    }
  }

  let audioLevel: AudioLevel = def.audioLevel;
  if (has('audioLevel')) {
    const a = raw.audioLevel;
    if (a !== 0 && a !== 1 && a !== 2 && a !== 3) return null;
    audioLevel = a;
  }

  let run: RunCore | null = null;
  if (has('run') && raw.run !== null) {
    run = parseRunCore(raw.run);
    if (!run) return null;
  }

  const stats = { ...def.stats };
  if (has('stats')) {
    if (!isRecord(raw.stats)) return null;
    for (const k of ['runsCompleted', 'regionsAwakened', 'pokes'] as const) {
      const val = raw.stats[k];
      if (val === undefined) {
        if (strict) return null;
        continue;
      }
      if (!isFiniteNum(val) || val < 0) return null;
      stats[k] = val;
    }
  }

  let updatedAt = 0;
  if (has('updatedAt')) {
    if (!isFiniteNum(raw.updatedAt) || raw.updatedAt < 0) return null;
    updatedAt = raw.updatedAt;
  }

  return { v: 1, gems, badges, unlockedMaterials, wardrobeOwned, wardrobe, audioLevel, run, stats, updatedAt };
}
