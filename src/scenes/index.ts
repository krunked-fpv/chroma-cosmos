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
import { U02_SCENES } from './universes/u02_coralKingdom';
import { U03_SCENES } from './universes/u03_sugarCloudBakery';
import { U04_SCENES } from './universes/u04_mushroomGlade';
import { U05_SCENES } from './universes/u05_origamiSkyHarbor';
import { U06_SCENES } from './universes/u06_dinoFernValley';
import { U07_SCENES } from './universes/u07_auroraIcePalace';
import { U08_SCENES } from './universes/u08_clockworkToyshop';
import { U09_SCENES } from './universes/u09_sakuraKoiGarden';
import { U10_SCENES } from './universes/u10_melodyMeadow';
import { U11_SCENES } from './universes/u11_crystalGeodeCaverns';
import { U12_SCENES } from './universes/u12_desertStarOasis';
import { U13_SCENES } from './universes/u13_storybookLibrary';
import { U14_SCENES } from './universes/u14_cloudCircusCarnival';
import { U15_SCENES } from './universes/u15_miniatureDeskWorld';
import { U16_SCENES } from './universes/u16_autumnHarvestHollow';
import { U17_SCENES } from './universes/u17_sunflowerGlasshouse';
import { U18_SCENES } from './universes/u18_neonPixelArcade';
import { U19_SCENES } from './universes/u19_jadeDragonPeaks';
import { U20_SCENES } from './universes/u20_nileStarTemples';
import { U21_SCENES } from './universes/u21_prismNexusMultiverse';

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
  ...U02_SCENES,
  ...U03_SCENES,
  ...U04_SCENES,
  ...U05_SCENES,
  ...U06_SCENES,
  ...U07_SCENES,
  ...U08_SCENES,
  ...U09_SCENES,
  ...U10_SCENES,
  ...U11_SCENES,
  ...U12_SCENES,
  ...U13_SCENES,
  ...U14_SCENES,
  ...U15_SCENES,
  ...U16_SCENES,
  ...U17_SCENES,
  ...U18_SCENES,
  ...U19_SCENES,
  ...U20_SCENES,
  ...U21_SCENES,
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
