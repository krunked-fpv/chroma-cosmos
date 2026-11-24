/** Roguelike voyage contracts. */
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

export type BrushId = 'standard' | 'turboCheetah' | 'twinTail' | 'supernovaSponge' | 'zeroGGel';
export type RelicId = 'zoomiePaw' | 'prismRibbon' | 'uvFlashlight' | 'kaleidoSharpener';
export type DraftCardId = Exclude<BrushId, 'standard'> | RelicId;

export interface DraftCardDef {
  id: DraftCardId;
  type: 'brush' | 'relic';
  name: string;
  description: string;
}

export const DRAFT_CARDS: readonly DraftCardDef[] = [
  { id: 'turboCheetah', type: 'brush', name: 'Turbo Cheetah Marker', description: 'A wide, zoomy stroke! Things you color move twice as fast and burst into bonus sparks when poked.' },
  { id: 'twinTail', type: 'brush', name: 'Twin-Tail Unicorn Brush', description: 'Paints two swirly aurora ribbons at once and splashes extra color onto the neighbors.' },
  { id: 'supernovaSponge', type: 'brush', name: 'Supernova Stamp Sponge', description: 'One tap blooms a giant ripple of watercolor across star clusters and asteroids.' },
  { id: 'zeroGGel', type: 'brush', name: 'Zero-Gravity Gel Pen', description: 'Awake things float away and bounce off Lumi, Nova and the comets.' },
  { id: 'zoomiePaw', type: 'relic', name: "Nova's Zoomie Paw-Print", description: 'Finish a star or comet and Nova zooms across to color a bonus doodle in 24K gold.' },
  { id: 'prismRibbon', type: 'relic', name: "Lumi's Prism Ribbon", description: 'Wake 3 regions with 3 different mediums to rain a sky-wide rainbow of Stardust Gems.' },
  { id: 'uvFlashlight', type: 'relic', name: "Violet's Secret UV Flashlight", description: 'Glide near the dark to reveal hidden ghostly constellation creatures to color.' },
  { id: 'kaleidoSharpener', type: 'relic', name: 'Kaleidoscope Sharpener', description: 'Every finished region fires 3 paint-splatter comets that fill nearby spots with shimmering foil.' },
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
