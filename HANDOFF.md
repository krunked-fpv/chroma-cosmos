# HANDOFF — Chroma Cosmos Sprint 1

## 1. Features Completed & Verified
- **4-Layer Hi-Bit WebGL2 Pipeline (`src/renderer/`, `src/shaders/`)**: PixiJS v8 compositor on a 480×270 NEAREST region grid with native-DPI GLSL ES 3.00 shaders, ping-pong stroke RenderTextures, 12 materials across 10 GLSL programs, sel-out outlines, vacated-actor stroke suppression, hidden ghost ink masking, 3-plane parallax space, Sleepy Hush mist, pixel particles, pooled RTs, context-loss restore, and cylinder page-turn curl.
- **Procedural Pixel-Art & Chapters (`src/art/`, `src/scenes/`)**: Hand-authored ASCII sprites (Violet, Lumi, Nova, moon-cat, comet, whale, gazelle, comet-car, flower, gem), 6 wardrobe overlays, 7 illustration kinds, and 9 deterministic scenes (8 chapters + pre-colored Stargazer Bedroom Hub).
- **Cozy Simulation & Roguelike (`src/simulation/`, `src/roguelike/`)**: O(1) incremental coverage, Smart Touch-Lock with ink-snap, 4-stage awakening + 93% Auto-Bloom, 5 Pigment-Driven Causality reactions (`rainbowSlide`, `starlightFlowerRain`, `zeroGTrampoline`, `cheetahRacetrack`, `discoMirage`), autonomous Lumi/Nova/Violet steering + pokes, 4 brushes, 4 relics, 5-chapter branching run, Star-Doors, and Astral Pencil Tin drafting.
- **Audio, Vault & PWA (`src/audio/`, `src/vault/`, `src/export/`, `src/ui/`, `public/`)**: Pure F-Lydian Web Audio synth + ASMR brush voices + 96-BPM stems + soft limiter; tri-tier vault (`localStorage`, IndexedDB `chroma-cosmos-db`, signed `krunked-cookie-vault-v1` cookie <1500 chars) + JSON export/import + 1920×1080 PNG keepsakes; sketchbook UI; binary-verified PNG icons, `./`-scoped manifest + network-first `sw.js` (`chroma-cosmos-v1`), and GitHub Pages CI.
- **Verification**: `tsc --noEmit` (0 errors), 23 Vitest suites / 430 tests green (10k-scrub fuzz, RT/audio leak stress, vault eviction matrix, PNG binary checks), and headed Chrome E2E on `/chroma-cosmos/?qa=1` (0 console/page/network errors, `6.9 ms` median / `144.9 fps`, vault self-healing & SW scope verified).

## 2. Active Technical Debt & Edge Cases
- Compact shadow cookie omits `donePages` pixel snapshots and `stats.pokes`; wiping IndexedDB mid-run heals progression, gems, badges, wardrobe, and run path, not earlier pixel buffers.
- Browser webview sandboxes block `page.evaluate`; JS telemetry relies on headed `playwright-core` E2E.
- Main JS chunk is ~578 kB uncompressed (~181 kB gzip); total `dist/` stays well under 5 MB.

## 3. Environment & Dependency Baseline
- Node `>=22` (`v22.14.0`), `pixi.js ^8.23.0`, `typescript ^5.9.3` (strict + `noUncheckedIndexedAccess`), `vite ^6.4.6`, `vitest ^3.2.7`, `playwright-core`, `fake-indexeddb`, `jsdom`.

## 4. Next Priorities (Sprint 2)
1. Push `main` to GitHub, enable **GitHub Actions** in Pages settings, and verify mobile tablet installability.
2. Add optional PixiJS chunk splitting (`manualChunks`) and golden-image visual diffs across Chapters 2–5.
3. Expand Sprint 2 chapters, sticker packs, and tablet stylus tilt/pressure curves.
