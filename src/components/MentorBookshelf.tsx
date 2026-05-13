import { useState } from 'react';
import { useNavigation } from '../PlayerContext';
import { assetPath } from '../lib/assetPath';
import { MENTORS, groupPSegmentsByDomain } from '../data/mentors';

const INITIAL_QUOTE_COUNT = 2;

export default function MentorBookshelf() {
  const [activeMentorId, setActiveMentorId] = useState('jobs');
  const [expandedDomains, setExpandedDomains] = useState<Set<string>>(new Set());
  const [showAddModal, setShowAddModal] = useState(false);
  const [urlInput, setUrlInput] = useState('');
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

  const handleSubmit = () => {
    if (!urlInput.trim()) return;
    // 交互占位：实际功能未接入 pipeline
    alert('功能开发中：将自动提取转录并切分高光片段');
    setShowAddModal(false);
    setUrlInput('');
  };

  return (
    <div className="mentor-bookshelf">
      <div className="brand-header">
        <div className="brand-name">Fragments</div>
        <div className="brand-slogan">Great minds, their sharpest moments</div>
        <div className="brand-slogan-cn">片段 · 大师们最锋利的时刻</div>
        <button className="add-collection-btn" onClick={() => setShowAddModal(true)}>
          + 新增收藏
        </button>
      </div>
      <div className="mentor-tabs">
        {MENTORS.map((mentor) => (
          <button
            key={mentor.id}
            className={`mentor-tab ${mentor.id === activeMentorId ? 'active' : ''}`}
            onClick={() => {
              setActiveMentorId(mentor.id);
              setExpandedDomains(new Set());
            }}
          >
            <img src={assetPath(mentor.avatar)} alt={mentor.name} className="mentor-tab-avatar" />
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
                    key={`${episode.id}-${p.id}`}
                    className="segment-item"
                    onClick={() => goToPlayer(episode.id, p.start_sec)}
                  >
                    <div className="segment-quote-cn">{p.quoteCn || p.question}</div>
                    {p.quoteCn && <div className="segment-question">{p.question}</div>}
                  </button>
                ))}
                {hasMore && (
                  <button className="show-more" onClick={() => toggleDomain(domain)}>
                    {isExpanded
                      ? '━━ 收起 ━━'
                      : `━━ 还有 ${items.length - INITIAL_QUOTE_COUNT} 个 ━━`}
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {showAddModal && (
        <div className="modal-overlay" onClick={() => setShowAddModal(false)}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            <button className="modal-close" onClick={() => setShowAddModal(false)}>
              ×
            </button>
            <div className="modal-title">新增收藏</div>
            <p className="modal-desc">
              粘贴 YouTube 视频链接，我们将自动提取转录并切分高光片段。
            </p>
            <input
              type="text"
              className="modal-input"
              placeholder="https://www.youtube.com/watch?v=..."
              value={urlInput}
              onChange={(e) => setUrlInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
            />
            <button className="modal-submit" onClick={handleSubmit}>
              开始切分
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
