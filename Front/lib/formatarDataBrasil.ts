import { format, isValid, parseISO } from 'date-fns'
import { ptBR } from 'date-fns/locale'

/**
 * Exibe data de produção no padrão brasileiro dd/MM/yyyy.
 * Aceita yyyy-MM-dd, ISO com hora (T) ou separador por espaço.
 */
export function formatarDataProducaoBR(data: string | null | undefined): string {
  if (data == null || String(data).trim() === '') return '-'
  const raw = String(data).trim()
  let ymd = raw
  if (raw.includes('T')) ymd = raw.split('T')[0]!
  else if (raw.includes(' ')) ymd = raw.split(' ')[0]!
  if (ymd.length >= 10) ymd = ymd.slice(0, 10)
  try {
    const d = parseISO(ymd)
    if (!isValid(d)) return raw
    return format(d, 'dd/MM/yyyy', { locale: ptBR })
  } catch {
    return raw
  }
}
