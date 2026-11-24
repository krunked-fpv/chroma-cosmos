import { describe, expect, it } from 'vitest';
import {
  CAUSALITY_MATRIX,
  IDLE_WISP_DELAY_MS,
  PAGE_W,
  PROLOGUE_DURATION_MS,
  REGION_FLAG,
  SOCKET_WIGGLE_MS,
  WAND_UV_PEEK_RADIUS,
} from '../../../src/contracts';
import type { MaterialId, StoryMilestone } from '../../../src/contracts';
import { createSimulation } from '../../../src/simulation';
import { buildFixture, CORE_IDS, ctxOf, RECTS } from './fixture';
import { actor, count, drag, ge, mkSim, paintRegion, run, setTool, tap } from './helpers';

const page = buildFixture();

describe('ToolMode sync, Pencil hover shimmer, and Wand glow', () => {
  it('normalizes toolMode and doodle consistently and tracks hoveredRegionId & wandGlow', () => {
    const sim = mkSim();
    const cloudC = page.regions[14]!.centroid;

    // Pencil mode via explicit toolMode overrides doodle: true
    sim.setTool({ materialId: 6, brush: 'standard', doodle: true, toolMode: 'pencil' });
    sim.hover({ x: cloudC.x, y: cloudC.y });
    let v = sim.view();
    expect(v.hoveredRegionId).toBe(14);
    expect(v.wandGlow).toBeNull();

    // Ink pixel snaps to nearest colourable uncompleted region
    sim.hover({ x: 120.4, y: 60 }); // ink column adjacent to planet 12
    expect(sim.view().hoveredRegionId).toBe(12);

    // Sky and unrevealed ghost return 0
    sim.hover({ x: 245, y: 10 });
    expect(sim.view().hoveredRegionId).toBe(0);
    sim.hover({ x: 450, y: 40 }); // ghost 240 without uvFlashlight
    expect(sim.view().hoveredRegionId).toBe(0);

    // Bloomed region returns 0
    paintRegion(sim, 14, 6, 2);
    sim.hover({ x: cloudC.x, y: cloudC.y });
    expect(sim.view().hoveredRegionId).toBe(0);

    // Wand mode via toolMode overrides doodle: false
    sim.setTool({ materialId: 6, brush: 'standard', doodle: false, toolMode: 'wand' });
    sim.hover({ x: 245, y: 10 });
    v = sim.view();
    expect(v.hoveredRegionId).toBe(0);
    expect(v.wandGlow).toEqual({ x: 245, y: 10, r: WAND_UV_PEEK_RADIUS });

    // Sky doodle works when enabled through toolMode: 'wand'
    sim.drainStampBatches();
    drag(sim, [{ x: 245, y: 10 }, { x: 265, y: 12 }]);
    const batches = sim.drainStampBatches();
    expect(batches.length).toBeGreaterThan(0);
    expect(batches[0]!.allowed[255]).toBe(1);

    // Hovering near ghost in Wand mode without uvFlashlight does NOT reveal ghostRevealed
    sim.hover({ x: 450, y: 40 });
    v = sim.view();
    expect(v.wandGlow).toEqual({ x: 450, y: 40, r: WAND_UV_PEEK_RADIUS });
    expect(v.uvFlashlight).toBeNull();
    expect(v.regionState[240 * 4 + 3]! & REGION_FLAG.hidden).toBe(REGION_FLAG.hidden);
    expect(v.regionState[240 * 4 + 3]! & REGION_FLAG.ghostRevealed).toBe(0);

    // Clearing hover clears wandGlow
    sim.hover(null);
    expect(sim.view().wandGlow).toBeNull();
  });

  it('tracks active press brushPt for hoveredRegionId/wandGlow and disables both in viewOnly', () => {
    const sim = mkSim();
    const c12 = page.regions[12]!.centroid;
    sim.gesture(ge('start', c12.x, c12.y));
    expect(sim.view().hoveredRegionId).toBe(12);
    sim.gesture(ge('end', c12.x, c12.y));
    expect(sim.view().hoveredRegionId).toBe(0);

    const viewOnly = mkSim({ viewOnly: true });
    viewOnly.hover({ x: c12.x, y: c12.y });
    expect(viewOnly.view().hoveredRegionId).toBe(0);
    viewOnly.setTool({ materialId: 6, brush: 'standard', doodle: true, toolMode: 'wand' });
    expect(viewOnly.view().wandGlow).toBeNull();
  });
});

describe('Dual-star Story Star Sockets', () => {
  it('auto-groups coreRegionIds into 5 ordered milestones and emits storyStarLit on completion', () => {
    const sim = mkSim();
    const initial = sim.view().storyStars!;
    expect(initial.map((s) => s.id)).toEqual(['violet', 'lumi', 'nova', 'planet', 'cloud']);
    expect(initial[1]!.regionIds).toEqual([5, 6]);
    expect(initial[1]!.lit).toBe(false);
    expect(initial[1]!.progress).toBe(0);

    const c5 = page.regions[5]!.centroid;
    const c6 = page.regions[6]!.centroid;
    expect(initial[1]!.x).toBeCloseTo((c5.x + c6.x) / 2, 4);
    expect(initial[1]!.y).toBeCloseTo((c5.y + c6.y) / 2, 4);

    // Partial milestone progress does not emit storyStarLit
    paintRegion(sim, 5, 6, 2);
    expect(count(sim.drainEvents(), 'storyStarLit')).toBe(0);
    const half = sim.view().storyStars!.find((s) => s.id === 'lumi')!;
    expect(half.progress).toBeCloseTo(0.5, 6);
    expect(half.lit).toBe(false);

    // Completing the second region lights Lumi's star once with milestone centroid
    paintRegion(sim, 6, 6, 2);
    const ev = sim.drainEvents();
    const litEvents = ev.filter((e) => e.type === 'storyStarLit');
    expect(litEvents).toEqual([
      { type: 'storyStarLit', milestoneId: 'lumi', index: 1, x: initial[1]!.x, y: initial[1]!.y },
    ]);
    const lit = sim.view().storyStars!.find((s) => s.id === 'lumi')!;
    expect(lit.progress).toBe(1);
    expect(lit.lit).toBe(true);

    // Re-stroking completed milestone never re-emits storyStarLit
    paintRegion(sim, 6, 3, 2);
    expect(count(sim.drainEvents(), 'storyStarLit')).toBe(0);
  });

  it('uses CompiledPage.storyMilestones when provided and restores silently', () => {
    const custom = buildFixture();
    const milestones: StoryMilestone[] = [
      { id: 'lumi', kind: 'lumi', label: 'Lumi', regionIds: [5, 6], centroid: { x: 100, y: 220 } },
      { id: 'planet', kind: 'planet', label: 'Planet', regionIds: [12, 13], centroid: { x: 130, y: 60 } },
      { id: 'cloud', kind: 'cloud', label: 'Clouds', regionIds: [14, 15], centroid: { x: 130, y: 140 } },
    ];
    custom.storyMilestones = milestones;

    const a = createSimulation();
    a.loadPage(custom, ctxOf());
    a.setTool({ materialId: 6, brush: 'standard', doodle: false });
    expect(a.view().storyStars!.map((s) => s.id)).toEqual(['lumi', 'planet', 'cloud']);

    paintRegion(a, 5, 6, 2);
    paintRegion(a, 6, 6, 2);
    const snap = a.snapshotPage();

    const b = createSimulation();
    b.loadPage(custom, ctxOf());
    b.restorePage(snap);
    expect(b.drainEvents()).toEqual([]);
    const restoredLumi = b.view().storyStars!.find((s) => s.id === 'lumi')!;
    expect(restoredLumi.lit).toBe(true);
    expect(restoredLumi.progress).toBe(1);
  });

  it('nudgeMilestone wiggles uncolored regions, sets guideGlow, guides Wisp, and clears after SOCKET_WIGGLE_MS', () => {
    const sim = mkSim();
    // Pre-bloom region 5 so only region 6 of 'lumi' is uncolored
    paintRegion(sim, 5, 6, 2);
    sim.drainEvents();

    sim.nudgeMilestone!('lumi');
    const ev = sim.drainEvents();
    expect(ev).toContainEqual({ type: 'wispGuide', regionId: 6, mode: 'nudge' });

    const v0 = sim.view();
    expect(v0.wisp!.active).toBe(true);
    expect(v0.wisp!.mode).toBe('nudge');
    expect(v0.wisp!.targetRegionId).toBe(6);
    expect(v0.regionState[6 * 4 + 3]! & REGION_FLAG.wiggle).toBe(REGION_FLAG.wiggle);
    expect(v0.regionState[6 * 4 + 3]! & REGION_FLAG.guideGlow).toBe(REGION_FLAG.guideGlow);
    // Already-bloomed region 5 does NOT get guideGlow
    expect(v0.regionState[5 * 4 + 3]! & REGION_FLAG.guideGlow).toBe(0);

    // Mid-nudge still active
    run(sim, Math.floor(SOCKET_WIGGLE_MS / 2));
    const vMid = sim.view();
    expect(vMid.wisp!.active).toBe(true);
    expect(vMid.wisp!.mode).toBe('nudge');

    // After SOCKET_WIGGLE_MS, wiggle, guideGlow, and Wisp clear
    run(sim, SOCKET_WIGGLE_MS);
    const vEnd = sim.view();
    expect(vEnd.wisp!.active).toBe(false);
    expect(vEnd.wisp!.mode).toBe('hidden');
    expect(vEnd.regionState[6 * 4 + 3]! & REGION_FLAG.wiggle).toBe(0);
    expect(vEnd.regionState[6 * 4 + 3]! & REGION_FLAG.guideGlow).toBe(0);

    // Nudging an already-lit milestone is a no-op
    paintRegion(sim, 6, 6, 2);
    sim.drainEvents();
    sim.nudgeMilestone!('lumi');
    expect(sim.drainEvents()).toEqual([]);
    expect(sim.view().wisp!.active).toBe(false);
  });
});

describe('Wordless Visual Prologue', () => {
  it('runs prologueMist -> prologueTapPencil -> prologueStroke with in-region ghostPath and dissolves on first stroke', () => {
    const sim = mkSim({ playPrologue: true });
    const v0 = sim.view();
    const w0 = v0.wisp!;
    expect(w0.active).toBe(true);
    expect(w0.mode).toBe('prologueMist');
    expect(w0.targetRegionId).toBe(5); // prefers Lumi body 5
    expect(w0.prologueMist).toBeGreaterThan(0);
    expect(w0.ghostPath.length).toBeGreaterThanOrEqual(8);
    expect(w0.ghostPath.length).toBeLessThanOrEqual(14);
    for (const pt of w0.ghostPath) {
      expect(page.regionMap[Math.floor(pt.y) * PAGE_W + Math.floor(pt.x)]).toBe(5);
    }

    // Peak mist around 600ms
    run(sim, 600, 20);
    const vPeak = sim.view().wisp!;
    expect(vPeak.mode).toBe('prologueMist');
    expect(vPeak.prologueMist).toBeCloseTo(0.85, 2);

    // 1800..3100ms: prologueTapPencil flutters toward bottom-center tray (165, 256)
    run(sim, 2400 - 600, 20);
    const vTap = sim.view().wisp!;
    expect(vTap.mode).toBe('prologueTapPencil');
    expect(vTap.prologueMist).toBeLessThan(0.35);

    run(sim, 3000 - 2400, 20);
    const vTapEnd = sim.view().wisp!;
    expect(vTapEnd.mode).toBe('prologueTapPencil');
    expect(Math.hypot(vTapEnd.x - 165, vTapEnd.y - 256)).toBeLessThan(30);

    // 3100ms+: prologueStroke loops ghostStrokeT every 2200ms and fades mist to 0 by PROLOGUE_DURATION_MS
    run(sim, 4200 - 3000, 20);
    const vStroke1 = sim.view().wisp!;
    expect(vStroke1.mode).toBe('prologueStroke');
    expect(vStroke1.ghostStrokeT).toBeCloseTo(0.5, 1);

    run(sim, PROLOGUE_DURATION_MS - 4200, 20);
    const vEndMist = sim.view().wisp!;
    expect(vEndMist.mode).toBe('prologueStroke');
    expect(vEndMist.prologueMist).toBe(0);

    // Continues looping past PROLOGUE_DURATION_MS without switching to idleGuide
    run(sim, 2200, 20);
    const vLoop = sim.view().wisp!;
    expect(vLoop.mode).toBe('prologueStroke');
    expect(vLoop.active).toBe(true);

    // First stroke immediately paints and dissolves prologue with a single prologueEnd event
    const c5 = page.regions[5]!.centroid;
    tap(sim, c5.x, c5.y);
    expect(sim.regionPercent(5)).toBeGreaterThan(0);
    const ev = sim.drainEvents();
    expect(ev.filter((e) => e.type === 'prologueEnd')).toHaveLength(1);
    expect(sim.view().wisp!.active).toBe(false);
    expect(sim.view().wisp!.mode).toBe('hidden');

    // Subsequent strokes or dismissPrologue do not emit prologueEnd again
    sim.dismissPrologue!();
    tap(sim, c5.x, c5.y);
    expect(count(sim.drainEvents(), 'prologueEnd')).toBe(0);
  });

  it('never blocks painting at t=0ms and smoothly dissolves mist on early first stroke', () => {
    const sim = mkSim({ playPrologue: true });
    run(sim, 600, 20);
    expect(sim.view().wisp!.prologueMist).toBeGreaterThan(0.7);

    const c14 = page.regions[14]!.centroid;
    tap(sim, c14.x, c14.y);
    expect(sim.regionPercent(14)).toBeGreaterThan(0);
    expect(count(sim.drainEvents(), 'prologueEnd')).toBe(1);
    expect(sim.view().wisp!.active).toBe(false);
    expect(sim.view().wisp!.mode).toBe('hidden');

    // Mist dissolves smoothly to 0 over dissolve window
    run(sim, 300, 20);
    expect(sim.view().wisp!.prologueMist).toBe(0);
  });

  it('skips prologue when playPrologue is false or viewOnly is true, and falls back when region 5 is absent', () => {
    const normal = mkSim();
    expect(normal.view().wisp!.active).toBe(false);
    expect(normal.view().wisp!.mode).toBe('hidden');

    const viewOnly = mkSim({ playPrologue: true, viewOnly: true });
    expect(viewOnly.view().wisp!.active).toBe(false);

    // Custom fixture without region 5 (Lumi body), containing Violet suit 3
    const rects = RECTS.filter((r) => r.id !== 5).concat([{ id: 3, x0: 20, y0: 190, x1: 99, y1: 259 }]);
    const noLumiPage = buildFixture({ rects, withActors: false });
    noLumiPage.coreRegionIds = [1, 2, 3, 12, 14];
    const sim = createSimulation();
    sim.loadPage(noLumiPage, ctxOf({ playPrologue: true }));
    expect(sim.view().wisp!.targetRegionId).toBe(3);
  });
});

describe('7-Second Idle Starlight Wisp Guide', () => {
  it('triggers after IDLE_WISP_DELAY_MS, sets guideGlow, ignores <=2px jitter, and clears on input or pageComplete', () => {
    const sim = mkSim();
    sim.hover({ x: 200, y: 150 });
    sim.drainEvents();

    // Below delay: stays hidden
    run(sim, IDLE_WISP_DELAY_MS - 200, 50);
    expect(sim.view().wisp!.active).toBe(false);
    expect(count(sim.drainEvents(), 'wispGuide')).toBe(0);

    // Tiny pointer jitter (<= 2px) does NOT reset idle timer
    sim.hover({ x: 201, y: 150.5 });
    run(sim, 300, 50);

    const v1 = sim.view();
    expect(v1.wisp!.active).toBe(true);
    expect(v1.wisp!.mode).toBe('idleGuide');
    expect(v1.wisp!.targetRegionId).toBe(1); // first uncolored region of first unlit milestone ('violet')
    expect(v1.regionState[1 * 4 + 3]! & REGION_FLAG.guideGlow).toBe(REGION_FLAG.guideGlow);
    expect(v1.regionState[5 * 4 + 3]! & REGION_FLAG.guideGlow).toBe(0);
    expect(sim.drainEvents()).toEqual([{ type: 'wispGuide', regionId: 1, mode: 'idleGuide' }]);

    // Continuing idle moves Wisp smoothly without duplicating wispGuide event
    const posBefore = { x: v1.wisp!.x, y: v1.wisp!.y };
    run(sim, 800, 50);
    const v2 = sim.view();
    expect(count(sim.drainEvents(), 'wispGuide')).toBe(0);
    expect(Math.hypot(v2.wisp!.x - posBefore.x, v2.wisp!.y - posBefore.y)).toBeGreaterThan(1);

    // Meaningful hover movement (> 2px) clears guideGlow and hides Wisp immediately
    sim.hover({ x: 220, y: 150 });
    const vClear = sim.view();
    expect(vClear.wisp!.active).toBe(false);
    expect(vClear.wisp!.mode).toBe('hidden');
    expect(vClear.regionState[1 * 4 + 3]! & REGION_FLAG.guideGlow).toBe(0);

    // After lighting Violet (1, 2), next idle targets Lumi (5)
    paintRegion(sim, 1, 6, 2);
    paintRegion(sim, 2, 6, 2);
    sim.drainEvents();
    run(sim, IDLE_WISP_DELAY_MS + 100, 50);
    const vNext = sim.view();
    expect(vNext.wisp!.mode).toBe('idleGuide');
    expect(vNext.wisp!.targetRegionId).toBe(5);
    expect(vNext.regionState[5 * 4 + 3]! & REGION_FLAG.guideGlow).toBe(REGION_FLAG.guideGlow);
    expect(sim.drainEvents()).toContainEqual({ type: 'wispGuide', regionId: 5, mode: 'idleGuide' });

    // Completing the page clears guideGlow and prevents future idle Wisp
    for (const id of CORE_IDS) paintRegion(sim, id, 6, 2);
    sim.drainEvents();
    expect(sim.view().pageComplete).toBe(true);
    expect(sim.view().wisp!.active).toBe(false);
    run(sim, IDLE_WISP_DELAY_MS + 2000, 50);
    expect(sim.view().wisp!.active).toBe(false);
    expect(count(sim.drainEvents(), 'wispGuide')).toBe(0);
  });
});

describe('Causality Wonder Whispers', () => {
  it('matches CAUSALITY_MATRIX for uncompleted clouds/planets in Pencil mode and clears otherwise', () => {
    const sim = mkSim();
    const cCloud = page.regions[14]!.centroid;
    const bCloud = page.regions[14]!.bbox;
    const cPlanet = page.regions[12]!.centroid;
    const cRings = page.regions[13]!.centroid;

    for (const rule of CAUSALITY_MATRIX) {
      for (const mat of rule.materials) {
        setTool(sim, { materialId: mat as MaterialId, toolMode: 'pencil', doodle: false });
        if (rule.target === 'cloud') {
          sim.hover({ x: cCloud.x, y: cCloud.y });
          expect(sim.view().wonderWhisper).toEqual({
            regionId: 14,
            effect: rule.effect,
            x: cCloud.x,
            y: cCloud.y,
            x0: bCloud.x0,
            y0: bCloud.y0,
            x1: bCloud.x1,
            y1: bCloud.y1,
          });
        } else {
          sim.hover({ x: cPlanet.x, y: cPlanet.y });
          expect(sim.view().wonderWhisper).toMatchObject({ regionId: 12, effect: rule.effect });
          sim.hover({ x: cRings.x, y: cRings.y });
          expect(sim.view().wonderWhisper).toMatchObject({ regionId: 13, effect: rule.effect });
        }
      }
    }

    // gentleSparkle material clears wonderWhisper
    setTool(sim, { materialId: 5, toolMode: 'pencil', doodle: false });
    sim.hover({ x: cCloud.x, y: cCloud.y });
    expect(sim.view().wonderWhisper).toBeNull();

    // Non-causality region clears wonderWhisper
    setTool(sim, { materialId: 6, toolMode: 'pencil', doodle: false });
    const cLumi = page.regions[5]!.centroid;
    sim.hover({ x: cLumi.x, y: cLumi.y });
    expect(sim.view().wonderWhisper).toBeNull();

    // Active locked paint gesture retains wonderWhisper even if brush moves outside bbox
    sim.gesture(ge('start', cCloud.x, cCloud.y));
    sim.gesture(ge('move', 245, 10)); // sky while touch-locked on cloud 14
    expect(sim.view().wonderWhisper).toMatchObject({ regionId: 14, effect: 'rainbowSlide' });
    sim.gesture(ge('end', 245, 10));

    // Wand mode hides wonderWhisper
    setTool(sim, { materialId: 6, toolMode: 'wand', doodle: true });
    sim.hover({ x: cCloud.x, y: cCloud.y });
    expect(sim.view().wonderWhisper).toBeNull();

    // Bloomed cloud hides wonderWhisper even back in Pencil mode
    paintRegion(sim, 14, 6, 2);
    setTool(sim, { materialId: 6, toolMode: 'pencil', doodle: false });
    sim.hover({ x: cCloud.x, y: cCloud.y });
    expect(sim.view().wonderWhisper).toBeNull();
  });
});

describe('First-awakening Poke Invites and Wand-mode Poke Invites', () => {
  it('shows firstAwake poke invite when Lumi or Nova wakes, wiggles joyfully, and clears immediately on poke', () => {
    const sim = mkSim();
    expect(sim.view().pokeInvites).toEqual([]);

    // Wake Lumi completely (1 pass finishes region 6 without a second-pass poke on awake Lumi)
    paintRegion(sim, 5, 6, 1);
    paintRegion(sim, 6, 6, 1);
    expect(sim.regionPercent(5)).toBe(1);
    expect(sim.regionPercent(6)).toBe(1);
    const invites1 = sim.view().pokeInvites!;
    expect(invites1).toHaveLength(1);
    expect(invites1[0]).toMatchObject({ instanceId: 'lumi-1', kind: 'lumi', firstAwake: true });

    // Joyful wiggle perk active right after awakening
    sim.update(16, 16);
    expect(actor(sim, 'lumi')!.anim).toBe('wiggle');

    // Poking Lumi clears firstAwake invite immediately
    const l = actor(sim, 'lumi')!;
    tap(sim, l.x, l.y);
    expect(sim.drainEvents().some((e) => e.type === 'poke' && e.actor === 'lumi')).toBe(true);
    expect(sim.view().pokeInvites).toEqual([]);

    // Stage 2 partial awakening on Nova also raises firstAwake invite and expires after 10s if unpoked
    const path9 = sim.qaStrokePath(9);
    drag(sim, path9.slice(0, Math.floor(path9.length * 0.4)));
    expect(actor(sim, 'nova')!.live).toBe(true);
    expect(sim.view().pokeInvites).toContainEqual(
      expect.objectContaining({ instanceId: 'nova-1', kind: 'nova', firstAwake: true }),
    );
    run(sim, 10200, 50);
    expect(sim.view().pokeInvites!.some((p) => p.instanceId === 'nova-1')).toBe(false);
  });

  it('exposes live actors and bloomed causality clouds/planets in Wand mode without duplicates', () => {
    const sim = mkSim();
    // Wake Violet, Lumi, and bloom cloud 14 + planet 12 (1 pass on Lumi's last region avoids poking her)
    paintRegion(sim, 1, 6, 1);
    paintRegion(sim, 2, 6, 1);
    paintRegion(sim, 5, 6, 1);
    paintRegion(sim, 6, 6, 1);
    paintRegion(sim, 14, 6, 1);
    paintRegion(sim, 12, 4, 1);

    // Lumi still has active firstAwake invite -> in Wand mode should appear once with firstAwake: true
    setTool(sim, { toolMode: 'wand', doodle: true });
    const invites = sim.view().pokeInvites!;
    const lumiEntries = invites.filter((p) => p.kind === 'lumi');
    expect(lumiEntries).toHaveLength(1);
    expect(lumiEntries[0]!.firstAwake).toBe(true);

    expect(invites).toContainEqual(expect.objectContaining({ kind: 'violet', firstAwake: false }));
    expect(invites).toContainEqual(expect.objectContaining({ kind: 'cloud', firstAwake: false }));
    expect(invites).toContainEqual(expect.objectContaining({ kind: 'planet', firstAwake: false }));
    // Nova is still asleep -> not in Wand pokeInvites
    expect(invites.some((p) => p.kind === 'nova')).toBe(false);

    // Switching back to Pencil mode removes Wand-only invites while retaining active firstAwake invite
    setTool(sim, { toolMode: 'pencil', doodle: false });
    const pencilInvites = sim.view().pokeInvites!;
    expect(pencilInvites).toHaveLength(1);
    expect(pencilInvites[0]!.kind).toBe('lumi');
  });
});
