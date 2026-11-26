/**
 * UiPort implementation: Midnight Cloisonne Storybook Frame & Hi-Bit HUD.
 * DOM only; imports nothing outside src/contracts and src/ui.
 * Strictly zero spoken voices, zero inline SVG icon doodles, zero brown trays, zero CDN assets.
 */
import '@fontsource/fraunces/latin-600.css';
import '@fontsource/fraunces/latin-700.css';
import '@fontsource/fraunces/latin-700-italic.css';
import '@fontsource/quicksand/latin-600.css';
import '@fontsource/quicksand/latin-700.css';
import '@fontsource/patrick-hand/latin-400.css';
import '../styles/main.css';
import type { HeroQuestId, StoryMilestoneKind } from '../contracts/art';
import { APP_NAME } from '../contracts/constants';
import type { ChapterId, DraftCardId, RelicId } from '../contracts/roguelike';
import type { AppMode, FinaleMeta, HubState, HudState, UiCallbacks, UiDeps, UiPort } from '../contracts/ui';
import type { UniverseId } from '../contracts/universes';
import type { StorybookSummary } from '../contracts/vault';
import { button, h, setShown, spriteBox } from './dom';
import { HubPanel, computeHubAffordable } from './hub';
import { Hud } from './hud';
import { IllustrationCache, placeholderCanvas } from './illustrations';
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

  // Sprite slots hydrated on mount()
  private readonly bootStarSlots: HTMLElement[] = [];
  private readonly bookPrevIconSlot: HTMLElement;
  private readonly bookNextIconSlot: HTMLElement;
  private readonly bookBackIconSlot: HTMLElement;
  private readonly bookKeepsakeIconSlot: HTMLElement;
  private readonly rotateGuard: HTMLElement;
  private readonly rotateStarSlot: HTMLElement;
  private readonly rotateTurnSlot: HTMLElement;
  private readonly rotateHintEl: HTMLElement;

  private input: PointerInput | null = null;
  private cb: UiCallbacks | null = null;
  private deps: UiDeps | null = null;
  private cache: IllustrationCache | null = null;
  private mode: AppMode = 'boot';
  private hudTitle = APP_NAME;
  private mounted = false;
  private readonly fxTimers = new Set<ReturnType<typeof setTimeout>>();

  private readonly onRootPointerDown = (e: PointerEvent): void => {
    if (e.pointerType === 'touch') this.markTouch();
  };

  private readonly onRootTouchStart = (): void => {
    this.markTouch();
  };

  constructor(root: HTMLElement) {
    this.root = root;
    // Listen for beforeinstallprompt immediately: it can fire before mount().
    this.install = new InstallController(window);
    this.hud = new Hud();
    this.hub = new HubPanel(this.install);
    this.modals = new Modals();

    this.canvasHost = h('div', { class: 'cc-canvas-host', 'aria-label': 'Sketchbook page', role: 'application' });

    const s1 = spriteBox('cc-ico', placeholderCanvas(36, 36));
    const s2 = spriteBox('cc-ico', placeholderCanvas(24, 24));
    const s3 = spriteBox('cc-ico', placeholderCanvas(24, 24));
    this.bootStarSlots.push(s1, s2, s3);
    this.boot = h(
      'div',
      { class: 'cc-boot', role: 'status', 'aria-label': 'Opening the sketchbook' },
      h('span', { class: 'cc-boot-spark' }, s1),
      h('span', { class: 'cc-boot-spark s2' }, s2),
      h('span', { class: 'cc-boot-spark s3' }, s3),
      h('span', { class: 'cc-boot-text' }, 'Opening the sketchbook...'),
    );

    // Celestial Bookshelf viewer controls (Hi-Bit pixel sprites)
    this.bookTitle = h('span', { class: 'cc-bookbar-title' });
    this.bookPage = h('span', { class: 'cc-bookbar-page' });
    this.bookPrevIconSlot = spriteBox('cc-ico', placeholderCanvas(26, 26));
    this.bookNextIconSlot = spriteBox('cc-ico', placeholderCanvas(26, 26));
    this.bookBackIconSlot = spriteBox('cc-ico', placeholderCanvas(24, 24));
    this.bookKeepsakeIconSlot = spriteBox('cc-ico', placeholderCanvas(24, 24));

    this.bookPrev = button(
      'cc-round cc-book-nav cc-book-prev',
      'Previous page',
      () => {
        this.cb?.onUiFoley?.('paperRustle');
        this.cb?.onBookPage(-1);
      },
      this.bookPrevIconSlot,
    );
    this.bookNext = button(
      'cc-round cc-book-nav cc-book-next',
      'Next page',
      () => {
        this.cb?.onUiFoley?.('paperRustle');
        this.cb?.onBookPage(1);
      },
      this.bookNextIconSlot,
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
        h('span', { class: 'cc-chip-inner' }, this.bookBackIconSlot, h('span', {}, 'Shelf')),
      ),
      h('div', { class: 'cc-bookbar-info' }, this.bookTitle, this.bookPage),
      button(
        'cc-chip cc-keepsake',
        'Save Keepsake PNG',
        () => {
          this.cb?.onUiFoley?.('crystalChime');
          this.cb?.onSaveKeepsake();
        },
        h('span', { class: 'cc-chip-inner' }, this.bookKeepsakeIconSlot, h('span', {}, 'Save Keepsake')),
      ),
    );

    this.fxOverlay = h('div', { class: 'cc-fx-overlay', 'aria-hidden': 'true' });
    this.toastBox = h('div', { class: 'cc-toasts', 'aria-live': 'polite', role: 'status' });

    // Phone portrait -> landscape guide overlay (pure CSS + Hi-Bit pixel canvases; zero inline SVG)
    this.rotateStarSlot = spriteBox('cc-ico cc-rotate-star', placeholderCanvas(32, 32));
    this.rotateTurnSlot = spriteBox('cc-ico cc-rotate-turn-ico', placeholderCanvas(24, 24));
    this.rotateHintEl = h(
      'p',
      { class: 'cc-rotate-sub' },
      "Violet's Living Sketchbook opens wide in landscape!",
    );
    const rotateBtn = button(
      'cc-rotate-btn',
      'Switch to Landscape',
      () => void this.tryLandscapeLock(),
      h('span', { class: 'cc-chip-inner' }, this.rotateTurnSlot, h('span', {}, 'Switch to Landscape')),
    );
    this.rotateGuard = h(
      'div',
      {
        class: 'cc-rotate-guard',
        role: 'status',
        'aria-live': 'polite',
        'aria-label': 'Turn your phone sideways to play in landscape',
      },
      h(
        'div',
        { class: 'cc-rotate-card' },
        this.rotateStarSlot,
        h(
          'div',
          { class: 'cc-rotate-stage', 'aria-hidden': 'true' },
          h(
            'div',
            { class: 'cc-rotate-device' },
            h('span', { class: 'cc-rotate-screen' }),
            h('span', { class: 'cc-rotate-pip' }),
          ),
        ),
        h('h2', { class: 'cc-rotate-title' }, 'Turn Your Phone Sideways'),
        this.rotateHintEl,
        rotateBtn,
      ),
    );

    // Midnight-Velvet Stargazer Backdrop with subtle drifting starlight motes & celestial astrolabe ring glow
    const deskDeco = h(
      'div',
      { class: 'cc-desk', 'aria-hidden': 'true' },
      h('span', { class: 'cc-astrolabe-ring' }),
      h('span', { class: 'cc-nebula-glow g1' }),
      h('span', { class: 'cc-nebula-glow g2' }),
      h('span', { class: 'cc-star-mote m1' }),
      h('span', { class: 'cc-star-mote m2' }),
      h('span', { class: 'cc-star-mote m3' }),
      h('span', { class: 'cc-star-mote m4' }),
      h('span', { class: 'cc-star-mote m5' }),
      h('span', { class: 'cc-star-mote m6' }),
      h('span', { class: 'cc-star-mote m7' }),
      h('span', { class: 'cc-star-mote m8' }),
    );

    const stage = h(
      'main',
      { class: 'cc-stage' },
      h('div', { class: 'cc-frame' }, this.canvasHost, this.boot),
    );

    // Crisp Warm-Ivory Cotton Sketchbook Sheet (#faf6ec) with 1px burnished celestial gold (#eac46f) astrolabe corner filigree
    const book = h(
      'div',
      { class: 'cc-book cc-spread' },
      h('div', { class: 'cc-spine', 'aria-hidden': 'true' }),
      h('span', { class: 'cc-corner-filigree tl', 'aria-hidden': 'true' }),
      h('span', { class: 'cc-corner-filigree tr', 'aria-hidden': 'true' }),
      h('span', { class: 'cc-corner-filigree bl', 'aria-hidden': 'true' }),
      h('span', { class: 'cc-corner-filigree br', 'aria-hidden': 'true' }),
      this.hud.voyageSpine,
      this.hub.crestEl,
      this.hub.universeStripEl,
      stage,
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
      this.hud.cornerRight,
      this.hud.relicStrip,
      this.hud.questRail,
      this.hud.autoTurnRibbon,
      this.hud.dock,
      this.hub.stationsEl,
      this.hub.drawerLayer,
      this.modals.layer,
      this.fxOverlay,
      this.toastBox,
      this.rotateGuard,
    );

    const hasCoarseTouch =
      typeof window !== 'undefined' &&
      typeof window.matchMedia === 'function' &&
      window.matchMedia('(pointer: coarse)').matches;
    if (hasCoarseTouch) this.markTouch();

    this.rootEl.addEventListener('pointerdown', this.onRootPointerDown, { capture: true, passive: true });
    this.rootEl.addEventListener('touchstart', this.onRootTouchStart, { capture: true, passive: true });

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
    this.hydrateShellSprites(this.cache);
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
      swipe: (dir) => {
        if (this.mode !== 'book') return;
        if ((dir < 0 && this.bookPrev.disabled) || (dir > 0 && this.bookNext.disabled)) return;
        this.cb?.onUiFoley?.('paperRustle');
        this.cb?.onBookPage(dir);
      },
      swipeEnabled: () => this.mode === 'book' && !this.modals.isOpen,
      touchSensed: () => this.markTouch(),
    });
    this.mounted = true;
    this.applyMode(this.mode, true);
  }

  private markTouch(): void {
    if (this.rootEl.dataset.touch !== 'true') {
      this.rootEl.dataset.touch = 'true';
    }
  }

  private async tryLandscapeLock(): Promise<void> {
    this.cb?.onUiFoley?.('crystalChime');
    try {
      const docEl = document.documentElement as HTMLElement & {
        requestFullscreen?: () => Promise<void>;
      };
      if (!document.fullscreenElement && typeof docEl.requestFullscreen === 'function') {
        await docEl.requestFullscreen().catch(() => undefined);
      }
      const orient = window.screen?.orientation as { lock?: (mode: string) => Promise<void> } | undefined;
      if (typeof orient?.lock === 'function') {
        await orient.lock('landscape');
        return;
      }
    } catch {
      /* iOS Safari or non-fullscreen browsers may disallow orientation.lock */
    }
    this.rotateHintEl.textContent = 'Rotate your phone sideways to begin coloring!';
  }

  private hydrateShellSprites(cache: IllustrationCache): void {
    this.bootStarSlots.forEach((slot, i) => {
      const sz = i === 0 ? 36 : 24;
      cache.mountInto(slot, { type: 'uiSprite', id: 'tool_star' }, sz, sz);
    });
    cache.mountInto(this.bookPrevIconSlot, { type: 'uiSprite', id: 'tool_prev' }, 26, 26);
    cache.mountInto(this.bookNextIconSlot, { type: 'uiSprite', id: 'tool_next' }, 26, 26);
    cache.mountInto(this.bookBackIconSlot, { type: 'uiSprite', id: 'tool_back' }, 24, 24);
    cache.mountInto(this.bookKeepsakeIconSlot, { type: 'uiSprite', id: 'tool_postcard' }, 24, 24);
    cache.mountInto(this.rotateStarSlot, { type: 'uiSprite', id: 'tool_star' }, 32, 32);
    cache.mountInto(this.rotateTurnSlot, { type: 'uiSprite', id: 'tool_turn' }, 24, 24);
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
      boing(this.hub.universeStripEl, 'appear');
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
    this.hud.setAffordable(computeHubAffordable(s).any);
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

  showFinale(name: string, meta?: FinaleMeta): Promise<UniverseId | null | void> {
    this.input?.abort();
    return this.modals.showFinale(name, () => this.cb?.onFinaleDone(), meta);
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

  /** Fires a golden starlight particle arc from an awakened page coordinate into its Right-Margin Story Medallion. */
  animateStarThread(milestoneId: StoryMilestoneKind, fromClientX: number, fromClientY: number): void {
    const dest = this.hud.getMedallionCenter(milestoneId);
    const vw = Math.max(320, typeof window !== 'undefined' ? window.innerWidth || 1366 : 1366);
    const vh = Math.max(200, typeof window !== 'undefined' ? window.innerHeight || 768 : 768);
    const x1 = Number.isFinite(fromClientX) ? fromClientX : vw / 2;
    const y1 = Number.isFinite(fromClientY) ? fromClientY : vh / 2;
    const x2 = dest.x;
    const y2 = dest.y;

    this.spawnBezierParticleArc('cc-star-thread', { 'data-milestone': milestoneId, 'data-quest': milestoneId }, x1, y1, x2, y2);

    const arriveMs = prefersReducedMotion() ? 0 : 440;
    if (arriveMs === 0) this.hud.pulseMedallion(milestoneId);
    else this.scheduleFx(() => this.hud.pulseMedallion(milestoneId), arriveMs);
  }

  /** Fires a sparkling Firefly Hint Wisp arc from the Right-Margin Story Medallion / Lantern onto the target canvas coordinate. */
  animateHintBeam(questId: HeroQuestId, toClientX: number, toClientY: number): void {
    const origin = this.hud.getMedallionCenter(questId);
    const vw = Math.max(320, typeof window !== 'undefined' ? window.innerWidth || 1366 : 1366);
    const vh = Math.max(200, typeof window !== 'undefined' ? window.innerHeight || 768 : 768);
    const x1 = origin.x;
    const y1 = origin.y;
    const x2 = Number.isFinite(toClientX) ? toClientX : vw / 2;
    const y2 = Number.isFinite(toClientY) ? toClientY : vh / 2;

    this.hud.flashHintOrigin(questId);
    this.spawnBezierParticleArc('cc-hint-beam', { 'data-quest': questId }, x1, y1, x2, y2);
  }

  /** Pulses a Left-Margin Relic Charm with gold sparkles and a <=2-word whisper tag when it triggers. */
  animateRelicPulse(relic: RelicId, tag?: string): void {
    this.hud.pulseRelic(relic, tag);
  }

  /** Drops glowing faceted Prism Stardust Crystal sparks into the Top-Left Crystal Pill. */
  animateCrystalDrop(amount: number): void {
    this.hud.animateCrystalDrop(amount);
  }

  private spawnBezierParticleArc(
    cls: string,
    attrs: Record<string, string>,
    x1: number,
    y1: number,
    x2: number,
    y2: number,
  ): void {
    const ctrlX = (x1 + x2) / 2;
    const ctrlY = Math.min(y1, y2) - Math.max(46, Math.abs(x2 - x1) * 0.18);
    const steps = 12;
    const wrap = h('div', { class: cls, ...attrs });

    for (let i = 0; i <= steps; i++) {
      const t = i / steps;
      const omt = 1 - t;
      const px = omt * omt * x1 + 2 * omt * t * ctrlX + t * t * x2;
      const py = omt * omt * y1 + 2 * omt * t * ctrlY + t * t * y2;
      const mote = h('span', { class: 'cc-arc-mote' });
      mote.style.left = `${px.toFixed(1)}px`;
      mote.style.top = `${py.toFixed(1)}px`;
      mote.style.setProperty('--delay', `${Math.round(t * 360)}ms`);
      mote.style.setProperty('--scale', (0.65 + Math.sin(t * Math.PI) * 0.65).toFixed(2));
      wrap.append(mote);
    }

    const burst = h('span', { class: 'cc-arc-burst' });
    burst.style.left = `${x2.toFixed(1)}px`;
    burst.style.top = `${y2.toFixed(1)}px`;
    wrap.append(burst);

    this.fxOverlay.append(wrap);
    const removeMs = prefersReducedMotion() ? 320 : 940;
    this.scheduleFx(() => wrap.remove(), removeMs);
  }

  private scheduleFx(fn: () => void, ms: number): void {
    const id = setTimeout(() => {
      this.fxTimers.delete(id);
      fn();
    }, ms);
    this.fxTimers.add(id);
  }

  private toastLeaveTimer: ReturnType<typeof setTimeout> | null = null;
  private toastRemoveTimer: ReturnType<typeof setTimeout> | null = null;

  toast(msg: string): void {
    if (this.toastLeaveTimer) {
      clearTimeout(this.toastLeaveTimer);
      this.toastLeaveTimer = null;
    }
    if (this.toastRemoveTimer) {
      clearTimeout(this.toastRemoveTimer);
      this.toastRemoveTimer = null;
    }
    while (this.toastBox.firstElementChild) {
      this.toastBox.firstElementChild.remove();
    }
    const starCanvas = this.cache ? this.cache.sprite('tool_star', 18) : placeholderCanvas(18, 18);
    const t = h(
      'div',
      { class: 'cc-toast' },
      spriteBox('cc-ico cc-toast-star', starCanvas),
      h('span', { class: 'cc-toast-msg' }, msg),
    );
    this.toastBox.append(t);
    boing(t, 'appear');
    this.toastLeaveTimer = setTimeout(() => {
      t.classList.add('is-leaving');
      this.toastLeaveTimer = null;
      this.toastRemoveTimer = setTimeout(() => {
        t.remove();
        this.toastRemoveTimer = null;
      }, 360);
    }, 2600);
  }

  /** test / lab helper */
  get installVisible(): boolean {
    return this.install.visible;
  }

  destroy(): void {
    if (this.toastLeaveTimer) clearTimeout(this.toastLeaveTimer);
    if (this.toastRemoveTimer) clearTimeout(this.toastRemoveTimer);
    for (const id of this.fxTimers) clearTimeout(id);
    this.fxTimers.clear();
    this.hud.destroy();
    this.hub.destroy();
    this.input?.destroy();
    this.install.destroy();
    this.rootEl.removeEventListener('pointerdown', this.onRootPointerDown, { capture: true });
    this.rootEl.removeEventListener('touchstart', this.onRootTouchStart, { capture: true });
    this.rootEl.remove();
    setShown(this.root, true);
  }
}

export function createUi(root: HTMLElement): UiPort {
  return new SketchbookUi(root);
}
