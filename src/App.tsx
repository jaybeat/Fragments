import { useEffect, useReducer } from 'react';
import { PlayerContext, playerReducer, initialState } from './PlayerContext';
import Stage from './components/Stage';
import TopNav from './components/TopNav';
import Tweaks from './components/Tweaks';
import MentorBookshelf from './components/MentorBookshelf';
import MentorDetail from './components/MentorDetail';
import PlayerView from './components/PlayerView';

export default function App() {
  const [state, dispatch] = useReducer(playerReducer, initialState);

  useEffect(() => {
    document.documentElement.dataset.theme = state.theme;
  }, [state.theme]);

  return (
    <PlayerContext.Provider value={{ state, dispatch }}>
      <TopNav />
      <Stage>
        {state.screen === 'bookshelf' && <MentorBookshelf />}
        {state.screen === 'mentor' &&
          (state.mentorId ? <MentorDetail mentorId={state.mentorId} /> : <MentorBookshelf />)}
        {state.screen === 'player' && <PlayerView />}
      </Stage>
      <Tweaks />
    </PlayerContext.Provider>
  );
}
