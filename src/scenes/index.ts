/** Scene registry: id -> generator. Every generator fills a SceneCtx; build() finalises. */
import type { SceneId } from '../contracts/roguelike';
import { SceneCtx, type SceneBuild } from './context';
import { buildRooftop } from './rooftop';
import { buildMilkshakeNebula } from './milkshakeNebula';
import { buildAsteroidGarden } from './asteroidGarden';
import { buildCheetahSavannah } from './cheetahSavannah';
import { buildSaturnRings } from './saturnRings';
import { buildBubbleTea } from './bubbleTea';
import { buildWhaleSea } from './whaleSea';
import { buildHeartOfUniverse } from './heartOfUniverse';
import { buildBedroomHub } from './bedroomHub';

export const SCENE_GENERATORS: Record<SceneId, (ctx: SceneCtx) => void> = {
  rooftop: buildRooftop,
  milkshakeNebula: buildMilkshakeNebula,
  asteroidGarden: buildAsteroidGarden,
  cheetahSavannah: buildCheetahSavannah,
  saturnRings: buildSaturnRings,
  bubbleTea: buildBubbleTea,
  whaleSea: buildWhaleSea,
  heartOfUniverse: buildHeartOfUniverse,
  bedroomHub: buildBedroomHub,
};

export function buildScene(id: SceneId, seed: number): SceneBuild {
  const ctx = new SceneCtx(id, seed);
  SCENE_GENERATORS[id](ctx);
  return ctx.build();
}

export { SceneCtx, CANON_LABEL, mulberry32, hashString } from './context';
export type { SceneBuild, PlacedActor, RegionDef } from './context';
export { Raster, inkPass, isSystemId, isGhostId, isColourable, W, H } from './raster';
export type { Paint, Pt } from './raster';
