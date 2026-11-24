/** Violet's Stargazer Bedroom Hub panel: play/continue, mediums shop, wardrobe, constellation badges, bookshelf, vault. */
import { MATERIALS } from '../contracts/materials';
import type { MaterialId } from '../contracts/materials';
import { BADGE_ORDER, WARDROBE_ITEMS } from '../contracts/progression';
import type { BadgeId, WardrobeItemId } from '../contracts/progression';
import type { HubState, UiCallbacks } from '../contracts/ui';
import type { StorybookSummary } from '../contracts/vault';
import { button, clear, fnv1a, h, iconSpan, setShown } from './dom';
import {
  ICON_CONTINUE, ICON_EXPORT, ICON_GEM, ICON_IMPORT, ICON_NEXT, ICON_PLAY, ICON_PREV, TAB_ICONS,
} from './icons';
import type { IllustrationCache } from './illustrations';
import { boing } from './spring';

export type HubTab = 'mediums' | 'wardrobe' | 'badges' | 'books';

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

const TABS: Array<{ id: HubTab; label: string }> = [
  { id: 'mediums', label: 'Mediums' },
  { id: 'wardrobe', label: 'Wardrobe' },
  { id: 'badges', label: 'Badges' },
  { id: 'books', label: 'Books' },
];

export const BOOKS_PER_PAGE = 3;

const intro = (text: string): HTMLElement => h('p', { class: 'cc-pane-intro' }, text);

export class HubPanel {
  readonly el: HTMLElement;
  private cb: UiCallbacks | null = null;
  private cache: IllustrationCache | null = null;
  private notify: (msg: string) => void = () => undefined;
  private state: HubState | null = null;
  private tab: HubTab = 'mediums';
  private shelfPage = 0;
  private readonly sig: Record<HubTab | 'play', string> = { mediums: '', wardrobe: '', badges: '', books: '', play: '' };

  private readonly playBtn: HTMLButtonElement;
  private readonly playLabel = h('span', { class: 'cc-big-label' }, 'Play');
  private readonly continueBtn: HTMLButtonElement;
  private readonly tabBtns = new Map<HubTab, HTMLButtonElement>();
  private readonly panes = new Map<HubTab, HTMLElement>();
  private readonly mediumsGrid: HTMLElement;
  private readonly wardrobeGrid: HTMLElement;
  private readonly badgesGrid: HTMLElement;
  private readonly shelf: HTMLElement;
  private readonly shelfPrev: HTMLButtonElement;
  private readonly shelfNext: HTMLButtonElement;
  readonly fileInput: HTMLInputElement;

  constructor() {
    this.continueBtn = button('cc-big cc-continue', 'Continue Run', () => this.cb?.onContinueRun(),
      h('span', { class: 'cc-big-inner' }, iconSpan(ICON_CONTINUE), h('span', { class: 'cc-big-label' }, 'Continue')));
    this.playBtn = button('cc-big cc-play', 'Play', () => this.cb?.onStartRun(),
      h('span', { class: 'cc-big-inner' }, iconSpan(ICON_PLAY), this.playLabel));
    setShown(this.continueBtn, false);

    const tabs = h('div', { class: 'cc-tabs', role: 'tablist' });
    for (const t of TABS) {
      const b = button('cc-tab', t.label, () => this.selectTab(t.id),
        h('span', { class: 'cc-tab-inner' }, iconSpan(TAB_ICONS[t.id]), h('span', { class: 'cc-tab-label' }, t.label)));
      b.setAttribute('role', 'tab');
      b.dataset.tab = t.id;
      this.tabBtns.set(t.id, b);
      tabs.append(b);
    }

    this.mediumsGrid = h('div', { class: 'cc-grid cc-grid-mediums' });
    this.wardrobeGrid = h('div', { class: 'cc-grid cc-grid-wardrobe' });
    this.badgesGrid = h('div', { class: 'cc-grid cc-grid-badges' });
    this.shelf = h('div', { class: 'cc-shelf' });
    this.shelfPrev = button('cc-round cc-shelf-nav', 'Previous shelf', () => this.turnShelf(-1), iconSpan(ICON_PREV));
    this.shelfNext = button('cc-round cc-shelf-nav', 'Next shelf', () => this.turnShelf(1), iconSpan(ICON_NEXT));

    this.fileInput = h('input', { type: 'file', accept: 'application/json,.json', class: 'cc-file', tabindex: -1, 'aria-hidden': 'true' });
    this.fileInput.addEventListener('change', () => void this.readImport());
    const exportBtn = button('cc-chip cc-export', 'Back up my sketchbook', () => this.cb?.onExportVault(),
      h('span', { class: 'cc-chip-inner' }, iconSpan(ICON_EXPORT), h('span', {}, 'Back up')));
    const importBtn = button('cc-chip cc-import', 'Restore a sketchbook backup', () => this.fileInput.click(),
      h('span', { class: 'cc-chip-inner' }, iconSpan(ICON_IMPORT), h('span', {}, 'Restore')));

    const mk = (id: HubTab, ...kids: HTMLElement[]): HTMLElement => {
      const p = h('section', { class: 'cc-pane', role: 'tabpanel', 'data-tab': id }, ...kids);
      this.panes.set(id, p);
      return p;
    };

    this.el = h('aside', { class: 'cc-hub', 'aria-label': "Violet's Stargazer Bedroom" },
      h('div', { class: 'cc-hub-play' }, this.continueBtn, this.playBtn),
      tabs,
      h('div', { class: 'cc-panes' },
        mk('mediums', intro('Trade Stardust Gems for brand-new magic mediums!'), this.mediumsGrid),
        mk('wardrobe', intro('Dress up Violet, Lumi & Nova. Tap again to take it off.'), this.wardrobeGrid),
        mk('badges', intro('Constellations you light up on your voyages.'), this.badgesGrid),
        mk('books',
          intro('Your finished voyages, ready to read again.'),
          h('div', { class: 'cc-shelf-row' }, this.shelfPrev, this.shelf, this.shelfNext),
          h('div', { class: 'cc-vault-row' }, exportBtn, importBtn, this.fileInput)),
      ),
    );
    this.selectTab('mediums', false);
  }

  bind(cb: UiCallbacks, cache: IllustrationCache, notify: (msg: string) => void): void {
    this.cb = cb;
    this.cache = cache;
    this.notify = notify;
    if (this.state) this.update(this.state, true);
  }

  get currentTab(): HubTab {
    return this.tab;
  }

  selectTab(t: HubTab, anim = true): void {
    this.tab = t;
    for (const [id, b] of this.tabBtns) {
      const on = id === t;
      b.setAttribute('aria-selected', String(on));
      b.classList.toggle('is-on', on);
      if (on && anim) boing(b, 'press');
    }
    for (const [id, p] of this.panes) setShown(p, id === t);
  }

  update(s: HubState, force = false): void {
    this.state = s;
    if (!this.cache) return;
    const play = `${s.hasRunInProgress}`;
    if (force || play !== this.sig.play) {
      this.sig.play = play;
      setShown(this.continueBtn, s.hasRunInProgress);
      this.playLabel.textContent = s.hasRunInProgress ? 'New Voyage' : 'Play';
      this.playBtn.setAttribute('aria-label', s.hasRunInProgress ? 'Start a new voyage' : 'Play');
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
    const ksig = s.storybooks.map((b) => `${b.id}:${b.title}`).join('|');
    if (force || ksig !== this.sig.books) {
      this.sig.books = ksig;
      this.buildShelf(s.storybooks);
    }
  }

  private buildMediums(gems: number, unlocked: Set<MaterialId>): void {
    const cache = this.cache!;
    clear(this.mediumsGrid);
    for (const def of MATERIALS.filter((m) => m.tier === 'unlockable')) {
      const own = unlocked.has(def.id);
      const afford = gems >= def.unlockCost;
      const status = own
        ? h('span', { class: 'cc-tag cc-tag-own' }, 'Yours!')
        : h('span', { class: `cc-tag cc-cost${afford ? '' : ' is-short'}` }, iconSpan(ICON_GEM, 'cc-ico cc-tag-gem'), String(def.unlockCost));
      const b = button(`cc-item cc-shop-item${own ? ' is-owned' : ''}${!own && !afford ? ' is-short' : ''}`,
        own ? `${def.name} (unlocked)` : `Unlock ${def.name} for ${def.unlockCost} gems`, () => {
          if (own) {
            boing(b, 'press');
            return;
          }
          if (!afford) {
            b.classList.remove('cc-shake');
            void b.offsetWidth;
            b.classList.add('cc-shake');
            this.notify(`${def.unlockCost - gems} more Stardust Gems to unlock ${def.name}!`);
            return;
          }
          boing(b, 'select');
          this.cb?.onUnlockMaterial(def.id);
        },
        h('span', { class: 'cc-item-inner' },
          h('span', { class: 'cc-item-art cc-swatch-body' }, cache.canvas({ type: 'material', material: def.id }, 32, 32), h('span', { class: 'cc-gleam', 'aria-hidden': 'true' })),
          h('span', { class: 'cc-item-name' }, def.name),
          status));
      b.dataset.material = String(def.id);
      this.mediumsGrid.append(b);
    }
  }

  private buildWardrobe(s: HubState): void {
    const cache = this.cache!;
    clear(this.wardrobeGrid);
    const owned = new Set<WardrobeItemId>(s.wardrobeOwned);
    for (const w of WARDROBE_ITEMS) {
      const own = owned.has(w.id);
      const on = own && !!s.wardrobe[w.id];
      const afford = s.gems >= w.cost;
      const status = own
        ? h('span', { class: `cc-tag ${on ? 'cc-tag-on' : 'cc-tag-off'}` }, on ? 'Wearing' : 'Put on')
        : h('span', { class: `cc-tag cc-cost${afford ? '' : ' is-short'}` }, iconSpan(ICON_GEM, 'cc-ico cc-tag-gem'), String(w.cost));
      const b = button(`cc-item cc-ward-item${on ? ' is-on' : ''}${own ? ' is-owned' : ''}${!own && !afford ? ' is-short' : ''}`,
        own ? `${on ? 'Take off' : 'Put on'} ${w.name}` : `Buy ${w.name} for ${w.cost} gems`, () => {
          if (own) {
            boing(b, 'select');
            this.cb?.onToggleWardrobe(w.id);
            return;
          }
          if (!afford) {
            b.classList.remove('cc-shake');
            void b.offsetWidth;
            b.classList.add('cc-shake');
            this.notify(`${w.cost - s.gems} more Stardust Gems for the ${w.name}!`);
            return;
          }
          boing(b, 'select');
          this.cb?.onBuyWardrobe(w.id);
        },
        h('span', { class: 'cc-item-inner' },
          h('span', { class: 'cc-item-art' }, cache.canvas({ type: 'wardrobe', item: w.id }, 32, 32)),
          h('span', { class: 'cc-item-name' }, w.name),
          status));
      b.dataset.wardrobe = w.id;
      if (own) b.setAttribute('aria-pressed', String(on));
      this.wardrobeGrid.append(b);
    }
  }

  private buildBadges(earned: Set<BadgeId>): void {
    clear(this.badgesGrid);
    for (const id of BADGE_ORDER) {
      const info = BADGE_INFO[id];
      const got = earned.has(id);
      const pts = info.stars.map(([x, y]) => `${x},${y}`).join(' ');
      const dots = info.stars.map(([x, y]) => `<circle cx="${x}" cy="${y}" r="7"/>`).join('');
      const art = h('span', { class: 'cc-badge-art', 'aria-hidden': 'true' });
      art.innerHTML = `<svg viewBox="0 0 100 100"><polyline points="${pts}"/>${dots}</svg>`;
      this.badgesGrid.append(
        h('div', { class: `cc-badge${got ? ' is-on' : ''}`, role: 'img', 'aria-label': `${info.name}: ${got ? 'earned!' : info.hint}`, title: got ? info.name : info.hint, 'data-badge': id },
          art, h('span', { class: 'cc-badge-name' }, info.name)),
      );
    }
  }

  private buildShelf(books: StorybookSummary[]): void {
    const cache = this.cache!;
    const pages = Math.max(1, Math.ceil(books.length / BOOKS_PER_PAGE));
    this.shelfPage = Math.min(this.shelfPage, pages - 1);
    clear(this.shelf);
    if (books.length === 0) {
      this.shelf.append(h('p', { class: 'cc-shelf-empty' }, 'Finish a voyage and its storybook will appear here!'));
    }
    const slice = books.slice(this.shelfPage * BOOKS_PER_PAGE, (this.shelfPage + 1) * BOOKS_PER_PAGE);
    for (const b of slice) {
      const seed = fnv1a(b.id);
      const btn = button('cc-cover', `Open storybook: ${b.title} (${b.galaxyName})`, () => {
        boing(btn, 'press');
        this.cb?.onOpenBook(b.id);
      }, h('span', { class: 'cc-cover-inner' },
        cache.canvas({ type: 'bookCover', seed, title: b.title }, 72, 96, 'cc-cover-pix'),
        h('span', { class: 'cc-cover-title' }, b.title)));
      btn.dataset.book = b.id;
      this.shelf.append(btn);
    }
    this.shelfPrev.disabled = this.shelfPage <= 0;
    this.shelfNext.disabled = this.shelfPage >= pages - 1;
    setShown(this.shelfPrev, pages > 1);
    setShown(this.shelfNext, pages > 1);
  }

  private turnShelf(d: number): void {
    if (!this.state) return;
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
