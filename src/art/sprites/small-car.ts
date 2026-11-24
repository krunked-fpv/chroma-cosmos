import type { SpriteSheet } from '../../contracts/art';
import type { Grid } from '../ascii';
import { anim, makeSheet, shifted } from '../ascii';
import { art, fin, stack, stamp } from './small-util';

const W = 32;
const H = 16;
const L = { r: 24, t: 25 };
const P = [25, 24];

// Cute round-nosed retro-cosmic comet racer facing RIGHT (cols 8..30, rows 2..14).
// Plump coral body (r), bubble canopy dome (t), glowing nose headlight (t),
// crisp round ink tires with bright cyan hubcaps (t).
const CAR = art(
  [
    '................................', // 0
    '................................', // 1
    '...............tttttt...........', // 2 bubble canopy dome
    '..............tttttttt..........', // 3
    '........rr...tttttttttt.........', // 4 rear fin + windshield
    '........rrrrtttttttttttt........', // 5
    '........rrrrrrrrrrrrrrrrrr......', // 6 sleek rounded hood
    '........rrrrrrrrrrrrrrrrrrrrt...', // 7 rounded nose + headlight
    '........rrrrrrrrrrrrrrrrrrrtt...', // 8
    '........rrrrrrrrrrrrrrrrrrrrt...', // 9
    '........rrrrrrrrrrrrrrrrrrrr....', // 10 lower chassis
    '.........rr###rrrrrrrrr###rr....', // 11 wheel wells
    '..........#ttt#.......#ttt#.....', // 12 round wheels + cyan hubs
    '..........#ttt#.......#ttt#.....', // 13
    '...........###.........###......', // 14 tire bottoms
    '................................', // 15
  ],
  L,
  W,
);

// Tapered cosmic comet-jet flame streaming left behind the exhaust (cols 1..7, rows 6..11)
const FLAME_SHORT = art(
  [
    '', '', '', '', '', '',
    '.....ttt', // 6
    '...ttttt', // 7
    '..tttttt', // 8
    '...ttttt', // 9
    '.....ttt', // 10
  ],
  L,
  W,
);

const FLAME_MED = art(
  [
    '', '', '', '', '', '',
    '....tttt', // 6
    '..tttttt', // 7
    '.ttttttt', // 8
    '...ttttt', // 9
    '....tttt', // 10
  ],
  L,
  W,
);

const FLAME_LONG = art(
  [
    '', '', '', '', '', '',
    '...ttttt', // 6
    '..tttttt', // 7
    '.ttttttt', // 8
    '..tttttt', // 9
    '...ttttt', // 10
  ],
  L,
  W,
);

// Animated wheel spoke + canopy gleam + trailing comet spark
function details(g: Grid, wheelStep: number, spark: 0 | 1 | 2): Grid {
  const dx = wheelStep % 3;
  const dy = Math.floor(wheelStep / 2) % 2;
  let o = stamp(g, 11 + dx, 12 + dy, ['#']);
  o = stamp(o, 23 + dx, 12 + dy, ['#']);
  // Diagonal windshield shine + cute little racing number dot on door
  o = stamp(o, 16, 3, ['#.', '.#']);
  o = stamp(o, 17, 8, ['##']);
  if (spark === 1) o = stamp(o, 2, 4, ['#']);
  if (spark === 2) o = stamp(o, 1, 12, ['#']);
  return o;
}

function carFrame(flame: Grid, bodyDy: number, wheelStep: number, spark: 0 | 1 | 2): Grid {
  const car = shifted(details(CAR, wheelStep, 0), 0, bodyDy);
  const fl = shifted(flame, 0, bodyDy);
  const g = stack(W, H, [fl, 0, 0], [car, 0, 0]);
  if (spark === 1) return stamp(g, 2, 4, ['#']);
  if (spark === 2) return stamp(g, 2, 12, ['#']);
  return g;
}

export function buildCometCar(): SpriteSheet {
  const f = (g: Grid) => fin(g, P);

  // run (4 frames): spinning wheels, energetic pulsing comet flame & speed bounce
  const run = [
    f(carFrame(FLAME_LONG, 0, 0, 1)),
    f(carFrame(FLAME_MED, -1, 1, 2)),
    f(carFrame(FLAME_LONG, 0, 2, 1)),
    f(carFrame(FLAME_SHORT, -1, 3, 2)),
  ];

  // idle (4 frames): gentle engine purr & soft flame flicker
  const idle = [
    f(carFrame(FLAME_MED, 0, 0, 0)),
    f(carFrame(FLAME_SHORT, -1, 0, 1)),
    f(carFrame(FLAME_MED, 0, 0, 0)),
    f(carFrame(FLAME_SHORT, 0, 0, 2)),
  ];

  // wiggle (4 frames): excited revving hop & flame bursts
  const wiggle = [
    f(carFrame(FLAME_SHORT, 0, 0, 0)),
    f(carFrame(FLAME_LONG, -1, 1, 1)),
    f(carFrame(FLAME_MED, 0, 2, 2)),
    f(carFrame(FLAME_LONG, -1, 3, 1)),
  ];

  return makeSheet(W, H, {
    run: anim(run, 100),
    idle: anim(idle, 240),
    wiggle: anim(wiggle, 110),
  });
}
