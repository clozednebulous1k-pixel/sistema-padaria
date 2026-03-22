'use client'

import { useState, useEffect } from 'react'
import { produtoApi, roteiroApi, massaApi, Produto, Roteiro } from '@/lib/api'
import toast from 'react-hot-toast'
import Loading from '@/components/Loading'
import { format, addDays, subDays, parseISO, startOfMonth, endOfMonth, eachDayOfInterval, startOfWeek, endOfWeek, getMonth, getYear } from 'date-fns'

const STORAGE_KEY_TIPOS_MASSA = 'tipos_massa_padaria'
const STORAGE_KEY_DATA_SELECIONADA_MASSAS = 'data_selecionada_massas'

const DIAS_SEMANA = [
  'Segunda-feira',
  'Terça-feira',
  'Quarta-feira',
  'Quinta-feira',
  'Sexta-feira',
  'Sábado',
  'Domingo'
]

interface ConsumoProduto {
  nomeProduto: string
  quantidade: number
}

export default function MassasPage() {
  const [dataSelecionada, setDataSelecionada] = useState<Date>(() => {
    if (typeof window !== 'undefined') {
      const dataSalva = localStorage.getItem(STORAGE_KEY_DATA_SELECIONADA_MASSAS)
      if (dataSalva) {
        try {
          return parseISO(dataSalva)
        } catch {
          return new Date()
        }
      }
    }
    return new Date()
  })

  const [loading, setLoading] = useState(true)
  const [produtos, setProdutos] = useState<Produto[]>([])
  const [roteiros, setRoteiros] = useState<Roteiro[]>([])
  const [tiposMassa, setTiposMassa] = useState<string[]>([])
  const [consumoProdutos, setConsumoProdutos] = useState<Map<string, number>>(new Map())
  const [periodoSelecionado, setPeriodoSelecionado] = useState<'manha' | 'noite' | '24h'>('manha')
  const [mesCalendario, setMesCalendario] = useState<Date>(() => new Date())
  const [mostrarCalendario, setMostrarCalendario] = useState(false)

  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem(STORAGE_KEY_DATA_SELECIONADA_MASSAS, format(dataSelecionada, 'yyyy-MM-dd'))
    }
  }, [dataSelecionada])

  useEffect(() => {
    carregarDados()
  }, [])

  useEffect(() => {
    calcularConsumoProdutos()
  }, [roteiros, produtos, dataSelecionada, periodoSelecionado])

  const carregarDados = async () => {
    try {
      setLoading(true)

      const produtosData = await produtoApi.listar()
      const produtosAtivos = produtosData.filter((p) => p.ativo)
      setProdutos(produtosAtivos)

      const roteirosData = await roteiroApi.listar({})
      const roteirosProducao = roteirosData.filter((roteiro) =>
        DIAS_SEMANA.includes(roteiro.nome_empresa) && !roteiro.motorista
      )

      const roteirosComItens = await Promise.all(
        roteirosProducao.map(async (roteiro) => {
          try {
            return await roteiroApi.buscar(roteiro.id)
          } catch {
            return roteiro
          }
        })
      )

      setRoteiros(roteirosComItens)
      await carregarTiposMassa()
    } catch (error: any) {
      toast.error('Erro ao carregar dados')
      console.error('Erro ao carregar dados:', error)
    } finally {
      setLoading(false)
    }
  }

  const carregarTiposMassa = async () => {
    try {
      const tiposData = await massaApi.listar()
      if (tiposData?.length > 0) {
        setTiposMassa(tiposData.map((t) => t.nome))
        return
      }
      const tiposSalvos = localStorage.getItem(STORAGE_KEY_TIPOS_MASSA)
      if (tiposSalvos) {
        const tipos: string[] = JSON.parse(tiposSalvos)
        for (const nome of tipos) {
          try {
            await massaApi.criar(nome)
          } catch {}
        }
        setTiposMassa(tipos)
        return
      }
    } catch (err) {
      console.warn('API indisponível, usando localStorage para tipos:', err)
    }
    try {
      const tiposSalvos = localStorage.getItem(STORAGE_KEY_TIPOS_MASSA)
      if (tiposSalvos) {
        setTiposMassa(JSON.parse(tiposSalvos))
      } else {
        setTiposMassa(['Massa Salgada', 'Massa Doce', 'Massa Integral', 'Massa Especial'])
      }
    } catch (error) {
      console.error('Erro ao carregar tipos de massa:', error)
    }
  }

  const calcularConsumoProdutos = () => {
    const consumo = new Map<string, number>()
    const dataFormatada = format(dataSelecionada, 'yyyy-MM-dd')

    const roteirosFiltrados = roteiros.filter((roteiro) => {
      const correspondeAoDia = DIAS_SEMANA.includes(roteiro.nome_empresa)
      const naoEhMotorista = !roteiro.motorista
      let dataRoteiro = roteiro.data_producao
      if (dataRoteiro) {
        if (dataRoteiro.includes('T')) dataRoteiro = dataRoteiro.split('T')[0]
        else if (dataRoteiro.includes(' ')) dataRoteiro = dataRoteiro.split(' ')[0]
      }
      const correspondeAData = dataRoteiro === dataFormatada
      const periodoRoteiro = roteiro.periodo || ''
      const correspondeAoPeriodo =
        periodoSelecionado === '24h'
          ? (periodoRoteiro === 'manha' || periodoRoteiro === 'noite')
          : periodoSelecionado === 'manha'
            ? periodoRoteiro === 'manha'
            : periodoRoteiro === 'noite'
      return correspondeAoDia && naoEhMotorista && correspondeAData && correspondeAoPeriodo
    })

    roteirosFiltrados.forEach((roteiro) => {
      if (roteiro.itens && roteiro.itens.length > 0) {
        roteiro.itens.forEach((item) => {
          const produto = produtos.find((p) => p.id === item.produto_id)
          const nomeProduto = produto?.nome ?? item.produto_nome ?? `Produto ${item.produto_id}`
          const quantidade = Number(item.quantidade)
          const quantidadeAtual = consumo.get(nomeProduto) || 0
          consumo.set(nomeProduto, quantidadeAtual + quantidade)
        })
      }
    })

    setConsumoProdutos(consumo)
  }

  const imprimirLista = () => {
    const janelaImpressao = window.open('', '_blank')
    if (janelaImpressao) {
      const consumoArray = Array.from(consumoProdutos.entries())
        .map(([nome, quantidade]) => ({ nome, quantidade }))
        .sort((a, b) => a.nome.localeCompare(b.nome))

      const totalGeral = consumoArray.reduce((sum, item) => sum + item.quantidade, 0)
      const periodoLabel = periodoSelecionado === 'manha' ? 'Manhã' : periodoSelecionado === 'noite' ? 'Noite' : '24h'
      const dataFormatada = format(dataSelecionada, 'dd/MM/yyyy')
      const diasSemanaPT: Record<number, string> = {
        0: 'Domingo', 1: 'Segunda-feira', 2: 'Terça-feira', 3: 'Quarta-feira',
        4: 'Quinta-feira', 5: 'Sexta-feira', 6: 'Sábado'
      }
      const diaSemanaNome = diasSemanaPT[dataSelecionada.getDay()]

      janelaImpressao.document.write(`
<!DOCTYPE html>
<html>
  <head>
    <title>Roteiros de Entregas - ${dataFormatada} - ${periodoLabel}</title>
    <style>
      body { font-family: Arial, sans-serif; padding: 14px; font-size: 15px; }
      h1 { color: #333; border-bottom: 2px solid #550701; padding-bottom: 4px; margin-bottom: 8px; font-size: 20px; }
      .info { margin: 8px 0; padding: 10px 12px; background-color: #f9f9f9; border-left: 4px solid #f3b125; font-size: 13px; }
      .info p { margin: 2px 0; }
      table { width: 100%; border-collapse: collapse; margin: 8px 0; font-size: 15px; }
      th, td { border: 1px solid #ddd; padding: 10px 12px; text-align: left; }
      th { background-color: #550701; color: white; font-weight: bold; }
      td { background-color: #fff; }
      td:last-child { text-align: center; font-weight: bold; }
      .total { margin-top: 10px; padding: 12px; background-color: #550701; color: white; text-align: center; font-size: 16px; font-weight: bold; }
    </style>
  </head>
  <body>
    <h1>LISTA DE PRODUÇÃO - PÃES POR PRODUTO</h1>
    <div class="info">
      <p><strong>Data:</strong> ${diaSemanaNome}, ${dataFormatada}</p>
      <p><strong>Período:</strong> ${periodoLabel}</p>
      <p><strong>Data de Emissão:</strong> ${new Date().toLocaleDateString('pt-BR')}</p>
    </div>
    <table>
      <thead>
        <tr>
          <th style="width: 60%;">Nome do Produto</th>
          <th style="width: 40%;">Quantidade Total (pães)</th>
        </tr>
      </thead>
      <tbody>
        ${consumoArray.map((item) => `
          <tr>
            <td>${item.nome}</td>
            <td style="text-align: center;">${item.quantidade}</td>
          </tr>
        `).join('')}
      </tbody>
    </table>
    <div class="total">
      Total Geral: ${totalGeral} pães
    </div>
  </body>
</html>
      `)
      janelaImpressao.document.close()
      janelaImpressao.print()
    }
  }

  if (loading) {
    return <Loading />
  }

  const consumoArray = Array.from(consumoProdutos.entries())
    .map(([nome, quantidade]) => ({ nomeProduto: nome, quantidade }))
    .sort((a, b) => a.nomeProduto.localeCompare(b.nomeProduto))

  const totalGeral = consumoArray.reduce((sum, item) => sum + item.quantidade, 0)

  return (
    <div className="container mx-auto px-4">
      <div className="mb-4 flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Lista de Massas</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1 text-sm">
            Consolidação das massas necessárias por dia e período
          </p>
        </div>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-2 mb-4">
        <div className="flex flex-col md:flex-row items-center md:items-start gap-2">
          <div className="flex-1 w-full md:w-auto">
            <div className="flex flex-col items-center gap-1.5">
              <div className="text-center">
                <div className="text-base font-bold text-gray-900 dark:text-gray-100">
                  {(() => {
                    const diasSemanaPT: Record<number, string> = {
                      0: 'Domingo', 1: 'Segunda-feira', 2: 'Terça-feira', 3: 'Quarta-feira',
                      4: 'Quinta-feira', 5: 'Sexta-feira', 6: 'Sábado'
                    }
                    return diasSemanaPT[dataSelecionada.getDay()]
                  })()}
                </div>
                <div className="text-sm font-semibold text-gray-700 dark:text-gray-300 mt-0.5">
                  {format(dataSelecionada, 'dd/MM/yyyy')}
                </div>
              </div>

              <div className="flex items-center gap-1 w-full">
                <button
                  onClick={() => {
                    const novaData = subDays(dataSelecionada, 1)
                    setDataSelecionada(novaData)
                    setMesCalendario(novaData)
                  }}
                  className="flex-1 px-1.5 py-1 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 rounded text-xs font-semibold hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                >
                  ← Anterior
                </button>
                <button
                  onClick={() => {
                    const hoje = new Date()
                    setDataSelecionada(hoje)
                    setMesCalendario(hoje)
                  }}
                  className="px-1.5 py-1 bg-secondary-500 text-white rounded text-xs font-semibold hover:bg-secondary-600 transition-colors"
                >
                  Hoje
                </button>
                <button
                  onClick={() => {
                    const novaData = addDays(dataSelecionada, 1)
                    setDataSelecionada(novaData)
                    setMesCalendario(novaData)
                  }}
                  className="flex-1 px-1.5 py-1 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 rounded text-xs font-semibold hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                >
                  Próximo →
                </button>
              </div>

              <div className="w-full">
                <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-0.5 text-center">
                  Período
                </label>
                <div className="flex gap-1">
                  <button
                    onClick={() => setPeriodoSelecionado('manha')}
                    className={`flex-1 px-1.5 py-1 rounded text-xs font-semibold transition-colors ${
                      periodoSelecionado === 'manha'
                        ? 'bg-primary-500 text-white'
                        : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 hover:bg-gray-200 dark:hover:bg-gray-600'
                    }`}
                  >
                    Manhã
                  </button>
                  <button
                    onClick={() => setPeriodoSelecionado('noite')}
                    className={`flex-1 px-1.5 py-1 rounded text-xs font-semibold transition-colors ${
                      periodoSelecionado === 'noite'
                        ? 'bg-primary-500 text-white'
                        : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 hover:bg-gray-200 dark:hover:bg-gray-600'
                    }`}
                  >
                    Noite
                  </button>
                  <button
                    onClick={() => setPeriodoSelecionado('24h')}
                    className={`flex-1 px-1.5 py-1 rounded text-xs font-semibold transition-colors ${
                      periodoSelecionado === '24h'
                        ? 'bg-primary-500 text-white'
                        : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 hover:bg-gray-200 dark:hover:bg-gray-600'
                    }`}
                    title="Manhã + Noite"
                  >
                    24h
                  </button>
                </div>
              </div>
            </div>
          </div>

          <div className="relative">
            <button
              onClick={() => setMostrarCalendario(!mostrarCalendario)}
              className="px-2 py-1 bg-primary-500 text-white rounded text-xs font-semibold hover:bg-primary-600 transition-colors flex items-center gap-1"
            >
              Calendário
              <span className={`transform transition-transform ${mostrarCalendario ? 'rotate-180' : ''}`}>▼</span>
            </button>

            {mostrarCalendario && (
              <div className="absolute top-full right-0 mt-2 bg-white rounded-lg shadow-xl border border-gray-200 p-4 z-50 w-80">
                <div className="flex items-center justify-between mb-3">
                  <button
                    onClick={() => setMesCalendario(subDays(startOfMonth(mesCalendario), 1))}
                    className="px-2 py-1 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors font-semibold text-sm"
                  >
                    ←
                  </button>
                  <h3 className="text-sm font-bold text-gray-900">
                    {(() => {
                      const mesesPT = [
                        'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
                        'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
                      ]
                      return `${mesesPT[getMonth(mesCalendario)]} ${getYear(mesCalendario)}`
                    })()}
                  </h3>
                  <button
                    onClick={() => setMesCalendario(addDays(endOfMonth(mesCalendario), 1))}
                    className="px-2 py-1 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors font-semibold text-sm"
                  >
                    →
                  </button>
                </div>

                <div className="grid grid-cols-7 gap-1 mb-2">
                  {['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'].map((dia) => (
                    <div key={dia} className="text-center text-xs font-semibold text-gray-600 dark:text-gray-400 py-1">
                      {dia}
                    </div>
                  ))}
                </div>

                <div className="grid grid-cols-7 gap-1">
                  {(() => {
                    const inicioMes = startOfMonth(mesCalendario)
                    const fimMes = endOfMonth(mesCalendario)
                    const inicioSemana = startOfWeek(inicioMes, { weekStartsOn: 0 })
                    const fimSemana = endOfWeek(fimMes, { weekStartsOn: 0 })
                    const dias = eachDayOfInterval({ start: inicioSemana, end: fimSemana })

                    return dias.map((dia) => {
                      const diaFormatado = format(dia, 'yyyy-MM-dd')
                      const dataFormatadaSelecionada = format(dataSelecionada, 'yyyy-MM-dd')
                      const hojeFormatado = format(new Date(), 'yyyy-MM-dd')
                      const mesDia = getMonth(dia)
                      const mesAtual = getMonth(mesCalendario)
                      const isMesAtual = mesDia === mesAtual
                      const isSelecionado = diaFormatado === dataFormatadaSelecionada
                      const isHoje = diaFormatado === hojeFormatado

                      return (
                        <button
                          key={diaFormatado}
                          onClick={() => {
                            setDataSelecionada(dia)
                            setMesCalendario(dia)
                            setMostrarCalendario(false)
                          }}
                          className={`
                            py-1.5 px-1 rounded-lg text-xs font-semibold transition-colors
                            ${!isMesAtual ? 'text-gray-300 dark:text-gray-500' : 'text-gray-900 dark:text-gray-100'}
                            ${isSelecionado
                              ? 'bg-primary-500 text-white'
                              : isHoje
                                ? 'bg-secondary-500 text-white hover:bg-secondary-600'
                                : 'hover:bg-gray-100 dark:hover:bg-gray-700'
                            }
                          `}
                        >
                          {format(dia, 'd')}
                        </button>
                      )
                    })
                  })()}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4 mb-4">
        <div className="flex justify-between items-center mb-3">
          <div>
            <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">
              Produtos necessários - {format(dataSelecionada, 'dd/MM/yyyy')}
            </h2>
            <p className="text-xs text-gray-600 dark:text-gray-400 mt-0.5">
              {(() => {
                const diasSemanaPT: Record<number, string> = {
                  0: 'Domingo', 1: 'Segunda-feira', 2: 'Terça-feira', 3: 'Quarta-feira',
                  4: 'Quinta-feira', 5: 'Sexta-feira', 6: 'Sábado'
                }
                return `${diasSemanaPT[dataSelecionada.getDay()]} - ${periodoSelecionado === 'manha' ? 'Manhã' : periodoSelecionado === 'noite' ? 'Noite' : '24h'}`
              })()}
            </p>
          </div>
          {consumoArray.length > 0 && (
            <button
              onClick={imprimirLista}
              className="px-4 py-1.5 bg-primary-500 text-white rounded-lg text-sm font-semibold hover:bg-primary-600 transition-colors"
            >
              Imprimir Lista
            </button>
          )}
        </div>

        {consumoArray.length === 0 ? (
          <div className="text-center py-8 text-gray-600 dark:text-gray-400">
            <p className="text-base">Nenhum pedido para este dia e período.</p>
            <p className="text-xs mt-1">
              Adicione pedidos nas listas de produção para ver os produtos e quantidades aqui.
            </p>
          </div>
        ) : (
          <>
            <table className="w-full text-sm">
              <thead className="bg-gray-50 dark:bg-gray-700">
                <tr>
                  <th className="px-3 py-2 text-left text-xs font-semibold text-gray-700 dark:text-gray-200 uppercase">
                    Nome do Produto
                  </th>
                  <th className="px-3 py-2 text-center text-xs font-semibold text-gray-700 dark:text-gray-200 uppercase">
                    Quantidade Total (pães)
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-600">
                {consumoArray.map((item, index) => (
                  <tr key={index} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                    <td className="px-3 py-2 text-sm font-semibold text-gray-900 dark:text-gray-100">{item.nomeProduto}</td>
                    <td className="px-3 py-2 text-sm text-gray-900 dark:text-gray-100 text-center font-bold">
                      {item.quantidade}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            <div className="mt-4 pt-3 border-t border-gray-200 dark:border-gray-600">
              <div className="flex justify-between items-center">
                <span className="text-base font-semibold text-gray-700 dark:text-gray-300">Total Geral:</span>
                <span className="text-xl font-bold text-primary-600 dark:text-primary-400">{totalGeral} pães</span>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
