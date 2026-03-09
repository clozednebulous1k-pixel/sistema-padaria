-- Tabela para opções de relatório configuráveis pela empresa
-- Execute conectado no banco principal (ex.: db_padaria_belfort)

CREATE TABLE IF NOT EXISTS opcoes_relatorio_padaria (
    id SERIAL PRIMARY KEY,
    nome VARCHAR(255) NOT NULL UNIQUE,
    ordem INTEGER DEFAULT 0,
    criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    deletado_em TIMESTAMP NULL
);

-- Índice para facilitar filtros por deletado_em
CREATE INDEX IF NOT EXISTS idx_opcoes_relatorio_padaria_deletado
    ON opcoes_relatorio_padaria(deletado_em);

