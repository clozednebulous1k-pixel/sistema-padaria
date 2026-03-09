'use client'

import { useState, useEffect } from 'react'
import { relatorioApi, RelatorioVendas } from '@/lib/api'
import toast from 'react-hot-toast'
import { format } from 'date-fns'
import ptBR from 'date-fns/locale/pt-BR'

interface Props {
  inicio: string
  fim: string
}

export default function VendasPorPeriodo({ inicio, fim }: Props) {
  const [dados, setDados] = useState<RelatorioVendas | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    carregarDados()
  }, [inicio, fim])

  const carregarDados = async () => {
    try {
      setLoading(true)
      const data = await relatorioApi.vendasPorPeriodo(inicio, fim)
      setDados(data)
    } catch (error: any) {
      toast.error('Erro ao carregar relatório')
      console.error(error)
    } finally {
      setLoading(false)
    }
  }

  const formatarPreco = (preco: number) => {
    return preco.toLocaleString('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    })
  }

  const formatarData = (data: string) => {
    try {
      return format(new Date(data), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })
    } catch {
      return data
    }
  }

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow-lg p-12 text-center">
        <div className="text-xl text-gray-600">Carregando relatório...</div>
      </div>
    )
  }

  if (!dados) {
    return null
  }

  return (
    <div className="space-y-6">
      <div className="grid md:grid-cols-3 gap-6">
        <div className="bg-white rounded-lg shadow-lg p-6">
          <p className="text-sm text-gray-600 mb-2">Período</p>
          <p className="text-lg font-semibold text-gray-900">
            {formatarData(dados.periodo.inicio)} até {formatarData(dados.periodo.fim)}
          </p>
        </div>
        <div className="bg-white rounded-lg shadow-lg p-6">
          <p className="text-sm text-gray-600 mb-2">Total de Vendas</p>
          <p className="text-3xl font-bold text-primary-600">
            {dados.total_vendas}
          </p>
        </div>
        <div className="bg-white rounded-lg shadow-lg p-6">
          <p className="text-sm text-gray-600 mb-2">Faturamento Total</p>
          <p className="text-3xl font-bold text-primary-600">
            {formatarPreco(dados.faturamento_total)}
          </p>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-lg overflow-hidden">
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-xl font-bold text-gray-900">Vendas Detalhadas</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase">
                  ID
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase">
                  Data
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase">
                  Forma de Pagamento
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase">
                  Itens
                </th>
                <th className="px-6 py-4 text-right text-xs font-semibold text-gray-700 uppercase">
                  Valor Total
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {dados.vendas.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-8 text-center text-gray-600">
                    Nenhuma venda encontrada no período
                  </td>
                </tr>
              ) : (
                dados.vendas.map((venda) => (
                  <tr key={venda.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      #{venda.id}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                      {formatarData(venda.data_venda)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                      {venda.forma_pagamento}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                      {venda.total_itens || 0} item(s)
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-primary-600 text-right">
                      {formatarPreco(parseFloat(venda.valor_total))}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
