import { criarRelogio } from './relogio'

const AGORA = '2026-11-03T13:00:00Z'

describe('relógio virtual', () => {
  beforeEach(() => { vi.useFakeTimers(); vi.setSystemTime(new Date('2026-11-14T10:00:00Z')) })
  afterEach(() => vi.useRealTimers())

  it('nasce em meta.agora e anda com o tempo real', () => {
    const r = criarRelogio(localStorage)
    r.iniciar(AGORA)
    expect(r.agoraIso()).toBe('2026-11-03T13:00:00.000Z')
    vi.advanceTimersByTime(60_000)
    expect(r.agora()).toBe(Date.parse(AGORA) + 60_000)
  })

  it('não reinicia se já existe relógio gravado', () => {
    const r = criarRelogio(localStorage)
    r.iniciar(AGORA)
    vi.advanceTimersByTime(5_000)
    r.iniciar('2000-01-01T00:00:00Z')
    expect(r.agora()).toBe(Date.parse(AGORA) + 5_000)
  })

  it('velocidade acelera sem dar salto', () => {
    const r = criarRelogio(localStorage)
    r.iniciar(AGORA)
    vi.advanceTimersByTime(10_000)
    r.definirVelocidade(20)
    expect(r.agora()).toBe(Date.parse(AGORA) + 10_000)
    vi.advanceTimersByTime(60_000)
    expect(r.agora()).toBe(Date.parse(AGORA) + 10_000 + 20 * 60_000)
    expect(r.velocidade()).toBe(20)
  })

  it('lê do storage a cada chamada (outra aba pode ter reancorado)', () => {
    const a = criarRelogio(localStorage)
    const b = criarRelogio(localStorage)
    a.iniciar(AGORA)
    b.definirVelocidade(5)
    vi.advanceTimersByTime(1_000)
    expect(a.agora()).toBe(Date.parse(AGORA) + 5_000)
  })

  it('sem relógio gravado usa o tempo real', () => {
    const r = criarRelogio(localStorage)
    expect(r.agora()).toBe(Date.now())
  })

  it('resetar apaga o relógio', () => {
    const r = criarRelogio(localStorage)
    r.iniciar(AGORA)
    r.resetar()
    expect(localStorage.getItem('itsm:relogio')).toBeNull()
  })
})
