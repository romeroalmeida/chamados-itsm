import type { Chamado, Status, Usuario } from '@/shared/types'
import { ehEncerrado, ordenarEstouraPrimeiro } from '@/shared/utils/sla'

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
