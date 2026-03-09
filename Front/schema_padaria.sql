-- Script SQL para criar o banco de dados do Sistema de Controle de Padaria
-- Compatível com PostgreSQL
-- Todas as tabelas com sufixo "_padaria"
-- Versão atualizada com campos periodo e motorista

-- ============================================
-- CRIAR O BANCO DE DADOS (execute separadamente se necessário)
-- ============================================
-- CREATE DATABASE padaria_db;

-- ============================================
-- CONECTAR AO BANCO DE DADOS
-- ============================================
-- \c padaria_db;

-- ============================================
-- TABELAS
-- ============================================

-- Tabela: produtos_padaria
CREATE TABLE IF NOT EXISTS produtos_padaria (
    id SERIAL PRIMARY KEY,
    nome VARCHAR(255) NOT NULL,
    descricao TEXT,
    preco DECIMAL(10, 2) NOT NULL CHECK (preco > 0),
    ativo BOOLEAN DEFAULT true,
    criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabela: vendas_padaria
CREATE TABLE IF NOT EXISTS vendas_padaria (
    id SERIAL PRIMARY KEY,
    valor_total DECIMAL(10, 2) NOT NULL,
    data_venda DATE NOT NULL DEFAULT CURRENT_DATE,
    forma_pagamento VARCHAR(50) NOT NULL,
    nome_cliente VARCHAR(255),
    criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabela: venda_itens_padaria
CREATE TABLE IF NOT EXISTS venda_itens_padaria (
    id SERIAL PRIMARY KEY,
    venda_id INTEGER NOT NULL REFERENCES vendas_padaria(id) ON DELETE CASCADE,
    produto_id INTEGER NOT NULL REFERENCES produtos_padaria(id),
    quantidade INTEGER NOT NULL CHECK (quantidade > 0),
    preco_unitario DECIMAL(10, 2) NOT NULL,
    subtotal DECIMAL(10, 2) NOT NULL,
    criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabela: roteiros_padaria
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
    atualizado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabela: roteiro_itens_padaria
CREATE TABLE IF NOT EXISTS roteiro_itens_padaria (
    id SERIAL PRIMARY KEY,
    roteiro_id INTEGER NOT NULL REFERENCES roteiros_padaria(id) ON DELETE CASCADE,
    produto_id INTEGER NOT NULL REFERENCES produtos_padaria(id),
    quantidade INTEGER NOT NULL CHECK (quantidade > 0),
    observacao TEXT,
    criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- ÍNDICES PARA MELHORAR PERFORMANCE
-- ============================================

CREATE INDEX IF NOT EXISTS idx_produtos_padaria_ativo ON produtos_padaria(ativo);
CREATE INDEX IF NOT EXISTS idx_vendas_padaria_data_venda ON vendas_padaria(data_venda);
CREATE INDEX IF NOT EXISTS idx_venda_itens_padaria_venda_id ON venda_itens_padaria(venda_id);
CREATE INDEX IF NOT EXISTS idx_venda_itens_padaria_produto_id ON venda_itens_padaria(produto_id);
CREATE INDEX IF NOT EXISTS idx_roteiros_padaria_data_producao ON roteiros_padaria(data_producao);
CREATE INDEX IF NOT EXISTS idx_roteiros_padaria_status ON roteiros_padaria(status);
CREATE INDEX IF NOT EXISTS idx_roteiros_padaria_periodo ON roteiros_padaria(periodo);
CREATE INDEX IF NOT EXISTS idx_roteiros_padaria_motorista ON roteiros_padaria(motorista);
CREATE INDEX IF NOT EXISTS idx_roteiro_itens_padaria_roteiro_id ON roteiro_itens_padaria(roteiro_id);
CREATE INDEX IF NOT EXISTS idx_roteiro_itens_padaria_produto_id ON roteiro_itens_padaria(produto_id);

-- ============================================
-- FUNÇÃO E TRIGGER PARA ATUALIZAR updated_at
-- ============================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.atualizado_em = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS update_roteiros_padaria_updated_at ON roteiros_padaria;
CREATE TRIGGER update_roteiros_padaria_updated_at
    BEFORE UPDATE ON roteiros_padaria
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- COMENTÁRIOS (OPCIONAL - ajuda na documentação)
-- ============================================

COMMENT ON TABLE produtos_padaria IS 'Tabela de produtos da padaria';
COMMENT ON TABLE vendas_padaria IS 'Tabela de vendas realizadas';
COMMENT ON TABLE venda_itens_padaria IS 'Itens de cada venda';
COMMENT ON TABLE roteiros_padaria IS 'Roteiros de produção (podem ser de produção geral ou de motoristas)';
COMMENT ON TABLE roteiro_itens_padaria IS 'Itens de cada roteiro de produção';

COMMENT ON COLUMN roteiros_padaria.periodo IS 'Período do roteiro: manha, tarde, noite';
COMMENT ON COLUMN roteiros_padaria.motorista IS 'Nome do motorista responsável (para roteiros de motoristas)';
COMMENT ON COLUMN roteiro_itens_padaria.observacao IS 'Observação do item (pode conter nome da empresa/cliente para roteiros consolidados)';

