// @vitest-environment jsdom
import 'fake-indexeddb/auto';
import { IDBFactory } from 'fake-indexeddb';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { IDB_NAME, IDB_STORE_RUN_STATE, IDB_STORE_STORYBOOKS, VAULT_COOKIE_NAME, VAULT_LS_KEY } from '../../../src/contracts/constants';
import { CORE_MATERIAL_IDS } from '../../../src/contracts/materials';
import { BADGE_ORDER, WARDROBE_ITEMS } from '../../../src/contracts/progression';
import type { VaultBackends, VaultPort, VaultState } from '../../../src/contracts/vault';
import { createVault } from '../../../src/vault';
import { decodeCookieValue, extractCookieValue } from '../../../src/vault/cookie';
import { defaultVaultState, parseVaultState } from '../../../src/vault/schema';
import { fakeCookie, fakeLocalStorage, makeBook, makePage, maxState, midState, putStateInCookie, rawDelete, rawGetRecord, rawPutRecord, rawStoreNames } from './helpers';

interface Env {
  ls: ReturnType<typeof fakeLocalStorage>;
  cookie: ReturnType<typeof fakeCookie>;
  idb: IDBFactory;
  clock: { t: number };
  backends: VaultBackends;
}

function makeEnv(start = 1000): Env {
  const ls = fakeLocalStorage();
  const cookie = fakeCookie();
  const idb = new IDBFactory();
  const clock = { t: start };
  return { ls, cookie, idb, clock, backends: { localStorage: ls, cookie, indexedDB: idb, now: () => clock.t } };
}

const lsState = (e: Env): VaultState | null => {
  const raw = e.ls.map.get(VAULT_LS_KEY);
  return raw ? (JSON.parse(raw) as VaultState) : null;
};
const cookieState = (e: Env): VaultState | null => decodeCookieValue(extractCookieValue(e.cookie.read()));

/** Seeds all three tiers with the given states (null = leave that tier empty). */
async function seed(e: Env, s: { ls?: VaultState; idb?: VaultState; cookie?: VaultState }): Promise<void> {
  if (s.ls) e.ls.setItem(VAULT_LS_KEY, JSON.stringify(s.ls));
  if (s.idb) await rawPutRecord(e.idb, { vault: s.idb, pages: { active: null, done: [] } });
  if (s.cookie) putStateInCookie(e.cookie, s.cookie);
}

describe('vault: defaults and fresh hydrate', () => {
  it('starts from the documented default state', () => {
    const v = createVault(makeEnv().backends);
    const s = v.get();
    expect(s).toEqual(defaultVaultState(0));
    expect(s.gems).toBe(0);
    expect(s.badges).toEqual([]);
    expect(s.unlockedMaterials).toEqual([...CORE_MATERIAL_IDS]);
    expect(Object.values(s.wardrobe).every((x) => x === false)).toBe(true);
    expect(Object.keys(s.wardrobe)).toHaveLength(WARDROBE_ITEMS.length);
    expect(s.audioLevel).toBe(2);
    expect(s.run).toBeNull();
    expect(s.stats).toEqual({ runsCompleted: 0, regionsAwakened: 0, pokes: 0 });
    expect(s.prologueSeen).toBe(false);
    expect(v.lastReport()).toBeNull();
  });

  it("reports 'fresh' and writes defaults to every tier when nothing is valid", async () => {
    const e = makeEnv(5000);
    const v = createVault(e.backends);
    const r = await v.hydrate();
    expect(r).toEqual({ source: 'fresh', healed: ['localStorage', 'indexedDB', 'cookie'] });
    expect(v.lastReport()).toEqual(r);
    expect(lsState(e)).toEqual(defaultVaultState(5000));
    expect(cookieState(e)).toEqual(defaultVaultState(5000));
    expect((await rawGetRecord(e.idb)).vault).toEqual(defaultVaultState(5000));
  });

  it('overwrites corrupt tiers while treating them as missing', async () => {
    const e = makeEnv();
    e.ls.setItem(VAULT_LS_KEY, '{not json');
    e.cookie.set('garbage');
    await rawPutRecord(e.idb, { vault: { v: 1, gems: 'many' } });
    const r = await createVault(e.backends).hydrate();
    expect(r.source).toBe('fresh');
    expect(r.healed).toEqual(['localStorage', 'indexedDB', 'cookie']);
    expect(lsState(e)).toEqual(defaultVaultState(1000));
  });
});

describe('vault: self-healing hydrate', () => {
  it('restores everything from the cookie after localStorage + IndexedDB are wiped', async () => {
    const e = makeEnv(1000);
    const a = createVault(e.backends);
    await a.hydrate();
    e.clock.t = 2000;
    a.update((d) => {
      d.gems = 123;
      d.badges = ['firstBloom', 'rainbowMaster'];
      d.unlockedMaterials = [...CORE_MATERIAL_IDS, 9, 12];
      d.wardrobeOwned = ['lumiCrown'];
      d.wardrobe.lumiCrown = true;
      d.audioLevel = 3;
      d.run = { seed: 99, chapterIndex: 1, path: ['rooftop', 'milkshakeNebula'], brushes: ['standard', 'zeroGGel'], relics: ['zoomiePaw'], phase: 'doors' };
      d.stats.runsCompleted = 4;
      d.stats.regionsAwakened = 77;
    });
    await a.flush();
    const expected = JSON.parse(JSON.stringify(a.get())) as VaultState;

    // wipe localStorage + IndexedDB (a new tab after "clear site data" minus cookies)
    e.ls.map.clear();
    expect(await rawDelete(e.idb)).toBe('deleted');

    const b = createVault(e.backends);
    const r = await b.hydrate();
    expect(r).toEqual({ source: 'cookie', healed: ['localStorage', 'indexedDB'] });
    expect(b.get()).toEqual(expected);
    expect(lsState(e)).toEqual(expected);
    expect((await rawGetRecord(e.idb)).vault).toEqual(expected);
  });

  it('regenerates a wiped cookie from primary storage on hydrate and on healCheck', async () => {
    const e = makeEnv(1000);
    const a = createVault(e.backends);
    await a.hydrate();
    a.update((d) => {
      d.gems = 8;
    });
    await a.flush();

    e.cookie.wipe();
    const b = createVault(e.backends);
    expect(await b.hydrate()).toEqual({ source: 'localStorage', healed: ['cookie'] });
    expect(cookieState(e)).toEqual(b.get());

    e.cookie.wipe();
    expect(cookieState(e)).toBeNull();
    b.healCheck();
    expect(cookieState(e)).toEqual(b.get());
    expect(e.cookie.raw()).toBeDefined();
  });

  it('healCheck regenerates a missing or invalid localStorage entry and leaves healthy tiers alone', () => {
    const e = makeEnv();
    const v = createVault(e.backends);
    v.update((d) => {
      d.gems = 3;
    });
    const setItem = vi.spyOn(e.ls, 'setItem');
    const write = vi.spyOn(e.cookie, 'write');
    v.healCheck();
    expect(setItem).not.toHaveBeenCalled();
    expect(write).not.toHaveBeenCalled();

    e.ls.map.delete(VAULT_LS_KEY);
    v.healCheck();
    expect(lsState(e)).toEqual(v.get());

    e.ls.map.set(VAULT_LS_KEY, '}{');
    v.healCheck();
    expect(lsState(e)).toEqual(v.get());
  });

  it('ignores a cookie whose checksum is corrupted (and heals it)', async () => {
    const e = makeEnv();
    const good = midState(500);
    await seed(e, { ls: good });
    putStateInCookie(e.cookie, midState(900)); // would win if it were trusted
    const raw = e.cookie.raw()!;
    e.cookie.set(raw.slice(0, -1) + (raw.endsWith('0') ? '1' : '0'));
    const v = createVault(e.backends);
    const r = await v.hydrate();
    expect(r.source).toBe('localStorage');
    expect(r.healed).toEqual(['indexedDB', 'cookie']);
    expect(v.get().updatedAt).toBe(500);
    expect(cookieState(e)).toEqual(good);
  });

  it('newest updatedAt wins across tiers and stale tiers are healed', async () => {
    for (const [winner, times] of [
      ['indexedDB', { ls: 100, idb: 300, cookie: 200 }],
      ['cookie', { ls: 100, idb: 200, cookie: 300 }],
      ['localStorage', { ls: 300, idb: 200, cookie: 100 }],
    ] as const) {
      const e = makeEnv();
      await seed(e, { ls: { ...midState(times.ls), gems: 1 }, idb: { ...midState(times.idb), gems: 2 }, cookie: { ...midState(times.cookie), gems: 3 } });
      const v = createVault(e.backends);
      const r = await v.hydrate();
      const gems = { localStorage: 1, indexedDB: 2, cookie: 3 }[winner];
      expect(r.source).toBe(winner);
      expect(v.get().gems).toBe(gems);
      expect(v.get().updatedAt).toBe(300);
      expect(r.healed).toEqual((['localStorage', 'indexedDB', 'cookie'] as const).filter((t) => t !== winner));
      expect(lsState(e)!.gems).toBe(gems);
      expect(cookieState(e)!.gems).toBe(gems);
      expect((await rawGetRecord(e.idb)).vault.gems).toBe(gems);
    }
  });

  it('ties prefer localStorage > indexedDB > cookie and heal nothing when all agree', async () => {
    const e = makeEnv();
    await seed(e, { ls: { ...midState(50), gems: 1 }, idb: { ...midState(50), gems: 2 }, cookie: { ...midState(50), gems: 3 } });
    const v = createVault(e.backends);
    expect(await v.hydrate()).toEqual({ source: 'localStorage', healed: [] });
    expect(v.get().gems).toBe(1);

    const e2 = makeEnv();
    await seed(e2, { idb: { ...midState(50), gems: 2 }, cookie: { ...midState(50), gems: 3 } });
    const v2 = createVault(e2.backends);
    expect(await v2.hydrate()).toEqual({ source: 'indexedDB', healed: ['localStorage'] });
    expect(v2.get().gems).toBe(2);
  });

  it('keeps the pokes counter when the lossy cookie wins', async () => {
    const e = makeEnv();
    await seed(e, { ls: { ...midState(100), stats: { runsCompleted: 1, regionsAwakened: 1, pokes: 55 } }, cookie: midState(200) });
    const v = createVault(e.backends);
    expect((await v.hydrate()).source).toBe('cookie');
    expect(v.get().stats.pokes).toBe(55);
  });

  it('restores the full max state from the cookie alone', async () => {
    const e = makeEnv();
    await seed(e, { cookie: maxState() });
    const v = createVault(e.backends);
    expect((await v.hydrate()).source).toBe('cookie');
    expect(v.get()).toEqual(maxState());
    expect(v.get().badges).toEqual([...BADGE_ORDER]);
  });
});

describe('vault: update, snapshots, debounce', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('mutates a draft copy, bumps updatedAt, writes localStorage + cookie synchronously', () => {
    const e = makeEnv(1000);
    const v = createVault(e.backends);
    const before = v.get();
    e.clock.t = 4242;
    v.update((d) => {
      d.gems += 5;
      d.badges.push('firstBloom');
      d.stats.pokes = 3;
    });
    expect(before.gems).toBe(0); // earlier snapshot untouched
    expect(v.get().gems).toBe(5);
    expect(v.get().updatedAt).toBe(4242);
    expect(lsState(e)).toEqual(v.get());
    expect(cookieState(e)!.gems).toBe(5);
    expect(cookieState(e)!.updatedAt).toBe(4242);
  });

  it('get() is a frozen readonly snapshot and is stable between updates', () => {
    const v = createVault(makeEnv().backends);
    const s = v.get();
    expect(Object.isFrozen(s)).toBe(true);
    expect(() => {
      (s as VaultState).gems = 99;
    }).toThrow();
    expect(() => {
      (s.badges as string[]).push('x');
    }).toThrow();
    expect(v.get()).toBe(s);
    v.update((d) => {
      d.gems = 1;
    });
    expect(v.get()).not.toBe(s);
    expect(s.gems).toBe(0);
  });

  it('leaves the vault untouched when the mutator throws or produces a corrupt state', () => {
    const e = makeEnv();
    const v = createVault(e.backends);
    v.update((d) => {
      d.gems = 10;
    });
    const t = v.get().updatedAt;
    expect(() =>
      v.update((d) => {
        d.gems = 999;
        throw new Error('boom');
      }),
    ).toThrow('boom');
    v.update((d) => {
      d.gems = Number.NaN;
    });
    v.update((d) => {
      (d.badges as string[]).push('notABadge');
    });
    expect(v.get().gems).toBe(10);
    expect(v.get().updatedAt).toBe(t);
  });

  it('mirrors to IndexedDB debounced by 250 ms and flush() forces the write', async () => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] });
    const e = makeEnv();
    const v = createVault(e.backends);
    v.update((d) => {
      d.gems = 1;
    });
    vi.advanceTimersByTime(200);
    v.update((d) => {
      d.gems = 2;
    }); // restarts the debounce window
    vi.advanceTimersByTime(200);
    expect(await rawStoreNames(e.idb)).toContain(IDB_STORE_RUN_STATE);
    expect(await rawGetRecord(e.idb)).toBeUndefined();
    vi.advanceTimersByTime(60);
    await v.flush();
    expect((await rawGetRecord(e.idb)).vault.gems).toBe(2);

    v.update((d) => {
      d.gems = 3;
    });
    await v.flush(); // no timer needed
    expect((await rawGetRecord(e.idb)).vault.gems).toBe(3);
  });

  it('coalesces a burst of updates into one IndexedDB write', async () => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] });
    const e = makeEnv();
    const v = createVault(e.backends);
    const open = vi.spyOn(e.idb, 'open');
    for (let i = 0; i < 20; i++)
      v.update((d) => {
        d.gems = i;
      });
    vi.advanceTimersByTime(250);
    await v.flush();
    expect(open).toHaveBeenCalledTimes(1);
    expect((await rawGetRecord(e.idb)).vault.gems).toBe(19);
  });
});

describe('vault: IndexedDB handle lifecycle', () => {
  it('an external deleteDatabase never hangs (versionchange closes) and later writes recreate the DB', async () => {
    const e = makeEnv();
    const v = createVault(e.backends);
    await v.hydrate(); // opens + caches a handle
    v.update((d) => {
      d.gems = 7;
    });
    await v.flush();
    expect((await rawGetRecord(e.idb)).vault.gems).toBe(7);

    expect(await rawDelete(e.idb)).toBe('deleted'); // not 'blocked', not 'timeout'

    v.update((d) => {
      d.gems = 8;
    });
    await v.flush();
    expect(await rawStoreNames(e.idb)).toEqual([IDB_STORE_RUN_STATE, IDB_STORE_STORYBOOKS].sort());
    expect((await rawGetRecord(e.idb)).vault.gems).toBe(8);

    // storybook APIs also reopen lazily after another delete
    expect(await rawDelete(e.idb)).toBe('deleted');
    await v.saveStorybook(makeBook('after-delete', 10));
    expect((await v.listStorybooks()).map((b) => b.id)).toEqual(['after-delete']);
  });

  it('creates the contract stores (keyPath id on storybooks, out-of-line keys on run_state)', async () => {
    const e = makeEnv();
    await createVault(e.backends).hydrate();
    const db: IDBDatabase = await new Promise((res) => {
      const r = e.idb.open(IDB_NAME);
      r.onsuccess = () => res(r.result);
    });
    expect(db.version).toBe(1);
    const tx = db.transaction([IDB_STORE_STORYBOOKS, IDB_STORE_RUN_STATE]);
    expect(tx.objectStore(IDB_STORE_STORYBOOKS).keyPath).toBe('id');
    expect(tx.objectStore(IDB_STORE_RUN_STATE).keyPath).toBeNull();
    db.close();
  });
});

describe('vault: run pages', () => {
  it('stores {active, done} snapshots natively and the vault mirror does not clobber them', async () => {
    const e = makeEnv();
    const v = createVault(e.backends);
    await v.hydrate();
    expect(await v.loadRunPages()).toEqual({ active: null, done: [] });
    const active = makePage(7);
    const done = [makePage(1), makePage(2)];
    await v.saveRunPages(active, done);

    const raw = await rawGetRecord(e.idb);
    expect(ArrayBuffer.isView(raw.pages.active.paintedMaskRle)).toBe(true); // native typed array, not base64
    expect(raw.vault).toBeDefined();

    v.update((d) => {
      d.gems = 11;
    });
    await v.flush();
    const back = await v.loadRunPages();
    expect(back.active).toEqual(active);
    expect(back.done).toEqual(done);
    expect(back.active!.regionMaterialId).toBeInstanceOf(Uint8Array);
    expect((await rawGetRecord(e.idb)).vault.gems).toBe(11);

    await v.saveRunPages(null, []);
    expect(await v.loadRunPages()).toEqual({ active: null, done: [] });
  });
});

describe('vault: storybooks', () => {
  it('saves, lists newest first, gets by id, and overwrites by id', async () => {
    const v = createVault(makeEnv().backends);
    await v.hydrate();
    expect(await v.listStorybooks()).toEqual([]);
    expect(await v.getStorybook('nope')).toBeUndefined();
    await v.saveStorybook(makeBook('old', 100, 1));
    await v.saveStorybook(makeBook('new', 300, 3));
    await v.saveStorybook(makeBook('mid', 200, 2));
    const list = await v.listStorybooks();
    expect(list.map((b) => b.id)).toEqual(['new', 'mid', 'old']);
    expect(list.map((b) => b.pageCount)).toEqual([3, 2, 1]);
    expect(list[0]).toEqual({ id: 'new', title: 'Book new', galaxyName: 'Galaxy new', createdAt: 300, pageCount: 3, seed: 300 });
    expect(Object.keys(list[0]!)).not.toContain('pages');

    const got = await v.getStorybook('mid');
    expect(got).toEqual(makeBook('mid', 200, 2));
    expect(got!.pages[0]!.paintedMaskRle).toBeInstanceOf(Uint8Array);

    await v.saveStorybook({ ...makeBook('old', 100, 1), title: 'Renamed' });
    expect((await v.listStorybooks()).find((b) => b.id === 'old')!.title).toBe('Renamed');
    expect(await v.listStorybooks()).toHaveLength(3);
    await expect(v.saveStorybook({ ...makeBook('', 1) })).rejects.toThrow();
  });

  it('persists across vault instances on the same IndexedDB', async () => {
    const e = makeEnv();
    await createVault(e.backends).saveStorybook(makeBook('keep', 5));
    expect((await createVault(e.backends).listStorybooks()).map((b) => b.id)).toEqual(['keep']);
  });

  it('listStorybooks() includes deterministic seed matching each saved Storybook.seed', async () => {
    const e = makeEnv();
    const v = createVault(e.backends);
    await v.hydrate();
    const books = [
      { ...makeBook('zero-seed', 100, 1), seed: 0 },
      { ...makeBook('cosmic-seed', 200, 2), seed: 0xdeadbeef },
      { ...makeBook('small-seed', 300, 3), seed: 42 },
    ];
    for (const bk of books) await v.saveStorybook(bk);

    const summaries = await v.listStorybooks();
    expect(summaries.map((s) => ({ id: s.id, seed: s.seed }))).toEqual([
      { id: 'small-seed', seed: 42 },
      { id: 'cosmic-seed', seed: 0xdeadbeef },
      { id: 'zero-seed', seed: 0 },
    ]);

    // Also verify after JSON export/import round-trip into a brand-new vault
    const exported = await v.exportJson();
    const v2 = createVault(makeEnv(2000).backends);
    await v2.hydrate();
    await v2.importJson(exported);
    const reSummaries = await v2.listStorybooks();
    expect(reSummaries.map((s) => ({ id: s.id, seed: s.seed }))).toEqual([
      { id: 'small-seed', seed: 42 },
      { id: 'cosmic-seed', seed: 0xdeadbeef },
      { id: 'zero-seed', seed: 0 },
    ]);
  });
});

describe('vault: optional prologueSeen persistence & backward compatibility', () => {
  it('round-trips prologueSeen across localStorage, IndexedDB, cookie heal, and JSON export/import', async () => {
    const e = makeEnv(1000);
    const v1 = createVault(e.backends);
    await v1.hydrate();
    expect(v1.get().prologueSeen).toBe(false);

    e.clock.t = 2000;
    v1.update((d) => {
      d.gems = 19;
      d.prologueSeen = true;
    });
    await v1.flush();

    expect(v1.get().prologueSeen).toBe(true);
    expect(lsState(e)?.prologueSeen).toBe(true);
    expect((await rawGetRecord(e.idb)).vault.prologueSeen).toBe(true);
    expect(cookieState(e)?.prologueSeen).toBe(true);

    // 1. Hydrate from localStorage preserves prologueSeen: true
    const fromLs = createVault(e.backends);
    expect((await fromLs.hydrate()).source).toBe('localStorage');
    expect(fromLs.get().prologueSeen).toBe(true);

    // 2. Wipe localStorage + cookie -> hydrate from IndexedDB restores prologueSeen: true and heals LS + cookie
    e.ls.map.clear();
    e.cookie.wipe();
    const fromIdb = createVault(e.backends);
    expect(await fromIdb.hydrate()).toEqual({ source: 'indexedDB', healed: ['localStorage', 'cookie'] });
    expect(fromIdb.get().prologueSeen).toBe(true);
    expect(lsState(e)?.prologueSeen).toBe(true);
    expect(cookieState(e)?.prologueSeen).toBe(true);

    // 3. Total localStorage + IndexedDB wipe -> hydrate from shadow cookie restores prologueSeen: true and heals both tiers
    e.ls.map.clear();
    expect(await rawDelete(e.idb)).toBe('deleted');
    const fromCookie = createVault(e.backends);
    expect(await fromCookie.hydrate()).toEqual({ source: 'cookie', healed: ['localStorage', 'indexedDB'] });
    expect(fromCookie.get().prologueSeen).toBe(true);
    expect(lsState(e)?.prologueSeen).toBe(true);
    expect((await rawGetRecord(e.idb)).vault.prologueSeen).toBe(true);

    // 4. JSON export/import preserves prologueSeen: true across all tiers
    const json = await fromCookie.exportJson();
    const dst = makeEnv(5000);
    const vDst = createVault(dst.backends);
    await vDst.hydrate();
    await vDst.importJson(json);
    expect(vDst.get().prologueSeen).toBe(true);
    expect(lsState(dst)?.prologueSeen).toBe(true);
    expect((await rawGetRecord(dst.idb)).vault.prologueSeen).toBe(true);
    expect(cookieState(dst)?.prologueSeen).toBe(true);
  });

  it('imports legacy v1 JSON exports without prologueSeen cleanly as prologueSeen: false and rejects non-boolean values', async () => {
    const src = makeEnv(1000);
    const vSrc = createVault(src.backends);
    await vSrc.hydrate();
    vSrc.update((d) => {
      d.gems = 64;
      d.prologueSeen = true;
    });
    const parsedExport = JSON.parse(await vSrc.exportJson()) as { vault: Record<string, unknown> };
    delete parsedExport.vault.prologueSeen;
    const legacyJson = JSON.stringify(parsedExport);

    // Strict parseVaultState accepts legacy v1 object lacking prologueSeen and defaults to false
    const parsedStrict = parseVaultState(parsedExport.vault, true);
    expect(parsedStrict).not.toBeNull();
    expect(parsedStrict!.prologueSeen).toBe(false);

    // Invalid types for prologueSeen are rejected in both strict and non-strict modes
    for (const badVal of ['true', 1, 0, null, {}, []]) {
      expect(parseVaultState({ ...parsedExport.vault, prologueSeen: badVal }, false)).toBeNull();
      expect(parseVaultState({ ...parsedExport.vault, prologueSeen: badVal }, true)).toBeNull();
    }

    // Legacy v1 JSON imports cleanly into a vault that previously had prologueSeen: true -> resets to false
    const dst = makeEnv(2000);
    const vDst = createVault(dst.backends);
    await vDst.hydrate();
    vDst.update((d) => {
      d.prologueSeen = true;
    });
    await vDst.importJson(legacyJson);
    expect(vDst.get().gems).toBe(64);
    expect(vDst.get().prologueSeen).toBe(false);

    // Malformed prologueSeen in JSON import is rejected without altering vault state
    const badJson = JSON.stringify({ ...parsedExport, vault: { ...parsedExport.vault, prologueSeen: 'yes' } });
    await expect(vDst.importJson(badJson)).rejects.toThrow(/vault data/);
    expect(vDst.get().gems).toBe(64);
    expect(vDst.get().prologueSeen).toBe(false);

    // Corrupt prologueSeen in update() is refused
    vDst.update((d) => {
      (d as unknown as { prologueSeen: unknown }).prologueSeen = 123;
    });
    expect(vDst.get().prologueSeen).toBe(false);
  });
});

describe('vault: JSON export / import', () => {
  it('exports the documented envelope with base64 typed arrays', async () => {
    const e = makeEnv(9000);
    const v = createVault(e.backends);
    await v.hydrate();
    await v.saveStorybook(makeBook('b1', 10, 1));
    const json = JSON.parse(await v.exportJson());
    expect(Object.keys(json).sort()).toEqual(['exportedAt', 'format', 'storybooks', 'vault', 'version']);
    expect(json.format).toBe('chroma-cosmos-vault');
    expect(json.version).toBe(1);
    expect(json.exportedAt).toBe(9000);
    expect(json.vault).toEqual(v.get());
    expect(typeof json.storybooks[0].pages[0].paintedMaskRle).toBe('string');
    expect(typeof json.storybooks[0].pages[0].regionMaterialId).toBe('string');
  });

  it('round-trips vault + storybooks (including typed arrays) into a fresh vault', async () => {
    const a = makeEnv(1000);
    const va = createVault(a.backends);
    await va.hydrate();
    a.clock.t = 2000;
    va.update((d) => Object.assign(d, maxState(0), { stats: { runsCompleted: 5, regionsAwakened: 6, pokes: 7 } }));
    await va.saveStorybook(makeBook('one', 100, 2));
    await va.saveStorybook(makeBook('two', 200, 3));
    const text = await va.exportJson();

    const b = makeEnv(5000);
    const vb = createVault(b.backends);
    await vb.hydrate();
    const report = await vb.importJson(text);
    expect(report.healed).toEqual(['localStorage', 'indexedDB', 'cookie']);
    expect(vb.lastReport()).toEqual(report);
    expect(vb.get()).toEqual({ ...va.get(), updatedAt: vb.get().updatedAt });
    expect(vb.get().updatedAt).toBeGreaterThan(5000 - 1);
    expect(await vb.getStorybook('one')).toEqual(makeBook('one', 100, 2));
    expect(await vb.getStorybook('two')).toEqual(makeBook('two', 200, 3));
    expect((await vb.getStorybook('two'))!.pages[1]!.regionMaterialId).toBeInstanceOf(Uint8Array);
    // every tier carries the imported vault
    expect(lsState(b)).toEqual(vb.get());
    expect((await rawGetRecord(b.idb)).vault).toEqual(vb.get());
    expect(cookieState(b)!.gems).toBe(vb.get().gems);
    // and a second export is stable
    const again = JSON.parse(await vb.exportJson());
    expect(again.storybooks).toEqual(JSON.parse(text).storybooks);
  });

  it('bumps updatedAt past the existing vault so the import wins on next hydrate; unions storybooks by id', async () => {
    const src = makeEnv(100);
    const vs = createVault(src.backends);
    await vs.saveStorybook({ ...makeBook('shared', 1), title: 'from import' });
    await vs.saveStorybook(makeBook('only-import', 2));
    vs.update((d) => {
      d.gems = 500;
    });
    const text = await vs.exportJson();

    const dst = makeEnv(9_999_999); // dst clock is far ahead
    const vd = createVault(dst.backends);
    await vd.hydrate();
    await vd.saveStorybook({ ...makeBook('shared', 1), title: 'local' });
    await vd.saveStorybook(makeBook('only-local', 3));
    const prev = vd.get().updatedAt;
    dst.clock.t = 10; // even a clock that went backwards must not lose
    await vd.importJson(text);
    expect(vd.get().gems).toBe(500);
    expect(vd.get().updatedAt).toBeGreaterThan(prev);
    expect((await vd.listStorybooks()).map((b) => b.id).sort()).toEqual(['only-import', 'only-local', 'shared']);
    expect((await vd.getStorybook('shared'))!.title).toBe('from import');
    const re = createVault(dst.backends);
    await re.hydrate();
    expect(re.get().gems).toBe(500);
  });

  it('rejects garbage, wrong format/version and malformed payloads without touching the vault', async () => {
    const e = makeEnv();
    const v = createVault(e.backends);
    await v.hydrate();
    v.update((d) => {
      d.gems = 21;
    });
    const good = JSON.parse(await v.exportJson());
    const bad: Array<[string, string, RegExp]> = [
      ['empty', '', /empty/i],
      ['not json', 'lol {', /JSON/],
      ['array', '[]', /vault file/],
      ['null', 'null', /vault file/],
      ['wrong format', JSON.stringify({ ...good, format: 'something-else' }), /vault file/],
      ['wrong version', JSON.stringify({ ...good, version: 2 }), /version/],
      ['missing vault', JSON.stringify({ ...good, vault: undefined }), /vault data/],
      ['bad vault', JSON.stringify({ ...good, vault: { ...good.vault, gems: -1 } }), /vault data/],
      ['partial vault', JSON.stringify({ ...good, vault: { v: 1, gems: 1 } }), /vault data/],
      ['unknown badge', JSON.stringify({ ...good, vault: { ...good.vault, badges: ['nope'] } }), /vault data/],
      ['storybooks not list', JSON.stringify({ ...good, storybooks: {} }), /storybooks/],
      ['book without id', JSON.stringify({ ...good, storybooks: [{ title: 't' }] }), /storybooks\[0\]/],
      ['bad base64', JSON.stringify({ ...good, storybooks: [{ id: 'x', title: 't', galaxyName: 'g', createdAt: 1, seed: 1, pages: [{ sceneId: 'rooftop', seed: 1, paintedMaskRle: '***', regionMaterialId: '', completedRegionIds: [] }] }] }), /base64/],
      ['bad scene', JSON.stringify({ ...good, storybooks: [{ id: 'x', title: 't', galaxyName: 'g', createdAt: 1, seed: 1, pages: [{ sceneId: 'mars', seed: 1, paintedMaskRle: '', regionMaterialId: '', completedRegionIds: [] }] }] }), /sceneId/],
    ];
    for (const [name, text, re] of bad) {
      await expect(v.importJson(text), name).rejects.toThrow(re);
    }
    await expect(v.importJson(undefined as unknown as string)).rejects.toThrow(Error);
    expect(v.get().gems).toBe(21);
    expect(await v.listStorybooks()).toEqual([]);
  });
});

describe('vault: never throws with broken backends', () => {
  const boom = (): never => {
    throw new Error('boom');
  };
  const brokenLs = { getItem: boom, setItem: boom, removeItem: boom };
  const brokenCookie = { read: boom, write: boom };
  const throwingFactory = { open: boom, deleteDatabase: boom, databases: boom, cmp: boom } as unknown as IDBFactory;
  const failingFactory = {
    open: () => {
      const req: Record<string, unknown> = { error: new Error('denied') };
      setTimeout(() => (req.onerror as (() => void) | undefined)?.(), 0);
      return req;
    },
  } as unknown as IDBFactory;
  const hangingFactory = { open: () => ({}) } as unknown as IDBFactory;
  const blockedFactory = {
    open: () => {
      const req: Record<string, unknown> = {};
      setTimeout(() => (req.onblocked as (() => void) | undefined)?.(), 0);
      return req;
    },
  } as unknown as IDBFactory;

  const cases: Array<[string, (e: Env) => Partial<VaultBackends>]> = [
    ['everything throws', () => ({ localStorage: brokenLs, cookie: brokenCookie, indexedDB: throwingFactory })],
    ['localStorage quota errors', (e) => ({ ...e.backends, localStorage: { getItem: () => null, setItem: boom, removeItem: boom } })],
    ['localStorage corrupt JSON', (e) => ({ ...e.backends, localStorage: { getItem: () => '{{{{', setItem: () => undefined, removeItem: () => undefined } })],
    ['localStorage wrong shape', (e) => ({ ...e.backends, localStorage: { getItem: () => '[1,2,3]', setItem: () => undefined, removeItem: () => undefined } })],
    ['cookie returns junk', (e) => ({ ...e.backends, cookie: { read: () => `${VAULT_COOKIE_NAME}=%%%.zz`, write: boom } })],
    ['indexedDB open throws', (e) => ({ ...e.backends, indexedDB: throwingFactory })],
    ['indexedDB open errors', (e) => ({ ...e.backends, indexedDB: failingFactory })],
    ['indexedDB open never answers', (e) => ({ ...e.backends, indexedDB: hangingFactory })],
    ['indexedDB blocked', (e) => ({ ...e.backends, indexedDB: blockedFactory })],
    ['no indexedDB at all', (e) => ({ ...e.backends, indexedDB: undefined })],
    ['corrupt run_state record', (e) => ({ ...e.backends, indexedDB: (() => { void rawPutRecord(e.idb, 'garbage'); return e.idb; })() })],
  ];

  for (const [name, mk] of cases) {
    it(`hydrate/update/healCheck/flush/pages/books do not throw: ${name}`, async () => {
      const e = makeEnv();
      const v: VaultPort = createVault(mk(e), { idbTimeoutMs: 40 });
      const r = await v.hydrate();
      expect(['fresh', 'localStorage', 'indexedDB', 'cookie']).toContain(r.source);
      expect(Array.isArray(r.healed)).toBe(true);
      expect(v.get().audioLevel).toBe(2);
      expect(() =>
        v.update((d) => {
          d.gems = 4;
        }),
      ).not.toThrow();
      expect(v.get().gems).toBe(4);
      expect(() => v.healCheck()).not.toThrow();
      await expect(v.flush()).resolves.toBeUndefined();
      await expect(v.saveRunPages(makePage(1), [])).resolves.toBeUndefined();
      await expect(v.loadRunPages()).resolves.toMatchObject({ done: expect.any(Array) });
      await expect(v.saveStorybook(makeBook('s', 1))).resolves.toBeUndefined();
      expect((await v.listStorybooks()).map((b) => b.id)).toEqual(['s']); // memory fallback keeps the session working
      expect((await v.getStorybook('s'))?.id).toBe('s');
      await expect(v.exportJson()).resolves.toContain('chroma-cosmos-vault');
      expect(v.lastReport()).not.toBeNull();
    }, 15_000);
  }

  it('hydrate does not report tiers it could not write as healed', async () => {
    const e = makeEnv();
    const v = createVault({ ...e.backends, localStorage: { getItem: () => null, setItem: boom, removeItem: boom }, cookie: brokenCookie, indexedDB: undefined });
    expect(await v.hydrate()).toEqual({ source: 'fresh', healed: [] });
  });
});

describe('vault: default backends (jsdom window + fake-indexeddb)', () => {
  beforeEach(() => {
    window.localStorage.clear();
    document.cookie = `${VAULT_COOKIE_NAME}=; max-age=0; path=/`;
  });

  it('use window.localStorage, document.cookie and the global indexedDB, and self-heal', async () => {
    const v = createVault();
    expect((await v.hydrate()).source).toBe('fresh');
    v.update((d) => {
      d.gems = 31;
      d.badges = ['lumiFriend'];
    });
    await v.flush();
    expect(JSON.parse(window.localStorage.getItem(VAULT_LS_KEY)!).gems).toBe(31);
    expect(document.cookie).toContain(`${VAULT_COOKIE_NAME}=`);

    // wipe localStorage + IndexedDB, keep the real cookie
    window.localStorage.clear();
    expect(await rawDelete(indexedDB)).toBe('deleted');
    const v2 = createVault();
    expect(await v2.hydrate()).toEqual({ source: 'cookie', healed: ['localStorage', 'indexedDB'] });
    expect(v2.get().gems).toBe(31);
    expect(v2.get().badges).toEqual(['lumiFriend']);

    // wipe the cookie, healCheck regenerates it
    document.cookie = `${VAULT_COOKIE_NAME}=; max-age=0; path=/`;
    expect(document.cookie).not.toContain(VAULT_COOKIE_NAME);
    v2.healCheck();
    expect(document.cookie).toContain(`${VAULT_COOKIE_NAME}=`);
    await v2.flush();
  });
});
