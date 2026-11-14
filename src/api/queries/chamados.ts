import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { Chamado, Historico, Mensagem, Status } from '@/shared/types'
import { api } from '../apiClient'
import { chaves } from './chaves'
import { hidratar } from '../realtime'

export interface DetalheChamado { chamado: Chamado; mensagens: Mensagem[]; historico: Historico[] }

export function useChamados() {
  return useQuery({ queryKey: chaves.chamados, queryFn: async () => { const d = await api.get<Chamado[]>('/chamados'); hidratar.chamados(d); return d } })
}
export function useChamado(id: string | undefined) {
  return useQuery({ queryKey: chaves.chamado(id ?? ''), enabled: !!id, queryFn: async () => { const d = await api.get<DetalheChamado>(`/chamados/${id}`); hidratar.detalhe(d); return d } })
}
export function useHistorico(habilitado: boolean) {
  return useQuery({ queryKey: chaves.historico, enabled: habilitado, queryFn: async () => { const d = await api.get<Historico[]>('/historico'); hidratar.historico(d); return d } })
}

/** As mutations não mexem no cache: a tela muda quando o evento chega (spec §4.3). */
export function useAbrirChamado() {
  return useMutation({ mutationFn: (corpo: { titulo: string; descricao: string; categoria_id: string }) => api.post<{ id: string }>('/chamados', corpo) })
}
export function useEnviarMensagem(chamadoId: string) {
  return useMutation({ mutationFn: (corpo: { texto: string; interna: boolean }) => api.post<{ ok: true }>(`/chamados/${chamadoId}/mensagens`, corpo) })
}
export function useAtribuir() {
  return useMutation({ mutationFn: ({ chamadoId, consultorId }: { chamadoId: string; consultorId: string }) => api.post<{ ok: true }>(`/chamados/${chamadoId}/atribuir`, { consultor_id: consultorId }) })
}
export function useMudarStatus(chamadoId: string) {
  return useMutation({ mutationFn: (corpo: { para: Status; motivo?: string }) => api.post<{ ok: true }>(`/chamados/${chamadoId}/status`, corpo) })
}
export function useInvalidarTudo() {
  const qc = useQueryClient()
  return () => qc.invalidateQueries()
}
