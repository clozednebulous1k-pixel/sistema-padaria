const pool = require('../config/database');
const RoteiroModel = require('../models/RoteiroModel');
const RoteiroItemModel = require('../models/RoteiroItemModel');
const ProdutoModel = require('../models/ProdutoModel');
const { normalizeDate } = require('../utils/dateUtils');

class RoteiroService {
  /**
   * Cria um novo roteiro com seus itens
   * Utiliza transação SQL para garantir integridade
   */
  static async criarRoteiro({ nome_empresa, data_producao, observacoes, status, itens, venda_id, motorista, periodo }) {
    const client = await pool.connect();

    try {
      await client.query('BEGIN');

      // Itens podem ser vazios: roteiro pode ser criado e itens adicionados depois via PUT /roteiros/:id/itens
      if (!itens || !Array.isArray(itens)) {
        throw new Error('Itens deve ser um array');
      }

      // Normalizar data antes de salvar (garantir formato YYYY-MM-DD)
      const dataNormalizada = normalizeDate(data_producao);
      if (!dataNormalizada) {
        throw new Error('Data de produção inválida');
      }

      // Criar roteiro
      const roteiroResult = await client.query(
        `INSERT INTO roteiros_padaria (nome_empresa, data_producao, observacoes, status, venda_id, motorista, periodo)
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         RETURNING *`,
        [nome_empresa, dataNormalizada, observacoes || null, status || 'pendente', venda_id || null, motorista || null, periodo || null]
      );

      const roteiro = roteiroResult.rows[0];

      // Criar itens (se houver)
      const itensCriados = [];
      for (const item of itens) {
        // Verificar se produto existe e está ativo
        const produto = await client.query(
          'SELECT id, nome, ativo FROM produtos_padaria WHERE id = $1',
          [item.produto_id]
        );

        if (produto.rows.length === 0) {
          throw new Error(`Produto com ID ${item.produto_id} não encontrado`);
        }

        if (!produto.rows[0].ativo) {
          throw new Error(`Produto com ID ${item.produto_id} está inativo`);
        }

        if (!item.quantidade || item.quantidade <= 0) {
          throw new Error(`Quantidade deve ser maior que zero para produto ${item.produto_id}`);
        }

        // Criar item
        const itemResult = await client.query(
          `INSERT INTO roteiro_itens_padaria (roteiro_id, produto_id, quantidade, observacao)
           VALUES ($1, $2, $3, $4)
           RETURNING *`,
          [roteiro.id, item.produto_id, item.quantidade, item.observacao || null]
        );

        itensCriados.push(itemResult.rows[0]);
      }

      await client.query('COMMIT');

      // Buscar dados completos do roteiro
      const roteiroCompleto = await RoteiroModel.findById(roteiro.id);

      return roteiroCompleto;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Busca roteiros com filtros opcionais
   */
  static async listarRoteiros(filters = {}) {
    const roteiros = await RoteiroModel.findAll(filters);
    return roteiros;
  }

  /**
   * Busca um roteiro por ID
   */
  static async buscarRoteiroPorId(id) {
    const roteiro = await RoteiroModel.findById(id);
    if (!roteiro) {
      throw new Error('Roteiro não encontrado');
    }
    return roteiro;
  }

  /**
   * Atualiza um roteiro
   */
  static async atualizarRoteiro(id, dados) {
    const roteiroExistente = await RoteiroModel.findById(id);
    if (!roteiroExistente) {
      throw new Error('Roteiro não encontrado');
    }

    const roteiro = await RoteiroModel.update(id, dados);
    return roteiro;
  }

  /**
   * Atualiza os itens de um roteiro
   */
  static async atualizarItensRoteiro(roteiro_id, itens) {
    const client = await pool.connect();

    try {
      await client.query('BEGIN');

      // Verificar se roteiro existe
      const roteiro = await client.query('SELECT id FROM roteiros_padaria WHERE id = $1', [roteiro_id]);
      if (roteiro.rows.length === 0) {
        throw new Error('Roteiro não encontrado');
      }

      // Deletar itens existentes (usar client da transação)
      await client.query('DELETE FROM roteiro_itens_padaria WHERE roteiro_id = $1', [roteiro_id]);

      // Criar novos itens
      if (itens && itens.length > 0) {
        for (const item of itens) {
          // Validar produto
          const produto = await client.query(
            'SELECT id, ativo FROM produtos_padaria WHERE id = $1',
            [item.produto_id]
          );

          if (produto.rows.length === 0) {
            throw new Error(`Produto com ID ${item.produto_id} não encontrado`);
          }

          if (!produto.rows[0].ativo) {
            throw new Error(`Produto com ID ${item.produto_id} está inativo`);
          }

          if (!item.quantidade || item.quantidade <= 0) {
            throw new Error(`Quantidade deve ser maior que zero`);
          }

          await client.query(
            `INSERT INTO roteiro_itens_padaria (roteiro_id, produto_id, quantidade, observacao)
             VALUES ($1, $2, $3, $4)`,
            [roteiro_id, item.produto_id, item.quantidade, item.observacao || null]
          );
        }
      }

      await client.query('COMMIT');

      // Retornar roteiro atualizado
      return await RoteiroModel.findById(roteiro_id);
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Gera dados formatados para impressão do roteiro
   */
  static async gerarDadosImpressao(id) {
    const roteiro = await this.buscarRoteiroPorId(id);

    return {
      roteiro_id: roteiro.id,
      nome_empresa: roteiro.nome_empresa,
      data_producao: roteiro.data_producao,
      observacoes: roteiro.observacoes,
      status: roteiro.status,
      motorista: roteiro.motorista,
      periodo: roteiro.periodo,
      criado_em: roteiro.criado_em,
      itens: roteiro.itens.map(item => ({
        produto_id: item.produto_id,
        produto_nome: item.produto_nome,
        produto_descricao: item.produto_descricao,
        quantidade: item.quantidade,
        observacao: item.observacao,
      })),
      total_produtos: roteiro.itens.length,
      total_quantidade: roteiro.itens.reduce((sum, item) => sum + parseInt(item.quantidade), 0),
    };
  }

  /**
   * Deleta um roteiro (soft delete - vai para restauração)
   */
  static async deletarRoteiro(id) {
    const roteiro = await RoteiroModel.findById(id);
    if (!roteiro) {
      throw new Error('Roteiro não encontrado');
    }

    await RoteiroModel.softDelete(id);
    return { message: 'Lista de produção excluída. Você pode restaurá-la na página Restauração.' };
  }
}

module.exports = RoteiroService;
