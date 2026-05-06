import { createContext, useContext } from 'react';
import type { PlayerAction, PlayerState } from './types';
import { getEpisodeById, DEFAULT_EPISODE_ID } from './data/episodes';

export const initialState: PlayerState = {
  episodeId: DEFAULT_EPISODE_ID,
  currentTime: 0,
  duration: getEpisodeById(DEFAULT_EPISODE_ID)?.duration ?? 0,
  isPlaying: false,
  isReady: false,
  transcriptLang: 'cn',
  theme: 'warm-light',
  view: 'chapters',
};

export function playerReducer(state: PlayerState, action: PlayerAction): PlayerState {
  switch (action.type) {
    case 'SET_EPISODE': {
      const ep = getEpisodeById(action.payload);
      return {
        ...state,
        episodeId: action.payload,
        currentTime: 0,
        duration: ep?.duration ?? state.duration,
        isPlaying: false,
      };
    }
    case 'TICK':
      return { ...state, currentTime: action.payload };
    case 'SET_DURATION':
      return { ...state, duration: action.payload };
    case 'PLAY':
      return { ...state, isPlaying: true };
    case 'PAUSE':
      return { ...state, isPlaying: false };
    case 'SET_READY':
      return { ...state, isReady: action.payload };
    case 'SET_TRANSCRIPT_LANG':
      return { ...state, transcriptLang: action.payload };
    case 'SET_THEME':
      return { ...state, theme: action.payload };
    case 'SET_VIEW':
      return { ...state, view: action.payload };
    default:
      return state;
  }
}

export const PlayerContext = createContext<{
  state: PlayerState;
  dispatch: React.Dispatch<PlayerAction>;
} | null>(null);

export const ControlsContext = createContext({
  play: () => {},
  pause: () => {},
  seekTo: (_seconds: number) => {},
});

export function usePlayer() {
  const ctx = useContext(PlayerContext);
  if (!ctx) throw new Error('usePlayer must be inside PlayerContext.Provider');
  return ctx;
}

export function useControls() {
  return useContext(ControlsContext);
}
