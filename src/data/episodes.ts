import type { Episode } from '../types';
import jobs from './episodes/jobs-stanford.json';

function normalizeEpisode(ep: Episode): Episode {
  const offset = ep.startTime ?? 0;
  if (offset === 0) return ep;
  return {
    ...ep,
    turns: ep.turns.map((t) => ({ ...t, start: t.start + offset })),
    chapters: ep.chapters?.map((c) => ({
      ...c,
      start: c.start + offset,
      end: c.end + offset,
    })),
  };
}

export const EPISODES: Episode[] = [jobs].map(normalizeEpisode) as Episode[];

export function getEpisodeById(id: string): Episode | undefined {
  return EPISODES.find((e) => e.id === id);
}

export const DEFAULT_EPISODE_ID = 'jobs-stanford';
