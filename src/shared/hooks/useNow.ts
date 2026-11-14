import { useEffect, useState } from 'react'
import { relogio, CHAVE_RELOGIO, EVENTO_RELOGIO } from '@/shared/utils/relogio'

/** Único "agora" da UI (spec §4.5). Reavalia por intervalo e quando outra aba reancora o relógio. */
export function useNow(intervaloMs?: number): number {
  const [agora, setAgora] = useState(() => relogio.agora())
  const [velocidade, setVelocidade] = useState(() => relogio.velocidade())
  useEffect(() => {
    const tick = () => { setAgora(relogio.agora()); setVelocidade(relogio.velocidade()) }
    const periodo = intervaloMs ?? (velocidade >= 20 ? 5_000 : 30_000)
    const t = setInterval(tick, periodo)
    // relógio reancorado: `storage` só dispara em OUTRAS abas; o evento customizado cobre esta aba. Se a velocidade mudou, o effect reinicia com novo período
    const onStorage = (e: StorageEvent) => { if (e.key === CHAVE_RELOGIO) tick() }
    window.addEventListener('storage', onStorage)
    window.addEventListener(EVENTO_RELOGIO, tick)
    return () => { clearInterval(t); window.removeEventListener('storage', onStorage); window.removeEventListener(EVENTO_RELOGIO, tick) }
  }, [intervaloMs, velocidade])
  return agora
}
