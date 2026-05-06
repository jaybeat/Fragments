import { useRef, useCallback, useMemo } from 'react';
import { usePlayer } from '../PlayerContext';
import { useControls } from '../PlayerContext';
import { getEpisodeById } from '../data/episodes';

export default function SegmentProgress() {
  const { state } = usePlayer();
  const { seekTo } = useControls();
  const lineRef = useRef<HTMLDivElement>(null);
  const episode = getEpisodeById(state.episodeId)!;
  const duration = state.duration || episode.duration;

  const progress = duration > 0 ? Math.min(1, state.currentTime / duration) : 0;

  const ticks = useMemo(() => {
    const segs = episode.t_segments ?? [];
    if (!segs.length || duration <= 0) return [];
    return segs.map((s) => ({
      left: (s.start_sec / duration) * 100,
    }));
  }, [episode.t_segments, duration]);

  const handleLineClick = useCallback(
    (e: React.PointerEvent) => {
      const rect = lineRef.current?.getBoundingClientRect();
      if (!rect || duration <= 0) return;
      const p = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
      seekTo(p * duration);
    },
    [duration, seekTo]
  );

  return (
    <div className="segment-progress">
      <div className="segment-progress-inner">
        <div className="sp-ticks">
          {ticks.map((t, i) => (
            <div key={i} className="sp-tick" style={{ left: `${t.left}%` }} />
          ))}
        </div>
        <div className="sp-line" ref={lineRef} onPointerDown={handleLineClick}>
          <div className="sp-fill" style={{ width: `${progress * 100}%` }} />
        </div>
        <div className="sp-thumb" style={{ left: `${progress * 100}%` }} />
      </div>
    </div>
  );
}
