import type { ReactNode } from 'react'
import type { Chamado, Usuario } from '@/shared/types'
import { lerUltimaVisita, useUltimaVisita } from '@/shared/hooks/useUltimaVisita'
import type { GrupoUrgencia } from '../../utils/fila'
import { LinhaChamado } from '../LinhaChamado/LinhaChamado'
import s from './ListaChamados.module.css'

const nomeCliente = (u?: Usuario) => (!u ? '' : u.perfil === 'cliente' ? `${u.nome} · ${u.empresa}` : u.nome)

export interface GrupoLista { id: GrupoUrgencia; rotulo: string; dica?: string; chamados: Chamado[] }
interface Props {
  grupos: GrupoLista[]; agora: number; usuario: Usuario; usuarios: Record<string, Usuario>; ativoId?: string
  respondeu: ReadonlySet<string>; onAbrir: (id: string) => void; vazio: ReactNode
}

/**
 * Fila agrupada por urgência, com cabeçalho fixo por grupo (sticky dentro do próprio grupo).
 * Sem virtualização: a fila de um consultor tem dezenas de chamados (42 da Marina, 35 sem dono no grupo);
 * a lista longa de verdade é a conversa de 1.500 mensagens, que continua virtualizada.
 */
export function ListaChamados({ grupos, agora, usuario, usuarios, ativoId, respondeu, onAbrir, vazio }: Props) {
  useUltimaVisita(usuario.id) // assina o store de visitas: o ponto azul some assim que o chamado é aberto
  const visiveis = grupos.filter((g) => g.chamados.length > 0)
  if (visiveis.length === 0) return <div className={s.vazio}>{vazio}</div>
  return (
    <div className={s.lista} role="list" aria-label="Chamados">
      {visiveis.map((g) => (
        <div key={g.id} id={`grupo-${g.id}`} role="listitem" className={s.grupo} aria-labelledby={`grupo-${g.id}-t`}>
          <h3 id={`grupo-${g.id}-t`} className={`${s.cabeca} ${s[g.id]}`} tabIndex={-1}>
            <i aria-hidden className={s.ponto} />{g.rotulo} <span className={s.n}>{g.chamados.length}</span>
            {g.dica && <small>{g.dica}</small>}
          </h3>
          <ul className={s.itens}>
            {g.chamados.map((c) => {
              const visita = lerUltimaVisita(usuario.id, c.id)
              const temNovidade = visita !== null && Date.parse(c.atualizado_em) > visita && c.id !== ativoId
              return (
                <li key={c.id}>
                  <LinhaChamado chamado={c} agora={agora} nomeCliente={nomeCliente(usuarios[c.solicitante_id])} ativo={c.id === ativoId} temNovidade={temNovidade} respondeu={respondeu.has(c.id)} onAbrir={onAbrir} />
                </li>
              )
            })}
          </ul>
        </div>
      ))}
    </div>
  )
}
