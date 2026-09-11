import { useState } from 'react';
import { DocumentCard } from '../../components/ui/DocumentCard';
import { Button } from '../../components/ui/Button';
import { TeacherGate } from './TeacherGate';
import { NotasTab } from './NotasTab';
import { PerguntasTab } from './PerguntasTab';
import { ErrosTab } from './ErrosTab';
import type { Turma } from '../../lib/types';
import styles from './TeacherScreen.module.css';

interface TeacherScreenProps {
  onBack: () => void;
  showToast: (msg: string) => void;
}

type Tab = 'notas' | 'perguntas' | 'erros';

export function TeacherScreen({ onBack, showToast }: TeacherScreenProps) {
  const [password, setPassword] = useState<string | null>(null);
  const [turma, setTurma] = useState<Turma>('4');
  const [tab, setTab] = useState<Tab>('notas');

  if (password === null) {
    return <TeacherGate onLoggedIn={setPassword} onBack={onBack} />;
  }

  return (
    <DocumentCard wide>
      <div className={styles.dashHeader}>
        <h1 className={styles.dashTitle}>Painel do professor</h1>
        <Button size="sm" onClick={() => setPassword(null)}>
          Sair
        </Button>
      </div>

      <div className={styles.turmaSwitch}>
        <Button variant="outline" size="sm" active={turma === '4'} onClick={() => setTurma('4')}>
          4° período
        </Button>
        <Button variant="outline" size="sm" active={turma === '6'} onClick={() => setTurma('6')}>
          6° período
        </Button>
      </div>

      <div className={styles.tabsRow}>
        <button
          type="button"
          className={[styles.tabBtn, tab === 'notas' ? styles.active : ''].join(' ')}
          onClick={() => setTab('notas')}
        >
          📋 Notas da turma
        </button>
        <button
          type="button"
          className={[styles.tabBtn, tab === 'perguntas' ? styles.active : ''].join(' ')}
          onClick={() => setTab('perguntas')}
        >
          📝 Perguntas do quiz
        </button>
        <button
          type="button"
          className={[styles.tabBtn, tab === 'erros' ? styles.active : ''].join(' ')}
          onClick={() => setTab('erros')}
        >
          ❗ Questões com mais erro
        </button>
      </div>

      {tab === 'notas' && <NotasTab turma={turma} password={password} />}
      {tab === 'perguntas' && (
        <PerguntasTab turma={turma} password={password} onTurmaChange={setTurma} showToast={showToast} />
      )}
      {tab === 'erros' && <ErrosTab turma={turma} />}
    </DocumentCard>
  );
}
