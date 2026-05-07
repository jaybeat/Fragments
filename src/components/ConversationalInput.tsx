import { useMemo, useState } from 'react';
import { getMentorById, getAllPSegmentsByMentor } from '../data/mentors';
import { useNavigation } from '../PlayerContext';

interface ConversationalInputProps {
  mentorId: string;
}

function mmss(sec: number) {
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}

export default function ConversationalInput({ mentorId }: ConversationalInputProps) {
  const [query, setQuery] = useState('');
  const mentor = getMentorById(mentorId)!;
  const allSegments = getAllPSegmentsByMentor(mentorId);
  const { goToPlayer } = useNavigation();

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [];
    return allSegments
      .filter(
        ({ p }) =>
          p.question.toLowerCase().includes(q) ||
          p.insight.toLowerCase().includes(q) ||
          p.domain.some((d) => d.toLowerCase().includes(q)) ||
          p.fine_tags.some((t) => t.toLowerCase().includes(q)) ||
          p.transcript.toLowerCase().includes(q)
      )
      .slice(0, 8);
  }, [query, allSegments]);

  return (
    <div className="conversational-input">
      <label className="ci-label">
        你现在卡在哪？让 {mentor.nameCn} 用原话回应你。
      </label>
      <input
        type="text"
        className="ci-input"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="例如：创业初期、被公司开除、如何学习……"
      />
      {results.length > 0 && (
        <div className="ci-results">
          {results.map(({ episode, p }) => (
            <button
              key={`${episode.id}-${p.id}`}
              className="ci-result-item"
              onClick={() => goToPlayer(episode.id, p.start_sec)}
            >
              <div className="ci-result-question">{p.question}</div>
              <div className="ci-result-meta">
                {episode.title} · {mmss(p.start_sec)}
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
