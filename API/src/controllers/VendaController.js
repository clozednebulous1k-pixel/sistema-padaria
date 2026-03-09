const VendaService = require('../services/VendaService');

class VendaController {
  /**
   * Cria uma nova venda
   * POST /vendas
   */
  static async criar(req, res, next) {
    try {
      const { itens, forma_pagamento, data_venda, nome_cliente } = req.body;

      // Validações básicas
      if (!itens || !Array.isArray(itens) || itens.length === 0) {
        return res.status(400).json({
          success: false,
          message: 'Venda deve conter pelo menos um item',
        });
      }

      if (!forma_pagamento || forma_pagamento.trim() === '') {
        return res.status(400).json({
          success: false,
          message: 'Forma de pagamento é obrigatória',
        });
      }

      // Validar estrutura dos itens
      for (const item of itens) {
        if (!item.produto_id) {
          return res.status(400).json({
            success: false,
            message: 'Cada item deve conter produto_id',
          });
        }
        if (!item.quantidade || item.quantidade <= 0) {
          return res.status(400).json({
            success: false,
            message: 'Quantidade deve ser maior que zero',
          });
        }
      }

      const venda = await VendaService.criarVenda({
        itens,
        forma_pagamento: forma_pagamento.trim(),
        data_venda,
        nome_cliente: nome_cliente?.trim() || null,
      });

      const mensagem = venda.roteiro_id 
        ? 'Venda criada com sucesso. Roteiro de produção gerado automaticamente.'
        : 'Venda criada com sucesso.';

      res.status(201).json({
        success: true,
        message: mensagem,
        data: venda,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Lista todas as vendas
   * GET /vendas
   */
  static async listar(req, res, next) {
    try {
      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 100;

      const vendas = await VendaService.listarVendas(page, limit);

      res.json({
        success: true,
        data: vendas,
        pagination: {
          page,
          limit,
        },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Busca uma venda por ID
   * GET /vendas/:id
   */
  static async buscarPorId(req, res, next) {
    try {
      const { id } = req.params;
      const venda = await VendaService.buscarVendaPorId(id);

      res.json({
        success: true,
        data: venda,
      });
    } catch (error) {
      if (error.message === 'Venda não encontrada') {
        return res.status(404).json({
          success: false,
          message: error.message,
        });
      }
      next(error);
    }
  }
}

module.exports = VendaController;
