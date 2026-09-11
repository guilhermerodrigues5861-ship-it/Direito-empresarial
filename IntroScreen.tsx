import { useState } from 'react';
import { DocumentCard } from '../components/ui/DocumentCard';
import { Button } from '../components/ui/Button';
import type { QuizQuestion } from '../lib/types';
import styles from './IntroScreen.module.css';

type LoadState = 'idle' | 'loading' | 'empty' | 'error';

interface IntroScreenProps {
  studentName: string;
  loadQuestions: () => Promise<QuizQuestion[]>;
  onReady: (questions: QuizQuestion[]) => void;
  onBack: () => void;
}

export function IntroScreen({ studentName, loadQuestions, onReady, onBack }: IntroScreenProps) {
  const [state, setState] = useState<LoadState>('idle');

  async function handleStart() {
    setState('loading');
    try {
      const list = await loadQuestions();
      if (list.length === 0) {
        setState('empty');
        return;
      }
      onReady(list);
    } catch {
      setState('error');
    }
  }

  const firstName = studentName.trim().split(/\s+/)[0] || '';

  return (
    <DocumentCard>
      <p className={styles.eyebrow}>Autos em segredo de justiça</p>
      <h1 className={styles.title}>
        <span className={styles.gavel} aria-hidden="true">
          🔨
        </span>{' '}
        {firstName ? `${firstName}, você` : 'Você'} será interrogado(a) sobre Direito Empresarial.
      </h1>
      <p className={styles.lead}>
        <em>Vistos, relatados e ainda não muito discutidos os presentes autos:</em> questões sobre
        empresário, sociedades, títulos de crédito, recuperação judicial, recuperação especial,
        recuperação extrajudicial e propriedade industrial aguardam sua manifestação. A banca é
        exigente. O tempo, curto. E o juiz aqui do canto adora comentar.
      </p>
      <ul className={styles.rules}>
        <li>
          <span className={styles.ic}>📜</span> Feito individual — este processo corre em segredo
          de justiça, vedada a consulta a colegas, apostilas ou inteligências artificiais.
        </li>
        <li>
          <span className={styles.ic}>⏱️</span> Cada questão tem 45 segundos. Estourou o prazo, o
          juiz decide por você (e raramente é a seu favor).
        </li>
        <li>
          <span className={styles.ic}>❤️</span> Você tem 10 recursos (chances). Errar consome um
          recurso — zerou, o processo é julgado à revelia.
        </li>
        <li>
          <span className={styles.ic}>🏅</span> Acertos em sequência valem bônus e podem render
          uma promoção de patente ao final.
        </li>
      </ul>
      <Button variant="primary" disabled={state === 'loading'} onClick={handleStart}>
        {state === 'loading' ? 'Abrindo o processo...' : 'Abrir o processo →'}
      </Button>
      {state === 'empty' && (
        <p className={styles.startHint} role="status">
          Nenhuma pergunta cadastrada para esta turma ainda. Avise seu professor.
        </p>
      )}
      {state === 'error' && (
        <p className={styles.startHint} role="alert">
          Não foi possível carregar as perguntas agora — verifique sua conexão e tente novamente.
        </p>
      )}
      <div className={styles.backLink}>
        <Button type="button" variant="ghost" onClick={onBack} disabled={state === 'loading'}>
          ← Voltar
        </Button>
      </div>
    </DocumentCard>
  );
}
