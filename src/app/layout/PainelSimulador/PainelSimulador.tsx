import { useEffect, useState } from 'react'
import { useRealtime } from '../../providers/RealtimeProvider'
import { relogio } from '@/shared/utils/relogio'
import { useNow } from '@/shared/hooks/useNow'
import { useSessao } from '@/state/sessao'
import { formatarDataHora } from '@/shared/utils/datas'
import { CHAVE_SIMULADOR } from '@/mock-server/simulator'
import s from './PainelSimulador.module.css'

const VELOCIDADES = [1, 5, 20] as const
const semLocks = typeof navigator === 'undefined' || !('locks' in navigator)

/** Spec §4.4: pausar, velocidade, disparar, resetar, contadores, quem simula. */
export function PainelSimulador() {
  const { servidor } = useRealtime()
  const usuario = useSessao((st) => st.usuario)
  // useNow(1000) também é o que re-renderiza o rótulo "esta aba simula" quando o lock chega (defasagem máxima de 1 s)
  const agora = useNow(1000)
  const [ligado, setLigado] = useState(servidor.simulador.ligado())
  const [recebidos, setRecebidos] = useState(0)
  const [duplicados, setDuplicados] = useState(0)
  const [ultima, setUltima] = useState<string | null>(null)
  const [confirmarReset, setConfirmarReset] = useState(false)
  const velocidade = relogio.velocidade() // fonte única: itsm:relogio (spec §4.5)

  useEffect(() => {
    const vistos = new Set<string>()
    // conta no socket (já filtrado por visibilidade, antes do dedupe do realtime): o que chegou a ESTA aba
    const sair = servidor.socket.assinar((e) => { if (vistos.has(e.id)) setDuplicados((d) => d + 1); else { vistos.add(e.id); setRecebidos((r) => r + 1) } })
    const sairAcao = servidor.simulador.onAcao((a) => setUltima(a.descricao))
    // "ligado" é global (localStorage): pausar numa aba pausa a que detém o lock
    const onStorage = (ev: StorageEvent) => {
      if (ev.key !== CHAVE_SIMULADOR) return
      const on = ev.newValue !== 'off'
      if (on) servidor.simulador.ligar(); else servidor.simulador.desligar()
      setLigado(on)
    }
    window.addEventListener('storage', onStorage)
    return () => { sair(); sairAcao(); window.removeEventListener('storage', onStorage) }
  }, [servidor])

  const alternar = () => { if (ligado) servidor.simulador.desligar(); else servidor.simulador.ligar(); setLigado(!ligado) }
  const rotuloAba = !ligado ? 'pausado' : semLocks ? 'sem Web Locks: toda aba simula' : servidor.simulador.ativoNestaAba() ? 'esta aba simula' : 'outra aba simula'
  const classeAba = !ligado ? s.inativo : semLocks ? s.aviso : servidor.simulador.ativoNestaAba() ? s.ativo : s.inativo

  return (
    <footer className={s.painel} aria-label="Simulador de atividade">
      <span>Relógio virtual: <strong>{usuario ? formatarDataHora(new Date(agora).toISOString(), usuario, { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit' }) : new Date(agora).toISOString()}</strong></span>
      <span className={s.velocidades} role="group" aria-label="Velocidade">
        {VELOCIDADES.map((v) => <button key={v} className={s.botao} aria-pressed={velocidade === v} onClick={() => relogio.definirVelocidade(v)}>{v}x</button>)}
      </span>
      <button className={s.botao} onClick={alternar}>{ligado ? 'Pausar simulador' : 'Retomar simulador'}</button>
      <button className={s.botao} onClick={() => void servidor.simulador.dispararAgora()}>Disparar evento</button>
      <span className={classeAba}>{rotuloAba}</span>
      <span>eventos: <strong>{recebidos}</strong> · duplicatas descartadas: <strong>{duplicados}</strong></span>
      {ultima && <span title="última ação simulada">· {ultima}</span>}
      <span className={s.espaco} />
      {confirmarReset
        ? <><span>Apaga tudo que foi feito e volta ao arquivo. Certeza?</span><button className={s.botao} onClick={() => servidor.resetar()}>Sim, resetar</button><button className={s.botao} onClick={() => setConfirmarReset(false)}>Não</button></>
        : <button className={s.botao} onClick={() => setConfirmarReset(true)}>Resetar dados</button>}
    </footer>
  )
}
