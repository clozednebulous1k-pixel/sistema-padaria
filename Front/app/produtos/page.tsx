'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { produtoApi, massaApi, recheioApi, opcaoRelatorioApi, Produto } from '@/lib/api'
import toast from 'react-hot-toast'
import Loading from '@/components/Loading'
import { registrarClique } from '@/lib/audit'
import { opcaoRelatorioParaLabel, getOpcoesRelatorio } from '@/lib/opcoesRelatorio'
import ConfirmModal from '@/components/ConfirmModal'
import { useAuth } from '@/components/AuthProvider'

export default function ProdutosPage() {
  const { usuario } = useAuth()
  const [produtos, setProdutos] = useState<Produto[]>([])
  const [loading, setLoading] = useState(true)
  const [busca, setBusca] = useState('')
  const [tiposMassa, setTiposMassa] = useState<string[]>([])
  const [recheios, setRecheios] = useState<string[]>([])
  const [novoTipoMassa, setNovoTipoMassa] = useState('')
  const [novoRecheio, setNovoRecheio] = useState('')
  const [opcoesExtra, setOpcoesExtraState] = useState<string[]>([])
  const [novaOpcaoRelatorio, setNovaOpcaoRelatorio] = useState('')
  const [mostrarNovoProduto, setMostrarNovoProduto] = useState(false)
  const [salvandoProduto, setSalvandoProduto] = useState(false)
  const [novoProdutoNome, setNovoProdutoNome] = useState('')
  const [novoProdutoTipoMassa, setNovoProdutoTipoMassa] = useState('')
  const [novoProdutoRecheio, setNovoProdutoRecheio] = useState('')
  const [novoProdutoOpcaoRelatorio, setNovoProdutoOpcaoRelatorio] = useState('')
  const [opcoesRelatorio, setOpcoesRelatorio] = useState<string[]>([])
  const [editandoId, setEditandoId] = useState<number | null>(null)
  const [produtoEditando, setProdutoEditando] = useState<Partial<Produto> | null>(null)
  const [salvandoEdicao, setSalvandoEdicao] = useState(false)
  const [confirmModal, setConfirmModal] = useState<{
    open: boolean
    title: string
    message: string
    onConfirm: () => Promise<void>
  } | null>(null)

  useEffect(() => {
    carregarProdutos()
    carregarTiposMassa()
    carregarRecheios()
    // Buscar opções de relatório do backend e popular estado local
    getOpcoesRelatorio()
      .then((lista) => {
        setOpcoesRelatorio(lista)
        setOpcoesExtraState(lista)
      })
      .catch(() => {
        setOpcoesRelatorio([])
        setOpcoesExtraState([])
      })
  }, [])

  const carregarTiposMassa = async () => {
    try {
      const massas = await massaApi.listar()
      setTiposMassa(massas.map((m) => m.nome))
    } catch {
      setTiposMassa([])
    }
  }

  const carregarRecheios = async () => {
    try {
      const lista = await recheioApi.listar()
      setRecheios(lista.map((r) => r.nome))
    } catch {
      setRecheios([])
    }
  }

  const carregarProdutos = async () => {
    try {
      setLoading(true)
      const data = await produtoApi.listar()
      setProdutos(data)
    } catch (error: any) {
      toast.error('Erro ao carregar produtos')
      console.error(error)
    } finally {
      setLoading(false)
    }
  }

  const handleDesativar = (id: number, nome: string) => {
    setConfirmModal({
      open: true,
      title: 'Desativar produto',
      message: `Deseja realmente desativar o produto "${nome}"?`,
      onConfirm: async () => {
        registrarClique('Excluir', 'Produtos', undefined, 'produto', id, `Produto: ${nome}`)
        try {
          await produtoApi.desativar(id)
          toast.success('Produto desativado com sucesso')
          setConfirmModal(null)
          carregarProdutos()
        } catch (error: any) {
          toast.error('Erro ao desativar produto')
          console.error(error)
          throw error
        }
      },
    })
  }

  const adicionarTipoMassa = async () => {
    const nomeLimpo = novoTipoMassa.trim()
    if (!nomeLimpo) {
      toast.error('Digite um nome para o tipo de massa')
      return
    }
    if (tiposMassa.includes(nomeLimpo)) {
      toast.error('Este tipo de massa já existe')
      return
    }
    try {
      await massaApi.criar(nomeLimpo)
      setTiposMassa([...tiposMassa, nomeLimpo])
      setNovoTipoMassa('')
      toast.success('Tipo de massa adicionado!')
    } catch (err: any) {
      if (err?.response?.status === 409) {
        toast.error('Este tipo de massa já existe')
        return
      }
      toast.error('Erro ao adicionar tipo de massa')
    }
  }

  const removerTipoMassa = (tipo: string) => {
    setConfirmModal({
      open: true,
      title: 'Remover tipo de massa',
      message: `Tem certeza que deseja remover o tipo de massa "${tipo}"?`,
      onConfirm: async () => {
        try {
          await massaApi.deletar(tipo)
          setTiposMassa((prev) => prev.filter((t) => t !== tipo))
          toast.success('Tipo de massa removido!')
        } catch {
          toast.error('Erro ao remover tipo de massa')
        }
        setConfirmModal(null)
      },
    })
  }

  const adicionarRecheio = async () => {
    const nomeLimpo = novoRecheio.trim()
    if (!nomeLimpo) {
      toast.error('Digite um nome para o recheio')
      return
    }
    if (recheios.includes(nomeLimpo)) {
      toast.error('Este recheio já existe')
      return
    }
    try {
      await recheioApi.criar(nomeLimpo)
      setRecheios([...recheios, nomeLimpo])
      setNovoRecheio('')
      toast.success('Recheio adicionado!')
    } catch (err: any) {
      if (err?.response?.status === 409) {
        toast.error('Este recheio já existe')
        return
      }
      toast.error('Erro ao adicionar recheio')
    }
  }

  const removerRecheio = (nome: string) => {
    setConfirmModal({
      open: true,
      title: 'Remover recheio',
      message: `Tem certeza que deseja remover o recheio "${nome}"?`,
      onConfirm: async () => {
        try {
          await recheioApi.deletar(nome)
          setRecheios((prev) => prev.filter((r) => r !== nome))
          toast.success('Recheio removido!')
        } catch {
          toast.error('Erro ao remover recheio')
        }
        setConfirmModal(null)
      },
    })
  }

  const adicionarOpcaoRelatorio = () => {
    const valor = novaOpcaoRelatorio.trim().toLowerCase()
    if (!valor) {
      toast.error('Digite uma opção')
      return
    }
    const existentes = opcoesRelatorio.map((x) => x.toLowerCase())
    if (existentes.includes(valor)) {
      toast.error('Esta opção já existe')
      return
    }
    ;(async () => {
      try {
        await opcaoRelatorioApi.criar(valor)
        const lista = await getOpcoesRelatorio()
        setOpcoesRelatorio(lista)
        setOpcoesExtraState(lista)
        setNovaOpcaoRelatorio('')
        toast.success('Opção adicionada!')
      } catch (error: any) {
        const msg =
          error?.response?.data?.message ||
          error?.response?.data?.error ||
          error?.message ||
          'Erro ao adicionar opção'
        toast.error(msg)
      }
    })()
  }

  const removerOpcaoRelatorio = (opcao: string) => {
    ;(async () => {
      try {
        await opcaoRelatorioApi.deletar(opcao)
        const lista = await getOpcoesRelatorio()
        setOpcoesRelatorio(lista)
        setOpcoesExtraState(lista)
        toast.success('Opção removida')
      } catch (error: any) {
        const msg =
          error?.response?.data?.message ||
          error?.response?.data?.error ||
          error?.message ||
          'Erro ao remover opção'
        toast.error(msg)
      }
    })()
  }

  const iniciarEdicaoProduto = (produto: Produto) => {
    setEditandoId(produto.id)
    setProdutoEditando({
      id: produto.id,
      nome: produto.nome,
      tipo_massa: produto.tipo_massa ?? '',
      recheio: produto.recheio ?? '',
      opcao_relatorio: produto.opcao_relatorio ?? '',
    })
  }

  const cancelarEdicaoProduto = () => {
    setEditandoId(null)
    setProdutoEditando(null)
    setSalvandoEdicao(false)
  }

  const salvarProdutoInline = async () => {
    if (!editandoId || !produtoEditando) return

    const nome = produtoEditando.nome?.trim()
    if (!nome) {
      toast.error('Digite o nome do produto')
      return
    }

    try {
      setSalvandoEdicao(true)
      await produtoApi.atualizar(editandoId, {
        nome,
        tipo_massa: produtoEditando.tipo_massa?.toString().trim() || null,
        recheio: produtoEditando.recheio?.toString().trim() || null,
        opcao_relatorio: produtoEditando.opcao_relatorio?.toString().trim() || null,
      })
      toast.success('Produto atualizado com sucesso!')
      cancelarEdicaoProduto()
      carregarProdutos()
    } catch (error: any) {
      const msg =
        error?.response?.data?.message ||
        error?.response?.data?.error ||
        error?.message ||
        'Erro ao atualizar produto'
      toast.error(msg)
      console.error(error)
    } finally {
      setSalvandoEdicao(false)
    }
  }

  const salvarNovoProduto = async () => {
    const nome = novoProdutoNome.trim()
    if (!nome) {
      toast.error('Digite o nome do produto')
      return
    }
    setSalvandoProduto(true)
    try {
      await produtoApi.criar({
        nome,
        descricao: '',
        preco: '0.00',
        tipo_massa: novoProdutoTipoMassa?.trim() || null,
        opcao_relatorio: novoProdutoOpcaoRelatorio?.trim() || null,
      })
      registrarClique('Salvar', 'Produtos', 'Novo Produto (inline)', 'produto', undefined, `Produto: ${nome}`)
      toast.success('Produto criado com sucesso!')
      setNovoProdutoNome('')
      setNovoProdutoTipoMassa('')
      setNovoProdutoOpcaoRelatorio('')
      setMostrarNovoProduto(false)
      carregarProdutos()
    } catch (error: any) {
      const msg = error?.response?.data?.message || error?.response?.data?.error || error?.message || 'Erro ao criar produto'
      toast.error(msg)
    } finally {
      setSalvandoProduto(false)
    }
  }

  const cancelarNovoProduto = () => {
    setMostrarNovoProduto(false)
    setNovoProdutoNome('')
    setNovoProdutoTipoMassa('')
    setNovoProdutoRecheio('')
    setNovoProdutoOpcaoRelatorio('')
  }

  if (loading) {
    return <Loading />
  }

  const produtosAtivos = produtos.filter((p) => p.ativo)
  const produtosInativos = produtos.filter((p) => !p.ativo)

  const termoBusca = busca.trim().toLowerCase()

  const filtrarPorBusca = (lista: Produto[]) => {
    if (!termoBusca) return lista
    return lista.filter((p) => {
      const nome = p.nome?.toLowerCase() || ''
      const massa = (p.tipo_massa || '').toString().toLowerCase()
      const recheio = (p.recheio || '').toString().toLowerCase()
      const opcao = p.opcao_relatorio
        ? (opcaoRelatorioParaLabel(p.opcao_relatorio) || p.opcao_relatorio).toLowerCase()
        : ''
      return (
        nome.includes(termoBusca) ||
        massa.includes(termoBusca) ||
        recheio.includes(termoBusca) ||
        opcao.includes(termoBusca)
      )
    })
  }

  const produtosAtivosFiltrados = filtrarPorBusca(produtosAtivos)
  const produtosInativosFiltrados = filtrarPorBusca(produtosInativos)

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
        <h1 className="text-2xl font-bold text-gray-900">Produtos</h1>
      </div>

      {produtosAtivos.length === 0 && produtosInativos.length === 0 && !mostrarNovoProduto ? (
        <div className="bg-white rounded-lg shadow p-8 text-center">
          <div className="text-5xl mb-3">🥖</div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">
            Nenhum produto cadastrado
          </h2>
          <p className="text-gray-600 mb-4 text-sm">
            Comece criando seu primeiro produto
          </p>
          <button
            type="button"
            onClick={() => setMostrarNovoProduto(true)}
            className="inline-block bg-primary-500 text-white px-4 py-2 text-sm rounded-lg font-semibold hover:bg-primary-600 transition-colors"
          >
            + Novo Produto
          </button>
        </div>
      ) : (
        <>
          {/* Produtos Ativos - mostra tabela quando há produtos ou quando o formulário de novo está aberto */}
          {(produtosAtivosFiltrados.length > 0 || mostrarNovoProduto) && (
            <div className="bg-white rounded-lg shadow p-4 mb-4">
              <div className="flex flex-col gap-3 mb-3 md:flex-row md:items-center md:justify-between">
                <div className="space-y-2">
                  <h2 className="text-lg font-bold text-gray-900">
                    Produtos Ativos ({produtosAtivosFiltrados.length})
                  </h2>
                  <div className="max-w-md">
                    <input
                      type="text"
                      value={busca}
                      onChange={(e) => setBusca(e.target.value)}
                      placeholder="Pesquisar por nome, massa, recheio ou opção..."
                      className="w-full px-4 py-2 text-sm text-gray-900 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    />
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    if (mostrarNovoProduto) cancelarNovoProduto()
                    else setMostrarNovoProduto(true)
                  }}
                  className="bg-primary-500 text-white px-4 py-2 rounded-lg font-semibold hover:bg-primary-600 transition-colors text-sm"
                >
                  {mostrarNovoProduto ? 'Cancelar' : '+ Novo Produto'}
                </button>
              </div>
              <div className="overflow-x-auto max-h-96 overflow-y-auto">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">
                        Nome
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">
                        Tipo de massa
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">
                        Opção recheio
                      </th>
                      <th className="px-4 py-3 text-center text-xs font-semibold text-gray-700 uppercase">
                        Ações
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {mostrarNovoProduto && (
                      <tr
                        className="bg-primary-50/50"
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault()
                            if (novoProdutoNome.trim() && !salvandoProduto) salvarNovoProduto()
                          }
                        }}
                      >
                        <td className="px-4 py-2">
                          <input
                            type="text"
                            value={novoProdutoNome}
                            onChange={(e) => setNovoProdutoNome(e.target.value)}
                            placeholder="Nome do produto"
                            className="w-full px-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                            autoFocus
                          />
                        </td>
                        <td className="px-4 py-2">
                          <select
                            value={novoProdutoTipoMassa}
                            onChange={(e) => setNovoProdutoTipoMassa(e.target.value)}
                            className="w-full px-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                          >
                            <option value="">Selecione</option>
                            {tiposMassa.map((tipo) => (
                              <option key={tipo} value={tipo}>{tipo}</option>
                            ))}
                          </select>
                        </td>
                        <td className="px-4 py-2">
                          <select
                            value={novoProdutoRecheio}
                            onChange={(e) => setNovoProdutoRecheio(e.target.value)}
                            className="w-full px-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                          >
                            <option value="">Selecione</option>
                            {recheios.filter(Boolean).map((r) => (
                              <option key={r} value={r}>{r}</option>
                            ))}
                          </select>
                        </td>
                        <td className="px-4 py-2">
                          <select
                            value={novoProdutoOpcaoRelatorio}
                            onChange={(e) => setNovoProdutoOpcaoRelatorio(e.target.value)}
                            className="w-full px-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                          >
                            <option value="">Nenhuma</option>
                            {opcoesRelatorio.map((op) => (
                              <option key={op} value={op}>{opcaoRelatorioParaLabel(op) || op}</option>
                            ))}
                          </select>
                        </td>
                        <td className="px-4 py-2 text-center">
                          <div className="flex justify-center gap-2">
                            <button
                              type="button"
                              onClick={cancelarNovoProduto}
                              className="bg-gray-200 text-gray-700 px-3 py-1 rounded-lg hover:bg-gray-300 dark:bg-gray-600 dark:text-gray-100 dark:hover:bg-gray-500 text-xs font-semibold"
                            >
                              Cancelar
                            </button>
                            <button
                              type="button"
                              onClick={salvarNovoProduto}
                              disabled={salvandoProduto || !novoProdutoNome.trim()}
                              className="bg-primary-500 text-white px-3 py-1 rounded-lg hover:bg-primary-600 disabled:opacity-50 text-xs font-semibold"
                            >
                              {salvandoProduto ? 'Salvando...' : 'Salvar'}
                            </button>
                          </div>
                        </td>
                      </tr>
                    )}
                    {produtosAtivosFiltrados.map((produto) => {
                      const emEdicao = editandoId === produto.id
                      return (
                        <tr
                          key={produto.id}
                          onKeyDown={
                            emEdicao
                              ? (e) => {
                                  if (e.key === 'Enter') {
                                    e.preventDefault()
                                    if (produtoEditando?.nome?.trim() && !salvandoEdicao) {
                                      salvarProdutoInline()
                                    }
                                  }
                                }
                              : undefined
                          }
                        >
                          {emEdicao ? (
                            <>
                              <td className="px-4 py-3 text-sm">
                                <input
                                  type="text"
                                  value={produtoEditando?.nome ?? ''}
                                  onChange={(e) =>
                                    setProdutoEditando((prev) => ({ ...(prev || {}), nome: e.target.value }))
                                  }
                                  className="w-full px-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                                />
                              </td>
                              <td className="px-4 py-3 text-sm">
                                <select
                                  value={produtoEditando?.tipo_massa?.toString() ?? ''}
                                  onChange={(e) =>
                                    setProdutoEditando((prev) => ({
                                      ...(prev || {}),
                                      tipo_massa: e.target.value || null,
                                    }))
                                  }
                                  className="w-full px-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                                >
                                  <option value="">Selecione</option>
                                  {tiposMassa.map((tipo) => (
                                    <option key={tipo} value={tipo}>
                                      {tipo}
                                    </option>
                                  ))}
                                </select>
                              </td>
                              <td className="px-4 py-3 text-sm">
                                <select
                                  value={produtoEditando?.recheio?.toString() ?? ''}
                                  onChange={(e) =>
                                    setProdutoEditando((prev) => ({
                                      ...(prev || {}),
                                      recheio: e.target.value || null,
                                    }))
                                  }
                                  className="w-full px-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                                >
                                  <option value="">Selecione</option>
                                  {recheios.filter(Boolean).map((r) => (
                                    <option key={r} value={r}>
                                      {r}
                                    </option>
                                  ))}
                                </select>
                              </td>
                              <td className="px-4 py-3 text-sm">
                                <select
                                  value={produtoEditando?.opcao_relatorio?.toString() ?? ''}
                                  onChange={(e) =>
                                    setProdutoEditando((prev) => ({
                                      ...(prev || {}),
                                      opcao_relatorio: e.target.value || null,
                                    }))
                                  }
                                  className="w-full px-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                                >
                                  <option value="">Nenhuma</option>
                                  {opcoesRelatorio.map((op) => (
                                    <option key={op} value={op}>
                                      {opcaoRelatorioParaLabel(op) || op}
                                    </option>
                                  ))}
                                </select>
                              </td>
                              <td className="px-4 py-3 text-sm text-center">
                                <div className="flex justify-center gap-2">
                                  <button
                                    type="button"
                                    onClick={cancelarEdicaoProduto}
                                    className="bg-gray-200 text-gray-700 px-3 py-1 rounded-lg hover:bg-gray-300 dark:bg-gray-600 dark:text-gray-100 dark:hover:bg-gray-500 text-xs font-semibold"
                                  >
                                    Cancelar
                                  </button>
                                  <button
                                    type="button"
                                    onClick={salvarProdutoInline}
                                    disabled={salvandoEdicao || !produtoEditando?.nome?.trim()}
                                    className="bg-primary-500 text-white px-3 py-1 rounded-lg hover:bg-primary-600 disabled:opacity-50 text-xs font-semibold"
                                  >
                                    {salvandoEdicao ? 'Salvando...' : 'Salvar'}
                                  </button>
                                </div>
                              </td>
                            </>
                          ) : (
                            <>
                              <td className="px-4 py-3 text-sm font-semibold text-gray-900">
                                {produto.nome}
                              </td>
                              <td className="px-4 py-3 text-sm text-gray-600">
                                {produto.tipo_massa || '-'}
                              </td>
                              <td className="px-4 py-3 text-sm text-gray-600">
                                {produto.recheio || '-'}
                              </td>
                              <td className="px-4 py-3 text-sm text-gray-600">
                                {produto.opcao_relatorio
                                  ? opcaoRelatorioParaLabel(produto.opcao_relatorio)
                                  : '-'}
                              </td>
                              <td className="px-4 py-3 text-sm text-center">
                                <div className="flex justify-center gap-2">
                                  <button
                                    type="button"
                                    onClick={() => iniciarEdicaoProduto(produto)}
                                    className="bg-blue-100 text-blue-700 px-3 py-1 rounded-lg hover:bg-blue-200 transition-colors text-xs font-semibold"
                                  >
                                    Editar
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleDesativar(produto.id, produto.nome)}
                                    className="bg-red-100 text-red-700 px-3 py-1 rounded-lg hover:bg-red-200 transition-colors text-xs font-semibold"
                                  >
                                    Desativar
                                  </button>
                                </div>
                              </td>
                            </>
                          )}
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Produtos Inativos */}
          {produtosInativosFiltrados.length > 0 && (
            <div className="bg-white rounded-lg shadow p-4 mb-4">
              <h2 className="text-lg font-bold text-gray-900 mb-3">
                Produtos Inativos ({produtosInativosFiltrados.length})
              </h2>
              <div className="overflow-x-auto max-h-96 overflow-y-auto">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">
                        Nome
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">
                        Tipo de massa
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">
                        Recheio
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">
                        Opção recheio
                      </th>
                      <th className="px-4 py-3 text-center text-xs font-semibold text-gray-700 uppercase">
                        Status
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {produtosInativosFiltrados.map((produto) => (
                      <tr key={produto.id} className="opacity-60">
                        <td className="px-4 py-3 text-sm font-semibold text-gray-900">
                          {produto.nome}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-600">
                          {produto.tipo_massa || '-'}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-600">
                          {produto.recheio || '-'}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-600">
                          {produto.opcao_relatorio ? opcaoRelatorioParaLabel(produto.opcao_relatorio) : '-'}
                        </td>
                        <td className="px-4 py-3 text-sm text-center">
                          <span className="px-2 py-1 rounded-full text-xs font-semibold bg-gray-200 text-gray-700">
                            Inativo
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}

      {/* Tipos de massa do pão - abaixo dos produtos */}
      <div className="bg-white rounded-lg shadow p-4 mt-4">
        <h2 className="text-xl font-bold text-gray-900 mb-3">Tipos de massa do pão</h2>
        <p className="text-sm text-gray-600 mb-4">
          Adicione aqui os tipos de massa para usar ao cadastrar produtos (ex.: Massa Salgada, Massa Doce).
        </p>
        <div className="flex flex-wrap gap-2 mb-3">
          <input
            type="text"
            value={novoTipoMassa}
            onChange={(e) => setNovoTipoMassa(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && adicionarTipoMassa()}
            placeholder="Ex: Massa Salgada"
            className="flex-1 min-w-[200px] px-4 py-2 text-gray-900 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
          />
          <button
            type="button"
            onClick={adicionarTipoMassa}
            className="px-6 py-2 bg-primary-500 text-white rounded-lg font-semibold hover:bg-primary-600 transition-colors"
          >
            + Adicionar tipo
          </button>
        </div>
        <div className="flex flex-wrap gap-2">
          {tiposMassa.length === 0 ? (
            <span className="text-sm text-gray-500">Nenhum tipo cadastrado. Adicione acima.</span>
          ) : (
            tiposMassa.map((tipo) => (
              <div
                key={tipo}
                className="flex items-center gap-2 px-4 py-2 bg-gray-100 rounded-lg"
              >
                <span className="font-semibold text-gray-900">{tipo}</span>
                {usuario?.is_admin && (
                  <button
                    type="button"
                    onClick={() => removerTipoMassa(tipo)}
                    className="text-red-500 hover:text-red-700 font-bold text-lg leading-none"
                    title="Remover tipo de massa"
                  >
                    ×
                  </button>
                )}
              </div>
            ))
          )}
        </div>
      </div>

      {/* Recheios disponíveis - abaixo dos tipos de massa */}
      <div className="bg-white rounded-lg shadow p-4 mt-4">
        <h2 className="text-xl font-bold text-gray-900 mb-3">Recheios disponíveis</h2>
        <p className="text-sm text-gray-600 mb-4">
          Adicione aqui os recheios para usar ao cadastrar produtos (ex.: Requeijão, Geleia, Sem recheio).
        </p>
        <div className="flex flex-wrap gap-2 mb-3">
          <input
            type="text"
            value={novoRecheio}
            onChange={(e) => setNovoRecheio(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && adicionarRecheio()}
            placeholder="Ex: Requeijão"
            className="flex-1 min-w-[200px] px-4 py-2 text-gray-900 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
          />
          <button
            type="button"
            onClick={adicionarRecheio}
            className="px-6 py-2 bg-primary-500 text-white rounded-lg font-semibold hover:bg-primary-600 transition-colors"
          >
            + Adicionar recheio
          </button>
        </div>
        <div className="flex flex-wrap gap-2">
          {recheios.filter(Boolean).length === 0 ? (
            <span className="text-sm text-gray-500">Nenhum recheio cadastrado. Adicione acima.</span>
          ) : (
            recheios.filter(Boolean).map((r) => (
              <div
                key={r}
                className="flex items-center gap-2 px-4 py-2 bg-gray-100 rounded-lg"
              >
                <span className="font-semibold text-gray-900">{r}</span>
                <button
                  type="button"
                  onClick={() => removerRecheio(r)}
                  className="text-red-500 hover:text-red-700 font-bold text-lg leading-none"
                  title="Remover recheio"
                >
                  ×
                </button>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Opções de relatório - abaixo dos tipos de massa */}
      <div className="bg-white rounded-lg shadow p-4 mt-4">
        <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-3">Opções de relatório</h2>
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
          Adicione aqui todas as opções que deseja usar no campo &quot;Opção para relatório&quot; ao cadastrar produtos (ex.: Margarina, Sem Margarina, Embalado). Você pode incluir e remover livremente.
        </p>
        <div className="flex flex-wrap gap-2 mb-3">
          <input
            type="text"
            value={novaOpcaoRelatorio}
            onChange={(e) => setNovaOpcaoRelatorio(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && adicionarOpcaoRelatorio()}
            placeholder="Ex: especial, light"
            className="flex-1 min-w-[200px] px-4 py-2 text-gray-900 dark:text-gray-100 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 focus:ring-2 focus:ring-primary-500 focus:border-transparent"
          />
          <button
            type="button"
            onClick={adicionarOpcaoRelatorio}
            className="px-6 py-2 bg-primary-500 text-white rounded-lg font-semibold hover:bg-primary-600 transition-colors"
          >
            + Adicionar opção
          </button>
        </div>
        <div className="flex flex-wrap gap-2 items-center">
          {opcoesExtra.filter(Boolean).length === 0 ? (
            <span className="text-sm text-gray-500 dark:text-gray-400">Nenhuma opção cadastrada. Adicione acima.</span>
          ) : (
            opcoesExtra.filter(Boolean).map((op) => (
              <div
                key={op}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-primary-50 dark:bg-primary-900/30 rounded-lg"
              >
                <span className="text-sm font-medium text-gray-900 dark:text-gray-100">{opcaoRelatorioParaLabel(op) || op}</span>
                <button
                  type="button"
                  onClick={() => removerOpcaoRelatorio(op)}
                  className="text-red-500 hover:text-red-700 font-bold text-lg leading-none"
                  title="Remover opção"
                >
                  ×
                </button>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  )
}
