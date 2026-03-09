-- Script de verificação e criação das tabelas empresas_padaria e motoristas_padaria
-- Execute este script se as tabelas ainda não existirem no seu banco de dados

-- Verificar e criar tabela empresas_padaria
CREATE TABLE IF NOT EXISTS empresas_padaria (
    id SERIAL PRIMARY KEY,
    nome VARCHAR(255) NOT NULL UNIQUE,
    criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Verificar e criar tabela motoristas_padaria
CREATE TABLE IF NOT EXISTS motoristas_padaria (
    id SERIAL PRIMARY KEY,
    nome VARCHAR(255) NOT NULL UNIQUE,
    periodo VARCHAR(50) NOT NULL CHECK (periodo IN ('matutino', 'noturno')),
    criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Verificar se o campo observacao existe na tabela roteiro_itens_padaria
-- Se não existir, adicionar (mas provavelmente já existe)
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'roteiro_itens_padaria' 
        AND column_name = 'observacao'
    ) THEN
        ALTER TABLE roteiro_itens_padaria 
        ADD COLUMN observacao TEXT;
        
        COMMENT ON COLUMN roteiro_itens_padaria.observacao IS 
            'Observação do item (pode conter nome da empresa/cliente para roteiros consolidados)';
    END IF;
END $$;

-- Criar índices se não existirem
CREATE INDEX IF NOT EXISTS idx_empresas_padaria_nome ON empresas_padaria(nome);
CREATE INDEX IF NOT EXISTS idx_motoristas_padaria_nome ON motoristas_padaria(nome);
CREATE INDEX IF NOT EXISTS idx_motoristas_padaria_periodo ON motoristas_padaria(periodo);

-- Adicionar comentários nas tabelas (opcional)
COMMENT ON TABLE empresas_padaria IS 'Tabela de empresas/clientes cadastradas';
COMMENT ON TABLE motoristas_padaria IS 'Tabela de motoristas cadastrados';

-- Verificar se as tabelas foram criadas corretamente
SELECT 
    'empresas_padaria' as tabela,
    CASE WHEN EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_name = 'empresas_padaria'
    ) THEN '✓ Existe' ELSE '✗ Não existe' END as status
UNION ALL
SELECT 
    'motoristas_padaria' as tabela,
    CASE WHEN EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_name = 'motoristas_padaria'
    ) THEN '✓ Existe' ELSE '✗ Não existe' END as status;

