// Edge Function "teacher" — painel do professor.
//
// Protegida por senha (verificada no banco via verify_teacher_password,
// hash bcrypt — ver supabase/schema.sql). Usa a service role key, que
// ignora as políticas de RLS, então é a única peça do sistema autorizada a
// ler quiz_attempts inteira ou editar o gabarito de quiz_questions.
//
// Deploy: supabase functions deploy teacher
// (a service role key e a URL do projeto já ficam disponíveis automaticamente
// como SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY no ambiente da função —
// não precisa configurar nada além do deploy.)
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
  });
}

function admin() {
  return createClient(SUPABASE_URL, SERVICE_ROLE_KEY);
}

async function requirePassword(password: unknown): Promise<boolean> {
  if (typeof password !== 'string' || password.length === 0) return false;
  const { data, error } = await admin().rpc('verify_teacher_password', { p_password: password });
  return !error && data === true;
}

interface QuestionPayload {
  id?: string;
  turma: string;
  topic: string;
  question: string;
  options: string[];
  correct_index: number;
  explanation: string;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: CORS_HEADERS });
  if (req.method !== 'POST') return json({ ok: false, error: 'method_not_allowed' }, 405);

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return json({ ok: false, error: 'invalid_json' }, 400);
  }

  const action = body.action;
  const password = body.password;

  // "login" só confirma a senha, sem exigir nada mais.
  if (action === 'login') {
    const ok = await requirePassword(password);
    return json({ ok });
  }

  // Todas as demais ações exigem a senha correta em toda chamada — não há
  // sessão/token: o cliente reenvia a senha a cada request (ver
  // src/lib/quiz-api.ts). Isso é suficiente para o nível de proteção de um
  // painel de uso interno de uma turma; para múltiplos professores com
  // contas separadas, trocar por Supabase Auth é o próximo passo natural.
  const authorized = await requirePassword(password);
  if (!authorized) return json({ ok: false, error: 'unauthorized' }, 401);

  const db = admin();

  switch (action) {
    case 'list_attempts': {
      const turma = body.turma;
      const { data, error } = await db
        .from('quiz_attempts')
        .select('*')
        .eq('turma', turma)
        .order('created_at', { ascending: false });
      if (error) return json({ ok: false, error: error.message }, 500);
      return json({ ok: true, attempts: data });
    }

    case 'list_questions': {
      const turma = body.turma;
      const { data, error } = await db
        .from('quiz_questions')
        .select('*')
        .eq('turma', turma)
        .order('sort_order', { ascending: true });
      if (error) return json({ ok: false, error: error.message }, 500);
      return json({ ok: true, questions: data });
    }

    case 'upsert_question': {
      const q = body.question as QuestionPayload | undefined;
      if (
        !q ||
        !['4', '6'].includes(q.turma) ||
        !q.topic?.trim() ||
        !q.question?.trim() ||
        !Array.isArray(q.options) ||
        q.options.length < 2 ||
        q.options.some((o) => !o?.trim()) ||
        typeof q.correct_index !== 'number' ||
        q.correct_index < 0 ||
        q.correct_index >= q.options.length ||
        !q.explanation?.trim()
      ) {
        return json({ ok: false, error: 'invalid_question' }, 400);
      }

      const row = {
        turma: q.turma,
        topic: q.topic.trim(),
        question: q.question.trim(),
        options: q.options.map((o) => o.trim()),
        correct_index: q.correct_index,
        explanation: q.explanation.trim(),
        updated_at: new Date().toISOString(),
      };

      if (q.id) {
        const { error } = await db.from('quiz_questions').update(row).eq('id', q.id);
        if (error) return json({ ok: false, error: error.message }, 500);
      } else {
        const { count } = await db
          .from('quiz_questions')
          .select('id', { count: 'exact', head: true })
          .eq('turma', q.turma);
        const { error } = await db.from('quiz_questions').insert({ ...row, sort_order: count ?? 0 });
        if (error) return json({ ok: false, error: error.message }, 500);
      }
      return json({ ok: true });
    }

    case 'delete_question': {
      const id = body.id;
      if (typeof id !== 'string') return json({ ok: false, error: 'invalid_id' }, 400);
      const { error } = await db.from('quiz_questions').delete().eq('id', id);
      if (error) return json({ ok: false, error: error.message }, 500);
      return json({ ok: true });
    }

    case 'clear_questions': {
      const turma = body.turma;
      if (turma !== '4' && turma !== '6') return json({ ok: false, error: 'invalid_turma' }, 400);
      const { error } = await db.from('quiz_questions').delete().eq('turma', turma);
      if (error) return json({ ok: false, error: error.message }, 500);
      return json({ ok: true });
    }

    case 'change_password': {
      const newPassword = body.new_password;
      if (typeof newPassword !== 'string' || newPassword.length < 6) {
        return json({ ok: false, error: 'password_too_short' }, 400);
      }
      const { error } = await db.rpc('change_teacher_password', { p_new_password: newPassword });
      if (error) return json({ ok: false, error: error.message }, 500);
      return json({ ok: true });
    }

    default:
      return json({ ok: false, error: 'unknown_action' }, 400);
  }
});
