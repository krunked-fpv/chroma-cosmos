// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { CHAPTERS, DRAFT_CARDS, MATERIALS } from '../../../src/contracts';
import type {
  AudioLevel,
  HubState,
  HudState,
  IllustrationKind,
  PixelImage,
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
    onTurnPage: vi.fn(),
    onAudioCycle: vi.fn(),
    onUnlockMaterial: vi.fn(),
    onBuyWardrobe: vi.fn(),
    onToggleWardrobe: vi.fn(),
    onOpenBook: vi.fn(),
    onBookPage: vi.fn(),
    onCloseBook: vi.fn(),
    onSaveKeepsake: vi.fn(),
    onExportVault: vi.fn(),
    onImportVault: vi.fn(),
    onBackToHub: vi.fn(),
    onGesture: vi.fn(),
    onHover: vi.fn(),
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
    relics: ['zoomiePaw'],
    coreAwake: 4,
    coreTotal: 10,
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
      { id: 'book-1', title: 'Aurora Voyage', galaxyName: 'Sparkle-Paws Aurora', createdAt: 1000, pageCount: 5 },
    ],
    hasRunInProgress: true,
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

describe('Sketchbook UI (UiPort)', () => {
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
    vi.restoreAllMocks();
    document.body.innerHTML = '';
  });

  it('fires chapter HUD callbacks: material, brush, doodle, audio cycle, next page vs early, back to hub', () => {
    const ui = createUi(root);
    const cb = mockCallbacks();
    const { deps } = mockDeps();
    ui.mount(cb, deps);
    ui.updateHud(sampleHud({ pageComplete: false }));
    ui.setMode('chapter');

    // Locked mediums are hidden in the dock (only 7 core unlocked)
    const swatches = root.querySelectorAll<HTMLButtonElement>('.cc-swatch');
    expect(swatches.length).toBe(7);

    // Select material 3
    root.querySelector<HTMLButtonElement>('.cc-swatch[data-material="3"]')!.click();
    expect(cb.onSelectMaterial).toHaveBeenCalledWith(3);

    // Select brush turboCheetah
    root.querySelector<HTMLButtonElement>('.cc-brush[data-brush="turboCheetah"]')!.click();
    expect(cb.onSelectBrush).toHaveBeenCalledWith('turboCheetah');

    // Toggle Free-Starlight Doodle
    root.querySelector<HTMLButtonElement>('.cc-doodle')!.click();
    expect(cb.onToggleDoodle).toHaveBeenCalledTimes(1);

    // Audio cycle + 4 distinct visual states
    const audioBtn = root.querySelector<HTMLButtonElement>('.cc-audio')!;
    audioBtn.click();
    expect(cb.onAudioCycle).toHaveBeenCalledTimes(1);
    const audioSvgs = new Set<string>();
    for (const lvl of [3, 2, 1, 0] as AudioLevel[]) {
      ui.updateHud(sampleHud({ audioLevel: lvl }));
      expect(audioBtn.dataset.level).toBe(String(lvl));
      audioSvgs.add(audioBtn.innerHTML);
    }
    expect(audioSvgs.size).toBe(4);

    // Early turn button visible when pageComplete is false
    const nextBtn = root.querySelector<HTMLButtonElement>('.cc-next')!;
    const earlyBtn = root.querySelector<HTMLButtonElement>('.cc-early')!;
    expect(nextBtn.hidden).toBe(true);
    expect(earlyBtn.hidden).toBe(false);
    earlyBtn.click();
    expect(cb.onTurnPage).toHaveBeenCalledWith(true);

    // Next Page button appears when pageComplete is true
    ui.updateHud(sampleHud({ pageComplete: true }));
    expect(nextBtn.hidden).toBe(false);
    expect(earlyBtn.hidden).toBe(true);
    nextBtn.click();
    expect(cb.onTurnPage).toHaveBeenCalledWith(false);

    // Back to hub
    root.querySelector<HTMLButtonElement>('.cc-home')!.click();
    expect(cb.onBackToHub).toHaveBeenCalledTimes(1);
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

    // Repeating updateHud with same or slightly changed numeric values should not call illustration again
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

  it('fires hub callbacks: play, continue, unlock medium, buy/toggle wardrobe, open book, export and import text', async () => {
    const ui = createUi(root);
    const cb = mockCallbacks();
    const { deps } = mockDeps();
    ui.mount(cb, deps);
    ui.updateHub(sampleHub({ gems: 100, hasRunInProgress: true }));
    ui.setMode('hub');

    root.querySelector<HTMLButtonElement>('.cc-continue')!.click();
    expect(cb.onContinueRun).toHaveBeenCalledTimes(1);

    root.querySelector<HTMLButtonElement>('.cc-play')!.click();
    expect(cb.onStartRun).toHaveBeenCalledTimes(1);

    // Unlock medium (id 8 = OpalPearl, cost 30 <= 100)
    root.querySelector<HTMLButtonElement>('.cc-shop-item[data-material="8"]')!.click();
    expect(cb.onUnlockMaterial).toHaveBeenCalledWith(8);

    // Wardrobe tab: toggle owned (violetPins) and buy unowned (violetCape, cost 25 <= 100)
    root.querySelector<HTMLButtonElement>('.cc-tab[data-tab="wardrobe"]')!.click();
    root.querySelector<HTMLButtonElement>('.cc-ward-item[data-wardrobe="violetPins"]')!.click();
    expect(cb.onToggleWardrobe).toHaveBeenCalledWith('violetPins');

    root.querySelector<HTMLButtonElement>('.cc-ward-item[data-wardrobe="violetCape"]')!.click();
    expect(cb.onBuyWardrobe).toHaveBeenCalledWith('violetCape');

    // Books tab: open book, export, and import text
    root.querySelector<HTMLButtonElement>('.cc-tab[data-tab="books"]')!.click();
    root.querySelector<HTMLButtonElement>('.cc-cover[data-book="book-1"]')!.click();
    expect(cb.onOpenBook).toHaveBeenCalledWith('book-1');

    root.querySelector<HTMLButtonElement>('.cc-export')!.click();
    expect(cb.onExportVault).toHaveBeenCalledTimes(1);

    // Simulate selecting a JSON file in the hidden file input
    const fileInput = root.querySelector<HTMLInputElement>('input.cc-file')!;
    const payload = '{"format":"chroma-cosmos-vault","version":1}';
    const fakeFile = new File([payload], 'backup.json', { type: 'application/json' });
    Object.defineProperty(fileInput, 'files', { value: [fakeFile], configurable: true });
    fileInput.dispatchEvent(new Event('change'));
    await vi.waitFor(() => {
      expect(cb.onImportVault).toHaveBeenCalledWith(payload);
    });
  });

  it('handles book viewer navigation, keepsake export, and close', () => {
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
  });

  it('showDraft renders 3 illustrated cards and resolves with the chosen card id', async () => {
    const ui = createUi(root);
    const cb = mockCallbacks();
    const { deps } = mockDeps();
    ui.mount(cb, deps);

    const p = ui.showDraft(['turboCheetah', 'prismRibbon', 'zeroGGel']);
    const cards = root.querySelectorAll<HTMLButtonElement>('.cc-card');
    expect(cards.length).toBe(3);

    const prismDef = DRAFT_CARDS.find((c) => c.id === 'prismRibbon')!;
    const second = root.querySelector<HTMLButtonElement>('.cc-card[data-card="prismRibbon"]')!;
    expect(second.textContent).toContain(prismDef.name);
    expect(second.textContent).toContain(prismDef.description);
    expect(second.querySelector('canvas.cc-pix')).not.toBeNull();

    second.click();
    await expect(p).resolves.toBe('prismRibbon');
  });

  it('showDoors renders illustrated doors and resolves with the chosen chapter id', async () => {
    const ui = createUi(root);
    const cb = mockCallbacks();
    const { deps } = mockDeps();
    ui.mount(cb, deps);

    const p = ui.showDoors(['cheetahSavannah', 'saturnRings']);
    const doors = root.querySelectorAll<HTMLButtonElement>('.cc-door');
    expect(doors.length).toBe(2);

    const saturn = root.querySelector<HTMLButtonElement>('.cc-door[data-chapter="saturnRings"]')!;
    expect(saturn.querySelector('canvas.cc-pix')).not.toBeNull();
    saturn.click();
    await expect(p).resolves.toBe('saturnRings');
  });

  it('showFinale displays galaxy name, resolves on tap, and invokes onFinaleDone', async () => {
    const ui = createUi(root);
    const cb = mockCallbacks();
    const { deps } = mockDeps();
    ui.mount(cb, deps);

    const p = ui.showFinale('The Sparkle-Paws Aurora Spiral');
    const modal = root.querySelector<HTMLElement>('.cc-finale')!;
    expect(modal.textContent).toContain('The Sparkle-Paws Aurora Spiral');

    modal.click();
    await expect(p).resolves.toBeUndefined();
    expect(cb.onFinaleDone).toHaveBeenCalledTimes(1);
  });

  it('PWA install badge: hidden when standalone, shown on beforeinstallprompt otherwise, dismissible, prompts on tap, hides on appinstalled', async () => {
    // 1. Standalone mode: badge stays hidden even after beforeinstallprompt
    setMatchMedia({ standalone: true, reducedMotion: true });
    const uiStandalone = createUi(root);
    const cb1 = mockCallbacks();
    uiStandalone.mount(cb1, mockDeps().deps);

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
    expect(wrap2.hidden).toBe(true);

    const promptSpy = vi.fn(async () => undefined);
    const bip2 = Object.assign(new Event('beforeinstallprompt', { cancelable: true }), {
      prompt: promptSpy,
      userChoice: Promise.resolve({ outcome: 'accepted' as const }),
    });
    window.dispatchEvent(bip2);
    expect(bip2.defaultPrevented).toBe(true);
    expect(wrap2.hidden).toBe(false);

    root.querySelector<HTMLButtonElement>('.cc-install')!.click();
    await vi.waitFor(() => expect(promptSpy).toHaveBeenCalledTimes(1));
    expect(wrap2.hidden).toBe(true);

    // 3. Re-triggering beforeinstallprompt -> dismiss button hides it
    const bip3 = Object.assign(new Event('beforeinstallprompt', { cancelable: true }), {
      prompt: vi.fn(async () => undefined),
    });
    window.dispatchEvent(bip3);
    expect(wrap2.hidden).toBe(false);
    root.querySelector<HTMLButtonElement>('.cc-install-x')!.click();
    expect(wrap2.hidden).toBe(true);

    // 4. appinstalled hides a visible badge
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

  it('updates mode data attribute cleanly (boot, turning, chapter, hub) and displays toasts', () => {
    const ui = createUi(root);
    ui.mount(mockCallbacks(), mockDeps().deps);
    const shell = root.querySelector<HTMLElement>('.cc-root')!;
    expect(shell.dataset.mode).toBe('boot');

    ui.setMode('turning');
    expect(shell.dataset.mode).toBe('turning');

    ui.toast('Sparkle unlocked!');
    expect(root.querySelector('.cc-toast')?.textContent).toContain('Sparkle unlocked!');
  });
});
