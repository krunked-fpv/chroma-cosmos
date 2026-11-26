/**
 * Composition root: wires art, renderer, simulation, roguelike run manager,
 * audio, tri-tier vault, keepsake export, and Midnight Cloisonne UI via src/contracts/ only.
 */
import {
  ACTIVE_BRUSH_IDS,
  ALL_CHAPTERS,
  APP_NAME,
  CHAPTER_TO_UNIVERSE,
  CONSTELLATION_MILESTONES,
  CORE_MATERIAL_IDS,
  GEM_REWARDS,
  MATERIALS,
  MAX_MATERIAL_ID,
  TOTAL_UNIVERSES,
  UNIVERSES,
  UNIVERSE_BY_ID,
  UNIVERSE_ORDER,
  WARDROBE_ITEMS,
} from './contracts';
import type {
  ActiveBrushId,
  ActorKind,
  ActorRenderState,
  AppMode,
  BadgeId,
  BrushId,
  CausalityKind,
  ChapterId,
  CompiledPage,
  DraftCardId,
  FinaleMeta,
  HeroQuestId,
  HeroStoryQuest,
  HintRequestState,
  HubState,
  HudState,
  MaterialId,
  PageFinaleState,
  PokeInvite,
  RunCore,
  SpriteLibrary,
  StemId,
  StoryMilestoneKind,
  StoryPageSnapshot,
  StoryStarState,
  Storybook,
  ToolMode,
  UniverseId,
  UniverseProgressItem,
  VaultState,
  WispRenderState,
  WonderWhisperHint,
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
  startRun(seed?: number, universeId?: UniverseId): void;
  universes(): UniverseProgressItem[];
  selectUniverse(id: UniverseId): boolean;
  unlockUpTo(count: number): void;
  completePage(): Promise<void>;
  mode(): AppMode;
  setToolMode(mode: ToolMode): void;
  hoverRegion(id: number): boolean;
  storyStars(): StoryStarState[];
  heroQuests(): HeroStoryQuest[];
  hintState(): HintRequestState | null;
  pageFinale(): PageFinaleState | null;
  requestHint(questId?: HeroQuestId): HintRequestState | null;
  setStayAndDoodle(stay: boolean): void;
  addGems(amount: number): void;
  wisp(): WispRenderState | null;
  wonderWhisper(): WonderWhisperHint | null;
  pokeInvites(): PokeInvite[];
  nudgeMilestone(id: StoryMilestoneKind): void;
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

const ACTIVE_BRUSH_SET: ReadonlySet<string> = new Set<string>(ACTIVE_BRUSH_IDS);

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
    'padding:24px;text-align:center;color:#faf6ec;background:#0d1026;font-family:system-ui,sans-serif;';
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

function computeHasAffordableUnlock(v: Readonly<VaultState>): boolean {
  const unlocked = new Set<MaterialId>(v.unlockedMaterials);
  for (const m of MATERIALS) {
    if (m.tier === 'unlockable' && !unlocked.has(m.id) && v.gems >= m.unlockCost) return true;
  }
  const owned = new Set(v.wardrobeOwned);
  for (const w of WARDROBE_ITEMS) {
    if (!owned.has(w.id) && v.gems >= w.cost) return true;
  }
  return false;
}

interface UniverseProgressSummary {
  completedSet: Set<UniverseId>;
  unlockedSet: Set<UniverseId>;
  activeUniverse: UniverseId;
  items: UniverseProgressItem[];
  unlockedCount: number;
  completedCount: number;
}

function computeUniverseProgress(v: Readonly<VaultState>): UniverseProgressSummary {
  const completedSet = new Set<UniverseId>(v.completedUniverses ?? []);
  if (v.stats.runsCompleted >= 1) completedSet.add('chromaCosmos');

  const unlockedSet = new Set<UniverseId>();
  let firstLockedIdx = -1;
  for (const u of UNIVERSES) {
    const unlocked =
      u.index === 0 ||
      completedSet.has(UNIVERSE_ORDER[u.index - 1]!) ||
      (u.index === 1 && v.stats.runsCompleted >= 1);
    if (unlocked) unlockedSet.add(u.id);
    else if (firstLockedIdx === -1) firstLockedIdx = u.index;
  }

  const requested = v.activeUniverse ?? 'chromaCosmos';
  const activeUniverse: UniverseId =
    requested in UNIVERSE_BY_ID && unlockedSet.has(requested) ? requested : 'chromaCosmos';

  const items: UniverseProgressItem[] = UNIVERSES.map((u) => {
    const unlocked = unlockedSet.has(u.id);
    const completed = completedSet.has(u.id);
    return {
      id: u.id,
      index: u.index,
      number: u.number,
      name: u.name,
      shortName: u.shortName,
      tagline: u.tagline,
      unlockTeaser: u.unlockTeaser,
      accent: u.accent,
      accentSoft: u.accentSoft,
      unlocked,
      completed,
      isNextUnlock: u.index === firstLockedIdx,
      active: u.id === activeUniverse,
      chapterTitles: u.chapters.map((c) => c.title),
    };
  });

  return {
    completedSet,
    unlockedSet,
    activeUniverse,
    items,
    unlockedCount: unlockedSet.size,
    completedCount: completedSet.size,
  };
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
  {
    const initU = UNIVERSE_BY_ID[computeUniverseProgress(vault.get()).activeUniverse];
    audio.setUniverseTone?.(initU.semitoneShift, initU.ambient);
  }

  const { webgl2 } = await renderer.init(ui.canvasHost);
  if (!webgl2) {
    renderWebglFallback(ui.canvasHost);
    return;
  }

  let currentMode: AppMode = 'boot';
  let currentPage: CompiledPage | null = null;
  let currentSprites: SpriteLibrary = art.sprites(vault.get().wardrobe);
  const wispSprite = art.wispSprite?.();
  let selectedMaterial: MaterialId = 1;
  let selectedBrush: BrushId = 'standard';
  let doodle = false;
  let latestHover: { x: number; y: number } | null = null;
  let donePages: StoryPageSnapshot[] = [];
  let activeBook: Storybook | null = null;
  let activeBookPage = 0;
  let storybooksCache: Awaited<ReturnType<typeof vault.listStorybooks>> = [];
  let transitioning = false;
  let finaleJumping = false;
  let hudSig = '';
  let lastHudTime = 0;
  let pageCompleteNotified = false;

  // Cached values from the latest single sim.view() call (never call sim.view() inside pushHud/QA)
  let lastCoreAwake = 0;
  let lastCoreTotal = 0;
  let lastPageComplete = false;
  let latestActors: ActorRenderState[] = [];
  let lastHeroQuests: HeroStoryQuest[] = [];
  let lastStoryStars: StoryStarState[] = [];
  let lastHintState: HintRequestState | null = null;
  let lastPageFinale: PageFinaleState | null = null;
  let lastWisp: WispRenderState | null = null;
  let lastWonderWhisper: WonderWhisperHint | null = null;
  let lastPokeInvites: PokeInvite[] = [];
  let lastWispPencilCue = false;
  let lastPrologueActive = false;

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
    if (currentMode === 'hub') {
      const progress = computeUniverseProgress(vault.get());
      return UNIVERSE_BY_ID[progress.activeUniverse].hubTitle;
    }
    if (currentMode === 'book' && activeBook) return activeBook.title;
    const ch = run.core() ? ALL_CHAPTERS.find((c) => c.id === run.currentChapter()) : undefined;
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
    const toolMode: ToolMode = doodle ? 'wand' : 'pencil';
    sim.setTool({ materialId: selectedMaterial, brush: selectedBrush, doodle, toolMode });
  };

  const pushHud = (force = false): void => {
    const v = vault.get();
    const c = run.core();
    const progress = computeUniverseProgress(v);
    const activeUId: UniverseId = c ? (run.universeId?.() ?? progress.activeUniverse) : progress.activeUniverse;
    const uDef = UNIVERSE_BY_ID[activeUId];
    const nextDef = UNIVERSES[uDef.index + 1] ?? null;
    const isFrontierUniverse = !progress.completedSet.has(activeUId);
    const nextUnlockName = nextDef && !progress.unlockedSet.has(nextDef.id) ? nextDef.shortName : null;
    const brushes = c?.brushes ?? ['standard'];
    const relics = c?.relics ?? [];
    const toolMode: ToolMode = doodle ? 'wand' : 'pencil';
    const hasAffordableUnlock = computeHasAffordableUnlock(v);
    const questsSig = lastHeroQuests
      .map(
        (q) =>
          `${q.questId}:${q.completed ? 1 : 0}:${q.highlighted ? 1 : 0}:${q.stalled ? 1 : 0}:${Math.round(q.progress * 100)}`,
      )
      .join(',');
    const hintSig = lastHintState
      ? `${lastHintState.active ? 1 : 0}:${lastHintState.questId ?? ''}:${lastHintState.source}`
      : '0';
    const finaleSig = lastPageFinale
      ? `${lastPageFinale.active ? 1 : 0}:${lastPageFinale.stayAndDoodle ? 1 : 0}:${Math.round(lastPageFinale.progress * 25)}`
      : '0';
    const nextSig = [
      currentMode,
      currentTitle(),
      currentSlot(),
      activeUId,
      uDef.number,
      isFrontierUniverse ? 1 : 0,
      nextUnlockName ?? '',
      v.gems,
      hasAffordableUnlock ? 1 : 0,
      v.unlockedMaterials.join(','),
      selectedMaterial,
      brushes.join(','),
      selectedBrush,
      toolMode,
      relics.join(','),
      lastCoreAwake,
      lastCoreTotal,
      questsSig,
      hintSig,
      finaleSig,
      lastWispPencilCue ? 1 : 0,
      lastPrologueActive ? 1 : 0,
      lastPageComplete ? 1 : 0,
      audio.level(),
    ].join('|');
    if (!force && nextSig === hudSig) return;
    hudSig = nextSig;
    const hud: HudState = {
      mode: currentMode,
      chapterTitle: currentTitle(),
      slot: currentSlot(),
      activeUniverse: activeUId,
      universeNumber: uDef.number,
      totalUniverses: TOTAL_UNIVERSES,
      universeName: uDef.name,
      nextUnlockName,
      isFrontierUniverse,
      gems: v.gems,
      hasAffordableUnlock,
      materials: materialEntries(),
      selectedMaterial,
      brushes,
      selectedBrush,
      doodle,
      toolMode,
      relics,
      coreAwake: lastCoreAwake,
      coreTotal: lastCoreTotal,
      heroQuests: lastHeroQuests,
      storyStars: lastStoryStars,
      hintState: lastHintState ?? undefined,
      pageFinale: lastPageFinale ?? undefined,
      wispPencilCue: lastWispPencilCue,
      prologueActive: lastPrologueActive,
      pageComplete: lastPageComplete,
      audioLevel: audio.level(),
    };
    ui.updateHud(hud);
  };

  const pushHub = async (): Promise<void> => {
    storybooksCache = await vault.listStorybooks();
    const v = vault.get();
    const progress = computeUniverseProgress(v);
    const hasAffordableUnlock = computeHasAffordableUnlock(v);
    const hub: HubState = {
      gems: v.gems,
      badges: [...v.badges],
      materials: materialEntries(),
      wardrobeOwned: [...v.wardrobeOwned],
      wardrobe: { ...v.wardrobe },
      discoveredCards: [...(v.discoveredCards ?? [])],
      storybooks: storybooksCache,
      hasRunInProgress: v.run !== null,
      hasAffordableUnlock,
      audioLevel: audio.level(),
      activeUniverse: progress.activeUniverse,
      universes: progress.items,
      unlockedUniverseCount: progress.unlockedCount,
      completedUniverseCount: progress.completedCount,
      totalUniverses: TOTAL_UNIVERSES,
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
    const nextQuests = view.heroQuests ?? [];
    const nextStars = view.storyStars ?? [];
    const nextHint = view.hintState ?? null;
    const nextFinale = view.pageFinale ?? null;
    const nextWisp = view.wisp ?? null;
    const nextPencilCue = Boolean(nextWisp?.active && nextWisp.mode === 'prologueTapPencil');
    const nextPrologueActive = Boolean(
      nextWisp?.active &&
        (nextWisp.mode === 'prologueMist' ||
          nextWisp.mode === 'prologueTapPencil' ||
          nextWisp.mode === 'prologueStroke'),
    );
    const questsChanged =
      nextQuests.length !== lastHeroQuests.length ||
      nextQuests.some(
        (q, i) =>
          q.questId !== lastHeroQuests[i]?.questId ||
          q.completed !== lastHeroQuests[i]?.completed ||
          q.highlighted !== lastHeroQuests[i]?.highlighted ||
          q.stalled !== lastHeroQuests[i]?.stalled ||
          Math.abs(q.progress - (lastHeroQuests[i]?.progress ?? -1)) > 0.01,
      );
    const hintChanged =
      Boolean(nextHint?.active) !== Boolean(lastHintState?.active) ||
      nextHint?.questId !== lastHintState?.questId ||
      nextHint?.source !== lastHintState?.source;
    const finaleChanged =
      Boolean(nextFinale?.active) !== Boolean(lastPageFinale?.active) ||
      Boolean(nextFinale?.stayAndDoodle) !== Boolean(lastPageFinale?.stayAndDoodle) ||
      Math.abs((nextFinale?.progress ?? 0) - (lastPageFinale?.progress ?? 0)) > 0.03;
    const changed =
      view.coreAwake !== lastCoreAwake ||
      view.pageComplete !== lastPageComplete ||
      questsChanged ||
      hintChanged ||
      finaleChanged ||
      nextPencilCue !== lastWispPencilCue ||
      nextPrologueActive !== lastPrologueActive;

    lastCoreAwake = view.coreAwake;
    lastCoreTotal = view.coreTotal;
    lastPageComplete = view.pageComplete;
    latestActors = view.actors;
    lastHeroQuests = nextQuests;
    lastStoryStars = nextStars;
    lastHintState = nextHint;
    lastPageFinale = nextFinale;
    lastWisp = nextWisp;
    lastWonderWhisper = view.wonderWhisper ?? null;
    lastPokeInvites = view.pokeInvites ?? [];
    lastWispPencilCue = nextPencilCue;
    lastPrologueActive = nextPrologueActive;

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
      toolMode: doodle ? 'wand' : 'pencil',
      hoverPos: latestHover,
      dogEarGlow: currentMode === 'chapter' && lastPageComplete ? 1 : 0,
      hintDim: currentMode === 'chapter' ? (nextHint?.dimAmount ?? 0) : 0,
      wonderSketch: art.wonderSketch,
    });
    return changed;
  };

  const loadChapterScene = (chapter: ChapterId, snapshot?: StoryPageSnapshot): void => {
    const c = run.core();
    if (!c) return;
    const uId: UniverseId = run.universeId?.() ?? CHAPTER_TO_UNIVERSE[chapter] ?? 'chromaCosmos';
    const uDef = UNIVERSE_BY_ID[uId];
    audio.setUniverseTone?.(uDef.semitoneShift, uDef.ambient);
    const wardrobe = vault.get().wardrobe;
    currentSprites = art.sprites(wardrobe);
    const seed = (c.seed ^ Math.imul(c.chapterIndex + 1, 0x45d9f3b)) >>> 0;
    const page = art.compilePage(chapter, seed, wardrobe);
    currentPage = page;
    pageCompleteNotified = false;
    awakeRegionsKinds.clear();
    awakeActors.clear();
    const playPrologue = chapter === 'rooftop' && c.chapterIndex === 0 && !snapshot;
    sim.loadPage(
      page,
      {
        seed,
        chapterIndex: c.chapterIndex,
        brushes: c.brushes,
        relics: c.relics,
        playPrologue,
      },
      currentSprites,
    );
    if (snapshot && snapshot.sceneId === chapter) {
      sim.restorePage(snapshot);
    }
    syncTool();
    renderer.loadPage(page, currentSprites, wispSprite);
    consumeViewAndRender(0, performance.now());
    syncStems();
    if (playPrologue) audio.uiFoley?.('paperRustle');
    else if (c.chapterIndex === 0 && !snapshot && uId !== 'chromaCosmos') audio.uiFoley?.('wispChime');
    pushHud(true);
  };

  const loadHubScene = (): void => {
    const v = vault.get();
    const wardrobe = v.wardrobe;
    const progress = computeUniverseProgress(v);
    const uDef = UNIVERSE_BY_ID[progress.activeUniverse];
    audio.setUniverseTone?.(uDef.semitoneShift, uDef.ambient);
    currentSprites = art.sprites(wardrobe);
    let page: CompiledPage;
    try {
      page = art.compilePage(uDef.hub, 1, wardrobe);
    } catch {
      page = art.compilePage('bedroomHub', 1, wardrobe);
    }
    currentPage = page;
    pageCompleteNotified = false;
    awakeRegionsKinds.clear();
    awakeActors.clear();
    sim.loadPage(
      page,
      {
        seed: 1,
        chapterIndex: 0,
        brushes: ['standard'],
        relics: [],
        viewOnly: true,
      },
      currentSprites,
    );
    syncTool();
    renderer.loadPage(page, currentSprites, wispSprite);
    consumeViewAndRender(0, performance.now());
    syncStems();
    pushHud(true);
  };

  const selectActiveUniverse = (id: UniverseId): boolean => {
    if (!(id in UNIVERSE_BY_ID)) return false;
    const progress = computeUniverseProgress(vault.get());
    if (!progress.unlockedSet.has(id)) return false;
    vault.update((d) => {
      if (id === 'chromaCosmos') delete d.activeUniverse;
      else d.activeUniverse = id;
    });
    vault.healCheck();
    const uDef = UNIVERSE_BY_ID[id];
    audio.setUniverseTone?.(uDef.semitoneShift, uDef.ambient);
    if (currentMode === 'hub') loadHubScene();
    void pushHub();
    pushHud(true);
    return true;
  };

  const loadBookPage = (): void => {
    if (!activeBook || activeBook.pages.length === 0) return;
    activeBookPage = Math.max(0, Math.min(activeBook.pages.length - 1, activeBookPage));
    const snap = activeBook.pages[activeBookPage]!;
    const bookUId: UniverseId = activeBook.universeId ?? CHAPTER_TO_UNIVERSE[snap.sceneId] ?? 'chromaCosmos';
    const bookUDef = UNIVERSE_BY_ID[bookUId];
    audio.setUniverseTone?.(bookUDef.semitoneShift, bookUDef.ambient);
    const wardrobe = vault.get().wardrobe;
    currentSprites = art.sprites(wardrobe);
    const page = art.compilePage(snap.sceneId, snap.seed, wardrobe);
    currentPage = page;
    sim.loadPage(
      page,
      {
        seed: snap.seed,
        chapterIndex: activeBookPage,
        brushes: ['standard'],
        relics: [],
        viewOnly: true,
      },
      currentSprites,
    );
    sim.restorePage(snap);
    renderer.loadPage(page, currentSprites, wispSprite);
    setAppMode('book');
    ui.showBook(
      {
        id: activeBook.id,
        title: activeBook.title,
        galaxyName: activeBook.galaxyName,
        createdAt: activeBook.createdAt,
        pageCount: activeBook.pages.length,
        seed: activeBook.seed,
        ...(activeBook.universeId ? { universeId: activeBook.universeId } : {}),
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

  const recordDiscoveredCard = (card: DraftCardId): void => {
    vault.update((d) => {
      const list = d.discoveredCards ?? [];
      if (!list.includes(card)) {
        d.discoveredCards = [...list, card];
      }
    });
    vault.healCheck();
  };

  const enterHub = async (): Promise<void> => {
    setAppMode('hub');
    loadHubScene();
    await pushHub();
  };

  const finishVoyage = async (): Promise<UniverseId | null> => {
    const galaxy = run.galaxyName();
    const c = run.core();
    const uId: UniverseId = run.universeId?.() ?? 'chromaCosmos';
    const uDef = UNIVERSE_BY_ID[uId];
    const bookId = `book-${c?.seed ?? Date.now()}-${Date.now()}`;
    const createdAt = Date.now();
    const book: Storybook = {
      id: bookId,
      title: galaxy,
      galaxyName: galaxy,
      createdAt,
      seed: c?.seed ?? 1,
      universeId: uId,
      pages: [...donePages],
    };
    await vault.saveStorybook(book);

    const prevProgress = computeUniverseProgress(vault.get());
    const isFirstClear = !prevProgress.completedSet.has(uId);
    const bonusGems = isFirstClear ? GEM_REWARDS.universeFirstClear : 0;
    const nextDef = UNIVERSES[uDef.index + 1] ?? null;
    const newlyUnlockedDef = nextDef && !prevProgress.unlockedSet.has(nextDef.id) ? nextDef : null;

    const unlockedFromBadges: MaterialId[] = [];
    vault.update((d) => {
      d.gems += GEM_REWARDS.runComplete + bonusGems;
      d.stats.runsCompleted += 1;
      d.run = null;
      const nextCompleted = new Set<UniverseId>(d.completedUniverses ?? []);
      if (prevProgress.completedSet.has('chromaCosmos')) nextCompleted.add('chromaCosmos');
      nextCompleted.add(uId);
      d.completedUniverses = UNIVERSE_ORDER.filter((id) => nextCompleted.has(id));
      if (newlyUnlockedDef) {
        d.activeUniverse = newlyUnlockedDef.id;
      }
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

    if (newlyUnlockedDef) {
      audio.universeUnlock?.();
    }

    const afterProgress = computeUniverseProgress(vault.get());
    const finaleMeta: FinaleMeta = {
      universeId: uId,
      universeName: uDef.name,
      newlyUnlocked: newlyUnlockedDef
        ? {
            id: newlyUnlockedDef.id,
            number: newlyUnlockedDef.number,
            name: newlyUnlockedDef.name,
            tagline: newlyUnlockedDef.tagline,
          }
        : null,
      completedCount: afterProgress.completedCount,
      totalUniverses: TOTAL_UNIVERSES,
      bonusGems,
    };

    setAppMode('finale');
    syncStems();
    pushHud(true);
    const choice = await ui.showFinale(galaxy, finaleMeta);
    if (typeof choice === 'string' && choice in UNIVERSE_BY_ID && afterProgress.unlockedSet.has(choice)) {
      finaleJumping = true;
      return choice;
    }
    if (currentMode === 'finale') {
      await enterHub();
    }
    return null;
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
        if (ACTIVE_BRUSH_SET.has(card)) {
          selectedBrush = card as ActiveBrushId;
        }
        recordDiscoveredCard(card);
        persistRunCore();
      }
    }
    await runDoorSelection();
  };

  const handleTurnPage = async (_early: boolean): Promise<void> => {
    if (transitioning || !run.core()) return;
    transitioning = true;
    let stepIntoUniverse: UniverseId | null = null;
    try {
      const snap = sim.snapshotPage();
      donePages.push(snap);
      await vault.saveRunPages(null, donePages);

      const next = run.completeChapter();
      persistRunCore();
      if (next === 'complete') {
        stepIntoUniverse = await finishVoyage();
      } else {
        await runDraftAndDoorFlow();
      }
    } finally {
      transitioning = false;
    }
    if (stepIntoUniverse) {
      try {
        await startNewRun((Date.now() ^ 0x9e3779b9) & 0x7fffffff, stepIntoUniverse);
      } finally {
        finaleJumping = false;
      }
    } else {
      finaleJumping = false;
    }
  };

  const startNewRun = async (seed: number, explicitUniverseId?: UniverseId): Promise<void> => {
    if (transitioning) return;
    transitioning = true;
    try {
      const progress = computeUniverseProgress(vault.get());
      const requested = explicitUniverseId ?? progress.activeUniverse;
      const uId: UniverseId =
        requested in UNIVERSE_BY_ID && progress.unlockedSet.has(requested) ? requested : 'chromaCosmos';
      if (uId !== progress.activeUniverse) {
        vault.update((d) => {
          if (uId === 'chromaCosmos') delete d.activeUniverse;
          else d.activeUniverse = uId;
        });
      }
      const core: RunCore = run.start(seed, uId);
      const uDef = UNIVERSE_BY_ID[uId];
      audio.setUniverseTone?.(uDef.semitoneShift, uDef.ambient);
      donePages = [];
      selectedBrush = 'standard';
      doodle = false;
      await vault.saveRunPages(null, []);
      persistRunCore();
      setAppMode('chapter');
      loadChapterScene(core.path[0] ?? uDef.chapters[0]?.id ?? 'rooftop');
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
      const uDef = UNIVERSE_BY_ID[run.universeId?.() ?? 'chromaCosmos'];
      audio.setUniverseTone?.(uDef.semitoneShift, uDef.ambient);
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
      onSelectUniverse(id) {
        if (transitioning) return;
        selectActiveUniverse(id);
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
      onSelectToolMode(mode) {
        doodle = mode === 'wand';
        syncTool();
        pushHud(true);
      },
      onRequestHint(questId) {
        sim.requestHint?.(questId, questId ? 'medallion' : 'lantern');
        pushHud(true);
      },
      onHighlightMilestone(id) {
        sim.nudgeMilestone?.(id);
        pushHud(true);
      },
      onStayAndDoodle(stay) {
        sim.setStayAndDoodle?.(stay);
        pushHud(true);
      },
      onUiFoley(kind) {
        audio.uiFoley?.(kind);
      },
      onDismissPrologue() {
        sim.dismissPrologue?.();
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
        if (currentMode === 'hub') void pushHub();
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
        sim.setSprites?.(currentSprites);
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
        sim.setSprites?.(currentSprites);
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
        const chapterTitle = ALL_CHAPTERS.find((c) => c.id === snap.sceneId)?.title ?? snap.sceneId;
        const pageCanvas = renderer.capturePage(4);
        const postcard = keepsake.renderPostcard(pageCanvas, {
          title: activeBook.title,
          galaxyName: activeBook.galaxyName,
          chapterTitle,
          dateIso: new Date(activeBook.createdAt).toISOString(),
        });
        void keepsake
          .savePng(postcard, `${slugify(activeBook.galaxyName)}-page-${activeBookPage + 1}.png`)
          .then(() => {
            audio.uiFoley?.('paperRustle');
            ui.toast('Keepsake postcard saved!');
          })
          .catch(() => ui.toast('Could not export keepsake PNG.'));
      },
      onSaveBookKeepsake(bookId) {
        void (async () => {
          const book = await vault.getStorybook(bookId);
          if (!book || book.pages.length === 0) {
            ui.toast('No saved pages yet.');
            return;
          }
          const pageIdx = book.pages.length - 1;
          const snap = book.pages[pageIdx]!;
          const chapterTitle = ALL_CHAPTERS.find((c) => c.id === snap.sceneId)?.title ?? snap.sceneId;
          const prevMode = currentMode;
          const wardrobe = vault.get().wardrobe;
          const sprites = art.sprites(wardrobe);
          const page = art.compilePage(snap.sceneId, snap.seed, wardrobe);
          sim.loadPage(
            page,
            {
              seed: snap.seed,
              chapterIndex: pageIdx,
              brushes: ['standard'],
              relics: [],
              viewOnly: true,
            },
            sprites,
          );
          sim.restorePage(snap);
          renderer.loadPage(page, sprites, wispSprite);
          consumeViewAndRender(0, performance.now());
          const pageCanvas = renderer.capturePage(4);
          if (prevMode === 'hub') loadHubScene();
          const postcard = keepsake.renderPostcard(pageCanvas, {
            title: book.title,
            galaxyName: book.galaxyName,
            chapterTitle,
            dateIso: new Date(book.createdAt).toISOString(),
          });
          await keepsake
            .savePng(postcard, `${slugify(book.galaxyName)}-keepsake.png`)
            .then(() => {
              audio.uiFoley?.('paperRustle');
              ui.toast('Keepsake postcard saved!');
            })
            .catch(() => ui.toast('Could not export keepsake PNG.'));
        })();
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
            const importedU = UNIVERSE_BY_ID[computeUniverseProgress(vault.get()).activeUniverse];
            audio.setUniverseTone?.(importedU.semitoneShift, importedU.ambient);
            currentSprites = art.sprites(vault.get().wardrobe);
            sim.setSprites?.(currentSprites);
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
        latestHover = p;
        sim.hover(p);
      },
      onFinaleDone() {
        void Promise.resolve()
          .then(() => Promise.resolve())
          .then(() => {
            if (currentMode === 'finale' && !finaleJumping) {
              void enterHub();
            }
          });
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
    if (currentMode === 'chapter' && run.core() && currentPage) {
      void vault.saveRunPages(sim.snapshotPage(), donePages);
    }
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
    let shouldAutoTurn = false;
    const heroQuestsHandledThisTick = new Set<HeroQuestId>();

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
            ui.toast('Lumi woke up!');
          } else if (ev.actor === 'nova') {
            if (!vault.get().badges.includes('novaFriend')) newBadges.push('novaFriend');
            ui.toast('Nova woke up!');
          } else if (ev.actor === 'violet') {
            ui.toast('Violet is ready!');
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
        case 'heroQuestComplete': {
          heroQuestsHandledThisTick.add(ev.questId);
          audio.storyMedallion?.(ev.index, ev.total);
          const clientPt = renderer.internalToClient(ev.x, ev.y);
          ui.animateStarThread?.(ev.questId, clientPt.x, clientPt.y);
          break;
        }
        case 'storyStarLit': {
          if (!heroQuestsHandledThisTick.has(ev.milestoneId)) {
            audio.uiFoley?.('wispChime');
            const clientPt = renderer.internalToClient(ev.x, ev.y);
            ui.animateStarThread?.(ev.milestoneId, clientPt.x, clientPt.y);
          }
          break;
        }
        case 'hintStarted': {
          if (ev.source === 'lantern' || ev.source === 'medallion') {
            audio.hintLantern?.();
            const q = lastHeroQuests.find((h) => h.questId === ev.questId);
            const firstRegion = ev.regionIds[0];
            const pt =
              (firstRegion !== undefined ? currentPage?.regions[firstRegion]?.centroid : undefined) ??
              (q ? { x: q.x, y: q.y } : { x: 240, y: 135 });
            const clientPt = renderer.internalToClient(pt.x, pt.y);
            ui.animateHintBeam?.(ev.questId, clientPt.x, clientPt.y);
          }
          break;
        }
        case 'wispGuide':
          if (ev.mode === 'idleGuide') {
            audio.uiFoley?.('wispChime');
          }
          break;
        case 'prologueEnd':
          audio.uiFoley?.('paperRustle');
          if (!vault.get().prologueSeen) {
            vault.update((d) => {
              d.prologueSeen = true;
            });
            vault.healCheck();
          }
          break;
        case 'pageComplete':
          if (!pageCompleteNotified) {
            pageCompleteNotified = true;
            audio.pageFinale?.();
          }
          break;
        case 'autoPageTurnReady':
          shouldAutoTurn = true;
          break;
        case 'relic':
          ui.animateRelicPulse?.(ev.relic, ev.tag);
          break;
        case 'itemFoley':
          audio.uiFoley?.(ev.kind);
          break;
        case 'violetBounce':
          break;
      }
    }

    if (stemsChanged) syncStems();

    if (gemsEarned > 0) {
      audio.uiFoley?.('jarClink');
      ui.animateCrystalDrop?.(gemsEarned);
    }

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

    if (shouldAutoTurn && currentMode === 'chapter' && !transitioning) {
      void handleTurnPage(false);
    }
  };

  renderer.start((dtMs, timeMs) => {
    recordFrameTime(performance.now());
    sim.update(dtMs, timeMs);
    processEvents();
    const changed = consumeViewAndRender(dtMs, timeMs);
    if (timeMs - lastHudTime > 64 || changed) {
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
        doodle = false;
        if (materialId !== undefined && Number.isInteger(materialId) && materialId >= 1 && materialId <= MAX_MATERIAL_ID) {
          selectedMaterial = materialId;
        }
        sim.setTool({ materialId: selectedMaterial, brush: selectedBrush, doodle: false, toolMode: 'pencil' });
        pushHud(true);
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
        return sim.regionPercent(id) >= 0.82;
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
      startRun(seed = 4242, universeId) {
        void startNewRun(seed, universeId);
      },
      universes() {
        return computeUniverseProgress(vault.get()).items.map((u) => ({
          ...u,
          chapterTitles: [...u.chapterTitles],
        }));
      },
      selectUniverse(id) {
        return selectActiveUniverse(id);
      },
      unlockUpTo(count) {
        const clamped = Math.max(1, Math.min(TOTAL_UNIVERSES, Math.floor(count)));
        const completed = clamped > 1 ? [...UNIVERSE_ORDER.slice(0, clamped - 1)] : [];
        vault.update((d) => {
          if (completed.length > 0) d.completedUniverses = completed;
          else delete d.completedUniverses;
          if (clamped === 1 && d.stats.runsCompleted > 0) {
            // Preserve stats; activeUniverse resets if now locked
          }
          const nextUnlocked = new Set<UniverseId>(UNIVERSE_ORDER.slice(0, clamped));
          if (d.activeUniverse && !nextUnlocked.has(d.activeUniverse)) {
            delete d.activeUniverse;
          }
        });
        vault.healCheck();
        if (currentMode === 'hub') loadHubScene();
        void pushHub();
        pushHud(true);
      },
      async completePage() {
        if (!currentPage) return;
        const questRegionIds =
          lastHeroQuests.length > 0
            ? lastHeroQuests.flatMap((q) => q.regionIds)
            : (currentPage.heroQuests?.flatMap((q) => q.regionIds) ?? currentPage.coreRegionIds);
        const ids = Array.from(new Set(questRegionIds));
        const unlocked = vault.get().unlockedMaterials;
        for (let i = 0; i < ids.length; i++) {
          if (lastPageComplete) break;
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
      setToolMode(mode) {
        doodle = mode === 'wand';
        syncTool();
        pushHud(true);
      },
      hoverRegion(id) {
        if (!currentPage) return false;
        const r = currentPage.regions[id];
        if (!r) return false;
        latestHover = { x: r.centroid.x, y: r.centroid.y };
        sim.hover(latestHover);
        return true;
      },
      storyStars() {
        return lastStoryStars.map((s) => ({ ...s, regionIds: [...s.regionIds] }));
      },
      heroQuests() {
        return lastHeroQuests.map((q) => ({ ...q, regionIds: [...q.regionIds] }));
      },
      hintState() {
        return lastHintState ? { ...lastHintState, targetRegionIds: [...lastHintState.targetRegionIds] } : null;
      },
      pageFinale() {
        return lastPageFinale ? { ...lastPageFinale } : null;
      },
      requestHint(questId) {
        const res = sim.requestHint?.(questId, questId ? 'medallion' : 'lantern') ?? null;
        pushHud(true);
        return res ? { ...res, targetRegionIds: [...res.targetRegionIds] } : null;
      },
      setStayAndDoodle(stay) {
        sim.setStayAndDoodle?.(stay);
        pushHud(true);
      },
      addGems(amount) {
        const delta = Math.max(0, Math.floor(amount));
        if (delta <= 0) return;
        vault.update((d) => {
          d.gems += delta;
        });
        vault.healCheck();
        pushHud(true);
        if (currentMode === 'hub') void pushHub();
      },
      wisp() {
        return lastWisp ? { ...lastWisp, ghostPath: lastWisp.ghostPath.map((p) => ({ ...p })) } : null;
      },
      wonderWhisper() {
        return lastWonderWhisper ? { ...lastWonderWhisper } : null;
      },
      pokeInvites() {
        return lastPokeInvites.map((p) => ({ ...p }));
      },
      nudgeMilestone(id) {
        sim.nudgeMilestone?.(id);
        pushHud(true);
      },
    };
  }

  window.__chroma = debugObj;
}

void boot();
