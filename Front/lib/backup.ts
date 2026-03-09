import { backupApi } from './api'

const PASTA_BACKUP = 'BACKUP_SISTEMA_PADARIA'
const STORAGE_KEY = 'backup-pasta-handle'

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open('padaria-backup', 1)
    req.onupgradeneeded = () => req.result.createObjectStore('handles', { keyPath: 'id' })
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
}

async function salvarHandle(handle: FileSystemDirectoryHandle) {
  try {
    const db = await openDB()
    const tx = db.transaction('handles', 'readwrite')
    tx.objectStore('handles').put({ id: STORAGE_KEY, handle })
    await new Promise<void>((resolve, reject) => {
      tx.oncomplete = () => resolve()
      tx.onerror = () => reject(tx.error)
    })
    db.close()
  } catch {
    // IndexedDB não disponível, ignora
  }
}

async function obterHandleSalvo(): Promise<FileSystemDirectoryHandle | null> {
  try {
    const db = await openDB()
    const tx = db.transaction('handles', 'readonly')
    const req = tx.objectStore('handles').get(STORAGE_KEY)
    const result = await new Promise<{ handle?: FileSystemDirectoryHandle } | undefined>((resolve) => {
      req.onsuccess = () => resolve(req.result)
      req.onerror = () => resolve(undefined)
    })
    db.close()
    return result?.handle ?? null
  } catch {
    return null
  }
}

async function obterPastaBackup(): Promise<FileSystemDirectoryHandle | null> {
  if (!('showDirectoryPicker' in window)) return null

  try {
    const dirHandle = await (window as any).showDirectoryPicker({
      id: 'backup-padaria',
      mode: 'readwrite',
      startIn: 'documents'
    })
    return dirHandle
  } catch (err) {
    if ((err as Error).name === 'AbortError') return null
    throw err
  }
}

async function salvarArquivoComPicker(
  conteudo: string,
  nomeArquivo: string
): Promise<boolean> {
  if (!('showSaveFilePicker' in window)) return false

  try {
    const fileHandle = await (window as any).showSaveFilePicker({
      suggestedName: nomeArquivo,
      types: [{ description: 'JSON', accept: { 'application/json': ['.json'] } }],
      startIn: 'documents'
    })
    const writable = await fileHandle.createWritable()
    await writable.write(conteudo)
    await writable.close()
    return true
  } catch (err) {
    if ((err as Error).name === 'AbortError') return false
    throw err
  }
}

async function obterOuCriarPastaBackup(): Promise<FileSystemDirectoryHandle | null> {
  const salvo = await obterHandleSalvo()
  if (salvo) {
    try {
      const handle = salvo as FileSystemDirectoryHandle & { queryPermission?: (opts: { mode: string }) => Promise<string>; requestPermission?: (opts: { mode: string }) => Promise<string> }
      let perm = handle.queryPermission ? await handle.queryPermission({ mode: 'readwrite' }) : 'granted'
      if (perm !== 'granted' && handle.requestPermission) {
        perm = await handle.requestPermission({ mode: 'readwrite' })
      }
      if (perm === 'granted') return salvo
    } catch {
      // Handle inválido, limpa e pede nova pasta
    }
  }

  const dirHandle = await obterPastaBackup()
  if (!dirHandle) return null

  const pastaBackup = await dirHandle.getDirectoryHandle(PASTA_BACKUP, { create: true })
  await salvarHandle(pastaBackup)
  return pastaBackup
}

async function salvarNaPasta(
  pastaBackup: FileSystemDirectoryHandle,
  conteudo: string,
  nomeArquivo: string
) {
  const fileHandle = await pastaBackup.getFileHandle(nomeArquivo, { create: true })
  const writable = await fileHandle.createWritable()
  await writable.write(conteudo)
  await writable.close()
}

function extrairMensagemErro(error: any): string {
  if (!error) return 'Erro ao fazer backup'
  if (error.response?.data?.message) return error.response.data.message
  if (error.response?.status === 401) return 'Sessão expirada. Faça login novamente.'
  if (error.response?.status === 500) return 'Erro no servidor. Verifique se a API está rodando.'
  if (error.message?.includes('fetch') || error.message?.includes('Network')) {
    return 'Sem conexão com o servidor. Verifique se a API está rodando em ' + (process.env.NEXT_PUBLIC_API_URL || 'localhost:3503')
  }
  return error.message || 'Erro ao fazer backup'
}

export async function executarBackup(onSuccess: (msg: string) => void, onError: (msg: string) => void) {
  let dados: any
  try {
    dados = await backupApi.exportar()
  } catch (error: any) {
    console.error('Erro ao buscar dados do backup:', error)
    onError(extrairMensagemErro(error))
    return
  }

  const conteudo = JSON.stringify(dados, null, 2)
  const dataHora = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19)
  const nomeArquivo = `backup_padaria_${dataHora}.json`

  if ('showSaveFilePicker' in window) {
    try {
      const ok = await salvarArquivoComPicker(conteudo, nomeArquivo)
      if (ok) {
        onSuccess('Backup salvo!')
        return
      }
    } catch (err) {
      if ((err as Error).name !== 'AbortError') console.warn('Erro no save picker:', err)
    }
  }

  if ('showDirectoryPicker' in window) {
    try {
      const pastaBackup = await obterOuCriarPastaBackup()
      if (pastaBackup) {
        await salvarNaPasta(pastaBackup, conteudo, nomeArquivo)
        onSuccess(`Backup salvo na pasta ${PASTA_BACKUP}!`)
        return
      }
    } catch (err) {
      console.warn('Erro ao salvar na pasta:', err)
    }
  }

  try {
    const blob = new Blob([conteudo], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = nomeArquivo
    a.click()
    URL.revokeObjectURL(url)
    onSuccess('Backup baixado na pasta Downloads. Use Chrome ou Edge para escolher a pasta.')
  } catch (error: any) {
    console.error('Erro ao fazer backup:', error)
    onError(extrairMensagemErro(error))
  }
}
