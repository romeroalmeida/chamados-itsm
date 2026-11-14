import { Outlet, useNavigate } from 'react-router'
import { Button } from '@/shared/components'
import { useSessao } from '@/state/sessao'
import { useRealtime } from '../../providers/RealtimeProvider'
import { PainelSimulador } from '../PainelSimulador/PainelSimulador'
import s from './Casca.module.css'

const ROTULO_PERFIL = { consultor: 'Consultora', gestor: 'Gestor', cliente: 'Cliente' } as const

export function Casca() {
  const usuario = useSessao((st) => st.usuario)
  const sair = useSessao((st) => st.sair)
  const nav = useNavigate()
  const { servidor } = useRealtime()
  if (!usuario) return null
  return (
    <div className={s.casca}>
      <header className={s.topo}>
        <span className={s.marca}>Chamados</span>
        <span className={s.espaco} />
        <span className={s.usuario}>{usuario.nome} · {ROTULO_PERFIL[usuario.perfil]}</span>
        <Button pequeno onClick={() => { sair(); nav('/entrar') }}>Sair</Button>
      </header>
      {/* lido uma vez por render: a conectividade do bus é fixa por aba */}
      {servidor.socket.estado() === 'desconectado' && <div className={s.faixaOffline} role="status">Sem atualização em tempo real nesta aba. Os dados são recarregados ao voltar o foco.</div>}
      <main className={s.conteudo}><Outlet /></main>
      <PainelSimulador />
    </div>
  )
}
