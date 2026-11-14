import type { Chamado, Prioridade, Sla } from '@/shared/types'

export type Faixa = 'encerrado' | 'pausado' | 'vencido' | 'ultima_hora' | 'critico' | 'atencao' | 'ok'
export type TipoPrazo = 'primeira_resposta' | 'resolucao'

const HORA = 3_600_000
export const LIMITES = { ultima_hora: HORA, critico: 4 * HORA, atencao: 24 * HORA } as const

export function ehEncerrado(c: Pick<Chamado, 'status'>): boolean {
  return c.status === 'resolvido' || c.status === 'fechado'
}

export function prazoRelevante(c: Chamado): { tipo: TipoPrazo; prazo: string } {
  return c.primeira_resposta_em === null
    ? { tipo: 'primeira_resposta', prazo: c.prazo_primeira_resposta }
    : { tipo: 'resolucao', prazo: c.prazo_resolucao }
}

export function restanteMs(c: Chamado, agoraMs: number): number {
  return Date.parse(prazoRelevante(c).prazo) - agoraMs
}

export function faixaSla(c: Chamado, agoraMs: number): Faixa {
  if (ehEncerrado(c)) return 'encerrado'
  if (c.sla_pausado) return 'pausado'
  const r = restanteMs(c, agoraMs)
  if (r < 0) return 'vencido'
  if (r <= LIMITES.ultima_hora) return 'ultima_hora'
  if (r <= LIMITES.critico) return 'critico'
  if (r <= LIMITES.atencao) return 'atencao'
  return 'ok'
}

const GRAVIDADE: Record<Faixa, number> = { ok: 0, atencao: 1, critico: 2, ultima_hora: 3, vencido: 4, pausado: -1, encerrado: -1 }
const ALERTA: ReadonlySet<Faixa> = new Set(['critico', 'ultima_hora', 'vencido'])

/** Só piora para faixa de alerta merece aviso. */
export function faixaMudou(anterior: Faixa | undefined, atual: Faixa): boolean {
  if (anterior === undefined || anterior === atual) return false
  return ALERTA.has(atual) && GRAVIDADE[atual] > GRAVIDADE[anterior]
}

export function calcularPrazos(abertoEmIso: string, prioridade: Prioridade, tabela: Sla[]) {
  const sla = tabela.find((s) => s.prioridade === prioridade)
  if (!sla) throw new Error(`SLA não definido para prioridade ${prioridade}`)
  const base = Date.parse(abertoEmIso)
  return {
    prazo_primeira_resposta: new Date(base + sla.primeira_resposta_horas * HORA).toISOString(),
    prazo_resolucao: new Date(base + sla.resolucao_horas * HORA).toISOString(),
  }
}

/** Vencidos primeiro, depois menor restante, pausados, encerrados (mais recente primeiro). */
export function ordenarEstouraPrimeiro(chamados: Chamado[], agoraMs: number): Chamado[] {
  const grupo = (c: Chamado) => {
    const f = faixaSla(c, agoraMs)
    if (f === 'encerrado') return 3
    if (f === 'pausado') return 2
    if (f === 'vencido') return 0
    return 1
  }
  return [...chamados].sort((a, b) => {
    const ga = grupo(a), gb = grupo(b)
    if (ga !== gb) return ga - gb
    if (ga === 3) return Date.parse(b.atualizado_em) - Date.parse(a.atualizado_em)
    if (ga === 2) return Date.parse(b.atualizado_em) - Date.parse(a.atualizado_em)
    return restanteMs(a, agoraMs) - restanteMs(b, agoraMs)
  })
}
