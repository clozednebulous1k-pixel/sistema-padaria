const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const UsuarioModel = require('../models/UsuarioModel');
const config = require('../config/env');
const { registrarAcaoManual } = require('../middlewares/auditMiddleware');

class AuthController {
  /**
   * Faz login de um usuário
   * POST /auth/login
   */
  static async login(req, res, next) {
    try {
      const { email, senha } = req.body;

      // Validações básicas
      if (!email || !senha) {
        return res.status(400).json({
          success: false,
          message: 'Email e senha são obrigatórios',
        });
      }

      // Buscar usuário por email
      const usuario = await UsuarioModel.findByEmail(email);

      if (!usuario) {
        return res.status(401).json({
          success: false,
          message: 'Email ou senha inválidos',
        });
      }

      // Verificar se usuário está ativo
      if (!usuario.ativo) {
        return res.status(403).json({
          success: false,
          message: 'Usuário inativo. Entre em contato com o administrador.',
        });
      }

      // Verificar senha
      const senhaValida = await bcrypt.compare(senha, usuario.senha);

      if (!senhaValida) {
        return res.status(401).json({
          success: false,
          message: 'Email ou senha inválidos',
        });
      }

      // Gerar token JWT
      const token = jwt.sign(
        {
          id: usuario.id,
          email: usuario.email,
          nome: usuario.nome,
        },
        config.jwt.secret,
        {
          expiresIn: config.jwt.expiresIn,
        }
      );

      // Registrar ação de login na auditoria
      const user_agent = req.headers['user-agent'] || 'unknown';
      
      registrarAcaoManual({
        usuario_id: usuario.id,
        usuario_nome: usuario.nome,
        usuario_email: usuario.email,
        acao: 'LOGIN',
        entidade: 'autenticacao',
        descricao: `Login realizado com sucesso`,
        dados_novos: { email: usuario.email },
        user_agent,
      }).catch((err) => {
        console.error('Erro ao registrar login na auditoria:', err);
      });

      // Garantir que is_admin seja boolean
      const isAdmin = usuario.is_admin === true || usuario.is_admin === 'true' || usuario.is_admin === 1;
      
      console.log('Login - Usuário encontrado:', {
        id: usuario.id,
        email: usuario.email,
        is_admin_original: usuario.is_admin,
        is_admin_convertido: isAdmin
      });

      res.json({
        success: true,
        message: 'Login realizado com sucesso',
        data: {
          token,
          usuario: {
            id: usuario.id,
            nome: usuario.nome,
            email: usuario.email,
            is_admin: isAdmin,
          },
        },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Registra um novo usuário (apenas para criação inicial)
   * POST /auth/registro
   */
  static async registro(req, res, next) {
    try {
      const { nome, email, senha } = req.body;

      // Validações básicas
      if (!nome || !email || !senha) {
        return res.status(400).json({
          success: false,
          message: 'Nome, email e senha são obrigatórios',
        });
      }

      if (senha.length < 6) {
        return res.status(400).json({
          success: false,
          message: 'Senha deve ter pelo menos 6 caracteres',
        });
      }

      // Verificar se email já existe
      const usuarioExistente = await UsuarioModel.findByEmail(email);

      if (usuarioExistente) {
        return res.status(409).json({
          success: false,
          message: 'Email já cadastrado',
        });
      }

      // Primeiro usuário do sistema é admin
      const todos = await UsuarioModel.findAll();
      const isAdmin = todos.length === 0;

      // Criptografar senha
      const saltRounds = 10;
      const senhaHash = await bcrypt.hash(senha, saltRounds);

      // Criar usuário
      const novoUsuario = await UsuarioModel.create({
        nome: nome.trim(),
        email: email.trim().toLowerCase(),
        senha: senhaHash,
        is_admin: isAdmin,
      });

      res.status(201).json({
        success: true,
        message: 'Usuário criado com sucesso',
        data: novoUsuario,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Verifica se o token é válido e retorna dados do usuário
   * GET /auth/me
   */
  static async me(req, res, next) {
    try {
      // req.usuario é definido pelo middleware de autenticação
      const usuario = await UsuarioModel.findById(req.usuario.id);

      if (!usuario || !usuario.ativo) {
        return res.status(401).json({
          success: false,
          message: 'Usuário não encontrado ou inativo',
        });
      }

      res.json({
        success: true,
        data: usuario,
      });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = AuthController;

