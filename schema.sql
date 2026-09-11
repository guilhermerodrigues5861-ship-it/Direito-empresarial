-- =============================================================================
-- Tribunal do Conhecimento — migração de esquema e correções de segurança
-- =============================================================================
-- Ajustado ao esquema REAL já existente no projeto (confirmado por
-- introspecção de information_schema.columns):
--   quiz_questions.id        -> text (chaves legíveis, ex.: "fx6_01"), sem
--                                default — por isso adicionamos um default
--                                de gen_random_uuid()::text só para quando
--                                uma pergunta nova é criada sem id explícito.
--   quiz_answers.question_id -> text (references quiz_questions.id)
--   teacher_config            -> já existe com (id boolean, password_hash
--                                text) — não criamos uma tabela nova
--                                "teacher_settings"; usamos a que já existe
--                                e NÃO sobrescrevemos a senha salva.
--
-- Como aplicar: Supabase Dashboard → SQL Editor → cole este arquivo inteiro
-- → Run. É seguro rodar mais de uma vez: usa CREATE TABLE IF NOT EXISTS,
-- CREATE OR REPLACE FUNCTION, e blocos DO que verificam antes de adicionar
-- constraint/coluna/policy.
--
-- O que muda em relação ao esquema anterior:
--
--   1) GABARITO PROTEGIDO. Antes, o app fazia `select=*` em quiz_questions,
--      e a coluna correct_index (a resposta certa) ia inteira para o
--      navegador do aluno antes de ele responder — bastava abrir o
--      DevTools. Agora:
--        - RLS passa a bloquear qualquer SELECT direto de anon/authenticated
--          em quiz_questions (removemos qualquer policy antiga que
--          permitisse leitura pública da tabela inteira);
--        - o app lê perguntas pela função get_quiz_questions(), que devolve
--          tudo MENOS o gabarito;
--        - a correção acontece no servidor, na função submit_answer(), que
--          é a única forma de saber se a resposta estava certa.
--
--   2) RESPOSTAS E TENTATIVAS COM VALIDAÇÃO MÍNIMA NO BANCO.
--        - CHECK constraints impedem valores fisicamente impossíveis em
--          quiz_attempts (correct > total, pct fora de 0-100, honorários
--          acima do teto matemático do jogo);
--        - a inserção em quiz_answers deixa de ser um INSERT livre do
--          cliente: só a função submit_answer() grava essas linhas.
--      Isso não elimina 100% a possibilidade de fraude no cliente — ver a
--      nota no final do arquivo.
--
--   3) PAINEL DO PROFESSOR: login passa a ser verificado no banco (bcrypt
--      via pgcrypto) por uma função SECURITY DEFINER que só o service role
--      (Edge Function "teacher") pode chamar. Usa a tabela teacher_config
--      já existente — a senha atual não é alterada por esta migração.
-- =============================================================================

create extension if not exists pgcrypto;

-- -----------------------------------------------------------------------------
-- Tabelas (idempotente: cria só se não existir; do contrário, ajusta por cima
-- via ALTER, sem tocar nos dados que já estão lá)
-- -----------------------------------------------------------------------------

create table if not exists quiz_questions (
  id            text primary key,
  turma         text not null check (turma in ('4', '6')),
  topic         text not null,
  question      text not null,
  options       jsonb not null,
  correct_index integer not null,
  explanation   text not null,
  sort_order    integer not null default 0,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

-- default só para perguntas novas criadas sem id explícito (a Edge Function
-- não gera um id "bonito" tipo fx6_21 — deixa o banco gerar um identificador
-- único; perguntas existentes não são afetadas)
alter table quiz_questions alter column id set default gen_random_uuid()::text;

create index if not exists quiz_questions_turma_sort_idx
  on quiz_questions (turma, sort_order asc);

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'quiz_questions_options_shape'
  ) then
    alter table quiz_questions add constraint quiz_questions_options_shape
      check (jsonb_typeof(options) = 'array' and jsonb_array_length(options) between 2 and 6);
  end if;
  if not exists (
    select 1 from pg_constraint where conname = 'quiz_questions_correct_in_range'
  ) then
    alter table quiz_questions add constraint quiz_questions_correct_in_range
      check (correct_index >= 0 and correct_index < jsonb_array_length(options));
  end if;
end $$;

create table if not exists quiz_attempts (
  id            uuid primary key default gen_random_uuid(),
  student_name  text not null check (char_length(trim(student_name)) >= 3),
  student_email text not null check (student_email ~* '^[^\s@]+@[^\s@]+\.[^\s@]+$'),
  turma         text not null check (turma in ('4', '6')),
  correct       integer not null check (correct >= 0),
  total         integer not null check (total > 0),
  score         integer not null check (score >= 0),
  pct           integer not null check (pct between 0 and 100),
  rank          text not null,
  revelia       boolean not null default false,
  created_at    timestamptz not null default now()
);

create index if not exists quiz_attempts_turma_created_idx
  on quiz_attempts (turma, created_at desc);
create index if not exists quiz_attempts_email_idx
  on quiz_attempts (lower(student_email));

-- circuito de sanidade: acertos nunca podem passar do total da prova, e a
-- pontuação nunca pode passar do teto matemático do jogo (280 pontos por
-- acerto: 100 base + 100 de sequência máxima + 60 de agilidade máxima, com
-- uma pequena folga para arredondamentos)
do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'quiz_attempts_correct_le_total'
  ) then
    alter table quiz_attempts add constraint quiz_attempts_correct_le_total
      check (correct <= total);
  end if;
  if not exists (
    select 1 from pg_constraint where conname = 'quiz_attempts_score_ceiling'
  ) then
    alter table quiz_attempts add constraint quiz_attempts_score_ceiling
      check (score <= total * 280);
  end if;
end $$;

create table if not exists quiz_answers (
  id          uuid primary key default gen_random_uuid(),
  question_id text not null references quiz_questions (id) on delete cascade,
  turma       text not null check (turma in ('4', '6')),
  is_correct  boolean not null,
  created_at  timestamptz not null default now()
);

create index if not exists quiz_answers_question_idx on quiz_answers (question_id);
create index if not exists quiz_answers_turma_idx on quiz_answers (turma);

-- teacher_config já existe (id boolean, password_hash text) — não recriamos
-- nem semeamos senha aqui para não sobrescrever a que já está em uso. Só
-- adicionamos a coluna de auditoria updated_at, que ainda não existe.
create table if not exists teacher_config (
  id            boolean primary key default true check (id),
  password_hash text not null
);

alter table teacher_config add column if not exists updated_at timestamptz not null default now();

-- -----------------------------------------------------------------------------
-- Row Level Security
-- -----------------------------------------------------------------------------
-- Regra geral: a chave anon (usada pelo app do aluno) não lê nem escreve
-- nenhuma tabela diretamente. Toda leitura/escrita de aluno passa por uma
-- função abaixo, que decide o que pode ser exposto. A Edge Function
-- "teacher" usa a service role key, que ignora RLS por padrão.
--
-- Removemos QUALQUER policy pré-existente nessas 4 tabelas antes de criar as
-- novas — isso é necessário porque o problema original (gabarito visível)
-- provavelmente veio de uma policy antiga permitindo SELECT público em
-- quiz_questions, e não sabemos o nome dela para dar DROP diretamente.

do $$
declare
  pol record;
  tbl text;
begin
  foreach tbl in array array['quiz_questions', 'quiz_answers', 'quiz_attempts', 'teacher_config']
  loop
    for pol in
      select policyname from pg_policies
      where schemaname = 'public' and tablename = tbl
    loop
      execute format('drop policy %I on %I', pol.policyname, tbl);
    end loop;
  end loop;
end $$;

alter table quiz_questions enable row level security;
alter table quiz_attempts enable row level security;
alter table quiz_answers enable row level security;
alter table teacher_config enable row level security;

create policy quiz_questions_no_direct_access on quiz_questions
  for all using (false) with check (false);

create policy quiz_attempts_insert_only on quiz_attempts
  for insert to anon, authenticated
  with check (true);
-- Sem policy de SELECT/UPDATE/DELETE para anon/authenticated: ninguém lê a
-- lista de tentativas pela REST direta (o painel do professor lê via Edge
-- Function, com service role).

create policy quiz_answers_no_direct_access on quiz_answers
  for all using (false) with check (false);
-- Todo INSERT em quiz_answers passa pela função submit_answer() (abaixo),
-- que roda como SECURITY DEFINER — o cliente não insere aqui diretamente.

create policy teacher_config_no_direct_access on teacher_config
  for all using (false) with check (false);

-- -----------------------------------------------------------------------------
-- Funções (RPC) usadas pelo app do aluno
-- -----------------------------------------------------------------------------

-- Banco de perguntas SEM o gabarito.
drop function if exists get_quiz_questions(text);
create or replace function get_quiz_questions(p_turma text)
returns table (
  id text,
  turma text,
  topic text,
  question text,
  options jsonb,
  explanation text
)
language sql
security definer
set search_path = public
stable
as $$
  select id, turma, topic, question, options, explanation
  from quiz_questions
  where turma = p_turma
  order by sort_order asc;
$$;

revoke all on function get_quiz_questions(text) from public;
grant execute on function get_quiz_questions(text) to anon, authenticated;

-- Valida a resposta no servidor, grava o log em quiz_answers e devolve o
-- gabarito + fundamentação (só depois de decidir se acertou).
drop function if exists submit_answer(text, text, integer);
drop function if exists submit_answer(uuid, text, integer);
create or replace function submit_answer(p_question_id text, p_turma text, p_selected_index integer)
returns table (
  is_correct boolean,
  correct_index integer,
  explanation text
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_correct_index integer;
  v_explanation text;
  v_is_correct boolean;
begin
  select q.correct_index, q.explanation
    into v_correct_index, v_explanation
  from quiz_questions q
  where q.id = p_question_id and q.turma = p_turma;

  if not found then
    raise exception 'question_not_found';
  end if;

  v_is_correct := (p_selected_index = v_correct_index);

  insert into quiz_answers (question_id, turma, is_correct)
  values (p_question_id, p_turma, v_is_correct);

  return query select v_is_correct, v_correct_index, v_explanation;
end;
$$;

revoke all on function submit_answer(text, text, integer) from public;
grant execute on function submit_answer(text, text, integer) to anon, authenticated;

-- Ranking público (sem e-mail nem qualquer dado pessoal): melhor tentativa
-- de cada aluno, por honorários. Usa DISTINCT ON para achar a melhor
-- tentativa por e-mail e depois reordena o resultado por honorários.
-- (drop explícito: essa função já existia no projeto original com uma
-- assinatura de retorno diferente, e CREATE OR REPLACE não troca o tipo
-- de retorno de uma função existente)
drop function if exists get_leaderboard(text);
create or replace function get_leaderboard(p_turma text)
returns table (
  display_name text,
  score integer,
  correct integer,
  total integer
)
language sql
security definer
set search_path = public
stable
as $$
  with best_per_student as (
    select distinct on (lower(student_email))
      trim(split_part(student_name, ' ', 1)) ||
        case when position(' ' in trim(student_name)) > 0
          then ' ' || left(split_part(student_name, ' ', 2), 1) || '.'
          else ''
        end as display_name,
      score,
      correct,
      total
    from quiz_attempts
    where turma = p_turma
    order by lower(student_email), score desc, created_at asc
  )
  select display_name, score, correct, total
  from best_per_student
  order by score desc
  limit 100;
$$;

revoke all on function get_leaderboard(text) from public;
grant execute on function get_leaderboard(text) to anon, authenticated;

-- Estatística de erro por pergunta (sem dado pessoal — só contagens).
-- (mesmo motivo do drop acima: função pré-existente no projeto original)
drop function if exists get_question_stats(text);
create or replace function get_question_stats(p_turma text)
returns table (
  id text,
  topic text,
  question text,
  total_answers bigint,
  wrong_answers bigint,
  error_rate integer
)
language sql
security definer
set search_path = public
stable
as $$
  select
    q.id,
    q.topic,
    q.question,
    count(a.id) as total_answers,
    count(a.id) filter (where a.is_correct = false) as wrong_answers,
    case when count(a.id) = 0 then 0
      else round(100.0 * count(a.id) filter (where a.is_correct = false) / count(a.id))::integer
    end as error_rate
  from quiz_questions q
  left join quiz_answers a on a.question_id = q.id
  where q.turma = p_turma
  group by q.id, q.topic, q.question
  order by error_rate desc, total_answers desc;
$$;

revoke all on function get_question_stats(text) from public;
grant execute on function get_question_stats(text) to anon, authenticated;

-- -----------------------------------------------------------------------------
-- Funções usadas SÓ pela Edge Function "teacher" (service role)
-- -----------------------------------------------------------------------------

drop function if exists verify_teacher_password(text);
create or replace function verify_teacher_password(p_password text)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select password_hash = crypt(p_password, password_hash)
  from teacher_config
  where id = true;
$$;

revoke all on function verify_teacher_password(text) from public;
grant execute on function verify_teacher_password(text) to service_role;

drop function if exists change_teacher_password(text);
create or replace function change_teacher_password(p_new_password text)
returns void
language sql
security definer
set search_path = public
as $$
  update teacher_config
  set password_hash = crypt(p_new_password, gen_salt('bf')), updated_at = now()
  where id = true;
$$;

revoke all on function change_teacher_password(text) from public;
grant execute on function change_teacher_password(text) to service_role;

-- Só semeia uma senha se a tabela estiver vazia (projeto novo). Se você já
-- tem uma linha em teacher_config, nada aqui é alterado.
insert into teacher_config (id, password_hash)
select true, crypt('direito2026', gen_salt('bf'))
where not exists (select 1 from teacher_config where id = true);

-- =============================================================================
-- IMPORTANTE — teste o login do painel do professor logo após aplicar esta
-- migração. A função verify_teacher_password() assume que o valor já salvo
-- em teacher_config.password_hash é um hash bcrypt gerado por crypt()/
-- gen_salt('bf') do próprio Postgres (pgcrypto) — mesmo formato usado pela
-- função change_teacher_password() acima. Se o hash atual foi gerado por
-- outra biblioteca/algoritmo (fora do Postgres), o login vai falhar mesmo
-- com a senha certa. Se isso acontecer: logue com a senha atual através de
-- qualquer mecanismo que ainda funcione, chame
-- `select change_teacher_password('sua-senha-atual');` uma vez para
-- regravar o hash no formato bcrypt, e o login volta a funcionar.
-- =============================================================================

-- =============================================================================
-- Limitação conhecida (leia antes de considerar o painel "à prova de fraude"):
--
-- A pontuação (honorários, bônus de sequência/agilidade) ainda é CALCULADA
-- NO CLIENTE e só validada por faixa (CHECK constraints acima) na hora de
-- gravar em quiz_attempts. Um aluno com conhecimento técnico ainda consegue
-- forjar uma nota dentro dos limites plausíveis via chamada direta à REST.
-- Isso é diferente do problema original (gabarito visível antes de
-- responder, que está corrigido) — é sobre "quanto confiar na nota para
-- fins de avaliação formal".
--
-- Para fechar esse gap por completo, o cronômetro e o cálculo de pontos
-- precisariam virar uma sessão de jogo do lado do servidor (uma tabela
-- quiz_sessions que registra início, cada resposta com timestamp do
-- servidor, e calcula o score final ali) — uma mudança de arquitetura maior
-- que este pass de segurança — fica registrado aqui para quando quiser
-- evoluir o sistema.
-- =============================================================================
