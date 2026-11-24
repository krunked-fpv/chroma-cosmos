/**
 * PWA install star-charm controller.
 * Shown only after `beforeinstallprompt` (default prevented, event stashed) and only when not running standalone.
 * Tap -> deferred.prompt(); dismiss -> hide; `appinstalled` -> hide.
 */

export interface DeferredInstallPrompt extends Event {
  prompt(): Promise<void> | void;
  userChoice?: Promise<{ outcome: 'accepted' | 'dismissed'; platform?: string }>;
}

export function isStandalone(win: Window = window): boolean {
  try {
    if (typeof win.matchMedia === 'function' && win.matchMedia('(display-mode: standalone)').matches) return true;
  } catch {
    /* ignore */
  }
  return (win.navigator as Navigator & { standalone?: boolean }).standalone === true;
}

export class InstallController {
  private deferred: DeferredInstallPrompt | null = null;
  private dismissed = false;
  private installed = false;
  private readonly listeners = new Set<(visible: boolean) => void>();
  private readonly win: Window;
  private readonly onBip = (e: Event): void => {
    e.preventDefault();
    if (isStandalone(this.win)) return;
    this.deferred = e as DeferredInstallPrompt;
    this.notify();
  };
  private readonly onInstalled = (): void => {
    this.installed = true;
    this.deferred = null;
    this.notify();
  };

  constructor(win: Window = window) {
    this.win = win;
    win.addEventListener('beforeinstallprompt', this.onBip);
    win.addEventListener('appinstalled', this.onInstalled);
  }

  get visible(): boolean {
    return this.deferred !== null && !this.dismissed && !this.installed && !isStandalone(this.win);
  }

  onChange(fn: (visible: boolean) => void): () => void {
    this.listeners.add(fn);
    fn(this.visible);
    return () => {
      this.listeners.delete(fn);
    };
  }

  async install(): Promise<void> {
    const d = this.deferred;
    if (!d) return;
    // A deferred prompt can be used once; hide immediately.
    this.deferred = null;
    this.notify();
    try {
      await d.prompt();
      if (d.userChoice) await d.userChoice;
    } catch {
      /* user agent refused */
    }
  }

  dismiss(): void {
    this.dismissed = true;
    this.notify();
  }

  destroy(): void {
    this.win.removeEventListener('beforeinstallprompt', this.onBip);
    this.win.removeEventListener('appinstalled', this.onInstalled);
    this.listeners.clear();
  }

  private notify(): void {
    const v = this.visible;
    for (const fn of this.listeners) fn(v);
  }
}
