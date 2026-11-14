import { filtrarFila, type FiltroFila } from './fila'
import { AGORA_MS, DADOS, MARINA } from '@/tests/fixtures/dados'

const base: FiltroFila = { aba: 'meus', status: 'ativos', busca: '', ordem: 'estoura' }
const grupo = MARINA.perfil === 'consultor' ? MARINA.grupo_id : ''

describe('filtrarFila', () => {
  it('"meus" traz os 42 ativos da Marina, vencidos primeiro', () => {
    const r = filtrarFila(DADOS.chamados, MARINA, base, AGORA_MS)
    expect(r).toHaveLength(42)
    expect(r.every((c) => c.responsavel_id === MARINA.id)).toBe(true)
    const primeiro = r[0]!
    expect(Date.parse(primeiro.prazo_resolucao) < AGORA_MS || Date.parse(primeiro.prazo_primeira_resposta) < AGORA_MS).toBe(true)
  })
  it('"sem dono" traz só abertos do grupo dela', () => {
    const r = filtrarFila(DADOS.chamados, MARINA, { ...base, aba: 'sem_dono' }, AGORA_MS)
    expect(r.length).toBeGreaterThan(0)
    expect(r.every((c) => c.status === 'aberto' && c.grupo_id === grupo)).toBe(true)
  })
  it('status "todos" inclui encerrados; busca por número', () => {
    // no arquivo a Marina não tem nenhum encerrado; injeta um
    const fechado = { ...DADOS.chamados.find((c) => c.responsavel_id === MARINA.id)!, id: 'fechado-x', numero: 1, status: 'fechado' as const }
    const comFechado = [...DADOS.chamados, fechado]
    expect(filtrarFila(comFechado, MARINA, base, AGORA_MS)).toHaveLength(42)
    const todos = filtrarFila(comFechado, MARINA, { ...base, status: 'todos' }, AGORA_MS)
    expect(todos).toHaveLength(43)
    expect(todos.at(-1)!.id).toBe('fechado-x') // encerrado vai para o fim
    expect(filtrarFila(comFechado, MARINA, { ...base, status: 'todos', busca: '1' }, AGORA_MS).some((c) => c.id === 'fechado-x')).toBe(true)
  })
})
