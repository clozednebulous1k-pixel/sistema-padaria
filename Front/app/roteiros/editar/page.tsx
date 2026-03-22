'use client'

import { Suspense, useState, useEffect } from 'react'
import { useRegisterNavigationSave } from '@/components/NavigationSaveProvider'
import { useRouter, useSearchParams } from 'next/navigation'
import { useForm, useFieldArray } from 'react-hook-form'
import { roteiroApi, produtoApi, empresaApi, Produto, Roteiro, RoteiroItem } from '@/lib/api'
import toast from 'react-hot-toast'
import Link from 'next/link'
import { format, parseISO } from 'date-fns'
import Loading from '@/components/Loading'

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

function EditarRoteirosPorDataContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const diaParam = searchParams.get('dia')
  const periodoParam = searchParams.get('periodo') || 'manha'
  const [loading, setLoading] = useState(false)
  const [carregando, setCarregando] = useState(true)
  const [produtos, setProdutos] = useState<Produto[]>([])
  const [roteiroExistente, setRoteiroExistente] = useState<Roteiro | null>(null)
  const [empresas, setEmpresas] = useState<string[]>([])
  const [novaEmpresa, setNovaEmpresa] = useState<{ [key: number]: string }>({})

  const {
    register,
    handleSubmit,
    control,
    formState: { errors, isDirty },
    reset,
    watch,
    setValue,
    getValues,
  } = useForm<FormData>()

  const { fields, append, remove } = useFieldArray({
    control,
    name: 'itens',
  })

  const itens = watch('itens')
  const empresasParaSelect = empresas.filter((e) => !DIAS_SEMANA.includes(e))

  useEffect(() => {
    if (!diaParam || !DIAS_SEMANA.includes(diaParam)) {
      toast.error('Dia da semana inválido')
      router.push('/roteiros', { scroll: false })
      return
    }
    const inicializar = async () => {
      // Carregar empresas primeiro
      await carregarEmpresas()
      // Aguardar um pouco para garantir que as empresas estejam disponíveis
      await new Promise(resolve => setTimeout(resolve, 200))
      // Depois carregar dados do roteiro
      await carregarDados()
    }
    inicializar()
  }, [diaParam, periodoParam])

  const carregarEmpresas = async () => {
    try {
      // Carregar empresas do backend
      const empresasBackend = await empresaApi.listar()
      const nomesEmpresas = empresasBackend.map((e) => e.nome)
      
      // Também carregar do localStorage (para compatibilidade)
      const empresasLocalStorage = localStorage.getItem(STORAGE_KEY_EMPRESAS)
      let empresasLocal: string[] = []
      if (empresasLocalStorage) {
        try {
          empresasLocal = JSON.parse(empresasLocalStorage)
        } catch (e) {
          console.error('Erro ao parsear empresas do localStorage:', e)
        }
      }
      
      // Combinar e remover duplicatas - priorizar backend
      const todasEmpresas = Array.from(new Set([...nomesEmpresas, ...empresasLocal])).sort()
      setEmpresas(todasEmpresas)
      
      // Atualizar localStorage com todas as empresas (backend + local)
      localStorage.setItem(STORAGE_KEY_EMPRESAS, JSON.stringify(todasEmpresas))
      
      console.log(`✅ Empresas carregadas: ${todasEmpresas.length} empresa(s)`, todasEmpresas)
    } catch (error) {
      console.error('Erro ao carregar empresas do backend:', error)
      // Se der erro no backend, usar apenas localStorage
      try {
        const empresasSalvas = localStorage.getItem(STORAGE_KEY_EMPRESAS)
        if (empresasSalvas) {
          const empresasLocal = JSON.parse(empresasSalvas)
          setEmpresas(empresasLocal)
          console.log(`✅ Empresas carregadas do localStorage: ${empresasLocal.length} empresa(s)`, empresasLocal)
        } else {
          setEmpresas([])
          console.log('⚠️ Nenhuma empresa encontrada')
        }
      } catch (localError) {
        console.error('Erro ao carregar empresas do localStorage:', localError)
        setEmpresas([])
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

  const carregarDados = async () => {
    if (!diaParam) return

    try {
      setCarregando(true)
      
      // Obter data dos parâmetros ou usar a data salva no localStorage
      const dataParam = searchParams.get('data')
      let dataParaBuscar = dataParam || format(new Date(), 'yyyy-MM-dd')
      if (dataParaBuscar.includes('T')) {
        dataParaBuscar = dataParaBuscar.split('T')[0]
      } else if (dataParaBuscar.includes(' ')) {
        dataParaBuscar = dataParaBuscar.split(' ')[0]
      }
      
      // Buscar roteiros do dia da semana específico, período e data
      const roteiros = await roteiroApi.listar({})
      const roteiroDia = roteiros.find((r) => {
        if (r.nome_empresa !== diaParam || r.motorista || r.periodo !== periodoParam) {
          return false
        }
        
        // Verificar se a data_producao corresponde
        let dataRoteiro = r.data_producao
        if (dataRoteiro) {
          if (dataRoteiro.includes('T')) {
            dataRoteiro = dataRoteiro.split('T')[0]
          } else if (dataRoteiro.includes(' ')) {
            dataRoteiro = dataRoteiro.split(' ')[0]
          }
        }
        
        return dataRoteiro === dataParaBuscar
      })
      
      if (!roteiroDia) {
        toast.error('Roteiro não encontrado para este dia')
        router.push('/roteiros', { scroll: false })
        return
      }

      // Carregar dados completos do roteiro (com itens)
      const roteiroCompleto = await roteiroApi.buscar(roteiroDia.id)
      setRoteiroExistente(roteiroCompleto)

      // Carregar produtos
      const produtosData = await produtoApi.listar()
      setProdutos(produtosData.filter((p) => p.ativo))

      // Primeiro: coletar todas as empresas únicas dos itens
      const empresasDosItens = new Set<string>()
      if (roteiroCompleto.itens && roteiroCompleto.itens.length > 0) {
        for (const item of roteiroCompleto.itens) {
          // A empresa está na observação do item
          const empresa = (item.observacao && item.observacao.trim()) 
            ? item.observacao.trim() 
            : diaParam
          if (empresa && empresa.trim()) {
            empresasDosItens.add(empresa.trim())
          }
        }
      }

      // Salvar todas as empresas coletadas na lista
      for (const empresaNome of Array.from(empresasDosItens)) {
        await salvarEmpresa(empresaNome)
      }

      // Garantir que todas as empresas dos itens estejam na lista (usar atualização funcional para não perder as já carregadas da API)
      setEmpresas((prev) => {
        const empresasAtualizadas = Array.from(new Set([...prev, ...Array.from(empresasDosItens)])).sort()
        localStorage.setItem(STORAGE_KEY_EMPRESAS, JSON.stringify(empresasAtualizadas))
        return empresasAtualizadas
      })

      // Aguardar um pouco para garantir que o estado empresas foi atualizado antes de preencher o formulário
      await new Promise(resolve => setTimeout(resolve, 100))

      // Consolidar todos os itens do roteiro DEPOIS que as empresas foram carregadas
      const todosItens: FormData['itens'] = []
      
      if (roteiroCompleto.itens && roteiroCompleto.itens.length > 0) {
        roteiroCompleto.itens.forEach((item) => {
          // A empresa está na observação do item
          const empresa = (item.observacao && item.observacao.trim()) 
            ? item.observacao.trim() 
            : diaParam
          todosItens.push({
            nome_empresa: empresa,
            produto_id: item.produto_id,
            quantidade: item.quantidade,
          })
        })
      }

      // Preencher formulário usando reset para garantir que tudo seja atualizado corretamente
      const itensParaFormulario = todosItens.length > 0 ? todosItens : [{ nome_empresa: '', produto_id: 0, quantidade: 1 }]
      reset({
        itens: itensParaFormulario,
      })
    } catch (error: any) {
      toast.error('Erro ao carregar roteiro')
      console.error(error)
      router.push('/roteiros', { scroll: false })
    } finally {
      setCarregando(false)
    }
  }

  const persistRoteiroPorData = async (data: FormData, mode: 'submit' | 'auto') => {
    const fail = (message: string) => {
      toast.error(message)
      if (mode === 'auto') throw new Error('VALIDATION')
    }

    if (!diaParam || !roteiroExistente) {
      fail('Dia da semana ou roteiro não encontrado')
      if (mode === 'submit') return
      return
    }

    const itensValidos = data.itens.filter(
      (item) =>
        item.nome_empresa &&
        item.nome_empresa.trim() !== '' &&
        item.produto_id > 0 &&
        item.quantidade > 0
    )

    if (itensValidos.length === 0) {
      fail('Adicione pelo menos um item válido (com empresa, pão e quantidade)')
      if (mode === 'submit') return
      return
    }

    if (itensValidos.some((item) => !item.nome_empresa || item.nome_empresa.trim() === '')) {
      fail('Preencha o nome da empresa em todos os itens')
      if (mode === 'submit') return
      return
    }

    if (itensValidos.some((item) => item.produto_id === 0)) {
      fail('Selecione todos os pães')
      if (mode === 'submit') return
      return
    }

    if (itensValidos.some((item) => item.quantidade <= 0)) {
      fail('Quantidade deve ser maior que zero')
      if (mode === 'submit') return
      return
    }

    try {
      setLoading(true)

      for (const item of itensValidos) {
        if (item.nome_empresa && item.nome_empresa.trim()) {
          await salvarEmpresa(item.nome_empresa)
        }
      }

      const itensRoteiro: RoteiroItem[] = itensValidos.map((item) => ({
        produto_id: item.produto_id,
        quantidade: item.quantidade,
        observacao: item.nome_empresa.trim(),
      }))

      let dataFormatada = roteiroExistente.data_producao
      if (dataFormatada) {
        if (dataFormatada.includes('T')) {
          dataFormatada = dataFormatada.split('T')[0]
        } else if (dataFormatada.includes(' ')) {
          dataFormatada = dataFormatada.split(' ')[0]
        }
        try {
          const date = parseISO(dataFormatada)
          dataFormatada = format(date, 'yyyy-MM-dd')
        } catch (e) {
          console.log('Data já está no formato correto:', dataFormatada)
        }
      }

      await roteiroApi.atualizar(roteiroExistente.id, {
        nome_empresa: roteiroExistente.nome_empresa,
        data_producao: dataFormatada,
        periodo: periodoParam,
        status: roteiroExistente.status,
      })

      await roteiroApi.atualizarItens(roteiroExistente.id, itensRoteiro)

      if (mode === 'submit') {
        toast.success('Roteiro atualizado com sucesso!')
        router.push('/roteiros', { scroll: false })
      } else {
        toast.success('Alterações salvas automaticamente', { duration: 2000 })
        reset(getValues())
      }
    } catch (error: any) {
      const mensagemErro = error?.response?.data?.message || error?.message || 'Erro ao atualizar roteiro'
      toast.error(mensagemErro)
      console.error('Erro ao atualizar roteiro:', error)
      throw error
    } finally {
      setLoading(false)
    }
  }

  const onSubmit = handleSubmit(async (data) => {
    await persistRoteiroPorData(data, 'submit')
  })

  const saveBeforeNavigate = async () => {
    await new Promise<void>((resolve, reject) => {
      handleSubmit(
        async (data) => {
          try {
            await persistRoteiroPorData(data, 'auto')
            resolve()
          } catch (e) {
            reject(e)
          }
        },
        () => {
          toast.error('Corrija os erros do formulário antes de mudar de página.')
          reject(new Error('VALIDATION'))
        }
      )()
    })
  }

  useRegisterNavigationSave(saveBeforeNavigate, () => isDirty)

  if (!diaParam || !DIAS_SEMANA.includes(diaParam)) {
    return null
  }

  if (carregando) {
    return <Loading />
  }

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
          Editar Roteiro - {diaParam}
        </h1>
      </div>

      <div className="grid lg:grid-cols-2 gap-4">
        {/* Coluna Esquerda: Formulário de Edição */}
        <form onSubmit={onSubmit} className="space-y-3">
          <div className="bg-white rounded-lg shadow p-4">
            <h2 className="text-lg font-bold text-gray-900 mb-3">
              Editar Pedidos
            </h2>

          {produtos.length === 0 ? (
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
                    <label className="block text-xs font-semibold text-gray-700 mb-1">
                      Empresa/Cliente * <span className="text-gray-500 font-normal">({empresas.length} cadastradas)</span>
                    </label>
                    <div className="relative">
                      <select
                        {...register(`itens.${index}.nome_empresa`, {
                          required: 'Selecione ou adicione uma empresa',
                          onChange: (e) => {
                            if (e.target.value === '__nova__') {
                              // Não fazer nada, apenas mostrar o input
                            }
                          },
                        })}
                        className="w-full px-2 py-1.5 text-sm text-gray-900 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                      >
                        <option value="">Selecione uma empresa</option>
                        {empresasParaSelect.map((empresa) => (
                          <option key={empresa} value={empresa}>
                            {empresa}
                          </option>
                        ))}
                        <option value="__nova__">+ Adicionar Nova Empresa</option>
                      </select>
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
                            className="flex-1 px-2 py-1.5 text-sm text-gray-900 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
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
                            className="px-3 py-1.5 text-sm bg-primary-500 text-white rounded-lg hover:bg-primary-600 transition-colors font-semibold"
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
                    <label className="block text-xs font-semibold text-gray-700 mb-1">
                      Pão *
                    </label>
                    <select
                      {...register(`itens.${index}.produto_id`, {
                        required: 'Selecione um pão',
                        valueAsNumber: true,
                      })}
                      className="w-full px-3 py-1.5 text-sm text-gray-900 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    >
                      <option value={0}>Selecione um pão</option>
                      {produtos.map((produto) => (
                        <option key={produto.id} value={produto.id}>
                          {produto.nome}
                        </option>
                      ))}
                    </select>
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
                      {...register(`itens.${index}.quantidade`, {
                        required: 'Quantidade é obrigatória',
                        min: { value: 1, message: 'Mínimo 1' },
                        valueAsNumber: true,
                      })}
                      className="w-full px-3 py-1.5 text-sm text-gray-900 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
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
                          toast.error('É necessário manter pelo menos um item. Se deseja remover todos os itens, cancele a edição.')
                        } else {
                          remove(index)
                        }
                      }}
                      className="w-full bg-red-100 text-red-700 px-2 py-1.5 text-sm rounded-lg hover:bg-red-200 transition-colors font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
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
                  // Recarregar empresas antes de adicionar novo item para garantir que todas estejam disponíveis
                  await carregarEmpresas()
                  append({ nome_empresa: '', produto_id: 0, quantidade: 1 })
                }}
                className="w-full bg-gray-100 text-gray-700 px-4 py-2 text-sm rounded-lg font-semibold hover:bg-gray-200 transition-colors"
              >
                + Adicionar Item
              </button>
            </>
          )}
        </div>

          <div className="flex gap-2">
            <Link
              href="/roteiros"
              className="flex-1 bg-gray-100 text-gray-700 px-4 py-2 text-sm rounded-lg font-semibold hover:bg-gray-200 transition-colors text-center"
            >
              Cancelar
            </Link>
            <button
              type="submit"
              disabled={loading || produtos.length === 0}
              className="flex-1 bg-primary-500 text-white px-4 py-2 text-sm rounded-lg font-semibold hover:bg-primary-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Salvando...' : 'Salvar Alterações'}
            </button>
          </div>
        </form>

        {/* Coluna Direita: Pré-visualização da Impressão */}
        <div className="lg:sticky lg:top-4 lg:self-start">
          <div className="bg-white rounded-lg shadow-lg p-3 border-2 border-gray-300">
            <h2 className="text-sm font-bold text-gray-900 mb-2 pb-1 border-b border-gray-200">
              Pré-visualização da Impressão
            </h2>
            <div className="bg-gray-50 p-2 rounded-lg" style={{ fontFamily: 'Arial, sans-serif' }}>
              {itens && itens.length > 0 && itens.some((item) => item.nome_empresa && item.nome_empresa.trim() && item.produto_id > 0) ? (
                <>
                  <h1 style={{ color: '#333', borderBottom: '2px solid #550701', paddingBottom: '8px', marginBottom: '12px', fontSize: '18px', textAlign: 'center', fontWeight: 'bold' }}>
                    Roteiro de Entregas
                  </h1>
                  <div style={{ marginBottom: '14px', fontSize: '14px', textAlign: 'center', lineHeight: 1.5 }}>
                    <p style={{ margin: 0 }}>
                      <strong>Dia:</strong> {diaParam}
                      <span aria-hidden="true"> &nbsp;•&nbsp; </span>
                      <strong>Data:</strong>{' '}
                      {roteiroExistente?.data_producao
                        ? format(parseISO(roteiroExistente.data_producao.split('T')[0]), 'dd/MM/yyyy')
                        : '-'}
                      <span aria-hidden="true"> &nbsp;•&nbsp; </span>
                      <strong>Período:</strong> {periodoParam === 'manha' ? 'Manhã' : 'Noite'}
                    </p>
                  </div>
                  <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '10px', fontSize: '13px' }}>
                    <thead>
                      <tr>
                        <th style={{ border: '1px solid #ddd', padding: '8px 10px', backgroundColor: '#550701', color: 'white', textAlign: 'left', fontSize: '12px' }}>Empresa</th>
                        <th style={{ border: '1px solid #ddd', padding: '8px 10px', backgroundColor: '#550701', color: 'white', textAlign: 'left', fontSize: '12px' }}>Pão</th>
                        <th style={{ border: '1px solid #ddd', padding: '8px 10px', backgroundColor: '#550701', color: 'white', textAlign: 'center', fontSize: '12px' }}>Qtd</th>
                      </tr>
                    </thead>
                    <tbody>
                      {itens
                        .filter((item) => item.nome_empresa && item.nome_empresa.trim() && item.produto_id > 0)
                        .map((item, index) => {
                          const produto = produtos.find((p) => p.id === item.produto_id)
                          return (
                            <tr key={index}>
                              <td style={{ border: '1px solid #ddd', padding: '8px 10px', textAlign: 'left', fontSize: '13px' }}>{item.nome_empresa || '-'}</td>
                              <td style={{ border: '1px solid #ddd', padding: '8px 10px', textAlign: 'left', fontSize: '13px' }}>{produto?.nome || 'Produto não selecionado'}</td>
                              <td style={{ border: '1px solid #ddd', padding: '8px 10px', textAlign: 'center', fontSize: '13px' }}>{item.quantidade || 0}</td>
                            </tr>
                          )
                        })}
                    </tbody>
                  </table>
                  
                  {/* Calcular totais por tipo de pão */}
                  {(() => {
                    const totaisPorPao = new Map<string, number>()
                    itens
                      .filter((item) => item.nome_empresa && item.nome_empresa.trim() && item.produto_id > 0)
                      .forEach((item) => {
                        const produto = produtos.find((p) => p.id === item.produto_id)
                        if (produto) {
                          const quantidadeAtual = totaisPorPao.get(produto.nome) || 0
                          totaisPorPao.set(produto.nome, quantidadeAtual + (item.quantidade || 0))
                        }
                      })
                    const totaisArray = Array.from(totaisPorPao.entries()).map(([pao, quantidadeTotal]) => ({ pao, quantidadeTotal }))
                    const totalGeral = totaisArray.reduce((sum, total) => sum + total.quantidadeTotal, 0)
                    
                    return (
                      <>
                        <h2 style={{ marginTop: '10px', color: '#333', borderBottom: '2px solid #550701', paddingBottom: '6px', fontSize: '16px', textAlign: 'center', fontWeight: 'bold' }}>
                          Total de Pães por Tipo
                        </h2>
                        <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '10px', fontSize: '13px' }}>
                          <thead>
                            <tr>
                              <th style={{ border: '1px solid #ddd', padding: '8px 10px', backgroundColor: '#550701', color: 'white', textAlign: 'left', fontSize: '12px' }}>Pão</th>
                              <th style={{ border: '1px solid #ddd', padding: '8px 10px', backgroundColor: '#550701', color: 'white', textAlign: 'center', fontSize: '12px' }}>Total</th>
                            </tr>
                          </thead>
                          <tbody>
                            {totaisArray.map((total, index) => (
                              <tr key={index}>
                                <td style={{ border: '1px solid #ddd', padding: '8px 10px', textAlign: 'left', fontSize: '13px' }}>{total.pao}</td>
                                <td style={{ border: '1px solid #ddd', padding: '8px 10px', textAlign: 'center', fontWeight: 'bold', fontSize: '13px' }}>{total.quantidadeTotal}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                        <p style={{ marginTop: '8px', fontSize: '14px', fontWeight: 'bold', textAlign: 'center' }}>
                          Total Geral: {totalGeral} pães
                        </p>
                      </>
                    )
                  })()}
                </>
              ) : (
                <div style={{ textAlign: 'center', padding: '20px', color: '#666', fontSize: '12px' }}>
                  <p>Adicione itens ao roteiro para ver a pré-visualização</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function EditarRoteirosPorDataPage() {
  return (
    <Suspense fallback={<Loading />}>
      <EditarRoteirosPorDataContent />
    </Suspense>
  )
}