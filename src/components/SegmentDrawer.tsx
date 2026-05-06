import { useCallback } from 'react';
import ChapterList from './ChapterList';

interface SegmentDrawerProps {
  onClose: () => void;
}

export default function SegmentDrawer({ onClose }: SegmentDrawerProps) {
  const handleSeek = useCallback(
    (_seconds: number) => {
      onClose();
    },
    [onClose]
  );

  return (
    <div className="segment-drawer">
      <div className="sd-backdrop" onClick={onClose} />
      <div className="sd-panel">
        <div className="sd-header">
          <button className="sd-back" onClick={onClose} aria-label="关闭">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M19 12H5" />
              <path d="M12 19l-7-7 7-7" />
            </svg>
          </button>
          <div className="sd-title">片段索引</div>
          <div className="sd-meta" />
        </div>
        <ChapterList onSeek={handleSeek} showHeader={false} />
      </div>
    </div>
  );
}
