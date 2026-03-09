'use client'

import { useState } from 'react'
import { relatorioApi, ProdutoMaisVendido } from '@/lib/api'
import toast from 'react-hot-toast'
import { format, subDays } from 'date-fns'
import VendasPorPeriodo from '@/components/relatorios/VendasPorPeriodo'
import FaturamentoPorDia from '@/components/relatorios/FaturamentoPorDia'
import ProdutosMaisVendidos from '@/components/relatorios/ProdutosMaisVendidos'

type RelatorioTipo = 'vendas' | 'faturamento' | 'produtos'

export default function RelatoriosPage() {
  const [tipoRelatorio, setTipoRelatorio] = useState<RelatorioTipo>('vendas')
  const [inicio, setInicio] = useState(
    format(subDays(new Date(), 30), 'yyyy-MM-dd')
  )
  const [fim, setFim] = useState(format(new Date(), 'yyyy-MM-dd'))

  return (
    <div className="container mx-auto px-4">
      <h1 className="text-2xl font-bold text-gray-900 mb-4">Relatórios</h1>

      <div className="bg-white rounded-lg shadow p-4 mb-4">
        <div className="flex flex-wrap gap-4 mb-4">
          <button
            onClick={() => setTipoRelatorio('vendas')}
            className={`px-6 py-3 rounded-lg font-semibold transition-colors ${
              tipoRelatorio === 'vendas'
                ? 'bg-primary-500 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            Vendas por Período
          </button>
          <button
            onClick={() => setTipoRelatorio('faturamento')}
            className={`px-6 py-3 rounded-lg font-semibold transition-colors ${
              tipoRelatorio === 'faturamento'
                ? 'bg-primary-500 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            Faturamento por Dia
          </button>
          <button
            onClick={() => setTipoRelatorio('produtos')}
            className={`px-6 py-3 rounded-lg font-semibold transition-colors ${
              tipoRelatorio === 'produtos'
                ? 'bg-primary-500 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            Produtos Mais Vendidos
          </button>
        </div>

        {tipoRelatorio !== 'produtos' && (
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Data Início
              </label>
              <input
                type="date"
                value={inicio}
                onChange={(e) => setInicio(e.target.value)}
                className="w-full px-4 py-2 text-gray-900 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Data Fim
              </label>
              <input
                type="date"
                value={fim}
                onChange={(e) => setFim(e.target.value)}
                className="w-full px-4 py-2 text-gray-900 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              />
            </div>
          </div>
        )}
      </div>

      <div className="mt-6">
        {tipoRelatorio === 'vendas' && (
          <VendasPorPeriodo inicio={inicio} fim={fim} />
        )}
        {tipoRelatorio === 'faturamento' && (
          <FaturamentoPorDia inicio={inicio} fim={fim} />
        )}
        {tipoRelatorio === 'produtos' && <ProdutosMaisVendidos />}
      </div>
    </div>
  )
}
