import { usePlayer, useNavigation } from '../PlayerContext';
import { useClock } from '../hooks/useClock';
import { getEpisodeById } from '../data/episodes';
import { getMentorForEpisode } from '../data/mentors';
import Waveform from './Waveform';

export default function Header() {
  const { state } = usePlayer();
  const { goToMentor } = useNavigation();
  const time = useClock();
  const episode = getEpisodeById(state.episodeId)!;
  const mentor = getMentorForEpisode(episode.id);

  return (
    <div
      className="header"
      style={{
        background: '#1C1A17',
      }}
    >
      <div className="header-top">
        <button
          className="header-name"
          onClick={() => mentor && goToMentor(mentor.id)}
          disabled={!mentor}
          aria-label={mentor ? `查看 ${mentor.nameCn}` : undefined}
        >
          <div className="header-avatar">
            <img src={episode.speakerAvatar} alt={episode.speakerName} />
          </div>
          {episode.speakerName}
        </button>
        <div className="header-time">{time}</div>
      </div>
      <div className="wave-wrap">
        <Waveform />
      </div>
    </div>
  );
}
