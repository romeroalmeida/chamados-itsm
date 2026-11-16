import type { AgregadoConsultor } from '@/shared/utils/equipe'
import { LIMITE_SOBRECARGA } from '@/shared/utils/equipe'
import { formatarDuracao } from '@/shared/utils/datas'
import s from './equipe.module.css'

interface Props { a: AgregadoConsultor; grupo: string; maxAtivos: number; sugestao: AgregadoConsultor | null; onAbrir: () => void }

const iniciais = (nome: string) => { const p = nome.split(/\s+/); return `${p[0]![0]}${p.at(-1)![0]}`.toUpperCase() }
const SEMANA = 7 * 86_400_000
const ocioso = (ms: number) => (ms >= SEMANA ? 'a semana toda' : formatarDuracao(ms))

/** Barra empilhada (vencidos, em 4 h, pausados, restante) na escala do consultor mais carregado da equipe. */
export function CartaoConsultor({ a, grupo, maxAtivos, sugestao, onAbrir }: Props) {
  const livre = a.ativos === 0
  const sobrecarregado = a.vencidos >= LIMITE_SOBRECARGA
  const resto = Math.max(0, a.ativos - a.vencidos - a.vencendo4h - a.pausados)
  const w = (n: number) => `${((n / Math.max(1, maxAtivos)) * 100).toFixed(2)}%`
  return (
    <article className={s.cartao}>
      <div className={s.cabeca}>
        <span className={s.avatar} aria-hidden>{iniciais(a.consultor.nome)}</span>
        <button type="button" className={s.quem} onClick={onAbrir} aria-label={`${a.consultor.nome}, ${a.ativos} ativos`}>
          <strong>{a.consultor.nome}</strong><small>{grupo}</small>
        </button>
        {livre ? <span className={`${s.selo} ${s.seloLivre}`}><i aria-hidden />Livre</span>
          : sobrecarregado ? <span className={`${s.selo} ${s.seloSobre}`}><i aria-hidden />Sobrecarregado</span> : null}
      </div>
      <div className={s.carga} role="img" aria-label={`${a.ativos} ativos: ${a.vencidos} vencidos, ${a.vencendo4h} vencendo em 4 horas, ${a.pausados} pausados`}>
        {a.vencidos > 0 && <i className={s.cV} style={{ width: w(a.vencidos) }} />}
        {a.vencendo4h > 0 && <i className={s.cQ} style={{ width: w(a.vencendo4h) }} />}
        {a.pausados > 0 && <i className={s.cP} style={{ width: w(a.pausados) }} />}
        {resto > 0 && <i className={s.cR} style={{ width: w(resto) }} />}
      </div>
      <div className={s.numeros}>
        <span className={`${s.numero} ${a.ativos ? '' : s.zero}`}><b>{a.ativos}</b><span><i className={s.cR} />ativos</span></span>
        <span className={`${s.numero} ${a.vencidos ? s.vermelho : s.zero}`}><b>{a.vencidos}</b><span><i className={s.cV} />vencidos</span></span>
        <span className={`${s.numero} ${a.vencendo4h ? s.laranja : s.zero}`}><b>{a.vencendo4h}</b><span><i className={s.cQ} />em 4 h</span></span>
      </div>
      {sobrecarregado && sugestao && (
        <p className={s.sugere}>
          <IconeTroca />
          <span>Sugestão: passar para <b>{sugestao.consultor.nome}</b> · {sugestao.ativos} ativos, {ocioso(sugestao.ociosoMs)} ocioso</span>
        </p>
      )}
      <div className={s.rodape}>
        <span>Ocioso na semana <b>{ocioso(a.ociosoMs)}</b>{a.pausados > 0 && ` · ${a.pausados} pausados`}</span>
        {sobrecarregado && <button type="button" className={s.btnPeq} onClick={onAbrir}><IconeTroca />Redistribuir</button>}
      </div>
    </article>
  )
}

const IconeTroca = () => <svg aria-hidden viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><path d="m16 3 4 4-4 4" /><path d="M20 7H4" /><path d="m8 21-4-4 4-4" /><path d="M4 17h16" /></svg>
