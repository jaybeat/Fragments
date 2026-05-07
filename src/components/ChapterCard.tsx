import { useCallback } from 'react';
import { usePlayer } from '../PlayerContext';
import { useControls } from '../PlayerContext';
import { getEpisodeById } from '../data/episodes';
import { useActiveSegments } from '../hooks/useActiveSegments';

interface ChapterCardProps {
  onOpenDrawer: () => void;
}

export default function ChapterCard({ onOpenDrawer }: ChapterCardProps) {
  const { state } = usePlayer();
  const { seekTo } = useControls();
  const episode = getEpisodeById(state.episodeId)!;
  const { activeT, activeP, tSegments, pSegmentsByT } = useActiveSegments(episode, state.currentTime);

  const handleSeek = useCallback(
    (seconds: number) => {
      seekTo(seconds);
    },
    [seekTo]
  );

  if (!tSegments.length) return null;

  const currentT = activeT ?? tSegments[0];
  const currentIndex = tSegments.findIndex((t) => t.id === currentT.id);
  const ps = pSegmentsByT.get(currentT.id) ?? [];

  return (
    <div className="chapter-card">
      <div className="cc-header">
        <div className="cc-header-title">
          第 {currentIndex + 1} 章 {currentT.topic}
        </div>
        <button className="cc-header-action" onClick={onOpenDrawer}>
          全部 {tSegments.length} 章 →
        </button>
      </div>
      {ps.length > 0 && (
        <div className="cc-p-list">
          {ps.map((p) => {
            const isActiveP = activeP?.id === p.id;
            return (
              <button
                key={`${currentT.id}-${p.id}`}
                className={`cc-p-item ${isActiveP ? 'active' : ''}`}
                onClick={() => handleSeek(p.start_sec)}
              >
                <span className={`cc-p-bullet ${isActiveP ? 'active' : ''}`} />
                <span className="cc-p-text">{p.question}</span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
