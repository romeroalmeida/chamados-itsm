import { criarSocket } from './socket'
import { criarBus } from './bus'
import { criarDb } from './db'
import { criarEventLog } from './eventLog'
import { DADOS, HELENA, MARINA } from '@/tests/fixtures/dados'
import type { Evento, Usuario } from '@/shared/types'

const T = '2026-11-03T13:05:00.000Z'

async function montar(sessao: () => Usuario | null) {
  const bus = criarBus({ Canal: undefined })
  const db = await criarDb({ bus, log: criarEventLog(localStorage), carregar: async () => DADOS })
  const socket = criarSocket({ bus, db, usuarioSessao: sessao })
  const recebidos: Evento[] = []
  socket.assinar((e) => recebidos.push(e))
  return { bus, db, recebidos }
}

describe('socket', () => {
  it('cliente não recebe mensagem interna nem chamado de outro cliente', async () => {
    const { bus, recebidos } = await montar(() => HELENA)
    const meu = DADOS.chamados.find((c) => c.solicitante_id === HELENA.id)!
    const outro = DADOS.chamados.find((c) => c.solicitante_id !== HELENA.id)!
    bus.publicar({ id: '1', tipo: 'mensagem.adicionada', ocorrido_em: T, payload: { id: 'm1', chamado_id: meu.id, criada_em: T, autor_id: 'x', texto: 'nota', interna: true } })
    bus.publicar({ id: '2', tipo: 'mensagem.adicionada', ocorrido_em: T, payload: { id: 'm2', chamado_id: meu.id, criada_em: T, autor_id: 'x', texto: 'oi', interna: false } })
    bus.publicar({ id: '3', tipo: 'status.alterado', ocorrido_em: T, payload: { chamado_id: outro.id, de: 'aberto', para: 'em_atendimento', motivo: 'm', usuario_id: 'u' } })
    bus.publicar({ id: '4', tipo: 'chamado.aberto', ocorrido_em: T, payload: { ...outro, id: 'novo-de-outro' } })
    expect(recebidos.map((e) => e.id)).toEqual(['2'])
  })
  it('consultor não recebe chamado de outro grupo; recebe do seu', async () => {
    const { bus, recebidos } = await montar(() => MARINA)
    const grupo = MARINA.perfil === 'consultor' ? MARINA.grupo_id : ''
    const doGrupo = DADOS.chamados.find((c) => c.grupo_id === grupo)!
    const deOutro = DADOS.chamados.find((c) => c.grupo_id !== grupo)!
    bus.publicar({ id: 'a', tipo: 'chamado.atribuido', ocorrido_em: T, payload: { chamado_id: doGrupo.id, consultor_id: MARINA.id } })
    bus.publicar({ id: 'b', tipo: 'chamado.atribuido', ocorrido_em: T, payload: { chamado_id: deOutro.id, consultor_id: 'x' } })
    expect(recebidos.map((e) => e.id)).toEqual(['a'])
  })
  it('consultora recebe a atribuição que tira dela o #10608 (outro grupo)', async () => {
    const { bus, recebidos } = await montar(() => MARINA)
    const c10608 = DADOS.chamados.find((c) => c.numero === 10608)!
    expect(c10608.responsavel_id).toBe(MARINA.id)
    const deAplicacoes = DADOS.usuarios.find((u) => u.perfil === 'consultor' && u.grupo_id === c10608.grupo_id)!
    bus.publicar({ id: 'r', tipo: 'chamado.atribuido', ocorrido_em: T, payload: { chamado_id: c10608.id, consultor_id: deAplicacoes.id } })
    bus.publicar({ id: 's', tipo: 'status.alterado', ocorrido_em: T, payload: { chamado_id: c10608.id, de: 'em_atendimento', para: 'aguardando_cliente', motivo: 'm', usuario_id: deAplicacoes.id } })
    expect(recebidos.map((e) => e.id)).toEqual(['r'])
  })
  it('sem sessão, descarta tudo', async () => {
    const { bus, recebidos } = await montar(() => null)
    bus.publicar({ id: 'a', tipo: 'chamado.atribuido', ocorrido_em: T, payload: { chamado_id: DADOS.chamados[0]!.id, consultor_id: 'x' } })
    expect(recebidos).toEqual([])
  })
})
