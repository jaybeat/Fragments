import { useEffect, useReducer, useState } from 'react';
import { PlayerContext, playerReducer, initialState } from './PlayerContext';
import Stage from './components/Stage';
import TopNav from './components/TopNav';
import Tweaks from './components/Tweaks';
import MentorBookshelf from './components/MentorBookshelf';
import MentorDetail from './components/MentorDetail';
import PlayerView from './components/PlayerView';
import ErrorBoundary from './components/ErrorBoundary';

export default function App() {
  const [state, dispatch] = useReducer(playerReducer, initialState);
  const [showPlayer, setShowPlayer] = useState(false);

  useEffect(() => {
    document.documentElement.dataset.theme = state.theme;
  }, [state.theme]);

  // 延迟卸载 PlayerView：给浏览器扩展足够的时间完成 DOM 操作，避免 removeChild 爆炸
  useEffect(() => {
    if (state.screen === 'player') {
      setShowPlayer(true);
    } else if (showPlayer) {
      const timer = setTimeout(() => setShowPlayer(false), 300);
      return () => clearTimeout(timer);
    }
  }, [state.screen, showPlayer]);

  return (
    <PlayerContext.Provider value={{ state, dispatch }}>
      <TopNav />
      <ErrorBoundary>
        <Stage>
          {state.screen === 'bookshelf' && <MentorBookshelf />}
          {state.screen === 'mentor' &&
            (state.mentorId ? <MentorDetail mentorId={state.mentorId} /> : <MentorBookshelf />)}
          {showPlayer && (
            <div style={{ display: state.screen === 'player' ? 'contents' : 'none' }}>
              <PlayerView />
            </div>
          )}
        </Stage>
      </ErrorBoundary>
      <Tweaks />
    </PlayerContext.Provider>
  );
}
