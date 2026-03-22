import axios from 'axios';

const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3503',
  headers: {
    'Content-Type': 'application/json',
  },
});

// Tipos
export interface Produto {
  id: number;
  nome: string;
  descricao: string;
  preco: string;
  ativo: boolean;
  tipo_massa?: string | null;
  opcao_relatorio?: string | null;
  recheio?: string | null;
  criado_em: string;
}

export interface VendaItem {
  produto_id: number;
  quantidade: number;
}

export interface VendaItemResponse {
  id: number;
  venda_id: number;
  produto_id: number;
  quantidade: number;
  preco_unitario: string;
  subtotal: string;
  produto_nome: string;
}

export interface Venda {
  id: number;
  valor_total: string;
  data_venda: string;
  forma_pagamento: string;
  nome_cliente?: string;
  roteiro_id?: number;
  criado_em: string;
  itens?: VendaItemResponse[];
  total_itens?: string;
}

export interface VendaRequest {
  itens: VendaItem[];
  forma_pagamento: string;
  data_venda: string;
  nome_cliente?: string;
}

export interface RelatorioVendas {
  periodo: {
    inicio: string;
    fim: string;
  };
  total_vendas: number;
  faturamento_total: number;
  vendas: Venda[];
}

export interface ProdutoMaisVendido {
  id: number;
  nome: string;
  quantidade_total_vendida: string;
  total_vendas: string;
  faturamento_produto: string;
}

// Tipos de Roteiros
export type RoteiroStatus = 'pendente' | 'em_producao' | 'concluido' | 'cancelado';

export interface RoteiroItem {
  produto_id: number;
  quantidade: number;
  observacao?: string;
}

export interface RoteiroItemResponse {
  id: number;
  roteiro_id: number;
  produto_id: number;
  quantidade: number;
  observacao: string | null;
  criado_em: string;
  produto_nome?: string;
  tipo_massa?: string | null;
  opcao_relatorio?: string | null;
  recheio?: string | null;
}

export interface Roteiro {
  id: number;
  nome_empresa: string;
  data_producao: string;
  periodo?: string | null;
  motorista?: string | null;
  observacoes: string | null;
  status: RoteiroStatus;
  criado_em: string;
  atualizado_em: string;
  itens?: RoteiroItemResponse[];
}

export interface RoteiroRequest {
  nome_empresa: string;
  data_producao: string;
  periodo?: string;
  motorista?: string;
  observacoes?: string;
  status?: RoteiroStatus;
  itens: RoteiroItem[];
}

export interface RoteiroFiltros {
  status?: RoteiroStatus;
  data_producao?: string;
}

// Tipos de Empresas e Motoristas
export interface Empresa {
  id: number;
  nome: string;
  criado_em: string;
}

export interface EmpresaRequest {
  nome: string;
}

export interface Motorista {
  id: number;
  nome: string;
  periodo: 'matutino' | 'noturno';
  criado_em: string;
}

export interface MotoristaRequest {
  nome: string;
  periodo: 'matutino' | 'noturno';
}

// API de Produtos
export const produtoApi = {
  listar: async (): Promise<Produto[]> => {
    const response = await api.get('/produtos');
    return response.data.data || response.data;
  },

  buscar: async (id: number): Promise<Produto> => {
    const response = await api.get(`/produtos/${id}`);
    return response.data.data || response.data;
  },

  criar: async (produto: Omit<Produto, 'id' | 'ativo' | 'criado_em'>): Promise<Produto> => {
    const response = await api.post('/produtos', produto);
    return response.data.data;
  },

  atualizar: async (id: number, produto: Partial<Produto>): Promise<Produto> => {
    const response = await api.put(`/produtos/${id}`, produto);
    return response.data.data;
  },

  desativar: async (id: number): Promise<void> => {
    await api.delete(`/produtos/${id}`);
  },
};

// API de Vendas
export const vendaApi = {
  listar: async (): Promise<Venda[]> => {
    const response = await api.get('/vendas');
    return response.data.data || response.data;
  },

  buscar: async (id: number): Promise<Venda> => {
    const response = await api.get(`/vendas/${id}`);
    return response.data.data || response.data;
  },

  criar: async (venda: VendaRequest): Promise<Venda> => {
    const response = await api.post('/vendas', venda);
    return response.data.data;
  },
};

// API de Relatórios
export const relatorioApi = {
  vendasPorPeriodo: async (inicio: string, fim: string): Promise<RelatorioVendas> => {
    const response = await api.get('/relatorios/vendas', {
      params: { inicio, fim },
    });
    return response.data.data;
  },

  faturamentoPorDia: async (inicio: string, fim: string): Promise<any> => {
    const response = await api.get('/relatorios/faturamento', {
      params: { inicio, fim },
    });
    return response.data.data;
  },

  produtosMaisVendidos: async (limit: number = 10): Promise<ProdutoMaisVendido[]> => {
    const response = await api.get('/relatorios/produtos-mais-vendidos', {
      params: { limit },
    });
    return response.data.data;
  },

  quantidadePorProduto: async (): Promise<any> => {
    const response = await api.get('/relatorios/quantidade-por-produto');
    return response.data.data;
  },
};

// API de Roteiros
export const roteiroApi = {
  listar: async (filtros?: RoteiroFiltros): Promise<Roteiro[]> => {
    const response = await api.get('/roteiros', { params: filtros });
    return response.data.data || response.data;
  },

  buscar: async (id: number): Promise<Roteiro> => {
    const response = await api.get(`/roteiros/${id}`);
    return response.data.data || response.data;
  },

  criar: async (roteiro: RoteiroRequest): Promise<Roteiro> => {
    const response = await api.post('/roteiros', roteiro);
    return response.data.data;
  },

  atualizar: async (id: number, roteiro: Partial<RoteiroRequest>): Promise<Roteiro> => {
    const response = await api.put(`/roteiros/${id}`, roteiro);
    return response.data.data;
  },

  atualizarItens: async (id: number, itens: RoteiroItem[]): Promise<Roteiro> => {
    const response = await api.put(`/roteiros/${id}/itens`, { itens });
    return response.data.data;
  },

  deletar: async (id: number): Promise<void> => {
    await api.delete(`/roteiros/${id}`);
  },

  dadosImpressao: async (id: number): Promise<any> => {
    const response = await api.get(`/roteiros/${id}/impressao`);
    return response.data.data || response.data;
  },
};

// API de Empresas
export const empresaApi = {
  listar: async (): Promise<Empresa[]> => {
    const response = await api.get('/empresas');
    return response.data.data || response.data;
  },

  criar: async (empresa: EmpresaRequest): Promise<Empresa> => {
    const response = await api.post('/empresas', empresa);
    return response.data.data || response.data;
  },

  deletar: async (id: number): Promise<void> => {
    await api.delete(`/empresas/${id}`);
  },
};

// API de Massas (apenas tipos - massa para identificação do produto)
export interface Massa {
  id: number;
  nome: string;
  ordem: number;
}

export const massaApi = {
  listar: async (): Promise<Massa[]> => {
    const response = await api.get('/massas');
    return response.data.data || response.data;
  },

  criar: async (nome: string): Promise<Massa> => {
    const response = await api.post('/massas', { nome });
    return response.data.data;
  },

  deletar: async (nome: string): Promise<void> => {
    await api.delete(`/massas/${encodeURIComponent(nome)}`);
  },
};

export interface Recheio {
  id: number;
  nome: string;
  ordem: number;
}

export const recheioApi = {
  listar: async (): Promise<Recheio[]> => {
    const response = await api.get('/recheios');
    return response.data.data || response.data;
  },

  criar: async (nome: string): Promise<Recheio> => {
    const response = await api.post('/recheios', { nome });
    return response.data.data;
  },

  deletar: async (nome: string): Promise<void> => {
    await api.delete(`/recheios/${encodeURIComponent(nome)}`);
  },
};

// API de Opções de Relatório (persistidas no backend)
export interface OpcaoRelatorioItem {
  id: number;
  nome: string;
  ordem: number;
}

export const opcaoRelatorioApi = {
  listar: async (): Promise<OpcaoRelatorioItem[]> => {
    const response = await api.get('/opcoes-relatorio');
    return response.data.data || response.data;
  },

  criar: async (nome: string): Promise<OpcaoRelatorioItem> => {
    const response = await api.post('/opcoes-relatorio', { nome });
    return response.data.data;
  },

  deletar: async (nome: string): Promise<void> => {
    await api.delete(`/opcoes-relatorio/${encodeURIComponent(nome)}`);
  },
};

// API de Motoristas
export const motoristaApi = {
  listar: async (): Promise<Motorista[]> => {
    const response = await api.get('/motoristas');
    return response.data.data || response.data;
  },

  criar: async (motorista: MotoristaRequest): Promise<Motorista> => {
    const response = await api.post('/motoristas', motorista);
    return response.data.data || response.data;
  },

  deletar: async (id: number): Promise<void> => {
    await api.delete(`/motoristas/${id}`);
  },
};

// ==================== AUTENTICAÇÃO ====================

export interface Usuario {
  is_admin?: boolean;
  id: number;
  nome: string;
  email: string;
  ativo: boolean;
  criado_em: string;
  atualizado_em: string;
}

export interface LoginRequest {
  email: string;
  senha: string;
}

export interface LoginResponse {
  success: boolean;
  message: string;
  data: {
    token: string;
    usuario: Usuario;
  };
}

export interface RegistroRequest {
  nome: string;
  email: string;
  senha: string;
}

export interface UsuarioRequest {
  nome: string;
  email: string;
  senha: string;
  ativo?: boolean;
  is_admin?: boolean;
}

export const authApi = {
  login: async (data: LoginRequest): Promise<LoginResponse> => {
    const response = await api.post('/auth/login', data);
    return response.data;
  },

  registro: async (data: RegistroRequest) => {
    const response = await api.post('/auth/registro', data);
    return response.data;
  },

  me: async (): Promise<{ success: boolean; data: Usuario }> => {
    const response = await api.get('/auth/me');
    return response.data;
  },
};

export const usuarioApi = {
  listar: async (): Promise<Usuario[]> => {
    const response = await api.get('/usuarios');
    return response.data.data;
  },

  buscar: async (id: number): Promise<Usuario> => {
    const response = await api.get(`/usuarios/${id}`);
    return response.data.data;
  },

  criar: async (data: UsuarioRequest) => {
    const response = await api.post('/usuarios', data);
    return response.data;
  },

  atualizar: async (id: number, data: Partial<UsuarioRequest>) => {
    const response = await api.put(`/usuarios/${id}`, data);
    return response.data;
  },

  deletar: async (id: number) => {
    const response = await api.delete(`/usuarios/${id}`);
    return response.data;
  },
};

// ==================== LIXEIRA ====================

export interface ItemLixeira {
  id?: number;
  nome?: string;
  nome_empresa?: string;
  observacoes?: string | null;
  data_producao?: string;
  deletado_em: string;
  descricao?: string;
  preco?: string;
  periodo?: string;
  ordem?: number;
  status?: string;
  motorista?: string | null;
}

export interface LixeiraData {
  produtos: ItemLixeira[];
  empresas: ItemLixeira[];
  motoristas: ItemLixeira[];
  massas: ItemLixeira[];
  recheios: ItemLixeira[];
  roteiros: ItemLixeira[];
}

export const lixeiraApi = {
  listar: async (): Promise<LixeiraData> => {
    const response = await api.get('/lixeira');
    return response.data.data;
  },

  restaurar: async (tipo: string, id?: number, nome?: string) => {
    const response = await api.post('/lixeira/restaurar', { tipo, id, nome });
    return response.data;
  },

  excluirDefinitivo: async (tipo: string, id?: number, nome?: string) => {
    const response = await api.delete('/lixeira/excluir-definitivo', {
      data: { tipo, id, nome },
    });
    return response.data;
  },

  limparTudo: async () => {
    const response = await api.post('/lixeira/limpar-tudo');
    return response.data;
  },
};

// ==================== BACKUP ====================

export const backupApi = {
  exportar: async (): Promise<any> => {
    const response = await api.get('/backup');
    return response.data.data;
  },
};

// ==================== AUDITORIA ====================

export interface Auditoria {
  id: number;
  usuario_id: number;
  usuario_nome: string;
  usuario_email: string;
  acao: string;
  entidade: string;
  entidade_id: number | null;
  descricao: string | null;
  dados_anteriores: any;
  dados_novos: any;
  ip_address: string | null;
  user_agent: string | null;
  criado_em: string;
}

export interface AuditoriaFilters {
  usuario_id?: number;
  acao?: string;
  entidade?: string;
  data_inicio?: string;
  data_fim?: string;
  limit?: number;
  offset?: number;
}

export interface AuditoriaResponse {
  success: boolean;
  data: Auditoria[];
  pagination: {
    total: number;
    limit: number;
    offset: number;
    hasMore: boolean;
  };
}

export interface AuditoriaEstatisticas {
  total: number;
  acoes: Array<{ acao: string; quantidade: number }>;
  entidades: Array<{ entidade: string; quantidade: number }>;
  usuarios_mais_ativos: Array<{ usuario_id: number; usuario_nome: string; quantidade: number }>;
  acoes_por_dia: Array<{ data: string; quantidade: number }>;
}

export const auditoriaApi = {
  listar: async (filters?: AuditoriaFilters): Promise<AuditoriaResponse> => {
    const params = new URLSearchParams();
    if (filters?.usuario_id) params.append('usuario_id', filters.usuario_id.toString());
    if (filters?.acao) params.append('acao', filters.acao);
    if (filters?.entidade) params.append('entidade', filters.entidade);
    if (filters?.data_inicio) params.append('data_inicio', filters.data_inicio);
    if (filters?.data_fim) params.append('data_fim', filters.data_fim);
    if (filters?.limit) params.append('limit', filters.limit.toString());
    if (filters?.offset) params.append('offset', filters.offset.toString());

    const response = await api.get(`/auditoria?${params.toString()}`);
    return response.data;
  },

  buscar: async (id: number): Promise<Auditoria> => {
    const response = await api.get(`/auditoria/${id}`);
    return response.data.data;
  },

  estatisticas: async (filters?: { data_inicio?: string; data_fim?: string }): Promise<{ success: boolean; data: AuditoriaEstatisticas }> => {
    const params = new URLSearchParams();
    if (filters?.data_inicio) params.append('data_inicio', filters.data_inicio);
    if (filters?.data_fim) params.append('data_fim', filters.data_fim);

    const response = await api.get(`/auditoria/estatisticas?${params.toString()}`);
    return response.data;
  },

  registrarClique: async (data: {
    botao: string;
    pagina: string;
    aba?: string;
    entidade?: string;
    entidade_id?: number;
    detalhes?: string;
  }): Promise<void> => {
    await api.post('/auditoria/clique', data).catch((err) => {
      // Não interromper o fluxo se houver erro ao registrar clique
      console.error('Erro ao registrar clique:', err);
    });
  },

  limpar: async (): Promise<{ success: boolean; message: string; data: { total: number } }> => {
    const response = await api.delete('/auditoria');
    return response.data;
  },
};

// Interceptor para adicionar token em todas as requisições
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Interceptor para tratar erros de autenticação
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Token inválido ou expirado
      localStorage.removeItem('token');
      localStorage.removeItem('usuario');
      if (typeof window !== 'undefined' && window.location.pathname !== '/login') {
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

export default api;
