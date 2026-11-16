import { gruposDo, type Chamado, type Historico, type Mensagem, type Usuario } from '@/shared/types'

export function visivelPara(usuario: Usuario, chamado: Chamado): boolean {
  if (usuario.perfil === 'cliente') return chamado.solicitante_id === usuario.id
  // quem é responsável vê o chamado mesmo fora do grupo (ex.: #10608 da Marina está no grupo Aplicações)
  return chamado.responsavel_id === usuario.id || gruposDo(usuario).includes(chamado.grupo_id)
}

export function mensagemVisivel(usuario: Usuario, mensagem: Mensagem): boolean {
  return usuario.perfil !== 'cliente' || mensagem.interna !== true
}

/** Cliente: só entradas de status e sem motivo (spec §4.1, §5.4). */
export function historicoParaPerfil(usuario: Usuario, historico: Historico[]): Historico[] {
  if (usuario.perfil !== 'cliente') return historico
  return historico.filter((h) => h.tipo === 'status').map((h) => ({ ...h, motivo: null }))
}
