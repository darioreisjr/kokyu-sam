# Arquitetura

## Visão geral

```
Frontend (Next.js)
   │  usa o SDK oficial do Supabase (SSR/cookie) para todo o ciclo de auth
   ▼
Supabase Auth
   │  emite access token (JWT) + refresh token, gerencia sessão
   ▼
Access Token (Authorization: Bearer <token>)
   ▼
NestJS (este repositório) — Resource Server
   │  valida o token via JWKS, aplica regras de negócio
   ▼
Supabase PostgreSQL (com Row Level Security)
```

Supabase Auth é o **Identity Provider** do Kokyu. O Nest nunca reimplementa autenticação — ele consome sessões que o Supabase já validou.

## Por que não proxyar signup/login/senha pelo Nest

Poderíamos fazer `Frontend → Nest → Supabase` para toda operação de auth, mas optamos por `Frontend → Supabase Auth` diretamente. Motivos:

- o backend nunca precisa tocar em senha, nem em memória, nem em log;
- menos latência (um hop a menos) e menos pontos de falha;
- o fluxo oficial do Supabase já resolve PKCE, OAuth (Google), e recovery corretamente — reimplementar isso no Nest seria superfície de ataque extra sem benefício;
- o Nest continua sendo a autoridade de tudo que É regra de negócio do Kokyu (profile, e futuramente missões, hábitos, metas, etc.).

Quando existirem ações administrativas (ban, delete account, roles, impersonação, MFA obrigatório, auditoria), essas regras entram no Nest — não porque o Nest passa a "fazer auth", mas porque são decisões de negócio sobre uma identidade que o Supabase já autenticou.

## Nest como Resource Server

1. O guard global (`SupabaseAuthGuard`) extrai o `Authorization: Bearer <token>`.
2. O token é validado com `supabase.auth.getClaims()` — verificação de assinatura via JWKS do projeto (com cache e suporte a rotação de chaves), não um `jwt.decode()` ingênuo.
3. Claims viram um `AuthenticatedUser` (`id`, `email`, `role`, `aal`, `sessionId`, `provider`, `accessToken`, `issuedAt`, `expiresAt`) — só propriedades realmente confiáveis do token.
4. `@CurrentUser()` injeta esse objeto nos controllers.
5. Toda rota é privada por padrão; `@Public()` é a única forma explícita de abrir uma rota.

`role` no JWT do Supabase é `"authenticated"`/`"anon"` — **não é** role de negócio (admin/user/moderator). Quando o Kokyu tiver RBAC, isso virá de `app_metadata` (controlado só pelo backend/infra), nunca de `user_metadata` (controlado pelo usuário).

## Clientes Supabase (`SupabaseClientFactoryService`)

Único ponto de construção de clientes Supabase (`src/infrastructure/supabase`). Nada mais na aplicação chama `createClient` diretamente.

- **Public client** — `SUPABASE_URL` + `SUPABASE_PUBLISHABLE_KEY`, sem sessão persistida. Usado pelo guard para `getClaims()`.
- **User-scoped client** — o mesmo client público, mas com o `Authorization` do usuário nos headers. Toda query roda sob a RLS daquele usuário. **Esta é a via padrão** para qualquer operação que pertence ao próprio usuário.
- **Admin client** — usa `SUPABASE_SECRET_KEY`, ignora RLS. Não instanciado nesta fase (nenhuma rota precisa dele). Exceção, não atalho de conveniência.

Clientes são baratos de criar (nenhuma chamada de rede até a primeira query), então um client novo é criado por request em vez de usar DI request-scoped do Nest — evita overhead de grafo de DI em cada invocação serverless.

## Repository pattern

`ProfilesService` não conhece PostgREST/Supabase. Ele depende de `ProfilesRepository` (interface em `src/modules/profiles/types/profiles-repository.interface.ts`); `SupabaseProfilesRepository` é a única implementação hoje. Isso permite trocar o mecanismo de persistência sem tocar a lógica de aplicação, e torna o service testável com um fake simples.

## Por que Supabase SDK + RLS em vez de um ORM

Nesta fase, não introduzimos Prisma/Drizzle: reduz dependências, cold start, connection pooling e migrations duplicadas. Usamos o SDK do Supabase + tipos TypeScript gerados (`src/infrastructure/supabase/database.types.ts`, via `pnpm db:types`) + RLS como camada de autorização.

Se módulos futuros precisarem de SQL complexo, avaliaremos Drizzle — e, se rodarmos SQL direto a partir de funções serverless na Vercel, o runtime deve usar o **Supavisor Transaction Pooler** do Supabase, nunca centenas de conexões diretas ao Postgres.

## Modular Monolith

Um domínio = um módulo (`controller` fino + `service` com regra de aplicação + `repository`/adapter de persistência + `schemas`/`types`). Sem microserviços nesta fase — o Kokyu terá muitos domínios (missões, hábitos, metas, treino, nutrição, tempo livre, ritmo diário) e um monólito modular permite desenvolvimento rápido, transações simples e deploy único, mantendo fronteiras claras para extração futura.

```
src/
  config/            env, app, auth, supabase config (Zod + @nestjs/config)
  common/
    auth/            AuthenticatedUser, @Public, @CurrentUser, SupabaseAuthGuard
    errors/          AppError, ErrorCode, mapeamento de erros do Supabase
    filters/         GlobalExceptionFilter (RFC 7807)
    logger/          config do Pino (redaction, request id)
    utils/           Zod schemas reutilizáveis, age/username helpers
  infrastructure/
    supabase/        SupabaseModule, factories de clients, database.types.ts
  modules/
    auth/            mapeamento de claims (não reimplementa auth)
    profiles/        GET /api/v1/me
    health/          GET /api/health (+ /live, /ready)
```

Módulos futuros (`missions`, `habits`, `goals`, `training`, `nutrition`, `leisure`, `daily-rhythm`) seguirão o mesmo padrão e não foram criados ainda — pastas vazias não são versionadas.

## Autorização futura

Toda entidade de domínio do usuário deve ter `user_id` + RLS. Nunca confiar em `body.userId` — sempre `CurrentUser.id` (vindo do JWT `sub`). Autorização deve existir em duas camadas (defense in depth): Nest e RLS. Invariantes como unicidade não devem depender só de "check-then-insert" — usar constraints do banco (como o índice único de `username`).

## Runtime: Vercel Functions

- Node runtime (não Edge) nesta fase.
- Stateless: sem sessão em memória, sem filesystem persistente, sem workers residentes, sem WebSocket stateful, sem scheduler em memória.
- `src/bootstrap.ts` centraliza a configuração da aplicação (Helmet, CORS, prefix, versioning, Swagger) e é compartilhado por `src/main.ts` (local/Docker) e `api/index.ts` (Vercel), para os dois runtimes nunca divergirem.
