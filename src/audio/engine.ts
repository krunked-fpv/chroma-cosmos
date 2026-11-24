/**
 * AudioPort implementation: lazy AudioContext, soft-limited master chain, brush voices, the
 * 96-BPM pulse and one-shot events. Every public method is a safe no-op without an AudioContext
 * (node, jsdom, before unlock, after dispose) and can never throw.
 */
import type { ActorKind } from '../contracts/art';
import type { AudioLevel, AudioPort, StemId, UiFoleyKind } from '../contracts/audio';
import type { CausalityKind } from '../contracts/causality';
import { AUDIO_LEVEL_GAIN } from '../contracts/constants';
import type { MaterialId } from '../contracts/materials';
import type { RegionKind } from '../contracts/regions';
import { Brush } from './brush';
import {
  playActorAwake,
  playAutoBloom,
  playCausality,
  playHintLantern,
  playPageFinale,
  playPageTurn,
  playPoke,
  playStage,
  playStoryMedallion,
} from './events';
import { playUiFoley } from './foley';
import { glide, Rig, setVal } from './graph';
import { BEAT_SEC, Pulse } from './pulse';

type CtxCtor = new (opts?: AudioContextOptions) => AudioContext;

function findCtor(): CtxCtor | null {
  const g = globalThis as unknown as { AudioContext?: CtxCtor; webkitAudioContext?: CtxCtor };
  return g.AudioContext ?? g.webkitAudioContext ?? null;
}

function wallSeconds(): number {
  try {
    if (typeof performance !== 'undefined' && typeof performance.now === 'function') return performance.now() / 1000;
  } catch {
    /* fall through */
  }
  return Date.now() / 1000;
}

class AudioEngine implements AudioPort {
  private lvl: AudioLevel = 3;
  private ctx: AudioContext | null = null;
  private rig: Rig | null = null;
  private master: GainNode | null = null;
  private brush: Brush | null = null;
  private pulse: Pulse | null = null;
  private stems: StemId[] = [];
  private disposed = false;
  private totalCreated = 0;

  /* ---- lifecycle ---- */

  async unlock(): Promise<void> {
    if (this.disposed) return;
    try {
      if (!this.ctx) this.create();
      const ctx = this.ctx;
      if (!ctx) return;
      if (ctx.state !== 'running' && typeof ctx.resume === 'function') await ctx.resume();
      if (this.disposed) return;
      this.pulse?.setStems(this.stems);
    } catch {
      /* autoplay refused or context unavailable: stay silent */
    }
  }

  dispose(): void {
    if (this.disposed) return;
    this.disposed = true;
    try {
      this.brush?.dispose();
      this.pulse?.stop();
      if (this.rig) this.totalCreated = this.rig.totalCreated;
      this.rig?.disposeAll();
      const ctx = this.ctx;
      if (ctx && typeof ctx.close === 'function') void Promise.resolve(ctx.close()).catch(() => undefined);
    } catch {
      /* ignore */
    }
    this.ctx = null;
    this.rig = null;
    this.master = null;
    this.brush = null;
    this.pulse = null;
  }

  private create(): void {
    const Ctor = findCtor();
    if (!Ctor) return;
    let ctx: AudioContext;
    try {
      ctx = new Ctor({ latencyHint: 'interactive' });
    } catch {
      return;
    }
    const rig = new Rig(ctx);
    const master = rig.track(ctx.createGain());
    setVal(master.gain, AUDIO_LEVEL_GAIN[this.lvl]);
    const comp = rig.track(ctx.createDynamicsCompressor());
    // soft limiter
    setVal(comp.threshold, -10);
    setVal(comp.knee, 12);
    setVal(comp.ratio, 12);
    setVal(comp.attack, 0.003);
    setVal(comp.release, 0.25);
    master.connect(comp);
    comp.connect(ctx.destination);
    rig.out = master;
    this.ctx = ctx;
    this.rig = rig;
    this.master = master;
    this.brush = new Brush(rig, () => this.lvl > 0);
    this.pulse = new Pulse(rig, () => this.lvl > 0);
  }

  /** The rig, only while sound can actually be produced. */
  private ready(): Rig | null {
    const rig = this.rig;
    const ctx = this.ctx;
    if (!rig || !ctx || this.disposed || this.lvl === 0) return null;
    const st = ctx.state as string | undefined;
    if (typeof st === 'string' && st !== 'running') return null;
    return rig.canSpawn() ? rig : null;
  }

  private run(fn: (rig: Rig) => void): void {
    try {
      const rig = this.ready();
      if (rig) fn(rig);
    } catch {
      /* audio must never break the game */
    }
  }

  /* ---- level ---- */

  setLevel(l: AudioLevel): void {
    if (l !== 0 && l !== 1 && l !== 2 && l !== 3) return;
    this.lvl = l;
    try {
      if (this.master && this.ctx) glide(this.master.gain, AUDIO_LEVEL_GAIN[l], this.ctx.currentTime || 0, 0.05);
      if (l === 0) this.brush?.fadeOut(this.rig?.now() ?? 0);
    } catch {
      /* ignore */
    }
  }

  level(): AudioLevel {
    return this.lvl;
  }

  /* ---- brush ---- */

  stroke(active: boolean, speed: number, materialId: MaterialId): void {
    try {
      const rig = this.rig;
      if (!rig || !this.brush || this.disposed) return;
      const st = this.ctx?.state as string | undefined;
      if (typeof st === 'string' && st !== 'running') return;
      this.brush.update(!!active, speed, materialId);
    } catch {
      /* ignore */
    }
  }

  /* ---- events ---- */

  stage(kind: RegionKind, stage: number): void {
    this.run((r) => playStage(r, kind, stage));
  }
  autoBloom(): void {
    this.run((r) => playAutoBloom(r));
  }
  poke(actor: ActorKind): void {
    this.run((r) => playPoke(r, actor));
  }
  actorAwake(actor: ActorKind): void {
    this.run((r) => playActorAwake(r, actor));
  }
  causality(k: CausalityKind): void {
    this.run((r) => playCausality(r, k));
  }
  pageTurn(): void {
    this.run((r) => playPageTurn(r));
  }
  storyMedallion(stepIndex: number, total: number): void {
    this.run((r) => playStoryMedallion(r, stepIndex, total));
  }
  pageFinale(): void {
    this.run((r) => playPageFinale(r));
  }
  hintLantern(): void {
    this.run((r) => playHintLantern(r));
  }
  uiFoley(kind: UiFoleyKind): void {
    this.run((r) => playUiFoley(r, kind));
  }

  /* ---- pulse ---- */

  setStems(s: StemId[]): void {
    try {
      this.stems = Array.isArray(s) ? [...s] : [];
      if (this.disposed) return;
      this.pulse?.setStems(this.stems);
    } catch {
      /* ignore */
    }
  }

  beatPhase(): number {
    let t = wallSeconds();
    try {
      if (this.ctx && !this.disposed && Number.isFinite(this.ctx.currentTime)) t = this.ctx.currentTime;
    } catch {
      /* wall clock */
    }
    const p = (t / BEAT_SEC) % 1;
    return Number.isFinite(p) ? (p < 0 ? p + 1 : p) % 1 : 0;
  }

  stats(): { liveNodes: number; totalCreated: number } {
    return {
      liveNodes: this.rig?.live.size ?? 0,
      totalCreated: this.rig?.totalCreated ?? this.totalCreated,
    };
  }
}

export function createAudio(): AudioPort {
  return new AudioEngine();
}
