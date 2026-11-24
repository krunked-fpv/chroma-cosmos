import type { SpriteSheet } from '../../contracts/art';
import type { Grid } from '../ascii';
import { anim, displace, makeSheet } from '../ascii';
import { art, fin, stack, stamp } from './small-util';

const W = 44;
const H = 34;
const L = { b: 22, a: 23 };
const P = [23, 22];

// Graceful cosmic gazelle head, twin sweeping curved horns (a), flowing ribbon mane (a),
// and sleek slender S-curved neck (b) that flows seamlessly into the chest.
// Placed at canvas (18, 3) -> cols 18..38, rows 3..18 (leaves 3px headroom at top!).
const HEAD = art(
  [
    '....aa...aa............', // 0 (y=3) twin curved horn tips
    '.....aa...aa...........', // 1 (y=4)
    '......aa...aa..........', // 2 (y=5)
    '.......aa..aa..........', // 3 (y=6)
    '.......aaa.aa..........', // 4 (y=7) horn bases
    '......a.aaabbbb........', // 5 (y=8) alert ear + forehead
    '.....aaabbbbbbbbb......', // 6 (y=9) crown + nose bridge
    '....aaaabbbb##bbbb.....', // 7 (y=10) sweet dark eye + dainty snout
    '...aaaaabbbbbbbbbbb....', // 8 (y=11) slender muzzle
    '..aaaaaabbbbbbbb.......', // 9 (y=12) clean dainty chin
    '..aaaaaabbbbb..........', // 10 (y=13) sleek slender neck (cols 26..30)
    '.aaaaaaabbbbb..........', // 11 (y=14) flowing mane + neck
    '.aaaaaaabbbbb..........', // 12 (y=15)
    '..aaaaabbbbbb..........', // 13 (y=16) smooth neck base (cols 25..30)
    '...aaaabbbbbbb.........', // 14 (y=17) flows cleanly into chest (cols 25..31)
    '......bbbbbbbb.........', // 15 (y=18) seamless chest join (cols 24..31)
  ],
  L,
);

const HEAD_BLINK = stamp(HEAD, 12, 7, ['##']);
const HEAD_HAPPY = stamp(HEAD, 12, 6, ['##', 'bb'], L);

// Sleek athletic gazelle torso + graceful streaming tail (a).
// Placed at canvas (4, 16) -> cols 4..31, rows 16..24.
const TORSO = art(
  [
    '...aaaa....................', // 0 (y=16) graceful streaming tail
    '..aaaaaa..bbbbbbb..........', // 1 (y=17) rump + sleek back
    '.aaaaaaabbbbbbbbbbbbbbb....', // 2 (y=18) joins neck cleanly at cols 24..26
    '..aaaa.bbbbbbbbbbbbbbbbbbb.', // 3 (y=19) smooth chest at col 30
    '...aa..bbbbbbbbbbbbbbbbbbb.', // 4 (y=20)
    '.......bbbbbbbbbbbbbbbbbbb.', // 5 (y=21) slender ribcage
    '........bbbbbbbbbbbbbbbbb..', // 6 (y=22) tucked graceful waist
    '........bbbbbb......bbbb...', // 7 (y=23) hip & shoulder sockets
  ],
  L,
);

// Slender gazelle legs in full 44x34 canvas coords (rows 23..31)
const LEGS_STAND = art(
  [
    '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '',
    '............bb..bb.......bb..bb.............', // 23
    '............bb..bb.......bb..bb.............', // 24
    '...........bb...bb.......bb..bb.............', // 25
    '...........bb...bb.......bb..bb.............', // 26
    '...........bb...bb.......bb..bb.............', // 27
    '...........bb...bb.......bb..bb.............', // 28
    '...........aa...aa.......aa..aa.............', // 29 hooves
    '...........aa...aa.......aa..aa.............', // 30
    '...........aaa..aaa......aaa.aaa............', // 31
  ],
  L,
  W,
);

const LEGS_WALK_1 = art(
  [
    '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '',
    '...........bb..bb........bb..bb.............', // 23
    '..........bb...bb.......bb...bb.............', // 24
    '..........bb....bb......bb....bb............', // 25
    '.........bb.....bb......bb.....bb...........', // 26
    '.........bb.....bb......bb.....bb...........', // 27
    '........bb......aa......bb.....aa...........', // 28
    '........aa......aaa....aa......aaa..........', // 29
    '........aa.............aa...................', // 30
    '........aaa............aaa..................', // 31
  ],
  L,
  W,
);

const LEGS_WALK_2 = art(
  [
    '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '',
    '............bb..bb.......bb..bb.............', // 23
    '............bb..bb.......bb..bb.............', // 24
    '............bb..bb......bb...bb.............', // 25
    '............bb..bb......bb...bb.............', // 26
    '............bb..aa......bb...bb.............', // 27
    '............bb..aaa.....aa...bb.............', // 28
    '............aa..........aaa..aa.............', // 29
    '............aa...............aa.............', // 30
    '............aaa..............aaa............', // 31
  ],
  L,
  W,
);

const LEGS_WALK_3 = art(
  [
    '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '',
    '............bb..bb.......bb..bb.............', // 23
    '...........bb...bb......bb...bb.............', // 24
    '...........bb....bb.....bb....bb............', // 25
    '..........bb.....bb....bb......bb...........', // 26
    '..........bb.....bb....bb......aa...........', // 27
    '..........aa.....bb....bb......aaa..........', // 28
    '..........aaa....aa....aa...................', // 29
    '.................aa....aa...................', // 30
    '.................aaa...aaa..................', // 31
  ],
  L,
  W,
);

const LEGS_DRIVE = art(
  [
    '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '',
    '...........bb..bb.........bb..bb............', // 23
    '..........bb...bb..........bb..bb...........', // 24
    '.........bb....bb...........bb..bb..........', // 25
    '........bb.....bb............aa..bb.........', // 26
    '.......bb......bb............aaa..aa........', // 27
    '......bb.......aa.................aaa.......', // 28
    '......aa.......aaa..........................', // 29
    '......aa....................................', // 30
    '......aaa...................................', // 31
  ],
  L,
  W,
);

const LEGS_EXTEND = art(
  [
    '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '',
    '..........bb..bb...........bb..bb...........', // 23
    '........bbb....bb...........bb..bb..........', // 24
    '......bbb.......bb...........bb..bb.........', // 25
    '.....bb..........bb...........bb..bb........', // 26
    '....aa...........aa............aa..bb.......', // 27
    '...aaa...........aaa...........aaa..aa......', // 28
    '....................................aaa.....', // 29
  ],
  L,
  W,
);

const LEGS_SOAR = art(
  [
    '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '',
    '.........bb..bb.............bb..bb..........', // 23
    '.......bbb....bb.............bb..bb.........', // 24
    '.....bbb.......bb.............bb..bb........', // 25
    '....aa..........aa.............aa..bb.......', // 26
    '...aaa..........aaa............aaa..aa......', // 27
    '....................................aaa.....', // 28
  ],
  L,
  W,
);

const LEGS_TUCK = art(
  [
    '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '',
    '............bbb...........bbb...............', // 23
    '.............bbb.........bbb................', // 24
    '..............bbb.......bbb.................', // 25
    '...............bbb.....bbb..................', // 26
    '................aa..bb..aa..................', // 27
    '................aaa.aa.aaa..................', // 28
    '....................aaa.....................', // 29
  ],
  L,
  W,
);

const LEGS_STRIKE = art(
  [
    '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '',
    '...........bb..bb.........bb..bb............', // 23
    '..........bb...bb..........bb..bb...........', // 24
    '.........bb....aa..........bb...bb..........', // 25
    '........aa.....aaa.........bb...bb..........', // 26
    '........aaa................bb...bb..........', // 27
    '...........................aa...bb..........', // 28
    '...........................aaa..aa..........', // 29
    '................................aaa.........', // 30
  ],
  L,
  W,
);

const LEGS_CROUCH = art(
  [
    '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '',
    '...........bb..bb........bb..bb.............', // 23
    '..........bb...bb.......bb...bb.............', // 24
    '.........bb....bb......bb....bb.............', // 25
    '..........bb..bb........bb..bb..............', // 26
    '..........bb..bb........bb..bb..............', // 27
    '..........aa..aa........aa..aa..............', // 28
    '..........aaa.aaa.......aaa.aaa.............', // 29
  ],
  L,
  W,
);

// Gentle wind wave for the flowing mane & wispy tail (keeps horns & hooves rock-solid)
function waveMane(g: Grid, phase: number, amp = 1): Grid {
  return displace(
    g,
    (v) => v === 23,
    (x, y) => {
      if (y < 10 || y > 21 || x > 25) return 0;
      return Math.round(Math.sin(y * 0.65 + phase) * amp);
    },
    (x, y) => {
      if (y < 14 || y > 21 || x > 12) return 0;
      return Math.round(Math.cos(x * 0.5 + phase) * 0.8 * amp);
    },
  );
}

// Note layer order: legs -> head -> torso OR legs -> torso -> head.
// Putting head BEFORE torso lets the torso's smooth back/chest overlap the bottom of the mane cleanly!
function pose(legs: Grid, dy: number, hx: number, hy: number, head: Grid, phase: number, amp = 1): Grid {
  const g = stack(W, H, [legs, 0, dy], [head, 18 + hx, 3 + hy + dy], [TORSO, 4, 16 + dy]);
  return amp === 0 ? g : waveMane(g, phase, amp);
}

export function buildGazelle(): SpriteSheet {
  const f = (g: Grid) => fin(g, P);

  // idle (4 frames): poised slender stance, gentle mane flutter + blink
  const idle = [
    f(pose(LEGS_STAND, 0, 0, 0, HEAD, 0, 0)),
    f(pose(LEGS_STAND, 0, 0, 1, HEAD, 1.5, 1)),
    f(pose(LEGS_STAND, 0, 0, 0, HEAD_BLINK, 3.1, 1)),
    f(pose(LEGS_STAND, 0, 0, 0, HEAD, 4.7, 1)),
  ];

  // walk (4 frames): graceful 4-beat stride
  const walk = [
    f(pose(LEGS_WALK_1, 0, 0, 0, HEAD, 0, 1)),
    f(pose(LEGS_WALK_2, -1, 0, 0, HEAD, 1.6, 1)),
    f(pose(LEGS_WALK_3, 0, 1, 0, HEAD, 3.1, 1)),
    f(pose(LEGS_STAND, -1, 0, 0, HEAD, 4.7, 1)),
  ];

  // run (6 frames): fluid cosmic gazelle gallop
  const run = [
    f(pose(LEGS_DRIVE, 0, 1, 1, HEAD, 0.0, 1)),
    f(pose(LEGS_EXTEND, -1, 1, 0, HEAD, 1.0, 1)),
    f(pose(LEGS_SOAR, -2, 1, 0, HEAD, 2.1, 1)),
    f(pose(LEGS_TUCK, -1, 0, 1, HEAD, 3.1, 1)),
    f(pose(LEGS_STRIKE, 0, 0, 1, HEAD, 4.2, 1)),
    f(pose(LEGS_CROUCH, 1, 0, 1, HEAD, 5.2, 1)),
  ];

  // leap (5 frames): crouch -> launch -> soaring cosmic arc -> descent -> soft land
  const leap = [
    f(pose(LEGS_CROUCH, 1, -1, 1, HEAD, 0, 1)),
    f(pose(LEGS_DRIVE, -1, 1, 0, HEAD, 1.3, 1)),
    f(pose(LEGS_SOAR, -2, 1, 0, HEAD_HAPPY, 2.6, 1)),
    f(pose(LEGS_STRIKE, -1, 1, 0, HEAD, 4.0, 1)),
    f(pose(LEGS_STAND, 0, 0, 1, HEAD, 5.2, 1)),
  ];

  // wiggle (4 frames): playful prancing hop & happy eye
  const wiggle = [
    f(pose(LEGS_STAND, 0, 0, 0, HEAD_HAPPY, 0.5, 1)),
    f(pose(LEGS_TUCK, -1, -1, 0, HEAD_HAPPY, 2.0, 1)),
    f(pose(LEGS_STAND, 0, 1, 0, HEAD_HAPPY, 3.6, 1)),
    f(pose(LEGS_DRIVE, -1, 0, 0, HEAD, 5.0, 1)),
  ];

  return makeSheet(W, H, {
    idle: anim(idle, 260),
    walk: anim(walk, 160),
    run: anim(run, 105),
    leap: anim(leap, 130),
    wiggle: anim(wiggle, 130),
  });
}
