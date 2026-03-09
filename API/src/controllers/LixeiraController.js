const pool = require('../config/database');
const UsuarioModel = require('../models/UsuarioModel');
const { registrarAcaoManual } = require('../middlewares/auditMiddleware');

const DIAS_SEMANA = [
  'Segunda-feira', 'Terça-feira', 'Quarta-feira', 'Quinta-feira',
  'Sexta-feira', 'Sábado', 'Domingo'
];

class LixeiraController {
  /**
   * GET /lixeira - Lista todos os itens excluídos (apenas admin)
   */
  static async listar(req, res, next) {
    try {
      const usuarioAtual = await UsuarioModel.findById(req.usuario.id);
      const isAdmin = usuarioAtual && (usuarioAtual.is_admin === true || usuarioAtual.is_admin === 1);

      if (!isAdmin) {
        return res.status(403).json({
          success: false,
          message: 'Apenas administradores podem acessar a lixeira',
        });
      }

      const [produtos, empresasRaw, motoristas, massas, roteiros] = await Promise.all([
        pool.query(
          'SELECT id, nome, descricao, preco, deletado_em FROM produtos_padaria WHERE deletado_em IS NOT NULL ORDER BY deletado_em DESC'
        ),
        pool.query(
          'SELECT id, nome, deletado_em FROM empresas_padaria WHERE deletado_em IS NOT NULL ORDER BY deletado_em DESC'
        ),
        pool.query(
          'SELECT id, nome, periodo, deletado_em FROM motoristas_padaria WHERE deletado_em IS NOT NULL ORDER BY deletado_em DESC'
        ),
        pool.query(
          'SELECT id, nome, ordem, deletado_em FROM massas_padaria WHERE deletado_em IS NOT NULL ORDER BY deletado_em DESC'
        ),
        pool.query(
          'SELECT id, nome_empresa, observacoes, data_producao, motorista, periodo, status, deletado_em FROM roteiros_padaria WHERE deletado_em IS NOT NULL ORDER BY deletado_em DESC'
        )
      ]);

      const empresas = empresasRaw.rows.filter((e) => !DIAS_SEMANA.includes(e.nome));

      res.json({
        success: true,
        data: {
          produtos: produtos.rows,
          empresas,
          motoristas: motoristas.rows,
          massas: massas.rows,
          roteiros: roteiros.rows,
        },
      });
    } catch (error) {
      console.error('Erro ao listar lixeira:', error);
      next(error);
    }
  }

  /**
   * POST /lixeira/restaurar - Restaura um item (apenas admin)
   */
  static async restaurar(req, res, next) {
    try {
      const usuarioAtual = await UsuarioModel.findById(req.usuario.id);
      const isAdmin = usuarioAtual && (usuarioAtual.is_admin === true || usuarioAtual.is_admin === 1);

      if (!isAdmin) {
        return res.status(403).json({
          success: false,
          message: 'Apenas administradores podem restaurar itens',
        });
      }

      const { tipo, id, nome } = req.body;

      if (!tipo) {
        return res.status(400).json({
          success: false,
          message: 'Tipo é obrigatório (produto, empresa, motorista, massa, roteiro)',
        });
      }

      const user_agent = req.headers['user-agent'] || 'unknown';

      if (tipo === 'produto') {
        if (!id) return res.status(400).json({ success: false, message: 'ID obrigatório' });
        const r = await pool.query(
          'UPDATE produtos_padaria SET deletado_em = NULL, ativo = true WHERE id = $1 AND deletado_em IS NOT NULL RETURNING *',
          [id]
        );
        if (r.rows.length === 0) {
          return res.status(404).json({ success: false, message: 'Produto não encontrado na lixeira' });
        }
        registrarAcaoManual({
          usuario_id: req.usuario.id,
          usuario_nome: req.usuario.nome || 'Desconhecido',
          usuario_email: req.usuario.email || 'desconhecido@email.com',
          acao: 'RESTAURAR',
          entidade: 'produto',
          entidade_id: id,
          descricao: `Restaurou produto "${r.rows[0].nome}" da lixeira`,
          user_agent,
        }).catch(() => {});
        return res.json({ success: true, message: 'Produto restaurado', data: r.rows[0] });
      }

      if (tipo === 'empresa') {
        if (!id) return res.status(400).json({ success: false, message: 'ID obrigatório' });
        const r = await pool.query(
          'UPDATE empresas_padaria SET deletado_em = NULL WHERE id = $1 AND deletado_em IS NOT NULL RETURNING *',
          [id]
        );
        if (r.rows.length === 0) {
          return res.status(404).json({ success: false, message: 'Empresa não encontrada na lixeira' });
        }
        registrarAcaoManual({
          usuario_id: req.usuario.id,
          usuario_nome: req.usuario.nome || 'Desconhecido',
          usuario_email: req.usuario.email || 'desconhecido@email.com',
          acao: 'RESTAURAR',
          entidade: 'empresa',
          entidade_id: id,
          descricao: `Restaurou empresa "${r.rows[0].nome}" da lixeira`,
          user_agent,
        }).catch(() => {});
        return res.json({ success: true, message: 'Empresa restaurada', data: r.rows[0] });
      }

      if (tipo === 'motorista') {
        if (!id) return res.status(400).json({ success: false, message: 'ID obrigatório' });
        const r = await pool.query(
          'UPDATE motoristas_padaria SET deletado_em = NULL WHERE id = $1 AND deletado_em IS NOT NULL RETURNING *',
          [id]
        );
        if (r.rows.length === 0) {
          return res.status(404).json({ success: false, message: 'Motorista não encontrado na lixeira' });
        }
        registrarAcaoManual({
          usuario_id: req.usuario.id,
          usuario_nome: req.usuario.nome || 'Desconhecido',
          usuario_email: req.usuario.email || 'desconhecido@email.com',
          acao: 'RESTAURAR',
          entidade: 'motorista',
          entidade_id: id,
          descricao: `Restaurou motorista "${r.rows[0].nome}" da lixeira`,
          user_agent,
        }).catch(() => {});
        return res.json({ success: true, message: 'Motorista restaurado', data: r.rows[0] });
      }

      if (tipo === 'massa') {
        if (!nome) return res.status(400).json({ success: false, message: 'Nome obrigatório para massa' });
        const nomeDecoded = decodeURIComponent(nome);
        const r = await pool.query(
          'UPDATE massas_padaria SET deletado_em = NULL WHERE nome = $1 AND deletado_em IS NOT NULL RETURNING *',
          [nomeDecoded]
        );
        if (r.rows.length === 0) {
          return res.status(404).json({ success: false, message: 'Massa não encontrada na lixeira' });
        }
        registrarAcaoManual({
          usuario_id: req.usuario.id,
          usuario_nome: req.usuario.nome || 'Desconhecido',
          usuario_email: req.usuario.email || 'desconhecido@email.com',
          acao: 'RESTAURAR',
          entidade: 'massa',
          entidade_id: r.rows[0].id,
          descricao: `Restaurou massa "${nomeDecoded}" da lixeira`,
          user_agent,
        }).catch(() => {});
        return res.json({ success: true, message: 'Massa restaurada', data: r.rows[0] });
      }

      if (tipo === 'roteiro') {
        if (!id) return res.status(400).json({ success: false, message: 'ID obrigatório' });
        const r = await pool.query(
          'UPDATE roteiros_padaria SET deletado_em = NULL WHERE id = $1 AND deletado_em IS NOT NULL RETURNING *',
          [id]
        );
        if (r.rows.length === 0) {
          return res.status(404).json({ success: false, message: 'Lista de produção não encontrada na restauração' });
        }
        registrarAcaoManual({
          usuario_id: req.usuario.id,
          usuario_nome: req.usuario.nome || 'Desconhecido',
          usuario_email: req.usuario.email || 'desconhecido@email.com',
          acao: 'RESTAURAR',
          entidade: 'roteiro',
          entidade_id: id,
          descricao: `Restaurou lista de produção "${r.rows[0].nome_empresa}" (${r.rows[0].data_producao})`,
          user_agent,
        }).catch(() => {});
        return res.json({ success: true, message: 'Lista de produção restaurada', data: r.rows[0] });
      }

      return res.status(400).json({ success: false, message: 'Tipo inválido' });
    } catch (error) {
      console.error('Erro ao restaurar:', error);
      next(error);
    }
  }

  /**
   * DELETE /lixeira/excluir-definitivo - Exclui permanentemente (apenas admin)
   */
  static async excluirDefinitivo(req, res, next) {
    try {
      const usuarioAtual = await UsuarioModel.findById(req.usuario.id);
      const isAdmin = usuarioAtual && (usuarioAtual.is_admin === true || usuarioAtual.is_admin === 1);

      if (!isAdmin) {
        return res.status(403).json({
          success: false,
          message: 'Apenas administradores podem excluir permanentemente',
        });
      }

      const { tipo, id, nome } = req.body;

      if (!tipo) {
        return res.status(400).json({
          success: false,
          message: 'Tipo é obrigatório (produto, empresa, motorista, massa, roteiro)',
        });
      }

      const user_agent = req.headers['user-agent'] || 'unknown';

      if (tipo === 'produto') {
        if (!id) return res.status(400).json({ success: false, message: 'ID obrigatório' });
        const r = await pool.query(
          'DELETE FROM produtos_padaria WHERE id = $1 AND deletado_em IS NOT NULL RETURNING id, nome',
          [id]
        );
        if (r.rows.length === 0) {
          return res.status(404).json({ success: false, message: 'Produto não encontrado na lixeira' });
        }
        registrarAcaoManual({
          usuario_id: req.usuario.id,
          usuario_nome: req.usuario.nome || 'Desconhecido',
          usuario_email: req.usuario.email || 'desconhecido@email.com',
          acao: 'EXCLUIR_DEFINITIVO',
          entidade: 'produto',
          entidade_id: id,
          descricao: `Excluiu permanentemente produto "${r.rows[0].nome}"`,
          user_agent,
        }).catch(() => {});
        return res.json({ success: true, message: 'Produto excluído permanentemente' });
      }

      if (tipo === 'empresa') {
        if (!id) return res.status(400).json({ success: false, message: 'ID obrigatório' });
        const r = await pool.query(
          'DELETE FROM empresas_padaria WHERE id = $1 AND deletado_em IS NOT NULL RETURNING id, nome',
          [id]
        );
        if (r.rows.length === 0) {
          return res.status(404).json({ success: false, message: 'Empresa não encontrada na lixeira' });
        }
        registrarAcaoManual({
          usuario_id: req.usuario.id,
          usuario_nome: req.usuario.nome || 'Desconhecido',
          usuario_email: req.usuario.email || 'desconhecido@email.com',
          acao: 'EXCLUIR_DEFINITIVO',
          entidade: 'empresa',
          entidade_id: id,
          descricao: `Excluiu permanentemente empresa "${r.rows[0].nome}"`,
          user_agent,
        }).catch(() => {});
        return res.json({ success: true, message: 'Empresa excluída permanentemente' });
      }

      if (tipo === 'motorista') {
        if (!id) return res.status(400).json({ success: false, message: 'ID obrigatório' });
        const r = await pool.query(
          'DELETE FROM motoristas_padaria WHERE id = $1 AND deletado_em IS NOT NULL RETURNING id, nome',
          [id]
        );
        if (r.rows.length === 0) {
          return res.status(404).json({ success: false, message: 'Motorista não encontrado na lixeira' });
        }
        registrarAcaoManual({
          usuario_id: req.usuario.id,
          usuario_nome: req.usuario.nome || 'Desconhecido',
          usuario_email: req.usuario.email || 'desconhecido@email.com',
          acao: 'EXCLUIR_DEFINITIVO',
          entidade: 'motorista',
          entidade_id: id,
          descricao: `Excluiu permanentemente motorista "${r.rows[0].nome}"`,
          user_agent,
        }).catch(() => {});
        return res.json({ success: true, message: 'Motorista excluído permanentemente' });
      }

      if (tipo === 'massa') {
        if (!nome) return res.status(400).json({ success: false, message: 'Nome obrigatório para massa' });
        const nomeDecoded = decodeURIComponent(nome);
        const r = await pool.query(
          'DELETE FROM massas_padaria WHERE nome = $1 AND deletado_em IS NOT NULL RETURNING id, nome',
          [nomeDecoded]
        );
        if (r.rows.length === 0) {
          return res.status(404).json({ success: false, message: 'Massa não encontrada na lixeira' });
        }
        registrarAcaoManual({
          usuario_id: req.usuario.id,
          usuario_nome: req.usuario.nome || 'Desconhecido',
          usuario_email: req.usuario.email || 'desconhecido@email.com',
          acao: 'EXCLUIR_DEFINITIVO',
          entidade: 'massa',
          entidade_id: r.rows[0].id,
          descricao: `Excluiu permanentemente massa "${nomeDecoded}"`,
          user_agent,
        }).catch(() => {});
        return res.json({ success: true, message: 'Massa excluída permanentemente' });
      }

      if (tipo === 'roteiro') {
        if (!id) return res.status(400).json({ success: false, message: 'ID obrigatório' });
        const r = await pool.query(
          'DELETE FROM roteiros_padaria WHERE id = $1 AND deletado_em IS NOT NULL RETURNING id, nome_empresa, data_producao',
          [id]
        );
        if (r.rows.length === 0) {
          return res.status(404).json({ success: false, message: 'Lista de produção não encontrada na restauração' });
        }
        registrarAcaoManual({
          usuario_id: req.usuario.id,
          usuario_nome: req.usuario.nome || 'Desconhecido',
          usuario_email: req.usuario.email || 'desconhecido@email.com',
          acao: 'EXCLUIR_DEFINITIVO',
          entidade: 'roteiro',
          entidade_id: id,
          descricao: `Excluiu permanentemente lista de produção "${r.rows[0].nome_empresa}" (${r.rows[0].data_producao})`,
          user_agent,
        }).catch(() => {});
        return res.json({ success: true, message: 'Lista de produção excluída permanentemente' });
      }

      return res.status(400).json({ success: false, message: 'Tipo inválido' });
    } catch (error) {
      console.error('Erro ao excluir definitivamente:', error);
      next(error);
    }
  }

  /**
   * POST /lixeira/limpar-tudo - Exclui permanentemente TODOS os itens da restauração (apenas admin)
   */
  static async limparTudo(req, res, next) {
    try {
      const usuarioAtual = await UsuarioModel.findById(req.usuario.id);
      const isAdmin = usuarioAtual && (usuarioAtual.is_admin === true || usuarioAtual.is_admin === 1);

      if (!isAdmin) {
        return res.status(403).json({
          success: false,
          message: 'Apenas administradores podem limpar a restauração',
        });
      }

      const user_agent = req.headers['user-agent'] || 'unknown';

      const [rProdutos, rEmpresas, rMotoristas, rMassas, rRoteiros] = await Promise.all([
        pool.query('DELETE FROM produtos_padaria WHERE deletado_em IS NOT NULL RETURNING id, nome'),
        pool.query('DELETE FROM empresas_padaria WHERE deletado_em IS NOT NULL RETURNING id, nome'),
        pool.query('DELETE FROM motoristas_padaria WHERE deletado_em IS NOT NULL RETURNING id, nome'),
        pool.query('DELETE FROM massas_padaria WHERE deletado_em IS NOT NULL RETURNING id, nome'),
        pool.query('DELETE FROM roteiros_padaria WHERE deletado_em IS NOT NULL RETURNING id, nome_empresa'),
      ]);

      const total =
        rProdutos.rows.length +
        rEmpresas.rows.length +
        rMotoristas.rows.length +
        rMassas.rows.length +
        rRoteiros.rows.length;

      if (total > 0) {
        registrarAcaoManual({
          usuario_id: req.usuario.id,
          usuario_nome: req.usuario.nome || 'Desconhecido',
          usuario_email: req.usuario.email || 'desconhecido@email.com',
          acao: 'LIMPAR_RESTAURACAO',
          entidade: 'lixeira',
          entidade_id: null,
          descricao: `Limpou toda a restauração: ${total} itens excluídos permanentemente`,
          user_agent,
        }).catch(() => {});
      }

      return res.json({
        success: true,
        message: `${total} item(ns) excluído(s) permanentemente da restauração`,
        data: { total },
      });
    } catch (error) {
      console.error('Erro ao limpar restauração:', error);
      next(error);
    }
  }
}

module.exports = LixeiraController;
