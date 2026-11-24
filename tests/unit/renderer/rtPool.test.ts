import { describe, expect, it } from 'vitest';
import { RtPool } from '../../../src/renderer/rtPool';
import type { RtFactory } from '../../../src/renderer/rtPool';

interface FakeRt {
  id: number;
  w: number;
  h: number;
  destroyed: boolean;
}

function fakeFactory(): RtFactory<FakeRt> & { made: FakeRt[]; destroyCalls: number } {
  const made: FakeRt[] = [];
  const f = {
    made,
    destroyCalls: 0,
    create(w: number, h: number): FakeRt {
      const rt = { id: made.length, w, h, destroyed: false };
      made.push(rt);
      return rt;
    },
    destroy(rt: FakeRt): void {
      expect(rt.destroyed).toBe(false); // double destroy would be a bug
      rt.destroyed = true;
      f.destroyCalls++;
    },
  };
  return f;
}

describe('RtPool', () => {
  it('reuses released render textures: counts are flat after 50 acquire/release cycles', () => {
    const fac = fakeFactory();
    const pool = new RtPool(fac);
    const base = pool.acquire(1920, 1080);
    pool.release(base);
    const baseline = pool.stats();
    for (let i = 0; i < 50; i++) {
      const a = pool.acquire(1920, 1080);
      const b = pool.acquire(1920, 1080);
      expect(pool.stats().live).toBe(2);
      pool.release(a);
      pool.release(b);
    }
    const s = pool.stats();
    expect(s.live).toBe(0);
    expect(s.pooled).toBe(2); // the two used per cycle are retained, never grows
    expect(s.created).toBe(2);
    expect(s.destroyed).toBe(0);
    expect(fac.made).toHaveLength(2);
    expect(baseline.created).toBe(1);
  });

  it('simulates 52 page turns (2 RTs each): no leak, live returns to baseline', () => {
    const fac = fakeFactory();
    const pool = new RtPool(fac);
    const stroke = [pool.acquire(1920, 1080), pool.acquire(1920, 1080)];
    expect(pool.stats().live).toBe(2);
    for (let turn = 0; turn < 52; turn++) {
      const old = pool.acquire(1366, 768);
      const next = pool.acquire(1366, 768);
      pool.release(old);
      pool.release(next);
      expect(pool.stats().live).toBe(2);
    }
    expect(pool.stats()).toMatchObject({ live: 2, pooled: 2, created: 4, destroyed: 0 });
    expect(stroke.every((s) => !s.destroyed)).toBe(true);
  });

  it('keeps different sizes apart', () => {
    const pool = new RtPool(fakeFactory());
    const a = pool.acquire(100, 100);
    pool.release(a);
    const b = pool.acquire(200, 100);
    expect(b).not.toBe(a);
    expect(b.w).toBe(200);
    expect(pool.acquire(100, 100)).toBe(a);
  });

  it('destroys on discard / trim / destroyAll, exactly once each', () => {
    const fac = fakeFactory();
    const pool = new RtPool(fac);
    const a = pool.acquire(10, 10);
    const b = pool.acquire(10, 10);
    const c = pool.acquire(20, 20);
    pool.discard(a);
    expect(a.destroyed).toBe(true);
    expect(pool.stats()).toMatchObject({ live: 2, pooled: 0, destroyed: 1 });
    pool.release(b);
    pool.trim();
    expect(b.destroyed).toBe(true);
    expect(pool.stats()).toMatchObject({ live: 1, pooled: 0, destroyed: 2 });
    pool.destroyAll();
    expect(c.destroyed).toBe(true);
    expect(pool.stats()).toMatchObject({ live: 0, pooled: 0, destroyed: 3 });
    expect(fac.destroyCalls).toBe(3);
    expect(fac.made.every((r) => r.destroyed)).toBe(true);
  });

  it('ignores double release and releasing foreign objects', () => {
    const pool = new RtPool(fakeFactory());
    const a = pool.acquire(10, 10);
    pool.release(a);
    pool.release(a);
    expect(pool.stats().pooled).toBe(1);
    pool.release({ id: 99, w: 1, h: 1, destroyed: false });
    pool.discard({ id: 98, w: 1, h: 1, destroyed: false });
    expect(pool.stats()).toMatchObject({ live: 0, pooled: 1, destroyed: 0 });
  });
});
