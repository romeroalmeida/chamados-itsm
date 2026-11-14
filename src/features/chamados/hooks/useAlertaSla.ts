import { useEffect, useMemo, useRef } from 'react'
import type { Chamado } from '@/shared/types'
import { faixaMudou, faixaSla, type Faixa, type ResumoAlerta } from '@/shared/utils/sla'

/** Spec §5.1: roda uma vez por tick sobre a lista, alerta só em piora para faixa de alerta, uma vez por chamado por faixa. */
export function useAlertaSla(chamados: Chamado[], agora: number, alertar: (c: Chamado, faixa: Faixa) => void): ResumoAlerta {
  const anteriores = useRef<Map<string, Faixa> | null>(null)
  const faixas = useMemo(() => new Map(chamados.map((c) => [c.id, faixaSla(c, agora)] as const)), [chamados, agora])

  useEffect(() => {
    if (anteriores.current) {
      for (const c of chamados) {
        const atual = faixas.get(c.id)!
        if (faixaMudou(anteriores.current.get(c.id), atual)) alertar(c, atual)
      }
    }
    anteriores.current = faixas
  }, [faixas, chamados, alertar])

  return useMemo(() => {
    let vencidos = 0, proximaHora = 0
    for (const f of faixas.values()) { if (f === 'vencido') vencidos++; else if (f === 'ultima_hora') proximaHora++ }
    return { vencidos, proximaHora }
  }, [faixas])
}
