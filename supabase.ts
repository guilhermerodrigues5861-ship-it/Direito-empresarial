// Cliente HTTP fino para o Supabase — sem SDK, só fetch. Mantém o mesmo
// contrato que o index.html original usava (REST + RPC + Edge Function
// "teacher"), mas centralizado e sem repetir headers em cada tela.
//
// As credenciais abaixo são as mesmas que já estavam hardcoded no
// index.html original — ficam como padrão embutido no bundle, então o app
// funciona sem precisar configurar nada (nem .env local, nem secrets no
// GitHub Actions). Isso é seguro porque a anon key é pública por design: a
// segurança do banco vem das políticas de RLS e das funções RPC descritas
// em supabase/schema.sql, não do sigilo dessa chave. VITE_SUPABASE_URL /
// VITE_SUPABASE_ANON_KEY continuam funcionando como override, caso você
// troque de projeto Supabase no futuro.
const DEFAULT_SUPABASE_URL = 'https://wrwtbybnwivrmtrebctp.supabase.co';
const DEFAULT_SUPABASE_ANON_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Indyd3RieWJud2l2cm10cmViY3RwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODg5NjM4NDAsImV4cCI6MjEwNDUzOTg0MH0.C5W8-9WCSH23x90-0UnW6j-dwAeZE5DV8vkWi7jfKR8';

const SUPABASE_URL = (import.meta.env.VITE_SUPABASE_URL as string) || DEFAULT_SUPABASE_URL;
const SUPABASE_ANON_KEY = (import.meta.env.VITE_SUPABASE_ANON_KEY as string) || DEFAULT_SUPABASE_ANON_KEY;
const FUNCTIONS_URL = `${SUPABASE_URL}/functions/v1/teacher`;

export class SupabaseError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

interface RestOptions {
  method?: string;
  body?: unknown;
  headers?: Record<string, string>;
}

async function rest<T>(path: string, options: RestOptions = {}): Promise<T> {
  const res = await fetch(`${SUPABASE_URL}/rest/v1${path}`, {
    method: options.method ?? 'GET',
    headers: {
      apikey: SUPABASE_ANON_KEY,
      Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
      'Content-Type': 'application/json',
      ...options.headers,
    },
    body: options.body ? JSON.stringify(options.body) : undefined,
  });
  if (!res.ok) {
    throw new SupabaseError(`rest_error:${path}`, res.status);
  }
  if (res.status === 204) return undefined as T;
  return (await res.json()) as T;
}

/** Chama uma função Postgres exposta via PostgREST (RPC). */
async function rpc<T>(name: string, params: Record<string, unknown> = {}): Promise<T> {
  return rest<T>(`/rpc/${name}`, { method: 'POST', body: params });
}

/** Chama a Edge Function "teacher" (protegida por senha, service role). */
async function teacherCall<T>(
  action: string,
  password: string,
  payload: Record<string, unknown> = {}
): Promise<{ ok: boolean; status: number; data: T }> {
  const res = await fetch(FUNCTIONS_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action, password, ...payload }),
  });
  const data = (await res.json()) as T;
  return { ok: res.ok, status: res.status, data };
}

export const supabase = { rest, rpc, teacherCall };
