// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  CHAPTERS,
  DRAFT_CARDS,
  MATERIALS,
  TOOL_TAG_DURATION_MS,
  WARDROBE_ITEMS,
} from '../../../src/contracts';
import type {
  AudioLevel,
  HeroStoryQuest,
  HubState,
  HudState,
  IllustrationKind,
  PixelImage,
  UiCallbacks,
  UiDeps,
  WardrobeState,
} from '../../../src/contracts';
import { createUi } from '../../../src/ui';

function mockCallbacks() {
  const cb: UiCallbacks = {
    onStartRun: vi.fn(),
    onContinueRun: vi.fn(),
    onSelectMaterial: vi.fn(),
    onSelectBrush: vi.fn(),
    onToggleDoodle: vi.fn(),
    onSelectToolMode: vi.fn(),
    onRequestHint: vi.fn(),
    onHighlightMilestone: vi.fn(),
    onStayAndDoodle: vi.fn(),
    onUiFoley: vi.fn(),
    onTurnPage: vi.fn(),
    onAudioCycle: vi.fn(),
    onUnlockMaterial: vi.fn(),
    onBuyWardrobe: vi.fn(),
    onToggleWardrobe: vi.fn(),
    onOpenBook: vi.fn(),
    onBookPage: vi.fn(),
    onCloseBook: vi.fn(),
    onSaveKeepsake: vi.fn(),
    onSaveBookKeepsake: vi.fn(),
    onExportVault: vi.fn(),
    onImportVault: vi.fn(),
    onBackToHub: vi.fn(),
    onGesture: vi.fn(),
    onHover: vi.fn(),
    onDismissPrologue: vi.fn(),
    onFinaleDone: vi.fn(),
  };
  return cb;
}

function mockDeps() {
  const illustration = vi.fn((_k: IllustrationKind, w: number, h: number): PixelImage => ({
    width: w,
    height: h,
    data: new Uint8ClampedArray(w * h * 4).fill(210),
  }));
  const clientToInternal = vi.fn((x: number, y: number) => (x >= 0 && y >= 0 && x < 480 && y < 270 ? { x, y } : null));
  const deps: UiDeps = { illustration, clientToInternal };
  return { deps, illustration, clientToInternal };
}

function sampleHeroQuests(): HeroStoryQuest[] {
  return [
    {
      questId: 'violet',
      label: 'Violet',
      thumbnailSpriteId: 'quest_violet',
      regionIds: [1, 2, 3, 4],
      progress: 1,
      completed: true,
      stalled: false,
      highlighted: false,
      x: 110,
      y: 165,
    },
    {
      questId: 'lumi',
      label: 'Lumi',
      thumbnailSpriteId: 'quest_lumi',
      regionIds: [5, 6, 7, 8],
      progress: 0.72,
      completed: false,
      stalled: true,
      highlighted: false,
      x: 225,
      y: 155,
    },
    {
      questId: 'nova',
      label: 'Nova',
      thumbnailSpriteId: 'quest_nova',
      regionIds: [9, 10, 11],
      progress: 0.25,
      completed: false,
      stalled: false,
      highlighted: true,
      x: 335,
      y: 170,
    },
    {
      questId: 'rocket',
      label: 'Paper Rocket',
      thumbnailSpriteId: 'quest_rocket',
      regionIds: [21],
      progress: 0,
      completed: false,
      stalled: false,
      highlighted: false,
      x: 390,
      y: 80,
    },
  ];
}

function emptyWardrobe(over: Partial<WardrobeState> = {}): WardrobeState {
  const w = {} as WardrobeState;
  for (const item of WARDROBE_ITEMS) w[item.id] = false;
  return { ...w, ...over };
}

function sampleHud(over: Partial<HudState> = {}): HudState {
  return {
    mode: 'chapter',
    chapterTitle: CHAPTERS[0]!.title,
    slot: 2,
    gems: 42,
    hasAffordableUnlock: true,
    materials: MATERIALS.map((def, i) => ({ def, unlocked: i < 7 })),
    selectedMaterial: 1,
    brushes: ['standard', 'turboCheetah', 'cometMeteor'],
    selectedBrush: 'standard',
    doodle: false,
    toolMode: 'pencil',
    relics: ['zoomiePaw', 'doubleMilkshake'],
    coreAwake: 4,
    coreTotal: 10,
    heroQuests: sampleHeroQuests(),
    hintState: {
      active: false,
      source: 'none',
      questId: null,
      targetRegionIds: [],
      remainingMs: 0,
      durationMs: 2500,
      dimAmount: 0,
    },
    pageFinale: {
      active: false,
      remainingMs: 2800,
      durationMs: 2800,
      progress: 0,
      stayAndDoodle: false,
      autoTurnTriggered: false,
    },
    wispPencilCue: false,
    prologueActive: false,
    pageComplete: false,
    audioLevel: 3,
    ...over,
  };
}

function sampleHub(over: Partial<HubState> = {}): HubState {
  return {
    gems: 35,
    badges: ['firstBloom', 'firstRun'],
    materials: MATERIALS.map((def, i) => ({ def, unlocked: i < 7 })),
    wardrobeOwned: ['violetPins'],
    wardrobe: emptyWardrobe({ violetPins: true }),
    storybooks: [
      { id: 'book-1', title: 'Aurora Voyage', galaxyName: 'Sparkle-Paws Aurora', createdAt: 1000, pageCount: 5, seed: 4242 },
      { id: 'book-2', title: 'Cheetah Comet', galaxyName: 'Golden Zoomie Nebula', createdAt: 2000, pageCount: 5 },
    ],
    hasRunInProgress: true,
    hasAffordableUnlock: true,
    audioLevel: 3,
    ...over,
  };
}

function setMatchMedia(opts: { standalone?: boolean; reducedMotion?: boolean } = {}) {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    configurable: true,
    value: vi.fn((q: string) => ({
      matches:
        (q.includes('display-mode: standalone') && Boolean(opts.standalone)) ||
        (q.includes('prefers-reduced-motion') && Boolean(opts.reducedMotion)),
      media: q,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })),
  });
}

function makePointerEvent(type: string, x: number, y: number, pointerId = 1): PointerEvent {
  const ev = new Event(type, { bubbles: true, cancelable: true }) as PointerEvent;
  Object.defineProperties(ev, {
    pointerId: { value: pointerId },
    clientX: { value: x },
    clientY: { value: y },
    pointerType: { value: 'touch' },
    button: { value: 0 },
    buttons: { value: type === 'pointerup' ? 0 : 1 },
    pressure: { value: 0.6 },
    tiltX: { value: 0 },
    tiltY: { value: 0 },
  });
  return ev;
}

describe('Midnight Cloisonne Storybook Frame & Hi-Bit HUD (UiPort)', () => {
  let root: HTMLElement;

  beforeEach(() => {
    setMatchMedia({ standalone: false, reducedMotion: true });
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockImplementation(
      (() => ({
        imageSmoothingEnabled: true,
        createImageData: (w: number, h: number) => ({ width: w, height: h, data: new Uint8ClampedArray(w * h * 4) }),
        putImageData: vi.fn(),
      })) as unknown as typeof HTMLCanvasElement.prototype.getContext,
    );
    document.body.innerHTML = '<div id="app"></div>';
    root = document.getElementById('app')!;
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
    document.body.innerHTML = '';
  });

  it('renders ZERO inline <svg> elements anywhere across HUD, Hub, and Modals; uses Hi-Bit <canvas class="cc-pix"> sprites', () => {
    const ui = createUi(root);
    const cb = mockCallbacks();
    const { deps, illustration } = mockDeps();
    ui.mount(cb, deps);
    ui.updateHud(sampleHud());
    ui.updateHub(sampleHub());
    ui.setMode('chapter');

    expect(root.querySelectorAll('svg').length).toBe(0);
    expect(root.querySelectorAll('canvas.cc-pix').length).toBeGreaterThan(20);

    // Requested deterministic uiSprite, brushIcon, and questMedallion kinds from IllustrationCache
    const kinds = illustration.mock.calls.map(([k]) => k.type);
    expect(kinds).toContain('uiSprite');
    expect(kinds).toContain('brushIcon');
    expect(kinds).toContain('questMedallion');
    expect(kinds).toContain('relicSticker');
    expect(kinds).toContain('material');
    expect(kinds).toContain('wardrobe');
    expect(kinds).toContain('portrait');

    void ui.showDraft(['cometMeteor', 'constellationCrown', 'starlightBubble']);
    expect(root.querySelectorAll('svg').length).toBe(0);
    void ui.showDoors(['cheetahSavannah', 'saturnRings']);
    expect(root.querySelectorAll('svg').length).toBe(0);
    void ui.showFinale('Celestial Midnight Galaxy');
    expect(root.querySelectorAll('svg').length).toBe(0);
  });

  it('renders Top Spine 5-Chapter Constellation Voyage Ribbon (1..5) and updates active/completed nodes', () => {
    const ui = createUi(root);
    const cb = mockCallbacks();
    const { deps } = mockDeps();
    ui.mount(cb, deps);
    ui.updateHud(sampleHud({ slot: 3, chapterTitle: CHAPTERS[3]!.title }));
    ui.setMode('chapter');

    const nodes = root.querySelectorAll<HTMLElement>('.cc-voyage-spine .cc-voyage-node');
    expect(nodes.length).toBe(5);
    expect(nodes[0]!.classList.contains('is-done')).toBe(true);
    expect(nodes[1]!.classList.contains('is-done')).toBe(true);
    expect(nodes[2]!.classList.contains('is-current')).toBe(true);
    expect(nodes[2]!.getAttribute('aria-current')).toBe('step');
    expect(nodes[3]!.classList.contains('is-upcoming')).toBe(true);
    expect(nodes[4]!.classList.contains('is-upcoming')).toBe(true);
    expect(root.querySelector('.cc-spine-title')?.textContent).toBe(CHAPTERS[3]!.title);
  });

  it('renders Firefly Hint Lantern & Right-Margin Circular Story Medallions with radial progress, <=2-word captions & hint beam', () => {
    const ui = createUi(root);
    const cb = mockCallbacks();
    const { deps } = mockDeps();
    ui.mount(cb, deps);
    ui.updateHud(sampleHud());
    ui.setMode('chapter');

    // Firefly Hint Lantern fires onRequestHint() + lanternChime
    const lantern = root.querySelector<HTMLButtonElement>('.cc-quest-rail .cc-hint-lantern[data-action="request-hint"]')!;
    expect(lantern.querySelector('canvas.cc-pix')).not.toBeNull();
    lantern.click();
    expect(cb.onUiFoley).toHaveBeenCalledWith('lanternChime');
    expect(cb.onRequestHint).toHaveBeenCalledWith();

    // 4 Circular Cloisonne Story Medallions with conic-gradient --prog, lit/highlighted/stalled classes & <=2-word labels
    const meds = root.querySelectorAll<HTMLButtonElement>('.cc-quest-rail .cc-story-medallion');
    expect(meds.length).toBe(4);
    for (const m of meds) {
      const label = m.querySelector('.cc-medallion-label')?.textContent?.trim() ?? '';
      expect(label.length).toBeGreaterThan(0);
      expect(label.split(/\s+/).length).toBeLessThanOrEqual(2);
      expect(m.querySelector('.cc-medallion-disc canvas.cc-pix')).not.toBeNull();
    }

    const violetMed = root.querySelector<HTMLButtonElement>('.cc-story-medallion[data-quest="violet"]')!;
    const lumiMed = root.querySelector<HTMLButtonElement>('.cc-story-medallion[data-quest="lumi"]')!;
    const novaMed = root.querySelector<HTMLButtonElement>('.cc-story-medallion[data-quest="nova"]')!;

    expect(violetMed.classList.contains('is-lit')).toBe(true);
    expect(violetMed.style.getPropertyValue('--prog')).toBe('1.000');
    expect(lumiMed.classList.contains('is-lit')).toBe(false);
    expect(lumiMed.classList.contains('is-stalled')).toBe(true);
    expect(lumiMed.classList.contains('is-highlighted')).toBe(true);
    expect(lumiMed.style.getPropertyValue('--prog')).toBe('0.720');
    expect(novaMed.classList.contains('is-highlighted')).toBe(true);

    // Tapping unlit medallion calls onRequestHint('lumi'), onHighlightMilestone('lumi'), and lanternChime
    vi.mocked(cb.onRequestHint!).mockClear();
    lumiMed.click();
    expect(cb.onUiFoley).toHaveBeenCalledWith('lanternChime');
    expect(cb.onRequestHint).toHaveBeenCalledWith('lumi');
    expect(cb.onHighlightMilestone).toHaveBeenCalledWith('lumi');

    // animateStarThread & animateHintBeam render pure CSS/HTML arcs in .cc-fx-overlay (zero SVG!)
    ui.animateStarThread?.('lumi', 210, 320);
    expect(root.querySelector('.cc-fx-overlay .cc-star-thread[data-quest="lumi"] .cc-arc-mote')).not.toBeNull();

    ui.animateHintBeam?.('nova', 410, 260);
    expect(root.querySelector('.cc-fx-overlay .cc-hint-beam[data-quest="nova"] .cc-arc-mote')).not.toBeNull();
    expect(root.querySelectorAll('.cc-fx-overlay svg').length).toBe(0);
  });

  it('renders Bottom-Right Auto-Turning Page Ribbon with countdown sweep, Turn Page ->, Stay & Doodle, and zero legacy text buttons', () => {
    const ui = createUi(root);
    const cb = mockCallbacks();
    const { deps } = mockDeps();
    ui.mount(cb, deps);
    ui.updateHud(sampleHud({ pageComplete: false }));
    ui.setMode('chapter');

    // Strict purge: ZERO legacy "Next Page" or "Turn early" anywhere
    const bodyText = root.textContent ?? '';
    expect(bodyText).not.toMatch(/Next Page/i);
    expect(bodyText).not.toMatch(/Turn early/i);

    const ribbon = root.querySelector<HTMLElement>('.cc-auto-turn-ribbon')!;
    expect(ribbon.hidden).toBe(true);

    // Optional Skip Page lives cleanly inside top-right settings popover (hidden by default)
    const popover = root.querySelector<HTMLElement>('.cc-settings-popover')!;
    const settingsBtn = root.querySelector<HTMLButtonElement>('.cc-settings-btn')!;
    expect(popover.hidden).toBe(true);
    settingsBtn.click();
    expect(popover.hidden).toBe(false);
    root.querySelector<HTMLButtonElement>('.cc-skip-page-btn[data-action="skip-page"]')!.click();
    expect(cb.onTurnPage).toHaveBeenCalledWith(true);
    expect(popover.hidden).toBe(true);

    // When pageFinale activates, celebratory ribbon appears with countdown sweep + Turn Page -> + Stay & Doodle
    ui.updateHud(
      sampleHud({
        pageComplete: true,
        pageFinale: {
          active: true,
          remainingMs: 1400,
          durationMs: 2800,
          progress: 0.5,
          stayAndDoodle: false,
          autoTurnTriggered: false,
        },
      }),
    );
    expect(ribbon.hidden).toBe(false);
    expect(ribbon.dataset.stay).toBe('false');
    const status = ribbon.querySelector<HTMLElement>('.cc-finale-status')!;
    const ring = ribbon.querySelector<HTMLElement>('.cc-finale-ring')!;
    const turnBtn = ribbon.querySelector<HTMLButtonElement>('.cc-turn-now-btn')!;
    const stayBtn = ribbon.querySelector<HTMLButtonElement>('.cc-stay-doodle-btn')!;

    expect(status.hidden).toBe(false);
    expect(status.textContent).toContain('Story Awake! Turning Page...');
    expect(ring.style.getPropertyValue('--finale-prog')).toBe('0.500');
    expect(turnBtn.textContent).toContain('Turn Page');
    expect(stayBtn.hidden).toBe(false);

    // Tapping Stay & Doodle calls onStayAndDoodle(true)
    stayBtn.click();
    expect(cb.onStayAndDoodle).toHaveBeenCalledWith(true);

    // When stayAndDoodle=true, countdown hides and ribbon switches cleanly to calm glowing Turn Page -> button
    ui.updateHud(
      sampleHud({
        pageComplete: true,
        pageFinale: {
          active: true,
          remainingMs: 1400,
          durationMs: 2800,
          progress: 0.5,
          stayAndDoodle: true,
          autoTurnTriggered: false,
        },
      }),
    );
    expect(ribbon.dataset.stay).toBe('true');
    expect(status.hidden).toBe(true);
    expect(stayBtn.hidden).toBe(true);
    expect(turnBtn.hidden).toBe(false);

    turnBtn.click();
    expect(cb.onUiFoley).toHaveBeenCalledWith('paperRustle');
    expect(cb.onTurnPage).toHaveBeenCalledWith(false);
  });

  it('renders Left-Margin Relic & Brush Charm Strip and flares gold sparkles + <=2-word tag on animateRelicPulse', () => {
    const ui = createUi(root);
    const cb = mockCallbacks();
    const { deps } = mockDeps();
    ui.mount(cb, deps);

    // Hidden when no drafted brushes and no relics
    ui.updateHud(sampleHud({ brushes: ['standard'], relics: [] }));
    ui.setMode('chapter');
    const strip = root.querySelector<HTMLElement>('.cc-relic-strip')!;
    expect(strip.hidden).toBe(true);

    // Shown with drafted brushes + sticker relics
    ui.updateHud(sampleHud({ brushes: ['standard', 'cometMeteor', 'starlightBubble'], relics: ['zoomiePaw', 'doubleMilkshake'] }));
    expect(strip.hidden).toBe(false);
    expect(strip.querySelectorAll('.cc-charm-brush').length).toBe(2);
    expect(strip.querySelectorAll('.cc-charm-relic').length).toBe(2);

    // Clicking a brush charm selects that brush directly
    strip.querySelector<HTMLButtonElement>('.cc-charm-brush[data-brush="cometMeteor"]')!.click();
    expect(cb.onSelectBrush).toHaveBeenCalledWith('cometMeteor');

    // animateRelicPulse flares badge and displays <=2-word whisper tag
    ui.animateRelicPulse?.('doubleMilkshake', 'Double Scoop');
    const charm = strip.querySelector<HTMLElement>('.cc-charm-relic[data-relic="doubleMilkshake"]')!;
    expect(charm.classList.contains('is-flaring')).toBe(true);
    const whisper = charm.querySelector<HTMLElement>('.cc-relic-whisper')!;
    expect(whisper.textContent).toBe('Double Scoop');
    expect(whisper.textContent!.trim().split(/\s+/).length).toBeLessThanOrEqual(2);
  });

  it('Top-Left Prism Crystal Pill displays "New Gift!" affordable badge, crystal drop sparks, and taps back to Hub', () => {
    const ui = createUi(root);
    const cb = mockCallbacks();
    const { deps } = mockDeps();
    ui.mount(cb, deps);
    ui.updateHud(sampleHud({ gems: 42, hasAffordableUnlock: true }));
    ui.setMode('chapter');

    const pill = root.querySelector<HTMLButtonElement>('.cc-crystal-jar')!;
    const badge = pill.querySelector<HTMLElement>('.cc-affordable-badge')!;
    expect(pill.dataset.gems).toBe('42');
    expect(pill.dataset.affordable).toBe('true');
    expect(badge.hidden).toBe(false);
    expect(badge.textContent).toContain('New Gift!');

    // Updating hasAffordableUnlock=false hides badge
    ui.updateHud(sampleHud({ gems: 4, hasAffordableUnlock: false }));
    expect(pill.dataset.affordable).toBe('false');
    expect(badge.hidden).toBe(true);

    // animateCrystalDrop spawns CSS diamond sparks & clinking class (zero SVG)
    ui.animateCrystalDrop?.(3);
    expect(pill.classList.contains('is-clinking')).toBe(true);
    expect(pill.querySelectorAll('.cc-crystal-drop').length).toBe(3);

    // Tapping pill in chapter mode returns to Hub with jarClink
    pill.click();
    expect(cb.onUiFoley).toHaveBeenCalledWith('jarClink');
    expect(cb.onBackToHub).toHaveBeenCalledTimes(1);
  });

  it('Floating Midnight-Enamel Art Dock handles Pencil, Wand, all drafted brushes, 17 mediums, and <=4-word auto-fading tag', () => {
    vi.useFakeTimers();
    const ui = createUi(root);
    const cb = mockCallbacks();
    const { deps } = mockDeps();
    ui.mount(cb, deps);
    ui.updateHud(
      sampleHud({
        wispPencilCue: true,
        prologueActive: true,
        materials: MATERIALS.map((def) => ({ def, unlocked: true })),
      }),
    );
    ui.setMode('chapter');

    expect(root.querySelector('.cc-rail')).toBeNull();
    expect(root.querySelectorAll('.cc-enamel-dock .cc-swatch').length).toBe(17);

    const pencil = root.querySelector<HTMLButtonElement>('.cc-tool-pencil[data-tool="pencil"]')!;
    const wand = root.querySelector<HTMLButtonElement>('.cc-tool-wand[data-tool="wand"]')!;
    const tag = root.querySelector<HTMLElement>('.cc-tool-tag')!;
    const tagText = root.querySelector<HTMLElement>('.cc-tool-tag-text')!;

    expect(pencil.classList.contains('is-on')).toBe(true);
    expect(pencil.classList.contains('is-wisp-cue')).toBe(true);
    expect(tag.hidden).toBe(true);

    pencil.click();
    expect(cb.onSelectToolMode).toHaveBeenCalledWith('pencil');
    expect(cb.onDismissPrologue).toHaveBeenCalledTimes(1);
    expect(tag.hidden).toBe(false);
    expect(tagText.textContent!.trim().split(/\s+/).length).toBeLessThanOrEqual(4);

    wand.click();
    expect(cb.onSelectToolMode).toHaveBeenCalledWith('wand');
    expect(tagText.textContent).toBe('Sky doodle & poke');

    // Clicking a drafted brush in Wand mode returns to Pencil + selects brush
    ui.updateHud(sampleHud({ toolMode: 'wand', doodle: true }));
    root.querySelector<HTMLButtonElement>('.cc-enamel-dock .cc-brush[data-brush="cometMeteor"]')!.click();
    expect(cb.onSelectToolMode).toHaveBeenLastCalledWith('pencil');
    expect(cb.onSelectBrush).toHaveBeenCalledWith('cometMeteor');

    // Selecting exotic material 17 (Royal Astral Velvet Gold) clamps whisper tag to <= 4 words
    ui.updateHud(sampleHud({ materials: MATERIALS.map((def) => ({ def, unlocked: true })) }));
    root.querySelector<HTMLButtonElement>('.cc-swatch[data-material="17"]')!.click();
    expect(cb.onSelectMaterial).toHaveBeenCalledWith(17);
    expect(tagText.textContent!.trim().split(/\s+/).length).toBeLessThanOrEqual(4);

    vi.advanceTimersByTime(TOOL_TAG_DURATION_MS);
    expect(tag.hidden).toBe(true);
  });

  it('cycles 4 distinct Hi-Bit audio sprite states (3 -> 2 -> 1 -> 0) and caches illustrations across frames', () => {
    const ui = createUi(root);
    const cb = mockCallbacks();
    const { deps, illustration } = mockDeps();
    ui.mount(cb, deps);
    const hud = sampleHud({ audioLevel: 3 });
    ui.updateHud(hud);
    ui.setMode('chapter');

    const audioBtn = root.querySelector<HTMLButtonElement>('.cc-audio')!;
    audioBtn.click();
    expect(cb.onAudioCycle).toHaveBeenCalledTimes(1);

    const spriteKeys = new Set<string>();
    for (const lvl of [3, 2, 1, 0] as AudioLevel[]) {
      ui.updateHud(sampleHud({ audioLevel: lvl }));
      expect(audioBtn.dataset.level).toBe(String(lvl));
      const key = audioBtn.querySelector<HTMLCanvasElement>('canvas.cc-pix')?.dataset.key ?? '';
      spriteKeys.add(key);
    }
    expect(spriteKeys.size).toBe(4);

    // Caching stability across repeated HUD updates (including fractional quest progress ticks)
    const callsAfterFirst = illustration.mock.calls.length;
    for (let i = 0; i < 10; i++) {
      const quests = sampleHeroQuests();
      quests[1]!.progress = 0.2 + i * 0.05;
      ui.updateHud({ ...hud, gems: 42 + i, heroQuests: quests, selectedMaterial: ((i % 7) + 1) as HudState['selectedMaterial'] });
    }
    expect(illustration.mock.calls.length).toBe(callsAfterFirst);
  });

  it('Hub renders all 10 Exotic Mediums, all 14 Wardrobe items with live portrait stage, pulsing "Ready to Unlock!", Bookshelf, Trinkets, and ZERO tabs', async () => {
    const ui = createUi(root);
    const cb = mockCallbacks();
    const { deps } = mockDeps();
    ui.mount(cb, deps);
    ui.updateHub(sampleHub({ gems: 25, hasRunInProgress: true, audioLevel: 2 }));
    ui.setMode('hub');

    // Zero tab strips
    expect(root.querySelector('.cc-tabs')).toBeNull();
    expect(root.querySelector('[role="tablist"]')).toBeNull();
    expect(root.querySelectorAll('[role="tab"]').length).toBe(0);

    // Voyage ribbon
    root.querySelector<HTMLButtonElement>('.cc-voyage-seal.cc-continue')!.click();
    expect(cb.onContinueRun).toHaveBeenCalledTimes(1);
    root.querySelector<HTMLButtonElement>('.cc-voyage-seal.cc-play')!.click();
    expect(cb.onStartRun).toHaveBeenCalledTimes(1);

    // 1. Paintbox Drawer -> ALL 10 Exotic Mediums (8..17), affordable ones have "Ready to Unlock!" badge
    root.querySelector<HTMLButtonElement>('.cc-station[data-station="paintbox"]')!.click();
    const shopItems = root.querySelectorAll<HTMLButtonElement>('.cc-drawer-paintbox .cc-shop-item');
    expect(shopItems.length).toBe(10);
    const mat13 = root.querySelector<HTMLButtonElement>('.cc-shop-item[data-material="13"]')!; // cost 10 <= 25
    const mat17 = root.querySelector<HTMLButtonElement>('.cc-shop-item[data-material="17"]')!; // cost 50 > 25
    expect(mat13.dataset.affordable).toBe('true');
    expect(mat13.querySelector('.cc-ready-badge')?.textContent).toBe('Ready to Unlock!');
    expect(mat17.dataset.affordable).toBe('false');
    expect(mat17.querySelector('.cc-ready-badge')).toBeNull();
    mat13.click();
    expect(cb.onUnlockMaterial).toHaveBeenCalledWith(13);

    // 2. Wardrobe Drawer -> Live Violet + Lumi + Nova stage + ALL 14 Wardrobe Accessories
    root.querySelector<HTMLButtonElement>('.cc-station[data-station="wardrobe"]')!.click();
    expect(root.querySelectorAll('.cc-drawer-wardrobe .cc-doll-card').length).toBe(3);
    const wardItems = root.querySelectorAll<HTMLButtonElement>('.cc-drawer-wardrobe .cc-ward-item');
    expect(wardItems.length).toBe(14);
    const headphones = root.querySelector<HTMLButtonElement>('.cc-ward-item[data-wardrobe="violetHeadphones"]')!; // cost 15 <= 25
    const halo = root.querySelector<HTMLButtonElement>('.cc-ward-item[data-wardrobe="violetSaturnHalo"]')!; // cost 35 > 25
    expect(headphones.dataset.affordable).toBe('true');
    expect(headphones.querySelector('.cc-ready-badge')?.textContent).toBe('Ready to Unlock!');
    expect(halo.dataset.affordable).toBe('false');
    headphones.click();
    expect(cb.onBuyWardrobe).toHaveBeenCalledWith('violetHeadphones');

    root.querySelector<HTMLButtonElement>('.cc-ward-item[data-wardrobe="violetPins"]')!.click();
    expect(cb.onToggleWardrobe).toHaveBeenCalledWith('violetPins');

    // 3. Bookshelf Drawer -> 8 pixel-art Constellation Seals, jewel-tone spines, Keepsake & open book
    root.querySelector<HTMLButtonElement>('.cc-station[data-station="bookshelf"]')!.click();
    const badges = root.querySelectorAll('.cc-drawer-bookshelf .cc-wax-badge');
    expect(badges.length).toBe(8);
    expect(badges[0]?.querySelector('canvas.cc-pix')).not.toBeNull();
    root.querySelector<HTMLButtonElement>('.cc-book-keepsake[data-keepsake-book="book-1"]')!.click();
    expect(cb.onSaveBookKeepsake).toHaveBeenCalledWith('book-1');
    root.querySelector<HTMLButtonElement>('.cc-book-spine[data-book="book-1"]')!.click();
    expect(cb.onOpenBook).toHaveBeenCalledWith('book-1');

    // 4. Trinkets Drawer -> Audio, Backup & Import
    root.querySelector<HTMLButtonElement>('.cc-station[data-station="trinkets"]')!.click();
    expect(root.querySelector<HTMLButtonElement>('.cc-trinket-audio')!.dataset.level).toBe('2');
    root.querySelector<HTMLButtonElement>('.cc-export')!.click();
    expect(cb.onExportVault).toHaveBeenCalledTimes(1);

    const fileInput = root.querySelector<HTMLInputElement>('input.cc-file')!;
    const payload = '{"format":"chroma-cosmos-vault","version":1}';
    const fakeFile = new File([payload], 'backup.json', { type: 'application/json' });
    Object.defineProperty(fileInput, 'files', { value: [fakeFile], configurable: true });
    fileInput.dispatchEvent(new Event('change'));
    await vi.waitFor(() => {
      expect(cb.onImportVault).toHaveBeenCalledWith(payload);
    });

    root.querySelector<HTMLButtonElement>('.cc-drawer-trinkets .cc-drawer-close')!.click();
    expect(root.querySelector<HTMLElement>('.cc-craft-overlay')!.hidden).toBe(true);
  });

  it('Astral Pencil Tin renders all 20 Sprint 2 draft cards cleanly, plus Star-Doors, Finale, Book viewer & PWA Install', async () => {
    const ui = createUi(root);
    const cb = mockCallbacks();
    const { deps } = mockDeps();
    ui.mount(cb, deps);

    // Draft modal with new Sprint 2 brush & relic cards
    const pDraft = ui.showDraft(['moonbeamQuill', 'constellationCrown', 'chromaticButterfly']);
    expect(cb.onUiFoley).toHaveBeenCalledWith('tinSnap');
    const cards = root.querySelectorAll<HTMLButtonElement>('.cc-card');
    expect(cards.length).toBe(3);
    const crownDef = DRAFT_CARDS.find((c) => c.id === 'constellationCrown')!;
    const crownCard = root.querySelector<HTMLButtonElement>('.cc-card[data-card="constellationCrown"]')!;
    expect(crownCard.textContent).toContain(crownDef.name);
    expect(crownCard.querySelector('canvas.cc-pix')).not.toBeNull();
    crownCard.click();
    await expect(pDraft).resolves.toBe('constellationCrown');

    // Star-Doors modal
    const pDoors = ui.showDoors(['bubbleTea', 'whaleSea']);
    expect(root.querySelectorAll('.cc-door').length).toBe(2);
    root.querySelector<HTMLButtonElement>('.cc-door[data-chapter="whaleSea"]')!.click();
    await expect(pDoors).resolves.toBe('whaleSea');

    // Finale modal
    const pFinale = ui.showFinale('The Velvet Astrolabe Galaxy');
    root.querySelector<HTMLElement>('.cc-finale')!.click();
    await expect(pFinale).resolves.toBeUndefined();
    expect(cb.onFinaleDone).toHaveBeenCalledTimes(1);

    // Book viewer + pointer forwarding
    const book = sampleHub().storybooks[0]!;
    ui.showBook(book, 1, 5);
    expect(root.querySelector('.cc-bookbar-page')?.textContent).toBe('Page 2 of 5');
    root.querySelector<HTMLButtonElement>('.cc-book-prev')!.click();
    expect(cb.onBookPage).toHaveBeenCalledWith(-1);
    root.querySelector<HTMLButtonElement>('.cc-keepsake')!.click();
    expect(cb.onSaveKeepsake).toHaveBeenCalledTimes(1);
    ui.canvasHost.dispatchEvent(makePointerEvent('pointerdown', 120, 90));
    ui.canvasHost.dispatchEvent(makePointerEvent('pointerup', 125, 92));
    expect(cb.onGesture).toHaveBeenCalledTimes(2);

    // PWA Install Star-Charm
    const wrap = root.querySelector<HTMLElement>('.cc-install-wrap')!;
    expect(wrap.hidden).toBe(true);
    const promptSpy = vi.fn(async () => undefined);
    window.dispatchEvent(Object.assign(new Event('beforeinstallprompt', { cancelable: true }), { prompt: promptSpy }));
    expect(wrap.hidden).toBe(false);
    root.querySelector<HTMLButtonElement>('.cc-install')!.click();
    await vi.waitFor(() => expect(promptSpy).toHaveBeenCalledTimes(1));
    expect(wrap.hidden).toBe(true);
  });
});
