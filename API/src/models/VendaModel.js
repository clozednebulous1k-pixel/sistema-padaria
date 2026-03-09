const pool = require('../config/database');

class VendaModel {
  /**
   * Busca todas as vendas
   */
  static async findAll(limit = 100, offset = 0) {
    const query = `
      SELECT 
        v.*,
        COUNT(vi.id) as total_itens
      FROM vendas_padaria v
      LEFT JOIN venda_itens_padaria vi ON v.id = vi.venda_id
      GROUP BY v.id
      ORDER BY v.criado_em DESC
      LIMIT $1 OFFSET $2
    `;
    const result = await pool.query(query, [limit, offset]);
    return result.rows;
  }

  /**
   * Busca uma venda por ID com seus itens e roteiro associado
   */
  static async findById(id) {
    const vendaQuery = `
      SELECT 
        v.*,
        r.id as roteiro_id
      FROM vendas_padaria v
      LEFT JOIN roteiros_padaria r ON r.venda_id = v.id
      WHERE v.id = $1
    `;
    const vendaResult = await pool.query(vendaQuery, [id]);
    
    if (vendaResult.rows.length === 0) {
      return null;
    }

    const venda = vendaResult.rows[0];
    const roteiroId = venda.roteiro_id;
    delete venda.roteiro_id; // Remover do objeto principal

    const itensQuery = `
      SELECT 
        vi.*,
        p.nome as produto_nome
      FROM venda_itens_padaria vi
      INNER JOIN produtos_padaria p ON vi.produto_id = p.id
      WHERE vi.venda_id = $1
    `;
    const itensResult = await pool.query(itensQuery, [id]);

    return {
      ...venda,
      itens: itensResult.rows,
      roteiro_id: roteiroId,
    };
  }

  /**
   * Cria uma nova venda (sem itens)
   */
  static async create({ valor_total, data_venda, forma_pagamento }) {
    const query = `
      INSERT INTO vendas_padaria (valor_total, data_venda, forma_pagamento)
      VALUES ($1, $2, $3)
      RETURNING *
    `;
    const result = await pool.query(query, [valor_total, data_venda, forma_pagamento]);
    return result.rows[0];
  }

  /**
   * Busca vendas por período
   */
  static async findByPeriod(dataInicio, dataFim) {
    const query = `
      SELECT 
        v.*,
        COUNT(vi.id) as total_itens
      FROM vendas_padaria v
      LEFT JOIN venda_itens_padaria vi ON v.id = vi.venda_id
      WHERE v.data_venda BETWEEN $1 AND $2
      GROUP BY v.id
      ORDER BY v.data_venda DESC, v.criado_em DESC
    `;
    const result = await pool.query(query, [dataInicio, dataFim]);
    return result.rows;
  }
}

module.exports = VendaModel;
