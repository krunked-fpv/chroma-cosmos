/** Pigment-Driven Causality matrix. Data and types only (matching logic lives in simulation). */
import type { MaterialId } from './materials';
import type { RegionKind } from './regions';

export type CausalityKind =
  | 'rainbowSlide' | 'starlightFlowerRain' | 'zeroGTrampoline' | 'cheetahRacetrack' | 'discoMirage' | 'gentleSparkle';

export interface CausalityRule {
  /** 'cloud' matches kind cloud; 'planet' matches kind planet OR rings */
  target: 'cloud' | 'planet';
  materials: readonly MaterialId[];
  effect: CausalityKind;
}

/** First match wins; otherwise 'gentleSparkle'. */
export const CAUSALITY_MATRIX: readonly CausalityRule[] = [
  { target: 'cloud', materials: [6, 1, 12], effect: 'rainbowSlide' },
  { target: 'cloud', materials: [3, 10], effect: 'starlightFlowerRain' },
  { target: 'cloud', materials: [7, 8], effect: 'zeroGTrampoline' },
  { target: 'planet', materials: [4, 11], effect: 'cheetahRacetrack' },
  { target: 'planet', materials: [2, 9], effect: 'discoMirage' },
] as const;

export const CAUSALITY_TARGET_KINDS: Readonly<Record<'cloud' | 'planet', readonly RegionKind[]>> = {
  cloud: ['cloud'],
  planet: ['planet', 'rings'],
};
