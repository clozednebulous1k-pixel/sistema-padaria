const pool = require('../config/database');

class OpcaoRelatorioModel {
  /**
   * Lista todas as opções de relatório ativas
   */
  static async findAll() {
    const query =
      'SELECT id, nome, ordem FROM opcoes_relatorio_padaria WHERE deletado_em IS NULL ORDER BY ordem ASC, nome ASC';
    const result = await pool.query(query);
    return result.rows;
  }

  /**
   * Cria (ou restaura) uma opção de relatório
   */
  static async create(nome) {
    const existente = await pool.query(
      'SELECT id, deletado_em FROM opcoes_relatorio_padaria WHERE nome = $1',
      [nome.trim()],
    );

    if (existente.rows.length > 0) {
      // Se existir e estiver "deletado", apenas restaurar
      if (existente.rows[0].deletado_em) {
        const r = await pool.query(
          'UPDATE opcoes_relatorio_padaria SET deletado_em = NULL WHERE nome = $1 RETURNING *',
          [nome.trim()],
        );
        return r.rows[0];
      }
      // Já existe ativa
      return null;
    }

    const maxOrdem = await pool.query(
      'SELECT COALESCE(MAX(ordem), 0) + 1 AS prox FROM opcoes_relatorio_padaria WHERE deletado_em IS NULL',
    );
    const ordem = maxOrdem.rows[0].prox;

    const result = await pool.query(
      'INSERT INTO opcoes_relatorio_padaria (nome, ordem) VALUES ($1, $2) RETURNING *',
      [nome.trim(), ordem],
    );
    return result.rows[0];
  }

  /**
   * Soft delete - marca como removida
   */
  static async softDelete(nome) {
    const result = await pool.query(
      'UPDATE opcoes_relatorio_padaria SET deletado_em = CURRENT_TIMESTAMP WHERE nome = $1 AND deletado_em IS NULL RETURNING *',
      [nome],
    );
    return result.rows[0];
  }
}

module.exports = OpcaoRelatorioModel;

