-- ============================================
-- SETUP COMPLETO - Banco Padaria Belfort
-- Execute como usuário postgres (administrador)
-- ============================================

-- 1. Criar banco (ignore se já existir)
CREATE DATABASE db_padaria_belfort;

-- 2. Crie o usuário no PostgreSQL e defina a senha no ambiente.
-- Exemplo: CREATE USER padaria_app WITH PASSWORD 'defina_no_ambiente';
-- GRANT ALL PRIVILEGES ON DATABASE db_padaria_belfort TO padaria_app;

-- 3. Conectar ao banco antes de continuar!
-- No psql: \c db_padaria_belfort
-- No pgAdmin: selecione o banco db_padaria_belfort e execute o restante

-- ============================================
-- A PARTIR DAQUI, EXECUTE CONECTADO AO db_padaria_belfort
-- ============================================

-- Conceder permissões no schema
GRANT ALL ON SCHEMA public TO "Alessandro";
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.atualizado_em = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Tabelas principais
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

-- Colunas deletado_em se não existirem
ALTER TABLE produtos_padaria ADD COLUMN IF NOT EXISTS deletado_em TIMESTAMP NULL;
ALTER TABLE empresas_padaria ADD COLUMN IF NOT EXISTS deletado_em TIMESTAMP NULL;
ALTER TABLE motoristas_padaria ADD COLUMN IF NOT EXISTS deletado_em TIMESTAMP NULL;
ALTER TABLE roteiros_padaria ADD COLUMN IF NOT EXISTS deletado_em TIMESTAMP NULL;

-- Coluna tipo_massa em produtos
ALTER TABLE produtos_padaria ADD COLUMN IF NOT EXISTS tipo_massa VARCHAR(100);
ALTER TABLE produtos_padaria ADD COLUMN IF NOT EXISTS deletado_em TIMESTAMP NULL;

-- Coluna is_admin em usuarios
ALTER TABLE usuarios_padaria ADD COLUMN IF NOT EXISTS is_admin BOOLEAN DEFAULT false;

-- Coluna observacoes em roteiros
ALTER TABLE roteiros_padaria ADD COLUMN IF NOT EXISTS observacoes TEXT;

-- Índices
CREATE INDEX IF NOT EXISTS idx_produtos_padaria_deletado ON produtos_padaria(deletado_em);
CREATE INDEX IF NOT EXISTS idx_empresas_padaria_deletado ON empresas_padaria(deletado_em);
CREATE INDEX IF NOT EXISTS idx_motoristas_padaria_deletado ON motoristas_padaria(deletado_em);
CREATE INDEX IF NOT EXISTS idx_roteiros_padaria_deletado ON roteiros_padaria(deletado_em);

-- Trigger roteiros
DROP TRIGGER IF EXISTS update_roteiros_padaria_updated_at ON roteiros_padaria;
CREATE TRIGGER update_roteiros_padaria_updated_at
    BEFORE UPDATE ON roteiros_padaria
    FOR EACH ROW
    EXECUTE PROCEDURE update_updated_at_column();

-- Tabela auditoria (se migration existir)
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

-- Conceder permissões nas novas tabelas
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO "Alessandro";
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO "Alessandro";
