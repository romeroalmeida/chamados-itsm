import { useState } from 'react'
import type { Chamado, Usuario, UsuarioConsultor } from '@/shared/types'
import { useAtribuir } from '@/api/queries'
import { Select, useToast } from '@/shared/components'
import { formatarDuracao } from '@/shared/utils/datas'
import { faixaSla, restanteMs } from '@/shared/utils/sla'
import { ROTULO_PRIORIDADE } from '@/shared/utils/status'
import s from './equipe.module.css'

const LIMITE = 8

interface Props {
  id: string; titulo: string; chamados: Chamado[]; tipo: 'vencendo' | 'semDono'
  consultores: UsuarioConsultor[]; usuarios: Record<string, Usuario>; nomeGrupo: (id: string) => string
  agora: number; onAbrir: (id: string) => void; vazio: string
}

/** Tabela compacta com a ação na linha: atribuir (sem dono) ou reatribuir (já tem responsável). */
export function TabelaChamados({ id, titulo, chamados, tipo, consultores, usuarios, nomeGrupo, agora, onAbrir, vazio }: Props) {
  const [todos, setTodos] = useState(false)
  const atribuir = useAtribuir()
  const { notificar } = useToast()
  const visiveis = todos ? chamados : chamados.slice(0, LIMITE)
  const empresa = (c: Chamado) => { const u = usuarios[c.solicitante_id]; return u?.perfil === 'cliente' ? u.empresa : u?.nome }
  return (
    <section className={s.caixaTabela} aria-labelledby={id}>
      <div className={s.tituloTabela}>
        <h2 id={id} tabIndex={-1}>{titulo} <span className={s.n}>{chamados.length}</span></h2>
        {chamados.length > LIMITE && <button type="button" className={s.btnFant} onClick={() => setTodos((t) => !t)} aria-expanded={todos}>{todos ? 'Ver menos' : `Ver todos (${chamados.length})`}</button>}
      </div>
      {chamados.length === 0 ? <p className={s.vazio}>{vazio}</p> : (
        <table className={s.tabela}>
          <thead><tr><th>{tipo === 'vencendo' ? 'Estoura em' : 'Prazo'}</th><th>Chamado</th><th>{tipo === 'vencendo' ? 'Responsável' : 'Grupo'}</th><th><span className={s.sr}>Ação</span></th></tr></thead>
          <tbody>
            {visiveis.map((c) => {
              const r = restanteMs(c, agora)
              const resp = c.responsavel_id ? usuarios[c.responsavel_id]?.nome : undefined
              const opcoes = consultores.filter((k) => k.grupo_id === c.grupo_id && k.id !== c.responsavel_id).map((k) => ({ valor: k.id, rotulo: k.nome }))
              return (
                <tr key={c.id}>
                  <td><span className={`${s.tempo} ${s[faixaSla(c, agora)]}`}>{r < 0 ? `há ${formatarDuracao(-r)}` : formatarDuracao(r)}</span></td>
                  <td>
                    <button type="button" className={s.linkTitulo} onClick={() => onAbrir(c.id)}>{c.titulo}</button>
                    <span className={s.sub}><span className={s.num}>#{c.numero}</span> · {empresa(c)}{c.prioridade === 'critica' && <> · <b className={s.critica}>{ROTULO_PRIORIDADE.critica}</b></>}</span>
                  </td>
                  <td>{tipo === 'semDono' ? nomeGrupo(c.grupo_id) : resp ?? <span className={s.semDono}>sem responsável</span>}</td>
                  <td>
                    <Select className={s.selectAcao} ariaLabel={`${resp ? 'Reatribuir' : 'Atribuir'} #${c.numero}`} valor={undefined} placeholder={resp ? 'Reatribuir' : 'Atribuir'} opcoes={opcoes}
                      onChange={(consultorId) => atribuir.mutate({ chamadoId: c.id, consultorId }, { onError: (e) => notificar({ titulo: 'Não atribuído', descricao: e.message, tipo: 'erro' }) })} />
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      )}
    </section>
  )
}
