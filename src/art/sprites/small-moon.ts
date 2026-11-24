import type { SpriteFrame, SpriteSheet } from '../../contracts/art';
import type { Grid } from '../ascii';
import { anim, makeSheet, shifted } from '../ascii';
import { art, fin, stack, stamp } from './small-util';

const W = 20;
const H = 16;
const L = { c: 17 };
const P = [17];

// Sleepy cuddly moon-cat head + tiny ears (9x9), placed at (10, 3) -> cols 10..18, rows 3..11
const HEAD_SLEEP = art(
  [
    '.c.....c.',
    '.cc...cc.',
    'ccccccccc',
    'ccccccccc',
    'c#c#c#c#c',
    'cc#ccc#cc',
    'cccc#cccc',
    'ccccccccc',
    '.ccccccc.',
  ],
  L,
);
const headOpen = stamp(HEAD_SLEEP, 0, 4, ['cc#ccc#cc', 'cc#ccc#cc'], L);
const headPeekOne = stamp(HEAD_SLEEP, 0, 4, ['c#c#cc#cc', 'cc#ccc#cc'], L); // one sleepy eye peeking!
const headEarTwitch = stamp(headOpen, 0, 0, ['.c......c', '.cc....cc'], L); // right ear flicks

// Plump cozy loaf body (cols 1..17, rows 7..14) with a crescent moon marking on the flank
const BODY0 = art(
  [
    '', '', '', '', '', '', '',
    '....cccccc',
    '...cccccccc',
    '..ccccccccc',
    '..cccccccccccccccc',
    '.ccccccccccccccccc',
    '.ccccccccccccccccc',
    '.ccccccccccccccccc',
    '..ccccccccccccccc',
  ],
  L,
  W,
);
const MOON = stamp(BODY0, 4, 9, ['.##', '#..', '#..', '.##'], L);
const BODY_BREATHE = stamp(MOON, 0, 6, ['.....ccccc', '....ccccccc'], L);
const PAWS = (b: Grid) => stamp(b, 0, 13, ['..............#', '..............#'], L);
const body0 = PAWS(MOON);
const body1 = PAWS(BODY_BREATHE);

// Curled tail variants (cols 1..4, rows 5..10)
const TAIL = [
  art(['', '', '', '', '', '.ccc', '.c', '.c', '.c', '.c', '.c'], L, W),
  art(['', '', '', '', '', '..ccc', '..c', '..c', '.cc', '.c', '.c'], L, W),
  art(['', '', '', '', '', '', '.ccc', '.c', '.c', '.c', '.c'], L, W),
  art(['', '', '', '', '', '..cc', '.cc', '.c', '.c', '.c', '.c'], L, W),
];

// Cozy floating Z's well clear of ears and tail
const Z_TINY = ['##', '.#', '##'];

function cat(body: Grid, head: Grid, tail: Grid, dy = 0, hx = 0, hy = 0): Grid {
  return shifted(stack(W, H, [tail, 0, 0], [body, 0, 0], [head, 10 + hx, 3 + hy]), 0, dy);
}

function zs(g: Grid, a: boolean, b: boolean): Grid {
  let o = g;
  if (a) o = stamp(o, 5, 2, Z_TINY);
  if (b) o = stamp(o, 8, 0, Z_TINY);
  return o;
}

export function buildMoonCat(): SpriteSheet {
  const f = (g: Grid): SpriteFrame => fin(g, P);

  // sleep (4 frames): gentle loaf breathing + floating Z's
  const sleep = [
    f(cat(body0, HEAD_SLEEP, TAIL[0] as Grid)),
    f(zs(cat(body1, HEAD_SLEEP, TAIL[0] as Grid), true, false)),
    f(zs(cat(body1, HEAD_SLEEP, TAIL[3] as Grid), true, true)),
    f(zs(cat(body0, HEAD_SLEEP, TAIL[3] as Grid), false, true)),
  ];

  // wiggle (4 frames): happy bouncy loaf + wagging tail
  const wiggle = [
    f(cat(body0, headOpen, TAIL[0] as Grid)),
    f(cat(body0, headOpen, TAIL[1] as Grid, 0, 0, -1)),
    f(cat(body0, headEarTwitch, TAIL[2] as Grid)),
    f(cat(body0, headOpen, TAIL[1] as Grid, 0, 0, -1)),
  ];

  // peek (5 frames): curled asleep -> one eye peeks open -> head pops up curious -> ear twitch -> cozy settle
  const peek = [
    f(cat(body0, HEAD_SLEEP, TAIL[2] as Grid, 0, 0, 1)),
    f(cat(body0, headPeekOne, TAIL[0] as Grid, 0, 0, 1)),
    f(cat(body0, headOpen, TAIL[1] as Grid, 0, 0, -1)),
    f(cat(body0, headEarTwitch, TAIL[1] as Grid, 0, 0, -1)),
    f(cat(body0, headPeekOne, TAIL[3] as Grid, 0, 0, 0)),
  ];

  // idle (4 frames): alert loaf -> tail swish -> slow sleepy blink -> ear twitch
  const idle = [
    f(cat(body0, headOpen, TAIL[0] as Grid)),
    f(cat(body0, headOpen, TAIL[3] as Grid)),
    f(cat(body0, HEAD_SLEEP, TAIL[0] as Grid)),
    f(cat(body0, headEarTwitch, TAIL[1] as Grid)),
  ];

  // float (4 frames): gentle lunar levitation bob (stays inside y=1..14)
  const float = [
    f(cat(body0, headOpen, TAIL[0] as Grid, 0)),
    f(cat(body0, headOpen, TAIL[3] as Grid, -1)),
    f(cat(body0, headOpen, TAIL[1] as Grid, -2)),
    f(cat(body0, headOpen, TAIL[3] as Grid, -1)),
  ];

  return makeSheet(W, H, {
    sleep: anim(sleep, 420),
    wiggle: anim(wiggle, 130),
    peek: anim(peek, 220),
    idle: anim(idle, 260),
    float: anim(float, 240),
  });
}
