import type { SpriteSheet } from '../../contracts/art';
import type { Grid } from '../ascii';
import { anim, displace, makeSheet, shifted } from '../ascii';
import { art, fin, stack, stamp } from './small-util';

const W = 28;
const H = 16;
const L = { c: 16, t: 30 };
const P = [16, 30];

// Cheerful round comet head (11x11), placed at (15, 2) -> cols 15..25, rows 2..12
// Leaves >=1px margin even when bobbing +/-1px or wiggling +1px right!
const HEAD = art(
  [
    '...ccccc...',
    '..ccccccc..',
    '.ccccccccc.',
    'ccccccccccc',
    'cccc#ccc#cc',
    'cccc#ccc#cc',
    'ccccccccccc',
    'ccccc#c#ccc',
    '.ccccc#ccc.',
    '..ccccccc..',
    '...ccccc...',
  ],
  L,
);
const headOpen = HEAD;
const headBlink = stamp(HEAD, 0, 4, ['ccc#c#c#c#c', 'cccc#ccc#cc'], L);

// Tapered rainbow tail trail streaming left (cols 1..17, rows 2..12)
const TAIL = art(
  [
    '',
    '',
    '..............tttt',
    '...........ttttttt',
    '........tttttttttt',
    '.....t############',
    '...ttttttttttttttt',
    '..tttttttttttttttt',
    '...ttttttttttttttt',
    '.....t############',
    '........tttttttttt',
    '...........ttttttt',
    '..............tttt',
  ],
  L,
  W,
);

function wave(amp: number, phase: number): Grid {
  return displace(
    TAIL,
    () => true,
    () => 0,
    (x, y) => {
      const dy = Math.round(amp * ((17 - x) / 17) * Math.sin(x * 0.45 + phase));
      // Keep inside y=2..13 so +1px float bob stays inside 1..14 (1px ink margin!)
      const ny = y + dy;
      if (ny < 2) return 2 - y;
      if (ny > 13) return 13 - y;
      return dy;
    },
  );
}

function comet(tail: Grid, head: Grid, hy: number, hx = 0, sp = 0): Grid {
  const g = stack(W, H, [tail, 0, 0], [head, 15 + hx, 2 + hy]);
  const big = ['.#.', '###', '.#.'];
  const tiny = ['#'];
  const a = sp % 2 === 0 ? big : tiny;
  const b = sp % 2 === 0 ? tiny : big;
  const s1 = stamp(g, a === big ? 4 : 5, a === big ? 1 : 2, a);
  return stamp(s1, b === big ? 6 : 7, b === big ? 12 : 13, b);
}

export function buildComet(): SpriteSheet {
  const f = (g: Grid) => fin(g, P);
  const phases = [0, 1.6, 3.1, 4.7];
  const float = phases.map((p, i) => f(shifted(comet(wave(1.1, p), headOpen, 0, 0, i), 0, i === 1 ? -1 : i === 3 ? 1 : 0)));
  const wig = phases.map((p, i) => f(comet(wave(1.6, p * 1.5), headOpen, i % 2 ? -1 : 0, i % 2 ? 1 : 0, i)));
  const idle = [0, 1, 2, 3, 4].map((i) => f(comet(wave(0.9, i * 1.26), i === 2 ? headBlink : headOpen, 0, 0, i)));
  return makeSheet(W, H, {
    float: anim(float, 180),
    wiggle: anim(wig, 100),
    idle: anim(idle, 220),
  });
}
