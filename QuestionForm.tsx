import { useState } from 'react';
import { Button } from '../../components/ui/Button';
import { upsertQuestion, type QuestionPayload } from '../../lib/quiz-api';
import type { QuizQuestion, Turma } from '../../lib/types';
import shared from './shared.module.css';

const LETTERS = ['A', 'B', 'C', 'D'];

interface QuestionFormProps {
  turma: Turma;
  editing: QuizQuestion | null;
  password: string;
  onSaved: (savedTurma: Turma) => void;
  onCancel: () => void;
}

export function QuestionForm({ turma, editing, password, onSaved, onCancel }: QuestionFormProps) {
  const [formTurma, setFormTurma] = useState<Turma>(editing?.turma ?? turma);
  const [topic, setTopic] = useState(editing?.topic ?? '');
  const [question, setQuestion] = useState(editing?.q ?? '');
  const [options, setOptions] = useState<string[]>(() => {
    const base = editing?.options ? [...editing.options] : ['', '', '', ''];
    while (base.length < 4) base.push('');
    return base.slice(0, 4);
  });
  const [correct, setCorrect] = useState<number>(editing?.correct ?? 0);
  const [explanation, setExplanation] = useState(editing?.exp ?? '');
  const [error, setError] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  async function handleSave() {
    const allOptionsFilled = options.every((o) => o.trim().length > 0);
    const valid = topic.trim() && question.trim() && explanation.trim() && allOptionsFilled && correct >= 0;
    if (!valid) {
      setError(true);
      return;
    }
    setError(false);
    setSaveError(null);
    setSaving(true);

    const payload: QuestionPayload = {
      id: editing?.id,
      turma: formTurma,
      topic: topic.trim(),
      question: question.trim(),
      options: options.map((o) => o.trim()),
      correct_index: correct,
      explanation: explanation.trim(),
    };

    const ok = await upsertQuestion(payload, password);
    setSaving(false);
    if (!ok) {
      setSaveError('Não foi possível salvar a pergunta.');
      return;
    }
    onSaved(formTurma);
  }

  return (
    <div className={shared.qform}>
      <div className={shared.qformRow}>
        <div className={shared.qformField}>
          <label htmlFor="qf-turma">Turma</label>
          <select id="qf-turma" value={formTurma} onChange={(e) => setFormTurma(e.target.value as Turma)}>
            <option value="4">4° período</option>
            <option value="6">6° período</option>
          </select>
        </div>
        <div className={shared.qformField}>
          <label htmlFor="qf-topic">Matéria</label>
          <input
            id="qf-topic"
            type="text"
            placeholder="Ex.: Recuperação Judicial"
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
          />
        </div>
      </div>

      <div className={shared.qformField}>
        <label htmlFor="qf-question">Enunciado</label>
        <textarea
          id="qf-question"
          rows={2}
          placeholder="Enunciado da pergunta"
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
        />
      </div>

      <div className={shared.qformOptions}>
        {options.map((opt, i) => (
          <div className={shared.qformOpt} key={i}>
            <span className={shared.optLetter}>{LETTERS[i]}</span>
            <input
              type="radio"
              name="qf-correct"
              checked={correct === i}
              onChange={() => setCorrect(i)}
              aria-label={`Marcar alternativa ${LETTERS[i]} como correta`}
            />
            <input
              type="text"
              placeholder={`Alternativa ${LETTERS[i]}`}
              value={opt}
              onChange={(e) => setOptions((prev) => prev.map((o, j) => (j === i ? e.target.value : o)))}
            />
          </div>
        ))}
        <p style={{ fontSize: '0.78rem', opacity: 0.7 }}>Marque o botão à esquerda da alternativa correta.</p>
      </div>

      <div className={shared.qformField}>
        <label htmlFor="qf-exp">Fundamentação</label>
        <textarea
          id="qf-exp"
          rows={2}
          placeholder="Base legal / explicação da resposta correta"
          value={explanation}
          onChange={(e) => setExplanation(e.target.value)}
        />
      </div>

      {error && (
        <p style={{ color: 'var(--stamp-red-dark)', fontSize: '0.85rem', marginBottom: 12 }}>
          Preencha a matéria, a pergunta, todas as alternativas e marque a correta.
        </p>
      )}
      {saveError && (
        <p style={{ color: 'var(--stamp-red-dark)', fontSize: '0.85rem', marginBottom: 12 }}>{saveError}</p>
      )}

      <div className={shared.qformActions}>
        <Button variant="primary" size="sm" onClick={handleSave} disabled={saving}>
          {saving ? 'Salvando...' : 'Salvar pergunta'}
        </Button>
        <Button size="sm" onClick={onCancel} disabled={saving}>
          Cancelar
        </Button>
      </div>
    </div>
  );
}
