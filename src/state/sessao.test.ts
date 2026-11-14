import { useSessao, CHAVE_SESSAO } from './sessao'
import { MARINA } from '@/tests/fixtures/dados'

describe('sessão', () => {
  it('entrar grava em sessionStorage; sair limpa', () => {
    useSessao.getState().entrar(MARINA)
    expect(useSessao.getState().usuario?.id).toBe(MARINA.id)
    expect(sessionStorage.getItem(CHAVE_SESSAO)).toContain(MARINA.id)
    useSessao.getState().sair()
    expect(useSessao.getState().usuario).toBeNull()
    expect(sessionStorage.getItem(CHAVE_SESSAO)).toBeNull()
  })
  it('não toca em localStorage', () => {
    useSessao.getState().entrar(MARINA)
    expect(localStorage.length).toBe(0)
  })
})
