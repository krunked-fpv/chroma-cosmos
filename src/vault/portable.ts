/** Portable vault JSON: `{format:'chroma-cosmos-vault', version:1, exportedAt, vault, storybooks}` (typed arrays as base64). */
import { CHAPTERS, type ChapterId } from '../contracts/roguelike';
import type { StoryPageSnapshot } from '../contracts/simulation';
import type { Storybook, VaultState } from '../contracts/vault';
import { base64ToBytes, bytesToBase64 } from './codec';
import { isFiniteNum, isRecord, isUint, parseVaultState } from './schema';

export const EXPORT_FORMAT = 'chroma-cosmos-vault';
export const EXPORT_VERSION = 1;

const CHAPTER_IDS: ReadonlySet<string> = new Set(CHAPTERS.map((c) => c.id));

/** Normalises typed-array-ish values (possibly from another realm) to a Uint8Array view. */
export function asBytes(x: unknown): Uint8Array | null {
  if (ArrayBuffer.isView(x)) return new Uint8Array(x.buffer, x.byteOffset, x.byteLength);
  if (x instanceof ArrayBuffer) return new Uint8Array(x);
  return null;
}

function encodePage(p: StoryPageSnapshot): Record<string, unknown> {
  return {
    sceneId: p.sceneId,
    seed: p.seed,
    paintedMaskRle: bytesToBase64(asBytes(p.paintedMaskRle) ?? new Uint8Array(0)),
    regionMaterialId: bytesToBase64(asBytes(p.regionMaterialId) ?? new Uint8Array(0)),
    completedRegionIds: [...p.completedRegionIds],
  };
}

function decodePage(raw: unknown, where: string): StoryPageSnapshot {
  if (!isRecord(raw)) throw new Error(`${where}: page must be an object`);
  if (typeof raw.sceneId !== 'string' || !CHAPTER_IDS.has(raw.sceneId)) throw new Error(`${where}: unknown sceneId`);
  if (!isFiniteNum(raw.seed)) throw new Error(`${where}: bad seed`);
  if (typeof raw.paintedMaskRle !== 'string' || typeof raw.regionMaterialId !== 'string') throw new Error(`${where}: pixel data must be base64 strings`);
  const rle = base64ToBytes(raw.paintedMaskRle);
  const mat = base64ToBytes(raw.regionMaterialId);
  if (!rle || !mat) throw new Error(`${where}: invalid base64 data`);
  const ids = raw.completedRegionIds;
  if (!Array.isArray(ids) || !ids.every((n) => isUint(n))) throw new Error(`${where}: bad completedRegionIds`);
  return { sceneId: raw.sceneId as ChapterId, seed: raw.seed, paintedMaskRle: rle, regionMaterialId: mat, completedRegionIds: [...(ids as number[])] };
}

export function buildVaultExport(vault: Readonly<VaultState>, storybooks: readonly Storybook[], exportedAt: number): string {
  return JSON.stringify({
    format: EXPORT_FORMAT,
    version: EXPORT_VERSION,
    exportedAt,
    vault,
    storybooks: storybooks.map((b) => ({
      id: b.id,
      title: b.title,
      galaxyName: b.galaxyName,
      createdAt: b.createdAt,
      seed: b.seed,
      pages: b.pages.map(encodePage),
    })),
  });
}

/** Strictly validates an export file; throws a clear Error on anything unexpected. */
export function parseVaultExport(text: string): { vault: VaultState; storybooks: Storybook[] } {
  if (typeof text !== 'string' || text.trim() === '') throw new Error('Import failed: the file is empty.');
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    throw new Error('Import failed: the file is not valid JSON.');
  }
  if (!isRecord(raw) || raw.format !== EXPORT_FORMAT) throw new Error(`Import failed: not a Chroma Cosmos vault file (expected format "${EXPORT_FORMAT}").`);
  if (raw.version !== EXPORT_VERSION) throw new Error(`Import failed: unsupported vault version ${String(raw.version)} (expected ${EXPORT_VERSION}).`);
  if (!isFiniteNum(raw.exportedAt)) throw new Error('Import failed: missing exportedAt.');
  const vault = parseVaultState(raw.vault, true);
  if (!vault) throw new Error('Import failed: the vault data is missing or invalid.');
  if (!Array.isArray(raw.storybooks)) throw new Error('Import failed: storybooks must be a list.');
  const storybooks: Storybook[] = [];
  const seen = new Set<string>();
  raw.storybooks.forEach((sb: unknown, i: number) => {
    const where = `storybooks[${i}]`;
    if (!isRecord(sb)) throw new Error(`Import failed: ${where} must be an object.`);
    if (typeof sb.id !== 'string' || sb.id === '') throw new Error(`Import failed: ${where} has no id.`);
    if (typeof sb.title !== 'string' || typeof sb.galaxyName !== 'string') throw new Error(`Import failed: ${where} has a bad title or galaxy name.`);
    if (!isFiniteNum(sb.createdAt) || !isFiniteNum(sb.seed)) throw new Error(`Import failed: ${where} has a bad date or seed.`);
    if (!Array.isArray(sb.pages)) throw new Error(`Import failed: ${where}.pages must be a list.`);
    if (seen.has(sb.id)) throw new Error(`Import failed: duplicate storybook id "${sb.id}".`);
    seen.add(sb.id);
    let pages: StoryPageSnapshot[];
    try {
      pages = sb.pages.map((p: unknown, j: number) => decodePage(p, `${where}.pages[${j}]`));
    } catch (e) {
      throw new Error(`Import failed: ${(e as Error).message}`);
    }
    storybooks.push({ id: sb.id, title: sb.title, galaxyName: sb.galaxyName, createdAt: sb.createdAt, seed: sb.seed, pages });
  });
  return { vault, storybooks };
}

/** Rebuilds a stored storybook so its typed arrays belong to this realm (structured clones may come from another). */
export function normalizeStoredBook(raw: Storybook): Storybook {
  return { ...raw, pages: Array.isArray(raw.pages) ? raw.pages.map((p) => parseStoredPage(p) ?? p) : [] };
}

/** Light structural check for snapshots read back from IndexedDB (no base64 involved). */
export function parseStoredPage(raw: unknown): StoryPageSnapshot | null {
  if (!isRecord(raw) || typeof raw.sceneId !== 'string' || !CHAPTER_IDS.has(raw.sceneId) || !isFiniteNum(raw.seed)) return null;
  const rle = asBytes(raw.paintedMaskRle);
  const mat = asBytes(raw.regionMaterialId);
  if (!rle || !mat || !Array.isArray(raw.completedRegionIds)) return null;
  return { sceneId: raw.sceneId as ChapterId, seed: raw.seed, paintedMaskRle: rle, regionMaterialId: mat, completedRegionIds: raw.completedRegionIds as number[] };
}
