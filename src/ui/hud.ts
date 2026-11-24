/** Sketchbook HUD: top bar (ribbon, gems, relic stickers, audio, install badge) + Pencil Dock + side rails. */
import type { AudioLevel } from '../contracts/audio';
import type { MaterialId } from '../contracts/materials';
import type { BrushId, RelicId } from '../contracts/roguelike';
import { DRAFT_CARDS } from '../contracts/roguelike';
import type { HudState, MaterialEntry, UiCallbacks } from '../contracts/ui';
import { button, clear, h, iconSpan, setShown } from './dom';
import {
  AUDIO_LABEL, BRUSH_ICONS, BRUSH_NAMES, ICON_CLOSE, ICON_DOODLE, ICON_DOOR, ICON_GEM, ICON_HOME, ICON_PAGE_CORNER,
  ICON_STAR, audioIcon,
} from './icons';
import type { IllustrationCache } from './illustrations';
import type { InstallController } from './install';
import { boing } from './spring';

export const SWATCH_PX = 32;
export const STICKER_PX = 32;

export interface HudParts {
  top: HTMLElement;
  railLeft: HTMLElement;
  railRight: HTMLElement;
  dock: HTMLElement;
}

export class Hud {
  readonly top: HTMLElement;
  readonly railLeft: HTMLElement;
  readonly railRight: HTMLElement;
  readonly dock: HTMLElement;

  private readonly ribbonText: HTMLElement;
  private readonly gemsBox: HTMLElement;
  private readonly gemsText: HTMLElement;
  private readonly relicsBox: HTMLElement;
  private readonly homeBtn: HTMLButtonElement;
  private readonly audioBtn: HTMLButtonElement;
  private readonly installWrap: HTMLElement;
  private readonly swatchRow: HTMLElement;
  private readonly brushBox: HTMLElement;
  private readonly doodleBtn: HTMLButtonElement;
  private readonly pipsBox: HTMLElement;
  private readonly nextBtn: HTMLButtonElement;
  private readonly earlyBtn: HTMLButtonElement;

  private readonly swatchEls = new Map<MaterialId, HTMLButtonElement>();
  private readonly brushEls = new Map<BrushId, HTMLButtonElement>();
  private last: HudState | null = null;
  private sig = { materials: '', brushes: '', relics: '', pips: '' };
  private cache: IllustrationCache | null = null;
  private cb: UiCallbacks | null = null;
  private title = '';

  constructor(install: InstallController) {
    // ---- top bar
    this.ribbonText = h('span', { class: 'cc-ribbon-text' });
    const ribbon = h('div', { class: 'cc-ribbon', role: 'heading', 'aria-level': 1 }, this.ribbonText);
    this.gemsText = h('span', { class: 'cc-gems-n', 'aria-live': 'polite' }, '0');
    this.gemsBox = h('div', { class: 'cc-gems', title: 'Stardust Gems' }, iconSpan(ICON_GEM, 'cc-ico cc-gem-ico'), this.gemsText);
    this.relicsBox = h('div', { class: 'cc-relics', 'aria-label': 'Relic stickers' });
    this.homeBtn = button('cc-round cc-home', "Back to Violet's bedroom", () => this.cb?.onBackToHub(), iconSpan(ICON_HOME));
    this.audioBtn = button('cc-round cc-audio', AUDIO_LABEL[3], () => {
      boing(this.audioBtn, 'press');
      this.cb?.onAudioCycle();
    });
    this.audioBtn.dataset.level = '3';
    this.audioBtn.append(iconSpan(audioIcon(3)));

    const installBtn = button('cc-install', 'Install Sketchbook', () => void install.install(),
      h('span', { class: 'cc-install-inner' }, iconSpan(ICON_STAR, 'cc-ico cc-install-star'), h('span', { class: 'cc-install-label' }, 'Install Sketchbook')));
    const installX = button('cc-install-x', 'Hide install badge', () => install.dismiss(), iconSpan(ICON_CLOSE));
    this.installWrap = h('div', { class: 'cc-install-wrap', hidden: true }, installBtn, installX);
    install.onChange((v) => {
      setShown(this.installWrap, v);
      if (v) boing(installBtn, 'appear');
    });

    this.top = h('header', { class: 'cc-top' },
      ribbon,
      this.gemsBox,
      this.relicsBox,
      h('div', { class: 'cc-top-spacer' }),
      this.installWrap,
      this.homeBtn,
      this.audioBtn,
    );

    // ---- left rail: brushes + doodle
    this.brushBox = h('div', { class: 'cc-brushes', role: 'radiogroup', 'aria-label': 'Brushes' });
    this.doodleBtn = button('cc-tool cc-doodle', 'Free-Starlight Doodle', () => {
      boing(this.doodleBtn, 'select');
      this.cb?.onToggleDoodle();
    }, iconSpan(ICON_DOODLE));
    this.doodleBtn.setAttribute('aria-pressed', 'false');
    this.railLeft = h('div', { class: 'cc-rail cc-rail-l' }, this.brushBox, this.doodleBtn);

    // ---- right rail: progress pips + next / early
    this.pipsBox = h('div', { class: 'cc-pips', role: 'img', 'aria-label': 'Awake friends' });
    this.nextBtn = button('cc-next', 'Next Page', () => this.cb?.onTurnPage(false),
      h('span', { class: 'cc-next-inner' }, iconSpan(ICON_DOOR), h('span', { class: 'cc-next-label' }, 'Next Page')));
    this.earlyBtn = button('cc-early', 'Turn Page Early', () => this.cb?.onTurnPage(true),
      h('span', { class: 'cc-early-inner' }, iconSpan(ICON_PAGE_CORNER), h('span', { class: 'cc-early-label' }, 'Turn early')));
    setShown(this.nextBtn, false);
    this.railRight = h('div', { class: 'cc-rail cc-rail-r' }, this.pipsBox, this.nextBtn, this.earlyBtn);

    // ---- bottom dock: material swatches
    this.swatchRow = h('div', { class: 'cc-swatches', role: 'radiogroup', 'aria-label': 'Magic mediums' });
    this.dock = h('nav', { class: 'cc-dock', 'aria-label': 'Pencil Dock' }, h('div', { class: 'cc-tin' }, this.swatchRow));
  }

  bind(cb: UiCallbacks, cache: IllustrationCache): void {
    this.cb = cb;
    this.cache = cache;
    if (this.last) {
      const l = this.last;
      this.last = null;
      this.sig = { materials: '', brushes: '', relics: '', pips: '' };
      this.update(l);
    }
  }

  setTitle(t: string): void {
    if (t === this.title) return;
    this.title = t;
    this.ribbonText.textContent = t;
  }

  setGems(n: number): void {
    const s = String(n);
    if (this.gemsText.textContent !== s) {
      const up = Number(this.gemsText.textContent ?? '0') < n;
      this.gemsText.textContent = s;
      if (up) boing(this.gemsBox, 'press');
    }
  }

  setAudio(level: AudioLevel): void {
    if (this.audioBtn.dataset.level === String(level)) return;
    this.audioBtn.dataset.level = String(level);
    this.audioBtn.setAttribute('aria-label', AUDIO_LABEL[level]);
    this.audioBtn.title = AUDIO_LABEL[level];
    clear(this.audioBtn);
    this.audioBtn.append(iconSpan(audioIcon(level)));
  }

  /** Re-staggered spring entrance for dock items (called when the dock becomes visible). */
  appear(): void {
    let i = 0;
    for (const el of [...this.swatchEls.values(), ...this.brushEls.values(), this.doodleBtn]) boing(el, 'appear', 30 * i++);
  }

  update(s: HudState): void {
    const prev = this.last;
    this.last = s;
    this.setTitle(s.chapterTitle);
    this.setGems(s.gems);
    this.setAudio(s.audioLevel);
    if (!this.cache) return; // not mounted yet; replayed on bind()

    // materials (unlocked only; locked mediums hidden)
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

    // brushes
    const bsig = s.brushes.join(',');
    if (bsig !== this.sig.brushes) {
      this.sig.brushes = bsig;
      this.buildBrushes(s.brushes);
      this.brushBox.dataset.sel = '';
    }
    if (this.brushBox.dataset.sel !== s.selectedBrush) {
      this.brushBox.dataset.sel = s.selectedBrush;
      for (const [id, el] of this.brushEls) {
        const on = id === s.selectedBrush;
        el.setAttribute('aria-checked', String(on));
        el.classList.toggle('is-on', on);
      }
    }

    // doodle
    if (!prev || prev.doodle !== s.doodle) {
      this.doodleBtn.setAttribute('aria-pressed', String(s.doodle));
      this.doodleBtn.classList.toggle('is-on', s.doodle);
    }

    // relic stickers
    const rsig = s.relics.join(',');
    if (rsig !== this.sig.relics) {
      const fresh = s.relics.filter((r) => !this.sig.relics.split(',').includes(r));
      this.sig.relics = rsig;
      this.buildRelics(s.relics, prev ? fresh : []);
    }

    // pips
    const psig = `${s.coreAwake}/${s.coreTotal}`;
    if (psig !== this.sig.pips) {
      this.sig.pips = psig;
      this.buildPips(s.coreAwake, s.coreTotal);
    }

    // next page vs early tab
    if (!prev || prev.pageComplete !== s.pageComplete || this.nextBtn.hidden === s.pageComplete) {
      setShown(this.nextBtn, s.pageComplete);
      setShown(this.earlyBtn, !s.pageComplete);
      if (s.pageComplete) boing(this.nextBtn, 'appear');
    }
  }

  private buildSwatches(list: MaterialEntry[]): void {
    const cache = this.cache;
    if (!cache) return;
    const keep = new Set(list.map((m) => m.def.id));
    for (const [id, el] of this.swatchEls) if (!keep.has(id)) { el.remove(); this.swatchEls.delete(id); }
    list.forEach((m, i) => {
      let el = this.swatchEls.get(m.def.id);
      if (!el) {
        const id = m.def.id;
        const b = button('cc-swatch', m.def.name, () => {
          boing(b, 'select');
          this.cb?.onSelectMaterial(id);
        });
        b.setAttribute('role', 'radio');
        b.setAttribute('aria-checked', 'false');
        b.dataset.material = String(id);
        b.dataset.family = m.def.family;
        b.style.setProperty('--sw-a', m.def.palette[0] ?? '#fff');
        b.style.setProperty('--sw-b', m.def.palette[1] ?? m.def.palette[0] ?? '#fff');
        b.append(
          h('span', { class: 'cc-swatch-body' },
            cache.canvas({ type: 'material', material: id }, SWATCH_PX, SWATCH_PX, 'cc-swatch-pix'),
            h('span', { class: 'cc-gleam', 'aria-hidden': 'true' })),
          h('span', { class: 'cc-swatch-tip', 'aria-hidden': 'true' }),
        );
        el = b;
        this.swatchEls.set(id, b);
      }
      el.style.setProperty('--i', String(i));
      if (this.swatchRow.children[i] !== el) this.swatchRow.insertBefore(el, this.swatchRow.children[i] ?? null);
    });
    this.swatchRow.style.setProperty('--n', String(list.length));
    this.swatchRow.dataset.sel = '';
  }

  private buildBrushes(list: BrushId[]): void {
    clear(this.brushBox);
    this.brushEls.clear();
    for (const id of list) {
      const b = button('cc-tool cc-brush', BRUSH_NAMES[id], () => {
        boing(b, 'select');
        this.cb?.onSelectBrush(id);
      }, iconSpan(BRUSH_ICONS[id]));
      b.setAttribute('role', 'radio');
      b.setAttribute('aria-checked', 'false');
      b.dataset.brush = id;
      this.brushEls.set(id, b);
      this.brushBox.append(b);
    }
    this.brushBox.style.setProperty('--n', String(list.length + 1));
    this.railLeft.style.setProperty('--n', String(list.length + 1));
  }

  private buildRelics(list: RelicId[], fresh: RelicId[]): void {
    const cache = this.cache;
    if (!cache) return;
    clear(this.relicsBox);
    list.forEach((r, i) => {
      const name = DRAFT_CARDS.find((c) => c.id === r)?.name ?? r;
      const st = h('span', { class: 'cc-sticker', title: name, role: 'img', 'aria-label': name, 'data-relic': r },
        cache.canvas({ type: 'relicSticker', relic: r }, STICKER_PX, STICKER_PX));
      st.style.setProperty('--tilt', `${((i * 37) % 13) - 6}deg`);
      this.relicsBox.append(st);
      if (fresh.includes(r)) boing(st, 'appear');
    });
  }

  private buildPips(awake: number, total: number): void {
    clear(this.pipsBox);
    const n = Math.max(0, Math.min(30, total));
    for (let i = 0; i < n; i++) this.pipsBox.append(h('span', { class: i < awake ? 'cc-pip is-on' : 'cc-pip' }));
    this.pipsBox.style.setProperty('--n', String(n));
    this.pipsBox.setAttribute('aria-label', `${awake} of ${total} friends awake`);
    this.pipsBox.dataset.count = `${awake}/${total}`;
  }
}
