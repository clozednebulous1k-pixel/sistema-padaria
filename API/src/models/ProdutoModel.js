const pool = require('../config/database');

class ProdutoModel {
  /**
   * Busca todos os produtos ativos
   */
  static async findAll(includeInactive = false) {
    let query = 'SELECT * FROM produtos_padaria WHERE (deletado_em IS NULL)';
    
    if (!includeInactive) {
      query += ' AND ativo = true';
    }
    
    query += ' ORDER BY criado_em DESC';
    
    const result = await pool.query(query);
    return result.rows;
  }

  /**
   * Busca um produto por ID
   */
  static async findById(id) {
    const query = 'SELECT * FROM produtos_padaria WHERE id = $1 AND deletado_em IS NULL';
    const result = await pool.query(query, [id]);
    return result.rows[0];
  }

  /**
   * Cria um novo produto
   */
  static async create({ nome, descricao, preco, tipo_massa, opcao_relatorio, recheio }) {
    const query = `
      INSERT INTO produtos_padaria (nome, descricao, preco, tipo_massa, opcao_relatorio, recheio)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *
    `;
    const result = await pool.query(query, [nome, descricao, preco, tipo_massa || null, opcao_relatorio || null, recheio || null]);
    return result.rows[0];
  }

  /**
   * Atualiza um produto existente
   */
  static async update(id, { nome, descricao, preco, ativo, tipo_massa, opcao_relatorio, recheio }) {
    const updates = [];
    const values = [];
    let paramCount = 1;

    if (nome !== undefined) {
      updates.push(`nome = $${paramCount++}`);
      values.push(nome);
    }
    if (descricao !== undefined) {
      updates.push(`descricao = $${paramCount++}`);
      values.push(descricao);
    }
    if (preco !== undefined) {
      updates.push(`preco = $${paramCount++}`);
      values.push(preco);
    }
    if (ativo !== undefined) {
      updates.push(`ativo = $${paramCount++}`);
      values.push(ativo);
    }
    if (tipo_massa !== undefined) {
      updates.push(`tipo_massa = $${paramCount++}`);
      values.push(tipo_massa || null);
    }
    if (opcao_relatorio !== undefined) {
      updates.push(`opcao_relatorio = $${paramCount++}`);
      values.push(opcao_relatorio || null);
    }
    if (recheio !== undefined) {
      updates.push(`recheio = $${paramCount++}`);
      values.push(recheio || null);
    }

    if (updates.length === 0) {
      return await this.findById(id);
    }

    values.push(id);
    const query = `
      UPDATE produtos_padaria
      SET ${updates.join(', ')}
      WHERE id = $${paramCount}
      RETURNING *
    `;
    
    const result = await pool.query(query, values);
    return result.rows[0];
  }

  /**
   * Soft delete - move para lixeira
   */
  static async softDelete(id) {
    const query = `
      UPDATE produtos_padaria
      SET ativo = false, deletado_em = CURRENT_TIMESTAMP
      WHERE id = $1 AND deletado_em IS NULL
      RETURNING *
    `;
    const result = await pool.query(query, [id]);
    return result.rows[0];
  }

  /**
   * Verifica se um produto existe e está ativo
   */
  static async isActive(id) {
    const query = 'SELECT ativo FROM produtos_padaria WHERE id = $1';
    const result = await pool.query(query, [id]);
    return result.rows[0]?.ativo === true;
  }
}

module.exports = ProdutoModel;
