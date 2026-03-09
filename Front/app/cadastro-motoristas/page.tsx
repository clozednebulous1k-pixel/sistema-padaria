'use client'

import { useState, useEffect } from 'react'
import { motoristaApi, Motorista } from '@/lib/api'
import toast from 'react-hot-toast'
import Loading from '@/components/Loading'
import { registrarClique } from '@/lib/audit'
import ConfirmModal from '@/components/ConfirmModal'

export default function CadastroMotoristasPage() {
  const [motoristas, setMotoristas] = useState<Motorista[]>([])
  const [loading, setLoading] = useState(true)
  const [novoMotorista, setNovoMotorista] = useState('')
  const [periodoMotorista, setPeriodoMotorista] = useState<'matutino' | 'noturno' | ''>('')
  const [carregando, setCarregando] = useState(false)
  const [confirmModal, setConfirmModal] = useState<{
    open: boolean
    title: string
    message: string
    onConfirm: () => Promise<void>
  } | null>(null)

  useEffect(() => {
    carregarMotoristas()
  }, [])

  const carregarMotoristas = async () => {
    try {
      setLoading(true)
      const data = await motoristaApi.listar()
      setMotoristas(data)
    } catch (error: any) {
      console.error('Erro ao carregar motoristas:', error)
      try {
        const motoristasSalvos = localStorage.getItem('motoristas_padaria')
        if (motoristasSalvos) {
          const dados = JSON.parse(motoristasSalvos)
          if (dados.length > 0 && typeof dados[0] === 'string') {
            const motoristasObj: Motorista[] = dados.map((nome: string, index: number) => ({
              id: index + 1,
              nome,
              periodo: 'matutino' as const,
              criado_em: new Date().toISOString()
            }))
            setMotoristas(motoristasObj)
          } else if (dados.length > 0 && 'nome' in dados[0]) {
            const motoristasObj: Motorista[] = dados.map((m: any, index: number) => ({
              id: index + 1,
              nome: m.nome,
              periodo: (m.periodo || 'matutino') as 'matutino' | 'noturno',
              criado_em: new Date().toISOString()
            }))
            setMotoristas(motoristasObj)
          }
        }
      } catch (localError) {
        console.error('Erro ao carregar motoristas do localStorage:', localError)
      }
    } finally {
      setLoading(false)
    }
  }

  const adicionarMotorista = async () => {
    registrarClique('Adicionar', 'CadastroMotoristas', undefined, 'motorista')

    const nomeLimpo = novoMotorista.trim()
    if (!nomeLimpo) {
      toast.error('Digite o nome do motorista')
      return
    }

    if (motoristas.some((m) => m.nome.toLowerCase() === nomeLimpo.toLowerCase())) {
      toast.error('Este motorista já está cadastrado')
      return
    }

    if (!periodoMotorista) {
      toast.error('Selecione o período do motorista')
      return
    }

    try {
      setCarregando(true)
      const novoMotoristaObj = await motoristaApi.criar({
        nome: nomeLimpo,
        periodo: periodoMotorista
      })
      setMotoristas(
        [...motoristas, novoMotoristaObj].sort((a, b) => a.nome.localeCompare(b.nome))
      )
      setNovoMotorista('')
      setPeriodoMotorista('')
      toast.success('Motorista adicionado com sucesso!')
    } catch (error: any) {
      console.error('Erro ao adicionar motorista:', error)
      const mensagemErro =
        error?.response?.data?.message || error?.message || 'Erro ao adicionar motorista'
      toast.error(`Erro: ${mensagemErro}`)
    } finally {
      setCarregando(false)
    }
  }

  const removerMotorista = (id: number, nome: string) => {
    setConfirmModal({
      open: true,
      title: 'Remover motorista',
      message: `Deseja realmente remover o motorista "${nome}"?`,
      onConfirm: async () => {
        registrarClique('Excluir', 'CadastroMotoristas', undefined, 'motorista', id, `Motorista: ${nome}`)
        try {
          setCarregando(true)
          await motoristaApi.deletar(id)
          setMotoristas(motoristas.filter((m) => m.id !== id))
          toast.success('Motorista removido com sucesso!')
          setConfirmModal(null)
        } catch (error: any) {
          console.error('Erro ao remover motorista:', error)
          const mensagemErro =
            error?.response?.data?.message || error?.message || 'Erro ao remover motorista'
          toast.error(`Erro: ${mensagemErro}`)
          throw error
        } finally {
          setCarregando(false)
        }
      },
    })
  }

  if (loading) {
    return <Loading />
  }

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
        <h1 className="text-2xl font-bold text-gray-900">Cadastro de Motoristas</h1>
        <p className="text-gray-600 mt-1 text-sm">
          Cadastre os motoristas que serão utilizados nos roteiros de entrega
        </p>
      </div>

      <div className="bg-white rounded-lg shadow p-4 w-full">
        <h2 className="text-lg font-bold text-gray-900 mb-3">
          Motoristas cadastrados ({motoristas.length})
        </h2>
        <div className="mb-3 space-y-3">
          <div className="flex flex-wrap gap-2">
            <input
              type="text"
              value={novoMotorista}
              onChange={(e) => setNovoMotorista(e.target.value)}
              onKeyPress={(e) => {
                if (e.key === 'Enter') {
                  adicionarMotorista()
                }
              }}
              placeholder="Nome do motorista"
              className="flex-1 min-w-[200px] px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            />
            <select
              value={periodoMotorista}
              onChange={(e) =>
                setPeriodoMotorista(e.target.value as 'matutino' | 'noturno' | '')
              }
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            >
              <option value="">Período</option>
              <option value="matutino">Matutino</option>
              <option value="noturno">Noturno</option>
            </select>
            <button
              onClick={adicionarMotorista}
              disabled={carregando}
              className="bg-primary-500 text-white px-4 py-2 rounded-lg font-semibold hover:bg-primary-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Adicionar
            </button>
          </div>
        </div>
        {motoristas.length === 0 ? (
          <p className="text-gray-500 text-sm text-center py-8">
            Nenhum motorista cadastrado. Adicione motoristas para usar nos roteiros de entrega.
          </p>
        ) : (
          <div className="max-h-[calc(100vh-280px)] overflow-y-auto">
            <div className="space-y-2">
              {motoristas.map((motorista) => (
                <div
                  key={motorista.id}
                  className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                >
                  <span className="text-sm font-medium text-gray-900">
                    {motorista.nome} -{' '}
                    {motorista.periodo === 'matutino' ? 'Matutino' : 'Noturno'}
                  </span>
                  <button
                    onClick={() => removerMotorista(motorista.id, motorista.nome)}
                    className="text-red-600 hover:text-red-700 font-semibold text-xs disabled:opacity-50"
                    disabled={carregando}
                  >
                    Remover
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
