import { useCallback, useEffect, useMemo, useState } from 'react';
import { Button } from '../../components/ui/Button';
import { clearQuestions, deleteQuestion, loadTeacherQuestionBank } from '../../lib/quiz-api';
import type { QuizQuestion, Turma } from '../../lib/types';
import { QuestionForm } from './QuestionForm';
import shared from './shared.module.css';

interface PerguntasTabProps {
  turma: Turma;
  password: string;
  onTurmaChange: (turma: Turma) => void;
  showToast: (msg: string) => void;
}

type LoadState = 'loading' | 'ready' | 'error';

export function PerguntasTab({ turma, password, onTurmaChange, showToast }: PerguntasTabProps) {
  const [state, setState] = useState<LoadState>('loading');
  const [questions, setQuestions] = useState<QuizQuestion[]>([]);
  const [search, setSearch] = useState('');
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<QuizQuestion | null>(null);

  const refresh = useCallback(() => {
    setState('loading');
    loadTeacherQuestionBank(turma, password)
      .then((list) => {
        setQuestions(list);
        setState('ready');
      })
      .catch(() => setState('error'));
  }, [turma, password]);

  useEffect(() => {
    setFormOpen(false);
    setEditing(null);
    refresh();
  }, [refresh]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return questions;
    return questions.filter((item) => item.topic.toLowerCase().includes(q) || item.q.toLowerCase().includes(q));
  }, [questions, search]);

  async function handleDelete(item: QuizQuestion) {
    if (!window.confirm('Excluir esta pergunta do banco? Essa ação vale para todos os alunos desta turma.')) return;
    const ok = await deleteQuestion(item.id, password);
    if (!ok) {
      showToast('Não foi possível excluir a pergunta.');
      return;
    }
    refresh();
  }

  async function handleClearAll() {
    const turmaLabel = turma === '4' ? '4° período' : '6° período';
    if (!window.confirm(`Esvaziar TODO o banco de perguntas da turma ${turmaLabel}? Essa ação não pode ser desfeita.`)) return;
    const ok = await clearQuestions(turma, password);
    if (!ok) {
      showToast('Não foi possível esvaziar o banco de perguntas.');
      return;
    }
    refresh();
  }

  function handleSaved(savedTurma: Turma) {
    setFormOpen(false);
    setEditing(null);
    if (savedTurma !== turma) {
      onTurmaChange(savedTurma);
    } else {
      refresh();
    }
  }

  const turmaLabel = turma === '4' ? '4° período' : '6° período';

  return (
    <div>
      <div className={shared.toolbar}>
        <input
          type="text"
          placeholder="Buscar por matéria ou texto da pergunta..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            setEditing(null);
            setFormOpen(true);
          }}
        >
          + Nova pergunta
        </Button>
        <Button size="sm" onClick={handleClearAll} disabled={questions.length === 0}>
          🗑 Esvaziar banco desta turma
        </Button>
      </div>

      <p style={{ fontSize: '0.85rem', opacity: 0.75, marginBottom: 14 }}>
        {state === 'loading'
          ? 'Carregando...'
          : `${questions.length} pergunta(s) no banco da turma ${turmaLabel}` +
            (search ? ` — ${filtered.length} encontrada(s)` : '') +
            '.'}
      </p>

      {formOpen && (
        <QuestionForm
          turma={turma}
          editing={editing}
          password={password}
          onSaved={handleSaved}
          onCancel={() => {
            setFormOpen(false);
            setEditing(null);
          }}
        />
      )}

      {state === 'error' && (
        <p className={[shared.emptyState, shared.errorState].join(' ')} role="alert">
          Não foi possível carregar as perguntas desta turma agora.
        </p>
      )}

      {state === 'ready' && filtered.length === 0 && (
        <p className={shared.emptyState}>Nenhuma pergunta cadastrada ainda para esta turma.</p>
      )}

      {state === 'ready' &&
        filtered.map((item) => (
          <div className={shared.qrow} key={item.id}>
            <div className={shared.qrowMain}>
              <div className={shared.qrowTopic}>{item.topic || 'Sem matéria'}</div>
              <div className={shared.qrowText}>{item.q}</div>
            </div>
            <div className={shared.qrowActions}>
              <button
                type="button"
                onClick={() => {
                  setEditing(item);
                  setFormOpen(true);
                }}
              >
                Editar
              </button>
              <button type="button" className={shared.danger} onClick={() => handleDelete(item)}>
                Excluir
              </button>
            </div>
          </div>
        ))}
    </div>
  );
}
