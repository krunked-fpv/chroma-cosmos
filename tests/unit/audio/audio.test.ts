import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { ActorKind } from '../../../src/contracts/art';
import type { AudioLevel, AudioPort, StemId, UiFoleyKind } from '../../../src/contracts/audio';
import type { CausalityKind } from '../../../src/contracts/causality';
import { AUDIO_LEVEL_GAIN, BPM, F_LYDIAN_HZ } from '../../../src/contracts/constants';
import { MATERIALS, type MaterialId } from '../../../src/contracts/materials';
import type { RegionKind } from '../../../src/contracts/regions';
import { createAudio, quantizeToLydian } from '../../../src/audio';
import { MockAudioContext, MockCompressor, MockFilter, MockGain, MockNode } from './mockAudio';

const ACTORS: ActorKind[] = ['violet', 'lumi', 'nova', 'moonCat', 'comet', 'whale', 'gazelle', 'cometCar', 'flower', 'gem'];
const CAUSALITY: CausalityKind[] = ['rainbowSlide', 'starlightFlowerRain', 'zeroGTrampoline', 'cheetahRacetrack', 'discoMirage', 'gentleSparkle'];
const KINDS: RegionKind[] = [
  'violet', 'lumi', 'nova', 'planet', 'rings', 'cloud', 'comet', 'moonCat', 'milkshake', 'whale', 'asteroid', 'star', 'rocket', 'flora', 'prop', 'ghost', 'system',
];
const ALL_STEMS: StemId[] = ['pad', 'marimba', 'harp', 'celesta'];
const UI_FOLEYS: UiFoleyKind[] = ['paperRustle', 'woodTap', 'jarClink', 'stickerPeel', 'wispChime', 'tinSnap'];
const BEAT = 60 / BPM;

function isScaleMember(hz: number): boolean {
  for (let k = -12; k <= 12; k++) for (const base of F_LYDIAN_HZ) if (Math.abs(hz - base * 2 ** k) <= 1e-9 * hz) return true;
  return false;
}

/** Call every port method with ordinary and hostile arguments. */
function hammer(a: AudioPort): void {
  a.setLevel(2);
  a.setLevel(7 as AudioLevel);
  a.stroke(true, 0.8, 4);
  a.stroke(true, NaN, 2);
  a.stroke(true, -3, 1);
  a.stroke(true, Infinity, 999 as MaterialId);
  a.stroke(false, 0, 4);
  for (const k of KINDS) for (const s of [-1, 0, 1, 2, 3, 4, 9, NaN]) a.stage(k, s);
  a.stage('nope' as RegionKind, 2);
  a.autoBloom();
  for (const x of ACTORS) {
    a.poke(x);
    a.actorAwake(x);
  }
  a.poke('nobody' as ActorKind);
  a.actorAwake('nobody' as ActorKind);
  for (const c of CAUSALITY) a.causality(c);
  a.causality('nope' as CausalityKind);
  a.pageTurn();
  for (const f of UI_FOLEYS) a.uiFoley?.(f);
  a.uiFoley?.('nope' as UiFoleyKind);
  a.setStems(ALL_STEMS);
  a.setStems([]);
  a.setStems(undefined as unknown as StemId[]);
  const p = a.beatPhase();
  expect(p).toBeGreaterThanOrEqual(0);
  expect(p).toBeLessThan(1);
  const s = a.stats();
  expect(s.liveNodes).toBeGreaterThanOrEqual(0);
  expect(s.totalCreated).toBeGreaterThanOrEqual(0);
}

async function unlocked(): Promise<{ audio: AudioPort; ctx: MockAudioContext }> {
  const audio = createAudio();
  await audio.unlock();
  return { audio, ctx: MockAudioContext.last() };
}

/** Walk upstream from destination: destination <- compressor <- master gain. */
function masterChain(ctx: MockAudioContext): { comp: MockCompressor; master: MockGain } {
  const comp = [...ctx.destination.inputs][0];
  expect(comp).toBeInstanceOf(MockCompressor);
  const master = [...(comp as MockNode).inputs][0];
  expect(master).toBeInstanceOf(MockGain);
  return { comp: comp as MockCompressor, master: master as MockGain };
}

beforeEach(() => {
  MockAudioContext.instances = [];
});
afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe('quantizeToLydian', () => {
  it('maps arbitrary frequencies (0, huge, negative, NaN, infinities) onto the scale set with octaves', () => {
    const inputs = [0, -0, -1, -440, -Infinity, NaN, Infinity, 1e-12, 1e-3, 1, 20, 100, 233, 440, 450, 480, 1000, 12345, 22050, 1e6, 1e12, Number.MAX_VALUE];
    for (const hz of inputs) {
      const q = quantizeToLydian(hz);
      expect(Number.isFinite(q), `finite for ${hz}`).toBe(true);
      expect(isScaleMember(q), `member for ${hz} -> ${q}`).toBe(true);
    }
    for (let i = 0; i < 500; i++) expect(isScaleMember(quantizeToLydian(10 ** (Math.sin(i * 12.9898) * 3 + 2.5)))).toBe(true);
  });

  it('is exact on scale tones, octave-aware, and snaps to the nearest tone', () => {
    for (const f of F_LYDIAN_HZ) {
      expect(quantizeToLydian(f)).toBeCloseTo(f, 9);
      expect(quantizeToLydian(f * 2)).toBeCloseTo(f * 2, 9);
      expect(quantizeToLydian(f / 2)).toBeCloseTo(f / 2, 9);
      expect(quantizeToLydian(f * 1.004)).toBeCloseTo(f, 9);
    }
    expect(quantizeToLydian(0)).toBeCloseTo(349.23, 9);
    expect(quantizeToLydian(NaN)).toBeCloseTo(349.23, 9);
    expect(quantizeToLydian(460)).toBeCloseTo(440, 9);
    expect(quantizeToLydian(480)).toBeCloseTo(493.88, 9);
    expect(quantizeToLydian(1e12)).toBeGreaterThan(4000);
    expect(quantizeToLydian(1e-12)).toBeLessThan(60);
  });
});

describe('safe no-op behaviour', () => {
  it('never throws without any AudioContext (node env)', async () => {
    expect((globalThis as { AudioContext?: unknown }).AudioContext).toBeUndefined();
    const a = createAudio();
    hammer(a);
    await expect(a.unlock()).resolves.toBeUndefined();
    hammer(a);
    expect(a.stats()).toEqual({ liveNodes: 0, totalCreated: 0 });
    a.dispose();
    hammer(a);
    a.dispose();
  });

  it('never throws and creates nothing before unlock() even if AudioContext exists', () => {
    vi.stubGlobal('AudioContext', MockAudioContext);
    const a = createAudio();
    hammer(a);
    expect(MockAudioContext.instances).toHaveLength(0);
    expect(a.stats()).toEqual({ liveNodes: 0, totalCreated: 0 });
  });

  it('survives a throwing AudioContext constructor', async () => {
    vi.stubGlobal('AudioContext', class { constructor() { throw new Error('blocked'); } });
    const a = createAudio();
    await expect(a.unlock()).resolves.toBeUndefined();
    hammer(a);
  });

  it('survives hostile arguments after unlock and after dispose', async () => {
    vi.stubGlobal('AudioContext', MockAudioContext);
    const { audio, ctx } = await unlocked();
    hammer(audio);
    ctx.advance(60);
    audio.dispose();
    hammer(audio);
    await expect(audio.unlock()).resolves.toBeUndefined();
    expect(MockAudioContext.instances).toHaveLength(1);
    expect(ctx.closed).toBe(true);
    expect(audio.stats().liveNodes).toBe(0);
  });
});

describe('beatPhase', () => {
  it('uses the wall clock before unlock and stays within [0,1)', () => {
    const a = createAudio();
    for (let i = 0; i < 50; i++) {
      const p = a.beatPhase();
      expect(p).toBeGreaterThanOrEqual(0);
      expect(p).toBeLessThan(1);
    }
  });

  it('follows the 96-BPM audio clock after unlock', async () => {
    vi.stubGlobal('AudioContext', MockAudioContext);
    const { audio, ctx } = await unlocked();
    ctx.currentTime = 0;
    expect(audio.beatPhase()).toBeCloseTo(0, 9);
    ctx.currentTime = BEAT / 2;
    expect(audio.beatPhase()).toBeCloseTo(0.5, 9);
    ctx.currentTime = BEAT * 7 + BEAT * 0.25;
    expect(audio.beatPhase()).toBeCloseTo(0.25, 6);
    expect(BEAT).toBeCloseTo(0.625, 9);
  });
});

describe('master chain and level', () => {
  it('unlock builds master gain -> DynamicsCompressor limiter -> destination and resumes the context', async () => {
    vi.stubGlobal('AudioContext', MockAudioContext);
    const { audio, ctx } = await unlocked();
    const { comp, master } = masterChain(ctx);
    expect(ctx.resumeCalls).toBeGreaterThanOrEqual(1);
    expect(comp.threshold.value).toBeLessThanOrEqual(-6);
    expect(comp.threshold.value).toBeGreaterThanOrEqual(-14);
    expect(comp.ratio.value).toBe(12);
    expect(comp.attack.value).toBeCloseTo(0.003, 6);
    expect(comp.release.value).toBeCloseTo(0.25, 6);
    expect(master.gain.value).toBeCloseTo(AUDIO_LEVEL_GAIN[3], 9);
    expect(audio.stats().liveNodes).toBeGreaterThanOrEqual(2);
  });

  it('level cycling 3 -> 2 -> 1 -> 0 -> 3 gives master gains 0.9 / 0.6 / 0.3 / 0 / 0.9 (smoothed with setTargetAtTime)', async () => {
    vi.stubGlobal('AudioContext', MockAudioContext);
    const { audio, ctx } = await unlocked();
    const { master } = masterChain(ctx);
    expect(audio.level()).toBe(3);
    const seen: number[] = [];
    for (const l of [2, 1, 0, 3] as AudioLevel[]) {
      audio.setLevel(l);
      expect(audio.level()).toBe(l);
      expect(master.gain.value).toBeCloseTo(AUDIO_LEVEL_GAIN[l], 9);
      seen.push(master.gain.value);
    }
    expect(seen.map((v) => Math.round(v * 10) / 10)).toEqual([0.6, 0.3, 0, 0.9]);
    expect(master.gain.targets).toEqual([0.6, 0.3, 0, 0.9]);
    audio.setLevel(9 as AudioLevel);
    expect(audio.level()).toBe(3);
  });

  it('a level chosen before unlock is applied to the master when it is created', async () => {
    vi.stubGlobal('AudioContext', MockAudioContext);
    const a = createAudio();
    a.setLevel(1);
    expect(a.level()).toBe(1);
    await a.unlock();
    expect(masterChain(MockAudioContext.last()).master.gain.value).toBeCloseTo(0.3, 9);
  });

  it('level 0 is muted: events create no nodes', async () => {
    vi.stubGlobal('AudioContext', MockAudioContext);
    const { audio } = await unlocked();
    audio.setLevel(0);
    const before = audio.stats();
    for (const k of KINDS) audio.stage(k, 3);
    for (const x of ACTORS) {
      audio.poke(x);
      audio.actorAwake(x);
    }
    for (const c of CAUSALITY) audio.causality(c);
    audio.pageTurn();
    for (const f of UI_FOLEYS) audio.uiFoley?.(f);
    audio.poke('nova');
    audio.autoBloom();
    audio.stroke(true, 1, 4);
    expect(audio.stats()).toEqual(before);
  });
});

describe('node lifetime', () => {
  it('liveNodes returns to the steady-state baseline after 200 pokes / blooms / stage plucks', async () => {
    vi.stubGlobal('AudioContext', MockAudioContext);
    const { audio, ctx } = await unlocked();
    const baseline = audio.stats().liveNodes;
    let peak = 0;
    for (let i = 0; i < 200; i++) {
      switch (i % 6) {
        case 0: audio.poke(ACTORS[i % ACTORS.length] as ActorKind); break;
        case 1: audio.autoBloom(); break;
        case 2: audio.stage(KINDS[i % KINDS.length] as RegionKind, (i % 4) + 1); break;
        case 3: audio.actorAwake(ACTORS[i % ACTORS.length] as ActorKind); break;
        case 4: audio.causality(CAUSALITY[i % CAUSALITY.length] as CausalityKind); break;
        default: audio.pageTurn();
      }
      ctx.advance(0.05);
      peak = Math.max(peak, audio.stats().liveNodes);
    }
    expect(audio.stats().totalCreated).toBeGreaterThan(baseline + 200);
    expect(peak).toBeLessThan(500);
    ctx.advance(30);
    expect(audio.stats().liveNodes).toBe(baseline);
    // every created transient node was disconnected
    expect(ctx.nodes.filter((n) => n.kind !== 'destination' && !n.disconnected).length).toBe(baseline);
  });

  it('a spam burst with no clock advance is capped, then drains back to baseline', async () => {
    vi.stubGlobal('AudioContext', MockAudioContext);
    const { audio, ctx } = await unlocked();
    const baseline = audio.stats().liveNodes;
    for (let i = 0; i < 400; i++) {
      audio.autoBloom();
      audio.poke('lumi');
      audio.stage('planet', 4);
    }
    expect(audio.stats().liveNodes).toBeLessThan(450);
    ctx.advance(60);
    expect(audio.stats().liveNodes).toBe(baseline);
  });

  it('keeps every single event under 40 nodes', async () => {
    vi.stubGlobal('AudioContext', MockAudioContext);
    const { audio, ctx } = await unlocked();
    const measure = (name: string, fn: () => void): void => {
      const before = audio.stats().totalCreated;
      fn();
      const n = audio.stats().totalCreated - before;
      expect(n, name).toBeLessThan(40);
      ctx.advance(30);
    };
    measure('autoBloom', () => audio.autoBloom());
    measure('pageTurn', () => audio.pageTurn());
    for (const f of UI_FOLEYS) measure(`uiFoley ${f}`, () => audio.uiFoley?.(f));
    for (const a of ACTORS) {
      measure(`poke ${a}`, () => audio.poke(a));
      measure(`awake ${a}`, () => audio.actorAwake(a));
    }
    for (const c of CAUSALITY) measure(`causality ${c}`, () => audio.causality(c));
    for (const k of KINDS) for (let s = 1; s <= 4; s++) measure(`stage ${k} ${s}`, () => audio.stage(k, s));
    for (const m of MATERIALS) measure(`stroke ${m.key}`, () => audio.stroke(true, 1, m.id));
  });

  it('stroke on/off leaves no leaked nodes after the fade, for every asmr family and material', async () => {
    vi.stubGlobal('AudioContext', MockAudioContext);
    const { audio, ctx } = await unlocked();
    const baseline = audio.stats().liveNodes;
    const families = new Set(MATERIALS.map((m) => m.asmr));
    expect([...families].sort()).toEqual(['bell', 'grain', 'sweep']);
    for (const m of MATERIALS) {
      const created = audio.stats().totalCreated;
      let sawLive = false;
      for (let f = 0; f < 40; f++) {
        audio.stroke(true, 0.2 + (f % 6) * 0.25, m.id);
        ctx.advance(0.016);
        if (audio.stats().liveNodes > baseline) sawLive = true;
      }
      expect(audio.stats().totalCreated, `${m.key} made sound`).toBeGreaterThan(created);
      expect(sawLive, `${m.key} had live nodes`).toBe(true);
      audio.stroke(false, 0, m.id);
      ctx.advance(2);
      expect(audio.stats().liveNodes, `${m.key} leaked`).toBe(baseline);
    }
  });

  it('continuous brush voices are reused while stroking and swap cleanly between families', async () => {
    vi.stubGlobal('AudioContext', MockAudioContext);
    const { audio, ctx } = await unlocked();
    const baseline = audio.stats().liveNodes;
    audio.stroke(true, 0.5, 4); // grain
    const afterFirst = audio.stats().totalCreated;
    for (let i = 0; i < 100; i++) {
      audio.stroke(true, 0.3 + (i % 10) * 0.1, 6); // another grain material: same voice
      ctx.advance(0.016);
    }
    expect(audio.stats().totalCreated).toBe(afterFirst);
    audio.stroke(true, 0.6, 1); // sweep replaces grain
    audio.stroke(true, 0.6, 2); // bell replaces sweep
    audio.stroke(true, 0.6, 7); // grain again
    ctx.advance(0.5);
    audio.stroke(false, 0, 7);
    ctx.advance(2);
    expect(audio.stats().liveNodes).toBe(baseline);
  });

  it('a brush left active without further calls fades itself (watchdog) and releases', async () => {
    vi.useFakeTimers();
    vi.stubGlobal('AudioContext', MockAudioContext);
    const { audio, ctx } = await unlocked();
    const baseline = audio.stats().liveNodes;
    audio.stroke(true, 1, 4);
    expect(audio.stats().liveNodes).toBeGreaterThan(baseline);
    ctx.currentTime += 1;
    vi.advanceTimersByTime(400);
    ctx.advance(1);
    expect(audio.stats().liveNodes).toBe(baseline);
    expect(vi.getTimerCount()).toBe(0);
  });
});

describe('96-BPM scheduler', () => {
  it('schedules only inside the 100 ms horizon, on the 32nd-note grid, and stays bounded', async () => {
    vi.useFakeTimers();
    vi.stubGlobal('AudioContext', MockAudioContext);
    const { audio, ctx } = await unlocked();
    const baseline = audio.stats().liveNodes;
    ctx.currentTime = 10.0137;
    audio.setStems(ALL_STEMS);
    expect(vi.getTimerCount()).toBe(1);
    const step = BEAT / 8;
    let seen = 0;
    let peak = 0;
    for (let i = 0; i < 1400; i++) {
      ctx.advance(0.025);
      vi.advanceTimersByTime(25);
      const fresh = ctx.startLog.slice(seen);
      seen = ctx.startLog.length;
      for (const t of fresh) {
        expect(t).toBeLessThanOrEqual(ctx.currentTime + 0.1 + 1e-9);
        const k = t / step;
        expect(Math.abs(k - Math.round(k))).toBeLessThan(1e-6);
      }
      peak = Math.max(peak, audio.stats().liveNodes);
    }
    // 35 s of music: many notes, but bounded concurrency
    expect(ctx.startLog.length).toBeGreaterThan(100);
    expect(peak).toBeLessThan(120);
    // no note was ever scheduled in the past
    expect(Math.min(...ctx.startLog)).toBeGreaterThanOrEqual(10.0137 - 1e-9);
    // all four stems played something: pad = sawtooth/triangle sources, plus sines
    const types = new Set(ctx.sources.map((s) => s.type));
    expect(types.has('triangle')).toBe(true);
    expect(types.has('sine')).toBe(true);
    expect(types.has('sawtooth')).toBe(true);
    // stems fade in smoothly
    const buses = [...masterChain(ctx).master.inputs].filter((n): n is MockGain => n instanceof MockGain);
    expect(buses).toHaveLength(4);
    expect(buses.every((b) => b.gain.value > 0)).toBe(true);
    void baseline;
  });

  it('stops when no stems are enabled, restarts when enabled, and stops for good on dispose', async () => {
    vi.useFakeTimers();
    vi.stubGlobal('AudioContext', MockAudioContext);
    const { audio, ctx } = await unlocked();
    expect(vi.getTimerCount()).toBe(0);
    audio.setStems(['marimba']);
    expect(vi.getTimerCount()).toBe(1);
    audio.setStems(['marimba', 'celesta']);
    expect(vi.getTimerCount()).toBe(1);
    audio.setStems([]);
    expect(vi.getTimerCount()).toBe(0);
    const startsBefore = ctx.startLog.length;
    for (let i = 0; i < 40; i++) {
      ctx.advance(0.025);
      vi.advanceTimersByTime(25);
    }
    expect(ctx.startLog.length).toBe(startsBefore);
    audio.setStems(['pad']);
    expect(vi.getTimerCount()).toBe(1);
    audio.dispose();
    expect(vi.getTimerCount()).toBe(0);
    audio.setStems(ALL_STEMS);
    expect(vi.getTimerCount()).toBe(0);
    const n = ctx.startLog.length;
    ctx.advance(10);
    vi.advanceTimersByTime(1000);
    expect(ctx.startLog.length).toBe(n);
    expect(ctx.closed).toBe(true);
    expect(audio.stats().liveNodes).toBe(0);
  });

  it('stems requested before unlock start once the context exists', async () => {
    vi.useFakeTimers();
    vi.stubGlobal('AudioContext', MockAudioContext);
    const a = createAudio();
    a.setStems(['pad', 'harp']);
    expect(vi.getTimerCount()).toBe(0);
    await a.unlock();
    expect(vi.getTimerCount()).toBe(1);
    a.dispose();
    expect(vi.getTimerCount()).toBe(0);
  });

  it('muted (level 0) keeps time but schedules no notes; unmuting resumes them', async () => {
    vi.useFakeTimers();
    vi.stubGlobal('AudioContext', MockAudioContext);
    const { audio, ctx } = await unlocked();
    audio.setLevel(0);
    audio.setStems(ALL_STEMS);
    for (let i = 0; i < 200; i++) {
      ctx.advance(0.025);
      vi.advanceTimersByTime(25);
    }
    expect(ctx.startLog.length).toBe(0);
    audio.setLevel(3);
    for (let i = 0; i < 400; i++) {
      ctx.advance(0.025);
      vi.advanceTimersByTime(25);
    }
    expect(ctx.startLog.length).toBeGreaterThan(10);
    audio.dispose();
  });
});

describe('tabletop UI ASMR foley (uiFoley)', () => {
  it('spawns bounded low-pass F-Lydian nodes for all 6 variants and disconnects every node on onended', async () => {
    vi.stubGlobal('AudioContext', MockAudioContext);
    const { audio, ctx } = await unlocked();
    expect(typeof audio.uiFoley).toBe('function');
    const baseline = audio.stats().liveNodes;

    for (const kind of UI_FOLEYS) {
      const createdBefore = audio.stats().totalCreated;
      const nodesBefore = ctx.nodes.length;
      const sourcesBefore = ctx.sources.length;

      audio.uiFoley!(kind);

      const spawned = audio.stats().totalCreated - createdBefore;
      expect(spawned, `${kind} spawns nodes`).toBeGreaterThan(0);
      expect(spawned, `${kind} stays bounded`).toBeLessThan(20);
      expect(audio.stats().liveNodes, `${kind} live nodes rise`).toBe(baseline + spawned);

      const freshNodes = ctx.nodes.slice(nodesBefore);
      const freshSources = ctx.sources.slice(sourcesBefore);
      expect(freshSources.length, `${kind} starts scheduled sources`).toBeGreaterThan(0);

      // Warm low-pass acoustics: every foley includes a lowpass filter and never uses square/sawtooth bleeps.
      const filters = freshNodes.filter((n): n is MockFilter => n instanceof MockFilter);
      expect(filters.some((f) => f.type === 'lowpass'), `${kind} uses lowpass smoothing`).toBe(true);
      for (const s of freshSources) {
        if (s.kind === 'oscillator') {
          expect(['sine', 'triangle'], `${kind} warm waveform`).toContain(s.type);
          expect(isScaleMember(s.frequency.value), `${kind} F-Lydian freq ${s.frequency.value}`).toBe(true);
        }
        expect(s.stopTime, `${kind} schedules finite stop`).not.toBeNull();
      }

      // Advance clock so all sources fire onended; every transient node must disconnect with zero leak.
      ctx.advance(2);
      expect(audio.stats().liveNodes, `${kind} returns to baseline`).toBe(baseline);
      expect(freshNodes.every((n) => n.disconnected), `${kind} disconnects all transient nodes`).toBe(true);
    }

    expect(ctx.nodes.filter((n) => n.kind !== 'destination' && !n.disconnected).length).toBe(baseline);
  });

  it('rotates jarClink gently through F-Lydian fifth pairs and drains cleanly under rapid burst', async () => {
    vi.stubGlobal('AudioContext', MockAudioContext);
    const { audio, ctx } = await unlocked();
    const baseline = audio.stats().liveNodes;
    const pairs: Array<readonly [number, number]> = [];

    for (let i = 0; i < 3; i++) {
      const before = ctx.sources.length;
      audio.uiFoley!('jarClink');
      const oscs = ctx.sources.slice(before).filter((s) => s.kind === 'oscillator');
      expect(oscs.length).toBeGreaterThanOrEqual(2);
      const lo = oscs[0]!.frequency.value;
      const hi = oscs[1]!.frequency.value;
      expect(hi / lo).toBeCloseTo(1.4983, 2); // F-Lydian perfect fifth
      pairs.push([Math.round(lo), Math.round(hi)]);
      // Interleave other foleys to confirm jarClink maintains its own rotation.
      audio.uiFoley!('woodTap');
      ctx.advance(0.03);
    }

    // Rotates cleanly through F5/C6, G5/D6, A5/E6
    expect(pairs).toEqual([
      [698, 1047],
      [784, 1175],
      [880, 1319],
    ]);

    // Rapid burst of all 6 foley kinds stays within node cap and drains strictly to baseline.
    for (let i = 0; i < 120; i++) {
      audio.uiFoley!(UI_FOLEYS[i % UI_FOLEYS.length]!);
    }
    expect(audio.stats().liveNodes).toBeLessThan(400);
    ctx.advance(5);
    expect(audio.stats().liveNodes).toBe(baseline);
  });

  it('stays completely silent before unlock, when muted (level 0), after dispose, or for unknown kinds', async () => {
    vi.stubGlobal('AudioContext', MockAudioContext);
    const a = createAudio();

    // Before unlock: creates nothing and never instantiates AudioContext
    for (const kind of UI_FOLEYS) a.uiFoley!(kind);
    expect(MockAudioContext.instances).toHaveLength(0);
    expect(a.stats()).toEqual({ liveNodes: 0, totalCreated: 0 });

    await a.unlock();
    const ctx = MockAudioContext.last();

    // Unknown kind: no-op
    const beforeUnknown = a.stats();
    a.uiFoley!('unknownFoley' as UiFoleyKind);
    expect(a.stats()).toEqual(beforeUnknown);

    // Muted (level 0): zero nodes created
    a.setLevel(0);
    const beforeMute = a.stats();
    for (const kind of UI_FOLEYS) a.uiFoley!(kind);
    expect(a.stats()).toEqual(beforeMute);

    // Unmuted works, then dispose silences all future calls
    a.setLevel(2);
    a.uiFoley!('tinSnap');
    expect(a.stats().totalCreated).toBeGreaterThan(beforeMute.totalCreated);
    ctx.advance(2);

    a.dispose();
    const afterDispose = a.stats();
    expect(afterDispose.liveNodes).toBe(0);
    for (const kind of UI_FOLEYS) a.uiFoley!(kind);
    expect(a.stats()).toEqual(afterDispose);
  });

  it('never references or invokes speechSynthesis anywhere in src/audio', async () => {
    const speak = vi.fn(() => {
      throw new Error('speechSynthesis is strictly prohibited');
    });
    vi.stubGlobal('speechSynthesis', { speak, cancel: speak, getVoices: speak });
    vi.stubGlobal('SpeechSynthesisUtterance', class {
      constructor() {
        throw new Error('SpeechSynthesisUtterance is strictly prohibited');
      }
    });
    vi.stubGlobal('AudioContext', MockAudioContext);

    const { audio, ctx } = await unlocked();
    for (const kind of UI_FOLEYS) audio.uiFoley!(kind);
    ctx.advance(2);
    audio.dispose();
    expect(speak).not.toHaveBeenCalled();

    // Static check over all source files in src/audio/**
    const audioDir = join(process.cwd(), 'src', 'audio');
    const files = readdirSync(audioDir).filter((f) => f.endsWith('.ts'));
    expect(files.length).toBeGreaterThan(0);
    for (const file of files) {
      const src = readFileSync(join(audioDir, file), 'utf8');
      expect(src, `${file} must not reference speechSynthesis`).not.toMatch(/speechsynthesis/i);
    }
  });
});
