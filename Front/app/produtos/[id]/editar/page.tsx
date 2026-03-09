'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { produtoApi, massaApi, recheioApi, Produto } from '@/lib/api'
import toast from 'react-hot-toast'
import Link from 'next/link'
import { getOpcoesRelatorio, opcaoRelatorioParaLabel } from '@/lib/opcoesRelatorio'

interface FormData {
  nome: string
  tipo_massa: string
  recheio: string
  opcao_relatorio: string
}

export default function EditarProdutoPage() {
  const router = useRouter()
  const params = useParams()
  const id = Number(params.id)
  const [loading, setLoading] = useState(false)
  const [carregando, setCarregando] = useState(true)
  const [tiposMassa, setTiposMassa] = useState<string[]>([])
  const [recheios, setRecheios] = useState<string[]>([])
  const [opcoesRelatorio, setOpcoesRelatorio] = useState<string[]>([])
  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
  } = useForm<FormData>({ defaultValues: { tipo_massa: '', recheio: '', opcao_relatorio: '' } })

  useEffect(() => {
    const carregarMassas = async () => {
      try {
        const [massas, recheiosList] = await Promise.all([massaApi.listar(), recheioApi.listar()])
        setTiposMassa(massas.map((m) => m.nome))
        setRecheios(recheiosList.map((r) => r.nome))
      } catch {
        setTiposMassa([])
        setRecheios([])
      }
    }
    carregarMassas()
    setOpcoesRelatorio(getOpcoesRelatorio())
  }, [])

  useEffect(() => {
    carregarProduto()
  }, [id])

  const carregarProduto = async () => {
    try {
      setCarregando(true)
      const produto = await produtoApi.buscar(id)
      setValue('nome', produto.nome)
      setValue('tipo_massa', produto.tipo_massa || '')
      setValue('recheio', produto.recheio || '')
      setValue('opcao_relatorio', produto.opcao_relatorio ? produto.opcao_relatorio.trim().toLowerCase() : '')
    } catch (error: any) {
      toast.error('Erro ao carregar produto')
      router.push('/produtos')
    } finally {
      setCarregando(false)
    }
  }

  const onSubmit = async (data: FormData) => {
    try {
      setLoading(true)
      await produtoApi.atualizar(id, {
        nome: data.nome,
        descricao: '',
        preco: '0.00',
        tipo_massa: data.tipo_massa?.trim() || null,
        opcao_relatorio: data.opcao_relatorio?.trim() || null,
        recheio: data.recheio?.trim() || null,
      })
      toast.success('Produto atualizado com sucesso!')
      router.push('/produtos')
    } catch (error: any) {
      toast.error('Erro ao atualizar produto')
      console.error(error)
    } finally {
      setLoading(false)
    }
  }

  if (carregando) {
    return (
      <div className="container mx-auto px-4">
        <div className="flex justify-center items-center min-h-[400px]">
          <div className="text-xl text-gray-600">Carregando...</div>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 max-w-2xl">
      <div className="mb-4">
        <Link
          href="/produtos"
          className="text-primary-600 hover:text-primary-700 font-semibold text-sm mb-1 inline-block"
        >
          ← Voltar para produtos
        </Link>
        <h1 className="text-2xl font-bold text-gray-900 mt-2">
          Editar Produto
        </h1>
      </div>

      <form
        onSubmit={handleSubmit(onSubmit)}
        className="bg-white rounded-lg shadow p-4"
      >
        <div className="mb-2">
          <label
            htmlFor="nome"
            className="block text-xs font-semibold text-gray-700 mb-1"
          >
            Nome do Produto *
          </label>
          <input
            type="text"
            id="nome"
            {...register('nome', { required: 'Nome é obrigatório' })}
            className="w-full px-3 py-1.5 text-sm text-gray-900 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            placeholder="Ex: Pão Francês"
          />
          {errors.nome && (
            <p className="text-red-600 text-xs mt-1">{errors.nome.message}</p>
          )}
        </div>

        <div className="mb-2">
          <label
            htmlFor="tipo_massa"
            className="block text-xs font-semibold text-gray-700 mb-1"
          >
            Tipo de massa do pão
          </label>
          <select
            id="tipo_massa"
            {...register('tipo_massa')}
            className="w-full px-3 py-1.5 text-sm text-gray-900 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
          >
            <option value="">Selecione o tipo de massa</option>
            {tiposMassa.map((nome) => (
              <option key={nome} value={nome}>{nome}</option>
            ))}
          </select>
          <p className="text-gray-500 text-xs mt-0.5">
            Configure os tipos de massa em Lista de massas, se necessário.
          </p>
        </div>

        <div className="mb-2">
          <label
            htmlFor="recheio"
            className="block text-xs font-semibold text-gray-700 mb-1"
          >
            Recheio
          </label>
          <select
            id="recheio"
            {...register('recheio')}
            className="w-full px-3 py-1.5 text-sm text-gray-900 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
          >
            <option value="">Selecione o recheio</option>
            {recheios.map((nome) => (
              <option key={nome} value={nome}>{nome}</option>
            ))}
          </select>
          <p className="text-gray-500 text-xs mt-0.5">
            Configure os recheios na página de produtos, se necessário.
          </p>
        </div>

        <div className="mb-2">
          <label
            htmlFor="opcao_relatorio"
            className="block text-xs font-semibold text-gray-700 mb-1"
          >
            Opção para relatório
          </label>
          <select
            id="opcao_relatorio"
            {...register('opcao_relatorio')}
            className="w-full px-3 py-1.5 text-sm text-gray-900 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
          >
            <option value="">Nenhuma</option>
            {opcoesRelatorio.map((op) => (
              <option key={op} value={op}>{opcaoRelatorioParaLabel(op) || op}</option>
            ))}
          </select>
          <p className="text-gray-500 text-xs mt-0.5">
            Usado para filtrar e gerar relatórios (ex.: com marg, sem marg, embalado).
          </p>
        </div>

        <div className="flex gap-2 mt-3">
          <Link
            href="/produtos"
            className="flex-1 bg-gray-100 text-gray-700 px-4 py-2 text-sm rounded-lg font-semibold hover:bg-gray-200 transition-colors text-center"
          >
            Cancelar
          </Link>
          <button
            type="submit"
            disabled={loading}
            className="flex-1 bg-primary-500 text-white px-4 py-2 text-sm rounded-lg font-semibold hover:bg-primary-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Salvando...' : 'Atualizar Produto'}
          </button>
        </div>
      </form>
    </div>
  )
}
