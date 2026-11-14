import type { ButtonHTMLAttributes } from 'react'
import s from './Button.module.css'

type Props = ButtonHTMLAttributes<HTMLButtonElement> & { variante?: 'padrao' | 'primaria' | 'perigo'; pequeno?: boolean }

export function Button({ variante = 'padrao', pequeno, className, type = 'button', ...rest }: Props) {
  const classes = [s.btn, variante === 'primaria' && s.primaria, variante === 'perigo' && s.perigo, pequeno && s.pequeno, className].filter(Boolean).join(' ')
  return <button type={type} className={classes} {...rest} />
}
