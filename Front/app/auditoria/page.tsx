'use client'

import { useState, useEffect } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { auditoriaApi, Auditoria, AuditoriaEstatisticas } from '@/lib/api'
import { useAuth } from '@/components/AuthProvider'
import Loading from '@/components/Loading'
import toast from 'react-hot-toast'
import ConfirmModal from '@/components/ConfirmModal'

export default function AuditoriaPage() {
  const router = useRouter()
  const pathname = usePathname()
  const { usuario, loading: authLoading } = useAuth()
  const [auditorias, setAuditorias] = useState<Auditoria[]>([])
  const [estatisticas, setEstatisticas] = useState<AuditoriaEstatisticas | null>(null)
  const [loading, setLoading] = useState(true)
  const [filters, setFilters] = useState({
    acao: '',
    entidade: '',
    data_inicio: '',
    data_fim: '',
  })
  const [page, setPage] = useState(0)
  const [total, setTotal] = useState(0)
  const limit = 50
  const [confirmModal, setConfirmModal] = useState<{
    open: boolean
    title: string
    message: string
    onConfirm: () => Promise<void>
  } | null>(null)

  useEffect(() => {
    // Se estiver na página de login ou redirecionando para login, não fazer nada
    if (pathname === '/login') {
      return
    }

    // Verificar se é admin
    if (!authLoading && (!usuario || !usuario.is_admin)) {
      // Não mostrar erro se estiver redirecionando para login (logout)
      if (pathname !== '/login') {
        toast.error('Acesso negado. Apenas administradores podem acessar esta página.')
        router.push('/')
      }
      return
    }

    if (usuario?.is_admin) {
      carregarDados()
    }
  }, [page, filters, usuario, authLoading, router, pathname])

  const carregarDados = async () => {
    try {
      setLoading(true)
      const [auditoriaResponse, statsResponse] = await Promise.all([
        auditoriaApi.listar({
          ...filters,
          limit,
          offset: page * limit,
        }),
        auditoriaApi.estatisticas({
          data_inicio: filters.data_inicio || undefined,
          data_fim: filters.data_fim || undefined,
        }),
      ])

      setAuditorias(auditoriaResponse.data || [])
      setTotal(auditoriaResponse.pagination?.total || 0)
      setEstatisticas(statsResponse.data || null)
    } catch (error: any) {
      console.error('Erro ao carregar auditoria:', error)
      const mensagem = error?.response?.data?.message || error?.message || 'Erro ao carregar dados de auditoria'
      toast.error(mensagem)
      
      // Se for erro 404, pode ser que a tabela não exista
      if (error?.response?.status === 404) {
        toast.error('Tabela de auditoria não encontrada. Execute a migration do banco de dados.')
      }
    } finally {
      setLoading(false)
    }
  }

  const handleFilterChange = (key: string, value: string) => {
    setFilters((prev) => ({ ...prev, [key]: value }))
    setPage(0)
  }

  const limparFiltros = () => {
    setFilters({
      acao: '',
      entidade: '',
      data_inicio: '',
      data_fim: '',
    })
    setPage(0)
  }

  const getAcaoColor = (acao: string) => {
    switch (acao) {
      case 'CLIQUE':
        return 'bg-indigo-100 dark:bg-indigo-900/50 text-indigo-800 dark:text-indigo-200'
      case 'ADICIONAR':
      case 'CRIAR':
      case 'CREATE':
        return 'bg-green-100 dark:bg-green-900/50 text-green-800 dark:text-green-200'
      case 'EDITAR':
      case 'ATUALIZAR':
      case 'UPDATE':
        return 'bg-blue-100 dark:bg-blue-900/50 text-blue-800 dark:text-blue-200'
      case 'EDITAR_ITENS':
      case 'ATUALIZAR_ITENS':
      case 'EDITOU_ITENS':
        return 'bg-cyan-100 dark:bg-cyan-900/50 text-cyan-800 dark:text-cyan-200'
      case 'EXCLUIR':
      case 'DELETE':
        return 'bg-red-100 dark:bg-red-900/50 text-red-800 dark:text-red-200'
      case 'IMPRIMIR':
        return 'bg-orange-100 dark:bg-orange-900/50 text-orange-800 dark:text-orange-200'
      case 'LOGIN':
        return 'bg-purple-100 dark:bg-purple-900/50 text-purple-800 dark:text-purple-200'
      case 'LOGOUT':
        return 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200'
      default:
        return 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200'
    }
  }

  const getAcaoLabel = (acao: string) => {
    const labels: Record<string, string> = {
      CLIQUE: 'Clique',
      ADICIONAR: 'Adicionou',
      CRIAR: 'Adicionou',
      CREATE: 'Adicionou',
      EDITAR: 'Editou',
      ATUALIZAR: 'Editou',
      UPDATE: 'Editou',
      EDITAR_ITENS: 'Editou Itens',
      ATUALIZAR_ITENS: 'Editou Itens',
      EDITOU_ITENS: 'Editou Itens',
      EXCLUIR: 'Excluiu',
      DELETE: 'Excluiu',
      IMPRIMIR: 'Imprimiu',
      LOGIN: 'Login',
      LOGOUT: 'Logout',
    }
    return labels[acao] || acao
  }

  // Verificar se é admin
  if (authLoading) {
    return <Loading />
  }

  if (!usuario || !usuario.is_admin) {
    return null
  }

  if (loading && auditorias.length === 0) {
    return <Loading />
  }

  return (
    <div className="container mx-auto px-4">
      <div className="max-w-7xl mx-auto">
        <div className="mb-4 flex justify-between items-start">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-1">Monitoramento de Ações</h1>
            <p className="text-gray-600 dark:text-gray-300 text-sm">Visualize todas as ações realizadas pelos usuários no sistema</p>
          </div>
          {total > 0 && (
            <button
              onClick={() =>
                setConfirmModal({
                  open: true,
                  title: 'Limpar registros',
                  message: `Tem certeza que deseja excluir todos os registros de monitoramento? Esta ação não pode ser desfeita.`,
                  onConfirm: async () => {
                    try {
                      const res = await auditoriaApi.limpar()
                      toast.success(res?.message || 'Registros removidos com sucesso')
                      setConfirmModal(null)
                      setPage(0)
                      carregarDados()
                    } catch (error: any) {
                      toast.error(error?.response?.data?.message || 'Erro ao limpar registros')
                      throw error
                    }
                  },
                })
              }
              className="px-4 py-2 bg-red-600 text-white rounded-lg font-medium hover:bg-red-700 transition-colors"
            >
              Limpar registros
            </button>
          )}
        </div>

        {confirmModal && (
          <ConfirmModal
            open={confirmModal.open}
            title={confirmModal.title}
            message={confirmModal.message}
            variant="danger"
            onConfirm={confirmModal.onConfirm}
            onCancel={() => setConfirmModal(null)}
          />
        )}

        {/* Estatísticas */}
        {estatisticas && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4 border border-gray-200 dark:border-gray-700">
              <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">Total de Ações</h3>
              <p className="text-3xl font-bold text-gray-900 dark:text-gray-100">{estatisticas.total}</p>
            </div>
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4 border border-gray-200 dark:border-gray-700">
              <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">Tipos de Ações</h3>
              <p className="text-3xl font-bold text-gray-900 dark:text-gray-100">{estatisticas.acoes.length}</p>
            </div>
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4 border border-gray-200 dark:border-gray-700">
              <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">Entidades</h3>
              <p className="text-3xl font-bold text-gray-900 dark:text-gray-100">{estatisticas.entidades.length}</p>
            </div>
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4 border border-gray-200 dark:border-gray-700">
              <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">Usuários Ativos</h3>
              <p className="text-3xl font-bold text-gray-900 dark:text-gray-100">{estatisticas.usuarios_mais_ativos.length}</p>
            </div>
          </div>
        )}

        {/* Filtros */}
        <div className="bg-white rounded-lg shadow p-4 mb-4">
          <h2 className="text-lg font-semibold text-gray-900 mb-3">Filtros</h2>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Ação</label>
              <select
                value={filters.acao}
                onChange={(e) => handleFilterChange('acao', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
              >
                <option value="">Todas</option>
                <option value="CLIQUE">Clique</option>
                <option value="ADICIONAR">Adicionou</option>
                <option value="EDITAR">Editou</option>
                <option value="EDITAR_ITENS">Editou Itens</option>
                <option value="EDITOU_ITENS">Editou Itens</option>
                <option value="EXCLUIR">Excluiu</option>
                <option value="IMPRIMIR">Imprimiu</option>
                <option value="LOGIN">Login</option>
                <option value="LOGOUT">Logout</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Entidade</label>
              <select
                value={filters.entidade}
                onChange={(e) => handleFilterChange('entidade', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
              >
                <option value="">Todas</option>
                <option value="produto">Produto</option>
                <option value="roteiro">Roteiro</option>
                <option value="motorista">Motorista</option>
                <option value="empresa">Empresa</option>
                <option value="usuario">Usuário</option>
                <option value="autenticacao">Autenticação</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Data Início</label>
              <input
                type="date"
                value={filters.data_inicio}
                onChange={(e) => handleFilterChange('data_inicio', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Data Fim</label>
              <input
                type="date"
                value={filters.data_fim}
                onChange={(e) => handleFilterChange('data_fim', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
            </div>
          </div>
          <div className="mt-4">
            <button
              onClick={limparFiltros}
              className="px-4 py-2 bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-gray-200 rounded-md hover:bg-gray-300 dark:hover:bg-gray-500 transition-colors font-semibold"
            >
              Limpar Filtros
            </button>
          </div>
        </div>

        {/* Tabela de Auditoria */}
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Data/Hora
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Usuário
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Ação
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Entidade
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Descrição
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    IP
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {auditorias.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-4 text-center text-gray-500 dark:text-gray-400">
                      Nenhuma ação encontrada
                    </td>
                  </tr>
                ) : (
                  auditorias.map((auditoria) => (
                    <tr key={auditoria.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">
                        {format(new Date(auditoria.criado_em), "dd/MM/yyyy HH:mm:ss", { locale: ptBR })}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900 dark:text-gray-100">{auditoria.usuario_nome}</div>
                        <div className="text-sm text-gray-500 dark:text-gray-400">{auditoria.usuario_email}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span
                          className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${getAcaoColor(
                            auditoria.acao
                          )}`}
                        >
                          {getAcaoLabel(auditoria.acao)}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100 capitalize">
                        {auditoria.entidade}
                        {auditoria.entidade_id && ` (ID: ${auditoria.entidade_id})`}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-900 dark:text-gray-100">
                        {auditoria.descricao || '-'}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Paginação */}
          {total > limit && (
            <div className="bg-gray-50 dark:bg-gray-700 px-6 py-4 flex items-center justify-between border-t border-gray-200 dark:border-gray-600">
              <div className="text-sm text-gray-700 dark:text-gray-300">
                Mostrando {page * limit + 1} a {Math.min((page + 1) * limit, total)} de {total} ações
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => setPage((p) => Math.max(0, p - 1))}
                  disabled={page === 0}
                  className="px-4 py-2 bg-white dark:bg-gray-600 border border-gray-300 dark:border-gray-500 rounded-md text-sm font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-500 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Anterior
                </button>
                <button
                  onClick={() => setPage((p) => p + 1)}
                  disabled={(page + 1) * limit >= total}
                  className="px-4 py-2 bg-white dark:bg-gray-600 border border-gray-300 dark:border-gray-500 rounded-md text-sm font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-500 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Próxima
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

