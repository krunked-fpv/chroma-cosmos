/**
 * Hi-Bit Pixel-Art UI Sprite Registry & Metadata.
 * Strictly zero inline SVG path doodles — every UI icon renders via
 * deterministic integer-scaled Hi-Bit pixel canvases requested through `IllustrationCache`.
 */
import type { HeroQuestId, UiSpriteId } from '../contracts/art';
import type { AudioLevel } from '../contracts/audio';
import type { BadgeId } from '../contracts/progression';
import { DRAFT_CARDS, type BrushId, type RelicId } from '../contracts/roguelike';

export const AUDIO_SPRITE: Record<AudioLevel, UiSpriteId> = {
  0: 'tool_audio_0',
  1: 'tool_audio_1',
  2: 'tool_audio_2',
  3: 'tool_audio_3',
};

export const AUDIO_LABEL: Record<AudioLevel, string> = {
  3: 'Sound: Loud (tap to soften)',
  2: 'Sound: Warm (tap to soften)',
  1: 'Sound: Whisper (tap to hush)',
  0: 'Sound: Hushed (tap to wake music)',
};

export const BRUSH_NAMES: Record<BrushId, string> = {
  standard: 'Enchanted Star Pencil',
  turboCheetah: 'Turbo Cheetah Marker',
  twinTail: 'Twin-Tail Unicorn Brush',
  supernovaSponge: 'Supernova Stamp Sponge',
  zeroGGel: 'Zero-Gravity Gel Pen',
  cometMeteor: 'Comet-Tail Meteor Brush',
  prismRoller: 'Prism Kaleidoscope Roller',
  starlightBubble: 'Starlight Bubble Wand',
  nebulaCloudPuff: 'Nebula Cloud-Puff Sponge',
  lightningWhisker: 'Lightning Whisker Liner',
  moonbeamQuill: 'Moonbeam Feather Quill',
};

/** Strictly <= 4 words whisper micro-tag copy for each brush tip. */
export const BRUSH_TAGS: Record<BrushId, string> = {
  standard: 'Enchanted star tip',
  turboCheetah: 'Turbo Cheetah stroke',
  twinTail: 'Twin-Tail ribbons',
  supernovaSponge: 'Supernova stamp bloom',
  zeroGGel: 'Zero-G float pen',
  cometMeteor: 'Comet meteor streak',
  prismRoller: 'Prism mirror roller',
  starlightBubble: 'Starlight bubble wand',
  nebulaCloudPuff: 'Nebula cloud sponge',
  lightningWhisker: 'Lightning spark liner',
  moonbeamQuill: 'Moonbeam feather quill',
};

/** Strictly <= 2 words charm whisper tag for each passive Holographic Sticker Relic. */
export const RELIC_TAGS: Record<RelicId, string> = {
  zoomiePaw: 'Zoomie Paw',
  prismRibbon: 'Prism Ribbon',
  uvFlashlight: 'UV Light',
  kaleidoSharpener: 'Kaleido Comets',
  sleepyMoonCat: 'Moon-Cat',
  gravityFlipFlop: 'Flip-Flop',
  doubleMilkshake: 'Double Scoop',
  starlightMagnet: 'Star Magnet',
  chromaticButterfly: 'Echo Wing',
  constellationCrown: 'Crown Seal',
};

export const QUEST_SPRITE: Record<HeroQuestId, UiSpriteId> = {
  violet: 'quest_violet',
  lumi: 'quest_lumi',
  nova: 'quest_nova',
  rocket: 'quest_rocket',
  planet: 'quest_planet',
  cloud: 'quest_cloud',
  milkshake: 'quest_milkshake',
  asteroid: 'quest_asteroid',
  moonCat: 'quest_moonCat',
  suns: 'quest_suns',
  boba: 'quest_boba',
  whale: 'quest_whale',
  heart: 'quest_heart',
  comet: 'quest_comet',
};

export const STATION_SPRITE = {
  paintbox: 'tool_hub_paintbox',
  wardrobe: 'tool_hub_wardrobe',
  bookshelf: 'tool_hub_bookshelf',
  trinkets: 'tool_hub_trinkets',
} as const satisfies Record<string, UiSpriteId>;

export const BADGE_SPRITE: Record<BadgeId, UiSpriteId> = {
  firstBloom: 'tool_star',
  lumiFriend: 'quest_lumi',
  novaFriend: 'quest_nova',
  causalityExplorer: 'tool_wand',
  rainbowMaster: 'tool_hub_paintbox',
  firstRun: 'tool_voyage_seal',
  threeRuns: 'quest_comet',
  fiveRuns: 'tool_crown',
};

export function relicShortTag(relic: RelicId, explicitTag?: string): string {
  const fallback = DRAFT_CARDS.find((c) => c.id === relic)?.shortTag ?? RELIC_TAGS[relic] ?? relic;
  return clampWords(explicitTag && explicitTag.trim() ? explicitTag : fallback, 2);
}

/** Clamp any whisper micro-tag text strictly to `<= maxWords` words (default 4). */
export function clampWords(text: string, maxWords = 4): string {
  const words = text.trim().split(/\s+/).filter(Boolean);
  return words.slice(0, maxWords).join(' ');
}
