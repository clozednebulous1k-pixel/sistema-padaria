-- Migrations para Render Postgres / Neon (rodar na ordem ou este arquivo completo)
-- Não contém GRANT para usuário específico (funciona com o usuário do Render/Neon)

-- 1) Função e tabelas base (baseado em 02_criar_tabelas.sql, sem GRANT)
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.atualizado_em = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TABLE IF NOT EXISTS produtos_padaria (
    id SERIAL PRIMARY KEY,
    nome VARCHAR(255) NOT NULL,
    descricao TEXT,
    preco DECIMAL(10, 2) NOT NULL CHECK (preco >= 0),
    ativo BOOLEAN DEFAULT true,
    tipo_massa VARCHAR(100),
    criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    deletado_em TIMESTAMP NULL
);

CREATE TABLE IF NOT EXISTS vendas_padaria (
    id SERIAL PRIMARY KEY,
    valor_total DECIMAL(10, 2) NOT NULL,
    data_venda DATE NOT NULL DEFAULT CURRENT_DATE,
    forma_pagamento VARCHAR(50) NOT NULL,
    nome_cliente VARCHAR(255),
    criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS venda_itens_padaria (
    id SERIAL PRIMARY KEY,
    venda_id INTEGER NOT NULL REFERENCES vendas_padaria(id) ON DELETE CASCADE,
    produto_id INTEGER NOT NULL REFERENCES produtos_padaria(id),
    quantidade INTEGER NOT NULL CHECK (quantidade > 0),
    preco_unitario DECIMAL(10, 2) NOT NULL,
    subtotal DECIMAL(10, 2) NOT NULL,
    criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS roteiros_padaria (
    id SERIAL PRIMARY KEY,
    nome_empresa VARCHAR(255) NOT NULL,
    data_producao DATE NOT NULL,
    periodo VARCHAR(50),
    motorista VARCHAR(255),
    observacoes TEXT,
    status VARCHAR(50) NOT NULL DEFAULT 'pendente'
        CHECK (status IN ('pendente', 'em_producao', 'concluido', 'cancelado')),
    venda_id INTEGER REFERENCES vendas_padaria(id) ON DELETE SET NULL,
    criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    atualizado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    deletado_em TIMESTAMP NULL
);

CREATE TABLE IF NOT EXISTS roteiro_itens_padaria (
    id SERIAL PRIMARY KEY,
    roteiro_id INTEGER NOT NULL REFERENCES roteiros_padaria(id) ON DELETE CASCADE,
    produto_id INTEGER NOT NULL REFERENCES produtos_padaria(id),
    quantidade INTEGER NOT NULL CHECK (quantidade > 0),
    observacao TEXT,
    criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS empresas_padaria (
    id SERIAL PRIMARY KEY,
    nome VARCHAR(255) NOT NULL UNIQUE,
    criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    deletado_em TIMESTAMP NULL
);

CREATE TABLE IF NOT EXISTS motoristas_padaria (
    id SERIAL PRIMARY KEY,
    nome VARCHAR(255) NOT NULL UNIQUE,
    periodo VARCHAR(50) NOT NULL CHECK (periodo IN ('matutino', 'noturno')),
    criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    deletado_em TIMESTAMP NULL
);

CREATE TABLE IF NOT EXISTS massas_padaria (
    id SERIAL PRIMARY KEY,
    nome VARCHAR(255) NOT NULL UNIQUE,
    ordem INTEGER DEFAULT 0,
    criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    deletado_em TIMESTAMP NULL
);

CREATE TABLE IF NOT EXISTS usuarios_padaria (
    id SERIAL PRIMARY KEY,
    nome VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL UNIQUE,
    senha VARCHAR(255) NOT NULL,
    ativo BOOLEAN DEFAULT true,
    is_admin BOOLEAN DEFAULT false,
    criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    atualizado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS auditoria_padaria (
    id SERIAL PRIMARY KEY,
    usuario_id INTEGER,
    usuario_nome VARCHAR(255),
    usuario_email VARCHAR(255),
    acao VARCHAR(100) NOT NULL,
    entidade VARCHAR(100),
    entidade_id INTEGER,
    descricao TEXT,
    dados_antigos JSONB,
    dados_novos JSONB,
    user_agent TEXT,
    criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

ALTER TABLE produtos_padaria ADD COLUMN IF NOT EXISTS deletado_em TIMESTAMP NULL;
ALTER TABLE produtos_padaria ADD COLUMN IF NOT EXISTS tipo_massa VARCHAR(100);
ALTER TABLE empresas_padaria ADD COLUMN IF NOT EXISTS deletado_em TIMESTAMP NULL;
ALTER TABLE motoristas_padaria ADD COLUMN IF NOT EXISTS deletado_em TIMESTAMP NULL;
ALTER TABLE roteiros_padaria ADD COLUMN IF NOT EXISTS deletado_em TIMESTAMP NULL;
ALTER TABLE roteiros_padaria ADD COLUMN IF NOT EXISTS observacoes TEXT;
ALTER TABLE usuarios_padaria ADD COLUMN IF NOT EXISTS is_admin BOOLEAN DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_produtos_padaria_deletado ON produtos_padaria(deletado_em);
CREATE INDEX IF NOT EXISTS idx_empresas_padaria_deletado ON empresas_padaria(deletado_em);
CREATE INDEX IF NOT EXISTS idx_motoristas_padaria_deletado ON motoristas_padaria(deletado_em);
CREATE INDEX IF NOT EXISTS idx_roteiros_padaria_deletado ON roteiros_padaria(deletado_em);

DROP TRIGGER IF EXISTS update_roteiros_padaria_updated_at ON roteiros_padaria;
CREATE TRIGGER update_roteiros_padaria_updated_at
    BEFORE UPDATE ON roteiros_padaria
    FOR EACH ROW
    EXECUTE PROCEDURE update_updated_at_column();

-- 2) Recheios
CREATE TABLE IF NOT EXISTS recheios_padaria (
    id SERIAL PRIMARY KEY,
    nome VARCHAR(255) NOT NULL UNIQUE,
    ordem INTEGER DEFAULT 0,
    criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    deletado_em TIMESTAMP NULL
);
ALTER TABLE produtos_padaria ADD COLUMN IF NOT EXISTS recheio VARCHAR(100) NULL;
CREATE INDEX IF NOT EXISTS idx_recheios_padaria_deletado ON recheios_padaria(deletado_em);

-- 3) Opções de relatório
CREATE TABLE IF NOT EXISTS opcoes_relatorio_padaria (
    id SERIAL PRIMARY KEY,
    nome VARCHAR(255) NOT NULL UNIQUE,
    ordem INTEGER DEFAULT 0,
    criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    deletado_em TIMESTAMP NULL
);
CREATE INDEX IF NOT EXISTS idx_opcoes_relatorio_padaria_deletado ON opcoes_relatorio_padaria(deletado_em);

-- 4) Coluna opcao_relatorio em produtos
ALTER TABLE produtos_padaria ADD COLUMN IF NOT EXISTS opcao_relatorio VARCHAR(50) NULL;
