'use client'

import { useEffect, useMemo, useState } from 'react'
import toast from 'react-hot-toast'
import { format } from 'date-fns'
import { roteiroApi } from '@/lib/api'
import { opcaoRelatorioParaLabel } from '@/lib/opcoesRelatorio'
import Link from 'next/link'
import Loading from '@/components/Loading'

type LinhaLancamento = {
  empresa: string
  pao: string
  quantidade: number
}

type PeriodoLancamentos = 'todos' | 'matutino' | 'noturno'

type RoteiroDisponivel = {
  id: number
  nome_empresa: string
  motorista?: string | null
  periodo?: string | null
  periodoTexto: string
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

  const hoje = useMemo(() => new Date(), [])
  const [dataSelecionada, setDataSelecionada] = useState<string>(() => {
    // yyyy-MM-dd
    return format(hoje, 'yyyy-MM-dd')
  })

  const [periodoSelecionado, setPeriodoSelecionado] = useState<PeriodoLancamentos>('todos')

  const [roteirosDisponiveis, setRoteirosDisponiveis] = useState<RoteiroDisponivel[]>([])
  const [roteirosSelecionados, setRoteirosSelecionados] = useState<number[]>([])

  const [empresasDisponiveis, setEmpresasDisponiveis] = useState<string[]>([])
  const [empresasSelecionadas, setEmpresasSelecionadas] = useState<string[]>([])
  const [buscaEmpresas, setBuscaEmpresas] = useState('')
  const [carregandoEmpresasDisponiveis, setCarregandoEmpresasDisponiveis] = useState(false)

  const [linhas, setLinhas] = useState<LinhaLancamento[]>([])
  const totalGeral = useMemo(() => linhas.reduce((s, l) => s + l.quantidade, 0), [linhas])

  const [carregado, setCarregado] = useState(false)

  const periodoLabel = (p: PeriodoLancamentos): string => {
    if (p === 'matutino') return 'Manhã'
    if (p === 'noturno') return 'Noite'
    return 'Todos'
  }

  const periodoAceitoParaFiltro = (periodoDb: string | null | undefined): PeriodoLancamentos => {
    const p = (periodoDb || '').trim().toLowerCase()
    if (p === 'matutino' || p === 'manha') return 'matutino'
    if (p === 'noturno' || p === 'noite') return 'noturno'
    return 'todos'
  }

  const periodoTextoRoteiro = (periodoDb: string | null | undefined): string => {
    const p = (periodoDb || '').trim().toLowerCase()
    if (!p) return 'Sem período'
    if (p === 'matutino' || p === 'manha') return 'Manhã'
    if (p === 'noturno' || p === 'noite') return 'Noite'
    return 'Sem período'
  }

  const carregarEmpresasDisponiveisParaData = async () => {
    if (!dataSelecionada) return
    try {
      setCarregandoEmpresasDisponiveis(true)
      setCarregado(false)
      setLinhas([])

      // 1) Pegamos roteiros por dia (e período quando aplicável)
      const roteirosDoDia = await roteiroApi.listar({ data_producao: dataSelecionada })
      const roteirosParaConsiderar = roteirosDoDia.filter((r) => {
        if (periodoSelecionado === 'todos') return true
        // Se não tiver período no roteiro, considera que aparece tanto em Manhã quanto em Noite
        if (!r.periodo || r.periodo.trim() === '') return true
        return periodoAceitoParaFiltro(r.periodo) === periodoSelecionado
      })

      setRoteirosDisponiveis(
        roteirosParaConsiderar
          .slice()
          .sort((a, b) => (a.motorista || '').localeCompare(b.motorista || '', 'pt-BR'))
          .map((r) => ({
            id: r.id,
            nome_empresa: r.nome_empresa,
            motorista: r.motorista ?? null,
            periodo: r.periodo ?? null,
            periodoTexto: periodoTextoRoteiro(r.periodo),
          })),
      )
      setRoteirosSelecionados(roteirosParaConsiderar.map((r) => r.id))

      // 2) Para cada roteiro selecionado, buscamos os itens
      const roteirosComItens = await Promise.all(
        roteirosParaConsiderar.map((r) => roteiroApi.buscar(r.id))
      )

      // 3) Extraímos as empresas que aparecem nos itens
      const empresasSet = new Set<string>()
      roteirosComItens.forEach((r) => {
        ;(r.itens || []).forEach((item) => {
          const empresaItem = (item.observacao || '').trim()
          const empresa = (empresaItem || (r.nome_empresa || '') || 'Sem empresa').trim()
          if (empresa) empresasSet.add(empresa)
        })
      })

      const lista = Array.from(empresasSet).sort((a, b) =>
        a.localeCompare(b, 'pt-BR', { sensitivity: 'base' })
      )

      setEmpresasDisponiveis(lista)
      // Padrão: seleciona todas para facilitar o uso
      setEmpresasSelecionadas(lista)
    } catch (e) {
      console.error(e)
      toast.error('Erro ao carregar empresas disponíveis')
      setEmpresasDisponiveis([])
      setEmpresasSelecionadas([])
    } finally {
      setCarregandoEmpresasDisponiveis(false)
    }
  }

  const buscarLancamentos = async () => {
    if (!dataSelecionada) {
      toast.error('Informe a data')
      return
    }
    if (!roteirosSelecionados || roteirosSelecionados.length === 0) {
      toast.error('Selecione pelo menos um roteiro')
      return
    }

    try {
      setLoading(true)
      setCarregado(true)

      // 1) Para cada roteiro selecionado, buscamos os itens
      const roteirosComItens = await Promise.all(roteirosSelecionados.map((id) => roteiroApi.buscar(id)))

      // 2) Filtra itens pelas empresas selecionadas (se houver)
      const empresasSelecionadasNorm = new Set(empresasSelecionadas.map(normalizarTexto))
      const filtrarPorEmpresa = empresasSelecionadasNorm.size > 0
      const itensSelecionadosComEmpresa: Array<{ item: any; empresa: string }> = []

      roteirosComItens.forEach((r) => {
        ;(r.itens || []).forEach((item) => {
          const empresaItem = (item.observacao || '').trim()
          const empresa = (empresaItem || (r.nome_empresa || '') || 'Sem empresa').trim()
          if (!empresa) return
          if (filtrarPorEmpresa && !empresasSelecionadasNorm.has(normalizarTexto(empresa))) return
          itensSelecionadosComEmpresa.push({ item, empresa })
        })
      })

      // 4) Agrega por empresa e por pão (pão + recheio + opção)
      const linhasMap = new Map<string, LinhaLancamento>()
      itensSelecionadosComEmpresa.forEach(({ item, empresa }) => {
        if (!empresa) return

        const pao = `${item.produto_nome || `ID: ${item.produto_id}`}${item.recheio ? ` ${item.recheio}` : ''}${
          item.opcao_relatorio ? ` ${opcaoRelatorioParaLabel(item.opcao_relatorio)}` : ''
        }`

        const key = `${empresa}||${pao.trim()}`
        if (!linhasMap.has(key)) {
          linhasMap.set(key, { empresa, pao: pao.trim(), quantidade: 0 })
        }
        const atual = linhasMap.get(key)!
        atual.quantidade += Number(item.quantidade) || 0
      })

      const linhasOrdenadas: LinhaLancamento[] = Array.from(linhasMap.values()).sort((a, b) => {
        const cmpEmp = a.empresa.localeCompare(b.empresa, 'pt-BR', { sensitivity: 'base' })
        if (cmpEmp !== 0) return cmpEmp
        return a.pao.localeCompare(b.pao, 'pt-BR', { sensitivity: 'base' })
      })

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
    const periodoTexto = periodoLabel(periodoSelecionado)
    const empresasUnicas = Array.from(new Set(linhas.map((l) => l.empresa))).sort((a, b) =>
      a.localeCompare(b, 'pt-BR', { sensitivity: 'base' })
    )
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
  <title>Lançamentos - ${dataFormatada} (${periodoTexto})</title>
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
  <h1>Lançamentos - ${dataFormatada} (${periodoTexto})</h1>
  <div class="info">
    <p><strong>Data:</strong> ${dataFormatada}</p>
    <p><strong>Período:</strong> ${periodoTexto}</p>
    <p><strong>Empresas:</strong> ${empresasUnicas.join(', ')}</p>
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
    carregarEmpresasDisponiveisParaData()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    setEmpresasSelecionadas([])
    setBuscaEmpresas('')
    setLinhas([])
    carregarEmpresasDisponiveisParaData()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dataSelecionada, periodoSelecionado])

  if (loading && !carregado) return <Loading />

  const empresasDisponiveisFiltradas = useMemo(() => {
    const q = normalizarTexto(buscaEmpresas)
    if (!q) return empresasDisponiveis
    return empresasDisponiveis.filter((e) => normalizarTexto(e).includes(q))
  }, [buscaEmpresas, empresasDisponiveis])

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
          Selecione a data e as empresas para listar os pedidos e imprimir.
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

          <div className="flex-1 min-w-[220px]">
            <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">Período</label>
            <select
              value={periodoSelecionado}
              onChange={(e) => setPeriodoSelecionado(e.target.value as PeriodoLancamentos)}
              className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 text-sm"
            >
              <option value="todos">Todos</option>
              <option value="matutino">Manhã</option>
              <option value="noturno">Noite</option>
            </select>
          </div>

          <div className="flex gap-2">
            <button
              type="button"
              onClick={buscarLancamentos}
              disabled={loading || roteirosSelecionados.length === 0}
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

        <div className="mt-3">
          <div className="flex flex-wrap gap-3 items-end justify-between">
            <div className="min-w-[260px] flex-1">
              <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                Empresas disponíveis nessa data
              </label>
              <input
                value={buscaEmpresas}
                onChange={(e) => setBuscaEmpresas(e.target.value)}
                placeholder="Buscar empresa..."
                className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 text-sm"
              />
            </div>

            <div className="flex gap-2 items-center">
              <button
                type="button"
                disabled={carregandoEmpresasDisponiveis || empresasDisponiveis.length === 0}
                onClick={() => setEmpresasSelecionadas(empresasDisponiveis)}
                className="px-3 py-2 bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200 rounded-lg font-semibold hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm"
              >
                Selecionar todas
              </button>
              <button
                type="button"
                disabled={carregandoEmpresasDisponiveis || empresasSelecionadas.length === 0}
                onClick={() => setEmpresasSelecionadas([])}
                className="px-3 py-2 bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200 rounded-lg font-semibold hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm"
              >
                Limpar
              </button>
              <div className="text-sm text-gray-600 dark:text-gray-400">
                {empresasSelecionadas.length} selecionada(s)
              </div>
            </div>
          </div>

          <div className="mt-3">
            <div className="flex flex-wrap gap-3 items-end justify-between mb-2">
              <div className="min-w-[260px] flex-1">
                <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                  Roteiros disponíveis nesse dia
                </label>
              </div>
              <div className="flex gap-2 items-center">
                <button
                  type="button"
                  disabled={roteirosDisponiveis.length === 0}
                  onClick={() => setRoteirosSelecionados(roteirosDisponiveis.map((r) => r.id))}
                  className="px-3 py-2 bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200 rounded-lg font-semibold hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                >
                  Selecionar todos
                </button>
                <button
                  type="button"
                  disabled={roteirosSelecionados.length === 0}
                  onClick={() => setRoteirosSelecionados([])}
                  className="px-3 py-2 bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200 rounded-lg font-semibold hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                >
                  Limpar
                </button>
                <div className="text-sm text-gray-600 dark:text-gray-400">
                  {roteirosSelecionados.length} selecionado(s)
                </div>
              </div>
            </div>

            <div className="mt-2 max-h-[22vh] overflow-auto rounded-lg border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-900/20 p-3">
              {carregandoEmpresasDisponiveis ? (
                <div className="text-sm text-gray-600 dark:text-gray-400">Carregando roteiros...</div>
              ) : roteirosDisponiveis.length === 0 ? (
                <div className="text-sm text-gray-600 dark:text-gray-400">Nenhum roteiro disponível para essa data.</div>
              ) : (
                <div className="space-y-2">
                  {roteirosDisponiveis.map((r) => {
                    const checked = roteirosSelecionados.includes(r.id)
                    const rotLabel = `${r.id} · ${r.motorista ? `Motorista: ${r.motorista}` : 'Sem motorista'} · ${r.periodoTexto}`
                    return (
                      <label key={r.id} className="flex items-center gap-2 text-sm select-none cursor-pointer">
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={(e) => {
                            const shouldSelect = e.target.checked
                            setRoteirosSelecionados((prev) => {
                              if (shouldSelect) return Array.from(new Set([...prev, r.id]))
                              return prev.filter((x) => x !== r.id)
                            })
                          }}
                        />
                        <span className="text-gray-900 dark:text-gray-100">{rotLabel}</span>
                      </label>
                    )
                  })}
                </div>
              )}
            </div>
          </div>

          <div className="mt-2 max-h-[42vh] overflow-auto rounded-lg border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-900/20 p-3">
            {carregandoEmpresasDisponiveis ? (
              <div className="text-sm text-gray-600 dark:text-gray-400">Carregando empresas...</div>
            ) : empresasDisponiveisFiltradas.length === 0 ? (
              <div className="text-sm text-gray-600 dark:text-gray-400">
                {empresasDisponiveis.length === 0 ? 'Nenhuma empresa disponível para essa data.' : 'Nenhuma empresa encontrada no filtro.'}
              </div>
            ) : (
              <div className="space-y-2">
                {empresasDisponiveisFiltradas.map((empresa) => {
                  const checked = empresasSelecionadas.includes(empresa)
                  return (
                    <label key={empresa} className="flex items-center gap-2 text-sm select-none cursor-pointer">
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={(e) => {
                          const shouldSelect = e.target.checked
                          setEmpresasSelecionadas((prev) => {
                            if (shouldSelect) return Array.from(new Set([...prev, empresa]))
                            return prev.filter((x) => x !== empresa)
                          })
                        }}
                      />
                      <span className="text-gray-900 dark:text-gray-100">{empresa}</span>
                    </label>
                  )
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      {linhas.length === 0 ? (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 text-center text-gray-600 dark:text-gray-400">
          {loading ? 'Carregando...' : 'Selecione uma data e as empresas para ver os lançamentos.'}
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

