# Chroma Cosmos: Violet's Living Sketchbook

A cozy, zero-backend, Hi-Bit cosmic coloring book roguelike starring **Violet**, **Lumi** (starlight unicorn), and **Nova** (cosmic cheetah). Journey across **21 bespoke procedural universes** (**189 hand-crafted scenes**), paint living sketchbook spreads with animated GLSL pigment shaders, awaken interactive companions and props, draft magical brushes and holographic sticker relics, unlock new realms one voyage at a time, and collect keepsake postcards — all offline-ready in the browser.

**Play Live:** https://krunked-fpv.github.io/chroma-cosmos/

---

## Highlights

- **21 Bespoke Procedural Universes (189 Total Scenes)**:
  - **21 Cozy Hub Sanctuaries** + **168 Illustrated Chapters** (8 chapters per universe woven into 5-chapter branching Star-Door voyages, culminating in double-dense Slot-5 finales).
  - Begins in **#1 Violet's Starlight Cosmos** and sequentially unlocks **20 brand-new realms**: *Bubblegum Coral Kingdom*, *Sugar-Cloud Sky Bakery*, *Luminous Toadstool Glade*, *Origami Lantern Harbor*, *Rainbow Dino Greenhouse*, *Crystal Aurora Snowglobe*, *Clockwork Cloud Toyshop*, *Moonlit Sakura Koi Garden*, *Symphony Cloud Valley*, *Amethyst Geode Caverns*, *Starlight Dune Oasis*, *Infinite Storybook Library*, *Starlight Sky Carnival*, *Tiny Desk-Top Kingdom*, *Golden Maple Harvest*, *Sunbeam Butterfly Dome*, *Neon Rainbow Arcade*, *Cloud-Peak Dragon Sanctuary*, *Golden Lotus Star-Nile*, and the **#21 Grand Multiverse Nexus**.
  - **Main-Screen 21-Node Constellation Strip & Multiverse Atlas Drawer**: Track progress right from the Hub, preview locked worlds, switch live between unlocked sanctuaries, and celebrate every first-clear with a gilded **"NEW UNIVERSE UNLOCKED!"** Finale reveal (`+25` First-Clear Prism Crystals).
- **17 GLSL ES 3.00 Shader Mediums**: 7 starter crayons/paints plus 10 unlockable exotic mediums (including *Opal Unicorn Pearl*, *Neon Cyber-Cheetah*, *Strawberry Supernova Glaze*, *Crystal Glacier Mint*, *Cosmic Cotton-Candy Swirl*, *Enchanted Dragonfly Iridescence*, and *Royal Astral Velvet Gold*).
- **20 Astral Pencil Tin Run Upgrades**: 10 Active Magical Brushes (`Turbo Cheetah`, `Twin-Tail`, `Supernova Sponge`, `Zero-G Gel`, `Comet Meteor`, `Prism Roller`, `Starlight Bubble`, `Nebula Cloud Puff`, `Lightning Whisker`, `Moonbeam Quill`) and 10 Passive Holographic Sticker Relics (`Zoomie Paw`, `Prism Ribbon`, `UV Flashlight`, `Kaleido Sharpener`, `Sleepy Moon-Cat`, `Gravity Flip-Flop`, `Double Milkshake`, `Starlight Magnet`, `Chromatic Butterfly`, `Constellation Crown`).
- **14 Live Pixel-Art Wardrobe Charms**: Unlockable accessories for Violet, Lumi, and Nova that render directly onto live sprites in every chapter and sanctuary.
- **Forgiving, Cozy Coloring Flow**:
  - **Smart Touch-Lock** stays effortlessly inside the lines while live-actor pixel hit-testing and steady unawake poses keep small parts (tails, spots, manes, horns) easy to click and paint.
  - **36 Composite Hero Story Medallions** track 3–4 grouped story subjects per spread with **82% Composite Auto-Bloom** (74% with *Constellation Crown*) and a celebratory 2.8-second **Auto-Page-Turn Finale** (with a 1-tap **Stay & Doodle** pause toggle).
  - **Firefly Hint Lantern** + tap-any-medallion spotlight dim non-target paper and guide the Starlight Wisp directly to remaining uncolored parts.
  - **Pigment-Driven Causality & 13 Ambient Particle Moods**: Coloring clouds, planets, comets, and props awakens animated sky reactions, while each universe floats with bespoke ambient particles (*stardust*, *bubbles*, *sprinkles*, *fireflies*, *petals*, *leaves*, *snow*, *sparks*, *notes*, *shards*, *confetti*, *embers*, *prism*).
- **Universe-Adaptive F-Lydian Synth & ASMR Foley**: Procedural Web Audio soundtrack transposed per realm, celebratory multiverse unlock fanfare, ascending Story Medallion chords, and per-medium brush textures — zero voice synthesis and zero external audio downloads.
- **Midnight Cloisonné UI & Offline PWA**: 67 integer-scaled Hi-Bit pixel sprites, 21 bespoke Universe Portals, 168 illustrated Star-Doors, bundled `@fontsource` typography (`Fraunces`, `Quicksand`, `Patrick Hand`), downloadable PNG Keepsake Postcards, and a self-healing tri-tier save vault (`localStorage` + IndexedDB + compact signed shadow cookie).

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
| `npm test` | Run all Vitest unit, multiverse & red-team suites |
| `npm run build` | Build production static bundle into `dist/` |
| `npm run preview` | Preview built `dist/` on port `4173` |
| `npm run e2e` | Run headed Chromium/Edge 30-assertion E2E suite against `dist/` |
| `npm run icons` | Regenerate deterministic PWA PNG icons in `public/` |

---

## Project Structure

```text
src/
  contracts/   Shared TypeScript interfaces & `as const` data catalogs (incl. 21 universes)
  art/         Procedural pixel-art sprites, 67-sprite Hi-Bit UI atlas, 21 portals & 168 doors
  scenes/      189 scene generators (9 Starlight Cosmos + 62-landmark kit/ + 20 universes/ packs)
  renderer/    PixiJS v8 / WebGL2 4-layer GPU compositor, Hint Spotlight & 13 ambient moods
  shaders/     GLSL ES 3.00 fragment/vertex sources (15 pigment programs, 17 materials)
  simulation/  Smart Touch-Lock, live-actor hitboxes, Hero Quests, Finale & Hints
  roguelike/   21-universe 5-chapter voyage loop, Star-Doors & Astral Pencil Tin drafting
  audio/       Universe-adaptive F-Lydian Web Audio synth, unlock fanfare & brush/item foley
  vault/       Tri-tier self-healing persistence (localStorage + IDB + <1500-char shadow cookie)
  export/      Keepsake PNG postcard & JSON archive exporter
  ui/          Midnight Cloisonné HUD, 21-Universe Constellation Strip, Atlas Drawer & modals
  styles/      Offline Midnight Cloisonné stylesheet
  main.ts      Composition root & `?qa=1` debug bridge
public/        PWA manifest, Service Worker (`chroma-cosmos-v3`) & PNG icons
scripts/       Deterministic PWA icon generator
tests/         Vitest unit/multiverse suites, red-team invariant gates & Playwright E2E
```

---

## Deployment

Pushes to `main` automatically run `npm run typecheck`, `npm test`, and `npm run build` via `.github/workflows/deploy-pages.yml` and deploy `dist/` to GitHub Pages using relative `./` paths.
