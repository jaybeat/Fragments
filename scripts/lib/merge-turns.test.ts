import { describe, it, expect } from 'vitest';
import { mergeIntoTurns } from './merge-turns';
import type { RawSegment } from './youtube-api';

function makeSegments(items: [number, number, string][]): RawSegment[] {
  return items.map(([offset, duration, text]) => ({ offset, duration, text }));
}

describe('mergeIntoTurns', () => {
  it('merges simple segments into sentence turns', () => {
    const segs = makeSegments([
      [0, 2, 'Hello world.'],
      [2, 2, 'How are you?'],
    ]);
    const turns = mergeIntoTurns(segs, { speaker: 'A' });
    expect(turns).toHaveLength(2);
    expect(turns[0].text).toBe('Hello world.');
    expect(turns[1].text).toBe('How are you?');
  });

  it('applies startTime offset', () => {
    const segs = makeSegments([
      [10, 2, 'Hello.'],
      [12, 2, 'World.'],
    ]);
    const turns = mergeIntoTurns(segs, { speaker: 'A', startTime: 10 });
    expect(turns[0].start).toBe(0);
    expect(turns[1].start).toBe(2);
  });

  it('filters out segments before startTime', () => {
    const segs = makeSegments([
      [0, 2, 'Before.'],
      [10, 2, 'After.'],
    ]);
    const turns = mergeIntoTurns(segs, { speaker: 'A', startTime: 5 });
    expect(turns).toHaveLength(1);
    expect(turns[0].text).toBe('After.');
  });

  it('filters out segments after endTime', () => {
    const segs = makeSegments([
      [0, 2, 'Before.'],
      [20, 2, 'After.'],
    ]);
    const turns = mergeIntoTurns(segs, { speaker: 'A', endTime: 15 });
    expect(turns).toHaveLength(1);
    expect(turns[0].text).toBe('Before.');
  });

  it('splits at sentence boundaries', () => {
    const segs = makeSegments([
      [0, 1, 'First'],
      [1, 1, 'sentence.'],
      [2, 1, 'Second'],
      [3, 1, 'one.'],
    ]);
    const turns = mergeIntoTurns(segs, { speaker: 'A' });
    expect(turns).toHaveLength(2);
    expect(turns[0].text).toBe('First sentence.');
    expect(turns[1].text).toBe('Second one.');
  });

  it('forces split when maxDurSec exceeded', () => {
    const segs = makeSegments([
      [0, 1, 'A'],
      [1, 1, 'long'],
      [2, 1, 'sentence'],
      [3, 1, 'without'],
      [4, 1, 'stops'],
    ]);
    const turns = mergeIntoTurns(segs, { speaker: 'A', maxDurSec: 3 });
    expect(turns.length).toBeGreaterThanOrEqual(2);
  });

  it('returns empty array when no segments remain after filtering', () => {
    const segs = makeSegments([[0, 1, 'Only.']]);
    const turns = mergeIntoTurns(segs, { speaker: 'A', startTime: 10 });
    expect(turns).toHaveLength(0);
  });
});
