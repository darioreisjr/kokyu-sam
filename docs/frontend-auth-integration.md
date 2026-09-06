# Integração de autenticação no frontend (Next.js)

Este documento é o contrato exato que o frontend Next.js do Kokyu deve seguir. Não recria a aplicação inteira — assume que o frontend já existe e só precisa se conectar ao Supabase Auth e ao Nest da forma descrita aqui.

## 1. Cliente Supabase

Usar o SDK oficial (`@supabase/ssr` + `@supabase/supabase-js`), com a integração SSR/cookie do Next.js — nunca um client "cru" reimplementando storage de sessão.

- Client de **browser**: `SUPABASE_URL` + `SUPABASE_PUBLISHABLE_KEY` (variáveis `NEXT_PUBLIC_*`).
- Client de **server** (route handlers / server components): mesma URL/chave, lendo/escrevendo cookies via os helpers oficiais de SSR do Supabase.
- **Nunca** `localStorage.setItem('token', ...)` espalhado pela aplicação. A sessão vive exclusivamente na infraestrutura oficial do Supabase (cookies via SSR helper).

## 2. Cadastro por e-mail

```ts
const { data, error } = await supabase.auth.signUp({
  email,
  password,
  options: {
    data: { firstName, lastName, username, birthDate }, // apenas os que a tela já coleta
    captchaToken, // Turnstile - ver security.md
  },
});
```

Validar client-side com os mesmos schemas documentados em `src/common/utils/shared.schemas.ts` (email, username, birthDate ≥ 18 anos calculado por data real, password). Nunca usar o resultado de `signUp` para revelar se o e-mail já existia.

## 3. Confirmação de e-mail

Página de callback de confirmação processa o link do Supabase e redireciona para o app autenticado. Reenvio:

```ts
await supabase.auth.resend({ type: 'signup', email });
```

Aplicar cooldown de UI (ex.: botão desabilitado por N segundos) — é complementar ao rate limit do Supabase, não um substituto.

## 4. Login com e-mail/senha

```ts
const { data, error } = await supabase.auth.signInWithPassword({ email, password, options: { captchaToken } });
```

Renderizar `error` sempre como mensagem genérica (`E-mail ou senha inválidos.`) — nunca renderizar a mensagem crua do Supabase para o usuário.

## 5. Login com Google

```ts
await supabase.auth.signInWithOAuth({
  provider: 'google',
  options: {
    redirectTo: `${ORIGIN}/auth/callback`, // sempre um valor fixo da allowlist, nunca vindo de query param do usuário
    scopes: 'openid email profile',
  },
});
```

A rota `/auth/callback` troca o `code` por sessão (PKCE, feito pelo SDK) e redireciona para dentro do app.

## 6. Esqueci minha senha / Reset

```ts
await supabase.auth.resetPasswordForEmail(email, {
  redirectTo: `${ORIGIN}/reset-password`,
});
```

Mostrar sempre: *"Se existir uma conta associada a este e-mail, você receberá as instruções para redefinir sua senha."*

Na página `/reset-password` (aberta a partir do link do e-mail, já com sessão de recovery ativa):

```ts
await supabase.auth.updateUser({ password: newPassword });
```

## 7. Logout

```ts
await supabase.auth.signOut();
```

Depois, garantir que o middleware/SSR helper limpe os cookies de sessão (comportamento padrão do helper oficial) antes de redirecionar para login.

## 8. Enviando o access token para o Nest

```ts
const { data: { session } } = await supabase.auth.getSession();

fetch(`${NEST_API_URL}/api/v1/me`, {
  headers: { Authorization: `Bearer ${session?.access_token}` },
});
```

## 9. Tratando 401 e refresh

- `401 { code: "AUTH_REQUIRED" }` → não havia token. Redirecionar para login.
- `401 { code: "TOKEN_EXPIRED" }` → chamar `supabase.auth.getSession()` (o SDK renova automaticamente se houver refresh token válido) e repetir a chamada uma vez. Se ainda falhar, redirecionar para login.
- `401 { code: "TOKEN_INVALID" }` → tratar como sessão inválida; forçar novo login.

Nunca implementar um `/refresh` próprio contra o Nest — o refresh é 100% responsabilidade do SDK do Supabase.

## 10. `GET /api/v1/me`

```json
{
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "emailVerified": true,
    "provider": "email"
  },
  "profile": {
    "firstName": "Ada",
    "lastName": "Lovelace",
    "username": "ada",
    "birthDate": "1990-01-01",
    "avatarUrl": null,
    "onboardingComplete": false
  }
}
```

`onboardingComplete: false` (tipicamente contas Google sem `username`/`birthDate`) é o sinal para o frontend decidir se redireciona para uma tela de onboarding — essa tela não faz parte da Fase 1.

## Checklist de segurança do lado do frontend

- [ ] Nunca armazenar token em `localStorage`/chave arbitrária
- [ ] Usar exclusivamente a infraestrutura oficial do Supabase (SSR/cookies)
- [ ] PKCE no fluxo Google (padrão do SDK — não desligar)
- [ ] `redirectTo` sempre de uma allowlist fixa, nunca de input do usuário
- [ ] HTTPS em produção
- [ ] Mensagem genérica em forgot-password
- [ ] Captcha (Turnstile) em signup/login sensível/forgot-password
- [ ] Nunca expor `SUPABASE_SECRET_KEY` no bundle do frontend
- [ ] Nunca usar `user_metadata` para decisões de autorização
- [ ] Nunca renderizar mensagem de erro crua do Supabase
- [ ] Limpar a sessão de fato no logout (cookies, não só estado em memória)
