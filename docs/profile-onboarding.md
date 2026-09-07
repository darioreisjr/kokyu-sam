# Onboarding de perfil (Auth vs. Profile)

Este documento descreve o sistema de conclusão obrigatória de perfil construído sobre a base de auth da Fase 1 (ver [architecture.md](architecture.md) e [auth-flows.md](auth-flows.md)). Referência para frontend, QA e futuros módulos de negócio.

## Auth vs. Profile: são conceitos diferentes

- **Auth (Supabase)** responde "quem é você" — é o `AuthenticatedUser` derivado do JWT verificado (`id`, `email`, `emailVerified`, `providers`, ...). Um usuário pode estar 100% autenticado e ainda assim não poder usar o app.
- **Profile (Kokyu)** responde "você já nos contou o suficiente sobre você para usar o app" — nome, username, data de nascimento, e opcionalmente bio/localização/avatar. É regra de negócio do Kokyu, não do Supabase.

`SupabaseAuthGuard` decide o primeiro. `ProfileCompleteGuard` decide o segundo, **depois** do primeiro. Uma requisição pode ser bloqueada por qualquer um dos dois, por motivos diferentes:

| Guard | Pergunta | Erro |
| --- | --- | --- |
| `SupabaseAuthGuard` | Você está autenticado? | 401 `AUTH_REQUIRED` / `TOKEN_INVALID` / `TOKEN_EXPIRED` |
| `ProfileCompleteGuard` | Seu perfil está completo? | 403 `PROFILE_SETUP_REQUIRED` |

## Fluxo — cadastro por e-mail

```
1. supabase.auth.signUp({ email, password, options: { data: {...} } })
2. handle_new_user() cria public.profiles (todos os campos de negócio nulos,
   onboarding_completed_at = null, onboarding_version = 0)
3. Confirmação de e-mail (obrigatória)
4. Sessão válida -> Nest
5. GET /api/v1/me
   -> ProfileBootstrapService tenta preencher first_name/last_name/username/
      birth_date a partir de user_metadata (dados que o próprio usuário já
      digitou no formulário de signup), se ainda vierem nulos
   -> profileCompletion.completed provavelmente ainda é false
      (username/birthDate raramente vêm completos só do signup)
6. Frontend usa access.redirectTo ("/perfil/completar") para redirecionar
7. POST /api/v1/profile/complete com os campos obrigatórios
8. profileCompletion.completed = true, access.canUseApplication = true
9. Rotas de negócio (missões, hábitos, etc.) agora respondem normalmente
```

## Fluxo — Google (OAuth)

```
1. supabase.auth.signInWithOAuth({ provider: 'google', ... })
2. Supabase cria (ou reaproveita) a linha em auth.users;
   handle_new_user() cria public.profiles vazio na primeira vez
3. Sessão -> Nest
4. GET /api/v1/me
   -> ProfileBootstrapService lê user_metadata da identidade Google
      (given_name/family_name, ou "name" partido em duas palavras;
      picture/avatar_url -> avatar_external_url)
   -> Username e birthDate quase nunca vêm do Google - continuam nulos
5. profileCompletion.missingFields inclui pelo menos "username" e
   "birthDate" -> access.canUseApplication = false
6. Frontend redireciona para /perfil/completar
7. POST /api/v1/profile/complete
```

Um usuário Google típico chega com `firstName`/`lastName`/avatar já preenchidos pelo bootstrap, mas ainda precisa escolher `username` e informar `birthDate` manualmente — o formulário de completar cadastro deve pré-popular os campos já conhecidos e só pedir o resto.

## Regras do bootstrap (`ProfileBootstrapService`)

Executado dentro de `GET /api/v1/me` (não existe endpoint de bootstrap separado — é sempre implícito e idempotente).

1. **Nunca sobrescreve um valor já existente.** Só preenche colunas que estão `NULL`.
2. **Valida antes de copiar**, com os mesmos schemas Zod usados nos endpoints de mutação (`firstNameSchema`, `usernameSchema`, `profileBirthDateSchema`, ...). Um `username` inválido/já usado no metadata, ou uma `birth_date` inválida/menor de idade, é simplesmente ignorado — nunca bloqueia o `/me`, nunca falha a requisição.
3. **Marca `profile_bootstrapped_at` uma única vez.** Chamadas seguintes a `/me` são no-op (sem round-trip de escrita) quando não há nada de novo para preencher.
4. **Nunca decide conclusão de onboarding.** Bootstrap só preenche dados; só `POST /profile/complete` marca `onboarding_completed_at`.
5. **Nunca loga os valores copiados** — apenas o nome do evento e quais campos foram preenchidos (`fieldsFilled: string[]`), nunca o conteúdo.

Fonte dos campos por metadata:

| Campo do Profile | e-mail (`user_metadata`) | Google (`user_metadata`/identity) |
| --- | --- | --- |
| `firstName` | `first_name` | `given_name`, ou primeira palavra de `name` |
| `lastName` | `last_name` | `family_name`, ou resto de `name` |
| `username` | `username` | não disponível |
| `birthDate` | `birth_date` | não disponível |
| `avatarExternalUrl` | não disponível | `picture` / `avatar_url` |

## `onboarding_version` — por que não um booleano só

Em vez de um único `onboarding_complete boolean`, o perfil guarda `onboarding_completed_at timestamptz` + `onboarding_version integer`. A conclusão é **derivada em tempo de leitura** por `ProfileCompletionService`:

```
completed =
  onboarding_completed_at IS NOT NULL
  AND onboarding_version >= CURRENT_PROFILE_ONBOARDING_VERSION   -- constante no app
  AND todos os campos obrigatórios presentes (firstName, lastName, username, birthDate)
```

`CURRENT_PROFILE_ONBOARDING_VERSION` vive em `src/modules/profiles/constants/onboarding-version.constant.ts`. Quando o conjunto de campos obrigatórios mudar no futuro (ex.: adicionar um campo obrigatório novo), basta subir essa constante — todo usuário existente volta a aparecer como incompleto automaticamente, sem migração de dados, e sem precisar tocar em `onboarding_completed_at` de ninguém.

## `ProfileCompleteGuard`

Guard global (`APP_GUARD`), registrado **depois** de `SupabaseAuthGuard` (ver `app.module.ts` — ordem: `ThrottlerGuard` → `SupabaseAuthGuard` → `ProfileCompleteGuard`). Qualquer controller novo fica protegido automaticamente, sem opt-in.

Lógica:

1. Rota `@Public()` → libera (nem chega a olhar `request.user`).
2. Rota `@AllowIncompleteProfile()` → libera mesmo com perfil incompleto.
3. Caso contrário → consulta `ProfileCompletionService` (via uma query leve, só `onboarding_completed_at`/`onboarding_version` — não busca a linha inteira) e bloqueia com `403 PROFILE_SETUP_REQUIRED` (+ `redirectTo: "/perfil/completar"` como extensão RFC 7807) se incompleto.

Rotas marcadas `@AllowIncompleteProfile()` hoje — o conjunto mínimo necessário para o próprio fluxo de onboarding funcionar:

- `GET /api/v1/me`
- `GET /api/v1/usernames/availability` (também `@Public()`)
- `POST /api/v1/profile/complete`
- `POST /api/v1/profile/avatar/upload-url`
- `PATCH /api/v1/profile/avatar`
- `DELETE /api/v1/profile/avatar`

`PATCH /api/v1/profile` **não** tem `@AllowIncompleteProfile()` de propósito — não faz sentido editar um perfil que ainda não foi completado pela primeira vez; o caminho para isso é `POST /profile/complete`.

## Contrato `CurrentUser` (`GET /me` e toda mutação de perfil)

Todo endpoint que mexe no perfil (`/me`, `/profile/complete`, `/profile`, os três de avatar) devolve exatamente a mesma forma — o frontend nunca precisa de uma chamada de `/me` extra depois de uma mutação:

```jsonc
{
  "id": "uuid",
  "email": "user@example.com",
  "emailVerified": true,
  "providers": ["google"],
  "profile": {
    "firstName": "Dario", "lastName": null, "username": null, "birthDate": null,
    "bio": null, "avatarUrl": "https://...", "countryCode": null, "region": null, "city": null
  },
  "profileCompletion": { "completed": false, "completedAt": null, "version": 1, "missingFields": ["username", "birthDate"] },
  "access": { "canUseApplication": false, "redirectTo": "/perfil/completar" }
}
```

Montado exclusivamente por `CurrentUserMapper` (`src/modules/profiles/services/current-user.mapper.ts`) — controllers nunca montam essa resposta manualmente.

## Propriedade dos campos (field ownership)

| Campo | Dono | Como muda |
| --- | --- | --- |
| `id`, `email`, `emailVerified`, `providers` | Supabase Auth | Nunca via Nest — via `supabase.auth.*` no frontend |
| `firstName`, `lastName`, `username`, `birthDate`, `bio`, `countryCode`, `region`, `city` | Kokyu Profile (usuário edita) | `POST /profile/complete`, `PATCH /profile` |
| `avatarPath`, `avatarExternalUrl` | Kokyu Profile | avatar_path via endpoints de avatar; avatar_external_url só via bootstrap (nunca editável direto) |
| `avatarUrl` (resposta) | **Derivado**, nunca armazenado | Resolvido a cada leitura: `avatar_path` (assinado) > `avatar_external_url` > `null` |
| `onboardingCompletedAt`, `onboardingVersion` | Backend, exclusivamente | Só `complete_profile()` escreve; nunca aceita valor do cliente |
| `profileBootstrappedAt` | Backend, exclusivamente | Só `ProfileBootstrapService` escreve |

Nenhum DTO de entrada aceita `id`/`email`/`role`/`onboardingCompletedAt`/`onboardingVersion`/`createdAt`/`userId` — os schemas Zod (`profileMutationSchema` etc., `.strict()`) simplesmente não têm essas chaves, então um payload malicioso com esses campos extras é rejeitado com `VALIDATION_ERROR`, não silenciosamente ignorado nem aceito.

## Modelo de segurança: RLS + RPCs

Toda escrita de onboarding passa por RPC `SECURITY DEFINER` (nunca um `UPDATE` direto de tabela pelo Nest para esses campos), identificando o usuário exclusivamente via `auth.uid()` — **nenhuma delas aceita um parâmetro de user id**:

- `complete_profile(p_first_name, p_last_name, p_username, p_birth_date, p_bio, p_country_code, p_region, p_city)` — atômico, idempotente (chamar de novo com dados válidos apenas reaplica o mesmo `UPDATE`, sem duplicar efeito colateral). Deixa a unicidade do username estourar como `23505` (índice único `lower(username)`), nunca faz check-then-insert.
- `update_profile(...)` — mesma assinatura; recusa (`raise exception ... errcode 'KO001'`) se tentar nulificar `first_name`/`last_name`/`username`/`birth_date` depois que `onboarding_completed_at` já está setado.
- `is_username_available(p_username)` — só retorna `boolean`; nunca revela quem é o dono, chamável por `anon` e `authenticated`.

Cada função tem `search_path = ''` explícito (previne search-path hijacking) e toda referência é qualificada com schema (`public.profiles`). Isso é defesa em profundidade **em cima** da validação Zod/Nest — não a substitui: o Nest valida primeiro (erros mais amigáveis, sem round-trip ao banco), e a RPC valida de novo (garante que a invariante vale mesmo se alguém chamar a RPC diretamente, contornando o Nest).

Mapeamento de erro: `23505` (unique_violation) → `USERNAME_TAKEN` (409); `KO001` (custom) → `PROFILE_VALIDATION_ERROR` (400) — ver `src/common/errors/supabase-error.mapper.ts`.

RLS em `public.profiles` continua igual à Fase 1 (`profiles_select_own`/`profiles_update_own`, `auth.uid() = id`) — as RPCs SECURITY DEFINER não precisam de grant de UPDATE na tabela para o role `authenticated` porque rodam com o privilégio do dono da função, não do chamador.

## Avatar

```
1. POST /profile/avatar/upload-url { contentType }
   -> Storage.createSignedUploadUrl("<uid>/<uuid>.<ext>")
   -> { path, token, signedUrl }
2. Cliente faz PUT direto pro signedUrl (nunca passa pelo Nest)
3. PATCH /profile/avatar { path }
   -> Nest confirma que path começa com "<uid>/" (defesa extra além da RLS
      de Storage) e persiste avatar_path
4. Toda leitura (/me, resposta de qualquer mutação) resolve avatarUrl:
   avatar_path (signed URL, TTL curto) > avatar_external_url > null
5. DELETE /profile/avatar limpa avatar_path (fallback pro avatar externo,
   ou iniciais no frontend) e remove o objeto do Storage (best-effort)
```

Bucket `avatars` é **privado** (`public = false`); nunca existe uma "avatar_url pública" persistida — só o `avatar_path` (um path interno, não uma URL) é guardado. RLS de Storage restringe cada usuário a `avatars/<auth.uid()>/*` para select/insert/update/delete (`supabase/migrations/20260101000004_avatars_storage.sql`).

## Eventos de domínio

Sem infraestrutura de message bus — apenas linhas de log estruturado (Pino) com um `event` fixo, para dar visibilidade sem introduzir uma dependência nova:

- `profile.bootstrap.completed` — `{ userId, fieldsFilled }`
- `profile.onboarding.completed` — `{ userId }`
- `profile.updated` — `{ userId, fields }` (nomes de campos alterados, nunca os valores)
- `profile.avatar.updated` — `{ userId }`

Nunca logados: `birthDate`, `bio`, `city`, metadata bruto do Google, `Authorization`, cookies, tokens, URLs assinadas de avatar, `user_metadata` completo.

## Testes

- **pgTAP** (`supabase/tests/profiles_rls.test.sql`, `supabase test db`): RLS de `profiles`, as três RPCs só afetando a própria linha do chamador, unicidade case-insensitive de username (inclusive via RPC), `update_profile()` recusando nulificar campo obrigatório já completo.
- **Unit**: `ProfileCompletionService` (todos os campos presentes / cada campo faltando individualmente / versão desatualizada), `ProfileBootstrapService` (metadata de e-mail, metadata "Google-like", nunca sobrescreve, username/birthDate inválidos são ignorados, retry sem username em corrida de unicidade), `ProfileCompleteGuard` (`@Public()` libera, `@AllowIncompleteProfile()` libera, bloqueia rota de negócio comum, libera quando completo), validação de username/idade (exemplos válidos/inválidos do contrato, anos bissextos, data futura).
- **Integration** (`test/integration/me.integration.spec.ts`, requer `pnpm db:start`): fluxo completo por e-mail (incompleto → guard bloqueia → completa → guard libera), bootstrap "Google-like" via fixture de `user_metadata` (sem OAuth real), corrida de unicidade de username, fluxo de avatar ponta a ponta (upload real assinado, set, remove), isolamento de RLS entre usuários.

## Fora de escopo nesta fase

- Fluxo real de consentimento Google automatizado em CI (continua smoke test manual — ver [auth-flows.md](auth-flows.md)).
- Edição de e-mail/senha (permanece 100% Supabase Auth, fora do Nest).
- Deleção de conta / limpeza de avatar órfão no Storage além do best-effort em `DELETE /profile/avatar`.
