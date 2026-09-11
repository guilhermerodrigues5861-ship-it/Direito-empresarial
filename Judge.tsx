import { useEffect, useRef, useState } from 'react';
import { useReducedMotion } from '../hooks/useReducedMotion';
import styles from './Judge.module.css';

interface JudgeProps {
  /** Incrementa a cada resposta para disparar a martelada. */
  reactionTick: number;
}

/**
 * O juiz mascote: SVG desenhado à mão, com paralaxe 3D seguindo o mouse,
 * pupilas que rastreiam o cursor e uma martelada ao responder. É a peça
 * de personalidade do sistema — a mesma arte do design original, portada
 * para componente React.
 */
export function Judge({ reactionTick }: JudgeProps) {
  const stageRef = useRef<HTMLDivElement>(null);
  const [pupil, setPupil] = useState({ lx: 85, ly: 83, rx: 115, ry: 83 });
  const reducedMotion = useReducedMotion();
  const [bang, setBang] = useState(false);
  const isFirstTick = useRef(true);

  useEffect(() => {
    if (isFirstTick.current) {
      isFirstTick.current = false;
      return;
    }
    setBang(false);
    const raf = requestAnimationFrame(() => setBang(true));
    const timeout = setTimeout(() => setBang(false), 520);
    return () => {
      cancelAnimationFrame(raf);
      clearTimeout(timeout);
    };
  }, [reactionTick]);

  useEffect(() => {
    if (reducedMotion) return;
    let rafPending = false;
    let lastX = window.innerWidth / 2;
    let lastY = window.innerHeight / 2;

    function update() {
      rafPending = false;
      const stage = stageRef.current;
      if (!stage) return;
      const nx = (lastX / window.innerWidth) * 2 - 1;
      const ny = (lastY / window.innerHeight) * 2 - 1;
      stage.style.transform = `perspective(1000px) rotateX(${(-ny * 8).toFixed(2)}deg) rotateY(${(nx * 10).toFixed(2)}deg)`;

      const rect = stage.getBoundingClientRect();
      if (rect.width > 0) {
        const faceX = rect.left + rect.width * 0.5;
        const faceY = rect.top + rect.height * 0.32;
        const angle = Math.atan2(lastY - faceY, lastX - faceX);
        const reach = 2.2;
        const ex = Math.cos(angle) * reach;
        const ey = Math.sin(angle) * reach * 0.7;
        setPupil({ lx: 85 + ex, ly: 83 + ey, rx: 115 + ex, ry: 83 + ey });
      }
    }

    function onMove(e: globalThis.MouseEvent) {
      lastX = e.clientX;
      lastY = e.clientY;
      if (!rafPending) {
        rafPending = true;
        requestAnimationFrame(update);
      }
    }

    window.addEventListener('mousemove', onMove);
    return () => window.removeEventListener('mousemove', onMove);
  }, [reducedMotion]);

  return (
    <div className={styles.stage} id="judge-stage" ref={stageRef} aria-hidden="true">
      <div className={[styles.judge, bang ? styles.bang : ''].join(' ')}>
        <svg viewBox="0 0 200 260" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <linearGradient id="robeGrad" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0" stopColor="#3d4670" />
              <stop offset="0.5" stopColor="#1b2044" />
              <stop offset="1" stopColor="#0c0f24" />
            </linearGradient>
            <linearGradient id="robeShine" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor="#7c88c9" stopOpacity="0.6" />
              <stop offset="1" stopColor="#5763a3" stopOpacity="0" />
            </linearGradient>
            <radialGradient id="skinGrad" cx="0.38" cy="0.32" r="0.75">
              <stop offset="0" stopColor="#f4c9a4" />
              <stop offset="0.7" stopColor="#dba576" />
              <stop offset="1" stopColor="#b9814f" />
            </radialGradient>
            <linearGradient id="gvlWood" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0" stopColor="#e3b378" />
              <stop offset="0.5" stopColor="#93602f" />
              <stop offset="1" stopColor="#603c1a" />
            </linearGradient>
            <radialGradient id="benchGrad" cx="0.5" cy="0" r="1">
              <stop offset="0" stopColor="#5a3f22" />
              <stop offset="1" stopColor="#26190c" />
            </radialGradient>
            <radialGradient id="haloGlow" cx="0.5" cy="0.5" r="0.5">
              <stop offset="0" stopColor="#e3c063" stopOpacity="0.35" />
              <stop offset="1" stopColor="#e3c063" stopOpacity="0" />
            </radialGradient>
            <radialGradient id="medallionGrad" cx="0.35" cy="0.3" r="0.8">
              <stop offset="0" stopColor="#fff3cf" />
              <stop offset="0.5" stopColor="#e3c063" />
              <stop offset="1" stopColor="#8a681f" />
            </radialGradient>
            <linearGradient id="hairGrad" x1="0.1" y1="0" x2="0.9" y2="1">
              <stop offset="0" stopColor="#eef0f3" />
              <stop offset="0.5" stopColor="#b6bcc7" />
              <stop offset="1" stopColor="#7d8493" />
            </linearGradient>
          </defs>

          <ellipse cx="100" cy="95" rx="95" ry="100" fill="url(#haloGlow)" />
          <ellipse cx="100" cy="252" rx="82" ry="10" fill="#000" opacity="0.28" />

          <rect x="14" y="200" width="172" height="52" rx="6" fill="url(#benchGrad)" />
          <rect x="14" y="200" width="172" height="10" rx="4" fill="#6b4a26" />
          <path d="M20 214 Q100 208 180 214" stroke="#1c1108" strokeWidth="1.4" opacity="0.4" fill="none" />
          <path d="M20 228 Q100 236 180 228" stroke="#1c1108" strokeWidth="1.4" opacity="0.35" fill="none" />
          <path d="M20 242 Q100 237 180 242" stroke="#1c1108" strokeWidth="1.2" opacity="0.3" fill="none" />
          <text
            x="100"
            y="245"
            textAnchor="middle"
            fontFamily="IBM Plex Mono, monospace"
            fontSize="7"
            fill="#e3c063"
            opacity="0.75"
            letterSpacing="1"
          >
            VARA EMPRESARIAL
          </text>

          <path d="M46 250 C40 175 55 118 100 112 C145 118 160 175 154 250 Z" fill="url(#robeGrad)" />
          <path d="M46 250 C40 175 55 118 100 112 C145 118 160 175 154 250 Z" fill="url(#robeShine)" />
          <path d="M100 112 C93 150 93 205 98 250" stroke="#000" strokeOpacity="0.25" strokeWidth="3" fill="none" />
          <path d="M78 122 C70 165 68 210 72 250" stroke="#000" strokeOpacity="0.18" strokeWidth="4" fill="none" />
          <path d="M122 122 C130 165 132 210 128 250" stroke="#000" strokeOpacity="0.18" strokeWidth="4" fill="none" />
          <path d="M60 150 C56 185 58 218 62 248" stroke="#000" strokeOpacity="0.12" strokeWidth="3" fill="none" />
          <path d="M140 150 C144 185 142 218 138 248" stroke="#000" strokeOpacity="0.12" strokeWidth="3" fill="none" />
          <circle cx="100" cy="168" r="2.6" fill="#e3c063" opacity="0.85" />
          <circle cx="100" cy="190" r="2.6" fill="#e3c063" opacity="0.85" />
          <circle cx="100" cy="212" r="2.6" fill="#e3c063" opacity="0.85" />

          <path d="M78 118 L100 138 L122 118 L128 130 L100 152 L72 130 Z" fill="#f4efe1" />
          <path d="M78 118 L100 138 L122 118" fill="none" stroke="#c9c2ac" strokeWidth="1" />
          <rect x="93" y="128" width="14" height="34" fill="#f4efe1" />
          <rect x="93" y="128" width="14" height="34" fill="#000" opacity="0.06" />
          <circle cx="100" cy="146" r="8.5" fill="url(#medallionGrad)" stroke="#8a681f" strokeWidth="1" />
          <text x="100" y="149" textAnchor="middle" fontFamily="Playfair Display, serif" fontSize="9" fill="#5a3f0c">
            ⚖
          </text>

          <ellipse cx="100" cy="82" rx="38" ry="42" fill="url(#skinGrad)" />
          <ellipse cx="82" cy="72" rx="12" ry="8" fill="#fff" opacity="0.18" />

          <ellipse cx="76" cy="95" rx="8.5" ry="5.5" fill="#e8828a" opacity="0.35" />
          <ellipse cx="124" cy="95" rx="8.5" ry="5.5" fill="#e8828a" opacity="0.35" />

          <path
            d="M62 78 C58 40 78 18 100 18 C122 18 142 40 138 78 C138 55 122 44 100 44 C78 44 62 55 62 78 Z"
            fill="url(#hairGrad)"
          />
          <path
            d="M64 44 C78 34 96 30 112 36 C123 40 131 47 136 56 C122 45 104 39 88 41 C79 42 71 43 64 44 Z"
            fill="url(#hairGrad)"
            opacity="0.95"
          />
          <path d="M62 66 C58 74 58 83 62 89 C64 83 64 75 66 69 Z" fill="url(#hairGrad)" />
          <path d="M138 66 C142 74 142 83 138 89 C136 83 136 75 134 69 Z" fill="url(#hairGrad)" />
          <path d="M70 30 Q85 21 100 25" stroke="#f5f6f8" strokeWidth="1.4" fill="none" opacity="0.65" strokeLinecap="round" />
          <path d="M96 24 Q113 20 128 30" stroke="#f5f6f8" strokeWidth="1.4" fill="none" opacity="0.55" strokeLinecap="round" />
          <path d="M112 30 Q125 35 134 45" stroke="#6b7280" strokeWidth="1.4" fill="none" opacity="0.45" strokeLinecap="round" />

          <ellipse cx="85" cy="83" rx="7.2" ry="7.8" fill="#f4efe1" />
          <ellipse cx="115" cy="83" rx="7.2" ry="7.8" fill="#f4efe1" />
          <circle className={styles.pupil} cx={pupil.lx} cy={pupil.ly} r="4" fill="#3a2712" />
          <circle className={styles.pupil} cx={pupil.rx} cy={pupil.ry} r="4" fill="#3a2712" />
          <circle cx="86.8" cy="81" r="1.2" fill="#fff" opacity="0.9" />
          <circle cx="116.8" cy="81" r="1.2" fill="#fff" opacity="0.9" />
          <circle cx="83.2" cy="85" r="0.7" fill="#fff" opacity="0.6" />
          <circle cx="113.2" cy="85" r="0.7" fill="#fff" opacity="0.6" />

          <path d="M83 101 Q100 111 117 101" stroke="#7a4c30" strokeWidth="3" fill="none" strokeLinecap="round" />
          <path d="M73 68 Q85 58 97 66" stroke="#4a4d54" strokeWidth="4.2" fill="none" strokeLinecap="round" />
          <path d="M103 66 Q115 58 127 68" stroke="#4a4d54" strokeWidth="4.2" fill="none" strokeLinecap="round" />

          <path d="M150 150 C168 158 178 172 176 190 L160 196 C158 178 150 168 138 160 Z" fill="url(#robeGrad)" />
          <g transform="translate(150,150) rotate(-25)">
            <rect x="-5" y="-38" width="10" height="38" rx="4" fill="url(#gvlWood)" />
            <ellipse cx="0" cy="-48" rx="23" ry="13" fill="url(#gvlWood)" />
            <ellipse cx="0" cy="-52" rx="23" ry="5.5" fill="#f5ddb0" opacity="0.6" />
            <ellipse cx="0" cy="-44" rx="23" ry="5" fill="#3a2308" opacity="0.35" />
            <g className={styles.spark} opacity={bang ? undefined : 0}>
              <path
                d="M-27 -48 L-38 -54 M-27 -48 L-40 -44 M-27 -48 L-34 -32"
                stroke="#e3c063"
                strokeWidth="2"
                strokeLinecap="round"
              />
            </g>
          </g>
        </svg>
      </div>
    </div>
  );
}
