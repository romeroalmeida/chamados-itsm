import type { Chamado, Historico, Mensagem, Usuario } from '@/shared/types'
import { formatarDataHora, formatarDiaHora } from '@/shared/utils/datas'
import { prazoRelevante, TIPO_PRAZO } from '@/shared/utils/sla'
import { ehReabertura } from '@/shared/utils/status'

type Fuso = Pick<Usuario, 'locale' | 'zoneinfo'>
export type Tom = 'atrasado' | 'voce' | 'equipe'
export interface ProximoPasso { tom: Tom; texto: string }
export interface DetalheCliente { chamado: Chamado; mensagens: Mensagem[]; historico: Historico[] }

const DIA: Intl.DateTimeFormatOptions = { day: '2-digit', month: '2-digit' }
const primeiroNome = (nome?: string) => nome?.split(' ')[0]
const trecho = (t: string, max = 80) => (t.length > max ? `${t.slice(0, max).trimEnd()}…` : t)

/**
 * O próximo passo do chamado, em linguagem de cliente, e de quem ele é:
 * "voce" (resolvido para confirmar, ou a equipe pediu informação), "equipe" (ela já falou por último, ou está no prazo)
 * ou "atrasado" (passou da previsão e ainda depende da equipe). Fechado não tem próximo passo.
 */
export function proximoPasso({ chamado: c, mensagens, historico }: DetalheCliente, usuarioId: string, agoraMs: number, nomes: Record<string, string>, fuso: Fuso): ProximoPasso | null {
  const resp = primeiroNome(c.responsavel_id ? nomes[c.responsavel_id] : undefined) ?? 'A equipe'
  const ultima = mensagens.findLast((m) => m.interna !== true)
  if (c.status === 'fechado') return null
  if (c.status === 'resolvido') return { tom: 'voce', texto: `${resp} marcou como resolvido. Confirme se voltou a funcionar, ou diga que ainda não resolveu.` }
  if (c.status === 'aguardando_cliente') {
    const pedido = historico.findLast((h) => h.tipo === 'status' && h.para === 'aguardando_cliente')
    const base = pedido ? `${resp} pediu mais informações em ${formatarDataHora(pedido.ocorrido_em, fuso, DIA)}.` : `${resp} precisa de mais informações.`
    if (ultima?.autor_id === usuarioId && (!pedido || ultima.criada_em > pedido.ocorrido_em)) {
      return { tom: 'voce', texto: `${base} A sua última mensagem: “${trecho(ultima.texto)}” (${formatarDataHora(ultima.criada_em, fuso)}).` }
    }
    return { tom: 'voce', texto: `${base} Responda aqui para o atendimento seguir.` }
  }
  if (c.status === 'em_atendimento' && ultima?.autor_id === usuarioId) {
    return { tom: 'equipe', texto: `Você escreveu em ${formatarDataHora(ultima.criada_em, fuso)}. Agora é com ${c.responsavel_id ? resp : 'a equipe'}.` }
  }
  const { tipo, prazo } = prazoRelevante(c)
  if (Date.parse(prazo) < agoraMs) {
    const quando = formatarDataHora(prazo, fuso)
    return c.status === 'aberto'
      ? { tom: 'atrasado', texto: `Ninguém pegou ainda e já passou da previsão (${quando}). Está em atraso; estamos cuidando.` }
      : { tom: 'atrasado', texto: `${resp} está cuidando, mas já passou da previsão de ${TIPO_PRAZO[tipo]} (${quando}).` }
  }
  return c.status === 'aberto'
    ? { tom: 'equipe', texto: `Aguardando alguém da equipe pegar. Previsão de resposta até ${formatarDiaHora(prazo, fuso)}.` }
    : { tom: 'equipe', texto: `${resp} está cuidando. Previsão de ${TIPO_PRAZO[tipo]} até ${formatarDiaHora(prazo, fuso)}.` }
}

export interface Novidade { id: string; em: string; chamado: Chamado; texto: string; alerta?: boolean }

/** "Desde a sua última visita", em frases. Ações da própria cliente não contam como novidade. */
export function novidadesDesde(itens: DetalheCliente[], ultimaMs: number, usuarioId: string, agoraMs: number, nomes: Record<string, string>): Novidade[] {
  const r: Novidade[] = []
  const depois = (iso: string) => Date.parse(iso) > ultimaMs
  for (const { chamado: c, mensagens, historico } of itens) {
    for (const h of historico) {
      if (h.tipo !== 'status' || !h.para || !depois(h.ocorrido_em) || h.usuario_id === usuarioId) continue
      const quem = nomes[h.usuario_id] ?? 'Alguém da equipe'
      const texto = h.de && ehReabertura(h.de, h.para) ? `${quem} reabriu o chamado`
        : h.para === 'em_atendimento' && h.de === 'aberto' ? `${quem} pegou o seu chamado`
          : h.para === 'em_atendimento' ? `${quem} retomou o atendimento`
            : h.para === 'aguardando_cliente' ? `${quem} pediu mais informações`
              : h.para === 'resolvido' ? `${quem} marcou como resolvido`
                : h.para === 'fechado' ? 'O chamado foi encerrado' : null
      if (texto) r.push({ id: h.id, em: h.ocorrido_em, chamado: c, texto })
    }
    // várias mensagens da mesma pessoa viram uma frase só, na hora da última
    const porAutor = new Map<string, Mensagem[]>()
    for (const m of mensagens) if (m.interna !== true && m.autor_id !== usuarioId && depois(m.criada_em)) porAutor.set(m.autor_id, [...(porAutor.get(m.autor_id) ?? []), m])
    for (const [autor, ms] of porAutor) {
      const quem = nomes[autor] ?? 'Alguém da equipe'
      r.push({ id: `msg:${c.id}:${autor}`, em: ms.at(-1)!.criada_em, chamado: c, texto: ms.length === 1 ? `${quem} respondeu` : `${quem} mandou ${ms.length} mensagens` })
    }
    const { prazo } = prazoRelevante(c)
    const t = Date.parse(prazo)
    if ((c.status === 'aberto' || c.status === 'em_atendimento') && t > ultimaMs && t <= agoraMs) {
      r.push({ id: `prazo:${c.id}`, em: prazo, chamado: c, alerta: true, texto: c.status === 'aberto' ? 'Continua sem resposta e passou do previsto' : 'Passou do previsto e ainda está em atendimento' })
    }
  }
  return r.sort((a, b) => a.em.localeCompare(b.em))
}
