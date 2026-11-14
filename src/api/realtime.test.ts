import { QueryClient } from '@tanstack/react-query'
import { criarRealtime } from './realtime'
import { chaves } from './queries/chaves'
import { DADOS, MARINA } from '@/tests/fixtures/dados'
import type { Evento } from '@/shared/types'
import type { Socket } from '@/mock-server/socket'

const T = '2026-11-03T13:05:00.000Z'

function socketFake() {
  const cbs = new Set<(e: Evento) => void>()
  const socket: Socket = { assinar(cb) { cbs.add(cb); return () => cbs.delete(cb) }, estado: () => 'conectado' }
  return { socket, emitir: (e: Evento) => cbs.forEach((cb) => cb(e)) }
}

describe('realtime', () => {
  it('hidrata com GET, aplica evento e projeta para os caches', () => {
    const qc = new QueryClient()
    const { socket, emitir } = socketFake()
    const rt = criarRealtime(qc, socket)
    rt.hidratar.usuarios(DADOS.usuarios)
    const lista = DADOS.chamados.filter((c) => c.grupo_id === (MARINA.perfil === 'consultor' ? MARINA.grupo_id : ''))
    qc.setQueryData(chaves.chamados, lista)
    rt.hidratar.chamados(lista)
    const alvo = lista.find((c) => c.status === 'aberto')!
    emitir({ id: 'e1', tipo: 'chamado.atribuido', ocorrido_em: T, payload: { chamado_id: alvo.id, consultor_id: MARINA.id } })
    const cache = qc.getQueryData<typeof lista>(chaves.chamados)!
    expect(cache.find((c) => c.id === alvo.id)!.responsavel_id).toBe(MARINA.id)
    expect(cache).toHaveLength(lista.length)
    expect(qc.getQueryData(chaves.chamado(alvo.id))).toBeUndefined() // detalhe não carregado: não cria
    rt.parar()
  })

  it('evento repetido não duplica mensagem; detalhe carregado recebe a mensagem', () => {
    const qc = new QueryClient()
    const { socket, emitir } = socketFake()
    const rt = criarRealtime(qc, socket)
    rt.hidratar.usuarios(DADOS.usuarios)
    const c = DADOS.chamados.find((x) => x.status === 'em_atendimento')!
    const det = { chamado: c, mensagens: DADOS.mensagens.filter((m) => m.chamado_id === c.id), historico: DADOS.historico.filter((h) => h.chamado_id === c.id) }
    qc.setQueryData(chaves.chamado(c.id), det)
    rt.hidratar.detalhe(det)
    const e: Evento = { id: 'm', tipo: 'mensagem.adicionada', ocorrido_em: T, payload: { id: 'm', chamado_id: c.id, criada_em: T, autor_id: c.solicitante_id, texto: 'oi', interna: false } }
    emitir(e); emitir(e)
    const novo = qc.getQueryData<typeof det>(chaves.chamado(c.id))!
    expect(novo.mensagens).toHaveLength(det.mensagens.length + 1)
    expect(novo.chamado.atualizado_em).toBe(T)
    rt.parar()
  })

  it('GET depois do evento substitui a fatia (hidratação vence)', () => {
    const qc = new QueryClient()
    const { socket, emitir } = socketFake()
    const rt = criarRealtime(qc, socket)
    const c = DADOS.chamados.find((x) => x.status === 'em_atendimento')!
    qc.setQueryData(chaves.chamados, [c])
    rt.hidratar.chamados([c])
    emitir({ id: 's', tipo: 'status.alterado', ocorrido_em: T, payload: { chamado_id: c.id, de: 'em_atendimento', para: 'resolvido', motivo: 'x', usuario_id: 'u' } })
    expect(qc.getQueryData<typeof DADOS.chamados>(chaves.chamados)![0]!.status).toBe('resolvido')
    rt.hidratar.chamados([{ ...c, status: 'fechado' }])
    emitir({ id: 'outro', tipo: 'chamado.atribuido', ocorrido_em: T, payload: { chamado_id: c.id, consultor_id: 'k' } })
    expect(qc.getQueryData<typeof DADOS.chamados>(chaves.chamados)![0]!.status).toBe('fechado')
    rt.parar()
  })

  it('evento de chamado ainda não carregado é no-op, exceto chamado.aberto', () => {
    const qc = new QueryClient()
    const { socket, emitir } = socketFake()
    const rt = criarRealtime(qc, socket)
    qc.setQueryData(chaves.chamados, [])
    rt.hidratar.chamados([])
    emitir({ id: 'x', tipo: 'status.alterado', ocorrido_em: T, payload: { chamado_id: 'fantasma', de: 'aberto', para: 'em_atendimento', motivo: 'm', usuario_id: 'u' } })
    expect(qc.getQueryData(chaves.chamados)).toEqual([])
    const novo = { ...DADOS.chamados[0]!, id: 'novo' }
    emitir({ id: 'n', tipo: 'chamado.aberto', ocorrido_em: T, payload: novo })
    expect(qc.getQueryData<typeof DADOS.chamados>(chaves.chamados)).toEqual([novo])
    rt.parar()
  })
})
