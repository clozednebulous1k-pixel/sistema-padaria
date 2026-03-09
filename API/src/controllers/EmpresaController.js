const pool = require('../config/database');
const { registrarAcaoManual } = require('../middlewares/auditMiddleware');

class EmpresaController {
  /**
   * Lista todas as empresas
   * GET /empresas
   */
  static async listar(req, res, next) {
    try {
      const DIAS_SEMANA = [
        'Segunda-feira', 'Terça-feira', 'Quarta-feira', 'Quinta-feira',
        'Sexta-feira', 'Sábado', 'Domingo'
      ];

      const result = await pool.query(
        'SELECT id, nome, criado_em FROM empresas_padaria WHERE deletado_em IS NULL ORDER BY nome ASC'
      );

      // Excluir dias da semana - são usados nos roteiros, não são empresas
      const empresas = result.rows.filter((e) => !DIAS_SEMANA.includes(e.nome));

      res.json({
        success: true,
        data: empresas,
      });
    } catch (error) {
      console.error('Erro ao listar empresas:', error);
      next(error);
    }
  }

  /**
   * Cria uma nova empresa
   * POST /empresas
   */
  static async criar(req, res, next) {
    try {
      const { nome } = req.body;

      if (!nome || nome.trim() === '') {
        return res.status(400).json({
          success: false,
          message: 'Nome da empresa é obrigatório',
        });
      }

      const DIAS_SEMANA = [
        'Segunda-feira', 'Terça-feira', 'Quarta-feira', 'Quinta-feira',
        'Sexta-feira', 'Sábado', 'Domingo'
      ];
      if (DIAS_SEMANA.includes(nome.trim())) {
        return res.status(400).json({
          success: false,
          message: 'Não é possível cadastrar dias da semana como empresa',
        });
      }

      const existe = await pool.query(
        'SELECT id, deletado_em FROM empresas_padaria WHERE LOWER(nome) = LOWER($1)',
        [nome.trim()]
      );

      if (existe.rows.length > 0) {
        if (existe.rows[0].deletado_em) {
          const r = await pool.query(
            'UPDATE empresas_padaria SET deletado_em = NULL WHERE id = $1 RETURNING id, nome, criado_em',
            [existe.rows[0].id]
          );
          return res.status(201).json({
            success: true,
            message: 'Empresa restaurada da lixeira',
            data: r.rows[0],
          });
        }
        return res.status(400).json({
          success: false,
          message: 'Esta empresa já está cadastrada',
        });
      }

      const result = await pool.query(
        'INSERT INTO empresas_padaria (nome) VALUES ($1) RETURNING id, nome, criado_em',
        [nome.trim()]
      );

      // Registrar ação na auditoria
      const user_agent = req.headers['user-agent'] || 'unknown';
      
      registrarAcaoManual({
        usuario_id: req.usuario.id,
        usuario_nome: req.usuario.nome || 'Desconhecido',
        usuario_email: req.usuario.email || 'desconhecido@email.com',
        acao: 'ADICIONAR',
        entidade: 'empresa',
        entidade_id: result.rows[0].id,
        descricao: `Adicionou empresa "${nome.trim()}"`,
        dados_novos: {
          nome: nome.trim(),
        },
        user_agent,
      }).catch((err) => {
        console.error('Erro ao registrar criação de empresa na auditoria:', err);
      });

      res.status(201).json({
        success: true,
        message: 'Empresa criada com sucesso',
        data: result.rows[0],
      });
    } catch (error) {
      console.error('Erro ao criar empresa:', error);

      // Erro de duplicata (UNIQUE constraint)
      if (error.code === '23505') {
        return res.status(400).json({
          success: false,
          message: 'Esta empresa já está cadastrada',
        });
      }

      next(error);
    }
  }

  /**
   * Deleta uma empresa
   * DELETE /empresas/:id
   */
  static async deletar(req, res, next) {
    try {
      const { id } = req.params;

      const result = await pool.query(
        'UPDATE empresas_padaria SET deletado_em = CURRENT_TIMESTAMP WHERE id = $1 AND deletado_em IS NULL RETURNING id, nome, deletado_em',
        [id]
      );

      if (result.rows.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'Empresa não encontrada',
        });
      }

      // Registrar ação na auditoria
      const user_agent = req.headers['user-agent'] || 'unknown';
      
      registrarAcaoManual({
        usuario_id: req.usuario.id,
        usuario_nome: req.usuario.nome || 'Desconhecido',
        usuario_email: req.usuario.email || 'desconhecido@email.com',
        acao: 'EXCLUIR',
        entidade: 'empresa',
        entidade_id: parseInt(id, 10),
        descricao: `Excluiu empresa "${result.rows[0].nome}" (ID: ${id})`,
        dados_anteriores: {
          nome: result.rows[0].nome,
        },
        user_agent,
      }).catch((err) => {
        console.error('Erro ao registrar exclusão de empresa na auditoria:', err);
      });

      res.json({
        success: true,
        message: 'Empresa removida com sucesso',
        data: result.rows[0],
      });
    } catch (error) {
      console.error('Erro ao deletar empresa:', error);
      next(error);
    }
  }
}

module.exports = EmpresaController;

