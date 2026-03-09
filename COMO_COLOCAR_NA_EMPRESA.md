# Colocar o sistema no computador principal da empresa

Use este guia quando for instalar o sistema no **computador principal** da empresa. Recomenda-se ligar esse PC **no cabo (Ethernet)** e usar o **IP do cabo** para criar/configurar o banco de dados e para os outros acessarem o sistema.

---

## O que você vai precisar

1. **Pasta do projeto** – copie a pasta inteira do projeto para o computador principal (ex.: `C:\padaria` ou `C:\Users\Nome\project`).
2. **Docker Desktop** – instalado no computador principal.
3. **IP do cabo (Ethernet)** – o computador principal ligado no cabo terá um IP; use esse IP no `.env` e para acessar o sistema pela rede.

---

## Passo 1: Instalar o Docker

1. Baixe o **Docker Desktop** em: https://www.docker.com/products/docker-desktop/
2. Instale e reinicie o PC se pedir.
3. Abra o Docker Desktop e espere ficar “Running” (ícone verde).

---

## Passo 1.5: Configurar Docker para iniciar automaticamente com o Windows

Para que o Docker e os containers subam automaticamente quando o PC ligar:

### Opção 1: Pelo Docker Desktop (mais fácil)

1. Abra o **Docker Desktop**.
2. Clique no ícone de **engrenagem** (⚙️) no canto superior direito para abrir **Settings**.
3. Vá em **General**.
4. Marque a opção **"Start Docker Desktop when you log in"** (Iniciar Docker Desktop quando você fizer login).
5. Clique em **"Apply & Restart"**.

### Opção 2: Criar tarefa agendada para subir os containers automaticamente

Se você quiser que os containers também subam automaticamente (não só o Docker Desktop):

1. Pressione **Win + R**, digite `taskschd.msc` e Enter (abre o Agendador de Tarefas).
2. Clique em **"Criar Tarefa Básica"** no painel direito.
3. Nome: `Iniciar Docker Containers`
4. Descrição: `Inicia os containers do sistema automaticamente`
5. **Gatilho:** Escolha **"Quando o computador iniciar"**.
6. **Ação:** Escolha **"Iniciar um programa"**.
7. Programa/script: `docker`
8. Adicionar argumentos: `compose -f C:\padaria\docker-compose.yml up -d`
   (troque `C:\padaria` pelo caminho real da pasta do projeto)
9. Marque **"Executar com privilégios mais altos"**.
10. Clique em **Concluir**.

**Importante:** A tarefa agendada só funciona se o Docker Desktop já estiver rodando. Por isso, use a **Opção 1 primeiro** para garantir que o Docker inicie, e depois use a **Opção 2** se quiser que os containers também subam automaticamente.

---

## Passo 2: Descobrir o IP do computador

1. **Conecte o computador principal pelo cabo (Ethernet)** – assim o IP costuma ser mais estável na rede da empresa.
2. Pressione **Win + R**, digite `cmd` e Enter.
3. Digite:
   ```text
   ipconfig
   ```
4. No resultado, procure a seção **“Adaptador de Rede Ethernet”** ou **“Ethernet”** (conexão por cabo).  
   Anote o **Endereço IPv4** dessa conexão.  
   Exemplo: `192.168.0.50`.
5. **Não use** o IP do Wi‑Fi se o PC estiver ligado no cabo – Wi‑Fi e cabo têm IPs diferentes. Use sempre o IP da conexão que o computador está usando (no seu caso, o do cabo).

**Resumo:** Na empresa, use o **IP do cabo (Ethernet)** para configurar o banco de dados e o sistema no computador principal.

---

## Passo 3: Configurar o IP no projeto

1. Abra a **pasta do projeto** no computador da empresa.
2. Edite o arquivo **`.env`** na raiz da pasta (mesmo nível do `docker-compose.yml`).
3. Deixe assim (troque pelo IP que você anotou):

   ```env
   NEXT_PUBLIC_API_URL=http://SEU_IP_AQUI:3503
   ```

   Exemplo, se o IP for `192.168.0.50`:

   ```env
   NEXT_PUBLIC_API_URL=http://192.168.0.50:3503
   ```

4. Salve o arquivo.

**Se quiser que só esse PC acesse:** use `http://localhost:3503` no lugar do IP.

---

## Passo 4: Liberar a porta 5432 (banco de dados)

O Docker vai subir o PostgreSQL na porta **5432**. Se o Windows já tiver PostgreSQL instalado, desligue o serviço:

1. Pressione **Win + R**, digite `services.msc` e Enter.
2. Procure **“PostgreSQL”** na lista.
3. Clique com o botão direito → **Parar**.

Se não tiver PostgreSQL no Windows, não precisa fazer nada.

---

## Passo 5: Subir o sistema (banco + API + site)

1. Abra o **PowerShell** ou **Prompt de Comando**.
2. Vá até a pasta do projeto, por exemplo:

   ```powershell
   cd C:\padaria
   ```

   (troque `C:\padaria` pelo caminho real da pasta).

3. Rode:

   ```powershell
   docker compose up -d --build
   ```

4. Espere terminar (primeira vez pode levar alguns minutos).
5. Quando aparecer algo como “Container padaria-belfort-db … Started”, está pronto.

O **banco de dados é criado automaticamente** pelo Docker (não precisa rodar script de criação de banco no PC da empresa, a não ser que você use banco instalado no Windows – veja “Banco no Windows” mais abaixo).

---

## Passo 6: Criar o primeiro usuário (admin)

1. No navegador, acesse:  
   **http://SEU_IP:3000/login**  
   (ou **http://localhost:3000/login** se configurou com localhost).

2. O primeiro usuário do sistema tem que ser criado pela API. No PowerShell (na pasta do projeto ou em qualquer pasta), rode (troque o IP e o email/senha):

   ```powershell
   curl -X POST http://SEU_IP:3503/auth/registro -H "Content-Type: application/json" -d "{\"nome\":\"Administrador\",\"email\":\"admin@empresa.com\",\"senha\":\"SuaSenhaForte\"}"
   ```

   Exemplo com IP `192.168.0.50`:

   ```powershell
   curl -X POST http://192.168.0.50:3503/auth/registro -H "Content-Type: application/json" -d "{\"nome\":\"Administrador\",\"email\":\"admin@empresa.com\",\"senha\":\"SuaSenhaForte\"}"
   ```

3. Depois disso, acesse de novo **http://SEU_IP:3000/login** e entre com esse email e senha. Esse primeiro usuário já será admin.

---

## Passo 7: Acessar o sistema

- **Neste PC:** http://localhost:3000  
- **Outros PCs/celulares na rede:** http://SEU_IP:3000  

Exemplo: se o IP for `192.168.0.50`, use **http://192.168.0.50:3000**.

---

## Resumo rápido

| O quê | Onde / Como |
|-------|-------------|
| Pasta do projeto | Copiar para o computador principal |
| Docker | Instalar Docker Desktop |
| Docker iniciar automaticamente | Docker Desktop → Settings → General → "Start Docker Desktop when you log in" |
| IP do PC (use o do cabo) | `ipconfig` → Endereço IPv4 da **Ethernet** (cabo) |
| Configurar IP | Editar `.env` → `NEXT_PUBLIC_API_URL=http://IP:3503` |
| Porta 5432 livre | Parar serviço PostgreSQL no Windows (se existir) |
| Subir tudo | `docker compose up -d --build` na pasta do projeto |
| Primeiro usuário | `curl` em POST `/auth/registro` (ou Postman) |
| Acessar | http://IP:3000 ou http://localhost:3000 |

---

## Se quiser o banco no Windows (e não no Docker)

Se no PC da empresa o PostgreSQL estiver **instalado no Windows** e você quiser usar esse banco em vez do container:

1. Crie o banco e o usuário no PostgreSQL (use os scripts em `API/database/`, por exemplo `01_criar_usuario_banco.sql` e `02_criar_tabelas.sql`), usando o **IP desse PC** onde for pedido (ex.: em instruções de conexão).
2. Configure o `API/.env` com o IP desse PC em `DB_HOST` (ex.: `DB_HOST=192.168.0.50`).
3. Suba só a API e o front, sem o container do banco:

   ```powershell
   docker compose -f docker-compose.banco-externo.yml up -d --build
   ```

O guia completo para criar o banco no Windows está em **`API/database/CRIA_BANCO_INSTRUCOES.md`**.
