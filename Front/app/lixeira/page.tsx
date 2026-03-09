'use client'

import { useEffect, useState } from 'react'
import { lixeiraApi, LixeiraData, ItemLixeira } from '@/lib/api'
import { useAuth } from '@/components/AuthProvider'
import toast from 'react-hot-toast'
import Link from 'next/link'
import { format } from 'date-fns'
import ConfirmModal from '@/components/ConfirmModal'

export default function LixeiraPage() {
  const { usuario } = useAuth()
  const [loading, setLoading] = useState(true)
  const [dados, setDados] = useState<LixeiraData | null>(null)
  const [confirmModal, setConfirmModal] = useState<{
    open: boolean
    title: string
    message: string
    variant: 'danger' | 'warning' | 'info'
    onConfirm: () => Promise<void>
  } | null>(null)

  const raw = usuario?.is_admin as boolean | string | number | undefined
  const isAdmin = raw === true || raw === 'true' || raw === 1

  useEffect(() => {
    if (!isAdmin) return
    carregar()
  }, [isAdmin])

  const carregar = async () => {
    try {
      setLoading(true)
      const data = await lixeiraApi.listar()
      setDados(data)
    } catch (error: any) {
      toast.error(error?.response?.data?.message || 'Erro ao carregar restauração')
      if (error?.response?.status === 403) {
        setDados({ produtos: [], empresas: [], motoristas: [], massas: [], roteiros: [] })
      }
    } finally {
      setLoading(false)
    }
  }

  const handleRestaurar = (tipo: string, id?: number, nome?: string) => {
    setConfirmModal({
      open: true,
      title: 'Restaurar item',
      message: 'Restaurar este item?',
      variant: 'info',
      onConfirm: async () => {
        try {
          await lixeiraApi.restaurar(tipo, id, nome)
          toast.success('Item restaurado!')
          setConfirmModal(null)
          carregar()
        } catch (error: any) {
          toast.error(error?.response?.data?.message || 'Erro ao restaurar')
          throw error
        }
      },
    })
  }

  const handleExcluirDefinitivo = (tipo: string, id?: number, nome?: string) => {
    setConfirmModal({
      open: true,
      title: 'Excluir permanentemente',
      message: 'Excluir permanentemente? Esta ação não pode ser desfeita.',
      variant: 'danger',
      onConfirm: async () => {
        try {
          await lixeiraApi.excluirDefinitivo(tipo, id, nome)
          toast.success('Item excluído permanentemente')
          setConfirmModal(null)
          carregar()
        } catch (error: any) {
          toast.error(error?.response?.data?.message || 'Erro ao excluir')
          throw error
        }
      },
    })
  }

  const handleLimparTudo = () => {
    setConfirmModal({
      open: true,
      title: 'Limpar restauração',
      message: 'Excluir permanentemente TODOS os itens da restauração? Esta ação não pode ser desfeita.',
      variant: 'danger',
      onConfirm: async () => {
        try {
          const res = await lixeiraApi.limparTudo()
          const total = res?.data?.total ?? 0
          toast.success(total > 0 ? `${total} item(ns) excluído(s) permanentemente` : 'Restauração já estava vazia')
          setConfirmModal(null)
          carregar()
        } catch (error: any) {
          toast.error(error?.response?.data?.message || 'Erro ao limpar restauração')
          throw error
        }
      },
    })
  }

  const renderTabelaRoteiros = (itens: ItemLixeira[]) => (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden mb-6">
      <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100 px-6 py-4 bg-gray-50 dark:bg-gray-700 border-b dark:border-gray-600">
        Roteiros de Entregas ({itens.length})
      </h2>
      {itens.length === 0 ? (
        <p className="px-6 py-4 text-gray-500 dark:text-gray-400 text-sm">Nenhum item para restaurar</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-600">
            <thead className="bg-gray-50 dark:bg-gray-700">
              <tr>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Dia</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Roteiro</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Data</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Período</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Excluído em</th>
                <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-600">
              {itens.map((item) => (
                <tr key={item.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                  <td className="px-4 py-2 text-sm font-medium text-gray-900 dark:text-gray-100">{item.nome_empresa || '-'}</td>
                  <td className="px-4 py-2 text-sm text-gray-700 dark:text-gray-300">{item.observacoes || 'Sem nome'}</td>
                  <td className="px-4 py-2 text-sm text-gray-600 dark:text-gray-200">
                    {item.data_producao ? format(new Date(item.data_producao), 'dd/MM/yyyy') : '-'}
                  </td>
                  <td className="px-4 py-2 text-sm text-gray-600 dark:text-gray-200 capitalize">{item.periodo || '-'}</td>
                  <td className="px-4 py-2 text-sm text-gray-600 dark:text-gray-200">
                    {item.deletado_em ? format(new Date(item.deletado_em), 'dd/MM/yyyy HH:mm') : '-'}
                  </td>
                  <td className="px-4 py-2 text-right">
                    <button
                      onClick={() => handleRestaurar('roteiro', item.id, undefined)}
                      className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 text-sm font-medium mr-3"
                    >
                      Restaurar
                    </button>
                    <button
                      onClick={() => handleExcluirDefinitivo('roteiro', item.id, undefined)}
                      className="text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-300 text-sm font-medium"
                    >
                      Excluir
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )

  const renderTabela = (
    titulo: string,
    itens: ItemLixeira[],
    tipo: string,
    idKey: 'id' | 'nome',
    extraCol?: { label: string; getVal: (i: ItemLixeira) => string }
  ) => (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden mb-6">
      <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100 px-6 py-4 bg-gray-50 dark:bg-gray-700 border-b dark:border-gray-600">
        {titulo} ({itens.length})
      </h2>
      {itens.length === 0 ? (
        <p className="px-6 py-4 text-gray-500 dark:text-gray-400 text-sm">Nenhum item para restaurar</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-600">
            <thead className="bg-gray-50 dark:bg-gray-700">
              <tr>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Nome</th>
                {extraCol && (
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">{extraCol.label}</th>
                )}
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Excluído em</th>
                <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-600">
              {itens.map((item) => (
                <tr key={item.id || item.nome || item.nome_empresa} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                  <td className="px-4 py-2 text-sm font-medium text-gray-900 dark:text-gray-100">{item.nome || item.nome_empresa}</td>
                  {extraCol && (
                    <td className="px-4 py-2 text-sm text-gray-600 dark:text-gray-200">{extraCol.getVal(item)}</td>
                  )}
                  <td className="px-4 py-2 text-sm text-gray-600 dark:text-gray-200">
                    {item.deletado_em ? format(new Date(item.deletado_em), 'dd/MM/yyyy HH:mm') : '-'}
                  </td>
                  <td className="px-4 py-2 text-right">
                    <button
                      onClick={() =>
                        handleRestaurar(tipo, item.id, idKey === 'nome' ? item.nome : undefined)
                      }
                      className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 text-sm font-medium mr-3"
                    >
                      Restaurar
                    </button>
                    <button
                      onClick={() =>
                        handleExcluirDefinitivo(tipo, item.id, idKey === 'nome' ? item.nome : undefined)
                      }
                      className="text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-300 text-sm font-medium"
                    >
                      Excluir
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )

  if (!isAdmin) {
    return (
      <div className="container mx-auto px-4">
        <p className="text-red-600 dark:text-red-400 font-semibold">Acesso negado. Apenas administradores podem acessar a restauração.</p>
        <Link href="/" className="text-primary-600 dark:text-primary-400 hover:underline mt-4 inline-block">Voltar ao início</Link>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="container mx-auto px-4 flex justify-center">
        <div className="animate-spin w-10 h-10 border-2 border-primary-500 border-t-transparent rounded-full" />
      </div>
    )
  }

  const total =
    (dados?.produtos?.length || 0) +
    (dados?.empresas?.length || 0) +
    (dados?.motoristas?.length || 0) +
    (dados?.massas?.length || 0) +
    (dados?.roteiros?.length || 0)

  return (
    <div className="container mx-auto px-4">
      <div className="flex justify-between items-center mb-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Restauração</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-0.5 text-sm">
            Itens excluídos podem ser restaurados ou removidos permanentemente. Total: {total} itens.
          </p>
        </div>
        <div className="flex gap-2">
          {total > 0 && (
            <button
              onClick={handleLimparTudo}
              className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 font-medium"
            >
              Limpar tudo
            </button>
          )}
          <Link
            href="/"
            className="px-4 py-2 text-gray-700 dark:text-gray-200 bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 font-medium"
          >
            ← Voltar
          </Link>
        </div>
      </div>

      {confirmModal && (
        <ConfirmModal
          open={confirmModal.open}
          title={confirmModal.title}
          message={confirmModal.message}
          variant={confirmModal.variant}
          onConfirm={confirmModal.onConfirm}
          onCancel={() => setConfirmModal(null)}
        />
      )}

      {dados && (
        <>
          {renderTabela('Produtos', dados.produtos, 'produto', 'id')}
          {renderTabela('Empresas', dados.empresas, 'empresa', 'id')}
          {renderTabela(
            'Motoristas',
            dados.motoristas,
            'motorista',
            'id',
            { label: 'Período', getVal: (i) => i.periodo || '-' }
          )}
          {renderTabela('Massas', dados.massas, 'massa', 'nome')}
          {renderTabelaRoteiros(dados.roteiros || [])}
        </>
      )}
    </div>
  )
}
