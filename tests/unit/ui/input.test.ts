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

    // contextmenu / dblclick / gesturestart are prevented
    for (const type of ['contextmenu', 'dblclick', 'gesturestart']) {
      const ev = new Event(type, { cancelable: true });
      host.dispatchEvent(ev);
      expect(ev.defaultPrevented).toBe(true);
    }

    input.destroy();
    host.remove();
  });
});
