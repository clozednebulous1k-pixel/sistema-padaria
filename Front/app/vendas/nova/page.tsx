'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useForm, useFieldArray } from 'react-hook-form'
import { produtoApi, vendaApi, Produto, VendaItem } from '@/lib/api'
import toast from 'react-hot-toast'
import Link from 'next/link'
import { format } from 'date-fns'

interface FormData {
  itens: Array<{
    produto_id: number
    quantidade: number
  }>
  forma_pagamento: string
  data_venda: string
  nome_cliente?: string
}

export default function NovaVendaPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [produtos, setProdutos] = useState<Produto[]>([])
  const [carregandoProdutos, setCarregandoProdutos] = useState(true)

  const {
    register,
    handleSubmit,
    control,
    watch,
    formState: { errors },
  } = useForm<FormData>({
    defaultValues: {
      itens: [{ produto_id: 0, quantidade: 1 }],
      forma_pagamento: 'Dinheiro',
      data_venda: format(new Date(), 'yyyy-MM-dd'),
    },
  })

  const { fields, append, remove } = useFieldArray({
    control,
    name: 'itens',
  })

  const itens = watch('itens')

  useEffect(() => {
    carregarProdutos()
  }, [])

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

  const calcularSubtotal = (produtoId: number, quantidade: number) => {
    const produto = produtos.find((p) => p.id === produtoId)
    if (!produto) return 0
    return parseFloat(produto.preco) * quantidade
  }

  const calcularTotal = () => {
    return itens.reduce((total, item) => {
      return total + calcularSubtotal(item.produto_id, item.quantidade)
    }, 0)
  }

  const onSubmit = async (data: FormData) => {
    if (data.itens.length === 0) {
      toast.error('Adicione pelo menos um item')
      return
    }

    if (data.itens.some((item) => item.produto_id === 0)) {
      toast.error('Selecione todos os produtos')
      return
    }

    if (data.itens.some((item) => item.quantidade <= 0)) {
      toast.error('Quantidade deve ser maior que zero')
      return
    }

    try {
      setLoading(true)
      const vendaData: any = {
        itens: data.itens as VendaItem[],
        forma_pagamento: data.forma_pagamento,
        data_venda: data.data_venda,
      }
      if (data.nome_cliente && data.nome_cliente.trim()) {
        vendaData.nome_cliente = data.nome_cliente.trim()
      }
      const vendaCriada = await vendaApi.criar(vendaData)
      toast.success('Venda registrada com sucesso! Roteiro de produção gerado automaticamente.')
      if (vendaCriada.roteiro_id) {
        toast.success(`Roteiro #${vendaCriada.roteiro_id} criado automaticamente`, {
          duration: 5000,
        })
      }
      router.push('/vendas')
    } catch (error: any) {
      toast.error('Erro ao registrar venda')
      console.error(error)
    } finally {
      setLoading(false)
    }
  }

  const formatarPreco = (preco: number) => {
    return preco.toLocaleString('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    })
  }

  return (
    <div className="container mx-auto px-4 max-w-4xl">
      <div className="mb-4">
        <Link
          href="/vendas"
          className="text-primary-600 hover:text-primary-700 font-semibold text-sm mb-1 inline-block"
        >
          ← Voltar para vendas
        </Link>
        <h1 className="text-2xl font-bold text-gray-900 mt-2">Nova Venda</h1>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-3">
        <div className="bg-white rounded-lg shadow p-4">
          <h2 className="text-lg font-bold text-gray-900 mb-3">Itens da Venda</h2>

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
                  className="grid md:grid-cols-12 gap-2 mb-2 p-2 bg-gray-50 rounded-lg"
                >
                  <div className="md:col-span-5">
                    <label className="block text-xs font-semibold text-gray-700 mb-1">
                      Produto *
                    </label>
                    <select
                      {...register(`itens.${index}.produto_id`, {
                        required: 'Selecione um produto',
                        valueAsNumber: true,
                      })}
                      className="w-full px-3 py-1.5 text-sm text-gray-900 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    >
                      <option value={0}>Selecione um produto</option>
                      {produtos.map((produto) => (
                        <option key={produto.id} value={produto.id}>
                          {produto.nome} - {formatarPreco(parseFloat(produto.preco))}
                        </option>
                      ))}
                    </select>
                    {errors.itens?.[index]?.produto_id && (
                      <p className="text-red-600 text-sm mt-1">
                        {errors.itens[index]?.produto_id?.message}
                      </p>
                    )}
                  </div>

                  <div className="md:col-span-3">
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

                  <div className="md:col-span-3">
                    <label className="block text-xs font-semibold text-gray-700 mb-1">
                      Subtotal
                    </label>
                    <div className="px-4 py-3 bg-white border border-gray-300 rounded-lg font-bold text-primary-600">
                      {formatarPreco(
                        calcularSubtotal(
                          itens[index]?.produto_id || 0,
                          itens[index]?.quantidade || 0
                        )
                      )}
                    </div>
                  </div>

                  <div className="md:col-span-1 flex items-end">
                    {fields.length > 1 && (
                      <button
                        type="button"
                        onClick={() => remove(index)}
                        className="w-full bg-red-100 text-red-700 px-4 py-3 rounded-lg hover:bg-red-200 transition-colors font-semibold"
                      >
                        ×
                      </button>
                    )}
                  </div>
                </div>
              ))}

              <button
                type="button"
                onClick={() => append({ produto_id: 0, quantidade: 1 })}
                className="w-full bg-gray-100 text-gray-700 px-6 py-3 rounded-lg font-semibold hover:bg-gray-200 transition-colors"
              >
                + Adicionar Item
              </button>
            </>
          )}
        </div>

        <div className="bg-white rounded-lg shadow p-4">
          <div className="bg-blue-50 border-l-4 border-blue-500 p-4 mb-6">
            <div className="flex">
              <div className="flex-shrink-0">
              </div>
              <div className="ml-3">
                <p className="text-sm text-blue-700">
                  <strong>Importante:</strong> Ao criar uma venda, um roteiro de produção será gerado automaticamente com os mesmos produtos e quantidades.
                </p>
              </div>
            </div>
          </div>

          <h2 className="text-xl font-bold text-gray-900 mb-6">
            Informações da Venda
          </h2>

          <div className="grid md:grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Data da Venda *
              </label>
              <input
                type="date"
                {...register('data_venda', { required: 'Data é obrigatória' })}
                className="w-full px-4 py-3 text-gray-900 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              />
              {errors.data_venda && (
                <p className="text-red-600 text-sm mt-1">
                  {errors.data_venda.message}
                </p>
              )}
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Forma de Pagamento *
              </label>
              <select
                {...register('forma_pagamento', {
                  required: 'Forma de pagamento é obrigatória',
                })}
                className="w-full px-4 py-3 text-gray-900 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              >
                <option value="Dinheiro">Dinheiro</option>
                <option value="Cartão de Débito">Cartão de Débito</option>
                <option value="Cartão de Crédito">Cartão de Crédito</option>
                <option value="PIX">PIX</option>
                <option value="Outro">Outro</option>
              </select>
              {errors.forma_pagamento && (
                <p className="text-red-600 text-sm mt-1">
                  {errors.forma_pagamento.message}
                </p>
              )}
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Nome do Cliente/Empresa
              <span className="text-gray-500 text-xs ml-2">(opcional - usado no roteiro gerado)</span>
            </label>
            <input
              type="text"
              {...register('nome_cliente')}
              className="w-full px-4 py-3 text-gray-900 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              placeholder="Ex: Padaria do João"
            />
            <p className="text-gray-500 text-xs mt-1">
              Se não informado, o roteiro será criado com o nome "Venda #ID"
            </p>
          </div>
        </div>

        <div className="bg-primary-50 rounded-lg shadow p-4">
          <div className="flex justify-between items-center">
            <div>
              <p className="text-gray-600 text-sm">Total da Venda</p>
              <p className="text-3xl font-bold text-primary-600">
                {formatarPreco(calcularTotal())}
              </p>
            </div>
            <div className="flex gap-4">
              <Link
                href="/vendas"
                className="bg-gray-100 text-gray-700 px-6 py-3 rounded-lg font-semibold hover:bg-gray-200 transition-colors"
              >
                Cancelar
              </Link>
              <button
                type="submit"
                disabled={loading || produtos.length === 0}
                className="bg-primary-500 text-white px-6 py-3 rounded-lg font-semibold hover:bg-primary-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Registrando...' : 'Registrar Venda'}
              </button>
            </div>
          </div>
        </div>
      </form>
    </div>
  )
}
