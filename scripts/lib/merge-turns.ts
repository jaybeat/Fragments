import type { RawSegment } from './youtube-api.ts';

export interface Turn {
  who: string;
  start: number;
  text: string;
}

export interface MergeOptions {
  speaker: string;
  maxDurSec?: number;
  startTime?: number;
}

const SENTENCE_END = /[.!?;][)"'”’\]]?\s*$/;

export function mergeIntoTurns(segments: RawSegment[], opts: MergeOptions): Turn[] {
  const { speaker, maxDurSec = 15, startTime = 0 } = opts;

  const shifted = segments
    .map((s) => ({ ...s, offset: s.offset - startTime }))
    .filter((s) => s.offset + s.duration > 0);

  const turns: Turn[] = [];
  let buf: string[] = [];
  let bufStart = 0;

  for (const s of shifted) {
    const cleaned = s.text.replace(/\s+/g, ' ').trim();
    if (!cleaned) continue;

    if (buf.length === 0) bufStart = Math.max(0, s.offset);
    buf.push(cleaned);

    const joined = buf.join(' ');
    const endsAtSentence = SENTENCE_END.test(joined);
    const span = s.offset + s.duration - bufStart;
    const tooLong = span >= maxDurSec;

    if (endsAtSentence || tooLong) {
      turns.push({ who: speaker, start: Math.round(bufStart), text: joined });
      buf = [];
    }
  }
  if (buf.length) {
    turns.push({ who: speaker, start: Math.round(bufStart), text: buf.join(' ') });
  }
  return turns;
}
