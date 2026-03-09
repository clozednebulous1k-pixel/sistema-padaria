'use client'

import { Suspense, useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useForm, useFieldArray } from 'react-hook-form'
import { roteiroApi, produtoApi, empresaApi, motoristaApi, Produto, Roteiro, RoteiroItem } from '@/lib/api'
import toast from 'react-hot-toast'
import Link from 'next/link'
import { format, addDays, subDays, parseISO, startOfMonth, endOfMonth, eachDayOfInterval, startOfWeek, endOfWeek, getMonth, getYear, isSameDay, isToday } from 'date-fns'
import Loading from '@/components/Loading'

interface FormData {
  motorista: string
  data_producao: string
  itens: Array<{
    nome_empresa: string
    produto_id: number
    quantidade: number
  }>
}

interface Motorista {
  nome: string
  periodo: 'matutino' | 'noturno' | ''
}

const STORAGE_KEY_EMPRESAS = 'empresas_padaria'
const STORAGE_KEY_MOTORISTAS = 'motoristas_padaria'
const STORAGE_KEY_DATA_SELECIONADA_MOTORISTAS = 'data_selecionada_motoristas'

function EditarRoteirosMotoristaContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const motoristaParam = searchParams.get('motorista')
  const dataParam = searchParams.get('data')
  const periodoParam = searchParams.get('periodo')
  const [loading, setLoading] = useState(false)
  const [carregando, setCarregando] = useState(true)
  const [produtos, setProdutos] = useState<Produto[]>([])
  const [roteiros, setRoteiros] = useState<Roteiro[]>([])
  const [empresas, setEmpresas] = useState<string[]>([])
  const [motoristas, setMotoristas] = useState<Motorista[]>([])
  // Empresas e produtos disponíveis apenas dos roteiros de produção (sem motorista)
  const [empresasProducao, setEmpresasProducao] = useState<string[]>([])
  const [produtosProducao, setProdutosProducao] = useState<Produto[]>([])
  
  // Estado para data selecionada e calendário (prioriza params da URL)
  const [dataSelecionada, setDataSelecionada] = useState<Date>(() => {
    if (typeof window !== 'undefined' && dataParam) {
      try {
        return parseISO(dataParam)
      } catch {}
    }
    if (typeof window !== 'undefined') {
      const dataSalva = localStorage.getItem(STORAGE_KEY_DATA_SELECIONADA_MOTORISTAS)
      if (dataSalva) {
        try {
          return parseISO(dataSalva)
        } catch {}
      }
    }
    return new Date()
  })
  const [mostrarCalendario, setMostrarCalendario] = useState(false)
  const [mesCalendario, setMesCalendario] = useState<Date>(() => new Date())
  const [periodoSelecionado, setPeriodoSelecionado] = useState<'manha' | 'noite'>(() => 
    (periodoParam === 'manha' || periodoParam === 'noite') ? periodoParam : 'manha'
  )
  
  // Salvar data selecionada no localStorage quando mudar
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem(STORAGE_KEY_DATA_SELECIONADA_MOTORISTAS, format(dataSelecionada, 'yyyy-MM-dd'))
    }
  }, [dataSelecionada])

  const {
    register,
    handleSubmit,
    control,
    formState: { errors },
    setValue,
    watch,
    reset,
  } = useForm<FormData>()

  const { fields, append, remove } = useFieldArray({
    control,
    name: 'itens',
  })

  const itens = watch('itens')

  useEffect(() => {
    if (motoristaParam) {
      carregarDados()
    }
  }, [motoristaParam, dataSelecionada, periodoSelecionado])

  // Sincronizar data/periodo quando params da URL mudarem
  useEffect(() => {
    if (dataParam) {
      try {
        setDataSelecionada(parseISO(dataParam))
      } catch {}
    }
    if (periodoParam === 'manha' || periodoParam === 'noite') {
      setPeriodoSelecionado(periodoParam)
    }
  }, [dataParam, periodoParam])

  const carregarDados = async () => {
    if (!motoristaParam) return

    try {
      setCarregando(true)
      
      // Carregar todos os roteiros
      const todosRoteiros = await roteiroApi.listar({})
      console.log('Todos os roteiros carregados:', todosRoteiros)
      console.log('Motorista sendo buscado:', motoristaParam)
      
      // Carregar roteiros de produção (sem motorista) para obter empresas e produtos disponíveis
      const roteirosProducao = todosRoteiros.filter((r) => !r.motorista || r.motorista.trim() === '')
      console.log('Roteiros de produção encontrados:', roteirosProducao.length)
      
      // Carregar roteiros de produção completos com itens
      const roteirosProducaoCompletos = await Promise.all(
        roteirosProducao.map(async (roteiro) => {
          try {
            return await roteiroApi.buscar(roteiro.id)
          } catch (error) {
            console.error(`Erro ao buscar roteiro de produção ${roteiro.id}:`, error)
            return roteiro
          }
        })
      )
      
      // Extrair empresas e produtos únicos dos roteiros de produção
      const empresasUnicas = new Set<string>()
      const produtosIds = new Set<number>()
      
      roteirosProducaoCompletos.forEach((roteiro) => {
        if (roteiro.itens && roteiro.itens.length > 0) {
          roteiro.itens.forEach((item) => {
            // Empresa está na observacao do item ou no nome_empresa do roteiro
            const empresa = item.observacao || roteiro.nome_empresa || ''
            if (empresa && empresa.trim()) {
              empresasUnicas.add(empresa.trim())
            }
            // Produto ID
            if (item.produto_id) {
              produtosIds.add(item.produto_id)
            }
          })
        }
      })
      
      setEmpresasProducao(Array.from(empresasUnicas).sort())
      
      // Filtrar produtos que existem nos roteiros de produção
      const produtosData = await produtoApi.listar()
      const produtosAtivos = produtosData.filter((p) => p.ativo)
      const produtosFiltrados = produtosAtivos.filter((p) => produtosIds.has(p.id))
      setProdutosProducao(produtosFiltrados)
      
      console.log('Empresas disponíveis dos roteiros de produção:', Array.from(empresasUnicas).length)
      console.log('Produtos disponíveis dos roteiros de produção:', produtosFiltrados.length)
      
      const dataFormatada = format(dataSelecionada, 'yyyy-MM-dd')
      const periodoFormatado = periodoSelecionado === 'manha' ? 'matutino' : 'noturno'

      // Filtrar roteiros do motorista por nome, data e período (apenas os da data/período selecionados)
      const roteirosDoMotorista = todosRoteiros.filter((r) => {
        const motoristaRoteiro = (r.motorista || '').trim()
        const motoristaBuscado = motoristaParam.trim()
        const matchMotorista = motoristaRoteiro.toLowerCase() === motoristaBuscado.toLowerCase() ||
          (!motoristaRoteiro && r.nome_empresa?.trim().toLowerCase() === motoristaBuscado.toLowerCase())

        let dataRoteiro = r.data_producao
        if (dataRoteiro) {
          if (dataRoteiro.includes('T')) dataRoteiro = dataRoteiro.split('T')[0]
          else if (dataRoteiro.includes(' ')) dataRoteiro = dataRoteiro.split(' ')[0]
        }
        const matchData = dataRoteiro === dataFormatada

        const periodoRoteiro = r.periodo || ''
        const matchPeriodo = periodoRoteiro === periodoSelecionado || periodoRoteiro === periodoFormatado

        return matchMotorista && matchData && matchPeriodo
      })

      console.log('Roteiros encontrados para o motorista:', roteirosDoMotorista.length)

      // Carregar roteiros completos com itens
      const roteirosCompletos = await Promise.all(
        roteirosDoMotorista.map(async (roteiro) => {
          try {
            const completo = await roteiroApi.buscar(roteiro.id)
            console.log(`Roteiro completo ${completo.id} carregado, itens:`, completo.itens?.length || 0)
            return completo
          } catch (error) {
            console.error(`Erro ao buscar roteiro ${roteiro.id}:`, error)
            return roteiro
          }
        })
      )

      setRoteiros(roteirosCompletos)

      // Produtos já foram carregados acima, mas manter para compatibilidade
      if (produtos.length === 0) {
        const produtosData = await produtoApi.listar()
        setProdutos(produtosData.filter((p) => p.ativo))
      }

      // Consolidar todos os itens de todos os roteiros PRIMEIRO
      const todosItens: FormData['itens'] = []
      
      // Coletar todas as empresas dos itens
      const empresasParaSalvar = new Set<string>()
      roteirosCompletos.forEach((roteiro) => {
        console.log(`Roteiro ${roteiro.id} - Itens:`, roteiro.itens)
        if (roteiro.itens && roteiro.itens.length > 0) {
          roteiro.itens.forEach((item: any) => {
            // IMPORTANTE: Empresa está APENAS na observacao do item, não no nome_empresa do roteiro
            // O nome_empresa do roteiro para motoristas contém o nome do motorista
            console.log(`Item ${item.id || 'sem-id'}:`, {
              produto_id: item.produto_id,
              quantidade: item.quantidade,
              observacao: item.observacao,
              produto_nome: item.produto_nome
            })
            
            // Tratar observacao que pode ser null ou string vazia
            const empresa = (item.observacao && typeof item.observacao === 'string' && item.observacao.trim()) || ''
            const itemFormData = {
              nome_empresa: empresa,
              produto_id: item.produto_id,
              quantidade: item.quantidade || 1,
            }
            
            todosItens.push(itemFormData)
            
            if (empresa && empresa.trim()) {
              empresasParaSalvar.add(empresa.trim())
            }
          })
        }
      })
      
      console.log('Total de itens consolidados:', todosItens.length)
      console.log('Itens detalhados com empresas:', todosItens.map(item => ({
        nome_empresa: item.nome_empresa,
        produto_id: item.produto_id,
        quantidade: item.quantidade
      })))
      console.log('Empresas encontradas nos itens:', Array.from(empresasParaSalvar))

      // Salvar todas as empresas coletadas ANTES de carregar empresas
      for (const empresa of Array.from(empresasParaSalvar)) {
        await salvarEmpresa(empresa)
      }

      // AGORA carregar empresas e motoristas (para garantir que as empresas salvas estejam na lista)
      await carregarEmpresas()
      await carregarMotoristas()

      // Aguardar um pouco mais para garantir que o estado foi atualizado
      await new Promise(resolve => setTimeout(resolve, 200))

      // Preencher formulário - usar reset para garantir que todos os valores sejam setados corretamente
      if (roteirosCompletos.length > 0) {
        const primeiroRoteiro = roteirosCompletos[0]
        
        const dadosFormulario = {
          motorista: primeiroRoteiro.motorista || motoristaParam,
          data_producao: format(dataSelecionada, 'yyyy-MM-dd'),
          itens: todosItens.length > 0 ? todosItens : [{ nome_empresa: '', produto_id: 0, quantidade: 1 }]
        }
        
        console.log('Preenchendo formulário com:', dadosFormulario)
        console.log('Número de itens no formulário:', dadosFormulario.itens.length)
        console.log('Empresas nos itens:', dadosFormulario.itens.map(i => i.nome_empresa))
        console.log('Empresas disponíveis no select:', empresas.length)
        
        // Usar reset com valores explícitos
        reset(dadosFormulario, {
          keepDefaultValues: false
        })
        
        // Aguardar mais um pouco após reset para garantir que o DOM foi atualizado
        await new Promise(resolve => setTimeout(resolve, 200))
        
        // Forçar atualização de cada campo usando setValue para garantir que todos os valores sejam setados
        // Isso garante que os selects sejam atualizados corretamente
        dadosFormulario.itens.forEach((item, index) => {
          const nomeEmpresa = item.nome_empresa || ''
          const produtoId = item.produto_id || 0
          const quantidade = item.quantidade || 1
          
          console.log(`Setando valores do item ${index}:`, {
            nome_empresa: nomeEmpresa,
            produto_id: produtoId,
            quantidade: quantidade,
            empresa_existe_na_lista: empresas.includes(nomeEmpresa)
          })
          
          // Setar valores - usar shouldDirty: false para evitar marcar como dirty
          setValue(`itens.${index}.nome_empresa`, nomeEmpresa, { shouldValidate: false, shouldDirty: false })
          setValue(`itens.${index}.produto_id`, produtoId, { shouldValidate: false, shouldDirty: false })
          setValue(`itens.${index}.quantidade`, quantidade, { shouldValidate: false, shouldDirty: false })
        })
        
        console.log('Formulário preenchido e valores setados explicitamente!')
      } else {
        // Se não houver roteiro, inicializar com data atual mas editável
        const dadosFormulario = {
          motorista: motoristaParam,
          data_producao: format(dataSelecionada, 'yyyy-MM-dd'),
          itens: [{ nome_empresa: '', produto_id: 0, quantidade: 1 }]
        }
        setTimeout(() => {
          reset(dadosFormulario, {
            keepDefaultValues: false
          })
        }, 100)
      }
    } catch (error: any) {
      toast.error('Erro ao carregar roteiros')
      console.error('Erro completo:', error)
      router.push('/motoristas')
    } finally {
      setCarregando(false)
    }
  }

  const carregarEmpresas = async () => {
    try {
      // Carregar empresas do backend
      const empresasBackend = await empresaApi.listar()
      const nomesEmpresas = empresasBackend.map((e) => e.nome)
      
      // Também carregar do localStorage (para compatibilidade)
      const empresasLocalStorage = localStorage.getItem(STORAGE_KEY_EMPRESAS)
      let empresasLocal: string[] = []
      if (empresasLocalStorage) {
        empresasLocal = JSON.parse(empresasLocalStorage)
      }
      
      // Combinar e remover duplicatas
      const todasEmpresas = Array.from(new Set([...nomesEmpresas, ...empresasLocal])).sort()
      setEmpresas(todasEmpresas)
      
      // Atualizar localStorage com todas as empresas
      localStorage.setItem(STORAGE_KEY_EMPRESAS, JSON.stringify(todasEmpresas))
    } catch (error) {
      console.error('Erro ao carregar empresas:', error)
      // Se der erro no backend, usar apenas localStorage
      try {
        const empresasSalvas = localStorage.getItem(STORAGE_KEY_EMPRESAS)
        if (empresasSalvas) {
          setEmpresas(JSON.parse(empresasSalvas))
        }
      } catch (localError) {
        console.error('Erro ao carregar empresas do localStorage:', localError)
      }
    }
  }

  const carregarMotoristas = async () => {
    try {
      // Carregar motoristas do backend
      const motoristasBackend = await motoristaApi.listar()
      const motoristasBackendObjetos: Motorista[] = motoristasBackend.map((m) => ({
        nome: m.nome,
        periodo: m.periodo
      }))
      
      // Também carregar do localStorage (para compatibilidade)
      const motoristasLocalStorage = localStorage.getItem(STORAGE_KEY_MOTORISTAS)
      let motoristasLocal: Motorista[] = []
      if (motoristasLocalStorage) {
        const dados = JSON.parse(motoristasLocalStorage)
        // Compatibilidade: se for array de strings, converter para array de objetos
        if (dados.length > 0 && typeof dados[0] === 'string') {
          motoristasLocal = dados.map((nome: string) => ({
            nome,
            periodo: ''
          }))
        } else {
          motoristasLocal = dados
        }
      }
      
      // Combinar e remover duplicatas (baseado no nome)
      const todosMotoristasMap = new Map<string, Motorista>()
      motoristasBackendObjetos.forEach((m) => todosMotoristasMap.set(m.nome.toLowerCase(), m))
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
      // Se der erro no backend, usar apenas localStorage
      try {
        const motoristasSalvos = localStorage.getItem(STORAGE_KEY_MOTORISTAS)
        if (motoristasSalvos) {
          const dados = JSON.parse(motoristasSalvos)
          if (dados.length > 0 && typeof dados[0] === 'string') {
            const motoristasObjetos: Motorista[] = dados.map((nome: string) => ({
              nome,
              periodo: ''
            }))
            setMotoristas(motoristasObjetos)
            localStorage.setItem(STORAGE_KEY_MOTORISTAS, JSON.stringify(motoristasObjetos))
          } else {
            setMotoristas(dados)
          }
        }
      } catch (localError) {
        console.error('Erro ao carregar motoristas do localStorage:', localError)
      }
    }
  }

  const salvarEmpresa = async (nomeEmpresa: string) => {
    if (!nomeEmpresa || nomeEmpresa.trim() === '') return
    
    const nomeLimpo = nomeEmpresa.trim()
    
    // Verificar se já existe na lista local
    if (empresas.includes(nomeLimpo)) {
      return
    }
    
    try {
      // Tentar salvar no backend
      await empresaApi.criar({ nome: nomeLimpo })
    } catch (error: any) {
      // Se já existe no backend ou outro erro, continuar
      console.log('Empresa pode já existir no backend:', error)
    }
    
    // Atualizar lista local
    const novasEmpresas = [...empresas, nomeLimpo].sort()
    setEmpresas(novasEmpresas)
    localStorage.setItem(STORAGE_KEY_EMPRESAS, JSON.stringify(novasEmpresas))
  }

  const salvarMotorista = async (nomeMotorista: string) => {
    if (!nomeMotorista || nomeMotorista.trim() === '') return
    
    const nomeLimpo = nomeMotorista.trim()
    const motoristaExistente = motoristas.find((m) => m.nome.toLowerCase() === nomeLimpo.toLowerCase())
    
    if (!motoristaExistente) {
      try {
        // Tentar salvar no backend (precisa de um período, usar 'matutino' como padrão)
        await motoristaApi.criar({ nome: nomeLimpo, periodo: 'matutino' })
      } catch (error: any) {
        // Se já existe no backend ou outro erro, continuar
        console.log('Motorista pode já existir no backend:', error)
      }
      
      // Adicionar ao estado local
      const novosMotoristas = [...motoristas, { nome: nomeLimpo, periodo: 'matutino' as const }]
        .sort((a, b) => a.nome.localeCompare(b.nome))
      setMotoristas(novosMotoristas)
      localStorage.setItem(STORAGE_KEY_MOTORISTAS, JSON.stringify(novosMotoristas))
    }
  }

  const onSubmit = async (data: FormData) => {
    if (!data.motorista || data.motorista.trim() === '') {
      toast.error('Selecione ou informe o nome do motorista')
      return
    }

    if (data.itens.length === 0) {
      toast.error('Adicione pelo menos um item')
      return
    }

    if (data.itens.some((item) => !item.nome_empresa || item.nome_empresa.trim() === '')) {
      toast.error('Preencha o nome da empresa em todos os itens')
      return
    }

    if (data.itens.some((item) => item.produto_id === 0)) {
      toast.error('Selecione todos os pães')
      return
    }

    if (data.itens.some((item) => item.quantidade <= 0)) {
      toast.error('Quantidade deve ser maior que zero')
      return
    }

    try {
      setLoading(true)
      
      // Salvar motorista (já deve estar cadastrado)
      if (data.motorista) {
        await salvarMotorista(data.motorista)
      }

      // Salvar empresas usadas (apenas dos itens válidos)
      for (const item of data.itens) {
        if (item.nome_empresa && item.nome_empresa.trim()) {
          await salvarEmpresa(item.nome_empresa)
        }
      }

      // Criar um único roteiro com todos os itens
      // Cada item terá a empresa na observação
      const itensRoteiro: RoteiroItem[] = data.itens.map((item) => ({
        produto_id: item.produto_id,
        quantidade: item.quantidade,
        observacao: item.nome_empresa, // Armazenar empresa na observação do item
      }))

      const periodoFormatadoSave = periodoSelecionado === 'manha' ? 'matutino' : 'noturno'
      const dataFormatadaSave = data.data_producao || format(dataSelecionada, 'yyyy-MM-dd')

      const todosRoteirosAtualizados = await roteiroApi.listar({})
      const roteirosDoMotorista = todosRoteirosAtualizados.filter((r) => {
        const motoristaRoteiro = (r.motorista || '').trim()
        const motoristaBuscado = data.motorista.trim()
        const matchMotorista = motoristaRoteiro.toLowerCase() === motoristaBuscado.toLowerCase() ||
          (!motoristaRoteiro && r.nome_empresa?.trim().toLowerCase() === motoristaBuscado.toLowerCase())
        let dataRoteiro = r.data_producao
        if (dataRoteiro) {
          if (dataRoteiro.includes('T')) dataRoteiro = dataRoteiro.split('T')[0]
          else if (dataRoteiro.includes(' ')) dataRoteiro = dataRoteiro.split(' ')[0]
        }
        const matchData = dataRoteiro === dataFormatadaSave
        const periodoRoteiro = r.periodo || ''
        const matchPeriodo = periodoRoteiro === periodoSelecionado || periodoRoteiro === periodoFormatadoSave
        return matchMotorista && matchData && matchPeriodo
      })

      console.log('Roteiros encontrados para atualização:', roteirosDoMotorista.length)
      console.log('Primeiro roteiro:', roteirosDoMotorista[0])
      
      if (roteirosDoMotorista.length > 0 && roteirosDoMotorista[0]?.id) {
        // Atualizar roteiro existente
        const roteiroExistente = roteirosDoMotorista[0]
        console.log('Atualizando roteiro ID:', roteiroExistente.id)
        console.log('Dados para atualizar:', {
          nome_empresa: data.motorista,
          data_producao: data.data_producao,
          motorista: data.motorista,
          status: 'pendente'
        })
        
        const roteiroAtualizado = await roteiroApi.atualizar(roteiroExistente.id, {
          nome_empresa: data.motorista,
          data_producao: data.data_producao,
          motorista: data.motorista,
          periodo: periodoFormatadoSave,
          status: 'pendente' as const,
        })
        console.log('Roteiro atualizado:', roteiroAtualizado)
        
        console.log('Atualizando itens:', itensRoteiro.length, 'itens')
        // Atualizar itens (substituir todos os itens pelos novos)
        const roteiroComItens = await roteiroApi.atualizarItens(roteiroExistente.id, itensRoteiro)
        console.log('Roteiro com itens atualizados:', roteiroComItens)
        
        // Se houver mais roteiros, deletar os extras
        if (roteirosDoMotorista.length > 1) {
          const roteirosExtras = roteirosDoMotorista.slice(1)
          console.log('Deletando roteiros extras:', roteirosExtras.length)
          const promessasDeletar = roteirosExtras.map(roteiro => roteiroApi.deletar(roteiro.id))
          await Promise.all(promessasDeletar)
        }
      } else {
        console.log('Criando novo roteiro (não há roteiro existente)')
        // Deletar todos os roteiros antigos do motorista (se houver)
        if (roteiros.length > 0) {
          const promessasDeletar = roteiros.map(roteiro => roteiroApi.deletar(roteiro.id))
          await Promise.all(promessasDeletar)
        }
        
        const novoRoteiro = await roteiroApi.criar({
          nome_empresa: data.motorista,
          data_producao: dataFormatadaSave,
          motorista: data.motorista,
          status: 'pendente' as const,
          periodo: periodoFormatadoSave,
          itens: itensRoteiro,
        })
        console.log('Novo roteiro criado:', novoRoteiro)
      }
      
      toast.success('Roteiros atualizados com sucesso!')
      router.push('/motoristas')
    } catch (error: any) {
      console.error('Erro completo ao atualizar roteiros:', error)
      
      // Mostrar mensagem de erro mais específica
      const mensagemErro = error?.response?.data?.message 
        || error?.message 
        || 'Erro ao atualizar roteiros. Verifique o console para mais detalhes.'
      
      toast.error(`Erro ao atualizar roteiros: ${mensagemErro}`)
      console.error('Detalhes do erro:', {
        message: error?.message,
        response: error?.response?.data,
        status: error?.response?.status,
        config: error?.config
      })
    } finally {
      setLoading(false)
    }
  }

  // Agrupar itens por empresa para a pré-visualização (apenas os do roteiro do motorista)
  const itensAgrupados = (itens || [])
    .filter((item) => item.nome_empresa && item.nome_empresa.trim() && item.produto_id > 0)
    .reduce((acc, item) => {
      const empresa = item.nome_empresa!.trim()
      const produto = produtos.find((p) => p.id === item.produto_id)
      if (!produto) return acc
      if (!acc[empresa]) acc[empresa] = []
      const existente = acc[empresa].find((i) => i.produto_id === item.produto_id)
      if (existente) existente.quantidade += item.quantidade
      else acc[empresa].push({ produto_id: item.produto_id, produto_nome: produto.nome, quantidade: item.quantidade })
      return acc
    }, {} as Record<string, Array<{ produto_id: number; produto_nome: string; quantidade: number }>>)

  if (!motoristaParam) {
    return null
  }

  if (carregando) {
    return <Loading />
  }

  return (
    <div className="container mx-auto px-4 max-w-7xl">
      <div className="mb-4">
        <Link
          href="/motoristas"
          className="text-primary-600 hover:text-primary-700 font-semibold text-sm mb-1 inline-block"
        >
          ← Voltar para roteiros de motoristas
        </Link>
        <h1 className="text-2xl font-bold text-gray-900 mt-2">
          Editar Roteiro de Motorista
        </h1>
        <p className="text-sm text-gray-600 mt-0.5">
          Motorista: {motoristaParam} · {format(dataSelecionada, 'dd/MM/yyyy')} · {periodoSelecionado === 'manha' ? 'Manhã' : 'Noite'}
        </p>
      </div>

      <div className="grid lg:grid-cols-2 gap-4">
        {/* Coluna Esquerda: Formulário */}
        <div>
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
                  type="button"
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
                  type="button"
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
                  type="button"
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
                    type="button"
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
                    type="button"
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
              type="button"
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
                  type="button"
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
                  type="button"
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
                        type="button"
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

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        <div className="bg-white rounded-lg shadow p-4">
          <h2 className="text-lg font-bold text-gray-900 mb-4">
            Informações do Motorista
          </h2>

          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Motorista *
              </label>
              <select
                {...register('motorista', {
                  required: 'Motorista é obrigatório',
                })}
                className="w-full px-4 py-3 text-gray-900 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              >
                <option value="">Selecione um motorista</option>
                {motoristas.map((motorista) => (
                  <option key={motorista.nome} value={motorista.nome}>
                    {motorista.nome}{motorista.periodo && ` (${motorista.periodo === 'matutino' ? 'Matutino' : 'Noturno'})`}
                  </option>
                ))}
              </select>
              {errors.motorista && (
                <p className="text-red-600 text-sm mt-1">
                  {errors.motorista.message}
                </p>
              )}
              {motoristas.length === 0 && (
                <p className="text-yellow-600 text-xs mt-1">
                  Nenhum motorista cadastrado. Cadastre motoristas em
                    {' '}
                    <Link href="/cadastro-motoristas" className="text-primary-600 hover:underline font-semibold">Cadastro de Motoristas</Link>.
                </p>
              )}
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Data de Produção *
              </label>
              <input
                type="date"
                {...register('data_producao', {
                  required: 'Data de produção é obrigatória',
                })}
                className="w-full px-4 py-3 text-gray-900 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              />
              {errors.data_producao && (
                <p className="text-red-600 text-sm mt-1">
                  {errors.data_producao.message}
                </p>
              )}
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-4">
          <h2 className="text-lg font-bold text-gray-900 mb-4">Itens do Roteiro</h2>

          {fields.map((field, index) => {
            return (
              <div
                key={field.id}
                className="bg-gray-50 p-4 rounded-lg mb-3 border border-gray-200"
              >
                <div className="flex justify-between items-center mb-3">
                  <h3 className="text-sm font-semibold text-gray-900">
                    Item {index + 1}
                  </h3>
                  {fields.length > 1 && (
                    <button
                      type="button"
                      onClick={() => remove(index)}
                      className="text-red-600 hover:text-red-700 text-xs font-semibold"
                    >
                      Remover
                    </button>
                  )}
                </div>

                <div className="grid md:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">
                      Empresa/Cliente *
                    </label>
                    <select
                      {...register(`itens.${index}.nome_empresa`, {
                        required: 'Empresa é obrigatória',
                      })}
                      value={itens?.[index]?.nome_empresa || ''}
                      className="w-full px-3 py-2 text-sm text-gray-900 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                      onChange={async (e) => {
                        setValue(`itens.${index}.nome_empresa`, e.target.value)
                        if (e.target.value) {
                          await salvarEmpresa(e.target.value)
                        }
                      }}
                    >
                      <option value="">Selecione uma empresa</option>
                      {/* Ao adicionar novo item, mostrar apenas empresas dos roteiros de produção */}
                      {(() => {
                        const totalItensExistentes = roteiros.reduce((acc, r) => acc + (r.itens?.length || 0), 0)
                        const empresasParaUsar = index >= totalItensExistentes ? empresasProducao : empresas
                        return empresasParaUsar.map((empresa) => (
                          <option key={empresa} value={empresa}>
                            {empresa}
                          </option>
                        ))
                      })()}
                    </select>
                    {errors.itens?.[index]?.nome_empresa && (
                      <p className="text-red-600 text-xs mt-1">
                        {errors.itens[index]?.nome_empresa?.message}
                      </p>
                    )}
                    {empresas.length === 0 && (
                      <p className="text-yellow-600 text-xs mt-1">
                        Nenhuma empresa cadastrada. Cadastre empresas em
                        {' '}
                        <Link href="/empresas" className="text-primary-600 hover:underline font-semibold">Cadastro de Empresas</Link>.
                      </p>
                    )}
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">
                      Pão *
                    </label>
                    <select
                      {...register(`itens.${index}.produto_id`, {
                        required: 'Pão é obrigatório',
                        valueAsNumber: true,
                      })}
                      value={itens?.[index]?.produto_id || 0}
                      className="w-full px-3 py-2 text-sm text-gray-900 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    >
                      <option value={0}>Selecione um pão</option>
                      {/* Ao adicionar novo item, mostrar apenas produtos dos roteiros de produção */}
                      {(() => {
                        const totalItensExistentes = roteiros.reduce((acc, r) => acc + (r.itens?.length || 0), 0)
                        const produtosParaUsar = index >= totalItensExistentes ? produtosProducao : produtos
                        return produtosParaUsar.map((produto) => (
                          <option key={produto.id} value={produto.id}>
                            {produto.nome}
                          </option>
                        ))
                      })()}
                    </select>
                    {errors.itens?.[index]?.produto_id && (
                      <p className="text-red-600 text-xs mt-1">
                        {errors.itens[index]?.produto_id?.message}
                      </p>
                    )}
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">
                      Quantidade *
                    </label>
                    <input
                      type="number"
                      min="1"
                      {...register(`itens.${index}.quantidade`, {
                        required: 'Quantidade é obrigatória',
                        valueAsNumber: true,
                        min: { value: 1, message: 'Quantidade deve ser maior que zero' },
                      })}
                      className="w-full px-3 py-2 text-sm text-gray-900 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    />
                    {errors.itens?.[index]?.quantidade && (
                      <p className="text-red-600 text-xs mt-1">
                        {errors.itens[index]?.quantidade?.message}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            )
          })}

          <button
            type="button"
            onClick={() => append({ nome_empresa: '', produto_id: 0, quantidade: 1 })}
            className="w-full py-3 border-2 border-dashed border-gray-300 rounded-lg text-gray-700 font-semibold hover:border-primary-500 hover:text-primary-600 transition-colors"
          >
            + Adicionar Item
          </button>
        </div>

        <div className="flex gap-4">
          <button
            type="submit"
            disabled={loading}
            className="flex-1 bg-primary-500 text-white px-6 py-3 rounded-lg font-semibold hover:bg-primary-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Salvando...' : 'Salvar Alterações'}
          </button>
          <Link
            href="/motoristas"
            className="px-6 py-3 border border-gray-300 text-gray-700 rounded-lg font-semibold hover:bg-gray-50 transition-colors"
          >
            Cancelar
          </Link>
        </div>
      </form>
        </div>

        {/* Coluna Direita: Pré-visualização */}
        <div className="lg:sticky lg:top-4 lg:self-start">
          <div className="bg-white rounded-lg shadow p-4 border-2 border-gray-300">
            <h2 className="text-lg font-bold text-gray-900 mb-3 pb-2 border-b border-gray-200">
              Pré-visualização do Roteiro
            </h2>
            {Object.keys(itensAgrupados).length > 0 ? (
              <div className="space-y-4">
                {Object.entries(itensAgrupados).map(([empresa, produtosEmpresa]) => {
                  const totalGeral = produtosEmpresa.reduce((sum, item) => sum + item.quantidade, 0)
                  return (
                    <div key={empresa} className="bg-gray-50 p-3 rounded-lg border border-gray-200">
                      <div style={{ fontFamily: 'Arial, sans-serif' }}>
                        <h3 style={{ color: '#333', borderBottom: '2px solid #550701', paddingBottom: '5px', marginBottom: '10px', fontSize: '14px', fontWeight: 'bold' }}>
                          Roteiro de Motorista
                        </h3>
                        <div style={{ marginBottom: '10px', fontSize: '12px' }}>
                          <p><strong>Motorista:</strong> {motoristaParam}</p>
                          <p><strong>Data:</strong> {watch('data_producao') || format(dataSelecionada, 'yyyy-MM-dd')}</p>
                          <p><strong>Período:</strong> {periodoSelecionado === 'manha' ? 'Manhã' : 'Noite'}</p>
                          <p><strong>Empresa:</strong> {empresa}</p>
                        </div>
                        <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '10px', fontSize: '11px' }}>
                          <thead>
                            <tr>
                              <th style={{ border: '1px solid #ddd', padding: '6px', textAlign: 'left', backgroundColor: '#550701', color: 'white', fontSize: '10px' }}>Pão</th>
                              <th style={{ border: '1px solid #ddd', padding: '6px', textAlign: 'center', backgroundColor: '#550701', color: 'white', fontSize: '10px' }}>Quantidade</th>
                            </tr>
                          </thead>
                          <tbody>
                            {produtosEmpresa.map((item, idx) => (
                              <tr key={idx}>
                                <td style={{ border: '1px solid #ddd', padding: '6px', backgroundColor: '#fff', fontSize: '10px' }}>{item.produto_nome}</td>
                                <td style={{ border: '1px solid #ddd', padding: '6px', textAlign: 'center', fontWeight: 'bold', backgroundColor: '#fff', fontSize: '10px' }}>{item.quantidade}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                        <div style={{ marginTop: '10px', padding: '8px', backgroundColor: '#550701', color: 'white', textAlign: 'center', fontSize: '11px', fontWeight: 'bold', borderRadius: '4px' }}>
                          Total: {totalGeral} {totalGeral === 1 ? 'unidade' : 'unidades'}
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500 text-sm">
                <p>Nenhum pedido no roteiro para esta data e período.</p>
                <p className="mt-2 text-xs">Adicione itens ou altere a data/período.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default function EditarRoteirosMotoristaPage() {
  return (
    <Suspense fallback={<Loading />}>
      <EditarRoteirosMotoristaContent />
    </Suspense>
  )
}
