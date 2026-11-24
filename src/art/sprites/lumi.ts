/**
 * Lumi — hand-authored ASCII pixel-art sprite sheet (66x54).
 * Graceful cosmic unicorn with spiral horn (7), flowing aurora mane (6),
 * slender body (5), starry tail (8), plus pegasus wings (217) & starlight crown (218).
 */
import type { SpriteSheet } from '../../contracts/art';
import type { WardrobeState } from '../../contracts/progression';
import { anim, compose, finishSprite, makeSheet, parseGrid, type Grid, type Legend } from '../ascii';

const W = 66;
const H = 54;

const LEG: Legend = {
  B: 5, // lumi_body
  M: 6, // lumi_mane
  H: 7, // lumi_horn
  T: 8, // lumi_tail
  E: 212, // eye_shine
  A: 213, // cheek_blush
  W: 217, // lumi_wings (wardrobe)
  C: 218, // lumi_crown (wardrobe)
};

// Front-most first: accents, horn, mane, body, tail, wings
const PRIO = [212, 213, 218, 7, 6, 5, 8, 217];

// Base standing/trotting unicorn upper body (head, horn, neck, mane, torso, tail A) — 66x54
const LUMI_STAND = parseGrid(
  [
    '..................................................................', // 0
    '..................................................................', // 1
    '.............................................................H....', // 2  spiral horn tip
    '...........................................................HHH....', // 3
    '..........................................................HH#H....', // 4
    '.........................................................HHHH.....', // 5
    '............................................BB..........HHH#......', // 6  perked ear
    '...........................................BBB.........HHHH.......', // 7
    '..........................................BBBBMM......HHH#........', // 8
    '.........................................BBBBMMMM....HHHH.........', // 9
    '........................................MMMMBBBBMM..HHHH..........', // 10 forelock + horn base
    '......................................MMMMMBBBBBBBMHHHH...........', // 11
    '.....................................MMMM#BBBBBBBBBBBB............', // 12
    '....................................MMMMMBBBBBBBBBBBBBB...........', // 13
    '...................................MMMMMMBBBBBBBB##EBBBB..........', // 14 expressive eye + shine
    '..................................MMMMMMBBBBBBBBB###BBBBB.........', // 15
    '.................................MMMM#MMBBBBBBBBB###BBBBBB........', // 16
    '................................MMMMMMMBBBBBBBBBBAABBBBB#BB.......', // 17 rosy blush + cute nostril
    '...............................MMMMMMMMBBBBBBBBBBBBBBBBBBBB.......', // 18
    '..............................MMMMMMMM#BBBBBBBBBBBBBBBBBBB........', // 19
    '.............................MMMMMMMMMBBBBBBBBBBB###BBBBB.........', // 20 gentle smile
    '............................MMMMMMMMMMBBBBBBBBBBB.................', // 21
    '...........................MMMMMMMMM#BBBBBBBBBBB..................', // 22 arched neck
    '..........................MMMMMMMMMMBBBBBBBBBBB...................', // 23
    '..............TTTT.......MMMMMMMMMMBBBBBBBBBBBB...................', // 24 tail starts
    '...........TTTTTTTT.....MMMMMMMMM#BBBBBBBBBBBB....................', // 25
    '.........TTTTTTTTTTT...MMMMMMMMMMBBBBBBBBBBBB.....................', // 26
    '.......TTTTT#TTTTTTTT.MMMMMMMMBBBBBBBBBBBBBB......................', // 27
    '......TTTTTTTTTTTTTTTTBBBBBBBBBBBBBBBBBBBBBB......................', // 28 smooth back
    '.....TTTTTT#TTTTTTTTTBBBBBBBBBBBBBBBBBBBBBB.......................', // 29
    '....TTTTTTTTTTTTTTTTBBBBBBBBBBBBBBBBBBBBBBB.......................', // 30
    '...TTTTTT..TTTTTTTTTBBBBBBBBBBBBBBBBBBBBBBB.......................', // 31
    '...TTTTT....TTTTTTTBBBBBBBBBBBBBBBBBBBBBBB........................', // 32
    '..TTTTT......TTTTTTBBBBBBBBBBBBBBBBBBBBBBB........................', // 33
    '..TTTT........TTTTTBBBBBBBBBBBBBBBBBBBBBB.........................', // 34
    '...TTT.........TTT..BBBBBBBBBBBBBBBBBBBB..........................', // 35
    '....TT..........T...BBBBBBB......BBBBBBB..........................', // 36 leg join
    '....................BBBBBB........BBBBBB..........................', // 37
    '..................................................................', // 38
    '..................................................................', // 39
    '..................................................................', // 40
    '..................................................................', // 41
    '..................................................................', // 42
    '..................................................................', // 43
    '..................................................................', // 44
    '..................................................................', // 45
    '..................................................................', // 46
    '..................................................................', // 47
    '..................................................................', // 48
    '..................................................................', // 49
    '..................................................................', // 50
    '..................................................................', // 51
    '..................................................................', // 52
    '..................................................................', // 53
  ],
  LEG,
);

// Alternate flowing tail wave B (clean hand-authored swirl, overlays x=0..22, y=22..38)
const TAIL_WAVE_B = parseGrid(
  [
    '.........TTTTT.........', // 22
    '......TTTTTTTTTT.......', // 23
    '....TTTTTTTTTTTTTT.....', // 24
    '...TTTTTT#TTTTTTTTT....', // 25
    '..TTTTTTTTTTTTTTTTTT...', // 26
    '..TTTTTT#TTTTTTTTTTTT..', // 27
    '..TTTTT..TTTTTTTTTTTT..', // 28
    '...TTTT...TTTTTTTTTT...', // 29
    '....TTT....TTTTTTTTT...', // 30
    '............TTTTTTT....', // 31
    '.............TTTTT.....', // 32
    '..............TTT......', // 33
    '.......................', // 34
    '.......................', // 35
    '.......................', // 36
  ],
  LEG,
);

// High exuberant tail swish C for joyful poke-invite wiggle/peek (overlays x=0..22, y=18..34)
const TAIL_WAVE_C = parseGrid(
  [
    '.......TTTTTTT.........', // 18
    '....TTTTTTTTTTTT.......', // 19
    '..TTTTTTT#TTTTTTTT.....', // 20
    '.TTTTTTTTTTTTTTTTTT....', // 21
    '.TTTTTT#TTTTTTTTTTTT...', // 22
    '.TTTTT...TTTTTTTTTTTT..', // 23
    '..TTTT....TTTTTTTTTTTT.', // 24
    '...TTT.....TTTTTTTTTTT.', // 25
    '............TTTTTTTTTT.', // 26
    '.............TTTTTTTT..', // 27
    '..............TTTTTT...', // 28
    '...............TTTT....', // 29
    '................TT.....', // 30
    '.......................', // 31
    '.......................', // 32
  ],
  LEG,
);

// Perked-ear, gleaming lifted horn & tossing aurora mane (without tail) for lively wiggle/peek/idle
const LUMI_STAND_PERK = parseGrid(
  [
    '..................................................................', // 0
    '..............................................................H...', // 1  horn lifts +1px higher!
    '............................................................HHH...', // 2
    '...........................................................HH#H...', // 3
    '.............................................BB...........HHHH....', // 4  ear perks tall & forward!
    '............................................BBBB.........HHH#.....', // 5
    '...........................................BBBBBB.......HHHH......', // 6
    '..........................................BBBBBBMM.....HHH#.......', // 7
    '.........................................BBBBMMMMMM...HHHH........', // 8  bouncing forelock
    '.......................................MMMMMBBBBMMM..HHHH.........', // 9
    '.....................................MMMMMMBBBBBBBBMHHHH..........', // 10
    '...................................MMMMMM#BBBBBBBBBBBBB...........', // 11 fuller tossing aurora mane
    '..................................MMMMMMMBBBBBBBBBBBBBBB..........', // 12
    '.................................MMMMMMMBBBBBBBBB##EBBBB..........', // 13 bright starry eye
    '................................MMMMM#MMBBBBBBBBB###BBBBB.........', // 14
    '...............................MMMMMMMMMBBBBBBBBB###BBBBBB........', // 15
    '..............................MMMMMMMMMMBBBBBBBBBAABBBBB#BB.......', // 16
    '.............................MMMMMMMMM#BBBBBBBBBBBBBBBBBBBB.......', // 17
    '............................MMMMMMMMMMBBBBBBBBBBBBBBBBBBBB........', // 18
    '...........................MMMMMMMMMMBBBBBBBBBBBB###BBBBB.........', // 19
    '..........................MMMMMMMMMM#BBBBBBBBBBBB.................', // 20
    '.........................MMMMMMMMMMMBBBBBBBBBBBB..................', // 21
    '........................MMMMMMMMMMMBBBBBBBBBBBB...................', // 22
    '.......................MMMMMMMMMM#BBBBBBBBBBBB....................', // 23
    '......................MMMMMMMMMMMBBBBBBBBBBBBB....................', // 24
    '.....................MMMMMMMMMM#BBBBBBBBBBBBB.....................', // 25
    '.....................MMMMMMMMMMBBBBBBBBBBBBBB.....................', // 26
    '.....................MMMMMMMMBBBBBBBBBBBBBBB......................', // 27
    '......................BBBBBBBBBBBBBBBBBBBBBB......................', // 28
    '.....................BBBBBBBBBBBBBBBBBBBBBB.......................', // 29
    '....................BBBBBBBBBBBBBBBBBBBBBBB.......................', // 30
    '....................BBBBBBBBBBBBBBBBBBBBBBB.......................', // 31
    '...................BBBBBBBBBBBBBBBBBBBBBBB........................', // 32
    '...................BBBBBBBBBBBBBBBBBBBBBBB........................', // 33
    '...................BBBBBBBBBBBBBBBBBBBBBB.........................', // 34
    '....................BBBBBBBBBBBBBBBBBBBB..........................', // 35
    '....................BBBBBBB......BBBBBBB..........................', // 36
    '....................BBBBBB........BBBBBB..........................', // 37
    '..................................................................', // 38
  ],
  LEG,
);

// Playful ear-flick back & sweeping mane toss (without tail)
const LUMI_STAND_FLICK = parseGrid(
  [
    '..................................................................', // 0
    '..................................................................', // 1
    '.............................................................H....', // 2
    '...........................................................HHH....', // 3
    '..........................................................HH#H....', // 4
    '.........................................................HHHH.....', // 5
    '.......................................BBB..............HHH#......', // 6  ear flicked back playfully!
    '........................................BBBB...........HHHH.......', // 7
    '.........................................BBBBMM.......HHH#........', // 8
    '........................................BBBBMMMMM....HHHH.........', // 9
    '......................................MMMMMBBBBMMM..HHHH..........', // 10
    '....................................MMMMMMBBBBBBBBMHHHH...........', // 11
    '...................................MMMMM#BBBBBBBBBBBB.............', // 12
    '..................................MMMMMMBBBBBBBBBBBBBB............', // 13
    '.................................MMMMMMMBBBBBBBB##EBBBB...........', // 14
    '................................MMMMMMMBBBBBBBBB###BBBBB..........', // 15
    '...............................MMMMM#MMBBBBBBBBB###BBBBBB.........', // 16
    '..............................MMMMMMMMBBBBBBBBBBBAABBBBB#BB.......', // 17
    '.............................MMMMMMMMMBBBBBBBBBBBBBBBBBBBB........', // 18
    '............................MMMMMMMMM#BBBBBBBBBBBBBBBBBBB.........', // 19
    '...........................MMMMMMMMMMBBBBBBBBBBB###BBBBB..........', // 20
    '..........................MMMMMMMMMMMBBBBBBBBBBB..................', // 21
    '.........................MMMMMMMMMM#BBBBBBBBBBB...................', // 22
    '........................MMMMMMMMMMMBBBBBBBBBBB....................', // 23
    '.......................MMMMMMMMMMMBBBBBBBBBBBB....................', // 24
    '......................MMMMMMMMMM#BBBBBBBBBBBB.....................', // 25
    '.....................MMMMMMMMMMMBBBBBBBBBBBB......................', // 26
    '.....................MMMMMMMMBBBBBBBBBBBBBB.......................', // 27
    '......................BBBBBBBBBBBBBBBBBBBBBB......................', // 28
    '.....................BBBBBBBBBBBBBBBBBBBBBB.......................', // 29
    '....................BBBBBBBBBBBBBBBBBBBBBBB.......................', // 30
    '....................BBBBBBBBBBBBBBBBBBBBBBB.......................', // 31
    '...................BBBBBBBBBBBBBBBBBBBBBBB........................', // 32
    '...................BBBBBBBBBBBBBBBBBBBBBBB........................', // 33
    '...................BBBBBBBBBBBBBBBBBBBBBB.........................', // 34
    '....................BBBBBBBBBBBBBBBBBBBB..........................', // 35
    '....................BBBBBBB......BBBBBBB..........................', // 36
    '....................BBBBBB........BBBBBB..........................', // 37
    '..................................................................', // 38
  ],
  LEG,
);

// Clean torso without tail (for swapping tail wave B cleanly)
const LUMI_STAND_NOTAIL = parseGrid(
  [
    '..................................................................', // 0
    '..................................................................', // 1
    '.............................................................H....', // 2
    '...........................................................HHH....', // 3
    '..........................................................HH#H....', // 4
    '.........................................................HHHH.....', // 5
    '............................................BB..........HHH#......', // 6
    '...........................................BBB.........HHHH.......', // 7
    '..........................................BBBBMM......HHH#........', // 8
    '.........................................BBBBMMMM....HHHH.........', // 9
    '........................................MMMMBBBBMM..HHHH..........', // 10
    '.....................................MMMMMMBBBBBBBMHHHH...........', // 11 slightly fuller flowing mane
    '....................................MMMMM#BBBBBBBBBBBB............', // 12
    '...................................MMMMMMBBBBBBBBBBBBBB...........', // 13
    '..................................MMMMMMMBBBBBBBB##EBBBB..........', // 14
    '.................................MMMMMMMBBBBBBBBB###BBBBB.........', // 15
    '................................MMMMM#MMBBBBBBBBB###BBBBBB........', // 16
    '...............................MMMMMMMMBBBBBBBBBBBAABBBBB#BB......', // 17
    '..............................MMMMMMMMMBBBBBBBBBBBBBBBBBBBB.......', // 18
    '.............................MMMMMMMMM#BBBBBBBBBBBBBBBBBBB........', // 19
    '............................MMMMMMMMMMBBBBBBBBBBB###BBBBB.........', // 20
    '...........................MMMMMMMMMMMBBBBBBBBBBB.................', // 21
    '..........................MMMMMMMMMM#BBBBBBBBBBB..................', // 22
    '.........................MMMMMMMMMMMBBBBBBBBBBB...................', // 23
    '........................MMMMMMMMMMMBBBBBBBBBBBB...................', // 24
    '.......................MMMMMMMMMM#BBBBBBBBBBBB....................', // 25
    '......................MMMMMMMMMMMBBBBBBBBBBBB.....................', // 26
    '......................MMMMMMMMBBBBBBBBBBBBBB......................', // 27
    '......................BBBBBBBBBBBBBBBBBBBBBB......................', // 28
    '.....................BBBBBBBBBBBBBBBBBBBBBB.......................', // 29
    '....................BBBBBBBBBBBBBBBBBBBBBBB.......................', // 30
    '....................BBBBBBBBBBBBBBBBBBBBBBB.......................', // 31
    '...................BBBBBBBBBBBBBBBBBBBBBBB........................', // 32
    '...................BBBBBBBBBBBBBBBBBBBBBBB........................', // 33
    '...................BBBBBBBBBBBBBBBBBBBBBB.........................', // 34
    '....................BBBBBBBBBBBBBBBBBBBB..........................', // 35
    '....................BBBBBBB......BBBBBBB..........................', // 36
    '....................BBBBBB........BBBBBB..........................', // 37
    '..................................................................', // 38
  ],
  LEG,
);

// Standing legs (graceful paired limbs, y=36..51)
const LEGS_STAND = parseGrid(
  [
    '....................BBBBBBB......BBBBBBB..........................', // 36
    '....................BBBBBB........BBBBBB..........................', // 37
    '...................BBBBBB.........BBBBBB..........................', // 38
    '...................BBBBB..........BBBBB...........................', // 39
    '..................BBBBB..BBB.....BBBBB..BBB.......................', // 40
    '..................BBBB...BBB.....BBBB...BBB.......................', // 41
    '..................BBBB...BBB.....BBBB...BBB.......................', // 42
    '..................BBBB...BBB.....BBBB...BBB.......................', // 43
    '..................BBBB...BBB.....BBBB...BBB.......................', // 44
    '.................BBBB....BBB.....BBBB...BBB.......................', // 45
    '.................BBBB....BBB.....BBBB...BBB.......................', // 46
    '.................BBBB....BBB.....BBBB...BBB.......................', // 47
    '.................BBBB....BBB.....BBBB...BBB.......................', // 48
    '.................####....###.....####...###.......................', // 49
    '.................BBBB....BBB.....BBBB...BBB.......................', // 50
    '..................................................................', // 51
  ],
  LEG,
);

// Trotting legs
const LEGS_WALK_A = parseGrid(
  [
    '....................BBBBBBB......BBBBBBB..........................',
    '...................BBBBBBB........BBBBBBB.........................',
    '..................BBBBBB...........BBBBBBB........................',
    '.................BBBBB..BBBB.......BBBB..BBBB.....................',
    '................BBBBB....BBBB.....BBBB....BBBB....................',
    '................BBBB.....BBBB.....BBBB.....BBBB...................',
    '...............BBBB......BBBB.....BBBB......BBBB..................',
    '...............BBBB......BBBB.....BBBB.......BBBB.................',
    '..............BBBB.......BBBB.....BBBB........BBBB................',
    '..............BBBB.......BBBB.....BBBB........BBBB................',
    '..............BBBB.......BBBB.....BBBB.........BBB................',
    '..............####.......####.....####.........###................',
    '..............BBBB.......BBBB.....BBBB.........BBB................',
    '..................................................................',
    '..................................................................',
    '..................................................................',
  ],
  LEG,
);

// Galloping legs — full airborne stretch
const LEGS_GALLOP_A = parseGrid(
  [
    '...................BBBBBBBB......BBBBBBBB.........................',
    '..................BBBBBBBB........BBBBBBBB........................',
    '.................BBBBBB.............BBBBBBB.......................',
    '...............BBBBBB................BBBBBBB......................',
    '..............BBBBBB..................BBBBBBB.....................',
    '............BBBBBB.....................BBBBBBB....................',
    '...........BBBBBB.......................BBBBBBB...................',
    '.........BBBBBB..........................BBBBBBB..................',
    '........BBBBBB............................BBBBBB..................',
    '.......####BB..............................####B..................',
    '.......BBBB.................................BBBB..................',
    '..................................................................',
    '..................................................................',
    '..................................................................',
    '..................................................................',
    '..................................................................',
  ],
  LEG,
);

// Galloping legs — gathered spring
const LEGS_GALLOP_B = parseGrid(
  [
    '....................BBBBBBB......BBBBBBB..........................',
    '.....................BBBBBBB....BBBBBBB...........................',
    '......................BBBBBB....BBBBBB............................',
    '.......................BBBBB....BBBBB.............................',
    '........................BBBB....BBBB..............................',
    '.........................BBBB..BBBB...............................',
    '.........................BBBB..BBBB...............................',
    '..........................BBB..BBB................................',
    '..........................###..###................................',
    '..........................BBB..BBB................................',
    '..................................................................',
    '..................................................................',
    '..................................................................',
    '..................................................................',
    '..................................................................',
    '..................................................................',
  ],
  LEG,
);

// Majestic REARING Lumi silhouette (full 66x54) — head held high, clear chest space above tucked forelegs!
const LUMI_REAR = parseGrid(
  [
    '..................................................................', // 0
    '.......................................................H..........', // 1  proud high horn
    '.....................................................HHH..........', // 2
    '....................................................HH#H..........', // 3
    '...................................................HHHH...........', // 4
    '......................................BB..........HHH#............', // 5  ear
    '.....................................BBB.........HHHH.............', // 6
    '....................................BBBBMM......HHH#..............', // 7
    '...................................BBBBMMMM....HHHH...............', // 8
    '..................................MMMMBBBBMM..HHHH................', // 9
    '.................................MMMMBBBBBBBMHHHH.................', // 10
    '................................MMMM#BBBBBBBBBBBB.................', // 11
    '...............................MMMMMBBBBBBBBBBBBBB................', // 12
    '..............................MMMMMMBBBBBBBB##EBBBB...............', // 13 bright starry eye
    '.............................MMMMMMBBBBBBBBB###BBBBB..............', // 14
    '............................MMMM#MMBBBBBBBBB###BBBBBB.............', // 15
    '...........................MMMMMMMBBBBBBBBBBAABBBBB#BB............', // 16 cute muzzle high up
    '..........................MMMMMMMMBBBBBBBBBBBBBBBBBBBB............', // 17
    '.........................MMMMMMMM#BBBBBBBBBBBBBBBBBBB.............', // 18
    '........................MMMMMMMMMBBBBBBBBBBB###BBBBB..............', // 19 clear chin
    '.......................MMMMMMMMMMBBBBBBBBBBB......................', // 20 slender proud neck
    '......................MMMMMMMMM#BBBBBBBBBBB.......................', // 21
    '.....................MMMMMMMMMMBBBBBBBBBBBB.......................', // 22
    '....................MMMMMMMMMMBBBBBBBBBBBBBB......................', // 23 broad chest
    '...................MMMMMMMMM#BBBBBBBBBBBBBBBB.....................', // 24
    '..................MMMMMMMMMMBBBBBBBBBBBBBBBBBBB...................', // 25
    '.................MMMMMMMMMMBBBBBBBBBBBBBBBBBBBBBB....BBBB.........', // 26 raised front foreleg!
    '................MMMMMMMMBBBBBBBBBBBBBBBBBBBBBBBBBBB.BBBBB#........', // 27
    '...............TTTTBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBB........', // 28
    '............TTTTTTTTBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBB............', // 29
    '..........TTTTTTTTTTTBBBBBBBBBBBBBBBBBBBB..BBBBBBB................', // 30 second lifted foreleg
    '........TTTTT#TTTTTTTTBBBBBBBBBBBBBBBB......BBBBBBB...............', // 31
    '.......TTTTTTTTTTTTTTTTBBBBBBBBBBBBBB........BBBB#B...............', // 32
    '......TTTTTT#TTTTTTTTTTBBBBBBBBBBBBB..........BBBBB...............', // 33
    '.....TTTTTTTTTTTTTTTTTBBBBBBBBBBBB................................', // 34
    '....TTTTTT..TTTTTTTTTBBBBBBBBBBBB.................................', // 35
    '...TTTTT.....TTTTTTTBBBBBBBBBBBB..................................', // 36
    '...TTTT.......TTTTTBBBBBBBBBBBB...................................', // 37
    '..TTTT.........TTT.BBBBBBB.BBBB...................................', // 38 strong hind legs
    '..TTT..............BBBBBB...BBBB..................................', // 39
    '...................BBBBBB...BBBB..................................', // 40
    '..................BBBBBB....BBBB..................................', // 41
    '..................BBBBB.....BBBB..................................', // 42
    '..................BBBBB.....BBBB..................................', // 43
    '..................BBBBB.....BBBB..................................', // 44
    '.................BBBBB......BBBB..................................', // 45
    '.................BBBBB......BBBB..................................', // 46
    '.................BBBBB......BBBB..................................', // 47
    '.................BBBBB......BBBB..................................', // 48
    '.................#####......####..................................', // 49 planted hooves
    '.................BBBBB......BBBB..................................', // 50
    '..................................................................', // 51
    '..................................................................', // 52
    '..................................................................', // 53
  ],
  LEG,
);

// Curled-up SLEEPING Lumi (cozy sleeping unicorn loaf, head resting warmly on front folded paws!)
const LUMI_SLEEP = parseGrid(
  [
    '..................................................................', // 0
    '..................................................................', // 1
    '..................................................................', // 2
    '..................................................................', // 3
    '..................................................................', // 4
    '..................................................................', // 5
    '..................................................................', // 6
    '..................................................................', // 7
    '..................................................................', // 8
    '..................................................................', // 9
    '..................................................................', // 10
    '..................................................................', // 11
    '..................................................................', // 12
    '..................................................................', // 13
    '..................................................................', // 14
    '..................................................................', // 15
    '..................................................................', // 16
    '..................................................................', // 17
    '............................................................H.....', // 18 spiral horn angled up-right
    '..........................................................HHH.....', // 19
    '.........................................................HH#H.....', // 20
    '........................................................HHHH......', // 21
    '...........................................BB..........HHH#.......', // 22 cute folded ear
    '.........................................BBBB.........HHHH........', // 23
    '.......................................MMMMBBB.......HHH#.........', // 24
    '....................................MMMMMMMMBBMM....HHHH..........', // 25 lush aurora mane draped over neck
    '..................................MMMMMMMM#BBBBMM..HHHH...........', // 26
    '................................MMMMMMMMMMBBBBBBBMHHHH............', // 27
    '..............................MMMMMMMMMM#BBBBBBBBBBBB.............', // 28
    '............................MMMMMMMMMMMMBBBBBBBBBBBBBB............', // 29
    '..........................MMMMMMMMMMM#BBBBBBBBBBBBBBBBB...........', // 30
    '........................BBBBBBBBBBBBBBBBBBBBBBB#BBBB#BBBB.........', // 31 cozy closed happy eye
    '.....................BBBBBBBBBBBBBBBBBBBBBBBBBB######BBBBBB.......', // 32
    '..................BBBBBBBBBBBBBBBBBBBBBBBBBBBBBBAAABBBBB#BB.......', // 33 rosy blush + cute nostril
    '...............BBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBB.......', // 34
    '............TTTBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBB........', // 35
    '.........TTTTTTTBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBB###BBBBBB.........', // 36 peaceful smile
    '.......TTTTTTTTTTBBBBBBBBBBBBBBBBBBBBBBBBBB###########............', // 37 ink seam: chin resting on tucked forelegs!
    '......TTTTT#TTTTTTBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBB...........', // 38 tucked front legs
    '.....TTTTTTTTTTTTTTBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBB.........', // 39
    '....TTTTTT#TTTTTTTTBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBB........', // 40
    '....TTTTTTTTTTTTTTTBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBB........', // 41
    '.....TTTTTTTTTTTTTTTBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBB####B........', // 42 tucked front hoof
    '......TTTTTTTTTTTTTTBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBB........', // 43
    '.......TTTTTTTTTTTTTTBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBB.........', // 44
    '.........TTTTTTTTTTTTTBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBB..........', // 45
    '...........TTTTTTTTTTTTBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBB...........', // 46
    '..............TTTTTTTTTTBBBBBBBBBBBBBBBBBBBBBBBBBBBBBB............', // 47
    '..................TTTTTTTBBBBBBBBBBBBBBBBBBBBBBBBBB...............', // 48
    '..................................................................', // 49
    '..................................................................', // 50
    '..................................................................', // 51
    '..................................................................', // 52
    '..................................................................', // 53
  ],
  LEG,
);

// Gentle curled tail flutter for sleeping Lumi (x=3..24, y=34..49)
const SLEEP_TAIL_B = parseGrid(
  [
    '.........TTT..........', // 34
    '......TTTTTTT.........', // 35
    '....TTTTTTTTTT........', // 36
    '...TTTTT#TTTTTT.......', // 37
    '..TTTTTTTTTTTTTT......', // 38
    '..TTTTTT#TTTTTTTT.....', // 39
    '...TTTTTTTTTTTTTTT....', // 40
    '....TTTTTTTTTTTTTTT...', // 41
    '.....TTTTTTTTTTTTTT...', // 42
    '.......TTTTTTTTTTTTT..', // 43
    '.........TTTTTTTTTTTT.', // 44
    '............TTTTTTTTTT', // 45
    '...............TTTTTTT', // 46
    '...................TTT', // 47
  ],
  LEG,
);

// Blink patch for standing Lumi (overlays y=14..16)
const LUMI_BLINK = parseGrid(
  [
    '................................................BBBB..............',
    '...............................................B####B.............',
    '................................................BBBB..............',
  ],
  LEG,
);

// Joyful arched sparkle-eye patch for poke-invite wiggle/peek (overlays y=13..15 on PERK or y=14..16 on STAND)
const LUMI_HAPPY_EYE = parseGrid(
  [
    '................................................#EE#..............',
    '...............................................#BBBB#.............',
    '................................................BBBB..............',
  ],
  LEG,
);

// Wardrobe overlay: Crystal Pegasus Wings (217) — upright
const WINGS_UP = parseGrid(
  [
    '.................WWWW.............................................',
    '...............WWWWWWWW...........................................',
    '..............WWWWWWWWWWW.........................................',
    '.............WWWW#WWWWWWWWW.......................................',
    '............WWWWWWWWWWWWWWWWW.....................................',
    '............WWWWW#WWWWWWWWWWWWW...................................',
    '.............WWWWWWWWWWWWWWWWWWW..................................',
    '..............WWWWW#WWWWWWWWWWWWW.................................',
    '...............WWWWWWWWWWWWWWWWWWW................................',
    '................WWWW#WWWWWWWWWWWWW................................',
    '.................WWWWWWWWWWWWWWWW.................................',
    '...................WWWWWWWWWWWWW..................................',
    '.....................WWWWWWWWW....................................',
    '.......................WWWWW......................................',
  ],
  LEG,
);

// Wardrobe overlay: Crystal Pegasus Wings — downbeat flap
const WINGS_FLAP = parseGrid(
  [
    '..................................................................',
    '..................................................................',
    '................WWWWWW............................................',
    '..............WWWWWWWWWWW.........................................',
    '.............WWWW#WWWWWWWWW.......................................',
    '............WWWWWWWWWWWWWWWWW.....................................',
    '.............WWWW#WWWWWWWWWWWWW...................................',
    '..............WWWWWWWWWWWWWWWWWW..................................',
    '...............WWWWWWWWWWWWWWWWW..................................',
    '.................WWWWWWWWWWWWWW...................................',
    '....................WWWWWWWWWW....................................',
    '......................WWWWWW......................................',
    '..................................................................',
    '..................................................................',
  ],
  LEG,
);

// Wardrobe overlay: Cozy folded wings for sleeping Lumi (217)
const WINGS_SLEEP = parseGrid(
  [
    '.................WWWWWWWWW........................................',
    '...............WWWWWWWWWWWWWWW....................................',
    '..............WWWW#WWWWWWWWWWWWWW.................................',
    '..............WWWWWWWWWWWWWWWWWWWWW...............................',
    '...............WWWW#WWWWWWWWWWWWWWWW..............................',
    '................WWWWWWWWWWWWWWWWWWW...............................',
    '..................WWWWWWWWWWWWWWWW................................',
    '.....................WWWWWWWWWWW..................................',
  ],
  LEG,
);

// Wardrobe overlay: Starlight Crown (218) — 3-point crown perched behind horn
const CROWN = parseGrid(
  [
    '...C...C...C....',
    '..CCC.CCC.CCC...',
    '..CCCCCCCCCCC...',
    '..CCCCCCCCCCC...',
    '...CCCCCCCCC....',
  ],
  LEG,
);

function buildStandFrame(
  w: WardrobeState,
  legs: Grid,
  o: {
    dy?: number;
    tailB?: boolean;
    tailC?: boolean;
    earPerk?: boolean;
    earFlick?: boolean;
    blink?: boolean;
    happyEye?: boolean;
    flap?: boolean;
  } = {},
) {
  const dy = o.dy ?? 0;
  const layers: Array<{ g: Grid; x: number; y: number }> = [];
  if (w.lumiWings) layers.push({ g: o.flap ? WINGS_FLAP : WINGS_UP, x: 0, y: 11 + dy });
  layers.push({ g: legs, x: 0, y: 36 + dy });
  const customPose = o.tailB || o.tailC || o.earPerk || o.earFlick;
  if (customPose) {
    if (o.tailC) layers.push({ g: TAIL_WAVE_C, x: 0, y: 18 + dy });
    else layers.push({ g: TAIL_WAVE_B, x: 0, y: 22 + dy });
    const body = o.earPerk ? LUMI_STAND_PERK : o.earFlick ? LUMI_STAND_FLICK : LUMI_STAND_NOTAIL;
    layers.push({ g: body, x: 0, y: dy });
  } else {
    layers.push({ g: LUMI_STAND, x: 0, y: dy });
  }
  const eyeY = (o.earPerk ? 13 : 14) + dy;
  if (o.blink) layers.push({ g: LUMI_BLINK, x: 0, y: eyeY });
  else if (o.happyEye) layers.push({ g: LUMI_HAPPY_EYE, x: 0, y: eyeY });
  if (w.lumiCrown) layers.push({ g: CROWN, x: o.earPerk ? 44 : 43, y: (o.earPerk ? 4 : 5) + dy });
  return finishSprite(compose(W, H, layers), PRIO, W, H);
}

function buildRearFrame(w: WardrobeState, dy: number, flap: boolean) {
  const layers: Array<{ g: Grid; x: number; y: number }> = [];
  if (w.lumiWings) layers.push({ g: flap ? WINGS_FLAP : WINGS_UP, x: -3, y: 12 + dy });
  layers.push({ g: LUMI_REAR, x: 0, y: dy });
  if (w.lumiCrown) layers.push({ g: CROWN, x: 37, y: 4 + dy });
  return finishSprite(compose(W, H, layers), PRIO, W, H);
}

function buildSleepFrame(w: WardrobeState, dy: number, tailB: boolean) {
  const layers: Array<{ g: Grid; x: number; y: number }> = [];
  layers.push({ g: LUMI_SLEEP, x: 0, y: dy });
  if (tailB) layers.push({ g: SLEEP_TAIL_B, x: 2, y: 34 + dy });
  if (w.lumiWings) layers.push({ g: WINGS_SLEEP, x: 0, y: 27 + dy });
  if (w.lumiCrown) layers.push({ g: CROWN, x: 41, y: 20 + dy });
  return finishSprite(compose(W, H, layers), PRIO, W, H);
}

export function buildLumi(w: WardrobeState): SpriteSheet {
  const sleep = anim(
    [
      buildSleepFrame(w, 0, false),
      buildSleepFrame(w, 0, true),
      buildSleepFrame(w, 1, true),
      buildSleepFrame(w, 0, false),
    ],
    340,
  );

  const idle = anim(
    [
      buildStandFrame(w, LEGS_STAND, { dy: 0 }),
      buildStandFrame(w, LEGS_STAND, { dy: 0, earPerk: true, tailB: true, flap: true }),
      buildStandFrame(w, LEGS_STAND, { dy: 1, blink: true }),
      buildStandFrame(w, LEGS_STAND, { dy: 0, earFlick: true, tailC: true, flap: true }),
    ],
    220,
  );

  const walk = anim(
    [
      buildStandFrame(w, LEGS_STAND, { dy: 0 }),
      buildStandFrame(w, LEGS_WALK_A, { dy: -1, tailB: true, flap: true }),
      buildStandFrame(w, LEGS_STAND, { dy: 0 }),
      buildStandFrame(w, LEGS_GALLOP_B, { dy: -1, tailB: true, flap: true }),
    ],
    150,
  );

  const run = anim(
    [
      buildStandFrame(w, LEGS_GALLOP_A, { dy: -2, flap: false }),
      buildStandFrame(w, LEGS_WALK_A, { dy: -1, tailB: true, flap: true }),
      buildStandFrame(w, LEGS_GALLOP_B, { dy: 0, flap: true }),
      buildStandFrame(w, LEGS_GALLOP_B, { dy: -1, tailB: true, flap: false }),
      buildStandFrame(w, LEGS_GALLOP_A, { dy: -3, flap: false }),
      buildStandFrame(w, LEGS_WALK_A, { dy: -1, tailB: true, flap: true }),
    ],
    110,
  );

  const rear = anim(
    [
      buildStandFrame(w, LEGS_WALK_A, { dy: -1, flap: true }),
      buildRearFrame(w, 0, false),
      buildRearFrame(w, -1, true),
      buildRearFrame(w, -1, false),
      buildRearFrame(w, 0, true),
    ],
    140,
  );

  const wiggle = anim(
    [
      buildStandFrame(w, LEGS_STAND, { dy: 0 }),
      buildStandFrame(w, LEGS_WALK_A, { dy: 0, earPerk: true, tailC: true, happyEye: true, flap: true }),
      buildStandFrame(w, LEGS_STAND, { dy: 0, earFlick: true, tailB: true }),
      buildStandFrame(w, LEGS_GALLOP_B, { dy: 0, earPerk: true, tailC: true, happyEye: true, flap: true }),
      buildStandFrame(w, LEGS_STAND, { dy: 0, earFlick: true, tailB: true }),
    ],
    130,
  );

  const peek = anim(
    [
      buildStandFrame(w, LEGS_STAND, { dy: 1, blink: true }),
      buildStandFrame(w, LEGS_STAND, { dy: 0, earPerk: true, tailB: true }),
      buildStandFrame(w, LEGS_WALK_A, { dy: 0, earPerk: true, tailC: true, flap: true }),
      buildStandFrame(w, LEGS_STAND, { dy: 0, earFlick: true, tailB: true, happyEye: true }),
    ],
    180,
  );

  return makeSheet(W, H, { sleep, idle, walk, run, rear, wiggle, peek });
}
