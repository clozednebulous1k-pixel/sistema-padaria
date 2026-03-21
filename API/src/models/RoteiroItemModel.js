const pool = require('../config/database');

class RoteiroItemModel {
  /**
   * Cria um item de roteiro
   */
  static async create({ roteiro_id, produto_id, quantidade, observacao }) {
    const query = `
      INSERT INTO roteiro_itens_padaria (roteiro_id, produto_id, quantidade, observacao)
      VALUES ($1, $2, $3, $4)
      RETURNING *
    `;
    const result = await pool.query(query, [
      roteiro_id,
      produto_id,
      quantidade,
      observacao || null,
    ]);
    return result.rows[0];
  }

  /**
   * Busca todos os itens de um roteiro
   */
  static async findByRoteiroId(roteiro_id) {
    const query = `
      SELECT 
        ri.*,
        p.nome as produto_nome,
        p.descricao as produto_descricao,
        p.tipo_massa as tipo_massa,
        p.opcao_relatorio as opcao_relatorio,
        p.recheio as recheio
      FROM roteiro_itens_padaria ri
      INNER JOIN produtos_padaria p ON ri.produto_id = p.id
      WHERE ri.roteiro_id = $1
      ORDER BY p.nome
    `;
    const result = await pool.query(query, [roteiro_id]);
    return result.rows;
  }

  /**
   * Atualiza um item de roteiro
   */
  static async update(id, { quantidade, observacao }) {
    const updates = [];
    const values = [];
    let paramCount = 1;

    if (quantidade !== undefined) {
      updates.push(`quantidade = $${paramCount++}`);
      values.push(quantidade);
    }
    if (observacao !== undefined) {
      updates.push(`observacao = $${paramCount++}`);
      values.push(observacao);
    }

    if (updates.length === 0) {
      return null;
    }

    values.push(id);
    const query = `
      UPDATE roteiro_itens_padaria
      SET ${updates.join(', ')}
      WHERE id = $${paramCount}
      RETURNING *
    `;

    const result = await pool.query(query, values);
    return result.rows[0];
  }

  /**
   * Deleta um item de roteiro
   */
  static async delete(id) {
    const query = 'DELETE FROM roteiro_itens_padaria WHERE id = $1 RETURNING *';
    const result = await pool.query(query, [id]);
    return result.rows[0];
  }

  /**
   * Deleta todos os itens de um roteiro
   */
  static async deleteByRoteiroId(roteiro_id) {
    const query = 'DELETE FROM roteiro_itens_padaria WHERE roteiro_id = $1';
    await pool.query(query, [roteiro_id]);
  }
}

module.exports = RoteiroItemModel;
