# 📋 Documentação de API - Roteiros de Produção

Documentação completa dos endpoints de **Roteiros** para integração com o front-end.

## 📌 Visão Geral

O sistema de **Roteiros** permite criar e gerenciar listas de produção que serão enviadas para a área de produção. Cada roteiro contém:
- Nome da empresa/cliente
- Data de produção
- Lista de produtos com quantidades
- Status do roteiro
- Observações gerais e por item

## 🔗 Base URL

```
http://localhost:3000/roteiros
```

## 📊 Estrutura de Dados

### Roteiro

```typescript
interface Roteiro {
  id: number;
  nome_empresa: string;
  data_producao: string; // YYYY-MM-DD
  observacoes?: string;
  status: 'pendente' | 'em_producao' | 'concluido' | 'cancelado';
  criado_em: string; // ISO timestamp
  atualizado_em: string; // ISO timestamp
  total_itens?: number; // Quantidade de itens no roteiro
  itens?: RoteiroItem[]; // Array de itens (quando buscar por ID)
}

interface RoteiroItem {
  id: number;
  roteiro_id: number;
  produto_id: number;
  produto_nome: string;
  produto_descricao?: string;
  quantidade: number;
  observacao?: string;
  criado_em: string;
}
```

### Dados para Impressão

```typescript
interface DadosImpressao {
  roteiro_id: number;
  nome_empresa: string;
  data_producao: string;
  observacoes?: string;
  status: string;
  criado_em: string;
  itens: Array<{
    produto_id: number;
    produto_nome: string;
    produto_descricao?: string;
    quantidade: number;
    observacao?: string;
  }>;
  total_produtos: number;
  total_quantidade: number;
}
```

---

## 🚀 Endpoints

### 1. Criar Roteiro

Cria um novo roteiro de produção com seus itens.

**Endpoint:** `POST /roteiros`

**Headers:**
```
Content-Type: application/json
```

**Body:**
```json
{
  "nome_empresa": "Padaria do João",
  "data_producao": "2024-01-15",
  "observacoes": "Entregar até 14h",
  "status": "pendente",
  "itens": [
    {
      "produto_id": 1,
      "quantidade": 50,
      "observacao": "Pão bem assado"
    },
    {
      "produto_id": 2,
      "quantidade": 30,
      "observacao": null
    }
  ]
}
```

**Campos Obrigatórios:**
- `nome_empresa` (string): Nome da empresa/cliente
- `data_producao` (string): Data no formato YYYY-MM-DD
- `itens` (array): Array com pelo menos um item

**Campos Opcionais:**
- `observacoes` (string): Observações gerais do roteiro
- `status` (string): Status inicial (padrão: "pendente")
- `observacao` (string) em cada item: Observação específica do item

**Resposta de Sucesso (201):**
```json
{
  "success": true,
  "message": "Roteiro criado com sucesso",
  "data": {
    "id": 1,
    "nome_empresa": "Padaria do João",
    "data_producao": "2024-01-15",
    "observacoes": "Entregar até 14h",
    "status": "pendente",
    "criado_em": "2024-01-10T10:30:00.000Z",
    "atualizado_em": "2024-01-10T10:30:00.000Z",
    "itens": [
      {
        "id": 1,
        "roteiro_id": 1,
        "produto_id": 1,
        "produto_nome": "Pão Francês",
        "produto_descricao": "Pão francês tradicional",
        "quantidade": 50,
        "observacao": "Pão bem assado",
        "criado_em": "2024-01-10T10:30:00.000Z"
      },
      {
        "id": 2,
        "roteiro_id": 1,
        "produto_id": 2,
        "produto_nome": "Pão de Açúcar",
        "produto_descricao": null,
        "quantidade": 30,
        "observacao": null,
        "criado_em": "2024-01-10T10:30:00.000Z"
      }
    ]
  }
}
```

**Erros Possíveis:**

- **400 Bad Request:** Campos obrigatórios faltando ou inválidos
- **400 Bad Request:** Produto não encontrado ou inativo
- **400 Bad Request:** Quantidade inválida

**Exemplo de Erro:**
```json
{
  "success": false,
  "message": "Nome da empresa é obrigatório"
}
```

---

### 2. Listar Roteiros

Lista todos os roteiros com filtros opcionais.

**Endpoint:** `GET /roteiros`

**Query Parameters (opcionais):**
- `status` (string): Filtrar por status (`pendente`, `em_producao`, `concluido`, `cancelado`)
- `data_producao` (string): Filtrar por data específica (YYYY-MM-DD)
- `data_inicio` (string): Data inicial do período (YYYY-MM-DD)
- `data_fim` (string): Data final do período (YYYY-MM-DD)

**Exemplos de Uso:**

```
GET /roteiros
GET /roteiros?status=pendente
GET /roteiros?data_producao=2024-01-15
GET /roteiros?data_inicio=2024-01-01&data_fim=2024-01-31
GET /roteiros?status=pendente&data_inicio=2024-01-01&data_fim=2024-01-31
```

**Resposta de Sucesso (200):**
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "nome_empresa": "Padaria do João",
      "data_producao": "2024-01-15",
      "observacoes": "Entregar até 14h",
      "status": "pendente",
      "criado_em": "2024-01-10T10:30:00.000Z",
      "atualizado_em": "2024-01-10T10:30:00.000Z",
      "total_itens": "2"
    },
    {
      "id": 2,
      "nome_empresa": "Confeitaria Maria",
      "data_producao": "2024-01-16",
      "observacoes": null,
      "status": "em_producao",
      "criado_em": "2024-01-11T08:00:00.000Z",
      "atualizado_em": "2024-01-11T09:15:00.000Z",
      "total_itens": "3"
    }
  ]
}
```

---

### 3. Buscar Roteiro por ID

Busca um roteiro específico com todos os seus itens.

**Endpoint:** `GET /roteiros/:id`

**Parâmetros:**
- `id` (number): ID do roteiro

**Exemplo:**
```
GET /roteiros/1
```

**Resposta de Sucesso (200):**
```json
{
  "success": true,
  "data": {
    "id": 1,
    "nome_empresa": "Padaria do João",
    "data_producao": "2024-01-15",
    "observacoes": "Entregar até 14h",
    "status": "pendente",
    "criado_em": "2024-01-10T10:30:00.000Z",
    "atualizado_em": "2024-01-10T10:30:00.000Z",
    "itens": [
      {
        "id": 1,
        "roteiro_id": 1,
        "produto_id": 1,
        "produto_nome": "Pão Francês",
        "produto_descricao": "Pão francês tradicional",
        "quantidade": 50,
        "observacao": "Pão bem assado",
        "criado_em": "2024-01-10T10:30:00.000Z"
      },
      {
        "id": 2,
        "roteiro_id": 1,
        "produto_id": 2,
        "produto_nome": "Pão de Açúcar",
        "produto_descricao": null,
        "quantidade": 30,
        "observacao": null,
        "criado_em": "2024-01-10T10:30:00.000Z"
      }
    ]
  }
}
```

**Erro (404):**
```json
{
  "success": false,
  "message": "Roteiro não encontrado"
}
```

---

### 4. Gerar Dados para Impressão

Retorna os dados formatados especificamente para impressão do roteiro.

**Endpoint:** `GET /roteiros/:id/impressao`

**Parâmetros:**
- `id` (number): ID do roteiro

**Exemplo:**
```
GET /roteiros/1/impressao
```

**Resposta de Sucesso (200):**
```json
{
  "success": true,
  "data": {
    "roteiro_id": 1,
    "nome_empresa": "Padaria do João",
    "data_producao": "2024-01-15",
    "observacoes": "Entregar até 14h",
    "status": "pendente",
    "criado_em": "2024-01-10T10:30:00.000Z",
    "itens": [
      {
        "produto_id": 1,
        "produto_nome": "Pão Francês",
        "produto_descricao": "Pão francês tradicional",
        "quantidade": 50,
        "observacao": "Pão bem assado"
      },
      {
        "produto_id": 2,
        "produto_nome": "Pão de Açúcar",
        "produto_descricao": null,
        "quantidade": 30,
        "observacao": null
      }
    ],
    "total_produtos": 2,
    "total_quantidade": 80
  }
}
```

**💡 Uso Recomendado:**

Este endpoint é ideal para gerar a visualização de impressão no front-end. Os dados vêm formatados e prontos para exibição em uma página de impressão.

**Exemplo de Componente React:**

```jsx
import { useEffect, useState } from 'react';

function RoteiroImpressao({ roteiroId }) {
  const [dados, setDados] = useState(null);

  useEffect(() => {
    fetch(`http://localhost:3000/roteiros/${roteiroId}/impressao`)
      .then(res => res.json())
      .then(result => {
        if (result.success) {
          setDados(result.data);
        }
      });
  }, [roteiroId]);

  if (!dados) return <div>Carregando...</div>;

  return (
    <div className="roteiro-impressao">
      <header>
        <h1>ROTEIRO DE PRODUÇÃO</h1>
        <div>
          <p><strong>Empresa:</strong> {dados.nome_empresa}</p>
          <p><strong>Data de Produção:</strong> {dados.data_producao}</p>
          <p><strong>Status:</strong> {dados.status}</p>
        </div>
      </header>
      
      {dados.observacoes && (
        <div className="observacoes">
          <strong>Observações:</strong> {dados.observacoes}
        </div>
      )}

      <table>
        <thead>
          <tr>
            <th>Produto</th>
            <th>Quantidade</th>
            <th>Observação</th>
          </tr>
        </thead>
        <tbody>
          {dados.itens.map((item, index) => (
            <tr key={index}>
              <td>{item.produto_nome}</td>
              <td>{item.quantidade}</td>
              <td>{item.observacao || '-'}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <footer>
        <p><strong>Total de Produtos:</strong> {dados.total_produtos}</p>
        <p><strong>Total de Quantidade:</strong> {dados.total_quantidade}</p>
      </footer>
    </div>
  );
}
```

---

### 5. Atualizar Roteiro

Atualiza informações gerais do roteiro (não atualiza itens).

**Endpoint:** `PUT /roteiros/:id`

**Headers:**
```
Content-Type: application/json
```

**Body (todos os campos são opcionais):**
```json
{
  "nome_empresa": "Padaria do João - Filial",
  "data_producao": "2024-01-16",
  "observacoes": "Nova observação",
  "status": "em_producao"
}
```

**Exemplo:**
```
PUT /roteiros/1
```

**Resposta de Sucesso (200):**
```json
{
  "success": true,
  "message": "Roteiro atualizado com sucesso",
  "data": {
    "id": 1,
    "nome_empresa": "Padaria do João - Filial",
    "data_producao": "2024-01-16",
    "observacoes": "Nova observação",
    "status": "em_producao",
    "criado_em": "2024-01-10T10:30:00.000Z",
    "atualizado_em": "2024-01-11T14:20:00.000Z",
    "itens": [...]
  }
}
```

**Erros Possíveis:**

- **404 Not Found:** Roteiro não encontrado
- **400 Bad Request:** Data inválida ou status inválido

---

### 6. Atualizar Itens do Roteiro

Atualiza completamente a lista de itens de um roteiro (substitui todos os itens).

**Endpoint:** `PUT /roteiros/:id/itens`

**Headers:**
```
Content-Type: application/json
```

**Body:**
```json
{
  "itens": [
    {
      "produto_id": 1,
      "quantidade": 60,
      "observacao": "Quantidade aumentada"
    },
    {
      "produto_id": 3,
      "quantidade": 20,
      "observacao": null
    }
  ]
}
```

**Exemplo:**
```
PUT /roteiros/1/itens
```

**Resposta de Sucesso (200):**
```json
{
  "success": true,
  "message": "Itens do roteiro atualizados com sucesso",
  "data": {
    "id": 1,
    "nome_empresa": "Padaria do João",
    "data_producao": "2024-01-15",
    "status": "pendente",
    "itens": [
      {
        "id": 3,
        "roteiro_id": 1,
        "produto_id": 1,
        "produto_nome": "Pão Francês",
        "quantidade": 60,
        "observacao": "Quantidade aumentada"
      },
      {
        "id": 4,
        "roteiro_id": 1,
        "produto_id": 3,
        "produto_nome": "Bolo de Chocolate",
        "quantidade": 20,
        "observacao": null
      }
    ]
  }
}
```

**⚠️ Importante:**

Este endpoint **substitui completamente** a lista de itens. Se você quiser adicionar/remover itens específicos, você precisa:
1. Buscar o roteiro atual (`GET /roteiros/:id`)
2. Modificar o array de itens
3. Enviar o array completo atualizado (`PUT /roteiros/:id/itens`)

---

### 7. Deletar Roteiro

Remove um roteiro e todos os seus itens.

**Endpoint:** `DELETE /roteiros/:id`

**Parâmetros:**
- `id` (number): ID do roteiro

**Exemplo:**
```
DELETE /roteiros/1
```

**Resposta de Sucesso (200):**
```json
{
  "success": true,
  "message": "Roteiro deletado com sucesso"
}
```

**Erro (404):**
```json
{
  "success": false,
  "message": "Roteiro não encontrado"
}
```

---

## 🎨 Sugestões de UI/UX para Front-end

### 1. Listagem de Roteiros

- Exibir cards ou tabela com: nome da empresa, data de produção, status (com badge colorido)
- Filtros: por status, por data
- Botão "Ver Detalhes" que abre modal ou navega para página de detalhes
- Botão "Imprimir" que abre página de impressão

### 2. Criação/Edição de Roteiro

- Formulário com:
  - Campo de texto para nome da empresa
  - Date picker para data de produção
  - Textarea para observações gerais
  - Select para status
  - Lista dinâmica de itens (adicionar/remover produtos)
  - Para cada item: select de produto, input de quantidade, textarea para observação

### 3. Página de Impressão

- Layout otimizado para impressão (usar CSS `@media print`)
- Cabeçalho com nome da empresa em destaque
- Tabela com produtos e quantidades
- Rodapé com totais
- Botão "Imprimir" que chama `window.print()`

**Exemplo de CSS para Impressão:**

```css
@media print {
  .no-print {
    display: none;
  }
  
  .roteiro-impressao {
    page-break-inside: avoid;
  }
  
  table {
    width: 100%;
    border-collapse: collapse;
  }
  
  th, td {
    border: 1px solid #000;
    padding: 8px;
  }
}
```

### 4. Status do Roteiro

Use cores diferentes para cada status:
- **Pendente:** Cinza/Amarelo
- **Em Produção:** Azul
- **Concluído:** Verde
- **Cancelado:** Vermelho

---

## 📝 Exemplos de Código

### JavaScript/TypeScript (Fetch API)

```typescript
// Criar roteiro
async function criarRoteiro(dados: {
  nome_empresa: string;
  data_producao: string;
  observacoes?: string;
  status?: string;
  itens: Array<{
    produto_id: number;
    quantidade: number;
    observacao?: string;
  }>;
}) {
  const response = await fetch('http://localhost:3000/roteiros', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(dados),
  });

  const result = await response.json();
  
  if (!result.success) {
    throw new Error(result.message);
  }
  
  return result.data;
}

// Listar roteiros com filtros
async function listarRoteiros(filtros?: {
  status?: string;
  data_producao?: string;
  data_inicio?: string;
  data_fim?: string;
}) {
  const params = new URLSearchParams();
  
  if (filtros?.status) params.append('status', filtros.status);
  if (filtros?.data_producao) params.append('data_producao', filtros.data_producao);
  if (filtros?.data_inicio) params.append('data_inicio', filtros.data_inicio);
  if (filtros?.data_fim) params.append('data_fim', filtros.data_fim);

  const response = await fetch(`http://localhost:3000/roteiros?${params}`);
  const result = await response.json();
  
  return result.data;
}

// Buscar roteiro por ID
async function buscarRoteiro(id: number) {
  const response = await fetch(`http://localhost:3000/roteiros/${id}`);
  const result = await response.json();
  
  if (!result.success) {
    throw new Error(result.message);
  }
  
  return result.data;
}

// Gerar dados para impressão
async function gerarImpressao(id: number) {
  const response = await fetch(`http://localhost:3000/roteiros/${id}/impressao`);
  const result = await response.json();
  
  if (!result.success) {
    throw new Error(result.message);
  }
  
  return result.data;
}

// Atualizar roteiro
async function atualizarRoteiro(id: number, dados: Partial<{
  nome_empresa: string;
  data_producao: string;
  observacoes: string;
  status: string;
}>) {
  const response = await fetch(`http://localhost:3000/roteiros/${id}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(dados),
  });

  const result = await response.json();
  
  if (!result.success) {
    throw new Error(result.message);
  }
  
  return result.data;
}

// Deletar roteiro
async function deletarRoteiro(id: number) {
  const response = await fetch(`http://localhost:3000/roteiros/${id}`, {
    method: 'DELETE',
  });

  const result = await response.json();
  
  if (!result.success) {
    throw new Error(result.message);
  }
  
  return result.message;
}
```

### Axios (Exemplo)

```typescript
import axios from 'axios';

const api = axios.create({
  baseURL: 'http://localhost:3000',
});

// Criar roteiro
export const criarRoteiro = (dados: any) => 
  api.post('/roteiros', dados).then(res => res.data.data);

// Listar roteiros
export const listarRoteiros = (filtros?: any) => 
  api.get('/roteiros', { params: filtros }).then(res => res.data.data);

// Buscar roteiro
export const buscarRoteiro = (id: number) => 
  api.get(`/roteiros/${id}`).then(res => res.data.data);

// Gerar impressão
export const gerarImpressao = (id: number) => 
  api.get(`/roteiros/${id}/impressao`).then(res => res.data.data);

// Atualizar roteiro
export const atualizarRoteiro = (id: number, dados: any) => 
  api.put(`/roteiros/${id}`, dados).then(res => res.data.data);

// Deletar roteiro
export const deletarRoteiro = (id: number) => 
  api.delete(`/roteiros/${id}`).then(res => res.data);
```

---

## ✅ Checklist de Implementação

- [ ] Criar componente de listagem de roteiros
- [ ] Criar formulário de criação/edição de roteiro
- [ ] Implementar filtros (status, data)
- [ ] Criar página de detalhes do roteiro
- [ ] Criar página de impressão otimizada
- [ ] Implementar tratamento de erros
- [ ] Adicionar loading states
- [ ] Implementar validações no front-end
- [ ] Adicionar confirmação antes de deletar
- [ ] Testar todos os endpoints

---

## 🐛 Tratamento de Erros

Sempre verifique o campo `success` na resposta:

```typescript
const response = await fetch('/roteiros/1');
const result = await response.json();

if (!result.success) {
  // Exibir mensagem de erro ao usuário
  console.error(result.message);
  return;
}

// Processar dados
const roteiro = result.data;
```

---

## 📞 Suporte

Em caso de dúvidas ou problemas, verifique:
1. Se o servidor está rodando
2. Se a URL base está correta
3. Se os dados estão no formato correto
4. Se o produto existe e está ativo (ao criar/atualizar itens)

---

**Última atualização:** Janeiro 2024
