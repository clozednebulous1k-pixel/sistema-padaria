# Como aplicar a migração dos roteiros

Se o banco já existia antes das alterações (vários roteiros por dia, nome do roteiro, período, motorista), execute a migração para garantir que a tabela `roteiros_padaria` tenha todas as colunas necessárias.

## Opção 1: Pelo terminal (psql)

```bash
# Windows (PowerShell) - ajuste o usuário e nome do banco conforme seu .env
psql -U postgres -d padaria_db -f database/migration_roteiros_completo.sql

# Ou se o PostgreSQL está em outro host/porta:
psql -h localhost -p 5432 -U postgres -d padaria_db -f database/migration_roteiros_completo.sql
```

## Opção 2: Pelo HeidiSQL (ou outro cliente)

1. Conecte ao banco de dados.
2. Abra o arquivo `API/database/migration_roteiros_completo.sql`.
3. Execute o script inteiro (F9 ou botão Executar).

## O que a migração faz

- Adiciona a coluna **observacoes** (se não existir) — usada para o nome personalizado do roteiro (ex: "Lote 1", "Manhã").
- Adiciona a coluna **motorista** (se não existir) — para roteiros de motoristas.
- Adiciona a coluna **periodo** (se não existir) — manha/noite.
- Adiciona a coluna **observacao** na tabela **roteiro_itens_padaria** (se não existir) — empresa/cliente por item.
- Cria índices para melhorar consultas por data, status, período e motorista.

Se a coluna já existir, o script não altera nada (usa `IF NOT EXISTS`). Pode rodar mais de uma vez sem problema.

## Banco novo

Se estiver criando o banco do zero, use o `schema.sql` completo; não é obrigatório rodar esta migração.
