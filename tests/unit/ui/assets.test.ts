// @vitest-environment node
import { readdirSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const ROOT = resolve(process.cwd());
const html = readFileSync(resolve(ROOT, 'index.html'), 'utf8');
const css = readFileSync(resolve(ROOT, 'src/styles/main.css'), 'utf8');

describe('index.html PWA & sketchbook shell requirements', () => {
  it('declares relative manifest, apple-touch-icon, favicon, theme-color, and locked viewport meta', () => {
    expect(html).toContain('<meta charset="UTF-8"');
    expect(html).toContain(
      '<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover, user-scalable=no"',
    );
    expect(html).toContain('<meta name="theme-color" content="#120d2b"');
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
    // Strip standard SVG XML namespace inside inline data URIs, then ensure no remote URLs or @import exist
    const cssWithoutSvgNs = css.replace(/http:\/\/www\.w3\.org\/2000\/svg/g, '');
    expect(cssWithoutSvgNs).not.toMatch(/https?:\/\//i);
    expect(css).not.toMatch(/@import\b/i);
  });
});

describe('src/styles/main.css hit-target, touch-lock, and accessibility assertions', () => {
  it('enforces >= 56px hit targets on interactive buttons', () => {
    const hitMatch = css.match(/--hit:\s*(\d+)px\s*;/);
    expect(hitMatch).not.toBeNull();
    expect(Number(hitMatch![1])).toBeGreaterThanOrEqual(56);

    const btnBlock = css.match(/\.cc-btn\s*\{([^}]+)\}/);
    expect(btnBlock).not.toBeNull();
    expect(btnBlock![1]).toMatch(/min-width:\s*var\(--hit\)/);
    expect(btnBlock![1]).toMatch(/min-height:\s*var\(--hit\)/);
  });

  it('locks viewport touch/scroll/selection, keeps open sketchbook free of side rails, and respects prefers-reduced-motion', () => {
    expect(css).toContain('touch-action: none;');
    expect(css).toContain('user-select: none;');
    expect(css).toContain('-webkit-user-select: none;');
    expect(css).toContain('overscroll-behavior: none;');
    expect(css).toContain('-webkit-touch-callout: none;');
    expect(css).toContain('100dvh');
    expect(css).toContain('100dvw');
    expect(css).toContain('image-rendering: pixelated;');
    expect(css).toMatch(/@media\s*\(prefers-reduced-motion:\s*reduce\)/);
    // Anti-clutter guardrail: zero side rails squeezing the sketchbook spread
    expect(css).not.toMatch(/\.cc-rail\b/);
  });

  it('imports offline @fontsource Fraunces, Quicksand, and Patrick Hand in src/ui/index.ts and defines purposeful font variables in CSS', () => {
    const uiIndex = readFileSync(resolve(ROOT, 'src/ui/index.ts'), 'utf8');
    expect(uiIndex).toContain("import '@fontsource/fraunces/latin-600.css';");
    expect(uiIndex).toContain("import '@fontsource/fraunces/latin-700.css';");
    expect(uiIndex).toContain("import '@fontsource/fraunces/latin-700-italic.css';");
    expect(uiIndex).toContain("import '@fontsource/quicksand/latin-600.css';");
    expect(uiIndex).toContain("import '@fontsource/quicksand/latin-700.css';");
    expect(uiIndex).toContain("import '@fontsource/patrick-hand/latin-400.css';");
    expect(uiIndex.indexOf("@fontsource/patrick-hand/latin-400.css")).toBeLessThan(
      uiIndex.indexOf("import '../styles/main.css'"),
    );

    expect(css).toContain("--font-display: 'Fraunces', Georgia, serif;");
    expect(css).toContain("--font-hand: 'Patrick Hand', cursive, sans-serif;");
    expect(css).toContain("--font-ui: 'Quicksand', ui-rounded, system-ui, sans-serif;");
    // Seamless cotton sketchbook frame & zero duplicate Hub bell
    const frameBlock = css.match(/\.cc-frame\s*\{([^}]+)\}/);
    expect(frameBlock).not.toBeNull();
    expect(frameBlock![1]).toContain('background: var(--paper);');
    expect(frameBlock![1]).toContain('box-shadow: none;');
    expect(css).toMatch(/\.cc-root\[data-mode="hub"\]\s+\.cc-audio[\s\S]*?display:\s*none;/);
  });

  it('contains strictly zero occurrences of speechSynthesis anywhere in src/ui/**', () => {
    const uiDir = resolve(ROOT, 'src/ui');
    const files = readdirSync(uiDir).filter((f) => f.endsWith('.ts'));
    expect(files.length).toBeGreaterThan(0);
    for (const file of files) {
      const src = readFileSync(resolve(uiDir, file), 'utf8');
      expect(src).not.toMatch(/speechSynthesis|SpeechSynthesisUtterance/i);
    }
  });
});
