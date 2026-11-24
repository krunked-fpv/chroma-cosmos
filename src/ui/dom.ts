/** Tiny DOM helpers (no framework, zero inline SVG icon hacks). */

export type Attrs = Record<string, string | number | boolean | undefined | null>;

/** Create an element with attributes and children. `class` maps to className; booleans toggle attributes. */
export function h<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  attrs: Attrs = {},
  ...children: Array<Node | string | null | undefined | false>
): HTMLElementTagNameMap[K] {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (v === undefined || v === null || v === false) continue;
    if (k === 'class') el.className = String(v);
    else if (v === true) el.setAttribute(k, '');
    else el.setAttribute(k, String(v));
  }
  for (const c of children) {
    if (c === null || c === undefined || c === false) continue;
    el.append(typeof c === 'string' ? document.createTextNode(c) : c);
  }
  return el;
}

/** A kid-friendly interactive button. Every interactive control uses `.cc-btn` (>= 56px hit target). */
export function button(cls: string, label: string, onTap: () => void, inner?: Node | string): HTMLButtonElement {
  const b = h('button', { class: `cc-btn ${cls}`, type: 'button', 'aria-label': label, title: label });
  if (inner !== undefined) b.append(typeof inner === 'string' ? document.createTextNode(inner) : inner);
  b.addEventListener('click', (e) => {
    e.preventDefault();
    if (b.disabled) return;
    onTap();
  });
  return b;
}

/** Create a sprite icon container that hosts a crisp integer-scaled Hi-Bit pixel canvas. */
export function spriteBox(cls = 'cc-ico', initial?: HTMLCanvasElement): HTMLSpanElement {
  const s = h('span', { class: cls, 'aria-hidden': 'true' });
  if (initial) s.append(initial);
  return s;
}

export function setShown(el: HTMLElement, shown: boolean): void {
  if (shown) el.removeAttribute('hidden');
  else el.setAttribute('hidden', '');
}

export function clear(el: HTMLElement): void {
  while (el.firstChild) el.removeChild(el.firstChild);
}

/** Seeded 32-bit FNV-1a hash (used to derive stable cover seeds from book ids). */
export function fnv1a(s: string): number {
  let x = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    x ^= s.charCodeAt(i);
    x = Math.imul(x, 0x01000193) >>> 0;
  }
  return x >>> 0;
}
