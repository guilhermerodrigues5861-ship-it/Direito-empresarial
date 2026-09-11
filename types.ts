// Tipos compartilhados pelo app. Mantidos em um único lugar porque o
// contrato de dados (linhas do Supabase, payloads da Edge Function) é
// usado por várias telas.

export type Turma = '4' | '6';

export interface Student {
  name: string;
  email: string;
  turma: Turma | '';
}

export interface QuizQuestion {
  id: string;
  turma: Turma;
  topic: string;
  q: string;
  options: string[];
  /** Ausente quando a pergunta vem da RPC pública (ver submit_answer no SQL) */
  correct?: number;
  exp: string;
}

export interface QuizAnswerResult {
  isCorrect: boolean;
  correctIndex: number;
  explanation: string;
}

export interface RankingRow {
  display_name: string | null;
  score: number | null;
  correct: number | null;
  total: number | null;
}

export interface QuestionStatRow {
  id: string;
  topic: string;
  question: string;
  total_answers: number;
  wrong_answers: number;
  error_rate: number;
}

export interface AttemptRow {
  student_name: string;
  student_email: string;
  turma: Turma;
  correct: number;
  total: number;
  score: number;
  pct: number;
  rank: string;
  revelia: boolean;
  created_at: string;
}

export interface Attempt {
  name: string;
  email: string;
  turma: Turma;
  correct: number;
  total: number;
  score: number;
  pct: number;
  rank: string;
  revelia: boolean;
  date: string;
}

export type ScreenName =
  | 'register'
  | 'intro'
  | 'quiz'
  | 'result'
  | 'ranking'
  | 'teacher';

export interface RankInfo {
  rank: string;
  msg: string;
}
