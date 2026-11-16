import * as RTabs from '@radix-ui/react-tabs'
import type { ReactNode } from 'react'
import s from './Tabs.module.css'

export interface Aba { valor: string; rotulo: string; contador?: number }
interface Props {
  abas: Aba[]; valor: string; onChange: (v: string) => void; ariaLabel: string; children: ReactNode
  /** 'segmentado': controle em pílula, para alternar visões do mesmo conteúdo. */
  variante?: 'linha' | 'segmentado' | 'cheio'
  /** Conteúdo à direita das abas, na mesma barra (ex.: ações do chamado). */
  extra?: ReactNode
}

export function Tabs({ abas, valor, onChange, ariaLabel, children, variante = 'linha', extra }: Props) {
  const lista = (
    <RTabs.List className={s[variante === 'linha' ? 'lista' : variante]} aria-label={ariaLabel}>
      {abas.map((a) => (
        <RTabs.Trigger key={a.valor} value={a.valor} className={s.aba}>
          {a.rotulo}{a.contador !== undefined && <span className={s.contador}>{a.contador}</span>}
        </RTabs.Trigger>
      ))}
    </RTabs.List>
  )
  return (
    <RTabs.Root value={valor} onValueChange={onChange}>
      {extra !== undefined ? <div className={s.barra}>{lista}<div className={s.extra}>{extra}</div></div> : lista}
      {children}
    </RTabs.Root>
  )
}
