/** Sprite library assembly: wardrobe overlays are merged into the characters' frames. */
import type { SpriteLibrary, SpriteSheet } from '../../contracts/art';
import type { WardrobeState } from '../../contracts/progression';
import { buildViolet } from './violet';
import { buildLumi } from './lumi';
import { buildNova } from './nova';
import { buildCometCar, buildComet, buildFlower, buildGazelle, buildGem, buildMoonCat, buildWhale } from './small';

const cache = new Map<string, SpriteLibrary>();

function key(w: WardrobeState): string {
  return [w.violetPins, w.violetCape, w.lumiWings, w.lumiCrown, w.novaBoosters, w.novaScarf].map((b) => (b ? '1' : '0')).join('');
}

export function buildSprites(w: WardrobeState): SpriteLibrary {
  const k = key(w);
  const hit = cache.get(k);
  if (hit) return hit;
  const lib: Record<string, SpriteSheet> = {
    violet: buildViolet(w),
    lumi: buildLumi(w),
    nova: buildNova(w),
    moonCat: buildMoonCat(),
    comet: buildComet(),
    whale: buildWhale(),
    gazelle: buildGazelle(),
    cometCar: buildCometCar(),
    flower: buildFlower(),
    gem: buildGem(),
  };
  const out = lib as unknown as SpriteLibrary;
  cache.set(k, out);
  return out;
}
