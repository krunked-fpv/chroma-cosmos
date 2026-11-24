/** Shared constants. Types and `as const` data only — no logic. */
export const APP_NAME = "Chroma Cosmos: Violet's Living Sketchbook";
export const PAGE_W = 480;
export const PAGE_H = 270;
export const PAGE_PIXELS = 129600;
export const STROKE_SCALE = 4;
export const CACHE_VERSION = 'chroma-cosmos-v1';
export const VAULT_COOKIE_NAME = 'krunked-cookie-vault-v1';
export const VAULT_COOKIE_ATTRS = 'SameSite=Lax; path=/; max-age=31536000';
export const VAULT_LS_KEY = 'chroma-cosmos:vault:v1';
export const IDB_NAME = 'chroma-cosmos-db';
export const IDB_VERSION = 1;
export const IDB_STORE_STORYBOOKS = 'storybooks';
export const IDB_STORE_RUN_STATE = 'run_state';
export const IDB_RUN_KEY = 'current';
/** stage s = highest s with pct >= STAGE_MIN[s]; stage 1 also requires pct > 0 */
export const STAGE_MIN = [0, 0.01, 0.26, 0.66, 0.93] as const;
export const AUTO_BLOOM_THRESHOLD = 0.93;
export const BPM = 96;
/** F4 G4 A4 B4 C5 D5 E5 */
export const F_LYDIAN_HZ = [349.23, 392.0, 440.0, 493.88, 523.25, 587.33, 659.25] as const;
/** level 0 = muted; tap cycles 3 -> 2 -> 1 -> 0 -> 3 */
export const AUDIO_LEVEL_GAIN = [0, 0.3, 0.6, 0.9] as const;
export const GEM_REWARDS = {
  regionBloom: 3,
  actorBloom: 5,
  pageComplete: 10,
  runComplete: 25,
  harmonyGem: 1,
  hiddenStar: 2,
} as const;
export const BRUSH_RADIUS_PX = {
  standard: 6,
  turboCheetah: 10,
  twinTail: 6,
  supernovaSponge: 28,
  zeroGGel: 5,
} as const;
export const STAMP_SPACING = 0.35;
export const MAX_STAMPS_PER_BATCH = 64;
export const TWIN_TAIL_NEIGHBOR_CHANCE = 0.4;
export const KALEIDOSCOPE_PREFILL = 0.35;
export const KALEIDOSCOPE_TARGETS = 3;
export const UV_FLASHLIGHT_RADIUS = 40;
export const POKE_CHASE_MS = 4000;
export const RIPPLE_MS = 900;
export const PAGE_TURN_MS = 1400;
export const INK_HEX = '#231942';
export const BG_HEX = '#120d2b';
export const PAPER_HEX = '#fbf3e0';
