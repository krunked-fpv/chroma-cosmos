/**
 * Pointer input controller for the canvas host.
 * - First pointer owns the gesture; any other pointer is ignored until the owner ends/cancels.
 * - Uses pointer capture + coalesced events; converts client -> internal page pixels via deps.clientToInternal.
 * - 'start' is only emitted for points inside the page; moves/ends are clamped to the page.
 */
import { PAGE_H, PAGE_W } from '../contracts/constants';
import type { GestureEvent } from '../contracts/input';

export interface InputSinks {
  toInternal(cx: number, cy: number): { x: number; y: number } | null;
  gesture(e: GestureEvent): void;
  hover(p: { x: number; y: number } | null): void;
  /** gestures are only forwarded while this returns true (e.g. chapter/hub mode) */
  enabled(): boolean;
}

type Pt = { x: number; y: number };

const clamp = (v: number, lo: number, hi: number): number => (v < lo ? lo : v > hi ? hi : v);
const MAX_X = PAGE_W - 0.001;
const MAX_Y = PAGE_H - 0.001;

export class PointerInput {
  private owner: number | null = null;
  private ownerType = '';
  private lastClient: Pt | null = null;
  private lastInternal: Pt | null = null;
  private readonly host: HTMLElement;
  private readonly sinks: InputSinks;
  private readonly offs: Array<() => void> = [];

  constructor(host: HTMLElement, sinks: InputSinks) {
    this.host = host;
    this.sinks = sinks;
    const on = <K extends keyof HTMLElementEventMap>(type: K, fn: (e: HTMLElementEventMap[K]) => void, opts?: AddEventListenerOptions): void => {
      host.addEventListener(type, fn as EventListener, opts);
      this.offs.push(() => host.removeEventListener(type, fn as EventListener, opts));
    };
    on('pointerdown', (e) => this.down(e), { passive: false });
    on('pointermove', (e) => this.move(e), { passive: false });
    on('pointerup', (e) => this.up(e), { passive: false });
    on('pointercancel', (e) => this.cancel(e));
    on('lostpointercapture', (e) => this.cancel(e));
    on('pointerleave', (e) => {
      if (this.owner === null || e.pointerId !== this.owner) this.sinks.hover(null);
    });
    const block = (e: Event): void => e.preventDefault();
    on('contextmenu', block, { passive: false });
    on('dblclick', block, { passive: false });
    host.addEventListener('gesturestart', block, { passive: false });
    host.addEventListener('gesturechange', block, { passive: false });
    host.addEventListener('touchstart', block, { passive: false });
    this.offs.push(() => {
      host.removeEventListener('gesturestart', block);
      host.removeEventListener('gesturechange', block);
      host.removeEventListener('touchstart', block);
    });
  }

  /** current owner pointer id (null when idle) */
  get activePointer(): number | null {
    return this.owner;
  }

  destroy(): void {
    for (const off of this.offs.splice(0)) off();
    this.owner = null;
  }

  /** Cancel the active gesture (e.g. a modal opened mid-stroke). Emits 'cancel' for the owner. */
  abort(): void {
    if (this.owner === null) return;
    const id = this.owner;
    const type = this.ownerType;
    const p = this.lastInternal ?? { x: 0, y: 0 };
    this.release(id);
    this.emit('cancel', { pointerId: id, pointerType: type, pressure: 0, tiltX: 0, tiltY: 0, timeStamp: performance.now() } as PointerEvent, p);
  }

  private emit(phase: GestureEvent['phase'], e: PointerEvent, p: Pt): void {
    const pressure = e.pressure > 0 ? e.pressure : e.pointerType === 'mouse' && phase !== 'end' && phase !== 'cancel' ? 0.5 : e.pressure || 0;
    this.sinks.gesture({
      phase,
      x: p.x,
      y: p.y,
      pointerId: e.pointerId,
      pointerType: e.pointerType || this.ownerType || 'mouse',
      pressure,
      tiltX: e.tiltX || 0,
      tiltY: e.tiltY || 0,
      timeMs: e.timeStamp || performance.now(),
    });
  }

  /** Resolve an internal point for a move/end, clamping to the page edge when the pointer left it. */
  private resolveClamped(cx: number, cy: number): Pt | null {
    const direct = this.sinks.toInternal(cx, cy);
    if (direct) return { x: clamp(direct.x, 0, MAX_X), y: clamp(direct.y, 0, MAX_Y) };
    // 1) clamp into the host rectangle and retry
    const r = this.host.getBoundingClientRect();
    if (r.width > 0 && r.height > 0) {
      const hx = clamp(cx, r.left + 0.5, r.right - 0.5);
      const hy = clamp(cy, r.top + 0.5, r.bottom - 0.5);
      const viaHost = this.sinks.toInternal(hx, hy);
      if (viaHost) return { x: clamp(viaHost.x, 0, MAX_X), y: clamp(viaHost.y, 0, MAX_Y) };
    }
    // 2) bisect toward the last valid client point to find the page edge
    if (this.lastClient) {
      let ax = this.lastClient.x, ay = this.lastClient.y, bx = cx, by = cy;
      let best: Pt | null = null;
      for (let i = 0; i < 12; i++) {
        const mx = (ax + bx) / 2, my = (ay + by) / 2;
        const p = this.sinks.toInternal(mx, my);
        if (p) { best = p; ax = mx; ay = my; } else { bx = mx; by = my; }
      }
      if (best) return { x: clamp(best.x, 0, MAX_X), y: clamp(best.y, 0, MAX_Y) };
    }
    return this.lastInternal;
  }

  private down(e: PointerEvent): void {
    e.preventDefault();
    if (this.owner !== null) return; // first pointer owns the gesture
    if (!this.sinks.enabled()) return;
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    const p = this.sinks.toInternal(e.clientX, e.clientY);
    if (!p) return; // starts outside the page are skipped
    this.owner = e.pointerId;
    this.ownerType = e.pointerType;
    try {
      if (typeof this.host.setPointerCapture === 'function') this.host.setPointerCapture(e.pointerId);
    } catch {
      /* capture not available (synthetic/old browsers) */
    }
    const ip = { x: clamp(p.x, 0, MAX_X), y: clamp(p.y, 0, MAX_Y) };
    this.lastClient = { x: e.clientX, y: e.clientY };
    this.lastInternal = ip;
    this.emit('start', e, ip);
  }

  private move(e: PointerEvent): void {
    if (this.owner === null) {
      if (e.buttons === 0 && this.sinks.enabled()) this.sinks.hover(this.sinks.toInternal(e.clientX, e.clientY));
      return;
    }
    if (e.pointerId !== this.owner) return;
    e.preventDefault();
    let list: PointerEvent[] = [];
    if (typeof e.getCoalescedEvents === 'function') {
      try {
        list = e.getCoalescedEvents();
      } catch {
        list = [];
      }
    }
    if (list.length === 0) list = [e];
    for (const ce of list) {
      const p = this.resolveClamped(ce.clientX, ce.clientY);
      if (!p) continue;
      if (this.sinks.toInternal(ce.clientX, ce.clientY)) this.lastClient = { x: ce.clientX, y: ce.clientY };
      this.lastInternal = p;
      // coalesced samples carry their own coordinates but share the parent's ids
      this.emit('move', mergeEvent(e, ce), p);
    }
  }

  private up(e: PointerEvent): void {
    if (this.owner === null || e.pointerId !== this.owner) return;
    e.preventDefault();
    const p = this.resolveClamped(e.clientX, e.clientY) ?? this.lastInternal ?? { x: 0, y: 0 };
    this.release(e.pointerId);
    this.emit('end', e, p);
  }

  private cancel(e: PointerEvent): void {
    if (this.owner === null || e.pointerId !== this.owner) return;
    const p = this.lastInternal ?? { x: 0, y: 0 };
    this.release(e.pointerId);
    this.emit('cancel', e, p);
  }

  private release(id: number): void {
    this.owner = null;
    this.ownerType = '';
    this.lastClient = null;
    try {
      if (typeof this.host.hasPointerCapture === 'function' && this.host.hasPointerCapture(id)) this.host.releasePointerCapture(id);
    } catch {
      /* ignore */
    }
  }
}

function mergeEvent(parent: PointerEvent, sample: PointerEvent): PointerEvent {
  if (sample === parent) return parent;
  return {
    pointerId: parent.pointerId,
    pointerType: parent.pointerType,
    pressure: sample.pressure || parent.pressure,
    tiltX: sample.tiltX ?? parent.tiltX,
    tiltY: sample.tiltY ?? parent.tiltY,
    timeStamp: sample.timeStamp || parent.timeStamp,
  } as PointerEvent;
}
