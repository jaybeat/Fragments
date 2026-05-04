import type { Episode } from '../types';

interface TopNavProps {
  episode: Episode;
}

export default function TopNav({ episode }: TopNavProps) {
  const ytUrl = `https://www.youtube.com/watch?v=${episode.videoId}`;
  return (
    <nav className="topnav" aria-label="Top navigation">
      <a href="/" className="topnav-link">
        HOME
      </a>
      <a href="#episodes" className="topnav-link">
        EPISODES
      </a>
      <a href={ytUrl} target="_blank" rel="noopener" className="topnav-link">
        WATCH ON YT
      </a>
    </nav>
  );
}
