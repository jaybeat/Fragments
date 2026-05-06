export interface Turn {
  who: string;
  start: number;
  text: string;
  textCn?: string;
}

export interface Chapter {
  start: number;
  end: number;
  title: string;
  description: string;
}

export interface TSegment {
  id: string;
  start_sec: number;
  end_sec: number;
  topic: string;
  summary: string;
}

export interface PSegment {
  id: string;
  parent_t_id: string;
  start_sec: number;
  end_sec: number;
  duration_sec: number;
  question: string;
  insight: string;
  domain: string[];
  fine_tags: string[];
  transcript: string;
  quote?: string;
  quoteCn?: string;
}

export interface Mentor {
  id: string;
  name: string;
  nameCn: string;
  avatar: string;
  bio: string;
  episodeIds: string[];
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
  chapters?: Chapter[];
  t_segments?: TSegment[];
  p_segments?: PSegment[];
}

export interface PlayerState {
  episodeId: string;
  currentTime: number;
  duration: number;
  isPlaying: boolean;
  isReady: boolean;
  transcriptLang: 'en' | 'cn' | 'both';
  theme: 'warm-light' | 'warm-dark';
  view: 'chapters' | 'transcript';
  screen: 'bookshelf' | 'mentor' | 'player';
  mentorId?: string;
  pendingSeek?: number;
  prevScreen?: 'bookshelf' | 'mentor' | 'player';
  prevMentorId?: string;
}

export type PlayerAction =
  | { type: 'SET_EPISODE'; payload: string | { episodeId: string; startTime?: number } }
  | { type: 'TICK'; payload: number }
  | { type: 'SET_DURATION'; payload: number }
  | { type: 'PLAY' }
  | { type: 'PAUSE' }
  | { type: 'SET_READY'; payload: boolean }
  | { type: 'SET_TRANSCRIPT_LANG'; payload: 'en' | 'cn' | 'both' }
  | { type: 'SET_THEME'; payload: 'warm-light' | 'warm-dark' }
  | { type: 'SET_VIEW'; payload: 'chapters' | 'transcript' }
  | { type: 'SET_SCREEN'; payload: 'bookshelf' | 'mentor' | 'player' }
  | { type: 'SET_MENTOR'; payload: string }
  | { type: 'CLEAR_PENDING_SEEK' }
  | { type: 'GO_BACK' };
