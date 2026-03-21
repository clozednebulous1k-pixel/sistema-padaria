'use client'

import { useState, useEffect, useMemo, useRef } from 'react'
import Link from 'next/link'
import { roteiroApi, produtoApi, Produto, Roteiro } from '@/lib/api'
import toast from 'react-hot-toast'
import Loading from '@/components/Loading'
import { format, addDays, subDays, startOfWeek, endOfWeek, startOfMonth, endOfMonth, eachDayOfInterval, getMonth } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { getOpcoesRelatorio, opcaoRelatorioParaLabel } from '@/lib/opcoesRelatorio'

const DIAS_SEMANA = [
  'Segunda-feira',
  'Terça-feira',
  'Quarta-feira',
  'Quinta-feira',
  'Sexta-feira',
  'Sábado',
  'Domingo'
]

function normalizarParaBusca(s: string): string {
  return s
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
}

/** Chave única para comparar tipo de massa (Vercel/Postgres pode vir com caixa diferente do localhost). */
function chaveTipoMassa(s: string | null | undefined): string {
  return normalizarParaBusca(s || '')
}

function isMassaDoceTipo(s: string | null | undefined): boolean {
  return chaveTipoMassa(s) === 'massa doce'
}

function isMassaSalgadaTipo(s: string | null | undefined): boolean {
  return chaveTipoMassa(s) === 'massa salgada'
}

function pedidoCaiEmAlgumaMassaSelecionada(
  tipoPedido: string | null | undefined,
  massasSelecionadas: Set<string>
): boolean {
  if (!tipoPedido?.trim()) return false
  const k = chaveTipoMassa(tipoPedido)
  return [...massasSelecionadas].some((m) => chaveTipoMassa(m) === k)
}

function getDiaSemanaFromDate(date: Date): string {
  const day = date.getDay()
  return DIAS_SEMANA[day === 0 ? 6 : day - 1]
}

/** Extrai só o nome de exibição do roteiro (remove prefixo "Roteiro N - "). */
function nomeExibicaoRoteiro(observacoes: string | null | undefined, index: number): string {
  const obs = (observacoes || '').trim()
  if (!obs) return `Roteiro ${index + 1}`
  // Remove qualquer "Roteiro N - " no início (N pode ser qualquer número)
  const match = obs.match(/^Roteiro\s*\d+\s*[-–—]?\s*(.*)$/i)
  if (match) {
    const resto = (match[1] || '').trim()
    return resto || obs
  }
  return obs
}

export interface PedidoFiltro {
  empresa: string
  produto_id: number
  produto_nome: string
  tipo_massa: string | null
  opcao_relatorio: string | null
  recheio: string | null
  quantidade: number
}

export default function FiltrarRoteiroView() {
  const [dataSelecionada, setDataSelecionada] = useState<Date>(() => new Date())
  const [periodoSelecionado, setPeriodoSelecionado] = useState<'manha' | 'noite' | '24h'>('manha')
  const [loading, setLoading] = useState(true)
  const [salvando, setSalvando] = useState(false)
  const [roteirosDoDiaComItens, setRoteirosDoDiaComItens] = useState<Roteiro[]>([])
  const [roteirosSelecionados, setRoteirosSelecionados] = useState<Set<number>>(new Set())
  const [produtosAtivos, setProdutosAtivos] = useState<Produto[]>([])
  const [paesSelecionados, setPaesSelecionados] = useState<Set<string>>(new Set())
  const [empresasSelecionadas, setEmpresasSelecionadas] = useState<Set<string>>(new Set())
  const [todasEmpresasDesmarcadas, setTodasEmpresasDesmarcadas] = useState(false)
  const [mostrarCalendario, setMostrarCalendario] = useState(false)
  const [mesCalendario, setMesCalendario] = useState<Date>(() => new Date())
  const [buscaPao, setBuscaPao] = useState('')
  const [massasSelecionadas, setMassasSelecionadas] = useState<Set<string>>(new Set())
  const [buscaMassa, setBuscaMassa] = useState('')
  const [recheiosSelecionados, setRecheiosSelecionados] = useState<Set<string>>(new Set())
  const [buscaRecheio, setBuscaRecheio] = useState('')
  const [opcoesRelatorioSelecionadas, setOpcoesRelatorioSelecionadas] = useState<Set<string>>(new Set())
  const [opcoesRelatorioTodas, setOpcoesRelatorioTodas] = useState<string[]>([])
  const [buscaEmpresa, setBuscaEmpresa] = useState('')
  const [mostrarRoteiroMassaDoceCliente, setMostrarRoteiroMassaDoceCliente] = useState(false)
  const [mostrarRoteiroMassaSalgadaCliente, setMostrarRoteiroMassaSalgadaCliente] = useState(false)
  const painelRecheioRef = useRef<HTMLDivElement>(null)
  const mostrarFiltroRecheioAnterior = useRef(false)

  useEffect(() => {
    carregarPedidosDoDia()
  }, [dataSelecionada, periodoSelecionado])

  useEffect(() => {
    ;(async () => {
      try {
        const lista = await getOpcoesRelatorio()
        setOpcoesRelatorioTodas(lista)
      } catch {
        setOpcoesRelatorioTodas([])
      }
    })()
  }, [])

  const carregarPedidosDoDia = async () => {
    try {
      setLoading(true)
      const dataFormatada = format(dataSelecionada, 'yyyy-MM-dd')
      const diaSemana = getDiaSemanaFromDate(dataSelecionada)

      const [produtosData, todosRoteiros] = await Promise.all([
        produtoApi.listar(),
        roteiroApi.listar({})
      ])
      const produtosAtivos = produtosData.filter((p) => p.ativo)
      const produtosMap = new Map(produtosAtivos.map((p) => [p.id, p]))

      const roteirosDoDia = todosRoteiros.filter((r) => {
        if (r.nome_empresa !== diaSemana || r.motorista) return false
        let dr = r.data_producao || ''
        if (dr.includes('T')) dr = dr.split('T')[0]
        else if (dr.includes(' ')) dr = dr.split(' ')[0]
        if (dr !== dataFormatada) return false
        const pr = r.periodo || 'manha'
        if (periodoSelecionado === '24h') return pr === 'manha' || pr === 'noite'
        return pr === periodoSelecionado
      })

      const roteirosComItens = await Promise.all(
        roteirosDoDia.map((r) => roteiroApi.buscar(r.id))
      )

      setRoteirosDoDiaComItens(roteirosComItens)
      setRoteirosSelecionados(new Set(roteirosComItens.map((r) => r.id)))
      setProdutosAtivos(produtosAtivos)

      setPaesSelecionados(new Set())
      setEmpresasSelecionadas(new Set())
      setTodasEmpresasDesmarcadas(false)
      setMassasSelecionadas(new Set())
      setRecheiosSelecionados(new Set())
      setOpcoesRelatorioSelecionadas(new Set())
      setBuscaPao('')
      setBuscaMassa('')
      setBuscaRecheio('')
    } catch (e) {
      console.error(e)
      toast.error('Erro ao carregar pedidos do dia')
      setRoteirosDoDiaComItens([])
      setRoteirosSelecionados(new Set())
      setProdutosAtivos([])
    } finally {
      setLoading(false)
    }
  }

  const pedidosDoDia = useMemo(() => {
    if (roteirosDoDiaComItens.length === 0 || produtosAtivos.length === 0) return []
    const produtosMap = new Map(
      produtosAtivos.map((p) => [p.id, p] as const)
    )
    const roteirosFiltrados = roteirosDoDiaComItens.filter((r) => roteirosSelecionados.has(r.id))
    const agregado = new Map<string, PedidoFiltro>()
    roteirosFiltrados.forEach((roteiro) => {
      roteiro.itens?.forEach((item) => {
        const empresa = (item.observacao || roteiro.nome_empresa || '').trim() || 'Sem empresa'
        const produtoNome = item.produto_nome || `Produto ${item.produto_id}`
        const pid = Number(item.produto_id)
        const produto =
          produtosMap.get(item.produto_id) ?? (Number.isFinite(pid) ? produtosMap.get(pid) : undefined)
        // Dados do item vêm do JOIN com produtos na API (funciona mesmo se o produto estiver inativo e fora da lista).
        const tipoMassa = produto?.tipo_massa ?? item.tipo_massa ?? null
        const opcaoRelatorio = produto?.opcao_relatorio ?? item.opcao_relatorio ?? null
        const recheio = produto?.recheio ?? item.recheio ?? null
        const key = `${empresa}|${item.produto_id}`
        const qtd = Number(item.quantidade) || 0
        if (agregado.has(key)) {
          const exist = agregado.get(key)!
          exist.quantidade += qtd
        } else {
          agregado.set(key, {
            empresa,
            produto_id: item.produto_id,
            produto_nome: produtoNome,
            tipo_massa: tipoMassa ?? null,
            opcao_relatorio: opcaoRelatorio ?? null,
            recheio: recheio ?? null,
            quantidade: qtd
          })
        }
      })
    })
    return Array.from(agregado.values())
  }, [roteirosDoDiaComItens, roteirosSelecionados, produtosAtivos])

  const paesUnicos = useMemo(() => {
    const set = new Set(pedidosDoDia.map((p) => p.produto_nome))
    return Array.from(set).sort()
  }, [pedidosDoDia])

  const paesFiltrados = useMemo(() => {
    const termo = normalizarParaBusca(buscaPao)
    if (!termo) return []
    return paesUnicos.filter((pao) => normalizarParaBusca(pao).includes(termo))
  }, [paesUnicos, buscaPao])

  const quantidadePorPao = useMemo(() => {
    const map = new Map<string, number>()
    pedidosDoDia.forEach((p) => {
      const nome = p.produto_nome
      map.set(nome, (map.get(nome) || 0) + p.quantidade)
    })
    return map
  }, [pedidosDoDia])

  const massasUnicas = useMemo(() => {
    const set = new Set(
      pedidosDoDia
        .map((p) => p.tipo_massa)
        .filter((m): m is string => !!m && m.trim() !== '')
    )
    return Array.from(set).sort()
  }, [pedidosDoDia])

  const recheiosUnicos = useMemo(() => {
    const set = new Set<string>()
    pedidosDoDia.forEach((p) => {
      const r = (p.recheio || '').trim()
      if (r) set.add(r)
    })
    return Array.from(set).sort((a, b) => a.localeCompare(b, 'pt-BR', { sensitivity: 'base' }))
  }, [pedidosDoDia])

  const temMassaDoce =
    [...massasSelecionadas].some((m) => isMassaDoceTipo(m)) || mostrarRoteiroMassaDoceCliente
  const temMassaSalgada =
    [...massasSelecionadas].some((m) => isMassaSalgadaTipo(m)) || mostrarRoteiroMassaSalgadaCliente
  const mostrarFiltroRecheio = temMassaDoce || temMassaSalgada

  /** Recheios só dos pedidos de Massa Doce / Massa Salgada conforme o que está ativo */
  const recheiosUnicosEscopo = useMemo(() => {
    if (!temMassaDoce && !temMassaSalgada) return [] as string[]
    const set = new Set<string>()
    pedidosDoDia.forEach((p) => {
      const tm = p.tipo_massa
      if (!tm?.trim()) return
      if (isMassaDoceTipo(tm) && !temMassaDoce) return
      if (isMassaSalgadaTipo(tm) && !temMassaSalgada) return
      if (!isMassaDoceTipo(tm) && !isMassaSalgadaTipo(tm)) return
      const r = (p.recheio || '').trim()
      if (r) set.add(r)
    })
    return Array.from(set).sort((a, b) => a.localeCompare(b, 'pt-BR', { sensitivity: 'base' }))
  }, [pedidosDoDia, temMassaDoce, temMassaSalgada])

  const recheiosFiltradosEscopo = useMemo(() => {
    const termo = normalizarParaBusca(buscaRecheio)
    if (!termo) return recheiosUnicosEscopo
    return recheiosUnicosEscopo.filter((r) => normalizarParaBusca(r).includes(termo))
  }, [recheiosUnicosEscopo, buscaRecheio])

  useEffect(() => {
    if (!mostrarFiltroRecheio) {
      setRecheiosSelecionados(new Set())
    }
  }, [mostrarFiltroRecheio])

  useEffect(() => {
    if (!mostrarFiltroRecheio) return
    setRecheiosSelecionados((prev) => {
      const next = new Set([...prev].filter((r) => recheiosUnicosEscopo.includes(r)))
      if (next.size === prev.size && [...prev].every((r) => next.has(r))) return prev
      return next
    })
  }, [recheiosUnicosEscopo, mostrarFiltroRecheio])

  useEffect(() => {
    const abriu = mostrarFiltroRecheio && !mostrarFiltroRecheioAnterior.current
    mostrarFiltroRecheioAnterior.current = mostrarFiltroRecheio
    if (!abriu) return
    const id = requestAnimationFrame(() => {
      painelRecheioRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
    })
    return () => cancelAnimationFrame(id)
  }, [mostrarFiltroRecheio])

  const quantidadePorMassa = useMemo(() => {
    const map = new Map<string, number>()
    pedidosDoDia.forEach((p) => {
      if (p.tipo_massa) {
        map.set(p.tipo_massa, (map.get(p.tipo_massa) || 0) + p.quantidade)
      }
    })
    return map
  }, [pedidosDoDia])

  const massasFiltradas = useMemo(() => {
    const termo = normalizarParaBusca(buscaMassa)
    if (!termo) return massasUnicas
    return massasUnicas.filter((m) => normalizarParaBusca(m).includes(termo))
  }, [massasUnicas, buscaMassa])

  const empresasPorPao = useMemo(() => {
    if (
      paesSelecionados.size === 0 &&
      massasSelecionadas.size === 0 &&
      recheiosSelecionados.size === 0 &&
      opcoesRelatorioSelecionadas.size === 0
    )
      return []
    const itensFiltradosParaEmpresas = pedidosDoDia.filter((p) => {
      const paoOk = paesSelecionados.size === 0 || paesSelecionados.has(p.produto_nome)
      const massaOk =
        massasSelecionadas.size === 0 || pedidoCaiEmAlgumaMassaSelecionada(p.tipo_massa, massasSelecionadas)
      const rCheio = (p.recheio || '').trim()
      const recheioOk =
        recheiosSelecionados.size === 0 || (rCheio !== '' && recheiosSelecionados.has(rCheio))
      const opcaoOk = opcoesRelatorioSelecionadas.size === 0 || (p.opcao_relatorio && opcoesRelatorioSelecionadas.has((p.opcao_relatorio || '').trim().toLowerCase()))
      return paoOk && massaOk && recheioOk && opcaoOk
    })
    const set = new Set(itensFiltradosParaEmpresas.map((p) => p.empresa))
    return Array.from(set).sort()
  }, [pedidosDoDia, paesSelecionados, massasSelecionadas, recheiosSelecionados, opcoesRelatorioSelecionadas])

  const empresasFiltradas = useMemo(() => {
    const termo = normalizarParaBusca(buscaEmpresa)
    if (!termo) return empresasPorPao
    return empresasPorPao.filter((empresa) => normalizarParaBusca(empresa).includes(termo))
  }, [empresasPorPao, buscaEmpresa])

  const togglePao = (pao: string) => {
    setPaesSelecionados((prev) => {
      const next = new Set(prev)
      if (next.has(pao)) next.delete(pao)
      else next.add(pao)
      return next
    })
    setEmpresasSelecionadas(new Set())
    setTodasEmpresasDesmarcadas(false)
  }

  const toggleMassa = (massa: string) => {
    setMassasSelecionadas((prev) => {
      const next = new Set(prev)
      if (next.has(massa)) next.delete(massa)
      else next.add(massa)
      return next
    })
    setEmpresasSelecionadas(new Set())
    setTodasEmpresasDesmarcadas(false)
  }

  const toggleRecheio = (recheio: string) => {
    setRecheiosSelecionados((prev) => {
      const next = new Set(prev)
      if (next.has(recheio)) next.delete(recheio)
      else next.add(recheio)
      return next
    })
    setEmpresasSelecionadas(new Set())
    setTodasEmpresasDesmarcadas(false)
  }

  const selecionarTodasRecheios = () => {
    const lista = recheiosUnicosEscopo
    if (lista.length === 0) return
    if (recheiosSelecionados.size === lista.length && lista.every((r) => recheiosSelecionados.has(r))) {
      setRecheiosSelecionados(new Set())
      setEmpresasSelecionadas(new Set())
      setTodasEmpresasDesmarcadas(false)
    } else {
      setRecheiosSelecionados(new Set(lista))
    }
  }

  const selecionarTodasMassas = () => {
    if (massasSelecionadas.size === massasUnicas.length) {
      setMassasSelecionadas(new Set())
      setEmpresasSelecionadas(new Set())
      setTodasEmpresasDesmarcadas(false)
    } else {
      setMassasSelecionadas(new Set(massasUnicas))
    }
  }

  const toggleRoteiro = (id: number) => {
    setRoteirosSelecionados((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const toggleEmpresa = (empresa: string) => {
    setTodasEmpresasDesmarcadas(false)
    setEmpresasSelecionadas((prev) => {
      const next = new Set(prev)
      if (next.size === 0) {
        return new Set(empresasPorPao.filter((e) => e !== empresa))
      }
      if (next.has(empresa)) next.delete(empresa)
      else next.add(empresa)
      return next
    })
  }

  const selecionarTodosPaes = () => {
    if (buscaPao.trim() && paesFiltrados.length > 0) {
      const todosFiltradosSelecionados = paesFiltrados.every((p) => paesSelecionados.has(p))
      if (todosFiltradosSelecionados) {
        const novo = new Set(paesSelecionados)
        paesFiltrados.forEach((p) => novo.delete(p))
        setPaesSelecionados(novo)
        setEmpresasSelecionadas(new Set())
        setTodasEmpresasDesmarcadas(false)
      } else {
        const novo = new Set(paesSelecionados)
        paesFiltrados.forEach((p) => novo.add(p))
        setPaesSelecionados(novo)
      }
      return
    }
    if (paesSelecionados.size === paesUnicos.length) {
      setPaesSelecionados(new Set())
      setEmpresasSelecionadas(new Set())
      setTodasEmpresasDesmarcadas(false)
    } else {
      setPaesSelecionados(new Set(paesUnicos))
    }
  }

  const selecionarTodasEmpresas = () => {
    const lista = normalizarParaBusca(buscaEmpresa) ? empresasFiltradas : empresasPorPao
    const todasListaSelecionadas = lista.length > 0 && lista.every((e) => !todasEmpresasDesmarcadas && (empresasSelecionadas.size === 0 || empresasSelecionadas.has(e)))
    if (todasListaSelecionadas) {
      if (lista.length === empresasPorPao.length) {
        setEmpresasSelecionadas(new Set())
        setTodasEmpresasDesmarcadas(true)
      } else {
        const novo = new Set(empresasSelecionadas)
        lista.forEach((e) => novo.delete(e))
        setEmpresasSelecionadas(novo)
        setTodasEmpresasDesmarcadas(false)
      }
    } else {
      const novo = new Set(empresasSelecionadas)
      lista.forEach((e) => novo.add(e))
      setEmpresasSelecionadas(novo)
      setTodasEmpresasDesmarcadas(false)
    }
  }

  const opcoesRelatorioDisponiveis = useMemo(() => {
    const set = new Set(
      pedidosDoDia
        .map((p) => p.opcao_relatorio?.trim().toLowerCase())
        .filter((o): o is string => !!o && o !== '')
    )
    return opcoesRelatorioTodas.filter((op) => set.has(op.toLowerCase()))
  }, [pedidosDoDia, opcoesRelatorioTodas])

  const toggleOpcaoRelatorio = (opcao: string) => {
    const key = opcao.trim().toLowerCase()
    setOpcoesRelatorioSelecionadas((prev) => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
    setEmpresasSelecionadas(new Set())
    setTodasEmpresasDesmarcadas(false)
  }

  const selecionarTodasOpcoesRelatorio = () => {
    if (opcoesRelatorioSelecionadas.size === opcoesRelatorioDisponiveis.length) {
      setOpcoesRelatorioSelecionadas(new Set())
      setEmpresasSelecionadas(new Set())
      setTodasEmpresasDesmarcadas(false)
    } else {
      setOpcoesRelatorioSelecionadas(new Set(opcoesRelatorioDisponiveis))
    }
  }

  const itensFiltrados = useMemo(() => {
    const filtrados = pedidosDoDia.filter((p) => {
      const paoOk = paesSelecionados.size === 0 || paesSelecionados.has(p.produto_nome)
      const massaOk =
        massasSelecionadas.size === 0 || pedidoCaiEmAlgumaMassaSelecionada(p.tipo_massa, massasSelecionadas)
      const rCheio = (p.recheio || '').trim()
      const recheioOk =
        recheiosSelecionados.size === 0 || (rCheio !== '' && recheiosSelecionados.has(rCheio))
      const opcaoOk = opcoesRelatorioSelecionadas.size === 0 || (p.opcao_relatorio && opcoesRelatorioSelecionadas.has((p.opcao_relatorio || '').trim().toLowerCase()))
      const empresaOk = (!todasEmpresasDesmarcadas && empresasSelecionadas.size === 0) || empresasSelecionadas.has(p.empresa)
      return paoOk && massaOk && recheioOk && opcaoOk && empresaOk
    })

    // Ordenar por empresa e, dentro da empresa, por nome do pão (incluindo recheio/opção)
    return filtrados.slice().sort((a, b) => {
      const cmpEmpresa = a.empresa.localeCompare(b.empresa, 'pt-BR', { sensitivity: 'base' })
      if (cmpEmpresa !== 0) return cmpEmpresa
      const nomeA = `${a.produto_nome || ''}${a.recheio ? ` ${a.recheio}` : ''}${a.opcao_relatorio ? ` ${opcaoRelatorioParaLabel(a.opcao_relatorio)}` : ''}`
      const nomeB = `${b.produto_nome || ''}${b.recheio ? ` ${b.recheio}` : ''}${b.opcao_relatorio ? ` ${opcaoRelatorioParaLabel(b.opcao_relatorio)}` : ''}`
      return nomeA.localeCompare(nomeB, 'pt-BR', { sensitivity: 'base' })
    })
  }, [
    pedidosDoDia,
    paesSelecionados,
    massasSelecionadas,
    recheiosSelecionados,
    opcoesRelatorioSelecionadas,
    empresasSelecionadas,
    todasEmpresasDesmarcadas
  ])

  const totalUnidades = itensFiltrados.reduce((s, p) => s + p.quantidade, 0)

  const totaisPorPao = useMemo(() => {
    const map = new Map<string, number>()
    itensFiltrados.forEach((p) => {
      const nome = p.produto_nome
      map.set(nome, (map.get(nome) || 0) + p.quantidade)
    })
    return Array.from(map.entries()).sort((a, b) => a[0].localeCompare(b[0]))
  }, [itensFiltrados])

  const roteiroPorMassa = useMemo(() => {
    if (massasSelecionadas.size === 0) return []
    return Array.from(massasSelecionadas)
      .sort()
      .map((massa) => {
        const itensMassa = itensFiltrados.filter(
          (p) => p.tipo_massa && chaveTipoMassa(p.tipo_massa) === chaveTipoMassa(massa)
        )
        const total = itensMassa.reduce((s, p) => s + p.quantidade, 0)
        const paesMap = new Map<string, number>()
        itensMassa.forEach((p) => {
          const nome = p.produto_nome || '—'
          paesMap.set(nome, (paesMap.get(nome) || 0) + p.quantidade)
        })
        const paes = Array.from(paesMap.entries())
          .sort((a, b) => a[0].localeCompare(b[0]))
          .map(([nome, quantidade]) => ({ nome, quantidade }))
        return { massa, quantidade: total, paes }
      })
  }, [itensFiltrados, massasSelecionadas])

  // Roteiro "Massa Doce Cliente": todos os pedidos de Massa Doce do dia (independente do filtro de massa)
  const roteiroMassaDoceClienteItens = useMemo(() => {
    return pedidosDoDia.filter((p) => isMassaDoceTipo(p.tipo_massa))
  }, [pedidosDoDia])
  const totalRoteiroMassaDoceCliente = roteiroMassaDoceClienteItens.reduce((s, p) => s + p.quantidade, 0)

  // Roteiro "Massa Salgada Cliente": todos os pedidos de Massa Salgada do dia (independente do filtro de massa)
  const roteiroMassaSalgadaClienteItens = useMemo(() => {
    return pedidosDoDia.filter((p) => isMassaSalgadaTipo(p.tipo_massa))
  }, [pedidosDoDia])
  const totalRoteiroMassaSalgadaCliente = roteiroMassaSalgadaClienteItens.reduce((s, p) => s + p.quantidade, 0)

  const abrirRoteiroParaImpressao = () => {
    const soRoteiroMassa =
      massasSelecionadas.size > 0 && opcoesRelatorioSelecionadas.size === 0 && recheiosSelecionados.size === 0
    const temItens = soRoteiroMassa ? roteiroPorMassa.some((r) => r.quantidade > 0) : itensFiltrados.length > 0
    if (!temItens) {
      toast.error(soRoteiroMassa ? 'Selecione ao menos um tipo de massa para imprimir.' : 'Selecione filtros e itens para imprimir.')
      return
    }
    const janela = window.open('', '_blank')
    if (!janela) {
      toast.error('Permita pop-ups para abrir a janela de impressão.')
      return
    }
    const dataFormatada = format(dataSelecionada, 'dd/MM/yyyy')
    const periodoLabel = periodoSelecionado === 'manha' ? 'Manhã' : periodoSelecionado === 'noite' ? 'Noite' : '24h'
    const diasSemanaPT: Record<number, string> = {
      0: 'Domingo', 1: 'Segunda-feira', 2: 'Terça-feira', 3: 'Quarta-feira',
      4: 'Quinta-feira', 5: 'Sexta-feira', 6: 'Sábado'
    }
    const diaSemanaNome = diasSemanaPT[dataSelecionada.getDay()]

    if (soRoteiroMassa) {
      janela.document.write(`
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Roteiro por massa - ${dataFormatada}</title>
  <style>
    body { font-family: Arial, sans-serif; padding: 16px; font-size: 12px; }
    h1 { font-size: 16px; margin-bottom: 4px; color: #333; }
    .info { margin: 8px 0 12px; padding: 8px; background: #f5f5f5; border-left: 4px solid #550701; font-size: 11px; }
    table { width: 100%; border-collapse: collapse; margin: 8px 0; max-width: 600px; }
    th, td { border: 1px solid #ddd; padding: 8px 10px; text-align: left; }
    th { background: #550701; color: white; font-weight: bold; }
    td:last-child { text-align: center; font-weight: bold; }
    @media print { body { -webkit-print-color-adjust: exact; print-color-adjust: exact; } }
  </style>
</head>
<body>
  <h1>Roteiro por massa - ${diaSemanaNome}, ${dataFormatada}</h1>
  <div class="info">
    <p><strong>Período:</strong> ${periodoLabel}</p>
    <p><strong>Data de emissão:</strong> ${new Date().toLocaleDateString('pt-BR')} ${new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</p>
  </div>
  <table>
    <thead>
      <tr>
        <th>Tipo de massa</th>
        <th>Pão</th>
        <th>Quantidade</th>
      </tr>
    </thead>
    <tbody>
    ${roteiroPorMassa.map((r) => {
      if (r.paes.length === 0) {
        return `<tr><td style="font-weight: bold;">${r.massa}</td><td>—</td><td style="text-align: center;">0</td></tr>`
      }
      const rows: string[] = []
      r.paes.forEach((p, i) => {
        if (i === 0) rows.push(`<tr><td rowspan="${r.paes.length}" style="vertical-align: top; font-weight: bold;">${r.massa}</td><td>${p.nome}</td><td style="text-align: center;">${p.quantidade}</td></tr>`)
        else rows.push(`<tr><td>${p.nome}</td><td style="text-align: center;">${p.quantidade}</td></tr>`)
      })
      return rows.join('')
    }).join('')}
    </tbody>
  </table>
</body>
</html>
      `)
    } else {
      const massasLabel = ''
      const linhas = itensFiltrados
        .map(
          (p) => `
        <tr>
          <td>${p.empresa}</td>
          <td>${p.produto_nome}${p.recheio ? ` ${p.recheio}` : ''}${p.opcao_relatorio ? ` ${opcaoRelatorioParaLabel(p.opcao_relatorio)}` : ''}</td>
          <td style="text-align: center;">${p.quantidade}</td>
        </tr>`
        )
        .join('')
      const totaisPaoHtml =
        totaisPorPao.length > 0
          ? `
    <div class="totais-pao">
      <h3>Quantidade total por pão</h3>
      <p>${totaisPorPao.map(([pao, qtd]) => `${pao}: ${qtd} un.`).join(' &nbsp;|&nbsp; ')}</p>
    </div>`
          : ''
      janela.document.write(`
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Roteiro - ${dataFormatada} - ${periodoLabel}</title>
  <style>
    body { font-family: Arial, sans-serif; padding: 16px; font-size: 12px; }
    h1 { font-size: 16px; margin-bottom: 4px; color: #333; }
    .info { margin: 8px 0 12px; padding: 8px; background: #f5f5f5; border-left: 4px solid #550701; font-size: 11px; }
    table { width: 100%; border-collapse: collapse; margin: 8px 0; }
    th, td { border: 1px solid #ddd; padding: 6px 8px; text-align: left; }
    th { background: #550701; color: white; font-weight: bold; }
    td:last-child { text-align: center; font-weight: bold; }
    .totais-pao { margin-top: 12px; padding: 8px; border-top: 1px solid #ddd; font-size: 11px; }
    .totais-pao h3 { margin: 0 0 4px; font-size: 12px; }
    .total-geral { margin-top: 12px; padding: 10px; background: #550701; color: white; text-align: center; font-weight: bold; font-size: 14px; }
    @media print { body { -webkit-print-color-adjust: exact; print-color-adjust: exact; } }
  </style>
</head>
<body>
  <h1>Roteiro - ${diaSemanaNome}, ${dataFormatada}${massasLabel}</h1>
  <div class="info">
    <p><strong>Período:</strong> ${periodoLabel}</p>
    <p><strong>Data de emissão:</strong> ${new Date().toLocaleDateString('pt-BR')} ${new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</p>
  </div>
  <table>
    <thead>
      <tr>
        <th>Empresa</th>
        <th>Pão</th>
        <th>Quantidade</th>
      </tr>
    </thead>
    <tbody>${linhas}</tbody>
  </table>
  ${totaisPaoHtml}
  <div class="total-geral">Total: ${totalUnidades} pães</div>
</body>
</html>
      `)
    }
    janela.document.close()
    janela.focus()
    janela.print()
  }

  const abrirMassaDoceClienteParaImpressao = () => {
    if (roteiroMassaDoceClienteItens.length === 0) {
      toast.error('Nenhum item de Massa Doce para imprimir.')
      return
    }
    const janela = window.open('', '_blank')
    if (!janela) {
      toast.error('Permita pop-ups para abrir a janela de impressão.')
      return
    }
    const dataFormatada = format(dataSelecionada, 'dd/MM/yyyy')
    const periodoLabel = periodoSelecionado === 'manha' ? 'Manhã' : periodoSelecionado === 'noite' ? 'Noite' : '24h'
    const diasSemanaPT: Record<number, string> = {
      0: 'Domingo', 1: 'Segunda-feira', 2: 'Terça-feira', 3: 'Quarta-feira',
      4: 'Quinta-feira', 5: 'Sexta-feira', 6: 'Sábado'
    }
    const diaSemanaNome = diasSemanaPT[dataSelecionada.getDay()]
    const linhas = roteiroMassaDoceClienteItens
      .map(
        (p) => `
        <tr>
          <td>${p.empresa}</td>
          <td>${p.produto_nome}${p.recheio ? ` ${p.recheio}` : ''}${p.opcao_relatorio ? ` ${opcaoRelatorioParaLabel(p.opcao_relatorio)}` : ''}</td>
          <td style="text-align: center;">${p.quantidade}</td>
        </tr>`
      )
      .join('')
    janela.document.write(`
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Massa Doce Cliente - ${dataFormatada}</title>
  <style>
    body { font-family: Arial, sans-serif; padding: 16px; font-size: 12px; }
    h1 { font-size: 16px; margin-bottom: 4px; color: #333; }
    .info { margin: 8px 0 12px; padding: 8px; background: #f5f5f5; border-left: 4px solid #550701; font-size: 11px; }
    table { width: 100%; border-collapse: collapse; margin: 8px 0; }
    th, td { border: 1px solid #ddd; padding: 6px 8px; text-align: left; }
    th { background: #550701; color: white; font-weight: bold; }
    td:last-child { text-align: center; font-weight: bold; }
    .total-geral { margin-top: 12px; padding: 10px; background: #550701; color: white; text-align: center; font-weight: bold; font-size: 14px; }
    @media print { body { -webkit-print-color-adjust: exact; print-color-adjust: exact; } }
  </style>
</head>
<body>
  <h1>Massa Doce Cliente - ${diaSemanaNome}, ${dataFormatada}</h1>
  <div class="info">
    <p><strong>Período:</strong> ${periodoLabel}</p>
    <p><strong>Data de emissão:</strong> ${new Date().toLocaleDateString('pt-BR')} ${new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</p>
  </div>
  <table>
    <thead>
      <tr>
        <th>Empresa</th>
        <th>Pão</th>
        <th>Quantidade</th>
      </tr>
    </thead>
    <tbody>${linhas}</tbody>
  </table>
  <div class="total-geral">Total: ${totalRoteiroMassaDoceCliente} pães</div>
</body>
</html>
    `)
    janela.document.close()
    janela.focus()
    janela.print()
  }

  const abrirMassaSalgadaClienteParaImpressao = () => {
    if (roteiroMassaSalgadaClienteItens.length === 0) {
      toast.error('Nenhum item de Massa Salgada para imprimir.')
      return
    }
    const janela = window.open('', '_blank')
    if (!janela) {
      toast.error('Permita pop-ups para abrir a janela de impressão.')
      return
    }
    const dataFormatada = format(dataSelecionada, 'dd/MM/yyyy')
    const periodoLabel = periodoSelecionado === 'manha' ? 'Manhã' : periodoSelecionado === 'noite' ? 'Noite' : '24h'
    const diasSemanaPT: Record<number, string> = {
      0: 'Domingo', 1: 'Segunda-feira', 2: 'Terça-feira', 3: 'Quarta-feira',
      4: 'Quinta-feira', 5: 'Sexta-feira', 6: 'Sábado'
    }
    const diaSemanaNome = diasSemanaPT[dataSelecionada.getDay()]
    const linhas = roteiroMassaSalgadaClienteItens
      .map(
        (p) => `
        <tr>
          <td>${p.empresa}</td>
          <td>${p.produto_nome}${p.recheio ? ` ${p.recheio}` : ''}${p.opcao_relatorio ? ` ${opcaoRelatorioParaLabel(p.opcao_relatorio)}` : ''}</td>
          <td style="text-align: center;">${p.quantidade}</td>
        </tr>`
      )
      .join('')
    janela.document.write(`
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Massa Salgada Cliente - ${dataFormatada}</title>
  <style>
    body { font-family: Arial, sans-serif; padding: 16px; font-size: 12px; }
    h1 { font-size: 16px; margin-bottom: 4px; color: #333; }
    .info { margin: 8px 0 12px; padding: 8px; background: #f5f5f5; border-left: 4px solid #550701; font-size: 11px; }
    table { width: 100%; border-collapse: collapse; margin: 8px 0; }
    th, td { border: 1px solid #ddd; padding: 6px 8px; text-align: left; }
    th { background: #550701; color: white; font-weight: bold; }
    td:last-child { text-align: center; font-weight: bold; }
    .total-geral { margin-top: 12px; padding: 10px; background: #550701; color: white; text-align: center; font-weight: bold; font-size: 14px; }
    @media print { body { -webkit-print-color-adjust: exact; print-color-adjust: exact; } }
  </style>
</head>
<body>
  <h1>Massa Salgada Cliente - ${diaSemanaNome}, ${dataFormatada}</h1>
  <div class="info">
    <p><strong>Período:</strong> ${periodoLabel}</p>
    <p><strong>Data de emissão:</strong> ${new Date().toLocaleDateString('pt-BR')} ${new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</p>
  </div>
  <table>
    <thead>
      <tr>
        <th>Empresa</th>
        <th>Pão</th>
        <th>Quantidade</th>
      </tr>
    </thead>
    <tbody>${linhas}</tbody>
  </table>
  <div class="total-geral">Total: ${totalRoteiroMassaSalgadaCliente} pães</div>
</body>
</html>
    `)
    janela.document.close()
    janela.focus()
    janela.print()
  }

  if (loading && pedidosDoDia.length === 0) {
    return <Loading />
  }

  return (
    <div className="container mx-auto px-4 max-w-5xl text-sm">
      <div className="mb-4">
        <Link
          href="/roteiros"
          className="text-primary-600 hover:text-primary-700 font-semibold text-sm mb-1 inline-block"
        >
          ← Voltar para Roteiros de Entregas
        </Link>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mt-2">
          Relatórios
        </h1>
        <p className="text-gray-600 dark:text-gray-400 mt-0.5 text-sm">
          Escolha o dia, o período, os pães e as empresas. Crie um roteiro apenas com os itens selecionados.
        </p>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4 mb-4 border border-gray-200 dark:border-gray-700">
        <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100 mb-3">Dia e período</h2>
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">Data:</span>
            <div className="relative">
              <button
                type="button"
                onClick={() => setMostrarCalendario(!mostrarCalendario)}
                className="px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded-lg font-semibold text-sm"
              >
                {format(dataSelecionada, 'EEEE, dd/MM/yyyy', { locale: ptBR })}
              </button>
              {mostrarCalendario && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setMostrarCalendario(false)} />
                  <div className="absolute left-0 top-full mt-1 bg-white dark:bg-gray-800 rounded-lg shadow-xl border border-gray-200 dark:border-gray-700 p-4 z-50">
                    <div className="flex justify-between items-center mb-2">
                      <button
                        type="button"
                        onClick={() => setMesCalendario(subDays(startOfMonth(mesCalendario), 1))}
                        className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700"
                      >
                        ←
                      </button>
                      <span className="font-semibold capitalize">
                        {format(mesCalendario, 'MMMM yyyy', { locale: ptBR })}
                      </span>
                      <button
                        type="button"
                        onClick={() => setMesCalendario(addDays(endOfMonth(mesCalendario), 1))}
                        className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700"
                      >
                        →
                      </button>
                    </div>
                    <div className="grid grid-cols-7 gap-1">
                      {eachDayOfInterval({
                        start: startOfWeek(startOfMonth(mesCalendario), { weekStartsOn: 0 }),
                        end: endOfWeek(endOfMonth(mesCalendario), { weekStartsOn: 0 })
                      }).map((dia) => {
                        const d = format(dia, 'yyyy-MM-dd')
                        const hoje = format(new Date(), 'yyyy-MM-dd')
                        const sel = format(dataSelecionada, 'yyyy-MM-dd') === d
                        const mesAtual = getMonth(dia) === getMonth(mesCalendario)
                        return (
                          <button
                            key={d}
                            type="button"
                            onClick={() => {
                              setDataSelecionada(dia)
                              setMostrarCalendario(false)
                            }}
                            className={`p-1.5 rounded text-xs font-semibold ${
                              !mesAtual ? 'text-gray-400' : 'text-gray-900 dark:text-gray-100'
                            } ${sel ? 'bg-primary-500 text-white' : 'hover:bg-gray-200 dark:hover:bg-gray-700'} ${hoje === d && !sel ? 'ring-2 ring-primary-400' : ''}`}
                          >
                            {format(dia, 'd')}
                          </button>
                        )
                      })}
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">Período:</span>
            <div className="flex gap-1">
              <button
                type="button"
                onClick={() => setPeriodoSelecionado('manha')}
                className={`px-4 py-2 rounded-lg text-sm font-semibold ${
                  periodoSelecionado === 'manha'
                    ? 'bg-primary-500 text-white'
                    : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
                }`}
              >
                Manhã
              </button>
              <button
                type="button"
                onClick={() => setPeriodoSelecionado('noite')}
                className={`px-4 py-2 rounded-lg text-sm font-semibold ${
                  periodoSelecionado === 'noite'
                    ? 'bg-primary-500 text-white'
                    : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
                }`}
              >
                Noite
              </button>
              <button
                type="button"
                onClick={() => setPeriodoSelecionado('24h')}
                className={`px-4 py-2 rounded-lg text-sm font-semibold ${
                  periodoSelecionado === '24h'
                    ? 'bg-primary-500 text-white'
                    : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
                }`}
                title="Junta Manhã e Noite no mesmo cálculo"
              >
                24h
              </button>
            </div>
          </div>
        </div>
      </div>

      {roteirosDoDiaComItens.length > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4 mb-4 border border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100">
              Roteiros disponíveis
            </h2>
            <button
              type="button"
              onClick={() => {
                if (roteirosSelecionados.size === roteirosDoDiaComItens.length) {
                  setRoteirosSelecionados(new Set())
                } else {
                  setRoteirosSelecionados(new Set(roteirosDoDiaComItens.map((r) => r.id)))
                }
              }}
              className="text-sm font-semibold text-primary-600 dark:text-primary-400 hover:underline"
            >
              {roteirosSelecionados.size === roteirosDoDiaComItens.length ? 'Desmarcar todos' : 'Marcar todos'}
            </button>
          </div>
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
            Selecione um ou mais roteiros para incluir no relatório. O relatório abaixo considera apenas os roteiros marcados.
          </p>
          <div className="flex flex-wrap gap-3">
            {roteirosDoDiaComItens.map((roteiro, index) => {
              const nomeRoteiro = nomeExibicaoRoteiro(roteiro.observacoes, index)
              const totalItens = roteiro.itens?.reduce((s, i) => s + (Number(i.quantidade) || 0), 0) ?? 0
              return (
                <label
                  key={roteiro.id}
                  className="flex items-center gap-2 cursor-pointer px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700/50"
                >
                  <input
                    type="checkbox"
                    checked={roteirosSelecionados.has(roteiro.id)}
                    onChange={() => toggleRoteiro(roteiro.id)}
                    className="w-4 h-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                  />
                  <span className="text-sm font-medium text-gray-900 dark:text-gray-100">{nomeRoteiro}</span>
                  <span className="text-xs text-gray-500 dark:text-gray-400">({totalItens} un.)</span>
                </label>
              )
            })}
          </div>
        </div>
      )}

      {pedidosDoDia.length === 0 ? (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-8 text-center text-gray-600 dark:text-gray-400">
          {roteirosDoDiaComItens.length > 0 && roteirosSelecionados.size === 0
            ? 'Selecione ao menos um roteiro acima para ver o relatório.'
            : 'Nenhum pedido encontrado para esta data e período. Adicione pedidos nas listas de produção primeiro.'}
        </div>
      ) : (
        <div className="space-y-6">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4 mb-4 border border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100">
                Filtrar por pão
              </h2>
              {buscaPao.trim() && paesFiltrados.length > 0 && (
                <button
                  type="button"
                  onClick={selecionarTodosPaes}
                  className="text-sm font-semibold text-primary-600 dark:text-primary-400 hover:underline"
                >
                  {paesFiltrados.every((p) => paesSelecionados.has(p)) ? 'Desmarcar todos' : 'Marcar todos'}
                </button>
              )}
            </div>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
              Digite o nome do pão para buscar. Os resultados aparecem abaixo; marque os que deseja no roteiro.
            </p>
            <input
              type="text"
              placeholder="Pesquisar pão..."
              value={buscaPao}
              onChange={(e) => setBuscaPao(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400 text-sm mb-3 focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
            />
            <div className="flex flex-wrap gap-2">
              {paesFiltrados.length === 0 ? (
                <p className="text-sm text-gray-500 dark:text-gray-400 py-1">
                  {buscaPao.trim() ? 'Nenhum pão encontrado com esse termo.' : 'Digite o nome do pão acima para buscar e selecionar.'}
                </p>
              ) : (
                paesFiltrados.map((pao) => (
                  <label
                    key={pao}
                    className="flex items-center gap-2 cursor-pointer px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700/50"
                  >
                    <input
                      type="checkbox"
                      checked={paesSelecionados.has(pao)}
                      onChange={() => togglePao(pao)}
                      className="w-4 h-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                    />
                    <span className="text-sm font-medium text-gray-900 dark:text-gray-100">{pao}</span>
                  </label>
                ))
              )}
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4 mb-4 border border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100">
                Filtrar por tipo de massa
              </h2>
              <button
                type="button"
                onClick={selecionarTodasMassas}
                className="text-sm font-semibold text-primary-600 dark:text-primary-400 hover:underline"
              >
                {massasSelecionadas.size === massasUnicas.length ? 'Desmarcar todos' : 'Marcar todos'}
              </button>
            </div>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
              Selecione os tipos de massa para filtrar e ver a quantidade de cada um.
            </p>
            <div className="flex flex-wrap items-center gap-3 mb-3">
              <button
                type="button"
                onClick={() => setMostrarRoteiroMassaDoceCliente(!mostrarRoteiroMassaDoceCliente)}
                className="px-4 py-2 rounded-lg font-semibold text-sm border-2 border-primary-500 text-primary-600 dark:text-primary-400 bg-primary-50 dark:bg-primary-900/30 hover:bg-primary-100 dark:hover:bg-primary-900/50 transition-colors"
                title="Abre o roteiro com todos os pães de massa doce por empresa e quantidade"
              >
                {mostrarRoteiroMassaDoceCliente ? 'Ocultar roteiro' : 'Massa Doce Cliente'}
              </button>
              {roteiroMassaDoceClienteItens.length > 0 && (
                <span className="text-xs text-gray-500 dark:text-gray-400 self-center">
                  {roteiroMassaDoceClienteItens.length} itens · {totalRoteiroMassaDoceCliente} un. no dia
                </span>
              )}
              <button
                type="button"
                onClick={() => setMostrarRoteiroMassaSalgadaCliente(!mostrarRoteiroMassaSalgadaCliente)}
                className="px-4 py-2 rounded-lg font-semibold text-sm border-2 border-primary-500 text-primary-600 dark:text-primary-400 bg-primary-50 dark:bg-primary-900/30 hover:bg-primary-100 dark:hover:bg-primary-900/50 transition-colors"
                title="Abre o roteiro com todos os pães de massa salgada por empresa e quantidade"
              >
                {mostrarRoteiroMassaSalgadaCliente ? 'Ocultar roteiro' : 'Massa Salgada Cliente'}
              </button>
              {roteiroMassaSalgadaClienteItens.length > 0 && (
                <span className="text-xs text-gray-500 dark:text-gray-400 self-center">
                  {roteiroMassaSalgadaClienteItens.length} itens · {totalRoteiroMassaSalgadaCliente} un. no dia
                </span>
              )}
            </div>
            <input
              type="text"
              placeholder="Pesquisar tipo de massa..."
              value={buscaMassa}
              onChange={(e) => setBuscaMassa(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400 text-sm mb-3 focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
            />
            <div className="flex flex-wrap gap-3">
              {massasFiltradas.length === 0 ? (
                <p className="text-sm text-gray-500 dark:text-gray-400 py-1">
                  {buscaMassa.trim() ? 'Nenhum tipo de massa encontrado.' : 'Nenhum tipo de massa no dia (cadastre em Produtos).'}
                </p>
              ) : (
                massasFiltradas.map((massa) => (
                  <label
                    key={massa}
                    className="flex items-center gap-2 cursor-pointer px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700/50"
                  >
                    <input
                      type="checkbox"
                      checked={massasSelecionadas.has(massa)}
                      onChange={() => toggleMassa(massa)}
                      className="w-4 h-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                    />
                    <span className="text-sm font-medium text-gray-900 dark:text-gray-100">{massa}</span>
                  </label>
                ))
              )}
            </div>

            {mostrarFiltroRecheio && (
              <div
                ref={painelRecheioRef}
                className="mt-5 pt-5 border-t border-gray-200 dark:border-gray-600"
              >
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-base font-bold text-gray-900 dark:text-gray-100">
                    Filtrar por recheio
                  </h3>
                  {recheiosUnicosEscopo.length > 0 && (
                    <button
                      type="button"
                      onClick={selecionarTodasRecheios}
                      className="text-sm font-semibold text-primary-600 dark:text-primary-400 hover:underline"
                    >
                      {recheiosSelecionados.size === recheiosUnicosEscopo.length &&
                      recheiosUnicosEscopo.length > 0
                        ? 'Desmarcar todos'
                        : 'Marcar todos'}
                    </button>
                  )}
                </div>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                  Aparece ao marcar <strong>Massa Doce</strong> ou <strong>Massa Salgada</strong> (ou ao abrir os roteiros Cliente). Só listamos recheios desses pães do dia.
                </p>
                <input
                  type="text"
                  placeholder="Pesquisar recheio..."
                  value={buscaRecheio}
                  onChange={(e) => setBuscaRecheio(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400 text-sm mb-3 focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                />
                <div className="flex flex-wrap gap-3">
                  {recheiosFiltradosEscopo.length === 0 ? (
                    <p className="text-sm text-gray-500 dark:text-gray-400 py-1">
                      {buscaRecheio.trim()
                        ? 'Nenhum recheio encontrado.'
                        : 'Nenhum recheio cadastrado nesses pães (Massa Doce/Salgada) neste dia.'}
                    </p>
                  ) : (
                    recheiosFiltradosEscopo.map((recheio) => (
                      <label
                        key={recheio}
                        className="flex items-center gap-2 cursor-pointer px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700/50"
                      >
                        <input
                          type="checkbox"
                          checked={recheiosSelecionados.has(recheio)}
                          onChange={() => toggleRecheio(recheio)}
                          className="w-4 h-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                        />
                        <span className="text-sm font-medium text-gray-900 dark:text-gray-100">{recheio}</span>
                      </label>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>

          {mostrarRoteiroMassaDoceCliente && (
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4 mb-4 border border-gray-200 dark:border-gray-700">
              <div className="flex flex-wrap items-center justify-between gap-4 mb-3">
                <div>
                  <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100">Massa Doce Cliente</h2>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mt-0.5">
                    Roteiro com todos os pães de massa doce do dia: empresa, pão e quantidade.
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  {roteiroMassaDoceClienteItens.length > 0 ? (
                    <>
                      <span className="text-sm text-gray-600 dark:text-gray-400">
                        {roteiroMassaDoceClienteItens.length} linha(s) · {totalRoteiroMassaDoceCliente} un.
                      </span>
                      <button
                        type="button"
                        onClick={abrirMassaDoceClienteParaImpressao}
                        className="px-4 py-2 bg-primary-500 text-white rounded-lg font-semibold hover:bg-primary-600 text-sm"
                        title="Abre Massa Doce Cliente em nova janela para imprimir"
                      >
                        Imprimir
                      </button>
                    </>
                  ) : null}
                </div>
              </div>
              {roteiroMassaDoceClienteItens.length === 0 ? (
                <p className="text-sm text-gray-500 dark:text-gray-400 py-4">
                  Nenhum pedido de massa doce neste dia/período. Selecione a data e os roteiros acima.
                </p>
              ) : (
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
                          {roteiroMassaDoceClienteItens.map((p, idx) => (
                            <tr
                              key={`mdc-${p.empresa}-${p.produto_id}-${idx}`}
                              className="border-t border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 even:bg-gray-50 dark:even:bg-gray-700/50"
                            >
                              <td className="px-3 py-2 text-gray-900 dark:text-gray-100">{p.empresa}</td>
                              <td className="px-3 py-2 text-gray-900 dark:text-gray-100">{p.produto_nome}{p.recheio ? ` ${p.recheio}` : ''}{p.opcao_relatorio ? ` ${opcaoRelatorioParaLabel(p.opcao_relatorio)}` : ''}</td>
                              <td className="px-3 py-2 text-center font-semibold text-gray-900 dark:text-gray-100">{p.quantidade}</td>
                            </tr>
                          ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {mostrarRoteiroMassaSalgadaCliente && (
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4 mb-4 border border-gray-200 dark:border-gray-700">
              <div className="flex flex-wrap items-center justify-between gap-4 mb-3">
                <div>
                  <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100">Massa Salgada Cliente</h2>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mt-0.5">
                    Roteiro com todos os pães de massa salgada do dia: empresa, pão e quantidade.
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  {roteiroMassaSalgadaClienteItens.length > 0 ? (
                    <>
                      <span className="text-sm text-gray-600 dark:text-gray-400">
                        {roteiroMassaSalgadaClienteItens.length} linha(s) · {totalRoteiroMassaSalgadaCliente} un.
                      </span>
                      <button
                        type="button"
                        onClick={abrirMassaSalgadaClienteParaImpressao}
                        className="px-4 py-2 bg-primary-500 text-white rounded-lg font-semibold hover:bg-primary-600 text-sm"
                        title="Abre Massa Salgada Cliente em nova janela para imprimir"
                      >
                        Imprimir
                      </button>
                    </>
                  ) : null}
                </div>
              </div>
              {roteiroMassaSalgadaClienteItens.length === 0 ? (
                <p className="text-sm text-gray-500 dark:text-gray-400 py-4">
                  Nenhum pedido de massa salgada neste dia/período. Selecione a data e os roteiros acima.
                </p>
              ) : (
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
                      {roteiroMassaSalgadaClienteItens.map((p, idx) => (
                        <tr
                          key={`msc-${p.empresa}-${p.produto_id}-${idx}`}
                          className="border-t border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 even:bg-gray-50 dark:even:bg-gray-700/50"
                        >
                          <td className="px-3 py-2 text-gray-900 dark:text-gray-100">{p.empresa}</td>
                          <td className="px-3 py-2 text-gray-900 dark:text-gray-100">{p.produto_nome}{p.recheio ? ` ${p.recheio}` : ''}{p.opcao_relatorio ? ` ${opcaoRelatorioParaLabel(p.opcao_relatorio)}` : ''}</td>
                          <td className="px-3 py-2 text-center font-semibold text-gray-900 dark:text-gray-100">{p.quantidade}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4 mb-4 border border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100">
                Filtrar por opção de relatório
              </h2>
              {opcoesRelatorioDisponiveis.length > 0 && (
                <button
                  type="button"
                  onClick={selecionarTodasOpcoesRelatorio}
                  className="text-sm font-semibold text-primary-600 dark:text-primary-400 hover:underline"
                >
                  {opcoesRelatorioSelecionadas.size === opcoesRelatorioDisponiveis.length ? 'Desmarcar todos' : 'Marcar todos'}
                </button>
              )}
            </div>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
              Selecione COM MARG, SEM MARG e/ou EMBALADO para gerar o roteiro só com esses produtos.
            </p>
            <div className="flex flex-wrap gap-3">
              {opcoesRelatorioDisponiveis.length === 0 ? (
                <p className="text-sm text-gray-500 dark:text-gray-400 py-1">
                  Nenhum produto com opção de relatório no dia. Cadastre em Produtos com opção (Margarina, Sem Margarina, Embalado, etc.).
                </p>
              ) : (
                opcoesRelatorioDisponiveis.map((opcao) => (
                  <label
                    key={opcao}
                    className="flex items-center gap-1.5 cursor-pointer px-2.5 py-1.5 rounded-md border border-gray-200 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700/50"
                  >
                    <input
                      type="checkbox"
                      checked={opcoesRelatorioSelecionadas.has(opcao.trim().toLowerCase())}
                      onChange={() => toggleOpcaoRelatorio(opcao)}
                      className="w-3.5 h-3.5 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                    />
                    <span className="text-xs font-medium text-gray-900 dark:text-gray-100">
                      {opcaoRelatorioParaLabel(opcao) || opcao}
                    </span>
                  </label>
                ))
              )}
            </div>
          </div>

          {(paesSelecionados.size > 0 ||
            massasSelecionadas.size > 0 ||
            recheiosSelecionados.size > 0 ||
            opcoesRelatorioSelecionadas.size > 0) &&
            empresasPorPao.length > 0 && (
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4 mb-4 border border-gray-200 dark:border-gray-700">
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100">
                  Filtrar por empresa
                </h2>
                {empresasFiltradas.length > 0 && (
                  <button
                    type="button"
                    onClick={selecionarTodasEmpresas}
                    className="text-sm font-semibold text-primary-600 dark:text-primary-400 hover:underline"
                  >
                    {empresasFiltradas.every((e) => !todasEmpresasDesmarcadas && (empresasSelecionadas.size === 0 || empresasSelecionadas.has(e))) ? 'Desmarcar todas' : 'Marcar todas'}
                  </button>
                )}
              </div>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                Empresas que têm os pães selecionados. Opcional: marque só as que deseja no roteiro.
              </p>
              <input
                type="text"
                placeholder="Pesquisar empresa..."
                value={buscaEmpresa}
                onChange={(e) => setBuscaEmpresa(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400 text-sm mb-3 focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              />
              <div className="flex flex-wrap gap-2 max-h-40 overflow-y-auto">
                {empresasFiltradas.length === 0 ? (
                  <p className="text-sm text-gray-500 dark:text-gray-400 py-0.5">
                    {buscaEmpresa.trim() ? 'Nenhuma empresa encontrada com esse termo.' : 'Nenhuma empresa.'}
                  </p>
                ) : (
                  empresasFiltradas.map((empresa) => (
                    <label
                      key={empresa}
                      className="flex items-center gap-1.5 cursor-pointer px-2.5 py-1.5 rounded-md border border-gray-200 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700/50"
                    >
                      <input
                        type="checkbox"
                        checked={!todasEmpresasDesmarcadas && (empresasSelecionadas.size === 0 || empresasSelecionadas.has(empresa))}
                        onChange={() => toggleEmpresa(empresa)}
                        className="w-3.5 h-3.5 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                      />
                      <span className="text-xs font-medium text-gray-900 dark:text-gray-100">{empresa}</span>
                    </label>
                  ))
                )}
              </div>
            </div>
          )}

          {(paesSelecionados.size > 0 ||
            massasSelecionadas.size > 0 ||
            recheiosSelecionados.size > 0 ||
            opcoesRelatorioSelecionadas.size > 0) ? (
          (() => {
            const soRoteiroPorMassa =
              massasSelecionadas.size > 0 &&
              opcoesRelatorioSelecionadas.size === 0 &&
              recheiosSelecionados.size === 0
            return (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4 mb-4 border border-gray-200 dark:border-gray-700">
            <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
              <div>
                <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100">
                  {soRoteiroPorMassa
                    ? `Roteiro por massa${massasSelecionadas.size === 1 ? '' : 's'}`
                    : 'Roteiro'}
                </h2>
                {soRoteiroPorMassa ? (
                  <p className="text-sm text-gray-600 dark:text-gray-400 mt-0.5">
                    Clique em outro tipo de massa acima para adicionar a este roteiro.
                  </p>
                ) : (
                  <p className="text-sm text-gray-600 dark:text-gray-400 mt-0.5">
                    {opcoesRelatorioSelecionadas.size > 0
                      ? 'Roteiro detalhado por empresa e pão (opção: Margarina / Sem Margarina / Embalado).'
                      : recheiosSelecionados.size > 0
                        ? 'Roteiro com os filtros ativos (incluindo recheios selecionados).'
                        : 'Selecione um ou mais tipos de massa acima para ver o roteiro (massa + quantidade).'}
                  </p>
                )}
              </div>
              <div className="flex items-center gap-3">
                {soRoteiroPorMassa ? (
                  <>
                    <span className="text-sm text-gray-600 dark:text-gray-400">
                      {roteiroPorMassa.length} massa(s) · {roteiroPorMassa.reduce((s, r) => s + r.quantidade, 0)} un.
                    </span>
                    <button
                      type="button"
                      onClick={abrirRoteiroParaImpressao}
                      disabled={roteiroPorMassa.length === 0}
                      className="px-6 py-2 bg-primary-500 text-white rounded-lg font-semibold hover:bg-primary-600 disabled:opacity-50 disabled:cursor-not-allowed"
                      title="Abre o roteiro em nova janela para imprimir"
                    >
                      Imprimir
                    </button>
                  </>
                ) : (
                  <>
                    <span className="text-sm text-gray-600 dark:text-gray-400">
                      {itensFiltrados.length} linha(s) · {totalUnidades} un.
                    </span>
                    <button
                      type="button"
                      onClick={abrirRoteiroParaImpressao}
                      disabled={itensFiltrados.length === 0}
                      className="px-6 py-2 bg-primary-500 text-white rounded-lg font-semibold hover:bg-primary-600 disabled:opacity-50 disabled:cursor-not-allowed"
                      title="Abre o roteiro em nova janela para imprimir"
                    >
                      Imprimir
                    </button>
                  </>
                )}
              </div>
            </div>

            {soRoteiroPorMassa ? (
              roteiroPorMassa.length === 0 ? (
                <p className="text-gray-500 dark:text-gray-400 text-sm py-4">
                  Nenhuma quantidade para as massas selecionadas neste dia/período.
                </p>
              ) : (
                <div className="space-y-4">
                  {roteiroPorMassa.map(({ massa, quantidade, paes }) => (
                    <div
                      key={massa}
                      className="rounded-lg bg-gray-50 dark:bg-gray-700/50 border border-gray-200 dark:border-gray-600 overflow-hidden"
                    >
                      <div className="flex items-center justify-between py-3 px-4 border-b border-gray-200 dark:border-gray-600">
                        <span className="font-bold text-gray-900 dark:text-gray-100">{massa}</span>
                        <span className="text-lg font-bold text-primary-600 dark:text-primary-400">{quantidade} un.</span>
                      </div>
                      {paes.length > 0 && (
                        <ul className="py-2 px-4 space-y-1">
                          {paes.map((p) => (
                            <li key={p.nome} className="flex justify-between text-sm">
                              <span className="text-gray-700 dark:text-gray-300">{p.nome}</span>
                              <span className="font-semibold text-gray-900 dark:text-gray-100">{p.quantidade} un.</span>
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  ))}
                </div>
              )
            ) : itensFiltrados.length === 0 ? (
              <p className="text-gray-500 dark:text-gray-400 text-sm py-4">
                {paesUnicos.length === 0 &&
                massasUnicas.length === 0 &&
                recheiosUnicos.length === 0 &&
                opcoesRelatorioDisponiveis.length === 0
                  ? 'Nenhum pedido no dia.'
                  : 'Selecione ao menos um pão, um tipo de massa, um recheio ou uma opção de relatório (Margarina, Sem Margarina, Embalado) para ver o roteiro.'}
              </p>
            ) : (
              <>
                <p className="text-gray-500 dark:text-gray-400 text-sm py-2 mb-3">
                  O botão Imprimir abre o diálogo de impressão do roteiro (Empresa, Pão com recheio/opção, Quantidade).
                </p>
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
                      {itensFiltrados.map((p, idx) => (
                        <tr
                          key={`${p.empresa}-${p.produto_id}-${idx}`}
                          className="border-t border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 even:bg-gray-50 dark:even:bg-gray-700/50"
                        >
                          <td className="px-3 py-2 text-gray-900 dark:text-gray-100">{p.empresa}</td>
                          <td className="px-3 py-2 text-gray-900 dark:text-gray-100">{p.produto_nome}{p.recheio ? ` ${p.recheio}` : ''}{p.opcao_relatorio ? ` ${opcaoRelatorioParaLabel(p.opcao_relatorio)}` : ''}</td>
                          <td className="px-3 py-2 text-center font-semibold text-gray-900 dark:text-gray-100">{p.quantidade}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </div>
            )
          })()
          ) : (
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4 border border-gray-200 dark:border-gray-700 text-center">
              <p className="text-gray-600 dark:text-gray-400">
                Selecione ao menos um pão, um tipo de massa, um recheio ou uma opção de relatório (Margarina, Sem Margarina, Embalado) para ver o roteiro.
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
