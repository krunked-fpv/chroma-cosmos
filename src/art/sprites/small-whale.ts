import type { SpriteSheet } from '../../contracts/art';
import type { Grid } from '../ascii';
import { anim, displace, makeSheet, shifted } from '../ascii';
import { art, fin, stack, stamp } from './small-util';

const W = 64;
const H = 32;
const L = { w: 19, b: 29 };
const P = [29, 19];

// Plump cosmic star-whale facing RIGHT (rows y=6..26, cols x=1..62)
// Tail flukes on left (x=2..14), plump arched back + cute snout on right (x=20..61),
// curved pale belly (b) along underside (x=24..59)
const BODY = art(
  [
    '................................................................', // 0
    '................................................................', // 1
    '................................................................', // 2
    '................................................................', // 3
    '................................................................', // 4
    '................................................................', // 5
    '...................................wwwwwwwwwwwwwww..............', // 6
    '..............................wwwwwwwwwwwwwwwwwwwwwwww..........', // 7
    '...........................wwwwwwwwwwwwwwwwwwwwwwwwwwwwww.......', // 8
    '....wwww.................wwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwww.....', // 9
    '...wwwwww...............wwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwww....', // 10
    '..wwwwwwww.............wwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwww...', // 11
    '...wwwwwwww...........wwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwww..', // 12
    '.....wwwwwww.........wwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwww.', // 13
    '.......wwwwww.......wwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwww.', // 14
    '........wwwwwww...wwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwww.', // 15
    '.........wwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwww.', // 16
    '........wwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwww.', // 17
    '.......wwwwww..wwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwww.', // 18
    '.....wwwwwww....wwwwwwwwwwwwwwwwwwwwwwwwwwwwwbbbbbbbbbbbbbbbbbb.', // 19
    '....wwwwwww.......wwwwwwwwwwwwwwwwwwwbbbbbbbbbbbbbbbbbbbbbbbbbb.', // 20
    '...wwwwwww..........wwwwwwwwwwwwwbbbbbbbbbbbbbbbbbbbbbbbbbbbbb..', // 21
    '...wwwww..............wwwwwwwwwbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb...', // 22
    '..........................wbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb....', // 23
    '............................bbbbbbbbbbbbbbbbbbbbbbbbbbbbbb......', // 24
    '...............................bbbbbbbbbbbbbbbbbbbbbbbb.........', // 25
    '....................................bbbbbbbbbbbbbb..............', // 26
  ],
  L,
  W,
);

// Cute pectoral fin (in belly/fin id 29) layered over the lower flank with a subtle ink crease
const FIN_DOWN = art(
  [
    '....#bbbbbb.',
    '...#bbbbbbb.',
    '..bbbbbbbbb.',
    '.bbbbbbbb...',
    '.bbbbbb.....',
    '..bbbb......',
  ],
  L,
);

const FIN_MID = art(
  [
    '...#bbbbbbb.',
    '..#bbbbbbbb.',
    '.bbbbbbbbb..',
    '..bbbbbbb...',
    '...bbbb.....',
  ],
  L,
);

const FIN_UP = art(
  [
    '..#bbbbbbbb.',
    '.#bbbbbbbbb.',
    '..bbbbbbbb..',
    '....bbbbb...',
  ],
  L,
);

// Star markings & cute face details stamped onto the body
function decorate(g: Grid, eye: 'open' | 'blink' | 'happy', spout: 0 | 1 | 2 | 3): Grid {
  let o = g;
  // Sparkle stars on cosmic whale's flank
  o = stamp(o, 29, 11, ['.#.', '###', '.#.']);
  o = stamp(o, 36, 9, ['#']);
  o = stamp(o, 24, 15, ['#']);
  // Cute eye (x=51, y=14)
  if (eye === 'open') {
    o = stamp(o, 50, 13, ['.##.', '##w#', '####', '.##.'], L);
  } else if (eye === 'blink') {
    o = stamp(o, 50, 15, ['####', '.##.']);
  } else {
    o = stamp(o, 50, 14, ['.##.', '#..#']);
  }
  // Happy curved smile near the snout seam
  o = stamp(o, 55, 18, ['..###', '##...']);
  // Gentle ink water-star spout above blowhole (x=47..55, y=1..5)
  if (spout === 1) {
    o = stamp(o, 47, 3, ['..#.#..', '...#...', '...#...']);
  } else if (spout === 2) {
    o = stamp(o, 46, 1, ['.#...#.', '#..#..#', '...#...', '...#...', '...#...']);
  } else if (spout === 3) {
    o = stamp(o, 45, 1, ['#.....#', '..#.#..', '...#...', '...#...']);
  }
  return o;
}

/** Gently wave the whale's tail (left side x < 24) and add subtle vertical bob */
function swimPose(phase: number, amp: number, finGrid: Grid, finY: number, eye: 'open' | 'blink' | 'happy', spout: 0 | 1 | 2 | 3, bobY = 0): Grid {
  const waved = displace(
    BODY,
    () => true,
    () => 0,
    (x) => {
      if (x >= 26) return 0;
      const t = (26 - x) / 24;
      return Math.sin(phase + t * 1.4) * amp * t * t;
    },
  );
  const withFin = stack(W, H, [waved, 0, 0], [finGrid, 35, finY]);
  return shifted(decorate(withFin, eye, spout), 0, bobY);
}

export function buildWhale(): SpriteSheet {
  const f = (g: Grid) => fin(g, P);

  // swim: 6 smooth frames (full sinusoidal tail beat + fin paddle + spout cycle)
  const swim = [
    f(swimPose(0.0, 2.8, FIN_MID, 23, 'open', 1, 0)),
    f(swimPose(1.05, 2.8, FIN_DOWN, 23, 'open', 2, -1)),
    f(swimPose(2.1, 2.8, FIN_DOWN, 24, 'open', 3, -1)),
    f(swimPose(3.14, 2.8, FIN_MID, 23, 'open', 1, 0)),
    f(swimPose(4.19, 2.8, FIN_UP, 22, 'open', 2, 1)),
    f(swimPose(5.24, 2.8, FIN_MID, 22, 'open', 0, 0)),
  ];

  // idle: 4 gentle floating frames with a blink
  const idle = [
    f(swimPose(0.0, 1.2, FIN_MID, 23, 'open', 1, 0)),
    f(swimPose(1.57, 1.2, FIN_DOWN, 23, 'open', 2, -1)),
    f(swimPose(3.14, 1.2, FIN_MID, 23, 'blink', 1, 0)),
    f(swimPose(4.71, 1.2, FIN_UP, 22, 'open', 0, 1)),
  ];

  // wiggle: 4 joyful bouncy frames with happy eye and lively spout
  const wiggle = [
    f(swimPose(0.8, 3.2, FIN_UP, 22, 'happy', 2, -1)),
    f(swimPose(2.4, 3.2, FIN_DOWN, 24, 'happy', 3, 1)),
    f(swimPose(4.0, 3.2, FIN_UP, 22, 'happy', 2, -1)),
    f(swimPose(5.6, 3.2, FIN_DOWN, 24, 'open', 1, 1)),
  ];

  return makeSheet(W, H, {
    swim: anim(swim, 160),
    idle: anim(idle, 280),
    wiggle: anim(wiggle, 130),
  });
}
