// @vitest-environment jsdom
import 'fake-indexeddb/auto';
import { beforeEach, describe, expect, it } from 'vitest';
import { createVault, decodeCookieValue, encodeCookieValue, extractCookieValue, COOKIE_MAX_CHARS } from '../../src/vault';
import { IDB_NAME, VAULT_COOKIE_NAME, VAULT_LS_KEY } from '../../src/contracts/constants';
import type { Storybook, VaultState } from '../../src/contracts';

function clearCookie(): void {
  document.cookie = `${VAULT_COOKIE_NAME}=; max-age=0; path=/`;
}

function deleteDbWithTimeout(timeoutMs = 1000): Promise<void> {
  return new Promise<void>((resolve, reject) => {
    let settled = false;
    const timer = setTimeout(() => {
      if (settled) return;
      settled = true;
      reject(new Error(`indexedDB.deleteDatabase('${IDB_NAME}') hung beyond ${timeoutMs}ms (blocked connection!)`));
    }, timeoutMs);

    const req = indexedDB.deleteDatabase(IDB_NAME);
    req.onsuccess = () => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      resolve();
    };
    req.onerror = () => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      reject(req.error ?? new Error('deleteDatabase failed'));
    };
    req.onblocked = () => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      reject(new Error('deleteDatabase was blocked by an unclosed IDB connection'));
    };
  });
}

describe('Red-Team Tri-Tier Vault Eviction & Self-Healing Matrix', () => {
  beforeEach(async () => {
    localStorage.clear();
    clearCookie();
    await deleteDbWithTimeout(1000);
  });

  it('restores full state from krunked-cookie-vault-v1 after localStorage + IndexedDB wipe and heals both tiers', async () => {
    let clock = 1_700_000_000_000;
    const v1 = createVault({ now: () => ++clock });
    await v1.hydrate();

    v1.update((d) => {
      d.gems = 147;
      d.badges = ['firstBloom', 'lumiFriend', 'causalityExplorer'];
      d.unlockedMaterials = [1, 2, 3, 4, 5, 6, 7, 8, 11];
      d.wardrobeOwned = ['violetPins', 'lumiWings', 'novaScarf'];
      d.wardrobe.violetPins = true;
      d.wardrobe.lumiWings = false;
      d.wardrobe.novaScarf = true;
      d.audioLevel = 2;
      d.run = {
        seed: 987654,
        chapterIndex: 2,
        path: ['rooftop', 'milkshakeNebula', 'saturnRings'],
        brushes: ['standard', 'turboCheetah', 'twinTail'],
        relics: ['zoomiePaw', 'uvFlashlight'],
        phase: 'draft',
      };
      d.stats.runsCompleted = 2;
      d.stats.regionsAwakened = 34;
    });
    await v1.flush();

    const rawCookie = extractCookieValue(document.cookie);
    expect(rawCookie).not.toBeNull();
    expect(rawCookie!.length).toBeLessThan(COOKIE_MAX_CHARS);

    // Catastrophic eviction: wipe localStorage AND delete IndexedDB completely.
    localStorage.clear();
    await deleteDbWithTimeout(1000);
    expect(localStorage.getItem(VAULT_LS_KEY)).toBeNull();

    // Fresh vault instance must hydrate from shadow cookie and heal both wiped tiers.
    const v2 = createVault({ now: () => ++clock });
    const report = await v2.hydrate();

    expect(report.source).toBe('cookie');
    expect(report.healed).toContain('localStorage');
    expect(report.healed).toContain('indexedDB');

    const restored = v2.get();
    expect(restored.gems).toBe(147);
    expect(restored.badges).toEqual(['firstBloom', 'lumiFriend', 'causalityExplorer']);
    expect(restored.unlockedMaterials).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 11]);
    expect(restored.wardrobeOwned).toEqual(['violetPins', 'lumiWings', 'novaScarf']);
    expect(restored.wardrobe.violetPins).toBe(true);
    expect(restored.wardrobe.lumiWings).toBe(false);
    expect(restored.wardrobe.novaScarf).toBe(true);
    expect(restored.audioLevel).toBe(2);
    expect(restored.run).toEqual({
      seed: 987654,
      chapterIndex: 2,
      path: ['rooftop', 'milkshakeNebula', 'saturnRings'],
      brushes: ['standard', 'turboCheetah', 'twinTail'],
      relics: ['zoomiePaw', 'uvFlashlight'],
      phase: 'draft',
    });
    expect(restored.stats.runsCompleted).toBe(2);
    expect(restored.stats.regionsAwakened).toBe(34);

    // Confirm localStorage was actually written back.
    expect(localStorage.getItem(VAULT_LS_KEY)).not.toBeNull();
  });

  it('regenerates a valid signed shadow cookie after cookie wipe via healCheck() and hydrate()', async () => {
    let clock = 1_700_000_100_000;
    const vault = createVault({ now: () => ++clock });
    await vault.hydrate();

    vault.update((d) => {
      d.gems = 88;
      d.badges = ['firstBloom', 'novaFriend'];
    });
    await vault.flush();

    // Wipe cookie and verify healCheck() immediately regenerates it.
    clearCookie();
    expect(extractCookieValue(document.cookie)).toBeNull();

    vault.healCheck();
    const afterHeal = extractCookieValue(document.cookie);
    expect(afterHeal).not.toBeNull();
    expect(decodeCookieValue(afterHeal)?.gems).toBe(88);

    // Wipe cookie again and verify a fresh vault's hydrate() heals cookie from primary storage.
    clearCookie();
    expect(extractCookieValue(document.cookie)).toBeNull();

    const freshVault = createVault({ now: () => ++clock });
    const report = await freshVault.hydrate();
    expect(report.source).toBe('localStorage');
    expect(report.healed).toContain('cookie');

    const afterHydrate = extractCookieValue(document.cookie);
    expect(afterHydrate).not.toBeNull();
    const decoded = decodeCookieValue(afterHydrate);
    expect(decoded?.gems).toBe(88);
    expect(decoded?.badges).toEqual(['firstBloom', 'novaFriend']);
  });

  it('ignores corrupted cookie checksum/signature gracefully and picks newest valid updatedAt across tiers', async () => {
    let clock = 1_700_000_200_000;
    const v1 = createVault({ now: () => ++clock });
    await v1.hydrate();

    // Write valid baseline (t1) across all 3 tiers.
    v1.update((d) => {
      d.gems = 42;
    });
    await v1.flush();
    const validState = v1.get();

    // Tamper with the cookie's FNV-1a hex checksum (last 8 chars).
    const goodVal = encodeCookieValue(validState);
    const dot = goodVal.lastIndexOf('.');
    const badHex = goodVal.slice(dot + 1) === '00000000' ? 'ffffffff' : '00000000';
    const tamperedChecksum = `${goodVal.slice(0, dot)}.${badHex}`;
    expect(decodeCookieValue(tamperedChecksum)).toBeNull();

    // Also test tampered payload with original checksum.
    const tamperedBody = `A${goodVal.slice(1)}`;
    expect(decodeCookieValue(tamperedBody)).toBeNull();

    document.cookie = `${VAULT_COOKIE_NAME}=${tamperedChecksum}; path=/`;

    // Vault ignores corrupt cookie and heals it from localStorage.
    const v2 = createVault({ now: () => ++clock });
    const rep2 = await v2.hydrate();
    expect(rep2.source).toBe('localStorage');
    expect(rep2.healed).toContain('cookie');
    expect(v2.get().gems).toBe(42);

    // Now simulate newest valid updatedAt in cookie beating stale localStorage + stale IndexedDB.
    const newerState: VaultState = {
      ...v2.get(),
      gems: 333,
      badges: ['firstBloom', 'rainbowMaster'],
      unlockedMaterials: [...v2.get().unlockedMaterials],
      wardrobeOwned: [...v2.get().wardrobeOwned],
      wardrobe: { ...v2.get().wardrobe },
      stats: { ...v2.get().stats },
      updatedAt: validState.updatedAt + 50_000,
    };
    document.cookie = `${VAULT_COOKIE_NAME}=${encodeCookieValue(newerState)}; path=/`;

    const v3 = createVault({ now: () => ++clock });
    const rep3 = await v3.hydrate();
    expect(rep3.source).toBe('cookie');
    expect(rep3.healed).toEqual(expect.arrayContaining(['localStorage', 'indexedDB']));
    expect(v3.get().gems).toBe(333);
    expect(v3.get().badges).toEqual(['firstBloom', 'rainbowMaster']);

    // Now simulate newest valid updatedAt in IndexedDB beating stale localStorage + stale cookie.
    const staleForLsCookie: VaultState = {
      ...newerState,
      gems: 11,
      updatedAt: validState.updatedAt + 10,
    };
    localStorage.setItem(VAULT_LS_KEY, JSON.stringify(staleForLsCookie));
    document.cookie = `${VAULT_COOKIE_NAME}=${encodeCookieValue(staleForLsCookie)}; path=/`;

    const v4 = createVault({ now: () => ++clock });
    const rep4 = await v4.hydrate();
    expect(rep4.source).toBe('indexedDB');
    expect(rep4.healed).toEqual(expect.arrayContaining(['localStorage', 'cookie']));
    expect(v4.get().gems).toBe(333);
  });

  it('closes open IDB handle cleanly on external deleteDatabase() without hanging and recreates stores on subsequent writes', async () => {
    let clock = 1_700_000_300_000;
    const vault = createVault({ now: () => ++clock });
    await vault.hydrate();

    // Force an active open IDB connection via storybook save + vault flush.
    const book1: Storybook = {
      id: 'book-pre-wipe',
      title: 'Pre-Wipe Galaxy',
      galaxyName: 'Pre-Wipe Galaxy',
      createdAt: clock,
      seed: 123,
      pages: [],
    };
    await vault.saveStorybook(book1);
    vault.update((d) => {
      d.gems = 55;
    });
    await vault.flush();
    expect((await vault.listStorybooks()).map((b) => b.id)).toContain('book-pre-wipe');

    // External deleteDatabase while vault holds the open IDBDatabase must NOT hang or block!
    await expect(deleteDbWithTimeout(1000)).resolves.toBeUndefined();

    // Subsequent writes must transparently reopen, recreate object stores, and persist cleanly.
    vault.update((d) => {
      d.gems = 99;
    });
    await vault.flush();

    const book2: Storybook = {
      id: 'book-post-wipe',
      title: 'Reborn Cosmos',
      galaxyName: 'Reborn Cosmos',
      createdAt: clock + 100,
      seed: 456,
      pages: [],
    };
    await vault.saveStorybook(book2);
    const listed = await vault.listStorybooks();
    expect(listed.map((b) => b.id)).toEqual(['book-post-wipe']);

    // Verify a brand-new vault instance reads the recreated IDB cleanly even without LS/cookie.
    localStorage.clear();
    clearCookie();
    const verifier = createVault({ now: () => ++clock });
    const rep = await verifier.hydrate();
    expect(rep.source).toBe('indexedDB');
    expect(verifier.get().gems).toBe(99);
    expect((await verifier.listStorybooks()).map((b) => b.id)).toEqual(['book-post-wipe']);
  });
});
