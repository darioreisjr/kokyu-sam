# Deployment

## Ambientes

| Ambiente | Frontend | Nest | Supabase |
| --- | --- | --- | --- |
| Development | `localhost:3001` | `localhost:3000` | Supabase local (`supabase start`) |
| Preview (Vercel) | preview deployment | preview Function | projeto Supabase de **staging** (nunca produção) |
| Production | domínio de produção | Vercel Function de produção | projeto Supabase de produção |

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

- `api/index.ts` é o entrypoint da Vercel Function (Node.js runtime, não Edge), reaproveitando exatamente a mesma configuração de `src/main.ts` via `src/bootstrap.ts`.
- `vercel.json` reescreve todas as rotas para a Function e usa `pnpm build`/`pnpm install --frozen-lockfile`. A versão do Node é lida do `engines.node` do `package.json` (`>=22 <25`) — não se define `runtime` em `vercel.json` para Node.js padrão; esse campo é só para runtimes de comunidade (formato `nome@versão`).
- Escolher a região da Function o mais próxima possível da região do projeto Supabase, para reduzir latência (configurar em Project Settings → Functions → Region).
- A aplicação é stateless: sem filesystem persistente (exceto `/tmp` efêmero, não usado nesta fase), sem sessão em memória, sem cron/fila/worker residente.

## Migrations em produção

Migrations **nunca** rodam no bootstrap da API (nada de `supabase db push`/`migration up` disparado por um cold start). Elas são uma etapa explícita de CI/CD:

```bash
supabase link --project-ref <prod-project-ref>
supabase db push   # ou: supabase migration up --linked
```

Migrations destrutivas (`DROP COLUMN`, `DROP TABLE`, mudanças de tipo com perda de dados) exigem revisão explícita antes do merge — nunca aplicadas automaticamente sem revisão humana.

`seed.sql` roda apenas em desenvolvimento local; produção nunca executa seed automaticamente.

## Rollback

- **Aplicação**: reverter para o deployment anterior na Vercel (rollback nativo da plataforma).
- **Banco**: escrever uma migration de rollback explícita (não existe "desfazer" automático de migration em produção) — nunca reverter o schema manualmente pelo dashboard sem registrar a mudança como migration.

## Aviso benigno conhecido no boot

Com Express 5, o Nest loga um aviso `LegacyRouteConverter: Unsupported route path: "/api/*"` durante o startup (path-to-regexp mudou de sintaxe entre major versions). É inofensivo — o próprio Nest converte a rota automaticamente — e não afeta nenhum endpoint (validado via `docker run` + `curl` em `/api/health` e `/api/v1/me`). Se uma versão futura do Nest remover a conversão automática, ajustar conforme o guia de migração do `path-to-regexp`.

## Observabilidade em produção

- Logs estruturados (JSON) via Pino, com `requestId` em cada linha.
- `SENTRY_DSN` opcional — a aplicação funciona normalmente sem ele. Quando configurado, nunca envia `password`, `Authorization`, tokens, captcha token ou `birthDate`.
