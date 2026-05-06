import { useNavigation } from '../PlayerContext';
import { getMentorById, getEpisodesByMentor, groupPSegmentsByDomain } from '../data/mentors';
import ConversationalInput from './ConversationalInput';

interface MentorDetailProps {
  mentorId: string;
}

function mmss(sec: number) {
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}

export default function MentorDetail({ mentorId }: MentorDetailProps) {
  const mentor = getMentorById(mentorId);
  const { goToBookshelf, goToPlayer } = useNavigation();

  if (!mentor) {
    return (
      <div className="mentor-detail">
        <button className="mentor-back" onClick={goToBookshelf}>← 返回书架</button>
        <p style={{ color: 'var(--text-secondary)', textAlign: 'center', marginTop: 40 }}>
          未找到该导师信息
        </p>
      </div>
    );
  }
  const episodes = getEpisodesByMentor(mentorId);
  const domainGroups = groupPSegmentsByDomain(mentorId);

  return (
    <div className="mentor-detail">
      <button className="mentor-back" onClick={goToBookshelf}>
        ← 返回书架
      </button>

      <div className="mentor-bio">
        <div className="mentor-bio-avatar">
          <img src={mentor.avatar} alt={mentor.name} />
        </div>
        <div className="mentor-bio-name">{mentor.nameCn}</div>
        <div className="mentor-bio-name-en">{mentor.name}</div>
        <p className="mentor-bio-text">{mentor.bio}</p>
      </div>

      <ConversationalInput mentorId={mentorId} />

      <div className="episode-list">
        <div className="section-title">全部演讲</div>
        {episodes.map((ep) => (
          <button
            key={ep.id}
            className="episode-item"
            onClick={() => goToPlayer(ep.id)}
          >
            <div className="episode-item-title">{ep.title}</div>
            <div className="episode-item-subtitle">{ep.subtitle}</div>
            <div className="episode-item-meta">
              {mmss(ep.duration)} · {ep.p_segments?.length ?? 0} 个片段
            </div>
          </button>
        ))}
      </div>

      <div className="domain-segment-list">
        <div className="section-title">按领域浏览</div>
        {[...domainGroups.entries()].map(([domain, items]) => (
          <div key={domain} className="domain-group">
            <div className="domain-title">
              {domain} · {items.length}
            </div>
            <div className="domain-segments">
              {items.map(({ episode, p }) => (
                <button
                  key={p.id}
                  className="segment-item"
                  onClick={() => goToPlayer(episode.id, p.start_sec)}
                >
                  <div className="segment-question">{p.question}</div>
                  <div className="segment-insight">{p.insight}</div>
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
