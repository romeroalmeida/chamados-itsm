import { useMemo } from 'react'
import { useNavigate } from 'react-router'
import type { UsuarioCliente } from '@/shared/types'
import { useChamados, useMapaUsuarios } from '@/api/queries'
import { Button, Carregando, Erro, Vazio } from '@/shared/components'
import { useNow } from '@/shared/hooks/useNow'
import { formatarDiaHora } from '@/shared/utils/datas'
import { ehEncerrado, prazoRelevante, restanteMs, TIPO_PRAZO } from '@/shared/utils/sla'
import { useSessao } from '@/state/sessao'
import { Novidades } from '../components/Novidades'
import { rotuloStatus } from '../utils/rotulos'
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
      <div className={s.topo}>
        <h1 style={{ margin: 0, fontSize: 20 }}>Meus chamados</h1>
        <Button variante="primaria" onClick={() => nav('/meus-chamados/novo')}>Abrir chamado</Button>
      </div>
      <Novidades chamados={lista} usuario={usuario} usuarios={usuarios} agora={agora} onAbrir={(id) => nav(`/chamados/${id}`)} />
      {lista.length === 0 ? <Vazio texto="Você ainda não abriu nenhum chamado." /> : (
        <div className={s.lista}>
          {lista.map((c) => {
            const resp = c.responsavel_id ? usuarios[c.responsavel_id]?.nome : undefined
            const mostraPrevisao = !ehEncerrado(c) && !c.sla_pausado
            const { tipo, prazo } = prazoRelevante(c)
            return (
              <button key={c.id} className={s.cartao} onClick={() => nav(`/chamados/${c.id}`)}>
                <div className={s.linha}><strong>{c.titulo}</strong><span style={{ fontFamily: 'var(--fonte-mono)', color: 'var(--cor-texto-fraco)' }}>#{c.numero}</span></div>
                <div className={s.linha}>
                  <span className={s.situacao}>{rotuloStatus(c, 'cliente', resp)}</span>
                  {mostraPrevisao && <span className={s.previsao}>{restanteMs(c, agora) >= 0 ? `Previsão de ${TIPO_PRAZO[tipo]} até ${formatarDiaHora(prazo, usuario)}` : 'Em atraso. Estamos cuidando.'}</span>}
                </div>
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}
