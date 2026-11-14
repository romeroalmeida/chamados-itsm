import * as RT from '@radix-ui/react-toast'
import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react'
import { Button } from './Button'
import s from './Toast.module.css'

export interface ToastItem { id: string; titulo: string; descricao?: string; tipo?: 'info' | 'erro' | 'alerta'; acao?: { rotulo: string; onClick: () => void }; duracaoMs?: number }
interface Ctx { notificar(t: Omit<ToastItem, 'id'> & { id?: string }): void }
const ToastCtx = createContext<Ctx | null>(null)

export function ToastProvider({ children }: { children: ReactNode }) {
  const [itens, setItens] = useState<ToastItem[]>([])
  const notificar = useCallback<Ctx['notificar']>((t) => {
    const id = t.id ?? crypto.randomUUID()
    setItens((atual) => (atual.some((x) => x.id === id) ? atual : [...atual, { ...t, id }]))
  }, [])
  const ctx = useMemo(() => ({ notificar }), [notificar])
  return (
    <ToastCtx.Provider value={ctx}>
      <RT.Provider swipeDirection="right">
        {children}
        {itens.map((t) => (
          <RT.Root key={t.id} className={`${s.toast} ${t.tipo === 'erro' ? s.erro : t.tipo === 'alerta' ? s.alerta : ''}`} duration={t.duracaoMs ?? 6000}
            onOpenChange={(o) => !o && setItens((a) => a.filter((x) => x.id !== t.id))}>
            <div className={s.cabecalho}>
              <span className={s.ponto} aria-hidden />
              <RT.Title className={s.titulo}>{t.titulo}</RT.Title>
            </div>
            {t.descricao && <RT.Description className={s.descricao}>{t.descricao}</RT.Description>}
            <div className={s.acoes}>
              {t.acao && <RT.Action altText={t.acao.rotulo} asChild><Button pequeno onClick={t.acao.onClick}>{t.acao.rotulo}</Button></RT.Action>}
              <RT.Close asChild><Button pequeno aria-label="Fechar aviso">Fechar</Button></RT.Close>
            </div>
          </RT.Root>
        ))}
        <RT.Viewport className={s.viewport} />
      </RT.Provider>
    </ToastCtx.Provider>
  )
}

export function useToast(): Ctx {
  const ctx = useContext(ToastCtx)
  if (!ctx) throw new Error('useToast fora do ToastProvider')
  return ctx
}
