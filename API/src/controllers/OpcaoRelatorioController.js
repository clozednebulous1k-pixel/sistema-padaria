const OpcaoRelatorioModel = require('../models/OpcaoRelatorioModel');

class OpcaoRelatorioController {
  /**
   * GET /opcoes-relatorio - Lista opções de relatório
   */
  static async listar(req, res, next) {
    try {
      const opcoes = await OpcaoRelatorioModel.findAll();
      res.json({ success: true, data: opcoes });
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /opcoes-relatorio - Adiciona opção de relatório
   */
  static async criar(req, res, next) {
    try {
      const { nome } = req.body;
      if (!nome || !nome.trim()) {
        return res.status(400).json({
          success: false,
          message: 'Nome da opção de relatório é obrigatório',
        });
      }

      const opcao = await OpcaoRelatorioModel.create(nome.trim());
      if (!opcao) {
        return res.status(409).json({
          success: false,
          message: 'Esta opção de relatório já existe',
        });
      }

      res.status(201).json({ success: true, data: opcao });
    } catch (error) {
      next(error);
    }
  }

  /**
   * DELETE /opcoes-relatorio/:nome - Remove opção de relatório (soft delete)
   */
  static async deletar(req, res, next) {
    try {
      const { nome } = req.params;
      const opcao = await OpcaoRelatorioModel.softDelete(decodeURIComponent(nome));
      if (!opcao) {
        return res.status(404).json({
          success: false,
          message: 'Opção de relatório não encontrada',
        });
      }
      res.json({ success: true, message: 'Opção removida com sucesso' });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = OpcaoRelatorioController;

