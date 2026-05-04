import { useRef, useEffect, useMemo } from 'react';
import { usePlayer } from '../PlayerContext';
import { getEpisodeById } from '../data/episodes';
import { tokenizeEpisode } from '../lib/tokenize';
import { mmss } from '../lib/time';

export default function Transcript() {
  const { state } = usePlayer();
  const scrollRef = useRef<HTMLDivElement>(null);
  const episode = getEpisodeById(state.episodeId)!;
  const turns = useMemo(() => tokenizeEpisode(episode), [episode]);

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
    scrollRef.current.scrollTo({ top: desired, behavior: 'smooth' });
  }, [displayTime, turns]);

  return (
    <div className="transcript-wrap">
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
            </div>
          );
        })}
        <div style={{ height: '20px' }} />
      </div>
      <div className="transcript-fade" />
    </div>
  );
}
