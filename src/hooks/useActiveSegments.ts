import { useMemo } from 'react';
import type { Episode, TSegment, PSegment } from '../types';

export function useActiveSegments(episode: Episode, currentTime: number) {
  const { activeT, activeP } = useMemo(() => {
    const ts = episode.t_segments ?? [];
    const ps = episode.p_segments ?? [];

    let activeT: TSegment | null = null;
    for (let i = ts.length - 1; i >= 0; i--) {
      if (currentTime >= ts[i].start_sec) {
        activeT = ts[i];
        break;
      }
    }
    if (!activeT && ts.length > 0) {
      activeT = ts[0];
    }

    let activeP: PSegment | null = null;
    for (let i = ps.length - 1; i >= 0; i--) {
      if (currentTime >= ps[i].start_sec) {
        activeP = ps[i];
        break;
      }
    }
    if (!activeP && ps.length > 0) {
      activeP = ps[0];
    }

    return { activeT, activeP };
  }, [episode, currentTime]);

  const tSegments = useMemo(() => {
    return (episode.t_segments ?? []).slice().sort((a, b) => a.start_sec - b.start_sec);
  }, [episode.t_segments]);

  const pSegmentsByT = useMemo(() => {
    const map = new Map<string, PSegment[]>();
    const ps = (episode.p_segments ?? []).slice().sort((a, b) => a.start_sec - b.start_sec);
    for (const p of ps) {
      const arr = map.get(p.parent_t_id) ?? [];
      arr.push(p);
      map.set(p.parent_t_id, arr);
    }
    return map;
  }, [episode.p_segments]);

  return { activeT, activeP, tSegments, pSegmentsByT };
}
