# Chroma Cosmos: Violet's Living Sketchbook

A cozy, zero-backend, Hi-Bit cosmic coloring book roguelike starring **Violet**, **Lumi** (starlight unicorn), and **Nova** (cosmic cheetah). Paint living sketchbook spreads with animated GLSL pigment shaders, awaken characters and interactive cosmic props, draft magical brushes and holographic sticker relics, and collect keepsake postcards — all offline-ready in the browser.

**Play Live:** https://krunked-fpv.github.io/chroma-cosmos/

---

## Highlights

- **8 Illustrated Cosmic Chapters**: *Rooftop Launch*, *Milkshake Nebula*, *Asteroid Garden*, *Cheetah Savannah*, *Saturn's Rings*, *Bubble Tea Moon*, *Star-Whale Sea*, and *Heart of the Universe* — woven into 5-chapter Star-Door voyages.
- **17 GLSL ES 3.00 Shader Mediums**: 7 starter crayons/paints plus 10 unlockable exotic mediums (including *Opal Unicorn Pearl*, *Neon Cyber-Cheetah*, *Strawberry Supernova Glaze*, *Crystal Glacier Mint*, *Cosmic Cotton-Candy Swirl*, *Enchanted Dragonfly Iridescence*, and *Royal Astral Velvet Gold*).
- **20 Astral Pencil Tin Run Upgrades**: 10 Active Magical Brushes (`Turbo Cheetah`, `Twin-Tail`, `Supernova Sponge`, `Zero-G Gel`, `Comet Meteor`, `Prism Roller`, `Starlight Bubble`, `Nebula Cloud Puff`, `Lightning Whisker`, `Moonbeam Quill`) and 10 Passive Holographic Sticker Relics (`Zoomie Paw`, `Prism Ribbon`, `UV Flashlight`, `Kaleido Sharpener`, `Sleepy Moon-Cat`, `Gravity Flip-Flop`, `Double Milkshake`, `Starlight Magnet`, `Chromatic Butterfly`, `Constellation Crown`).
- **14 Live Pixel-Art Wardrobe Charms**: Unlockable accessories for Violet, Lumi, and Nova that render directly onto live sprites in every chapter.
- **Forgiving, Cozy Coloring Flow**:
  - **Smart Touch-Lock** stays effortlessly inside the lines while live-actor pixel hit-testing and steady unawake poses keep small parts (tails, spots, manes, horns) easy to click and paint.
  - **Composite Hero Story Medallions** track 3–4 grouped story subjects per spread with **82% Composite Auto-Bloom** (74% with *Constellation Crown*) and a celebratory 2.8-second **Auto-Page-Turn Finale** (with a 1-tap **Stay & Doodle** pause toggle).
  - **Firefly Hint Lantern** + tap-any-medallion spotlight dim non-target paper and guide the Starlight Wisp directly to remaining uncolored parts.
  - **Pigment-Driven Causality**: Coloring clouds, planets, comets, and props awakens animated sky reactions, weather, and interactive pokes.
- **Reactive F-Lydian Synth & ASMR Foley**: Procedural Web Audio soundtrack, ascending Story Medallion chords, and per-medium brush textures — zero voice synthesis and zero external audio downloads.
- **Midnight Cloisonné UI & Offline PWA**: Hi-Bit integer-scaled pixel sprites, bundled `@fontsource` typography (`Fraunces`, `Quicksand`, `Patrick Hand`), downloadable PNG Keepsake Postcards, and a self-healing tri-tier save vault (`localStorage` + IndexedDB + compact signed shadow cookie).

---

## Quick Start

Requires **Node.js `>= 22`**.

```bash
# Install dependencies
npm ci

# Start local dev server
npm run dev
```

### Scripts

| Command | Description |
|---|---|
| `npm run dev` | Start Vite development server |
| `npm run typecheck` | Run strict TypeScript check (`tsc --noEmit`) |
| `npm test` | Run all Vitest unit & red-team suites |
| `npm run build` | Build production static bundle into `dist/` |
| `npm run preview` | Preview built `dist/` on port `4173` |
| `npm run e2e` | Run headed Chromium/Edge 6-state E2E suite against `dist/` |
| `npm run icons` | Regenerate deterministic PWA PNG icons in `public/` |

---

## Project Structure

```text
src/
  contracts/   Shared TypeScript interfaces & `as const` data catalogs
  art/         Procedural pixel-art sprites, region rasterizer & Hi-Bit UI atlas
  scenes/      8 cosmic chapter generators + composite Hero Story Quests
  renderer/    PixiJS v8 / WebGL2 4-layer GPU compositor & adaptive resolution
  shaders/     GLSL ES 3.00 fragment/vertex sources (15 pigment programs)
  simulation/  Smart Touch-Lock, live-actor hitboxes, Hero Quests, Finale & Hints
  roguelike/   5-chapter voyage loop, Star-Doors & Astral Pencil Tin drafting
  audio/       Procedural F-Lydian Web Audio synth & brush/item foley
  vault/       Tri-tier self-healing persistence (localStorage + IDB + cookie)
  export/      Keepsake PNG postcard & JSON archive exporter
  ui/          Midnight Cloisonné HUD, Stargazer Hub drawers & modals
  styles/      Offline Midnight Cloisonné stylesheet
  main.ts      Composition root & `?qa=1` debug bridge
public/        PWA manifest, Service Worker (`chroma-cosmos-v3`) & PNG icons
scripts/       Deterministic PWA icon generator
tests/         Vitest unit suites, red-team invariant gates & Playwright E2E
```

---

## Deployment

Pushes to `main` automatically run `npm run typecheck`, `npm test`, and `npm run build` via `.github/workflows/deploy-pages.yml` and deploy `dist/` to GitHub Pages using relative `./` paths.
