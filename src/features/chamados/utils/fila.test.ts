import { agruparPorUrgencia, clienteRespondeu, filtrarFila, fimDoDia, type FiltroFila } from './fila'
import type { UltimaMensagem } from '@/shared/types'
import { AGORA_ISO, AGORA_MS, DADOS, MARINA } from '@/tests/fixtures/dados'

const base: FiltroFila = { aba: 'meus', status: 'ativos', busca: '', ordem: 'estoura' }
const grupo = MARINA.perfil === 'consultor' ? MARINA.grupo_id : ''

describe('filtrarFila', () => {
  it('"meus" traz os 42 ativos da Marina, vencidos primeiro', () => {
    const r = filtrarFila(DADOS.chamados, MARINA, base, AGORA_MS)
    expect(r).toHaveLength(42)
    expect(r.every((c) => c.responsavel_id === MARINA.id)).toBe(true)
    const primeiro = r[0]!
    expect(Date.parse(primeiro.prazo_resolucao) < AGORA_MS || Date.parse(primeiro.prazo_primeira_resposta) < AGORA_MS).toBe(true)
  })
  it('"sem dono" traz só abertos do grupo dela', () => {
    const r = filtrarFila(DADOS.chamados, MARINA, { ...base, aba: 'sem_dono' }, AGORA_MS)
    expect(r.length).toBeGreaterThan(0)
    expect(r.every((c) => c.status === 'aberto' && c.grupo_id === grupo)).toBe(true)
  })
  it('status "todos" inclui encerrados; busca por número', () => {
    // no arquivo a Marina não tem nenhum encerrado; injeta um
    const fechado = { ...DADOS.chamados.find((c) => c.responsavel_id === MARINA.id)!, id: 'fechado-x', numero: 1, status: 'fechado' as const }
    const comFechado = [...DADOS.chamados, fechado]
    expect(filtrarFila(comFechado, MARINA, base, AGORA_MS)).toHaveLength(42)
    const todos = filtrarFila(comFechado, MARINA, { ...base, status: 'todos' }, AGORA_MS)
    expect(todos).toHaveLength(43)
    expect(todos.at(-1)!.id).toBe('fechado-x') // encerrado vai para o fim
    expect(filtrarFila(comFechado, MARINA, { ...base, status: 'todos', busca: '1' }, AGORA_MS).some((c) => c.id === 'fechado-x')).toBe(true)
  })
})

describe('agruparPorUrgencia', () => {
  it('fim do dia é 23:59:59.999 no fuso da Marina (10:00 em São Paulo vira 02:59:59.999Z do dia seguinte)', () => {
    expect(new Date(fimDoDia(AGORA_MS, 'America/Sao_Paulo')).toISOString()).toBe('2026-11-04T02:59:59.999Z')
    expect(new Date(fimDoDia(AGORA_MS, 'Europe/Lisbon')).toISOString()).toBe('2026-11-03T23:59:59.999Z')
  })
  it('os 42 da Marina: 15 vencidos, 5 na próxima hora, 13 hoje, 9 depois', () => {
    const lista = filtrarFila(DADOS.chamados, MARINA, base, AGORA_MS)
    const g = agruparPorUrgencia(lista, AGORA_MS, MARINA.zoneinfo)
    expect(g.map((x) => [x.id, x.chamados.length])).toEqual([['vencidos', 15], ['proxima_hora', 5], ['hoje', 13], ['depois', 9], ['pausados', 0], ['encerrados', 0]])
    expect(g.flatMap((x) => x.chamados)).toEqual(lista) // mantém a ordem "estoura primeiro"
  })
  it('pausado e encerrado vão para os próprios grupos', () => {
    const c = DADOS.chamados.find((x) => x.responsavel_id === MARINA.id)!
    const g = agruparPorUrgencia([{ ...c, status: 'aguardando_cliente', sla_pausado: true }, { ...c, id: 'f', status: 'fechado' }], AGORA_MS, MARINA.zoneinfo)
    expect(g.find((x) => x.id === 'pausados')!.chamados).toHaveLength(1)
    expect(g.find((x) => x.id === 'encerrados')!.chamados).toHaveLength(1)
  })
})

describe('clienteRespondeu', () => {
  it('17 dos 42 da Marina têm a última mensagem não interna do cliente', () => {
    const lista = filtrarFila(DADOS.chamados, MARINA, base, AGORA_MS)
    const ultimas = new Map<string, UltimaMensagem>()
    for (const m of [...DADOS.mensagens].sort((a, b) => a.criada_em.localeCompare(b.criada_em))) {
      if (m.interna !== true) ultimas.set(m.chamado_id, { chamado_id: m.chamado_id, autor_id: m.autor_id, criada_em: m.criada_em })
    }
    expect(lista.filter((c) => clienteRespondeu(c, ultimas.get(c.id)))).toHaveLength(17)
  })
  it('sem mensagem ou com a equipe por último, não respondeu', () => {
    const c = DADOS.chamados[0]!
    expect(clienteRespondeu(c, undefined)).toBe(false)
    expect(clienteRespondeu(c, { chamado_id: c.id, autor_id: 'outro', criada_em: AGORA_ISO })).toBe(false)
    expect(clienteRespondeu(c, { chamado_id: c.id, autor_id: c.solicitante_id, criada_em: AGORA_ISO })).toBe(true)
  })
})
