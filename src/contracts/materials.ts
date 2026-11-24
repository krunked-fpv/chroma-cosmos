/** Shader material IDs and definitions. Data only. */
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
} as const;
export type MaterialId = (typeof MaterialId)[keyof typeof MaterialId];

export type MaterialTier = 'core' | 'unlockable';
export type AsmrFamily = 'grain' | 'sweep' | 'bell';
export type ShaderProgram = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10;

export interface MaterialDef {
  id: MaterialId;
  key: string;
  name: string;
  tier: MaterialTier;
  unlockCost: number;
  family: string;
  asmr: AsmrFamily;
  /** GLSL program branch (1..10). 24K Solar Flare reuses 4, Aurora Sherbet reuses 1. */
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
  { id: 8, key: 'OpalPearl', name: 'Opal Unicorn Pearl', tier: 'unlockable', unlockCost: 30, family: 'pearl', asmr: 'bell', program: 8, palette: ['#f5f0ff', '#ffd6e8', '#d6f5ff', '#e8ffd6'] },
  { id: 9, key: 'NeonCyberCheetah', name: 'Neon Cyber-Cheetah', tier: 'unlockable', unlockCost: 40, family: 'neon', asmr: 'bell', program: 9, palette: ['#ff2bd6', '#b6ff3b', '#1a0b2e'] },
  { id: 10, key: 'DeepSpaceBiolum', name: 'Deep-Space Bioluminescence', tier: 'unlockable', unlockCost: 80, family: 'biolum', asmr: 'sweep', program: 10, palette: ['#04364a', '#2ee6c9', '#8a5cff'] },
  { id: 11, key: 'SolarFlare24K', name: '24K Solar Flare', tier: 'unlockable', unlockCost: 60, family: 'amber', asmr: 'bell', program: 4, palette: ['#fff3b0', '#ffd700', '#ff8c00'] },
  { id: 12, key: 'AuroraSherbet', name: 'Aurora Sherbet', tier: 'unlockable', unlockCost: 50, family: 'gradient', asmr: 'sweep', program: 1, palette: ['#ffd1a6', '#ffb5c5', '#b5f2d0'] },
] as const;

export const CORE_MATERIAL_IDS: readonly MaterialId[] = [1, 2, 3, 4, 5, 6, 7];
