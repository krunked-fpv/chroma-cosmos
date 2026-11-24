import { VAULT_COOKIE_ATTRS, VAULT_COOKIE_NAME } from '../../../src/contracts/constants';
import { CORE_MATERIAL_IDS, MATERIALS } from '../../../src/contracts/materials';
import { BADGE_ORDER, WARDROBE_ITEMS } from '../../../src/contracts/progression';
import { DRAFT_CARDS } from '../../../src/contracts/roguelike';
import type { StoryPageSnapshot } from '../../../src/contracts/simulation';
import type { Storybook, VaultBackends, VaultState } from '../../../src/contracts/vault';
import { buildCookieString } from '../../../src/vault/cookie';
import { BRUSH_ORDER, RELIC_ORDER, defaultVaultState } from '../../../src/vault/schema';

/**
 * Frozen verbatim Sprint 1 `krunked-cookie-vault-v1` cookie strings (no `d` field; 12-material / 6-wardrobe / 5-brush / 4-relic era).
 * Payload (WITH_P): {"v":1,"g":185,"b":51,"m":2559,"o":43,"w":41,"a":3,"r":[987654321,3,"RMUW",27,13,2],"s":[3,142],"p":1,"t":1760000000000}
 * Payload (NO_P):   {"v":1,"g":74,"b":3,"m":255,"o":18,"w":16,"a":1,"r":[4242,1,"RA",5,2,1],"s":[1,19],"t":1750000000000}
 */
export const FROZEN_SPRINT1_COOKIE_WITH_P =
  'eyJ2IjoxLCJnIjoxODUsImIiOjUxLCJtIjoyNTU5LCJvIjo0MywidyI6NDEsImEiOjMsInIiOls5ODc2NTQzMjEsMywiUk1VVyIsMjcsMTMsMl0sInMiOlszLDE0Ml0sInAiOjEsInQiOjE3NjAwMDAwMDAwMDB9.6b61f2fd';
export const FROZEN_SPRINT1_COOKIE_NO_P =
  'eyJ2IjoxLCJnIjo3NCwiYiI6MywibSI6MjU1LCJvIjoxOCwidyI6MTYsImEiOjEsInIiOls0MjQyLDEsIlJBIiw1LDIsMV0sInMiOlsxLDE5XSwidCI6MTc1MDAwMDAwMDAwMH0.b2928c4f';

/** Frozen Sprint 1 raw vault JSON object: ONLY the original 6 wardrobe keys and NO `discoveredCards` field. */
export function sprint1RawVault(updatedAt = 1_760_000_000_000, includePrologue = true): Record<string, unknown> {
  const base: Record<string, unknown> = {
    v: 1,
    gems: 185,
    badges: ['firstBloom', 'lumiFriend', 'rainbowMaster', 'firstRun'],
    unlockedMaterials: [1, 2, 3, 4, 5, 6, 7, 8, 9, 12],
    wardrobeOwned: ['violetPins', 'violetCape', 'lumiCrown', 'novaScarf'],
    wardrobe: {
      violetPins: true,
      violetCape: false,
      lumiWings: false,
      lumiCrown: true,
      novaBoosters: false,
      novaScarf: true,
    },
    audioLevel: 3,
    run: {
      seed: 987_654_321,
      chapterIndex: 3,
      path: ['rooftop', 'milkshakeNebula', 'saturnRings', 'whaleSea'],
      brushes: ['standard', 'turboCheetah', 'supernovaSponge', 'zeroGGel'],
      relics: ['zoomiePaw', 'uvFlashlight', 'kaleidoSharpener'],
      phase: 'doors',
    },
    stats: { runsCompleted: 3, regionsAwakened: 142, pokes: 29 },
    updatedAt,
  };
  if (includePrologue) base.prologueSeen = true;
  return base;
}

/** In-memory cookie jar speaking the same `name=value; attrs` dialect as document.cookie. */
export function fakeCookie(): VaultBackends['cookie'] & { raw(): string | undefined; wipe(): void; set(v: string): void } {
  let value: string | undefined;
  return {
    read: () => (value === undefined ? 'theme=dark' : `theme=dark; ${VAULT_COOKIE_NAME}=${value}`),
    write: (v) => {
      const first = v.split(';')[0]!;
      const eq = first.indexOf('=');
      if (first.slice(0, eq) !== VAULT_COOKIE_NAME) return;
      value = first.slice(eq + 1);
      expectAttrs(v);
    },
    raw: () => value,
    wipe: () => {
      value = undefined;
    },
    set: (v) => {
      value = v;
    },
  };
}

function expectAttrs(v: string): void {
  if (!v.endsWith(`; ${VAULT_COOKIE_ATTRS}`)) throw new Error(`cookie written without the contract attrs: ${v}`);
}

export function fakeLocalStorage(): VaultBackends['localStorage'] & { map: Map<string, string> } {
  const map = new Map<string, string>();
  return {
    map,
    getItem: (k) => map.get(k) ?? null,
    setItem: (k, v) => void map.set(k, v),
    removeItem: (k) => void map.delete(k),
  };
}

export function maxState(updatedAt = 1_800_000_000_000): VaultState {
  const s = defaultVaultState(updatedAt);
  s.gems = 4_294_967_295;
  s.badges = [...BADGE_ORDER];
  s.unlockedMaterials = MATERIALS.map((m) => m.id);
  s.wardrobeOwned = WARDROBE_ITEMS.map((w) => w.id);
  for (const w of WARDROBE_ITEMS) s.wardrobe[w.id] = true;
  s.discoveredCards = DRAFT_CARDS.map((c) => c.id);
  s.audioLevel = 3;
  s.run = {
    seed: 4_294_967_295,
    chapterIndex: 4,
    path: ['rooftop', 'milkshakeNebula', 'cheetahSavannah', 'bubbleTea', 'heartOfUniverse'],
    brushes: [...BRUSH_ORDER],
    relics: [...RELIC_ORDER],
    phase: 'finale',
  };
  s.stats = { runsCompleted: 99_999, regionsAwakened: 9_999_999, pokes: 0 };
  s.prologueSeen = true;
  return s;
}

export function midState(updatedAt: number): VaultState {
  const s = defaultVaultState(updatedAt);
  s.gems = 42;
  s.badges = ['firstBloom', 'firstRun'];
  s.unlockedMaterials = [...CORE_MATERIAL_IDS, 8, 13];
  s.wardrobeOwned = ['violetCape', 'novaScarf', 'violetHeadphones'];
  s.wardrobe.violetCape = true;
  s.wardrobe.violetHeadphones = true;
  s.discoveredCards = ['twinTail', 'cometMeteor', 'uvFlashlight', 'constellationCrown'];
  s.audioLevel = 1;
  s.run = {
    seed: 12345,
    chapterIndex: 2,
    path: ['rooftop', 'asteroidGarden', 'saturnRings'],
    brushes: ['standard', 'twinTail', 'cometMeteor'],
    relics: ['uvFlashlight', 'constellationCrown'],
    phase: 'draft',
  };
  s.stats = { runsCompleted: 2, regionsAwakened: 31, pokes: 0 };
  return s;
}

export function makePage(seed: number): StoryPageSnapshot {
  const mat = new Uint8Array(256);
  for (let i = 0; i < 256; i++) mat[i] = (i * 7 + seed) & 0xff;
  return {
    sceneId: 'rooftop',
    seed,
    paintedMaskRle: Uint8Array.from([0, 5, 1, 200, 255, seed & 0xff, 3, 3, 3]),
    regionMaterialId: mat,
    completedRegionIds: [1, 2, 3, seed],
  };
}

export function makeBook(id: string, createdAt: number, pages = 2): Storybook {
  return {
    id,
    title: `Book ${id}`,
    galaxyName: `Galaxy ${id}`,
    createdAt,
    seed: createdAt % 1000,
    pages: Array.from({ length: pages }, (_, i) => makePage(i + 1)),
  };
}

/** Writes `state` into a fake cookie via the production encoder. */
export function putStateInCookie(c: ReturnType<typeof fakeCookie>, s: VaultState): void {
  const str = buildCookieString(s);
  c.write(str);
}

// ---- raw IndexedDB helpers (bypass the vault to inspect / seed the database) ----
import { IDB_NAME, IDB_RUN_KEY, IDB_STORE_RUN_STATE, IDB_STORE_STORYBOOKS, IDB_VERSION } from '../../../src/contracts/constants';

function wrap<T>(r: IDBRequest<T>): Promise<T> {
  return new Promise((res, rej) => {
    r.onsuccess = () => res(r.result);
    r.onerror = () => rej(r.error);
  });
}

export function rawOpen(f: IDBFactory): Promise<IDBDatabase> {
  return new Promise((res, rej) => {
    const req = f.open(IDB_NAME, IDB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(IDB_STORE_STORYBOOKS)) db.createObjectStore(IDB_STORE_STORYBOOKS, { keyPath: 'id' });
      if (!db.objectStoreNames.contains(IDB_STORE_RUN_STATE)) db.createObjectStore(IDB_STORE_RUN_STATE);
    };
    req.onsuccess = () => res(req.result);
    req.onerror = () => rej(req.error);
  });
}

/** Seeds run_state/current with an arbitrary record (e.g. {vault, pages}). */
export async function rawPutRecord(f: IDBFactory, record: unknown): Promise<void> {
  const db = await rawOpen(f);
  const tx = db.transaction(IDB_STORE_RUN_STATE, 'readwrite');
  tx.objectStore(IDB_STORE_RUN_STATE).put(record, IDB_RUN_KEY);
  await new Promise<void>((res, rej) => {
    tx.oncomplete = () => res();
    tx.onerror = () => rej(tx.error);
  });
  db.close();
}

export async function rawGetRecord(f: IDBFactory): Promise<any> {
  const db = await rawOpen(f);
  try {
    return await wrap(db.transaction(IDB_STORE_RUN_STATE).objectStore(IDB_STORE_RUN_STATE).get(IDB_RUN_KEY));
  } finally {
    db.close();
  }
}

export async function rawStoreNames(f: IDBFactory): Promise<string[]> {
  const db = await rawOpen(f);
  try {
    return [...db.objectStoreNames].sort();
  } finally {
    db.close();
  }
}

export function rawDelete(f: IDBFactory, timeoutMs = 3000): Promise<'deleted' | 'blocked' | 'timeout'> {
  return new Promise((res) => {
    let blocked = false;
    const timer = setTimeout(() => res('timeout'), timeoutMs);
    const req = f.deleteDatabase(IDB_NAME);
    req.onblocked = () => {
      blocked = true;
    };
    req.onsuccess = () => {
      clearTimeout(timer);
      res(blocked ? 'blocked' : 'deleted');
    };
    req.onerror = () => {
      clearTimeout(timer);
      res('timeout');
    };
  });
}
