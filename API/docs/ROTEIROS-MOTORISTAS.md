# 🚚 Roteiros de Motoristas - Documentação

Documentação completa sobre como criar e gerenciar roteiros de motoristas no sistema.

## 📋 Visão Geral

Os roteiros de motoristas são uma extensão dos roteiros de produção, permitindo associar um motorista específico e um período (matutino/noturno) a cada roteiro. O campo `observacao` nos itens do roteiro armazena o nome da empresa/cliente que receberá cada item.

## 🗄️ Estrutura no Banco de Dados

### Tabela: `roteiros`

| Campo | Tipo | Descrição |
|-------|------|-----------|
| `id` | SERIAL | ID único do roteiro |
| `nome_empresa` | VARCHAR(255) | Nome da empresa/cliente ou nome do motorista |
| `motorista` | VARCHAR(255) | Nome do motorista responsável (opcional) |
| `data_producao` | DATE | Data do roteiro |
| `periodo` | VARCHAR(50) | Período (ex: "matutino", "noturno") - opcional |
| `status` | VARCHAR(50) | Status: 'pendente', 'em_producao', 'concluido', 'cancelado' |
| `observacoes` | TEXT | Observações gerais do roteiro |
| `venda_id` | INTEGER | ID da venda relacionada (se aplicável) |

### Tabela: `roteiro_itens`

| Campo | Tipo | Descrição |
|-------|------|-----------|
| `id` | SERIAL | ID único do item |
| `roteiro_id` | INTEGER | ID do roteiro |
| `produto_id` | INTEGER | ID do produto |
| `quantidade` | INTEGER | Quantidade a produzir/entregar |
| `observacao` | TEXT | **Nome da empresa/cliente que receberá este item** |

## 🚀 Uso da API

### Criar Roteiro de Motorista

**POST** `/roteiros`

```json
{
  "nome_empresa": "Gabriel",
  "motorista": "Gabriel",
  "data_producao": "2025-01-10",
  "periodo": "matutino",
  "status": "pendente",
  "observacoes": null,
  "itens": [
    {
      "produto_id": 1,
      "quantidade": 50,
      "observacao": "Empresa A"
    },
    {
      "produto_id": 2,
      "quantidade": 30,
      "observacao": "Empresa B"
    },
    {
      "produto_id": 1,
      "quantidade": 25,
      "observacao": "Empresa C"
    }
  ]
}
```

### Listar Roteiros com Filtros

**GET** `/roteiros?motorista=Gabriel&periodo=matutino&status=pendente`

Parâmetros de query disponíveis:
- `motorista` - Filtrar por nome do motorista
- `periodo` - Filtrar por período (matutino, noturno, etc.)
- `status` - Filtrar por status
- `data_producao` - Filtrar por data específica
- `data_inicio` e `data_fim` - Filtrar por intervalo de datas

### Atualizar Roteiro

**PUT** `/roteiros/:id`

```json
{
  "motorista": "Gabriel",
  "periodo": "noturno",
  "status": "em_producao"
}
```

## 💾 Exemplos SQL (HeidiSQL)

### Inserir Roteiro de Motorista Manualmente

```sql
-- 1. Inserir o roteiro do motorista
INSERT INTO roteiros (
    nome_empresa,
    data_producao,
    periodo,
    motorista,
    status,
    observacoes
) VALUES (
    'Gabriel',                    -- nome_empresa = nome do motorista
    '2025-01-10',                 -- data do roteiro
    'matutino',                   -- periodo (pode ser NULL ou 'matutino'/'noturno')
    'Gabriel',                    -- motorista = nome do motorista
    'pendente',                   -- status
    NULL                          -- observacoes
);

-- 2. Inserir os itens do roteiro
-- (você precisa do ID do roteiro criado acima e dos IDs dos produtos)
INSERT INTO roteiro_itens (
    roteiro_id,
    produto_id,
    quantidade,
    observacao
) VALUES 
    (1, 1, 50, 'Empresa A'),      -- roteiro_id=1, produto_id=1, quantidade=50, empresa na observacao
    (1, 2, 30, 'Empresa B'),      -- roteiro_id=1, produto_id=2, quantidade=30
    (1, 1, 25, 'Empresa C');      -- roteiro_id=1, produto_id=1, quantidade=25
```

### Consultar Roteiros de Motoristas

```sql
-- Ver todos os roteiros de motoristas
SELECT 
    r.id,
    r.nome_empresa,
    r.motorista,
    r.data_producao,
    r.periodo,
    r.status,
    COUNT(ri.id) as total_itens
FROM roteiros r
LEFT JOIN roteiro_itens ri ON r.id = ri.roteiro_id
WHERE r.motorista IS NOT NULL
GROUP BY r.id, r.nome_empresa, r.motorista, r.data_producao, r.periodo, r.status
ORDER BY r.data_producao DESC, r.motorista;
```

### Ver Itens de um Roteiro com Empresas

```sql
-- Ver itens de um roteiro específico com nome das empresas
SELECT 
    ri.id,
    p.nome as produto,
    ri.quantidade,
    ri.observacao as empresa_cliente
FROM roteiro_itens ri
INNER JOIN produtos p ON ri.produto_id = p.id
WHERE ri.roteiro_id = 1  -- substitua pelo ID do roteiro
ORDER BY ri.observacao, p.nome;
```

## 📝 Notas Importantes

1. **Campo `observacao` em `roteiro_itens`**: Este campo armazena o nome da empresa/cliente que receberá cada item específico. Use este campo para identificar para onde cada produto será entregue.

2. **Campo `motorista`**: Quando preenchido, indica que este é um roteiro de motorista. O campo `nome_empresa` pode ser igual ao `motorista` ou pode ser diferente.

3. **Campo `periodo`**: Use para identificar o turno (ex: "matutino", "noturno", "vespertino"). É opcional.

4. **Filtros**: Você pode filtrar roteiros por motorista, período, status e data usando os parâmetros de query na API.

5. **Migração**: Se você já tem o banco de dados criado, execute o arquivo `database/migration_add_motorista_periodo.sql` para adicionar os campos `motorista` e `periodo`.

## 🔄 Migração do Banco de Dados

Se você já tem o banco de dados criado, execute:

```sql
-- Execute o arquivo database/migration_add_motorista_periodo.sql
-- Ou execute manualmente:

ALTER TABLE roteiros 
ADD COLUMN IF NOT EXISTS motorista VARCHAR(255);

ALTER TABLE roteiros 
ADD COLUMN IF NOT EXISTS periodo VARCHAR(50);

CREATE INDEX IF NOT EXISTS idx_roteiros_motorista ON roteiros(motorista);
CREATE INDEX IF NOT EXISTS idx_roteiros_periodo ON roteiros(periodo);
```

## ✅ Checklist

- [x] Campos `motorista` e `periodo` adicionados na tabela `roteiros`
- [x] API suporta criar roteiros com motorista e período
- [x] API suporta filtrar por motorista e período
- [x] Campo `observacao` em `roteiro_itens` armazena nome da empresa/cliente
- [x] Documentação completa criada
- [x] Exemplos SQL fornecidos

