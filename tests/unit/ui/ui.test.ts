// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { CHAPTERS, DRAFT_CARDS, MATERIALS, TOOL_TAG_DURATION_MS } from '../../../src/contracts';
import type {
  AudioLevel,
  HubState,
  HudState,
  IllustrationKind,
  PixelImage,
  StoryStarState,
  UiCallbacks,
  UiDeps,
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
    onHighlightMilestone: vi.fn(),
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
    data: new Uint8ClampedArray(w * h * 4).fill(200),
  }));
  const clientToInternal = vi.fn((x: number, y: number) => (x >= 0 && y >= 0 && x < 480 && y < 270 ? { x, y } : null));
  const deps: UiDeps = { illustration, clientToInternal };
  return { deps, illustration, clientToInternal };
}

function sampleStars(): StoryStarState[] {
  return [
    { id: 'violet', kind: 'violet', label: 'Violet', lit: true, progress: 1, regionIds: [1, 2, 3, 4], x: 100, y: 160 },
    { id: 'lumi', kind: 'lumi', label: 'Lumi', lit: false, progress: 0.5, regionIds: [5, 6, 7, 8], x: 220, y: 150 },
    { id: 'nova', kind: 'nova', label: 'Nova', lit: false, progress: 0, regionIds: [9, 10, 11], x: 340, y: 170 },
    { id: 'planet', kind: 'planet', label: 'Ringed Planet', lit: false, progress: 0, regionIds: [12, 13], x: 380, y: 70 },
    { id: 'cloud', kind: 'cloud', label: 'Space Clouds', lit: false, progress: 0, regionIds: [14, 15], x: 150, y: 65 },
  ];
}

function sampleHud(over: Partial<HudState> = {}): HudState {
  return {
    mode: 'chapter',
    chapterTitle: CHAPTERS[0]!.title,
    slot: 1,
    gems: 42,
    materials: MATERIALS.map((def, i) => ({ def, unlocked: i < 7 })),
    selectedMaterial: 1,
    brushes: ['standard', 'turboCheetah'],
    selectedBrush: 'standard',
    doodle: false,
    toolMode: 'pencil',
    relics: ['zoomiePaw'],
    coreAwake: 4,
    coreTotal: 10,
    storyStars: sampleStars(),
    wispPencilCue: false,
    prologueActive: false,
    pageComplete: false,
    audioLevel: 3,
    ...over,
  };
}

function sampleHub(over: Partial<HubState> = {}): HubState {
  return {
    gems: 50,
    badges: ['firstBloom', 'firstRun'],
    materials: MATERIALS.map((def, i) => ({ def, unlocked: i < 7 })),
    wardrobeOwned: ['violetPins'],
    wardrobe: {
      violetPins: true,
      violetCape: false,
      lumiWings: false,
      lumiCrown: false,
      novaBoosters: false,
      novaScarf: false,
    },
    storybooks: [
      { id: 'book-1', title: 'Aurora Voyage', galaxyName: 'Sparkle-Paws Aurora', createdAt: 1000, pageCount: 5, seed: 4242 },
      { id: 'book-2', title: 'Cheetah Comet', galaxyName: 'Golden Zoomie Nebula', createdAt: 2000, pageCount: 5 },
    ],
    hasRunInProgress: true,
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

describe('Wanderlings Cozy Tabletop Sketchbook UI (UiPort)', () => {
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

  it('wooden groove handles Enchanted Pencil vs Starlight Wand, wisp cue, brush notches, mediums, foley, and <=4-word auto-fading micro-tag', () => {
    vi.useFakeTimers();
    const ui = createUi(root);
    const cb = mockCallbacks();
    const { deps } = mockDeps();
    ui.mount(cb, deps);
    ui.updateHud(sampleHud({ wispPencilCue: true, prologueActive: true }));
    ui.setMode('chapter');

    // Anti-clutter: ZERO side rails; all tools & unlocked mediums live in the single carved wooden groove
    expect(root.querySelector('.cc-rail')).toBeNull();
    expect(root.querySelectorAll('.cc-swatch').length).toBe(7);

    const pencil = root.querySelector<HTMLButtonElement>('.cc-tool-pencil[data-tool="pencil"]')!;
    const wand = root.querySelector<HTMLButtonElement>('.cc-tool-wand[data-tool="wand"]')!;
    const tag = root.querySelector<HTMLElement>('.cc-tool-tag')!;
    const tagText = root.querySelector<HTMLElement>('.cc-tool-tag-text')!;

    expect(pencil.classList.contains('is-on')).toBe(true);
    expect(pencil.classList.contains('is-wisp-cue')).toBe(true);
    expect(root.querySelector<HTMLElement>('.cc-root')?.dataset.prologue).toBe('true');
    expect(tag.hidden).toBe(true);

    // Clicking Enchanted Pencil fires woodTap, onSelectToolMode('pencil'), onDismissPrologue, and <=4-word micro-tag
    pencil.click();
    expect(cb.onUiFoley).toHaveBeenCalledWith('woodTap');
    expect(cb.onSelectToolMode).toHaveBeenCalledWith('pencil');
    expect(cb.onDismissPrologue).toHaveBeenCalledTimes(1);
    expect(tag.hidden).toBe(false);
    expect(tagText.textContent).toBe('Color shapes to wake');
    expect(tagText.textContent!.trim().split(/\s+/).length).toBeLessThanOrEqual(4);

    // Clicking Starlight Wand fires woodTap, onSelectToolMode('wand'), and <=4-word micro-tag
    wand.click();
    expect(cb.onSelectToolMode).toHaveBeenCalledWith('wand');
    expect(tagText.textContent).toBe('Sky doodle & poke');
    expect(tagText.textContent!.trim().split(/\s+/).length).toBeLessThanOrEqual(4);

    // Selecting a drafted special brush while in Wand mode switches back to Pencil, fires onSelectBrush + woodTap
    ui.updateHud(sampleHud({ toolMode: 'wand', doodle: true }));
    const cheetahBrush = root.querySelector<HTMLButtonElement>('.cc-wood-groove .cc-brush[data-brush="turboCheetah"]')!;
    cheetahBrush.click();
    expect(cb.onSelectToolMode).toHaveBeenLastCalledWith('pencil');
    expect(cb.onSelectBrush).toHaveBeenCalledWith('turboCheetah');
    expect(tagText.textContent!.trim().split(/\s+/).length).toBeLessThanOrEqual(4);

    // Selecting unlocked material 6 fires woodTap + onSelectMaterial(6) + <=4-word tag
    root.querySelector<HTMLButtonElement>('.cc-swatch[data-material="6"]')!.click();
    expect(cb.onSelectMaterial).toHaveBeenCalledWith(6);
    expect(tagText.textContent).toBe('Rainbow Prism Wax');
    expect(tagText.textContent!.trim().split(/\s+/).length).toBeLessThanOrEqual(4);

    // Whisper micro-tag auto-fades cleanly after TOOL_TAG_DURATION_MS (2500ms)
    expect(tag.hidden).toBe(false);
    vi.advanceTimersByTime(TOOL_TAG_DURATION_MS);
    expect(tag.hidden).toBe(true);

    // Fallback when onSelectToolMode is omitted calls onToggleDoodle
    const cbLegacy = mockCallbacks();
    delete cbLegacy.onSelectToolMode;
    ui.mount(cbLegacy, deps);
    ui.updateHud(sampleHud({ doodle: false, toolMode: 'pencil' }));
    wand.click();
    expect(cbLegacy.onToggleDoodle).toHaveBeenCalledTimes(1);
  });

  it('renders Bookmark Story Star Sockets (3-5), fires onHighlightMilestone + wispChime on unlit tap, and animates starlight thread SVG', () => {
    const ui = createUi(root);
    const cb = mockCallbacks();
    const { deps } = mockDeps();
    ui.mount(cb, deps);
    ui.updateHud(sampleHud());
    ui.setMode('chapter');

    const sockets = root.querySelectorAll<HTMLButtonElement>('.cc-bookmark .cc-story-socket');
    expect(sockets.length).toBeGreaterThanOrEqual(3);
    expect(sockets.length).toBeLessThanOrEqual(5);

    const litSocket = root.querySelector<HTMLButtonElement>('.cc-story-socket[data-milestone="violet"]')!;
    const unlitSocket = root.querySelector<HTMLButtonElement>('.cc-story-socket[data-milestone="lumi"]')!;
    expect(litSocket.classList.contains('is-lit')).toBe(true);
    expect(unlitSocket.classList.contains('is-lit')).toBe(false);

    // Tapping unlit socket fires wispChime + onHighlightMilestone('lumi')
    unlitSocket.click();
    expect(cb.onUiFoley).toHaveBeenCalledWith('wispChime');
    expect(cb.onHighlightMilestone).toHaveBeenCalledWith('lumi');

    // animateStarThread mounts a golden SVG starlight Bézier arc in .cc-fx-overlay
    ui.animateStarThread?.('lumi', 210, 320);
    const thread = root.querySelector<HTMLElement>('.cc-fx-overlay .cc-star-thread[data-milestone="lumi"]');
    expect(thread).not.toBeNull();
    expect(thread?.querySelector('svg path.cc-thread-core')).not.toBeNull();
  });

  it('Corked Glass Apothecary Jar reflects gems, animates crystal drops, and taps back to Hub in chapter mode', () => {
    const ui = createUi(root);
    const cb = mockCallbacks();
    const { deps } = mockDeps();
    ui.mount(cb, deps);
    ui.updateHud(sampleHud({ gems: 42 }));
    ui.setMode('chapter');

    const jar = root.querySelector<HTMLButtonElement>('.cc-crystal-jar')!;
    expect(jar.dataset.gems).toBe('42');
    expect(jar.querySelector('.cc-gems-n')?.textContent).toBe('42');
    expect(jar.querySelectorAll('.cc-jar-shard').length).toBeGreaterThan(2);

    // animateCrystalDrop spawns faceted shard drops & clinking class
    ui.animateCrystalDrop?.(3);
    expect(jar.classList.contains('is-clinking')).toBe(true);
    expect(jar.querySelectorAll('.cc-crystal-drop').length).toBe(3);

    // Updating gems updates jar tag and crystal count
    ui.updateHud(sampleHud({ gems: 95 }));
    expect(jar.dataset.gems).toBe('95');
    expect(jar.querySelector('.cc-gems-n')?.textContent).toBe('95');

    // Tapping jar in chapter mode plays jarClink and returns to Violet's Desk Hub
    jar.click();
    expect(cb.onUiFoley).toHaveBeenCalledWith('jarClink');
    expect(cb.onBackToHub).toHaveBeenCalledTimes(1);
  });

  it('uses diegetic parchment dog-ears (bottom-right glowing vs top-right subtle) with ZERO Next Page / Turn early text buttons', () => {
    const ui = createUi(root);
    const cb = mockCallbacks();
    const { deps } = mockDeps();
    ui.mount(cb, deps);
    ui.updateHud(sampleHud({ pageComplete: false }));
    ui.setMode('chapter');

    // Purge check: ZERO "Next Page" or "Turn early" text buttons anywhere
    const allText = root.textContent ?? '';
    expect(allText).not.toMatch(/Next Page/i);
    expect(allText).not.toMatch(/Turn early/i);

    const nextDogEar = root.querySelector<HTMLButtonElement>('.cc-dogear-next[data-action="turn-next"]')!;
    const earlyDogEar = root.querySelector<HTMLButtonElement>('.cc-dogear-early[data-action="turn-early"]')!;
    expect(nextDogEar.textContent?.trim()).toBe('');
    expect(earlyDogEar.textContent?.trim()).toBe('');

    expect(nextDogEar.hidden).toBe(true);
    expect(earlyDogEar.hidden).toBe(false);

    earlyDogEar.click();
    expect(cb.onUiFoley).toHaveBeenCalledWith('paperRustle');
    expect(cb.onTurnPage).toHaveBeenCalledWith(true);

    // When pageComplete becomes true, bottom-right glowing dog-ear appears and top-right hides
    ui.updateHud(sampleHud({ pageComplete: true }));
    expect(nextDogEar.hidden).toBe(false);
    expect(earlyDogEar.hidden).toBe(true);

    // Tap works
    nextDogEar.click();
    expect(cb.onTurnPage).toHaveBeenCalledWith(false);

    // Inward-left drag/swipe (> 28px) also turns page
    vi.mocked(cb.onTurnPage).mockClear();
    nextDogEar.dispatchEvent(makePointerEvent('pointerdown', 1000, 650));
    nextDogEar.dispatchEvent(makePointerEvent('pointermove', 960, 648));
    nextDogEar.dispatchEvent(makePointerEvent('pointerup', 960, 648));
    expect(cb.onTurnPage).toHaveBeenCalledTimes(1);
    expect(cb.onTurnPage).toHaveBeenCalledWith(false);
  });

  it('corner brass bell audio cycles 4 distinct visual states (3 -> 2 -> 1 -> 0)', () => {
    const ui = createUi(root);
    const cb = mockCallbacks();
    const { deps } = mockDeps();
    ui.mount(cb, deps);
    ui.updateHud(sampleHud({ audioLevel: 3 }));
    ui.setMode('chapter');

    const audioBtn = root.querySelector<HTMLButtonElement>('.cc-audio')!;
    audioBtn.click();
    expect(cb.onAudioCycle).toHaveBeenCalledTimes(1);

    const svgs = new Set<string>();
    for (const lvl of [3, 2, 1, 0] as AudioLevel[]) {
      ui.updateHud(sampleHud({ audioLevel: lvl }));
      expect(audioBtn.dataset.level).toBe(String(lvl));
      svgs.add(audioBtn.innerHTML);
    }
    expect(svgs.size).toBe(4);
  });

  it('caches illustrations and avoids rebuilding them across repeated updateHud/updateHub frames', () => {
    const ui = createUi(root);
    const cb = mockCallbacks();
    const { deps, illustration } = mockDeps();
    ui.mount(cb, deps);

    const hud = sampleHud();
    ui.updateHud(hud);
    const callsAfterFirst = illustration.mock.calls.length;
    expect(callsAfterFirst).toBeGreaterThan(0);

    for (let i = 0; i < 10; i++) {
      ui.updateHud({ ...hud, gems: 42 + i, selectedMaterial: ((i % 7) + 1) as HudState['selectedMaterial'] });
    }
    expect(illustration.mock.calls.length).toBe(callsAfterFirst);

    const hub = sampleHub();
    ui.updateHub(hub);
    const callsAfterHub = illustration.mock.calls.length;
    ui.updateHub({ ...hub });
    expect(illustration.mock.calls.length).toBe(callsAfterHub);
  });

  it('Hub renders wax-sealed Voyage ribbon & 4 tabletop craft stations (Paintbox, Wardrobe Card, Bookshelf, Trinket Tray) with ZERO text tabs', async () => {
    const ui = createUi(root);
    const cb = mockCallbacks();
    const { deps } = mockDeps();
    ui.mount(cb, deps);
    ui.updateHub(sampleHub({ gems: 100, hasRunInProgress: true, audioLevel: 2 }));
    ui.setMode('hub');

    // ZERO old tab strips or "Mediums | Wardrobe | Badges | Books" text tabs
    expect(root.querySelector('.cc-tabs')).toBeNull();
    expect(root.querySelector('[role="tablist"]')).toBeNull();
    expect(root.querySelectorAll('[role="tab"]').length).toBe(0);

    // Wax-sealed parchment ribbon: Continue Voyage + New Voyage
    const continueBtn = root.querySelector<HTMLButtonElement>('.cc-voyage-seal.cc-continue')!;
    const newVoyageBtn = root.querySelector<HTMLButtonElement>('.cc-voyage-seal.cc-play')!;
    expect(continueBtn.textContent).toContain('Continue Voyage');
    expect(newVoyageBtn.textContent).toContain('New Voyage');

    continueBtn.click();
    expect(cb.onUiFoley).toHaveBeenCalledWith('paperRustle');
    expect(cb.onContinueRun).toHaveBeenCalledTimes(1);
    newVoyageBtn.click();
    expect(cb.onStartRun).toHaveBeenCalledTimes(1);

    // Verify all 4 tabletop craft stations exist
    const paintboxStation = root.querySelector<HTMLButtonElement>('.cc-station-paintbox[data-station="paintbox"]')!;
    const wardrobeStation = root.querySelector<HTMLButtonElement>('.cc-station-wardrobe[data-station="wardrobe"]')!;
    const bookshelfStation = root.querySelector<HTMLButtonElement>('.cc-station-bookshelf[data-station="bookshelf"]')!;
    const trinketsStation = root.querySelector<HTMLButtonElement>('.cc-station-trinkets[data-station="trinkets"]')!;
    expect([paintboxStation, wardrobeStation, bookshelfStation, trinketsStation].every(Boolean)).toBe(true);

    // 1. Hinged Wooden Paintbox -> unlock exotic medium 8 with woodTap + jarClink
    paintboxStation.click();
    expect(root.querySelector<HTMLElement>('.cc-drawer-paintbox')!.hidden).toBe(false);
    root.querySelector<HTMLButtonElement>('.cc-shop-item[data-material="8"]')!.click();
    expect(cb.onUiFoley).toHaveBeenCalledWith('woodTap');
    expect(cb.onUiFoley).toHaveBeenCalledWith('jarClink');
    expect(cb.onUnlockMaterial).toHaveBeenCalledWith(8);

    // 2. Paper-Doll Sticker Wardrobe Card -> shows Violet/Lumi/Nova previews & peels/buys stickers with stickerPeel
    wardrobeStation.click();
    expect(root.querySelector<HTMLElement>('.cc-drawer-wardrobe')!.hidden).toBe(false);
    expect(root.querySelectorAll('.cc-doll-card').length).toBe(3);

    root.querySelector<HTMLButtonElement>('.cc-ward-item[data-wardrobe="violetPins"]')!.click();
    expect(cb.onUiFoley).toHaveBeenCalledWith('stickerPeel');
    expect(cb.onToggleWardrobe).toHaveBeenCalledWith('violetPins');

    root.querySelector<HTMLButtonElement>('.cc-ward-item[data-wardrobe="violetCape"]')!.click();
    expect(cb.onBuyWardrobe).toHaveBeenCalledWith('violetCape');

    // 3. Warm Wooden Bookshelf -> wax-seal Constellation Badges, deterministic cloth spines, 1-tap Keepsake stamp, open book
    bookshelfStation.click();
    expect(root.querySelector<HTMLElement>('.cc-drawer-bookshelf')!.hidden).toBe(false);
    expect(root.querySelectorAll('.cc-wax-badge').length).toBe(8);
    expect(root.querySelector('.cc-wax-badge[data-badge="firstBloom"]')?.classList.contains('is-on')).toBe(true);

    const spine1 = root.querySelector<HTMLButtonElement>('.cc-book-spine[data-book="book-1"]')!;
    const spine2 = root.querySelector<HTMLButtonElement>('.cc-book-spine[data-book="book-2"]')!;
    expect(spine1.dataset.spineColor).toBeTruthy();
    expect(spine2.dataset.spineColor).toBeTruthy();

    // 1-tap Keepsake Postcard PNG brass stamp button
    root.querySelector<HTMLButtonElement>('.cc-book-keepsake[data-keepsake-book="book-1"]')!.click();
    expect(cb.onSaveBookKeepsake).toHaveBeenCalledWith('book-1');

    // Open storybook from cloth spine
    spine1.click();
    expect(cb.onOpenBook).toHaveBeenCalledWith('book-1');

    // 4. Brass Desk-Corner Trinket Tray -> Parent Volume Brass Bell (synced to HubState.audioLevel), Export & Import Wax Scroll
    trinketsStation.click();
    expect(root.querySelector<HTMLElement>('.cc-drawer-trinkets')!.hidden).toBe(false);
    const trinketBell = root.querySelector<HTMLButtonElement>('.cc-trinket-audio')!;
    expect(trinketBell.dataset.level).toBe('2');
    trinketBell.click();
    expect(cb.onAudioCycle).toHaveBeenCalledTimes(1);

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

    // Brass close clasp dismisses open craft drawer
    root.querySelector<HTMLButtonElement>('.cc-drawer-trinkets .cc-drawer-close')!.click();
    expect(root.querySelector<HTMLElement>('.cc-craft-overlay')!.hidden).toBe(true);
  });

  it('handles book viewer navigation, keepsake export, close, and Living Bookshelf pointer pokes', () => {
    const ui = createUi(root);
    const cb = mockCallbacks();
    const { deps } = mockDeps();
    ui.mount(cb, deps);
    const book = sampleHub().storybooks[0]!;
    ui.showBook(book, 1, 5);

    expect(root.querySelector('.cc-root')?.getAttribute('data-mode')).toBe('book');
    expect(root.querySelector('.cc-bookbar-page')?.textContent).toBe('Page 2 of 5');

    root.querySelector<HTMLButtonElement>('.cc-book-prev')!.click();
    expect(cb.onBookPage).toHaveBeenCalledWith(-1);

    root.querySelector<HTMLButtonElement>('.cc-book-next')!.click();
    expect(cb.onBookPage).toHaveBeenCalledWith(1);

    root.querySelector<HTMLButtonElement>('.cc-keepsake')!.click();
    expect(cb.onSaveKeepsake).toHaveBeenCalledTimes(1);

    root.querySelector<HTMLButtonElement>('.cc-book-back')!.click();
    expect(cb.onCloseBook).toHaveBeenCalledTimes(1);

    // Pointer events still forward in book mode
    ui.showBook(book, 0, 3);
    ui.canvasHost.dispatchEvent(makePointerEvent('pointerdown', 120, 90));
    ui.canvasHost.dispatchEvent(makePointerEvent('pointermove', 125, 92));
    ui.canvasHost.dispatchEvent(makePointerEvent('pointerup', 125, 92));
    expect(cb.onGesture).toHaveBeenCalledTimes(3);
  });

  it('Hinged Vintage Astral Pencil Tin, Star-Doors, and Illuminated Finale play foley and resolve cleanly', async () => {
    const ui = createUi(root);
    const cb = mockCallbacks();
    const { deps } = mockDeps();
    ui.mount(cb, deps);

    // 1. Hinged Vintage Metal Astral Pencil Tin
    const pDraft = ui.showDraft(['turboCheetah', 'prismRibbon', 'zeroGGel']);
    expect(cb.onUiFoley).toHaveBeenCalledWith('tinSnap');
    expect(root.querySelector('.cc-pencil-tin .cc-tin-lid-top')).not.toBeNull();
    expect(root.querySelector('.cc-pencil-tin .cc-tin-hinges')).not.toBeNull();

    const cards = root.querySelectorAll<HTMLButtonElement>('.cc-card');
    expect(cards.length).toBe(3);

    const prismDef = DRAFT_CARDS.find((c) => c.id === 'prismRibbon')!;
    const second = root.querySelector<HTMLButtonElement>('.cc-card[data-card="prismRibbon"]')!;
    expect(second.textContent).toContain(prismDef.name);
    expect(second.textContent).toContain(prismDef.description);
    expect(second.querySelector('canvas.cc-pix')).not.toBeNull();

    second.click();
    await expect(pDraft).resolves.toBe('prismRibbon');
    expect(cb.onUiFoley).toHaveBeenCalledWith('stickerPeel');

    // 2. Parchment Star-Doors with parting curtains
    const pDoors = ui.showDoors(['cheetahSavannah', 'saturnRings']);
    expect(root.querySelectorAll('.cc-door').length).toBe(2);
    expect(root.querySelector('.cc-curtain-l')).not.toBeNull();
    const saturn = root.querySelector<HTMLButtonElement>('.cc-door[data-chapter="saturnRings"]')!;
    expect(saturn.querySelector('canvas.cc-pix')).not.toBeNull();
    saturn.click();
    await expect(pDoors).resolves.toBe('saturnRings');
    expect(cb.onUiFoley).toHaveBeenCalledWith('paperRustle');

    // 3. Illuminated stitched title-plate Finale
    const pFinale = ui.showFinale('The Sparkle-Paws Aurora Spiral');
    expect(cb.onUiFoley).toHaveBeenCalledWith('wispChime');
    const modal = root.querySelector<HTMLElement>('.cc-finale')!;
    expect(modal.querySelector('.cc-finale-plate')).not.toBeNull();
    expect(modal.textContent).toContain('The Sparkle-Paws Aurora Spiral');
    modal.click();
    await expect(pFinale).resolves.toBeUndefined();
    expect(cb.onFinaleDone).toHaveBeenCalledTimes(1);
  });

  it('PWA Install Star-Charm inside Brass Trinket Tray obeys standalone, beforeinstallprompt, prompt(), dismiss, and appinstalled', async () => {
    // 1. Standalone mode: hidden even after beforeinstallprompt
    setMatchMedia({ standalone: true, reducedMotion: true });
    const uiStandalone = createUi(root);
    uiStandalone.mount(mockCallbacks(), mockDeps().deps);

    const wrap1 = root.querySelector<HTMLElement>('.cc-install-wrap')!;
    expect(wrap1.hidden).toBe(true);

    const bip1 = Object.assign(new Event('beforeinstallprompt', { cancelable: true }), {
      prompt: vi.fn(async () => undefined),
    });
    window.dispatchEvent(bip1);
    expect(bip1.defaultPrevented).toBe(true);
    expect(wrap1.hidden).toBe(true);

    // 2. Non-standalone mode: shown on beforeinstallprompt, tap calls prompt()
    document.body.innerHTML = '<div id="app"></div>';
    root = document.getElementById('app')!;
    setMatchMedia({ standalone: false, reducedMotion: true });

    const uiBrowser = createUi(root);
    uiBrowser.mount(mockCallbacks(), mockDeps().deps);
    const wrap2 = root.querySelector<HTMLElement>('.cc-install-wrap')!;
    const pip2 = root.querySelector<HTMLElement>('.cc-mini-install-pip')!;
    expect(wrap2.hidden).toBe(true);
    expect(pip2.hidden).toBe(true);

    const promptSpy = vi.fn(async () => undefined);
    const bip2 = Object.assign(new Event('beforeinstallprompt', { cancelable: true }), {
      prompt: promptSpy,
      userChoice: Promise.resolve({ outcome: 'accepted' as const }),
    });
    window.dispatchEvent(bip2);
    expect(bip2.defaultPrevented).toBe(true);
    expect(wrap2.hidden).toBe(false);
    expect(pip2.hidden).toBe(false);

    root.querySelector<HTMLButtonElement>('.cc-install')!.click();
    await vi.waitFor(() => expect(promptSpy).toHaveBeenCalledTimes(1));
    expect(wrap2.hidden).toBe(true);

    // 3. Re-trigger -> dismiss hides star-charm
    window.dispatchEvent(
      Object.assign(new Event('beforeinstallprompt', { cancelable: true }), { prompt: vi.fn(async () => undefined) }),
    );
    expect(wrap2.hidden).toBe(false);
    root.querySelector<HTMLButtonElement>('.cc-install-x')!.click();
    expect(wrap2.hidden).toBe(true);

    // 4. appinstalled hides visible star-charm
    document.body.innerHTML = '<div id="app"></div>';
    root = document.getElementById('app')!;
    const ui3 = createUi(root);
    ui3.mount(mockCallbacks(), mockDeps().deps);
    const wrap3 = root.querySelector<HTMLElement>('.cc-install-wrap')!;
    window.dispatchEvent(
      Object.assign(new Event('beforeinstallprompt', { cancelable: true }), { prompt: vi.fn() }),
    );
    expect(wrap3.hidden).toBe(false);
    window.dispatchEvent(new Event('appinstalled'));
    expect(wrap3.hidden).toBe(true);
  });

  it('updates mode data attribute cleanly (boot, turning, chapter, hub) and caps calm whisper toasts to max 1', () => {
    const ui = createUi(root);
    ui.mount(mockCallbacks(), mockDeps().deps);
    const shell = root.querySelector<HTMLElement>('.cc-root')!;
    expect(shell.dataset.mode).toBe('boot');

    ui.setMode('turning');
    expect(shell.dataset.mode).toBe('turning');

    ui.toast('First whisper');
    ui.toast('Sparkle unlocked!');
    const toasts = root.querySelectorAll('.cc-toast');
    expect(toasts.length).toBe(1);
    expect(toasts[0]?.textContent).toContain('Sparkle unlocked!');
  });

  it('scales hero pixel-art assets in Paintbox, Wardrobe, Bookshelf, Tin, and Star-Doors and renders craft accents', () => {
    const ui = createUi(root);
    ui.mount(mockCallbacks(), mockDeps().deps);
    ui.updateHub(sampleHub({ gems: 100 }));
    ui.setMode('hub');

    // Washi tape on Sticker Sheet station & drawer + twine eyelet on Apothecary Jar
    expect(root.querySelector('.cc-station-wardrobe .cc-washi-strip')).not.toBeNull();
    expect(root.querySelector('.cc-drawer-wardrobe .cc-drawer-washi.tl')).not.toBeNull();
    expect(root.querySelector('.cc-crystal-jar .cc-jar-eyelet')).not.toBeNull();

    // Hero pixel canvas dimensions (>= 64px in Paintbox, Wardrobe stickers, Cameo portraits & Bookshelf covers)
    const panCanvas = root.querySelector<HTMLCanvasElement>('.cc-drawer-paintbox .cc-shop-item canvas.cc-pix')!;
    expect(panCanvas.width).toBeGreaterThanOrEqual(64);
    expect(panCanvas.height).toBeGreaterThanOrEqual(64);

    const stickerCanvas = root.querySelector<HTMLCanvasElement>('.cc-drawer-wardrobe .cc-ward-item canvas.cc-pix')!;
    expect(stickerCanvas.width).toBeGreaterThanOrEqual(64);
    expect(stickerCanvas.height).toBeGreaterThanOrEqual(64);

    const portraitCanvas = root.querySelector<HTMLCanvasElement>('.cc-drawer-wardrobe .cc-doll-portrait canvas.cc-pix')!;
    expect(portraitCanvas.width).toBeGreaterThanOrEqual(72);
    expect(portraitCanvas.height).toBeGreaterThanOrEqual(80);

    const coverCanvas = root.querySelector<HTMLCanvasElement>('.cc-drawer-bookshelf .cc-cover-pix')!;
    expect(coverCanvas.width).toBeGreaterThanOrEqual(72);
    expect(coverCanvas.height).toBeGreaterThanOrEqual(84);

    // Star-Door keystone & vellum plaque
    void ui.showDoors(['cheetahSavannah', 'saturnRings']);
    expect(root.querySelector('.cc-door .cc-door-keystone')).not.toBeNull();
    expect(root.querySelector('.cc-door .cc-door-plaque')).not.toBeNull();
    const doorCanvas = root.querySelector<HTMLCanvasElement>('.cc-door-art canvas.cc-pix')!;
    expect(doorCanvas.width).toBeGreaterThanOrEqual(80);
    expect(doorCanvas.height).toBeGreaterThanOrEqual(120);
  });

  it('populates empty Hub bookshelf and unlit wax-seal badges on fresh save', () => {
    const ui = createUi(root);
    ui.mount(mockCallbacks(), mockDeps().deps);
    ui.updateHub(sampleHub({ badges: [], storybooks: [], hasRunInProgress: false }));
    ui.setMode('hub');

    expect(root.querySelector('.cc-voyage-seal.cc-play')?.textContent).toContain('Begin Voyage');
    expect(root.querySelector<HTMLButtonElement>('.cc-voyage-seal.cc-continue')!.hidden).toBe(true);
    expect(root.querySelectorAll('.cc-wax-badge').length).toBe(8);
    expect(root.querySelector('.cc-shelf-empty')?.textContent).toContain('Finish a voyage');
    for (const nav of root.querySelectorAll<HTMLButtonElement>('.cc-shelf-nav')) {
      expect(nav.hidden).toBe(true);
    }
  });
});
