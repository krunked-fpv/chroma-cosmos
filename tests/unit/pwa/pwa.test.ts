import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { execFileSync } from 'node:child_process';
import { CACHE_VERSION } from '../../../src/contracts/constants';

function computeCrc32(buf: Uint8Array): number {
  const crcTable = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) {
      if (c & 1) {
        c = 0xedb88320 ^ (c >>> 1);
      } else {
        c = c >>> 1;
      }
    }
    crcTable[n] = c;
  }

  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) {
    const val = buf[i] ?? 0;
    c = (crcTable[(c ^ val) & 0xff] ?? 0) ^ (c >>> 8);
  }
  return (c ^ 0xffffffff) >>> 0;
}

function parseAndValidatePng(filePath: string, expectedWidth: number, expectedHeight: number) {
  const buf = fs.readFileSync(filePath);
  const signature = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
  for (let i = 0; i < 8; i++) {
    expect(buf[i]).toBe(signature[i]);
  }

  let offset = 8;
  let ihdrValidated = false;
  let iendFound = false;

  while (offset < buf.length) {
    const length = buf.readUInt32BE(offset);
    const typeStr = buf.toString('ascii', offset + 4, offset + 8);
    const chunkData = buf.subarray(offset + 8, offset + 8 + length);
    const expectedCrc = buf.readUInt32BE(offset + 8 + length);

    const crcPayload = buf.subarray(offset + 4, offset + 8 + length);
    const calculatedCrc = computeCrc32(crcPayload);
    expect(calculatedCrc).toBe(expectedCrc);

    if (typeStr === 'IHDR') {
      ihdrValidated = true;
      const width = chunkData.readUInt32BE(0);
      const height = chunkData.readUInt32BE(4);
      const bitDepth = chunkData.readUInt8(8);
      const colourType = chunkData.readUInt8(9);

      expect(width).toBe(expectedWidth);
      expect(height).toBe(expectedHeight);
      expect(bitDepth).toBe(8);
      expect(colourType).toBe(6);
    }

    offset += 12 + length;
    if (typeStr === 'IEND') {
      iendFound = true;
      break;
    }
  }

  expect(ihdrValidated).toBe(true);
  expect(iendFound).toBe(true);
}

function getDirectorySize(dirPath: string): number {
  let total = 0;
  const entries = fs.readdirSync(dirPath, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dirPath, entry.name);
    if (entry.isDirectory()) {
      total += getDirectorySize(fullPath);
    } else if (entry.isFile()) {
      total += fs.statSync(fullPath).size;
    }
  }
  return total;
}

describe('PWA & Pages CI Verification', () => {
  const rootDir = path.resolve(__dirname, '../../..');
  const publicDir = path.join(rootDir, 'public');

  describe('Raster PNG Icons', () => {
    it('validates icon-192.png magic bytes, IHDR 192x192, colour type 6, bit depth 8, and valid chunk CRCs', () => {
      const iconPath = path.join(publicDir, 'icon-192.png');
      parseAndValidatePng(iconPath, 192, 192);
    });

    it('validates icon-512.png magic bytes, IHDR 512x512, colour type 6, bit depth 8, and valid chunk CRCs', () => {
      const iconPath = path.join(publicDir, 'icon-512.png');
      parseAndValidatePng(iconPath, 512, 512);
    });

    it('validates apple-touch-icon.png magic bytes, IHDR 180x180, colour type 6, bit depth 8, and valid chunk CRCs', () => {
      const iconPath = path.join(publicDir, 'apple-touch-icon.png');
      parseAndValidatePng(iconPath, 180, 180);
    });

    it('running the generator into an os.tmpdir() directory yields byte-identical files to public/', () => {
      const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'pwa-icon-test-'));
      try {
        const generatorScript = path.join(rootDir, 'scripts/generate-pwa-icons.mjs');
        execFileSync(process.execPath, [generatorScript, tmpDir], { stdio: 'pipe' });

        const iconFiles = ['icon-192.png', 'icon-512.png', 'apple-touch-icon.png'];
        for (const file of iconFiles) {
          const generatedBuf = fs.readFileSync(path.join(tmpDir, file));
          const committedBuf = fs.readFileSync(path.join(publicDir, file));
          expect(generatedBuf.equals(committedBuf)).toBe(true);
        }
      } finally {
        fs.rmSync(tmpDir, { recursive: true, force: true });
      }
    });
  });

  describe('Web App Manifest', () => {
    it('parses manifest.json and matches all required contract fields exactly', () => {
      const manifestPath = path.join(publicDir, 'manifest.json');
      const manifestRaw = fs.readFileSync(manifestPath, 'utf-8');
      const manifest = JSON.parse(manifestRaw);

      expect(manifest.name).toBe("Chroma Cosmos: Violet's Living Sketchbook");
      expect(manifest.short_name).toBe('Chroma Cosmos');
      expect(manifest.description).toBe(
        'Interactive Hi-Bit Cosmic Coloring Book Roguelike starring Violet, Lumi & Nova'
      );
      expect(manifest.display).toBe('standalone');
      expect(manifest.orientation).toBe('landscape');
      expect(manifest.background_color).toBe('#120d2b');
      expect(manifest.theme_color).toBe('#120d2b');
      expect(manifest.start_url).toBe('./');
      expect(manifest.scope).toBe('./');

      expect(manifest.icons).toEqual([
        {
          src: './icon-192.png',
          sizes: '192x192',
          type: 'image/png',
          purpose: 'any maskable',
        },
        {
          src: './icon-512.png',
          sizes: '512x512',
          type: 'image/png',
          purpose: 'any maskable',
        },
        {
          src: './apple-touch-icon.png',
          sizes: '180x180',
          type: 'image/png',
          purpose: 'any maskable',
        },
      ]);
    });
  });

  describe('Service Worker (public/sw.js)', () => {
    it('verifies sw.js contains required lifecycle handlers, network-first pattern, and contract constants', () => {
      const swPath = path.join(publicDir, 'sw.js');
      const swContent = fs.readFileSync(swPath, 'utf-8');

      // Exact CACHE_VERSION equality with contracts constant
      expect(swContent).toContain(`const CACHE_VERSION = '${CACHE_VERSION}';`);
      expect(CACHE_VERSION).toBe('chroma-cosmos-v1');

      // Fetch event listener
      expect(swContent).toContain("addEventListener('fetch'");

      // Network-first structure: fetch preceding cache fallback
      expect(swContent).toMatch(/fetch\(event\.request\)/);
      expect(swContent).toMatch(/caches\.match\(event\.request\)/);
      const fetchIndex = swContent.indexOf('fetch(event.request)');
      const cacheIndex = swContent.indexOf('caches.match(event.request)');
      expect(fetchIndex).toBeGreaterThan(-1);
      expect(cacheIndex).toBeGreaterThan(fetchIndex);

      // Navigation fallback to cached ./index.html
      expect(swContent).toContain("event.request.mode === 'navigate'");
      expect(swContent).toContain("caches.match('./index.html')");

      // Activate listener deleting stale caches
      expect(swContent).toContain("addEventListener('activate'");
      expect(swContent).toContain('chroma-cosmos-');
      expect(swContent).toContain('caches.delete');
    });
  });

  describe('GitHub Pages Deployment Workflow', () => {
    it('contains node-version 22, upload-pages-artifact, deploy-pages, and pages: write permission', () => {
      const workflowPath = path.join(rootDir, '.github/workflows/deploy-pages.yml');
      const workflowContent = fs.readFileSync(workflowPath, 'utf-8');

      expect(workflowContent).toContain('node-version: 22');
      expect(workflowContent).toContain('upload-pages-artifact');
      expect(workflowContent).toContain('deploy-pages');
      expect(workflowContent).toMatch(/pages:\s*write/);
    });
  });

  describe('Total Public Directory Size', () => {
    it('ensures total size of public/ is strictly under 1 MB', () => {
      const totalSize = getDirectorySize(publicDir);
      expect(totalSize).toBeLessThan(1024 * 1024);
      // Log actual size for acceptance report
      console.log(`Verified total public/ directory size: ${(totalSize / 1024).toFixed(2)} KB (${totalSize} bytes)`);
    });
  });
});
