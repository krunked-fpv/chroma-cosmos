// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createKeepsake } from '../../../src/export';
import { POSTCARD_H, POSTCARD_W, renderPostcard, savePng, saveText } from '../../../src/export/postcard';
import type { KeepsakeMeta } from '../../../src/contracts/vault';

const meta: KeepsakeMeta = { title: "Violet's Rooftop", galaxyName: 'The Glimmering Gumdrop Galaxy', chapterTitle: "Violet's Rooftop Launchpad", dateIso: '2026-11-24T10:00:00.000Z' };

interface Recorder {
  calls: Array<[string, ...unknown[]]>;
  props: Record<string, unknown>;
}

/** Minimal recording 2D context so layout code runs without a canvas implementation. */
function fakeCtx(): { ctx: CanvasRenderingContext2D; rec: Recorder } {
  const rec: Recorder = { calls: [], props: {} };
  const target: Record<string, unknown> = {};
  const ctx = new Proxy(target, {
    get(_t, k: string) {
      if (k === 'measureText') return (t: string) => ({ width: t.length * 10 });
      if (k === 'createLinearGradient') return () => ({ addColorStop: () => undefined });
      if (k in target) return target[k];
      return (...args: unknown[]) => void rec.calls.push([k, ...args]);
    },
    set(t, k: string, v) {
      t[k] = v;
      rec.props[k] = v;
      if (k === 'imageSmoothingEnabled') rec.calls.push(['set:imageSmoothingEnabled', v]);
      return true;
    },
  }) as unknown as CanvasRenderingContext2D;
  return { ctx, rec };
}

describe('keepsake postcard', () => {
  let rec: Recorder;
  beforeEach(() => {
    const f = fakeCtx();
    rec = f.rec;
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockImplementation(((type: string) => (type === '2d' ? f.ctx : null)) as never);
  });
  afterEach(() => vi.restoreAllMocks());

  it('returns a 1920x1080 canvas', () => {
    const page = document.createElement('canvas');
    page.width = 480;
    page.height = 270;
    const out = renderPostcard(page, meta);
    expect(out).toBeInstanceOf(HTMLCanvasElement);
    expect(out.width).toBe(1920);
    expect(out.height).toBe(1080);
    expect(POSTCARD_W).toBe(1920);
    expect(POSTCARD_H).toBe(1080);
    expect(out).not.toBe(page);
  });

  it('draws the page with image smoothing disabled and the lettering with system fonts', () => {
    const page = document.createElement('canvas');
    page.width = 480;
    page.height = 270;
    renderPostcard(page, meta);
    const order = rec.calls.map((c) => c[0]);
    const smoothOff = rec.calls.findIndex((c) => c[0] === 'set:imageSmoothingEnabled' && c[1] === false);
    const draw = order.indexOf('drawImage');
    expect(smoothOff).toBeGreaterThanOrEqual(0);
    expect(draw).toBeGreaterThan(smoothOff);
    const drawCall = rec.calls[draw]!;
    expect(drawCall[1]).toBe(page);
    expect(drawCall[4]).toBe(480 * 3); // integer 3x scale
    expect(drawCall[5]).toBe(270 * 3);
    const texts = rec.calls.filter((c) => c[0] === 'fillText').map((c) => c[1]);
    expect(texts).toContain(meta.title);
    expect(texts).toContain(meta.galaxyName);
    expect(texts).toContain(meta.chapterTitle);
    expect(texts.some((t) => typeof t === 'string' && t.includes('2026'))).toBe(true);
    expect(String(rec.props.font)).toMatch(/ui-rounded|Arial Rounded|system-ui/);
    expect(String(rec.props.font)).not.toMatch(/https?:|url\(/);
  });

  it('shrinks over-long text instead of overflowing', () => {
    const page = document.createElement('canvas');
    renderPostcard(page, { ...meta, galaxyName: 'x'.repeat(400) });
    expect(rec.calls.some((c) => c[0] === 'fillText' && c[1] === 'x'.repeat(400))).toBe(true);
  });

  it('renders Wanderlings cream-linen matte, gilded corner flourishes, and non-clipped header/footer bounds', () => {
    const page = document.createElement('canvas');
    page.width = 480;
    page.height = 270;
    renderPostcard(page, meta);

    // Gilded corner flourishes use smooth bezier & quadratic scroll curves
    expect(rec.calls.some((c) => c[0] === 'bezierCurveTo')).toBe(true);
    expect(rec.calls.some((c) => c[0] === 'quadraticCurveTo')).toBe(true);

    // Verify drawImage sits centered at 3x scale inside the matte margins
    const drawCall = rec.calls.find((c) => c[0] === 'drawImage')!;
    const pageX = drawCall[2] as number;
    const pageY = drawCall[3] as number;
    const pageW = drawCall[4] as number;
    const pageH = drawCall[5] as number;
    expect(pageX).toBe((POSTCARD_W - pageW) / 2);
    expect(pageY).toBeGreaterThanOrEqual(140);
    expect(pageY + pageH).toBeLessThanOrEqual(POSTCARD_H - 110);

    // Every fillText call stays strictly clear of outer gilt frame and artwork opening, with clamped maxWidth
    const textCalls = rec.calls.filter((c) => c[0] === 'fillText');
    expect(textCalls.length).toBeGreaterThanOrEqual(4);
    for (const [, text, x, y, maxW] of textCalls) {
      expect(typeof text).toBe('string');
      expect(x).toBe(POSTCARD_W / 2);
      expect(typeof maxW).toBe('number');
      expect(maxW as number).toBeGreaterThan(0);
      expect(maxW as number).toBeLessThanOrEqual(pageW);
      const yNum = y as number;
      const inHeader = yNum >= 60 && yNum <= pageY - 16;
      const inFooter = yNum >= pageY + pageH + 30 && yNum <= POSTCARD_H - 36;
      expect(inHeader || inFooter).toBe(true);
    }
  });

  it('is exposed through createKeepsake()', () => {
    const k = createKeepsake();
    expect(typeof k.renderPostcard).toBe('function');
    expect(typeof k.savePng).toBe('function');
    expect(typeof k.saveText).toBe('function');
    expect(k.renderPostcard(document.createElement('canvas'), meta).width).toBe(1920);
  });
});

describe('keepsake without canvas support (plain jsdom)', () => {
  it('still returns a 1920x1080 canvas when getContext is unavailable', () => {
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(null);
    const out = renderPostcard(document.createElement('canvas'), meta);
    expect(out.width).toBe(1920);
    expect(out.height).toBe(1080);
    vi.restoreAllMocks();
  });
});

describe('download helpers', () => {
  let created: string[];
  let revoked: string[];
  let clicks: Array<{ href: string; download: string }>;
  beforeEach(() => {
    created = [];
    revoked = [];
    clicks = [];
    let n = 0;
    (URL as unknown as { createObjectURL: (b: Blob) => string }).createObjectURL = vi.fn((_b: Blob) => {
      const u = `blob:test/${++n}`;
      created.push(u);
      return u;
    });
    (URL as unknown as { revokeObjectURL: (u: string) => void }).revokeObjectURL = vi.fn((u: string) => void revoked.push(u));
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function (this: HTMLAnchorElement) {
      clicks.push({ href: this.href, download: this.download });
      expect(document.body.contains(this)).toBe(true); // attached while clicking
    });
  });
  afterEach(() => {
    vi.restoreAllMocks();
    delete (URL as unknown as Record<string, unknown>).createObjectURL;
    delete (URL as unknown as Record<string, unknown>).revokeObjectURL;
  });

  it('savePng converts with toBlob(image/png), downloads via an anchor, revokes the URL and resolves the Blob', async () => {
    const blob = new Blob([new Uint8Array([137, 80, 78, 71])], { type: 'image/png' });
    const canvas = document.createElement('canvas');
    const toBlob = vi.fn((cb: BlobCallback, type?: string) => {
      expect(type).toBe('image/png');
      cb(blob);
    });
    canvas.toBlob = toBlob as never;
    const out = await savePng(canvas, 'violet.png');
    expect(out).toBe(blob);
    expect(toBlob).toHaveBeenCalledTimes(1);
    expect(created).toHaveLength(1);
    expect(clicks).toEqual([{ href: created[0], download: 'violet.png' }]);
    expect(revoked).toEqual(created);
    expect(document.querySelectorAll('a[download]')).toHaveLength(0); // temporary anchor removed
  });

  it('savePng rejects when the canvas yields no blob, without creating URLs', async () => {
    const canvas = document.createElement('canvas');
    canvas.toBlob = ((cb: BlobCallback) => cb(null)) as never;
    await expect(savePng(canvas, 'x.png')).rejects.toThrow(/PNG/);
    expect(created).toHaveLength(0);
  });

  it('saveText downloads a Blob of the given mime and revokes the URL', async () => {
    let seen: Blob | undefined;
    (URL.createObjectURL as unknown as ReturnType<typeof vi.fn>).mockImplementation((b: Blob) => {
      seen = b;
      created.push('blob:text/1');
      return 'blob:text/1';
    });
    saveText('{"a":1}', 'vault.json', 'application/json');
    expect(seen).toBeInstanceOf(Blob);
    expect(seen!.type).toBe('application/json');
    expect(await seen!.text()).toBe('{"a":1}');
    expect(clicks).toEqual([{ href: 'blob:text/1', download: 'vault.json' }]);
    expect(revoked).toEqual(['blob:text/1']);
  });

  it('revokes the object URL even if the click throws', () => {
    (HTMLAnchorElement.prototype.click as unknown as ReturnType<typeof vi.fn>).mockImplementation(() => {
      throw new Error('blocked');
    });
    expect(() => saveText('x', 'a.txt', 'text/plain')).toThrow('blocked');
    expect(revoked).toEqual(created);
    expect(created).toHaveLength(1);
  });
});

describe('environments without a DOM', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('saveText is a no-op, savePng rejects and renderPostcard throws a clear error', async () => {
    vi.stubGlobal('document', undefined);
    expect(() => saveText('x', 'a.txt', 'text/plain')).not.toThrow();
    await expect(savePng({} as HTMLCanvasElement, 'a.png')).rejects.toThrow(/browser/);
    expect(() => renderPostcard({} as HTMLCanvasElement, meta)).toThrow(/DOM/);
  });
});
