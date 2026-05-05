import { useCallback } from 'react';
import { usePlayer } from '../PlayerContext';
import { useControls } from '../PlayerContext';
import { getEpisodeById } from '../data/episodes';
import { useActiveSegments } from '../hooks/useActiveSegments';
import { mmss, formatDurationCn } from '../lib/time';

interface SegmentDrawerProps {
  onClose: () => void;
}

export default function SegmentDrawer({ onClose }: SegmentDrawerProps) {
  const { state } = usePlayer();
  const { seekTo } = useControls();
  const episode = getEpisodeById(state.episodeId)!;
  const { activeT, activeP, tSegments, pSegmentsByT } = useActiveSegments(episode, state.currentTime);

  const tCount = tSegments.length;
  const pCount = episode.p_segments?.length ?? 0;

  const handleSeek = useCallback(
    (seconds: number) => {
      seekTo(seconds);
      onClose();
    },
    [seekTo, onClose]
  );

  if (!tCount) return null;

  return (
    <div className="segment-drawer">
      <div className="sd-backdrop" onClick={onClose} />
      <div className="sd-panel">
        <div className="sd-header">
          <button className="sd-back" onClick={onClose} aria-label="关闭">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M19 12H5" />
              <path d="M12 19l-7-7 7-7" />
            </svg>
          </button>
          <div className="sd-title">片段索引</div>
          <div className="sd-meta">
            {tCount} 章节 · {pCount} 个片段
          </div>
        </div>
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
    </div>
  );
}
