const AuditoriaModel = require('../models/AuditoriaModel');
const pool = require('../config/database');

class AuditoriaService {
  /**
   * Lista auditorias com paginação
   */
  static async listarAuditorias(filters = {}) {
    try {
      const auditorias = await AuditoriaModel.findAll(filters);
      const total = await AuditoriaModel.count(filters);

      return {
        auditorias: auditorias || [],
        total: total || 0,
      };
    } catch (error) {
      console.error('Erro no listarAuditorias:', error);
      // Se a tabela não existir, retornar vazio
      if (error.message && error.message.includes('does not exist')) {
        return {
          auditorias: [],
          total: 0,
        };
      }
      throw error;
    }
  }

  /**
   * Busca uma auditoria por ID
   */
  static async buscarAuditoriaPorId(id) {
    return await AuditoriaModel.findById(id);
  }

  /**
   * Remove todos os registros de auditoria
   */
  static async limparAuditoria() {
    return await AuditoriaModel.limparTudo();
  }

  /**
   * Obtém estatísticas de auditoria
   */
  static async obterEstatisticas(filters = {}) {
    try {
      let whereClause = 'WHERE 1=1';
      const values = [];
      let paramCount = 1;

      if (filters.data_inicio) {
        whereClause += ` AND criado_em >= $${paramCount++}`;
        values.push(filters.data_inicio);
      }

      if (filters.data_fim) {
        whereClause += ` AND criado_em <= $${paramCount++}`;
        values.push(filters.data_fim);
      }

      // Total de ações
      const totalQuery = `SELECT COUNT(*) as total FROM auditoria_padaria ${whereClause}`;
      const totalResult = await pool.query(totalQuery, values);
      const total = parseInt(totalResult.rows[0]?.total || 0, 10);

      // Ações por tipo
      const acoesQuery = `
        SELECT acao, COUNT(*) as quantidade
        FROM auditoria_padaria
        ${whereClause}
        GROUP BY acao
        ORDER BY quantidade DESC
      `;
      const acoesResult = await pool.query(acoesQuery, values);

      // Ações por entidade
      const entidadesQuery = `
        SELECT entidade, COUNT(*) as quantidade
        FROM auditoria_padaria
        ${whereClause}
        GROUP BY entidade
        ORDER BY quantidade DESC
      `;
      const entidadesResult = await pool.query(entidadesQuery, values);

      // Ações por usuário (top 10)
      const usuariosQuery = `
        SELECT usuario_id, usuario_nome, COUNT(*) as quantidade
        FROM auditoria_padaria
        ${whereClause}
        GROUP BY usuario_id, usuario_nome
        ORDER BY quantidade DESC
        LIMIT 10
      `;
      const usuariosResult = await pool.query(usuariosQuery, values);

      // Ações por dia (últimos 30 dias)
      const diasQuery = `
        SELECT DATE(criado_em) as data, COUNT(*) as quantidade
        FROM auditoria_padaria
        ${whereClause}
        AND criado_em >= CURRENT_DATE - INTERVAL '30 days'
        GROUP BY DATE(criado_em)
        ORDER BY data DESC
      `;
      const diasResult = await pool.query(diasQuery, values);

      return {
        total: total || 0,
        acoes: acoesResult.rows || [],
        entidades: entidadesResult.rows || [],
        usuarios_mais_ativos: usuariosResult.rows || [],
        acoes_por_dia: diasResult.rows || [],
      };
    } catch (error) {
      console.error('Erro ao obter estatísticas:', error);
      // Se a tabela não existir, retornar valores vazios
      if (error.message && error.message.includes('does not exist')) {
        return {
          total: 0,
          acoes: [],
          entidades: [],
          usuarios_mais_ativos: [],
          acoes_por_dia: [],
        };
      }
      throw error;
    }
  }
}

module.exports = AuditoriaService;

