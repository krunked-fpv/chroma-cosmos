// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';
import { VAULT_COOKIE_ATTRS, VAULT_COOKIE_NAME } from '../../../src/contracts/constants';
import { base64ToBytes, base64UrlToText, bytesToBase64, fnv1a32Hex, textToBase64Url } from '../../../src/vault/codec';
import { buildCookieString, decodeCookieValue, encodeCookieValue, extractCookieValue, toCompactCookie } from '../../../src/vault/cookie';
import { defaultVaultState } from '../../../src/vault/schema';
import { maxState, midState } from './helpers';

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

  it('stays under 1500 chars at max state and round-trips every field', () => {
    const max = maxState();
    const value = encodeCookieValue(max);
    expect(value.length).toBeLessThan(1500);
    expect(buildCookieString(max).length).toBeLessThan(1500);
    const back = decodeCookieValue(value)!;
    expect(back).toEqual(max); // pokes is 0 in maxState: the cookie does not carry it
    expect(back.badges).toHaveLength(8);
    expect(back.unlockedMaterials).toHaveLength(12);
    expect(back.wardrobeOwned).toHaveLength(6);
    expect(back.run!.path).toHaveLength(5);
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
  });
});
