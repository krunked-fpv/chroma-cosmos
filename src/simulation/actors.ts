/**
 * Actor runtime: partial animations at rest, full steering when awake, effect-driven tasks
 * (slide, pounce, dash, trampoline bounce, race laps). Time advances only through update(dt).
 */
import { PAGE_H, PAGE_W, POKE_CHASE_MS } from '../contracts';
import type { ActorKind, ActorRenderState, ActorSpawn, AnimName, BrushId, PagePath, SimEvent } from '../contracts';
import type { EffectPool, EffectRT } from './effects';
import { clamp, mulberry32 } from './util';

export interface ActorHost {
  readonly effects: EffectPool;
  paths: PagePath[];
  emit(e: SimEvent): void;
  /** current brush point (gesture) or hover or last known pointer */
  pointer(): { x: number; y: number } | null;
  hoverPoint(): { x: number; y: number } | null;
  brush(): BrushId;
  collect(e: EffectRT): void;
}

type Task =
  | { type: 'slide'; fx: EffectRT; phase: 0 | 1; t: number }
  | { type: 'pounce'; fx: EffectRT; phase: 0 | 1; t: number }
  | { type: 'dash'; tx: number; ty: number; onArrive: () => void }
  | { type: 'bounce'; fx: EffectRT; phase: 0 | 1; bt: number; bounces: number; baseY: number; amp: number };

const FRAME_MS = 120;
const DRIFTERS: readonly ActorKind[] = ['moonCat', 'comet', 'whale', 'gazelle', 'flower'];
const PATH_ROLES: Partial<Record<ActorKind, PagePath['role'][]>> = {
  lumi: ['gallop'],
  nova: ['sprint', 'ring'],
  whale: ['swim'],
  comet: ['orbit'],
  gazelle: ['gallop', 'sprint'],
  cometCar: ['ring'],
};
const BASE_SPEED: Partial<Record<ActorKind, number>> = {
  lumi: 52,
  nova: 84,
  whale: 24,
  comet: 30,
  gazelle: 70,
  cometCar: 76,
};

export class ActorRT {
  readonly view: ActorRenderState;
  readonly spawn: ActorSpawn;
  readonly regionIds: number[];
  homeX: number;
  homeY: number;
  vx = 0;
  vy = 0;
  stage = 0;
  awake = false;
  shown = true;
  showAt = 0;
  mirage = false;
  forced = false;
  path: PagePath | null = null;
  pathIdx = -1;
  pathDir = 1;
  lockAnim: AnimName | null = null;
  lockUntil = 0;
  chaseUntil = 0;
  task: Task | null = null;
  tasks: Task[] = [];
  animStart = 0;
  driftVx = 0;
  driftVy = 0;
  readonly seed: number;

  constructor(spawn: ActorSpawn) {
    this.spawn = spawn;
    this.regionIds = spawn.regionIds.slice();
    this.homeX = spawn.x;
    this.homeY = spawn.y;
    this.seed = (spawn.slot * 7919 + spawn.instanceId.length * 104729) >>> 0;
    this.view = {
      instanceId: spawn.instanceId,
      kind: spawn.kind,
      slot: spawn.slot,
      x: spawn.x,
      y: spawn.y,
      facing: spawn.facing,
      anim: 'sleep',
      frame: 0,
      live: false,
    };
    if (spawn.remap) this.view.remap = spawn.remap;
  }

  get kind(): ActorKind {
    return this.view.kind;
  }
}

export class ActorSystem {
  readonly list: ActorRT[] = [];
  simT = 0;
  private claimed = new Set<number>();
  private ambientAt: number;
  private rand: () => number;
  private viewCache: ActorRenderState[] = [];

  constructor(private host: ActorHost, spawns: readonly ActorSpawn[], seed: number) {
    this.rand = mulberry32(seed ^ 0x9e3779b9);
    this.ambientAt = 6000 + this.rand() * 4000;
    for (const s of spawns) {
      const a = new ActorRT(s);
      this.list.push(a);
      a.path = this.pickPath(a);
    }
    this.rebuildView();
  }

  private pickPath(a: ActorRT): PagePath | null {
    const paths = this.host.paths;
    const idx = a.spawn.pathIndex;
    if (idx !== undefined && paths[idx]) return paths[idx]!;
    const roles = PATH_ROLES[a.kind];
    if (!roles) return null;
    for (const r of roles) {
      const p = paths.find((q) => q.role === r && q.points.length >= 2);
      if (p) return p;
    }
    return null;
  }

  firstOfKind(kind: ActorKind): ActorRT | undefined {
    return this.list.find((a) => a.kind === kind);
  }

  /** Recomputes stage / awake from region state. Returns actors that just became awake. */
  refreshStatus(stageOf: Uint8Array, bloomed: Uint8Array, total: Uint32Array): ActorRT[] {
    const woke: ActorRT[] = [];
    for (const a of this.list) {
      if (a.regionIds.length === 0) continue;
      let stage = 0;
      let all = true;
      let real = 0;
      for (const id of a.regionIds) {
        if (total[id]! === 0) continue;
        real++;
        const s = bloomed[id] ? 4 : stageOf[id]!;
        if (s > stage) stage = s;
        if (!bloomed[id]) all = false;
      }
      a.stage = stage;
      if (!a.view.live && stage >= 2) a.view.live = true;
      if (real > 0 && all && !a.awake) {
        a.awake = true;
        a.view.live = true;
        woke.push(a);
      }
    }
    return woke;
  }

  // ---------------------------------------------------------------- spawning helpers

  addCars(regionId: number, ring: PagePath): ActorRT[] {
    const cars: ActorRT[] = [];
    const n = ring.points.length;
    for (let i = 0; i < 3; i++) {
      const at = ring.points[Math.floor((i * n) / 3) % n]!;
      const spawn: ActorSpawn = {
        instanceId: `cometCar:${regionId}:${i}`,
        kind: 'cometCar',
        slot: 0,
        x: at.x,
        y: at.y,
        facing: 1,
        regionIds: [],
      };
      const a = new ActorRT(spawn);
      a.path = ring;
      a.pathIdx = Math.floor((i * n) / 3) % n;
      a.awake = true;
      a.stage = 4;
      a.view.live = true;
      a.view.anim = 'run';
      a.animStart = this.simT;
      this.list.push(a);
      cars.push(a);
    }
    return cars;
  }

  addFlowers(regionId: number, spots: { x: number; y: number }[], firstDelayMs: number): void {
    spots.forEach((p, i) => {
      const spawn: ActorSpawn = {
        instanceId: `flower:${regionId}:${i}`,
        kind: 'flower',
        slot: 0,
        x: p.x,
        y: p.y,
        facing: i % 2 === 0 ? 1 : -1,
        regionIds: [],
      };
      const a = new ActorRT(spawn);
      a.shown = false;
      a.showAt = this.simT + firstDelayMs + i * 170;
      a.awake = true;
      a.stage = 4;
      a.view.live = true;
      this.list.push(a);
    });
  }

  queue(kind: ActorKind, task: Task): boolean {
    const a = this.firstOfKind(kind);
    if (!a) return false;
    a.tasks.push(task);
    return true;
  }

  queueSlide(fx: EffectRT): void {
    this.queue('nova', { type: 'slide', fx, phase: 0, t: 0 });
  }

  queueBounce(fx: EffectRT, amp: number): void {
    this.queue('violet', { type: 'bounce', fx, phase: 0, bt: 0, bounces: 0, baseY: fx.y, amp });
  }

  /** Nova dash; returns false when there is no live Nova (caller should run onArrive itself). */
  dashNova(tx: number, ty: number, onArrive: () => void): boolean {
    const a = this.firstOfKind('nova');
    if (!a || !a.view.live) return false;
    a.tasks.unshift({ type: 'dash', tx, ty, onArrive });
    return true;
  }

  wakeComets(cx: number, cy: number, radius: number): ActorRT[] {
    const out: ActorRT[] = [];
    for (const a of this.list) {
      if (a.kind !== 'comet') continue;
      if (Math.hypot(a.homeX - cx, a.homeY - cy) <= radius) {
        a.mirage = true;
        a.view.live = true;
        out.push(a);
      }
    }
    return out;
  }

  // ---------------------------------------------------------------- interaction

  hit(x: number, y: number, regionAt: number): ActorRT | null {
    let best: ActorRT | null = null;
    let bd = Infinity;
    for (const a of this.list) {
      if (!a.awake || !a.shown) continue;
      if (a.kind === 'flower' || a.kind === 'gem') continue;
      const d = Math.hypot(a.view.x - x, a.view.y - y);
      const r = a.kind === 'lumi' ? 22 : 16;
      const byRegion =
        regionAt > 0 && a.regionIds.includes(regionAt) && Math.hypot(a.view.x - a.homeX, a.view.y - a.homeY) < 30;
      if ((d <= r || byRegion) && d < bd) {
        best = a;
        bd = d;
      }
    }
    return best;
  }

  poke(a: ActorRT): void {
    const turbo = this.host.brush() === 'turboCheetah';
    this.host.emit({ type: 'poke', actor: a.kind, instanceId: a.view.instanceId });
    const fx = this.host.effects;
    switch (a.kind) {
      case 'lumi':
        this.lock(a, 'rear', 1000);
        fx.spawn('rainbowArc', a.view.x, a.view.y - 8, {
          x2: a.view.x + a.view.facing * 70,
          y2: a.view.y - 8,
          durMs: 1600,
        });
        break;
      case 'nova':
        a.chaseUntil = this.simT + POKE_CHASE_MS;
        break;
      case 'violet':
        this.lock(a, 'leap', 800);
        break;
      case 'moonCat':
        this.lock(a, 'peek', 900);
        break;
      default:
        this.lock(a, 'wiggle', 700);
    }
    if (turbo) fx.spawn('starBurst', a.view.x, a.view.y - 6, { durMs: 800 });
  }

  private lock(a: ActorRT, anim: AnimName, ms: number): void {
    a.lockAnim = anim;
    a.lockUntil = this.simT + ms;
  }

  // ---------------------------------------------------------------- update

  update(dtMs: number): void {
    this.simT += dtMs;
    const turbo = this.host.brush() === 'turboCheetah';
    const gel = this.host.brush() === 'zeroGGel';
    for (const a of this.list) {
      if (!a.shown) {
        if (this.simT >= a.showAt) {
          a.shown = true;
          a.animStart = this.simT;
        } else continue;
      }
      this.updateActor(a, dtMs, turbo ? 2 : 1, gel);
      const v = a.view;
      v.frame = Math.floor((this.simT - a.animStart) / FRAME_MS);
    }
    this.ambient(dtMs);
    this.rebuildView();
  }

  private ambient(_dt: number): void {
    const nova = this.firstOfKind('nova');
    if (!nova || !nova.view.live) return;
    if (this.simT < this.ambientAt) return;
    this.ambientAt = this.simT + 9000 + this.rand() * 5000;
    if (this.host.effects.ofKind('shootingStar').length > 0) return;
    const y0 = 20 + this.rand() * 60;
    const x0 = 40 + this.rand() * (PAGE_W - 200);
    this.host.effects.spawn('shootingStar', x0, y0, { x2: x0 + 120, y2: y0 + 70 + this.rand() * 40, durMs: 3600 });
  }

  private setAnim(a: ActorRT, name: AnimName): void {
    if (a.view.anim !== name) {
      a.view.anim = name;
      a.animStart = this.simT;
    }
  }

  private face(a: ActorRT, tx: number): void {
    if (Math.abs(tx - a.view.x) > 3) a.view.facing = tx > a.view.x ? 1 : -1;
  }

  /** Seek + arrive steering. Returns remaining distance before the move. */
  private steer(a: ActorRT, tx: number, ty: number, speed: number, arriveR: number, dt: number): number {
    const v = a.view;
    const dx = tx - v.x;
    const dy = ty - v.y;
    const d = Math.hypot(dx, dy);
    let sp = speed;
    if (arriveR > 0 && d < arriveR) sp = speed * (d / arriveR);
    const reach = (speed * dt) / 1000;
    if (arriveR <= 0 && d <= reach) {
      v.x = tx;
      v.y = ty;
      a.vx = d > 1e-6 ? (dx / d) * sp : 0;
      a.vy = d > 1e-6 ? (dy / d) * sp : 0;
      return d;
    }
    const dvx = d > 1e-6 ? (dx / d) * sp : 0;
    const dvy = d > 1e-6 ? (dy / d) * sp : 0;
    const k = Math.min(1, dt / 140);
    a.vx += (dvx - a.vx) * k;
    a.vy += (dvy - a.vy) * k;
    v.x += (a.vx * dt) / 1000;
    v.y += (a.vy * dt) / 1000;
    if (Math.abs(a.vx) > 2) v.facing = a.vx > 0 ? 1 : -1;
    return d;
  }

  private moveAnim(a: ActorRT): AnimName {
    const s = Math.hypot(a.vx, a.vy);
    if (a.kind === 'whale') return 'swim';
    if (a.kind === 'comet') return 'float';
    return s > 45 ? 'run' : s > 8 ? 'walk' : 'idle';
  }

  private follow(a: ActorRT, speed: number, dt: number): void {
    const p = a.path;
    if (!p || p.points.length < 2) {
      this.toHome(a, dt);
      return;
    }
    const pts = p.points;
    if (a.pathIdx < 0) {
      let bi = 0;
      let bd = Infinity;
      pts.forEach((q, i) => {
        const d = Math.hypot(q.x - a.view.x, q.y - a.view.y);
        if (d < bd) {
          bd = d;
          bi = i;
        }
      });
      a.pathIdx = bi;
    }
    const n = pts.length;
    const idx = a.pathIdx;
    const end = !p.closed && ((a.pathDir > 0 && idx === n - 1) || (a.pathDir < 0 && idx === 0));
    const t = pts[idx]!;
    const d = this.steer(a, t.x, t.y, speed, end ? 28 : 0, dt);
    if (d < (end ? 4 : 6)) {
      if (p.closed) a.pathIdx = (idx + a.pathDir + n) % n;
      else {
        let next = idx + a.pathDir;
        if (next >= n) {
          a.pathDir = -1;
          next = n - 2;
        } else if (next < 0) {
          a.pathDir = 1;
          next = 1;
        }
        a.pathIdx = next;
      }
    }
    this.setAnim(a, this.moveAnim(a));
  }

  private toHome(a: ActorRT, dt: number): void {
    const d = this.steer(a, a.homeX, a.homeY, 46, 24, dt);
    this.setAnim(a, d > 3 ? this.moveAnim(a) : 'idle');
    if (d <= 3) {
      a.vx = 0;
      a.vy = 0;
    }
  }

  private updateActor(a: ActorRT, dt: number, mul: number, gel: boolean): void {
    const v = a.view;
    if (!v.live && a.kind === 'violet' && (a.tasks.length > 0 || a.task !== null)) v.live = true;
    if (!v.live) {
      this.setAnim(a, a.stage >= 1 ? 'wiggle' : 'sleep');
      return;
    }
    // transient animation lock (rear, leap, ...)
    if (a.lockAnim !== null) {
      if (this.simT < a.lockUntil) {
        this.setAnim(a, a.lockAnim);
        return;
      }
      a.lockAnim = null;
    }
    // activities that need a live protagonist
    if (a.kind === 'nova' || a.kind === 'violet') {
      if (this.runTasks(a, dt, mul)) return;
    }
    if (a.mirage && !a.awake) {
      this.mirageUpdate(a);
      return;
    }
    if (a.awake) {
      if (gel && DRIFTERS.includes(a.kind)) {
        this.drift(a, dt);
        return;
      }
      this.awakeUpdate(a, dt, mul);
      return;
    }
    this.restUpdate(a, dt);
  }

  private restUpdate(a: ActorRT, dt: number): void {
    const v = a.view;
    const hover = this.host.hoverPoint();
    const ptr = this.host.pointer();
    switch (a.kind) {
      case 'nova':
        this.setAnim(a, a.stage >= 3 ? 'idle' : 'wiggle'); // tail thump
        break;
      case 'moonCat': {
        const near = hover !== null && Math.hypot(hover.x - v.x, hover.y - v.y) < 140;
        this.setAnim(a, near ? 'peek' : 'sleep');
        if (hover) this.face(a, hover.x);
        break;
      }
      default:
        this.setAnim(a, 'idle'); // ears flick etc.
    }
    // stage 3: lean toward the brush
    let lx = 0;
    let ly = 0;
    if (a.stage >= 3 && ptr && Math.hypot(ptr.x - a.homeX, ptr.y - a.homeY) < 220 && (a.kind === 'lumi' || a.kind === 'nova' || a.kind === 'violet')) {
      lx = clamp((ptr.x - a.homeX) * 0.05, -4, 4);
      ly = clamp((ptr.y - a.homeY) * 0.03, -2, 2);
      this.face(a, ptr.x);
    }
    const k = Math.min(1, dt / 180);
    v.x += (a.homeX + lx - v.x) * k;
    v.y += (a.homeY + ly - v.y) * k;
  }

  private mirageUpdate(a: ActorRT): void {
    const t = this.simT / 1000 + a.seed;
    a.view.x = a.homeX + Math.cos(t * 0.9) * 10;
    a.view.y = a.homeY + Math.sin(t * 1.3) * 6;
    this.setAnim(a, 'float');
  }

  private awakeUpdate(a: ActorRT, dt: number, mul: number): void {
    const v = a.view;
    const ptr = this.host.pointer();
    const sp = (BASE_SPEED[a.kind] ?? 40) * mul;
    switch (a.kind) {
      case 'nova':
        if (this.simT < a.chaseUntil && ptr) {
          this.face(a, ptr.x);
          const d = this.steer(a, ptr.x, ptr.y, 110 * mul, 26, dt);
          this.setAnim(a, d > 10 ? 'run' : 'idle');
          return;
        }
        if (this.racing(a)) {
          this.follow(a, 100 * mul, dt);
          return;
        }
        this.follow(a, sp, dt);
        return;
      case 'lumi':
      case 'gazelle':
      case 'cometCar':
      case 'whale':
        this.follow(a, sp, dt);
        return;
      case 'comet': {
        if (a.path) this.follow(a, sp, dt);
        else if (Math.hypot(v.x - a.homeX, v.y - a.homeY) > 6) this.toHome(a, dt);
        else {
          const t = this.simT / 600 + a.seed;
          v.y = a.homeY + Math.sin(t) * 3;
          this.setAnim(a, 'float');
        }
        return;
      }
      case 'moonCat': {
        const hover = this.host.hoverPoint();
        const near = hover !== null && Math.hypot(hover.x - v.x, hover.y - v.y) < 160;
        if (hover) this.face(a, hover.x);
        if (Math.hypot(v.x - a.homeX, v.y - a.homeY) > 3) {
          this.toHome(a, dt); // floats back after the gel is put down
          return;
        }
        this.setAnim(a, near ? 'peek' : 'idle');
        return;
      }
      case 'flower': {
        if (Math.hypot(v.x - a.homeX, v.y - a.homeY) > 3) {
          this.toHome(a, dt);
          return;
        }
        this.setAnim(a, this.simT - a.animStart < 700 ? 'wiggle' : 'idle');
        return;
      }
      default:
        this.setAnim(a, 'idle');
        this.toHome(a, dt);
    }
  }

  private racing(a: ActorRT): boolean {
    const ring = this.host.effects.list.find((e) => e.kind === 'cheetahRacetrack');
    if (!ring) return false;
    const rp = this.host.paths.find((p) => p.role === 'ring' && p.closed);
    const car = this.list.find((c) => c.kind === 'cometCar');
    const path = rp ?? car?.path ?? null;
    if (!path) return false;
    if (a.path !== path) {
      a.path = path;
      a.pathIdx = -1;
    }
    return true;
  }

  /** Zero-G gel: awake objects drift, bounce off walls, Lumi, Nova and comets. */
  private drift(a: ActorRT, dt: number): void {
    const v = a.view;
    if (a.driftVx === 0 && a.driftVy === 0) {
      const ang = (a.seed % 628) / 100;
      a.driftVx = Math.cos(ang) * 18;
      a.driftVy = Math.sin(ang) * 12;
    }
    v.x += (a.driftVx * dt) / 1000;
    v.y += (a.driftVy * dt) / 1000;
    if (v.x < 10) {
      v.x = 10;
      a.driftVx = Math.abs(a.driftVx);
    } else if (v.x > PAGE_W - 10) {
      v.x = PAGE_W - 10;
      a.driftVx = -Math.abs(a.driftVx);
    }
    if (v.y < 10) {
      v.y = 10;
      a.driftVy = Math.abs(a.driftVy);
    } else if (v.y > PAGE_H - 10) {
      v.y = PAGE_H - 10;
      a.driftVy = -Math.abs(a.driftVy);
    }
    for (const o of this.list) {
      if (o === a || !(o.kind === 'lumi' || o.kind === 'nova' || o.kind === 'comet') || !o.shown) continue;
      const dx = v.x - o.view.x;
      const dy = v.y - o.view.y;
      const d = Math.hypot(dx, dy);
      const minD = 22;
      if (d < minD && d > 1e-6) {
        const nx = dx / d;
        const ny = dy / d;
        const dot = a.driftVx * nx + a.driftVy * ny;
        if (dot < 0) {
          a.driftVx -= 2 * dot * nx;
          a.driftVy -= 2 * dot * ny;
        }
        v.x = o.view.x + nx * minD;
        v.y = o.view.y + ny * minD;
      }
    }
    a.vx = a.driftVx;
    a.vy = a.driftVy;
    if (Math.abs(a.driftVx) > 1) v.facing = a.driftVx > 0 ? 1 : -1;
    this.setAnim(a, 'float');
  }

  // ---------------------------------------------------------------- tasks (Nova / Violet)

  /** Returns true when a task consumed this frame. */
  private runTasks(a: ActorRT, dt: number, mul: number): boolean {
    if (a.kind === 'nova' && this.simT < a.chaseUntil && a.awake) return false;
    if (!a.task) {
      a.task = a.tasks.shift() ?? null;
      if (!a.task && a.kind === 'nova') a.task = this.autoPounce(a);
    }
    const t = a.task;
    if (!t) return false;
    const v = a.view;
    switch (t.type) {
      case 'slide': {
        if (!this.host.effects.list.includes(t.fx)) {
          a.task = null;
          return false;
        }
        if (t.phase === 0) {
          const d = this.steer(a, t.fx.x, t.fx.y, 130 * mul, 0, dt);
          this.setAnim(a, 'run');
          if (d < 6) t.phase = 1;
        } else {
          t.t += dt;
          const p = Math.min(1, t.t / 1800);
          const e = p * p * (3 - 2 * p);
          const x2 = t.fx.x2 ?? t.fx.x;
          const y2 = t.fx.y2 ?? t.fx.y;
          v.x = t.fx.x + (x2 - t.fx.x) * e;
          v.y = t.fx.y + (y2 - t.fx.y) * e;
          a.vx = (x2 - t.fx.x) / 1.8;
          a.vy = (y2 - t.fx.y) / 1.8;
          this.face(a, x2);
          this.setAnim(a, 'run');
          if (p >= 1) a.task = null;
        }
        return true;
      }
      case 'pounce': {
        if (t.phase === 0) {
          if (!this.host.effects.list.includes(t.fx)) {
            a.task = null;
            return false;
          }
          const tx = t.fx.x + ((t.fx.x2 ?? t.fx.x) - t.fx.x) * t.fx.t;
          const ty = t.fx.y + ((t.fx.y2 ?? t.fx.y) - t.fx.y) * t.fx.t;
          const d = this.steer(a, tx, ty, 170 * mul, 0, dt);
          this.setAnim(a, 'run');
          if (d < 14) {
            t.phase = 1;
            this.host.effects.remove(t.fx);
            this.host.effects.spawn('starBurst', tx, ty, { durMs: 800 });
            this.lock(a, 'leap', 450);
          }
        } else {
          a.task = null;
        }
        return true;
      }
      case 'dash': {
        const d = this.steer(a, t.tx, t.ty, 240, 0, dt);
        this.setAnim(a, 'run');
        if (d < 4) {
          a.task = null;
          t.onArrive();
        }
        return true;
      }
      case 'bounce': {
        v.live = true;
        if (t.phase === 0) {
          const d = this.steer(a, t.fx.x, t.baseY, 110, 0, dt);
          this.setAnim(a, 'run');
          if (d < 6) {
            t.phase = 1;
          }
          return true;
        }
        const period = 900;
        const before = Math.floor(t.bt / period);
        t.bt += dt;
        const after = Math.floor(t.bt / period);
        const ph = (t.bt % period) / period;
        // horizontal hop toward the nearest uncollected hidden star
        let star: EffectRT | null = null;
        let sd = Infinity;
        for (const e of this.host.effects.list) {
          if (e.kind !== 'hiddenStar') continue;
          const d = Math.abs(e.x - v.x);
          if (d < sd) {
            sd = d;
            star = e;
          }
        }
        const tx = star ? star.x : t.fx.x;
        const hx = clamp(tx - v.x, -75 * (dt / 1000), 75 * (dt / 1000));
        v.x += hx;
        v.y = t.baseY - Math.sin(Math.PI * ph) * t.amp;
        this.face(a, tx);
        this.setAnim(a, 'bounce');
        for (const e of this.host.effects.list.slice()) {
          if (e.kind === 'hiddenStar' && e.pickup && Math.hypot(e.x - v.x, e.y - v.y) < 20) this.host.collect(e);
        }
        if (after > before) {
          t.bounces += 1;
          this.host.emit({ type: 'violetBounce' });
        }
        const starsLeft = this.host.effects.list.some((e) => e.kind === 'hiddenStar');
        if ((t.bounces >= 3 && !starsLeft) || t.bounces >= 12) {
          v.y = t.baseY;
          a.task = null;
        }
        return true;
      }
    }
  }

  private autoPounce(a: ActorRT): Task | null {
    if (!a.awake) return null;
    for (const e of this.host.effects.ofKind('shootingStar')) {
      if (this.claimed.has(e.id) || e.ageMs < 250) continue;
      this.claimed.add(e.id);
      return { type: 'pounce', fx: e, phase: 0, t: 0 };
    }
    return null;
  }

  // ---------------------------------------------------------------- view

  private rebuildView(): void {
    this.viewCache = this.list.filter((a) => a.shown).map((a) => a.view);
  }

  views(): ActorRenderState[] {
    return this.viewCache;
  }
}
