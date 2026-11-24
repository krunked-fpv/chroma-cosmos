/** Effect pool: transient and persistent EffectRenderState entries. No timers; driven by update(dt). */
import type { EffectKind, EffectRenderState } from '../contracts';

export interface EffectRT extends EffectRenderState {
  /** Infinity = persistent */
  durMs: number;
  /** grow-in time used for t when persistent */
  growMs: number;
  /** clickable pickup payload */
  pickup: { gems: number; reason: string } | null;
  onDone: (() => void) | null;
}

export interface EffectOpts {
  x2?: number;
  y2?: number;
  durMs?: number;
  growMs?: number;
  materialId?: number;
  seed?: number;
  pickup?: { gems: number; reason: string };
  onDone?: () => void;
}

export class EffectPool {
  list: EffectRT[] = [];
  private nextId = 1;
  private seedCounter = 1;

  spawn(kind: EffectKind, x: number, y: number, o: EffectOpts = {}): EffectRT {
    const e: EffectRT = {
      id: this.nextId++,
      kind,
      x,
      y,
      t: 0,
      ageMs: 0,
      seed: o.seed ?? (this.seedCounter++ * 2654435761) >>> 0,
      durMs: o.durMs ?? Infinity,
      growMs: o.growMs ?? 1000,
      pickup: o.pickup ?? null,
      onDone: o.onDone ?? null,
    };
    if (o.x2 !== undefined) e.x2 = o.x2;
    if (o.y2 !== undefined) e.y2 = o.y2;
    if (o.materialId !== undefined) e.materialId = o.materialId;
    this.list.push(e);
    return e;
  }

  update(dtMs: number): void {
    const done: EffectRT[] = [];
    for (const e of this.list) {
      e.ageMs += dtMs;
      if (Number.isFinite(e.durMs)) {
        e.t = e.durMs <= 0 ? 1 : Math.min(1, e.ageMs / e.durMs);
        if (e.ageMs >= e.durMs) done.push(e);
      } else {
        e.t = e.growMs <= 0 ? 1 : Math.min(1, e.ageMs / e.growMs);
      }
    }
    if (done.length > 0) {
      this.list = this.list.filter((e) => !done.includes(e));
      for (const e of done) e.onDone?.();
    }
  }

  remove(e: EffectRT): void {
    const i = this.list.indexOf(e);
    if (i >= 0) this.list.splice(i, 1);
  }

  ofKind(kind: EffectKind): EffectRT[] {
    return this.list.filter((e) => e.kind === kind);
  }

  clear(): void {
    this.list = [];
  }
}
