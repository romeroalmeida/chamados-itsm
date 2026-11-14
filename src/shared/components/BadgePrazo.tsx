import type { Chamado } from '@/shared/types'
import { Badge } from './Badge/Badge'
import { faixaSla, prazoRelevante, restanteMs, TIPO_PRAZO } from '@/shared/utils/sla'
import { formatarRelativo } from '@/shared/utils/datas'

export function BadgePrazo({ chamado, agora }: { chamado: Chamado; agora: number }) {
  const faixa = faixaSla(chamado, agora)
  if (faixa === 'encerrado') return <Badge faixa="encerrado">encerrado</Badge>
  if (faixa === 'pausado') return <Badge faixa="pausado" title="SLA pausado enquanto aguarda o cliente">pausado</Badge>
  const { tipo } = prazoRelevante(chamado)
  return <Badge faixa={faixa} title={`Prazo de ${TIPO_PRAZO[tipo]}`}>{formatarRelativo(restanteMs(chamado, agora))}</Badge>
}
