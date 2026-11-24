/** Meta-progression & expanded item catalog contracts (14 Wardrobe Items, 20 Run Upgrades, 10 Unlockable Mediums). */
import { MATERIALS, UNLOCKABLE_MATERIAL_IDS, type MaterialDef, type MaterialId } from './materials';
import { ACTIVE_BRUSH_IDS, DRAFT_CARDS, RELIC_IDS, type DraftCardDef } from './roguelike';

export type BadgeId =
  | 'firstBloom' | 'lumiFriend' | 'novaFriend' | 'causalityExplorer'
  | 'rainbowMaster' | 'firstRun' | 'threeRuns' | 'fiveRuns';

export const BADGE_ORDER: readonly BadgeId[] = [
  'firstBloom', 'lumiFriend', 'novaFriend', 'causalityExplorer',
  'rainbowMaster', 'firstRun', 'threeRuns', 'fiveRuns',
] as const;

export const CONSTELLATION_MILESTONES: Readonly<Partial<Record<BadgeId, MaterialId>>> = {
  firstRun: 8,
  threeRuns: 12,
  fiveRuns: 10,
  rainbowMaster: 9,
} as const;

/** Order preserved for bitfield backward-compatibility: indices 0..5 are Sprint 1, 6..13 are Sprint 2. */
export type WardrobeItemId =
  | 'violetPins'
  | 'violetCape'
  | 'lumiWings'
  | 'lumiCrown'
  | 'novaBoosters'
  | 'novaScarf'
  | 'violetHeadphones'
  | 'violetMoonHoodie'
  | 'violetSaturnHalo'
  | 'violetPrismRibbons'
  | 'lumiNebulaGarland'
  | 'lumiCelestialSaddle'
  | 'novaStarGoggles'
  | 'novaGalaxyBowtie';

export interface WardrobeItemDef {
  id: WardrobeItemId;
  name: string;
  cost: number;
  /** system region id painted by this accessory (204..220) */
  regionId: number;
  owner: 'violet' | 'lumi' | 'nova';
}

export const WARDROBE_ITEMS: readonly WardrobeItemDef[] = [
  // Original 6 (indices 0..5 preserved for Sprint 1 save migration)
  { id: 'violetPins', name: 'Galaxy Hairpins', cost: 10, regionId: 215, owner: 'violet' },
  { id: 'violetCape', name: 'Rainbow Astronaut Cape', cost: 20, regionId: 216, owner: 'violet' },
  { id: 'lumiWings', name: 'Crystal Pegasus Wings', cost: 25, regionId: 217, owner: 'lumi' },
  { id: 'lumiCrown', name: 'Starlight Crown', cost: 30, regionId: 218, owner: 'lumi' },
  { id: 'novaBoosters', name: 'Twin Rocket-Boosters', cost: 30, regionId: 219, owner: 'nova' },
  { id: 'novaScarf', name: 'Trailing Rainbow Scarf', cost: 15, regionId: 220, owner: 'nova' },
  // 8 Brand-New Sprint 2 Wardrobe Items (indices 6..13)
  { id: 'violetHeadphones', name: 'Starlight Cat-Ear Headphones', cost: 15, regionId: 204, owner: 'violet' },
  { id: 'violetMoonHoodie', name: 'Cozy Moon-Pajama Hoodie', cost: 25, regionId: 205, owner: 'violet' },
  { id: 'violetSaturnHalo', name: 'Floating Mini-Saturn Orbit Halo', cost: 35, regionId: 206, owner: 'violet' },
  { id: 'violetPrismRibbons', name: 'Prism Ankle Ribbons', cost: 10, regionId: 207, owner: 'violet' },
  { id: 'lumiNebulaGarland', name: 'Nebula Flower Garland', cost: 15, regionId: 208, owner: 'lumi' },
  { id: 'lumiCelestialSaddle', name: 'Celestial Saddle Blanket', cost: 35, regionId: 209, owner: 'lumi' },
  { id: 'novaStarGoggles', name: 'Supersonic Star Goggles', cost: 20, regionId: 210, owner: 'nova' },
  { id: 'novaGalaxyBowtie', name: 'Galaxy Bowtie Collar', cost: 10, regionId: 211, owner: 'nova' },
] as const;

export type WardrobeState = Record<WardrobeItemId, boolean>;

export interface ExpandedItemCatalog {
  readonly brushes: readonly DraftCardDef[];
  readonly relics: readonly DraftCardDef[];
  readonly exoticMediums: readonly MaterialDef[];
  readonly wardrobe: readonly WardrobeItemDef[];
  readonly counts: {
    readonly brushes: number;
    readonly relics: number;
    readonly totalRunUpgrades: number;
    readonly unlockableMediums: number;
    readonly totalMediums: number;
    readonly wardrobe: number;
  };
}

export const EXPANDED_ITEM_CATALOG: ExpandedItemCatalog = {
  brushes: DRAFT_CARDS.filter((c) => c.type === 'brush'),
  relics: DRAFT_CARDS.filter((c) => c.type === 'relic'),
  exoticMediums: MATERIALS.filter((m) => m.tier === 'unlockable'),
  wardrobe: WARDROBE_ITEMS,
  counts: {
    brushes: ACTIVE_BRUSH_IDS.length,
    relics: RELIC_IDS.length,
    totalRunUpgrades: DRAFT_CARDS.length,
    unlockableMediums: UNLOCKABLE_MATERIAL_IDS.length,
    totalMediums: MATERIALS.length,
    wardrobe: WARDROBE_ITEMS.length,
  },
} as const;
