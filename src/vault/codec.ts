/** Dependency-free binary/text codecs used by the vault (works in browsers, jsdom and node). */

const STD = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
const URL_SAFE = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_';

function encode(bytes: Uint8Array, alphabet: string, pad: boolean): string {
  let out = '';
  let i = 0;
  for (; i + 2 < bytes.length; i += 3) {
    const n = (bytes[i]! << 16) | (bytes[i + 1]! << 8) | bytes[i + 2]!;
    out += alphabet[(n >> 18) & 63]! + alphabet[(n >> 12) & 63]! + alphabet[(n >> 6) & 63]! + alphabet[n & 63]!;
  }
  const rest = bytes.length - i;
  if (rest === 1) {
    const n = bytes[i]! << 16;
    out += alphabet[(n >> 18) & 63]! + alphabet[(n >> 12) & 63]! + (pad ? '==' : '');
  } else if (rest === 2) {
    const n = (bytes[i]! << 16) | (bytes[i + 1]! << 8);
    out += alphabet[(n >> 18) & 63]! + alphabet[(n >> 12) & 63]! + alphabet[(n >> 6) & 63]! + (pad ? '=' : '');
  }
  return out;
}

function decode(input: string, alphabet: string, pad: boolean): Uint8Array | null {
  let body = input;
  if (pad) {
    if (body.length % 4 !== 0) return null;
    const m = /=*$/.exec(body);
    const padLen = m ? m[0].length : 0;
    if (padLen > 2) return null;
    body = body.slice(0, body.length - padLen);
  } else if (body.length % 4 === 1) {
    return null;
  }
  const lookup = new Map<string, number>();
  for (let i = 0; i < alphabet.length; i++) lookup.set(alphabet[i]!, i);
  const out = new Uint8Array(Math.floor((body.length * 6) / 8));
  let acc = 0;
  let bits = 0;
  let o = 0;
  for (let i = 0; i < body.length; i++) {
    const v = lookup.get(body[i]!);
    if (v === undefined) return null;
    acc = ((acc << 6) | v) & 0xffffff;
    bits += 6;
    if (bits >= 8) {
      bits -= 8;
      out[o++] = (acc >> bits) & 0xff;
    }
  }
  return out;
}

export function bytesToBase64(bytes: Uint8Array): string {
  return encode(bytes, STD, true);
}

/** Strict standard base64 (with padding); returns null on any invalid input. */
export function base64ToBytes(text: string): Uint8Array | null {
  return decode(text, STD, true);
}

export function bytesToBase64Url(bytes: Uint8Array): string {
  return encode(bytes, URL_SAFE, false);
}

/** Strict unpadded base64url; returns null on any invalid input. */
export function base64UrlToBytes(text: string): Uint8Array | null {
  return decode(text, URL_SAFE, false);
}

export function textToBase64Url(text: string): string {
  return bytesToBase64Url(new TextEncoder().encode(text));
}

export function base64UrlToText(body: string): string | null {
  const bytes = base64UrlToBytes(body);
  if (!bytes) return null;
  try {
    return new TextDecoder('utf-8', { fatal: true }).decode(bytes);
  } catch {
    return null;
  }
}

/** 32-bit FNV-1a over UTF-16 code units, as 8 lowercase hex chars. */
export function fnv1a32Hex(text: string): string {
  let h = 0x811c9dc5;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return (h >>> 0).toString(16).padStart(8, '0');
}
