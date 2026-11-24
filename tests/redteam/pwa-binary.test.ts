import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { BG_HEX, CACHE_VERSION } from '../../src/contracts/constants';

const ROOT = resolve(process.cwd());
const PUBLIC_DIR = resolve(ROOT, 'public');

const PNG_MAGIC = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a] as const;

const CRC_TABLE = (() => {
  const tbl = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) {
      c = (c & 1) !== 0 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    }
    tbl[n] = c >>> 0;
  }
  return tbl;
})();

function crc32(buf: Uint8Array): number {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) {
    c = CRC_TABLE[(c ^ buf[i]!) & 0xff]! ^ (c >>> 8);
  }
  return (c ^ 0xffffffff) >>> 0;
}

function inspectPng(filePath: string) {
  const bytes = new Uint8Array(readFileSync(filePath));
  expect(bytes.length).toBeGreaterThan(33);

  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const magic = Array.from(bytes.subarray(0, 8));
  const ihdrLen = view.getUint32(8, false);
  const ihdrType = String.fromCharCode(bytes[12]!, bytes[13]!, bytes[14]!, bytes[15]!);
  const width = view.getUint32(16, false);
  const height = view.getUint32(20, false);
  const bitDepth = bytes[24]!;
  const colorType = bytes[25]!;
  const compression = bytes[26]!;
  const filter = bytes[27]!;
  const interlace = bytes[28]!;
  const ihdrCrcStored = view.getUint32(29, false);
  const ihdrCrcComputed = crc32(bytes.subarray(12, 29));

  // Walk chunks to verify IDAT and IEND exist cleanly.
  const chunkTypes: string[] = [];
  let offset = 8;
  while (offset + 12 <= bytes.length) {
    const len = view.getUint32(offset, false);
    const type = String.fromCharCode(
      bytes[offset + 4]!,
      bytes[offset + 5]!,
      bytes[offset + 6]!,
      bytes[offset + 7]!,
    );
    chunkTypes.push(type);
    offset += 12 + len;
    if (type === 'IEND') break;
  }

  return {
    magic,
    ihdrLen,
    ihdrType,
    width,
    height,
    bitDepth,
    colorType,
    compression,
    filter,
    interlace,
    ihdrCrcStored,
    ihdrCrcComputed,
    chunkTypes,
    totalBytes: bytes.length,
  };
}

describe('Red-Team PWA Binary, Manifest & Service Worker Verification', () => {
  const expectedIcons = [
    { file: 'icon-192.png', size: 192 },
    { file: 'icon-512.png', size: 512 },
    { file: 'apple-touch-icon.png', size: 180 },
  ] as const;

  for (const { file, size } of expectedIcons) {
    it(`verifies binary PNG magic, valid RGBA IHDR (${size}x${size}), CRC32, IDAT, and IEND for public/${file}`, () => {
      const info = inspectPng(resolve(PUBLIC_DIR, file));
      expect(info.magic).toEqual(Array.from(PNG_MAGIC));
      expect(info.ihdrLen).toBe(13);
      expect(info.ihdrType).toBe('IHDR');
      expect(info.width).toBe(size);
      expect(info.height).toBe(size);
      expect(info.bitDepth).toBe(8);
      expect(info.colorType).toBe(6); // RGBA
      expect(info.compression).toBe(0);
      expect(info.filter).toBe(0);
      expect(info.interlace).toBe(0);
      expect(info.ihdrCrcStored).toBe(info.ihdrCrcComputed);
      expect(info.chunkTypes).toContain('IDAT');
      expect(info.chunkTypes[info.chunkTypes.length - 1]).toBe('IEND');
    });
  }

  it('verifies public/manifest.json enforces standalone landscape subpath-safe PWA fields', () => {
    const raw = readFileSync(resolve(PUBLIC_DIR, 'manifest.json'), 'utf8');
    const manifest = JSON.parse(raw) as {
      display: string;
      orientation: string;
      start_url: string;
      scope: string;
      background_color: string;
      theme_color: string;
      icons: Array<{ src: string; sizes: string; type: string; purpose?: string }>;
    };

    expect(manifest.display).toBe('standalone');
    expect(manifest.orientation).toBe('landscape');
    expect(manifest.start_url).toBe('./');
    expect(manifest.scope).toBe('./');
    expect(manifest.background_color.toLowerCase()).toBe(BG_HEX.toLowerCase());
    expect(manifest.theme_color.toLowerCase()).toBe(BG_HEX.toLowerCase());
    expect(Array.isArray(manifest.icons)).toBe(true);
    expect(manifest.icons.length).toBeGreaterThanOrEqual(3);

    for (const icon of manifest.icons) {
      expect(icon.src.startsWith('./')).toBe(true);
      expect(icon.src.startsWith('/')).toBe(false);
      expect(icon.type).toBe('image/png');
    }

    const iconMap = new Map(manifest.icons.map((ic) => [ic.src, ic.sizes]));
    expect(iconMap.get('./icon-192.png')).toBe('192x192');
    expect(iconMap.get('./icon-512.png')).toBe('512x512');
    expect(iconMap.get('./apple-touch-icon.png')).toBe('180x180');
  });

  it('verifies public/sw.js matches CACHE_VERSION, uses network-first fetch, and cleans stale caches on activate', () => {
    const sw = readFileSync(resolve(PUBLIC_DIR, 'sw.js'), 'utf8');

    expect(sw).toMatch(new RegExp(`CACHE_VERSION\\s*=\\s*['"]${CACHE_VERSION}['"]`));
    expect(sw).toMatch(/addEventListener\(\s*['"]install['"]/);
    expect(sw).toMatch(/addEventListener\(\s*['"]activate['"]/);
    expect(sw).toMatch(/addEventListener\(\s*['"]fetch['"]/);

    // Network-first: fetch(event.request) attempted before caches.match fallback inside the fetch handler.
    const fetchListenerIdx = sw.search(/addEventListener\(\s*['"]fetch['"]/);
    expect(fetchListenerIdx).toBeGreaterThan(-1);
    const fetchBody = sw.slice(fetchListenerIdx);
    const networkFetchPos = fetchBody.indexOf('fetch(event.request)');
    const cacheFallbackPos = fetchBody.indexOf('caches.match(');
    expect(networkFetchPos).toBeGreaterThan(-1);
    expect(cacheFallbackPos).toBeGreaterThan(networkFetchPos);

    // Activate cleans stale chroma-cosmos-* caches.
    const activateIdx = sw.search(/addEventListener\(\s*['"]activate['"]/);
    const activateBody = sw.slice(activateIdx, fetchListenerIdx);
    expect(activateBody).toContain('caches.keys()');
    expect(activateBody).toContain('caches.delete(');
    expect(activateBody).toContain('CACHE_VERSION');
    expect(activateBody).toContain('clients.claim()');
  });
});
