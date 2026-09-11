import { useEffect, useState } from 'react';
import { DocumentCard } from '../components/ui/DocumentCard';
import { Button } from '../components/ui/Button';
import { loadRanking } from '../lib/quiz-api';
import type { RankingRow, Turma } from '../lib/types';
import styles from './RankingScreen.module.css';

interface RankingScreenProps {
  turma: Turma;
  onBack: () => void;
}

type LoadState = 'loading' | 'ready' | 'empty' | 'unavailable' | 'error';

const PODIUM_CLASS = ['gold', 'silver', 'bronze'] as const;
const MEDALS = ['🥇', '🥈', '🥉'];

export function RankingScreen({ turma, onBack }: RankingScreenProps) {
  const [state, setState] = useState<LoadState>('loading');
  const [rows, setRows] = useState<RankingRow[]>([]);

  useEffect(() => {
    let cancelled = false;
    setState('loading');
    loadRanking(turma).then((data) => {
      if (cancelled) return;
      if (data === null) {
        setState('unavailable');
        return;
      }
      if (data.length === 0) {
        setState('empty');
        return;
      }
      setRows(data);
      setState('ready');
    });
    return () => {
      cancelled = true;
    };
  }, [turma]);

  const turmaLabel = turma === '4' ? '4° período' : '6° período';
  const podium = rows.slice(0, 3);
  const rest = rows.slice(3);

  return (
    <DocumentCard>
      <h1 className={styles.title}>Ranking da turma</h1>
      <p className={styles.subtitle}>
        Os honorários mais altos já arrecadados na turma do {turmaLabel}.
      </p>

      {state === 'loading' && <p className={styles.empty}>Carregando o placar...</p>}

      {state === 'unavailable' && (
        <p className={styles.empty} role="alert">
          Ranking ainda não disponível para esta turma. Peça ao professor para configurar essa
          função no banco.
        </p>
      )}

      {state === 'error' && (
        <p className={styles.empty} role="alert">
          Não foi possível carregar o ranking agora. Tente de novo em instantes.
        </p>
      )}

      {state === 'empty' && (
        <p className={styles.empty}>
          Ainda não há ninguém no ranking desta turma. Seja o primeiro a abrir um processo!
        </p>
      )}

      {state === 'ready' && (
        <>
          {podium.length === 3 && (
            <div className={styles.podium}>
              {podium.map((row, i) => (
                <div key={i} className={[styles.podiumSpot, styles[PODIUM_CLASS[i]]].join(' ')}>
                  <span className={styles.medal}>{MEDALS[i]}</span>
                  <span className={styles.name}>{row.display_name || 'Anônimo(a)'}</span>
                  <span className={styles.score}>{row.score ?? '—'}</span>
                </div>
              ))}
            </div>
          )}
          <div className={styles.list}>
            {(podium.length === 3 ? rest : rows).map((row, i) => {
              const rank = podium.length === 3 ? i + 4 : i + 1;
              return (
                <div key={rank} className={styles.row}>
                  <span className={styles.pos}>#{rank}</span>
                  <span className={styles.name}>{row.display_name || 'Anônimo(a)'}</span>
                  <span className={styles.meta}>
                    <span className={styles.score}>{row.score ?? '—'}</span>
                    {row.correct != null && row.total != null ? `${row.correct}/${row.total}` : ''}
                  </span>
                </div>
              );
            })}
          </div>
        </>
      )}

      <div className={styles.backLink}>
        <Button variant="ghost" onClick={onBack}>
          ← Voltar
        </Button>
      </div>
    </DocumentCard>
  );
}
