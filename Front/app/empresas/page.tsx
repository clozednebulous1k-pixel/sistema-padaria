'use client'

import { useState, useEffect } from 'react'
import { empresaApi, Empresa } from '@/lib/api'
import toast from 'react-hot-toast'
import Loading from '@/components/Loading'
import { registrarClique } from '@/lib/audit'
import ConfirmModal from '@/components/ConfirmModal'

const DIAS_SEMANA = [
  'Segunda-feira',
  'Terça-feira',
  'Quarta-feira',
  'Quinta-feira',
  'Sexta-feira',
  'Sábado',
  'Domingo'
]

export default function EmpresasPage() {
  const [empresas, setEmpresas] = useState<Empresa[]>([])
  const [loading, setLoading] = useState(true)
  const [busca, setBusca] = useState('')
  const [novaEmpresa, setNovaEmpresa] = useState('')
  const [carregando, setCarregando] = useState(false)
  const [confirmModal, setConfirmModal] = useState<{
    open: boolean
    title: string
    message: string
    onConfirm: () => Promise<void>
  } | null>(null)

  useEffect(() => {
    carregarEmpresas()
  }, [])

  const carregarEmpresas = async () => {
    try {
      setLoading(true)
      const data = await empresaApi.listar()
      // Filtrar dias da semana - eles são usados nos roteiros, não são empresas
      const apenasEmpresas = data.filter((e) => !DIAS_SEMANA.includes(e.nome))
      setEmpresas(apenasEmpresas)
    } catch (error: any) {
      console.error('Erro ao carregar empresas:', error)
      try {
        const empresasSalvas = localStorage.getItem('empresas_padaria')
        if (empresasSalvas) {
          const empresasArray: string[] = JSON.parse(empresasSalvas)
          const empresasObj: Empresa[] = empresasArray
            .filter((nome) => !DIAS_SEMANA.includes(nome))
            .map((nome, index) => ({
              id: index + 1,
              nome,
              criado_em: new Date().toISOString()
            }))
          setEmpresas(empresasObj)
        }
      } catch (localError) {
        console.error('Erro ao carregar empresas do localStorage:', localError)
      }
    } finally {
      setLoading(false)
    }
  }

  const adicionarEmpresa = async () => {
    registrarClique('Adicionar', 'Empresas', undefined, 'empresa')

    const nomeLimpo = novaEmpresa.trim()
    if (!nomeLimpo) {
      toast.error('Digite o nome da empresa')
      return
    }

    if (DIAS_SEMANA.includes(nomeLimpo)) {
      toast.error('Não é possível adicionar dias da semana como empresa')
      return
    }

    if (empresas.some((e) => e.nome.toLowerCase() === nomeLimpo.toLowerCase())) {
      toast.error('Esta empresa já está cadastrada')
      return
    }

    try {
      setCarregando(true)
      const novaEmpresaObj = await empresaApi.criar({ nome: nomeLimpo })
      setEmpresas([...empresas, novaEmpresaObj].sort((a, b) => a.nome.localeCompare(b.nome)))
      setNovaEmpresa('')
      toast.success('Empresa adicionada com sucesso!')
    } catch (error: any) {
      console.error('Erro ao adicionar empresa:', error)
      const mensagemErro =
        error?.response?.data?.message || error?.message || 'Erro ao adicionar empresa'
      toast.error(`Erro: ${mensagemErro}`)
    } finally {
      setCarregando(false)
    }
  }

  const removerEmpresa = (id: number, nome: string) => {
    setConfirmModal({
      open: true,
      title: 'Remover empresa',
      message: `Deseja realmente remover a empresa "${nome}"?`,
      onConfirm: async () => {
        registrarClique('Excluir', 'Empresas', undefined, 'empresa', id, `Empresa: ${nome}`)
        try {
          setCarregando(true)
          await empresaApi.deletar(id)
          setEmpresas(empresas.filter((e) => e.id !== id))
          toast.success('Empresa removida com sucesso!')
          setConfirmModal(null)
        } catch (error: any) {
          console.error('Erro ao remover empresa:', error)
          const mensagemErro =
            error?.response?.data?.message || error?.message || 'Erro ao remover empresa'
          toast.error(`Erro: ${mensagemErro}`)
          throw error
        } finally {
          setCarregando(false)
        }
      },
    })
  }

  if (loading) {
    return <Loading />
  }

  const termoBusca = busca.trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
  const empresasFiltradas = termoBusca
    ? empresas.filter((e) =>
        e.nome
          .toLowerCase()
          .normalize('NFD')
          .replace(/[\u0300-\u036f]/g, '')
          .includes(termoBusca)
      )
    : empresas

  return (
    <div className="container mx-auto px-4">
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
      <div className="mb-4">
        <h1 className="text-2xl font-bold text-gray-900">Cadastro Empresas</h1>
        <p className="text-gray-600 mt-1 text-sm">
          Cadastre as empresas/clientes que serão adicionadas nos roteiros de produção
        </p>
      </div>

      <div className="bg-white rounded-lg shadow p-4 w-full">
        <h2 className="text-lg font-bold text-gray-900 mb-3">
          Empresas cadastradas ({empresas.length})
        </h2>
        <div className="mb-3">
          <input
            type="text"
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            placeholder="Pesquisar empresa..."
            className="w-full px-4 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent mb-3"
          />
          <div className="flex gap-2">
            <input
              type="text"
              value={novaEmpresa}
              onChange={(e) => setNovaEmpresa(e.target.value)}
              onKeyPress={(e) => {
                if (e.key === 'Enter') {
                  adicionarEmpresa()
                }
              }}
              placeholder="Nome da empresa"
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            />
            <button
              onClick={adicionarEmpresa}
              disabled={carregando}
              className="bg-primary-500 text-white px-4 py-2 rounded-lg font-semibold hover:bg-primary-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Adicionar
            </button>
          </div>
        </div>
        {empresas.length === 0 ? (
          <p className="text-gray-500 text-sm text-center py-8">
            Nenhuma empresa cadastrada. Adicione empresas para usar nos roteiros.
          </p>
        ) : empresasFiltradas.length === 0 ? (
          <p className="text-gray-500 text-sm text-center py-8">
            Nenhuma empresa encontrada com &quot;{busca.trim()}&quot;.
          </p>
        ) : (
          <div className="max-h-[calc(100vh-280px)] overflow-y-auto">
            <div className="space-y-2">
              {empresasFiltradas.map((empresa) => (
                <div
                  key={empresa.id}
                  className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                >
                  <span className="text-sm font-medium text-gray-900">{empresa.nome}</span>
                  <button
                    onClick={() => removerEmpresa(empresa.id, empresa.nome)}
                    className="text-red-600 hover:text-red-700 font-semibold text-xs disabled:opacity-50"
                    disabled={carregando}
                  >
                    Remover
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
