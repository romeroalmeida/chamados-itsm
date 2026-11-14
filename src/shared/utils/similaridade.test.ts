import { normalizarTitulo, sugerirParecido } from './similaridade'
import { AGORA_MS, DADOS, HELENA, chamadoPorNumero } from '@/tests/fixtures/dados'

const daHelena = DADOS.chamados.filter((c) => c.solicitante_id === HELENA.id)

describe('normalizarTitulo', () => {
  it('minúsculas, sem acento, sem stopwords', () => {
    expect(normalizarTitulo('Solicitação de acesso para o novo colaborador')).toEqual(['solicitacao', 'acesso', 'novo', 'colaborador'])
  })
})

describe('sugerirParecido', () => {
  it('acha #10612 (fechado) ao digitar o título de #10614', () => {
    const alvo = chamadoPorNumero(10614)
    const s = sugerirParecido(alvo.titulo, daHelena.filter((c) => c.id !== alvo.id), AGORA_MS)
    expect(s?.numero).toBe(10612)
  })
  it('não sugere sem palavra em comum', () => {
    expect(sugerirParecido('xyzzy plugh', daHelena, AGORA_MS)).toBeNull()
  })
  it('só considera resolvido/fechado dos últimos 90 dias', () => {
    const alvo = chamadoPorNumero(10614)
    const daqui200dias = AGORA_MS + 200 * 24 * 3_600_000
    expect(sugerirParecido(alvo.titulo, daHelena, daqui200dias)).toBeNull()
  })
  it('título curto demais (1 palavra útil) não sugere, a menos que seja idêntico', () => {
    const fechado = daHelena.find((c) => c.status === 'fechado')!
    expect(sugerirParecido(fechado.titulo, daHelena, AGORA_MS)?.id).toBe(fechado.id)
  })
})
