import { describe, it, expect } from 'vitest';
import { tokenizeEpisode } from './tokenize';
import type { Episode } from '../types';

function makeEpisode(
  turns: { start: number; text: string; who?: string }[],
  duration = 100
): Episode {
  return {
    id: 'test',
    videoId: 'TESTVIDEOID01',
    title: 'Test',
    subtitle: 'TBD',
    speakerName: 'Speaker',
    speakerAvatar: '',
    duration,
    turns: turns.map((t) => ({ who: t.who ?? 'Speaker', start: t.start, text: t.text })),
  };
}

describe('tokenizeEpisode', () => {
  it('assigns time proportional to character count for equal words', () => {
    const ep = makeEpisode([{ start: 0, text: 'hello world' }], 10);
    const result = tokenizeEpisode(ep);
    const words = result[0].words.filter((w) => !w.space);
    expect(words[0].text).toBe('hello');
    expect(words[1].text).toBe('world');
    expect(words[0].end! - words[0].start!).toBeCloseTo(5, 1);
    expect(words[1].end! - words[1].start!).toBeCloseTo(5, 1);
  });

  it('gives longer words more time', () => {
    const ep = makeEpisode([{ start: 0, text: 'a supercalifragilistic' }], 21);
    const result = tokenizeEpisode(ep);
    const words = result[0].words.filter((w) => !w.space);
    expect(words[0].text).toBe('a');
    expect(words[1].text).toBe('supercalifragilistic');
    const aDuration = words[0].end! - words[0].start!;
    const superDuration = words[1].end! - words[1].start!;
    expect(superDuration).toBeGreaterThan(aDuration);
    expect(superDuration / aDuration).toBeCloseTo(20, 0);
  });

  it('sets space tokens without timing', () => {
    const ep = makeEpisode([{ start: 0, text: 'hello world' }], 10);
    const result = tokenizeEpisode(ep);
    const spaces = result[0].words.filter((w) => w.space);
    expect(spaces.length).toBe(1);
    expect(spaces[0].start).toBeUndefined();
    expect(spaces[0].end).toBeUndefined();
  });

  it('uses episode.duration for the last turn end', () => {
    const ep = makeEpisode(
      [
        { start: 0, text: 'one' },
        { start: 5, text: 'two' },
      ],
      12
    );
    const result = tokenizeEpisode(ep);
    expect(result[0].end).toBeCloseTo(4.8, 1);
    expect(result[1].end).toBe(12);
  });

  it('handles empty text gracefully', () => {
    const ep = makeEpisode([{ start: 0, text: '' }], 10);
    const result = tokenizeEpisode(ep);
    expect(result[0].words).toHaveLength(0);
  });
});
