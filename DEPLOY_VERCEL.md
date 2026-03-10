# Deploy: Vercel (front) + Render (API e banco)

Este guia usa **só Vercel e Render**:
- **Vercel** → frontend (Next.js)
- **Render** → API (Node/Express) + opcionalmente o PostgreSQL

---

## Visão geral

| Parte   | Onde   | O que fazer |
|--------|--------|-------------|
| Banco  | Render (Postgres) ou Neon | Criar o banco e rodar as migrations |
| API    | Render (Web Service)     | Deploy da pasta `API` |
| Front  | Vercel                   | Deploy da pasta `Front` |

---

## 1. Banco de dados (PostgreSQL)

Você pode usar **Render Postgres** (tudo no Render) ou **Neon** (gratuito, separado).

### Opção A: Render Postgres (no mesmo lugar da API)

1. Acesse [render.com](https://render.com) e faça login (GitHub).
2. **New +** → **PostgreSQL**.
3. Crie o banco (nome, usuário e senha são gerados; anote a **Internal Database URL** ou Host, Port, Database, User, Password).
4. Depois do deploy, em **Info** você vê **Host**, **Port**, **Database**, **User**, **Password**. Anote esses valores para preencher as variáveis da API no passo 2 (a API usa variáveis separadas, não connection string).

### Opção B: Neon (Postgres gratuito)

1. Acesse [neon.tech](https://neon.tech) e crie uma conta.
2. Crie um projeto e um banco.
3. No painel, copie a **connection string** ou anote Host, Port, Database, User, Password.

### Rodar as migrations no banco

As tabelas precisam ser criadas **uma vez** no banco do Render (ou Neon). Use um dos jeitos abaixo.

#### Arquivo único (recomendado)

No projeto existe o arquivo **`API/database/RENDER_MIGRATIONS.sql`**, que junta todas as migrations necessárias e **não** usa usuário específico (funciona no Render/Neon). Use esse arquivo.

#### Onde rodar no Render Postgres

1. No [Render](https://render.com), abra o **serviço do PostgreSQL** (não o da API).
2. No menu lateral, clique em **Connect** ou **Info**.
3. Na seção **Connections**, o Render mostra:
   - **PSQL Command** (comando pronto) ou
   - **External Database URL** (connection string).
4. **Opção A – Terminal (psql):**
   - Se você tem PostgreSQL instalado no PC, use o **PSQL Command** que o Render mostra (algo como `psql postgres://usuario:senha@host/database`) e rode no terminal:
     ```bash
     psql "COLE_AQUI_A_EXTERNAL_DATABASE_URL"
     ```
   - Dentro do `psql`, rode o conteúdo do arquivo `API/database/RENDER_MIGRATIONS.sql` (copie e cole o SQL todo, ou use `\i caminho/para/RENDER_MIGRATIONS.sql` se estiver no mesmo PC).
5. **Opção B – Cliente gráfico (pgAdmin, DBeaver, etc.):**
   - Crie uma nova conexão com os dados da aba **Info**: Host, Port, Database, Username, Password.
   - Abra um **Query Tool** / **Nova consulta SQL**.
   - Copie todo o conteúdo de `API/database/RENDER_MIGRATIONS.sql`, cole na janela e execute.

#### Onde rodar no Neon

1. Acesse [console.neon.tech](https://console.neon.tech), abra seu projeto e o branch.
2. No menu lateral, clique em **SQL Editor**.
3. Copie todo o conteúdo de `API/database/RENDER_MIGRATIONS.sql`, cole no editor e clique em **Run**.

Depois de rodar o script, as tabelas (incluindo `usuarios_padaria`) estarão criadas. Aí é só criar o primeiro usuário via **POST /auth/registro** (pelo Console do navegador ou por Postman) e fazer login no site.

---

## 2. Deploy da API no Render

1. No [Render](https://render.com), **New +** → **Web Service**.
2. Conecte o **repositório GitHub** do projeto (se ainda não conectou, autorize o Render).
3. Configure:
   - **Name**: ex. `padaria-api`
   - **Region**: para quem está no Brasil (ex. São Paulo), use **Virginia (US East)** — é a opção mais próxima; o Render não tem datacenter no Brasil.
   - **Root Directory**: **`API`** (obrigatório).
   - **Runtime**: **Node**.
   - **Build Command**: `npm install`
   - **Start Command**: `npm start`
4. Em **Environment Variables**, adicione (a API usa variáveis separadas):

   | Key           | Value            |
   |---------------|------------------|
   | `DB_HOST`     | host do banco    |
   | `DB_PORT`     | 5432             |
   | `DB_NAME`     | nome do banco    |
   | `DB_USER`     | usuário          |
   | `DB_PASSWORD` | senha            |
   | `NODE_ENV`    | `production`     |

   Use os valores do **Render Postgres** (aba Info do banco) ou do **Neon**. O Render define `PORT` automaticamente para o Web Service.

5. Clique em **Create Web Service**. O Render vai fazer o build e subir a API.
6. **Anote a URL** do serviço (ex.: `https://padaria-api.onrender.com`). Essa será a `NEXT_PUBLIC_API_URL` no Vercel.

**Nota:** No plano gratuito do Render o serviço “dorme” após ~15 min sem acesso; o primeiro acesso depois disso pode demorar ~1 min.

---

## 3. Deploy do front no Vercel

1. Acesse [vercel.com](https://vercel.com) e faça login (GitHub).
2. **Add New** → **Project** e importe o **mesmo repositório** do projeto.
3. **Root Directory**: clique em **Edit** e selecione **`Front`** (só a pasta do Next.js).
4. **Environment Variables**:
   - Nome: `NEXT_PUBLIC_API_URL`
   - Valor: **URL da API no Render** (ex.: `https://padaria-api.onrender.com`) — **sem barra no final**.
   - Marque **Production** (e Preview/Development se quiser).
5. Clique em **Deploy**.

O Vercel vai rodar `npm run build` na pasta `Front`. O front em produção vai chamar a API no Render.

---

## 4. CORS

A API já está com `origin: '*'`, então o domínio do Vercel já pode chamar a API. Não precisa mudar nada para funcionar.

---

## 5. Resumo (Vercel + Render)

| O quê   | Onde              | Ação |
|--------|-------------------|------|
| Banco  | Render Postgres ou Neon | Criar banco e rodar scripts em `API/database/` |
| API    | Render – Web Service    | Root = `API`, Build = `npm install`, Start = `npm start`, variáveis de banco + `NODE_ENV=production` |
| Front  | Vercel – Project        | Root = `Front`, variável `NEXT_PUBLIC_API_URL` = URL da API no Render |

Depois disso, o sistema fica no ar: front no Vercel e API (e opcionalmente o banco) no Render.
