import { historicoParaPerfil, mensagemVisivel, visivelPara } from './visibilidade'
import { DADOS, HELENA, MARINA, RICARDO } from '@/tests/fixtures/dados'
import type { Historico, Mensagem } from '@/shared/types'

describe('visivelPara', () => {
  it('cliente vê só os próprios', () => {
    const meu = DADOS.chamados.find((c) => c.solicitante_id === HELENA.id)!
    const outro = DADOS.chamados.find((c) => c.solicitante_id !== HELENA.id)!
    expect(visivelPara(HELENA, meu)).toBe(true)
    expect(visivelPara(HELENA, outro)).toBe(false)
  })
  it('consultor vê o próprio grupo', () => {
    const grupo = MARINA.perfil === 'consultor' ? MARINA.grupo_id : ''
    const doGrupo = DADOS.chamados.find((c) => c.grupo_id === grupo)!
    const deOutro = DADOS.chamados.find((c) => c.grupo_id !== grupo && c.responsavel_id !== MARINA.id)!
    expect(visivelPara(MARINA, doGrupo)).toBe(true)
    expect(visivelPara(MARINA, deOutro)).toBe(false)
  })
  it('consultor vê o chamado de que é responsável mesmo fora do grupo (#10608 no dados.json)', () => {
    const c10608 = DADOS.chamados.find((c) => c.numero === 10608)!
    const grupo = MARINA.perfil === 'consultor' ? MARINA.grupo_id : ''
    expect(c10608.grupo_id).not.toBe(grupo)
    expect(c10608.responsavel_id).toBe(MARINA.id)
    expect(visivelPara(MARINA, c10608)).toBe(true)
  })
  it('gestor vê os grupos que gere (os dois)', () => {
    expect(DADOS.chamados.every((c) => visivelPara(RICARDO, c))).toBe(true)
  })
})

describe('mensagemVisivel', () => {
  const interna: Mensagem = { id: 'm', chamado_id: 'c', criada_em: '', autor_id: 'a', texto: 't', interna: true }
  it('cliente não vê nota interna; equipe vê', () => {
    expect(mensagemVisivel(HELENA, interna)).toBe(false)
    expect(mensagemVisivel(MARINA, interna)).toBe(true)
    expect(mensagemVisivel(HELENA, { ...interna, interna: null })).toBe(true)
  })
})

describe('historicoParaPerfil', () => {
  const lista: Historico[] = [
    { id: '1', chamado_id: 'c', tipo: 'atribuicao', de: null, para: null, usuario_id: 'u', motivo: null, ocorrido_em: '' },
    { id: '2', chamado_id: 'c', tipo: 'status', de: 'aberto', para: 'em_atendimento', usuario_id: 'u', motivo: 'segredo', ocorrido_em: '' },
  ]
  it('cliente recebe só status, sem motivo', () => {
    expect(historicoParaPerfil(HELENA, lista)).toEqual([{ ...lista[1], motivo: null }])
  })
  it('equipe recebe tudo', () => {
    expect(historicoParaPerfil(MARINA, lista)).toEqual(lista)
  })
})
