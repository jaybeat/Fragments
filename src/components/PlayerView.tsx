import { useEffect, useMemo } from 'react';
import { ControlsContext, usePlayer } from '../PlayerContext';
import { useYouTubePlayer } from '../hooks/useYouTubePlayer';
import { useRAF } from '../hooks/useRAF';
import { getEpisodeById } from '../data/episodes';
import Card from './Card';

export default function PlayerView() {
  const { state, dispatch } = usePlayer();
  const episode = getEpisodeById(state.episodeId)!;
  const { containerRef, play, pause, seekTo, getCurrentTime, getDuration, isReady, isPlaying } =
    useYouTubePlayer(episode.videoId, episode.startTime);

  useEffect(() => {
    dispatch({ type: isPlaying ? 'PLAY' : 'PAUSE' });
  }, [isPlaying, dispatch]);

  useEffect(() => {
    dispatch({ type: 'SET_READY', payload: isReady });
  }, [isReady, dispatch]);

  useRAF(() => {
    if (!isReady) return;
    const time = getCurrentTime();
    dispatch({ type: 'TICK', payload: time });
    const dur = getDuration();
    if (dur > 0 && dur !== state.duration) {
      dispatch({ type: 'SET_DURATION', payload: dur });
    }
  });

  useEffect(() => {
    if (!isReady) return;
    if (state.pendingSeek !== undefined && state.pendingSeek > 0) {
      seekTo(state.pendingSeek);
      dispatch({ type: 'CLEAR_PENDING_SEEK' });
    }
  }, [isReady, state.pendingSeek, seekTo, dispatch]);

  useEffect(() => {
    if (!isReady) return;
    let cleaned = false;
    const attempt = () => {
      if (cleaned) return;
      play();
    };
    const cleanup = () => {
      cleaned = true;
      window.removeEventListener('pointerdown', onGesture);
      window.removeEventListener('keydown', onGesture);
      window.removeEventListener('touchstart', onGesture);
    };
    const onGesture = () => {
      if (cleaned) return;
      cleanup();
      attempt();
    };
    window.addEventListener('pointerdown', onGesture);
    window.addEventListener('keydown', onGesture);
    window.addEventListener('touchstart', onGesture);
    attempt();
    return cleanup;
  }, [isReady, play]);

  const controls = useMemo(() => ({ play, pause, seekTo }), [play, pause, seekTo]);

  return (
    <ControlsContext.Provider value={controls}>
      <Card />
      <div className="yt-hidden" ref={containerRef} />
    </ControlsContext.Provider>
  );
}
