import { useMemo } from 'react'
import { useNavigate } from 'react-router'
import type { UsuarioCliente } from '@/shared/types'
import { useChamados, useMapaUsuarios } from '@/api/queries'
import { Carregando, Erro, Vazio } from '@/shared/components'
import { useNow } from '@/shared/hooks/useNow'
import { formatarDiaHora } from '@/shared/utils/datas'
import { ehEncerrado, prazoRelevante, restanteMs, TIPO_PRAZO } from '@/shared/utils/sla'
import { useSessao } from '@/state/sessao'
import { Novidades } from '../../components/Novidades/Novidades'
import { rotuloStatus } from '../../utils/rotulos'
import s from './MeusChamadosPage.module.css'

export function MeusChamadosPage() {
  const usuario = useSessao((st) => st.usuario) as UsuarioCliente
  const nav = useNavigate()
  const q = useChamados()
  const usuarios = useMapaUsuarios()
  const agora = useNow()
  const lista = useMemo(() => [...(q.data ?? [])].sort((a, b) => Number(ehEncerrado(a)) - Number(ehEncerrado(b)) || b.atualizado_em.localeCompare(a.atualizado_em)), [q.data])

  if (q.isPending) return <Carregando />
  if (q.isError) return <Erro erro={q.error} tentar={() => q.refetch()} />
  return (
    <div className={s.pagina}>
      {/* "Abrir chamado" mora no cabeçalho */}
      <div className={s.topo}>
        <h1 className={s.titulo}>Meus chamados</h1>
        <span className={s.contagem}>{lista.length}</span>
      </div>
      <Novidades chamados={lista} usuario={usuario} usuarios={usuarios} agora={agora} onAbrir={(id) => nav(`/chamados/${id}`)} />
      {lista.length === 0 ? <Vazio texto="Você ainda não abriu nenhum chamado." /> : (
        <div className={s.lista}>
          {lista.map((c) => {
            const resp = c.responsavel_id ? usuarios[c.responsavel_id]?.nome : undefined
            const mostraPrevisao = !ehEncerrado(c) && !c.sla_pausado
            const { tipo, prazo } = prazoRelevante(c)
            return (
              <button key={c.id} type="button" className={`${s.cartao} ${ehEncerrado(c) ? s.encerrado : ''}`} onClick={() => nav(`/chamados/${c.id}`)}>
                <span className={s.linha}><strong className={s.nome}>{c.titulo}</strong><span className={s.numero}>#{c.numero}</span></span>
                <span className={s.linha}>
                  <span className={s.situacao}><i aria-hidden className={s.ponto} />{rotuloStatus(c, 'cliente', resp)}</span>
                  {mostraPrevisao && <span className={s.previsao}>{restanteMs(c, agora) >= 0 ? `Previsão de ${TIPO_PRAZO[tipo]} até ${formatarDiaHora(prazo, usuario)}` : 'Em atraso. Estamos cuidando.'}</span>}
                </span>
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}
