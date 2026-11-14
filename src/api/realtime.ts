import type { Chamado, Historico, Usuario } from '@/shared/types'
import type { DetalheChamado } from './queries/chamados'
export const hidratar = {
  chamados(_: Chamado[]) {}, detalhe(_: DetalheChamado) {}, historico(_: Historico[]) {}, usuarios(_: Usuario[]) {},
}
