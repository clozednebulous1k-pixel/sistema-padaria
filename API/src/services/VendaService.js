const pool = require('../config/database');
const VendaModel = require('../models/VendaModel');
const VendaItemModel = require('../models/VendaItemModel');
const ProdutoModel = require('../models/ProdutoModel');
const RoteiroService = require('./RoteiroService');

class VendaService {
  /**
   * Cria uma nova venda com múltiplos produtos
   * Automaticamente cria um roteiro de produção associado
   * Utiliza transação SQL para garantir integridade
   */
  static async criarVenda({ itens, forma_pagamento, data_venda, nome_cliente }) {
    const client = await pool.connect();
    let venda = null;
    let dataVenda = null;
    let itensValidados = [];

    try {
      await client.query('BEGIN');

      // Validar produtos e calcular totais
      let valorTotal = 0;
      itensValidados = [];

      for (const item of itens) {
        // Verificar se produto existe e está ativo
        const produto = await client.query(
          'SELECT id, preco, ativo FROM produtos_padaria WHERE id = $1',
          [item.produto_id]
        );

        if (produto.rows.length === 0) {
          throw new Error(`Produto com ID ${item.produto_id} não encontrado`);
        }

        if (!produto.rows[0].ativo) {
          throw new Error(`Produto com ID ${item.produto_id} está inativo`);
        }

        if (item.quantidade <= 0) {
          throw new Error(`Quantidade deve ser maior que zero para produto ${item.produto_id}`);
        }

        // Usar preço atual do produto ou o preço informado (se houver)
        const precoUnitario = item.preco_unitario || produto.rows[0].preco;
        const subtotal = precoUnitario * item.quantidade;

        valorTotal += subtotal;

        itensValidados.push({
          produto_id: item.produto_id,
          quantidade: item.quantidade,
          preco_unitario: precoUnitario,
          subtotal: subtotal,
        });
      }

      if (itensValidados.length === 0) {
        throw new Error('Venda deve conter pelo menos um item');
      }

      // Criar venda
      dataVenda = data_venda || new Date().toISOString().split('T')[0];
      const vendaResult = await client.query(
        `INSERT INTO vendas_padaria (valor_total, data_venda, forma_pagamento, nome_cliente)
         VALUES ($1, $2, $3, $4)
         RETURNING *`,
        [valorTotal, dataVenda, forma_pagamento, nome_cliente || null]
      );

      venda = vendaResult.rows[0];

      // Criar itens da venda
      const itensCriados = [];
      for (const item of itensValidados) {
        const itemResult = await client.query(
          `INSERT INTO venda_itens_padaria (venda_id, produto_id, quantidade, preco_unitario, subtotal)
           VALUES ($1, $2, $3, $4, $5)
           RETURNING *`,
          [venda.id, item.produto_id, item.quantidade, item.preco_unitario, item.subtotal]
        );
        itensCriados.push(itemResult.rows[0]);
      }

      await client.query('COMMIT');
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }

    // Criar roteiro de produção automaticamente após a venda (se venda foi criada)
    if (venda && venda.id) {
      // Usar nome_cliente ou padrão "Venda #ID"
      const nomeEmpresaRoteiro = nome_cliente || `Venda #${venda.id}`;
      
      // Preparar itens do roteiro (mesmos produtos e quantidades da venda)
      const itensRoteiro = itensValidados.map(item => ({
        produto_id: item.produto_id,
        quantidade: item.quantidade,
        observacao: null,
      }));

      // Criar roteiro (fora da transação principal, mas com tratamento de erro)
      try {
        const roteiro = await RoteiroService.criarRoteiro({
          nome_empresa: nomeEmpresaRoteiro,
          data_producao: dataVenda,
          observacoes: `Roteiro gerado automaticamente da venda #${venda.id}`,
          status: 'pendente',
          itens: itensRoteiro,
          venda_id: venda.id,
        });
        
        // Adicionar informação do roteiro criado na resposta
        const vendaCompleta = await VendaModel.findById(venda.id);
        vendaCompleta.roteiro_id = roteiro.id;
        return vendaCompleta;
      } catch (roteiroError) {
        // Se falhar ao criar roteiro, logar mas não falhar a venda
        console.error('Erro ao criar roteiro automaticamente:', roteiroError.message);
        // Retornar venda mesmo sem roteiro
        return await VendaModel.findById(venda.id);
      }
    }

    // Se chegou aqui, retornar venda sem roteiro
    return await VendaModel.findById(venda.id);
  }

  /**
   * Busca todas as vendas com paginação
   */
  static async listarVendas(page = 1, limit = 100) {
    const offset = (page - 1) * limit;
    const vendas = await VendaModel.findAll(limit, offset);
    return vendas;
  }

  /**
   * Busca uma venda por ID
   */
  static async buscarVendaPorId(id) {
    const venda = await VendaModel.findById(id);
    if (!venda) {
      throw new Error('Venda não encontrada');
    }
    return venda;
  }
}

module.exports = VendaService;
