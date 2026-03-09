const UsuarioModel = require('../models/UsuarioModel');

/**
 * Middleware para verificar se o usuário é administrador
 * Deve ser usado após o authMiddleware
 */
const adminMiddleware = async (req, res, next) => {
  try {
    // Verificar se há usuário autenticado
    if (!req.usuario || !req.usuario.id) {
      return res.status(401).json({
        success: false,
        message: 'Usuário não autenticado',
      });
    }

    // Buscar usuário completo no banco para verificar is_admin
    const usuario = await UsuarioModel.findById(req.usuario.id);

    if (!usuario) {
      return res.status(401).json({
        success: false,
        message: 'Usuário não encontrado',
      });
    }

    // Verificar se é admin
    if (!usuario.is_admin) {
      return res.status(403).json({
        success: false,
        message: 'Acesso negado. Apenas administradores podem acessar esta funcionalidade.',
      });
    }

    // Adicionar flag is_admin ao req.usuario
    req.usuario.is_admin = true;

    next();
  } catch (error) {
    console.error('Erro no adminMiddleware:', error);
    res.status(500).json({
      success: false,
      message: 'Erro ao verificar permissões de administrador',
    });
  }
};

module.exports = {
  adminMiddleware,
};

