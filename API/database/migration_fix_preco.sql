-- Script de migração para corrigir a constraint de preço
-- Permite que produtos tenham preço 0 (necessário após remoção do campo de preço do frontend)

-- Remover a constraint antiga
ALTER TABLE produtos_padaria DROP CONSTRAINT IF EXISTS produtos_padaria_preco_check;

-- Adicionar nova constraint que permite preço >= 0
ALTER TABLE produtos_padaria ADD CONSTRAINT produtos_padaria_preco_check CHECK (preco >= 0);

