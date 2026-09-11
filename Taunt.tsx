import styles from './Taunt.module.css';

interface TauntProps {
  message: string;
  show: boolean;
}

/** Balão de provocação do juiz — sincronizado externamente (ver useTaunts). */
export function Taunt({ message, show }: TauntProps) {
  return (
    <div className={[styles.taunt, show ? styles.show : ''].join(' ')} aria-hidden="true">
      {message}
    </div>
  );
}
