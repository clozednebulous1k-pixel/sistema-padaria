'use client'

import { Suspense, useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useForm, useFieldArray, Controller } from 'react-hook-form'
import { roteiroApi, produtoApi, empresaApi, Produto, RoteiroItem, Roteiro } from '@/lib/api'
import toast from 'react-hot-toast'
import Link from 'next/link'
import { format } from 'date-fns'
import { registrarClique } from '@/lib/audit'
import { useTheme } from '@/components/ThemeProvider'
import Loading from '@/components/Loading'
import { SelectComBusca } from '@/components/SelectComBusca'
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

interface FormData {
  itens: Array<{
    nome_empresa: string
    produto_id: number
    quantidade: number
  }>
}

const STORAGE_KEY_EMPRESAS = 'empresas_padaria'

function NovoRoteiroContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const diaParam = searchParams.get('dia')
  const periodoParam = searchParams.get('periodo') || 'manha'
  const dataParam = searchParams.get('data')
  const slotParam = searchParams.get('slot')
  const slotIndex = slotParam ? Math.max(0, parseInt(slotParam, 10) - 1) : 0
  const nomeParam = searchParams.get('nome')
  const [loading, setLoading] = useState(false)
  const [produtos, setProdutos] = useState<Produto[]>([])
  const [carregandoProdutos, setCarregandoProdutos] = useState(true)
  const [empresas, setEmpresas] = useState<string[]>([])
  const [novaEmpresa, setNovaEmpresa] = useState<{ [key: number]: string }>({})
  const [roteiroExistente, setRoteiroExistente] = useState<Roteiro | null>(null)

  const {
    register,
    handleSubmit,
    control,
    formState: { errors },
    watch,
    setValue,
  } = useForm<FormData>({
    defaultValues: {
      itens: [{ nome_empresa: '', produto_id: 0, quantidade: 1 }],
    },
  })

  const { fields, append, remove } = useFieldArray({
    control,
    name: 'itens',
  })

  const itens = watch('itens')
  const empresasParaSelect = empresas
    .filter((e) => !DIAS_SEMANA.includes(e))
    .slice()
    .sort((a, b) => a.localeCompare(b, 'pt-BR', { sensitivity: 'base' }))
  const { darkMode } = useTheme()

  useEffect(() => {
    if (!diaParam || !DIAS_SEMANA.includes(diaParam)) {
      toast.error('Dia da semana inválido')
      router.push('/roteiros', { scroll: false })
      return
    }
    carregarProdutos()
    carregarEmpresas()
    carregarRoteiroExistente()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [diaParam, periodoParam, dataParam, slotIndex])

  const extrairSlotDeObservacoes = (obs: string | null | undefined): number | null => {
    if (!obs) return null
    const match = obs.match(/Roteiro\s*(\d+)/i)
    return match ? parseInt(match[1], 10) : null
  }

  const ordenarRoteirosPorSlot = (lista: Roteiro[]): (Roteiro | undefined)[] => {
    const comSlot = lista.filter((r) => extrairSlotDeObservacoes(r.observacoes) !== null)
    const maxSlot = Math.max(3, comSlot.length > 0 ? Math.max(...comSlot.map((r) => extrairSlotDeObservacoes(r.observacoes)!)) : 0)
    const resultado: (Roteiro | undefined)[] = []
    for (let i = 1; i <= maxSlot; i++) {
      const r = comSlot.find((x) => extrairSlotDeObservacoes(x.observacoes) === i)
      resultado[i - 1] = r
    }
    // Manter posições fixas (slot 1, 2, 3) - não preencher vazios nem filtrar
    return resultado
  }

  const carregarRoteiroExistente = async () => {
    if (!diaParam) return
    
    try {
      let dataParaComparar = dataParam || format(new Date(), 'yyyy-MM-dd')
      if (dataParaComparar.includes('T')) dataParaComparar = dataParaComparar.split('T')[0]
      else if (dataParaComparar.includes(' ')) dataParaComparar = dataParaComparar.split(' ')[0]
      
      const roteiros = await roteiroApi.listar({})
      const roteirosFiltrados = roteiros.filter((r) => {
        if (r.nome_empresa !== diaParam || r.motorista) return false
        const periodoRoteiro = r.periodo || 'manha'
        if (periodoRoteiro !== periodoParam) return false
        let dataRoteiro = r.data_producao
        if (dataRoteiro) {
          if (dataRoteiro.includes('T')) dataRoteiro = dataRoteiro.split('T')[0]
          else if (dataRoteiro.includes(' ')) dataRoteiro = dataRoteiro.split(' ')[0]
        }
        return dataRoteiro === dataParaComparar
      })

      const roteirosDoDia = ordenarRoteirosPorSlot(roteirosFiltrados)
      const roteiroNoSlot = roteirosDoDia[slotIndex]
      if (roteiroNoSlot) {
        const roteiroCompleto = await roteiroApi.buscar(roteiroNoSlot.id)
        setRoteiroExistente(roteiroCompleto)
      } else {
        setRoteiroExistente(null)
      }
    } catch (error) {
      console.error('Erro ao carregar roteiro existente:', error)
      setRoteiroExistente(null)
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

  const carregarProdutos = async () => {
    try {
      setCarregandoProdutos(true)
      const data = await produtoApi.listar()
      setProdutos(data.filter((p) => p.ativo))
    } catch (error: any) {
      toast.error('Erro ao carregar produtos')
      console.error(error)
    } finally {
      setCarregandoProdutos(false)
    }
  }

  const onSubmit = async (data: FormData) => {
    registrarClique(
      roteiroExistente ? 'Adicionar Pedidos' : 'Criar Roteiro',
      'Roteiros',
      'Novo Roteiro',
      'roteiro',
      roteiroExistente?.id,
      `Dia: ${diaParam}, Período: ${periodoParam}`
    )
    
    if (!diaParam) {
      toast.error('Dia da semana não especificado')
      return
    }

    // Filtrar itens vazios ou inválidos antes de validar
    // Garantir que quantidade seja um número inteiro
    const itensValidos = data.itens
      .map((item) => ({
        ...item,
        quantidade: Math.floor(Number(item.quantidade)) || 1, // Garantir número inteiro
      }))
      .filter(
      (item) =>
        item.nome_empresa &&
        item.nome_empresa.trim() !== '' &&
        item.produto_id > 0 &&
        item.quantidade > 0
    )

    if (itensValidos.length === 0) {
      toast.error('Adicione pelo menos um item válido (com empresa, pão e quantidade)')
      return
    }

    // Validar apenas os itens válidos
    if (itensValidos.some((item) => !item.nome_empresa || item.nome_empresa.trim() === '')) {
      toast.error('Preencha o nome da empresa em todos os itens')
      return
    }

    if (itensValidos.some((item) => item.produto_id === 0)) {
      toast.error('Selecione todos os pães')
      return
    }

    if (itensValidos.some((item) => item.quantidade <= 0)) {
      toast.error('Quantidade deve ser maior que zero')
      return
    }

    try {
      setLoading(true)
      
      // Salvar empresas usadas (apenas dos itens válidos)
      for (const item of itensValidos) {
        if (item.nome_empresa && item.nome_empresa.trim()) {
          await salvarEmpresa(item.nome_empresa)
        }
      }

      // Criar itens do roteiro com a empresa na observação (apenas itens válidos)
      const novosItens: RoteiroItem[] = itensValidos.map((item) => ({
        produto_id: item.produto_id,
        quantidade: item.quantidade,
        observacao: item.nome_empresa.trim(), // Armazenar empresa na observação do item
      }))

      // Formatar data para criação/verificação (usar a data do parâmetro ou hoje)
      let dataParaCriar = dataParam || format(new Date(), 'yyyy-MM-dd')
      if (dataParaCriar.includes('T')) {
        dataParaCriar = dataParaCriar.split('T')[0]
      } else if (dataParaCriar.includes(' ')) {
        dataParaCriar = dataParaCriar.split(' ')[0]
      }
      
      const roteiros = await roteiroApi.listar({})
      const roteirosFiltrados = roteiros.filter((r) => {
        if (r.nome_empresa !== diaParam || r.motorista) return false
        const periodoRoteiro = r.periodo || 'manha'
        if (periodoRoteiro !== periodoParam) return false
        let dataRoteiro = r.data_producao
        if (dataRoteiro) {
          if (dataRoteiro.includes('T')) dataRoteiro = dataRoteiro.split('T')[0]
          else if (dataRoteiro.includes(' ')) dataRoteiro = dataRoteiro.split(' ')[0]
        }
        return dataRoteiro === dataParaCriar
      })

      const roteirosDoDia = ordenarRoteirosPorSlot(roteirosFiltrados)
      const roteiroNoSlot = roteirosDoDia[slotIndex]
      
      if (roteiroNoSlot) {
        const roteiroCompleto = await roteiroApi.buscar(roteiroNoSlot.id)
        const itensExistentes: RoteiroItem[] = (roteiroCompleto.itens || []).map((item) => ({
          produto_id: item.produto_id,
          quantidade: item.quantidade,
          observacao: item.observacao || undefined,
        }))
        const todosItens = [...itensExistentes, ...novosItens]
        await roteiroApi.atualizarItens(roteiroNoSlot.id, todosItens)
        toast.success(`${novosItens.length} pedido(s) adicionado(s) ao Roteiro ${slotIndex + 1}!`)
      } else {
        await roteiroApi.criar({
          nome_empresa: diaParam,
          data_producao: dataParaCriar,
          periodo: periodoParam,
          observacoes: nomeParam?.trim() || `Roteiro ${slotIndex + 1}`,
          status: 'pendente' as const,
          itens: novosItens,
        })
        toast.success(`Roteiro ${slotIndex + 1} criado com ${novosItens.length} pedido(s)!`)
      }
      
      router.push('/roteiros', { scroll: false })
    } catch (error: any) {
      toast.error('Erro ao salvar roteiro')
      console.error(error)
    } finally {
      setLoading(false)
    }
  }

  if (!diaParam || !DIAS_SEMANA.includes(diaParam)) {
    return null
  }

  // Agrupar itens por empresa para a pré-visualização (atualiza em tempo real com watch)
  const itensAgrupados = itens
    .map((item, index) => {
      const empresaNome = item.nome_empresa === '__nova__'
        ? (novaEmpresa[index] || '').trim()
        : (item.nome_empresa || '').trim()
      return { ...item, empresaResolvida: empresaNome, index }
    })
    .filter((item) => item.empresaResolvida && Number(item.produto_id) > 0)
    .reduce((acc, item) => {
      const empresa = item.empresaResolvida!
      const produto = produtos.find((p) => p.id === Number(item.produto_id))
      if (!produto) return acc
      
      if (!acc[empresa]) {
        acc[empresa] = []
      }
      
      const qtd = Number(item.quantidade) || 0
      const itemExistente = acc[empresa].find((i) => i.produto_id === produto.id)
      if (itemExistente) {
        itemExistente.quantidade += qtd
      } else {
        acc[empresa].push({
          produto_id: produto.id,
          produto_nome: produto.nome,
          quantidade: qtd,
          opcao_relatorio: produto.opcao_relatorio ?? null,
          recheio: produto.recheio ?? null,
        })
      }

      return acc
    }, {} as Record<string, Array<{ produto_id: number; produto_nome: string; quantidade: number; opcao_relatorio: string | null; recheio: string | null }>>)

  // Lista plana para pré-visualização igual à tela de Editar (uma tabela única + Pães por tipo)
  const itensParaTabela = Object.entries(itensAgrupados).flatMap(([empresa, items]) =>
    items.map((item) => ({
      empresa,
      produto_nome: item.produto_nome,
      quantidade: item.quantidade,
      opcao_relatorio: item.opcao_relatorio,
      recheio: item.recheio,
    }))
  )
  const totalPorTipo = itensParaTabela.reduce((acc, item) => {
    const partes = [item.produto_nome]
    if (item.recheio) partes.push(item.recheio)
    if (item.opcao_relatorio) partes.push(opcaoRelatorioParaLabel(item.opcao_relatorio))
    const nomeExibicao = partes.join(' ')
    acc[nomeExibicao] = (acc[nomeExibicao] || 0) + item.quantidade
    return acc
  }, {} as Record<string, number>)

  return (
    <div className="container mx-auto px-4 max-w-7xl">
      <div className="mb-4">
        <Link
          href="/roteiros"
          className="text-primary-600 hover:text-primary-700 font-semibold text-sm mb-1 inline-block"
        >
          ← Voltar para roteiros
        </Link>
        <h1 className="text-2xl font-bold text-gray-900 mt-2">
          Adicionar Pedidos - {diaParam}
        </h1>
        <p className="text-gray-600 mt-1 text-sm">
          {roteiroExistente
            ? `Adicionando pedidos ao ${roteiroExistente.observacoes || `Roteiro ${slotIndex + 1}`} de ${diaParam}`
            : `Criando ${nomeParam?.trim() || `Roteiro ${slotIndex + 1}`} para ${diaParam}`}
        </p>
      </div>

      <div className="grid lg:grid-cols-2 gap-4">
        {/* Coluna Esquerda: Formulário */}
        <div>
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-3">
        <div className="bg-white rounded-lg shadow-lg p-4">
          <h2 className="text-lg font-bold text-gray-900 mb-3">
            Adicionar Pães
          </h2>

          {carregandoProdutos ? (
            <div className="text-center py-8 text-gray-600">
              Carregando produtos...
            </div>
          ) : produtos.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-gray-600 mb-4">
                Nenhum produto ativo cadastrado
              </p>
              <Link
                href="/produtos/novo"
                className="text-primary-600 hover:text-primary-700 font-semibold"
              >
                Cadastrar Produto
              </Link>
            </div>
          ) : (
            <>
              {fields.map((field, index) => (
                <div
                  key={field.id}
                  className="grid md:grid-cols-12 gap-2 mb-2 p-2 bg-gray-50 rounded-lg border border-gray-200"
                >
                  <div className="md:col-span-4">
                    <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                      Empresa/Cliente * <span className="text-gray-500 font-normal">({empresasParaSelect.length} cadastradas)</span>
                    </label>
                    <div className="relative">
                      <Controller
                        control={control}
                        name={`itens.${index}.nome_empresa`}
                        rules={{
                          required: 'Selecione ou adicione uma empresa',
                          validate: (v) => (v && v !== '__nova__') || 'Selecione ou adicione uma empresa',
                        }}
                        render={({ field }) => (
                          <SelectComBusca
                            options={empresasParaSelect.map((e) => ({ value: e, label: e }))}
                            value={field.value === '__nova__' ? '' : (field.value || '')}
                            onChange={(v) => field.onChange(v)}
                            placeholder="Digite para buscar empresa..."
                            dark={darkMode}
                          />
                        )}
                      />
                      <button
                        type="button"
                        onClick={() => setValue(`itens.${index}.nome_empresa`, '__nova__')}
                        className="mt-1.5 text-xs text-primary-600 dark:text-primary-400 hover:underline"
                      >
                        + Adicionar Nova Empresa
                      </button>
                      {watch(`itens.${index}.nome_empresa`) === '__nova__' && (
                        <div className="mt-2 flex gap-2">
                          <input
                            type="text"
                            value={novaEmpresa[index] || ''}
                            onChange={(e) => {
                              setNovaEmpresa({ ...novaEmpresa, [index]: e.target.value })
                            }}
                            onKeyDown={async (e) => {
                              if (e.key === 'Enter') {
                                e.preventDefault()
                                const valor = novaEmpresa[index]?.trim()
                                if (valor) {
                                  await salvarEmpresa(valor)
                                  setValue(`itens.${index}.nome_empresa`, valor)
                                  setNovaEmpresa({ ...novaEmpresa, [index]: '' })
                                }
                              }
                            }}
                            className="flex-1 px-4 py-2 text-gray-900 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                            placeholder="Digite o nome da empresa e pressione Enter"
                            autoFocus
                          />
                          <button
                            type="button"
                            onClick={async () => {
                              const valor = novaEmpresa[index]?.trim()
                              if (valor) {
                                await salvarEmpresa(valor)
                                setValue(`itens.${index}.nome_empresa`, valor)
                                setNovaEmpresa({ ...novaEmpresa, [index]: '' })
                              }
                            }}
                            className="px-4 py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600 transition-colors font-semibold"
                          >
                            Salvar
                          </button>
                        </div>
                      )}
                    </div>
                    {errors.itens?.[index]?.nome_empresa && (
                      <p className="text-red-600 text-sm mt-1">
                        {errors.itens[index]?.nome_empresa?.message}
                      </p>
                    )}
                  </div>

                  <div className="md:col-span-5">
                    <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                      Pão *
                    </label>
                    <Controller
                      control={control}
                      name={`itens.${index}.produto_id`}
                      rules={{ required: 'Selecione um pão', min: { value: 1, message: 'Selecione um pão' } }}
                      render={({ field }) => (
                        <SelectComBusca<number>
                          options={[
                            { value: 0, label: 'Selecione um pão' },
                            ...produtos.map((p) => {
                              const partes = [p.nome]
                              if (p.recheio) partes.push(p.recheio)
                              if (p.opcao_relatorio) partes.push(opcaoRelatorioParaLabel(p.opcao_relatorio))
                              return { value: p.id, label: partes.join(' ') }
                            }),
                          ]}
                          value={field.value ?? 0}
                          onChange={(v) => field.onChange(v)}
                          placeholder="Digite para buscar pão..."
                          dark={darkMode}
                        />
                      )}
                    />
                    {errors.itens?.[index]?.produto_id && (
                      <p className="text-red-600 text-sm mt-1">
                        {errors.itens[index]?.produto_id?.message}
                      </p>
                    )}
                  </div>

                  <div className="md:col-span-2">
                    <label className="block text-xs font-semibold text-gray-700 mb-1">
                      Quantidade *
                    </label>
                    <input
                      type="number"
                      min="1"
                      step="1"
                      {...register(`itens.${index}.quantidade`, {
                        required: 'Quantidade é obrigatória',
                        min: { value: 1, message: 'Mínimo 1' },
                        valueAsNumber: true,
                      })}
                      onInput={(e) => {
                        // Garantir que o valor seja preservado exatamente como digitado
                        const target = e.target as HTMLInputElement
                        const value = target.value
                        if (value && value !== '') {
                          const num = parseInt(value, 10)
                          if (!isNaN(num) && num >= 1) {
                            // Não atualizar o valor aqui, apenas garantir que está correto
                            // O react-hook-form já faz a conversão com valueAsNumber
                          }
                        }
                      }}
                      className="w-full px-4 py-3 text-gray-900 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    />
                    {errors.itens?.[index]?.quantidade && (
                      <p className="text-red-600 text-sm mt-1">
                        {errors.itens[index]?.quantidade?.message}
                      </p>
                    )}
                  </div>

                  <div className="md:col-span-1 flex items-end">
                    <button
                      type="button"
                      onClick={() => {
                        if (fields.length === 1) {
                          toast.error('É necessário manter pelo menos um item. Limpe os campos se deseja adicionar novos dados.')
                        } else {
                          remove(index)
                        }
                      }}
                      className="w-full bg-red-100 text-red-700 px-4 py-3 rounded-lg hover:bg-red-200 transition-colors font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
                      disabled={fields.length === 1}
                      title={fields.length === 1 ? 'É necessário manter pelo menos um item' : 'Remover item'}
                    >
                      ×
                    </button>
                  </div>
                </div>
              ))}

              <button
                type="button"
                onClick={async () => {
                  await carregarEmpresas()
                  append({ nome_empresa: '', produto_id: 0, quantidade: 1 })
                }}
                className="w-full bg-gray-100 text-gray-700 px-6 py-3 rounded-lg font-semibold hover:bg-gray-200 transition-colors"
              >
                + Adicionar Item
              </button>
            </>
          )}
        </div>

        <div className="flex gap-4">
          <Link
            href="/roteiros"
            className="flex-1 bg-gray-100 text-gray-700 px-6 py-3 rounded-lg font-semibold hover:bg-gray-200 transition-colors text-center"
          >
            Cancelar
          </Link>
          <button
            type="submit"
            disabled={loading || produtos.length === 0}
            className="flex-1 bg-primary-500 text-white px-6 py-3 rounded-lg font-semibold hover:bg-primary-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Salvando...' : roteiroExistente ? 'Adicionar Pedidos' : 'Criar Roteiro'}
          </button>
        </div>
      </form>
        </div>

        {/* Coluna Direita: Pré-visualização */}
        <div className="lg:sticky lg:top-4 lg:self-start">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4 border-2 border-gray-300 dark:border-gray-600">
            <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100 mb-3 pb-2 border-b border-gray-200 dark:border-gray-600">
              Pré-visualização do Pedido
            </h2>
            {itensParaTabela.length > 0 ? (
              <div className="bg-gray-50 dark:bg-gray-700/50 p-3 rounded-lg border border-gray-200 dark:border-gray-600">
                <div style={{ fontFamily: 'Arial, sans-serif' }}>
                  <h3 style={{ color: darkMode ? '#f1f5f9' : '#333', borderBottom: `2px solid ${darkMode ? '#0d9488' : '#550701'}`, paddingBottom: '5px', marginBottom: '10px', fontSize: '14px', fontWeight: 'bold' }}>
                    Roteiro de Entregas
                  </h3>
                  <div style={{ marginBottom: '10px', fontSize: '12px', color: darkMode ? '#e2e8f0' : '#333' }}>
                    <p><strong>Dia:</strong> {diaParam}</p>
                    <p><strong>Data:</strong> {dataParam || format(new Date(), 'yyyy-MM-dd')}</p>
                    <p><strong>Período:</strong> {periodoParam === 'manha' ? 'Manhã' : 'Noite'}</p>
                  </div>
                  <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '15px', fontSize: '11px' }}>
                    <thead>
                      <tr>
                        <th style={{ border: `1px solid ${darkMode ? '#475569' : '#ddd'}`, padding: '6px', textAlign: 'left', backgroundColor: darkMode ? '#0d9488' : '#550701', color: 'white', fontSize: '10px' }}>Empresa</th>
                        <th style={{ border: `1px solid ${darkMode ? '#475569' : '#ddd'}`, padding: '6px', textAlign: 'left', backgroundColor: darkMode ? '#0d9488' : '#550701', color: 'white', fontSize: '10px' }}>Pão</th>
                        <th style={{ border: `1px solid ${darkMode ? '#475569' : '#ddd'}`, padding: '6px', textAlign: 'center', backgroundColor: darkMode ? '#0d9488' : '#550701', color: 'white', fontSize: '10px' }}>Quantidade</th>
                      </tr>
                    </thead>
                    <tbody>
                      {itensParaTabela.map((item, idx) => {
                        const partes = [item.produto_nome]
                        if (item.recheio) partes.push(item.recheio)
                        if (item.opcao_relatorio) partes.push(opcaoRelatorioParaLabel(item.opcao_relatorio))
                        const nomePao = partes.join(' ')
                        return (
                        <tr key={idx}>
                          <td style={{ border: `1px solid ${darkMode ? '#475569' : '#ddd'}`, padding: '6px', backgroundColor: darkMode ? '#1e293b' : '#fff', color: darkMode ? '#f1f5f9' : '#333', fontSize: '10px' }}>{item.empresa}</td>
                          <td style={{ border: `1px solid ${darkMode ? '#475569' : '#ddd'}`, padding: '6px', backgroundColor: darkMode ? '#1e293b' : '#fff', color: darkMode ? '#f1f5f9' : '#333', fontSize: '10px' }}>{nomePao}</td>
                          <td style={{ border: `1px solid ${darkMode ? '#475569' : '#ddd'}`, padding: '6px', textAlign: 'center', fontWeight: 'bold', backgroundColor: darkMode ? '#1e293b' : '#fff', color: darkMode ? '#f1f5f9' : '#333', fontSize: '10px' }}>{item.quantidade}</td>
                        </tr>
                      )})}
                    </tbody>
                  </table>
                  <div style={{ padding: '12px', backgroundColor: darkMode ? '#1e293b' : '#fff', border: `1px solid ${darkMode ? '#475569' : '#ddd'}`, borderRadius: '4px' }}>
                    <h4 style={{ margin: '0 0 8px 0', fontSize: '12px', color: darkMode ? '#0d9488' : '#550701', fontWeight: 'bold' }}>Pães por tipo</h4>
                    <ul style={{ margin: 0, paddingLeft: '20px', fontSize: '11px', color: darkMode ? '#e2e8f0' : '#333' }}>
                      {Object.entries(totalPorTipo).sort(([a], [b]) => a.localeCompare(b)).map(([nome, qtd]) => (
                        <li key={nome} style={{ margin: '4px 0' }}><strong>{nome}:</strong> {qtd}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500 text-sm">
                <p>Adicione itens ao formulário para ver a pré-visualização</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default function NovoRoteiroPage() {
  return (
    <Suspense fallback={<Loading />}>
      <NovoRoteiroContent />
    </Suspense>
  )
}