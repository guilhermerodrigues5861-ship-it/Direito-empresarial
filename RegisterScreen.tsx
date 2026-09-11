import { useState, type FormEvent } from 'react';
import { DocumentCard } from '../components/ui/DocumentCard';
import { Button } from '../components/ui/Button';
import type { Student, Turma } from '../lib/types';
import styles from './RegisterScreen.module.css';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Defina aqui um domínio institucional para exigir (ex.: '@unifenas.br').
// Deixe como '' para aceitar qualquer e-mail com formato válido.
// Usa endsWith (não indexOf) para não aceitar o domínio em qualquer posição.
const INSTITUTIONAL_DOMAIN: string = '';

interface RegisterScreenProps {
  initial: Student;
  onSubmit: (student: Student) => void;
  onOpenTeacher: () => void;
}

export function RegisterScreen({ initial, onSubmit, onOpenTeacher }: RegisterScreenProps) {
  const [name, setName] = useState(initial.name);
  const [email, setEmail] = useState(initial.email);
  const [turma, setTurma] = useState<Turma | ''>(initial.turma);
  const [errors, setErrors] = useState({ name: false, email: false, turma: false });

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const nameOk = name.trim().length >= 3;
    const emailOk =
      EMAIL_RE.test(email.trim()) &&
      (!INSTITUTIONAL_DOMAIN || email.trim().toLowerCase().endsWith(INSTITUTIONAL_DOMAIN.toLowerCase()));
    const turmaOk = turma === '4' || turma === '6';

    setErrors({ name: !nameOk, email: !emailOk, turma: !turmaOk });
    if (!nameOk || !emailOk || !turmaOk) return;

    onSubmit({ name: name.trim(), email: email.trim(), turma });
  }

  return (
    <DocumentCard>
      <p className={styles.eyebrow}>Qualificação das partes</p>
      <h1 className={styles.title}>Antes de tudo, quem está aqui?</h1>
      <p className={styles.lead}>
        Toda petição precisa qualificar quem a assina. Informe seu nome completo e seu e-mail
        institucional — é assim que o professor vai localizar sua nota no painel da turma.
      </p>
      <form onSubmit={handleSubmit} noValidate>
        <div className={[styles.field, errors.name ? styles.error : ''].join(' ')}>
          <label htmlFor="reg-name">Nome completo</label>
          <input
            id="reg-name"
            className={styles.input}
            type="text"
            autoComplete="name"
            placeholder="Ex.: Maria da Silva Souza"
            required
            aria-describedby="err-name"
            aria-invalid={errors.name}
            value={name}
            onChange={(e) => {
              setName(e.target.value);
              setErrors((s) => ({ ...s, name: false }));
            }}
          />
          <span className={styles.errMsg} id="err-name">
            Informe seu nome completo.
          </span>
        </div>

        <div className={[styles.field, errors.email ? styles.error : ''].join(' ')}>
          <label htmlFor="reg-email">E-mail institucional</label>
          <input
            id="reg-email"
            className={styles.input}
            type="email"
            autoComplete="email"
            placeholder="Ex.: maria.souza@unifenas.br"
            required
            aria-describedby="email-hint err-email"
            aria-invalid={errors.email}
            value={email}
            onChange={(e) => {
              setEmail(e.target.value);
              setErrors((s) => ({ ...s, email: false }));
            }}
          />
          <p className={styles.hint} id="email-hint">
            Use o e-mail fornecido pela sua instituição de ensino.
          </p>
          <span className={styles.errMsg} id="err-email">
            Informe um e-mail institucional válido.
          </span>
        </div>

        <div className={[styles.field, errors.turma ? styles.error : ''].join(' ')}>
          <label id="turma-label">Turma</label>
          <div className={styles.turmaGrid} role="radiogroup" aria-labelledby="turma-label">
            {(['4', '6'] as const).map((value) => (
              <button
                type="button"
                key={value}
                role="radio"
                aria-checked={turma === value}
                className={[styles.turmaCard, turma === value ? styles.selected : ''].join(' ')}
                onClick={() => {
                  setTurma(value);
                  setErrors((s) => ({ ...s, turma: false }));
                }}
              >
                <span className={styles.period}>{value}° período</span>
                <span className={styles.desc}>Direito Empresarial</span>
              </button>
            ))}
          </div>
          <span className={styles.errMsg}>Selecione sua turma.</span>
        </div>

        <Button type="submit" variant="primary">
          Confirmar e abrir o processo →
        </Button>
      </form>
      <div className={styles.teacherLink}>
        <Button type="button" variant="ghost" onClick={onOpenTeacher}>
          👩‍⚖️ Painel do professor
        </Button>
      </div>
    </DocumentCard>
  );
}
