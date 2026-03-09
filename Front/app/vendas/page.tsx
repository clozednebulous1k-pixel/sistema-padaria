'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { vendaApi, Venda } from '@/lib/api'
import toast from 'react-hot-toast'
import { format } from 'date-fns'
import ptBR from 'date-fns/locale/pt-BR'

export default function VendasPage() {
  const [vendas, setVendas] = useState<Venda[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    carregarVendas()
  }, [])

  const carregarVendas = async () => {
    try {
      setLoading(true)
      const data = await vendaApi.listar()
      setVendas(data)
    } catch (error: any) {
      toast.error('Erro ao carregar vendas')
      console.error(error)
    } finally {
      setLoading(false)
    }
  }

  const formatarPreco = (preco: string) => {
    return parseFloat(preco).toLocaleString('pt-BR', {
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
      <div className="container mx-auto px-4">
        <div className="flex justify-center items-center min-h-[400px]">
          <div className="text-xl text-gray-600">Carregando vendas...</div>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4">
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-2xl font-bold text-gray-900">Vendas</h1>
        <Link
          href="/vendas/nova"
          className="bg-primary-500 text-white px-4 py-2 text-sm rounded-lg font-semibold hover:bg-primary-600 transition-colors"
        >
          + Nova Venda
        </Link>
      </div>

      {vendas.length === 0 ? (
        <div className="bg-white rounded-lg shadow p-8 text-center">
          <div className="text-5xl mb-3">💰</div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">
            Nenhuma venda registrada
          </h2>
          <p className="text-gray-600 mb-4 text-sm">
            Comece registrando sua primeira venda
          </p>
          <Link
            href="/vendas/nova"
            className="inline-block bg-primary-500 text-white px-4 py-2 text-sm rounded-lg font-semibold hover:bg-primary-600 transition-colors"
          >
            Nova Venda
          </Link>
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow overflow-hidden">
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
                    Cliente
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
                  <th className="px-6 py-4 text-center text-xs font-semibold text-gray-700 uppercase">
                    Ações
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {vendas.map((venda) => (
                  <tr key={venda.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      #{venda.id}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                      {formatarData(venda.data_venda)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                      {venda.nome_cliente || '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                      {venda.forma_pagamento}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                      {venda.total_itens || venda.itens?.length || 0} item(s)
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-primary-600 text-right">
                      {formatarPreco(venda.valor_total)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-center">
                      <div className="flex flex-col gap-1">
                        <Link
                          href={`/vendas/${venda.id}`}
                          className="text-primary-600 hover:text-primary-700 font-semibold text-sm"
                        >
                          Ver Detalhes
                        </Link>
                        {venda.roteiro_id && (
                          <Link
                            href={`/roteiros/${venda.roteiro_id}`}
                            className="text-blue-600 hover:text-blue-700 text-xs"
                          >
                            Roteiro #{venda.roteiro_id}
                          </Link>
                        )}
                      </div>
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
}
