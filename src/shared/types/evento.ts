import type { Chamado, Mensagem, Status } from './dominio'

interface EventoBase { id: string; ocorrido_em: string }

export type EventoChamadoAberto = EventoBase & { tipo: 'chamado.aberto'; payload: Chamado }
export type EventoChamadoAtribuido = EventoBase & {
  tipo: 'chamado.atribuido'
  payload: { chamado_id: string; consultor_id: string }
}
export type EventoMensagemAdicionada = EventoBase & { tipo: 'mensagem.adicionada'; payload: Mensagem }
export type EventoStatusAlterado = EventoBase & {
  tipo: 'status.alterado'
  payload: { chamado_id: string; de: Status; para: Status; motivo: string; usuario_id: string }
}

export type Evento =
  | EventoChamadoAberto
  | EventoChamadoAtribuido
  | EventoMensagemAdicionada
  | EventoStatusAlterado

export type TipoEvento = Evento['tipo']
export const TIPOS_EVENTO: readonly TipoEvento[] = ['chamado.aberto', 'chamado.atribuido', 'mensagem.adicionada', 'status.alterado']

export function ehEvento(x: unknown): x is Evento {
  if (!x || typeof x !== 'object') return false
  const e = x as Record<string, unknown>
  return typeof e.id === 'string' && typeof e.ocorrido_em === 'string'
    && TIPOS_EVENTO.includes(e.tipo as TipoEvento) && typeof e.payload === 'object' && e.payload !== null
}

export function chamadoIdDe(e: Evento): string {
  return e.tipo === 'chamado.aberto' ? e.payload.id : e.payload.chamado_id
}
