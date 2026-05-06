import { useCallback, useEffect, useRef } from 'react';
import { usePlayer, useControls } from '../PlayerContext';
import { getEpisodeById } from '../data/episodes';
import { useActiveSegments } from '../hooks/useActiveSegments';
import { mmss, formatDurationCn } from '../lib/time';

interface ChapterListProps {
  onSeek?: (seconds: number) => void;
  showHeader?: boolean;
}

export default function ChapterList({ onSeek, showHeader = true }: ChapterListProps) {
  const { state } = usePlayer();
  const { seekTo } = useControls();
  const episode = getEpisodeById(state.episodeId)!;
  const { activeT, activeP, tSegments, pSegmentsByT } = useActiveSegments(episode, state.currentTime);

  const tCount = tSegments.length;
  const pCount = episode.p_segments?.length ?? 0;

  const activePRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (activeP && activePRef.current && state.currentTime > 1) {
      activePRef.current.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  }, [activeP?.id]);

  const handleSeek = useCallback(
    (seconds: number) => {
      seekTo(seconds);
      onSeek?.(seconds);
    },
    [seekTo, onSeek]
  );

  if (!tCount) return null;

  return (
    <div className="chapter-list">
      {showHeader && (
        <div className="sd-header">
          <div className="sd-title">片段索引</div>
          <div className="sd-meta">
            {tCount} 章节 · {pCount} 个片段
          </div>
        </div>
      )}
      <div className="sd-scroll">
        {tSegments.map((t) => {
          const isActiveT = activeT?.id === t.id;
          const ps = pSegmentsByT.get(t.id) ?? [];
          return (
            <div key={t.id} className={`sd-t-block ${isActiveT ? 'active' : ''}`}>
              <div className="sd-timeline">
                <div className="sd-timeline-time">{mmss(t.start_sec)}</div>
                <div className="sd-timeline-line" />
              </div>
              <div className="sd-t-content">
                <button className="sd-t-header" onClick={() => handleSeek(t.start_sec)}>
                  <span className="sd-t-topic">{t.topic}</span>
                  {isActiveT && <span className="sd-badge">在播</span>}
                </button>
                {ps.length > 0 && (
                  <div className="sd-p-list">
                    {ps.map((p) => {
                      const isActiveP = activeP?.id === p.id;
                      return (
                        <button
                          key={p.id}
                          ref={isActiveP ? activePRef : undefined}
                          className={`sd-p-item ${isActiveP ? 'active' : ''}`}
                          onClick={() => handleSeek(p.start_sec)}
                        >
                          <div className="sd-p-question">{p.question}</div>
                          <div className="sd-p-meta">
                            <span>{mmss(p.start_sec)}</span>
                            <span className="sd-p-dot">·</span>
                            <span>{formatDurationCn(p.duration_sec)}</span>
                            {isActiveP && (
                              <>
                                <span className="sd-p-dot">·</span>
                                <span className="sd-p-live">在播</span>
                              </>
                            )}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
