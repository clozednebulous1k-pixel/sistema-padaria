'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { vendaApi, Venda } from '@/lib/api'
import toast from 'react-hot-toast'
import Link from 'next/link'
import { format } from 'date-fns'
import ptBR from 'date-fns/locale/pt-BR'

export default function DetalhesVendaPage() {
  const params = useParams()
  const router = useRouter()
  const id = Number(params.id)
  const [venda, setVenda] = useState<Venda | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    carregarVenda()
  }, [id])

  const carregarVenda = async () => {
    try {
      setLoading(true)
      const data = await vendaApi.buscar(id)
      setVenda(data)
    } catch (error: any) {
      toast.error('Erro ao carregar venda')
      router.push('/vendas')
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
      return format(new Date(data), "dd 'de' MMMM 'de' yyyy 'às' HH:mm", {
        locale: ptBR,
      })
    } catch {
      return data
    }
  }

  if (loading) {
    return (
      <div className="container mx-auto px-4">
        <div className="flex justify-center items-center min-h-[400px]">
          <div className="text-xl text-gray-600">Carregando...</div>
        </div>
      </div>
    )
  }

  if (!venda) {
    return null
  }

  return (
    <div className="container mx-auto px-4 max-w-4xl">
      <div className="mb-4">
        <Link
          href="/vendas"
          className="text-primary-600 hover:text-primary-700 font-semibold text-sm mb-1 inline-block"
        >
          ← Voltar para vendas
        </Link>
        <h1 className="text-2xl font-bold text-gray-900 mt-2">
          Detalhes da Venda #{venda.id}
        </h1>
      </div>

      <div className="bg-white rounded-lg shadow p-4 mb-4">
        <div className="grid md:grid-cols-2 gap-4 mb-4">
          <div>
            <p className="text-sm text-gray-600 mb-1">Data da Venda</p>
            <p className="text-lg font-semibold text-gray-900">
              {formatarData(venda.data_venda)}
            </p>
          </div>
          <div>
            <p className="text-sm text-gray-600 mb-1">Forma de Pagamento</p>
            <p className="text-lg font-semibold text-gray-900">
              {venda.forma_pagamento}
            </p>
          </div>
          {venda.nome_cliente && (
            <div>
              <p className="text-sm text-gray-600 mb-1">Cliente/Empresa</p>
              <p className="text-lg font-semibold text-gray-900">
                {venda.nome_cliente}
              </p>
            </div>
          )}
          {venda.roteiro_id && (
            <div>
              <p className="text-sm text-gray-600 mb-1">Roteiro de Entregas</p>
              <Link
                href={`/roteiros/${venda.roteiro_id}`}
                className="text-lg font-semibold text-primary-600 hover:text-primary-700"
              >
                Ver Roteiro #{venda.roteiro_id}
              </Link>
            </div>
          )}
        </div>

        <div className="border-t pt-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4">Itens da Venda</h2>
          {venda.itens && venda.itens.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">
                      Produto
                    </th>
                    <th className="px-4 py-3 text-center text-xs font-semibold text-gray-700 uppercase">
                      Quantidade
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-gray-700 uppercase">
                      Preço Unitário
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-gray-700 uppercase">
                      Subtotal
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {venda.itens.map((item) => (
                    <tr key={item.id}>
                      <td className="px-4 py-3 text-sm text-gray-900">
                        {item.produto_nome}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600 text-center">
                        {item.quantidade}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600 text-right">
                        {formatarPreco(item.preco_unitario)}
                      </td>
                      <td className="px-4 py-3 text-sm font-semibold text-gray-900 text-right">
                        {formatarPreco(item.subtotal)}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className="bg-gray-50">
                  <tr>
                    <td colSpan={3} className="px-4 py-4 text-right font-bold text-gray-900">
                      Total:
                    </td>
                    <td className="px-4 py-4 text-right font-bold text-primary-600 text-xl">
                      {formatarPreco(venda.valor_total)}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          ) : (
            <p className="text-gray-600">Nenhum item encontrado</p>
          )}
        </div>
      </div>
    </div>
  )
}
