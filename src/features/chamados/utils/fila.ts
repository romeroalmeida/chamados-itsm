import type { Chamado, Status, UltimaMensagem, Usuario } from '@/shared/types'
import { ehEncerrado, faixaSla, ordenarEstouraPrimeiro, prazoRelevante } from '@/shared/utils/sla'

export type AbaFila = 'meus' | 'sem_dono'
export type FiltroStatus = 'ativos' | 'todos' | Status
export type OrdemFila = 'estoura' | 'recente' | 'cliente'
export interface FiltroFila { aba: AbaFila; status: FiltroStatus; busca: string; ordem: OrdemFila }

export function filtrarFila(chamados: Chamado[], usuario: Usuario, f: FiltroFila, agoraMs: number, nomes: Record<string, string> = {}): Chamado[] {
  let lista = chamados.filter((c) => f.aba === 'meus'
    ? c.responsavel_id === usuario.id
    : c.status === 'aberto' && c.responsavel_id === null && (usuario.perfil !== 'consultor' || c.grupo_id === usuario.grupo_id))
  if (f.status === 'ativos') lista = lista.filter((c) => !ehEncerrado(c))
  else if (f.status !== 'todos') lista = lista.filter((c) => c.status === f.status)
  const q = f.busca.trim().toLowerCase()
  if (q) lista = lista.filter((c) => String(c.numero).includes(q) || c.titulo.toLowerCase().includes(q) || (nomes[c.solicitante_id] ?? '').toLowerCase().includes(q))
  if (f.ordem === 'recente') return [...lista].sort((a, b) => b.atualizado_em.localeCompare(a.atualizado_em))
  if (f.ordem === 'cliente') return [...lista].sort((a, b) => (nomes[a.solicitante_id] ?? '').localeCompare(nomes[b.solicitante_id] ?? ''))
  return ordenarEstouraPrimeiro(lista, agoraMs)
}

export type GrupoUrgencia = 'vencidos' | 'proxima_hora' | 'hoje' | 'depois' | 'pausados' | 'encerrados'
export const GRUPOS_URGENCIA: ReadonlyArray<{ id: GrupoUrgencia; rotulo: string; dica?: string }> = [
  { id: 'vencidos', rotulo: 'Vencidos', dica: 'mais antigo primeiro' },
  { id: 'proxima_hora', rotulo: 'Próxima hora' },
  { id: 'hoje', rotulo: 'Hoje', dica: 'até 23:59' },
  { id: 'depois', rotulo: 'Depois' },
  { id: 'pausados', rotulo: 'Pausados', dica: 'aguardando o cliente' },
  { id: 'encerrados', rotulo: 'Encerrados' },
]

const DIA = 86_400_000

/** Último milissegundo do dia corrente no fuso do usuário (23:59:59.999 local). */
export function fimDoDia(agoraMs: number, zoneinfo: string): number {
  const p = Object.fromEntries(new Intl.DateTimeFormat('en-US', { timeZone: zoneinfo, hourCycle: 'h23', hour: 'numeric', minute: 'numeric', second: 'numeric' })
    .formatToParts(new Date(agoraMs)).map((x) => [x.type, Number(x.value)]))
  const decorrido = ((p.hour! * 60 + p.minute!) * 60 + p.second!) * 1000 + (agoraMs % 1000)
  // shortcut: em dia de troca de horário de verão erra em 1 h; o fuso dos consultores (America/Sao_Paulo) não tem horário de verão desde 2019
  return agoraMs - decorrido + DIA - 1
}

/**
 * Grupo de urgência a partir da faixa de SLA (spec §6.2), na ordem da proposta de layout:
 * vencido; próxima hora = até 1 h (faixa `ultima_hora`); hoje = mais de 1 h e o prazo relevante cai até 23:59 do dia
 * no fuso do consultor; depois = prazo a partir de amanhã. Pausados e encerrados ficam fora da contagem de prazo.
 */
export function grupoDeUrgencia(c: Chamado, agoraMs: number, fimDoDiaMs: number): GrupoUrgencia {
  const f = faixaSla(c, agoraMs)
  if (f === 'encerrado') return 'encerrados'
  if (f === 'pausado') return 'pausados'
  if (f === 'vencido') return 'vencidos'
  if (f === 'ultima_hora') return 'proxima_hora'
  return Date.parse(prazoRelevante(c).prazo) <= fimDoDiaMs ? 'hoje' : 'depois'
}

/** Mantém a ordem recebida dentro de cada grupo; devolve os seis grupos, vazios inclusive (os contadores precisam do zero). */
export function agruparPorUrgencia(lista: Chamado[], agoraMs: number, zoneinfo: string): Array<{ id: GrupoUrgencia; chamados: Chamado[] }> {
  const fim = fimDoDia(agoraMs, zoneinfo)
  const grupos = new Map(GRUPOS_URGENCIA.map((g) => [g.id, [] as Chamado[]]))
  for (const c of lista) grupos.get(grupoDeUrgencia(c, agoraMs, fim))!.push(c)
  return GRUPOS_URGENCIA.map((g) => ({ id: g.id, chamados: grupos.get(g.id)! }))
}

/** "Respondeu": a última mensagem que o cliente vê (não interna) é do próprio cliente. */
export function clienteRespondeu(c: Chamado, ultima: UltimaMensagem | undefined): boolean {
  return ultima !== undefined && ultima.autor_id === c.solicitante_id
}
