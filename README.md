# Tribunal do Conhecimento — Direito Empresarial

Quiz gamificado de Direito Empresarial com tema de autos judiciais: papel
envelhecido, carimbos de "Deferido/Indeferido", um juiz mascote em SVG que
reage a cada resposta, honorários como pontuação e patentes de
"Estagiário(a) em Apuros" a "Juiz(a) Togado(a)".

Reescrito de um `index.html` único (HTML/CSS/JS inline) para um projeto
**Vite + React + TypeScript** componentizado, mantendo a identidade visual
original e corrigindo problemas de segurança e UX. Backend em Supabase.

## Rodando localmente

```bash
npm install
cp .env.example .env.local   # preencha com a anon key do seu projeto Supabase
npm run dev
```

Outros comandos:

```bash
npm run build      # build de produção em dist/
npm run preview    # serve o build de produção localmente
npm run typecheck  # só checa tipos, sem gerar arquivos
```

## Estrutura

```
src/
  components/       componentes compartilhados (Judge, Toast, Taunt, TopBar)
  components/ui/     Button, DocumentCard (o "papel" de cada tela)
  screens/          uma pasta/arquivo por tela (Register, Intro, Quiz, Result,
                     Ranking) + screens/teacher/ para o painel do professor
  hooks/            useReducedMotion, useConfetti, useAmbientParticles,
                     useJudgeVoice, useToast
  lib/              supabase.ts (cliente fetch fino), quiz-api.ts (chamadas
                     de domínio), types.ts, audio.ts, shuffle.ts
  data/             taunts.ts, ranks.ts — textos e regras de negócio simples
  styles/           tokens.css (paleta, tipografia, espaçamento) + global.css
supabase/
  schema.sql              migração completa (tabelas, RLS, RPCs)
  functions/teacher/      Edge Function do painel do professor
```

Cada tela usa CSS Modules (`Nome.module.css`) — sem CSS global solto, sem
classes conflitando entre telas.

## Variáveis de ambiente

`VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY` são **opcionais** — o app já
vem com um valor padrão embutido em `src/lib/supabase.ts` (as mesmas
credenciais que já estavam hardcoded no `index.html` original). Só crie um
`.env.local` (copiando `.env.example`) ou configure secrets no repositório
se quiser apontar para outro projeto Supabase.

A anon key é pública por natureza (vai para o bundle do navegador de
qualquer forma, embutida ou via env) — a segurança vem das políticas de RLS
e das funções RPC descritas em `supabase/schema.sql`, não do sigilo dessa
chave.

## Deploy (GitHub Pages)

Já vem configurado um workflow (`.github/workflows/deploy.yml`) que builda e
publica automaticamente a cada push em `main`. Para ativar (só uma vez):

1. Repositório → **Settings → Pages → Build and deployment → Source** →
   troque de "Deploy from a branch" para **GitHub Actions**. Sem esse passo
   o deploy falha com `Ensure GitHub Pages has been enabled` — o workflow
   builda certinho, mas não tem onde publicar.
2. Dê merge desta branch em `main` (ou rode o workflow manualmente em
   *Actions → Deploy para o GitHub Pages → Run workflow*).

Configurar `VITE_SUPABASE_URL`/`VITE_SUPABASE_ANON_KEY` como secrets é
opcional — só necessário se você quiser publicar apontando para um projeto
Supabase diferente do padrão embutido no código.

## Migração do banco (Supabase)

Este redesign muda o contrato entre o app e o Supabase — **é preciso rodar
a migração antes de publicar o novo front-end**, senão o quiz não carrega
perguntas. Passo a passo:

1. Supabase Dashboard → **SQL Editor** → cole o conteúdo de
   `supabase/schema.sql` inteiro → **Run**. É seguro rodar mesmo se as
   tabelas já existirem (usa `IF NOT EXISTS`/`CREATE OR REPLACE`).
2. Deploy da Edge Function atualizada:
   ```bash
   supabase functions deploy teacher --project-ref wrwtbybnwivrmtrebctp
   ```
   (ou cole o conteúdo de `supabase/functions/teacher/index.ts` no editor de
   Functions do dashboard, se preferir não usar a CLI).
3. Se você já tinha perguntas cadastradas na tabela antiga, elas continuam
   valendo — o `schema.sql` não apaga dados, só adiciona RLS/funções novas
   por cima do que já existe.
4. A senha do painel do professor passa a ficar com **hash no banco**
   (antes disso, confirme com quem administra o painel qual senha está em
   uso — a migração semeia `direito2026` só se a tabela `teacher_settings`
   ainda não existir). Para trocá-la depois de aplicar a migração, logue no
   painel e chame a ação `change_password` (ou rode
   `select change_teacher_password('nova-senha');` direto no SQL Editor).

### O que a migração corrige

O diagnóstico do sistema anterior apontou dois problemas de segurança
reais, ambos endereçados em `supabase/schema.sql` (a análise completa está
comentada no topo do arquivo):

1. **O gabarito vazava para o aluno.** A tela do quiz buscava as perguntas
   com `select=*`, e a coluna do índice da resposta certa ia junto no JSON
   — bastava abrir o DevTools antes de responder. Agora RLS bloqueia
   qualquer leitura direta de `quiz_questions`; o app só enxerga as
   perguntas pela função `get_quiz_questions()` (que omite o gabarito) e a
   correção é validada no servidor por `submit_answer()`.
2. **Notas e log de respostas eram graváveis por qualquer requisição.**
   Isso continua parcialmente verdadeiro pela própria natureza do jogo (a
   pontuação — honorários, bônus de sequência/agilidade — é calculada no
   cliente para dar feedback instantâneo), mas agora há `CHECK` constraints
   que rejeitam valores fisicamente impossíveis (acertos maiores que o
   total, percentual fora de 0–100, honorários acima do teto matemático do
   jogo), e o log de acerto/erro por questão só é gravado pela própria
   função `submit_answer()` — não é mais um `INSERT` livre do cliente.
   Fechar esse gap por completo exigiria mover o cronômetro e o cálculo de
   pontos para uma sessão de jogo no servidor; fica documentado como
   próximo passo no final do `schema.sql`.

## O que mudou na experiência (UI/UX)

- **Cadastro**: turma escolhida por cartões grandes (alvo de toque
  confortável) em vez de um `<select>`; validação inline sem recarregar a
  tela.
- **Quiz**: barra de progresso agora reflete o estado real (antes travava
  antes de 100% na última pergunta); o cronômetro mostra o valor certo desde
  o primeiro frame (antes piscava "30s" com um jogo de 45s); as
  alternativas exibem um estado "protocolando o recurso..." enquanto
  aguardam a validação do servidor, em vez de revelar a resposta
  instantaneamente pelo estado local.
- **Ranking**: pódio para o top 3 antes da lista corrida.
- **Painel do professor**: os três estados de carregamento (carregando,
  vazio, erro) agora são visualmente distintos — antes, uma falha de rede
  no banco de perguntas aparecia como "nenhuma pergunta cadastrada",
  levando o professor a investigar o problema errado.
- Todo o texto de alternativas passou a ser renderizado por JSX (React
  escapa por padrão), fechando o único ponto do app que montava HTML por
  concatenação de string.
- **Efeitos de profundidade**: os cartões de documento inclinam sutilmente
  em direção ao cursor (tilt 3D), os botões têm um brilho que varre a
  superfície ao passar o mouse, e a transição entre telas ganhou uma leve
  rotação em perspectiva. Tudo desliga sozinho com `prefers-reduced-motion`.

## Limitações conhecidas

- A pontuação do quiz ainda confia parcialmente no cliente (ver seção da
  migração acima) — adequado para gamificação e para uma prévia informal,
  não recomendado como única fonte de uma nota formal sem o passo adicional
  de mover a sessão de jogo para o servidor.
- O painel do professor usa uma senha única compartilhada (reenviada a cada
  chamada), não contas individuais — suficiente para o uso atual (uma
  turma, um professor), mas vale migrar para Supabase Auth se isso crescer
  para múltiplos professores com permissões diferentes.
