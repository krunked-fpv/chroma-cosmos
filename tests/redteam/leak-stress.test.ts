import { afterEach, describe, expect, it } from 'vitest';
import { createAudio } from '../../src/audio';
import { RtPool } from '../../src/renderer/rtPool';
import type { CausalityKind, MaterialId, RegionKind, StemId } from '../../src/contracts';

interface FakeRt {
  id: number;
  width: number;
  height: number;
  destroyed: boolean;
}

class MockAudioParam {
  value = 0;
  setValueAtTime(v: number): this {
    this.value = v;
    return this;
  }
  linearRampToValueAtTime(v: number): this {
    this.value = v;
    return this;
  }
  exponentialRampToValueAtTime(v: number): this {
    this.value = v;
    return this;
  }
  setTargetAtTime(v: number): this {
    this.value = v;
    return this;
  }
  cancelScheduledValues(): this {
    return this;
  }
}

class MockNode {
  connected = false;
  disconnectedCount = 0;
  connect(): this {
    this.connected = true;
    return this;
  }
  disconnect(): void {
    this.connected = false;
    this.disconnectedCount++;
  }
}

class MockGainNode extends MockNode {
  gain = new MockAudioParam();
}

class MockBiquadFilterNode extends MockNode {
  type: BiquadFilterType = 'lowpass';
  frequency = new MockAudioParam();
  Q = new MockAudioParam();
}

class MockDynamicsCompressorNode extends MockNode {
  threshold = new MockAudioParam();
  knee = new MockAudioParam();
  ratio = new MockAudioParam();
  attack = new MockAudioParam();
  release = new MockAudioParam();
}

class MockScheduledSource extends MockNode {
  onended: (() => void) | null = null;
  started = false;
  stopped = false;
  stopAt: number | null = null;
  ended = false;
  constructor(private readonly ctx: MockAudioContext) {
    super();
    this.ctx.sources.add(this);
  }
  start(): void {
    this.started = true;
  }
  stop(when = 0): void {
    this.stopped = true;
    const t = Number.isFinite(when) ? when : this.ctx.currentTime;
    this.stopAt = this.stopAt === null ? t : Math.min(this.stopAt, t);
    if (this.stopAt <= this.ctx.currentTime) {
      this.fireEnded();
    }
  }
  fireEnded(): void {
    if (this.ended) return;
    this.ended = true;
    this.ctx.sources.delete(this);
    const fn = this.onended;
    this.onended = null;
    if (fn) fn();
  }
}

class MockOscillatorNode extends MockScheduledSource {
  type: OscillatorType = 'sine';
  frequency = new MockAudioParam();
}

class MockBufferSourceNode extends MockScheduledSource {
  buffer: AudioBuffer | null = null;
  loop = false;
  playbackRate = new MockAudioParam();
}

class MockAudioContext {
  static latest: MockAudioContext | null = null;
  state: AudioContextState = 'suspended';
  sampleRate = 44100;
  currentTime = 0;
  destination = new MockNode();
  sources = new Set<MockScheduledSource>();

  constructor() {
    MockAudioContext.latest = this;
  }

  async resume(): Promise<void> {
    this.state = 'running';
  }
  async close(): Promise<void> {
    this.state = 'closed';
    for (const s of [...this.sources]) s.fireEnded();
  }
  createGain(): GainNode {
    return new MockGainNode() as unknown as GainNode;
  }
  createBiquadFilter(): BiquadFilterNode {
    return new MockBiquadFilterNode() as unknown as BiquadFilterNode;
  }
  createDynamicsCompressor(): DynamicsCompressorNode {
    return new MockDynamicsCompressorNode() as unknown as DynamicsCompressorNode;
  }
  createOscillator(): OscillatorNode {
    return new MockOscillatorNode(this) as unknown as OscillatorNode;
  }
  createBufferSource(): AudioBufferSourceNode {
    return new MockBufferSourceNode(this) as unknown as AudioBufferSourceNode;
  }
  createBuffer(_channels: number, length: number, sampleRate: number): AudioBuffer {
    const data = new Float32Array(length);
    return {
      length,
      sampleRate,
      numberOfChannels: 1,
      duration: length / sampleRate,
      getChannelData: () => data,
    } as unknown as AudioBuffer;
  }
  advanceTo(t: number): void {
    this.currentTime = Math.max(this.currentTime, t);
    for (const src of [...this.sources]) {
      if (src.stopAt !== null && src.stopAt <= this.currentTime) {
        src.fireEnded();
      }
    }
  }
}

describe('Red-Team Leak Stress: RtPool & Audio Graph across 20 page-turn cycles', () => {
  const origAudioContext = (globalThis as { AudioContext?: unknown }).AudioContext;

  afterEach(() => {
    MockAudioContext.latest = null;
    if (origAudioContext === undefined) {
      delete (globalThis as { AudioContext?: unknown }).AudioContext;
    } else {
      (globalThis as { AudioContext?: unknown }).AudioContext = origAudioContext;
    }
  });

  it('keeps RtPool live count flat with zero leaked RenderTextures across 20 consecutive page loads and page-turn curls', () => {
    let nextId = 1;
    const allocated = new Set<FakeRt>();
    const pool = new RtPool<FakeRt>({
      create: (width, height) => {
        const rt: FakeRt = { id: nextId++, width, height, destroyed: false };
        allocated.add(rt);
        return rt;
      },
      destroy: (rt) => {
        expect(rt.destroyed).toBe(false);
        rt.destroyed = true;
        allocated.delete(rt);
      },
    });

    // Acquire persistent ping-pong stroke RTs (mirrors renderer init).
    const strokeA = pool.acquire(1920, 1080);
    const strokeB = pool.acquire(1920, 1080);
    const baselineLive = pool.stats().live;
    expect(baselineLive).toBe(2);

    const viewSizes: ReadonlyArray<readonly [number, number]> = [
      [1366, 768],
      [1280, 720],
      [1366, 768],
      [960, 540],
    ];

    for (let cycle = 0; cycle < 20; cycle++) {
      const [w, h] = viewSizes[cycle % viewSizes.length]!;
      // Simulated page-turn curl acquires 2 RTs, renders, and releases both back to pool.
      const rtOld = pool.acquire(w, h);
      const rtNew = pool.acquire(w, h);
      expect(pool.stats().live).toBe(baselineLive + 2);
      pool.release(rtOld);
      pool.release(rtNew);
      // Double release must be a safe no-op.
      pool.release(rtOld);

      // Simulated keepsake capture acquires + discards a 4x RT.
      if (cycle % 3 === 0) {
        const cap = pool.acquire(1920, 1080);
        expect(pool.stats().live).toBe(baselineLive + 1);
        pool.discard(cap);
      }

      const st = pool.stats();
      expect(st.live).toBe(baselineLive);
      expect(st.created - st.destroyed).toBe(st.live + st.pooled);
      expect(allocated.size).toBe(st.live + st.pooled);

      // Periodic trim destroys idle RTs cleanly without touching live stroke RTs.
      if (cycle % 5 === 4) {
        pool.trim();
        expect(pool.stats().pooled).toBe(0);
        expect(pool.stats().live).toBe(baselineLive);
        expect(strokeA.destroyed).toBe(false);
        expect(strokeB.destroyed).toBe(false);
      }
    }

    // Releasing persistent RTs and destroying pool leaves zero live or allocated RTs.
    pool.release(strokeA);
    pool.release(strokeB);
    pool.destroyAll();

    const finalStats = pool.stats();
    expect(finalStats.live).toBe(0);
    expect(finalStats.pooled).toBe(0);
    expect(finalStats.destroyed).toBe(finalStats.created);
    expect(allocated.size).toBe(0);
  });

  it('returns AudioEngine liveNodes strictly to flat baseline across 20 consecutive page-load & event cycles', async () => {
    (globalThis as { AudioContext?: unknown }).AudioContext = MockAudioContext;

    const audio = createAudio();
    await audio.unlock();
    const ctx = MockAudioContext.latest;
    expect(ctx).not.toBeNull();

    // Persistent baseline: master gain + dynamics compressor + 4 stem bus gains = 6 nodes.
    const baseline = audio.stats().liveNodes;
    expect(baseline).toBe(6);

    const materials: readonly MaterialId[] = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];
    const kinds: readonly RegionKind[] = ['violet', 'lumi', 'nova', 'cloud', 'planet', 'rings', 'comet'];
    const causalities: readonly CausalityKind[] = [
      'rainbowSlide',
      'starlightFlowerRain',
      'zeroGTrampoline',
      'cheetahRacetrack',
      'discoMirage',
      'gentleSparkle',
    ];
    const stemSets: readonly StemId[][] = [
      ['pad'],
      ['pad', 'marimba'],
      ['pad', 'marimba', 'harp'],
      ['pad', 'marimba', 'harp', 'celesta'],
      [],
    ];

    let simTime = 0;
    for (let cycle = 0; cycle < 20; cycle++) {
      // Simulate page load stem reset + painting across all 3 ASMR families (grain, sweep, bell).
      audio.setStems(stemSets[cycle % stemSets.length]!);

      for (let mIdx = 0; mIdx < 3; mIdx++) {
        const mat = materials[(cycle + mIdx * 2) % materials.length]!;
        audio.stroke(true, 0.9, mat);
        simTime += 0.25;
        ctx!.advanceTo(simTime);
        audio.stroke(true, 1.2, mat);
        simTime += 0.25;
        ctx!.advanceTo(simTime);
        audio.stroke(false, 0, mat);
      }

      // Fire every one-shot event type in the game.
      audio.stage(kinds[cycle % kinds.length]!, (cycle % 4) + 1);
      audio.autoBloom();
      audio.causality(causalities[cycle % causalities.length]!);
      audio.actorAwake(cycle % 3 === 0 ? 'lumi' : cycle % 3 === 1 ? 'nova' : 'violet');
      audio.poke(cycle % 2 === 0 ? 'lumi' : 'nova');
      audio.pageTurn();

      // Silence stems between pages and let all scheduled envelopes & stop times expire.
      audio.setStems([]);
      simTime += 15;
      ctx!.advanceTo(simTime);

      expect(audio.stats().liveNodes).toBe(baseline);
      expect(ctx!.sources.size).toBe(0);
    }

    // Confirm substantial transient node churn actually occurred.
    expect(audio.stats().totalCreated).toBeGreaterThan(500);
    expect(audio.stats().liveNodes).toBe(baseline);

    // Dispose releases even persistent master/stem nodes down to 0.
    audio.dispose();
    expect(audio.stats().liveNodes).toBe(0);
  });
});
