import { useCallback, useSyncExternalStore } from 'react'

const chave = (usuarioId: string, chamadoId?: string) => `itsm:visita:${usuarioId}${chamadoId ? `:${chamadoId}` : ''}`
const ouvintes = new Set<() => void>()
const avisar = () => ouvintes.forEach((cb) => cb())

export function lerUltimaVisita(usuarioId: string, chamadoId?: string): number | null {
  try { const v = localStorage.getItem(chave(usuarioId, chamadoId)); return v ? Number(v) : null } catch { return null }
}
export function marcarVisita(usuarioId: string, agoraMs: number, chamadoId?: string) {
  try { localStorage.setItem(chave(usuarioId, chamadoId), String(agoraMs)); avisar() } catch { /* storage bloqueado */ }
}

/** Spec §5.1 (por chamado) e §5.3 (geral). Chaves por usuário para não vazar entre perfis na mesma máquina. */
export function useUltimaVisita(usuarioId: string, chamadoId?: string) {
  const assinar = useCallback((cb: () => void) => { ouvintes.add(cb); return () => { ouvintes.delete(cb) } }, [])
  const valor = useSyncExternalStore(assinar, () => lerUltimaVisita(usuarioId, chamadoId))
  const marcar = useCallback((agoraMs: number) => marcarVisita(usuarioId, agoraMs, chamadoId), [usuarioId, chamadoId])
  return [valor, marcar] as const
}
