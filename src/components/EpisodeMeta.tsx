import { usePlayer } from '../PlayerContext';
import { getEpisodeById } from '../data/episodes';

export default function EpisodeMeta() {
  const { state } = usePlayer();
  const episode = getEpisodeById(state.episodeId)!;
  const ytUrl = `https://www.youtube.com/watch?v=${episode.videoId}`;

  return (
    <div className="meta">
      <div className="meta-name" dangerouslySetInnerHTML={{ __html: episode.title }} />
      <div className="meta-sub" id="metaSub">
        <span>{episode.subtitle}</span>
        <a
          className="meta-source"
          href={ytUrl}
          target="_blank"
          rel="noopener"
          aria-label="Watch on YouTube"
        >
          <svg width="11" height="11" viewBox="0 0 14 14" fill="currentColor" aria-hidden="true">
            <path d="M11.2 1.8v6.9c0 1.4-1 2.4-2.3 2.4-1.2 0-2.1-.8-2.1-1.9 0-1.1 1-1.9 2.1-1.9.4 0 .8.1 1.1.3V3.9L5.9 5.2v5.1c0 1.4-1 2.4-2.3 2.4-1.2 0-2.1-.8-2.1-1.9 0-1.1 1-1.9 2.1-1.9.4 0 .8.1 1.1.3V2.6l6.5-.8z" />
          </svg>
          原视频↗
        </a>
      </div>
    </div>
  );
}
