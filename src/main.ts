/**
 * Composition root: wires art, renderer, simulation, roguelike run manager,
 * audio, tri-tier vault, keepsake export, and sketchbook UI via src/contracts/ only.
 */
import {
  APP_NAME,
  CHAPTERS,
  CONSTELLATION_MILESTONES,
  CORE_MATERIAL_IDS,
  GEM_REWARDS,
  MATERIALS,
  WARDROBE_ITEMS,
} from './contracts';
import type {
  ActorKind,
  ActorRenderState,
  AppMode,
  BadgeId,
  BrushId,
  CausalityKind,
  ChapterId,
  CompiledPage,
  HubState,
  HudState,
  MaterialId,
  RunCore,
  SpriteLibrary,
  StemId,
  StoryPageSnapshot,
  Storybook,
  VaultState,
} from './contracts';
import { createArt } from './art';
import { createAudio } from './audio';
import { createKeepsake } from './export';
import { createRenderer } from './renderer';
import { createRunManager } from './roguelike';
import { createSimulation } from './simulation';
import { createUi } from './ui';
import { createVault } from './vault';

interface TelemetrySnapshot {
  frameMsMedian: number;
  frameMsP95: number;
  fps: number;
  samples: number;
  longFrames: number;
}

interface ChromaQaApi {
  regions(): Array<{
    id: number;
    key: string;
    kind: string;
    label: string;
    core: boolean;
    ghost: boolean;
    coverageExcluded: boolean;
    centroid: { x: number; y: number };
    bbox: { x0: number; y0: number; x1: number; y1: number };
    percent: number;
  }>;
  clientPointOf(id: number): { x: number; y: number } | null;
  paintRegion(id: number, materialId?: MaterialId): Promise<boolean>;
  poke(kind: ActorKind): Promise<boolean>;
  startRun(seed?: number): void;
  completePage(): Promise<void>;
  mode(): AppMode;
}

interface ChromaDebugGlobal {
  telemetry(): TelemetrySnapshot;
  resetTelemetry(): void;
  stats(): {
    renderer: ReturnType<ReturnType<typeof createRenderer>['stats']>;
    audio: ReturnType<ReturnType<typeof createAudio>['stats']>;
    mode: AppMode;
    gems: number;
    vaultReport: ReturnType<ReturnType<typeof createVault>['lastReport']>;
    effects: string[];
    events: string[];
  };
  qa?: ChromaQaApi;
}

declare global {
  interface Window {
    __chroma?: ChromaDebugGlobal;
  }
}

const CAUSALITY_TOAST: Record<CausalityKind, string | null> = {
  rainbowSlide: 'Whoosh! Rainbow Slide awake!',
  starlightFlowerRain: 'Starlight flowers are blooming!',
  zeroGTrampoline: 'Boing! Zero-G Cloud Trampoline!',
  cheetahRacetrack: 'Zoom! Supersonic Cheetah Racetrack!',
  discoMirage: 'Sparkle! Cosmic Disco Mirage!',
  gentleSparkle: null,
};

function renderWebglFallback(host: HTMLElement): void {
  const msg = document.createElement('div');
  msg.style.cssText =
    'display:flex;flex-direction:column;align-items:center;justify-content:center;width:100%;height:100%;' +
    'padding:24px;text-align:center;color:#fff6d8;background:#120d2b;font-family:system-ui,sans-serif;';
  const title = document.createElement('h2');
  title.textContent = APP_NAME;
  const body = document.createElement('p');
  body.textContent = 'WebGL2 is needed to paint with magic shaders. Please enable hardware graphics or try Chrome/Edge.';
  msg.append(title, body);
  host.append(msg);
}

function slugify(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'chroma-cosmos';
}

function clampCoord(v: number, lo: number, hi: number): number {
  return v < lo ? lo : v > hi ? hi : v;
}

async function boot(): Promise<void> {
  const root = document.getElementById('app');
  if (!root) return;

  if (import.meta.env.PROD && 'serviceWorker' in navigator) {
    void navigator.serviceWorker.register('./sw.js', { scope: './' }).catch(() => undefined);
  }

  const art = createArt();
  const renderer = createRenderer();
  const sim = createSimulation();
  const run = createRunManager();
  const audio = createAudio();
  const vault = createVault();
  const keepsake = createKeepsake();
  const ui = createUi(root);

  for (const ch of Array.from(root.childNodes)) {
    if (ch instanceof Text && ch.textContent?.includes('booting')) ch.remove();
  }

  await vault.hydrate();
  audio.setLevel(vault.get().audioLevel);

  const { webgl2 } = await renderer.init(ui.canvasHost);
  if (!webgl2) {
    renderWebglFallback(ui.canvasHost);
    return;
  }

  let currentMode: AppMode = 'boot';
  let currentPage: CompiledPage | null = null;
  let currentSprites: SpriteLibrary = art.sprites(vault.get().wardrobe);
  let selectedMaterial: MaterialId = 1;
  let selectedBrush: BrushId = 'standard';
  let doodle = false;
  let donePages: StoryPageSnapshot[] = [];
  let activeBook: Storybook | null = null;
  let activeBookPage = 0;
  let storybooksCache: Awaited<ReturnType<typeof vault.listStorybooks>> = [];
  let transitioning = false;
  let hudSig = '';
  let lastHudTime = 0;
  let pageCompleteNotified = false;

  // Cached values from the latest single sim.view() call (never call sim.view() inside pushHud/QA)
  let lastCoreAwake = 0;
  let lastCoreTotal = 0;
  let lastPageComplete = false;
  let latestActors: ActorRenderState[] = [];

  const usedMaterialsThisSession = new Set<MaterialId>();
  const seenEffectsLog: string[] = [];
  const seenEventsLog: string[] = [];
  const awakeRegionsKinds = new Set<string>();
  const awakeActors = new Set<ActorKind>();

  // ---- Telemetry ring buffer (600 frames) ----
  const TEL_CAP = 600;
  const telSamples = new Float64Array(TEL_CAP);
  let telCount = 0;
  let telIdx = 0;
  let telLong = 0;
  let telPrevWall = 0;

  const recordFrameTime = (nowWall: number): void => {
    if (telPrevWall > 0) {
      const dt = nowWall - telPrevWall;
      telSamples[telIdx] = dt;
      telIdx = (telIdx + 1) % TEL_CAP;
      if (telCount < TEL_CAP) telCount++;
      if (dt > 50) telLong++;
    }
    telPrevWall = nowWall;
  };

  const getTelemetry = (): TelemetrySnapshot => {
    if (telCount === 0) return { frameMsMedian: 0, frameMsP95: 0, fps: 0, samples: 0, longFrames: 0 };
    const arr = Array.from(telSamples.subarray(0, telCount)).sort((a, b) => a - b);
    const med = arr[Math.floor(arr.length * 0.5)] ?? 0;
    const p95 = arr[Math.min(arr.length - 1, Math.floor(arr.length * 0.95))] ?? med;
    return {
      frameMsMedian: Math.round(med * 100) / 100,
      frameMsP95: Math.round(p95 * 100) / 100,
      fps: med > 0 ? Math.round((1000 / med) * 10) / 10 : 0,
      samples: telCount,
      longFrames: telLong,
    };
  };

  // ---- Helpers ----
  const setAppMode = (m: AppMode): void => {
    currentMode = m;
    ui.setMode(m);
  };

  const materialEntries = () => {
    const unlocked = new Set(vault.get().unlockedMaterials);
    return MATERIALS.map((def) => ({ def, unlocked: unlocked.has(def.id) }));
  };

  const currentTitle = (): string => {
    if (currentMode === 'hub') return "Violet's Starlight Bedroom";
    if (currentMode === 'book' && activeBook) return activeBook.title;
    const ch = run.core() ? CHAPTERS.find((c) => c.id === run.currentChapter()) : undefined;
    return ch?.title ?? currentPage?.title ?? APP_NAME;
  };

  const currentSlot = (): number => {
    const c = run.core();
    if (!c) return 0;
    return c.chapterIndex + 1;
  };

  const syncTool = (): void => {
    const v = vault.get();
    if (!v.unlockedMaterials.includes(selectedMaterial)) selectedMaterial = 1;
    const c = run.core();
    const ownedBrushes = c?.brushes ?? ['standard'];
    if (!ownedBrushes.includes(selectedBrush)) selectedBrush = 'standard';
    sim.setTool({ materialId: selectedMaterial, brush: selectedBrush, doodle });
  };

  const pushHud = (force = false): void => {
    const v = vault.get();
    const c = run.core();
    const brushes = c?.brushes ?? ['standard'];
    const relics = c?.relics ?? [];
    const nextSig = [
      currentMode,
      currentTitle(),
      currentSlot(),
      v.gems,
      v.unlockedMaterials.join(','),
      selectedMaterial,
      brushes.join(','),
      selectedBrush,
      doodle ? 1 : 0,
      relics.join(','),
      lastCoreAwake,
      lastCoreTotal,
      lastPageComplete ? 1 : 0,
      audio.level(),
    ].join('|');
    if (!force && nextSig === hudSig) return;
    hudSig = nextSig;
    const hud: HudState = {
      mode: currentMode,
      chapterTitle: currentTitle(),
      slot: currentSlot(),
      gems: v.gems,
      materials: materialEntries(),
      selectedMaterial,
      brushes,
      selectedBrush,
      doodle,
      relics,
      coreAwake: lastCoreAwake,
      coreTotal: lastCoreTotal,
      pageComplete: lastPageComplete,
      audioLevel: audio.level(),
    };
    ui.updateHud(hud);
  };

  const pushHub = async (): Promise<void> => {
    storybooksCache = await vault.listStorybooks();
    const v = vault.get();
    const hub: HubState = {
      gems: v.gems,
      badges: [...v.badges],
      materials: materialEntries(),
      wardrobeOwned: [...v.wardrobeOwned],
      wardrobe: { ...v.wardrobe },
      storybooks: storybooksCache,
      hasRunInProgress: v.run !== null,
    };
    ui.updateHub(hub);
  };

  const awardBadge = (d: VaultState, id: BadgeId): MaterialId | null => {
    if (d.badges.includes(id)) return null;
    d.badges.push(id);
    const milestone = CONSTELLATION_MILESTONES[id];
    if (milestone && !d.unlockedMaterials.includes(milestone)) {
      d.unlockedMaterials.push(milestone);
      return milestone;
    }
    return null;
  };

  const syncStems = (): void => {
    if (currentMode === 'hub') {
      audio.setStems(['pad']);
      return;
    }
    if (currentMode === 'finale') {
      audio.setStems(['pad', 'marimba', 'harp', 'celesta']);
      return;
    }
    const stems = new Set<StemId>();
    if (awakeRegionsKinds.has('planet') || awakeRegionsKinds.has('rings') || awakeRegionsKinds.has('cloud')) {
      stems.add('pad');
    }
    if (awakeActors.has('nova')) stems.add('marimba');
    if (awakeActors.has('lumi')) stems.add('harp');
    if (awakeActors.has('violet')) stems.add('celesta');
    audio.setStems([...stems]);
  };

  const consumeViewAndRender = (dtMs: number, timeMs: number): boolean => {
    const view = sim.view();
    const changed = view.coreAwake !== lastCoreAwake || view.pageComplete !== lastPageComplete;
    lastCoreAwake = view.coreAwake;
    lastCoreTotal = view.coreTotal;
    lastPageComplete = view.pageComplete;
    latestActors = view.actors;

    for (const fx of view.effects) {
      if (!seenEffectsLog.includes(fx.kind)) {
        seenEffectsLog.push(fx.kind);
        if (seenEffectsLog.length > 100) seenEffectsLog.shift();
      }
    }

    const stampBatches = sim.drainStampBatches();
    renderer.render({
      timeMs,
      dtMs,
      view,
      stampBatches,
      selectedMaterial,
      beatPhase: audio.beatPhase(),
      mode: currentMode,
    });
    return changed;
  };

  const loadChapterScene = (chapter: ChapterId, snapshot?: StoryPageSnapshot): void => {
    const c = run.core();
    if (!c) return;
    const wardrobe = vault.get().wardrobe;
    currentSprites = art.sprites(wardrobe);
    const seed = (c.seed ^ Math.imul(c.chapterIndex + 1, 0x45d9f3b)) >>> 0;
    const page = art.compilePage(chapter, seed, wardrobe);
    currentPage = page;
    pageCompleteNotified = false;
    awakeRegionsKinds.clear();
    awakeActors.clear();
    sim.loadPage(page, {
      seed,
      chapterIndex: c.chapterIndex,
      brushes: c.brushes,
      relics: c.relics,
    });
    if (snapshot && snapshot.sceneId === chapter) {
      sim.restorePage(snapshot);
    }
    syncTool();
    renderer.loadPage(page, currentSprites);
    consumeViewAndRender(0, performance.now());
    syncStems();
    pushHud(true);
  };

  const loadHubScene = (): void => {
    const wardrobe = vault.get().wardrobe;
    currentSprites = art.sprites(wardrobe);
    const page = art.compilePage('bedroomHub', 1, wardrobe);
    currentPage = page;
    pageCompleteNotified = false;
    awakeRegionsKinds.clear();
    awakeActors.clear();
    sim.loadPage(page, {
      seed: 1,
      chapterIndex: 0,
      brushes: ['standard'],
      relics: [],
      viewOnly: true,
    });
    syncTool();
    renderer.loadPage(page, currentSprites);
    consumeViewAndRender(0, performance.now());
    syncStems();
    pushHud(true);
  };

  const loadBookPage = (): void => {
    if (!activeBook || activeBook.pages.length === 0) return;
    activeBookPage = Math.max(0, Math.min(activeBook.pages.length - 1, activeBookPage));
    const snap = activeBook.pages[activeBookPage]!;
    const wardrobe = vault.get().wardrobe;
    currentSprites = art.sprites(wardrobe);
    const page = art.compilePage(snap.sceneId, snap.seed, wardrobe);
    currentPage = page;
    sim.loadPage(page, {
      seed: snap.seed,
      chapterIndex: activeBookPage,
      brushes: ['standard'],
      relics: [],
      viewOnly: true,
    });
    sim.restorePage(snap);
    renderer.loadPage(page, currentSprites);
    setAppMode('book');
    ui.showBook(
      {
        id: activeBook.id,
        title: activeBook.title,
        galaxyName: activeBook.galaxyName,
        createdAt: activeBook.createdAt,
        pageCount: activeBook.pages.length,
      },
      activeBookPage,
      activeBook.pages.length,
    );
    consumeViewAndRender(0, performance.now());
    audio.setStems(['pad', 'celesta']);
    pushHud(true);
  };

  const persistRunCore = (): void => {
    const c = run.core();
    vault.update((d) => {
      d.run = c;
    });
    vault.healCheck();
  };

  const enterHub = async (): Promise<void> => {
    setAppMode('hub');
    loadHubScene();
    await pushHub();
  };

  const finishVoyage = async (): Promise<void> => {
    const galaxy = run.galaxyName();
    const c = run.core();
    const bookId = `book-${c?.seed ?? Date.now()}-${Date.now()}`;
    const createdAt = Date.now();
    const book: Storybook = {
      id: bookId,
      title: galaxy,
      galaxyName: galaxy,
      createdAt,
      seed: c?.seed ?? 1,
      pages: [...donePages],
    };
    await vault.saveStorybook(book);

    const unlockedFromBadges: MaterialId[] = [];
    vault.update((d) => {
      d.gems += GEM_REWARDS.runComplete;
      d.stats.runsCompleted += 1;
      d.run = null;
      const checks: Array<[boolean, BadgeId]> = [
        [d.stats.runsCompleted >= 1, 'firstRun'],
        [d.stats.runsCompleted >= 3, 'threeRuns'],
        [d.stats.runsCompleted >= 5, 'fiveRuns'],
      ];
      for (const [cond, b] of checks) {
        if (cond) {
          const mat = awardBadge(d, b);
          if (mat) unlockedFromBadges.push(mat);
        }
      }
    });
    vault.healCheck();
    await vault.saveRunPages(null, []);
    donePages = [];
    run.finish();

    for (const matId of unlockedFromBadges) {
      const mName = MATERIALS.find((m) => m.id === matId)?.name ?? 'New Medium';
      ui.toast(`Unlocked ${mName}!`);
    }

    setAppMode('finale');
    syncStems();
    pushHud(true);
    await ui.showFinale(galaxy);
  };

  const runDoorSelection = async (): Promise<void> => {
    const doors = run.doorOptions();
    if (doors.length === 0) return;
    setAppMode('doors');
    pushHud(true);
    const chosenDoor = await ui.showDoors(doors);
    run.chooseDoor(chosenDoor);
    persistRunCore();

    setAppMode('turning');
    pushHud(true);
    audio.pageTurn();
    await renderer.pageTurn(() => {
      loadChapterScene(chosenDoor);
    });
    setAppMode('chapter');
    pushHud(true);
  };

  const runDraftAndDoorFlow = async (): Promise<void> => {
    const c = run.core();
    if (!c) return;
    if (c.phase === 'draft') {
      const opts = run.draftOptions();
      if (opts.length > 0) {
        setAppMode('draft');
        pushHud(true);
        const card = await ui.showDraft(opts);
        run.pickDraft(card);
        if (card === 'turboCheetah' || card === 'twinTail' || card === 'supernovaSponge' || card === 'zeroGGel') {
          selectedBrush = card;
        }
        persistRunCore();
      }
    }
    await runDoorSelection();
  };

  const handleTurnPage = async (_early: boolean): Promise<void> => {
    if (transitioning || !run.core()) return;
    transitioning = true;
    try {
      const snap = sim.snapshotPage();
      donePages.push(snap);
      await vault.saveRunPages(null, donePages);

      const next = run.completeChapter();
      persistRunCore();
      if (next === 'complete') {
        await finishVoyage();
      } else {
        await runDraftAndDoorFlow();
      }
    } finally {
      transitioning = false;
    }
  };

  const startNewRun = async (seed: number): Promise<void> => {
    if (transitioning) return;
    transitioning = true;
    try {
      const core: RunCore = run.start(seed);
      donePages = [];
      selectedBrush = 'standard';
      doodle = false;
      await vault.saveRunPages(null, []);
      persistRunCore();
      setAppMode('chapter');
      loadChapterScene(core.path[0] ?? 'rooftop');
      await pushHub();
    } finally {
      transitioning = false;
    }
  };

  const continueSavedRun = async (): Promise<void> => {
    if (transitioning) return;
    const saved = vault.get().run;
    if (!saved) return;
    transitioning = true;
    try {
      run.resume(saved);
      const pages = await vault.loadRunPages();
      donePages = pages.done;
      selectedBrush = saved.brushes[saved.brushes.length - 1] ?? 'standard';
      doodle = false;
      setAppMode('chapter');
      loadChapterScene(run.currentChapter(), pages.active ?? undefined);
      if (saved.phase === 'draft') {
        await runDraftAndDoorFlow();
      } else if (saved.phase === 'doors') {
        await runDoorSelection();
      }
    } finally {
      transitioning = false;
    }
  };

  // ---- UI callbacks ----
  ui.mount(
    {
      onStartRun() {
        void startNewRun((Date.now() ^ 0x9e3779b9) & 0x7fffffff);
      },
      onContinueRun() {
        void continueSavedRun();
      },
      onSelectMaterial(id) {
        selectedMaterial = id;
        syncTool();
        pushHud(true);
      },
      onSelectBrush(id) {
        selectedBrush = id;
        syncTool();
        pushHud(true);
      },
      onToggleDoodle() {
        doodle = !doodle;
        syncTool();
        pushHud(true);
      },
      onTurnPage(early) {
        void handleTurnPage(early);
      },
      onAudioCycle() {
        const nextLevel = ((audio.level() + 3) % 4) as 0 | 1 | 2 | 3;
        audio.setLevel(nextLevel);
        vault.update((d) => {
          d.audioLevel = nextLevel;
        });
        vault.healCheck();
        pushHud(true);
      },
      onUnlockMaterial(id) {
        const def = MATERIALS.find((m) => m.id === id);
        if (!def) return;
        const v = vault.get();
        if (v.unlockedMaterials.includes(id) || v.gems < def.unlockCost) return;
        vault.update((d) => {
          if (d.gems >= def.unlockCost && !d.unlockedMaterials.includes(id)) {
            d.gems -= def.unlockCost;
            d.unlockedMaterials.push(id);
          }
        });
        vault.healCheck();
        ui.toast(`Unlocked ${def.name}!`);
        void pushHub();
        pushHud(true);
      },
      onBuyWardrobe(id) {
        const item = WARDROBE_ITEMS.find((w) => w.id === id);
        if (!item) return;
        const v = vault.get();
        if (v.wardrobeOwned.includes(id) || v.gems < item.cost) return;
        vault.update((d) => {
          if (d.gems >= item.cost && !d.wardrobeOwned.includes(id)) {
            d.gems -= item.cost;
            d.wardrobeOwned.push(id);
            d.wardrobe[id] = true;
          }
        });
        vault.healCheck();
        currentSprites = art.sprites(vault.get().wardrobe);
        if (currentMode === 'hub') loadHubScene();
        ui.toast(`Put on ${item.name}!`);
        void pushHub();
        pushHud(true);
      },
      onToggleWardrobe(id) {
        if (!vault.get().wardrobeOwned.includes(id)) return;
        vault.update((d) => {
          d.wardrobe[id] = !d.wardrobe[id];
        });
        vault.healCheck();
        currentSprites = art.sprites(vault.get().wardrobe);
        if (currentMode === 'hub') loadHubScene();
        void pushHub();
        pushHud(true);
      },
      onOpenBook(id) {
        void (async () => {
          const book = await vault.getStorybook(id);
          if (!book || book.pages.length === 0) {
            ui.toast('That storybook has no saved pages yet.');
            return;
          }
          activeBook = book;
          activeBookPage = 0;
          loadBookPage();
        })();
      },
      onBookPage(delta) {
        if (!activeBook) return;
        activeBookPage = Math.max(0, Math.min(activeBook.pages.length - 1, activeBookPage + delta));
        loadBookPage();
      },
      onCloseBook() {
        activeBook = null;
        void enterHub();
      },
      onSaveKeepsake() {
        if (!activeBook) return;
        const snap = activeBook.pages[activeBookPage];
        if (!snap) return;
        const chapterTitle = CHAPTERS.find((c) => c.id === snap.sceneId)?.title ?? snap.sceneId;
        const pageCanvas = renderer.capturePage(4);
        const postcard = keepsake.renderPostcard(pageCanvas, {
          title: activeBook.title,
          galaxyName: activeBook.galaxyName,
          chapterTitle,
          dateIso: new Date(activeBook.createdAt).toISOString(),
        });
        void keepsake
          .savePng(postcard, `${slugify(activeBook.galaxyName)}-page-${activeBookPage + 1}.png`)
          .then(() => ui.toast('Keepsake postcard saved!'))
          .catch(() => ui.toast('Could not export keepsake PNG.'));
      },
      onExportVault() {
        void vault.exportJson().then((json) => {
          keepsake.saveText(json, 'chroma-cosmos-sketchbook-backup.json', 'application/json');
          ui.toast('Sketchbook backup downloaded!');
        });
      },
      onImportVault(text) {
        void vault
          .importJson(text)
          .then(async () => {
            audio.setLevel(vault.get().audioLevel);
            currentSprites = art.sprites(vault.get().wardrobe);
            if (currentMode === 'hub') loadHubScene();
            await pushHub();
            pushHud(true);
            ui.toast('Sketchbook backup restored!');
          })
          .catch(() => {
            ui.toast('That file did not look like a Chroma Cosmos backup.');
          });
      },
      onBackToHub() {
        if (transitioning) return;
        void (async () => {
          if (currentMode === 'chapter' && run.core() && currentPage) {
            await vault.saveRunPages(sim.snapshotPage(), donePages);
          }
          await enterHub();
        })();
      },
      onGesture(e) {
        sim.gesture(e);
      },
      onHover(p) {
        sim.hover(p);
      },
      onFinaleDone() {
        void enterHub();
      },
    },
    {
      illustration: art.illustration,
      clientToInternal: renderer.clientToInternal,
    },
  );

  // Unlock audio on the very first user pointerdown anywhere
  window.addEventListener(
    'pointerdown',
    () => {
      void audio.unlock();
    },
    { once: true, capture: true },
  );

  // Bidirectional self-healing on visibility/focus + save active page when backgrounded
  const onVisibility = (): void => {
    vault.healCheck();
    if (document.visibilityState === 'hidden') {
      if (currentMode === 'chapter' && run.core() && currentPage) {
        void vault.saveRunPages(sim.snapshotPage(), donePages);
      }
      void vault.flush();
    }
  };
  document.addEventListener('visibilitychange', onVisibility);
  window.addEventListener('focus', () => vault.healCheck());
  window.addEventListener('pagehide', () => {
    vault.healCheck();
    void vault.flush();
  });

  // Load initial Bedroom Hub
  await enterHub();

  // ---- Frame Loop ----
  const processEvents = (): void => {
    const evs = sim.drainEvents();
    if (evs.length === 0) return;

    let gemsEarned = 0;
    const newBadges: BadgeId[] = [];
    let awakenedDelta = 0;
    let pokesDelta = 0;
    let stemsChanged = false;

    for (const ev of evs) {
      seenEventsLog.push(ev.type);
      if (seenEventsLog.length > 200) seenEventsLog.shift();

      switch (ev.type) {
        case 'stroke':
          audio.stroke(ev.active, ev.speed, ev.materialId as MaterialId);
          break;
        case 'stage':
          audio.stage(ev.kind, ev.stage);
          break;
        case 'autoBloom': {
          audio.autoBloom();
          awakenedDelta += 1;
          awakeRegionsKinds.add(ev.kind);
          stemsChanged = true;
          usedMaterialsThisSession.add(ev.materialId as MaterialId);
          if (!vault.get().badges.includes('firstBloom')) newBadges.push('firstBloom');
          if (
            !vault.get().badges.includes('rainbowMaster') &&
            CORE_MATERIAL_IDS.every((id) => usedMaterialsThisSession.has(id))
          ) {
            newBadges.push('rainbowMaster');
          }
          break;
        }
        case 'causality': {
          audio.causality(ev.effect);
          seenEffectsLog.push(ev.effect);
          if (seenEffectsLog.length > 100) seenEffectsLog.shift();
          const msg = CAUSALITY_TOAST[ev.effect];
          if (msg) ui.toast(msg);
          if (ev.effect !== 'gentleSparkle' && !vault.get().badges.includes('causalityExplorer')) {
            newBadges.push('causalityExplorer');
          }
          break;
        }
        case 'actorAwake': {
          audio.actorAwake(ev.actor);
          awakeActors.add(ev.actor);
          stemsChanged = true;
          if (ev.actor === 'lumi') {
            if (!vault.get().badges.includes('lumiFriend')) newBadges.push('lumiFriend');
            ui.toast('Lumi the Space Unicorn woke up!');
          } else if (ev.actor === 'nova') {
            if (!vault.get().badges.includes('novaFriend')) newBadges.push('novaFriend');
            ui.toast('Nova the Starlight Cheetah woke up!');
          } else if (ev.actor === 'violet') {
            ui.toast('Violet is ready to explore!');
          }
          break;
        }
        case 'poke':
          audio.poke(ev.actor);
          pokesDelta += 1;
          break;
        case 'gems':
          gemsEarned += ev.amount;
          break;
        case 'pageComplete':
          if (!pageCompleteNotified) {
            pageCompleteNotified = true;
            ui.toast('Page awakened! Tap Next Page to continue!');
          }
          break;
        case 'relic':
        case 'violetBounce':
          break;
      }
    }

    if (stemsChanged) syncStems();

    if (gemsEarned > 0 || awakenedDelta > 0 || pokesDelta > 0 || newBadges.length > 0) {
      const unlockedMats: MaterialId[] = [];
      vault.update((d) => {
        d.gems += gemsEarned;
        d.stats.regionsAwakened += awakenedDelta;
        d.stats.pokes += pokesDelta;
        for (const b of newBadges) {
          const mat = awardBadge(d, b);
          if (mat) unlockedMats.push(mat);
        }
      });
      vault.healCheck();
      for (const matId of unlockedMats) {
        const mName = MATERIALS.find((m) => m.id === matId)?.name ?? 'New Medium';
        ui.toast(`Constellation reward: ${mName}!`);
      }
    }
  };

  renderer.start((dtMs, timeMs) => {
    recordFrameTime(performance.now());
    sim.update(dtMs, timeMs);
    processEvents();
    const changed = consumeViewAndRender(dtMs, timeMs);
    if (timeMs - lastHudTime > 80 || changed) {
      lastHudTime = timeMs;
      pushHud(false);
    }
  });

  // ---- QA & Telemetry Hook ----
  const isQa = new URLSearchParams(window.location.search).get('qa') === '1';

  const dispatchPointer = (
    type: 'pointerdown' | 'pointermove' | 'pointerup',
    cx: number,
    cy: number,
    pointerId = 77,
  ): void => {
    const ev = new PointerEvent(type, {
      bubbles: true,
      cancelable: true,
      pointerId,
      pointerType: 'mouse',
      isPrimary: true,
      button: 0,
      buttons: type === 'pointerup' ? 0 : 1,
      clientX: cx,
      clientY: cy,
      pressure: type === 'pointerup' ? 0 : 0.6,
    });
    ui.canvasHost.dispatchEvent(ev);
  };

  const nextAnimFrame = (): Promise<void> =>
    new Promise((resolve) => requestAnimationFrame(() => resolve()));

  const debugObj: ChromaDebugGlobal = {
    telemetry: getTelemetry,
    resetTelemetry() {
      telCount = 0;
      telIdx = 0;
      telLong = 0;
      telPrevWall = 0;
    },
    stats() {
      return {
        renderer: renderer.stats(),
        audio: audio.stats(),
        mode: currentMode,
        gems: vault.get().gems,
        vaultReport: vault.lastReport(),
        effects: [...seenEffectsLog],
        events: [...seenEventsLog],
      };
    },
  };

  if (isQa) {
    debugObj.qa = {
      regions() {
        if (!currentPage) return [];
        const out: ReturnType<ChromaQaApi['regions']> = [];
        for (const r of currentPage.regions) {
          if (!r) continue;
          out.push({
            id: r.id,
            key: r.key,
            kind: r.kind,
            label: r.label,
            core: r.core,
            ghost: r.ghost,
            coverageExcluded: r.coverageExcluded,
            centroid: r.centroid,
            bbox: r.bbox,
            percent: sim.regionPercent(r.id),
          });
        }
        return out;
      },
      clientPointOf(id) {
        if (!currentPage) return null;
        const pts = sim.qaStrokePath(id);
        const pt = pts[0] ?? currentPage.regions[id]?.centroid;
        if (!pt) return null;
        return renderer.internalToClient(pt.x, pt.y);
      },
      async paintRegion(id, materialId) {
        if (!currentPage) return false;
        if (materialId !== undefined && Number.isInteger(materialId) && materialId >= 1 && materialId <= 12) {
          selectedMaterial = materialId;
          sim.setTool({ materialId: selectedMaterial, brush: selectedBrush, doodle });
          pushHud(true);
        }
        if (sim.regionPercent(id) >= 1) return true;
        const pts = sim.qaStrokePath(id);
        if (pts.length === 0) return false;

        const first = renderer.internalToClient(pts[0]!.x, pts[0]!.y);
        dispatchPointer('pointerdown', first.x, first.y, 77);

        const chunk = 18;
        let lastClient = first;
        for (let i = 1; i < pts.length; i++) {
          if (sim.regionPercent(id) >= 1) break;
          const cp = renderer.internalToClient(pts[i]!.x, pts[i]!.y);
          lastClient = cp;
          dispatchPointer('pointermove', cp.x, cp.y, 77);
          if (i % chunk === 0) await nextAnimFrame();
        }
        dispatchPointer('pointerup', lastClient.x, lastClient.y, 77);
        await nextAnimFrame();
        await nextAnimFrame();
        return sim.regionPercent(id) >= 0.93;
      },
      async poke(kind) {
        const actor = latestActors.find((a) => a.kind === kind);
        if (!actor) return false;
        const x = clampCoord(actor.x, 1, 478);
        const y = clampCoord(actor.y - 6, 1, 268);
        const cp = renderer.internalToClient(x, y);
        dispatchPointer('pointerdown', cp.x, cp.y, 78);
        await nextAnimFrame();
        dispatchPointer('pointerup', cp.x, cp.y, 78);
        await nextAnimFrame();
        return true;
      },
      startRun(seed = 4242) {
        void startNewRun(seed);
      },
      async completePage() {
        if (!currentPage) return;
        const ids = currentPage.coreRegionIds.slice();
        const unlocked = vault.get().unlockedMaterials;
        for (let i = 0; i < ids.length; i++) {
          const id = ids[i]!;
          if (sim.regionPercent(id) >= 1) continue;
          const meta = currentPage.regions[id];
          let mat: MaterialId = unlocked[i % unlocked.length] ?? 1;
          if (meta?.kind === 'cloud') mat = 6; // RainbowPrismWax -> Rainbow Slide
          else if (meta?.kind === 'planet' || meta?.kind === 'rings') mat = 4; // SolarCheetahAmber -> Racetrack
          await this.paintRegion(id, mat);
        }
      },
      mode() {
        return currentMode;
      },
    };
  }

  window.__chroma = debugObj;

  void WARDROBE_ITEMS;
}

void boot();
