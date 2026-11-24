import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import zlib from 'node:zlib';

// Hand-written CRC32 table
const CRC_TABLE = new Uint32Array(256);
for (let n = 0; n < 256; n++) {
  let c = n;
  for (let k = 0; k < 8; k++) {
    if (c & 1) {
      c = 0xedb88320 ^ (c >>> 1);
    } else {
      c = c >>> 1;
    }
  }
  CRC_TABLE[n] = c;
}

export function crc32(buf, offset = 0, length = buf.length) {
  let c = 0xffffffff;
  for (let i = offset; i < offset + length; i++) {
    c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  }
  return (c ^ 0xffffffff) >>> 0;
}

export function createChunk(typeStr, data) {
  const typeBuf = Buffer.from(typeStr, 'ascii');
  const len = data ? data.length : 0;
  const chunk = Buffer.alloc(4 + 4 + len + 4);
  chunk.writeUInt32BE(len, 0);
  typeBuf.copy(chunk, 4);
  if (data && len > 0) {
    data.copy(chunk, 8);
  }
  const crcData = Buffer.alloc(4 + len);
  typeBuf.copy(crcData, 0);
  if (data && len > 0) {
    data.copy(crcData, 4);
  }
  const crc = crc32(crcData);
  chunk.writeUInt32BE(crc, 8 + len);
  return chunk;
}

export function encodePng(width, height, rgbaBuffer) {
  // PNG signature
  const signature = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

  // IHDR chunk: width(4), height(4), bitDepth(1)=8, colorType(1)=6(RGBA), comp(1)=0, filter(1)=0, interlace(1)=0
  const ihdrData = Buffer.alloc(13);
  ihdrData.writeUInt32BE(width, 0);
  ihdrData.writeUInt32BE(height, 4);
  ihdrData[8] = 8; // 8-bit depth
  ihdrData[9] = 6; // Colour type 6 (RGBA)
  ihdrData[10] = 0; // Deflate
  ihdrData[11] = 0; // Filter method 0
  ihdrData[12] = 0; // Interlace 0
  const ihdrChunk = createChunk('IHDR', ihdrData);

  // Scanlines with filter byte 0 (None)
  const rowBytes = width * 4;
  const rawScanlines = Buffer.alloc(height * (1 + rowBytes));
  for (let y = 0; y < height; y++) {
    const rawOffset = y * (1 + rowBytes);
    rawScanlines[rawOffset] = 0; // Filter: None
    rgbaBuffer.copy(rawScanlines, rawOffset + 1, y * rowBytes, (y + 1) * rowBytes);
  }

  // IDAT chunk: compressed with zlib.deflateSync (level 9)
  const compressed = zlib.deflateSync(rawScanlines, { level: 9 });
  const idatChunk = createChunk('IDAT', compressed);

  // IEND chunk
  const iendChunk = createChunk('IEND', Buffer.alloc(0));

  return Buffer.concat([signature, ihdrChunk, idatChunk, iendChunk]);
}

// 32x32 pixel art grid: crayon-tipped golden star with sparkle on #120d2b
// Maskable safe zone: strictly within central 80% (dist from (15.5, 15.5) <= 12.8)
export const GRID_32 = [
  '................................', // 0
  '................................', // 1
  '................................', // 2
  '................................', // 3
  '...............tt...............', // 4  crayon wax tip
  '..............tTTt..............', // 5
  '.............tTTTTt.............', // 6
  '.............WWWWWW.....+.......', // 7  crayon collar & sparkle
  '............#GGLLGG#...+*+......', // 8
  '...........#GGGLLGGG#...+.......', // 9
  '.....###..#GGGGLLGGGG#..###.....', // 10
  '....#GGG##GGGGGLLGGGGG##GGG#....', // 11 left & right star arms
  '.....#GGGGGGGGGLLGGGGGGGGG#.....', // 12
  '......#GGGGGGGLLLLGGGGGGG#......', // 13
  '.......#GGGGEGGLLGGGEGGG#.......', // 14 cute eyes
  '........#GGGEGGLLGGGEGG#........', // 15
  '........#GGCGGGLLGGGCGG#........', // 16 cheeks
  '........#GGGGGSLLGSGGGG#........', // 17 smile
  '.......#GGGGGGLLLLGGGGGG#.......', // 18
  '......#GGGGGGGGLLGGGGGGGG#......', // 19
  '.....#GGGGGGGGGLLGGGGGGGGG#.....', // 20
  '.....#GGGG####GLLG####GGGG#.....', // 21
  '......#GGG#...#LL#...#GGG#......', // 22 bottom legs
  '......#GG#.....##.....#GG#......', // 23
  '.......#G#............#G#.......', // 24
  '........#..............#........', // 25
  '................................', // 26
  '................................', // 27
  '................................', // 28
  '................................', // 29
  '................................', // 30
  '................................', // 31
];

export const PALETTE = {
  '.': [0x12, 0x0d, 0x2b, 0xff], // Background #120d2b
  '#': [0xb4, 0x53, 0x09, 0xff], // Star outline / shadow #b45309
  'G': [0xfb, 0xbf, 0x24, 0xff], // Star body golden #fbbf24
  'L': [0xfe, 0xf0, 0x8a, 0xff], // Star highlight #fef08a
  't': [0xf4, 0x72, 0xb6, 0xff], // Crayon wax tip highlight #f472b6
  'T': [0xdb, 0x27, 0x77, 0xff], // Crayon wax tip body #db2777
  'W': [0x8b, 0x5c, 0xf6, 0xff], // Crayon wrapper violet #8b5cf6
  'E': [0x18, 0x0e, 0x29, 0xff], // Cute star eyes
  'C': [0xfb, 0x71, 0x85, 0xff], // Rosy blush cheeks #fb7185
  'S': [0xb4, 0x53, 0x09, 0xff], // Smile
  '+': [0x67, 0xe8, 0xf9, 0xff], // Sparkle cyan glow #67e8f9
  '*': [0xff, 0xff, 0xff, 0xff], // Sparkle center white #ffffff
};

export function render32x32Rgba() {
  const src = Buffer.alloc(32 * 32 * 4);
  for (let y = 0; y < 32; y++) {
    const row = GRID_32[y];
    for (let x = 0; x < 32; x++) {
      const ch = row[x];
      const color = PALETTE[ch] || PALETTE['.'];
      const idx = (y * 32 + x) * 4;
      src[idx] = color[0];
      src[idx + 1] = color[1];
      src[idx + 2] = color[2];
      src[idx + 3] = color[3];
    }
  }
  return src;
}

export function generateIconBuffers() {
  const src32 = render32x32Rgba();

  // 192x192: x6 nearest-neighbour upscale
  const buf192 = Buffer.alloc(192 * 192 * 4);
  for (let y = 0; y < 192; y++) {
    const sy = Math.floor(y / 6);
    for (let x = 0; x < 192; x++) {
      const sx = Math.floor(x / 6);
      const sIdx = (sy * 32 + sx) * 4;
      const tIdx = (y * 192 + x) * 4;
      buf192[tIdx] = src32[sIdx];
      buf192[tIdx + 1] = src32[sIdx + 1];
      buf192[tIdx + 2] = src32[sIdx + 2];
      buf192[tIdx + 3] = src32[sIdx + 3];
    }
  }

  // 512x512: x16 nearest-neighbour upscale
  const buf512 = Buffer.alloc(512 * 512 * 4);
  for (let y = 0; y < 512; y++) {
    const sy = Math.floor(y / 16);
    for (let x = 0; x < 512; x++) {
      const sx = Math.floor(x / 16);
      const sIdx = (sy * 32 + sx) * 4;
      const tIdx = (y * 512 + x) * 4;
      buf512[tIdx] = src32[sIdx];
      buf512[tIdx + 1] = src32[sIdx + 1];
      buf512[tIdx + 2] = src32[sIdx + 2];
      buf512[tIdx + 3] = src32[sIdx + 3];
    }
  }

  // apple-touch-icon 180x180: x5 (160px art) centred on #120d2b padding
  const buf180 = Buffer.alloc(180 * 180 * 4);
  const bg = PALETTE['.'];
  for (let i = 0; i < 180 * 180; i++) {
    buf180[i * 4] = bg[0];
    buf180[i * 4 + 1] = bg[1];
    buf180[i * 4 + 2] = bg[2];
    buf180[i * 4 + 3] = bg[3];
  }
  const pad = 10; // (180 - 160) / 2
  for (let y = 0; y < 160; y++) {
    const sy = Math.floor(y / 5);
    for (let x = 0; x < 160; x++) {
      const sx = Math.floor(x / 5);
      const sIdx = (sy * 32 + sx) * 4;
      const tIdx = ((y + pad) * 180 + (x + pad)) * 4;
      buf180[tIdx] = src32[sIdx];
      buf180[tIdx + 1] = src32[sIdx + 1];
      buf180[tIdx + 2] = src32[sIdx + 2];
      buf180[tIdx + 3] = src32[sIdx + 3];
    }
  }

  return {
    png192: encodePng(192, 192, buf192),
    png512: encodePng(512, 512, buf512),
    pngApple: encodePng(180, 180, buf180),
  };
}

export function generateIcons(outDir) {
  const targetDir = outDir || path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../public');
  fs.mkdirSync(targetDir, { recursive: true });

  const { png192, png512, pngApple } = generateIconBuffers();

  const path192 = path.join(targetDir, 'icon-192.png');
  const path512 = path.join(targetDir, 'icon-512.png');
  const pathApple = path.join(targetDir, 'apple-touch-icon.png');

  fs.writeFileSync(path192, png192);
  fs.writeFileSync(path512, png512);
  fs.writeFileSync(pathApple, pngApple);

  return {
    path192,
    path512,
    pathApple,
  };
}

// CLI execution support
const currentFilePath = fileURLToPath(import.meta.url);
const invokedPath = process.argv[1] ? path.resolve(process.argv[1]) : '';
if (invokedPath && invokedPath === currentFilePath) {
  const userOutDir = process.argv[2] ? path.resolve(process.cwd(), process.argv[2]) : undefined;
  const written = generateIcons(userOutDir);
  console.log('Generated PWA icons:');
  console.log('-', written.path192);
  console.log('-', written.path512);
  console.log('-', written.pathApple);
}
