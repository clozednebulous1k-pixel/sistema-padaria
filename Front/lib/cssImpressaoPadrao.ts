/**
 * Estilos base para impressões em janela (tabelas, cabeçalho vinho #550701).
 * Alinhar novas telas de impressão a estes valores para consistência visual.
 */
export const COR_PRIMARIA_IMPRESSAO = '#550701'

/** Bloco CSS comum usado em relatórios e roteiros (fonte ~17px, tabela com bordas). */
export const CSS_IMPRESSAO_TABELA_BASE = `
  body { font-family: Arial, sans-serif; padding: 18px; font-size: 17px; }
  h1 { color: #333; border-bottom: 2px solid ${COR_PRIMARIA_IMPRESSAO}; padding-bottom: 8px; margin-bottom: 12px; font-size: 23px; }
  .info { margin: 10px 0; font-size: 16px; }
  .info p { margin: 0; }
  table { width: 100%; border-collapse: collapse; margin: 10px 0; font-size: 17px; }
  th, td { border: 1px solid #ddd; padding: 12px 14px; text-align: left; }
  th { background-color: ${COR_PRIMARIA_IMPRESSAO}; color: white; }
  .totais { margin-top: 16px; padding: 12px; background-color: #f9f9f9; border: 1px solid #ddd; border-radius: 4px; }
  .totais h3 { margin: 0 0 10px 0; font-size: 18px; color: #333; }
  .totais table { margin: 0; font-size: 16px; }
  .totais th, .totais td { padding: 10px 12px; }
  .total-geral { margin-top: 10px; padding: 14px; background-color: ${COR_PRIMARIA_IMPRESSAO}; color: white; text-align: center; font-weight: bold; font-size: 18px; border-radius: 4px; }
`
