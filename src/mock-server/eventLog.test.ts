import { criarEventLog, PREFIXO_EVENTO } from './eventLog'
import type { Evento } from '@/shared/types'

const ev = (id: string, t: string): Evento => ({ id, tipo: 'chamado.atribuido', ocorrido_em: t, payload: { chamado_id: 'c', consultor_id: 'u' } })

describe('eventLog', () => {
  it('grava uma chave por evento e lê em ordem de ocorrido_em', () => {
    const log = criarEventLog(localStorage)
    log.gravar(ev('b', '2026-11-03T13:02:00.000Z'))
    log.gravar(ev('a', '2026-11-03T13:01:00.000Z'))
    expect(localStorage.length).toBe(2)
    expect(log.ler().eventos.map((e) => e.id)).toEqual(['a', 'b'])
  })
  it('ignora chave inválida e conta', () => {
    const log = criarEventLog(localStorage)
    localStorage.setItem(PREFIXO_EVENTO + '2026-x:1', '{nao é json')
    localStorage.setItem(PREFIXO_EVENTO + '2026-y:2', JSON.stringify({ id: '2', tipo: 'inexistente' }))
    log.gravar(ev('ok', '2026-11-03T13:00:00.000Z'))
    const r = log.ler()
    expect(r.eventos.map((e) => e.id)).toEqual(['ok'])
    expect(r.ignorados).toBe(2)
    expect(localStorage.length).toBe(1) // inválidas removidas
  })
  it('limparTudo remove só chaves itsm:*', () => {
    const log = criarEventLog(localStorage)
    log.gravar(ev('a', '2026-11-03T13:00:00.000Z'))
    localStorage.setItem('itsm:relogio', '{}')
    localStorage.setItem('outra', '1')
    log.limparTudo()
    expect(localStorage.length).toBe(1)
    expect(localStorage.getItem('outra')).toBe('1')
  })
})
