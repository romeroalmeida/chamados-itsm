import type { Dados } from '@/shared/types'
import dadosCompletos from '@/mock-server/dados.json'

export const DADOS = dadosCompletos as unknown as Dados
export const AGORA_ISO = DADOS.meta.agora
export const AGORA_MS = Date.parse(AGORA_ISO)

export const MARINA = DADOS.usuarios.find((u) => u.nome === 'Marina Almeida')!
export const RICARDO = DADOS.usuarios.find((u) => u.perfil === 'gestor')!
export const HELENA = DADOS.usuarios.find((u) => u.nome === 'Helena Fernandes')!

export function chamadoPorNumero(numero: number) {
  return DADOS.chamados.find((c) => c.numero === numero)!
}
