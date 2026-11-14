import { useQuery } from '@tanstack/react-query'
import type { Categoria, Grupo, Sla, Usuario } from '@/shared/types'
import { api } from '../apiClient'
import { chaves } from './chaves'
import { hidratar } from '../realtime'

const umaHora = 3_600_000
export function useUsuarios() {
  return useQuery({ queryKey: chaves.usuarios, staleTime: umaHora, queryFn: async () => { const d = await api.get<Usuario[]>('/usuarios'); hidratar.usuarios(d); return d } })
}
export const useCategorias = () => useQuery({ queryKey: chaves.categorias, staleTime: umaHora, queryFn: () => api.get<Categoria[]>('/categorias') })
export const useGrupos = () => useQuery({ queryKey: chaves.grupos, staleTime: umaHora, queryFn: () => api.get<Grupo[]>('/grupos') })
export const useSla = () => useQuery({ queryKey: chaves.sla, staleTime: umaHora, queryFn: () => api.get<Sla[]>('/sla') })

/** Mapa id → usuário, para nomes em listas. */
export function useMapaUsuarios(): Record<string, Usuario> {
  const { data } = useUsuarios()
  return Object.fromEntries((data ?? []).map((u) => [u.id, u]))
}
