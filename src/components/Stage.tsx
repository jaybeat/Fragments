import type { ReactNode } from 'react';

interface StageProps {
  children?: ReactNode;
}

export default function Stage({ children }: StageProps) {
  return (
    <div className="stage">
      <div
        className="fluid blue"
        style={{
          filter: `blur(180px) saturate(1.1)`,
        }}
      />
      <div
        className="fluid violet"
        style={{
          filter: `blur(180px) saturate(1.1)`,
        }}
      />
      <div
        className="fluid accent"
        style={{
          filter: `blur(144px) saturate(1.1)`,
        }}
      />
      <div className="bg-grain" />
      <div className="bg-noise" />
      {children}
    </div>
  );
}
