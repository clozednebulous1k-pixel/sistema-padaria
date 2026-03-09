const pool = require('../config/database');

class VendaItemModel {
  /**
   * Cria um item de venda
   */
  static async create({ venda_id, produto_id, quantidade, preco_unitario, subtotal }) {
    const query = `
      INSERT INTO venda_itens_padaria (venda_id, produto_id, quantidade, preco_unitario, subtotal)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING *
    `;
    const result = await pool.query(query, [
      venda_id,
      produto_id,
      quantidade,
      preco_unitario,
      subtotal,
    ]);
    return result.rows[0];
  }

  /**
   * Busca todos os itens de uma venda
   */
  static async findByVendaId(venda_id) {
    const query = `
      SELECT 
        vi.*,
        p.nome as produto_nome
      FROM venda_itens_padaria vi
      INNER JOIN produtos_padaria p ON vi.produto_id = p.id
      WHERE vi.venda_id = $1
    `;
    const result = await pool.query(query, [venda_id]);
    return result.rows;
  }
}

module.exports = VendaItemModel;
