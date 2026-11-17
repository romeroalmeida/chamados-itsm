import { api } from '@/api/apiClient'
import type { Usuario } from '@/shared/types'

export const pedirCodigo = (email: string) => api.post<{ ok: true }>('/auth/codigo', { email })
export const entrar = (email: string, codigo: string) => api.post<Usuario>('/auth/entrar', { email, codigo })

/** Os três do enunciado. Ambiente de demonstração: o código de todos é 123456 (README). */
export const PERSONAS = [
  { nome: 'Marina Almeida', perfil: 'Consultora', email: 'marina.almeida@suporte.example' },
  { nome: 'Ricardo Monteiro', perfil: 'Gestor', email: 'ricardo.monteiro@suporte.example' },
  { nome: 'Helena Fernandes', perfil: 'Cliente', email: 'helena.fernandes@lusitania.example' },
] as const
