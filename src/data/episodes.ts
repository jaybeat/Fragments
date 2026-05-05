import type { Episode } from '../types';
import jobs from './episodes/jobs-stanford.analyzed.json';
import lostInterview from './episodes/jobs-lost-interview.analyzed.json';
import jobsInterview1990 from './episodes/jobs-interview-1990.analyzed.json';
import buffettFlorida1998 from './episodes/buffett-florida-1998.analyzed.json';
import feynmanFunToImagine from './episodes/feynman-fun-to-imagine.analyzed.json';

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
    t_segments: ep.t_segments?.map((s) => ({
      ...s,
      start_sec: s.start_sec + offset,
      end_sec: s.end_sec + offset,
    })),
    p_segments: ep.p_segments?.map((s) => ({
      ...s,
      start_sec: s.start_sec + offset,
      end_sec: s.end_sec + offset,
    })),
  };
}

export const EPISODES: Episode[] = [jobs, lostInterview, jobsInterview1990, buffettFlorida1998, feynmanFunToImagine].map(
  normalizeEpisode
) as Episode[];

export function getEpisodeById(id: string): Episode | undefined {
  return EPISODES.find((e) => e.id === id);
}

export const DEFAULT_EPISODE_ID = 'jobs-stanford';
