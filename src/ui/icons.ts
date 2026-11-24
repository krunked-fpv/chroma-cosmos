/**
 * Bespoke heirloom hand-illustrated inline SVG art & icons (static, self-contained, zero external URLs).
 * Wanderlings storybook palette: warm cedar, tarnished brass, twilight ink (#231942), cotton cream (#fbf3e0), starlight gold (#ffd43b).
 */
import type { AudioLevel } from '../contracts/audio';
import type { BrushId } from '../contracts/roguelike';

const svg = (body: string, vb = '0 0 32 32'): string =>
  `<svg viewBox="${vb}" xmlns="http://www.w3.org/2000/svg" fill="none" stroke-linecap="round" stroke-linejoin="round">${body}</svg>`;

/** The Enchanted Pencil — hand-illustrated cedar-and-brass artist pencil with starlight tip. */
export const ICON_ENCHANTED_PENCIL = svg(
  `<g transform="rotate(-12 20 20)">` +
    `<path d="M9 31l3.6-8.4L27.2 8a2.2 2.2 0 013.1 0l2.2 2.2a2.2 2.2 0 010 3.1L17.9 27.9z" fill="#b36a3c" stroke="#231942" stroke-width="2"/>` +
    `<path d="M12.6 22.6L25 10.2l3.4 3.4L16 26z" fill="#c97d4b"/>` +
    `<path d="M14.3 24.3L26.7 11.9" stroke="#6f391b" stroke-width="1.3" opacity=".65"/>` +
    `<path d="M24.2 11l5.3 5.3 2.4-2.4-5.3-5.3z" fill="#d9ad5b" stroke="#231942" stroke-width="1.8"/>` +
    `<path d="M25.6 9.6l5.3 5.3" stroke="#fff3c4" stroke-width="1.1"/>` +
    `<path d="M27.3 7.9l2-2a2.3 2.3 0 013.2 0l1.9 1.9a2.3 2.3 0 010 3.2l-2 2z" fill="#e89bb0" stroke="#231942" stroke-width="1.8"/>` +
    `<path d="M9 31l3.6-8.4 5.3 5.3z" fill="#f7e4be" stroke="#231942" stroke-width="1.8"/>` +
    `<path d="M9 31l1.7-4 2.3 2.3z" fill="#ffd43b" stroke="#231942" stroke-width="1.3"/>` +
    `<path d="M6.5 31.5l1.2-2.6 1.2 2.6 2.6 1.2-2.6 1.2-1.2 2.6-1.2-2.6-2.6-1.2z" fill="#ffd43b" opacity=".92"/>` +
    `<circle cx="21" cy="17" r="1" fill="#ffe9a6"/><circle cx="17.5" cy="20.5" r=".8" fill="#ffe9a6"/>` +
    `</g>`,
  '0 0 40 40',
);

/** The Starlight Wand — hand-illustrated dark-cedar & tarnished-brass wand crowned with a glowing starlight crystal. */
export const ICON_STARLIGHT_WAND = svg(
  `<path d="M7 33L22.5 17.5" stroke="#231942" stroke-width="5.2"/>` +
    `<path d="M7 33L22.5 17.5" stroke="#7c4728" stroke-width="3.2"/>` +
    `<path d="M10.5 29.5L21 19" stroke="#d9ad5b" stroke-width="1.1" stroke-dasharray="2 3"/>` +
    `<path d="M20.5 16.5l3 3" stroke="#e5bd6f" stroke-width="3"/>` +
    `<path d="M26 5.5l2.5 5.4 6 .8-4.4 4.1 1.1 5.9L26 18.8l-5.2 2.9 1.1-5.9-4.4-4.1 6-.8z" fill="#ffe27a" stroke="#231942" stroke-width="2"/>` +
    `<path d="M26 8.8l1.3 2.9 3.1.4-2.3 2.1.6 3.1-2.7-1.5-2.7 1.5.6-3.1-2.3-2.1 3.1-.4z" fill="#fffaf0" opacity=".82"/>` +
    `<circle cx="13" cy="11" r="1.5" fill="#7fe7f0"/><circle cx="34" cy="24" r="1.3" fill="#ff9ecf"/>` +
    `<path d="M14.5 6.5l.8 1.7 1.7.8-1.7.8-.8 1.7-.8-1.7-1.7-.8 1.7-.8z" fill="#fff4c4"/>`,
  '0 0 40 40',
);

export const ICON_GEM = svg(
  `<path d="M9 5h14l6 8-13 15L3 13z" fill="#9be8ff" stroke="#231942" stroke-width="2.1"/>` +
    `<path d="M3 13h26M9 5l4 8 3 15M23 5l-4 8-3 15M13 13l3-8 3 8" stroke="#231942" stroke-width="1.5"/>` +
    `<path d="M10 7l2 5H6z" fill="#fff" opacity=".88"/><path d="M20 15l-4 11 9-11z" fill="#b69cff" opacity=".75"/>`,
);

/** Bespoke embroidered Story Star Socket SVG for the stitched linen bookmark. */
export function storyStarSocketSvg(lit: boolean, progress = 0): string {
  const starPath = 'M16 3.4l3.5 7.4 8.2 1-6 5.7 1.5 8.1L16 21.7l-7.2 3.9 1.5-8.1-6-5.7 8.2-1z';
  if (lit) {
    return svg(
      `<circle cx="16" cy="16" r="13.5" fill="#ffd43b" opacity=".24"/>` +
        `<path d="${starPath}" fill="#ffd43b" stroke="#231942" stroke-width="1.9"/>` +
        `<path d="M16 6.8l2.1 4.4 4.8.6-3.5 3.3.9 4.7-4.3-2.3-4.3 2.3.9-4.7-3.5-3.3 4.8-.6z" fill="#fff9d6" opacity=".85"/>` +
        `<path d="M16 1v2.2M16 28.8V31M1 16h2.2M28.8 16H31" stroke="#ffe794" stroke-width="1.6" opacity=".85"/>`,
    );
  }
  const warm = Math.max(0, Math.min(1, progress));
  const fillOpacity = (warm * 0.42).toFixed(2);
  return svg(
    `<path d="${starPath}" fill="${warm > 0.05 ? '#ffd43b' : '#fbf3e0'}" fill-opacity="${warm > 0.05 ? fillOpacity : '0.1'}" stroke="#e9dab8" stroke-width="2" stroke-dasharray="3.2 2.4"/>` +
      `<path d="M16 9.5l1.3 2.8 3 .4-2.2 2 .5 3-2.6-1.4-2.6 1.4.5-3-2.2-2 3-.4z" stroke="#c9b48a" stroke-width="1.2" opacity=".65"/>`,
  );
}

/** Faceted Prism Stardust Crystal shard presets resting inside the corked glass apothecary jar. */
const JAR_SHARDS: ReadonlyArray<{ pts: string; fill: string; shine: string }> = [
  { pts: '14,44 19,35 24,44 19,48', fill: '#7fe7f0', shine: '#e6fcff' },
  { pts: '24,45 29,36 35,44 30,49', fill: '#ff9ecf', shine: '#ffe6f3' },
  { pts: '33,44 38,37 42,45 37,48', fill: '#ffd43b', shine: '#fff8cf' },
  { pts: '17,39 22,31 27,39 22,43', fill: '#b69cff', shine: '#f1ebff' },
  { pts: '27,39 33,31 38,39 32,43', fill: '#b5f2d0', shine: '#ebfff4' },
  { pts: '13,36 17,28 22,35 17,39', fill: '#ffa94d', shine: '#fff0d9' },
  { pts: '22,33 27,25 32,33 27,37', fill: '#7fe7f0', shine: '#ffffff' },
  { pts: '31,34 36,27 41,35 36,38', fill: '#ff9ecf', shine: '#fff0f7' },
  { pts: '16,29 21,22 26,29 21,33', fill: '#ffd43b', shine: '#fffbe0' },
  { pts: '26,28 31,21 36,28 31,32', fill: '#b69cff', shine: '#ffffff' },
  { pts: '20,24 25,18 30,24 25,28', fill: '#b5f2d0', shine: '#ffffff' },
  { pts: '28,23 33,18 38,24 33,27', fill: '#ffa94d', shine: '#fff5e6' },
];

/** Hand-illustrated corked glass apothecary bottle filled with faceted Prism Stardust Crystals. */
export function crystalJarSvg(gems: number): string {
  const count = gems <= 0 ? 1 : Math.min(JAR_SHARDS.length, Math.max(2, Math.ceil(Math.sqrt(gems) * 1.15)));
  const shards = JAR_SHARDS.slice(0, count)
    .map(
      (s, i) =>
        `<g class="cc-jar-shard" style="--si:${i}"><polygon points="${s.pts}" fill="${s.fill}" stroke="#231942" stroke-width="1.2"/>` +
        `<polygon points="${s.pts}" fill="${s.shine}" opacity=".32"/></g>`,
    )
    .join('');

  return svg(
    // Soft moonlight jar glow
    `<ellipse cx="28" cy="36" rx="18" ry="15" fill="#9be8ff" opacity=".18"/>` +
      // Cork stopper
      `<path d="M21 5h14l-1.3 8.5h-11.4z" fill="#b87a4b" stroke="#231942" stroke-width="2"/>` +
      `<path d="M22.5 8.5h11M23.5 11.2h9" stroke="#7c4728" stroke-width="1.2" opacity=".7"/>` +
      // Glass neck & body silhouette
      `<path d="M19.5 13h17v4.5c5.8 3 9.5 8.6 9.5 16.5 0 9.5-5.5 16-18 16S10 43.5 10 34c0-7.9 3.7-13.5 9.5-16.5z" fill="rgba(232,247,255,0.22)" stroke="#231942" stroke-width="2.2"/>` +
      // Glowing crystal shards inside
      `<g class="cc-jar-crystals">${shards}</g>` +
      // Twine collar around neck
      `<path d="M18.5 15.5c4.5 1.8 14.5 1.8 19 0" stroke="#e4c590" stroke-width="2.6"/>` +
      `<path d="M18.5 15.5c4.5 1.8 14.5 1.8 19 0" stroke="#7c4728" stroke-width="1.1"/>` +
      // Glass highlight & warm reflection
      `<path d="M15 26c-1.5 3.6-1.7 9 .2 13.8" stroke="#ffffff" stroke-width="2.4" opacity=".72"/>` +
      `<path d="M40.5 25c1 2.5 1.2 5.4.6 8.2" stroke="#ffe9a6" stroke-width="1.6" opacity=".55"/>` +
      `<ellipse cx="28" cy="13" rx="8.5" ry="2" fill="#e6f7ff" stroke="#231942" stroke-width="1.6"/>`,
    '0 0 56 56',
  );
}

/** Hammered tarnished-brass desk bell icon with 4 unmistakable visual audio states (3 -> 2 -> 1 -> 0). */
export function audioIcon(level: AudioLevel): string {
  const bellBase =
    `<circle cx="14" cy="6.5" r="2.2" fill="#e8c373" stroke="#231942" stroke-width="1.8"/>` +
    `<path d="M14 8.5c-5.2 0-8 4-8 10.2v2.8l-2 2.4h20l-2-2.4v-2.8c0-6.2-2.8-10.2-8-10.2z" fill="${level === 0 ? '#6e5e96' : '#e5b962'}" stroke="#231942" stroke-width="2"/>` +
    `<path d="M10.5 12.5c-1.4 1.8-2 4.3-2 7" stroke="#fff6d6" stroke-width="1.6" opacity="${level === 0 ? '.35' : '.8'}"/>` +
    `<circle cx="14" cy="26" r="2.6" fill="${level === 0 ? '#4b3d7a' : '#c98e35'}" stroke="#231942" stroke-width="1.8"/>`;

  if (level === 0) {
    return svg(
      bellBase +
        `<path d="M22.5 10.5h4.2l-4.2 4.4h4.2" stroke="#b69cff" stroke-width="1.8"/>` +
        `<path d="M25.8 5.2h3.2l-3.2 3.4h3.2" stroke="#dcd0ff" stroke-width="1.5"/>` +
        `<path d="M21 23l7-5.5" stroke="#231942" stroke-width="2.1" opacity=".7"/>`,
    );
  }
  const waves = [
    `<path d="M23 13.5c1.5 1.8 1.5 4.2 0 6" stroke="#ff9ecf" stroke-width="2.4"/>`,
    `<path d="M25.6 10.5c2.6 3.2 2.6 8.8 0 12" stroke="#ffd43b" stroke-width="2.4"/>`,
    `<path d="M28.2 7.5c3.7 4.6 3.7 13.4 0 18" stroke="#7fe7f0" stroke-width="2.4"/>`,
  ];
  return svg(bellBase + waves.slice(0, level).join(''));
}

export const AUDIO_LABEL: Record<AudioLevel, string> = {
  3: 'Brass Bell: Loud (tap to soften)',
  2: 'Brass Bell: Warm (tap to soften)',
  1: 'Brass Bell: Whisper (tap to hush)',
  0: 'Brass Bell: Hushed (tap to wake music)',
};

/** Glowing curled bottom-right parchment dog-ear with peeking miniature Star-Door archways underneath. */
export const DOG_EAR_NEXT_SVG = svg(
  // Peeking starry twilight & golden Star-Door archway revealed beneath the curled page corner
  `<path d="M18 76L76 18v58z" fill="#231942"/>` +
    `<path d="M22 76L76 22v54z" fill="#322360"/>` +
    `<path d="M48 75V50a11 11 0 0122 0v25z" fill="#ffd43b" stroke="#fff3c4" stroke-width="1.8"/>` +
    `<path d="M53 75V52a6 6 0 0112 0v23z" fill="#fffaf0" opacity=".9"/>` +
    `<path d="M59 44l1.1 2.4 2.6.4-1.9 1.8.5 2.5-2.3-1.2-2.3 1.2.5-2.5-1.9-1.8 2.6-.4z" fill="#ff9ecf"/>` +
    `<circle cx="42" cy="64" r="1.6" fill="#fff4c4"/><circle cx="68" cy="34" r="1.4" fill="#7fe7f0"/>` +
    // Curled cream cotton parchment flap folding inward-left
    `<path d="M18 76 C22 50, 32 34, 48 28 C58 24, 67 21, 76 18 C54 34, 38 52, 18 76z" fill="#f2e2be" stroke="#231942" stroke-width="2"/>` +
    `<path d="M18 76 C25 56, 36 42, 52 34 C60 30, 68 24, 76 18 C56 36, 42 54, 18 76z" fill="#fff8e6" opacity=".88"/>` +
    `<path d="M24 69 C32 52, 43 40, 62 29" stroke="#d4b886" stroke-width="1.4" opacity=".8"/>`,
  '0 0 80 80',
);

/** Subtle unlit top-right folded parchment dog-ear for optional early page turns. */
export const DOG_EAR_EARLY_SVG = svg(
  `<path d="M12 4h32v32z" fill="#3a241b" opacity=".28"/>` +
    `<path d="M12 4 C14 17, 19 25, 29 29 C34 31, 39 33, 44 36 L12 4z" fill="#e9d7ad" stroke="#5b4634" stroke-width="1.6"/>` +
    `<path d="M14 7 C17 17, 22 23, 33 28" stroke="#fff8e6" stroke-width="1.4" opacity=".7"/>`,
  '0 0 48 48',
);

/** Tarnished brass corner clasp for the heirloom cotton sketchbook frame. */
export const BRASS_CLASP_SVG = svg(
  `<path d="M3 3h24c-2 6-5 9-10 10-5 1-8 4-10 10V3z" fill="#c99848" stroke="#231942" stroke-width="1.8"/>` +
    `<path d="M5 5h17c-1.8 4-4.2 6-7.8 6.8-3.6.8-6 3.2-7.2 7.2V5z" fill="#e6be70" opacity=".75"/>` +
    `<circle cx="9.5" cy="9.5" r="2" fill="#8b5d22" stroke="#231942" stroke-width="1.1"/>` +
    `<circle cx="19" cy="7.5" r="1.3" fill="#fff2c2"/>` +
    `<circle cx="7.5" cy="19" r="1.3" fill="#fff2c2"/>`,
  '0 0 32 32',
);

/** Delicate hand-drawn botanical & celestial ink corner filigree. */
export const CORNER_FILIGREE_SVG = svg(
  `<path d="M6 42 C8 22, 18 10, 42 6" stroke="#4a3763" stroke-width="1.3" opacity=".45"/>` +
    `<path d="M14 26 C18 22, 22 18, 28 14" stroke="#4a3763" stroke-width="1" stroke-dasharray="2 3" opacity=".4"/>` +
    `<path d="M16 15a5 5 0 105 5 3.6 3.6 0 01-5-5z" fill="#c99848" opacity=".45"/>` +
    `<circle cx="31" cy="11" r="1.4" fill="#c99848" opacity=".55"/>` +
    `<circle cx="11" cy="32" r="1.3" fill="#c99848" opacity=".55"/>`,
  '0 0 48 48',
);

/** Embossed crimson-gold wax seal emblem for the Begin / Continue Voyage parchment ribbon. */
export const WAX_SEAL_VOYAGE_SVG = svg(
  `<path d="M18 3c3.4 0 5 1.8 7.8 2.6 2.8.8 5 2.7 5.6 5.6.6 2.9 2.6 4.4 2.6 7.8 0 3.4-1.8 5-2.6 7.8-.8 2.8-2.7 5-5.6 5.6-2.9.6-4.4 2.6-7.8 2.6-3.4 0-5-1.8-7.8-2.6-2.8-.8-5-2.7-5.6-5.6C4 23.9 2 22.4 2 19c0-3.4 1.8-5 2.6-7.8.8-2.8 2.7-5 5.6-5.6C13.1 4.8 14.6 3 18 3z" fill="#b43c4e" stroke="#231942" stroke-width="1.8"/>` +
    `<circle cx="18" cy="19" r="11.5" fill="#9a2f40" stroke="#e8c373" stroke-width="1.5"/>` +
    `<path d="M18 10.5l2.1 5.4 5.4 2.1-5.4 2.1-2.1 5.4-2.1-5.4-5.4-2.1 5.4-2.1z" fill="#ffd43b" stroke="#231942" stroke-width="1"/>`,
  '0 0 36 38',
);

export const ICON_STAR = svg(
  `<path d="M16 3l3.8 8.2 8.9 1-6.6 6.1 1.8 8.8L16 22.7 8.1 27.1l1.8-8.8L3.3 12.2l8.9-1z" fill="#ffd43b" stroke="#231942" stroke-width="2.1"/>` +
    `<path d="M11.5 13.5l2.5-.4" stroke="#fff" stroke-width="2"/>`,
);

export const ICON_CLOSE = svg(`<path d="M9 9l14 14M23 9L9 23" stroke="currentColor" stroke-width="3.2"/>`);

export const BRUSH_ICONS: Record<BrushId, string> = {
  standard: svg(
    `<path d="M7 25l2-6L22 6l4 4L13 23z" fill="#c97d4b" stroke="#231942" stroke-width="2.1"/>` +
      `<path d="M19 9l4 4" stroke="#e5bd6f" stroke-width="2.4"/><path d="M7 25l2-6 4 4z" fill="#fbf3e0" stroke="#231942" stroke-width="1.8"/>` +
      `<path d="M7 25l1-3 2 2z" fill="#ffd43b"/><path d="M22 6l4 4 1.5-1.5a2 2 0 000-3l-1-1a2 2 0 00-3 0z" fill="#e89bb0" stroke="#231942" stroke-width="1.9"/>`,
  ),
  turboCheetah: svg(
    `<rect x="5" y="11" width="19" height="10" rx="3" fill="#ffcf5a" stroke="#231942" stroke-width="2.1"/>` +
      `<path d="M24 12.5l4 2v3l-4 2z" fill="#ff9a3c" stroke="#231942" stroke-width="2"/>` +
      `<circle cx="10" cy="15" r="1.6" fill="#8a3b12"/><circle cx="15" cy="17.5" r="1.4" fill="#8a3b12"/><circle cx="19" cy="14.5" r="1.3" fill="#8a3b12"/>` +
      `<path d="M2 9h5M1 16h3M2 23h5" stroke="#ff9ecf" stroke-width="2"/>`,
  ),
  twinTail: svg(
    `<path d="M5 24c4-12 10-2 13-10s7-6 9-8" stroke="#b69cff" stroke-width="3.2"/>` +
      `<path d="M5 28c5-10 11-1 14-8s6-6 9-7" stroke="#7fe7f0" stroke-width="3.2"/>` +
      `<path d="M24 4l1 2.2 2.4.4-1.7 1.6.4 2.3-2.1-1.1-2.1 1.1.4-2.3-1.7-1.6 2.4-.4z" fill="#ffd43b" stroke="#231942" stroke-width="1"/>`,
  ),
  supernovaSponge: svg(
    `<path d="M6 10c0-3 3-4 5-3 2-3 7-3 9 0 3-1 6 1 6 4 2 2 1 6-1 7 0 3-3 5-6 4-2 3-7 3-9 0-3 1-6-2-5-5-2-2-1-6 1-7z" fill="#ff9ecf" stroke="#231942" stroke-width="2.1"/>` +
      `<circle cx="11" cy="13" r="1.6" fill="#b3436f"/><circle cx="19" cy="11" r="1.3" fill="#b3436f"/><circle cx="16" cy="18" r="1.8" fill="#b3436f"/><circle cx="22" cy="17" r="1.1" fill="#b3436f"/>` +
      `<path d="M27 4l.8 1.8 1.9.3-1.4 1.3.3 1.9-1.6-.9-1.6.9.3-1.9-1.4-1.3 1.9-.3z" fill="#fff"/>`,
  ),
  zeroGGel: svg(
    `<path d="M9 26l-2-2 13-13 4 4-13 13z" fill="#7fe7f0" stroke="#231942" stroke-width="2.1"/>` +
      `<path d="M20 11l3-3 4 4-3 3" fill="#2d2a7a" stroke="#231942" stroke-width="2"/><path d="M7 24l-2 3 3-2" stroke="#231942" stroke-width="2"/>` +
      `<circle cx="22" cy="23" r="2.4" stroke="#b69cff" stroke-width="1.8"/><circle cx="26.5" cy="19" r="1.5" stroke="#b69cff" stroke-width="1.6"/><circle cx="11" cy="8" r="2" stroke="#ff9ecf" stroke-width="1.6"/>`,
  ),
};

export const BRUSH_NAMES: Record<BrushId, string> = {
  standard: 'Trusty Star Pencil',
  turboCheetah: 'Turbo Cheetah Marker',
  twinTail: 'Twin-Tail Unicorn Brush',
  supernovaSponge: 'Supernova Stamp Sponge',
  zeroGGel: 'Zero-Gravity Gel Pen',
};

/** Strictly <= 4 words whisper parchment micro-tag copy for each brush tip. */
export const BRUSH_TAGS: Record<BrushId, string> = {
  standard: 'Trusty star tip',
  turboCheetah: 'Turbo Cheetah stroke',
  twinTail: 'Twin-Tail ribbons',
  supernovaSponge: 'Supernova stamp bloom',
  zeroGGel: 'Zero-G float pen',
};

export const ICON_PREV = svg(`<path d="M20 6L10 16l10 10" stroke="currentColor" stroke-width="3.6"/>`);
export const ICON_NEXT = svg(`<path d="M12 6l10 10-10 10" stroke="currentColor" stroke-width="3.6"/>`);
export const ICON_BACK = svg(
  `<path d="M13 8l-7 7 7 7" stroke="currentColor" stroke-width="3.2"/><path d="M7 15h12a7 7 0 010 14h-3" stroke="currentColor" stroke-width="3.2"/>`,
);
export const ICON_POSTCARD = svg(
  `<rect x="4" y="7" width="24" height="18" rx="2.5" fill="#fbf3e0" stroke="#231942" stroke-width="2"/>` +
    `<path d="M16 10v12" stroke="#231942" stroke-width="1.4" stroke-dasharray="2 2"/><rect x="20" y="10" width="5" height="5" fill="#d9ad5b" stroke="#231942" stroke-width="1.3"/>` +
    `<path d="M7 19c2-4 4-4 6 0" stroke="#7b3fa0" stroke-width="2"/><path d="M19 19h6M19 22h4" stroke="#231942" stroke-width="1.4"/>`,
);
export const ICON_SCROLL_EXPORT = svg(
  `<path d="M8 6h14a3 3 0 013 3v14a3 3 0 01-3 3H8a3 3 0 01-3-3V9a3 3 0 013-3z" fill="#fbf3e0" stroke="#231942" stroke-width="2"/>` +
    `<path d="M15 20V11m-4 4l4-4 4 4" stroke="#7b3fa0" stroke-width="2.4"/>` +
    `<circle cx="24" cy="23" r="4.5" fill="#b43c4e" stroke="#231942" stroke-width="1.5"/>`,
);
export const ICON_SCROLL_IMPORT = svg(
  `<path d="M8 6h14a3 3 0 013 3v14a3 3 0 01-3 3H8a3 3 0 01-3-3V9a3 3 0 013-3z" fill="#fbf3e0" stroke="#231942" stroke-width="2"/>` +
    `<path d="M15 11v9m-4-4l4 4 4-4" stroke="#2e7d62" stroke-width="2.4"/>` +
    `<circle cx="24" cy="23" r="4.5" fill="#d9ad5b" stroke="#231942" stroke-width="1.5"/>`,
);
export const ICON_TIN_CLASP = svg(
  `<rect x="6" y="10" width="20" height="12" rx="4" fill="#d9ad5b" stroke="#231942" stroke-width="2"/>` +
    `<circle cx="16" cy="16" r="2.6" fill="#231942"/>`,
);
