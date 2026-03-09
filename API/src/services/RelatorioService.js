const pool = require('../config/database');
const VendaModel = require('../models/VendaModel');

class RelatorioService {
  /**
   * Gera relatório de vendas por período
   */
  static async vendasPorPeriodo(dataInicio, dataFim) {
    const vendas = await VendaModel.findByPeriod(dataInicio, dataFim);

    // Calcular totais
    const totalVendas = vendas.length;
    const faturamentoTotal = vendas.reduce((sum, v) => sum + parseFloat(v.valor_total), 0);

    return {
      periodo: {
        inicio: dataInicio,
        fim: dataFim,
      },
      total_vendas: totalVendas,
      faturamento_total: faturamentoTotal,
      vendas: vendas,
    };
  }

  /**
   * Gera relatório de faturamento por dia
   */
  static async faturamentoPorDia(dataInicio, dataFim) {
    const query = `
      SELECT 
        data_venda,
        COUNT(*) as total_vendas,
        SUM(valor_total) as faturamento_dia
      FROM vendas_padaria
      WHERE data_venda BETWEEN $1 AND $2
      GROUP BY data_venda
      ORDER BY data_venda DESC
    `;

    const result = await pool.query(query, [dataInicio, dataFim]);
    return result.rows;
  }

  /**
   * Gera relatório de produtos mais vendidos
   */
  static async produtosMaisVendidos(limit = 10) {
    const query = `
      SELECT 
        p.id,
        p.nome,
        p.descricao,
        p.preco,
        SUM(vi.quantidade) as quantidade_total_vendida,
        COUNT(DISTINCT vi.venda_id) as total_vendas,
        SUM(vi.subtotal) as faturamento_produto
      FROM produtos_padaria p
      INNER JOIN venda_itens_padaria vi ON p.id = vi.produto_id
      WHERE p.ativo = true
      GROUP BY p.id, p.nome, p.descricao, p.preco
      ORDER BY quantidade_total_vendida DESC
      LIMIT $1
    `;

    const result = await pool.query(query, [limit]);
    return result.rows;
  }

  /**
   * Gera relatório de quantidade total vendida por produto
   */
  static async quantidadeVendidaPorProduto() {
    const query = `
      SELECT 
        p.id,
        p.nome,
        COALESCE(SUM(vi.quantidade), 0) as quantidade_total_vendida,
        COALESCE(COUNT(DISTINCT vi.venda_id), 0) as total_vendas,
        COALESCE(SUM(vi.subtotal), 0) as faturamento_produto
      FROM produtos_padaria p
      LEFT JOIN venda_itens_padaria vi ON p.id = vi.produto_id
      WHERE p.ativo = true
      GROUP BY p.id, p.nome
      ORDER BY quantidade_total_vendida DESC
    `;

    const result = await pool.query(query);
    return result.rows;
  }
}

module.exports = RelatorioService;
