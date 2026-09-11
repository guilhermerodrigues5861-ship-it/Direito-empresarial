import { useEffect, useRef, useState } from 'react';
import { DocumentCard } from '../components/ui/DocumentCard';
import { Button } from '../components/ui/Button';
import { rankFor } from '../data/ranks';
import { saveAttempt } from '../lib/quiz-api';
import type { QuizResult } from './QuizScreen';
import type { Student } from '../lib/types';
import styles from './ResultScreen.module.css';

interface ResultScreenProps {
  student: Student;
  result: QuizResult;
  onRestart: () => void;
  onViewRanking: () => void;
  burstConfetti: (n: number) => void;
}

type SaveState = 'saving' | 'saved' | 'failed';

export function ResultScreen({ student, result, onRestart, onViewRanking, burstConfetti }: ResultScreenProps) {
  const { correct, total, score, revelia } = result;
  const pct = Math.round((correct / total) * 100);
  const info = rankFor(pct, revelia);
  const [saveState, setSaveState] = useState<SaveState>('saving');
  const savedOnce = useRef(false);

  useEffect(() => {
    if (savedOnce.current) return;
    savedOnce.current = true;
    if (!revelia && pct >= 70) burstConfetti(140);

    saveAttempt({
      name: student.name,
      email: student.email,
      turma: student.turma as '4' | '6',
      correct,
      total,
      score,
      pct,
      rank: info.rank,
      revelia,
      date: new Date().toISOString(),
    }).then((ok) => setSaveState(ok ? 'saved' : 'failed'));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <DocumentCard>
      <p className={styles.eyebrow}>{revelia ? 'Julgamento à revelia' : 'Sentença final'}</p>
      <h1 className={styles.title}>{revelia ? 'O processo correu sem você.' : 'Processo julgado e sentenciado.'}</h1>
      <div className={styles.seal}>
        <span className={styles.rank}>{info.rank}</span>
      </div>
      <div className={styles.stats}>
        <div>
          <span className={styles.num}>
            {correct}/{total}
          </span>
          <span className={styles.lbl}>acertos</span>
        </div>
        <div>
          <span className={styles.num}>{score}</span>
          <span className={styles.lbl}>honorários</span>
        </div>
        <div>
          <span className={styles.num}>{pct}%</span>
          <span className={styles.lbl}>aproveitamento</span>
        </div>
      </div>
      <p className={styles.msg}>{info.msg}</p>
      <p className={styles.saved}>
        {saveState === 'saving' && 'Registrando no painel do professor...'}
        {saveState === 'saved' && 'Resultado registrado no painel do professor.'}
        {saveState === 'failed' && 'Não foi possível registrar o resultado agora.'}
      </p>
      <div className={styles.actions}>
        <Button variant="primary" onClick={onRestart}>
          Recorrer da sentença (refazer)
        </Button>
        <Button onClick={onViewRanking}>🏆 Ver ranking da turma</Button>
      </div>
    </DocumentCard>
  );
}
