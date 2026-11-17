import { linhaDoTempoCliente, novidadesDesde, proximoPasso, type DetalheCliente } from './cliente'
import { AGORA_MS, DADOS, HELENA, chamadoPorNumero } from '@/tests/fixtures/dados'

const nomes = Object.fromEntries(DADOS.usuarios.map((u) => [u.id, u.nome]))
/** O que a cliente recebe em GET /chamados/:id: sem nota interna, só histórico de status. */
const detalhe = (numero: number): DetalheCliente => {
  const chamado = chamadoPorNumero(numero)
  return {
    chamado,
    mensagens: DADOS.mensagens.filter((m) => m.chamado_id === chamado.id && m.interna !== true).sort((a, b) => a.criada_em.localeCompare(b.criada_em)),
    historico: DADOS.historico.filter((h) => h.chamado_id === chamado.id && h.tipo === 'status').map((h) => ({ ...h, motivo: null })),
  }
}
const passo = (n: number) => proximoPasso(detalhe(n), HELENA.id, AGORA_MS, nomes, HELENA)

describe('proximoPasso (Helena)', () => {
  it('#10611: ela falou por último, agora é com a Marina', () => {
    expect(passo(10611)).toEqual({ tom: 'equipe', texto: expect.stringMatching(/^Você escreveu em .+\. Agora é com Marina\.$/) })
  })
  it('#10613: aguardando ela, mas já respondeu depois do pedido', () => {
    expect(passo(10613)).toEqual({ tom: 'voce', texto: expect.stringMatching(/^Juliana pediu mais informações em 01\/11\. A sua última mensagem: “.+”/) })
  })
  it('#10614: ninguém pegou e passou do prazo', () => {
    expect(passo(10614)).toEqual({ tom: 'atrasado', texto: expect.stringMatching(/^Ninguém pegou ainda e já passou do prazo de primeira resposta/) })
  })
  it('#10612 fechado não tem próximo passo; resolvido pede confirmação', () => {
    expect(passo(10612)).toBeNull()
    const d = detalhe(10611)
    expect(proximoPasso({ ...d, chamado: { ...d.chamado, status: 'resolvido' } }, HELENA.id, AGORA_MS, nomes, HELENA)!.tom).toBe('voce')
  })
  it('no prazo, aberto: aguardando alguém pegar, com o prazo', () => {
    const d = detalhe(10614)
    const r = proximoPasso({ ...d, chamado: { ...d.chamado, prazo_primeira_resposta: new Date(AGORA_MS + 3_600_000).toISOString() } }, HELENA.id, AGORA_MS, nomes, HELENA)
    expect(r).toEqual({ tom: 'equipe', texto: expect.stringMatching(/^Aguardando alguém da equipe pegar\. Prazo de primeira resposta até /) })
  })
})

describe('novidadesDesde', () => {
  it('desde 31/10: Juliana pegou e pediu informações no #10613; o #10614 passou do prazo', () => {
    const itens = [10611, 10612, 10613, 10614].map(detalhe)
    const r = novidadesDesde(itens, Date.parse('2026-10-31T00:00:00Z'), HELENA.id, AGORA_MS, nomes)
    const textos = r.map((n) => `#${n.chamado.numero} ${n.texto}`)
    expect(textos).toContain('#10613 Juliana Pereira pegou o seu chamado')
    expect(textos).toContain('#10613 Juliana Pereira pediu mais informações')
    expect(textos).toContain('#10614 Continua sem resposta e passou do prazo')
    expect(r.find((n) => n.chamado.numero === 10614)!.alerta).toBe(true)
    expect(r.map((n) => n.em)).toEqual([...r.map((n) => n.em)].sort()) // em ordem
  })
  it('o que ela mesma fez não é novidade; visita de agora não traz nada', () => {
    const itens = [10611, 10612, 10613, 10614].map(detalhe)
    expect(novidadesDesde(itens, AGORA_MS, HELENA.id, AGORA_MS, nomes)).toEqual([])
    expect(novidadesDesde(itens, 0, HELENA.id, AGORA_MS, nomes).some((n) => n.texto.startsWith('Helena'))).toBe(false)
  })
})

describe('linhaDoTempoCliente', () => {
  it('#10611 em frases: abriu, pegou, resolveu, fechou, reabriu', () => {
    const d = detalhe(10611)
    expect(linhaDoTempoCliente(d.chamado, d.historico, HELENA.id, nomes).map((a) => a.texto)).toEqual([
      'Você abriu o chamado',
      'Marina Almeida pegou o chamado',
      'Marina Almeida marcou como resolvido',
      'Marina Almeida fechou o chamado',
      'Marina Almeida reabriu o chamado',
    ])
  })
})
