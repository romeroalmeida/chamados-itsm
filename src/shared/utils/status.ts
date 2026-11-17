import type { Perfil, Prioridade, Status } from '@/shared/types'

interface Transicao {
  de: Status
  para: Status
  perfis: readonly Perfil[]
  /** Motivo que o servidor preenche; null = usuário digita. */
  automatico: ((perfil: Perfil) => string | null) | null
}

const EQUIPE: readonly Perfil[] = ['consultor', 'gestor']
const TODOS: readonly Perfil[] = ['cliente', 'consultor', 'gestor']

/** Spec §6.1. `aberto -> em_atendimento` não está aqui: só acontece via POST /atribuir. */
export const TRANSICOES: readonly Transicao[] = [
  { de: 'em_atendimento', para: 'aguardando_cliente', perfis: EQUIPE, automatico: null },
  { de: 'aguardando_cliente', para: 'em_atendimento', perfis: EQUIPE, automatico: null },
  { de: 'em_atendimento', para: 'resolvido', perfis: EQUIPE, automatico: null },
  { de: 'resolvido', para: 'fechado', perfis: TODOS, automatico: (p) => (p === 'cliente' ? 'Confirmado pelo cliente' : null) },
  { de: 'resolvido', para: 'em_atendimento', perfis: TODOS, automatico: null },
  { de: 'fechado', para: 'em_atendimento', perfis: TODOS, automatico: null },
]

export const MOTIVO_PEGOU = 'Assumido para atendimento'
export const MOTIVO_CLIENTE_RESPONDEU = 'Cliente respondeu'
export const motivoAtribuidoPor = (nomeGestor: string) => `Atribuído por ${nomeGestor}`

export function transicoesPermitidas(status: Status, perfil: Perfil): Status[] {
  return TRANSICOES.filter((t) => t.de === status && t.perfis.includes(perfil)).map((t) => t.para)
}

export function transicaoValida(de: Status, para: Status, perfil: Perfil): boolean {
  return TRANSICOES.some((t) => t.de === de && t.para === para && t.perfis.includes(perfil))
}

export function motivoAutomatico(de: Status, para: Status, perfil: Perfil): string | null {
  const t = TRANSICOES.find((t) => t.de === de && t.para === para && t.perfis.includes(perfil))
  return t?.automatico?.(perfil) ?? null
}

export function ehReabertura(de: Status, para: Status): boolean {
  return (de === 'resolvido' || de === 'fechado') && para === 'em_atendimento'
}

export const ROTULO_STATUS: Record<Status, string> = {
  aberto: 'Aberto',
  em_atendimento: 'Em atendimento',
  aguardando_cliente: 'Aguardando cliente',
  resolvido: 'Resolvido',
  fechado: 'Fechado',
}

export const ROTULO_PRIORIDADE: Record<Prioridade, string> = { baixa: 'Baixa', media: 'Média', alta: 'Alta', critica: 'Crítica' }

/** Selo da cliente, na linguagem dela (spec §5.3); quem cuida aparece ao lado ("com Marina Almeida"). */
export const ROTULO_STATUS_CLIENTE: Record<Status, string> = {
  aberto: 'Aguardando atendimento',
  em_atendimento: 'Em atendimento',
  aguardando_cliente: 'Aguardando sua resposta',
  resolvido: 'Resolvido, aguardando sua confirmação',
  fechado: 'Fechado',
}

export const ROTULO_ACAO: Partial<Record<`${Status}>${Status}`, string>> = {
  'em_atendimento>aguardando_cliente': 'Aguardar cliente',
  'aguardando_cliente>em_atendimento': 'Retomar atendimento',
  'em_atendimento>resolvido': 'Marcar como resolvido',
  'resolvido>fechado': 'Fechar',
  'resolvido>em_atendimento': 'Reabrir',
  'fechado>em_atendimento': 'Reabrir',
}

/** Sugestões de motivo por transição (equipe), extraídas das strings reais de historico.motivo em dados.json. */
export const MOTIVOS_SUGERIDOS: Partial<Record<`${Status}>${Status}`, string[]>> = {
  'em_atendimento>aguardando_cliente': ['Aguardando retorno do cliente', 'Aguardando validação', 'Solicitadas informações adicionais'],
  'em_atendimento>resolvido': ['Correção aplicada', 'Problema não reproduzido', 'Resolvido com workaround'],
  'resolvido>fechado': ['Fechado após confirmação do cliente'],
  'fechado>em_atendimento': ['Reaberto a pedido do cliente'],
  'resolvido>em_atendimento': ['Reaberto a pedido do cliente'],
  // 'aguardando_cliente>em_atendimento' não tem motivo registrado em dados.json: só "Outro motivo".
}

export function motivosSugeridos(de: Status, para: Status): string[] {
  return MOTIVOS_SUGERIDOS[`${de}>${para}`] ?? []
}
