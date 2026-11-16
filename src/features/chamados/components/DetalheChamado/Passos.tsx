import type { Status } from '@/shared/types'
import s from './detalhe.module.css'

export interface Passo { rotulo: string; status: readonly Status[] }

/** Stepper de status: passos anteriores marcados, atual em destaque, nota opcional ao lado do atual (ex.: "reaberto"). */
export function Passos({ passos, status, nota, rotulo = 'Situação' }: { passos: readonly Passo[]; status: Status; nota?: string; rotulo?: string }) {
  const atual = passos.findIndex((p) => p.status.includes(status))
  return (
    <ol className={s.passos} aria-label={rotulo}>
      {passos.map((p, i) => (
        <li key={p.rotulo} className={i < atual ? s.feito : i === atual ? s.atual : undefined} aria-current={i === atual ? 'step' : undefined}>
          <span className={s.marco} aria-hidden>{i < atual && <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={3} strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5" /></svg>}</span>
          <span>{p.rotulo}</span>
          {i === atual && nota && <span className={s.nota}>· {nota}</span>}
          {i < atual && <span className={s.sr}> (feito)</span>}
        </li>
      ))}
    </ol>
  )
}

export const PASSOS_EQUIPE: readonly Passo[] = [
  { rotulo: 'Aberto', status: ['aberto'] },
  { rotulo: 'Em atendimento', status: ['em_atendimento'] },
  { rotulo: 'Aguardando cliente', status: ['aguardando_cliente'] },
  { rotulo: 'Resolvido', status: ['resolvido'] },
  { rotulo: 'Fechado', status: ['fechado'] },
]

/** Na linguagem da cliente: "aguardando cliente" é parte do atendimento. */
export const PASSOS_CLIENTE: readonly Passo[] = [
  { rotulo: 'Recebido', status: ['aberto'] },
  { rotulo: 'Em atendimento', status: ['em_atendimento', 'aguardando_cliente'] },
  { rotulo: 'Resolvido', status: ['resolvido'] },
  { rotulo: 'Encerrado', status: ['fechado'] },
]
