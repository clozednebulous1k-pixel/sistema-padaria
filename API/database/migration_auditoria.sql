-- Migration para adicionar campo is_admin e criar tabela de auditoria
-- Execute este script no banco de dados

-- 1. Adicionar campo is_admin na tabela usuarios_padaria
ALTER TABLE usuarios_padaria 
ADD COLUMN IF NOT EXISTS is_admin BOOLEAN DEFAULT false;

-- 2. Criar tabela de auditoria
CREATE TABLE IF NOT EXISTS auditoria_padaria (
    id SERIAL PRIMARY KEY,
    usuario_id INTEGER NOT NULL,
    usuario_nome VARCHAR(255) NOT NULL,
    usuario_email VARCHAR(255) NOT NULL,
    acao VARCHAR(100) NOT NULL,
    entidade VARCHAR(100) NOT NULL,
    entidade_id INTEGER,
    descricao TEXT,
    dados_anteriores JSONB,
    dados_novos JSONB,
    ip_address VARCHAR(45),
    user_agent TEXT,
    criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_auditoria_usuario FOREIGN KEY (usuario_id) REFERENCES usuarios_padaria(id) ON DELETE CASCADE
);

-- 3. Criar índices para melhorar performance
CREATE INDEX IF NOT EXISTS idx_auditoria_padaria_usuario_id ON auditoria_padaria(usuario_id);
CREATE INDEX IF NOT EXISTS idx_auditoria_padaria_acao ON auditoria_padaria(acao);
CREATE INDEX IF NOT EXISTS idx_auditoria_padaria_entidade ON auditoria_padaria(entidade);
CREATE INDEX IF NOT EXISTS idx_auditoria_padaria_criado_em ON auditoria_padaria(criado_em DESC);
CREATE INDEX IF NOT EXISTS idx_auditoria_padaria_entidade_id ON auditoria_padaria(entidade_id);

-- 4. Comentários
COMMENT ON TABLE auditoria_padaria IS 'Tabela de auditoria para registrar todas as ações dos usuários no sistema';
COMMENT ON COLUMN auditoria_padaria.usuario_id IS 'ID do usuário que realizou a ação';
COMMENT ON COLUMN auditoria_padaria.acao IS 'Tipo de ação: CREATE, UPDATE, DELETE, LOGIN, LOGOUT, VIEW, etc.';
COMMENT ON COLUMN auditoria_padaria.entidade IS 'Entidade afetada: produto, roteiro, motorista, empresa, usuario, etc.';
COMMENT ON COLUMN auditoria_padaria.entidade_id IS 'ID da entidade afetada (se aplicável)';
COMMENT ON COLUMN auditoria_padaria.descricao IS 'Descrição detalhada da ação';
COMMENT ON COLUMN auditoria_padaria.dados_anteriores IS 'Dados anteriores (para UPDATE) em formato JSON';
COMMENT ON COLUMN auditoria_padaria.dados_novos IS 'Dados novos (para CREATE/UPDATE) em formato JSON';
COMMENT ON COLUMN usuarios_padaria.is_admin IS 'Indica se o usuário é administrador do sistema';

-- 5. Atualizar o primeiro usuário (admin) para ser administrador
-- IMPORTANTE: Execute manualmente ou via API após criar o primeiro usuário
-- UPDATE usuarios_padaria SET is_admin = true WHERE email = 'admin@padaria.com' LIMIT 1;

