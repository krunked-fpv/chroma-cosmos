# SPEC — Chroma Cosmos

Source of truth for data contracts. TypeScript sources live in `src/contracts/` and MUST match this file.

## 1. Constants (`src/contracts/constants.ts`)
| Name | Value |
|---|---|
| `PAGE_W × PAGE_H` | 480 × 270 (`PAGE_PIXELS` 129600), `STROKE_SCALE` 4 |
| `CACHE_VERSION` | `chroma-cosmos-v1` |
| `VAULT_COOKIE_NAME` | `krunked-cookie-vault-v1` |
| `VAULT_COOKIE_ATTRS` | `SameSite=Lax; path=/; max-age=31536000` |
| `VAULT_LS_KEY` | `chroma-cosmos:vault:v1` |
| IndexedDB | name `chroma-cosmos-db`, version 1, stores `storybooks` (keyPath `id`) and `run_state` (key `current`) |
| `STAGE_MIN` | `[0, 0.01, 0.26, 0.66, 0.93]` — stage = highest s with pct ≥ STAGE_MIN[s]; stage 1 also needs pct > 0 |
| `AUTO_BLOOM_THRESHOLD` | 0.93 |
| `BPM` | 96 |
| `F_LYDIAN_HZ` | 349.23, 392.00, 440.00, 493.88, 523.25, 587.33, 659.25 (F4 G4 A4 B4 C5 D5 E5) |
| `AUDIO_LEVEL_GAIN` | `[0, 0.3, 0.6, 0.9]`; tap cycles 3→2→1→0→3 |
| `GEM_REWARDS` | regionBloom 3, actorBloom 5, pageComplete 10, runComplete 25, harmonyGem 1, hiddenStar 2 |
| `BRUSH_RADIUS_PX` | standard 6, turboCheetah 10, twinTail 6, supernovaSponge 28, zeroGGel 5 |
| Stamping | `STAMP_SPACING` 0.35 × radius; `MAX_STAMPS_PER_BATCH` 64 |
| Relic tuning | `TWIN_TAIL_NEIGHBOR_CHANCE` 0.4, `KALEIDOSCOPE_PREFILL` 0.35, `KALEIDOSCOPE_TARGETS` 3, `UV_FLASHLIGHT_RADIUS` 40 |
| Timing | `POKE_CHASE_MS` 4000, `RIPPLE_MS` 900, `PAGE_TURN_MS` 1400 |
| Colours | ink `#231942`, bg `#120d2b`, paper `#fbf3e0` |

## 2. Region ID lookup table (`regions.ts`)
- `0` ink, `255` sky. Ranges: canonical 1–31, dynamic 32–211, system 212–233, ghost 234–254.
- System and ghost ids are excluded from coverage and core. Ghosts become colourable when revealed.
- Core regions = canonical 1–15 when present on a page.

| id | key | kind | core |
|---|---|---|---|
| 1 | violet_skin | violet | ✔ |
| 2 | violet_sandy_hair | violet | ✔ |
| 3 | violet_suit | violet | ✔ |
| 4 | violet_helmet | violet | ✔ |
| 5 | lumi_body | lumi | ✔ |
| 6 | lumi_mane | lumi | ✔ |
| 7 | lumi_horn | lumi | ✔ |
| 8 | lumi_tail | lumi | ✔ |
| 9 | nova_body | nova | ✔ |
| 10 | nova_spots | nova | ✔ |
| 11 | nova_tail | nova | ✔ |
| 12 | ringed_planet_core | planet | ✔ |
| 13 | planet_rings | rings | ✔ |
| 14 | space_cloud_a | cloud | ✔ |
| 15 | space_cloud_b | cloud | ✔ |
| 16 | rainbow_comet | comet | |
| 17 | sleepy_moon_cat | moonCat | |
| 18 | cosmic_milkshake | milkshake | |
| 19 | star_whale | whale | |
| 20 | crystal_asteroid | asteroid | |
| 21 | paper_rocket | rocket | |

System regions (fixed material):
212 eye_shine (`eyeShine`), 213 cheek_blush (`blush`), 214 violet_star_clips (`selected` = current brush pigment),
215 violet_galaxy_pins (5), 216 violet_cape (2), 217 lumi_wings (8), 218 lumi_crown (11), 219 nova_boosters (9),
220 nova_scarf (6), 221 fx_rainbow (6), 222 fx_prism_beam (2), 223 fx_droplet (3), 224 fx_flower (10),
225 fx_comet_car (4), 226 fx_gem (5), 227 fx_gold_doodle (11), 228 fx_trampoline (7), 229 fx_constellation (1),
230 fx_slide_cloud (12). 231–233 reserved.

### REGION_STATE layout (`SimView.regionState`, 256×2 RGBA8 = 2048 bytes)
- Row 0, offset `id*4`: R materialId (0 none), G coverage 0–255, B bloom progress 0–255, A flags.
- Row 1, offset `1024 + id*4`: R originX·255/480, G originY·255/270, B stage 0–4, A reserved.
- Flags: complete 1, ghostRevealed 4, wiggle 8, flash 16, hidden 32.

## 3. Shader materials (`materials.ts`)
| id | key | tier / cost | program | asmr | palette |
|---|---|---|---|---|---|
| 1 | LiquidAurora | core | 1 | sweep | `#7fe7f0 #b69cff #ff9ecf #fff1c9` |
| 2 | HoloFoil | core | 2 | bell | pastel spectrum + white specular |
| 3 | VelvetNebula | core | 3 | sweep | `#2d2a7a #7b3fa0 #e35d9b`, stars `#fff6d8` |
| 4 | SolarCheetahAmber | core | 4 | grain | `#ffcf5a #ff9a3c`, spots `#8a3b12`, swirl `#5b2a86` |
| 5 | SupernovaGlitter | core | 5 | bell | `#6c5ce7 #a29bfe` + white sparkles |
| 6 | RainbowPrismWax | core | 6 | grain | `#ff6b6b #ffa94d #ffd43b #69db7c #4dabf7 #9775fa` |
| 7 | CottonCandyChalk | core | 7 | grain | `#ffb3d9 #a5d8ff` |
| 8 | OpalPearl | unlock 30 | 8 | bell | `#f5f0ff #ffd6e8 #d6f5ff #e8ffd6` |
| 9 | NeonCyberCheetah | unlock 40 | 9 | bell | `#ff2bd6 #b6ff3b` on `#1a0b2e` |
| 10 | DeepSpaceBiolum | unlock 80 | 10 | sweep | `#04364a #2ee6c9 #8a5cff` |
| 11 | SolarFlare24K | unlock 60 | 4 | bell | `#fff3b0 #ffd700 #ff8c00` |
| 12 | AuroraSherbet | unlock 50 | 1 | sweep | `#ffd1a6 #ffb5c5 #b5f2d0` |

## 4. Pigment-Causality matrix (`causality.ts`)
First match wins; otherwise `gentleSparkle`. Planet rules match kind `planet` OR `rings`.
| target | materials | effect |
|---|---|---|
| cloud | RainbowPrismWax, LiquidAurora, AuroraSherbet | rainbowSlide (Nova sprints down it) |
| cloud | VelvetNebula, DeepSpaceBiolum | starlightFlowerRain (crystal flowers along the bottom margin) |
| cloud | CottonCandyChalk, OpalPearl | zeroGTrampoline (Violet bounces to hidden stars) |
| planet | SolarCheetahAmber, SolarFlare24K | cheetahRacetrack (comet-cars + Nova race) |
| planet | HoloFoil, NeonCyberCheetah | discoMirage (prism beams wake nearby comets) |

## 5. Roguelike (`roguelike.ts`)
Chapters: slot 1 `rooftop` (R); slot 2 `milkshakeNebula` (M) | `asteroidGarden` (A); slot 3 `cheetahSavannah` (S) |
`saturnRings` (U); slot 4 `bubbleTea` (B) | `whaleSea` (W); slot 5 `heartOfUniverse` (H). Hub scene: `bedroomHub`.
Doors after slots 1–3 (2 choices each); after slot 4 a single finale door.
Draft after slots 1–4: 3 distinct un-owned cards, seeded. Brushes: turboCheetah, twinTail, supernovaSponge, zeroGGel.
Relics: zoomiePaw, prismRibbon, uvFlashlight, kaleidoSharpener.
`RunCore {seed, chapterIndex 0..4, path, brushes, relics, phase 'chapter'|'draft'|'doors'|'finale'}`.
Galaxy name seeded from word lists plus drafted items (e.g. "The Sparkle-Paws Aurora Spiral").

## 6. Progression (`progression.ts`)
Badges (order): firstBloom, lumiFriend, novaFriend, causalityExplorer, rainbowMaster, firstRun, threeRuns, fiveRuns.
Constellation milestones: firstRun→OpalPearl, threeRuns→AuroraSherbet, fiveRuns→DeepSpaceBiolum, rainbowMaster→NeonCyberCheetah.
Wardrobe (cost, system region): violetPins 20/215, violetCape 25/216, lumiWings 25/217, lumiCrown 30/218, novaBoosters 30/219, novaScarf 20/220.

## 7. Vault schema (`vault.ts`)
`VaultState {v:1, gems, badges, unlockedMaterials, wardrobeOwned, wardrobe, audioLevel, run, stats{runsCompleted,regionsAwakened,pokes}, updatedAt}`.

Shadow cookie `krunked-cookie-vault-v1`:
`value = base64url(JSON(CompactCookieV1)) + '.' + fnv1a32hex(base64urlBody)`, attrs `SameSite=Lax; path=/; max-age=31536000`, < 1500 chars.
`CompactCookieV1 {v:1, g gems, b badge bits, m material bits (id-1), o owned wardrobe bits, w equipped wardrobe bits, a audioLevel, r [seed, chapterIndex, pathCodes, brushBits, relicBits, phaseCode] | 0, s [runsCompleted, regionsAwakened], t updatedAt}`.

Hydration: read localStorage, IndexedDB `run_state/current`, cookie; validate (checksum + schema); newest valid `updatedAt` wins;
write back to missing/stale tiers; report `{source, healed[]}`.
Export JSON: `{format:'chroma-cosmos-vault', version:1, exportedAt, vault, storybooks}` (typed arrays as base64).
Storybook: `{id, title, galaxyName, createdAt, seed, pages: StoryPageSnapshot[]}`.

## 8. Component boundaries
See ARCHITECTURE.md §1 and §8. Port interfaces: `ArtPort`, `RendererPort`, `SimulationPort`, `RunManagerPort`, `AudioPort`,
`VaultPort`, `KeepsakePort`, `UiPort` (all in `src/contracts/`), with `GestureEvent` as the single input event type.
Sprites use region ids as pixel values; 255 = transparent. Page generators guarantee ≥1 cloud and ≥1 ringed planet per chapter.

## 9. PWA constants
`CACHE_VERSION = 'chroma-cosmos-v1'` in `public/sw.js` MUST equal the contracts constant.
Manifest: name "Chroma Cosmos: Violet's Living Sketchbook", short_name "Chroma Cosmos",
description "Interactive Hi-Bit Cosmic Coloring Book Roguelike starring Violet, Lumi & Nova", display standalone,
orientation landscape, background/theme `#120d2b`, start_url `./`, scope `./`,
icons `icon-192.png` (192²), `icon-512.png` (512²), `apple-touch-icon.png` (180²) with purpose `any maskable`.

## 10. QA hook API (`window.__chroma`)
- Always: `telemetry() → {frameMsMedian, frameMsP95, fps, samples, longFrames}`, `resetTelemetry()`, `stats() → {renderer, audio, mode, gems, vaultReport}`.
- `?qa=1` only: `qa.regions()`, `qa.clientPointOf(id)`, `qa.paintRegion(id, materialId)` (real PointerEvents), `qa.poke(kind)`, `qa.startRun(seed)`, `qa.completePage()`, `qa.mode()`.

## 11. Acceptance gates
`npm run typecheck`, `npm test`, `npm run build` clean; headed `/browser` e2e: zero console errors/page errors/4xx,
median frame ≤ 16.7 ms, vault self-heals after localStorage + IndexedDB wipe, shadow cookie regenerates after cookie wipe,
PNG icons have magic `89 50 4E 47 0D 0A 1A 0A` and exact IHDR sizes.
