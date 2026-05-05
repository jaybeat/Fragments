import { useRef, useEffect } from 'react';
import { usePlayer } from '../PlayerContext';

export default function Waveform() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const { state } = usePlayer();
  const { isPlaying, tweaks } = state;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    let cw = 0,
      ch = 0;
    let phase = 0;
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

    function rand(i: number) {
      const x = Math.sin(i * 12.9898) * 43758.5453;
      return x - Math.floor(x);
    }

    function draw() {
      const cx = ctx;
      if (!cx) return;
      cx.clearRect(0, 0, cw, ch);
      const barGap = 2,
        barWidth = 2;
      const step = barGap + barWidth;
      const count = Math.floor(cw / step);
      phase += isPlaying ? 0.06 * tweaks.waveSpeed : 0.004;

      // Read theme-aware color from computed style
      const computed = getComputedStyle(document.documentElement);
      const baseColor = computed.getPropertyValue('--header-text').trim() || '#2a2826';

      for (let i = 0; i < count; i++) {
        const x = i * step + (cw - count * step) / 2;
        const center = i / count;
        const env = 0.55 + 0.45 * Math.sin(center * Math.PI);

        const n1 = Math.sin(i * 0.18 + phase * 2.2) * 0.5 + 0.5;
        const n2 = Math.sin(i * 0.42 + phase * 1.1 + rand(i) * 6) * 0.5 + 0.5;
        const n3 = Math.sin(i * 0.08 + phase * 0.8) * 0.5 + 0.5;
        const noise = rand(i + Math.floor(phase * 3)) * 0.3;
        const amp = n1 * 0.55 + n2 * 0.35 + n3 * 0.1;

        let h = amp * env * ch * 1.25 * tweaks.waveIntensity;
        h += noise * (isPlaying ? 6 : 12);
        h = Math.max(4, Math.min(ch - 4, h));
        const y = ch - h;
        const alpha = 0.55 + 0.4 * (1 - (i / count - 0.5) ** 2 * 2);

        // Parse hex color to rgba with alpha
        let r = 255, g = 255, b = 255;
        if (baseColor.startsWith('#')) {
          const hex = baseColor.slice(1);
          if (hex.length === 3) {
            r = parseInt(hex[0] + hex[0], 16);
            g = parseInt(hex[1] + hex[1], 16);
            b = parseInt(hex[2] + hex[2], 16);
          } else if (hex.length === 6) {
            r = parseInt(hex.slice(0, 2), 16);
            g = parseInt(hex.slice(2, 4), 16);
            b = parseInt(hex.slice(4, 6), 16);
          }
        }

        cx.fillStyle = `rgba(${r},${g},${b},${Math.min(0.9, alpha) * 0.2})`;
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
  }, [isPlaying, tweaks.waveIntensity, tweaks.waveSpeed]);

  return <canvas ref={canvasRef} />;
}
