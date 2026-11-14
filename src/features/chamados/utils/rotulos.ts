import type { Chamado, Usuario } from '@/shared/types'
import { ROTULO_STATUS, ROTULO_STATUS_CLIENTE } from '@/shared/utils/status'

export function rotuloStatus(c: Chamado, perfil: Usuario['perfil'], nomeResponsavel?: string): string {
  if (perfil !== 'cliente') return ROTULO_STATUS[c.status]
  return ROTULO_STATUS_CLIENTE[c.status].replace('{nome}', nomeResponsavel ?? 'nossa equipe')
}
