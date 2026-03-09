const pool = require('../config/database');
const { registrarAcaoManual } = require('../middlewares/auditMiddleware');

class MotoristaController {
  /**
   * Lista todos os motoristas
   * GET /motoristas
   */
  static async listar(req, res, next) {
    try {
      const result = await pool.query(
        'SELECT id, nome, periodo, criado_em FROM motoristas_padaria WHERE deletado_em IS NULL ORDER BY nome ASC'
      );

      res.json({
        success: true,
        data: result.rows,
      });
    } catch (error) {
      console.error('Erro ao listar motoristas:', error);
      next(error);
    }
  }

  /**
   * Cria um novo motorista
   * POST /motoristas
   */
  static async criar(req, res, next) {
    try {
      const { nome, periodo } = req.body;

      if (!nome || nome.trim() === '') {
        return res.status(400).json({
          success: false,
          message: 'Nome do motorista é obrigatório',
        });
      }

      if (!periodo || !['matutino', 'noturno'].includes(periodo)) {
        return res.status(400).json({
          success: false,
          message: 'Período deve ser "matutino" ou "noturno"',
        });
      }

      // Verificar se já existe
      const existe = await pool.query(
        'SELECT id, deletado_em FROM motoristas_padaria WHERE LOWER(nome) = LOWER($1)',
        [nome.trim()]
      );

      if (existe.rows.length > 0) {
        if (existe.rows[0].deletado_em) {
          const r = await pool.query(
            'UPDATE motoristas_padaria SET deletado_em = NULL WHERE id = $1 RETURNING id, nome, periodo, criado_em',
            [existe.rows[0].id]
          );
          return res.status(201).json({
            success: true,
            message: 'Motorista restaurado da lixeira',
            data: r.rows[0],
          });
        }
        return res.status(400).json({
          success: false,
          message: 'Este motorista já está cadastrado',
        });
      }

      const result = await pool.query(
        'INSERT INTO motoristas_padaria (nome, periodo) VALUES ($1, $2) RETURNING id, nome, periodo, criado_em',
        [nome.trim(), periodo]
      );

      // Registrar ação na auditoria
      const user_agent = req.headers['user-agent'] || 'unknown';
      
      registrarAcaoManual({
        usuario_id: req.usuario.id,
        usuario_nome: req.usuario.nome || 'Desconhecido',
        usuario_email: req.usuario.email || 'desconhecido@email.com',
        acao: 'ADICIONAR',
        entidade: 'motorista',
        entidade_id: result.rows[0].id,
        descricao: `Adicionou motorista "${nome.trim()}" (${periodo})`,
        dados_novos: {
          nome: nome.trim(),
          periodo,
        },
        user_agent,
      }).catch((err) => {
        console.error('Erro ao registrar criação de motorista na auditoria:', err);
      });

      res.status(201).json({
        success: true,
        message: 'Motorista criado com sucesso',
        data: result.rows[0],
      });
    } catch (error) {
      console.error('Erro ao criar motorista:', error);

      // Erro de duplicata (UNIQUE constraint)
      if (error.code === '23505') {
        return res.status(400).json({
          success: false,
          message: 'Este motorista já está cadastrado',
        });
      }

      next(error);
    }
  }

  /**
   * Deleta um motorista
   * DELETE /motoristas/:id
   */
  static async deletar(req, res, next) {
    try {
      const { id } = req.params;

      const result = await pool.query(
        'UPDATE motoristas_padaria SET deletado_em = CURRENT_TIMESTAMP WHERE id = $1 AND deletado_em IS NULL RETURNING id, nome, deletado_em',
        [id]
      );

      if (result.rows.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'Motorista não encontrado',
        });
      }

      // Registrar ação na auditoria
      const user_agent = req.headers['user-agent'] || 'unknown';
      
      registrarAcaoManual({
        usuario_id: req.usuario.id,
        usuario_nome: req.usuario.nome || 'Desconhecido',
        usuario_email: req.usuario.email || 'desconhecido@email.com',
        acao: 'EXCLUIR',
        entidade: 'motorista',
        entidade_id: parseInt(id, 10),
        descricao: `Excluiu motorista "${result.rows[0].nome}" (ID: ${id})`,
        dados_anteriores: {
          nome: result.rows[0].nome,
        },
        user_agent,
      }).catch((err) => {
        console.error('Erro ao registrar exclusão de motorista na auditoria:', err);
      });

      res.json({
        success: true,
        message: 'Motorista removido com sucesso',
        data: result.rows[0],
      });
    } catch (error) {
      console.error('Erro ao deletar motorista:', error);
      next(error);
    }
  }
}

module.exports = MotoristaController;

