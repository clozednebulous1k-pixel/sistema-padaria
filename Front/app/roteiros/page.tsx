'use client'

import { useEffect, useState, useRef } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { roteiroApi, produtoApi, empresaApi, Roteiro, RoteiroStatus, Produto, RoteiroItem } from '@/lib/api'
import toast from 'react-hot-toast'
import Loading from '@/components/Loading'
import { format, addDays, subDays, parseISO, startOfMonth, endOfMonth, eachDayOfInterval, startOfWeek, endOfWeek, getMonth, getYear, setMonth, setYear } from 'date-fns'
import * as XLSX from 'xlsx'
import ConfirmModal from '@/components/ConfirmModal'
import { opcaoRelatorioParaLabel } from '@/lib/opcoesRelatorio'
import { imprimirRoteiroEntregas, nomeExibicaoRoteiro } from '@/lib/imprimirRoteiroEntregas'

const statusLabels: Record<RoteiroStatus, string> = {
  pendente: 'Pendente',
  em_producao: 'Em Produção',
  concluido: 'Concluído',
  cancelado: 'Cancelado',
}

const statusColors: Record<RoteiroStatus, string> = {
  pendente: 'bg-yellow-100 text-yellow-800',
  em_producao: 'bg-blue-100 text-blue-800',
  concluido: 'bg-green-100 text-green-800',
  cancelado: 'bg-red-100 text-red-800',
}

const DIAS_SEMANA = [
  'Segunda-feira',
  'Terça-feira',
  'Quarta-feira',
  'Quinta-feira',
  'Sexta-feira',
  'Sábado',
  'Domingo'
]

const STORAGE_KEY_HISTORICO = 'historico_roteiros_producao'
const STORAGE_KEY_DATA_SELECIONADA = 'data_selecionada_roteiros'
const STORAGE_KEY_ROTEIRO_COPIADO = 'roteiro_copiado_producao'
const STORAGE_KEY_SLOT_COPIADO = 'slot_copiado_producao'

interface ItemConsolidado {
  empresa: string
  pao: string
  quantidade: number
}

interface TotalPao {
  pao: string
  quantidadeTotal: number
}

interface RegistroHistorico {
  id: string
  dataImpressao: string
  diaSemana: string
  itens: ItemConsolidado[]
  totaisPorPao: TotalPao[]
  totalGeral: number
}

const salvarNoHistorico = (
  diaSemana: string,
  itens: ItemConsolidado[],
  totaisPorPao: TotalPao[]
) => {
  try {
    const historicoSalvo = localStorage.getItem(STORAGE_KEY_HISTORICO)
    const historico: RegistroHistorico[] = historicoSalvo ? JSON.parse(historicoSalvo) : []

    const novoRegistro: RegistroHistorico = {
      id: `${diaSemana}_${Date.now()}`,
      dataImpressao: new Date().toISOString(),
      diaSemana,
      itens: [...itens],
      totaisPorPao: [...totaisPorPao],
      totalGeral: totaisPorPao.reduce((sum, total) => sum + total.quantidadeTotal, 0),
    }

    historico.push(novoRegistro)
    localStorage.setItem(STORAGE_KEY_HISTORICO, JSON.stringify(historico))
  } catch (error) {
    console.error('Erro ao salvar no histórico:', error)
  }
}

export default function RoteirosPage() {
  const pathname = usePathname()
  // Inicializar data selecionada (início da semana de hoje ou última semana salva)
  const [dataSelecionada, setDataSelecionada] = useState<Date>(() => {
    if (typeof window !== 'undefined') {
      const dataSalva = localStorage.getItem(STORAGE_KEY_DATA_SELECIONADA)
      if (dataSalva) {
        try {
          const data = parseISO(dataSalva)
          // Garantir que está no início da semana (segunda-feira)
          return startOfWeek(data, { weekStartsOn: 1 })
        } catch {
          return startOfWeek(new Date(), { weekStartsOn: 1 })
        }
      }
    }
    return startOfWeek(new Date(), { weekStartsOn: 1 })
  })
  
  const [roteiros, setRoteiros] = useState<Roteiro[]>([])
  const [loading, setLoading] = useState(true)
  const [filtroStatus, setFiltroStatus] = useState<RoteiroStatus | ''>('')
  const [periodoSelecionado, setPeriodoSelecionado] = useState<'manha' | 'noite'>('manha')
  const [roteirosExpandidos, setRoteirosExpandidos] = useState<Set<string>>(new Set())
  /** Roteiros cujos itens estão expandidos (clicou no roteiro para ver itens). Por padrão todos fechados. */
  const [slotRoteiroExpandido, setSlotRoteiroExpandido] = useState<Set<string>>(new Set())
  const [importando, setImportando] = useState(false)
  const [colando, setColando] = useState<string | null>(null)
  const [roteiroCopiado, setRoteiroCopiado] = useState<{ roteiros: Array<{ observacoes: string | null; itens: RoteiroItem[] }>; diaOrigem: string } | null>(() => {
    if (typeof window !== 'undefined') {
      try {
        const salvo = localStorage.getItem(STORAGE_KEY_ROTEIRO_COPIADO)
        if (salvo) {
          const parsed = JSON.parse(salvo)
          if (parsed?.roteiros && Array.isArray(parsed.roteiros)) return parsed
          if (parsed?.itens && Array.isArray(parsed.itens) && parsed.diaOrigem) {
            return { roteiros: [{ observacoes: null, itens: parsed.itens }], diaOrigem: parsed.diaOrigem }
          }
        }
      } catch {}
    }
    return null
  })
  // Estado para controlar quantos slots de roteiro cada dia mostra (mínimo 3 por dia; sem limite máximo)
  const [slotsPorDia, setSlotsPorDia] = useState<Map<string, number>>(() => {
    const mapa = new Map<string, number>()
    DIAS_SEMANA.forEach(dia => mapa.set(dia, 3))
    return mapa
  })
  // Estado para copiar slot individual
  const [slotCopiado, setSlotCopiado] = useState<{ roteiro: Roteiro; diaOrigem: string; slotOrigem: number } | null>(() => {
    if (typeof window !== 'undefined') {
      try {
        const salvo = localStorage.getItem(STORAGE_KEY_SLOT_COPIADO)
        if (salvo) {
          const parsed = JSON.parse(salvo)
          if (parsed?.roteiro?.id && parsed?.diaOrigem && Array.isArray(parsed?.roteiro?.itens)) {
            return parsed
          }
          localStorage.removeItem(STORAGE_KEY_SLOT_COPIADO)
        }
      } catch {
        localStorage.removeItem(STORAGE_KEY_SLOT_COPIADO)
      }
    }
    return null
  })
  // Estado para modal de renomear roteiro (slotIndex para preservar posição ao salvar)
  const [modalRenomear, setModalRenomear] = useState<{ roteiro: Roteiro; novoNome: string; slotIndex: number } | null>(null)
  /** Nome editável para slots vazios (antes de adicionar itens). Chave: `${diaSemana}_${slotIndex}` */
  const [nomeSlotVazio, setNomeSlotVazio] = useState<Record<string, string>>({})
  /** Modal para editar nome do slot vazio (sem roteiro ainda). */
  const [modalNomeSlotVazio, setModalNomeSlotVazio] = useState<{ diaSemana: string; slotIndex: number; nomeAtual: string } | null>(null)
  const [salvandoNome, setSalvandoNome] = useState(false)
  const [colandoSlot, setColandoSlot] = useState<string | null>(null)
  const [colandoNoSlot, setColandoNoSlot] = useState<string | null>(null)
  const [produtos, setProdutos] = useState<Produto[]>([])
  const [empresas, setEmpresas] = useState<string[]>([])
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [confirmModal, setConfirmModal] = useState<{
    open: boolean
    title: string
    message: string
    onConfirm: () => Promise<void>
  } | null>(null)
  /** Modal de pré-visualização para imprimir roteiro (com opção de aumentar/diminuir tamanho) */
  const [modalImpressaoRoteiro, setModalImpressaoRoteiro] = useState<{
    nomeRoteiro: string
    diaSemana: string
    dataDia: string
    itens: Array<{ observacao?: string | null; produto_nome?: string; produto_id: number; quantidade: number; opcao_relatorio?: string | null; recheio?: string | null }>
    totaisOrdenados: [string, number][]
    totalGeral: number
  } | null>(null)
  const [tamanhoRoteiroModal, setTamanhoRoteiroModal] = useState(120)

  const [modalGerarRomaneios, setModalGerarRomaneios] = useState<{
    nomeRoteiro: string
    diaSemana: string
    dataDia: string
    periodoLabel: string
    itens: Array<{ observacao?: string | null; produto_nome?: string; produto_id: number; quantidade: number; opcao_relatorio?: string | null; recheio?: string | null }>
    empresas: string[]
    selecionadas: string[]
  } | null>(null)

  // Salvar data selecionada no localStorage quando mudar
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem(STORAGE_KEY_DATA_SELECIONADA, format(dataSelecionada, 'yyyy-MM-dd'))
    }
  }, [dataSelecionada])

  useEffect(() => {
    carregarRoteiros()
    carregarProdutos()
    carregarEmpresas()
  }, [filtroStatus, dataSelecionada, periodoSelecionado])

  // Recarregar roteiros quando o usuário volta para esta página (ex.: após adicionar pedidos em /roteiros/novo)
  useEffect(() => {
    const onVisibilityChange = () => {
      if (typeof document !== 'undefined' && document.visibilityState === 'visible') {
        carregarRoteiros(false)
      }
    }
    document.addEventListener('visibilitychange', onVisibilityChange)
    return () => document.removeEventListener('visibilitychange', onVisibilityChange)
  }, [])

  // Recarregar ao navegar de volta para /roteiros (ex.: clique em Cancelar/Voltar em /roteiros/novo ou /roteiros/[id]/editar)
  const pathnameAnterior = useRef<string | null>(null)
  useEffect(() => {
    if (pathnameAnterior.current != null && pathnameAnterior.current !== '/roteiros' && pathname === '/roteiros') {
      carregarRoteiros(false)
    }
    pathnameAnterior.current = pathname
  }, [pathname])

  // Persistir roteiro copiado no localStorage
  useEffect(() => {
    if (typeof window !== 'undefined' && roteiroCopiado) {
      localStorage.setItem(STORAGE_KEY_ROTEIRO_COPIADO, JSON.stringify(roteiroCopiado))
    } else if (typeof window !== 'undefined' && !roteiroCopiado) {
      localStorage.removeItem(STORAGE_KEY_ROTEIRO_COPIADO)
    }
  }, [roteiroCopiado])

  // Persistir slot copiado no localStorage
  useEffect(() => {
    if (typeof window !== 'undefined' && slotCopiado) {
      localStorage.setItem(STORAGE_KEY_SLOT_COPIADO, JSON.stringify(slotCopiado))
    } else if (typeof window !== 'undefined' && !slotCopiado) {
      localStorage.removeItem(STORAGE_KEY_SLOT_COPIADO)
    }
  }, [slotCopiado])
  
  const carregarProdutos = async () => {
    try {
      const data = await produtoApi.listar()
      setProdutos(data)
    } catch (error) {
      console.error('Erro ao carregar produtos:', error)
    }
  }
  
  const carregarEmpresas = async () => {
    try {
      const data = await empresaApi.listar()
      setEmpresas(data.map(e => e.nome))
    } catch (error) {
      console.error('Erro ao carregar empresas:', error)
    }
  }

  const carregarRoteiros = async (mostrarLoading = true) => {
    try {
      if (mostrarLoading) setLoading(true)
      const filtros: any = {}
      if (filtroStatus) filtros.status = filtroStatus
      
      // Buscar todos os roteiros que são de produção (não são de motoristas)
      const data = await roteiroApi.listar(filtros)
      if (!Array.isArray(data)) {
        setRoteiros([])
        return
      }
      
      // Calcular datas da semana (segunda a domingo)
      const inicioSemana = startOfWeek(dataSelecionada, { weekStartsOn: 1 })
      const datasSemana: string[] = []
      for (let i = 0; i < 7; i++) {
        const dia = addDays(inicioSemana, i)
        datasSemana.push(format(dia, 'yyyy-MM-dd'))
      }
      
      // Filtrar apenas roteiros que correspondem aos dias da semana E à semana selecionada
      const roteirosProducao = data.filter((roteiro) => {
        const correspondeAoDia = DIAS_SEMANA.includes(roteiro.nome_empresa)
        const naoEhMotorista = !roteiro.motorista
        
        // Verificar se a data_producao corresponde a alguma data da semana
        let dataRoteiro = roteiro.data_producao
        if (dataRoteiro) {
          if (dataRoteiro.includes('T')) {
            dataRoteiro = dataRoteiro.split('T')[0]
          } else if (dataRoteiro.includes(' ')) {
            dataRoteiro = dataRoteiro.split(' ')[0]
          }
        }
        const correspondeADataSemana = datasSemana.includes(dataRoteiro)
        
        return correspondeAoDia && naoEhMotorista && correspondeADataSemana
      })
      
      // Garantir que cada roteiro tenha seus itens carregados
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
    } catch (error: any) {
      const status = error?.response?.status
      const msg = error?.response?.data?.message || error?.message || 'Erro desconhecido'
      console.error('Erro ao carregar roteiros:', error)
      setRoteiros([])
      // Não exibir toast em 401 (usuário será redirecionado para login)
      if (status === 401) return
      if (status === 403) {
        toast.error('Sem permissão para ver roteiros.')
        return
      }
      if (error?.code === 'ERR_NETWORK' || error?.message === 'Network Error') {
        toast.error('Não foi possível conectar à API. Verifique se o servidor está rodando.')
        return
      }
      toast.error(`Erro ao carregar roteiros: ${msg}`)
    } finally {
      setLoading(false)
    }
  }

  const avancarSemana = () => {
    setDataSelecionada(addDays(dataSelecionada, 7))
  }

  const retrocederSemana = () => {
    setDataSelecionada(subDays(dataSelecionada, 7))
  }

  const irParaSemanaAtual = () => {
    setDataSelecionada(startOfWeek(new Date(), { weekStartsOn: 1 }))
  }

  // Função para obter o número do dia e mês para cada dia da semana
  const obterDiaMes = (diaSemana: string): string | null => {
    const inicioSemana = startOfWeek(dataSelecionada, { weekStartsOn: 1 })
    const indiceDia = DIAS_SEMANA.indexOf(diaSemana)
    if (indiceDia === -1) return null
    const dataDia = addDays(inicioSemana, indiceDia)
    return format(dataDia, 'dd/MM')
  }

  const scrollPositionRef = useRef<number>(0)

  const toggleExpandirRoteiro = (diaSemana: string) => {
    // Salvar posição do scroll antes de expandir (evita tela subir sozinha)
    scrollPositionRef.current = typeof window !== 'undefined' ? window.scrollY : 0
    const novosExpandidos = new Set(roteirosExpandidos)
    if (novosExpandidos.has(diaSemana)) {
      novosExpandidos.delete(diaSemana)
    } else {
      novosExpandidos.add(diaSemana)
    }
    setRoteirosExpandidos(novosExpandidos)
  }

  /** Alterna exibição dos itens do roteiro (clicar no nome do roteiro para ver/ocultar itens). */
  const toggleExpandirItensRoteiro = (roteiroId: number) => {
    const key = String(roteiroId)
    setSlotRoteiroExpandido((prev) => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  }

  // Restaurar scroll após expandir/colapsar um dia
  useEffect(() => {
    if (scrollPositionRef.current > 0 && typeof window !== 'undefined') {
      const saved = scrollPositionRef.current
      scrollPositionRef.current = 0
      requestAnimationFrame(() => window.scrollTo(0, saved))
    }
  }, [roteirosExpandidos])

  const adicionarSlot = (diaSemana: string) => {
    setSlotsPorDia(prev => {
      const novo = new Map(prev)
      const atual = novo.get(diaSemana) || 3
      novo.set(diaSemana, atual + 1)
      return novo
    })
  }

  const imprimirSlot = (
    nomeRoteiro: string,
    diaSemana: string,
    dataDia: string,
    itens: Array<{ observacao?: string | null; produto_nome?: string; produto_id: number; quantidade: number; opcao_relatorio?: string | null; recheio?: string | null }>,
    tipo: 'roteiro' | 'romaneio' = 'roteiro',
    tamanhoPercent: number = 100
  ) => {
    imprimirRoteiroEntregas({
      nomeRoteiro,
      diaSemana,
      dataDia,
      periodoLabel: periodoSelecionado === 'manha' ? 'Manhã' : 'Noite',
      itens,
      tamanhoPercent,
      tituloVariant: tipo === 'romaneio' ? 'romaneio' : 'roteiro',
    })
  }

  /**
   * Gera romaneios por empresa (igual aos roteiros de motorista).
   * Um romaneio por empresa, com Produto/Quantidade consolidados e espaço para assinatura.
   */
  const gerarRomaneiosPorEmpresaProducao = (
    nomeRoteiro: string,
    diaSemana: string,
    dataDia: string,
    periodoLabel: string,
    itens: Array<{ observacao?: string | null; produto_nome?: string; produto_id: number; quantidade: number; opcao_relatorio?: string | null }>
  ) => {
    if (!itens || itens.length === 0) {
      toast.error('Não há itens para gerar romaneios')
      return
    }
    const pedidosPorEmpresa = new Map<string, Map<string, number>>()
    itens.forEach((item) => {
      const empresa = (item.observacao || 'Sem empresa').trim()
      if (!empresa || empresa === 'Sem empresa') return
      if (!pedidosPorEmpresa.has(empresa)) pedidosPorEmpresa.set(empresa, new Map())
      const produtosEmpresa = pedidosPorEmpresa.get(empresa)!
      const produtoNome = item.produto_nome || `ID: ${item.produto_id}`
      const qtd = produtosEmpresa.get(produtoNome) || 0
      produtosEmpresa.set(produtoNome, qtd + item.quantidade)
    })
    const empresas = Array.from(pedidosPorEmpresa.keys()).filter((e) => e && e !== 'Sem empresa')
    if (empresas.length === 0) {
      toast.error('Não foi possível identificar empresas nos pedidos')
      return
    }
    toast.success(`Gerando ${empresas.length} romaneio(s) para ${empresas.length} empresa(s)...`, { duration: 3000 })
    const pageBreakStyle = (index: number) => (index === 0 ? '' : 'page-break-before: always;')
    const romaneiosHTML = empresas
      .map((empresa, index) => {
        const produtosEmpresa = pedidosPorEmpresa.get(empresa)!
        const produtosArray = Array.from(produtosEmpresa.entries())
          .map(([produtoNome, quantidade]) => ({ produtoNome, quantidade }))
          .sort((a, b) => a.produtoNome.localeCompare(b.produtoNome))
        const totalGeral = produtosArray.reduce((s, p) => s + p.quantidade, 0)
        return `
      <div class="romaneio-page" style="${pageBreakStyle(index)} min-height: 100vh; display: flex; flex-direction: column; padding: 12px; box-sizing: border-box; font-size: 14px;">
        <h1 style="color: #333; border-bottom: 2px solid #550701; padding-bottom: 4px; margin-bottom: 8px; font-size: 18px;">ROMANEIO DE PEDIDOS</h1>
        <div class="info" style="margin: 8px 0; padding: 10px; background-color: #f9f9f9; border-left: 4px solid #f3b125; font-size: 13px;">
          <p style="margin: 2px 0;"><strong>Empresa/Cliente:</strong> ${empresa}</p>
          <p style="margin: 2px 0;"><strong>Roteiro:</strong> ${nomeRoteiro}</p>
          <p style="margin: 2px 0;"><strong>Dia:</strong> ${diaSemana}</p>
          <p style="margin: 2px 0;"><strong>Data:</strong> ${dataDia}</p>
          <p style="margin: 4px 0 0 0;"><strong>Período:</strong> ${periodoLabel} &nbsp;•&nbsp; <strong>Data de emissão:</strong> ${format(new Date(), 'dd/MM/yyyy')}</p>
        </div>
        <table style="width: 100%; border-collapse: collapse; margin: 8px 0; font-size: 14px;">
          <thead>
            <tr>
              <th style="width: 60%; border: 1px solid #ddd; padding: 8px 10px; text-align: left; background-color: #550701; color: white; font-weight: bold;">Produto</th>
              <th style="width: 40%; border: 1px solid #ddd; padding: 8px 10px; text-align: left; background-color: #550701; color: white; font-weight: bold;">Quantidade</th>
            </tr>
          </thead>
          <tbody>
            ${produtosArray.map((p) => `
              <tr>
                <td style="border: 1px solid #ddd; padding: 8px 10px; text-align: left; background-color: #fff;">${p.produtoNome}</td>
                <td style="border: 1px solid #ddd; padding: 8px 10px; text-align: center; font-weight: bold; background-color: #fff;">${p.quantidade}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
        <div class="total" style="margin-top: 8px; padding: 10px; background-color: #550701; color: white; text-align: center; font-size: 15px; font-weight: bold;">
          Total Geral: ${totalGeral} unidades
        </div>
        <div style="margin-top: auto; padding-top: 30px; border-top: 2px solid #550701;">
          <div style="text-align: center;">
            <p style="margin-bottom: 25px; font-size: 13px;">_________________________________________</p>
            <p style="font-size: 13px; font-weight: bold;">Assinatura do Responsável pelo Recebimento</p>
            <p style="font-size: 12px; color: #666; margin-top: 2px;">Nome e Carimbo da Empresa</p>
          </div>
        </div>
      </div>
    `
      })
      .join('')
    const janelaImpressao = window.open('', '_blank')
    if (!janelaImpressao) {
      toast.error('Não foi possível abrir janela de impressão. Verifique se pop-ups estão bloqueados.')
      return
    }
    janelaImpressao.document.write(`
<!DOCTYPE html>
<html>
  <head>
    <title>Romaneios - ${nomeRoteiro}</title>
    <meta charset="UTF-8">
    <style>
      * { margin: 0; padding: 0; box-sizing: border-box; }
      @media print {
        body { margin: 0; padding: 0; }
        .romaneio-page { page-break-after: always; page-break-inside: avoid; break-after: page; break-inside: avoid; }
        .romaneio-page:last-child { page-break-after: auto; break-after: auto; }
        tr { page-break-inside: avoid; break-inside: avoid; }
      }
      @media screen {
        .romaneio-page { margin-bottom: 40px; border-bottom: 2px dashed #ccc; padding-bottom: 40px; }
      }
      body { font-family: Arial, sans-serif; margin: 0; padding: 0; }
    </style>
  </head>
  <body>
    ${romaneiosHTML}
  </body>
</html>
    `)
    janelaImpressao.document.close()
    setTimeout(() => {
      janelaImpressao.focus()
      janelaImpressao.print()
    }, 500)
  }

  // Copiar um slot individual
  const copiarSlot = (roteiro: Roteiro, diaSemana: string, slotIndex: number) => {
    if (!roteiro.itens || roteiro.itens.length === 0) {
      toast.error('Não há itens para copiar neste roteiro')
      return
    }
    setSlotCopiado({ roteiro, diaOrigem: diaSemana, slotOrigem: slotIndex + 1 })
    toast.success(`Roteiro ${slotIndex + 1} de ${diaSemana} copiado!`)
  }

  const itensSlotCopiado = (): RoteiroItem[] =>
    (slotCopiado?.roteiro?.itens?.map(item => ({
      produto_id: item.produto_id,
      quantidade: item.quantidade,
      observacao: item.observacao || undefined
    })) || [])

  // Colar slot em um dia (cria novo roteiro com os itens copiados)
  const colarSlotEmDia = async (diaSemana: string) => {
    if (!slotCopiado) return
    const itensParaColar = itensSlotCopiado()
    if (itensParaColar.length === 0) return

    setColandoSlot(diaSemana)
    try {
      const inicioSemana = startOfWeek(dataSelecionada, { weekStartsOn: 1 })
      const indiceDia = DIAS_SEMANA.indexOf(diaSemana)
      const dataDia = format(addDays(inicioSemana, indiceDia), 'yyyy-MM-dd')

      await roteiroApi.criar({
        nome_empresa: diaSemana,
        data_producao: dataDia,
        periodo: periodoSelecionado,
        itens: itensParaColar
      })

      await carregarRoteiros(false)
      toast.success(`Roteiro colado em ${diaSemana}!`)
    } catch (error) {
      console.error('Erro ao colar roteiro:', error)
      toast.error('Erro ao colar roteiro')
    } finally {
      setColandoSlot(null)
    }
  }

  // Colar no slot específico: atualiza o roteiro existente ou cria novo no dia
  const colarNoSlot = async (diaSemana: string, slotIndex: number, roteiroExistente: Roteiro | undefined) => {
    if (!slotCopiado) return
    const itensParaColar = itensSlotCopiado()
    if (itensParaColar.length === 0) return
    if (roteiroExistente?.id === slotCopiado.roteiro.id) {
      toast.error('Não é possível colar no mesmo roteiro')
      return
    }

    const chaveSlot = `${diaSemana}_${slotIndex}`
    setColandoNoSlot(chaveSlot)
    try {
      if (roteiroExistente) {
        await roteiroApi.atualizarItens(roteiroExistente.id, itensParaColar)
        toast.success(`Roteiro colado em ${roteiroExistente.observacoes || `Roteiro ${slotIndex + 1}`}!`)
      } else {
        const inicioSemana = startOfWeek(dataSelecionada, { weekStartsOn: 1 })
        const indiceDia = DIAS_SEMANA.indexOf(diaSemana)
        const dataDia = format(addDays(inicioSemana, indiceDia), 'yyyy-MM-dd')
        await roteiroApi.criar({
          nome_empresa: diaSemana,
          data_producao: dataDia,
          periodo: periodoSelecionado,
          observacoes: `Roteiro ${slotIndex + 1}`,
          itens: itensParaColar
        })
        toast.success(`Roteiro colado em ${diaSemana}!`)
      }
      await carregarRoteiros(false)
      setSlotCopiado(null)
    } catch (error) {
      console.error('Erro ao colar roteiro:', error)
      toast.error('Erro ao colar roteiro')
    } finally {
      setColandoNoSlot(null)
    }
  }

  // Renomear roteiro (atualizar observações mantendo "Roteiro N" para não perder o slot)
  const renomearRoteiro = async () => {
    if (!modalRenomear) return
    
    setSalvandoNome(true)
    try {
      const n = modalRenomear.slotIndex + 1
      const observacoesSalvar =
        modalRenomear.novoNome.trim() !== ''
          ? `Roteiro ${n} - ${modalRenomear.novoNome.trim()}`
          : `Roteiro ${n}`
      await roteiroApi.atualizar(modalRenomear.roteiro.id, {
        observacoes: observacoesSalvar
      })
      await carregarRoteiros(false)
      toast.success('Nome do roteiro atualizado!')
      setModalRenomear(null)
    } catch (error) {
      console.error('Erro ao renomear roteiro:', error)
      toast.error('Erro ao renomear roteiro')
    } finally {
      setSalvandoNome(false)
    }
  }

  const consolidarItensPorDia = (): Map<string, { itens: ItemConsolidado[], roteiros: (Roteiro | undefined)[], totaisPorPao: TotalPao[] }> => {
    const roteirosPorDia = new Map<string, { itens: ItemConsolidado[], roteiros: (Roteiro | undefined)[], totaisPorPao: TotalPao[] }>()

    // Inicializar todos os dias da semana
    DIAS_SEMANA.forEach((dia) => {
      roteirosPorDia.set(dia, {
        itens: [],
        roteiros: [],
        totaisPorPao: []
      })
    })
    
    roteiros.forEach((roteiro) => {
      // Filtrar por status se houver filtro
      if (filtroStatus && roteiro.status !== filtroStatus) {
        return
      }

      // Filtrar por período
      const periodoRoteiro = roteiro.periodo || ''
      if (periodoSelecionado === 'manha' && periodoRoteiro !== 'manha') {
        return
      }
      if (periodoSelecionado === 'noite' && periodoRoteiro !== 'noite') {
        return
      }

      // Verificar se é um roteiro de dia da semana válido
      if (!DIAS_SEMANA.includes(roteiro.nome_empresa)) {
        return
      }

      const diaSemana = roteiro.nome_empresa
      const dadosDia = roteirosPorDia.get(diaSemana)!

      if (!dadosDia.roteiros.some(r => r?.id === roteiro.id)) {
        dadosDia.roteiros.push(roteiro)
      }

      if (roteiro.itens && roteiro.itens.length > 0) {
        roteiro.itens.forEach((item) => {
          const produtoNome = item.produto_nome || `Produto ID: ${item.produto_id}`
          const quantidade = Number(item.quantidade)
          
          // Empresa vem da observação do item (ou nome_empresa do roteiro como fallback)
          const empresa = item.observacao || roteiro.nome_empresa || 'Sem empresa'
          
          // Adicionar item individualmente
          dadosDia.itens.push({
            empresa: empresa,
            pao: produtoNome,
            quantidade: quantidade,
          })

          // Calcular total por tipo de pão
          const totalPaoExistente = dadosDia.totaisPorPao.find(t => t.pao === produtoNome)
          if (totalPaoExistente) {
            totalPaoExistente.quantidadeTotal += quantidade
          } else {
            dadosDia.totaisPorPao.push({
              pao: produtoNome,
              quantidadeTotal: quantidade,
            })
          }
        })
      }
    })

    const extrairSlotDeObservacoes = (obs: string | null | undefined): number | null => {
      if (!obs) return null
      const match = String(obs).match(/Roteiro\s*(\d+)/i)
      return match ? parseInt(match[1], 10) : null
    }

    // Ordenar roteiros: "Roteiro N" vai para slot N-1; manter posições fixas (não preencher com outros)
    roteirosPorDia.forEach((dados) => {
      const roteirosDefinidos = dados.roteiros.filter((r): r is Roteiro => r != null)
      const comSlot = roteirosDefinidos.filter((r) => extrairSlotDeObservacoes(r.observacoes) !== null)
      const semSlot = roteirosDefinidos.filter((r) => extrairSlotDeObservacoes(r.observacoes) === null).sort((a, b) => a.id - b.id)
      const maxSlot = Math.max(3, comSlot.length > 0 ? Math.max(...comSlot.map((r) => extrairSlotDeObservacoes(r.observacoes)!)) : 0)
      const resultado: (Roteiro | undefined)[] = []
      for (let i = 1; i <= maxSlot; i++) {
        const r = comSlot.find((x) => extrairSlotDeObservacoes(x.observacoes) === i)
        resultado[i - 1] = r
      }
      // Sem slot: anexar no final (não preencher slots vazios para manter Roteiro 1, 2, 3 fixos)
      semSlot.forEach((r) => resultado.push(r))
      dados.roteiros = resultado
      dados.itens.sort((a, b) => {
        if (a.empresa !== b.empresa) {
          return a.empresa.localeCompare(b.empresa)
        }
        return a.pao.localeCompare(b.pao)
      })
      dados.totaisPorPao.sort((a, b) => a.pao.localeCompare(b.pao))
    })

    return roteirosPorDia
  }

  const roteirosPorDia = consolidarItensPorDia()

  // Atualizar slots se houver mais roteiros do que slots configurados
  useEffect(() => {
    setSlotsPorDia(prev => {
      let precisaAtualizar = false
      const novoSlots = new Map(prev)
      
      roteirosPorDia.forEach((dados, dia) => {
        const slotsAtuais = prev.get(dia) || 3
        if (dados.roteiros.length > slotsAtuais) {
          novoSlots.set(dia, dados.roteiros.length)
          precisaAtualizar = true
        }
      })
      
      return precisaAtualizar ? novoSlots : prev
    })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roteiros, filtroStatus, periodoSelecionado])

  const copiarRoteiro = (diaSemana: string, roteirosDoDia: (Roteiro | undefined)[]) => {
    const roteirosParaCopiar: Array<{ observacoes: string | null; itens: RoteiroItem[] }> = []
    for (const roteiro of roteirosDoDia) {
      if (!roteiro?.itens || roteiro.itens.length === 0) continue
      const itens: RoteiroItem[] = roteiro.itens.map((item) => ({
        produto_id: item.produto_id,
        quantidade: item.quantidade,
        observacao: item.observacao || undefined,
      }))
      roteirosParaCopiar.push({
        observacoes: roteiro.observacoes ?? null,
        itens,
      })
    }
    if (roteirosParaCopiar.length === 0) {
      toast.error('Não há itens para copiar')
      return
    }
    const totalItens = roteirosParaCopiar.reduce((s, r) => s + r.itens.length, 0)
    setRoteiroCopiado({ roteiros: roteirosParaCopiar, diaOrigem: diaSemana })
    toast.success(`${roteirosParaCopiar.length} roteiro(s) de ${diaSemana} copiado(s) (${totalItens} itens). Clique em "Colar Tudo" no dia desejado.`)
  }

  const colarRoteiro = async (diaDestino: string) => {
    if (!roteiroCopiado || roteiroCopiado.roteiros.length === 0) {
      toast.error('Nenhum roteiro copiado. Copie um roteiro primeiro.')
      return
    }
    if (diaDestino === roteiroCopiado.diaOrigem) {
      toast.error('Não é possível colar no mesmo dia. Escolha outro dia.')
      return
    }
    setColando(diaDestino)
    try {
      const inicioSemana = startOfWeek(dataSelecionada, { weekStartsOn: 1 })
      const indiceDia = DIAS_SEMANA.indexOf(diaDestino)
      const dataProducao = format(addDays(inicioSemana, indiceDia), 'yyyy-MM-dd')

      const todosRoteiros = await roteiroApi.listar({})
      const roteirosExistentes = todosRoteiros.filter((r) => {
        const dataRoteiro = r.data_producao?.split('T')[0] || r.data_producao?.split(' ')[0] || ''
        return r.nome_empresa === diaDestino && !r.motorista && dataRoteiro === dataProducao && (r.periodo || 'manha') === periodoSelecionado
      })

      for (const r of roteirosExistentes) {
        await roteiroApi.deletar(r.id)
      }

      for (const { observacoes, itens } of roteiroCopiado.roteiros) {
        if (itens.length === 0) continue
        await roteiroApi.criar({
          nome_empresa: diaDestino,
          data_producao: dataProducao,
          motorista: '',
          status: 'pendente',
          periodo: periodoSelecionado,
          observacoes: observacoes ?? undefined,
          itens,
        })
      }
      await carregarRoteiros(false)
      toast.success(`${roteiroCopiado.roteiros.length} roteiro(s) colado(s) em ${diaDestino} com sucesso!`)
      setRoteiroCopiado(null)
    } catch (error: any) {
      toast.error(`Erro ao colar: ${error?.message || 'Erro desconhecido'}`)
      console.error('Erro ao colar roteiro:', error)
    } finally {
      setColando(null)
    }
  }

  const handleImportarExcel = (diaSemana?: string) => {
    // Armazenar o dia da semana selecionado para uso no processamento
    if (diaSemana && typeof window !== 'undefined') {
      (window as any).diaImportacaoExcel = diaSemana
    }
    fileInputRef.current?.click()
  }
  
  const gerarExcelTemplate = () => {
    if (produtos.length === 0) {
      toast.error('Nenhum produto cadastrado. Cadastre produtos antes de gerar o template.')
      return
    }
    
    try {
      // Criar dados de exemplo vazio (apenas cabeçalho)
      const dados = [
        {
          'Empresa/Cliente': '',
          'Produto/Pão': '',
          'Quantidade': '',
          'Dia da Semana': '',
          'Período': periodoSelecionado
        }
      ]
      
      // Adicionar uma aba com lista de produtos cadastrados
      const produtosData = produtos.map(p => ({
        'Produto Cadastrado': p.nome,
        'Descrição': p.descricao || '',
        'Status': p.ativo ? 'Ativo' : 'Inativo'
      }))
      
      // Criar workbook
      const workbook = XLSX.utils.book_new()
      
      // Worksheet principal (template)
      const worksheet = XLSX.utils.json_to_sheet(dados)
      worksheet['!cols'] = [
        { wch: 20 }, // Empresa/Cliente
        { wch: 20 }, // Produto/Pão
        { wch: 12 }, // Quantidade
        { wch: 18 }, // Dia da Semana
        { wch: 12 }  // Período
      ]
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Template Roteiros')
      
      // Worksheet com produtos cadastrados
      const produtosWorksheet = XLSX.utils.json_to_sheet(produtosData)
      produtosWorksheet['!cols'] = [
        { wch: 25 }, // Produto Cadastrado
        { wch: 30 }, // Descrição
        { wch: 12 }  // Status
      ]
      XLSX.utils.book_append_sheet(workbook, produtosWorksheet, 'Produtos Cadastrados')
      
      // Gerar arquivo e fazer download
      XLSX.writeFile(workbook, 'template-roteiros.xlsx')
      toast.success('Template Excel gerado com sucesso!')
    } catch (error: any) {
      console.error('Erro ao gerar Excel template:', error)
      toast.error(`Erro ao gerar template: ${error?.message || 'Erro desconhecido'}`)
    }
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      const extension = file.name.split('.').pop()?.toLowerCase()
      if (extension !== 'xlsx' && extension !== 'xls') {
        toast.error('Por favor, selecione um arquivo Excel (.xlsx ou .xls)')
        return
      }
      processarExcel(file)
    }
  }

  const processarExcel = async (file: File) => {
    try {
      setImportando(true)
      
      // Garantir que produtos e empresas estejam carregados
      if (produtos.length === 0) {
        await carregarProdutos()
      }
      if (empresas.length === 0) {
        await carregarEmpresas()
      }
      
      const data = await file.arrayBuffer()
      const workbook = XLSX.read(data, { type: 'array' })
      const firstSheet = workbook.Sheets[workbook.SheetNames[0]]
      const jsonData = XLSX.utils.sheet_to_json(firstSheet) as any[]

      if (jsonData.length === 0) {
        toast.error('A planilha está vazia')
        return
      }
      
      if (produtos.length === 0) {
        toast.error('Nenhum produto cadastrado. Cadastre produtos antes de importar.')
        return
      }

      // Formato esperado: Empresa, Produto, Quantidade, Dia (opcional), Período (opcional)
      // Mapear possíveis nomes de colunas
      const getValue = (row: any, possibleNames: string[]) => {
        for (const name of possibleNames) {
          if (row[name]) return String(row[name]).trim()
        }
        // Tentar buscar por índice (A, B, C, D, E)
        const keys = Object.keys(row)
        if (possibleNames.includes('Empresa') && keys[0]) return String(row[keys[0]]).trim()
        if (possibleNames.includes('Produto') && keys[1]) return String(row[keys[1]]).trim()
        if (possibleNames.includes('Quantidade') && keys[2]) return String(row[keys[2]]).trim()
        if (possibleNames.includes('Dia') && keys[3]) return String(row[keys[3]]).trim()
        if (possibleNames.includes('Período') && keys[4]) return String(row[keys[4]]).trim()
        return null
      }

      // Agrupar por dia e período
      const roteirosParaCriar = new Map<string, { dia: string, periodo: string, itens: RoteiroItem[] }>()

      for (const row of jsonData) {
        const empresa = getValue(row, ['Empresa', 'Empresa/Cliente', 'Cliente', 'empresa', 'cliente']) || ''
        const produtoNome = getValue(row, ['Produto', 'Pão', 'Produto/Pão', 'produto', 'pao']) || ''
        const quantidadeStr = getValue(row, ['Quantidade', 'Qtd', 'quantidade', 'qtd']) || '0'
        const diaSemana = getValue(row, ['Dia', 'Dia da Semana', 'dia', 'Dia Semana']) || ''
        const periodo = (getValue(row, ['Período', 'Periodo', 'período', 'periodo']) || '').toLowerCase()

        if (!empresa || !produtoNome || !quantidadeStr) {
          console.warn('Linha ignorada por dados incompletos:', row)
          continue
        }

        const quantidade = parseInt(quantidadeStr) || 0
        if (quantidade <= 0) {
          console.warn('Quantidade inválida:', quantidadeStr)
          continue
        }

        // Encontrar produto por nome
        const produto = produtos.find(p => 
          p.nome.toLowerCase() === produtoNome.toLowerCase() || 
          p.nome.toLowerCase().includes(produtoNome.toLowerCase()) ||
          produtoNome.toLowerCase().includes(p.nome.toLowerCase())
        )

        if (!produto) {
          toast.error(`Produto não encontrado: ${produtoNome}. Certifique-se de que o produto está cadastrado.`)
          continue
        }

        // Determinar dia da semana
        // Se houver um dia específico para importação (do botão clicado), usar esse dia
        const diaImportacao = typeof window !== 'undefined' ? (window as any).diaImportacaoExcel : null
        const diaFinal = (diaSemana && DIAS_SEMANA.includes(diaSemana))
          ? diaSemana 
          : (diaImportacao && DIAS_SEMANA.includes(diaImportacao))
            ? diaImportacao
            : DIAS_SEMANA[0] // Se não especificado, usar o primeiro dia da semana

        // Determinar período
        const periodoFinal = (periodo === 'manha' || periodo === 'noite' || periodo === 'matutino' || periodo === 'noturno')
          ? (periodo === 'manha' || periodo === 'matutino' ? 'manha' : 'noite')
          : periodoSelecionado

        const chave = `${diaFinal}_${periodoFinal}`
        if (!roteirosParaCriar.has(chave)) {
          roteirosParaCriar.set(chave, {
            dia: diaFinal,
            periodo: periodoFinal,
            itens: []
          })
        }

        const roteiro = roteirosParaCriar.get(chave)!
        roteiro.itens.push({
          produto_id: produto.id,
          quantidade: quantidade,
          observacao: empresa
        })
      }

      // Criar ou atualizar roteiros
      let roteirosCriados = 0
      let itensAdicionados = 0

      for (const [chave, dados] of Array.from(roteirosParaCriar.entries())) {
        if (dados.itens.length === 0) continue

        // Calcular data baseada no dia da semana
        const inicioSemana = startOfWeek(dataSelecionada, { weekStartsOn: 1 })
        const indiceDia = DIAS_SEMANA.indexOf(dados.dia)
        const dataProducao = format(addDays(inicioSemana, indiceDia), 'yyyy-MM-dd')

        try {
          // Verificar se já existe roteiro para este dia/periodo/data
          const roteirosExistentes = await roteiroApi.listar({})
          const roteiroExistente = roteirosExistentes.find(r => {
            const dataRoteiro = r.data_producao?.split('T')[0] || r.data_producao?.split(' ')[0] || ''
            return r.nome_empresa === dados.dia && 
                   (!r.motorista) &&
                   dataRoteiro === dataProducao &&
                   (r.periodo || 'manha') === dados.periodo
          })

          if (roteiroExistente) {
            // Buscar roteiro completo e adicionar itens
            const roteiroCompleto = await roteiroApi.buscar(roteiroExistente.id)
            const itensExistentes = (roteiroCompleto.itens || []).map((i) => ({
              produto_id: i.produto_id,
              quantidade: i.quantidade,
              observacao: i.observacao ?? undefined
            }))
            const novosItens: RoteiroItem[] = [...itensExistentes, ...dados.itens]
            await roteiroApi.atualizarItens(roteiroExistente.id, novosItens)
            itensAdicionados += dados.itens.length
          } else {
            // Criar novo roteiro
            await roteiroApi.criar({
              nome_empresa: dados.dia,
              data_producao: dataProducao,
              motorista: '',
              status: 'pendente',
              periodo: dados.periodo as 'manha' | 'noite',
              itens: dados.itens
            })
            roteirosCriados++
            itensAdicionados += dados.itens.length
          }
        } catch (error: any) {
          console.error(`Erro ao processar roteiro ${dados.dia}:`, error)
          toast.error(`Erro ao processar ${dados.dia}: ${error?.message || 'Erro desconhecido'}`)
        }
      }

      toast.success(`Importação concluída! ${roteirosCriados} roteiro(s) criado(s), ${itensAdicionados} item(ns) adicionado(s).`)
      await carregarRoteiros(false)
    } catch (error: any) {
      console.error('Erro ao processar Excel:', error)
      toast.error(`Erro ao importar: ${error?.message || 'Erro desconhecido'}`)
    } finally {
      setImportando(false)
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
      // Limpar dia de importação
      if (typeof window !== 'undefined') {
        delete (window as any).diaImportacaoExcel
      }
    }
  }

  if (loading) {
    return <Loading />
  }

  // Calcular intervalo da semana para exibição
  const inicioSemana = startOfWeek(dataSelecionada, { weekStartsOn: 1 })
  const fimSemana = addDays(inicioSemana, 6)
  const dataInicioFormatada = format(inicioSemana, 'dd/MM')
  const dataFimFormatada = format(fimSemana, 'dd/MM/yyyy')

  return (
    <div className="container mx-auto px-4">
      {confirmModal && (
        <ConfirmModal
          open={confirmModal.open}
          title={confirmModal.title}
          message={confirmModal.message}
          variant="danger"
          onConfirm={confirmModal.onConfirm}
          onCancel={() => setConfirmModal(null)}
        />
      )}
      <div className="mb-4">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Roteiros de Produção</h1>
        
        {/* Navegação de Semana */}
        <div className="bg-white rounded-lg shadow p-2 mb-2">
          <div className="flex items-center justify-between">
            <button
              onClick={retrocederSemana}
              className="px-2 py-1.5 text-sm bg-gray-100 text-gray-700 rounded-lg font-semibold hover:bg-gray-200 transition-colors flex items-center gap-1"
            >
              ← Semana Anterior
            </button>
            
            <div className="text-center">
              <div className="text-base font-bold text-gray-900">
                Semana: {dataInicioFormatada} a {dataFimFormatada}
              </div>
              <button
                onClick={irParaSemanaAtual}
                className="mt-1 text-xs text-primary-600 hover:text-primary-700 font-semibold underline"
              >
                Ir para semana atual
              </button>
            </div>
            
            <button
              onClick={avancarSemana}
              className="px-2 py-1.5 text-sm bg-gray-100 text-gray-700 rounded-lg font-semibold hover:bg-gray-200 transition-colors flex items-center gap-1"
            >
              Próxima Semana →
            </button>
          </div>
        </div>
      </div>

      {/* Seletor de Período */}
      <div className="bg-white rounded-lg shadow p-3 mb-3">
        <h2 className="text-sm font-semibold text-gray-900 mb-2">Período</h2>
        <div className="flex gap-2">
          <button
            onClick={() => setPeriodoSelecionado('manha')}
            className={`flex-1 px-3 py-2 text-sm rounded-lg font-semibold transition-colors ${
              periodoSelecionado === 'manha'
                ? 'bg-primary-500 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            Manhã
          </button>
          <button
            onClick={() => setPeriodoSelecionado('noite')}
            className={`flex-1 px-3 py-2 text-sm rounded-lg font-semibold transition-colors ${
              periodoSelecionado === 'noite'
                ? 'bg-primary-500 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            Noite
          </button>
        </div>
      </div>

      {/* Input file oculto para importar Excel */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".xlsx,.xls"
        onChange={handleFileChange}
        className="hidden"
      />
      
      {/* Botão para gerar template Excel */}
      <div className="bg-white rounded-lg shadow p-3 mb-4 flex justify-between items-center">
        <div>
          <h3 className="text-sm font-semibold text-gray-900">Template Excel</h3>
          <p className="text-xs text-gray-600 mt-0.5">
            Baixe o template com os produtos cadastrados para facilitar a importação
          </p>
        </div>
        <button
          onClick={gerarExcelTemplate}
          disabled={produtos.length === 0}
          className="px-3 py-1.5 text-sm bg-secondary-500 text-white rounded-lg font-semibold hover:bg-secondary-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1.5"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          Baixar Template
        </button>
      </div>

      <div className="space-y-6">
        {DIAS_SEMANA.map((diaSemana) => {
          const dadosDia = roteirosPorDia.get(diaSemana)!
          const itensConsolidados = dadosDia.itens
          const roteirosDoDia = dadosDia.roteiros
          const totaisPorPao = dadosDia.totaisPorPao
          const estaExpandido = roteirosExpandidos.has(diaSemana)

          return (
            <div key={diaSemana} className="bg-white dark:bg-gray-800 rounded-lg shadow-md border border-gray-200 dark:border-gray-700">
              {/* Cabeçalho clicável - Card compacto */}
              <div
                onClick={() => toggleExpandirRoteiro(diaSemana)}
                className="p-4 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors rounded-t-lg"
              >
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-3">
                    <div className={`transform transition-transform ${estaExpandido ? 'rotate-90' : ''}`}>
                      ▶
                    </div>
                    <div>
                      <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100">
                        {diaSemana} {obterDiaMes(diaSemana) !== null && `- ${obterDiaMes(diaSemana)}`}
                      </h2>
                      <p className="text-sm text-gray-600 dark:text-gray-300 mt-0.5">
                        {roteirosDoDia.filter((r): r is Roteiro => !!(r && r.itens && r.itens.length > 0)).length} roteiro{roteirosDoDia.filter((r): r is Roteiro => !!(r && r.itens && r.itens.length > 0)).length !== 1 ? 's' : ''} • {itensConsolidados.length} {itensConsolidados.length !== 1 ? 'itens' : 'item'} total
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-2" onClick={(e) => e.stopPropagation()}>
                    {roteirosDoDia.some((r): r is Roteiro => !!r) && (
                      <button
                        onClick={() => {
                          setConfirmModal({
                            open: true,
                            title: 'Limpar todos os roteiros',
                            message: `Tem certeza que deseja limpar TODOS os roteiros de ${diaSemana}? Os roteiros serão enviados para Restauração.`,
                            onConfirm: async () => {
                              try {
                                for (const roteiro of roteirosDoDia.filter((r): r is Roteiro => !!r)) {
                                  await roteiroApi.deletar(roteiro.id)
                                }
                                await carregarRoteiros(false)
                                toast.success('Todos os roteiros enviados para Restauração!')
                                setConfirmModal(null)
                              } catch (error) {
                                toast.error('Erro ao limpar roteiros')
                                console.error(error)
                                throw error
                              }
                            },
                          })
                        }}
                        className="bg-red-500 text-white px-3 py-1.5 rounded-md font-semibold hover:bg-red-600 transition-colors text-xs"
                        title="Limpar todos os roteiros deste dia (envia para Restauração)"
                      >
                        Limpar Tudo
                      </button>
                    )}
                    {itensConsolidados.length > 0 && (
                      <button
                        onClick={() => copiarRoteiro(diaSemana, roteirosDoDia)}
                        className="bg-purple-500 text-white px-3 py-1.5 rounded-md font-semibold hover:bg-purple-600 transition-colors text-xs flex items-center gap-1"
                        title="Copiar todos os roteiros para colar em outro dia"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                        </svg>
                        Copiar Todos
                      </button>
                    )}
                    {roteiroCopiado && roteiroCopiado.roteiros.length > 0 && roteiroCopiado.roteiros.some((r) => r.itens.length > 0) && (
                      <button
                        onClick={() => colarRoteiro(diaSemana)}
                        disabled={colando !== null || diaSemana === roteiroCopiado.diaOrigem}
                        className="bg-indigo-500 text-white px-3 py-1.5 rounded-md font-semibold hover:bg-indigo-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-xs flex items-center gap-1"
                        title={diaSemana === roteiroCopiado.diaOrigem ? 'Não é possível colar no mesmo dia' : `Colar roteiro de ${roteiroCopiado.diaOrigem}`}
                      >
                        {colando === diaSemana ? (
                          <div className="animate-spin rounded-full h-3 w-3 border-t-2 border-b-2 border-white"></div>
                        ) : (
                          <>
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                            </svg>
                            Colar Tudo
                          </>
                        )}
                      </button>
                    )}
                    <button
                      onClick={() => handleImportarExcel(diaSemana)}
                      disabled={importando}
                      className="bg-secondary-500 text-white px-3 py-1.5 rounded-md font-semibold hover:bg-secondary-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-xs flex items-center gap-1"
                      title="Importar Excel para este dia"
                    >
                      {importando ? (
                        <>
                          <div className="animate-spin rounded-full h-3 w-3 border-t-2 border-b-2 border-white"></div>
                        </>
                      ) : (
                        <>
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                          </svg>
                          Importar
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>

              {/* Conteúdo expandível */}
              {estaExpandido && (
                <div className="border-t border-gray-200 p-4">
                  {/* Slots de Roteiros em Grid */}
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {(() => {
                    const numSlots = slotsPorDia.get(diaSemana) || 3
                    const slots = []
                    
                    for (let i = 0; i < numSlots; i++) {
                      const roteiroSlot = roteirosDoDia[i]
                      const itensSlot = roteiroSlot?.itens || []
                      
                      slots.push(
                        <div key={i} className="border border-gray-200 rounded-lg overflow-hidden bg-white shadow-sm">
                          {/* Cabeçalho do Slot */}
                          <div className="bg-gray-50 px-3 py-2">
                            <div className="flex justify-between items-center mb-1">
                              <div className="flex items-center gap-2 min-w-0 flex-1">
                                <span className="text-sm text-gray-500 shrink-0">
                                  {roteiroSlot && itensSlot.length > 0 && slotRoteiroExpandido.has(String(roteiroSlot.id)) ? '▼' : '▶'}
                                </span>
                                {roteiroSlot ? (
                                  <span className="font-semibold text-gray-800 dark:text-gray-200 text-sm truncate">
                                    {nomeExibicaoRoteiro(roteiroSlot.observacoes, i) || `Roteiro ${i + 1}`}
                                  </span>
                                ) : (
                                  <>
                                    <span className="font-semibold text-gray-800 dark:text-gray-200 text-sm truncate">
                                      {nomeSlotVazio[`${diaSemana}_${i}`] ?? `Roteiro ${i + 1}`}
                                    </span>
                                    <button
                                      type="button"
                                      onClick={(e) => {
                                        e.stopPropagation()
                                        setModalNomeSlotVazio({
                                          diaSemana,
                                          slotIndex: i,
                                          nomeAtual: nomeSlotVazio[`${diaSemana}_${i}`] ?? `Roteiro ${i + 1}`,
                                        })
                                      }}
                                      className="text-gray-500 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200 p-1 shrink-0 transition-colors ml-1"
                                      title="Editar nome do roteiro"
                                    >
                                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                                      </svg>
                                    </button>
                                  </>
                                )}
                                {roteiroSlot && itensSlot.length > 0 && (
                                  <span className="text-xs text-gray-600 shrink-0">
                                    ({itensSlot.length} item{itensSlot.length !== 1 ? 's' : ''})
                                  </span>
                                )}
                              </div>
                                {roteiroSlot && (
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    setModalRenomear({
                                      roteiro: roteiroSlot,
                                      novoNome: nomeExibicaoRoteiro(roteiroSlot.observacoes, i),
                                      slotIndex: i
                                    })
                                  }}
                                  className="text-gray-500 hover:text-gray-800 p-1 shrink-0 transition-colors"
                                  title="Renomear roteiro"
                                >
                                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                                  </svg>
                                </button>
                              )}
                            </div>
                            <div className="flex gap-1 flex-wrap" onClick={(e) => e.stopPropagation()}>
                              {slotCopiado?.roteiro?.itens && slotCopiado.roteiro.itens.length > 0 && (
                                <button
                                  onClick={() => colarNoSlot(diaSemana, i, roteiroSlot)}
                                  disabled={
                                    colandoNoSlot === `${diaSemana}_${i}` ||
                                    roteiroSlot?.id === slotCopiado.roteiro.id
                                  }
                                  className="bg-indigo-500 text-white px-2 py-1 rounded text-xs font-semibold hover:bg-indigo-600 disabled:opacity-50 disabled:cursor-not-allowed"
                                  title={roteiroSlot?.id === slotCopiado.roteiro.id ? 'Não é possível colar no mesmo roteiro' : `Colar roteiro de ${slotCopiado.diaOrigem}`}
                                >
                                  {colandoNoSlot === `${diaSemana}_${i}` ? (
                                    <span className="inline-block w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                  ) : (
                                    'Colar'
                                  )}
                                </button>
                              )}
                              {roteiroSlot ? (
                                <>
                                  {itensSlot.length > 0 ? (
                                    <Link
                                      href={`/roteiros/${roteiroSlot.id}/editar`}
                                      className="bg-blue-500 text-white px-2 py-1 rounded text-xs font-semibold hover:bg-blue-600"
                                    >
                                      Editar
                                    </Link>
                                  ) : (
                                    <Link
                                      href={`/roteiros/novo?dia=${encodeURIComponent(diaSemana)}&periodo=${periodoSelecionado}&data=${format(addDays(startOfWeek(dataSelecionada, { weekStartsOn: 1 }), DIAS_SEMANA.indexOf(diaSemana)), 'yyyy-MM-dd')}&slot=${i + 1}`}
                                      className="bg-primary-500 text-white px-2 py-1 rounded text-xs font-semibold hover:bg-primary-600"
                                    >
                                      + Adicionar
                                    </Link>
                                  )}
                                  {itensSlot.length > 0 && (
                                    <>
                                      <button
                                        onClick={() => copiarSlot(roteiroSlot, diaSemana, i)}
                                        className="bg-purple-500 text-white px-2 py-1 rounded text-xs font-semibold hover:bg-purple-600"
                                        title="Copiar este roteiro"
                                      >
                                        Copiar
                                      </button>
                                      <button
                                        onClick={() => {
                                          const inicioSemana = startOfWeek(dataSelecionada, { weekStartsOn: 1 })
                                          const dataDia = format(addDays(inicioSemana, DIAS_SEMANA.indexOf(diaSemana)), 'dd/MM/yyyy')
                                          const totaisPorPao = itensSlot.reduce((acc, item) => {
                                            const nome = item.produto_nome || `ID: ${item.produto_id}`
                                            acc[nome] = (acc[nome] || 0) + Number(item.quantidade)
                                            return acc
                                          }, {} as Record<string, number>)
                                          const totaisOrdenados = Object.entries(totaisPorPao).sort((a, b) => a[0].localeCompare(b[0])) as [string, number][]
                                          const totalGeral = totaisOrdenados.reduce((sum, [, qtd]) => sum + qtd, 0)
                                          setModalImpressaoRoteiro({
                                            nomeRoteiro: nomeExibicaoRoteiro(roteiroSlot.observacoes, i) || `Roteiro ${i + 1}`,
                                            diaSemana,
                                            dataDia,
                                            itens: itensSlot,
                                            totaisOrdenados,
                                            totalGeral,
                                          })
                                          setTamanhoRoteiroModal(100)
                                        }}
                                        className="bg-gray-500 text-white px-2 py-1 rounded text-xs font-semibold hover:bg-gray-600"
                                        title="Imprimir este roteiro"
                                      >
                                        Imprimir
                                      </button>
                                      <button
                                        onClick={() => {
                                          const inicioSemana = startOfWeek(dataSelecionada, { weekStartsOn: 1 })
                                          const dataDia = format(addDays(inicioSemana, DIAS_SEMANA.indexOf(diaSemana)), 'dd/MM/yyyy')
                                          const periodoLabel = periodoSelecionado === 'manha' ? 'Manhã' : 'Noite'
                                          const empresas = Array.from(
                                            new Set(
                                              (itensSlot || [])
                                                .map((item) => (item.observacao || '').trim())
                                                .filter((e) => !!e && e !== 'Sem empresa')
                                            )
                                          ).sort((a, b) => a.localeCompare(b, 'pt-BR', { sensitivity: 'base' }))

                                          if (empresas.length === 0) {
                                            toast.error('Não foi possível identificar empresas nos pedidos')
                                            return
                                          }

                                          setModalGerarRomaneios({
                                            nomeRoteiro: nomeExibicaoRoteiro(roteiroSlot.observacoes, i) || `Roteiro ${i + 1}`,
                                            diaSemana,
                                            dataDia,
                                            periodoLabel,
                                            itens: itensSlot,
                                            empresas,
                                            selecionadas: empresas,
                                          })
                                        }}
                                        className="bg-amber-600 text-white px-2 py-1 rounded text-xs font-semibold hover:bg-amber-700"
                                        title="Gerar um romaneio por empresa (igual aos roteiros de motorista)"
                                      >
                                        📄 Gerar Romaneios
                                      </button>
                                      <button
                                        onClick={() => {
                                          setConfirmModal({
                                            open: true,
                                            title: 'Limpar roteiro',
                                            message: 'Limpar este roteiro? O roteiro será enviado para Restauração.',
                                            onConfirm: async () => {
                                              try {
                                                await roteiroApi.deletar(roteiroSlot.id)
                                                await carregarRoteiros(false)
                                                toast.success('Roteiro enviado para Restauração!')
                                                setConfirmModal(null)
                                              } catch {
                                                toast.error('Erro ao limpar')
                                                throw new Error('Erro ao limpar')
                                              }
                                            },
                                          })
                                        }}
                                        className="bg-red-500 text-white px-2 py-1 rounded text-xs font-semibold hover:bg-red-600"
                                        title="Limpar roteiro (envia para Restauração)"
                                      >
                                        Limpar
                                      </button>
                                    </>
                                  )}
                                  <button
                                    onClick={() => {
                                      setConfirmModal({
                                        open: true,
                                        title: 'Excluir roteiro',
                                        message: 'Excluir este roteiro? O roteiro será enviado para Restauração.',
                                        onConfirm: async () => {
                                          try {
                                            await roteiroApi.deletar(roteiroSlot.id)
                                            await carregarRoteiros(false)
                                            toast.success('Roteiro enviado para Restauração!')
                                            setConfirmModal(null)
                                          } catch {
                                            toast.error('Erro ao excluir')
                                            throw new Error('Erro ao excluir')
                                          }
                                        },
                                      })
                                    }}
                                    className="bg-red-700 text-white px-2 py-1 rounded text-xs font-semibold hover:bg-red-800"
                                    title="Excluir roteiro (envia para Restauração)"
                                  >
                                    Excluir
                                  </button>
                                </>
                              ) : (
                                <Link
                                  href={`/roteiros/novo?dia=${encodeURIComponent(diaSemana)}&periodo=${periodoSelecionado}&data=${format(addDays(startOfWeek(dataSelecionada, { weekStartsOn: 1 }), DIAS_SEMANA.indexOf(diaSemana)), 'yyyy-MM-dd')}&slot=${i + 1}&nome=${encodeURIComponent((nomeSlotVazio[`${diaSemana}_${i}`] ?? `Roteiro ${i + 1}`).trim())}`}
                                  className="bg-primary-500 text-white px-2 py-1 rounded text-xs font-semibold hover:bg-primary-600"
                                >
                                  + Adicionar
                                </Link>
                              )}
                            </div>
                          </div>
                          
                          {/* Conteúdo do Slot - clique na área para mostrar/ocultar itens */}
                          <div className="p-3">
                            {roteiroSlot && itensSlot.length > 0 ? (
                              slotRoteiroExpandido.has(String(roteiroSlot.id)) ? (
                                <>
                                  <button
                                    type="button"
                                    onClick={() => toggleExpandirItensRoteiro(roteiroSlot.id)}
                                    className="text-xs font-bold text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 mb-2 block text-center"
                                  >
                                    Clique aqui para ocultar roteiro
                                  </button>
                                <table className="w-full text-sm">
                                  <thead className="bg-gray-100">
                                    <tr>
                                      <th className="px-2 py-1 text-left text-xs font-semibold text-gray-600">Empresa</th>
                                      <th className="px-2 py-1 text-left text-xs font-semibold text-gray-600">Pão</th>
                                      <th className="px-2 py-1 text-center text-xs font-semibold text-gray-600">Qtd</th>
                                    </tr>
                                  </thead>
                                  <tbody className="divide-y divide-gray-100">
                                    {itensSlot
                                      .slice()
                                      .sort((a, b) => {
                                        const empA = (a.observacao || '').trim()
                                        const empB = (b.observacao || '').trim()
                                        const cmpEmp = empA.localeCompare(empB, 'pt-BR', { sensitivity: 'base' })
                                        if (cmpEmp !== 0) return cmpEmp
                                        const nomeA = `${a.produto_nome || ''}${a.recheio ? ` ${a.recheio}` : ''}${a.opcao_relatorio ? ` ${opcaoRelatorioParaLabel(a.opcao_relatorio)}` : ''}`
                                        const nomeB = `${b.produto_nome || ''}${b.recheio ? ` ${b.recheio}` : ''}${b.opcao_relatorio ? ` ${opcaoRelatorioParaLabel(b.opcao_relatorio)}` : ''}`
                                        return nomeA.localeCompare(nomeB, 'pt-BR', { sensitivity: 'base' })
                                      })
                                      .map((item, idx) => (
                                        <tr key={idx}>
                                          <td className="px-2 py-1 text-gray-900 text-xs">{item.observacao || '-'}</td>
                                          <td className="px-2 py-1 text-gray-900 text-xs">
                                            {item.produto_nome || `ID: ${item.produto_id}`}
                                            {item.recheio ? ` ${item.recheio}` : ''}
                                            {item.opcao_relatorio ? ` ${opcaoRelatorioParaLabel(item.opcao_relatorio)}` : ''}
                                          </td>
                                          <td className="px-2 py-1 text-center font-semibold text-xs">{item.quantidade}</td>
                                        </tr>
                                      ))}
                                  </tbody>
                                </table>
                                </>
                              ) : (
                                <button
                                  type="button"
                                  onClick={() => toggleExpandirItensRoteiro(roteiroSlot.id)}
                                  className="w-full py-6 rounded-lg border-2 border-dashed border-gray-300 hover:border-primary-500 hover:bg-primary-50/50 dark:border-gray-600 dark:hover:border-primary-500 dark:hover:bg-primary-900/20 transition-colors cursor-pointer"
                                >
                                  <span className="text-sm font-semibold text-gray-600 dark:text-gray-400 hover:text-primary-600 dark:hover:text-primary-400">
                                    CLIQUE AQUI PARA MOSTRAR ROTEIRO
                                  </span>
                                </button>
                              )
                            ) : (
                              <div className="text-center py-6 text-gray-400 text-sm">
                                <div className="mb-2 text-2xl">📋</div>
                                Roteiro vazio
                              </div>
                            )}
                          </div>
                        </div>
                      )
                    }
                    
                    return slots
                  })()}
                  </div>
                  
                  {/* Botão para adicionar mais slots */}
                  <div className="text-center mt-4">
                    <button
                      onClick={() => adicionarSlot(diaSemana)}
                      className="bg-gray-100 text-gray-700 px-4 py-2 rounded-lg font-semibold hover:bg-gray-200 transition-colors text-sm inline-flex items-center gap-2"
                    >
                      <span className="text-lg">+</span> Adicionar mais um roteiro
                    </button>
                  </div>

                  {/* Totais por Tipo de Pão - Oculto na visualização, mantido para impressão */}
                  {/* Os dados de totaisPorPao continuam disponíveis para uso na impressão */}
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* Modal de Renomear Roteiro */}
      {modalGerarRomaneios && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-2xl w-full p-6">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100 mb-1">Gerar Romaneios</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                  Selecione as empresas para gerar os romaneios do roteiro <strong>{modalGerarRomaneios.nomeRoteiro}</strong>.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setModalGerarRomaneios(null)}
                className="px-2 py-1 rounded-lg bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                title="Fechar"
              >
                ✕
              </button>
            </div>

            <div className="flex gap-3 flex-wrap items-center mb-4">
              <button
                type="button"
                onClick={() =>
                  setModalGerarRomaneios((prev) =>
                    prev ? { ...prev, selecionadas: prev.empresas.slice() } : prev
                  )
                }
                className="px-3 py-2 bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200 rounded-lg font-semibold hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors text-sm"
              >
                Selecionar todos
              </button>
              <button
                type="button"
                onClick={() =>
                  setModalGerarRomaneios((prev) =>
                    prev ? { ...prev, selecionadas: [] } : prev
                  )
                }
                className="px-3 py-2 bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200 rounded-lg font-semibold hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors text-sm"
              >
                Limpar
              </button>

              <div className="text-xs text-gray-500 dark:text-gray-400">
                {modalGerarRomaneios.selecionadas.length} selecionada(s) de {modalGerarRomaneios.empresas.length}
              </div>
            </div>

            <div className="max-h-[52vh] overflow-auto border border-gray-200 dark:border-gray-700 rounded-lg p-3 bg-gray-50 dark:bg-gray-900/20">
              {modalGerarRomaneios.empresas.length === 0 ? (
                <div className="text-sm text-gray-600 dark:text-gray-400">
                  Nenhuma empresa identificada nos itens.
                </div>
              ) : (
                <div className="space-y-2">
                  {modalGerarRomaneios.empresas.map((empresa) => {
                    const checked = modalGerarRomaneios.selecionadas.includes(empresa)
                    return (
                      <label
                        key={empresa}
                        className="flex items-center gap-2 text-sm select-none cursor-pointer"
                      >
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={(e) => {
                            const shouldSelect = e.target.checked
                            setModalGerarRomaneios((prev) => {
                              if (!prev) return prev
                              const atual = prev.selecionadas
                              return {
                                ...prev,
                                selecionadas: shouldSelect
                                  ? Array.from(new Set([...atual, empresa]))
                                  : atual.filter((x) => x !== empresa),
                              }
                            })
                          }}
                        />
                        <span className="text-gray-800 dark:text-gray-200">{empresa}</span>
                      </label>
                    )
                  })}
                </div>
              )}
            </div>

            <div className="flex gap-3 justify-end mt-6">
              <button
                type="button"
                onClick={() => setModalGerarRomaneios(null)}
                className="px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg font-semibold hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={modalGerarRomaneios.selecionadas.length === 0}
                onClick={() => {
                  const selecionadasSet = new Set(modalGerarRomaneios.selecionadas)
                  const itensFiltrados = modalGerarRomaneios.itens.filter((item) => {
                    const empresa = (item.observacao || '').trim()
                    return selecionadasSet.has(empresa)
                  })

                  if (itensFiltrados.length === 0) {
                    toast.error('Selecione ao menos uma empresa com itens')
                    return
                  }

                  gerarRomaneiosPorEmpresaProducao(
                    modalGerarRomaneios.nomeRoteiro,
                    modalGerarRomaneios.diaSemana,
                    modalGerarRomaneios.dataDia,
                    modalGerarRomaneios.periodoLabel,
                    itensFiltrados
                  )
                  setModalGerarRomaneios(null)
                }}
                className="px-4 py-2 bg-amber-600 text-white rounded-lg font-semibold hover:bg-amber-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Gerar
              </button>
            </div>
          </div>
        </div>
      )}
      {modalRenomear && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full p-6">
            <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100 mb-4">Renomear Roteiro</h3>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
              Digite um nome personalizado para identificar este roteiro:
            </p>
            <input
              type="text"
              value={modalRenomear.novoNome}
              onChange={(e) => setModalRenomear({ ...modalRenomear, novoNome: e.target.value })}
              placeholder="Ex: Lote 1, Manhã, Primeira Fornada..."
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent text-gray-900 dark:text-gray-100 bg-white dark:bg-gray-700 mb-4"
              autoFocus
            />
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setModalRenomear(null)}
                className="px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg font-semibold hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                disabled={salvandoNome}
              >
                Cancelar
              </button>
              <button
                onClick={renomearRoteiro}
                disabled={salvandoNome}
                className="px-4 py-2 bg-primary-500 text-white rounded-lg font-semibold hover:bg-primary-600 transition-colors disabled:opacity-50 flex items-center gap-2"
              >
                {salvandoNome ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-white"></div>
                    Salvando...
                  </>
                ) : (
                  'Salvar'
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal para editar nome do slot vazio (antes de adicionar itens) */}
      {modalNomeSlotVazio && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full p-6">
            <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100 mb-4">Editar nome do roteiro</h3>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
              Digite o nome que este roteiro terá quando você adicionar itens:
            </p>
            <input
              type="text"
              value={modalNomeSlotVazio.nomeAtual}
              onChange={(e) => setModalNomeSlotVazio({ ...modalNomeSlotVazio, nomeAtual: e.target.value })}
              placeholder="Ex: Roteiro 3, Lote Manhã..."
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent text-gray-900 dark:text-gray-100 bg-white dark:bg-gray-700 mb-4"
              autoFocus
            />
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setModalNomeSlotVazio(null)}
                className="px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg font-semibold hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={() => {
                  const key = `${modalNomeSlotVazio.diaSemana}_${modalNomeSlotVazio.slotIndex}`
                  setNomeSlotVazio((prev) => ({ ...prev, [key]: modalNomeSlotVazio.nomeAtual.trim() || `Roteiro ${modalNomeSlotVazio.slotIndex + 1}` }))
                  setModalNomeSlotVazio(null)
                }}
                className="px-4 py-2 bg-primary-500 text-white rounded-lg font-semibold hover:bg-primary-600 transition-colors"
              >
                Salvar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de pré-visualização para imprimir roteiro (aumentar/diminuir tamanho) */}
      {modalImpressaoRoteiro && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-5xl w-full max-h-[90vh] flex flex-col">
            <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between flex-wrap gap-2">
              <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100">Pré-visualização - Imprimir roteiro</h3>
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-600 dark:text-gray-400">Tamanho:</span>
                <button
                  type="button"
                  onClick={() => setTamanhoRoteiroModal((s) => Math.max(70, s - 10))}
                  className="w-9 h-9 rounded-lg bg-gray-200 dark:bg-gray-600 text-gray-800 dark:text-gray-200 font-bold hover:bg-gray-300 dark:hover:bg-gray-500 transition-colors"
                  title="Diminuir tamanho"
                >
                  −
                </button>
                <span className="text-sm font-semibold text-gray-900 dark:text-gray-100 min-w-[3rem] text-center">
                  {tamanhoRoteiroModal}%
                </span>
                <button
                  type="button"
                  onClick={() => setTamanhoRoteiroModal((s) => Math.min(180, s + 10))}
                  className="w-9 h-9 rounded-lg bg-gray-200 dark:bg-gray-600 text-gray-800 dark:text-gray-200 font-bold hover:bg-gray-300 dark:hover:bg-gray-500 transition-colors"
                  title="Aumentar tamanho"
                >
                  +
                </button>
              </div>
            </div>
            <div className="flex-1 overflow-auto p-6 bg-gray-50 dark:bg-gray-900">
              <div
                style={{
                  transform: `scale(${tamanhoRoteiroModal / 100})`,
                  transformOrigin: 'top center',
                  transition: 'transform 0.2s ease-out',
                }}
              >
                <div className="bg-white dark:bg-gray-800 rounded-lg p-4 shadow-inner max-w-4xl mx-auto">
                <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 border-b-2 border-primary-600 pb-2 mb-4 text-center">
                  Roteiro de Entregas
                </h1>
                <div className="mb-4 p-3 bg-gray-100 dark:bg-gray-700 rounded text-base sm:text-lg text-gray-800 dark:text-gray-200 text-center leading-relaxed">
                  <p className="m-0">
                    <strong>Roteiro:</strong> {modalImpressaoRoteiro.nomeRoteiro}
                    <span aria-hidden="true"> &nbsp;•&nbsp; </span>
                    <strong>Dia:</strong> {modalImpressaoRoteiro.diaSemana}
                    <span aria-hidden="true"> &nbsp;•&nbsp; </span>
                    <strong>Data:</strong> {modalImpressaoRoteiro.dataDia}
                    <span aria-hidden="true"> &nbsp;•&nbsp; </span>
                    <strong>Período:</strong> {periodoSelecionado === 'manha' ? 'Manhã' : 'Noite'}
                  </p>
                </div>
                <table className="w-full border-collapse border border-gray-300 dark:border-gray-600 text-base md:text-lg">
                  <thead>
                    <tr className="bg-primary-600 text-white">
                      <th className="border border-gray-300 dark:border-gray-600 p-3 text-left">Empresa</th>
                      <th className="border border-gray-300 dark:border-gray-600 p-3 text-left">Pão</th>
                      <th className="border border-gray-300 dark:border-gray-600 p-3 text-left">Quantidade</th>
                    </tr>
                  </thead>
                  <tbody>
                    {modalImpressaoRoteiro.itens.map((item, idx) => (
                      <tr key={idx} className="border-b border-gray-200 dark:border-gray-600">
                        <td className="border border-gray-300 dark:border-gray-600 p-3">{item.observacao || '-'}</td>
                        <td className="border border-gray-300 dark:border-gray-600 p-3">{item.produto_nome || `ID: ${item.produto_id}`}{item.recheio ? ` ${item.recheio}` : ''}{item.opcao_relatorio ? ` ${opcaoRelatorioParaLabel(item.opcao_relatorio)}` : ''}</td>
                        <td className="border border-gray-300 dark:border-gray-600 p-3">{item.quantidade}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <div className="mt-4 p-3 bg-gray-100 dark:bg-gray-700 rounded">
                  <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-2 text-base">Total de pães por tipo</h3>
                  <table className="w-full border-collapse text-base">
                    <thead>
                      <tr>
                        <th className="border border-gray-300 dark:border-gray-600 p-2 text-left">Pão</th>
                        <th className="border border-gray-300 dark:border-gray-600 p-2 text-right">Quantidade</th>
                      </tr>
                    </thead>
                    <tbody>
                      {modalImpressaoRoteiro.totaisOrdenados.map(([pao, qtd]) => (
                        <tr key={pao}>
                          <td className="border border-gray-300 dark:border-gray-600 p-2">{pao}</td>
                          <td className="border border-gray-300 dark:border-gray-600 p-2 text-right font-semibold">{qtd}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  <div className="mt-2 py-3 bg-primary-600 text-white text-center font-bold rounded text-base">
                    Total geral: {modalImpressaoRoteiro.totalGeral} unidade{modalImpressaoRoteiro.totalGeral !== 1 ? 's' : ''}
                  </div>
                </div>
              </div>
            </div>
            </div>
            <div className="p-4 border-t border-gray-200 dark:border-gray-700 flex gap-3 justify-end">
              <button
                type="button"
                onClick={() => setModalImpressaoRoteiro(null)}
                className="px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg font-semibold hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
              >
                Fechar
              </button>
              <button
                type="button"
                onClick={() => {
                  imprimirSlot(
                    modalImpressaoRoteiro.nomeRoteiro,
                    modalImpressaoRoteiro.diaSemana,
                    modalImpressaoRoteiro.dataDia,
                    modalImpressaoRoteiro.itens,
                    'roteiro',
                    tamanhoRoteiroModal
                  )
                  setModalImpressaoRoteiro(null)
                }}
                className="px-4 py-2 bg-primary-500 text-white rounded-lg font-semibold hover:bg-primary-600 transition-colors"
              >
                Imprimir
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}