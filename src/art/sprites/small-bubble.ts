/**
 * Starlight Bubble companion sprite sheet (16x16).
 * Uses system ID 200 (fx_starlight_bubble -> CrystalGlacierMint iridescent shader),
 * 212 (eye_shine curved specular highlight), and 0 (crisp 1px ink outline).
 */
import type { SpriteSheet } from '../../contracts/art';
import type { Grid } from '../ascii';
import { anim, makeSheet, shifted } from '../ascii';
import { art, fin } from './small-util';

const W = 16;
const H = 16;
const L = { b: 200, e: 212 };
const P = [212, 200];

// Classic round iridescent starlight bubble (cols 3..12, rows 3..12 -> safe +/-1px bob!)
const BUBBLE_ROUND = art(
  [
    '................', // 0
    '................', // 1
    '................', // 2
    '.....bbbbbb.....', // 3
    '....bbeeebbb....', // 4  curved glossy specular crescent
    '...bbeebbbbbb...', // 5
    '...bebbbbbbbb...', // 6
    '...bbbbbbbbbb...', // 7
    '...bbbbbbbbbb...', // 8
    '...bbbbbbbbeb...', // 9  lower-right bounce glint
    '...bbbbbbbebb...', // 10
    '....bbbbbbbb....', // 11
    '.....bbbbbb.....', // 12
    '................', // 13
    '................', // 14
    '................', // 15
  ],
  L,
  W,
);

// Gently squashed wide wobble
const BUBBLE_WIDE = art(
  [
    '................', // 0
    '................', // 1
    '................', // 2
    '................', // 3
    '....bbbbbbbb....', // 4
    '...bbeeebbbbb...', // 5
    '..bbeebbbbbbbb..', // 6
    '..bbbbbbbbbbbb..', // 7
    '..bbbbbbbbbbbb..', // 8
    '..bbbbbbbbbbeb..', // 9
    '...bbbbbbbbbb...', // 10
    '....bbbbbbbb....', // 11
    '................', // 12
    '................', // 13
    '................', // 14
    '................', // 15
  ],
  L,
  W,
);

// Buoyant stretched tall wobble
const BUBBLE_TALL = art(
  [
    '................', // 0
    '................', // 1
    '.....bbbbbb.....', // 2
    '....bbeeebbb....', // 3
    '....beebbbbb....', // 4
    '...bebbbbbbbb...', // 5
    '...bbbbbbbbbb...', // 6
    '...bbbbbbbbbb...', // 7
    '...bbbbbbbbbb...', // 8
    '...bbbbbbbbeb...', // 9
    '....bbbbbbeb....', // 10
    '....bbbbbbbb....', // 11
    '.....bbbbbb.....', // 12
    '................', // 13
    '................', // 14
    '................', // 15
  ],
  L,
  W,
);

// Shimmering tilted glint variant
const BUBBLE_GLINT = art(
  [
    '................', // 0
    '................', // 1
    '................', // 2
    '.....bbbbbb.....', // 3
    '....bbeeeebb....', // 4
    '...bbebbbbbbb...', // 5
    '...bbbbbbbbbb...', // 6
    '...bbbbbbbbbb...', // 7
    '...bbbbbbebbb...', // 8
    '...bbbbbbbebb...', // 9
    '...bbbbbbbbbb...', // 10
    '....bbbbbbbb....', // 11
    '.....bbbbbb.....', // 12
    '................', // 13
    '................', // 14
    '................', // 15
  ],
  L,
  W,
);

export function buildBubble(): SpriteSheet {
  const f = (g: Grid) => fin(g, P);

  const idle = [
    f(BUBBLE_ROUND),
    f(BUBBLE_WIDE),
    f(BUBBLE_GLINT),
    f(BUBBLE_TALL),
  ];

  const float = [
    f(BUBBLE_ROUND),
    f(shifted(BUBBLE_TALL, 0, -1)),
    f(shifted(BUBBLE_GLINT, 0, -1)),
    f(shifted(BUBBLE_WIDE, 0, 1)),
  ];

  const bounce = [
    f(shifted(BUBBLE_WIDE, 0, 2)),
    f(BUBBLE_ROUND),
    f(shifted(BUBBLE_TALL, 0, -1)),
    f(BUBBLE_GLINT),
  ];

  return makeSheet(W, H, {
    idle: anim(idle, 210),
    float: anim(float, 175),
    bounce: anim(bounce, 120),
  });
}
