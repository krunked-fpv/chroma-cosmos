/**
 * Midnight Cloisonne Chapter HUD:
 * - Top Spine: Centered 5-Chapter Constellation Voyage Ribbon (1-2-3-4-5 gold nodes + chapter title whisper)
 * - Top-Left: Frosted Midnight-Plum Glass-Enamel Prism Crystal Pill (Hi-Bit crystal jar sprite, live gems, pulsing "New Gift!" badge)
 * - Top-Right: Frosted Glass Settings/Menu Pill (Hi-Bit audio sprite + quiet popover housing optional Skip Page)
 * - Right Margin: Glowing Firefly Hint Lantern + Vertical Gold Constellation Thread holding 3..4 Circular Cloisonne Story Medallions
 * - Left Margin: Compact Equipped Brush & Holographic Sticker Relic Charm Strip (with animateRelicPulse gold flare + <=2-word tag)
 * - Bottom-Right: Celebratory Auto-Turning Page Ribbon (2.8s radial countdown sweep + Turn Page -> + Stay & Doodle toggle)
 * - Bottom Edge: Floating Midnight-Enamel Art Dock (Enchanted Pencil, Drafted Magical Brushes, Starlight Wand, Pigment Shader Orbs, <=4-word auto-fading tag)
 */
import type { HeroQuestId, StoryMilestoneKind } from '../contracts/art';
import type { AudioLevel } from '../contracts/audio';
import { TOOL_TAG_DURATION_MS } from '../contracts/constants';
import type { MaterialId } from '../contracts/materials';
import { DRAFT_CARDS, type BrushId, type RelicId } from '../contracts/roguelike';
import type { HeroStoryQuest, PageFinaleState, StoryStarState, ToolMode } from '../contracts/simulation';
import type { AppMode, HudState, MaterialEntry, UiCallbacks } from '../contracts/ui';
import { button, clear, h, setShown, spriteBox } from './dom';
import {
  AUDIO_LABEL,
  AUDIO_SPRITE,
  BRUSH_NAMES,
  BRUSH_TAGS,
  QUEST_SPRITE,
  clampWords,
  relicShortTag,
} from './icons';
import { placeholderCanvas, type IllustrationCache } from './illustrations';
import { boing } from './spring';

export const SWATCH_PX = 48;
export const STICKER_PX = 32;
export const MEDALLION_PX = 36;
export const TOOL_PX = 36;

const FALLBACK_QUESTS: ReadonlyArray<{ questId: HeroQuestId; label: string }> = [
  { questId: 'violet', label: 'Violet' },
  { questId: 'lumi', label: 'Lumi' },
  { questId: 'nova', label: 'Nova' },
  { questId: 'planet', label: 'Ringed Planet' },
];

const DROP_COLORS = ['#7ce8ff', '#ff9ecf', '#eac46f', '#b69cff', '#9af0d4', '#ffd97d'] as const;

/** Clamp any whisper micro-tag text strictly to <= 4 words. */
export function clampWhisperTag(text: string): string {
  return clampWords(text, 4);
}

function storyStarToQuest(star: StoryStarState): HeroStoryQuest {
  return {
    questId: star.id,
    label: clampWords(star.label, 2),
    thumbnailSpriteId: star.thumbnailSpriteId ?? QUEST_SPRITE[star.id] ?? 'quest_violet',
    regionIds: star.regionIds,
    progress: star.lit ? 1 : Math.max(0, Math.min(1, star.progress)),
    completed: star.lit,
    stalled: false,
    highlighted: false,
    x: star.x,
    y: star.y,
  };
}

function synthesizeHeroQuests(awake: number, total: number): HeroStoryQuest[] {
  const count = total <= 0 ? 3 : total <= 6 ? 3 : 4;
  const ratio = total > 0 ? Math.max(0, Math.min(1, awake / total)) : 0;
  const litExact = ratio * count;
  return FALLBACK_QUESTS.slice(0, count).map((q, idx) => {
    const completed = litExact >= idx + 1 - 1e-6;
    const progress = completed ? 1 : Math.max(0, Math.min(1, litExact - idx));
    return {
      questId: q.questId,
      label: q.label,
      thumbnailSpriteId: QUEST_SPRITE[q.questId],
      regionIds: [],
      progress,
      completed,
      stalled: false,
      highlighted: false,
      x: 240,
      y: 135,
    };
  });
}

function resolveQuests(s: HudState): HeroStoryQuest[] {
  if (s.heroQuests && s.heroQuests.length > 0) return s.heroQuests;
  if (s.storyStars && s.storyStars.length > 0) return s.storyStars.slice(0, 4).map(storyStarToQuest);
  return synthesizeHeroQuests(s.coreAwake, s.coreTotal);
}

interface MedallionEntry {
  btn: HTMLButtonElement;
  ring: HTMLElement;
  disc: HTMLElement;
  sealSlot: HTMLElement;
  caption: HTMLElement;
  quest: HeroStoryQuest;
  renderedLit: boolean | null;
}

export class Hud {
  readonly voyageSpine: HTMLElement;
  readonly crystalJar: HTMLButtonElement;
  readonly cornerRight: HTMLElement;
  readonly questRail: HTMLElement;
  readonly relicStrip: HTMLElement;
  readonly autoTurnRibbon: HTMLElement;
  readonly dock: HTMLElement;

  private readonly spineNodes: HTMLElement[] = [];
  private readonly spinePill: HTMLElement;
  private readonly spineUniBadge: HTMLElement;
  private readonly spineUnlockChip: HTMLElement;
  private readonly spineTitle: HTMLElement;

  private readonly jarArtSlot: HTMLElement;
  private readonly jarDropHost: HTMLElement;
  private readonly gemsText: HTMLElement;
  private readonly affordableBadge: HTMLElement;
  private readonly affordableIconSlot: HTMLElement;

  private readonly audioBtn: HTMLButtonElement;
  private readonly audioIconSlot: HTMLElement;
  private readonly settingsBtn: HTMLButtonElement;
  private readonly settingsIconSlot: HTMLElement;
  private readonly settingsPopover: HTMLElement;
  private readonly menuHintBtn: HTMLButtonElement;
  private readonly menuHintIconSlot: HTMLElement;
  private readonly menuHubBtn: HTMLButtonElement;
  private readonly menuHubIconSlot: HTMLElement;
  private readonly skipPageBtn: HTMLButtonElement;
  private readonly skipIconSlot: HTMLElement;

  private readonly lanternBtn: HTMLButtonElement;
  private readonly lanternIconSlot: HTMLElement;
  private readonly lanternWrap: HTMLElement;
  private readonly medallionList: HTMLElement;

  private readonly relicList: HTMLElement;

  private readonly finaleStatusEl: HTMLElement;
  private readonly finaleRingEl: HTMLElement;
  private readonly finaleRingIconSlot: HTMLElement;
  private readonly turnNowBtn: HTMLButtonElement;
  private readonly turnNowIconSlot: HTMLElement;
  private readonly stayDoodleBtn: HTMLButtonElement;
  private readonly stayIconSlot: HTMLElement;

  private readonly toolTagEl: HTMLElement;
  private readonly toolTagIconSlot: HTMLElement;
  private readonly toolTagText: HTMLElement;
  private readonly pencilBtn: HTMLButtonElement;
  private readonly pencilIconSlot: HTMLElement;
  private readonly wandBtn: HTMLButtonElement;
  private readonly wandIconSlot: HTMLElement;
  private readonly brushGroup: HTMLElement;
  private readonly swatchRow: HTMLElement;

  private readonly medallions = new Map<HeroQuestId, MedallionEntry>();
  private readonly swatchEls = new Map<MaterialId, HTMLButtonElement>();
  private readonly brushEls = new Map<BrushId, HTMLButtonElement>();
  private readonly stripBrushEls = new Map<BrushId, HTMLButtonElement>();
  private readonly stripRelicEls = new Map<RelicId, HTMLElement>();

  private last: HudState | null = null;
  private sig = { materials: '__init__', brushes: '__init__', strip: '__init__', questsOrder: '__init__' };
  private cache: IllustrationCache | null = null;
  private cb: UiCallbacks | null = null;
  private title = '';
  private appMode: AppMode = 'boot';
  private lastGems = -1;
  private lastSlot = -1;
  private audioLevel: AudioLevel = 3;
  private settingsOpen = false;
  private isStayAndDoodle = false;

  private tagFadeTimer: ReturnType<typeof setTimeout> | null = null;
  private tagHideTimer: ReturnType<typeof setTimeout> | null = null;
  private jarClinkTimer: ReturnType<typeof setTimeout> | null = null;
  private readonly timers = new Set<ReturnType<typeof setTimeout>>();

  private readonly onDocPointerDown = (e: Event): void => {
    if (!this.settingsOpen) return;
    const target = e.target as Node | null;
    if (target && !this.cornerRight.contains(target)) {
      this.setSettingsOpen(false);
    }
  };

  private readonly onKeyDown = (e: KeyboardEvent): void => {
    if (e.key === 'Escape' && this.settingsOpen) {
      this.setSettingsOpen(false);
    }
  };

  constructor() {
    // ---- 1. Top Spine: 5-Chapter Constellation Voyage Ribbon (1 - 2 - 3 - 4 - 5 + chapter title whisper)
    const nodesRow = h('ol', { class: 'cc-voyage-nodes', 'aria-label': '5-Chapter Voyage Progress' });
    for (let i = 1; i <= 5; i++) {
      const node = h(
        'li',
        { class: 'cc-voyage-node is-upcoming', 'data-slot': String(i), 'aria-label': `Chapter ${i}` },
        h('span', { class: 'cc-node-dot', 'aria-hidden': 'true' }),
        h('span', { class: 'cc-node-num' }, String(i)),
      );
      this.spineNodes.push(node);
      nodesRow.append(node);
      if (i < 5) {
        nodesRow.append(h('li', { class: 'cc-node-link', 'aria-hidden': 'true' }));
      }
    }
    this.spineUniBadge = h('span', { class: 'cc-spine-uni', hidden: true });
    this.spineUnlockChip = h('span', { class: 'cc-spine-unlock-chip', hidden: true });
    this.spineTitle = h('span', { class: 'cc-spine-title' });
    this.spinePill = h(
      'div',
      { class: 'cc-voyage-pill' },
      h('div', { class: 'cc-voyage-top-row' }, this.spineUniBadge, nodesRow, this.spineUnlockChip),
      this.spineTitle,
    );
    this.voyageSpine = h(
      'header',
      { class: 'cc-voyage-spine', 'aria-label': 'Constellation Voyage Ribbon' },
      this.spinePill,
    );

    // ---- 2. Top-Left: Frosted Midnight-Plum Glass-Enamel Prism Crystal Pill
    this.jarArtSlot = spriteBox('cc-jar-art', placeholderCanvas(34, 34, 'cc-jar-pix'));
    this.jarDropHost = h('span', { class: 'cc-jar-drops', 'aria-hidden': 'true' });
    this.gemsText = h('span', { class: 'cc-gems-n', 'aria-live': 'polite' }, '0');
    this.affordableIconSlot = spriteBox('cc-ico cc-gift-ico', placeholderCanvas(18, 18));
    this.affordableBadge = h(
      'span',
      { class: 'cc-affordable-badge', hidden: true },
      this.affordableIconSlot,
      h('span', { class: 'cc-affordable-label' }, 'New Gift!'),
    );
    this.crystalJar = button(
      'cc-crystal-jar cc-crystal-pill',
      'Prism Stardust Crystals',
      () => this.onJarTap(),
      h(
        'span',
        { class: 'cc-jar-inner' },
        this.jarDropHost,
        this.jarArtSlot,
        this.gemsText,
        this.affordableBadge,
      ),
    );
    this.crystalJar.dataset.gems = '0';
    this.crystalJar.dataset.affordable = 'false';

    // ---- 3. Top-Right: Frosted Glass Settings/Menu Pill (Audio sprite + compact popover with Skip Page)
    this.audioIconSlot = spriteBox('cc-ico cc-audio-ico', placeholderCanvas(28, 28));
    this.audioBtn = button(
      'cc-round cc-audio',
      AUDIO_LABEL[3],
      () => {
        boing(this.audioBtn, 'press');
        this.cb?.onUiFoley?.('crystalChime');
        this.cb?.onAudioCycle();
      },
      this.audioIconSlot,
    );
    this.audioBtn.dataset.level = '3';

    this.settingsIconSlot = spriteBox('cc-ico cc-settings-ico', placeholderCanvas(26, 26));
    this.settingsBtn = button(
      'cc-round cc-settings-btn',
      'Page menu',
      () => {
        boing(this.settingsBtn, 'press');
        this.cb?.onUiFoley?.('crystalChime');
        this.setSettingsOpen(!this.settingsOpen);
      },
      this.settingsIconSlot,
    );
    this.settingsBtn.setAttribute('aria-haspopup', 'menu');
    this.settingsBtn.setAttribute('aria-expanded', 'false');

    this.menuHintIconSlot = spriteBox('cc-ico cc-skip-ico', placeholderCanvas(22, 22));
    this.menuHintBtn = button(
      'cc-popover-item cc-menu-hint-btn',
      'Firefly Hint',
      () => {
        this.setSettingsOpen(false);
        this.cb?.onUiFoley?.('lanternChime');
        this.cb?.onRequestHint?.();
      },
      h('span', { class: 'cc-popover-item-inner' }, this.menuHintIconSlot, h('span', {}, 'Firefly Hint')),
    );
    this.menuHintBtn.setAttribute('role', 'menuitem');
    this.menuHintBtn.dataset.action = 'menu-hint';

    this.menuHubIconSlot = spriteBox('cc-ico cc-skip-ico', placeholderCanvas(22, 22));
    this.menuHubBtn = button(
      'cc-popover-item cc-menu-hub-btn',
      "Violet's Desk",
      () => {
        this.setSettingsOpen(false);
        this.cb?.onUiFoley?.('paperRustle');
        this.cb?.onBackToHub();
      },
      h('span', { class: 'cc-popover-item-inner' }, this.menuHubIconSlot, h('span', {}, "Violet's Desk")),
    );
    this.menuHubBtn.setAttribute('role', 'menuitem');
    this.menuHubBtn.dataset.action = 'back-to-hub';

    this.skipIconSlot = spriteBox('cc-ico cc-skip-ico', placeholderCanvas(22, 22));
    this.skipPageBtn = button(
      'cc-popover-item cc-skip-page-btn',
      'Skip Page',
      () => {
        this.setSettingsOpen(false);
        this.cb?.onUiFoley?.('paperRustle');
        this.cb?.onTurnPage(true);
      },
      h('span', { class: 'cc-popover-item-inner' }, this.skipIconSlot, h('span', {}, 'Skip Page')),
    );
    this.skipPageBtn.setAttribute('role', 'menuitem');
    this.skipPageBtn.dataset.action = 'skip-page';

    this.settingsPopover = h(
      'div',
      { class: 'cc-settings-popover', role: 'menu', 'aria-label': 'Sketchbook Menu', hidden: true },
      this.menuHintBtn,
      this.menuHubBtn,
      h('span', { class: 'cc-popover-sep', 'aria-hidden': 'true' }),
      this.skipPageBtn,
    );

    this.cornerRight = h(
      'div',
      { class: 'cc-corner-right' },
      h('div', { class: 'cc-corner-pill' }, this.audioBtn, this.settingsBtn),
      this.settingsPopover,
    );

    // ---- 4. Right Margin: Firefly Hint Lantern + 3..4 Circular Cloisonne Story Medallions
    this.lanternIconSlot = spriteBox('cc-ico cc-lantern-ico', placeholderCanvas(36, 36));
    this.lanternBtn = button(
      'cc-hint-lantern',
      'Firefly Hint Lantern',
      () => {
        boing(this.lanternBtn, 'press');
        this.cb?.onUiFoley?.('lanternChime');
        this.cb?.onRequestHint?.();
      },
      h('span', { class: 'cc-lantern-halo', 'aria-hidden': 'true' }),
    );
    this.lanternBtn.append(this.lanternIconSlot);
    this.lanternBtn.dataset.action = 'request-hint';
    this.lanternWrap = h(
      'div',
      { class: 'cc-lantern-wrap' },
      this.lanternBtn,
      h('span', { class: 'cc-lantern-label', 'aria-hidden': 'true' }, 'Hint'),
    );

    this.medallionList = h('div', { class: 'cc-medallion-list', role: 'group', 'aria-label': 'Story Quest Medallions' });
    this.questRail = h(
      'aside',
      { class: 'cc-quest-rail', 'aria-label': 'Firefly Hint and Story Quests' },
      this.lanternWrap,
      h('div', { class: 'cc-medallion-track' }, h('span', { class: 'cc-medallion-thread', 'aria-hidden': 'true' }), this.medallionList),
    );

    // ---- 5. Left Margin: Equipped Brush & Sticker Relic Charm Strip
    this.relicList = h('div', { class: 'cc-relic-list', 'aria-label': 'Equipped Brushes and Relics' });
    this.relicStrip = h(
      'aside',
      { class: 'cc-relic-strip', 'aria-label': 'Equipped Charm Strip', hidden: true },
      this.relicList,
    );

    // ---- 6. Bottom-Right: Celebratory Auto-Turning Page Ribbon
    this.finaleRingIconSlot = spriteBox('cc-ico cc-finale-ring-ico', placeholderCanvas(22, 22));
    this.finaleRingEl = h(
      'span',
      { class: 'cc-finale-ring', 'aria-hidden': 'true' },
      h('span', { class: 'cc-finale-ring-core' }, this.finaleRingIconSlot),
    );
    this.finaleStatusEl = h(
      'span',
      { class: 'cc-finale-status' },
      this.finaleRingEl,
      h('span', { class: 'cc-finale-text' }, 'Story Awake! Turning Page...'),
    );

    this.turnNowIconSlot = spriteBox('cc-ico cc-turn-ico', placeholderCanvas(22, 22));
    this.turnNowBtn = button(
      'cc-turn-now-btn',
      'Turn Page',
      () => {
        boing(this.turnNowBtn, 'press');
        this.cb?.onUiFoley?.('paperRustle');
        this.cb?.onTurnPage(false);
      },
      h('span', { class: 'cc-ribbon-btn-inner' }, this.turnNowIconSlot, h('span', {}, 'Turn Page \u2192')),
    );
    this.turnNowBtn.dataset.action = 'turn-now';

    this.stayIconSlot = spriteBox('cc-ico cc-stay-ico', placeholderCanvas(20, 20));
    this.stayDoodleBtn = button(
      'cc-stay-doodle-btn',
      'Stay & Doodle',
      () => {
        boing(this.stayDoodleBtn, 'press');
        this.cb?.onUiFoley?.('crystalChime');
        this.cb?.onStayAndDoodle?.(!this.isStayAndDoodle);
      },
      h('span', { class: 'cc-ribbon-btn-inner' }, this.stayIconSlot, h('span', {}, 'Stay & Doodle')),
    );
    this.stayDoodleBtn.dataset.action = 'stay-doodle';
    this.stayDoodleBtn.setAttribute('aria-pressed', 'false');

    this.autoTurnRibbon = h(
      'div',
      { class: 'cc-auto-turn-ribbon', role: 'region', 'aria-label': 'Page Awakened Ribbon', hidden: true },
      this.finaleStatusEl,
      h('div', { class: 'cc-auto-turn-actions' }, this.turnNowBtn, this.stayDoodleBtn),
    );
    this.autoTurnRibbon.dataset.stay = 'false';

    // ---- 7. Bottom Edge: Floating Midnight-Enamel Art Dock
    this.toolTagIconSlot = spriteBox('cc-ico cc-tool-tag-glyph', placeholderCanvas(18, 18));
    this.toolTagText = h('span', { class: 'cc-tool-tag-text' });
    this.toolTagEl = h(
      'div',
      { class: 'cc-tool-tag', role: 'status', 'aria-live': 'polite', hidden: true },
      this.toolTagIconSlot,
      this.toolTagText,
    );

    this.pencilIconSlot = spriteBox('cc-ico cc-tool-ico', placeholderCanvas(TOOL_PX, TOOL_PX));
    this.pencilBtn = button(
      'cc-enamel-tool cc-tool-pencil',
      'The Enchanted Pencil',
      () => this.selectToolMode('pencil'),
      this.pencilIconSlot,
    );
    this.pencilBtn.dataset.tool = 'pencil';
    this.pencilBtn.setAttribute('aria-pressed', 'true');

    this.brushGroup = h('div', {
      class: 'cc-brush-group',
      role: 'radiogroup',
      'aria-label': 'Magical Brushes',
      hidden: true,
    });

    this.wandIconSlot = spriteBox('cc-ico cc-tool-ico', placeholderCanvas(TOOL_PX, TOOL_PX));
    this.wandBtn = button(
      'cc-enamel-tool cc-tool-wand',
      'The Starlight Wand',
      () => this.selectToolMode('wand'),
      this.wandIconSlot,
    );
    this.wandBtn.dataset.tool = 'wand';
    this.wandBtn.setAttribute('aria-pressed', 'false');

    this.swatchRow = h('div', { class: 'cc-swatches', role: 'radiogroup', 'aria-label': 'Magic Mediums' });

    const enamelBar = h(
      'div',
      { class: 'cc-enamel-bar' },
      h('div', { class: 'cc-tools-cluster' }, this.pencilBtn, this.brushGroup, this.wandBtn),
      h('span', { class: 'cc-dock-sep', 'aria-hidden': 'true' }),
      this.swatchRow,
    );

    this.dock = h(
      'nav',
      { class: 'cc-dock cc-enamel-dock', 'aria-label': 'Midnight-Enamel Art Dock' },
      this.toolTagEl,
      enamelBar,
    );

    document.addEventListener('pointerdown', this.onDocPointerDown);
    window.addEventListener('keydown', this.onKeyDown);
  }

  bind(cb: UiCallbacks, cache: IllustrationCache): void {
    this.cb = cb;
    this.cache = cache;
    this.hydrateStaticSprites(cache);
    if (this.last) {
      const l = this.last;
      this.last = null;
      this.sig = { materials: '__init__', brushes: '__init__', strip: '__init__', questsOrder: '__init__' };
      for (const m of this.medallions.values()) m.renderedLit = null;
      this.update(l);
    }
  }

  private hydrateStaticSprites(cache: IllustrationCache): void {
    cache.mountInto(this.jarArtSlot, { type: 'uiSprite', id: 'tool_crystal_jar' }, 34, 34, 'cc-jar-pix');
    cache.mountInto(this.affordableIconSlot, { type: 'uiSprite', id: 'tool_gift' }, 18, 18);
    cache.mountInto(this.audioIconSlot, { type: 'uiSprite', id: AUDIO_SPRITE[this.audioLevel] }, 28, 28);
    cache.mountInto(this.settingsIconSlot, { type: 'uiSprite', id: 'tool_settings' }, 26, 26);
    cache.mountInto(this.menuHintIconSlot, { type: 'uiSprite', id: 'tool_lantern' }, 22, 22);
    cache.mountInto(this.menuHubIconSlot, { type: 'uiSprite', id: 'tool_back' }, 22, 22);
    cache.mountInto(this.skipIconSlot, { type: 'uiSprite', id: 'tool_skip' }, 22, 22);
    cache.mountInto(this.lanternIconSlot, { type: 'uiSprite', id: 'tool_lantern' }, 36, 36);
    cache.mountInto(this.finaleRingIconSlot, { type: 'uiSprite', id: 'tool_turn' }, 22, 22);
    cache.mountInto(this.turnNowIconSlot, { type: 'uiSprite', id: 'tool_turn' }, 22, 22);
    cache.mountInto(this.stayIconSlot, { type: 'uiSprite', id: 'tool_stay' }, 20, 20);
    cache.mountInto(this.toolTagIconSlot, { type: 'uiSprite', id: 'tool_star' }, 18, 18);
    cache.mountInto(this.pencilIconSlot, { type: 'uiSprite', id: 'tool_pencil' }, TOOL_PX, TOOL_PX);
    cache.mountInto(this.wandIconSlot, { type: 'uiSprite', id: 'tool_wand' }, TOOL_PX, TOOL_PX);
  }

  setMode(mode: AppMode): void {
    this.appMode = mode;
    const label =
      mode === 'chapter'
        ? "Prism Stardust Crystals — tap to return to Violet's Desk"
        : 'Prism Stardust Crystals';
    this.crystalJar.setAttribute('aria-label', label);
    this.crystalJar.title = label;
    if (mode !== 'chapter') {
      this.hideToolTag();
      this.setSettingsOpen(false);
    }
  }

  setTitle(t: string): void {
    if (t === this.title) return;
    this.title = t;
    this.spineTitle.textContent = t;
  }

  setSlot(slot: number): void {
    const safe = Math.max(0, Math.min(5, Math.floor(slot || 0)));
    if (safe === this.lastSlot) return;
    this.lastSlot = safe;
    this.voyageSpine.dataset.slot = String(safe);
    this.spineNodes.forEach((node, idx) => {
      const n = idx + 1;
      const done = safe > 0 && n < safe;
      const current = safe > 0 && n === safe;
      node.classList.toggle('is-done', done);
      node.classList.toggle('is-current', current);
      node.classList.toggle('is-upcoming', !done && !current);
      if (current) node.setAttribute('aria-current', 'step');
      else node.removeAttribute('aria-current');
    });
  }

  private setUniverseMeta(s: HudState): void {
    const num = s.universeNumber;
    const total = s.totalUniverses ?? 21;
    if (num !== undefined && num >= 1) {
      const tag = `U${num}`;
      if (this.spineUniBadge.textContent !== tag) this.spineUniBadge.textContent = tag;
      const tip = s.universeName ? `Universe ${num} of ${total}: ${s.universeName}` : `Universe ${num} of ${total}`;
      this.spineUniBadge.title = tip;
      this.spineUniBadge.setAttribute('aria-label', tip);
      setShown(this.spineUniBadge, true);
    } else {
      setShown(this.spineUniBadge, false);
    }

    const frontierFinale = Boolean(s.slot === 5 && s.isFrontierUniverse && num !== undefined && num < total);
    this.spinePill.classList.toggle('is-frontier-finale', frontierFinale);
    if (frontierFinale) {
      const nextNum = num! + 1;
      const text = `Unlocks #${nextNum}!`;
      if (this.spineUnlockChip.textContent !== text) this.spineUnlockChip.textContent = text;
      this.spineUnlockChip.title = s.nextUnlockName
        ? `Final page unlocks #${nextNum} ${s.nextUnlockName}!`
        : `Final page unlocks Universe #${nextNum}!`;
      setShown(this.spineUnlockChip, true);
    } else {
      setShown(this.spineUnlockChip, false);
    }
  }

  setGems(n: number): void {
    const safe = Math.max(0, Math.floor(n));
    const s = String(safe);
    if (this.gemsText.textContent !== s) {
      const up = this.lastGems >= 0 && safe > this.lastGems;
      this.gemsText.textContent = s;
      this.crystalJar.dataset.gems = s;
      if (up) boing(this.crystalJar, 'press');
    }
    this.lastGems = safe;
  }

  setAffordable(affordable: boolean): void {
    const val = affordable ? 'true' : 'false';
    if (this.crystalJar.dataset.affordable === val) return;
    this.crystalJar.dataset.affordable = val;
    this.crystalJar.classList.toggle('has-affordable', affordable);
    setShown(this.affordableBadge, affordable);
  }

  setAudio(level: AudioLevel): void {
    const spriteId = AUDIO_SPRITE[level];
    if (this.audioLevel === level && this.audioBtn.dataset.level === String(level)) {
      if (this.cache) this.cache.mountInto(this.audioIconSlot, { type: 'uiSprite', id: spriteId }, 28, 28);
      return;
    }
    this.audioLevel = level;
    this.audioBtn.dataset.level = String(level);
    this.audioBtn.setAttribute('aria-label', AUDIO_LABEL[level]);
    this.audioBtn.title = AUDIO_LABEL[level];
    if (this.cache) {
      this.cache.mountInto(this.audioIconSlot, { type: 'uiSprite', id: spriteId }, 28, 28);
    }
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
    for (const el of items) boing(el, 'appear', 20 * i++);
  }

  /** Show the <=4-word whisper micro-tag above the dock and auto-fade after TOOL_TAG_DURATION_MS. */
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

  /** Returns viewport center of a Right-Margin Story Quest Medallion (for star threads & hint beams). */
  getMedallionCenter(questId: StoryMilestoneKind): { x: number; y: number; el: HTMLElement | null } {
    const entry = this.medallions.get(questId);
    const target = entry?.ring ?? entry?.btn ?? [...this.medallions.values()][0]?.btn ?? this.lanternBtn;
    const r = target.getBoundingClientRect();
    if (r.width > 0 && r.height > 0) {
      return { x: r.left + r.width / 2, y: r.top + r.height / 2, el: target };
    }
    const vw = typeof window !== 'undefined' ? window.innerWidth || 1366 : 1366;
    return { x: vw - 64, y: 220, el: target };
  }

  getLanternCenter(): { x: number; y: number } {
    const r = this.lanternBtn.getBoundingClientRect();
    if (r.width > 0 && r.height > 0) {
      return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
    }
    const vw = typeof window !== 'undefined' ? window.innerWidth || 1366 : 1366;
    return { x: vw - 64, y: 112 };
  }

  /** Pulse a Story Quest Medallion when its golden starlight thread arrives. */
  pulseMedallion(questId: StoryMilestoneKind): void {
    const entry = this.medallions.get(questId);
    if (!entry) return;
    entry.btn.classList.remove('is-star-burst');
    void entry.btn.offsetWidth;
    entry.btn.classList.add('is-star-burst');
    boing(entry.btn, 'select');
    this.schedule(() => entry.btn.classList.remove('is-star-burst'), 860);
  }

  /** Flash the Firefly Hint Lantern & matching Story Medallion when a hint beam launches. */
  flashHintOrigin(questId: HeroQuestId): void {
    this.lanternBtn.classList.remove('is-hint-firing');
    void this.lanternBtn.offsetWidth;
    this.lanternBtn.classList.add('is-hint-firing');
    boing(this.lanternBtn, 'press');
    this.schedule(() => this.lanternBtn.classList.remove('is-hint-firing'), 760);

    const entry = this.medallions.get(questId);
    if (entry) {
      entry.btn.classList.remove('is-hint-firing');
      void entry.btn.offsetWidth;
      entry.btn.classList.add('is-hint-firing');
      this.schedule(() => entry.btn.classList.remove('is-hint-firing'), 760);
    }
  }

  /** Flare a Left-Margin Sticker Relic Charm with gold sparkles and a <=2-word whisper tag. */
  pulseRelic(relic: RelicId, tag?: string): void {
    const el = this.stripRelicEls.get(relic);
    if (!el) return;
    el.classList.remove('is-flaring');
    void el.offsetWidth;
    el.classList.add('is-flaring');
    boing(el, 'select');

    const prevWhisper = el.querySelector('.cc-relic-whisper');
    if (prevWhisper) prevWhisper.remove();
    const whisperText = relicShortTag(relic, tag);
    const whisper = h('span', { class: 'cc-relic-whisper', role: 'status' }, whisperText);
    el.append(whisper);
    this.schedule(() => {
      el.classList.remove('is-flaring');
      whisper.remove();
    }, 1450);
  }

  /** Drop glowing faceted Prism Stardust Crystal sparks into the Top-Left Crystal Pill (ZERO inline SVG). */
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
      this.jarDropHost.append(shard);
      this.schedule(() => shard.remove(), 750 + i * 75);
    }
  }

  update(s: HudState): void {
    const prev = this.last;
    this.last = s;
    this.setTitle(s.chapterTitle);
    this.setSlot(s.slot);
    this.setUniverseMeta(s);
    this.setGems(s.gems);
    this.setAudio(s.audioLevel);

    const affordable =
      s.hasAffordableUnlock !== undefined
        ? s.hasAffordableUnlock
        : s.materials.some((m) => !m.unlocked && m.def.tier === 'unlockable' && s.gems >= m.def.unlockCost);
    this.setAffordable(affordable);

    if (!this.cache) return;

    // Effective tool mode ('pencil' | 'wand')
    const toolMode: ToolMode = s.toolMode ?? (s.doodle ? 'wand' : 'pencil');
    const isPencil = toolMode === 'pencil';
    const isWand = toolMode === 'wand';
    const specialBrushActive = isPencil && s.selectedBrush !== 'standard';
    this.pencilBtn.classList.toggle('is-on', isPencil);
    this.pencilBtn.classList.toggle('is-brush-active', specialBrushActive);
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

    // Drafted magical brushes in the floating midnight-enamel dock (never duplicate standard pencil!)
    const draftedBrushes = s.brushes.filter((b) => b !== 'standard');
    const showBrushes = draftedBrushes.length > 0;
    setShown(this.brushGroup, showBrushes);
    const bsig = draftedBrushes.join(',');
    if (bsig !== this.sig.brushes) {
      this.sig.brushes = bsig;
      this.buildBrushes(draftedBrushes);
      this.brushGroup.dataset.sel = '';
    }
    this.brushGroup.dataset.sel = s.selectedBrush;
    for (const [id, el] of this.brushEls) {
      const on = isPencil && id === s.selectedBrush;
      el.setAttribute('aria-checked', String(on));
      el.classList.toggle('is-on', on);
    }

    // Left-Margin Equipped Brush & Sticker Relic Charm Strip
    const stripSig = `${draftedBrushes.join(',')}|${s.relics.join(',')}`;
    if (stripSig !== this.sig.strip) {
      const prevRelics = new Set((prev?.relics ?? []));
      const freshRelics = prev ? s.relics.filter((r) => !prevRelics.has(r)) : [];
      this.sig.strip = stripSig;
      this.buildCharmStrip(draftedBrushes, s.relics, freshRelics);
    }
    for (const [id, el] of this.stripBrushEls) {
      const on = isPencil && id === s.selectedBrush;
      el.classList.toggle('is-active', on);
      el.setAttribute('aria-pressed', String(on));
    }

    // Firefly Hint Lantern live pulse
    const hintActive = Boolean(s.hintState?.active);
    this.lanternBtn.classList.toggle('is-hint-active', hintActive);
    this.lanternBtn.dataset.hintActive = hintActive ? 'true' : 'false';

    // Right-Margin Tethered Circular Cloisonne Story Quest Medallions (3..4)
    const quests = resolveQuests(s);
    this.syncMedallions(quests, s.hintState?.active ? s.hintState.questId : null);

    // Bottom-Right Celebratory Auto-Turning Page Ribbon
    this.syncPageFinale(s.pageFinale, s.pageComplete, prev);
  }

  destroy(): void {
    this.clearTagTimers();
    if (this.jarClinkTimer) {
      clearTimeout(this.jarClinkTimer);
      this.jarClinkTimer = null;
    }
    for (const t of this.timers) clearTimeout(t);
    this.timers.clear();
    document.removeEventListener('pointerdown', this.onDocPointerDown);
    window.removeEventListener('keydown', this.onKeyDown);
  }

  private schedule(fn: () => void, ms: number): void {
    const id = setTimeout(() => {
      this.timers.delete(id);
      fn();
    }, ms);
    this.timers.add(id);
  }

  private setSettingsOpen(open: boolean): void {
    if (this.settingsOpen === open) return;
    this.settingsOpen = open;
    this.settingsBtn.setAttribute('aria-expanded', String(open));
    this.settingsBtn.classList.toggle('is-open', open);
    this.cornerRight.classList.toggle('is-menu-open', open);
    setShown(this.settingsPopover, open);
    if (open) boing(this.settingsPopover, 'appear');
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
    this.cb?.onUiFoley?.('crystalChime');
    if (mode === 'pencil' && this.last?.prologueActive) {
      this.cb?.onDismissPrologue?.();
    }
    const cur = this.currentToolMode();
    if (this.cb?.onSelectToolMode) {
      this.cb.onSelectToolMode(mode);
    } else if (cur !== mode) {
      this.cb?.onToggleDoodle();
    }
    if (mode === 'pencil' && this.last && this.last.selectedBrush !== 'standard') {
      this.cb?.onSelectBrush('standard');
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

  private syncMedallions(quests: HeroStoryQuest[], hintedQuestId: HeroQuestId | null): void {
    const cache = this.cache;
    if (!cache) return;
    const orderSig = quests.map((q) => q.questId).join(',');
    const keep = new Set(quests.map((q) => q.questId));
    for (const [id, entry] of this.medallions) {
      if (!keep.has(id)) {
        entry.btn.remove();
        this.medallions.delete(id);
      }
    }

    quests.forEach((quest, idx) => {
      let entry = this.medallions.get(quest.questId);
      const prevLit = entry?.quest.completed ?? false;
      if (!entry) {
        const qId = quest.questId;
        const disc = h('span', { class: 'cc-medallion-disc' });
        const sealSlot = spriteBox('cc-medallion-seal', cache.sprite('tool_star', 16));
        const ring = h('span', { class: 'cc-medallion-ring' }, disc, sealSlot);
        const caption = h('span', { class: 'cc-medallion-label' }, clampWords(quest.label, 2));
        const b = button(
          'cc-story-medallion',
          `Find ${quest.label}`,
          () => {
            const cur = this.medallions.get(qId)?.quest;
            if (!cur) return;
            if (!cur.completed) {
              boing(b, 'press');
              this.cb?.onUiFoley?.('lanternChime');
              this.cb?.onRequestHint?.(qId);
              this.cb?.onHighlightMilestone?.(qId);
            } else {
              boing(b, 'select');
              this.cb?.onUiFoley?.('wispChime');
            }
          },
          h('span', { class: 'cc-medallion-inner' }, ring, caption),
        );
        b.dataset.quest = qId;
        b.dataset.milestone = qId;
        entry = { btn: b, ring, disc, sealSlot, caption, quest, renderedLit: null };
        this.medallions.set(qId, entry);
      }

      entry.quest = quest;
      const lit = quest.completed;
      const prog = lit ? 1 : Math.max(0, Math.min(1, quest.progress));
      const highlighted = Boolean(quest.highlighted || quest.stalled || (hintedQuestId !== null && hintedQuestId === quest.questId));
      const stalled = Boolean(quest.stalled && !lit);

      entry.btn.classList.toggle('is-lit', lit);
      entry.btn.classList.toggle('is-highlighted', highlighted);
      entry.btn.classList.toggle('is-stalled', stalled);
      entry.btn.dataset.lit = lit ? 'true' : 'false';
      entry.btn.dataset.highlighted = highlighted ? 'true' : 'false';
      entry.btn.style.setProperty('--prog', prog.toFixed(3));
      entry.ring.style.setProperty('--prog', prog.toFixed(3));

      const shortLabel = clampWords(quest.label, 2);
      if (entry.caption.textContent !== shortLabel) entry.caption.textContent = shortLabel;
      const aria = lit ? `${shortLabel}: Story Medallion awake` : `Hint: ${shortLabel} (${Math.round(prog * 100)}%)`;
      entry.btn.setAttribute('aria-label', aria);
      entry.btn.title = aria;

      if (entry.renderedLit !== lit) {
        entry.renderedLit = lit;
        cache.mountInto(
          entry.disc,
          { type: 'questMedallion', quest: quest.questId, completed: lit },
          MEDALLION_PX,
          MEDALLION_PX,
          'cc-medallion-pix',
        );
      }

      if (!prevLit && lit && this.sig.questsOrder === orderSig) {
        boing(entry.btn, 'select');
      }

      if (this.medallionList.children[idx] !== entry.btn) {
        this.medallionList.insertBefore(entry.btn, this.medallionList.children[idx] ?? null);
      }
    });

    this.sig.questsOrder = orderSig;
  }

  private syncPageFinale(finale: PageFinaleState | undefined, pageComplete: boolean, prev: HudState | null): void {
    const visible = Boolean(finale?.active || pageComplete);
    const wasVisible = Boolean(prev?.pageFinale?.active || prev?.pageComplete);
    setShown(this.autoTurnRibbon, visible);
    if (!visible) {
      this.isStayAndDoodle = false;
      this.autoTurnRibbon.dataset.stay = 'false';
      return;
    }

    const stay = Boolean(finale?.stayAndDoodle);
    this.isStayAndDoodle = stay;
    this.autoTurnRibbon.dataset.stay = stay ? 'true' : 'false';
    this.autoTurnRibbon.classList.toggle('is-staying', stay);
    this.stayDoodleBtn.setAttribute('aria-pressed', String(stay));

    // When Stay & Doodle is active, pause/hide the countdown sweep and switch cleanly to a calm glowing Turn Page -> button
    setShown(this.finaleStatusEl, !stay);
    setShown(this.stayDoodleBtn, !stay);

    const prog = finale ? Math.max(0, Math.min(1, finale.progress)) : 0;
    this.finaleRingEl.style.setProperty('--finale-prog', prog.toFixed(3));

    if (!wasVisible) {
      boing(this.autoTurnRibbon, 'appear');
    }
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
          this.cb?.onUiFoley?.('crystalChime');
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
    const cache = this.cache;
    if (!cache) return;
    clear(this.brushGroup);
    this.brushEls.clear();
    for (const id of list) {
      const ico = spriteBox('cc-ico cc-brush-ico', cache.canvas({ type: 'brushIcon', brush: id }, 32, 32));
      const b = button(
        'cc-enamel-tool cc-brush',
        BRUSH_NAMES[id],
        () => {
          boing(b, 'select');
          this.cb?.onUiFoley?.('crystalChime');
          if (this.currentToolMode() === 'wand') {
            if (this.cb?.onSelectToolMode) this.cb.onSelectToolMode('pencil');
            else this.cb?.onToggleDoodle();
          }
          this.cb?.onSelectBrush(id);
          this.showToolTag(BRUSH_TAGS[id]);
        },
        ico,
      );
      b.setAttribute('role', 'radio');
      b.setAttribute('aria-checked', 'false');
      b.dataset.brush = id;
      this.brushEls.set(id, b);
      this.brushGroup.append(b);
    }
  }

  private buildCharmStrip(draftedBrushes: BrushId[], relics: RelicId[], freshRelics: RelicId[]): void {
    const cache = this.cache;
    if (!cache) return;
    clear(this.relicList);
    this.stripBrushEls.clear();
    this.stripRelicEls.clear();

    const hasAny = draftedBrushes.length > 0 || relics.length > 0;
    setShown(this.relicStrip, hasAny);
    if (!hasAny) return;

    for (const brush of draftedBrushes) {
      const b = button(
        'cc-charm-badge cc-charm-brush',
        BRUSH_NAMES[brush],
        () => {
          boing(b, 'select');
          this.cb?.onUiFoley?.('crystalChime');
          if (this.currentToolMode() === 'wand') {
            if (this.cb?.onSelectToolMode) this.cb.onSelectToolMode('pencil');
            else this.cb?.onToggleDoodle();
          }
          this.cb?.onSelectBrush(brush);
          this.showToolTag(BRUSH_TAGS[brush]);
        },
        cache.canvas({ type: 'brushIcon', brush }, STICKER_PX, STICKER_PX, 'cc-charm-pix'),
      );
      b.dataset.brush = brush;
      b.setAttribute('aria-pressed', 'false');
      this.stripBrushEls.set(brush, b);
      this.relicList.append(b);
    }

    for (const r of relics) {
      const def = DRAFT_CARDS.find((c) => c.id === r);
      const name = def?.name ?? r;
      const badge = h(
        'div',
        { class: 'cc-charm-badge cc-charm-relic', title: name, role: 'img', 'aria-label': name, 'data-relic': r },
        cache.canvas({ type: 'relicSticker', relic: r }, STICKER_PX, STICKER_PX, 'cc-charm-pix'),
      );
      this.stripRelicEls.set(r, badge);
      this.relicList.append(badge);
      if (freshRelics.includes(r)) boing(badge, 'appear');
    }
  }
}
