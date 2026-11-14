import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router'
import type { UsuarioConsultor, UsuarioGestor } from '@/shared/types'
import { useChamados, useGrupos, useHistorico, useMapaUsuarios } from '@/api/queries'
import { Carregando, Erro, FaixaAlerta } from '@/shared/components'
import { useNow } from '@/shared/hooks/useNow'
import { agregadosPorConsultor } from '@/shared/utils/equipe'
import { ehEncerrado, faixaSla, ordenarEstouraPrimeiro } from '@/shared/utils/sla'
import { useSessao } from '@/state/sessao'
import { CartaoConsultor } from '../../components/CartaoConsultor'
import { FilaSemDono } from '../../components/FilaSemDono'
import { Redistribuir } from '../../components/Redistribuir'
import { VencendoEmBreve } from '../../components/VencendoEmBreve'
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

  const consultores = useMemo(() => Object.values(usuarios).filter((u): u is UsuarioConsultor => u.perfil === 'consultor' && usuario.grupos_ids.includes(u.grupo_id)), [usuarios, usuario])
  const lista = chamados.data ?? []
  const agregados = useMemo(() => agregadosPorConsultor(consultores, lista, historico.data ?? [], agora), [consultores, lista, historico.data, agora])
  const semDono = useMemo(() => ordenarEstouraPrimeiro(lista.filter((c) => c.status === 'aberto' && !c.responsavel_id), agora), [lista, agora])
  const vencendo = useMemo(() => ordenarEstouraPrimeiro(lista.filter((c) => !ehEncerrado(c) && ['critico', 'ultima_hora'].includes(faixaSla(c, agora))), agora), [lista, agora])
  const resumo = useMemo(() => ({ vencidos: lista.filter((c) => faixaSla(c, agora) === 'vencido').length, proximaHora: lista.filter((c) => faixaSla(c, agora) === 'ultima_hora').length }), [lista, agora])

  if (chamados.isPending || historico.isPending) return <Carregando />
  if (chamados.isError) return <Erro erro={chamados.error} tentar={() => chamados.refetch()} />
  if (historico.isError) return <Erro erro={historico.error} tentar={() => historico.refetch()} />
  const nomeGrupo = (id: string) => grupos.find((g) => g.id === id)?.nome ?? ''
  const consultorAberto = agregados.find((a) => a.consultor.id === aberto)

  return (
    <div className={s.pagina}>
      <div className={s.alerta}><FaixaAlerta resumo={resumo} sufixo="da equipe" /></div>
      <section className={s.secao} aria-labelledby="t-equipe">
        <h2 id="t-equipe" className={s.titulo}>Equipe <small>{consultores.length} consultores · ordenado por quem está pior</small></h2>
        <div className={s.cartoes}>{agregados.map((a) => <CartaoConsultor key={a.consultor.id} a={a} grupo={nomeGrupo(a.consultor.grupo_id)} onAbrir={() => setAberto(a.consultor.id)} />)}</div>
        {consultorAberto && (
          <div className={s.detalhe}>
            <h3 className={s.subtitulo}>Chamados de {consultorAberto.consultor.nome}</h3>
            <Redistribuir key={consultorAberto.consultor.id} chamados={ordenarEstouraPrimeiro(lista.filter((c) => c.responsavel_id === consultorAberto.consultor.id && !ehEncerrado(c)), agora)}
              consultores={consultores.filter((k) => k.grupo_id === consultorAberto.consultor.grupo_id && k.id !== consultorAberto.consultor.id)} usuarios={usuarios} agora={agora} onFechar={() => setAberto(null)} />
          </div>
        )}
      </section>
      <section className={s.secao} aria-labelledby="t-vencendo">
        <h2 id="t-vencendo" className={s.titulo}>Vencendo nas próximas 4 horas <span className={s.contagem}>{vencendo.length}</span></h2>
        <VencendoEmBreve chamados={vencendo} usuarios={usuarios} agora={agora} onAbrir={(id) => nav(`/chamados/${id}`)} />
      </section>
      <section className={s.secao} aria-labelledby="t-semdono">
        <h2 id="t-semdono" className={s.titulo}>Fila sem dono <span className={s.contagem}>{semDono.length}</span></h2>
        <FilaSemDono chamados={semDono} consultores={consultores} grupos={grupos} usuarios={usuarios} agora={agora} onAbrir={(id) => nav(`/chamados/${id}`)} />
      </section>
    </div>
  )
}
