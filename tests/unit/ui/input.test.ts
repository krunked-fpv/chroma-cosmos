// @vitest-environment jsdom
import { describe, expect, it, vi } from 'vitest';
import type { GestureEvent } from '../../../src/contracts';
import { PointerInput } from '../../../src/ui';

function pointerEvent(
  type: string,
  init: {
    pointerId: number;
    clientX: number;
    clientY: number;
    pointerType?: string;
    button?: number;
    buttons?: number;
    pressure?: number;
    tiltX?: number;
    tiltY?: number;
    coalesced?: Array<{ clientX: number; clientY: number; pressure?: number; timeStamp?: number }>;
  },
): PointerEvent {
  const ev = new Event(type, { bubbles: true, cancelable: true }) as PointerEvent;
  Object.defineProperties(ev, {
    pointerId: { value: init.pointerId },
    clientX: { value: init.clientX },
    clientY: { value: init.clientY },
    pointerType: { value: init.pointerType ?? 'touch' },
    button: { value: init.button ?? 0 },
    buttons: { value: init.buttons ?? (type === 'pointerup' ? 0 : 1) },
    pressure: { value: init.pressure ?? 0.6 },
    tiltX: { value: init.tiltX ?? 0 },
    tiltY: { value: init.tiltY ?? 0 },
  });
  if (init.coalesced) {
    Object.defineProperty(ev, 'getCoalescedEvents', {
      value: () =>
        init.coalesced!.map((c) => ({
          pointerId: init.pointerId,
          pointerType: init.pointerType ?? 'touch',
          clientX: c.clientX,
          clientY: c.clientY,
          pressure: c.pressure ?? 0.6,
          tiltX: 0,
          tiltY: 0,
          timeStamp: c.timeStamp ?? 10,
        })),
    });
  }
  return ev;
}

function makeHost() {
  const host = document.createElement('div');
  host.getBoundingClientRect = () =>
    ({ left: 0, top: 0, right: 480, bottom: 270, width: 480, height: 270, x: 0, y: 0, toJSON: () => ({}) }) as DOMRect;
  const captured = new Set<number>();
  host.setPointerCapture = vi.fn((id: number) => { captured.add(id); });
  host.hasPointerCapture = vi.fn((id: number) => captured.has(id));
  host.releasePointerCapture = vi.fn((id: number) => { captured.delete(id); });
  document.body.append(host);
  return host;
}

describe('PointerInput', () => {
  it('ignores a second concurrent pointer while the first pointer owns the gesture', () => {
    const host = makeHost();
    const events: GestureEvent[] = [];
    const input = new PointerInput(host, {
      toInternal: (x, y) => (x >= 0 && y >= 0 && x <= 480 && y <= 270 ? { x, y } : null),
      gesture: (e) => events.push(e),
      hover: vi.fn(),
      enabled: () => true,
    });

    // Pointer 1 starts and captures
    host.dispatchEvent(pointerEvent('pointerdown', { pointerId: 1, clientX: 50, clientY: 60 }));
    expect(input.activePointer).toBe(1);
    expect(host.setPointerCapture).toHaveBeenCalledWith(1);

    // Pointer 2 tries down/move/up/cancel -> all ignored
    host.dispatchEvent(pointerEvent('pointerdown', { pointerId: 2, clientX: 200, clientY: 120 }));
    host.dispatchEvent(pointerEvent('pointermove', { pointerId: 2, clientX: 210, clientY: 130 }));
    host.dispatchEvent(pointerEvent('pointercancel', { pointerId: 2, clientX: 210, clientY: 130 }));
    host.dispatchEvent(pointerEvent('pointerup', { pointerId: 2, clientX: 210, clientY: 130 }));

    expect(events).toHaveLength(1);
    expect(events[0]?.pointerId).toBe(1);
    expect(input.activePointer).toBe(1);

    // Pointer 1 moves and finishes
    host.dispatchEvent(pointerEvent('pointermove', { pointerId: 1, clientX: 90, clientY: 80 }));
    host.dispatchEvent(pointerEvent('pointerup', { pointerId: 1, clientX: 95, clientY: 85 }));
    expect(events.map((e) => `${e.phase}:${e.pointerId}`)).toEqual(['start:1', 'move:1', 'end:1']);
    expect(input.activePointer).toBeNull();

    // Now pointer 2 can start a new gesture
    host.dispatchEvent(pointerEvent('pointerdown', { pointerId: 2, clientX: 100, clientY: 100 }));
    expect(input.activePointer).toBe(2);
    expect(events[3]?.phase).toBe('start');
    expect(events[3]?.pointerId).toBe(2);

    input.destroy();
    host.remove();
  });

  it('emits cancel on pointercancel and on lostpointercapture of the owner', () => {
    const host = makeHost();
    const events: GestureEvent[] = [];
    const input = new PointerInput(host, {
      toInternal: (x, y) => ({ x, y }),
      gesture: (e) => events.push(e),
      hover: vi.fn(),
      enabled: () => true,
    });

    // pointercancel
    host.dispatchEvent(pointerEvent('pointerdown', { pointerId: 7, clientX: 40, clientY: 40 }));
    host.dispatchEvent(pointerEvent('pointercancel', { pointerId: 7, clientX: 40, clientY: 40 }));
    expect(events.map((e) => e.phase)).toEqual(['start', 'cancel']);
    expect(input.activePointer).toBeNull();

    // lostpointercapture
    events.length = 0;
    host.dispatchEvent(pointerEvent('pointerdown', { pointerId: 8, clientX: 30, clientY: 30 }));
    host.dispatchEvent(pointerEvent('lostpointercapture', { pointerId: 8, clientX: 30, clientY: 30 }));
    expect(events.map((e) => e.phase)).toEqual(['start', 'cancel']);
    expect(input.activePointer).toBeNull();

    input.destroy();
    host.remove();
  });

  it('expands getCoalescedEvents, skips starts outside page, clamps out-of-page moves, and reports hover', () => {
    const host = makeHost();
    const events: GestureEvent[] = [];
    const hover = vi.fn();
    const input = new PointerInput(host, {
      toInternal: (x, y) => (x >= 0 && y >= 0 && x < 480 && y < 270 ? { x, y } : null),
      gesture: (e) => events.push(e),
      hover,
      enabled: () => true,
    });

    // Hover with no buttons
    host.dispatchEvent(pointerEvent('pointermove', { pointerId: 1, clientX: 120, clientY: 80, pointerType: 'mouse', buttons: 0 }));
    expect(hover).toHaveBeenLastCalledWith({ x: 120, y: 80 });
    host.dispatchEvent(pointerEvent('pointerleave', { pointerId: 1, clientX: 120, clientY: 80, pointerType: 'mouse', buttons: 0 }));
    expect(hover).toHaveBeenLastCalledWith(null);

    // Start outside page -> skipped
    host.dispatchEvent(pointerEvent('pointerdown', { pointerId: 3, clientX: -20, clientY: 50 }));
    expect(events).toHaveLength(0);
    expect(input.activePointer).toBeNull();

    // Start inside, coalesced moves including an out-of-bounds sample -> clamped inside [0, 480) x [0, 270)
    host.dispatchEvent(pointerEvent('pointerdown', { pointerId: 4, clientX: 10, clientY: 10 }));
    host.dispatchEvent(
      pointerEvent('pointermove', {
        pointerId: 4,
        clientX: 600,
        clientY: 300,
        coalesced: [
          { clientX: 100, clientY: 50 },
          { clientX: 600, clientY: 300 },
        ],
      }),
    );
    expect(events).toHaveLength(3);
    expect(events[1]).toMatchObject({ phase: 'move', x: 100, y: 50 });
    expect(events[2]!.x).toBeGreaterThanOrEqual(0);
    expect(events[2]!.x).toBeLessThan(480);
    expect(events[2]!.y).toBeGreaterThanOrEqual(0);
    expect(events[2]!.y).toBeLessThan(270);

    // contextmenu / dblclick / gesturestart / touchmove are prevented
    for (const type of ['contextmenu', 'dblclick', 'gesturestart', 'touchmove']) {
      const ev = new Event(type, { cancelable: true });
      host.dispatchEvent(ev);
      expect(ev.defaultPrevented).toBe(true);
    }

    input.destroy();
    host.remove();
  });

  it('normalizes zero touch/pen active pressure to 0.5 and clears hover on touch end/cancel', () => {
    const host = makeHost();
    const events: GestureEvent[] = [];
    const hover = vi.fn();
    const touchSensed = vi.fn();
    const input = new PointerInput(host, {
      toInternal: (x, y) => ({ x, y }),
      gesture: (e) => events.push(e),
      hover,
      enabled: () => true,
      touchSensed,
    });

    host.dispatchEvent(pointerEvent('pointerdown', { pointerId: 10, clientX: 40, clientY: 50, pointerType: 'touch', pressure: 0 }));
    host.dispatchEvent(pointerEvent('pointermove', { pointerId: 10, clientX: 60, clientY: 70, pointerType: 'touch', pressure: 0 }));
    host.dispatchEvent(pointerEvent('pointerup', { pointerId: 10, clientX: 65, clientY: 72, pointerType: 'touch', pressure: 0 }));

    expect(touchSensed).toHaveBeenCalled();
    expect(events.map((e) => [e.phase, e.pressure])).toEqual([
      ['start', 0.5],
      ['move', 0.5],
      ['end', 0],
    ]);
    expect(hover).toHaveBeenLastCalledWith(null);

    hover.mockClear();
    host.dispatchEvent(pointerEvent('pointerdown', { pointerId: 11, clientX: 80, clientY: 90, pointerType: 'touch', pressure: 0 }));
    host.dispatchEvent(pointerEvent('pointercancel', { pointerId: 11, clientX: 80, clientY: 90, pointerType: 'touch', pressure: 0 }));
    expect(hover).toHaveBeenLastCalledWith(null);

    input.destroy();
    host.remove();
  });

  it('lets a stylus (pen) preempt an active resting-palm touch, while ignoring a second finger touch', () => {
    const host = makeHost();
    const events: GestureEvent[] = [];
    const input = new PointerInput(host, {
      toInternal: (x, y) => ({ x, y }),
      gesture: (e) => events.push(e),
      hover: vi.fn(),
      enabled: () => true,
    });

    // Resting palm touches down first
    host.dispatchEvent(pointerEvent('pointerdown', { pointerId: 1, clientX: 20, clientY: 20, pointerType: 'touch' }));
    expect(input.activePointer).toBe(1);

    // Stylus touches down -> cancels palm and takes ownership
    host.dispatchEvent(pointerEvent('pointerdown', { pointerId: 2, clientX: 120, clientY: 80, pointerType: 'pen', pressure: 0.7 }));
    expect(input.activePointer).toBe(2);
    expect(events.map((e) => `${e.phase}:${e.pointerId}:${e.pointerType}`)).toEqual([
      'start:1:touch',
      'cancel:1:touch',
      'start:2:pen',
    ]);

    // Another finger touch while pen owns is ignored
    host.dispatchEvent(pointerEvent('pointerdown', { pointerId: 3, clientX: 200, clientY: 100, pointerType: 'touch' }));
    expect(input.activePointer).toBe(2);
    expect(events).toHaveLength(3);

    input.destroy();
    host.remove();
  });

  it('aborts an active gesture on window blur, orientationchange, and hidden visibilitychange', () => {
    const host = makeHost();
    const events: GestureEvent[] = [];
    const input = new PointerInput(host, {
      toInternal: (x, y) => ({ x, y }),
      gesture: (e) => events.push(e),
      hover: vi.fn(),
      enabled: () => true,
    });

    host.dispatchEvent(pointerEvent('pointerdown', { pointerId: 21, clientX: 50, clientY: 50, pointerType: 'touch' }));
    window.dispatchEvent(new Event('blur'));
    expect(input.activePointer).toBeNull();
    expect(events.map((e) => e.phase)).toEqual(['start', 'cancel']);

    events.length = 0;
    host.dispatchEvent(pointerEvent('pointerdown', { pointerId: 22, clientX: 50, clientY: 50, pointerType: 'touch' }));
    window.dispatchEvent(new Event('orientationchange'));
    expect(input.activePointer).toBeNull();
    expect(events.map((e) => e.phase)).toEqual(['start', 'cancel']);

    events.length = 0;
    const origVis = Object.getOwnPropertyDescriptor(document, 'visibilityState');
    Object.defineProperty(document, 'visibilityState', { value: 'hidden', configurable: true });
    try {
      host.dispatchEvent(pointerEvent('pointerdown', { pointerId: 23, clientX: 50, clientY: 50, pointerType: 'touch' }));
      document.dispatchEvent(new Event('visibilitychange'));
      expect(input.activePointer).toBeNull();
      expect(events.map((e) => e.phase)).toEqual(['start', 'cancel']);
    } finally {
      if (origVis) Object.defineProperty(document, 'visibilityState', origVis);
      else delete (document as unknown as { visibilityState?: string }).visibilityState;
    }

    input.destroy();
    host.remove();
  });

  it('detects horizontal touch swipes when swipeEnabled() is true, ignoring short taps and vertical drags', () => {
    const host = makeHost();
    const swipe = vi.fn();
    let allowSwipe = true;
    const input = new PointerInput(host, {
      toInternal: (x, y) => ({ x, y }),
      gesture: vi.fn(),
      hover: vi.fn(),
      enabled: () => true,
      swipe,
      swipeEnabled: () => allowSwipe,
    });

    // Swipe left -> next page (+1)
    host.dispatchEvent(pointerEvent('pointerdown', { pointerId: 30, clientX: 260, clientY: 120, pointerType: 'touch' }));
    host.dispatchEvent(pointerEvent('pointermove', { pointerId: 30, clientX: 180, clientY: 128, pointerType: 'touch' }));
    host.dispatchEvent(pointerEvent('pointerup', { pointerId: 30, clientX: 170, clientY: 128, pointerType: 'touch' }));
    expect(swipe).toHaveBeenLastCalledWith(1);

    // Swipe right -> prev page (-1)
    host.dispatchEvent(pointerEvent('pointerdown', { pointerId: 31, clientX: 140, clientY: 120, pointerType: 'touch' }));
    host.dispatchEvent(pointerEvent('pointerup', { pointerId: 31, clientX: 225, clientY: 114, pointerType: 'touch' }));
    expect(swipe).toHaveBeenLastCalledWith(-1);

    // Short tap -> no swipe
    swipe.mockClear();
    host.dispatchEvent(pointerEvent('pointerdown', { pointerId: 32, clientX: 120, clientY: 120, pointerType: 'touch' }));
    host.dispatchEvent(pointerEvent('pointerup', { pointerId: 32, clientX: 132, clientY: 124, pointerType: 'touch' }));
    expect(swipe).not.toHaveBeenCalled();

    // Vertical drag -> no swipe
    host.dispatchEvent(pointerEvent('pointerdown', { pointerId: 33, clientX: 120, clientY: 80, pointerType: 'touch' }));
    host.dispatchEvent(pointerEvent('pointerup', { pointerId: 33, clientX: 140, clientY: 180, pointerType: 'touch' }));
    expect(swipe).not.toHaveBeenCalled();

    // Disabled -> no swipe
    allowSwipe = false;
    host.dispatchEvent(pointerEvent('pointerdown', { pointerId: 34, clientX: 260, clientY: 120, pointerType: 'touch' }));
    host.dispatchEvent(pointerEvent('pointerup', { pointerId: 34, clientX: 160, clientY: 120, pointerType: 'touch' }));
    expect(swipe).not.toHaveBeenCalled();

    input.destroy();
    host.remove();
  });
});
