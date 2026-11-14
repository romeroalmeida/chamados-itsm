import type { AgregadoConsultor } from '@/shared/utils/equipe'
import { formatarDuracao } from '@/shared/utils/datas'
import s from '../pages/EquipePage.module.css'

export function CartaoConsultor({ a, grupo, onAbrir }: { a: AgregadoConsultor; grupo: string; onAbrir: () => void }) {
  return (
    <button className={`${s.cartao} ${a.ativos === 0 ? s.semChamado : ''}`} onClick={onAbrir} aria-label={`${a.consultor.nome}, ${a.ativos} ativos`}>
      <div className={s.nome}><span>{a.consultor.nome}</span><small style={{ color: 'var(--cor-texto-fraco)', fontWeight: 400 }}>{grupo}</small></div>
      {a.ativos === 0 && <strong style={{ color: 'var(--sla-atencao)' }}>Sem chamado</strong>}
      <div className={s.numeros}>
        <span><strong>{a.ativos}</strong> ativos</span>
        <span className={a.vencidos ? s.vermelho : ''}><strong>{a.vencidos}</strong> vencidos</span>
        <span className={a.vencendo4h ? s.laranja : ''}><strong>{a.vencendo4h}</strong> em 4h</span>
      </div>
      <div className={s.numeros}><span>ocioso na semana: <strong>{formatarDuracao(a.ociosoMs)}</strong></span></div>
    </button>
  )
}
