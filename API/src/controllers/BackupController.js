const pool = require('../config/database');

const DIAS_SEMANA = [
  'Segunda-feira', 'Terça-feira', 'Quarta-feira', 'Quinta-feira',
  'Sexta-feira', 'Sábado', 'Domingo'
];

class BackupController {
  /**
   * GET /backup - Exporta todos os dados do sistema
   */
  static async exportar(req, res, next) {
    try {
      const [produtos, empresasRaw, motoristas, massasResult, roteiros, roteiroItens] = await Promise.all([
        pool.query('SELECT * FROM produtos_padaria WHERE deletado_em IS NULL ORDER BY id'),
        pool.query('SELECT * FROM empresas_padaria WHERE deletado_em IS NULL ORDER BY id'),
        pool.query('SELECT * FROM motoristas_padaria WHERE deletado_em IS NULL ORDER BY id'),
        pool.query('SELECT * FROM massas_padaria WHERE deletado_em IS NULL ORDER BY ordem, nome').catch(() => ({ rows: [] })),
        pool.query('SELECT * FROM roteiros_padaria WHERE deletado_em IS NULL ORDER BY data_producao, id'),
        pool.query(`
          SELECT ri.*, p.nome as produto_nome
          FROM roteiro_itens_padaria ri
          LEFT JOIN produtos_padaria p ON p.id = ri.produto_id
          ORDER BY ri.roteiro_id, ri.id
        `)
      ]);

      const empresas = empresasRaw.rows.filter((e) => !DIAS_SEMANA.includes(e.nome));

      const itensPorRoteiro = {};
      roteiroItens.rows.forEach((item) => {
        if (!itensPorRoteiro[item.roteiro_id]) {
          itensPorRoteiro[item.roteiro_id] = [];
        }
        itensPorRoteiro[item.roteiro_id].push({
          produto_id: item.produto_id,
          produto_nome: item.produto_nome,
          quantidade: item.quantidade,
          observacao: item.observacao
        });
      });

      const roteirosComItens = roteiros.rows.map((r) => ({
        ...r,
        itens: itensPorRoteiro[r.id] || []
      }));

      const backup = {
        versao: 1,
        data_exportacao: new Date().toISOString(),
        dados: {
          produtos: produtos.rows,
          empresas,
          motoristas: motoristas.rows,
          massas: massasResult.rows || [],
          roteiros: roteirosComItens
        }
      };

      res.json({
        success: true,
        data: backup
      });
    } catch (error) {
      console.error('Erro ao exportar backup:', error);
      next(error);
    }
  }
}

module.exports = BackupController;
