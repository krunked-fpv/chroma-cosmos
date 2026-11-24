/** Minimal in-test Web Audio mock: nodes, params, sources that fire onended when their stop time passes. */

export class MockParam {
  value = 0;
  targets: number[] = [];
  events: Array<{ op: 'set' | 'lin' | 'exp' | 'target'; value: number; time: number }> = [];
  setValueAtTime(v: number, t: number): this {
    this.value = v;
    this.events.push({ op: 'set', value: v, time: t });
    return this;
  }
  linearRampToValueAtTime(v: number, t: number): this {
    this.value = v;
    this.events.push({ op: 'lin', value: v, time: t });
    return this;
  }
  exponentialRampToValueAtTime(v: number, t: number): this {
    this.value = v;
    this.events.push({ op: 'exp', value: v, time: t });
    return this;
  }
  setTargetAtTime(v: number, t: number, _tc: number): this {
    this.value = v;
    this.targets.push(v);
    this.events.push({ op: 'target', value: v, time: t });
    return this;
  }
  cancelScheduledValues(_t: number): this {
    return this;
  }
}

export class MockNode {
  inputs = new Set<MockNode>();
  outputs = new Set<MockNode | MockParam>();
  disconnected = false;
  constructor(
    readonly kind: string,
    readonly ctx: MockAudioContext,
  ) {
    ctx.nodes.push(this);
  }
  connect<T extends MockNode | MockParam>(dest: T): T {
    this.outputs.add(dest);
    if (dest instanceof MockNode) dest.inputs.add(this);
    return dest;
  }
  disconnect(): void {
    for (const o of this.outputs) if (o instanceof MockNode) o.inputs.delete(this);
    this.outputs.clear();
    this.disconnected = true;
  }
}

export class MockGain extends MockNode {
  gain = new MockParam();
  constructor(ctx: MockAudioContext) {
    super('gain', ctx);
    this.gain.value = 1;
  }
}

export class MockFilter extends MockNode {
  type = 'lowpass';
  frequency = new MockParam();
  Q = new MockParam();
  constructor(ctx: MockAudioContext) {
    super('biquad', ctx);
  }
}

export class MockCompressor extends MockNode {
  threshold = new MockParam();
  knee = new MockParam();
  ratio = new MockParam();
  attack = new MockParam();
  release = new MockParam();
  constructor(ctx: MockAudioContext) {
    super('dynamicsCompressor', ctx);
  }
}

export class MockSource extends MockNode {
  onended: (() => void) | null = null;
  startTime: number | null = null;
  stopTime: number | null = null;
  ended = false;
  type = 'sine';
  loop = false;
  buffer: unknown = null;
  frequency = new MockParam();
  playbackRate = new MockParam();
  constructor(kind: string, ctx: MockAudioContext) {
    super(kind, ctx);
    ctx.sources.push(this);
  }
  start(when = 0, _offset?: number): void {
    if (this.startTime !== null) throw new Error('InvalidStateError: start called twice');
    this.startTime = when;
    this.ctx.startLog.push(when);
  }
  stop(when = 0): void {
    if (this.startTime === null) throw new Error('InvalidStateError: stop before start');
    this.stopTime = when;
  }
}

export class MockAudioContext {
  static instances: MockAudioContext[] = [];
  static last(): MockAudioContext {
    const c = MockAudioContext.instances[MockAudioContext.instances.length - 1];
    if (!c) throw new Error('no MockAudioContext constructed');
    return c;
  }
  currentTime = 0;
  sampleRate = 8000;
  closed = false;
  resumeCalls = 0;
  nodes: MockNode[] = [];
  sources: MockSource[] = [];
  startLog: number[] = [];
  destination: MockNode;
  constructor(_opts?: unknown) {
    this.destination = new MockNode('destination', this);
    MockAudioContext.instances.push(this);
  }
  createGain(): MockGain {
    return new MockGain(this);
  }
  createOscillator(): MockSource {
    return new MockSource('oscillator', this);
  }
  createBufferSource(): MockSource {
    return new MockSource('bufferSource', this);
  }
  createBiquadFilter(): MockFilter {
    return new MockFilter(this);
  }
  createDynamicsCompressor(): MockCompressor {
    return new MockCompressor(this);
  }
  createBuffer(_channels: number, length: number, _rate: number): { length: number; getChannelData: (c: number) => Float32Array } {
    const data = new Float32Array(length);
    return { length, getChannelData: () => data };
  }
  async resume(): Promise<void> {
    this.resumeCalls++;
  }
  async close(): Promise<void> {
    this.closed = true;
  }
  /** Advance the audio clock and fire onended for every source whose stop time has passed. */
  advance(dt: number): void {
    this.currentTime += dt;
    this.fire();
  }
  fire(): void {
    for (const s of this.sources) {
      if (!s.ended && s.stopTime !== null && s.stopTime <= this.currentTime) {
        s.ended = true;
        s.onended?.();
      }
    }
  }
}
