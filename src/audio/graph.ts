/**
 * Node bookkeeping for the audio engine.
 *
 * Every node the engine ever creates goes through a Rig: it is counted in `live`/`totalCreated`,
 * and transient nodes are owned by a Group. A Group releases (disconnects + forgets) all of its nodes
 * as soon as every source it started has fired `onended`, so nothing can leak.
 */

/** Small deterministic PRNG (mulberry32). */
export function makeRng(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/* ---- defensive AudioParam helpers (tolerate lean/mocked params) ---- */
export function setVal(p: AudioParam | undefined, v: number): void {
  if (p) p.value = v;
}
export function setAt(p: AudioParam, v: number, t: number): void {
  if (typeof p.setValueAtTime === 'function') p.setValueAtTime(v, t);
  else p.value = v;
}
export function linTo(p: AudioParam, v: number, t: number): void {
  if (typeof p.linearRampToValueAtTime === 'function') p.linearRampToValueAtTime(v, t);
  else p.value = v;
}
export function expTo(p: AudioParam, v: number, t: number): void {
  if (typeof p.exponentialRampToValueAtTime === 'function') p.exponentialRampToValueAtTime(Math.max(v, 1e-4), t);
  else p.value = v;
}
export function glide(p: AudioParam, v: number, t: number, tc: number): void {
  if (typeof p.setTargetAtTime === 'function') p.setTargetAtTime(v, t, tc);
  else p.value = v;
}
export function cancelFrom(p: AudioParam, t: number): void {
  if (typeof p.cancelScheduledValues === 'function') p.cancelScheduledValues(t);
}

const NOISE_SECONDS = 2.5;
const SEAM = 2048;

/** Hard ceiling on simultaneously live transient+persistent nodes (spam protection). */
export const MAX_LIVE_NODES = 360;

export class Rig {
  readonly live = new Set<AudioNode>();
  readonly groups = new Set<Group>();
  totalCreated = 0;
  /** Where voices connect (the master gain). Set by the engine once the master chain exists. */
  out!: AudioNode;
  private noise: AudioBuffer | null = null;

  constructor(readonly ctx: AudioContext) {}

  now(): number {
    return this.ctx.currentTime || 0;
  }

  track<T extends AudioNode>(n: T): T {
    this.live.add(n);
    this.totalCreated++;
    return n;
  }

  release(n: AudioNode): void {
    this.live.delete(n);
    try {
      n.disconnect();
    } catch {
      /* already disconnected */
    }
  }

  canSpawn(): boolean {
    return this.live.size < MAX_LIVE_NODES;
  }

  /** Build a transient voice; the group self-releases once all its played sources have ended. */
  build(fn: (g: Group) => void): Group {
    const g = new Group(this);
    this.groups.add(g);
    try {
      fn(g);
    } catch (e) {
      g.end();
      throw e;
    }
    if (g.pending <= 0) g.end();
    return g;
  }

  /** The single persistent, seamlessly loopable pink-noise buffer shared by every noise voice. */
  noiseBuffer(): AudioBuffer {
    if (this.noise) return this.noise;
    const sr = this.ctx.sampleRate || 44100;
    const len = Math.floor(sr * NOISE_SECONDS);
    const buf = this.ctx.createBuffer(1, len, sr);
    const data = buf.getChannelData(0);
    const rnd = makeRng(0x51ca7e);
    const raw = new Float32Array(len + SEAM);
    let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;
    for (let i = 0; i < raw.length; i++) {
      const w = rnd() * 2 - 1;
      b0 = 0.99886 * b0 + w * 0.0555179;
      b1 = 0.99332 * b1 + w * 0.0750759;
      b2 = 0.969 * b2 + w * 0.153852;
      b3 = 0.8665 * b3 + w * 0.3104856;
      b4 = 0.55 * b4 + w * 0.5329522;
      b5 = -0.7616 * b5 - w * 0.016898;
      raw[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + w * 0.5362) * 0.11;
      b6 = w * 0.115926;
    }
    // cross-fade the tail into the head so the loop point is click-free
    let peak = 1e-6;
    for (let i = 0; i < len; i++) {
      const v = i < SEAM ? (raw[i] ?? 0) * (i / SEAM) + (raw[len + i] ?? 0) * (1 - i / SEAM) : (raw[i] ?? 0);
      data[i] = v;
      peak = Math.max(peak, Math.abs(v));
    }
    const norm = 0.9 / peak;
    for (let i = 0; i < len; i++) data[i] = (data[i] ?? 0) * norm;
    this.noise = buf;
    return buf;
  }

  /** Stop and release everything (used by dispose). */
  disposeAll(): void {
    for (const g of [...this.groups]) {
      g.stopAll(0);
      g.end();
    }
    for (const n of [...this.live]) this.release(n);
    this.live.clear();
  }
}

export class Group {
  pending = 0;
  private nodes: AudioNode[] = [];
  private sources: AudioScheduledSourceNode[] = [];
  private ended = false;

  constructor(private readonly rig: Rig) {}

  add<T extends AudioNode>(n: T): T {
    this.rig.track(n);
    this.nodes.push(n);
    return n;
  }

  gain(v = 1): GainNode {
    const g = this.add(this.rig.ctx.createGain());
    setVal(g.gain, v);
    return g;
  }

  osc(type: OscillatorType, freq: number): OscillatorNode {
    const o = this.add(this.rig.ctx.createOscillator());
    o.type = type;
    setVal(o.frequency, freq);
    this.sources.push(o);
    return o;
  }

  filter(type: BiquadFilterType, freq: number, q = 0.707): BiquadFilterNode {
    const f = this.add(this.rig.ctx.createBiquadFilter());
    f.type = type;
    setVal(f.frequency, freq);
    setVal(f.Q, q);
    return f;
  }

  /** Looping view onto the shared pink-noise buffer. */
  noise(rate = 1): AudioBufferSourceNode {
    const s = this.add(this.rig.ctx.createBufferSource());
    s.buffer = this.rig.noiseBuffer();
    s.loop = true;
    setVal(s.playbackRate, rate);
    this.sources.push(s);
    return s;
  }

  /** Start a source of this group at `t0`, optionally scheduling its stop. */
  play(src: AudioScheduledSourceNode, t0: number, tStop?: number, offset?: number): void {
    src.onended = () => this.sourceEnded(src);
    this.pending++;
    if (offset !== undefined && 'loop' in src) (src as AudioBufferSourceNode).start(t0, offset);
    else src.start(t0);
    if (tStop !== undefined) src.stop(Math.max(tStop, t0 + 0.001));
  }

  stopAll(t: number): void {
    for (const s of this.sources) {
      try {
        s.stop(t);
      } catch {
        /* never started / already stopped */
      }
    }
  }

  private sourceEnded(src: AudioScheduledSourceNode): void {
    if (this.ended) return;
    this.rig.release(src);
    this.pending--;
    if (this.pending <= 0) this.end();
  }

  end(): void {
    if (this.ended) return;
    this.ended = true;
    for (const n of this.nodes) this.rig.release(n);
    this.nodes = [];
    this.sources = [];
    this.rig.groups.delete(this);
  }
}
