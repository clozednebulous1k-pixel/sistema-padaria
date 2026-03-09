-- Migração: Adicionar campos motorista e periodo na tabela roteiros
-- Execute este script se já tiver o banco criado

-- Adicionar campo motorista na tabela roteiros
ALTER TABLE roteiros 
ADD COLUMN IF NOT EXISTS motorista VARCHAR(255);

-- Adicionar campo periodo na tabela roteiros (ex: 'matutino', 'noturno')
ALTER TABLE roteiros 
ADD COLUMN IF NOT EXISTS periodo VARCHAR(50);

-- Criar índice para melhor performance em consultas por motorista
CREATE INDEX IF NOT EXISTS idx_roteiros_motorista ON roteiros(motorista);

-- Criar índice para melhor performance em consultas por periodo
CREATE INDEX IF NOT EXISTS idx_roteiros_periodo ON roteiros(periodo);

-- Comentários
COMMENT ON COLUMN roteiros.motorista IS 'Nome do motorista responsável pelo roteiro';
COMMENT ON COLUMN roteiros.periodo IS 'Período do roteiro (ex: matutino, noturno)';
COMMENT ON COLUMN roteiro_itens.observacao IS 'Nome da empresa/cliente que receberá o item';

