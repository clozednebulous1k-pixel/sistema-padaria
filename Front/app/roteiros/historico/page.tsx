'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { format } from 'date-fns'
import ptBR from 'date-fns/locale/pt-BR'
import toast from 'react-hot-toast'
import ConfirmModal from '@/components/ConfirmModal'

const STORAGE_KEY_HISTORICO = 'historico_roteiros_producao'

interface ItemHistorico {
  empresa: string
  pao: string
  quantidade: number
}

interface TotalPaoHistorico {
  pao: string
  quantidadeTotal: number
}

interface RegistroHistorico {
  id: string
  dataImpressao: string
  diaSemana: string
  itens: ItemHistorico[]
  totaisPorPao: TotalPaoHistorico[]
  totalGeral: number
}

export default function HistoricoRoteirosPage() {
  const [historico, setHistorico] = useState<RegistroHistorico[]>([])
  const [loading, setLoading] = useState(true)
  const [filtroDia, setFiltroDia] = useState<string>('')
  const [registroExpandido, setRegistroExpandido] = useState<string | null>(null)
  const [confirmModal, setConfirmModal] = useState<{
    open: boolean
    title: string
    message: string
    onConfirm: () => void | Promise<void>
  } | null>(null)

  const DIAS_SEMANA = [
    'Segunda-feira',
    'Terça-feira',
    'Quarta-feira',
    'Quinta-feira',
    'Sexta-feira',
    'Sábado',
    'Domingo'
  ]

  useEffect(() => {
    carregarHistorico()
  }, [])

  const carregarHistorico = () => {
    try {
      const historicoSalvo = localStorage.getItem(STORAGE_KEY_HISTORICO)
      if (historicoSalvo) {
        const dados = JSON.parse(historicoSalvo)
        // Ordenar por data de impressão (mais recente primeiro)
        const historicoOrdenado = dados.sort((a: RegistroHistorico, b: RegistroHistorico) => 
          new Date(b.dataImpressao).getTime() - new Date(a.dataImpressao).getTime()
        )
        setHistorico(historicoOrdenado)
      }
    } catch (error) {
      console.error('Erro ao carregar histórico:', error)
      toast.error('Erro ao carregar histórico')
    } finally {
      setLoading(false)
    }
  }

  const excluirRegistro = (id: string) => {
    setConfirmModal({
      open: true,
      title: 'Excluir registro',
      message: 'Deseja realmente excluir este registro do histórico?',
      onConfirm: () => {
        try {
          const novosRegistros = historico.filter((r) => r.id !== id)
          localStorage.setItem(STORAGE_KEY_HISTORICO, JSON.stringify(novosRegistros))
          setHistorico(novosRegistros)
          toast.success('Registro excluído com sucesso')
          setConfirmModal(null)
        } catch (error) {
          console.error('Erro ao excluir registro:', error)
          toast.error('Erro ao excluir registro')
        }
      },
    })
  }

  const limparHistorico = () => {
    setConfirmModal({
      open: true,
      title: 'Limpar histórico',
      message: 'Deseja realmente limpar todo o histórico? Esta ação não pode ser desfeita.',
      onConfirm: () => {
        try {
          localStorage.removeItem(STORAGE_KEY_HISTORICO)
          setHistorico([])
          toast.success('Histórico limpo com sucesso')
          setConfirmModal(null)
        } catch (error) {
          console.error('Erro ao limpar histórico:', error)
          toast.error('Erro ao limpar histórico')
        }
      },
    })
  }

  const formatarDataHora = (data: string) => {
    try {
      return format(new Date(data), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })
    } catch {
      return data
    }
  }

  const toggleExpandir = (id: string) => {
    if (registroExpandido === id) {
      setRegistroExpandido(null)
    } else {
      setRegistroExpandido(id)
    }
  }

  const historicoFiltrado = filtroDia
    ? historico.filter((r) => r.diaSemana === filtroDia)
    : historico

  if (loading) {
    return (
      <div className="container mx-auto px-4">
        <div className="flex justify-center items-center min-h-[400px]">
          <div className="text-xl text-gray-600 dark:text-gray-400">Carregando histórico...</div>
        </div>
      </div>
    )
  }

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
      <div className="flex justify-between items-center mb-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Histórico de Roteiros de Produção</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-0.5 text-sm">
            Registro de todas as impressões de roteiros
          </p>
        </div>
        <Link
          href="/roteiros"
          className="bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 px-4 py-2 text-sm rounded-lg font-semibold hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
        >
          ← Voltar
        </Link>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4 mb-4">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Filtros</h2>
          {historico.length > 0 && (
            <button
              onClick={limparHistorico}
              className="bg-red-500 text-white px-4 py-2 rounded-lg font-semibold hover:bg-red-600 transition-colors text-sm"
            >
              Limpar Histórico
            </button>
          )}
        </div>
        <div className="grid md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
              Filtrar por Dia da Semana
            </label>
            <select
              value={filtroDia}
              onChange={(e) => setFiltroDia(e.target.value)}
              className="w-full px-4 py-2 text-gray-900 dark:text-gray-100 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            >
              <option value="">Todos os dias</option>
              {DIAS_SEMANA.map((dia) => (
                <option key={dia} value={dia}>
                  {dia}
                </option>
              ))}
            </select>
          </div>
          <div className="flex items-end">
            <p className="text-sm text-gray-600 dark:text-gray-400">
              {historicoFiltrado.length} registro{historicoFiltrado.length !== 1 ? 's' : ''} encontrado{historicoFiltrado.length !== 1 ? 's' : ''}
            </p>
          </div>
        </div>
      </div>

      {historicoFiltrado.length === 0 ? (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-8 text-center">
          <div className="text-5xl mb-3">📜</div>
          <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-2">
            Nenhum registro no histórico
          </h2>
          <p className="text-gray-600 dark:text-gray-400 mb-6">
            {filtroDia
              ? `Nenhum registro encontrado para ${filtroDia}`
              : 'O histórico será preenchido quando você imprimir roteiros de produção'}
          </p>
          {filtroDia && (
            <button
              onClick={() => setFiltroDia('')}
              className="inline-block bg-primary-500 text-white px-6 py-3 rounded-lg font-semibold hover:bg-primary-600 transition-colors"
            >
              Limpar Filtro
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-6">
          {historicoFiltrado.map((registro) => {
            const estaExpandido = registroExpandido === registro.id

            return (
              <div key={registro.id} className="bg-white dark:bg-gray-800 rounded-lg shadow-md border border-gray-200 dark:border-gray-600">
                {/* Cabeçalho clicável */}
                <div
                  onClick={() => toggleExpandir(registro.id)}
                  className="p-4 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors rounded-t-lg"
                >
                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-3">
                      <div className={`transform transition-transform text-gray-700 dark:text-gray-300 ${estaExpandido ? 'rotate-90' : ''}`}>
                        ▶
                      </div>
                      <div>
                        <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100">
                          {registro.diaSemana}
                        </h2>
                        <p className="text-sm text-gray-600 dark:text-gray-300 mt-0.5">
                          Impresso em {formatarDataHora(registro.dataImpressao)}
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                          {registro.itens.length} item{registro.itens.length !== 1 ? 's' : ''} • Total: {registro.totalGeral} pães
                        </p>
                      </div>
                    </div>
                    <div className="flex gap-2" onClick={(e) => e.stopPropagation()}>
                      <button
                        onClick={() => {
                          const janelaImpressao = window.open('', '_blank')
                          if (janelaImpressao) {
                            janelaImpressao.document.write(`
                              <!DOCTYPE html>
                              <html>
                                <head>
                                  <title>Roteiro de Entregas - ${registro.diaSemana} - ${formatarDataHora(registro.dataImpressao)}</title>
                                  <style>
                                    body { font-family: Arial, sans-serif; padding: 14px; font-size: 15px; }
                                    h1 { color: #333; border-bottom: 2px solid #550701; padding-bottom: 4px; margin-bottom: 8px; font-size: 20px; }
                                    .info { margin: 8px 0; font-size: 13px; }
                                    table { width: 100%; border-collapse: collapse; margin: 8px 0; font-size: 15px; }
                                    th, td { border: 1px solid #ddd; padding: 10px 12px; text-align: left; }
                                    th { background-color: #550701; color: white; }
                                    td { text-align: left; }
                                    td:last-child { text-align: center; }
                                  </style>
                                </head>
                                <body>
                                  <h1>Roteiro de Entregas - Histórico</h1>
                                  <div class="info">
                                    <p><strong>Dia:</strong> ${registro.diaSemana}</p>
                                    <p><strong>Impresso em:</strong> ${formatarDataHora(registro.dataImpressao)}</p>
                                  </div>
                                  <table>
                                    <thead>
                                      <tr>
                                        <th>Empresa</th>
                                        <th>Pão</th>
                                        <th>Quantidade</th>
                                      </tr>
                                    </thead>
                                    <tbody>
                                      ${registro.itens.map((item) => `
                                        <tr>
                                          <td>${item.empresa}</td>
                                          <td>${item.pao}</td>
                                          <td>${item.quantidade}</td>
                                        </tr>
                                      `).join('')}
                                    </tbody>
                                  </table>
                                  <h2 style="margin-top: 12px; color: #333; border-bottom: 2px solid #550701; padding-bottom: 4px; font-size: 17px;">
                                    Total de Pães por Tipo
                                  </h2>
                                  <table style="width: 100%; border-collapse: collapse; margin: 8px 0; font-size: 15px;">
                                    <thead>
                                      <tr>
                                        <th style="border: 1px solid #ddd; padding: 10px 12px; background-color: #550701; color: white;">Pão</th>
                                        <th style="border: 1px solid #ddd; padding: 10px 12px; background-color: #550701; color: white;">Total</th>
                                      </tr>
                                    </thead>
                                    <tbody>
                                      ${registro.totaisPorPao.map((total) => `
                                        <tr>
                                          <td style="border: 1px solid #ddd; padding: 10px 12px;">${total.pao}</td>
                                          <td style="border: 1px solid #ddd; padding: 10px 12px; text-align: center; font-weight: bold;">${total.quantidadeTotal}</td>
                                        </tr>
                                      `).join('')}
                                    </tbody>
                                  </table>
                                  <p style="margin-top: 8px; font-size: 15px; font-weight: bold;">
                                    Total Geral: ${registro.totalGeral} pães
                                  </p>
                                </body>
                              </html>
                            `)
                            janelaImpressao.document.close()
                            janelaImpressao.print()
                          }
                        }}
                        className="bg-gray-500 dark:bg-gray-600 text-white px-3 py-1.5 rounded-md font-semibold hover:bg-gray-600 dark:hover:bg-gray-500 transition-colors text-xs"
                      >
                        Imprimir
                      </button>
                      <button
                        onClick={() => excluirRegistro(registro.id)}
                        className="bg-red-500 text-white px-3 py-1.5 rounded-md font-semibold hover:bg-red-600 transition-colors text-xs"
                      >
                        Excluir
                      </button>
                    </div>
                  </div>
                </div>

                {/* Conteúdo expandível */}
                {estaExpandido && (
                  <div className="border-t border-gray-200 dark:border-gray-600 p-4">
                    {/* Totais por Tipo de Pão */}
                    <div className="mb-6 bg-primary-50 dark:bg-primary-900/20 border border-primary-200 dark:border-primary-800 rounded-lg p-4">
                      <h3 className="text-base font-bold text-gray-900 dark:text-gray-100 mb-3">
                        📊 Total de Pães por Tipo
                      </h3>
                      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
                        {registro.totaisPorPao.map((total, index) => (
                          <div
                            key={index}
                            className="bg-white dark:bg-gray-700 rounded-lg p-3 border border-primary-200 dark:border-primary-800 shadow-sm"
                          >
                            <p className="text-xs text-gray-600 dark:text-gray-400 mb-1">Pão</p>
                            <p className="text-sm font-bold text-gray-900 dark:text-gray-100 mb-1 line-clamp-2">
                              {total.pao}
                            </p>
                            <p className="text-xs text-gray-600 dark:text-gray-400">Total</p>
                            <p className="text-xl font-bold text-primary-600 dark:text-primary-400">
                              {total.quantidadeTotal}
                            </p>
                          </div>
                        ))}
                      </div>
                      <div className="mt-3 pt-3 border-t border-primary-200 dark:border-primary-800">
                        <div className="flex justify-between items-center">
                          <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                            Total Geral:
                          </span>
                          <span className="text-lg font-bold text-primary-600 dark:text-primary-400">
                            {registro.totalGeral}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Tabela Detalhada por Empresa */}
                    <div className="overflow-x-auto">
                      <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100 mb-4">
                        Detalhamento por Empresa
                      </h3>
                      <table className="w-full">
                        <thead className="bg-gray-50 dark:bg-gray-700">
                          <tr>
                            <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase">
                              Empresa
                            </th>
                            <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase">
                              Pão
                            </th>
                            <th className="px-4 py-3 text-center text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase">
                              Quantidade
                            </th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200 dark:divide-gray-600">
                          {registro.itens.map((item, index) => (
                            <tr key={index}>
                              <td className="px-4 py-3 text-sm font-semibold text-gray-900 dark:text-gray-100">
                                {item.empresa}
                              </td>
                              <td className="px-4 py-3 text-sm text-gray-900 dark:text-gray-100">
                                {item.pao}
                              </td>
                              <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-300 text-center font-semibold">
                                {item.quantidade}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
