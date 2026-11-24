import { VAULT_COOKIE_ATTRS, VAULT_COOKIE_NAME } from '../../../src/contracts/constants';
import { CORE_MATERIAL_IDS, MATERIALS } from '../../../src/contracts/materials';
import { BADGE_ORDER, WARDROBE_ITEMS } from '../../../src/contracts/progression';
import type { StoryPageSnapshot } from '../../../src/contracts/simulation';
import type { Storybook, VaultBackends, VaultState } from '../../../src/contracts/vault';
import { buildCookieString } from '../../../src/vault/cookie';
import { defaultVaultState } from '../../../src/vault/schema';

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
  s.audioLevel = 3;
  s.run = {
    seed: 4_294_967_295,
    chapterIndex: 4,
    path: ['rooftop', 'milkshakeNebula', 'cheetahSavannah', 'bubbleTea', 'heartOfUniverse'],
    brushes: ['standard', 'turboCheetah', 'twinTail', 'supernovaSponge', 'zeroGGel'],
    relics: ['zoomiePaw', 'prismRibbon', 'uvFlashlight', 'kaleidoSharpener'],
    phase: 'finale',
  };
  s.stats = { runsCompleted: 99_999, regionsAwakened: 9_999_999, pokes: 0 };
  return s;
}

export function midState(updatedAt: number): VaultState {
  const s = defaultVaultState(updatedAt);
  s.gems = 42;
  s.badges = ['firstBloom', 'firstRun'];
  s.unlockedMaterials = [...CORE_MATERIAL_IDS, 8];
  s.wardrobeOwned = ['violetCape', 'novaScarf'];
  s.wardrobe.violetCape = true;
  s.audioLevel = 1;
  s.run = { seed: 12345, chapterIndex: 2, path: ['rooftop', 'asteroidGarden', 'saturnRings'], brushes: ['standard', 'twinTail'], relics: ['uvFlashlight'], phase: 'draft' };
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
