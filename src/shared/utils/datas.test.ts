import { formatarDataHora, formatarDuracao, formatarRelativo } from './datas'
import { HELENA, MARINA } from '@/tests/fixtures/dados'

describe('datas', () => {
  it('formata no fuso do usuário', () => {
    const iso = '2026-11-03T13:00:00Z'
    expect(formatarDataHora(iso, HELENA)).toMatch(/13:00/)   // Lisboa, UTC+0 em novembro
    expect(formatarDataHora(iso, MARINA)).toMatch(/10:00/)   // São Paulo, UTC-3
  })
  it('duração em horas e minutos', () => {
    expect(formatarDuracao(98 * 60_000)).toBe('1h 38')
    expect(formatarDuracao(5 * 60_000)).toBe('5 min')
    expect(formatarDuracao(30 * 3_600_000)).toBe('1 d 6h')
    expect(formatarDuracao(24 * 3_600_000)).toBe('1 d')
    expect(formatarDuracao(3 * 3_600_000)).toBe('3h')
  })
  it('relativo: estoura em / estourou há', () => {
    expect(formatarRelativo(40 * 60_000)).toBe('estoura em 40 min')
    expect(formatarRelativo(-3 * 3_600_000)).toBe('estourou há 3h')
  })
})
