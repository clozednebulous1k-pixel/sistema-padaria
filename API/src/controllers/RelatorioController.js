const RelatorioService = require('../services/RelatorioService');
const { isValidDate } = require('../utils/dateUtils');

class RelatorioController {
  /**
   * Relatório de vendas por período
   * GET /relatorios/vendas?inicio=YYYY-MM-DD&fim=YYYY-MM-DD
   */
  static async vendasPorPeriodo(req, res, next) {
    try {
      const { inicio, fim } = req.query;

      if (!inicio || !fim) {
        return res.status(400).json({
          success: false,
          message: 'Parâmetros "inicio" e "fim" são obrigatórios (formato: YYYY-MM-DD)',
        });
      }

      if (!isValidDate(inicio) || !isValidDate(fim)) {
        return res.status(400).json({
          success: false,
          message: 'Datas devem estar no formato YYYY-MM-DD',
        });
      }

      if (new Date(inicio) > new Date(fim)) {
        return res.status(400).json({
          success: false,
          message: 'Data de início deve ser anterior à data de fim',
        });
      }

      const relatorio = await RelatorioService.vendasPorPeriodo(inicio, fim);

      res.json({
        success: true,
        data: relatorio,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Relatório de faturamento por dia
   * GET /relatorios/faturamento?inicio=YYYY-MM-DD&fim=YYYY-MM-DD
   */
  static async faturamentoPorDia(req, res, next) {
    try {
      const { inicio, fim } = req.query;

      if (!inicio || !fim) {
        return res.status(400).json({
          success: false,
          message: 'Parâmetros "inicio" e "fim" são obrigatórios (formato: YYYY-MM-DD)',
        });
      }

      if (!isValidDate(inicio) || !isValidDate(fim)) {
        return res.status(400).json({
          success: false,
          message: 'Datas devem estar no formato YYYY-MM-DD',
        });
      }

      const relatorio = await RelatorioService.faturamentoPorDia(inicio, fim);

      res.json({
        success: true,
        data: relatorio,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Relatório de produtos mais vendidos
   * GET /relatorios/produtos-mais-vendidos?limit=10
   */
  static async produtosMaisVendidos(req, res, next) {
    try {
      const limit = parseInt(req.query.limit) || 10;

      if (limit <= 0 || limit > 100) {
        return res.status(400).json({
          success: false,
          message: 'Limit deve estar entre 1 e 100',
        });
      }

      const relatorio = await RelatorioService.produtosMaisVendidos(limit);

      res.json({
        success: true,
        data: relatorio,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Relatório de quantidade vendida por produto
   * GET /relatorios/quantidade-por-produto
   */
  static async quantidadePorProduto(req, res, next) {
    try {
      const relatorio = await RelatorioService.quantidadeVendidaPorProduto();

      res.json({
        success: true,
        data: relatorio,
      });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = RelatorioController;
