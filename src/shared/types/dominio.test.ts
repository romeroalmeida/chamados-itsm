import { DADOS, MARINA, HELENA, RICARDO } from '@/tests/fixtures/dados'
import { gruposDo } from './dominio'

describe('tipos do domínio x dados.json', () => {
  it('reconhece os três perfis como união discriminada', () => {
    expect(MARINA.perfil).toBe('consultor')
    expect(gruposDo(MARINA)).toHaveLength(1)
    expect(gruposDo(RICARDO)).toHaveLength(2)
    expect(gruposDo(HELENA)).toEqual([])
    if (HELENA.perfil === 'cliente') expect(HELENA.empresa).toBe('Lusitânia Seguros')
  })
  it('tem os volumes esperados', () => {
    expect(DADOS.chamados).toHaveLength(620)
    expect(DADOS.mensagens).toHaveLength(3381)
    expect(DADOS.historico).toHaveLength(1558)
  })
})
