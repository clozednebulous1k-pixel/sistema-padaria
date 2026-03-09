import { opcaoRelatorioApi } from './api'

/** Opções de relatório (tipagem) */
export type OpcaoRelatorio = string

/** Lista de opções de relatório vinda do backend */
export async function getOpcoesRelatorio(): Promise<string[]> {
  const itens = await opcaoRelatorioApi.listar()
  return (itens || []).map((i) => i.nome).filter((x) => x && x.trim() !== '')
}

/** Salva opções de relatório no backend (substitui as atuais) */
export async function salvarOpcoesRelatorio(opcoes: string[]): Promise<string[]> {
  const existentes = await opcaoRelatorioApi.listar()
  // Remover todas as existentes
  await Promise.all(
    (existentes || []).map((item) => opcaoRelatorioApi.deletar(item.nome).catch(() => undefined)),
  )
  // Criar novas na ordem informada
  const limpas = opcoes
    .map((x) => x.trim().toLowerCase())
    .filter((x, idx, arr) => x && arr.indexOf(x) === idx)

  await Promise.all(limpas.map((nome) => opcaoRelatorioApi.criar(nome)))
  return limpas
}

/** Formata a opção para exibição (capitaliza as palavras) */
export function opcaoRelatorioParaLabel(opcao: string | null | undefined): string {
  if (!opcao || !opcao.trim()) return ''
  const key = opcao.trim().toLowerCase()
  return key
    .split(' ')
    .map((word) => (word ? word.charAt(0).toUpperCase() + word.slice(1).toLowerCase() : ''))
    .join(' ')
}
