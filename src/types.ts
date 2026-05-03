export interface Turn {
  who: string;
  start: number;
  text: string;
}

export interface Episode {
  id: string;
  videoId: string;
  title: string;
  subtitle: string;
  speakerName: string;
  speakerAvatar: string;
  startTime?: number;
  endTime?: number;
  duration: number;
  turns: Turn[];
}

export interface Tweaks {
  accentHeader: string;
  blueHue: number;
  violetHue: number;
  blur: number;
  waveIntensity: number;
  waveSpeed: number;
}

export interface PlayerState {
  episodeId: string;
  currentTime: number;
  duration: number;
  isPlaying: boolean;
  isReady: boolean;
  tweaks: Tweaks;
}

export type PlayerAction =
  | { type: 'SET_EPISODE'; payload: string }
  | { type: 'TICK'; payload: number }
  | { type: 'SET_DURATION'; payload: number }
  | { type: 'PLAY' }
  | { type: 'PAUSE' }
  | { type: 'SET_READY'; payload: boolean }
  | { type: 'UPDATE_TWEAKS'; payload: Partial<Tweaks> };
