/** Shadow-cookie codec: base64url(JSON(CompactCookieV1)) + '.' + fnv1a32 hex of the base64url body. */
import { VAULT_COOKIE_ATTRS, VAULT_COOKIE_NAME } from '../contracts/constants';
import { MATERIALS, type MaterialId } from '../contracts/materials';
import { BADGE_ORDER, WARDROBE_ITEMS, type WardrobeItemId } from '../contracts/progression';
import { CHAPTERS, type ChapterId, type DraftCardId, type RunCore } from '../contracts/roguelike';
import type { CompactCookieV1, VaultState } from '../contracts/vault';
import { base64UrlToText, fnv1a32Hex, textToBase64Url } from './codec';
import { BRUSH_ORDER, DRAFT_CARD_ORDER, PHASE_ORDER, RELIC_ORDER, defaultVaultState, emptyWardrobe, isFiniteNum, isRecord, isUint } from './schema';

export const COOKIE_MAX_CHARS = 1500;

function bitsOf<T>(items: readonly T[], order: readonly T[]): number {
  let bits = 0;
  for (const it of items) {
    const i = order.indexOf(it);
    if (i >= 0) bits |= 1 << i;
  }
  return bits >>> 0;
}

function fromBits<T>(bits: number, order: readonly T[]): T[] {
  const out: T[] = [];
  for (let i = 0; i < order.length; i++) if (bits & (1 << i)) out.push(order[i]!);
  return out;
}

const MATERIAL_ORDER: readonly number[] = MATERIALS.map((m) => m.id); // ids 1..17, bit = id - 1
const WARDROBE_ORDER: readonly WardrobeItemId[] = WARDROBE_ITEMS.map((w) => w.id);
const CHAPTER_BY_CODE = new Map<string, ChapterId>(CHAPTERS.map((c) => [c.code, c.id]));
const CODE_BY_CHAPTER = new Map<ChapterId, string>(CHAPTERS.map((c) => [c.id, c.code]));

export type CompactCookiePayload = CompactCookieV1;

export function toCompactCookie(s: Readonly<VaultState>): CompactCookiePayload {
  let m = 0;
  for (const id of s.unlockedMaterials) if (id >= 1 && id <= 31) m |= 1 << (id - 1);
  const equipped = WARDROBE_ORDER.filter((id) => s.wardrobe[id]);
  const dBits = bitsOf(s.discoveredCards ?? [], DRAFT_CARD_ORDER);
  let r: CompactCookieV1['r'] = 0;
  if (s.run) {
    r = [
      s.run.seed,
      s.run.chapterIndex,
      s.run.path.map((p) => CODE_BY_CHAPTER.get(p) ?? '').join(''),
      bitsOf(s.run.brushes, BRUSH_ORDER),
      bitsOf(s.run.relics, RELIC_ORDER),
      Math.max(0, PHASE_ORDER.indexOf(s.run.phase)),
    ];
  }
  const out: CompactCookiePayload = {
    v: 1,
    g: s.gems,
    b: bitsOf(s.badges, BADGE_ORDER),
    m: m >>> 0,
    o: bitsOf(s.wardrobeOwned, WARDROBE_ORDER),
    w: bitsOf(equipped, WARDROBE_ORDER),
    a: s.audioLevel,
    r,
    s: [s.stats.runsCompleted, s.stats.regionsAwakened],
    t: s.updatedAt,
  };
  if (dBits !== 0) out.d = dBits;
  if (s.prologueSeen === true) out.p = 1;
  return out;
}

export function encodeCookieValue(s: Readonly<VaultState>): string {
  const body = textToBase64Url(JSON.stringify(toCompactCookie(s)));
  return `${body}.${fnv1a32Hex(body)}`;
}

/** Full `document.cookie =` assignment string for the vault. */
export function buildCookieString(s: Readonly<VaultState>): string {
  return `${VAULT_COOKIE_NAME}=${encodeCookieValue(s)}; ${VAULT_COOKIE_ATTRS}`;
}

/**
 * Finds the vault cookie value in a raw `document.cookie` string. Also accepts a bare value
 * (some custom backends return only the value).
 */
export function extractCookieValue(raw: string, name = VAULT_COOKIE_NAME): string | null {
  if (typeof raw !== 'string' || raw === '') return null;
  const prefix = `${name}=`;
  for (const part of raw.split(';')) {
    const p = part.trim();
    if (p.startsWith(prefix)) return p.slice(prefix.length);
  }
  const bare = raw.trim();
  return /^[A-Za-z0-9_-]+\.[0-9a-f]{8}$/.test(bare) ? bare : null;
}

/** Validates checksum + schema; returns null if the value is invalid in any way. Missing fields use defaults. */
export function decodeCookieValue(value: string | null): VaultState | null {
  if (!value || value.length > COOKIE_MAX_CHARS) return null;
  const dot = value.lastIndexOf('.');
  if (dot <= 0) return null;
  const body = value.slice(0, dot);
  const sum = value.slice(dot + 1);
  if (!/^[A-Za-z0-9_-]+$/.test(body) || !/^[0-9a-f]{8}$/.test(sum)) return null;
  if (fnv1a32Hex(body) !== sum) return null;
  const text = base64UrlToText(body);
  if (text === null) return null;
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    return null;
  }
  return expandCompactCookie(raw);
}

export function expandCompactCookie(raw: unknown): VaultState | null {
  if (!isRecord(raw) || raw.v !== 1) return null;
  const def = defaultVaultState(0);
  const has = (k: string): boolean => raw[k] !== undefined;
  const INT = 0x7fffffff;

  let gems = def.gems;
  if (has('g')) {
    if (!isFiniteNum(raw.g) || raw.g < 0) return null;
    gems = raw.g;
  }
  let badges = def.badges;
  if (has('b')) {
    if (!isUint(raw.b, INT)) return null;
    badges = fromBits(raw.b, BADGE_ORDER);
  }
  let unlockedMaterials = def.unlockedMaterials;
  if (has('m')) {
    if (!isUint(raw.m, INT)) return null;
    unlockedMaterials = fromBits(raw.m, MATERIAL_ORDER) as MaterialId[];
  }
  let wardrobeOwned = def.wardrobeOwned;
  if (has('o')) {
    if (!isUint(raw.o, INT)) return null;
    wardrobeOwned = fromBits(raw.o, WARDROBE_ORDER);
  }
  const wardrobe = emptyWardrobe();
  if (has('w')) {
    if (!isUint(raw.w, INT)) return null;
    for (const id of fromBits(raw.w, WARDROBE_ORDER)) wardrobe[id] = true;
  }
  let discoveredCards: DraftCardId[] = [...(def.discoveredCards ?? [])];
  if (has('d')) {
    if (!isUint(raw.d, INT)) return null;
    discoveredCards = fromBits(raw.d, DRAFT_CARD_ORDER);
  }
  let audioLevel = def.audioLevel;
  if (has('a')) {
    const a = raw.a;
    if (a !== 0 && a !== 1 && a !== 2 && a !== 3) return null;
    audioLevel = a;
  }
  let run: RunCore | null = null;
  if (has('r') && raw.r !== 0) {
    const r = raw.r;
    if (!Array.isArray(r) || r.length !== 6) return null;
    const [seed, chapterIndex, pathCodes, brushBits, relicBits, phaseCode] = r as unknown[];
    if (!isUint(seed, 0xffffffff) || !isUint(chapterIndex, 4)) return null;
    if (typeof pathCodes !== 'string' || pathCodes.length > 5) return null;
    if (!isUint(brushBits, INT) || !isUint(relicBits, INT) || !isUint(phaseCode, PHASE_ORDER.length - 1)) return null;
    const path: ChapterId[] = [];
    for (const ch of pathCodes) {
      const id = CHAPTER_BY_CODE.get(ch);
      if (!id) return null;
      path.push(id);
    }
    run = {
      seed,
      chapterIndex: chapterIndex as RunCore['chapterIndex'],
      path,
      brushes: fromBits(brushBits, BRUSH_ORDER),
      relics: fromBits(relicBits, RELIC_ORDER),
      phase: PHASE_ORDER[phaseCode]!,
    };
  }
  const stats = { ...def.stats };
  if (has('s')) {
    const s = raw.s;
    if (!Array.isArray(s) || s.length !== 2 || !isFiniteNum(s[0]) || !isFiniteNum(s[1]) || s[0] < 0 || s[1] < 0) return null;
    stats.runsCompleted = s[0];
    stats.regionsAwakened = s[1];
  }
  let prologueSeen = def.prologueSeen ?? false;
  if (has('p')) {
    if (raw.p !== 0 && raw.p !== 1) return null;
    prologueSeen = raw.p === 1;
  }
  let updatedAt = 0;
  if (has('t')) {
    if (!isFiniteNum(raw.t) || raw.t < 0) return null;
    updatedAt = raw.t;
  }
  return { v: 1, gems, badges, unlockedMaterials, wardrobeOwned, wardrobe, discoveredCards, audioLevel, run, stats, prologueSeen, updatedAt };
}
