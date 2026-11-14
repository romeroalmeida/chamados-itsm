import type { Historico, Usuario } from '@/shared/types'
import { formatarDataHora } from '@/shared/utils/datas'
import { ROTULO_STATUS } from '@/shared/utils/status'
import s from './detalhe.module.css'

interface Props { historico: Historico[]; usuarios: Record<string, Usuario>; usuario: Usuario }

export function HistoricoLista({ historico, usuarios, usuario }: Props) {
  if (historico.length === 0) return <p className={s.historico}>Sem histórico.</p>
  return (
    <ol className={s.historico} aria-label="Histórico">
      {[...historico].reverse().map((h) => (
        <li key={h.id}>
          <span className={s.quando}>{formatarDataHora(h.ocorrido_em, usuario)}</span>
          <span>
            {h.tipo === 'atribuicao'
              ? <>Atribuído a <strong>{usuarios[h.usuario_id]?.nome ?? 'alguém'}</strong></>
              : <>{h.de ? ROTULO_STATUS[h.de] : '—'} → <strong>{h.para ? ROTULO_STATUS[h.para] : '—'}</strong> por {usuarios[h.usuario_id]?.nome ?? 'alguém'}{h.motivo && <> · <em>{h.motivo}</em></>}</>}
          </span>
        </li>
      ))}
    </ol>
  )
}

/** Visão do cliente: só passos de status, sem motivo (spec §5.4). */
export function PassosCliente({ historico, usuario }: { historico: Historico[]; usuario: Usuario }) {
  const passos = historico.filter((h) => h.tipo === 'status' && h.para)
  if (!passos.length) return null
  return (
    <div className={s.passos} aria-label="O que aconteceu">
      {passos.map((h) => <span key={h.id}>{formatarDataHora(h.ocorrido_em, usuario)} · {ROTULO_STATUS[h.para!]}</span>)}
    </div>
  )
}
