-- Migração: Verificar e adicionar campos motorista e periodo na tabela roteiros_padaria
-- Execute este script se já tiver o banco criado e quiser garantir que os campos existam

-- Verificar e adicionar campo motorista na tabela roteiros_padaria
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'roteiros_padaria' 
        AND column_name = 'motorista'
    ) THEN
        ALTER TABLE roteiros_padaria 
        ADD COLUMN motorista VARCHAR(255);
        
        COMMENT ON COLUMN roteiros_padaria.motorista IS 'Nome do motorista responsável pelo roteiro';
    END IF;
END $$;

-- Verificar e adicionar campo periodo na tabela roteiros_padaria
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'roteiros_padaria' 
        AND column_name = 'periodo'
    ) THEN
        ALTER TABLE roteiros_padaria 
        ADD COLUMN periodo VARCHAR(50);
        
        COMMENT ON COLUMN roteiros_padaria.periodo IS 'Período do roteiro (ex: manha, noite)';
    END IF;
END $$;

-- Criar índices se não existirem (usando IF NOT EXISTS)
CREATE INDEX IF NOT EXISTS idx_roteiros_padaria_motorista ON roteiros_padaria(motorista);
CREATE INDEX IF NOT EXISTS idx_roteiros_padaria_periodo ON roteiros_padaria(periodo);
CREATE INDEX IF NOT EXISTS idx_roteiros_padaria_data_producao ON roteiros_padaria(data_producao);

-- Verificar se os campos foram criados corretamente
SELECT 
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns
WHERE table_name = 'roteiros_padaria'
    AND column_name IN ('motorista', 'periodo', 'data_producao')
ORDER BY column_name;

-- Verificar se os índices foram criados
SELECT 
    indexname,
    indexdef
FROM pg_indexes
WHERE tablename = 'roteiros_padaria'
    AND indexname IN ('idx_roteiros_padaria_motorista', 'idx_roteiros_padaria_periodo', 'idx_roteiros_padaria_data_producao')
ORDER BY indexname;
