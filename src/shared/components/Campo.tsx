import { useId, type InputHTMLAttributes, type TextareaHTMLAttributes } from 'react'
import s from './Campo.module.css'

type Base = { rotulo: string; erro?: string; ajuda?: string }
type InputProps = Base & InputHTMLAttributes<HTMLInputElement> & { multilinha?: false }
type AreaProps = Base & TextareaHTMLAttributes<HTMLTextAreaElement> & { multilinha: true }

export function Campo(props: InputProps | AreaProps) {
  const id = useId()
  const { rotulo, erro, ajuda } = props
  return (
    <div className={s.campo}>
      <label className={s.rotulo} htmlFor={id}>{rotulo}</label>
      {props.multilinha
        ? (() => { const { rotulo: _r, erro: _e, ajuda: _a, multilinha: _m, ...rest } = props; return <textarea id={id} className={s.entrada} aria-invalid={!!erro} {...rest} /> })()
        : (() => { const { rotulo: _r, erro: _e, ajuda: _a, multilinha: _m, ...rest } = props; return <input id={id} className={s.entrada} aria-invalid={!!erro} {...rest} /> })()}
      {erro ? <span className={s.erro} role="alert">{erro}</span> : ajuda ? <span className={s.ajuda}>{ajuda}</span> : null}
    </div>
  )
}
