import type { Chamado, Historico, UsuarioConsultor } from '@/shared/types'
import { faixaSla, ehEncerrado } from './sla'

const DIA = 24 * 3_600_000
export const JANELA_OCIOSO = 7 * DIA

export interface AgregadoConsultor {
  consultor: UsuarioConsultor
  ativos: number
  vencidos: number
  vencendo4h: number
  /** Aguardando o cliente: SLA pausado. */
  pausados: number
  ociosoMs: number
}

/** A partir de quantos vencidos o cartão do consultor ganha "Sobrecarregado" e o atalho de redistribuir. */
export const LIMITE_SOBRECARGA = 15

const ATIVO = (s: Chamado['status']) => s === 'em_atendimento' || s === 'aguardando_cliente'

/**
 * Spec §6.5. Reconstrói, do histórico, os períodos em que cada chamado esteve ativo e atribuído ao consultor;
 * ocioso = tempo da janela sem nenhum chamado ativo.
 */
export function ociosoNaJanela(consultorId: string, historico: Historico[], chamados: Chamado[], agoraMs: number): number {
  const inicio = agoraMs - JANELA_OCIOSO
  const porChamado = new Map<string, Historico[]>()
  for (const h of historico) (porChamado.get(h.chamado_id) ?? porChamado.set(h.chamado_id, []).get(h.chamado_id)!).push(h)
  const intervalos: Array<[number, number]> = []
  const porId = new Map(chamados.map((c) => [c.id, c]))

  for (const [chamadoId, hs] of porChamado) {
    hs.sort((a, b) => a.ocorrido_em.localeCompare(b.ocorrido_em))
    let dono: string | null = null, status: Chamado['status'] = 'aberto', desde: number | null = null
    const fechar = (ate: number) => { if (desde !== null) { intervalos.push([desde, ate]); desde = null } }
    for (const h of hs) {
      const t = Date.parse(h.ocorrido_em)
      if (h.tipo === 'atribuicao') dono = h.usuario_id
      else if (h.para) status = h.para
      const ativoDele = dono === consultorId && ATIVO(status)
      if (ativoDele && desde === null) desde = t
      if (!ativoDele) fechar(t)
    }
    const atual = porId.get(chamadoId)
    if (desde !== null) {
      // continua ativo até agora se o estado atual confirma; senão fecha na última entrada
      if (atual && atual.responsavel_id === consultorId && ATIVO(atual.status)) fechar(agoraMs)
      else fechar(Date.parse(hs.at(-1)!.ocorrido_em))
    }
  }
  // chamados ativos do consultor sem histórico de atribuição (defesa): contam desde aberto_em
  for (const c of chamados) {
    if (c.responsavel_id === consultorId && ATIVO(c.status) && !porChamado.has(c.id)) intervalos.push([Date.parse(c.aberto_em), agoraMs])
  }

  const recortados = intervalos.map(([a, b]) => [Math.max(a, inicio), Math.min(b, agoraMs)] as [number, number]).filter(([a, b]) => b > a).sort((x, y) => x[0] - y[0])
  let ocupado = 0, cursor = inicio
  for (const [a, b] of recortados) {
    if (b <= cursor) continue
    ocupado += b - Math.max(a, cursor)
    cursor = b
  }
  return JANELA_OCIOSO - ocupado
}

export function agregadosPorConsultor(consultores: UsuarioConsultor[], chamados: Chamado[], historico: Historico[], agoraMs: number): AgregadoConsultor[] {
  return consultores.map((consultor) => {
    const dele = chamados.filter((c) => c.responsavel_id === consultor.id && !ehEncerrado(c))
    const faixas = dele.map((c) => faixaSla(c, agoraMs))
    return {
      consultor,
      ativos: dele.length,
      vencidos: faixas.filter((f) => f === 'vencido').length,
      vencendo4h: faixas.filter((f) => f === 'critico' || f === 'ultima_hora').length,
      pausados: faixas.filter((f) => f === 'pausado').length,
      ociosoMs: ociosoNaJanela(consultor.id, historico, chamados, agoraMs),
    }
  }).sort((a, b) => b.vencidos - a.vencidos || b.ativos - a.ativos)
}

/**
 * Sugestão de destino para redistribuir (só sugestão, o gestor escolhe): mesmo grupo, menos chamados ativos,
 * desempate por mais tempo ocioso na semana. Só sugere quem tem menos ativos que a origem.
 */
export function sugerirDestino(origem: AgregadoConsultor, todos: AgregadoConsultor[]): AgregadoConsultor | null {
  return todos
    .filter((a) => a.consultor.grupo_id === origem.consultor.grupo_id && a.consultor.id !== origem.consultor.id && a.ativos < origem.ativos)
    .sort((a, b) => a.ativos - b.ativos || b.ociosoMs - a.ociosoMs)[0] ?? null
}
