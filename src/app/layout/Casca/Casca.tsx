import { Outlet } from 'react-router'
import { useSessao } from '@/state/sessao'
import { useRealtime } from '../../providers/RealtimeProvider'
import { Cabecalho } from '../Cabecalho/Cabecalho'
import { PainelSimulador } from '../PainelSimulador/PainelSimulador'
import s from './Casca.module.css'

export function Casca() {
  const usuario = useSessao((st) => st.usuario)
  const { servidor } = useRealtime()
  if (!usuario) return null
  return (
    <div className={s.casca}>
      <Cabecalho />
      {/* lido uma vez por render: a conectividade do bus é fixa por aba */}
      {servidor.socket.estado() === 'desconectado' && <div className={s.faixaOffline} role="status">Sem atualização em tempo real nesta aba. Os dados são recarregados ao voltar o foco.</div>}
      <main className={s.conteudo}><Outlet /></main>
      <PainelSimulador />
    </div>
  )
}
