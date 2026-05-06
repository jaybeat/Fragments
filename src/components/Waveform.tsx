import { useRef, useEffect } from 'react';
import { usePlayer } from '../PlayerContext';

export default function Waveform() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const { state } = usePlayer();
  const stateRef = useRef(state);

  // Keep latest state accessible in the RAF loop without re-triggering the effect
  stateRef.current = state;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    let cw = 0,
      ch = 0;
    let raf = 0;

    function resize() {
      const c = canvasRef.current;
      const cx = ctx;
      if (!c || !cx) return;
      const rect = c.getBoundingClientRect();
      cw = rect.width;
      ch = rect.height;
      c.width = cw * dpr;
      c.height = ch * dpr;
      cx.setTransform(1, 0, 0, 1, 0, 0);
      cx.scale(dpr, dpr);
    }

    const barGap = 2;
    const barWidth = 2;
    const step = barGap + barWidth;

    function getBarHeight(i: number, total: number, maxH: number): number {
      const t = i / total;
      // Parabola envelope: peaks at center, drops to 0 at both ends
      const envelope = 1 - Math.pow((t - 0.5) * 2, 2);
      // Speech-like variation layered on top
      const wave1 = Math.sin(i * 0.45) * 0.5 + 0.5;
      const wave2 = Math.sin(i * 0.23 + 0.8) * 0.5 + 0.5;
      let h = envelope * (wave1 * 0.6 + wave2 * 0.4) * maxH * 0.95;
      h = Math.max(2, Math.min(maxH * 0.92, h));
      return h;
    }

    function draw() {
      const cx = ctx;
      if (!cx) return;
      cx.clearRect(0, 0, cw, ch);

      const count = Math.max(1, Math.floor(cw / step));
      const offsetX = (cw - count * step) / 2;

      const { currentTime, duration } = stateRef.current;
      const progress = duration > 0 ? Math.min(1, Math.max(0, currentTime / duration)) : 0;
      const playedCount = Math.floor(progress * count);

      for (let i = 0; i < count; i++) {
        const h = getBarHeight(i, count, ch);
        const x = offsetX + i * step;
        const y = ch - h;
        const isPlayed = i <= playedCount;

        cx.fillStyle = isPlayed ? '#c49a6c' : 'rgba(255, 255, 255, 0.22)';
        cx.fillRect(x, y, barWidth, h);
      }

      raf = requestAnimationFrame(draw);
    }

    resize();
    window.addEventListener('resize', resize);
    draw();

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', resize);
    };
  }, []);

  return <canvas ref={canvasRef} />;
}
