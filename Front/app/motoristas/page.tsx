'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { roteiroApi, produtoApi, motoristaApi, Produto, Roteiro, RoteiroItem, RoteiroItemResponse } from '@/lib/api'
import toast from 'react-hot-toast'
import { format, addDays, subDays, parseISO, startOfMonth, endOfMonth, eachDayOfInterval, startOfWeek, endOfWeek, getMonth, getYear, isSameDay, isToday } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import Loading from '@/components/Loading'
import { registrarClique } from '@/lib/audit'
import ConfirmModal from '@/components/ConfirmModal'
import { opcaoRelatorioParaLabel } from '@/lib/opcoesRelatorio'

const DIAS_SEMANA = [
  'Segunda-feira',
  'Terça-feira',
  'Quarta-feira',
  'Quinta-feira',
  'Sexta-feira',
  'Sábado',
  'Domingo'
]

const STORAGE_KEY_MOTORISTAS = 'motoristas_padaria'
const STORAGE_KEY_EMPRESAS = 'empresas_padaria'
const STORAGE_KEY_DATA_SELECIONADA_MOTORISTAS = 'data_selecionada_motoristas'
const STORAGE_KEY_SLOT_COPIADO_MOTORISTA = 'slot_copiado_motorista'

interface Motorista {
  nome: string
  periodo: 'matutino' | 'noturno' | ''
}

interface ItemMotorista {
  empresa: string
  pao: string
  quantidade: number
}

interface PedidoDisponivel {
  produto_id: number
  produto_nome: string
  quantidade: number
  observacao: string
  /** Chave única para distinguir pedidos iguais em roteiros diferentes */
  chaveUnica: string
}

interface RoteiroProducaoComPedidos {
  id: number
  nome: string
  observacoes?: string | null
  itens: PedidoDisponivel[]
}

export default function RoteirosMotoristasPage() {
  const [motoristas, setMotoristas] = useState<Motorista[]>([])
  const [roteiros, setRoteiros] = useState<Map<string, Roteiro[]>>(new Map())
  const [loading, setLoading] = useState(true)
  const [produtos, setProdutos] = useState<Produto[]>([])
  const [empresas, setEmpresas] = useState<string[]>([])
  const [motoristasExpandidos, setMotoristasExpandidos] = useState<Set<string>>(new Set())
  const [formulariosAbertos, setFormulariosAbertos] = useState<Set<string>>(new Set())
  const [slotParaAdicionar, setSlotParaAdicionar] = useState<Record<string, number>>({})
  const [salvandoMotorista, setSalvandoMotorista] = useState<string | null>(null)
  const [periodoSelecionado, setPeriodoSelecionado] = useState<'manha' | 'noite'>('manha')
  
  // Estado para data selecionada e calendário
  const [dataSelecionada, setDataSelecionada] = useState<Date>(() => {
    if (typeof window !== 'undefined') {
      const dataSalva = localStorage.getItem(STORAGE_KEY_DATA_SELECIONADA_MOTORISTAS)
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
  const [mostrarCalendario, setMostrarCalendario] = useState(false)
  const [mesCalendario, setMesCalendario] = useState<Date>(() => new Date())
  const [confirmModal, setConfirmModal] = useState<{
    open: boolean
    title: string
    message: string
    onConfirm: () => Promise<void>
  } | null>(null)
  const [slotCopiadoMotorista, setSlotCopiadoMotorista] = useState<{ roteiro: Roteiro; motoristaOrigem: string; slotOrigem: number } | null>(() => {
    if (typeof window !== 'undefined') {
      try {
        const salvo = localStorage.getItem(STORAGE_KEY_SLOT_COPIADO_MOTORISTA)
        if (salvo) {
          const parsed = JSON.parse(salvo)
          if (parsed?.roteiro?.id && parsed?.motoristaOrigem && Array.isArray(parsed?.roteiro?.itens)) {
            return parsed
          }
          localStorage.removeItem(STORAGE_KEY_SLOT_COPIADO_MOTORISTA)
        }
      } catch {
        localStorage.removeItem(STORAGE_KEY_SLOT_COPIADO_MOTORISTA)
      }
    }
    return null
  })
  const [colandoSlotMotorista, setColandoSlotMotorista] = useState<string | null>(null)
  
  // Salvar data selecionada no localStorage quando mudar
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem(STORAGE_KEY_DATA_SELECIONADA_MOTORISTAS, format(dataSelecionada, 'yyyy-MM-dd'))
    }
  }, [dataSelecionada])

  useEffect(() => {
    carregarDados()
  }, [dataSelecionada, periodoSelecionado])

  useEffect(() => {
    if (typeof window !== 'undefined' && slotCopiadoMotorista) {
      localStorage.setItem(STORAGE_KEY_SLOT_COPIADO_MOTORISTA, JSON.stringify(slotCopiadoMotorista))
    } else if (typeof window !== 'undefined' && !slotCopiadoMotorista) {
      localStorage.removeItem(STORAGE_KEY_SLOT_COPIADO_MOTORISTA)
    }
  }, [slotCopiadoMotorista])

  const itensSlotCopiadoMotorista = (): RoteiroItem[] =>
    (slotCopiadoMotorista?.roteiro?.itens?.map(item => ({
      produto_id: item.produto_id,
      quantidade: item.quantidade,
      observacao: item.observacao || undefined
    })) || [])

  const copiarSlotMotorista = (roteiro: Roteiro, motoristaNome: string, slotIndex: number) => {
    if (!roteiro.itens || roteiro.itens.length === 0) {
      toast.error('Não há itens para copiar neste roteiro')
      return
    }
    setSlotCopiadoMotorista({ roteiro, motoristaOrigem: motoristaNome, slotOrigem: slotIndex + 1 })
    toast.success(`Roteiro ${slotIndex + 1} de ${motoristaNome} copiado!`)
  }

  const colarSlotMotorista = async (motoristaDestino: string, slotIndex: number, roteiroExistente: Roteiro | undefined) => {
    if (!slotCopiadoMotorista || itensSlotCopiadoMotorista().length === 0) return
    if (roteiroExistente?.id === slotCopiadoMotorista.roteiro.id) {
      toast.error('Não é possível colar no mesmo roteiro')
      return
    }

    const chave = `${motoristaDestino}_${slotIndex}`
    setColandoSlotMotorista(chave)
    try {
      const dataFormatada = format(dataSelecionada, 'yyyy-MM-dd')
      const periodoFormatado = periodoSelecionado === 'manha' ? 'matutino' : 'noturno'
      const itensParaColar = itensSlotCopiadoMotorista()

      if (roteiroExistente) {
        await roteiroApi.atualizarItens(roteiroExistente.id, itensParaColar)
        toast.success(`Roteiro colado em ${roteiroExistente.observacoes || `Roteiro ${slotIndex + 1}`} de ${motoristaDestino}!`)
      } else {
        await roteiroApi.criar({
          nome_empresa: motoristaDestino,
          data_producao: dataFormatada,
          motorista: motoristaDestino,
          periodo: periodoFormatado,
          observacoes: `Roteiro ${slotIndex + 1}`,
          status: 'pendente' as const,
          itens: itensParaColar
        })
        toast.success(`Roteiro colado em ${motoristaDestino}!`)
      }
      await carregarRoteiros()
    } catch (error) {
      toast.error('Erro ao colar roteiro')
      console.error(error)
    } finally {
      setColandoSlotMotorista(null)
    }
  }

  const carregarDados = async () => {
    try {
      setLoading(true)
      await Promise.all([
        carregarMotoristas(),
        carregarRoteiros(),
        carregarProdutos(),
        carregarEmpresas()
      ])
    } catch (error) {
      console.error('Erro ao carregar dados:', error)
    } finally {
      setLoading(false)
    }
  }

  const carregarMotoristas = async () => {
    try {
      const motoristasBackend = await motoristaApi.listar()
      const motoristasApi: Motorista[] = motoristasBackend.map((m) => ({
        nome: m.nome,
        periodo: m.periodo
      }))

      const motoristasLocalStorage = localStorage.getItem(STORAGE_KEY_MOTORISTAS)
      let motoristasLocal: Motorista[] = []
      if (motoristasLocalStorage) {
        const dados = JSON.parse(motoristasLocalStorage)
        if (dados.length > 0 && typeof dados[0] === 'string') {
          motoristasLocal = dados.map((nome: string) => ({ nome, periodo: '' as const }))
        } else {
          motoristasLocal = dados
        }
      }

      const todosMotoristasMap = new Map<string, Motorista>()
      motoristasApi.forEach((m) => todosMotoristasMap.set(m.nome.toLowerCase(), m))
      motoristasLocal.forEach((m) => {
        if (!todosMotoristasMap.has(m.nome.toLowerCase())) {
          todosMotoristasMap.set(m.nome.toLowerCase(), m)
        }
      })

      const todosMotoristas = Array.from(todosMotoristasMap.values()).sort((a, b) =>
        a.nome.localeCompare(b.nome)
      )
      setMotoristas(todosMotoristas)
      localStorage.setItem(STORAGE_KEY_MOTORISTAS, JSON.stringify(todosMotoristas))
    } catch (error) {
      console.error('Erro ao carregar motoristas:', error)
      try {
        const motoristasSalvos = localStorage.getItem(STORAGE_KEY_MOTORISTAS)
        if (motoristasSalvos) {
          const dados = JSON.parse(motoristasSalvos)
          if (dados.length > 0 && typeof dados[0] === 'string') {
            const motoristasObjetos: Motorista[] = dados.map((nome: string) => ({
              nome,
              periodo: '' as const
            }))
            setMotoristas(motoristasObjetos)
          } else {
            setMotoristas(dados)
          }
        }
      } catch (localError) {
        console.error('Erro ao carregar motoristas do localStorage:', localError)
      }
    }
  }

  const carregarRoteiros = async () => {
    try {
      const data = await roteiroApi.listar({})
      const roteirosMap = new Map<string, Roteiro[]>()
      const roteirosPorMotorista = new Map<string, Roteiro[]>()
      
      // Formatar data filtro para comparação (usa dataSelecionada do calendário principal)
      const dataFormatada = format(dataSelecionada, 'yyyy-MM-dd')
      
      // Agrupar roteiros por motorista E filtrar por data e período
      for (const roteiro of data) {
        if (roteiro.motorista) {
          // Filtrar por data
          let dataRoteiro = roteiro.data_producao
          if (dataRoteiro) {
            if (dataRoteiro.includes('T')) {
              dataRoteiro = dataRoteiro.split('T')[0]
            } else if (dataRoteiro.includes(' ')) {
              dataRoteiro = dataRoteiro.split(' ')[0]
            }
          }
          const matchData = dataRoteiro === dataFormatada
          
          // Filtrar por período se o roteiro tiver período
          // Converter período selecionado para o formato do banco (matutino/noturno)
          const periodoFormatado = periodoSelecionado === 'manha' ? 'matutino' : 'noturno'
          let matchPeriodo = true
          if (roteiro.periodo) {
            matchPeriodo = roteiro.periodo === periodoFormatado
          }
          
          // Só incluir se corresponder à data e período selecionados
          if (matchData && matchPeriodo) {
          if (!roteirosPorMotorista.has(roteiro.motorista)) {
            roteirosPorMotorista.set(roteiro.motorista, [])
          }
          roteirosPorMotorista.get(roteiro.motorista)!.push(roteiro)
          }
        }
      }
      
      for (const [motorista, roteirosList] of Array.from(roteirosPorMotorista.entries())) {
        const roteirosCompletos = await Promise.all(
          roteirosList.map(async (roteiro: Roteiro) => {
            try {
              return await roteiroApi.buscar(roteiro.id)
            } catch {
              return roteiro
            }
          })
        )
        const extractSlot = (r: Roteiro) => {
          const m = String(r.observacoes || '').match(/Roteiro\s*(\d+)/i)
          return m ? parseInt(m[1], 10) : 999
        }
        roteirosCompletos.sort((a, b) => extractSlot(a) - extractSlot(b) || a.id - b.id)
        roteirosMap.set(motorista, roteirosCompletos)
      }
      
      setRoteiros(roteirosMap)
    } catch (error) {
      console.error('Erro ao carregar roteiros:', error)
    }
  }

  const carregarProdutos = async () => {
    try {
      const data = await produtoApi.listar()
      setProdutos(data.filter((p) => p.ativo))
    } catch (error) {
      console.error('Erro ao carregar produtos:', error)
    }
  }

  const carregarEmpresas = () => {
    try {
      const empresasSalvas = localStorage.getItem(STORAGE_KEY_EMPRESAS)
      if (empresasSalvas) {
        setEmpresas(JSON.parse(empresasSalvas))
      }
    } catch (error) {
      console.error('Erro ao carregar empresas:', error)
    }
  }

  const salvarEmpresa = (nomeEmpresa: string) => {
    if (!nomeEmpresa || nomeEmpresa.trim() === '') return
    
    const nomeLimpo = nomeEmpresa.trim()
    if (!empresas.includes(nomeLimpo)) {
      const novasEmpresas = [...empresas, nomeLimpo].sort()
      setEmpresas(novasEmpresas)
      localStorage.setItem(STORAGE_KEY_EMPRESAS, JSON.stringify(novasEmpresas))
    }
  }

  const toggleExpandirMotorista = (motorista: string) => {
    const novosExpandidos = new Set(motoristasExpandidos)
    if (novosExpandidos.has(motorista)) {
      novosExpandidos.delete(motorista)
    } else {
      novosExpandidos.add(motorista)
    }
    setMotoristasExpandidos(novosExpandidos)
  }

  const toggleFormulario = (motorista: string) => {
    const novosAbertos = new Set(formulariosAbertos)
    if (novosAbertos.has(motorista)) {
      novosAbertos.delete(motorista)
      setSlotParaAdicionar((prev) => {
        const next = { ...prev }
        delete next[motorista]
        return next
      })
    } else {
      novosAbertos.add(motorista)
    }
    setFormulariosAbertos(novosAbertos)
  }

  const abrirFormularioParaSlot = (motorista: string, slotIndex: number) => {
    setSlotParaAdicionar((prev) => ({ ...prev, [motorista]: slotIndex }))
    setFormulariosAbertos((prev) => new Set(Array.from(prev).concat(motorista)))
  }

  const getItensMotorista = (motorista: string): ItemMotorista[] => {
    const lista = roteiros.get(motorista) || []
    const itens: ItemMotorista[] = []
    lista.forEach((r) => {
      if (r.itens) {
        r.itens.forEach((item) => {
          itens.push({
            empresa: item.observacao || 'Sem empresa',
            pao: item.produto_nome || `Produto ID: ${item.produto_id}`,
            quantidade: Number(item.quantidade)
          })
        })
      }
    })
    return itens
  }

  if (loading) {
    return <Loading />
  }

  // Filtrar motoristas por período (motoristas sem período aparecem em ambos)
  const motoristasFiltrados = motoristas.filter((motorista) => {
    if (!motorista.periodo) return true
    if (periodoSelecionado === 'manha') return motorista.periodo === 'matutino'
    return motorista.periodo === 'noturno'
  })

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
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-2xl font-bold text-gray-900">Roteiros de Motoristas</h1>
        <Link
          href="/cadastro-motoristas"
          className="bg-gray-100 text-gray-700 px-4 py-2 text-sm rounded-lg font-semibold hover:bg-gray-200 transition-colors"
        >
          Gerenciar Motoristas
        </Link>
      </div>

      {/* Navegação de Data e Calendário */}
      <div className="bg-white rounded-lg shadow p-4 mb-4">
        <div className="flex flex-col md:flex-row items-center md:items-start gap-4">
          {/* Navegação com setas */}
          <div className="flex-1 w-full md:w-auto">
            <div className="flex flex-col items-center gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-gray-900">
                  {(() => {
                    const diasSemanaPT: Record<number, string> = {
                      0: 'Domingo', 1: 'Segunda-feira', 2: 'Terça-feira', 3: 'Quarta-feira',
                      4: 'Quinta-feira', 5: 'Sexta-feira', 6: 'Sábado'
                    }
                    return diasSemanaPT[dataSelecionada.getDay()]
                  })()}
                </div>
                <div className="text-xl font-semibold text-gray-700 mt-1">
                  {format(dataSelecionada, 'dd/MM/yyyy')}
                </div>
              </div>
              
              <div className="flex items-center gap-2 w-full">
                <button
                  onClick={() => {
                    const novaData = subDays(dataSelecionada, 1)
                    setDataSelecionada(novaData)
                    setMesCalendario(novaData)
                  }}
                  className="flex-1 min-w-0 px-2 py-2 text-sm bg-gray-100 text-gray-700 rounded-lg font-semibold hover:bg-gray-200 transition-colors"
                >
                  ← Anterior
                </button>
                <button
                  onClick={() => {
                    const hoje = new Date()
                    setDataSelecionada(hoje)
                    setMesCalendario(hoje)
                  }}
                  className="flex-1 min-w-0 px-2 py-2 text-sm bg-secondary-500 text-white rounded-lg font-semibold hover:bg-secondary-600 transition-colors"
                >
                  Hoje
                </button>
                <button
                  onClick={() => {
                    const novaData = addDays(dataSelecionada, 1)
                    setDataSelecionada(novaData)
                    setMesCalendario(novaData)
                  }}
                  className="flex-1 min-w-0 px-2 py-2 text-sm bg-gray-100 text-gray-700 rounded-lg font-semibold hover:bg-gray-200 transition-colors"
                >
                  Próximo →
                </button>
              </div>

              {/* Seleção de Período */}
              <div className="w-full">
                <label className="block text-xs font-semibold text-gray-700 mb-2 text-center">
                  Período
                </label>
                <div className="flex gap-2 w-full">
          <button
            onClick={() => setPeriodoSelecionado('manha')}
                    className={`flex-1 min-w-0 px-3 py-2 rounded-lg font-semibold transition-colors text-sm ${
              periodoSelecionado === 'manha'
                ? 'bg-primary-500 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
                    Manhã
          </button>
          <button
            onClick={() => setPeriodoSelecionado('noite')}
                    className={`flex-1 min-w-0 px-3 py-2 rounded-lg font-semibold transition-colors text-sm ${
              periodoSelecionado === 'noite'
                ? 'bg-primary-500 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
                    Noite
          </button>
                </div>
              </div>
            </div>
          </div>

          {/* Calendário Compacto */}
          <div className="relative">
            {/* Botão para abrir calendário */}
            <button
              onClick={() => setMostrarCalendario(!mostrarCalendario)}
              className="px-4 py-2 bg-primary-500 text-white rounded-lg font-semibold hover:bg-primary-600 transition-colors flex items-center gap-2"
            >
              Calendário
              <span className={`transform transition-transform ${mostrarCalendario ? 'rotate-180' : ''}`}>
                ▼
              </span>
            </button>

            {/* Calendário Expandido */}
            {mostrarCalendario && (
              <div className="absolute top-full right-0 mt-2 bg-white rounded-lg shadow-xl border border-gray-200 p-4 z-50 w-80">
                <div className="flex items-center justify-between mb-3">
                  <button
                    onClick={() => setMesCalendario(subDays(startOfMonth(mesCalendario), 1))}
                    className="px-2 py-1 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors font-semibold text-sm"
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
                    className="px-2 py-1 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors font-semibold text-sm"
                  >
                    →
                  </button>
                </div>

                {/* Dias da semana */}
                <div className="grid grid-cols-7 gap-1 mb-2">
                  {['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'].map((dia) => (
                    <div key={dia} className="text-center text-xs font-semibold text-gray-600 py-1">
                      {dia}
                    </div>
                  ))}
                </div>

                {/* Dias do calendário */}
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
                            ${!isMesAtual ? 'text-gray-300' : 'text-gray-900'}
                            ${isSelecionado 
                              ? 'bg-primary-500 text-white' 
                              : isHoje 
                                ? 'bg-secondary-500 text-white hover:bg-secondary-600' 
                                : 'hover:bg-gray-100'
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

      {motoristasFiltrados.length === 0 ? (
        <div className="bg-white rounded-lg shadow p-8 text-center">
          <h2 className="text-xl font-bold text-gray-900 mb-2">
            Nenhum motorista cadastrado
          </h2>
          <p className="text-gray-600 mb-6">
            Cadastre motoristas para começar
          </p>
          <Link
            href="/cadastro-motoristas"
            className="inline-block bg-primary-500 text-white px-6 py-3 rounded-lg font-semibold hover:bg-primary-600 transition-colors"
          >
            Cadastrar Motoristas
          </Link>
        </div>
      ) : (
        <>
          {slotCopiadoMotorista?.roteiro?.itens && slotCopiadoMotorista.roteiro.itens.length > 0 && (
            <div className="bg-purple-50 border border-purple-200 rounded-lg p-4 mb-6 flex items-center justify-between">
              <span className="text-purple-800 font-semibold">
                {slotCopiadoMotorista.roteiro.observacoes || `Roteiro ${slotCopiadoMotorista.slotOrigem}`} de <strong>{slotCopiadoMotorista.motoristaOrigem}</strong> copiado ({slotCopiadoMotorista.roteiro.itens.length} itens) — Clique em &quot;Colar&quot; no roteiro desejado
              </span>
              <button
                onClick={() => setSlotCopiadoMotorista(null)}
                className="text-purple-600 hover:text-purple-800 text-sm font-semibold underline"
              >
                Descartar cópia
              </button>
            </div>
          )}
        <div className="space-y-6">
          {motoristasFiltrados.map((motorista) => {
            const nomeMotorista = motorista.nome
            const roteirosMotorista = roteiros.get(nomeMotorista) || []
            const roteiroPrimeiro = roteirosMotorista[0]
            const itens = getItensMotorista(nomeMotorista)
            const estaExpandido = motoristasExpandidos.has(nomeMotorista)
            const formularioAberto = formulariosAbertos.has(nomeMotorista)

            return (
              <MotoristaCard
                key={nomeMotorista}
                motorista={motorista}
                roteiros={roteirosMotorista}
                roteiro={roteiroPrimeiro}
                itens={itens}
                produtos={produtos}
                empresas={empresas}
                estaExpandido={estaExpandido}
                formularioAberto={formularioAberto}
                salvando={salvandoMotorista === nomeMotorista}
                dataSelecionada={dataSelecionada}
                periodoSelecionado={periodoSelecionado}
                onToggleExpandir={() => toggleExpandirMotorista(nomeMotorista)}
                onToggleFormulario={() => toggleFormulario(nomeMotorista)}
                onAbrirAdicionarPedidos={(slotIndex) => abrirFormularioParaSlot(nomeMotorista, slotIndex)}
                slotParaAdicionar={slotParaAdicionar[nomeMotorista] ?? null}
                onSalvar={async (itens, slotIndex) => {
                  const roteiroParaSlot = slotIndex != null
                    ? roteirosMotorista.find((r) => {
                        const m = String(r.observacoes || '').match(/Roteiro\s*(\d+)/i)
                        return m ? parseInt(m[1], 10) === slotIndex + 1 : false
                      }) ?? roteirosMotorista[slotIndex]
                    : roteiroPrimeiro
                  registrarClique('Salvar', 'Motoristas', undefined, 'roteiro', roteiroParaSlot?.id, `Motorista: ${motorista.nome}, Itens: ${itens.length}`)
                  setSalvandoMotorista(nomeMotorista)
                  try {
                    await salvarRoteiroMotorista(nomeMotorista, itens, roteiroParaSlot, dataSelecionada, periodoSelecionado, slotIndex ?? 0)
                    await carregarRoteiros()
                    setFormulariosAbertos(new Set())
                    setSlotParaAdicionar({})
                    toast.success('Pedidos adicionados com sucesso!')
                  } catch (error) {
                    toast.error('Erro ao salvar pedidos')
                  } finally {
                    setSalvandoMotorista(null)
                  }
                }}
                onImprimir={() => {
                  registrarClique('Imprimir', 'Motoristas', undefined, 'roteiro', roteiroPrimeiro?.id, `Motorista: ${motorista.nome}`)
                  imprimirRoteiro(motorista, itens)
                }}
                onGerarRomaneios={(itensSlot) => {
                  const roteiroParaSlot = roteirosMotorista[0]
                  registrarClique('Gerar Romaneios', 'Motoristas', undefined, 'roteiro', roteiroParaSlot?.id, `Motorista: ${motorista.nome}, Empresas: ${new Set(itensSlot.map(i => i.empresa)).size}`)
                  gerarRomaneiosPorEmpresa(motorista, itensSlot, produtos)
                }}
                onCriarRoteiroSlot={async (slotIndex: number) => {
                  try {
                    const dataFormatada = format(dataSelecionada, 'yyyy-MM-dd')
                    const periodoFormatado = periodoSelecionado === 'manha' ? 'matutino' : 'noturno'
                    await roteiroApi.criar({
                      nome_empresa: motorista.nome,
                      data_producao: dataFormatada,
                      motorista: motorista.nome,
                      periodo: periodoFormatado,
                      observacoes: `Roteiro ${slotIndex + 1}`,
                      status: 'pendente' as const,
                      itens: []
                    })
                    toast.success(`Roteiro ${slotIndex + 1} criado! Adicione os itens.`)
                  } catch (error) {
                    toast.error('Erro ao criar roteiro')
                    throw error
                  }
                }}
                onRecarregar={carregarRoteiros}
                slotCopiado={slotCopiadoMotorista}
                colandoSlot={colandoSlotMotorista}
                onCopiarSlot={copiarSlotMotorista}
                onColarSlot={colarSlotMotorista}
                onLimpar={async () => {
                  const handleLimpar = async (): Promise<void> => {
                    try {
                      registrarClique('Limpar', 'Motoristas', undefined, 'roteiro', roteiroPrimeiro?.id, `Motorista: ${motorista.nome}, Data: ${format(dataSelecionada, 'dd/MM/yyyy')}`)
                      const dataFormatada = format(dataSelecionada, 'yyyy-MM-dd')
                      const periodoFormatado = periodoSelecionado === 'manha' ? 'matutino' : 'noturno'
                      const todosRoteiros = await roteiroApi.listar({})
                      const roteirosDoMotorista = todosRoteiros.filter((r) => {
                        if (!r.motorista || r.motorista !== nomeMotorista) return false
                        let dataRoteiro = r.data_producao
                        if (dataRoteiro) {
                          if (dataRoteiro.includes('T')) dataRoteiro = dataRoteiro.split('T')[0]
                          else if (dataRoteiro.includes(' ')) dataRoteiro = dataRoteiro.split(' ')[0]
                        }
                        const matchData = dataRoteiro === dataFormatada
                        const matchPeriodo = !r.periodo || r.periodo === periodoFormatado
                        return matchData && matchPeriodo
                      })
                      if (roteirosDoMotorista.length > 0) {
                        await Promise.all(
                          roteirosDoMotorista.map((r) => roteiroApi.atualizarItens(r.id, []))
                        )
                        await carregarRoteiros()
                        toast.success(`${roteirosDoMotorista.length} roteiro(s) limpo(s) com sucesso!`)
                        setConfirmModal(null)
                      } else {
                        toast('Nenhum roteiro encontrado para limpar')
                        setConfirmModal(null)
                      }
                    } catch (error) {
                      toast.error('Erro ao limpar roteiro')
                      console.error(error)
                      throw error
                    }
                  }
                  setConfirmModal({
                    open: true,
                    title: 'Limpar roteiro',
                    message: `Tem certeza que deseja limpar TODOS os pedidos do roteiro de ${motorista.nome} para ${format(dataSelecionada, 'dd/MM/yyyy')} (${periodoSelecionado === 'manha' ? 'Manhã' : 'Noite'})? Esta ação não pode ser desfeita.`,
                    onConfirm: async () => { await handleLimpar() }
                  })
                }}
              />
            )
          })}
        </div>
        </>
      )}
    </div>
  )
}

async function salvarRoteiroMotorista(
  nomeMotorista: string,
  novosItens: Array<{ nome_empresa: string; produto_id: number; quantidade: number }>,
  roteiroExistente: Roteiro | undefined,
  dataSelecionada: Date,
  periodoSelecionado: 'manha' | 'noite',
  slotIndex = 0
) {
  // Salvar empresas
  novosItens.forEach((item) => {
    if (item.nome_empresa) {
      const empresas = JSON.parse(localStorage.getItem(STORAGE_KEY_EMPRESAS) || '[]')
      if (!empresas.includes(item.nome_empresa)) {
        empresas.push(item.nome_empresa)
        localStorage.setItem(STORAGE_KEY_EMPRESAS, JSON.stringify(empresas))
      }
    }
  })

  const itensRoteiro: RoteiroItem[] = novosItens.map((item) => ({
    produto_id: item.produto_id,
    quantidade: item.quantidade,
    observacao: item.nome_empresa
  }))

  // Usar a data selecionada no calendário, não a data de hoje
  const dataFormatada = format(dataSelecionada, 'yyyy-MM-dd')
  const periodoFormatado = periodoSelecionado === 'manha' ? 'matutino' : 'noturno'

  if (roteiroExistente) {
    // Verificar se o roteiro existente corresponde à data e período selecionados
    let dataRoteiro = roteiroExistente.data_producao
    if (dataRoteiro) {
      if (dataRoteiro.includes('T')) {
        dataRoteiro = dataRoteiro.split('T')[0]
      } else if (dataRoteiro.includes(' ')) {
        dataRoteiro = dataRoteiro.split(' ')[0]
      }
    }
    
    // Se o roteiro existente não corresponde à data selecionada, criar um novo
    if (dataRoteiro !== dataFormatada || roteiroExistente.periodo !== periodoFormatado) {
      await roteiroApi.criar({
        nome_empresa: nomeMotorista,
        data_producao: dataFormatada,
        motorista: nomeMotorista,
        periodo: periodoFormatado,
        observacoes: `Roteiro ${slotIndex + 1}`,
        status: 'pendente' as const,
        itens: itensRoteiro
      })
    } else {
      // Adicionar novos itens aos existentes
      const itensExistentes: RoteiroItem[] = (roteiroExistente.itens || []).map((item) => ({
        produto_id: item.produto_id,
        quantidade: item.quantidade,
        observacao: item.observacao || undefined
      }))
      
      const todosItens = [...itensExistentes, ...itensRoteiro]
      await roteiroApi.atualizarItens(roteiroExistente.id, todosItens)
    }
  } else {
    await roteiroApi.criar({
      nome_empresa: nomeMotorista,
      data_producao: dataFormatada,
      motorista: nomeMotorista,
      periodo: periodoFormatado,
      observacoes: `Roteiro ${slotIndex + 1}`,
      status: 'pendente' as const,
      itens: itensRoteiro
    })
  }
}

function imprimirRoteiroProducao(
  roteiro: RoteiroProducaoComPedidos,
  dataFiltro: Date,
  periodoFiltro: 'manha' | 'noite'
) {
  const janelaImpressao = window.open('', '_blank')
  if (janelaImpressao) {
    janelaImpressao.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Roteiro - ${roteiro.nome}</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 8px; font-size: 11px; }
            h1 { color: #333; border-bottom: 2px solid #550701; padding-bottom: 4px; margin-bottom: 6px; font-size: 14px; }
            .info { margin: 6px 0; font-size: 10px; }
            table { width: 100%; border-collapse: collapse; margin: 6px 0; font-size: 10px; }
            th, td { border: 1px solid #ddd; padding: 3px 5px; text-align: left; }
            th { background-color: #550701; color: white; }
          </style>
        </head>
        <body>
          <h1>Roteiro de Entregas</h1>
          <div class="info">
            <p><strong>Roteiro:</strong> ${roteiro.nome}</p>
            <p><strong>Data:</strong> ${format(dataFiltro, 'dd/MM/yyyy')}</p>
            <p><strong>Período:</strong> ${periodoFiltro === 'manha' ? 'Manhã' : 'Noite'}</p>
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
              ${roteiro.itens.map((item) => `
                <tr>
                  <td>${item.observacao}</td>
                  <td>${item.produto_nome}</td>
                  <td>${item.quantidade}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </body>
      </html>
    `)
    janelaImpressao.document.close()
    janelaImpressao.print()
  }
}

function imprimirRoteiro(motorista: Motorista, itens: ItemMotorista[]) {
  const janelaImpressao = window.open('', '_blank')
  if (janelaImpressao) {
    janelaImpressao.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Roteiro - ${motorista.nome}</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 8px; font-size: 11px; }
            h1 { color: #333; border-bottom: 2px solid #550701; padding-bottom: 4px; margin-bottom: 6px; font-size: 14px; }
            .info { margin: 6px 0; font-size: 10px; }
            table { width: 100%; border-collapse: collapse; margin: 6px 0; font-size: 10px; }
            th, td { border: 1px solid #ddd; padding: 3px 5px; text-align: left; }
            th { background-color: #550701; color: white; }
          </style>
        </head>
        <body>
          <h1>Roteiro de Motorista</h1>
          <div class="info">
            <p><strong>Motorista:</strong> ${motorista.nome}</p>
            ${motorista.periodo ? `<p><strong>Período:</strong> ${motorista.periodo === 'matutino' ? 'Matutino' : 'Noturno'}</p>` : ''}
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
              ${itens.map((item) => `
                <tr>
                  <td>${item.empresa}</td>
                  <td>${item.pao}</td>
                  <td>${item.quantidade}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </body>
      </html>
    `)
    janelaImpressao.document.close()
    janelaImpressao.print()
  }
}

/**
 * Gera romaneios agrupados por empresa
 * Cada empresa diferente recebe um romaneio separado
 * Pedidos da mesma empresa são consolidados por produto
 */
function gerarRomaneiosPorEmpresa(motorista: Motorista, itens: ItemMotorista[], produtos: Produto[]) {
  if (!itens || itens.length === 0) {
    toast.error('Não há pedidos para gerar romaneios')
    return
  }

  // Agrupar itens por empresa
  // Cada empresa diferente terá seu próprio romaneio
  const pedidosPorEmpresa = new Map<string, Map<string, number>>()
  
  itens.forEach((item) => {
    const empresa = (item.empresa || 'Sem empresa').trim()
    
    // Ignorar empresas vazias
    if (!empresa || empresa === 'Sem empresa') {
      return
    }
    
    if (!pedidosPorEmpresa.has(empresa)) {
      pedidosPorEmpresa.set(empresa, new Map())
    }
    
    // Consolidar produtos da mesma empresa (soma quantidades se houver mesmo produto)
    const produtosEmpresa = pedidosPorEmpresa.get(empresa)!
    const produtoNome = item.pao
    const quantidadeAtual = produtosEmpresa.get(produtoNome) || 0
    produtosEmpresa.set(produtoNome, quantidadeAtual + item.quantidade)
  })

  // Obter lista de empresas únicas
  const empresas = Array.from(pedidosPorEmpresa.keys()).filter(emp => emp && emp !== 'Sem empresa')
  
  if (empresas.length === 0) {
    toast.error('Não foi possível identificar empresas nos pedidos')
    return
  }

  // Mostrar mensagem informativa
  console.log(`Total de empresas encontradas: ${empresas.length}`, empresas)
  console.log('Itens recebidos:', itens)
  
  toast.success(`Gerando ${empresas.length} romaneio(s) para ${empresas.length} empresa(s) diferente(s)...`, {
    duration: 3000
  })

  // Preparar HTML de todos os romaneios
  const romaneiosHTML = empresas.map((empresa, index) => {
    const produtosEmpresa = pedidosPorEmpresa.get(empresa)!
    const produtosArray = Array.from(produtosEmpresa.entries())
      .map(([produtoNome, quantidade]) => ({ produtoNome, quantidade }))
      .sort((a, b) => a.produtoNome.localeCompare(b.produtoNome))
    
    const totalGeral = produtosArray.reduce((sum, p) => sum + p.quantidade, 0)
    
    console.log(`[${index + 1}/${empresas.length}] Preparando romaneio para empresa: "${empresa}"`, {
      produtos: produtosArray,
      total: totalGeral
    })
    
    // Usar page-break-before para garantir que cada romaneio comece em uma nova página
    // Exceto o primeiro
    const pageBreakStyle = index === 0 ? '' : 'page-break-before: always;'
    
    return `
      <div class="romaneio-page" style="${pageBreakStyle} min-height: 100vh; display: flex; flex-direction: column; padding: 10px; box-sizing: border-box; font-size: 11px;">
        <div class="data" style="text-align: right; color: #666; margin-bottom: 8px; font-size: 10px;">
          <p><strong>Data de Emissão:</strong> ${format(new Date(), 'dd/MM/yyyy HH:mm')}</p>
        </div>
        <h1 style="color: #333; border-bottom: 2px solid #550701; padding-bottom: 4px; margin-bottom: 8px; font-size: 14px;">ROMANEIO DE PEDIDOS</h1>
        <div class="info" style="margin: 8px 0; padding: 8px; background-color: #f9f9f9; border-left: 4px solid #f3b125; font-size: 10px;">
          <p style="margin: 2px 0;"><strong>Empresa/Cliente:</strong> ${empresa}</p>
          <p style="margin: 2px 0;"><strong>Motorista:</strong> ${motorista.nome}</p>
          ${motorista.periodo ? `<p style="margin: 2px 0;"><strong>Período:</strong> ${motorista.periodo === 'matutino' ? 'Matutino' : 'Noturno'}</p>` : ''}
          <p style="margin: 2px 0;"><strong>Data de Emissão:</strong> ${format(new Date(), 'dd/MM/yyyy')}</p>
        </div>
        <table style="width: 100%; border-collapse: collapse; margin: 8px 0; font-size: 10px;">
          <thead>
            <tr>
              <th style="width: 60%; border: 1px solid #ddd; padding: 4px 6px; text-align: left; background-color: #550701; color: white; font-weight: bold;">Produto</th>
              <th style="width: 40%; border: 1px solid #ddd; padding: 4px 6px; text-align: left; background-color: #550701; color: white; font-weight: bold;">Quantidade</th>
            </tr>
          </thead>
          <tbody>
            ${produtosArray.map((pedido) => `
              <tr>
                <td style="border: 1px solid #ddd; padding: 4px 6px; text-align: left; background-color: #fff;">${pedido.produtoNome}</td>
                <td style="border: 1px solid #ddd; padding: 4px 6px; text-align: center; font-weight: bold; background-color: #fff;">${pedido.quantidade}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
        <div class="total" style="margin-top: 8px; padding: 8px; background-color: #550701; color: white; text-align: center; font-size: 12px; font-weight: bold;">
          Total Geral: ${totalGeral} unidades
        </div>
        <div style="margin-top: auto; padding-top: 30px; border-top: 2px solid #550701;">
          <div style="text-align: center;">
            <p style="margin-bottom: 25px; font-size: 11px;">_________________________________________</p>
            <p style="font-size: 11px; font-weight: bold;">Assinatura do Responsável pelo Recebimento</p>
            <p style="font-size: 10px; color: #666; margin-top: 2px;">Nome e Carimbo da Empresa</p>
          </div>
        </div>
      </div>
    `
  }).join('')

  // Abrir uma única janela com todos os romaneios (cada um em uma página separada)
  const janelaImpressao = window.open('', '_blank')
  
  if (!janelaImpressao) {
    toast.error('Não foi possível abrir janela de impressão. Verifique se pop-ups estão bloqueados.')
    return
  }
  
  janelaImpressao.document.write(`
<!DOCTYPE html>
<html>
  <head>
    <title>Romaneios - ${motorista.nome}</title>
    <meta charset="UTF-8">
    <style>
      * {
        margin: 0;
        padding: 0;
        box-sizing: border-box;
      }
      
      @media print {
        body {
          margin: 0;
          padding: 0;
        }
        
        .romaneio-page {
          page-break-after: always;
          page-break-inside: avoid;
          break-after: page;
          break-inside: avoid;
        }
        
        .romaneio-page:last-child {
          page-break-after: auto;
          break-after: auto;
        }
        
        table {
          page-break-inside: avoid;
          break-inside: avoid;
        }
        
        tr {
          page-break-inside: avoid;
          break-inside: avoid;
        }
      }
      
      @media screen {
        .romaneio-page {
          margin-bottom: 40px;
          border-bottom: 2px dashed #ccc;
          padding-bottom: 40px;
        }
      }
      
      body {
        font-family: Arial, sans-serif;
        margin: 0;
        padding: 0;
      }
    </style>
  </head>
  <body>
    ${romaneiosHTML}
  </body>
</html>
  `)
  
  janelaImpressao.document.close()
  
  // Aguardar um pouco antes de imprimir para garantir que o conteúdo foi carregado
  setTimeout(() => {
    janelaImpressao.focus()
    janelaImpressao.print()
    console.log(`Todos os ${empresas.length} romaneio(s) gerados com sucesso`)
  }, 500)
}

interface MotoristaCardProps {
  motorista: Motorista
  roteiros: Roteiro[]
  roteiro: Roteiro | undefined
  itens: ItemMotorista[]
  produtos: Produto[]
  empresas: string[]
  estaExpandido: boolean
  formularioAberto: boolean
  salvando: boolean
  dataSelecionada: Date
  periodoSelecionado: 'manha' | 'noite'
  onToggleExpandir: () => void
  onToggleFormulario: () => void
  onAbrirAdicionarPedidos: (slotIndex: number) => void
  slotParaAdicionar: number | null
  onSalvar: (itens: Array<{ nome_empresa: string; produto_id: number; quantidade: number }>, slotIndex?: number) => Promise<void>
  onImprimir: () => void
  onLimpar: () => Promise<void>
  onGerarRomaneios: (itens: ItemMotorista[]) => void
  onCriarRoteiroSlot: (slotIndex: number) => Promise<void>
  onRecarregar: () => Promise<void>
  slotCopiado: { roteiro: Roteiro; motoristaOrigem: string; slotOrigem: number } | null
  colandoSlot: string | null
  onCopiarSlot: (roteiro: Roteiro, motoristaNome: string, slotIndex: number) => void
  onColarSlot: (motoristaDestino: string, slotIndex: number, roteiroExistente: Roteiro | undefined) => Promise<void>
}

function MotoristaCard({
  motorista,
  roteiros,
  roteiro,
  itens,
  produtos,
  empresas,
  estaExpandido,
  formularioAberto,
  salvando,
  dataSelecionada,
  periodoSelecionado,
  onToggleExpandir,
  onToggleFormulario,
  onAbrirAdicionarPedidos,
  slotParaAdicionar,
  onSalvar,
  onImprimir,
  onLimpar,
  onGerarRomaneios,
  onCriarRoteiroSlot,
  onRecarregar,
  slotCopiado,
  colandoSlot,
  onCopiarSlot,
  onColarSlot
}: MotoristaCardProps) {
  const [roteirosProducao, setRoteirosProducao] = useState<RoteiroProducaoComPedidos[]>([])
  const [pedidosSelecionados, setPedidosSelecionados] = useState<Set<string>>(new Set())
  const [carregandoRoteiros, setCarregandoRoteiros] = useState(false)
  const [dataFiltroPedidos, setDataFiltroPedidos] = useState<Date>(dataSelecionada)
  const [mostrarCalendarioPedidos, setMostrarCalendarioPedidos] = useState(false)
  const [mesCalendarioPedidos, setMesCalendarioPedidos] = useState<Date>(dataSelecionada)
  const [periodoFiltroPedidos, setPeriodoFiltroPedidos] = useState<'manha' | 'noite'>(periodoSelecionado)
  /** Roteiros cujos itens estão expandidos (clicar no roteiro para ver itens). Por padrão todos fechados. */
  const [slotRoteiroExpandido, setSlotRoteiroExpandido] = useState<Set<string>>(new Set())
  /** No modal "Adicionar Pedidos", roteiros de produção expandidos (clicar no nome para ver itens). */
  const [roteirosProducaoModalExpandidos, setRoteirosProducaoModalExpandidos] = useState<Set<string>>(new Set())

  const toggleExpandirRoteiroProducaoModal = (roteiroId: number) => {
    const key = String(roteiroId)
    setRoteirosProducaoModalExpandidos((prev) => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  }

  const toggleExpandirItensRoteiro = (roteiroId: number) => {
    const key = String(roteiroId)
    setSlotRoteiroExpandido((prev) => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  }

  // Carregar roteiros de produção quando o modal abrir ou data/período mudar
  useEffect(() => {
    if (formularioAberto) {
      setDataFiltroPedidos(dataSelecionada)
      setMesCalendarioPedidos(dataSelecionada)
      setPeriodoFiltroPedidos(periodoSelecionado)
      setMostrarCalendarioPedidos(true)
      setPedidosSelecionados(new Set())
      carregarRoteirosProducao()
    } else {
      setMostrarCalendarioPedidos(false)
    }
  }, [formularioAberto])

  useEffect(() => {
    if (formularioAberto) {
      carregarRoteirosProducao()
    }
  }, [dataFiltroPedidos, periodoFiltroPedidos])

  const getChavePedido = (pedido: PedidoDisponivel) => pedido.chaveUnica

  const carregarRoteirosProducao = async () => {
    try {
      setCarregandoRoteiros(true)
      const todosRoteiros = await roteiroApi.listar({})
      const dataFormatada = format(dataFiltroPedidos, 'yyyy-MM-dd')

      const roteirosProducaoFiltrados = todosRoteiros.filter((r) => {
        const correspondeAoDia = DIAS_SEMANA.includes(r.nome_empresa)
        const naoEhMotorista = !r.motorista
        let dataRoteiro = r.data_producao
        if (dataRoteiro) {
          if (dataRoteiro.includes('T')) dataRoteiro = dataRoteiro.split('T')[0]
          else if (dataRoteiro.includes(' ')) dataRoteiro = dataRoteiro.split(' ')[0]
        }
        const correspondeAData = dataRoteiro === dataFormatada
        const periodoRoteiro = r.periodo || ''
        const correspondeAoPeriodo = periodoFiltroPedidos === 'manha'
          ? periodoRoteiro === 'manha'
          : periodoRoteiro === 'noite'
        return correspondeAoDia && naoEhMotorista && correspondeAData && correspondeAoPeriodo
      })

      if (roteirosProducaoFiltrados.length === 0) {
        setRoteirosProducao([])
        return
      }

      const roteirosComItens = await Promise.all(
        roteirosProducaoFiltrados.map(async (r) => {
          try {
            return await roteiroApi.buscar(r.id)
          } catch {
            return r
          }
        })
      )

      const roteirosMotoristas = todosRoteiros.filter((r) => r.motorista)
      const roteirosMotoristasCompletos = await Promise.all(
        roteirosMotoristas.map(async (r) => {
          try {
            return await roteiroApi.buscar(r.id)
          } catch {
            return r
          }
        })
      )

      // Contar quantos de cada tipo (empresa, produto, qtd) o motorista já tem
      // Assim só "consumimos" N do pool quando motorista tem N iguais
      const contagemPorTipo = new Map<string, number>()
      roteirosMotoristasCompletos.forEach((roteiro) => {
        if (roteiro.itens) {
          roteiro.itens.forEach((item) => {
            const chaveTipo = `${(item.observacao || '').trim()}_${item.produto_id}_${item.quantidade}`
            contagemPorTipo.set(chaveTipo, (contagemPorTipo.get(chaveTipo) || 0) + 1)
          })
        }
      })

      const consumidos = new Map<string, number>()

      const resultado: RoteiroProducaoComPedidos[] = roteirosComItens
        .filter((r) => r.itens && r.itens.length > 0)
        .map((roteiro) => {
          const pedidosDisponiveis: PedidoDisponivel[] = []
          ;(roteiro.itens || []).forEach((item, idx) => {
            const empresaItem = (item.observacao || '').trim()
            if (!empresaItem) return
            const chaveTipo = `${empresaItem}_${item.produto_id}_${item.quantidade}`
            const jaNoMotorista = contagemPorTipo.get(chaveTipo) || 0
            const consumidosAgora = consumidos.get(chaveTipo) || 0
            if (consumidosAgora < jaNoMotorista) {
              consumidos.set(chaveTipo, consumidosAgora + 1)
              return
            }
            pedidosDisponiveis.push({
              produto_id: item.produto_id,
              produto_nome: item.produto_nome || `Produto ID: ${item.produto_id}`,
              quantidade: Number(item.quantidade),
              observacao: empresaItem,
              chaveUnica: `r${roteiro.id}_i${idx}`
            })
          })
          const nomeRoteiro = roteiro.observacoes?.trim()
            ? `${roteiro.nome_empresa} - ${roteiro.observacoes}`
            : roteiro.nome_empresa
          return {
            id: roteiro.id,
            nome: nomeRoteiro,
            observacoes: roteiro.observacoes,
            itens: pedidosDisponiveis
          }
        })
        .filter((r) => r.itens.length > 0)

      setRoteirosProducao(resultado)
    } catch (error) {
      console.error('Erro ao carregar roteiros de produção:', error)
      toast.error('Erro ao carregar roteiros')
    } finally {
      setCarregandoRoteiros(false)
    }
  }

  const togglePedidoSelecionado = (pedido: PedidoDisponivel) => {
    const key = getChavePedido(pedido)
    const novosSelecionados = new Set(pedidosSelecionados)
    if (novosSelecionados.has(key)) {
      novosSelecionados.delete(key)
    } else {
      novosSelecionados.add(key)
    }
    setPedidosSelecionados(novosSelecionados)
  }

  const getPedidosSelecionadosParaSalvar = (): Array<{ nome_empresa: string; produto_id: number; quantidade: number }> => {
    const itens: Array<{ nome_empresa: string; produto_id: number; quantidade: number }> = []
    roteirosProducao.forEach((roteiro) => {
      roteiro.itens.forEach((pedido) => {
        if (pedidosSelecionados.has(getChavePedido(pedido))) {
          itens.push({
            nome_empresa: pedido.observacao,
            produto_id: pedido.produto_id,
            quantidade: pedido.quantidade
          })
        }
      })
    })
    return itens
  }

  const handleConfirmar = async () => {
    const itensParaSalvar = getPedidosSelecionadosParaSalvar()
    if (itensParaSalvar.length === 0) {
      toast.error('Clique nos pedidos para adicioná-los ao roteiro')
      return
    }
    await onSalvar(itensParaSalvar, slotParaAdicionar ?? undefined)
    setPedidosSelecionados(new Set())
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md border border-gray-200 dark:border-gray-700">
      {/* Cabeçalho */}
      <div
        onClick={onToggleExpandir}
        className="p-4 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors rounded-t-lg"
      >
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className={`transform transition-transform ${estaExpandido ? 'rotate-90' : ''}`}>
              ▶
            </div>
            <div>
              <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100">
                {motorista.nome}
                {motorista.periodo && (
                  <span className="ml-2 text-sm font-normal text-gray-600 dark:text-gray-300">
                    ({motorista.periodo === 'matutino' ? 'Matutino' : 'Noturno'})
                  </span>
                )}
              </h2>
              <p className="text-sm text-gray-600 dark:text-gray-300 mt-0.5">
                3 roteiros • {itens.length} item{itens.length !== 1 ? 's' : ''} total
              </p>
            </div>
          </div>
          <div className="flex gap-2" onClick={(e) => e.stopPropagation()}>
            {itens.length > 0 && (
              <>
                <Link
                  href={`/motoristas/editar?motorista=${encodeURIComponent(motorista.nome)}&data=${format(dataSelecionada, 'yyyy-MM-dd')}&periodo=${periodoSelecionado}`}
                  onClick={(e) => e.stopPropagation()}
                  className="bg-blue-500 text-white px-3 py-1.5 rounded-md font-semibold hover:bg-blue-600 transition-colors text-xs"
                >
                  Editar
                </Link>
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    onImprimir()
                  }}
                  className="bg-gray-500 text-white px-3 py-1.5 rounded-md font-semibold hover:bg-gray-600 transition-colors text-xs"
                >
                  Imprimir
                </button>
                <button
                  onClick={async (e) => {
                    e.stopPropagation()
                    await onLimpar()
                  }}
                  className="bg-red-500 text-white px-3 py-1.5 rounded-md font-semibold hover:bg-red-600 transition-colors text-xs"
                  title="Limpar roteiro"
                >
                  Limpar
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Modal para adicionar pedidos */}
      {formularioAberto && (
        <>
          <div 
            className="fixed inset-0 bg-black bg-opacity-50 z-40"
            onClick={onToggleFormulario}
          />
          <div className="fixed inset-0 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] flex flex-col">
              <div className="p-6 border-b border-gray-200">
                <div className="flex justify-between items-center">
                  <h2 className="text-2xl font-bold text-gray-900">Adicionar Pedidos</h2>
                  <button
                    onClick={onToggleFormulario}
                    className="text-gray-400 hover:text-gray-600 text-2xl"
                  >
                    ×
                  </button>
                </div>
              </div>
              
              <div className="p-6 flex-1 overflow-y-auto">
                {/* Calendário e seleção de data/período */}
                <div className="mb-6">
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Selecione o dia e período
                  </label>
                  <div className="flex flex-wrap items-center gap-3 mb-3">
                    <div className="text-center px-4 py-2 bg-gray-50 rounded-lg">
                      <div className="text-sm font-bold text-gray-900">
                        {format(dataFiltroPedidos, 'EEEE', { locale: ptBR })}
                      </div>
                      <div className="text-xs font-semibold text-gray-600">
                        {format(dataFiltroPedidos, 'dd/MM/yyyy')}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 w-full">
                      <button
                        type="button"
                        onClick={() => {
                          const novaData = subDays(dataFiltroPedidos, 1)
                          setDataFiltroPedidos(novaData)
                          setMesCalendarioPedidos(novaData)
                        }}
                        className="flex-1 min-w-0 px-2 py-2 bg-gray-100 text-gray-700 rounded-lg font-semibold hover:bg-gray-200 text-sm"
                      >
                        ←
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          const hoje = new Date()
                          setDataFiltroPedidos(hoje)
                          setMesCalendarioPedidos(hoje)
                        }}
                        className="flex-1 min-w-0 px-2 py-2 bg-secondary-500 text-white rounded-lg font-semibold hover:bg-secondary-600 text-sm"
                      >
                        Hoje
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          const novaData = addDays(dataFiltroPedidos, 1)
                          setDataFiltroPedidos(novaData)
                          setMesCalendarioPedidos(novaData)
                        }}
                        className="flex-1 min-w-0 px-2 py-2 bg-gray-100 text-gray-700 rounded-lg font-semibold hover:bg-gray-200 text-sm"
                      >
                        →
                      </button>
                    </div>
                    <div className="flex gap-2 w-full min-w-0">
                      <button
                        type="button"
                        onClick={() => setPeriodoFiltroPedidos('manha')}
                        className={`flex-1 min-w-0 px-3 py-2 rounded-lg font-semibold text-sm ${
                          periodoFiltroPedidos === 'manha'
                            ? 'bg-primary-500 text-white'
                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                        }`}
                      >
                        Manhã
                      </button>
                      <button
                        type="button"
                        onClick={() => setPeriodoFiltroPedidos('noite')}
                        className={`flex-1 min-w-0 px-3 py-2 rounded-lg font-semibold text-sm ${
                          periodoFiltroPedidos === 'noite'
                            ? 'bg-primary-500 text-white'
                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                        }`}
                      >
                        Noite
                      </button>
                    </div>
                    <div className="relative">
                      <button
                        type="button"
                        onClick={() => setMostrarCalendarioPedidos(!mostrarCalendarioPedidos)}
                        className="px-4 py-2 bg-primary-500 text-white rounded-lg font-semibold hover:bg-primary-600 flex items-center gap-2 text-sm"
                      >
                        Calendário
                        <span className={`transform transition-transform ${mostrarCalendarioPedidos ? 'rotate-180' : ''}`}>▼</span>
                      </button>
                      {mostrarCalendarioPedidos && (
                        <>
                          <div className="fixed inset-0 z-40" onClick={() => setMostrarCalendarioPedidos(false)} />
                          <div className="absolute top-full left-0 mt-2 bg-white rounded-lg shadow-xl border border-gray-200 p-4 z-50 w-80">
                            <div className="flex items-center justify-between mb-3">
                              <button
                                onClick={() => setMesCalendarioPedidos(subDays(startOfMonth(mesCalendarioPedidos), 1))}
                                className="px-2 py-1 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 font-semibold text-sm"
                              >
                                ←
                              </button>
                              <h3 className="text-sm font-bold text-gray-900">
                                {format(mesCalendarioPedidos, 'MMMM yyyy', { locale: ptBR })}
                              </h3>
                              <button
                                onClick={() => setMesCalendarioPedidos(addDays(endOfMonth(mesCalendarioPedidos), 1))}
                                className="px-2 py-1 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 font-semibold text-sm"
                              >
                                →
                              </button>
                            </div>
                            <div className="grid grid-cols-7 gap-1 mb-2">
                              {['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'].map((dia) => (
                                <div key={dia} className="text-center text-xs font-semibold text-gray-600 py-1">{dia}</div>
                              ))}
                            </div>
                            <div className="grid grid-cols-7 gap-1">
                              {eachDayOfInterval({
                                start: startOfWeek(startOfMonth(mesCalendarioPedidos), { weekStartsOn: 0 }),
                                end: endOfWeek(endOfMonth(mesCalendarioPedidos), { weekStartsOn: 0 })
                              }).map((dia) => {
                                const diaFormatado = format(dia, 'yyyy-MM-dd')
                                const isSelecionado = diaFormatado === format(dataFiltroPedidos, 'yyyy-MM-dd')
                                const isHoje = diaFormatado === format(new Date(), 'yyyy-MM-dd')
                                const isMesAtual = getMonth(dia) === getMonth(mesCalendarioPedidos)
                                return (
                                  <button
                                    key={diaFormatado}
                                    onClick={() => {
                                      setDataFiltroPedidos(dia)
                                      setMesCalendarioPedidos(dia)
                                      setMostrarCalendarioPedidos(false)
                                    }}
                                    className={`py-1.5 px-1 rounded-lg text-xs font-semibold transition-colors ${
                                      !isMesAtual ? 'text-gray-300' : 'text-gray-900'
                                    } ${isSelecionado ? 'bg-primary-500 text-white' : isHoje ? 'bg-secondary-500 text-white' : 'hover:bg-gray-100'}`}
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
                </div>

                {/* Roteiros de produção do dia com pedidos clicáveis */}
                <div className="space-y-4">
                  <p className="text-sm text-gray-600">
                    Clique nos pedidos abaixo para adicioná-los ao roteiro de {motorista.nome}
                  </p>
                  {carregandoRoteiros ? (
                    <div className="text-center py-12 text-gray-600">Carregando roteiros...</div>
                  ) : roteirosProducao.length === 0 ? (
                    <div className="text-center py-12 text-gray-600 border border-gray-200 rounded-lg bg-gray-50">
                      <p className="font-semibold mb-1">Nenhum roteiro de produção neste dia</p>
                      <p className="text-sm">Adicione pedidos aos roteiros de produção primeiro.</p>
                    </div>
                  ) : (
                    <div className="space-y-2 max-h-[50vh] overflow-y-auto">
                      {roteirosProducao.map((roteiro) => {
                        const estaExpandido = roteirosProducaoModalExpandidos.has(String(roteiro.id))
                        const temItens = roteiro.itens && roteiro.itens.length > 0
                        return (
                        <div key={roteiro.id} className="border border-gray-200 rounded overflow-hidden">
                          <div className="bg-gray-100 px-3 py-1.5 text-sm font-semibold text-gray-900 flex items-center justify-between gap-2">
                            <button
                              type="button"
                              onClick={() => temItens && toggleExpandirRoteiroProducaoModal(roteiro.id)}
                              className={`flex items-center gap-2 text-left min-w-0 flex-1 rounded px-1 -mx-1 transition-colors ${temItens ? 'cursor-pointer hover:bg-gray-200 group' : 'cursor-default'}`}
                            >
                              <span className={`text-gray-500 shrink-0 ${temItens ? 'group-hover:text-gray-700' : 'invisible'}`}>
                                {temItens && (estaExpandido ? '▼' : '▶')}
                              </span>
                              <span className="truncate group-hover:text-gray-900">{roteiro.nome}</span>
                              {temItens && (
                                <span className="text-xs text-gray-600 shrink-0 group-hover:text-gray-800">
                                  ({roteiro.itens.length} item{roteiro.itens.length !== 1 ? 's' : ''})
                                </span>
                              )}
                            </button>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation()
                                imprimirRoteiroProducao(roteiro, dataFiltroPedidos, periodoFiltroPedidos)
                              }}
                              className="p-1.5 rounded-md bg-gray-200 hover:bg-gray-300 text-gray-700 transition-colors shrink-0"
                              title="Imprimir roteiro"
                            >
                              🖨️
                            </button>
                          </div>
                          {temItens && (
                            estaExpandido ? (
                          <div className="p-1.5 space-y-1">
                            {roteiro.itens.map((pedido) => {
                              const chave = getChavePedido(pedido)
                              const estaSelecionado = pedidosSelecionados.has(chave)
                              return (
                                <div
                                  key={chave}
                                  onClick={() => togglePedidoSelecionado(pedido)}
                                  className={`flex items-center gap-2 px-2 py-1.5 rounded cursor-pointer transition-all border ${
                                    estaSelecionado
                                      ? 'border-primary-500 bg-primary-50'
                                      : 'border-gray-200 hover:border-primary-300 hover:bg-gray-50'
                                  }`}
                                >
                                  <div className={`w-4 h-4 rounded-full flex items-center justify-center flex-shrink-0 text-[10px] ${
                                    estaSelecionado ? 'bg-primary-500 text-white' : 'border border-gray-300'
                                  }`}>
                                    {estaSelecionado && '✓'}
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <div className="text-xs font-semibold text-gray-900 truncate">{pedido.observacao}</div>
                                    <div className="text-[11px] text-gray-600">
                                      {pedido.produto_nome} · {pedido.quantidade} un.
                                    </div>
                                  </div>
                                </div>
                              )
                            })}
                          </div>
                            ) : (
                              <p className="text-gray-500 text-xs py-2 px-3">Clique no nome do roteiro acima para ver os pedidos</p>
                            )
                          )}
                        </div>
                        )
                      })}
                    </div>
                  )}
                </div>
              </div>

              <div className="p-6 border-t border-gray-200 flex justify-end gap-4">
                <button
                  onClick={onToggleFormulario}
                  className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg font-semibold hover:bg-gray-50"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleConfirmar}
                  disabled={salvando || pedidosSelecionados.size === 0}
                  className="px-6 py-2 bg-primary-500 text-white rounded-lg font-semibold hover:bg-primary-600 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {salvando ? 'Salvando...' : `Adicionar ${pedidosSelecionados.size} pedido(s)`}
                </button>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Conteúdo expandido - 3 Slots de Roteiros pré-definidos */}
      {estaExpandido && (
        <div className="border-t border-gray-200 p-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[0, 1, 2].map((slotIndex) => {
              const numSlot = slotIndex + 1
              let roteiroSlot = roteiros.find((r) => {
                const m = String(r.observacoes || '').match(/Roteiro\s*(\d+)/i)
                return m ? parseInt(m[1], 10) === numSlot : false
              })
              if (!roteiroSlot && roteiros[slotIndex]) roteiroSlot = roteiros[slotIndex]
              const itensSlot = roteiroSlot?.itens || []
              const nomeSlot = roteiroSlot?.observacoes?.trim() || `Roteiro ${slotIndex + 1}`

              return (
                <div key={roteiroSlot?.id ?? `slot-${slotIndex}`} className="border border-gray-200 rounded-lg overflow-hidden bg-white shadow-sm">
                  <div className="bg-gray-50 px-3 py-2">
                    <div className="flex justify-between items-center">
                      <button
                        type="button"
                        onClick={() => roteiroSlot && itensSlot.length > 0 && toggleExpandirItensRoteiro(roteiroSlot.id)}
                        className={`flex items-center gap-2 text-left min-w-0 flex-1 rounded px-1 -mx-1 transition-colors ${roteiroSlot && itensSlot.length > 0 ? 'cursor-pointer hover:bg-gray-200 group' : 'cursor-default'}`}
                      >
                        <span className={`text-sm text-gray-500 shrink-0 ${roteiroSlot && itensSlot.length > 0 ? 'group-hover:text-gray-700' : 'invisible'}`}>
                          {roteiroSlot && itensSlot.length > 0 && slotRoteiroExpandido.has(String(roteiroSlot.id)) ? '▼' : '▶'}
                        </span>
                        <span className="font-semibold text-gray-800 text-sm truncate group-hover:text-gray-900">{nomeSlot}</span>
                        {itensSlot.length > 0 && (
                          <span className="text-xs text-gray-600 shrink-0 group-hover:text-gray-800">({itensSlot.length} item{itensSlot.length !== 1 ? 's' : ''})</span>
                        )}
                      </button>
                    </div>
                    <div className="flex gap-2 mt-2 flex-wrap" onClick={(e) => e.stopPropagation()}>
                      <button
                        onClick={() => onAbrirAdicionarPedidos(slotIndex)}
                        className="bg-primary-500 text-white px-2 py-1 rounded text-xs font-semibold hover:bg-primary-600"
                        title="Adicionar pedidos dos roteiros de produção"
                      >
                        + Adicionar Pedidos
                      </button>
                      {slotCopiado?.roteiro?.itens && slotCopiado.roteiro.itens.length > 0 && (
                        <button
                          onClick={() => onColarSlot(motorista.nome, slotIndex, roteiroSlot)}
                          disabled={
                            colandoSlot === `${motorista.nome}_${slotIndex}` ||
                            roteiroSlot?.id === slotCopiado.roteiro.id
                          }
                          className="bg-purple-500 text-white px-2 py-1 rounded text-xs font-semibold hover:bg-purple-600 disabled:opacity-50 disabled:cursor-not-allowed"
                          title={roteiroSlot?.id === slotCopiado.roteiro.id ? 'Não é possível colar no mesmo roteiro' : `Colar roteiro de ${slotCopiado.motoristaOrigem}`}
                        >
                          {colandoSlot === `${motorista.nome}_${slotIndex}` ? (
                            <span className="inline-block w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
                          ) : (
                            'Colar'
                          )}
                        </button>
                      )}
                      {roteiroSlot ? (
                        <>
                          <Link
                            href={`/roteiros/${roteiroSlot.id}/editar`}
                            className="bg-blue-500 text-white px-2 py-1 rounded text-xs font-semibold hover:bg-blue-600"
                          >
                            Editar
                          </Link>
                          {itensSlot.length > 0 && (
                            <>
                              <button
                                onClick={() => {
                                  const itensParaRomaneio: ItemMotorista[] = itensSlot.map((i) => ({
                                    empresa: i.observacao || 'Sem empresa',
                                    pao: i.produto_nome || `Produto ID: ${i.produto_id}`,
                                    quantidade: Number(i.quantidade)
                                  }))
                                  onGerarRomaneios(itensParaRomaneio)
                                }}
                                className="bg-green-500 text-white px-2 py-1 rounded text-xs font-semibold hover:bg-green-600"
                                title="Gerar romaneios por empresa"
                              >
                                📄 Gerar Romaneios
                              </button>
                              <button
                                onClick={() => onCopiarSlot(roteiroSlot, motorista.nome, slotIndex)}
                                className="bg-purple-500 text-white px-2 py-1 rounded text-xs font-semibold hover:bg-purple-600"
                                title="Copiar este roteiro"
                              >
                                Copiar
                              </button>
                              <button
                                onClick={() => {
                                  const itensParaImprimir = itensSlot.map((i) => ({
                                    empresa: i.observacao || 'Sem empresa',
                                    pao: i.produto_nome || `Produto ID: ${i.produto_id}`,
                                    quantidade: Number(i.quantidade)
                                  }))
                                  imprimirRoteiro(motorista, itensParaImprimir)
                                }}
                                className="bg-gray-500 text-white px-2 py-1 rounded text-xs font-semibold hover:bg-gray-600"
                              >
                                Imprimir
                              </button>
                            </>
                          )}
                        </>
                      ) : null}
                    </div>
                  </div>
                  {roteiroSlot && itensSlot.length > 0 && (
                    slotRoteiroExpandido.has(String(roteiroSlot.id)) ? (
                      <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                          <thead className="bg-gray-100">
                            <tr>
                              <th className="px-2 py-1.5 text-left text-xs font-semibold text-gray-600">Empresa</th>
                              <th className="px-2 py-1.5 text-left text-xs font-semibold text-gray-600">Pão</th>
                              <th className="px-2 py-1.5 text-center text-xs font-semibold text-gray-600">Qtd</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-100">
                            {itensSlot.map((item, idx) => (
                              <tr key={idx}>
                                <td className="px-2 py-1.5 text-gray-900">{item.observacao || '-'}</td>
                                <td className="px-2 py-1.5 text-gray-900">{item.produto_nome || `ID: ${item.produto_id}`}{item.recheio ? ` ${item.recheio}` : ''}{item.opcao_relatorio ? ` ${opcaoRelatorioParaLabel(item.opcao_relatorio)}` : ''}</td>
                                <td className="px-2 py-1.5 text-center font-semibold text-gray-900">{item.quantidade}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    ) : (
                      <p className="text-gray-500 text-xs py-2 px-3">Clique no nome do roteiro acima para ver os itens</p>
                    )
                  )}
                  {roteiroSlot && itensSlot.length === 0 && (
                    <div className="p-4 text-center text-gray-500 text-sm">
                      Nenhum item · <Link href={`/roteiros/${roteiroSlot.id}/editar`} className="text-primary-600 hover:underline font-semibold">Adicionar</Link>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
