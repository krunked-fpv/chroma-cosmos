/** Hand-drawn-feeling inline SVG icons (static, trusted strings). viewBox 0 0 32 32. */
import type { AudioLevel } from '../contracts/audio';
import type { BrushId } from '../contracts/roguelike';

const svg = (body: string, vb = '0 0 32 32'): string =>
  `<svg viewBox="${vb}" xmlns="http://www.w3.org/2000/svg" fill="none" stroke-linecap="round" stroke-linejoin="round">${body}</svg>`;

export const ICON_GEM = svg(
  `<path d="M9 5h14l6 8-13 15L3 13z" fill="#9be8ff" stroke="#231942" stroke-width="2.2"/>` +
    `<path d="M3 13h26M9 5l4 8 3 15M23 5l-4 8-3 15M13 13l3-8 3 8" stroke="#231942" stroke-width="1.6"/>` +
    `<path d="M10 7l2 5H6z" fill="#fff" opacity=".85"/><path d="M20 15l-4 11 9-11z" fill="#b69cff" opacity=".7"/>`,
);

const SPEAKER = `<path d="M5 12h5l7-6v20l-7-6H5z" fill="#fff1c9" stroke="#231942" stroke-width="2.2"/>`;

export function audioIcon(level: AudioLevel): string {
  if (level === 0) {
    return svg(
      SPEAKER +
        `<text x="20" y="15" font-size="9" font-weight="900" fill="#b69cff" stroke="#231942" stroke-width=".6" font-family="system-ui">z</text>` +
        `<text x="24" y="10" font-size="7" font-weight="900" fill="#b69cff" stroke="#231942" stroke-width=".5" font-family="system-ui">z</text>` +
        `<path d="M20 22l7-5" stroke="#231942" stroke-width="2.2" opacity=".55"/>`,
    );
  }
  const waves = [
    `<path d="M20.5 12.5c1.6 2 1.6 5 0 7" stroke="#ff9ecf" stroke-width="2.6"/>`,
    `<path d="M23.5 9.5c3 3.6 3 9.4 0 13" stroke="#ffd43b" stroke-width="2.6"/>`,
    `<path d="M26.5 6.5c4.4 5.2 4.4 13.8 0 19" stroke="#7fe7f0" stroke-width="2.6"/>`,
  ];
  return svg(SPEAKER + waves.slice(0, level).join(''));
}

export const AUDIO_LABEL: Record<AudioLevel, string> = {
  3: 'Sound: loud (tap to make it softer)',
  2: 'Sound: medium (tap to make it softer)',
  1: 'Sound: soft (tap to mute)',
  0: 'Sound: sleeping (tap to wake the music)',
};

export const ICON_STAR = svg(
  `<path d="M16 3l3.8 8.2 8.9 1-6.6 6.1 1.8 8.8L16 22.7 8.1 27.1l1.8-8.8L3.3 12.2l8.9-1z" fill="#ffd43b" stroke="#231942" stroke-width="2.2"/>` +
    `<path d="M11.5 13.5l2.5-.4" stroke="#fff" stroke-width="2"/>`,
);

export const ICON_CLOSE = svg(`<path d="M9 9l14 14M23 9L9 23" stroke="currentColor" stroke-width="3.4"/>`);

export const ICON_HOME = svg(
  `<path d="M5 15L16 5l11 10" stroke="#231942" stroke-width="2.6"/>` +
    `<path d="M8 13v13h16V13" fill="#ffb3d9" stroke="#231942" stroke-width="2.2"/>` +
    `<path d="M14 26v-6h4v6" fill="#7b3fa0" stroke="#231942" stroke-width="2"/>` +
    `<path d="M22.5 6.5l.9 1.9 2 .3-1.5 1.4.4 2-1.8-1-1.8 1 .4-2-1.5-1.4 2-.3z" fill="#ffd43b"/>`,
);

export const BRUSH_ICONS: Record<BrushId, string> = {
  standard: svg(
    `<path d="M7 25l2-6L22 6l4 4L13 23z" fill="#ffd43b" stroke="#231942" stroke-width="2.2"/>` +
      `<path d="M19 9l4 4" stroke="#231942" stroke-width="2"/><path d="M7 25l2-6 4 4z" fill="#fbf3e0" stroke="#231942" stroke-width="1.8"/>` +
      `<path d="M7 25l1-3 2 2z" fill="#231942"/><path d="M22 6l4 4 1.5-1.5a2 2 0 000-3l-1-1a2 2 0 00-3 0z" fill="#ff9ecf" stroke="#231942" stroke-width="2"/>`,
  ),
  turboCheetah: svg(
    `<rect x="5" y="11" width="19" height="10" rx="3" fill="#ffcf5a" stroke="#231942" stroke-width="2.2"/>` +
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
    `<path d="M6 10c0-3 3-4 5-3 2-3 7-3 9 0 3-1 6 1 6 4 2 2 1 6-1 7 0 3-3 5-6 4-2 3-7 3-9 0-3 1-6-2-5-5-2-2-1-6 1-7z" fill="#ff9ecf" stroke="#231942" stroke-width="2.2"/>` +
      `<circle cx="11" cy="13" r="1.6" fill="#b3436f"/><circle cx="19" cy="11" r="1.3" fill="#b3436f"/><circle cx="16" cy="18" r="1.8" fill="#b3436f"/><circle cx="22" cy="17" r="1.1" fill="#b3436f"/>` +
      `<path d="M27 4l.8 1.8 1.9.3-1.4 1.3.3 1.9-1.6-.9-1.6.9.3-1.9-1.4-1.3 1.9-.3z" fill="#fff"/>`,
  ),
  zeroGGel: svg(
    `<path d="M9 26l-2-2 13-13 4 4-13 13z" fill="#7fe7f0" stroke="#231942" stroke-width="2.2"/>` +
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

export const ICON_DOODLE = svg(
  `<path d="M6 27L19 14" stroke="#fbf3e0" stroke-width="3.4"/><path d="M6 27L19 14" stroke="#231942" stroke-width="1.2" stroke-dasharray="2 3"/>` +
    `<path d="M22 4l1.9 4.2 4.6.6-3.4 3.1.9 4.5-4-2.3-4 2.3.9-4.5-3.4-3.1 4.6-.6z" fill="#ffd43b" stroke="#231942" stroke-width="1.8"/>` +
    `<circle cx="9" cy="10" r="1.3" fill="#fff"/><circle cx="27" cy="22" r="1.1" fill="#fff"/><circle cx="14" cy="5" r=".9" fill="#fff"/>`,
);

export const ICON_DOOR = svg(
  `<path d="M8 28V12a8 8 0 0116 0v16z" fill="#7b3fa0" stroke="#231942" stroke-width="2.2"/>` +
    `<path d="M11 28V13a5 5 0 0110 0v15" fill="#ffd43b" opacity=".9"/>` +
    `<path d="M16 9l1 2.2 2.4.3-1.7 1.6.4 2.4-2.1-1.2-2.1 1.2.4-2.4-1.7-1.6 2.4-.3z" fill="#fff"/>` +
    `<path d="M4 28h24" stroke="#231942" stroke-width="2.2"/>`,
);

export const ICON_PAGE_CORNER = svg(
  `<path d="M5 5h16l6 6v16H5z" fill="#fbf3e0" stroke="#231942" stroke-width="2"/>` +
    `<path d="M21 5v6h6" fill="#e9d9b6" stroke="#231942" stroke-width="2"/>` +
    `<path d="M10 18h9m-3-3l3 3-3 3" stroke="#7b3fa0" stroke-width="2.2"/>`,
);

export const ICON_PLAY = svg(`<path d="M10 6l16 10-16 10z" fill="#fff1c9" stroke="#231942" stroke-width="2.4"/>`);
export const ICON_CONTINUE = svg(
  `<path d="M6 7l11 9-11 9z" fill="#fff1c9" stroke="#231942" stroke-width="2.2"/><path d="M15 7l11 9-11 9z" fill="#ffd43b" stroke="#231942" stroke-width="2.2"/>`,
);
export const ICON_PREV = svg(`<path d="M20 6L10 16l10 10" stroke="currentColor" stroke-width="4"/>`);
export const ICON_NEXT = svg(`<path d="M12 6l10 10-10 10" stroke="currentColor" stroke-width="4"/>`);
export const ICON_BACK = svg(
  `<path d="M13 8l-7 7 7 7" stroke="currentColor" stroke-width="3.4"/><path d="M7 15h12a7 7 0 010 14h-3" stroke="currentColor" stroke-width="3.4"/>`,
);
export const ICON_POSTCARD = svg(
  `<rect x="4" y="7" width="24" height="18" rx="2" fill="#fbf3e0" stroke="#231942" stroke-width="2.2"/>` +
    `<path d="M16 10v12" stroke="#231942" stroke-width="1.4" stroke-dasharray="2 2"/><rect x="20" y="10" width="5" height="5" fill="#ff9ecf" stroke="#231942" stroke-width="1.4"/>` +
    `<path d="M7 19c2-4 4-4 6 0" stroke="#7b3fa0" stroke-width="2"/><path d="M19 19h6M19 22h4" stroke="#231942" stroke-width="1.4"/>`,
);
export const ICON_EXPORT = svg(
  `<path d="M7 18v8h18v-8" stroke="currentColor" stroke-width="2.8"/><path d="M16 21V5m-6 6l6-6 6 6" stroke="currentColor" stroke-width="2.8"/>`,
);
export const ICON_IMPORT = svg(
  `<path d="M7 18v8h18v-8" stroke="currentColor" stroke-width="2.8"/><path d="M16 4v16m-6-6l6 6 6-6" stroke="currentColor" stroke-width="2.8"/>`,
);
export const ICON_LOCK = svg(
  `<rect x="8" y="14" width="16" height="13" rx="3" fill="#b69cff" stroke="#231942" stroke-width="2.2"/><path d="M11 14v-3a5 5 0 0110 0v3" stroke="#231942" stroke-width="2.4"/>`,
);

export const TAB_ICONS = {
  mediums: svg(
    `<path d="M16 4C8 4 4 10 4 16s5 12 11 12c3 0 3-3 1-5s0-5 3-5h4c3 0 5-2 5-5 0-5-5-9-12-9z" fill="#fbf3e0" stroke="#231942" stroke-width="2.2"/>` +
      `<circle cx="10" cy="15" r="2.3" fill="#ff6b6b"/><circle cx="13" cy="9" r="2.3" fill="#ffd43b"/><circle cx="20" cy="9" r="2.3" fill="#69db7c"/><circle cx="24" cy="14" r="2.3" fill="#4dabf7"/>`,
  ),
  wardrobe: svg(
    `<path d="M16 7a3 3 0 113 3c-2 1-3 2-3 3" stroke="#231942" stroke-width="2.2"/>` +
      `<path d="M16 13L4 23c-1 1 0 3 1 3h22c1 0 2-2 1-3z" fill="#ff9ecf" stroke="#231942" stroke-width="2.2"/>`,
  ),
  badges: svg(
    `<path d="M6 22L12 9l8 6 6-9" stroke="#b69cff" stroke-width="1.8" stroke-dasharray="2 2"/>` +
      `<circle cx="6" cy="22" r="2.6" fill="#ffd43b" stroke="#231942" stroke-width="1.4"/><circle cx="12" cy="9" r="2.6" fill="#ffd43b" stroke="#231942" stroke-width="1.4"/>` +
      `<circle cx="20" cy="15" r="2.6" fill="#ffd43b" stroke="#231942" stroke-width="1.4"/><circle cx="26" cy="6" r="2.6" fill="#ffd43b" stroke="#231942" stroke-width="1.4"/>`,
  ),
  books: svg(
    `<rect x="4" y="7" width="6" height="19" rx="1" fill="#ff6b6b" stroke="#231942" stroke-width="2"/>` +
      `<rect x="11" y="5" width="6" height="21" rx="1" fill="#4dabf7" stroke="#231942" stroke-width="2"/>` +
      `<path d="M19 8.5l5.5-1.5 4.5 17-5.5 1.5z" fill="#ffd43b" stroke="#231942" stroke-width="2"/><path d="M2 27h28" stroke="#231942" stroke-width="2.2"/>`,
  ),
} as const;
