/** Shader material IDs and definitions (7 core + 10 unlockable exotic = 17). Data only. */
export const MaterialId = {
  LiquidAurora: 1,
  HoloFoil: 2,
  VelvetNebula: 3,
  SolarCheetahAmber: 4,
  SupernovaGlitter: 5,
  RainbowPrismWax: 6,
  CottonCandyChalk: 7,
  OpalPearl: 8,
  NeonCyberCheetah: 9,
  DeepSpaceBiolum: 10,
  SolarFlare24K: 11,
  AuroraSherbet: 12,
  StrawberrySupernova: 13,
  CrystalGlacierMint: 14,
  CosmicCottonSwirl: 15,
  DragonflyIridescence: 16,
  RoyalAstralGold: 17,
} as const;
export type MaterialId = (typeof MaterialId)[keyof typeof MaterialId];

export type MaterialTier = 'core' | 'unlockable';
export type AsmrFamily = 'grain' | 'sweep' | 'bell';
export type ShaderProgram = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12 | 13 | 14 | 15;

export interface MaterialDef {
  id: MaterialId;
  key: string;
  name: string;
  tier: MaterialTier;
  unlockCost: number;
  family: string;
  asmr: AsmrFamily;
  /** GLSL program branch (1..15). SolarFlare24K reuses 4; AuroraSherbet reuses 1; new exotics use 11..15. */
  program: ShaderProgram;
  palette: readonly string[];
}

export const MATERIALS: readonly MaterialDef[] = [
  { id: 1, key: 'LiquidAurora', name: 'Liquid Aurora', tier: 'core', unlockCost: 0, family: 'gradient', asmr: 'sweep', program: 1, palette: ['#7fe7f0', '#b69cff', '#ff9ecf', '#fff1c9'] },
  { id: 2, key: 'HoloFoil', name: 'Holographic Rainbow Foil', tier: 'core', unlockCost: 0, family: 'foil', asmr: 'bell', program: 2, palette: ['#ffadad', '#ffd6a5', '#fdffb6', '#caffbf', '#9bf6ff', '#a0c4ff', '#bdb2ff', '#ffffff'] },
  { id: 3, key: 'VelvetNebula', name: 'Velvet Nebula Watercolor', tier: 'core', unlockCost: 0, family: 'watercolor', asmr: 'sweep', program: 3, palette: ['#2d2a7a', '#7b3fa0', '#e35d9b', '#fff6d8'] },
  { id: 4, key: 'SolarCheetahAmber', name: 'Solar Cheetah Amber', tier: 'core', unlockCost: 0, family: 'amber', asmr: 'grain', program: 4, palette: ['#ffcf5a', '#ff9a3c', '#8a3b12', '#5b2a86'] },
  { id: 5, key: 'SupernovaGlitter', name: 'Supernova Glitter Gel', tier: 'core', unlockCost: 0, family: 'glitter', asmr: 'bell', program: 5, palette: ['#6c5ce7', '#a29bfe', '#ffffff'] },
  { id: 6, key: 'RainbowPrismWax', name: 'Rainbow Prism Wax', tier: 'core', unlockCost: 0, family: 'crayon', asmr: 'grain', program: 6, palette: ['#ff6b6b', '#ffa94d', '#ffd43b', '#69db7c', '#4dabf7', '#9775fa'] },
  { id: 7, key: 'CottonCandyChalk', name: 'Cotton-Candy Bounce Chalk', tier: 'core', unlockCost: 0, family: 'chalk', asmr: 'grain', program: 7, palette: ['#ffb3d9', '#a5d8ff'] },
  { id: 8, key: 'OpalPearl', name: 'Opal Unicorn Pearl', tier: 'unlockable', unlockCost: 15, family: 'pearl', asmr: 'bell', program: 8, palette: ['#f5f0ff', '#ffd6e8', '#d6f5ff', '#e8ffd6'] },
  { id: 9, key: 'NeonCyberCheetah', name: 'Neon Cyber-Cheetah', tier: 'unlockable', unlockCost: 25, family: 'neon', asmr: 'bell', program: 9, palette: ['#ff2bd6', '#b6ff3b', '#1a0b2e'] },
  { id: 10, key: 'DeepSpaceBiolum', name: 'Deep-Space Bioluminescence', tier: 'unlockable', unlockCost: 45, family: 'biolum', asmr: 'sweep', program: 10, palette: ['#04364a', '#2ee6c9', '#8a5cff'] },
  { id: 11, key: 'SolarFlare24K', name: '24K Solar Flare', tier: 'unlockable', unlockCost: 35, family: 'amber', asmr: 'bell', program: 4, palette: ['#fff3b0', '#ffd700', '#ff8c00'] },
  { id: 12, key: 'AuroraSherbet', name: 'Aurora Sherbet', tier: 'unlockable', unlockCost: 20, family: 'gradient', asmr: 'sweep', program: 1, palette: ['#ffd1a6', '#ffb5c5', '#b5f2d0'] },
  { id: 13, key: 'StrawberrySupernova', name: 'Strawberry Supernova Glaze', tier: 'unlockable', unlockCost: 10, family: 'glaze', asmr: 'bell', program: 11, palette: ['#ff5e8e', '#ff9ec2', '#ffd6e8', '#fff5b8'] },
  { id: 14, key: 'CrystalGlacierMint', name: 'Crystal Glacier Mint', tier: 'unlockable', unlockCost: 15, family: 'crystal', asmr: 'bell', program: 12, palette: ['#4ae0cb', '#a8fff0', '#7cc8ff', '#eefcff'] },
  { id: 15, key: 'CosmicCottonSwirl', name: 'Cosmic Cotton-Candy Swirl', tier: 'unlockable', unlockCost: 25, family: 'swirl', asmr: 'sweep', program: 13, palette: ['#ff8fd8', '#9be2ff', '#d6a8ff', '#fff0fa'] },
  { id: 16, key: 'DragonflyIridescence', name: 'Enchanted Dragonfly Iridescence', tier: 'unlockable', unlockCost: 35, family: 'iridescent', asmr: 'bell', program: 14, palette: ['#18c9b8', '#4287f5', '#9d5cff', '#7bffb8'] },
  { id: 17, key: 'RoyalAstralGold', name: 'Royal Astral Velvet Gold', tier: 'unlockable', unlockCost: 50, family: 'velvetGold', asmr: 'sweep', program: 15, palette: ['#1c1142', '#3f2278', '#eac46f', '#fff3c4'] },
] as const;

export const CORE_MATERIAL_IDS: readonly MaterialId[] = [1, 2, 3, 4, 5, 6, 7];
export const UNLOCKABLE_MATERIAL_IDS: readonly MaterialId[] = [8, 9, 10, 11, 12, 13, 14, 15, 16, 17];
export const MAX_MATERIAL_ID = 17;
