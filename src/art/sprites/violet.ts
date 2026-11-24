/**
 * Violet — hand-authored ASCII pixel-art sprite sheet (36x52).
 * Big-headed storybook kid in starry pajamas, cardboard-starlight helmet,
 * flowing sandy-blonde hair with star-clips, expressive eyes & rosy cheeks.
 */
import type { SpriteSheet } from '../../contracts/art';
import type { WardrobeState } from '../../contracts/progression';
import { anim, compose, finishSprite, makeSheet, parseGrid, type Grid, type Legend } from '../ascii';

const W = 36;
const H = 52;

const LEG: Legend = {
  S: 1, // violet_skin
  H: 2, // violet_sandy_hair
  U: 3, // violet_suit (pajamas)
  M: 4, // violet_helmet (cardboard-starlight helmet)
  E: 212, // eye_shine
  B: 213, // cheek_blush
  K: 214, // violet_star_clips
  P: 215, // violet_galaxy_pins (wardrobe)
  C: 216, // violet_cape (wardrobe)
};

// Priority front-most first when finishSprite inks seams between regions.
const PRIO = [212, 213, 214, 215, 1, 2, 4, 3, 216];

// Head + open-face cardboard-starlight helmet + flowing sandy hair (36x30)
const HEAD_OPEN = parseGrid(
  [
    '....................................', // 0
    '.................M..................', // 1  star antenna tip
    '................MMM.................', // 2
    '.................M..................', // 3
    '.................M..................', // 4  antenna stem
    '............MMMMMMMMMMM.............', // 5  helmet crown
    '.........MMMMMMMMMMMMMMMMM..........', // 6
    '.......MMMMMMM#MMMMM#MMMMMMM........', // 7  cardboard seam ticks
    '......MMMMMM#MMMMMMMMM#MMMMMM.......', // 8
    '.....MMMMMMHHHHHHHHHHHHHMMMMMM......', // 9  sandy bangs tucked in dome
    '.....MMMMHHHHHHHHHHHHHHHHHMMMM......', // 10
    '....MMMMHHHHHKKHHHHHHHKKHHHMMMM.....', // 11 star-clips in sandy bangs
    '....MMMMHHHHHKKKHHHHHKKKHHHMMMM.....', // 12
    '...MMMMMHHHHHHHSSSSSSHHHHHHHMMMM....', // 13 face peek under bangs
    '...MMMMMHHHHHSSSSSSSSSSSHHHHMMMM....', // 14 ear pods start
    '..MMMMMMHHHHSSSSSSSSSSSSSHHHMMMMM...', // 15
    '..MMM#MMHHHSSS##ESSSS##ESSSHHM#MM...', // 16 big expressive eyes + top shine
    '..MMM#MMHHSSSS##ESSSS##ESSSSHM#MM...', // 17
    '..MMMMMMHHSSSS###SSSS###SSSSMMMMM...', // 18
    '...MMMMMHHSSSSSSSSSSSSSSSSSSMMMM....', // 19 clean under-eye cheek
    '...MMMMHHHSS#BBSSSSSSSBB#SSHHMMM....', // 20 rosy blush cheeks
    '...HHHMMHHHSSBBSS#S#SSBBSSSHHMMM....', // 21 sweet curved smile
    '..HHHHHMHHHSSSSSSS#SSSSSSSHHHMMHH...', // 22 flowing sandy hair waves
    '..HHHHHHHMHHSSSSSSSSSSSSSHHHMHHHH...', // 23
    '..HHHHHHHHMHHSSSSSSSSSSSHHHMHHHHH...', // 24
    '..HHHHHHHHMMMMMMMMMMMMMMMMMHHHHHH...', // 25 helmet chin-collar rim
    '..HHHHHHHHMMMMMMMMMMMMMMMMMHHHHHH...', // 26
    '...HHHHHHHHMMMMMMMMMMMMMMMHHHHHH....', // 27
    '....HHHHHH.................HHHH.....', // 28 hair wave tips
    '.....HHHH...................HH......', // 29
  ],
  LEG,
);

// Peaceful closed blink (overlays y=16..19 over face)
const EYES_BLINK = parseGrid(
  [
    '..........SSSSSSSSSSSSSSS...........',
    '..........SSSSSSSSSSSSSSS...........',
    '..........S#SSSS#SS#SSSS#...........',
    '..........SS####SSSS####S...........',
  ],
  LEG,
);

// Joyful ^ ^ eyes for bounce / wiggle
const EYES_HAPPY = parseGrid(
  [
    '..........SSSSSSSSSSSSSSS...........',
    '..........SS####SSSS####S...........',
    '..........S#SSSS#SS#SSSS#...........',
    '..........SSSSSSSSSSSSSSS...........',
  ],
  LEG,
);

// Swayed lower hair tips (y=22..29, always >=2px from canvas edge so dx=-1/+1 never clips)
const HAIR_SWAY_L = parseGrid(
  [
    '..HHHHHMHHHSSSSSSSSSSSSSSSHHHMHHH...',
    '..HHHHHHHMHHSSSSSSSSSSSSSHHHHMHHH...',
    '..HHHHHHHHMHHSSSSSSSSSSSHHHHMHHHH...',
    '..HHHHHHHHMMMMMMMMMMMMMMMMMHHHHHH...',
    '..HHHHHHHHMMMMMMMMMMMMMMMMMHHHHH....',
    '...HHHHHHHHMMMMMMMMMMMMMMMHHHHH.....',
    '....HHHHHH.................HHH......',
    '.....HHHH........................... ',
  ].map((r) => r.slice(0, 36)),
  LEG,
);

const HAIR_SWAY_R = parseGrid(
  [
    '...HHHHMHHHSSSSSSSSSSSSSSSHHHMHHHH..',
    '...HHHHHHMHHSSSSSSSSSSSSSHHHMHHHHH..',
    '...HHHHHHHMHHSSSSSSSSSSSHHHMHHHHHH..',
    '...HHHHHHHMMMMMMMMMMMMMMMMMHHHHHHH..',
    '...HHHHHHHMMMMMMMMMMMMMMMMMHHHHHHH..',
    '....HHHHHHHMMMMMMMMMMMMMMMHHHHHHH...',
    '.....HHHHH.................HHHHHH...',
    '............................HHHH....',
  ],
  LEG,
);

// Standing pajama torso + legs (y=27..50, 24 rows)
const BODY_STAND = parseGrid(
  [
    '............UUUUUUUUUUU.............', // 27
    '..........UUUUUUUUUUUUUUU...........', // 28
    '.........UUUUUUUUUUUUUUUUU..........', // 29
    '........UUUUUUUU#UUUUUUUUUU.........', // 30 starry chest doodle
    '.......UUUUUUUU###UUUUUUUUUU........', // 31
    '......UUUUUUUUUU#UUUUUUUUUUUU.......', // 32
    '......UUUU.UUUUUUUUUUUUU.UUUU.......', // 33 arms
    '......UUUU.UUUUUUUUUUUUU.UUUU.......', // 34
    '......SSS..UUUUUUUUUUUUU..SSS.......', // 35 cute little hands
    '......SSS..UUUUUUUUUUUUU..SSS.......', // 36
    '.......S...UUUUUUUUUUUUU...S........', // 37
    '...........UUUUUUUUUUUUU............', // 38
    '...........UUUUUUUUUUUUU............', // 39
    '...........UUUUU...UUUUU............', // 40 pajama legs
    '...........UUUUU...UUUUU............', // 41
    '...........UUUUU...UUUUU............', // 42
    '...........UUUUU...UUUUU............', // 43
    '...........UUUUU...UUUUU............', // 44
    '..........UUUUUU...UUUUUU...........', // 45 cozy footed slippers
    '..........UUUUUU...UUUUUU...........', // 46
    '..........UUUUUU...UUUUUU...........', // 47
    '....................................', // 48
    '....................................', // 49
    '....................................', // 50
  ],
  LEG,
);

// Excited arms-out/cheering body (hands clearly visible outside hair)
const BODY_ARMS_UP = parseGrid(
  [
    '............UUUUUUUUUUU.............',
    '..........UUUUUUUUUUUUUUU...........',
    '....SSS..UUUUUUUUUUUUUUUUU..SSS.....',
    '...SSSSUUUUUUUUU#UUUUUUUUUUSSSS.....',
    '....UUUUUUUUUUU###UUUUUUUUUUUU......',
    '......UUUUUUUUUU#UUUUUUUUUUU........',
    '...........UUUUUUUUUUUUU............',
    '...........UUUUUUUUUUUUU............',
    '...........UUUUUUUUUUUUU............',
    '...........UUUUUUUUUUUUU............',
    '...........UUUUUUUUUUUUU............',
    '...........UUUUUUUUUUUUU............',
    '...........UUUUU...UUUUU............',
    '..........UUUUU.....UUUUU...........',
    '..........UUUUU.....UUUUU...........',
    '..........UUUUU.....UUUUU...........',
    '.........UUUUUU.....UUUUUU..........',
    '.........UUUUUU.....UUUUUU..........',
    '....................................',
    '....................................',
    '....................................',
    '....................................',
    '....................................',
    '....................................',
  ],
  LEG,
);

// Walk stride A
const BODY_WALK_A = parseGrid(
  [
    '............UUUUUUUUUUU.............',
    '..........UUUUUUUUUUUUUUU...........',
    '.........UUUUUUUUUUUUUUUUU..........',
    '........UUUUUUUU#UUUUUUUUUU.........',
    '.......UUUUUUUU###UUUUUUUUUU........',
    '......UUUUUUUUUU#UUUUUUUUUUUU.......',
    '.....UUUU..UUUUUUUUUUUUU..UUUU......',
    '.....SSS...UUUUUUUUUUUUU...SSS......',
    '.....SSS...UUUUUUUUUUUUU...SSS......',
    '...........UUUUUUUUUUUUU............',
    '...........UUUUUUUUUUUUU............',
    '...........UUUUUUUUUUUUU............',
    '..........UUUUUU..UUUUUU............',
    '.........UUUUUU....UUUUUU...........',
    '.........UUUUU......UUUUU...........',
    '........UUUUU.......UUUUU...........',
    '........UUUUU........UUUUU..........',
    '.......UUUUUU........UUUUUU.........',
    '.......UUUUUU........UUUUUU.........',
    '....................................',
    '....................................',
    '....................................',
    '....................................',
    '....................................',
  ],
  LEG,
);

// Walk stride B
const BODY_WALK_B = parseGrid(
  [
    '............UUUUUUUUUUU.............',
    '..........UUUUUUUUUUUUUUU...........',
    '.........UUUUUUUUUUUUUUUUU..........',
    '........UUUUUUUU#UUUUUUUUUU.........',
    '........UUUUUUU###UUUUUUUUU.........',
    '........UUUUUUUU#UUUUUUUUUU.........',
    '........UU.UUUUUUUUUUUUU.UU.........',
    '........SS.UUUUUUUUUUUUU.SS.........',
    '........SS.UUUUUUUUUUUUU.SS.........',
    '...........UUUUUUUUUUUUU............',
    '...........UUUUUUUUUUUUU............',
    '...........UUUUUUUUUUUUU............',
    '............UUUUU..UUUU.............',
    '............UUUUU..UUUUU............',
    '............UUUUU...UUUUU...........',
    '............UUUUU...UUUUU...........',
    '............UUUUU...UUUUUU..........',
    '...........UUUUUU...UUUUUU..........',
    '...........UUUUUU...................',
    '....................................',
    '....................................',
    '....................................',
    '....................................',
    '....................................',
  ],
  LEG,
);

// Floating weightless pose
const BODY_FLOAT = parseGrid(
  [
    '............UUUUUUUUUUU.............',
    '.........UUUUUUUUUUUUUUUUU..........',
    '.......UUUUUUUUUUUUUUUUUUUUU........',
    '.....UUUUUUUUUUU#UUUUUUUUUUUUU......',
    '....SSS..UUUUUU###UUUUUUU..SSS......',
    '....SSS...UUUUUU#UUUUUUU...SSS......',
    '...........UUUUUUUUUUUUU............',
    '...........UUUUUUUUUUUUU............',
    '...........UUUUUUUUUUUUU............',
    '...........UUUUUUUUUUUUU............',
    '..........UUUUUUUUUUUUUU............',
    '.........UUUUUU...UUUUUU............',
    '........UUUUUU.....UUUUUU...........',
    '........UUUUU.......UUUUUU..........',
    '.........UUUUU......UUUUUU..........',
    '..........UUUUU......UUUU...........',
    '....................................',
    '....................................',
    '....................................',
    '....................................',
    '....................................',
    '....................................',
    '....................................',
    '....................................',
  ],
  LEG,
);

// Wardrobe overlay: Galaxy Hairpins (215) nestled in both sandy hair waves (36x30)
const OVERLAY_PINS = parseGrid(
  [
    '....................................',
    '....................................',
    '....................................',
    '....................................',
    '....................................',
    '....................................',
    '....................................',
    '....................................',
    '....................................',
    '....................................',
    '....................................',
    '....................................',
    '....................................',
    '....................................',
    '....................................',
    '....................................',
    '....................................',
    '....................................',
    '....................................',
    '....................................',
    '....................................',
    '....................................',
    '.....PP.....................PP......',
    '....PPPP...................PPPP.....',
    '.....PP.....................PP......',
    '....................................',
    '....PP.......................PP.....',
    '...PPP.......................PPP....',
    '....................................',
    '....................................',
  ],
  LEG,
);

// Wardrobe overlay: Rainbow Astronaut Cape (216) billowing behind body
const OVERLAY_CAPE_A = parseGrid(
  [
    '.........CCCCCCCCCCCCCCCCCC.........',
    '.......CCCCCCCCCCCCCCCCCCCCCC.......',
    '......CCCCCCCCCCCCCCCCCCCCCCCC......',
    '.....CCCCCCCCCCCCCCCCCCCCCCCCCC.....',
    '....CCCCCCCCCCCCCCCCCCCCCCCCCCCC....',
    '...CCCCCCCCCCCCCCCCCCCCCCCCCCCCC....',
    '...CCCCCCCCCCCCCCCCCCCCCCCCCCCCC....',
    '..CCCCCCCCCCCCCCCCCCCCCCCCCCCCCC....',
    '..CCCCCCCCCCCCCCCCCCCCCCCCCCCCCC....',
    '..CCCCCCCCCCCCCCCCCCCCCCCCCCCCCC....',
    '..CCCCCCCCCCCCCCCCCCCCCCCCCCCCCC....',
    '..CCCCCCCCCCCCCCCCCCCCCCCCCCCCC.....',
    '..CCCCCCCCCCCCCCCCCCCCCCCCCCCC......',
    '..CCCCCCCCCCCCCCCCCCCCCCCCCCC.......',
    '...CCCCCCCCCCCCCCCCCCCCCCCCC........',
    '...CCCCCCCCCCCCCCCCCCCCCCCC.........',
    '....CCCCCCCCCCCC..CCCCCCCC..........',
    '.....CCCCCCCC........CCCC...........',
    '....................................',
  ],
  LEG,
);

const OVERLAY_CAPE_B = parseGrid(
  [
    '.........CCCCCCCCCCCCCCCCCC.........',
    '.......CCCCCCCCCCCCCCCCCCCCCC.......',
    '......CCCCCCCCCCCCCCCCCCCCCCCC......',
    '....CCCCCCCCCCCCCCCCCCCCCCCCCCC.....',
    '...CCCCCCCCCCCCCCCCCCCCCCCCCCCCC....',
    '..CCCCCCCCCCCCCCCCCCCCCCCCCCCCCC....',
    '..CCCCCCCCCCCCCCCCCCCCCCCCCCCCCC....',
    '..CCCCCCCCCCCCCCCCCCCCCCCCCCCCCC....',
    '..CCCCCCCCCCCCCCCCCCCCCCCCCCCCCC....',
    '..CCCCCCCCCCCCCCCCCCCCCCCCCCCCCC....',
    '..CCCCCCCCCCCCCCCCCCCCCCCCCCCCC.....',
    '..CCCCCCCCCCCCCCCCCCCCCCCCCCCC......',
    '...CCCCCCCCCCCCCCCCCCCCCCCCCC.......',
    '...CCCCCCCCCCCCCCCCCCCCCCCCC........',
    '....CCCCCCCCCCCCCCCCCCCCCCC.........',
    '.....CCCCCCCCCCCC..CCCCCCCC.........',
    '......CCCCCCCC.......CCCCC..........',
    '....................................',
    '....................................',
  ],
  LEG,
);

function frame(
  w: WardrobeState,
  o: {
    headDy?: number;
    bodyDy?: number;
    body?: Grid;
    eyes?: Grid;
    hair?: Grid;
    capeB?: boolean;
    dx?: number;
  } = {},
) {
  const dx = o.dx ?? 0;
  const hdy = o.headDy ?? 0;
  const bdy = o.bodyDy ?? 0;
  const layers: Array<{ g: Grid; x: number; y: number }> = [];
  if (w.violetCape) {
    layers.push({ g: o.capeB ? OVERLAY_CAPE_B : OVERLAY_CAPE_A, x: dx, y: 27 + bdy });
  }
  layers.push({ g: o.body ?? BODY_STAND, x: dx, y: 27 + bdy });
  layers.push({ g: HEAD_OPEN, x: dx, y: 1 + hdy });
  if (o.hair) layers.push({ g: o.hair, x: dx, y: 23 + hdy });
  if (o.eyes) layers.push({ g: o.eyes, x: dx, y: 17 + hdy });
  if (w.violetPins) layers.push({ g: OVERLAY_PINS, x: dx, y: 1 + hdy });
  return finishSprite(compose(W, H, layers), PRIO, W, H);
}

export function buildViolet(w: WardrobeState): SpriteSheet {
  const idle = anim(
    [
      frame(w, { headDy: 0, bodyDy: 0 }),
      frame(w, { headDy: 1, bodyDy: 0, hair: HAIR_SWAY_R, capeB: true }),
      frame(w, { headDy: 1, bodyDy: 0, eyes: EYES_BLINK, hair: HAIR_SWAY_L }),
      frame(w, { headDy: 0, bodyDy: 0, hair: HAIR_SWAY_R, capeB: true }),
    ],
    220,
  );

  const wiggle = anim(
    [
      frame(w, { dx: -1, headDy: 0, body: BODY_STAND, hair: HAIR_SWAY_L }),
      frame(w, { dx: 0, headDy: -1, bodyDy: -1, body: BODY_ARMS_UP, eyes: EYES_HAPPY, capeB: true }),
      frame(w, { dx: 1, headDy: 0, body: BODY_STAND, hair: HAIR_SWAY_R }),
      frame(w, { dx: 0, headDy: -1, bodyDy: -1, body: BODY_ARMS_UP, eyes: EYES_HAPPY, capeB: true }),
    ],
    130,
  );

  const bounce = anim(
    [
      frame(w, { headDy: 2, bodyDy: 1, body: BODY_STAND }),
      frame(w, { headDy: -1, bodyDy: -1, body: BODY_ARMS_UP, eyes: EYES_HAPPY, capeB: true }),
      frame(w, { headDy: -3, bodyDy: -3, body: BODY_ARMS_UP, eyes: EYES_HAPPY, hair: HAIR_SWAY_R }),
      frame(w, { headDy: -2, bodyDy: -2, body: BODY_FLOAT, eyes: EYES_HAPPY, hair: HAIR_SWAY_L, capeB: true }),
      frame(w, { headDy: 1, bodyDy: 0, body: BODY_STAND }),
    ],
    130,
  );

  const walk = anim(
    [
      frame(w, { headDy: 0, body: BODY_WALK_A, hair: HAIR_SWAY_L }),
      frame(w, { headDy: -1, bodyDy: -1, body: BODY_WALK_B, capeB: true }),
      frame(w, { headDy: 0, body: BODY_WALK_A, hair: HAIR_SWAY_R }),
      frame(w, { headDy: -1, bodyDy: -1, body: BODY_WALK_B, capeB: true }),
    ],
    150,
  );

  const float = anim(
    [
      frame(w, { headDy: -1, bodyDy: -1, body: BODY_FLOAT, hair: HAIR_SWAY_L }),
      frame(w, { headDy: -2, bodyDy: -2, body: BODY_FLOAT, hair: HAIR_SWAY_R, capeB: true }),
      frame(w, { headDy: -1, bodyDy: -1, body: BODY_FLOAT, eyes: EYES_HAPPY, hair: HAIR_SWAY_R }),
      frame(w, { headDy: 0, bodyDy: 0, body: BODY_FLOAT, hair: HAIR_SWAY_L, capeB: true }),
    ],
    200,
  );

  return makeSheet(W, H, { idle, wiggle, bounce, walk, float });
}
