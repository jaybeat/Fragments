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
  textCn?: string;
  words: WordToken[];
}

export function tokenizeEpisode(episode: Episode): TokenizedTurn[] {
  const turns = episode.turns;
  return turns.map((t, i) => {
    const end = turns[i + 1] ? turns[i + 1].start - 0.2 : episode.duration;
    if (!t.text.trim()) {
      return { ...t, end, words: [] };
    }
    const tokens = t.text.split(/(\s+)/);
    const wordTokens = tokens.filter((w) => w.trim().length > 0);
    const totalChars = wordTokens.reduce((sum, w) => sum + w.length, 0);
    const duration = end - t.start;
    let accumulated = 0;
    const words: WordToken[] = tokens.map((w) => {
      if (!w.trim()) return { text: w, space: true };
      const wordDuration = totalChars > 0 ? (w.length / totalChars) * duration : 0;
      const ws = t.start + accumulated;
      accumulated += wordDuration;
      return { text: w, space: false, start: ws, end: ws + wordDuration };
    });
    return { ...t, end, words };
  });
}
