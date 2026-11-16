import type { Historico, Usuario } from '@/shared/types'
import { formatarDataHora } from '@/shared/utils/datas'
import { ROTULO_STATUS } from '@/shared/utils/status'
import s from './detalhe.module.css'

/** Visão do cliente: só passos de status, sem motivo (spec §5.4). */
export function PassosCliente({ historico, usuario }: { historico: Historico[]; usuario: Usuario }) {
  const passos = historico.filter((h) => h.tipo === 'status' && h.para)
  if (!passos.length) return null
  return (
    <div className={s.passosCliente} aria-label="O que aconteceu">
      {passos.map((h) => <span key={h.id}>{formatarDataHora(h.ocorrido_em, usuario)} · {ROTULO_STATUS[h.para!]}</span>)}
    </div>
  )
}
