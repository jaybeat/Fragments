import { useNavigation, usePlayer } from '../PlayerContext';
import { getEpisodeById } from '../data/episodes';

export default function TopNav() {
  const { state } = usePlayer();
  const { goToBookshelf, goToPlayer, goBack, canGoBack } = useNavigation();

  const episode = state.screen === 'player' ? getEpisodeById(state.episodeId) : undefined;
  const ytUrl = episode ? `https://www.youtube.com/watch?v=${episode.videoId}` : undefined;

  return (
    <nav className="topnav" aria-label="Top navigation">
      {canGoBack && state.screen === 'player' ? (
        <button className="topnav-link" onClick={goBack}>
          ← 返回
        </button>
      ) : (
        <button className="topnav-link" onClick={goToBookshelf}>
          书架
        </button>
      )}
      <button className="topnav-link" onClick={() => goToPlayer()}>
        正在听
      </button>
      {ytUrl ? (
        <a href={ytUrl} target="_blank" rel="noopener" className="topnav-link">
          关于
        </a>
      ) : (
        <span className="topnav-link" style={{ opacity: 0.35, pointerEvents: 'none' }}>
          关于
        </span>
      )}
    </nav>
  );
}
