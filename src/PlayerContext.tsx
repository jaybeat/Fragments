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
  screen: 'bookshelf',
};

export function playerReducer(state: PlayerState, action: PlayerAction): PlayerState {
  switch (action.type) {
    case 'SET_EPISODE': {
      const epId = typeof action.payload === 'string' ? action.payload : action.payload.episodeId;
      const startTime = typeof action.payload === 'string' ? undefined : action.payload.startTime;
      const ep = getEpisodeById(epId);
      return {
        ...state,
        episodeId: epId,
        currentTime: 0,
        duration: ep?.duration ?? state.duration,
        isPlaying: false,
        pendingSeek: startTime,
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
    case 'SET_SCREEN':
      return {
        ...state,
        prevScreen: state.screen,
        prevMentorId: state.mentorId,
        screen: action.payload,
      };
    case 'SET_MENTOR':
      return { ...state, mentorId: action.payload };
    case 'GO_TO_MENTOR':
      return {
        ...state,
        prevScreen: state.screen,
        prevMentorId: state.mentorId,
        screen: 'mentor',
        mentorId: action.payload,
      };
    case 'CLEAR_PENDING_SEEK':
      return { ...state, pendingSeek: undefined };
    case 'GO_BACK': {
      const backScreen = state.prevScreen ?? 'bookshelf';
      return {
        ...state,
        screen: backScreen,
        mentorId: backScreen === 'mentor' ? state.prevMentorId : state.mentorId,
        prevScreen: undefined,
        prevMentorId: undefined,
      };
    }
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

export function useNavigation() {
  const { state, dispatch } = usePlayer();
  return {
    goToBookshelf: () => dispatch({ type: 'SET_SCREEN', payload: 'bookshelf' }),
    goToMentor: (mentorId: string) => {
      dispatch({ type: 'GO_TO_MENTOR', payload: mentorId });
    },
    goToPlayer: (episodeId?: string, startTime?: number) => {
      if (episodeId) {
        dispatch({
          type: 'SET_EPISODE',
          payload: startTime !== undefined ? { episodeId, startTime } : episodeId,
        });
      }
      if (state.screen !== 'player') {
        dispatch({ type: 'SET_SCREEN', payload: 'player' });
      }
    },
    goBack: () => dispatch({ type: 'GO_BACK' }),
    canGoBack: state.prevScreen !== undefined,
  };
}
