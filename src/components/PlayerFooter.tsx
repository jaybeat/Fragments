import { useCallback } from 'react';
import { usePlayer } from '../PlayerContext';
import { useControls } from '../PlayerContext';
import { mmss } from '../lib/time';
import { getEpisodeById } from '../data/episodes';
import SegmentProgress from './SegmentProgress';

export default function PlayerFooter() {
  const { state } = usePlayer();
  const { play, pause } = useControls();
  const episode = getEpisodeById(state.episodeId)!;
  const duration = state.duration || episode.duration;

  const togglePlay = useCallback(() => {
    if (state.isPlaying) pause();
    else play();
  }, [state.isPlaying, play, pause]);

  return (
    <div className="player-footer">
      <SegmentProgress />
      <div className="pf-row">
        <div className="pf-time">
          {mmss(state.currentTime)} / {mmss(duration)}
        </div>
        <button
          className="pf-play-btn"
          aria-label={state.isPlaying ? 'Pause' : 'Play'}
          onClick={togglePlay}
        >
          {state.isPlaying ? (
            <svg width="18" height="18" viewBox="0 0 14 14" fill="none">
              <rect x="3" y="2" width="2.5" height="10" rx="0.8" fill="currentColor" />
              <rect x="8.5" y="2" width="2.5" height="10" rx="0.8" fill="currentColor" />
            </svg>
          ) : (
            <svg width="18" height="18" viewBox="0 0 14 14" fill="none">
              <path d="M3.5 2.2 L11.5 7 L3.5 11.8 Z" fill="currentColor" />
            </svg>
          )}
        </button>
      </div>
    </div>
  );
}
