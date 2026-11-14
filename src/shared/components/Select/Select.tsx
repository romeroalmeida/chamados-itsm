import * as RS from '@radix-ui/react-select'
import s from './Select.module.css'

export interface Opcao { valor: string; rotulo: string }
interface Props { valor: string | undefined; onChange: (v: string) => void; opcoes: Opcao[]; placeholder?: string; ariaLabel: string }

export function Select({ valor, onChange, opcoes, placeholder = 'Selecione', ariaLabel }: Props) {
  return (
    <RS.Root value={valor} onValueChange={onChange}>
      <RS.Trigger className={s.trigger} aria-label={ariaLabel}><RS.Value placeholder={placeholder} /><RS.Icon>▾</RS.Icon></RS.Trigger>
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
