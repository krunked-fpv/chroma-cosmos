/**
 * Violet's Stargazer Hub — Gallery-Grade Midnight Velvet & Burnished Gold Cloisonne Stations:
 * - Celestial Midnight-Gold Voyage Ribbon ("Begin Voyage" / "Continue Voyage" + "New Voyage")
 * - 4 Midnight Cloisonne Craft Stations (ZERO "[role=tab]" / ".cc-tabs" strips, ZERO brown wood trays!):
 *   1. Exotic Mediums Paintbox (data-station="paintbox") — all 10 Exotic Mediums with pulsing "Ready to Unlock!" glow
 *   2. Stargazer Wardrobe (data-station="wardrobe") — live Violet + Lumi + Nova dress-up portrait stage & all 14 Accessories
 *   3. Celestial Bookshelf (data-station="bookshelf") — 8 Hi-Bit Constellation Seals, jewel-tone cloth storybooks & 1-tap Keepsake
 *   4. Astrolabe Trinket Dish (data-station="trinkets") — Sound level, PWA Install Star-Charm & JSON Vault Backup/Restore
 */
import type { AudioLevel } from '../contracts/audio';
import { MATERIALS, type MaterialId } from '../contracts/materials';
import { BADGE_ORDER, WARDROBE_ITEMS, type BadgeId, type WardrobeItemId } from '../contracts/progression';
import type { HubState, UiCallbacks } from '../contracts/ui';
import type { StorybookSummary } from '../contracts/vault';
import { button, clear, fnv1a, h, setShown, spriteBox } from './dom';
import { AUDIO_LABEL, AUDIO_SPRITE, BADGE_SPRITE, STATION_SPRITE } from './icons';
import { placeholderCanvas, type IllustrationCache } from './illustrations';
import type { InstallController } from './install';
import { boing } from './spring';

export type CraftStationId = 'paintbox' | 'wardrobe' | 'bookshelf' | 'trinkets';

export const BADGE_INFO: Record<BadgeId, { name: string; hint: string }> = {
  firstBloom: { name: 'First Bloom', hint: 'Wake your very first region' },
  lumiFriend: { name: "Lumi's Friend", hint: 'Wake up Lumi the unicorn' },
  novaFriend: { name: "Nova's Friend", hint: 'Wake up Nova the cheetah' },
  causalityExplorer: { name: 'Sky Scientist', hint: 'Make a magic chain reaction' },
  rainbowMaster: { name: 'Rainbow Master', hint: 'Use every core medium' },
  firstRun: { name: 'First Voyage', hint: 'Finish a whole voyage' },
  threeRuns: { name: 'Star Sailor', hint: 'Finish three voyages' },
  fiveRuns: { name: 'Galaxy Keeper', hint: 'Finish five voyages' },
};

export interface BookclothTone {
  name: string;
  cloth: string;
  shadow: string;
  foil: string;
}

/** Midnight-jewel archival bookcloth palette for deterministic storybook spines (zero muddy browns). */
export const BOOKCLOTH_TONES: readonly BookclothTone[] = [
  { name: 'amethyst', cloth: '#4c2c7a', shadow: '#2d184d', foil: '#eac46f' },
  { name: 'emerald', cloth: '#1f5a57', shadow: '#123837', foil: '#eac46f' },
  { name: 'sapphire', cloth: '#243a7a', shadow: '#16244f', foil: '#f3d991' },
  { name: 'crimson', cloth: '#7c294b', shadow: '#4c162d', foil: '#f5dc99' },
  { name: 'indigo', cloth: '#2c256b', shadow: '#1a1545', foil: '#fae4a4' },
  { name: 'berry', cloth: '#6b2861', shadow: '#41163c', foil: '#eac46f' },
  { name: 'teal', cloth: '#1c536e', shadow: '#103447', foil: '#f2d98c' },
  { name: 'celestial', cloth: '#393275', shadow: '#221d4a', foil: '#f6df9d' },
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

export function computeHubAffordable(s: HubState): {
  any: boolean;
  paintbox: boolean;
  wardrobe: boolean;
} {
  const unlocked = new Set(s.materials.filter((m) => m.unlocked).map((m) => m.def.id));
  const paintbox = MATERIALS.some((m) => m.tier === 'unlockable' && !unlocked.has(m.id) && s.gems >= m.unlockCost);
  const ownedW = new Set(s.wardrobeOwned);
  const wardrobe = WARDROBE_ITEMS.some((w) => !ownedW.has(w.id) && s.gems >= w.cost);
  const any = s.hasAffordableUnlock !== undefined ? s.hasAffordableUnlock : paintbox || wardrobe;
  return { any, paintbox, wardrobe };
}

export class HubPanel {
  readonly crestEl: HTMLElement;
  readonly voyageEl: HTMLElement;
  readonly stationsEl: HTMLElement;
  readonly drawerLayer: HTMLElement;
  readonly fileInput: HTMLInputElement;

  private cb: UiCallbacks | null = null;
  private cache: IllustrationCache | null = null;
  private notify: (msg: string) => void = () => undefined;
  private state: HubState | null = null;
  private activeStation: CraftStationId | null = null;
  private shelfPage = 0;
  private audioLevel: AudioLevel = 3;
  private readonly sig = { play: '__init__', mediums: '__init__', wardrobe: '__init__', badges: '__init__', books: '__init__' };

  private readonly crestStarL: HTMLElement;
  private readonly crestStarR: HTMLElement;
  private readonly playBtn: HTMLButtonElement;
  private readonly playSealSlot: HTMLElement;
  private readonly playLabel = h('span', { class: 'cc-seal-label' }, 'Begin Voyage');
  private readonly continueBtn: HTMLButtonElement;
  private readonly continueSealSlot: HTMLElement;

  private readonly stationBtns = new Map<CraftStationId, HTMLButtonElement>();
  private readonly stationIconSlots = new Map<CraftStationId, HTMLElement>();
  private readonly drawers = new Map<CraftStationId, HTMLElement>();
  private readonly closeIconSlots: HTMLElement[] = [];
  private readonly drawerGemSlots: HTMLElement[] = [];
  private readonly drawerGemTexts: HTMLElement[] = [];
  private readonly drawerCountEls = new Map<CraftStationId, HTMLElement>();

  // Live desk previews on the 4 Midnight Cloisonne stations
  private readonly paintboxPreview: HTMLElement;
  private readonly paintboxGiftDot: HTMLElement;
  private readonly wardrobePreview: HTMLElement;
  private readonly wardrobeGiftDot: HTMLElement;
  private readonly bookshelfSpinesPreview: HTMLElement;
  private readonly bookshelfSealsPreview: HTMLElement;
  private readonly trinketsBellPreview: HTMLElement;
  private readonly trinketsVolBars: HTMLElement[] = [];
  private readonly trinketsInstallPip: HTMLElement;
  private readonly trinketsInstallStarSlot: HTMLElement;

  // Close-up craft drawer contents
  private readonly mediumsGrid: HTMLElement;
  private readonly wardrobeCast: HTMLElement;
  private readonly wardrobeGrid: HTMLElement;
  private readonly badgesMolding: HTMLElement;
  private readonly badgesCountText: HTMLElement;
  private readonly shelf: HTMLElement;
  private readonly shelfPrev: HTMLButtonElement;
  private readonly shelfPrevIconSlot: HTMLElement;
  private readonly shelfNext: HTMLButtonElement;
  private readonly shelfNextIconSlot: HTMLElement;
  private readonly trinketAudioBtn: HTMLButtonElement;
  private readonly trinketAudioIconSlot: HTMLElement;
  private readonly trinketAudioText: HTMLElement;
  private readonly trinketAudioDots: HTMLElement[] = [];
  private readonly installWrap: HTMLElement;
  private readonly installStarSlot: HTMLElement;
  private readonly installCloseSlot: HTMLElement;
  private readonly exportIconSlot: HTMLElement;
  private readonly importIconSlot: HTMLElement;

  private readonly onKeyDown = (e: KeyboardEvent): void => {
    if (e.key === 'Escape' && this.activeStation !== null) {
      this.closeDrawer();
    }
  };

  constructor(install: InstallController) {
    // ---- Storybook Title Crest perched gently atop the Hub spread
    this.crestStarL = spriteBox('cc-ico cc-hub-crest-star', placeholderCanvas(18, 18));
    this.crestStarR = spriteBox('cc-ico cc-hub-crest-star', placeholderCanvas(18, 18));
    this.crestEl = h(
      'div',
      { class: 'cc-hub-crest', 'aria-label': "Violet's Living Sketchbook" },
      this.crestStarL,
      h('span', { class: 'cc-hub-crest-title' }, "Violet's Living Sketchbook"),
      this.crestStarR,
    );

    // ---- Midnight-Gold Cloisonne Voyage Ribbon
    this.continueSealSlot = spriteBox('cc-ico cc-voyage-seal-ico', placeholderCanvas(36, 36));
    this.continueBtn = button(
      'cc-voyage-seal cc-continue',
      'Continue Voyage',
      () => {
        boing(this.continueBtn, 'select');
        this.cb?.onUiFoley?.('paperRustle');
        this.cb?.onContinueRun();
      },
      h('span', { class: 'cc-seal-inner' }, this.continueSealSlot, h('span', { class: 'cc-seal-label' }, 'Continue Voyage')),
    );

    this.playSealSlot = spriteBox('cc-ico cc-voyage-seal-ico', placeholderCanvas(36, 36));
    this.playBtn = button(
      'cc-voyage-seal cc-play',
      'Begin Voyage',
      () => {
        boing(this.playBtn, 'select');
        this.cb?.onUiFoley?.('paperRustle');
        this.cb?.onStartRun();
      },
      h('span', { class: 'cc-seal-inner' }, this.playSealSlot, this.playLabel),
    );
    setShown(this.continueBtn, false);
    this.voyageEl = h('div', { class: 'cc-voyage-ribbon', 'aria-label': 'Voyage Ribbon' }, this.continueBtn, this.playBtn);

    // ---- Station 1: Midnight Cloisonne Paintbox (10 Exotic Mediums)
    const pbIcon = spriteBox('cc-ico cc-station-ico', placeholderCanvas(32, 32));
    this.stationIconSlots.set('paintbox', pbIcon);
    this.paintboxPreview = h('span', { class: 'cc-mini-pans', 'aria-hidden': 'true' });
    this.paintboxGiftDot = h('span', { class: 'cc-station-gift-dot', hidden: true }, 'New Gift!');
    const paintboxStation = this.makeStation(
      'paintbox',
      'cc-station-paintbox',
      'Exotic Mediums Paintbox',
      h('span', { class: 'cc-station-craft cc-craft-paintbox' }, pbIcon, this.paintboxPreview),
      'Paintbox',
      this.paintboxGiftDot,
    );

    // ---- Station 2: Stargazer Wardrobe (14 Accessories)
    const wdIcon = spriteBox('cc-ico cc-station-ico', placeholderCanvas(32, 32));
    this.stationIconSlots.set('wardrobe', wdIcon);
    this.wardrobePreview = h('span', { class: 'cc-mini-dolls', 'aria-hidden': 'true' });
    this.wardrobeGiftDot = h('span', { class: 'cc-station-gift-dot', hidden: true }, 'New Gift!');
    const wardrobeStation = this.makeStation(
      'wardrobe',
      'cc-station-wardrobe',
      'Stargazer Wardrobe Gallery',
      h('span', { class: 'cc-station-craft cc-craft-wardrobe' }, wdIcon, this.wardrobePreview),
      'Wardrobe',
      this.wardrobeGiftDot,
    );

    // ---- Station 3: Celestial Bookshelf & Constellation Seals
    const bsIcon = spriteBox('cc-ico cc-station-ico', placeholderCanvas(32, 32));
    this.stationIconSlots.set('bookshelf', bsIcon);
    this.bookshelfSealsPreview = h('span', { class: 'cc-mini-seals', 'aria-hidden': 'true' });
    this.bookshelfSpinesPreview = h('span', { class: 'cc-mini-spines', 'aria-hidden': 'true' });
    const bookshelfStation = this.makeStation(
      'bookshelf',
      'cc-station-bookshelf',
      'Celestial Bookshelf and Constellation Seals',
      h(
        'span',
        { class: 'cc-station-craft cc-craft-bookshelf' },
        bsIcon,
        h('span', { class: 'cc-bookshelf-mini-stack' }, this.bookshelfSealsPreview, this.bookshelfSpinesPreview),
      ),
      'Bookshelf',
    );

    // ---- Station 4: Astrolabe Trinket Dish
    const trIcon = spriteBox('cc-ico cc-station-ico', placeholderCanvas(32, 32));
    this.stationIconSlots.set('trinkets', trIcon);
    this.trinketsBellPreview = spriteBox('cc-ico cc-mini-bell', placeholderCanvas(24, 24));
    const volBarsWrap = h('span', { class: 'cc-mini-vol-bars', 'aria-hidden': 'true' });
    for (let i = 1; i <= 3; i++) {
      const bar = h('span', { class: `cc-mini-vol-bar b${i} is-on` });
      this.trinketsVolBars.push(bar);
      volBarsWrap.append(bar);
    }
    this.trinketsInstallStarSlot = spriteBox('cc-ico', placeholderCanvas(18, 18));
    this.trinketsInstallPip = h(
      'span',
      { class: 'cc-mini-install-pip', hidden: true, 'aria-hidden': 'true' },
      this.trinketsInstallStarSlot,
    );
    const trinketsStation = this.makeStation(
      'trinkets',
      'cc-station-trinkets',
      'Astrolabe Trinket Dish',
      h('span', { class: 'cc-station-craft cc-craft-trinkets' }, trIcon, this.trinketsBellPreview, volBarsWrap, this.trinketsInstallPip),
      'Trinkets',
    );

    this.stationsEl = h(
      'nav',
      { class: 'cc-desk-stations', 'aria-label': "Violet's Stargazer Craft Stations" },
      paintboxStation,
      wardrobeStation,
      bookshelfStation,
      trinketsStation,
    );

    // ---- Drawer 1: Exotic Mediums Paintbox (all 10 Exotic Mediums)
    this.mediumsGrid = h('div', { class: 'cc-grid cc-grid-paintbox' });
    const paintboxDrawer = this.makeDrawer(
      'paintbox',
      'cc-drawer-paintbox',
      'Exotic Mediums Paintbox',
      'Trade Prism Crystals for luminous shader pigments.',
      true,
      this.mediumsGrid,
    );

    // ---- Drawer 2: Stargazer Wardrobe (Violet + Lumi + Nova live portrait stage + 14 Accessories)
    this.wardrobeCast = h('div', { class: 'cc-paper-dolls', 'aria-label': 'Violet, Lumi and Nova preview' });
    this.wardrobeGrid = h('div', { class: 'cc-grid cc-grid-stickers' });
    const wardrobeDrawer = this.makeDrawer(
      'wardrobe',
      'cc-drawer-wardrobe',
      'Stargazer Wardrobe',
      'Unlock & dress Violet, Lumi & Nova in cosmic accessories.',
      true,
      this.wardrobeCast,
      this.wardrobeGrid,
    );

    // ---- Drawer 3: Celestial Bookshelf
    this.badgesCountText = h('span', { class: 'cc-molding-count' }, '0 / 8');
    this.badgesMolding = h('div', { class: 'cc-wax-badges', 'aria-label': 'Constellation Seals' });
    this.shelf = h('div', { class: 'cc-book-spines' });
    this.shelfPrevIconSlot = spriteBox('cc-ico', placeholderCanvas(24, 24));
    this.shelfPrev = button('cc-round cc-shelf-nav', 'Previous shelf', () => this.turnShelf(-1), this.shelfPrevIconSlot);
    this.shelfNextIconSlot = spriteBox('cc-ico', placeholderCanvas(24, 24));
    this.shelfNext = button('cc-round cc-shelf-nav', 'Next shelf', () => this.turnShelf(1), this.shelfNextIconSlot);
    const bookshelfDrawer = this.makeDrawer(
      'bookshelf',
      'cc-drawer-bookshelf',
      'Celestial Bookshelf',
      'Constellation seals & bound storybooks from your voyages.',
      false,
      h(
        'div',
        { class: 'cc-shelf-molding' },
        h(
          'div',
          { class: 'cc-molding-head' },
          h('span', { class: 'cc-molding-title' }, 'Constellation Seals'),
          this.badgesCountText,
        ),
        this.badgesMolding,
      ),
      h('div', { class: 'cc-shelf-row' }, this.shelfPrev, this.shelf, this.shelfNext),
    );

    // ---- Drawer 4: Astrolabe Trinket Dish
    this.trinketAudioIconSlot = spriteBox('cc-ico cc-trinket-bell-ico', placeholderCanvas(28, 28));
    this.trinketAudioText = h('span', { class: 'cc-trinket-audio-label' }, AUDIO_LABEL[3]);
    const audioDotsWrap = h('span', { class: 'cc-trinket-audio-dots', 'aria-hidden': 'true' });
    for (let i = 1; i <= 3; i++) {
      const d = h('span', { class: 'cc-trinket-audio-dot is-on' });
      this.trinketAudioDots.push(d);
      audioDotsWrap.append(d);
    }
    this.trinketAudioBtn = button(
      'cc-trinket-audio',
      AUDIO_LABEL[3],
      () => {
        boing(this.trinketAudioBtn, 'press');
        this.cb?.onUiFoley?.('crystalChime');
        this.cb?.onAudioCycle();
      },
      h(
        'span',
        { class: 'cc-trinket-audio-inner' },
        this.trinketAudioIconSlot,
        this.trinketAudioText,
        audioDotsWrap,
      ),
    );
    this.trinketAudioBtn.dataset.level = '3';

    this.installStarSlot = spriteBox('cc-ico cc-install-star', placeholderCanvas(24, 24));
    const installBtn = button(
      'cc-install',
      'Install Sketchbook',
      () => {
        this.cb?.onUiFoley?.('wispChime');
        void install.install();
      },
      h('span', { class: 'cc-install-inner' }, this.installStarSlot, h('span', { class: 'cc-install-label' }, 'Install Sketchbook')),
    );
    this.installCloseSlot = spriteBox('cc-ico', placeholderCanvas(20, 20));
    const installX = button(
      'cc-install-x',
      'Hide install star-charm',
      () => {
        this.cb?.onUiFoley?.('crystalChime');
        install.dismiss();
      },
      this.installCloseSlot,
    );
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

    this.exportIconSlot = spriteBox('cc-ico', placeholderCanvas(24, 24));
    const exportBtn = button(
      'cc-scroll-btn cc-export',
      'Back up my sketchbook',
      () => {
        boing(exportBtn, 'press');
        this.cb?.onUiFoley?.('paperRustle');
        this.cb?.onExportVault();
      },
      h('span', { class: 'cc-chip-inner' }, this.exportIconSlot, h('span', {}, 'Save Backup')),
    );
    this.importIconSlot = spriteBox('cc-ico', placeholderCanvas(24, 24));
    const importBtn = button(
      'cc-scroll-btn cc-import',
      'Restore a sketchbook backup',
      () => {
        boing(importBtn, 'press');
        this.cb?.onUiFoley?.('paperRustle');
        this.fileInput.click();
      },
      h('span', { class: 'cc-chip-inner' }, this.importIconSlot, h('span', {}, 'Restore Backup')),
    );

    const trinketsDrawer = this.makeDrawer(
      'trinkets',
      'cc-drawer-trinkets',
      'Astrolabe Trinkets',
      'Sound volume, app install & sketchbook backup.',
      false,
      h(
        'div',
        { class: 'cc-trinket-dish-body' },
        h(
          'div',
          { class: 'cc-trinket-group' },
          h('span', { class: 'cc-trinket-group-label' }, 'Music & Chimes'),
          h('div', { class: 'cc-trinket-row cc-trinket-bell-row' }, this.trinketAudioBtn),
        ),
        h('div', { class: 'cc-trinket-row cc-trinket-install-row' }, this.installWrap),
        h(
          'div',
          { class: 'cc-trinket-group' },
          h('span', { class: 'cc-trinket-group-label' }, 'Sketchbook Keepsake Vault'),
          h('div', { class: 'cc-trinket-row cc-scroll-vault' }, exportBtn, importBtn, this.fileInput),
        ),
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
    badge?: HTMLElement,
  ): HTMLButtonElement {
    const b = button(
      `cc-station ${cls}`,
      ariaLabel,
      () => this.openStation(id),
      h('span', { class: 'cc-station-inner' }, art, h('span', { class: 'cc-station-tag' }, caption)),
    );
    if (badge) b.append(badge);
    b.dataset.station = id;
    b.dataset.affordable = 'false';
    b.setAttribute('aria-expanded', 'false');
    this.stationBtns.set(id, b);
    return b;
  }

  private makeDrawer(
    id: CraftStationId,
    cls: string,
    title: string,
    subtitle: string,
    showGems: boolean,
    ...body: HTMLElement[]
  ): HTMLElement {
    const closeSlot = spriteBox('cc-ico', placeholderCanvas(24, 24));
    this.closeIconSlots.push(closeSlot);
    const closeBtn = button(
      'cc-round cc-drawer-close',
      `Close ${title}`,
      () => this.closeDrawer(),
      closeSlot,
    );
    const countPill = h('span', { class: 'cc-drawer-count' });
    this.drawerCountEls.set(id, countPill);
    const metaItems: HTMLElement[] = [countPill];
    if (showGems) {
      const gemSlot = spriteBox('cc-ico cc-drawer-gem-ico', placeholderCanvas(18, 18));
      const gemText = h('span', { class: 'cc-drawer-gems-n' }, '0');
      this.drawerGemSlots.push(gemSlot);
      this.drawerGemTexts.push(gemText);
      metaItems.push(h('span', { class: 'cc-drawer-gems', 'aria-label': 'Prism Crystals' }, gemSlot, gemText));
    }
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
        h('div', { class: 'cc-drawer-head-right' }, ...metaItems, closeBtn),
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
    this.hydrateStaticSprites(cache);
    if (this.state) this.update(this.state, true);
  }

  private hydrateStaticSprites(cache: IllustrationCache): void {
    cache.mountInto(this.crestStarL, { type: 'uiSprite', id: 'tool_star' }, 18, 18);
    cache.mountInto(this.crestStarR, { type: 'uiSprite', id: 'tool_star' }, 18, 18);
    cache.mountInto(this.continueSealSlot, { type: 'uiSprite', id: 'tool_voyage_seal' }, 36, 36);
    cache.mountInto(this.playSealSlot, { type: 'uiSprite', id: 'tool_voyage_seal' }, 36, 36);
    for (const [id, slot] of this.stationIconSlots) {
      cache.mountInto(slot, { type: 'uiSprite', id: STATION_SPRITE[id] }, 32, 32);
    }
    for (const slot of this.closeIconSlots) {
      cache.mountInto(slot, { type: 'uiSprite', id: 'tool_close' }, 24, 24);
    }
    for (const slot of this.drawerGemSlots) {
      cache.mountInto(slot, { type: 'uiSprite', id: 'tool_gem' }, 18, 18);
    }
    cache.mountInto(this.shelfPrevIconSlot, { type: 'uiSprite', id: 'tool_prev' }, 24, 24);
    cache.mountInto(this.shelfNextIconSlot, { type: 'uiSprite', id: 'tool_next' }, 24, 24);
    cache.mountInto(this.trinketsBellPreview, { type: 'uiSprite', id: AUDIO_SPRITE[this.audioLevel] }, 24, 24);
    cache.mountInto(this.trinketAudioIconSlot, { type: 'uiSprite', id: AUDIO_SPRITE[this.audioLevel] }, 28, 28);
    cache.mountInto(this.trinketsInstallStarSlot, { type: 'uiSprite', id: 'tool_star' }, 18, 18);
    cache.mountInto(this.installStarSlot, { type: 'uiSprite', id: 'tool_star' }, 24, 24);
    cache.mountInto(this.installCloseSlot, { type: 'uiSprite', id: 'tool_close' }, 20, 20);
    cache.mountInto(this.exportIconSlot, { type: 'uiSprite', id: 'tool_export' }, 24, 24);
    cache.mountInto(this.importIconSlot, { type: 'uiSprite', id: 'tool_import' }, 24, 24);
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
    this.cb?.onUiFoley?.(id === 'wardrobe' ? 'paperRustle' : 'crystalChime');
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
    if (!silent) this.cb?.onUiFoley?.('crystalChime');
    this.activeStation = null;
    setShown(this.drawerLayer, false);
    for (const btn of this.stationBtns.values()) {
      btn.classList.remove('is-open');
      btn.setAttribute('aria-expanded', 'false');
    }
    for (const panel of this.drawers.values()) setShown(panel, false);
  }

  setAudio(level: AudioLevel): void {
    const spriteId = AUDIO_SPRITE[level];
    if (this.audioLevel === level && this.trinketAudioBtn.dataset.level === String(level)) {
      if (this.cache) {
        this.cache.mountInto(this.trinketAudioIconSlot, { type: 'uiSprite', id: spriteId }, 28, 28);
        this.cache.mountInto(this.trinketsBellPreview, { type: 'uiSprite', id: spriteId }, 24, 24);
      }
      return;
    }
    this.audioLevel = level;
    this.trinketAudioBtn.dataset.level = String(level);
    this.trinketAudioBtn.setAttribute('aria-label', AUDIO_LABEL[level]);
    this.trinketAudioBtn.title = AUDIO_LABEL[level];
    this.trinketAudioText.textContent = AUDIO_LABEL[level];
    this.trinketsVolBars.forEach((bar, i) => bar.classList.toggle('is-on', i < level));
    this.trinketAudioDots.forEach((dot, i) => dot.classList.toggle('is-on', i < level));
    const trinketCount = this.drawerCountEls.get('trinkets');
    if (trinketCount) trinketCount.textContent = level === 0 ? 'Quiet' : `Sound ${level}/3`;
    if (this.cache) {
      this.cache.mountInto(this.trinketAudioIconSlot, { type: 'uiSprite', id: spriteId }, 28, 28);
      this.cache.mountInto(this.trinketsBellPreview, { type: 'uiSprite', id: spriteId }, 24, 24);
    }
  }

  update(s: HubState, force = false): void {
    this.state = s;
    if (s.audioLevel !== undefined) this.setAudio(s.audioLevel);
    const gemsStr = String(Math.max(0, Math.floor(s.gems)));
    for (const el of this.drawerGemTexts) {
      if (el.textContent !== gemsStr) el.textContent = gemsStr;
    }

    const aff = computeHubAffordable(s);
    const pbBtn = this.stationBtns.get('paintbox');
    const wdBtn = this.stationBtns.get('wardrobe');
    if (pbBtn) {
      pbBtn.dataset.affordable = aff.paintbox ? 'true' : 'false';
      pbBtn.classList.toggle('has-affordable', aff.paintbox);
      setShown(this.paintboxGiftDot, aff.paintbox);
    }
    if (wdBtn) {
      wdBtn.dataset.affordable = aff.wardrobe ? 'true' : 'false';
      wdBtn.classList.toggle('has-affordable', aff.wardrobe);
      setShown(this.wardrobeGiftDot, aff.wardrobe);
    }

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
    const exotics = MATERIALS.filter((m) => m.tier === 'unlockable');
    const ownedCount = exotics.filter((m) => unlocked.has(m.id)).length;
    const pbCount = this.drawerCountEls.get('paintbox');
    if (pbCount) pbCount.textContent = `${ownedCount} / ${exotics.length} Collected`;

    // Live luminous pigment orbs preview on the closed Paintbox station
    clear(this.paintboxPreview);
    for (const def of exotics.slice(0, 6)) {
      const own = unlocked.has(def.id);
      const pan = h('span', { class: `cc-mini-pan${own ? ' is-owned' : ''}` });
      pan.style.setProperty('--pan-a', def.palette[0] ?? '#fff');
      pan.style.setProperty('--pan-b', def.palette[1] ?? def.palette[0] ?? '#eee');
      this.paintboxPreview.append(pan);
    }

    clear(this.mediumsGrid);
    for (const def of exotics) {
      const own = unlocked.has(def.id);
      const afford = gems >= def.unlockCost;
      const ready = !own && afford;

      const status = own
        ? h('span', { class: 'cc-tag cc-tag-own' }, 'Yours!')
        : h(
            'span',
            { class: `cc-tag cc-cost${afford ? ' is-afford' : ' is-short'}` },
            spriteBox('cc-ico cc-tag-gem', cache.sprite('tool_gem', 16)),
            String(def.unlockCost),
          );

      const readyBadge = ready
        ? h('span', { class: 'cc-ready-badge' }, 'Ready to Unlock!')
        : null;

      const strip = h('span', { class: 'cc-test-strip', 'aria-hidden': 'true' });
      strip.style.setProperty('--strip-a', def.palette[0] ?? '#fff');
      strip.style.setProperty('--strip-b', def.palette[1] ?? def.palette[0] ?? '#fff');
      strip.style.setProperty('--strip-c', def.palette[2] ?? def.palette[1] ?? def.palette[0] ?? '#fff');

      const b = button(
        `cc-item cc-shop-item cc-enamel-pan${own ? ' is-owned' : ''}${ready ? ' is-ready' : ''}${!own && !afford ? ' is-short' : ''}`,
        own ? `${def.name} (unlocked)` : `Unlock ${def.name} for ${def.unlockCost} Prism Crystals`,
        () => {
          if (own) {
            boing(b, 'press');
            this.cb?.onUiFoley?.('crystalChime');
            return;
          }
          if (!afford) {
            b.classList.remove('cc-shake');
            void b.offsetWidth;
            b.classList.add('cc-shake');
            this.cb?.onUiFoley?.('crystalChime');
            this.notify(`${def.unlockCost - gems} more Prism Crystals for ${def.name}`);
            return;
          }
          boing(b, 'select');
          this.cb?.onUiFoley?.('crystalChime');
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
              cache.canvas({ type: 'material', material: def.id }, 68, 68),
              h('span', { class: 'cc-gleam', 'aria-hidden': 'true' }),
            ),
          ),
          strip,
          h('span', { class: 'cc-item-name' }, def.name),
          status,
        ),
      );
      if (readyBadge) b.append(readyBadge);
      b.dataset.material = String(def.id);
      b.dataset.affordable = ready ? 'true' : 'false';
      b.style.setProperty('--pan-a', def.palette[0] ?? '#fff');
      b.style.setProperty('--pan-b', def.palette[1] ?? def.palette[0] ?? '#eee');
      this.mediumsGrid.append(b);
    }
  }

  private buildWardrobe(s: HubState): void {
    const cache = this.cache!;
    const owned = new Set<WardrobeItemId>(s.wardrobeOwned);
    const wdCount = this.drawerCountEls.get('wardrobe');
    if (wdCount) wdCount.textContent = `${owned.size} / ${WARDROBE_ITEMS.length} Collected`;

    // Closed desk preview: live miniature portraits of Violet, Lumi & Nova
    clear(this.wardrobePreview);
    for (const ch of CHARACTERS) {
      const wornCount = WARDROBE_ITEMS.filter((w) => w.owner === ch.id && owned.has(w.id) && s.wardrobe[w.id]).length;
      this.wardrobePreview.append(
        h(
          'span',
          { class: `cc-mini-doll${wornCount > 0 ? ' has-worn' : ''}` },
          cache.canvas({ type: 'portrait', who: ch.id }, 28, 32, 'cc-mini-doll-pix'),
        ),
      );
    }

    // Open close-up drawer: interactive cameo dressing booths for Violet, Lumi & Nova
    clear(this.wardrobeCast);
    for (const ch of CHARACTERS) {
      const charItems = WARDROBE_ITEMS.filter((w) => w.owner === ch.id);
      const wornItems = charItems.filter((w) => owned.has(w.id) && s.wardrobe[w.id]);
      const pips = h(
        'span',
        { class: 'cc-doll-badges' },
        ...(wornItems.length > 0
          ? wornItems.map((w) =>
              h('span', { class: 'cc-doll-sticker-pip', title: w.name }, cache.canvas({ type: 'wardrobe', item: w.id }, 26, 26)),
            )
          : [h('span', { class: 'cc-doll-empty-hint' }, 'Tap to dress up')]),
      );
      const booth = button(
        `cc-doll-card${wornItems.length > 0 ? ' is-dressed' : ''}`,
        `Jump to ${ch.name}'s accessories`,
        () => {
          boing(booth, 'press');
          this.cb?.onUiFoley?.('crystalChime');
          const sec = this.wardrobeGrid.querySelector<HTMLElement>(`[data-owner-group="${ch.id}"]`);
          sec?.scrollIntoView?.({ behavior: 'smooth', block: 'start' });
        },
        h(
          'span',
          { class: 'cc-doll-card-inner' },
          h('span', { class: 'cc-doll-portrait' }, cache.canvas({ type: 'portrait', who: ch.id }, 76, 88)),
          h(
            'span',
            { class: 'cc-doll-info' },
            h('span', { class: 'cc-doll-name' }, ch.name),
            h(
              'span',
              { class: 'cc-doll-worn-count' },
              wornItems.length > 0 ? `Wearing ${wornItems.length} of ${charItems.length}` : `${charItems.length} charms`,
            ),
            pips,
          ),
        ),
      );
      booth.dataset.character = ch.id;
      this.wardrobeCast.append(booth);
    }

    // All 14 Wardrobe Accessories, grouped in clean balanced per-character rows (zero orphan holes!)
    clear(this.wardrobeGrid);
    for (const ch of CHARACTERS) {
      const groupItems = WARDROBE_ITEMS.filter((w) => w.owner === ch.id);
      const groupOwned = groupItems.filter((w) => owned.has(w.id)).length;
      const groupHeader = h(
        'div',
        { class: 'cc-wardrobe-group-head', 'data-owner-group': ch.id },
        h('span', { class: 'cc-wardrobe-group-title' }, `${ch.name}'s Accessories`),
        h('span', { class: 'cc-wardrobe-group-count' }, `${groupOwned} / ${groupItems.length}`),
      );
      const sectionGrid = h('div', {
        class: `cc-wardrobe-subgrid cols-${groupItems.length === 6 ? 3 : 4}`,
        'data-owner-grid': ch.id,
      });

      for (const w of groupItems) {
        const own = owned.has(w.id);
        const on = own && !!s.wardrobe[w.id];
        const afford = s.gems >= w.cost;
        const ready = !own && afford;

        const status = own
          ? h('span', { class: `cc-tag ${on ? 'cc-tag-on' : 'cc-tag-off'}` }, on ? 'Wearing' : 'Put On')
          : h(
              'span',
              { class: `cc-tag cc-cost${afford ? ' is-afford' : ' is-short'}` },
              spriteBox('cc-ico cc-tag-gem', cache.sprite('tool_gem', 16)),
              String(w.cost),
            );

        const readyBadge = ready
          ? h('span', { class: 'cc-ready-badge' }, 'Ready to Unlock!')
          : null;

        const b = button(
          `cc-item cc-ward-item cc-cloisonne-card${on ? ' is-on' : ''}${own ? ' is-owned' : ''}${ready ? ' is-ready' : ''}${!own && !afford ? ' is-short' : ''}`,
          own ? `${on ? 'Take off' : 'Put on'} ${w.name}` : `Unlock ${w.name} for ${w.cost} Prism Crystals`,
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
              this.cb?.onUiFoley?.('crystalChime');
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
            h('span', { class: 'cc-item-art cc-sticker-art' }, cache.canvas({ type: 'wardrobe', item: w.id }, 68, 68)),
            h('span', { class: 'cc-item-name' }, w.name),
            status,
          ),
        );
        if (readyBadge) b.append(readyBadge);
        b.dataset.wardrobe = w.id;
        b.dataset.owner = w.owner;
        b.dataset.affordable = ready ? 'true' : 'false';
        if (own) b.setAttribute('aria-pressed', String(on));
        sectionGrid.append(b);
      }
      this.wardrobeGrid.append(groupHeader, sectionGrid);
    }
  }

  private buildBadges(earned: Set<BadgeId>): void {
    const cache = this.cache!;
    this.badgesCountText.textContent = `${earned.size} / ${BADGE_ORDER.length}`;
    const bsCount = this.drawerCountEls.get('bookshelf');
    if (bsCount) {
      const bookCount = this.state?.storybooks.length ?? 0;
      bsCount.textContent = `${earned.size}/${BADGE_ORDER.length} Seals · ${bookCount} ${bookCount === 1 ? 'Story' : 'Stories'}`;
    }
    clear(this.bookshelfSealsPreview);
    for (const id of BADGE_ORDER) {
      this.bookshelfSealsPreview.append(h('span', { class: `cc-mini-seal${earned.has(id) ? ' is-on' : ''}` }));
    }

    clear(this.badgesMolding);
    for (const id of BADGE_ORDER) {
      const info = BADGE_INFO[id];
      const got = earned.has(id);
      const art = h(
        'span',
        { class: 'cc-badge-art', 'aria-hidden': 'true' },
        cache.sprite(BADGE_SPRITE[id], 28, 'cc-badge-pix'),
      );
      this.badgesMolding.append(
        h(
          'div',
          {
            class: `cc-badge cc-wax-badge${got ? ' is-on' : ''}`,
            role: 'img',
            'aria-label': `${info.name}: ${got ? 'seal earned' : info.hint}`,
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
    const bsCount = this.drawerCountEls.get('bookshelf');
    if (bsCount) {
      const seals = this.state?.badges.length ?? 0;
      bsCount.textContent = `${seals}/${BADGE_ORDER.length} Seals · ${books.length} ${books.length === 1 ? 'Story' : 'Stories'}`;
    }

    clear(this.bookshelfSpinesPreview);
    const previewBooks = books.slice(0, 5);
    const heights = [24, 28, 22, 26, 25] as const;
    if (previewBooks.length === 0) {
      const starterTones = [BOOKCLOTH_TONES[0]!, BOOKCLOTH_TONES[1]!, BOOKCLOTH_TONES[2]!, BOOKCLOTH_TONES[3]!];
      starterTones.forEach((tone, idx) => {
        const sp = h('span', { class: 'cc-mini-spine is-ghost' });
        sp.style.setProperty('--spine-bg', tone.cloth);
        sp.style.setProperty('--spine-foil', tone.foil);
        sp.style.setProperty('--spine-h', `${heights[idx % heights.length]}px`);
        this.bookshelfSpinesPreview.append(sp);
      });
    } else {
      previewBooks.forEach((b, idx) => {
        const tone = bookSpineTone(b);
        const sp = h('span', { class: 'cc-mini-spine', 'data-spine-color': tone.name });
        sp.style.setProperty('--spine-bg', tone.cloth);
        sp.style.setProperty('--spine-foil', tone.foil);
        sp.style.setProperty('--spine-h', `${heights[idx % heights.length]}px`);
        this.bookshelfSpinesPreview.append(sp);
      });
    }

    const pages = Math.max(1, Math.ceil(books.length / BOOKS_PER_PAGE));
    this.shelfPage = Math.min(this.shelfPage, pages - 1);
    clear(this.shelf);
    if (books.length === 0) {
      this.shelf.append(
        h(
          'div',
          { class: 'cc-shelf-empty' },
          spriteBox('cc-ico cc-shelf-empty-star', cache.sprite('tool_star', 28)),
          h('p', { class: 'cc-shelf-empty-text' }, 'Finish a voyage to bind your first starry storybook on this shelf!'),
        ),
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
          this.cb?.onUiFoley?.('crystalChime');
          if (this.cb?.onSaveBookKeepsake) this.cb.onSaveBookKeepsake(b.id);
          else this.cb?.onSaveKeepsake();
        },
        spriteBox('cc-ico', cache.sprite('tool_postcard', 24)),
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
