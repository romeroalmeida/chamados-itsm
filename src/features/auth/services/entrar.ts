import { api } from '@/api/apiClient'
import type { Usuario } from '@/shared/types'

export const entrar = (email: string, pin: string) => api.post<Usuario>('/auth/entrar', { email, pin })

/** Os três do enunciado. PIN padrão para todos: 123456 (README). */
export const PERSONAS = [
  { nome: 'Marina Almeida', perfil: 'Consultora', email: 'marina.almeida@suporte.example' },
  { nome: 'Ricardo Monteiro', perfil: 'Gestor', email: 'ricardo.monteiro@suporte.example' },
  { nome: 'Helena Fernandes', perfil: 'Cliente', email: 'helena.fernandes@lusitania.example' },
] as const
export const PIN_PADRAO = '123456'
