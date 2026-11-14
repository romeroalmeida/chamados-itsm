import type { ReactNode } from 'react'
import type { Faixa } from '@/shared/utils/sla'
import s from './Badge.module.css'

export function Badge({ faixa, children, title }: { faixa?: Faixa | 'neutro'; children: ReactNode; title?: string }) {
  return <span className={`${s.badge} ${faixa ? s[faixa] : ''}`} title={title}>{children}</span>
}
