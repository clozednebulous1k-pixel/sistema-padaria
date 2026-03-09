'use client'

import { useState, useEffect } from 'react'
import { relatorioApi } from '@/lib/api'
import toast from 'react-hot-toast'
import { format } from 'date-fns'
import ptBR from 'date-fns/locale/pt-BR'

interface Props {
  inicio: string
  fim: string
}

interface FaturamentoDia {
  data: string
  faturamento: number
}

export default function FaturamentoPorDia({ inicio, fim }: Props) {
  const [dados, setDados] = useState<FaturamentoDia[]>([])
  const [loading, setLoading] = useState(true)
  const [total, setTotal] = useState(0)

  useEffect(() => {
    carregarDados()
  }, [inicio, fim])

  const carregarDados = async () => {
    try {
      setLoading(true)
      const data = await relatorioApi.faturamentoPorDia(inicio, fim)
      
      // A API pode retornar em diferentes formatos
      if (Array.isArray(data)) {
        setDados(data)
        setTotal(data.reduce((sum, item) => sum + (item.faturamento || 0), 0))
      } else if (data.faturamento_por_dia) {
        setDados(data.faturamento_por_dia)
        setTotal(data.total || 0)
      } else {
        setDados([])
        setTotal(0)
      }
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

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg shadow-lg p-6">
        <p className="text-sm text-gray-600 mb-2">Faturamento Total no Período</p>
        <p className="text-4xl font-bold text-primary-600">
          {formatarPreco(total)}
        </p>
      </div>

      <div className="bg-white rounded-lg shadow-lg overflow-hidden">
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-xl font-bold text-gray-900">Faturamento por Dia</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase">
                  Data
                </th>
                <th className="px-6 py-4 text-right text-xs font-semibold text-gray-700 uppercase">
                  Faturamento
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {dados.length === 0 ? (
                <tr>
                  <td colSpan={2} className="px-6 py-8 text-center text-gray-600">
                    Nenhum dado encontrado no período
                  </td>
                </tr>
              ) : (
                dados.map((item, index) => (
                  <tr key={index} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {formatarData(item.data)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-primary-600 text-right">
                      {formatarPreco(item.faturamento)}
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
