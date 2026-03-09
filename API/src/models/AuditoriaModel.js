const pool = require('../config/database');

class AuditoriaModel {
  /**
   * Registra uma ação na auditoria
   */
  static async criar({
    usuario_id,
    usuario_nome,
    usuario_email,
    acao,
    entidade,
    entidade_id,
    descricao,
    dados_anteriores,
    dados_novos,
    user_agent,
  }) {
    const query = `
      INSERT INTO auditoria_padaria (
        usuario_id, usuario_nome, usuario_email, acao, entidade, entidade_id,
        descricao, dados_anteriores, dados_novos, ip_address, user_agent
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NULL, $10)
      RETURNING *
    `;

    const values = [
      usuario_id,
      usuario_nome,
      usuario_email,
      acao,
      entidade,
      entidade_id || null,
      descricao || null,
      dados_anteriores ? JSON.stringify(dados_anteriores) : null,
      dados_novos ? JSON.stringify(dados_novos) : null,
      user_agent || null,
    ];

    const result = await pool.query(query, values);
    return result.rows[0];
  }

  /**
   * Lista todas as ações de auditoria com filtros opcionais
   */
  static async findAll(filters = {}) {
    let query = `
      SELECT 
        a.*,
        u.nome as usuario_nome_completo,
        u.email as usuario_email_completo
      FROM auditoria_padaria a
      LEFT JOIN usuarios_padaria u ON a.usuario_id = u.id
      WHERE 1=1
    `;

    const values = [];
    let paramCount = 1;

    // Filtro por usuário
    if (filters.usuario_id) {
      query += ` AND a.usuario_id = $${paramCount++}`;
      values.push(filters.usuario_id);
    }

    // Filtro por ação
    if (filters.acao) {
      query += ` AND a.acao = $${paramCount++}`;
      values.push(filters.acao);
    }

    // Filtro por entidade
    if (filters.entidade) {
      query += ` AND a.entidade = $${paramCount++}`;
      values.push(filters.entidade);
    }

    // Filtro por data inicial
    if (filters.data_inicio) {
      query += ` AND a.criado_em >= $${paramCount++}`;
      values.push(filters.data_inicio);
    }

    // Filtro por data final
    if (filters.data_fim) {
      query += ` AND a.criado_em <= $${paramCount++}`;
      values.push(filters.data_fim);
    }

    // Ordenação
    query += ` ORDER BY a.criado_em DESC`;

    // Limite e offset para paginação
    if (filters.limit) {
      query += ` LIMIT $${paramCount++}`;
      values.push(filters.limit);
    }

    if (filters.offset) {
      query += ` OFFSET $${paramCount++}`;
      values.push(filters.offset);
    }

    const result = await pool.query(query, values);

    // Parse JSON fields com tratamento de erros
    return result.rows.map((row) => {
      let dados_anteriores = null;
      let dados_novos = null;

      try {
        if (row.dados_anteriores && typeof row.dados_anteriores === 'string') {
          dados_anteriores = JSON.parse(row.dados_anteriores);
        } else if (row.dados_anteriores && typeof row.dados_anteriores === 'object') {
          dados_anteriores = row.dados_anteriores;
        }
      } catch (e) {
        console.error('Erro ao fazer parse de dados_anteriores:', e);
        dados_anteriores = null;
      }

      try {
        if (row.dados_novos && typeof row.dados_novos === 'string') {
          dados_novos = JSON.parse(row.dados_novos);
        } else if (row.dados_novos && typeof row.dados_novos === 'object') {
          dados_novos = row.dados_novos;
        }
      } catch (e) {
        console.error('Erro ao fazer parse de dados_novos:', e);
        dados_novos = null;
      }

      return {
        ...row,
        dados_anteriores,
        dados_novos,
      };
    });
  }

  /**
   * Conta o total de registros de auditoria com filtros
   */
  static async count(filters = {}) {
    let query = `SELECT COUNT(*) as total FROM auditoria_padaria WHERE 1=1`;
    const values = [];
    let paramCount = 1;

    if (filters.usuario_id) {
      query += ` AND usuario_id = $${paramCount++}`;
      values.push(filters.usuario_id);
    }

    if (filters.acao) {
      query += ` AND acao = $${paramCount++}`;
      values.push(filters.acao);
    }

    if (filters.entidade) {
      query += ` AND entidade = $${paramCount++}`;
      values.push(filters.entidade);
    }

    if (filters.data_inicio) {
      query += ` AND criado_em >= $${paramCount++}`;
      values.push(filters.data_inicio);
    }

    if (filters.data_fim) {
      query += ` AND criado_em <= $${paramCount++}`;
      values.push(filters.data_fim);
    }

    const result = await pool.query(query, values);
    return parseInt(result.rows[0].total, 10);
  }

  /**
   * Remove todos os registros de auditoria
   */
  static async limparTudo() {
    const result = await pool.query('DELETE FROM auditoria_padaria RETURNING id');
    return result.rowCount;
  }

  /**
   * Busca uma ação específica por ID
   */
  static async findById(id) {
    const query = `
      SELECT 
        a.*,
        u.nome as usuario_nome_completo,
        u.email as usuario_email_completo
      FROM auditoria_padaria a
      LEFT JOIN usuarios_padaria u ON a.usuario_id = u.id
      WHERE a.id = $1
    `;

    const result = await pool.query(query, [id]);
    if (result.rows.length === 0) return null;

    const row = result.rows[0];
    
    let dados_anteriores = null;
    let dados_novos = null;

    try {
      if (row.dados_anteriores && typeof row.dados_anteriores === 'string') {
        dados_anteriores = JSON.parse(row.dados_anteriores);
      } else if (row.dados_anteriores && typeof row.dados_anteriores === 'object') {
        dados_anteriores = row.dados_anteriores;
      }
    } catch (e) {
      console.error('Erro ao fazer parse de dados_anteriores:', e);
      dados_anteriores = null;
    }

    try {
      if (row.dados_novos && typeof row.dados_novos === 'string') {
        dados_novos = JSON.parse(row.dados_novos);
      } else if (row.dados_novos && typeof row.dados_novos === 'object') {
        dados_novos = row.dados_novos;
      }
    } catch (e) {
      console.error('Erro ao fazer parse de dados_novos:', e);
      dados_novos = null;
    }

    return {
      ...row,
      dados_anteriores,
      dados_novos,
    };
  }
}

module.exports = AuditoriaModel;

