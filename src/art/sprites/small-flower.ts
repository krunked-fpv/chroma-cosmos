import type { SpriteSheet } from '../../contracts/art';
import type { Grid } from '../ascii';
import { anim, makeSheet } from '../ascii';
import { art, fin, stack } from './small-util';

const W = 14;
const H = 20;
const L = { p: 26, c: 27, s: 28 };
const P = [27, 26, 28];

// Four-petal cosmic bloom (10x11) with sunny yellow centre and crisp petal notches
const HEAD = art(
  [
    '.ppp..ppp.',
    'pppp##pppp',
    'pppppppppp',
    '.#ppccpp#.',
    'pppccccppp',
    'pppccccppp',
    'pppccccppp',
    '.#ppccpp#.',
    'pppppppppp',
    'pppp##pppp',
    '.ppp..ppp.',
  ],
  L,
);

// Stem + two leaves (rows 12..18, leaving y=19 for the bottom ink outline)
const STEM = art(
  [
    '', '', '', '', '', '', '', '', '', '', '', '',
    '......ss......',
    '......ss......',
    '......ss..sss.',
    '......ssssss..',
    '.sss..sssss...',
    '..sssssss.....',
    '......ss......',
  ],
  L,
  W,
);

const STEM_UP = art(
  [
    '', '', '', '', '', '', '', '', '', '', '', '',
    '......ss......',
    '......ss......',
    '......ss.sss..',
    '......ssssss..',
    '..ss..ssss....',
    '.sssssss......',
    '......ss......',
  ],
  L,
  W,
);

function frame(stem: Grid, dx: number, dy: number, head: Grid = HEAD): Grid {
  return stack(W, H, [stem, 0, 0], [head, 2 + dx, 2 + dy]);
}

export function buildFlower(): SpriteSheet {
  const f = (g: Grid) => fin(g, P);

  // idle (4 frames): gentle breeze sway center -> right -> center -> left
  const idle = [
    f(frame(STEM, 0, 0)),
    f(frame(STEM_UP, 1, 0)),
    f(frame(STEM, 0, 0)),
    f(frame(STEM_UP, -1, 0)),
  ];

  // wiggle (4 frames): lively dance sway with squash & bounce
  const wiggle = [
    f(frame(STEM, 1, -1)),
    f(frame(STEM_UP, 0, 1)),
    f(frame(STEM, -1, -1)),
    f(frame(STEM_UP, 0, 1)),
  ];

  // bounce (5 frames): squash -> spring up -> peak -> settle -> rest
  const bounce = [
    f(frame(STEM, 0, 0)),
    f(frame(STEM, 0, 1)),
    f(frame(STEM_UP, 0, -1)),
    f(frame(STEM_UP, 0, 0)),
    f(frame(STEM, 0, 1)),
  ];

  return makeSheet(W, H, {
    idle: anim(idle, 260),
    wiggle: anim(wiggle, 110),
    bounce: anim(bounce, 120),
  });
}
