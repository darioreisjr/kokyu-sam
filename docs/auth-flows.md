# Fluxos de autenticação (contrato Supabase)

Nenhuma dessas operações é proxyada pelo Nest — o frontend chama o SDK do Supabase diretamente (veja [frontend-auth-integration.md](frontend-auth-integration.md)). Este documento é o contrato de referência para o time de frontend e para QA.

## 1. Cadastro por e-mail (`signUp`)

```
1. Usuário preenche o formulário (email, password, e opcionalmente
   firstName/lastName/username/birthDate quando a tela já os coleta).
2. Frontend valida localmente (mesmos schemas Zod documentados em
   src/common/utils/shared.schemas.ts).
3. Frontend chama supabase.auth.signUp({ email, password, options: { data: {...} } }).
4. Supabase cria a linha em auth.users.
5. Trigger handle_new_user() cria a linha em public.profiles (ver migrations).
6. Supabase envia o e-mail de confirmação.
7. Usuário clica no link e confirma o e-mail.
8. Supabase cria uma sessão válida (access + refresh token).
9. Frontend envia o access token ao Nest em toda chamada:
   Authorization: Bearer <supabase_access_token>
10. Nest valida o token (JWKS) via SupabaseAuthGuard.
11. GET /api/v1/me retorna { user, profile }.
```

`firstName`/`lastName`/`username`/`birthDate` viram `user_metadata` — nunca são usados para autorização, e o trigger só copia esses campos específicos (nunca role/token) para `profiles`.

Se `birthDate` for enviado, o mínimo de 18 anos é validado (idade calculada por ano/mês/dia, nunca `anoAtual - anoNascimento`) — mesma regra em `src/common/utils/age.util.ts`, a ser espelhada no frontend.

A resposta de `signUp` não deve ser usada para inferir se um e-mail já existia (account enumeration) — ver [security.md](security.md).

## 2. Confirmação de e-mail

Confirmação é **obrigatória** em todos os ambientes (`enable_confirmations = true` em `supabase/config.toml`; mesma configuração deve estar ativa no projeto de produção). Nunca tratar "ambiente de dev" como motivo para desligar confirmação.

## 3. Reenvio de confirmação

```
supabase.auth.resend({ type: 'signup', email })
```

Deve ter rate limit no frontend (debounce/cooldown de UI) além do rate limit nativo do Supabase Auth — nunca permitir múltiplos cliques disparando e-mails em sequência.

## 4. Login com e-mail/senha

```
Frontend → supabase.auth.signInWithPassword({ email, password }) → Session → Nest
```

Erros para o usuário devem ser genéricos:

- Credenciais inválidas → **"E-mail ou senha inválidos."** (nunca diferenciar "email não existe" de "senha errada" — account enumeration).
- E-mail não confirmado → **"Confirme seu e-mail antes de continuar."**, e somente quando o Supabase retornar um estado confiável para isso (não inferir por conta própria).

## 5. Login com Google (OAuth + PKCE)

```
Next.js → supabase.auth.signInWithOAuth({ provider: 'google', options: { redirectTo, scopes: 'openid email profile' } })
        → Google
        → Supabase callback (PKCE)
        → Session
        → Nest access token
```

- Scopes mínimos: `openid email profile`. Nunca solicitar Drive/Calendar/Gmail nesta fase.
- `redirectTo` **nunca** é um valor arbitrário vindo do usuário — sempre uma allowlist fixa (`/app`, `/login`, `/reset-password`, etc.), nunca um domínio externo.
- Se a conta Google usa o mesmo e-mail de uma conta já existente, o identity linking é feito pelo próprio Supabase — não criamos lógica manual baseada em e-mail.
- Um usuário Google pode chegar sem `username`/`birthDate`. Nesse caso o profile existe, mas `profileCompletion.completed = false` em `GET /api/v1/me` (ver [profile-onboarding.md](profile-onboarding.md)); o frontend usa `access.redirectTo` para levar o usuário à tela de completar cadastro.

Checklist manual de smoke test (login real do Google não é automatizado em CI):

- [ ] conta Google nova
- [ ] conta Google existente
- [ ] e-mail do Google igual a uma conta email/password existente
- [ ] cancelar o OAuth no meio do fluxo
- [ ] callback inválido
- [ ] callback fora da allowlist de redirect

## 6. Esqueci minha senha

```
Frontend → supabase.auth.resetPasswordForEmail(email, { redirectTo }) → email → link de recovery → frontend → nova senha
```

Resposta **sempre** genérica, independentemente de o e-mail existir:

> "Se existir uma conta associada a este e-mail, você receberá as instruções para redefinir sua senha."

## 7. Redefinição de senha

Após o usuário abrir o link de recovery (que cria uma sessão de recovery válida no client Supabase):

```
supabase.auth.updateUser({ password: newPassword })
```

Nunca aceitar `email + newPassword` sem uma sessão de recovery válida — o próprio SDK do Supabase já impõe isso ao exigir uma sessão ativa para `updateUser`.

## 8. Logout

```
supabase.auth.signOut()
```

O Nest é stateless e não mantém nenhum session store paralelo — não existe `/logout` no Nest.

## 9. Refresh de sessão

Gerenciado inteiramente pelo SDK do Supabase no frontend. O Nest nunca usa o refresh token do usuário; se o access token expirou, o Nest responde `401 TOKEN_EXPIRED` e cabe ao frontend (via Supabase SDK) renovar e repetir a chamada.

## 10. `GET /api/v1/me` e conclusão de perfil

Depois que o Supabase autentica a sessão, o Nest ainda decide se o usuário pode usar o app: todo perfil precisa ser completado (`POST /api/v1/profile/complete`) antes de acessar rotas de negócio. Esse gate (`ProfileCompleteGuard`), o bootstrap automático de campos a partir de `user_metadata`, o contrato completo de `GET /api/v1/me` e os demais endpoints de perfil/avatar estão documentados em **[profile-onboarding.md](profile-onboarding.md)** — não duplicado aqui. Contrato de resposta também referenciado em [frontend-auth-integration.md](frontend-auth-integration.md).

## Operações futuras (documentadas, não implementadas)

- `changePassword` estando já autenticado (arquitetura preparada, tela fora do escopo da Fase 1).
- MFA (TOTP) — Supabase já suporta; não implementado agora.
- `deleteAccount` — não implementado; ver [security.md](security.md).
