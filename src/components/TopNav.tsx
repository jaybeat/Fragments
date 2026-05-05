import type { Episode } from '../types';

interface TopNavProps {
  episode: Episode;
}

export default function TopNav({ episode }: TopNavProps) {
  const ytUrl = `https://www.youtube.com/watch?v=${episode.videoId}`;
  return (
    <nav className="topnav" aria-label="Top navigation">
      <a href="/" className="topnav-link">
        书架
      </a>
      <a href="#episodes" className="topnav-link">
        正在听
      </a>
      <a href={ytUrl} target="_blank" rel="noopener" className="topnav-link">
        关于
      </a>
    </nav>
  );
}
