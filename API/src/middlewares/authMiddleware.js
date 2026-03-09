const jwt = require('jsonwebtoken');

/**
 * Middleware de autenticação JWT
 * Verifica se o token é válido e adiciona os dados do usuário em req.usuario
 */
const authMiddleware = (req, res, next) => {
  try {
    // Pegar token do header Authorization
    const authHeader = req.headers.authorization;

    if (!authHeader) {
      return res.status(401).json({
        success: false,
        message: 'Token de autenticação não fornecido',
      });
    }

    // Formato: "Bearer <token>"
    const parts = authHeader.split(' ');

    if (parts.length !== 2) {
      return res.status(401).json({
        success: false,
        message: 'Formato de token inválido',
      });
    }

    const [scheme, token] = parts;

    if (!/^Bearer$/i.test(scheme)) {
      return res.status(401).json({
        success: false,
        message: 'Formato de token inválido',
      });
    }

    // Verificar e decodificar token
    const config = require('../config/env');
    const secret = config.jwt.secret;
    
    jwt.verify(token, secret, (err, decoded) => {
      if (err) {
        return res.status(401).json({
          success: false,
          message: 'Token inválido ou expirado',
        });
      }

      // Adicionar dados do usuário na requisição
      req.usuario = decoded;
      next();
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Erro ao processar autenticação',
    });
  }
};

module.exports = authMiddleware;

