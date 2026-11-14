import type { Chamado, Dados, Evento, Historico, Mensagem, Usuario } from '@/shared/types'

export interface Estado {
  chamados: Record<string, Chamado>
  /** por chamado_id, ordem cronológica */
  mensagens: Record<string, Mensagem[]>
  historico: Historico[]
  usuarios: Record<string, Usuario>
  idsAplicados: Set<string>
}

type Fonte = Pick<Dados, 'chamados' | 'mensagens' | 'historico' | 'usuarios'>

export function criarEstado(dados: Fonte): Estado {
  const chamados: Record<string, Chamado> = {}
  const mensagens: Record<string, Mensagem[]> = {}
  for (const c of dados.chamados) { chamados[c.id] = c; mensagens[c.id] = [] }
  for (const m of dados.mensagens) (mensagens[m.chamado_id] ??= []).push(m)
  // ordenação por string ISO: o arquivo não tem milissegundos e eventos novos têm; só desempata errado dentro do mesmo segundo
  for (const lista of Object.values(mensagens)) lista.sort((a, b) => a.criada_em.localeCompare(b.criada_em))
  const usuarios: Record<string, Usuario> = {}
  for (const u of dados.usuarios) usuarios[u.id] = u
  return {
    chamados,
    mensagens,
    historico: [...dados.historico].sort((a, b) => a.ocorrido_em.localeCompare(b.ocorrido_em)),
    usuarios,
    idsAplicados: new Set(),
  }
}

export function estadoVazio(): Estado {
  return { chamados: {}, mensagens: {}, historico: [], usuarios: {}, idsAplicados: new Set() }
}

function ehEquipe(estado: Estado, usuarioId: string): boolean {
  const p = estado.usuarios[usuarioId]?.perfil
  return p === 'consultor' || p === 'gestor'
}

/** Puro. Devolve o mesmo objeto se o id já foi aplicado. Nunca altera `para`. */
export function aplicar(estado: Estado, evento: Evento): Estado {
  if (estado.idsAplicados.has(evento.id)) return estado
  const idsAplicados = new Set(estado.idsAplicados).add(evento.id)

  if (evento.tipo === 'chamado.aberto') {
    const c = evento.payload
    return {
      ...estado,
      idsAplicados,
      chamados: { ...estado.chamados, [c.id]: c },
      mensagens: { ...estado.mensagens, [c.id]: estado.mensagens[c.id] ?? [] },
    }
  }

  const id = evento.payload.chamado_id
  const atual = estado.chamados[id]
  if (!atual) return { ...estado, idsAplicados } // chegou antes do GET; o GET seguinte traz tudo

  if (evento.tipo === 'chamado.atribuido') {
    const h: Historico = { id: evento.id, chamado_id: id, tipo: 'atribuicao', de: null, para: null, usuario_id: evento.payload.consultor_id, motivo: null, ocorrido_em: evento.ocorrido_em }
    return {
      ...estado,
      idsAplicados,
      chamados: { ...estado.chamados, [id]: { ...atual, responsavel_id: evento.payload.consultor_id, atualizado_em: evento.ocorrido_em } },
      historico: [...estado.historico, h],
    }
  }

  if (evento.tipo === 'mensagem.adicionada') {
    const m = evento.payload
    const respostaDaEquipe = m.interna !== true && ehEquipe(estado, m.autor_id)
    const chamado: Chamado = {
      ...atual,
      atualizado_em: evento.ocorrido_em,
      primeira_resposta_em: atual.primeira_resposta_em ?? (respostaDaEquipe ? m.criada_em : null),
    }
    return {
      ...estado,
      idsAplicados,
      chamados: { ...estado.chamados, [id]: chamado },
      mensagens: { ...estado.mensagens, [id]: [...(estado.mensagens[id] ?? []), m] },
    }
  }

  // status.alterado
  const { de, para, motivo, usuario_id } = evento.payload
  const h: Historico = { id: evento.id, chamado_id: id, tipo: 'status', de, para, usuario_id, motivo, ocorrido_em: evento.ocorrido_em }
  const chamado: Chamado = {
    ...atual,
    status: para,
    atualizado_em: evento.ocorrido_em,
    sla_pausado: para === 'aguardando_cliente',
    resolvido_em: para === 'resolvido' ? evento.ocorrido_em : atual.resolvido_em,
    fechado_em: para === 'fechado' ? evento.ocorrido_em : atual.fechado_em,
  }
  return {
    ...estado,
    idsAplicados,
    chamados: { ...estado.chamados, [id]: chamado },
    historico: [...estado.historico, h],
  }
}

export function aplicarTodos(estado: Estado, eventos: Evento[]): Estado {
  return eventos.reduce(aplicar, estado)
}
