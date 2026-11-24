/** Meta-progression contracts. */
import type { MaterialId } from './materials';

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

export type WardrobeItemId = 'violetPins' | 'violetCape' | 'lumiWings' | 'lumiCrown' | 'novaBoosters' | 'novaScarf';

export interface WardrobeItemDef {
  id: WardrobeItemId;
  name: string;
  cost: number;
  /** system region id painted by this accessory */
  regionId: number;
  owner: 'violet' | 'lumi' | 'nova';
}

export const WARDROBE_ITEMS: readonly WardrobeItemDef[] = [
  { id: 'violetPins', name: 'Galaxy Hairpins', cost: 20, regionId: 215, owner: 'violet' },
  { id: 'violetCape', name: 'Rainbow Astronaut Cape', cost: 25, regionId: 216, owner: 'violet' },
  { id: 'lumiWings', name: 'Crystal Pegasus Wings', cost: 25, regionId: 217, owner: 'lumi' },
  { id: 'lumiCrown', name: 'Starlight Crown', cost: 30, regionId: 218, owner: 'lumi' },
  { id: 'novaBoosters', name: 'Twin Rocket-Boosters', cost: 30, regionId: 219, owner: 'nova' },
  { id: 'novaScarf', name: 'Trailing Rainbow Scarf', cost: 20, regionId: 220, owner: 'nova' },
] as const;

export type WardrobeState = Record<WardrobeItemId, boolean>;
