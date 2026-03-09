-- Adiciona coluna opcao_relatorio em produtos_padaria para relatórios (COM MARG, SEM MARG, EMBALADO)
ALTER TABLE produtos_padaria ADD COLUMN IF NOT EXISTS opcao_relatorio VARCHAR(50) NULL;

COMMENT ON COLUMN produtos_padaria.opcao_relatorio IS 'Opção para relatório: COM MARG, SEM MARG ou EMBALADO';
