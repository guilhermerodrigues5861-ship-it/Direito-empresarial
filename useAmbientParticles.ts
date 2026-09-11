import { useEffect } from 'react';

interface Mote {
  x: number;
  y: number;
  r: number;
  vy: number;
  vx: number;
  alpha: number;
  phase: number;
}

/** Poeira dourada flutuante no fundo — puramente decorativo, desligado com reduced-motion. */
export function useAmbientParticles(canvasRef: React.RefObject<HTMLCanvasElement>, enabled: boolean) {
  useEffect(() => {
    if (!enabled) return;
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;

    let raf = 0;
    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resize();
    window.addEventListener('resize', resize);

    const count = Math.min(46, Math.round((window.innerWidth * window.innerHeight) / 26000));
    const motes: Mote[] = Array.from({ length: count }, () => ({
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height,
      r: 0.6 + Math.random() * 1.6,
      vy: -0.06 - Math.random() * 0.14,
      vx: (Math.random() - 0.5) * 0.05,
      alpha: 0.08 + Math.random() * 0.18,
      phase: Math.random() * Math.PI * 2,
    }));

    const tick = (t: number) => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      motes.forEach((m) => {
        m.y += m.vy;
        m.x += m.vx + Math.sin(t / 4000 + m.phase) * 0.04;
        if (m.y < -10) {
          m.y = canvas.height + 10;
          m.x = Math.random() * canvas.width;
        }
        if (m.x < -10) m.x = canvas.width + 10;
        if (m.x > canvas.width + 10) m.x = -10;
        ctx.beginPath();
        ctx.arc(m.x, m.y, m.r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(233, 201, 110, ${m.alpha.toFixed(2)})`;
        ctx.fill();
      });
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);

    return () => {
      window.removeEventListener('resize', resize);
      cancelAnimationFrame(raf);
    };
  }, [canvasRef, enabled]);
}
