/**
 * Nova — hand-authored ASCII pixel-art sprite sheet (68x36).
 * Lithe cosmic cheetah with sleek golden body (9), chunky spots (10),
 * expressive curving tail (11), plus twin rocket-boosters (219) & rainbow scarf (220).
 */
import type { SpriteSheet } from '../../contracts/art';
import type { WardrobeState } from '../../contracts/progression';
import { anim, compose, finishSprite, makeSheet, parseGrid, type Grid, type Legend } from '../ascii';

const W = 68;
const H = 36;

const LEG: Legend = {
  B: 9, // nova_body
  S: 10, // nova_spots
  T: 11, // nova_tail
  E: 212, // eye_shine
  A: 213, // cheek_blush
  R: 219, // nova_boosters (wardrobe)
  F: 220, // nova_scarf (wardrobe)
};

// Spots (10) have higher priority than body (9) so every spot stays plump & crisp (>=60px total)!
const PRIO = [212, 213, 219, 220, 10, 9, 11];

// Iconic mid-leap cheetah (68x36) — stretched athletic arc, reaching paws, S-curve tail!
const NOVA_LEAP = parseGrid(
  [
    '....................................................................', // 0
    '................................................BB...BB.............', // 1  rounded cheetah ears
    '...............................................BBBBBBBBB............', // 2
    '..............................................BBBBBBBBBBB...........', // 3
    '.............................................BBBBBBBB##EBB..........', // 4  expressive eye + shine
    '.....TTTTT..................................BBBBBBBBB###BBB.........', // 5
    '...TTTTTTTTT................................BBBBBBBBB#AABBB#........', // 6  tear-mark + blush + nose
    '..TTTT#TTTTTT..............................BBBBBBBBBBBBBBBBB........', // 7
    '..TTTT..TTTTTT............................BBBBBBBBBBB###BBB.........', // 8  happy grin
    '...TTT...TTTTTT..........................BBBBBBBBBBBB...............', // 9
    '..........TTTTTT.................BBBSSSS.BBBBSSSBBBBB...............', // 10 sleek spotted back
    '...........TTTTTT...........BBBBBBBSSSSBBBBBBSSSBBBBBB..............', // 11
    '............TTTTTT.......BBBBSSSBBBSSSSBBBBBBSSSBBBBBBBBBB..........', // 12
    '.............TTTTTT....BBBBBBSSSBBBBBBBBBSSSSBBBBBBBBBBBBBBB........', // 13 front legs reaching forward!
    '..............TTTTTT..BBBSSSSBBBBBBSSSSBBSSSSBBBBBBBBBBBBBBBBBB.....', // 14
    '...............TTTTTT.BBBSSSSBBBBBBSSSSBBBBBBBBBBBBBBBBBBBBBBBBB....', // 15
    '................TTTTTBBBBSSSSBBBBBBBBBBBBBSSSBBBBBBBBBBBBB.BBBBBB...', // 16 reaching paws
    '..................TTTBBBBBBBBBBBBSSSBBBBBBSSSBBBBBBBBBB......BBBBB..', // 17
    '...................BBBBBBSSSSBBBBSSSBBBBBBBBBBBBBBBB..........BBBB..', // 18
    '..................BBBBBBBSSSSBBBBBBBBBBBBBBBBBB...............BBB...', // 19
    '................BBBBBBBBBBBBBBBBBBBBBBBBBBBB........................', // 20
    '..............BBBBBBBBBBBBBB........................................', // 21
    '............BBBBBBBBBB..............................................', // 22 strong hind legs kicking back!
    '..........BBBBBBBBBB................................................', // 23
    '........BBBBBBBB....................................................', // 24
    '......BBBBBBBB......................................................', // 25
    '.....BBBBBB.........................................................', // 26
    '....BBBBB...........................................................', // 27
    '....BBBB............................................................', // 28
    '....................................................................', // 29
    '....................................................................', // 30
    '....................................................................', // 31
    '....................................................................', // 32
    '....................................................................', // 33
    '....................................................................', // 34
    '....................................................................', // 35
  ],
  LEG,
);

// Coiled mid-stride sprint cheetah (gathered spring!)
const NOVA_COIL = parseGrid(
  [
    '....................................................................', // 0
    '....................................................................', // 1
    '..............................................BB...BB...............', // 2
    '.............................................BBBBBBBBB..............', // 3
    '............................................BBBBBBBBBBB.............', // 4
    '...........................................BBBBBBBB##EBB............', // 5
    '..........................................BBBBBBBBB###BBB...........', // 6
    '.........................................BBBBBBBBBB#AABBB#..........', // 7
    '.........................................BBBBBBBBBBBBBBBBB..........', // 8
    '......TTTTTT............................BBBBBBBBBBB###BBB...........', // 9
    '....TTTTTTTTTT..................BBBSSSS.BBBBBBBBBBBBB...............', // 10 arched back
    '...TTTT#TTTTTTT............BBBBBBBSSSSBBBBBBSSSBBBBB................', // 11
    '..TTTT...TTTTTTT........BBBBSSSBBBSSSSBBBBBBSSSBBBBBB...............', // 12
    '..TTTT....TTTTTTT.....BBBBBBSSSBBBBBBBBBSSSSBBBBBBBBBB..............', // 13
    '...TTT.....TTTTTTT...BBBSSSSBBBBBBSSSSBBSSSSBBBBBBBBBBB.............', // 14
    '............TTTTTTT..BBBSSSSBBBBBBSSSSBBBBBBBBBBBBBBBBBB............', // 15
    '.............TTTTTT.BBBBSSSSBBBBBBBBBBBBBSSSBBBBBBBBBBBBB...........', // 16
    '...............TTTTBBBBBBBBBBBBBBSSSBBBBBSSSBBBBBBBBBBBBB...........', // 17
    '..................BBBBBBBSSSSBBBBSSSBBBBBBBBBBBBBBBBBBBBB...........', // 18
    '...................BBBBBBSSSSBBBBBBBBBBBBBBBBBBBBBBBBBB.............', // 19
    '....................BBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBB................', // 20
    '.....................BBBBBBBB...............BBBBBBBB................', // 21 legs gathering under belly!
    '......................BBBBBBB...............BBBBBBB.................', // 22
    '.......................BBBBBBB.............BBBBBBB..................', // 23
    '........................BBBBBBB...........BBBBBBB...................', // 24
    '.........................BBBBBBB.........BBBBBBB....................', // 25
    '..........................BBBBBB.........BBBBBB.....................', // 26
    '..........................BBBBBB........BBBBBB......................', // 27
    '...........................BBBBB........BBBBB.......................', // 28
    '...........................BBBBB........BBBBB.......................', // 29
    '....................................................................', // 30
    '....................................................................', // 31
    '....................................................................', // 32
    '....................................................................', // 33
    '....................................................................', // 34
    '....................................................................', // 35
  ],
  LEG,
);

// Alert standing / prowling cheetah (idle + walk base) — rounder, cuter feline head!
const NOVA_STAND = parseGrid(
  [
    '....................................................................', // 0
    '...............................................BB...BB..............', // 1  rounded cheetah ears
    '..............................................BBBBBBBBB.............', // 2
    '.............................................BBBBBBBBBBB............', // 3
    '............................................BBBBBBBB##EBB...........', // 4  expressive eye + shine
    '...........................................BBBBBBBBB###BBB..........', // 5
    '..........................................BBBBBBBBBB#AABBB#.........', // 6  tear-mark + blush + nose
    '..........................................BBBBBBBBBBBBBBBBB.........', // 7
    '..........................................BBBBBBBBBBB###BBB.........', // 8  cute smile
    '.......TTTTT.............................BBBBBBBBBBBB...............', // 9
    '.....TTTTTTTTT...........................BBBBBBBBBBB................', // 10
    '....TTTT#TTTTTT..................BBBSSSS.BBBBSSSBBBBB...............', // 11
    '....TTTT..TTTTTT...........BBBBBBBBSSSSBBBBBBSSSBBBBBB..............', // 12
    '.....TTT...TTTTTT.......BBBBSSSBBBBSSSSBBBBBBSSSBBBBBBB.............', // 13
    '............TTTTTT....BBBBBBSSSBBBBBBBBBBSSSSBBBBBBBBBBB............', // 14
    '.............TTTTTT..BBBSSSSBBBBBBBSSSSBBSSSSBBBBBBBBBBB............', // 15
    '..............TTTTTT.BBBSSSSBBBBBBBSSSSBBBBBBBBBBBBBBBBBB...........', // 16
    '...............TTTTTBBBBSSSSBBBBBBBBBBBBBBSSSBBBBBBBBBBBB...........', // 17
    '.................TTTBBBBBBBBBBBBBBBSSSBBBBSSSBBBBBBBBBBB............', // 18
    '...................BBBBBBSSSSBBBBBBSSSBBBBBBBBBBBBBBBBBB............', // 19
    '...................BBBBBBSSSSBBBBBBBBBBBBBBBBBBBBBBBBBB.............', // 20
    '...................BBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBB..............', // 21
    '...................BBBBBB..BBBB...........BBBB..BBBBBB..............', // 22 sleek legs
    '...................BBBBB...BBBB...........BBBB...BBBBB..............', // 23
    '..................BBBBB....BBBB...........BBBB...BBBBB..............', // 24
    '..................BBBBB....BBBB...........BBBB...BBBBB..............', // 25
    '..................BBBB.....BBBB...........BBBB....BBBB..............', // 26
    '..................BBBB.....BBBB...........BBBB....BBBB..............', // 27
    '..................BBBB.....BBBB...........BBBB....BBBB..............', // 28
    '..................BBBB.....BBBB...........BBBB....BBBB..............', // 29
    '..................BBBBB....BBBBB..........BBBBB...BBBBB.............', // 30 cute paws
    '..................BBBBB....BBBBB..........BBBBB...BBBBB.............', // 31
    '....................................................................', // 32
    '....................................................................', // 33
    '....................................................................', // 34
    '....................................................................', // 35
  ],
  LEG,
);

// Playful play-bow (wiggle!) — front chest low, rump high, wagging tail!
const NOVA_BOW = parseGrid(
  [
    '....................................................................', // 0
    '....................................................................', // 1
    '.....TTTTT..........................................................', // 2  wagging high tail!
    '....TTTTTTTT........................................................', // 3
    '...TTTT#TTTTT.......................................................', // 4
    '...TTTT..TTTTT......................................................', // 5
    '....TTT...TTTTT.....................................................', // 6
    '...........TTTTT....................................................', // 7
    '............TTTTT......BBBBSSBBBB...................................', // 8  high rump
    '.............TTTTT...BBBBBBSSBBBBBBB................BB...BB.........', // 9  cute ears
    '..............TTTTT.BBBSSSBBBBBBBSSSBBB............BBBBBBBBB........', // 10
    '...............TTTTBBBBSSSBBBBBBBSSSBBBB..........BBBBBBBBBBB.......', // 11
    '................TTTBBBBSSSBBBBBBBBBBBBBBB........BBBBBBBB##EBB......', // 12 happy face low
    '..................BBBBBBBBBBBBSSBBBBBBBBBB......BBBBBBBBB###BBB.....', // 13
    '..................BBBBBBSSSBBBSSBBBBBBBBBBB....BBBBBBBBBB#AABBB#....', // 14
    '..................BBBBBBSSSBBBBBBBBBBSSSBBBB..BBBBBBBBBBBBBBBBBB....', // 15
    '..................BBBBBBBBBBBBBBBBBBBSSSBBBBBBBBBBBBBBBBB###BBB.....', // 16
    '..................BBBBBBBBB....BBBBBBBBBBBBBBBBBBBBBBBBBBBB.........', // 17
    '..................BBBBBBB........BBBBBBBSSBBBBBBBBBBBBBBBB..........', // 18
    '..................BBBBBB..........BBBBBBSSBBBBBBBBBBBBBBB...........', // 19
    '..................BBBBB............BBBBBBBBBBBBBBBBBBBBB............', // 20
    '..................BBBBB.............BBBBBBBBBBBBBBBBBBBB............', // 21
    '..................BBBBB..............BBBBBBBBBBBBBBBBBBBBBB.........', // 22 front paws stretched forward!
    '..................BBBB................BBBBBBBBBBBBBBBBBBBBBBB.......', // 23
    '..................BBBB.................BBBBBBBBBBBBBBBBBBBBBBB......', // 24
    '..................BBBB..................BBBBBBBBBBBBBBBBBBBBBB......', // 25
    '..................BBBB..............................................', // 26
    '..................BBBB..............................................', // 27
    '..................BBBB..............................................', // 28
    '..................BBBB..............................................', // 29
    '..................BBBBB.............................................', // 30
    '..................BBBBB.............................................', // 31
    '....................................................................', // 32
    '....................................................................', // 33
    '....................................................................', // 34
    '....................................................................', // 35
  ],
  LEG,
);

// Cozy curled-up NAPPING Nova (napping atop the chimney on rooftop!)
// Tall perked feline ears with crisp valley, clear neck dip, sleek spotted back,
// and long curled cheetah tail emerging from her hip, wrapping her flank & curling up in front.
const NOVA_SLEEP = parseGrid(
  [
    '....................................................................', // 0
    '....................................................................', // 1
    '....................................................................', // 2
    '....................................................................', // 3
    '....................................................................', // 4
    '....................................................................', // 5
    '....................................................................', // 6
    '....................................................................', // 7
    '....................................................................', // 8
    '....................................................................', // 9
    '....................................................................', // 10
    '............................................BB.....BB...............', // 11 tall upright feline ear tips!
    '...........................................BBBB...BBBB..............', // 12 distinct feline ears + sky gap
    '...........................................BBBBB.BBBBB..............', // 13 crisp ink valley between ears
    '...........................................BBBBBBBBBBB..............', // 14 rounded feline crown
    '..........................................BBBBBBBBBBBBB.............', // 15 forehead (head taller than back!)
    '...................BBBBBBBBBBBBB.........BBBBBBBBBBBBBBB............', // 16 sleek back crest + wide neck dip
    '...............BBBBBBBBBSSSSBBBBBB.......BBBBBBBBBBBBBBBB...........', // 17 clear valley separating back & head
    '.............BBBBBBBBBBBSSSSBBBBBBBB.....BBBBBBBB#BB#BBBB...........', // 18 peaceful closed eye corners
    '............BBBBBBSSSSBBBBBBBBBBSSSSB...BBBBBBBBBB##BBBBBB..........', // 19 neck dip + closed eye curve
    '...........BBBBBBBSSSSBBBBBBBBBBSSSSBBBBBBBBBBBAAABBBBBBBB#.........', // 20 rosy blush + cute feline nose
    '..........BBBBBBBBBBBBBBSSSSBBBBBBBBBBBBBBBBBBBBBBBB#BB##BB.........', // 21 tear-mark + sweet sleepy smile
    '..........BBBBSSSSBBBBBBSSSSBBBBBBBBBBSSSBBBBBBBBBBBBBBBB.....TT....', // 22 expressive curled tail tip!
    '..........BBBBSSSSBBBBBBBBBBBBSSSSBBBBSSSBBBBBBBBBBBBBBB.....TTTT...', // 23 rounded curled tail hook
    '..........BBBBBBBBBBBBBBBBBBBBSSSSBBBBBBBBBBBB########......TT#TTT..', // 24 chin line + ringed tail curl
    '..........BBBBBBBBBBSSSSBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBB......TTTTT..', // 25 tucked paws + open gap inside curl
    '..........BBBBBBBBBBSSSSBBBBBBBBBBSSSSBBBBBBBBBBBBBBBBBB.....TTTTT..', // 26 sleek curved rump -> tail base
    '...........BBBBBBBBBBBBBBBBBBBBBBBSSSSBBBBBBBBBBBBBB#BBBB...TTTTT...', // 27 paw toe line + tail curling under
    '...........TTBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBB..TTTTT....', // 28 tail emerges from hip & wraps front
    '...........TTTTBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBTTTTTT.....', // 29 continuous curled cheetah tail
    '............TTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTT......', // 30 lush curled tail sweep
    '..............TTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTT........', // 31
    '..................TTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTT............', // 32 resting snugly on chimney cap
    '....................................................................', // 33
    '....................................................................', // 34
    '....................................................................', // 35
  ],
  LEG,
);

// Blink patch for NOVA_STAND (overlays y=4..6)
const NOVA_BLINK = parseGrid(
  [
    '..................................................BBBB..............',
    '.................................................B####B.............',
    '..................................................BBBB..............',
  ],
  LEG,
);

// Wardrobe overlay: Twin Rocket-Boosters (219) strapped on Nova's back
const BOOSTERS_RUN = parseGrid(
  [
    '.........................RRRRRR.....................................',
    '.......................RRRRRRRRRR...................................',
    '......................RRR#RRRRRRRR..................................',
    '.......................RRRRRRRRRR...................................',
    '.........................RRRRRR.....................................',
  ],
  LEG,
);

const BOOSTERS_SLEEP = parseGrid(
  [
    '..........................RRRRRR....................................',
    '........................RRRRRRRRRR..................................',
    '.......................RRR#RRRRRRRR.................................',
    '........................RRRRRRRRRR..................................',
    '..........................RRRRRR....................................',
  ],
  LEG,
);

// Wardrobe overlay: Trailing Rainbow Scarf (220) around neck & streaming back!
const SCARF_A = parseGrid(
  [
    '....................................FFFFFF..........................',
    '..............................FFFFFFFFFFFFFF........................',
    '............................FFFF#FFFFFFFFFFFFFF.....................',
    '.............................FFFFFFFFFFFFFFFFFFF....................',
    '..........................................FFFFFF....................',
    '...........................................FFFF.....................',
  ],
  LEG,
);

const SCARF_B = parseGrid(
  [
    '....................................................................',
    '.............................FFFFFFFFFFFF...........................',
    '...........................FFFF#FFFFFFFFFFFFF.......................',
    '............................FFFFFFFFFFFFFFFFFFFF....................',
    '..........................................FFFFFF....................',
    '...........................................FFFF.....................',
  ],
  LEG,
);

const SCARF_SLEEP = parseGrid(
  [
    '.......................................FFFFFF.......................',
    '....................................FFFFFFFFFFFF....................',
    '..................................FFFF#FFFFFFFFFF...................',
    '...................................FFFFFFFFFFFFFF...................',
    '..........................................FFFFFF....................',
  ],
  LEG,
);

function buildFrame(
  w: WardrobeState,
  base: Grid,
  o: {
    dy?: number;
    dx?: number;
    blink?: boolean;
    scarfB?: boolean;
    boosterY?: number;
    scarfY?: number;
    sleep?: boolean;
  } = {},
) {
  const dx = o.dx ?? 0;
  const dy = o.dy ?? 0;
  const layers: Array<{ g: Grid; x: number; y: number }> = [{ g: base, x: dx, y: dy }];
  if (o.blink) layers.push({ g: NOVA_BLINK, x: dx, y: 4 + dy });
  if (w.novaBoosters) {
    layers.push({ g: o.sleep ? BOOSTERS_SLEEP : BOOSTERS_RUN, x: dx, y: (o.boosterY ?? 8) + dy });
  }
  if (w.novaScarf) {
    layers.push({
      g: o.sleep ? SCARF_SLEEP : o.scarfB ? SCARF_B : SCARF_A,
      x: dx,
      y: (o.scarfY ?? 8) + dy,
    });
  }
  return finishSprite(compose(W, H, layers), PRIO, W, H);
}

export function buildNova(w: WardrobeState): SpriteSheet {
  const sleep = anim(
    [
      buildFrame(w, NOVA_SLEEP, { dy: 0, sleep: true, boosterY: 14, scarfY: 19 }),
      buildFrame(w, NOVA_SLEEP, { dy: 0, dx: -1, sleep: true, boosterY: 14, scarfY: 19 }),
      buildFrame(w, NOVA_SLEEP, { dy: 1, sleep: true, boosterY: 14, scarfY: 19 }),
      buildFrame(w, NOVA_SLEEP, { dy: 0, sleep: true, boosterY: 14, scarfY: 19 }),
    ],
    340,
  );

  const idle = anim(
    [
      buildFrame(w, NOVA_STAND, { dy: 0, boosterY: 8, scarfY: 7 }),
      buildFrame(w, NOVA_STAND, { dy: 0, scarfB: true, boosterY: 8, scarfY: 7 }),
      buildFrame(w, NOVA_STAND, { dy: 1, blink: true, boosterY: 8, scarfY: 7 }),
      buildFrame(w, NOVA_STAND, { dy: 0, scarfB: true, boosterY: 8, scarfY: 7 }),
    ],
    240,
  );

  const walk = anim(
    [
      buildFrame(w, NOVA_STAND, { dy: 0, boosterY: 8, scarfY: 7 }),
      buildFrame(w, NOVA_COIL, { dy: 0, scarfB: true, boosterY: 7, scarfY: 7 }),
      buildFrame(w, NOVA_STAND, { dy: -1, boosterY: 8, scarfY: 7 }),
      buildFrame(w, NOVA_COIL, { dy: 1, scarfB: true, boosterY: 7, scarfY: 7 }),
    ],
    150,
  );

  const run = anim(
    [
      buildFrame(w, NOVA_LEAP, { dy: -1, boosterY: 7, scarfY: 6 }),
      buildFrame(w, NOVA_LEAP, { dy: -1, dx: 1, scarfB: true, boosterY: 7, scarfY: 6 }),
      buildFrame(w, NOVA_COIL, { dy: 0, boosterY: 7, scarfY: 7 }),
      buildFrame(w, NOVA_COIL, { dy: 1, scarfB: true, boosterY: 7, scarfY: 7 }),
      buildFrame(w, NOVA_LEAP, { dy: 0, boosterY: 7, scarfY: 6 }),
      buildFrame(w, NOVA_LEAP, { dy: -1, scarfB: true, boosterY: 7, scarfY: 6 }),
    ],
    95,
  );

  const leap = anim(
    [
      buildFrame(w, NOVA_LEAP, { dy: -1, boosterY: 7, scarfY: 6 }),
      buildFrame(w, NOVA_LEAP, { dy: 0, scarfB: true, boosterY: 7, scarfY: 6 }),
      buildFrame(w, NOVA_COIL, { dy: 1, boosterY: 7, scarfY: 7 }),
      buildFrame(w, NOVA_COIL, { dy: 0, scarfB: true, boosterY: 7, scarfY: 7 }),
      buildFrame(w, NOVA_LEAP, { dy: 0, boosterY: 7, scarfY: 6 }),
    ],
    120,
  );

  const wiggle = anim(
    [
      buildFrame(w, NOVA_STAND, { dy: 0, boosterY: 8, scarfY: 7 }),
      buildFrame(w, NOVA_BOW, { dy: 0, scarfB: true, boosterY: 7, scarfY: 12 }),
      buildFrame(w, NOVA_BOW, { dy: 1, boosterY: 7, scarfY: 12 }),
      buildFrame(w, NOVA_STAND, { dy: -1, scarfB: true, boosterY: 8, scarfY: 7 }),
    ],
    140,
  );

  return makeSheet(W, H, { sleep, idle, walk, run, leap, wiggle });
}
