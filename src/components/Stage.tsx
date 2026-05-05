import type { ReactNode } from 'react';
import type { Tweaks } from '../types';

interface StageProps {
  tweaks: Tweaks;
  children?: ReactNode;
}

export default function Stage({ tweaks, children }: StageProps) {
  return (
    <div className="stage">
      <div
        className="fluid blue"
        style={{
          filter: `blur(${tweaks.blur * 2}px) saturate(1.1)`,
        }}
      />
      <div
        className="fluid violet"
        style={{
          filter: `blur(${tweaks.blur * 2}px) saturate(1.1)`,
        }}
      />
      <div
        className="fluid accent"
        style={{
          filter: `blur(${tweaks.blur * 1.6}px) saturate(1.1)`,
        }}
      />
      <div className="bg-grain" />
      <div className="bg-noise" />
      {children}
    </div>
  );
}
