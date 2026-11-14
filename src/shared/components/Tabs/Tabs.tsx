import * as RTabs from '@radix-ui/react-tabs'
import type { ReactNode } from 'react'
import s from './Tabs.module.css'

export interface Aba { valor: string; rotulo: string; contador?: number }
interface Props { abas: Aba[]; valor: string; onChange: (v: string) => void; ariaLabel: string; children: ReactNode }

export function Tabs({ abas, valor, onChange, ariaLabel, children }: Props) {
  return (
    <RTabs.Root value={valor} onValueChange={onChange}>
      <RTabs.List className={s.lista} aria-label={ariaLabel}>
        {abas.map((a) => (
          <RTabs.Trigger key={a.valor} value={a.valor} className={s.aba}>
            {a.rotulo}{a.contador !== undefined && <span className={s.contador}>{a.contador}</span>}
          </RTabs.Trigger>
        ))}
      </RTabs.List>
      {children}
    </RTabs.Root>
  )
}
