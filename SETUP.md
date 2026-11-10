# SETUP – Variáveis (GitHub, Vercel, Auth0)

> Regra de ouro: **o AUDIENCE tem que ser igual no back e no front.** Se não for → 401.

---

## 1. GitHub Actions (repo `pf-back`)

**Onde:** repo `pf-back` → Settings → Secrets and variables → Actions → **New repository secret**

| Secret | Valor | Onde pegar |
|---|---|---|
| `DOCKERHUB_TOKEN` | token do Docker Hub | hub.docker.com → Account settings → Personal access tokens → Generate (Read & Write) |
| `HOST_TEST` | IP público da EC2 (ex: `44.192.118.93`) | Console AWS → EC2 → Instances → Public IPv4 |
| `KEY_TEST` | conteúdo **inteiro** do `.pem` (incluindo `-----BEGIN...` e `-----END...`) | arquivo `projsoft26b.pem` (abrir no bloco de notas e copiar tudo) |

**Fixos no próprio `deploy.yml` (não são secrets, só editar o arquivo se mudar):**

```yaml
env:
  DOCKER_IMAGE: guilhermetaba/pf-back   # usuario-dockerhub/nome-imagem
  CONTAINER_NAME: pf-back
  DOCKER_USER: guilhermetaba            # usuario do Docker Hub
```

O workflow roda no push da branch **`master`** (`on.push.branches`). Se o repo usar `main`, trocar lá.

---

## 2. Variáveis do backend (dentro do container na EC2)

Já têm valor padrão no `application.properties`. Só precisa passar com `-e` no `docker run` do `deploy.yml` se for **diferente** do padrão.

| Variável | Padrão | Pra que serve |
|---|---|---|
| `DB_HOST` | `localhost` (o deploy passa `banco`) | nome do container do postgres na rede `rede-pf` |
| `DB_USER` | `usuario` | igual ao `POSTGRES_USER` do container `banco` |
| `DB_PASSWORD` | `senha` | igual ao `POSTGRES_PASSWORD` do container `banco` |
| `AUTH0_ISSUER_URI` | `https://dev-day3dx4r23h0p5bl.us.auth0.com/` | Auth0 → Settings → Domain, com `https://` e **`/` no final** |
| `AUTH0_AUDIENCE` | `https://dev-day3dx4r23h0p5bl.us.auth0.com/api/v2/` | Auth0 → Applications → APIs → sua API → **Identifier** |

Exemplo, se trocar o audience, no `deploy.yml`:

```bash
docker run -d \
  -p 8080:8080 \
  -e DB_HOST=banco \
  -e AUTH0_AUDIENCE=https://avaliacoes-api \
  -e AUTH0_ISSUER_URI=https://SEU-DOMINIO.us.auth0.com/ \
  --network=rede-pf \
  --name pf-back \
  guilhermetaba/pf-back:${{ github.sha }}
```

---

## 3. Vercel (repo `pf-front`)

**Onde:** vercel.com → projeto `pf-front` → Settings → **Environment Variables** (marcar Production, Preview, Development)

| Variável | Valor | Onde pegar |
|---|---|---|
| `VITE_AUTH0_DOMAIN` | `dev-day3dx4r23h0p5bl.us.auth0.com` (**sem** `https://`) | Auth0 → Applications → sua SPA → Settings → Domain |
| `VITE_AUTH0_CLIENT_ID` | client id da SPA | Auth0 → Applications → sua SPA → Settings → Client ID |
| `VITE_AUTH0_AUDIENCE` | **o mesmo** `AUTH0_AUDIENCE` do back | Auth0 → Applications → APIs → Identifier |
| `VITE_API_URL` | `/api` | fixo – o `vercel.json` redireciona `/api` para a EC2 |

> ⚠️ Variáveis `VITE_*` entram no **build**. Mudou alguma? → Deployments → ⋯ → **Redeploy**.

**Também editar no `vercel.json`** o IP da EC2:

```json
{ "source": "/api/:path*", "destination": "http://IP-DA-EC2:8080/:path*" }
```

Configuração do projeto na Vercel: Framework **Vite**, Build `npm run build`, Output `dist` (já detecta sozinho).

---

## 4. Local (`pf-front/.env`, não vai pro git)

```env
VITE_AUTH0_DOMAIN=dev-day3dx4r23h0p5bl.us.auth0.com
VITE_AUTH0_CLIENT_ID=CLIENT_ID_DA_SPA
VITE_AUTH0_AUDIENCE=https://dev-day3dx4r23h0p5bl.us.auth0.com/api/v2/
VITE_API_URL=/api
BACKEND_URL=http://localhost:8080   # ou http://IP-DA-EC2:8080 (só usado pelo proxy do vite em dev)
```

---

## 5. Auth0 (não são variáveis, mas sem isso nada funciona)

Applications → sua SPA → Settings:

| Campo | Valor |
|---|---|
| Allowed Callback URLs | `http://localhost:5173, https://SEU-FRONT.vercel.app` |
| Allowed Logout URLs | `http://localhost:5173, https://SEU-FRONT.vercel.app` |
| Allowed Web Origins | `http://localhost:5173, https://SEU-FRONT.vercel.app` |

- User Management → Roles: criar `ADMIN` e `USER`, atribuir `ADMIN` ao seu usuário.
- Actions → post-login: Action que coloca os roles no token (código no `Comando.md`).

---

## 6. AWS (EC2)

- Security Group → Inbound rules → liberar **porta 8080** (0.0.0.0/0) e **22** (SSH).
- Rede e banco criados uma vez (comandos no `Comando.md`):
  `docker network create -d bridge rede-pf` + `docker run ... --name banco ... postgres`

---

## Diagnóstico rápido

| Erro | Causa provável |
|---|---|
| 401 com token | audience do front ≠ audience do back, ou issuer sem `/` no final |
| 403 | token sem roles → conferir Action no trigger post-login (colar token no jwt.io) |
| Callback URL mismatch | faltou a URL da Vercel nas Allowed Callback URLs |
| Front sem env (`domain undefined`) | faltou env na Vercel ou não fez Redeploy |
| Action falha no SSH | `KEY_TEST` incompleto ou `HOST_TEST` com IP errado |
| Back não sobe (`docker logs pf-back`) | container `banco` não está na `rede-pf` |
