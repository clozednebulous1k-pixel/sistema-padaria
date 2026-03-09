'use client'

import { useState, useEffect } from 'react'
import { relatorioApi, ProdutoMaisVendido } from '@/lib/api'
import toast from 'react-hot-toast'

export default function ProdutosMaisVendidos() {
  const [produtos, setProdutos] = useState<ProdutoMaisVendido[]>([])
  const [loading, setLoading] = useState(true)
  const [limit, setLimit] = useState(10)

  useEffect(() => {
    carregarDados()
  }, [limit])

  const carregarDados = async () => {
    try {
      setLoading(true)
      const data = await relatorioApi.produtosMaisVendidos(limit)
      setProdutos(data)
    } catch (error: any) {
      toast.error('Erro ao carregar relatório')
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

  const formatarNumero = (numero: string) => {
    return parseFloat(numero).toLocaleString('pt-BR')
  }

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow-lg p-12 text-center">
        <div className="text-xl text-gray-600">Carregando relatório...</div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg shadow-lg p-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold text-gray-900">
            Produtos Mais Vendidos
          </h2>
          <select
            value={limit}
            onChange={(e) => setLimit(Number(e.target.value))}
            className="px-4 py-2 text-gray-900 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
          >
            <option value={5}>Top 5</option>
            <option value={10}>Top 10</option>
            <option value={20}>Top 20</option>
            <option value={50}>Top 50</option>
          </select>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase">
                  Posição
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase">
                  Produto
                </th>
                <th className="px-6 py-4 text-right text-xs font-semibold text-gray-700 uppercase">
                  Quantidade Vendida
                </th>
                <th className="px-6 py-4 text-right text-xs font-semibold text-gray-700 uppercase">
                  Total de Vendas
                </th>
                <th className="px-6 py-4 text-right text-xs font-semibold text-gray-700 uppercase">
                  Faturamento
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {produtos.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-8 text-center text-gray-600">
                    Nenhum produto encontrado
                  </td>
                </tr>
              ) : (
                produtos.map((produto, index) => (
                  <tr key={produto.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-primary-100 text-primary-700 font-bold">
                        {index + 1}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-gray-900">
                      {produto.nome}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 text-right">
                      {formatarNumero(produto.quantidade_total_vendida)} un.
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 text-right">
                      {formatarNumero(produto.total_vendas)} venda(s)
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-primary-600 text-right">
                      {formatarPreco(produto.faturamento_produto)}
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
