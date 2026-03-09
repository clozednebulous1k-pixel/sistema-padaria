-- Tabela de recheios (como massas_padaria) e coluna recheio em produtos_padaria
-- Execute conectado no banco db_padaria_belfort

CREATE TABLE IF NOT EXISTS recheios_padaria (
    id SERIAL PRIMARY KEY,
    nome VARCHAR(255) NOT NULL UNIQUE,
    ordem INTEGER DEFAULT 0,
    criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    deletado_em TIMESTAMP NULL
);

ALTER TABLE produtos_padaria ADD COLUMN IF NOT EXISTS recheio VARCHAR(100) NULL;
COMMENT ON COLUMN produtos_padaria.recheio IS 'Recheio do produto (ex.: Requeijão, Geleia)';

CREATE INDEX IF NOT EXISTS idx_recheios_padaria_deletado ON recheios_padaria(deletado_em);
