/**
 * Roguelike run manager. Seeded (own mulberry32 copy), deterministic, no timers.
 *
 * Phase flow: start -> chapter(slot 1). completeChapter(): slots 1..4 -> 'draft'; pickDraft -> 'doors';
 * chooseDoor -> next chapter ('chapter', or 'finale' while playing slot 5); slot 5 -> 'complete'.
 */
import { BRANCHES, CHAPTERS, DRAFT_CARDS } from '../contracts';
import type { BrushId, ChapterId, DraftCardId, RelicId, RunCore, RunManagerPort, RunPhase } from '../contracts';

export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function hashString(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

const NAME_A = ['Sparkle-Paws', 'Moonbeam', 'Gumdrop', 'Twinkle-Whisker', 'Cuddle-Comet', 'Marshmallow', 'Jellybean', 'Starry-Snout'];
const NAME_B = ['Aurora', 'Cotton-Candy', 'Velvet', 'Holo-Foil', 'Prism', 'Nebula-Pop', 'Opal', 'Sherbet'];
const NAME_C = ['Spiral', 'Nebula', 'Cluster', 'Constellation', 'Whirl', 'Garden', 'Lagoon', 'Galaxy'];

/** Drafted item -> flavour word that steers the galaxy name. */
const CARD_WORD: Record<DraftCardId, string> = {
  turboCheetah: 'Zoomie',
  twinTail: 'Unicorn',
  supernovaSponge: 'Supernova',
  zeroGGel: 'Floaty',
  zoomiePaw: 'Paw-Print',
  prismRibbon: 'Rainbow',
  uvFlashlight: 'Glow',
  kaleidoSharpener: 'Kaleido',
};

function clone(c: RunCore): RunCore {
  return { ...c, path: c.path.slice(), brushes: c.brushes.slice(), relics: c.relics.slice() };
}

class RunManager implements RunManagerPort {
  private c: RunCore | null = null;
  private done = false;

  private need(): RunCore {
    if (!this.c) throw new Error('no run in progress');
    return this.c;
  }

  start(seed: number): RunCore {
    this.c = { seed: seed >>> 0, chapterIndex: 0, path: ['rooftop'], brushes: ['standard'], relics: [], phase: 'chapter' };
    this.done = false;
    return clone(this.c);
  }

  resume(core: RunCore): void {
    this.c = clone(core);
    this.done = false;
  }

  core(): RunCore | null {
    return this.c ? clone(this.c) : null;
  }

  currentChapter(): ChapterId {
    const c = this.need();
    return c.path[c.chapterIndex] ?? 'rooftop';
  }

  completeChapter(): RunPhase | 'complete' {
    const c = this.need();
    if (c.phase !== 'chapter' && c.phase !== 'finale') throw new Error(`cannot complete chapter in phase ${c.phase}`);
    const slot = this.slotOf(this.currentChapter());
    if (slot >= 5) {
      this.done = true;
      c.phase = 'finale';
      return 'complete';
    }
    c.phase = 'draft';
    return 'draft';
  }

  private slotOf(id: ChapterId): number {
    return CHAPTERS.find((ch) => ch.id === id)?.slot ?? 1;
  }

  draftOptions(): DraftCardId[] {
    const c = this.need();
    const owned = new Set<string>([...c.brushes, ...c.relics]);
    const pool = DRAFT_CARDS.filter((d) => !owned.has(d.id)).map((d) => d.id);
    const rng = mulberry32((c.seed ^ Math.imul(c.chapterIndex + 1, 0x9e3779b1)) >>> 0);
    // seeded Fisher-Yates, then take 3 (distinct by construction)
    for (let i = pool.length - 1; i > 0; i--) {
      const j = Math.floor(rng() * (i + 1));
      const t = pool[i]!;
      pool[i] = pool[j]!;
      pool[j] = t;
    }
    return pool.slice(0, 3);
  }

  pickDraft(id: DraftCardId): void {
    const c = this.need();
    if (c.phase !== 'draft') throw new Error('not in draft phase');
    if (!this.draftOptions().includes(id)) throw new Error(`card ${id} is not on offer`);
    const def = DRAFT_CARDS.find((d) => d.id === id)!;
    if (def.type === 'brush') c.brushes.push(id as BrushId);
    else c.relics.push(id as RelicId);
    c.phase = 'doors';
  }

  doorOptions(): ChapterId[] {
    const c = this.need();
    const slot = this.slotOf(this.currentChapter());
    if (slot < 1 || slot > 4) return [];
    if (c.phase !== 'doors') return [];
    return BRANCHES[slot as 1 | 2 | 3 | 4].slice();
  }

  chooseDoor(id: ChapterId): void {
    const c = this.need();
    if (c.phase !== 'doors') throw new Error('not at the doors');
    if (!this.doorOptions().includes(id)) throw new Error(`door ${id} is not available`);
    c.path.push(id);
    c.chapterIndex = (c.chapterIndex + 1) as RunCore['chapterIndex'];
    c.phase = this.slotOf(id) >= 5 ? 'finale' : 'chapter';
  }

  galaxyName(): string {
    const c = this.need();
    const drafted: string[] = [...c.brushes.filter((b) => b !== 'standard'), ...c.relics];
    const rng = mulberry32((c.seed ^ hashString(drafted.slice().sort().join('|'))) >>> 0);
    const pick = <T,>(list: readonly T[]): T => list[Math.floor(rng() * list.length)]!;
    const first = drafted[0] as DraftCardId | undefined;
    const last = drafted[drafted.length - 1] as DraftCardId | undefined;
    const a = first ? `${CARD_WORD[first]}-${pick(['Paws', 'Whiskers', 'Tails', 'Sparks'])}` : pick(NAME_A);
    const b = last && last !== first ? CARD_WORD[last] : pick(NAME_B);
    return `The ${a} ${b} ${pick(NAME_C)}`;
  }

  finish(): void {
    this.c = null;
    this.done = false;
  }
}

export function createRunManager(): RunManagerPort {
  return new RunManager();
}
