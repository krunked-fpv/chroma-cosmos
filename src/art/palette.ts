/** Flat preview palette + helpers. */
import type { RegionKind } from '../contracts/regions';

export function hexToRgb(hex: string): [number, number, number] {
  const h = hex.replace('#', '');
  return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
}

const CANON: Record<number, string> = {
  1: '#ffd3b8',
  2: '#e9c27c',
  3: '#8b78f2',
  4: '#d6def0',
  5: '#fdf3ff',
  6: '#ff8fd0',
  7: '#ffe27a',
  8: '#b79cff',
  9: '#ffc94d',
  10: '#9a4a1c',
  11: '#ff9a3c',
  12: '#ffb27a',
  13: '#ecd9a0',
  14: '#f3efff',
  15: '#ffe3f1',
  16: '#7fe7f0',
  17: '#e8e0ff',
  18: '#ff9ecf',
  19: '#6f94ff',
  20: '#9bf6ff',
  21: '#fff8ea',
  22: '#e8b068',
  23: '#a96a3a',
  24: '#ff6b6b',
  25: '#9bf6ff',
  26: '#ff8fb8',
  27: '#ffd43b',
  28: '#7ee8c8',
};

const SYSTEM: Record<number, string> = {
  212: '#ffffff',
  213: '#ff8fa8',
  214: '#ffd43b',
  215: '#6c5ce7',
  216: '#ff6b6b',
  217: '#a0c4ff',
  218: '#ffd700',
  219: '#ff2bd6',
  220: '#ff6b6b',
  221: '#ff6b6b',
  222: '#caffbf',
  223: '#7fb6ff',
  224: '#2ee6c9',
  225: '#ffcf5a',
  226: '#a29bfe',
  227: '#ffd700',
  228: '#ffb3d9',
  229: '#fff6d8',
  230: '#ffd1a6',
  231: '#fff4c2',
  232: '#d8b8ff',
  233: '#5a4a7a',
};

const KIND: Record<string, readonly string[]> = {
  planet: ['#ffb27a', '#f59fb5', '#9fd7ff'],
  rings: ['#ecd9a0', '#d7b6ff'],
  cloud: ['#f3efff', '#ffe3f1', '#e3f4ff'],
  comet: ['#7fe7f0', '#ffd6a5'],
  moonCat: ['#e8e0ff', '#ffe3f1'],
  milkshake: ['#ff9ecf', '#fff1c9', '#ff6b6b', '#c8f7e4', '#ffd6e8'],
  whale: ['#6f94ff', '#8f7bff', '#53c7e8'],
  asteroid: ['#9bf6ff', '#caffbf', '#bdb2ff', '#ffadad'],
  star: ['#ffd43b', '#ffe98a', '#ffb3d9', '#9bf6ff'],
  rocket: ['#fff8ea', '#ff6b6b', '#9bf6ff'],
  flora: ['#7ee8c8', '#ff8fb8', '#b6ff3b', '#ffd43b', '#c9a3ff'],
  prop: ['#c9a3ff', '#ffb3d9', '#9bd7ff', '#ffd6a5', '#b9f0c8', '#ffe27a', '#ff9a9a', '#a5b4ff'],
  ghost: ['#bfe9ff', '#e6d7ff'],
  system: ['#ffffff'],
  violet: ['#ffd3b8'],
  lumi: ['#fdf3ff'],
  nova: ['#ffc94d'],
};

export function regionRgb(id: number, kind: RegionKind | undefined): [number, number, number] {
  const c = CANON[id];
  if (c && id <= 28) return hexToRgb(c);
  const s = SYSTEM[id];
  if (s) return hexToRgb(s);
  const list = KIND[kind ?? 'prop'] ?? (KIND.prop as readonly string[]);
  return hexToRgb(list[(id * 7 + (id >> 2)) % list.length] as string);
}

export function lerpRgb(a: [number, number, number], b: [number, number, number], t: number): [number, number, number] {
  return [Math.round(a[0] + (b[0] - a[0]) * t), Math.round(a[1] + (b[1] - a[1]) * t), Math.round(a[2] + (b[2] - a[2]) * t)];
}
