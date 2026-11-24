/**
 * Luminous Starlight Wisp — Wanderlings-style glowing cosmos/forest spirit sprite (18x18).
 * Uses system regions:
 *   231 = fx_wisp_core (warm luminous cream-gold orb)
 *   232 = fx_wisp_aura (iridescent amber-lavender halo, wing wisps & lantern-mote tail)
 *   212 = eye_shine    (twinkly starlight eye glints & tiny sparkle motes)
 *     0 = ink          (delicate 1px deep-indigo contour rim & expressive tiny spirit eyes)
 *   255 = transparent
 */
import type { SpriteFrame, SpriteSheet } from '../../contracts/art';
import { anim, parseGrid, type Legend } from '../ascii';

const W = 18;
const H = 18;

const LEG: Legend = {
  C: 231, // fx_wisp_core
  A: 232, // fx_wisp_aura
  E: 212, // eye_shine
};

function frame(rows: readonly string[]): SpriteFrame {
  if (rows.length !== H) throw new Error(`wisp frame expected ${H} rows, got ${rows.length}`);
  for (let i = 0; i < rows.length; i++) {
    const r = rows[i] as string;
    if (r.length !== W) throw new Error(`wisp row ${i} expected width ${W}, got ${r.length}`);
  }
  const g = parseGrid(rows, LEG);
  return { w: W, h: H, pixels: g.px };
}

// ------------------------------------------------------------------ IDLE (6 frames, 18x18)
// Crisp 1px deep-indigo contour framing crown, fairy wings, lantern body & tapered tail
// so the Wisp pops on bright cream cotton paper AND glows magically on dark indigo sky.

const IDLE_0 = frame([
  '........##........', // 0  crown flame tip rim
  '.......#AA#.......', // 1  glowing teardrop flame tuft
  '......#ACCA#......', // 2  luminous crown dome
  '.###.#ACCCCA#.###.', // 3  scalloped fairy wing tips
  '#AAA#AACCCCAA#AAA#', // 4  glowing wing lobes with delicate shoulder tuck
  '#AAAACCCCCCCCAAAA#', // 5  warm radiant body + full wingspan
  '.##ACCE#CCE#CCA##.', // 6  wide-set twinkly starlight eyes
  '..#ACC##CC##CCA#..', // 7  cozy spirit eyes + plump cheeks
  '..#ACCCCCCCCCCA#..', // 8  warm glowing lantern belly
  '...#AACCCCCCAA#...', // 9
  '....#AACCCCAA#....', // 10 smooth lantern waist taper
  '.....#AACCAA#.....', // 11
  '......#AAAA#......', // 12 tapered wisp tail root
  '.......#AA#.......', // 13
  '........##........', // 14 delicate tail point
  '......A....A......', // 15 floating lantern motes
  '.......C..E.......', // 16 tiny starlight sparkle mote
  '........A.........', // 17
]);

const IDLE_1 = frame([
  '.........##...E...', // 0  crown sways right + twinkle
  '.......##AA#......', // 1
  '.###..#ACCA#..###.', // 2  wings lift high!
  '#AAA##ACCCCA##AAA#', // 3
  '#AAAACCCCCCCCAAAA#', // 4
  '.##AACCCCCCCCAA##.', // 5
  '..#ACCE#CCE#CCA#..', // 6
  '..#ACC##CC##CCA#..', // 7
  '..#ACCCCCCCCCCA#..', // 8
  '...#AACCCCCCAA#...', // 9
  '....#AACCCCAA#....', // 10
  '.....#AACCAA#.....', // 11
  '.....#AAAA##......', // 12 tail sways left
  '......#AA#........', // 13
  '.......##.........', // 14
  '.....A....A.......', // 15
  '......C..A........', // 16
  '.......E..........', // 17
]);

const IDLE_2 = frame([
  '........##........', // 0  buoyant micro-rise (+1px) with intact crown rim
  '......##AA##......', // 1
  '.###.#ACCCCA#.###.', // 2  airy high wing glide
  '#AAA#AACCCCAA#AAA#', // 3
  '#AAAACCCCCCCCAAAA#', // 4
  '.##ACCE#CCE#CCA##.', // 5
  '..#ACC##CC##CCA#..', // 6
  '..#ACCCCCCCCCCA#..', // 7
  '...#AACCCCCCAA#...', // 8
  '....#AACCCCAA#....', // 9
  '.....#AACCAA#.....', // 10
  '......#AAAA#......', // 11
  '.......#AA#.......', // 12
  '........##........', // 13
  '.......A..A.......', // 14 trailing lantern stream
  '........C..A......', // 15
  '......E...A.......', // 16
  '.........A........', // 17
]);

const IDLE_3 = frame([
  '........##........', // 0  serene warm breath
  '.......#AA#.......', // 1
  '......#ACCA#......', // 2
  '.....#ACCCCA#.....', // 3
  '.###.#ACCCCA#.###.', // 4  relaxed mid-low wing poise
  '#AAA#AACCCCAA#AAA#', // 5
  '#AAAACCCCCCCCCAAA#', // 6  peaceful cozy blink!
  '.##ACC##CC##CCA##.', // 7  smiling closed eyes
  '..#ACCCCCCCCCCA#..', // 8
  '...#AACCCCCCAA#...', // 9
  '....#AACCCCAA#....', // 10
  '.....#AACCAA#.....', // 11
  '......##AAAA#.....', // 12 tail sways right
  '........#AA#......', // 13
  '.........##.......', // 14
  '.......A...A......', // 15
  '......E...C.......', // 16
  '..........A.......', // 17
]);

const IDLE_4 = frame([
  '...E...##.........', // 0  crown sways left + sparkle
  '......#AA##.......', // 1
  '......#ACCA#......', // 2
  '.....#ACCCCA#.....', // 3
  '....#AACCCCAA#....', // 4
  '.###AACCCCCCAA###.', // 5  wings sweep low!
  '#AA#CCE#CCE#CC#AA#', // 6  bright wide eyes with clean cheek clearance
  '#AAAACC##CC##CAAA#', // 7  low fluttering wing lobes
  '.##ACCCCCCCCCCA##.', // 8
  '...#AACCCCCCAA#...', // 9
  '....#AACCCCAA#....', // 10
  '.....#AACCAA#.....', // 11
  '......#AAAA#......', // 12
  '.......#AA#.......', // 13
  '........##........', // 14
  '.....A....A.......', // 15 twin golden firefly motes
  '......C..C........', // 16
  '........A.........', // 17
]);

const IDLE_5 = frame([
  '........##........', // 0  gentle settle back to IDLE_0
  '.......#AA#.......', // 1
  '......#ACCA#......', // 2
  '.....#ACCCCA#.....', // 3
  '.####AACCCCAA####.', // 4
  '#AAA#CCCCCCCC#AAA#', // 5
  '#AAACCE#CCE#CCAAA#', // 6
  '.##ACC##CC##CCA##.', // 7
  '..#ACCCCCCCCCCA#..', // 8
  '...#AACCCCCCAA#...', // 9
  '....#AACCCCAA#....', // 10
  '.....#AACCAA#.....', // 11
  '......#AAAA#......', // 12
  '.......#AA#.......', // 13
  '........##........', // 14
  '.......A...A......', // 15
  '......A...C.......', // 16
  '........E.........', // 17
]);

// ------------------------------------------------------------------ FLOAT (6 frames, 18x18)
// Graceful gliding flight with wind-swept flame crown, lively wingbeats, and comet-mote tail!

const FLOAT_0 = frame([
  '......##..........', // 0  wind-swept crown flame rim
  '.....#AA###.......', // 1
  '......#ACCA#......', // 2
  '.###.#ACCCCA#.###.', // 3  gliding wings
  '#AAA#AACCCCAA#AAA#', // 4
  '#AAAACCCCCCCCAAAA#', // 5
  '.##ACCE#CCE#CCA##.', // 6
  '..#ACC##CC##CCA#..', // 7
  '..#ACCCCCCCCCCA#..', // 8
  '...#AACCCCCCAA#...', // 9
  '....#AACCCCAA#....', // 10
  '....#AAACCAA#.....', // 11 trailing comet-tail lean
  '.....#AAAA##......', // 12
  '......#AA#........', // 13
  '.......##.........', // 14
  '...A.....C........', // 15 trailing comet-mote wake
  '..C..A............', // 16
  '.A...E............', // 17
]);

const FLOAT_1 = frame([
  '......###....E....', // 0  buoyant upward glide crest
  '.....#AAA###......', // 1
  '.###.#ACCCCA#.###.', // 2  high wingbeat
  '#AAA#AACCCCAA#AAA#', // 3
  '#AAAACCCCCCCCAAAA#', // 4
  '.##ACCE#CCE#CCA##.', // 5
  '..#ACC##CC##CCA#..', // 6
  '..#ACCCCCCCCCCA#..', // 7
  '...#AACCCCCCAA#...', // 8
  '....#AACCCCAA#....', // 9
  '....#AAACCAA#.....', // 10
  '.....#AAAA##......', // 11
  '......#AA#........', // 12
  '.......##.........', // 13
  '...A.....A........', // 14 sparkling lantern wake
  '..C..A............', // 15
  '....E..A..........', // 16
  '..A...............', // 17
]);

const FLOAT_2 = frame([
  '......##..........', // 0  sleek peak soar
  '.....#AA###.......', // 1
  '......#ACCA#......', // 2
  '.###.#ACCCCA#.###.', // 3  balanced gliding wings
  '#AAA#AACCCCAA#AAA#', // 4
  '.##ACCE#CCE#CCA##.', // 5
  '..#ACC##CC##CCA#..', // 6
  '..#ACCCCCCCCCCA#..', // 7
  '...#AACCCCCCAA#...', // 8
  '....#AACCCCAA#....', // 9
  '.....#AACCAA#.....', // 10
  '.....#AAAA##......', // 11
  '......#AA#........', // 12
  '.......##.........', // 13
  '....A....C........', // 14
  '..E..A............', // 15
  '...C..A...........', // 16
  '.....A............', // 17
]);

const FLOAT_3 = frame([
  '.......##.........', // 0  graceful mid-glide
  '......#AA##.......', // 1
  '......#ACCA#......', // 2
  '.....#ACCCCA#.....', // 3
  '....#AACCCCAA#....', // 4
  '.###AACCCCCCAA###.', // 5  wings sweep down-back
  '#AA#CCE#CCE#CC#AA#', // 6  clean cheek clearance beside eyes
  '#AAAACC##CC##CAAA#', // 7
  '.##ACCCCCCCCCCA##.', // 8
  '...#AACCCCCCAA#...', // 9
  '....#AACCCCAA#....', // 10
  '.....#AACCAA#.....', // 11
  '.....#AAAA##......', // 12
  '......#AA#........', // 13
  '.......##.........', // 14
  '....A.....A.......', // 15 S-wave mote wake
  '...C...E..........', // 16
  '..A.....A.........', // 17
]);

const FLOAT_4 = frame([
  '.............E....', // 0  gentle low dip (+1px)
  '.......##.........', // 1
  '......#AA##.......', // 2
  '......#ACCA#......', // 3
  '.....#ACCCCA#.....', // 4
  '.####AACCCCAA####.', // 5  wings cupped for lift-off
  '#AAA#CCCCCCCC#AAA#', // 6
  '#AAACCE#CCE#CCAAA#', // 7
  '.##ACC##CC##CCA##.', // 8
  '..#ACCCCCCCCCCA#..', // 9
  '...#AACCCCCCAA#...', // 10
  '....#AACCCCAA#....', // 11
  '....#AAACCAA#.....', // 12
  '.....#AAAA##......', // 13
  '......#AA#........', // 14
  '...A...##.........', // 15 curled tail wave
  '..A..C............', // 16
  '...E...A..........', // 17
]);

const FLOAT_5 = frame([
  '......##..........', // 0  lift-off swoop into FLOAT_0
  '.....#AA###.......', // 1
  '......#ACCA#......', // 2
  '.###.#ACCCCA#.###.', // 3  upward wing lift
  '#AAA#AACCCCAA#AAA#', // 4
  '.##AACCCCCCCCAA##.', // 5
  '..#ACCE#CCE#CCA#..', // 6
  '..#ACC##CC##CCA#..', // 7
  '..#ACCCCCCCCCCA#..', // 8
  '...#AACCCCCCAA#...', // 9
  '....#AACCCCAA#....', // 10
  '.....#AACCAA#.....', // 11
  '.....#AAAA##......', // 12
  '......#AA#........', // 13
  '.......##.........', // 14
  '...A.....A........', // 15
  '....C...A.........', // 16
  '..A...E...........', // 17
]);

let cached: SpriteSheet | null = null;

export function buildWisp(): SpriteSheet {
  if (cached) return cached;
  cached = {
    anchorX: Math.floor(W / 2),
    anchorY: Math.floor(H / 2),
    anims: {
      idle: anim([IDLE_0, IDLE_1, IDLE_2, IDLE_3, IDLE_4, IDLE_5], 175),
      float: anim([FLOAT_0, FLOAT_1, FLOAT_2, FLOAT_3, FLOAT_4, FLOAT_5], 130),
    },
  };
  return cached;
}
