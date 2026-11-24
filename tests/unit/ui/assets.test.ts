// @vitest-environment node
import { readdirSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const ROOT = resolve(process.cwd());
const html = readFileSync(resolve(ROOT, 'index.html'), 'utf8');
const css = readFileSync(resolve(ROOT, 'src/styles/main.css'), 'utf8');

const BANNED_LUNCH_TRAY_HEXES = [
  '#8b5a2b',
  '#6b4423',
  '#a0522d',
  '#d2b48c',
  '#684028',
  '#4d2c1c',
  '#8c5736',
  '#603721',
  '#865132',
  '#5e341d',
  '#744428',
  '#522e1a',
  '#623922',
  '#442415',
  '#a66c43',
  '#6f4024',
  '#915937',
  '#683b21',
  '#56311c',
  '#6b4730',
];

describe('index.html Midnight Cloisonne PWA & sketchbook shell requirements', () => {
  it('declares relative manifest, icons, #0d1026 theme-color, and locked viewport meta', () => {
    expect(html).toContain('<meta charset="UTF-8"');
    expect(html).toContain(
      '<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover, user-scalable=no"',
    );
    expect(html).toContain('<meta name="theme-color" content="#0d1026"');
    expect(html).toContain('background: #0d1026;');
    expect(html).toContain('<meta name="apple-mobile-web-app-capable" content="yes"');
    expect(html).toContain('<link rel="manifest" href="./manifest.json"');
    expect(html).toContain('<link rel="apple-touch-icon" href="./apple-touch-icon.png"');
    expect(html).toContain('<link rel="icon" href="./icon-192.png"');
    expect(html).toContain("<title>Chroma Cosmos: Violet's Living Sketchbook</title>");
    expect(html).toContain('<div id="app"></div>');
    expect(html).toContain('<script type="module" src="./src/main.ts"></script>');
  });

  it('loads zero external fonts or CDN URLs', () => {
    expect(html).not.toMatch(/https?:\/\//i);
    expect(css).not.toMatch(/https?:\/\//i);
    expect(css).not.toMatch(/@import\b/i);
  });
});

describe('src/styles/main.css Midnight Cloisonne anti-lunch-tray & accessibility mandates', () => {
  it('enforces >= 56px hit targets on interactive buttons', () => {
    const hitMatch = css.match(/--hit:\s*(\d+)px\s*;/);
    expect(hitMatch).not.toBeNull();
    expect(Number(hitMatch![1])).toBeGreaterThanOrEqual(56);

    const btnBlock = css.match(/\.cc-btn\s*\{([^}]+)\}/);
    expect(btnBlock).not.toBeNull();
    expect(btnBlock![1]).toMatch(/min-width:\s*var\(--hit\)/);
    expect(btnBlock![1]).toMatch(/min-height:\s*var\(--hit\)/);
  });

  it('enforces Midnight Cloisonne palette with ZERO muddy brown lunch-tray hexes and ZERO dashed CSS borders', () => {
    const lower = css.toLowerCase();
    // Mandatory palette anchors
    expect(lower).toContain('#0d1026');
    expect(lower).toContain('#1a1436');
    expect(lower).toContain('#faf6ec');
    expect(lower).toContain('#eac46f');
    expect(lower).toContain('rgba(19, 16, 42, 0.86)');
    expect(lower).toContain('backdrop-filter: blur(12px)');
    expect(lower).toContain('conic-gradient(#eac46f calc(var(--prog, 0) * 1turn)');

    // Strict Anti-Lunch-Tray bans: zero brown/tan/khaki/walnut hexes & zero dashed borders
    for (const hex of BANNED_LUNCH_TRAY_HEXES) {
      expect(lower).not.toContain(hex);
    }
    expect(lower).not.toMatch(/--walnut|--ink-sepia/);
    expect(lower).not.toMatch(/border(?:-[a-z]+)?\s*:[^;]*\bdashed\b/);
    expect(lower).not.toMatch(/\bdashed\b/);
  });

  it('locks viewport touch/scroll/selection, keeps open sketchbook clean, and respects prefers-reduced-motion', () => {
    expect(css).toContain('touch-action: none;');
    expect(css).toContain('user-select: none;');
    expect(css).toContain('-webkit-user-select: none;');
    expect(css).toContain('overscroll-behavior: none;');
    expect(css).toContain('-webkit-touch-callout: none;');
    expect(css).toContain('100dvh');
    expect(css).toContain('100dvw');
    expect(css).toContain('image-rendering: pixelated;');
    expect(css).toMatch(/@media\s*\(prefers-reduced-motion:\s*reduce\)/);
    expect(css).not.toMatch(/\.cc-rail\b/);
  });

  it('imports offline @fontsource Fraunces, Quicksand, and Patrick Hand in src/ui/index.ts before main.css', () => {
    const uiIndex = readFileSync(resolve(ROOT, 'src/ui/index.ts'), 'utf8');
    expect(uiIndex).toContain("import '@fontsource/fraunces/latin-600.css';");
    expect(uiIndex).toContain("import '@fontsource/fraunces/latin-700.css';");
    expect(uiIndex).toContain("import '@fontsource/fraunces/latin-700-italic.css';");
    expect(uiIndex).toContain("import '@fontsource/quicksand/latin-600.css';");
    expect(uiIndex).toContain("import '@fontsource/quicksand/latin-700.css';");
    expect(uiIndex).toContain("import '@fontsource/patrick-hand/latin-400.css';");
    expect(uiIndex.indexOf('@fontsource/patrick-hand/latin-400.css')).toBeLessThan(
      uiIndex.indexOf("import '../styles/main.css'"),
    );

    expect(css).toContain("--font-display: 'Fraunces', Georgia, serif;");
    expect(css).toContain("--font-hand: 'Patrick Hand', cursive, sans-serif;");
    expect(css).toContain("--font-ui: 'Quicksand', ui-rounded, system-ui, sans-serif;");
    const frameBlock = css.match(/\.cc-frame\s*\{([^}]+)\}/);
    expect(frameBlock).not.toBeNull();
    expect(frameBlock![1]).toContain('background: var(--paper);');
    expect(frameBlock![1]).toContain('box-shadow: none;');
    expect(css).toMatch(/\.cc-root\[data-mode="hub"\]\s+\.cc-audio[\s\S]*?display:\s*none;/);
  });

  it('contains strictly ZERO inline <svg><path> tool icons and ZERO speechSynthesis anywhere in src/ui/**', () => {
    const uiDir = resolve(ROOT, 'src/ui');
    const files = readdirSync(uiDir).filter((f) => f.endsWith('.ts'));
    expect(files.length).toBeGreaterThan(0);
    for (const file of files) {
      const src = readFileSync(resolve(uiDir, file), 'utf8');
      expect(src).not.toMatch(/speechSynthesis|SpeechSynthesisUtterance/i);
      expect(src).not.toMatch(/<svg[\s>]/i);
    }
  });
});
