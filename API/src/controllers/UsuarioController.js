const bcrypt = require('bcrypt');
const UsuarioModel = require('../models/UsuarioModel');
const { registrarAcaoManual } = require('../middlewares/auditMiddleware');

class UsuarioController {
  /**
   * Lista todos os usuários (admin) ou apenas o próprio (não-admin)
   * GET /usuarios
   */
  static async listar(req, res, next) {
    try {
      const usuarioAtual = await UsuarioModel.findById(req.usuario.id);
      const isAdmin = usuarioAtual && (usuarioAtual.is_admin === true || usuarioAtual.is_admin === 1);

      if (isAdmin) {
        const usuarios = await UsuarioModel.findAll();
        return res.json({ success: true, data: usuarios });
      }

      const proprioUsuario = await UsuarioModel.findById(req.usuario.id);
      res.json({
        success: true,
        data: proprioUsuario ? [proprioUsuario] : [],
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Busca um usuário por ID
   * GET /usuarios/:id
   * Não-admin só pode buscar o próprio usuário
   */
  static async buscarPorId(req, res, next) {
    try {
      const { id } = req.params;
      const usuarioAtual = await UsuarioModel.findById(req.usuario.id);
      const isAdmin = usuarioAtual && (usuarioAtual.is_admin === true || usuarioAtual.is_admin === 1);

      if (!isAdmin && parseInt(id) !== req.usuario.id) {
        return res.status(403).json({
          success: false,
          message: 'Você só pode visualizar seu próprio usuário',
        });
      }

      const usuario = await UsuarioModel.findById(id);

      if (!usuario) {
        return res.status(404).json({
          success: false,
          message: 'Usuário não encontrado',
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

  /**
   * Cria um novo usuário (apenas admin)
   * POST /usuarios
   */
  static async criar(req, res, next) {
    try {
      const usuarioAtual = await UsuarioModel.findById(req.usuario.id);
      const isAdmin = usuarioAtual && (usuarioAtual.is_admin === true || usuarioAtual.is_admin === 1);

      if (!isAdmin) {
        return res.status(403).json({
          success: false,
          message: 'Apenas administradores podem criar novos usuários',
        });
      }

      const { nome, email, senha, ativo, is_admin } = req.body;

      // isAdmin já verificado acima - apenas admin chega aqui

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

      // Criptografar senha
      const saltRounds = 10;
      const senhaHash = await bcrypt.hash(senha, saltRounds);

      // Criar usuário
      const novoUsuario = await UsuarioModel.create({
        nome: nome.trim(),
        email: email.trim().toLowerCase(),
        senha: senhaHash,
        is_admin: is_admin || false,
      });

      // Se ativo foi especificado, atualizar
      if (ativo !== undefined) {
        await UsuarioModel.update(novoUsuario.id, { ativo });
        novoUsuario.ativo = ativo;
      }

      // Registrar ação na auditoria
      const user_agent = req.headers['user-agent'] || 'unknown';
      
      let descricaoDetalhada = `Adicionou usuário "${novoUsuario.nome}" (${novoUsuario.email})`;
      if (novoUsuario.is_admin) {
        descricaoDetalhada += ' como administrador';
      }

      registrarAcaoManual({
        usuario_id: req.usuario.id,
        usuario_nome: req.usuario.nome || 'Desconhecido',
        usuario_email: req.usuario.email || 'desconhecido@email.com',
        acao: 'ADICIONAR',
        entidade: 'usuario',
        entidade_id: novoUsuario.id,
        descricao: descricaoDetalhada,
        dados_novos: {
          nome: novoUsuario.nome,
          email: novoUsuario.email,
          is_admin: novoUsuario.is_admin || false,
        },
        user_agent,
      }).catch((err) => {
        console.error('Erro ao registrar criação de usuário na auditoria:', err);
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
   * Atualiza um usuário
   * PUT /usuarios/:id
   * Não-admin só pode editar o próprio usuário (nome, email, senha)
   */
  static async atualizar(req, res, next) {
    try {
      const { id } = req.params;
      const { nome, email, senha, ativo, is_admin } = req.body;

      const usuarioAtual = await UsuarioModel.findById(req.usuario.id);
      const isAdmin = usuarioAtual && (usuarioAtual.is_admin === true || usuarioAtual.is_admin === 1);

      if (!isAdmin && parseInt(id) !== req.usuario.id) {
        return res.status(403).json({
          success: false,
          message: 'Você só pode editar seu próprio usuário',
        });
      }

      if (is_admin !== undefined && !isAdmin) {
        return res.status(403).json({
          success: false,
          message: 'Apenas administradores podem alterar o status de administrador',
        });
      }

      if (ativo !== undefined && !isAdmin) {
        return res.status(403).json({
          success: false,
          message: 'Apenas administradores podem alterar o status ativo/inativo',
        });
      }

      const usuarioExistente = await UsuarioModel.findById(id);

      if (!usuarioExistente) {
        return res.status(404).json({
          success: false,
          message: 'Usuário não encontrado',
        });
      }

      // Se email foi alterado, verificar se já existe
      if (email && email !== usuarioExistente.email) {
        const emailEmUso = await UsuarioModel.findByEmail(email);
        if (emailEmUso) {
          return res.status(409).json({
            success: false,
            message: 'Email já cadastrado',
          });
        }
      }

      // Preparar dados para atualização
      const dadosAtualizacao = {};
      if (nome !== undefined) dadosAtualizacao.nome = nome.trim();
      if (email !== undefined) dadosAtualizacao.email = email.trim().toLowerCase();
      if (ativo !== undefined) dadosAtualizacao.ativo = ativo;
      if (is_admin !== undefined) dadosAtualizacao.is_admin = is_admin;

      // Se senha foi fornecida, criptografar
      if (senha) {
        if (senha.length < 6) {
          return res.status(400).json({
            success: false,
            message: 'Senha deve ter pelo menos 6 caracteres',
          });
        }
        const saltRounds = 10;
        dadosAtualizacao.senha = await bcrypt.hash(senha, saltRounds);
      }

      // Atualizar usuário
      const usuarioAtualizado = await UsuarioModel.update(id, dadosAtualizacao);

      // Registrar ação na auditoria
      const user_agent = req.headers['user-agent'] || 'unknown';
      
      const camposAlterados = [];
      if (nome !== undefined && nome !== usuarioExistente.nome) camposAlterados.push('nome');
      if (email !== undefined && email !== usuarioExistente.email) camposAlterados.push('email');
      if (ativo !== undefined && Boolean(ativo) !== usuarioExistente.ativo) camposAlterados.push('status');
      if (is_admin !== undefined && Boolean(is_admin) !== usuarioExistente.is_admin) camposAlterados.push('permissão de admin');
      if (senha) camposAlterados.push('senha');
      
      let descricaoDetalhada = `Editou usuário "${usuarioExistente.nome}"`;
      if (camposAlterados.length > 0) {
        descricaoDetalhada += `: alterou ${camposAlterados.join(', ')}`;
      }

      registrarAcaoManual({
        usuario_id: req.usuario.id,
        usuario_nome: req.usuario.nome || 'Desconhecido',
        usuario_email: req.usuario.email || 'desconhecido@email.com',
        acao: 'EDITAR',
        entidade: 'usuario',
        entidade_id: parseInt(id, 10),
        descricao: descricaoDetalhada,
        dados_anteriores: {
          nome: usuarioExistente.nome,
          email: usuarioExistente.email,
          ativo: usuarioExistente.ativo,
          is_admin: usuarioExistente.is_admin,
        },
        dados_novos: {
          nome: usuarioAtualizado.nome,
          email: usuarioAtualizado.email,
          ativo: usuarioAtualizado.ativo,
          is_admin: usuarioAtualizado.is_admin,
        },
        user_agent,
      }).catch((err) => {
        console.error('Erro ao registrar atualização de usuário na auditoria:', err);
      });

      res.json({
        success: true,
        message: 'Usuário atualizado com sucesso',
        data: usuarioAtualizado,
        _auditRegistered: true,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Deleta um usuário (apenas admin)
   * DELETE /usuarios/:id
   */
  static async deletar(req, res, next) {
    try {
      const usuarioAtual = await UsuarioModel.findById(req.usuario.id);
      const isAdmin = usuarioAtual && (usuarioAtual.is_admin === true || usuarioAtual.is_admin === 1);

      if (!isAdmin) {
        return res.status(403).json({
          success: false,
          message: 'Apenas administradores podem excluir usuários',
        });
      }

      const { id } = req.params;

      if (req.usuario && parseInt(id) === req.usuario.id) {
        return res.status(400).json({
          success: false,
          message: 'Você não pode deletar sua própria conta',
        });
      }

      const usuarioDeletado = await UsuarioModel.delete(id);

      if (!usuarioDeletado) {
        return res.status(404).json({
          success: false,
          message: 'Usuário não encontrado',
        });
      }

      // Registrar ação na auditoria
      const user_agent = req.headers['user-agent'] || 'unknown';
      
      registrarAcaoManual({
        usuario_id: req.usuario.id,
        usuario_nome: req.usuario.nome || 'Desconhecido',
        usuario_email: req.usuario.email || 'desconhecido@email.com',
        acao: 'EXCLUIR',
        entidade: 'usuario',
        entidade_id: parseInt(id, 10),
        descricao: `Excluiu usuário "${usuarioDeletado.nome}" (${usuarioDeletado.email})`,
        dados_anteriores: {
          nome: usuarioDeletado.nome,
          email: usuarioDeletado.email,
        },
        user_agent,
      }).catch((err) => {
        console.error('Erro ao registrar exclusão de usuário na auditoria:', err);
      });

      res.json({
        success: true,
        message: 'Usuário deletado com sucesso',
        data: usuarioDeletado,
      });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = UsuarioController;

