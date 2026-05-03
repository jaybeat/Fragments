import { useRef, useCallback } from 'react';
import { usePlayer } from '../PlayerContext';
import { useControls } from '../PlayerContext';
import { mmss } from '../lib/time';
import { getEpisodeById } from '../data/episodes';

export default function Player() {
  const { state } = usePlayer();
  const { play, pause, seekTo } = useControls();
  const lineRef = useRef<HTMLDivElement>(null);
  const episode = getEpisodeById(state.episodeId)!;
  const duration = state.duration || episode.duration;

  const progress = duration > 0 ? Math.min(1, state.currentTime / duration) : 0;

  const togglePlay = useCallback(() => {
    if (state.isPlaying) pause();
    else play();
  }, [state.isPlaying, play, pause]);

  const handleLineClick = useCallback((e: React.PointerEvent) => {
    const rect = lineRef.current?.getBoundingClientRect();
    if (!rect || duration <= 0) return;
    const p = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    seekTo(p * duration);
  }, [duration, seekTo]);

  return (
    <div className="player">
      <div className="player-time">{mmss(state.currentTime)}</div>
      <div className="player-line" ref={lineRef} onPointerDown={handleLineClick}>
        <div className="player-fill" style={{ width: `${progress * 100}%` }} />
      </div>
      <button className="play-btn" aria-label={state.isPlaying ? 'Pause' : 'Play'} onClick={togglePlay}>
        {state.isPlaying ? (
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <rect x="3" y="2" width="2.5" height="10" rx="0.8" fill="currentColor"/>
            <rect x="8.5" y="2" width="2.5" height="10" rx="0.8" fill="currentColor"/>
          </svg>
        ) : (
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <path d="M3.5 2.2 L11.5 7 L3.5 11.8 Z" fill="currentColor"/>
          </svg>
        )}
      </button>
    </div>
  );
}
