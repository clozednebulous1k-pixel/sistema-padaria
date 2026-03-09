const RoteiroService = require('../services/RoteiroService');
const { isValidDate, normalizeDate } = require('../utils/dateUtils');
const { registrarAcaoManual } = require('../middlewares/auditMiddleware');

class RoteiroController {
  /**
   * Cria um novo roteiro
   * POST /roteiros
   */
  static async criar(req, res, next) {
    try {
      const { nome_empresa, data_producao, observacoes, status, itens, motorista, periodo } = req.body;

      // Validações básicas
      if (!nome_empresa || nome_empresa.trim() === '') {
        return res.status(400).json({
          success: false,
          message: 'Nome da empresa é obrigatório',
        });
      }

      if (!data_producao) {
        return res.status(400).json({
          success: false,
          message: 'Data de produção é obrigatória',
        });
      }

      // Normalizar e validar data
      const dataNormalizada = normalizeDate(data_producao);
      if (!dataNormalizada || !isValidDate(data_producao)) {
        return res.status(400).json({
          success: false,
          message: 'Data de produção inválida. Use o formato YYYY-MM-DD (ex: 2024-01-15)',
        });
      }

      if (!itens || !Array.isArray(itens)) {
        return res.status(400).json({
          success: false,
          message: 'Itens deve ser um array (pode ser vazio para adicionar itens depois)',
        });
      }

      // Validar estrutura dos itens (quando houver)
      for (const item of itens) {
        if (!item.produto_id) {
          return res.status(400).json({
            success: false,
            message: 'Cada item deve conter produto_id',
          });
        }
        if (!item.quantidade || item.quantidade <= 0) {
          return res.status(400).json({
            success: false,
            message: 'Quantidade deve ser maior que zero',
          });
        }
      }

      const roteiro = await RoteiroService.criarRoteiro({
        nome_empresa: nome_empresa.trim(),
        data_producao: dataNormalizada,
        observacoes,
        status,
        itens,
        motorista: motorista ? motorista.trim() : null,
        periodo: periodo ? periodo.trim() : null,
      });

      // Registrar ação detalhada na auditoria (apenas se usuário estiver autenticado)
      if (req.usuario && req.usuario.id) {
        const user_agent = req.headers['user-agent'] || 'unknown';
        
        // Buscar nomes dos produtos para a descrição
        const ProdutoModel = require('../models/ProdutoModel');
        const produtosInfo = [];
        for (const item of itens) {
          try {
            const produto = await ProdutoModel.findById(item.produto_id);
            if (produto) {
              produtosInfo.push(`${produto.nome} (${item.quantidade}x)`);
            }
          } catch (err) {
            produtosInfo.push(`Produto ID ${item.produto_id} (${item.quantidade}x)`);
          }
        }
        
        let descricaoDetalhada = `Adicionou pedido para "${nome_empresa.trim()}"`;
        if (motorista) {
          descricaoDetalhada += ` com motorista "${motorista.trim()}"`;
        }
        if (periodo) {
          descricaoDetalhada += ` (${periodo})`;
        }
        descricaoDetalhada += ` com ${itens.length} item${itens.length > 1 ? 's' : ''}`;
        if (dataNormalizada) {
          descricaoDetalhada += ` para ${dataNormalizada}`;
        }
        if (produtosInfo.length > 0) {
          descricaoDetalhada += `: ${produtosInfo.slice(0, 3).join(', ')}`;
          if (produtosInfo.length > 3) {
            descricaoDetalhada += ` e mais ${produtosInfo.length - 3}`;
          }
        }

        await registrarAcaoManual({
          usuario_id: req.usuario.id,
          usuario_nome: req.usuario.nome || 'Desconhecido',
          usuario_email: req.usuario.email || 'desconhecido@email.com',
          acao: 'ADICIONAR',
          entidade: 'roteiro',
          entidade_id: roteiro.id,
          descricao: descricaoDetalhada,
          dados_novos: {
            nome_empresa: nome_empresa.trim(),
            data_producao: dataNormalizada,
            motorista: motorista ? motorista.trim() : null,
            periodo: periodo ? periodo.trim() : null,
            total_itens: itens.length,
            itens: produtosInfo,
          },
          user_agent,
        }).catch((err) => {
          console.error('Erro ao registrar criação de roteiro na auditoria:', err);
        });
      }

      // Marcar que a auditoria já foi registrada manualmente para evitar duplicação
      res.status(201).json({
        success: true,
        message: 'Roteiro criado com sucesso',
        data: roteiro,
        _auditRegistered: true, // Flag para o middleware não registrar novamente
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Lista todos os roteiros
   * GET /roteiros
   */
  static async listar(req, res, next) {
    try {
      const filters = {};

      if (req.query.status) {
        filters.status = req.query.status;
      }

      if (req.query.data_producao) {
        filters.data_producao = req.query.data_producao;
      }

      if (req.query.data_inicio && req.query.data_fim) {
        filters.data_inicio = req.query.data_inicio;
        filters.data_fim = req.query.data_fim;
      }

      if (req.query.motorista) {
        filters.motorista = req.query.motorista;
      }

      if (req.query.periodo) {
        filters.periodo = req.query.periodo;
      }

      const roteiros = await RoteiroService.listarRoteiros(filters);

      res.json({
        success: true,
        data: roteiros,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Busca um roteiro por ID
   * GET /roteiros/:id
   */
  static async buscarPorId(req, res, next) {
    try {
      const { id } = req.params;
      const roteiro = await RoteiroService.buscarRoteiroPorId(id);

      res.json({
        success: true,
        data: roteiro,
      });
    } catch (error) {
      if (error.message === 'Roteiro não encontrado') {
        return res.status(404).json({
          success: false,
          message: error.message,
        });
      }
      next(error);
    }
  }

  /**
   * Atualiza um roteiro
   * PUT /roteiros/:id
   */
  static async atualizar(req, res, next) {
    try {
      const { id } = req.params;
      const { nome_empresa, data_producao, observacoes, status, motorista, periodo } = req.body;

      const dadosAtualizacao = {};
      if (nome_empresa !== undefined) dadosAtualizacao.nome_empresa = nome_empresa.trim();
      if (data_producao !== undefined) {
        // Normalizar e validar data
        const dataNormalizada = normalizeDate(data_producao);
        if (!dataNormalizada || !isValidDate(data_producao)) {
          return res.status(400).json({
            success: false,
            message: 'Data de produção inválida. Use o formato YYYY-MM-DD (ex: 2024-01-15)',
          });
        }
        dadosAtualizacao.data_producao = dataNormalizada;
      }
      if (observacoes !== undefined) dadosAtualizacao.observacoes = observacoes;
      if (status !== undefined) dadosAtualizacao.status = status;
      if (motorista !== undefined) dadosAtualizacao.motorista = motorista ? motorista.trim() : null;
      if (periodo !== undefined) dadosAtualizacao.periodo = periodo ? periodo.trim() : null;

      // Buscar roteiro antes de atualizar para ter informações
      const roteiroAntes = await RoteiroService.buscarRoteiroPorId(id).catch(() => null);
      
      const roteiro = await RoteiroService.atualizarRoteiro(id, dadosAtualizacao);

      // Registrar ação na auditoria (apenas se usuário estiver autenticado)
      if (req.usuario && req.usuario.id) {
        const user_agent = req.headers['user-agent'] || 'unknown';
        
        const camposAlterados = [];
        if (nome_empresa !== undefined && nome_empresa !== roteiroAntes?.nome_empresa) camposAlterados.push('empresa');
        if (data_producao !== undefined) camposAlterados.push('data');
        if (status !== undefined && status !== roteiroAntes?.status) camposAlterados.push('status');
        if (motorista !== undefined && motorista !== roteiroAntes?.motorista) camposAlterados.push('motorista');
        if (periodo !== undefined && periodo !== roteiroAntes?.periodo) camposAlterados.push('período');
        
        let descricaoDetalhada = `Editou pedido`;
        if (roteiroAntes?.nome_empresa) {
          descricaoDetalhada += ` "${roteiroAntes.nome_empresa}"`;
        }
        descricaoDetalhada += ` (ID: ${id})`;
        if (camposAlterados.length > 0) {
          descricaoDetalhada += `: alterou ${camposAlterados.join(', ')}`;
        }

        registrarAcaoManual({
          usuario_id: req.usuario.id,
          usuario_nome: req.usuario.nome || 'Desconhecido',
          usuario_email: req.usuario.email || 'desconhecido@email.com',
          acao: 'EDITAR',
          entidade: 'roteiro',
          entidade_id: parseInt(id, 10),
          descricao: descricaoDetalhada,
          dados_anteriores: roteiroAntes ? {
            nome_empresa: roteiroAntes.nome_empresa,
            data_producao: roteiroAntes.data_producao,
            status: roteiroAntes.status,
            motorista: roteiroAntes.motorista,
          } : null,
          dados_novos: {
            nome_empresa: roteiro.nome_empresa,
            data_producao: roteiro.data_producao,
            status: roteiro.status,
            motorista: roteiro.motorista,
          },
          user_agent,
        }).catch((err) => {
          console.error('Erro ao registrar atualização de roteiro na auditoria:', err);
        });
      }

      res.json({
        success: true,
        message: 'Roteiro atualizado com sucesso',
        data: roteiro,
      });
    } catch (error) {
      if (error.message === 'Roteiro não encontrado') {
        return res.status(404).json({
          success: false,
          message: error.message,
        });
      }
      next(error);
    }
  }

  /**
   * Atualiza os itens de um roteiro
   * PUT /roteiros/:id/itens
   */
  static async atualizarItens(req, res, next) {
    try {
      const { id } = req.params;
      const { itens } = req.body;

      if (!itens || !Array.isArray(itens)) {
        return res.status(400).json({
          success: false,
          message: 'Itens deve ser um array',
        });
      }

      // Validar estrutura dos itens
      for (const item of itens) {
        if (!item.produto_id) {
          return res.status(400).json({
            success: false,
            message: 'Cada item deve conter produto_id',
          });
        }
        if (!item.quantidade || item.quantidade <= 0) {
          return res.status(400).json({
            success: false,
            message: 'Quantidade deve ser maior que zero',
          });
        }
      }

      // Buscar roteiro antes de atualizar para ter informações
      const roteiroAntes = await RoteiroService.buscarRoteiroPorId(id);
      
      const roteiro = await RoteiroService.atualizarItensRoteiro(id, itens);

      // Registrar ação detalhada na auditoria (apenas se usuário estiver autenticado)
      if (req.usuario && req.usuario.id) {
        const user_agent = req.headers['user-agent'] || 'unknown';
        
        const itensAnteriores = roteiroAntes?.itens?.length || 0;
        const itensNovos = itens.length;
        
        // Buscar nomes dos produtos para a descrição
        const ProdutoModel = require('../models/ProdutoModel');
        const produtosInfo = [];
        for (const item of itens) {
          try {
            const produto = await ProdutoModel.findById(item.produto_id);
            if (produto) {
              produtosInfo.push(`${produto.nome} (${item.quantidade}x)`);
            }
          } catch (err) {
            produtosInfo.push(`Produto ID ${item.produto_id} (${item.quantidade}x)`);
          }
        }
        
        let descricaoDetalhada = `Editou itens do pedido`;
        if (roteiroAntes?.nome_empresa) {
          descricaoDetalhada += ` "${roteiroAntes.nome_empresa}"`;
        }
        descricaoDetalhada += ` (ID: ${id})`;
        if (itensAnteriores !== itensNovos) {
          descricaoDetalhada += `: ${itensAnteriores} → ${itensNovos} item${itensNovos > 1 ? 's' : ''}`;
        } else {
          descricaoDetalhada += `: ${itensNovos} item${itensNovos > 1 ? 's' : ''}`;
        }
        if (produtosInfo.length > 0) {
          descricaoDetalhada += ` - ${produtosInfo.slice(0, 3).join(', ')}`;
          if (produtosInfo.length > 3) {
            descricaoDetalhada += ` e mais ${produtosInfo.length - 3}`;
          }
        }

        registrarAcaoManual({
          usuario_id: req.usuario.id,
          usuario_nome: req.usuario.nome || 'Desconhecido',
          usuario_email: req.usuario.email || 'desconhecido@email.com',
          acao: 'EDITOU_ITENS',
          entidade: 'roteiro',
          entidade_id: parseInt(id, 10),
          descricao: descricaoDetalhada,
          dados_anteriores: {
            total_itens: itensAnteriores,
            nome_empresa: roteiroAntes?.nome_empresa,
            itens: roteiroAntes?.itens?.map(i => `${i.produto_nome || 'Produto'} (${i.quantidade}x)`) || [],
          },
          dados_novos: {
            total_itens: itensNovos,
            nome_empresa: roteiro?.nome_empresa,
            itens: produtosInfo,
          },
          user_agent,
        }).catch((err) => {
          console.error('Erro ao registrar atualização de itens na auditoria:', err);
        });
      }

      res.json({
        success: true,
        message: 'Itens do roteiro atualizados com sucesso',
        data: roteiro,
      });
    } catch (error) {
      if (error.message === 'Roteiro não encontrado') {
        return res.status(404).json({
          success: false,
          message: error.message,
        });
      }
      next(error);
    }
  }

  /**
   * Gera dados formatados para impressão
   * GET /roteiros/:id/impressao
   */
  static async gerarImpressao(req, res, next) {
    try {
      const { id } = req.params;
      const dadosImpressao = await RoteiroService.gerarDadosImpressao(id);

      // Registrar ação de impressão na auditoria (apenas se usuário estiver autenticado)
      if (req.usuario && req.usuario.id) {
        const user_agent = req.headers['user-agent'] || 'unknown';
        
        let descricaoDetalhada = `Imprimiu pedido`;
        if (dadosImpressao?.nome_empresa) {
          descricaoDetalhada += ` "${dadosImpressao.nome_empresa}"`;
        }
        descricaoDetalhada += ` (ID: ${id})`;
        if (dadosImpressao?.data_producao) {
          descricaoDetalhada += ` para ${dadosImpressao.data_producao}`;
        }

        registrarAcaoManual({
          usuario_id: req.usuario.id,
          usuario_nome: req.usuario.nome || 'Desconhecido',
          usuario_email: req.usuario.email || 'desconhecido@email.com',
          acao: 'IMPRIMIR',
          entidade: 'roteiro',
          entidade_id: parseInt(id, 10),
          descricao: descricaoDetalhada,
          dados_novos: {
            nome_empresa: dadosImpressao?.nome_empresa,
            data_producao: dadosImpressao?.data_producao,
          },
          user_agent,
        }).catch((err) => {
          console.error('Erro ao registrar impressão na auditoria:', err);
        });
      }

      res.json({
        success: true,
        data: dadosImpressao,
      });
    } catch (error) {
      if (error.message === 'Roteiro não encontrado') {
        return res.status(404).json({
          success: false,
          message: error.message,
        });
      }
      next(error);
    }
  }

  /**
   * Deleta um roteiro
   * DELETE /roteiros/:id
   */
  static async deletar(req, res, next) {
    try {
      const { id } = req.params;
      
      // Buscar roteiro antes de deletar para ter informações
      const roteiroAntes = await RoteiroService.buscarRoteiroPorId(id).catch(() => null);
      
      const resultado = await RoteiroService.deletarRoteiro(id);

      // Registrar ação de exclusão na auditoria (apenas se usuário estiver autenticado)
      if (req.usuario && req.usuario.id) {
        const user_agent = req.headers['user-agent'] || 'unknown';
        
        let descricaoDetalhada = `Excluiu pedido`;
        if (roteiroAntes?.nome_empresa) {
          descricaoDetalhada += ` "${roteiroAntes.nome_empresa}"`;
        }
        descricaoDetalhada += ` (ID: ${id})`;
        if (roteiroAntes?.data_producao) {
          descricaoDetalhada += ` de ${roteiroAntes.data_producao}`;
        }

        registrarAcaoManual({
          usuario_id: req.usuario.id,
          usuario_nome: req.usuario.nome || 'Desconhecido',
          usuario_email: req.usuario.email || 'desconhecido@email.com',
          acao: 'EXCLUIR',
          entidade: 'roteiro',
          entidade_id: parseInt(id, 10),
          descricao: descricaoDetalhada,
          dados_anteriores: roteiroAntes ? {
            nome_empresa: roteiroAntes.nome_empresa,
            data_producao: roteiroAntes.data_producao,
            motorista: roteiroAntes.motorista,
          } : null,
          user_agent,
        }).catch((err) => {
          console.error('Erro ao registrar exclusão de roteiro na auditoria:', err);
        });
      }

      res.json({
        success: true,
        message: resultado.message,
      });
    } catch (error) {
      if (error.message === 'Roteiro não encontrado') {
        return res.status(404).json({
          success: false,
          message: error.message,
        });
      }
      next(error);
    }
  }
}

module.exports = RoteiroController;
