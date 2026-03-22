'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { roteiroApi, Roteiro } from '@/lib/api'
import toast from 'react-hot-toast'
import Link from 'next/link'
import { formatarDataProducaoBR } from '@/lib/formatarDataBrasil'

export default function DetalhesRoteiroPage() {
  const params = useParams()
  const router = useRouter()
  const id = Number(params.id)
  const [roteiro, setRoteiro] = useState<Roteiro | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    carregarRoteiro()
  }, [id])

  const carregarRoteiro = async () => {
    try {
      setLoading(true)
      const data = await roteiroApi.buscar(id)
      setRoteiro(data)
    } catch (error: any) {
      toast.error('Erro ao carregar roteiro')
      router.push('/roteiros', { scroll: false })
    } finally {
      setLoading(false)
    }
  }

  const carregarDadosImpressao = async () => {
    try {
      const dados = await roteiroApi.dadosImpressao(id)
      
      // Formatar data para impressão
      const dataFormatada = formatarDataProducaoBR(dados.data_producao)
      
      // Criar uma nova janela para impressão
      const janelaImpressao = window.open('', '_blank')
      if (janelaImpressao) {
        janelaImpressao.document.write(`
          <!DOCTYPE html>
          <html>
            <head>
              <title>Roteiro de Entregas - ${dados.nome_empresa}</title>
              <style>
                body { font-family: Arial, sans-serif; padding: 14px; font-size: 15px; }
                h1 { color: #333; border-bottom: 2px solid #550701; padding-bottom: 4px; margin-bottom: 8px; font-size: 20px; }
                .info { margin: 8px 0; font-size: 13px; }
                .info p { margin: 2px 0; }
                table { width: 100%; border-collapse: collapse; margin: 8px 0; font-size: 15px; }
                th, td { border: 1px solid #ddd; padding: 10px 12px; text-align: left; }
                th { background-color: #550701; color: white; }
              </style>
            </head>
            <body>
              <h1>Roteiro de Entregas</h1>
              <div class="info">
                <p><strong>Data:</strong> ${dataFormatada}</p>
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
                  ${dados.itens?.map((item: any) => `
                    <tr>
                      <td>${dados.nome_empresa || 'N/A'}</td>
                      <td>${item.produto_nome || 'N/A'}</td>
                      <td>${item.quantidade}</td>
                    </tr>
                  `).join('') || '<tr><td colspan="3">Nenhum item encontrado</td></tr>'}
                </tbody>
              </table>
            </body>
          </html>
        `)
        janelaImpressao.document.close()
        janelaImpressao.print()
      }
    } catch (error: any) {
      toast.error('Erro ao gerar dados para impressão')
      console.error(error)
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

  if (!roteiro) {
    return null
  }

  return (
    <div className="container mx-auto px-4 max-w-5xl">
      <div className="mb-4">
        <Link
          href="/roteiros"
          className="text-primary-600 hover:text-primary-700 font-semibold text-sm mb-1 inline-block"
        >
          ← Voltar para roteiros
        </Link>
        <div className="flex justify-between items-center mt-2">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              Roteiro de Entregas
            </h1>
            <p className="text-sm text-gray-600 mt-0.5">
              Data: {formatarDataProducaoBR(roteiro.data_producao)}
            </p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={carregarDadosImpressao}
              className="bg-primary-500 text-white px-4 py-2 text-sm rounded-lg font-semibold hover:bg-primary-600 transition-colors"
            >
              Imprimir
            </button>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow p-4 mb-4">
        <div className="mb-3 pb-3 border-b">
          <h2 className="text-lg font-bold text-gray-900">
            Pães do Dia
          </h2>
          <p className="text-sm text-gray-600 mt-1">
            Todos os pães do dia organizados por empresa
          </p>
        </div>

        <div className="mt-6">
          {roteiro.itens && roteiro.itens.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">
                      Empresa
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">
                      Pão
                    </th>
                    <th className="px-4 py-3 text-center text-xs font-semibold text-gray-700 uppercase">
                      Quantidade
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {roteiro.itens.map((item) => (
                    <tr key={item.id}>
                      <td className="px-4 py-3 text-sm font-semibold text-gray-900">
                        {roteiro.nome_empresa || '-'}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-900">
                        {item.produto_nome || `Produto ID: ${item.produto_id}`}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600 text-center font-semibold">
                        {item.quantidade}
                      </td>
                    </tr>
                  ))}
                </tbody>
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
