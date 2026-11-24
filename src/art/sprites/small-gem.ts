import type { SpriteSheet } from '../../contracts/art';
import type { Grid } from '../ascii';
import { anim, makeSheet, shifted } from '../ascii';
import { art, fin, stamp } from './small-util';

const W = 12;
const H = 12;
const L = { g: 28 };
const P = [28];

// Classic faceted cut crystal diamond inside x=1..10, y=2..9 so +/-1px bob keeps
// a complete 1px ink silhouette inside the 12x12 canvas!
const GEM = art(
  [
    '............', // 0
    '............', // 1
    '...gggggg...', // 2 flat crown table
    '..gg#gg#gg..', // 3 upper crown facets
    '.g########g.', // 4 crisp horizontal girdle line
    '.ggg#gg#ggg.', // 5 converging pavilion facets
    '..ggg##ggg..', // 6 pavilion V point
    '...gggggg...', // 7
    '....gggg....', // 8
    '.....gg.....', // 9 bottom tip
    '............', // 10
    '............', // 11
  ],
  L,
  W,
);

// Rotating facet highlight variants (gives a sparkling faceted crystal spin!)
const GEM_LEFT = art(
  [
    '............', // 0
    '............', // 1
    '...gggggg...', // 2
    '..g#ggg#gg..', // 3
    '.g########g.', // 4
    '.gg#ggg#ggg.', // 5
    '..gg##gggg..', // 6
    '...gggggg...', // 7
    '....gggg....', // 8
    '.....gg.....', // 9
    '............', // 10
    '............', // 11
  ],
  L,
  W,
);

const GEM_RIGHT = art(
  [
    '............', // 0
    '............', // 1
    '...gggggg...', // 2
    '..gg#ggg#g..', // 3
    '.g########g.', // 4
    '.ggg#ggg#gg.', // 5
    '..gggg##gg..', // 6
    '...gggggg...', // 7
    '....gggg....', // 8
    '.....gg.....', // 9
    '............', // 10
    '............', // 11
  ],
  L,
  W,
);

const spTopR = (g: Grid): Grid => stamp(g, 10, 1, ['#']);
const spBotL = (g: Grid): Grid => stamp(g, 1, 9, ['#']);
const spBoth = (g: Grid): Grid => stamp(stamp(g, 1, 1, ['#']), 10, 9, ['#']);

export function buildGem(): SpriteSheet {
  const f = (g: Grid) => fin(g, P);

  // float (4 frames): smooth levitation bob + twinkling corner sparkles
  const float = [
    f(GEM),
    f(spTopR(shifted(GEM, 0, -1))),
    f(spBotL(GEM)),
    f(shifted(GEM, 0, 1)),
  ];

  // wiggle (4 frames): dazzling faceted shimmer spin + buoyant micro-bob
  const wiggle = [
    f(spTopR(GEM_LEFT)),
    f(shifted(GEM, 0, -1)),
    f(spBotL(GEM_RIGHT)),
    f(GEM),
  ];

  // idle (4 frames): shimmering rotating crystal gleam + alternating sparkles
  const idle = [
    f(GEM),
    f(spTopR(GEM_RIGHT)),
    f(spBoth(GEM)),
    f(spBotL(GEM_LEFT)),
  ];

  return makeSheet(W, H, {
    float: anim(float, 240),
    wiggle: anim(wiggle, 110),
    idle: anim(idle, 220),
  });
}
