const AuditoriaService = require('../services/AuditoriaService');
const { registrarAcaoManual } = require('../middlewares/auditMiddleware');

class AuditoriaController {
  /**
   * Lista todas as ações de auditoria
   * GET /auditoria
   */
  static async listar(req, res, next) {
    try {
      const {
        usuario_id,
        acao,
        entidade,
        data_inicio,
        data_fim,
        limit = 100,
        offset = 0,
      } = req.query;

      const filters = {};
      if (usuario_id) filters.usuario_id = parseInt(usuario_id, 10);
      if (acao) filters.acao = acao;
      if (entidade) filters.entidade = entidade;
      if (data_inicio) filters.data_inicio = data_inicio;
      if (data_fim) filters.data_fim = data_fim;
      if (limit) filters.limit = parseInt(limit, 10);
      if (offset) filters.offset = parseInt(offset, 10);

      const { auditorias, total } = await AuditoriaService.listarAuditorias(filters);

      res.json({
        success: true,
        data: auditorias || [],
        pagination: {
          total: total || 0,
          limit: filters.limit || 100,
          offset: filters.offset || 0,
          hasMore: (filters.offset || 0) + (filters.limit || 100) < (total || 0),
        },
      });
    } catch (error) {
      console.error('Erro ao listar auditoria:', error);
      next(error);
    }
  }

  /**
   * Busca uma ação específica por ID
   * GET /auditoria/:id
   */
  static async buscarPorId(req, res, next) {
    try {
      const { id } = req.params;
      const auditoria = await AuditoriaService.buscarAuditoriaPorId(id);

      if (!auditoria) {
        return res.status(404).json({
          success: false,
          message: 'Ação de auditoria não encontrada',
        });
      }

      res.json({
        success: true,
        data: auditoria,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Estatísticas de auditoria
   * GET /auditoria/estatisticas
   */
  static async estatisticas(req, res, next) {
    try {
      const { data_inicio, data_fim } = req.query;

      const filters = {};
      if (data_inicio) filters.data_inicio = data_inicio;
      if (data_fim) filters.data_fim = data_fim;

      const estatisticas = await AuditoriaService.obterEstatisticas(filters);

      res.json({
        success: true,
        data: estatisticas,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Limpa todos os registros de auditoria
   * DELETE /auditoria
   */
  static async limpar(req, res, next) {
    try {
      const total = await AuditoriaService.limparAuditoria();

      res.json({
        success: true,
        message: `${total} registro(s) de auditoria removido(s)`,
        data: { total },
      });
    } catch (error) {
      console.error('Erro ao limpar auditoria:', error);
      next(error);
    }
  }

  /**
   * Registra um clique em botão
   * POST /auditoria/clique
   */
  static async registrarClique(req, res, next) {
    try {
      const { botao, pagina, aba, entidade, entidade_id, detalhes } = req.body;

      if (!botao || !pagina) {
        return res.status(400).json({
          success: false,
          message: 'Botão e página são obrigatórios',
        });
      }

      const user_agent = req.headers['user-agent'] || 'unknown';
      
      let descricao = `Clicou no botão "${botao}"`;
      if (aba) {
        descricao += ` na aba "${aba}"`;
      }
      descricao += ` da página "${pagina}"`;
      if (entidade) {
        descricao += ` (${entidade}`;
        if (entidade_id) {
          descricao += ` ID: ${entidade_id}`;
        }
        descricao += ')';
      }
      if (detalhes) {
        descricao += ` - ${detalhes}`;
      }

      await registrarAcaoManual({
        usuario_id: req.usuario.id,
        usuario_nome: req.usuario.nome || 'Desconhecido',
        usuario_email: req.usuario.email || 'desconhecido@email.com',
        acao: 'CLIQUE',
        entidade: entidade || pagina.toLowerCase().replace(/\s+/g, '_'),
        entidade_id: entidade_id || null,
        descricao,
        dados_novos: {
          botao,
          pagina,
          aba: aba || null,
          detalhes: detalhes || null,
        },
        user_agent,
      });

      res.json({
        success: true,
        message: 'Clique registrado com sucesso',
      });
    } catch (error) {
      console.error('Erro ao registrar clique:', error);
      next(error);
    }
  }
}

module.exports = AuditoriaController;

