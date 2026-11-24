/**
 * UiPort implementation: Wanderlings Heirloom Living Sketchbook resting on a lamp-lit cedar desk.
 * DOM only; imports nothing outside src/contracts and src/ui. Strictly zero spoken voices / zero CDN assets.
 */
import '../styles/main.css';
import type { StoryMilestoneKind } from '../contracts/art';
import { APP_NAME } from '../contracts/constants';
import type { ChapterId, DraftCardId } from '../contracts/roguelike';
import type { AppMode, HubState, HudState, UiCallbacks, UiDeps, UiPort } from '../contracts/ui';
import type { StorybookSummary } from '../contracts/vault';
import { button, frag, h, iconSpan, setShown } from './dom';
import { HubPanel } from './hub';
import { Hud } from './hud';
import {
  BRASS_CLASP_SVG,
  CORNER_FILIGREE_SVG,
  ICON_BACK,
  ICON_NEXT,
  ICON_POSTCARD,
  ICON_PREV,
  ICON_STAR,
} from './icons';
import { IllustrationCache } from './illustrations';
import { PointerInput } from './input';
import { InstallController } from './install';
import { Modals } from './modals';
import { boing, prefersReducedMotion } from './spring';

export { PointerInput } from './input';
export { InstallController, isStandalone } from './install';

const HUB_TITLE = "Violet's Stargazer Desk";
const INPUT_MODES: ReadonlySet<AppMode> = new Set<AppMode>(['chapter', 'hub', 'book']);

class SketchbookUi implements UiPort {
  readonly canvasHost: HTMLElement;
  readonly rootEl: HTMLElement;
  private readonly root: HTMLElement;
  private readonly install: InstallController;
  private readonly hud: Hud;
  private readonly hub: HubPanel;
  private readonly modals: Modals;
  private readonly fxOverlay: HTMLElement;
  private readonly toastBox: HTMLElement;
  private readonly bookBar: HTMLElement;
  private readonly bookPrev: HTMLButtonElement;
  private readonly bookNext: HTMLButtonElement;
  private readonly bookTitle: HTMLElement;
  private readonly bookPage: HTMLElement;
  private readonly boot: HTMLElement;
  private input: PointerInput | null = null;
  private cb: UiCallbacks | null = null;
  private deps: UiDeps | null = null;
  private cache: IllustrationCache | null = null;
  private mode: AppMode = 'boot';
  private hudTitle = APP_NAME;
  private mounted = false;

  constructor(root: HTMLElement) {
    this.root = root;
    // Listen for beforeinstallprompt immediately: it can fire before mount().
    this.install = new InstallController(window);
    this.hud = new Hud();
    this.hub = new HubPanel(this.install);
    this.modals = new Modals();

    this.canvasHost = h('div', { class: 'cc-canvas-host', 'aria-label': 'Sketchbook page', role: 'application' });
    this.boot = h(
      'div',
      { class: 'cc-boot', role: 'status', 'aria-label': 'Opening the sketchbook' },
      h('span', { class: 'cc-boot-spark' }, iconSpan(ICON_STAR)),
      h('span', { class: 'cc-boot-spark s2' }, iconSpan(ICON_STAR)),
      h('span', { class: 'cc-boot-spark s3' }, iconSpan(ICON_STAR)),
      h('span', { class: 'cc-boot-text' }, 'Opening the sketchbook...'),
    );

    // Living Bookshelf viewer controls
    this.bookTitle = h('span', { class: 'cc-bookbar-title' });
    this.bookPage = h('span', { class: 'cc-bookbar-page' });
    this.bookPrev = button(
      'cc-round cc-book-nav cc-book-prev',
      'Previous page',
      () => {
        this.cb?.onUiFoley?.('paperRustle');
        this.cb?.onBookPage(-1);
      },
      iconSpan(ICON_PREV),
    );
    this.bookNext = button(
      'cc-round cc-book-nav cc-book-next',
      'Next page',
      () => {
        this.cb?.onUiFoley?.('paperRustle');
        this.cb?.onBookPage(1);
      },
      iconSpan(ICON_NEXT),
    );
    this.bookBar = h(
      'div',
      { class: 'cc-bookbar' },
      button(
        'cc-chip cc-book-back',
        'Back to the bookshelf',
        () => {
          this.cb?.onUiFoley?.('paperRustle');
          this.cb?.onCloseBook();
        },
        h('span', { class: 'cc-chip-inner' }, iconSpan(ICON_BACK), h('span', {}, 'Shelf')),
      ),
      h('div', { class: 'cc-bookbar-info' }, this.bookTitle, this.bookPage),
      button(
        'cc-chip cc-keepsake',
        'Save Keepsake PNG',
        () => {
          this.cb?.onUiFoley?.('woodTap');
          this.cb?.onSaveKeepsake();
        },
        h('span', { class: 'cc-chip-inner' }, iconSpan(ICON_POSTCARD), h('span', {}, 'Save Keepsake')),
      ),
    );

    this.fxOverlay = h('div', { class: 'cc-fx-overlay', 'aria-hidden': 'true' });
    this.toastBox = h('div', { class: 'cc-toasts', 'aria-live': 'polite', role: 'status' });

    // Warm twilight lamp-lit cedar desk surface & drifting ambient golden dust motes
    const deskDeco = h(
      'div',
      { class: 'cc-desk', 'aria-hidden': 'true' },
      h('span', { class: 'cc-lamp' }),
      h('span', { class: 'cc-lamp-halo' }),
      h('span', { class: 'cc-dust-mote m1' }),
      h('span', { class: 'cc-dust-mote m2' }),
      h('span', { class: 'cc-dust-mote m3' }),
      h('span', { class: 'cc-dust-mote m4' }),
      h('span', { class: 'cc-dust-mote m5' }),
      h('span', { class: 'cc-dust-mote m6' }),
      h('span', { class: 'cc-dust-mote m7' }),
    );

    const stage = h(
      'main',
      { class: 'cc-stage' },
      h('div', { class: 'cc-frame' }, this.canvasHost, this.boot),
    );

    // Open cotton sketchbook spread with stitched linen spine, tarnished brass corner clasps & botanical/celestial filigree
    const book = h(
      'div',
      { class: 'cc-book cc-spread' },
      h('div', { class: 'cc-spine', 'aria-hidden': 'true' }),
      iconSpan(BRASS_CLASP_SVG, 'cc-clasp tl'),
      iconSpan(BRASS_CLASP_SVG, 'cc-clasp bl'),
      iconSpan(CORNER_FILIGREE_SVG, 'cc-filigree tl'),
      iconSpan(CORNER_FILIGREE_SVG, 'cc-filigree bl'),
      this.hud.bookmark,
      this.hud.cornerRight,
      stage,
      this.hud.dogEarEarly,
      this.hud.dogEarNext,
      this.hub.voyageEl,
      this.bookPrev,
      this.bookNext,
      this.bookBar,
    );

    this.rootEl = h(
      'div',
      { class: 'cc-root', 'data-mode': 'boot' },
      deskDeco,
      book,
      this.hud.crystalJar,
      this.hud.dock,
      this.hub.stationsEl,
      this.hub.drawerLayer,
      this.modals.layer,
      this.fxOverlay,
      this.toastBox,
    );

    const block = (e: Event): void => e.preventDefault();
    this.rootEl.addEventListener('contextmenu', block);
    this.rootEl.addEventListener('gesturestart', block);
    this.rootEl.addEventListener('dblclick', block);
    this.rootEl.addEventListener('selectstart', block);
    this.rootEl.addEventListener('dragstart', block);
    root.classList.add('cc-app');
    root.append(this.rootEl);
    this.hud.setTitle(APP_NAME);
  }

  mount(cb: UiCallbacks, deps: UiDeps): void {
    this.cb = cb;
    this.deps = deps;
    this.cache = new IllustrationCache((k, w, hh) => deps.illustration(k, w, hh));
    this.hud.bind(cb, this.cache);
    this.hub.bind(cb, this.cache, (m) => this.toast(m));
    this.modals.bind(this.cache, (kind) => cb.onUiFoley?.(kind));
    this.input?.destroy();
    this.input = new PointerInput(this.canvasHost, {
      toInternal: (x, y) => this.deps?.clientToInternal(x, y) ?? null,
      gesture: (e) => {
        if (e.phase === 'start' && this.rootEl.dataset.prologue === 'true') {
          this.cb?.onDismissPrologue?.();
        }
        this.cb?.onGesture(e);
      },
      hover: (p) => this.cb?.onHover(p),
      enabled: () => INPUT_MODES.has(this.mode) && !this.modals.isOpen && this.hub.openDrawerId === null,
    });
    this.mounted = true;
    this.applyMode(this.mode, true);
  }

  get currentMode(): AppMode {
    return this.mode;
  }

  setMode(m: AppMode): void {
    if (m === this.mode && this.mounted) return;
    this.applyMode(m, false);
  }

  private applyMode(m: AppMode, force: boolean): void {
    const prev = this.mode;
    this.mode = m;
    this.rootEl.dataset.mode = m;
    this.hud.setMode(m);
    if (m !== 'hub') this.hub.closeDrawer(true);
    if (!INPUT_MODES.has(m)) {
      this.input?.abort();
      this.cb?.onHover(null);
    }
    if (m === 'hub') this.hud.setTitle(HUB_TITLE);
    else if (m === 'boot') this.hud.setTitle(APP_NAME);
    else this.hud.setTitle(this.hudTitle);
    if (m === 'chapter' && (force || prev !== 'chapter')) this.hud.appear();
    if (m === 'hub' && prev !== 'hub') {
      boing(this.hub.voyageEl, 'appear');
      boing(this.hub.stationsEl, 'appear');
    }
  }

  updateHud(s: HudState): void {
    this.hudTitle = s.chapterTitle || APP_NAME;
    this.rootEl.dataset.prologue = s.prologueActive ? 'true' : 'false';
    this.hud.update(s);
    this.hub.setAudio(s.audioLevel);
    if (this.mode === 'hub') this.hud.setTitle(HUB_TITLE);
    else if (this.mode === 'boot') this.hud.setTitle(APP_NAME);
  }

  updateHub(s: HubState): void {
    this.hub.update(s);
    this.hud.setGems(s.gems);
    if (s.audioLevel !== undefined) this.hud.setAudio(s.audioLevel);
  }

  showDraft(cards: DraftCardId[]): Promise<DraftCardId> {
    this.input?.abort();
    return this.modals.showDraft(cards);
  }

  showDoors(o: ChapterId[]): Promise<ChapterId> {
    this.input?.abort();
    return this.modals.showDoors(o);
  }

  showFinale(name: string): Promise<void> {
    this.input?.abort();
    return this.modals.showFinale(name, () => this.cb?.onFinaleDone());
  }

  showBook(b: StorybookSummary, page: number, count: number): void {
    if (this.mode !== 'book') this.applyMode('book', false);
    this.hud.setTitle(b.title);
    const sameGalaxy = !b.galaxyName || b.title.toLowerCase().includes(b.galaxyName.toLowerCase());
    this.bookTitle.textContent = sameGalaxy ? b.title : `${b.title} \u00b7 ${b.galaxyName}`;
    const total = Math.max(1, count);
    const p = Math.max(0, Math.min(total - 1, page));
    this.bookPage.textContent = `Page ${p + 1} of ${total}`;
    this.bookPrev.disabled = p <= 0;
    this.bookNext.disabled = p >= total - 1;
    this.bookBar.dataset.book = b.id;
  }

  /** Fires a luminous golden starlight thread SVG Bézier arc up into the matching Bookmark Story Star Socket. */
  animateStarThread(milestoneId: StoryMilestoneKind, fromClientX: number, fromClientY: number): void {
    const dest = this.hud.getSocketCenter(milestoneId);
    const vw = Math.max(320, typeof window !== 'undefined' ? window.innerWidth || 1280 : 1280);
    const vh = Math.max(200, typeof window !== 'undefined' ? window.innerHeight || 720 : 720);
    const x1 = Number.isFinite(fromClientX) ? fromClientX : vw / 2;
    const y1 = Number.isFinite(fromClientY) ? fromClientY : vh / 2;
    const x2 = dest.x;
    const y2 = dest.y;
    const ctrlX = (x1 + x2) / 2 + (x1 < x2 ? -56 : 56);
    const ctrlY = Math.min(y1, y2) - Math.max(48, Math.abs(y1 - y2) * 0.28);
    const d = `M ${x1.toFixed(1)} ${y1.toFixed(1)} Q ${ctrlX.toFixed(1)} ${ctrlY.toFixed(1)} ${x2.toFixed(1)} ${y2.toFixed(1)}`;
    const approxLen = Math.max(120, Math.hypot(x2 - x1, y2 - y1) * 1.25);

    const wrap = h('div', { class: 'cc-star-thread', 'data-milestone': milestoneId });
    wrap.style.setProperty('--thread-len', approxLen.toFixed(1));
    wrap.append(
      frag(
        `<svg viewBox="0 0 ${vw} ${vh}" preserveAspectRatio="none" xmlns="http://www.w3.org/2000/svg" fill="none">` +
          `<path class="cc-thread-glow" d="${d}" stroke="#ffd43b" stroke-width="7" stroke-linecap="round" opacity=".4"/>` +
          `<path class="cc-thread-core" d="${d}" stroke="#fff7cf" stroke-width="2.6" stroke-linecap="round"/>` +
          `<circle class="cc-thread-burst" cx="${x2.toFixed(1)}" cy="${y2.toFixed(1)}" r="10" fill="#ffd43b" opacity=".85"/>` +
          `<circle class="cc-thread-spark s1" cx="${(x2 - 14).toFixed(1)}" cy="${(y2 + 6).toFixed(1)}" r="2.5" fill="#fff4c4"/>` +
          `<circle class="cc-thread-spark s2" cx="${(x2 + 15).toFixed(1)}" cy="${(y2 + 4).toFixed(1)}" r="2.2" fill="#ffe08a"/>` +
          `<circle class="cc-thread-spark s3" cx="${(x2 + 2).toFixed(1)}" cy="${(y2 + 14).toFixed(1)}" r="2.6" fill="#ff9ecf"/>` +
          `</svg>`,
      ),
    );

    this.fxOverlay.append(wrap);
    const arriveMs = prefersReducedMotion() ? 0 : 480;
    const removeMs = prefersReducedMotion() ? 320 : 980;
    if (arriveMs === 0) this.hud.pulseSocket(milestoneId);
    else setTimeout(() => this.hud.pulseSocket(milestoneId), arriveMs);
    setTimeout(() => wrap.remove(), removeMs);
  }

  /** Drops glowing faceted Prism Stardust Crystal shards into the corked glass apothecary jar. */
  animateCrystalDrop(amount: number): void {
    this.hud.animateCrystalDrop(amount);
  }

  toast(msg: string): void {
    const existing = Array.from(this.toastBox.children).find((el) => el.textContent === msg);
    if (existing) existing.remove();
    const t = h('div', { class: 'cc-toast' }, iconSpan(ICON_STAR, 'cc-ico cc-toast-star'), h('span', {}, msg));
    this.toastBox.append(t);
    while (this.toastBox.children.length > 2) this.toastBox.firstElementChild?.remove();
    boing(t, 'appear');
    setTimeout(() => {
      t.classList.add('is-leaving');
      setTimeout(() => t.remove(), 380);
    }, 2600);
  }

  /** test / lab helper */
  get installVisible(): boolean {
    return this.install.visible;
  }

  destroy(): void {
    this.hud.destroy();
    this.hub.destroy();
    this.input?.destroy();
    this.install.destroy();
    this.rootEl.remove();
    setShown(this.root, true);
  }
}

export function createUi(root: HTMLElement): UiPort {
  return new SketchbookUi(root);
}
