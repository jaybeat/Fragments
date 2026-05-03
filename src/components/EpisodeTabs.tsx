import { usePlayer } from '../PlayerContext';
import { EPISODES } from '../data/episodes';

export default function EpisodeTabs() {
  const { state, dispatch } = usePlayer();

  return (
    <div className="episode-tabs">
      {EPISODES.map((ep) => (
        <button
          key={ep.id}
          className={`episode-tab ${state.episodeId === ep.id ? 'active' : ''}`}
          onClick={() => {
            if (state.episodeId !== ep.id) {
              dispatch({ type: 'SET_EPISODE', payload: ep.id });
            }
          }}
        >
          <img src={ep.speakerAvatar} alt={ep.speakerName} className="tab-avatar" />
          <span className="tab-name">{ep.speakerName}</span>
        </button>
      ))}
    </div>
  );
}
