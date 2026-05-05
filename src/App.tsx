import { useEffect, useMemo, useReducer } from 'react';
import { PlayerContext, ControlsContext, playerReducer, initialState } from './PlayerContext';
import { useYouTubePlayer } from './hooks/useYouTubePlayer';
import { useRAF } from './hooks/useRAF';
import { getEpisodeById } from './data/episodes';
import Stage from './components/Stage';
import TopNav from './components/TopNav';
import Card from './components/Card';
import Tweaks from './components/Tweaks';

export default function App() {
  const [state, dispatch] = useReducer(playerReducer, initialState);
  const episode = getEpisodeById(state.episodeId)!;
  const { containerRef, play, pause, seekTo, getCurrentTime, getDuration, isReady, isPlaying } =
    useYouTubePlayer(episode.videoId, episode.startTime);

  useEffect(() => {
    dispatch({ type: isPlaying ? 'PLAY' : 'PAUSE' });
  }, [isPlaying]);

  useEffect(() => {
    dispatch({ type: 'SET_READY', payload: isReady });
  }, [isReady]);

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

  useEffect(() => {
    document.documentElement.dataset.theme = state.theme;
  }, [state.theme]);

  const controls = useMemo(() => ({ play, pause, seekTo }), [play, pause, seekTo]);

  return (
    <PlayerContext.Provider value={{ state, dispatch }}>
      <ControlsContext.Provider value={controls}>
        <TopNav episode={episode} />
        <Stage tweaks={state.tweaks}>
          <Card />
        </Stage>
        <div className="yt-hidden" ref={containerRef} />
        <Tweaks />
      </ControlsContext.Provider>
    </PlayerContext.Provider>
  );
}
