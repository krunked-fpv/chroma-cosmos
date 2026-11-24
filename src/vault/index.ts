/** Tri-tier self-healing vault: localStorage + IndexedDB + shadow cookie. */
import { VAULT_LS_KEY } from '../contracts/constants';
import type { HydrationReport, Storybook, StorybookSummary, VaultBackends, VaultPort, VaultState } from '../contracts/vault';
import type { StoryPageSnapshot } from '../contracts/simulation';
import { buildCookieString, decodeCookieValue, extractCookieValue } from './cookie';
import { IdbStore } from './idb';
import { buildVaultExport, normalizeStoredBook, parseStoredPage, parseVaultExport } from './portable';
import { cloneVault, deepFreeze, defaultVaultState, isFiniteNum, isRecord, parseVaultState } from './schema';

export { BRUSH_ORDER, RELIC_ORDER, DRAFT_CARD_ORDER, PHASE_ORDER, defaultVaultState, parseVaultState } from './schema';
export { buildCookieString, decodeCookieValue, encodeCookieValue, expandCompactCookie, extractCookieValue, toCompactCookie, COOKIE_MAX_CHARS } from './cookie';
export { fnv1a32Hex } from './codec';

type Tier = 'localStorage' | 'indexedDB' | 'cookie';
const TIER_ORDER: readonly Tier[] = ['localStorage', 'indexedDB', 'cookie'];

export const IDB_DEBOUNCE_MS = 250;

export interface VaultOptions {
  /** How long to wait for indexedDB.open before treating IndexedDB as unavailable (default 2500 ms). */
  idbTimeoutMs?: number;
}

interface RunPages {
  active: StoryPageSnapshot | null;
  done: StoryPageSnapshot[];
}

function defaultLocalStorage(): VaultBackends['localStorage'] {
  const ls = (): Storage => {
    const s = (globalThis as { localStorage?: Storage }).localStorage;
    if (!s) throw new Error('localStorage unavailable');
    return s;
  };
  return {
    getItem: (k) => {
      try {
        return ls().getItem(k);
      } catch {
        return null;
      }
    },
    setItem: (k, v) => ls().setItem(k, v),
    removeItem: (k) => ls().removeItem(k),
  };
}

function defaultCookie(): VaultBackends['cookie'] {
  return {
    read: () => {
      try {
        return typeof document === 'undefined' ? '' : document.cookie;
      } catch {
        return '';
      }
    },
    write: (v) => {
      if (typeof document === 'undefined') throw new Error('document unavailable');
      document.cookie = v;
    },
  };
}

function defaultIndexedDb(): IDBFactory | undefined {
  try {
    return (globalThis as { indexedDB?: IDBFactory }).indexedDB ?? undefined;
  } catch {
    return undefined;
  }
}

export function createVault(b: Partial<VaultBackends> = {}, opts: VaultOptions = {}): VaultPort {
  const ls = b.localStorage ?? defaultLocalStorage();
  const cookie = b.cookie ?? defaultCookie();
  const now = b.now ?? ((): number => Date.now());
  const factory = Object.prototype.hasOwnProperty.call(b, 'indexedDB') ? (b.indexedDB ?? undefined) : defaultIndexedDb();
  const idb = new IdbStore(factory, opts.idbTimeoutMs ?? 2500);

  let state: VaultState = defaultVaultState(0);
  let snapshot: Readonly<VaultState> | null = null;
  let report: HydrationReport | null = null;

  let idbTimer: ReturnType<typeof setTimeout> | null = null;
  let idbDirty = false;
  let chain: Promise<unknown> = Promise.resolve();

  /** In-memory fallbacks used only while IndexedDB is unusable, so the session keeps working. */
  const memBooks = new Map<string, Storybook>();
  let memPages: RunPages | null = null;

  const enqueue = <T>(fn: () => Promise<T>): Promise<T> => {
    const p = chain.then(fn);
    chain = p.catch(() => undefined);
    return p;
  };

  // ---- tier primitives (never throw) -------------------------------------------------------
  const readLS = (): VaultState | null => {
    try {
      const raw = ls.getItem(VAULT_LS_KEY);
      if (raw === null || raw === undefined) return null;
      return parseVaultState(JSON.parse(raw));
    } catch {
      return null;
    }
  };
  const writeLS = (s: VaultState): boolean => {
    try {
      ls.setItem(VAULT_LS_KEY, JSON.stringify(s));
      return true;
    } catch {
      return false;
    }
  };
  const readCookie = (): VaultState | null => {
    try {
      return decodeCookieValue(extractCookieValue(cookie.read()));
    } catch {
      return null;
    }
  };
  const writeCookie = (s: VaultState): boolean => {
    try {
      cookie.write(buildCookieString(s));
      return true;
    } catch {
      return false;
    }
  };
  /** null = readable but no valid vault there; undefined = IndexedDB unusable. */
  const readIdbVault = async (): Promise<VaultState | null | undefined> => {
    try {
      const rec = await idb.readRunRecord();
      return isRecord(rec) ? parseVaultState(rec.vault) : null;
    } catch {
      return undefined;
    }
  };
  const mirrorToIdb = async (s: VaultState): Promise<boolean> => {
    try {
      await idb.updateRunRecord((old) => ({ pages: { active: null, done: [] }, ...(isRecord(old) ? old : {}), vault: cloneVault(s) }));
      return true;
    } catch {
      return false;
    }
  };

  // ---- debounced IndexedDB mirroring ------------------------------------------------------
  const runIdbWrite = (): Promise<void> =>
    enqueue(async () => {
      if (!idbDirty) return;
      idbDirty = false;
      if (!(await mirrorToIdb(state))) idbDirty = true; // retried by the next update / healCheck
    }).catch(() => undefined);

  const scheduleIdb = (): void => {
    idbDirty = true;
    if (idbTimer !== null) clearTimeout(idbTimer);
    idbTimer = setTimeout(() => {
      idbTimer = null;
      void runIdbWrite();
    }, IDB_DEBOUNCE_MS);
  };

  const commit = (next: VaultState): void => {
    state = next;
    snapshot = null;
  };

  const allBooks = async (): Promise<Storybook[]> => {
    const byId = new Map<string, Storybook>();
    for (const m of memBooks.values()) byId.set(m.id, m);
    try {
      for (const sb of await idb.getAllStorybooks()) byId.set(sb.id, normalizeStoredBook(sb));
    } catch {
      /* IndexedDB unusable: memory copies only */
    }
    return [...byId.values()];
  };

  const putBooks = async (books: Storybook[]): Promise<void> => {
    try {
      await idb.putStorybooks(books);
      for (const bk of books) memBooks.delete(bk.id);
    } catch {
      for (const bk of books) memBooks.set(bk.id, bk);
    }
  };

  const port: VaultPort = {
    async hydrate(): Promise<HydrationReport> {
      try {
        const cands: Array<{ tier: Tier; s: VaultState }> = [];
        const l = readLS();
        if (l) cands.push({ tier: 'localStorage', s: l });
        const ix = await readIdbVault();
        const idbUsable = ix !== undefined;
        if (ix) cands.push({ tier: 'indexedDB', s: ix });
        const ck = readCookie();
        if (ck) cands.push({ tier: 'cookie', s: ck });

        let winner: { tier: Tier; s: VaultState } | null = null;
        for (const c of cands) if (!winner || c.s.updatedAt > winner.s.updatedAt) winner = c; // ties keep earlier (LS > IDB > cookie)

        let source: HydrationReport['source'];
        let next: VaultState;
        let stale: Tier[];
        if (!winner) {
          source = 'fresh';
          next = defaultVaultState(now());
          stale = [...TIER_ORDER];
        } else {
          source = winner.tier;
          next = cloneVault(winner.s);
          if (winner.tier === 'cookie') {
            // the cookie does not carry `pokes`; a monotone counter, so keep the best value other tiers know
            for (const c of cands) next.stats.pokes = Math.max(next.stats.pokes, c.s.stats.pokes);
          }
          const w = winner;
          stale = TIER_ORDER.filter((t) => {
            const c = cands.find((x) => x.tier === t);
            return !c || c.s.updatedAt < w.s.updatedAt;
          });
        }

        if (idbTimer !== null) {
          clearTimeout(idbTimer);
          idbTimer = null;
        }
        idbDirty = false;
        commit(next);

        const healed: Tier[] = [];
        for (const t of stale) {
          const ok = t === 'localStorage' ? writeLS(next) : t === 'cookie' ? writeCookie(next) : idbUsable && (await mirrorToIdb(next));
          if (ok) healed.push(t);
        }
        report = { source, healed };
      } catch {
        report = { source: 'fresh', healed: [] };
      }
      return { source: report.source, healed: [...report.healed] };
    },

    get(): Readonly<VaultState> {
      if (!snapshot) snapshot = deepFreeze(cloneVault(state));
      return snapshot;
    },

    update(m: (d: VaultState) => void): void {
      const draft = cloneVault(state);
      m(draft); // a throwing mutator leaves the vault untouched
      const next = parseVaultState({ ...draft, v: 1 });
      if (!next) return; // refuse to persist a corrupt state (NaN gems, unknown ids, ...)
      next.updatedAt = now();
      commit(next);
      writeLS(next);
      writeCookie(next);
      scheduleIdb();
    },

    healCheck(): void {
      const l = readLS();
      if (!l || l.updatedAt < state.updatedAt) writeLS(state);
      const c = readCookie();
      if (!c || c.updatedAt < state.updatedAt) writeCookie(state);
      if (idbDirty && idbTimer === null) scheduleIdb();
    },

    async saveRunPages(active: StoryPageSnapshot | null, done: StoryPageSnapshot[]): Promise<void> {
      const pages: RunPages = { active, done: [...done] };
      await enqueue(async () => {
        try {
          await idb.updateRunRecord((old) => ({ ...(isRecord(old) ? old : {}), vault: cloneVault(state), pages }));
          memPages = null;
        } catch {
          memPages = pages;
        }
      });
    },

    async loadRunPages(): Promise<RunPages> {
      const empty: RunPages = { active: null, done: [] };
      try {
        const rec = await idb.readRunRecord();
        if (isRecord(rec) && isRecord(rec.pages)) {
          const active = rec.pages.active === null || rec.pages.active === undefined ? null : parseStoredPage(rec.pages.active);
          const done = Array.isArray(rec.pages.done) ? rec.pages.done.map(parseStoredPage).filter((p): p is StoryPageSnapshot => p !== null) : [];
          return { active, done };
        }
        return memPages ?? empty;
      } catch {
        return memPages ?? empty;
      }
    },

    async saveStorybook(book: Storybook): Promise<void> {
      if (!book || typeof book.id !== 'string' || book.id === '') throw new TypeError('Storybook needs a non-empty id');
      await enqueue(() => putBooks([book]));
    },

    async listStorybooks(): Promise<StorybookSummary[]> {
      const books = await allBooks();
      return books
        .map((bk) => ({
          id: bk.id,
          title: bk.title,
          galaxyName: bk.galaxyName,
          createdAt: bk.createdAt,
          pageCount: bk.pages.length,
          ...(isFiniteNum(bk.seed) ? { seed: bk.seed } : {}),
        }))
        .sort((a, c) => c.createdAt - a.createdAt || (a.id < c.id ? -1 : a.id > c.id ? 1 : 0));
    },

    async getStorybook(id: string): Promise<Storybook | undefined> {
      try {
        const sb = await idb.getStorybook(id);
        if (sb) return normalizeStoredBook(sb);
      } catch {
        /* fall through to memory */
      }
      return memBooks.get(id);
    },

    async exportJson(): Promise<string> {
      return buildVaultExport(state, await allBooks(), now());
    },

    /** Replaces the vault (updatedAt bumped so it wins), unions storybooks by id, and writes every tier. */
    async importJson(text: string): Promise<HydrationReport> {
      const parsed = parseVaultExport(text); // throws a clear Error on garbage; nothing is modified
      if (idbTimer !== null) {
        clearTimeout(idbTimer);
        idbTimer = null;
      }
      idbDirty = false;
      const next = parsed.vault;
      next.updatedAt = Math.max(now(), state.updatedAt + 1);
      commit(next);
      const healed: Tier[] = [];
      if (writeLS(next)) healed.push('localStorage');
      const idbOk = await enqueue(async () => {
        await putBooks(parsed.storybooks);
        return mirrorToIdb(next);
      });
      if (idbOk) healed.push('indexedDB');
      if (writeCookie(next)) healed.push('cookie');
      report = { source: 'localStorage', healed };
      return { source: report.source, healed: [...healed] };
    },

    async flush(): Promise<void> {
      if (idbTimer !== null) {
        clearTimeout(idbTimer);
        idbTimer = null;
        idbDirty = true;
      }
      if (idbDirty) await runIdbWrite();
      await chain;
    },

    lastReport(): HydrationReport | null {
      return report ? { source: report.source, healed: [...report.healed] } : null;
    },
  };
  return port;
}
