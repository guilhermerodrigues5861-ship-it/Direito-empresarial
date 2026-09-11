import { useCallback, useEffect, useState } from 'react';
import { Button } from '../../components/ui/Button';
import { loadQuestionErrorStats } from '../../lib/quiz-api';
import type { QuestionStatRow, Turma } from '../../lib/types';
import shared from './shared.module.css';

interface ErrosTabProps {
  turma: Turma;
}

type LoadState = 'loading' | 'ready' | 'empty' | 'unavailable';

function errorPillClass(rate: number): string {
  if (rate >= 50) return 'low';
  if (rate >= 25) return 'mid';
  return '';
}

export function ErrosTab({ turma }: ErrosTabProps) {
  const [state, setState] = useState<LoadState>('loading');
  const [rows, setRows] = useState<QuestionStatRow[]>([]);

  const refresh = useCallback(() => {
    setState('loading');
    loadQuestionErrorStats(turma).then((data) => {
      if (data === null) {
        setState('unavailable');
        return;
      }
      const withAnswers = data.filter((q) => q.total_answers > 0);
      setRows(withAnswers);
      setState(withAnswers.length === 0 ? 'empty' : 'ready');
    });
  }, [turma]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return (
    <div>
      <Button size="sm" onClick={refresh} style={{ marginBottom: 14 }}>
        ↻ Atualizar
      </Button>

      {state === 'loading' && <p className={shared.emptyState}>Carregando estatísticas...</p>}
      {state === 'unavailable' && (
        <p className={[shared.emptyState, shared.errorState].join(' ')} role="alert">
          Não foi possível carregar. Confirme se a função get_question_stats já foi criada no
          banco.
        </p>
      )}
      {state === 'empty' && <p className={shared.emptyState}>Ainda não há respostas registradas para esta turma.</p>}

      {state === 'ready' &&
        rows.map((q) => (
          <div className={shared.errorRow} key={q.id}>
            <div className={shared.qrowMain}>
              <div className={shared.qrowTopic}>{q.topic || 'Sem matéria'}</div>
              <div className={shared.qrowText}>{q.question}</div>
            </div>
            <div className={shared.errorRowMeta}>
              <span className={[shared.pill, shared[errorPillClass(q.error_rate)] ?? ''].join(' ')}>
                {q.error_rate}% de erro
              </span>
              <br />
              {q.wrong_answers} de {q.total_answers} respostas
            </div>
          </div>
        ))}
    </div>
  );
}
