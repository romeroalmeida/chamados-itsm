import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router'
import type { UsuarioConsultor, UsuarioGestor } from '@/shared/types'
import { useChamados, useGrupos, useHistorico, useMapaUsuarios } from '@/api/queries'
import { Carregando, Erro } from '@/shared/components'
import { useNow } from '@/shared/hooks/useNow'
import { agregadosPorConsultor, sugerirDestino } from '@/shared/utils/equipe'
import { ehEncerrado, faixaSla, ordenarEstouraPrimeiro } from '@/shared/utils/sla'
import { useSessao } from '@/state/sessao'
import { CartaoConsultor } from '../../components/CartaoConsultor'
import { Redistribuir } from '../../components/Redistribuir'
import { TabelaChamados } from '../../components/TabelaChamados'
import s from './EquipePage.module.css'

export function EquipePage() {
  const usuario = useSessao((st) => st.usuario) as UsuarioGestor
  const nav = useNavigate()
  const chamados = useChamados()
  const historico = useHistorico(true)
  const usuarios = useMapaUsuarios()
  const grupos = useGrupos().data ?? []
  const agora = useNow()
  const [aberto, setAberto] = useState<string | null>(null)
  const painel = useRef<HTMLDivElement>(null)

  const consultores = useMemo(() => Object.values(usuarios).filter((u): u is UsuarioConsultor => u.perfil === 'consultor' && usuario.grupos_ids.includes(u.grupo_id)), [usuarios, usuario])
  const lista = chamados.data ?? []
  const agregados = useMemo(() => agregadosPorConsultor(consultores, lista, historico.data ?? [], agora), [consultores, lista, historico.data, agora])
  const semDono = useMemo(() => ordenarEstouraPrimeiro(lista.filter((c) => c.status === 'aberto' && !c.responsavel_id), agora), [lista, agora])
  const vencendo = useMemo(() => ordenarEstouraPrimeiro(lista.filter((c) => !ehEncerrado(c) && ['critico', 'ultima_hora'].includes(faixaSla(c, agora))), agora), [lista, agora])
  const resumo = useMemo(() => ({ vencidos: lista.filter((c) => faixaSla(c, agora) === 'vencido').length, proximaHora: lista.filter((c) => faixaSla(c, agora) === 'ultima_hora').length }), [lista, agora])
  const maxAtivos = Math.max(0, ...agregados.map((a) => a.ativos))

  useEffect(() => { if (aberto) painel.current?.scrollIntoView({ block: 'nearest', behavior: window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' }) }, [aberto])

  if (chamados.isPending || historico.isPending) return <Carregando />
  if (chamados.isError) return <Erro erro={chamados.error} tentar={() => chamados.refetch()} />
  if (historico.isError) return <Erro erro={historico.error} tentar={() => historico.refetch()} />
  const nomeGrupo = (id: string) => grupos.find((g) => g.id === id)?.nome ?? ''
  const consultorAberto = agregados.find((a) => a.consultor.id === aberto)
  const ir = (alvo: string) => {
    const el = document.getElementById(alvo)
    el?.scrollIntoView({ block: 'start', behavior: window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' })
    el?.focus({ preventScroll: true })
  }

  return (
    <div className={s.pagina}>
      <div className={s.topo}>
        <div>
          <h1 className={s.titulo}>Equipe</h1>
          <p className={s.subtitulo}>Ordenada por quem está pior: mais vencidos, depois mais ativos.</p>
        </div>
        <div className={s.resumo} role="group" aria-label="Resumo">
          <button type="button" className={s.vencidos} onClick={() => ir('t-equipe')}><b>{resumo.vencidos}</b>vencidos</button>
          <button type="button" className={s.proxima} onClick={() => ir('t-vencendo')}><b>{resumo.proximaHora}</b>vencem na próxima hora</button>
          <button type="button" onClick={() => ir('t-semdono')}><b>{semDono.length}</b>sem dono</button>
        </div>
      </div>

      <section className={s.secao} aria-labelledby="t-equipe">
        <h2 id="t-equipe" className={s.tituloSecao} tabIndex={-1}>Consultores <span className={s.n}>{consultores.length}</span><small>barra = chamados ativos na escala do mais carregado ({maxAtivos})</small></h2>
        <div className={s.cartoes}>
          {agregados.map((a) => <CartaoConsultor key={a.consultor.id} a={a} grupo={nomeGrupo(a.consultor.grupo_id)} maxAtivos={maxAtivos} sugestao={sugerirDestino(a, agregados)} onAbrir={() => setAberto(a.consultor.id)} />)}
        </div>
        {consultorAberto && (
          <div className={s.detalhe} ref={painel}>
            <h3 className={s.subtituloPainel}>Chamados de {consultorAberto.consultor.nome}</h3>
            <Redistribuir key={consultorAberto.consultor.id} chamados={ordenarEstouraPrimeiro(lista.filter((c) => c.responsavel_id === consultorAberto.consultor.id && !ehEncerrado(c)), agora)}
              consultores={consultores.filter((k) => k.grupo_id === consultorAberto.consultor.grupo_id && k.id !== consultorAberto.consultor.id)} usuarios={usuarios} agora={agora} onFechar={() => setAberto(null)} />
          </div>
        )}
      </section>

      <div className={s.tabelas}>
        <TabelaChamados id="t-vencendo" titulo="Vencendo nas próximas 4 horas" tipo="vencendo" chamados={vencendo} consultores={consultores} usuarios={usuarios} nomeGrupo={nomeGrupo} agora={agora} onAbrir={(id) => nav(`/chamados/${id}`)} vazio="Nada vence nas próximas 4 horas." />
        <TabelaChamados id="t-semdono" titulo="Fila sem dono" tipo="semDono" chamados={semDono} consultores={consultores} usuarios={usuarios} nomeGrupo={nomeGrupo} agora={agora} onAbrir={(id) => nav(`/chamados/${id}`)} vazio="Nenhum chamado esperando dono." />
      </div>
    </div>
  )
}
