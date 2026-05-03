import type { ReactNode } from 'react';
import type { Tweaks } from '../types';

interface StageProps {
  tweaks: Tweaks;
  children?: ReactNode;
}

export default function Stage({ tweaks, children }: StageProps) {
  const { blueHue, violetHue, blur } = tweaks;
  const mid = (blueHue + violetHue) / 2;

  return (
    <div className="stage">
      <div
        className="fluid blue"
        style={{
          filter: `blur(${blur * 2}px) saturate(1.1)`,
          background: `radial-gradient(circle at 40% 40%, oklch(0.62 0.17 ${blueHue}) 0%, oklch(0.48 0.18 ${blueHue + 3}) 40%, oklch(0.30 0.12 ${blueHue + 5} / 0) 72%)`,
        }}
      />
      <div
        className="fluid violet"
        style={{
          filter: `blur(${blur * 2}px) saturate(1.1)`,
          background: `radial-gradient(circle at 50% 50%, oklch(0.58 0.19 ${violetHue}) 0%, oklch(0.42 0.20 ${violetHue - 5}) 42%, oklch(0.28 0.14 ${violetHue - 10} / 0) 72%)`,
        }}
      />
      <div
        className="fluid accent"
        style={{
          filter: `blur(${blur * 1.6}px) saturate(1.1)`,
          background: `radial-gradient(circle at 50% 50%, oklch(0.70 0.18 ${mid}) 0%, oklch(0.50 0.18 ${mid - 5}) 45%, oklch(0.30 0.12 ${mid - 10} / 0) 72%)`,
        }}
      />
      <div className="bg-grain" />
      <div className="bg-noise" />
      {children}
    </div>
  );
}
