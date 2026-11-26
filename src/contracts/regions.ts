/** Region ID lookup tables. Data and types only. */
import type { MaterialId } from './materials';

export const REGION_INK = 0;
export const REGION_SKY = 255;
export const REGION_RANGES = {
  canonical: [1, 31],
  dynamic: [32, 199],
  system: [200, 233],
  ghost: [234, 254],
} as const;

export type RegionKind =
  | 'violet' | 'lumi' | 'nova' | 'planet' | 'rings' | 'cloud' | 'comet' | 'moonCat'
  | 'milkshake' | 'whale' | 'asteroid' | 'star' | 'rocket' | 'flora' | 'prop' | 'ghost' | 'system';

export interface CanonicalRegion {
  id: number;
  key: string;
  kind: RegionKind;
  /** core regions (1..15) */
  core: boolean;
}

export const CANONICAL_REGIONS: readonly CanonicalRegion[] = [
  { id: 1, key: 'violet_skin', kind: 'violet', core: true },
  { id: 2, key: 'violet_sandy_hair', kind: 'violet', core: true },
  { id: 3, key: 'violet_suit', kind: 'violet', core: true },
  { id: 4, key: 'violet_helmet', kind: 'violet', core: true },
  { id: 5, key: 'lumi_body', kind: 'lumi', core: true },
  { id: 6, key: 'lumi_mane', kind: 'lumi', core: true },
  { id: 7, key: 'lumi_horn', kind: 'lumi', core: true },
  { id: 8, key: 'lumi_tail', kind: 'lumi', core: true },
  { id: 9, key: 'nova_body', kind: 'nova', core: true },
  { id: 10, key: 'nova_spots', kind: 'nova', core: true },
  { id: 11, key: 'nova_tail', kind: 'nova', core: true },
  { id: 12, key: 'ringed_planet_core', kind: 'planet', core: true },
  { id: 13, key: 'planet_rings', kind: 'rings', core: true },
  { id: 14, key: 'space_cloud_a', kind: 'cloud', core: true },
  { id: 15, key: 'space_cloud_b', kind: 'cloud', core: true },
  { id: 16, key: 'rainbow_comet', kind: 'comet', core: false },
  { id: 17, key: 'sleepy_moon_cat', kind: 'moonCat', core: false },
  { id: 18, key: 'cosmic_milkshake', kind: 'milkshake', core: false },
  { id: 19, key: 'star_whale', kind: 'whale', core: false },
  { id: 20, key: 'crystal_asteroid', kind: 'asteroid', core: false },
  { id: 21, key: 'paper_rocket', kind: 'rocket', core: false },
] as const;

/** Fixed shader for system regions: a MaterialId, or a special token. */
export type SystemFixed = MaterialId | 'eyeShine' | 'blush' | 'selected' | 'wispCore' | 'wispAura' | 'wonderChalk';

export interface SystemRegion {
  id: number;
  key: string;
  fixed: SystemFixed;
}

export const SYSTEM_REGIONS: readonly SystemRegion[] = [
  { id: 200, key: 'fx_starlight_bubble', fixed: 14 },
  { id: 201, key: 'fx_echo_butterfly', fixed: 16 },
  { id: 202, key: 'fx_relic_mooncat', fixed: 8 },
  { id: 203, key: 'fx_constellation_crown', fixed: 11 },
  { id: 204, key: 'violet_cat_headphones', fixed: 13 },
  { id: 205, key: 'violet_moon_hoodie', fixed: 3 },
  { id: 206, key: 'violet_saturn_halo', fixed: 17 },
  { id: 207, key: 'violet_prism_ribbons', fixed: 15 },
  { id: 208, key: 'lumi_nebula_garland', fixed: 14 },
  { id: 209, key: 'lumi_celestial_saddle', fixed: 17 },
  { id: 210, key: 'nova_star_goggles', fixed: 16 },
  { id: 211, key: 'nova_galaxy_bowtie', fixed: 5 },
  { id: 212, key: 'eye_shine', fixed: 'eyeShine' },
  { id: 213, key: 'cheek_blush', fixed: 'blush' },
  { id: 214, key: 'violet_star_clips', fixed: 'selected' },
  { id: 215, key: 'violet_galaxy_pins', fixed: 5 },
  { id: 216, key: 'violet_cape', fixed: 2 },
  { id: 217, key: 'lumi_wings', fixed: 8 },
  { id: 218, key: 'lumi_crown', fixed: 11 },
  { id: 219, key: 'nova_boosters', fixed: 9 },
  { id: 220, key: 'nova_scarf', fixed: 6 },
  { id: 221, key: 'fx_rainbow', fixed: 6 },
  { id: 222, key: 'fx_prism_beam', fixed: 2 },
  { id: 223, key: 'fx_droplet', fixed: 3 },
  { id: 224, key: 'fx_flower', fixed: 10 },
  { id: 225, key: 'fx_comet_car', fixed: 4 },
  { id: 226, key: 'fx_gem', fixed: 5 },
  { id: 227, key: 'fx_gold_doodle', fixed: 11 },
  { id: 228, key: 'fx_trampoline', fixed: 7 },
  { id: 229, key: 'fx_constellation', fixed: 1 },
  { id: 230, key: 'fx_slide_cloud', fixed: 12 },
  { id: 231, key: 'fx_wisp_core', fixed: 'wispCore' },
  { id: 232, key: 'fx_wisp_aura', fixed: 'wispAura' },
  { id: 233, key: 'fx_wonder_chalk', fixed: 'wonderChalk' },
] as const;

export interface RegionMeta {
  id: number;
  key: string;
  kind: RegionKind;
  label: string;
  centroid: { x: number; y: number };
  bbox: { x0: number; y0: number; x1: number; y1: number };
  neighbors: number[];
  actorInstanceId?: string;
  core: boolean;
  ghost: boolean;
  coverageExcluded: boolean;
}

/** SimView.regionState layout (256 x 2 RGBA8 texture, 2048 bytes). */
export const REGION_STATE_W = 256;
export const REGION_STATE_H = 2;
export const REGION_STATE_BYTES = 2048;
/**
 * Row 0, offset id*4: R materialId (0 none), G coverage 0..255, B bloom progress 0..255, A flags.
 * Row 1, offset 1024 + id*4: R originX*255/480, G originY*255/270, B stage 0..4, A questPriority (0 none, 1 target, 2 active-quest part).
 */
export const REGION_FLAG = {
  complete: 1,
  questTarget: 2,
  ghostRevealed: 4,
  wiggle: 8,
  flash: 16,
  hidden: 32,
  guideGlow: 64,
  spotlight: 128,
} as const;
export const REGION_STATE_ROW1_OFFSET = 1024;
