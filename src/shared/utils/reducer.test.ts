import { aplicar, criarEstado, type Estado } from './reducer'
import { DADOS, HELENA, MARINA, chamadoPorNumero } from '@/tests/fixtures/dados'
import type { Evento } from '@/shared/types'

const T = '2026-11-03T13:05:00.000Z'
let estado: Estado
beforeEach(() => { estado = criarEstado(DADOS) })

const semDono = () => Object.values(estado.chamados).find((c) => c.status === 'aberto' && c.grupo_id === (MARINA.perfil === 'consultor' ? MARINA.grupo_id : ''))!

describe('criarEstado', () => {
  it('indexa por id e agrupa mensagens por chamado em ordem cronológica', () => {
    expect(Object.keys(estado.chamados)).toHaveLength(620)
    const c = Object.entries(estado.mensagens).find(([, m]) => m.length === 1500)!
    expect(c).toBeDefined()
    const [, msgs] = c
    for (let i = 1; i < msgs.length; i++) expect(msgs[i]!.criada_em >= msgs[i - 1]!.criada_em).toBe(true)
    expect(estado.historico).toHaveLength(1558)
    expect(estado.idsAplicados.size).toBe(0)
  })
})

describe('chamado.atribuido', () => {
  it('troca responsável, acrescenta histórico de atribuição e não muda status', () => {
    const c = semDono()
    const e: Evento = { id: 'e1', tipo: 'chamado.atribuido', ocorrido_em: T, payload: { chamado_id: c.id, consultor_id: MARINA.id } }
    const s2 = aplicar(estado, e)
    expect(s2.chamados[c.id]!.responsavel_id).toBe(MARINA.id)
    expect(s2.chamados[c.id]!.status).toBe('aberto')
    expect(s2.chamados[c.id]!.atualizado_em).toBe(T)
    const h = s2.historico.at(-1)!
    expect(h).toMatchObject({ id: 'e1', chamado_id: c.id, tipo: 'atribuicao', de: null, para: null, usuario_id: MARINA.id, motivo: null, ocorrido_em: T })
    expect(estado.chamados[c.id]!.responsavel_id).toBeNull() // imutável
  })
})

describe('status.alterado', () => {
  it('muda status, pausa SLA em aguardando_cliente e registra histórico', () => {
    const c = Object.values(estado.chamados).find((c) => c.status === 'em_atendimento')!
    const e: Evento = { id: 'e2', tipo: 'status.alterado', ocorrido_em: T, payload: { chamado_id: c.id, de: 'em_atendimento', para: 'aguardando_cliente', motivo: 'Pedi logs', usuario_id: c.responsavel_id! } }
    const s2 = aplicar(estado, e)
    expect(s2.chamados[c.id]).toMatchObject({ status: 'aguardando_cliente', sla_pausado: true, atualizado_em: T })
    expect(s2.historico.at(-1)).toMatchObject({ id: 'e2', tipo: 'status', de: 'em_atendimento', para: 'aguardando_cliente', motivo: 'Pedi logs' })
  })
  it('preenche resolvido_em e fechado_em; reabrir não limpa', () => {
    const c = Object.values(estado.chamados).find((c) => c.status === 'em_atendimento')!
    let s = aplicar(estado, { id: 'a', tipo: 'status.alterado', ocorrido_em: T, payload: { chamado_id: c.id, de: 'em_atendimento', para: 'resolvido', motivo: 'ok', usuario_id: 'u' } })
    expect(s.chamados[c.id]!.resolvido_em).toBe(T)
    s = aplicar(s, { id: 'b', tipo: 'status.alterado', ocorrido_em: T, payload: { chamado_id: c.id, de: 'resolvido', para: 'fechado', motivo: 'ok', usuario_id: 'u' } })
    expect(s.chamados[c.id]!.fechado_em).toBe(T)
    s = aplicar(s, { id: 'c', tipo: 'status.alterado', ocorrido_em: T, payload: { chamado_id: c.id, de: 'fechado', para: 'em_atendimento', motivo: 'voltou', usuario_id: 'u' } })
    expect(s.chamados[c.id]).toMatchObject({ status: 'em_atendimento', fechado_em: T, sla_pausado: false })
  })
  it('nunca altera o para do evento', () => {
    const c = Object.values(estado.chamados).find((c) => c.status === 'fechado')!
    const s = aplicar(estado, { id: 'x', tipo: 'status.alterado', ocorrido_em: T, payload: { chamado_id: c.id, de: 'fechado', para: 'em_atendimento', motivo: 'm', usuario_id: 'u' } })
    expect(s.chamados[c.id]!.status).toBe('em_atendimento')
  })
})

describe('mensagem.adicionada', () => {
  it('insere e preenche primeira_resposta_em só com resposta não interna da equipe', () => {
    const c = Object.values(estado.chamados).find((c) => c.primeira_resposta_em === null && c.responsavel_id)!
    const base = { chamado_id: c.id, criada_em: T, texto: 'oi' }
    let s = aplicar(estado, { id: 'm1', tipo: 'mensagem.adicionada', ocorrido_em: T, payload: { ...base, id: 'm1', autor_id: c.solicitante_id, interna: false } })
    expect(s.chamados[c.id]!.primeira_resposta_em).toBeNull()
    s = aplicar(s, { id: 'm2', tipo: 'mensagem.adicionada', ocorrido_em: T, payload: { ...base, id: 'm2', autor_id: c.responsavel_id!, interna: true } })
    expect(s.chamados[c.id]!.primeira_resposta_em).toBeNull()
    s = aplicar(s, { id: 'm3', tipo: 'mensagem.adicionada', ocorrido_em: T, payload: { ...base, id: 'm3', autor_id: c.responsavel_id!, interna: false } })
    expect(s.chamados[c.id]!.primeira_resposta_em).toBe(T)
    expect(s.mensagens[c.id]!.slice(-3).map((m) => m.id)).toEqual(['m1', 'm2', 'm3'])
    expect(s.chamados[c.id]!.atualizado_em).toBe(T)
  })
})

describe('chamado.aberto', () => {
  it('insere o chamado com lista de mensagens vazia', () => {
    const novo = { ...chamadoPorNumero(10001), id: 'novo', numero: 99999, status: 'aberto' as const, responsavel_id: null }
    const s = aplicar(estado, { id: 'n', tipo: 'chamado.aberto', ocorrido_em: T, payload: novo })
    expect(s.chamados.novo).toEqual(novo)
    expect(s.mensagens.novo).toEqual([])
  })
})

describe('dedupe e chamado desconhecido', () => {
  it('evento repetido devolve o mesmo estado', () => {
    const c = semDono()
    const e: Evento = { id: 'dup', tipo: 'chamado.atribuido', ocorrido_em: T, payload: { chamado_id: c.id, consultor_id: MARINA.id } }
    const s1 = aplicar(estado, e)
    const s2 = aplicar(s1, e)
    expect(s2).toBe(s1)
    expect(s2.historico.filter((h) => h.id === 'dup')).toHaveLength(1)
  })
  it('evento de chamado ausente é no-op, mas registra o id', () => {
    const s = aplicar(estado, { id: 'z', tipo: 'status.alterado', ocorrido_em: T, payload: { chamado_id: 'nao-existe', de: 'aberto', para: 'em_atendimento', motivo: 'm', usuario_id: 'u' } })
    expect(s.chamados).toBe(estado.chamados)
    expect(s.idsAplicados.has('z')).toBe(true)
  })
  it('cliente respondendo não preenche primeira resposta', () => {
    const c = Object.values(estado.chamados).find((c) => c.solicitante_id === HELENA.id && c.primeira_resposta_em === null)
    if (!c) return
    const s = aplicar(estado, { id: 'h', tipo: 'mensagem.adicionada', ocorrido_em: T, payload: { id: 'h', chamado_id: c.id, criada_em: T, autor_id: HELENA.id, texto: 'x', interna: false } })
    expect(s.chamados[c.id]!.primeira_resposta_em).toBeNull()
  })
})
