import type { Episode } from '../types';

interface WordToken {
  text: string;
  space: boolean;
  start?: number;
  end?: number;
}

export interface TokenizedTurn {
  who: string;
  start: number;
  end: number;
  text: string;
  words: WordToken[];
}

export function tokenizeEpisode(episode: Episode): TokenizedTurn[] {
  const turns = episode.turns;
  return turns.map((t, i) => {
    const end = turns[i + 1] ? turns[i + 1].start - 0.2 : episode.duration;
    const tokens = t.text.split(/(\s+)/);
    const wordCount = tokens.filter((w) => w.trim().length > 0).length;
    const perWord = (end - t.start) / Math.max(1, wordCount);
    let wi = 0;
    const words: WordToken[] = tokens.map((w) => {
      if (!w.trim()) return { text: w, space: true };
      const ws = t.start + wi * perWord;
      wi++;
      return { text: w, space: false, start: ws, end: ws + perWord };
    });
    return { ...t, end, words };
  });
}
