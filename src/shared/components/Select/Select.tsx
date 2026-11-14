import * as RS from '@radix-ui/react-select'
import s from './Select.module.css'

export interface Opcao { valor: string; rotulo: string }
interface Props { valor: string | undefined; onChange: (v: string) => void; opcoes: Opcao[]; placeholder?: string; ariaLabel: string; className?: string }

export function Select({ valor, onChange, opcoes, placeholder = 'Selecione', ariaLabel, className }: Props) {
  return (
    <RS.Root value={valor} onValueChange={onChange}>
      <RS.Trigger className={`${s.trigger} ${className ?? ''}`} aria-label={ariaLabel}>
        <RS.Value placeholder={placeholder} />
        <RS.Icon className={s.icone}><svg aria-hidden viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><path d="m6 9 6 6 6-6" /></svg></RS.Icon>
      </RS.Trigger>
      <RS.Portal>
        <RS.Content className={s.conteudo} position="popper" sideOffset={4}>
          <RS.Viewport>
            {opcoes.map((o) => <RS.Item key={o.valor} value={o.valor} className={s.item}><RS.ItemText>{o.rotulo}</RS.ItemText></RS.Item>)}
          </RS.Viewport>
        </RS.Content>
      </RS.Portal>
    </RS.Root>
  )
}
