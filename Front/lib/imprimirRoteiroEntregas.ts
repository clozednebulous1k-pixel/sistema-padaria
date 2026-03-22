/**
 * Impressão padrão de "Roteiro de Entregas" — usada na lista de roteiros e na edição (/roteiros/[id]/editar).
 * Mantém HTML idêntico em todos os pontos.
 */
import { CSS_IMPRESSAO_TABELA_BASE } from '@/lib/cssImpressaoPadrao'
import { opcaoRelatorioParaLabel } from '@/lib/opcoesRelatorio'

/** Número do slot em observações tipo "Roteiro 2 ..." */
export function extrairNumeroSlotObservacoes(obs: string | null | undefined): number | null {
  if (!obs) return null
  const match = String(obs).match(/Roteiro\s*(\d+)/i)
  return match ? parseInt(match[1], 10) : null
}

/**
 * Nome exibido do roteiro (parte após "Roteiro N - "), igual à página /roteiros.
 */
export function nomeExibicaoRoteiro(observacoes: string | null | undefined, slotIndex: number): string {
  const obs = (observacoes || '').trim()
  if (!obs) return ''
  const n = slotIndex + 1
  const regex = new RegExp(`^Roteiro\\s*${n}\\s*[-–—]?\\s*(.*)$`, 'i')
  const m = obs.match(regex)
  if (m) return (m[1] || '').trim()
  return obs
}

/** Nome para cabeçalho da impressão na tela de editar (sem índice de slot da grade). */
export function getNomeRoteiroImpressaoFromObservacoes(observacoes: string | null | undefined): string {
  const num = extrairNumeroSlotObservacoes(observacoes)
  const idx = num != null ? num - 1 : 0
  const nome = nomeExibicaoRoteiro(observacoes, idx)
  if (nome) return nome
  if (num != null) return `Roteiro ${num}`
  return (observacoes || '').trim() || 'Roteiro'
}

export type ItemImpressaoRoteiroEntregas = {
  observacao?: string | null
  produto_nome?: string | null
  produto_id: number
  quantidade: number
  opcao_relatorio?: string | null
  recheio?: string | null
}

export function imprimirRoteiroEntregas(params: {
  nomeRoteiro: string
  diaSemana: string
  dataDia: string
  periodoLabel: string
  itens: ItemImpressaoRoteiroEntregas[]
  tamanhoPercent?: number
  tituloVariant?: 'roteiro' | 'romaneio'
}): void {
  const {
    nomeRoteiro,
    diaSemana,
    dataDia,
    periodoLabel,
    itens,
    tamanhoPercent = 100,
    tituloVariant = 'roteiro',
  } = params

  const tituloDoc = tituloVariant === 'romaneio' ? 'Romaneio' : 'Roteiro de Entregas'
  const tituloH1 = tituloVariant === 'romaneio' ? 'Romaneio de Entrega' : 'Roteiro de Entregas'

  const totaisPorPao = itens.reduce((acc, item) => {
    const nome = item.produto_nome || `ID: ${item.produto_id}`
    acc[nome] = (acc[nome] || 0) + Number(item.quantidade)
    return acc
  }, {} as Record<string, number>)
  const totaisOrdenados = Object.entries(totaisPorPao).sort((a, b) => a[0].localeCompare(b[0]))
  const totalGeral = totaisOrdenados.reduce((sum, [, qtd]) => sum + qtd, 0)

  const janelaImpressao = window.open('', '_blank')
  if (!janelaImpressao) return

  janelaImpressao.document.write(`
        <!DOCTYPE html>
        <html>
          <head>
            <title>${tituloDoc} - ${nomeRoteiro} - ${diaSemana}</title>
            <style>
              ${CSS_IMPRESSAO_TABELA_BASE}
            </style>
          </head>
          <body style="font-size: ${tamanhoPercent}%;">
            <h1>${tituloH1}</h1>
            <div class="info">
              <p><strong>Roteiro:</strong> ${nomeRoteiro} &nbsp;•&nbsp; <strong>Dia:</strong> ${diaSemana} &nbsp;•&nbsp; <strong>Data:</strong> ${dataDia} &nbsp;•&nbsp; <strong>Período:</strong> ${periodoLabel}</p>
            </div>
            <table>
              <thead>
                <tr>
                  <th>Empresa</th>
                  <th>Pão</th>
                  <th>Quantidade</th>
                </tr>
              </thead>
              <tbody>
                ${itens
                  .map((item) => {
                    const paoLabel =
                      (item.produto_nome || `ID: ${item.produto_id}`) +
                      (item.recheio ? ` ${item.recheio}` : '') +
                      (item.opcao_relatorio ? ` ${opcaoRelatorioParaLabel(item.opcao_relatorio)}` : '')
                    return `
                  <tr>
                    <td>${item.observacao || '-'}</td>
                    <td>${paoLabel}</td>
                    <td>${item.quantidade}</td>
                  </tr>
                `
                  })
                  .join('')}
              </tbody>
            </table>
            <div class="totais">
              <h3>Total de pães por tipo</h3>
              <table>
                <thead>
                  <tr>
                    <th>Pão</th>
                    <th>Quantidade</th>
                  </tr>
                </thead>
                <tbody>
                  ${totaisOrdenados
                    .map(
                      ([pao, qtd]) => `
                    <tr>
                      <td>${pao}</td>
                      <td style="text-align: right; font-weight: bold;">${qtd}</td>
                    </tr>
                  `
                    )
                    .join('')}
                </tbody>
              </table>
              <div class="total-geral">Total geral: ${totalGeral} unidade${totalGeral !== 1 ? 's' : ''}</div>
            </div>
          </body>
        </html>
      `)
  janelaImpressao.document.close()
  janelaImpressao.print()
}
