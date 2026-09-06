# Kokyu API

Backend oficial do Kokyu: um resource server em NestJS que valida sessões emitidas pelo **Supabase Auth** e expõe as regras de negócio do produto sobre o **Supabase PostgreSQL**.

Esta é a **Fase 1**: infraestrutura, autenticação (via Supabase, não reimplementada), perfil mínimo automático e o endpoint `GET /api/v1/me`. Nenhum módulo de negócio (respiração, hábitos, metas, etc.) foi implementado ainda — veja [docs/architecture.md](docs/architecture.md).

## Arquitetura em uma linha

```
Frontend (Next.js) → Supabase Auth (login, senha, Google, sessão)
                    → Nest API (valida o access token, regras de negócio, profile)
                    → Supabase PostgreSQL (RLS)
```

O Nest **nunca** lida com senha, hash, refresh token ou emissão de JWT — isso é 100% Supabase Auth. Detalhes e justificativa em [docs/architecture.md](docs/architecture.md).

## Requisitos

- Node.js 22 LTS (necessário — o cliente Realtime do `@supabase/supabase-js` requer WebSocket nativo, disponível a partir do Node 22)
- pnpm 10+ (`corepack enable` já resolve a versão fixada em `package.json`)
- Docker Desktop (para `supabase start` e para build da imagem)
- [Supabase CLI](https://supabase.com/docs/guides/cli)

## Setup local

```bash
pnpm install
cp .env.example .env      # ajuste se necessário; os defaults já casam com `supabase start`
pnpm db:start              # sobe Postgres/Auth/API/Studio/Inbucket locais via Supabase CLI
pnpm dev                   # API em http://localhost:3000
```

Após `pnpm db:start`, o comando imprime a `anon key` local — copie para `SUPABASE_PUBLISHABLE_KEY` em `.env` se for diferente do valor padrão do seu ambiente.

- Swagger (apenas fora de produção): http://localhost:3000/docs
- Health check: http://localhost:3000/api/health
- E-mails de auth (confirmação, recovery) capturados pelo Inbucket local: http://localhost:54324

Para testar o fluxo completo de autenticação (signup, confirmação, login, recovery) sem o Nest, veja [docs/auth-flows.md](docs/auth-flows.md) e [docs/frontend-auth-integration.md](docs/frontend-auth-integration.md).

## Variáveis de ambiente

Ver [.env.example](.env.example). Validação fail-fast via Zod em [src/config/env.schema.ts](src/config/env.schema.ts) — a aplicação não inicia com configuração inválida ou incompleta.

`SUPABASE_SECRET_KEY` é opcional nesta fase: nenhuma operação atual precisa do Admin Client.

## Scripts

| Script | Descrição |
| --- | --- |
| `pnpm dev` | API em modo watch |
| `pnpm build` | Build de produção (SWC) |
| `pnpm start` / `pnpm start:prod` | Roda o build compilado |
| `pnpm lint` / `pnpm lint:fix` | ESLint |
| `pnpm format` / `pnpm format:check` | Prettier |
| `pnpm typecheck` | `tsc --noEmit` |
| `pnpm test` | Testes unitários (Vitest) |
| `pnpm test:coverage` | Testes unitários com cobertura (V8) |
| `pnpm test:integration` | Testes contra Supabase local real |
| `pnpm test:e2e` | Testes Supertest contra a app Nest completa |
| `pnpm check` | lint + typecheck + test + build |
| `pnpm db:start` / `db:stop` / `db:reset` | Ciclo de vida do Supabase local |
| `pnpm db:migrate` | Aplica migrations pendentes |
| `pnpm db:types` | Regenera `src/infrastructure/supabase/database.types.ts` |
| `pnpm db:lint` | Lint do schema SQL |

## Docker

```bash
docker build -t kokyu-api .
docker compose up
```

Veja [docs/deployment.md](docs/deployment.md) para detalhes de runtime, non-root user e limitações.

## Documentação

- [docs/architecture.md](docs/architecture.md) — decisões arquiteturais e por quê
- [docs/auth-flows.md](docs/auth-flows.md) — contratos completos dos fluxos de autenticação (Supabase)
- [docs/frontend-auth-integration.md](docs/frontend-auth-integration.md) — como o Next.js deve integrar com Supabase + Nest
- [docs/security.md](docs/security.md) — checklist de segurança (Supabase, Nest, frontend)
- [docs/deployment.md](docs/deployment.md) — Docker, Vercel, ambientes
- [docs/testing.md](docs/testing.md) — estratégia e como rodar cada camada de teste
