'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useForm, useFieldArray } from 'react-hook-form'
import { roteiroApi, produtoApi, Produto, RoteiroItem } from '@/lib/api'
import toast from 'react-hot-toast'
import Link from 'next/link'
import { format } from 'date-fns'

interface FormData {
  motorista: string
  data_producao: string
  periodo: string
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

export default function NovoRoteiroMotoristaPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [produtos, setProdutos] = useState<Produto[]>([])
  const [carregandoProdutos, setCarregandoProdutos] = useState(true)
  const [empresas, setEmpresas] = useState<string[]>([])
  const [motoristas, setMotoristas] = useState<Motorista[]>([])
  const [novaEmpresa, setNovaEmpresa] = useState<{ [key: number]: string }>({})

  const {
    register,
    handleSubmit,
    control,
    formState: { errors },
    watch,
    setValue,
  } = useForm<FormData>({
    defaultValues: {
      motorista: '',
      data_producao: format(new Date(), 'yyyy-MM-dd'),
      periodo: '',
      itens: [{ nome_empresa: '', produto_id: 0, quantidade: 1 }],
    },
  })

  const { fields, append, remove } = useFieldArray({
    control,
    name: 'itens',
  })

  const itens = watch('itens')

  useEffect(() => {
    carregarProdutos()
    carregarEmpresas()
    carregarMotoristas()
  }, [])

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

  const carregarMotoristas = () => {
    try {
      const motoristasSalvos = localStorage.getItem(STORAGE_KEY_MOTORISTAS)
      if (motoristasSalvos) {
        const dados = JSON.parse(motoristasSalvos)
        // Compatibilidade: se for array de strings, converter para array de objetos
        if (dados.length > 0 && typeof dados[0] === 'string') {
          const motoristasObjetos: Motorista[] = dados.map((nome: string) => ({
            nome,
            periodo: '' as const
          }))
          setMotoristas(motoristasObjetos)
          localStorage.setItem(STORAGE_KEY_MOTORISTAS, JSON.stringify(motoristasObjetos))
        } else {
          setMotoristas(dados)
        }
      }
    } catch (error) {
      console.error('Erro ao carregar motoristas:', error)
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

  const salvarMotorista = (nomeMotorista: string) => {
    if (!nomeMotorista || nomeMotorista.trim() === '') return
    
    const nomeLimpo = nomeMotorista.trim()
    const motoristaExistente = motoristas.find((m) => m.nome === nomeLimpo)
    
    if (!motoristaExistente) {
      // Se não existe, adicionar ao localStorage (mas idealmente deveria salvar no backend)
      const novosMotoristas = [...motoristas, { nome: nomeLimpo, periodo: '' as const }]
      setMotoristas(novosMotoristas)
      localStorage.setItem(STORAGE_KEY_MOTORISTAS, JSON.stringify(novosMotoristas))
    }
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
        salvarMotorista(data.motorista)
      }

      // Salvar empresas usadas
      data.itens.forEach((item) => {
        if (item.nome_empresa && item.nome_empresa.trim()) {
          salvarEmpresa(item.nome_empresa)
        }
      })

      // Criar um único roteiro com todos os itens
      // Cada item terá a empresa na observação
      const itensRoteiro: RoteiroItem[] = data.itens.map((item) => ({
        produto_id: item.produto_id,
        quantidade: item.quantidade,
        observacao: item.nome_empresa, // Armazenar empresa na observação do item
      }))

      // Dados do roteiro que serão enviados
      const dadosRoteiro = {
        nome_empresa: data.motorista, // Nome da empresa = nome do motorista
        data_producao: data.data_producao,
        periodo: data.periodo || undefined,
        motorista: data.motorista,
        status: 'pendente' as const,
        itens: itensRoteiro,
      }

      console.log('Criando roteiro com os seguintes dados:', dadosRoteiro)
      console.log('Motorista sendo enviado:', data.motorista)

      // Criar um único roteiro com nome_empresa sendo o motorista
      const roteiroCriado = await roteiroApi.criar(dadosRoteiro)

      console.log('Roteiro criado com sucesso:', roteiroCriado)
      console.log('Motorista no roteiro criado:', roteiroCriado.motorista)

      toast.success(`Roteiro criado para ${data.motorista}!`)
      router.push('/motoristas')
    } catch (error: any) {
      toast.error('Erro ao criar roteiro')
      console.error(error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="container mx-auto px-4 max-w-4xl">
      <div className="mb-4">
        <Link
          href="/motoristas"
          className="text-primary-600 hover:text-primary-700 font-semibold text-sm mb-1 inline-block"
        >
          ← Voltar para roteiros de motoristas
        </Link>
        <h1 className="text-2xl font-bold text-gray-900 mt-2">Novo Roteiro de Motorista</h1>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        <div className="bg-white rounded-lg shadow p-4">
          <h2 className="text-lg font-bold text-gray-900 mb-4">
            Informações do Motorista
          </h2>

          <div className="grid md:grid-cols-3 gap-4">
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
                  Nenhum motorista cadastrado. Cadastre motoristas em{' '}
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

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Período
              </label>
              <select
                {...register('periodo')}
                className="w-full px-4 py-3 text-gray-900 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
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
          <h2 className="text-lg font-bold text-gray-900 mb-4">Adicionar Itens ao Roteiro</h2>

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
                Cadastrar produto
              </Link>
            </div>
          ) : (
            <>
              {fields.map((field, index) => {
                return (
                  <div
                    key={field.id}
                    className="bg-gray-50 p-6 rounded-lg mb-4 border border-gray-200"
                  >
                    <div className="flex justify-between items-center mb-4">
                      <h3 className="text-lg font-semibold text-gray-900">
                        Item {index + 1}
                      </h3>
                      {fields.length > 1 && (
                        <button
                          type="button"
                          onClick={() => remove(index)}
                          className="text-red-600 hover:text-red-700 font-semibold"
                        >
                          Remover
                        </button>
                      )}
                    </div>

                    <div className="grid md:grid-cols-3 gap-4">
                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">
                          Empresa/Cliente *
                        </label>
                        <select
                          {...register(`itens.${index}.nome_empresa`, {
                            required: 'Empresa é obrigatória',
                          })}
                          className="w-full px-4 py-3 text-gray-900 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                          onChange={(e) => {
                            setValue(`itens.${index}.nome_empresa`, e.target.value)
                            salvarEmpresa(e.target.value)
                          }}
                        >
                          <option value="">Selecione uma empresa</option>
                          {empresas.map((empresa) => (
                            <option key={empresa} value={empresa}>
                              {empresa}
                            </option>
                          ))}
                        </select>
                        {errors.itens?.[index]?.nome_empresa && (
                          <p className="text-red-600 text-sm mt-1">
                            {errors.itens[index]?.nome_empresa?.message}
                          </p>
                        )}
                        {empresas.length === 0 && (
                          <p className="text-yellow-600 text-xs mt-1">
                            Nenhuma empresa cadastrada. Cadastre empresas em{' '}
                            <Link href="/empresas" className="text-primary-600 hover:underline font-semibold">Cadastro de Empresas</Link>.
                          </p>
                        )}
                      </div>

                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">
                          Pão *
                        </label>
                        <select
                          {...register(`itens.${index}.produto_id`, {
                            required: 'Pão é obrigatório',
                            valueAsNumber: true,
                          })}
                          className="w-full px-4 py-3 text-gray-900 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
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

                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">
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
                          className="w-full px-4 py-3 text-gray-900 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                        />
                        {errors.itens?.[index]?.quantidade && (
                          <p className="text-red-600 text-sm mt-1">
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
            </>
          )}
        </div>

        <div className="flex gap-4">
          <button
            type="submit"
            disabled={loading}
            className="flex-1 bg-primary-500 text-white px-6 py-3 rounded-lg font-semibold hover:bg-primary-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Salvando...' : 'Criar Roteiro'}
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
  )
}

