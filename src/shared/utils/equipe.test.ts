import { agregadosPorConsultor, LIMITE_SOBRECARGA, ociosoNaJanela, sugerirDestino, type AgregadoConsultor } from './equipe'
import { AGORA_MS, DADOS, MARINA, RICARDO } from '@/tests/fixtures/dados'
import type { Chamado, Historico, UsuarioConsultor } from '@/shared/types'

const H = 3_600_000, DIA = 24 * H
const iso = (ms: number) => new Date(ms).toISOString()
const consultor: UsuarioConsultor = { id: 'k', nome: 'K', email: 'k@x', locale: 'pt-BR', zoneinfo: 'America/Sao_Paulo', perfil: 'consultor', grupo_id: 'g' }

describe('ociosoNaJanela', () => {
  it('sem nenhum chamado a semana toda = 7 dias', () => {
    expect(ociosoNaJanela(consultor.id, [], [], AGORA_MS)).toBe(7 * DIA)
  })
  it('com um chamado ativo o tempo todo = 0', () => {
    const c = { id: 'c', responsavel_id: 'k', status: 'em_atendimento' } as Chamado
    // como no dado real, toda atribuição vem com o aberto -> em_atendimento correspondente
    const h: Historico[] = [
      { id: 'h', chamado_id: 'c', tipo: 'atribuicao', de: null, para: null, usuario_id: 'k', motivo: null, ocorrido_em: iso(AGORA_MS - 30 * DIA) },
      { id: 'h2', chamado_id: 'c', tipo: 'status', de: 'aberto', para: 'em_atendimento', usuario_id: 'k', motivo: 'm', ocorrido_em: iso(AGORA_MS - 30 * DIA) },
    ]
    expect(ociosoNaJanela('k', h, [c], AGORA_MS)).toBe(0)
  })
  it('chamado atribuído há 2 dias e resolvido há 1 dia: ocioso = 5 d + 1 d', () => {
    const c = { id: 'c', responsavel_id: 'k', status: 'resolvido' } as Chamado
    const h: Historico[] = [
      { id: '1', chamado_id: 'c', tipo: 'atribuicao', de: null, para: null, usuario_id: 'k', motivo: null, ocorrido_em: iso(AGORA_MS - 2 * DIA) },
      { id: '2', chamado_id: 'c', tipo: 'status', de: 'aberto', para: 'em_atendimento', usuario_id: 'k', motivo: 'm', ocorrido_em: iso(AGORA_MS - 2 * DIA) },
      { id: '3', chamado_id: 'c', tipo: 'status', de: 'em_atendimento', para: 'resolvido', usuario_id: 'k', motivo: 'm', ocorrido_em: iso(AGORA_MS - 1 * DIA) },
    ]
    expect(ociosoNaJanela('k', h, [c], AGORA_MS)).toBe(6 * DIA)
  })
})

describe('agregadosPorConsultor', () => {
  it('Marina tem 42 ativos no arquivo', () => {
    const consultores = DADOS.usuarios.filter((u): u is UsuarioConsultor => u.perfil === 'consultor')
    const ag = agregadosPorConsultor(consultores, DADOS.chamados, DADOS.historico, AGORA_MS)
    const marina = ag.find((a) => a.consultor.id === MARINA.id)!
    expect(marina.ativos).toBe(42)
    expect(marina.vencidos + marina.vencendo4h).toBeLessThanOrEqual(42)
    expect(ag[0]!.vencidos).toBeGreaterThanOrEqual(ag[1]!.vencidos)
    expect(RICARDO.perfil).toBe('gestor')
  })
})

describe('sugerirDestino', () => {
  const consultores = DADOS.usuarios.filter((u): u is UsuarioConsultor => u.perfil === 'consultor')
  const ag = () => agregadosPorConsultor(consultores, DADOS.chamados, DADOS.historico, AGORA_MS)
  it('Thiago Nascimento (sobrecarregado) recebe como sugestão Diego Araújo: mesmo grupo, menos ativos', () => {
    const todos = ag()
    const thiago = todos.find((a) => a.consultor.nome === 'Thiago Nascimento')!
    expect(thiago.vencidos).toBeGreaterThanOrEqual(LIMITE_SOBRECARGA)
    const s = sugerirDestino(thiago, todos)!
    expect(s.consultor.nome).toBe('Diego Araújo')
    expect(s.consultor.grupo_id).toBe(thiago.consultor.grupo_id)
  })
  it('empate em ativos desempata por mais ocioso; ninguém com menos ativos = sem sugestão', () => {
    const a = (id: string, ativos: number, ociosoMs: number, grupo = 'g'): AgregadoConsultor => ({ consultor: { ...consultor, id, grupo_id: grupo }, ativos, vencidos: 0, vencendo4h: 0, pausados: 0, ociosoMs })
    const origem = a('o', 30, 0)
    expect(sugerirDestino(origem, [origem, a('x', 5, H), a('y', 5, 3 * H), a('z', 1, 0, 'outro')])!.consultor.id).toBe('y')
    expect(sugerirDestino(origem, [origem, a('w', 30, DIA)])).toBeNull()
  })
})
