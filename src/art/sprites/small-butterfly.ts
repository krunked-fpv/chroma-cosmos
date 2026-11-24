/**
 * Chromatic Echo Butterfly companion sprite sheet (18x16).
 * Uses system ID 201 (fx_echo_butterfly -> DragonflyIridescence shader),
 * 212 (eye_shine specular wing glints), and 0 (1px deep-plum ink contour & veins).
 */
import type { SpriteSheet } from '../../contracts/art';
import type { Grid } from '../ascii';
import { anim, makeSheet, shifted } from '../ascii';
import { art, fin } from './small-util';

const W = 18;
const H = 16;
const L = { w: 201, e: 212 };
const P = [212, 201];

// Wings wide open (cols 2..15, rows 2..13 -> >=1px margin even with +/-1px bob!)
const WINGS_WIDE = art(
  [
    '..................', // 0
    '..................', // 1
    '......#....#......', // 2  antennae
    '...www.#..#.www...', // 3  upper forewings
    '..wweww.##.wweww..', // 4  specular iridescent wing spots
    '..wwwwww##wwwwww..', // 5
    '...wwwww##wwwww...', // 6  thorax
    '....wwww##wwww....', // 7
    '...wwwww##wwwww...', // 8  hindwings
    '...wweww##wweww...', // 9
    '....wwww##wwww....', // 10
    '.....www..www.....', // 11
    '..................', // 12
    '..................', // 13
    '..................', // 14
    '..................', // 15
  ],
  L,
  W,
);

// Wings mid-stroke
const WINGS_MID = art(
  [
    '..................', // 0
    '..................', // 1
    '......#....#......', // 2
    '....www#..#www....', // 3
    '...wweww##wweww...', // 4
    '...wwwww##wwwww...', // 5
    '....wwww##wwww....', // 6
    '.....www##www.....', // 7
    '....wwww##wwww....', // 8
    '....weww##wwew....', // 9
    '.....www##www.....', // 10
    '......ww..ww......', // 11
    '..................', // 12
    '..................', // 13
    '..................', // 14
    '..................', // 15
  ],
  L,
  W,
);

// Wings swept high / fluttering up
const WINGS_UP = art(
  [
    '..................', // 0
    '.....ww....ww.....', // 1
    '....wwe#..#eww....', // 2
    '....wwww##wwww....', // 3
    '.....www##www.....', // 4
    '.....www##www.....', // 5
    '......ww##ww......', // 6
    '.....www##www.....', // 7
    '.....wwe##eww.....', // 8
    '......ww##ww......', // 9
    '.......w##w.......', // 10
    '..................', // 11
    '..................', // 12
    '..................', // 13
    '..................', // 14
    '..................', // 15
  ],
  L,
  W,
);

// Wings swept gently back in buoyant glide
const WINGS_GLIDE = art(
  [
    '..................', // 0
    '..................', // 1
    '......#....#......', // 2
    '.......#..#.......', // 3
    '...wwww.##.wwww...', // 4
    '..wwweww##wwweww..', // 5
    '..wwwwww##wwwwww..', // 6
    '...wwwww##wwwww...', // 7
    '....wwww##wwww....', // 8
    '....weww##wwew....', // 9
    '.....www##www.....', // 10
    '......ww..ww......', // 11
    '..................', // 12
    '..................', // 13
    '..................', // 14
    '..................', // 15
  ],
  L,
  W,
);

export function buildButterfly(): SpriteSheet {
  const f = (g: Grid) => fin(g, P);

  const idle = [
    f(WINGS_WIDE),
    f(WINGS_MID),
    f(WINGS_UP),
    f(WINGS_GLIDE),
  ];

  const float = [
    f(shifted(WINGS_WIDE, 0, 1)),
    f(WINGS_MID),
    f(WINGS_UP),
    f(shifted(WINGS_GLIDE, 0, 1)),
  ];

  const bounce = [
    f(shifted(WINGS_GLIDE, 0, 2)),
    f(shifted(WINGS_WIDE, 0, 1)),
    f(WINGS_UP),
    f(WINGS_MID),
  ];

  return makeSheet(W, H, {
    idle: anim(idle, 140),
    float: anim(float, 115),
    bounce: anim(bounce, 105),
  });
}
