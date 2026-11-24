/** Env-gated visual previews: PREVIEW=1 npx vitest run tests/unit/art/preview.test.ts */
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { createArt } from '../../../src/art';
import type { ActorKind } from '../../../src/contracts/art';
import { WARDROBE_ITEMS, type WardrobeState } from '../../../src/contracts/progression';
import type { SceneId } from '../../../src/contracts/roguelike';
import { encodePng, spriteSheetImage } from './helpers/png';

const OUT = process.env.PREVIEW_DIR ?? 'C:/Users/alexg/.gemini/antigravity/brain/89d93c47-15aa-4ee2-bd85-ae10a079bb0b/previews';
const SCENES: SceneId[] = ['rooftop', 'milkshakeNebula', 'asteroidGarden', 'cheetahSavannah', 'saturnRings', 'bubbleTea', 'whaleSea', 'heartOfUniverse', 'bedroomHub'];
const KINDS: ActorKind[] = ['violet', 'lumi', 'nova', 'moonCat', 'comet', 'whale', 'gazelle', 'cometCar', 'flower', 'gem', 'butterfly', 'bubble'];
const NONE = Object.fromEntries(WARDROBE_ITEMS.map((w) => [w.id, false])) as WardrobeState;
const ALL = Object.fromEntries(WARDROBE_ITEMS.map((w) => [w.id, true])) as WardrobeState;

describe.skipIf(!process.env.PREVIEW)('visual previews', () => {
  const art = createArt();
  const only = process.env.PREVIEW_ONLY?.split(',');
  mkdirSync(OUT, { recursive: true });

  it('writes scene PNGs (line art + coloured, scale 3)', () => {
    for (const id of SCENES) {
      if (only && !only.includes(id)) continue;
      const page = art.compilePage(id, 7, NONE);
      writeFileSync(join(OUT, `${id}-line.png`), encodePng(art.renderPreview(page, { colored: false, scale: 3 })));
      writeFileSync(join(OUT, `${id}-color.png`), encodePng(art.renderPreview(page, { colored: true, scale: 3 })));
    }
    expect(true).toBe(true);
  });

  it('writes sprite sheets', () => {
    for (const k of KINDS) {
      if (only && !only.includes(k)) continue;
      writeFileSync(join(OUT, `sprites-${k}.png`), encodePng(spriteSheetImage(art.sprites(NONE), [k], 5)));
    }
    writeFileSync(join(OUT, 'sprites-wardrobe.png'), encodePng(spriteSheetImage(art.sprites(ALL), ['violet', 'lumi', 'nova'], 4)));
    writeFileSync(join(OUT, 'sprites-strip.png'), encodePng(spriteSheetImage(art.sprites(NONE), KINDS, 3)));
    expect(true).toBe(true);
  });
});
