/**
 * Midnight Cloisonne Modal Overlays (zero inline SVG doodles; Hi-Bit pixel canvases everywhere):
 * - Astral Pencil Tin: Midnight-enamel & burnished-gold astrolabe tin with 3 holographic Hi-Bit cards (all 20 items)
 * - Star-Doors: Midnight-velvet observatory archway portals parting pleated indigo curtains
 * - Galaxy Finale: Illuminated Midnight-Cloisonne astrolabe title-plate celebration
 */
import type { UiSpriteId } from '../contracts/art';
import type { UiFoleyKind } from '../contracts/audio';
import { DRAFT_CARDS, type ChapterId, type DraftCardId } from '../contracts/roguelike';
import type { FinaleMeta } from '../contracts/ui';
import { ALL_CHAPTERS, CHAPTER_TO_UNIVERSE, TOTAL_UNIVERSES, UNIVERSE_BY_ID, type UniverseId } from '../contracts/universes';
import { button, clear, h, spriteBox } from './dom';
import { placeholderCanvas, type IllustrationCache } from './illustrations';
import { boing, prefersReducedMotion } from './spring';

export const CARD_ART: [number, number] = [120, 90];
export const DOOR_ART: [number, number] = [80, 120];
export const FINALE_PORTAL_ART: [number, number] = [96, 72];

const KID_TYPE: Record<'brush' | 'relic', string> = { brush: 'Magic Brush', relic: 'Sticker Relic' };

export class Modals {
  readonly layer: HTMLElement;
  private cache: IllustrationCache | null = null;
  private onFoley: ((kind: UiFoleyKind) => void) | null = null;
  private active: { el: HTMLElement; cancel: () => void } | null = null;

  constructor() {
    this.layer = h('div', { class: 'cc-modal-layer', hidden: true });
  }

  bind(cache: IllustrationCache, onFoley?: (kind: UiFoleyKind) => void): void {
    this.cache = cache;
    this.onFoley = onFoley ?? null;
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
    kids.forEach((k, i) => boing(k, 'appear', 25 + i * 40));
    el.tabIndex = -1;
    queueMicrotask(() => el.focus({ preventScroll: true }));
  }

  /** Close the current modal. */
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

  private sprite(id: UiSpriteId, size: number, cls = 'cc-ico'): HTMLElement {
    const canvas = this.cache ? this.cache.sprite(id, size) : placeholderCanvas(size, size);
    return spriteBox(cls, canvas);
  }

  showDraft(cards: DraftCardId[]): Promise<DraftCardId> {
    this.onFoley?.('tinSnap');
    return new Promise<DraftCardId>((resolve) => {
      const row = h('div', { class: 'cc-cards', style: `--n:${cards.length}` });
      const constellationBar = h(
        'div',
        { class: 'cc-tin-constellation', 'aria-hidden': 'true' },
        h('span', { class: 'cc-tin-star s1' }),
        h('span', { class: 'cc-tin-star s2' }),
        h('span', { class: 'cc-tin-star s3' }),
        h('span', { class: 'cc-tin-star s4' }),
        h('span', { class: 'cc-tin-star s5' }),
      );

      const lidTop = h(
        'div',
        { class: 'cc-tin-lid-top' },
        constellationBar,
        h(
          'div',
          { class: 'cc-modal-head' },
          this.sprite('tool_star', 24, 'cc-ico cc-head-star'),
          h('h2', { class: 'cc-modal-title' }, 'Astral Pencil Tin'),
          this.sprite('tool_star', 24, 'cc-ico cc-head-star'),
        ),
        h('p', { class: 'cc-modal-sub' }, 'Pick one treasure to keep for this voyage!'),
      );

      const hinges = h(
        'div',
        { class: 'cc-tin-hinges', 'aria-hidden': 'true' },
        h('span', { class: 'cc-tin-hinge' }),
        this.sprite('tool_crown', 28, 'cc-ico cc-tin-clasp-ico'),
        h('span', { class: 'cc-tin-hinge' }),
      );

      const el = h(
        'div',
        { class: 'cc-modal cc-draft', role: 'dialog', 'aria-modal': 'true', 'aria-label': 'Astral Pencil Tin' },
        h(
          'div',
          { class: 'cc-modal-card cc-pencil-tin cc-tin-lid' },
          lidTop,
          hinges,
          h('div', { class: 'cc-tin-tray' }, row),
        ),
      );

      let done = false;
      const mid = (cards.length - 1) / 2;
      cards.forEach((id, idx) => {
        const def = DRAFT_CARDS.find((c) => c.id === id);
        const name = def?.name ?? id;
        const card = button(
          `cc-card cc-deckle-card is-${def?.type ?? 'brush'}`,
          `${name}: ${def?.description ?? ''}`,
          () => {
            if (done) return;
            done = true;
            this.onFoley?.('stickerPeel');
            this.finish(el, card, () => resolve(id));
          },
          h(
            'span',
            { class: 'cc-card-inner' },
            h('span', { class: 'cc-card-holo', 'aria-hidden': 'true' }),
            h('span', { class: 'cc-card-art' }, this.art({ type: 'card', card: id }, CARD_ART)),
            h('span', { class: 'cc-card-type' }, KID_TYPE[def?.type ?? 'brush']),
            h('span', { class: 'cc-card-name' }, name),
            h('span', { class: 'cc-card-desc' }, def?.description ?? ''),
          ),
        );
        card.dataset.card = id;
        card.style.setProperty('--fan', `${((idx - mid) * 1.4).toFixed(2)}deg`);
        row.append(card);
      });
      this.open(el, () => undefined);
    });
  }

  showDoors(options: ChapterId[]): Promise<ChapterId> {
    return new Promise<ChapterId>((resolve) => {
      const row = h('div', { class: 'cc-door-row', style: `--n:${options.length}` });
      const firstCh = options.length === 1 ? ALL_CHAPTERS.find((c) => c.id === options[0]) : undefined;
      const finale = options.length === 1 && firstCh?.slot === 5;
      const uId = options[0] ? CHAPTER_TO_UNIVERSE[options[0]] : undefined;
      const uDef = uId ? UNIVERSE_BY_ID[uId] : undefined;
      const uniTag = uDef
        ? h(
            'span',
            { class: 'cc-door-uni-pill' },
            this.sprite('tool_atlas', 16, 'cc-ico cc-door-uni-ico'),
            `Universe #${uDef.number} of ${TOTAL_UNIVERSES} \u00b7 ${uDef.shortName}`,
          )
        : null;
      const subCopy = finale
        ? uDef && uDef.number < TOTAL_UNIVERSES
          ? `Complete this finale to unlock Universe #${uDef.number + 1}!`
          : 'Everything you gathered glows brighter...'
        : 'Part the starry curtains for your next chapter...';
      const el = h(
        'div',
        { class: 'cc-modal cc-doors', role: 'dialog', 'aria-modal': 'true', 'aria-label': 'Choose a Star-Door' },
        h(
          'div',
          { class: 'cc-modal-card cc-door-wall' },
          h('span', { class: 'cc-curtain cc-curtain-l', 'aria-hidden': 'true' }),
          h('span', { class: 'cc-curtain cc-curtain-r', 'aria-hidden': 'true' }),
          uniTag,
          h(
            'div',
            { class: 'cc-modal-head' },
            this.sprite('tool_star', 24, 'cc-ico cc-head-star'),
            h('h2', { class: 'cc-modal-title' }, finale ? 'The Last Star-Door' : 'Choose a Star-Door'),
            this.sprite('tool_star', 24, 'cc-ico cc-head-star'),
          ),
          h('p', { class: 'cc-modal-sub' }, subCopy),
          row,
        ),
      );
      let done = false;
      for (const id of options) {
        const ch = ALL_CHAPTERS.find((c) => c.id === id);
        const door = button(
          'cc-door cc-parchment-arch',
          `${ch?.title ?? id}: ${ch?.subtitle ?? ''}`,
          () => {
            if (done) return;
            done = true;
            this.onFoley?.('paperRustle');
            this.finish(el, door, () => resolve(id));
          },
          h(
            'span',
            { class: 'cc-door-inner' },
            h('span', { class: 'cc-door-art' }, this.art({ type: 'door', chapter: id }, DOOR_ART)),
            h(
              'span',
              { class: 'cc-door-plaque' },
              h('span', { class: 'cc-door-title' }, ch?.title ?? id),
              h('span', { class: 'cc-door-sub' }, ch?.subtitle ?? ''),
            ),
          ),
        );
        door.prepend(this.sprite('tool_star', 22, 'cc-ico cc-door-keystone'));
        door.dataset.chapter = id;
        row.append(door);
      }
      this.open(el, () => undefined);
    });
  }

  showFinale(name: string, onDone: () => void, meta?: FinaleMeta): Promise<UniverseId | null | void> {
    this.onFoley?.('wispChime');
    return new Promise<UniverseId | null | void>((resolve) => {
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

      const newly = meta?.newlyUnlocked ?? null;
      const total = meta?.totalUniverses ?? TOTAL_UNIVERSES;
      const completedCount = meta?.completedCount;
      const defaultResolve: UniverseId | null | void = meta ? null : undefined;

      let done = false;
      const finishWith = (result: UniverseId | null | void, chosen: HTMLElement | null): void => {
        if (done) return;
        done = true;
        this.onFoley?.('paperRustle');
        this.finish(el, chosen, () => {
          onDone();
          resolve(result);
        });
      };

      const unlockChildren: Array<Node | null> = [];
      if (newly) {
        const bonusPill =
          meta?.bonusGems && meta.bonusGems > 0
            ? h(
                'span',
                { class: 'cc-finale-bonus-pill' },
                this.sprite('tool_gem', 16, 'cc-ico cc-finale-gem-ico'),
                `+${meta.bonusGems} First-Clear Prism Crystals!`,
              )
            : null;
        const pct = completedCount !== undefined ? Math.max(0, Math.min(1, completedCount / Math.max(1, total))) : newly.number / Math.max(1, total);
        const remaining = Math.max(0, total - newly.number);
        const progressLabel =
          remaining > 0
            ? `${completedCount ?? newly.number - 1} / ${total} Completed \u00b7 ${remaining} more bespoke ${remaining === 1 ? 'universe' : 'universes'} ahead!`
            : `All ${total} Bespoke Universes Unlocked!`;

        const portalArt = this.art(
          { type: 'universePortal', universe: newly.id, locked: false, completed: false },
          FINALE_PORTAL_ART,
        );

        const journeyBtn = button(
          'cc-finale-btn cc-finale-btn-journey',
          `Journey to Universe #${newly.number}: ${newly.name}`,
          () => finishWith(newly.id, journeyBtn),
          h(
            'span',
            { class: 'cc-finale-btn-inner' },
            this.sprite('tool_voyage_seal', 24, 'cc-ico cc-finale-btn-ico'),
            h('span', {}, `Journey to #${newly.number}`),
          ),
        );
        journeyBtn.dataset.action = 'journey-next';
        journeyBtn.dataset.universe = newly.id;
        journeyBtn.addEventListener('click', (e) => e.stopPropagation());

        const atlasBtn = button(
          'cc-finale-btn cc-finale-btn-atlas',
          'Return to Multiverse Atlas',
          () => finishWith(null, atlasBtn),
          h(
            'span',
            { class: 'cc-finale-btn-inner' },
            this.sprite('tool_atlas', 22, 'cc-ico cc-finale-btn-ico'),
            h('span', {}, 'Return to Atlas'),
          ),
        );
        atlasBtn.dataset.action = 'return-atlas';
        atlasBtn.addEventListener('click', (e) => e.stopPropagation());

        const progressFill = h('span', { class: 'cc-finale-prog-fill' });
        progressFill.style.setProperty('--prog', pct.toFixed(3));

        unlockChildren.push(
          h(
            'div',
            { class: 'cc-finale-unlock-card', 'data-unlocked-universe': newly.id },
            h(
              'div',
              { class: 'cc-finale-unlock-badge' },
              this.sprite('tool_star', 16, 'cc-ico cc-finale-badge-star'),
              h('span', {}, 'NEW UNIVERSE UNLOCKED!'),
              this.sprite('tool_star', 16, 'cc-ico cc-finale-badge-star'),
            ),
            h(
              'div',
              { class: 'cc-finale-portal-row' },
              h('span', { class: 'cc-finale-portal-frame' }, portalArt),
              h(
                'div',
                { class: 'cc-finale-portal-info' },
                h('span', { class: 'cc-finale-portal-num' }, `Universe #${newly.number} of ${total} Unlocked!`),
                h('h3', { class: 'cc-finale-portal-name' }, newly.name),
                h('p', { class: 'cc-finale-portal-tag' }, newly.tagline),
                bonusPill,
              ),
            ),
            h(
              'div',
              { class: 'cc-finale-prog-wrap' },
              h('span', { class: 'cc-finale-prog-track' }, progressFill),
              h('span', { class: 'cc-finale-prog-text' }, progressLabel),
            ),
          ),
          h('div', { class: 'cc-finale-actions' }, journeyBtn, atlasBtn),
        );
      } else if (completedCount !== undefined) {
        const pct = Math.max(0, Math.min(1, completedCount / Math.max(1, total)));
        const progressFill = h('span', { class: 'cc-finale-prog-fill' });
        progressFill.style.setProperty('--prog', pct.toFixed(3));
        const remaining = Math.max(0, total - completedCount);
        const label =
          remaining > 0
            ? `${completedCount} / ${total} Universes Mastered \u00b7 Keep playing to unlock all ${total} bespoke universes!`
            : `All ${total} / ${total} Bespoke Universes Mastered!`;
        unlockChildren.push(
          h(
            'div',
            { class: 'cc-finale-prog-wrap is-compact' },
            h('span', { class: 'cc-finale-prog-track' }, progressFill),
            h('span', { class: 'cc-finale-prog-text' }, label),
          ),
        );
      }

      const kickerText = meta?.universeName
        ? `${meta.universeName} Complete!`
        : 'You lit up a whole new galaxy!';

      const el = h(
        'div',
        { class: `cc-modal cc-finale${newly ? ' has-unlock' : ''}`, role: 'dialog', 'aria-modal': 'true', 'aria-label': `You made a galaxy: ${name}` },
        sparkles,
        h(
          'div',
          { class: 'cc-modal-card cc-finale-plate cc-finale-card' },
          h('span', { class: 'cc-plate-filigree tl', 'aria-hidden': 'true' }),
          h('span', { class: 'cc-plate-filigree tr', 'aria-hidden': 'true' }),
          h('span', { class: 'cc-plate-filigree bl', 'aria-hidden': 'true' }),
          h('span', { class: 'cc-plate-filigree br', 'aria-hidden': 'true' }),
          this.sprite('tool_crown', 36, 'cc-ico cc-finale-crest'),
          h('p', { class: 'cc-finale-kicker' }, kickerText),
          nameEl,
          ...unlockChildren,
          newly ? null : h('p', { class: 'cc-finale-hint' }, 'Tap anywhere to bind it onto your bookshelf'),
        ),
      );
      const tap = (e: Event): void => {
        if ((e.target as HTMLElement | null)?.closest('.cc-finale-btn')) return;
        e.preventDefault();
        finishWith(defaultResolve, null);
      };
      el.addEventListener('click', tap);
      el.addEventListener('keydown', (e) => {
        const key = (e as KeyboardEvent).key;
        if (key === 'Escape') {
          e.preventDefault();
          finishWith(defaultResolve, null);
        } else if (key === 'Enter' || key === ' ') {
          tap(e);
        }
      });
      el.tabIndex = 0;
      this.open(el, () => undefined);
    });
  }

  private art(k: Parameters<IllustrationCache['canvas']>[0], [w, hh]: [number, number]): HTMLCanvasElement {
    if (this.cache) return this.cache.canvas(k, w, hh);
    return placeholderCanvas(w, hh);
  }
}
