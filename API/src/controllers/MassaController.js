const MassaModel = require('../models/MassaModel');

class MassaController {
  /**
   * GET /massas - Lista tipos de massa
   */
  static async listar(req, res, next) {
    try {
      const massas = await MassaModel.findAll();
      res.json({ success: true, data: massas });
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /massas - Adiciona tipo de massa
   */
  static async criar(req, res, next) {
    try {
      const { nome } = req.body;
      if (!nome || !nome.trim()) {
        return res.status(400).json({
          success: false,
          message: 'Nome do tipo de massa é obrigatório',
        });
      }
      const massa = await MassaModel.create(nome.trim());
      if (!massa) {
        return res.status(409).json({
          success: false,
          message: 'Este tipo de massa já existe',
        });
      }
      res.status(201).json({ success: true, data: massa });
    } catch (error) {
      next(error);
    }
  }

  /**
   * DELETE /massas/:nome - Remove tipo de massa
   */
  static async deletar(req, res, next) {
    try {
      const { nome } = req.params;
      const massa = await MassaModel.softDelete(decodeURIComponent(nome));
      if (!massa) {
        return res.status(404).json({
          success: false,
          message: 'Tipo de massa não encontrado',
        });
      }
      res.json({ success: true, message: 'Tipo removido com sucesso' });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = MassaController;
