import { useRef, useEffect, useMemo } from 'react';
import { usePlayer } from '../PlayerContext';
import { getEpisodeById } from '../data/episodes';
import { tokenizeEpisode } from '../lib/tokenize';
import { mmss } from '../lib/time';

export default function Transcript() {
  const { state, dispatch } = usePlayer();
  const scrollRef = useRef<HTMLDivElement>(null);
  const episode = getEpisodeById(state.episodeId)!;
  const turns = useMemo(() => tokenizeEpisode(episode), [episode]);
  const hasCn = useMemo(() => episode.turns.some((t) => t.textCn), [episode]);

  // Throttled display time to ~10fps for smoother React rendering
  const displayTime = useMemo(() => Math.floor(state.currentTime * 10) / 10, [state.currentTime]);

  // Auto-scroll to active turn (throttled by time bucket)
  const lastScrollBucket = useRef(-1);
  useEffect(() => {
    const bucket = Math.floor(displayTime / 2);
    if (bucket === lastScrollBucket.current) return;
    lastScrollBucket.current = bucket;

    const activeIdx = turns.findIndex(
      ({ start, end }) => displayTime >= start && displayTime < end
    );
    if (activeIdx === -1) return;
    const activeTurnEl = scrollRef.current?.children[activeIdx];
    if (!activeTurnEl || !scrollRef.current) return;

    const elRect = scrollRef.current.getBoundingClientRect();
    const aRect = activeTurnEl.getBoundingClientRect();
    const desired = aRect.top - elRect.top + scrollRef.current.scrollTop - 24;
    const distance = Math.abs(desired - scrollRef.current.scrollTop);
    const behavior = distance > scrollRef.current.clientHeight * 0.8 ? 'auto' : 'smooth';
    scrollRef.current.scrollTo({ top: desired, behavior });
  }, [displayTime, turns]);

  return (
    <div className="transcript-wrap">
      {hasCn && (
        <div className="transcript-lang-bar">
          {(['en', 'cn', 'both'] as const).map((lang) => (
            <button
              key={lang}
              className={state.transcriptLang === lang ? 'active' : ''}
              onClick={() => dispatch({ type: 'SET_TRANSCRIPT_LANG', payload: lang })}
            >
              {lang === 'en' ? '英文原文' : lang === 'cn' ? '中文' : '双语对照'}
            </button>
          ))}
        </div>
      )}
      <div className="transcript-scroll" ref={scrollRef}>
        {turns.map((turn) => {
          const isActive = displayTime >= turn.start && displayTime < turn.end;
          const isPast = displayTime >= turn.end;
          const isPending = displayTime < turn.start;
          return (
            <div
              key={turn.start}
              className={`turn ${isPending ? 'pending' : ''} ${isActive ? 'active' : ''}`}
            >
              <div className="turn-head">
                <span className="who">{turn.who}</span> • {mmss(turn.start)}
              </div>
              <div className="turn-body">
                {(state.transcriptLang === 'en' || state.transcriptLang === 'both') && (
                  <div className="turn-text-en">
                    {turn.words.map((w, wi) => {
                      if (w.space) return <span key={wi}>{w.text}</span>;
                      let cls = 'word ';
                      if (displayTime >= (w.end ?? 0)) cls += 'said';
                      else if (displayTime >= (w.start ?? 0)) cls += 'current';
                      else cls += isPast ? 'said' : 'future';
                      return (
                        <span key={wi} className={cls}>
                          {w.text}
                        </span>
                      );
                    })}
                  </div>
                )}
                {(state.transcriptLang === 'cn' || state.transcriptLang === 'both') && (
                  <div className={`turn-text-cn ${isPast ? 'said' : isActive ? 'current' : 'future'}`}>
                    {turn.textCn ?? turn.text}
                  </div>
                )}
              </div>
            </div>
          );
        })}
        <div style={{ height: '20px' }} />
      </div>
      <div className="transcript-fade" />
    </div>
  );
}
