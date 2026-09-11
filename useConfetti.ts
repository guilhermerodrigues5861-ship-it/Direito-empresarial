import { useCallback, useEffect, useRef } from 'react';

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  rot: number;
  vr: number;
  color: string;
  life: number;
}

const COLORS = ['#c79a3d', '#e9c96e', '#b23c31', '#2f7350', '#e9e2cd'];

/** Canvas de confete acionado sob demanda via burst(n). */
export function useConfetti(canvasRef: React.RefObject<HTMLCanvasElement>) {
  const particlesRef = useRef<Particle[]>([]);
  const runningRef = useRef(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resize();
    window.addEventListener('resize', resize);
    return () => window.removeEventListener('resize', resize);
  }, [canvasRef]);

  const tick = useCallback(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    particlesRef.current.forEach((p) => {
      p.x += p.vx;
      p.y += p.vy;
      p.rot += p.vr;
      p.life++;
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate((p.rot * Math.PI) / 180);
      ctx.fillStyle = p.color;
      ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size * 0.6);
      ctx.restore();
    });
    particlesRef.current = particlesRef.current.filter((p) => p.y < canvas.height + 30 && p.life < 400);
    if (particlesRef.current.length > 0) {
      requestAnimationFrame(tick);
    } else {
      runningRef.current = false;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
    }
  }, [canvasRef]);

  const burst = useCallback(
    (n: number) => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      for (let i = 0; i < n; i++) {
        particlesRef.current.push({
          x: Math.random() * canvas.width,
          y: -20 - Math.random() * 80,
          vx: (Math.random() - 0.5) * 3,
          vy: 2 + Math.random() * 3,
          size: 4 + Math.random() * 5,
          rot: Math.random() * 360,
          vr: (Math.random() - 0.5) * 10,
          color: COLORS[Math.floor(Math.random() * COLORS.length)],
          life: 0,
        });
      }
      if (!runningRef.current) {
        runningRef.current = true;
        requestAnimationFrame(tick);
      }
    },
    [canvasRef, tick]
  );

  return burst;
}
