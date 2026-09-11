import type { CSSProperties } from 'react';
import styles from './TopBar.module.css';

interface TopBarProps {
  caseNumber: string;
  wide?: boolean;
}

export function TopBar({ caseNumber, wide }: TopBarProps) {
  const style = { '--doc-max-width': wide ? '980px' : '760px' } as CSSProperties;
  return (
    <div className={styles.topbar} style={style}>
      <span className={styles.brand}>⚖️ Tribunal do Conhecimento</span>
      <span className={styles.caseNo}>{caseNumber}</span>
    </div>
  );
}
