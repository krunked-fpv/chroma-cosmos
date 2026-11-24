/** Roguelike voyage contracts (20 Astral Pencil Tin upgrades: 10 Active Brushes + 10 Passive Sticker Relics). */
export type ChapterId =
  | 'rooftop' | 'milkshakeNebula' | 'asteroidGarden' | 'cheetahSavannah'
  | 'saturnRings' | 'bubbleTea' | 'whaleSea' | 'heartOfUniverse';
export type SceneId = ChapterId | 'bedroomHub';

export interface ChapterDef {
  id: ChapterId;
  slot: 1 | 2 | 3 | 4 | 5;
  title: string;
  subtitle: string;
  code: string;
}

export const CHAPTERS: readonly ChapterDef[] = [
  { id: 'rooftop', slot: 1, title: "Violet's Rooftop Launchpad", subtitle: 'Wake Lumi & Nova as twilight lifts into orbit', code: 'R' },
  { id: 'milkshakeNebula', slot: 2, title: 'The Rainbow Milkshake Nebula', subtitle: 'A swirly, sip-able sky', code: 'M' },
  { id: 'asteroidGarden', slot: 2, title: 'The Whispering Asteroid Garden', subtitle: 'Crystal rocks that hum secrets', code: 'A' },
  { id: 'cheetahSavannah', slot: 3, title: 'The Starlight Cheetah Savannah of Orion', subtitle: 'Swaying cosmic grass under binary suns', code: 'S' },
  { id: 'saturnRings', slot: 3, title: 'The Crystal Unicorn Rings of Saturn', subtitle: 'Gallop along glittering rings', code: 'U' },
  { id: 'bubbleTea', slot: 4, title: 'Zero-G Bubble Tea Station', subtitle: 'Pearls floating everywhere', code: 'B' },
  { id: 'whaleSea', slot: 4, title: 'The Whale-Song Constellation Sea', subtitle: 'Star-whales sing the night awake', code: 'W' },
  { id: 'heartOfUniverse', slot: 5, title: 'The Heart of the Universe', subtitle: 'Ignite a galaxy with everything you drafted', code: 'H' },
] as const;

/** Doors appear after slots 1..3; after slot 4 there is a single finale door. */
export const BRANCHES: Readonly<Record<1 | 2 | 3 | 4, readonly ChapterId[]>> = {
  1: ['milkshakeNebula', 'asteroidGarden'],
  2: ['cheetahSavannah', 'saturnRings'],
  3: ['bubbleTea', 'whaleSea'],
  4: ['heartOfUniverse'],
} as const;

/** Order preserved for bitfield backward-compatibility: indices 0..4 are Sprint 1, 5..10 are Sprint 2. */
export const ACTIVE_BRUSH_IDS = [
  'turboCheetah',
  'twinTail',
  'supernovaSponge',
  'zeroGGel',
  'cometMeteor',
  'prismRoller',
  'starlightBubble',
  'nebulaCloudPuff',
  'lightningWhisker',
  'moonbeamQuill',
] as const;

export type ActiveBrushId = (typeof ACTIVE_BRUSH_IDS)[number];
export type BrushId = 'standard' | ActiveBrushId;

/** Order preserved for bitfield backward-compatibility: indices 0..3 are Sprint 1, 4..9 are Sprint 2. */
export const RELIC_IDS = [
  'zoomiePaw',
  'prismRibbon',
  'uvFlashlight',
  'kaleidoSharpener',
  'sleepyMoonCat',
  'gravityFlipFlop',
  'doubleMilkshake',
  'starlightMagnet',
  'chromaticButterfly',
  'constellationCrown',
] as const;

export type RelicId = (typeof RELIC_IDS)[number];
export type DraftCardId = ActiveBrushId | RelicId;

export interface DraftCardDef {
  id: DraftCardId;
  type: 'brush' | 'relic';
  name: string;
  /** Short <=2-word charm tag shown when a relic triggers or brush is selected. */
  shortTag: string;
  description: string;
}

export const DRAFT_CARDS: readonly DraftCardDef[] = [
  // 10 Active Magical Brushes
  { id: 'turboCheetah', type: 'brush', name: 'Turbo Cheetah Marker', shortTag: 'Turbo Marker', description: 'A wide, zoomy stroke! Things you color move twice as fast and burst into bonus sparks when poked.' },
  { id: 'twinTail', type: 'brush', name: 'Twin-Tail Unicorn Brush', shortTag: 'Twin Brush', description: 'Paints two swirly aurora ribbons at once and splashes extra color onto the neighbors.' },
  { id: 'supernovaSponge', type: 'brush', name: 'Supernova Stamp Sponge', shortTag: 'Star Sponge', description: 'One tap blooms a giant ripple of watercolor across star clusters and asteroids.' },
  { id: 'zeroGGel', type: 'brush', name: 'Zero-Gravity Gel Pen', shortTag: 'Zero-G Pen', description: 'Awake things float away and bounce off Lumi, Nova and the comets.' },
  { id: 'cometMeteor', type: 'brush', name: 'Comet-Tail Meteor Brush', shortTag: 'Meteor Brush', description: 'Blazing meteor strokes streak ahead in starry trails and splash bonus color down the path.' },
  { id: 'prismRoller', type: 'brush', name: 'Prism Kaleidoscope Roller', shortTag: 'Prism Roller', description: 'Wide stained-glass paint roller that stamps shimmering mirror-dots across big shapes.' },
  { id: 'starlightBubble', type: 'brush', name: 'Starlight Bubble Wand', shortTag: 'Bubble Wand', description: 'Blows iridescent Starlight Bubbles while painting that pop into bonus color splashes.' },
  { id: 'nebulaCloudPuff', type: 'brush', name: 'Nebula Cloud-Puff Sponge', shortTag: 'Cloud Sponge', description: 'Fluffy cloud-puff dabs softly mist neighboring pieces of the same character at once.' },
  { id: 'lightningWhisker', type: 'brush', name: 'Lightning Whisker Liner', shortTag: 'Spark Liner', description: 'Electric cheetah-whisker arcs zap tiny uncolored corners automatically once a shape is halfway done.' },
  { id: 'moonbeamQuill', type: 'brush', name: 'Moonbeam Feather Quill', shortTag: 'Moon Quill', description: 'Silky gilded feather nib glides smoothly with moonlit ribbons that fill shapes extra fast.' },
  // 10 Passive Holographic Sticker Relics
  { id: 'zoomiePaw', type: 'relic', name: "Nova's Zoomie Paw-Print", shortTag: 'Zoomie Paw', description: 'Finish a star or comet and Nova zooms across to color a bonus doodle in 24K gold.' },
  { id: 'prismRibbon', type: 'relic', name: "Lumi's Prism Ribbon", shortTag: 'Prism Ribbon', description: 'Wake 3 regions with 3 different mediums to rain a sky-wide rainbow of Stardust Gems.' },
  { id: 'uvFlashlight', type: 'relic', name: "Violet's Secret UV Flashlight", shortTag: 'UV Light', description: 'Glide near the dark to reveal hidden ghostly constellation creatures to color.' },
  { id: 'kaleidoSharpener', type: 'relic', name: 'Kaleidoscope Sharpener', shortTag: 'Kaleido Comets', description: 'Every finished region fires 3 paint-splatter comets that fill nearby spots with shimmering foil.' },
  { id: 'sleepyMoonCat', type: 'relic', name: 'Sleepy Moon-Cat Sticker', shortTag: 'Moon-Cat', description: 'Summons a cozy Sleepy Moon-Cat friend who purrs beside unpainted shapes and softly colors them.' },
  { id: 'gravityFlipFlop', type: 'relic', name: 'Gravity Flip-Flop Sticker', shortTag: 'Flip-Flop', description: 'Poked friends bounce in buoyant zero-G arcs and pop bonus Stardust Gems on your first poke.' },
  { id: 'doubleMilkshake', type: 'relic', name: 'Double-Scoop Milkshake Charm', shortTag: 'Double Scoop', description: 'Every completed Story Medallion pours a sweet double scoop with +2 bonus Stardust Gems.' },
  { id: 'starlightMagnet', type: 'relic', name: 'Starlight Magnet Compass', shortTag: 'Star Magnet', description: 'Gently pulls floating Stardust Gems and hidden stars across the page straight into your crystal jar.' },
  { id: 'chromaticButterfly', type: 'relic', name: 'Chromatic Echo Butterfly', shortTag: 'Echo Wing', description: 'A shimmering butterfly flutters from completed shapes to echo extra pigment onto your next quest.' },
  { id: 'constellationCrown', type: 'relic', name: 'Constellation Crown Seal', shortTag: 'Crown Seal', description: 'Royal starlight seal blooms Story Medallions even earlier (74%) with golden crown fireworks.' },
] as const;

export type RunPhase = 'chapter' | 'draft' | 'doors' | 'finale';

export interface RunCore {
  seed: number;
  chapterIndex: 0 | 1 | 2 | 3 | 4;
  path: ChapterId[];
  brushes: BrushId[];
  relics: RelicId[];
  phase: RunPhase;
}

export interface RunManagerPort {
  start(seed: number): RunCore;
  resume(c: RunCore): void;
  core(): RunCore | null;
  currentChapter(): ChapterId;
  /** Advances phase: slots 1..4 -> 'draft'; after draft -> 'doors'; slot 5 -> 'complete'. */
  completeChapter(): RunPhase | 'complete';
  draftOptions(): DraftCardId[];
  pickDraft(id: DraftCardId): void;
  doorOptions(): ChapterId[];
  chooseDoor(id: ChapterId): void;
  galaxyName(): string;
  finish(): void;
}
