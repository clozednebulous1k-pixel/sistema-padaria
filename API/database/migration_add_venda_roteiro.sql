-- Migração: Adicionar relacionamento entre Vendas e Roteiros
-- Execute este script se já tiver o banco criado

-- Adicionar campo nome_cliente na tabela vendas (opcional)
ALTER TABLE vendas 
ADD COLUMN IF NOT EXISTS nome_cliente VARCHAR(255);

-- Adicionar campo venda_id na tabela roteiros (para relacionar com a venda que gerou o roteiro)
ALTER TABLE roteiros 
ADD COLUMN IF NOT EXISTS venda_id INTEGER REFERENCES vendas(id) ON DELETE SET NULL;

-- Criar índice para melhor performance
CREATE INDEX IF NOT EXISTS idx_roteiros_venda_id ON roteiros(venda_id);
