import { renderHook } from '@testing-library/react'
import { useAlertaSla } from './useAlertaSla'
import { AGORA_MS } from '@/tests/fixtures/dados'
import type { Chamado } from '@/shared/types'

const H = 3_600_000
const iso = (ms: number) => new Date(ms).toISOString()
const chamado = (id: string, prazo: number): Chamado => ({
  id, numero: 1, titulo: 'VPN', descricao: '', categoria_id: '', grupo_id: 'g', prioridade: 'media', status: 'em_atendimento', solicitante_id: 's', responsavel_id: 'r',
  aberto_em: iso(AGORA_MS - H), atualizado_em: iso(AGORA_MS), primeira_resposta_em: iso(AGORA_MS), prazo_primeira_resposta: iso(AGORA_MS), prazo_resolucao: iso(prazo),
  sla_pausado: false, resolvido_em: null, fechado_em: null,
})

describe('useAlertaSla', () => {
  it('conta vencidos e próxima hora; alerta uma vez ao cruzar faixa', () => {
    const alertar = vi.fn()
    const lista = [chamado('a', AGORA_MS + 90 * 60_000), chamado('b', AGORA_MS - H)]
    const { result, rerender } = renderHook(({ agora }) => useAlertaSla(lista, agora, alertar), { initialProps: { agora: AGORA_MS } })
    expect(result.current).toEqual({ vencidos: 1, proximaHora: 0 })
    expect(alertar).not.toHaveBeenCalled() // primeira avaliação não alerta
    rerender({ agora: AGORA_MS + 40 * 60_000 }) // 'a' entra em ultima_hora
    expect(result.current).toEqual({ vencidos: 1, proximaHora: 1 })
    expect(alertar).toHaveBeenCalledTimes(1)
    expect(alertar).toHaveBeenCalledWith(lista[0], 'ultima_hora')
    rerender({ agora: AGORA_MS + 45 * 60_000 })
    expect(alertar).toHaveBeenCalledTimes(1) // não repete
    rerender({ agora: AGORA_MS + 2 * H })
    expect(alertar).toHaveBeenCalledTimes(2) // 'a' venceu
    expect(result.current.vencidos).toBe(2)
  })
})
