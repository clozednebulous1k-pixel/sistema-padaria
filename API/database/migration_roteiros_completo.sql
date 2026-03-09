-- ============================================
-- Migração: Garantir que roteiros_padaria tenha todos os campos necessários
-- Execute este script se o banco já existir (criado por versão antiga)
-- Compatível com PostgreSQL 10+
-- ============================================

-- 1) Campo observacoes (nome personalizado do roteiro, ex: "Lote 1", "Manhã")
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'roteiros_padaria' 
        AND column_name = 'observacoes'
    ) THEN
        ALTER TABLE roteiros_padaria ADD COLUMN observacoes TEXT;
        COMMENT ON COLUMN roteiros_padaria.observacoes IS 'Nome ou observação do roteiro (ex: Lote 1, Manhã)';
    END IF;
END $$;

-- 2) Campo motorista (roteiros de motoristas)
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'roteiros_padaria' 
        AND column_name = 'motorista'
    ) THEN
        ALTER TABLE roteiros_padaria ADD COLUMN motorista VARCHAR(255);
        COMMENT ON COLUMN roteiros_padaria.motorista IS 'Nome do motorista responsável pelo roteiro';
    END IF;
END $$;

-- 3) Campo periodo (manha, noite)
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'roteiros_padaria' 
        AND column_name = 'periodo'
    ) THEN
        ALTER TABLE roteiros_padaria ADD COLUMN periodo VARCHAR(50);
        COMMENT ON COLUMN roteiros_padaria.periodo IS 'Período do roteiro (ex: manha, noite)';
    END IF;
END $$;

-- 4) Índices para performance
CREATE INDEX IF NOT EXISTS idx_roteiros_padaria_data_producao ON roteiros_padaria(data_producao);
CREATE INDEX IF NOT EXISTS idx_roteiros_padaria_status ON roteiros_padaria(status);
CREATE INDEX IF NOT EXISTS idx_roteiros_padaria_periodo ON roteiros_padaria(periodo);
CREATE INDEX IF NOT EXISTS idx_roteiros_padaria_motorista ON roteiros_padaria(motorista);
CREATE INDEX IF NOT EXISTS idx_roteiros_padaria_nome_empresa ON roteiros_padaria(nome_empresa);

-- 5) Garantir que roteiro_itens_padaria tenha observacao (empresa por item)
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'roteiro_itens_padaria' 
        AND column_name = 'observacao'
    ) THEN
        ALTER TABLE roteiro_itens_padaria ADD COLUMN observacao TEXT;
        COMMENT ON COLUMN roteiro_itens_padaria.observacao IS 'Nome da empresa/cliente para o item';
    END IF;
END $$;

-- Verificação final (opcional - mostra as colunas da tabela)
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'roteiros_padaria'
ORDER BY ordinal_position;
