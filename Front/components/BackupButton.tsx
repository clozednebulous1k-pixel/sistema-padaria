'use client'

import { useState } from 'react'
import { executarBackup } from '@/lib/backup'
import toast from 'react-hot-toast'

const PASTA_BACKUP = 'BACKUP_SISTEMA_PADARIA'

export default function BackupButton() {
  const [salvando, setSalvando] = useState(false)
  const [modalAberto, setModalAberto] = useState(false)

  const fazerBackup = async () => {
    setModalAberto(false)
    setSalvando(true)
    await executarBackup(
      (msg) => toast.success(msg),
      (msg) => toast.error(msg)
    )
    setSalvando(false)
  }

  return (
    <>
      <button
        onClick={() => setModalAberto(true)}
        disabled={salvando}
        title="Salvar backup dos dados"
        className="px-3 py-1.5 bg-emerald-500 text-white rounded-lg text-xs font-semibold hover:bg-emerald-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1.5 shadow-sm"
      >
        {salvando ? (
          <span className="inline-block w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
        ) : null}
        Backup
      </button>

      {modalAberto && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50"
          onClick={() => setModalAberto(false)}
        >
          <div
            className="bg-white rounded-xl shadow-xl p-6 max-w-md mx-4"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-lg font-bold text-gray-900 mb-3">Confirmar Backup</h3>
            <p className="text-gray-600 text-sm mb-4">
              Ao clicar em Confirmar, abrirá a janela <strong>&quot;Salvar como&quot;</strong>. Siga os passos:
            </p>
            <ol className="text-gray-600 text-sm list-decimal list-inside space-y-1 mb-4">
              <li>Navegue até <strong>Documentos</strong></li>
              <li>Clique em <strong>Nova pasta</strong> e crie a pasta <strong>{PASTA_BACKUP}</strong></li>
              <li>Entre na pasta criada</li>
              <li>Clique em <strong>Salvar</strong></li>
            </ol>
            <p className="text-gray-500 text-xs">
              Caminho final: <span className="font-mono bg-gray-100 px-1 rounded">Documentos/{PASTA_BACKUP}/</span>
            </p>
            <div className="flex gap-2 justify-end">
              <button
                onClick={() => setModalAberto(false)}
                className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 font-medium"
              >
                Cancelar
              </button>
              <button
                onClick={fazerBackup}
                className="px-4 py-2 bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 font-medium"
              >
                Confirmar
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
