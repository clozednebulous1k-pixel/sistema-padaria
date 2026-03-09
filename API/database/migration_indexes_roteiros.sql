-- Índices para boa performance com muitos roteiros e itens (centenas/milhares)
-- Execute este script no banco para listagem e filtros rápidos.

-- Roteiros: busca por data e nome_empresa (tela de roteiros por dia/semana)
CREATE INDEX IF NOT EXISTS idx_roteiros_padaria_data_deletado
  ON roteiros_padaria (data_producao, deletado_em)
  WHERE deletado_em IS NULL;

CREATE INDEX IF NOT EXISTS idx_roteiros_padaria_nome_empresa
  ON roteiros_padaria (nome_empresa)
  WHERE deletado_em IS NULL;

-- Itens de roteiro: busca por roteiro_id (carregar itens ao abrir roteiro)
CREATE INDEX IF NOT EXISTS idx_roteiro_itens_padaria_roteiro_id
  ON roteiro_itens_padaria (roteiro_id);

-- Opcional: listagem de roteiros ordenada por data
CREATE INDEX IF NOT EXISTS idx_roteiros_padaria_data_criado
  ON roteiros_padaria (data_producao DESC, criado_em DESC)
  WHERE deletado_em IS NULL;
