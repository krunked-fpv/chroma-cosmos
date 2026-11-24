/**
 * Deterministic 2.8-second Automatic Page Awakened Finale & Auto-Page-Turn controller.
 * Driven strictly by update(dtMs); zero timers.
 */
import { PAGE_FINALE_MS } from '../contracts';
import type { PageFinaleController, PageFinaleState } from '../contracts';
import { clamp } from './util';

class FinaleControllerImpl implements PageFinaleController {
  private active = false;
  private remainingMs: number;
  private readonly durationMs: number;
  private stayAndDoodle = false;
  private autoTurnTriggered = false;

  constructor(durationMs = PAGE_FINALE_MS) {
    this.durationMs = Math.max(0, Number.isFinite(durationMs) ? durationMs : PAGE_FINALE_MS);
    this.remainingMs = this.durationMs;
  }

  get state(): PageFinaleState {
    const progress =
      this.active && this.durationMs > 0
        ? clamp(1 - this.remainingMs / this.durationMs, 0, 1)
        : this.active
          ? 1
          : 0;
    return {
      active: this.active,
      remainingMs: this.remainingMs,
      durationMs: this.durationMs,
      progress,
      stayAndDoodle: this.stayAndDoodle,
      autoTurnTriggered: this.autoTurnTriggered,
    };
  }

  start(): void {
    this.active = true;
    this.remainingMs = this.durationMs;
    this.stayAndDoodle = false;
    this.autoTurnTriggered = false;
  }

  reset(): void {
    this.active = false;
    this.remainingMs = this.durationMs;
    this.stayAndDoodle = false;
    this.autoTurnTriggered = false;
  }

  setStayAndDoodle(stay: boolean): void {
    this.stayAndDoodle = Boolean(stay);
  }

  triggerNow(): void {
    if (!this.active) return;
    this.remainingMs = 0;
    this.autoTurnTriggered = true;
  }

  update(dtMs: number): boolean {
    if (!this.active || this.stayAndDoodle || this.autoTurnTriggered) return false;
    const dt = Math.max(0, Number.isFinite(dtMs) ? dtMs : 0);
    if (dt === 0 && this.remainingMs > 0) return false;
    this.remainingMs = Math.max(0, this.remainingMs - dt);
    if (this.remainingMs <= 0) {
      this.autoTurnTriggered = true;
      return true;
    }
    return false;
  }
}

export function createPageFinaleController(durationMs = PAGE_FINALE_MS): PageFinaleController {
  return new FinaleControllerImpl(durationMs);
}
