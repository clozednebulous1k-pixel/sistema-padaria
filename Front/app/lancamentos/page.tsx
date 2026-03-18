'use client'

import { useEffect, useMemo, useState } from 'react'
import toast from 'react-hot-toast'
import { format } from 'date-fns'
import { empresaApi, roteiroApi, Empresa } from '@/lib/api'
import { opcaoRelatorioParaLabel } from '@/lib/opcoesRelatorio'
import Link from 'next/link'
import { SelectComBusca } from '@/components/SelectComBusca'
import Loading from '@/components/Loading'
import { useTheme } from '@/components/ThemeProvider'

type LinhaLancamento = {
  empresa: string
  pao: string
  quantidade: number
}

function normalizarTexto(s: string): string {
  return (s || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
}

export default function LancamentosPage() {
  const [loading, setLoading] = useState(false)
  const { darkMode } = useTheme()

  const hoje = useMemo(() => new Date(), [])
  const [dataSelecionada, setDataSelecionada] = useState<string>(() => {
    // yyyy-MM-dd
    return format(hoje, 'yyyy-MM-dd')
  })

  const [empresas, setEmpresas] = useState<Empresa[]>([])
  const [empresaSelecionada, setEmpresaSelecionada] = useState<string>('')

  const empresasOptions = useMemo(() => {
    return empresas
      .map((e) => e.nome)
      .slice()
      .sort((a, b) => a.localeCompare(b, 'pt-BR', { sensitivity: 'base' }))
  }, [empresas])

  const [linhas, setLinhas] = useState<LinhaLancamento[]>([])
  const totalGeral = useMemo(() => linhas.reduce((s, l) => s + l.quantidade, 0), [linhas])

  const [carregado, setCarregado] = useState(false)

  const carregarEmpresas = async () => {
    try {
      setLoading(true)
      const lista = await empresaApi.listar()
      setEmpresas(lista)
    } catch (e) {
      console.error(e)
      toast.error('Erro ao carregar empresas')
    } finally {
      setLoading(false)
    }
  }

  const buscarLancamentos = async () => {
    if (!dataSelecionada) {
      toast.error('Informe a data')
      return
    }
    if (!empresaSelecionada) {
      toast.error('Selecione uma empresa')
      return
    }

    try {
      setLoading(true)
      setCarregado(true)

      // 1) Pegamos roteiros por data e filtramos apenas os de produção (motorista vazio)
      const roteirosDoDia = await roteiroApi.listar({ data_producao: dataSelecionada } as any)
      const roteirosProducao = roteirosDoDia.filter((r) => !r.motorista || r.motorista.trim() === '')

      // 2) Para cada roteiro, buscamos os itens
      const roteirosComItens = await Promise.all(
        roteirosProducao.map((r) => roteiroApi.buscar(r.id))
      )

      // 3) Filtra itens pela empresa (observacao guarda o nome da empresa)
      const empresaNorm = normalizarTexto(empresaSelecionada)
      const itensEmpresa = roteirosComItens.flatMap((r) => r.itens || []).filter((item) => {
        const obs = normalizarTexto(item.observacao || '')
        return obs === empresaNorm
      })

      // 4) Agrega por pão (pão + recheio + opção)
      const map = new Map<string, number>()
      itensEmpresa.forEach((item) => {
        const pao = `${item.produto_nome || `ID: ${item.produto_id}`}${item.recheio ? ` ${item.recheio}` : ''}${
          item.opcao_relatorio ? ` ${opcaoRelatorioParaLabel(item.opcao_relatorio)}` : ''
        }`
        const key = pao.trim()
        map.set(key, (map.get(key) || 0) + Number(item.quantidade) || 0)
      })

      const linhasOrdenadas: LinhaLancamento[] = Array.from(map.entries())
        .map(([pao, quantidade]) => ({
          empresa: empresaSelecionada,
          pao,
          quantidade,
        }))
        .sort((a, b) => a.pao.localeCompare(b.pao, 'pt-BR', { sensitivity: 'base' }))

      setLinhas(linhasOrdenadas)
    } catch (e) {
      console.error(e)
      toast.error('Erro ao buscar lançamentos')
      setLinhas([])
    } finally {
      setLoading(false)
    }
  }

  const abrirImpressao = () => {
    if (linhas.length === 0) {
      toast.error('Nada para imprimir')
      return
    }

    const dataFormatada = dataSelecionada
    const empresa = empresaSelecionada
    const linhasHtml = linhas
      .map(
        (l) => `
        <tr>
          <td>${l.empresa}</td>
          <td>${l.pao}</td>
          <td style="text-align:center;font-weight:bold;">${l.quantidade}</td>
        </tr>`
      )
      .join('')

    const janela = window.open('', '_blank')
    if (!janela) {
      toast.error('Permita pop-ups para imprimir.')
      return
    }

    janela.document.write(`
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Lançamentos - ${empresa} - ${dataFormatada}</title>
  <style>
    body { font-family: Arial, sans-serif; padding: 16px; font-size: 12px; }
    h1 { font-size: 16px; margin-bottom: 4px; color: #333; }
    .info { margin: 8px 0 12px; padding: 8px; background: #f5f5f5; border-left: 4px solid #550701; font-size: 11px; }
    table { width: 100%; border-collapse: collapse; margin: 8px 0; }
    th, td { border: 1px solid #ddd; padding: 8px 10px; text-align: left; }
    th { background: #550701; color: white; font-weight: bold; }
    td:last-child { text-align: center; font-weight: bold; }
    .total-geral { margin-top: 12px; padding: 10px; background: #550701; color: white; font-weight: bold; text-align:center; }
    @media print { body { -webkit-print-color-adjust: exact; print-color-adjust: exact; } }
  </style>
</head>
<body>
  <h1>Lançamentos - ${empresa}</h1>
  <div class="info">
    <p><strong>Data:</strong> ${dataFormatada}</p>
    <p><strong>Total de pães:</strong> ${totalGeral}</p>
  </div>
  <table>
    <thead>
      <tr>
        <th>Empresa</th>
        <th>Pão</th>
        <th>Quantidade</th>
      </tr>
    </thead>
    <tbody>${linhasHtml}</tbody>
  </table>
  <div class="total-geral">Total geral: ${totalGeral}</div>
</body>
</html>
    `)
    janela.document.close()
    janela.focus()
    janela.print()
  }

  useEffect(() => {
    cargar()
    // eslint-disable-next-line react-hooks/exhaustive-deps
    async function cargar() {
      await carregarEmpresas()
    }
  }, [])

  useEffect(() => {
    if (!empresaSelecionada && empresasOptions.length > 0) {
      setEmpresaSelecionada(empresasOptions[0])
    }
  }, [empresasOptions, empresaSelecionada])

  if (loading && !carregado) return <Loading />

  return (
    <div className="container mx-auto px-4 max-w-5xl">
      <div className="mb-4">
        <Link
          href="/"
          className="text-primary-600 hover:text-primary-700 font-semibold text-sm mb-1 inline-block"
        >
          ← Voltar
        </Link>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mt-2">Lançamentos</h1>
        <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
          Selecione a data e uma empresa para listar os pedidos e imprimir.
        </p>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4 mb-4 border border-gray-200 dark:border-gray-700">
        <div className="flex flex-wrap gap-3 items-end">
          <div className="flex-1 min-w-[220px]">
            <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">Data</label>
            <input
              type="date"
              value={dataSelecionada}
              onChange={(e) => setDataSelecionada(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 text-sm"
            />
          </div>

          <div className="flex-1 min-w-[260px]">
            <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">Empresa</label>
            <SelectComBusca
              options={empresasOptions.map((e) => ({ value: e, label: e }))}
              value={empresaSelecionada}
              onChange={(v) => setEmpresaSelecionada(v)}
              placeholder="Digite para buscar empresa..."
              dark={darkMode}
            />
          </div>

          <div className="flex gap-2">
            <button
              type="button"
              onClick={buscarLancamentos}
              disabled={loading}
              className="px-5 py-2 bg-primary-500 text-white rounded-lg font-semibold hover:bg-primary-600 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Buscando...' : 'Buscar'}
            </button>
            <button
              type="button"
              onClick={abrirImpressao}
              disabled={linhas.length === 0}
              className="px-5 py-2 bg-primary-600 text-white rounded-lg font-semibold hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed"
              title="Imprime os lançamentos"
            >
              Imprimir
            </button>
          </div>
        </div>
      </div>

      {linhas.length === 0 ? (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 text-center text-gray-600 dark:text-gray-400">
          {loading ? 'Carregando...' : 'Selecione uma data e uma empresa para ver os lançamentos.'}
        </div>
      ) : (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4 border border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100">Pedidos da empresa</h2>
            <div className="text-sm text-gray-600 dark:text-gray-400">
              {linhas.length} item(ns) · {totalGeral} un.
            </div>
          </div>
          <div className="overflow-x-auto rounded-lg border border-gray-200 dark:border-gray-600">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-primary-600 text-white">
                  <th className="px-3 py-2 text-left font-semibold">Empresa</th>
                  <th className="px-3 py-2 text-left font-semibold">Pão</th>
                  <th className="px-3 py-2 text-center font-semibold">Quantidade</th>
                </tr>
              </thead>
              <tbody>
                {linhas.map((l, idx) => (
                  <tr
                    key={`${l.empresa}-${l.pao}-${idx}`}
                    className="border-t border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 even:bg-gray-50 dark:even:bg-gray-700/50"
                  >
                    <td className="px-3 py-2 text-gray-900 dark:text-gray-100">{l.empresa}</td>
                    <td className="px-3 py-2 text-gray-900 dark:text-gray-100">{l.pao}</td>
                    <td className="px-3 py-2 text-center font-semibold text-gray-900 dark:text-gray-100">
                      {l.quantidade}
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

