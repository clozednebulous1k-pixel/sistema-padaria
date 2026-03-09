-- Migração: Soft Delete + Lixeira
-- Adiciona coluna deletado_em para exclusão lógica
-- Permite restaurar itens ou excluir permanentemente

-- Produtos
ALTER TABLE produtos_padaria ADD COLUMN IF NOT EXISTS deletado_em TIMESTAMP NULL;
CREATE INDEX IF NOT EXISTS idx_produtos_padaria_deletado ON produtos_padaria(deletado_em);

-- Empresas
ALTER TABLE empresas_padaria ADD COLUMN IF NOT EXISTS deletado_em TIMESTAMP NULL;
CREATE INDEX IF NOT EXISTS idx_empresas_padaria_deletado ON empresas_padaria(deletado_em);

-- Motoristas
ALTER TABLE motoristas_padaria ADD COLUMN IF NOT EXISTS deletado_em TIMESTAMP NULL;
CREATE INDEX IF NOT EXISTS idx_motoristas_padaria_deletado ON motoristas_padaria(deletado_em);

-- Massas
ALTER TABLE massas_padaria ADD COLUMN IF NOT EXISTS deletado_em TIMESTAMP NULL;
CREATE INDEX IF NOT EXISTS idx_massas_padaria_deletado ON massas_padaria(deletado_em);

-- Roteiros (Listas de Produção)
ALTER TABLE roteiros_padaria ADD COLUMN IF NOT EXISTS deletado_em TIMESTAMP NULL;
CREATE INDEX IF NOT EXISTS idx_roteiros_padaria_deletado ON roteiros_padaria(deletado_em);
