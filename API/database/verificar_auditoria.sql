-- Script para verificar se a tabela de auditoria existe
-- Execute este script no PostgreSQL

-- Verificar se a tabela existe
SELECT EXISTS (
    SELECT FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = 'auditoria_padaria'
) as tabela_existe;

-- Se a tabela existir, mostrar estrutura
SELECT 
    column_name, 
    data_type, 
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_name = 'auditoria_padaria'
ORDER BY ordinal_position;

-- Contar registros (se a tabela existir)
SELECT COUNT(*) as total_registros 
FROM auditoria_padaria;

