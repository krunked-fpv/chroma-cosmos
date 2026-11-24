/**
 * UiPort implementation: the enchanted sketchbook chrome around the renderer canvas.
 * DOM only; imports nothing outside src/contracts and src/ui.
 */
import '../styles/main.css';
import { APP_NAME } from '../contracts/constants';
import type { ChapterId, DraftCardId } from '../contracts/roguelike';
import type { AppMode, HubState, HudState, UiCallbacks, UiDeps, UiPort } from '../contracts/ui';
import type { StorybookSummary } from '../contracts/vault';
import { button, h, iconSpan, setShown } from './dom';
import { HubPanel } from './hub';
import { Hud } from './hud';
import { ICON_BACK, ICON_NEXT, ICON_POSTCARD, ICON_PREV, ICON_STAR } from './icons';
import { IllustrationCache } from './illustrations';
import { PointerInput } from './input';
import { InstallController } from './install';
import { Modals } from './modals';
import { boing } from './spring';

export { PointerInput } from './input';
export { InstallController, isStandalone } from './install';

const HUB_TITLE = "Violet's Stargazer Bedroom";
const INPUT_MODES: ReadonlySet<AppMode> = new Set<AppMode>(['chapter', 'hub', 'book']);

class SketchbookUi implements UiPort {
  readonly canvasHost: HTMLElement;
  readonly rootEl: HTMLElement;
  private readonly root: HTMLElement;
  private readonly install: InstallController;
  private readonly hud: Hud;
  private readonly hub: HubPanel;
  private readonly modals: Modals;
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
    // Listen for the install prompt immediately: it can fire before mount().
    this.install = new InstallController(window);
    this.hud = new Hud(this.install);
    this.hub = new HubPanel();
    this.modals = new Modals();

    this.canvasHost = h('div', { class: 'cc-canvas-host', 'aria-label': 'Sketchbook page', role: 'application' });
    this.boot = h('div', { class: 'cc-boot', role: 'status', 'aria-label': 'Opening the sketchbook' },
      h('span', { class: 'cc-boot-spark' }, iconSpan(ICON_STAR)),
      h('span', { class: 'cc-boot-spark s2' }, iconSpan(ICON_STAR)),
      h('span', { class: 'cc-boot-spark s3' }, iconSpan(ICON_STAR)),
      h('span', { class: 'cc-boot-text' }, 'Opening the sketchbook...'));

    // Book viewer controls
    this.bookTitle = h('span', { class: 'cc-bookbar-title' });
    this.bookPage = h('span', { class: 'cc-bookbar-page' });
    this.bookPrev = button('cc-round cc-book-nav cc-book-prev', 'Previous page', () => this.cb?.onBookPage(-1), iconSpan(ICON_PREV));
    this.bookNext = button('cc-round cc-book-nav cc-book-next', 'Next page', () => this.cb?.onBookPage(1), iconSpan(ICON_NEXT));
    this.bookBar = h('div', { class: 'cc-bookbar' },
      button('cc-chip cc-book-back', 'Back to the bookshelf', () => this.cb?.onCloseBook(),
        h('span', { class: 'cc-chip-inner' }, iconSpan(ICON_BACK), h('span', {}, 'Shelf'))),
      h('div', { class: 'cc-bookbar-info' }, this.bookTitle, this.bookPage),
      button('cc-chip cc-keepsake', 'Save Keepsake PNG', () => this.cb?.onSaveKeepsake(),
        h('span', { class: 'cc-chip-inner' }, iconSpan(ICON_POSTCARD), h('span', {}, 'Save Keepsake'))));

    this.toastBox = h('div', { class: 'cc-toasts', 'aria-live': 'polite', role: 'status' });

    const deskDeco = h('div', { class: 'cc-desk', 'aria-hidden': 'true' },
      h('span', { class: 'cc-lamp' }),
      h('span', { class: 'cc-crayon k1' }), h('span', { class: 'cc-crayon k2' }), h('span', { class: 'cc-crayon k3' }),
      h('span', { class: 'cc-desk-star d1' }), h('span', { class: 'cc-desk-star d2' }), h('span', { class: 'cc-desk-star d3' }),
      h('span', { class: 'cc-desk-star d4' }), h('span', { class: 'cc-desk-star d5' }));

    const stage = h('main', { class: 'cc-stage' },
      h('div', { class: 'cc-frame' }, this.canvasHost, this.boot));

    const book = h('div', { class: 'cc-book' },
      h('div', { class: 'cc-spiral', 'aria-hidden': 'true' }),
      h('div', { class: 'cc-curl', 'aria-hidden': 'true' }),
      this.hud.top,
      stage,
      this.hud.railLeft,
      this.hud.railRight,
      this.hud.dock,
      this.hub.el,
      this.bookPrev,
      this.bookNext,
      this.bookBar);

    this.rootEl = h('div', { class: 'cc-root', 'data-mode': 'boot' }, deskDeco, book, this.modals.layer, this.toastBox);
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
    this.modals.bind(this.cache);
    this.input?.destroy();
    this.input = new PointerInput(this.canvasHost, {
      toInternal: (x, y) => this.deps?.clientToInternal(x, y) ?? null,
      gesture: (e) => this.cb?.onGesture(e),
      hover: (p) => this.cb?.onHover(p),
      enabled: () => INPUT_MODES.has(this.mode) && !this.modals.isOpen,
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
    if (!INPUT_MODES.has(m)) {
      this.input?.abort();
      this.cb?.onHover(null);
    }
    if (m === 'hub') this.hud.setTitle(HUB_TITLE);
    else if (m === 'boot') this.hud.setTitle(APP_NAME);
    else this.hud.setTitle(this.hudTitle);
    if (m === 'chapter' && (force || prev !== 'chapter')) this.hud.appear();
    if (m === 'hub' && prev !== 'hub') boing(this.hub.el, 'appear');
  }

  updateHud(s: HudState): void {
    this.hudTitle = s.chapterTitle || APP_NAME;
    this.hud.update(s);
    if (this.mode === 'hub') this.hud.setTitle(HUB_TITLE);
    else if (this.mode === 'boot') this.hud.setTitle(APP_NAME);
  }

  updateHub(s: HubState): void {
    this.hub.update(s);
    this.hud.setGems(s.gems);
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

  toast(msg: string): void {
    const t = h('div', { class: 'cc-toast' }, iconSpan(ICON_STAR, 'cc-ico cc-toast-star'), h('span', {}, msg));
    this.toastBox.append(t);
    while (this.toastBox.children.length > 3) this.toastBox.firstElementChild?.remove();
    boing(t, 'appear');
    setTimeout(() => {
      t.classList.add('is-leaving');
      setTimeout(() => t.remove(), 400);
    }, 2800);
  }

  /** test / lab helper */
  get installVisible(): boolean {
    return this.install.visible;
  }

  destroy(): void {
    this.input?.destroy();
    this.install.destroy();
    this.rootEl.remove();
    setShown(this.root, true);
  }
}

export function createUi(root: HTMLElement): UiPort {
  return new SketchbookUi(root);
}
