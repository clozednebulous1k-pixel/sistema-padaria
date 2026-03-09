const pool = require('../config/database');
const { normalizeDate } = require('../utils/dateUtils');

class RoteiroModel {
  /**
   * Busca todos os roteiros
   */
  static async findAll(filters = {}) {
    let query = `
      SELECT 
        r.id,
        r.nome_empresa,
        r.data_producao,
        r.observacoes,
        r.status,
        r.venda_id,
        r.motorista,
        r.periodo,
        r.criado_em,
        r.atualizado_em,
        COUNT(ri.id) as total_itens
      FROM roteiros_padaria r
      LEFT JOIN roteiro_itens_padaria ri ON r.id = ri.roteiro_id
      WHERE (r.deletado_em IS NULL)
    `;

    const conditions = [];
    const values = [];
    let paramCount = 1;

    if (filters.status) {
      conditions.push(`r.status = $${paramCount++}`);
      values.push(filters.status);
    }

    if (filters.data_producao) {
      // Normalizar data para busca
      const dataNormalizada = normalizeDate(filters.data_producao);
      if (dataNormalizada) {
        conditions.push(`r.data_producao = $${paramCount++}`);
        values.push(dataNormalizada);
      }
    }

    if (filters.data_inicio && filters.data_fim) {
      // Normalizar datas para busca
      const dataInicioNormalizada = normalizeDate(filters.data_inicio);
      const dataFimNormalizada = normalizeDate(filters.data_fim);
      if (dataInicioNormalizada && dataFimNormalizada) {
        conditions.push(`r.data_producao BETWEEN $${paramCount++} AND $${paramCount++}`);
        values.push(dataInicioNormalizada, dataFimNormalizada);
      }
    }

    if (filters.motorista) {
      conditions.push(`r.motorista = $${paramCount++}`);
      values.push(filters.motorista);
    }

    if (filters.periodo) {
      conditions.push(`r.periodo = $${paramCount++}`);
      values.push(filters.periodo);
    }

    if (conditions.length > 0) {
      query += ' AND ' + conditions.join(' AND ');
    }

    query += ' GROUP BY r.id, r.nome_empresa, r.data_producao, r.observacoes, r.status, r.venda_id, r.motorista, r.periodo, r.criado_em, r.atualizado_em ORDER BY r.data_producao DESC, r.criado_em DESC';

    const result = await pool.query(query, values);
    return result.rows;
  }

  /**
   * Busca um roteiro por ID com seus itens
   */
  static async findById(id) {
    const roteiroQuery = 'SELECT * FROM roteiros_padaria WHERE id = $1';
    const roteiroResult = await pool.query(roteiroQuery, [id]);

    if (roteiroResult.rows.length === 0) {
      return null;
    }

    const itensQuery = `
      SELECT 
        ri.*,
        p.nome as produto_nome,
        p.descricao as produto_descricao,
        p.opcao_relatorio as opcao_relatorio
      FROM roteiro_itens_padaria ri
      INNER JOIN produtos_padaria p ON ri.produto_id = p.id
      WHERE ri.roteiro_id = $1
      ORDER BY p.nome
    `;
    const itensResult = await pool.query(itensQuery, [id]);

    return {
      ...roteiroResult.rows[0],
      itens: itensResult.rows,
    };
  }

  /**
   * Cria um novo roteiro
   */
  static async create({ nome_empresa, data_producao, observacoes, status, venda_id, motorista, periodo }) {
    // Normalizar data antes de salvar
    const dataNormalizada = normalizeDate(data_producao);
    if (!dataNormalizada) {
      throw new Error('Data de produção inválida');
    }

    const query = `
      INSERT INTO roteiros_padaria (nome_empresa, data_producao, observacoes, status, venda_id, motorista, periodo)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *
    `;
    const result = await pool.query(query, [
      nome_empresa,
      dataNormalizada,
      observacoes || null,
      status || 'pendente',
      venda_id || null,
      motorista || null,
      periodo || null,
    ]);
    return result.rows[0];
  }

  /**
   * Atualiza um roteiro
   */
  static async update(id, { nome_empresa, data_producao, observacoes, status, motorista, periodo }) {
    const updates = [];
    const values = [];
    let paramCount = 1;

    if (nome_empresa !== undefined) {
      updates.push(`nome_empresa = $${paramCount++}`);
      values.push(nome_empresa);
    }
    if (data_producao !== undefined) {
      // Normalizar data antes de atualizar
      const dataNormalizada = normalizeDate(data_producao);
      if (!dataNormalizada) {
        throw new Error('Data de produção inválida');
      }
      updates.push(`data_producao = $${paramCount++}`);
      values.push(dataNormalizada);
    }
    if (observacoes !== undefined) {
      updates.push(`observacoes = $${paramCount++}`);
      values.push(observacoes);
    }
    if (status !== undefined) {
      updates.push(`status = $${paramCount++}`);
      values.push(status);
    }
    if (motorista !== undefined) {
      updates.push(`motorista = $${paramCount++}`);
      values.push(motorista);
    }
    if (periodo !== undefined) {
      updates.push(`periodo = $${paramCount++}`);
      values.push(periodo);
    }

    if (updates.length === 0) {
      return await this.findById(id);
    }

    updates.push(`atualizado_em = CURRENT_TIMESTAMP`);
    values.push(id);

    const query = `
      UPDATE roteiros_padaria
      SET ${updates.join(', ')}
      WHERE id = $${paramCount}
      RETURNING *
    `;

    const result = await pool.query(query, values);
    return result.rows[0];
  }

  /**
   * Soft delete - move para restauração
   */
  static async softDelete(id) {
    const query = `
      UPDATE roteiros_padaria
      SET deletado_em = CURRENT_TIMESTAMP
      WHERE id = $1 AND deletado_em IS NULL
      RETURNING *
    `;
    const result = await pool.query(query, [id]);
    return result.rows[0];
  }
}

module.exports = RoteiroModel;
