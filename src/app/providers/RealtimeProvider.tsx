import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { criarRealtime, type Realtime } from '@/api/realtime'
import type { MockServer } from '@/mock-server'
import { queryClient } from './QueryProvider'

interface Ctx { realtime: Realtime; servidor: MockServer }
const RealtimeCtx = createContext<Ctx | null>(null)

/**
 * Cria o realtime num effect, não em useMemo: em StrictMode o useMemo roda duas vezes, o React guarda a
 * primeira instância mas a global `instancia` de realtime.ts aponta para a segunda, e o cleanup do
 * StrictMode desassina a instância do contexto. Com effect + cleanup, mount → unmount → mount fica correto.
 */
export function RealtimeProvider({ servidor, children }: { servidor: MockServer; children: ReactNode }) {
  const [realtime, setRealtime] = useState<Realtime | null>(null)
  useEffect(() => {
    const rt = criarRealtime(queryClient, servidor.socket)
    setRealtime(rt)
    return () => rt.parar()
  }, [servidor])
  const ctx = useMemo(() => (realtime ? { realtime, servidor } : null), [realtime, servidor])
  if (!ctx) return null
  return <RealtimeCtx.Provider value={ctx}>{children}</RealtimeCtx.Provider>
}

export function useRealtime(): Ctx {
  const ctx = useContext(RealtimeCtx)
  if (!ctx) throw new Error('useRealtime fora do RealtimeProvider')
  return ctx
}
