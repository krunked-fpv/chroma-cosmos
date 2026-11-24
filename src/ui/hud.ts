/**
 * Wanderlings Chapter HUD:
 * - Top Stitched Linen Ribbon Bookmark with 3..5 embroidered Story Star Sockets + handwritten chapter title
 * - Top-Left Corked Glass Apothecary Jar filled with faceted Prism Stardust Crystals (tap returns to Hub)
 * - Top-Right quiet Brass Bell Audio Charm + drafted Relic wax-charms
 * - Diegetic Parchment Dog-Ear Page Curls (glowing bottom-right on pageComplete; subtle unlit top-right early turn)
 * - Bottom Carved Cedar Wooden Pencil & Paintbox Groove (Enchanted Pencil, drafted brush notches, Starlight Wand, sculpted mediums, <=4-word auto-fading whisper micro-tag)
 */
import type { StoryMilestoneKind } from '../contracts/art';
import type { AudioLevel } from '../contracts/audio';
import { TOOL_TAG_DURATION_MS } from '../contracts/constants';
import type { MaterialId } from '../contracts/materials';
import type { BrushId, RelicId } from '../contracts/roguelike';
import { DRAFT_CARDS } from '../contracts/roguelike';
import type { StoryStarState, ToolMode } from '../contracts/simulation';
import type { AppMode, HudState, MaterialEntry, UiCallbacks } from '../contracts/ui';
import { button, clear, frag, h, iconSpan, setShown } from './dom';
import {
  AUDIO_LABEL,
  BRUSH_ICONS,
  BRUSH_NAMES,
  BRUSH_TAGS,
  DOG_EAR_EARLY_SVG,
  DOG_EAR_NEXT_SVG,
  ICON_ENCHANTED_PENCIL,
  ICON_STAR,
  ICON_STARLIGHT_WAND,
  audioIcon,
  crystalJarSvg,
  storyStarSocketSvg,
} from './icons';
import type { IllustrationCache } from './illustrations';
import { boing } from './spring';

export const SWATCH_PX = 32;
export const STICKER_PX = 32;

const FALLBACK_MILESTONES: ReadonlyArray<{ id: StoryMilestoneKind; label: string }> = [
  { id: 'violet', label: 'Violet' },
  { id: 'lumi', label: 'Lumi' },
  { id: 'nova', label: 'Nova' },
  { id: 'planet', label: 'Ringed Planet' },
  { id: 'cloud', label: 'Space Clouds' },
];

const DROP_COLORS = ['#7fe7f0', '#ff9ecf', '#ffd43b', '#b69cff', '#b5f2d0', '#ffa94d'] as const;

/** Clamp any whisper micro-tag text strictly to <= 4 words. */
export function clampWhisperTag(text: string): string {
  const words = text.trim().split(/\s+/).filter(Boolean);
  return words.slice(0, 4).join(' ');
}

/** Derive 3..5 fallback Story Star Sockets when a caller omits `hud.storyStars`. */
function synthesizeStoryStars(awake: number, total: number): StoryStarState[] {
  const count = total <= 0 ? 3 : total <= 6 ? 3 : total <= 9 ? 4 : 5;
  const ratio = total > 0 ? Math.max(0, Math.min(1, awake / total)) : 0;
  const litExact = ratio * count;
  return FALLBACK_MILESTONES.slice(0, count).map((m, idx) => {
    const lit = litExact >= idx + 1 - 1e-6;
    const progress = lit ? 1 : Math.max(0, Math.min(1, litExact - idx));
    return { id: m.id, kind: m.id, label: m.label, lit, progress, regionIds: [], x: 240, y: 135 };
  });
}

export class Hud {
  readonly bookmark: HTMLElement;
  readonly crystalJar: HTMLButtonElement;
  readonly cornerRight: HTMLElement;
  readonly dogEarNext: HTMLButtonElement;
  readonly dogEarEarly: HTMLButtonElement;
  readonly dock: HTMLElement;

  private readonly bookmarkTitle: HTMLElement;
  private readonly socketRow: HTMLElement;
  private readonly jarArt: HTMLElement;
  private readonly jarDropHost: HTMLElement;
  private readonly gemsText: HTMLElement;
  private readonly relicsBox: HTMLElement;
  private readonly audioBtn: HTMLButtonElement;

  private readonly toolTagEl: HTMLElement;
  private readonly toolTagText: HTMLElement;
  private readonly pencilBtn: HTMLButtonElement;
  private readonly wandBtn: HTMLButtonElement;
  private readonly brushGroup: HTMLElement;
  private readonly swatchRow: HTMLElement;

  private readonly socketEls = new Map<StoryMilestoneKind, HTMLButtonElement>();
  private readonly socketData = new Map<StoryMilestoneKind, StoryStarState>();
  private readonly swatchEls = new Map<MaterialId, HTMLButtonElement>();
  private readonly brushEls = new Map<BrushId, HTMLButtonElement>();

  private last: HudState | null = null;
  private sig = { materials: '__init__', brushes: '__init__', relics: '__init__', stars: '__init__' };
  private cache: IllustrationCache | null = null;
  private cb: UiCallbacks | null = null;
  private title = '';
  private appMode: AppMode = 'boot';
  private lastGems = -1;
  private audioLevel: AudioLevel = 3;
  private tagFadeTimer: ReturnType<typeof setTimeout> | null = null;
  private tagHideTimer: ReturnType<typeof setTimeout> | null = null;
  private jarClinkTimer: ReturnType<typeof setTimeout> | null = null;

  constructor() {
    // ---- Top Stitched Linen Ribbon Bookmark (Story Star Sockets + chapter title)
    this.socketRow = h('div', { class: 'cc-story-sockets', role: 'group', 'aria-label': 'Story Star Sockets' });
    this.bookmarkTitle = h('span', { class: 'cc-bookmark-title' });
    this.bookmark = h(
      'header',
      { class: 'cc-bookmark', 'aria-label': 'Storybook Bookmark' },
      h('div', { class: 'cc-bookmark-ribbon' }, this.socketRow, this.bookmarkTitle),
    );

    // ---- Top-Left Corked Glass Apothecary Jar (Prism Stardust Crystals; tap returns to Hub)
    this.jarArt = h('span', { class: 'cc-jar-art', 'aria-hidden': 'true' });
    this.jarArt.append(frag(crystalJarSvg(0)));
    this.jarDropHost = h('span', { class: 'cc-jar-drops', 'aria-hidden': 'true' });
    this.gemsText = h('span', { class: 'cc-gems-n', 'aria-live': 'polite' }, '0');
    const jarTag = h('span', { class: 'cc-jar-tag' }, this.gemsText);
    this.crystalJar = button(
      'cc-crystal-jar',
      'Prism Stardust Crystals',
      () => this.onJarTap(),
      h('span', { class: 'cc-jar-inner' }, this.jarDropHost, this.jarArt, jarTag),
    );
    this.crystalJar.dataset.gems = '0';

    // ---- Top-Right Corner Cluster: Relic Wax-Charms + Quiet Brass Bell Audio Charm
    this.relicsBox = h('div', { class: 'cc-relics', 'aria-label': 'Relic wax charms' });
    this.audioBtn = button('cc-round cc-audio', AUDIO_LABEL[3], () => {
      boing(this.audioBtn, 'press');
      this.cb?.onUiFoley?.('woodTap');
      this.cb?.onAudioCycle();
    });
    this.audioBtn.dataset.level = '3';
    this.audioBtn.append(iconSpan(audioIcon(3)));
    this.cornerRight = h('div', { class: 'cc-corner-right' }, this.relicsBox, this.audioBtn);

    // ---- Diegetic Dog-Ear Page-Curl Navigation (ZERO "Next Page" / "Turn early" text labels!)
    let nextSwiped = false;
    let pullStartX = 0;
    let pullPointerId: number | null = null;
    const triggerNextPage = (): void => {
      boing(this.dogEarNext, 'press');
      this.cb?.onUiFoley?.('paperRustle');
      this.cb?.onTurnPage(false);
    };

    this.dogEarNext = button(
      'cc-dogear cc-dogear-next',
      'Turn to the next page',
      () => {
        if (nextSwiped) {
          nextSwiped = false;
          return;
        }
        triggerNextPage();
      },
      iconSpan(DOG_EAR_NEXT_SVG, 'cc-dogear-svg'),
    );
    this.dogEarNext.dataset.action = 'turn-next';
    setShown(this.dogEarNext, false);

    // Support both tap AND inward-left drag/swipe (> 28px) on the curled bottom-right dog-ear
    this.dogEarNext.addEventListener('pointerdown', (e) => {
      if (this.dogEarNext.hidden) return;
      nextSwiped = false;
      pullStartX = e.clientX;
      pullPointerId = e.pointerId;
      this.dogEarNext.classList.add('is-pulling');
      try {
        if (typeof this.dogEarNext.setPointerCapture === 'function') {
          this.dogEarNext.setPointerCapture(e.pointerId);
        }
      } catch {
        /* ignore synthetic pointer capture errors */
      }
    });
    this.dogEarNext.addEventListener('pointermove', (e) => {
      if (pullPointerId === null || e.pointerId !== pullPointerId || nextSwiped) return;
      const dx = pullStartX - e.clientX;
      const pull = Math.max(0, Math.min(1, dx / 44));
      this.dogEarNext.style.setProperty('--curl-pull', pull.toFixed(3));
      if (dx > 28) {
        nextSwiped = true;
        pullPointerId = null;
        this.dogEarNext.classList.remove('is-pulling');
        this.dogEarNext.style.setProperty('--curl-pull', '0');
        triggerNextPage();
      }
    });
    const endPull = (e: PointerEvent): void => {
      if (pullPointerId === null || e.pointerId !== pullPointerId) return;
      pullPointerId = null;
      this.dogEarNext.classList.remove('is-pulling');
      this.dogEarNext.style.setProperty('--curl-pull', '0');
    };
    this.dogEarNext.addEventListener('pointerup', endPull);
    this.dogEarNext.addEventListener('pointercancel', endPull);

    this.dogEarEarly = button(
      'cc-dogear cc-dogear-early',
      'Turn page early',
      () => {
        boing(this.dogEarEarly, 'press');
        this.cb?.onUiFoley?.('paperRustle');
        this.cb?.onTurnPage(true);
      },
      iconSpan(DOG_EAR_EARLY_SVG, 'cc-dogear-svg'),
    );
    this.dogEarEarly.dataset.action = 'turn-early';

    // ---- Bottom Carved Cedar Wooden Pencil & Paintbox Groove
    this.toolTagText = h('span', { class: 'cc-tool-tag-text' });
    this.toolTagEl = h(
      'div',
      { class: 'cc-tool-tag', role: 'status', 'aria-live': 'polite', hidden: true },
      iconSpan(ICON_STAR, 'cc-ico cc-tool-tag-glyph'),
      this.toolTagText,
    );

    this.pencilBtn = button(
      'cc-wood-tool cc-tool-pencil',
      'The Enchanted Pencil',
      () => this.selectToolMode('pencil'),
      iconSpan(ICON_ENCHANTED_PENCIL, 'cc-ico cc-wood-ico'),
    );
    this.pencilBtn.dataset.tool = 'pencil';
    this.pencilBtn.setAttribute('aria-pressed', 'true');

    this.brushGroup = h('div', { class: 'cc-brush-group', role: 'radiogroup', 'aria-label': 'Special Brush Tips', hidden: true });

    this.wandBtn = button(
      'cc-wood-tool cc-tool-wand',
      'The Starlight Wand',
      () => this.selectToolMode('wand'),
      iconSpan(ICON_STARLIGHT_WAND, 'cc-ico cc-wood-ico'),
    );
    this.wandBtn.dataset.tool = 'wand';
    this.wandBtn.setAttribute('aria-pressed', 'false');

    this.swatchRow = h('div', { class: 'cc-swatches', role: 'radiogroup', 'aria-label': 'Magic Mediums' });

    const groove = h(
      'div',
      { class: 'cc-wood-groove' },
      h('div', { class: 'cc-tools-cluster' }, this.pencilBtn, this.brushGroup, this.wandBtn),
      h('span', { class: 'cc-groove-sep', 'aria-hidden': 'true' }),
      this.swatchRow,
    );

    this.dock = h('nav', { class: 'cc-dock cc-wood-dock', 'aria-label': 'Carved Cedar Tool Groove' }, this.toolTagEl, groove);
  }

  bind(cb: UiCallbacks, cache: IllustrationCache): void {
    this.cb = cb;
    this.cache = cache;
    if (this.last) {
      const l = this.last;
      this.last = null;
      this.sig = { materials: '__init__', brushes: '__init__', relics: '__init__', stars: '__init__' };
      this.update(l);
    }
  }

  setMode(mode: AppMode): void {
    this.appMode = mode;
    const label =
      mode === 'chapter'
        ? "Prism Stardust Crystals — tap to return to Violet's Desk"
        : 'Prism Stardust Crystals';
    this.crystalJar.setAttribute('aria-label', label);
    this.crystalJar.title = label;
    if (mode !== 'chapter') this.hideToolTag();
  }

  setTitle(t: string): void {
    if (t === this.title) return;
    this.title = t;
    this.bookmarkTitle.textContent = t;
  }

  setGems(n: number): void {
    const safe = Math.max(0, Math.floor(n));
    const s = String(safe);
    if (this.gemsText.textContent !== s) {
      const up = this.lastGems >= 0 && safe > this.lastGems;
      this.gemsText.textContent = s;
      this.crystalJar.dataset.gems = s;
      clear(this.jarArt);
      this.jarArt.append(frag(crystalJarSvg(safe)));
      if (up) boing(this.crystalJar, 'press');
    }
    this.lastGems = safe;
  }

  setAudio(level: AudioLevel): void {
    if (this.audioLevel === level && this.audioBtn.dataset.level === String(level)) return;
    this.audioLevel = level;
    this.audioBtn.dataset.level = String(level);
    this.audioBtn.setAttribute('aria-label', AUDIO_LABEL[level]);
    this.audioBtn.title = AUDIO_LABEL[level];
    clear(this.audioBtn);
    this.audioBtn.append(iconSpan(audioIcon(level)));
  }

  /** Re-staggered spring entrance when entering Chapter mode. */
  appear(): void {
    let i = 0;
    const items: HTMLElement[] = [
      this.pencilBtn,
      ...this.brushEls.values(),
      this.wandBtn,
      ...this.swatchEls.values(),
    ];
    for (const el of items) boing(el, 'appear', 24 * i++);
  }

  /** Show the <=4-word whisper parchment micro-tag above the cedar groove and auto-fade after TOOL_TAG_DURATION_MS. */
  showToolTag(rawText: string): void {
    const text = clampWhisperTag(rawText);
    if (!text) return;
    this.clearTagTimers();
    this.toolTagText.textContent = text;
    this.toolTagEl.classList.remove('is-fading');
    setShown(this.toolTagEl, true);
    this.toolTagEl.classList.add('is-visible');
    boing(this.toolTagEl, 'appear');

    const fadeAt = Math.max(0, TOOL_TAG_DURATION_MS - 280);
    this.tagFadeTimer = setTimeout(() => {
      this.toolTagEl.classList.add('is-fading');
    }, fadeAt);
    this.tagHideTimer = setTimeout(() => {
      this.toolTagEl.classList.remove('is-visible', 'is-fading');
      setShown(this.toolTagEl, false);
    }, TOOL_TAG_DURATION_MS);
  }

  hideToolTag(): void {
    this.clearTagTimers();
    this.toolTagEl.classList.remove('is-visible', 'is-fading');
    setShown(this.toolTagEl, false);
  }

  /** Returns the viewport center of a Bookmark Story Star Socket (for `animateStarThread`). */
  getSocketCenter(milestoneId: StoryMilestoneKind): { x: number; y: number; el: HTMLElement | null } {
    const target =
      this.socketEls.get(milestoneId) ??
      [...this.socketEls.values()][0] ??
      this.bookmark;
    const r = target.getBoundingClientRect();
    if (r.width > 0 && r.height > 0) {
      return { x: r.left + r.width / 2, y: r.top + r.height / 2, el: target };
    }
    const vw = typeof window !== 'undefined' ? window.innerWidth || 1280 : 1280;
    return { x: vw / 2, y: 34, el: target };
  }

  /** Pulse a Story Star Socket when its golden starlight thread arrives. */
  pulseSocket(milestoneId: StoryMilestoneKind): void {
    const el = this.socketEls.get(milestoneId);
    if (!el) return;
    el.classList.remove('is-star-burst');
    void el.offsetWidth;
    el.classList.add('is-star-burst');
    boing(el, 'select');
    setTimeout(() => el.classList.remove('is-star-burst'), 850);
  }

  /** Drop glowing faceted Prism Stardust Crystal shards into the corked glass apothecary jar. */
  animateCrystalDrop(amount: number): void {
    const count = Math.max(1, Math.min(6, Math.round(amount || 1)));
    this.crystalJar.classList.remove('is-clinking');
    void this.crystalJar.offsetWidth;
    this.crystalJar.classList.add('is-clinking');
    boing(this.crystalJar, 'press');

    if (this.jarClinkTimer) clearTimeout(this.jarClinkTimer);
    this.jarClinkTimer = setTimeout(() => {
      this.crystalJar.classList.remove('is-clinking');
      this.jarClinkTimer = null;
    }, 760);

    for (let i = 0; i < count; i++) {
      const color = DROP_COLORS[i % DROP_COLORS.length]!;
      const shard = h('span', { class: 'cc-crystal-drop', 'data-drop': String(i) });
      shard.style.setProperty('--dx', `${((i - (count - 1) / 2) * 7).toFixed(1)}px`);
      shard.style.setProperty('--delay', `${i * 75}ms`);
      shard.style.setProperty('--c', color);
      shard.append(
        frag(
          `<svg viewBox="0 0 14 14" xmlns="http://www.w3.org/2000/svg"><polygon points="7,1 12,6 7,13 2,6" fill="${color}" stroke="#231942" stroke-width="1.3"/></svg>`,
        ),
      );
      this.jarDropHost.append(shard);
      setTimeout(() => shard.remove(), 750 + i * 75);
    }
  }

  update(s: HudState): void {
    const prev = this.last;
    this.last = s;
    this.setTitle(s.chapterTitle);
    this.setGems(s.gems);
    this.setAudio(s.audioLevel);
    if (!this.cache) return;

    // Effective tool mode ('pencil' | 'wand')
    const toolMode: ToolMode = s.toolMode ?? (s.doodle ? 'wand' : 'pencil');
    const isPencil = toolMode === 'pencil';
    const isWand = toolMode === 'wand';
    this.pencilBtn.classList.toggle('is-on', isPencil);
    this.pencilBtn.setAttribute('aria-pressed', String(isPencil));
    this.pencilBtn.classList.toggle('is-wisp-cue', Boolean(s.wispPencilCue));

    this.wandBtn.classList.toggle('is-on', isWand);
    this.wandBtn.setAttribute('aria-pressed', String(isWand));

    // Unlocked mediums only (hidden if locked)
    const unlocked = s.materials.filter((m) => m.unlocked);
    const msig = unlocked.map((m) => m.def.id).join(',');
    if (msig !== this.sig.materials) {
      this.sig.materials = msig;
      this.buildSwatches(unlocked);
    }
    if (this.swatchRow.dataset.sel !== String(s.selectedMaterial)) {
      this.swatchRow.dataset.sel = String(s.selectedMaterial);
      for (const [id, el] of this.swatchEls) {
        const on = id === s.selectedMaterial;
        el.setAttribute('aria-checked', String(on));
        el.classList.toggle('is-on', on);
      }
    }

    // Drafted special brush tips (compact notches right beside Pencil in the SAME wooden groove)
    const showBrushes = s.brushes.length > 1;
    setShown(this.brushGroup, showBrushes);
    const bsig = s.brushes.join(',');
    if (bsig !== this.sig.brushes) {
      this.sig.brushes = bsig;
      this.buildBrushes(s.brushes);
      this.brushGroup.dataset.sel = '';
    }
    if (this.brushGroup.dataset.sel !== s.selectedBrush) {
      this.brushGroup.dataset.sel = s.selectedBrush;
      for (const [id, el] of this.brushEls) {
        const on = isPencil && id === s.selectedBrush;
        el.setAttribute('aria-checked', String(on));
        el.classList.toggle('is-on', on);
      }
    } else {
      for (const [id, el] of this.brushEls) {
        const on = isPencil && id === s.selectedBrush;
        el.setAttribute('aria-checked', String(on));
        el.classList.toggle('is-on', on);
      }
    }

    // Relic wax-charms (top-right brass clasp)
    const rsig = s.relics.join(',');
    if (rsig !== this.sig.relics) {
      const prevSet = new Set(this.sig.relics.split(',').filter(Boolean));
      const fresh = s.relics.filter((r) => !prevSet.has(r));
      this.sig.relics = rsig;
      this.buildRelics(s.relics, prev ? fresh : []);
    }

    // Bookmark Story Star Sockets (3..5 embroidered stars)
    const stars = s.storyStars && s.storyStars.length > 0
      ? s.storyStars
      : synthesizeStoryStars(s.coreAwake, s.coreTotal);
    const ssig = stars.map((st) => `${st.id}:${st.lit ? 1 : 0}:${Math.round(st.progress * 10)}`).join('|');
    if (ssig !== this.sig.stars) {
      this.sig.stars = ssig;
      this.buildStoryStars(stars);
    }

    // Diegetic parchment dog-ear corners (glowing bottom-right on pageComplete vs subtle unlit top-right)
    if (!prev || prev.pageComplete !== s.pageComplete || this.dogEarNext.hidden === s.pageComplete) {
      setShown(this.dogEarNext, s.pageComplete);
      setShown(this.dogEarEarly, !s.pageComplete);
      if (s.pageComplete) boing(this.dogEarNext, 'appear');
    }
  }

  destroy(): void {
    this.clearTagTimers();
    if (this.jarClinkTimer) {
      clearTimeout(this.jarClinkTimer);
      this.jarClinkTimer = null;
    }
  }

  private clearTagTimers(): void {
    if (this.tagFadeTimer) {
      clearTimeout(this.tagFadeTimer);
      this.tagFadeTimer = null;
    }
    if (this.tagHideTimer) {
      clearTimeout(this.tagHideTimer);
      this.tagHideTimer = null;
    }
  }

  private currentToolMode(): ToolMode {
    if (!this.last) return 'pencil';
    return this.last.toolMode ?? (this.last.doodle ? 'wand' : 'pencil');
  }

  private selectToolMode(mode: ToolMode): void {
    const btn = mode === 'pencil' ? this.pencilBtn : this.wandBtn;
    boing(btn, 'select');
    this.cb?.onUiFoley?.('woodTap');
    if (mode === 'pencil' && this.last?.prologueActive) {
      this.cb?.onDismissPrologue?.();
    }
    const cur = this.currentToolMode();
    if (this.cb?.onSelectToolMode) {
      this.cb.onSelectToolMode(mode);
    } else if (cur !== mode) {
      this.cb?.onToggleDoodle();
    }
    this.showToolTag(mode === 'pencil' ? 'Color shapes to wake' : 'Sky doodle & poke');
  }

  private onJarTap(): void {
    boing(this.crystalJar, 'press');
    this.cb?.onUiFoley?.('jarClink');
    if (this.appMode === 'chapter') {
      this.cb?.onBackToHub();
    } else {
      this.crystalJar.classList.remove('is-clinking');
      void this.crystalJar.offsetWidth;
      this.crystalJar.classList.add('is-clinking');
      if (this.jarClinkTimer) clearTimeout(this.jarClinkTimer);
      this.jarClinkTimer = setTimeout(() => {
        this.crystalJar.classList.remove('is-clinking');
        this.jarClinkTimer = null;
      }, 650);
    }
  }

  private buildStoryStars(stars: StoryStarState[]): void {
    const keep = new Set(stars.map((s) => s.id));
    for (const [id, el] of this.socketEls) {
      if (!keep.has(id)) {
        el.remove();
        this.socketEls.delete(id);
        this.socketData.delete(id);
      }
    }

    stars.forEach((star, i) => {
      const prevStar = this.socketData.get(star.id);
      this.socketData.set(star.id, star);
      let el = this.socketEls.get(star.id);
      if (!el) {
        const milestoneId = star.id;
        const b = button('cc-story-socket', `Find ${star.label}`, () => {
          const cur = this.socketData.get(milestoneId);
          if (!cur) return;
          if (!cur.lit) {
            boing(b, 'press');
            this.cb?.onUiFoley?.('wispChime');
            this.cb?.onHighlightMilestone?.(milestoneId);
          } else {
            boing(b, 'select');
            this.cb?.onUiFoley?.('wispChime');
          }
        });
        b.dataset.milestone = milestoneId;
        el = b;
        this.socketEls.set(milestoneId, b);
      }

      const newlyLit = Boolean(prevStar && !prevStar.lit && star.lit);
      el.classList.toggle('is-lit', star.lit);
      el.dataset.lit = star.lit ? 'true' : 'false';
      el.style.setProperty('--prog', star.progress.toFixed(2));
      const label = star.lit ? `${star.label}: Story Star lit` : `Find ${star.label}`;
      el.setAttribute('aria-label', label);
      el.title = label;
      clear(el);
      el.append(iconSpan(storyStarSocketSvg(star.lit, star.progress), 'cc-ico cc-socket-ico'));
      if (newlyLit) boing(el, 'select');
      if (this.socketRow.children[i] !== el) {
        this.socketRow.insertBefore(el, this.socketRow.children[i] ?? null);
      }
    });
  }

  private buildSwatches(list: MaterialEntry[]): void {
    const cache = this.cache;
    if (!cache) return;
    const keep = new Set(list.map((m) => m.def.id));
    for (const [id, el] of this.swatchEls) {
      if (!keep.has(id)) {
        el.remove();
        this.swatchEls.delete(id);
      }
    }
    list.forEach((m, i) => {
      let el = this.swatchEls.get(m.def.id);
      if (!el) {
        const id = m.def.id;
        const name = m.def.name;
        const b = button('cc-swatch', name, () => {
          boing(b, 'select');
          this.cb?.onUiFoley?.('woodTap');
          this.cb?.onSelectMaterial(id);
          this.showToolTag(name);
        });
        b.setAttribute('role', 'radio');
        b.setAttribute('aria-checked', 'false');
        b.dataset.material = String(id);
        b.dataset.family = m.def.family;
        b.style.setProperty('--sw-a', m.def.palette[0] ?? '#fff');
        b.style.setProperty('--sw-b', m.def.palette[1] ?? m.def.palette[0] ?? '#fff');
        b.append(
          h(
            'span',
            { class: 'cc-swatch-body' },
            cache.canvas({ type: 'material', material: id }, SWATCH_PX, SWATCH_PX, 'cc-swatch-pix'),
            h('span', { class: 'cc-gleam', 'aria-hidden': 'true' }),
          ),
          h('span', { class: 'cc-swatch-tip', 'aria-hidden': 'true' }),
        );
        el = b;
        this.swatchEls.set(id, b);
      }
      el.style.setProperty('--i', String(i));
      if (this.swatchRow.children[i] !== el) {
        this.swatchRow.insertBefore(el, this.swatchRow.children[i] ?? null);
      }
    });
    this.swatchRow.style.setProperty('--n', String(list.length));
    this.swatchRow.dataset.sel = '';
  }

  private buildBrushes(list: BrushId[]): void {
    clear(this.brushGroup);
    this.brushEls.clear();
    for (const id of list) {
      const b = button(
        'cc-wood-tool cc-brush',
        BRUSH_NAMES[id],
        () => {
          boing(b, 'select');
          this.cb?.onUiFoley?.('woodTap');
          if (this.currentToolMode() === 'wand') {
            if (this.cb?.onSelectToolMode) this.cb.onSelectToolMode('pencil');
            else this.cb?.onToggleDoodle();
          }
          this.cb?.onSelectBrush(id);
          this.showToolTag(BRUSH_TAGS[id]);
        },
        iconSpan(BRUSH_ICONS[id], 'cc-ico cc-brush-ico'),
      );
      b.setAttribute('role', 'radio');
      b.setAttribute('aria-checked', 'false');
      b.dataset.brush = id;
      this.brushEls.set(id, b);
      this.brushGroup.append(b);
    }
  }

  private buildRelics(list: RelicId[], fresh: RelicId[]): void {
    const cache = this.cache;
    if (!cache) return;
    clear(this.relicsBox);
    list.forEach((r, i) => {
      const name = DRAFT_CARDS.find((c) => c.id === r)?.name ?? r;
      const st = h(
        'span',
        { class: 'cc-wax-charm', title: name, role: 'img', 'aria-label': name, 'data-relic': r },
        cache.canvas({ type: 'relicSticker', relic: r }, STICKER_PX, STICKER_PX),
      );
      st.style.setProperty('--tilt', `${((i * 37) % 13) - 6}deg`);
      this.relicsBox.append(st);
      if (fresh.includes(r)) boing(st, 'appear');
    });
  }
}
