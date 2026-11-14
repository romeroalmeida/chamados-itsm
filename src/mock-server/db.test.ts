import { criarDb } from './db'
import { criarBus } from './bus'
import { criarEventLog } from './eventLog'
import { DADOS, MARINA } from '@/tests/fixtures/dados'
import type { Evento } from '@/shared/types'

const T = '2026-11-03T13:05:00.000Z'
const carregar = async () => DADOS

describe('db', () => {
  it('carrega o dados.json e reaplica o log gravado', async () => {
    const log = criarEventLog(localStorage)
    const semDono = DADOS.chamados.find((c) => c.status === 'aberto')!
    log.gravar({ id: 'antigo', tipo: 'chamado.atribuido', ocorrido_em: T, payload: { chamado_id: semDono.id, consultor_id: MARINA.id } })
    const db = await criarDb({ bus: criarBus({ Canal: undefined }), log, carregar })
    expect(db.estado().chamados[semDono.id]!.responsavel_id).toBe(MARINA.id)
    expect(db.lookups().categorias).toHaveLength(8)
  })

  it('emitir grava no log e aplica via bus (um caminho só)', async () => {
    const log = criarEventLog(localStorage)
    const bus = criarBus({ Canal: undefined })
    const db = await criarDb({ bus, log, carregar })
    const c = DADOS.chamados.find((c) => c.status === 'aberto')!
    const e: Evento = { id: 'novo', tipo: 'chamado.atribuido', ocorrido_em: T, payload: { chamado_id: c.id, consultor_id: MARINA.id } }
    db.emitir([e])
    expect(db.estado().chamados[c.id]!.responsavel_id).toBe(MARINA.id)
    expect(log.ler().eventos.map((x) => x.id)).toEqual(['novo'])
  })

  it('evento vindo de outra aba pelo bus é aplicado sem ir ao log desta aba', async () => {
    const log = criarEventLog(localStorage)
    const bus = criarBus({ Canal: undefined })
    const db = await criarDb({ bus, log, carregar })
    const c = DADOS.chamados.find((c) => c.status === 'aberto')!
    bus.publicar({ id: 'remoto', tipo: 'chamado.atribuido', ocorrido_em: T, payload: { chamado_id: c.id, consultor_id: MARINA.id } })
    expect(db.estado().chamados[c.id]!.responsavel_id).toBe(MARINA.id)
    expect(log.ler().eventos).toHaveLength(0)
  })

  it('proximoNumero é maior + 1', async () => {
    const db = await criarDb({ bus: criarBus({ Canal: undefined }), log: criarEventLog(localStorage), carregar })
    expect(db.proximoNumero()).toBe(Math.max(...DADOS.chamados.map((c) => c.numero)) + 1)
  })
})
