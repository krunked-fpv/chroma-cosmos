# SPEC — Chroma Cosmos (Sprint 2: Midnight Cloisonne & Item Expansion)

Source of truth for data contracts. TypeScript sources live in `src/contracts/` and MUST match this file.

## 1. Constants (`src/contracts/constants.ts`)
| Name | Value |
|---|---|
| `PAGE_W × PAGE_H` | 480 × 270 (`PAGE_PIXELS` 129600), `STROKE_SCALE` 4 |
| `CACHE_VERSION` | `chroma-cosmos-v3` |
| `VAULT_COOKIE_NAME` | `krunked-cookie-vault-v1` |
| `VAULT_COOKIE_ATTRS` | `SameSite=Lax; path=/; max-age=31536000` |
| `VAULT_LS_KEY` | `chroma-cosmos:vault:v1` |
| IndexedDB | name `chroma-cosmos-db`, version 1, stores `storybooks` (keyPath `id`) and `run_state` (key `current`) |
| `STAGE_MIN` | `[0, 0.01, 0.26, 0.66, 0.93]` — individual region stages |
| `AUTO_BLOOM_THRESHOLD` | 0.93 (individual non-quest region) |
| `HERO_QUEST_BLOOM_THRESHOLD` | 0.82 (composite Hero Story Quest Auto-Bloom; `CROWN_QUEST_BLOOM_THRESHOLD` 0.74 with `constellationCrown`) |
| `STALLED_QUEST_THRESHOLD` / `DELAY_MS` | 0.65 / 3000 ms (sliver-rescue twinkle on paused partial Hero Quest) |
| `BPM` | 96 |
| `F_LYDIAN_HZ` | 349.23, 392.00, 440.00, 493.88, 523.25, 587.33, 659.25 (F4 G4 A4 B4 C5 D5 E5) |
| `AUDIO_LEVEL_GAIN` | `[0, 0.3, 0.6, 0.9]`; tap cycles 3→2→1→0→3 |
| `GEM_REWARDS` | regionBloom 1, actorBloom 2, questBloom 4, pageComplete 8, runComplete 20, harmonyGem 1, hiddenStar 2, milkshakeBonus 2, gravityPokeBonus 2 |
| `BRUSH_RADIUS_PX` | standard 6, turboCheetah 10, twinTail 6, supernovaSponge 28, zeroGGel 5, cometMeteor 9, prismRoller 13, starlightBubble 8, nebulaCloudPuff 18, lightningWhisker 7, moonbeamQuill 6 |
| Stamping | `STAMP_SPACING` 0.35 × radius; `MAX_STAMPS_PER_BATCH` 64 |
| Timing | `POKE_CHASE_MS` 4000, `RIPPLE_MS` 900, `PAGE_TURN_MS` 1400, `PAGE_FINALE_MS` 2800, `PROLOGUE_DURATION_MS` 5600, `IDLE_WISP_DELAY_MS` 4500, `HINT_SPOTLIGHT_MS` 2500, `TOOL_TAG_DURATION_MS` 2500, `SOCKET_WIGGLE_MS` 2500 |
| Palette | `INK_HEX` `#231942`, `BG_HEX` `#0d1026`, `PAPER_HEX` `#faf6ec`, `GOLD_HEX` `#eac46f` |

## 2. Region ID lookup table (`regions.ts`)
- `0` ink, `255` sky. Ranges: canonical `1..31`, dynamic `32..199`, system `200..233`, ghost `234..254`.
- System and ghost ids are excluded from coverage and core. Ghosts become colourable when revealed.
- System regions `200..233`:
  - `200..203` relic/brush companion FX: `200` `fx_starlight_bubble` (mat 14), `201` `fx_echo_butterfly` (mat 16), `202` `fx_relic_mooncat` (mat 8), `203` `fx_constellation_crown` (mat 11).
  - `204..211` Sprint 2 wardrobe overlays: `204` `violet_cat_headphones` (13), `205` `violet_moon_hoodie` (3), `206` `violet_saturn_halo` (17), `207` `violet_prism_ribbons` (15), `208` `lumi_nebula_garland` (14), `209` `lumi_celestial_saddle` (17), `210` `nova_star_goggles` (16), `211` `nova_galaxy_bowtie` (5).
  - `212..233` Sprint 1 system regions preserved identically (`212` eyeShine, `213` blush, `214` selected, `215..220` original 6 wardrobe items, `221..233` FX/Wisp/WonderChalk).

### REGION_STATE layout (`SimView.regionState`, 256×2 RGBA8 = 2048 bytes)
- Row 0, offset `id*4`: R materialId (0 none), G coverage 0–255, B bloom progress 0–255, A flags.
- Row 1, offset `1024 + id*4`: R originX·255/480, G originY·255/270, B stage 0–4, A reserved.
- Flags: `complete: 1`, `ghostRevealed: 4`, `wiggle: 8`, `flash: 16`, `hidden: 32`, `guideGlow: 64`, `spotlight: 128`.

## 3. HeroStoryQuest, Auto-Page Finale & Firefly Hint System
- **`HeroStoryQuest` (3–4 per chapter across ALL 8 chapters)**:
  - `rooftop`: `violet` (Violet), `lumi` (Lumi), `nova` (Nova), `rocket` (Paper Rocket).
  - `milkshakeNebula`: `violet` (Violet), `milkshake` (Milkshake), `planet` (Ringed Planet), `cloud` (Cream Clouds).
  - `asteroidGarden`: `lumi` (Lumi), `asteroid` (Crystals), `planet` (Ringed Planet), `moonCat` (Moon-Cat).
  - `cheetahSavannah`: `nova` (Nova), `suns` (Twin Suns), `planet` (Ringed Planet), `cloud` (Orion Clouds).
  - `saturnRings`: `lumi` (Lumi), `planet` (Saturn), `cloud` (Dream Clouds), `comet` (Star Comet).
  - `bubbleTea`: `violet` (Violet), `boba` (Boba Cup), `planet` (Ringed Planet), `moonCat` (Moon-Cat).
  - `whaleSea`: `whale` (Star Whale), `planet` (Ringed Planet), `cloud` (Sea Clouds).
  - `heartOfUniverse`: `heart` (Star Heart), `violet` (Violet), `lumi` (Lumi), `nova` (Nova).
  - Weighted pixel coverage across `quest.regionIds` triggers **Composite Auto-Bloom** at **82%** (`74%` with `constellationCrown`), rippling 100% fill across all attached sub-regions, awarding **+4 Stardust Gems**, and firing `heroQuestComplete` + ascending F-Lydian Story Medallion chord.
- **`PageFinaleController` (2.8s Automatic Page-Turn Finale)**:
  - Triggered immediately when all 3–4 `HeroStoryQuest` medallions complete (`pageComplete === true`).
  - Plays Page Awakened Ensemble Fanfare, showers **+8 Page Finale Bonus Gems**, and counts down `PAGE_FINALE_MS` (2800 ms) on a celebratory bottom-right Auto-Turning Page Ribbon before emitting `autoPageTurnReady` to automatically curl/turn into Astral Pencil Tin Draft -> Illustrated Star-Door Route Choice -> Next Chapter.
  - Tapping `Stay & Doodle` sets `stayAndDoodle = true` to pause auto-turn and reveals a luminous 1-tap `Turn Page ->` button. `Skip Page` is tucked inside a quiet top-right settings popover.
- **`HintRequestState` (Firefly Hint Lantern + Medallion Tap + 4.5s Idle + 65% Sliver-Rescue)**:
  - Zero-cooldown `requestHint(questId?, source)` flies the Starlight Wisp onto the target quest's uncolored pixels, sets `REGION_FLAG.spotlight` on all uncompleted `regionIds` of that quest, dims non-target uncolored paper by 12% (`uHintDim`) for `HINT_SPOTLIGHT_MS` (2500 ms), and traces a looping rainbow ghost-stroke inside it.
  - After 4.5s idle, gently pulses the next unlit right-side Story Medallion in lockstep with its canvas shape; after 3s paused with a quest >=65% covered, twinkles the remaining uncolored patch.

## 4. Shader materials (`materials.ts`) — 7 Core + 10 Unlockable Exotic = 17 Total
| id | key | name | tier / cost | program | asmr | palette |
|---|---|---|---|---|---|---|
| 1..7 | Core mediums | (unchanged) | core / 0 | 1..7 | varied | (unchanged) |
| 8 | OpalPearl | Opal Unicorn Pearl | unlock 15 | 8 | bell | `#f5f0ff #ffd6e8 #d6f5ff #e8ffd6` |
| 9 | NeonCyberCheetah | Neon Cyber-Cheetah | unlock 25 | 9 | bell | `#ff2bd6 #b6ff3b #1a0b2e` |
| 10 | DeepSpaceBiolum | Deep-Space Bioluminescence | unlock 45 | 10 | sweep | `#04364a #2ee6c9 #8a5cff` |
| 11 | SolarFlare24K | 24K Solar Flare | unlock 35 | 4 | bell | `#fff3b0 #ffd700 #ff8c00` |
| 12 | AuroraSherbet | Aurora Sherbet | unlock 20 | 1 | sweep | `#ffd1a6 #ffb5c5 #b5f2d0` |
| 13 | StrawberrySupernova | Strawberry Supernova Glaze | unlock 10 | 11 | bell | `#ff5e8e #ff9ec2 #ffd6e8 #fff5b8` |
| 14 | CrystalGlacierMint | Crystal Glacier Mint | unlock 15 | 12 | bell | `#4ae0cb #a8fff0 #7cc8ff #eefcff` |
| 15 | CosmicCottonSwirl | Cosmic Cotton-Candy Swirl | unlock 25 | 13 | sweep | `#ff8fd8 #9be2ff #d6a8ff #fff0fa` |
| 16 | DragonflyIridescence | Enchanted Dragonfly Iridescence | unlock 35 | 14 | bell | `#18c9b8 #4287f5 #9d5cff #7bffb8` |
| 17 | RoyalAstralGold | Royal Astral Velvet Gold | unlock 50 | 15 | sweep | `#1c1142 #3f2278 #eac46f #fff3c4` |

## 5. Expanded Astral Pencil Tin (`roguelike.ts`) — 20 Total Run Upgrades
- **10 Active Magical Brushes** (+ starter `standard`): `turboCheetah`, `twinTail`, `supernovaSponge`, `zeroGGel`, `cometMeteor`, `prismRoller`, `starlightBubble`, `nebulaCloudPuff`, `lightningWhisker`, `moonbeamQuill`.
- **10 Passive Holographic Sticker Relics**: `zoomiePaw`, `prismRibbon`, `uvFlashlight`, `kaleidoSharpener`, `sleepyMoonCat`, `gravityFlipFlop`, `doubleMilkshake`, `starlightMagnet`, `chromaticButterfly`, `constellationCrown`.

## 6. Expanded Wardrobe (`progression.ts`) — 14 Toggleable Pixel-Art Accessories
- Indices `0..5` (Sprint 1 preserved): `violetPins` (10/215), `violetCape` (20/216), `lumiWings` (25/217), `lumiCrown` (30/218), `novaBoosters` (30/219), `novaScarf` (15/220).
- Indices `6..13` (Sprint 2 new): `violetHeadphones` (15/204), `violetMoonHoodie` (25/205), `violetSaturnHalo` (35/206), `violetPrismRibbons` (10/207), `lumiNebulaGarland` (15/208), `lumiCelestialSaddle` (35/209), `novaStarGoggles` (20/210), `novaGalaxyBowtie` (10/211).

## 7. Hi-Bit UI Pixel-Sprite Atlas & Midnight Cloisonne UI Mandate
- `UiPixelSpriteAtlas` / `IllustrationKind` (`uiSprite`, `brushIcon`, `questMedallion`, `relicSticker`, `wardrobe`, `material`, `card`, `door`, `portrait`, `bookCover`) exports deterministic integer-scaled Hi-Bit pixel-art sprites (`24x24`, `32x32`, `48x48`, etc., `image-rendering: pixelated`) from `src/art/`.
- Strictly ZERO muddy brown/tan/beige CSS wrappers, ZERO dashed CSS stitching borders, ZERO blobby hand-coded inline SVG tool/character paths, and ZERO `speechSynthesis`.

## 8. Vault Schema & Migration (`vault.ts`)
- `VaultState` stays `v: 1` with optional `discoveredCards?: DraftCardId[]` and `prologueSeen?: boolean`.
- `CompactCookieV1` keeps original Sprint 1 bit positions for `b`, `m` (17 bits), `o`/`w` (14 bits), `brushBits` (11 bits), `relicBits` (10 bits), plus optional `d` (20-bit discovered cards) and `p` (`0|1`), staying strictly `< 1500` chars with lossless migration of Sprint 1 saves.

## 9. PWA Constants & Acceptance Gates
- `CACHE_VERSION = 'chroma-cosmos-v3'` in `public/sw.js` MUST equal `src/contracts/constants.ts`.
- `public/manifest.json` uses `background_color: "#0d1026"`, `theme_color: "#0d1026"`, binary-valid PNG icons (`89 50 4E 47 0D 0A 1A 0A`).
- Acceptance: `npm run typecheck`, `npm test`, `npm run build`, zero `speechSynthesis`, 6-state headed `/browser` anti-lunch-tray + 60fps + auto-page-turn + Firefly Hint + `krunked-cookie-vault-v1` self-healing gate.
