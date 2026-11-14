import { escolherAcao, criarSimulador } from './simulator'
import { criarDb } from './db'
import { criarBus } from './bus'
import { criarEventLog } from './eventLog'
import { DADOS } from '@/tests/fixtures/dados'

describe('escolherAcao', () => {
  it('gera uma requisição válida com ator e corpo', async () => {
    const db = await criarDb({ bus: criarBus({ Canal: undefined }), log: criarEventLog(localStorage), carregar: async () => DADOS })
    for (let i = 0; i < 50; i++) {
      const a = escolherAcao(db.estado(), db.lookups(), () => 0.5)
      expect(a).not.toBeNull()
      expect(a!.url).toMatch(/^\/api\/chamados/)
      expect(a!.ator).toBeTruthy()
    }
  })
})

describe('criarSimulador', () => {
  beforeEach(() => vi.useFakeTimers())
  afterEach(() => vi.useRealTimers())
  it('dispara fetch no intervalo e para ao pausar', async () => {
    const db = await criarDb({ bus: criarBus({ Canal: undefined }), log: criarEventLog(localStorage), carregar: async () => DADOS })
    const fetchFn = vi.fn(async () => new Response('{}', { status: 200 }))
    const sim = criarSimulador({ db, fetchFn, intervaloBaseMs: 1000, velocidade: () => 1, obterLock: async (fn) => fn() })
    sim.ligar()
    await vi.advanceTimersByTimeAsync(2500)
    expect(fetchFn).toHaveBeenCalledTimes(2)
    sim.desligar()
    await vi.advanceTimersByTimeAsync(2000)
    expect(fetchFn).toHaveBeenCalledTimes(2)
  })
  it('dispararAgora chama uma vez mesmo desligado', async () => {
    const db = await criarDb({ bus: criarBus({ Canal: undefined }), log: criarEventLog(localStorage), carregar: async () => DADOS })
    const fetchFn = vi.fn(async () => new Response('{}', { status: 200 }))
    const sim = criarSimulador({ db, fetchFn, intervaloBaseMs: 1000, velocidade: () => 1, obterLock: async (fn) => fn() })
    await sim.dispararAgora()
    expect(fetchFn).toHaveBeenCalledTimes(1)
  })
})
