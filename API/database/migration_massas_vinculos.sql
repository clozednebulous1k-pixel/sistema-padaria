-- Migração: Tabela de massas (tipos apenas) + campo tipo_massa no produto
-- Massa é para identificação do produto - sem tabela de vínculos

-- Remover tabelas antigas se existirem (da versão anterior com vínculos)
DROP TABLE IF EXISTS vinculos_produto_massa_padaria;
DROP TABLE IF EXISTS tipos_massa_padaria;

-- Tabela: massas_padaria (apenas tipos de massa)
CREATE TABLE IF NOT EXISTS massas_padaria (
    id SERIAL PRIMARY KEY,
    nome VARCHAR(255) NOT NULL UNIQUE,
    ordem INTEGER DEFAULT 0,
    criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_massas_padaria_ordem ON massas_padaria(ordem);

-- Adicionar tipo_massa no produto (identificação)
ALTER TABLE produtos_padaria
ADD COLUMN IF NOT EXISTS tipo_massa VARCHAR(255);

-- Inserir tipos padrão se a tabela estiver vazia
INSERT INTO massas_padaria (nome, ordem)
SELECT t.nome, t.ordem FROM (VALUES
    ('Massa Salgada', 1),
    ('Massa Doce', 2),
    ('Massa Integral', 3),
    ('Massa Especial', 4)
) AS t(nome, ordem)
WHERE NOT EXISTS (SELECT 1 FROM massas_padaria);
