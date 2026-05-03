import Header from './Header';
import EpisodeMeta from './EpisodeMeta';
import EpisodeTabs from './EpisodeTabs';
import Transcript from './Transcript';
import Player from './Player';

export default function Card() {
  return (
    <div className="card">
      <Header />
      <div className="body">
        <EpisodeMeta />
        <EpisodeTabs />
        <Transcript />
        <Player />
      </div>
    </div>
  );
}
