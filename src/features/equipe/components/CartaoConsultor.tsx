import type { AgregadoConsultor } from '@/shared/utils/equipe'
import { formatarDuracao } from '@/shared/utils/datas'
import s from './equipe.module.css'

export function CartaoConsultor({ a, grupo, onAbrir }: { a: AgregadoConsultor; grupo: string; onAbrir: () => void }) {
  return (
    <button type="button" className={`${s.cartao} ${a.ativos === 0 ? s.semChamado : ''}`} onClick={onAbrir} aria-label={`${a.consultor.nome}, ${a.ativos} ativos`}>
      <span className={s.cabeca}>
        <span className={s.quem}><strong>{a.consultor.nome}</strong><small>{grupo}</small></span>
        {a.ativos === 0 && <span className={s.selo}>Sem chamado</span>}
      </span>
      <span className={s.numeros}>
        <span className={s.numero}><strong>{a.ativos}</strong>ativos</span>
        <span className={`${s.numero} ${a.vencidos ? s.vermelho : ''}`}><strong>{a.vencidos}</strong>vencidos</span>
        <span className={`${s.numero} ${a.vencendo4h ? s.laranja : ''}`}><strong>{a.vencendo4h}</strong>em 4h</span>
      </span>
      <span className={s.ocioso}>ocioso na semana: <strong>{formatarDuracao(a.ociosoMs)}</strong></span>
    </button>
  )
}
