# Deployment

## Ambientes

| Ambiente                             | Frontend                                           | Nest                                                   | Supabase                          |
| ------------------------------------ | -------------------------------------------------- | ------------------------------------------------------ | --------------------------------- |
| Local                                | `localhost:3001`                                   | `localhost:3000`                                       | Supabase local (`supabase start`) |
| `develop` (Vercel Preview, URL fixa) | `kokyu-git-develop-projetosdarioreisjr.vercel.app` | `kokyu-sam-git-develop-projetosdarioreisjr.vercel.app` | `kokyu-staging`                   |
| Outras branches (Vercel Preview)     | preview deployment                                 | preview Function                                       | `kokyu-staging` (nunca produção)  |
| `main` (Production)                  | domínio de produção                                | Vercel Function de produção                            | `kokyu-production`                |

## Branches

- `develop` é a branch padrão e a base de toda branch nova (`feat/...`, `fix/...`, `chore/...`); só recebe PR, com o CI verde.
- `main` é produção e só recebe PR **vindo da `develop`** (release), com o CI verde, via merge commit. O check `Release source` recusa qualquer outra origem.
- O Dependabot abre os PRs contra a `develop`.
- A `develop` usa variáveis de ambiente próprias na Vercel (Preview, branch `develop`): `APP_URL`, `FRONTEND_URL` e `CORS_ORIGINS` apontam para as URLs fixas da `develop`.

Preview deployments nunca devem apontar para o Supabase de produção — configure `SUPABASE_URL`/`SUPABASE_PUBLISHABLE_KEY` de preview separadamente no painel da Vercel.

Idealmente, use Google OAuth Clients separados por ambiente (dev/staging/prod), cada um com suas próprias redirect URLs registradas.

## Variáveis de ambiente por ambiente

Configurar em Vercel → Project Settings → Environment Variables, separadamente para Development/Preview/Production:

```
NODE_ENV, PORT, API_PREFIX, API_VERSION, APP_NAME, APP_URL, FRONTEND_URL,
CORS_ORIGINS, LOG_LEVEL, SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY,
SUPABASE_SECRET_KEY (só se necessário), SENTRY_DSN (opcional)
```

Nunca commitar `.env`/`.env.local` — ver `.gitignore`. `SUPABASE_SECRET_KEY` nunca deve ter o prefixo `NEXT_PUBLIC_` nem existir no projeto frontend.

## Docker

Multi-stage (`deps` → `build` → `production`), imagem final baseada em `node:22-slim` (Debian), usuário não-root (`kokyu`), sem `.env`/segredos/git history/artefatos de teste (ver `.dockerignore`).

Node 22 é obrigatório (não apenas preferido): o cliente Realtime interno do `@supabase/supabase-js` instancia um `WebSocket` nativo ao construir qualquer client (mesmo sem usar Realtime), e essa API só existe nativamente a partir do Node 22 — em runtimes mais antigos a aplicação falha já no boot.

```bash
docker build -t kokyu-api .
docker run --env-file .env -p 3000:3000 kokyu-api
```

Healthcheck do container usa `GET /api/health`.

`docker-compose.yml` é uma conveniência para rodar a imagem localmente apontando para o Supabase local (que já sobe seu próprio stack via Supabase CLI/Docker — o compose deste repo não duplica Postgres).

## Vercel

```
GitHub → Vercel → NestJS Functions (Node runtime) → Supabase
```

- `api/index.ts` é o entrypoint da Vercel Function (Node.js runtime, não Edge), reaproveitando exatamente a mesma configuração de `src/main.ts` via `src/bootstrap.ts`. Ele importa `../src/**/*.ts` diretamente (não `dist/`) — o builder de Functions da própria Vercel (`@vercel/node`) compila/type-checa esse grafo sozinho, então **não existe `buildCommand` no `vercel.json`**: um passo de build próprio (`nest build`) geraria um `dist/` que ninguém consome no runtime serverless, e faria a Vercel esperar um diretório de saída estático que este projeto (100% API) não tem.
- **Framework Preset do projeto deve ser `Other`**, nunca o preset automático "NestJS" da Vercel. O preset "NestJS" assume um app tradicional rodando `src/main.ts` via adapter próprio da Vercel — isso ignora completamente `api/index.ts`/`vercel.json` e causa `FUNCTION_INVOCATION_TIMEOUT`/erros de DI (ex.: `PinoLogger` undefined no `GlobalExceptionFilter`) porque o bootstrap real do projeto nunca roda do jeito esperado. Corrigir via `vercel project update <nome> --framework other`.
- Versão do Node: `engines.node` no `package.json` (`>=22 <25`) documenta a intenção, mas o Project Setting "Node.js Version" da Vercel é o que efetivamente vale em runtime — force-o para `22.x` (`vercel project update <nome> --node-version 22.x`), já que o `@supabase/supabase-js` exige WebSocket nativo (Node 22+) e a Vercel pode escolher uma versão mais nova (ex.: 24.x) por conta própria.
- `runtime` não é definido em `vercel.json` para Node.js padrão — esse campo é só para runtimes de comunidade (formato `nome@versão`, ex. `vercel-php@0.7.5`); usar `nodejs22.x` ali quebra o deploy com "Function Runtimes must have a valid version".
- Escolher a região da Function o mais próxima possível da região do projeto Supabase, para reduzir latência (configurar em Project Settings → Functions → Region).
- A aplicação é stateless: sem filesystem persistente (exceto `/tmp` efêmero, não usado nesta fase), sem sessão em memória, sem cron/fila/worker residente.

## Migrations

Migrations **nunca** rodam no bootstrap da API (nada de `supabase db push`/`migration up` disparado por um cold start) e **nunca** são aplicadas à mão pelo SQL Editor — isso deixa o banco fora do histórico de migrations. Quem aplica é o workflow [`.github/workflows/migrations.yml`](../.github/workflows/migrations.yml):

| Evento                                                        | O que acontece                                                                                                          |
| ------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------- |
| PR para `develop`/`main` que mexe em `supabase/migrations/**` | **Dry-run** contra o banco de destino (staging ou produção): o log do job mostra o que seria aplicado. Nada é alterado. |
| Push na `develop` com migration nova                          | Aplica no **staging** (`kokyu-staging`).                                                                                |
| Push na `main` com migration nova                             | Aguarda **aprovação** no ambiente `production` do GitHub e só então aplica em **produção** (`kokyu-production`).        |
| _Run workflow_ manual                                         | Aplica as pendências no ambiente escolhido (produção só a partir da `main`, também com aprovação).                      |

Configuração no GitHub (uma vez):

- Secret do repositório `SUPABASE_ACCESS_TOKEN`: token pessoal do Supabase (Account → Access Tokens) da conta dona dos dois projetos.
- Variáveis do repositório `SUPABASE_STAGING_PROJECT_REF` e `SUPABASE_PRODUCTION_PROJECT_REF`.
- Ambientes `staging` e `production`; `production` com revisor obrigatório e restrito à branch `main`.

A Vercel publica o código assim que a `main` recebe a release, enquanto a migration de produção espera a aprovação — aprove logo após o merge. Mantenha as migrations **aditivas** (colunas/tabelas novas, nada que o código atual deixe de encontrar), para que a ordem entre deploy e migration não quebre nada.

Migrations destrutivas (`DROP COLUMN`, `DROP TABLE`, mudanças de tipo com perda de dados) exigem revisão explícita antes do merge — a aprovação do ambiente `production` é o último ponto de parada.

`seed.sql` roda apenas em desenvolvimento local; staging e produção nunca executam seed.

## Rollback

- **Aplicação**: reverter para o deployment anterior na Vercel (rollback nativo da plataforma).
- **Banco**: escrever uma migration de rollback explícita (não existe "desfazer" automático de migration em produção) — nunca reverter o schema manualmente pelo dashboard sem registrar a mudança como migration.

## Aviso benigno conhecido no boot

Com Express 5, o Nest loga um aviso `LegacyRouteConverter: Unsupported route path: "/api/*"` durante o startup (path-to-regexp mudou de sintaxe entre major versions). É inofensivo — o próprio Nest converte a rota automaticamente — e não afeta nenhum endpoint (validado via `docker run` + `curl` em `/api/health` e `/api/v1/me`). Se uma versão futura do Nest remover a conversão automática, ajustar conforme o guia de migração do `path-to-regexp`.

## Observabilidade em produção

- Logs estruturados (JSON) via Pino, com `requestId` em cada linha.
- `SENTRY_DSN` opcional — a aplicação funciona normalmente sem ele. Quando configurado, nunca envia `password`, `Authorization`, tokens, captcha token ou `birthDate`.
