# site-avaliacao

Site estático no **Cloudflare Pages** com **Pages Functions** e banco **D1**, com login OAuth via Google e GitHub. Sem framework, sem build e sem dependências npm em runtime.

## Estrutura

```
public/            HTML, CSS e JS estáticos
functions/         Pages Functions (rotas /auth/* e /api/*)
functions/_lib/    helpers compartilhados (sessão, cookies, OAuth)
migrations/        migrações D1
wrangler.toml      configuração do Pages e binding DB do D1
```

## Rodando localmente

Pré-requisito: Node.js (para usar `npx wrangler`).

1. Copie o arquivo de variáveis de exemplo e preencha com as credenciais OAuth:

   ```sh
   cp .dev.vars.example .dev.vars
   ```

   Variáveis: `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GITHUB_CLIENT_ID`, `GITHUB_CLIENT_SECRET`. O `.dev.vars` está no `.gitignore` e nunca deve ser commitado.

2. Aplique as migrações no D1 local:

   ```sh
   npx wrangler d1 migrations apply avaliacao-db --local
   ```

3. Suba o servidor de desenvolvimento:

   ```sh
   npx wrangler pages dev
   ```

   O site fica em http://localhost:8788.

## URLs de callback OAuth

Cadastre estas URLs nos apps OAuth do Google Cloud Console e do GitHub (Settings → Developer settings → OAuth Apps):

| Ambiente | Google | GitHub |
|---|---|---|
| Desenvolvimento | `http://localhost:8788/auth/google/callback` | `http://localhost:8788/auth/github/callback` |
| Produção | `https://site-avaliacao.pages.dev/auth/google/callback` | `https://site-avaliacao.pages.dev/auth/github/callback` |

A `redirect_uri` é montada a partir da origem da requisição, então a mesma base de código funciona nos dois ambientes. Um app OAuth do GitHub aceita só uma callback URL; use um app para dev e outro para produção.

Em produção, configure as quatro variáveis em **Cloudflare → Workers & Pages → site-avaliacao → Settings → Variables and Secrets** (como secrets).

## Rotas

| Método | Rota | Descrição |
|---|---|---|
| GET | `/auth/google/login`, `/auth/github/login` | Inicia o login OAuth |
| GET | `/auth/google/callback`, `/auth/github/callback` | Valida o `state`, cria usuário e sessão |
| POST | `/auth/logout` | Encerra a sessão |
| GET | `/api/me` | Usuário logado (`200`) ou `401` |
| GET | `/api/notas` | Notas do usuário logado |
| POST | `/api/notas` | Cadastra `{aluno, disciplina, nota}` |

## Banco remoto

```sh
npx wrangler d1 migrations apply avaliacao-db --remote
npx wrangler d1 migrations list avaliacao-db --remote
```
