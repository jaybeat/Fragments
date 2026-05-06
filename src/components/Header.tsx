import { usePlayer } from '../PlayerContext';
import { useClock } from '../hooks/useClock';
import { getEpisodeById } from '../data/episodes';
import Waveform from './Waveform';

export default function Header() {
  const { state } = usePlayer();
  const time = useClock();
  const episode = getEpisodeById(state.episodeId)!;

  return (
    <div
      className="header"
      style={{
        background: '#1C1A17',
      }}
    >
      <div className="header-top">
        <div className="header-name">
          <div className="header-avatar">
            <img src={episode.speakerAvatar} alt={episode.speakerName} />
          </div>
          {episode.speakerName}
        </div>
        <div className="header-time">{time}</div>
      </div>
      <div className="wave-wrap">
        <Waveform />
      </div>
    </div>
  );
}
