const ProdutoModel = require('../models/ProdutoModel');
const { registrarAcaoManual } = require('../middlewares/auditMiddleware');

class ProdutoController {
  /**
   * Lista todos os produtos
   * GET /produtos
   */
  static async listar(req, res, next) {
    try {
      const includeInactive = req.query.includeInactive === 'true';
      const produtos = await ProdutoModel.findAll(includeInactive);
      
      res.json({
        success: true,
        data: produtos,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Busca um produto por ID
   * GET /produtos/:id
   */
  static async buscarPorId(req, res, next) {
    try {
      const { id } = req.params;
      const produto = await ProdutoModel.findById(id);

      if (!produto) {
        return res.status(404).json({
          success: false,
          message: 'Produto não encontrado',
        });
      }

      res.json({
        success: true,
        data: produto,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Cria um novo produto
   * POST /produtos
   */
  static async criar(req, res, next) {
    try {
      const { nome, descricao, preco, tipo_massa, opcao_relatorio, recheio } = req.body;

      // Validações
      if (!nome || nome.trim() === '') {
        return res.status(400).json({
          success: false,
          message: 'Nome do produto é obrigatório',
        });
      }

      // Validação de preço - aceita 0 se não for fornecido ou se for 0
      const precoNumero = preco ? parseFloat(preco) : 0;
      if (precoNumero < 0) {
        return res.status(400).json({
          success: false,
          message: 'Preço não pode ser negativo',
        });
      }

      const produto = await ProdutoModel.create({
        nome: nome.trim(),
        descricao: descricao?.trim() || null,
        preco: precoNumero,
        tipo_massa: tipo_massa?.trim() || null,
        opcao_relatorio: opcao_relatorio?.trim() || null,
        recheio: recheio?.trim() || null,
      });

      // Registrar ação na auditoria
      const user_agent = req.headers['user-agent'] || 'unknown';
      
      registrarAcaoManual({
        usuario_id: req.usuario.id,
        usuario_nome: req.usuario.nome || 'Desconhecido',
        usuario_email: req.usuario.email || 'desconhecido@email.com',
        acao: 'ADICIONAR',
        entidade: 'produto',
        entidade_id: produto.id,
        descricao: `Adicionou produto "${nome.trim()}"`,
        dados_novos: {
          nome: nome.trim(),
          preco: precoNumero,
        },
        user_agent,
      }).catch((err) => {
        console.error('Erro ao registrar criação de produto na auditoria:', err);
      });

      res.status(201).json({
        success: true,
        message: 'Produto criado com sucesso',
        data: produto,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Atualiza um produto
   * PUT /produtos/:id
   */
  static async atualizar(req, res, next) {
    try {
      const { id } = req.params;
      const { nome, descricao, preco, ativo, tipo_massa, opcao_relatorio, recheio } = req.body;

      // Verificar se produto existe
      const produtoExistente = await ProdutoModel.findById(id);
      if (!produtoExistente) {
        return res.status(404).json({
          success: false,
          message: 'Produto não encontrado',
        });
      }

      // Validações
      if (preco !== undefined) {
        const precoNumero = parseFloat(preco);
        if (precoNumero < 0) {
          return res.status(400).json({
            success: false,
            message: 'Preço não pode ser negativo',
          });
        }
      }

      const dadosAtualizacao = {};
      if (nome !== undefined) dadosAtualizacao.nome = nome.trim();
      if (descricao !== undefined) dadosAtualizacao.descricao = descricao?.trim() || null;
      if (preco !== undefined) dadosAtualizacao.preco = parseFloat(preco);
      if (ativo !== undefined) dadosAtualizacao.ativo = Boolean(ativo);
      if (tipo_massa !== undefined) dadosAtualizacao.tipo_massa = tipo_massa?.trim() || null;
      if (opcao_relatorio !== undefined) dadosAtualizacao.opcao_relatorio = opcao_relatorio?.trim() || null;
      if (recheio !== undefined) dadosAtualizacao.recheio = recheio?.trim() || null;

      const produto = await ProdutoModel.update(id, dadosAtualizacao);

      // Registrar ação na auditoria
      const user_agent = req.headers['user-agent'] || 'unknown';
      
      const camposAlterados = [];
      if (nome !== undefined && nome !== produtoExistente.nome) camposAlterados.push('nome');
      if (preco !== undefined && parseFloat(preco) !== parseFloat(produtoExistente.preco)) camposAlterados.push('preco');
      if (ativo !== undefined && Boolean(ativo) !== produtoExistente.ativo) camposAlterados.push('status');
      
      let descricaoDetalhada = `Editou produto "${produtoExistente.nome}"`;
      if (camposAlterados.length > 0) {
        descricaoDetalhada += `: alterou ${camposAlterados.join(', ')}`;
      }

      registrarAcaoManual({
        usuario_id: req.usuario.id,
        usuario_nome: req.usuario.nome || 'Desconhecido',
        usuario_email: req.usuario.email || 'desconhecido@email.com',
        acao: 'EDITAR',
        entidade: 'produto',
        entidade_id: parseInt(id, 10),
        descricao: descricaoDetalhada,
        dados_anteriores: {
          nome: produtoExistente.nome,
          preco: produtoExistente.preco,
          ativo: produtoExistente.ativo,
        },
        dados_novos: {
          nome: produto.nome,
          preco: produto.preco,
          ativo: produto.ativo,
        },
        user_agent,
      }).catch((err) => {
        console.error('Erro ao registrar atualização de produto na auditoria:', err);
      });

      res.json({
        success: true,
        message: 'Produto atualizado com sucesso',
        data: produto,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Desativa um produto (exclusão lógica)
   * DELETE /produtos/:id
   */
  static async deletar(req, res, next) {
    try {
      const { id } = req.params;

      const produto = await ProdutoModel.findById(id);
      if (!produto) {
        return res.status(404).json({
          success: false,
          message: 'Produto não encontrado',
        });
      }

      await ProdutoModel.softDelete(id);

      // Registrar ação na auditoria
      const user_agent = req.headers['user-agent'] || 'unknown';
      
      registrarAcaoManual({
        usuario_id: req.usuario.id,
        usuario_nome: req.usuario.nome || 'Desconhecido',
        usuario_email: req.usuario.email || 'desconhecido@email.com',
        acao: 'EXCLUIR',
        entidade: 'produto',
        entidade_id: parseInt(id, 10),
        descricao: `Excluiu produto "${produto.nome}"`,
        dados_anteriores: {
          nome: produto.nome,
          preco: produto.preco,
          ativo: produto.ativo,
        },
        user_agent,
      }).catch((err) => {
        console.error('Erro ao registrar exclusão de produto na auditoria:', err);
      });

      res.json({
        success: true,
        message: 'Produto desativado com sucesso',
      });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = ProdutoController;
