import { useCallback } from 'react';
import { usePlayer } from '../PlayerContext';
import { useControls } from '../PlayerContext';
import { mmss } from '../lib/time';
import { getEpisodeById } from '../data/episodes';
import SegmentProgress from './SegmentProgress';

export default function PlayerFooter() {
  const { state, dispatch } = usePlayer();
  const { play, pause, seekTo } = useControls();
  const episode = getEpisodeById(state.episodeId)!;
  const duration = state.duration || episode.duration;

  const togglePlay = useCallback(() => {
    if (state.isPlaying) pause();
    else play();
  }, [state.isPlaying, play, pause]);

  const skipBack15 = useCallback(() => {
    seekTo(Math.max(0, state.currentTime - 15));
  }, [state.currentTime, seekTo]);

  const skipForward15 = useCallback(() => {
    seekTo(Math.min(duration, state.currentTime + 15));
  }, [state.currentTime, duration, seekTo]);

  const toggleView = useCallback(() => {
    dispatch({
      type: 'SET_VIEW',
      payload: state.view === 'chapters' ? 'transcript' : 'chapters',
    });
  }, [dispatch, state.view]);

  return (
    <div className="player-footer">
      <SegmentProgress />
      <div className="pf-time-row">
        <span className="pf-time-small">{mmss(state.currentTime)}</span>
        <span className="pf-time-small">{mmss(duration)}</span>
      </div>
      <div className="pf-controls">
        <button className="pf-view-toggle" onClick={toggleView}>
          {state.view === 'chapters' ? '字幕' : '片段索引'}
        </button>
        <button className="pf-skip-btn" onClick={skipBack15}>
          <svg width="16" height="16" viewBox="0 0 14 14" fill="none">
            <path d="M7 3.5 L2.5 7 L7 10.5 V3.5Z" fill="currentColor" />
            <rect x="9" y="3" width="1.5" height="8" rx="0.5" fill="currentColor" />
          </svg>
          15s
        </button>
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
        <button className="pf-skip-btn" onClick={skipForward15}>
          15s
          <svg width="16" height="16" viewBox="0 0 14 14" fill="none">
            <path d="M4 3.5 L8.5 7 L4 10.5 V3.5Z" fill="currentColor" />
            <rect x="9" y="3" width="1.5" height="8" rx="0.5" fill="currentColor" />
          </svg>
        </button>
      </div>
    </div>
  );
}
