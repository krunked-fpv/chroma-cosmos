import { describe, expect, it } from 'vitest';
import { BRANCHES, CHAPTERS, DRAFT_CARDS } from '../../../src/contracts';
import type { ChapterId, DraftCardId, RunCore } from '../../../src/contracts';
import { createRunManager } from '../../../src/roguelike';

function playSlot(rm: ReturnType<typeof createRunManager>, pickIndex = 0, doorIndex = 0): void {
  const phase = rm.completeChapter();
  if (phase === 'complete') return;
  expect(phase).toBe('draft');
  rm.pickDraft(rm.draftOptions()[pickIndex]!);
  const doors = rm.doorOptions();
  rm.chooseDoor(doors[doorIndex]!);
}

describe('run manager', () => {
  it('starts at the rooftop with the standard brush', () => {
    const rm = createRunManager();
    const c = rm.start(42);
    expect(c).toMatchObject({ seed: 42, chapterIndex: 0, path: ['rooftop'], phase: 'chapter', relics: [] });
    expect(c.brushes).toEqual(['standard']);
    expect(rm.currentChapter()).toBe('rooftop');
    expect(rm.core()).toEqual(c);
  });

  it('flow: draft after slots 1-4, doors after 1-3, single finale door after 4, complete after 5', () => {
    const rm = createRunManager();
    rm.start(2026);
    const path: ChapterId[] = ['rooftop'];
    for (let slot = 1; slot <= 4; slot++) {
      expect(rm.completeChapter()).toBe('draft');
      expect(rm.core()!.phase).toBe('draft');
      expect(rm.doorOptions()).toEqual([]); // no doors before the draft is taken
      rm.pickDraft(rm.draftOptions()[0]!);
      expect(rm.core()!.phase).toBe('doors');
      const doors = rm.doorOptions();
      expect(doors).toEqual([...BRANCHES[slot as 1 | 2 | 3 | 4]]);
      expect(doors.length).toBe(slot === 4 ? 1 : 2);
      rm.chooseDoor(doors[slot % 2 === 0 ? doors.length - 1 : 0]!);
      path.push(rm.currentChapter());
      expect(rm.core()!.chapterIndex).toBe(slot);
      expect(CHAPTERS.find((c) => c.id === rm.currentChapter())!.slot).toBe(slot + 1);
    }
    expect(rm.currentChapter()).toBe('heartOfUniverse');
    expect(rm.core()!.path).toEqual(path);
    expect(rm.core()!.phase).toBe('finale');
    expect(rm.completeChapter()).toBe('complete');
    expect(rm.core()!.brushes.length + rm.core()!.relics.length).toBe(5); // standard + 4 drafts
    rm.finish();
    expect(rm.core()).toBeNull();
    expect(() => rm.currentChapter()).toThrow();
  });

  it('draft offers 3 distinct un-owned cards, seeded and stable', () => {
    for (let seed = 1; seed <= 40; seed++) {
      const rm = createRunManager();
      rm.start(seed * 7919);
      const owned = new Set<string>(['standard']);
      for (let slot = 1; slot <= 4; slot++) {
        rm.completeChapter();
        const opts = rm.draftOptions();
        expect(opts).toHaveLength(3);
        expect(new Set(opts).size).toBe(3);
        for (const o of opts) {
          expect(owned.has(o)).toBe(false);
          expect(DRAFT_CARDS.some((d) => d.id === o)).toBe(true);
        }
        expect(rm.draftOptions()).toEqual(opts); // stable between calls
        const pick = opts[seed % 3]!;
        rm.pickDraft(pick);
        owned.add(pick);
        rm.chooseDoor(rm.doorOptions()[0]!);
      }
    }
    // same seed -> same offers; different seeds differ somewhere
    const offer = (seed: number): DraftCardId[] => {
      const rm = createRunManager();
      rm.start(seed);
      rm.completeChapter();
      return rm.draftOptions();
    };
    expect(offer(5)).toEqual(offer(5));
    const variants = new Set(Array.from({ length: 30 }, (_, i) => offer(i + 1).join()));
    expect(variants.size).toBeGreaterThan(5);
  });

  it('picking brushes/relics lands in the right list; invalid picks are rejected', () => {
    const rm = createRunManager();
    rm.start(3);
    expect(() => rm.pickDraft('twinTail')).toThrow(); // not in draft phase
    rm.completeChapter();
    const opts = rm.draftOptions();
    const bad = DRAFT_CARDS.find((d) => !opts.includes(d.id))!.id;
    expect(() => rm.pickDraft(bad)).toThrow();
    const pick = opts[0]!;
    rm.pickDraft(pick);
    const core = rm.core()!;
    const def = DRAFT_CARDS.find((d) => d.id === pick)!;
    if (def.type === 'brush') expect(core.brushes).toContain(pick);
    else expect(core.relics).toContain(pick);
    expect(() => rm.pickDraft(pick)).toThrow(); // already picked
    expect(() => rm.chooseDoor('heartOfUniverse')).toThrow(); // not a door on offer
  });

  it('galaxyName is deterministic from seed + drafted items', () => {
    const play = (seed: number, picks: number[]): string => {
      const rm = createRunManager();
      rm.start(seed);
      for (const p of picks) playSlot(rm, p);
      return rm.galaxyName();
    };
    expect(play(11, [0, 1])).toBe(play(11, [0, 1]));
    expect(play(11, [0, 1])).toMatch(/^The \S+ \S+ \S+$/);
    const names = new Set([play(1, []), play(2, []), play(3, []), play(4, []), play(11, [0]), play(11, [1]), play(11, [2])]);
    expect(names.size).toBeGreaterThan(3);
    expect(play(11, [0])).not.toBe(play(11, [0, 0]));
  });

  it('resume restores a run exactly; core() is a defensive copy', () => {
    const a = createRunManager();
    a.start(99);
    playSlot(a, 1);
    playSlot(a, 0, 1);
    const saved: RunCore = a.core()!;
    saved.brushes.push('zeroGGel'); // mutating the copy must not touch the manager
    expect(a.core()!.brushes).not.toEqual(saved.brushes);
    const snapshot = a.core()!;
    const b = createRunManager();
    b.resume(snapshot);
    expect(b.core()).toEqual(snapshot);
    expect(b.currentChapter()).toBe(a.currentChapter());
    expect(b.draftOptions()).toEqual(a.draftOptions());
    expect(b.doorOptions()).toEqual(a.doorOptions());
    expect(b.galaxyName()).toBe(a.galaxyName());
  });

  it('src/roguelike contains no timers', async () => {
    const { readFileSync } = await import('node:fs');
    const { join } = await import('node:path');
    const text = readFileSync(join(__dirname, '../../../src/roguelike/index.ts'), 'utf8');
    expect(text).not.toMatch(/setTimeout|setInterval/);
  });
});
