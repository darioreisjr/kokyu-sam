# Segurança

## Modelo de ameaça e responsabilidades

- **Supabase Auth**: senha, hash, salt, JWT, refresh token, confirmação de e-mail, Google OAuth/PKCE, recovery, rate limit de auth.
- **Nest**: validação de token, autorização de negócio, RLS como segunda camada (defense in depth), headers de segurança, CORS, rate limit complementar, logging seguro.
- **Frontend**: nunca armazenar token fora da infraestrutura oficial do Supabase, nunca confiar em `user_metadata` para autorização, nunca renderizar erro cru.

## Mapeamento de status code

| Status | Uso |
| --- | --- |
| 200 | leitura com sucesso |
| 201 | criação de recurso (módulos futuros) |
| 400 | erro de validação |
| 401 | autenticação ausente/inválida/expirada |
| 403 | autenticado, mas não autorizado |
| 404 | recurso não encontrado |
| 409 | conflito |
| 422 | erro de validação de domínio |
| 429 | rate limit |
| 500 | erro inesperado |

## Códigos de erro estáveis

`AUTH_REQUIRED`, `TOKEN_INVALID`, `TOKEN_EXPIRED`, `INVALID_CREDENTIALS`, `EMAIL_NOT_CONFIRMED`, `USERNAME_TAKEN`, `VALIDATION_ERROR`, `PROFILE_NOT_FOUND`, `RATE_LIMITED`, `INTERNAL_ERROR` — ver `src/common/errors/error-codes.ts`. Nunca renomear sem versionar a API.

Nenhuma resposta de erro inclui stack trace, SQL, detalhes internos do Supabase, variáveis de ambiente ou paths locais — `GlobalExceptionFilter` reduz qualquer erro não mapeado a `INTERNAL_ERROR` genérico, logando o erro completo apenas no servidor.

## Claims do Supabase: role vs. autorização

`role` no JWT (`authenticated`/`anon`) é do próprio Supabase — não confundir com role de negócio. Quando existir RBAC, ele virá de `app_metadata` (só o backend/infra altera), nunca de `user_metadata` (controlado pelo usuário). `SupabaseAuthGuard` nunca decide autorização de negócio — só autentica.

## Logging seguro

- Structured logging via Pino (`nestjs-pino`).
- Redação obrigatória (`src/common/logger/pino.config.ts`): `Authorization`, `Cookie`, `Set-Cookie`, `password`, `newPassword`, `accessToken`, `refreshToken`, `providerToken`, `secret`, `captchaToken`, chaves do Supabase.
- Nunca logar e-mail completo, `birthDate` ou nome completo sem necessidade.
- Todo request carrega um `requestId` (aceito de `X-Request-Id` quando confiável, ou gerado com `crypto.randomUUID()`), propagado no log e na resposta de erro.

## CORS

Allowlist explícita via `CORS_ORIGINS` (nunca `*` em produção). Apenas os métodos e headers necessários (`Authorization`, `Content-Type`, `X-Request-Id`). `credentials` desligado — a API usa Bearer token, não cookies cross-origin.

## Rate limiting

`@nestjs/throttler` global como complemento — **não** é a proteção primária, já que rate limit em memória de uma Function não é uma proteção distribuída quando há múltiplas instâncias na Vercel. A proteção real de auth (signup, login, recovery) é o rate limit nativo do Supabase Auth, que deve ser revisado antes de produção (`supabase/config.toml [auth.rate_limit]` localmente; painel do projeto em produção). Se necessário no futuro, considerar Vercel Firewall ou um store distribuído — não adicionar Redis nesta fase sem necessidade real.

## CAPTCHA

Cloudflare Turnstile (preferência) integrado ao Supabase Auth em signup, login (quando necessário) e forgot-password. Token de captcha nunca é persistido nem logado.

## E-mail enumeration

Nenhum endpoint deve permitir descobrir se um e-mail existe: signup e forgot-password sempre respondem de forma genérica, apoiados no comportamento nativo do Supabase (nunca substituído por uma query própria tipo `SELECT email FROM auth.users`).

## RLS e grants

- RLS habilitada em `public.profiles` (obrigatório).
- `authenticated` só enxerga/atualiza a própria linha (`auth.uid() = profiles.id`).
- `INSERT` não é concedido a `authenticated` — profiles só nascem via trigger `SECURITY DEFINER`.
- `anon` não tem grant algum na tabela.
- Least privilege revisado explicitamente com `REVOKE`/`GRANT`, não só policies — ver `supabase/migrations/20260101000000_create_profiles.sql`.
- Testes de RLS em `supabase/tests/profiles_rls.test.sql` (pgTAP, `pnpm db:lint` / `supabase test db`).

## Trigger `handle_new_user()`

`SECURITY DEFINER` com `search_path` explicitamente vazio (previne search-path injection), todas as referências de tabela totalmente qualificadas. Copia apenas metadata segura de perfil (`first_name`, `last_name`, `username`, `birth_date`) — nunca role, token, ou provider token. Idempotente (`ON CONFLICT DO NOTHING`) e nunca falha a criação da conta por causa de metadata ausente ou malformada.

## Admin Client

Usa `SUPABASE_SECRET_KEY` e ignora RLS. Não instanciado nesta fase (nenhuma rota precisa). Se um dia for necessário: nunca no frontend, nunca em log, nunca em resposta HTTP, nunca em Swagger, nunca em snapshot de teste. Preferir sempre o user-scoped client.

## Checklist antes de produção — Supabase

- [x] Confirmação de e-mail habilitada
- [x] Google provider configurado (mesmo OAuth Client, um redirect URI por ambiente — ver `docs/auth-flows.md`)
- [x] Allowlist de redirect correta (produção + wildcard de preview da Vercel em staging)
- [x] Site URL correta
- [ ] Password policy revisada
- [x] CAPTCHA habilitado (Cloudflare Turnstile, produção + staging)
- [ ] Leaked Password Protection — **bloqueado pelo plano Free do Supabase** (exige Pro+). Revisar e habilitar em Authentication → Policies assim que houver upgrade de plano em `kokyu-production` e `kokyu-staging`.
- [x] Auth rate limits revisados (limite de e-mail/hora aumentado após configurar Custom SMTP)
- [x] Custom SMTP configurado (Resend, domínio `kokyu.darioreis.dev` verificado — ver abaixo)
- [ ] Notificações de segurança habilitadas (ex.: password changed)
- [ ] Signing keys assimétricas (JWKS) em uso
- [x] RLS habilitada em toda tabela exposta
- [x] Grants mínimos revisados
- [x] `SUPABASE_SECRET_KEY` só no servidor
- [x] Ambientes separados (`kokyu-production` / `kokyu-staging`)
- [ ] Estratégia de backup definida

## Checklist antes de produção — Nest

- [ ] Guard de autenticação global, `@Public()` explícito e revisado
- [ ] Validação via `getClaims`/JWKS (nunca `jwt.decode()`)
- [ ] Helmet ativo
- [ ] CORS restrito por allowlist
- [ ] Validação de request (Zod) em toda entrada externa
- [ ] Limite de body (100kb)
- [ ] Rate limit configurado
- [ ] Erros genéricos, sem detalhe interno
- [ ] Nenhum dado sensível logado
- [ ] `requestId` presente em toda resposta de erro
- [ ] Stack trace desabilitado em produção
- [ ] Swagger desabilitado/protegido em produção
- [ ] `pnpm audit` revisado
- [ ] Nenhum secret commitado
- [ ] Validação de env fail-fast
- [ ] Least privilege nos clients Supabase
- [ ] Deploy stateless
- [ ] Testes de autorização (User A ≠ User B) passando
- [ ] Testes de RLS passando

## SMTP em produção

O SMTP padrão do Supabase é adequado apenas para desenvolvimento/teste. Produção deve usar um provedor custom (Resend, Brevo, Postmark ou equivalente) configurado no painel do projeto. Personalizar os templates de "Confirm signup", "Reset password" e (quando existir) "Email changed"/"Password changed", com links apontando para o domínio do Kokyu. Se o provedor de SMTP reescrever links (link tracking), desabilitar esse recurso para não quebrar os links de confirmação/recovery.

## Rotação de secrets

Se uma chave (Supabase secret key, credenciais de SMTP, client secret do Google) vazar: revogar/gerar uma nova no painel correspondente, atualizar as variáveis de ambiente na Vercel (todas as environments afetadas) e no `.env` local dos desenvolvedores, e invalidar sessões ativas se a chave comprometida permitir emissão/validação de tokens.

## Fora de escopo nesta fase (documentado para o futuro)

- Delete account
- Admin user management / impersonação
- MFA (TOTP) — Supabase já suporta
- Change password autenticado (tela)
- RBAC completo
