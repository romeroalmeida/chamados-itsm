import { motivoAutomatico, transicaoValida, transicoesPermitidas, ROTULO_STATUS_CLIENTE } from './status'

describe('transições por perfil', () => {
  it('consultor em atendimento: aguardando cliente ou resolvido', () => {
    expect(transicoesPermitidas('em_atendimento', 'consultor').sort()).toEqual(['aguardando_cliente', 'resolvido'])
  })
  it('gestor tem as mesmas do consultor', () => {
    expect(transicoesPermitidas('resolvido', 'gestor').sort()).toEqual(['em_atendimento', 'fechado'])
  })
  it('cliente só confirma ou reabre', () => {
    expect(transicoesPermitidas('resolvido', 'cliente').sort()).toEqual(['em_atendimento', 'fechado'])
    expect(transicoesPermitidas('fechado', 'cliente')).toEqual(['em_atendimento'])
    expect(transicoesPermitidas('em_atendimento', 'cliente')).toEqual([])
  })
  it('aberto -> em_atendimento só via atribuir, nunca por POST /status', () => {
    expect(transicoesPermitidas('aberto', 'consultor')).toEqual([])
    expect(transicaoValida('aberto', 'em_atendimento', 'consultor')).toBe(false)
  })
  it('fechado pode ser reaberto por qualquer perfil', () => {
    for (const p of ['cliente', 'consultor', 'gestor'] as const) expect(transicaoValida('fechado', 'em_atendimento', p)).toBe(true)
  })
})

describe('motivoAutomatico', () => {
  it('cliente confirmando resolução não precisa digitar motivo', () => {
    expect(motivoAutomatico('resolvido', 'fechado', 'cliente')).toBe('Confirmado pelo cliente')
  })
  it('consultor fechando precisa digitar', () => {
    expect(motivoAutomatico('resolvido', 'fechado', 'consultor')).toBeNull()
  })
  it('reabertura sempre exige motivo', () => {
    expect(motivoAutomatico('fechado', 'em_atendimento', 'cliente')).toBeNull()
  })
})

it('rótulos de cliente cobrem todos os status', () => {
  expect(Object.keys(ROTULO_STATUS_CLIENTE)).toHaveLength(5)
})
