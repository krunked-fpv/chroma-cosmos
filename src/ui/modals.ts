/** Modal overlays: Astral Pencil Tin draft, Star-Door chooser, Finale celebration. */
import { CHAPTERS, DRAFT_CARDS } from '../contracts/roguelike';
import type { ChapterId, DraftCardId } from '../contracts/roguelike';
import { button, clear, h, iconSpan } from './dom';
import { ICON_STAR } from './icons';
import type { IllustrationCache } from './illustrations';
import { boing, prefersReducedMotion } from './spring';

export const CARD_ART: [number, number] = [96, 72];
export const DOOR_ART: [number, number] = [64, 96];

const KID_TYPE: Record<'brush' | 'relic', string> = { brush: 'Magic Brush', relic: 'Lucky Relic' };

export class Modals {
  readonly layer: HTMLElement;
  private cache: IllustrationCache | null = null;
  private active: { el: HTMLElement; cancel: () => void } | null = null;

  constructor() {
    this.layer = h('div', { class: 'cc-modal-layer', hidden: true });
  }

  bind(cache: IllustrationCache): void {
    this.cache = cache;
  }

  get isOpen(): boolean {
    return this.active !== null;
  }

  private open(el: HTMLElement, cancel: () => void): void {
    this.close();
    this.active = { el, cancel };
    clear(this.layer);
    this.layer.append(el);
    this.layer.removeAttribute('hidden');
    boing(el.querySelector<HTMLElement>('.cc-modal-card') ?? el, 'appear');
    const kids = el.querySelectorAll<HTMLElement>('.cc-card, .cc-door');
    kids.forEach((k, i) => boing(k, 'appear', 120 + i * 90));
    el.tabIndex = -1;
    queueMicrotask(() => el.focus({ preventScroll: true }));
  }

  /** Close the current modal (pending promises stay pending only when superseded). */
  close(): void {
    if (!this.active) return;
    const a = this.active;
    this.active = null;
    a.el.remove();
    if (!this.active) this.layer.setAttribute('hidden', '');
  }

  private finish(el: HTMLElement, chosen: HTMLElement | null, done: () => void): void {
    el.classList.add('is-closing');
    el.querySelectorAll('button').forEach((b) => ((b as HTMLButtonElement).disabled = true));
    if (chosen) {
      chosen.classList.add('is-chosen');
      boing(chosen, 'select');
    }
    const delay = prefersReducedMotion() ? 0 : 260;
    const end = (): void => {
      if (this.active?.el === el) this.close();
      done();
    };
    if (delay === 0) end();
    else setTimeout(end, delay);
  }

  showDraft(cards: DraftCardId[]): Promise<DraftCardId> {
    return new Promise<DraftCardId>((resolve) => {
      const row = h('div', { class: 'cc-cards', style: `--n:${cards.length}` });
      const el = h('div', { class: 'cc-modal cc-draft', role: 'dialog', 'aria-modal': 'true', 'aria-label': 'Astral Pencil Tin' },
        h('div', { class: 'cc-modal-card cc-tin-lid' },
          h('div', { class: 'cc-modal-head' },
            iconSpan(ICON_STAR, 'cc-ico cc-head-star'),
            h('h2', { class: 'cc-modal-title' }, 'Astral Pencil Tin'),
            iconSpan(ICON_STAR, 'cc-ico cc-head-star')),
          h('p', { class: 'cc-modal-sub' }, 'Pick one treasure to keep for this voyage!'),
          row));
      let done = false;
      for (const id of cards) {
        const def = DRAFT_CARDS.find((c) => c.id === id);
        const name = def?.name ?? id;
        const card = button(`cc-card is-${def?.type ?? 'brush'}`, `${name}: ${def?.description ?? ''}`, () => {
          if (done) return;
          done = true;
          this.finish(el, card, () => resolve(id));
        }, h('span', { class: 'cc-card-inner' },
          h('span', { class: 'cc-card-art' }, this.art({ type: 'card', card: id }, CARD_ART)),
          h('span', { class: 'cc-card-type' }, KID_TYPE[def?.type ?? 'brush']),
          h('span', { class: 'cc-card-name' }, name),
          h('span', { class: 'cc-card-desc' }, def?.description ?? '')));
        card.dataset.card = id;
        row.append(card);
      }
      this.open(el, () => undefined);
    });
  }

  showDoors(options: ChapterId[]): Promise<ChapterId> {
    return new Promise<ChapterId>((resolve) => {
      const row = h('div', { class: 'cc-door-row', style: `--n:${options.length}` });
      const finale = options.length === 1 && options[0] === 'heartOfUniverse';
      const el = h('div', { class: 'cc-modal cc-doors', role: 'dialog', 'aria-modal': 'true', 'aria-label': 'Choose a Star-Door' },
        h('div', { class: 'cc-modal-card cc-door-wall' },
          h('div', { class: 'cc-modal-head' },
            iconSpan(ICON_STAR, 'cc-ico cc-head-star'),
            h('h2', { class: 'cc-modal-title' }, finale ? 'The Last Star-Door' : 'Choose a Star-Door'),
            iconSpan(ICON_STAR, 'cc-ico cc-head-star')),
          h('p', { class: 'cc-modal-sub' }, finale ? 'Everything you gathered glows brighter...' : 'Where should Violet, Lumi & Nova fly next?'),
          row));
      let done = false;
      for (const id of options) {
        const ch = CHAPTERS.find((c) => c.id === id);
        const door = button('cc-door', `${ch?.title ?? id}: ${ch?.subtitle ?? ''}`, () => {
          if (done) return;
          done = true;
          this.finish(el, door, () => resolve(id));
        }, h('span', { class: 'cc-door-inner' },
          h('span', { class: 'cc-door-art' }, this.art({ type: 'door', chapter: id }, DOOR_ART)),
          h('span', { class: 'cc-door-title' }, ch?.title ?? id),
          h('span', { class: 'cc-door-sub' }, ch?.subtitle ?? '')));
        door.dataset.chapter = id;
        row.append(door);
      }
      this.open(el, () => undefined);
    });
  }

  showFinale(name: string, onDone: () => void): Promise<void> {
    return new Promise<void>((resolve) => {
      const sparkles = h('div', { class: 'cc-burst', 'aria-hidden': 'true' });
      for (let i = 0; i < 18; i++) {
        const s = h('span', { class: 'cc-burst-star' });
        s.style.setProperty('--a', `${(i * 360) / 18}deg`);
        s.style.setProperty('--d', `${(i % 3) * 0.18}s`);
        s.style.setProperty('--r', `${30 + (i % 4) * 9}vmin`);
        sparkles.append(s);
      }
      const nameEl = h('h2', { class: 'cc-finale-name' });
      nameEl.textContent = name;
      let done = false;
      const el = h('div', { class: 'cc-modal cc-finale', role: 'dialog', 'aria-modal': 'true', 'aria-label': `You made a galaxy: ${name}` },
        sparkles,
        h('div', { class: 'cc-modal-card cc-finale-card' },
          h('p', { class: 'cc-finale-kicker' }, 'You lit up a whole new galaxy!'),
          nameEl,
          h('p', { class: 'cc-finale-hint' }, 'Tap anywhere to tuck it into your storybook')));
      const tap = (e: Event): void => {
        e.preventDefault();
        if (done) return;
        done = true;
        this.finish(el, null, () => {
          onDone();
          resolve();
        });
      };
      el.addEventListener('click', tap);
      el.addEventListener('keydown', (e) => {
        if ((e as KeyboardEvent).key === 'Enter' || (e as KeyboardEvent).key === ' ') tap(e);
      });
      el.tabIndex = 0;
      this.open(el, () => undefined);
    });
  }

  private art(k: Parameters<IllustrationCache['canvas']>[0], [w, hh]: [number, number]): HTMLCanvasElement {
    if (this.cache) return this.cache.canvas(k, w, hh);
    const c = document.createElement('canvas');
    c.width = w;
    c.height = hh;
    c.className = 'cc-pix';
    return c;
  }
}
