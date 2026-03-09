# 🥖 Backend - Sistema de Controle de Produtos e Vendas de Padaria

Backend completo desenvolvido em Node.js com Express.js e PostgreSQL para controle de produtos e vendas de uma padaria. Sistema preparado para alta escala, seguindo padrão MVC e boas práticas de desenvolvimento.

## 📋 Índice

- [Tecnologias](#-tecnologias)
- [Estrutura do Projeto](#-estrutura-do-projeto)
- [Pré-requisitos](#-pré-requisitos)
- [Instalação](#-instalação)
- [Configuração do Banco de Dados](#-configuração-do-banco-de-dados)
- [Como Rodar](#-como-rodar)
- [Endpoints da API](#-endpoints-da-api)
- [Exemplos de Uso](#-exemplos-de-uso)
- [Regras de Negócio](#-regras-de-negócio)
- [Estrutura do Banco de Dados](#-estrutura-do-banco-de-dados)

## 🛠 Tecnologias

- **Node.js** - Runtime JavaScript
- **Express.js** - Framework web
- **PostgreSQL** - Banco de dados relacional
- **pg** - Cliente PostgreSQL para Node.js
- **dotenv** - Gerenciamento de variáveis de ambiente
- **cors** - Middleware para CORS

## 📁 Estrutura do Projeto

```
src/
 ├── config/
 │   ├── database.js      # Configuração do pool de conexões PostgreSQL
 │   └── env.js           # Carregamento de variáveis de ambiente
 ├── controllers/
 │   ├── ProdutoController.js    # Lógica de controle de produtos
 │   ├── VendaController.js      # Lógica de controle de vendas
 │   ├── RelatorioController.js  # Lógica de controle de relatórios
 │   └── RoteiroController.js    # Lógica de controle de roteiros
 ├── models/
 │   ├── ProdutoModel.js         # Modelo de dados de produtos
 │   ├── VendaModel.js           # Modelo de dados de vendas
 │   ├── VendaItemModel.js       # Modelo de dados de itens de venda
 │   ├── RoteiroModel.js         # Modelo de dados de roteiros
 │   └── RoteiroItemModel.js     # Modelo de dados de itens de roteiro
 ├── routes/
 │   ├── produto.routes.js       # Rotas de produtos
 │   ├── venda.routes.js         # Rotas de vendas
 │   ├── relatorio.routes.js     # Rotas de relatórios
 │   └── roteiro.routes.js       # Rotas de roteiros
 ├── services/
 │   ├── VendaService.js         # Regras de negócio de vendas
 │   ├── RelatorioService.js     # Regras de negócio de relatórios
 │   └── RoteiroService.js        # Regras de negócio de roteiros
 ├── middlewares/
 │   └── errorHandler.js         # Tratamento global de erros
 ├── utils/
 │   └── dateUtils.js             # Utilitários de data
 ├── app.js                       # Configuração do Express
 └── server.js                    # Ponto de entrada da aplicação

database/
 └── schema.sql                   # Script SQL de criação das tabelas
```

## ✅ Pré-requisitos

- Node.js (versão 14 ou superior)
- PostgreSQL (versão 12 ou superior)
- npm ou yarn

## 📦 Instalação

1. Clone o repositório ou navegue até a pasta do projeto:

```bash
cd padaria-backend
```

2. Instale as dependências:

```bash
npm install
```

3. Copie o arquivo `.env.example` para `.env`:

```bash
cp .env.example .env
```

4. Configure as variáveis de ambiente no arquivo `.env`:

```env
DB_HOST=localhost
DB_PORT=5432
DB_NAME=padaria_db
DB_USER=postgres
DB_PASSWORD=sua_senha_aqui

PORT=3000
NODE_ENV=development
```

## 🗄 Configuração do Banco de Dados

1. Crie o banco de dados PostgreSQL:

```sql
CREATE DATABASE padaria_db;
```

2. Execute o script SQL para criar as tabelas:

```bash
psql -U postgres -d padaria_db -f database/schema.sql
```

Ou execute diretamente no psql:

```bash
psql -U postgres -d padaria_db
```

E então cole o conteúdo do arquivo `database/schema.sql`.

## 🚀 Como Rodar

### Modo Desenvolvimento (com nodemon)

```bash
npm run dev
```

### Modo Produção

```bash
npm start
```

O servidor estará disponível em `http://localhost:3000` (ou na porta configurada no `.env`).

### Verificar se está funcionando

Acesse: `http://localhost:3000/health`

Você deve receber uma resposta JSON:

```json
{
  "success": true,
  "message": "API está funcionando",
  "timestamp": "2024-01-01T12:00:00.000Z"
}
```

## 📡 Endpoints da API

### Produtos

| Método | Endpoint | Descrição |
|--------|----------|-----------|
| POST | `/produtos` | Cria um novo produto |
| GET | `/produtos` | Lista todos os produtos ativos |
| GET | `/produtos/:id` | Busca um produto por ID |
| PUT | `/produtos/:id` | Atualiza um produto |
| DELETE | `/produtos/:id` | Desativa um produto (exclusão lógica) |

### Vendas

| Método | Endpoint | Descrição |
|--------|----------|-----------|
| POST | `/vendas` | Cria uma nova venda |
| GET | `/vendas` | Lista todas as vendas |
| GET | `/vendas/:id` | Busca uma venda por ID |

### Relatórios

| Método | Endpoint | Descrição |
|--------|----------|-----------|
| GET | `/relatorios/vendas?inicio=YYYY-MM-DD&fim=YYYY-MM-DD` | Vendas por período |
| GET | `/relatorios/faturamento?inicio=YYYY-MM-DD&fim=YYYY-MM-DD` | Faturamento por dia |
| GET | `/relatorios/produtos-mais-vendidos?limit=10` | Produtos mais vendidos |
| GET | `/relatorios/quantidade-por-produto` | Quantidade vendida por produto |

### Roteiros de Produção

| Método | Endpoint | Descrição |
|--------|----------|-----------|
| POST | `/roteiros` | Cria um novo roteiro de produção |
| GET | `/roteiros` | Lista todos os roteiros (com filtros opcionais) |
| GET | `/roteiros/:id` | Busca um roteiro por ID |
| GET | `/roteiros/:id/impressao` | Gera dados formatados para impressão |
| PUT | `/roteiros/:id` | Atualiza um roteiro |
| PUT | `/roteiros/:id/itens` | Atualiza os itens de um roteiro |
| DELETE | `/roteiros/:id` | Deleta um roteiro |

📖 **Documentação completa para front-end:** Veja [docs/API-ROTEIROS-FRONTEND.md](docs/API-ROTEIROS-FRONTEND.md)

## 💡 Exemplos de Uso

### Criar um Produto

**POST** `/produtos`

```json
{
  "nome": "Pão Francês",
  "descricao": "Pão francês tradicional",
  "preco": 0.50
}
```

**Resposta:**

```json
{
  "success": true,
  "message": "Produto criado com sucesso",
  "data": {
    "id": 1,
    "nome": "Pão Francês",
    "descricao": "Pão francês tradicional",
    "preco": "0.50",
    "ativo": true,
    "criado_em": "2024-01-01T12:00:00.000Z"
  }
}
```

### Criar uma Venda

**POST** `/vendas`

⚠️ **Importante:** Ao criar uma venda, um roteiro de produção é gerado automaticamente com os mesmos produtos e quantidades.

```json
{
  "itens": [
    {
      "produto_id": 1,
      "quantidade": 10
    },
    {
      "produto_id": 2,
      "quantidade": 5
    }
  ],
  "forma_pagamento": "Dinheiro",
  "data_venda": "2024-01-01",
  "nome_cliente": "Padaria do João"
}
```

**Campos:**
- `itens` (obrigatório): Array com produtos e quantidades
- `forma_pagamento` (obrigatório): Forma de pagamento
- `data_venda` (opcional): Data da venda (padrão: data atual)
- `nome_cliente` (opcional): Nome do cliente/empresa (usado no roteiro gerado)

**Resposta:**

```json
{
  "success": true,
  "message": "Venda criada com sucesso. Roteiro de produção gerado automaticamente.",
  "data": {
    "id": 1,
    "valor_total": "7.50",
    "data_venda": "2024-01-01",
    "forma_pagamento": "Dinheiro",
    "nome_cliente": "Padaria do João",
    "roteiro_id": 1,
    "criado_em": "2024-01-01T12:00:00.000Z",
    "itens": [
      {
        "id": 1,
        "venda_id": 1,
        "produto_id": 1,
        "quantidade": 10,
        "preco_unitario": "0.50",
        "subtotal": "5.00",
        "produto_nome": "Pão Francês"
      },
      {
        "id": 2,
        "venda_id": 1,
        "produto_id": 2,
        "quantidade": 5,
        "preco_unitario": "0.50",
        "subtotal": "2.50",
        "produto_nome": "Pão de Açúcar"
      }
    ]
  }
}
```

**Observação:** O campo `roteiro_id` na resposta indica o ID do roteiro de produção criado automaticamente. Se `nome_cliente` não for informado, o roteiro será criado com o nome "Venda #ID".

### Buscar Vendas por Período

**GET** `/relatorios/vendas?inicio=2024-01-01&fim=2024-01-31`

**Resposta:**

```json
{
  "success": true,
  "data": {
    "periodo": {
      "inicio": "2024-01-01",
      "fim": "2024-01-31"
    },
    "total_vendas": 150,
    "faturamento_total": 1250.75,
    "vendas": [
      {
        "id": 1,
        "valor_total": "7.50",
        "data_venda": "2024-01-01",
        "forma_pagamento": "Dinheiro",
        "total_itens": "2"
      }
    ]
  }
}
```

### Produtos Mais Vendidos

**GET** `/relatorios/produtos-mais-vendidos?limit=5`

**Resposta:**

```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "nome": "Pão Francês",
      "quantidade_total_vendida": "500",
      "total_vendas": "50",
      "faturamento_produto": "250.00"
    }
  ]
}
```

## 📐 Regras de Negócio

### Produtos

- ✅ CRUD completo
- ✅ Não permite exclusão física (usa `ativo = false`)
- ✅ Validação de preço maior que zero
- ✅ Nome é obrigatório

### Vendas

- ✅ Criar venda com múltiplos produtos
- ✅ **Criação automática de roteiro de produção** ao criar venda
- ✅ Cálculo automático de subtotal por item
- ✅ Cálculo automático do valor total da venda
- ✅ Transação SQL (BEGIN / COMMIT / ROLLBACK)
- ✅ Validação de produtos ativos
- ✅ Validação de quantidade maior que zero
- ✅ Sistema preparado para grande volume de vendas
- ✅ Campo opcional `nome_cliente` para identificar o cliente no roteiro

### Relatórios

- ✅ Vendas por período
- ✅ Faturamento total por dia
- ✅ Produtos mais vendidos
- ✅ Quantidade total vendida por produto

### Roteiros de Produção

- ✅ CRUD completo de roteiros
- ✅ **Geração automática ao criar venda** (não precisa cadastrar duas vezes)
- ✅ Gerenciamento de itens do roteiro
- ✅ Status de produção (pendente, em_producao, concluido, cancelado)
- ✅ Filtros por status e data
- ✅ Endpoint específico para impressão
- ✅ Transações SQL para integridade
- ✅ Validação de produtos ativos
- ✅ Relacionamento com vendas (campo `venda_id`)

## 🗃 Estrutura do Banco de Dados

### Tabela: produtos

| Campo | Tipo | Descrição |
|-------|------|-----------|
| id | SERIAL | Chave primária |
| nome | VARCHAR(255) | Nome do produto |
| descricao | TEXT | Descrição do produto |
| preco | DECIMAL(10,2) | Preço do produto |
| ativo | BOOLEAN | Status do produto |
| criado_em | TIMESTAMP | Data de criação |

### Tabela: vendas

| Campo | Tipo | Descrição |
|-------|------|-----------|
| id | SERIAL | Chave primária |
| valor_total | DECIMAL(10,2) | Valor total da venda |
| data_venda | DATE | Data da venda |
| forma_pagamento | VARCHAR(50) | Forma de pagamento |
| nome_cliente | VARCHAR(255) | Nome do cliente/empresa (opcional) |
| criado_em | TIMESTAMP | Data de criação |

### Tabela: venda_itens

| Campo | Tipo | Descrição |
|-------|------|-----------|
| id | SERIAL | Chave primária |
| venda_id | INTEGER | FK para vendas |
| produto_id | INTEGER | FK para produtos |
| quantidade | INTEGER | Quantidade vendida |
| preco_unitario | DECIMAL(10,2) | Preço unitário no momento da venda |
| subtotal | DECIMAL(10,2) | Subtotal do item |

### Tabela: roteiros

| Campo | Tipo | Descrição |
|-------|------|-----------|
| id | SERIAL | Chave primária |
| nome_empresa | VARCHAR(255) | Nome da empresa/cliente |
| data_producao | DATE | Data de produção |
| observacoes | TEXT | Observações gerais |
| status | VARCHAR(50) | Status (pendente, em_producao, concluido, cancelado) |
| venda_id | INTEGER | FK para vendas (roteiro gerado automaticamente) |
| criado_em | TIMESTAMP | Data de criação |
| atualizado_em | TIMESTAMP | Data de atualização |

### Tabela: roteiro_itens

| Campo | Tipo | Descrição |
|-------|------|-----------|
| id | SERIAL | Chave primária |
| roteiro_id | INTEGER | FK para roteiros |
| produto_id | INTEGER | FK para produtos |
| quantidade | INTEGER | Quantidade a produzir |
| observacao | TEXT | Observação específica do item |
| criado_em | TIMESTAMP | Data de criação |

## 🔒 Segurança e Boas Práticas

- ✅ Variáveis sensíveis via `.env`
- ✅ Tratamento global de erros
- ✅ Validação de dados de entrada
- ✅ Transações SQL para integridade
- ✅ Preparado para futura autenticação JWT
- ✅ Código organizado seguindo padrão MVC

## 🚧 Próximos Passos

Este sistema está preparado para evoluir para:

- Sistema de PDV (Ponto de Venda)
- Controle de estoque
- Integração fiscal
- Autenticação e autorização (JWT)
- Dashboard administrativo
- Relatórios avançados
- Exportação de dados (PDF, Excel)
- ✅ **Roteiros de produção** (implementado)

## 📝 Licença

Este projeto foi desenvolvido para fins educacionais e comerciais.

## 👨‍💻 Desenvolvido com

- Node.js
- Express.js
- PostgreSQL
- Arquitetura MVC
- Boas práticas de desenvolvimento

---

**Desenvolvido com ❤️ para padarias**
