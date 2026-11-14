import type { Chamado } from '@/shared/types'

const STOPWORDS = new Set(['a', 'o', 'as', 'os', 'de', 'do', 'da', 'dos', 'das', 'e', 'em', 'no', 'na', 'nos', 'nas', 'para', 'por', 'com', 'sem', 'um', 'uma', 'ao', 'aos', 'que', 'se', 'ou', 'nao', 'ja', 'mais'])
const DIAS_90 = 90 * 24 * 3_600_000

export function normalizarTitulo(t: string): string[] {
  return t.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()
    .split(/[^a-z0-9]+/).filter((p) => p.length > 1 && !STOPWORDS.has(p))
}

/** Spec §6.4: mesmo solicitante (lista já filtrada), encerrado nos últimos 90 dias, ≥ 2 palavras em comum ou título idêntico. */
export function sugerirParecido(titulo: string, candidatos: Chamado[], agoraMs: number): Chamado | null {
  const palavras = new Set(normalizarTitulo(titulo))
  const alvo = normalizarTitulo(titulo).join(' ')
  if (palavras.size === 0) return null
  const elegiveis = candidatos
    .filter((c) => (c.status === 'resolvido' || c.status === 'fechado') && agoraMs - Date.parse(c.atualizado_em) <= DIAS_90 && agoraMs >= Date.parse(c.atualizado_em))
    .filter((c) => {
      const dele = normalizarTitulo(c.titulo)
      if (dele.join(' ') === alvo) return true
      return dele.filter((p) => palavras.has(p)).length >= 2
    })
    .sort((a, b) => Date.parse(b.atualizado_em) - Date.parse(a.atualizado_em))
  return elegiveis[0] ?? null
}
