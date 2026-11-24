// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';
import { VAULT_COOKIE_ATTRS, VAULT_COOKIE_NAME } from '../../../src/contracts/constants';
import { WARDROBE_ITEMS } from '../../../src/contracts/progression';
import { base64ToBytes, base64UrlToText, bytesToBase64, fnv1a32Hex, textToBase64Url } from '../../../src/vault/codec';
import { buildCookieString, decodeCookieValue, encodeCookieValue, extractCookieValue, toCompactCookie } from '../../../src/vault/cookie';
import { BRUSH_ORDER, DRAFT_CARD_ORDER, RELIC_ORDER, defaultVaultState } from '../../../src/vault/schema';
import { FROZEN_SPRINT1_COOKIE_NO_P, FROZEN_SPRINT1_COOKIE_WITH_P, maxState, midState } from './helpers';

describe('codec', () => {
  it('fnv1a32 matches published test vectors', () => {
    expect(fnv1a32Hex('')).toBe('811c9dc5');
    expect(fnv1a32Hex('a')).toBe('e40c292c');
    expect(fnv1a32Hex('foobar')).toBe('bf9cf968');
  });

  it('base64 round-trips every length and rejects garbage', () => {
    for (let n = 0; n < 40; n++) {
      const bytes = Uint8Array.from({ length: n }, (_, i) => (i * 37 + n) & 0xff);
      const text = bytesToBase64(bytes);
      expect(text).toBe(Buffer.from(bytes).toString('base64'));
      expect(Array.from(base64ToBytes(text)!)).toEqual(Array.from(bytes));
    }
    expect(base64ToBytes('abc')).toBeNull();
    expect(base64ToBytes('ab$d')).toBeNull();
    expect(base64ToBytes('a===')).toBeNull();
  });

  it('base64url text handles unicode and rejects invalid alphabets', () => {
    const t = 'Violet ✨ Lumi';
    expect(base64UrlToText(textToBase64Url(t))).toBe(t);
    expect(textToBase64Url('??>>')).not.toMatch(/[+/=]/);
    expect(base64UrlToText('ab+/')).toBeNull();
    expect(base64UrlToText('a')).toBeNull();
  });
});

describe('shadow cookie codec', () => {
  it('has the contract shape: base64url(JSON) + "." + fnv1a32 hex of the body', () => {
    const v = encodeCookieValue(midState(1000));
    const [body, sum, ...rest] = v.split('.');
    expect(rest).toHaveLength(0);
    expect(body).toMatch(/^[A-Za-z0-9_-]+$/);
    expect(sum).toBe(fnv1a32Hex(body!));
    expect(JSON.parse(base64UrlToText(body!)!)).toEqual(toCompactCookie(midState(1000)));
  });

  it('writes with name=value; and the contract attrs', () => {
    const s = buildCookieString(defaultVaultState(5));
    expect(s.startsWith(`${VAULT_COOKIE_NAME}=`)).toBe(true);
    expect(s.endsWith(`; ${VAULT_COOKIE_ATTRS}`)).toBe(true);
  });

  it('stays under 1500 chars at max state and round-trips every field (17 materials, 14 wardrobe, 11 brushes, 10 relics, 20 cards)', () => {
    const max = maxState();
    const compact = toCompactCookie(max);
    expect(compact.m).toBe((1 << 17) - 1);
    expect(compact.o).toBe((1 << 14) - 1);
    expect(compact.w).toBe((1 << 14) - 1);
    expect(compact.d).toBe((1 << 20) - 1);
    expect(compact.p).toBe(1);
    expect(Array.isArray(compact.r) && compact.r[3]).toBe((1 << 11) - 1);
    expect(Array.isArray(compact.r) && compact.r[4]).toBe((1 << 10) - 1);

    const value = encodeCookieValue(max);
    expect(value.length).toBeLessThan(1500);
    expect(buildCookieString(max).length).toBeLessThan(1500);
    const back = decodeCookieValue(value)!;
    expect(back).toEqual(max); // pokes is 0 in maxState: the cookie does not carry it
    expect(back.badges).toHaveLength(8);
    expect(back.unlockedMaterials).toHaveLength(17);
    expect(back.wardrobeOwned).toHaveLength(14);
    expect(Object.keys(back.wardrobe)).toHaveLength(14);
    expect(Object.values(back.wardrobe).every((v) => v === true)).toBe(true);
    expect(back.discoveredCards).toHaveLength(20);
    expect(back.run!.brushes).toHaveLength(11);
    expect(back.run!.relics).toHaveLength(10);
    expect(back.run!.path).toHaveLength(5);
    expect(back.prologueSeen).toBe(true);
  });

  it('round-trips a mid state, default state, and a no-run state', () => {
    const mid = midState(777);
    expect(decodeCookieValue(encodeCookieValue(mid))).toEqual(mid);
    const def = defaultVaultState(9);
    expect(decodeCookieValue(encodeCookieValue(def))).toEqual(def);
    expect(def.audioLevel).toBe(2);
    expect(def.run).toBeNull();
  });

  it('extracts the value from a multi-cookie string and from a bare value', () => {
    const v = encodeCookieValue(midState(1));
    expect(extractCookieValue(`a=1; ${VAULT_COOKIE_NAME}=${v}; b=2`)).toBe(v);
    expect(extractCookieValue(v)).toBe(v);
    expect(extractCookieValue('a=1; b=2')).toBeNull();
    expect(extractCookieValue('')).toBeNull();
  });

  it('ignores a corrupted checksum, tampered body, bad base64 and bad schema', () => {
    const v = encodeCookieValue(midState(1000));
    const [body, sum] = v.split('.') as [string, string];
    const flipped = (sum[0] === '0' ? '1' : '0') + sum.slice(1);
    expect(decodeCookieValue(`${body}.${flipped}`)).toBeNull();
    const tampered = (body[5] === 'A' ? 'B' : 'A');
    expect(decodeCookieValue(`${body.slice(0, 5)}${tampered}${body.slice(6)}.${sum}`)).toBeNull();
    expect(decodeCookieValue(`${body}`)).toBeNull();
    expect(decodeCookieValue(`${body}.zzzzzzzz`)).toBeNull();
    expect(decodeCookieValue('!!!!.' + fnv1a32Hex('!!!!'))).toBeNull();
    expect(decodeCookieValue(null)).toBeNull();
    expect(decodeCookieValue('')).toBeNull();
    // correct checksum but invalid schema
    const signed = (obj: unknown): string => {
      const b = textToBase64Url(JSON.stringify(obj));
      return `${b}.${fnv1a32Hex(b)}`;
    };
    expect(decodeCookieValue(signed({ v: 2 }))).toBeNull();
    expect(decodeCookieValue(signed({ v: 1, g: 'lots' }))).toBeNull();
    expect(decodeCookieValue(signed({ v: 1, a: 9 }))).toBeNull();
    expect(decodeCookieValue(signed({ v: 1, r: [1, 2, 'Z', 0, 0, 0] }))).toBeNull(); // unknown chapter code
    expect(decodeCookieValue(signed({ v: 1, r: [1, 9, 'R', 0, 0, 0] }))).toBeNull(); // chapterIndex out of range
    expect(decodeCookieValue(signed('not an object'))).toBeNull();
    expect(decodeCookieValue(signed([1, 2, 3]))).toBeNull();
  });

  it('expands missing fields to defaults', () => {
    const b = textToBase64Url(JSON.stringify({ v: 1, g: 7 }));
    const s = decodeCookieValue(`${b}.${fnv1a32Hex(b)}`)!;
    expect(s).toEqual({ ...defaultVaultState(0), gems: 7 });
    expect(s.audioLevel).toBe(2);
    expect(s.unlockedMaterials).toEqual([1, 2, 3, 4, 5, 6, 7]);
    expect(s.prologueSeen).toBe(false);
  });

  it('persists optional prologueSeen via p flag while keeping legacy cookies backward compatible', () => {
    const unseen = midState(1000);
    expect(unseen.prologueSeen).toBe(false);
    expect('p' in toCompactCookie(unseen)).toBe(false);

    const seen = { ...maxState(1_800_000_000_000), prologueSeen: true };
    expect(toCompactCookie(seen).p).toBe(1);
    const encoded = encodeCookieValue(seen);
    expect(encoded.length).toBeLessThan(1500);
    expect(buildCookieString(seen).length).toBeLessThan(1500);
    expect(decodeCookieValue(encoded)).toEqual(seen);

    const signed = (obj: unknown): string => {
      const body = textToBase64Url(JSON.stringify(obj));
      return `${body}.${fnv1a32Hex(body)}`;
    };
    expect(decodeCookieValue(signed({ v: 1, g: 5, p: 0 }))?.prologueSeen).toBe(false);
    expect(decodeCookieValue(signed({ v: 1, g: 5, p: 1 }))?.prologueSeen).toBe(true);
    expect(decodeCookieValue(signed({ v: 1, g: 5, p: 2 }))).toBeNull();
    expect(decodeCookieValue(signed({ v: 1, g: 5, p: true }))).toBeNull();
    expect(decodeCookieValue(signed({ v: 1, g: 5, p: '1' }))).toBeNull();
  });

  it('persists optional discoveredCards via 20-bit d bitfield and omits d when empty', () => {
    const empty = defaultVaultState(1000);
    expect(empty.discoveredCards).toEqual([]);
    expect('d' in toCompactCookie(empty)).toBe(false);
    expect(decodeCookieValue(encodeCookieValue(empty))?.discoveredCards).toEqual([]);

    const withoutField = { ...empty };
    delete withoutField.discoveredCards;
    expect('d' in toCompactCookie(withoutField)).toBe(false);

    const selective = {
      ...defaultVaultState(2000),
      discoveredCards: [DRAFT_CARD_ORDER[0]!, DRAFT_CARD_ORDER[9]!, DRAFT_CARD_ORDER[10]!, DRAFT_CARD_ORDER[19]!],
    };
    const compact = toCompactCookie(selective);
    expect(compact.d).toBe((1 << 0) | (1 << 9) | (1 << 10) | (1 << 19));
    expect(decodeCookieValue(encodeCookieValue(selective))).toEqual(selective);

    const signed = (obj: unknown): string => {
      const body = textToBase64Url(JSON.stringify(obj));
      return `${body}.${fnv1a32Hex(body)}`;
    };
    expect(decodeCookieValue(signed({ v: 1, g: 5, d: 0 }))?.discoveredCards).toEqual([]);
    expect(decodeCookieValue(signed({ v: 1, g: 5, d: 1 }))?.discoveredCards).toEqual(['turboCheetah']);
    expect(decodeCookieValue(signed({ v: 1, g: 5, d: 1 << 19 }))?.discoveredCards).toEqual(['constellationCrown']);
    for (const badD of [-1, 1.5, '1', null, true, [], 0x8000_0000]) {
      expect(decodeCookieValue(signed({ v: 1, g: 5, d: badD }))).toBeNull();
    }
  });

  it('decodes frozen verbatim Sprint 1 cookies with zero data loss and preserves Sprint 1 bit indices', () => {
    // Verify Sprint 1 bit-index prefix preservation across all bitfield tables
    expect(WARDROBE_ITEMS.slice(0, 6).map((w) => w.id)).toEqual([
      'violetPins',
      'violetCape',
      'lumiWings',
      'lumiCrown',
      'novaBoosters',
      'novaScarf',
    ]);
    expect(BRUSH_ORDER.slice(0, 5)).toEqual(['standard', 'turboCheetah', 'twinTail', 'supernovaSponge', 'zeroGGel']);
    expect(RELIC_ORDER.slice(0, 4)).toEqual(['zoomiePaw', 'prismRibbon', 'uvFlashlight', 'kaleidoSharpener']);

    // Frozen Sprint 1 cookie with p=1 and no d field
    const migrated = decodeCookieValue(FROZEN_SPRINT1_COOKIE_WITH_P);
    expect(migrated).not.toBeNull();
    expect(migrated!.v).toBe(1);
    expect(migrated!.gems).toBe(185);
    expect(migrated!.badges).toEqual(['firstBloom', 'lumiFriend', 'rainbowMaster', 'firstRun']);
    expect(migrated!.unlockedMaterials).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 12]);
    expect(migrated!.wardrobeOwned).toEqual(['violetPins', 'violetCape', 'lumiCrown', 'novaScarf']);
    expect(migrated!.wardrobe).toEqual({
      violetPins: true,
      violetCape: false,
      lumiWings: false,
      lumiCrown: true,
      novaBoosters: false,
      novaScarf: true,
      violetHeadphones: false,
      violetMoonHoodie: false,
      violetSaturnHalo: false,
      violetPrismRibbons: false,
      lumiNebulaGarland: false,
      lumiCelestialSaddle: false,
      novaStarGoggles: false,
      novaGalaxyBowtie: false,
    });
    expect(migrated!.discoveredCards).toEqual([]);
    expect(migrated!.audioLevel).toBe(3);
    expect(migrated!.run).toEqual({
      seed: 987_654_321,
      chapterIndex: 3,
      path: ['rooftop', 'milkshakeNebula', 'saturnRings', 'whaleSea'],
      brushes: ['standard', 'turboCheetah', 'supernovaSponge', 'zeroGGel'],
      relics: ['zoomiePaw', 'uvFlashlight', 'kaleidoSharpener'],
      phase: 'doors',
    });
    expect(migrated!.stats).toEqual({ runsCompleted: 3, regionsAwakened: 142, pokes: 0 });
    expect(migrated!.prologueSeen).toBe(true);
    expect(migrated!.updatedAt).toBe(1_760_000_000_000);

    // Earlier Sprint 1 cookie with neither d nor p
    const early = decodeCookieValue(FROZEN_SPRINT1_COOKIE_NO_P);
    expect(early).not.toBeNull();
    expect(early!.gems).toBe(74);
    expect(early!.badges).toEqual(['firstBloom', 'lumiFriend']);
    expect(early!.unlockedMaterials).toEqual([1, 2, 3, 4, 5, 6, 7, 8]);
    expect(early!.wardrobeOwned).toEqual(['violetCape', 'novaBoosters']);
    expect(early!.wardrobe.novaBoosters).toBe(true);
    expect(early!.wardrobe.violetCape).toBe(false);
    expect(early!.wardrobe.violetHeadphones).toBe(false);
    expect(early!.discoveredCards).toEqual([]);
    expect(early!.audioLevel).toBe(1);
    expect(early!.run).toEqual({
      seed: 4242,
      chapterIndex: 1,
      path: ['rooftop', 'asteroidGarden'],
      brushes: ['standard', 'twinTail'],
      relics: ['prismRibbon'],
      phase: 'draft',
    });
    expect(early!.stats).toEqual({ runsCompleted: 1, regionsAwakened: 19, pokes: 0 });
    expect(early!.prologueSeen).toBe(false);
    expect(early!.updatedAt).toBe(1_750_000_000_000);
  });
});
