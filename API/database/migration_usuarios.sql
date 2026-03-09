-- Migration para criar tabela de usuários
-- Execute este script se o banco já existir

-- Tabela: usuarios_padaria
CREATE TABLE IF NOT EXISTS usuarios_padaria (
    id SERIAL PRIMARY KEY,
    nome VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL UNIQUE,
    senha VARCHAR(255) NOT NULL,
    ativo BOOLEAN DEFAULT true,
    criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    atualizado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_usuarios_padaria_email ON usuarios_padaria(email);
CREATE INDEX IF NOT EXISTS idx_usuarios_padaria_ativo ON usuarios_padaria(ativo);

-- Trigger para atualizar updated_at
DROP TRIGGER IF EXISTS update_usuarios_padaria_updated_at ON usuarios_padaria;
CREATE TRIGGER update_usuarios_padaria_updated_at
    BEFORE UPDATE ON usuarios_padaria
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Comentários
COMMENT ON TABLE usuarios_padaria IS 'Tabela de usuários do sistema (login e autenticação)';
COMMENT ON COLUMN usuarios_padaria.senha IS 'Senha criptografada (hash) do usuário';
COMMENT ON COLUMN usuarios_padaria.ativo IS 'Indica se o usuário está ativo e pode fazer login';

-- IMPORTANTE: O usuário administrador padrão deve ser criado via API ou manualmente
-- Execute: node -e "require('./src/utils/generateHash.js')('admin123').then(console.log)"
-- para gerar o hash da senha, ou use a API POST /auth/registro para criar o primeiro usuário

-- Exemplo de hash para senha 'admin123' (gere seu próprio hash):
-- $2b$10$rQ8K8K8K8K8K8K8K8K8K.8K8K8K8K8K8K8K8K8K8K8K8K8K8K8K

-- Para criar usuário via SQL (substitua o hash pela saída do generateHash):
-- INSERT INTO usuarios_padaria (nome, email, senha, ativo)
-- VALUES (
--     'Administrador',
--     'admin@padaria.com',
--     'HASH_GERADO_AQUI',
--     true
-- ) ON CONFLICT (email) DO NOTHING;

