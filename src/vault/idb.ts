/** Lazy, self-recovering IndexedDB access for the vault. */
import { IDB_NAME, IDB_RUN_KEY, IDB_STORE_RUN_STATE, IDB_STORE_STORYBOOKS, IDB_VERSION } from '../contracts/constants';
import type { Storybook } from '../contracts/vault';

export class IdbStore {
  private dbPromise: Promise<IDBDatabase> | null = null;

  constructor(
    private readonly factory: IDBFactory | undefined,
    private readonly timeoutMs: number,
  ) {}

  get available(): boolean {
    return !!this.factory;
  }

  /** Drops the cached handle (the next call reopens lazily and recreates stores if needed). */
  reset(): void {
    this.dbPromise = null;
  }

  open(): Promise<IDBDatabase> {
    if (this.dbPromise) return this.dbPromise;
    const factory = this.factory;
    if (!factory) return Promise.reject(new Error('IndexedDB unavailable'));
    const p = new Promise<IDBDatabase>((resolve, reject) => {
      let settled = false;
      const timer = setTimeout(() => {
        if (settled) return;
        settled = true;
        reject(new Error('IndexedDB open timed out'));
      }, this.timeoutMs);
      const fail = (e: unknown): void => {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        reject(e instanceof Error ? e : new Error('IndexedDB open failed'));
      };
      let req: IDBOpenDBRequest;
      try {
        req = factory.open(IDB_NAME, IDB_VERSION);
      } catch (e) {
        fail(e);
        return;
      }
      req.onupgradeneeded = () => {
        const db = req.result;
        if (!db.objectStoreNames.contains(IDB_STORE_STORYBOOKS)) db.createObjectStore(IDB_STORE_STORYBOOKS, { keyPath: 'id' });
        if (!db.objectStoreNames.contains(IDB_STORE_RUN_STATE)) db.createObjectStore(IDB_STORE_RUN_STATE);
      };
      req.onsuccess = () => {
        const db = req.result;
        if (settled) {
          db.close(); // arrived after a timeout
          return;
        }
        settled = true;
        clearTimeout(timer);
        const drop = (): void => {
          if (this.dbPromise === p) this.dbPromise = null;
        };
        // CRITICAL: never block an external deleteDatabase / version change.
        db.onversionchange = () => {
          db.close();
          drop();
        };
        db.onclose = drop;
        resolve(db);
      };
      req.onerror = () => fail(req.error);
      req.onblocked = () => {
        /* wait: either unblocks or the timeout fires */
      };
    });
    this.dbPromise = p;
    p.catch(() => {
      if (this.dbPromise === p) this.dbPromise = null;
    });
    return p;
  }

  /** Runs op against a live handle; if the handle went stale (closed/deleted) retries once on a fresh one. */
  private async withDb<T>(op: (db: IDBDatabase) => Promise<T>): Promise<T> {
    let lastErr: unknown;
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        const db = await this.open();
        return await op(db);
      } catch (e) {
        lastErr = e;
        this.reset();
      }
    }
    throw lastErr instanceof Error ? lastErr : new Error('IndexedDB operation failed');
  }

  private txPromise<T>(db: IDBDatabase, stores: string[], mode: IDBTransactionMode, body: (tx: IDBTransaction, setResult: (v: T) => void) => void): Promise<T> {
    return new Promise<T>((resolve, reject) => {
      const tx = db.transaction(stores, mode);
      let result: T;
      tx.oncomplete = () => resolve(result);
      tx.onerror = () => reject(tx.error ?? new Error('IndexedDB transaction failed'));
      tx.onabort = () => reject(tx.error ?? new Error('IndexedDB transaction aborted'));
      body(tx, (v) => {
        result = v;
      });
    });
  }

  /** Reads the raw `run_state/current` record (undefined when absent). */
  readRunRecord(): Promise<unknown> {
    return this.withDb((db) =>
      this.txPromise<unknown>(db, [IDB_STORE_RUN_STATE], 'readonly', (tx, set) => {
        const r = tx.objectStore(IDB_STORE_RUN_STATE).get(IDB_RUN_KEY);
        r.onsuccess = () => set(r.result);
      }),
    );
  }

  /** Atomic read-modify-write of `run_state/current`. */
  updateRunRecord(fn: (old: unknown) => unknown): Promise<void> {
    return this.withDb((db) =>
      this.txPromise<void>(db, [IDB_STORE_RUN_STATE], 'readwrite', (tx) => {
        const store = tx.objectStore(IDB_STORE_RUN_STATE);
        const r = store.get(IDB_RUN_KEY);
        r.onsuccess = () => {
          store.put(fn(r.result), IDB_RUN_KEY);
        };
      }),
    );
  }

  putStorybooks(books: Storybook[]): Promise<void> {
    return this.withDb((db) =>
      this.txPromise<void>(db, [IDB_STORE_STORYBOOKS], 'readwrite', (tx) => {
        const store = tx.objectStore(IDB_STORE_STORYBOOKS);
        for (const b of books) store.put(b);
      }),
    );
  }

  getAllStorybooks(): Promise<Storybook[]> {
    return this.withDb((db) =>
      this.txPromise<Storybook[]>(db, [IDB_STORE_STORYBOOKS], 'readonly', (tx, set) => {
        const r = tx.objectStore(IDB_STORE_STORYBOOKS).getAll();
        r.onsuccess = () => set(r.result as Storybook[]);
      }),
    );
  }

  getStorybook(id: string): Promise<Storybook | undefined> {
    return this.withDb((db) =>
      this.txPromise<Storybook | undefined>(db, [IDB_STORE_STORYBOOKS], 'readonly', (tx, set) => {
        const r = tx.objectStore(IDB_STORE_STORYBOOKS).get(id);
        r.onsuccess = () => set(r.result as Storybook | undefined);
      }),
    );
  }
}
