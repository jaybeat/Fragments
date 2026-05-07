import { useState } from 'react';
import { useNavigation } from '../PlayerContext';
import { MENTORS, groupPSegmentsByDomain } from '../data/mentors';

const INITIAL_QUOTE_COUNT = 2;

export default function MentorBookshelf() {
  const [activeMentorId, setActiveMentorId] = useState('jobs');
  const [expandedDomains, setExpandedDomains] = useState<Set<string>>(new Set());
  const { goToPlayer } = useNavigation();

  const activeMentor = MENTORS.find((m) => m.id === activeMentorId)!;
  const domainGroups = groupPSegmentsByDomain(activeMentorId);
  const domainEntries = [...domainGroups.entries()];

  const toggleDomain = (domain: string) => {
    setExpandedDomains((prev) => {
      const next = new Set(prev);
      if (next.has(domain)) {
        next.delete(domain);
      } else {
        next.add(domain);
      }
      return next;
    });
  };

  return (
    <div className="mentor-bookshelf">
      <div className="mentor-tabs">
        {MENTORS.map((mentor) => (
          <button
            key={mentor.id}
            className={`mentor-tab ${mentor.id === activeMentorId ? 'active' : ''}`}
            onClick={() => setActiveMentorId(mentor.id)}
          >
            <img src={mentor.avatar} alt={mentor.name} className="mentor-tab-avatar" />
            <span>{mentor.nameCn}</span>
          </button>
        ))}
      </div>

      <div className="mentor-info">
        <div className="mentor-info-name">{activeMentor.nameCn}</div>
        <div className="mentor-info-meta">
          {domainEntries.reduce((sum, [, items]) => sum + items.length, 0)} 个观点 ·{' '}
          {domainEntries.length} 个领域
        </div>
      </div>

      <div className="domain-stream">
        {domainEntries.map(([domain, items]) => {
          const isExpanded = expandedDomains.has(domain);
          const displayedItems = isExpanded ? items : items.slice(0, INITIAL_QUOTE_COUNT);
          const hasMore = items.length > INITIAL_QUOTE_COUNT;

          return (
            <div key={domain} className="domain-group">
              <div className="domain-section-title">
                {domain}
                <span className="domain-count">{items.length}</span>
              </div>
              <div className="domain-segments domain-segments-grid">
                {displayedItems.map(({ episode, p }) => (
                  <button
                    key={p.id}
                    className="segment-item"
                    onClick={() => goToPlayer(episode.id, p.start_sec)}
                  >
                    <div className="segment-quote-cn">{p.quoteCn || p.question}</div>
                    {p.quoteCn && <div className="segment-question">{p.question}</div>}
                  </button>
                ))}
                {hasMore && !isExpanded && (
                  <button className="show-more" onClick={() => toggleDomain(domain)}>
                    ━━ 还有 {items.length - INITIAL_QUOTE_COUNT} 个 ━━
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
