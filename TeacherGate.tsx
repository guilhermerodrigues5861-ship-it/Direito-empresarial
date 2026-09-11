import { useState, type FormEvent } from 'react';
import { DocumentCard } from '../../components/ui/DocumentCard';
import { Button } from '../../components/ui/Button';
import { teacherLogin } from '../../lib/quiz-api';
import styles from './TeacherScreen.module.css';

interface TeacherGateProps {
  onLoggedIn: (password: string) => void;
  onBack: () => void;
}

export function TeacherGate({ onLoggedIn, onBack }: TeacherGateProps) {
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(false);
    try {
      const ok = await teacherLogin(password);
      if (ok) {
        onLoggedIn(password);
      } else {
        setError(true);
      }
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }

  return (
    <DocumentCard className={styles.gateWrap}>
      <h1 className={styles.title}>Painel do professor</h1>
      <p className={styles.lead}>Acesso restrito. Informe a senha do painel para ver as notas da turma.</p>
      <form onSubmit={handleSubmit} noValidate>
        <div className={[styles.field, error ? styles.error : ''].join(' ')}>
          <label htmlFor="teacher-pass">Senha</label>
          <div className={styles.passRow}>
            <input
              id="teacher-pass"
              className={styles.input}
              type={showPassword ? 'text' : 'password'}
              autoComplete="off"
              aria-describedby="err-teacher-pass"
              aria-invalid={error}
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                setError(false);
              }}
            />
            <button
              type="button"
              className={styles.passToggle}
              aria-pressed={showPassword}
              onClick={() => setShowPassword((s) => !s)}
            >
              {showPassword ? 'Ocultar' : 'Mostrar'}
            </button>
          </div>
          <span className={styles.errMsg} id="err-teacher-pass">
            Senha incorreta.
          </span>
        </div>
        <Button type="submit" variant="primary" disabled={loading}>
          {loading ? 'Verificando...' : 'Entrar →'}
        </Button>
        <div className={styles.backLink}>
          <Button type="button" variant="ghost" onClick={onBack}>
            ← Voltar
          </Button>
        </div>
      </form>
    </DocumentCard>
  );
}
