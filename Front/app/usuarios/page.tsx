'use client'

import { useEffect, useState } from 'react'
import { usuarioApi, Usuario } from '@/lib/api'
import { useAuth } from '@/components/AuthProvider'
import toast from 'react-hot-toast'
import Loading from '@/components/Loading'
import { format } from 'date-fns'
import { registrarClique } from '@/lib/audit'
import ConfirmModal from '@/components/ConfirmModal'

export default function UsuariosPage() {
  const { usuario: usuarioLogado } = useAuth()
  const [loading, setLoading] = useState(true)
  const [usuarios, setUsuarios] = useState<Usuario[]>([])
  const [mostrarFormulario, setMostrarFormulario] = useState(false)
  const [editandoUsuario, setEditandoUsuario] = useState<Usuario | null>(null)
  const [formData, setFormData] = useState({
    nome: '',
    email: '',
    senha: '',
    ativo: true,
    is_admin: false,
  })
  const [confirmModal, setConfirmModal] = useState<{
    open: boolean
    title: string
    message: string
    onConfirm: () => Promise<void>
  } | null>(null)

  useEffect(() => {
    carregarUsuarios()
  }, [])

  const carregarUsuarios = async () => {
    try {
      setLoading(true)
      const data = await usuarioApi.listar()
      setUsuarios(data)
    } catch (error: any) {
      toast.error('Erro ao carregar usuários')
      console.error('Erro ao carregar usuários:', error)
    } finally {
      setLoading(false)
    }
  }

  const limparFormulario = () => {
    setFormData({
      nome: '',
      email: '',
      senha: '',
      ativo: true,
      is_admin: false,
    })
    setEditandoUsuario(null)
    setMostrarFormulario(false)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!formData.nome || !formData.email) {
      toast.error('Preencha nome e email')
      return
    }

    if (!editandoUsuario && !formData.senha) {
      toast.error('Senha é obrigatória para novo usuário')
      return
    }

    if (formData.senha && formData.senha.length < 6) {
      toast.error('Senha deve ter pelo menos 6 caracteres')
      return
    }

    if (editandoUsuario) {
      registrarClique('Salvar', 'Usuários', undefined, 'usuario', editandoUsuario.id, `Editando: ${formData.nome}`)
    } else {
      registrarClique('Adicionar', 'Usuários', undefined, 'usuario', undefined, `Novo: ${formData.nome}`)
    }

    try {
      setLoading(true)

      if (editandoUsuario) {
        const dadosAtualizacao: any = {
          nome: formData.nome.trim(),
          email: formData.email.trim().toLowerCase(),
        }
        if (formData.senha) {
          dadosAtualizacao.senha = formData.senha
        }
        if (isAdmin) {
          dadosAtualizacao.ativo = formData.ativo
          dadosAtualizacao.is_admin = formData.is_admin
        }
        await usuarioApi.atualizar(editandoUsuario.id, dadosAtualizacao)
        toast.success('Usuário atualizado com sucesso!')
      } else {
        // Criar novo usuário
        const dadosCriacao: any = {
          nome: formData.nome.trim(),
          email: formData.email.trim().toLowerCase(),
          senha: formData.senha,
          ativo: formData.ativo,
        }
        if (isAdmin) {
          dadosCriacao.is_admin = formData.is_admin
        }
        await usuarioApi.criar(dadosCriacao)
        toast.success('Usuário criado com sucesso!')
      }

      limparFormulario()
      carregarUsuarios()
    } catch (error: any) {
      const mensagem = error?.response?.data?.message || 'Erro ao salvar usuário'
      toast.error(mensagem)
    } finally {
      setLoading(false)
    }
  }

  const handleEditar = (usuario: Usuario) => {
    registrarClique('Editar', 'Usuários', undefined, 'usuario', usuario.id, `Usuário: ${usuario.nome}`)
    
    setEditandoUsuario(usuario)
    setFormData({
      nome: usuario.nome,
      email: usuario.email,
      senha: '', // Não preencher senha ao editar
      ativo: usuario.ativo,
      is_admin: usuario.is_admin || false,
    })
    setMostrarFormulario(true)
  }

  const handleDeletar = (id: number) => {
    const usuario = usuarios.find(u => u.id === id)
    setConfirmModal({
      open: true,
      title: 'Excluir usuário',
      message: 'Tem certeza que deseja deletar este usuário?',
      onConfirm: async () => {
        registrarClique('Excluir', 'Usuários', undefined, 'usuario', id, usuario ? `Usuário: ${usuario.nome}` : undefined)
        try {
          setLoading(true)
          await usuarioApi.deletar(id)
          toast.success('Usuário deletado com sucesso!')
          setConfirmModal(null)
          carregarUsuarios()
        } catch (error: any) {
          const mensagem = error?.response?.data?.message || 'Erro ao deletar usuário'
          toast.error(mensagem)
          throw error
        } finally {
          setLoading(false)
        }
      },
    })
  }

  if (loading && usuarios.length === 0) {
    return <Loading />
  }

  const rawAdmin = usuarioLogado?.is_admin as boolean | string | number | undefined
  const isAdmin = rawAdmin === true || rawAdmin === 'true' || rawAdmin === 1

  return (
    <div className="container mx-auto px-4">
      <ConfirmModal
        open={!!confirmModal}
        title={confirmModal?.title ?? ''}
        message={confirmModal?.message ?? ''}
        variant="danger"
        onConfirm={confirmModal?.onConfirm ?? (() => {})}
        onCancel={() => setConfirmModal(null)}
      />
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
          {isAdmin ? 'Usuários do Sistema' : 'Meu Usuário'}
        </h1>
        {isAdmin && (
          <button
            onClick={() => {
              registrarClique('Novo Usuário', 'Usuários', undefined, 'usuario')
              limparFormulario()
              setMostrarFormulario(true)
            }}
            className="px-4 py-2 text-sm bg-primary-500 text-white rounded-lg font-semibold hover:bg-primary-600 transition-colors"
          >
            + Novo Usuário
          </button>
        )}
      </div>

      {/* Formulário de criação/edição */}
      {mostrarFormulario && (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4 mb-4 border border-gray-200 dark:border-gray-700">
          <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100 mb-2">
            {editandoUsuario ? 'Editar Usuário' : 'Novo Usuário'}
          </h2>
          <form onSubmit={handleSubmit} className="space-y-2">
            <div>
              <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                Nome *
              </label>
              <input
                type="text"
                value={formData.nome}
                onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                className="w-full px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                Email *
              </label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="w-full px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                Senha {!editandoUsuario && '*'}
                {editandoUsuario && <span className="text-gray-500 dark:text-gray-400 text-xs ml-2">(deixe em branco para não alterar)</span>}
              </label>
              <input
                type="password"
                value={formData.senha}
                onChange={(e) => setFormData({ ...formData, senha: e.target.value })}
                className="w-full px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                required={!editandoUsuario}
                minLength={6}
              />
            </div>

            {/* Apenas admins podem alterar ativo e is_admin */}
            {isAdmin && (
              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="ativo"
                  checked={formData.ativo}
                  onChange={(e) => setFormData({ ...formData, ativo: e.target.checked })}
                  className="w-4 h-4 text-primary-500 border-gray-300 rounded focus:ring-primary-500"
                />
                <label htmlFor="ativo" className="ml-2 text-sm font-semibold text-gray-700 dark:text-gray-300">
                  Usuário ativo
                </label>
              </div>
            )}

            {isAdmin && (
              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="is_admin"
                  checked={formData.is_admin}
                  onChange={(e) => setFormData({ ...formData, is_admin: e.target.checked })}
                  className="w-4 h-4 text-primary-500 border-gray-300 rounded focus:ring-primary-500"
                />
                <label htmlFor="is_admin" className="ml-2 text-sm font-semibold text-gray-700 dark:text-gray-300">
                  Administrador
                </label>
              </div>
            )}

            <div className="flex gap-3">
              <button
                type="submit"
                disabled={loading}
                className="px-6 py-2 bg-primary-500 text-white rounded-lg font-semibold hover:bg-primary-600 transition-colors disabled:opacity-50"
              >
                {editandoUsuario ? 'Atualizar' : 'Criar'}
              </button>
              <button
                type="button"
                onClick={limparFormulario}
                className="px-6 py-2 bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-gray-200 rounded-lg font-semibold hover:bg-gray-300 dark:hover:bg-gray-500 transition-colors"
              >
                Cancelar
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Lista de usuários */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden border border-gray-200 dark:border-gray-700">
        <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-600">
          <thead className="bg-gray-50 dark:bg-gray-700">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 dark:text-gray-300 uppercase tracking-wider">
                Nome
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 dark:text-gray-300 uppercase tracking-wider">
                Email
              </th>
              <th className="px-6 py-3 text-center text-xs font-medium text-gray-600 dark:text-gray-300 uppercase tracking-wider">
                Status
              </th>
              {usuarioLogado?.is_admin && (
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-600 dark:text-gray-300 uppercase tracking-wider">
                  Admin
                </th>
              )}
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 dark:text-gray-300 uppercase tracking-wider">
                Criado em
              </th>
              <th className="px-6 py-3 text-center text-xs font-medium text-gray-600 dark:text-gray-300 uppercase tracking-wider">
                Ações
              </th>
            </tr>
          </thead>
          <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-600">
            {usuarios.length === 0 ? (
              <tr>
                <td colSpan={isAdmin ? 6 : 5} className="px-6 py-4 text-center text-gray-500 dark:text-gray-400">
                  Nenhum usuário cadastrado
                </td>
              </tr>
            ) : (
              usuarios.map((usuario) => (
                <tr key={usuario.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-gray-100">
                    {usuario.nome}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700 dark:text-gray-300 font-medium">
                    {usuario.email}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-center">
                    <span
                      className={`px-2 py-1 text-xs font-semibold rounded-full ${
                        usuario.ativo
                          ? 'bg-green-100 dark:bg-green-900/50 text-green-800 dark:text-green-200'
                          : 'bg-red-100 dark:bg-red-900/50 text-red-800 dark:text-red-200'
                      }`}
                    >
                      {usuario.ativo ? 'Ativo' : 'Inativo'}
                    </span>
                  </td>
                  {isAdmin && (
                    <td className="px-6 py-4 whitespace-nowrap text-center">
                      <span
                        className={`px-2 py-1 text-xs font-semibold rounded-full ${
                          usuario.is_admin
                            ? 'bg-purple-200 dark:bg-purple-900/50 text-purple-900 dark:text-purple-200'
                            : 'bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-gray-200'
                        }`}
                      >
                        {usuario.is_admin ? 'Sim' : 'Não'}
                      </span>
                    </td>
                  )}
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700 dark:text-gray-300 font-medium">
                    {format(new Date(usuario.criado_em), 'dd/MM/yyyy')}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-center text-sm font-medium">
                    <div className="flex justify-center gap-2">
                      <button
                        onClick={() => handleEditar(usuario)}
                        className="text-blue-600 dark:text-blue-400 hover:text-blue-900 dark:hover:text-blue-300 font-semibold"
                      >
                        Editar
                      </button>
                      {isAdmin && (
                        <button
                          onClick={() => handleDeletar(usuario.id)}
                          className="text-red-600 dark:text-red-400 hover:text-red-900 dark:hover:text-red-300 font-semibold"
                        >
                          Deletar
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}

