const AuditoriaModel = require('../models/AuditoriaModel');

/**
 * Middleware para registrar ações dos usuários na auditoria
 * Deve ser usado após o authMiddleware para ter acesso ao req.usuario
 */
const auditMiddleware = (options = {}) => {
  return async (req, res, next) => {
    // Salvar função original de res.json para interceptar a resposta
    const originalJson = res.json.bind(res);

    // Sobrescrever res.json para capturar a resposta
    res.json = function (data) {
      // Registrar auditoria apenas se a requisição foi bem-sucedida
      if (res.statusCode >= 200 && res.statusCode < 300) {
        registrarAuditoria(req, res, data, options).catch((err) => {
          console.error('Erro ao registrar auditoria:', err);
          // Não interromper a resposta por erro na auditoria
        });
      }
      return originalJson(data);
    };

    next();
  };
};

/**
 * Função auxiliar para registrar a auditoria
 */
async function registrarAuditoria(req, res, responseData, options) {
  // Se não houver usuário autenticado, não registrar
  if (!req.usuario || !req.usuario.id) {
    return;
  }

  // Se a opção skip estiver definida e for verdadeira, pular
  if (options.skip === true) {
    return;
  }

  // Não registrar ações na própria rota de auditoria para evitar loop
  if (req.path.startsWith('/auditoria')) {
    return;
  }

  // Determinar ação e entidade baseada na rota e método HTTP
  const pathParts = req.path.split('/').filter(Boolean);
  let entidade = pathParts[0] || 'unknown';
  let acao = 'VIEW';
  let descricao = '';
  let entidade_id = null;
  
  // Mapear rotas para entidades mais amigáveis
  const entidadeMap = {
    produtos: 'produto',
    roteiros: 'roteiro',
    motoristas: 'motorista',
    empresas: 'empresa',
    usuarios: 'usuario',
    auth: 'autenticacao',
  };
  entidade = entidadeMap[entidade] || entidade;

  // Detectar ações específicas baseadas na rota
  if (req.path.includes('/impressao')) {
    acao = 'IMPRIMIR';
    entidade_id = pathParts[1] ? parseInt(pathParts[1], 10) : null;
    descricao = `Imprimiu ${entidade}`;
    if (entidade_id) descricao += ` ID ${entidade_id}`;
  } else if (req.path.includes('/itens')) {
    acao = 'ATUALIZAR_ITENS';
    entidade_id = pathParts[1] ? parseInt(pathParts[1], 10) : null;
    descricao = `Atualizou itens do ${entidade}`;
    if (entidade_id) descricao += ` ID ${entidade_id}`;
    // Adicionar detalhes dos itens se disponível
    if (req.body && req.body.itens && Array.isArray(req.body.itens)) {
      const totalItens = req.body.itens.length;
      descricao += ` (${totalItens} item${totalItens > 1 ? 's' : ''})`;
    }
  } else if (req.method === 'POST') {
    acao = 'ADICIONAR';
    // Se a resposta já contém uma descrição detalhada (do registro manual), pular o registro automático
    // Isso evita duplicação quando o controller já registrou manualmente
    if (responseData && responseData._auditRegistered) {
      return; // Já foi registrado manualmente, não registrar novamente
    }
    descricao = `Adicionou ${entidade}`;
    // Adicionar detalhes específicos baseados na entidade
    if (entidade === 'roteiro' && req.body?.nome_empresa) {
      descricao += ` para "${req.body.nome_empresa}"`;
      if (req.body?.itens && Array.isArray(req.body.itens)) {
        descricao += ` com ${req.body.itens.length} item${req.body.itens.length > 1 ? 's' : ''}`;
      }
      if (req.body?.data_producao) {
        descricao += ` para ${req.body.data_producao}`;
      }
    } else if (entidade === 'produto' && req.body?.nome) {
      descricao += ` "${req.body.nome}"`;
    } else if (entidade === 'motorista' && req.body?.nome) {
      descricao += ` "${req.body.nome}"`;
    } else if (entidade === 'empresa' && req.body?.nome) {
      descricao += ` "${req.body.nome}"`;
    } else if (entidade === 'usuario' && req.body?.nome) {
      descricao += ` "${req.body.nome}"`;
    }
  } else if (req.method === 'PUT' || req.method === 'PATCH') {
    acao = 'EDITAR';
    entidade_id = pathParts[1] ? parseInt(pathParts[1], 10) : null;
    descricao = `Editou ${entidade}`;
    if (entidade_id) descricao += ` ID ${entidade_id}`;
    // Adicionar detalhes do que foi alterado
    if (req.body) {
      const camposAlterados = Object.keys(req.body).filter(k => k !== 'senha' && k !== 'password');
      if (camposAlterados.length > 0) {
        descricao += ` (${camposAlterados.join(', ')})`;
      }
    }
  } else if (req.method === 'DELETE') {
    acao = 'EXCLUIR';
    entidade_id = pathParts[1] ? parseInt(pathParts[1], 10) : null;
    descricao = `Excluiu ${entidade}`;
    if (entidade_id) descricao += ` ID ${entidade_id}`;
    // Tentar adicionar nome se disponível na resposta
    if (responseData?.data?.nome) {
      descricao += ` "${responseData.data.nome}"`;
    } else if (responseData?.data?.nome_empresa) {
      descricao += ` "${responseData.data.nome_empresa}"`;
    }
  } else if (req.method === 'GET') {
    // Não registrar visualizações - apenas cliques em botões serão registrados
    return;
  }

  // Extrair ID da entidade se ainda não foi extraído
  if (!entidade_id && pathParts.length > 1 && !isNaN(pathParts[1])) {
    entidade_id = parseInt(pathParts[1], 10);
  } else if (!entidade_id && req.params.id) {
    entidade_id = parseInt(req.params.id, 10);
  }
  
  // Para POST, tentar extrair ID da resposta
  if (!entidade_id && acao === 'CRIAR' && responseData && responseData.data && responseData.data.id) {
    entidade_id = parseInt(responseData.data.id, 10);
  }

  // Preparar dados para auditoria
  let dados_novos = null;
  let dados_anteriores = null;

  // Para ADICIONAR e EDITAR, capturar dados do body
  if (['ADICIONAR', 'EDITAR', 'CRIAR', 'ATUALIZAR'].includes(acao) && req.body) {
    // Remover senha e dados sensíveis
    const bodyCopy = { ...req.body };
    if (bodyCopy.senha) delete bodyCopy.senha;
    if (bodyCopy.password) delete bodyCopy.password;
    dados_novos = bodyCopy;
  }

  // Para EDITAR, tentar capturar dados anteriores da resposta
  if (['EDITAR', 'ATUALIZAR'].includes(acao) && responseData && responseData.data) {
    // Se a resposta contiver dados anteriores, usar eles
    if (responseData.data.dados_anteriores) {
      dados_anteriores = responseData.data.dados_anteriores;
    }
  }

  // Para DELETE, capturar dados da resposta se disponível
  if (acao === 'DELETE' && responseData && responseData.data) {
    dados_anteriores = responseData.data;
  }

  // Capturar User-Agent
  const user_agent = req.headers['user-agent'] || 'unknown';

  // Registrar na auditoria
  try {
    const resultado = await AuditoriaModel.criar({
      usuario_id: req.usuario.id,
      usuario_nome: req.usuario.nome || 'Desconhecido',
      usuario_email: req.usuario.email || 'desconhecido@email.com',
      acao,
      entidade,
      entidade_id,
      descricao,
      dados_anteriores,
      dados_novos,
      user_agent,
    });
    console.log(`[AUDITORIA] Registrado: ${acao} ${entidade} (ID: ${entidade_id}) - ${descricao}`);
  } catch (error) {
    // Log do erro mas não interromper a requisição
    console.error('Erro ao registrar auditoria:', error);
    console.error('Detalhes do erro:', error.message, error.stack);
  }
}

/**
 * Função auxiliar para registrar ações específicas manualmente
 * Útil para ações que não seguem o padrão REST (ex: login, logout)
 */
async function registrarAcaoManual({
  usuario_id,
  usuario_nome,
  usuario_email,
  acao,
  entidade,
  entidade_id,
  descricao,
  dados_anteriores,
  dados_novos,
  user_agent,
}) {
  try {
    const resultado = await AuditoriaModel.criar({
      usuario_id,
      usuario_nome,
      usuario_email,
      acao,
      entidade,
      entidade_id,
      descricao,
      dados_anteriores,
      dados_novos,
      user_agent,
    });
    console.log(`[AUDITORIA MANUAL] Registrado: ${acao} ${entidade} (ID: ${entidade_id}) - ${descricao}`);
    return resultado;
  } catch (error) {
    console.error('Erro ao registrar ação manual na auditoria:', error);
    console.error('Detalhes do erro:', error.message, error.stack);
    throw error; // Re-throw para que o controller possa ver o erro
  }
}

module.exports = {
  auditMiddleware,
  registrarAcaoManual,
};

