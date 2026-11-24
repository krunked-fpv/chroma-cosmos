/**
 * Violet's Stargazer Desk Hub — Cozy Diegetic Tabletop Craft Stations:
 * - Wax-Sealed Parchment Ribbon Bookmark ("Begin Voyage" / "Continue Voyage" + subtle "New Voyage" seal)
 * - 4 Handcrafted Wanderlings Tabletop Craft Objects (ZERO "Mediums | Wardrobe | Badges | Books" tabs!):
 *   1. Hinged Wooden Watercolor & Foil Box (data-station="paintbox")
 *   2. Paper-Doll Sticker Wardrobe Card (data-station="wardrobe")
 *   3. Warm Wooden Bookshelf with cloth-bound embossed spines, wax-seal Constellation Badges, & 1-tap Keepsake stamp (data-station="bookshelf")
 *   4. Brass Desk-Corner Trinket Tray with Parent Volume Brass Bell, beforeinstallprompt Install Star-Charm, & JSON Backup/Restore Wax Scroll (data-station="trinkets")
 */
import type { AudioLevel } from '../contracts/audio';
import { MATERIALS } from '../contracts/materials';
import type { MaterialId } from '../contracts/materials';
import { BADGE_ORDER, WARDROBE_ITEMS } from '../contracts/progression';
import type { BadgeId, WardrobeItemId } from '../contracts/progression';
import type { HubState, UiCallbacks } from '../contracts/ui';
import type { StorybookSummary } from '../contracts/vault';
import { button, clear, fnv1a, h, iconSpan, setShown } from './dom';
import {
  AUDIO_LABEL,
  ICON_CLOSE,
  ICON_GEM,
  ICON_NEXT,
  ICON_POSTCARD,
  ICON_PREV,
  ICON_SCROLL_EXPORT,
  ICON_SCROLL_IMPORT,
  ICON_STAR,
  WASHI_TAPE_SVG,
  WAX_SEAL_VOYAGE_SVG,
  audioIcon,
} from './icons';
import type { IllustrationCache } from './illustrations';
import type { InstallController } from './install';
import { boing } from './spring';

export type CraftStationId = 'paintbox' | 'wardrobe' | 'bookshelf' | 'trinkets';

export const BADGE_INFO: Record<BadgeId, { name: string; hint: string; stars: Array<[number, number]> }> = {
  firstBloom: { name: 'First Bloom', hint: 'Wake your very first region', stars: [[20, 70], [50, 30], [80, 70]] },
  lumiFriend: { name: "Lumi's Friend", hint: 'Wake up Lumi the unicorn', stars: [[15, 60], [40, 25], [62, 50], [85, 20]] },
  novaFriend: { name: "Nova's Friend", hint: 'Wake up Nova the cheetah', stars: [[15, 30], [40, 60], [65, 35], [85, 70]] },
  causalityExplorer: { name: 'Sky Scientist', hint: 'Make a magic chain reaction', stars: [[50, 15], [20, 50], [50, 85], [80, 50]] },
  rainbowMaster: { name: 'Rainbow Master', hint: 'Use every core medium', stars: [[10, 70], [30, 35], [50, 20], [70, 35], [90, 70]] },
  firstRun: { name: 'First Voyage', hint: 'Finish a whole voyage', stars: [[25, 25], [75, 25], [50, 80]] },
  threeRuns: { name: 'Star Sailor', hint: 'Finish three voyages', stars: [[15, 50], [40, 20], [60, 80], [85, 45]] },
  fiveRuns: { name: 'Galaxy Keeper', hint: 'Finish five voyages', stars: [[50, 10], [85, 40], [70, 85], [30, 85], [15, 40]] },
};

export interface BookclothTone {
  name: string;
  cloth: string;
  shadow: string;
  foil: string;
}

/** Heirloom archival bookcloth palette for deterministic storybook spines. */
export const BOOKCLOTH_TONES: readonly BookclothTone[] = [
  { name: 'plum', cloth: '#5d3478', shadow: '#3a1d4f', foil: '#f3d17c' },
  { name: 'pine', cloth: '#2c5e52', shadow: '#1a3b34', foil: '#f0d28b' },
  { name: 'indigo', cloth: '#2e4178', shadow: '#1b274d', foil: '#f5d98c' },
  { name: 'terracotta', cloth: '#94433a', shadow: '#5e2721', foil: '#f7dc96' },
  { name: 'ochre', cloth: '#996a2b', shadow: '#634318', foil: '#fff1c1' },
  { name: 'berry', cloth: '#7d3056', shadow: '#4f1b35', foil: '#f5d58e' },
  { name: 'teal', cloth: '#285e73', shadow: '#173b4a', foil: '#f2d98c' },
  { name: 'walnut', cloth: '#6b4730', shadow: '#442b1b', foil: '#f5d787' },
] as const;

export function bookSpineSeed(b: StorybookSummary): number {
  return b.seed !== undefined ? (b.seed >>> 0) : fnv1a(b.id);
}

export function bookSpineTone(b: StorybookSummary): BookclothTone {
  const seed = bookSpineSeed(b);
  return BOOKCLOTH_TONES[seed % BOOKCLOTH_TONES.length]!;
}

export const BOOKS_PER_PAGE = 4;

const CHARACTERS: ReadonlyArray<{ id: 'violet' | 'lumi' | 'nova'; name: string }> = [
  { id: 'violet', name: 'Violet' },
  { id: 'lumi', name: 'Lumi' },
  { id: 'nova', name: 'Nova' },
];

export class HubPanel {
  /** Wax-sealed parchment voyage ribbon nestled on the bottom-left/center edge of the open bedroom sketchbook. */
  readonly voyageEl: HTMLElement;
  /** The 4 handcrafted Wanderlings tabletop craft objects arranged harmoniously along the cedar desk edges. */
  readonly stationsEl: HTMLElement;
  /** Close-up craft tray/drawer overlay opened when tapping any of the 4 tabletop craft objects. */
  readonly drawerLayer: HTMLElement;
  /** Hidden JSON file picker for vault backup restore. */
  readonly fileInput: HTMLInputElement;

  private cb: UiCallbacks | null = null;
  private cache: IllustrationCache | null = null;
  private notify: (msg: string) => void = () => undefined;
  private state: HubState | null = null;
  private activeStation: CraftStationId | null = null;
  private shelfPage = 0;
  private audioLevel: AudioLevel = 3;
  private readonly sig = { play: '__init__', mediums: '__init__', wardrobe: '__init__', badges: '__init__', books: '__init__' };

  private readonly playBtn: HTMLButtonElement;
  private readonly playLabel = h('span', { class: 'cc-seal-label' }, 'Begin Voyage');
  private readonly continueBtn: HTMLButtonElement;

  private readonly stationBtns = new Map<CraftStationId, HTMLButtonElement>();
  private readonly drawers = new Map<CraftStationId, HTMLElement>();

  // Live desk previews on the 4 closed craft stations
  private readonly paintboxPreview: HTMLElement;
  private readonly wardrobePreview: HTMLElement;
  private readonly bookshelfSpinesPreview: HTMLElement;
  private readonly bookshelfSealsPreview: HTMLElement;
  private readonly trinketsBellPreview: HTMLElement;
  private readonly trinketsInstallPip: HTMLElement;

  // Close-up craft drawer contents
  private readonly mediumsGrid: HTMLElement;
  private readonly wardrobeCast: HTMLElement;
  private readonly wardrobeGrid: HTMLElement;
  private readonly badgesMolding: HTMLElement;
  private readonly shelf: HTMLElement;
  private readonly shelfPrev: HTMLButtonElement;
  private readonly shelfNext: HTMLButtonElement;
  private readonly trinketAudioBtn: HTMLButtonElement;
  private readonly trinketAudioText: HTMLElement;
  private readonly installWrap: HTMLElement;

  private readonly onKeyDown = (e: KeyboardEvent): void => {
    if (e.key === 'Escape' && this.activeStation !== null) {
      this.closeDrawer();
    }
  };

  constructor(install: InstallController) {
    // ---- Wax-Sealed Parchment Voyage Ribbon (Begin Voyage / Continue Voyage + subtle New Voyage seal)
    this.continueBtn = button(
      'cc-voyage-seal cc-continue',
      'Continue Voyage',
      () => {
        boing(this.continueBtn, 'select');
        this.cb?.onUiFoley?.('paperRustle');
        this.cb?.onContinueRun();
      },
      h(
        'span',
        { class: 'cc-seal-inner' },
        iconSpan(WAX_SEAL_VOYAGE_SVG, 'cc-ico cc-wax-svg'),
        h('span', { class: 'cc-seal-label' }, 'Continue Voyage'),
      ),
    );
    this.playBtn = button(
      'cc-voyage-seal cc-play',
      'Begin Voyage',
      () => {
        boing(this.playBtn, 'select');
        this.cb?.onUiFoley?.('paperRustle');
        this.cb?.onStartRun();
      },
      h('span', { class: 'cc-seal-inner' }, iconSpan(WAX_SEAL_VOYAGE_SVG, 'cc-ico cc-wax-svg'), this.playLabel),
    );
    setShown(this.continueBtn, false);
    this.voyageEl = h('div', { class: 'cc-voyage-ribbon', 'aria-label': 'Voyage Bookmark' }, this.continueBtn, this.playBtn);

    // ---- Desk Station 1: Hinged Wooden Watercolor & Foil Box
    this.paintboxPreview = h('span', { class: 'cc-mini-pans', 'aria-hidden': 'true' });
    const paintboxStation = this.makeStation(
      'paintbox',
      'cc-station-paintbox',
      'Watercolor & Foil Box',
      h(
        'span',
        { class: 'cc-station-craft cc-craft-paintbox' },
        h('span', { class: 'cc-box-hinge', 'aria-hidden': 'true' }),
        this.paintboxPreview,
        h('span', { class: 'cc-box-clasp', 'aria-hidden': 'true' }),
      ),
      'Paintbox',
    );

    // ---- Desk Station 2: Paper-Doll Sticker Wardrobe Card
    this.wardrobePreview = h('span', { class: 'cc-mini-dolls', 'aria-hidden': 'true' });
    const wardrobeStation = this.makeStation(
      'wardrobe',
      'cc-station-wardrobe',
      'Paper-Doll Sticker Wardrobe Card',
      h(
        'span',
        { class: 'cc-station-craft cc-craft-wardrobe' },
        iconSpan(WASHI_TAPE_SVG, 'cc-washi-strip'),
        this.wardrobePreview,
      ),
      'Stickers',
    );

    // ---- Desk Station 3: Warm Wooden Bookshelf
    this.bookshelfSealsPreview = h('span', { class: 'cc-mini-seals', 'aria-hidden': 'true' });
    this.bookshelfSpinesPreview = h('span', { class: 'cc-mini-spines', 'aria-hidden': 'true' });
    const bookshelfStation = this.makeStation(
      'bookshelf',
      'cc-station-bookshelf',
      'Warm Wooden Bookshelf & Wax Seals',
      h(
        'span',
        { class: 'cc-station-craft cc-craft-bookshelf' },
        this.bookshelfSealsPreview,
        this.bookshelfSpinesPreview,
        h('span', { class: 'cc-mini-plank', 'aria-hidden': 'true' }),
        h('span', { class: 'cc-mini-wax-seal', 'aria-hidden': 'true' }),
      ),
      'Bookshelf',
    );

    // ---- Desk Station 4: Brass Desk-Corner Trinket Tray
    this.trinketsBellPreview = iconSpan(audioIcon(3), 'cc-ico cc-mini-bell');
    this.trinketsInstallPip = h('span', { class: 'cc-mini-install-pip', hidden: true, 'aria-hidden': 'true' }, iconSpan(ICON_STAR, 'cc-ico'));
    const trinketsStation = this.makeStation(
      'trinkets',
      'cc-station-trinkets',
      'Brass Desk-Corner Trinket Tray',
      h(
        'span',
        { class: 'cc-station-craft cc-craft-trinkets' },
        this.trinketsBellPreview,
        iconSpan(ICON_SCROLL_EXPORT, 'cc-ico cc-mini-scroll'),
        this.trinketsInstallPip,
      ),
      'Trinkets',
    );

    this.stationsEl = h(
      'nav',
      { class: 'cc-desk-stations', 'aria-label': "Violet's Desk Craft Stations" },
      paintboxStation,
      wardrobeStation,
      bookshelfStation,
      trinketsStation,
    );

    // ---- Close-Up Craft Drawers
    this.mediumsGrid = h('div', { class: 'cc-grid cc-grid-paintbox' });
    const paintboxDrawer = this.makeDrawer(
      'paintbox',
      'cc-drawer-paintbox',
      'Watercolor & Foil Box',
      'Tap a porcelain pan to trade Prism Crystals for a new pigment.',
      h('div', { class: 'cc-paintbox-lid-bar', 'aria-hidden': 'true' }, h('span', { class: 'cc-hinge-pin' }), h('span', { class: 'cc-hinge-pin' })),
      this.mediumsGrid,
    );

    this.wardrobeCast = h('div', { class: 'cc-paper-dolls', 'aria-label': 'Violet, Lumi and Nova preview' });
    this.wardrobeGrid = h('div', { class: 'cc-grid cc-grid-stickers' });
    const wardrobeDrawer = this.makeDrawer(
      'wardrobe',
      'cc-drawer-wardrobe',
      'Paper-Doll Sticker Sheet',
      'Peel a vinyl sticker to dress Violet, Lumi & Nova.',
      iconSpan(WASHI_TAPE_SVG, 'cc-drawer-washi tl'),
      iconSpan(WASHI_TAPE_SVG, 'cc-drawer-washi tr'),
      this.wardrobeCast,
      this.wardrobeGrid,
    );

    this.badgesMolding = h('div', { class: 'cc-wax-badges', 'aria-label': 'Constellation Wax-Seal Badges' });
    this.shelf = h('div', { class: 'cc-book-spines' });
    this.shelfPrev = button('cc-round cc-shelf-nav', 'Previous shelf', () => this.turnShelf(-1), iconSpan(ICON_PREV));
    this.shelfNext = button('cc-round cc-shelf-nav', 'Next shelf', () => this.turnShelf(1), iconSpan(ICON_NEXT));
    const bookshelfDrawer = this.makeDrawer(
      'bookshelf',
      'cc-drawer-bookshelf',
      'Heirloom Bookshelf',
      'Constellation wax seals & cloth-bound voyages.',
      h('div', { class: 'cc-shelf-molding' }, this.badgesMolding),
      h('div', { class: 'cc-shelf-row' }, this.shelfPrev, this.shelf, this.shelfNext),
    );

    // Brass Desk-Corner Trinket Tray drawer: Audio Brass Bell + Install Star-Charm + JSON Backup/Restore Wax-Sealed Scroll
    this.trinketAudioText = h('span', { class: 'cc-trinket-audio-label' }, AUDIO_LABEL[3]);
    this.trinketAudioBtn = button(
      'cc-trinket-audio',
      AUDIO_LABEL[3],
      () => {
        boing(this.trinketAudioBtn, 'press');
        this.cb?.onUiFoley?.('woodTap');
        this.cb?.onAudioCycle();
      },
      h('span', { class: 'cc-trinket-audio-inner' }, iconSpan(audioIcon(3), 'cc-ico cc-trinket-bell-ico'), this.trinketAudioText),
    );
    this.trinketAudioBtn.dataset.level = '3';

    const installBtn = button(
      'cc-install',
      'Install Sketchbook',
      () => {
        this.cb?.onUiFoley?.('wispChime');
        void install.install();
      },
      h(
        'span',
        { class: 'cc-install-inner' },
        iconSpan(ICON_STAR, 'cc-ico cc-install-star'),
        h('span', { class: 'cc-install-label' }, 'Install Sketchbook'),
      ),
    );
    const installX = button('cc-install-x', 'Hide install star-charm', () => {
      this.cb?.onUiFoley?.('woodTap');
      install.dismiss();
    }, iconSpan(ICON_CLOSE));
    this.installWrap = h('div', { class: 'cc-install-wrap', hidden: true }, installBtn, installX);
    install.onChange((v) => {
      setShown(this.installWrap, v);
      setShown(this.trinketsInstallPip, v);
      if (v) boing(installBtn, 'appear');
    });

    this.fileInput = h('input', {
      type: 'file',
      accept: 'application/json,.json',
      class: 'cc-file',
      tabindex: -1,
      'aria-hidden': 'true',
    });
    this.fileInput.addEventListener('change', () => void this.readImport());

    const exportBtn = button(
      'cc-scroll-btn cc-export',
      'Back up my sketchbook',
      () => {
        boing(exportBtn, 'press');
        this.cb?.onUiFoley?.('paperRustle');
        this.cb?.onExportVault();
      },
      h('span', { class: 'cc-chip-inner' }, iconSpan(ICON_SCROLL_EXPORT), h('span', {}, 'Wax-Seal Backup')),
    );
    const importBtn = button(
      'cc-scroll-btn cc-import',
      'Restore a sketchbook backup',
      () => {
        boing(importBtn, 'press');
        this.cb?.onUiFoley?.('paperRustle');
        this.fileInput.click();
      },
      h('span', { class: 'cc-chip-inner' }, iconSpan(ICON_SCROLL_IMPORT), h('span', {}, 'Unseal Restore')),
    );

    const trinketsDrawer = this.makeDrawer(
      'trinkets',
      'cc-drawer-trinkets',
      'Brass Trinket Dish',
      'Parent desk bell, sketchbook charm & keepsake scroll.',
      h(
        'div',
        { class: 'cc-trinket-dish-body' },
        h('div', { class: 'cc-trinket-row cc-trinket-bell-row' }, this.trinketAudioBtn),
        h('div', { class: 'cc-trinket-row cc-trinket-install-row' }, this.installWrap),
        h('div', { class: 'cc-trinket-row cc-scroll-vault' }, exportBtn, importBtn, this.fileInput),
      ),
    );

    this.drawerLayer = h(
      'div',
      { class: 'cc-craft-overlay', hidden: true },
      paintboxDrawer,
      wardrobeDrawer,
      bookshelfDrawer,
      trinketsDrawer,
    );
    this.drawerLayer.addEventListener('click', (e) => {
      if (e.target === this.drawerLayer) this.closeDrawer();
    });

    window.addEventListener('keydown', this.onKeyDown);
  }

  private makeStation(
    id: CraftStationId,
    cls: string,
    ariaLabel: string,
    art: HTMLElement,
    caption: string,
  ): HTMLButtonElement {
    const b = button(
      `cc-station ${cls}`,
      ariaLabel,
      () => this.openStation(id),
      h('span', { class: 'cc-station-inner' }, art, h('span', { class: 'cc-station-tag' }, caption)),
    );
    b.dataset.station = id;
    b.setAttribute('aria-expanded', 'false');
    this.stationBtns.set(id, b);
    return b;
  }

  private makeDrawer(
    id: CraftStationId,
    cls: string,
    title: string,
    subtitle: string,
    ...body: HTMLElement[]
  ): HTMLElement {
    const closeBtn = button(
      'cc-round cc-drawer-close',
      `Close ${title}`,
      () => this.closeDrawer(),
      iconSpan(ICON_CLOSE),
    );
    const panel = h(
      'section',
      {
        class: `cc-craft-drawer ${cls}`,
        role: 'dialog',
        'aria-modal': 'false',
        'aria-label': title,
        'data-drawer': id,
        hidden: true,
      },
      h(
        'div',
        { class: 'cc-drawer-head' },
        h('div', { class: 'cc-drawer-titles' }, h('h2', { class: 'cc-drawer-title' }, title), h('p', { class: 'cc-drawer-sub' }, subtitle)),
        closeBtn,
      ),
      ...body,
    );
    this.drawers.set(id, panel);
    return panel;
  }

  bind(cb: UiCallbacks, cache: IllustrationCache, notify: (msg: string) => void): void {
    this.cb = cb;
    this.cache = cache;
    this.notify = notify;
    if (this.state) this.update(this.state, true);
  }

  get openDrawerId(): CraftStationId | null {
    return this.activeStation;
  }

  openStation(id: CraftStationId): void {
    const same = this.activeStation === id;
    if (same) {
      this.closeDrawer();
      return;
    }
    this.activeStation = id;
    this.cb?.onUiFoley?.(id === 'wardrobe' ? 'paperRustle' : 'woodTap');
    setShown(this.drawerLayer, true);
    for (const [sid, btn] of this.stationBtns) {
      const on = sid === id;
      btn.classList.toggle('is-open', on);
      btn.setAttribute('aria-expanded', String(on));
    }
    for (const [did, panel] of this.drawers) {
      const on = did === id;
      setShown(panel, on);
      if (on) boing(panel, 'appear');
    }
  }

  closeDrawer(silent = false): void {
    if (this.activeStation === null && this.drawerLayer.hidden) return;
    if (!silent) this.cb?.onUiFoley?.('woodTap');
    this.activeStation = null;
    setShown(this.drawerLayer, false);
    for (const btn of this.stationBtns.values()) {
      btn.classList.remove('is-open');
      btn.setAttribute('aria-expanded', 'false');
    }
    for (const panel of this.drawers.values()) setShown(panel, false);
  }

  setAudio(level: AudioLevel): void {
    if (this.audioLevel === level && this.trinketAudioBtn.dataset.level === String(level)) return;
    this.audioLevel = level;
    this.trinketAudioBtn.dataset.level = String(level);
    this.trinketAudioBtn.setAttribute('aria-label', AUDIO_LABEL[level]);
    this.trinketAudioBtn.title = AUDIO_LABEL[level];
    this.trinketAudioText.textContent = AUDIO_LABEL[level];
    const ico = this.trinketAudioBtn.querySelector('.cc-trinket-bell-ico');
    if (ico) {
      clear(ico as HTMLElement);
      ico.replaceWith(iconSpan(audioIcon(level), 'cc-ico cc-trinket-bell-ico'));
    }
    const mini = iconSpan(audioIcon(level), 'cc-ico cc-mini-bell');
    this.trinketsBellPreview.innerHTML = mini.innerHTML;
  }

  update(s: HubState, force = false): void {
    this.state = s;
    if (s.audioLevel !== undefined) this.setAudio(s.audioLevel);
    if (!this.cache) return;

    const play = `${s.hasRunInProgress}`;
    if (force || play !== this.sig.play) {
      this.sig.play = play;
      setShown(this.continueBtn, s.hasRunInProgress);
      this.playLabel.textContent = s.hasRunInProgress ? 'New Voyage' : 'Begin Voyage';
      this.playBtn.setAttribute('aria-label', s.hasRunInProgress ? 'New Voyage' : 'Begin Voyage');
      this.playBtn.title = s.hasRunInProgress ? 'New Voyage' : 'Begin Voyage';
      this.playBtn.classList.toggle('is-secondary', s.hasRunInProgress);
    }

    const unlocked = new Set(s.materials.filter((m) => m.unlocked).map((m) => m.def.id));
    const msig = `${s.gems}|${[...unlocked].join(',')}`;
    if (force || msig !== this.sig.mediums) {
      this.sig.mediums = msig;
      this.buildMediums(s.gems, unlocked);
    }

    const wsig = `${s.gems}|${s.wardrobeOwned.join(',')}|${WARDROBE_ITEMS.map((w) => (s.wardrobe[w.id] ? 1 : 0)).join('')}`;
    if (force || wsig !== this.sig.wardrobe) {
      this.sig.wardrobe = wsig;
      this.buildWardrobe(s);
    }

    const bsig = s.badges.join(',');
    if (force || bsig !== this.sig.badges) {
      this.sig.badges = bsig;
      this.buildBadges(new Set(s.badges));
    }

    const ksig = s.storybooks.map((b) => `${b.id}:${b.title}:${b.seed ?? ''}`).join('|');
    if (force || ksig !== this.sig.books) {
      this.sig.books = ksig;
      this.buildShelf(s.storybooks);
    }
  }

  destroy(): void {
    window.removeEventListener('keydown', this.onKeyDown);
  }

  private buildMediums(gems: number, unlocked: Set<MaterialId>): void {
    const cache = this.cache!;
    // Live glowing porcelain color pans right on the closed desk Paintbox!
    clear(this.paintboxPreview);
    for (const def of MATERIALS.filter((m) => m.tier === 'unlockable')) {
      const own = unlocked.has(def.id);
      const pan = h('span', { class: `cc-mini-pan${own ? ' is-owned' : ''}` });
      pan.style.setProperty('--pan-a', def.palette[0] ?? '#fff');
      pan.style.setProperty('--pan-b', def.palette[1] ?? def.palette[0] ?? '#eee');
      this.paintboxPreview.append(pan);
    }

    clear(this.mediumsGrid);
    for (const def of MATERIALS.filter((m) => m.tier === 'unlockable')) {
      const own = unlocked.has(def.id);
      const afford = gems >= def.unlockCost;
      const status = own
        ? h('span', { class: 'cc-tag cc-tag-own' }, 'Yours!')
        : h('span', { class: `cc-tag cc-cost${afford ? '' : ' is-short'}` }, iconSpan(ICON_GEM, 'cc-ico cc-tag-gem'), String(def.unlockCost));

      // Torn cotton-paper watercolor test strip previewing the pigment gradient
      const strip = h('span', { class: 'cc-test-strip', 'aria-hidden': 'true' });
      strip.style.setProperty('--strip-a', def.palette[0] ?? '#fff');
      strip.style.setProperty('--strip-b', def.palette[1] ?? def.palette[0] ?? '#fff');
      strip.style.setProperty('--strip-c', def.palette[2] ?? def.palette[1] ?? def.palette[0] ?? '#fff');

      const b = button(
        `cc-item cc-shop-item cc-porcelain-pan${own ? ' is-owned' : ''}${!own && !afford ? ' is-short' : ''}`,
        own ? `${def.name} (unlocked)` : `Unlock ${def.name} for ${def.unlockCost} Prism Crystals`,
        () => {
          if (own) {
            boing(b, 'press');
            this.cb?.onUiFoley?.('woodTap');
            return;
          }
          if (!afford) {
            b.classList.remove('cc-shake');
            void b.offsetWidth;
            b.classList.add('cc-shake');
            this.cb?.onUiFoley?.('woodTap');
            this.notify(`${def.unlockCost - gems} more Prism Crystals for ${def.name}`);
            return;
          }
          boing(b, 'select');
          this.cb?.onUiFoley?.('woodTap');
          this.cb?.onUiFoley?.('jarClink');
          this.cb?.onUnlockMaterial(def.id);
        },
        h(
          'span',
          { class: 'cc-item-inner' },
          h(
            'span',
            { class: 'cc-pan-well' },
            h(
              'span',
              { class: 'cc-item-art cc-swatch-body' },
              cache.canvas({ type: 'material', material: def.id }, 72, 72),
              h('span', { class: 'cc-gleam', 'aria-hidden': 'true' }),
            ),
          ),
          strip,
          h('span', { class: 'cc-item-name' }, def.name),
          status,
        ),
      );
      b.dataset.material = String(def.id);
      b.style.setProperty('--pan-a', def.palette[0] ?? '#fff');
      b.style.setProperty('--pan-b', def.palette[1] ?? def.palette[0] ?? '#eee');
      this.mediumsGrid.append(b);
    }
  }

  private buildWardrobe(s: HubState): void {
    const cache = this.cache!;
    const owned = new Set<WardrobeItemId>(s.wardrobeOwned);

    // Closed desk preview: live miniature portraits of Violet, Lumi & Nova on the washi-taped cream cardstock sheet
    clear(this.wardrobePreview);
    for (const ch of CHARACTERS) {
      const wornCount = WARDROBE_ITEMS.filter((w) => w.owner === ch.id && owned.has(w.id) && s.wardrobe[w.id]).length;
      this.wardrobePreview.append(
        h(
          'span',
          { class: `cc-mini-doll${wornCount > 0 ? ' has-worn' : ''}` },
          cache.canvas({ type: 'portrait', who: ch.id }, 32, 36, 'cc-mini-doll-pix'),
        ),
      );
    }

    // Open close-up drawer: ornate gilded paper-doll cameo frames showcasing HERO Hi-Bit portraits
    clear(this.wardrobeCast);
    for (const ch of CHARACTERS) {
      const wornItems = WARDROBE_ITEMS.filter((w) => w.owner === ch.id && owned.has(w.id) && s.wardrobe[w.id]);
      const pips = h(
        'span',
        { class: 'cc-doll-badges' },
        ...wornItems.map((w) =>
          h('span', { class: 'cc-doll-sticker-pip', title: w.name }, cache.canvas({ type: 'wardrobe', item: w.id }, 28, 28)),
        ),
      );
      this.wardrobeCast.append(
        h(
          'div',
          { class: `cc-doll-card${wornItems.length > 0 ? ' is-dressed' : ''}`, 'data-character': ch.id },
          h('span', { class: 'cc-doll-portrait' }, cache.canvas({ type: 'portrait', who: ch.id }, 92, 106)),
          h('span', { class: 'cc-doll-name' }, ch.name),
          pips,
        ),
      );
    }

    // Peelable die-cut vinyl stickers with HERO 72x72 pixel art and playful organic angles
    const stickerTilts = [-2, 1.4, -1.2, 1.7, -1.5, 1.2] as const;
    clear(this.wardrobeGrid);
    WARDROBE_ITEMS.forEach((w, idx) => {
      const own = owned.has(w.id);
      const on = own && !!s.wardrobe[w.id];
      const afford = s.gems >= w.cost;
      const status = own
        ? h('span', { class: `cc-tag ${on ? 'cc-tag-on' : 'cc-tag-off'}` }, on ? 'Wearing' : 'Peel on')
        : h('span', { class: `cc-tag cc-cost${afford ? '' : ' is-short'}` }, iconSpan(ICON_GEM, 'cc-ico cc-tag-gem'), String(w.cost));
      const b = button(
        `cc-item cc-ward-item cc-diecut-sticker${on ? ' is-on' : ''}${own ? ' is-owned' : ''}${!own && !afford ? ' is-short' : ''}`,
        own ? `${on ? 'Peel off' : 'Press on'} ${w.name}` : `Collect ${w.name} sticker for ${w.cost} Prism Crystals`,
        () => {
          if (own) {
            boing(b, 'select');
            this.cb?.onUiFoley?.('stickerPeel');
            this.cb?.onToggleWardrobe(w.id);
            return;
          }
          if (!afford) {
            b.classList.remove('cc-shake');
            void b.offsetWidth;
            b.classList.add('cc-shake');
            this.cb?.onUiFoley?.('woodTap');
            this.notify(`${w.cost - s.gems} more Prism Crystals for ${w.name}`);
            return;
          }
          boing(b, 'select');
          this.cb?.onUiFoley?.('stickerPeel');
          this.cb?.onBuyWardrobe(w.id);
        },
        h(
          'span',
          { class: 'cc-item-inner' },
          h('span', { class: 'cc-item-art cc-sticker-art' }, cache.canvas({ type: 'wardrobe', item: w.id }, 72, 72)),
          h('span', { class: 'cc-item-name' }, w.name),
          status,
        ),
      );
      b.dataset.wardrobe = w.id;
      b.style.setProperty('--tilt', `${stickerTilts[idx % stickerTilts.length]}deg`);
      if (own) b.setAttribute('aria-pressed', String(on));
      this.wardrobeGrid.append(b);
    });
  }

  private buildBadges(earned: Set<BadgeId>): void {
    clear(this.bookshelfSealsPreview);
    for (const id of BADGE_ORDER) {
      this.bookshelfSealsPreview.append(h('span', { class: `cc-mini-seal${earned.has(id) ? ' is-on' : ''}` }));
    }

    clear(this.badgesMolding);
    for (const id of BADGE_ORDER) {
      const info = BADGE_INFO[id];
      const got = earned.has(id);
      const pts = info.stars.map(([x, y]) => `${x},${y}`).join(' ');
      const dots = info.stars.map(([x, y]) => `<circle cx="${x}" cy="${y}" r="7"/>`).join('');
      const art = h('span', { class: 'cc-badge-art', 'aria-hidden': 'true' });
      art.innerHTML = `<svg viewBox="0 0 100 100"><polyline points="${pts}"/>${dots}</svg>`;
      this.badgesMolding.append(
        h(
          'div',
          {
            class: `cc-badge cc-wax-badge${got ? ' is-on' : ''}`,
            role: 'img',
            'aria-label': `${info.name}: ${got ? 'wax seal earned' : info.hint}`,
            title: got ? info.name : info.hint,
            'data-badge': id,
          },
          art,
          h('span', { class: 'cc-badge-name' }, info.name),
        ),
      );
    }
  }

  private buildShelf(books: StorybookSummary[]): void {
    const cache = this.cache!;

    // Live miniature cloth-bound book spines on the desk Bookshelf object
    clear(this.bookshelfSpinesPreview);
    const previewBooks = books.slice(0, 6);
    const heights = [29, 34, 27, 32, 30, 28] as const;
    const leans = [-2, 0, 1.5, -1, 0.8, 8] as const;
    if (previewBooks.length === 0) {
      const starterTones = [BOOKCLOTH_TONES[0]!, BOOKCLOTH_TONES[1]!, BOOKCLOTH_TONES[3]!, BOOKCLOTH_TONES[2]!];
      starterTones.forEach((tone, idx) => {
        const sp = h('span', { class: 'cc-mini-spine is-ghost' });
        sp.style.setProperty('--spine-bg', tone.cloth);
        sp.style.setProperty('--spine-foil', tone.foil);
        sp.style.setProperty('--spine-h', `${heights[idx % heights.length]}px`);
        sp.style.setProperty('--spine-lean', `${idx === starterTones.length - 1 ? 8 : leans[idx]}deg`);
        this.bookshelfSpinesPreview.append(sp);
      });
    } else {
      previewBooks.forEach((b, idx) => {
        const tone = bookSpineTone(b);
        const sp = h('span', { class: 'cc-mini-spine', 'data-spine-color': tone.name });
        sp.style.setProperty('--spine-bg', tone.cloth);
        sp.style.setProperty('--spine-foil', tone.foil);
        sp.style.setProperty('--spine-h', `${heights[idx % heights.length]}px`);
        sp.style.setProperty('--spine-lean', `${idx === previewBooks.length - 1 && previewBooks.length >= 2 ? 7 : leans[idx % leans.length]}deg`);
        this.bookshelfSpinesPreview.append(sp);
      });
    }

    const pages = Math.max(1, Math.ceil(books.length / BOOKS_PER_PAGE));
    this.shelfPage = Math.min(this.shelfPage, pages - 1);
    clear(this.shelf);
    if (books.length === 0) {
      this.shelf.append(
        h('p', { class: 'cc-shelf-empty' }, 'Finish a voyage to bind your first cloth storybook on this shelf!'),
      );
    }
    const slice = books.slice(this.shelfPage * BOOKS_PER_PAGE, (this.shelfPage + 1) * BOOKS_PER_PAGE);
    for (const b of slice) {
      const seed = bookSpineSeed(b);
      const tone = bookSpineTone(b);
      const openBtn = button(
        'cc-book-spine cc-cover',
        `Open storybook: ${b.title} (${b.galaxyName})`,
        () => {
          boing(openBtn, 'press');
          this.cb?.onUiFoley?.('paperRustle');
          this.closeDrawer(true);
          this.cb?.onOpenBook(b.id);
        },
        h(
          'span',
          { class: 'cc-spine-inner' },
          h('span', { class: 'cc-spine-band top', 'aria-hidden': 'true' }),
          cache.canvas({ type: 'bookCover', seed, title: b.title }, 72, 96, 'cc-cover-pix'),
          h(
            'span',
            { class: 'cc-spine-meta' },
            h('span', { class: 'cc-cover-title' }, b.title),
            h('span', { class: 'cc-spine-pages' }, `${b.pageCount} ${b.pageCount === 1 ? 'page' : 'pages'}`),
          ),
          h('span', { class: 'cc-spine-band bot', 'aria-hidden': 'true' }),
          h('span', { class: 'cc-spine-ribbon', 'aria-hidden': 'true' }),
        ),
      );
      openBtn.dataset.book = b.id;
      openBtn.dataset.spineColor = tone.name;
      openBtn.style.setProperty('--spine-bg', tone.cloth);
      openBtn.style.setProperty('--spine-shadow', tone.shadow);
      openBtn.style.setProperty('--spine-foil', tone.foil);

      const keepsakeBtn = button(
        'cc-round cc-book-keepsake',
        `Save Keepsake Postcard PNG for ${b.title}`,
        () => {
          boing(keepsakeBtn, 'press');
          this.cb?.onUiFoley?.('woodTap');
          if (this.cb?.onSaveBookKeepsake) this.cb.onSaveBookKeepsake(b.id);
          else this.cb?.onSaveKeepsake();
        },
        iconSpan(ICON_POSTCARD),
      );
      keepsakeBtn.dataset.keepsakeBook = b.id;

      this.shelf.append(h('div', { class: 'cc-book-slot' }, openBtn, keepsakeBtn));
    }

    this.shelfPrev.disabled = this.shelfPage <= 0;
    this.shelfNext.disabled = this.shelfPage >= pages - 1;
    setShown(this.shelfPrev, pages > 1);
    setShown(this.shelfNext, pages > 1);
  }

  private turnShelf(d: number): void {
    if (!this.state) return;
    this.cb?.onUiFoley?.('paperRustle');
    this.shelfPage += d;
    this.buildShelf(this.state.storybooks);
  }

  private async readImport(): Promise<void> {
    const f = this.fileInput.files?.[0];
    if (!f) return;
    const text = await readFileText(f);
    this.fileInput.value = '';
    if (text !== null) this.cb?.onImportVault(text);
  }
}

export function readFileText(f: Blob): Promise<string | null> {
  if (typeof f.text === 'function') return f.text().catch(() => null);
  return new Promise((resolve) => {
    const r = new FileReader();
    r.onload = () => resolve(typeof r.result === 'string' ? r.result : null);
    r.onerror = () => resolve(null);
    r.readAsText(f);
  });
}
