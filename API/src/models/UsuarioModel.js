const pool = require('../config/database');

class UsuarioModel {
  /**
   * Busca um usuário por email (case-insensitive)
   */
  static async findByEmail(email) {
    const query = 'SELECT * FROM usuarios_padaria WHERE LOWER(TRIM(email)) = LOWER(TRIM($1))';
    const result = await pool.query(query, [email]);
    return result.rows[0] || null;
  }

  /**
   * Busca um usuário por ID
   */
  static async findById(id) {
    const query = 'SELECT id, nome, email, ativo, is_admin, criado_em, atualizado_em FROM usuarios_padaria WHERE id = $1';
    const result = await pool.query(query, [id]);
    return result.rows[0] || null;
  }

  /**
   * Busca todos os usuários (sem senha)
   */
  static async findAll() {
    const query = 'SELECT id, nome, email, ativo, is_admin, criado_em, atualizado_em FROM usuarios_padaria ORDER BY nome';
    const result = await pool.query(query);
    return result.rows;
  }

  /**
   * Cria um novo usuário
   */
  static async create({ nome, email, senha, is_admin = false }) {
    const query = `
      INSERT INTO usuarios_padaria (nome, email, senha, is_admin)
      VALUES ($1, $2, $3, $4)
      RETURNING id, nome, email, ativo, is_admin, criado_em, atualizado_em
    `;
    const result = await pool.query(query, [nome, email, senha, is_admin]);
    return result.rows[0];
  }

  /**
   * Atualiza um usuário
   */
  static async update(id, { nome, email, senha, ativo, is_admin }) {
    const updates = [];
    const values = [];
    let paramCount = 1;

    if (nome !== undefined) {
      updates.push(`nome = $${paramCount++}`);
      values.push(nome);
    }
    if (email !== undefined) {
      updates.push(`email = $${paramCount++}`);
      values.push(email);
    }
    if (senha !== undefined) {
      updates.push(`senha = $${paramCount++}`);
      values.push(senha);
    }
    if (ativo !== undefined) {
      updates.push(`ativo = $${paramCount++}`);
      values.push(ativo);
    }
    if (is_admin !== undefined) {
      updates.push(`is_admin = $${paramCount++}`);
      values.push(is_admin);
    }

    if (updates.length === 0) {
      return await this.findById(id);
    }

    updates.push(`atualizado_em = CURRENT_TIMESTAMP`);
    values.push(id);

    const query = `
      UPDATE usuarios_padaria
      SET ${updates.join(', ')}
      WHERE id = $${paramCount}
      RETURNING id, nome, email, ativo, is_admin, criado_em, atualizado_em
    `;

    const result = await pool.query(query, values);
    return result.rows[0];
  }

  /**
   * Deleta um usuário
   */
  static async delete(id) {
    const query = 'DELETE FROM usuarios_padaria WHERE id = $1 RETURNING id, nome, email';
    const result = await pool.query(query, [id]);
    return result.rows[0];
  }
}

module.exports = UsuarioModel;

