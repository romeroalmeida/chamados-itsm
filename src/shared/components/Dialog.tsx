import * as RD from '@radix-ui/react-dialog'
import type { ReactNode } from 'react'
import s from './Dialog.module.css'

interface Props { aberto: boolean; onFechar: () => void; titulo: string; children: ReactNode; acoes?: ReactNode }

export function Dialog({ aberto, onFechar, titulo, children, acoes }: Props) {
  return (
    <RD.Root open={aberto} onOpenChange={(o) => !o && onFechar()}>
      <RD.Portal>
        <RD.Overlay className={s.overlay} />
        <RD.Content className={s.conteudo} aria-describedby={undefined}>
          <RD.Title className={s.titulo}>{titulo}</RD.Title>
          {children}
          {acoes && <div className={s.acoes}>{acoes}</div>}
        </RD.Content>
      </RD.Portal>
    </RD.Root>
  )
}
