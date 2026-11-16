export type Status = 'aberto' | 'em_atendimento' | 'aguardando_cliente' | 'resolvido' | 'fechado'
export type Prioridade = 'baixa' | 'media' | 'alta' | 'critica'
export type Perfil = 'cliente' | 'consultor' | 'gestor'

export const STATUS: readonly Status[] = ['aberto', 'em_atendimento', 'aguardando_cliente', 'resolvido', 'fechado']
export const PRIORIDADES: readonly Prioridade[] = ['baixa', 'media', 'alta', 'critica']

interface UsuarioBase {
  id: string
  nome: string
  email: string
  locale: string
  zoneinfo: string
}
export type UsuarioCliente = UsuarioBase & { perfil: 'cliente'; empresa: string }
export type UsuarioConsultor = UsuarioBase & { perfil: 'consultor'; grupo_id: string }
export type UsuarioGestor = UsuarioBase & { perfil: 'gestor'; grupos_ids: string[] }
export type Usuario = UsuarioCliente | UsuarioConsultor | UsuarioGestor

export interface Grupo { id: string; nome: string; gestor_id: string }
export interface Categoria { id: string; nome: string; grupo_id: string }
export interface Sla { prioridade: Prioridade; primeira_resposta_horas: number; resolucao_horas: number }

export interface Chamado {
  id: string
  numero: number
  titulo: string
  descricao: string
  categoria_id: string
  grupo_id: string
  prioridade: Prioridade
  status: Status
  solicitante_id: string
  responsavel_id: string | null
  aberto_em: string
  atualizado_em: string
  primeira_resposta_em: string | null
  prazo_primeira_resposta: string
  prazo_resolucao: string
  sla_pausado: boolean
  resolvido_em: string | null
  fechado_em: string | null
}

export interface Mensagem {
  id: string
  chamado_id: string
  criada_em: string
  autor_id: string
  texto: string
  interna: boolean | null
}

/** Resumo da última mensagem que o cliente vê (não interna) de um chamado: GET /mensagens/ultimas. */
export interface UltimaMensagem { chamado_id: string; autor_id: string; criada_em: string }

export interface Historico {
  id: string
  chamado_id: string
  tipo: 'status' | 'atribuicao'
  de: Status | null
  para: Status | null
  usuario_id: string
  motivo: string | null
  ocorrido_em: string
}

export interface Meta {
  tenant: string
  gerado_em: string
  agora: string
  observacao: string
  status_possiveis: Status[]
  prioridades: Prioridade[]
}

export interface Dados {
  meta: Meta
  grupos: Grupo[]
  categorias: Categoria[]
  sla: Sla[]
  usuarios: Usuario[]
  chamados: Chamado[]
  mensagens: Mensagem[]
  historico: Historico[]
}

/** Grupos que o usuário enxerga: consultor o seu, gestor os que gere, cliente nenhum. */
export function gruposDo(usuario: Usuario): string[] {
  if (usuario.perfil === 'consultor') return [usuario.grupo_id]
  if (usuario.perfil === 'gestor') return usuario.grupos_ids
  return []
}
