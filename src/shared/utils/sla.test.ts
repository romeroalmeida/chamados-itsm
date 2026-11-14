import { calcularPrazos, faixaMudou, faixaSla, ordenarEstouraPrimeiro, prazoRelevante, restanteMs } from './sla'
import { AGORA_MS, DADOS } from '@/tests/fixtures/dados'
import type { Chamado } from '@/shared/types'

const H = 3_600_000
const iso = (ms: number) => new Date(ms).toISOString()

function chamado(sobrescrever: Partial<Chamado>): Chamado {
  return {
    id: 'c1', numero: 1, titulo: 't', descricao: 'd', categoria_id: 'cat', grupo_id: 'g', prioridade: 'media',
    status: 'em_atendimento', solicitante_id: 's', responsavel_id: 'r',
    aberto_em: iso(AGORA_MS - 2 * H), atualizado_em: iso(AGORA_MS - H),
    primeira_resposta_em: iso(AGORA_MS - H), prazo_primeira_resposta: iso(AGORA_MS + 6 * H), prazo_resolucao: iso(AGORA_MS + 22 * H),
    sla_pausado: false, resolvido_em: null, fechado_em: null, ...sobrescrever,
  }
}

describe('prazoRelevante', () => {
  it('é primeira resposta enquanto não houve resposta', () => {
    const c = chamado({ primeira_resposta_em: null })
    expect(prazoRelevante(c)).toEqual({ tipo: 'primeira_resposta', prazo: c.prazo_primeira_resposta })
  })
  it('é resolução depois da primeira resposta', () => {
    const c = chamado({})
    expect(prazoRelevante(c)).toEqual({ tipo: 'resolucao', prazo: c.prazo_resolucao })
  })
})

describe('faixaSla', () => {
  it('encerrado para resolvido/fechado, mesmo com prazo vencido', () => {
    expect(faixaSla(chamado({ status: 'resolvido', prazo_resolucao: iso(AGORA_MS - H) }), AGORA_MS)).toBe('encerrado')
    expect(faixaSla(chamado({ status: 'fechado' }), AGORA_MS)).toBe('encerrado')
  })
  it('pausado quando sla_pausado', () => {
    expect(faixaSla(chamado({ status: 'aguardando_cliente', sla_pausado: true, prazo_resolucao: iso(AGORA_MS - H) }), AGORA_MS)).toBe('pausado')
  })
  it('faixas por tempo restante', () => {
    expect(faixaSla(chamado({ prazo_resolucao: iso(AGORA_MS - 1) }), AGORA_MS)).toBe('vencido')
    expect(faixaSla(chamado({ prazo_resolucao: iso(AGORA_MS + 30 * 60_000) }), AGORA_MS)).toBe('ultima_hora')
    expect(faixaSla(chamado({ prazo_resolucao: iso(AGORA_MS + 3 * H) }), AGORA_MS)).toBe('critico')
    expect(faixaSla(chamado({ prazo_resolucao: iso(AGORA_MS + 10 * H) }), AGORA_MS)).toBe('atencao')
    expect(faixaSla(chamado({ prazo_resolucao: iso(AGORA_MS + 48 * H) }), AGORA_MS)).toBe('ok')
  })
  it('restanteMs é negativo quando venceu', () => {
    expect(restanteMs(chamado({ prazo_resolucao: iso(AGORA_MS - H) }), AGORA_MS)).toBe(-H)
  })
  it('bate com o arquivo: 76 pausados e mais de 100 vencidos pelo prazo relevante em meta.agora', () => {
    const ativos = DADOS.chamados.filter((c) => c.status !== 'resolvido' && c.status !== 'fechado')
    const vencidos = ativos.filter((c) => faixaSla(c, AGORA_MS) === 'vencido')
    const pausados = ativos.filter((c) => faixaSla(c, AGORA_MS) === 'pausado')
    expect(pausados).toHaveLength(76)
    expect(vencidos.length).toBeGreaterThan(100)
  })
})

describe('faixaMudou', () => {
  it('alerta só quando piora para crítico, última hora ou vencido', () => {
    expect(faixaMudou('ok', 'atencao')).toBe(false)
    expect(faixaMudou('atencao', 'critico')).toBe(true)
    expect(faixaMudou('critico', 'ultima_hora')).toBe(true)
    expect(faixaMudou('ultima_hora', 'vencido')).toBe(true)
    expect(faixaMudou('vencido', 'critico')).toBe(false)
    expect(faixaMudou('critico', 'critico')).toBe(false)
    expect(faixaMudou(undefined, 'vencido')).toBe(false)
  })
})

describe('calcularPrazos', () => {
  it('soma as horas da tabela de SLA', () => {
    const p = calcularPrazos(iso(AGORA_MS), 'critica', DADOS.sla)
    expect(p.prazo_primeira_resposta).toBe(iso(AGORA_MS + H))
    expect(p.prazo_resolucao).toBe(iso(AGORA_MS + 4 * H))
  })
})

describe('ordenarEstouraPrimeiro', () => {
  it('vencido, depois por restante, pausado, encerrado', () => {
    const lista = [
      chamado({ id: 'ok', prazo_resolucao: iso(AGORA_MS + 48 * H) }),
      chamado({ id: 'fechado', status: 'fechado', atualizado_em: iso(AGORA_MS - H) }),
      chamado({ id: 'pausado', status: 'aguardando_cliente', sla_pausado: true }),
      chamado({ id: 'critico', prazo_resolucao: iso(AGORA_MS + 2 * H) }),
      chamado({ id: 'vencido', prazo_resolucao: iso(AGORA_MS - H) }),
    ]
    expect(ordenarEstouraPrimeiro(lista, AGORA_MS).map((c) => c.id)).toEqual(['vencido', 'critico', 'ok', 'pausado', 'fechado'])
  })
})
