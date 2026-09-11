import type { PropsWithChildren, CSSProperties, MouseEvent } from 'react';
import { useRef } from 'react';
import { useReducedMotion } from '../../hooks/useReducedMotion';
import styles from './DocumentCard.module.css';

interface DocumentCardProps {
  wide?: boolean;
  className?: string;
}

/**
 * O "papel" que carrega cada tela: pilha de folhas com profundidade,
 * clipe de metal, um spotlight que segue o cursor e um leve tilt 3D (a
 * folha se inclina em direção ao mouse, como um cartão físico sobre a
 * mesa) — a assinatura visual do sistema. Em toque (mobile) nenhum dos
 * dois ativa, o que é o comportamento correto (não há cursor para seguir).
 */
export function DocumentCard({ wide, className, children }: PropsWithChildren<DocumentCardProps>) {
  const docRef = useRef<HTMLDivElement>(null);
  const reducedMotion = useReducedMotion();

  function handleMouseMove(e: MouseEvent<HTMLDivElement>) {
    const doc = docRef.current;
    if (!doc) return;
    const r = doc.getBoundingClientRect();
    const px = (e.clientX - r.left) / r.width;
    const py = (e.clientY - r.top) / r.height;
    doc.style.setProperty('--sx', `${(px * 100).toFixed(1)}%`);
    doc.style.setProperty('--sy', `${(py * 100).toFixed(1)}%`);
    if (!reducedMotion) {
      doc.style.setProperty('--tilt-x', `${((0.5 - py) * 5).toFixed(2)}deg`);
      doc.style.setProperty('--tilt-y', `${((px - 0.5) * 6).toFixed(2)}deg`);
    }
  }

  function handleMouseLeave() {
    const doc = docRef.current;
    if (!doc) return;
    doc.style.setProperty('--tilt-x', '0deg');
    doc.style.setProperty('--tilt-y', '0deg');
  }

  const style = { '--doc-max-width': wide ? '980px' : '760px' } as CSSProperties;

  return (
    <div
      className={[styles.stack, className].filter(Boolean).join(' ')}
      style={style}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
    >
      <div className={styles.doc} ref={docRef}>
        <div className={styles.clip} aria-hidden="true" />
        <div className={styles.spotlight} aria-hidden="true" />
        <div className={styles.content}>{children}</div>
      </div>
    </div>
  );
}
