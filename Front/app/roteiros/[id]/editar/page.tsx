'use client'

import { useState, useEffect } from 'react'
import { useRegisterNavigationSave } from '@/components/NavigationSaveProvider'
import { useRouter, useParams } from 'next/navigation'
import { useForm, useFieldArray, Controller } from 'react-hook-form'
import { roteiroApi, produtoApi, empresaApi, Produto, Roteiro, RoteiroItem } from '@/lib/api'
import toast from 'react-hot-toast'
import Link from 'next/link'
import { format, parseISO } from 'date-fns'
import { useTheme } from '@/components/ThemeProvider'
import { SelectComBusca } from '@/components/SelectComBusca'
import { opcaoRelatorioParaLabel } from '@/lib/opcoesRelatorio'
import { formatarDataProducaoBR } from '@/lib/formatarDataBrasil'

interface FormData {
  data_producao: string
  periodo: string
  itens: Array<{
    nome_empresa: string
    produto_id: number
    quantidade: number
  }>
}

const STORAGE_KEY_EMPRESAS = 'empresas_padaria'

const DIAS_SEMANA = ['Segunda-feira', 'Terça-feira', 'Quarta-feira', 'Quinta-feira', 'Sexta-feira', 'Sábado', 'Domingo']

export default function EditarRoteiroPage() {
  const router = useRouter()
  const params = useParams()
  const id = Number(params.id)
  const { darkMode } = useTheme()
  const [loading, setLoading] = useState(false)
  const [carregando, setCarregando] = useState(true)
  const [produtos, setProdutos] = useState<Produto[]>([])
  const [roteiro, setRoteiro] = useState<Roteiro | null>(null)
  const [empresas, setEmpresas] = useState<string[]>([])
  const [novaEmpresa, setNovaEmpresa] = useState<{ [key: number]: string }>({})

  const {
    register,
    handleSubmit,
    control,
    formState: { errors, isDirty },
    setValue,
    watch,
    reset,
    getValues,
  } = useForm<FormData>({
    defaultValues: {
      data_producao: '',
      periodo: 'manha',
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

  useEffect(() => {
    const inicializar = async () => {
      // Carregar empresas primeiro
      await carregarEmpresas()
      // Depois carregar dados do roteiro (que precisa das empresas carregadas)
      await carregarDados()
    }
    inicializar()
  }, [id])

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

  const carregarDados = async () => {
    try {
      setCarregando(true)
      const [roteiroData, produtosData] = await Promise.all([
        roteiroApi.buscar(id),
        produtoApi.listar(),
      ])
      setRoteiro(roteiroData)
      setProdutos(produtosData.filter((p) => p.ativo))

      // Preencher formulário - garantir que a data esteja no formato YYYY-MM-DD
      let dataFormatada = roteiroData.data_producao
      if (dataFormatada) {
        // Se a data vier com hora (ISO), extrair apenas a parte da data
        if (dataFormatada.includes('T')) {
          dataFormatada = dataFormatada.split('T')[0]
        } else if (dataFormatada.includes(' ')) {
          dataFormatada = dataFormatada.split(' ')[0]
        }
        // Garantir formato YYYY-MM-DD
        const date = parseISO(dataFormatada)
        dataFormatada = format(date, 'yyyy-MM-dd')
      }

      // Primeiro: coletar todas as empresas únicas dos itens
      const empresasDosItens = new Set<string>()
      if (roteiroData.itens && roteiroData.itens.length > 0) {
        for (const item of roteiroData.itens) {
          if (item.observacao && item.observacao.trim()) {
            empresasDosItens.add(item.observacao.trim())
          }
        }
      }
      if (roteiroData.nome_empresa && roteiroData.nome_empresa.trim()) {
        empresasDosItens.add(roteiroData.nome_empresa.trim())
      }

      // Salvar todas as empresas coletadas na lista (isso atualiza o estado empresas)
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

      // Preencher formulário com setValue (evita dependência de reset)
      setValue('data_producao', dataFormatada)
      setValue('periodo', roteiroData.periodo || 'manha')

      if (roteiroData.itens && roteiroData.itens.length > 0) {
        const itensComEmpresas = roteiroData.itens.map((item) => {
          const empresaItem = (item.observacao && item.observacao.trim())
            ? item.observacao.trim()
            : (roteiroData.nome_empresa && roteiroData.nome_empresa.trim())
              ? roteiroData.nome_empresa.trim()
              : ''
          return {
            nome_empresa: empresaItem,
            produto_id: item.produto_id,
            quantidade: item.quantidade,
          }
        })

        // Ordenar itens do formulário por nome da empresa ao carregar (interface mais organizada)
        itensComEmpresas.sort((a, b) =>
          a.nome_empresa.trim().localeCompare(b.nome_empresa.trim(), 'pt-BR', { sensitivity: 'base' })
        )

        setValue('itens', itensComEmpresas, { shouldDirty: false })
      } else {
        const empresaInicial = roteiroData.nome_empresa && roteiroData.nome_empresa.trim()
          ? roteiroData.nome_empresa.trim()
          : ''
        setValue('itens', [{ nome_empresa: empresaInicial, produto_id: 0, quantidade: 1 }], { shouldDirty: false })
      }
    } catch (error: any) {
      toast.error('Erro ao carregar roteiro')
      console.error('Erro ao carregar dados:', error)
      router.push('/roteiros', { scroll: false })
    } finally {
      setCarregando(false)
    }
  }

  const persistRoteiro = async (data: FormData, mode: 'submit' | 'auto') => {
    const fail = (message: string) => {
      toast.error(message)
      if (mode === 'auto') throw new Error('VALIDATION')
    }

    if (data.itens.length === 0) {
      fail('Adicione pelo menos um item')
      if (mode === 'submit') return
      return
    }

    if (data.itens.some((item) => !item.nome_empresa || item.nome_empresa.trim() === '')) {
      fail('Preencha o nome da empresa em todos os itens')
      if (mode === 'submit') return
      return
    }

    if (data.itens.some((item) => item.produto_id === 0)) {
      fail('Selecione todos os pães')
      if (mode === 'submit') return
      return
    }

    if (data.itens.some((item) => item.quantidade <= 0)) {
      fail('Quantidade deve ser maior que zero')
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
    const itensOrdenados = [...itensValidos].sort((a, b) =>
      a.nome_empresa.trim().localeCompare(b.nome_empresa.trim(), 'pt-BR', { sensitivity: 'base' })
    )

    try {
      setLoading(true)

      // Salvar empresas usadas (apenas dos itens válidos)
      for (const item of itensOrdenados) {
        if (item.nome_empresa && item.nome_empresa.trim()) {
          await salvarEmpresa(item.nome_empresa)
        }
      }

      // Atualizar dados gerais do roteiro - garantir formato YYYY-MM-DD
      let dataFormatada = data.data_producao
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

      await roteiroApi.atualizar(id, {
        data_producao: dataFormatada,
        periodo: data.periodo || undefined,
      })

      const itensParaAtualizar: RoteiroItem[] = itensOrdenados.map((item) => ({
        produto_id: item.produto_id,
        quantidade: item.quantidade,
        observacao: item.nome_empresa.trim(),
      }))

      await roteiroApi.atualizarItens(id, itensParaAtualizar)

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
    await persistRoteiro(data, 'submit')
  })

  const saveBeforeNavigate = async () => {
    await new Promise<void>((resolve, reject) => {
      handleSubmit(
        async (data) => {
          try {
            await persistRoteiro(data, 'auto')
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

  if (carregando) {
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

  // Agrupar itens por empresa para a pré-visualização - cada pedido individual (sem somar)
  const itensPorEmpresa = itens
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
      if (!acc[empresa]) acc[empresa] = []
      const qtd = Number(item.quantidade) || 0
      acc[empresa].push({
        produto_id: produto.id,
        produto_nome: produto.nome,
        quantidade: qtd,
        opcao_relatorio: produto.opcao_relatorio ?? null,
        recheio: produto.recheio ?? null,
      })
      return acc
    }, {} as Record<string, Array<{ produto_id: number; produto_nome: string; quantidade: number; opcao_relatorio: string | null; recheio: string | null }>>)

  const itensParaTabela = Object.entries(itensPorEmpresa).flatMap(([empresa, items]) =>
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

  const handleImprimir = () => {
    if (itensParaTabela.length === 0) {
      toast.error('Adicione itens ao roteiro para imprimir')
      return
    }
    const dataProd = formatarDataProducaoBR(watch('data_producao'))
    const periodoVal = watch('periodo')
    const periodoLabel = periodoVal === 'manha' ? 'Manhã' : periodoVal === 'noite' ? 'Noite' : periodoVal === 'tarde' ? 'Tarde' : periodoVal || '-'
    const diaLabel = roteiro?.nome_empresa || '-'

    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>Impressão - Roteiro de Entregas</title>
        <style>
          body { font-family: Arial, sans-serif; padding: 20px; }
          .card { padding: 16px; border: 1px solid #ddd; border-radius: 8px; background: #f9fafb; }
          h3 { margin: 0 0 10px 0; font-size: 14px; border-bottom: 2px solid #550701; padding-bottom: 5px; }
          .info { font-size: 12px; margin-bottom: 15px; }
          table { width: 100%; border-collapse: collapse; font-size: 11px; margin-bottom: 15px; }
          th, td { border: 1px solid #ddd; padding: 6px; text-align: left; }
          th { background: #550701; color: white; font-size: 10px; }
          td.qtd { text-align: center; font-weight: bold; }
          .total-por-tipo { margin-top: 15px; padding: 12px; background: #fff; border: 1px solid #ddd; border-radius: 4px; }
          .total-por-tipo h4 { margin: 0 0 8px 0; font-size: 12px; color: #550701; }
          .total-por-tipo ul { margin: 0; padding-left: 20px; font-size: 11px; }
          .total-por-tipo li { margin: 4px 0; }
        </style>
      </head>
      <body>
        <div class="card">
          <h3>Roteiro de Entregas</h3>
          <div class="info">
            <p><strong>Dia:</strong> ${diaLabel}</p>
            <p><strong>Data:</strong> ${dataProd}</p>
            <p><strong>Período:</strong> ${periodoLabel}</p>
          </div>
          <table>
            <thead>
              <tr>
                <th>Empresa</th>
                <th>Pão</th>
                <th style="text-align:center">Quantidade</th>
              </tr>
            </thead>
            <tbody>
              ${itensParaTabela.map((item) => {
                const partes = [item.produto_nome]
                if (item.recheio) partes.push(item.recheio)
                if (item.opcao_relatorio) partes.push(opcaoRelatorioParaLabel(item.opcao_relatorio))
                const nomePao = partes.join(' ')
                return `
                <tr>
                  <td>${item.empresa}</td>
                  <td>${nomePao}</td>
                  <td class="qtd">${item.quantidade}</td>
                </tr>
              `}).join('')}
            </tbody>
          </table>
          <div class="total-por-tipo">
            <h4>Pães por tipo</h4>
            <ul>
              ${Object.entries(totalPorTipo).map(([nome, qtd]) => `<li><strong>${nome}:</strong> ${qtd}</li>`).join('')}
            </ul>
          </div>
        </div>
      </body>
      </html>
    `
    const janela = window.open('', '_blank')
    if (janela) {
      janela.document.write(htmlContent)
      janela.document.close()
      janela.focus()
      setTimeout(() => janela.print(), 100)
    }
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
          Editar Roteiro de Entregas
        </h1>
      </div>

      <div className="grid lg:grid-cols-2 gap-4">
        {/* Coluna Esquerda: Formulário */}
        <div>
      <form onSubmit={onSubmit} className="space-y-3">
        <div className="bg-white rounded-lg shadow p-4">
          <h2 className="text-lg font-bold text-gray-900 mb-3">
            Informações do Roteiro
          </h2>

          <div className="grid md:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">
                Data de Produção *
              </label>
              <input
                type="date"
                {...register('data_producao', {
                  required: 'Data de produção é obrigatória',
                })}
                className="w-full px-3 py-1.5 text-sm text-gray-900 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              />
              {errors.data_producao && (
                <p className="text-red-600 text-xs mt-1">
                  {errors.data_producao.message}
                </p>
              )}
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">
                Período
              </label>
              <select
                {...register('periodo')}
                className="w-full px-3 py-1.5 text-sm text-gray-900 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              >
                <option value="">Sem período específico</option>
                <option value="manha">Manhã</option>
                <option value="tarde">Tarde</option>
                <option value="noite">Noite</option>
              </select>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-4">
          <h2 className="text-lg font-bold text-gray-900 mb-3">Adicionar Pães</h2>

          {produtos.length === 0 ? (
            <div className="text-center py-6">
              <p className="text-gray-600 mb-3 text-sm">
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
                    <label className="block text-[11px] font-semibold text-gray-700 dark:text-gray-300 mb-1">
                      Empresa/Cliente
                    </label>
                    <Controller
                      control={control}
                      name={`itens.${index}.nome_empresa`}
                      rules={{
                        required: 'Selecione uma empresa',
                      }}
                      render={({ field }) => (
                        <SelectComBusca
                          options={empresasParaSelect.map((e) => ({ value: e, label: e }))}
                          value={field.value || ''}
                          onChange={(v) => field.onChange(v)}
                          placeholder="Digite para buscar empresa..."
                          dark={darkMode}
                          onFocusExtra={carregarEmpresas}
                        />
                      )}
                    />
                    {errors.itens?.[index]?.nome_empresa && (
                      <p className="text-red-600 text-xs mt-0.5">
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
                      <p className="text-red-600 text-xs mt-0.5">
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
                      <p className="text-red-600 text-xs mt-0.5">
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
            {loading ? 'Salvando...' : 'Atualizar Roteiro'}
          </button>
        </div>
      </form>
        </div>

        {/* Coluna Direita: Pré-visualização */}
        <div className="lg:sticky lg:top-4 lg:self-start">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4 border-2 border-gray-300 dark:border-gray-600">
            <div className="flex justify-between items-center mb-3 pb-2 border-b border-gray-200 dark:border-gray-600">
              <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100">
                Pré-visualização do Pedido
              </h2>
              <button
                type="button"
                onClick={handleImprimir}
                disabled={itensParaTabela.length === 0}
                className="bg-primary-500 text-white px-4 py-2 rounded-lg font-semibold hover:bg-primary-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                title="Imprimir o que está na pré-visualização"
              >
                Imprimir
              </button>
            </div>
            {itensParaTabela.length > 0 ? (
              <div className="bg-gray-50 dark:bg-gray-700/50 p-3 rounded-lg border border-gray-200 dark:border-gray-600">
                <div style={{ fontFamily: 'Arial, sans-serif' }}>
                  <h3 style={{ color: darkMode ? '#f1f5f9' : '#333', borderBottom: `2px solid ${darkMode ? '#0d9488' : '#550701'}`, paddingBottom: '5px', marginBottom: '10px', fontSize: '14px', fontWeight: 'bold' }}>
                    Roteiro de Entregas
                  </h3>
                  <div style={{ marginBottom: '10px', fontSize: '12px', color: darkMode ? '#e2e8f0' : '#333' }}>
                    <p><strong>Dia:</strong> {roteiro?.nome_empresa || '-'}</p>
                    <p><strong>Data:</strong> {formatarDataProducaoBR(watch('data_producao'))}</p>
                    <p><strong>Período:</strong> {watch('periodo') === 'manha' ? 'Manhã' : watch('periodo') === 'noite' ? 'Noite' : watch('periodo') || '-'}</p>
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
                      {Object.entries(totalPorTipo).map(([nome, qtd]) => (
                        <li key={nome} style={{ margin: '4px 0' }}><strong>{nome}:</strong> {qtd}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500 dark:text-gray-400 text-sm">
                <p>Adicione itens ao formulário para ver a pré-visualização</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
