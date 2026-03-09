const RecheioModel = require('../models/RecheioModel');

class RecheioController {
  /**
   * GET /recheios - Lista recheios
   */
  static async listar(req, res, next) {
    try {
      const recheios = await RecheioModel.findAll();
      res.json({ success: true, data: recheios });
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /recheios - Adiciona recheio
   */
  static async criar(req, res, next) {
    try {
      const { nome } = req.body;
      if (!nome || !nome.trim()) {
        return res.status(400).json({
          success: false,
          message: 'Nome do recheio é obrigatório',
        });
      }
      const recheio = await RecheioModel.create(nome.trim());
      if (!recheio) {
        return res.status(409).json({
          success: false,
          message: 'Este recheio já existe',
        });
      }
      res.status(201).json({ success: true, data: recheio });
    } catch (error) {
      next(error);
    }
  }

  /**
   * DELETE /recheios/:nome - Remove recheio
   */
  static async deletar(req, res, next) {
    try {
      const { nome } = req.params;
      const recheio = await RecheioModel.softDelete(decodeURIComponent(nome));
      if (!recheio) {
        return res.status(404).json({
          success: false,
          message: 'Recheio não encontrado',
        });
      }
      res.json({ success: true, message: 'Recheio removido com sucesso' });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = RecheioController;
