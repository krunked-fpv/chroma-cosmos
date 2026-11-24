# ARCHITECTURE — Chroma Cosmos: Violet's Living Sketchbook

Zero-backend PWA. Static build (`vite build`, `base: './'`) deployed to GitHub Pages at
`https://krunked-fpv.github.io/chroma-cosmos/`. All state is client-side.

## 1. Module map and dependency rule

```
src/contracts/   types + `as const` data only (no logic, no imports outside contracts)
src/art/         ArtPort        procedural pixel-art, region rasterizer, Hi-Bit UI sprite atlas
src/scenes/      scene generators + composite HeroStoryQuest definitions used by src/art
src/renderer/    RendererPort   PixiJS v8 / WebGL2 4-layer compositor + Hint Spotlight pass
src/shaders/     GLSL ES 3.00 sources as TS string modules (15 pigment programs)
src/simulation/  SimulationPort HeroStoryQuest 82% bloom, PageFinaleController, Hint system, 20-item toybox
src/roguelike/   RunManagerPort 5-chapter run, doors, 20-card Astral Pencil Tin drafting
src/audio/       AudioPort      Web Audio synth (F-Lydian), ascending medallion cadence, ASMR foley
src/vault/       VaultPort      localStorage + IndexedDB + shadow cookie (Sprint 1 -> 2 lossless migration)
src/export/      KeepsakePort   PNG postcard + JSON download
src/ui/          UiPort         Midnight Cloisonne DOM chrome, Hi-Bit pixel HUD, Stargazer Hub, modals
src/main.ts      composition root (only file that imports module factories)
```

Rule: every `src/<module>/` imports ONLY from `src/contracts/` and its own directory. `src/main.ts` is the only
place that wires modules together, strictly via the interfaces in `src/contracts/`. No circular dependencies.

Factories: `createArt`, `createRenderer`, `createSimulation`, `createRunManager`, `createAudio`,
`createVault(backends?)`, `createKeepsake`, `createUi(root)`.

## 2. Four-layer GPU compositing topology

PixiJS v8 `Application`: `preference:'webgl'`, `preferWebGLVersion:2`, `antialias:false`, `autoDensity:true`,
`resolution = min(devicePixelRatio, 2)` (adaptive downshift to 1.5 / 1 when median frame > 18 ms for 2 s),
background `#faf6ec` (warm ivory cotton sketchbook paper). If WebGL2 is unavailable a friendly DOM message is shown.

Canvas sizing: canvas fills `ui.canvasHost` (16:9). `s = floor(min(hostW*dpr/480, hostH*dpr/270))`;
if `s >= 2` use an exact integer scale centred, else a fractional aspect-locked scale. Out-of-page pixels render
warm cotton paper (`#faf6ec`) framed by a crisp 1 px `#231942` + 1 px burnished gold `#eac46f` hairline (`uClean=1` keepsake capture
uses exact 480×270 bounds). All pixel-art lookups use NEAREST + `texelFetch`.

### Data textures (`BufferImageSource`, `format:'rgba8unorm'`, `scaleMode:'nearest'`, `alphaMode:'no-premultiply-alpha'`)
| Texture | Size | Contents |
|---|---|---|
| `uRegionTex` | 480×270 | R regionMap id, G baseRegionMap id, B actorSlot (0..15), A 255. Uploaded once per page. |
| `uActorTex` | 480×270 | R region id (0 ink, 200..233 system/FX/Wisp/Wonder-Chalk), G FX variant, A 255/0. CPU-blitted each frame. |
| `uRegionStateTex` | 256×2 | bytes straight from `SimView.regionState` (including bit 7 `FLAG_SPOTLIGHT = 128`). |
| `uAllowedTex` | 256×1 | 1 = region id allowed for current stamp batch. |
| `uPalTex` | 8×32 | RGBA8 material palette table (`texelFetch` indexed by materialId `1..17` & stop). |
| `uStrokeTex` | 1920×1080 ×2 | ping-pong RenderTextures, RGBA8 LINEAR: R coverage, G materialId/255, B/A flow dx/dy. |

### Layers (single-exit composite pass at native resolution)
- **Layer 0 — Paper, Hint Spotlight Dimming & Parallax Space.** Uncolored paper (`#faf6ec`) shows subtle cotton tooth.
  When `uHintDim > 0` (`HintRequestState.active`), non-target uncolored paper softly dims by 12% while every region with
  `FLAG_SPOTLIGHT` illuminates with a warm breathing golden-aurora interior pulse and crisp shimmering outline halo.
- **Layer 1 — Dual-Buffer Stay-In-The-Lines masking.** Unchanged Smart Touch-Lock masking (`uAllowedTex` + CPU `Uint8Array`).
- **Layer 2 — 15 GLSL Pigment Programs (17 Materials).** Single-exit `shadeMaterial()` sharing 2 `snoise()` call sites for
  fast ANGLE cold-boot compile, spanning 7 Core Crayons + 10 Unlockable Exotic Mediums (including Strawberry Supernova Glaze,
  Crystal Glacier Mint, Cosmic Cotton-Candy Swirl, Enchanted Dragonfly Iridescence, Royal Astral Velvet Gold).
- **Layer 3 — Ink, Sel-Out, Living Sprites (including 14 Wardrobe Overlays, Butterfly & Bubbles), Wisp & Auto-Turn Curl.**

Id classes: `0` ink; `1..199` colourable (canonical `1..31`, dynamic `32..199`); `200..233` system (fixed material);
`234..254` ghosts; `255` sky.

## 3. Midnight Cloisonne & Hi-Bit Pixel UI Architecture
- Deep Midnight-Velvet Stargazer Backdrop (`#0D1026` -> `#1A1436`), crisp `#FAF6EC` stacked cotton paper spread (>=78% viewport),
  `1px` Burnished Celestial Gold (`#EAC46F`) astrolabe hairlines, and translucent Frosted Midnight-Plum Glass-Enamel Docks
  (`rgba(19, 16, 42, 0.86)`, `backdrop-filter: blur(12px)`).
- **Zero brown/tan/beige wrappers, zero dashed stitching borders, zero blobby inline SVG tool/character paths.** All HUD,
  medallion, brush, relic, medium, and wardrobe icons come from `ArtPort`'s deterministic integer-scaled Hi-Bit Pixel-Art Sprite Atlas (`image-rendering: pixelated`).
- **Layout:** Top Spine 5-Chapter Constellation Voyage Ribbon, Top-Left Prism Crystal Pill (with pulsing `"New Gift!"` dot when an unlock is affordable),
  Right Margin Firefly Hint Lantern + 3–4 Circular Cloisonne Story Medallions with 360° liquid-gold radial progress rings + bottom-right Auto-Turning Page Ribbon (`Stay & Doodle` pause toggle),
  Left Margin Equipped Brush & Sticker Relic Charm Strip, Bottom Floating Midnight-Enamel Art Dock.

## 4. Simulation & Smooth Progression
- Composite `HeroStoryQuest` tracking computes weighted pixel coverage across grouped `regionIds`; reaching `82%` (`74%` with
  `constellationCrown`) triggers Composite Auto-Bloom (100% fill across all sub-regions + `+4` gems + ascending F-Lydian cadence).
- Completing all 3–4 Story Medallions triggers `PageFinaleController` (2.8s Ensemble Finale + `+8` bonus gems -> automatic page curl into Draft -> Doors -> Next Chapter unless paused via `Stay & Doodle`).
- Zero-cooldown `requestHint(questId?)`, 4.5s idle lockstep pulse, and 3s >=65% sliver-rescue keep flow effortless.

## 5. Audio, Vault & PWA
- F-Lydian Web Audio synth + ascending Story Medallion cadence (`Fmaj9 -> G6 -> Am11`), Page Awakened Ensemble Fanfare,
  Firefly Hint Lantern music-box chime, and expanded item foley. Strictly ZERO `speechSynthesis`.
- Tri-tier `krunked-cookie-vault-v1` (`localStorage` + IndexedDB + <1500-char signed shadow cookie) with lossless Sprint 1 -> 2 migration.
- Standalone PWA with `CACHE_VERSION = 'chroma-cosmos-v3'`, `#0d1026` theme/bg, relative `./` paths, and offline `@fontsource` typography.

## 6. File ownership
| Owner | Files |
|---|---|
| Clara Vance | ARCHITECTURE.md, SPEC.md, HANDOFF.md, package.json, tsconfig.json, vite.config.ts, .gitignore, src/contracts/**, src/main.ts |
| Julian Kwan | src/renderer/**, src/shaders/**, tests/unit/renderer/** |
| Nadia Solis | src/art/**, src/scenes/**, tests/unit/art/** |
| Marcus Thorne | src/simulation/**, src/roguelike/**, tests/unit/simulation/**, tests/unit/roguelike/** |
| Sora Takahashi | src/audio/**, tests/unit/audio/** |
| Elena Rostova | src/vault/**, src/export/**, tests/unit/vault/**, tests/unit/export/** |
| Mateo Silva | index.html, src/styles/**, src/ui/**, tests/unit/ui/** |
| Tessa Lindqvist | public/**, scripts/generate-pwa-icons.mjs, .github/workflows/deploy-pages.yml, tests/unit/pwa/** |
| Devon Brooks | tests/redteam/**, tests/e2e/** |
