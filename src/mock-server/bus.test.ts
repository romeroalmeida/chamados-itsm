import { criarBus } from './bus'
import type { Evento } from '@/shared/types'

const ev = (id: string): Evento => ({ id, tipo: 'chamado.atribuido', ocorrido_em: '2026-11-03T13:00:00.000Z', payload: { chamado_id: 'c', consultor_id: 'u' } })

/** Canal fake: entrega às outras instâncias do mesmo nome, nunca a si mesma (como o real). */
function canalFake() {
  const instancias = new Set<{ onmessage: ((ev: MessageEvent) => void) | null }>()
  return function Canal(this: any) {
    const eu = { onmessage: null as ((ev: MessageEvent) => void) | null }
    instancias.add(eu)
    return {
      postMessage(data: unknown) { for (const i of instancias) if (i !== eu && i.onmessage) i.onmessage({ data } as MessageEvent) },
      set onmessage(cb: ((ev: MessageEvent) => void) | null) { eu.onmessage = cb },
      close() { instancias.delete(eu) },
    }
  } as unknown as typeof BroadcastChannel
}

describe('bus', () => {
  it('entrega aos assinantes locais na ordem de assinatura, de forma síncrona', () => {
    const bus = criarBus({ Canal: canalFake() })
    const ordem: string[] = []
    bus.assinar(() => ordem.push('a'))
    bus.assinar(() => ordem.push('b'))
    bus.publicar(ev('1'))
    expect(ordem).toEqual(['a', 'b'])
  })
  it('entrega às outras abas pelo canal', () => {
    const Canal = canalFake()
    const abaA = criarBus({ Canal })
    const abaB = criarBus({ Canal })
    const recebidos: string[] = []
    abaB.assinar((e) => recebidos.push(e.id))
    abaA.publicar(ev('1'))
    expect(recebidos).toEqual(['1'])
  })
  it('unsubscribe funciona', () => {
    const bus = criarBus({ Canal: canalFake() })
    const cb = vi.fn()
    const sair = bus.assinar(cb)
    sair()
    bus.publicar(ev('1'))
    expect(cb).not.toHaveBeenCalled()
  })
  it('duplica de propósito quando deveDuplicar diz sim', () => {
    const bus = criarBus({ Canal: canalFake(), deveDuplicar: () => true })
    const cb = vi.fn()
    bus.assinar(cb)
    bus.publicar(ev('1'))
    expect(cb).toHaveBeenCalledTimes(2)
  })
  it('sem canal, usa o evento storage como fallback', () => {
    const bus = criarBus({ Canal: undefined, storage: localStorage })
    const cb = vi.fn()
    bus.assinar(cb)
    const e = ev('9')
    window.dispatchEvent(new StorageEvent('storage', { key: 'itsm:evt:2026-11-03T13:00:00.000Z:9', newValue: JSON.stringify(e), storageArea: localStorage }))
    expect(cb).toHaveBeenCalledWith(e)
  })
})
