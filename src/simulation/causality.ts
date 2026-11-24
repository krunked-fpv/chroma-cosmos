import { CAUSALITY_MATRIX, CAUSALITY_TARGET_KINDS } from '../contracts';
import type { CausalityKind, RegionKind } from '../contracts';

/** Pigment-Driven Causality: first matching rule wins, otherwise 'gentleSparkle'. */
export function matchCausality(kind: RegionKind, materialId: number): CausalityKind | null {
  const isCloud = CAUSALITY_TARGET_KINDS.cloud.includes(kind);
  const isPlanet = CAUSALITY_TARGET_KINDS.planet.includes(kind);
  if (!isCloud && !isPlanet) return null;
  for (const rule of CAUSALITY_MATRIX) {
    const kinds = CAUSALITY_TARGET_KINDS[rule.target];
    if (!kinds.includes(kind)) continue;
    if ((rule.materials as readonly number[]).includes(materialId)) return rule.effect;
  }
  return 'gentleSparkle';
}
