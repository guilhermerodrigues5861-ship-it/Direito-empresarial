// Camada de acesso a dados do quiz. Isola as telas do formato exato das
// respostas do Supabase e concentra as chamadas que mudaram de contrato
// na migração de segurança (ver supabase/schema.sql):
//   - o banco de perguntas agora vem da RPC get_quiz_questions, que NÃO
//     inclui o índice da alternativa correta;
//   - a correção da resposta agora é validada no servidor via RPC
//     submit_answer, que também grava o log de acerto/erro.
import { supabase } from './supabase';
import type {
  Attempt,
  AttemptRow,
  QuestionStatRow,
  QuizAnswerResult,
  QuizQuestion,
  RankingRow,
  Turma,
} from './types';

interface QuestionRow {
  id: string;
  turma: Turma;
  topic: string;
  question: string;
  options: string[];
  explanation: string;
}

function questionFromRow(row: QuestionRow): QuizQuestion {
  return {
    id: row.id,
    turma: row.turma,
    topic: row.topic,
    q: row.question,
    options: row.options,
    exp: row.explanation,
  };
}

/** Carrega o banco de perguntas de uma turma, sem o gabarito. */
export async function loadQuestionBank(turma: Turma): Promise<QuizQuestion[]> {
  try {
    const rows = await supabase.rpc<QuestionRow[]>('get_quiz_questions', { p_turma: turma });
    return Array.isArray(rows) ? rows.map(questionFromRow) : [];
  } catch {
    // Propaga como lista vazia + flag de erro é responsabilidade do chamador;
    // aqui relançamos para quem chama decidir "vazio" vs "falha de rede".
    throw new Error('failed_to_load_questions');
  }
}

/** Envia a resposta escolhida; o servidor decide se está correta. */
export async function submitAnswer(
  questionId: string,
  turma: Turma,
  selectedIndex: number
): Promise<QuizAnswerResult> {
  const result = await supabase.rpc<{
    is_correct: boolean;
    correct_index: number;
    explanation: string;
  }>('submit_answer', {
    p_question_id: questionId,
    p_turma: turma,
    p_selected_index: selectedIndex,
  });
  return {
    isCorrect: result.is_correct,
    correctIndex: result.correct_index,
    explanation: result.explanation,
  };
}

export async function saveAttempt(attempt: Attempt): Promise<boolean> {
  try {
    await supabase.rest('/quiz_attempts', {
      method: 'POST',
      headers: { Prefer: 'return=minimal' },
      body: {
        student_name: attempt.name,
        student_email: attempt.email,
        turma: attempt.turma,
        correct: attempt.correct,
        total: attempt.total,
        score: attempt.score,
        pct: attempt.pct,
        rank: attempt.rank,
        revelia: attempt.revelia,
      },
    });
    return true;
  } catch {
    return false;
  }
}

export async function loadRanking(turma: Turma): Promise<RankingRow[] | null> {
  try {
    const data = await supabase.rpc<RankingRow[]>('get_leaderboard', { p_turma: turma });
    return Array.isArray(data) ? data : null;
  } catch {
    return null;
  }
}

export async function loadQuestionErrorStats(turma: Turma): Promise<QuestionStatRow[] | null> {
  try {
    const data = await supabase.rpc<QuestionStatRow[]>('get_question_stats', { p_turma: turma });
    return Array.isArray(data) ? data : null;
  } catch {
    return null;
  }
}

function attemptFromRow(row: AttemptRow): Attempt {
  return {
    name: row.student_name,
    email: row.student_email,
    turma: row.turma,
    correct: row.correct,
    total: row.total,
    score: row.score,
    pct: row.pct,
    rank: row.rank,
    revelia: row.revelia,
    date: row.created_at,
  };
}

export async function teacherLogin(password: string): Promise<boolean> {
  const res = await supabase.teacherCall<{ ok: boolean }>('login', password);
  return res.ok && !!res.data?.ok;
}

export async function loadAttempts(turma: Turma, password: string): Promise<Attempt[]> {
  const res = await supabase.teacherCall<{ attempts: AttemptRow[] }>('list_attempts', password, {
    turma,
  });
  if (!res.ok) throw new Error('teacher_call_failed');
  return (res.data.attempts || []).map(attemptFromRow);
}

export interface QuestionPayload {
  id?: string;
  turma: Turma;
  topic: string;
  question: string;
  options: string[];
  correct_index: number;
  explanation: string;
}

export async function upsertQuestion(payload: QuestionPayload, password: string): Promise<boolean> {
  const res = await supabase.teacherCall('upsert_question', password, { question: payload });
  return res.ok;
}

export async function deleteQuestion(id: string, password: string): Promise<boolean> {
  const res = await supabase.teacherCall('delete_question', password, { id });
  return res.ok;
}

export async function clearQuestions(turma: Turma, password: string): Promise<boolean> {
  const res = await supabase.teacherCall('clear_questions', password, { turma });
  return res.ok;
}

/** Banco de perguntas COM gabarito, para o painel do professor editar. */
export async function loadTeacherQuestionBank(
  turma: Turma,
  password: string
): Promise<QuizQuestion[]> {
  const res = await supabase.teacherCall<{ questions: (QuestionRow & { correct_index: number })[] }>(
    'list_questions',
    password,
    { turma }
  );
  if (!res.ok) throw new Error('teacher_call_failed');
  return (res.data.questions || []).map((row) => ({
    ...questionFromRow(row),
    correct: row.correct_index,
  }));
}
