/**
 * Luminous Starlight Wisp — Wanderlings-style glowing cosmos/forest spirit sprite (18x18).
 * Uses system regions:
 *   231 = fx_wisp_core (warm luminous cream-gold orb)
 *   232 = fx_wisp_aura (iridescent amber-lavender halo, wing wisps & lantern-mote tail)
 *   212 = eye_shine    (twinkly starlight eye glints & tiny sparkle motes)
 *     0 = ink          (delicate soft contour accents & expressive tiny spirit eyes)
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
// Gentle breathing lantern glow, fluttering side aura wisps, cozy blink on frame 3, dancing motes.

const IDLE_0 = frame([
  '........AA........', // 0  soft crown wisp tip
  '.......ACCA.......', // 1  glowing teardrop flame tuft
  '......AACCCA......', // 2  smooth luminous dome
  '.....AACCCCAA.....', // 3
  '....AACCCCCCAA....', // 4
  '..AAAACCCCCCAAAA..', // 5  soft fluttering wing wisps
  '.AA#CCE#CCE#CC#AA.', // 6  wide-set twinkly starlight eyes
  '..A#CC##CC##CC#A..', // 7  cozy spirit eyes + soft cheek contour
  '..AACCCCCCCCCCAA..', // 8  warm glowing plump cheeks
  '...AACCCCCCCCAA...', // 9
  '....A#CCCCCC#A....', // 10 soft lantern waist accent
  '.....AACCCCAA.....', // 11 smooth bottom taper
  '......AACCAA......', // 12 wisp tail root
  '.......AAAA.......', // 13
  '......AA..A.......', // 14 floating lantern motes
  '.......C...A......', // 15
  '......A...E.......', // 16 tiny starlight sparkle mote
  '........A.........', // 17
]);

const IDLE_1 = frame([
  '.........AA..E....', // 0  crown sways right + twinkle
  '........ACCA......', // 1
  '......AACCCAA.....', // 2
  '.....AACCCCAA.....', // 3
  '..AAAACCCCCCAAAA..', // 4  wing wisps lift softly
  '.AAAACCCCCCCCAAAA.', // 5
  '..A#CCE#CCE#CC#A..', // 6
  '..A#CC##CC##CC#A..', // 7
  '..AACCCCCCCCCCAA..', // 8
  '...AACCCCCCCCAA...', // 9
  '....A#CCCCCC#A....', // 10
  '.....AACCCCAA.....', // 11
  '......AACCAA......', // 12
  '......AAAA........', // 13 tail sways left
  '.....AA..AA.......', // 14
  '......C..A........', // 15
  '.....A....C.......', // 16
  '.......A..........', // 17
]);

const IDLE_2 = frame([
  '........AA........', // 0  buoyant micro-rise with intact crown tip
  '.......ACCA.......', // 1
  '.....AACCCCAA.....', // 2
  '....AACCCCCCAA....', // 3
  '..AAAACCCCCCAAAA..', // 4  airy wing lift
  '.AA#CCE#CCE#CC#AA.', // 5
  '..A#CC##CC##CC#A..', // 6
  '..AACCCCCCCCCCAA..', // 7
  '...AACCCCCCCCAA...', // 8
  '....A#CCCCCC#A....', // 9
  '.....AACCCCAA.....', // 10
  '......AACCAA......', // 11
  '.......AAAA.......', // 12
  '.......AA.A.......', // 13 trailing lantern stream
  '........C..A......', // 14
  '......A..A........', // 15
  '.......E..A.......', // 16
  '.........A........', // 17
]);

const IDLE_3 = frame([
  '........AA........', // 0  serene warm breath
  '.......ACCA.......', // 1
  '......AACCCA......', // 2
  '.....AACCCCAA.....', // 3
  '....AACCCCCCAA....', // 4
  '..AAAACCCCCCAAAA..', // 5
  '.AA#CCCCCCCCCC#AA.', // 6  peaceful cozy blink!
  '..A#CC##CC##CC#A..', // 7
  '..AACCCCCCCCCCAA..', // 8
  '...AACCCCCCCCAA...', // 9
  '....A#CCCCCC#A....', // 10
  '.....AACCCCAA.....', // 11
  '......AACCAA......', // 12
  '........AAAA......', // 13 tail sways right
  '.......A..AA......', // 14
  '........A..C......', // 15
  '......E...A.......', // 16
  '..........A.......', // 17
]);

const IDLE_4 = frame([
  '....E..AA.........', // 0  crown sways left + sparkle
  '......ACCA........', // 1
  '.....AACCCAA......', // 2
  '.....AACCCCAA.....', // 3
  '....AACCCCCCAA....', // 4
  '...AAACCCCCCAAA...', // 5
  '.AA#CCE#CCE#CC#AA.', // 6  bright wide eyes
  '.AA#CC##CC##CC#AA.', // 7  wing wisps flutter low
  '..AACCCCCCCCCCAA..', // 8
  '...AACCCCCCCCAA...', // 9
  '....A#CCCCCC#A....', // 10
  '.....AACCCCAA.....', // 11
  '......AACCAA......', // 12
  '.......AAAA.......', // 13
  '.....A..AA........', // 14 twin golden firefly motes
  '......C...C.......', // 15
  '.........A........', // 16
  '.......A..........', // 17
]);

const IDLE_5 = frame([
  '........AA........', // 0  gentle settle back to 0
  '.......ACCA.......', // 1
  '......AACCCA......', // 2
  '.....AACCCCAA.....', // 3
  '...AAACCCCCCAAA...', // 4
  '..AAAACCCCCCAAAA..', // 5
  '..A#CCE#CCE#CC#A..', // 6
  '..A#CC##CC##CC#A..', // 7
  '..AACCCCCCCCCCAA..', // 8
  '...AACCCCCCCCAA...', // 9
  '....A#CCCCCC#A....', // 10
  '.....AACCCCAA.....', // 11
  '......AACCAA......', // 12
  '.......AAAA.......', // 13
  '.......AA..A......', // 14
  '......A...C.......', // 15
  '........E..A......', // 16
  '.......A..........', // 17
]);

// ------------------------------------------------------------------ FLOAT (6 frames, 18x18)
// Graceful gliding flight with angled crown flame, buoyant bob, and sparkling comet-mote tail!

const FLOAT_0 = frame([
  '......AA..........', // 0  wind-swept crown flame
  '......ACCA........', // 1
  '......AACCCA......', // 2
  '.....AACCCCAA.....', // 3
  '...AAACCCCCCAAA...', // 4
  '..AAAACCCCCCAAAA..', // 5
  '.AA#CCE#CCE#CC#AA.', // 6
  '..A#CC##CC##CC#A..', // 7
  '..AACCCCCCCCCCAA..', // 8
  '...AACCCCCCCCAA...', // 9
  '....A#CCCCCC#A....', // 10
  '....AAACCCCAA.....', // 11
  '.....AAACCAA......', // 12 trailing comet-mote tail
  '....AAAA..........', // 13
  '...AA..C..........', // 14
  '..C...A...........', // 15
  '.A...E............', // 16
  '..................', // 17
]);

const FLOAT_1 = frame([
  '......AA.....E....', // 0  buoyant upward glide with intact crown tip
  '.....ACCA.........', // 1
  '.....AACCCCAA.....', // 2
  '..AAAACCCCCCAAAA..', // 3  high wing flutter
  '.AAAACCCCCCCCAAAA.', // 4
  '.AA#CCE#CCE#CC#AA.', // 5
  '..A#CC##CC##CC#A..', // 6
  '..AACCCCCCCCCCAA..', // 7
  '...AACCCCCCCCAA...', // 8
  '....A#CCCCCC#A....', // 9
  '....AAACCCCAA.....', // 10
  '.....AACCAA.......', // 11
  '....AAAA..........', // 12
  '...AC..AA.........', // 13 sparkling lantern wake
  '..A...C...........', // 14
  '....E..A..........', // 15
  '..A...............', // 16
  '..................', // 17
]);

const FLOAT_2 = frame([
  '......AA..........', // 0  peak buoyant crest
  '.....ACCA.........', // 1
  '.....AACCCCAA.....', // 2
  '....AACCCCCCAA....', // 3
  '..AAAACCCCCCAAAA..', // 4
  '.AA#CCE#CCE#CC#AA.', // 5
  '..A#CC##CC##CC#A..', // 6
  '..AACCCCCCCCCCAA..', // 7
  '...AACCCCCCCCAA...', // 8
  '....A#CCCCCC#A....', // 9
  '.....AACCCCAA.....', // 10
  '.....AACCAA.......', // 11
  '....AAAA.A........', // 12
  '....AA..C.........', // 13
  '..E..A............', // 14
  '...C..A...........', // 15
  '.....A............', // 16
  '..................', // 17
]);

const FLOAT_3 = frame([
  '.......AA.........', // 0  graceful glide mid
  '......ACCA........', // 1
  '......AACCCA......', // 2
  '.....AACCCCAA.....', // 3
  '....AACCCCCCAA....', // 4
  '..AAAACCCCCCAAAA..', // 5
  '.AA#CCE#CCE#CC#AA.', // 6
  '.AA#CC##CC##CC#AA.', // 7  wings sweep down
  '..AACCCCCCCCCCAA..', // 8
  '...AACCCCCCCCAA...', // 9
  '....A#CCCCCC#A....', // 10
  '.....AACCCCAA.....', // 11
  '.....AACCAA.......', // 12
  '.....AAAA.........', // 13 S-wave mote wake
  '....AA..A.........', // 14
  '...C...E..........', // 15
  '....A....A........', // 16
  '..A...............', // 17
]);

const FLOAT_4 = frame([
  '..................', // 0  gentle low dip (+1px)
  '.......AA....E....', // 1
  '......ACCA........', // 2
  '......AACCCA......', // 3
  '.....AACCCCAA.....', // 4
  '...AAACCCCCCAAA...', // 5
  '..AAAACCCCCCAAAA..', // 6
  '.AA#CCE#CCE#CC#AA.', // 7
  '..A#CC##CC##CC#A..', // 8
  '..AACCCCCCCCCCAA..', // 9
  '...AACCCCCCCCAA...', // 10
  '....A#CCCCCC#A....', // 11
  '....AAACCCCAA.....', // 12
  '.....AACCAA.......', // 13
  '...AAAA..A........', // 14 curled tail wave
  '..A..C............', // 15
  '...E...A..........', // 16
  '.....A............', // 17
]);

const FLOAT_5 = frame([
  '......AA..........', // 0  lift-off swoop into loop
  '......ACCA........', // 1
  '......AACCCA......', // 2
  '.....AACCCCAA.....', // 3
  '..AAAACCCCCCAAAA..', // 4
  '.AAAACCCCCCCCAAAA.', // 5
  '..A#CCE#CCE#CC#A..', // 6
  '..A#CC##CC##CC#A..', // 7
  '..AACCCCCCCCCCAA..', // 8
  '...AACCCCCCCCAA...', // 9
  '....A#CCCCCC#A....', // 10
  '.....AACCCCAA.....', // 11
  '.....AACCAA.......', // 12
  '....AAAA..........', // 13
  '...AA..A..........', // 14
  '....C...A.........', // 15
  '..A...E...........', // 16
  '....A.............', // 17
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
