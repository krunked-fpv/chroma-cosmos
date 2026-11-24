/** RenderTexture pool with explicit destroy. Generic over a factory so it is testable without WebGL. */

export interface RtFactory<T> {
  create(width: number, height: number): T;
  destroy(rt: T): void;
}

export interface RtPoolStats {
  /** acquired and not yet released */
  live: number;
  /** idle, waiting for reuse */
  pooled: number;
  created: number;
  destroyed: number;
}

export class RtPool<T> {
  private readonly idle = new Map<string, T[]>();
  private readonly out = new Map<T, string>();
  private created = 0;
  private destroyed = 0;

  constructor(private readonly factory: RtFactory<T>) {}

  private static key(w: number, h: number): string {
    return `${w}x${h}`;
  }

  acquire(width: number, height: number): T {
    const key = RtPool.key(width, height);
    const list = this.idle.get(key);
    const rt = list?.pop() ?? this.make(width, height);
    this.out.set(rt, key);
    return rt;
  }

  private make(width: number, height: number): T {
    this.created++;
    return this.factory.create(width, height);
  }

  /** Returns an RT to the pool. Releasing something that is not live is a no-op. */
  release(rt: T): void {
    const key = this.out.get(rt);
    if (key === undefined) return;
    this.out.delete(rt);
    const list = this.idle.get(key);
    if (list) list.push(rt);
    else this.idle.set(key, [rt]);
  }

  /** Destroys an acquired RT instead of pooling it. */
  discard(rt: T): void {
    if (!this.out.delete(rt)) return;
    this.destroyed++;
    this.factory.destroy(rt);
  }

  /** Destroys every idle RT. */
  trim(): void {
    for (const list of this.idle.values()) {
      for (const rt of list) {
        this.destroyed++;
        this.factory.destroy(rt);
      }
    }
    this.idle.clear();
  }

  /** Destroys everything, including RTs that are still acquired. */
  destroyAll(): void {
    this.trim();
    for (const rt of this.out.keys()) {
      this.destroyed++;
      this.factory.destroy(rt);
    }
    this.out.clear();
  }

  stats(): RtPoolStats {
    let pooled = 0;
    for (const list of this.idle.values()) pooled += list.length;
    return { live: this.out.size, pooled, created: this.created, destroyed: this.destroyed };
  }
}
