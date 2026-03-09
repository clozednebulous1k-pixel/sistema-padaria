const pool = require('../config/database');

class RecheioModel {
  /**
   * Lista todos os recheios
   */
  static async findAll() {
    const query = 'SELECT id, nome, ordem FROM recheios_padaria WHERE deletado_em IS NULL ORDER BY ordem ASC, nome ASC';
    const result = await pool.query(query);
    return result.rows;
  }

  /**
   * Adiciona um recheio
   */
  static async create(nome) {
    const existente = await pool.query(
      'SELECT id, deletado_em FROM recheios_padaria WHERE nome = $1',
      [nome.trim()]
    );
    if (existente.rows.length > 0) {
      if (existente.rows[0].deletado_em) {
        const r = await pool.query(
          'UPDATE recheios_padaria SET deletado_em = NULL WHERE nome = $1 RETURNING *',
          [nome.trim()]
        );
        return r.rows[0];
      }
      return null;
    }
    const maxOrdem = await pool.query(
      'SELECT COALESCE(MAX(ordem), 0) + 1 AS prox FROM recheios_padaria WHERE deletado_em IS NULL'
    );
    const ordem = maxOrdem.rows[0].prox;
    const result = await pool.query(
      'INSERT INTO recheios_padaria (nome, ordem) VALUES ($1, $2) RETURNING *',
      [nome.trim(), ordem]
    );
    return result.rows[0];
  }

  /**
   * Soft delete - move para lixeira
   */
  static async softDelete(nome) {
    const result = await pool.query(
      'UPDATE recheios_padaria SET deletado_em = CURRENT_TIMESTAMP WHERE nome = $1 AND deletado_em IS NULL RETURNING *',
      [nome]
    );
    return result.rows[0];
  }
}

module.exports = RecheioModel;
