import { useNavigation } from '../PlayerContext';
import { MENTORS, getEpisodesByMentor } from '../data/mentors';

function formatCount(n: number, unit: string) {
  return `${n} ${unit}`;
}

export default function MentorBookshelf() {
  const { goToMentor } = useNavigation();

  return (
    <div className="mentor-bookshelf">
      <div className="bookshelf-header">
        <h1>导师书架</h1>
        <p>当你卡在一个问题上时，听你信任的智者本人，用他自己的原话，谈过这件事。</p>
      </div>
      <div className="mentor-grid">
        {MENTORS.map((mentor) => {
          const episodes = getEpisodesByMentor(mentor.id);
          const pCount = episodes.reduce(
            (sum, ep) => sum + (ep.p_segments?.length ?? 0),
            0
          );
          return (
            <button
              key={mentor.id}
              className="mentor-card"
              onClick={() => goToMentor(mentor.id)}
            >
              <div className="mentor-card-avatar">
                <img src={mentor.avatar} alt={mentor.name} />
              </div>
              <div className="mentor-card-name">{mentor.nameCn}</div>
              <div className="mentor-card-name-en">{mentor.name}</div>
              <div className="mentor-card-meta">
                {formatCount(episodes.length, '场演讲')} · {formatCount(pCount, '个片段')}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
