# Testes

Vitest + `@nestjs/testing` em três camadas, separadas por `vitest.config.ts` (`projects`):

| Camada | Comando | Depende de | O que cobre |
| --- | --- | --- | --- |
| Unit | `pnpm test` / `pnpm test:coverage` | nada externo | guard, mapper de claims, service, repository (fake), utils, validação, error mapper |
| Integration | `pnpm test:integration` | Supabase local rodando | signup real, trigger `handle_new_user`, RLS end-to-end, `/me` com tokens reais |
| E2E | `pnpm test:e2e` | nada externo (Supabase mockado via `overrideProvider`) | stack HTTP completa: guard, filtro global, versionamento, CORS, Helmet |

## Rodando localmente

```bash
pnpm test               # unit
pnpm test:coverage       # unit + cobertura V8
pnpm db:start            # necessário só para integration
pnpm test:integration
pnpm test:e2e
```

`test/integration/me.integration.spec.ts` verifica se `SUPABASE_SECRET_KEY`/`SUPABASE_PUBLISHABLE_KEY` estão definidos (checagem síncrona, necessária para `describe.skipIf`); se não, o describe inteiro é pulado em vez de falhar — assim `pnpm test`/CI padrão nunca dependem de infraestrutura externa por acidente. Defina essas variáveis (via `supabase status -o json` após `pnpm db:start`) apenas quando quiser rodar `pnpm test:integration` de fato.

## Cobertura

V8 coverage, thresholds: **lines 80 / functions 80 / statements 80 / branches 75** (`vitest.config.ts`). Sem testes artificiais só para bater porcentagem — os arquivos de bootstrap/módulo (`main.ts`, `*.module.ts`, DTOs) são excluídos da métrica porque são fiação, não lógica.

## Fakes em vez de mocks gigantes

Em vez de copiar o tipo `SupabaseClient` inteiro como mock, `test/factories/fake-supabase-client.ts` implementa só a fatia realmente usada por cada teste (`auth.getClaims`, `.from().select().eq().maybeSingle()`). Isso mantém os testes legíveis e resistentes a mudanças do SDK que não afetam o comportamento testado.

## O que cada suíte unitária cobre

- **`supabase-auth.guard.spec.ts`**: `@Public()` sem token; header ausente; Bearer vazio; header não-Bearer; erro "expired" → `TokenExpiredError`; qualquer outro erro → `TokenInvalidError`; claims sem `sub`; `exp` no passado mesmo sem erro do Supabase; caminho feliz completo (claims válidas → `AuthenticatedUser` anexado ao request).
- **`auth-claims.mapper.spec.ts`**: mapeamento completo de claims; defaults de `role`/`provider`; erro quando `sub` está ausente.
- **`supabase-error.mapper.spec.ts`**: `PGRST116` → `ProfileNotFoundError`; qualquer outro código → `InternalError` genérico, sem vazar a mensagem original.
- **`profiles.service.spec.ts`**: resposta combinando `AuthenticatedUser` + `Profile`; token de acesso nunca aparece na resposta; profile ausente → `ProfileNotFoundError`.
- **`profiles.repository.spec.ts`**: mapeamento snake_case → camelCase; `null` quando não há linha; erro do Supabase nunca vaza cru; `PGRST116` mapeado corretamente.
- **`age.util.spec.ts`** / **`shared.schemas.spec.ts`**: idade calculada por ano/mês/dia (não `anoAtual - anoNascimento`), incluindo os casos de borda do aniversário; regra de 18 anos.
- **`username.util.spec.ts`**: normalização case-insensitive (`Dario`/`dario`/`DARIO` iguais); formato válido/inválido.
- **`env.schema.spec.ts`**: aplica defaults; `SUPABASE_SECRET_KEY` continua opcional; falha rápido quando falta uma variável obrigatória ou quando `NODE_ENV`/URLs são inválidos.

## E2E (`test/e2e/app.e2e.spec.ts`)

Sobe a `AppModule` real via `Test.createTestingModule`, com `SupabaseClientFactoryService` substituído por um fake determinístico (dois usuários fixos, tokens fixos) via `overrideProvider`. Cobre:

- `GET /api/health` → 200
- `GET /api/v1/me` sem token → 401 `AUTH_REQUIRED`
- token inválido → 401 `TOKEN_INVALID`
- token do usuário A → perfil do usuário A (nunca o de B)
- token do usuário B → perfil do usuário B (nunca o de A)
- resposta nunca contém token/secret/password
- origem CORS permitida vs. não permitida
- headers de segurança do Helmet presentes

## Integration (`test/integration/me.integration.spec.ts`)

Cria dois usuários reais via Admin API (`email_confirm: true`, sem depender de clicar em link de e-mail), faz login real (`signInWithPassword`), sobe a aplicação Nest real (sem overrides) e chama `/api/v1/me` com os tokens reais — provando que `handle_new_user()` e as policies de RLS funcionam de ponta a ponta, não só contra fakes. Limpa os usuários criados no `afterAll`.

## Testes de banco (RLS)

`supabase/tests/profiles_rls.test.sql` usa pgTAP (`supabase test db`, requer `supabase start`). Prova:

- trigger cria profile para cada novo usuário;
- usuário A lê o próprio profile;
- usuário A não lê o profile de B;
- `UPDATE` de A contra a linha de B afeta 0 linhas (RLS filtra, não lança erro);
- `anon` não enxerga nenhuma linha e não tem privilégio de `INSERT`/`SELECT`;
- `complete_profile()`/`update_profile()` só afetam a própria linha do chamador (`auth.uid()`, nunca um parâmetro de id);
- unicidade de username é case-insensitive, inclusive via RPC (`23505`);
- `update_profile()` recusa nulificar campo obrigatório depois que o onboarding já está completo (`KO001`);
- `is_username_available()` nunca revela quem é o dono.

Detalhes do onboarding de perfil (guard, bootstrap, contrato `CurrentUser`) em [profile-onboarding.md](profile-onboarding.md), que também documenta as suítes unitárias/integração específicas (`ProfileCompletionService`, `ProfileBootstrapService`, `ProfileCompleteGuard`, fluxo de avatar) não repetidas aqui.

## Google OAuth

Login real do Google não é automatizado em CI (não há forma segura de automatizar o consentimento do Google). Cobertura:

- testes unitários/contrato do mapeamento de claims (`provider: "google"` a partir de `app_metadata`);
- checklist manual documentado em [auth-flows.md](auth-flows.md).

## Datas fixas em teste

Onde a data importa (idade, expiração de token), os testes passam um `now` explícito em vez de depender do relógio real (`calculateAge(birthDate, now)`, claims `exp` calculados a partir de `Date.now()` apenas para simular "ainda válido"/"expirado").

## Dados de teste

Nenhum dado pessoal real é usado; e-mails de teste usam o domínio reservado `example.test` com um `randomUUID()` para evitar colisão entre execuções.
